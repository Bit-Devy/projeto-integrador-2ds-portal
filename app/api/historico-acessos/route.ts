// permite consultar as entradas apenas pela administração geral
import { getD1 } from "../../../db";
import { exigirAdministradorApi } from "../../lib/autorizacao";

export async function GET(request: Request) {
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  const parametros = new URL(request.url).searchParams;
  const id = parametros.get("id");
  const pagina = Math.max(1, Math.min(100000, Math.floor(Number(parametros.get("pagina"))) || 1));
  const banco = getD1();
  if (id !== null) {
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return Response.json({ erro: "Escolha uma entrada válida." }, { status: 400 });
    const entrada = await banco.prepare("SELECT id, nome, cargo, entrada_em AS entradaEm FROM entradas_painel WHERE id = ?").bind(Number(id)).first();
    if (!entrada) return Response.json({ erro: "Entrada não encontrada." }, { status: 404 });
    const [acoes, contagem] = await banco.batch([
      banco.prepare("SELECT id, resumo, criado_em AS criadoEm FROM acoes_painel WHERE entrada_id = ? ORDER BY id LIMIT 50 OFFSET ?").bind(Number(id), (pagina - 1) * 50),
      banco.prepare("SELECT COUNT(*) AS total FROM acoes_painel WHERE entrada_id = ?").bind(Number(id)),
    ]);
    const total = Number(contagem.results[0]?.total || 0);
    return Response.json({ entrada, acoes: acoes.results, pagina, total, totalPaginas: Math.max(1, Math.ceil(total / 50)) }, { headers: { "cache-control": "private, no-store" } });
  }
  const busca = (parametros.get("busca") || "").trim().slice(0, 100);
  const filtro = busca ? "WHERE e.nome LIKE ? ESCAPE '\\' OR e.cargo LIKE ? ESCAPE '\\'" : "";
  const termo = `%${busca.replace(/[\\%_]/g, "\\$&")}%`;
  const valores = busca ? [termo, termo] : [];
  const [itens, contagem] = await banco.batch([
    banco.prepare(`SELECT e.id, e.nome, e.cargo, e.entrada_em AS entradaEm,
      (SELECT COUNT(*) FROM acoes_painel a WHERE a.entrada_id = e.id) AS totalAcoes
      FROM entradas_painel e ${filtro} ORDER BY e.id DESC LIMIT 20 OFFSET ?`).bind(...valores, (pagina - 1) * 20),
    banco.prepare(`SELECT COUNT(*) AS total FROM entradas_painel e ${filtro}`).bind(...valores),
  ]);
  const total = Number(contagem.results[0]?.total || 0);
  return Response.json({ itens: itens.results, pagina, total, totalPaginas: Math.max(1, Math.ceil(total / 20)) }, { headers: { "cache-control": "private, no-store" } });
}
