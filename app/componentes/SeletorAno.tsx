"use client";

// importa os anos disponíveis no histórico
import { anosDisponiveis } from "../conteudo/periodos";

// permite trocar o período sem excluir as publicações anteriores
export default function SeletorAno({ id, ano, datas, alterar }: { id: string; ano: string; datas: string[]; alterar: (ano: string) => void }) {
  const numero = Number(ano);
  return <nav className="seletor-ano" aria-label="Período das publicações">
    <button type="button" disabled={ano === "todos" || numero <= 1900} onClick={() => alterar(String(numero - 1))}>‹ Ano anterior</button>
    <label htmlFor={id}>Ano<select id={id} value={ano} onChange={(evento) => alterar(evento.target.value)}>
      <option value="todos">Todos os anos</option>
      {anosDisponiveis(datas, ano).map((valor) => <option key={valor} value={valor}>{valor}</option>)}
    </select></label>
    <button type="button" disabled={ano === "todos" || numero >= 2199} onClick={() => alterar(String(numero + 1))}>Próximo ano ›</button>
  </nav>;
}
