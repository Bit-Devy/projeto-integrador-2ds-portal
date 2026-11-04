CREATE TABLE `acoes_painel` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entrada_id` integer NOT NULL,
	`resumo` text NOT NULL,
	`recurso` text NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`entrada_id`) REFERENCES `entradas_painel`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `acoes_painel_entrada_idx` ON `acoes_painel` (`entrada_id`,`id`);--> statement-breakpoint
CREATE TABLE `entradas_painel` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`acesso_id` integer NOT NULL,
	`nome` text NOT NULL,
	`cargo` text NOT NULL,
	`entrada_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entradas_painel_data_idx` ON `entradas_painel` (`entrada_em`,`id`);