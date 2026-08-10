import type { Metadata } from "next";
import { DetalheEventoInterno } from "../../../componentes/EventosInternosPublicos";

export const metadata: Metadata = {
  title: "Evento interno | GECEP",
  description: "Informações públicas de um evento interno.",
};

export default async function PaginaEventoInterno({ params }: { params: Promise<{ slug: string }> }) {
  return <DetalheEventoInterno slug={(await params).slug} />;
}
