// valores fechados compartilhados entre validação, banco e interface
export const situacoesEvento = ["proximo", "em_andamento", "encerrado", "adiado", "cancelado"] as const;
export const situacoesPartida = ["agendada", "em_andamento", "encerrada", "adiada", "cancelada", "wo", "data_a_definir"] as const;
export const situacoesReuniao = ["agendada", "em_andamento", "encerrada", "adiada", "cancelada"] as const;
export const situacoesPresenca = ["presente", "ausente", "justificada", "nao_se_aplica", "nao_informada"] as const;
export const turnosEventos = ["manha", "tarde", "noite"] as const;
export const funcoesRepresentante = ["titular", "vice", "suplente", "outra"] as const;
export const tiposReuniao = ["representantes", "interna_gecep"] as const;
export const formatosCampeonato = ["mata_mata", "personalizada", "grupos", "pontos_corridos", "grupos_mata_mata"] as const;
export const tiposFase = ["eliminatoria", "grupos", "classificacao", "terceiro_lugar", "personalizada"] as const;

export type SituacaoEvento = (typeof situacoesEvento)[number];
export type SituacaoPartida = (typeof situacoesPartida)[number];
export type SituacaoReuniao = (typeof situacoesReuniao)[number];
export type SituacaoPresenca = (typeof situacoesPresenca)[number];
export type TurnoEvento = (typeof turnosEventos)[number];
export type FuncaoRepresentante = (typeof funcoesRepresentante)[number];
export type TipoReuniao = (typeof tiposReuniao)[number];
export type FormatoCampeonato = (typeof formatosCampeonato)[number];
export type TipoFase = (typeof tiposFase)[number];

export type Paginacao = {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
};

export type ListaPaginada<T> = { itens: T[]; paginacao: Paginacao };

export type DocumentoPublico = {
  id: number;
  titulo: string;
  tipo: string;
  descricao: string;
  arquivoUrl: string;
  linkExterno: string;
  data?: string;
  ordem: number;
  atualizadoEm: string;
};

export type DocumentoAdministrativo = DocumentoPublico & {
  arquivoChave: string;
  publicado: boolean;
  ativo: boolean;
  criadoEm: string;
};

export type EventoInternoPublico = {
  id: number;
  slug: string;
  titulo: string;
  subtitulo: string;
  descricaoCurta: string;
  descricao: string;
  categoria: string;
  imagemCapaUrl: string;
  dataInicial: string;
  dataFinal: string;
  horarioInicial: string;
  horarioFinal: string;
  horario: string;
  local: string;
  turno: string;
  publicoDestinado: string;
  organizacao: string;
  programacao: string;
  orientacoes: string;
  linkExterno: string;
  observacoesPublicas: string;
  situacao: SituacaoEvento;
  arquivado: boolean;
  documentos: DocumentoPublico[];
  imagens: DocumentoPublico[];
  atualizadoEm: string;
};

export type EventoInternoAdministrativo = EventoInternoPublico & {
  observacoesInternas: string;
  publicado: boolean;
  ativo: boolean;
  arquivadoEm: string | null;
  criadoEm: string;
};

export type ParticipanteCampeonato = {
  id: number;
  nome: string;
  nomeExibicao: string;
  apelido: string;
  posicaoInicial: number;
  // campos presentes somente na resposta administrativa
  campeonatoId?: number;
  turmaAtividadeId?: number | null;
  ativo?: boolean;
  atualizadoEm?: string;
};

export type HistoricoDataPartida = {
  data: string;
  horario: string;
  local: string;
  observacao: string;
  alteradoEm: string;
};

export type PartidaPublica = {
  id: number;
  campeonatoId: number;
  campeonatoSlug?: string;
  campeonatoNome?: string;
  faseId: number;
  faseNome?: string;
  rodada: string;
  ordem: number;
  participanteAId: number | null;
  participanteBId: number | null;
  participanteANome: string;
  participanteBNome: string;
  placarA: number | null;
  placarB: number | null;
  vencedorId: number | null;
  vencedorNome: string;
  formaVitoria: string;
  data: string;
  horario: string;
  local: string;
  situacao: SituacaoPartida;
  placarPublicado: boolean;
  resumo: string;
  destaques: string;
  observacoesPublicas: string;
  proximaPartidaId: number | null;
  proximaPosicao: "" | "a" | "b";
  // enriquecimentos presentes no endpoint de detalhe da partida
  historicoDatas?: HistoricoDataPartida[];
  atualizacoes?: AtualizacaoCampeonato[];
  proximaPartida?: PartidaPublica | null;
  atualizadoEm: string;
};

export type PartidaAdministrativa = PartidaPublica & {
  observacoesInternas: string;
  publicado: boolean;
  ativo: boolean;
  arquivadoEm: string | null;
  criadoEm: string;
};

export type FaseCampeonato = {
  id: number;
  nome: string;
  ordem: number;
  tipo: TipoFase;
  quantidadeJogos: number;
  // campos presentes somente na resposta administrativa
  campeonatoId?: number;
  publicado?: boolean;
  ativo?: boolean;
  partidas?: Array<PartidaPublica | PartidaAdministrativa>;
  atualizadoEm?: string;
};

export type CampeaoCampeonato = {
  participanteId: number | null;
  nome: string;
  definidoEm: string;
};

export type AtualizacaoCampeonato = {
  id: number;
  titulo: string;
  texto: string;
  data: string;
  ordem: number;
  atualizadoEm: string;
};

export type AtualizacaoCampeonatoAdministrativa = AtualizacaoCampeonato & {
  campeonatoId: number;
  publicado: boolean;
  ativo: boolean;
  criadoEm: string;
};

export type CampeonatoPublico = {
  id: number;
  slug: string;
  nome: string;
  edicao: string;
  ano: number | null;
  modalidade: string;
  categoria: string;
  turno: string;
  descricao: string;
  regulamento: string;
  organizacao: string;
  locais: string;
  observacoesPublicas: string;
  formato: FormatoCampeonato;
  situacao: SituacaoEvento;
  faseAtual: string;
  dataInicial: string;
  dataFinal: string;
  imagemCapaUrl: string;
  chavePublicada: boolean;
  quantidadeEquipes: number;
  campeao: CampeaoCampeonato | null;
  proximaPartida: PartidaPublica | null;
  ultimoResultado: PartidaPublica | null;
  atualizadoEm: string;
};

export type CampeonatoAdministrativo = CampeonatoPublico & {
  observacoesInternas: string;
  publicado: boolean;
  ativo: boolean;
  arquivadoEm: string | null;
  criadoEm: string;
};

export type DetalheCampeonato<T = CampeonatoPublico> = {
  item: T;
  participantes: ParticipanteCampeonato[];
  fases: FaseCampeonato[];
  partidas: Array<PartidaPublica | PartidaAdministrativa>;
  documentos: Array<DocumentoPublico | DocumentoAdministrativo>;
  atualizacoes: Array<AtualizacaoCampeonato | AtualizacaoCampeonatoAdministrativa>;
};

export type ItemReuniaoPublico = {
  id: number;
  tipo: string;
  titulo: string;
  conteudo: string;
  responsaveis: string;
  prazo: string;
  ordem: number;
  atualizadoEm: string;
};

export type ItemReuniaoAdministrativo = ItemReuniaoPublico & {
  reuniaoId: number;
  publicado: boolean;
  ativo: boolean;
  criadoEm: string;
};

export type OpcaoVotacaoPublica = {
  id: number;
  texto: string;
  quantidadeVotos: number;
  ordem: number;
};

export type VotacaoPublica = {
  id: number;
  titulo: string;
  pergunta: string;
  contexto: string;
  abstencoes: number;
  resultado: string;
  decisaoFinal: string;
  observacaoPublica: string;
  ordem: number;
  opcoes: OpcaoVotacaoPublica[];
  atualizadoEm: string;
};

export type PresencaPublica = {
  id: number;
  nome: string;
  nivelEnsino: string;
  serie: string;
  turma: string;
  turno: string;
  funcao: string;
  situacao: SituacaoPresenca;
  observacaoPublica: string;
  atualizadoEm: string;
};

export type PresencaAdministrativa = PresencaPublica & {
  reuniaoId: number;
  representanteId: number | null;
  observacaoInterna: string;
  publicado: boolean;
  ativo: boolean;
  criadoEm: string;
};

export type ReuniaoPublica = {
  id: number;
  slug: string;
  titulo: string;
  tipo: TipoReuniao;
  data: string;
  horarioInicial: string;
  horarioFinal: string;
  horario: string;
  local: string;
  turno: string;
  niveisEnsino: string[];
  descricaoCurta: string;
  responsaveis: string;
  pauta: string;
  discussoes: string;
  resumo: string;
  decisoes: string;
  propostas: string;
  encaminhamentos: string;
  ata: string;
  transcricao: string;
  observacoesPublicas: string;
  quantidadeParticipantes: number | null;
  situacao: SituacaoReuniao;
  arquivado: boolean;
  atualizadoEm: string;
};

export type ReuniaoAdministrativa = ReuniaoPublica & {
  pautaInterna: string;
  observacoesInternas: string;
  quantidadeParticipantesPublicada: boolean;
  publicado: boolean;
  ativo: boolean;
  arquivadoEm: string | null;
  criadoEm: string;
};

export type DetalheReuniao<T = ReuniaoPublica> = {
  item: T;
  itens: Array<ItemReuniaoPublico | ItemReuniaoAdministrativo>;
  votacoes: VotacaoPublica[];
  documentos: Array<DocumentoPublico | DocumentoAdministrativo>;
  presencas: Array<PresencaPublica | PresencaAdministrativa>;
};

export type RepresentantePublico = {
  id: number;
  nome: string;
  nomeExibicao: string;
  nivelEnsino: string;
  serie: string;
  turma: string;
  turno: TurnoEvento;
  funcao: FuncaoRepresentante;
  inicioMandato: string;
  fimMandato: string;
  ordem: number;
  observacaoPublica: string;
  atualizadoEm: string;
};

export type RepresentanteAdministrativo = RepresentantePublico & {
  turmaAtividadeId: number | null;
  observacaoInterna: string;
  ativo: boolean;
  publicado: boolean;
  arquivadoEm: string | null;
  criadoEm: string;
};

export type CentralEventos = {
  proximosEventos: EventoInternoPublico[];
  acontecendoAgora: EventoInternoPublico[];
  interclassesEmAndamento: CampeonatoPublico[];
  proximosJogos: PartidaPublica[];
  reunioesRecentes: ReuniaoPublica[];
};

export type ImpactoResultado = {
  exigeConfirmacao: boolean;
  partidasAfetadas: Array<{
    id: number;
    fase: string;
    participanteAtual: string;
    resultadoPosteriorPreenchido: boolean;
  }>;
  mensagem: string;
};
