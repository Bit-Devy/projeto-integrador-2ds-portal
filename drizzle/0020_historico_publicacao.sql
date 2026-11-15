ALTER TABLE `atualizacoes_campeonato` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendarios_escolares` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campeonatos` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `conteudos` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documentos_campeonato` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documentos_eventos` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documentos_reuniao` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `eventos_internos` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `itens_reuniao` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `presencas_reuniao` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `representantes` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `reunioes` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas_atividades` ADD `ja_publicado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `votacoes_reuniao` ADD `ja_publicado` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE conteudos SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1 OR COALESCE(json_extract(dados_json, '$.jaPublicada'), 0) = 1);
--> statement-breakpoint
UPDATE calendarios_escolares SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1);
--> statement-breakpoint
UPDATE eventos_internos SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1 OR arquivado_em IS NOT NULL);
--> statement-breakpoint
UPDATE campeonatos SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1 OR arquivado_em IS NOT NULL);
--> statement-breakpoint
UPDATE reunioes SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1 OR arquivado_em IS NOT NULL);
--> statement-breakpoint
UPDATE representantes SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1 OR arquivado_em IS NOT NULL);
--> statement-breakpoint
UPDATE turmas_atividades SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1 OR ativo = 0);
--> statement-breakpoint
UPDATE documentos_eventos SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND EXISTS (SELECT 1 FROM eventos_internos WHERE id = documentos_eventos.evento_id AND ja_publicado = 1);
--> statement-breakpoint
UPDATE documentos_campeonato SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND EXISTS (SELECT 1 FROM campeonatos WHERE id = documentos_campeonato.campeonato_id AND ja_publicado = 1);
--> statement-breakpoint
UPDATE atualizacoes_campeonato SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND EXISTS (SELECT 1 FROM campeonatos WHERE id = atualizacoes_campeonato.campeonato_id AND ja_publicado = 1);
--> statement-breakpoint
UPDATE documentos_reuniao SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND EXISTS (SELECT 1 FROM reunioes WHERE id = documentos_reuniao.reuniao_id AND ja_publicado = 1);
--> statement-breakpoint
UPDATE itens_reuniao SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND EXISTS (SELECT 1 FROM reunioes WHERE id = itens_reuniao.reuniao_id AND ja_publicado = 1);
--> statement-breakpoint
UPDATE votacoes_reuniao SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND interno = 0 AND EXISTS (SELECT 1 FROM reunioes WHERE id = votacoes_reuniao.reuniao_id AND ja_publicado = 1);
--> statement-breakpoint
UPDATE presencas_reuniao SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0 AND EXISTS (SELECT 1 FROM reunioes WHERE id = presencas_reuniao.reuniao_id AND ja_publicado = 1);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS conteudos_marca_publicacao_0 AFTER INSERT ON conteudos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE conteudos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS conteudos_marca_publicacao_1 AFTER UPDATE OF publicado ON conteudos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE conteudos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS conteudos_protege_publicacao BEFORE DELETE ON conteudos
      WHEN OLD.ja_publicado = 1 AND OLD.tipo NOT IN ('cardapios', 'membros', 'canais')
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS calendarios_escolares_marca_publicacao_0 AFTER INSERT ON calendarios_escolares
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE calendarios_escolares SET ja_publicado = 1 WHERE ano = NEW.ano AND modalidade = NEW.modalidade; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS calendarios_escolares_marca_publicacao_1 AFTER UPDATE OF publicado ON calendarios_escolares
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE calendarios_escolares SET ja_publicado = 1 WHERE ano = NEW.ano AND modalidade = NEW.modalidade; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS calendarios_escolares_protege_publicacao BEFORE DELETE ON calendarios_escolares
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS eventos_internos_marca_publicacao_0 AFTER INSERT ON eventos_internos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE eventos_internos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS eventos_internos_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON eventos_internos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE eventos_internos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS eventos_internos_protege_publicacao BEFORE DELETE ON eventos_internos
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS campeonatos_marca_publicacao_0 AFTER INSERT ON campeonatos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE campeonatos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS campeonatos_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON campeonatos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE campeonatos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS campeonatos_protege_publicacao BEFORE DELETE ON campeonatos
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS reunioes_marca_publicacao_0 AFTER INSERT ON reunioes
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE reunioes SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS reunioes_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON reunioes
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE reunioes SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS reunioes_protege_publicacao BEFORE DELETE ON reunioes
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS representantes_marca_publicacao_0 AFTER INSERT ON representantes
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE representantes SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS representantes_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON representantes
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE representantes SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS representantes_protege_publicacao BEFORE DELETE ON representantes
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS turmas_atividades_marca_publicacao_0 AFTER INSERT ON turmas_atividades
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE turmas_atividades SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS turmas_atividades_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON turmas_atividades
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1
        BEGIN UPDATE turmas_atividades SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS turmas_atividades_protege_publicacao BEFORE DELETE ON turmas_atividades
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_eventos_marca_publicacao_0 AFTER INSERT ON documentos_eventos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM eventos_internos WHERE id = NEW.evento_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE documentos_eventos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_eventos_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON documentos_eventos
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM eventos_internos WHERE id = NEW.evento_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE documentos_eventos SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_eventos_protege_publicacao BEFORE DELETE ON documentos_eventos
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_campeonato_marca_publicacao_0 AFTER INSERT ON documentos_campeonato
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM campeonatos WHERE id = NEW.campeonato_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE documentos_campeonato SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_campeonato_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON documentos_campeonato
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM campeonatos WHERE id = NEW.campeonato_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE documentos_campeonato SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_campeonato_protege_publicacao BEFORE DELETE ON documentos_campeonato
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS atualizacoes_campeonato_marca_publicacao_0 AFTER INSERT ON atualizacoes_campeonato
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM campeonatos WHERE id = NEW.campeonato_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE atualizacoes_campeonato SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS atualizacoes_campeonato_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON atualizacoes_campeonato
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM campeonatos WHERE id = NEW.campeonato_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE atualizacoes_campeonato SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS atualizacoes_campeonato_protege_publicacao BEFORE DELETE ON atualizacoes_campeonato
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_reuniao_marca_publicacao_0 AFTER INSERT ON documentos_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE documentos_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_reuniao_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON documentos_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE documentos_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_reuniao_protege_publicacao BEFORE DELETE ON documentos_reuniao
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS itens_reuniao_marca_publicacao_0 AFTER INSERT ON itens_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE itens_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS itens_reuniao_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON itens_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE itens_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS itens_reuniao_protege_publicacao BEFORE DELETE ON itens_reuniao
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS votacoes_reuniao_marca_publicacao_0 AFTER INSERT ON votacoes_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND NEW.interno = 0 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE votacoes_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS votacoes_reuniao_marca_publicacao_1 AFTER UPDATE OF publicado, ativo, interno ON votacoes_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND NEW.interno = 0 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE votacoes_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS votacoes_reuniao_protege_publicacao BEFORE DELETE ON votacoes_reuniao
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS presencas_reuniao_marca_publicacao_0 AFTER INSERT ON presencas_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE presencas_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS presencas_reuniao_marca_publicacao_1 AFTER UPDATE OF publicado, ativo ON presencas_reuniao
        WHEN NEW.ja_publicado = 0 AND NEW.publicado = 1 AND NEW.ativo = 1 AND EXISTS (SELECT 1 FROM reunioes WHERE id = NEW.reuniao_id AND publicado = 1 AND ativo = 1)
        BEGIN UPDATE presencas_reuniao SET ja_publicado = 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS presencas_reuniao_protege_publicacao BEFORE DELETE ON presencas_reuniao
      WHEN OLD.ja_publicado = 1
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_eventos_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON eventos_internos
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE documentos_eventos SET ja_publicado = 1 WHERE evento_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_campeonato_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON campeonatos
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE documentos_campeonato SET ja_publicado = 1 WHERE campeonato_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS atualizacoes_campeonato_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON campeonatos
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE atualizacoes_campeonato SET ja_publicado = 1 WHERE campeonato_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documentos_reuniao_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON reunioes
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE documentos_reuniao SET ja_publicado = 1 WHERE reuniao_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS itens_reuniao_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON reunioes
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE itens_reuniao SET ja_publicado = 1 WHERE reuniao_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS votacoes_reuniao_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON reunioes
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE votacoes_reuniao SET ja_publicado = 1 WHERE reuniao_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0 AND interno = 0; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS presencas_reuniao_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON reunioes
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE presencas_reuniao SET ja_publicado = 1 WHERE reuniao_id = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0; END;
