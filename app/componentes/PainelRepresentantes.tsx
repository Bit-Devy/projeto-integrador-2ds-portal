"use client";

// explica as opções de marcar sem alterar seu funcionamento
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";

// confere as datas dos mandatos nos indicadores
import { mandatoVigenteEm } from "../eventos/mandato";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
// importa as turmas que também aparecem no mapa público
import type { TurmaAtividadeMapaPublica } from "../mapa/tipos";
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

type Representante = {
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
  atualizadoEm?: string;
};

type FormularioRepresentante = Omit<Representante, "id" | "atualizadoEm">;
type Visao = "todos" | "duplicacoes" | "sem-representante";

const formularioVazio: FormularioRepresentante = {
  turmaAtividadeId: null,
  nome: "", nomeExibicao: "", nivelEnsino: "medio", serie: "", turma: "", turno: "manha",
  funcao: "titular", inicioMandato: "", fimMandato: "", ativo: true, publicado: false, ordem: 0,
  observacaoPublica: "", observacaoInterna: "",
};

const funcoes = [
  ["titular", "Representante titular"], ["vice", "Vice-representante"],
  ["suplente", "Suplente"], ["outra", "Outra função"],
] as const;

export default function PainelRepresentantes({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  const [itens, setItens] = useState<Representante[]>([]);
  const [turmasPublicadas, setTurmasPublicadas] = useState<TurmaAtividadeMapaPublica[]>([]);
  const [formulario, setFormulario] = useState<FormularioRepresentante | null>(null);
  const [idEditando, setIdEditando] = useState<Identificador | null>(null);
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

  const semRepresentante = useMemo(() => turmasPublicadas.filter((turma) => !itens.some((item) => item.ativo && item.publicado && mandatoVigenteEm(item) && item.funcao === "titular" && item.turmaAtividadeId === turma.id)).map((turma) => `${turma.nome} · ${nomeTurno(turma.turno)}`), [itens, turmasPublicadas]);
  const anos = useMemo(() => Array.from(new Set(itens.map((item) => item.serie).filter(Boolean))).sort(), [itens]);
  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return itens.filter((item) => {
      const chave = `${normalizarBusca(item.nome)}|${normalizarBusca(item.turma)}|${item.funcao}`;
      const texto = normalizarBusca(`${item.nome} ${item.nomeExibicao} ${item.turma} ${item.serie}`);
      return (visao !== "duplicacoes" || chavesDuplicadas.has(chave))
        && (!termo || texto.includes(termo))
        && (!filtroTurno || item.turno === filtroTurno)
        && (!filtroNivel || item.nivelEnsino === filtroNivel)
        && (!filtroAno || item.serie === filtroAno)
        && (!filtroFuncao || item.funcao === filtroFuncao)
        && (filtroEstado !== "ativos" || item.ativo)
        && (filtroEstado !== "arquivados" || !item.ativo)
        && (filtroEstado !== "rascunhos" || !item.publicado);
    }).sort((a, b) => compararTurmas(a.turma, b.turma) || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [busca, chavesDuplicadas, filtroAno, filtroEstado, filtroFuncao, filtroNivel, filtroTurno, itens, visao]);

  function mudar<K extends keyof FormularioRepresentante>(chave: K, valor: FormularioRepresentante[K]) {
    setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual);
    setMudou(true);
    setSucesso("");
  }

  async function novo(turma = "") {
    if (!await confirmarSaida(mudou)) return;
    const selecionada = turmasPublicadas.find((item) => `${item.nome} · ${nomeTurno(item.turno)}` === turma);
    setFormulario({ ...formularioVazio, ...(selecionada ? dadosDaTurma(selecionada) : {}) });
    setIdEditando(null);
    setMudou(false);
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function editar(item: Representante) {
    if (!await confirmarSaida(mudou)) return;
    const { id: _id, atualizadoEm: _atualizadoEm, ...dados } = item;
    void _id;
    void _atualizadoEm;
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
    setMudou(false);
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

  async function arquivar(item: Representante) {
    if (!window.confirm(`Arquivar o registro de “${item.nome}” em ${item.turma}? Reuniões antigas manterão o retrato histórico dessa pessoa.`)) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      await requisitarPainel(`/api/representantes?id=${encodeURIComponent(String(item.id))}&acao=arquivar`, { method: "DELETE" });
      setSucesso("Representante arquivado. O histórico foi preservado.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível arquivar o registro.");
    } finally {
      setSalvando(false);
    }
  }

  async function restaurar(item: Representante) {
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel("/api/representantes", { method: "PUT", ...corpoJson({ id: item.id, dados: { ativo: true } }) });
      setSucesso("Representante reativado como rascunho para revisão.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível reativar o registro.");
    } finally {
      setSalvando(false);
    }
  }

  function exportarCsv() {
    const celula = (valor: string | number | boolean) => `"${String(valor).replaceAll('"', '""')}"`;
    const linhas = [["Nome", "Nome de exibição", "Nível", "Ano ou série", "Turma", "Turno", "Função", "Início", "Fim", "Ativo", "Publicado"].map(celula).join(",")];
    for (const item of itens) linhas.push([item.nome, item.nomeExibicao, item.nivelEnsino, item.serie, item.turma, item.turno, item.funcao, item.inicioMandato, item.fimMandato, item.ativo, item.publicado].map(celula).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${linhas.join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `representantes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="pev-painel" aria-labelledby="titulo-painel-representantes">
      <CabecalhoPainel rotulo="COMUNIDADE ESCOLAR" titulo="Representantes" descricao="Gerencie mandatos e publicação sem expor dados pessoais. Registros arquivados permanecem ligados ao histórico de presença." acao={formulario ? undefined : () => novo()} nomeAcao="+ Cadastrar representante" />
      <MensagensPainel erro={erro} sucesso={sucesso} />

      {formulario ? (
        <form className="pev-formulario" onSubmit={salvar}>
          <div className="pev-formulario__topo"><div><small>{idEditando === null ? "NOVO MANDATO" : "EDITANDO MANDATO"}</small><h2 id="titulo-painel-representantes">{idEditando === null ? "Cadastrar representante" : formulario.nome}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={fechar}>Fechar</button></div>
          <fieldset className="pev-bloco"><legend>Identificação pública</legend><div className="pev-grade-campos">
            <Campo rotulo="Nome"><input value={formulario.nome} onChange={(e) => mudar("nome", e.target.value)} required maxLength={160} autoComplete="off" /></Campo>
            <Campo rotulo="Nome de exibição" dica="Deixe em branco para usar o nome acima."><input value={formulario.nomeExibicao} onChange={(e) => mudar("nomeExibicao", e.target.value)} maxLength={160} /></Campo>
            {/* oferece somente turmas publicadas e preenche os dados sem digitação livre */}
            <Campo rotulo="Turma publicada" dica="A turma precisa estar ativa e dentro da validade. Cadastre novas turmas no menu Turmas."><select value={formulario.turmaAtividadeId ?? ""} required onChange={(e) => {
              const turma = turmasPublicadas.find((item) => item.id === Number(e.target.value));
              setFormulario((atual) => atual ? { ...atual, ...(turma ? dadosDaTurma(turma) : { turmaAtividadeId: null, turma: "", serie: "" }) } : atual);
              setMudou(true);
            }}><option value="">Selecione a turma</option>{!turmasPublicadas.some((item) => item.id === formulario.turmaAtividadeId) && formulario.turmaAtividadeId && <option value={formulario.turmaAtividadeId} disabled>Turma indisponível — selecione outra</option>}{turmasPublicadas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome} · {nomeTurno(turma.turno)}</option>)}</select></Campo>
            <Campo rotulo="Nível de ensino"><input value={niveisPainel.find(([valor]) => valor === formulario.nivelEnsino)?.[1] || formulario.nivelEnsino} readOnly /></Campo>
            <Campo rotulo="Ano ou série"><input value={formulario.serie} readOnly /></Campo>
            <Campo rotulo="Turno"><input value={nomeTurno(formulario.turno)} readOnly /></Campo>
            <Campo rotulo="Função"><select value={formulario.funcao} onChange={(e) => mudar("funcao", e.target.value)} required>{funcoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo>
            <Campo rotulo="Ordem na turma"><input type="number" min={0} value={formulario.ordem} onChange={(e) => mudar("ordem", Number(e.target.value))} /></Campo>
          </div></fieldset>
          <fieldset className="pev-bloco"><legend>Mandato e visibilidade</legend><div className="pev-grade-campos">
            <Campo rotulo="Início do mandato"><input type="date" value={formulario.inicioMandato} onChange={(e) => mudar("inicioMandato", e.target.value)} /></Campo>
            <Campo rotulo="Fim do mandato"><input type="date" min={formulario.inicioMandato || undefined} value={formulario.fimMandato} onChange={(e) => mudar("fimMandato", e.target.value)} /></Campo>
            <Campo rotulo="Observação pública" largo><textarea rows={3} value={formulario.observacaoPublica} onChange={(e) => mudar("observacaoPublica", e.target.value)} /></Campo>
            <Campo rotulo="Observação interna" dica="Nunca aparece na página pública." largo><textarea rows={3} value={formulario.observacaoInterna} onChange={(e) => mudar("observacaoInterna", e.target.value)} /></Campo>
          </div>
          <div className="pev-opcoes"><div className="opcao-com-ajuda"><label><CheckboxComAjuda checked={formulario.ativo} onChange={(e) => mudar("ativo", e.target.checked)} explicacao={descricaoCheckbox("mandato")} aria-label={"Mandato ativo"} /><span>Mandato ativo</span></label></div><div className="opcao-com-ajuda"><label><CheckboxComAjuda checked={formulario.publicado} onChange={(e) => mudar("publicado", e.target.checked)} explicacao={descricaoCheckbox("publicado")} aria-label={"Mostrar no portal"} /><span>Mostrar no portal</span></label></div></div></fieldset>
          <p className="pev-nota-privacidade">Não cadastre telefone, e-mail, endereço ou informações pessoais neste formulário.</p>
          {mudou && <p className="pev-alteracoes" role="status">Há mudanças não salvas.</p>}
          <div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={fechar}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar representante"}</button></div>
        </form>
      ) : (
        <>
          <div className="pev-resumo"><button type="button" className={visao === "todos" ? "ativo" : ""} onClick={() => setVisao("todos")}><strong>{itens.filter((item) => item.ativo && mandatoVigenteEm(item)).length}</strong><span>Mandatos ativos</span></button><button type="button" className={visao === "duplicacoes" ? "ativo" : ""} onClick={() => setVisao("duplicacoes")}><strong>{chavesDuplicadas.size}</strong><span>Possíveis duplicações</span></button><button type="button" className={visao === "sem-representante" ? "ativo" : ""} onClick={() => setVisao("sem-representante")}><strong>{semRepresentante.length}</strong><span>Turmas sem titular</span></button></div>
          {visao !== "sem-representante" && <div className="pev-filtros pev-filtros--amplos">
            <label className="pev-filtro--busca"><span>Buscar</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou turma — 3º J, 3 J ou 3J" /></label>
            <label><span>Turno</span><select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Nível</span><select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>{niveisPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Ano / série</span><select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}><option value="">Todos</option>{anos.map((ano) => <option key={ano}>{ano}</option>)}</select></label>
            <label><span>Função</span><select value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)}><option value="">Todas</option>{funcoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Estado</span><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="ativos">Ativos</option><option value="todos">Todos</option><option value="rascunhos">Rascunhos</option><option value="arquivados">Arquivados</option></select></label>
          </div>}
          {visao === "sem-representante" ? <ListaTurmasSemRepresentante turmas={semRepresentante} carregando={carregando} cadastrar={novo} /> : <>
            <div className="pev-barra-resultados"><span>{filtrados.length} registro(s)</span><button type="button" className="pev-botao" onClick={exportarCsv} disabled={!itens.length}>Exportar CSV</button></div>
            {carregando && <EstadoVazio titulo="Carregando representantes…" texto="Aguarde enquanto consultamos os mandatos." />}
            {!carregando && !filtrados.length && <EstadoVazio titulo={visao === "duplicacoes" ? "Nenhuma duplicação encontrada" : "Nenhum representante encontrado"} texto={itens.length ? "Altere os filtros ou a busca para ver outros registros." : "Cadastre o primeiro mandato pelo botão acima."} />}
            <div className="pev-lista">{filtrados.map((item) => {
              const duplicado = chavesDuplicadas.has(`${normalizarBusca(item.nome)}|${normalizarBusca(item.turma)}|${item.funcao}`);
              return <article className="pev-cartao" key={item.id}><div className="pev-cartao__estados"><span className={classeStatus(item.ativo ? item.publicado ? "publicado" : "rascunho" : "arquivado")}>{item.ativo ? item.publicado ? "Publicado" : "Rascunho" : "Arquivado"}</span>{duplicado && <span className="pev-status pev-status--atencao">Revisar duplicação</span>}</div><div className="pev-cartao__conteudo"><h2>{item.nomeExibicao || item.nome}</h2><p><strong>{item.turma || "Turma não informada"}</strong> · {nomeFuncao(item.funcao)} · {nomeTurno(item.turno)}</p><small>{item.inicioMandato || item.fimMandato ? `Mandato: ${dataLegivel(item.inicioMandato)} a ${dataLegivel(item.fimMandato)}` : "Período do mandato não informado"}</small></div><div className="pev-cartao__acoes"><button type="button" className="pev-botao" onClick={() => editar(item)}>Editar</button>{item.ativo ? <button type="button" className="pev-botao pev-botao--perigoso" disabled={salvando} onClick={() => void arquivar(item)}>Arquivar</button> : <button type="button" className="pev-botao" disabled={salvando} onClick={() => void restaurar(item)}>Reativar</button>}</div></article>;
            })}</div>
          </>}
        </>
      )}
    </section>
  );
}

function ListaTurmasSemRepresentante({ turmas, carregando, cadastrar }: { turmas: string[]; carregando: boolean; cadastrar: (turma: string) => void }) {
  if (carregando) return <EstadoVazio titulo="Verificando as turmas…" texto="Estamos comparando a lista do mapa com os mandatos ativos." />;
  if (!turmas.length) return <EstadoVazio titulo="Nenhuma pendência encontrada" texto="Todas as turmas cadastradas no mapa possuem um representante titular ativo." />;
  return <div className="pev-grade-pendencias">{turmas.map((turma) => <article key={turma}><div><strong>{turma}</strong><span>Sem representante titular ativo</span></div><button type="button" className="pev-botao" onClick={() => cadastrar(turma)}>Cadastrar titular</button></article>)}</div>;
}

function nomeFuncao(valor: string) { return funcoes.find(([chave]) => chave === valor)?.[1] ?? valor; }
function nomeTurno(valor: string) { return turnosPainel.find(([chave]) => chave === valor)?.[1] ?? valor; }
function compararTurmas(a: string, b: string) { return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }); }

function normalizarRepresentante(registro: Record<string, unknown>): Representante {
  return {
    turmaAtividadeId: Number(registro.turmaAtividadeId) || null,
    id: (registro.id as Identificador) ?? crypto.randomUUID(), nome: obterTexto(registro, "nome"),
    nomeExibicao: obterTexto(registro, "nomeExibicao", "nomeExibicaoPublica"), nivelEnsino: obterTexto(registro, "nivelEnsino", "nivel") || "outro",
    serie: obterTexto(registro, "serie", "anoSerie", "ano"), turma: obterTexto(registro, "turma"),
    turno: obterTexto(registro, "turno"), funcao: obterTexto(registro, "funcao") || "titular",
    inicioMandato: obterTexto(registro, "inicioMandato"), fimMandato: obterTexto(registro, "fimMandato"),
    ativo: obterBooleano(registro, "ativo", true), publicado: obterBooleano(registro, "publicado"),
    ordem: obterNumero(registro, "ordem"), observacaoPublica: obterTexto(registro, "observacaoPublica"),
    observacaoInterna: obterTexto(registro, "observacaoInterna"), atualizadoEm: obterTexto(registro, "atualizadoEm") || undefined,
  };
}

// copia os dados da turma escolhida para o mandato
function dadosDaTurma(turma: TurmaAtividadeMapaPublica) {
  return { turmaAtividadeId: turma.id, turma: turma.nome, nivelEnsino: turma.nivelEnsino, serie: turma.serie || "Não informado", turno: turma.turno };
}
