import type { Metadata } from "next";
import { PaginaRepresentantes } from "../componentes/RepresentantesPublicos";

export const metadata: Metadata = {
  title: "Representantes de turma | GECEP",
  description: "Busca pública de representantes por nome, turma, turno, nível, série e função.",
};

type Busca = Record<string, string | string[] | undefined>;
function primeiro(valor: string | string[] | undefined) { return Array.isArray(valor) ? valor[0] || "" : valor || ""; }

export default async function Representantes({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  return <PaginaRepresentantes filtrosIniciais={{ busca: primeiro(busca.busca), turma: primeiro(busca.turma), turno: primeiro(busca.turno), nivel: primeiro(busca.nivel), serie: primeiro(busca.serie), funcao: primeiro(busca.funcao) }} />;
}
