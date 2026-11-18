import { tiposConteudoRemoviveis } from "../app/conteudo/tipos";

// guarda a primeira publicação mesmo quando o registro sai do portal
const principais = [
  "conteudos",
  "calendarios_escolares",
  "eventos_internos",
  "campeonatos",
  "reunioes",
  "representantes",
  "turmas_atividades",
];
const anexos = [
  ["documentos_eventos", "eventos_internos", "evento_id"],
  ["documentos_campeonato", "campeonatos", "campeonato_id"],
  ["atualizacoes_campeonato", "campeonatos", "campeonato_id"],
  ["documentos_reuniao", "reunioes", "reuniao_id"],
  ["itens_reuniao", "reunioes", "reuniao_id"],
  ["votacoes_reuniao", "reunioes", "reuniao_id"],
  ["presencas_reuniao", "reunioes", "reuniao_id"],
] as const;
const tabelas = [...principais, ...anexos.map(([tabela]) => tabela)];

// mantém privadas as votações internas
function condicaoVoto(tabela: string, prefixo = "") {
  return tabela === "votacoes_reuniao" ? ` AND ${prefixo}interno = 0` : "";
}

const excecao = `tipo NOT IN (${tiposConteudoRemoviveis.map((tipo) => `'${tipo}'`).join(", ")})`;

// recupera o histórico que pode ser identificado nos cadastros antigos
export const comandosDadosPublicacao = [
  ...principais.map((tabela) => {
    const historico =
      tabela === "conteudos"
        ? " OR COALESCE(json_extract(dados_json, '$.jaPublicada'), 0) = 1"
        : tabela === "turmas_atividades"
          ? " OR ativo = 0"
          : tabela === "calendarios_escolares"
            ? ""
            : " OR arquivado_em IS NOT NULL";
    return `UPDATE ${tabela} SET ja_publicado = 1 WHERE ja_publicado = 0 AND (publicado = 1${historico})`;
  }),
  ...anexos.map(
    ([tabela, pai, chave]) => `UPDATE ${tabela} SET ja_publicado = 1
    WHERE publicado = 1 AND ja_publicado = 0${condicaoVoto(tabela)} AND EXISTS (SELECT 1 FROM ${pai} WHERE id = ${tabela}.${chave} AND ja_publicado = 1)`,
  ),
];

// grava a marca no banco e bloqueia exclusões mesmo quando duas ações chegam juntas
export const comandosProtecaoPublicacao = tabelas
  .flatMap((tabela) => {
    const anexo = anexos.find(([nome]) => nome === tabela);
    const publica = anexo
      ? `NEW.publicado = 1 AND NEW.ativo = 1${condicaoVoto(tabela, "NEW.")} AND EXISTS (SELECT 1 FROM ${anexo[1]} WHERE id = NEW.${anexo[2]} AND publicado = 1 AND ativo = 1)`
      : "NEW.publicado = 1";
    const chave =
      tabela === "calendarios_escolares"
        ? "ano = NEW.ano AND modalidade = NEW.modalidade"
        : "id = NEW.id";
    return [
      ...["INSERT", "UPDATE OF publicado, ativo"].map((operacao, indice) => {
        const evento =
          indice && (tabela === "conteudos" || tabela === "calendarios_escolares")
            ? "UPDATE OF publicado"
            : indice && tabela === "votacoes_reuniao"
              ? "UPDATE OF publicado, ativo, interno"
              : operacao;
        return `CREATE TRIGGER IF NOT EXISTS ${tabela}_marca_publicacao_${indice} AFTER ${evento} ON ${tabela}
        WHEN NEW.ja_publicado = 0 AND ${publica}
        BEGIN UPDATE ${tabela} SET ja_publicado = 1 WHERE ${chave}; END`;
      }),
      `CREATE TRIGGER IF NOT EXISTS ${tabela}_protege_publicacao BEFORE DELETE ON ${tabela}
      WHEN OLD.ja_publicado = 1${tabela === "conteudos" ? " AND OLD." + excecao : ""}
      BEGIN SELECT RAISE(ABORT, 'registro_ja_publicado'); END`,
    ];
  })
  .concat(
    anexos.map(
      ([tabela, pai, chave]) => `CREATE TRIGGER IF NOT EXISTS ${tabela}_publicacao_do_pai
  AFTER UPDATE OF publicado, ativo ON ${pai}
  WHEN NEW.publicado = 1 AND NEW.ativo = 1
  BEGIN UPDATE ${tabela} SET ja_publicado = 1 WHERE ${chave} = NEW.id AND publicado = 1 AND ativo = 1 AND ja_publicado = 0${condicaoVoto(tabela)}; END`,
    ),
  );

// prepara bancos que já foram criados pelo servidor local
export async function prepararHistoricoPublicacao(d1: D1Database) {
  const colunas = await d1.batch<{ name: string }>(
    tabelas.map((tabela) => d1.prepare(`PRAGMA table_info(${tabela})`)),
  );
  const faltantes = tabelas.filter(
    (_, indice) => !colunas[indice].results.some(({ name }) => name === "ja_publicado"),
  );
  const adicionar = faltantes.map(
    (tabela) => `ALTER TABLE ${tabela} ADD COLUMN ja_publicado INTEGER NOT NULL DEFAULT 0`,
  );
  const dados = faltantes.length ? comandosDadosPublicacao : [];
  try {
    await d1.batch(
      [...adicionar, ...dados, ...comandosProtecaoPublicacao].map((sql) => d1.prepare(sql)),
    );
  } catch (erro) {
    // outra inicialização pode ter criado as colunas enquanto este lote aguardava
    if (!(erro instanceof Error) || !/duplicate column name/i.test(erro.message)) throw erro;
    await d1.batch(comandosProtecaoPublicacao.map((sql) => d1.prepare(sql)));
  }
}
