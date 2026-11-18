import type { Metadata } from "next";
import Link from "next/link";
import FormularioLogin from "../componentes/FormularioLogin";
import { caminhoSeguro } from "../lib/sessao";

// define os dados da página de entrada
export const metadata: Metadata = {
  title: "Entrar no painel | GECEP",
  robots: { index: false, follow: false },
};

// monta a página de entrada do painel
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; returnTo?: string; geral?: string }>;
}) {
  // recebe os dados enviados pela url
  const parametros = await searchParams;
  // escolhe uma página segura para o retorno
  const retorno = caminhoSeguro(parametros.returnTo ?? "/painel");

  return (
    <main id="conteudo" className="pagina-login">
      {/* cartão de entrada do painel */}
      <section className="cartao-login">
        <img src="/logo-gecep.png" alt="Logo do GECEP" />
        <span className="rotulo-secao">ÁREA RESTRITA</span>
        <h1>Entrar no painel</h1>
        <p>Informe a senha do seu cargo para acessar o painel.</p>
        {/* formulário de acesso */}
        <FormularioLogin
          retorno={retorno}
          erro={parametros.erro}
          geralInicial={parametros.geral === "1"}
        />
        <Link href="/">Voltar ao portal</Link>
      </section>
    </main>
  );
}
