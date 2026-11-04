ALTER TABLE `acessos_painel` ADD `login` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `acessos_painel` ADD `login_ambiente` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `acessos_painel_login_uq` ON `acessos_painel` (`login`) WHERE "acessos_painel"."login" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX `acessos_painel_login_ambiente_uq` ON `acessos_painel` (`login_ambiente`) WHERE "acessos_painel"."login_ambiente" = 1;