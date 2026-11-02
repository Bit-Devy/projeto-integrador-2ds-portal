"use client";

// importa os controles do aviso e os links internos
import { useId, useRef, useState } from "react";
import Link from "next/link";
import type { NoticiaGecep } from "../conteudo/tipos";

type Botoes = Pick<NoticiaGecep, "link" | "botaoInternoAtivo" | "botaoInternoTexto" | "botaoInternoUrl" | "botaoExternoAtivo" | "botaoExternoTexto" | "botaoExternoUrl">;

// oferece destinos escolhidos pela gestão e confirma a saída para outro site
export default function BotoesNoticia({ noticia }: { noticia: Botoes }) {
  const janela = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [destino, setDestino] = useState("");
  function abrir(endereco: string) { setDestino(endereco); janela.current?.showModal(); }
  function fechar() { janela.current?.close(); setDestino(""); }
  return <>
    {noticia.botaoInternoAtivo && noticia.botaoInternoUrl && <Link className="chamada-noticia-interna" href={noticia.botaoInternoUrl}><span><small>NO PORTAL DO GECEP</small><strong>{noticia.botaoInternoTexto || "Saiba mais"}</strong></span><span aria-hidden="true">›</span></Link>}
    {(noticia.botaoExternoAtivo || noticia.link) && <div className="botoes-noticia-externos">
      {noticia.botaoExternoAtivo && noticia.botaoExternoUrl && <button type="button" className="botao-secundario" onClick={() => abrir(noticia.botaoExternoUrl!)}>{noticia.botaoExternoTexto || "Acessar outro site"} ↗</button>}
      {noticia.link && (noticia.link.startsWith("/") ? <a className="botao-secundario" href={noticia.link} target="_blank" rel="noreferrer">Consultar fonte ou publicação relacionada ↗</a> : <button type="button" className="botao-secundario" onClick={() => abrir(noticia.link)}>Consultar fonte ou publicação relacionada ↗</button>)}
    </div>}
    <dialog ref={janela} className="dialogo-anonimato" aria-labelledby={titulo} onCancel={fechar}>
      <h2 id={titulo}>Você está saindo do site do GECEP</h2><p>O destino é outro site. Deseja continuar?</p><p className="destino-externo">{destino}</p>
      <div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" onClick={fechar}>Cancelar</button><a className="botao-primario" href={destino || undefined} rel="noreferrer" onClick={() => window.setTimeout(fechar, 0)}>Continuar ↗</a></div>
    </dialog>
  </>;
}
