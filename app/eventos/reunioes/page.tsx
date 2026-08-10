import type { Metadata } from "next";
import { ListaReunioes } from "../../componentes/ReunioesPublicas";

export const metadata: Metadata = {
  title: "Reuniões e atas | GECEP",
  description: "Reuniões publicadas, resumos, presenças, atas e documentos do GECEP.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function PaginaReunioes({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  return <ListaReunioes filtrosIniciais={{ busca: primeiro(busca.busca), ano: primeiro(busca.ano), mes: primeiro(busca.mes), tipo: primeiro(busca.tipo), situacao: primeiro(busca.situacao), turno: primeiro(busca.turno), nivel: primeiro(busca.nivel) }} />;
}
