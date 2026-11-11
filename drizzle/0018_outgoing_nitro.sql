CREATE TABLE `historico_salas_turma` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`turma_atividade_id` integer NOT NULL,
	`sala` text NOT NULL,
	`turno` text NOT NULL,
	`vinculado_em` text NOT NULL,
	`encerrado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`turma_atividade_id`) REFERENCES `turmas_atividades`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `historico_salas_turma_idx` ON `historico_salas_turma` (`turma_atividade_id`);--> statement-breakpoint
ALTER TABLE `representantes` ADD `contatos_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `representantes` ADD `contatos_publicos` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `representantes` ADD `destituido_em` text;--> statement-breakpoint
ALTER TABLE `turmas_atividades` ADD `horario_inicial` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas_atividades` ADD `horario_final` text DEFAULT '' NOT NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS salas_sem_conflito_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS salas_sem_conflito_update;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS salas_por_horario_insert
  BEFORE INSERT ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e
      JOIN turmas_atividades existente ON existente.id = e.turma_atividade_id
      JOIN turmas_atividades nova ON nova.id = NEW.turma_atividade_id
      WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')
        AND COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01')
        AND (existente.horario_inicial = '' OR nova.horario_inicial = ''
          OR (existente.horario_inicial < nova.horario_final AND nova.horario_inicial < existente.horario_final))
    );
  END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS salas_por_horario_update
  BEFORE UPDATE ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e
      JOIN turmas_atividades existente ON existente.id = e.turma_atividade_id
      JOIN turmas_atividades nova ON nova.id = NEW.turma_atividade_id
      WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')
        AND COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01')
        AND (existente.horario_inicial = '' OR nova.horario_inicial = ''
          OR (existente.horario_inicial < nova.horario_final AND nova.horario_inicial < existente.horario_final))
    );
  END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS guardar_sala_update
    BEFORE UPDATE ON ensalamentos
    WHEN OLD.local_id IS NOT NULL AND (OLD.local_id IS NOT NEW.local_id OR OLD.turma_atividade_id <> NEW.turma_atividade_id OR OLD.turno <> NEW.turno)
    BEGIN
      INSERT INTO historico_salas_turma (turma_atividade_id, sala, turno, vinculado_em)
      SELECT OLD.turma_atividade_id, COALESCE(NULLIF(l.nome, ''), l.numero), OLD.turno, OLD.criado_em
      FROM locais_colegio l WHERE l.id = OLD.local_id;
    END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS guardar_sala_delete
    BEFORE DELETE ON ensalamentos
    WHEN OLD.local_id IS NOT NULL
    BEGIN
      INSERT INTO historico_salas_turma (turma_atividade_id, sala, turno, vinculado_em)
      SELECT OLD.turma_atividade_id, COALESCE(NULLIF(l.nome, ''), l.numero), OLD.turno, OLD.criado_em
      FROM locais_colegio l WHERE l.id = OLD.local_id;
    END;
