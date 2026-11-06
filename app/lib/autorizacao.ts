// importa a leitura da sessão do painel
import { obterUsuarioPainel } from "./sessao";

import { podeAcessar, cargoComPermissoes, type RecursoPainel } from "./cargos";

// verifica se existe um administrador conectado
export async function verificarAdministrador() {
  const usuario = await obterUsuarioPainel();
  return { autorizado: Boolean(usuario), usuario };
}

// bloqueia uma chamada da api sem administrador
export async function exigirAdministradorApi(recurso: RecursoPainel = "geral", escrita = true) {
  const acesso = await verificarAdministrador();
  if (acesso.usuario) {
    const cargo = cargoComPermissoes(acesso.usuario.cargo, acesso.usuario.permissoes);
    if (podeAcessar(acesso.usuario.cargo, recurso, escrita, acesso.usuario.permissoes) && !(cargo?.publicos && !escrita)) return { acesso, resposta: null };
    return { acesso, resposta: Response.json({ erro: "Seu cargo não tem permissão para esta ação." }, { status: 403 }) };
  }

  // devolve a resposta de acesso negado
  return {
    acesso,
    resposta: Response.json(
      { erro: "Entre no painel para realizar esta ação." },
      { status: 401 },
    ),
  };
}

// confirma se a chamada veio do mesmo endereço do portal
export function origemValida(request: Request) {
  const origem = request.headers.get("origin");
  if (!origem) return true;
  return origem === new URL(request.url).origin;
}
