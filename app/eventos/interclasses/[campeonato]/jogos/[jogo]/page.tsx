import type { Metadata } from "next";
import { DetalheJogo } from "../../../../../componentes/InterclassesPublicos";

export const metadata: Metadata = {
  title: "Partida de interclasse | GECEP",
  description: "Participantes, programação, placar e informações públicas da partida.",
};

export default async function PaginaJogo({ params }: { params: Promise<{ campeonato: string; jogo: string }> }) {
  const valores = await params;
  return <DetalheJogo campeonato={valores.campeonato} jogo={valores.jogo} />;
}
