import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getPlatformProxy } from "wrangler";
import { conferirEstrutura, lerEstrutura, planejarCompatibilidade } from "./lib/compatibilidade-migracoes.mjs";

const argumentos = process.argv.slice(2);
let persistencia = path.resolve(".wrangler/state");
if (argumentos.length) {
  if (argumentos.length !== 2 || argumentos[0] !== "--persist-to") throw new Error("Use somente --persist-to <pasta> para escolher outro banco local.");
  persistencia = path.resolve(argumentos[1]);
}
const abrir = () => getPlatformProxy({ configPath: path.resolve("wrangler.jsonc"), persist: { path: path.join(persistencia, "v3") }, remoteBindings: false });
const migracoes = await Promise.all((await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()
  .map(async (nome) => ({ nome, sql: await readFile(path.join("drizzle", nome), "utf8") })));

async function exportarBanco(d1) {
  const [linhas] = await d1.prepare("PRAGMA miniflare_d1_export(?,?,?);").bind(0, 0).raw();
  return linhas.join("\n");
}

function abrirCopia(sql) {
  const copia = new DatabaseSync(":memory:");
  try {
    copia.exec("PRAGMA foreign_keys = OFF");
    copia.exec(sql);
    copia.exec("PRAGMA foreign_keys = ON");
  } catch (erro) { copia.close(); throw erro; }
  return copia;
}

let proxy;
try {
  proxy = await abrir();
  const sql = await exportarBanco(proxy.env.DB);
  await mkdir(".wrangler/backups-migracoes", { recursive: true });
  const pasta = await mkdtemp(path.resolve(".wrangler/backups-migracoes", new Date().toISOString().replaceAll(":", "-") + "-"));
  await writeFile(path.join(pasta, "banco.sql"), sql, { flag: "wx", mode: 0o600 });
  console.log(`Backup local: ${pasta}`);
  const copia = abrirCopia(sql);
  let plano;
  try {
    await writeFile(path.join(pasta, "estrutura.json"), JSON.stringify({ persistencia, estrutura: lerEstrutura(copia) }, null, 2));
    const integridade = copia.prepare("PRAGMA integrity_check").all();
    if (integridade.some((item) => item.integrity_check !== "ok") || copia.prepare("PRAGMA foreign_key_check").all().length) {
      throw new Error("O banco apresenta erros de integridade ou de chaves estrangeiras. Nenhuma migração foi aplicada.");
    }
    plano = planejarCompatibilidade(copia, migracoes);
  } finally {
    copia.close();
  }
  if (plano.registrar.length) {
    await proxy.env.DB.batch([
      proxy.env.DB.prepare(`CREATE TABLE IF NOT EXISTS d1_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)`),
      ...plano.registrar.map((nome) => proxy.env.DB.prepare("INSERT INTO d1_migrations (name) VALUES (?)").bind(nome)),
    ]);
    console.log(`Estrutura conferida: ${plano.registrar.length} migrações da prévia reconhecidas.`);
  }
  await proxy.dispose();
  proxy = null;
  await new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, ["scripts/comando-local.mjs", "wrangler", "d1", "migrations", "apply", "portal-gecep-local", "--local", "--persist-to", persistencia], { stdio: "inherit" });
    processo.on("error", reject);
    processo.on("exit", (codigo) => codigo === 0 ? resolve() : reject(new Error(`As migrações terminaram com código ${codigo}. O backup foi preservado.`)));
  });
  proxy = await abrir();
  const bancoFinal = abrirCopia(await exportarBanco(proxy.env.DB));
  try {
    const erros = conferirEstrutura(plano.estruturaEsperada, lerEstrutura(bancoFinal));
    if (erros.length || bancoFinal.prepare("PRAGMA foreign_key_check").all().length) throw new Error(`Falha na conferência final do banco.\n${erros.join("\n")}`);
    console.log("Estrutura final e chaves estrangeiras conferidas.");
  } finally { bancoFinal.close(); }
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  await proxy?.dispose();
}
