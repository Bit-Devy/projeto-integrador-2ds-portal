// importa as funções de normalização do mapa
import {
  aliasesNormalizados,
  normalizarNumeroSala,
  normalizarSlug,
  normalizarTextoBusca,
  normalizarTurno,
} from "./normalizacao";
// importa as alas e os tipos do mapa
import { alasMapa, type AlaMapa, type GrupoCategoriaMapa, type TurnoMapa } from "./tipos";

// define um erro esperado nas operações do mapa
export class ErroMapa extends Error {
  // guarda a mensagem e o estado da resposta
  constructor(mensagem: string, public status = 400) {
    super(mensagem);
    this.name = "ErroMapa";
  }
}

// define uma categoria depois da validação
export type CategoriaMapaValidada = {
  grupo: GrupoCategoriaMapa;
  slug: string;
  nome: string;
  ativo: boolean;
  ordem: number;
};

// define um local depois da validação
export type LocalMapaValidado = {
  nome: string;
  nomeNormalizado: string;
  numero: string;
  numeroNormalizado: string;
  nomeAlternativo: string;
  nomeAlternativoNormalizado: string;
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
  imagemUrl: string;
  ordem: number;
  ativo: boolean;
  publicado: boolean;
};

// define uma turma depois da validação
export type TurmaMapaValidada = {
  nome: string;
  nomeNormalizado: string;
  aliases: string;
  aliasesNormalizados: string;
  turno: TurnoMapa;
  tipo: string;
  curso: string;
  serie: string;
  turma: string;
  descricao: string;
  observacoes: string;
  inicioValidade: string;
  fimValidade: string;
  ordem: number;
  ativo: boolean;
  publicado: boolean;
};

// define um ensalamento depois da validação
export type EnsalamentoMapaValidado = {
  turmaAtividadeId: number;
  localId: number | null;
  turno: TurnoMapa;
  tipo: string;
  observacoes: string;
  inicioValidade: string;
  fimValidade: string;
  ordem: number;
  ativo: boolean;
  publicado: boolean;
};

// confirma se o valor recebido é um objeto
export function objetoRecebido(valor: unknown, mensagem = "Envie os dados do registro.") {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErroMapa(mensagem);
  return valor as Record<string, unknown>;
}

// valida e limpa uma categoria do mapa
export function validarCategoriaMapa(valor: unknown): CategoriaMapaValidada {
  // lê os campos básicos da categoria
  const dados = objetoRecebido(valor);
  const grupo = texto(dados.grupo, 20).toLowerCase();
  // aceita somente os dois grupos conhecidos
  if (grupo !== "atividade" && grupo !== "local") {
    throw new ErroMapa("Escolha um grupo de categoria válido.");
  }
  // cria o identificador pelo nome quando necessário
  const nome = texto(dados.nome, 100);
  const slug = normalizarSlug(dados.slug || nome);
  if (!nome) throw new ErroMapa("Informe o nome da categoria.");
  if (!slug) throw new ErroMapa("Informe um identificador válido para a categoria.");
  // devolve somente os campos válidos
  return { grupo, slug, nome, ativo: booleano(dados.ativo, true), ordem: inteiro(dados.ordem) };
}

// valida e limpa um local do mapa
export function validarLocalMapa(valor: unknown): LocalMapaValidado {
  // exige um nome ou número
  const dados = objetoRecebido(valor);
  const nome = texto(dados.nome, 160);
  const numero = texto(dados.numero, 30);
  if (!nome && !numero) throw new ErroMapa("Informe o nome ou o número do local.");

  // normaliza os campos usados nos filtros
  const nomeAlternativo = texto(dados.nomeAlternativo, 240);
  const tipo = normalizarSlug(dados.tipo) || "outro";
  const ala = normalizarAlaMapa(dados.ala);
  const publicado = booleano(dados.publicado, false);
  // exige uma ala antes da publicação
  if (publicado && !ala) {
    throw new ErroMapa("Escolha a ala antes de publicar o local.");
  }
  // limita e organiza todos os campos do local
  return {
    nome,
    nomeNormalizado: normalizarTextoBusca(nome),
    numero,
    numeroNormalizado: normalizarNumeroSala(numero),
    nomeAlternativo,
    nomeAlternativoNormalizado: normalizarTextoBusca(nomeAlternativo),
    tipo,
    ala,
    andar: texto(dados.andar, 80),
    bloco: texto(dados.bloco, 100),
    setor: texto(dados.setor, 100),
    corredor: texto(dados.corredor, 100),
    referencia: textoLongo(dados.referencia, 1000),
    descricao: textoLongo(dados.descricao, 4000),
    instrucoes: textoLongo(dados.instrucoes, 4000),
    observacoes: textoLongo(dados.observacoes, 4000),
    acessibilidade: textoLongo(dados.acessibilidade, 2000),
    horario: textoLongo(dados.horario, 1000),
    imagemUrl: validarLink(dados.imagemUrl),
    ordem: inteiro(dados.ordem),
    ativo: booleano(dados.ativo, true),
    publicado,
  };
}

// encontra uma ala aceita pelo mapa
export function normalizarAlaMapa(valor: unknown): AlaMapa | "" {
  const ala = texto(valor, 80);
  if (!ala) return "";
  // compara a ala sem diferenças de acentos
  const chave = normalizarTextoBusca(ala);
  const encontrada = alasMapa.find((opcao) => normalizarTextoBusca(opcao) === chave);
  if (!encontrada) {
    throw new ErroMapa("Escolha uma ala válida: Par, Ímpar ou Fora do prédio.");
  }
  return encontrada;
}

// valida e limpa uma turma ou atividade
export function validarTurmaMapa(valor: unknown): TurmaMapaValidada {
  // normaliza os campos principais
  const dados = objetoRecebido(valor);
  const nome = texto(dados.nome, 160);
  const nomeNormalizado = normalizarTextoBusca(texto(dados.nomeNormalizado, 160) || nome);
  const turno = normalizarTurno(dados.turno);
  const tipo = normalizarSlug(dados.tipo);
  // confirma os campos obrigatórios
  if (!nome) throw new ErroMapa("Informe o nome da turma ou atividade.");
  if (!turno) throw new ErroMapa("Escolha um turno válido.");
  if (!tipo) throw new ErroMapa("Escolha o tipo da turma ou atividade.");
  // valida as datas de vigência
  const aliases = textoLongo(dados.aliases, 2000);
  const inicioValidade = data(dados.inicioValidade, "início da validade");
  const fimValidade = data(dados.fimValidade, "fim da validade");
  validarPeriodo(inicioValidade, fimValidade);
  // limita e organiza todos os campos da turma
  return {
    nome,
    nomeNormalizado,
    aliases,
    aliasesNormalizados: aliasesNormalizados(aliases),
    turno,
    tipo,
    curso: texto(dados.curso, 160),
    serie: texto(dados.serie, 80),
    turma: texto(dados.turma, 80),
    descricao: textoLongo(dados.descricao, 4000),
    observacoes: textoLongo(dados.observacoes, 4000),
    inicioValidade,
    fimValidade,
    ordem: inteiro(dados.ordem),
    ativo: booleano(dados.ativo, true),
    publicado: booleano(dados.publicado, false),
  };
}

// valida e limpa um ensalamento
export function validarEnsalamentoMapa(valor: unknown): EnsalamentoMapaValidado {
  // exige uma turma e aceita um local vazio
  const dados = objetoRecebido(valor);
  const turmaAtividadeId = idPositivo(dados.turmaAtividadeId, "turma ou atividade");
  // transforma o local vazio em valor nulo
  const localId = dados.localId === null || dados.localId === "" || dados.localId === undefined
    ? null
    : idPositivo(dados.localId, "sala ou local");
  // valida turno tipo e período
  const turno = normalizarTurno(dados.turno);
  const tipo = normalizarSlug(dados.tipo);
  if (!turno) throw new ErroMapa("Escolha um turno válido.");
  if (!tipo) throw new ErroMapa("Escolha um tipo válido.");
  const inicioValidade = data(dados.inicioValidade, "início da validade");
  const fimValidade = data(dados.fimValidade, "fim da validade");
  validarPeriodo(inicioValidade, fimValidade);
  // devolve somente os campos válidos
  return {
    turmaAtividadeId,
    localId,
    turno,
    tipo,
    observacoes: textoLongo(dados.observacoes, 4000),
    inicioValidade,
    fimValidade,
    ordem: inteiro(dados.ordem),
    ativo: booleano(dados.ativo, true),
    publicado: booleano(dados.publicado, false),
  };
}

// valida um identificador positivo
export function idPositivo(valor: unknown, nome = "registro") {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErroMapa(`Escolha um ${nome} válido.`);
  return id;
}

// transforma um valor em texto limitado
function texto(valor: unknown, limite: number) {
  if (valor === undefined || valor === null) return "";
  if (typeof valor !== "string" && typeof valor !== "number") {
    throw new ErroMapa("Há um campo de texto com formato inválido.");
  }
  return String(valor).trim().slice(0, limite);
}

// padroniza as quebras de linha de um texto longo
function textoLongo(valor: unknown, limite: number) {
  return texto(valor, limite).replace(/\r\n?/g, "\n");
}

// transforma a ordem recebida em número inteiro
function inteiro(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return 0;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || Math.abs(numero) > 1_000_000) {
    throw new ErroMapa("Informe uma ordem de exibição válida.");
  }
  return numero;
}

// transforma valores aceitos em verdadeiro ou falso
function booleano(valor: unknown, padrao: boolean) {
  if (valor === undefined || valor === null) return padrao;
  if (typeof valor === "boolean") return valor;
  if (valor === 1 || valor === 0) return Boolean(valor);
  throw new ErroMapa("Há um campo de seleção com formato inválido.");
}

// valida uma data no formato de ano mês e dia
function data(valor: unknown, rotulo: string) {
  const textoData = texto(valor, 10);
  if (!textoData) return "";
  // confirma o formato básico da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(textoData)) {
    throw new ErroMapa(`Informe uma data válida para ${rotulo}.`);
  }
  // confirma se a data existe no calendário
  const instante = new Date(`${textoData}T00:00:00Z`);
  if (Number.isNaN(instante.getTime()) || instante.toISOString().slice(0, 10) !== textoData) {
    throw new ErroMapa(`Informe uma data válida para ${rotulo}.`);
  }
  return textoData;
}

// confirma se a data final não vem antes da inicial
function validarPeriodo(inicio: string, fim: string) {
  if (inicio && fim && fim < inicio) {
    throw new ErroMapa("A data final da validade deve ser igual ou posterior à data inicial.");
  }
}

// aceita somente links internos ou endereços web
function validarLink(valor: unknown) {
  const link = texto(valor, 1000);
  if (!link) return "";
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  try {
    // confirma o protocolo do endereço
    const url = new URL(link);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // a mensagem abaixo também cobre endereços incompletos
  }
  throw new ErroMapa("Informe um endereço válido para a imagem ou mapa.");
}
