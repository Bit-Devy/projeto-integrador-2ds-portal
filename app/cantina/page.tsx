// respeita as chaves da página e dos setores também no acesso direto
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CabecalhoPagina from "../componentes/CabecalhoPagina";
import CantinaPublica from "../componentes/CantinaPublica";
import { obterModulos } from "../servicos/banco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cantina | GECEP", description: "Merenda escolar e cardápios da APMF, GECEP e robótica." };
export default async function PaginaCantina() {
  const modulos = await obterModulos(); if (!modulos.cantina) notFound();
  return <main id="conteudo"><CabecalhoPagina titulo="Cantina" resumo="Consulte a merenda da semana e os cardápios disponíveis no colégio." caminho="Cantina" /><CantinaPublica modulos={modulos} /></main>;
}
