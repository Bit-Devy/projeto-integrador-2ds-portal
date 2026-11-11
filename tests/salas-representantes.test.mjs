// importa as verificações e o banco temporário dos testes
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { ambienteDaRequisicao } from "../worker/ambiente.ts";
import { criarRegistroMapa, atualizarRegistroMapa, excluirRegistroMapa, obterDadosMapa } from "../app/mapa/banco.ts";
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

// o cadastro da sala usa a turma já existente sem duplicá-la
test("criar sala pode vincular uma turma publicada no turno e na validade dela", () => comBanco(async (sqlite, sala) => {
  const item = await criarRegistroMapa("turmas", turma("2DS", { turno: "tarde", salaId: sala.id }));
  const criada = await criarRegistroMapa("locais", { nome: "Sala nova", ala: "Par", tipo: "sala_aula", ativo: true, publicado: true, turmaId: item.id });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM turmas_atividades").get().total, 1);
  const publico = await obterDadosMapa();
  assert.equal(publico.ensalamentos.length, 1);
  assert.equal(publico.ensalamentos[0].localId, criada.id);
  assert.equal(publico.ensalamentos[0].turno, "tarde");
  assert.equal(sqlite.prepare("SELECT ativo FROM ensalamentos WHERE local_id = ?").get(sala.id).ativo, 0);
  await atualizarRegistroMapa("locais", criada.id, { ...criada, descricao: "Só muda a descrição" });
  assert.equal((await obterDadosMapa()).ensalamentos.length, 1);
}));

// uma turma fora do público não pode ocupar uma sala por esse atalho
test("sala só aceita turma existente ativa publicada e dentro da validade", () => comBanco(async (sqlite) => {
  const antes = sqlite.prepare("SELECT COUNT(*) AS total FROM locais_colegio").get().total;
  for (const outros of [{ ativo: false }, { publicado: false }, { fimValidade: "2000-01-01" }, { inicioValidade: "2027-01-01" }]) {
    const item = await criarRegistroMapa("turmas", turma("Indisponível", outros));
    await assert.rejects(criarRegistroMapa("locais", { nome: "Não salvar", tipo: "sala_aula", ala: "Par", publicado: true, turmaId: item.id }), /turma já publicada/);
  }
  await assert.rejects(criarRegistroMapa("locais", { nome: "Não salvar", tipo: "sala_aula", ala: "Par", publicado: true, turmaId: 999999 }), /turma já publicada/);
  const ativa = await criarRegistroMapa("turmas", turma("Ativa"));
  await assert.rejects(criarRegistroMapa("locais", { nome: "Rascunho", tipo: "sala_aula", turmaId: ativa.id }), /Ative e publique/);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM locais_colegio").get().total, antes);
}));

// recusar um conflito também mantém os dados físicos da sala sem alterações
test("editar sala com turma conflitante exige confirmação e salva tudo junto", () => comBanco(async (sqlite, sala) => {
  const primeira = await criarRegistroMapa("turmas", turma("2A", { salaId: sala.id }));
  const segunda = await criarRegistroMapa("turmas", turma("2B"));
  let conflitos;
  await assert.rejects(atualizarRegistroMapa("locais", sala.id, { ...sala, nome: "Sala renomeada", turmaId: segunda.id }), (erro) => { conflitos = erro.conflitos; return erro.status === 409; });
  assert.equal(sqlite.prepare("SELECT nome FROM locais_colegio WHERE id = ?").get(sala.id).nome, sala.nome);
  await atualizarRegistroMapa("locais", sala.id, { ...sala, nome: "Sala renomeada", turmaId: segunda.id, substituirOcupacoes: conflitos.map((item) => item.id) });
  assert.equal((await obterDadosMapa()).ensalamentos[0].turmaAtividadeId, segunda.id);
  assert.equal(sqlite.prepare("SELECT ativo FROM ensalamentos WHERE turma_atividade_id = ?").get(primeira.id).ativo, 0);
}));

// simula a virada do ano com o mesmo filtro usado no banco publicado
test("em janeiro de 2027 só mostra mandatos válidos naquele período", () => comBanco(async () => {
  const DataOriginal = globalThis.Date;
  globalThis.Date = class extends DataOriginal {
    constructor(...argumentos) { super(...(argumentos.length ? argumentos : ["2027-01-01T15:00:00Z"])); }
    static now() { return new DataOriginal("2027-01-01T15:00:00Z").getTime(); }
  };
  try {
  const item = await criarRegistroMapa("turmas", turma("2DS"));
  const encerrado = await criarRepresentante(pessoa(item.id, { inicioMandato: "2026-01-01", fimMandato: "2026-12-31" }));
  const atual = await criarRepresentante(pessoa(item.id, { inicioMandato: "2027-01-01", fimMandato: "2027-12-31" }));
  const futuro = await criarRepresentante(pessoa(item.id, { inicioMandato: "2028-01-01", fimMandato: "2028-12-31" }));
  assert.deepEqual((await listarRepresentantes(new URLSearchParams())).itens.map((registro) => registro.id), [atual.id]);
  const painel = await listarRepresentantes(new URLSearchParams(), true);
  assert.ok([encerrado.id, atual.id, futuro.id].every((id) => painel.itens.some((registro) => registro.id === id)));
  } finally { globalThis.Date = DataOriginal; }
}));

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
  await assert.rejects(atualizarRegistroMapa("turmas", tarde.id, { ...tarde, ano: undefined, turno: "manha" }), (erro) => erro.status === 409 && erro.conflitos.length === 1);
  assert.equal(sqlite.prepare("SELECT turno FROM turmas_atividades WHERE id = ?").get(tarde.id).turno, "tarde");
  await assert.rejects(criarRegistroMapa("ensalamentos", { turmaAtividadeId: primeira.id, localId: sala.id, turno: "manha", tipo: "aula_regular", publicado: true }), /sala_ocupada/);
}));

// retirar do público conserva o cadastro mas uma nova publicação confere a sala de novo
test("turma oculta libera a sala e não pode voltar ao público sem revisar conflitos", () => comBanco(async (sqlite, sala) => {
  const primeira = await criarRegistroMapa("turmas", turma("2A", { salaId: sala.id }));
  await criarRepresentante(pessoa(primeira.id));
  await atualizarRegistroMapa("turmas", primeira.id, { publicado: false });
  assert.equal((await obterDadosMapa()).turmas.length, 0);
  assert.equal((await listarRepresentantes(new URLSearchParams())).itens.length, 0);
  assert.deepEqual({ ...sqlite.prepare("SELECT ativo, publicado FROM ensalamentos WHERE turma_atividade_id = ?").get(primeira.id) }, { ativo: 1, publicado: 0 });
  const segunda = await criarRegistroMapa("turmas", turma("2B", { salaId: sala.id }));
  let conflitos;
  await assert.rejects(atualizarRegistroMapa("turmas", primeira.id, { publicado: true }), (erro) => { conflitos = erro.conflitos; return erro.status === 409; });
  assert.equal(sqlite.prepare("SELECT publicado FROM turmas_atividades WHERE id = ?").get(primeira.id).publicado, 0);
  await atualizarRegistroMapa("turmas", primeira.id, { publicado: true, substituirOcupacoes: conflitos.map((item) => item.id) });
  assert.equal((await obterDadosMapa()).ensalamentos[0].turmaAtividadeId, primeira.id);
  assert.equal(sqlite.prepare("SELECT ativo FROM ensalamentos WHERE turma_atividade_id = ?").get(segunda.id).ativo, 0);
}));

// as mudanças da turma conservam o histórico sem manter uma sala ocupada por engano
test("desvincular e arquivar liberam a sala e restaurar não reativa vínculos antigos", () => comBanco(async (sqlite, sala) => {
  const primeira = await criarRegistroMapa("turmas", turma("2A", { salaId: sala.id }));
  await atualizarRegistroMapa("turmas", primeira.id, { desvincularSala: true });
  assert.equal((await obterDadosMapa()).ensalamentos.length, 0);
  const segunda = await criarRegistroMapa("turmas", turma("2B", { salaId: sala.id }));
  const arquivada = await atualizarRegistroMapa("turmas", segunda.id, { ativo: false, publicado: true });
  assert.equal(arquivada.publicado, false);
  assert.equal((await obterDadosMapa()).ensalamentos.length, 0);
  await criarRegistroMapa("turmas", turma("2C", { salaId: sala.id }));
  await atualizarRegistroMapa("turmas", segunda.id, { ativo: true, publicado: false });
  assert.equal(sqlite.prepare("SELECT ativo FROM ensalamentos WHERE turma_atividade_id = ?").get(segunda.id).ativo, 0);
  assert.equal((await obterDadosMapa()).ensalamentos.length, 1);
}));

// a exclusão exige arquivamento e conserva os nomes nos registros anteriores
test("só exclui turmas arquivadas e preserva representantes e participantes de campeonatos", () => comBanco(async (sqlite, sala) => {
  const item = await criarRegistroMapa("turmas", turma("2DS", { salaId: sala.id }));
  const representante = await criarRepresentante(pessoa(item.id));
  sqlite.prepare("INSERT INTO campeonatos (slug, nome, modalidade) VALUES ('campeonato-ficticio', 'Campeonato fictício', 'futsal')").run();
  sqlite.prepare("INSERT INTO participantes_campeonato (campeonato_id, turma_atividade_id, nome, nome_normalizado) VALUES (1, ?, '2DS', '2ds')").run(item.id);
  await assert.rejects(excluirRegistroMapa("turmas", item.id), /Arquive a turma/);
  await atualizarRegistroMapa("turmas", item.id, { publicado: false });
  await assert.rejects(excluirRegistroMapa("turmas", item.id), /Arquive a turma/);
  await atualizarRegistroMapa("turmas", item.id, { ativo: false });
  await excluirRegistroMapa("turmas", item.id);
  assert.equal(sqlite.prepare("SELECT id FROM turmas_atividades WHERE id = ?").get(item.id), undefined);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM ensalamentos WHERE turma_atividade_id = ?").get(item.id).total, 0);
  const pessoaPreservada = sqlite.prepare("SELECT turma, turma_atividade_id, ativo, publicado, arquivado_em FROM representantes WHERE id = ?").get(representante.id);
  assert.equal(pessoaPreservada.turma, "2DS");
  assert.equal(pessoaPreservada.turma_atividade_id, null);
  assert.equal(pessoaPreservada.ativo, 0);
  assert.equal(pessoaPreservada.publicado, 0);
  assert.ok(pessoaPreservada.arquivado_em);
  const participante = sqlite.prepare("SELECT nome, turma_atividade_id FROM participantes_campeonato").get();
  assert.equal(participante.nome, "2DS");
  assert.equal(participante.turma_atividade_id, null);
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
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
