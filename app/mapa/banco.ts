// importa o acesso direto ao banco
import { getD1 } from "../../db";
// importa as funções de normalização do mapa
import {
  aliasesNormalizados,
  normalizarNumeroSala,
  normalizarSlug,
  normalizarTextoBusca,
  normalizarTurno,
} from "./normalizacao";
// importa os tipos dos dados do mapa
import type {
  CategoriaMapa,
  DadosMapa,
  EnsalamentoMapa,
  EntidadeMapa,
  ExportacaoMapa,
  LocalMapa,
  TurmaAtividadeMapa,
} from "./tipos";
// importa as validações dos dados do mapa
import {
  ErroMapa,
  idPositivo,
  objetoRecebido,
  validarCategoriaMapa,
  validarEnsalamentoMapa,
  validarLocalMapa,
  validarTurmaMapa,
  type EnsalamentoMapaValidado,
  type LocalMapaValidado,
  type TurmaMapaValidada,
} from "./validacao";

// define uma linha de categoria do banco
type LinhaCategoria = {
  id: number;
  grupo: "atividade" | "local";
  slug: string;
  nome: string;
  ativo: number;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
};

// define uma linha de local do banco
type LinhaLocal = {
  id: number;
  nome: string;
  numero: string;
  nome_alternativo: string;
  tipo: string;
  ala: string;
  andar: string;
  bloco: string;
  setor: string;
  corredor: string;
  referencia: string;
  descricao: string;
  instrucoes: string;
  observacoes: string;
  acessibilidade: string;
  horario: string;
  imagem_url: string;
  ordem: number;
  ativo: number;
  publicado: number;
  criado_em: string;
  atualizado_em: string;
};

// define uma linha de turma do banco
type LinhaTurma = {
  id: number;
  nome: string;
  nome_normalizado: string;
  aliases: string;
  turno: "manha" | "tarde" | "noite";
  tipo: string;
  curso: string;
  serie: string;
  turma: string;
  descricao: string;
  observacoes: string;
  inicio_validade: string;
  fim_validade: string;
  ordem: number;
  ativo: number;
  publicado: number;
  criado_em: string;
  atualizado_em: string;
};

// define uma linha de ensalamento do banco
type LinhaEnsalamento = {
  id: number;
  turma_atividade_id: number;
  local_id: number | null;
  turno: "manha" | "tarde" | "noite";
  tipo: string;
  observacoes: string;
  inicio_validade: string;
  fim_validade: string;
  ordem: number;
  ativo: number;
  publicado: number;
  criado_em: string;
  atualizado_em: string;
};

// define os filtros aceitos na listagem
type OpcoesListagem = {
  todos?: boolean;
  busca?: string;
  turno?: string;
  tipo?: string;
};

// busca os dados completos do mapa
export async function obterDadosMapa(opcoes: OpcoesListagem = {}): Promise<DadosMapa> {
  // prepara o banco e os filtros de publicação
  const d1 = getD1();
  const todos = Boolean(opcoes.todos);
  // limita turmas e ensalamentos ao período atual
  const filtroVigente = `(inicio_validade = '' OR inicio_validade <= date('now'))
    AND (fim_validade = '' OR fim_validade >= date('now'))`;

  // escolhe entre consultas privadas e públicas
  const consultas = todos
    ? [
      d1.prepare("SELECT * FROM categorias_mapa ORDER BY grupo, ordem, nome COLLATE NOCASE, id"),
      d1.prepare("SELECT * FROM locais_colegio ORDER BY ordem, numero, nome COLLATE NOCASE, id"),
      d1.prepare("SELECT * FROM turmas_atividades ORDER BY ordem, nome COLLATE NOCASE, id"),
      d1.prepare("SELECT * FROM ensalamentos ORDER BY ordem, id"),
    ]
    : [
      // busca somente categorias locais e turmas publicados
      d1.prepare("SELECT * FROM categorias_mapa WHERE ativo = 1 ORDER BY grupo, ordem, nome COLLATE NOCASE, id"),
      d1.prepare(`SELECT l.* FROM locais_colegio l
        WHERE l.publicado = 1 AND l.ativo = 1
          AND EXISTS (
            SELECT 1 FROM categorias_mapa c
            WHERE c.grupo = 'local' AND c.slug = l.tipo AND c.ativo = 1
          )
        ORDER BY l.ordem, l.numero, l.nome COLLATE NOCASE, l.id`),
      d1.prepare(`SELECT t.* FROM turmas_atividades t
        WHERE t.publicado = 1 AND t.ativo = 1 AND ${filtroVigente}
          AND EXISTS (
            SELECT 1 FROM categorias_mapa c
            WHERE c.grupo = 'atividade' AND c.slug = t.tipo AND c.ativo = 1
          )
        ORDER BY t.ordem, t.nome COLLATE NOCASE, t.id`),
      d1.prepare(`SELECT e.* FROM ensalamentos e
        INNER JOIN turmas_atividades t ON t.id = e.turma_atividade_id
        LEFT JOIN locais_colegio l ON l.id = e.local_id
        WHERE e.publicado = 1 AND e.ativo = 1 AND ${filtroVigente.replaceAll("inicio_validade", "e.inicio_validade").replaceAll("fim_validade", "e.fim_validade")}
          AND t.publicado = 1 AND t.ativo = 1
          AND (t.inicio_validade = '' OR t.inicio_validade <= date('now'))
          AND (t.fim_validade = '' OR t.fim_validade >= date('now'))
          AND e.turno = t.turno AND e.tipo = t.tipo
          AND EXISTS (
            SELECT 1 FROM categorias_mapa ct
            WHERE ct.grupo = 'atividade' AND ct.slug = t.tipo AND ct.ativo = 1
          )
          AND (e.local_id IS NULL OR (
            l.publicado = 1 AND l.ativo = 1
            AND EXISTS (
              SELECT 1 FROM categorias_mapa cl
              WHERE cl.grupo = 'local' AND cl.slug = l.tipo AND cl.ativo = 1
            )
          ))
        ORDER BY e.ordem, e.id`),
    ];

  // executa todas as consultas em uma chamada
  const [categorias, locais, turmas, ensalamentos] = await d1.batch(consultas);
  // transforma as linhas do banco em dados do portal
  const dados: DadosMapa = {
    categorias: (categorias.results as LinhaCategoria[]).map(formatarCategoria),
    locais: (locais.results as LinhaLocal[]).map(formatarLocal),
    turmas: (turmas.results as LinhaTurma[]).map(formatarTurma),
    ensalamentos: (ensalamentos.results as LinhaEnsalamento[]).map(formatarEnsalamento),
  };

  // aplica os filtros de texto turno e tipo
  return filtrarDados(dados, opcoes);
}

// cria uma cópia completa dos dados do mapa
export async function exportarDadosMapa(): Promise<ExportacaoMapa> {
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    ...await obterDadosMapa({ todos: true }),
  };
}

// cria um registro na entidade escolhida
export async function criarRegistroMapa(entidade: EntidadeMapa, valor: unknown) {
  const d1 = getD1();
  // valida e cria uma categoria
  if (entidade === "categorias") {
    const dados = validarCategoriaMapa(valor);
    try {
      // devolve a categoria criada pelo banco
      const linha = await d1.prepare(`INSERT INTO categorias_mapa (grupo, slug, nome, ativo, ordem)
        VALUES (?, ?, ?, ?, ?) RETURNING *`)
        .bind(dados.grupo, dados.slug, dados.nome, numeroBooleano(dados.ativo), dados.ordem)
        .first<LinhaCategoria>();
      return linha ? formatarCategoria(linha) : null;
    } catch (erro) {
      converterErroUnico(erro, "Já existe uma categoria com esse identificador.");
    }
  }

  // valida e cria um local
  if (entidade === "locais") {
    const dados = validarLocalMapa(valor);
    await exigirCategoria("local", dados.tipo);
    const linha = await d1.prepare(`${sqlInserirLocal} RETURNING *`)
      .bind(...valoresLocal(dados))
      .first<LinhaLocal>();
    return linha ? formatarLocal(linha) : null;
  }

  // valida e cria uma turma ou atividade
  if (entidade === "turmas") {
    const dados = validarTurmaMapa(valor);
    await exigirCategoria("atividade", dados.tipo);
    const linha = await d1.prepare(`${sqlInserirTurma} RETURNING *`)
      .bind(...valoresTurma(dados))
      .first<LinhaTurma>();
    return linha ? formatarTurma(linha) : null;
  }

  // valida e cria um ensalamento
  const dados = validarEnsalamentoMapa(valor);
  await validarReferenciasEnsalamento(dados);
  const linha = await d1.prepare(`${sqlInserirEnsalamento} RETURNING *`)
    .bind(...valoresEnsalamento(dados))
    .first<LinhaEnsalamento>();
  return linha ? formatarEnsalamento(linha) : null;
}

// atualiza um registro na entidade escolhida
export async function atualizarRegistroMapa(entidade: EntidadeMapa, idRecebido: unknown, valor: unknown) {
  // valida o identificador e abre o banco
  const id = idPositivo(idRecebido);
  const d1 = getD1();

  // atualiza uma categoria
  if (entidade === "categorias") {
    const existente = await buscarCategoria(id);
    if (!existente) throw new ErroMapa("Categoria não encontrada.", 404);
    const dados = validarCategoriaMapa(valor);
    // impede trocar o grupo de uma categoria usada
    if (existente.grupo !== dados.grupo && await contarReferenciasCategoria(existente.grupo, existente.slug)) {
      throw new ErroMapa("A categoria está em uso e não pode mudar de grupo.", 409);
    }
    try {
      // prepara a atualização da categoria
      const comandos = [d1.prepare(`UPDATE categorias_mapa
        SET grupo = ?, slug = ?, nome = ?, ativo = ?, ordem = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ?`)
        .bind(dados.grupo, dados.slug, dados.nome, numeroBooleano(dados.ativo), dados.ordem, id)];
      // atualiza os registros quando o identificador muda
      if (existente.slug !== dados.slug) {
        if (existente.grupo === "local") {
          comandos.push(d1.prepare("UPDATE locais_colegio SET tipo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE tipo = ?")
            .bind(dados.slug, existente.slug));
        } else {
          comandos.push(
            d1.prepare("UPDATE turmas_atividades SET tipo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE tipo = ?")
              .bind(dados.slug, existente.slug),
            d1.prepare("UPDATE ensalamentos SET tipo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE tipo = ?")
              .bind(dados.slug, existente.slug),
          );
        }
      }
      // salva a categoria e seus registros relacionados juntos
      await d1.batch(comandos);
    } catch (erro) {
      converterErroUnico(erro, "Já existe uma categoria com esse identificador.");
    }
    return buscarCategoria(id);
  }

  // atualiza um local
  if (entidade === "locais") {
    if (!await buscarLocal(id)) throw new ErroMapa("Sala ou local não encontrado.", 404);
    const dados = validarLocalMapa(valor);
    await exigirCategoria("local", dados.tipo);
    await d1.prepare(`${sqlAtualizarLocal} WHERE id = ?`).bind(...valoresLocal(dados), id).run();
    return buscarLocal(id);
  }

  // atualiza uma turma e seus ensalamentos
  if (entidade === "turmas") {
    if (!await buscarTurma(id)) throw new ErroMapa("Turma ou atividade não encontrada.", 404);
    const dados = validarTurmaMapa(valor);
    await exigirCategoria("atividade", dados.tipo);
    // mantém turno e tipo iguais nos vínculos da turma
    await d1.batch([
      d1.prepare(`${sqlAtualizarTurma} WHERE id = ?`).bind(...valoresTurma(dados), id),
      d1.prepare(`UPDATE ensalamentos
        SET turno = ?, tipo = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE turma_atividade_id = ?`).bind(dados.turno, dados.tipo, id),
    ]);
    return buscarTurma(id);
  }

  // atualiza um ensalamento
  if (!await buscarEnsalamento(id)) throw new ErroMapa("Ensalamento não encontrado.", 404);
  const dados = validarEnsalamentoMapa(valor);
  await validarReferenciasEnsalamento(dados);
  await d1.prepare(`${sqlAtualizarEnsalamento} WHERE id = ?`)
    .bind(...valoresEnsalamento(dados), id)
    .run();
  return buscarEnsalamento(id);
}

// exclui um registro da entidade escolhida
export async function excluirRegistroMapa(entidade: EntidadeMapa, idRecebido: unknown) {
  // valida o identificador e abre o banco
  const id = idPositivo(idRecebido);
  const d1 = getD1();
  // exclui uma categoria sem referências
  if (entidade === "categorias") {
    const existente = await buscarCategoria(id);
    if (!existente) throw new ErroMapa("Categoria não encontrada.", 404);
    if (await contarReferenciasCategoria(existente.grupo, existente.slug)) {
      throw new ErroMapa("A categoria está em uso. Troque a categoria dos registros antes de excluí-la.", 409);
    }
    await d1.prepare("DELETE FROM categorias_mapa WHERE id = ?").bind(id).run();
  // exclui um local sem ensalamentos
  } else if (entidade === "locais") {
    if (!await buscarLocal(id)) throw new ErroMapa("Sala ou local não encontrado.", 404);
    if (await contar("ensalamentos", "local_id", id)) {
      throw new ErroMapa("O local possui ensalamentos. Troque ou exclua esses vínculos antes.", 409);
    }
    await d1.prepare("DELETE FROM locais_colegio WHERE id = ?").bind(id).run();
  // exclui uma turma sem ensalamentos
  } else if (entidade === "turmas") {
    if (!await buscarTurma(id)) throw new ErroMapa("Turma ou atividade não encontrada.", 404);
    if (await contar("ensalamentos", "turma_atividade_id", id)) {
      throw new ErroMapa("A turma possui ensalamentos. Exclua esses vínculos antes.", 409);
    }
    await d1.prepare("DELETE FROM turmas_atividades WHERE id = ?").bind(id).run();
  // exclui um ensalamento
  } else {
    if (!await buscarEnsalamento(id)) throw new ErroMapa("Ensalamento não encontrado.", 404);
    await d1.prepare("DELETE FROM ensalamentos WHERE id = ?").bind(id).run();
  }
  return { removido: true };
}

// importa uma cópia dos dados do mapa
export async function importarDadosMapa(valor: unknown) {
  // valida o arquivo e sua versão
  const raiz = objetoRecebido(valor, "Escolha um arquivo de dados válido.");
  if (raiz.versao !== undefined && Number(raiz.versao) !== 1) {
    throw new ErroMapa("A versão da cópia de dados não é compatível.");
  }
  // limita o tamanho de cada lista recebida
  const categoriasRecebidas = listaImportacao(raiz.categorias, "categorias", 200);
  const locaisRecebidos = listaImportacao(raiz.locais, "locais", 2000);
  const turmasRecebidas = listaImportacao(raiz.turmas, "turmas", 5000);
  const ensalamentosRecebidos = listaImportacao(raiz.ensalamentos, "ensalamentos", 10000);
  if (!categoriasRecebidas.length && !locaisRecebidos.length && !turmasRecebidas.length && !ensalamentosRecebidos.length) {
    throw new ErroMapa("A cópia não contém registros do mapa.");
  }

  // valida todos os registros antes de alterar o banco
  const categorias = categoriasRecebidas.map(validarCategoriaMapa);
  const locais = locaisRecebidos.map((item) => ({ id: idImportacao(item), dados: validarLocalMapa(item) }));
  const turmas = turmasRecebidas.map((item) => ({ id: idImportacao(item), dados: validarTurmaMapa(item) }));
  const ensalamentos = ensalamentosRecebidos.map((item) => ({ id: idImportacao(item), dados: validarEnsalamentoMapa(item) }));
  // impede identificadores repetidos nas listas
  validarIdsUnicos(locais, "locais");
  validarIdsUnicos(turmas, "turmas");
  validarIdsUnicos(ensalamentos, "ensalamentos");

  // reúne as categorias atuais e as importadas
  const categoriasDisponiveis = await categoriasExistentes();
  categorias.forEach((categoria) => categoriasDisponiveis.add(`${categoria.grupo}:${categoria.slug}`));
  // confirma as categorias usadas pelos locais
  for (const local of locais) {
    if (!categoriasDisponiveis.has(`local:${local.dados.tipo}`)) {
      throw new ErroMapa(`A categoria de local “${local.dados.tipo}” não está cadastrada.`);
    }
  }
  // confirma as categorias usadas pelas turmas
  for (const turma of turmas) {
    if (!categoriasDisponiveis.has(`atividade:${turma.dados.tipo}`)) {
      throw new ErroMapa(`A categoria de atividade “${turma.dados.tipo}” não está cadastrada.`);
    }
  }

  // confirma todos os vínculos dos ensalamentos
  await validarReferenciasImportacao(locais, turmas, ensalamentos);
  // separa os comandos pela ordem das entidades
  const d1 = getD1();
  const comandosCategorias: InstrucaoD1[] = [];
  const comandosLocais: InstrucaoD1[] = [];
  const comandosTurmas: InstrucaoD1[] = [];
  const comandosEnsalamentos: InstrucaoD1[] = [];
  // prepara a criação ou atualização das categorias
  categorias.forEach((dados) => comandosCategorias.push(d1.prepare(`INSERT INTO categorias_mapa (grupo, slug, nome, ativo, ordem)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (grupo, slug) DO UPDATE SET
      nome = excluded.nome, ativo = excluded.ativo, ordem = excluded.ordem,
      atualizado_em = CURRENT_TIMESTAMP`)
    .bind(dados.grupo, dados.slug, dados.nome, numeroBooleano(dados.ativo), dados.ordem)));
  // prepara a criação ou atualização dos locais
  locais.forEach(({ id, dados }) => comandosLocais.push(d1.prepare(sqlImportarLocal()).bind(id, ...valoresLocal(dados))));
  // prepara as turmas e atualiza seus vínculos
  turmas.forEach(({ id, dados }) => comandosTurmas.push(
    d1.prepare(sqlImportarTurma()).bind(id, ...valoresTurma(dados)),
    d1.prepare(`UPDATE ensalamentos
      SET turno = ?, tipo = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE turma_atividade_id = ?`).bind(dados.turno, dados.tipo, id),
  ));
  // prepara a criação ou atualização dos ensalamentos
  ensalamentos.forEach(({ id, dados }) => comandosEnsalamentos.push(d1.prepare(sqlImportarEnsalamento()).bind(id, ...valoresEnsalamento(dados))));

  // executa as entidades na ordem de suas relações
  for (const comandos of [comandosCategorias, comandosLocais, comandosTurmas, comandosEnsalamentos]) {
    await executarEmLotes(d1, comandos);
  }
  // informa as quantidades importadas
  return {
    importados: {
      categorias: categorias.length,
      locais: locais.length,
      turmas: turmas.length,
      ensalamentos: ensalamentos.length,
    },
  };
}

// filtra os dados já carregados do mapa
function filtrarDados(dados: DadosMapa, opcoes: OpcoesListagem) {
  // normaliza os filtros recebidos
  const busca = normalizarTextoBusca(opcoes.busca).slice(0, 100);
  const buscaSala = normalizarNumeroSala(opcoes.busca).slice(0, 100);
  const turno = normalizarTurno(opcoes.turno);
  const tipo = normalizarSlug(opcoes.tipo);
  if (!busca && !turno && !tipo) return dados;

  // encontra as turmas que combinam diretamente
  const turmasDiretas = new Set(dados.turmas.filter((turma) =>
    (!turno || turma.turno === turno)
    && (!tipo || turma.tipo === tipo)
    && (!busca || normalizarTextoBusca([
      turma.nome, turma.aliases, turma.curso, turma.serie, turma.turma, turma.descricao,
    ].join(" ")).includes(busca)),
  ).map((turma) => turma.id));
  // encontra os locais que combinam diretamente
  const locaisDiretos = new Set(dados.locais.filter((local) => !busca ||
    normalizarTextoBusca([
      local.nome, local.nomeAlternativo, local.tipo, local.ala, local.andar, local.bloco,
      local.setor, local.corredor, local.referencia, local.descricao,
    ].join(" ")).includes(busca)
    || (buscaSala && normalizarNumeroSala(local.numero).includes(buscaSala)),
  ).map((local) => local.id));

  // mantém os ensalamentos ligados aos resultados
  const ensalamentos = dados.ensalamentos.filter((item) =>
    (!turno || item.turno === turno)
    && (!tipo || item.tipo === tipo)
    && (!busca || turmasDiretas.has(item.turmaAtividadeId) || (item.localId !== null && locaisDiretos.has(item.localId))),
  );
  // reúne os identificadores ligados aos ensalamentos
  const idsTurmas = new Set(turmasDiretas);
  const idsLocais = new Set<number>(turno || tipo ? [] : locaisDiretos);
  ensalamentos.forEach((item) => {
    idsTurmas.add(item.turmaAtividadeId);
    if (item.localId !== null) idsLocais.add(item.localId);
  });
  // devolve somente os registros relacionados
  return {
    categorias: dados.categorias,
    turmas: dados.turmas.filter((item) => idsTurmas.has(item.id)),
    locais: dados.locais.filter((item) => idsLocais.has(item.id)),
    ensalamentos,
  };
}

// confirma a turma o turno o tipo e o local do ensalamento
async function validarReferenciasEnsalamento(dados: EnsalamentoMapaValidado) {
  // exige uma turma existente
  const turma = await buscarTurma(dados.turmaAtividadeId);
  if (!turma) throw new ErroMapa("A turma ou atividade selecionada não existe.", 404);
  // mantém turno e tipo iguais aos da turma
  if (turma.turno !== dados.turno || turma.tipo !== dados.tipo) {
    throw new ErroMapa("O turno e o tipo do ensalamento devem ser iguais aos da turma ou atividade.");
  }
  // exige um local existente quando ele foi informado
  if (dados.localId !== null && !await buscarLocal(dados.localId)) {
    throw new ErroMapa("A sala ou local selecionado não existe.", 404);
  }
}

// exige uma categoria cadastrada
async function exigirCategoria(grupo: "atividade" | "local", slug: string) {
  const categoria = await getD1().prepare("SELECT id FROM categorias_mapa WHERE grupo = ? AND slug = ?")
    .bind(grupo, slug)
    .first<{ id: number }>();
  if (!categoria) throw new ErroMapa("A categoria selecionada não está cadastrada.");
}

// busca uma categoria pelo identificador
async function buscarCategoria(id: number) {
  const linha = await getD1().prepare("SELECT * FROM categorias_mapa WHERE id = ?").bind(id).first<LinhaCategoria>();
  return linha ? formatarCategoria(linha) : null;
}

// busca um local pelo identificador
async function buscarLocal(id: number) {
  const linha = await getD1().prepare("SELECT * FROM locais_colegio WHERE id = ?").bind(id).first<LinhaLocal>();
  return linha ? formatarLocal(linha) : null;
}

// busca uma turma pelo identificador
async function buscarTurma(id: number) {
  const linha = await getD1().prepare("SELECT * FROM turmas_atividades WHERE id = ?").bind(id).first<LinhaTurma>();
  return linha ? formatarTurma(linha) : null;
}

// busca um ensalamento pelo identificador
async function buscarEnsalamento(id: number) {
  const linha = await getD1().prepare("SELECT * FROM ensalamentos WHERE id = ?").bind(id).first<LinhaEnsalamento>();
  return linha ? formatarEnsalamento(linha) : null;
}

// conta os vínculos de um local ou turma
async function contar(tabela: "ensalamentos", coluna: "local_id" | "turma_atividade_id", id: number) {
  // usa somente tabela e colunas permitidas pelo tipo
  const linha = await getD1().prepare(`SELECT COUNT(*) AS total FROM ${tabela} WHERE ${coluna} = ?`)
    .bind(id)
    .first<{ total: number }>();
  return Number(linha?.total ?? 0);
}

// conta os registros que usam uma categoria
async function contarReferenciasCategoria(grupo: "atividade" | "local", slug: string) {
  // escolhe a tabela pelo grupo da categoria
  const tabela = grupo === "local" ? "locais_colegio" : "turmas_atividades";
  const linha = await getD1().prepare(`SELECT COUNT(*) AS total FROM ${tabela} WHERE tipo = ?`)
    .bind(slug)
    .first<{ total: number }>();
  return Number(linha?.total ?? 0);
}

// transforma uma linha do banco em categoria
function formatarCategoria(linha: LinhaCategoria): CategoriaMapa {
  return {
    id: linha.id,
    grupo: linha.grupo,
    slug: linha.slug,
    nome: linha.nome,
    ativo: Boolean(linha.ativo),
    ordem: linha.ordem,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

// transforma uma linha do banco em local
function formatarLocal(linha: LinhaLocal): LocalMapa {
  return {
    id: linha.id,
    nome: linha.nome,
    numero: linha.numero,
    nomeAlternativo: linha.nome_alternativo,
    tipo: linha.tipo,
    ala: linha.ala,
    andar: linha.andar,
    bloco: linha.bloco,
    setor: linha.setor,
    corredor: linha.corredor,
    referencia: linha.referencia,
    descricao: linha.descricao,
    instrucoes: linha.instrucoes,
    observacoes: linha.observacoes,
    acessibilidade: linha.acessibilidade,
    horario: linha.horario,
    imagemUrl: linha.imagem_url,
    ordem: linha.ordem,
    ativo: Boolean(linha.ativo),
    publicado: Boolean(linha.publicado),
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

// transforma uma linha do banco em turma
function formatarTurma(linha: LinhaTurma): TurmaAtividadeMapa {
  return {
    id: linha.id,
    nome: linha.nome,
    nomeNormalizado: linha.nome_normalizado,
    aliases: linha.aliases,
    turno: linha.turno,
    tipo: linha.tipo,
    curso: linha.curso,
    serie: linha.serie,
    turma: linha.turma,
    descricao: linha.descricao,
    observacoes: linha.observacoes,
    inicioValidade: linha.inicio_validade,
    fimValidade: linha.fim_validade,
    ordem: linha.ordem,
    ativo: Boolean(linha.ativo),
    publicado: Boolean(linha.publicado),
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

// transforma uma linha do banco em ensalamento
function formatarEnsalamento(linha: LinhaEnsalamento): EnsalamentoMapa {
  return {
    id: linha.id,
    turmaAtividadeId: linha.turma_atividade_id,
    localId: linha.local_id,
    turno: linha.turno,
    tipo: linha.tipo,
    observacoes: linha.observacoes,
    inicioValidade: linha.inicio_validade,
    fimValidade: linha.fim_validade,
    ordem: linha.ordem,
    ativo: Boolean(linha.ativo),
    publicado: Boolean(linha.publicado),
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

// coloca os valores do local na ordem da consulta
function valoresLocal(dados: LocalMapaValidado) {
  return [
    dados.nome,
    dados.nomeNormalizado,
    dados.numero,
    dados.numeroNormalizado,
    dados.nomeAlternativo,
    dados.nomeAlternativoNormalizado,
    dados.tipo,
    dados.ala,
    dados.andar,
    dados.bloco,
    dados.setor,
    dados.corredor,
    dados.referencia,
    dados.descricao,
    dados.instrucoes,
    dados.observacoes,
    dados.acessibilidade,
    dados.horario,
    dados.imagemUrl,
    dados.ordem,
    numeroBooleano(dados.ativo),
    numeroBooleano(dados.publicado),
  ];
}

// coloca os valores da turma na ordem da consulta
function valoresTurma(dados: TurmaMapaValidada) {
  return [
    dados.nome,
    dados.nomeNormalizado,
    dados.aliases,
    dados.aliasesNormalizados,
    dados.turno,
    dados.tipo,
    dados.curso,
    dados.serie,
    dados.turma,
    dados.descricao,
    dados.observacoes,
    dados.inicioValidade,
    dados.fimValidade,
    dados.ordem,
    numeroBooleano(dados.ativo),
    numeroBooleano(dados.publicado),
  ];
}

// coloca os valores do ensalamento na ordem da consulta
function valoresEnsalamento(dados: EnsalamentoMapaValidado) {
  return [
    dados.turmaAtividadeId,
    dados.localId,
    dados.turno,
    dados.tipo,
    dados.observacoes,
    dados.inicioValidade,
    dados.fimValidade,
    dados.ordem,
    numeroBooleano(dados.ativo),
    numeroBooleano(dados.publicado),
  ];
}

// define as colunas e consultas usadas pelos locais
const colunasLocal = `nome, nome_normalizado, numero, numero_normalizado,
  nome_alternativo, nome_alternativo_normalizado, tipo, ala, andar, bloco, setor,
  corredor, referencia, descricao, instrucoes, observacoes, acessibilidade, horario,
  imagem_url, ordem, ativo, publicado`;
// cria um marcador para cada valor do local
const placeholdersLocal = Array.from({ length: 22 }, () => "?").join(", ");
const sqlInserirLocal = `INSERT INTO locais_colegio (${colunasLocal}) VALUES (${placeholdersLocal})`;
// atualiza todos os campos editáveis do local
const sqlAtualizarLocal = `UPDATE locais_colegio SET
  nome = ?, nome_normalizado = ?, numero = ?, numero_normalizado = ?,
  nome_alternativo = ?, nome_alternativo_normalizado = ?, tipo = ?, ala = ?, andar = ?,
  bloco = ?, setor = ?, corredor = ?, referencia = ?, descricao = ?, instrucoes = ?,
  observacoes = ?, acessibilidade = ?, horario = ?, imagem_url = ?, ordem = ?, ativo = ?,
  publicado = ?, atualizado_em = CURRENT_TIMESTAMP`;

// define as colunas e consultas usadas pelas turmas
const colunasTurma = `nome, nome_normalizado, aliases, aliases_normalizados, turno, tipo,
  curso, serie, turma, descricao, observacoes, inicio_validade, fim_validade, ordem, ativo, publicado`;
// cria um marcador para cada valor da turma
const placeholdersTurma = Array.from({ length: 16 }, () => "?").join(", ");
const sqlInserirTurma = `INSERT INTO turmas_atividades (${colunasTurma}) VALUES (${placeholdersTurma})`;
// atualiza todos os campos editáveis da turma
const sqlAtualizarTurma = `UPDATE turmas_atividades SET
  nome = ?, nome_normalizado = ?, aliases = ?, aliases_normalizados = ?, turno = ?, tipo = ?,
  curso = ?, serie = ?, turma = ?, descricao = ?, observacoes = ?, inicio_validade = ?,
  fim_validade = ?, ordem = ?, ativo = ?, publicado = ?, atualizado_em = CURRENT_TIMESTAMP`;

// define as colunas e consultas usadas pelos ensalamentos
const colunasEnsalamento = `turma_atividade_id, local_id, turno, tipo, observacoes,
  inicio_validade, fim_validade, ordem, ativo, publicado`;
// cria um marcador para cada valor do ensalamento
const placeholdersEnsalamento = Array.from({ length: 10 }, () => "?").join(", ");
const sqlInserirEnsalamento = `INSERT INTO ensalamentos (${colunasEnsalamento}) VALUES (${placeholdersEnsalamento})`;
// atualiza todos os campos editáveis do ensalamento
const sqlAtualizarEnsalamento = `UPDATE ensalamentos SET
  turma_atividade_id = ?, local_id = ?, turno = ?, tipo = ?, observacoes = ?,
  inicio_validade = ?, fim_validade = ?, ordem = ?, ativo = ?, publicado = ?,
  atualizado_em = CURRENT_TIMESTAMP`;

// cria a consulta que insere ou atualiza um local
function sqlImportarLocal() {
  return `INSERT INTO locais_colegio (id, ${colunasLocal}) VALUES (?, ${placeholdersLocal})
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome, nome_normalizado = excluded.nome_normalizado,
      numero = excluded.numero, numero_normalizado = excluded.numero_normalizado,
      nome_alternativo = excluded.nome_alternativo,
      nome_alternativo_normalizado = excluded.nome_alternativo_normalizado,
      tipo = excluded.tipo, ala = excluded.ala, andar = excluded.andar, bloco = excluded.bloco,
      setor = excluded.setor, corredor = excluded.corredor, referencia = excluded.referencia,
      descricao = excluded.descricao, instrucoes = excluded.instrucoes,
      observacoes = excluded.observacoes, acessibilidade = excluded.acessibilidade,
      horario = excluded.horario, imagem_url = excluded.imagem_url, ordem = excluded.ordem,
      ativo = excluded.ativo, publicado = excluded.publicado, atualizado_em = CURRENT_TIMESTAMP`;
}

// cria a consulta que insere ou atualiza uma turma
function sqlImportarTurma() {
  return `INSERT INTO turmas_atividades (id, ${colunasTurma}) VALUES (?, ${placeholdersTurma})
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome, nome_normalizado = excluded.nome_normalizado,
      aliases = excluded.aliases, aliases_normalizados = excluded.aliases_normalizados,
      turno = excluded.turno, tipo = excluded.tipo, curso = excluded.curso,
      serie = excluded.serie, turma = excluded.turma, descricao = excluded.descricao,
      observacoes = excluded.observacoes, inicio_validade = excluded.inicio_validade,
      fim_validade = excluded.fim_validade, ordem = excluded.ordem, ativo = excluded.ativo,
      publicado = excluded.publicado, atualizado_em = CURRENT_TIMESTAMP`;
}

// cria a consulta que insere ou atualiza um ensalamento
function sqlImportarEnsalamento() {
  return `INSERT INTO ensalamentos (id, ${colunasEnsalamento}) VALUES (?, ${placeholdersEnsalamento})
    ON CONFLICT (id) DO UPDATE SET
      turma_atividade_id = excluded.turma_atividade_id, local_id = excluded.local_id,
      turno = excluded.turno, tipo = excluded.tipo, observacoes = excluded.observacoes,
      inicio_validade = excluded.inicio_validade, fim_validade = excluded.fim_validade,
      ordem = excluded.ordem, ativo = excluded.ativo, publicado = excluded.publicado,
      atualizado_em = CURRENT_TIMESTAMP`;
}

// transforma verdadeiro ou falso em número do banco
function numeroBooleano(valor: boolean) {
  return valor ? 1 : 0;
}

// transforma conflito de chave única em erro simples
function converterErroUnico(erro: unknown, mensagem: string): never {
  if (erro instanceof Error && /unique constraint/i.test(erro.message)) throw new ErroMapa(mensagem, 409);
  throw erro;
}

// valida uma lista recebida na importação
function listaImportacao(valor: unknown, nome: string, limite: number) {
  if (valor === undefined) return [];
  if (!Array.isArray(valor)) throw new ErroMapa(`A lista de ${nome} é inválida.`);
  if (valor.length > limite) throw new ErroMapa(`A lista de ${nome} excede o limite permitido.`);
  return valor.map((item) => objetoRecebido(item, `Há um registro inválido na lista de ${nome}.`));
}

// lê e valida o identificador de uma cópia
function idImportacao(item: Record<string, unknown>) {
  return idPositivo(item.id, "identificador da cópia");
}

// impede identificadores repetidos na mesma lista
function validarIdsUnicos(itens: Array<{ id: number }>, nome: string) {
  const ids = new Set<number>();
  // registra cada identificador apenas uma vez
  for (const item of itens) {
    if (ids.has(item.id)) throw new ErroMapa(`A cópia contém ${nome} com identificadores repetidos.`);
    ids.add(item.id);
  }
}

// busca as categorias já cadastradas
async function categoriasExistentes() {
  // cria chaves com o grupo e o identificador
  const resultado = await getD1().prepare("SELECT grupo, slug FROM categorias_mapa").all<{ grupo: string; slug: string }>();
  return new Set(resultado.results.map((item: { grupo: string; slug: string }) => `${item.grupo}:${item.slug}`));
}

// valida os vínculos recebidos na importação
async function validarReferenciasImportacao(
  locais: Array<{ id: number; dados: LocalMapaValidado }>,
  turmas: Array<{ id: number; dados: TurmaMapaValidada }>,
  ensalamentos: Array<{ id: number; dados: EnsalamentoMapaValidado }>,
) {
  // guarda locais e turmas da própria cópia
  const idsLocais = new Set(locais.map((item) => item.id));
  const turmasImportadas = new Map(turmas.map((item) => [item.id, item.dados]));
  const d1 = getD1();
  // verifica cada ensalamento recebido
  for (const item of ensalamentos) {
    let turma = turmasImportadas.get(item.dados.turmaAtividadeId);
    // procura a turma atual quando ela não veio na cópia
    if (!turma) {
      const existente = await buscarTurma(item.dados.turmaAtividadeId);
      if (existente) turma = {
        ...existente,
        aliasesNormalizados: aliasesNormalizados(existente.aliases),
      };
    }
    // confirma turma turno e tipo
    if (!turma) throw new ErroMapa("A cópia contém ensalamento sem turma correspondente.");
    if (turma.turno !== item.dados.turno || turma.tipo !== item.dados.tipo) {
      throw new ErroMapa("A cópia contém ensalamento com turno ou tipo diferente da turma.");
    }
    // procura o local atual quando ele não veio na cópia
    if (item.dados.localId !== null && !idsLocais.has(item.dados.localId)) {
      const local = await d1.prepare("SELECT id FROM locais_colegio WHERE id = ?")
        .bind(item.dados.localId)
        .first<{ id: number }>();
      if (!local) throw new ErroMapa("A cópia contém ensalamento sem local correspondente.");
    }
  }
}

// define os tipos usados nos comandos em lote
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
