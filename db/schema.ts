// importa os valores sql usados pelas tabelas
import { sql } from "drizzle-orm";
// importa os tipos de colunas tabelas e índices
import { check, index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

// conteúdos que aparecem no portal
export const conteudos = sqliteTable(
  "conteudos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    dadosJson: text("dados_json").notNull(),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  // cria índices para os filtros de conteúdo
  (tabela) => [
    index("conteudos_tipo_idx").on(tabela.tipo),
    index("conteudos_publicado_idx").on(tabela.publicado),
  ],
);

// mensagens recebidas pelos formulários
export const mensagens = sqliteTable(
  "mensagens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    turma: text("turma").notNull(),
    assunto: text("assunto").notNull(),
    titulo: text("titulo").notNull(),
    mensagem: text("mensagem").notNull(),
    tipoContato: text("tipo_contato"),
    contato: text("contato"),
    anonimo: integer("anonimo", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("nova"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  // cria o índice usado para filtrar pelo estado
  (tabela) => [index("mensagens_status_idx").on(tabela.status)],
);

// opções editáveis usadas nos filtros do mapa
export const categoriasMapa = sqliteTable(
  "categorias_mapa",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    grupo: text("grupo").notNull(),
    slug: text("slug").notNull(),
    nome: text("nome").notNull(),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  // impede categorias repetidas e acelera seus filtros
  (tabela) => [
    uniqueIndex("categorias_mapa_grupo_slug_uq").on(tabela.grupo, tabela.slug),
    index("categorias_mapa_grupo_ativo_idx").on(tabela.grupo, tabela.ativo),
  ],
);

// locais físicos cadastrados no mapa
export const locaisColegio = sqliteTable(
  "locais_colegio",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chaveImportacao: text("chave_importacao"),
    nome: text("nome").notNull().default(""),
    nomeNormalizado: text("nome_normalizado").notNull().default(""),
    numero: text("numero").notNull().default(""),
    numeroNormalizado: text("numero_normalizado").notNull().default(""),
    nomeAlternativo: text("nome_alternativo").notNull().default(""),
    nomeAlternativoNormalizado: text("nome_alternativo_normalizado").notNull().default(""),
    tipo: text("tipo").notNull().default("outro"),
    ala: text("ala").notNull().default(""),
    andar: text("andar").notNull().default(""),
    bloco: text("bloco").notNull().default(""),
    setor: text("setor").notNull().default(""),
    corredor: text("corredor").notNull().default(""),
    referencia: text("referencia").notNull().default(""),
    descricao: text("descricao").notNull().default(""),
    instrucoes: text("instrucoes").notNull().default(""),
    observacoes: text("observacoes").notNull().default(""),
    acessibilidade: text("acessibilidade").notNull().default(""),
    horario: text("horario").notNull().default(""),
    imagemUrl: text("imagem_url").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  // cria índices para chaves buscas e publicação
  (tabela) => [
    uniqueIndex("locais_colegio_chave_importacao_uq").on(tabela.chaveImportacao),
    index("locais_colegio_nome_idx").on(tabela.nomeNormalizado),
    index("locais_colegio_numero_idx").on(tabela.numeroNormalizado),
    index("locais_colegio_publicacao_idx").on(tabela.publicado, tabela.ativo),
  ],
);

// turmas e atividades que ocupam os locais
export const turmasAtividades = sqliteTable(
  "turmas_atividades",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chaveImportacao: text("chave_importacao"),
    nome: text("nome").notNull(),
    nomeNormalizado: text("nome_normalizado").notNull(),
    aliases: text("aliases").notNull().default(""),
    aliasesNormalizados: text("aliases_normalizados").notNull().default(""),
    turno: text("turno").notNull(),
    tipo: text("tipo").notNull(),
    curso: text("curso").notNull().default(""),
    serie: text("serie").notNull().default(""),
    turma: text("turma").notNull().default(""),
    descricao: text("descricao").notNull().default(""),
    observacoes: text("observacoes").notNull().default(""),
    inicioValidade: text("inicio_validade").notNull().default(""),
    fimValidade: text("fim_validade").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  // cria índices para chaves filtros e publicação
  (tabela) => [
    uniqueIndex("turmas_atividades_chave_importacao_uq").on(tabela.chaveImportacao),
    index("turmas_atividades_nome_idx").on(tabela.nomeNormalizado),
    index("turmas_atividades_filtros_idx").on(tabela.turno, tabela.tipo),
    index("turmas_atividades_publicacao_idx").on(tabela.publicado, tabela.ativo),
  ],
);

// relações entre turmas atividades e locais
export const ensalamentos = sqliteTable(
  "ensalamentos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chaveImportacao: text("chave_importacao"),
    // protege a relação com a turma
    turmaAtividadeId: integer("turma_atividade_id")
      .notNull()
      .references(() => turmasAtividades.id, { onDelete: "restrict", onUpdate: "cascade" }),
    // protege a relação opcional com o local
    localId: integer("local_id").references(() => locaisColegio.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    turno: text("turno").notNull(),
    tipo: text("tipo").notNull(),
    observacoes: text("observacoes").notNull().default(""),
    inicioValidade: text("inicio_validade").notNull().default(""),
    fimValidade: text("fim_validade").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  // cria índices para relações filtros e publicação
  (tabela) => [
    uniqueIndex("ensalamentos_chave_importacao_uq").on(tabela.chaveImportacao),
    index("ensalamentos_turma_idx").on(tabela.turmaAtividadeId),
    index("ensalamentos_local_idx").on(tabela.localId),
    index("ensalamentos_filtros_idx").on(tabela.turno, tabela.tipo),
    index("ensalamentos_publicacao_idx").on(tabela.publicado, tabela.ativo),
  ],
);

// cargas iniciais que já foram aplicadas
export const cargasIniciais = sqliteTable("cargas_iniciais", {
  chave: text("chave").primaryKey(),
  aplicadoEm: text("aplicado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// eventos realizados no colégio ou organizados pelo GECEP
export const eventosInternos = sqliteTable(
  "eventos_internos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    titulo: text("titulo").notNull(),
    subtitulo: text("subtitulo").notNull().default(""),
    descricaoCurta: text("descricao_curta").notNull().default(""),
    descricao: text("descricao").notNull().default(""),
    categoria: text("categoria").notNull().default(""),
    imagemCapaUrl: text("imagem_capa_url").notNull().default(""),
    dataInicial: text("data_inicial").notNull().default(""),
    dataFinal: text("data_final").notNull().default(""),
    horarioInicial: text("horario_inicial").notNull().default(""),
    horarioFinal: text("horario_final").notNull().default(""),
    local: text("local").notNull().default(""),
    turno: text("turno").notNull().default(""),
    publicoDestinado: text("publico_destinado").notNull().default(""),
    organizacao: text("organizacao").notNull().default(""),
    programacao: text("programacao").notNull().default(""),
    orientacoes: text("orientacoes").notNull().default(""),
    linkExterno: text("link_externo").notNull().default(""),
    observacoesPublicas: text("observacoes_publicas").notNull().default(""),
    observacoesInternas: text("observacoes_internas").notNull().default(""),
    situacao: text("situacao").notNull().default("proximo"),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    arquivadoEm: text("arquivado_em"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    uniqueIndex("eventos_internos_slug_uq").on(tabela.slug),
    index("eventos_internos_publicacao_idx").on(tabela.publicado, tabela.ativo, tabela.dataInicial),
    index("eventos_internos_filtros_idx").on(tabela.situacao, tabela.categoria, tabela.turno),
    check("eventos_internos_situacao_ck", sql`${tabela.situacao} IN ('proximo', 'em_andamento', 'encerrado', 'adiado', 'cancelado')`),
  ],
);

// documentos imagens e links pertencentes a um evento interno
export const documentosEventos = sqliteTable(
  "documentos_eventos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventoId: integer("evento_id").notNull().references(() => eventosInternos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    titulo: text("titulo").notNull(),
    tipo: text("tipo").notNull().default("anexo"),
    descricao: text("descricao").notNull().default(""),
    arquivoChave: text("arquivo_chave").notNull().default(""),
    arquivoUrl: text("arquivo_url").notNull().default(""),
    linkExterno: text("link_externo").notNull().default(""),
    data: text("data").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    index("documentos_eventos_evento_idx").on(tabela.eventoId, tabela.ordem),
    index("documentos_eventos_publicacao_idx").on(tabela.publicado, tabela.ativo),
  ],
);

// campeonatos e edições de interclasses
export const campeonatos = sqliteTable(
  "campeonatos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    nome: text("nome").notNull(),
    edicao: text("edicao").notNull().default(""),
    ano: integer("ano"),
    modalidade: text("modalidade").notNull(),
    categoria: text("categoria").notNull().default(""),
    turno: text("turno").notNull().default(""),
    descricao: text("descricao").notNull().default(""),
    regulamento: text("regulamento").notNull().default(""),
    organizacao: text("organizacao").notNull().default(""),
    locais: text("locais").notNull().default(""),
    observacoesPublicas: text("observacoes_publicas").notNull().default(""),
    observacoesInternas: text("observacoes_internas").notNull().default(""),
    formato: text("formato").notNull().default("mata_mata"),
    situacao: text("situacao").notNull().default("proximo"),
    faseAtual: text("fase_atual").notNull().default(""),
    dataInicial: text("data_inicial").notNull().default(""),
    dataFinal: text("data_final").notNull().default(""),
    imagemCapaUrl: text("imagem_capa_url").notNull().default(""),
    chavePublicada: integer("chave_publicada", { mode: "boolean" }).notNull().default(false),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    arquivadoEm: text("arquivado_em"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    uniqueIndex("campeonatos_slug_uq").on(tabela.slug),
    index("campeonatos_publicacao_idx").on(tabela.publicado, tabela.ativo, tabela.dataInicial),
    index("campeonatos_filtros_idx").on(tabela.situacao, tabela.ano, tabela.modalidade, tabela.categoria, tabela.turno),
    check("campeonatos_formato_ck", sql`${tabela.formato} IN ('mata_mata', 'personalizada', 'grupos', 'pontos_corridos', 'grupos_mata_mata')`),
    check("campeonatos_situacao_ck", sql`${tabela.situacao} IN ('proximo', 'em_andamento', 'encerrado', 'adiado', 'cancelado')`),
  ],
);

// equipes ou turmas inscritas em um campeonato
export const participantesCampeonato = sqliteTable(
  "participantes_campeonato",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campeonatoId: integer("campeonato_id").notNull().references(() => campeonatos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    turmaAtividadeId: integer("turma_atividade_id").references(() => turmasAtividades.id, { onDelete: "restrict", onUpdate: "cascade" }),
    nome: text("nome").notNull(),
    nomeNormalizado: text("nome_normalizado").notNull(),
    nomeExibicao: text("nome_exibicao").notNull().default(""),
    apelido: text("apelido").notNull().default(""),
    posicaoInicial: integer("posicao_inicial").notNull().default(0),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    arquivadoEm: text("arquivado_em"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    index("participantes_campeonato_campeonato_idx").on(tabela.campeonatoId, tabela.ativo),
    index("participantes_campeonato_nome_idx").on(tabela.nomeNormalizado),
  ],
);

// fases ordenadas da chave
export const fasesCampeonato = sqliteTable(
  "fases_campeonato",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campeonatoId: integer("campeonato_id").notNull().references(() => campeonatos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    nome: text("nome").notNull(),
    ordem: integer("ordem").notNull().default(0),
    tipo: text("tipo").notNull().default("eliminatoria"),
    quantidadeJogos: integer("quantidade_jogos").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    uniqueIndex("fases_campeonato_ordem_uq").on(tabela.campeonatoId, tabela.ordem),
    index("fases_campeonato_publicacao_idx").on(tabela.campeonatoId, tabela.publicado, tabela.ativo),
    check("fases_campeonato_tipo_ck", sql`${tabela.tipo} IN ('eliminatoria', 'grupos', 'classificacao', 'terceiro_lugar', 'personalizada')`),
  ],
);

// partidas reais que formam a chave do campeonato
export const partidas = sqliteTable(
  "partidas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campeonatoId: integer("campeonato_id").notNull().references(() => campeonatos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    faseId: integer("fase_id").notNull().references(() => fasesCampeonato.id, { onDelete: "restrict", onUpdate: "cascade" }),
    rodada: text("rodada").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    participanteAId: integer("participante_a_id").references(() => participantesCampeonato.id, { onDelete: "restrict", onUpdate: "cascade" }),
    participanteBId: integer("participante_b_id").references(() => participantesCampeonato.id, { onDelete: "restrict", onUpdate: "cascade" }),
    participanteANome: text("participante_a_nome").notNull().default(""),
    participanteBNome: text("participante_b_nome").notNull().default(""),
    placarA: integer("placar_a"),
    placarB: integer("placar_b"),
    vencedorId: integer("vencedor_id").references(() => participantesCampeonato.id, { onDelete: "restrict", onUpdate: "cascade" }),
    vencedorNome: text("vencedor_nome").notNull().default(""),
    formaVitoria: text("forma_vitoria").notNull().default(""),
    data: text("data").notNull().default(""),
    horario: text("horario").notNull().default(""),
    local: text("local").notNull().default(""),
    situacao: text("situacao").notNull().default("data_a_definir"),
    placarPublicado: integer("placar_publicado", { mode: "boolean" }).notNull().default(false),
    resumo: text("resumo").notNull().default(""),
    destaques: text("destaques").notNull().default(""),
    observacoesPublicas: text("observacoes_publicas").notNull().default(""),
    observacoesInternas: text("observacoes_internas").notNull().default(""),
    proximaPartidaId: integer("proxima_partida_id").references((): AnySQLiteColumn => partidas.id, { onDelete: "restrict", onUpdate: "cascade" }),
    proximaPosicao: text("proxima_posicao").notNull().default(""),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    arquivadoEm: text("arquivado_em"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    uniqueIndex("partidas_fase_ordem_uq").on(tabela.faseId, tabela.ordem),
    index("partidas_campeonato_idx").on(tabela.campeonatoId, tabela.situacao, tabela.data),
    index("partidas_proxima_idx").on(tabela.proximaPartidaId),
    index("partidas_publicacao_idx").on(tabela.publicado, tabela.ativo),
    check("partidas_situacao_ck", sql`${tabela.situacao} IN ('agendada', 'em_andamento', 'encerrada', 'adiada', 'cancelada', 'wo', 'data_a_definir')`),
    check("partidas_proxima_posicao_ck", sql`${tabela.proximaPosicao} IN ('', 'a', 'b')`),
    check("partidas_placares_ck", sql`(${tabela.placarA} IS NULL OR ${tabela.placarA} >= 0) AND (${tabela.placarB} IS NULL OR ${tabela.placarB} >= 0)`),
  ],
);

// guarda cada alteração de resultado para permitir auditoria e correções seguras
export const historicoResultadosPartida = sqliteTable(
  "historico_resultados_partida",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    partidaId: integer("partida_id").notNull().references(() => partidas.id, { onDelete: "restrict", onUpdate: "cascade" }),
    resultadoAnteriorJson: text("resultado_anterior_json").notNull(),
    resultadoNovoJson: text("resultado_novo_json").notNull(),
    impactoJson: text("impacto_json").notNull().default("[]"),
    motivo: text("motivo").notNull().default(""),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [index("historico_resultados_partida_partida_idx").on(tabela.partidaId, tabela.criadoEm)],
);

// campeão preservado com seu nome histórico
export const campeoesCampeonato = sqliteTable(
  "campeoes_campeonato",
  {
    campeonatoId: integer("campeonato_id").primaryKey().references(() => campeonatos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    participanteId: integer("participante_id").references(() => participantesCampeonato.id, { onDelete: "restrict", onUpdate: "cascade" }),
    nome: text("nome").notNull(),
    definidoEm: text("definido_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [index("campeoes_campeonato_participante_idx").on(tabela.participanteId)],
);

// documentos e links de regulamento de um campeonato
export const documentosCampeonato = sqliteTable(
  "documentos_campeonato",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campeonatoId: integer("campeonato_id").notNull().references(() => campeonatos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    titulo: text("titulo").notNull(),
    tipo: text("tipo").notNull().default("anexo"),
    descricao: text("descricao").notNull().default(""),
    arquivoChave: text("arquivo_chave").notNull().default(""),
    arquivoUrl: text("arquivo_url").notNull().default(""),
    linkExterno: text("link_externo").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [index("documentos_campeonato_campeonato_idx").on(tabela.campeonatoId, tabela.ordem)],
);

// notícias curtas e mudanças de um campeonato
export const atualizacoesCampeonato = sqliteTable(
  "atualizacoes_campeonato",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campeonatoId: integer("campeonato_id").notNull().references(() => campeonatos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    titulo: text("titulo").notNull(),
    texto: text("texto").notNull().default(""),
    data: text("data").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [index("atualizacoes_campeonato_campeonato_idx").on(tabela.campeonatoId, tabela.data)],
);

// representantes atuais e históricos das turmas
export const representantes = sqliteTable(
  "representantes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    turmaAtividadeId: integer("turma_atividade_id").references(() => turmasAtividades.id, { onDelete: "restrict", onUpdate: "cascade" }),
    nome: text("nome").notNull(),
    nomeExibicao: text("nome_exibicao").notNull().default(""),
    nomeNormalizado: text("nome_normalizado").notNull(),
    nivelEnsino: text("nivel_ensino").notNull(),
    serie: text("serie").notNull(),
    turma: text("turma").notNull(),
    turmaNormalizada: text("turma_normalizada").notNull(),
    turno: text("turno").notNull(),
    funcao: text("funcao").notNull(),
    inicioMandato: text("inicio_mandato").notNull().default(""),
    fimMandato: text("fim_mandato").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    observacaoPublica: text("observacao_publica").notNull().default(""),
    observacaoInterna: text("observacao_interna").notNull().default(""),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    arquivadoEm: text("arquivado_em"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    index("representantes_nome_idx").on(tabela.nomeNormalizado),
    index("representantes_turma_idx").on(tabela.turmaNormalizada),
    index("representantes_filtros_idx").on(tabela.publicado, tabela.ativo, tabela.turno, tabela.nivelEnsino, tabela.serie, tabela.funcao),
    check("representantes_turno_ck", sql`${tabela.turno} IN ('manha', 'tarde', 'noite')`),
    check("representantes_funcao_ck", sql`${tabela.funcao} IN ('titular', 'vice', 'suplente', 'outra')`),
  ],
);

// reuniões de representantes ou internas do GECEP
export const reunioes = sqliteTable(
  "reunioes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    titulo: text("titulo").notNull(),
    tipo: text("tipo").notNull(),
    data: text("data").notNull().default(""),
    horarioInicial: text("horario_inicial").notNull().default(""),
    horarioFinal: text("horario_final").notNull().default(""),
    local: text("local").notNull().default(""),
    turno: text("turno").notNull().default(""),
    niveisEnsino: text("niveis_ensino").notNull().default(""),
    descricaoCurta: text("descricao_curta").notNull().default(""),
    responsaveis: text("responsaveis").notNull().default(""),
    pauta: text("pauta").notNull().default(""),
    pautaInterna: text("pauta_interna").notNull().default(""),
    discussoes: text("discussoes").notNull().default(""),
    resumo: text("resumo").notNull().default(""),
    decisoes: text("decisoes").notNull().default(""),
    propostas: text("propostas").notNull().default(""),
    encaminhamentos: text("encaminhamentos").notNull().default(""),
    ata: text("ata").notNull().default(""),
    transcricao: text("transcricao").notNull().default(""),
    observacoesPublicas: text("observacoes_publicas").notNull().default(""),
    observacoesInternas: text("observacoes_internas").notNull().default(""),
    quantidadeParticipantesPublicada: integer("quantidade_participantes_publicada", { mode: "boolean" }).notNull().default(false),
    situacao: text("situacao").notNull().default("agendada"),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    arquivadoEm: text("arquivado_em"),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    uniqueIndex("reunioes_slug_uq").on(tabela.slug),
    index("reunioes_publicacao_idx").on(tabela.publicado, tabela.ativo, tabela.data),
    index("reunioes_filtros_idx").on(tabela.tipo, tabela.situacao, tabela.turno),
    check("reunioes_tipo_ck", sql`${tabela.tipo} IN ('representantes', 'interna_gecep')`),
    check("reunioes_situacao_ck", sql`${tabela.situacao} IN ('agendada', 'em_andamento', 'encerrada', 'adiada', 'cancelada')`),
  ],
);

// tarefas propostas moções e demais itens estruturados de uma reunião
export const itensReuniao = sqliteTable(
  "itens_reuniao",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reuniaoId: integer("reuniao_id").notNull().references(() => reunioes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull().default(""),
    conteudo: text("conteudo").notNull().default(""),
    responsaveis: text("responsaveis").notNull().default(""),
    prazo: text("prazo").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [index("itens_reuniao_reuniao_idx").on(tabela.reuniaoId, tabela.tipo, tabela.ordem)],
);

// votações registradas em uma reunião
export const votacoesReuniao = sqliteTable(
  "votacoes_reuniao",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reuniaoId: integer("reuniao_id").notNull().references(() => reunioes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    titulo: text("titulo").notNull(),
    pergunta: text("pergunta").notNull().default(""),
    contexto: text("contexto").notNull().default(""),
    abstencoes: integer("abstencoes").notNull().default(0),
    resultado: text("resultado").notNull().default(""),
    decisaoFinal: text("decisao_final").notNull().default(""),
    observacaoPublica: text("observacao_publica").notNull().default(""),
    observacaoInterna: text("observacao_interna").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    interno: integer("interno", { mode: "boolean" }).notNull().default(true),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    index("votacoes_reuniao_reuniao_idx").on(tabela.reuniaoId, tabela.ordem),
    check("votacoes_reuniao_abstencoes_ck", sql`${tabela.abstencoes} >= 0`),
  ],
);

// totais agregados de cada opção sem votos individuais
export const opcoesVotacaoReuniao = sqliteTable(
  "opcoes_votacao_reuniao",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    votacaoId: integer("votacao_id").notNull().references(() => votacoesReuniao.id, { onDelete: "restrict", onUpdate: "cascade" }),
    texto: text("texto").notNull(),
    quantidadeVotos: integer("quantidade_votos").notNull().default(0),
    ordem: integer("ordem").notNull().default(0),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  },
  (tabela) => [
    index("opcoes_votacao_reuniao_votacao_idx").on(tabela.votacaoId, tabela.ordem),
    check("opcoes_votacao_reuniao_votos_ck", sql`${tabela.quantidadeVotos} >= 0`),
  ],
);

// atas pautas listas e anexos vinculados à reunião
export const documentosReuniao = sqliteTable(
  "documentos_reuniao",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reuniaoId: integer("reuniao_id").notNull().references(() => reunioes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    titulo: text("titulo").notNull(),
    tipo: text("tipo").notNull(),
    descricao: text("descricao").notNull().default(""),
    arquivoChave: text("arquivo_chave").notNull().default(""),
    arquivoUrl: text("arquivo_url").notNull().default(""),
    linkExterno: text("link_externo").notNull().default(""),
    data: text("data").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [index("documentos_reuniao_reuniao_idx").on(tabela.reuniaoId, tabela.tipo, tabela.ordem)],
);

// lista histórica de presença com cópias dos dados exibidos na data da reunião
export const presencasReuniao = sqliteTable(
  "presencas_reuniao",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reuniaoId: integer("reuniao_id").notNull().references(() => reunioes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    representanteId: integer("representante_id").references(() => representantes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    nomeSnapshot: text("nome_snapshot").notNull(),
    nivelEnsinoSnapshot: text("nivel_ensino_snapshot").notNull().default(""),
    serieSnapshot: text("serie_snapshot").notNull().default(""),
    turmaSnapshot: text("turma_snapshot").notNull().default(""),
    turmaNormalizadaSnapshot: text("turma_normalizada_snapshot").notNull().default(""),
    turnoSnapshot: text("turno_snapshot").notNull().default(""),
    funcaoSnapshot: text("funcao_snapshot").notNull().default(""),
    situacao: text("situacao").notNull().default("nao_informada"),
    observacaoPublica: text("observacao_publica").notNull().default(""),
    observacaoInterna: text("observacao_interna").notNull().default(""),
    publicado: integer("publicado", { mode: "boolean" }).notNull().default(false),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
    atualizadoEm: text("atualizado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (tabela) => [
    uniqueIndex("presencas_reuniao_representante_uq").on(tabela.reuniaoId, tabela.representanteId),
    index("presencas_reuniao_filtros_idx").on(tabela.reuniaoId, tabela.situacao, tabela.turnoSnapshot, tabela.nivelEnsinoSnapshot),
    check("presencas_reuniao_situacao_ck", sql`${tabela.situacao} IN ('presente', 'ausente', 'justificada', 'nao_se_aplica', 'nao_informada')`),
  ],
);
