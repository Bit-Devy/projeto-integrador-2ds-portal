// cria os acessos sem guardar as senhas em texto
export const comandosEstruturaAcessos = [
  `CREATE TABLE IF NOT EXISTS acessos_painel (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    cargo TEXT NOT NULL, vaga INTEGER NOT NULL, nome TEXT NOT NULL,
    resumo TEXT NOT NULL, sal TEXT NOT NULL, busca TEXT NOT NULL,
    versao INTEGER DEFAULT 1 NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT acessos_painel_vaga_ck CHECK("acessos_painel"."vaga" >= 1 AND "acessos_painel"."vaga" <= CASE WHEN "acessos_painel"."cargo" = 'geral' THEN 3 ELSE 2 END)
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS acessos_painel_busca_unique ON acessos_painel (busca)",
  "CREATE UNIQUE INDEX IF NOT EXISTS acessos_painel_cargo_vaga_uq ON acessos_painel (cargo, vaga)",
  `CREATE TABLE IF NOT EXISTS auditoria_acessos (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    autor_id INTEGER NOT NULL, autor_nome TEXT NOT NULL,
    acao TEXT NOT NULL, cargo TEXT NOT NULL, acesso_id INTEGER,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
];

// acrescenta os logins sem apagar as senhas já protegidas
export async function garantirColunasLogin(d1: D1Database) {
  const colunas = await d1.prepare("PRAGMA table_info(acessos_painel)").all<{ name: string }>();
  for (const [nome, definicao] of [["login", "TEXT NOT NULL DEFAULT ''"], ["login_ambiente", "INTEGER NOT NULL DEFAULT 0"]]) {
    if (colunas.results.some((coluna) => coluna.name === nome)) continue;
    try { await d1.prepare(`ALTER TABLE acessos_painel ADD COLUMN ${nome} ${definicao}`).run(); }
    catch (erro) { if (!(erro instanceof Error) || !/duplicate column name/i.test(erro.message)) throw erro; }
  }
  await d1.batch([
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS acessos_painel_login_uq ON acessos_painel (login) WHERE \"acessos_painel\".\"login\" <> ''"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS acessos_painel_login_ambiente_uq ON acessos_painel (login_ambiente) WHERE \"acessos_painel\".\"login_ambiente\" = 1"),
  ]);
}
