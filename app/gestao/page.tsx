// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa a equipe do grêmio
import EquipeGecep from "../componentes/EquipeGecep";

// define os dados da página da gestão
export const metadata: Metadata = {
  title: "Gestão atual | GECEP",
  description: "Organização e áreas de trabalho da gestão do GECEP.",
};

// reúne as áreas de responsabilidade
const areas = [
  ["Presidência", "Coordenação geral, representação institucional e acompanhamento do plano de ação."],
  ["Vice-presidência", "Apoio à coordenação e integração entre as diferentes áreas da gestão."],
  ["Secretaria", "Organização de atas, documentos, reuniões e registros oficiais."],
  ["Tesouraria", "Controle financeiro, comprovantes e produção das prestações de contas."],
  ["Comunicação", "Divulgação de decisões, eventos, oportunidades e canais de participação."],
  ["Projetos e mobilização", "Planejamento de ações culturais, sociais, esportivas e educacionais."],
];

// monta a página da gestão
export default function PaginaGestao() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Gestão atual" resumo="Conheça a organização da diretoria, suas áreas de trabalho e os compromissos assumidos com os estudantes." caminho="O GECEP / Gestão atual" />

      {/* integrantes e áreas da gestão */}
      <section className="limite pagina-conteudo">
        <div className="cabecalho-secao"><div><span className="rotulo-secao">QUEM REPRESENTA OS ESTUDANTES</span><h2>Integrantes da gestão</h2><p>A composição é atualizada pelo próprio GECEP, com cargo, área, turma e apresentação.</p></div></div>
        <EquipeGecep />

        <div className="cabecalho-secao cabecalho-com-margem"><div><span className="rotulo-secao">ESTRUTURA DA DIRETORIA</span><h2>Áreas de responsabilidade</h2><p>O portal organiza as funções em blocos claros para facilitar o contato e a prestação de contas.</p></div></div>
        <div className="grade-cargos">
          {/* cria um cartão para cada área */}
          {areas.map(([titulo, texto], indice) => (
            <article key={titulo}><span>{String(indice + 1).padStart(2, "0")}</span><h3>{titulo}</h3><p>{texto}</p><small>Integrantes a publicar</small></article>
          ))}
        </div>
      </section>

      {/* exemplos de metas da gestão */}
      <section className="secao-cinza">
        <div className="limite grade-duas-colunas">
          <div><span className="rotulo-secao">PLANO DE AÇÃO</span><h2>Metas que podem ser acompanhadas</h2><p>A página está preparada para mostrar cada compromisso da gestão, seu responsável, prazo e situação.</p></div>
          <div className="lista-metas-exemplo">
            <article><span>Planejada</span><strong>Meta da gestão</strong><small>Descrição, prazo e responsável serão adicionados aqui.</small></article>
            <article><span>Em andamento</span><strong>Projeto acompanhado</strong><small>Atualizações periódicas poderão ser publicadas nesta área.</small></article>
            <article><span>Concluída</span><strong>Resultado entregue</strong><small>Registro final e documentos relacionados ficarão disponíveis.</small></article>
          </div>
        </div>
      </section>

      {/* botão para falar com a gestão */}
      <section className="limite chamada-interna"><div><span className="rotulo-secao">FALE COM A GESTÃO</span><h2>Tem uma demanda para uma área específica?</h2><p>Use o canal de participação para registrar a mensagem e permitir seu acompanhamento.</p></div><Link className="botao-primario" href="/sugestoes">Enviar uma demanda</Link></section>
    </main>
  );
}
