// importa as páginas publicadas que podem receber um botão de notícia
import { getD1 } from "../../db";

const paginasFixas = [
  ["/", "Início"], ["/noticias", "Notícias"], ["/o-gecep", "O GECEP"], ["/gestao", "Gestão"],
  ["/estatuto", "Estatuto do GECEP"], ["/documentos", "Documentos"], ["/transparencia", "Transparência"],
  ["/eventos", "Central de eventos"], ["/eventos/internos", "Eventos internos"], ["/eventos/interclasses", "Interclasses"],
  ["/eventos/reunioes", "Reuniões e atas"], ["/crt", "CRT"], ["/representantes", "Representantes"],
  ["/projetos", "Projetos"], ["/sugestoes", "Sugestões"], ["/contato", "Contato"], ["/mapa-do-colegio", "Mapa do colégio"],
];

// reúne páginas gerais e detalhes que já estão disponíveis ao público
export async function paginasPublicadas() {
  const resultado = await getD1().prepare(`SELECT '/noticias/' || id AS url, titulo AS nome FROM conteudos WHERE tipo = 'noticias' AND publicado = 1
    UNION ALL SELECT '/eventos/interclasses/' || slug, nome FROM campeonatos WHERE publicado = 1 AND (ativo = 1 OR arquivado_em IS NOT NULL)
    UNION ALL SELECT '/eventos/internos/' || slug, titulo FROM eventos_internos WHERE publicado = 1 AND (ativo = 1 OR arquivado_em IS NOT NULL)
    UNION ALL SELECT '/eventos/reunioes/' || slug, titulo FROM reunioes WHERE publicado = 1 AND (ativo = 1 OR arquivado_em IS NOT NULL)`).all<{ url: string; nome: string }>();
  return [...paginasFixas.map(([url, nome]) => ({ url, nome })), ...resultado.results];
}

// aceita um caminho do portal sem permitir um endereço disfarçado de link interno
export function caminhoInterno(valor: string) {
  if (!valor.startsWith("/") || valor.startsWith("//") || /[\\\u0000-\u0020]/.test(valor)) return null;
  try {
    const url = new URL(valor, "https://portal.gecep.local");
    return url.origin === "https://portal.gecep.local" ? url : null;
  } catch { return null; }
}
