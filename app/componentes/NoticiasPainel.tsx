"use client";

// importa os controles do arquivo e a ajuda das opções
import { useEffect, useRef, useState } from "react";
import type { RegistroConteudo, NoticiaGecep } from "../conteudo/tipos";
import { anoDoPortal, destaqueValido } from "../conteudo/periodos";
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";

type Noticia = RegistroConteudo<"noticias">;

// separa os destaques do arquivo de notícias e confirma ações dentro do site
export default function NoticiasPainel({ editar, atualizacao }: { editar: (item: RegistroConteudo) => void; atualizacao: number }) {
  const [visao, setVisao] = useState("destaques");
  const [ano, setAno] = useState(String(anoDoPortal()));
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<Noticia[]>([]);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [revisao, setRevisao] = useState(0);
  const [acao, setAcao] = useState<{ item: Noticia; tipo: "excluir" | "arquivar" } | null>(null);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const janela = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controle = new AbortController();
    const parametros = new URLSearchParams({ tipo: "noticias", todos: "1", visao, ano, busca, pagina: String(pagina) });
    fetch(`/api/conteudo?${parametros}`, { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json(); if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar as notícias.");
      setItens(dados.itens); setTotal(dados.total); setErro("");
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); }).finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [visao, ano, busca, pagina, revisao, atualizacao]);
  useEffect(() => { if (acao) janela.current?.showModal(); }, [acao]);
  function atualizar() { setCarregando(true); setRevisao((valor) => valor + 1); }
  function fechar() { if (salvando) return; janela.current?.close(); setAcao(null); setSenha(""); setErro(""); }
  async function gravar(item: Noticia, dados: NoticiaGecep, publicado = item.publicado) {
    const resposta = await fetch("/api/conteudo", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, tipo: "noticias", dados, publicado }) });
    const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar a notícia.");
  }
  async function confirmar() {
    if (!acao) return;
    setSalvando(true); setErro("");
    try {
      if (acao.tipo === "arquivar") await gravar(acao.item, acao.item.dados, false);
      else {
        const resposta = await fetch(`/api/conteudo?id=${acao.item.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ senha }) });
        const dados = await resposta.json(); if (!resposta.ok) throw new Error(dados.erro || "Não foi possível excluir.");
      }
      janela.current?.close(); setAcao(null); setSenha(""); atualizar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível concluir."); }
    finally { setSalvando(false); }
  }
  const exigeSenha = Boolean(acao?.tipo === "excluir" && (acao.item.publicado || acao.item.dados.jaPublicada));
  return <section className="noticias-painel">
    <div className="abas-documentos" role="group" aria-label="Consultar notícias">{[["destaques", "Destaques"], ["ativas", "Ver notícias ativas"], ["rascunhos", "Rascunhos"], ["arquivadas", "Arquivadas"]].map(([valor, nome]) => <button type="button" key={valor} aria-pressed={visao === valor} onClick={() => { setVisao(valor); setAno(String(anoDoPortal())); setBusca(""); setPagina(1); setCarregando(true); }}>{nome}</button>)}</div>
    {visao === "destaques" ? <p>Destaques em vigor neste ano. Desmarque a opção para retirar o destaque. As outras notícias ficam nas abas de consulta.</p> : <div className="biblioteca-filtros"><label>Ano<input type="number" min="1900" max="2199" value={ano} onChange={(evento) => { setAno(evento.target.value); setPagina(1); setCarregando(true); }} /></label><label>Pesquisar notícias<input type="search" value={busca} placeholder="Título ou resumo" onChange={(evento) => { setBusca(evento.target.value); setPagina(1); setCarregando(true); }} /></label></div>}
    {erro && !acao && <p role="alert" className="erro-painel">{erro}</p>}
    {carregando ? <p role="status">Carregando notícias…</p> : <div className="lista-painel">{!itens.length && <p>Nenhuma notícia nesta seção.</p>}{itens.map((item) => <article key={item.id}>
      <span className={item.publicado ? "estado-publicado" : "estado-rascunho"}>{item.publicado ? "Publicada" : item.dados.jaPublicada ? "Arquivada" : "Rascunho"}</span>
      <div><h2>{item.titulo}</h2><p>{item.dados.data.split("-").reverse().join("/")}</p>{item.dados.destaque && <p>{!destaqueValido(item.dados) && "Prazo encerrado · "}{item.dados.destaqueAte ? `Destaque até ${item.dados.destaqueAte.split("-").reverse().join("/")}` : "Destaque sem prazo definido"}</p>}
      {visao === "destaques" && <label className="campo-publicado"><CheckboxComAjuda checked={Boolean(item.dados.destaque)} aria-label={`Mostrar em destaque: ${item.titulo}`} explicacao={descricaoCheckbox("destaque")} disabled={salvando} onChange={async () => { setSalvando(true); try { await gravar(item, { ...item.dados, destaque: false }); atualizar(); } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível retirar o destaque."); } finally { setSalvando(false); } }} /><span>Mostrar em destaque</span></label>}</div>
      <div className="acoes-item-painel"><button type="button" onClick={() => editar(item)}>Editar</button>{item.publicado && <button type="button" onClick={() => { setErro(""); setAcao({ item, tipo: "arquivar" }); }}>Arquivar</button>}<button type="button" onClick={() => { setErro(""); setAcao({ item, tipo: "excluir" }); }}>Excluir</button></div>
    </article>)}</div>}
    {total > 20 && <nav className="paginacao-eventos" aria-label="Páginas de notícias"><button type="button" disabled={pagina <= 1} onClick={() => { setPagina(pagina - 1); setCarregando(true); }}>Anterior</button><span>{pagina} de {Math.ceil(total / 20)}</span><button type="button" disabled={pagina * 20 >= total} onClick={() => { setPagina(pagina + 1); setCarregando(true); }}>Próxima</button></nav>}
    <dialog className="dialogo-anonimato" ref={janela} aria-labelledby="titulo-acao-noticia" onCancel={(evento) => { evento.preventDefault(); fechar(); }}><form onSubmit={(evento) => { evento.preventDefault(); void confirmar(); }}>
      <h2 id="titulo-acao-noticia">{acao?.tipo === "arquivar" ? "Arquivar notícia?" : "Excluir notícia?"}</h2><p>{acao?.item.titulo}</p><p>{acao?.tipo === "arquivar" ? "A notícia deixará de ser pública e continuará disponível na aba Arquivadas." : "Esta exclusão é permanente."}</p>
      {exigeSenha && <label>Confirme a senha do painel<input type="password" value={senha} onChange={(evento) => setSenha(evento.target.value)} autoComplete="current-password" required /></label>}
      {erro && <p role="alert" className="erro-painel">{erro}</p>}
      <div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" onClick={fechar} disabled={salvando}>Cancelar</button><button type="submit" className="botao-primario" disabled={salvando}>{salvando ? "Aguarde…" : acao?.tipo === "arquivar" ? "Arquivar" : "Confirmar exclusão"}</button></div>
    </form></dialog>
  </section>;
}
