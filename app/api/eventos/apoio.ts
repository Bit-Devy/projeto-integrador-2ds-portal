import { validarArquivosDoCargo } from "../../arquivos/acesso";
import { ErroJsonInvalido } from "../../lib/corpo-json";
import { getD1 } from "../../../db";
import { areaRestrita, type RecursoPainel } from "../../lib/cargos";
import { definirAreaRegistro } from "../../lib/areas-registros";
import { obterUsuarioPainel } from "../../lib/sessao";
import { garantirBanco } from "../../../db/inicializar";
import { possuiReferenciaPublica } from "../../arquivos/publicacao";
import { obterAmbiente } from "../../../worker/ambiente";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { ErroEventos, objetoRecebido, validarDocumento } from "../../eventos/validacao";

// prepara as tabelas e protege consultas que incluem rascunhos e dados internos
export async function prepararLeitura(request: Request) {
  await garantirBanco();
  const parametros = new URL(request.url).searchParams;
  const todos = parametros.get("todos") === "1";
  if (todos) {
    const recurso = recursoDaChamada(request);
    const { acesso, resposta } = await exigirAdministradorApi(recurso, false);
    if (resposta) return { parametros, todos, bloqueio: resposta };
    const area = areaRestrita(acesso.usuario!.cargo);
    parametros.delete("areaResponsavel");
    if (area && ["eventos", "reunioes"].includes(recurso)) {
      parametros.set("areaResponsavel", area);
      const id = new URL(request.url).pathname.split("/")[3];
      if (id && !await registroDaArea(recurso, id, area)) return { parametros, todos, bloqueio: Response.json({ erro: "Registro de outra área ou não encontrado." }, { status: 403 }) };
    }
  }
  return { parametros, todos, bloqueio: null };
}

// aplica a proteção comum a toda mutação do novo domínio
export async function prepararEscrita(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const recurso = recursoDaChamada(request);
  const { acesso, resposta } = await exigirAdministradorApi(recurso);
  if (resposta) return resposta;
  await garantirBanco();
  const area = areaRestrita(acesso.usuario!.cargo);
  if (area && ["eventos", "reunioes"].includes(recurso)) {
    let corpo: Record<string, unknown> = {};
    if (request.method !== "DELETE") { try { corpo = await request.clone().json(); } catch { return Response.json({ erro: "Envie um corpo JSON válido." }, { status: 400 }); } }
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return Response.json({ erro: "Envie um objeto JSON válido." }, { status: 400 });
    const parametros = new URL(request.url).searchParams;
    const entidade = String(corpo.entidade || parametros.get("entidade") || "");
    let id: unknown = corpo.id ?? parametros.get("id");
    if (request.method === "POST" && entidade) id = corpo.eventoId ?? corpo.reuniaoId ?? corpo.id;
    else if (entidade) {
      const tabelas = recurso === "eventos" ? { documentos: "documentos_eventos" } : { documentos: "documentos_reuniao", itens: "itens_reuniao", presencas: "presencas_reuniao", votacoes: "votacoes_reuniao" };
      const tabela = (tabelas as Record<string, string>)[entidade];
      if (!tabela) return Response.json({ erro: "Área de edição inválida." }, { status: 400 });
      const pai = await getD1().prepare(`SELECT ${recurso === "eventos" ? "evento_id" : "reuniao_id"} AS id FROM ${tabela} WHERE id = ?`).bind(Number(id) || 0).first<{ id: number }>();
      id = pai?.id || 0;
    }
    if ((request.method !== "POST" || corpo.acao || entidade) && !await registroDaArea(recurso, String(id || ""), area)) return Response.json({ erro: "Registro de outra área ou não encontrado." }, { status: 403 });
  }
  return null;
}

// lê JSON como objeto e converte corpos quebrados em um erro de cliente claro
export async function lerObjeto(request: Request) {
  try {
    const corpo = objetoRecebido(await request.json());
    const usuario = await obterUsuarioPainel();
    if (usuario) await validarArquivosDoCargo(corpo, usuario);
    return corpo;
  } catch (erro) {
    if (erro instanceof ErroEventos) throw erro;
    if (erro instanceof ErroJsonInvalido) throw new ErroEventos(erro.message, 403);
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

// confere os anexos antes de salvar uma reunião com vários documentos
export async function conferirArquivosAnexados(documentos: unknown) {
  if (!Array.isArray(documentos)) return;
  if (documentos.length > 30) throw new ErroEventos("Adicione no máximo 30 documentos por salvamento.");
  const normalizados = documentos.map(validarDocumento);
  const usuario = await obterUsuarioPainel();
  // confere também os nomes alternativos dos campos antes de usar um arquivo privado
  if (usuario) {
    try { await validarArquivosDoCargo(normalizados, usuario); }
    catch (erro) { if (erro instanceof ErroJsonInvalido) throw new ErroEventos(erro.message, 403); throw erro; }
  }
  for (const documento of normalizados) {
    const alvo = extrairArquivoInterno(documento);
    if (!alvo) continue;
    const bucket = obterAmbiente().BUCKET;
    if (!bucket) throw new ErroEventos("O armazenamento de arquivos não está configurado.", 503);
    if (!await bucket.get(alvo.chave)) throw new ErroEventos("Um dos arquivos anexados não foi encontrado. Escolha o arquivo na biblioteca ou envie novamente.");
  }
}

// atualiza a visibilidade depois de conferir os vínculos salvos
export async function sincronizarVisibilidadeArquivo(dados: Record<string, unknown>) {
  const alvo = extrairArquivoInterno(dados);
  if (!alvo) return;
  const { chave, endereco } = alvo;
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) throw new ErroEventos("O armazenamento de arquivos não está configurado.", 503);
  const objeto = await bucket.get(chave);
  if (!objeto) throw new ErroEventos("O arquivo associado não foi encontrado.", 400);
  // confere todos os usos salvos antes de mudar a visibilidade
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

// escolhe a permissão pelo caminho real da api
function recursoDaChamada(request: Request): RecursoPainel {
  return ({ eventos: "eventos", interclasses: "interclasses", reunioes: "reunioes", representantes: "representantes" } as Record<string, RecursoPainel>)[new URL(request.url).pathname.split("/")[2]] || "geral";
}
async function registroDaArea(recurso: string, id: string, area: string) {
  const tabela = recurso === "eventos" ? "eventos_internos" : "reunioes";
  return Boolean(await getD1().prepare(`SELECT id FROM ${tabela} WHERE (CAST(id AS TEXT) = ? OR slug = ?) AND area_responsavel = ?`).bind(id, id, area).first());
}
// atribui a área ao salvar sem confiar no cargo informado pelo formulário
export async function guardarArea(request: Request, recurso: "eventos" | "reunioes", registro: { id: unknown; areaResponsavel?: string }, corpo: Record<string, unknown>) {
  const usuario = await obterUsuarioPainel();
  if (!usuario) throw new ErroEventos("Sessão encerrada.", 401);
  const dados = corpo.dados && typeof corpo.dados === "object" ? corpo.dados as Record<string, unknown> : corpo;
  registro.areaResponsavel = await definirAreaRegistro(recurso, registro.id, dados.areaResponsavel, usuario);
}
