"use client";

// mostra chaves de ativação sem apagar registros nem perder a configuração dos setores
import { useEffect, useState } from "react";
import { modulosPadrao, nomesModulos, type ModuloPortal, type ModulosPortal } from "../servicos/tipos";
import { confirmarNoPainel } from "./confirmacao-painel";
import { confirmarSaida, type AoMudarEstadoSujo } from "./painel-eventos-comum";

export default function PainelModulos({ aoMudarEstadoSujo, somenteConsulta = false }: { aoMudarEstadoSujo: AoMudarEstadoSujo; somenteConsulta?: boolean }) {
  const [modulos, setModulos] = useState<ModulosPortal | null>(null);
  const [sujo, setSujo] = useState(false); const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState(""); const [aviso, setAviso] = useState("");
  useEffect(() => { const controle = new AbortController(); fetch("/api/modulos", { signal: controle.signal, cache: "no-store" }).then(async (resposta) => { if (!resposta.ok) throw new Error("Não foi possível carregar as páginas."); setModulos((await resposta.json()).modulos); }).catch((falha) => { if (!controle.signal.aborted) setErro(falha.message); }); return () => controle.abort(); }, []);
  useEffect(() => { aoMudarEstadoSujo(sujo); }, [sujo, aoMudarEstadoSujo]);
  async function salvar() {
    if (!await confirmarNoPainel("Atualizar páginas do portal?", "As páginas desativadas sairão dos menus e ficarão indisponíveis pelo endereço direto. Seus dados continuam salvos.", "Salvar alterações", "Cancelar")) return;
    setSalvando(true); setErro(""); setAviso("");
    try { const resposta = await fetch("/api/modulos", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ modulos }) }); const dados = await resposta.json(); if (!resposta.ok) throw new Error(dados.erro); setModulos(dados.modulos); setSujo(false); setAviso("Páginas atualizadas."); window.dispatchEvent(new Event("gecep-modulos-atualizados")); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); } finally { setSalvando(false); }
  }
  return <section className="servicos-painel"><header className="topo-painel"><div><span className="rotulo-secao">ORGANIZAÇÃO DO PORTAL</span><h1>Páginas e módulos</h1><p>Ligue ou desligue as páginas e os setores. As publicações ficam preservadas.</p></div></header>{somenteConsulta && <p>Somente consulta. Este acesso não permite mudanças.</p>}{erro && <p role="alert" className="erro-painel">{erro}</p>}{aviso && <p role="status" className="resultado-faltas">{aviso}</p>}
    {modulos && <><div className="lista-modulos">{(Object.keys(modulosPadrao) as ModuloPortal[]).map((chave) => { const setor = ["merenda", "apmf", "gecep", "robotica"].includes(chave); return <div className={setor ? "modulo-filho" : ""} key={chave}><div><h2>{nomesModulos[chave]}</h2><p>{setor ? `Mostra este setor na cantina${!modulos.cantina ? "; a cantina está desativada" : ""}.` : chave === "calendario" ? "Agenda, calendário escolar e calculadora de faltas no menu principal." : chave === "cantina" ? "Página no menu Mais. A chave principal também oculta todos os setores." : "Atalho direto no menu principal e vagas publicadas."}</p></div><button className="chave-modulo" type="button" role="switch" aria-checked={modulos[chave]} aria-label={`Ativar ${nomesModulos[chave]}`} aria-describedby={`ajuda-${chave}`} disabled={somenteConsulta || salvando} onClick={() => { setModulos({ ...modulos, [chave]: !modulos[chave] }); setSujo(true); setAviso(""); }}><span /></button><small id={`ajuda-${chave}`}>{modulos[chave] ? "Ativado" : "Desativado"}</small></div>; })}</div>{!somenteConsulta && <div className="acoes-formulario-painel"><button type="button" disabled={!sujo || salvando} onClick={async () => { if (!await confirmarSaida(sujo)) return; const resposta = await fetch("/api/modulos", { cache: "no-store" }); if (resposta.ok) { setModulos((await resposta.json()).modulos); setSujo(false); } }}>Cancelar</button><button type="button" disabled={!sujo || salvando} onClick={() => void salvar()}>{salvando ? "Salvando…" : "Salvar alterações"}</button></div>}</>}
  </section>;
}
