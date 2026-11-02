// importa os tipos de conteúdo do portal
import type { TipoConteudo } from "./tipos";

// define um campo exibido no formulário do painel
export type CampoPainel = {
  chave: string;
  rotulo: string;
  tipo: "text" | "textarea" | "date" | "time" | "number" | "url" | "select" | "checkbox" | "arquivo";
  obrigatorio?: boolean;
  dica?: string;
  opcoes?: Array<{ valor: string; nome: string }>;
};

// define os textos e campos de cada seção do painel
export const configuracaoPainel: Record<TipoConteudo, {
  nome: string;
  singular: string;
  descricao: string;
  campos: CampoPainel[];
}> = {
  // configura o formulário de integrantes
  membros: {
    nome: "Equipe",
    singular: "integrante",
    descricao: "Pessoas da gestão, cargos, turmas e fotos.",
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true },
      { chave: "cargo", rotulo: "Cargo", tipo: "text", obrigatorio: true },
      { chave: "diretoria", rotulo: "Diretoria ou área", tipo: "text", obrigatorio: true },
      { chave: "turma", rotulo: "Turma", tipo: "text" },
      { chave: "biografia", rotulo: "Apresentação", tipo: "textarea", dica: "Escreva de duas a quatro frases." },
      { chave: "fotoUrl", rotulo: "Foto", tipo: "arquivo", dica: "PNG, JPG ou WebP com até 10 MB." },
      { chave: "contato", rotulo: "Link de contato", tipo: "url" },
    ],
  },
  // configura o formulário de eventos
  eventos: {
    nome: "Eventos",
    singular: "evento",
    descricao: "Agenda, reuniões, assembleias, campanhas e atividades.",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { chave: "data", rotulo: "Data", tipo: "date", obrigatorio: true },
      { chave: "horario", rotulo: "Horário", tipo: "text", obrigatorio: true, dica: "Ex.: 12h30" },
      { chave: "local", rotulo: "Local", tipo: "text", obrigatorio: true },
      { chave: "categoria", rotulo: "Categoria", tipo: "text", obrigatorio: true },
      { chave: "descricao", rotulo: "Descrição", tipo: "textarea", obrigatorio: true },
      { chave: "linkInscricao", rotulo: "Link de inscrição", tipo: "url" },
    ],
  },
  // configura o formulário de notícias
  noticias: {
    nome: "Notícias",
    singular: "notícia",
    descricao: "Avisos, resultados, campanhas e comunicados públicos.",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { chave: "data", rotulo: "Data de publicação", tipo: "date", obrigatorio: true },
      { chave: "categoria", rotulo: "Categoria", tipo: "text", obrigatorio: true },
      { chave: "resumo", rotulo: "Resumo", tipo: "textarea", obrigatorio: true },
      { chave: "conteudo", rotulo: "Texto completo", tipo: "textarea" },
      { chave: "imagemUrl", rotulo: "Imagem da notícia", tipo: "arquivo", dica: "Envie uma foto ou informe o endereço de uma imagem." },
      { chave: "imagemAlt", rotulo: "Descrição da imagem", tipo: "text", dica: "Explique de forma breve o que aparece na foto." },
      { chave: "creditoImagem", rotulo: "Crédito da imagem", tipo: "text", dica: "Informe quem fez ou publicou a foto." },
      { chave: "link", rotulo: "Fonte ou publicação relacionada", tipo: "url", dica: "A notícia abre no portal e este link aparece ao final do texto." },
      // oferece as cores aceitas pelos cartões
      { chave: "cor", rotulo: "Cor do cartão", tipo: "select", opcoes: [
        { valor: "azul", nome: "Azul" }, { valor: "verde", nome: "Verde" },
        { valor: "amarelo", nome: "Amarelo" }, { valor: "laranja", nome: "Laranja" },
      ] },
      { chave: "destaque", rotulo: "Mostrar em destaque", tipo: "checkbox" },
    ],
  },
  // configura o formulário de projetos
  projetos: {
    nome: "Projetos",
    singular: "projeto",
    descricao: "Projetos, campanhas, propostas e resultados da gestão.",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { chave: "categoria", rotulo: "Categoria", tipo: "text", obrigatorio: true },
      { chave: "estado", rotulo: "Situação", tipo: "select", opcoes: [
        { valor: "Planejado", nome: "Planejado" }, { valor: "Em andamento", nome: "Em andamento" },
        { valor: "Recorrente", nome: "Recorrente" }, { valor: "Realizado", nome: "Realizado" },
      ] },
      { chave: "texto", rotulo: "Descrição", tipo: "textarea", obrigatorio: true },
      { chave: "link", rotulo: "Link para mais informações", tipo: "url" },
    ],
  },
  // configura o formulário de documentos
  documentos: {
    nome: "Documentos",
    singular: "documento",
    descricao: "Atas, estatutos, planos, relatórios e comprovantes públicos.",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { chave: "categoria", rotulo: "Categoria", tipo: "text", obrigatorio: true },
      { chave: "tipo", rotulo: "Tipo de arquivo", tipo: "text", obrigatorio: true, dica: "Ex.: PDF, ATA ou REL" },
      { chave: "dataDocumento", rotulo: "Data do documento", tipo: "date" },
      { chave: "texto", rotulo: "Descrição", tipo: "textarea", obrigatorio: true },
      { chave: "link", rotulo: "Arquivo ou link", tipo: "arquivo", obrigatorio: true },
      { chave: "real", rotulo: "Documento oficial", tipo: "checkbox" },
    ],
  },
  // configura os destinos dos canais de atendimento
  canais: {
    nome: "Canais de contato",
    singular: "canal",
    descricao: "Atualize os endereços de atendimento presencial, Instagram e WhatsApp. As mensagens pelo portal ficam em Sugestões.",
    campos: [
      { chave: "titulo", rotulo: "Nome do canal", tipo: "text", obrigatorio: true },
      { chave: "descricao", rotulo: "Descrição", tipo: "textarea", obrigatorio: true },
      { chave: "link", rotulo: "Endereço de destino", tipo: "url", obrigatorio: true },
      { chave: "icone", rotulo: "Ícone", tipo: "select", opcoes: [
        { valor: "⌂", nome: "Atendimento presencial" },
        { valor: "◎", nome: "Instagram" },
        { valor: "◉", nome: "WhatsApp" },
      ] },
    ],
  },
  // configura o formulário de movimentações
  movimentos: {
    nome: "Transparência",
    singular: "movimentação",
    descricao: "Entradas, saídas, categorias, valores e comprovantes.",
    campos: [
      { chave: "descricao", rotulo: "Descrição", tipo: "text", obrigatorio: true },
      { chave: "data", rotulo: "Data", tipo: "date", obrigatorio: true },
      { chave: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, opcoes: [
        { valor: "entrada", nome: "Entrada" }, { valor: "saida", nome: "Saída" },
      ] },
      { chave: "categoria", rotulo: "Categoria", tipo: "text", obrigatorio: true },
      { chave: "valor", rotulo: "Valor em reais", tipo: "number", obrigatorio: true },
      { chave: "comprovanteUrl", rotulo: "Comprovante", tipo: "arquivo" },
    ],
  },
};

// define a ordem das seções no painel
export const tiposConteudoPainel: TipoConteudo[] = ["noticias", "eventos", "projetos", "membros", "movimentos", "documentos", "canais"];
