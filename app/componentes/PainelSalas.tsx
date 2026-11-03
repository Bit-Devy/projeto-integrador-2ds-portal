// ativa os recursos do navegador
"use client";

// explica as opções de marcar sem alterar seu funcionamento
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";

// importa os controles do formulário e os dados já usados no mapa
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { DadosMapa, LocalMapa, TurmaAtividadeMapa } from "../mapa/tipos";
import { alasMapa, nomesTurnos } from "../mapa/tipos";
import { CabecalhoPainel, Campo, MensagensPainel, confirmarSaida, requisitarPainel, useAvisoMudancas, type AoMudarEstadoSujo } from "./painel-eventos-comum";

// reúne somente os campos necessários ao cadastro simples
const turmaVazia = { nome: "", nivelEnsino: "medio", serie: "", turma: "", turno: "manha", tipo: "aula_regular", curso: "", inicioValidade: "", fimValidade: "", ativo: true, publicado: true };
const salaVazia = { nome: "", numero: "", ala: "", tipo: "sala_aula", ativo: true, publicado: true };

// mostra as salas físicas e as turmas usando o mesmo banco do mapa
export default function PainelSalas({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo }) {
  const [dados, setDados] = useState<DadosMapa>({ categorias: [], locais: [], turmas: [], ensalamentos: [] });
  const [aba, setAba] = useState<"turmas" | "locais">("turmas");
  const [turma, setTurma] = useState<(typeof turmaVazia & { id?: number }) | null>(null);
  const [sala, setSala] = useState<(typeof salaVazia & { id?: number }) | null>(null);
  const [vincularSala, setVincularSala] = useState(false);
  const [salaId, setSalaId] = useState("");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mudou, setMudou] = useState(false);
  // guarda as ocupações que precisam de confirmação antes da substituição
  const [conflitos, setConflitos] = useState<Array<{ id: number; nome: string }> | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (conflitos) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [conflitos]);
  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  // recarrega as listas após cada cadastro
  const carregar = useCallback(async () => {
    try { setDados(await requisitarPainel<DadosMapa>("/api/mapa?todos=1")); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as salas."); }
  }, []);
  useEffect(() => { const inicio = setTimeout(() => { void carregar(); }, 0); return () => clearTimeout(inicio); }, [carregar]);

  // permite sair do cadastro sem perder mudanças por acidente
  async function fechar() {
    if (!await confirmarSaida(mudou)) return false;
    setTurma(null); setSala(null); setMudou(false); setErro("");
    return true;
  }

  // abre uma turma mantendo os dados existentes do mapa
  async function editarTurma(item?: TurmaAtividadeMapa) {
    if (!await fechar()) return;
    setTurma(item ? { ...item } : { ...turmaVazia });
    const vinculo = dados.ensalamentos.find((registro) => registro.turmaAtividadeId === item?.id && registro.ativo && registro.localId);
    setVincularSala(Boolean(vinculo)); setSalaId(vinculo?.localId ? String(vinculo.localId) : "");
  }

  // abre o cadastro curto de uma sala física
  async function editarSala(item?: LocalMapa) {
    if (!await fechar()) return;
    setSala(item ? { ...item } : { ...salaVazia });
  }

  // salva a turma e pede confirmação apenas se houver outra ocupação
  async function salvar(substituirOcupacoes: number[] = []) {
    if (salvando) return;
    setSalvando(true); setErro(""); setSucesso("");
    const registro = turma || sala;
    if (!registro) { setSalvando(false); return; }
    const corpo = { entidade: turma ? "turmas" : "locais", id: registro.id, dados: { ...registro, ...(turma && vincularSala ? { salaId: Number(salaId) } : {}) } };
    async function enviar(): Promise<boolean> {
      const resposta = await fetch("/api/mapa", { method: registro?.id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...corpo, dados: { ...corpo.dados, substituirOcupacoes } }) });
      const resultado = await resposta.json() as { erro?: string; conflitos?: Array<{ id: number; nome: string }> };
      if (resposta.status === 409 && resultado.conflitos?.length) {
        setConflitos(resultado.conflitos);
        return false;
      }
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar.");
      return true;
    }
    try {
      if (await enviar()) { setTurma(null); setSala(null); setMudou(false); setSucesso("Cadastro salvo. O mapa e as opções dos representantes já usam os mesmos dados."); await carregar(); }
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }

  // mantém apenas as salas publicadas disponíveis para um novo vínculo
  const salasDisponiveis = dados.locais.filter((item) => item.ativo && item.publicado && dados.categorias.some((categoria) => categoria.grupo === "local" && categoria.slug === item.tipo && categoria.ativo));
  return <section className="pev-painel">
    <CabecalhoPainel rotulo="COMUNIDADE ESCOLAR" titulo="Salas" descricao="Cadastre turmas e salas. Os registros são os mesmos usados no mapa, no ensalamento e nos representantes." />
    <MensagensPainel erro={erro} sucesso={sucesso} />
    {/* mostra quais ocupações serão substituídas e permite desistir sem alterar o mapa */}
    <dialog ref={dialogo} className="dialogo-anonimato" aria-labelledby="titulo-substituir-sala" onCancel={(evento) => { evento.preventDefault(); setConflitos(null); }}>
      <h2 id="titulo-substituir-sala">Substituir a ocupação desta sala?</h2>
      <p>Esta sala está ocupada por {conflitos?.map((item) => item.nome).join(", ")} neste turno e período.</p>
      <p>Tem certeza de que deseja substituir? As ocupações anteriores serão desativadas e permanecerão no histórico.</p>
      <div className="acoes-dialogo-anonimato"><button className="botao-secundario" type="button" onClick={() => setConflitos(null)}>Cancelar substituição</button><button className="botao-primario" type="button" onClick={() => { const ids = conflitos?.map((item) => item.id) || []; setConflitos(null); void salvar(ids); }}>Sim, substituir ocupação</button></div>
    </dialog>
    {!turma && !sala ? <>
      {/* alterna entre as duas listas sem abrir ferramentas avançadas */}
      <div className="pev-opcoes"><button className="pev-botao" type="button" aria-pressed={aba === "turmas"} onClick={() => setAba("turmas")}>Turmas</button><button className="pev-botao" type="button" aria-pressed={aba === "locais"} onClick={() => setAba("locais")}>Salas físicas</button></div>
      <div className="pev-barra-resultados"><label>Buscar<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></label><button className="pev-botao pev-botao--primario" type="button" onClick={() => aba === "turmas" ? editarTurma() : editarSala()}>{aba === "turmas" ? "+ Cadastrar turma" : "+ Publicar sala"}</button></div>
      <div className="pev-lista">{(aba === "turmas" ? dados.turmas : dados.locais).filter((item) => `${item.nome} ${"numero" in item ? item.numero : item.turno}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))).map((item) => <article className="pev-cartao" key={item.id}><div><h2>{item.nome || ("numero" in item ? `Sala ${item.numero}` : "Turma")}</h2><p>{"turno" in item ? nomesTurnos[item.turno] : item.ala} · {item.ativo && item.publicado ? "Publicado" : "Inativo ou rascunho"}</p></div><button className="pev-botao" type="button" onClick={() => "turno" in item ? editarTurma(item) : editarSala(item)}>Editar</button></article>)}</div>
    </> : <form className="pev-formulario" onSubmit={(evento: FormEvent<HTMLFormElement>) => { evento.preventDefault(); void salvar(); }}>
      <div className="pev-formulario__topo"><h2>{turma ? "Cadastro da turma" : "Cadastro da sala"}</h2><button className="pev-botao" type="button" onClick={fechar}>Fechar</button></div>
      <div className="pev-grade-campos">
        {turma && <>
          {/* usa nome nível tipo e turno para identificar a turma */}
          <Campo rotulo="Nome da turma"><input required value={turma.nome} onChange={(e) => { setTurma({ ...turma, nome: e.target.value }); setMudou(true); }} placeholder="Ex.: 2DS" /></Campo>
          <Campo rotulo="Nível de ensino"><select value={turma.nivelEnsino} onChange={(e) => { setTurma({ ...turma, nivelEnsino: e.target.value }); setMudou(true); }}><option value="medio">Ensino Médio</option><option value="fundamental">Ensino Fundamental</option><option value="outro">Outro</option></select></Campo>
          <Campo rotulo="Ano ou série"><input value={turma.serie} onChange={(e) => { setTurma({ ...turma, serie: e.target.value }); setMudou(true); }} placeholder="Ex.: 2ª série" /></Campo>
          <Campo rotulo="Tipo"><select value={turma.tipo} onChange={(e) => { setTurma({ ...turma, tipo: e.target.value }); setMudou(true); }}>{dados.categorias.filter((item) => item.grupo === "atividade" && item.ativo).map((item) => <option key={item.id} value={item.slug}>{item.nome}</option>)}</select></Campo>
          <Campo rotulo="Turno"><select required value={turma.turno} onChange={(e) => { setTurma({ ...turma, turno: e.target.value }); setMudou(true); }}>{Object.entries(nomesTurnos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo>
          <Campo rotulo="Curso (opcional)"><input value={turma.curso} onChange={(e) => { setTurma({ ...turma, curso: e.target.value }); setMudou(true); }} /></Campo>
          <Campo rotulo="Válida a partir de (opcional)"><input type="date" value={turma.inicioValidade} onChange={(e) => { setTurma({ ...turma, inicioValidade: e.target.value }); setMudou(true); }} /></Campo>
          <Campo rotulo="Válida até (opcional)"><input type="date" value={turma.fimValidade} min={turma.inicioValidade || undefined} onChange={(e) => { setTurma({ ...turma, fimValidade: e.target.value }); setMudou(true); }} /></Campo>
        </>}
        {sala && <>
          <Campo rotulo="Nome da sala"><input required value={sala.nome} onChange={(e) => { setSala({ ...sala, nome: e.target.value }); setMudou(true); }} placeholder="Ex.: Sala 214" /></Campo>
          <Campo rotulo="Número (opcional)"><input value={sala.numero} onChange={(e) => { setSala({ ...sala, numero: e.target.value }); setMudou(true); }} /></Campo>
          <Campo rotulo="Ala"><select required value={sala.ala} onChange={(e) => { setSala({ ...sala, ala: e.target.value }); setMudou(true); }}><option value="">Selecione</option>{alasMapa.map((ala) => <option key={ala}>{ala}</option>)}</select></Campo>
        </>}
      </div>
      {/* a atribuição de sala é opcional mas exige uma sala publicada quando usada */}
      {turma && <details open={vincularSala || undefined} className="salas-vinculo"><summary>Vincular a uma sala (opcional)</summary><label><CheckboxComAjuda checked={vincularSala} onChange={(e) => { setVincularSala(e.target.checked); setMudou(true); }} explicacao={descricaoCheckbox("vincularSala")} aria-label={"Escolher uma sala para esta turma"} />Escolher uma sala para esta turma</label>{vincularSala && <Campo rotulo={`Sala publicada · turno ${nomesTurnos[turma.turno as keyof typeof nomesTurnos]}`}><select required value={salaId} onChange={(e) => { setSalaId(e.target.value); setMudou(true); }}><option value="">Selecione a sala</option>{salasDisponiveis.map((item) => <option key={item.id} value={item.id}>{item.nome || item.numero}</option>)}</select></Campo>}<p>A ocupação usa o turno e a validade da turma. Alterar esses campos também confere conflitos. Sem escolher uma sala, os vínculos existentes são mantidos.</p></details>}
      <div className="pev-opcoes">{(["ativo", "publicado"] as const).map((campo) => <label key={campo}><CheckboxComAjuda checked={(turma || sala)![campo]} onChange={(e) => { if (turma) setTurma({ ...turma, [campo]: e.target.checked }); if (sala) setSala({ ...sala, [campo]: e.target.checked }); setMudou(true); }} explicacao={descricaoCheckbox(campo)} aria-label={campo === "ativo" ? "Ativo" : "Publicado"} />{campo === "ativo" ? "Ativo" : "Publicado"}</label>)}</div>
      <div className="pev-acoes-formulario"><button className="pev-botao" type="button" onClick={fechar}>Cancelar</button><button className="pev-botao pev-botao--primario" type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar cadastro"}</button></div>
    </form>}
  </section>;
}
