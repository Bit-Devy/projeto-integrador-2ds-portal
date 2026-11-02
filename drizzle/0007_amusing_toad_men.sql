-- guarda os limites por navegador sem misturar com as mensagens
CREATE TABLE IF NOT EXISTS `limites_navegador` (
	`navegador` text NOT NULL,
	`acao` text NOT NULL,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`expira_em` integer NOT NULL,
	`bloqueado_ate` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`navegador`, `acao`)
);
--> statement-breakpoint
-- retira do catálogo a documentação interna que não é publicada
DELETE FROM conteudos WHERE tipo = 'documentos'
  AND json_valid(dados_json) = 1
  AND json_extract(dados_json, '$.link') LIKE '/documentacao/%';
