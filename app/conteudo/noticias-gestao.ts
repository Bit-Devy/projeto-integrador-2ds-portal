// importa o banco e o ano usado no portal
import { getD1 } from "../../db";
import { anoDoPortal } from "./periodos";

// lista somente o grupo pedido sem carregar todo o arquivo no painel
export async function consultarNoticiasPainel(parametros: URLSearchParams) {
  const visao = parametros.get("visao") || "destaques";
  const ano = parametros.get("ano") || String(anoDoPortal());
  const pagina = Math.max(1, Math.min(100000, Number(parametros.get("pagina")) || 1));
  const filtros = ["tipo = 'noticias'"];
  const valores: unknown[] = [];
  if (visao === "destaques") {
    filtros.push("publicado = 1 AND json_extract(dados_json, '$.destaque') = 1 AND substr(json_extract(dados_json, '$.data'), 1, 4) = ? AND (COALESCE(json_extract(dados_json, '$.destaqueAte'), '') = '' OR json_extract(dados_json, '$.destaqueAte') >= ?)");
    valores.push(String(anoDoPortal()), new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()));
  }
  else if (visao === "ativas") filtros.push("publicado = 1");
  else if (visao === "arquivadas") filtros.push("publicado = 0 AND json_extract(dados_json, '$.jaPublicada') = 1");
  else if (visao === "rascunhos") filtros.push("publicado = 0 AND COALESCE(json_extract(dados_json, '$.jaPublicada'), 0) = 0");
  else throw new Error("Visão inválida.");
  if (visao !== "destaques") {
    if (!/^(19|20|21)\d{2}$/.test(ano)) throw new Error("Ano inválido.");
    filtros.push("substr(json_extract(dados_json, '$.data'), 1, 4) = ?"); valores.push(ano);
  }
  const busca = (parametros.get("busca") || "").trim().slice(0, 180);
  if (busca) { filtros.push("(titulo LIKE ? ESCAPE '\\' OR json_extract(dados_json, '$.resumo') LIKE ? ESCAPE '\\')"); const termo = `%${busca.replace(/[\\%_]/g, "\\$&")}%`; valores.push(termo, termo); }
  const where = filtros.join(" AND ");
  const [lista, contagem] = await getD1().batch([
    getD1().prepare(`SELECT * FROM conteudos WHERE ${where} ORDER BY json_extract(dados_json, '$.data') DESC, id DESC LIMIT 20 OFFSET ?`).bind(...valores, (pagina - 1) * 20),
    getD1().prepare(`SELECT COUNT(*) AS total FROM conteudos WHERE ${where}`).bind(...valores),
  ]);
  return { linhas: lista.results, pagina, total: Number(contagem.results[0]?.total || 0) };
}

// preserva o histórico mesmo quando uma publicação é arquivada
export function prepararNoticia(dados: Record<string, unknown>, publicado: boolean, anterior?: { publicado: number; dados_json: string }) {
  const antigos = anterior ? JSON.parse(anterior.dados_json) : {};
  dados.jaPublicada = Boolean(publicado || anterior?.publicado || antigos.jaPublicada);
  dados.arquivada = Boolean(dados.jaPublicada && !publicado);
  if (dados.destaque && publicado) {
    const prazo = String(dados.destaqueAte || "");
    const data = new Date(`${prazo}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== prazo) throw new Error("Informe uma data válida para o fim do destaque.");
  }
}
