"use client";

// importa os controles da janela e da lista de arquivos
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ArquivoBiblioteca = { chave: string; url: string; nome: string; tipo: string; tamanho: number; enviadoEm: string; publico: boolean };
export type FiltroArquivo = "todos" | "imagem" | "pdf";

// mostra os uploads sem transformar a lista em uma página pública
export function ListaBiblioteca({ aceitar = "todos", selecionar, atualizacao = 0 }: { aceitar?: FiltroArquivo; selecionar?: (arquivo: ArquivoBiblioteca) => void; atualizacao?: number }) {
  const [itens, setItens] = useState<ArquivoBiblioteca[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroArquivo>(aceitar);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  // carrega apenas os nomes e metadados disponíveis para a sessão da gestão
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/arquivos", { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados) throw new Error(dados?.erro || "Não foi possível carregar os arquivos.");
      setItens(dados.itens); setCursor(dados.cursor); setErro("");
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); }).finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [atualizacao, tentativa]);

  async function carregarMais() {
    if (!cursor) return;
    setCarregando(true); setErro("");
    try {
      const resposta = await fetch(`/api/arquivos?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados) throw new Error(dados?.erro || "Não foi possível carregar mais arquivos.");
      setItens((atuais) => [...atuais, ...dados.itens.filter((item: ArquivoBiblioteca) => !atuais.some((atual) => atual.chave === item.chave))]); setCursor(dados.cursor);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Erro ao carregar arquivos."); }
    finally { setCarregando(false); }
  }
  const filtrados = itens.filter((item) => item.nome.toLowerCase().includes(busca.toLowerCase()) && (filtro === "todos" || (filtro === "imagem" ? item.tipo.startsWith("image/") : item.tipo === "application/pdf")))
    .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
  return <div className="biblioteca-arquivos">
    <div className="biblioteca-filtros"><label>Buscar arquivo<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome do arquivo" /></label>{aceitar === "todos" && <label>Formato<select value={filtro} onChange={(evento) => setFiltro(evento.target.value as FiltroArquivo)}><option value="todos">Todos</option><option value="imagem">Imagens</option><option value="pdf">PDF</option></select></label>}</div>
    {erro && <p role="alert">{erro} <button type="button" onClick={() => { setCarregando(true); setTentativa((valor) => valor + 1); }}>Tentar novamente</button></p>}
    {carregando && <p role="status">Carregando arquivos…</p>}
    {!carregando && !erro && !filtrados.length && <p>Nenhum arquivo encontrado. Envie um arquivo na aba Arquivos ou carregue os próximos.</p>}
    <div className="biblioteca-lista">{filtrados.map((item) => <article key={item.chave}>
      {item.tipo.startsWith("image/") ? <img src={item.url} alt="" loading="lazy" /> : <span className="biblioteca-formato">{item.nome.split(".").pop()?.toUpperCase()}</span>}
      <div><strong>{item.nome}</strong><small>{Math.ceil(item.tamanho / 1024)} KB · {item.publico ? "Em uso público" : "Privado"}</small></div>
      {selecionar ? <button type="button" className="pev-botao" onClick={() => selecionar(item)}>Usar arquivo</button> : <a className="pev-botao" href={item.url} target="_blank" rel="noreferrer">Abrir</a>}
    </article>)}</div>
    {cursor && <button type="button" className="pev-botao" disabled={carregando} onClick={() => void carregarMais()}>Carregar mais arquivos</button>}
  </div>;
}

// abre a biblioteca dentro do editor sem sair da publicação
export default function EscolherArquivo({ aceitar = "todos", selecionar }: { aceitar?: FiltroArquivo; selecionar: (arquivo: ArquivoBiblioteca) => void }) {
  const janela = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [aberta, setAberta] = useState(false);
  useEffect(() => { if (aberta) janela.current?.showModal(); }, [aberta]);
  function fechar() { janela.current?.close(); setAberta(false); }
  return <><button type="button" className="pev-botao botao-biblioteca" aria-haspopup="dialog" onClick={() => setAberta(true)}>Escolher da biblioteca</button>
    {aberta && createPortal(<dialog ref={janela} className="dialogo-anonimato dialogo-biblioteca" aria-labelledby={titulo} onCancel={fechar}>
      <div className="biblioteca-topo"><h2 id={titulo}>Escolher arquivo</h2><button type="button" className="pev-botao" onClick={fechar}>Fechar biblioteca</button></div>
      <p>O arquivo só fica público depois de salvar uma publicação que o utilize.</p>
      {aberta && <ListaBiblioteca aceitar={aceitar} selecionar={(arquivo) => { selecionar(arquivo); fechar(); }} />}
    </dialog>, document.body)}</>;
}
