"use client";

import { useState } from "react";
import { anoDoPortal } from "../conteudo/periodos";
import type { RegistroConteudo } from "../conteudo/tipos";
import { useConsultaPublica } from "../eventos/useConsultaPublica";
import { formatarData } from "../eventos/modelo-publico";
import { EstadoCarregando, EstadoErro, EstadoVazio } from "./EstadoConsultaPublica";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// consulta os lançamentos encerrados em uma tela somente de leitura
export default function ArquivoMovimentos({ voltar }: { voltar: () => void }) {
  const atual = anoDoPortal();
  const [campoAno, setCampoAno] = useState(String(atual - 1));
  const [ano, setAno] = useState(atual - 1);
  const { dados, carregando, erro, recarregar } = useConsultaPublica<{ itens: RegistroConteudo<"movimentos">[] }>(
    `/api/conteudo?tipo=movimentos&todos=1&ano=${ano}`, ano < atual,
  );
  const itens = dados?.itens || [];

  return <section className="consulta-painel arquivo-financeiro">
    <header className="topo-painel">
      <div><span className="rotulo-secao">TRANSPARÊNCIA</span><h1>Registros de anos anteriores</h1><p>Consulte os lançamentos e comprovantes dos exercícios encerrados.</p></div>
      <div className="acoes-topo-servicos"><button className="botao-secundario" type="button" onClick={voltar}>Voltar ao ano atual</button></div>
    </header>
    <form className="form-servico" onSubmit={(evento) => { evento.preventDefault(); setAno(Number(campoAno)); }}>
      <label>Ano<input type="number" inputMode="numeric" min={1} max={9999} step={1} required value={campoAno} onChange={(evento) => setCampoAno(evento.target.value)} /></label>
      <button className="botao-primario" type="submit">Consultar ano</button>
    </form>
    <div aria-live="polite">
      {ano > atual && <EstadoVazio titulo={`O ano de ${ano} ainda não chegou`} texto="Escolha um ano anterior para consultar os registros." />}
      {ano === atual && <EstadoVazio titulo={`O ano de ${ano} está em andamento`} texto="Use Voltar ao ano atual para consultar este exercício." />}
      {carregando && <EstadoCarregando texto={`Consultando os registros de ${ano}…`} />}
      {erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
      {dados && !itens.length && <EstadoVazio titulo="Sem registros" texto={`Nenhum registro foi feito em ${ano}.`} />}
    </div>
    {!!itens.length && <div className="tabela-responsiva">
      <table className="tabela-movimentos">
        <caption>Lançamentos de {ano}</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Descrição</th><th scope="col">Categoria</th><th scope="col">Tipo</th><th scope="col">Valor</th><th scope="col">Comprovante</th></tr></thead>
        <tbody>{itens.map(({ id, dados: item }) => <tr key={id}>
          <td>{formatarData(item.data)}</td><td>{item.descricao}</td><td>{item.categoria}</td>
          <td><span className={`tipo-movimento tipo-${item.tipo}`}>{item.tipo === "entrada" ? "Entrada" : "Saída"}</span></td>
          <td>{moeda.format(item.valor)}</td>
          <td>{item.comprovanteUrl ? <a href={item.comprovanteUrl} target="_blank" rel="noreferrer">Ver comprovante ↗</a> : "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
