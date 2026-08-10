-- remove da publicação somente exemplos antigos, sem apagar nenhum conteúdo
UPDATE `conteudos`
SET `publicado` = 0, `atualizado_em` = CURRENT_TIMESTAMP
WHERE `tipo` = 'eventos'
  AND json_valid(`dados_json`) = 1
  AND json_extract(`dados_json`, '$.exemplo') = 1;
--> statement-breakpoint
CREATE TABLE `eventos_internos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`titulo` text NOT NULL,
	`subtitulo` text DEFAULT '' NOT NULL,
	`descricao_curta` text DEFAULT '' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`categoria` text DEFAULT '' NOT NULL,
	`imagem_capa_url` text DEFAULT '' NOT NULL,
	`data_inicial` text DEFAULT '' NOT NULL,
	`data_final` text DEFAULT '' NOT NULL,
	`horario_inicial` text DEFAULT '' NOT NULL,
	`horario_final` text DEFAULT '' NOT NULL,
	`local` text DEFAULT '' NOT NULL,
	`turno` text DEFAULT '' NOT NULL,
	`publico_destinado` text DEFAULT '' NOT NULL,
	`organizacao` text DEFAULT '' NOT NULL,
	`programacao` text DEFAULT '' NOT NULL,
	`orientacoes` text DEFAULT '' NOT NULL,
	`link_externo` text DEFAULT '' NOT NULL,
	`observacoes_publicas` text DEFAULT '' NOT NULL,
	`observacoes_internas` text DEFAULT '' NOT NULL,
	`situacao` text DEFAULT 'proximo' NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`arquivado_em` text,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `eventos_internos_situacao_ck` CHECK(`situacao` IN ('proximo', 'em_andamento', 'encerrado', 'adiado', 'cancelado'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eventos_internos_slug_uq` ON `eventos_internos` (`slug`);
--> statement-breakpoint
CREATE INDEX `eventos_internos_publicacao_idx` ON `eventos_internos` (`publicado`,`ativo`,`data_inicial`);
--> statement-breakpoint
CREATE INDEX `eventos_internos_filtros_idx` ON `eventos_internos` (`situacao`,`categoria`,`turno`);
--> statement-breakpoint
CREATE TABLE `documentos_eventos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evento_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`tipo` text DEFAULT 'anexo' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`arquivo_chave` text DEFAULT '' NOT NULL,
	`arquivo_url` text DEFAULT '' NOT NULL,
	`link_externo` text DEFAULT '' NOT NULL,
	`data` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`evento_id`) REFERENCES `eventos_internos`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `documentos_eventos_evento_idx` ON `documentos_eventos` (`evento_id`,`ordem`);
--> statement-breakpoint
CREATE INDEX `documentos_eventos_publicacao_idx` ON `documentos_eventos` (`publicado`,`ativo`);
--> statement-breakpoint
CREATE TABLE `campeonatos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`nome` text NOT NULL,
	`edicao` text DEFAULT '' NOT NULL,
	`ano` integer,
	`modalidade` text NOT NULL,
	`categoria` text DEFAULT '' NOT NULL,
	`turno` text DEFAULT '' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`regulamento` text DEFAULT '' NOT NULL,
	`organizacao` text DEFAULT '' NOT NULL,
	`locais` text DEFAULT '' NOT NULL,
	`observacoes_publicas` text DEFAULT '' NOT NULL,
	`observacoes_internas` text DEFAULT '' NOT NULL,
	`formato` text DEFAULT 'mata_mata' NOT NULL,
	`situacao` text DEFAULT 'proximo' NOT NULL,
	`fase_atual` text DEFAULT '' NOT NULL,
	`data_inicial` text DEFAULT '' NOT NULL,
	`data_final` text DEFAULT '' NOT NULL,
	`imagem_capa_url` text DEFAULT '' NOT NULL,
	`chave_publicada` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`arquivado_em` text,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `campeonatos_formato_ck` CHECK(`formato` IN ('mata_mata', 'personalizada', 'grupos', 'pontos_corridos', 'grupos_mata_mata')),
	CONSTRAINT `campeonatos_situacao_ck` CHECK(`situacao` IN ('proximo', 'em_andamento', 'encerrado', 'adiado', 'cancelado'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campeonatos_slug_uq` ON `campeonatos` (`slug`);
--> statement-breakpoint
CREATE INDEX `campeonatos_publicacao_idx` ON `campeonatos` (`publicado`,`ativo`,`data_inicial`);
--> statement-breakpoint
CREATE INDEX `campeonatos_filtros_idx` ON `campeonatos` (`situacao`,`ano`,`modalidade`,`categoria`,`turno`);
--> statement-breakpoint
CREATE TABLE `participantes_campeonato` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campeonato_id` integer NOT NULL,
	`turma_atividade_id` integer,
	`nome` text NOT NULL,
	`nome_normalizado` text NOT NULL,
	`nome_exibicao` text DEFAULT '' NOT NULL,
	`apelido` text DEFAULT '' NOT NULL,
	`posicao_inicial` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`arquivado_em` text,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campeonato_id`) REFERENCES `campeonatos`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`turma_atividade_id`) REFERENCES `turmas_atividades`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `participantes_campeonato_campeonato_idx` ON `participantes_campeonato` (`campeonato_id`,`ativo`);
--> statement-breakpoint
CREATE INDEX `participantes_campeonato_nome_idx` ON `participantes_campeonato` (`nome_normalizado`);
--> statement-breakpoint
CREATE TABLE `fases_campeonato` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campeonato_id` integer NOT NULL,
	`nome` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`tipo` text DEFAULT 'eliminatoria' NOT NULL,
	`quantidade_jogos` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campeonato_id`) REFERENCES `campeonatos`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT `fases_campeonato_tipo_ck` CHECK(`tipo` IN ('eliminatoria', 'grupos', 'classificacao', 'terceiro_lugar', 'personalizada'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fases_campeonato_ordem_uq` ON `fases_campeonato` (`campeonato_id`,`ordem`);
--> statement-breakpoint
CREATE INDEX `fases_campeonato_publicacao_idx` ON `fases_campeonato` (`campeonato_id`,`publicado`,`ativo`);
--> statement-breakpoint
CREATE TABLE `partidas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campeonato_id` integer NOT NULL,
	`fase_id` integer NOT NULL,
	`rodada` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`participante_a_id` integer,
	`participante_b_id` integer,
	`participante_a_nome` text DEFAULT '' NOT NULL,
	`participante_b_nome` text DEFAULT '' NOT NULL,
	`placar_a` integer,
	`placar_b` integer,
	`vencedor_id` integer,
	`vencedor_nome` text DEFAULT '' NOT NULL,
	`forma_vitoria` text DEFAULT '' NOT NULL,
	`data` text DEFAULT '' NOT NULL,
	`horario` text DEFAULT '' NOT NULL,
	`local` text DEFAULT '' NOT NULL,
	`situacao` text DEFAULT 'data_a_definir' NOT NULL,
	`placar_publicado` integer DEFAULT 0 NOT NULL,
	`resumo` text DEFAULT '' NOT NULL,
	`destaques` text DEFAULT '' NOT NULL,
	`observacoes_publicas` text DEFAULT '' NOT NULL,
	`observacoes_internas` text DEFAULT '' NOT NULL,
	`proxima_partida_id` integer,
	`proxima_posicao` text DEFAULT '' NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`arquivado_em` text,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campeonato_id`) REFERENCES `campeonatos`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`fase_id`) REFERENCES `fases_campeonato`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`participante_a_id`) REFERENCES `participantes_campeonato`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`participante_b_id`) REFERENCES `participantes_campeonato`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`vencedor_id`) REFERENCES `participantes_campeonato`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`proxima_partida_id`) REFERENCES `partidas`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT `partidas_situacao_ck` CHECK(`situacao` IN ('agendada', 'em_andamento', 'encerrada', 'adiada', 'cancelada', 'wo', 'data_a_definir')),
	CONSTRAINT `partidas_proxima_posicao_ck` CHECK(`proxima_posicao` IN ('', 'a', 'b')),
	CONSTRAINT `partidas_placares_ck` CHECK((`placar_a` IS NULL OR `placar_a` >= 0) AND (`placar_b` IS NULL OR `placar_b` >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partidas_fase_ordem_uq` ON `partidas` (`fase_id`,`ordem`);
--> statement-breakpoint
CREATE INDEX `partidas_campeonato_idx` ON `partidas` (`campeonato_id`,`situacao`,`data`);
--> statement-breakpoint
CREATE INDEX `partidas_proxima_idx` ON `partidas` (`proxima_partida_id`);
--> statement-breakpoint
CREATE INDEX `partidas_publicacao_idx` ON `partidas` (`publicado`,`ativo`);
--> statement-breakpoint
CREATE TABLE `historico_resultados_partida` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`partida_id` integer NOT NULL,
	`resultado_anterior_json` text NOT NULL,
	`resultado_novo_json` text NOT NULL,
	`impacto_json` text DEFAULT '[]' NOT NULL,
	`motivo` text DEFAULT '' NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `historico_resultados_partida_partida_idx` ON `historico_resultados_partida` (`partida_id`,`criado_em`);
--> statement-breakpoint
CREATE TABLE `campeoes_campeonato` (
	`campeonato_id` integer PRIMARY KEY NOT NULL,
	`participante_id` integer,
	`nome` text NOT NULL,
	`definido_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campeonato_id`) REFERENCES `campeonatos`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`participante_id`) REFERENCES `participantes_campeonato`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `campeoes_campeonato_participante_idx` ON `campeoes_campeonato` (`participante_id`);
--> statement-breakpoint
CREATE TABLE `documentos_campeonato` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campeonato_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`tipo` text DEFAULT 'anexo' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`arquivo_chave` text DEFAULT '' NOT NULL,
	`arquivo_url` text DEFAULT '' NOT NULL,
	`link_externo` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campeonato_id`) REFERENCES `campeonatos`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `documentos_campeonato_campeonato_idx` ON `documentos_campeonato` (`campeonato_id`,`ordem`);
--> statement-breakpoint
CREATE TABLE `atualizacoes_campeonato` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campeonato_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`texto` text DEFAULT '' NOT NULL,
	`data` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campeonato_id`) REFERENCES `campeonatos`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `atualizacoes_campeonato_campeonato_idx` ON `atualizacoes_campeonato` (`campeonato_id`,`data`);
--> statement-breakpoint
CREATE TABLE `representantes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`turma_atividade_id` integer,
	`nome` text NOT NULL,
	`nome_exibicao` text DEFAULT '' NOT NULL,
	`nome_normalizado` text NOT NULL,
	`nivel_ensino` text NOT NULL,
	`serie` text NOT NULL,
	`turma` text NOT NULL,
	`turma_normalizada` text NOT NULL,
	`turno` text NOT NULL,
	`funcao` text NOT NULL,
	`inicio_mandato` text DEFAULT '' NOT NULL,
	`fim_mandato` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`observacao_publica` text DEFAULT '' NOT NULL,
	`observacao_interna` text DEFAULT '' NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`arquivado_em` text,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`turma_atividade_id`) REFERENCES `turmas_atividades`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT `representantes_turno_ck` CHECK(`turno` IN ('manha', 'tarde', 'noite')),
	CONSTRAINT `representantes_funcao_ck` CHECK(`funcao` IN ('titular', 'vice', 'suplente', 'outra'))
);
--> statement-breakpoint
CREATE INDEX `representantes_nome_idx` ON `representantes` (`nome_normalizado`);
--> statement-breakpoint
CREATE INDEX `representantes_turma_idx` ON `representantes` (`turma_normalizada`);
--> statement-breakpoint
CREATE INDEX `representantes_filtros_idx` ON `representantes` (`publicado`,`ativo`,`turno`,`nivel_ensino`,`serie`,`funcao`);
--> statement-breakpoint
CREATE TABLE `reunioes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`titulo` text NOT NULL,
	`tipo` text NOT NULL,
	`data` text DEFAULT '' NOT NULL,
	`horario_inicial` text DEFAULT '' NOT NULL,
	`horario_final` text DEFAULT '' NOT NULL,
	`local` text DEFAULT '' NOT NULL,
	`turno` text DEFAULT '' NOT NULL,
	`niveis_ensino` text DEFAULT '' NOT NULL,
	`descricao_curta` text DEFAULT '' NOT NULL,
	`responsaveis` text DEFAULT '' NOT NULL,
	`pauta` text DEFAULT '' NOT NULL,
	`pauta_interna` text DEFAULT '' NOT NULL,
	`discussoes` text DEFAULT '' NOT NULL,
	`resumo` text DEFAULT '' NOT NULL,
	`decisoes` text DEFAULT '' NOT NULL,
	`propostas` text DEFAULT '' NOT NULL,
	`encaminhamentos` text DEFAULT '' NOT NULL,
	`ata` text DEFAULT '' NOT NULL,
	`transcricao` text DEFAULT '' NOT NULL,
	`observacoes_publicas` text DEFAULT '' NOT NULL,
	`observacoes_internas` text DEFAULT '' NOT NULL,
	`quantidade_participantes_publicada` integer DEFAULT 0 NOT NULL,
	`situacao` text DEFAULT 'agendada' NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`arquivado_em` text,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `reunioes_tipo_ck` CHECK(`tipo` IN ('representantes', 'interna_gecep')),
	CONSTRAINT `reunioes_situacao_ck` CHECK(`situacao` IN ('agendada', 'em_andamento', 'encerrada', 'adiada', 'cancelada'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reunioes_slug_uq` ON `reunioes` (`slug`);
--> statement-breakpoint
CREATE INDEX `reunioes_publicacao_idx` ON `reunioes` (`publicado`,`ativo`,`data`);
--> statement-breakpoint
CREATE INDEX `reunioes_filtros_idx` ON `reunioes` (`tipo`,`situacao`,`turno`);
--> statement-breakpoint
CREATE TABLE `itens_reuniao` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reuniao_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`titulo` text DEFAULT '' NOT NULL,
	`conteudo` text DEFAULT '' NOT NULL,
	`responsaveis` text DEFAULT '' NOT NULL,
	`prazo` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reuniao_id`) REFERENCES `reunioes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `itens_reuniao_reuniao_idx` ON `itens_reuniao` (`reuniao_id`,`tipo`,`ordem`);
--> statement-breakpoint
CREATE TABLE `votacoes_reuniao` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reuniao_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`pergunta` text DEFAULT '' NOT NULL,
	`contexto` text DEFAULT '' NOT NULL,
	`abstencoes` integer DEFAULT 0 NOT NULL,
	`resultado` text DEFAULT '' NOT NULL,
	`decisao_final` text DEFAULT '' NOT NULL,
	`observacao_publica` text DEFAULT '' NOT NULL,
	`observacao_interna` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`interno` integer DEFAULT 1 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reuniao_id`) REFERENCES `reunioes`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT `votacoes_reuniao_abstencoes_ck` CHECK(`abstencoes` >= 0)
);
--> statement-breakpoint
CREATE INDEX `votacoes_reuniao_reuniao_idx` ON `votacoes_reuniao` (`reuniao_id`,`ordem`);
--> statement-breakpoint
CREATE TABLE `opcoes_votacao_reuniao` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`votacao_id` integer NOT NULL,
	`texto` text NOT NULL,
	`quantidade_votos` integer DEFAULT 0 NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`votacao_id`) REFERENCES `votacoes_reuniao`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT `opcoes_votacao_reuniao_votos_ck` CHECK(`quantidade_votos` >= 0)
);
--> statement-breakpoint
CREATE INDEX `opcoes_votacao_reuniao_votacao_idx` ON `opcoes_votacao_reuniao` (`votacao_id`,`ordem`);
--> statement-breakpoint
CREATE TABLE `documentos_reuniao` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reuniao_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`tipo` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`arquivo_chave` text DEFAULT '' NOT NULL,
	`arquivo_url` text DEFAULT '' NOT NULL,
	`link_externo` text DEFAULT '' NOT NULL,
	`data` text DEFAULT '' NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reuniao_id`) REFERENCES `reunioes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `documentos_reuniao_reuniao_idx` ON `documentos_reuniao` (`reuniao_id`,`tipo`,`ordem`);
--> statement-breakpoint
CREATE TABLE `presencas_reuniao` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reuniao_id` integer NOT NULL,
	`representante_id` integer,
	`nome_snapshot` text NOT NULL,
	`nivel_ensino_snapshot` text DEFAULT '' NOT NULL,
	`serie_snapshot` text DEFAULT '' NOT NULL,
	`turma_snapshot` text DEFAULT '' NOT NULL,
	`turma_normalizada_snapshot` text DEFAULT '' NOT NULL,
	`turno_snapshot` text DEFAULT '' NOT NULL,
	`funcao_snapshot` text DEFAULT '' NOT NULL,
	`situacao` text DEFAULT 'nao_informada' NOT NULL,
	`observacao_publica` text DEFAULT '' NOT NULL,
	`observacao_interna` text DEFAULT '' NOT NULL,
	`publicado` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`atualizado_em` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reuniao_id`) REFERENCES `reunioes`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`representante_id`) REFERENCES `representantes`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT `presencas_reuniao_situacao_ck` CHECK(`situacao` IN ('presente', 'ausente', 'justificada', 'nao_se_aplica', 'nao_informada'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presencas_reuniao_representante_uq` ON `presencas_reuniao` (`reuniao_id`,`representante_id`);
--> statement-breakpoint
CREATE INDEX `presencas_reuniao_filtros_idx` ON `presencas_reuniao` (`reuniao_id`,`situacao`,`turno_snapshot`,`nivel_ensino_snapshot`);
--> statement-breakpoint
-- preserva eventos reais cadastrados pelo painel antigo e ignora somente exemplos marcados
INSERT OR IGNORE INTO `eventos_internos` (
	`slug`, `titulo`, `descricao_curta`, `descricao`, `categoria`, `imagem_capa_url`,
	`data_inicial`, `horario_inicial`, `local`, `link_externo`, `situacao`, `publicado`, `ativo`
)
SELECT
	'evento-legado-' || `id`,
	COALESCE(NULLIF(json_extract(`dados_json`, '$.titulo'), ''), `titulo`),
	COALESCE(json_extract(`dados_json`, '$.descricao'), ''),
	COALESCE(json_extract(`dados_json`, '$.descricao'), ''),
	COALESCE(json_extract(`dados_json`, '$.categoria'), ''),
	COALESCE(json_extract(`dados_json`, '$.imagemUrl'), json_extract(`dados_json`, '$.imagem'), ''),
	CASE
		WHEN length(COALESCE(json_extract(`dados_json`, '$.data'), '')) = 10
		 AND substr(json_extract(`dados_json`, '$.data'), 5, 1) = '-'
		 AND substr(json_extract(`dados_json`, '$.data'), 8, 1) = '-'
		THEN json_extract(`dados_json`, '$.data') ELSE ''
	END,
	CASE
		WHEN json_extract(`dados_json`, '$.horario') GLOB '[0-2][0-9]:[0-5][0-9]*'
		THEN substr(json_extract(`dados_json`, '$.horario'), 1, 5)
		WHEN json_extract(`dados_json`, '$.horario') GLOB '[0-2][0-9]h[0-5][0-9]*'
		THEN substr(json_extract(`dados_json`, '$.horario'), 1, 2) || ':' || substr(json_extract(`dados_json`, '$.horario'), 4, 2)
		WHEN json_extract(`dados_json`, '$.horario') GLOB '[0-9]h[0-5][0-9]*'
		THEN '0' || substr(json_extract(`dados_json`, '$.horario'), 1, 1) || ':' || substr(json_extract(`dados_json`, '$.horario'), 3, 2)
		ELSE ''
	END,
	COALESCE(json_extract(`dados_json`, '$.local'), ''),
	COALESCE(json_extract(`dados_json`, '$.linkInscricao'), json_extract(`dados_json`, '$.link'), ''),
	CASE
		WHEN length(COALESCE(json_extract(`dados_json`, '$.data'), '')) = 10
		 AND json_extract(`dados_json`, '$.data') < date('now') THEN 'encerrado'
		ELSE 'proximo'
	END,
	`publicado`, 1
FROM `conteudos`
WHERE `tipo` = 'eventos'
	AND json_valid(`dados_json`) = 1
	AND COALESCE(json_extract(`dados_json`, '$.exemplo'), 0) <> 1;
