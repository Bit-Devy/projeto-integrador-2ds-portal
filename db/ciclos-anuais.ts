// arquiva mandatos e libera salas quando o ano escolar termina sem apagar o histórico
import { getD1 } from ".";
import { anoDoPortal, dataDoPortal } from "../app/conteudo/periodos";

export async function prepararAnosEscolares(d1 = getD1()) {
  for (const tabela of ["turmas_atividades", "representantes"]) {
    const colunas = await d1.prepare(`PRAGMA table_info(${tabela})`).all<{ name: string }>();
    if (!colunas.results.some((coluna) => coluna.name === "ano")) {
      try { await d1.prepare(`ALTER TABLE ${tabela} ADD COLUMN ano INTEGER NOT NULL DEFAULT 2026`).run(); }
      catch (erro) { if (!(erro instanceof Error) || !/duplicate column name/i.test(erro.message)) throw erro; }
      // reconhece as datas antigas antes de trocar a forma de cadastrar os anos
      if (tabela === "turmas_atividades") await d1.prepare("UPDATE turmas_atividades SET ano = CAST(COALESCE(NULLIF(substr(inicio_validade, 1, 4), ''), substr(criado_em, 1, 4), '2026') AS INTEGER)").run();
      else await d1.prepare("UPDATE representantes SET ano = COALESCE((SELECT ano FROM turmas_atividades t WHERE t.id = representantes.turma_atividade_id), CAST(COALESCE(NULLIF(substr(inicio_mandato, 1, 4), ''), substr(criado_em, 1, 4), '2026') AS INTEGER))").run();
    }
  }
  await d1.prepare("UPDATE campeonatos SET ano = CAST(COALESCE(NULLIF(substr(data_inicial, 1, 4), ''), substr(criado_em, 1, 4)) AS INTEGER) WHERE ano IS NULL").run();
}

// adiciona os horários e os dados de mandato nos bancos já usados pelo portal
export async function prepararDetalhesEscolares(d1 = getD1()) {
  const tabelas = {
    turmas_atividades: { horario_inicial: "TEXT NOT NULL DEFAULT ''", horario_final: "TEXT NOT NULL DEFAULT ''", dias_semana: "INTEGER NOT NULL DEFAULT 127" },
    representantes: { contatos_json: "TEXT NOT NULL DEFAULT '[]'", contatos_publicos: "INTEGER NOT NULL DEFAULT 0", destituido_em: "TEXT" },
  };
  for (const [tabela, campos] of Object.entries(tabelas)) {
    const colunas = await d1.prepare(`PRAGMA table_info(${tabela})`).all<{ name: string }>();
    for (const [nome, definicao] of Object.entries(campos)) {
      if (colunas.results.some((coluna) => coluna.name === nome)) continue;
      try { await d1.prepare(`ALTER TABLE ${tabela} ADD COLUMN ${nome} ${definicao}`).run(); }
      catch (erro) { if (!(erro instanceof Error) || !/duplicate column name/i.test(erro.message)) throw erro; }
    }
  }
}

// executa a virada também no primeiro acesso do novo ano sem depender de um agendador
export async function arquivarCiclosEscolares(ano = anoDoPortal(), d1 = getD1()) {
  await d1.batch([
    d1.prepare("UPDATE turmas_atividades SET ativo = 0, publicado = 0, atualizado_em = CURRENT_TIMESTAMP WHERE ano <> ? AND (ativo = 1 OR publicado = 1)").bind(ano),
    d1.prepare("UPDATE ensalamentos SET ativo = 0, publicado = 0, atualizado_em = CURRENT_TIMESTAMP WHERE (ativo = 1 OR publicado = 1) AND turma_atividade_id IN (SELECT id FROM turmas_atividades WHERE ativo = 0)") ,
    d1.prepare(`UPDATE representantes SET ativo = 0, publicado = 0, arquivado_em = COALESCE(arquivado_em, CURRENT_TIMESTAMP), atualizado_em = CURRENT_TIMESTAMP
      WHERE (ativo = 1 OR publicado = 1) AND (ano <> ? OR (fim_mandato <> '' AND fim_mandato < ?)
      OR EXISTS (SELECT 1 FROM turmas_atividades t WHERE t.id = turma_atividade_id AND (t.ativo = 0 OR t.ano <> representantes.ano)))`).bind(ano, dataDoPortal()),
  ]);
}
