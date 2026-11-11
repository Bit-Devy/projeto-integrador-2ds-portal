import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CabecalhoPagina from "../componentes/CabecalhoPagina";
import CalendarioPortal from "../componentes/CalendarioPortal";
import { obterCalendarios, obterModulos } from "../servicos/banco";

export const metadata: Metadata = {
  title: "Calendário | GECEP",
  description: "Agenda do GECEP, calendário escolar anual e semestral e calculadora de faltas.",
};

export const dynamic = "force-dynamic";

// abre o calendário habilitado pela gestão com as datas publicadas
export default async function PaginaCalendario() {
  if (!(await obterModulos()).calendario) notFound();
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="Calendário" resumo="Acompanhe as datas do colégio e do GECEP e organize sua vida escolar." caminho="Calendário" />
      <CalendarioPortal calendarios={await obterCalendarios()} />
    </main>
  );
}
