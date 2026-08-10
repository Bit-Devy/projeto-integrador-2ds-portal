// importa o componente de link
import Link from "next/link";

// mostra o cabeçalho padrão das páginas
export default function CabecalhoPagina({
  titulo,
  resumo,
  caminho,
}: {
  titulo: string;
  resumo: string;
  caminho?: string;
}) {
  return (
    <section className="topo-pagina" id="topo">
      <div className="limite topo-pagina-conteudo">
        {/* caminho da página */}
        <nav className="migalhas" aria-label="Caminho da página">
          <Link href="/">Início</Link>
          <span aria-hidden="true">›</span>
          <span>{caminho ?? titulo}</span>
        </nav>
        {/* título e resumo da página */}
        <span className="traco-titulo" aria-hidden="true" />
        <h1>{titulo}</h1>
        <p>{resumo}</p>
      </div>
    </section>
  );
}
