"use client";

// organiza a leitura das participações sem permitir apagar seu histórico
import { FormEvent, useEffect, useRef, useState } from "react";
import type { MensagemParticipacao } from "../conteudo/tipos";
import "./painel-mensagens.css";

const filtros = [
  { chave: "nova", nome: "Novas" },
  { chave: "em_analise", nome: "Em análise" },
  { chave: "respondida", nome: "Respondidas" },
  { chave: "arquivada", nome: "Arquivadas" },
  { chave: "todas", nome: "Todas" },
] as const;
type FiltroMensagem = typeof filtros[number]["chave"];

// mostra a mesma leitura ampliada para quem edita e para quem apenas consulta
export default function PainelMensagens({ somenteConsulta = false }: { somenteConsulta?: boolean }) {
  const [mensagens, setMensagens] = useState<MensagemParticipacao[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [visao, setVisao] = useState<FiltroMensagem>("nova");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [atualizacao, setAtualizacao] = useState(0);
  const [selecionada, setSelecionada] = useState<MensagemParticipacao | null>(null);
  const [alterando, setAlterando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");
  const janela = useRef<HTMLDialogElement>(null);
  const painel = useRef<HTMLElement>(null);

  // abre o detalhe com foco preso no popup e permite fechar com escape
  useEffect(() => { if (selecionada && !janela.current?.open) janela.current?.showModal(); }, [selecionada]);

  // busca apenas a etapa e a página escolhidas sem misturar respostas antigas
  useEffect(() => {
    const controlador = new AbortController();
    const parametros = new URLSearchParams({ pagina: String(pagina), status: visao });
    if (buscaAplicada) parametros.set("busca", buscaAplicada);
    fetch(`/api/mensagens?${parametros}`, { signal: controlador.signal }).then(async (resposta) => {
      const dados = await resposta.json() as { mensagens?: MensagemParticipacao[]; pagina?: number; total?: number; totalPaginas?: number; erro?: string };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar as mensagens.");
      if (controlador.signal.aborted) return;
      setMensagens(dados.mensagens ?? []);
      setPagina(dados.pagina ?? 1);
      setTotal(dados.total ?? 0);
      setTotalPaginas(dados.totalPaginas ?? 1);
    }).catch((falha) => {
      if (!controlador.signal.aborted) setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as mensagens.");
    }).finally(() => { if (!controlador.signal.aborted) setCarregando(false); });
    return () => controlador.abort();
  }, [atualizacao, buscaAplicada, pagina, visao]);

  // mantém a busca por protocolo dentro do filtro selecionado
  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCarregando(true); setErro(""); setPagina(1);
    if (busca.trim() === buscaAplicada) setAtualizacao((valor) => valor + 1);
    else setBuscaAplicada(busca.trim());
  }
  function limparBusca() {
    setCarregando(true); setErro(""); setBusca(""); setBuscaAplicada(""); setPagina(1);
    setAtualizacao((valor) => valor + 1);
  }
  function trocarVisao(novaVisao: FiltroMensagem) {
    if (novaVisao === visao) return;
    setCarregando(true); setErro(""); setVisao(novaVisao); setPagina(1);
  }
  function irParaPagina(novaPagina: number) {
    if (novaPagina === pagina) return;
    setCarregando(true); setErro(""); setPagina(novaPagina);
  }
  function abrir(mensagem: MensagemParticipacao) { setErroDetalhe(""); setSelecionada(mensagem); }
  function fechar() {
    janela.current?.close(); setSelecionada(null); setErroDetalhe("");
    // devolve o foco ao filtro quando o cartão saiu da lista após mudar de etapa
    if (document.activeElement === document.body) painel.current?.querySelector<HTMLButtonElement>(".filtros-mensagens button[aria-pressed='true']")?.focus();
  }

  // atualiza a etapa mantendo o detalhe aberto e a mensagem preservada
  async function mudarStatus(mensagem: MensagemParticipacao, status: string) {
    if (!filtros.some((item) => item.chave !== "todas" && item.chave === status)) return;
    const novoStatus = status as MensagemParticipacao["status"];
    setErro(""); setErroDetalhe(""); setAlterando(true);
    try {
      const resposta = await fetch("/api/mensagens", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: mensagem.id, status }) });
      const dados = await resposta.json() as { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível atualizar a mensagem.");
      setSelecionada((atual) => atual?.id === mensagem.id ? { ...atual, status: novoStatus } : atual);
      setCarregando(true); setAtualizacao((valor) => valor + 1);
    } catch (falha) {
      const aviso = falha instanceof Error ? falha.message : "Não foi possível atualizar a mensagem.";
      if (selecionada?.id === mensagem.id) setErroDetalhe(aviso); else setErro(aviso);
    } finally { setAlterando(false); }
  }
  const quantidade = Math.min(5, totalPaginas);
  const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - quantidade + 1));
  const paginas = Array.from({ length: quantidade }, (_, indice) => inicio + indice);

  return <section ref={painel} className="mensagens-painel">
    <div className="cabecalho-mensagens"><div><span className="rotulo-secao">{somenteConsulta ? "SOMENTE CONSULTA" : "PARTICIPAÇÃO"}</span><h2>Mensagens recebidas</h2><p>Consulte as novas participações e acompanhe cada etapa do atendimento.</p></div><strong aria-label={`${total} mensagens encontradas`}>{total}</strong></div>
    {/* os filtros preservam o protocolo e sempre começam pelas novas */}
    <div className="ferramentas-mensagens">
      <div className="filtros-mensagens" role="group" aria-label="Exibir mensagens">{filtros.map((filtro) => <button type="button" key={filtro.chave} className={visao === filtro.chave ? "ativo" : ""} aria-pressed={visao === filtro.chave} onClick={() => trocarVisao(filtro.chave)}>{filtro.nome}</button>)}</div>
      <form className="busca-mensagens" onSubmit={pesquisar}><label htmlFor="busca-protocolo">Buscar por protocolo</label><div><input id="busca-protocolo" type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Ex.: GECEP-2026-00042" maxLength={40} />{(busca || buscaAplicada) && <button type="button" className="limpar-busca" onClick={limparBusca}>Limpar</button>}<button type="submit">Pesquisar</button></div></form>
    </div>
    {erro && <p className="erro-painel" role="alert">{erro} <button type="button" onClick={() => { setErro(""); setCarregando(true); setAtualizacao((valor) => valor + 1); }}>Tentar novamente</button></p>}
    {carregando && <p role="status">Carregando mensagens…</p>}
    {!carregando && !erro && !mensagens.length && <div className="vazio-painel"><strong>Nenhuma mensagem encontrada</strong><p>{buscaAplicada ? "Confira o protocolo ou escolha Todas para procurar em qualquer etapa." : visao === "nova" ? "As novas participações aparecerão aqui." : "Não há mensagens nesta etapa."}</p></div>}
    {/* o cartão inteiro de leitura abre a mensagem sem alterar sua etapa */}
    <div className="lista-mensagens-painel" aria-busy={carregando}>{!carregando && !erro && mensagens.map((mensagem) => <article key={mensagem.id}>
      <button type="button" className="abrir-mensagem" onClick={() => abrir(mensagem)} aria-label={`Abrir mensagem ${mensagem.protocolo}: ${mensagem.titulo}`}>
        <span className="topo-mensagem"><span>{mensagem.protocolo}</span><time>{formatarData(mensagem.criadoEm)}</time></span><span className="assunto-mensagem">{mensagem.assunto} · {nomeStatus(mensagem.status)}</span><span className="titulo-mensagem">{mensagem.titulo}</span><span className="resumo-mensagem">{mensagem.mensagem}</span><small>{mensagem.anonimo ? "Identidade preservada" : `${mensagem.nome} · ${mensagem.turma}`}</small><span className="convite-mensagem">Ler mensagem completa ↗</span>
      </button>
      {!somenteConsulta && <div className="acoes-mensagem"><select disabled={alterando} aria-label={`Status da mensagem ${mensagem.protocolo}`} value={mensagem.status} onChange={(evento) => void mudarStatus(mensagem, evento.target.value)}>{filtros.filter((item) => item.chave !== "todas").map((item) => <option value={item.chave} key={item.chave}>{nomeStatus(item.chave)}</option>)}</select>{mensagem.status !== "arquivada" && <button type="button" disabled={alterando} onClick={() => void mudarStatus(mensagem, "arquivada")}>Arquivar</button>}</div>}
    </article>)}</div>
    {totalPaginas > 1 && <nav className="paginacao-mensagens" aria-label="Páginas de mensagens"><button type="button" onClick={() => irParaPagina(Math.max(1, pagina - 1))} disabled={pagina === 1 || carregando}>Anterior</button>{paginas.map((numero) => <button type="button" className={pagina === numero ? "ativo" : ""} aria-current={pagina === numero ? "page" : undefined} onClick={() => irParaPagina(numero)} disabled={carregando} key={numero}>{numero}</button>)}<button type="button" onClick={() => irParaPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas || carregando}>Próxima</button></nav>}
    {/* o popup preserva quebras de linha e todos os detalhes em qualquer etapa */}
    {selecionada && <dialog ref={janela} className="dialogo-mensagem" aria-labelledby="titulo-mensagem-aberta" onCancel={(evento) => { evento.preventDefault(); fechar(); }} onClose={() => setSelecionada(null)}>
      <header><div><span className="rotulo-secao">{selecionada.protocolo}</span><h2 id="titulo-mensagem-aberta">{selecionada.titulo}</h2><p>{nomeStatus(selecionada.status)} · {formatarData(selecionada.criadoEm)}</p></div><button type="button" className="fechar-mensagem" autoFocus onClick={fechar} aria-label="Fechar mensagem">×</button></header>
      <dl className="dados-mensagem"><div><dt>Assunto</dt><dd>{selecionada.assunto}</dd></div><div><dt>Enviada por</dt><dd>{selecionada.anonimo ? "Identidade preservada" : selecionada.nome}</dd></div>{!selecionada.anonimo && <><div><dt>Turma</dt><dd>{selecionada.turma}</dd></div><div><dt>Contato</dt><dd>{selecionada.contato ? `${nomeTipoContato(selecionada.tipoContato)} · ${selecionada.contato}` : "Não informado"}</dd></div></>}</dl>
      <div className="texto-mensagem-ampliado">{selecionada.mensagem}</div>
      {selecionada.anonimo && <p className="aviso-identidade-mensagem">A identidade foi preservada no envio. Esta mensagem não possui dados para resposta.</p>}
      {erroDetalhe && <p className="erro-painel" role="alert">{erroDetalhe}</p>}
      <footer>{!somenteConsulta && <label>Etapa da mensagem<select disabled={alterando} value={selecionada.status} onChange={(evento) => void mudarStatus(selecionada, evento.target.value)}>{filtros.filter((item) => item.chave !== "todas").map((item) => <option value={item.chave} key={item.chave}>{nomeStatus(item.chave)}</option>)}</select></label>}<div>{!somenteConsulta && selecionada.status !== "arquivada" && <button type="button" disabled={alterando} onClick={() => void mudarStatus(selecionada, "arquivada")}>Arquivar mensagem</button>}<button type="button" className="botao-primario" onClick={fechar}>Fechar</button></div></footer>
    </dialog>}
  </section>;
}

// deixa as etapas e os contatos fáceis de reconhecer
function nomeStatus(status: string) { return ({ nova: "Nova", em_analise: "Em análise", respondida: "Respondida", arquivada: "Arquivada" } as Record<string, string>)[status] || status; }
function nomeTipoContato(tipo: string) { return ({ whatsapp: "WhatsApp", telefone: "Telefone", email: "E-mail", instagram: "Instagram", outro: "Outro" } as Record<string, string>)[tipo] || "Outro"; }
function formatarData(data?: string) {
  if (!data) return "agora";
  const momento = new Date(data.replace(" ", "T") + (data.includes("Z") ? "" : "Z"));
  return Number.isNaN(momento.getTime()) ? data : momento.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
