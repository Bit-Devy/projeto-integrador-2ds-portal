CREATE TABLE `acessos_painel` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cargo` text NOT NULL,
	`vaga` integer NOT NULL,
	`nome` text NOT NULL,
	`resumo` text NOT NULL,
	`sal` text NOT NULL,
	`busca` text NOT NULL,
	`versao` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "acessos_painel_vaga_ck" CHECK("acessos_painel"."vaga" >= 1 AND "acessos_painel"."vaga" <= CASE WHEN "acessos_painel"."cargo" = 'geral' THEN 3 ELSE 2 END)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acessos_painel_busca_unique` ON `acessos_painel` (`busca`);--> statement-breakpoint
CREATE UNIQUE INDEX `acessos_painel_cargo_vaga_uq` ON `acessos_painel` (`cargo`,`vaga`);--> statement-breakpoint
CREATE TABLE `auditoria_acessos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`autor_id` integer NOT NULL,
	`autor_nome` text NOT NULL,
	`acao` text NOT NULL,
	`cargo` text NOT NULL,
	`acesso_id` integer,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `eventos_internos` ADD `area_responsavel` text DEFAULT 'geral' NOT NULL;--> statement-breakpoint
ALTER TABLE `reunioes` ADD `area_responsavel` text DEFAULT 'geral' NOT NULL;