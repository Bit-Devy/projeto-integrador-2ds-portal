// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa a grade de documentos
import GradeDocumentos from "../componentes/GradeDocumentos";

// define os dados da página de documentos
export const metadata: Metadata = { title: "Documentos | GECEP", description: "Arquivo público de documentos do GECEP." };

// monta a página de documentos
export default function PaginaDocumentos() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Documentos" resumo="Arquivo público para estatutos, atas, planos de ação, relatórios e outros registros do GECEP." />
      {/* arquivos publicados */}
      <section className="limite pagina-conteudo">
        <div className="cabecalho-secao"><div><span className="rotulo-secao">ARQUIVO PÚBLICO</span><h2>Documentos disponíveis</h2><p>Arquivos oficiais possuem link direto. Espaços ainda sem publicação estão claramente identificados.</p></div></div>
        <GradeDocumentos />
      </section>

      {/* espaço das atas e decisões */}
      <section className="secao-cinza" id="atas"><div className="limite grade-duas-colunas"><div><span className="rotulo-secao">ATAS E DECISÕES</span><h2>Histórico das reuniões</h2><p>Esta área permitirá consultar atas por data, tipo de reunião, pauta e gestão responsável.</p></div><div className="caixa-vazia caixa-vazia-clara"><span>ATA</span><div><strong>Nenhuma ata adicionada nesta versão</strong><p>Os documentos poderão ser publicados individualmente, sem apagar o histórico.</p></div></div></div></section>

      {/* espaço dos planos e relatórios */}
      <section className="limite secao-padrao" id="planos"><div className="cabecalho-secao"><div><span className="rotulo-secao">PLANOS E RELATÓRIOS</span><h2>Organização por gestão e período</h2></div></div><div className="grade-arquivo"><article><strong>Plano anual de ação</strong><p>Metas, prazos, responsáveis e indicadores da gestão.</p><span>Aguardando publicação</span></article><article><strong>Relatório de atividades</strong><p>Ações realizadas, público alcançado e resultados.</p><span>Aguardando publicação</span></article><article><strong>Prestação de contas</strong><p>Relatórios financeiros e comprovantes organizados por período.</p><a href="/transparencia">Ir para transparência ›</a></article></div></section>
    </main>
  );
}
