// importa o tipo dos dados da página
import type { Metadata } from "next";
// importa os links entre páginas
import Link from "next/link";
// importa o cabeçalho da página
import CabecalhoPagina from "../componentes/CabecalhoPagina";

// define os dados da página do conselho
export const metadata: Metadata = {
  title: "CRT | Conselho de Representação de Turma",
  description: "Entenda o funcionamento do CRT, braço de representação das turmas no GECEP.",
};

// monta a página do conselho
export default function PaginaCrt() {
  return (
    <main id="conteudo">
      {/* cabeçalho da página */}
      <CabecalhoPagina titulo="Conselho de Representação de Turma" resumo="O CRT conecta cada sala ao GECEP e transforma demandas coletivas em diálogo, encaminhamento e acompanhamento." caminho="Representação / CRT" />

      {/* apresentação do conselho */}
      <section className="limite pagina-conteudo grade-apresentacao-interna">
        <div><span className="rotulo-secao">O QUE É O CRT?</span><h2>O braço do GECEP dentro de cada turma</h2><p>Representantes são escolhidos por seus colegas e se reúnem com o grêmio para apresentar necessidades, sugestões e posições das salas.</p><p>Esse processo ajuda a evitar que as decisões fiquem concentradas em poucas pessoas e cria um caminho permanente de escuta dos diferentes turnos, séries e cursos do CEP.</p></div>
        <div className="quadro-destaque"><strong>Representar não é decidir sozinho.</strong><p>O representante escuta a turma, leva as pautas ao CRT, retorna com informações e acompanha os encaminhamentos.</p></div>
      </section>

      {/* etapas de uma demanda da turma */}
      <section className="secao-azul-interna">
        <div className="limite"><div className="cabecalho-secao cabecalho-claro"><div><span className="rotulo-secao">COMO FUNCIONA</span><h2>Da sala ao encaminhamento</h2></div></div><div className="fluxo-crt"><article><span>1</span><h3>Escuta da turma</h3><p>Os estudantes discutem a situação e organizam a demanda.</p></article><article><span>2</span><h3>Reunião do CRT</h3><p>Representantes apresentam pautas, trocam informações e deliberam.</p></article><article><span>3</span><h3>Encaminhamento</h3><p>O GECEP registra a decisão e procura os setores responsáveis.</p></article><article><span>4</span><h3>Devolutiva</h3><p>A turma recebe atualizações e acompanha o resultado.</p></article></div></div>
      </section>

      {/* lista dos representantes */}
      <section className="limite secao-padrao" id="representantes">
        <div className="cabecalho-secao"><div><span className="rotulo-secao">REPRESENTANTES</span><h2>Lista por turma</h2><p>Este espaço receberá a relação atualizada de representantes e suplentes.</p></div></div>
        <div className="caixa-vazia"><span>CRT</span><div><strong>Relação em preparação</strong><p>A lista poderá ser organizada por turno, série, curso e turma, com atualização feita pela gestão.</p></div></div>
      </section>

      {/* explicação das assembleias */}
      <section className="secao-cinza" id="assembleias"><div className="limite grade-duas-colunas"><div><span className="rotulo-secao">ASSEMBLEIAS</span><h2>Decisões coletivas dos estudantes</h2><p>As assembleias gerais permitem discutir temas amplos e deliberar conforme as regras previstas no Estatuto.</p><Link className="link-seta" href="/documentos#atas">Consultar atas publicadas ›</Link></div><div className="lista-simples"><p><strong>Convocação:</strong> data, horário, local e pauta devem ser divulgados.</p><p><strong>Participação:</strong> estudantes podem acompanhar, debater e votar conforme a convocação.</p><p><strong>Registro:</strong> decisões devem ser documentadas em ata e disponibilizadas para consulta.</p></div></div></section>

      {/* botão para enviar uma demanda */}
      <section className="limite chamada-interna"><div><span className="rotulo-secao">SUA TURMA TEM UMA PAUTA?</span><h2>Registre uma demanda para o CRT</h2><p>Envie o assunto com contexto suficiente para que os representantes possam analisar e encaminhar.</p></div><Link className="botao-primario" href="/sugestoes">Enviar demanda da turma</Link></section>
    </main>
  );
}
