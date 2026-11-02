// importa o banco e a preparação das tabelas
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";
// importa os tipos usados pelo servidor e pelos formulários
import type { AcaoLimitada, EstadoLimite } from "./limites-tipos";

// guarda os prazos em segundos e o nome do cookie do navegador
const HORA = 60 * 60;
const DIA = 24 * HORA;
const COOKIE_NAVEGADOR = "gecep_navegador";

// descreve um contador salvo no banco
type Contador = { tentativas: number; expira_em: number; bloqueado_ate: number };

// reconhece o navegador sem usar nome contato ou endereço de rede
export function identificarNavegador(request: Request) {
  const recebido = request.headers.get("cookie")?.split(";")
    .map((parte) => parte.trim()).find((parte) => parte.startsWith(`${COOKIE_NAVEGADOR}=`))
    ?.slice(COOKIE_NAVEGADOR.length + 1);
  return recebido && /^[a-f0-9-]{36}$/.test(recebido) ? recebido : crypto.randomUUID();
}

// mantém o mesmo identificador ao recarregar ou abrir outra aba
export function guardarNavegador(resposta: Response, request: Request, navegador: string) {
  const seguro = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  resposta.headers.append("set-cookie", `${COOKIE_NAVEGADOR}=${navegador}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365 * DIA}${seguro}`);
  resposta.headers.set("cache-control", "no-store");
  return resposta;
}

// consulta o prazo sem gastar uma tentativa
export async function consultarLimite(acao: AcaoLimitada, navegador: string, agora = Math.floor(Date.now() / 1000)) {
  await garantirBanco();
  const contador = await getD1().prepare("SELECT tentativas, expira_em, bloqueado_ate FROM limites_navegador WHERE navegador = ? AND acao = ?")
    .bind(navegador, acao).first<Contador>();
  return estadoDoLimite(acao, contador, agora);
}

// reserva uma tentativa de forma que pedidos simultâneos não ultrapassem o limite
export async function consumirTentativa(acao: AcaoLimitada, navegador: string, agora = Math.floor(Date.now() / 1000)) {
  await garantirBanco();
  const periodo = acao === "mensagens" ? HORA : DIA;
  const contador = await getD1().prepare(`INSERT INTO limites_navegador
      (navegador, acao, tentativas, expira_em, bloqueado_ate) VALUES (?, ?, 1, ?, 0)
    ON CONFLICT (navegador, acao) DO UPDATE SET
      tentativas = CASE WHEN expira_em <= ? THEN 1 ELSE tentativas + 1 END,
      bloqueado_ate = CASE
        WHEN expira_em <= ? THEN 0
        WHEN acao = 'mensagens' AND tentativas + 1 >= 3 THEN expira_em
        WHEN acao = 'login' AND tentativas + 1 >= 10 THEN ?
        WHEN acao = 'login' AND tentativas + 1 = 5 THEN ?
        ELSE 0 END,
      expira_em = CASE
        WHEN expira_em <= ? THEN ?
        WHEN acao = 'login' AND tentativas + 1 >= 10 THEN ?
        ELSE expira_em END
    WHERE bloqueado_ate <= ?
    RETURNING tentativas, expira_em, bloqueado_ate`)
    .bind(navegador, acao, agora + periodo, agora, agora, agora + DIA, agora + 15 * 60,
      agora, agora + periodo, agora + DIA, agora).first<Contador>();
  const limite = contador ? estadoDoLimite(acao, contador, agora) : await consultarLimite(acao, navegador, agora);
  return { permitido: Boolean(contador), limite };
}

// libera a reserva quando uma mensagem não pôde ser salva
export async function devolverTentativaMensagem(navegador: string) {
  await getD1().prepare(`UPDATE limites_navegador SET tentativas = MAX(0, tentativas - 1), bloqueado_ate = 0
    WHERE navegador = ? AND acao = 'mensagens'`).bind(navegador).run();
}

// reinicia as tentativas depois de uma entrada correta
export async function limparTentativasLogin(navegador: string) {
  await getD1().prepare("DELETE FROM limites_navegador WHERE navegador = ? AND acao = 'login'").bind(navegador).run();
}

// traduz o contador em uma mensagem simples para quem está usando o portal
function estadoDoLimite(acao: AcaoLimitada, contador: Contador | null, agora: number): EstadoLimite {
  const tentativas = contador && contador.expira_em > agora ? contador.tentativas : 0;
  const tentarEm = contador && contador.expira_em > agora ? Math.max(0, contador.bloqueado_ate - agora) : 0;
  const bloqueado = tentarEm > 0;
  const restantes = acao === "mensagens" ? Math.max(0, 3 - tentativas) : 5 - tentativas % 5;
  const aviso = !bloqueado ? "" : acao === "mensagens"
    ? "Você já enviou três participações neste período. Obrigado por contribuir! Aguarde até o horário indicado para enviar outra mensagem."
    : tentativas >= 10
      ? "O limite de tentativas foi atingido novamente. Por segurança, o acesso neste navegador ficará bloqueado por 24 horas."
      : "Você fez cinco tentativas sem conseguir entrar. Por segurança, aguarde 15 minutos antes de tentar novamente.";
  return { bloqueado, tentarEm, restantes, aviso };
}
