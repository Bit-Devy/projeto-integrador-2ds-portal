"use client";

// calcula as duas consultas sem enviar dados pessoais ao servidor
import { useState, type FormEvent } from "react";
import { calcularFaltas, formatarDia, hojeNoParana, margemFaltas, preverAusencias } from "../servicos/calendario";
import type { CalendarioEscolar } from "../servicos/tipos";

export default function CalculadoraFaltas({ calendario }: { calendario?: CalendarioEscolar }) {
  const [modo, setModo] = useState("periodo");
  const [aulasTexto, setAulas] = useState("6");
  const aulas = Number(aulasTexto);
  const [ajustar, setAjustar] = useState(false);
  const [inicio, setInicio] = useState(""); const [fim, setFim] = useState("");
  const [faltasTexto, setFaltas] = useState("");
  const faltas = Number(faltasTexto);
  const [previsao, setPrevisao] = useState("");
  const [semestre, setSemestre] = useState(hojeNoParana() >= (calendario?.inicioSegundoSemestre || "") ? "2" : "1");
  const [resultado, setResultado] = useState(""); const [erro, setErro] = useState("");
  const inicioPeriodo = !calendario ? "" : calendario.modalidade === "semestral" && semestre === "2" ? calendario.inicioSegundoSemestre : `${calendario.ano}-01-01`;
  const fimPeriodo = !calendario ? "" : calendario.modalidade === "semestral" && semestre === "1" ? new Date(Date.parse(`${calendario.inicioSegundoSemestre}T12:00:00Z`) - 86400000).toISOString().slice(0, 10) : `${calendario.ano}-12-31`;
  const letivos = calendario?.dias.filter((dia) => dia.letivo && dia.data >= inicioPeriodo && dia.data <= fimPeriodo) || [];
  function calcular(evento: FormEvent) {
    evento.preventDefault(); setErro(""); setResultado(""); setPrevisao("");
    if (!calendario) return;
    try {
      if (!letivos.length) throw new Error("Este período ainda não tem dias letivos cadastrados.");
      if (modo === "periodo") { const total = calcularFaltas(calendario, inicio, fim, aulas); setResultado(`${total.dias} dia${total.dias === 1 ? "" : "s"} letivo${total.dias === 1 ? "" : "s"} no intervalo: ${total.aulas} faltas em aulas, considerando ausência em todas as ${aulas} aulas de cada dia.`); }
      else { if (!faltasTexto.trim()) throw new Error("Informe quantas faltas em aulas você já tem."); const total = margemFaltas(calendario, faltas, inicioPeriodo, fimPeriodo, aulas); const futuras = letivos.filter((dia) => dia.data >= hojeNoParana()).length * aulas; setResultado(`${total.aulas} aulas previstas no ${calendario.modalidade === "anual" ? "ano" : "semestre"}. Com frequência mínima de ${calendario.frequenciaMinima}%, o limite estimado é de ${total.limite} faltas. ${total.excedidas ? `Você ultrapassou essa estimativa em ${total.excedidas} aulas.` : `Considerando suas ${faltas} faltas, a margem estimada é de ${total.restante} aulas; até ${Math.min(total.restante, futuras)} delas ainda cabem nos dias letivos restantes.`}`);
        const simulacao = preverAusencias(calendario, total.restante, inicioPeriodo, fimPeriodo, aulas);
        // distingue os dias completos das aulas restantes e dos períodos já encerrados
        const parcial = `${simulacao.aulasParciais} aula${simulacao.aulasParciais === 1 ? "" : "s"} em ${formatarDia(simulacao.proximoDia)}`;
        const margem = !simulacao.restantes ? "não há mais dias letivos neste período" : simulacao.dias
          ? `você pode faltar a até ${simulacao.dias} dia${simulacao.dias === 1 ? " letivo completo" : "s letivos completos"}, até ${formatarDia(simulacao.ate)}${simulacao.aulasParciais ? `, e a mais ${parcial}` : ""}`
          : simulacao.aulasParciais ? `sua margem cobre apenas ${parcial}, sem completar um dia inteiro` : "não há margem para novas faltas";
        setPrevisao(`Considerando hoje, ${formatarDia(simulacao.referencia)}, suas ${faltas} faltas e o limite estimado, ${margem}. A simulação considera ausências seguidas a partir de hoje, apenas nos dias com aula do período selecionado.`);
      }
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Confira os campos."); }
  }
  return <section id="calculadora" className="servico-bloco calculadora-faltas">
    <span className="rotulo-secao">ORGANIZE SUA FREQUÊNCIA</span><h2>Calculadora de faltas</h2><p>Consulte os dias com aula e faça uma estimativa em aulas perdidas.</p>
    {!calendario ? <p className="sem-resultados">O calendário escolar deste ano e modalidade ainda não foi publicado.</p> : <>
      <div className="abas-servicos" role="group" aria-label="Forma de calcular">{[["periodo", "Faltas em um intervalo"], ["saldo", "Minha margem de faltas"]].map(([valor, nome]) => <button type="button" key={valor} aria-pressed={modo === valor} onClick={() => { setModo(valor); setResultado(""); setPrevisao(""); setErro(""); }}>{nome}</button>)}</div>
      <form className="form-servico" onSubmit={calcular} onChange={() => { setResultado(""); setPrevisao(""); setErro(""); }}>
        {calendario.modalidade === "semestral" && <label>Semestre<select value={semestre} onChange={(evento) => setSemestre(evento.target.value)}><option value="1">1º semestre</option><option value="2">2º semestre</option></select></label>}
        {modo === "periodo" ? <><label>De<input type="date" required min={inicioPeriodo} max={fimPeriodo} value={inicio} onChange={(evento) => setInicio(evento.target.value)} /></label><label>Até<input type="date" required min={inicio || inicioPeriodo} max={fimPeriodo} value={fim} onChange={(evento) => setFim(evento.target.value)} /></label></> : <label>Quantas faltas em aulas você já tem?<input type="number" min={0} max={100000} step={1} required value={faltasTexto} placeholder="Ex.: 250" onChange={(evento) => setFaltas(evento.target.value)} /></label>}
        <div className="ajuste-aulas"><span>{aulasTexto || "—"} aulas por dia</span><button className="botao-cinza-pequeno" type="button" aria-expanded={ajustar} onClick={() => setAjustar(!ajustar)}>Alterar</button>{ajustar && <label>Aulas por dia<input type="number" min={1} max={20} step={1} required value={aulasTexto} onChange={(evento) => setAulas(evento.target.value)} /></label>}</div>
        <button className="botao-primario" type="submit">Calcular faltas</button>
      </form>
      <p className="ultimo-letivo"><strong>Último dia letivo do ano:</strong> {calendario.dias.some((dia) => dia.letivo) ? formatarDia(calendario.dias.filter((dia) => dia.letivo).at(-1)!.data) : "A definir"}{calendario.modalidade === "semestral" && <><br /><strong>Último dia letivo do semestre:</strong> {letivos.length ? formatarDia(letivos.at(-1)!.data) : "A definir"}</>}</p>
      {erro && <p className="erro-painel" role="alert">{erro}</p>}{resultado && <div className="resultado-faltas" role="status"><p>{resultado}</p>{previsao && <p>{previsao}</p>}</div>}
      <p className="nota-servico">Estimativa pelo calendário publicado, considerando a mesma quantidade de aulas por dia. A frequência oficial é registrada pelo colégio e pode variar por disciplina e por atividades específicas.</p>
    </>}
  </section>;
}
