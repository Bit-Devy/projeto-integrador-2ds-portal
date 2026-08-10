// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";

// define os dados da página de entrada
export const metadata: Metadata = {
  title: "Entrar no painel | GECEP",
  robots: { index: false, follow: false },
};

// monta a página de entrada do painel
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; returnTo?: string }>;
}) {
  // recebe os dados enviados pela url
  const parametros = await searchParams;
  // escolhe uma página segura para o retorno
  const retorno = parametros.returnTo?.startsWith("/") ? parametros.returnTo : "/painel";

  return (
    <main id="conteudo" className="pagina-login">
      {/* cartão de entrada do painel */}
      <section className="cartao-login">
        <img src="/logo-gecep.png" alt="Logo do GECEP" />
        <span className="rotulo-secao">ÁREA RESTRITA</span>
        <h1>Entrar no painel</h1>
        <p>Use a senha administrativa definida no arquivo de configuração do projeto.</p>
        {/* aviso de senha incorreta */}
        {parametros.erro && <p className="erro-login" role="alert">Senha incorreta ou configuração ausente.</p>}
        {/* formulário de acesso */}
        <form action="/api/login" method="post">
          <input type="hidden" name="returnTo" value={retorno} />
          <label>
            <span>Senha administrativa</span>
            <input type="password" name="senha" autoComplete="current-password" required autoFocus />
          </label>
          <button type="submit">Entrar</button>
        </form>
        <Link href="/">Voltar ao portal</Link>
      </section>
    </main>
  );
}
