// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa a estrutura comum do portal
import EstruturaPortal from "./componentes/EstruturaPortal";
// importa os estilos do portal
import "./globals.css";
// importa os estilos exclusivos do sistema público de eventos
import "./eventos.css";
// importa estilos isolados das novas áreas administrativas
import "./painel-eventos.css";
import "./interclasses.css";
// mantém o estilo dos serviços junto da identidade visual do portal
import "./servicos.css";
import { obterModulos } from "./servicos/banco";
import { modulosPadrao } from "./servicos/tipos";
import { obterAmbiente } from "../worker/ambiente";

// define os dados principais do portal
export const metadata: Metadata = {
  title: "GECEP | Grêmio Estudantil do Colégio Estadual do Paraná",
  description:
    "Portal do Grêmio Estudantil do Colégio Estadual do Paraná: notícias, eventos, documentos e transparência.",
  icons: {
    icon: "/logo-gecep.png",
    shortcut: "/logo-gecep.png",
  },
};

// monta a estrutura usada em todas as páginas
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {/* envolve a página com o cabeçalho e o rodapé */}
        <EstruturaPortal modulosIniciais={obterAmbiente().DB ? await obterModulos() : modulosPadrao}>{children}</EstruturaPortal>
      </body>
    </html>
  );
}
