"use client";

// explica as opções de marcar sem alterar seu funcionamento
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";

// confere as datas dos mandatos nos indicadores
import { mandatoVigenteEm } from "../eventos/mandato";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
// importa as turmas que também aparecem no mapa público
import type { TurmaAtividadeMapaPublica } from "../mapa/tipos";
import { rotuloDiasDeAula } from "../mapa/dias-de-aula";
import {
  CabecalhoPainel,
  Campo,
  EstadoVazio,
  MensagensPainel,
  classeStatus,
  confirmarSaida,
  corpoJson,
  dataLegivel,
  niveisPainel,
  normalizarBusca,
  obterBooleano,
  obterNumero,
  obterTexto,
  requisitarPainel,
  requisitarTodasPaginasPainel,
  turnosPainel,
  useAvisoMudancas,
  type AoMudarEstadoSujo,
  type Identificador,
} from "./painel-eventos-comum";

import { anoDoPortal, dataDoPortal } from "../conteudo/periodos";
import type { ContatoRepresentante } from "../eventos/tipos";
import { nomesContatosRepresentante } from "../eventos/contatos-representante";
import ArquivoAnual from "./ArquivoAnual";
import { confirmarNoPainel } from "./confirmacao-painel";

type Representante = {
  ano: number;
  turmaAtividadeId: number | null;
  id: Identificador;
  nome: string;
  nomeExibicao: string;
  nivelEnsino: string;
  serie: string;
  turma: string;
  turno: string;
  funcao: string;
  inicioMandato: string;
  fimMandato: string;
  ativo: boolean;
  publicado: boolean;
  ordem: number;
  observacaoPublica: string;
  observacaoInterna: string;
  contatos: ContatoRepresentante[];
  contatosPublicos: boolean;
  destituidoEm: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

type FormularioRepresentante = Omit<Representante, "id" | "criadoEm" | "atualizadoEm" | "publicado">;
type Encerramento = { item: Representante; inicioMandato: string; fimMandato: string };
type Visao = "todos" | "duplicacoes" | "sem-representante";

const formularioVazio: FormularioRepresentante = {
  ano: anoDoPortal(), turmaAtividadeId: null,
  nome: "", nomeExibicao: "", nivelEnsino: "medio", serie: "", turma: "", turno: "manha",
  funcao: "titular", inicioMandato: "", fimMandato: "", ativo: true, ordem: 0,
  observacaoPublica: "", observacaoInterna: "", contatos: [], contatosPublicos: false, destituidoEm: "",
};

const funcoes = [
  ["titular", "Representante titular"], ["vice", "Vice-representante"],
  ["suplente", "Suplente"], ["outra", "Outra função"],
] as const;

export default function PainelRepresentantes({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  const [arquivoAberto, setArquivoAberto] = useState(false);
  const [itens, setItens] = useState<Representante[]>([]);
  const [turmasPublicadas, setTurmasPublicadas] = useState<TurmaAtividadeMapaPublica[]>([]);
  const [formulario, setFormulario] = useState<FormularioRepresentante | null>(null);
  const [idEditando, setIdEditando] = useState<Identificador | null>(null);
  const [selecionado, setSelecionado] = useState<Identificador | null>(null);
  const [encerramento, setEncerramento] = useState<Encerramento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [mudou, setMudou] = useState(false);
  const [visao, setVisao] = useState<Visao>("todos");
  const [busca, setBusca] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("ativos");

  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [resultado, mapa] = await Promise.all([
        requisitarTodasPaginasPainel<Record<string, unknown>>("/api/representantes?todos=1", ["representantes"]),
        requisitarPainel<{ turmas: TurmaAtividadeMapaPublica[] }>("/api/mapa", { cache: "no-store" }),
      ]);
      setItens(resultado.map(normalizarRepresentante));
      setTurmasPublicadas(mapa.turmas);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao carregar representantes.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { const temporizador = window.setTimeout(() => void carregar(), 0); return () => window.clearTimeout(temporizador); }, [carregar]);

  const chavesDuplicadas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const item of itens.filter((registro) => registro.ativo && mandatoVigenteEm(registro))) {
      const chave = `${normalizarBusca(item.nome)}|${normalizarBusca(item.turma)}|${item.funcao}`;
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
    return new Set([...contagem].filter(([, total]) => total > 1).map(([chave]) => chave));
  }, [itens]);

  const semRepresentante = useMemo(() => turmasPublicadas.filter((turma) => !itens.some((item) => item.ativo && mandatoVigenteEm(item) && item.funcao === "titular" && item.turmaAtividadeId === turma.id)), [itens, turmasPublicadas]);
  const anos = useMemo(() => Array.from(new Set(itens.map((item) => item.serie).filter(Boolean))).sort(), [itens]);
  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return itens.filter((item) => {
      const chave = `${normalizarBusca(item.nome)}|${normalizarBusca(item.turma)}|${item.funcao}`;
      const texto = normalizarBusca(`${item.nome} ${item.nomeExibicao} ${item.turma} ${item.serie}`);
      return (item.ano === anoDoPortal() || filtroEstado === "arquivados") && (visao !== "duplicacoes" || chavesDuplicadas.has(chave))
        && (!termo || texto.includes(termo))
        && (!filtroTurno || item.turno === filtroTurno)
        && (!filtroNivel || item.nivelEnsino === filtroNivel)
        && (!filtroAno || item.serie === filtroAno)
        && (!filtroFuncao || item.funcao === filtroFuncao)
        && (filtroEstado !== "ativos" || item.ativo)
        && (filtroEstado !== "arquivados" || !item.ativo);
    }).sort((a, b) => compararTurmas(a.turma, b.turma) || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [busca, chavesDuplicadas, filtroAno, filtroEstado, filtroFuncao, filtroNivel, filtroTurno, itens, visao]);

  function mudar<K extends keyof FormularioRepresentante>(chave: K, valor: FormularioRepresentante[K]) {
    setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual);
    setMudou(true);
    setSucesso("");
  }

  async function novo(turma?: TurmaAtividadeMapaPublica) {
    if (!await confirmarSaida(mudou)) return;
    setFormulario({ ...formularioVazio, ano: anoDoPortal(), ...(turma ? dadosDaTurma(turma) : {}) });
    setIdEditando(null);
    setMudou(false);
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function editar(item: Representante) {
    if (item.ano !== anoDoPortal()) return;
    if (!await confirmarSaida(mudou)) return;
    const { id: _id, criadoEm: _criadoEm, atualizadoEm: _atualizadoEm, publicado: _publicado, ...dados } = item;
    void _id;
    void _criadoEm;
    void _atualizadoEm;
    void _publicado;
    setFormulario(dados);
    setIdEditando(item.id);
    setMudou(false);
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function fechar() {
    if (!await confirmarSaida(mudou)) return;
    setFormulario(null);
    setIdEditando(null);
    setEncerramento(null);
    setMudou(false);
    setErro("");
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const dados = { ...formulario, nomeExibicao: formulario.nomeExibicao || formulario.nome };
      await requisitarPainel("/api/representantes", {
        method: idEditando === null ? "POST" : "PUT",
        ...corpoJson(idEditando === null ? { dados } : { id: idEditando, dados }),
      });
      setFormulario(null);
      setIdEditando(null);
      setMudou(false);
      setSucesso(idEditando === null ? "Representante cadastrado com sucesso." : "Representante atualizado com sucesso.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o representante.");
    } finally {
      setSalvando(false);
    }
  }

  // confirma a destituição antes de pedir as datas reais do mandato
  async function abrirEncerramento(item: Representante) {
    if (!await confirmarNoPainel(`${acaoDestituir(item.funcao)}?`, `Deseja encerrar o mandato de ${item.nome} na turma ${item.turma}? A vaga ficará disponível depois de salvar as datas. As presenças das reuniões serão preservadas.`, "Informar datas do mandato", "Cancelar")) return;
    const hoje = dataDoPortal();
    setEncerramento({ item, inicioMandato: item.inicioMandato || item.criadoEm?.slice(0, 10) || "", fimMandato: item.fimMandato && item.fimMandato < hoje ? item.fimMandato : hoje });
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarEncerramento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!encerramento || salvando) return;
    const { item, inicioMandato, fimMandato } = encerramento;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      await requisitarPainel("/api/representantes", {
        method: "PUT",
        ...corpoJson({ id: item.id, acao: "destituir", confirmado: true, dados: { inicioMandato, fimMandato } }),
      });
      setEncerramento(null);
      setMudou(false);
      setSelecionado(null);
      setSucesso("Mandato encerrado. A vaga da turma está disponível para um novo cadastro.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível encerrar o mandato.");
    } finally {
      setSalvando(false);
    }
  }

  async function restaurar(item: Representante) {
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel("/api/representantes", { method: "PUT", ...corpoJson({ id: item.id, dados: { ativo: true } }) });
      setSucesso("Representante reativado. O cadastro aparece no portal durante a vigência do mandato.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível reativar o registro.");
    } finally {
      setSalvando(false);
    }
  }

  function exportarCsv() {
    const celula = (valor: string | number | boolean) => `"${String(valor).replaceAll('"', '""')}"`;
    const linhas = [["Ano escolar", "Nome", "Nome de exibição", "Nível", "Ano ou série", "Turma", "Turno", "Função", "Início", "Fim", "Ativo", "Publicado"].map(celula).join(",")];
    for (const item of itens) linhas.push([item.ano, item.nome, item.nomeExibicao, item.nivelEnsino, item.serie, item.turma, item.turno, item.funcao, item.inicioMandato, item.fimMandato, item.ativo, item.publicado].map(celula).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${linhas.join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `representantes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="pev-painel painel-representantes" onChangeCapture={() => { if (formulario) setMudou(true); }} aria-label="Representantes">
      <CabecalhoPainel rotulo="COMUNIDADE ESCOLAR" titulo="Representantes" descricao="Gerencie os mandatos e os contatos dos representantes de turma." acao={formulario || encerramento ? undefined : () => novo()} nomeAcao="+ Cadastrar representante" />
      <MensagensPainel erro={erro} sucesso={sucesso} />
      {arquivoAberto && <ArquivoAnual titulo="Representantes arquivados" itens={itens.filter((item) => !item.ativo || item.ano !== anoDoPortal()).map((item) => ({ id: item.id, ano: item.ano, titulo: item.nomeExibicao || item.nome, descricao: `${item.turma} · ${item.serie} · ${nomeTurno(item.turno)} · ${item.funcao}`, observacao: item.observacaoPublica }))} fechar={() => setArquivoAberto(false)} />}

      {encerramento ? <form className="pev-formulario" onSubmit={salvarEncerramento}>
        <div className="pev-formulario__topo"><div><h2>Encerrar mandato</h2><p>{encerramento.item.nome} · {encerramento.item.turma} · {nomeFuncao(encerramento.item.funcao)}</p></div></div>
        <p>Informe as datas em que a pessoa exerceu a função.</p>
        <div className="pev-grade-campos">
          <Campo rotulo="Início do mandato"><input type="date" required max={encerramento.fimMandato || dataDoPortal()} value={encerramento.inicioMandato} onChange={(evento) => { setEncerramento({ ...encerramento, inicioMandato: evento.target.value }); setMudou(true); }} /></Campo>
          <Campo rotulo="Fim do mandato"><input type="date" required min={encerramento.inicioMandato || undefined} max={dataDoPortal()} value={encerramento.fimMandato} onChange={(evento) => { setEncerramento({ ...encerramento, fimMandato: evento.target.value }); setMudou(true); }} /></Campo>
        </div>
        <div className="pev-acoes-formulario"><button className="pev-botao" type="button" disabled={salvando} onClick={fechar}>Cancelar</button><button type="submit" className="pev-botao pev-botao--perigoso" disabled={salvando}>{salvando ? "Salvando…" : "Salvar e encerrar mandato"}</button></div>
      </form> : formulario ? (
        <form className="pev-formulario" onSubmit={salvar}>
          <div className="pev-formulario__topo"><div><small>{idEditando === null ? "NOVO MANDATO" : "EDITANDO MANDATO"}</small><h2>{idEditando === null ? "Cadastrar representante" : formulario.nome}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={fechar}>Fechar</button></div>
          <fieldset className="pev-bloco"><legend>Identificação pública</legend><div className="pev-grade-campos">
            <Campo rotulo="Nome"><input value={formulario.nome} onChange={(e) => mudar("nome", e.target.value)} readOnly={idEditando !== null} required maxLength={160} autoComplete="off" /></Campo>
            <Campo rotulo="Nome de exibição" dica="Deixe em branco para usar o nome acima."><input value={formulario.nomeExibicao} onChange={(e) => mudar("nomeExibicao", e.target.value)} maxLength={160} /></Campo>
            {/* oferece somente turmas publicadas e preenche os dados sem digitação livre */}
            {idEditando !== null ? <Campo rotulo="Turma do mandato"><input value={formulario.turma} readOnly /></Campo> : <Campo rotulo="Turma publicada" dica="Cadastre novas turmas no menu Turmas."><select value={formulario.turmaAtividadeId ?? ""} required onChange={(e) => {
              const turma = turmasPublicadas.find((item) => item.id === Number(e.target.value));
              setFormulario((atual) => atual ? { ...atual, ...(turma ? dadosDaTurma(turma) : { turmaAtividadeId: null, turma: "", serie: "" }) } : atual);
              setMudou(true);
            }}><option value="">Selecione a turma</option>{turmasPublicadas.map((turma) => <option key={turma.id} value={turma.id}>{rotuloTurmaDisponivel(turma)}</option>)}</select></Campo>}
            <Campo rotulo="Nível de ensino"><input value={niveisPainel.find(([valor]) => valor === formulario.nivelEnsino)?.[1] || formulario.nivelEnsino} readOnly /></Campo>
            <Campo rotulo="Ano ou série"><input value={formulario.serie} readOnly /></Campo>
            <Campo rotulo="Turno"><input value={nomeTurno(formulario.turno)} readOnly /></Campo>
            <Campo rotulo="Função">{idEditando === null ? <select value={formulario.funcao} onChange={(e) => mudar("funcao", e.target.value)} required>{funcoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select> : <input value={nomeFuncao(formulario.funcao)} readOnly />}</Campo>
            <Campo rotulo="Ordem na turma"><input type="number" min={0} value={formulario.ordem} onChange={(e) => mudar("ordem", Number(e.target.value))} /></Campo>
          </div></fieldset>
          <fieldset className="pev-bloco"><legend>Mandato e observações</legend><div className="pev-grade-campos">
            <Campo rotulo="Início do mandato"><input type="date" value={formulario.inicioMandato} readOnly={idEditando !== null && formulario.ativo} required={Boolean(formulario.destituidoEm)} max={formulario.destituidoEm ? dataDoPortal() : undefined} onChange={(e) => mudar("inicioMandato", e.target.value)} /></Campo>
            <Campo rotulo="Fim do mandato"><input type="date" min={formulario.inicioMandato || undefined} max={formulario.destituidoEm ? dataDoPortal() : undefined} value={formulario.fimMandato} readOnly={idEditando !== null && formulario.ativo} required={Boolean(formulario.destituidoEm)} onChange={(e) => mudar("fimMandato", e.target.value)} /></Campo>
            <Campo rotulo="Observação pública" largo><textarea rows={3} value={formulario.observacaoPublica} onChange={(e) => mudar("observacaoPublica", e.target.value)} /></Campo>
            <Campo rotulo="Observação interna" dica="Nunca aparece na página pública." largo><textarea rows={3} value={formulario.observacaoInterna} onChange={(e) => mudar("observacaoInterna", e.target.value)} /></Campo>
          </div>
          {idEditando === null && <div className="pev-opcoes"><label><CheckboxComAjuda checked={formulario.ativo} onChange={(e) => mudar("ativo", e.target.checked)} explicacao={descricaoCheckbox("mandato")} aria-label="Mandato ativo" /><span>Mandato ativo</span></label></div>}
          </fieldset>
          <CamposContato contatos={formulario.contatos} publicos={formulario.contatosPublicos} alterar={(contatos) => mudar("contatos", contatos)} publicar={(publicos) => mudar("contatosPublicos", publicos)} />
          {mudou && <p className="pev-alteracoes" role="status">Há mudanças não salvas.</p>}
          <div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={fechar}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar representante"}</button></div>
        </form>
      ) : (
        <>
          {/* dá acesso às pendências sem misturar os indicadores com os filtros */}
          <div className="pev-resumo">
            <button type="button" aria-pressed={visao === "todos"} onClick={() => setVisao("todos")}><strong>{itens.filter((item) => item.ativo && mandatoVigenteEm(item)).length}</strong><span>Mandatos ativos</span></button>
            <button type="button" aria-pressed={visao === "duplicacoes"} onClick={() => setVisao("duplicacoes")}><strong>{chavesDuplicadas.size}</strong><span>Possíveis duplicações</span></button>
            <button type="button" aria-pressed={visao === "sem-representante"} onClick={() => setVisao("sem-representante")}><strong>{semRepresentante.length}</strong><span>Turmas sem titular</span></button>
          </div>
          {visao !== "sem-representante" && <div className="pev-filtros filtros-representantes-painel">
            <label className="pev-filtro--busca"><span>Buscar</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou turma — 3º J, 3 J ou 3J" /></label>
            <label><span>Turno</span><select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Nível</span><select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>{niveisPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Ano / série</span><select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}><option value="">Todos</option>{anos.map((ano) => <option key={ano}>{ano}</option>)}</select></label>
            <label><span>Função</span><select value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)}><option value="">Todas</option>{funcoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Estado</span><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="ativos">Ativos</option><option value="todos">Todos</option><option value="arquivados">Arquivados</option></select></label>
          </div>}
          {visao === "sem-representante" ? <ListaTurmasSemRepresentante turmas={semRepresentante} carregando={carregando} cadastrar={novo} /> : <>
            <div className="pev-barra-resultados barra-representantes">
              <p aria-live="polite">{filtrados.length} {filtrados.length === 1 ? "registro" : "registros"}</p>
              <div className="acoes-lista-representantes" role="group" aria-label="Ações da lista de representantes">
                <button type="button" className="pev-botao" onClick={exportarCsv} disabled={!itens.length}>Exportar CSV</button>
                <button type="button" className="pev-botao" onClick={() => setArquivoAberto(true)}>Arquivados</button>
              </div>
            </div>
            {carregando && <EstadoVazio titulo="Carregando representantes…" texto="Aguarde enquanto consultamos os mandatos." />}
            {!carregando && !filtrados.length && <EstadoVazio titulo={visao === "duplicacoes" ? "Nenhuma duplicação encontrada" : "Nenhum representante encontrado"} texto={itens.length ? "Altere os filtros ou a busca para ver outros registros." : "Cadastre o primeiro mandato pelo botão acima."} />}
            <div className="pev-lista">{filtrados.map((item) => {
              const duplicado = chavesDuplicadas.has(`${normalizarBusca(item.nome)}|${normalizarBusca(item.turma)}|${item.funcao}`);
              const aberto = selecionado === item.id;
              const anoAtual = item.ano === anoDoPortal();
              const detalheId = `detalhe-mandato-${item.id}`;
              const vigente = item.ativo && mandatoVigenteEm(item);
              return <article className="pev-cartao cartao-mandato" key={item.id}>
                <div className="pev-cartao__estados">
                  <span className={classeStatus(vigente ? "publicado" : item.ativo ? "agendada" : "arquivado")}>{vigente ? "Vigente" : item.ativo ? "Agendado" : item.destituidoEm ? "Mandato encerrado" : "Arquivado"}</span>
                  {duplicado && <span className="pev-status pev-status--atencao">Revisar duplicação</span>}
                </div>
                <div className="pev-cartao__conteudo">
                  <h2><button type="button" className="nome-representante-acao" aria-expanded={aberto} aria-controls={aberto ? detalheId : undefined} onClick={() => setSelecionado(aberto ? null : item.id)}>{item.nomeExibicao || item.nome} <span aria-hidden="true">{aberto ? "⌃" : "›"}</span></button></h2>
                  <p><strong>{item.turma || "Turma não informada"}</strong> · {nomeFuncao(item.funcao)} · {nomeTurno(item.turno)}</p>
                </div>
                {aberto && <section className="detalhe-mandato" id={detalheId} aria-label={`Dados de ${item.nome}`}>
                  <dl className="dados-mandato">
                    <div><dt>Turma</dt><dd>{item.turma} · {item.ano}</dd></div>
                    <div><dt>Nível e série</dt><dd>{niveisPainel.find(([chave]) => chave === item.nivelEnsino)?.[1] || item.nivelEnsino} · {item.serie}</dd></div>
                    <div><dt>Mandato</dt><dd>{item.inicioMandato || item.fimMandato ? `${dataLegivel(item.inicioMandato)} a ${dataLegivel(item.fimMandato)}` : "Datas não informadas"}</dd></div>
                    {item.contatos.map((contato, indice) => <div key={indice}><dt>{nomesContatosRepresentante[contato.tipo]}</dt><dd>{contato.valor}</dd></div>)}
                  </dl>
                  {item.observacaoPublica && <p>{item.observacaoPublica}</p>}
                  {item.observacaoInterna && <p><strong>Observação interna:</strong> {item.observacaoInterna}</p>}
                  {anoAtual && <div className="pev-acoes-formulario">
                    <button type="button" className="pev-botao" onClick={() => void editar(item)}>Editar representante</button>
                    {item.ativo && <button type="button" className="pev-botao pev-botao--perigoso" disabled={salvando} onClick={() => void abrirEncerramento(item)}>{acaoDestituir(item.funcao)}</button>}
                    {!item.ativo && !item.destituidoEm && (!item.fimMandato || item.fimMandato >= dataDoPortal()) && <button type="button" className="pev-botao" disabled={salvando} onClick={() => void restaurar(item)}>Reativar</button>}
                  </div>}
                </section>}
              </article>;
            })}</div>
          </>}
        </>
      )}
    </section>
  );
}

// permite adicionar até dois contatos com publicação opcional
function CamposContato({ contatos, publicos, alterar, publicar }: { contatos: ContatoRepresentante[]; publicos: boolean; alterar: (contatos: ContatoRepresentante[]) => void; publicar: (publicos: boolean) => void }) {
  function mudar(indice: number, contato: ContatoRepresentante) {
    alterar(contatos.map((atual, posicao) => posicao === indice ? contato : atual));
  }
  return <fieldset className="pev-bloco">
    <legend>Contatos opcionais</legend>
    <p>Adicione até dois contatos autorizados pelo representante.</p>
    {contatos.map((contato, indice) => <div className="linha-contato-representante" key={indice}>
      <Campo rotulo={`Tipo de contato ${indice + 1}`}><select value={contato.tipo} onChange={(evento) => mudar(indice, { tipo: evento.target.value as ContatoRepresentante["tipo"], valor: "" })}>
        {Object.entries(nomesContatosRepresentante).map(([tipo, nome]) => <option value={tipo} key={tipo}>{nome}</option>)}
      </select></Campo>
      <Campo rotulo={nomesContatosRepresentante[contato.tipo]}><input type={contato.tipo === "email" ? "email" : "tel"} value={contato.valor} maxLength={contato.tipo === "email" ? 254 : 30} required placeholder={contato.tipo === "email" ? "nome@exemplo.org" : "(41) 99999-9999"} onChange={(evento) => mudar(indice, { ...contato, valor: evento.target.value })} /></Campo>
      <button className="pev-botao" type="button" aria-label={`Remover contato ${indice + 1}`} onClick={() => alterar(contatos.filter((_, posicao) => posicao !== indice))}>Remover</button>
    </div>)}
    <div className="pev-opcoes">
      {contatos.length < 2 && <button className="pev-botao" type="button" onClick={() => alterar([...contatos, { tipo: "whatsapp", valor: "" }])}>+ Adicionar contato</button>}
      {!!contatos.length && <label><CheckboxComAjuda checked={publicos} onChange={(evento) => publicar(evento.target.checked)} explicacao="Marcado: os contatos aparecem nos detalhes públicos do representante durante o mandato. Desmarcado: os contatos ficam no painel." aria-label="Exibir contatos no portal" /><span>Exibir contatos no portal</span></label>}
    </div>
  </fieldset>;
}

function ListaTurmasSemRepresentante({ turmas, carregando, cadastrar }: { turmas: TurmaAtividadeMapaPublica[]; carregando: boolean; cadastrar: (turma: TurmaAtividadeMapaPublica) => void }) {
  if (carregando) return <EstadoVazio titulo="Verificando as turmas…" texto="Estamos comparando a lista do mapa com os mandatos ativos." />;
  if (!turmas.length) return <EstadoVazio titulo="Nenhuma pendência encontrada" texto="Todas as turmas cadastradas no mapa possuem um representante titular ativo." />;
  return <div className="pev-grade-pendencias">{turmas.map((turma) => <article key={turma.id}><div><strong>{rotuloTurmaDisponivel(turma)}</strong><span>Sem representante titular ativo</span></div><button type="button" className="pev-botao" onClick={() => cadastrar(turma)}>Cadastrar titular</button></article>)}</div>;
}

function nomeFuncao(valor: string) { return funcoes.find(([chave]) => chave === valor)?.[1] ?? valor; }
function acaoDestituir(funcao: string) { return `Destituir ${funcao === "outra" ? "representante" : nomeFuncao(funcao).toLowerCase()}`; }
function nomeTurno(valor: string) { return turnosPainel.find(([chave]) => chave === valor)?.[1] ?? valor; }
function compararTurmas(a: string, b: string) { return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }); }

function normalizarRepresentante(registro: Record<string, unknown>): Representante {
  return {
    ano: obterNumero(registro, "ano") || anoDoPortal(),
    turmaAtividadeId: Number(registro.turmaAtividadeId) || null,
    id: (registro.id as Identificador) ?? crypto.randomUUID(), nome: obterTexto(registro, "nome"),
    nomeExibicao: obterTexto(registro, "nomeExibicao", "nomeExibicaoPublica"), nivelEnsino: obterTexto(registro, "nivelEnsino", "nivel") || "outro",
    serie: obterTexto(registro, "serie", "anoSerie", "ano"), turma: obterTexto(registro, "turma"),
    turno: obterTexto(registro, "turno"), funcao: obterTexto(registro, "funcao") || "titular",
    inicioMandato: obterTexto(registro, "inicioMandato"), fimMandato: obterTexto(registro, "fimMandato"),
    ativo: obterBooleano(registro, "ativo", true), publicado: obterBooleano(registro, "publicado"),
    ordem: obterNumero(registro, "ordem"), observacaoPublica: obterTexto(registro, "observacaoPublica"),
    contatos: Array.isArray(registro.contatos) ? registro.contatos as ContatoRepresentante[] : [],
    contatosPublicos: obterBooleano(registro, "contatosPublicos"), destituidoEm: obterTexto(registro, "destituidoEm"),
    criadoEm: obterTexto(registro, "criadoEm") || undefined,
    observacaoInterna: obterTexto(registro, "observacaoInterna"), atualizadoEm: obterTexto(registro, "atualizadoEm") || undefined,
  };
}

// distingue turmas de idiomas com o mesmo nome pelo curso e pelos dias e horários
function rotuloTurmaDisponivel(turma: TurmaAtividadeMapaPublica) {
  const horario = turma.turnoParcial ? `${rotuloDiasDeAula(turma.diasSemana, true)} · ${turma.horarioInicial}–${turma.horarioFinal}` : "";
  return [turma.nome, turma.curso, nomeTurno(turma.turno), horario].filter(Boolean).join(" · ");
}

// copia os dados da turma escolhida para o mandato
function dadosDaTurma(turma: TurmaAtividadeMapaPublica) {
  return { ano: turma.ano, turmaAtividadeId: turma.id, turma: turma.nome, nivelEnsino: turma.nivelEnsino, serie: turma.serie || "Não informado", turno: turma.turno };
}
