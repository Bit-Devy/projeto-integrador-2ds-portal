"use client";

// importa a biblioteca e os controles do painel
import { useEffect, useState } from "react";
import EscolherArquivo, { ListaBiblioteca } from "./BibliotecaArquivos";
import type { DocumentoOficial } from "../arquivos/documentos-oficiais";
import { enviarArquivoPainel, requisitarPainel, corpoJson, MensagensPainel, useAvisoMudancas } from "./painel-eventos-comum";

// mantém os uploads privados e separa a troca dos dois documentos oficiais
export default function PainelDocumentos({ aba, aoMudarEstadoSujo }: { aba: "arquivos" | "normas"; aoMudarEstadoSujo: (mudou: boolean) => void }) {
  const [documentos, setDocumentos] = useState<DocumentoOficial[]>([]);
  const [alterados, setAlterados] = useState<Record<string, boolean>>({});
  const [atualizacao, setAtualizacao] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  useAvisoMudancas(enviando || Object.values(alterados).some(Boolean), aoMudarEstadoSujo);
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/documentos-oficiais", { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json(); if (!resposta.ok) throw new Error("Não foi possível consultar os documentos oficiais."); setDocumentos(dados.itens);
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); });
    return () => controle.abort();
  }, []);
  function alterar(chave: string, campo: "arquivoUrl" | "versao", valor: string) {
    setDocumentos((atuais) => atuais.map((item) => item.chave === chave ? { ...item, [campo]: valor } : item));
    setAlterados((atuais) => ({ ...atuais, [chave]: true })); setSucesso("");
  }
  async function enviar(arquivo?: File, chave?: string) {
    if (!arquivo) return;
    if (chave && (!arquivo.name.toLowerCase().endsWith(".pdf") || (arquivo.type && arquivo.type !== "application/pdf"))) { setErro("Estatuto e Regimento aceitam apenas PDF."); return; }
    setEnviando(true); setErro(""); setSucesso("");
    try {
      const resultado = await enviarArquivoPainel(arquivo, "privada");
      if (chave) alterar(chave, "arquivoUrl", resultado.url);
      setAtualizacao((valor) => valor + 1);
      setSucesso(chave ? "PDF enviado. Clique em Salvar versão para atualizar o site." : `“${arquivo.name}” foi guardado na biblioteca e continua privado.`);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível enviar o arquivo."); }
    finally { setEnviando(false); }
  }
  async function salvar(item: DocumentoOficial) {
    setEnviando(true); setErro(""); setSucesso("");
    try {
      const resultado = await requisitarPainel<{ itens: DocumentoOficial[] }>("/api/documentos-oficiais", { method: "PUT", ...corpoJson(item) });
      setDocumentos((atuais) => atuais.map((atual) => atual.chave === item.chave ? resultado.itens.find((novo) => novo.chave === item.chave)! : atual));
      setAlterados((atuais) => ({ ...atuais, [item.chave]: false })); setSucesso("Última versão atualizada em todos os locais do site.");
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a versão."); }
    finally { setEnviando(false); }
  }
  return <section className="painel-documentos">
    <MensagensPainel erro={erro} sucesso={sucesso} />
    {aba === "arquivos" ? <><label className="biblioteca-envio"><strong>Enviar arquivo para a biblioteca</strong><span>PDF, imagens, documentos, planilhas, apresentações, CSV e TXT de até 10 MB.</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.odt,.ods,.odp" disabled={enviando} onChange={(evento) => { void enviar(evento.target.files?.[0]); evento.target.value = ""; }} /></label><p>Os uploads ficam privados até serem utilizados em uma publicação. Você também pode continuar enviando arquivos diretamente nos editores.</p><ListaBiblioteca atualizacao={atualizacao} /></> : <><p>Escolha a última versão de cada documento. Salvar atualiza os links públicos e o leitor do Estatuto.</p><div className="grade-documentos-oficiais">{documentos.map((item) => <article key={item.chave}><span>PDF</span><h2>{item.titulo}</h2><p>Última versão{item.versao ? ` · ${item.versao}` : ""}</p><label>Versão ou identificação<input value={item.versao} maxLength={60} placeholder="Ex.: 2027" onChange={(evento) => alterar(item.chave, "versao", evento.target.value)} /></label><label>Enviar novo PDF<input type="file" accept="application/pdf,.pdf" disabled={enviando} onChange={(evento) => { void enviar(evento.target.files?.[0], item.chave); evento.target.value = ""; }} /></label><EscolherArquivo aceitar="pdf" selecionar={(arquivo) => alterar(item.chave, "arquivoUrl", arquivo.url)} /><a href={item.arquivoUrl} target="_blank" rel="noreferrer">Abrir PDF selecionado ↗</a><button type="button" className="pev-botao" disabled={enviando || !alterados[item.chave]} onClick={() => void salvar(item)}>Salvar versão</button></article>)}</div></>}
  </section>;
}
