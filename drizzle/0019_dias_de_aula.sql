-- usa todos os dias para conservar a ocupação cadastrada
ALTER TABLE `turmas_atividades` ADD `dias_semana` integer DEFAULT 127 NOT NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS salas_por_horario_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS salas_por_horario_update;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS salas_por_dia_insert
  BEFORE INSERT ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e
      JOIN turmas_atividades existente ON existente.id = e.turma_atividade_id
      JOIN turmas_atividades nova ON nova.id = NEW.turma_atividade_id
      WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND (existente.horario_inicial = '' OR nova.horario_inicial = ''
          OR (existente.horario_inicial < nova.horario_final AND nova.horario_inicial < existente.horario_final))
        AND (existente.dias_semana & nova.dias_semana) <> 0
        AND EXISTS (
          SELECT 1 FROM (SELECT max(COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01'), COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')) AS inicio, min(COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31'), COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31')) AS fim) periodo
          CROSS JOIN json_each('[0,1,2,3,4,5,6]') dias
          WHERE dias.value <= julianday(periodo.fim) - julianday(periodo.inicio)
            AND ((existente.dias_semana & nova.dias_semana) & (1 << ((CAST(strftime('%w', periodo.inicio) AS INTEGER) + 6 + dias.value) % 7))) <> 0
        )
    );
  END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS salas_por_dia_update
  BEFORE UPDATE ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e
      JOIN turmas_atividades existente ON existente.id = e.turma_atividade_id
      JOIN turmas_atividades nova ON nova.id = NEW.turma_atividade_id
      WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND (existente.horario_inicial = '' OR nova.horario_inicial = ''
          OR (existente.horario_inicial < nova.horario_final AND nova.horario_inicial < existente.horario_final))
        AND (existente.dias_semana & nova.dias_semana) <> 0
        AND EXISTS (
          SELECT 1 FROM (SELECT max(COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01'), COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')) AS inicio, min(COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31'), COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31')) AS fim) periodo
          CROSS JOIN json_each('[0,1,2,3,4,5,6]') dias
          WHERE dias.value <= julianday(periodo.fim) - julianday(periodo.inicio)
            AND ((existente.dias_semana & nova.dias_semana) & (1 << ((CAST(strftime('%w', periodo.inicio) AS INTEGER) + 6 + dias.value) % 7))) <> 0
        )
    );
  END;
--> statement-breakpoint
-- publica os mandatos ativos sem alterar os contatos
UPDATE representantes SET publicado = 1 WHERE ativo = 1 AND arquivado_em IS NULL AND publicado = 0;
