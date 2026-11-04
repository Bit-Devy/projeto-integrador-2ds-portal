// mantém o registro de senhas disponível apenas no acesso geral
import { getD1 } from "../../../db";
import { cargosPainel, obterCargo } from "../../lib/cargos";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { garantirAcessos, prepararSenha, gerarSenhaPainel, confirmarSenhaDoAcesso, loginGeralAmbiente, type AcessoSalvo } from "../../lib/senhas-painel";
import { ajudaLogin, ajudaSenha, loginValido, normalizarLogin, senhaPermitida } from "../../lib/regras-acesso";
import { lerObjetoJson, ErroJsonInvalido } from "../../lib/corpo-json";
import { consumirTentativa, guardarNavegador, identificarNavegador, limparTentativasLogin } from "../../lib/limites";
import { criarTokenSessao, NOME_COOKIE_SESSAO } from "../../lib/sessao";
import { NextResponse } from "next/server";

export async function GET() {
  const { acesso, resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  await garantirAcessos();
  const banco = getD1();
  const itens = await banco.prepare("SELECT id, cargo, vaga, nome, login, login_ambiente AS loginAmbiente, criado_em AS criadoEm, atualizado_em AS atualizadoEm FROM acessos_painel ORDER BY cargo, vaga").all();
  const historico = await banco.prepare("SELECT autor_nome AS autor, acao, cargo, acesso_id AS acessoId, criado_em AS criadoEm FROM auditoria_acessos ORDER BY id DESC LIMIT 30").all();
  return Response.json({ itens: itens.results.filter((item) => obterCargo(String(item.cargo))), cargos: cargosPainel, historico: historico.results, acessoAtual: acesso.usuario!.acessoId }, { headers: { "cache-control": "private, no-store" } });
}

// toda alteração exige a senha do acesso geral conectado e uma revisão explícita
async function alterar(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { acesso, resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  try {
    const corpo = await lerObjetoJson(request);
    if (corpo.confirmado !== true) throw new ErroJsonInvalido("Revise e confirme a alteração antes de continuar.");
    const navegador = identificarNavegador(request);
    const tentativa = await consumirTentativa("login", navegador);
    if (!tentativa.permitido) return guardarNavegador(Response.json({ erro: "Aguarde antes de tentar confirmar a senha novamente." }, { status: 429 }), request, navegador);
    const usuario = acesso.usuario!;
    if (!await confirmarSenhaDoAcesso(String(corpo.senhaAtual || ""), usuario.acessoId, usuario.versao)) return guardarNavegador(Response.json({ erro: "Senha do acesso geral incorreta. Nada foi alterado." }, { status: 403 }), request, navegador);
    await limparTentativasLogin(navegador);
    const banco = getD1();
    let id = Number(corpo.id);
    let cargo = String(corpo.cargo || "");
    let senhaNova: string | undefined;
    let versao = usuario.versao;
    let anterior: AcessoSalvo | null = null;
    if (request.method !== "POST") {
      if (!Number.isSafeInteger(id) || id <= 0) throw new ErroJsonInvalido("Selecione um acesso válido.");
      anterior = await banco.prepare("SELECT * FROM acessos_painel WHERE id = ?").bind(id).first<AcessoSalvo>();
      if (!anterior) return Response.json({ erro: "Este acesso não existe mais." }, { status: 404 });
      cargo = anterior.cargo;
      versao = anterior.versao;
    }
    if (!obterCargo(cargo)) throw new ErroJsonInvalido("Escolha um cargo válido.");
    const nome = String(corpo.nome || "").trim();
    const login = normalizarLogin(String(corpo.login ?? anterior?.login ?? ""));
    if (request.method !== "DELETE" && (!nome || nome.length > 100)) throw new ErroJsonInvalido("Informe uma identificação de até 100 caracteres.");
    if (request.method !== "DELETE") {
      // o login principal só muda pela configuração do servidor
      if (!loginValido(login)) throw new ErroJsonInvalido(ajudaLogin);
      if (anterior?.login_ambiente && login !== anterior.login) throw new ErroJsonInvalido("O login deste acesso é definido por ADMIN_LOGIN na configuração do servidor.");
      if (!anterior?.login_ambiente && login === loginGeralAmbiente()) return Response.json({ erro: "Este login é reservado ao acesso geral principal." }, { status: 409 });
      if (await banco.prepare("SELECT id FROM acessos_painel WHERE login = ? AND id <> ?").bind(login, id || 0).first()) return Response.json({ erro: "Este login já está em uso. Escolha outro login." }, { status: 409 });
      senhaNova = corpo.novaSenha ? String(corpo.novaSenha) : gerarSenhaPainel();
      if (senhaNova.length < 12 || !senhaPermitida(senhaNova)) throw new ErroJsonInvalido(ajudaSenha);
      const protegido = await prepararSenha(senhaNova);
      if (await banco.prepare("SELECT id FROM acessos_painel WHERE busca = ?").bind(protegido.busca).first()) return Response.json({ erro: "Esta senha já está em uso. Escolha outra senha." }, { status: 409 });
      if (request.method === "POST") {
        const maximo = cargo === "geral" ? 3 : 2;
        // a restrição do banco impede ultrapassar as vagas mesmo em duas abas
        const criado = await banco.prepare(`INSERT INTO acessos_painel (cargo, vaga, nome, login, resumo, sal, busca)
          SELECT ?, vaga, ?, ?, ?, ?, ? FROM (SELECT 1 AS vaga UNION ALL SELECT 2 UNION ALL SELECT 3) AS vaga_disponivel
          WHERE vaga <= ? AND NOT EXISTS (SELECT 1 FROM acessos_painel WHERE cargo = ? AND acessos_painel.vaga = vaga_disponivel.vaga)
          ORDER BY vaga LIMIT 1 RETURNING id`)
          .bind(cargo, nome, login, protegido.resumo, protegido.sal, protegido.busca, maximo, cargo).first<{ id: number }>();
        if (!criado) return Response.json({ erro: `Este cargo já possui o limite de ${maximo} senhas.` }, { status: 409 });
        id = criado.id;
      } else {
        const alterado = await banco.prepare("UPDATE acessos_painel SET nome = ?, login = ?, resumo = ?, sal = ?, busca = ?, versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP WHERE id = ? AND versao = ? RETURNING id")
          .bind(nome, login, protegido.resumo, protegido.sal, protegido.busca, id, versao).first();
        if (!alterado) return Response.json({ erro: "Este acesso mudou. Recarregue e revise novamente." }, { status: 409 });
        versao += 1;
      }
    } else {
      // o último acesso geral permanece disponível mesmo em remoções simultâneas
      const removido = await banco.prepare(`DELETE FROM acessos_painel WHERE id = ? AND versao = ?
        AND (cargo <> 'geral' OR (SELECT COUNT(*) FROM acessos_painel WHERE cargo = 'geral') > 1) RETURNING id`).bind(id, versao).first();
      if (!removido) return Response.json({ erro: "Não é possível remover o último acesso geral ou um acesso que acabou de mudar." }, { status: 409 });
    }
    const acao = request.method === "POST" ? "criou" : request.method === "PUT" ? "trocou a senha" : "revogou";
    await banco.prepare("INSERT INTO auditoria_acessos (autor_id, autor_nome, acao, cargo, acesso_id) VALUES (?, ?, ?, ?, ?)").bind(usuario.acessoId, usuario.nome, acao, cargo, id).run();
    const respostaFinal = NextResponse.json({ id, ...(senhaNova ? { login, senha: senhaNova } : {}), sair: request.method === "DELETE" && id === usuario.acessoId }, { status: request.method === "POST" ? 201 : 200, headers: { "cache-control": "private, no-store" } });
    if (id === usuario.acessoId && request.method === "PUT") respostaFinal.cookies.set(NOME_COOKIE_SESSAO, await criarTokenSessao({ id, versao }, usuario.entradaId), { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 28800 });
    if (id === usuario.acessoId && request.method === "DELETE") respostaFinal.cookies.set(NOME_COOKIE_SESSAO, "", { path: "/", maxAge: 0 });
    return guardarNavegador(respostaFinal, request, navegador);
  } catch (erro) {
    if (erro instanceof ErroJsonInvalido) return Response.json({ erro: erro.message }, { status: 400 });
    if (erro instanceof Error && /UNIQUE constraint/i.test(erro.message)) return Response.json({ erro: "A vaga, o login ou a senha acabou de ser utilizada. Recarregue e tente novamente." }, { status: 409 });
    console.error("Falha no registro de acessos", erro);
    return Response.json({ erro: "Não foi possível alterar o acesso." }, { status: 500 });
  }
}
export const POST = alterar;
export const PUT = alterar;
export const DELETE = alterar;
