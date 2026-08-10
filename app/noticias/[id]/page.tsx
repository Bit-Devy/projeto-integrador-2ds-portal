// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";
// importa a resposta de página não encontrada
import { notFound } from "next/navigation";
// importa o acesso ao banco
import { getD1 } from "../../../db";
// importa a preparação do banco
import { garantirBanco } from "../../../db/inicializar";
// importa o tipo de uma notícia
import type { NoticiaGecep } from "../../conteudo/tipos";
// importa o cabeçalho da página
import CabecalhoPagina from "../../componentes/CabecalhoPagina";

// evita usar uma notícia antiga em cache
export const dynamic = "force-dynamic";

// descreve uma notícia salva no banco
type Linha = { id: number; dados_json: string; publicado: number };

// cria os dados da página com a notícia encontrada
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  // busca a notícia pelo endereço
  const noticia = await buscarNoticia((await params).id);
  // usa dados simples quando a notícia não existe
  return noticia ? { title: `${noticia.titulo} | GECEP`, description: noticia.resumo } : { title: "Notícia | GECEP" };
}

// monta a página completa da notícia
export default async function PaginaNoticia({ params }: { params: Promise<{ id: string }> }) {
  // busca a notícia pelo endereço
  const noticia = await buscarNoticia((await params).id);
  // mostra a página de erro quando necessário
  if (!noticia) notFound();

  return (
    <main id="conteudo">
      {/* cabeçalho da notícia */}
      <CabecalhoPagina titulo={noticia.titulo} resumo={noticia.resumo} caminho={`Notícias / ${noticia.categoria}`} />
      {/* texto e dados da notícia */}
      <article className="limite pagina-conteudo noticia-completa">
        {/* organiza a data no formato usado no brasil */}
        <div className="metadados-noticia"><span>{noticia.categoria}</span><time>{noticia.data.split("-").reverse().join("/")}</time></div>
        {/* separa o conteúdo em parágrafos */}
        {noticia.conteudo ? noticia.conteudo.split("\n").filter(Boolean).map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>) : <p>{noticia.resumo}</p>}
        {/* link externo relacionado à notícia */}
        {noticia.link && <a className="botao-secundario" href={noticia.link} target="_blank" rel="noreferrer">Consultar fonte ou publicação relacionada ↗</a>}
        <Link className="link-seta" href="/noticias">‹ Voltar para notícias</Link>
      </article>
    </main>
  );
}

// busca uma notícia pública no banco
async function buscarNoticia(idTexto: string) {
  // transforma o código do endereço em número
  const id = Number(idTexto);
  // rejeita códigos inválidos
  if (!Number.isInteger(id) || id <= 0) return null;
  // tenta encontrar a notícia no banco
  try {
    // prepara as tabelas antes da consulta
    await garantirBanco();
    // procura somente uma notícia publicada
    const linha = await getD1().prepare("SELECT id, dados_json, publicado FROM conteudos WHERE id = ? AND tipo = 'noticias' AND publicado = 1").bind(id).first<Linha>();
    // encerra quando a notícia não existe
    if (!linha) return null;
    // junta o código com os dados salvos
    return { ...(JSON.parse(linha.dados_json) as NoticiaGecep), id: linha.id };
  } catch {
    // evita quebrar a página quando o banco falha
    return null;
  }
}
