"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CabecalhoPainel,
  Campo,
  EstadoVazio,
  MensagensPainel,
  classeStatus,
  confirmarSaida,
  corpoJson,
  criarSlug,
  dataLegivel,
  enviarArquivoPainel,
  niveisPainel,
  normalizarBusca,
  obterBooleano,
  obterNumero,
  obterTexto,
  requisitarPainel,
  requisitarTodasPaginasPainel,
  statusLegivel,
  turnosPainel,
  useAvisoMudancas,
  type AoMudarEstadoSujo,
  type Identificador,
} from "./painel-eventos-comum";

type DocumentoReuniao = {
  id?: Identificador;
  titulo: string;
  tipo: string;
  descricao: string;
  arquivoUrl: string;
  linkExterno: string;
  data: string;
  ordem: number;
  publicado: boolean;
};

type VotacaoReuniao = {
  id?: Identificador;
  titulo: string;
  pergunta: string;
  contexto: string;
  opcoes: Array<{ id?: Identificador; texto: string; quantidadeVotos: number; ordem?: number; ativo?: boolean }>;
  abstencoes: number;
  resultado: string;
  decisaoFinal: string;
  observacaoPublica: string;
  observacaoInterna: string;
  ordem: number;
  publicado: boolean;
};

type PresencaReuniao = {
  id: Identificador;
  nome: string;
  turma: string;
  turno: string;
  nivelEnsino: string;
  serie: string;
  funcao: string;
  situacao: string;
  observacaoPublica: string;
  observacaoInterna: string;
  publicado: boolean;
};

type PresencaManual = Omit<PresencaReuniao, "id">;

type ItemReuniao = {
  id?: Identificador;
  tipo: string;
  titulo: string;
  conteudo: string;
  responsaveis: string;
  prazo: string;
  ordem: number;
  publicado: boolean;
  ativo: boolean;
};

type Reuniao = {
  id: Identificador;
  titulo: string;
  slug: string;
  tipo: string;
  data: string;
  horarioInicial: string;
  horarioFinal: string;
  local: string;
  descricaoCurta: string;
  responsaveis: string;
  pauta: string;
  pautaInterna: string;
  discussoes: string;
  resumo: string;
  decisoes: string;
  propostas: string;
  encaminhamentos: string;
  ata: string;
  transcricao: string;
  observacoesPublicas: string;
  observacoesInternas: string;
  situacao: string;
  turno: string;
  niveisEnsino: string[];
  publicado: boolean;
  quantidadeParticipantesPublicada: boolean;
  arquivado: boolean;
  documentos: DocumentoReuniao[];
  votacoes: VotacaoReuniao[];
  presencas: PresencaReuniao[];
  itens: ItemReuniao[];
  atualizadoEm?: string;
};

type FormularioReuniao = Omit<Reuniao, "id" | "documentos" | "votacoes" | "presencas" | "itens" | "atualizadoEm">;
type AbaReuniao = "informacoes" | "itens" | "votacoes" | "documentos" | "presencas";

const formularioVazio: FormularioReuniao = {
  titulo: "", slug: "", tipo: "representantes", data: "", horarioInicial: "", horarioFinal: "", local: "",
  descricaoCurta: "", responsaveis: "", pauta: "", pautaInterna: "", discussoes: "", resumo: "", decisoes: "",
  propostas: "", encaminhamentos: "", ata: "", transcricao: "", observacoesPublicas: "", observacoesInternas: "",
  situacao: "agendada", turno: "", niveisEnsino: [], publicado: false, quantidadeParticipantesPublicada: false, arquivado: false,
};

const documentoVazio: DocumentoReuniao = { titulo: "", tipo: "ata", descricao: "", arquivoUrl: "", linkExterno: "", data: "", ordem: 0, publicado: false };
const votacaoVazia: VotacaoReuniao = { titulo: "", pergunta: "", contexto: "", opcoes: [{ texto: "", quantidadeVotos: 0, ordem: 1, ativo: true }, { texto: "", quantidadeVotos: 0, ordem: 2, ativo: true }], abstencoes: 0, resultado: "", decisaoFinal: "", observacaoPublica: "", observacaoInterna: "", ordem: 0, publicado: false };
const itemVazio: ItemReuniao = { tipo: "tarefa", titulo: "", conteudo: "", responsaveis: "", prazo: "", ordem: 0, publicado: false, ativo: true };
const presencaManualVazia: PresencaManual = {
  nome: "", nivelEnsino: "", serie: "", turma: "", turno: "", funcao: "membro",
  situacao: "nao_informada", observacaoPublica: "", observacaoInterna: "", publicado: false,
};
const situacoesReuniao = [["agendada", "Agendada"], ["em_andamento", "Em andamento"], ["encerrada", "Encerrada"], ["adiada", "Adiada"], ["cancelada", "Cancelada"]] as const;
const situacoesPresenca = [["nao_informada", "Não informada"], ["presente", "Presente"], ["ausente", "Ausente"], ["justificada", "Ausência justificada"], ["nao_se_aplica", "Não se aplica"]] as const;

export default function PainelReunioes({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  const [itens, setItens] = useState<Reuniao[]>([]);
  const [formulario, setFormulario] = useState<FormularioReuniao | null>(null);
  const [idEditando, setIdEditando] = useState<Identificador | null>(null);
  const [detalhes, setDetalhes] = useState<Reuniao | null>(null);
  const [aba, setAba] = useState<AbaReuniao>("informacoes");
  const [documento, setDocumento] = useState<DocumentoReuniao | null>(null);
  const [votacao, setVotacao] = useState<VotacaoReuniao | null>(null);
  const [itemReuniao, setItemReuniao] = useState<ItemReuniao | null>(null);
  const [presencaManual, setPresencaManual] = useState<PresencaManual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [mudou, setMudou] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [buscaPresenca, setBuscaPresenca] = useState("");
  const [filtroPresenca, setFiltroPresenca] = useState("");
  const [filtroTurnoPresenca, setFiltroTurnoPresenca] = useState("");
  const [filtroNivelPresenca, setFiltroNivelPresenca] = useState("");
  const [selecionadas, setSelecionadas] = useState<Set<Identificador>>(new Set());
  const [filtrosGeracao, setFiltrosGeracao] = useState({ nivelEnsino: "", turno: "", serie: "", turma: "" });

  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const itens = await requisitarTodasPaginasPainel<Record<string, unknown>>("/api/reunioes?todos=1", ["reunioes"]);
      setItens(itens.map(normalizarReuniao));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao carregar as reuniões.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { const temporizador = window.setTimeout(() => void carregar(), 0); return () => window.clearTimeout(temporizador); }, [carregar]);

  const anos = useMemo(() => Array.from(new Set(itens.map((item) => item.data.slice(0, 4)).filter(Boolean))).sort().reverse(), [itens]);
  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return itens.filter((item) => (!termo || normalizarBusca(`${item.titulo} ${item.local} ${item.resumo}`).includes(termo))
      && (!filtroTipo || item.tipo === filtroTipo)
      && (!filtroSituacao || item.situacao === filtroSituacao)
      && (!filtroAno || item.data.startsWith(filtroAno)));
  }, [busca, filtroAno, filtroSituacao, filtroTipo, itens]);

  const presencasFiltradas = useMemo(() => {
    const termo = normalizarBusca(buscaPresenca);
    return (detalhes?.presencas ?? []).filter((item) => (!termo || normalizarBusca(`${item.nome} ${item.turma}`).includes(termo))
      && (!filtroPresenca || item.situacao === filtroPresenca)
      && (!filtroTurnoPresenca || item.turno === filtroTurnoPresenca)
      && (!filtroNivelPresenca || item.nivelEnsino === filtroNivelPresenca));
  }, [buscaPresenca, detalhes?.presencas, filtroNivelPresenca, filtroPresenca, filtroTurnoPresenca]);

  function mudar<K extends keyof FormularioReuniao>(chave: K, valor: FormularioReuniao[K]) {
    setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual);
    setMudou(true);
    setSucesso("");
  }

  function novo() {
    if (!confirmarSaida(mudou)) return;
    setFormulario({ ...formularioVazio });
    setIdEditando(null);
    setDetalhes(null);
    setAba("informacoes");
    setMudou(false);
    setErro("");
    setSucesso("");
  }

  async function editar(item: Reuniao, abaInicial: AbaReuniao = "informacoes") {
    if (!confirmarSaida(mudou)) return;
    setCarregando(true);
    setErro("");
    try {
      const resultado = await requisitarPainel<unknown>(`/api/reunioes/${encodeURIComponent(String(item.id))}?todos=1`).catch(() => ({ item }));
      const objeto = montarDetalheReuniao(resultado, item as unknown as Record<string, unknown>);
      const completo = normalizarReuniao(objeto);
      const { id: _id, documentos: _documentos, votacoes: _votacoes, presencas: _presencas, itens: _itens, atualizadoEm: _atualizadoEm, ...dados } = completo;
      void _id; void _documentos; void _votacoes; void _presencas; void _itens; void _atualizadoEm;
      setDetalhes(completo);
      setFormulario(dados);
      setIdEditando(item.id);
      setAba(abaInicial);
      setMudou(false);
      setSelecionadas(new Set());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir a reunião.");
    } finally {
      setCarregando(false);
    }
  }

  function fechar() {
    if (!confirmarSaida(mudou)) return;
    setFormulario(null);
    setIdEditando(null);
    setDetalhes(null);
    setDocumento(null);
    setVotacao(null);
    setItemReuniao(null);
    setPresencaManual(null);
    setMudou(false);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const dados = { ...formulario, slug: formulario.slug || criarSlug(formulario.titulo) };
      const resposta = await requisitarPainel<Record<string, unknown>>("/api/reunioes", {
        method: idEditando === null ? "POST" : "PUT",
        ...corpoJson(idEditando === null ? { dados } : { id: idEditando, dados }),
      });
      setMudou(false);
      setSucesso(idEditando === null ? "Reunião criada como rascunho. Agora você pode completar presenças, votações e documentos." : "Reunião atualizada com sucesso.");
      await carregar();
      if (idEditando === null) {
        const criado = resposta.item && typeof resposta.item === "object" ? normalizarReuniao(resposta.item as Record<string, unknown>) : null;
        setFormulario(null);
        setDetalhes(null);
        setIdEditando(null);
        if (criado) setSucesso("Reunião criada. Abra “Editar” para adicionar presenças, votações e documentos.");
      } else if (detalhes) setDetalhes({ ...detalhes, ...dados });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a reunião.");
    } finally {
      setSalvando(false);
    }
  }

  async function executarAcao(item: Reuniao, acao: "duplicar" | "arquivar" | "cancelar") {
    const perguntas = {
      duplicar: `Duplicar a estrutura de “${item.titulo}”? Presenças não serão copiadas.`,
      arquivar: `Arquivar “${item.titulo}”? A ata e o histórico de presenças serão preservados.`,
      cancelar: `Cancelar “${item.titulo}”? A situação ficará visível se a reunião estiver publicada.`,
    };
    if (!window.confirm(perguntas[acao])) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      if (acao === "arquivar") await requisitarPainel(`/api/reunioes?id=${encodeURIComponent(String(item.id))}&acao=arquivar`, { method: "DELETE" });
      else if (acao === "cancelar") await requisitarPainel("/api/reunioes", { method: "PUT", ...corpoJson({ id: item.id, dados: { situacao: "cancelada" } }) });
      else await requisitarPainel("/api/reunioes", { method: "POST", ...corpoJson({ acao: "duplicar", id: item.id }) });
      setSucesso(acao === "duplicar" ? "Estrutura duplicada como rascunho, sem copiar presenças." : acao === "arquivar" ? "Reunião arquivada; o histórico foi preservado." : "Reunião cancelada.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir a ação.");
    } finally {
      setSalvando(false);
    }
  }

  async function recarregarDetalhes() {
    if (!detalhes) return;
    const resultado = await requisitarPainel<unknown>(`/api/reunioes/${encodeURIComponent(String(detalhes.id))}?todos=1`);
    setDetalhes(normalizarReuniao(montarDetalheReuniao(resultado, detalhes as unknown as Record<string, unknown>)));
  }

  async function salvarDocumento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!documento || !idEditando) return;
    if (!documento.arquivoUrl && !documento.linkExterno) { setErro("Envie um arquivo ou informe um link autorizado."); return; }
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel("/api/reunioes", {
        method: documento.id ? "PUT" : "POST",
        ...corpoJson({ entidade: "documentos", reuniaoId: idEditando, ...(documento.id ? { id: documento.id } : {}), dados: documento }),
      });
      setDocumento(null);
      setMudou(false);
      setSucesso("Documento salvo com sucesso.");
      await recarregarDetalhes();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o documento.");
    } finally { setSalvando(false); }
  }

  async function enviarDocumento(arquivo?: File) {
    if (!arquivo || !documento) return;
    setEnviando(true);
    setErro("");
    try {
      const resultado = await enviarArquivoPainel(arquivo, "privada");
      setDocumento((atual) => atual ? { ...atual, arquivoUrl: resultado.url, titulo: atual.titulo || resultado.nome || arquivo.name } : atual);
      setMudou(true);
      setSucesso("Arquivo enviado como privado. Ao salvar, o servidor só liberará o acesso se a reunião e o documento estiverem autorizados para publicação.");
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível enviar o arquivo."); }
    finally { setEnviando(false); }
  }

  async function salvarVotacao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!votacao || !idEditando) return;
    if (votacao.opcoes.filter((item) => item.texto.trim()).length < 2) { setErro("Informe pelo menos duas opções para a votação."); return; }
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel("/api/reunioes", {
        method: votacao.id ? "PUT" : "POST",
        ...corpoJson({ entidade: "votacoes", reuniaoId: idEditando, ...(votacao.id ? { id: votacao.id } : {}), dados: { ...votacao, interno: !votacao.publicado, opcoes: votacao.opcoes.filter((item) => item.texto.trim()).map((item, indice) => ({ ...item, ordem: item.ordem ?? indice + 1, ativo: item.ativo ?? true })) } }),
      });
      setVotacao(null);
      setMudou(false);
      setSucesso("Votação salva com sucesso.");
      await recarregarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a votação."); }
    finally { setSalvando(false); }
  }

  async function salvarItemReuniao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!itemReuniao || !idEditando) return;
    if (!itemReuniao.titulo.trim() && !itemReuniao.conteudo.trim()) { setErro("Informe o título ou o conteúdo do item."); return; }
    setSalvando(true); setErro("");
    try {
      await requisitarPainel("/api/reunioes", {
        method: itemReuniao.id ? "PUT" : "POST",
        ...corpoJson({ entidade: "itens", reuniaoId: idEditando, ...(itemReuniao.id ? { id: itemReuniao.id } : {}), dados: itemReuniao }),
      });
      setItemReuniao(null); setMudou(false); setSucesso("Item da reunião salvo com sucesso."); await recarregarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o item da reunião."); }
    finally { setSalvando(false); }
  }

  async function gerarPresencas(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!idEditando) return;
    if (!window.confirm("Gerar a lista a partir dos representantes ativos? Os nomes e turmas serão preservados como retrato histórico desta reunião.")) return;
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel("/api/reunioes", { method: "PUT", ...corpoJson({ acao: "gerar_presencas", id: idEditando, filtros: filtrosGeracao }) });
      setSucesso("Lista inicial de presença gerada. Agora revise e marque as situações.");
      await recarregarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível gerar a lista de presença."); }
    finally { setSalvando(false); }
  }

  async function salvarPresencaManual(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!presencaManual || !idEditando || formulario?.tipo !== "interna_gecep") return;
    if (!presencaManual.nome.trim()) { setErro("Informe o nome do membro presente na reunião."); return; }
    if (presencaManual.publicado && !window.confirm(`Publicar o registro de presença de “${presencaManual.nome.trim()}” no portal? Nome, função, turma e situação poderão ser vistos por qualquer visitante.`)) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      await requisitarPainel("/api/reunioes", {
        method: "POST",
        ...corpoJson({ entidade: "presencas", reuniaoId: idEditando, dados: presencaManual }),
      });
      setPresencaManual(null);
      setMudou(false);
      setSucesso("Membro adicionado à lista histórica de presença.");
      await recarregarDetalhes();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível adicionar o membro à presença.");
    } finally {
      setSalvando(false);
    }
  }

  async function aplicarStatus(situacao: string, todasFiltradas = false) {
    if (!idEditando) return;
    const ids = todasFiltradas ? presencasFiltradas.map((item) => item.id) : [...selecionadas];
    if (!ids.length) { setErro("Selecione pelo menos uma pessoa ou use a opção de aplicar a todos os resultados filtrados."); return; }
    const nome = situacoesPresenca.find(([valor]) => valor === situacao)?.[1] ?? situacao;
    if (!window.confirm(`Marcar ${ids.length} registro(s) como “${nome}”?`)) return;
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel("/api/reunioes", { method: "PUT", ...corpoJson({ acao: "status_presencas", id: idEditando, ids, situacao }) });
      setSelecionadas(new Set());
      setSucesso("Situações de presença atualizadas com sucesso.");
      await recarregarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar as presenças."); }
    finally { setSalvando(false); }
  }

  async function alterarPublicacaoPresencas(publicado: boolean) {
    if (!idEditando) return;
    const ids = [...selecionadas];
    if (!ids.length) { setErro("Selecione as presenças que deseja publicar ou ocultar."); return; }
    if (!window.confirm(`${publicado ? "Publicar" : "Ocultar"} ${ids.length} registro(s) de presença? Somente nome, turma, turno, nível, função e situação poderão aparecer no portal.`)) return;
    setSalvando(true); setErro("");
    try {
      await Promise.all(ids.map((id) => requisitarPainel("/api/reunioes", { method: "PUT", ...corpoJson({ entidade: "presencas", reuniaoId: idEditando, id, dados: { publicado } }) })));
      setSelecionadas(new Set()); setSucesso(publicado ? "Presenças selecionadas publicadas." : "Presenças selecionadas ocultadas."); await recarregarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível alterar a publicação das presenças."); }
    finally { setSalvando(false); }
  }

  function alternarSelecionada(id: Identificador) {
    setSelecionadas((atuais) => { const proximas = new Set(atuais); if (proximas.has(id)) proximas.delete(id); else proximas.add(id); return proximas; });
  }

  function selecionarFiltradas() {
    const todasSelecionadas = presencasFiltradas.length > 0 && presencasFiltradas.every((item) => selecionadas.has(item.id));
    setSelecionadas((atuais) => { const proximas = new Set(atuais); for (const item of presencasFiltradas) { if (todasSelecionadas) proximas.delete(item.id); else proximas.add(item.id); } return proximas; });
  }

  function trocarAba(nome: AbaReuniao) {
    if (nome === aba) return;
    if (mudou) {
      setErro("Salve ou cancele as mudanças desta etapa antes de abrir outra área da reunião.");
      return;
    }
    setAba(nome);
  }

  function definirDocumento(valor: DocumentoReuniao | null) {
    if (valor === null && documento && mudou && !confirmarSaida(true)) return;
    setDocumento(valor);
    setMudou(Boolean(valor));
  }

  function definirVotacao(valor: VotacaoReuniao | null) {
    if (valor === null && votacao && mudou && !confirmarSaida(true)) return;
    setVotacao(valor);
    setMudou(Boolean(valor));
  }

  function definirItemReuniao(valor: ItemReuniao | null) {
    if (valor === null && itemReuniao && mudou && !confirmarSaida(true)) return;
    setItemReuniao(valor);
    setMudou(Boolean(valor));
  }

  function abrirPresencaManual() {
    setPresencaManual({ ...presencaManualVazia });
    setMudou(false);
    setErro("");
    setSucesso("");
  }

  function mudarPresencaManual(valor: PresencaManual) {
    setPresencaManual(valor);
    setMudou(true);
    setSucesso("");
  }

  function fecharPresencaManual() {
    if (!confirmarSaida(mudou)) return;
    setPresencaManual(null);
    setMudou(false);
  }

  return (
    <section className="pev-painel" aria-labelledby="titulo-painel-reunioes">
      <CabecalhoPainel rotulo="GESTÃO E MEMÓRIA" titulo="Reuniões, atas e presenças" descricao="Organize reuniões de representantes ou internas, publique resumos e preserve listas históricas de presença." acao={formulario ? undefined : novo} nomeAcao="+ Nova reunião" />
      <MensagensPainel erro={erro} sucesso={sucesso} />

      {formulario ? <div className="pev-editor-completo">
        {idEditando !== null && <nav className="pev-abas" aria-label="Etapas da reunião">{(["informacoes", "itens", "votacoes", "documentos", "presencas"] as AbaReuniao[]).map((nome) => <button type="button" className={aba === nome ? "ativo" : ""} aria-current={aba === nome ? "page" : undefined} onClick={() => trocarAba(nome)} key={nome}>{({ informacoes: "Resumo e informações", itens: "Tarefas e encaminhamentos", votacoes: "Votações", documentos: "Ata e documentos", presencas: "Lista de presença" } as Record<AbaReuniao, string>)[nome]}</button>)}</nav>}
        {aba === "informacoes" && <FormularioInformacoes formulario={formulario} idEditando={idEditando} mudou={mudou} salvando={salvando} mudar={mudar} salvar={salvar} fechar={fechar} />}
        {aba === "itens" && idEditando !== null && detalhes && <PainelItens detalhes={detalhes} item={itemReuniao} setItem={definirItemReuniao} salvar={salvarItemReuniao} salvando={salvando} />}
        {aba === "votacoes" && idEditando !== null && detalhes && <PainelVotacoes detalhes={detalhes} votacao={votacao} setVotacao={definirVotacao} salvar={salvarVotacao} salvando={salvando} />}
        {aba === "documentos" && idEditando !== null && detalhes && <PainelDocumentos detalhes={detalhes} documento={documento} setDocumento={definirDocumento} salvar={salvarDocumento} enviar={enviarDocumento} salvando={salvando} enviando={enviando} />}
        {aba === "presencas" && idEditando !== null && detalhes && <PainelPresencas detalhes={detalhes} presencaManual={presencaManual} mudarPresencaManual={mudarPresencaManual} abrirPresencaManual={abrirPresencaManual} fecharPresencaManual={fecharPresencaManual} salvarPresencaManual={salvarPresencaManual} filtrosGeracao={filtrosGeracao} setFiltrosGeracao={setFiltrosGeracao} gerar={gerarPresencas} busca={buscaPresenca} setBusca={setBuscaPresenca} filtroSituacao={filtroPresenca} setFiltroSituacao={setFiltroPresenca} filtroTurno={filtroTurnoPresenca} setFiltroTurno={setFiltroTurnoPresenca} filtroNivel={filtroNivelPresenca} setFiltroNivel={setFiltroNivelPresenca} filtradas={presencasFiltradas} selecionadas={selecionadas} alternar={alternarSelecionada} selecionarFiltradas={selecionarFiltradas} aplicar={aplicarStatus} alterarPublicacao={alterarPublicacaoPresencas} salvando={salvando} />}
      </div> : <>
        <div className="pev-filtros"><label className="pev-filtro--busca"><span>Buscar reunião</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Título, local ou conteúdo do resumo" /></label><label><span>Tipo</span><select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option value="">Todos</option><option value="representantes">Representantes de turma</option><option value="interna_gecep">Interna do GECEP</option></select></label><label><span>Situação</span><select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}><option value="">Todas</option>{situacoesReuniao.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label><label><span>Ano</span><select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}><option value="">Todos</option>{anos.map((ano) => <option key={ano}>{ano}</option>)}</select></label></div>
        {carregando && <EstadoVazio titulo="Carregando reuniões…" texto="Aguarde enquanto consultamos atas e listas de presença." />}
        {!carregando && !filtrados.length && <EstadoVazio titulo={itens.length ? "Nenhuma reunião encontrada" : "Nenhuma reunião cadastrada"} texto={itens.length ? "Altere os filtros ou a busca." : "Use “Nova reunião” para criar o primeiro rascunho."} />}
        <div className="pev-lista">{filtrados.map((item) => <article className="pev-cartao" key={item.id}><div className="pev-cartao__estados"><span className={classeStatus(item.arquivado ? "arquivado" : item.publicado ? "publicado" : "rascunho")}>{item.arquivado ? "Arquivada" : item.publicado ? "Publicada" : "Rascunho"}</span><span className={classeStatus(item.situacao)}>{statusLegivel(item.situacao)}</span></div><div className="pev-cartao__conteudo"><h2>{item.titulo || "Reunião sem título"}</h2><p>{item.tipo === "interna_gecep" ? "Reunião interna do GECEP" : "Reunião com representantes"} · {dataLegivel(item.data)}{item.local ? ` · ${item.local}` : ""}</p><small>{item.presencas.length ? `${item.presencas.length} registros de presença` : "Abra a reunião para consultar presenças"}</small></div><div className="pev-cartao__acoes"><button type="button" className="pev-botao" onClick={() => void editar(item)}>Editar</button><button type="button" className="pev-botao" onClick={() => void executarAcao(item, "duplicar")}>Duplicar estrutura</button>{!item.arquivado && item.situacao !== "cancelada" && <button type="button" className="pev-botao" onClick={() => void executarAcao(item, "cancelar")}>Cancelar reunião</button>}{!item.arquivado && <button type="button" className="pev-botao pev-botao--perigoso" onClick={() => void executarAcao(item, "arquivar")}>Arquivar</button>}</div></article>)}</div>
      </>}
    </section>
  );
}

function FormularioInformacoes({ formulario, idEditando, mudou, salvando, mudar, salvar, fechar }: { formulario: FormularioReuniao; idEditando: Identificador | null; mudou: boolean; salvando: boolean; mudar: <K extends keyof FormularioReuniao>(chave: K, valor: FormularioReuniao[K]) => void; salvar: (evento: FormEvent<HTMLFormElement>) => void; fechar: () => void }) {
  return <form className="pev-formulario" onSubmit={salvar}><div className="pev-formulario__topo"><div><small>{idEditando === null ? "NOVA REUNIÃO" : "RESUMO E INFORMAÇÕES"}</small><h2 id="titulo-painel-reunioes">{idEditando === null ? "Cadastrar reunião" : formulario.titulo}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={fechar}>Fechar</button></div>
    <fieldset className="pev-bloco"><legend>Identificação</legend><div className="pev-grade-campos pev-grade-campos--tres"><Campo rotulo="Título"><input value={formulario.titulo} onChange={(e) => mudar("titulo", e.target.value)} required /></Campo><Campo rotulo="Tipo"><select value={formulario.tipo} onChange={(e) => mudar("tipo", e.target.value)}><option value="representantes">Com representantes de turma</option><option value="interna_gecep">Interna do GECEP</option></select></Campo><Campo rotulo="Situação"><select value={formulario.situacao} onChange={(e) => mudar("situacao", e.target.value)}>{situacoesReuniao.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><Campo rotulo="Data"><input type="date" value={formulario.data} onChange={(e) => mudar("data", e.target.value)} required /></Campo><Campo rotulo="Horário inicial"><input type="time" value={formulario.horarioInicial} onChange={(e) => mudar("horarioInicial", e.target.value)} /></Campo><Campo rotulo="Horário final"><input type="time" value={formulario.horarioFinal} onChange={(e) => mudar("horarioFinal", e.target.value)} /></Campo><Campo rotulo="Local"><input value={formulario.local} onChange={(e) => mudar("local", e.target.value)} /></Campo><Campo rotulo="Turno"><select value={formulario.turno} onChange={(e) => mudar("turno", e.target.value)}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><div className="pev-campo"><span>Níveis de ensino</span><div className="pev-opcoes"><label><input type="checkbox" checked={formulario.niveisEnsino.includes("fundamental")} onChange={(e) => mudar("niveisEnsino", e.target.checked ? [...formulario.niveisEnsino, "fundamental"] : formulario.niveisEnsino.filter((nivel) => nivel !== "fundamental"))} /> Fundamental</label><label><input type="checkbox" checked={formulario.niveisEnsino.includes("medio")} onChange={(e) => mudar("niveisEnsino", e.target.checked ? [...formulario.niveisEnsino, "medio"] : formulario.niveisEnsino.filter((nivel) => nivel !== "medio"))} /> Médio</label></div></div><Campo rotulo="Responsáveis" largo><input value={formulario.responsaveis} onChange={(e) => mudar("responsaveis", e.target.value)} placeholder="Nomes ou funções responsáveis" /></Campo><Campo rotulo="Descrição curta" largo><textarea rows={3} value={formulario.descricaoCurta} onChange={(e) => mudar("descricaoCurta", e.target.value)} /></Campo></div></fieldset>
    <fieldset className="pev-bloco"><legend>Resumo, decisões e ata</legend><div className="pev-grade-campos"><Campo rotulo="Pauta pública" dica="Um item por linha."><textarea rows={6} value={formulario.pauta} onChange={(e) => mudar("pauta", e.target.value)} /></Campo><Campo rotulo="Pauta interna" dica="Nunca aparece no portal."><textarea rows={6} value={formulario.pautaInterna} onChange={(e) => mudar("pautaInterna", e.target.value)} /></Campo><Campo rotulo="Assuntos discutidos"><textarea rows={6} value={formulario.discussoes} onChange={(e) => mudar("discussoes", e.target.value)} /></Campo><Campo rotulo="Resumo público"><textarea rows={6} value={formulario.resumo} onChange={(e) => mudar("resumo", e.target.value)} /></Campo><Campo rotulo="Decisões tomadas"><textarea rows={5} value={formulario.decisoes} onChange={(e) => mudar("decisoes", e.target.value)} /></Campo><Campo rotulo="Propostas apresentadas"><textarea rows={5} value={formulario.propostas} onChange={(e) => mudar("propostas", e.target.value)} /></Campo><Campo rotulo="Encaminhamentos" largo><textarea rows={5} value={formulario.encaminhamentos} onChange={(e) => mudar("encaminhamentos", e.target.value)} /></Campo><Campo rotulo="Ata completa escrita no sistema" largo><textarea rows={9} value={formulario.ata} onChange={(e) => mudar("ata", e.target.value)} /></Campo><Campo rotulo="Transcrição" largo><textarea rows={7} value={formulario.transcricao} onChange={(e) => mudar("transcricao", e.target.value)} /></Campo><Campo rotulo="Observações públicas"><textarea rows={4} value={formulario.observacoesPublicas} onChange={(e) => mudar("observacoesPublicas", e.target.value)} /></Campo><Campo rotulo="Observações internas" dica="Nunca aparecem na página pública."><textarea rows={4} value={formulario.observacoesInternas} onChange={(e) => mudar("observacoesInternas", e.target.value)} /></Campo></div></fieldset>
    <div className="pev-publicacao"><label><input type="checkbox" checked={formulario.publicado} onChange={(e) => mudar("publicado", e.target.checked)} /><span>Publicar reunião no portal</span></label><label><input type="checkbox" checked={formulario.quantidadeParticipantesPublicada} onChange={(e) => mudar("quantidadeParticipantesPublicada", e.target.checked)} /><span>Publicar a quantidade total de participantes</span></label><p>Somente conteúdo marcado como público será exibido. Observações internas permanecem protegidas.</p></div>{mudou && <p className="pev-alteracoes">Há mudanças não salvas.</p>}<div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={fechar}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : idEditando === null ? "Criar rascunho" : "Salvar reunião"}</button></div>
  </form>;
}

function PainelItens({ detalhes, item, setItem, salvar, salvando }: { detalhes: Reuniao; item: ItemReuniao | null; setItem: (valor: ItemReuniao | null) => void; salvar: (evento: FormEvent<HTMLFormElement>) => void; salvando: boolean }) {
  if (item) return <form className="pev-formulario" onSubmit={salvar}><div className="pev-formulario__topo"><div><small>ITEM ESTRUTURADO</small><h2>{item.id ? "Editar item" : "Adicionar tarefa ou encaminhamento"}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={() => setItem(null)}>Fechar</button></div><div className="pev-grade-campos"><Campo rotulo="Tipo"><select value={item.tipo} onChange={(e) => setItem({ ...item, tipo: e.target.value })}><option value="pauta">Pauta</option><option value="discussao">Discussão</option><option value="decisao">Decisão</option><option value="encaminhamento">Encaminhamento</option><option value="tarefa">Tarefa</option><option value="mocao">Moção</option></select></Campo><Campo rotulo="Título"><input value={item.titulo} onChange={(e) => setItem({ ...item, titulo: e.target.value })} /></Campo><Campo rotulo="Conteúdo" largo><textarea rows={6} value={item.conteudo} onChange={(e) => setItem({ ...item, conteudo: e.target.value })} /></Campo><Campo rotulo="Responsáveis"><input value={item.responsaveis} onChange={(e) => setItem({ ...item, responsaveis: e.target.value })} placeholder="Nomes ou funções" /></Campo><Campo rotulo="Prazo"><input type="date" value={item.prazo} onChange={(e) => setItem({ ...item, prazo: e.target.value })} /></Campo><Campo rotulo="Ordem"><input type="number" min={0} value={item.ordem} onChange={(e) => setItem({ ...item, ordem: Number(e.target.value) })} /></Campo></div><div className="pev-publicacao"><label><input type="checkbox" checked={item.publicado} onChange={(e) => setItem({ ...item, publicado: e.target.checked })} /><span>Mostrar este item na página pública</span></label><p>Tarefas internas, responsáveis sensíveis ou moções reservadas devem permanecer desmarcados.</p></div><div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={() => setItem(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar item"}</button></div></form>;
  return <section className="pev-subpainel"><div className="pev-subpainel__topo"><div><h2>Tarefas, decisões e encaminhamentos</h2><p>Cadastre cada responsabilidade separadamente para deixar prazo e responsáveis fáceis de consultar.</p></div><button type="button" className="pev-botao pev-botao--primario" onClick={() => setItem({ ...itemVazio, ordem: detalhes.itens.length + 1 })}>+ Adicionar item</button></div>{!detalhes.itens.length && <EstadoVazio titulo="Nenhum item estruturado" texto="Adicione tarefas, decisões, encaminhamentos ou moções sem editar código." />}<div className="pev-grade-subitens">{[...detalhes.itens].sort((a, b) => a.ordem - b.ordem).map((registro, indice) => <article key={registro.id ?? indice}><span className={classeStatus(registro.publicado ? "publicado" : "rascunho")}>{registro.publicado ? "Público" : "Interno"}</span><h3>{registro.titulo || statusLegivel(registro.tipo)}</h3><p>{registro.conteudo}</p><small>{[registro.responsaveis && `Responsáveis: ${registro.responsaveis}`, registro.prazo && `Prazo: ${dataLegivel(registro.prazo)}`].filter(Boolean).join(" · ") || "Sem responsáveis ou prazo informados"}</small><button type="button" className="pev-botao" onClick={() => setItem({ ...registro })}>Editar item</button></article>)}</div></section>;
}

function PainelVotacoes({ detalhes, votacao, setVotacao, salvar, salvando }: { detalhes: Reuniao; votacao: VotacaoReuniao | null; setVotacao: (valor: VotacaoReuniao | null) => void; salvar: (evento: FormEvent<HTMLFormElement>) => void; salvando: boolean }) {
  if (votacao) {
    const mudarOpcao = (indice: number, dados: Partial<VotacaoReuniao["opcoes"][number]>) => setVotacao({
      ...votacao,
      opcoes: votacao.opcoes.map((item, i) => i === indice ? { ...item, ...dados } : item),
    });

    return <form className="pev-formulario" onSubmit={salvar}>
      <div className="pev-formulario__topo"><div><small>VOTAÇÃO DA REUNIÃO</small><h2>{votacao.id ? "Editar votação" : "Adicionar votação"}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={() => setVotacao(null)}>Fechar</button></div>
      <div className="pev-grade-campos">
        <Campo rotulo="Título"><input value={votacao.titulo} onChange={(e) => setVotacao({ ...votacao, titulo: e.target.value })} required /></Campo>
        <Campo rotulo="Pergunta ou proposta"><input value={votacao.pergunta} onChange={(e) => setVotacao({ ...votacao, pergunta: e.target.value })} required /></Campo>
        <Campo rotulo="Ordem"><input type="number" min={0} value={votacao.ordem} onChange={(e) => setVotacao({ ...votacao, ordem: Number(e.target.value) })} /></Campo>
        <Campo rotulo="Contexto" largo><textarea rows={4} value={votacao.contexto} onChange={(e) => setVotacao({ ...votacao, contexto: e.target.value })} /></Campo>
      </div>
      <fieldset className="pev-bloco"><legend>Opções e quantidade de votos</legend><div className="pev-opcoes-votacao">{votacao.opcoes.map((opcao, indice) => <div key={opcao.id ?? indice}><label><span>Opção {indice + 1}</span><input value={opcao.texto} onChange={(e) => mudarOpcao(indice, { texto: e.target.value })} required /></label><label><span>Votos</span><input type="number" min={0} value={opcao.quantidadeVotos} onChange={(e) => mudarOpcao(indice, { quantidadeVotos: Number(e.target.value) })} /></label>{votacao.opcoes.length > 2 && <button type="button" className="pev-botao pev-botao--perigoso" onClick={() => setVotacao({ ...votacao, opcoes: votacao.opcoes.filter((_, i) => i !== indice) })}>Remover</button>}</div>)}</div><button type="button" className="pev-botao" onClick={() => setVotacao({ ...votacao, opcoes: [...votacao.opcoes, { texto: "", quantidadeVotos: 0, ordem: votacao.opcoes.length + 1, ativo: true }] })}>+ Adicionar opção</button></fieldset>
      <div className="pev-grade-campos">
        <Campo rotulo="Abstenções"><input type="number" min={0} value={votacao.abstencoes} onChange={(e) => setVotacao({ ...votacao, abstencoes: Number(e.target.value) })} /></Campo>
        <Campo rotulo="Resultado"><input value={votacao.resultado} onChange={(e) => setVotacao({ ...votacao, resultado: e.target.value })} /></Campo>
        <Campo rotulo="Decisão final" largo><textarea rows={3} value={votacao.decisaoFinal} onChange={(e) => setVotacao({ ...votacao, decisaoFinal: e.target.value })} placeholder="Decisão ou encaminhamento aprovado" /></Campo>
        <Campo rotulo="Observação pública" largo><textarea rows={3} value={votacao.observacaoPublica} onChange={(e) => setVotacao({ ...votacao, observacaoPublica: e.target.value })} /></Campo>
        <Campo rotulo="Observação interna" dica="Nunca aparece na página pública." largo><textarea rows={3} value={votacao.observacaoInterna} onChange={(e) => setVotacao({ ...votacao, observacaoInterna: e.target.value })} /></Campo>
      </div>
      <div className="pev-publicacao"><label><input type="checkbox" checked={votacao.publicado} onChange={(e) => setVotacao({ ...votacao, publicado: e.target.checked })} /><span>Mostrar resultado geral no portal</span></label><p>Não cadastre votos individuais. Somente totais e resultado geral serão publicados.</p></div>
      <div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={() => setVotacao(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar votação"}</button></div>
    </form>;
  }

  return <section className="pev-subpainel"><div className="pev-subpainel__topo"><div><h2>Votações</h2><p>Registre opções, totais, abstenções e escolha se o resultado geral será público.</p></div><button type="button" className="pev-botao pev-botao--primario" onClick={() => setVotacao({ ...votacaoVazia, ordem: detalhes.votacoes.length + 1, opcoes: votacaoVazia.opcoes.map((item) => ({ ...item })) })}>+ Adicionar votação</button></div>{!detalhes.votacoes.length && <EstadoVazio titulo="Nenhuma votação registrada" texto="Adicione uma votação somente quando houver dados reais da reunião." />}<div className="pev-grade-subitens">{[...detalhes.votacoes].sort((a, b) => a.ordem - b.ordem).map((item, indice) => <article key={item.id ?? indice}><span className={classeStatus(item.publicado ? "publicado" : "rascunho")}>{item.publicado ? "Pública" : "Interna"}</span><h3>{item.titulo}</h3><p>{item.pergunta}</p><small>{item.opcoes.map((opcao) => `${opcao.texto}: ${opcao.quantidadeVotos}`).join(" · ")}</small>{item.decisaoFinal && <p><strong>Decisão:</strong> {item.decisaoFinal}</p>}<button type="button" className="pev-botao" onClick={() => setVotacao({ ...item, opcoes: item.opcoes.map((opcao) => ({ ...opcao })) })}>Editar votação</button></article>)}</div></section>;
}

function PainelDocumentos({ detalhes, documento, setDocumento, salvar, enviar, salvando, enviando }: { detalhes: Reuniao; documento: DocumentoReuniao | null; setDocumento: (valor: DocumentoReuniao | null) => void; salvar: (evento: FormEvent<HTMLFormElement>) => void; enviar: (arquivo?: File) => void; salvando: boolean; enviando: boolean }) {
  if (documento) return <form className="pev-formulario" onSubmit={salvar}><div className="pev-formulario__topo"><div><small>ATA E ANEXOS</small><h2>{documento.id ? "Editar documento" : "Adicionar documento"}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={() => setDocumento(null)}>Fechar</button></div><div className="pev-grade-campos"><Campo rotulo="Título"><input value={documento.titulo} onChange={(e) => setDocumento({ ...documento, titulo: e.target.value })} required /></Campo><Campo rotulo="Tipo"><select value={documento.tipo} onChange={(e) => setDocumento({ ...documento, tipo: e.target.value })}><option value="ata">Ata</option><option value="transcricao">Transcrição</option><option value="lista_presenca">Lista de presença</option><option value="pauta">Pauta</option><option value="apresentacao">Apresentação</option><option value="relatorio">Relatório</option><option value="anexo">Anexo</option></select></Campo><Campo rotulo="Descrição" largo><textarea rows={4} value={documento.descricao} onChange={(e) => setDocumento({ ...documento, descricao: e.target.value })} /></Campo><Campo rotulo="Data do documento"><input type="date" value={documento.data} onChange={(e) => setDocumento({ ...documento, data: e.target.value })} /></Campo><Campo rotulo="Ordem"><input type="number" min={0} value={documento.ordem} onChange={(e) => setDocumento({ ...documento, ordem: Number(e.target.value) })} /></Campo><Campo rotulo="Link autorizado" dica="Links internos como /api/arquivos/... também são aceitos."><input type="text" value={documento.linkExterno} onChange={(e) => setDocumento({ ...documento, linkExterno: e.target.value })} placeholder="https:// ou /api/arquivos/…" /></Campo><Campo rotulo="Arquivo" dica="Todo upload começa privado; o servidor define a visibilidade definitiva ao salvar."><input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => void enviar(e.target.files?.[0])} disabled={enviando} />{documento.arquivoUrl && <span className="pev-arquivo-salvo"><a href={documento.arquivoUrl} target="_blank" rel="noreferrer">Abrir arquivo enviado</a><button type="button" onClick={() => setDocumento({ ...documento, arquivoUrl: "" })}>Remover</button></span>}</Campo></div><div className="pev-publicacao"><label><input type="checkbox" checked={documento.publicado} onChange={(e) => setDocumento({ ...documento, publicado: e.target.checked })} /><span>Documento público</span></label><p>O arquivo só será liberado depois que o servidor confirmar a publicação da reunião e deste documento.</p></div><div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={() => setDocumento(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando || enviando}>{enviando ? "Enviando…" : salvando ? "Salvando…" : "Salvar documento"}</button></div></form>;
  return <section className="pev-subpainel"><div className="pev-subpainel__topo"><div><h2>Ata e documentos</h2><p>Uploads começam privados. A publicação efetiva ocorre somente depois da validação do servidor.</p></div><button type="button" className="pev-botao pev-botao--primario" onClick={() => setDocumento({ ...documentoVazio })}>+ Adicionar documento</button></div>{!detalhes.documentos.length && <EstadoVazio titulo="Nenhum documento anexado" texto="Adicione a ata, pauta, lista de presença ou outro arquivo autorizado." />}<div className="pev-grade-subitens">{detalhes.documentos.map((item, indice) => <article key={item.id ?? indice}><span className={classeStatus(item.publicado ? "publicado" : "rascunho")}>{item.publicado ? "Público" : "Privado"}</span><h3>{item.titulo}</h3><p>{item.tipo.replaceAll("_", " ")}{item.data ? ` · ${dataLegivel(item.data)}` : ""}</p><div>{(item.arquivoUrl || item.linkExterno) && <a className="pev-botao" href={item.arquivoUrl || item.linkExterno} target="_blank" rel="noreferrer">Abrir</a>}<button type="button" className="pev-botao" onClick={() => setDocumento({ ...item })}>Editar</button></div></article>)}</div></section>;
}

function PainelPresencas({ detalhes, presencaManual, mudarPresencaManual, abrirPresencaManual, fecharPresencaManual, salvarPresencaManual, filtrosGeracao, setFiltrosGeracao, gerar, busca, setBusca, filtroSituacao, setFiltroSituacao, filtroTurno, setFiltroTurno, filtroNivel, setFiltroNivel, filtradas, selecionadas, alternar, selecionarFiltradas, aplicar, alterarPublicacao, salvando }: {
  detalhes: Reuniao;
  presencaManual: PresencaManual | null;
  mudarPresencaManual: (valor: PresencaManual) => void;
  abrirPresencaManual: () => void;
  fecharPresencaManual: () => void;
  salvarPresencaManual: (evento: FormEvent<HTMLFormElement>) => void;
  filtrosGeracao: { nivelEnsino: string; turno: string; serie: string; turma: string };
  setFiltrosGeracao: (valor: { nivelEnsino: string; turno: string; serie: string; turma: string }) => void;
  gerar: (evento: FormEvent<HTMLFormElement>) => void;
  busca: string;
  setBusca: (valor: string) => void;
  filtroSituacao: string;
  setFiltroSituacao: (valor: string) => void;
  filtroTurno: string;
  setFiltroTurno: (valor: string) => void;
  filtroNivel: string;
  setFiltroNivel: (valor: string) => void;
  filtradas: PresencaReuniao[];
  selecionadas: Set<Identificador>;
  alternar: (id: Identificador) => void;
  selecionarFiltradas: () => void;
  aplicar: (situacao: string, todas?: boolean) => void;
  alterarPublicacao: (publicado: boolean) => void;
  salvando: boolean;
}) {
  const reuniaoInterna = detalhes.tipo === "interna_gecep";

  if (presencaManual) {
    return <form className="pev-formulario" onSubmit={salvarPresencaManual}>
      <div className="pev-formulario__topo"><div><small>REUNIÃO INTERNA DO GECEP</small><h2>Adicionar membro à presença</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={fecharPresencaManual}>Fechar</button></div>
      <p className="pev-introducao">Este registro preserva um retrato histórico da pessoa na data da reunião. Não informe telefone, e-mail ou outros dados pessoais.</p>
      <div className="pev-grade-campos pev-grade-campos--tres">
        <Campo rotulo="Nome"><input value={presencaManual.nome} onChange={(e) => mudarPresencaManual({ ...presencaManual, nome: e.target.value })} required /></Campo>
        <Campo rotulo="Nível de ensino"><select value={presencaManual.nivelEnsino} onChange={(e) => mudarPresencaManual({ ...presencaManual, nivelEnsino: e.target.value })}>{niveisPainel.map(([valor, nome]) => <option key={valor} value={valor}>{valor ? nome : "Não informado"}</option>)}</select></Campo>
        <Campo rotulo="Ano ou série"><input value={presencaManual.serie} onChange={(e) => mudarPresencaManual({ ...presencaManual, serie: e.target.value })} /></Campo>
        <Campo rotulo="Turma"><input value={presencaManual.turma} onChange={(e) => mudarPresencaManual({ ...presencaManual, turma: e.target.value })} /></Campo>
        <Campo rotulo="Turno"><select value={presencaManual.turno} onChange={(e) => mudarPresencaManual({ ...presencaManual, turno: e.target.value })}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{valor ? nome : "Não informado"}</option>)}</select></Campo>
        <Campo rotulo="Função"><input value={presencaManual.funcao} onChange={(e) => mudarPresencaManual({ ...presencaManual, funcao: e.target.value })} placeholder="Ex.: membro, diretoria, convidado" /></Campo>
        <Campo rotulo="Situação"><select value={presencaManual.situacao} onChange={(e) => mudarPresencaManual({ ...presencaManual, situacao: e.target.value })}>{situacoesPresenca.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo>
        <Campo rotulo="Observação pública" largo><textarea rows={3} value={presencaManual.observacaoPublica} onChange={(e) => mudarPresencaManual({ ...presencaManual, observacaoPublica: e.target.value })} /></Campo>
        <Campo rotulo="Observação interna" dica="Nunca aparece no portal." largo><textarea rows={3} value={presencaManual.observacaoInterna} onChange={(e) => mudarPresencaManual({ ...presencaManual, observacaoInterna: e.target.value })} /></Campo>
      </div>
      <div className="pev-publicacao"><label><input type="checkbox" checked={presencaManual.publicado} onChange={(e) => mudarPresencaManual({ ...presencaManual, publicado: e.target.checked })} /><span>Publicar esta presença no portal</span></label><p>Por padrão, o registro fica oculto. A publicação exige confirmação ao salvar.</p></div>
      <div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={fecharPresencaManual}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : "Adicionar à presença"}</button></div>
    </form>;
  }

  return <section className="pev-subpainel">
    <div className="pev-subpainel__topo"><div><h2>Lista de presença</h2><p>Os nomes e turmas desta lista são cópias históricas e não mudam quando um mandato é alterado.</p></div>{reuniaoInterna && <button type="button" className="pev-botao pev-botao--primario" onClick={abrirPresencaManual}>+ Adicionar membro</button>}</div>
    {!reuniaoInterna && !detalhes.presencas.length && <form className="pev-gerar-presencas" onSubmit={gerar}><h3>Gerar lista inicial de representantes ativos</h3><div className="pev-grade-campos pev-grade-campos--quatro"><Campo rotulo="Nível"><select value={filtrosGeracao.nivelEnsino} onChange={(e) => setFiltrosGeracao({ ...filtrosGeracao, nivelEnsino: e.target.value })}>{niveisPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><Campo rotulo="Turno"><select value={filtrosGeracao.turno} onChange={(e) => setFiltrosGeracao({ ...filtrosGeracao, turno: e.target.value })}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><Campo rotulo="Ano / série"><input value={filtrosGeracao.serie} onChange={(e) => setFiltrosGeracao({ ...filtrosGeracao, serie: e.target.value })} /></Campo><Campo rotulo="Turma"><input value={filtrosGeracao.turma} onChange={(e) => setFiltrosGeracao({ ...filtrosGeracao, turma: e.target.value })} /></Campo></div><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Gerando…" : "Gerar lista de presença"}</button></form>}
    {reuniaoInterna && !detalhes.presencas.length && <EstadoVazio titulo="Nenhum membro registrado" texto="Adicione manualmente somente as pessoas que realmente participaram desta reunião interna." />}
    {detalhes.presencas.length > 0 && <>
      <div className="pev-filtros"><label className="pev-filtro--busca"><span>Buscar pessoa ou turma</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></label><label><span>Situação</span><select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}><option value="">Todas</option>{situacoesPresenca.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label><label><span>Turno</span><select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label><label><span>Nível</span><select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>{niveisPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label></div>
      <div className="pev-acoes-lote"><button type="button" className="pev-botao" onClick={selecionarFiltradas}>Selecionar resultados filtrados</button><span>{selecionadas.size} selecionado(s)</span><label><span>Marcar selecionados como</span><select defaultValue="" onChange={(e) => { if (e.target.value) void aplicar(e.target.value); e.target.value = ""; }} disabled={salvando}><option value="">Escolha…</option>{situacoesPresenca.filter(([valor]) => valor !== "nao_informada").map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label><button type="button" className="pev-botao" onClick={() => void aplicar("presente", true)} disabled={salvando || !filtradas.length}>Todos filtrados presentes</button><button type="button" className="pev-botao" onClick={() => void aplicar("ausente", true)} disabled={salvando || !filtradas.length}>Todos filtrados ausentes</button><button type="button" className="pev-botao" onClick={() => void alterarPublicacao(true)} disabled={salvando || !selecionadas.size}>Publicar selecionados</button><button type="button" className="pev-botao" onClick={() => void alterarPublicacao(false)} disabled={salvando || !selecionadas.size}>Ocultar selecionados</button></div>
      <div className="pev-tabela-wrap"><table className="pev-tabela"><thead><tr><th scope="col">Selecionar</th><th scope="col">Nome preservado</th><th scope="col">Turma</th><th scope="col">Turno / nível</th><th scope="col">Função</th><th scope="col">Situação</th><th scope="col">Portal</th></tr></thead><tbody>{filtradas.map((item) => <tr key={item.id}><td><input type="checkbox" aria-label={`Selecionar ${item.nome}`} checked={selecionadas.has(item.id)} onChange={() => alternar(item.id)} /></td><td>{item.nome}</td><td>{item.turma || "—"}</td><td>{[item.turno, item.nivelEnsino].filter(Boolean).join(" · ") || "—"}</td><td>{item.funcao || "—"}</td><td><span className={classeStatus(item.situacao)}>{statusLegivel(item.situacao)}</span></td><td><span className={classeStatus(item.publicado ? "publicado" : "rascunho")}>{item.publicado ? "Público" : "Oculto"}</span></td></tr>)}</tbody></table></div>
      {!filtradas.length && <EstadoVazio titulo="Nenhuma presença encontrada" texto="Altere os filtros para visualizar outros registros." />}
    </>}
  </section>;
}

function montarDetalheReuniao(resultado: unknown, alternativa: Record<string, unknown>) {
  if (!resultado || typeof resultado !== "object") return alternativa;
  const detalhe = resultado as Record<string, unknown>;
  const item = detalhe.item && typeof detalhe.item === "object" ? detalhe.item as Record<string, unknown> : detalhe;
  return {
    ...item,
    documentos: Array.isArray(detalhe.documentos) ? detalhe.documentos : item.documentos,
    votacoes: Array.isArray(detalhe.votacoes) ? detalhe.votacoes : item.votacoes,
    presencas: Array.isArray(detalhe.presencas) ? detalhe.presencas : item.presencas,
    itens: Array.isArray(detalhe.itens) ? detalhe.itens : item.itens,
  };
}

function normalizarReuniao(registro: Record<string, unknown>): Reuniao {
  const lista = (chave: string) => Array.isArray(registro[chave]) ? registro[chave] as Record<string, unknown>[] : [];
  const niveis = Array.isArray(registro.niveisEnsino) ? registro.niveisEnsino.filter((item): item is string => typeof item === "string") : obterTexto(registro, "nivelEnsino").split(",").filter(Boolean);
  return { id: (registro.id as Identificador) ?? crypto.randomUUID(), titulo: obterTexto(registro, "titulo"), slug: obterTexto(registro, "slug"), tipo: obterTexto(registro, "tipo") || "representantes", data: obterTexto(registro, "data"), horarioInicial: obterTexto(registro, "horarioInicial", "horario"), horarioFinal: obterTexto(registro, "horarioFinal"), local: obterTexto(registro, "local"), descricaoCurta: obterTexto(registro, "descricaoCurta"), responsaveis: obterTexto(registro, "responsaveis"), pauta: obterTexto(registro, "pauta"), pautaInterna: obterTexto(registro, "pautaInterna"), discussoes: obterTexto(registro, "discussoes", "assuntosDiscutidos"), resumo: obterTexto(registro, "resumo"), decisoes: obterTexto(registro, "decisoes"), propostas: obterTexto(registro, "propostas"), encaminhamentos: obterTexto(registro, "encaminhamentos"), ata: obterTexto(registro, "ata"), transcricao: obterTexto(registro, "transcricao"), observacoesPublicas: obterTexto(registro, "observacoesPublicas", "observacoes"), observacoesInternas: obterTexto(registro, "observacoesInternas"), situacao: obterTexto(registro, "situacao") || "agendada", turno: obterTexto(registro, "turno"), niveisEnsino: niveis, publicado: obterBooleano(registro, "publicado"), quantidadeParticipantesPublicada: obterBooleano(registro, "quantidadeParticipantesPublicada"), arquivado: obterBooleano(registro, "arquivado") || !obterBooleano(registro, "ativo", true), documentos: lista("documentos").map(normalizarDocumento), votacoes: lista("votacoes").map(normalizarVotacao), presencas: lista("presencas").map(normalizarPresenca), itens: lista("itens").map(normalizarItemReuniao), atualizadoEm: obterTexto(registro, "atualizadoEm") || undefined };
}

function normalizarDocumento(item: Record<string, unknown>): DocumentoReuniao { return { id: item.id as Identificador | undefined, titulo: obterTexto(item, "titulo"), tipo: obterTexto(item, "tipo"), descricao: obterTexto(item, "descricao"), arquivoUrl: obterTexto(item, "arquivoUrl", "url"), linkExterno: obterTexto(item, "linkExterno", "link"), data: obterTexto(item, "data", "dataDocumento"), ordem: obterNumero(item, "ordem"), publicado: obterBooleano(item, "publicado") }; }
function normalizarVotacao(item: Record<string, unknown>): VotacaoReuniao { const opcoes = Array.isArray(item.opcoes) ? item.opcoes as Record<string, unknown>[] : []; return { id: item.id as Identificador | undefined, titulo: obterTexto(item, "titulo"), pergunta: obterTexto(item, "pergunta", "proposta"), contexto: obterTexto(item, "contexto"), opcoes: opcoes.map((opcao, indice) => ({ id: opcao.id as Identificador | undefined, texto: obterTexto(opcao, "texto", "nome"), quantidadeVotos: obterNumero(opcao, "quantidadeVotos"), ordem: obterNumero(opcao, "ordem") || indice + 1, ativo: obterBooleano(opcao, "ativo", true) })), abstencoes: obterNumero(item, "abstencoes"), resultado: obterTexto(item, "resultado"), decisaoFinal: obterTexto(item, "decisaoFinal"), observacaoPublica: obterTexto(item, "observacaoPublica", "observacao"), observacaoInterna: obterTexto(item, "observacaoInterna"), ordem: obterNumero(item, "ordem"), publicado: obterBooleano(item, "publicado", true) }; }
function normalizarPresenca(item: Record<string, unknown>): PresencaReuniao { return { id: (item.id as Identificador) ?? crypto.randomUUID(), nome: obterTexto(item, "nomePreservado", "nome"), turma: obterTexto(item, "turmaPreservada", "turma"), turno: obterTexto(item, "turnoPreservado", "turno"), nivelEnsino: obterTexto(item, "nivelEnsinoPreservado", "nivelEnsino"), serie: obterTexto(item, "seriePreservada", "serie", "anoSerie"), funcao: obterTexto(item, "funcaoPreservada", "funcao"), situacao: obterTexto(item, "situacao") || "nao_informada", observacaoPublica: obterTexto(item, "observacaoPublica", "observacao"), observacaoInterna: obterTexto(item, "observacaoInterna"), publicado: obterBooleano(item, "publicado") }; }
function normalizarItemReuniao(item: Record<string, unknown>): ItemReuniao { return { id: item.id as Identificador | undefined, tipo: obterTexto(item, "tipo") || "item", titulo: obterTexto(item, "titulo"), conteudo: obterTexto(item, "conteudo", "descricao"), responsaveis: obterTexto(item, "responsaveis"), prazo: obterTexto(item, "prazo"), ordem: obterNumero(item, "ordem"), publicado: obterBooleano(item, "publicado"), ativo: obterBooleano(item, "ativo", true) }; }
