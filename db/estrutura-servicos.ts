// mantém a prévia local com as mesmas tabelas da migração
export const comandosEstruturaServicos = [
  `CREATE TABLE IF NOT EXISTS modulos_portal (chave TEXT PRIMARY KEY NOT NULL, dados_json TEXT NOT NULL, atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS calendarios_escolares (
    ano INTEGER NOT NULL, modalidade TEXT NOT NULL, dados_json TEXT NOT NULL,
    publicado INTEGER NOT NULL DEFAULT false, atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ano, modalidade),
    CONSTRAINT calendarios_modalidade_ck CHECK (modalidade IN ('anual', 'semestral'))
  )`,
];
