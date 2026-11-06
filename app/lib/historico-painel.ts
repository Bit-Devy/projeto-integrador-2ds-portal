// descreve as ações salvas sem guardar senhas ou o formulário completo
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";
import { NOME_COOKIE_SESSAO, obterUsuarioPeloToken, type UsuarioPainel } from "./sessao";
import type { AcessoSalvo } from "./senhas-painel";

type Objeto = Record<string, unknown>;
type Alvo = { tabela: string; nome: string; cadastrado?: boolean; arquivar?: boolean };
type ContextoAcao = { usuario: UsuarioPainel; recurso: string; metodo: string; entidade: string; acao: string; tipo: string; id: unknown; cargoAlvo: string; dados: Objeto; anterior: Objeto | null; alvo: Alvo };

// cria uma entrada diferente para cada login correto
export async function registrarEntradaPainel(acesso: Pick<AcessoSalvo, "id" | "nome" | "cargo">) {
  await garantirBanco();
  const linha = await getD1().prepare("INSERT INTO entradas_painel (acesso_id, nome, cargo) VALUES (?, ?, ?) RETURNING id")
    .bind(acesso.id, acesso.nome, acesso.cargo).first<{ id: number }>();
  if (!linha) throw new Error("Não foi possível registrar a entrada no painel.");
  return linha.id;
}

// identifica o registro antes da alteração para manter o nome também nas exclusões
export async function prepararHistoricoAcao(request: Request): Promise<ContextoAcao | null> {
  const caminho = new URL(request.url);
  const recurso = caminho.pathname.split("/")[2];
  if (!["POST", "PUT", "DELETE"].includes(request.method) || !["conteudo", "eventos", "interclasses", "reunioes", "representantes", "mapa", "arquivos", "documentos-oficiais", "acessos", "cargos", "mensagens"].includes(recurso)) return null;
  if (recurso === "mensagens" && request.method === "POST") return null;
  const cookie = (request.headers.get("cookie") || "").split(";").map((parte) => parte.trim()).find((parte) => parte.startsWith(`${NOME_COOKIE_SESSAO}=`));
  if (!cookie) return null;
  let usuario: UsuarioPainel | null;
  try { usuario = await obterUsuarioPeloToken(decodeURIComponent(cookie.slice(NOME_COOKIE_SESSAO.length + 1))); } catch { return null; }
  if (!usuario) return null;
  let corpo: Objeto = {};
  if (request.headers.get("content-type")?.includes("application/json")) {
    try { corpo = objeto(await request.clone().json()); } catch { return null; }
  }
  const entidade = texto(corpo.entidade || caminho.searchParams.get("entidade"));
  const tipo = texto(corpo.tipo);
  const acao = texto(corpo.acao);
  const dados = objeto(corpo.dados);
  const id = corpo.id ?? caminho.searchParams.get("id") ?? (recurso === "arquivos" ? caminho.pathname.split("/")[3] : null);
  const alvo = alvoDaAcao(recurso, entidade, tipo);
  if (!alvo) return null;
  let anterior: Objeto | null = null;
  if (alvo.tabela && id && (request.method !== "POST" || acao)) anterior = await getD1().prepare(`SELECT * FROM ${alvo.tabela} WHERE id = ?`).bind(Number(id) || 0).first<Objeto>();
  // conserva somente os sinais usados na frase e nunca os dados de senha
  return { usuario, recurso, metodo: request.method, entidade, acao, tipo, id, cargoAlvo: texto(corpo.cargo), anterior, alvo,
    dados: { publicado: corpo.publicado ?? dados.publicado, destaque: dados.destaque, ativo: dados.ativo, status: corpo.status } };
}

// salva somente operações concluídas e vincula a frase à entrada assinada da sessão
export async function concluirHistoricoAcao(contexto: ContextoAcao | null, resposta: Response) {
  if (!contexto || !resposta.ok) return;
  let resultado: Objeto = {};
  if (resposta.headers.get("content-type")?.includes("application/json")) resultado = objeto(await resposta.clone().json());
  const item = objeto(resultado.item);
  const registro = Object.keys(objeto(item.item)).length ? objeto(item.item) : item;
  const alvoAtual = { ...contexto.alvo };
  // o tipo verdadeiro da linha mantém exclusões de conteúdos com o nome correto
  if (contexto.recurso === "conteudo" && contexto.anterior) Object.assign(alvoAtual, alvoDaAcao("conteudo", "", texto(contexto.anterior.tipo)));
  const nome = nomeDoRegistro(registro) || nomeDoRegistro(contexto.anterior) || texto(resultado.nome);
  const resumo = resumirAcao({ ...contexto, alvo: alvoAtual }, nome, registro);
  await getD1().prepare("INSERT INTO acoes_painel (entrada_id, resumo, recurso) VALUES (?, ?, ?)").bind(contexto.usuario.entradaId, resumo, contexto.recurso).run();
}

// usa frases previsíveis para facilitar a leitura do histórico
function resumirAcao(contexto: ContextoAcao, nome: string, registro: Objeto) {
  const { recurso, metodo, entidade, acao, dados, anterior, alvo } = contexto;
  const feminino = ["Notícia", "Turma", "Sala ou local", "Categoria do mapa", "Fase do campeonato", "Partida", "Atualização do campeonato", "Reunião", "Votação", "Presença"].includes(alvo.nome);
  const flexionar = (verbo: string) => feminino && verbo.endsWith("o") ? `${verbo.slice(0, -1)}a` : verbo;
  const citado = nome ? ` “${nome}”` : "";
  if (recurso === "arquivos") return metodo === "POST" ? `Arquivo${citado} enviado à biblioteca` : metodo === "DELETE" ? "Arquivo removido da biblioteca" : "Visibilidade de arquivo atualizada";
  if (recurso === "documentos-oficiais") return "Versão de documento oficial atualizada no portal";
  if (recurso === "acessos") return metodo === "POST" ? "Novo acesso criado no registro de senhas" : metodo === "DELETE" ? `Acesso${citado} revogado` : `Senha do acesso${citado} substituída`;
  if (recurso === "cargos") return `Permissões do cargo${citado} atualizadas`;
  if (recurso === "mensagens") return metodo === "DELETE" ? `Mensagem #${Number(contexto.id)} excluída` : `Situação da mensagem #${Number(contexto.id)} atualizada`;
  const especiais: Record<string, string> = {
    duplicar: `${alvo.nome}${citado} ${flexionar("duplicado")} como rascunho`, importar: "Dados do mapa importados",
    adicionar_turmas: "Turmas adicionadas ao campeonato", trocar_turmas: "Turmas da chave do campeonato trocadas",
    gerar_chave: "Chave do campeonato gerada", registrar_resultado: "Resultado de partida registrado",
    atualizar_jogo: "Jogo do campeonato atualizado", definir_campeao: "Campeão do campeonato definido",
    gerar_presencas: "Lista de presença gerada para a reunião", status_presencas: "Situações de presença atualizadas em lote",
  };
  if (especiais[acao]) return especiais[acao];
  if (metodo === "DELETE" || (entidade === "participantes" && dados.ativo === false)) return `${alvo.nome}${citado} ${flexionar(alvo.arquivar ? "arquivado" : "excluído")}`;
  // explica quando uma turma sai do público ou volta do arquivo
  if (recurso === "mapa" && entidade === "turmas" && metodo === "PUT") {
    if (dados.ativo === false) return `Turma${citado} arquivada`;
    if (anterior?.ativo === 0 && dados.ativo === true) return `Turma${citado} restaurada`;
    if (dados.publicado === false && anterior?.publicado === 1) return `Turma${citado} retirada do público`;
  }
  if (recurso === "conteudo" && (contexto.tipo === "noticias" || anterior?.tipo === "noticias")) {
    const antigos = objetoJson(anterior?.dados_json);
    if (dados.publicado === false) return antigos.jaPublicada || anterior?.publicado ? `Notícia${citado} arquivada` : `Rascunho da notícia${citado} salvo`;
    if (dados.destaque === false && antigos.destaque) return `Destaque da notícia${citado} encerrado`;
  }
  const antesPublicado = anterior?.publicado;
  if (metodo === "PUT" && antesPublicado === 0 && dados.publicado === true) return `${alvo.nome}${citado} ${flexionar("publicado")}`;
  if (metodo === "POST") return `${alvo.nome}${citado} ${flexionar(alvo.cadastrado ? "cadastrado" : registro.publicado ? "publicado" : "criado")}`;
  return `${alvo.nome}${citado} ${flexionar("atualizado")}`;
}

// escolhe apenas tabelas conhecidas para buscar os nomes dos registros
function alvoDaAcao(recurso: string, entidade: string, tipo: string): Alvo | null {
  if (recurso === "conteudo") return { tabela: "conteudos", nome: ({ noticias: "Notícia", projetos: "Projeto", documentos: "Documento", membros: "Integrante", movimentos: "Lançamento financeiro", canais: "Canal de contato", eventos: "Evento" } as Record<string, string>)[tipo] || "Conteúdo", cadastrado: ["membros", "movimentos", "canais"].includes(tipo) };
  if (recurso === "mapa") return ({ turmas: { tabela: "turmas_atividades", nome: "Turma", cadastrado: true }, locais: { tabela: "locais_colegio", nome: "Sala ou local", cadastrado: true }, ensalamentos: { tabela: "ensalamentos", nome: "Ensalamento", cadastrado: true }, categorias: { tabela: "categorias_mapa", nome: "Categoria do mapa", cadastrado: true } } as Record<string, Alvo>)[entidade] || { tabela: "", nome: "Mapa" };
  if (recurso === "eventos") return entidade === "documentos" ? { tabela: "documentos_eventos", nome: "Documento de evento", arquivar: true } : { tabela: "eventos_internos", nome: "Evento", arquivar: true };
  if (recurso === "interclasses") return ({ documentos: { tabela: "documentos_campeonato", nome: "Documento do campeonato", arquivar: true }, participantes: { tabela: "participantes_campeonato", nome: "Participante do campeonato", cadastrado: true, arquivar: true }, fases: { tabela: "fases_campeonato", nome: "Fase do campeonato", arquivar: true }, partidas: { tabela: "partidas", nome: "Partida", arquivar: true }, atualizacoes: { tabela: "atualizacoes_campeonato", nome: "Atualização do campeonato", arquivar: true } } as Record<string, Alvo>)[entidade] || { tabela: "campeonatos", nome: "Campeonato", arquivar: true };
  if (recurso === "reunioes") return ({ documentos: { tabela: "documentos_reuniao", nome: "Documento de reunião", arquivar: true }, itens: { tabela: "itens_reuniao", nome: "Item de reunião", arquivar: true }, votacoes: { tabela: "votacoes_reuniao", nome: "Votação", arquivar: true }, presencas: { tabela: "presencas_reuniao", nome: "Presença", cadastrado: true, arquivar: true } } as Record<string, Alvo>)[entidade] || { tabela: "reunioes", nome: "Reunião", arquivar: true };
  return ({ representantes: { tabela: "representantes", nome: "Representante", cadastrado: true, arquivar: true }, acessos: { tabela: "acessos_painel", nome: "Acesso" }, cargos: { tabela: "", nome: "Cargo" }, arquivos: { tabela: "", nome: "Arquivo" }, "documentos-oficiais": { tabela: "", nome: "Documento oficial" }, mensagens: { tabela: "mensagens", nome: "Mensagem" } } as Record<string, Alvo>)[recurso] || null;
}
function objeto(valor: unknown): Objeto { return valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Objeto : {}; }
function objetoJson(valor: unknown) { try { return objeto(JSON.parse(String(valor || "{}"))); } catch { return {}; } }
function texto(valor: unknown) { return typeof valor === "string" ? valor.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 180) : ""; }
function nomeDoRegistro(registro: Objeto | null) { return registro ? texto(registro.nome || registro.titulo || registro.nome_exibicao || registro.descricao) : ""; }
