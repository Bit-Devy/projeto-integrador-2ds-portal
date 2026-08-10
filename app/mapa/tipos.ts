// lista os turnos aceitos no mapa
export const turnosMapa = ["manha", "tarde", "noite"] as const;
// lista as alas aceitas no mapa
export const alasMapa = ["Par", "Ímpar", "Fora do prédio"] as const;

// define os tipos básicos usados no mapa
export type TurnoMapa = (typeof turnosMapa)[number];
export type AlaMapa = (typeof alasMapa)[number];
export type GrupoCategoriaMapa = "atividade" | "local";
export type EntidadeMapa = "categorias" | "locais" | "turmas" | "ensalamentos";

// define os dados de uma categoria
export type CategoriaMapa = {
  id: number;
  grupo: GrupoCategoriaMapa;
  slug: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
};

// define os dados de um local
export type LocalMapa = {
  id: number;
  nome: string;
  numero: string;
  nomeAlternativo: string;
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
  criadoEm: string;
  atualizadoEm: string;
};

// define os dados de uma turma ou atividade
export type TurmaAtividadeMapa = {
  id: number;
  nome: string;
  nomeNormalizado: string;
  aliases: string;
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
  criadoEm: string;
  atualizadoEm: string;
};

// define os dados de um ensalamento
export type EnsalamentoMapa = {
  id: number;
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
  criadoEm: string;
  atualizadoEm: string;
};

// reúne todos os dados privados do mapa
export type DadosMapa = {
  categorias: CategoriaMapa[];
  locais: LocalMapa[];
  turmas: TurmaAtividadeMapa[];
  ensalamentos: EnsalamentoMapa[];
};

// define as versões públicas sem campos internos
export type CategoriaMapaPublica = Omit<CategoriaMapa, "ativo" | "criadoEm" | "atualizadoEm">;
export type LocalMapaPublico = Omit<LocalMapa, "ativo" | "publicado" | "criadoEm">;
export type TurmaAtividadeMapaPublica = Omit<TurmaAtividadeMapa, "ativo" | "publicado" | "criadoEm">;
export type EnsalamentoMapaPublico = Omit<EnsalamentoMapa, "ativo" | "publicado" | "criadoEm">;

// reúne todos os dados públicos do mapa
export type DadosMapaPublico = {
  categorias: CategoriaMapaPublica[];
  locais: LocalMapaPublico[];
  turmas: TurmaAtividadeMapaPublica[];
  ensalamentos: EnsalamentoMapaPublico[];
};

// define o formato do arquivo exportado
export type ExportacaoMapa = DadosMapa & {
  versao: 1;
  exportadoEm: string;
};

// mostra os nomes dos turnos para o usuário
export const nomesTurnos: Record<TurnoMapa, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};
