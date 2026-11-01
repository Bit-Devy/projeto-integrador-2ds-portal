import type { Metadata } from "next";
import { DetalheInterclasse } from "../../../componentes/InterclassesPublicos";
import { obterCampeonato } from "../../banco";
import { exigirPublicacao } from "../../pagina-publica";

export const metadata: Metadata = {
  title: "Interclasse | GECEP",
  description: "Página pública de campeonato com chave, partidas, classificação e documentos.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function PaginaInterclasse({ params, searchParams }: { params: Promise<{ campeonato: string }>; searchParams: Promise<Busca> }) {
  const { campeonato } = await params;
  await exigirPublicacao(() => obterCampeonato(campeonato));
  return <DetalheInterclasse slug={campeonato} guiaInicial={primeiro((await searchParams).guia)} />;
}
