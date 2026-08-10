import type { Metadata } from "next";
import Link from "next/link";
import CabecalhoPagina from "../componentes/CabecalhoPagina";

export const metadata: Metadata = {
  title: "Calendário agora está em Eventos | GECEP",
  description: "A agenda pública passou a fazer parte da central de eventos do GECEP.",
};

// Mantém a rota antiga como ponte para links e favoritos existentes.
export default function PaginaCalendario() {
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="A agenda mudou de endereço" resumo="Eventos, interclasses, jogos, reuniões e atas agora estão reunidos em uma central pública." caminho="Calendário" />
      <section className="limite pagina-conteudo ponte-calendario">
        <h2>Continue para a central de eventos</h2>
        <p>Este endereço foi preservado para não quebrar links antigos.</p>
        <Link className="botao-primario" href="/eventos">Abrir Eventos</Link>
      </section>
    </main>
  );
}
