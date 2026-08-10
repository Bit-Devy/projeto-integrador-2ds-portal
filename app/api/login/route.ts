// importa a resposta com redirecionamento
import { NextResponse } from "next/server";
// importa os recursos da sessão administrativa
import { criarTokenSessao, caminhoSeguro, NOME_COOKIE_SESSAO, validarSenhaAdministrativa } from "../../lib/sessao";
// importa a verificação da origem da chamada
import { origemValida } from "../../lib/autorizacao";

// valida o login e cria a sessão
export async function POST(request: Request) {
  // bloqueia chamadas de outra origem
  if (!origemValida(request)) return new Response("Origem inválida.", { status: 403 });

  // lê a senha e o destino recebidos
  const formulario = await request.formData();
  const senha = String(formulario.get("senha") ?? "");
  const retorno = caminhoSeguro(String(formulario.get("returnTo") ?? "/painel"));

  // devolve ao login quando a senha está errada
  if (!(await validarSenhaAdministrativa(senha))) {
    const destino = new URL("/login", request.url);
    destino.searchParams.set("erro", "1");
    destino.searchParams.set("returnTo", retorno);
    return NextResponse.redirect(destino, 303);
  }

  // redireciona e grava o cookie da sessão
  const resposta = NextResponse.redirect(new URL(retorno, request.url), 303);
  resposta.cookies.set(NOME_COOKIE_SESSAO, await criarTokenSessao(), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return resposta;
}
