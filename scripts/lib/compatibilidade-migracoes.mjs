import { DatabaseSync } from "node:sqlite";

// reconhece as migrações que o inicializador local também executa
const migracoesDaPrevia = [
  "0000_smart_quasar.sql", "0001_damp_mockingbird.sql", "0002_sleepy_mandarin.sql",
  "0003_reclassificar_mapa_2026.sql", "0004_sistema_eventos.sql", "0005_long_blob.sql",
  "0006_redundant_sir_ram.sql",
  "0007_amusing_toad_men.sql",
  "0008_massive_shooting_star.sql",
  "0009_grey_spectrum.sql",
  "0010_aspiring_fantastic_four.sql",
  "0011_panoramic_arachne.sql",
];
const identificador = (valor) => `"${valor.replaceAll('"', '""')}"`;
const normalizarSql = (sql) => sql.match(/'(?:''|[^'])*'|[^']+/g).map((trecho) => trecho.startsWith("'")
  ? trecho : trecho.replace(/["`\s]/g, "").toLowerCase()).join("");
const normalizarPadrao = (valor) => valor === null ? null : normalizarSql(String(valor)).replace(/^true$/, "1").replace(/^false$/, "0");

export function lerEstrutura(banco) {
  return banco.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('_cf_METADATA', 'd1_migrations') ORDER BY name").all().map(({ name, sql }) => ({
    nome: name,
    colunas: banco.prepare(`PRAGMA table_info(${identificador(name)})`).all().map((coluna) => ({
      nome: coluna.name, tipo: coluna.type.toUpperCase(), obrigatoria: Boolean(coluna.notnull || (coluna.pk && coluna.type.toUpperCase() === "INTEGER")),
      padrao: normalizarPadrao(coluna.dflt_value), primaria: coluna.pk,
    })),
    estrangeiras: banco.prepare(`PRAGMA foreign_key_list(${identificador(name)})`).all()
      .map(({ table, from, to, on_update, on_delete, match }) => JSON.stringify([table, from, to, on_update, on_delete, match])).sort(),
    indices: banco.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL ORDER BY name").all(name)
      .map((indice) => ({ nome: indice.name, sql: normalizarSql(indice.sql) })),
    // considera iguais as restrições com ou sem o nome da própria tabela
    verificacoes: (sql.match(/CHECK[^\n]+/gi) ?? []).map((trecho) => normalizarSql(trecho).replaceAll(`${name.toLowerCase()}.`, "")).sort(),
  }));
}

export function conferirEstrutura(esperada, atual) {
  const erros = [];
  for (const tabela of esperada) {
    const existente = atual.find((item) => item.nome === tabela.nome);
    if (!existente) { erros.push(`Tabela ausente: ${tabela.nome}`); continue; }
    for (const coluna of tabela.colunas) {
      if (JSON.stringify(existente.colunas.find((item) => item.nome === coluna.nome)) !== JSON.stringify(coluna)) {
        erros.push(`Coluna incompatível: ${tabela.nome}.${coluna.nome}`);
      }
    }
    for (const indice of tabela.indices) {
      if (!existente.indices.some((item) => item.nome === indice.nome && item.sql === indice.sql)) erros.push(`Índice incompatível: ${indice.nome}`);
    }
    for (const campo of ["estrangeiras", "verificacoes"]) {
      if (JSON.stringify(existente[campo]) !== JSON.stringify(tabela[campo])) erros.push(`Restrições incompatíveis: ${tabela.nome} (${campo})`);
    }
  }
  return erros;
}

export function planejarCompatibilidade(banco, migracoes) {
  const referencia = new DatabaseSync(":memory:");
  try {
    const possuiHistorico = banco.prepare("SELECT 1 FROM sqlite_master WHERE name = 'd1_migrations' AND type = 'table'").get();
    const aplicadas = new Set(possuiHistorico ? banco.prepare("SELECT name FROM d1_migrations").all().map((item) => item.name) : []);
    const atual = lerEstrutura(banco);
    let reconhecidas = [];
    let estruturaEsperada = [];
    for (const [indice, nome] of migracoesDaPrevia.entries()) {
      const migracao = migracoes.find((item) => item.nome === nome);
      if (!migracao) throw new Error(`Migração da prévia não encontrada: ${nome}`);
      referencia.exec(migracao.sql);
      estruturaEsperada = lerEstrutura(referencia);
      if (!conferirEstrutura(estruturaEsperada, atual).length) reconhecidas = migracoesDaPrevia.slice(0, indice + 1);
    }
    const registrar = reconhecidas.filter((nome) => !aplicadas.has(nome));
    if (registrar.includes("0003_reclassificar_mapa_2026.sql")) {
      const turmas = banco.prepare(`SELECT COUNT(*) AS total FROM turmas_atividades
        WHERE chave_importacao LIKE 'pdf2026:turma:%' AND tipo = 'outro' AND nome <> 'Reforço'`).get().total;
      const ensalamentos = banco.prepare(`SELECT COUNT(*) AS total FROM ensalamentos
        WHERE chave_importacao LIKE 'pdf2026:ensalamento:%' AND tipo = 'outro'
        AND turma_atividade_id IN (SELECT id FROM turmas_atividades WHERE chave_importacao LIKE 'pdf2026:turma:%' AND nome <> 'Reforço')`).get().total;
      if (turmas || ensalamentos) throw new Error("A reclassificação 0003 ainda não está refletida nos dados. O histórico não foi alterado.");
    }
    if (registrar.includes("0004_sistema_eventos.sql") && banco.prepare(`SELECT COUNT(*) AS total FROM conteudos
      WHERE tipo = 'eventos' AND json_valid(dados_json) = 1 AND json_extract(dados_json, '$.exemplo') = 1 AND publicado <> 0`).get().total) {
      throw new Error("A ocultação de exemplos da migração 0004 ainda não está refletida nos dados. O histórico não foi alterado.");
    }
    // Ensaia as migrações restantes no backup antes de alterar o histórico real.
    banco.exec("SAVEPOINT conferir_migracoes");
    try {
      for (const migracao of migracoes) {
        if (!aplicadas.has(migracao.nome) && !registrar.includes(migracao.nome)) banco.exec(migracao.sql);
      }
      for (const migracao of migracoes.filter((item) => !migracoesDaPrevia.includes(item.nome))) referencia.exec(migracao.sql);
      estruturaEsperada = lerEstrutura(referencia);
      const diferencas = conferirEstrutura(estruturaEsperada, lerEstrutura(banco));
      if (diferencas.length) throw new Error(diferencas.join("\n"));
    } catch (erro) {
      const diferencas = conferirEstrutura(estruturaEsperada, atual);
      throw new Error(`O banco não é compatível com as migrações: ${erro.message}${diferencas.length ? '\n' + diferencas.join('\n') : ''}`, { cause: erro });
    } finally {
      banco.exec("ROLLBACK TO conferir_migracoes; RELEASE conferir_migracoes");
    }
    return { registrar, estruturaEsperada };
  } finally {
    referencia.close();
  }
}
