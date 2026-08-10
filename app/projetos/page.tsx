// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa a grade de projetos
import GradeProjetos from "../componentes/GradeProjetos";

// define os dados da página de projetos
export const metadata: Metadata = { title: "Projetos | GECEP", description: "Projetos e ações do Grêmio Estudantil do CEP." };

// monta a página de projetos
export default function PaginaProjetos() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Projetos" resumo="Acompanhe iniciativas estudantis, veja resultados e descubra como transformar uma ideia em ação." />
      {/* projetos publicados */}
      <section className="limite pagina-conteudo">
        <div className="cabecalho-secao"><div><span className="rotulo-secao">AÇÕES DO GRÊMIO</span><h2>Projetos e campanhas</h2><p>Exemplos reais de atuação do GECEP registrados nos canais oficiais do colégio.</p></div></div>
        <GradeProjetos />
      </section>

      {/* etapas para criar um projeto */}
      <section className="secao-cinza"><div className="limite"><div className="cabecalho-secao cabecalho-centralizado"><div><span className="rotulo-secao">DO PAPEL À PRÁTICA</span><h2>Como uma proposta pode avançar</h2></div></div><div className="etapas-projeto"><article><span>1</span><strong>Ideia</strong><p>O estudante explica o problema, objetivo e público da proposta.</p></article><article><span>2</span><strong>Análise</strong><p>A gestão verifica viabilidade, recursos, responsáveis e regras.</p></article><article><span>3</span><strong>Construção</strong><p>Uma equipe organiza plano, cronograma e parcerias necessárias.</p></article><article><span>4</span><strong>Resultado</strong><p>A ação é realizada e seu resultado pode ser publicado no portal.</p></article></div></div></section>

      {/* botão para enviar uma proposta */}
      <section className="limite chamada-interna"><div><span className="rotulo-secao">TENHO UMA IDEIA</span><h2>Proponha o próximo projeto do GECEP</h2><p>Você não precisa apresentar tudo pronto. Comece explicando o que gostaria de mudar ou construir.</p></div><Link className="botao-primario" href="/sugestoes#projeto">Enviar proposta</Link></section>
    </main>
  );
}
