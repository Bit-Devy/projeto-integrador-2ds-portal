// ativa recursos do navegador
"use client";

// importa o controle de estados
import { useState } from "react";
// importa os eventos de exemplo
import { eventosDemonstrativos } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";

// guarda os nomes dos meses
const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// monta os quadrados do calendário
function criarDias(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const dias: Array<number | null> = Array(primeiroDia).fill(null);

  for (let dia = 1; dia <= totalDias; dia += 1) dias.push(dia);
  return dias;
}

// mostra o calendário com eventos
export default function CalendarioInterativo() {
  // busca os eventos publicados
  const { dados: eventos } = useConteudoPublico("eventos", eventosDemonstrativos);
  // guarda o mês mostrado
  const [mes, setMes] = useState(7);
  // guarda o ano mostrado
  const [ano, setAno] = useState(2026);
  // guarda o evento selecionado
  const [eventoEscolhido, setEventoEscolhido] = useState("");
  // encontra os detalhes do evento selecionado
  const eventoAtual = eventos.find((evento) => `${evento.data}-${evento.titulo}` === eventoEscolhido) ?? eventos[0];

  // troca o mês
  function mudarMes(direcao: number) {
    let novoMes = mes + direcao;
    let novoAno = ano;

    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    }
    if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }

    setMes(novoMes);
    setAno(novoAno);
  }

  return (
    <>
      {/* aviso de dados demonstrativos */}
      {eventos.some((evento) => evento.exemplo) && <div className="aviso-informativo"><strong>Agenda demonstrativa</strong><p>Os registros marcados nesta primeira carga servem como exemplo. A gestão pode apagá-los e publicar a agenda oficial pelo painel.</p></div>}
      <div className="grade-calendario-pagina">
        {/* calendário com os dias do mês */}
        <div className="calendario">
          {/* botões para trocar o mês */}
          <div className="topo-calendario">
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
              ‹
            </button>
            <h2>{nomesMeses[mes]} {ano}</h2>
            <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês">
              ›
            </button>
          </div>
          {/* nomes dos dias da semana */}
          <div className="dias-semana" aria-hidden="true">
            <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
          </div>
          {/* botões de cada dia */}
          <div className="dias-calendario">
            {criarDias(ano, mes).map((dia, indice) => {
              if (dia === null) return <span className="dia-vazio" key={`vazio-${indice}`} />;

              /* monta a data do dia */
              const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              /* procura um evento neste dia */
              const eventoDoDia = eventos.find((evento) => evento.data === data);

              return (
                <button
                  type="button"
                  key={data}
                  className={eventoDoDia ? "dia-com-evento" : ""}
                  onClick={() => eventoDoDia && setEventoEscolhido(`${eventoDoDia.data}-${eventoDoDia.titulo}`)}
                  disabled={!eventoDoDia}
                  aria-label={eventoDoDia ? `${dia} de ${nomesMeses[mes]}: ${eventoDoDia.titulo}` : `${dia} de ${nomesMeses[mes]}`}
                >
                  {dia}
                  {eventoDoDia && <span aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* detalhes do evento selecionado */}
        {eventoAtual ? <article className="detalhes-evento" aria-live="polite">
          <span className="etiqueta-evento">EVENTO SELECIONADO</span>
          <h2>{eventoAtual.titulo}</h2>
          <span className="categoria-evento">{eventoAtual.categoria}</span>
          <dl>
            <div><dt>Data</dt><dd>{eventoAtual.data.split("-").reverse().join("/")}</dd></div>
            <div><dt>Horário</dt><dd>{eventoAtual.horario}</dd></div>
            <div><dt>Local</dt><dd>{eventoAtual.local}</dd></div>
          </dl>
          <p>{eventoAtual.descricao}</p>
          <a href="/contato">Tirar uma dúvida sobre o evento ›</a>
        </article> : <article className="detalhes-evento"><span className="etiqueta-evento">AGENDA</span><h2>Nenhum evento publicado</h2><p>A gestão ainda não adicionou atividades a este calendário.</p></article>}
      </div>
    </>
  );
}
