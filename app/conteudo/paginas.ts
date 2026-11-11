// importa as páginas publicadas que podem receber um botão de notícia
import { getD1 } from "../../db";
import { obterModulos } from "../servicos/banco";

export const paginasFixas = [
  ["/", "Início"], ["/noticias", "Notícias"], ["/o-gecep", "O GECEP"], ["/gestao", "Gestão"],
  ["/estatuto", "Estatuto do GECEP"], ["/documentos", "Documentos"], ["/transparencia", "Transparência"],
  ["/eventos", "Central de eventos"], ["/eventos/internos", "Eventos internos"], ["/eventos/interclasses", "Interclasses"],
  ["/eventos/reunioes", "Reuniões e atas"], ["/crt", "CRT"], ["/representantes", "Representantes"],
  ["/projetos", "Projetos"], ["/sugestoes", "Sugestões"], ["/contato", "Contato"], ["/mapa-do-colegio", "Mapa do colégio"],
  ["/calendario", "Calendário"], ["/calendario#calculadora", "Calculadora de faltas"], ["/cantina", "Cantina"], ["/estagios", "Central de Estágios"],
];

// mostra apenas os atalhos gerais antes de abrir a busca de uma publicação
export async function paginasBasicasPublicadas() {
  const modulos = await obterModulos();
  return paginasFixas.filter(([url]) => !(url.startsWith("/calendario") && !modulos.calendario || url.startsWith("/cantina") && !modulos.cantina || url.startsWith("/estagios") && !modulos.estagios)).map(([url, nome]) => ({ url, nome }));
}

// reúne páginas gerais e detalhes que já estão disponíveis ao público
export async function paginasPublicadas() {
  const modulos = await obterModulos();
  // divide as consultas para respeitar o limite de uniões do banco em produção
  const resultados = await getD1().batch<{ url: string; nome: string }>([
    getD1().prepare(`SELECT '/noticias/' || id AS url, titulo AS nome FROM conteudos WHERE tipo = 'noticias' AND publicado = 1
    UNION ALL SELECT '/eventos/interclasses/' || slug, nome FROM campeonatos WHERE publicado = 1 AND (ativo = 1 OR arquivado_em IS NOT NULL)
    UNION ALL SELECT '/eventos/internos/' || slug, titulo FROM eventos_internos WHERE publicado = 1 AND (ativo = 1 OR arquivado_em IS NOT NULL)
    UNION ALL SELECT '/eventos/reunioes/' || slug, titulo FROM reunioes WHERE publicado = 1 AND (ativo = 1 OR arquivado_em IS NOT NULL)`),
    getD1().prepare(`SELECT '/projetos#projeto-' || id AS url, 'Projeto: ' || titulo AS nome FROM conteudos WHERE tipo = 'projetos' AND publicado = 1`),
    getD1().prepare(`SELECT '/eventos/interclasses/' || c.slug || '/jogos/' || p.id AS url, c.nome || ' · ' || f.nome || ' · jogo ' || p.id AS nome
      FROM partidas p INNER JOIN campeonatos c ON c.id = p.campeonato_id INNER JOIN fases_campeonato f ON f.id = p.fase_id
      WHERE p.publicado = 1 AND p.ativo = 1 AND c.publicado = 1 AND c.chave_publicada = 1 AND (c.ativo = 1 OR c.arquivado_em IS NOT NULL) AND f.publicado = 1 AND f.ativo = 1`),
  ]);
  const fixas = paginasFixas.filter(([url]) => !(url.startsWith("/calendario") && !modulos.calendario || url.startsWith("/cantina") && !modulos.cantina || url.startsWith("/estagios") && !modulos.estagios));
  return [...fixas.map(([url, nome]) => ({ url, nome })), ...resultados.flatMap((resultado) => resultado.results)];
}

// aceita um caminho do portal sem permitir um endereço disfarçado de link interno
export function caminhoInterno(valor: string) {
  if (!valor.startsWith("/") || valor.startsWith("//") || /[\\\u0000-\u0020]/.test(valor)) return null;
  try {
    const url = new URL(valor, "https://portal.gecep.local");
    return url.origin === "https://portal.gecep.local" ? url : null;
  } catch { return null; }
}
