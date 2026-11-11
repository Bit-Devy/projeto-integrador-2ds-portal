"use client";

// mostra o mesmo mês para o estudante e para quem organiza os dias no painel
import { diaDaSemana, formatarDia, hojeNoParana } from "../servicos/calendario";
import { tiposDia, type DiaEscolar } from "../servicos/tipos";

export default function GradeMesEscolar({ anoLimite, mes, dias, selecionados = [], contagens = {}, selecionar, mudarMes }: { anoLimite?: number; mes: string; dias: DiaEscolar[]; selecionados?: string[]; contagens?: Record<string, number>; selecionar: (data: string) => void; mudarMes: (mes: string) => void }) {
  const primeiro = `${mes}-01`;
  const total = new Date(`${primeiro}T12:00:00Z`); total.setUTCMonth(total.getUTCMonth() + 1, 0);
  const datas = Array.from({ length: total.getUTCDate() }, (_, indice) => `${mes}-${String(indice + 1).padStart(2, "0")}`);
  function mover(direcao: number) { const data = new Date(`${primeiro}T12:00:00Z`); data.setUTCMonth(data.getUTCMonth() + direcao); mudarMes(data.toISOString().slice(0, 7)); }
  return <div className="mes-escolar">
    <div className="mes-escolar-topo"><button type="button" aria-label="Mês anterior" disabled={Boolean(anoLimite && mes === `${anoLimite}-01`)} onClick={() => mover(-1)}>‹</button><h2>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${primeiro}T12:00:00Z`))}</h2><button type="button" aria-label="Próximo mês" disabled={Boolean(anoLimite && mes === `${anoLimite}-12`)} onClick={() => mover(1)}>›</button></div>
    <div className="semana-escolar">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((nome) => <span key={nome}>{nome}</span>)}</div>
    <div className="grade-mes-escolar">
      {Array.from({ length: diaDaSemana(primeiro) }, (_, indice) => <span key={`vazio-${indice}`} />)}
      {datas.map((data) => { const dia = dias.find((item) => item.data === data); return <button type="button" key={data} className={`tipo-dia-${dia?.tipo || "sem_aula"} ${dia?.letivo ? "conta-aula" : ""} ${data === hojeNoParana() ? "dia-hoje" : ""}`} aria-pressed={selecionados.includes(data)} aria-label={`${formatarDia(data)}, ${dia ? tiposDia[dia.tipo] : "sem calendário escolar"}${dia?.letivo ? ", com aulas" : ""}${contagens[data] ? `, ${contagens[data]} compromissos` : ""}`} onClick={() => selecionar(data)}><span>{Number(data.slice(-2))}</span>{contagens[data] ? <b className="ponto-agenda" aria-hidden="true">{contagens[data]}</b> : <small aria-hidden="true">{dia?.letivo ? "aula" : dia?.tipo === "feriado" ? "feriado" : ""}</small>}</button>; })}
    </div>
  </div>;
}

// mantém as cores acompanhadas de nomes para não depender apenas da visão
export function LegendaCalendario() { return <div className="legenda-escolar">{Object.entries(tiposDia).map(([chave, nome]) => <span key={chave}><i className={`tipo-dia-${chave}`} />{nome}</span>)}</div>; }
