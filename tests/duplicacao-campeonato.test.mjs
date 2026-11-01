import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    try {
      return await nextResolve(specifier, context);
    } catch (erro) {
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) throw erro;
      for (const sufixo of [".ts", "/index.ts"]) {
        try { return await nextResolve(specifier + sufixo, context); } catch {}
      }
      throw erro;
    }
  }
`)}`, import.meta.url);

const { ambienteDaRequisicao } = await import("../worker/ambiente.ts");
const banco = await import("../app/eventos/banco.ts");

async function comBanco(executar) {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) {
      sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    }
    sqlite.exec("PRAGMA foreign_keys = ON");
    const preparar = (sql, valores = []) => ({
      bind: (...recebidos) => preparar(sql, recebidos),
      async first() { return sqlite.prepare(sql).get(...valores) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...valores) }; },
      async run() { return sqlite.prepare(sql).run(...valores); },
    });
    const d1 = {
      prepare: preparar,
      // Reproduz a transação de D1.batch usando as mesmas consultas no SQLite.
      async batch(comandos) {
        sqlite.exec("BEGIN");
        try {
          const resultados = [];
          for (const comando of comandos) resultados.push(await comando.all());
          sqlite.exec("COMMIT");
          return resultados;
        } catch (erro) {
          sqlite.exec("ROLLBACK");
          throw erro;
        }
      },
    };
    return await ambienteDaRequisicao.run({ DB: d1 }, () => executar(sqlite));
  } finally {
    sqlite.close();
  }
}

async function criarOrigem(quantidade = 8) {
  const item = await banco.criarCampeonato({
    nome: "Copa de teste", modalidade: "Futsal", premiacao: "Medalhas",
    participantes: Array.from({ length: quantidade }, (_, indice) => ({
      nome: `2${String.fromCharCode(65 + indice)}`, posicaoInicial: quantidade - indice,
    })),
  });
  await banco.gerarChaveCampeonato(item.id);
  await banco.criarDocumentoCampeonato(item.id, {
    titulo: "Regulamento", arquivoUrl: "/api/arquivos/regulamento.pdf", publicado: true,
  });
  return item;
}

for (const quantidade of [8, 5]) {
  test(`duplica chave de ${quantidade} turmas com IDs novos e sem resultados`, () => comBanco(async (sqlite) => {
    const origem = await criarOrigem(quantidade);
    const jogo = (await banco.obterCampeonato(origem.id, true)).partidas.find((item) => item.participanteAId && item.participanteBId);
    await banco.registrarResultadoPartida(jogo.id, {
      placarA: 3, placarB: 1, vencedorId: jogo.participanteAId, situacao: "encerrada", placarPublicado: true,
    });
    await banco.atualizarCampeonato(origem.id, { publicado: true, chavePublicada: true });
    const antes = await banco.obterCampeonato(origem.id, true);
    const copia = await banco.duplicarCampeonato(origem.id);
    assert.deepEqual(await banco.obterCampeonato(origem.id, true), antes);
    assert.notEqual(copia.item.id, origem.id);
    assert.equal(copia.item.publicado, false);
    assert.equal(copia.item.chavePublicada, false);
    assert.equal(copia.item.situacao, "proximo");
    assert.equal(copia.item.premiacao, "Medalhas");
    for (const grupo of ["participantes", "fases", "partidas", "documentos"]) {
      assert.equal(copia[grupo].length, antes[grupo].length, grupo);
      assert.ok(copia[grupo].every((item) => !antes[grupo].some((anterior) => anterior.id === item.id)), grupo);
    }
    assert.deepEqual(copia.participantes.map((item) => [item.nome, item.posicaoInicial]), antes.participantes.map((item) => [item.nome, item.posicaoInicial]));
    assert.ok(copia.fases.every((item) => !item.publicado));
    assert.equal(copia.documentos[0].arquivoUrl, antes.documentos[0].arquivoUrl);
    assert.equal(copia.documentos[0].publicado, false);
    const idsParticipantes = new Set(copia.participantes.map((item) => item.id));
    for (const [indice, partida] of copia.partidas.entries()) {
      const anterior = antes.partidas[indice];
      assert.equal(partida.faseId, copia.fases[antes.fases.findIndex((fase) => fase.id === anterior.faseId)].id);
      assert.equal(partida.vencedorId, null);
      assert.equal(partida.placarA, null);
      assert.equal(partida.placarB, null);
      assert.equal(partida.publicado, false);
      assert.equal(partida.placarPublicado, false);
      if (anterior.proximaPartidaId) {
        assert.equal(partida.proximaPartidaId, copia.partidas[antes.partidas.findIndex((item) => item.id === anterior.proximaPartidaId)].id);
        assert.equal(partida.proximaPosicao, anterior.proximaPosicao);
      } else {
        assert.equal(partida.proximaPartidaId, null);
        assert.equal(partida.proximaPosicao, "");
      }
      for (const posicao of ["A", "B"]) {
        const id = partida[`participante${posicao}Id`];
        assert.ok(id === null || idsParticipantes.has(id));
        if (antes.partidas.some((item) => item.proximaPartidaId === anterior.id && item.proximaPosicao === posicao.toLowerCase())) {
          assert.equal(id, null, "a cópia não herda avanços dos resultados anteriores");
        } else if (id !== null) {
          assert.equal(copia.participantes.find((item) => item.id === id).nome,
            antes.participantes.find((item) => item.id === anterior[`participante${posicao}Id`]).nome);
        }
      }
    }
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  }));
}

test("uma falha no último documento desfaz o campeonato e toda a chave", () => comBanco(async (sqlite) => {
  const origem = await criarOrigem();
  const tabelas = ["campeonatos", "participantes_campeonato", "fases_campeonato", "partidas", "documentos_campeonato"];
  const retrato = () => tabelas.map((tabela) => sqlite.prepare(`SELECT * FROM ${tabela} ORDER BY id`).all());
  const antes = retrato();
  sqlite.exec(`CREATE TRIGGER falhar_documento BEFORE INSERT ON documentos_campeonato
    WHEN NEW.campeonato_id <> ${origem.id} BEGIN SELECT RAISE(ABORT, 'falha simulada no documento'); END`);
  await assert.rejects(banco.duplicarCampeonato(origem.id), /falha simulada no documento/);
  assert.deepEqual(retrato(), antes, "não pode permanecer nenhum registro parcial");
}));

test("duplica um campeonato ainda sem chave", () => comBanco(async () => {
  const origem = await banco.criarCampeonato({ nome: "Sem chave", modalidade: "Vôlei" });
  const copia = await banco.duplicarCampeonato(origem.id);
  assert.equal(copia.participantes.length, 0);
  assert.equal(copia.fases.length, 0);
  assert.equal(copia.partidas.length, 0);
}));
