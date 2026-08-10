// importa a resposta com redirecionamento
import { NextResponse } from "next/server";
// importa o nome do cookie da sessão
import { NOME_COOKIE_SESSAO } from "../../lib/sessao";

// encerra a sessão e volta para a tela inicial
export async function GET(request: Request) {
  // cria o redirecionamento para a página inicial
  const resposta = NextResponse.redirect(new URL("/", request.url), 303);
  // apaga o cookie da sessão
  resposta.cookies.set(NOME_COOKIE_SESSAO, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return resposta;
}
