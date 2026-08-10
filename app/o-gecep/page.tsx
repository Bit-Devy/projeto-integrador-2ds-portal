// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";

// define os dados da página do grêmio
export const metadata: Metadata = {
  title: "O GECEP | Grêmio Estudantil do CEP",
  description: "Conheça a história, os objetivos e o funcionamento do GECEP.",
};

// monta a página sobre o grêmio
export default function PaginaGecep() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina
        titulo="O GECEP"
        resumo="Conheça a história, os princípios e o papel da representação estudantil no Colégio Estadual do Paraná."
      />

      {/* apresentação do grêmio */}
      <section className="limite pagina-conteudo grade-apresentacao-interna">
        <div>
          <span className="rotulo-secao">QUEM SOMOS</span>
          <h2>Uma entidade construída pelos estudantes e para os estudantes</h2>
          <p>
            O Grêmio Estudantil do Colégio Estadual do Paraná é a instância de representação do
            corpo discente. Sua função é defender interesses individuais e coletivos, promover a
            participação e colaborar para uma comunidade escolar mais democrática.
          </p>
          <p>
            O GECEP possui autonomia e estatuto próprio. Suas atividades são acompanhadas pelas
            Direções Auxiliares e pela Equipe Pedagógica como suporte ao bom funcionamento, sem
            substituir o protagonismo dos estudantes.
          </p>
          <div className="botoes-inicio">
            <Link className="botao-primario" href="/estatuto">Consultar o Estatuto</Link>
            <Link className="botao-secundario" href="/gestao">Conhecer a gestão</Link>
          </div>
        </div>
        <div className="quadro-logo-interno">
          <img src="/logo-gecep-com-texto.png" alt="GECEP — Grêmio Estudantil do Colégio Estadual do Paraná" />
          <small>Representação oficial do corpo discente do CEP</small>
        </div>
      </section>

      {/* datas importantes do grêmio */}
      <section className="faixa-dados-gecep">
        <div className="limite grade-dados-gecep">
          <article><strong>1951</strong><span>Ano de fundação</span></article>
          <article><strong>1966</strong><span>Reorganização da entidade</span></article>
          <article><strong>2023</strong><span>Reformulação do Estatuto vigente</span></article>
          <article><strong>CRT</strong><span>Braço de representação das turmas</span></article>
        </div>
      </section>

      {/* objetivos do grêmio */}
      <section className="limite secao-padrao">
        <div className="cabecalho-secao cabecalho-centralizado">
          <div>
            <span className="rotulo-secao">OBJETIVOS</span>
            <h2>Para que existe o grêmio estudantil?</h2>
          </div>
        </div>
        <div className="grade-valores">
          <article><span>01</span><h3>Representar</h3><p>Levar interesses, necessidades e propostas dos estudantes aos espaços de decisão do colégio.</p></article>
          <article><span>02</span><h3>Participar</h3><p>Ampliar a presença dos estudantes nos debates que afetam a vida escolar.</p></article>
          <article><span>03</span><h3>Mobilizar</h3><p>Organizar projetos culturais, sociais, esportivos, educacionais e de integração.</p></article>
          <article><span>04</span><h3>Informar</h3><p>Divulgar decisões, oportunidades, eventos e prestações de contas de forma acessível.</p></article>
        </div>
      </section>

      {/* linha do tempo do grêmio */}
      <section className="secao-cinza" id="historia">
        <div className="limite">
          <div className="cabecalho-secao">
            <div><span className="rotulo-secao">NOSSA HISTÓRIA</span><h2>Marcos do GECEP</h2></div>
          </div>
          <div className="linha-tempo">
            <article><time>03 NOV 1951</time><h3>Fundação</h3><p>O GECEP é fundado como entidade representativa dos estudantes do Colégio Estadual do Paraná.</p></article>
            <article><time>11 ABR 1966</time><h3>Reorganização</h3><p>A entidade passa por uma reorganização, marco registrado no Estatuto do grêmio.</p></article>
            <article><time>06 OUT 2023</time><h3>Novo Estatuto</h3><p>Uma Assembleia Geral extraordinária reformula o documento que orienta o funcionamento da entidade.</p></article>
            <article><time>HOJE</time><h3>Participação contínua</h3><p>O GECEP segue atuando em representação, projetos, acolhimento e mobilização estudantil.</p></article>
          </div>
        </div>
      </section>

      {/* botão para conhecer o conselho */}
      <section className="limite chamada-interna">
        <div><span className="rotulo-secao">CONTINUE EXPLORANDO</span><h2>Veja como a representação funciona na prática</h2><p>Conheça o CRT, as assembleias e os caminhos usados para transformar demandas das turmas em ações.</p></div>
        <Link className="botao-primario" href="/crt">Conhecer o CRT</Link>
      </section>
    </main>
  );
}
