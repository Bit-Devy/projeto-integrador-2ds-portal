// ativa os recursos do navegador
"use client";

// reúne as turmas e suas salas sem duplicar os cadastros do mapa
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";
import type { DadosMapa, TurmaAtividadeMapa } from "../mapa/tipos";
import { nomesTurnos } from "../mapa/tipos";
import { CabecalhoPainel, Campo, MensagensPainel, confirmarSaida, requisitarPainel, useAvisoMudancas, type AoMudarEstadoSujo } from "./painel-eventos-comum";
import { confirmarNoPainel } from "./confirmacao-painel";
import { anoDoPortal } from "../conteudo/periodos";
import ArquivoAnual from "./ArquivoAnual";
import HistoricoTurmaPainel from "./HistoricoTurmaPainel";
const turmaVazia = { ano: anoDoPortal(), nome: "", nivelEnsino: "medio", serie: "", turma: "", turno: "manha", turnoParcial: false, horarioInicial: "", horarioFinal: "", tipo: "aula_regular", curso: "", inicioValidade: "", fimValidade: "", ativo: true, publicado: true };

// organiza a busca e a edição das turmas do colégio
export default function PainelTurmas({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo }) {
  const [dados, setDados] = useState<DadosMapa>({ categorias: [], locais: [], turmas: [], ensalamentos: [] });
  const [turma, setTurma] = useState<(typeof turmaVazia & { id?: number }) | null>(null);
  const [vincularSala, setVincularSala] = useState(false);
  const [salaId, setSalaId] = useState("");
  const [arquivoAberto, setArquivoAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [visao, setVisao] = useState("ativas");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mudou, setMudou] = useState(false);
  const [conflitos, setConflitos] = useState<Array<{ id: number; nome: string }> | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (conflitos) dialogo.current?.showModal(); else dialogo.current?.close(); }, [conflitos]);
  useAvisoMudancas(mudou, aoMudarEstadoSujo);
  // carrega os cadastros internos junto com as salas disponíveis
  const carregar = useCallback(async () => {
    try { setDados(await requisitarPainel<DadosMapa>("/api/mapa?todos=1")); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as turmas."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { const inicio = setTimeout(() => { void carregar(); }, 0); return () => clearTimeout(inicio); }, [carregar]);
  // pede confirmação antes de descartar alterações do formulário
  async function fechar() {
    if (salvando || !await confirmarSaida(mudou)) return false;
    setTurma(null); setMudou(false); setErro(""); return true;
  }
  // abre o cadastro com os dados da turma e seu vínculo atual
  async function editarTurma(item?: TurmaAtividadeMapa) {
    if (!await fechar()) return;
    setTurma(item ? { ...item } : { ...turmaVazia, ano: anoDoPortal() });
    const vinculo = dados.ensalamentos.find((registro) => registro.turmaAtividadeId === item?.id && registro.ativo && registro.localId);
    setVincularSala(Boolean(vinculo)); setSalaId(vinculo?.localId ? String(vinculo.localId) : ""); setSucesso("");
  }
  // publica a turma e seu vínculo na mesma operação do servidor
  async function salvar(substituirOcupacoes: number[] = []) {
    if (salvando || !turma) return;
    setSalvando(true); setErro(""); setSucesso("");
    try {
      // mantém os vínculos existentes quando a sala não foi trocada
      const vinculoAtual = dados.ensalamentos.find((registro) => registro.turmaAtividadeId === turma.id && registro.ativo && registro.localId);
      const escolhaSala = !vincularSala ? { desvincularSala: true } : vinculoAtual?.localId === Number(salaId) ? {} : { salaId: Number(salaId) };
      const resposta = await fetch("/api/mapa", { method: turma.id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entidade: "turmas", id: turma.id, dados: { ...turma, publicado: turma.ativo && turma.publicado, ...escolhaSala, substituirOcupacoes } }) });
      const resultado = await resposta.json();
      if (resposta.status === 409 && resultado.conflitos?.length) { setConflitos(resultado.conflitos); return; }
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar a turma.");
      setTurma(null); setMudou(false); setSucesso("Turma salva. O mapa e os representantes já usam o cadastro atualizado."); await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }
  // revisa cada mudança da lista usando uma janela do site
  async function alterarEstado(item: TurmaAtividadeMapa, acao: "publicar" | "ocultar" | "arquivar" | "restaurar" | "excluir") {
    if (salvando) return;
    const perguntas = {
      publicar: `Publicar a turma “${item.nome}”? Ela ficará disponível no portal e no cadastro de representantes.`,
      ocultar: `Retirar a turma “${item.nome}” do público? Ela continuará cadastrada, mas não aparecerá como turma pública.`,
      arquivar: `Arquivar a turma “${item.nome}”? Ela sairá do público e sua ocupação de sala será liberada.`,
      restaurar: `Restaurar a turma “${item.nome}” como rascunho? Confira sua sala antes de publicar novamente.`,
      excluir: `Excluir definitivamente a turma arquivada “${item.nome}”? Os vínculos de sala serão removidos. Os representantes e os registros de campeonatos e reuniões serão preservados.`,
    };
    if (!await confirmarNoPainel("Confirmar alteração da turma", perguntas[acao], "Confirmar", "Cancelar")) return;
    setSalvando(true); setErro(""); setSucesso("");
    try {
      const resposta = await fetch(acao === "excluir" ? `/api/mapa?entidade=turmas&id=${item.id}` : "/api/mapa", { method: acao === "excluir" ? "DELETE" : "PUT", headers: { "content-type": "application/json" }, ...(acao === "excluir" ? {} : { body: JSON.stringify({ entidade: "turmas", id: item.id, dados: { ...item, ativo: acao !== "arquivar", publicado: acao === "publicar" } }) }) });
      const resultado = await resposta.json();
      if (resposta.status === 409 && resultado.conflitos?.length) { const vinculo = dados.ensalamentos.find((registro) => registro.turmaAtividadeId === item.id && registro.ativo && registro.localId); setTurma({ ...item, ativo: true, publicado: true }); setVincularSala(Boolean(vinculo)); setSalaId(String(vinculo?.localId || "")); setMudou(true); setConflitos(resultado.conflitos); return; }
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível alterar a turma.");
      setSucesso(acao === "excluir" ? "Turma excluída. Os registros históricos foram preservados." : acao === "restaurar" ? "Turma restaurada como rascunho. Confira a sala e publique quando estiver pronta." : "Turma atualizada."); await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível alterar a turma."); }
    finally { setSalvando(false); }
  }
  // aplica os filtros sem esconder os registros arquivados da administração
  const salasDisponiveis = dados.locais.filter((item) => item.ativo && item.publicado && dados.categorias.some((categoria) => categoria.grupo === "local" && categoria.slug === item.tipo && categoria.ativo));
  const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const turmas = dados.turmas.filter((item) => (item.ano === anoDoPortal() || visao === "arquivadas") && (visao === "todas" || (visao === "arquivadas" ? !item.ativo : visao === "ocultas" ? item.ativo && !item.publicado : item.ativo)) && `${item.nome} ${item.curso} ${item.serie} ${nomesTurnos[item.turno]}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(termo));
  return <section className="pev-painel painel-turmas">
    <CabecalhoPainel rotulo="COMUNIDADE ESCOLAR" titulo="Turmas" descricao="Cadastre turmas, defina o turno e vincule cada uma a uma sala publicada no mapa." acao={turma ? undefined : () => void editarTurma()} nomeAcao="+ Cadastrar turma" />
    <MensagensPainel erro={erro} sucesso={sucesso} />
    {arquivoAberto && <ArquivoAnual titulo="Turmas arquivadas" itens={dados.turmas.filter((item) => !item.ativo || item.ano !== anoDoPortal()).map((item) => ({ id: item.id, ano: item.ano, titulo: item.nome, descricao: [item.serie, nomesTurnos[item.turno], item.curso].filter(Boolean).join(" · "), observacao: item.observacoes }))} detalhar={(item) => <HistoricoTurmaPainel id={item.id} />} fechar={() => setArquivoAberto(false)} />}
    {/* mostra a ocupação existente antes de trocar uma turma de sala */}
    <dialog ref={dialogo} className="dialogo-anonimato" aria-labelledby="titulo-substituir-sala" onCancel={(evento) => { evento.preventDefault(); setConflitos(null); }}>
      <h2 id="titulo-substituir-sala">Substituir a ocupação desta sala?</h2><p>Esta sala está ocupada por {conflitos?.map((item) => item.nome).join(", ")} neste turno e período.</p><p>As ocupações anteriores serão desativadas e permanecerão no histórico.</p>
      <div className="acoes-dialogo-anonimato"><button className="botao-secundario" type="button" onClick={() => setConflitos(null)}>Cancelar substituição</button><button className="botao-primario" type="button" onClick={() => { const ids = conflitos?.map((item) => item.id) || []; setConflitos(null); void salvar(ids); }}>Sim, substituir ocupação</button></div>
    </dialog>
    {!turma ? <>
      <div className="ferramentas-turmas">
        <label><span>Buscar turma</span><input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome, série, curso ou turno" /></label>
        <label><span>Exibir</span><select value={visao} onChange={(evento) => setVisao(evento.target.value)}><option value="ativas">Ativas</option><option value="ocultas">Fora do público</option><option value="arquivadas">Arquivadas</option><option value="todas">Todas</option></select></label>
        <button className="pev-botao botao-arquivo-turmas" type="button" onClick={() => setArquivoAberto(true)}>Ver turmas arquivadas ›</button>
      </div>
      {carregando ? <p role="status">Carregando turmas...</p> : <p className="ajuda-busca">{turmas.length} {turmas.length === 1 ? "turma encontrada" : "turmas encontradas"}</p>}
      <div className="pev-lista">{turmas.map((item) => {
        const vinculos = dados.ensalamentos.filter((registro) => registro.turmaAtividadeId === item.id && registro.ativo && registro.localId);
        return <article className="cartao-turma" key={item.id}>
          <div>
            <span className={item.ativo && item.publicado ? "estado-publicado" : "estado-rascunho"}>{!item.ativo ? "Arquivada" : item.publicado ? "Publicada" : "Fora do público"}</span>
            <h2>{item.nome}</h2>
            <p>{nomesTurnos[item.turno]}{item.turnoParcial && ` · ${item.horarioInicial}–${item.horarioFinal}`} · {item.serie || "Série não informada"}{item.curso ? ` · ${item.curso}` : ""} · {item.ano}</p>
            <small>{vinculos.length ? vinculos.map((vinculo) => dados.locais.find((local) => local.id === vinculo.localId)?.nome || "Sala cadastrada").join(", ") : "Sem sala vinculada"}</small>
          </div>
          <div className="acoes-turma">
            <button className="pev-botao" type="button" disabled={salvando} onClick={() => void editarTurma(item)}>Editar</button>
            {item.ativo ? <>
              <button className="pev-botao" type="button" disabled={salvando} onClick={() => void alterarEstado(item, item.publicado ? "ocultar" : "publicar")}>{item.publicado ? "Tirar do público" : "Publicar"}</button>
              <button className="pev-botao" type="button" disabled={salvando} onClick={() => void alterarEstado(item, "arquivar")}>Arquivar</button>
            </> : <>
              <button className="pev-botao" type="button" onClick={() => void alterarEstado(item, "restaurar")} disabled={salvando || item.ano !== anoDoPortal()}>Restaurar</button>
              <button className="pev-botao" type="button" disabled={salvando} onClick={() => void alterarEstado(item, "excluir")}>Excluir</button>
            </>}
          </div>
        </article>;
      })}</div>
      {!carregando && !turmas.length && <p>Nenhuma turma encontrada. Altere os filtros ou cadastre uma turma.</p>}
    </> : <form className="pev-formulario" onSubmit={(evento: FormEvent<HTMLFormElement>) => { evento.preventDefault(); void salvar(); }}>
      <div className="pev-formulario__topo"><h2>Cadastro da turma</h2><button className="pev-botao" type="button" onClick={fechar}>Fechar</button></div>
      <div className="pev-grade-campos">
        <>
          {/* usa nome nível tipo e turno para identificar a turma */}
          <Campo rotulo="Nome da turma"><input required value={turma.nome} onChange={(e) => { setTurma({ ...turma, nome: e.target.value }); setMudou(true); }} placeholder="Ex.: 2DS" /></Campo>
          <Campo rotulo="Nível de ensino"><select value={turma.nivelEnsino} onChange={(e) => { setTurma({ ...turma, nivelEnsino: e.target.value }); setMudou(true); }}><option value="medio">Ensino Médio</option><option value="fundamental">Ensino Fundamental</option><option value="outro">Outro</option></select></Campo>
          <Campo rotulo="Ano ou série"><input value={turma.serie} onChange={(e) => { setTurma({ ...turma, serie: e.target.value }); setMudou(true); }} placeholder="Ex.: 2ª série" /></Campo>
          <Campo rotulo="Tipo"><select value={turma.tipo} onChange={(e) => { setTurma({ ...turma, tipo: e.target.value }); setMudou(true); }}>{dados.categorias.filter((item) => item.grupo === "atividade" && item.ativo).map((item) => <option key={item.id} value={item.slug}>{item.nome}</option>)}</select></Campo>
          <Campo rotulo="Turno"><select required value={turma.turno} onChange={(e) => { setTurma({ ...turma, turno: e.target.value }); setMudou(true); }}>{Object.entries(nomesTurnos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo>
          <Campo rotulo="Curso (opcional)"><input value={turma.curso} onChange={(e) => { setTurma({ ...turma, curso: e.target.value }); setMudou(true); }} /></Campo>
          <Campo rotulo="Ano escolar" dica="Turmas de outros anos ficam arquivadas e não ocupam salas nem recebem novos representantes."><select value={turma.ano} onChange={async (evento) => { const ano = Number(evento.target.value); if (ano === turma.ano) return; if (!await confirmarNoPainel("Alterar o ano da turma?", `Você está alterando a turma para ${ano}. ${ano !== anoDoPortal() ? "Como esse não é o ano atual, ela ficará arquivada e seus representantes serão encerrados." : "Confira os dados antes de publicar esta turma no ano atual."}`, "Alterar ano", "Cancelar")) return; setTurma({ ...turma, ano, ...(ano !== anoDoPortal() ? { ativo: false, publicado: false } : {}) }); setMudou(true); }} >{Array.from({ length: 300 }, (_, indice) => 2199 - indice).map((ano) => <option key={ano}>{ano}</option>)}</select></Campo>
        </>
      </div>
      {/* a atribuição de sala é opcional mas exige uma sala publicada quando usada */}
      {<details open={vincularSala || undefined} className="salas-vinculo"><summary>Vincular a uma sala (opcional)</summary><label><CheckboxComAjuda checked={vincularSala} onChange={(e) => { setVincularSala(e.target.checked); setMudou(true); }} explicacao="Marcado: vincula esta turma a uma sala publicada no turno e período escolhidos. Desmarcado: remove o vínculo atual ao salvar, preservando seu histórico." aria-label={"Escolher uma sala para esta turma"} />Escolher uma sala para esta turma</label>{vincularSala && <Campo rotulo={`Sala publicada · turno ${nomesTurnos[turma.turno as keyof typeof nomesTurnos]}`}><select required value={salaId} onChange={(e) => { setSalaId(e.target.value); setMudou(true); }}><option value="">Selecione a sala</option>{salasDisponiveis.map((item) => <option key={item.id} value={item.id}>{item.nome || item.numero}</option>)}</select></Campo>}<p>A ocupação usa o turno e o ano escolar da turma. Alterar esses campos também confere conflitos. Ao desmarcar a escolha, o vínculo atual será retirado quando você salvar.</p></details>}
      <div className="pev-opcoes">
        {(["ativo", "publicado"] as const).map((campo) => <label key={campo}><CheckboxComAjuda disabled={turma.ano !== anoDoPortal()} checked={turma[campo]} onChange={(evento) => { setTurma({ ...turma, [campo]: evento.target.checked }); setMudou(true); }} explicacao={descricaoCheckbox(campo)} aria-label={campo === "ativo" ? "Turma ativa" : "Publicar turma"} />{campo === "ativo" ? "Turma ativa" : "Publicar turma"}</label>)}
        <label><CheckboxComAjuda checked={turma.turnoParcial} onChange={(evento) => { setTurma({ ...turma, turnoParcial: evento.target.checked }); setMudou(true); }} explicacao="Marcado: você escolhe a hora de início e de fim. A turma pode dividir a sala com outras turmas parciais do mesmo turno, em horários diferentes. Desmarcado: a turma usa a sala durante todo o turno." aria-label="Turno parcial ou extracurricular" />Turno parcial / extracurricular</label>
      </div>
      {turma.turnoParcial && <fieldset className="pev-bloco campos-turno-parcial">
        <legend>Horário das aulas</legend>
        <div className="pev-grade-campos">
          <Campo rotulo="Das"><input type="time" required value={turma.horarioInicial} onChange={(evento) => { setTurma({ ...turma, horarioInicial: evento.target.value }); setMudou(true); }} /></Campo>
          <Campo rotulo="Até"><input type="time" required value={turma.horarioFinal} onChange={(evento) => { setTurma({ ...turma, horarioFinal: evento.target.value }); setMudou(true); }} /></Campo>
        </div>
      </fieldset>}
      <div className="pev-acoes-formulario"><button className="pev-botao" type="button" onClick={fechar}>Cancelar</button><button className="pev-botao pev-botao--primario" type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar turma"}</button></div>
    </form>}
  </section>;
}
