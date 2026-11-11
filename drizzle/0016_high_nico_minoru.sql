CREATE TABLE `calendarios_escolares` (
	`ano` integer NOT NULL,
	`modalidade` text NOT NULL,
	`dados_json` text NOT NULL,
	`publicado` integer DEFAULT false NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`ano`, `modalidade`),
	CONSTRAINT "calendarios_modalidade_ck" CHECK("calendarios_escolares"."modalidade" IN ('anual', 'semestral'))
);
--> statement-breakpoint
CREATE TABLE `modulos_portal` (
	`chave` text PRIMARY KEY NOT NULL,
	`dados_json` text NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
