// ativa recursos do navegador
"use client";

// importa os eventos de exemplo
import { eventosDemonstrativos } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";

// mostra a lista completa de eventos
export default function ListaEventosCompleta() {
  // busca os eventos publicados
  const { dados: eventos } = useConteudoPublico("eventos", eventosDemonstrativos);

  // mostra o aviso quando não há eventos
  if (!eventos.length) return <p className="sem-resultados">Nenhum evento publicado no momento.</p>;

  return (
    <div className="lista-eventos-completa">
      {/* cartões dos eventos */}
      {eventos.map((evento) => {
        /* separa as partes da data */
        const [ano, mes, dia] = evento.data.split("-");
        return (
          <article key={`${evento.data}-${evento.titulo}`}>
            <time><strong>{dia}</strong><span>{mes}/{ano.slice(2)}</span></time>
            <div>
              <small>{evento.categoria}</small>
              <h3>{evento.titulo}</h3>
              <p>{evento.descricao}</p>
              <b>{evento.horario} · {evento.local}</b>
              {evento.linkInscricao && <a className="link-evento" href={evento.linkInscricao} target="_blank" rel="noreferrer">Inscrição ou mais informações ›</a>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
