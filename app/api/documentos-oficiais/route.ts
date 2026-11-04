// importa as proteções e os documentos centrais
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { listarDocumentosOficiais } from "../../arquivos/documentos-oficiais";
import { obterAmbiente } from "../../../worker/ambiente";
import { getD1 } from "../../../db";
import { garantirBanco } from "../../../db/inicializar";
import { lerObjetoJson, ErroJsonInvalido } from "../../lib/corpo-json";

// mostra apenas os documentos oficiais já em uso no site
export async function GET() {
  return Response.json({ itens: await listarDocumentosOficiais() }, { headers: { "cache-control": "no-store" } });
}

// troca o pdf e atualiza o catálogo público no mesmo lote
export async function PUT(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi("oficiais");
  if (resposta) return resposta;
  try {
    await garantirBanco();
    const corpo = await lerObjetoJson(request);
    if (!["estatuto", "regimento"].includes(String(corpo.chave))) throw new ErroJsonInvalido("Escolha Estatuto ou Regimento.");
    const endereco = String(corpo.arquivoUrl || "");
    const correspondencia = endereco.match(/^\/api\/arquivos\/([^/?#]+)$/);
    if (!correspondencia) throw new ErroJsonInvalido("Escolha um PDF enviado à biblioteca.");
    const chave = decodeURIComponent(correspondencia[1]);
    const arquivo = await obterAmbiente().BUCKET?.get(chave);
    if (!arquivo || arquivo.httpMetadata?.contentType !== "application/pdf") throw new ErroJsonInvalido("Este espaço aceita apenas arquivos PDF.");
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new ErroJsonInvalido("O arquivo PDF é inválido.");
    const versao = String(corpo.versao || "").trim().slice(0, 60);
    const titulo = corpo.chave === "estatuto" ? "Estatuto do GECEP" : "Regimento Escolar do CEP";
    await getD1().batch([
      getD1().prepare("UPDATE documentos_oficiais SET arquivo_url = ?, versao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE chave = ?").bind(endereco, versao, corpo.chave),
      getD1().prepare(`UPDATE conteudos SET titulo = ?, dados_json = json_set(dados_json, '$.titulo', ?, '$.link', ?, '$.dataDocumento', date('now')), atualizado_em = CURRENT_TIMESTAMP
        WHERE tipo = 'documentos' AND json_extract(dados_json, '$.documentoOficial') = ?`).bind(titulo, titulo, `/api/documentos-oficiais/${corpo.chave}`, corpo.chave),
    ]);
    return Response.json({ itens: await listarDocumentosOficiais() });
  } catch (erro) {
    if (erro instanceof ErroJsonInvalido) return Response.json({ erro: erro.message }, { status: 400 });
    console.error("Falha ao trocar o documento oficial", erro);
    return Response.json({ erro: "Não foi possível atualizar o documento." }, { status: 500 });
  }
}
