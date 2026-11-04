// guarda as entradas e suas ações sem apagar o histórico ao trocar uma senha
export const comandosEstruturaHistorico = [
  `CREATE TABLE IF NOT EXISTS entradas_painel (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    acesso_id INTEGER NOT NULL, nome TEXT NOT NULL, cargo TEXT NOT NULL,
    entrada_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS entradas_painel_data_idx ON entradas_painel (entrada_em, id)",
  `CREATE TABLE IF NOT EXISTS acoes_painel (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    entrada_id INTEGER NOT NULL, resumo TEXT NOT NULL, recurso TEXT NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (entrada_id) REFERENCES entradas_painel(id) ON UPDATE NO ACTION ON DELETE RESTRICT
  )`,
  "CREATE INDEX IF NOT EXISTS acoes_painel_entrada_idx ON acoes_painel (entrada_id, id)",
];
