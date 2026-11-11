// oferece oportunidades somente enquanto a página estiver habilitada
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CabecalhoPagina from "../componentes/CabecalhoPagina";
import CentralEstagios from "../componentes/CentralEstagios";
import { obterModulos } from "../servicos/banco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Central de Estágios | GECEP", description: "Estágios, empregos, vagas de jovem aprendiz e concursos divulgados para a comunidade escolar." };
export default async function PaginaEstagios() {
  if (!(await obterModulos()).estagios) notFound();
  return <main id="conteudo"><CabecalhoPagina titulo="Central de Estágios" resumo="Encontre oportunidades para aprender, trabalhar e dar os próximos passos." caminho="Central de Estágios" /><CentralEstagios /></main>;
}
