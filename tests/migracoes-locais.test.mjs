import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { conferirEstrutura, lerEstrutura, planejarCompatibilidade } from "../scripts/lib/compatibilidade-migracoes.mjs";

register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === ".") return nextResolve("./index.ts", context);
    try { return await nextResolve(specifier, context); } catch (erro) {
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) throw erro;
      for (const sufixo of [".ts", "/index.ts"]) {
        try { return await nextResolve(specifier + sufixo, context); } catch {}
      }
      throw erro;
    }
  }
`)}`, import.meta.url);
const { ambienteDaRequisicao } = await import("../worker/ambiente.ts");
const migracoes = await Promise.all((await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()
  .map(async (nome) => ({ nome, sql: await readFile(`drizzle/${nome}`, "utf8") })));

async function bancoDaPrevia() {
  const banco = new DatabaseSync(":memory:");
  const prepare = (sql, valores = []) => ({
    bind: (...recebidos) => prepare(sql, recebidos),
    async first() { return banco.prepare(sql).get(...valores) ?? null; },
    async all() { return { results: banco.prepare(sql).all(...valores) }; },
    async run() { return banco.prepare(sql).run(...valores); },
  });
  const d1 = { prepare, async batch(comandos) { return Promise.all(comandos.map((comando) => comando.all())); } };
  const inicializador = await import(`../db/inicializar.ts?teste=${Math.random()}`);
  await ambienteDaRequisicao.run({ DB: d1 }, () => inicializador.garantirBanco());
  return banco;
}
const retrato = (banco) => banco.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
  .map(({ name }) => [name, banco.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]);

test("reconhece a estrutura inicializada pelo site sem modificar os registros", async () => {
  const banco = await bancoDaPrevia();
  try {
    banco.exec("INSERT INTO mensagens (nome,turma,assunto,titulo,mensagem) VALUES ('Teste','2DS','Teste','Preservar','Mensagem já existente')");
    const antes = retrato(banco);
    const plano = planejarCompatibilidade(banco, migracoes);
    assert.deepEqual(plano.registrar, migracoes.map((item) => item.nome));
    assert.deepEqual(retrato(banco), antes);
    assert.deepEqual(conferirEstrutura(plano.estruturaEsperada, lerEstrutura(banco)), []);
  } finally { banco.close(); }
});

test("um banco novo recebe todas as migrações e a repetição não reconhece nada novo", () => {
  const banco = new DatabaseSync(":memory:");
  try {
    assert.deepEqual(planejarCompatibilidade(banco, migracoes).registrar, []);
    banco.exec("CREATE TABLE d1_migrations (name TEXT UNIQUE)");
    for (const item of migracoes) {
      banco.exec(item.sql);
      banco.prepare("INSERT INTO d1_migrations VALUES (?)").run(item.nome);
    }
    const antes = retrato(banco);
    assert.deepEqual(planejarCompatibilidade(banco, migracoes).registrar, []);
    assert.deepEqual(retrato(banco), antes);
  } finally { banco.close(); }
});

test("deixa colunas de versões posteriores para as migrações pendentes", () => {
  const banco = new DatabaseSync(":memory:");
  try {
    for (const item of migracoes.slice(0, 5)) banco.exec(item.sql);
    const antes = lerEstrutura(banco);
    const plano = planejarCompatibilidade(banco, migracoes);
    assert.deepEqual(plano.registrar, migracoes.slice(0, 5).map((item) => item.nome));
    assert.deepEqual(lerEstrutura(banco), antes);
    const futuras = [...migracoes, { nome: "0007_teste.sql", sql: "ALTER TABLE campeonatos ADD COLUMN teste TEXT" }];
    assert.ok(!planejarCompatibilidade(banco, futuras).registrar.includes("0007_teste.sql"));
  } finally { banco.close(); }
});

test("recusa índice ou coluna incompatível antes de registrar histórico", async () => {
  const banco = await bancoDaPrevia();
  try {
    banco.exec("DROP INDEX conteudos_tipo_idx; CREATE INDEX conteudos_tipo_idx ON conteudos(titulo)");
    const antes = retrato(banco);
    assert.throws(() => planejarCompatibilidade(banco, migracoes), /não é compatível/);
    assert.deepEqual(retrato(banco), antes);
    banco.exec("DROP INDEX conteudos_tipo_idx; CREATE INDEX conteudos_tipo_idx ON conteudos(tipo); ALTER TABLE campeonatos DROP COLUMN regulamento");
    assert.throws(() => planejarCompatibilidade(banco, migracoes), /não é compatível/);
  } finally { banco.close(); }
});

test("não marca a migração de dados como aplicada se a reclassificação ainda falta", async () => {
  const banco = await bancoDaPrevia();
  try {
    banco.exec("UPDATE turmas_atividades SET tipo='outro' WHERE chave_importacao LIKE 'pdf2026:turma:%' AND nome<>'Reforço'");
    assert.throws(() => planejarCompatibilidade(banco, migracoes), /reclassificação 0003/);
  } finally { banco.close(); }
});

test("uma migração futura que falha no ensaio não altera registros nem histórico", async () => {
  const banco = await bancoDaPrevia();
  try {
    const antes = retrato(banco);
    const futuras = [...migracoes, { nome: "0007_falha.sql", sql: "UPDATE conteudos SET titulo='Alterado'; CREATE TABLE conteudos(id INTEGER)" }];
    assert.throws(() => planejarCompatibilidade(banco, futuras), /não é compatível/);
    assert.deepEqual(retrato(banco), antes);
  } finally { banco.close(); }
});
