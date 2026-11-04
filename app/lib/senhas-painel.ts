// guarda apenas resumos protegidos das senhas de cada cargo
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";
import { obterAmbiente } from "../../worker/ambiente";
import { obterCargo } from "./cargos";

export type AcessoSalvo = { id: number; cargo: string; vaga: number; nome: string; resumo: string; sal: string; busca: string; versao: number };
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

// importa a senha antiga uma única vez e deixa de usá-la depois da troca
export async function garantirAcessos() {
  await garantirBanco();
  const banco = getD1();
  if (await banco.prepare("SELECT chave FROM cargas_iniciais WHERE chave = 'acessos-painel-v1'").first()) return;
  const senha = obterAmbiente().ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";
  if (!senha) throw new Error("Defina ADMIN_PASSWORD para criar o primeiro acesso geral.");
  const protegido = await prepararSenha(senha);
  await banco.batch([
    banco.prepare(`INSERT INTO acessos_painel (cargo, vaga, nome, resumo, sal, busca)
      SELECT 'geral', 1, 'Administração principal', ?, ?, ? WHERE NOT EXISTS
      (SELECT 1 FROM cargas_iniciais WHERE chave = 'acessos-painel-v1')
      ON CONFLICT(cargo, vaga) DO NOTHING`).bind(protegido.resumo, protegido.sal, protegido.busca),
    banco.prepare("INSERT OR IGNORE INTO cargas_iniciais (chave) VALUES ('acessos-painel-v1')"),
  ]);
}

// identifica o cargo pela senha e exige o modo correto de entrada
export async function autenticarSenha(senha: string, geral: boolean) {
  await garantirAcessos();
  if (!senha || senha.length > 200) return null;
  const acesso = await getD1().prepare("SELECT * FROM acessos_painel WHERE busca = ?").bind(await buscaSenha(senha)).first<AcessoSalvo>();
  if (!acesso || !obterCargo(acesso.cargo) || (acesso.cargo === "geral") !== geral || !await conferirSenha(senha, acesso)) return null;
  return acesso;
}

// confirma a senha do próprio acesso que está conectado
export async function confirmarSenhaDoAcesso(senha: string, id: number, versao: number) {
  if (!senha || senha.length > 200) return false;
  const acesso = await getD1().prepare("SELECT * FROM acessos_painel WHERE id = ? AND versao = ?").bind(id, versao).first<AcessoSalvo>();
  return Boolean(acesso && await conferirSenha(senha, acesso));
}
