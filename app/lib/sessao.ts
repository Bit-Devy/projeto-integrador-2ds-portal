// importa o acesso aos cookies
import { cookies } from "next/headers";
// importa o redirecionamento do next
import { redirect } from "next/navigation";
// importa as variáveis do ambiente
import { segredoSessao, garantirAcessos, confirmarSenhaDoAcesso, type AcessoSalvo } from "./senhas-painel";
import { obterCargo } from "./cargos";
import { getD1 } from "../../db";

// define o nome e a duração do cookie de sessão
export const NOME_COOKIE_SESSAO = "gecep_sessao";
const DURACAO_SESSAO = 60 * 60 * 8;
// transforma textos em bytes
const codificador = new TextEncoder();

// define o usuário guardado pela sessão
export type UsuarioPainel = {
  nome: string;
  cargo: string;
  acessoId: number;
  versao: number;
};

// verifica se existe uma sessão válida
export async function obterUsuarioPainel(): Promise<UsuarioPainel | null> {
  // lê o token guardado no cookie
  const armazenamento = await cookies();
  const token = armazenamento.get(NOME_COOKIE_SESSAO)?.value;
  if (!token) return null;
  try {
    const conteudo = await tokenValido(token);
    if (!conteudo) return null;
    const [tipo, validade, id, versao] = conteudo.split(":");
    if (tipo !== "cargo" || !validade || !/^\d+$/.test(id || "") || !/^\d+$/.test(versao || "")) return null;
    await garantirAcessos();
    const acesso = await getD1().prepare("SELECT * FROM acessos_painel WHERE id = ? AND versao = ?").bind(Number(id), Number(versao)).first<AcessoSalvo>();
    if (!acesso || !obterCargo(acesso.cargo)) return null;
    return { nome: acesso.nome, cargo: acesso.cargo, acessoId: acesso.id, versao: acesso.versao };
  } catch {
    // cookies incompletos ou adulterados são tratados como sessão ausente
    return null;
  }
}

// exige uma sessão válida antes de abrir o painel
export async function exigirUsuarioPainel(retorno = "/painel") {
  const usuario = await obterUsuarioPainel();
  if (usuario) return usuario;
  redirect(`/login?returnTo=${encodeURIComponent(caminhoSeguro(retorno))}`);
}

// cria o código guardado no navegador depois do login
export async function criarTokenSessao(acesso: Pick<AcessoSalvo, "id" | "versao">) {
  // exige um segredo configurado no ambiente
  const segredo = obterSegredo();
  if (!segredo) throw new Error("Defina SESSION_SECRET antes de usar o painel.");

  // cria o conteúdo e sua assinatura
  const validade = Math.floor(Date.now() / 1000) + DURACAO_SESSAO;
  const conteudo = `cargo:${validade}:${acesso.id}:${acesso.versao}`;
  const assinatura = await assinar(conteudo, segredo);
  return `${conteudo}.${assinatura}`;
}

// compara a senha recebida sem revelar diferenças de tempo
export async function validarSenhaAdministrativa(senhaRecebida: string) {
  const usuario = await obterUsuarioPainel();
  return Boolean(usuario && await confirmarSenhaDoAcesso(senhaRecebida, usuario.acessoId, usuario.versao));
}

// impede redirecionamentos para endereços externos
export function caminhoSeguro(valor: string) {
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/painel";
  try {
    const url = new URL(valor, "https://portal.local");
    if (url.origin !== "https://portal.local") return "/painel";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/painel";
  }
}

// verifica a validade e a assinatura do token
async function tokenValido(token: string) {
  const ultimoPonto = token.lastIndexOf(".");
  if (ultimoPonto < 0) return false;

  // separa o conteúdo da assinatura
  const conteudo = token.slice(0, ultimoPonto);
  const assinaturaRecebida = token.slice(ultimoPonto + 1);
  const validade = Number(conteudo.split(":")[1]);
  const segredo = obterSegredo();
  if (!segredo || !Number.isFinite(validade) || validade < Date.now() / 1000) return false;

  // confirma a assinatura com a chave secreta
  const chave = await criarChave(segredo, ["verify"]);
  const confere = await crypto.subtle.verify(
    "HMAC",
    chave,
    base64UrlParaBytes(assinaturaRecebida),
    codificador.encode(conteudo),
  );
  return confere ? conteudo : false;
}

// assina o conteúdo da sessão
async function assinar(conteudo: string, segredo: string) {
  const chave = await criarChave(segredo, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(conteudo));
  return bytesParaBase64Url(new Uint8Array(assinatura));
}

// cria uma chave segura para assinar ou verificar
function criarChave(segredo: string, usos: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usos,
  );
}

// lê o segredo da sessão
function obterSegredo() { return segredoSessao(); }

// transforma bytes em texto seguro para endereço
function bytesParaBase64Url(bytes: Uint8Array) {
  let texto = "";
  bytes.forEach((byte) => { texto += String.fromCharCode(byte); });
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// transforma o texto da assinatura em bytes
function base64UrlParaBytes(texto: string) {
  // restaura os caracteres e o preenchimento do base64
  const base64 = texto.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(texto.length / 4) * 4, "=");
  const binario = atob(base64);
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
}
