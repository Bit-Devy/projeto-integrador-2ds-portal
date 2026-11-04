// guarda apenas resumos protegidos das senhas de cada cargo
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";
import { obterAmbiente } from "../../worker/ambiente";
import { obterCargo } from "./cargos";
import { loginValido, normalizarLogin, senhaPermitida } from "./regras-acesso";

export type AcessoSalvo = { id: number; cargo: string; vaga: number; nome: string; login: string; login_ambiente: number; resumo: string; sal: string; busca: string; versao: number };
const texto = new TextEncoder();
export function segredoSessao() { return obterAmbiente().SESSION_SECRET ?? process.env.SESSION_SECRET ?? ""; }
function hex(bytes: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function comparar(a: string, b: string) { let diferenca = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) diferenca |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diferenca === 0; }

// usa uma chave do servidor para procurar a senha sem testar todos os resumos
export async function buscaSenha(senha: string) {
  const segredo = segredoSessao();
  if (!segredo) throw new Error("Defina SESSION_SECRET antes de usar o painel.");
  const chave = await crypto.subtle.importKey("raw", texto.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", chave, texto.encode(`senha-painel:${senha}`)));
}
async function resumoSenha(senha: string, sal: string) {
  const chave = await crypto.subtle.importKey("raw", texto.encode(senha), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: texto.encode(sal), iterations: 100000, hash: "SHA-256" }, chave, 256));
}
export async function prepararSenha(senha: string) {
  const sal = hex(crypto.getRandomValues(new Uint8Array(24)));
  return { sal, resumo: await resumoSenha(senha, sal), busca: await buscaSenha(senha) };
}
export async function conferirSenha(senha: string, acesso: AcessoSalvo) { return comparar(await resumoSenha(senha, acesso.sal), acesso.resumo); }
export function gerarSenhaPainel() { return hex(crypto.getRandomValues(new Uint8Array(15))); }

// lê somente o login principal do arquivo de configuração
export function loginGeralAmbiente() {
  const login = normalizarLogin(obterAmbiente().ADMIN_LOGIN ?? process.env.ADMIN_LOGIN ?? "admin");
  if (!loginValido(login)) throw new Error("ADMIN_LOGIN deve conter somente letras minúsculas, sem espaços ou números.");
  return login;
}

// importa a senha antiga uma única vez e deixa de usá-la depois da troca
export async function garantirAcessos() {
  await garantirBanco();
  const banco = getD1();
  const login = loginGeralAmbiente();
  if (!await banco.prepare("SELECT chave FROM cargas_iniciais WHERE chave = 'acessos-painel-v1'").first()) {
    const senha = obterAmbiente().ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";
    if (!senhaPermitida(senha)) throw new Error("Defina ADMIN_PASSWORD sem espaços ou underline para criar o primeiro acesso geral.");
    const protegido = await prepararSenha(senha);
    await banco.batch([
      banco.prepare(`INSERT INTO acessos_painel (cargo, vaga, nome, login, login_ambiente, resumo, sal, busca)
        SELECT 'geral', 1, 'Administração principal', ?, 1, ?, ?, ? WHERE NOT EXISTS
        (SELECT 1 FROM cargas_iniciais WHERE chave = 'acessos-painel-v1')
        ON CONFLICT(cargo, vaga) DO NOTHING`).bind(login, protegido.resumo, protegido.sal, protegido.busca),
      banco.prepare("INSERT OR IGNORE INTO cargas_iniciais (chave) VALUES ('acessos-painel-v1')"),
    ]);
  }
  await prepararLoginsExistentes(login);
}

// acrescenta logins aos acessos antigos sem trocar suas senhas
async function prepararLoginsExistentes(loginPrincipal: string) {
  const banco = getD1();
  type Identificacao = Pick<AcessoSalvo, "id" | "cargo" | "vaga" | "login" | "login_ambiente">;
  const primeiraConfiguracao = !await banco.prepare("SELECT chave FROM cargas_iniciais WHERE chave = 'logins-painel-v1'").first();
  const itens = (await banco.prepare("SELECT id, cargo, vaga, login, login_ambiente FROM acessos_painel ORDER BY id").all<Identificacao>()).results;
  const principal = itens.find((item) => item.login_ambiente) || (primeiraConfiguracao ? itens.find((item) => item.cargo === "geral") : undefined);
  const usados = new Set(itens.filter((item) => item.id !== principal?.id).map((item) => item.login).filter(Boolean));
  if (principal && usados.has(loginPrincipal)) throw new Error("ADMIN_LOGIN já é usado por outro acesso. Escolha outro login na configuração.");
  usados.add(loginPrincipal);
  const comandos: D1PreparedStatement[] = [];
  for (const item of itens) {
    if (item.id === principal?.id) {
      if (item.login !== loginPrincipal || !item.login_ambiente) comandos.push(banco.prepare("UPDATE acessos_painel SET login = ?, login_ambiente = 1, versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?").bind(loginPrincipal, item.id));
    } else if (!item.login) {
      let login = item.cargo.replace(/[^a-z]/g, "").slice(0, 40) + letras(item.vaga);
      while (usados.has(login)) login += letras(item.id);
      usados.add(login);
      comandos.push(banco.prepare("UPDATE acessos_painel SET login = ?, versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP WHERE id = ? AND login = ''").bind(login, item.id));
    }
  }
  if (primeiraConfiguracao) comandos.push(banco.prepare("INSERT OR IGNORE INTO cargas_iniciais (chave) VALUES ('logins-painel-v1')"));
  if (comandos.length) await banco.batch(comandos);
}

// transforma identificadores antigos em um sufixo que contém apenas letras
function letras(numero: number) { let resultado = ""; do { numero -= 1; resultado = String.fromCharCode(97 + numero % 26) + resultado; numero = Math.floor(numero / 26); } while (numero > 0); return resultado; }

// exige o login a senha e o modo correto de entrada
export async function autenticarSenha(loginRecebido: string, senha: string, geral: boolean) {
  const login = normalizarLogin(loginRecebido);
  if (!loginValido(login) || !senhaPermitida(senha)) return null;
  await garantirAcessos();
  const acesso = await getD1().prepare("SELECT * FROM acessos_painel WHERE login = ?").bind(login).first<AcessoSalvo>();
  if (!acesso || !obterCargo(acesso.cargo) || (acesso.cargo === "geral") !== geral || !await conferirSenha(senha, acesso)) return null;
  return acesso;
}

// confirma a senha do próprio acesso que está conectado
export async function confirmarSenhaDoAcesso(senha: string, id: number, versao: number) {
  if (!senhaPermitida(senha)) return false;
  const acesso = await getD1().prepare("SELECT * FROM acessos_painel WHERE id = ? AND versao = ?").bind(id, versao).first<AcessoSalvo>();
  return Boolean(acesso && await conferirSenha(senha, acesso));
}
