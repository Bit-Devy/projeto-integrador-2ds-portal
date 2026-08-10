-- adiciona o tipo de contato nas mensagens
ALTER TABLE `mensagens` ADD `tipo_contato` text;--> statement-breakpoint
-- adiciona o contato nas mensagens
ALTER TABLE `mensagens` ADD `contato` text;
