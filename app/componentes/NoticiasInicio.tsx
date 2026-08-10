// ativa recursos do navegador
"use client";

// importa o componente de link
import Link from "next/link";
// importa as notícias iniciais
import { noticias } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
// importa o cartão de notícia
import CartaoNoticia from "./CartaoNoticia";

// mostra as notícias na tela inicial
export default function NoticiasInicio() {
  // busca as notícias publicadas
  const { dados } = useConteudoPublico("noticias", noticias);
  // separa as notícias em destaque
  const destaques = dados.filter((noticia) => noticia.destaque).slice(0, 3);
  // usa as primeiras notícias quando não há destaques
  const exibidas = destaques.length ? destaques : dados.slice(0, 3);

  return (
    <section className="limite secao-inicial-noticias">
      {/* título e botão de todas as notícias */}
      <div className="cabecalho-secao">
        <div><span className="rotulo-secao">ACONTECEU NO GECEP</span><h2>Notícias em destaque</h2></div>
        <Link href="/noticias">Ver todas as notícias ››</Link>
      </div>
      {/* cartões das notícias em destaque */}
      {exibidas.length ? <div className="grade-noticias">{exibidas.map((noticia) => <CartaoNoticia noticia={noticia} key={`${noticia.id ?? "noticia"}-${noticia.titulo}`} />)}</div> : <p className="sem-resultados">Nenhuma notícia publicada no momento.</p>}
    </section>
  );
}
