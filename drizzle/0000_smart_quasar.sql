-- cria a tabela de conteúdos
CREATE TABLE `conteudos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`titulo` text NOT NULL,
	`dados_json` text NOT NULL,
	`publicado` integer DEFAULT true NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
-- cria o índice dos tipos de conteúdo
CREATE INDEX `conteudos_tipo_idx` ON `conteudos` (`tipo`);--> statement-breakpoint
-- cria o índice de publicação dos conteúdos
CREATE INDEX `conteudos_publicado_idx` ON `conteudos` (`publicado`);--> statement-breakpoint
-- cria a tabela de mensagens
CREATE TABLE `mensagens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`turma` text NOT NULL,
	`assunto` text NOT NULL,
	`titulo` text NOT NULL,
	`mensagem` text NOT NULL,
	`anonimo` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'nova' NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
-- cria o índice dos estados das mensagens
CREATE INDEX `mensagens_status_idx` ON `mensagens` (`status`);
