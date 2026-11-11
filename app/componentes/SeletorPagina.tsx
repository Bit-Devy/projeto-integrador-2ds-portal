"use client";

// mantém o seletor de atalhos e abre os registros em uma busca separada do site
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { anoDoPortal } from "../conteudo/periodos";

type Destino = { id?: number; url: string; nome: string };
type Grupo = { chave: string; nome: string; url: string };
export default function SeletorPagina({ valor, mudar, obrigatorio = true }: { valor: string; mudar: (url: string) => void; obrigatorio?: boolean }) {
  const [paginas, setPaginas] = useState<Destino[]>([]); const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupo, setGrupo] = useState<Grupo | null>(null); const [campeonato, setCampeonato] = useState<Destino | null>(null);
  const [ano, setAno] = useState(String(anoDoPortal())); const [busca, setBusca] = useState(""); const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1); const [itens, setItens] = useState<Destino[]>([]); const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false); const [erro, setErro] = useState(""); const [nomeSelecionado, setNomeSelecionado] = useState("");
  const janela = useRef<HTMLDialogElement>(null); const tituloId = useId();
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/paginas", { signal: controle.signal, cache: "no-store" }).then(async (resposta) => { if (!resposta.ok) throw new Error("Não foi possível carregar as páginas."); const dados = await resposta.json(); setPaginas(dados.itens); setGrupos(dados.grupos || []); }).catch((falha) => { if (!controle.signal.aborted) setErro(falha.message); });
    return () => controle.abort();
  }, []);
  useEffect(() => { if (grupo) { janela.current?.showModal(); janela.current?.querySelector<HTMLElement>("h2")?.focus(); } }, [grupo]);
  useEffect(() => {
    if (!grupo) return;
    const controle = new AbortController(); const inicio = setTimeout(() => setCarregando(true), 0);
    const parametros = new URLSearchParams({ grupo: campeonato ? "jogos" : grupo.chave, ano, busca: consulta, pagina: String(pagina) });
    if (campeonato) parametros.set("campeonato", String(campeonato.id));
    fetch(`/api/paginas?${parametros}`, { signal: controle.signal, cache: "no-store" }).then(async (resposta) => { const dados = await resposta.json(); if (!resposta.ok) throw new Error(dados.erro); setItens(dados.itens); setTotal(dados.total); setErro(""); }).catch((falha) => { if (!controle.signal.aborted) setErro(falha.message); }).finally(() => { clearTimeout(inicio); if (!controle.signal.aborted) setCarregando(false); });
    return () => { clearTimeout(inicio); controle.abort(); };
  }, [grupo, campeonato, ano, consulta, pagina]);
  function abrir(item: Grupo) { setGrupo(item); setCampeonato(null); setAno(String(anoDoPortal())); setBusca(""); setConsulta(""); setPagina(1); setItens([]); }
  function fechar() { janela.current?.close(); setGrupo(null); }
  function escolher(item: Destino) { mudar(item.url); setNomeSelecionado(item.nome); fechar(); }
  return <><select value={valor} onChange={(evento) => { const destino = evento.target.value; const item = grupos.find((entrada) => entrada.url === destino); if (item) abrir(item); else mudar(destino); }} required={obrigatorio}><option value="">{obrigatorio ? "Escolha uma página publicada" : "Sem página relacionada"}</option>{valor && !paginas.some((pagina) => pagina.url === valor) && <option value={valor}>{nomeSelecionado || "Publicação vinculada"}</option>}{paginas.map((pagina) => <option value={pagina.url} key={pagina.url}>{pagina.nome}</option>)}</select>
    {valor && grupos.some((item) => valor.startsWith(item.url) && item.url !== "/") && <button className="botao-cinza-pequeno" type="button" onClick={() => { const item = grupos.find((entrada) => valor.startsWith(entrada.url)); if (item) abrir(item); }}>Escolher publicação</button>}
    {erro && !grupo && <small role="alert">{erro}</small>}
    {grupo && createPortal(<dialog ref={janela} className="dialogo-anonimato arquivo-anual seletor-destinos" aria-labelledby={tituloId} onCancel={(evento) => { evento.preventDefault(); fechar(); }}><h2 id={tituloId} tabIndex={-1}>{campeonato ? `Jogos · ${campeonato.nome}` : `Vincular ${grupo.nome}`}</h2><p>Escolha a página geral ou procure uma publicação específica.</p><button type="button" className="botao-secundario" onClick={() => escolher(grupo)}>Vincular à página {grupo.nome}</button><div className="form-servico"><label>Buscar publicação<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); setConsulta(busca); setPagina(1); } }} placeholder="Nome ou título" /></label><label>Ano<input type="number" min={1900} max={2199} value={ano} onChange={(evento) => { setAno(evento.target.value); setPagina(1); }} /></label><button className="botao-primario" type="button" onClick={() => { setConsulta(busca); setPagina(1); }}>Buscar</button></div>{campeonato && <button type="button" className="botao-cinza-pequeno" onClick={() => { setCampeonato(null); setPagina(1); }}>‹ Voltar aos campeonatos</button>}{erro && <p role="alert" className="erro-painel">{erro}</p>}{carregando ? <p role="status">Carregando publicações…</p> : <div className="lista-arquivo-anual">{itens.map((item) => <article key={item.url}><h3>{item.nome}</h3><div className="acoes-topo-servicos"><button type="button" className="botao-secundario" onClick={() => escolher(item)}>Vincular publicação</button>{grupo.chave === "interclasses" && !campeonato && <button type="button" className="botao-cinza-pequeno" onClick={() => { setCampeonato(item); setPagina(1); setBusca(""); setConsulta(""); }}>Selecionar um jogo</button>}</div></article>)}{!itens.length && <p>Nenhuma publicação encontrada neste grupo e ano.</p>}</div>}<div className="acoes-dialogo-anonimato">{total > 20 && <><button type="button" className="botao-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>{pagina} de {Math.ceil(total / 20)}</span><button type="button" className="botao-secundario" disabled={pagina * 20 >= total} onClick={() => setPagina(pagina + 1)}>Próxima</button></>}<button type="button" className="botao-primario" onClick={fechar}>Cancelar</button></div></dialog>, document.body)}
  </>;
}
