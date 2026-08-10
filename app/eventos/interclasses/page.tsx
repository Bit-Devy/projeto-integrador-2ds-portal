import type { Metadata } from "next";
import { ListaInterclasses } from "../../componentes/InterclassesPublicos";

export const metadata: Metadata = {
  title: "Interclasses | GECEP",
  description: "Campeonatos, chaves, jogos e resultados dos interclasses publicados pelo GECEP.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function PaginaInterclasses({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  return <ListaInterclasses filtrosIniciais={{ situacao: primeiro(busca.situacao), ano: primeiro(busca.ano), modalidade: primeiro(busca.modalidade), categoria: primeiro(busca.categoria), turno: primeiro(busca.turno), busca: primeiro(busca.busca) }} />;
}
