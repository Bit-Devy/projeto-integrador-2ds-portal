// importa os conteúdos usados na primeira execução
import { dadosIniciais } from "../app/conteudo/dados-iniciais";
// importa os tipos de conteúdo
import type { TipoConteudo } from "../app/conteudo/tipos";
// importa o acesso direto ao banco
import { getD1 } from ".";
// importa os dados iniciais do mapa de 2026
import {
  categoriasMapaIniciais,
  CHAVE_CARGA_MAPA_2026,
  ensalamentosMapa2026,
  locaisMapa2026,
  turmasMapa2026,
} from "./dados-mapa-2026";
// importa a mesma estrutura aditiva da migração do sistema de eventos
import { comandosEstruturaEventos } from "./estrutura-eventos";

// guarda uma única inicialização em andamento
let tarefaInicializacao: Promise<void> | null = null;

// cria as tabelas também na prévia local
export function garantirBanco() {
  // inicia a preparação somente quando necessário
  if (!tarefaInicializacao) {
    // libera uma nova tentativa se a preparação falhar
    tarefaInicializacao = prepararBanco().catch((erro) => {
      tarefaInicializacao = null;
      throw erro;
    });
  }
  return tarefaInicializacao;
}

// cria as tabelas e insere os dados iniciais
async function prepararBanco() {
  const d1 = getD1();

  // cria todas as tabelas e índices que ainda não existem
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS conteudos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      dados_json TEXT NOT NULL,
      publicado INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS conteudos_tipo_idx ON conteudos (tipo)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS conteudos_publicado_idx ON conteudos (publicado)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      turma TEXT NOT NULL,
      assunto TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      tipo_contato TEXT,
      contato TEXT,
      anonimo INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'nova',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS mensagens_status_idx ON mensagens (status)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS categorias_mapa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo TEXT NOT NULL,
      slug TEXT NOT NULL,
      nome TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS categorias_mapa_grupo_slug_uq ON categorias_mapa (grupo, slug)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS categorias_mapa_grupo_ativo_idx ON categorias_mapa (grupo, ativo)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS locais_colegio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave_importacao TEXT,
      nome TEXT NOT NULL DEFAULT '',
      nome_normalizado TEXT NOT NULL DEFAULT '',
      numero TEXT NOT NULL DEFAULT '',
      numero_normalizado TEXT NOT NULL DEFAULT '',
      nome_alternativo TEXT NOT NULL DEFAULT '',
      nome_alternativo_normalizado TEXT NOT NULL DEFAULT '',
      tipo TEXT NOT NULL DEFAULT 'outro',
      ala TEXT NOT NULL DEFAULT '',
      andar TEXT NOT NULL DEFAULT '',
      bloco TEXT NOT NULL DEFAULT '',
      setor TEXT NOT NULL DEFAULT '',
      corredor TEXT NOT NULL DEFAULT '',
      referencia TEXT NOT NULL DEFAULT '',
      descricao TEXT NOT NULL DEFAULT '',
      instrucoes TEXT NOT NULL DEFAULT '',
      observacoes TEXT NOT NULL DEFAULT '',
      acessibilidade TEXT NOT NULL DEFAULT '',
      horario TEXT NOT NULL DEFAULT '',
      imagem_url TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      publicado INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS locais_colegio_chave_importacao_uq ON locais_colegio (chave_importacao)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS locais_colegio_nome_idx ON locais_colegio (nome_normalizado)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS locais_colegio_numero_idx ON locais_colegio (numero_normalizado)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS locais_colegio_publicacao_idx ON locais_colegio (publicado, ativo)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS turmas_atividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave_importacao TEXT,
      nome TEXT NOT NULL,
      nome_normalizado TEXT NOT NULL,
      aliases TEXT NOT NULL DEFAULT '',
      aliases_normalizados TEXT NOT NULL DEFAULT '',
      turno TEXT NOT NULL,
      tipo TEXT NOT NULL,
      curso TEXT NOT NULL DEFAULT '',
      serie TEXT NOT NULL DEFAULT '',
      turma TEXT NOT NULL DEFAULT '',
      descricao TEXT NOT NULL DEFAULT '',
      observacoes TEXT NOT NULL DEFAULT '',
      inicio_validade TEXT NOT NULL DEFAULT '',
      fim_validade TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      publicado INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS turmas_atividades_chave_importacao_uq ON turmas_atividades (chave_importacao)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS turmas_atividades_nome_idx ON turmas_atividades (nome_normalizado)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS turmas_atividades_filtros_idx ON turmas_atividades (turno, tipo)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS turmas_atividades_publicacao_idx ON turmas_atividades (publicado, ativo)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS ensalamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave_importacao TEXT,
      turma_atividade_id INTEGER NOT NULL,
      local_id INTEGER,
      turno TEXT NOT NULL,
      tipo TEXT NOT NULL,
      observacoes TEXT NOT NULL DEFAULT '',
      inicio_validade TEXT NOT NULL DEFAULT '',
      fim_validade TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      publicado INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_atividade_id) REFERENCES turmas_atividades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (local_id) REFERENCES locais_colegio(id) ON UPDATE CASCADE ON DELETE RESTRICT
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS ensalamentos_chave_importacao_uq ON ensalamentos (chave_importacao)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS ensalamentos_turma_idx ON ensalamentos (turma_atividade_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS ensalamentos_local_idx ON ensalamentos (local_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS ensalamentos_filtros_idx ON ensalamentos (turno, tipo)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS ensalamentos_publicacao_idx ON ensalamentos (publicado, ativo)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS cargas_iniciais (
      chave TEXT PRIMARY KEY NOT NULL,
      aplicado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]);

  // mantém a prévia local em paridade com a migração 0004 sem inserir dados fictícios
  await executarEmLotes(
    d1,
    comandosEstruturaEventos.map((comando) => d1.prepare(comando)),
  );

  // aplica ajustes e a carga do mapa
  await adicionarColunasContato(d1);
  await carregarMapa2026(d1);

  // evita repetir os conteúdos iniciais
  const quantidade = await d1.prepare("SELECT COUNT(*) AS total FROM conteudos").first<{ total: number }>();
  if ((quantidade?.total ?? 0) > 0) return;

  // prepara um comando para cada conteúdo inicial
  const comandos: ReturnType<typeof d1.prepare>[] = [];
  for (const [tipo, itens] of Object.entries(dadosIniciais) as [TipoConteudo, Array<Record<string, unknown>>][]) {
    itens.forEach((item) => {
      // separa o estado de publicação dos outros dados
      const { publicado = true, ...dados } = item;
      const titulo = obterTitulo(tipo, dados);
      comandos.push(
        d1
          .prepare("INSERT INTO conteudos (tipo, titulo, dados_json, publicado) VALUES (?, ?, ?, ?)")
          .bind(tipo, titulo, JSON.stringify(dados), publicado ? 1 : 0),
      );
    });
  }

  // executa todos os comandos preparados
  if (comandos.length) await d1.batch(comandos);
}

// carrega os locais turmas e ensalamentos de 2026
export async function carregarMapa2026(d1 = getD1()) {
  // verifica se esta versão da carga já foi aplicada
  const marcador = await d1
    .prepare("SELECT chave FROM cargas_iniciais WHERE chave = ?")
    .bind(CHAVE_CARGA_MAPA_2026)
    .first<{ chave: string }>();
  if (marcador) return false;

  // insere as categorias que ainda não existem
  await executarEmLotes(d1, categoriasMapaIniciais.map((categoria) => d1
    .prepare(`INSERT INTO categorias_mapa (grupo, slug, nome, ordem)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (grupo, slug) DO NOTHING`)
    .bind(categoria.grupo, categoria.slug, categoria.nome, categoria.ordem)));

  // insere os locais que ainda não existem
  await executarEmLotes(d1, locaisMapa2026.map((local) => d1
    .prepare(`INSERT INTO locais_colegio (
        chave_importacao, nome, nome_normalizado, numero, numero_normalizado,
        nome_alternativo, nome_alternativo_normalizado, tipo, ala, andar, ordem
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (chave_importacao) DO NOTHING`)
    .bind(
      local.chaveImportacao,
      local.nome,
      local.nomeNormalizado,
      local.numero,
      local.numeroNormalizado,
      local.nomeAlternativo,
      local.nomeAlternativoNormalizado,
      local.tipo,
      local.ala,
      local.andar,
      local.ordem,
    )));

  // insere as turmas que ainda não existem
  await executarEmLotes(d1, turmasMapa2026.map((turma) => d1
    .prepare(`INSERT INTO turmas_atividades (
        chave_importacao, nome, nome_normalizado, aliases, aliases_normalizados,
        turno, tipo, curso, serie, turma, ordem
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (chave_importacao) DO NOTHING`)
    .bind(
      turma.chaveImportacao,
      turma.nome,
      turma.nomeNormalizado,
      turma.aliases,
      turma.aliasesNormalizados,
      turma.turno,
      turma.tipo,
      turma.curso,
      turma.serie,
      turma.turma,
      turma.ordem,
    )));

  // insere os ensalamentos ligando suas chaves
  await executarEmLotes(d1, ensalamentosMapa2026.map((ensalamento) => d1
    .prepare(`INSERT INTO ensalamentos (
        chave_importacao, turma_atividade_id, local_id, turno, tipo, ordem
      ) VALUES (
        ?,
        (SELECT id FROM turmas_atividades WHERE chave_importacao = ?),
        (SELECT id FROM locais_colegio WHERE chave_importacao = ?),
        ?, ?, ?
      )
      ON CONFLICT (chave_importacao) DO NOTHING`)
    .bind(
      ensalamento.chaveImportacao,
      ensalamento.chaveTurma,
      ensalamento.chaveLocal,
      ensalamento.turno,
      ensalamento.tipo,
      ensalamento.ordem,
    )));

  // corrige registros importados que ainda estavam como outro
  await d1.batch([
    d1.prepare(`UPDATE turmas_atividades
      SET tipo = 'aula_regular', atualizado_em = CURRENT_TIMESTAMP
      WHERE chave_importacao LIKE 'pdf2026:turma:%'
        AND tipo = 'outro'
        AND nome <> 'Reforço'`),
    d1.prepare(`UPDATE ensalamentos
      SET tipo = 'aula_regular', atualizado_em = CURRENT_TIMESTAMP
      WHERE chave_importacao LIKE 'pdf2026:ensalamento:%'
        AND tipo = 'outro'
        AND turma_atividade_id IN (
          SELECT id FROM turmas_atividades
          WHERE chave_importacao LIKE 'pdf2026:turma:%'
            AND nome <> 'Reforço'
        )`),
  ]);

  // conta os registros criados para confirmar a carga
  const quantidades = await Promise.all([
    contarChaves(d1, "locais_colegio", "pdf2026:local:%"),
    contarChaves(d1, "turmas_atividades", "pdf2026:turma:%"),
    contarChaves(d1, "ensalamentos", "pdf2026:ensalamento:%"),
  ]);
  // interrompe se alguma quantidade estiver incompleta
  if (quantidades[0] !== 67 || quantidades[1] !== 100 || quantidades[2] !== 112) {
    throw new Error("Não foi possível concluir a carga verificada do mapa de 2026.");
  }

  // marca esta versão da carga como concluída
  await d1.prepare("INSERT OR IGNORE INTO cargas_iniciais (chave) VALUES (?)")
    .bind(CHAVE_CARGA_MAPA_2026)
    .run();
  return true;
}

// define os tipos usados para os comandos em lote
type BancoD1 = ReturnType<typeof getD1>;
type InstrucaoD1 = ReturnType<BancoD1["prepare"]>;

// executa comandos em grupos menores
async function executarEmLotes(d1: BancoD1, comandos: InstrucaoD1[]) {
  const tamanhoLote = 50;
  // envia um grupo de comandos por vez
  for (let inicio = 0; inicio < comandos.length; inicio += tamanhoLote) {
    await d1.batch(comandos.slice(inicio, inicio + tamanhoLote));
  }
}

// conta registros importados por um começo de chave
async function contarChaves(d1: BancoD1, tabela: "locais_colegio" | "turmas_atividades" | "ensalamentos", prefixo: string) {
  // usa somente nomes de tabela permitidos pelo tipo
  const resultado = await d1.prepare(`SELECT COUNT(*) AS total FROM ${tabela} WHERE chave_importacao LIKE ?`)
    .bind(prefixo)
    .first<{ total: number }>();
  return Number(resultado?.total ?? 0);
}

// adiciona campos de contato em bancos antigos
async function adicionarColunasContato(d1: ReturnType<typeof getD1>) {
  // lê os nomes das colunas atuais
  const resultado = await d1.prepare("PRAGMA table_info(mensagens)").all<{ name: string }>();
  const colunas = new Set(resultado.results.map((coluna: { name: string }) => coluna.name));

  if (!colunas.has("tipo_contato")) await adicionarColuna(d1, "tipo_contato");
  if (!colunas.has("contato")) await adicionarColuna(d1, "contato");
}

// adiciona uma coluna de contato ausente
async function adicionarColuna(d1: ReturnType<typeof getD1>, coluna: "tipo_contato" | "contato") {
  try {
    // altera somente uma das colunas permitidas pelo tipo
    await d1.prepare(`ALTER TABLE mensagens ADD COLUMN ${coluna} TEXT`).run();
  } catch (erro) {
    // ignora apenas o erro de coluna já criada
    if (!(erro instanceof Error) || !/duplicate column name/i.test(erro.message)) throw erro;
  }
}

// escolhe o título principal de um conteúdo inicial
function obterTitulo(tipo: TipoConteudo, dados: Record<string, unknown>) {
  if (tipo === "membros") return String(dados.nome ?? "Integrante");
  if (tipo === "movimentos") return String(dados.descricao ?? "Movimentação");
  return String(dados.titulo ?? "Conteúdo");
}
