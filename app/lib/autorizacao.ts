// importa a leitura da sessão do painel
import { obterUsuarioPainel } from "./sessao";

// verifica se existe um administrador conectado
export async function verificarAdministrador() {
  const usuario = await obterUsuarioPainel();
  return { autorizado: Boolean(usuario), usuario };
}

// bloqueia uma chamada da api sem administrador
export async function exigirAdministradorApi() {
  const acesso = await verificarAdministrador();
  if (acesso.autorizado) return { acesso, resposta: null };

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
