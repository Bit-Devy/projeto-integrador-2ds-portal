import type { Metadata } from "next";
import { DetalheReuniaoPublica } from "../../../componentes/ReunioesPublicas";
import { obterReuniao } from "../../banco";
import { exigirPublicacao } from "../../pagina-publica";

export const metadata: Metadata = {
  title: "Reunião e ata | GECEP",
  description: "Resumo, presenças, ata e documentos públicos da reunião.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function PaginaReuniao({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Busca> }) {
  const { slug } = await params;
  await exigirPublicacao(() => obterReuniao(slug));
  return <DetalheReuniaoPublica slug={slug} guiaInicial={primeiro((await searchParams).guia)} />;
}
