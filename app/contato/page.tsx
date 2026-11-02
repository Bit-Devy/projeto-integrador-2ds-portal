// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";
// importa os atalhos de atendimento
import CanaisContato from "../componentes/CanaisContato";

// define os dados da página de contato
export const metadata: Metadata = { title: "Fale com o GECEP", description: "Canais de contato do Grêmio Estudantil do CEP." };

// monta a página de contato
export default function PaginaContato() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Fale com o GECEP" resumo="Encontre os canais de atendimento e envie uma mensagem diretamente à representação estudantil." caminho="Participe / Contato" />
      {/* canais de contato com os destinos publicados pela gestão */}
      <section className="limite pagina-conteudo">
        {/* cartões dos canais de atendimento */}
        <CanaisContato />
      </section>

      {/* dúvidas comuns sobre o contato */}
      <section className="secao-cinza"><div className="limite"><div className="cabecalho-secao"><div><span className="rotulo-secao">DÚVIDAS FREQUENTES</span><h2>Antes de entrar em contato</h2></div></div><div className="grade-faq"><details><summary>O GECEP pode resolver qualquer problema?</summary><p>O grêmio representa e encaminha demandas estudantis, mas algumas situações dependem da direção, equipe pedagógica, secretaria ou outros setores.</p></details><details><summary>Posso enviar uma mensagem sem expor meu nome?</summary><p>Sim. Marque a opção de identidade preservada e confirme o aviso. Nome, turma e contato não serão enviados. Sua mensagem será considerada, mas não poderemos enviar uma resposta.</p></details><details><summary>Como acompanho uma demanda da minha turma?</summary><p>Demandas coletivas podem ser levadas ao representante de turma e acompanhadas nas reuniões do CRT.</p></details><details><summary>Onde encontro documentos e decisões?</summary><p>O arquivo público reúne Estatuto, atas, planos e relatórios conforme forem publicados.</p></details></div></div></section>
    </main>
  );
}
