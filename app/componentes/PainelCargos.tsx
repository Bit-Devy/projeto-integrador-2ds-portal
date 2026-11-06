"use client";

// reúne a edição dos menus e a confirmação de senha do administrador
import { useEffect, useRef, useState } from "react";
import { cargosPainel, type CargoPainel, type RecursoPainel } from "../lib/cargos";
import { confirmarSaida, useAvisoMudancas, type AoMudarEstadoSujo } from "./painel-eventos-comum";
import "./painel-cargos.css";

type CargoConfigurado = CargoPainel & { personalizado: boolean; protegido: boolean };
type Menu = { chave: RecursoPainel; nome: string };
type Consulta = { itens: CargoConfigurado[]; menus: Menu[]; erro?: string };
type Modo = "nenhum" | "consultar" | "editar";
type Escolhas = Partial<Record<RecursoPainel, Modo>>;
const protegidos = ["geral", "presidente", "vice-presidente"];
const nomesModos = { nenhum: "Sem acesso", consultar: "Somente ver", editar: "Editar" };

// usa as mesmas listas de acesso para mostrar e revisar cada cargo
function escolhasDoCargo(cargo: CargoPainel, menus: Menu[]): Escolhas {
  return Object.fromEntries(menus.map((menu) => [menu.chave, cargo.editar.includes(menu.chave) ? "editar" : cargo.consultar.includes(menu.chave) ? "consultar" : "nenhum"]));
}

// permite escolher os menus sem oferecer acesso à administração
export default function PainelCargos({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo }) {
  const [itens, setItens] = useState<CargoConfigurado[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<CargoConfigurado | null>(null);
  const [escolhas, setEscolhas] = useState<Escolhas>({});
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [revisao, setRevisao] = useState<"salvar" | "restaurar" | null>(null);
  const [senhaAtual, setSenhaAtual] = useState("");
  const janela = useRef<HTMLDialogElement>(null);
  const tituloJanela = useRef<HTMLHeadingElement>(null);
  const mudou = Boolean(editando && menus.some((menu) => escolhas[menu.chave] !== escolhasDoCargo(editando, menus)[menu.chave]));
  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  // carrega os acessos efetivos e os nomes dos menus disponíveis
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/cargos", { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json() as Consulta;
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar os cargos.");
      setItens(dados.itens); setMenus(dados.menus.filter((menu) => menu.chave !== "geral"));
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); }).finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, []);

  // mantém a senha apenas durante a revisão no popup do site
  useEffect(() => {
    if (revisao && !janela.current?.open) { janela.current?.showModal(); tituloJanela.current?.focus(); }
    else if (!revisao) janela.current?.close();
  }, [revisao]);
  function abrir(cargo: CargoConfigurado) {
    if (cargo.protegido || protegidos.includes(cargo.chave)) return;
    setEditando(cargo); setEscolhas(escolhasDoCargo(cargo, menus)); setErro(""); setSucesso("");
  }
  async function fecharEditor() {
    if (salvando || !await confirmarSaida(mudou)) return;
    setEditando(null); setEscolhas({}); setErro("");
  }
  function revisar(acao: "salvar" | "restaurar") { setSenhaAtual(""); setErro(""); setRevisao(acao); }
  function fecharRevisao() { if (salvando) return; setRevisao(null); setSenhaAtual(""); setErro(""); }

  // restaura os acessos a partir dos padrões oficiais do cargo
  const padrao = editando ? cargosPainel.find((cargo) => cargo.chave === editando.chave) : undefined;
  const escolhasRevisadas = revisao === "restaurar" && padrao ? escolhasDoCargo(padrao, menus) : escolhas;
  const menusRevisados = revisao === "restaurar" ? menus.filter((menu) => escolhasRevisadas[menu.chave] !== "nenhum") : menus;

  // envia somente depois da revisão e da confirmação da senha atual
  async function confirmar() {
    if (!editando || !revisao || salvando) return;
    setSalvando(true); setErro("");
    try {
      const resposta = await fetch("/api/cargos", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ cargo: editando.chave, editar: menus.filter((menu) => escolhasRevisadas[menu.chave] === "editar").map((menu) => menu.chave), consultar: menus.filter((menu) => escolhasRevisadas[menu.chave] === "consultar").map((menu) => menu.chave), restaurar: revisao === "restaurar", senhaAtual, confirmado: true }) });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar os acessos.");
      const consulta = await fetch("/api/cargos", { cache: "no-store" });
      const dados = await consulta.json() as Consulta;
      if (!consulta.ok) throw new Error(dados.erro || "Os acessos foram salvos, mas não foi possível atualizar a lista. Reabra este menu para conferir.");
      setItens(dados.itens); setMenus(dados.menus.filter((menu) => menu.chave !== "geral"));
      setSucesso(`${revisao === "restaurar" ? `Os acessos de ${editando.nome} voltaram ao padrão.` : `Os acessos de ${editando.nome} foram atualizados.`} Os menus aparecem atualizados ao recarregar o painel.`);
      setSenhaAtual(""); setRevisao(null); setEditando(null); setEscolhas({});
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar os acessos."); setSenhaAtual(""); }
    finally { setSalvando(false); }
  }

  const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const encontrados = itens.filter((cargo) => `${cargo.nome} ${cargo.descricao}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(termo));
  return <section className="painel-cargos">
    <header className="topo-painel"><div><span className="rotulo-secao">ADMINISTRAÇÃO</span><h1>Gerenciamento de cargos</h1><p>Defina quais menus cada cargo pode consultar ou editar. Toda alteração exige revisão e confirmação da sua senha.</p></div></header>
    {erro && !revisao && <p role="alert" className="erro-painel">{erro}</p>}
    {sucesso && <p role="status" className="sucesso-painel">{sucesso}</p>}
    {!editando ? <>
      <p className="cargos-aviso">Administração geral, Presidente e Vice-Presidente mantêm seus acessos protegidos. A seção Administração pertence somente ao acesso geral.</p>
      <label className="cargos-busca">Localizar cargo<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Ex.: esporte ou secretário" /></label>
      {carregando ? <p role="status">Carregando cargos...</p> : <p className="cargos-total">{encontrados.length} {encontrados.length === 1 ? "cargo encontrado" : "cargos encontrados"}</p>}
      <div className="cargos-grade">{encontrados.map((cargo) => {
        const protegido = cargo.protegido || protegidos.includes(cargo.chave);
        return <article key={cargo.chave} className={protegido ? "cargo-protegido" : ""}><span className="cargos-estado">{protegido ? "Acessos protegidos" : cargo.personalizado ? "Acessos personalizados" : "Acessos padrão"}</span><h2>{cargo.nome}</h2><p>{cargo.descricao}</p><details><summary>Consultar acessos atuais</summary><ul className="cargos-lista-acessos">{menus.filter((menu) => cargo.editar.includes(menu.chave) || cargo.consultar.includes(menu.chave)).map((menu) => <li key={menu.chave}><span>{menu.nome}</span><strong>{cargo.editar.includes(menu.chave) ? "Editar" : "Somente ver"}</strong></li>)}</ul>{!menus.some((menu) => cargo.editar.includes(menu.chave) || cargo.consultar.includes(menu.chave)) && <p>Nenhum menu liberado.</p>}{cargo.chave === "geral" && <p>Inclui a seção Administração.</p>}</details>{!protegido && <button type="button" className="pev-botao" onClick={() => abrir(cargo)}>Editar acessos</button>}</article>;
      })}</div>
      {!carregando && !encontrados.length && <p>Nenhum cargo encontrado. Altere a busca.</p>}
    </> : <div className="cargos-editor">
      <div className="cargos-editor-topo"><div><span className="rotulo-secao">EDITAR ACESSOS</span><h2>{editando.nome}</h2></div><button type="button" className="pev-botao" disabled={salvando} onClick={() => void fecharEditor()}>Cancelar edição</button></div>
      <p className="cargos-ajuda">Em <strong>Somente ver</strong>, a pessoa consulta os registros internos, incluindo rascunhos e arquivados, sem alterar nenhum conteúdo. Em <strong>Editar</strong>, usa o menu normal de gestão. As restrições da área responsável continuam valendo. Para enviar ou escolher anexos, libere também a biblioteca de arquivos.</p>
      <div className="cargos-menus">{menus.map((menu) => <label key={menu.chave}><span>{menu.nome}</span><select aria-label={`Acesso a ${menu.nome}`} value={escolhas[menu.chave] || "nenhum"} disabled={salvando} onChange={(evento) => setEscolhas({ ...escolhas, [menu.chave]: evento.target.value as Modo })}><option value="nenhum">Sem acesso</option><option value="consultar">Somente ver</option><option value="editar">Editar</option></select></label>)}</div>
      <div className="cargos-acoes"><button type="button" className="pev-botao" disabled={salvando || !padrao} onClick={() => revisar("restaurar")}>Restaurar acessos padrão</button><button type="button" className="pev-botao pev-botao--primario" disabled={salvando || !mudou} onClick={() => revisar("salvar")}>Revisar e salvar acessos</button></div>
    </div>}
    <dialog ref={janela} className="dialogo-anonimato dialogo-cargos" aria-labelledby="titulo-revisao-cargos" onCancel={(evento) => { evento.preventDefault(); fecharRevisao(); }}>
      <h2 ref={tituloJanela} tabIndex={-1} id="titulo-revisao-cargos">{revisao === "restaurar" ? "Restaurar acessos padrão?" : "Revisar acessos do cargo"}</h2>
      {editando && <><p>{revisao === "restaurar" ? <>Por padrão, o cargo <strong>{editando.nome}</strong> tem estes acessos:</> : <>Confira como ficarão os acessos de <strong>{editando.nome}</strong>:</>}</p><ul className="cargos-lista-acessos cargos-revisao">{menusRevisados.map((menu) => <li key={menu.chave}><span>{menu.nome}</span><strong>{nomesModos[escolhasRevisadas[menu.chave] || "nenhum"]}</strong></li>)}</ul>{!menusRevisados.length && <p>Este cargo não tem menus liberados por padrão.</p>}<p>{revisao === "restaurar" ? "A confirmação substituirá as escolhas atuais pelos acessos padrão deste cargo." : "As permissões salvas serão verificadas também pelo servidor."}</p></>}
      {erro && <p role="alert" className="erro-painel">{erro}</p>}
      <form onSubmit={(evento) => { evento.preventDefault(); void confirmar(); }}><label className="cargos-senha">Confirme sua senha do acesso geral<input type="password" autoComplete="current-password" required maxLength={200} value={senhaAtual} disabled={salvando} onChange={(evento) => setSenhaAtual(evento.target.value)} /></label><div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" disabled={salvando} onClick={fecharRevisao}>Cancelar</button><button type="submit" className="botao-primario" disabled={salvando}>{salvando ? "Salvando..." : revisao === "restaurar" ? "Confirmar restauração" : "Confirmar acessos"}</button></div></form>
    </dialog>
  </section>;
}
