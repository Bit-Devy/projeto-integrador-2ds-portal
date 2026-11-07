// usa um banco e uma biblioteca descartáveis para os testes não alterarem o site local
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function abrirPortalMemoria({ variaveis = {}, assets = false } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  for (const nome of (await readdir("drizzle")).filter((item) => item.endsWith(".sql")).sort()) sqlite.exec(await readFile(`drizzle/${nome}`, "utf8"));
  const preparar = (sql, valores = []) => ({
    bind: (...recebidos) => preparar(sql, recebidos),
    async first(coluna) { const linha = sqlite.prepare(sql).get(...valores) ?? null; return coluna ? linha?.[coluna] : linha; },
    executar() { return { results: sqlite.prepare(sql).all(...valores), success: true, meta: { changes: sqlite.prepare("SELECT changes() total").get().total } }; },
    async all() { return this.executar(); },
    async run() { const resultado = sqlite.prepare(sql).run(...valores); return { success: true, meta: { changes: Number(resultado.changes), last_row_id: Number(resultado.lastInsertRowid) } }; },
  });
  const d1 = { prepare: preparar, async batch(comandos) {
    sqlite.exec("SAVEPOINT lote");
    try { const resultados = comandos.map((item) => item.executar()); sqlite.exec("RELEASE lote"); return resultados; }
    catch (erro) { sqlite.exec("ROLLBACK TO lote; RELEASE lote"); throw erro; }
  } };
  const objetos = new Map();
  const bucket = {
    async put(chave, corpo, metadados = {}) { const bytes = new Uint8Array(await new Response(corpo).arrayBuffer()); objetos.set(chave, { bytes, uploaded: new Date(), ...metadados }); },
    async get(chave) { const item = objetos.get(chave); return item ? { ...item, body: new Blob([item.bytes]).stream(), httpEtag: '"teste"', arrayBuffer: async () => item.bytes.slice().buffer, writeHttpMetadata(headers) { headers.set("content-type", item.httpMetadata?.contentType || "text/plain"); } } : null; },
    async list({ cursor = "0", limit = 30 } = {}) { const itens = [...objetos].sort(([a], [b]) => a.localeCompare(b)); const inicio = Number(cursor); const objetosPagina = itens.slice(inicio, inicio + limit); return { objects: objetosPagina.map(([key, item]) => ({ key, size: item.bytes.length, ...item })), truncated: inicio + limit < itens.length, cursor: String(inicio + limit) }; },
    async delete(chave) { objetos.delete(chave); },
  };
  const pastaCliente = path.resolve("dist/client");
  const tipos = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".pdf": "application/pdf" };
  async function arquivoEstatico(request) {
    if (!assets || !["GET", "HEAD"].includes(request.method)) return null;
    const arquivo = path.resolve(pastaCliente, `.${decodeURIComponent(new URL(request.url).pathname)}`);
    if (!arquivo.startsWith(`${pastaCliente}${path.sep}`)) return null;
    try { if (!(await stat(arquivo)).isFile()) return null; return new Response(request.method === "HEAD" ? null : await readFile(arquivo), { headers: { "content-type": tipos[path.extname(arquivo)] || "application/octet-stream" } }); } catch { return null; }
  }
  const senhaAdmin = "senha.admin*2026.teste";
  const ambiente = { DB: d1, BUCKET: bucket, ADMIN_LOGIN: "admin", ADMIN_PASSWORD: senhaAdmin, SESSION_SECRET: "segredo exclusivo da prévia e dos testes em memória", ...variaveis, ASSETS: { fetch: async (request) => await arquivoEstatico(request) || new Response("", { status: 404 }) } };
  const { default: worker } = await import(`../../dist/server/index.js?memoria=${Date.now()}-${Math.random()}`);
  const pendentes = new Set();
  const contexto = { waitUntil(tarefa) { pendentes.add(tarefa); Promise.resolve(tarefa).then(() => pendentes.delete(tarefa), () => pendentes.delete(tarefa)); }, passThroughOnException() {} };
  const responder = async (request) => await arquivoEstatico(request) || await worker.fetch(request, ambiente, contexto);
  const cookies = new Map();
  async function chamar(caminho, { method = "GET", corpo, formulario, arquivo, jar = cookies, esperado = 200 } = {}) {
    const headers = { origin: "http://localhost", cookie: [...jar].map(([chave, valor]) => `${chave}=${valor}`).join("; ") };
    if (corpo) headers["content-type"] = "application/json";
    if (formulario) headers["content-type"] = "application/x-www-form-urlencoded";
    const resposta = await responder(new Request(`http://localhost${caminho}`, { method, headers, body: arquivo || (formulario ? new URLSearchParams(formulario) : corpo ? JSON.stringify(corpo) : undefined) }));
    assert.equal(resposta.status, esperado, `${method} ${caminho}: ${resposta.status === esperado ? "" : await resposta.clone().text()}`);
    for (const item of resposta.headers.getSetCookie()) { const [chave, ...valor] = item.split(";")[0].split("="); jar.set(chave, valor.join("=")); }
    return resposta;
  }
  await chamar("/api/login", { method: "POST", formulario: { login: ambiente.ADMIN_LOGIN, senha: ambiente.ADMIN_PASSWORD, geral: "1", returnTo: "/painel" }, esperado: 303 });
  return { chamar, cookies, responder, sqlite, objetos, senhaAdmin: ambiente.ADMIN_PASSWORD, async fechar() { await Promise.allSettled([...pendentes]); sqlite.close(); objetos.clear(); } };
}
