// importa a identificação e a consulta dos limites por navegador
import { consultarLimite, guardarNavegador, identificarNavegador } from "../../lib/limites";

// prepara o navegador e informa quando um novo envio será permitido
export async function GET(request: Request) {
  const acao = new URL(request.url).searchParams.get("acao");
  if (acao !== "login" && acao !== "mensagens") {
    return Response.json({ erro: "Escolha uma ação válida." }, { status: 400 });
  }
  const navegador = identificarNavegador(request);
  const limite = await consultarLimite(acao, navegador);
  return guardarNavegador(Response.json({ limite }), request, navegador);
}
