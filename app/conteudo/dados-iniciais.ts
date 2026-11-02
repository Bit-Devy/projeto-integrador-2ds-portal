// importa os tipos dos dados iniciais
import type {
  DocumentoGecep,
  EventoGecep,
  MembroGecep,
  MovimentoGecep,
  NoticiaGecep,
  ProjetoGecep,
  CanalContato,
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

// reúne os canais que podem ser alterados pelo painel
export const canaisIniciais: CanalContato[] = [
  { titulo: "Atendimento presencial", descricao: "Procure a sala do GECEP no colégio. Consulte o endereço antes de ir.", link: "https://goo.gl/maps/76bgtgbndHniW9JA9", icone: "⌂", publicado: true },
  { titulo: "Instagram", descricao: "Acompanhe notícias, avisos e atualizações do grêmio no @gecep_oficial.", link: "https://www.instagram.com/gecep_oficial/", icone: "◎", publicado: true },
  { titulo: "Canal do WhatsApp", descricao: "Receba comunicados e acompanhe as novidades do GECEP pelo canal oficial.", link: "https://whatsapp.com/channel/0029VbCpdU05Ui2QYzsxuR25", icone: "◉", publicado: true },
];

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
    data: "2026-10-28", categoria: "Cultura e formação", titulo: "Encontro no CEP aproxima teatro e audiovisual",
    resumo: "Patrícia Ressurreição conversou com estudantes dos cursos técnicos sobre criação e direção.",
    conteudo: "Os cursos técnicos em Teatro e em Produção de Áudio e Vídeo receberam Patrícia Ressurreição no Salão Nobre, em 5 de outubro. Ex-estudante do CEP, a convidada apresentou experiências de sua trajetória profissional.\nA conversa relacionou cinema, audiovisual e artes cênicas, incluindo o processo de criação do curta-metragem Entre Nós. O encontro ofereceu às turmas uma oportunidade de conhecer caminhos de atuação nessas áreas.\nResumo elaborado para o portal do GECEP a partir da publicação do Colégio Estadual do Paraná, de 28 de outubro de 2026. Consulte a fonte para acessar a cobertura e a galeria completas.",
    link: "https://www.cep.pr.gov.br/Noticia/Palestra-com-Patricia-Ressurreicao-promove-integracao-entre-audiovisual-e-teatro",
    imagemUrl: "/noticias/patricia-ressurreicao.jpg", imagemAlt: "Patrícia Ressurreição conversa com estudantes durante palestra no CEP", creditoImagem: "Imagem publicada pelo Colégio Estadual do Paraná, na galeria da notícia original", cor: "azul", destaque: true, publicado: true,
  },
  {
    data: "2026-07-07", categoria: "Tecnologia", titulo: "Turmas de Desenvolvimento de Sistemas conhecem a GAMEscola",
    resumo: "Visita técnica aproximou os conteúdos de programação do trabalho com jogos digitais.",
    conteudo: "Estudantes do curso Técnico em Desenvolvimento de Sistemas visitaram a GAMEscola em 11 de junho de 2026. A atividade foi organizada pelo professor Fernando Emrich Pinto Maja.\nA visita apresentou ferramentas e processos ligados à criação de jogos. As turmas puderam relacionar o aprendizado de programação a situações profissionais e conhecer possibilidades de trabalho no setor de tecnologia.\nResumo elaborado para o portal do GECEP a partir da notícia publicada pelo Colégio Estadual do Paraná em 7 de julho de 2026. A fonte reúne mais informações e outras imagens da atividade.",
    link: "https://www.cep.pr.gov.br/Noticia/Estudantes-do-curso-Tecnico-em-Desenvolvimento-de-Sistemas-realizam-visita-tecnica",
    imagemUrl: "/noticias/visita-gamescola.jpg", imagemAlt: "Estudantes do curso de Desenvolvimento de Sistemas em visita à GAMEscola", creditoImagem: "Imagem publicada pelo Colégio Estadual do Paraná, na galeria da visita técnica", cor: "verde", destaque: true, publicado: true,
  },
  {
    data: "2026-06-09", categoria: "Esporte e integração", titulo: "Copa CEP reúne esporte e cultura na comunidade escolar",
    resumo: "A abertura da edição de 2026 reuniu turmas em apresentações sobre os países representados na competição.",
    conteudo: "A Copa CEP de 2026 começou com uma cerimônia que reuniu referências esportivas e culturais. Turmas do Ensino Fundamental e do Ensino Médio representaram seleções de diferentes países.\nBandeiras, cartazes e caracterizações fizeram parte das apresentações de abertura. A proposta do colégio associou o esporte à pesquisa cultural e à convivência entre estudantes, professores e funcionários.\nResumo elaborado para o portal do GECEP a partir da cobertura publicada pelo Colégio Estadual do Paraná em 9 de junho de 2026. A notícia original contém os detalhes da programação e a galeria de fotos.",
    link: "https://www.cep.pr.gov.br/Noticia/Colegio-Estadual-do-Parana-da-inicio-Copa-CEP-2026-com-evento-cultural-e-espirito-de",
    imagemUrl: "/noticias/copa-cep-2026.jpg", imagemAlt: "Comunidade escolar participa da abertura da Copa CEP de 2026", creditoImagem: "Imagem publicada pelo Colégio Estadual do Paraná, na galeria da Copa CEP 2026", cor: "amarelo", destaque: true, publicado: true,
  },
  {
    data: "2026-03-23",
    categoria: "Representação",
    titulo: "GECEP promove debate para eleição de delegados da UBES",
    resumo: "Estudantes participaram da escolha de representantes para o 46º Congresso Nacional da União Brasileira dos Estudantes Secundaristas.",
    conteudo: "",
    link: "https://www.cep.pr.gov.br/Noticia/Eleicao-dos-delegados-para-o-46o-Congresso-Nacional-da-Uniao-Brasileira-dos-Estudantes",
    cor: "azul",
    destaque: false,
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
    destaque: false,
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
    destaque: false,
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
  { data: "2026-07-16", tipo: "saida", descricao: "Apoio a uma atividade estudantil", categoria: "Projetos", valor: 300, comprovanteUrl: "", publicado: true },
  { data: "2026-07-15", tipo: "entrada", descricao: "Doação destinada a projeto", categoria: "Doações", valor: 1000, comprovanteUrl: "", publicado: true },
  { data: "2026-07-10", tipo: "saida", descricao: "Materiais para evento", categoria: "Eventos", valor: 519.45, comprovanteUrl: "", publicado: true },
  { data: "2026-07-08", tipo: "saida", descricao: "Materiais gráficos", categoria: "Comunicação", valor: 145.9, comprovanteUrl: "", publicado: true },
  { data: "2026-07-03", tipo: "entrada", descricao: "Arrecadação de campanha estudantil", categoria: "Campanhas", valor: 850, comprovanteUrl: "", publicado: true },
];

// tudo que será colocado no banco na primeira execução
export const dadosIniciais = {
  membros: membrosIniciais,
  eventos: eventosIniciais,
  noticias: noticiasIniciais,
  projetos: projetosIniciais,
  documentos: documentosIniciais,
  movimentos: movimentosIniciais,
  canais: canaisIniciais,
};
