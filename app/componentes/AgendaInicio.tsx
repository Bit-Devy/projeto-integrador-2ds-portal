"use client";

import Link from "next/link";
import type { CentralEventos } from "../eventos/tipos";
import { formatarData } from "../eventos/modelo-publico";
import { useConsultaPublica } from "../eventos/useConsultaPublica";

// mostra os próximos eventos na tela inicial
export default function AgendaInicio() {
  // busca somente registros publicados na nova central
  const { dados, carregando, erro } = useConsultaPublica<CentralEventos>("/api/eventos?central=1");
  // separa os três primeiros eventos
  const eventos = dados?.proximosEventos.slice(0, 3) ?? [];

  return (
    <section className="secao-agenda-inicial">
      <div className="limite grade-agenda-inicial">
        {/* título e botão da agenda */}
        <div className="agenda-inicial-titulo">
          <span className="rotulo-secao">DATAS MAIS RECENTES</span>
          <h2>Acompanhe a agenda estudantil</h2>
          <p>
            A central reúne atividades, interclasses, partidas, reuniões e atas publicadas pela
            gestão.
          </p>
          <Link className="botao-claro" href="/eventos">
            Abrir central de eventos
          </Link>
        </div>
        {/* lista dos eventos mais recentes */}
        <div className="lista-eventos-inicial">
          {carregando ? (
            <p className="agenda-vazia" role="status">
              Carregando próximos eventos…
            </p>
          ) : erro ? (
            <p className="agenda-vazia">A agenda está temporariamente indisponível.</p>
          ) : eventos.length ? (
            eventos.map((evento) => {
              /* separa as partes da data */
              const [, mes = "", dia = ""] = evento.dataInicial.split("-");
              return (
                <Link
                  href={`/eventos/internos/${encodeURIComponent(evento.slug)}`}
                  className="evento-inicial"
                  key={evento.id}
                >
                  <span className="data-evento">
                    <strong>{dia || "—"}</strong>
                    <small>{mes || "Data"}</small>
                  </span>
                  <span>
                    <small>{evento.categoria || "Evento"}</small>
                    <strong>{evento.titulo}</strong>
                    <b>
                      {[formatarData(evento.dataInicial), evento.horario, evento.local]
                        .filter(Boolean)
                        .join(" · ")}
                    </b>
                  </span>
                  <i aria-hidden="true">›</i>
                </Link>
              );
            })
          ) : (
            <p className="agenda-vazia">Nenhuma atividade publicada.</p>
          )}
        </div>
      </div>
    </section>
  );
}
