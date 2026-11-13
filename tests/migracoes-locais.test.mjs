import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import "../scripts/registrar-typescript-testes.mjs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { conferirEstrutura, lerEstrutura, planejarCompatibilidade } from "../scripts/lib/compatibilidade-migracoes.mjs";

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

// a prévia pode criar o mesmo calendário com a tabela escrita em uma única linha
test("reconhece restrições completas em tabelas de uma linha", () => {
  const primeiro = new DatabaseSync(":memory:"), segundo = new DatabaseSync(":memory:");
  try {
    primeiro.exec("CREATE TABLE exemplo (tipo TEXT CHECK (tipo IN ('anual', 'semestral')), total INTEGER CHECK (total >= 0))");
    segundo.exec("CREATE TABLE exemplo (tipo TEXT CHECK (tipo IN ('anual', 'semestral')),\n total INTEGER CHECK (total >= 0)\n)");
    assert.deepEqual(conferirEstrutura(lerEstrutura(primeiro), lerEstrutura(segundo)), []);
  } finally { primeiro.close(); segundo.close(); }
});

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

// atualiza horários e mandatos já cadastrados sem perder os dados existentes
test("a migração dos dias mantém a ocupação antiga e publica apenas os mandatos ativos", () => {
  const banco = new DatabaseSync(":memory:");
  try {
    const indice = migracoes.findIndex((item) => item.nome === "0019_dias_de_aula.sql");
    for (const item of migracoes.slice(0, indice)) banco.exec(item.sql);
    const turma = banco.prepare(`INSERT INTO turmas_atividades (nome, nome_normalizado, turno, tipo, horario_inicial, horario_final)
      VALUES ('Idiomas do teste', 'idiomasdoteste', 'manha', 'idiomas', '08:00', '10:00') RETURNING id`).get();
    const representante = banco.prepare(`INSERT INTO representantes (turma_atividade_id, nome, nome_normalizado, nivel_ensino, serie, turma, turma_normalizada, turno, funcao, ativo, arquivado_em)
      VALUES (?, ?, ?, 'medio', '2', 'Idiomas do teste', 'idiomasdoteste', 'manha', 'titular', ?, ?) RETURNING id`);
    const atual = representante.get(turma.id, "Pessoa do mandato ativo", "pessoaativa", 1, null);
    const historico = representante.get(turma.id, "Pessoa do arquivo", "pessoaearquivo", 0, "2026-02-01 12:00:00");
    banco.exec(migracoes[indice].sql);
    const horario = banco.prepare("SELECT horario_inicial, horario_final, dias_semana FROM turmas_atividades WHERE id = ?").get(turma.id);
    assert.deepEqual({ ...horario }, { horario_inicial: "08:00", horario_final: "10:00", dias_semana: 127 });
    const consultar = banco.prepare("SELECT publicado, contatos_publicos, arquivado_em FROM representantes WHERE id = ?");
    assert.deepEqual({ ...consultar.get(atual.id) }, { publicado: 1, contatos_publicos: 0, arquivado_em: null });
    assert.deepEqual({ ...consultar.get(historico.id) }, { publicado: 0, contatos_publicos: 0, arquivado_em: "2026-02-01 12:00:00" });
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

// compara a mesma regra criada pelo inicializador e pelo drizzle
test("reconhece a mesma restrição com ou sem o nome da tabela", () => {
  const a = new DatabaseSync(":memory:"); const b = new DatabaseSync(":memory:");
  try {
    a.exec("CREATE TABLE acesso(vaga INTEGER CHECK(acesso.vaga >= 1 AND acesso.vaga <= 3))");
    b.exec("CREATE TABLE acesso(vaga INTEGER CHECK(vaga >= 1 AND vaga <= 3))");
    assert.deepEqual(conferirEstrutura(lerEstrutura(a), lerEstrutura(b)), []);
    b.exec("DROP TABLE acesso; CREATE TABLE acesso(vaga INTEGER CHECK(vaga >= 1 AND vaga <= 4))");
    assert.notDeepEqual(conferirEstrutura(lerEstrutura(a), lerEstrutura(b)), []);
  } finally { a.close(); b.close(); }
});
