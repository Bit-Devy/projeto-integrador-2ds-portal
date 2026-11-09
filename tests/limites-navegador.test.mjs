// importa as verificações os arquivos e o banco usado pelos testes
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import "../scripts/registrar-typescript-testes.mjs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

// carrega as regras reais que serão executadas com um banco temporário
const { ambienteDaRequisicao } = await import("../worker/ambiente.ts");
const { consultarLimite, consumirTentativa, devolverTentativaMensagem, limparTentativasLogin } = await import("../app/lib/limites.ts");

// usa as mesmas consultas do servidor sem alterar o banco de desenvolvimento
async function comBanco(executar) {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) {
      sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    }
    const preparar = (sql, valores = []) => ({
      bind: (...recebidos) => preparar(sql, recebidos),
      async first() { return sqlite.prepare(sql).get(...valores) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...valores) }; },
      async run() { return sqlite.prepare(sql).run(...valores); },
    });
    const d1 = { prepare: preparar, async batch(comandos) { return Promise.all(comandos.map((comando) => comando.all())); } };
    return await ambienteDaRequisicao.run({ DB: d1 }, executar);
  } finally {
    sqlite.close();
  }
}

// garante que outras abas não consigam ultrapassar os três envios
test("permite somente três mensagens simultâneas e libera após uma hora", () => comBanco(async () => {
  const agora = 100_000;
  await consultarLimite("mensagens", "navegador-a", agora);
  const respostas = await Promise.all(Array.from({ length: 12 }, () => consumirTentativa("mensagens", "navegador-a", agora)));
  assert.equal(respostas.filter((item) => item.permitido).length, 3);
  assert.equal((await consultarLimite("mensagens", "navegador-a", agora)).tentarEm, 3600);
  assert.equal((await consumirTentativa("mensagens", "navegador-a", agora + 3599)).permitido, false);
  assert.equal((await consumirTentativa("mensagens", "navegador-a", agora + 3600)).permitido, true);
  assert.equal((await consultarLimite("mensagens", "navegador-a", agora + 3600)).restantes, 2);
}));

// confere os dois bloqueios sem precisar aguardar no relógio real
test("login espera quinze minutos após cinco erros e um dia após mais cinco", () => comBanco(async () => {
  const agora = 200_000;
  for (let indice = 0; indice < 5; indice += 1) assert.equal((await consumirTentativa("login", "navegador-b", agora)).permitido, true);
  assert.equal((await consultarLimite("login", "navegador-b", agora)).tentarEm, 900);
  assert.equal((await consumirTentativa("login", "navegador-b", agora + 899)).permitido, false);
  for (let indice = 0; indice < 5; indice += 1) assert.equal((await consumirTentativa("login", "navegador-b", agora + 900)).permitido, true);
  assert.equal((await consultarLimite("login", "navegador-b", agora + 900)).tentarEm, 86400);
  assert.equal((await consumirTentativa("login", "navegador-b", agora + 900 + 86399)).permitido, false);
  assert.equal((await consumirTentativa("login", "navegador-b", agora + 900 + 86400)).permitido, true);
}));

// mantém os limites independentes e devolve reservas que falharam
test("separa navegadores e ações e reinicia o contador depois do login", () => comBanco(async () => {
  const agora = 300_000;
  for (let indice = 0; indice < 3; indice += 1) await consumirTentativa("mensagens", "navegador-c", agora);
  assert.equal((await consultarLimite("mensagens", "outro-navegador", agora)).restantes, 3);
  assert.equal((await consultarLimite("login", "navegador-c", agora)).restantes, 5);
  await devolverTentativaMensagem("navegador-c");
  assert.equal((await consultarLimite("mensagens", "navegador-c", agora)).bloqueado, false);
  assert.equal((await consumirTentativa("mensagens", "navegador-c", agora)).permitido, true);
  await consumirTentativa("login", "navegador-c", agora);
  await limparTentativasLogin("navegador-c");
  assert.equal((await consultarLimite("login", "navegador-c", agora)).restantes, 5);
}));
