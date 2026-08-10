import type { Metadata } from "next";
import { DetalheInterclasse } from "../../../componentes/InterclassesPublicos";

export const metadata: Metadata = {
  title: "Interclasse | GECEP",
  description: "Página pública de campeonato com chave, partidas, classificação e documentos.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function PaginaInterclasse({ params, searchParams }: { params: Promise<{ campeonato: string }>; searchParams: Promise<Busca> }) {
  return <DetalheInterclasse slug={(await params).campeonato} guiaInicial={primeiro((await searchParams).guia)} />;
}
