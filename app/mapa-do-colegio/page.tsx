// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa o mapa que recebe interação
import MapaColegioInterativo from "../componentes/MapaColegioInterativo";

// define os dados da página do mapa
export const metadata: Metadata = {
  title: "Mapa do Colégio | GECEP",
  description:
    "Consulte onde ficam turmas, atividades, salas e espaços do Colégio Estadual do Paraná.",
};

// monta a página do mapa do colégio
export default function PaginaMapaDoColegio() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina
        titulo="Mapa do Colégio"
        resumo="Encontre turmas, atividades, salas e espaços do colégio pelas informações de ensalamento publicadas."
        caminho="Mais / Mapa do Colégio"
      />
      {/* busca e visualização do mapa */}
      <MapaColegioInterativo />
    </main>
  );
}
