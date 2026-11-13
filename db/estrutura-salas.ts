// confere os horários e procura um dia de aula dentro da validade comum
export function condicaoConflitoSala(ocupacao: string, novaOcupacao: string, turma: string, novaTurma: string) {
  const inicio = `max(COALESCE(NULLIF(${ocupacao}.inicio_validade, ''), '0001-01-01'), COALESCE(NULLIF(${novaOcupacao}.inicio_validade, ''), '0001-01-01'))`;
  const fim = `min(COALESCE(NULLIF(${ocupacao}.fim_validade, ''), '9999-12-31'), COALESCE(NULLIF(${novaOcupacao}.fim_validade, ''), '9999-12-31'))`;
  const diasEmComum = `(${turma}.dias_semana & ${novaTurma}.dias_semana)`;
  // o primeiro bit representa segunda e a busca cobre uma semana a partir do início comum
  const bitDoDia = `(1 << ((CAST(strftime('%w', periodo.inicio) AS INTEGER) + 6 + dias.value) % 7))`;
  return `(${turma}.horario_inicial = '' OR ${novaTurma}.horario_inicial = ''
      OR (${turma}.horario_inicial < ${novaTurma}.horario_final AND ${novaTurma}.horario_inicial < ${turma}.horario_final))
    AND ${diasEmComum} <> 0
    AND EXISTS (
      SELECT 1 FROM (SELECT ${inicio} AS inicio, ${fim} AS fim) periodo
      CROSS JOIN json_each('[0,1,2,3,4,5,6]') dias
      WHERE dias.value <= julianday(periodo.fim) - julianday(periodo.inicio)
        AND (${diasEmComum} & ${bitDoDia}) <> 0
    )`;
}

// impede ocupações simultâneas mesmo em gravações que chegam juntas
export const comandosProtecaoSalas = ["INSERT", "UPDATE"].map((operacao) => `
  CREATE TRIGGER IF NOT EXISTS salas_por_dia_${operacao.toLowerCase()}
  BEFORE ${operacao} ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e
      JOIN turmas_atividades existente ON existente.id = e.turma_atividade_id
      JOIN turmas_atividades nova ON nova.id = NEW.turma_atividade_id
      WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND ${condicaoConflitoSala("e", "NEW", "existente", "nova").replaceAll("\n", "\n    ")}
    );
  END
`);

// salva o nome da sala quando um vínculo seria sobrescrito ou removido
export const comandosHistoricoSalas = [
  `CREATE TABLE IF NOT EXISTS historico_salas_turma (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    turma_atividade_id INTEGER NOT NULL REFERENCES turmas_atividades(id) ON DELETE CASCADE ON UPDATE CASCADE,
    sala TEXT NOT NULL, turno TEXT NOT NULL, vinculado_em TEXT NOT NULL,
    encerrado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS historico_salas_turma_idx ON historico_salas_turma (turma_atividade_id)",
  ...["UPDATE", "DELETE"].map((operacao) => `CREATE TRIGGER IF NOT EXISTS guardar_sala_${operacao.toLowerCase()}
    BEFORE ${operacao} ON ensalamentos
    WHEN OLD.local_id IS NOT NULL ${operacao === "UPDATE" ? "AND (OLD.local_id IS NOT NEW.local_id OR OLD.turma_atividade_id <> NEW.turma_atividade_id OR OLD.turno <> NEW.turno)" : ""}
    BEGIN
      INSERT INTO historico_salas_turma (turma_atividade_id, sala, turno, vinculado_em)
      SELECT OLD.turma_atividade_id, COALESCE(NULLIF(l.nome, ''), l.numero), OLD.turno, OLD.criado_em
      FROM locais_colegio l WHERE l.id = OLD.local_id;
    END`),
];
