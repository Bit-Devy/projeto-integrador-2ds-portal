// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";

// define os dados da página do estatuto
export const metadata: Metadata = { title: "Estatuto do GECEP", description: "Consulte o Estatuto de 2023 do Grêmio Estudantil do CEP." };
// guarda o endereço do estatuto oficial
const linkEstatuto = "https://www.cep.pr.gov.br/sites/cep/arquivos_restritos/files/documento/2025-05/estatuto_do_gecep_de_2023-1.pdf";

// monta a página do estatuto
export default function PaginaEstatuto() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Estatuto do GECEP" resumo="O documento que estabelece a organização, os objetivos, as regras e os processos da entidade estudantil." caminho="O GECEP / Estatuto" />
      {/* apresentação e botões do documento */}
      <section className="limite pagina-conteudo grade-estatuto-abertura">
        <div><span className="rotulo-secao">ESTATUTO DE 2023</span><h2>As regras que orientam o funcionamento do grêmio</h2><p>O Estatuto foi reformulado em Assembleia Geral extraordinária realizada em outubro de 2023. Ele é a referência oficial para compreender direitos, órgãos, eleições, patrimônio e funcionamento do GECEP.</p><div className="botoes-inicio"><a className="botao-primario" href={linkEstatuto} target="_blank" rel="noreferrer">Abrir PDF oficial</a><a className="botao-secundario" href={linkEstatuto} download>Baixar documento</a></div></div>
        <div className="cartao-documento-grande"><span>PDF</span><div><strong>Estatuto do Grêmio Estudantil do Colégio Estadual do Paraná</strong><small>Curitiba · Outubro de 2023</small></div></div>
      </section>

      {/* resumo dos assuntos do estatuto */}
      <section className="secao-cinza"><div className="limite"><div className="cabecalho-secao"><div><span className="rotulo-secao">LEITURA ORIENTADA</span><h2>O que você encontra no documento</h2><p>Resumo temático para ajudar a localizar as informações. Em caso de dúvida, prevalece sempre o texto oficial.</p></div></div><div className="grade-topicos-estatuto"><article><span>I</span><h3>Identidade e objetivos</h3><p>Natureza da entidade, sede, duração, finalidades e princípios.</p></article><article><span>II</span><h3>Estudantes e participação</h3><p>Condições de participação, direitos, deveres e representação.</p></article><article><span>III</span><h3>Órgãos do GECEP</h3><p>Assembleia, diretoria, conselhos e suas responsabilidades.</p></article><article><span>IV</span><h3>Eleições e mandatos</h3><p>Regras para escolha da gestão e processos relacionados.</p></article><article><span>V</span><h3>Patrimônio e finanças</h3><p>Uso de recursos, responsabilidade e prestação de contas.</p></article><article><span>VI</span><h3>Disposições finais</h3><p>Alterações do Estatuto, casos omissos e vigência.</p></article></div></div></section>

      {/* leitor do arquivo em pdf */}
      <section className="limite secao-padrao"><div className="cabecalho-secao"><div><span className="rotulo-secao">VISUALIZAÇÃO</span><h2>Leia o Estatuto no portal</h2></div><a href={linkEstatuto} target="_blank" rel="noreferrer">Abrir em tela cheia ››</a></div><div className="visualizador-pdf"><iframe src={linkEstatuto} title="Estatuto do GECEP em PDF" /><div className="aviso-visualizador"><p>Se o documento não aparecer no seu navegador, use o botão “Abrir PDF oficial”.</p><a href={linkEstatuto} target="_blank" rel="noreferrer">Abrir PDF oficial</a></div></div></section>
    </main>
  );
}
