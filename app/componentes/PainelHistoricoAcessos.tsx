"use client";

// mostra cada entrada e permite abrir as alterações feitas naquela sessão
import { useEffect, useState } from "react";
import { obterCargo } from "../lib/cargos";

type Entrada = { id: number; nome: string; cargo: string; entradaEm: string; totalAcoes: number };
type Acao = { id: number; resumo: string; criadoEm: string };
type Detalhe = { acoes: Acao[]; pagina: number; totalPaginas: number };
export default function PainelHistoricoAcessos() {
  const [itens, setItens] = useState<Entrada[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [atualizacao, setAtualizacao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [paginaAcoes, setPaginaAcoes] = useState(1);
  const [erroDetalhe, setErroDetalhe] = useState("");
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  useEffect(() => {
    const controle = new AbortController();
    fetch(`/api/historico-acessos?pagina=${pagina}&busca=${encodeURIComponent(buscaAplicada)}`, { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar as entradas.");
      setItens(dados.itens); setTotal(dados.total); setTotalPaginas(dados.totalPaginas); setErro("");
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); }).finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [pagina, buscaAplicada, atualizacao]);
  useEffect(() => {
    if (!aberta) return;
    const controle = new AbortController();
    fetch(`/api/historico-acessos?id=${aberta}&pagina=${paginaAcoes}`, { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar esta entrada.");
      setDetalhe(dados); setErroDetalhe("");
    }).catch((falha) => { if (falha.name !== "AbortError") setErroDetalhe(falha.message); }).finally(() => { if (!controle.signal.aborted) setCarregandoDetalhe(false); });
    return () => controle.abort();
  }, [aberta, paginaAcoes, atualizacao]);
  function abrir(id: number) { setAberta(aberta === id ? null : id); setDetalhe(null); setPaginaAcoes(1); setErroDetalhe(""); setCarregandoDetalhe(true); }
  function atualizar() { setCarregando(true); setAberta(null); setAtualizacao((valor) => valor + 1); }
  return <section className="historico-acessos">
    <header className="topo-painel"><div><span className="rotulo-secao">ADMINISTRAÇÃO</span><h1>Histórico de acessos</h1><p>Entradas no painel e alterações realizadas em cada sessão. Clique em uma entrada para consultar as ações.</p></div><button type="button" onClick={atualizar} disabled={carregando}>Atualizar</button></header>
    <form className="busca-historico-acessos" onSubmit={(evento) => { evento.preventDefault(); setPagina(1); setBuscaAplicada(busca.trim()); atualizar(); }}><label>Buscar pessoa ou cargo<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome de quem entrou ou cargo" maxLength={100} /></label><button type="submit" className="pev-botao">Buscar</button></form>
    {erro && <p role="alert" className="erro-painel">{erro}</p>}
    {carregando && <p role="status">Carregando entradas...</p>}
    {!carregando && <p className="ajuda-busca">{total} {total === 1 ? "entrada registrada" : "entradas registradas"}. Datas e horários do Paraná. O histórico começa com os logins feitos após a ativação deste recurso.</p>}
    {!carregando && !erro && !itens.length && <p>Nenhuma entrada encontrada.</p>}
    <div className="lista-historico-acessos">{itens.map((entrada) => <article key={entrada.id}>
      <button type="button" className="entrada-historico" aria-expanded={aberta === entrada.id} aria-controls={`acoes-entrada-${entrada.id}`} onClick={() => abrir(entrada.id)}>
        <span><strong>{entrada.nome}</strong><small>{obterCargo(entrada.cargo)?.nome || entrada.cargo}</small></span><span><time>{formatarHorario(entrada.entradaEm)}</time><small>{entrada.totalAcoes} {entrada.totalAcoes === 1 ? "ação registrada" : "ações registradas"} <span aria-hidden="true">{aberta === entrada.id ? "−" : "+"}</span></small></span>
      </button>
      {aberta === entrada.id && <div className="acoes-entrada" id={`acoes-entrada-${entrada.id}`}>
        {erroDetalhe && <p role="alert">{erroDetalhe}</p>}
        {carregandoDetalhe && <p role="status">Consultando ações...</p>}
        {!carregandoDetalhe && detalhe?.acoes.length === 0 && <p>Nenhuma alteração registrada nesta entrada. Consultar páginas não altera os conteúdos.</p>}
        {!carregandoDetalhe && detalhe && <><ol>{detalhe.acoes.map((acao) => <li key={acao.id}><time>{formatarHorario(acao.criadoEm)}</time><span>{acao.resumo}</span></li>)}</ol>{detalhe.totalPaginas > 1 && <div className="paginacao-historico"><button type="button" disabled={paginaAcoes === 1} onClick={() => { setPaginaAcoes((valor) => valor - 1); setCarregandoDetalhe(true); }}>Anteriores</button><span>Ações · página {paginaAcoes} de {detalhe.totalPaginas}</span><button type="button" disabled={paginaAcoes >= detalhe.totalPaginas} onClick={() => { setPaginaAcoes((valor) => valor + 1); setCarregandoDetalhe(true); }}>Próximas</button></div>}</>}
      </div>}
    </article>)}</div>
    {totalPaginas > 1 && <nav className="paginacao-historico" aria-label="Páginas do histórico"><button type="button" disabled={pagina === 1 || carregando} onClick={() => { setPagina((valor) => valor - 1); setCarregando(true); setAberta(null); }}>Anterior</button><span>Página {pagina} de {totalPaginas}</span><button type="button" disabled={pagina >= totalPaginas || carregando} onClick={() => { setPagina((valor) => valor + 1); setCarregando(true); setAberta(null); }}>Próxima</button></nav>}
  </section>;
}
function formatarHorario(valor: string) {
  const data = new Date(`${valor.replace(" ", "T")}Z`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });
}
