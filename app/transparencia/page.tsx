// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa os dados financeiros que recebem interação
import TransparenciaInterativa from "../componentes/TransparenciaInterativa";

// define os dados da página de transparência
export const metadata: Metadata = { title: "Portal da transparência | GECEP", description: "Receitas, despesas, comprovantes e relatórios financeiros do GECEP." };

// monta a página de transparência
export default function PaginaTransparencia() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Portal da transparência" resumo="Acompanhe entradas, despesas, comprovantes e relatórios dos recursos administrados pelo GECEP." />
      {/* resumo e movimentações financeiras */}
      <section className="limite pagina-conteudo">
        <TransparenciaInterativa />
      </section>

      {/* relatórios financeiros por período */}
      <section className="secao-cinza" id="relatorios"><div className="limite"><div className="cabecalho-secao"><div><span className="rotulo-secao">RELATÓRIOS</span><h2>Prestações de contas por período</h2><p>Cada relatório poderá reunir resumo, movimentações e comprovantes em um único arquivo.</p></div></div><div className="grade-relatorios"><article><span>2026</span><strong>1º semestre</strong><p>Aguardando publicação da gestão.</p><button type="button" disabled>Relatório indisponível</button></article><article><span>2026</span><strong>2º semestre</strong><p>Período em andamento.</p><button type="button" disabled>Em preparação</button></article><article><span>ARQ</span><strong>Gestões anteriores</strong><p>Área destinada à preservação do histórico financeiro.</p><button type="button" disabled>Nenhum arquivo adicionado</button></article></div></div></section>

      {/* compromissos da transparência */}
      <section className="limite secao-padrao"><div className="cabecalho-secao cabecalho-centralizado"><div><span className="rotulo-secao">COMPROMISSOS</span><h2>Como a transparência será apresentada</h2></div></div><div className="grade-valores"><article><span>01</span><h3>Registro completo</h3><p>Cada movimentação informa data, descrição, categoria, tipo e valor.</p></article><article><span>02</span><h3>Comprovantes</h3><p>Despesas podem ser acompanhadas de notas, recibos ou documentos equivalentes.</p></article><article><span>03</span><h3>Histórico preservado</h3><p>Publicações anteriores permanecem disponíveis para consulta.</p></article><article><span>04</span><h3>Linguagem simples</h3><p>Resumos permitem que qualquer estudante compreenda os dados.</p></article></div></section>
    </main>
  );
}
