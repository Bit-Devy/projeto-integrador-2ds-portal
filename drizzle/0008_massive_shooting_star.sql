ALTER TABLE `turmas_atividades` ADD `nivel_ensino` text DEFAULT 'medio' NOT NULL;
--> statement-breakpoint
-- identifica o nível das turmas que já estavam no banco
UPDATE turmas_atividades SET nivel_ensino = CASE
  WHEN CAST(serie AS INTEGER) BETWEEN 6 AND 9 THEN 'fundamental'
  WHEN tipo NOT IN ('aula_regular', 'curso_tecnico') THEN 'outro' ELSE 'medio' END;

--> statement-breakpoint

  CREATE TRIGGER IF NOT EXISTS salas_sem_conflito_insert
  BEFORE INSERT ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')
        AND COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01')
    );
  END
;

--> statement-breakpoint

  CREATE TRIGGER IF NOT EXISTS salas_sem_conflito_update
  BEFORE UPDATE ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')
        AND COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01')
    );
  END
;
