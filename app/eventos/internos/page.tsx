import type { Metadata } from "next";
import { ListaEventosInternos } from "../../componentes/EventosInternosPublicos";

export const metadata: Metadata = {
  title: "Eventos internos | GECEP",
  description: "Atividades realizadas no colégio ou organizadas pelo GECEP.",
};

type Busca = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] || "" : valor || "";
}

export default async function PaginaEventosInternos({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  return <ListaEventosInternos filtrosIniciais={{ situacao: primeiro(busca.situacao), ano: primeiro(busca.ano), mes: primeiro(busca.mes), categoria: primeiro(busca.categoria), turno: primeiro(busca.turno), publico: primeiro(busca.publico) }} />;
}
