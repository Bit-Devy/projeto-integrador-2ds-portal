// Tipos usados somente pela interface pública do sistema de eventos.
// Todos os campos opcionais podem deixar de ser publicados pela gestão.

export type DocumentoPublico = {
  id?: number;
  titulo?: string;
  tipo?: string;
  descricao?: string;
  url?: string;
  arquivoUrl?: string;
  link?: string;
  linkExterno?: string;
  data?: string;
  ordem?: number;
};

export type ImagemPublica = {
  id?: number;
  titulo?: string;
  url?: string;
  arquivoUrl?: string;
  legenda?: string;
  descricao?: string;
  textoAlternativo?: string;
};

export type EventoPublico = {
  id?: number;
  slug?: string;
  titulo?: string;
  subtitulo?: string;
  descricaoCurta?: string;
  descricao?: string;
  descricaoCompleta?: string;
  categoria?: string;
  imagemCapa?: string;
  imagemCapaUrl?: string;
  dataInicio?: string;
  dataInicial?: string;
  dataFinal?: string;
  dataFim?: string;
  horario?: string;
  horarioInicial?: string;
  horarioFinal?: string;
  local?: string;
  turno?: string;
  publicoDestinado?: string;
  organizacao?: string;
  organizacaoResponsavel?: string;
  programacao?: string | string[];
  orientacoes?: string | string[];
  linkExterno?: string;
  documentos?: DocumentoPublico[];
  imagens?: ImagemPublica[];
  observacoes?: string;
  observacoesPublicas?: string;
  situacao?: string;
  arquivado?: boolean;
  atualizadoEm?: string;
};

export type ParticipantePublico = {
  id?: number;
  nome?: string;
  nomeExibicao?: string;
  apelido?: string;
};

export type JogoPublico = {
  id?: number;
  slug?: string;
  campeonatoSlug?: string;
  fase?: string;
  faseNome?: string;
  faseId?: number;
  rodada?: string | number;
  ordem?: number;
  participanteA?: string | ParticipantePublico;
  participanteB?: string | ParticipantePublico;
  nomeParticipanteA?: string;
  nomeParticipanteB?: string;
  participanteANome?: string;
  participanteBNome?: string;
  placarA?: number | string | null;
  placarB?: number | string | null;
  placarPublicado?: boolean;
  vencedor?: string | ParticipantePublico;
  vencedorNome?: string;
  formaVitoria?: string;
  data?: string;
  horario?: string;
  local?: string;
  situacao?: string;
  informacoes?: string;
  resumo?: string;
  observacoes?: string;
  observacoesPublicas?: string;
  destaques?: string | string[];
  historicoDatas?: Array<{ data?: string; horario?: string; observacao?: string }>;
  atualizacoes?: Array<{ data?: string; texto?: string; titulo?: string }>;
  imagens?: ImagemPublica[];
  proximaPartida?: JogoPublico;
  proximaPartidaId?: number | null;
  campeonatoNome?: string;
  atualizadoEm?: string;
};

export type FasePublica = {
  id?: number;
  nome?: string;
  ordem?: number;
  tipo?: string;
  jogos?: JogoPublico[];
  partidas?: JogoPublico[];
};

export type ClassificacaoPublica = {
  id?: number;
  posicao?: number;
  participante?: string | ParticipantePublico;
  pontos?: number;
  jogos?: number;
  vitorias?: number;
  empates?: number;
  derrotas?: number;
  saldo?: number;
};

export type InterclassePublico = {
  id?: number;
  slug?: string;
  nome?: string;
  edicao?: string;
  ano?: number | string;
  modalidade?: string;
  categoria?: string;
  turno?: string;
  imagem?: string;
  imagemUrl?: string;
  imagemCapaUrl?: string;
  dataInicio?: string;
  dataInicial?: string;
  dataFinal?: string;
  dataFim?: string;
  dataPrevistaEncerramento?: string;
  situacao?: string;
  faseAtual?: string;
  proximoJogo?: JogoPublico;
  proximaPartida?: JogoPublico;
  ultimoResultado?: JogoPublico;
  campeao?: string | ParticipantePublico;
  descricao?: string;
  descricaoCompleta?: string;
  regulamento?: string;
  organizacao?: string;
  local?: string;
  locais?: string | string[];
  quantidadeEquipes?: number;
  quantidadeParticipantes?: number;
  fases?: FasePublica[];
  jogos?: JogoPublico[];
  classificacao?: ClassificacaoPublica[];
  documentos?: DocumentoPublico[];
  atualizacoes?: Array<{ data?: string; titulo?: string; texto?: string }>;
  observacoes?: string;
  observacoesPublicas?: string;
  atualizadoEm?: string;
};

export type PresencaPublica = {
  id?: number;
  nome?: string;
  nomePreservado?: string;
  nomeSnapshot?: string;
  turma?: string;
  turmaPreservada?: string;
  turmaSnapshot?: string;
  turno?: string;
  turnoPreservado?: string;
  turnoSnapshot?: string;
  nivelEnsino?: string;
  nivelEnsinoPreservado?: string;
  nivelEnsinoSnapshot?: string;
  anoSerie?: string;
  serieSnapshot?: string;
  funcao?: string;
  funcaoPreservada?: string;
  funcaoSnapshot?: string;
  situacao?: string;
};

export type VotacaoPublica = {
  id?: number;
  titulo?: string;
  pergunta?: string;
  proposta?: string;
  contexto?: string;
  opcoes?: Array<{ texto?: string; opcao?: string; votos?: number; quantidadeVotos?: number }>;
  abstencoes?: number;
  resultado?: string;
  observacao?: string;
  decisaoFinal?: string;
  observacaoPublica?: string;
};

export type TarefaPublica = {
  id?: number;
  titulo?: string;
  descricao?: string;
  responsavel?: string;
  responsaveis?: string | string[];
  prazo?: string;
  situacao?: string;
};

export type ReuniaoPublica = {
  id?: number;
  slug?: string;
  titulo?: string;
  tipo?: string;
  data?: string;
  horario?: string;
  horarioInicial?: string;
  horarioFinal?: string;
  local?: string;
  descricaoCurta?: string;
  situacao?: string;
  quantidadeParticipantes?: number;
  turno?: string;
  nivelEnsino?: string;
  niveisEnsino?: string;
  responsaveis?: string | string[];
  pauta?: string | string[];
  assuntosDiscutidos?: string | string[];
  discussoes?: string | string[];
  resumo?: string;
  decisoes?: string | string[];
  decisoesTomadas?: string | string[];
  propostas?: string | string[];
  encaminhamentos?: string | string[];
  tarefas?: TarefaPublica[];
  prazos?: string | string[];
  votacoes?: VotacaoPublica[];
  observacoes?: string;
  observacoesPublicas?: string;
  presencas?: PresencaPublica[];
  documentos?: DocumentoPublico[];
  ata?: string;
  ataCompleta?: string;
  transcricao?: string;
  atualizadoEm?: string;
};

export type RepresentantePublico = {
  id?: number;
  nome?: string;
  nomeExibicao?: string;
  nivelEnsino?: string;
  anoSerie?: string;
  serie?: string;
  turma?: string;
  turno?: string;
  funcao?: string;
  mandatoInicio?: string;
  mandatoFim?: string;
  inicioMandato?: string;
  fimMandato?: string;
  observacaoPublica?: string;
};

export type CentralEventosPublica = {
  proximos?: EventoPublico[];
  proximosEventos?: EventoPublico[];
  acontecendoAgora?: EventoPublico[];
  interclassesEmAndamento?: InterclassePublico[];
  proximosJogos?: JogoPublico[];
  reunioesRecentes?: ReuniaoPublica[];
};

export type RespostaLista<T> = {
  itens?: T[];
  total?: number;
  pagina?: number;
  totalPaginas?: number;
  paginacao?: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
};

export function temTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

export function textoParticipante(valor: unknown): string {
  if (temTexto(valor)) return valor.trim();
  if (valor && typeof valor === "object") {
    const participante = valor as ParticipantePublico;
    if (temTexto(participante.nomeExibicao)) return participante.nomeExibicao.trim();
    if (temTexto(participante.nome)) return participante.nome.trim();
    if (temTexto(participante.apelido)) return participante.apelido.trim();
  }
  return "";
}

export function textos(valor: unknown): string[] {
  if (temTexto(valor)) {
    return valor.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  if (Array.isArray(valor)) return valor.filter(temTexto).map((item) => item.trim());
  return [];
}

export function formatarData(valor?: string): string {
  if (!temTexto(valor)) return "";
  const dataSimples = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dataSimples) return `${dataSimples[3]}/${dataSimples[2]}/${dataSimples[1]}`;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(data);
}

export function formatarDataHora(valor?: string): string {
  if (!temTexto(valor)) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return formatarData(valor);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export function normalizarBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, "")
    .trim();
}

export function rotuloSituacao(valor?: string): string {
  if (!temTexto(valor)) return "Informação ainda não publicada";
  const chave = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s-]+/g, "_");
  const rotulos: Record<string, string> = {
    proximo: "Próximo",
    futura: "Próximo",
    futuro: "Próximo",
    acontecendo: "Acontecendo agora",
    acontecendo_agora: "Acontecendo agora",
    em_andamento: "Em andamento",
    encerrada: "Encerrado",
    encerrado: "Encerrado",
    concluida: "Encerrado",
    concluido: "Encerrado",
    adiada: "Adiado",
    adiado: "Adiado",
    cancelada: "Cancelado",
    cancelado: "Cancelado",
    agendada: "Agendada",
    agendado: "Agendada",
    wo: "W.O.",
    data_a_definir: "Data a definir",
    arquivada: "Arquivado",
    arquivado: "Arquivado",
  };
  return rotulos[chave] ?? valor.trim();
}

export function rotuloTurno(valor?: string): string {
  if (!temTexto(valor)) return "";
  return ({ manha: "Manhã", tarde: "Tarde", noite: "Noite" } as Record<string, string>)[valor] || valor;
}

export function classeSituacao(valor?: string): string {
  if (!temTexto(valor)) return "nao-publicado";
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function urlPublica(valor?: string): string {
  if (!temTexto(valor)) return "";
  if (valor.startsWith("/")) return valor;
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:" ? valor : "";
  } catch {
    return "";
  }
}

export function extrairItens<T>(resposta: RespostaLista<T> | T[]): T[] {
  if (Array.isArray(resposta)) return resposta;
  return Array.isArray(resposta.itens) ? resposta.itens : [];
}
