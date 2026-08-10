// importa os tipos dos dados iniciais
import type {
  DocumentoGecep,
  EventoGecep,
  MembroGecep,
  MovimentoGecep,
  NoticiaGecep,
  ProjetoGecep,
} from "./tipos";

// dados gerais do portal
export const informacoesSite = {
  nome: "GECEP",
  nomeCompleto: "Grêmio Estudantil do Colégio Estadual do Paraná",
  colegio: "Colégio Estadual do Paraná",
  endereco: "Av. João Gualberto, 250 - Alto da Glória - Curitiba - PR",
  instagram: "https://www.instagram.com/gecep_oficial/",
  usuarioInstagram: "@gecep_oficial",
  email: "",
  horarioAtendimento: "A publicar",
  nomeGestao: "Gestão atual - nome a publicar",
  periodoGestao: "Período a publicar",
};

// pessoas de exemplo: troque pelos integrantes reais
export const membrosIniciais: MembroGecep[] = [
  {
    nome: "Nome a inserir",
    cargo: "Presidência",
    diretoria: "Coordenação geral",
    turma: "Turma a inserir",
    biografia: "Adicione uma apresentação curta desta pessoa e de suas responsabilidades.",
    fotoUrl: "",
    contato: "",
    publicado: false,
  },
  {
    nome: "Nome a inserir",
    cargo: "Vice-presidência",
    diretoria: "Coordenação geral",
    turma: "Turma a inserir",
    biografia: "Adicione uma apresentação curta desta pessoa e de suas responsabilidades.",
    fotoUrl: "",
    contato: "",
    publicado: false,
  },
  {
    nome: "Nome a inserir",
    cargo: "Tesouraria",
    diretoria: "Finanças e transparência",
    turma: "Turma a inserir",
    biografia: "Responsável por organizar registros, comprovantes e prestações de contas.",
    fotoUrl: "",
    contato: "",
    publicado: false,
  },
];

// a agenda começa vazia: eventos oficiais são cadastrados pela gestão no banco
export const eventosIniciais: EventoGecep[] = [];

// notícias reais encontradas nos canais oficiais do colégio
export const noticiasIniciais: NoticiaGecep[] = [
  {
    data: "2026-03-23",
    categoria: "Representação",
    titulo: "GECEP promove debate para eleição de delegados da UBES",
    resumo: "Estudantes participaram da escolha de representantes para o 46º Congresso Nacional da União Brasileira dos Estudantes Secundaristas.",
    conteudo: "",
    link: "https://www.cep.pr.gov.br/Noticia/Eleicao-dos-delegados-para-o-46o-Congresso-Nacional-da-Uniao-Brasileira-dos-Estudantes",
    cor: "azul",
    destaque: true,
    publicado: true,
  },
  {
    data: "2025-09-29",
    categoria: "Solidariedade",
    titulo: "BrincaCEP arrecada brinquedos para crianças",
    resumo: "A campanha liderada pelo grêmio reuniu doações destinadas a crianças em situação de vulnerabilidade social.",
    conteudo: "",
    link: "https://www.cep.pr.gov.br/Noticia/Gremio-Estudantil-arrecada-brinquedos-e-o-BrincaCEP",
    cor: "verde",
    destaque: true,
    publicado: true,
  },
  {
    data: "2025-06-17",
    categoria: "Cultura e lazer",
    titulo: "Grêmio Estudantil promove a tradicional Festa Junina",
    resumo: "A programação organizada para os três turnos reuniu quadrilha, brincadeiras, comidas e atividades culturais.",
    conteudo: "",
    link: "https://www.cep.pr.gov.br/Noticia/Gremio-Estudantil-promove-festa-junina-nesta-quarta-dia-18",
    cor: "amarelo",
    destaque: true,
    publicado: true,
  },
  {
    data: "2025-02-20",
    categoria: "Acolhimento",
    titulo: "GECEP realiza o tradicional CEP Tour com novas turmas",
    resumo: "Integrantes do grêmio apresentaram laboratórios, bibliotecas, ginásio, planetário e outros espaços do colégio.",
    conteudo: "",
    link: "https://www.cep.pr.gov.br/Noticia/Gecep-faz-o-CEP-tour-com-novas-turmas-do-noturno",
    cor: "laranja",
    destaque: false,
    publicado: true,
  },
  {
    data: "2024-05-14",
    categoria: "Solidariedade",
    titulo: "GECEP recebe donativos destinados ao Rio Grande do Sul",
    resumo: "O grêmio organizou um ponto de coleta para apoiar pessoas atingidas pelas enchentes no estado.",
    conteudo: "",
    link: "https://www.cep.pr.gov.br/Noticia/Gecep-recebe-donativos-para-o-Rio-Grande-do-Sul",
    cor: "azul",
    destaque: false,
    publicado: true,
  },
];

// projetos reais mostrados na primeira execução
export const projetosIniciais: ProjetoGecep[] = [
  {
    titulo: "BrincaCEP",
    categoria: "Solidariedade",
    texto: "Campanha de arrecadação de brinquedos para crianças em situação de vulnerabilidade social.",
    estado: "Realizado",
    link: "https://www.cep.pr.gov.br/Noticia/Gremio-Estudantil-arrecada-brinquedos-e-o-BrincaCEP",
    publicado: true,
  },
  {
    titulo: "CEP Tour",
    categoria: "Acolhimento",
    texto: "Visita guiada para apresentar a estrutura do colégio e acolher estudantes que estão chegando.",
    estado: "Recorrente",
    link: "https://www.cep.pr.gov.br/Noticia/Gecep-faz-o-CEP-tour-com-novas-turmas-do-noturno",
    publicado: true,
  },
  {
    titulo: "Festa Junina",
    categoria: "Cultura e lazer",
    texto: "Atividade cultural para os três turnos, com música, dança, brincadeiras e integração estudantil.",
    estado: "Recorrente",
    link: "https://www.cep.pr.gov.br/Noticia/Gremio-Estudantil-promove-festa-junina-nesta-quarta-dia-18",
    publicado: true,
  },
  {
    titulo: "CEP Sustentável",
    categoria: "Meio ambiente",
    texto: "Participação estudantil em ações de conscientização e acompanhamento de práticas sustentáveis no CEP.",
    estado: "Acompanhar",
    link: "https://www.cep.pr.gov.br/Pagina/CEP-Sustentavel",
    publicado: true,
  },
];

// documentos reais mostrados na primeira execução
export const documentosIniciais: DocumentoGecep[] = [
  {
    tipo: "PDF",
    categoria: "Projeto",
    titulo: "Documentação do Projeto - Portal do GECEP",
    texto: "Problema, objetivos, tecnologias, requisitos, casos de uso, regras de negócio e arquitetura do sistema.",
    link: "/documentacao/Documentacao-Projeto-GECEP.pdf",
    dataDocumento: "2026-07-18",
    real: true,
    publicado: true,
  },
  {
    tipo: "PDF",
    categoria: "Normas",
    titulo: "Estatuto do GECEP - 2023",
    texto: "Documento que define a organização, os objetivos e o funcionamento do grêmio.",
    link: "https://www.cep.pr.gov.br/sites/cep/arquivos_restritos/files/documento/2025-05/estatuto_do_gecep_de_2023-1.pdf",
    dataDocumento: "2023-01-01",
    real: true,
    publicado: true,
  },
  {
    tipo: "PDF",
    categoria: "Normas",
    titulo: "Regimento Escolar do CEP",
    texto: "Normas gerais da instituição e atribuições da representação estudantil.",
    link: "https://www.cep.pr.gov.br/sites/cep/arquivos_restritos/files/documento/2024-04/cep_regimento_escolar_2022_setembro_revisado.pdf",
    dataDocumento: "2022-09-01",
    real: true,
    publicado: true,
  },
];

// valores fictícios até a gestão publicar os registros reais
export const movimentosIniciais: MovimentoGecep[] = [
  { data: "2026-07-16", tipo: "saida", descricao: "Apoio a uma atividade estudantil", categoria: "Projetos", valor: 300, comprovanteUrl: "", exemplo: true, publicado: true },
  { data: "2026-07-15", tipo: "entrada", descricao: "Doação destinada a projeto", categoria: "Doações", valor: 1000, comprovanteUrl: "", exemplo: true, publicado: true },
  { data: "2026-07-10", tipo: "saida", descricao: "Materiais para evento", categoria: "Eventos", valor: 519.45, comprovanteUrl: "", exemplo: true, publicado: true },
  { data: "2026-07-08", tipo: "saida", descricao: "Materiais gráficos", categoria: "Comunicação", valor: 145.9, comprovanteUrl: "", exemplo: true, publicado: true },
  { data: "2026-07-03", tipo: "entrada", descricao: "Arrecadação de campanha estudantil", categoria: "Campanhas", valor: 850, comprovanteUrl: "", exemplo: true, publicado: true },
];

// tudo que será colocado no banco na primeira execução
export const dadosIniciais = {
  membros: membrosIniciais,
  eventos: eventosIniciais,
  noticias: noticiasIniciais,
  projetos: projetosIniciais,
  documentos: documentosIniciais,
  movimentos: movimentosIniciais,
};
