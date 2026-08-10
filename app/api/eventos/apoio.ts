import { garantirBanco } from "../../../db/inicializar";
import { getD1 } from "../../../db";
import { obterAmbiente } from "../../../worker/ambiente";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { ErroEventos, objetoRecebido } from "../../eventos/validacao";

// prepara as tabelas e protege consultas que incluem rascunhos e dados internos
export async function prepararLeitura(request: Request) {
  await garantirBanco();
  const parametros = new URL(request.url).searchParams;
  const todos = parametros.get("todos") === "1";
  if (todos) {
    const { resposta } = await exigirAdministradorApi();
    if (resposta) return { parametros, todos, bloqueio: resposta };
  }
  return { parametros, todos, bloqueio: null };
}

// aplica a proteção comum a toda mutação do novo domínio
export async function prepararEscrita(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  await garantirBanco();
  return null;
}

// lê JSON como objeto e converte corpos quebrados em um erro de cliente claro
export async function lerObjeto(request: Request) {
  try {
    return objetoRecebido(await request.json());
  } catch (erro) {
    if (erro instanceof ErroEventos) throw erro;
    throw new ErroEventos("Envie um corpo JSON válido.");
  }
}

// evita repetir a forma pública dos erros e nunca devolve stack, SQL ou segredos
export function responderErroEventos(erro: unknown, contexto: string) {
  if (erro instanceof ErroEventos) {
    return Response.json(
      { erro: erro.message, ...(erro.detalhes === undefined ? {} : { detalhes: erro.detalhes }) },
      { status: erro.status },
    );
  }
  console.error(`Falha interna em ${contexto}.`, erro);
  return Response.json({ erro: "Não foi possível concluir a operação." }, { status: 500 });
}

// mantém a proteção do objeto R2 coerente com o controle de publicação do documento
export async function sincronizarVisibilidadeArquivo(dados: Record<string, unknown>) {
  const alvo = extrairArquivoInterno(dados);
  if (!alvo) return;
  const { chave, endereco } = alvo;
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) throw new ErroEventos("O armazenamento de arquivos não está configurado.", 503);
  const objeto = await bucket.get(chave);
  if (!objeto) throw new ErroEventos("O arquivo associado não foi encontrado.", 400);
  // O corpo da requisição pode ser parcial ou uma cópia pode reutilizar a
  // mesma chave. A decisão é feita pelo estado persistido de TODAS as
  // referências, nunca pelo booleano recebido do cliente.
  const visibilidade = await possuiReferenciaPublica(chave, endereco) ? "publica" : "privada";
  if (objeto.customMetadata?.visibilidade === visibilidade) return;
  const conteudo = await objeto.arrayBuffer();
  await bucket.put(chave, conteudo, {
    httpMetadata: objeto.httpMetadata,
    customMetadata: { ...objeto.customMetadata, visibilidade },
  });
}

// aplica a mesma visibilidade do registro à capa, galeria e documentos que
// pertencem ao armazenamento interno; links externos são ignorados.
export async function sincronizarArquivosDoEvento(...registros: Record<string, unknown>[]) {
  const enderecos = new Set<string>();
  for (const dados of registros) {
    adicionarEndereco(enderecos, dados.imagemCapaUrl ?? dados.imagem);
    for (const campo of [dados.documentos, dados.imagens]) {
      if (!Array.isArray(campo)) continue;
      for (const item of campo) {
        if (typeof item === "string") adicionarEndereco(enderecos, item);
        else if (item && typeof item === "object") {
          const registro = item as Record<string, unknown>;
          if (registro.ativo === false) continue;
          adicionarEndereco(enderecos, registro.arquivoUrl ?? registro.url);
          if (typeof registro.arquivoChave === "string" && registro.arquivoChave.trim()) {
            adicionarEndereco(enderecos, `/api/arquivos/${encodeURIComponent(registro.arquivoChave.trim())}`);
          }
        }
      }
    }
  }
  for (const arquivoUrl of enderecos) {
    await sincronizarVisibilidadeArquivo({ arquivoUrl });
  }
}

async function possuiReferenciaPublica(chave: string, enderecoRecebido: string) {
  const endereco = `/api/arquivos/${encodeURIComponent(chave)}`;
  const resultado = await getD1().prepare(`WITH alvo(chave, endereco, recebido) AS (VALUES (?, ?, ?))
    SELECT 1 AS publica FROM (
      SELECT e.id FROM eventos_internos e, alvo a
        WHERE e.publicado = 1 AND (e.ativo = 1 OR e.arquivado_em IS NOT NULL)
          AND e.imagem_capa_url IN (a.endereco, a.recebido)
      UNION ALL
      SELECT d.id FROM documentos_eventos d
        INNER JOIN eventos_internos e ON e.id = d.evento_id, alvo a
        WHERE e.publicado = 1 AND (e.ativo = 1 OR e.arquivado_em IS NOT NULL)
          AND d.publicado = 1 AND d.ativo = 1
          AND (d.arquivo_chave = a.chave OR d.arquivo_url IN (a.endereco, a.recebido))
      UNION ALL
      SELECT c.id FROM campeonatos c, alvo a
        WHERE c.publicado = 1 AND (c.ativo = 1 OR c.arquivado_em IS NOT NULL)
          AND c.imagem_capa_url IN (a.endereco, a.recebido)
      UNION ALL
      SELECT d.id FROM documentos_campeonato d
        INNER JOIN campeonatos c ON c.id = d.campeonato_id, alvo a
        WHERE c.publicado = 1 AND (c.ativo = 1 OR c.arquivado_em IS NOT NULL)
          AND d.publicado = 1 AND d.ativo = 1
          AND (d.arquivo_chave = a.chave OR d.arquivo_url IN (a.endereco, a.recebido))
      UNION ALL
      SELECT d.id FROM documentos_reuniao d
        INNER JOIN reunioes r ON r.id = d.reuniao_id, alvo a
        WHERE r.publicado = 1 AND (r.ativo = 1 OR r.arquivado_em IS NOT NULL)
          AND d.publicado = 1 AND d.ativo = 1
          AND (d.arquivo_chave = a.chave OR d.arquivo_url IN (a.endereco, a.recebido))
    ) LIMIT 1`).bind(chave, endereco, enderecoRecebido).first();
  return Boolean(resultado);
}

function extrairArquivoInterno(dados: Record<string, unknown>) {
  const chaveRecebida = typeof dados.arquivoChave === "string" ? dados.arquivoChave.trim() : "";
  const endereco = String(dados.arquivoUrl ?? dados.url ?? "").trim();
  if (chaveRecebida && !chaveRecebida.includes("/") && chaveRecebida.length <= 500) {
    return { chave: chaveRecebida, endereco: endereco || `/api/arquivos/${encodeURIComponent(chaveRecebida)}` };
  }
  const correspondencia = endereco.match(/^\/api\/arquivos\/([^/?#]+)(?:[?#].*)?$/);
  if (!correspondencia) return null;
  try {
    const chave = decodeURIComponent(correspondencia[1]);
    if (!chave || chave.includes("/") || chave.length > 500) return null;
    return { chave, endereco };
  } catch {
    return null;
  }
}

function adicionarEndereco(destino: Set<string>, valor: unknown) {
  if (typeof valor === "string" && valor.trim()) destino.add(valor.trim());
}

export function identificadorDaRota(valor: string) {
  const recebido = decodeURIComponent(valor).trim();
  if (!recebido || recebido.length > 180) throw new ErroEventos("Informe um identificador válido.");
  return recebido;
}
