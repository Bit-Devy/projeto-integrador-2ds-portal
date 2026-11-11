// separa a consulta dos estudantes da edição de cada ano e modalidade
import { getD1 } from "../../../db";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { lerObjetoJson } from "../../lib/corpo-json";
import { obterCalendarios, obterModulos } from "../../servicos/banco";
import { validarCalendario } from "../../servicos/calendario";

export async function GET(request: Request) {
  const todos = new URL(request.url).searchParams.get("todos") === "1";
  if (todos) { const { resposta } = await exigirAdministradorApi("calendario", false); if (resposta) return resposta; }
  else if (!(await obterModulos()).calendario) return Response.json({ erro: "O calendário está desativado." }, { status: 404 });
  return Response.json({ itens: await obterCalendarios(todos) }, { headers: { "cache-control": "no-store" } });
}
export async function PUT(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi("calendario");
  if (resposta) return resposta;
  try {
    const corpo = await lerObjetoJson(request);
    const calendario = validarCalendario(corpo.calendario);
    await obterCalendarios(true);
    // salva o ano inteiro de uma vez para não publicar apenas parte das datas
    await getD1().prepare("INSERT INTO calendarios_escolares (ano, modalidade, dados_json, publicado) VALUES (?, ?, ?, ?) ON CONFLICT (ano, modalidade) DO UPDATE SET dados_json = excluded.dados_json, publicado = excluded.publicado, atualizado_em = CURRENT_TIMESTAMP")
      .bind(calendario.ano, calendario.modalidade, JSON.stringify(calendario), calendario.publicado ? 1 : 0).run();
    return Response.json({ item: calendario });
  } catch (erro) { return Response.json({ erro: erro instanceof Error ? erro.message : "Não foi possível salvar o calendário." }, { status: 400 }); }
}
