"use client";

// mostra o histórico sem alterar o cadastro da turma ou os mandatos
import type { HistoricoTurma } from "../mapa/tipos";
import { nomesTurnos } from "../mapa/tipos";
import { useConsultaPublica } from "../eventos/useConsultaPublica";
import { formatarDataHora } from "../eventos/modelo-publico";
import { dataLegivel } from "./painel-eventos-comum";
import { EstadoCarregando, EstadoErro } from "./EstadoConsultaPublica";

const funcoes: Record<string, string> = { titular: "Titular", vice: "Vice-representante", suplente: "Suplente", outra: "Outra função" };

export default function HistoricoTurmaPainel({ id }: { id: string | number }) {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<HistoricoTurma>(`/api/mapa?historico=${encodeURIComponent(String(id))}`);
  if (carregando) return <EstadoCarregando texto="Consultando o histórico da turma…" />;
  if (erro) return <EstadoErro mensagem={erro} tentarNovamente={recarregar} />;
  if (!dados) return null;
  const { turma, salas, representantes } = dados;
  return <div className="historico-turma">
    {(turma.turnoParcial || turma.descricao || turma.observacoes) && <div className="resumo-historico-turma">
      {turma.turnoParcial && <p><strong>Turno parcial</strong> · {turma.horarioInicial} às {turma.horarioFinal}</p>}
      {turma.descricao && <p>{turma.descricao}</p>}
      {turma.observacoes && <p>{turma.observacoes}</p>}
    </div>}
    <section>
      <h3>Mandatos dos representantes</h3>
      {!representantes.length && <p>Nenhum representante foi vinculado a esta turma.</p>}
      <ul>{representantes.map((item) => <li key={item.id}>
        <strong>{item.nome}</strong>
        <span>{funcoes[item.funcao] || item.funcao} · {item.ano}{item.ativo ? " · Ativo" : " · Encerrado"}</span>
        <span>{item.inicioMandato ? `De ${dataLegivel(item.inicioMandato)}` : "Início não informado"}{item.fimMandato ? ` até ${dataLegivel(item.fimMandato)}` : item.arquivadoEm ? ` · Arquivado em ${formatarDataHora(item.arquivadoEm)}` : " · Fim não informado"}</span>
      </li>)}</ul>
    </section>
    <section>
      <h3>Salas vinculadas</h3>
      {!salas.length && <p>Nenhuma sala foi vinculada a esta turma.</p>}
      <ul>{salas.map((item, indice) => <li key={`${item.sala}-${item.vinculadoEm}-${indice}`}>
        <strong>{item.sala}</strong><span>{nomesTurnos[item.turno]} · {item.encerradoEm ? "Vínculo encerrado" : "Vínculo atual"}</span>
        <span>Registrado em {formatarDataHora(item.vinculadoEm)}{item.encerradoEm && ` · Encerrado em ${formatarDataHora(item.encerradoEm)}`}</span>
      </li>)}</ul>
    </section>
  </div>;
}
