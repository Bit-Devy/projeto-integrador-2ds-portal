// lista os tipos de conteúdo do portal
export type TipoConteudo =
  | "membros"
  | "eventos"
  | "noticias"
  | "projetos"
  | "documentos"
  | "movimentos";

// define os campos comuns dos registros
export type RegistroBase = {
  id?: number;
  publicado?: boolean;
  criadoEm?: string;
};

// define os dados de um membro
export type MembroGecep = RegistroBase & {
  nome: string;
  cargo: string;
  diretoria: string;
  turma: string;
  biografia: string;
  fotoUrl: string;
  contato: string;
};

// define os dados de um evento
export type EventoGecep = RegistroBase & {
  data: string;
  titulo: string;
  horario: string;
  local: string;
  categoria: string;
  descricao: string;
  linkInscricao: string;
  exemplo?: boolean;
};

// define os dados de uma notícia
export type NoticiaGecep = RegistroBase & {
  data: string;
  categoria: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  link: string;
  cor: string;
  destaque: boolean;
};

// define os dados de um projeto
export type ProjetoGecep = RegistroBase & {
  titulo: string;
  categoria: string;
  texto: string;
  estado: string;
  link: string;
};

// define os dados de um documento
export type DocumentoGecep = RegistroBase & {
  tipo: string;
  categoria: string;
  titulo: string;
  texto: string;
  link: string;
  dataDocumento: string;
  real: boolean;
};

// define os dados de uma movimentação
export type MovimentoGecep = RegistroBase & {
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  categoria: string;
  valor: number;
  comprovanteUrl: string;
  exemplo?: boolean;
};

// relaciona cada tipo com seus dados
export type DadosPorTipo = {
  membros: MembroGecep;
  eventos: EventoGecep;
  noticias: NoticiaGecep;
  projetos: ProjetoGecep;
  documentos: DocumentoGecep;
  movimentos: MovimentoGecep;
};

// define um conteúdo salvo no banco
export type RegistroConteudo<T extends TipoConteudo = TipoConteudo> = {
  id: number;
  tipo: T;
  titulo: string;
  dados: DadosPorTipo[T];
  publicado: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

// define uma mensagem de participação
export type MensagemParticipacao = {
  id: number;
  nome: string;
  turma: string;
  assunto: string;
  titulo: string;
  mensagem: string;
  protocolo: string;
  tipoContato: string;
  contato: string;
  anonimo: boolean;
  status: "nova" | "em_analise" | "respondida" | "arquivada";
  criadoEm: string;
};
