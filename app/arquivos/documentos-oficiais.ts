// importa o acesso ao banco e sua preparação
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";

export type DocumentoOficial = { chave: "estatuto" | "regimento"; titulo: string; arquivoUrl: string; versao: string; atualizadoEm: string };

// consulta a versão usada por todas as páginas do portal
export async function listarDocumentosOficiais() {
  await garantirBanco();
  const resultado = await getD1().prepare(`SELECT chave, titulo, arquivo_url AS arquivoUrl, versao, atualizado_em AS atualizadoEm FROM documentos_oficiais ORDER BY chave`).all<DocumentoOficial>();
  return resultado.results;
}
