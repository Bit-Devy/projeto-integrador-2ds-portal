// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o painel de administração
import PainelAdministrativo from "../componentes/PainelAdministrativo";
// importa a proteção da página
import { exigirUsuarioPainel } from "../lib/sessao";

// evita gerar uma cópia fixa da página privada
export const dynamic = "force-dynamic";
// define os dados da página privada
export const metadata: Metadata = {
  title: "Painel da gestão | GECEP",
  robots: { index: false, follow: false },
};

// monta a página protegida do painel
export default async function PaginaPainel() {
  // exige uma sessão válida antes de abrir o painel
  const usuario = await exigirUsuarioPainel("/painel");
  // entrega o nome do usuário ao painel
  return <main id="conteudo"><PainelAdministrativo nomeUsuario={usuario.nome} /></main>;
}
