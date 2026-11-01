import type { Metadata } from "next";
import { DetalheEventoInterno } from "../../../componentes/EventosInternosPublicos";
import { obterEvento } from "../../banco";
import { exigirPublicacao } from "../../pagina-publica";

export const metadata: Metadata = {
  title: "Evento interno | GECEP",
  description: "Informações públicas de um evento interno.",
};

export default async function PaginaEventoInterno({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await exigirPublicacao(() => obterEvento(slug));
  return <DetalheEventoInterno slug={slug} />;
}
