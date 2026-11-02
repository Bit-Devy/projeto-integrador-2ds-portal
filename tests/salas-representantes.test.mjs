// importa as verificações e o banco temporário dos testes
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { ambienteDaRequisicao } from "../worker/ambiente.ts";
import { criarRegistroMapa, atualizarRegistroMapa, obterDadosMapa } from "../app/mapa/banco.ts";
import { criarRepresentante, atualizarRepresentante, listarRepresentantes } from "../app/eventos/banco.ts";

// executa cada cenário com as migrações reais e transações iguais às do d1
async function comBanco(executar) {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    const preparar = (sql, valores = []) => ({
      bind: (...recebidos) => preparar(sql, recebidos),
      async first() { return sqlite.prepare(sql).get(...valores) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...valores) }; },
      async run() { return sqlite.prepare(sql).run(...valores); },
    });
    const d1 = { prepare: preparar, async batch(comandos) {
      sqlite.exec("BEGIN");
      try { const resultados = []; for (const comando of comandos) resultados.push(await comando.all()); sqlite.exec("COMMIT"); return resultados; }
      catch (erro) { sqlite.exec("ROLLBACK"); throw erro; }
    } };
    await ambienteDaRequisicao.run({ DB: d1 }, async () => {
      await criarRegistroMapa("categorias", { grupo: "local", slug: "sala_aula", nome: "Sala" });
      await criarRegistroMapa("categorias", { grupo: "atividade", slug: "aula_regular", nome: "Regular" });
      const sala = await criarRegistroMapa("locais", { nome: "Sala teste", ala: "Par", tipo: "sala_aula", publicado: true });
      await executar(sqlite, sala);
    });
  } finally { sqlite.close(); }
}

// cria turmas publicadas sem depender dos cadastros do desenvolvimento
const turma = (nome, outros = {}) => ({ nome, nivelEnsino: "medio", serie: "2ª série", turno: "manha", tipo: "aula_regular", publicado: true, ativo: true, ...outros });
const pessoa = (id, outros = {}) => ({ turmaAtividadeId: id, nome: "Pessoa fictícia", turma: "Texto adulterado", turno: "noite", nivelEnsino: "outro", serie: "Inválida", funcao: "titular", publicado: true, ativo: true, ...outros });

test("sala ocupada exige confirmação e a substituição atualiza o mapa sem apagar o histórico", () => comBanco(async (sqlite, sala) => {
  const primeira = await criarRegistroMapa("turmas", turma("2A", { salaId: sala.id }));
  const antes = sqlite.prepare("SELECT COUNT(*) AS total FROM turmas_atividades").get().total;
  let conflitos;
  await assert.rejects(criarRegistroMapa("turmas", turma("2B", { salaId: sala.id })), (erro) => { conflitos = erro.conflitos; return erro.status === 409; });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM turmas_atividades").get().total, antes);
  const segunda = await criarRegistroMapa("turmas", turma("2B", { salaId: sala.id, substituirOcupacoes: conflitos.map((item) => item.id) }));
  const publico = await obterDadosMapa();
  assert.equal(publico.ensalamentos.length, 1);
  assert.equal(publico.ensalamentos[0].turmaAtividadeId, segunda.id);
  assert.equal(sqlite.prepare("SELECT ativo FROM ensalamentos WHERE turma_atividade_id = ?").get(primeira.id).ativo, 0);
}));

test("turnos e períodos diferentes podem usar a mesma sala e mudanças conflitantes são revertidas", () => comBanco(async (sqlite, sala) => {
  const primeira = await criarRegistroMapa("turmas", turma("2A", { salaId: sala.id, inicioValidade: "2026-01-01", fimValidade: "2026-06-30" }));
  await criarRegistroMapa("turmas", turma("2B", { salaId: sala.id, inicioValidade: "2026-07-01", fimValidade: "2026-12-31" }));
  const tarde = await criarRegistroMapa("turmas", turma("2C", { salaId: sala.id, turno: "tarde", inicioValidade: "2026-01-01", fimValidade: "2026-06-30" }));
  await assert.rejects(atualizarRegistroMapa("turmas", tarde.id, { ...tarde, turno: "manha" }), /sala_ocupada/);
  assert.equal(sqlite.prepare("SELECT turno FROM turmas_atividades WHERE id = ?").get(tarde.id).turno, "tarde");
  await assert.rejects(criarRegistroMapa("ensalamentos", { turmaAtividadeId: primeira.id, localId: sala.id, turno: "manha", tipo: "aula_regular", publicado: true }), /sala_ocupada/);
}));

test("representantes exigem turmas disponíveis e usam os dados oficiais da turma", () => comBanco(async (_sqlite, sala) => {
  const item = await criarRegistroMapa("turmas", turma("2DS"));
  const representante = await criarRepresentante(pessoa(item.id));
  assert.equal(representante.turma, "2DS");
  assert.equal(representante.turno, "manha");
  assert.equal(representante.nivelEnsino, "medio");
  await atualizarRegistroMapa("turmas", item.id, { ...item, nome: "2DS Novo", turno: "tarde" });
  const renomeados = await listarRepresentantes(new URLSearchParams());
  assert.equal(renomeados.itens[0].turma, "2DS Novo");
  await atualizarRegistroMapa("turmas", item.id, { ...item, ativo: false });
  assert.equal((await listarRepresentantes(new URLSearchParams())).itens.length, 0);
  await assert.rejects(atualizarRepresentante(representante.id, { publicado: true }), /turma ativa/);
  for (const outros of [{ publicado: false }, { fimValidade: "2000-01-01" }, { inicioValidade: "2099-01-01" }]) {
    const indisponivel = await criarRegistroMapa("turmas", turma("Indisponível", outros));
    await assert.rejects(criarRepresentante(pessoa(indisponivel.id)), /turma ativa/);
  }
  await assert.rejects(criarRepresentante(pessoa(999999)), /turma ativa/);
  const salaRascunho = await criarRegistroMapa("locais", { nome: "Sala rascunho", tipo: "sala_aula" });
  await assert.rejects(criarRegistroMapa("turmas", turma("2X", { salaId: salaRascunho.id })), /sala ativa e publicada/);
  assert.ok(sala.id);
}));
