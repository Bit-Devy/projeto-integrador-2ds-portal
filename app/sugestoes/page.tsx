// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa o formulário de participação
import FormularioParticipacao from "../componentes/FormularioParticipacao";

// define os dados da página de sugestões
export const metadata: Metadata = { title: "Sugestões e participação | GECEP", description: "Envie sugestões, demandas e propostas de projeto ao GECEP." };

// monta a página de sugestões
export default function PaginaSugestoes() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Sugestões e participação" resumo="Envie uma demanda da turma, proponha um projeto ou compartilhe uma ideia para melhorar a vida estudantil no CEP." caminho="Participe / Sugestões" />
      {/* orientações e formulário de participação */}
      <section className="limite pagina-conteudo grade-formulario-pagina">
        <div className="orientacoes-formulario"><span className="rotulo-secao">ANTES DE ENVIAR</span><h2>Ajude o GECEP a entender sua proposta</h2><p>Uma mensagem com contexto facilita a análise e aumenta as chances de um bom encaminhamento.</p><ol><li><span>1</span><div><strong>Explique a situação</strong><p>Conte o que acontece, quem é afetado e por que o assunto é importante.</p></div></li><li><span>2</span><div><strong>Indique o objetivo</strong><p>Diga o que você gostaria que mudasse ou fosse construído.</p></div></li><li><span>3</span><div><strong>Compartilhe possibilidades</strong><p>Se já tiver uma ideia de solução, responsáveis ou prazo, inclua na mensagem.</p></div></li></ol><div className="nota-privacidade"><strong>Privacidade</strong><p>Quando a opção de identidade preservada estiver marcada, os dados pessoais não devem ser divulgados fora da equipe responsável pela análise.</p></div></div>
        <div><div className="cabecalho-secao"><div><span className="rotulo-secao">FORMULÁRIO</span><h2>Envie sua participação</h2></div></div><FormularioParticipacao /></div>
      </section>

      {/* tipos de participação aceitos */}
      <section className="secao-cinza" id="projeto"><div className="limite"><div className="cabecalho-secao cabecalho-centralizado"><div><span className="rotulo-secao">O QUE VOCÊ PODE ENVIAR?</span><h2>Vários caminhos de participação</h2></div></div><div className="grade-participacao"><article><span>✦</span><h3>Sugestão</h3><p>Uma melhoria, atividade ou mudança para o cotidiano dos estudantes.</p></article><article><span>◎</span><h3>Demanda da turma</h3><p>Uma pauta discutida coletivamente que precisa ser encaminhada.</p></article><article><span>+</span><h3>Projeto</h3><p>Uma proposta cultural, social, esportiva, ambiental ou educacional.</p></article><article><span>!</span><h3>Relato</h3><p>Uma situação que precisa de escuta, orientação ou encaminhamento responsável.</p></article></div></div></section>
    </main>
  );
}
