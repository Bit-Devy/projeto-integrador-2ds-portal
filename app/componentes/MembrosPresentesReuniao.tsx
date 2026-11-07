"use client";

// busca os nomes da equipe e guarda as escolhas da reunião
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cargosPainel } from "../lib/cargos";
import { turnosEquipe, type MembroEquipePresenca } from "../lib/equipe";
import CheckboxComAjuda from "./CheckboxComAjuda";
import "./membros-presentes-reuniao.css";

export type MembroPresenteGecep = {
  membroId: number;
  cargoChave: string;
  vaga: string;
  nome: string;
  cargo: string;
  vagaNome: string;
  turno?: string;
};

// compara a pessoa e a vaga sem depender de uma senha do painel
function mesmaPessoa(presenca: MembroPresenteGecep, membro: MembroEquipePresenca) {
  return presenca.membroId === membro.id && presenca.cargoChave === membro.cargoChave && presenca.vaga === membro.vaga;
}

// mostra o turno com o nome usado no restante do portal
function nomeTurno(turno?: string) {
  return turno ? turnosEquipe.find((item) => item.chave === turno)?.nome || turno : "";
}

export default function MembrosPresentesReuniao({ valor, mudar, desabilitado = false }: { valor: MembroPresenteGecep[]; mudar: (valor: MembroPresenteGecep[]) => void; desabilitado?: boolean }) {
  const [membros, setMembros] = useState<MembroEquipePresenca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [cargoEscolhido, setCargoEscolhido] = useState("");
  const [revisao, setRevisao] = useState<string | null>(null);
  const [escolhidos, setEscolhidos] = useState<number[]>([]);
  const janela = useRef<HTMLDialogElement>(null);
  const titulo = useId();

  // considera somente os integrantes publicados na equipe
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/equipe-presencas", { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar a Equipe.");
      setMembros(dados.itens); setErro("");
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); }).finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [tentativa]);

  // usa uma janela do site para revisar um ou mais ocupantes do cargo
  useEffect(() => { if (revisao) janela.current?.showModal(); }, [revisao]);
  function fechar() { janela.current?.close(); setRevisao(null); }
  function abrir() {
    if (!cargoEscolhido) return;
    setEscolhidos(membros.filter((membro) => membro.cargoChave === cargoEscolhido && valor.some((item) => mesmaPessoa(item, membro))).map((membro) => membro.id));
    setRevisao(cargoEscolhido);
  }
  function confirmar() {
    const atuais = membros.filter((membro) => membro.cargoChave === revisao);
    const manter = valor.filter((item) => !atuais.some((membro) => mesmaPessoa(item, membro)));
    const adicionar = atuais.filter((membro) => escolhidos.includes(membro.id)).map((membro) => valor.find((item) => mesmaPessoa(item, membro)) || ({ membroId: membro.id, cargoChave: membro.cargoChave, vaga: membro.vaga, nome: membro.nome, cargo: membro.cargo, vagaNome: membro.vagaNome, turno: membro.turno }));
    mudar([...manter, ...adicionar]); fechar();
  }

  const ocupantes = membros.filter((membro) => membro.cargoChave === revisao);
  const nomeCargo = cargosPainel.find((cargo) => cargo.chave === revisao)?.nome;
  return <fieldset className="pev-bloco membros-presentes"><legend>Membros do GECEP presentes</legend>
    <p>Escolha o cargo e marque quem participou. Os nomes vêm da Equipe e ficam preservados nesta reunião, mesmo quando os ocupantes mudarem.</p>
    <div className="membros-presentes__escolha"><label><span>Cargo</span><select value={cargoEscolhido} onChange={(evento) => setCargoEscolhido(evento.target.value)} disabled={desabilitado || carregando}><option value="">Selecione um cargo</option>{cargosPainel.map((cargo) => <option key={cargo.chave} value={cargo.chave}>{cargo.nome}</option>)}</select></label><button type="button" className="pev-botao" onClick={abrir} disabled={!cargoEscolhido || desabilitado || carregando || Boolean(erro)} aria-haspopup="dialog">Escolher presentes</button></div>
    {carregando && <p role="status">Consultando a Equipe…</p>}
    {erro && <p role="alert">{erro} <button type="button" className="pev-botao" onClick={() => { setCarregando(true); setTentativa((atual) => atual + 1); }}>Tentar novamente</button></p>}
    {!valor.length && <p className="membros-presentes__vazio">Nenhum integrante selecionado.</p>}
    <ul className="membros-presentes__lista">{valor.map((item) => <li key={`${item.membroId}-${item.cargoChave}-${item.vaga}`}><div><strong>{item.nome}</strong><small>{item.cargo}{item.vagaNome ? ` · ${item.vagaNome}` : ""}{item.turno ? ` · ${nomeTurno(item.turno)}` : ""}</small></div><button type="button" className="pev-botao pev-botao--texto" disabled={desabilitado} onClick={() => mudar(valor.filter((presenca) => presenca !== item))} aria-label={`Remover ${item.nome} da reunião`}>Remover</button></li>)}</ul>
    {revisao && createPortal(<dialog ref={janela} className="dialogo-anonimato dialogo-membros-presentes" aria-labelledby={titulo} onCancel={(evento) => { evento.preventDefault(); fechar(); }}>
      <h2 id={titulo}>{nomeCargo}</h2>
      {ocupantes.length ? <><p>Marque os integrantes que estavam presentes. Você pode selecionar todos os ocupantes deste cargo.</p><div className="membros-presentes__ocupantes">{ocupantes.map((membro) => <label key={membro.id}><CheckboxComAjuda checked={escolhidos.includes(membro.id)} onChange={(evento) => setEscolhidos((atuais) => evento.target.checked ? [...atuais, membro.id] : atuais.filter((id) => id !== membro.id))} aria-label={`Presença de ${membro.nome}`} explicacao="Marcado: registra esta pessoa entre os membros presentes na reunião. Desmarcado: esta pessoa não é adicionada à reunião." /><span><strong>{membro.nome}</strong><small>{[membro.vagaNome, nomeTurno(membro.turno)].filter(Boolean).join(" · ")}</small></span></label>)}</div></> : <p role="alert">Este cargo ainda não tem integrante publicado na Equipe. Cadastre e publique a pessoa em “Equipe” antes de adicioná-la à ata. Depois reabra esta reunião para atualizar os nomes.</p>}
      <div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" onClick={fechar}>{ocupantes.length ? "Cancelar" : "Entendi"}</button>{Boolean(ocupantes.length) && <button type="button" className="botao-primario" onClick={confirmar}>Confirmar presentes</button>}</div>
    </dialog>, document.body)}
  </fieldset>;
}
