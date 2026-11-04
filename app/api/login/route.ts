// importa a resposta com redirecionamento
import { NextResponse } from "next/server";
// importa os recursos da sessão administrativa
import { criarTokenSessao, caminhoSeguro, NOME_COOKIE_SESSAO } from "../../lib/sessao";
import { registrarEntradaPainel } from "../../lib/historico-painel";
import { autenticarSenha } from "../../lib/senhas-painel";
// importa a verificação da origem da chamada
import { origemValida } from "../../lib/autorizacao";
// importa os limites de tentativas por navegador
import { consumirTentativa, guardarNavegador, identificarNavegador, limparTentativasLogin } from "../../lib/limites";

// valida o login e cria a sessão
export async function POST(request: Request) {
  // bloqueia chamadas de outra origem
  if (!origemValida(request)) return new Response("Origem inválida.", { status: 403 });

  // lê o login a senha e o destino recebidos
  const formulario = await request.formData();
  const login = String(formulario.get("login") ?? "");
  const senha = String(formulario.get("senha") ?? "");
  const retorno = caminhoSeguro(String(formulario.get("returnTo") ?? "/painel"));

  // reserva a tentativa antes de conferir a senha
  const navegador = identificarNavegador(request);
  const tentativa = await consumirTentativa("login", navegador);
  if (!tentativa.permitido) return voltarAoLogin("limite");

  // devolve ao login quando a senha está errada
  const geral = formulario.get("geral") === "1";
  const acesso = await autenticarSenha(login, senha, geral);
  if (!acesso) {
    return voltarAoLogin(tentativa.limite.bloqueado ? "limite" : "1");
  }

  // redireciona e grava o cookie da sessão
  await limparTentativasLogin(navegador);
  const entradaId = await registrarEntradaPainel(acesso);
  const resposta = NextResponse.redirect(new URL(retorno, request.url), 303);
  resposta.cookies.set(NOME_COOKIE_SESSAO, await criarTokenSessao(acesso, entradaId), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return guardarNavegador(resposta, request, navegador);

  // volta para o formulário mantendo o destino e o navegador
  function voltarAoLogin(erro: string) {
    const destino = new URL("/login", request.url);
    destino.searchParams.set("erro", erro);
    if (formulario.get("geral") === "1") destino.searchParams.set("geral", "1");
    destino.searchParams.set("returnTo", retorno);
    const resposta = NextResponse.redirect(destino, 303);
    if (tentativa.limite.bloqueado) resposta.headers.set("retry-after", String(tentativa.limite.tentarEm));
    return guardarNavegador(resposta, request, navegador);
  }
}
