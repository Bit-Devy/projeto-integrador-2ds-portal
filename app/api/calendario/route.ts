// separa a consulta dos estudantes da edição de cada ano e modalidade
import { getD1 } from "../../../db";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { lerObjetoJson } from "../../lib/corpo-json";
import { obterCalendarios, obterModulos } from "../../servicos/banco";
import { garantirBanco } from "../../../db/inicializar";
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
    await garantirBanco();
    // salva o ano inteiro de uma vez para não publicar apenas parte das datas
    const atual = await getD1().prepare("INSERT INTO calendarios_escolares (ano, modalidade, dados_json, publicado) VALUES (?, ?, ?, ?) ON CONFLICT (ano, modalidade) DO UPDATE SET dados_json = excluded.dados_json, publicado = excluded.publicado, atualizado_em = CURRENT_TIMESTAMP RETURNING ja_publicado")
      .bind(calendario.ano, calendario.modalidade, JSON.stringify(calendario), calendario.publicado ? 1 : 0).first<{ ja_publicado: number }>();
    return Response.json({ item: { ...calendario, jaPublicado: calendario.publicado || Boolean(atual?.ja_publicado) } });
  } catch (erro) { return Response.json({ erro: erro instanceof Error ? erro.message : "Não foi possível salvar o calendário." }, { status: 400 }); }
}


// apaga apenas um calendário que ainda não foi disponibilizado
export async function DELETE(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi("calendario");
  if (resposta) return resposta;
  const parametros = new URL(request.url).searchParams;
  const ano = Number(parametros.get("ano"));
  const modalidade = parametros.get("modalidade");
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2199 || (modalidade !== "anual" && modalidade !== "semestral")) {
    return Response.json({ erro: "Informe o ano e a modalidade do calendário." }, { status: 400 });
  }
  await garantirBanco();
  const removido = await getD1().prepare(`DELETE FROM calendarios_escolares WHERE ano = ? AND modalidade = ?
    AND publicado = 0 AND ja_publicado = 0 RETURNING ano`).bind(ano, modalidade).first();
  if (removido) return Response.json({ removido: true });
  const existe = await getD1().prepare("SELECT 1 FROM calendarios_escolares WHERE ano = ? AND modalidade = ?").bind(ano, modalidade).first();
  return existe
    ? Response.json({ erro: "Este calendário já foi publicado. Você pode retirá-lo do público pelo painel." }, { status: 409 })
    : Response.json({ erro: "Calendário não encontrado." }, { status: 404 });
}
