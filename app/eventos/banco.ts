import { getD1 } from "../../db";
import { combinarHorario, normalizarTextoBusca, normalizarTurma } from "./normalizacao";
import { planejarChaveMataMata, validarLigacaoPartida } from "./chave";
import type {
  AtualizacaoCampeonato,
  AtualizacaoCampeonatoAdministrativa,
  CampeonatoAdministrativo,
  CampeonatoPublico,
  CentralEventos,
  DetalheCampeonato,
  DetalheReuniao,
  DocumentoAdministrativo,
  DocumentoPublico,
  EventoInternoAdministrativo,
  EventoInternoPublico,
  FaseCampeonato,
  ImpactoResultado,
  ItemReuniaoAdministrativo,
  ItemReuniaoPublico,
  ListaPaginada,
  OpcaoVotacaoPublica,
  PartidaAdministrativa,
  PartidaPublica,
  ParticipanteCampeonato,
  PresencaAdministrativa,
  PresencaPublica,
  RepresentanteAdministrativo,
  RepresentantePublico,
  ReuniaoAdministrativa,
  ReuniaoPublica,
  SituacaoPresenca,
  VotacaoPublica,
} from "./tipos";
import {
  ErroEventos,
  booleano,
  idPositivo,
  limiteValido,
  objetoRecebido,
  paginaValida,
  textoFiltro,
  validarAtualizacaoCampeonato,
  validarCampeonato,
  validarDocumento,
  validarEventoInterno,
  validarFase,
  validarItemReuniao,
  validarPartida,
  validarParticipante,
  validarPresenca,
  validarRepresentante,
  validarReuniao,
  validarVotacao,
} from "./validacao";

type Linha = Record<string, unknown>;
type Filtros = { sql: string[]; valores: unknown[] };

// ---------------------------------------------------------------------------
// Eventos internos

export async function listarEventos(parametros: URLSearchParams, todos = false): Promise<ListaPaginada<EventoInternoPublico | EventoInternoAdministrativo>> {
  const { pagina, limite, offset } = paginacao(parametros);
  const filtros: Filtros = { sql: [], valores: [] };
  const situacaoRecebida = textoFiltro(parametros.get("situacao"), 40);
  const situacao = situacaoRecebida === "acontecendo_agora" ? "em_andamento" : situacaoRecebida;
  if (!todos) {
    filtros.sql.push("e.publicado = 1", "e.ativo = 1", "e.arquivado_em IS NULL");
    if (situacao === "arquivado") filtros.sql.push("1 = 0");
  }
  if (situacao && situacao !== "arquivado") adicionarIgual(filtros, "e.situacao", situacao);
  if (situacao === "arquivado" && todos) filtros.sql.push("e.arquivado_em IS NOT NULL");
  adicionarIgualSePresente(filtros, "e.categoria", parametros.get("categoria"), 100);
  adicionarIgualSePresente(filtros, "e.turno", parametros.get("turno"), 20);
  adicionarIgualSePresente(filtros, "substr(e.data_inicial, 1, 4)", parametros.get("ano"), 4);
  adicionarIgualSePresente(filtros, "substr(e.data_inicial, 6, 2)", normalizarMes(parametros.get("mes")), 2);
  const publico = textoFiltro(parametros.get("publico"), 120);
  if (publico) adicionarLike(filtros, "e.publico_destinado", publico);
  const busca = textoFiltro(parametros.get("busca"), 120);
  if (busca) {
    filtros.sql.push("(e.titulo LIKE ? ESCAPE '\\' OR e.subtitulo LIKE ? ESCAPE '\\' OR e.descricao_curta LIKE ? ESCAPE '\\')");
    const termo = `%${escaparLike(busca)}%`;
    filtros.valores.push(termo, termo, termo);
  }
  const where = clausulaWhere(filtros);
  const d1 = getD1();
  const [linhas, contagem] = await d1.batch([
    d1.prepare(`SELECT e.* FROM eventos_internos e ${where}
      ORDER BY CASE WHEN e.data_inicial = '' THEN 1 ELSE 0 END,
        CASE WHEN e.situacao IN ('proximo', 'em_andamento') THEN e.data_inicial END ASC,
        CASE WHEN e.situacao NOT IN ('proximo', 'em_andamento') THEN e.data_inicial END DESC,
        e.id DESC
      LIMIT ? OFFSET ?`).bind(...filtros.valores, limite, offset),
    d1.prepare(`SELECT COUNT(*) AS total FROM eventos_internos e ${where}`).bind(...filtros.valores),
  ]);
  const itens = await Promise.all((linhas.results as Linha[]).map(async (linha) => {
    const documentos = await listarDocumentosEvento(Number(linha.id), todos);
    return formatarEvento(linha, documentos, todos);
  }));
  return listaPaginada(itens, pagina, limite, totalDaContagem(contagem.results));
}

export async function obterEvento(identificador: string | number, todos = false) {
  const linha = await buscarPorIdOuSlug("eventos_internos", identificador, todos
    ? "1 = 1"
    : "publicado = 1 AND ativo = 1 AND arquivado_em IS NULL");
  if (!linha) throw new ErroEventos("Evento não encontrado.", 404);
  const documentos = await listarDocumentosEvento(Number(linha.id), todos);
  return formatarEvento(linha, documentos, todos);
}

export async function criarEvento(valor: unknown) {
  const dados = validarEventoInterno(valor);
  if (!dados.slug) throw new ErroEventos("Não foi possível criar o endereço do evento.");
  const d1 = getD1();
  let linha: Linha | null = null;
  try {
    linha = await d1.prepare(`${sqlInserirEvento} RETURNING *`).bind(...valoresEvento(dados)).first<Linha>();
  } catch (erro) {
    converterErroUnico(erro, "Já existe um evento com esse endereço.");
  }
  if (!linha) throw new ErroEventos("Não foi possível criar o evento.", 500);
  await substituirLinksEvento(Number(linha.id), dados.documentos, dados.imagens, dados.publicado);
  return obterEvento(Number(linha.id), true);
}

export async function atualizarEvento(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "evento");
  const existente = await obterEvento(id, true) as EventoInternoAdministrativo;
  const recebido = valor as Record<string, unknown>;
  const dados = validarEventoInterno({ ...existente, ...recebido });
  try {
    const d1 = getD1();
    const comandos: D1PreparedStatement[] = [
      d1.prepare(`${sqlAtualizarEvento} WHERE id = ?`).bind(...valoresEvento(dados), id),
    ];
    if (!existente.publicado && dados.publicado) {
      comandos.push(d1.prepare(`UPDATE documentos_eventos SET publicado = 1, atualizado_em = CURRENT_TIMESTAMP
        WHERE evento_id = ? AND ativo = 1 AND tipo IN ('documento', 'imagem')`).bind(id));
    }
    await d1.batch(comandos);
  } catch (erro) {
    converterErroUnico(erro, "Já existe um evento com esse endereço.");
  }
  if (Object.hasOwn(recebido, "documentos") || Object.hasOwn(recebido, "imagens")) {
    await substituirLinksEvento(id, dados.documentos, dados.imagens, dados.publicado);
  }
  if (booleano(recebido.arquivado, false)) await arquivarRegistro("eventos_internos", id);
  return obterEvento(id, true);
}

export async function duplicarEvento(idRecebido: unknown) {
  const origem = await obterEvento(idPositivo(idRecebido, "evento"), true) as EventoInternoAdministrativo;
  const documentos = origem.documentos.map((item) => item.arquivoUrl || item.linkExterno);
  const imagens = origem.imagens.map((item) => item.arquivoUrl || item.linkExterno);
  return criarEvento({
    ...origem,
    slug: `${origem.slug}-copia-${Date.now().toString(36)}`,
    titulo: `${origem.titulo} — cópia`,
    publicado: false,
    ativo: true,
    arquivado: false,
    documentos,
    imagens,
  });
}

export async function arquivarEvento(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "evento");
  await exigirExistente("eventos_internos", id, "Evento não encontrado.");
  await arquivarRegistro("eventos_internos", id);
  return { arquivado: true, id };
}

export async function excluirRascunhoEvento(idRecebido: unknown) {
  const id = await exigirRascunhoExcluivel("eventos_internos", idRecebido, "Evento não encontrado.");
  const d1 = getD1();
  await d1.batch([
    d1.prepare("DELETE FROM documentos_eventos WHERE evento_id = ?").bind(id),
    d1.prepare("DELETE FROM eventos_internos WHERE id = ?").bind(id),
  ]);
  return { excluido: true, id };
}

export async function criarDocumentoEvento(eventoIdRecebido: unknown, valor: unknown) {
  const eventoId = idPositivo(eventoIdRecebido, "evento");
  await exigirExistente("eventos_internos", eventoId, "Evento não encontrado.");
  const dados = validarDocumento(valor);
  const linha = await getD1().prepare(`${sqlInserirDocumentoEvento} RETURNING *`)
    .bind(eventoId, ...valoresDocumento(dados)).first<Linha>();
  if (!linha) throw new ErroEventos("Não foi possível criar o documento.", 500);
  return formatarDocumento(linha, true);
}

export async function atualizarDocumentoEvento(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "documento");
  const existente = await getD1().prepare("SELECT * FROM documentos_eventos WHERE id = ?").bind(id).first<Linha>();
  if (!existente) throw new ErroEventos("Documento não encontrado.", 404);
  const dados = validarDocumento({ ...formatarDocumento(existente, true), ...(valor as object) });
  await getD1().prepare(`${sqlAtualizarDocumento("documentos_eventos")} WHERE id = ?`)
    .bind(...valoresDocumento(dados), id).run();
  const linha = await getD1().prepare("SELECT * FROM documentos_eventos WHERE id = ?").bind(id).first<Linha>();
  return formatarDocumento(linha!, true);
}

export async function arquivarDocumentoEvento(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "documento");
  await exigirExistente("documentos_eventos", id, "Documento não encontrado.");
  await getD1().prepare("UPDATE documentos_eventos SET ativo = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
  return { arquivado: true, id };
}

async function listarDocumentosEvento(eventoId: number, todos: boolean) {
  const filtro = todos ? "AND ativo = 1" : "AND publicado = 1 AND ativo = 1";
  const resultado = await getD1().prepare(`SELECT * FROM documentos_eventos WHERE evento_id = ? ${filtro} ORDER BY ordem, id`)
    .bind(eventoId).all<Linha>();
  return resultado.results.map((linha) => formatarDocumento(linha, todos));
}

export async function obterDocumentoParaSincronizacao(
  origem: "evento" | "campeonato" | "reuniao",
  idRecebido: unknown,
) {
  const id = idPositivo(idRecebido, "documento");
  const tabela = {
    evento: "documentos_eventos",
    campeonato: "documentos_campeonato",
    reuniao: "documentos_reuniao",
  }[origem];
  const linha = await getD1().prepare(`SELECT * FROM ${tabela} WHERE id = ?`).bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Documento não encontrado.", 404);
  return formatarDocumento(linha, true) as DocumentoAdministrativo;
}

async function substituirLinksEvento(eventoId: number, documentos: string[], imagens: string[], publicado: boolean) {
  const d1 = getD1();
  const comandos = [d1.prepare("UPDATE documentos_eventos SET ativo = 0, atualizado_em = CURRENT_TIMESTAMP WHERE evento_id = ? AND tipo IN ('documento', 'imagem')").bind(eventoId)];
  for (const [tipo, links] of [["documento", documentos], ["imagem", imagens]] as const) {
    links.forEach((url, indice) => comandos.push(d1.prepare(sqlInserirDocumentoEvento).bind(
      eventoId, tituloDoArquivo(url, tipo), tipo, "", "", url, "", "", indice, publicado ? 1 : 0, 1,
    )));
  }
  await d1.batch(comandos);
}

// ---------------------------------------------------------------------------
// Representantes

export async function listarRepresentantes(parametros: URLSearchParams, todos = false): Promise<ListaPaginada<RepresentantePublico | RepresentanteAdministrativo>> {
  const { pagina, limite, offset } = paginacao(parametros, 500);
  const filtros: Filtros = { sql: [], valores: [] };
  if (!todos) filtros.sql.push("r.publicado = 1", "r.ativo = 1", "r.arquivado_em IS NULL");
  const busca = normalizarTextoBusca(textoFiltro(parametros.get("busca"), 120));
  if (busca) {
    filtros.sql.push("(r.nome_normalizado LIKE ? ESCAPE '\\' OR r.turma_normalizada LIKE ? ESCAPE '\\')");
    const termo = `%${escaparLike(busca)}%`;
    filtros.valores.push(termo, termo);
  }
  const turma = normalizarTurma(parametros.get("turma"));
  if (turma) adicionarLike(filtros, "r.turma_normalizada", turma);
  adicionarIgualSePresente(filtros, "r.turno", parametros.get("turno"), 20);
  adicionarIgualSePresente(filtros, "r.nivel_ensino", parametros.get("nivel") ?? parametros.get("nivelEnsino"), 120);
  adicionarIgualSePresente(filtros, "r.serie", parametros.get("serie") ?? parametros.get("ano"), 80);
  adicionarIgualSePresente(filtros, "r.funcao", parametros.get("funcao"), 40);
  if (parametros.get("arquivado") === "1") filtros.sql.push("r.arquivado_em IS NOT NULL");
  const where = clausulaWhere(filtros);
  const ordem = ordemRepresentantes(parametros.get("ordenar"), parametros.get("direcao"));
  const d1 = getD1();
  const [linhas, contagem] = await d1.batch([
    d1.prepare(`SELECT r.* FROM representantes r ${where} ORDER BY ${ordem} LIMIT ? OFFSET ?`)
      .bind(...filtros.valores, limite, offset),
    d1.prepare(`SELECT COUNT(*) AS total FROM representantes r ${where}`).bind(...filtros.valores),
  ]);
  return listaPaginada(
    (linhas.results as Linha[]).map((linha) => formatarRepresentante(linha, todos)),
    pagina,
    limite,
    totalDaContagem(contagem.results),
  );
}

export async function obterRepresentante(idRecebido: unknown, todos = false) {
  const id = idPositivo(idRecebido, "representante");
  const filtro = todos ? "" : "AND publicado = 1 AND ativo = 1 AND arquivado_em IS NULL";
  const linha = await getD1().prepare(`SELECT * FROM representantes WHERE id = ? ${filtro}`).bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Representante não encontrado.", 404);
  return formatarRepresentante(linha, todos);
}

export async function criarRepresentante(valor: unknown) {
  const dados = validarRepresentante(valor);
  await validarTurmaRelacionada(dados.turmaAtividadeId);
  const linha = await getD1().prepare(`${sqlInserirRepresentante} RETURNING *`)
    .bind(...valoresRepresentante(dados)).first<Linha>();
  if (!linha) throw new ErroEventos("Não foi possível criar o representante.", 500);
  return formatarRepresentante(linha, true);
}

export async function atualizarRepresentante(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "representante");
  const existente = await obterRepresentante(id, true) as RepresentanteAdministrativo;
  const recebido = valor as Record<string, unknown>;
  const reativando = Boolean(existente.arquivadoEm) && booleano(recebido.ativo, existente.ativo);
  const dados = validarRepresentante({ ...existente, ...recebido, ...(reativando ? { publicado: false } : {}) });
  await validarTurmaRelacionada(dados.turmaAtividadeId);
  const d1 = getD1();
  const comandos: D1PreparedStatement[] = [
    d1.prepare(`${sqlAtualizarRepresentante} WHERE id = ?`).bind(...valoresRepresentante(dados), id),
  ];
  if (reativando) {
    comandos.push(d1.prepare(`UPDATE representantes SET arquivado_em = NULL, publicado = 0,
      atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(id));
  }
  await d1.batch(comandos);
  if (booleano(recebido.arquivado, false)) await arquivarRegistro("representantes", id);
  return obterRepresentante(id, true);
}

export async function arquivarRepresentante(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "representante");
  await exigirExistente("representantes", id, "Representante não encontrado.");
  await arquivarRegistro("representantes", id);
  return { arquivado: true, id };
}

export async function excluirRascunhoRepresentante(idRecebido: unknown) {
  const id = await exigirRascunhoExcluivel("representantes", idRecebido, "Representante não encontrado.");
  const d1 = getD1();
  await d1.batch([
    d1.prepare("UPDATE presencas_reuniao SET representante_id = NULL WHERE representante_id = ?").bind(id),
    d1.prepare("DELETE FROM representantes WHERE id = ?").bind(id),
  ]);
  return { excluido: true, id };
}

export async function diagnosticoRepresentantes() {
  const d1 = getD1();
  const [duplicacoes, turmasSemRepresentante] = await d1.batch([
    d1.prepare(`SELECT turma, turno, funcao, COUNT(*) AS quantidade
      FROM representantes WHERE ativo = 1 AND arquivado_em IS NULL
      GROUP BY turma_normalizada, turno, funcao HAVING COUNT(*) > 1
      ORDER BY turma, turno, funcao`),
    d1.prepare(`SELECT t.id, t.nome, t.serie, t.turma, t.turno
      FROM turmas_atividades t
      WHERE t.ativo = 1 AND t.tipo = 'aula_regular'
        AND NOT EXISTS (
          SELECT 1 FROM representantes r
          WHERE r.turma_atividade_id = t.id AND r.ativo = 1 AND r.arquivado_em IS NULL
        )
      ORDER BY t.ordem, t.nome COLLATE NOCASE`),
  ]);
  return { duplicacoes: duplicacoes.results, turmasSemRepresentante: turmasSemRepresentante.results };
}

// ---------------------------------------------------------------------------
// Formatação explícita dos DTOs básicos

function formatarEvento(linha: Linha, anexos: Array<DocumentoPublico | DocumentoAdministrativo>, todos: boolean) {
  const documentos = anexos.filter((item) => item.tipo !== "imagem");
  const imagens = anexos.filter((item) => item.tipo === "imagem");
  const publico: EventoInternoPublico = {
    id: numero(linha.id), slug: string(linha.slug), titulo: string(linha.titulo), subtitulo: string(linha.subtitulo),
    descricaoCurta: string(linha.descricao_curta), descricao: string(linha.descricao), categoria: string(linha.categoria),
    imagemCapaUrl: string(linha.imagem_capa_url), dataInicial: string(linha.data_inicial), dataFinal: string(linha.data_final),
    horarioInicial: string(linha.horario_inicial), horarioFinal: string(linha.horario_final),
    horario: combinarHorario(string(linha.horario_inicial), string(linha.horario_final)), local: string(linha.local),
    turno: string(linha.turno), publicoDestinado: string(linha.publico_destinado), organizacao: string(linha.organizacao),
    programacao: string(linha.programacao), orientacoes: string(linha.orientacoes), linkExterno: string(linha.link_externo),
    observacoesPublicas: string(linha.observacoes_publicas), situacao: linha.situacao as EventoInternoPublico["situacao"],
    arquivado: Boolean(linha.arquivado_em), documentos: documentos as DocumentoPublico[], imagens: imagens as DocumentoPublico[],
    atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return {
    ...publico,
    observacoesInternas: string(linha.observacoes_internas), publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    arquivadoEm: nuloString(linha.arquivado_em), criadoEm: string(linha.criado_em),
  } satisfies EventoInternoAdministrativo;
}

function formatarDocumento(linha: Linha, todos: boolean): DocumentoPublico | DocumentoAdministrativo {
  const publico: DocumentoPublico = {
    id: numero(linha.id), titulo: string(linha.titulo), tipo: string(linha.tipo), descricao: string(linha.descricao),
    arquivoUrl: string(linha.arquivo_url), linkExterno: string(linha.link_externo), data: string(linha.data),
    ordem: numero(linha.ordem), atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return { ...publico, arquivoChave: string(linha.arquivo_chave), publicado: bool(linha.publicado), ativo: bool(linha.ativo), criadoEm: string(linha.criado_em) };
}

function formatarRepresentante(linha: Linha, todos: boolean) {
  const publico: RepresentantePublico = {
    id: numero(linha.id), nome: string(linha.nome), nomeExibicao: string(linha.nome_exibicao),
    nivelEnsino: string(linha.nivel_ensino), serie: string(linha.serie), turma: string(linha.turma),
    turno: linha.turno as RepresentantePublico["turno"], funcao: linha.funcao as RepresentantePublico["funcao"],
    inicioMandato: string(linha.inicio_mandato), fimMandato: string(linha.fim_mandato), ordem: numero(linha.ordem),
    observacaoPublica: string(linha.observacao_publica), atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return {
    ...publico, turmaAtividadeId: nuloNumero(linha.turma_atividade_id), observacaoInterna: string(linha.observacao_interna),
    ativo: bool(linha.ativo), publicado: bool(linha.publicado), arquivadoEm: nuloString(linha.arquivado_em), criadoEm: string(linha.criado_em),
  } satisfies RepresentanteAdministrativo;
}

// ---------------------------------------------------------------------------
// SQL e utilidades compartilhadas

const sqlInserirEvento = `INSERT INTO eventos_internos (
  slug, titulo, subtitulo, descricao_curta, descricao, categoria, imagem_capa_url,
  data_inicial, data_final, horario_inicial, horario_final, local, turno, publico_destinado,
  organizacao, programacao, orientacoes, link_externo, observacoes_publicas, observacoes_internas,
  situacao, publicado, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarEvento = `UPDATE eventos_internos SET
  slug = ?, titulo = ?, subtitulo = ?, descricao_curta = ?, descricao = ?, categoria = ?, imagem_capa_url = ?,
  data_inicial = ?, data_final = ?, horario_inicial = ?, horario_final = ?, local = ?, turno = ?, publico_destinado = ?,
  organizacao = ?, programacao = ?, orientacoes = ?, link_externo = ?, observacoes_publicas = ?, observacoes_internas = ?,
  situacao = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;

function valoresEvento(dados: ReturnType<typeof validarEventoInterno>) {
  return [dados.slug, dados.titulo, dados.subtitulo, dados.descricaoCurta, dados.descricao, dados.categoria,
    dados.imagemCapaUrl, dados.dataInicial, dados.dataFinal, dados.horarioInicial, dados.horarioFinal, dados.local,
    dados.turno, dados.publicoDestinado, dados.organizacao, dados.programacao, dados.orientacoes, dados.linkExterno,
    dados.observacoesPublicas, dados.observacoesInternas, dados.situacao, binario(dados.publicado), binario(dados.ativo)];
}

const sqlInserirDocumentoEvento = `INSERT INTO documentos_eventos (
  evento_id, titulo, tipo, descricao, arquivo_chave, arquivo_url, link_externo, data, ordem, publicado, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function sqlAtualizarDocumento(tabela: "documentos_eventos" | "documentos_campeonato" | "documentos_reuniao") {
  return `UPDATE ${tabela} SET titulo = ?, tipo = ?, descricao = ?, arquivo_chave = ?, arquivo_url = ?,
    link_externo = ?, data = ?, ordem = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;
}

function valoresDocumento(dados: ReturnType<typeof validarDocumento>) {
  return [dados.titulo, dados.tipo, dados.descricao, dados.arquivoChave, dados.arquivoUrl, dados.linkExterno,
    dados.data, dados.ordem, binario(dados.publicado), binario(dados.ativo)];
}

const sqlInserirRepresentante = `INSERT INTO representantes (
  turma_atividade_id, nome, nome_exibicao, nome_normalizado, nivel_ensino, serie, turma, turma_normalizada,
  turno, funcao, inicio_mandato, fim_mandato, ordem, observacao_publica, observacao_interna, ativo, publicado
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarRepresentante = `UPDATE representantes SET
  turma_atividade_id = ?, nome = ?, nome_exibicao = ?, nome_normalizado = ?, nivel_ensino = ?, serie = ?, turma = ?, turma_normalizada = ?,
  turno = ?, funcao = ?, inicio_mandato = ?, fim_mandato = ?, ordem = ?, observacao_publica = ?, observacao_interna = ?,
  ativo = ?, publicado = ?, atualizado_em = CURRENT_TIMESTAMP`;

function valoresRepresentante(dados: ReturnType<typeof validarRepresentante>) {
  return [dados.turmaAtividadeId, dados.nome, dados.nomeExibicao, dados.nomeNormalizado, dados.nivelEnsino,
    dados.serie, dados.turma, dados.turmaNormalizada, dados.turno, dados.funcao, dados.inicioMandato,
    dados.fimMandato, dados.ordem, dados.observacaoPublica, dados.observacaoInterna, binario(dados.ativo), binario(dados.publicado)];
}

async function validarTurmaRelacionada(id: number | null) {
  if (!id) return;
  const linha = await getD1().prepare("SELECT id FROM turmas_atividades WHERE id = ?").bind(id).first();
  if (!linha) throw new ErroEventos("A turma relacionada não existe.");
}

function paginacao(parametros: URLSearchParams, maximo = 100) {
  const pagina = paginaValida(parametros);
  const limite = limiteValido(parametros, maximo);
  return { pagina, limite, offset: (pagina - 1) * limite };
}

function listaPaginada<T>(itens: T[], pagina: number, limite: number, total: number): ListaPaginada<T> {
  return { itens, paginacao: { pagina, limite, total, totalPaginas: total ? Math.ceil(total / limite) : 0 } };
}

function totalDaContagem(resultados: Linha[]) {
  return numero(resultados[0]?.total);
}

function adicionarIgual(filtros: Filtros, coluna: string, valor: unknown) {
  filtros.sql.push(`${coluna} = ?`);
  filtros.valores.push(valor);
}

function adicionarIgualSePresente(filtros: Filtros, coluna: string, valor: string | null, limite: number) {
  const recebido = textoFiltro(valor, limite);
  if (recebido) adicionarIgual(filtros, coluna, recebido);
}

function adicionarLike(filtros: Filtros, coluna: string, valor: string) {
  filtros.sql.push(`${coluna} LIKE ? ESCAPE '\\'`);
  filtros.valores.push(`%${escaparLike(valor)}%`);
}

function escaparLike(valor: string) {
  return valor.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

function clausulaWhere(filtros: Filtros) {
  return filtros.sql.length ? `WHERE ${filtros.sql.join(" AND ")}` : "";
}

function normalizarMes(valor: string | null) {
  if (!valor) return "";
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 12 ? String(numero).padStart(2, "0") : valor;
}

function ordemRepresentantes(valor: string | null, direcaoRecebida: string | null) {
  const direcao = direcaoRecebida === "desc" ? "DESC" : "ASC";
  if (valor === "turno") return `r.turno ${direcao}, r.turma_normalizada ${direcao}, r.ordem ${direcao}, r.nome COLLATE NOCASE ${direcao}`;
  if (valor === "nome") return `r.nome COLLATE NOCASE ${direcao}, r.turma_normalizada ${direcao}, r.ordem ${direcao}`;
  return `r.turma_normalizada ${direcao}, r.funcao ${direcao}, r.ordem ${direcao}, r.nome COLLATE NOCASE ${direcao}`;
}

async function buscarPorIdOuSlug(tabela: "eventos_internos" | "campeonatos" | "reunioes", identificador: string | number, filtro: string) {
  const recebido = String(identificador);
  const id = /^\d+$/.test(recebido) ? Number(recebido) : 0;
  return getD1().prepare(`SELECT * FROM ${tabela} WHERE (${id ? "id = ?" : "slug = ?"}) AND ${filtro}`)
    .bind(id || recebido).first<Linha>();
}

async function exigirExistente(tabela: string, id: number, mensagem: string) {
  const tabelas = new Set(["eventos_internos", "documentos_eventos", "campeonatos", "participantes_campeonato", "fases_campeonato", "partidas", "documentos_campeonato", "atualizacoes_campeonato", "representantes", "reunioes", "itens_reuniao", "votacoes_reuniao", "documentos_reuniao", "presencas_reuniao"]);
  if (!tabelas.has(tabela)) throw new Error("Tabela fora da lista permitida.");
  const linha = await getD1().prepare(`SELECT id FROM ${tabela} WHERE id = ?`).bind(id).first();
  if (!linha) throw new ErroEventos(mensagem, 404);
}

async function arquivarRegistro(tabela: "eventos_internos" | "campeonatos" | "representantes" | "reunioes", id: number) {
  await getD1().prepare(`UPDATE ${tabela} SET ativo = 0, arquivado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();
}

async function exigirRascunhoExcluivel(
  tabela: "eventos_internos" | "campeonatos" | "representantes" | "reunioes",
  idRecebido: unknown,
  mensagemNaoEncontrado: string,
) {
  const id = idPositivo(idRecebido, "rascunho");
  const linha = await getD1().prepare(`SELECT id, publicado FROM ${tabela} WHERE id = ?`).bind(id).first<Linha>();
  if (!linha) throw new ErroEventos(mensagemNaoEncontrado, 404);
  if (bool(linha.publicado)) throw new ErroEventos("Somente registros que nunca foram publicados podem ser excluídos. Arquive publicações para ocultá-las do portal.", 409);
  return id;
}

function converterErroUnico(erro: unknown, mensagem: string): never {
  if (erro instanceof Error && /unique constraint|constraint failed/i.test(erro.message)) throw new ErroEventos(mensagem, 409);
  throw erro;
}

function tituloDoArquivo(url: string, tipo: string) {
  try {
    const caminho = url.startsWith("/") ? new URL(url, "https://portal.local").pathname : new URL(url).pathname;
    const nome = decodeURIComponent(caminho.split("/").filter(Boolean).at(-1) ?? "").replace(/[-_]+/g, " ").trim();
    return nome.slice(0, 180) || (tipo === "imagem" ? "Imagem" : "Documento");
  } catch {
    return tipo === "imagem" ? "Imagem" : "Documento";
  }
}

function string(valor: unknown) { return valor === null || valor === undefined ? "" : String(valor); }
function numero(valor: unknown) { const resultado = Number(valor); return Number.isFinite(resultado) ? resultado : 0; }
function bool(valor: unknown) { return valor === true || Number(valor) === 1; }
function binario(valor: boolean) { return valor ? 1 : 0; }
function nuloNumero(valor: unknown) { return valor === null || valor === undefined ? null : numero(valor); }
function nuloString(valor: unknown) { return valor === null || valor === undefined || valor === "" ? null : String(valor); }

// ---------------------------------------------------------------------------
// Interclasses e chaves

export async function listarCampeonatos(parametros: URLSearchParams, todos = false): Promise<ListaPaginada<CampeonatoPublico | CampeonatoAdministrativo>> {
  const { pagina, limite, offset } = paginacao(parametros);
  const filtros: Filtros = { sql: [], valores: [] };
  const situacaoRecebida = textoFiltro(parametros.get("situacao"), 40);
  const situacao = situacaoRecebida === "acontecendo_agora" ? "em_andamento" : situacaoRecebida;
  if (!todos) {
    filtros.sql.push("c.publicado = 1", "c.ativo = 1", "c.arquivado_em IS NULL");
    if (situacao === "arquivado") filtros.sql.push("1 = 0");
  }
  if (situacao === "arquivado") filtros.sql.push("c.arquivado_em IS NOT NULL");
  else if (situacao) adicionarIgual(filtros, "c.situacao", situacao === "agendado" ? "proximo" : situacao);
  adicionarIgualSePresente(filtros, "CAST(c.ano AS TEXT)", parametros.get("ano"), 4);
  adicionarIgualSePresente(filtros, "c.modalidade", parametros.get("modalidade"), 100);
  adicionarIgualSePresente(filtros, "c.categoria", parametros.get("categoria"), 100);
  adicionarIgualSePresente(filtros, "c.turno", parametros.get("turno"), 20);
  const busca = textoFiltro(parametros.get("busca"), 120);
  if (busca) {
    filtros.sql.push("(c.nome LIKE ? ESCAPE '\\' OR c.edicao LIKE ? ESCAPE '\\' OR c.modalidade LIKE ? ESCAPE '\\')");
    const termo = `%${escaparLike(busca)}%`;
    filtros.valores.push(termo, termo, termo);
  }
  const where = clausulaWhere(filtros);
  const d1 = getD1();
  const [linhas, contagem] = await d1.batch([
    d1.prepare(`SELECT c.* FROM campeonatos c ${where}
      ORDER BY CASE c.situacao WHEN 'em_andamento' THEN 0 WHEN 'proximo' THEN 1 ELSE 2 END,
        CASE WHEN c.data_inicial = '' THEN 1 ELSE 0 END,
        CASE WHEN c.situacao IN ('proximo', 'em_andamento') THEN c.data_inicial END ASC,
        CASE WHEN c.situacao NOT IN ('proximo', 'em_andamento') THEN c.data_inicial END DESC, c.id DESC
      LIMIT ? OFFSET ?`).bind(...filtros.valores, limite, offset),
    d1.prepare(`SELECT COUNT(*) AS total FROM campeonatos c ${where}`).bind(...filtros.valores),
  ]);
  const itens = await Promise.all((linhas.results as Linha[]).map((linha) => formatarCampeonatoCompleto(linha, todos)));
  return listaPaginada(itens, pagina, limite, totalDaContagem(contagem.results));
}

export async function obterCampeonato(identificador: string | number, todos = false): Promise<DetalheCampeonato<CampeonatoPublico | CampeonatoAdministrativo>> {
  const linha = await buscarPorIdOuSlug("campeonatos", identificador, todos
    ? "1 = 1"
    : "publicado = 1 AND ativo = 1 AND arquivado_em IS NULL");
  if (!linha) throw new ErroEventos("Interclasse não encontrado.", 404);
  const campeonatoId = numero(linha.id);
  const item = await formatarCampeonatoCompleto(linha, todos);
  const chaveVisivel = todos || bool(linha.chave_publicada);
  const d1 = getD1();
  const filtroPublicoFase = todos ? "AND ativo = 1" : "AND publicado = 1 AND ativo = 1";
  const filtroPublicoPartida = todos ? "AND p.ativo = 1" : "AND p.publicado = 1 AND p.ativo = 1";
  const [participantesResultado, fasesResultado, partidasResultado, documentosResultado, atualizacoesResultado] = await d1.batch([
    chaveVisivel
      ? d1.prepare("SELECT * FROM participantes_campeonato WHERE campeonato_id = ? AND ativo = 1 ORDER BY posicao_inicial, id").bind(campeonatoId)
      : d1.prepare("SELECT * FROM participantes_campeonato WHERE 0 = 1"),
    chaveVisivel
      ? d1.prepare(`SELECT * FROM fases_campeonato WHERE campeonato_id = ? ${filtroPublicoFase} ORDER BY ordem, id`).bind(campeonatoId)
      : d1.prepare("SELECT * FROM fases_campeonato WHERE 0 = 1"),
    chaveVisivel
      ? d1.prepare(`SELECT p.*, f.nome AS fase_nome, c.slug AS campeonato_slug, c.nome AS campeonato_nome
          FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
          INNER JOIN campeonatos c ON c.id = p.campeonato_id
          WHERE p.campeonato_id = ? ${filtroPublicoPartida} ${todos ? "" : "AND f.publicado = 1 AND f.ativo = 1"}
          ORDER BY f.ordem, p.ordem, p.id`).bind(campeonatoId)
      : d1.prepare("SELECT * FROM partidas WHERE 0 = 1"),
    d1.prepare(`SELECT * FROM documentos_campeonato WHERE campeonato_id = ? AND ativo = 1 ${todos ? "" : "AND publicado = 1"} ORDER BY ordem, id`).bind(campeonatoId),
    d1.prepare(`SELECT * FROM atualizacoes_campeonato WHERE campeonato_id = ? AND ativo = 1 ${todos ? "" : "AND publicado = 1"} ORDER BY data DESC, ordem, id`).bind(campeonatoId),
  ]);
  const participantes = (participantesResultado.results as Linha[]).map((participante) => formatarParticipante(participante, todos));
  const partidas = (partidasResultado.results as Linha[]).map((partida) => formatarPartida(partida, todos));
  const fases = (fasesResultado.results as Linha[]).map((fase) => ({
    ...formatarFase(fase, todos),
    partidas: partidas.filter((partida) => partida.faseId === numero(fase.id)),
  }));
  return {
    item,
    participantes,
    fases,
    partidas,
    documentos: (documentosResultado.results as Linha[]).map((documento) => formatarDocumento(documento, todos)),
    atualizacoes: (atualizacoesResultado.results as Linha[]).map((atualizacao) => formatarAtualizacao(atualizacao, todos)),
  };
}

export async function criarCampeonato(valor: unknown) {
  const dados = validarCampeonato(valor);
  if (!dados.slug) throw new ErroEventos("Não foi possível criar o endereço do campeonato.");
  let linha: Linha | null = null;
  try {
    linha = await getD1().prepare(`${sqlInserirCampeonato} RETURNING *`).bind(...valoresCampeonato(dados)).first<Linha>();
  } catch (erro) {
    converterErroUnico(erro, "Já existe um campeonato com esse endereço.");
  }
  if (!linha) throw new ErroEventos("Não foi possível criar o campeonato.", 500);
  const participantes = (valor as Record<string, unknown>).participantes;
  if (Array.isArray(participantes)) {
    for (const participante of participantes) await criarParticipanteCampeonato(linha.id, participante);
  }
  return (await obterCampeonato(numero(linha.id), true)).item;
}

export async function atualizarCampeonato(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "campeonato");
  const existente = (await obterCampeonato(id, true)).item as CampeonatoAdministrativo;
  const recebido = valor as Record<string, unknown>;
  const dados = validarCampeonato({ ...existente, ...recebido });
  try {
    const d1 = getD1();
    const comandos = [d1.prepare(`${sqlAtualizarCampeonato} WHERE id = ?`).bind(...valoresCampeonato(dados), id)];
    if (!existente.chavePublicada && dados.chavePublicada) {
      // o comando do painel publica a chave como uma unidade, sem deixar filhos invisíveis
      comandos.push(
        d1.prepare("UPDATE fases_campeonato SET publicado = 1, atualizado_em = CURRENT_TIMESTAMP WHERE campeonato_id = ? AND ativo = 1").bind(id),
        d1.prepare("UPDATE partidas SET publicado = 1, atualizado_em = CURRENT_TIMESTAMP WHERE campeonato_id = ? AND ativo = 1").bind(id),
      );
    }
    await d1.batch(comandos);
  } catch (erro) {
    converterErroUnico(erro, "Já existe um campeonato com esse endereço.");
  }
  if (booleano(recebido.arquivado, false)) await arquivarRegistro("campeonatos", id);
  return (await obterCampeonato(id, true)).item;
}

export async function arquivarCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "campeonato");
  await exigirExistente("campeonatos", id, "Interclasse não encontrado.");
  await arquivarRegistro("campeonatos", id);
  return { arquivado: true, id };
}

export async function excluirRascunhoCampeonato(idRecebido: unknown) {
  const id = await exigirRascunhoExcluivel("campeonatos", idRecebido, "Interclasse não encontrado.");
  const d1 = getD1();
  await d1.batch([
    d1.prepare("UPDATE partidas SET proxima_partida_id = NULL, proxima_posicao = '' WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM historico_resultados_partida WHERE partida_id IN (SELECT id FROM partidas WHERE campeonato_id = ?)").bind(id),
    d1.prepare("DELETE FROM campeoes_campeonato WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM partidas WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM participantes_campeonato WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM fases_campeonato WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM documentos_campeonato WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM atualizacoes_campeonato WHERE campeonato_id = ?").bind(id),
    d1.prepare("DELETE FROM campeonatos WHERE id = ?").bind(id),
  ]);
  return { excluido: true, id };
}

export async function criarParticipanteCampeonato(campeonatoIdRecebido: unknown, valor: unknown) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  await exigirExistente("campeonatos", campeonatoId, "Interclasse não encontrado.");
  const dados = validarParticipante(valor);
  await validarTurmaRelacionada(dados.turmaAtividadeId);
  if (dados.ativo) await impedirParticipanteDuplicado(campeonatoId, dados.nomeNormalizado);
  const linha = await getD1().prepare(`${sqlInserirParticipante} RETURNING *`)
    .bind(campeonatoId, ...valoresParticipante(dados)).first<Linha>();
  if (!linha) throw new ErroEventos("Não foi possível criar o participante.", 500);
  return formatarParticipante(linha);
}

export async function atualizarParticipanteCampeonato(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "participante");
  const d1 = getD1();
  const linha = await d1.prepare("SELECT * FROM participantes_campeonato WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Participante não encontrado.", 404);
  const existente = formatarParticipante(linha);
  const dados = validarParticipante({ ...existente, ...(valor as object) });
  await validarTurmaRelacionada(dados.turmaAtividadeId);
  if (dados.ativo) await impedirParticipanteDuplicado(numero(linha.campeonato_id), dados.nomeNormalizado, id);
  const nomeAnterior = nomeLinhaParticipante(linha);
  const nomeAtual = dados.nomeExibicao || dados.nome;
  const comandos: D1PreparedStatement[] = [
    d1.prepare(`${sqlAtualizarParticipante} WHERE id = ?`).bind(...valoresParticipante(dados), id),
  ];
  if (nomeAnterior !== nomeAtual) {
    comandos.push(
      d1.prepare(`UPDATE partidas SET
        participante_a_nome = CASE WHEN participante_a_id = ? THEN ? ELSE participante_a_nome END,
        participante_b_nome = CASE WHEN participante_b_id = ? THEN ? ELSE participante_b_nome END,
        vencedor_nome = CASE WHEN vencedor_id = ? THEN ? ELSE vencedor_nome END,
        atualizado_em = CURRENT_TIMESTAMP
        WHERE ativo = 1 AND (participante_a_id = ? OR participante_b_id = ? OR vencedor_id = ?)`)
        .bind(id, nomeAtual, id, nomeAtual, id, nomeAtual, id, id, id),
      d1.prepare("UPDATE campeoes_campeonato SET nome = ? WHERE participante_id = ?").bind(nomeAtual, id),
    );
  }
  await d1.batch(comandos);
  const atualizado = await d1.prepare("SELECT * FROM participantes_campeonato WHERE id = ?").bind(id).first<Linha>();
  return formatarParticipante(atualizado!);
}

export async function arquivarParticipanteCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "participante");
  await exigirExistente("participantes_campeonato", id, "Participante não encontrado.");
  const referencias = await getD1().prepare(`SELECT COUNT(*) AS total FROM partidas
    WHERE participante_a_id = ? OR participante_b_id = ? OR vencedor_id = ?`).bind(id, id, id).first<Linha>();
  await getD1().prepare(`UPDATE participantes_campeonato SET ativo = 0, arquivado_em = CURRENT_TIMESTAMP,
    atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();
  return { arquivado: true, id, referenciasHistoricas: numero(referencias?.total) };
}

export async function criarFaseCampeonato(campeonatoIdRecebido: unknown, valor: unknown) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  await exigirExistente("campeonatos", campeonatoId, "Interclasse não encontrado.");
  const dados = validarFase(valor);
  let linha: Linha | null = null;
  try {
    linha = await getD1().prepare(`${sqlInserirFase} RETURNING *`).bind(campeonatoId, ...valoresFase(dados)).first<Linha>();
  } catch (erro) {
    converterErroUnico(erro, "Já existe uma fase nessa ordem.");
  }
  if (!linha) throw new ErroEventos("Não foi possível criar a fase.", 500);
  return formatarFase(linha);
}

export async function atualizarFaseCampeonato(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "fase");
  const linha = await getD1().prepare("SELECT * FROM fases_campeonato WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Fase não encontrada.", 404);
  const dados = validarFase({ ...formatarFase(linha), ...(valor as object) });
  try {
    await getD1().prepare(`${sqlAtualizarFase} WHERE id = ?`).bind(...valoresFase(dados), id).run();
  } catch (erro) {
    converterErroUnico(erro, "Já existe uma fase nessa ordem.");
  }
  const atualizada = await getD1().prepare("SELECT * FROM fases_campeonato WHERE id = ?").bind(id).first<Linha>();
  return formatarFase(atualizada!);
}

export async function arquivarFaseCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "fase");
  await exigirExistente("fases_campeonato", id, "Fase não encontrada.");
  const resultados = await getD1().prepare("SELECT COUNT(*) AS total FROM partidas WHERE fase_id = ? AND vencedor_id IS NOT NULL").bind(id).first<Linha>();
  await getD1().batch([
    getD1().prepare("UPDATE fases_campeonato SET ativo = 0, ordem = -id, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
    getD1().prepare("UPDATE partidas SET ativo = 0, arquivado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE fase_id = ?").bind(id),
  ]);
  return { arquivado: true, id, resultadosPreservados: numero(resultados?.total) };
}

export async function listarPartidasCampeonato(campeonatoIdRecebido: unknown, todos = false) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  const filtro = todos ? "" : `AND p.publicado = 1 AND p.ativo = 1 AND f.publicado = 1 AND f.ativo = 1
    AND c.publicado = 1 AND c.ativo = 1 AND c.arquivado_em IS NULL AND c.chave_publicada = 1`;
  const resultado = await getD1().prepare(`SELECT p.*, f.nome AS fase_nome, c.slug AS campeonato_slug, c.nome AS campeonato_nome
    FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
    INNER JOIN campeonatos c ON c.id = p.campeonato_id
    WHERE p.campeonato_id = ? ${filtro} ORDER BY f.ordem, p.ordem, p.id`).bind(campeonatoId).all<Linha>();
  return resultado.results.map((linha) => formatarPartida(linha, todos));
}

export async function obterPartida(campeonatoIdentificador: string | number, partidaIdentificador: string | number, todos = false) {
  const campeonato = await buscarPorIdOuSlug("campeonatos", campeonatoIdentificador, todos
    ? "1 = 1"
    : "publicado = 1 AND chave_publicada = 1 AND ativo = 1 AND arquivado_em IS NULL");
  if (!campeonato) throw new ErroEventos("Interclasse não encontrado.", 404);
  const partidaId = idPositivo(partidaIdentificador, "partida");
  const filtro = todos ? "" : "AND p.publicado = 1 AND p.ativo = 1 AND f.publicado = 1 AND f.ativo = 1";
  const d1 = getD1();
  const linha = await d1.prepare(`SELECT p.*, f.nome AS fase_nome, c.slug AS campeonato_slug, c.nome AS campeonato_nome
    FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
    INNER JOIN campeonatos c ON c.id = p.campeonato_id
    WHERE p.id = ? AND p.campeonato_id = ? ${filtro}`).bind(partidaId, campeonato.id).first<Linha>();
  if (!linha) throw new ErroEventos("Partida não encontrada.", 404);
  const [historico, proxima, atualizacoes] = await d1.batch([
    d1.prepare(`SELECT resultado_anterior_json, resultado_novo_json, criado_em
      FROM historico_resultados_partida WHERE partida_id = ? ORDER BY criado_em DESC, id DESC`).bind(partidaId),
    d1.prepare(`SELECT p.*, f.nome AS fase_nome, c.slug AS campeonato_slug, c.nome AS campeonato_nome
      FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
      INNER JOIN campeonatos c ON c.id = p.campeonato_id
      WHERE p.id = ? AND p.campeonato_id = ? AND p.publicado = 1 AND p.ativo = 1
        AND f.publicado = 1 AND f.ativo = 1 AND c.publicado = 1 AND c.chave_publicada = 1
        AND c.ativo = 1 AND c.arquivado_em IS NULL LIMIT 1`).bind(nuloNumero(linha.proxima_partida_id) ?? -1, campeonato.id),
    d1.prepare(`SELECT * FROM atualizacoes_campeonato
      WHERE campeonato_id = ? AND publicado = 1 AND ativo = 1 ORDER BY data DESC, ordem, id`).bind(campeonato.id),
  ]);
  const linhaProxima = (proxima.results as Linha[])[0];
  return {
    ...formatarPartida(linha, todos),
    historicoDatas: formatarHistoricoDatas(historico.results as Linha[]),
    proximaPartida: linhaProxima ? formatarPartida(linhaProxima, false) as PartidaPublica : null,
    atualizacoes: (atualizacoes.results as Linha[]).map((atualizacao) => formatarAtualizacao(atualizacao, false)),
  };
}

export async function criarPartidaCampeonato(campeonatoIdRecebido: unknown, valor: unknown) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  const dados = validarPartida(valor);
  await validarReferenciasPartida(campeonatoId, 0, dados);
  let linha: Linha | null = null;
  try {
    linha = await getD1().prepare(`${sqlInserirPartida} RETURNING *`)
      .bind(campeonatoId, ...await valoresPartida(campeonatoId, dados)).first<Linha>();
  } catch (erro) {
    converterErroUnico(erro, "Já existe uma partida nessa ordem da fase.");
  }
  if (!linha) throw new ErroEventos("Não foi possível criar a partida.", 500);
  return obterPartida(campeonatoId, numero(linha.id), true);
}

export async function atualizarPartidaCampeonato(
  idRecebido: unknown,
  valor: unknown,
  confirmarImpacto = false,
  motivo = "",
) {
  const id = idPositivo(idRecebido, "partida");
  const d1 = getD1();
  const linha = await d1.prepare("SELECT * FROM partidas WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Partida não encontrada.", 404);
  const campeonatoId = numero(linha.campeonato_id);
  const { recebido, dados } = validarAlteracaoPartida(linha, valor);
  await validarReferenciasPartida(campeonatoId, id, dados);
  const vinculoMudou = dados.proximaPartidaId !== nuloNumero(linha.proxima_partida_id)
    || dados.proximaPosicao !== string(linha.proxima_posicao);
  if (vinculoMudou && nuloNumero(linha.vencedor_id)) {
    return (await atualizarVinculoPartidaComResultado(
      linha, dados, confirmarImpacto, textoFiltro(motivo || string(recebido.motivo), 1000),
    )).item;
  }
  const resultadoMudou = resultadoDivergiu(linha, dados);
  if (resultadoMudou) {
    // toda alteração de resultado passa pelo histórico e pela análise de impacto
    return (await registrarResultadoPartida(
      id, recebido, confirmarImpacto, motivo || string(recebido.motivo),
    )).item;
  }
  const agendaMudou = agendaDivergiu(linha, dados);
  const valores = await valoresPartida(campeonatoId, dados);
  const comandos: D1PreparedStatement[] = [];
  if (agendaMudou) {
    comandos.push(d1.prepare(`INSERT INTO historico_resultados_partida
      (partida_id, resultado_anterior_json, resultado_novo_json, impacto_json, motivo)
      VALUES (?, ?, ?, '[]', ?)`).bind(
      id,
      JSON.stringify(resumoAuditoriaLinha(linha)),
      JSON.stringify(resumoAuditoria(dados, valores)),
      "Alteração de data, horário ou local",
    ));
  }
  comandos.push(d1.prepare(`${sqlAtualizarPartida} WHERE id = ?`).bind(...valores, id));
  try {
    await d1.batch(comandos);
  } catch (erro) {
    converterErroUnico(erro, "Já existe uma partida nessa ordem da fase.");
  }
  return obterPartida(campeonatoId, id, true);
}

async function atualizarVinculoPartidaComResultado(
  linha: Linha,
  dados: ReturnType<typeof validarPartida>,
  confirmarImpacto: boolean,
  motivo: string,
) {
  const d1 = getD1();
  const partidaId = numero(linha.id);
  const campeonatoId = numero(linha.campeonato_id);
  const vencedorAnteriorId = nuloNumero(linha.vencedor_id);
  const vencedorNovoId = dados.vencedorId;
  const idsAlvos = [...new Set([
    nuloNumero(linha.proxima_partida_id),
    dados.proximaPartidaId,
  ].filter((id): id is number => id !== null))];
  const estados = new Map<number, {
    linha: Linha;
    participanteAId: number | null;
    participanteBId: number | null;
    participanteANome: string;
    participanteBNome: string;
    alterado: boolean;
  }>();
  for (const alvoId of idsAlvos) {
    const alvo = await d1.prepare(`SELECT p.*, f.nome AS fase_nome FROM partidas p
      INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.id = ? AND p.campeonato_id = ? AND p.ativo = 1`).bind(alvoId, campeonatoId).first<Linha>();
    if (!alvo) continue;
    estados.set(alvoId, {
      linha: alvo,
      participanteAId: nuloNumero(alvo.participante_a_id),
      participanteBId: nuloNumero(alvo.participante_b_id),
      participanteANome: string(alvo.participante_a_nome),
      participanteBNome: string(alvo.participante_b_nome),
      alterado: false,
    });
  }

  const proximaAnteriorId = nuloNumero(linha.proxima_partida_id);
  const posicaoAnterior = string(linha.proxima_posicao);
  const anterior = proximaAnteriorId ? estados.get(proximaAnteriorId) : undefined;
  if (anterior && vencedorAnteriorId && (posicaoAnterior === "a" || posicaoAnterior === "b")) {
    const chaveId = posicaoAnterior === "a" ? "participanteAId" : "participanteBId";
    const chaveNome = posicaoAnterior === "a" ? "participanteANome" : "participanteBNome";
    if (anterior[chaveId] === vencedorAnteriorId) {
      anterior[chaveId] = null;
      anterior[chaveNome] = "";
      anterior.alterado = true;
    }
  }

  const nova = dados.proximaPartidaId ? estados.get(dados.proximaPartidaId) : undefined;
  if (nova && vencedorNovoId && (dados.proximaPosicao === "a" || dados.proximaPosicao === "b")) {
    const chaveId = dados.proximaPosicao === "a" ? "participanteAId" : "participanteBId";
    const chaveNome = dados.proximaPosicao === "a" ? "participanteANome" : "participanteBNome";
    const vencedorNome = await nomeParticipante(vencedorNovoId);
    if (nova[chaveId] !== vencedorNovoId || nova[chaveNome] !== vencedorNome) {
      nova[chaveId] = vencedorNovoId;
      nova[chaveNome] = vencedorNome;
      nova.alterado = true;
    }
  }

  const afetadas = [...estados.values()].filter((estado) => estado.alterado);
  const impacto: ImpactoResultado = {
    exigeConfirmacao: true,
    partidasAfetadas: afetadas.map((estado) => ({
      id: numero(estado.linha.id),
      fase: string(estado.linha.fase_nome),
      participanteAtual: [string(estado.linha.participante_a_nome), string(estado.linha.participante_b_nome)].filter(Boolean).join(" × "),
      resultadoPosteriorPreenchido: resultadoPreenchido(estado.linha),
    })),
    mensagem: "A alteração muda o avanço de um resultado já registrado. Confirme para atualizar a chave e preservar o histórico.",
  };
  if (!confirmarImpacto) throw new ErroEventos(impacto.mensagem, 409, impacto);
  if (resultadoConsolidado(linha) && resultadoDivergiu(linha, dados) && !motivo) {
    throw new ErroEventos("Informe o motivo da correção do resultado.");
  }

  const valores = await valoresPartida(campeonatoId, dados);
  const motivoHistorico = motivo || "Alteração confirmada do vínculo de avanço";
  const comandos: D1PreparedStatement[] = [
    d1.prepare(`INSERT INTO historico_resultados_partida
      (partida_id, resultado_anterior_json, resultado_novo_json, impacto_json, motivo)
      VALUES (?, ?, ?, ?, ?)`).bind(
      partidaId,
      JSON.stringify(resumoAuditoriaLinha(linha)),
      JSON.stringify(resumoAuditoria(dados, valores)),
      JSON.stringify(impacto.partidasAfetadas),
      motivoHistorico,
    ),
    d1.prepare(`${sqlAtualizarPartida} WHERE id = ?`).bind(...valores, partidaId),
  ];
  const visitados = new Set<number>();
  const reservados = new Set(estados.keys());
  for (const estado of afetadas) {
    const invalidaResultado = resultadoPreenchido(estado.linha);
    if (invalidaResultado) {
      comandos.push(d1.prepare(`INSERT INTO historico_resultados_partida
        (partida_id, resultado_anterior_json, resultado_novo_json, impacto_json, motivo)
        VALUES (?, ?, ?, ?, ?)`).bind(
        estado.linha.id,
        JSON.stringify(resumoAuditoriaLinha(estado.linha)),
        JSON.stringify({
          participanteAId: estado.participanteAId,
          participanteBId: estado.participanteBId,
          placarA: null, placarB: null, vencedorId: null, formaVitoria: "",
          situacao: string(estado.linha.data) ? "agendada" : "data_a_definir",
        }),
        JSON.stringify([{ origemPartidaId: partidaId }]),
        motivoHistorico,
      ));
    }
    comandos.push(d1.prepare(`UPDATE partidas SET participante_a_id = ?, participante_a_nome = ?,
      participante_b_id = ?, participante_b_nome = ?,
      placar_a = CASE WHEN ? THEN NULL ELSE placar_a END,
      placar_b = CASE WHEN ? THEN NULL ELSE placar_b END,
      vencedor_id = CASE WHEN ? THEN NULL ELSE vencedor_id END,
      vencedor_nome = CASE WHEN ? THEN '' ELSE vencedor_nome END,
      forma_vitoria = CASE WHEN ? THEN '' ELSE forma_vitoria END,
      situacao = CASE WHEN ? THEN CASE WHEN data = '' THEN 'data_a_definir' ELSE 'agendada' END ELSE situacao END,
      atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(
      estado.participanteAId, estado.participanteANome,
      estado.participanteBId, estado.participanteBNome,
      binario(invalidaResultado), binario(invalidaResultado), binario(invalidaResultado),
      binario(invalidaResultado), binario(invalidaResultado), binario(invalidaResultado), estado.linha.id,
    ));
    if (invalidaResultado) {
      await adicionarLimpezaAvancoPosterior(d1, estado.linha, comandos, visitados, reservados, partidaId, motivoHistorico);
    }
  }
  comandos.push(comandoRecalcularFaseAtual(d1, campeonatoId));
  await d1.batch(comandos);
  return { item: await obterPartida(campeonatoId, partidaId, true), impacto };
}

export async function arquivarPartidaCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "partida");
  await exigirExistente("partidas", id, "Partida não encontrada.");
  const dependentes = await getD1().prepare("SELECT COUNT(*) AS total FROM partidas WHERE proxima_partida_id = ?").bind(id).first<Linha>();
  if (numero(dependentes?.total)) throw new ErroEventos("Remova primeiro os vínculos de avanço para esta partida.", 409);
  await getD1().prepare("UPDATE partidas SET ativo = 0, arquivado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
  return { arquivado: true, id };
}

export async function gerarChaveCampeonato(campeonatoIdRecebido: unknown, confirmar = false) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  const campeonato = (await obterCampeonato(campeonatoId, true)).item as CampeonatoAdministrativo;
  if (campeonato.formato !== "mata_mata") throw new ErroEventos("A geração automática está disponível para o formato mata-mata.");
  const d1 = getD1();
  const participantesResultado = await d1.prepare(`SELECT id, COALESCE(NULLIF(nome_exibicao, ''), nome) AS nome,
    posicao_inicial FROM participantes_campeonato WHERE campeonato_id = ? AND ativo = 1 ORDER BY posicao_inicial, id`)
    .bind(campeonatoId).all<Linha>();
  const participantes = participantesResultado.results.map((linha) => ({
    id: numero(linha.id), nome: string(linha.nome), posicaoInicial: numero(linha.posicao_inicial),
  }));
  const fases = planejarChaveMataMata(participantes);
  const existentes = await d1.prepare(`SELECT
    (SELECT COUNT(*) FROM fases_campeonato WHERE campeonato_id = ? AND ativo = 1) AS fases,
    (SELECT COUNT(*) FROM partidas WHERE campeonato_id = ? AND ativo = 1) AS partidas,
    (SELECT COUNT(*) FROM partidas WHERE campeonato_id = ? AND ativo = 1 AND vencedor_id IS NOT NULL) AS resultados`)
    .bind(campeonatoId, campeonatoId, campeonatoId).first<Linha>();
  if ((numero(existentes?.fases) || numero(existentes?.partidas)) && !confirmar) {
    throw new ErroEventos("Já existe uma chave. Confirme para arquivá-la e gerar outra.", 409, {
      exigeConfirmacao: true,
      fases: numero(existentes?.fases),
      partidas: numero(existentes?.partidas),
      resultadosPreservados: numero(existentes?.resultados),
    });
  }

  const comandos: D1PreparedStatement[] = [];
  if (numero(existentes?.fases) || numero(existentes?.partidas)) {
    comandos.push(
      d1.prepare("UPDATE partidas SET ativo = 0, arquivado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE campeonato_id = ? AND ativo = 1").bind(campeonatoId),
      d1.prepare("UPDATE fases_campeonato SET ativo = 0, ordem = -id, atualizado_em = CURRENT_TIMESTAMP WHERE campeonato_id = ? AND ativo = 1").bind(campeonatoId),
    );
  }
  for (const fase of fases) {
    comandos.push(d1.prepare(`INSERT INTO fases_campeonato (campeonato_id, nome, ordem, tipo, quantidade_jogos, publicado, ativo)
      VALUES (?, ?, ?, 'eliminatoria', ?, 0, 1)`).bind(campeonatoId, fase.nome, fase.ordem, fase.jogos.length));
  }
  for (const fase of fases) {
    for (const jogo of fase.jogos) {
      const automatico = jogo.vencedorAutomatico;
      comandos.push(d1.prepare(`INSERT INTO partidas (
        campeonato_id, fase_id, rodada, ordem, participante_a_id, participante_b_id,
        participante_a_nome, participante_b_nome, vencedor_id, vencedor_nome, forma_vitoria,
        situacao, placar_publicado, proxima_partida_id, proxima_posicao, publicado, ativo
      ) VALUES (?,
        (SELECT id FROM fases_campeonato WHERE campeonato_id = ? AND ordem = ? AND ativo = 1),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0,
        (SELECT p2.id FROM partidas p2 INNER JOIN fases_campeonato f2 ON f2.id = p2.fase_id
          WHERE p2.campeonato_id = ? AND f2.ordem = ? AND p2.ordem = ? AND p2.ativo = 1),
        ?, 0, 1
      )`).bind(
        campeonatoId, campeonatoId, fase.ordem, fase.nome, jogo.ordem,
        jogo.participanteA?.id ?? null, jogo.participanteB?.id ?? null,
        jogo.participanteA?.nome ?? "", jogo.participanteB?.nome ?? "",
        automatico?.id ?? null, automatico?.nome ?? "", automatico ? "bye" : "",
        automatico ? "encerrada" : "data_a_definir",
        campeonatoId, jogo.proximaFaseOrdem ?? -1, jogo.proximaPartidaOrdem ?? -1, jogo.proximaPosicao,
      ));
    }
  }
  // como os INSERTs acima são executados em ordem, corrige os vínculos que apontavam para jogos ainda não criados
  for (const fase of fases.slice(0, -1)) {
    for (const jogo of fase.jogos) {
      comandos.push(d1.prepare(`UPDATE partidas SET
        proxima_partida_id = (SELECT p2.id FROM partidas p2 INNER JOIN fases_campeonato f2 ON f2.id = p2.fase_id
          WHERE p2.campeonato_id = ? AND f2.ordem = ? AND p2.ordem = ? AND p2.ativo = 1),
        proxima_posicao = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE campeonato_id = ? AND fase_id = (
          SELECT id FROM fases_campeonato WHERE campeonato_id = ? AND ordem = ? AND ativo = 1
        ) AND ordem = ? AND ativo = 1`).bind(
        campeonatoId, jogo.proximaFaseOrdem, jogo.proximaPartidaOrdem, jogo.proximaPosicao,
        campeonatoId, campeonatoId, fase.ordem, jogo.ordem,
      ));
      if (jogo.vencedorAutomatico) {
        const colunaId = jogo.proximaPosicao === "a" ? "participante_a_id" : "participante_b_id";
        const colunaNome = jogo.proximaPosicao === "a" ? "participante_a_nome" : "participante_b_nome";
        comandos.push(d1.prepare(`UPDATE partidas SET ${colunaId} = ?, ${colunaNome} = ?, atualizado_em = CURRENT_TIMESTAMP
          WHERE campeonato_id = ? AND fase_id = (
            SELECT id FROM fases_campeonato WHERE campeonato_id = ? AND ordem = ? AND ativo = 1
          ) AND ordem = ? AND ativo = 1`).bind(
          jogo.vencedorAutomatico.id, jogo.vencedorAutomatico.nome,
          campeonatoId, campeonatoId, jogo.proximaFaseOrdem, jogo.proximaPartidaOrdem,
        ));
      }
    }
  }
  comandos.push(d1.prepare(`UPDATE campeonatos SET fase_atual = ?, chave_publicada = 0,
    atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(fases[0].nome, campeonatoId));
  await d1.batch(comandos);
  return obterCampeonato(campeonatoId, true);
}

export async function registrarResultadoPartida(
  partidaIdRecebido: unknown,
  valor: unknown,
  confirmarImpacto = false,
  motivo = "",
) {
  const partidaId = idPositivo(partidaIdRecebido, "partida");
  const d1 = getD1();
  const linha = await d1.prepare("SELECT * FROM partidas WHERE id = ? AND ativo = 1").bind(partidaId).first<Linha>();
  if (!linha) throw new ErroEventos("Partida não encontrada.", 404);
  const campeonatoId = numero(linha.campeonato_id);
  const { dados } = validarAlteracaoPartida(linha, valor);
  await validarReferenciasPartida(campeonatoId, partidaId, dados);
  const motivoNormalizado = textoFiltro(motivo, 1000);
  const vinculoMudou = dados.proximaPartidaId !== nuloNumero(linha.proxima_partida_id)
    || dados.proximaPosicao !== string(linha.proxima_posicao);
  if (vinculoMudou && nuloNumero(linha.vencedor_id)) {
    return atualizarVinculoPartidaComResultado(linha, dados, confirmarImpacto, motivoNormalizado);
  }
  if (resultadoConsolidado(linha) && resultadoDivergiu(linha, dados) && !motivoNormalizado) {
    throw new ErroEventos("Informe o motivo da correção do resultado.");
  }
  const origemParaAvanco: Linha = {
    ...linha,
    proxima_partida_id: dados.proximaPartidaId,
    proxima_posicao: dados.proximaPosicao,
  };
  const impactos = await coletarImpactosResultado(origemParaAvanco, dados.vencedorId);
  const impacto: ImpactoResultado = {
    exigeConfirmacao: impactos.length > 0,
    partidasAfetadas: impactos.map((item) => ({
      id: numero(item.id), fase: string(item.fase_nome), participanteAtual: string(item.participante_atual),
      resultadoPosteriorPreenchido: resultadoPreenchido(item),
    })),
    mensagem: impactos.length
      ? "A correção altera participantes ou resultados de partidas posteriores. Confirme para aplicar e preservar o histórico."
      : "O resultado pode ser salvo sem alterar partidas já preenchidas.",
  };
  if (impacto.exigeConfirmacao && !confirmarImpacto) throw new ErroEventos(impacto.mensagem, 409, impacto);

  const valoresNovos = await valoresPartida(campeonatoId, dados);
  const resultadoNovo = resumoAuditoria(dados, valoresNovos);
  const comandos: D1PreparedStatement[] = [
    d1.prepare(`INSERT INTO historico_resultados_partida
      (partida_id, resultado_anterior_json, resultado_novo_json, impacto_json, motivo)
      VALUES (?, ?, ?, ?, ?)`).bind(partidaId, JSON.stringify(resumoAuditoriaLinha(linha)), JSON.stringify(resultadoNovo), JSON.stringify(impacto.partidasAfetadas), motivoNormalizado),
    d1.prepare(`${sqlAtualizarPartida} WHERE id = ?`).bind(...valoresNovos, partidaId),
  ];

  // encaminha o novo vencedor; correções confirmadas limpam resultados dependentes com histórico próprio
  // Um primeiro resultado pode já configurar seu destino; nesse caso o
  // vencedor deve seguir o vínculo novo, e não o snapshot anterior da linha.
  let origem: Linha = origemParaAvanco;
  let novoVencedorId = dados.vencedorId;
  let novoVencedorNome = novoVencedorId ? await nomeParticipante(novoVencedorId) : "";
  const visitados = new Set<number>();
  while (origem.proxima_partida_id && !visitados.has(numero(origem.proxima_partida_id))) {
    const proximaId = numero(origem.proxima_partida_id);
    visitados.add(proximaId);
    const proxima = await d1.prepare(`SELECT p.*, f.nome AS fase_nome FROM partidas p
      INNER JOIN fases_campeonato f ON f.id = p.fase_id WHERE p.id = ?`).bind(proximaId).first<Linha>();
    if (!proxima || numero(proxima.campeonato_id) !== campeonatoId) break;
    const posicao = string(origem.proxima_posicao);
    const colunaId = posicao === "a" ? "participante_a_id" : "participante_b_id";
    const colunaNome = posicao === "a" ? "participante_a_nome" : "participante_b_nome";
    const participanteAtualId = nuloNumero(proxima[colunaId]);
    const precisaLimpar = resultadoPreenchido(proxima) && participanteAtualId !== novoVencedorId;
    if (precisaLimpar) {
      comandos.push(
        d1.prepare(`INSERT INTO historico_resultados_partida
          (partida_id, resultado_anterior_json, resultado_novo_json, impacto_json, motivo)
          VALUES (?, ?, ?, ?, ?)`).bind(
          proximaId, JSON.stringify(resumoResultadoLinha(proxima)),
          JSON.stringify({ vencedorId: null, placarA: null, placarB: null, situacao: "data_a_definir" }),
          JSON.stringify([{ origemPartidaId: partidaId }]), motivoNormalizado || "Correção de resultado anterior",
        ),
        d1.prepare(`UPDATE partidas SET ${colunaId} = ?, ${colunaNome} = ?, placar_a = NULL, placar_b = NULL,
          vencedor_id = NULL, vencedor_nome = '', forma_vitoria = '', situacao = CASE WHEN data = '' THEN 'data_a_definir' ELSE 'agendada' END,
          atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(novoVencedorId, novoVencedorNome, proximaId),
      );
      origem = proxima;
      // o resultado posterior foi invalidado; portanto seu antigo vencedor também deixa de avançar
      novoVencedorId = null;
      novoVencedorNome = "";
      continue;
    }
    comandos.push(d1.prepare(`UPDATE partidas SET ${colunaId} = ?, ${colunaNome} = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(novoVencedorId, novoVencedorNome, proximaId));
    break;
  }
  comandos.push(d1.prepare(`UPDATE campeonatos SET fase_atual = COALESCE(
    (SELECT f.nome FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.campeonato_id = ? AND p.ativo = 1 AND f.ativo = 1
        AND p.situacao NOT IN ('encerrada', 'wo', 'cancelada')
      ORDER BY f.ordem, p.ordem, p.id LIMIT 1),
    (SELECT f.nome FROM fases_campeonato f
      WHERE f.campeonato_id = ? AND f.ativo = 1 ORDER BY f.ordem DESC, f.id DESC LIMIT 1),
    fase_atual
  ), atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(campeonatoId, campeonatoId, campeonatoId));
  await d1.batch(comandos);
  return { item: await obterPartida(campeonatoId, partidaId, true), impacto };
}

export async function definirCampeaoCampeonato(campeonatoIdRecebido: unknown, participanteIdRecebido: unknown) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  const participanteId = idPositivo(participanteIdRecebido, "campeão");
  const participante = await exigirParticipanteDoCampeonato(campeonatoId, participanteId);
  await getD1().batch([
    getD1().prepare(`INSERT INTO campeoes_campeonato (campeonato_id, participante_id, nome)
      VALUES (?, ?, ?) ON CONFLICT(campeonato_id) DO UPDATE SET participante_id = excluded.participante_id,
      nome = excluded.nome, definido_em = CURRENT_TIMESTAMP`).bind(campeonatoId, participanteId, nomeLinhaParticipante(participante)),
    getD1().prepare(`UPDATE campeonatos SET situacao = 'encerrado', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(campeonatoId),
  ]);
  return (await obterCampeonato(campeonatoId, true)).item;
}

export async function duplicarCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "campeonato");
  const detalhe = await obterCampeonato(id, true);
  const origem = detalhe.item as CampeonatoAdministrativo;
  const novo = await criarCampeonato({
    ...origem, slug: `${origem.slug}-copia-${Date.now().toString(36)}`,
    nome: `${origem.nome} — cópia`, situacao: "proximo", faseAtual: "", chavePublicada: false,
    publicado: false, ativo: true, participantes: [],
  }) as CampeonatoAdministrativo;
  const mapaParticipantes = new Map<number, number>();
  for (const participante of detalhe.participantes) {
    const criado = await criarParticipanteCampeonato(novo.id, { ...participante, ativo: true });
    mapaParticipantes.set(participante.id, criado.id);
  }
  const mapaFases = new Map<number, number>();
  for (const fase of detalhe.fases) {
    const criada = await criarFaseCampeonato(novo.id, { ...fase, publicado: false, ativo: true });
    mapaFases.set(fase.id, criada.id);
  }
  const posicoesAlimentadas = new Map<number, Set<"a" | "b">>();
  for (const partida of detalhe.partidas) {
    if (!partida.proximaPartidaId || !partida.proximaPosicao) continue;
    const posicoes = posicoesAlimentadas.get(partida.proximaPartidaId) ?? new Set<"a" | "b">();
    posicoes.add(partida.proximaPosicao);
    posicoesAlimentadas.set(partida.proximaPartidaId, posicoes);
  }
  const mapaPartidas = new Map<number, number>();
  for (const partida of detalhe.partidas) {
    const alimentadas = posicoesAlimentadas.get(partida.id);
    const criada = await criarPartidaCampeonato(novo.id, {
      ...partida, faseId: mapaFases.get(partida.faseId),
      participanteAId: alimentadas?.has("a") ? null : partida.participanteAId ? mapaParticipantes.get(partida.participanteAId) : null,
      participanteBId: alimentadas?.has("b") ? null : partida.participanteBId ? mapaParticipantes.get(partida.participanteBId) : null,
      vencedorId: null, placarA: null, placarB: null, vencedorNome: "", formaVitoria: "",
      situacao: partida.data ? "agendada" : "data_a_definir", proximaPartidaId: null,
      proximaPosicao: partida.proximaPosicao, placarPublicado: false, publicado: false, ativo: true,
    });
    mapaPartidas.set(partida.id, criada.id);
  }
  for (const partida of detalhe.partidas) {
    if (partida.proximaPartidaId) {
      await atualizarPartidaCampeonato(mapaPartidas.get(partida.id), {
        ...(await obterPartida(novo.id, mapaPartidas.get(partida.id)!, true)),
        proximaPartidaId: mapaPartidas.get(partida.proximaPartidaId), proximaPosicao: partida.proximaPosicao,
      });
    }
  }
  for (const documento of detalhe.documentos) {
    await criarDocumentoCampeonato(novo.id, { ...documento, publicado: false, ativo: true });
  }
  return obterCampeonato(novo.id, true);
}

export async function criarDocumentoCampeonato(campeonatoIdRecebido: unknown, valor: unknown) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  await exigirExistente("campeonatos", campeonatoId, "Interclasse não encontrado.");
  const dados = validarDocumento(valor);
  const linha = await getD1().prepare(`INSERT INTO documentos_campeonato
    (campeonato_id, titulo, tipo, descricao, arquivo_chave, arquivo_url, link_externo, ordem, publicado, ativo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).bind(
    campeonatoId, dados.titulo, dados.tipo, dados.descricao, dados.arquivoChave, dados.arquivoUrl,
    dados.linkExterno, dados.ordem, binario(dados.publicado), binario(dados.ativo),
  ).first<Linha>();
  return formatarDocumento(linha!, true);
}

export async function atualizarDocumentoCampeonato(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "documento");
  const linha = await getD1().prepare("SELECT * FROM documentos_campeonato WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Documento do campeonato não encontrado.", 404);
  const dados = validarDocumento({ ...formatarDocumento(linha, true), ...(valor as object) });
  await getD1().prepare(`UPDATE documentos_campeonato SET titulo = ?, tipo = ?, descricao = ?, arquivo_chave = ?,
    arquivo_url = ?, link_externo = ?, ordem = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(dados.titulo, dados.tipo, dados.descricao, dados.arquivoChave, dados.arquivoUrl, dados.linkExterno,
      dados.ordem, binario(dados.publicado), binario(dados.ativo), id).run();
  const atualizada = await getD1().prepare("SELECT * FROM documentos_campeonato WHERE id = ?").bind(id).first<Linha>();
  return formatarDocumento(atualizada!, true);
}

export async function arquivarDocumentoCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "documento");
  await exigirExistente("documentos_campeonato", id, "Documento do campeonato não encontrado.");
  await getD1().prepare("UPDATE documentos_campeonato SET ativo = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
  return { arquivado: true, id };
}

export async function criarAtualizacaoCampeonato(campeonatoIdRecebido: unknown, valor: unknown) {
  const campeonatoId = idPositivo(campeonatoIdRecebido, "campeonato");
  await exigirExistente("campeonatos", campeonatoId, "Interclasse não encontrado.");
  const dados = validarAtualizacaoCampeonato(valor);
  const linha = await getD1().prepare(`INSERT INTO atualizacoes_campeonato
    (campeonato_id, titulo, texto, data, ordem, publicado, ativo) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`)
    .bind(campeonatoId, dados.titulo, dados.texto, dados.data, dados.ordem, binario(dados.publicado), binario(dados.ativo)).first<Linha>();
  return formatarAtualizacao(linha!, true);
}

export async function atualizarAtualizacaoCampeonato(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "atualização");
  const linha = await getD1().prepare("SELECT * FROM atualizacoes_campeonato WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Atualização do campeonato não encontrada.", 404);
  const dados = validarAtualizacaoCampeonato({
    ...formatarAtualizacao(linha, true), ...(valor as object),
  });
  await getD1().prepare(`UPDATE atualizacoes_campeonato SET titulo = ?, texto = ?, data = ?, ordem = ?, publicado = ?,
    ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(
    dados.titulo, dados.texto, dados.data, dados.ordem, binario(dados.publicado), binario(dados.ativo), id,
  ).run();
  const atualizada = await getD1().prepare("SELECT * FROM atualizacoes_campeonato WHERE id = ?").bind(id).first<Linha>();
  return formatarAtualizacao(atualizada!, true);
}

export async function arquivarAtualizacaoCampeonato(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "atualização");
  await exigirExistente("atualizacoes_campeonato", id, "Atualização do campeonato não encontrada.");
  await getD1().prepare("UPDATE atualizacoes_campeonato SET ativo = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
  return { arquivado: true, id };
}

// ---------------------------------------------------------------------------
// Reuniões, atas, votações e presenças

export async function listarReunioes(parametros: URLSearchParams, todos = false): Promise<ListaPaginada<ReuniaoPublica | ReuniaoAdministrativa>> {
  const { pagina, limite, offset } = paginacao(parametros);
  const filtros: Filtros = { sql: [], valores: [] };
  const situacao = textoFiltro(parametros.get("situacao"), 40);
  if (!todos) {
    filtros.sql.push("r.publicado = 1", "r.ativo = 1", "r.arquivado_em IS NULL");
    if (situacao === "arquivado") filtros.sql.push("1 = 0");
  }
  if (situacao === "arquivado") filtros.sql.push("r.arquivado_em IS NOT NULL");
  else if (situacao) adicionarIgual(filtros, "r.situacao", situacao);
  adicionarIgualSePresente(filtros, "substr(r.data, 1, 4)", parametros.get("ano"), 4);
  adicionarIgualSePresente(filtros, "substr(r.data, 6, 2)", normalizarMes(parametros.get("mes")), 2);
  adicionarIgualSePresente(filtros, "r.tipo", parametros.get("tipo"), 40);
  adicionarIgualSePresente(filtros, "r.turno", parametros.get("turno"), 20);
  const nivel = textoFiltro(parametros.get("nivel") ?? parametros.get("nivelEnsino"), 120);
  if (nivel) adicionarLike(filtros, "r.niveis_ensino", nivel);
  const busca = textoFiltro(parametros.get("busca"), 120);
  if (busca) {
    filtros.sql.push("(r.titulo LIKE ? ESCAPE '\\' OR r.descricao_curta LIKE ? ESCAPE '\\' OR r.resumo LIKE ? ESCAPE '\\')");
    const termo = `%${escaparLike(busca)}%`;
    filtros.valores.push(termo, termo, termo);
  }
  const where = clausulaWhere(filtros);
  const d1 = getD1();
  const [linhas, contagem] = await d1.batch([
    d1.prepare(`SELECT r.*,
      (SELECT COUNT(*) FROM presencas_reuniao p WHERE p.reuniao_id = r.id AND p.ativo = 1 AND p.situacao = 'presente') AS quantidade_presentes
      FROM reunioes r ${where} ORDER BY CASE WHEN r.data = '' THEN 1 ELSE 0 END, r.data DESC, r.id DESC LIMIT ? OFFSET ?`)
      .bind(...filtros.valores, limite, offset),
    d1.prepare(`SELECT COUNT(*) AS total FROM reunioes r ${where}`).bind(...filtros.valores),
  ]);
  return listaPaginada(
    (linhas.results as Linha[]).map((linha) => formatarReuniao(linha, todos)),
    pagina,
    limite,
    totalDaContagem(contagem.results),
  );
}

export async function obterReuniao(identificador: string | number, todos = false): Promise<DetalheReuniao<ReuniaoPublica | ReuniaoAdministrativa>> {
  const linha = await buscarPorIdOuSlug("reunioes", identificador, todos
    ? "1 = 1"
    : "publicado = 1 AND ativo = 1 AND arquivado_em IS NULL");
  if (!linha) throw new ErroEventos("Reunião não encontrada.", 404);
  const reuniaoId = numero(linha.id);
  const d1 = getD1();
  const [quantidade, itens, votacoes, opcoes, documentos, presencas] = await d1.batch([
    d1.prepare("SELECT COUNT(*) AS total FROM presencas_reuniao WHERE reuniao_id = ? AND ativo = 1 AND situacao = 'presente'").bind(reuniaoId),
    d1.prepare(`SELECT * FROM itens_reuniao WHERE reuniao_id = ? AND ativo = 1 ${todos ? "" : "AND publicado = 1"} ORDER BY tipo, ordem, id`).bind(reuniaoId),
    d1.prepare(`SELECT * FROM votacoes_reuniao WHERE reuniao_id = ? AND ativo = 1 ${todos ? "" : "AND publicado = 1 AND interno = 0"} ORDER BY ordem, id`).bind(reuniaoId),
    d1.prepare(`SELECT o.* FROM opcoes_votacao_reuniao o INNER JOIN votacoes_reuniao v ON v.id = o.votacao_id
      WHERE v.reuniao_id = ? AND o.ativo = 1 AND v.ativo = 1 ${todos ? "" : "AND v.publicado = 1 AND v.interno = 0"}
      ORDER BY o.votacao_id, o.ordem, o.id`).bind(reuniaoId),
    d1.prepare(`SELECT * FROM documentos_reuniao WHERE reuniao_id = ? AND ativo = 1 ${todos ? "" : "AND publicado = 1"} ORDER BY tipo, ordem, id`).bind(reuniaoId),
    d1.prepare(`SELECT * FROM presencas_reuniao WHERE reuniao_id = ? AND ativo = 1 ${todos ? "" : "AND publicado = 1"}
      ORDER BY turma_normalizada_snapshot, funcao_snapshot, nome_snapshot COLLATE NOCASE, id`).bind(reuniaoId),
  ]);
  const quantidadePresentes = totalDaContagem(quantidade.results as Linha[]);
  const opcoesFormatadas = (opcoes.results as Linha[]).map(formatarOpcaoVotacaoComVinculo);
  return {
    item: formatarReuniao({ ...linha, quantidade_presentes: quantidadePresentes }, todos),
    itens: (itens.results as Linha[]).map((item) => formatarItemReuniao(item, todos)),
    votacoes: (votacoes.results as Linha[]).map((votacao) => formatarVotacao(votacao, opcoesFormatadas, todos)),
    documentos: (documentos.results as Linha[]).map((documento) => formatarDocumento(documento, todos)),
    presencas: (presencas.results as Linha[]).map((presenca) => formatarPresenca(presenca, todos)),
  };
}

export async function criarReuniao(valor: unknown) {
  const dados = validarReuniao(valor);
  if (!dados.slug) throw new ErroEventos("Não foi possível criar o endereço da reunião.");
  let linha: Linha | null = null;
  try {
    linha = await getD1().prepare(`${sqlInserirReuniao} RETURNING *`).bind(...valoresReuniao(dados)).first<Linha>();
  } catch (erro) {
    converterErroUnico(erro, "Já existe uma reunião com esse endereço.");
  }
  if (!linha) throw new ErroEventos("Não foi possível criar a reunião.", 500);
  return (await obterReuniao(numero(linha.id), true)).item;
}

export async function atualizarReuniao(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "reunião");
  const existente = (await obterReuniao(id, true)).item as ReuniaoAdministrativa;
  const recebido = valor as Record<string, unknown>;
  const dados = validarReuniao({ ...existente, ...recebido });
  try {
    await getD1().prepare(`${sqlAtualizarReuniao} WHERE id = ?`).bind(...valoresReuniao(dados), id).run();
  } catch (erro) {
    converterErroUnico(erro, "Já existe uma reunião com esse endereço.");
  }
  if (booleano(recebido.arquivado, false)) await arquivarRegistro("reunioes", id);
  return (await obterReuniao(id, true)).item;
}

export async function arquivarReuniao(idRecebido: unknown) {
  const id = idPositivo(idRecebido, "reunião");
  await exigirExistente("reunioes", id, "Reunião não encontrada.");
  await arquivarRegistro("reunioes", id);
  return { arquivado: true, id };
}

export async function excluirRascunhoReuniao(idRecebido: unknown) {
  const id = await exigirRascunhoExcluivel("reunioes", idRecebido, "Reunião não encontrada.");
  const d1 = getD1();
  await d1.batch([
    d1.prepare("DELETE FROM opcoes_votacao_reuniao WHERE votacao_id IN (SELECT id FROM votacoes_reuniao WHERE reuniao_id = ?)").bind(id),
    d1.prepare("DELETE FROM votacoes_reuniao WHERE reuniao_id = ?").bind(id),
    d1.prepare("DELETE FROM itens_reuniao WHERE reuniao_id = ?").bind(id),
    d1.prepare("DELETE FROM documentos_reuniao WHERE reuniao_id = ?").bind(id),
    d1.prepare("DELETE FROM presencas_reuniao WHERE reuniao_id = ?").bind(id),
    d1.prepare("DELETE FROM reunioes WHERE id = ?").bind(id),
  ]);
  return { excluido: true, id };
}

export async function duplicarReuniao(idRecebido: unknown) {
  const detalhe = await obterReuniao(idPositivo(idRecebido, "reunião"), true);
  const origem = detalhe.item as ReuniaoAdministrativa;
  const nova = await criarReuniao({
    ...origem, slug: `${origem.slug}-copia-${Date.now().toString(36)}`, titulo: `${origem.titulo} — cópia`,
    situacao: "agendada", publicado: false, ativo: true, arquivado: false,
  }) as ReuniaoAdministrativa;
  for (const item of detalhe.itens) await criarItemReuniao(nova.id, { ...item, publicado: false, ativo: true });
  for (const documento of detalhe.documentos) await criarDocumentoReuniao(nova.id, { ...documento, publicado: false, ativo: true });
  for (const votacao of detalhe.votacoes) {
    await criarVotacaoReuniao(nova.id, {
      ...votacao, abstencoes: 0, resultado: "", decisaoFinal: "", publicado: false, interno: true,
      opcoes: votacao.opcoes.map((opcao) => ({ ...opcao, id: undefined, quantidadeVotos: 0 })),
    });
  }
  // presenças são deliberadamente omitidas para não reescrever o histórico
  return obterReuniao(nova.id, true);
}

export async function criarItemReuniao(reuniaoIdRecebido: unknown, valor: unknown) {
  const reuniaoId = idPositivo(reuniaoIdRecebido, "reunião");
  await exigirExistente("reunioes", reuniaoId, "Reunião não encontrada.");
  const dados = validarItemReuniao(valor);
  const linha = await getD1().prepare(`${sqlInserirItemReuniao} RETURNING *`).bind(reuniaoId, ...valoresItemReuniao(dados)).first<Linha>();
  return formatarItemReuniao(linha!, true);
}

export async function atualizarItemReuniao(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "item da reunião");
  const linha = await getD1().prepare("SELECT * FROM itens_reuniao WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Item da reunião não encontrado.", 404);
  const dados = validarItemReuniao({ ...formatarItemReuniao(linha, true), ...(valor as object) });
  await getD1().prepare(`${sqlAtualizarItemReuniao} WHERE id = ?`).bind(...valoresItemReuniao(dados), id).run();
  const atualizado = await getD1().prepare("SELECT * FROM itens_reuniao WHERE id = ?").bind(id).first<Linha>();
  return formatarItemReuniao(atualizado!, true);
}

export async function criarDocumentoReuniao(reuniaoIdRecebido: unknown, valor: unknown) {
  const reuniaoId = idPositivo(reuniaoIdRecebido, "reunião");
  await exigirExistente("reunioes", reuniaoId, "Reunião não encontrada.");
  const dados = validarDocumento(valor);
  const linha = await getD1().prepare(`INSERT INTO documentos_reuniao
    (reuniao_id, titulo, tipo, descricao, arquivo_chave, arquivo_url, link_externo, data, ordem, publicado, ativo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).bind(reuniaoId, ...valoresDocumento(dados)).first<Linha>();
  return formatarDocumento(linha!, true);
}

export async function atualizarDocumentoReuniao(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "documento");
  const linha = await getD1().prepare("SELECT * FROM documentos_reuniao WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Documento não encontrado.", 404);
  const dados = validarDocumento({ ...formatarDocumento(linha, true), ...(valor as object) });
  await getD1().prepare(`${sqlAtualizarDocumento("documentos_reuniao")} WHERE id = ?`).bind(...valoresDocumento(dados), id).run();
  const atualizado = await getD1().prepare("SELECT * FROM documentos_reuniao WHERE id = ?").bind(id).first<Linha>();
  return formatarDocumento(atualizado!, true);
}

export async function criarVotacaoReuniao(reuniaoIdRecebido: unknown, valor: unknown) {
  const reuniaoId = idPositivo(reuniaoIdRecebido, "reunião");
  await exigirExistente("reunioes", reuniaoId, "Reunião não encontrada.");
  const dados = validarVotacao(valor);
  const d1 = getD1();
  const linha = await d1.prepare(`${sqlInserirVotacao} RETURNING *`).bind(reuniaoId, ...valoresVotacao(dados)).first<Linha>();
  if (!linha) throw new ErroEventos("Não foi possível criar a votação.", 500);
  if (dados.opcoes.length) await d1.batch(dados.opcoes.map((opcao) => d1.prepare(sqlInserirOpcaoVotacao)
    .bind(linha!.id, opcao.texto, opcao.quantidadeVotos, opcao.ordem, binario(opcao.ativo))));
  return obterVotacao(numero(linha.id), true);
}

export async function atualizarVotacaoReuniao(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "votação");
  const existente = await obterVotacao(id, true);
  const dados = validarVotacao({ ...existente, ...(valor as object) });
  const d1 = getD1();
  const comandos: D1PreparedStatement[] = [d1.prepare(`${sqlAtualizarVotacao} WHERE id = ?`).bind(...valoresVotacao(dados), id)];
  const idsMantidos = dados.opcoes.flatMap((opcao) => opcao.id ? [opcao.id] : []);
  comandos.push(idsMantidos.length
    ? d1.prepare(`UPDATE opcoes_votacao_reuniao SET ativo = 0
        WHERE votacao_id = ? AND id NOT IN (${idsMantidos.map(() => "?").join(",")})`).bind(id, ...idsMantidos)
    : d1.prepare("UPDATE opcoes_votacao_reuniao SET ativo = 0 WHERE votacao_id = ?").bind(id));
  for (const opcao of dados.opcoes) {
    if (opcao.id) {
      const pertence = await d1.prepare("SELECT id FROM opcoes_votacao_reuniao WHERE id = ? AND votacao_id = ?").bind(opcao.id, id).first();
      if (!pertence) throw new ErroEventos("Uma opção não pertence a esta votação.");
      comandos.push(d1.prepare(`UPDATE opcoes_votacao_reuniao SET texto = ?, quantidade_votos = ?, ordem = ?, ativo = ? WHERE id = ?`)
        .bind(opcao.texto, opcao.quantidadeVotos, opcao.ordem, binario(opcao.ativo), opcao.id));
    } else {
      comandos.push(d1.prepare(sqlInserirOpcaoVotacao).bind(id, opcao.texto, opcao.quantidadeVotos, opcao.ordem, binario(opcao.ativo)));
    }
  }
  await d1.batch(comandos);
  return obterVotacao(id, true);
}

export async function criarPresencaReuniao(reuniaoIdRecebido: unknown, valor: unknown) {
  const reuniaoId = idPositivo(reuniaoIdRecebido, "reunião");
  await exigirExistente("reunioes", reuniaoId, "Reunião não encontrada.");
  const recebido = objetoRecebido(valor);
  const preliminar = validarPresenca(recebido);
  let dados = preliminar;
  if (preliminar.representanteId) {
    const representante = await getD1().prepare(`SELECT * FROM representantes
      WHERE id = ? AND ativo = 1 AND arquivado_em IS NULL`).bind(preliminar.representanteId).first<Linha>();
    if (!representante) throw new ErroEventos("Representante ativo não encontrado.", 404);
    // Quando há vínculo, o snapshot é sempre derivado da fonte persistida;
    // uma presença não pode associar o ID de uma pessoa ao nome de outra.
    dados = validarPresenca({
      ...recebido,
      representanteId: preliminar.representanteId,
      nomeSnapshot: string(representante.nome_exibicao) || string(representante.nome),
      nivelEnsinoSnapshot: string(representante.nivel_ensino),
      serieSnapshot: string(representante.serie),
      turmaSnapshot: string(representante.turma),
      turnoSnapshot: string(representante.turno),
      funcaoSnapshot: string(representante.funcao),
    });
  }
  let linha: Linha | null = null;
  try {
    linha = await getD1().prepare(`${sqlInserirPresenca} RETURNING *`).bind(reuniaoId, ...valoresPresenca(dados)).first<Linha>();
  } catch (erro) {
    converterErroUnico(erro, "Este representante já está na lista de presença.");
  }
  return formatarPresenca(linha!, true);
}

export async function atualizarPresencaReuniao(idRecebido: unknown, valor: unknown) {
  const id = idPositivo(idRecebido, "presença");
  const linha = await getD1().prepare("SELECT * FROM presencas_reuniao WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Presença não encontrada.", 404);
  const dados = validarPresenca({ ...formatarPresenca(linha, true), ...(valor as object) });
  await getD1().prepare(`${sqlAtualizarPresenca} WHERE id = ?`).bind(...valoresPresenca(dados), id).run();
  const atualizada = await getD1().prepare("SELECT * FROM presencas_reuniao WHERE id = ?").bind(id).first<Linha>();
  return formatarPresenca(atualizada!, true);
}

export async function arquivarSubentidadeReuniao(entidade: "itens" | "documentos" | "votacoes" | "presencas", idRecebido: unknown) {
  const id = idPositivo(idRecebido, "registro");
  const tabela = { itens: "itens_reuniao", documentos: "documentos_reuniao", votacoes: "votacoes_reuniao", presencas: "presencas_reuniao" }[entidade];
  await exigirExistente(tabela, id, "Registro da reunião não encontrado.");
  await getD1().prepare(`UPDATE ${tabela} SET ativo = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();
  return { arquivado: true, id };
}

export async function gerarPresencasDeRepresentantes(reuniaoIdRecebido: unknown, filtrosRecebidos: unknown = {}) {
  const reuniaoId = idPositivo(reuniaoIdRecebido, "reunião");
  const reuniao = (await obterReuniao(reuniaoId, true)).item as ReuniaoAdministrativa;
  if (reuniao.tipo !== "representantes") throw new ErroEventos("A geração por representantes só pode ser usada nesse tipo de reunião.");
  const filtrosDados = (filtrosRecebidos && typeof filtrosRecebidos === "object" ? filtrosRecebidos : {}) as Record<string, unknown>;
  const filtros: Filtros = { sql: ["r.ativo = 1", "r.arquivado_em IS NULL"], valores: [] };
  for (const [campo, coluna, normalizar] of [
    ["nivelEnsino", "r.nivel_ensino", false], ["turno", "r.turno", false], ["serie", "r.serie", false], ["turma", "r.turma_normalizada", true],
  ] as const) {
    const valor = textoFiltro(String(filtrosDados[campo] ?? ""), 120);
    if (valor) adicionarIgual(filtros, coluna, normalizar ? normalizarTurma(valor) : valor);
  }
  const representantes = await getD1().prepare(`SELECT * FROM representantes r ${clausulaWhere(filtros)} ORDER BY r.turma_normalizada, r.funcao, r.ordem, r.id`)
    .bind(...filtros.valores).all<Linha>();
  const d1 = getD1();
  const comandos = representantes.results.map((r) => d1.prepare(`INSERT OR IGNORE INTO presencas_reuniao (
    reuniao_id, representante_id, nome_snapshot, nivel_ensino_snapshot, serie_snapshot, turma_snapshot,
    turma_normalizada_snapshot, turno_snapshot, funcao_snapshot, situacao, publicado, ativo
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nao_informada', 0, 1)`).bind(
    reuniaoId, r.id, string(r.nome_exibicao) || string(r.nome), r.nivel_ensino, r.serie, r.turma,
    r.turma_normalizada, r.turno, r.funcao,
  ));
  if (comandos.length) await executarLotesD1(d1, comandos);
  const quantidade = await d1.prepare("SELECT COUNT(*) AS total FROM presencas_reuniao WHERE reuniao_id = ? AND ativo = 1").bind(reuniaoId).first<Linha>();
  return { geradasOuMantidas: comandos.length, total: numero(quantidade?.total), presencas: (await obterReuniao(reuniaoId, true)).presencas };
}

export async function atualizarStatusPresencasEmMassa(
  reuniaoIdRecebido: unknown,
  situacaoRecebida: unknown,
  idsRecebidos: unknown,
  filtrosRecebidos: unknown = {},
) {
  const reuniaoId = idPositivo(reuniaoIdRecebido, "reunião");
  const situacao = String(situacaoRecebida ?? "") as SituacaoPresenca;
  if (!["presente", "ausente", "justificada", "nao_se_aplica", "nao_informada"].includes(situacao)) {
    throw new ErroEventos("Escolha uma situação de presença válida.");
  }
  const filtros: Filtros = { sql: ["reuniao_id = ?", "ativo = 1"], valores: [reuniaoId] };
  if (Array.isArray(idsRecebidos) && idsRecebidos.length) {
    if (idsRecebidos.length > 500) throw new ErroEventos("Selecione no máximo 500 presenças por vez.");
    const ids = idsRecebidos.map((id) => idPositivo(id, "presença"));
    filtros.sql.push(`id IN (${ids.map(() => "?").join(",")})`);
    filtros.valores.push(...ids);
  } else {
    const dados = (filtrosRecebidos && typeof filtrosRecebidos === "object" ? filtrosRecebidos : {}) as Record<string, unknown>;
    for (const [campo, coluna] of [["nivelEnsino", "nivel_ensino_snapshot"], ["turno", "turno_snapshot"], ["serie", "serie_snapshot"], ["turma", "turma_normalizada_snapshot"]] as const) {
      const valor = textoFiltro(String(dados[campo] ?? ""), 120);
      if (valor) adicionarIgual(filtros, coluna, campo === "turma" ? normalizarTurma(valor) : valor);
    }
  }
  const resultado = await getD1().prepare(`UPDATE presencas_reuniao SET situacao = ?, atualizado_em = CURRENT_TIMESTAMP ${clausulaWhere(filtros)}`)
    .bind(situacao, ...filtros.valores).run();
  return { atualizadas: numero(resultado.meta.changes), presencas: (await obterReuniao(reuniaoId, true)).presencas };
}

// compõe a página central somente com DTOs públicos e limites pequenos
export async function obterCentralEventos(): Promise<CentralEventos> {
  const parametrosProximos = new URLSearchParams({ situacao: "proximo", limite: "6", pagina: "1" });
  const parametrosAgora = new URLSearchParams({ situacao: "em_andamento", limite: "6", pagina: "1" });
  const parametrosReunioes = new URLSearchParams({ limite: "6", pagina: "1" });
  const [proximos, agora, interclasses, reunioes] = await Promise.all([
    listarEventos(parametrosProximos, false),
    listarEventos(parametrosAgora, false),
    listarCampeonatos(parametrosAgora, false),
    listarReunioes(parametrosReunioes, false),
  ]);
  const jogos = await getD1().prepare(`SELECT p.*, f.nome AS fase_nome, c.slug AS campeonato_slug, c.nome AS campeonato_nome
    FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
    INNER JOIN campeonatos c ON c.id = p.campeonato_id
    WHERE p.publicado = 1 AND p.ativo = 1 AND f.publicado = 1 AND f.ativo = 1
      AND c.publicado = 1 AND c.ativo = 1 AND c.chave_publicada = 1
      AND p.situacao IN ('agendada', 'data_a_definir', 'adiada')
    ORDER BY CASE WHEN p.data = '' THEN 1 ELSE 0 END, p.data, p.horario, p.id LIMIT 8`).all<Linha>();
  return {
    proximosEventos: proximos.itens as EventoInternoPublico[],
    acontecendoAgora: agora.itens as EventoInternoPublico[],
    interclassesEmAndamento: interclasses.itens as CampeonatoPublico[],
    proximosJogos: jogos.results.map((linha) => formatarPartida(linha, false) as PartidaPublica),
    reunioesRecentes: reunioes.itens as ReuniaoPublica[],
  };
}

// ---------------------------------------------------------------------------
// Formatação e integridade dos interclasses

async function formatarCampeonatoCompleto(linha: Linha, todos: boolean): Promise<CampeonatoPublico | CampeonatoAdministrativo> {
  const id = numero(linha.id);
  const filtroPublico = todos ? "" : "AND p.publicado = 1 AND p.ativo = 1 AND f.publicado = 1 AND f.ativo = 1";
  const chaveVisivel = todos || bool(linha.chave_publicada);
  const filtroChave = chaveVisivel ? "" : "AND 0 = 1";
  const d1 = getD1();
  const [quantidade, campeao, proxima, ultimo] = await d1.batch([
    d1.prepare("SELECT COUNT(*) AS total FROM participantes_campeonato WHERE campeonato_id = ? AND ativo = 1").bind(id),
    d1.prepare("SELECT participante_id, nome, definido_em FROM campeoes_campeonato WHERE campeonato_id = ?").bind(id),
    d1.prepare(`SELECT p.*, f.nome AS fase_nome, ? AS campeonato_slug, ? AS campeonato_nome
      FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.campeonato_id = ? AND p.situacao IN ('agendada', 'data_a_definir', 'adiada') ${filtroPublico} ${filtroChave}
      ORDER BY CASE WHEN p.data = '' THEN 1 ELSE 0 END, p.data, p.horario, f.ordem, p.ordem LIMIT 1`)
      .bind(linha.slug, linha.nome, id),
    d1.prepare(`SELECT p.*, f.nome AS fase_nome, ? AS campeonato_slug, ? AS campeonato_nome
      FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.campeonato_id = ? AND p.situacao IN ('encerrada', 'wo') ${filtroPublico} ${filtroChave}
      ORDER BY CASE WHEN p.data = '' THEN 1 ELSE 0 END, p.data DESC, p.atualizado_em DESC, p.id DESC LIMIT 1`)
      .bind(linha.slug, linha.nome, id),
  ]);
  const linhaCampeao = (campeao.results as Linha[])[0];
  const linhaProxima = (proxima.results as Linha[])[0];
  const linhaUltimo = (ultimo.results as Linha[])[0];
  const publico: CampeonatoPublico = {
    id, slug: string(linha.slug), nome: string(linha.nome), edicao: string(linha.edicao),
    ano: nuloNumero(linha.ano), modalidade: string(linha.modalidade), categoria: string(linha.categoria), turno: string(linha.turno),
    descricao: string(linha.descricao), regulamento: string(linha.regulamento), organizacao: string(linha.organizacao),
    locais: string(linha.locais), observacoesPublicas: string(linha.observacoes_publicas),
    formato: linha.formato as CampeonatoPublico["formato"], situacao: linha.situacao as CampeonatoPublico["situacao"],
    faseAtual: string(linha.fase_atual), dataInicial: string(linha.data_inicial), dataFinal: string(linha.data_final),
    imagemCapaUrl: string(linha.imagem_capa_url), chavePublicada: bool(linha.chave_publicada),
    quantidadeEquipes: totalDaContagem(quantidade.results as Linha[]),
    campeao: linhaCampeao ? { participanteId: nuloNumero(linhaCampeao.participante_id), nome: string(linhaCampeao.nome), definidoEm: string(linhaCampeao.definido_em) } : null,
    proximaPartida: chaveVisivel && linhaProxima ? formatarPartida(linhaProxima, todos) as PartidaPublica : null,
    ultimoResultado: chaveVisivel && linhaUltimo ? formatarPartida(linhaUltimo, todos) as PartidaPublica : null,
    atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return {
    ...publico, observacoesInternas: string(linha.observacoes_internas), publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    arquivadoEm: nuloString(linha.arquivado_em), criadoEm: string(linha.criado_em),
  } satisfies CampeonatoAdministrativo;
}

function formatarParticipante(linha: Linha, todos = true): ParticipanteCampeonato {
  const publico: ParticipanteCampeonato = {
    id: numero(linha.id), nome: string(linha.nome), nomeExibicao: string(linha.nome_exibicao),
    apelido: string(linha.apelido), posicaoInicial: numero(linha.posicao_inicial),
  };
  if (!todos) return publico;
  return {
    ...publico, campeonatoId: numero(linha.campeonato_id), turmaAtividadeId: nuloNumero(linha.turma_atividade_id),
    ativo: bool(linha.ativo), atualizadoEm: string(linha.atualizado_em),
  };
}

function formatarFase(linha: Linha, todos = true): FaseCampeonato {
  const publico: FaseCampeonato = {
    id: numero(linha.id), nome: string(linha.nome), ordem: numero(linha.ordem),
    tipo: linha.tipo as FaseCampeonato["tipo"], quantidadeJogos: numero(linha.quantidade_jogos),
  };
  if (!todos) return publico;
  return {
    ...publico, campeonatoId: numero(linha.campeonato_id), publicado: bool(linha.publicado),
    ativo: bool(linha.ativo), atualizadoEm: string(linha.atualizado_em),
  };
}

function formatarPartida(linha: Linha, todos: boolean): PartidaPublica | PartidaAdministrativa {
  const mostrarPlacar = todos || bool(linha.placar_publicado);
  const publico: PartidaPublica = {
    id: numero(linha.id), campeonatoId: numero(linha.campeonato_id), campeonatoSlug: string(linha.campeonato_slug),
    campeonatoNome: string(linha.campeonato_nome), faseId: numero(linha.fase_id), faseNome: string(linha.fase_nome),
    rodada: string(linha.rodada), ordem: numero(linha.ordem), participanteAId: nuloNumero(linha.participante_a_id),
    participanteBId: nuloNumero(linha.participante_b_id), participanteANome: string(linha.participante_a_nome),
    participanteBNome: string(linha.participante_b_nome), placarA: mostrarPlacar ? nuloNumero(linha.placar_a) : null,
    placarB: mostrarPlacar ? nuloNumero(linha.placar_b) : null, vencedorId: nuloNumero(linha.vencedor_id),
    vencedorNome: string(linha.vencedor_nome), formaVitoria: string(linha.forma_vitoria), data: string(linha.data),
    horario: string(linha.horario), local: string(linha.local), situacao: linha.situacao as PartidaPublica["situacao"],
    placarPublicado: bool(linha.placar_publicado), resumo: string(linha.resumo), destaques: string(linha.destaques),
    observacoesPublicas: string(linha.observacoes_publicas), proximaPartidaId: nuloNumero(linha.proxima_partida_id),
    proximaPosicao: string(linha.proxima_posicao) as PartidaPublica["proximaPosicao"], atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return {
    ...publico, observacoesInternas: string(linha.observacoes_internas), publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    arquivadoEm: nuloString(linha.arquivado_em), criadoEm: string(linha.criado_em),
  } satisfies PartidaAdministrativa;
}

function formatarAtualizacao(linha: Linha, todos = false): AtualizacaoCampeonato | AtualizacaoCampeonatoAdministrativa {
  const publica: AtualizacaoCampeonato = {
    id: numero(linha.id), titulo: string(linha.titulo), texto: string(linha.texto), data: string(linha.data),
    ordem: numero(linha.ordem), atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publica;
  return {
    ...publica, campeonatoId: numero(linha.campeonato_id), publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    criadoEm: string(linha.criado_em),
  } satisfies AtualizacaoCampeonatoAdministrativa;
}

const sqlInserirCampeonato = `INSERT INTO campeonatos (
  slug, nome, edicao, ano, modalidade, categoria, turno, descricao, regulamento, organizacao, locais,
  observacoes_publicas, observacoes_internas, formato, situacao, fase_atual, data_inicial, data_final,
  imagem_capa_url, chave_publicada, publicado, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarCampeonato = `UPDATE campeonatos SET
  slug = ?, nome = ?, edicao = ?, ano = ?, modalidade = ?, categoria = ?, turno = ?, descricao = ?, regulamento = ?,
  organizacao = ?, locais = ?, observacoes_publicas = ?, observacoes_internas = ?, formato = ?, situacao = ?, fase_atual = ?,
  data_inicial = ?, data_final = ?, imagem_capa_url = ?, chave_publicada = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;

function valoresCampeonato(dados: ReturnType<typeof validarCampeonato>) {
  return [dados.slug, dados.nome, dados.edicao, dados.ano, dados.modalidade, dados.categoria, dados.turno, dados.descricao,
    dados.regulamento, dados.organizacao, dados.locais, dados.observacoesPublicas, dados.observacoesInternas, dados.formato,
    dados.situacao, dados.faseAtual, dados.dataInicial, dados.dataFinal, dados.imagemCapaUrl, binario(dados.chavePublicada),
    binario(dados.publicado), binario(dados.ativo)];
}

const sqlInserirParticipante = `INSERT INTO participantes_campeonato (
  campeonato_id, turma_atividade_id, nome, nome_normalizado, nome_exibicao, apelido, posicao_inicial, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarParticipante = `UPDATE participantes_campeonato SET turma_atividade_id = ?, nome = ?, nome_normalizado = ?,
  nome_exibicao = ?, apelido = ?, posicao_inicial = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;
function valoresParticipante(dados: ReturnType<typeof validarParticipante>) {
  return [dados.turmaAtividadeId, dados.nome, dados.nomeNormalizado, dados.nomeExibicao, dados.apelido, dados.posicaoInicial, binario(dados.ativo)];
}

async function impedirParticipanteDuplicado(campeonatoId: number, nomeNormalizado: string, ignorarId = -1) {
  const duplicado = await getD1().prepare(`SELECT id FROM participantes_campeonato
    WHERE campeonato_id = ? AND nome_normalizado = ? AND ativo = 1 AND id <> ? LIMIT 1`)
    .bind(campeonatoId, nomeNormalizado, ignorarId).first();
  if (duplicado) throw new ErroEventos("Já existe um participante ativo com esse nome neste campeonato.", 409);
}

const sqlInserirFase = `INSERT INTO fases_campeonato (campeonato_id, nome, ordem, tipo, quantidade_jogos, publicado, ativo)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarFase = `UPDATE fases_campeonato SET nome = ?, ordem = ?, tipo = ?, quantidade_jogos = ?, publicado = ?, ativo = ?,
  atualizado_em = CURRENT_TIMESTAMP`;
function valoresFase(dados: ReturnType<typeof validarFase>) {
  return [dados.nome, dados.ordem, dados.tipo, dados.quantidadeJogos, binario(dados.publicado), binario(dados.ativo)];
}

const sqlInserirPartida = `INSERT INTO partidas (
  campeonato_id, fase_id, rodada, ordem, participante_a_id, participante_b_id, participante_a_nome, participante_b_nome,
  placar_a, placar_b, vencedor_id, vencedor_nome, forma_vitoria, data, horario, local, situacao, placar_publicado,
  resumo, destaques, observacoes_publicas, observacoes_internas, proxima_partida_id, proxima_posicao, publicado, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarPartida = `UPDATE partidas SET fase_id = ?, rodada = ?, ordem = ?, participante_a_id = ?, participante_b_id = ?,
  participante_a_nome = ?, participante_b_nome = ?, placar_a = ?, placar_b = ?, vencedor_id = ?, vencedor_nome = ?, forma_vitoria = ?,
  data = ?, horario = ?, local = ?, situacao = ?, placar_publicado = ?, resumo = ?, destaques = ?, observacoes_publicas = ?,
  observacoes_internas = ?, proxima_partida_id = ?, proxima_posicao = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;

async function valoresPartida(campeonatoId: number, dados: ReturnType<typeof validarPartida>) {
  const [nomeA, nomeB, nomeVencedor] = await Promise.all([
    dados.participanteAId ? nomeParticipante(dados.participanteAId) : "",
    dados.participanteBId ? nomeParticipante(dados.participanteBId) : "",
    dados.vencedorId ? nomeParticipante(dados.vencedorId) : "",
  ]);
  return [dados.faseId, dados.rodada, dados.ordem, dados.participanteAId, dados.participanteBId, nomeA, nomeB,
    dados.placarA, dados.placarB, dados.vencedorId, nomeVencedor, dados.formaVitoria, dados.data, dados.horario, dados.local,
    dados.situacao, binario(dados.placarPublicado), dados.resumo, dados.destaques, dados.observacoesPublicas,
    dados.observacoesInternas, dados.proximaPartidaId, dados.proximaPosicao, binario(dados.publicado), binario(dados.ativo)] as const;
}

async function validarReferenciasPartida(campeonatoId: number, partidaId: number, dados: ReturnType<typeof validarPartida>) {
  const fase = await getD1().prepare("SELECT id, ordem FROM fases_campeonato WHERE id = ? AND campeonato_id = ?")
    .bind(dados.faseId, campeonatoId).first<Linha>();
  if (!fase) throw new ErroEventos("A fase não pertence a este campeonato.");
  for (const participanteId of [dados.participanteAId, dados.participanteBId, dados.vencedorId]) {
    if (participanteId) await exigirParticipanteDoCampeonato(campeonatoId, participanteId);
  }
  validarLigacaoPartida(partidaId, dados.proximaPartidaId, dados.proximaPosicao);
  if (dados.proximaPartidaId) {
    const proxima = await getD1().prepare(`SELECT p.id, f.ordem AS fase_ordem FROM partidas p
      INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.id = ? AND p.campeonato_id = ? AND p.ativo = 1 AND f.ativo = 1`)
      .bind(dados.proximaPartidaId, campeonatoId).first<Linha>();
    if (!proxima) throw new ErroEventos("A próxima partida não pertence a este campeonato.");
    if (numero(proxima.fase_ordem) <= numero(fase.ordem)) throw new ErroEventos("A próxima partida precisa estar em uma fase posterior.");
    const conflito = await getD1().prepare(`SELECT id FROM partidas WHERE proxima_partida_id = ? AND proxima_posicao = ? AND id <> ? AND ativo = 1`)
      .bind(dados.proximaPartidaId, dados.proximaPosicao, partidaId || -1).first();
    if (conflito) throw new ErroEventos("Outra partida já envia seu vencedor para essa posição.", 409);
  }
}

async function exigirParticipanteDoCampeonato(campeonatoId: number, participanteId: number) {
  const linha = await getD1().prepare("SELECT * FROM participantes_campeonato WHERE id = ? AND campeonato_id = ?")
    .bind(participanteId, campeonatoId).first<Linha>();
  if (!linha) throw new ErroEventos("Um participante não pertence a este campeonato.");
  return linha;
}

async function nomeParticipante(id: number) {
  const linha = await getD1().prepare("SELECT nome, nome_exibicao FROM participantes_campeonato WHERE id = ?").bind(id).first<Linha>();
  if (!linha) throw new ErroEventos("Participante não encontrado.");
  return nomeLinhaParticipante(linha);
}

function nomeLinhaParticipante(linha: Linha) { return string(linha.nome_exibicao) || string(linha.nome); }

async function coletarImpactosResultado(origemInicial: Linha, novoVencedorInicial: number | null) {
  const impactos: Linha[] = [];
  let origem = origemInicial;
  let novoVencedor = novoVencedorInicial;
  const visitados = new Set<number>();
  while (origem.proxima_partida_id && !visitados.has(numero(origem.proxima_partida_id))) {
    const id = numero(origem.proxima_partida_id);
    visitados.add(id);
    const proxima = await getD1().prepare(`SELECT p.*, f.nome AS fase_nome FROM partidas p
      INNER JOIN fases_campeonato f ON f.id = p.fase_id WHERE p.id = ?`).bind(id).first<Linha>();
    if (!proxima) break;
    const colunaId = string(origem.proxima_posicao) === "a" ? "participante_a_id" : "participante_b_id";
    const colunaNome = string(origem.proxima_posicao) === "a" ? "participante_a_nome" : "participante_b_nome";
    const atual = nuloNumero(proxima[colunaId]);
    if (atual === novoVencedor) break;
    // Preencher pela primeira vez um slot vazio é o avanço normal da chave.
    // Confirmação só é necessária se houver substituição real ou se um
    // resultado posterior incoerente precisar ser invalidado.
    if (atual !== null || resultadoPreenchido(proxima)) {
      impactos.push({ ...proxima, participante_atual: string(proxima[colunaNome]) });
      // qualquer resultado desta partida será limpo após a confirmação
      novoVencedor = null;
      origem = proxima;
      continue;
    }
    break;
  }
  return impactos;
}

async function adicionarLimpezaAvancoPosterior(
  d1: ReturnType<typeof getD1>,
  origemInicial: Linha,
  comandos: D1PreparedStatement[],
  visitados: Set<number>,
  reservados: Set<number>,
  causaPartidaId: number,
  motivo: string,
) {
  let origem = origemInicial;
  let vencedorAnterior = nuloNumero(origem.vencedor_id);
  while (vencedorAnterior && origem.proxima_partida_id) {
    const proximaId = numero(origem.proxima_partida_id);
    if (visitados.has(proximaId) || reservados.has(proximaId)) break;
    visitados.add(proximaId);
    const proxima = await d1.prepare("SELECT * FROM partidas WHERE id = ? AND ativo = 1").bind(proximaId).first<Linha>();
    if (!proxima) break;
    const posicao = string(origem.proxima_posicao);
    const colunaId = posicao === "a" ? "participante_a_id" : "participante_b_id";
    const colunaNome = posicao === "a" ? "participante_a_nome" : "participante_b_nome";
    if (nuloNumero(proxima[colunaId]) !== vencedorAnterior) break;
    const invalidaResultado = resultadoPreenchido(proxima);
    if (invalidaResultado) {
      comandos.push(d1.prepare(`INSERT INTO historico_resultados_partida
        (partida_id, resultado_anterior_json, resultado_novo_json, impacto_json, motivo)
        VALUES (?, ?, ?, ?, ?)`).bind(
        proximaId,
        JSON.stringify(resumoAuditoriaLinha(proxima)),
        JSON.stringify({ vencedorId: null, placarA: null, placarB: null, situacao: string(proxima.data) ? "agendada" : "data_a_definir" }),
        JSON.stringify([{ origemPartidaId: causaPartidaId }]),
        motivo,
      ));
    }
    comandos.push(d1.prepare(`UPDATE partidas SET ${colunaId} = NULL, ${colunaNome} = '',
      placar_a = CASE WHEN ? THEN NULL ELSE placar_a END,
      placar_b = CASE WHEN ? THEN NULL ELSE placar_b END,
      vencedor_id = CASE WHEN ? THEN NULL ELSE vencedor_id END,
      vencedor_nome = CASE WHEN ? THEN '' ELSE vencedor_nome END,
      forma_vitoria = CASE WHEN ? THEN '' ELSE forma_vitoria END,
      situacao = CASE WHEN ? THEN CASE WHEN data = '' THEN 'data_a_definir' ELSE 'agendada' END ELSE situacao END,
      atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(
      binario(invalidaResultado), binario(invalidaResultado), binario(invalidaResultado),
      binario(invalidaResultado), binario(invalidaResultado), binario(invalidaResultado), proximaId,
    ));
    if (!invalidaResultado) break;
    vencedorAnterior = nuloNumero(proxima.vencedor_id);
    origem = proxima;
  }
}

function comandoRecalcularFaseAtual(d1: ReturnType<typeof getD1>, campeonatoId: number) {
  return d1.prepare(`UPDATE campeonatos SET fase_atual = COALESCE(
    (SELECT f.nome FROM partidas p INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.campeonato_id = ? AND p.ativo = 1 AND f.ativo = 1
        AND p.situacao NOT IN ('encerrada', 'wo', 'cancelada')
      ORDER BY f.ordem, p.ordem, p.id LIMIT 1),
    (SELECT f.nome FROM fases_campeonato f
      WHERE f.campeonato_id = ? AND f.ativo = 1 ORDER BY f.ordem DESC, f.id DESC LIMIT 1),
    fase_atual
  ), atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).bind(campeonatoId, campeonatoId, campeonatoId);
}

function resultadoPreenchido(linha: Linha) {
  return linha.placar_a !== null && linha.placar_a !== undefined
    || linha.placar_b !== null && linha.placar_b !== undefined
    || linha.vencedor_id !== null && linha.vencedor_id !== undefined
    || ["em_andamento", "encerrada", "wo"].includes(string(linha.situacao));
}

function resultadoConsolidado(linha: Linha) {
  return linha.placar_a !== null && linha.placar_a !== undefined
    || linha.placar_b !== null && linha.placar_b !== undefined
    || linha.vencedor_id !== null && linha.vencedor_id !== undefined
    || ["encerrada", "wo"].includes(string(linha.situacao));
}

function validarAlteracaoPartida(linha: Linha, valor: unknown) {
  const recebido = objetoRecebido(valor);
  const mesclado: Record<string, unknown> = { ...formatarPartida(linha, true), ...recebido };
  const situacaoRecebida = typeof recebido.situacao === "string" ? recebido.situacao.trim().toLowerCase() : "";
  if (resultadoConsolidado(linha) && situacaoRecebida && !["encerrada", "wo"].includes(situacaoRecebida)) {
    mesclado.vencedorId = null;
    mesclado.formaVitoria = "";
    if (situacaoRecebida !== "em_andamento") {
      mesclado.placarA = null;
      mesclado.placarB = null;
      mesclado.placarPublicado = false;
    }
  }
  return { recebido, dados: validarPartida(mesclado) };
}

function resultadoDivergiu(linha: Linha, dados: ReturnType<typeof validarPartida>) {
  const situacaoAnterior = string(linha.situacao);
  const situacaoFinalMudou = dados.situacao !== situacaoAnterior
    && (["encerrada", "wo"].includes(dados.situacao) || ["encerrada", "wo"].includes(situacaoAnterior));
  const participantesDeResultadoMudaram = resultadoConsolidado(linha)
    && (dados.participanteAId !== nuloNumero(linha.participante_a_id)
      || dados.participanteBId !== nuloNumero(linha.participante_b_id));
  return dados.placarA !== nuloNumero(linha.placar_a)
    || dados.placarB !== nuloNumero(linha.placar_b)
    || dados.vencedorId !== nuloNumero(linha.vencedor_id)
    || dados.formaVitoria !== string(linha.forma_vitoria)
    || situacaoFinalMudou
    || participantesDeResultadoMudaram;
}

function agendaDivergiu(linha: Linha, dados: ReturnType<typeof validarPartida>) {
  return dados.data !== string(linha.data)
    || dados.horario !== string(linha.horario)
    || dados.local !== string(linha.local);
}

function resumoResultadoLinha(linha: Linha) {
  return { placarA: nuloNumero(linha.placar_a), placarB: nuloNumero(linha.placar_b), vencedorId: nuloNumero(linha.vencedor_id),
    vencedorNome: string(linha.vencedor_nome), formaVitoria: string(linha.forma_vitoria), situacao: string(linha.situacao) };
}

function resumoResultado(dados: ReturnType<typeof validarPartida>, valores: readonly unknown[]) {
  return { placarA: dados.placarA, placarB: dados.placarB, vencedorId: dados.vencedorId,
    vencedorNome: string(valores[10]), formaVitoria: dados.formaVitoria, situacao: dados.situacao };
}

function resumoAuditoriaLinha(linha: Linha) {
  return {
    ...resumoResultadoLinha(linha),
    participanteAId: nuloNumero(linha.participante_a_id),
    participanteBId: nuloNumero(linha.participante_b_id),
    data: string(linha.data),
    horario: string(linha.horario),
    local: string(linha.local),
    proximaPartidaId: nuloNumero(linha.proxima_partida_id),
    proximaPosicao: string(linha.proxima_posicao),
    publicado: bool(linha.publicado),
  };
}

function resumoAuditoria(dados: ReturnType<typeof validarPartida>, valores: readonly unknown[]) {
  return {
    ...resumoResultado(dados, valores),
    participanteAId: dados.participanteAId,
    participanteBId: dados.participanteBId,
    data: dados.data,
    horario: dados.horario,
    local: dados.local,
    proximaPartidaId: dados.proximaPartidaId,
    proximaPosicao: dados.proximaPosicao,
    publicado: dados.publicado,
  };
}

function formatarHistoricoDatas(linhas: Linha[]) {
  return linhas.flatMap((linha) => {
    const anterior = lerObjetoJson(linha.resultado_anterior_json);
    const novo = lerObjetoJson(linha.resultado_novo_json);
    if (!anterior || !novo) return [];
    const dataAnterior = string(anterior.data);
    const horarioAnterior = string(anterior.horario);
    const localAnterior = string(anterior.local);
    const mudou = dataAnterior !== string(novo.data)
      || horarioAnterior !== string(novo.horario)
      || localAnterior !== string(novo.local);
    if (!bool(anterior.publicado) || !mudou || (!dataAnterior && !horarioAnterior && !localAnterior)) return [];
    return [{
      data: dataAnterior,
      horario: horarioAnterior,
      local: localAnterior,
      observacao: localAnterior ? `Programação anterior — local: ${localAnterior}` : "Programação anterior",
      alteradoEm: string(linha.criado_em),
    }];
  });
}

function lerObjetoJson(valor: unknown): Linha | null {
  if (typeof valor !== "string") return null;
  try {
    const recebido = JSON.parse(valor) as unknown;
    return recebido && typeof recebido === "object" && !Array.isArray(recebido) ? recebido as Linha : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatação e SQL das reuniões

function formatarReuniao(linha: Linha, todos: boolean): ReuniaoPublica | ReuniaoAdministrativa {
  const publicaQuantidade = bool(linha.quantidade_participantes_publicada);
  const publico: ReuniaoPublica = {
    id: numero(linha.id), slug: string(linha.slug), titulo: string(linha.titulo), tipo: linha.tipo as ReuniaoPublica["tipo"],
    data: string(linha.data), horarioInicial: string(linha.horario_inicial), horarioFinal: string(linha.horario_final),
    horario: combinarHorario(string(linha.horario_inicial), string(linha.horario_final)), local: string(linha.local),
    turno: string(linha.turno), niveisEnsino: string(linha.niveis_ensino).split("\n").filter(Boolean),
    descricaoCurta: string(linha.descricao_curta), responsaveis: string(linha.responsaveis), pauta: string(linha.pauta),
    discussoes: string(linha.discussoes), resumo: string(linha.resumo), decisoes: string(linha.decisoes),
    propostas: string(linha.propostas), encaminhamentos: string(linha.encaminhamentos), ata: string(linha.ata),
    transcricao: string(linha.transcricao), observacoesPublicas: string(linha.observacoes_publicas),
    quantidadeParticipantes: todos || publicaQuantidade ? numero(linha.quantidade_presentes) : null,
    situacao: linha.situacao as ReuniaoPublica["situacao"], arquivado: Boolean(linha.arquivado_em), atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return {
    ...publico, pautaInterna: string(linha.pauta_interna), observacoesInternas: string(linha.observacoes_internas),
    quantidadeParticipantesPublicada: publicaQuantidade, publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    arquivadoEm: nuloString(linha.arquivado_em), criadoEm: string(linha.criado_em),
  } satisfies ReuniaoAdministrativa;
}

function formatarItemReuniao(linha: Linha, todos = false): ItemReuniaoPublico | ItemReuniaoAdministrativo {
  const publico: ItemReuniaoPublico = {
    id: numero(linha.id), tipo: string(linha.tipo), titulo: string(linha.titulo), conteudo: string(linha.conteudo),
    responsaveis: string(linha.responsaveis), prazo: string(linha.prazo), ordem: numero(linha.ordem), atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publico;
  return {
    ...publico, reuniaoId: numero(linha.reuniao_id), publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    criadoEm: string(linha.criado_em),
  } satisfies ItemReuniaoAdministrativo;
}

function formatarOpcaoVotacao(linha: Linha): OpcaoVotacaoPublica {
  return { id: numero(linha.id), texto: string(linha.texto), quantidadeVotos: numero(linha.quantidade_votos), ordem: numero(linha.ordem) };
}

function formatarVotacao(linha: Linha, opcoes: OpcaoVotacaoPublica[], todos: boolean): VotacaoPublica {
  const publica: VotacaoPublica = {
    id: numero(linha.id), titulo: string(linha.titulo), pergunta: string(linha.pergunta), contexto: string(linha.contexto),
    abstencoes: numero(linha.abstencoes), resultado: string(linha.resultado), decisaoFinal: string(linha.decisao_final),
    observacaoPublica: string(linha.observacao_publica), ordem: numero(linha.ordem),
    opcoes: opcoes.filter((opcao) => {
      const original = opcao as OpcaoVotacaoPublica & { votacaoId?: number };
      return original.votacaoId === undefined || original.votacaoId === numero(linha.id);
    }),
    atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publica;
  return Object.assign(publica, {
    observacaoInterna: string(linha.observacao_interna), publicado: bool(linha.publicado), interno: bool(linha.interno),
    ativo: bool(linha.ativo), criadoEm: string(linha.criado_em),
  });
}

// mantém o vínculo interno apenas durante a associação com a votação
function formatarOpcaoVotacaoComVinculo(linha: Linha) {
  return { ...formatarOpcaoVotacao(linha), votacaoId: numero(linha.votacao_id) };
}

function formatarPresenca(linha: Linha, todos: boolean): PresencaPublica | PresencaAdministrativa {
  const publica: PresencaPublica = {
    id: numero(linha.id), nome: string(linha.nome_snapshot), nivelEnsino: string(linha.nivel_ensino_snapshot),
    serie: string(linha.serie_snapshot), turma: string(linha.turma_snapshot), turno: string(linha.turno_snapshot),
    funcao: string(linha.funcao_snapshot), situacao: linha.situacao as PresencaPublica["situacao"],
    observacaoPublica: string(linha.observacao_publica), atualizadoEm: string(linha.atualizado_em),
  };
  if (!todos) return publica;
  return {
    ...publica, reuniaoId: numero(linha.reuniao_id), representanteId: nuloNumero(linha.representante_id),
    observacaoInterna: string(linha.observacao_interna), publicado: bool(linha.publicado), ativo: bool(linha.ativo),
    criadoEm: string(linha.criado_em),
  } satisfies PresencaAdministrativa;
}

const sqlInserirReuniao = `INSERT INTO reunioes (
  slug, titulo, tipo, data, horario_inicial, horario_final, local, turno, niveis_ensino, descricao_curta, responsaveis,
  pauta, pauta_interna, discussoes, resumo, decisoes, propostas, encaminhamentos, ata, transcricao,
  observacoes_publicas, observacoes_internas, quantidade_participantes_publicada, situacao, publicado, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarReuniao = `UPDATE reunioes SET
  slug = ?, titulo = ?, tipo = ?, data = ?, horario_inicial = ?, horario_final = ?, local = ?, turno = ?, niveis_ensino = ?,
  descricao_curta = ?, responsaveis = ?, pauta = ?, pauta_interna = ?, discussoes = ?, resumo = ?, decisoes = ?, propostas = ?,
  encaminhamentos = ?, ata = ?, transcricao = ?, observacoes_publicas = ?, observacoes_internas = ?,
  quantidade_participantes_publicada = ?, situacao = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;
function valoresReuniao(dados: ReturnType<typeof validarReuniao>) {
  return [dados.slug, dados.titulo, dados.tipo, dados.data, dados.horarioInicial, dados.horarioFinal, dados.local, dados.turno,
    dados.niveisEnsino.join("\n"), dados.descricaoCurta, dados.responsaveis, dados.pauta, dados.pautaInterna, dados.discussoes,
    dados.resumo, dados.decisoes, dados.propostas, dados.encaminhamentos, dados.ata, dados.transcricao,
    dados.observacoesPublicas, dados.observacoesInternas, binario(dados.quantidadeParticipantesPublicada), dados.situacao,
    binario(dados.publicado), binario(dados.ativo)];
}

const sqlInserirItemReuniao = `INSERT INTO itens_reuniao
  (reuniao_id, tipo, titulo, conteudo, responsaveis, prazo, ordem, publicado, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarItemReuniao = `UPDATE itens_reuniao SET tipo = ?, titulo = ?, conteudo = ?, responsaveis = ?, prazo = ?,
  ordem = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;
function valoresItemReuniao(dados: ReturnType<typeof validarItemReuniao>) {
  return [dados.tipo, dados.titulo, dados.conteudo, dados.responsaveis, dados.prazo, dados.ordem, binario(dados.publicado), binario(dados.ativo)];
}

const sqlInserirVotacao = `INSERT INTO votacoes_reuniao (
  reuniao_id, titulo, pergunta, contexto, abstencoes, resultado, decisao_final, observacao_publica, observacao_interna,
  ordem, publicado, interno, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarVotacao = `UPDATE votacoes_reuniao SET titulo = ?, pergunta = ?, contexto = ?, abstencoes = ?, resultado = ?,
  decisao_final = ?, observacao_publica = ?, observacao_interna = ?, ordem = ?, publicado = ?, interno = ?, ativo = ?,
  atualizado_em = CURRENT_TIMESTAMP`;
function valoresVotacao(dados: ReturnType<typeof validarVotacao>) {
  return [dados.titulo, dados.pergunta, dados.contexto, dados.abstencoes, dados.resultado, dados.decisaoFinal,
    dados.observacaoPublica, dados.observacaoInterna, dados.ordem, binario(dados.publicado), binario(dados.interno), binario(dados.ativo)];
}
const sqlInserirOpcaoVotacao = `INSERT INTO opcoes_votacao_reuniao (votacao_id, texto, quantidade_votos, ordem, ativo) VALUES (?, ?, ?, ?, ?)`;

const sqlInserirPresenca = `INSERT INTO presencas_reuniao (
  reuniao_id, representante_id, nome_snapshot, nivel_ensino_snapshot, serie_snapshot, turma_snapshot,
  turma_normalizada_snapshot, turno_snapshot, funcao_snapshot, situacao, observacao_publica, observacao_interna, publicado, ativo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const sqlAtualizarPresenca = `UPDATE presencas_reuniao SET representante_id = ?, nome_snapshot = ?, nivel_ensino_snapshot = ?,
  serie_snapshot = ?, turma_snapshot = ?, turma_normalizada_snapshot = ?, turno_snapshot = ?, funcao_snapshot = ?, situacao = ?,
  observacao_publica = ?, observacao_interna = ?, publicado = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP`;
function valoresPresenca(dados: ReturnType<typeof validarPresenca>) {
  return [dados.representanteId, dados.nomeSnapshot, dados.nivelEnsinoSnapshot, dados.serieSnapshot, dados.turmaSnapshot,
    dados.turmaNormalizadaSnapshot, dados.turnoSnapshot, dados.funcaoSnapshot, dados.situacao, dados.observacaoPublica,
    dados.observacaoInterna, binario(dados.publicado), binario(dados.ativo)];
}

async function obterVotacao(id: number, todos: boolean) {
  const filtro = todos ? "" : "AND publicado = 1 AND interno = 0 AND ativo = 1";
  const d1 = getD1();
  const [votacao, opcoes] = await d1.batch([
    d1.prepare(`SELECT * FROM votacoes_reuniao WHERE id = ? ${filtro}`).bind(id),
    d1.prepare(`SELECT * FROM opcoes_votacao_reuniao WHERE votacao_id = ? ${todos ? "" : "AND ativo = 1"} ORDER BY ordem, id`).bind(id),
  ]);
  const linha = (votacao.results as Linha[])[0];
  if (!linha) throw new ErroEventos("Votação não encontrada.", 404);
  return formatarVotacao(linha, (opcoes.results as Linha[]).map(formatarOpcaoVotacaoComVinculo), todos);
}

async function executarLotesD1(d1: ReturnType<typeof getD1>, comandos: D1PreparedStatement[]) {
  for (let inicio = 0; inicio < comandos.length; inicio += 50) await d1.batch(comandos.slice(inicio, inicio + 50));
}
