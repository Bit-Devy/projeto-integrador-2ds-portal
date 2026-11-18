import type { Metadata } from "next";
import CabecalhoPagina from "../componentes/CabecalhoPagina";
import ListaNoticias from "../componentes/ListaNoticias";

// define os dados da página de notícias
export const metadata: Metadata = {
  title: "Notícias | GECEP",
  description: "Notícias, campanhas e ações do Grêmio Estudantil do CEP.",
};

// monta a página de notícias
export default async function PaginaNoticias({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  // recebe o texto de busca enviado pela url
  const parametros = await searchParams;

  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina
        titulo="Notícias"
        resumo="Ações, campanhas, eventos e decisões relacionadas à representação estudantil no CEP."
      />
      {/* lista filtrada de notícias */}
      <section className="limite pagina-conteudo">
        <ListaNoticias buscaInicial={parametros.busca} />
      </section>
    </main>
  );
}
