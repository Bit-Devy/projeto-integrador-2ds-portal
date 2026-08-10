-- corrige o tipo das turmas importadas
UPDATE `turmas_atividades`
SET `tipo` = 'aula_regular', `atualizado_em` = CURRENT_TIMESTAMP
WHERE `chave_importacao` LIKE 'pdf2026:turma:%'
  AND `tipo` = 'outro'
  AND `nome` <> 'Reforço';
--> statement-breakpoint
-- corrige o tipo dos ensalamentos importados
UPDATE `ensalamentos`
SET `tipo` = 'aula_regular', `atualizado_em` = CURRENT_TIMESTAMP
WHERE `chave_importacao` LIKE 'pdf2026:ensalamento:%'
  AND `tipo` = 'outro'
  AND `turma_atividade_id` IN (
    -- busca as turmas importadas que não são reforço
    SELECT `id` FROM `turmas_atividades`
    WHERE `chave_importacao` LIKE 'pdf2026:turma:%'
      AND `nome` <> 'Reforço'
  );
