// oferece os nomes publicados da equipe para a lista de presenças das reuniões
import { listarMembrosEquipe } from "../../conteudo/equipe";
import { exigirAdministradorApi } from "../../lib/autorizacao";

export async function GET() {
  const { resposta } = await exigirAdministradorApi("reunioes", false);
  if (resposta) return resposta;
  try {
    return Response.json({ itens: await listarMembrosEquipe() }, { headers: { "cache-control": "private, no-store" } });
  } catch (erro) {
    console.error("Erro ao consultar a equipe para presenças:", erro);
    return Response.json({ erro: "Não foi possível consultar os integrantes da equipe." }, { status: 500 });
  }
}
