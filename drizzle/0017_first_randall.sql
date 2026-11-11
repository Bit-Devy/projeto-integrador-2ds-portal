ALTER TABLE `representantes` ADD `ano` integer DEFAULT 2026 NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas_atividades` ADD `ano` integer DEFAULT 2026 NOT NULL;
--> statement-breakpoint
UPDATE turmas_atividades SET ano = CAST(COALESCE(NULLIF(substr(inicio_validade, 1, 4), ''), substr(criado_em, 1, 4), '2026') AS INTEGER);
--> statement-breakpoint
UPDATE representantes SET ano = COALESCE((SELECT ano FROM turmas_atividades t WHERE t.id = representantes.turma_atividade_id), CAST(COALESCE(NULLIF(substr(inicio_mandato, 1, 4), ''), substr(criado_em, 1, 4), '2026') AS INTEGER));

--> statement-breakpoint
UPDATE campeonatos SET ano = CAST(COALESCE(NULLIF(substr(data_inicial, 1, 4), ''), substr(criado_em, 1, 4)) AS INTEGER) WHERE ano IS NULL;
