import type { Metadata } from "next";
import { CentralEventos } from "../componentes/EventosInternosPublicos";

export const metadata: Metadata = {
  title: "Eventos | GECEP",
  description: "Central pública de eventos, interclasses, jogos, reuniões, atas e representantes do GECEP.",
};

export default function PaginaEventos() {
  return <CentralEventos />;
}
