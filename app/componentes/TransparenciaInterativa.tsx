// ativa recursos do navegador
"use client";

// importa o controle de estados
import { useState } from "react";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
// mostra o exercício atual da transparência
import { anoDoPortal } from "../conteudo/periodos";

// mostra os dados de transparência
export default function TransparenciaInterativa() {
  // guarda o filtro escolhido
  const [filtro, setFiltro] = useState("todos");
  const ano = anoDoPortal();
  // busca os movimentos publicados
  const { dados: doPeriodo, carregando, erro } = useConteudoPublico("movimentos", []);
  // prepara valores no formato brasileiro
  const formatarDinheiro = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  // filtra as movimentações pelo tipo
  const movimentos = doPeriodo.filter(
    (movimento) => filtro === "todos" || movimento.tipo === filtro,
  );
  // soma todas as entradas
  const entradas = doPeriodo.filter((item) => item.tipo === "entrada").reduce((total, item) => total + item.valor, 0);
  // soma todas as saídas
  const saidas = doPeriodo.filter((item) => item.tipo === "saida").reduce((total, item) => total + item.valor, 0);
  // encontra a data mais recente
  const ultimaData = [...doPeriodo].sort((a, b) => b.data.localeCompare(a.data))[0]?.data;

  // espera os registros do banco para não apresentar números antigos
  if (carregando) return <p role="status">Carregando as movimentações publicadas…</p>;
  if (erro) return <p role="alert">{erro}</p>;

  return (
    <>
      <p className="exercicio-financeiro">Exercício de <strong>{ano}</strong></p>
      {/* resumo dos valores */}
      <div className="resumo-financeiro">
        <article><small>Saldo do período</small><strong>{formatarDinheiro.format(entradas - saidas)}</strong><span>Entradas menos saídas publicadas</span></article>
        <article><small>Total de entradas</small><strong className="valor-entrada">{formatarDinheiro.format(entradas)}</strong><span>{doPeriodo.filter((item) => item.tipo === "entrada").length} registro(s)</span></article>
        <article><small>Total de saídas</small><strong className="valor-saida">{formatarDinheiro.format(saidas)}</strong><span>{doPeriodo.filter((item) => item.tipo === "saida").length} registro(s)</span></article>
        <article className="cartao-prestacao"><small>Última atualização</small><strong>{ultimaData ? ultimaData.split("-").reverse().join("/") : "Sem registros"}</strong><span>{carregando ? "Atualizando..." : "Dados publicados"}</span></article>
      </div>
      {/* título e filtro da tabela */}
      <div className="topo-tabela">
        <div>
          <h2>Movimentações financeiras</h2>
          <p>Registros publicados em {ano}. Os totais consideram entradas e saídas deste exercício.</p>
        </div>
        <label>
          Mostrar
          <select value={filtro} onChange={(evento) => setFiltro(evento.target.value)}>
            <option value="todos">Entradas e saídas</option>
            <option value="entrada">Somente entradas</option>
            <option value="saida">Somente saídas</option>
          </select>
        </label>
      </div>

      {/* tabela das movimentações */}
      <div className="tabela-responsiva">
        <table className="tabela-movimentos">
          <thead>
            <tr>
              <th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {!movimentos.length && <tr><td colSpan={6}>Nenhuma movimentação publicada neste período com o filtro escolhido.</td></tr>}
            {/* linhas das movimentações */}
            {movimentos.map((movimento) => (
              <tr key={`${movimento.data}-${movimento.descricao}`}>
                <td>{movimento.data.split("-").reverse().join("/")}</td>
                <td>{movimento.descricao}</td>
                <td>{movimento.categoria}</td>
                <td><span className={`tipo-movimento tipo-${movimento.tipo}`}>{movimento.tipo === "entrada" ? "Entrada" : "Saída"}</span></td>
                <td className={`valor-tabela valor-${movimento.tipo}`}>
                  {movimento.tipo === "entrada" ? "+ " : "− "}{formatarDinheiro.format(movimento.valor)}
                </td>
                <td>{movimento.comprovanteUrl ? <a href={movimento.comprovanteUrl} target="_blank" rel="noreferrer">Abrir arquivo</a> : <span>Não anexado</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
