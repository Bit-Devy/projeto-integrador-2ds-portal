// importa o banco que guarda os vínculos das publicações
import { getD1 } from "../../db";

// procura um uso público real sem confiar na opção enviada durante o upload
export function consultaReferenciaPublica(chave: string, recebido = `/api/arquivos/${encodeURIComponent(chave)}`) {
  const endereco = `/api/arquivos/${encodeURIComponent(chave)}`;
  return getD1().prepare(`WITH alvo(chave, endereco, recebido) AS (VALUES (?, ?, ?))
    SELECT 1 AS publica FROM alvo a WHERE EXISTS (
      SELECT c.id FROM conteudos c, json_each(c.dados_json) j
        WHERE c.publicado = 1 AND j.key IN ('imagemUrl', 'fotoUrl', 'comprovanteUrl', 'link')
          AND j.value IN (a.endereco, a.recebido)
    ) OR EXISTS (
      SELECT 1 FROM documentos_oficiais d WHERE d.arquivo_url IN (a.endereco, a.recebido)
    ) OR EXISTS (
      SELECT l.id FROM locais_colegio l WHERE l.ativo = 1 AND l.publicado = 1 AND l.imagem_url IN (a.endereco, a.recebido)
    ) OR EXISTS (
      SELECT e.id FROM eventos_internos e
        WHERE e.publicado = 1 AND (e.ativo = 1 OR e.arquivado_em IS NOT NULL) AND e.imagem_capa_url IN (a.endereco, a.recebido)
    ) OR EXISTS (
      SELECT d.id FROM documentos_eventos d INNER JOIN eventos_internos e ON e.id = d.evento_id
        WHERE e.publicado = 1 AND (e.ativo = 1 OR e.arquivado_em IS NOT NULL) AND d.publicado = 1 AND d.ativo = 1
          AND (d.arquivo_chave = a.chave OR d.arquivo_url IN (a.endereco, a.recebido))
    ) OR EXISTS (
      SELECT c.id FROM campeonatos c
        WHERE c.publicado = 1 AND (c.ativo = 1 OR c.arquivado_em IS NOT NULL) AND c.imagem_capa_url IN (a.endereco, a.recebido)
    ) OR EXISTS (
      SELECT d.id FROM documentos_campeonato d INNER JOIN campeonatos c ON c.id = d.campeonato_id
        WHERE c.publicado = 1 AND (c.ativo = 1 OR c.arquivado_em IS NOT NULL) AND d.publicado = 1 AND d.ativo = 1
          AND (d.arquivo_chave = a.chave OR d.arquivo_url IN (a.endereco, a.recebido))
    ) OR EXISTS (
      SELECT d.id FROM documentos_reuniao d INNER JOIN reunioes r ON r.id = d.reuniao_id
        WHERE r.publicado = 1 AND (r.ativo = 1 OR r.arquivado_em IS NOT NULL) AND d.publicado = 1 AND d.ativo = 1
          AND (d.arquivo_chave = a.chave OR d.arquivo_url IN (a.endereco, a.recebido))
    ) LIMIT 1`).bind(chave, endereco, recebido);
}

// usa a mesma regra no download e nos painéis
export async function possuiReferenciaPublica(chave: string, recebido?: string) {
  return Boolean(await consultaReferenciaPublica(chave, recebido).first());
}
