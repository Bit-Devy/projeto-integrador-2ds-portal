// importa os tipos de conteúdo do portal
import type { TipoConteudo } from "./tipos";

// define um campo exibido no formulário do painel
export type CampoPainel = {
  chave: string;
  rotulo: string;
  tipo: "text" | "textarea" | "date" | "time" | "number" | "url" | "select" | "checkbox" | "arquivo" | "pagina";
  dependeDe?: string;
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
  // publica datas com links que já existem no portal
  agenda: {
    nome: "Calendário", singular: "compromisso", descricao: "Datas, avisos e links para notícias, jogos, projetos e outras páginas.",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { chave: "data", rotulo: "Primeiro dia", tipo: "date", obrigatorio: true },
      { chave: "dataFim", rotulo: "Último dia", tipo: "date", dica: "Deixe vazio para um compromisso de um dia." },
      { chave: "horario", rotulo: "Horário", tipo: "time" },
      { chave: "modalidade", rotulo: "Mostrar no calendário", tipo: "select", opcoes: [{ valor: "ambos", nome: "Anual e semestral" }, { valor: "anual", nome: "Anual · ensino regular" }, { valor: "semestral", nome: "Semestral e subsequente" }] },
      { chave: "descricao", rotulo: "Descrição curta", tipo: "textarea", obrigatorio: true },
      { chave: "paginaUrl", rotulo: "Página relacionada", tipo: "pagina", dica: "Opcional. Notícias, projetos, eventos e jogos já publicados. O servidor confere o destino ao salvar." },
    ],
  },
  // mantém os cardápios dos setores no mesmo cadastro
  cardapios: {
    nome: "Cantina", singular: "item de cardápio", descricao: "Merenda por data e turno e cardápios da APMF, GECEP e robótica.",
    campos: [
      { chave: "titulo", rotulo: "Prato ou produto", tipo: "text", obrigatorio: true },
      { chave: "categoria", rotulo: "Setor", tipo: "select", opcoes: [{ valor: "merenda", nome: "Merenda do colégio" }, { valor: "apmf", nome: "APMF" }, { valor: "gecep", nome: "GECEP" }, { valor: "robotica", nome: "Robótica" }] },
      { chave: "data", rotulo: "Disponível a partir de", tipo: "date", obrigatorio: true },
      { chave: "dataFim", rotulo: "Disponível até", tipo: "date", dica: "Deixe vazio para servir apenas no primeiro dia." },
      { chave: "turno", rotulo: "Turno", tipo: "select", opcoes: [{ valor: "todos", nome: "Todos os turnos" }, { valor: "manha", nome: "Manhã" }, { valor: "tarde", nome: "Tarde" }, { valor: "noite", nome: "Noite" }] },
      { chave: "descricao", rotulo: "Composição, porção e observações", tipo: "textarea", obrigatorio: true, dica: "Inclua ingredientes e informações de restrições alimentares quando disponíveis." },
      { chave: "preco", rotulo: "Preço em reais", tipo: "text", dica: "Opcional nos cardápios de compra. A merenda não exibe preço." },
      { chave: "imagemUrl", rotulo: "Foto", tipo: "arquivo" },
    ],
  },
  // reúne os dados úteis para consultar uma vaga antes de se candidatar
  oportunidades: {
    nome: "Central de Estágios", singular: "oportunidade", descricao: "Vagas de estágio, emprego, jovem aprendiz e concursos, com fonte e prazo.",
    campos: [
      { chave: "titulo", rotulo: "Título da oportunidade", tipo: "text", obrigatorio: true },
      { chave: "categoria", rotulo: "Tipo", tipo: "select", opcoes: [{ valor: "estagio", nome: "Estágio" }, { valor: "emprego", nome: "Emprego" }, { valor: "aprendiz", nome: "Jovem aprendiz" }, { valor: "concurso", nome: "Concurso" }] },
      { chave: "organizacao", rotulo: "Empresa ou instituição", tipo: "text", obrigatorio: true },
      { chave: "local", rotulo: "Cidade ou local", tipo: "text", obrigatorio: true },
      { chave: "modalidade", rotulo: "Modalidade de trabalho", tipo: "select", opcoes: [{ valor: "Presencial", nome: "Presencial" }, { valor: "Híbrido", nome: "Híbrido" }, { valor: "Remoto", nome: "Remoto" }] },
      { chave: "escolaridade", rotulo: "Escolaridade ou curso", tipo: "text", obrigatorio: true },
      { chave: "requisitos", rotulo: "Requisitos", tipo: "textarea", obrigatorio: true },
      { chave: "descricao", rotulo: "Atividades e informações", tipo: "textarea", obrigatorio: true },
      { chave: "jornada", rotulo: "Jornada e horário", tipo: "text" },
      { chave: "remuneracao", rotulo: "Bolsa ou remuneração", tipo: "text", dica: "Ex.: R$ 900,00 por mês ou A informar." },
      { chave: "beneficios", rotulo: "Benefícios", tipo: "text" },
      { chave: "quantidade", rotulo: "Quantidade de vagas", tipo: "text" },
      { chave: "data", rotulo: "Data de divulgação", tipo: "date", obrigatorio: true },
      { chave: "prazo", rotulo: "Último dia para inscrição", tipo: "date", dica: "Após o prazo, aparece como encerrada automaticamente. Deixe vazio se não houver prazo informado." },
      { chave: "situacao", rotulo: "Situação", tipo: "select", opcoes: [{ valor: "aberta", nome: "Inscrições abertas" }, { valor: "encerrada", nome: "Encerrada" }, { valor: "suspensa", nome: "Suspensa" }] },
      { chave: "link", rotulo: "Link da candidatura ou edital", tipo: "url", obrigatorio: true },
      { chave: "fonte", rotulo: "Fonte da informação", tipo: "text", obrigatorio: true },
      { chave: "arquivoUrl", rotulo: "Edital ou documento", tipo: "arquivo" },
    ],
  },
  // configura o formulário de integrantes
  membros: {
    nome: "Equipe",
    singular: "integrante",
    descricao: "Pessoas da gestão, cargos, turmas e fotos.",
    campos: [
      { chave: "ano", rotulo: "Ano da publicação", tipo: "number", obrigatorio: true, dica: "O portal começa no ano atual e preserva as gestões anteriores no arquivo." },
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
      { chave: "destaqueAte", rotulo: "Mostrar em destaque até", tipo: "date", dependeDe: "destaque", obrigatorio: true, dica: "O destaque termina ao final deste dia, no horário do Paraná." },
      // oferece os dois botões opcionais no final da notícia
      { chave: "botaoInternoAtivo", rotulo: "Adicionar botão para uma página do portal", tipo: "checkbox" },
      { chave: "botaoInternoTexto", rotulo: "Texto do botão do portal", tipo: "text", dependeDe: "botaoInternoAtivo", dica: "Ex.: Conhecer o Estatuto ou Ver o interclasse." },
      { chave: "botaoInternoUrl", rotulo: "Página de destino", tipo: "pagina", dependeDe: "botaoInternoAtivo" },
      { chave: "botaoExternoAtivo", rotulo: "Adicionar botão para outro site", tipo: "checkbox" },
      { chave: "botaoExternoTexto", rotulo: "Texto do botão externo", tipo: "text", dependeDe: "botaoExternoAtivo" },
      { chave: "botaoExternoUrl", rotulo: "Endereço do outro site", tipo: "url", dependeDe: "botaoExternoAtivo", dica: "O visitante confirma um aviso antes de sair do portal." },
    ],
  },
  // configura o formulário de projetos
  projetos: {
    nome: "Projetos",
    singular: "projeto",
    descricao: "Projetos, campanhas, propostas e resultados da gestão.",
    campos: [
      { chave: "ano", rotulo: "Ano da publicação", tipo: "number", obrigatorio: true, dica: "O portal começa no ano atual e preserva as gestões anteriores no arquivo." },
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
    descricao: "Biblioteca privada, versões do Estatuto e Regimento e documentos publicados.",
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
        { valor: "✉", nome: "E-mail" },
        { valor: "☎", nome: "Telefone" },
        { valor: "⊕", nome: "Site ou portal" },
        { valor: "▷", nome: "Vídeos e transmissões" },
        { valor: "➤", nome: "Telegram ou mensagens" },
        { valor: "♪", nome: "TikTok ou áudio" },
        { valor: "f", nome: "Facebook" },
        { valor: "in", nome: "LinkedIn" },
        { valor: "#", nome: "Comunidade ou grupo" },
        { valor: "☷", nome: "Formulário ou atendimento" },
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
export const tiposConteudoPainel: TipoConteudo[] = ["noticias", "agenda", "cardapios", "oportunidades", "eventos", "projetos", "membros", "movimentos", "documentos", "canais"];
