// procura somente o grupo solicitado em vez de enviar centenas de opções ao seletor
import { getD1 } from "../../db";
import { anoDoPortal } from "./periodos";

export const gruposDestinos = [
  { chave: "noticias", nome: "Notícias", url: "/noticias" },
  { chave: "projetos", nome: "Projetos", url: "/projetos" },
  { chave: "interclasses", nome: "Interclasses", url: "/eventos/interclasses" },
  { chave: "eventos", nome: "Eventos internos", url: "/eventos/internos" },
  { chave: "reunioes", nome: "Reuniões e atas", url: "/eventos/reunioes" },
];

export async function consultarDestinos(parametros: URLSearchParams) {
  const grupo = parametros.get("grupo") || "";
  const campeonatos = "c.publicado = 1 AND c.ativo = 1 AND c.arquivado_em IS NULL";
  const configuracoes: Record<string, { origem: string; campos: string; ano: string; publico: string; busca: string }> = {
    noticias: { origem: "conteudos c", campos: "c.id, '/noticias/' || c.id AS url, c.titulo AS nome", ano: "substr(json_extract(c.dados_json, '$.data'), 1, 4)", publico: "c.tipo = 'noticias' AND c.publicado = 1", busca: "c.titulo" },
    projetos: { origem: "conteudos c", campos: "c.id, '/projetos#projeto-' || c.id AS url, c.titulo AS nome", ano: "CAST(COALESCE(json_extract(c.dados_json, '$.ano'), substr(c.criado_em, 1, 4)) AS TEXT)", publico: "c.tipo = 'projetos' AND c.publicado = 1", busca: "c.titulo" },
    interclasses: { origem: "campeonatos c", campos: "c.id, '/eventos/interclasses/' || c.slug AS url, c.nome AS nome", ano: "CAST(c.ano AS TEXT)", publico: campeonatos, busca: "c.nome" },
    eventos: { origem: "eventos_internos c", campos: "c.id, '/eventos/internos/' || c.slug AS url, c.titulo AS nome", ano: "substr(c.data_inicial, 1, 4)", publico: "c.publicado = 1 AND c.ativo = 1 AND c.arquivado_em IS NULL", busca: "c.titulo" },
    reunioes: { origem: "reunioes c", campos: "c.id, '/eventos/reunioes/' || c.slug AS url, c.titulo AS nome", ano: "substr(c.data, 1, 4)", publico: "c.publicado = 1 AND c.ativo = 1 AND c.arquivado_em IS NULL", busca: "c.titulo" },
    jogos: { origem: "partidas p JOIN campeonatos c ON c.id = p.campeonato_id JOIN fases_campeonato f ON f.id = p.fase_id", campos: "p.id, '/eventos/interclasses/' || c.slug || '/jogos/' || p.id AS url, f.nome || ' · jogo ' || p.id || ' · ' || COALESCE(NULLIF(p.participante_a_nome, ''), 'A definir') || ' × ' || COALESCE(NULLIF(p.participante_b_nome, ''), 'A definir') AS nome", ano: "CAST(c.ano AS TEXT)", publico: `${campeonatos} AND c.chave_publicada = 1 AND p.publicado = 1 AND p.ativo = 1 AND f.publicado = 1 AND f.ativo = 1`, busca: "f.nome || ' ' || p.participante_a_nome || ' ' || p.participante_b_nome" },
  };
  const config = configuracoes[grupo];
  if (!config) throw new Error("Escolha um grupo de publicações válido.");
  const ano = parametros.get("ano") || String(anoDoPortal());
  if (ano !== "todos" && !/^(19|20|21)\d{2}$/.test(ano)) throw new Error("Informe um ano válido.");
  const filtros = [config.publico]; const valores: (string | number)[] = [];
  if (ano !== "todos") { filtros.push(`${config.ano} = ?`); valores.push(ano); }
  const busca = (parametros.get("busca") || "").trim().slice(0, 120);
  if (busca) { filtros.push(`${config.busca} LIKE ? ESCAPE '\\'`); valores.push(`%${busca.replace(/[\\%_]/g, "\\$&")}%`); }
  if (grupo === "jogos") { const id = Number(parametros.get("campeonato")); if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Escolha um campeonato válido."); filtros.push("c.id = ?"); valores.push(id); }
  const pagina = Math.max(1, Math.min(100000, Number(parametros.get("pagina")) || 1));
  const d1 = getD1(); const where = filtros.join(" AND ");
  const [lista, quantidade] = await d1.batch([
    d1.prepare(`SELECT ${config.campos} FROM ${config.origem} WHERE ${where} ORDER BY ${grupo === "jogos" ? "p.id" : "c.id"} DESC LIMIT 20 OFFSET ?`).bind(...valores, (pagina - 1) * 20),
    d1.prepare(`SELECT COUNT(*) total FROM ${config.origem} WHERE ${where}`).bind(...valores),
  ]);
  return { itens: lista.results, total: Number(quantidade.results[0]?.total || 0), pagina };
}
