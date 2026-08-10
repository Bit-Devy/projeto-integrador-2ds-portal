import {
  formatosCampeonato,
  funcoesRepresentante,
  situacoesEvento,
  situacoesPartida,
  situacoesPresenca,
  situacoesReuniao,
  tiposFase,
  tiposReuniao,
  turnosEventos,
  type FormatoCampeonato,
  type FuncaoRepresentante,
  type SituacaoEvento,
  type SituacaoPartida,
  type SituacaoPresenca,
  type SituacaoReuniao,
  type TipoFase,
  type TipoReuniao,
  type TurnoEvento,
} from "./tipos";
import {
  normalizarSituacaoEvento,
  normalizarSlugPublico,
  normalizarTextoBusca,
  normalizarTurma,
  normalizarTurno,
} from "./normalizacao";

export class ErroEventos extends Error {
  status: number;
  detalhes?: unknown;

  constructor(mensagem: string, status = 400, detalhes?: unknown) {
    super(mensagem);
    this.name = "ErroEventos";
    this.status = status;
    this.detalhes = detalhes;
  }
}

export function objetoRecebido(valor: unknown, mensagem = "Envie os dados do registro.") {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErroEventos(mensagem);
  return valor as Record<string, unknown>;
}

// aceita tanto o corpo direto quanto o envelope { dados: {...} }
export function dadosDoCorpo(valor: unknown) {
  const corpo = objetoRecebido(valor);
  if (corpo.dados === undefined) return corpo;
  return { ...objetoRecebido(corpo.dados), id: corpo.id ?? objetoRecebido(corpo.dados).id };
}

export function idPositivo(valor: unknown, rotulo = "registro") {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErroEventos(`Escolha um ${rotulo} válido.`);
  return id;
}

export function paginaValida(parametros: URLSearchParams) {
  return inteiroIntervalo(parametros.get("pagina"), 1, 1, 1_000_000, "página");
}

export function limiteValido(parametros: URLSearchParams, maximo = 100) {
  return inteiroIntervalo(parametros.get("limite"), 20, 1, maximo, "limite");
}

export function validarEventoInterno(valor: unknown) {
  const dados = objetoRecebido(valor);
  const titulo = textoObrigatorio(dados.titulo, 180, "título");
  const dataInicial = data(dados.dataInicial, "data inicial");
  const dataFinal = data(dados.dataFinal, "data final");
  validarPeriodo(dataInicial, dataFinal, "A data final não pode ser anterior à data inicial.");
  const horarioInicial = horario(dados.horarioInicial ?? dados.horario, "horário inicial");
  const horarioFinal = horario(dados.horarioFinal, "horário final");
  const situacao = enumValor(normalizarSituacaoEvento(dados.situacao ?? "proximo"), situacoesEvento, "situação") as SituacaoEvento;
  const turno = turnoOpcional(dados.turno);
  return {
    slug: normalizarSlugPublico(dados.slug || titulo),
    titulo,
    subtitulo: texto(dados.subtitulo, 240),
    descricaoCurta: textoLongo(dados.descricaoCurta, 600),
    descricao: textoLongo(dados.descricao, 30_000),
    categoria: texto(dados.categoria, 100),
    imagemCapaUrl: link(dados.imagemCapaUrl ?? dados.imagem, "imagem de capa"),
    dataInicial,
    dataFinal,
    horarioInicial,
    horarioFinal,
    local: texto(dados.local, 240),
    turno,
    publicoDestinado: texto(dados.publicoDestinado ?? dados.publico, 240),
    organizacao: texto(dados.organizacao, 240),
    programacao: textoLongo(dados.programacao, 20_000),
    orientacoes: textoLongo(dados.orientacoes, 10_000),
    linkExterno: link(dados.linkExterno, "link externo"),
    observacoesPublicas: textoLongo(dados.observacoesPublicas ?? dados.observacoes, 10_000),
    observacoesInternas: textoLongo(dados.observacoesInternas, 10_000),
    situacao,
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
    documentos: listaLinks(dados.documentos, "documentos"),
    imagens: listaLinks(dados.imagens, "imagens"),
  };
}

export function validarDocumento(valor: unknown) {
  const dados = objetoRecebido(valor);
  const arquivoUrl = link(dados.arquivoUrl ?? dados.url, "arquivo");
  const linkExterno = link(dados.linkExterno, "link externo");
  if (!arquivoUrl && !linkExterno) throw new ErroEventos("Informe o arquivo ou o link do documento.");
  return {
    titulo: textoObrigatorio(dados.titulo ?? dados.nome, 180, "título do documento"),
    tipo: identificador(dados.tipo, "anexo"),
    descricao: textoLongo(dados.descricao, 2000),
    arquivoChave: texto(dados.arquivoChave ?? dados.chave, 500),
    arquivoUrl,
    linkExterno,
    data: data(dados.data, "data do documento"),
    ordem: inteiro(dados.ordem),
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarCampeonato(valor: unknown) {
  const dados = objetoRecebido(valor);
  const nome = textoObrigatorio(dados.nome ?? dados.titulo, 180, "nome do campeonato");
  const dataInicial = data(dados.dataInicial, "data inicial");
  const dataFinal = data(dados.dataFinal, "data final");
  validarPeriodo(dataInicial, dataFinal, "A data final do campeonato não pode ser anterior à inicial.");
  const ano = inteiroOpcional(dados.ano, 1900, 2200, "ano");
  const formato = enumValor(dados.formato ?? "mata_mata", formatosCampeonato, "formato") as FormatoCampeonato;
  const situacao = enumValor(normalizarSituacaoEvento(dados.situacao ?? "proximo"), situacoesEvento, "situação") as SituacaoEvento;
  return {
    slug: normalizarSlugPublico(dados.slug || nome),
    nome,
    edicao: texto(dados.edicao, 100),
    ano,
    modalidade: textoObrigatorio(dados.modalidade, 100, "modalidade"),
    categoria: texto(dados.categoria, 100),
    turno: turnoOpcional(dados.turno),
    descricao: textoLongo(dados.descricao, 30_000),
    regulamento: textoLongo(dados.regulamento, 30_000),
    organizacao: texto(dados.organizacao, 240),
    locais: textoLongo(dados.locais ?? dados.local, 2000),
    observacoesPublicas: textoLongo(dados.observacoesPublicas ?? dados.observacoes, 10_000),
    observacoesInternas: textoLongo(dados.observacoesInternas, 10_000),
    formato,
    situacao,
    faseAtual: texto(dados.faseAtual, 120),
    dataInicial,
    dataFinal,
    imagemCapaUrl: link(dados.imagemCapaUrl ?? dados.imagem, "imagem de capa"),
    chavePublicada: booleano(dados.chavePublicada, false),
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarAtualizacaoCampeonato(valor: unknown) {
  const dados = objetoRecebido(valor);
  return {
    titulo: textoObrigatorio(dados.titulo, 180, "título da atualização"),
    texto: textoLongo(dados.texto, 20_000),
    data: data(dados.data, "data da atualização"),
    ordem: inteiro(dados.ordem),
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarParticipante(valor: unknown) {
  const dados = objetoRecebido(valor);
  const nome = textoObrigatorio(dados.nome, 160, "nome do participante");
  return {
    turmaAtividadeId: idOpcional(dados.turmaAtividadeId, "turma"),
    nome,
    nomeNormalizado: normalizarTextoBusca(nome),
    nomeExibicao: texto(dados.nomeExibicao, 160),
    apelido: texto(dados.apelido, 100),
    posicaoInicial: inteiroIntervalo(dados.posicaoInicial, 0, 0, 10_000, "posição inicial"),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarFase(valor: unknown) {
  const dados = objetoRecebido(valor);
  return {
    nome: textoObrigatorio(dados.nome, 120, "nome da fase"),
    ordem: inteiroIntervalo(dados.ordem, 0, 0, 10_000, "ordem da fase"),
    tipo: enumValor(dados.tipo ?? "eliminatoria", tiposFase, "tipo de fase") as TipoFase,
    quantidadeJogos: inteiroIntervalo(dados.quantidadeJogos, 0, 0, 10_000, "quantidade de jogos"),
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarPartida(valor: unknown) {
  const dados = objetoRecebido(valor);
  const participanteAId = idOpcional(dados.participanteAId, "participante A");
  const participanteBId = idOpcional(dados.participanteBId, "participante B");
  if (participanteAId && participanteBId && participanteAId === participanteBId) {
    throw new ErroEventos("Uma equipe não pode jogar contra ela mesma.");
  }
  const vencedorId = idOpcional(dados.vencedorId, "vencedor");
  if (vencedorId && vencedorId !== participanteAId && vencedorId !== participanteBId) {
    throw new ErroEventos("O vencedor precisa participar da partida.");
  }
  const situacao = enumValor(dados.situacao ?? "data_a_definir", situacoesPartida, "situação da partida") as SituacaoPartida;
  const formaVitoria = texto(dados.formaVitoria, 160);
  if (situacao === "wo" && !vencedorId) throw new ErroEventos("Escolha o vencedor da partida por W.O.");
  if ((situacao === "encerrada" || situacao === "wo") && !vencedorId) {
    throw new ErroEventos("Escolha o vencedor para encerrar a partida.");
  }
  const proximaPosicao = texto(dados.proximaPosicao, 1).toLowerCase();
  if (proximaPosicao && proximaPosicao !== "a" && proximaPosicao !== "b") {
    throw new ErroEventos("Escolha a posição A ou B na próxima partida.");
  }
  return {
    faseId: idPositivo(dados.faseId, "fase"),
    rodada: texto(dados.rodada, 100),
    ordem: inteiroIntervalo(dados.ordem, 0, 0, 10_000, "ordem da partida"),
    participanteAId,
    participanteBId,
    placarA: placar(dados.placarA, "placar A"),
    placarB: placar(dados.placarB, "placar B"),
    vencedorId,
    formaVitoria,
    data: data(dados.data, "data da partida"),
    horario: horario(dados.horario, "horário da partida"),
    local: texto(dados.local, 240),
    situacao,
    placarPublicado: booleano(dados.placarPublicado, false),
    resumo: textoLongo(dados.resumo, 20_000),
    destaques: textoLongo(dados.destaques, 10_000),
    observacoesPublicas: textoLongo(dados.observacoesPublicas ?? dados.observacoes, 10_000),
    observacoesInternas: textoLongo(dados.observacoesInternas, 10_000),
    proximaPartidaId: idOpcional(dados.proximaPartidaId, "próxima partida"),
    proximaPosicao: proximaPosicao as "" | "a" | "b",
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarRepresentante(valor: unknown) {
  const dados = objetoRecebido(valor);
  const nome = textoObrigatorio(dados.nome, 180, "nome do representante");
  const nomeExibicao = texto(dados.nomeExibicao, 180);
  const turma = textoObrigatorio(dados.turma, 100, "turma");
  const turno = normalizarTurno(dados.turno);
  if (!turno || !turnosEventos.includes(turno as TurnoEvento)) throw new ErroEventos("Escolha um turno válido.");
  const funcao = enumValor(dados.funcao, funcoesRepresentante, "função") as FuncaoRepresentante;
  const inicioMandato = data(dados.inicioMandato, "início do mandato");
  const fimMandato = data(dados.fimMandato, "fim do mandato");
  validarPeriodo(inicioMandato, fimMandato, "O fim do mandato não pode ser anterior ao início.");
  return {
    turmaAtividadeId: idOpcional(dados.turmaAtividadeId, "turma cadastrada"),
    nome,
    nomeExibicao,
    // o mesmo índice atende buscas pelo nome completo e pelo nome escolhido para exibição
    nomeNormalizado: [normalizarTextoBusca(nome), normalizarTextoBusca(nomeExibicao)].filter(Boolean).join(" "),
    nivelEnsino: textoObrigatorio(dados.nivelEnsino ?? dados.nivel, 120, "nível de ensino"),
    serie: textoObrigatorio(dados.serie ?? dados.anoSerie, 80, "ano ou série"),
    turma,
    turmaNormalizada: normalizarTurma(turma),
    turno: turno as TurnoEvento,
    funcao,
    inicioMandato,
    fimMandato,
    ordem: inteiro(dados.ordem),
    observacaoPublica: textoLongo(dados.observacaoPublica ?? dados.observacoes, 4000),
    observacaoInterna: textoLongo(dados.observacaoInterna, 4000),
    ativo: booleano(dados.ativo, true),
    publicado: booleano(dados.publicado, false),
  };
}

export function validarReuniao(valor: unknown) {
  const dados = objetoRecebido(valor);
  const titulo = textoObrigatorio(dados.titulo, 180, "título da reunião");
  const horarioInicial = horario(dados.horarioInicial ?? dados.horario, "horário inicial");
  const horarioFinal = horario(dados.horarioFinal, "horário final");
  const turno = turnoOpcional(dados.turno);
  const niveis = listaTextos(dados.niveisEnsino ?? dados.nivelEnsino, 120, 20);
  return {
    slug: normalizarSlugPublico(dados.slug || titulo),
    titulo,
    tipo: enumValor(dados.tipo, tiposReuniao, "tipo de reunião") as TipoReuniao,
    data: data(dados.data, "data da reunião"),
    horarioInicial,
    horarioFinal,
    local: texto(dados.local, 240),
    turno,
    niveisEnsino: niveis,
    descricaoCurta: textoLongo(dados.descricaoCurta, 600),
    responsaveis: textoLongo(dados.responsaveis, 2000),
    pauta: textoLongo(dados.pauta, 30_000),
    pautaInterna: textoLongo(dados.pautaInterna, 30_000),
    discussoes: textoLongo(dados.discussoes ?? dados.assuntosDiscutidos, 30_000),
    resumo: textoLongo(dados.resumo, 30_000),
    decisoes: textoLongo(dados.decisoes, 30_000),
    propostas: textoLongo(dados.propostas, 30_000),
    encaminhamentos: textoLongo(dados.encaminhamentos, 30_000),
    ata: textoLongo(dados.ata, 60_000),
    transcricao: textoLongo(dados.transcricao, 60_000),
    observacoesPublicas: textoLongo(dados.observacoesPublicas ?? dados.observacoes, 10_000),
    observacoesInternas: textoLongo(dados.observacoesInternas, 10_000),
    quantidadeParticipantesPublicada: booleano(dados.quantidadeParticipantesPublicada, false),
    situacao: enumValor(dados.situacao ?? "agendada", situacoesReuniao, "situação") as SituacaoReuniao,
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarItemReuniao(valor: unknown) {
  const dados = objetoRecebido(valor);
  const tipo = identificador(dados.tipo, "item");
  const titulo = texto(dados.titulo, 180);
  const conteudo = textoLongo(dados.conteudo ?? dados.descricao, 20_000);
  if (!titulo && !conteudo) throw new ErroEventos("Informe o título ou o conteúdo do item.");
  return {
    tipo,
    titulo,
    conteudo,
    responsaveis: textoLongo(dados.responsaveis, 2000),
    prazo: data(dados.prazo, "prazo"),
    ordem: inteiro(dados.ordem),
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarVotacao(valor: unknown) {
  const dados = objetoRecebido(valor);
  const opcoes = Array.isArray(dados.opcoes) ? dados.opcoes.map(validarOpcaoVotacao) : [];
  return {
    titulo: textoObrigatorio(dados.titulo, 180, "título da votação"),
    pergunta: textoLongo(dados.pergunta ?? dados.proposta, 4000),
    contexto: textoLongo(dados.contexto, 10_000),
    abstencoes: inteiroIntervalo(dados.abstencoes, 0, 0, 100_000, "abstenções"),
    resultado: textoLongo(dados.resultado, 4000),
    decisaoFinal: textoLongo(dados.decisaoFinal, 4000),
    observacaoPublica: textoLongo(dados.observacaoPublica ?? dados.observacoes, 4000),
    observacaoInterna: textoLongo(dados.observacaoInterna, 4000),
    ordem: inteiro(dados.ordem),
    publicado: booleano(dados.publicado, false),
    interno: booleano(dados.interno, true),
    ativo: booleano(dados.ativo, true),
    opcoes,
  };
}

export function validarOpcaoVotacao(valor: unknown) {
  const dados = objetoRecebido(valor, "Envie uma opção de votação válida.");
  return {
    id: dados.id === undefined ? null : idPositivo(dados.id, "opção"),
    texto: textoObrigatorio(dados.texto ?? dados.titulo, 300, "texto da opção"),
    quantidadeVotos: inteiroIntervalo(dados.quantidadeVotos ?? dados.votos, 0, 0, 100_000, "quantidade de votos"),
    ordem: inteiro(dados.ordem),
    ativo: booleano(dados.ativo, true),
  };
}

export function validarPresenca(valor: unknown) {
  const dados = objetoRecebido(valor);
  const representanteId = idOpcional(dados.representanteId, "representante");
  const nomeSnapshot = textoObrigatorio(dados.nomeSnapshot ?? dados.nome, 180, "nome na presença");
  const turmaSnapshot = texto(dados.turmaSnapshot ?? dados.turma, 100);
  const turnoRecebido = dados.turnoSnapshot ?? dados.turno;
  const turnoSnapshot = turnoRecebido ? turnoOpcional(turnoRecebido) : "";
  return {
    representanteId,
    nomeSnapshot,
    nivelEnsinoSnapshot: texto(dados.nivelEnsinoSnapshot ?? dados.nivelEnsino, 120),
    serieSnapshot: texto(dados.serieSnapshot ?? dados.serie, 80),
    turmaSnapshot,
    turmaNormalizadaSnapshot: normalizarTurma(turmaSnapshot),
    turnoSnapshot,
    funcaoSnapshot: texto(dados.funcaoSnapshot ?? dados.funcao, 80),
    situacao: enumValor(dados.situacao ?? "nao_informada", situacoesPresenca, "situação da presença") as SituacaoPresenca,
    observacaoPublica: textoLongo(dados.observacaoPublica ?? dados.observacoes, 2000),
    observacaoInterna: textoLongo(dados.observacaoInterna, 2000),
    publicado: booleano(dados.publicado, false),
    ativo: booleano(dados.ativo, true),
  };
}

export function textoFiltro(valor: string | null, limite = 120) {
  return texto(valor, limite);
}

export function booleano(valor: unknown, padrao: boolean) {
  if (valor === undefined || valor === null || valor === "") return padrao;
  if (typeof valor === "boolean") return valor;
  if (valor === 0 || valor === 1) return Boolean(valor);
  if (valor === "0" || valor === "false") return false;
  if (valor === "1" || valor === "true") return true;
  throw new ErroEventos("Há um campo de seleção com formato inválido.");
}

export function texto(valor: unknown, limite: number) {
  if (valor === undefined || valor === null) return "";
  if (typeof valor !== "string" && typeof valor !== "number") throw new ErroEventos("Há um campo de texto com formato inválido.");
  return String(valor).trim().slice(0, limite);
}

function textoObrigatorio(valor: unknown, limite: number, rotulo: string) {
  const resultado = texto(valor, limite);
  if (!resultado) throw new ErroEventos(`Informe ${rotulo}.`);
  return resultado;
}

function textoLongo(valor: unknown, limite: number) {
  return texto(valor, limite).replace(/\r\n?/g, "\n");
}

function identificador(valor: unknown, padrao: string) {
  const resultado = normalizarSlugPublico(valor).replaceAll("-", "_");
  return resultado || padrao;
}

function inteiro(valor: unknown) {
  return inteiroIntervalo(valor, 0, -1_000_000, 1_000_000, "ordem");
}

function inteiroIntervalo(valor: unknown, padrao: number, minimo: number, maximo: number, rotulo: string) {
  if (valor === undefined || valor === null || valor === "") return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) throw new ErroEventos(`Informe ${rotulo} válido.`);
  return numero;
}

function inteiroOpcional(valor: unknown, minimo: number, maximo: number, rotulo: string) {
  if (valor === undefined || valor === null || valor === "") return null;
  return inteiroIntervalo(valor, minimo, minimo, maximo, rotulo);
}

function idOpcional(valor: unknown, rotulo: string) {
  if (valor === undefined || valor === null || valor === "") return null;
  return idPositivo(valor, rotulo);
}

function placar(valor: unknown, rotulo: string) {
  if (valor === undefined || valor === null || valor === "") return null;
  return inteiroIntervalo(valor, 0, 0, 10_000, rotulo);
}

function data(valor: unknown, rotulo: string) {
  const resultado = texto(valor, 10);
  if (!resultado) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resultado)) throw new ErroEventos(`Informe uma data válida para ${rotulo}.`);
  const instante = new Date(`${resultado}T00:00:00Z`);
  if (Number.isNaN(instante.getTime()) || instante.toISOString().slice(0, 10) !== resultado) {
    throw new ErroEventos(`Informe uma data válida para ${rotulo}.`);
  }
  return resultado;
}

function horario(valor: unknown, rotulo: string) {
  const resultado = texto(valor, 5);
  if (!resultado) return "";
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(resultado)) throw new ErroEventos(`Informe um horário válido para ${rotulo}.`);
  return resultado;
}

function validarPeriodo(inicio: string, fim: string, mensagem: string) {
  if (inicio && fim && fim < inicio) throw new ErroEventos(mensagem);
}

function link(valor: unknown, rotulo: string) {
  const resultado = texto(valor, 1200);
  if (!resultado) return "";
  if (resultado.startsWith("/") && !resultado.startsWith("//")) return resultado;
  try {
    const url = new URL(resultado);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // a mensagem abaixo cobre também endereços incompletos
  }
  throw new ErroEventos(`Informe um endereço válido para ${rotulo}.`);
}

function listaLinks(valor: unknown, rotulo: string) {
  if (valor === undefined || valor === null || valor === "") return [] as string[];
  if (!Array.isArray(valor) || valor.length > 100) throw new ErroEventos(`Envie uma lista válida de ${rotulo}.`);
  return valor.map((item) => {
    if (typeof item === "string") return link(item, rotulo);
    const dados = objetoRecebido(item);
    return link(dados.arquivoUrl ?? dados.url ?? dados.linkExterno, rotulo);
  });
}

function listaTextos(valor: unknown, limiteItem: number, maximoItens: number) {
  if (valor === undefined || valor === null || valor === "") return [] as string[];
  const itens = Array.isArray(valor) ? valor : String(valor).split(/[,;\n]+/);
  if (itens.length > maximoItens) throw new ErroEventos("A lista contém itens demais.");
  return [...new Set(itens.map((item) => texto(item, limiteItem)).filter(Boolean))];
}

function turnoOpcional(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return "";
  const turno = normalizarTurno(valor);
  if (!turno || !turnosEventos.includes(turno as TurnoEvento)) throw new ErroEventos("Escolha um turno válido.");
  return turno as TurnoEvento;
}

function enumValor<T extends readonly string[]>(valor: unknown, aceitos: T, rotulo: string): T[number] {
  const recebido = String(valor ?? "").trim().toLowerCase();
  if (!aceitos.includes(recebido)) throw new ErroEventos(`Escolha ${rotulo} válido.`);
  return recebido as T[number];
}
