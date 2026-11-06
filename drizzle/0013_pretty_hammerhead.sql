CREATE TABLE `permissoes_cargos` (
	`cargo` text PRIMARY KEY NOT NULL,
	`editar_json` text NOT NULL,
	`consultar_json` text NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
