// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";
// importa a agenda da tela inicial
import AgendaInicio from "./componentes/AgendaInicio";
// importa as notícias da tela inicial
import NoticiasInicio from "./componentes/NoticiasInicio";

// define os dados da tela inicial
export const metadata: Metadata = {
  title: "GECEP | Grêmio Estudantil do Colégio Estadual do Paraná",
  description:
    "Portal do GECEP com notícias, calendário, transparência, documentos e formas de participação estudantil.",
};

// reúne os atalhos principais da tela inicial
const atalhosPrincipais = [
  {
    icone: "▦",
    titulo: "Central de eventos",
    texto: "Atividades, interclasses, jogos, reuniões e atas.",
    destino: "/eventos",
  },
  {
    icone: "R$",
    titulo: "Portal da transparência",
    texto: "Entradas, despesas, relatórios e comprovantes.",
    destino: "/transparencia",
  },
  {
    icone: "✦",
    titulo: "Envie uma sugestão",
    texto: "Compartilhe demandas, propostas e ideias para o CEP.",
    destino: "/sugestoes",
  },
  {
    icone: "§",
    titulo: "Estatuto do GECEP",
    texto: "Conheça as normas, direitos e estrutura do grêmio.",
    destino: "/estatuto",
  },
  {
    icone: "≡",
    titulo: "Documentos",
    texto: "Estatuto, atas, planos, relatórios e arquivos públicos.",
    destino: "/documentos",
  },
];

// reúne as áreas disponíveis no portal
const areasPortal = [
  {
    numero: "01",
    titulo: "O GECEP",
    texto: "História, objetivos, princípios e funcionamento da representação estudantil.",
    destino: "/o-gecep",
  },
  {
    numero: "02",
    titulo: "Gestão atual",
    texto: "Conheça a organização da diretoria e as responsabilidades de cada área.",
    destino: "/gestao",
  },
  {
    numero: "03",
    titulo: "CRT",
    texto: "Saiba como representantes de turma levam as demandas das salas ao grêmio.",
    destino: "/crt",
  },
  {
    numero: "04",
    titulo: "Projetos",
    texto: "Acompanhe iniciativas culturais, sociais, esportivas e educacionais.",
    destino: "/projetos",
  },
  {
    numero: "05",
    titulo: "Notícias",
    texto: "Veja ações, campanhas e decisões recentes da representação estudantil.",
    destino: "/noticias",
  },
  {
    numero: "06",
    titulo: "Contato",
    texto: "Encontre os canais oficiais e saiba como conversar diretamente com o GECEP.",
    destino: "/contato",
  },
];

// monta a tela inicial
export default function Home() {
  return (
    <main id="conteudo">
      {/* apresentação */}
      <section className="inicio-apresentacao">
        <div className="limite inicio-conteudo">
          <div className="inicio-texto">
            <span className="rotulo-secao">GRÊMIO ESTUDANTIL</span>
            <h1>A voz dos estudantes do Colégio Estadual do Paraná</h1>
            <p>
              Um portal para acompanhar decisões, projetos, eventos e recursos, participar da vida
              do colégio e manter o diálogo entre estudantes e representação.
            </p>
            <div className="botoes-inicio">
              <Link className="botao-primario" href="/o-gecep">
                Conheça o GECEP
              </Link>
              <Link className="botao-secundario" href="/sugestoes">
                Envie uma ideia
              </Link>
            </div>
          </div>

          <div className="inicio-marca" aria-hidden="true">
            <span className="orbita orbita-um" />
            <span className="orbita orbita-dois" />
            <img src="/logo-gecep.png" alt="" />
            <small>Desde 1951</small>
          </div>
        </div>
      </section>

      {/* atalhos mais importantes */}
      <section className="secao-servicos" aria-labelledby="titulo-servicos">
        <div className="faixa-titulo">
          <div className="limite">
            <h2 id="titulo-servicos">Serviços para estudantes!</h2>
          </div>
        </div>
        <div className="limite grade-servicos">
          {/* cria um cartão para cada atalho */}
          {atalhosPrincipais.map((atalho) => (
            <Link className="cartao-servico" href={atalho.destino} key={atalho.titulo}>
              <span className="icone-servico" aria-hidden="true">
                {atalho.icone}
              </span>
              <span>
                <strong>{atalho.titulo}</strong>
                <small>{atalho.texto}</small>
              </span>
              <span className="seta-servico" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* resumo do grêmio */}
      <section className="limite secao-introducao">
        <div className="introducao-titulo">
          <span className="rotulo-secao">SOBRE O GRÊMIO</span>
          <h2>Representação estudantil com autonomia, diálogo e participação</h2>
        </div>
        <div className="introducao-texto">
          <p>
            O GECEP é a instância de representação do corpo discente do Colégio Estadual do
            Paraná. Fundado em 1951, reúne estudantes para defender interesses coletivos,
            fortalecer a participação e construir projetos para a comunidade escolar.
          </p>
          <Link href="/o-gecep">Conheça nossa história e funcionamento ›</Link>
        </div>
      </section>

      {/* caminhos do portal */}
      <section className="secao-cinza">
        <div className="limite">
          <div className="cabecalho-secao cabecalho-centralizado">
            <div>
              <span className="rotulo-secao">EXPLORE O PORTAL</span>
              <h2>Encontre rapidamente o que procura</h2>
              <p>Cada assunto agora possui sua própria página, com espaço para crescer.</p>
            </div>
          </div>
          <div className="grade-areas-portal">
            {/* cria um cartão para cada área */}
            {areasPortal.map((area) => (
              <Link href={area.destino} className="cartao-area" key={area.titulo}>
                <span>{area.numero}</span>
                <h3>{area.titulo}</h3>
                <p>{area.texto}</p>
                <b>Entrar nesta área ›</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* notícias em destaque */}
      <NoticiasInicio />

      {/* agenda resumida */}
      <AgendaInicio />

      {/* convite final */}
      <section className="limite convite-participacao">
        <img src="/logo-gecep-com-texto.png" alt="GECEP — Grêmio Estudantil do Colégio Estadual do Paraná" />
        <div>
          <span className="rotulo-secao">SUA VOZ IMPORTA</span>
          <h2>O GECEP é feito com a participação dos estudantes</h2>
          <p>
            Envie uma demanda da turma, proponha um projeto ou compartilhe uma sugestão para o
            colégio.
          </p>
        </div>
        <Link className="botao-primario" href="/sugestoes">
          Quero participar
        </Link>
      </section>

      {/* links rápidos do final da tela */}
      <section className="acesso-rapido" aria-labelledby="titulo-acesso-rapido">
        <div className="limite">
          <h2 id="titulo-acesso-rapido">Acesso Rápido</h2>
          <div className="links-acesso-rapido">
            <Link href="/estatuto">§ Estatuto do GECEP</Link>
            <Link href="/transparencia">ⓘ Transparência</Link>
            <Link href="/crt">◎ Representação de turma</Link>
            <Link href="/contato">✉ Fale com o GECEP</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
