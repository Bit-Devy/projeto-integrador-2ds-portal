import type { Metadata } from "next";
import { DetalheReuniaoPublica } from "../../../componentes/ReunioesPublicas";

export const metadata: Metadata = {
  title: "Reunião e ata | GECEP",
  description: "Resumo, presenças, ata e documentos públicos da reunião.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function PaginaReuniao({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Busca> }) {
  return <DetalheReuniaoPublica slug={(await params).slug} guiaInicial={primeiro((await searchParams).guia)} />;
}
