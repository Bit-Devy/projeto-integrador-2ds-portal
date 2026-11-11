"use client";

// combina a agenda publicada com os dias escolares de cada modalidade
import { useState } from "react";
import Link from "next/link";
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
import { anoDoPortal, anosDisponiveis } from "../conteudo/periodos";
import { formatarDia, hojeNoParana } from "../servicos/calendario";
import { modalidades, tiposDia, type CalendarioEscolar, type ModalidadeCalendario } from "../servicos/tipos";
import GradeMesEscolar, { LegendaCalendario } from "./GradeMesEscolar";
import CalculadoraFaltas from "./CalculadoraFaltas";

export default function CalendarioPortal({ calendarios }: { calendarios: CalendarioEscolar[] }) {
  const { dados: agenda, erro, carregando } = useConteudoPublico("agenda", []);
  const [ano, setAno] = useState(anoDoPortal());
  const [modalidade, setModalidade] = useState<ModalidadeCalendario>("anual");
  const [mes, setMes] = useState(hojeNoParana().slice(0, 7));
  const [dia, setDia] = useState(hojeNoParana());
  const calendario = calendarios.find((item) => item.ano === ano && item.modalidade === modalidade);
  const compromissos = agenda.filter((item) => item.modalidade === "ambos" || item.modalidade === modalidade);
  const doDia = compromissos.filter((item) => item.data <= dia && (item.dataFim || item.data) >= dia);
  const diaEscolar = calendario?.dias.find((item) => item.data === dia);
  const contagens: Record<string, number> = {};
  for (let numero = 1; numero <= 31; numero += 1) { const data = `${mes}-${String(numero).padStart(2, "0")}`; contagens[data] = compromissos.filter((item) => item.data <= data && (item.dataFim || item.data) >= data).length; }
  const doMes = compromissos.filter((item) => item.data.slice(0, 7) <= mes && (item.dataFim || item.data).slice(0, 7) >= mes).sort((a, b) => a.data.localeCompare(b.data));
  function mudarAno(valor: number) { if (!Number.isInteger(valor) || valor < 1900 || valor > 2199) return; setAno(valor); setMes(`${valor}-${mes.slice(-2)}`); setDia(`${valor}-${mes.slice(-2)}-01`); }
  return <div className="limite pagina-conteudo servicos-portal">
    <nav className="atalhos-servicos" aria-label="Nesta página"><a href="#agenda">Agenda e calendário escolar <span>↗</span></a><a href="#calculadora">Calculadora de faltas <span>↓</span></a></nav>
    <section id="agenda" className="servico-bloco">
      <div className="topo-servico"><div><span className="rotulo-secao">DATAS QUE IMPORTAM</span><h2>Agenda e calendário escolar</h2></div><details className="ano-servico"><summary>Ano: {ano}</summary><label>Escolher ano<select aria-label="Ano do calendário" value={ano} onChange={(evento) => mudarAno(Number(evento.target.value))}>{anosDisponiveis([...calendarios.map((item) => `${item.ano}-01-01`), ...agenda.map((item) => item.data)], String(ano)).map((item) => <option key={item}>{item}</option>)}</select></label></details></div>
      <div className="abas-servicos" role="group" aria-label="Tipo de calendário">{modalidades.map((item) => <button type="button" key={item.valor} aria-pressed={modalidade === item.valor} onClick={() => setModalidade(item.valor)}>{item.nome}</button>)}</div>
      {erro && <p role="alert" className="erro-painel">{erro}</p>}
      <div className="calendario-com-detalhes"><div><GradeMesEscolar mes={mes} dias={calendario?.dias || []} selecionados={[dia]} contagens={contagens} selecionar={setDia} mudarMes={(valor) => { setMes(valor); setAno(Number(valor.slice(0, 4))); setDia(`${valor}-01`); }} /><LegendaCalendario /></div><aside className="detalhes-dia"><span className="rotulo-secao">DIA SELECIONADO</span><h3>{formatarDia(dia)}</h3>{diaEscolar && <p><strong>{tiposDia[diaEscolar.tipo]}</strong>{diaEscolar.descricao ? ` · ${diaEscolar.descricao}` : ""}{diaEscolar.tipo === "conselho" ? diaEscolar.letivo ? " · com aulas" : " · sem aulas" : ""}</p>}{!calendario && <p>Calendário escolar ainda não publicado para este ano e modalidade.</p>}{carregando && <p role="status">Carregando agenda…</p>}{doDia.length ? doDia.map((item) => <article className="compromisso-dia" key={item.id}><small>{item.horario || "Dia todo"}</small><h4>{item.titulo}</h4><p>{item.descricao}</p>{item.paginaUrl && <Link href={item.paginaUrl}>Ver publicação relacionada ›</Link>}</article>) : !carregando && <p>Nenhum compromisso publicado para este dia.</p>}</aside></div>
      <div className="agenda-mes"><h3>Compromissos deste mês</h3>{!carregando && !doMes.length && <p>Nenhum compromisso publicado neste mês.</p>}{doMes.map((item) => <article key={item.id}><div><small>{formatarDia(item.data)}{item.dataFim && item.dataFim !== item.data ? ` a ${formatarDia(item.dataFim)}` : ""}{item.horario ? ` · ${item.horario}` : ""}</small><h4>{item.titulo}</h4><p>{item.descricao}</p></div>{item.paginaUrl && <Link className="botao-secundario" href={item.paginaUrl}>Saiba mais ›</Link>}</article>)}</div>
    </section>
    <CalculadoraFaltas key={`${ano}-${modalidade}`} calendario={calendario} />
  </div>;
}
