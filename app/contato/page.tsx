// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa o formulário de contato
import FormularioParticipacao from "../componentes/FormularioParticipacao";

// define os dados da página de contato
export const metadata: Metadata = { title: "Fale com o GECEP", description: "Canais de contato do Grêmio Estudantil do CEP." };

// monta a página de contato
export default function PaginaContato() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Fale com o GECEP" resumo="Encontre os canais de atendimento e envie uma mensagem diretamente à representação estudantil." caminho="Participe / Contato" />
      {/* canais e formulário de contato */}
      <section className="limite pagina-conteudo">
        {/* cartões dos canais de atendimento */}
        <div className="grade-canais-contato"><article><span>⌂</span><h2>Atendimento presencial</h2><p>Sala do GECEP, dentro do Colégio Estadual do Paraná.</p><small>Horários serão publicados pela gestão.</small></article><article><span>◎</span><h2>Instagram</h2><p>Notícias, avisos e atualizações rápidas do grêmio.</p><a href="https://www.instagram.com/gecep_oficial/" target="_blank" rel="noreferrer">@gecep_oficial ↗</a></article><article><span>✉</span><h2>Mensagem pelo portal</h2><p>Canal para dúvidas, propostas e demandas que precisam de registro.</p><small>As mensagens ficam organizadas para análise da gestão.</small></article></div>

        {/* orientações e envio da mensagem */}
        <div className="grade-formulario-contato"><div><span className="rotulo-secao">MENSAGEM</span><h2>Como podemos ajudar?</h2><p>Escolha o assunto, explique a situação e informe sua turma para facilitar o encaminhamento.</p><div className="lista-simples"><p><strong>Assuntos urgentes:</strong> procure também um adulto responsável ou setor competente do colégio.</p><p><strong>Questões pedagógicas:</strong> podem precisar de encaminhamento para a equipe pedagógica ou direção auxiliar.</p><p><strong>Acompanhamento:</strong> o protocolo confirma o recebimento e ajuda a identificar a mensagem.</p></div></div><FormularioParticipacao modo="contato" /></div>
      </section>

      {/* dúvidas comuns sobre o contato */}
      <section className="secao-cinza"><div className="limite"><div className="cabecalho-secao"><div><span className="rotulo-secao">DÚVIDAS FREQUENTES</span><h2>Antes de entrar em contato</h2></div></div><div className="grade-faq"><details><summary>O GECEP pode resolver qualquer problema?</summary><p>O grêmio representa e encaminha demandas estudantis, mas algumas situações dependem da direção, equipe pedagógica, secretaria ou outros setores.</p></details><details><summary>Posso enviar uma mensagem sem expor meu nome?</summary><p>Sim. Marque a opção de identidade preservada. A gestão verá essa indicação e deverá restringir o uso dos seus dados pessoais.</p></details><details><summary>Como acompanho uma demanda da minha turma?</summary><p>Demandas coletivas podem ser levadas ao representante de turma e acompanhadas nas reuniões do CRT.</p></details><details><summary>Onde encontro documentos e decisões?</summary><p>O arquivo público reúne Estatuto, atas, planos e relatórios conforme forem publicados.</p></details></div></div></section>
    </main>
  );
}
