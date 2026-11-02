-- guarda a versão atual do estatuto e do regimento
CREATE TABLE `documentos_oficiais` (
	`chave` text PRIMARY KEY NOT NULL,
	`titulo` text NOT NULL,
	`arquivo_url` text NOT NULL,
	`versao` text DEFAULT '' NOT NULL,
	`atualizado_em` text DEFAULT '' NOT NULL
);
