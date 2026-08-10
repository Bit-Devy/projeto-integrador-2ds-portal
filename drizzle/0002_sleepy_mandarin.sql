-- cria a tabela de cargas iniciais
CREATE TABLE `cargas_iniciais` (
	`chave` text PRIMARY KEY NOT NULL,
	`aplicado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
-- cria a tabela de categorias do mapa
CREATE TABLE `categorias_mapa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grupo` text NOT NULL,
	`slug` text NOT NULL,
	`nome` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
-- impede categorias repetidas no mesmo grupo
CREATE UNIQUE INDEX `categorias_mapa_grupo_slug_uq` ON `categorias_mapa` (`grupo`,`slug`);--> statement-breakpoint
-- cria o índice dos filtros de categoria
CREATE INDEX `categorias_mapa_grupo_ativo_idx` ON `categorias_mapa` (`grupo`,`ativo`);--> statement-breakpoint
-- cria a tabela de ensalamentos
CREATE TABLE `ensalamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chave_importacao` text,
	`turma_atividade_id` integer NOT NULL,
	`local_id` integer,
	`turno` text NOT NULL,
	`tipo` text NOT NULL,
	`observacoes` text DEFAULT '' NOT NULL,
	`inicio_validade` text DEFAULT '' NOT NULL,
	`fim_validade` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`publicado` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`turma_atividade_id`) REFERENCES `turmas_atividades`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`local_id`) REFERENCES `locais_colegio`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
-- impede chaves de ensalamento repetidas
CREATE UNIQUE INDEX `ensalamentos_chave_importacao_uq` ON `ensalamentos` (`chave_importacao`);--> statement-breakpoint
-- cria o índice das turmas dos ensalamentos
CREATE INDEX `ensalamentos_turma_idx` ON `ensalamentos` (`turma_atividade_id`);--> statement-breakpoint
-- cria o índice dos locais dos ensalamentos
CREATE INDEX `ensalamentos_local_idx` ON `ensalamentos` (`local_id`);--> statement-breakpoint
-- cria o índice dos filtros de ensalamento
CREATE INDEX `ensalamentos_filtros_idx` ON `ensalamentos` (`turno`,`tipo`);--> statement-breakpoint
-- cria o índice de publicação dos ensalamentos
CREATE INDEX `ensalamentos_publicacao_idx` ON `ensalamentos` (`publicado`,`ativo`);--> statement-breakpoint
-- cria a tabela de locais do colégio
CREATE TABLE `locais_colegio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chave_importacao` text,
	`nome` text DEFAULT '' NOT NULL,
	`nome_normalizado` text DEFAULT '' NOT NULL,
	`numero` text DEFAULT '' NOT NULL,
	`numero_normalizado` text DEFAULT '' NOT NULL,
	`nome_alternativo` text DEFAULT '' NOT NULL,
	`nome_alternativo_normalizado` text DEFAULT '' NOT NULL,
	`tipo` text DEFAULT 'outro' NOT NULL,
	`ala` text DEFAULT '' NOT NULL,
	`andar` text DEFAULT '' NOT NULL,
	`bloco` text DEFAULT '' NOT NULL,
	`setor` text DEFAULT '' NOT NULL,
	`corredor` text DEFAULT '' NOT NULL,
	`referencia` text DEFAULT '' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`instrucoes` text DEFAULT '' NOT NULL,
	`observacoes` text DEFAULT '' NOT NULL,
	`acessibilidade` text DEFAULT '' NOT NULL,
	`horario` text DEFAULT '' NOT NULL,
	`imagem_url` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`publicado` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
-- impede chaves de local repetidas
CREATE UNIQUE INDEX `locais_colegio_chave_importacao_uq` ON `locais_colegio` (`chave_importacao`);--> statement-breakpoint
-- cria o índice dos nomes dos locais
CREATE INDEX `locais_colegio_nome_idx` ON `locais_colegio` (`nome_normalizado`);--> statement-breakpoint
-- cria o índice dos números dos locais
CREATE INDEX `locais_colegio_numero_idx` ON `locais_colegio` (`numero_normalizado`);--> statement-breakpoint
-- cria o índice de publicação dos locais
CREATE INDEX `locais_colegio_publicacao_idx` ON `locais_colegio` (`publicado`,`ativo`);--> statement-breakpoint
-- cria a tabela de turmas e atividades
CREATE TABLE `turmas_atividades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chave_importacao` text,
	`nome` text NOT NULL,
	`nome_normalizado` text NOT NULL,
	`aliases` text DEFAULT '' NOT NULL,
	`aliases_normalizados` text DEFAULT '' NOT NULL,
	`turno` text NOT NULL,
	`tipo` text NOT NULL,
	`curso` text DEFAULT '' NOT NULL,
	`serie` text DEFAULT '' NOT NULL,
	`turma` text DEFAULT '' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`observacoes` text DEFAULT '' NOT NULL,
	`inicio_validade` text DEFAULT '' NOT NULL,
	`fim_validade` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`publicado` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
-- impede chaves de turma repetidas
CREATE UNIQUE INDEX `turmas_atividades_chave_importacao_uq` ON `turmas_atividades` (`chave_importacao`);--> statement-breakpoint
-- cria o índice dos nomes das turmas
CREATE INDEX `turmas_atividades_nome_idx` ON `turmas_atividades` (`nome_normalizado`);--> statement-breakpoint
-- cria o índice dos filtros de turma
CREATE INDEX `turmas_atividades_filtros_idx` ON `turmas_atividades` (`turno`,`tipo`);--> statement-breakpoint
-- cria o índice de publicação das turmas
CREATE INDEX `turmas_atividades_publicacao_idx` ON `turmas_atividades` (`publicado`,`ativo`);
