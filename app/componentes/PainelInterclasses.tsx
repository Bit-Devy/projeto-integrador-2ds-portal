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

type Participante = { id?: Identificador; nome: string; nomeExibicao: string; apelido: string; posicaoInicial: number; ativo: boolean };
type Fase = { id: Identificador; nome: string; ordem: number; tipo: string; quantidadeJogos: number; publicado: boolean; ativo: boolean };
type Partida = {
  id: Identificador; faseId: Identificador; rodada: string; ordem: number;
  participanteAId: Identificador | null; participanteBId: Identificador | null;
  participanteANome: string; participanteBNome: string; placarA: number | null; placarB: number | null;
  vencedorId: Identificador | null; vencedorNome: string; formaVitoria: string; data: string; horario: string;
  local: string; situacao: string; placarPublicado: boolean; resumo: string; destaques: string;
  observacoesPublicas: string; observacoesInternas: string; proximaPartidaId: Identificador | null;
  proximaPosicao: "" | "a" | "b"; publicado: boolean;
};
type Campeonato = {
  id: Identificador; slug: string; nome: string; edicao: string; ano: number | null; modalidade: string;
  categoria: string; turno: string; descricao: string; regulamento: string; organizacao: string; locais: string;
  observacoesPublicas: string; observacoesInternas: string; formato: string; situacao: string; faseAtual: string;
  dataInicial: string; dataFinal: string; imagemCapaUrl: string; chavePublicada: boolean; publicado: boolean;
  ativo: boolean; campeaoNome: string; atualizadoEm?: string;
};
type DocumentoCampeonato = {
  id?: Identificador;
  titulo: string;
  tipo: string;
  descricao: string;
  arquivoUrl: string;
  linkExterno: string;
  ordem: number;
  publicado: boolean;
  ativo: boolean;
};
type AtualizacaoCampeonato = {
  id?: Identificador;
  titulo: string;
  texto: string;
  data: string;
  ordem: number;
  publicado?: boolean;
  ativo?: boolean;
  atualizadoEm?: string;
};
type FormularioAtualizacao = Omit<AtualizacaoCampeonato, "atualizadoEm" | "publicado"> & {
  publicacao: "manter" | "publicar" | "ocultar";
};
type DetalhesCampeonato = {
  item: Campeonato;
  participantes: Participante[];
  fases: Fase[];
  partidas: Partida[];
  documentos: DocumentoCampeonato[];
  atualizacoes: AtualizacaoCampeonato[];
};
type FormularioCampeonato = Omit<Campeonato, "id" | "atualizadoEm" | "campeaoNome">;
type FormularioFase = Omit<Fase, "id">;
type FormularioPartida = Omit<Partida, "id" | "participanteANome" | "participanteBNome" | "vencedorNome" | "placarA" | "placarB" | "vencedorId" | "formaVitoria" | "situacao" | "placarPublicado" | "resumo" | "destaques">;
type ResultadoPartida = {
  faseId: string;
  rodada: string;
  ordem: number;
  participanteAId: string;
  participanteBId: string;
  placarA: string;
  placarB: string;
  vencedorId: string;
  formaVitoria: string;
  situacao: string;
  placarPublicado: boolean;
  data: string;
  horario: string;
  local: string;
  proximaPartidaId: string;
  proximaPosicao: "" | "a" | "b";
  publicado: boolean;
  resumo: string;
  destaques: string;
  observacoesPublicas: string;
  observacoesInternas: string;
  motivo: string;
};

const formularioVazio: FormularioCampeonato = {
  slug: "", nome: "", edicao: "", ano: new Date().getFullYear(), modalidade: "", categoria: "", turno: "",
  descricao: "", regulamento: "", organizacao: "", locais: "", observacoesPublicas: "", observacoesInternas: "",
  formato: "mata_mata", situacao: "proximo", faseAtual: "", dataInicial: "", dataFinal: "", imagemCapaUrl: "",
  chavePublicada: false, publicado: false, ativo: true,
};
const faseVazia: FormularioFase = { nome: "", ordem: 1, tipo: "eliminatoria", quantidadeJogos: 1, publicado: false, ativo: true };
const documentoVazio: DocumentoCampeonato = { titulo: "", tipo: "regulamento", descricao: "", arquivoUrl: "", linkExterno: "", ordem: 0, publicado: false, ativo: true };
const atualizacaoVazia: FormularioAtualizacao = { titulo: "", texto: "", data: "", ordem: 0, publicacao: "ocultar", ativo: true };
// A interface oferece apenas os dois formatos completos. O schema mantém os
// demais valores reservados para uma evolução futura, sem prometer ao gestor
// uma classificação automática que ainda não existe.
const formatos = [["mata_mata", "Mata-mata simples"], ["personalizada", "Chave personalizada"]] as const;
const situacoes = [["proximo", "Próximo"], ["em_andamento", "Em andamento"], ["encerrado", "Encerrado"], ["adiado", "Adiado"], ["cancelado", "Cancelado"]] as const;
const nomesEtapas = ["Informações", "Modalidade e conteúdo", "Participantes", "Formato", "Fases e jogos", "Revisão", "Publicação"];

export default function PainelInterclasses({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  const [itens, setItens] = useState<Campeonato[]>([]);
  const [formulario, setFormulario] = useState<FormularioCampeonato | null>(null);
  const [detalhes, setDetalhes] = useState<DetalhesCampeonato | null>(null);
  const [idEditando, setIdEditando] = useState<Identificador | null>(null);
  const [etapa, setEtapa] = useState(0);
  const [participantesLocais, setParticipantesLocais] = useState<Participante[]>([]);
  const [novoParticipante, setNovoParticipante] = useState<Participante>({ nome: "", nomeExibicao: "", apelido: "", posicaoInicial: 1, ativo: true });
  const [fase, setFase] = useState<FormularioFase | null>(null);
  const [partida, setPartida] = useState<FormularioPartida | null>(null);
  const [partidaResultado, setPartidaResultado] = useState<Partida | null>(null);
  const [resultado, setResultado] = useState<ResultadoPartida | null>(null);
  const [documento, setDocumento] = useState<DocumentoCampeonato | null>(null);
  const [atualizacao, setAtualizacao] = useState<FormularioAtualizacao | null>(null);
  const [campeaoSelecionado, setCampeaoSelecionado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<"capa" | "documento" | "">("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [mudou, setMudou] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState("");
  const [filtroAno, setFiltroAno] = useState("");

  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const itens = await requisitarTodasPaginasPainel<Record<string, unknown>>("/api/interclasses?todos=1", ["campeonatos", "interclasses"]);
      setItens(itens.map(normalizarCampeonato));
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Erro inesperado ao carregar os campeonatos."); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { const temporizador = window.setTimeout(() => void carregar(), 0); return () => window.clearTimeout(temporizador); }, [carregar]);

  const anos = useMemo(() => Array.from(new Set(itens.map((item) => item.ano).filter((ano): ano is number => ano !== null))).sort((a, b) => b - a), [itens]);
  const modalidades = useMemo(() => Array.from(new Set(itens.map((item) => item.modalidade).filter(Boolean))).sort(), [itens]);
  const filtrados = useMemo(() => { const termo = normalizarBusca(busca); return itens.filter((item) => (!termo || normalizarBusca(`${item.nome} ${item.edicao} ${item.modalidade} ${item.categoria}`).includes(termo)) && (!filtroSituacao || item.situacao === filtroSituacao) && (!filtroModalidade || item.modalidade === filtroModalidade) && (!filtroAno || String(item.ano) === filtroAno)); }, [busca, filtroAno, filtroModalidade, filtroSituacao, itens]);
  const participantes = idEditando === null ? participantesLocais : detalhes?.participantes ?? [];

  function mudar<K extends keyof FormularioCampeonato>(chave: K, valor: FormularioCampeonato[K]) { setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual); setMudou(true); setSucesso(""); }

  async function enviarCapa(arquivo?: File) {
    if (!arquivo || !formulario) return;
    if (formulario.imagemCapaUrl && !window.confirm("Substituir a imagem de capa atual? O arquivo anterior continuará preservado no armazenamento até a limpeza administrativa.")) return;
    setEnviando("capa");
    setErro("");
    setSucesso("");
    try {
      const resultado = await enviarArquivoPainel(arquivo, "privada");
      mudar("imagemCapaUrl", resultado.url);
      setSucesso("Imagem enviada como privada. Salve o campeonato para associá-la ao registro.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a imagem de capa.");
    } finally {
      setEnviando("");
    }
  }

  async function enviarDocumento(arquivo?: File) {
    if (!arquivo || !documento) return;
    setEnviando("documento");
    setErro("");
    setSucesso("");
    try {
      const resultado = await enviarArquivoPainel(arquivo, "privada");
      setDocumento((atual) => atual ? { ...atual, arquivoUrl: resultado.url, titulo: atual.titulo || resultado.nome || arquivo.name } : atual);
      setMudou(true);
      setSucesso("Arquivo enviado como privado. O servidor definirá a visibilidade depois que o documento for salvo.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar o documento.");
    } finally {
      setEnviando("");
    }
  }

  function definirDocumento(valor: DocumentoCampeonato | null) {
    if (valor !== null && documento === null && mudou) { setErro("Salve primeiro as alterações do campeonato antes de abrir um documento."); return; }
    if (valor === null && documento && mudou && !confirmarSaida(true)) return;
    setDocumento(valor);
    setMudou(Boolean(valor));
  }

  function definirAtualizacao(valor: FormularioAtualizacao | null) {
    if (valor !== null && atualizacao === null && mudou) { setErro("Salve primeiro as alterações do campeonato antes de abrir uma atualização."); return; }
    if (valor === null && atualizacao && mudou && !confirmarSaida(true)) return;
    setAtualizacao(valor);
    setMudou(Boolean(valor));
  }

  async function salvarDocumento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!documento || idEditando === null) return;
    if (!documento.arquivoUrl && !documento.linkExterno) { setErro("Envie um arquivo ou informe um link autorizado."); return; }
    if (documento.publicado && !window.confirm(`Publicar o documento “${documento.titulo.trim() || "sem título"}” no portal?`)) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const editando = documento.id !== undefined;
      await requisitarPainel("/api/interclasses", {
        method: editando ? "PUT" : "POST",
        ...corpoJson({ entidade: "documentos", campeonatoId: idEditando, ...(editando ? { id: documento.id } : {}), dados: documento }),
      });
      setDocumento(null);
      setMudou(false);
      setSucesso(documento.publicado ? "Documento salvo e autorizado para publicação." : "Documento salvo como privado.");
      await atualizarDetalhes();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o documento.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivarDocumento(item: DocumentoCampeonato) {
    if (item.id === undefined || !window.confirm(`Arquivar o documento “${item.titulo}”? O registro deixará de aparecer no portal e o arquivo interno voltará a ser privado quando não houver outra referência pública.`)) return;
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel(`/api/interclasses?entidade=documentos&id=${encodeURIComponent(String(item.id))}`, { method: "DELETE" });
      setSucesso("Documento arquivado e acesso público revogado quando aplicável.");
      await atualizarDetalhes();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível arquivar o documento.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAtualizacao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!atualizacao || idEditando === null) return;
    if (!atualizacao.titulo.trim()) { setErro("Informe o título da atualização."); return; }
    if (atualizacao.publicacao === "publicar" && !window.confirm(`Publicar a atualização “${atualizacao.titulo.trim()}” no portal?`)) return;
    const { publicacao, id, atualizadoEm: _atualizadoEm, ...campos } = atualizacao as FormularioAtualizacao & { atualizadoEm?: string };
    void _atualizadoEm;
    const dados = { ...campos, ...(publicacao === "manter" ? {} : { publicado: publicacao === "publicar" }) };
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const editando = id !== undefined;
      await requisitarPainel("/api/interclasses", {
        method: editando ? "PUT" : "POST",
        ...corpoJson({ entidade: "atualizacoes", campeonatoId: idEditando, ...(editando ? { id } : {}), dados }),
      });
      setAtualizacao(null);
      setMudou(false);
      setSucesso(publicacao === "publicar" ? "Atualização salva e publicada." : publicacao === "ocultar" ? "Atualização salva como rascunho." : "Atualização salva sem alterar a visibilidade atual.");
      await atualizarDetalhes();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a atualização.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivarAtualizacao(item: AtualizacaoCampeonato) {
    if (item.id === undefined || !window.confirm(`Arquivar a atualização “${item.titulo}”? Ela deixará de aparecer no portal.`)) return;
    setSalvando(true);
    setErro("");
    try {
      await requisitarPainel(`/api/interclasses?entidade=atualizacoes&id=${encodeURIComponent(String(item.id))}`, { method: "DELETE" });
      setSucesso("Atualização arquivada.");
      await atualizarDetalhes();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível arquivar a atualização.");
    } finally {
      setSalvando(false);
    }
  }

  function novo() {
    if (!confirmarSaida(mudou)) return;
    setFormulario({ ...formularioVazio, ano: new Date().getFullYear() }); setIdEditando(null); setDetalhes(null);
    setParticipantesLocais([]); setDocumento(null); setAtualizacao(null); setEtapa(0); setMudou(false); setErro(""); setSucesso("");
  }

  async function carregarDetalhes(id: Identificador) {
    const resposta = await requisitarPainel<Record<string, unknown>>(`/api/interclasses/${encodeURIComponent(String(id))}?todos=1`);
    return normalizarDetalhes(resposta);
  }

  async function editar(item: Campeonato, etapaInicial = 0) {
    if (!confirmarSaida(mudou)) return;
    setCarregando(true); setErro("");
    try {
      const completo = await carregarDetalhes(item.id);
      const { id: _id, campeaoNome: _campeao, atualizadoEm: _atualizado, ...dados } = completo.item;
      void _id; void _campeao; void _atualizado;
      setFormulario(dados); setDetalhes(completo); setIdEditando(item.id); setDocumento(null); setAtualizacao(null); setEtapa(etapaInicial); setMudou(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o campeonato."); }
    finally { setCarregando(false); }
  }

  async function atualizarDetalhes() { if (idEditando !== null) setDetalhes(await carregarDetalhes(idEditando)); }

  function fechar() { if (!confirmarSaida(mudou)) return; setFormulario(null); setDetalhes(null); setIdEditando(null); setMudou(false); setFase(null); setPartida(null); setPartidaResultado(null); setResultado(null); setDocumento(null); setAtualizacao(null); }

  async function salvarCampeonato(publicar = false) {
    if (!formulario) return;
    if (!formulario.nome.trim() || !formulario.modalidade.trim()) { setErro("Informe o nome e a modalidade antes de salvar."); setEtapa(formulario.nome.trim() ? 1 : 0); return; }
    if (participantes.some((item) => !item.nome.trim())) { setErro("Revise os participantes sem nome."); setEtapa(2); return; }
    setSalvando(true); setErro(""); setSucesso("");
    try {
      const dados = { ...formulario, slug: formulario.slug || criarSlug(formulario.nome), publicado: publicar ? true : formulario.publicado, participantes: idEditando === null ? participantesLocais.map(({ id: _id, ...item }) => { void _id; return item; }) : undefined };
      const resposta = await requisitarPainel<Record<string, unknown>>("/api/interclasses", { method: idEditando === null ? "POST" : "PUT", ...corpoJson(idEditando === null ? { dados } : { id: idEditando, dados }) });
      const itemResposta = resposta.item && typeof resposta.item === "object" ? resposta.item as Record<string, unknown> : null;
      const novoId = itemResposta?.id as Identificador | undefined;
      setMudou(false); setSucesso(publicar ? "Campeonato publicado com sucesso." : "Rascunho do campeonato salvo.");
      await carregar();
      if (idEditando === null && novoId !== undefined) {
        const completo = await carregarDetalhes(novoId);
        setIdEditando(novoId); setDetalhes(completo);
        const { id: _id, campeaoNome: _campeao, atualizadoEm: _atualizado, ...salvo } = completo.item;
        void _id; void _campeao; void _atualizado; setFormulario(salvo);
      } else if (idEditando !== null) await atualizarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o campeonato."); }
    finally { setSalvando(false); }
  }

  async function duplicar(item: Campeonato) {
    if (!window.confirm(`Duplicar “${item.nome}” como rascunho? Participantes e estrutura serão copiados, mas nenhum resultado será reaproveitado.`)) return;
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "POST", ...corpoJson({ acao: "duplicar", id: item.id }) }); setSucesso("Edição duplicada como rascunho, sem resultados."); await carregar(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível duplicar o campeonato."); }
    finally { setSalvando(false); }
  }

  async function arquivar(item: Campeonato) {
    if (!window.confirm(`Arquivar “${item.nome}”? Jogos, participantes e resultados históricos serão preservados.`)) return;
    setSalvando(true); setErro("");
    try { await requisitarPainel(`/api/interclasses?id=${encodeURIComponent(String(item.id))}&acao=arquivar`, { method: "DELETE" }); setSucesso("Campeonato arquivado e histórico preservado."); await carregar(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível arquivar o campeonato."); }
    finally { setSalvando(false); }
  }

  async function adicionarParticipante(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!novoParticipante.nome.trim()) return;
    const dados = { ...novoParticipante, nomeExibicao: novoParticipante.nomeExibicao || novoParticipante.nome, posicaoInicial: participantes.length + 1 };
    if (participantes.some((item) => normalizarBusca(item.nomeExibicao || item.nome) === normalizarBusca(dados.nomeExibicao))) { setErro("Já existe um participante com esse nome de exibição."); return; }
    if (idEditando === null) { setParticipantesLocais((atuais) => [...atuais, dados]); setNovoParticipante({ nome: "", nomeExibicao: "", apelido: "", posicaoInicial: participantes.length + 2, ativo: true }); setMudou(true); return; }
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "POST", ...corpoJson({ entidade: "participantes", campeonatoId: idEditando, dados }) }); setNovoParticipante({ nome: "", nomeExibicao: "", apelido: "", posicaoInicial: participantes.length + 2, ativo: true }); setSucesso("Participante adicionado."); await atualizarDetalhes(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível adicionar o participante."); }
    finally { setSalvando(false); }
  }

  async function removerParticipante(item: Participante, indice: number) {
    if (!window.confirm(`Remover “${item.nomeExibicao || item.nome}” da chave? Jogos já preenchidos podem ser afetados e exigirão revisão.`)) return;
    if (idEditando === null) { setParticipantesLocais((atuais) => atuais.filter((_, i) => i !== indice)); setMudou(true); return; }
    if (!item.id) return;
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "PUT", ...corpoJson({ entidade: "participantes", campeonatoId: idEditando, id: item.id, dados: { ativo: false }, confirmar: true }) }); setSucesso("Participante removido da edição atual; o histórico foi preservado."); await atualizarDetalhes(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível remover o participante."); }
    finally { setSalvando(false); }
  }

  async function renomearParticipante(item: Participante, indice: number) {
    const atual = item.nomeExibicao || item.nome;
    const nomeExibicao = window.prompt("Nome que deve aparecer na chave:", atual)?.trim();
    if (!nomeExibicao || nomeExibicao === atual) return;
    if (participantes.some((outro, outroIndice) => outroIndice !== indice && normalizarBusca(outro.nomeExibicao || outro.nome) === normalizarBusca(nomeExibicao))) {
      setErro("Já existe outro participante com esse nome de exibição."); return;
    }
    if (idEditando === null) { setParticipantesLocais((atuais) => atuais.map((registro, i) => i === indice ? { ...registro, nomeExibicao } : registro)); setMudou(true); return; }
    if (!item.id) return;
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "PUT", ...corpoJson({ entidade: "participantes", campeonatoId: idEditando, id: item.id, dados: { nomeExibicao } }) }); setSucesso("Nome de exibição atualizado."); await atualizarDetalhes(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível renomear o participante."); }
    finally { setSalvando(false); }
  }

  async function gerarChave() {
    if (idEditando === null) { setErro("Salve o rascunho antes de gerar a chave."); return; }
    if (participantes.filter((item) => item.ativo).length < 2) { setErro("Adicione pelo menos dois participantes antes de gerar a chave."); return; }
    const substituir = Boolean(detalhes?.fases.length || detalhes?.partidas.length);
    if (substituir && !window.confirm("Já existe uma chave. Gerar novamente pode alterar confrontos e afetar jogos. Deseja continuar para a confirmação final?")) return;
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "PUT", ...corpoJson({ acao: "gerar_chave", id: idEditando, confirmar: substituir }) }); setSucesso("Chave inicial gerada. Revise a prévia antes de publicar."); await atualizarDetalhes(); setEtapa(4); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível gerar a chave."); }
    finally { setSalvando(false); }
  }

  async function salvarFase(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!fase || idEditando === null) return; setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "POST", ...corpoJson({ entidade: "fases", campeonatoId: idEditando, dados: fase }) }); setFase(null); setMudou(false); setSucesso("Fase adicionada."); await atualizarDetalhes(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível adicionar a fase."); }
    finally { setSalvando(false); }
  }

  async function salvarPartida(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!partida || idEditando === null) return;
    if (partida.participanteAId && partida.participanteBId && String(partida.participanteAId) === String(partida.participanteBId)) { setErro("Uma equipe não pode jogar contra ela mesma."); return; }
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "POST", ...corpoJson({ entidade: "partidas", campeonatoId: idEditando, dados: partida }) }); setPartida(null); setMudou(false); setSucesso("Jogo adicionado à chave."); await atualizarDetalhes(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível adicionar o jogo."); }
    finally { setSalvando(false); }
  }

  function abrirResultado(jogo: Partida) {
    setPartidaResultado(jogo); setResultado({ faseId: String(jogo.faseId), rodada: jogo.rodada, ordem: jogo.ordem, participanteAId: jogo.participanteAId === null ? "" : String(jogo.participanteAId), participanteBId: jogo.participanteBId === null ? "" : String(jogo.participanteBId), placarA: jogo.placarA === null ? "" : String(jogo.placarA), placarB: jogo.placarB === null ? "" : String(jogo.placarB), vencedorId: jogo.vencedorId === null ? "" : String(jogo.vencedorId), formaVitoria: jogo.formaVitoria, situacao: jogo.situacao, placarPublicado: jogo.placarPublicado, data: jogo.data, horario: jogo.horario, local: jogo.local, proximaPartidaId: jogo.proximaPartidaId === null ? "" : String(jogo.proximaPartidaId), proximaPosicao: jogo.proximaPosicao, publicado: jogo.publicado, resumo: jogo.resumo, destaques: jogo.destaques, observacoesPublicas: jogo.observacoesPublicas, observacoesInternas: jogo.observacoesInternas, motivo: "" }); setMudou(false);
  }

  async function registrarResultado(evento: FormEvent<HTMLFormElement>, confirmarImpacto = false) {
    evento.preventDefault(); if (!partidaResultado || !resultado || idEditando === null) return;
    if (resultado.participanteAId && resultado.participanteBId && resultado.participanteAId === resultado.participanteBId) { setErro("Uma equipe não pode jogar contra ela mesma."); return; }
    if (!resultado.faseId) { setErro("Escolha a fase da partida."); return; }
    if (resultado.proximaPartidaId === String(partidaResultado.id)) { setErro("Uma partida não pode encaminhar o vencedor para ela mesma."); return; }
    if (resultado.proximaPartidaId && !resultado.proximaPosicao) { setErro("Escolha a posição do vencedor na próxima partida."); return; }
    const participantesValidos = [resultado.participanteAId, resultado.participanteBId].filter(Boolean);
    if (resultado.vencedorId && !participantesValidos.includes(resultado.vencedorId)) { setErro("O vencedor precisa ser um dos participantes deste jogo."); return; }
    const resultadoFinal = resultado.situacao === "encerrada" || resultado.situacao === "wo";
    if (resultadoFinal && resultado.situacao !== "wo" && (resultado.placarA === "" || resultado.placarB === "")) { setErro("Informe os dois placares ou escolha vitória por W.O."); return; }
    if (resultadoFinal && !resultado.vencedorId) { setErro("Escolha o vencedor para concluir a partida."); return; }
    const corrigindo = partidaResultado.vencedorId !== null || partidaResultado.placarA !== null || partidaResultado.placarB !== null;
    if (corrigindo && !resultado.motivo.trim()) { setErro("Informe o motivo da correção para preservar o histórico."); return; }
    setSalvando(true); setErro("");
    try {
      if (!resultadoFinal && !corrigindo) {
        await requisitarPainel("/api/interclasses", { method: "PUT", ...corpoJson({ entidade: "partidas", campeonatoId: idEditando, id: partidaResultado.id, dados: { faseId: resultado.faseId, participanteAId: resultado.participanteAId || null, participanteBId: resultado.participanteBId || null, rodada: resultado.rodada, ordem: resultado.ordem, data: resultado.data, horario: resultado.horario, local: resultado.local, situacao: resultado.situacao, placarPublicado: resultado.placarPublicado, resumo: resultado.resumo, destaques: resultado.destaques, observacoesPublicas: resultado.observacoesPublicas, observacoesInternas: resultado.observacoesInternas, proximaPartidaId: resultado.proximaPartidaId || null, proximaPosicao: resultado.proximaPartidaId ? resultado.proximaPosicao : "", publicado: resultado.publicado } }) });
        setPartidaResultado(null); setResultado(null); setMudou(false); setSucesso(`Jogo marcado como ${statusLegivel(resultado.situacao).toLowerCase()}.`); await atualizarDetalhes(); return;
      }
      const resposta = await fetch("/api/interclasses", { method: "PUT", ...corpoJson({ acao: "registrar_resultado", id: idEditando, partidaId: partidaResultado.id, confirmarImpacto, motivo: resultado.motivo, dados: { ...resultado, proximaPartidaId: resultado.proximaPartidaId || null, proximaPosicao: resultado.proximaPartidaId ? resultado.proximaPosicao : "", placarA: resultadoFinal && resultado.placarA !== "" ? Number(resultado.placarA) : null, placarB: resultadoFinal && resultado.placarB !== "" ? Number(resultado.placarB) : null, vencedorId: resultadoFinal && resultado.vencedorId ? Number(resultado.vencedorId) : null, formaVitoria: resultadoFinal ? resultado.formaVitoria : "" } }) });
      const dados = await resposta.json() as { erro?: string; mensagem?: string; impacto?: { mensagem?: string; partidasAfetadas?: Array<{ fase?: string; participanteAtual?: string; resultadoPosteriorPreenchido?: boolean }> }; exigeConfirmacao?: boolean };
      if (!resposta.ok) {
        const exige = resposta.status === 409 || dados.exigeConfirmacao || dados.impacto;
        if (exige && !confirmarImpacto) {
          const afetadas = dados.impacto?.partidasAfetadas?.map((item) => `${item.fase || "Fase seguinte"}${item.resultadoPosteriorPreenchido ? " (já possui resultado)" : ""}`).join("\n");
          const confirmar = window.confirm(`${dados.impacto?.mensagem || dados.mensagem || dados.erro || "Esta correção afeta jogos posteriores."}${afetadas ? `\n\nJogos afetados:\n${afetadas}` : ""}\n\nConfirmar a correção e revisar manualmente as partidas seguintes?`);
          if (confirmar) { setSalvando(false); await registrarResultado(evento, true); }
          return;
        }
        throw new Error(dados.erro || dados.mensagem || "Não foi possível registrar o resultado.");
      }
      setPartidaResultado(null); setResultado(null); setMudou(false); setSucesso(corrigindo ? "Resultado corrigido. Revise os jogos seguintes indicados pela chave." : "Resultado registrado e vencedor encaminhado à fase seguinte."); await atualizarDetalhes();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível registrar o resultado."); }
    finally { setSalvando(false); }
  }

  async function definirCampeao() {
    if (idEditando === null || !campeaoSelecionado) { setErro("Escolha o campeão antes de encerrar o campeonato."); return; }
    const nome = participantes.find((item) => String(item.id) === campeaoSelecionado)?.nomeExibicao || participantes.find((item) => String(item.id) === campeaoSelecionado)?.nome || "participante escolhido";
    if (!window.confirm(`Encerrar o campeonato e registrar “${nome}” como campeão? Confira todos os resultados antes de continuar.`)) return;
    setSalvando(true); setErro("");
    try { await requisitarPainel("/api/interclasses", { method: "PUT", ...corpoJson({ acao: "definir_campeao", id: idEditando, participanteId: Number(campeaoSelecionado) }) }); setSucesso("Campeão registrado e campeonato encerrado."); await atualizarDetalhes(); await carregar(); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível encerrar o campeonato."); }
    finally { setSalvando(false); }
  }

  // As sete etapas editam o mesmo rascunho em memória; trocar de etapa não
  // descarta nem marca como salvas as alterações ainda não enviadas.
  function irEtapa(nova: number) {
    if (nova !== etapa && (documento || atualizacao || fase || partida || resultado)) {
      setErro("Salve ou cancele o editor aberto antes de mudar de etapa.");
      return;
    }
    setEtapa(nova);
  }

  return <section className="pev-painel" aria-labelledby="titulo-painel-interclasses">
    <CabecalhoPainel rotulo="ESPORTE E INTEGRAÇÃO" titulo="Interclasses e campeonatos" descricao="Crie o campeonato em etapas, organize confrontos e publique resultados com confirmação de impactos." acao={formulario ? undefined : novo} nomeAcao="+ Novo campeonato" />
    <MensagensPainel erro={erro} sucesso={sucesso} />
    {formulario ? <div className="pev-editor-completo"><nav className="pev-etapas" aria-label="Etapas do campeonato">{nomesEtapas.map((nome, indice) => <button type="button" className={etapa === indice ? "ativo" : indice < etapa ? "concluida" : ""} aria-current={etapa === indice ? "step" : undefined} onClick={() => irEtapa(indice)} key={nome}><span>{indice + 1}</span>{nome}</button>)}</nav>
      <div className="pev-formulario"><div className="pev-formulario__topo"><div><small>ETAPA {etapa + 1} DE 7</small><h2 id="titulo-painel-interclasses">{nomesEtapas[etapa]}</h2></div><button type="button" className="pev-botao pev-botao--texto" onClick={fechar}>Fechar</button></div>
        {etapa === 0 && <EtapaInformacoes formulario={formulario} mudar={mudar} enviarCapa={enviarCapa} enviando={enviando === "capa"} />}
        {etapa === 1 && <EtapaModalidade formulario={formulario} mudar={mudar} detalhes={detalhes} salvo={idEditando !== null} documento={documento} setDocumento={definirDocumento} salvarDocumento={salvarDocumento} enviarDocumento={enviarDocumento} arquivarDocumento={arquivarDocumento} atualizacao={atualizacao} setAtualizacao={definirAtualizacao} salvarAtualizacao={salvarAtualizacao} arquivarAtualizacao={arquivarAtualizacao} salvando={salvando} enviandoDocumento={enviando === "documento"} />}
        {etapa === 2 && <EtapaParticipantes participantes={participantes} novoParticipante={novoParticipante} setNovoParticipante={setNovoParticipante} adicionar={adicionarParticipante} renomear={renomearParticipante} remover={removerParticipante} salvando={salvando} />}
        {etapa === 3 && <EtapaFormato formulario={formulario} mudar={mudar} participantes={participantes} gerar={gerarChave} podeGerar={idEditando !== null} salvando={salvando} />}
        {etapa === 4 && <EtapaChave detalhes={detalhes} participantes={participantes} fase={fase} setFase={(valor) => { setFase(valor); setMudou(Boolean(valor)); }} salvarFase={salvarFase} partida={partida} setPartida={(valor) => { setPartida(valor); setMudou(Boolean(valor)); }} salvarPartida={salvarPartida} abrirResultado={abrirResultado} salvando={salvando} />}
        {etapa === 5 && <EtapaRevisao formulario={formulario} participantes={participantes} detalhes={detalhes} />}
        {etapa === 6 && <EtapaPublicacao formulario={formulario} mudar={mudar} participantes={participantes} detalhes={detalhes} salvar={() => void salvarCampeonato(true)} campeaoSelecionado={campeaoSelecionado} setCampeaoSelecionado={setCampeaoSelecionado} definirCampeao={definirCampeao} salvando={salvando} />}
        {resultado && partidaResultado && <FormularioResultado jogo={partidaResultado} fases={detalhes?.fases ?? []} partidas={detalhes?.partidas ?? []} participantes={participantes} resultado={resultado} setResultado={(valor) => { setResultado(valor); setMudou(true); }} salvar={registrarResultado} fechar={() => { if (confirmarSaida(mudou)) { setResultado(null); setPartidaResultado(null); setMudou(false); } }} salvando={salvando} />}
        {!resultado && !documento && !atualizacao && <div className="pev-navegacao-etapas"><button type="button" className="pev-botao" onClick={() => etapa === 0 ? fechar() : irEtapa(etapa - 1)}>{etapa === 0 ? "Cancelar" : "Voltar"}</button><div><button type="button" className="pev-botao" onClick={() => void salvarCampeonato(false)} disabled={salvando}>{salvando ? "Salvando…" : "Salvar rascunho"}</button>{etapa < 6 && <button type="button" className="pev-botao pev-botao--primario" onClick={() => { if (etapa === 2 && participantes.length < 2) { setErro("Adicione pelo menos dois participantes para continuar."); return; } setEtapa((atual) => Math.min(6, atual + 1)); }}>Continuar</button>}</div></div>}
      </div>
    </div> : <><div className="pev-filtros"><label className="pev-filtro--busca"><span>Buscar campeonato</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, edição, modalidade ou categoria" /></label><label><span>Situação</span><select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}><option value="">Todas</option>{situacoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label><label><span>Modalidade</span><select value={filtroModalidade} onChange={(e) => setFiltroModalidade(e.target.value)}><option value="">Todas</option>{modalidades.map((nome) => <option key={nome}>{nome}</option>)}</select></label><label><span>Ano</span><select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}><option value="">Todos</option>{anos.map((ano) => <option key={ano}>{ano}</option>)}</select></label></div>{carregando && <EstadoVazio titulo="Carregando campeonatos…" texto="Aguarde enquanto consultamos chaves e resultados." />}{!carregando && !filtrados.length && <EstadoVazio titulo={itens.length ? "Nenhum campeonato encontrado" : "Nenhum campeonato cadastrado"} texto={itens.length ? "Altere os filtros ou a busca." : "Use “Novo campeonato” para iniciar uma edição."} />}<div className="pev-lista">{filtrados.map((item) => <article className="pev-cartao" key={item.id}><div className="pev-cartao__estados"><span className={classeStatus(item.publicado ? "publicado" : item.ativo ? "rascunho" : "arquivado")}>{item.publicado ? "Publicado" : item.ativo ? "Rascunho" : "Arquivado"}</span><span className={classeStatus(item.situacao)}>{statusLegivel(item.situacao)}</span></div><div className="pev-cartao__conteudo"><h2>{item.nome}</h2><p>{[item.edicao || item.ano, item.modalidade, item.categoria].filter(Boolean).join(" · ")}</p><small>{item.situacao === "encerrado" && item.campeaoNome ? `Campeão: ${item.campeaoNome}` : item.faseAtual ? `Fase atual: ${item.faseAtual}` : item.chavePublicada ? "Chave publicada" : "Chave ainda oculta"}</small></div><div className="pev-cartao__acoes"><button type="button" className="pev-botao" onClick={() => void editar(item)}>Editar</button><button type="button" className="pev-botao" onClick={() => void editar(item, 4)}>Chave e jogos</button><button type="button" className="pev-botao" onClick={() => void duplicar(item)}>Duplicar edição</button>{item.ativo && <button type="button" className="pev-botao pev-botao--perigoso" onClick={() => void arquivar(item)}>Arquivar</button>}</div></article>)}</div></>}
  </section>;
}

function EtapaInformacoes({ formulario, mudar, enviarCapa, enviando }: { formulario: FormularioCampeonato; mudar: <K extends keyof FormularioCampeonato>(chave: K, valor: FormularioCampeonato[K]) => void; enviarCapa: (arquivo?: File) => void; enviando: boolean }) {
  return <><p className="pev-introducao">Comece pela identificação pública. Você poderá salvar o rascunho a qualquer momento.</p><div className="pev-grade-campos"><Campo rotulo="Nome do campeonato"><input value={formulario.nome} onChange={(e) => mudar("nome", e.target.value)} required /></Campo><Campo rotulo="Edição"><input value={formulario.edicao} onChange={(e) => mudar("edicao", e.target.value)} placeholder="Ex.: 2026 ou 12ª edição" /></Campo><Campo rotulo="Ano"><input type="number" min={2000} max={2100} value={formulario.ano ?? ""} onChange={(e) => mudar("ano", e.target.value ? Number(e.target.value) : null)} /></Campo><Campo rotulo="Situação"><select value={formulario.situacao} onChange={(e) => mudar("situacao", e.target.value)}>{situacoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><Campo rotulo="Data inicial"><input type="date" value={formulario.dataInicial} onChange={(e) => mudar("dataInicial", e.target.value)} /></Campo><Campo rotulo="Data prevista para encerramento"><input type="date" min={formulario.dataInicial || undefined} value={formulario.dataFinal} onChange={(e) => mudar("dataFinal", e.target.value)} /></Campo><Campo rotulo="Descrição completa" largo><textarea rows={7} value={formulario.descricao} onChange={(e) => mudar("descricao", e.target.value)} /></Campo><Campo rotulo="Organização"><input value={formulario.organizacao} onChange={(e) => mudar("organizacao", e.target.value)} /></Campo><Campo rotulo="Local ou locais"><input value={formulario.locais} onChange={(e) => mudar("locais", e.target.value)} /></Campo><Campo rotulo="Endereço da imagem de capa" dica="Aceita endereço HTTPS ou arquivo interno."><input type="text" value={formulario.imagemCapaUrl} onChange={(e) => mudar("imagemCapaUrl", e.target.value)} placeholder="https:// ou /api/arquivos/…" />{formulario.imagemCapaUrl && <span className="pev-arquivo-salvo"><a href={formulario.imagemCapaUrl} target="_blank" rel="noreferrer">Abrir imagem atual</a><button type="button" onClick={() => mudar("imagemCapaUrl", "")}>Remover</button></span>}</Campo><Campo rotulo="Enviar nova imagem" dica="O upload sempre começa privado e só é associado depois de salvar."><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void enviarCapa(e.target.files?.[0])} disabled={enviando} /></Campo></div></>;
}

function EtapaModalidade({ formulario, mudar, detalhes, salvo, documento, setDocumento, salvarDocumento, enviarDocumento, arquivarDocumento, atualizacao, setAtualizacao, salvarAtualizacao, arquivarAtualizacao, salvando, enviandoDocumento }: {
  formulario: FormularioCampeonato;
  mudar: <K extends keyof FormularioCampeonato>(chave: K, valor: FormularioCampeonato[K]) => void;
  detalhes: DetalhesCampeonato | null;
  salvo: boolean;
  documento: DocumentoCampeonato | null;
  setDocumento: (valor: DocumentoCampeonato | null) => void;
  salvarDocumento: (evento: FormEvent<HTMLFormElement>) => void;
  enviarDocumento: (arquivo?: File) => void;
  arquivarDocumento: (item: DocumentoCampeonato) => void;
  atualizacao: FormularioAtualizacao | null;
  setAtualizacao: (valor: FormularioAtualizacao | null) => void;
  salvarAtualizacao: (evento: FormEvent<HTMLFormElement>) => void;
  arquivarAtualizacao: (item: AtualizacaoCampeonato) => void;
  salvando: boolean;
  enviandoDocumento: boolean;
}) {
  return <><div className="pev-grade-campos"><Campo rotulo="Modalidade"><input value={formulario.modalidade} onChange={(e) => mudar("modalidade", e.target.value)} placeholder="Ex.: futsal" required /></Campo><Campo rotulo="Categoria"><input value={formulario.categoria} onChange={(e) => mudar("categoria", e.target.value)} placeholder="Ex.: feminino, masculino ou mista" /></Campo><Campo rotulo="Turno"><select value={formulario.turno} onChange={(e) => mudar("turno", e.target.value)}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><Campo rotulo="Fase atual"><input value={formulario.faseAtual} onChange={(e) => mudar("faseAtual", e.target.value)} placeholder="Ex.: quartas de final" /></Campo><Campo rotulo="Regulamento" largo><textarea rows={8} value={formulario.regulamento} onChange={(e) => mudar("regulamento", e.target.value)} /></Campo><Campo rotulo="Observações públicas"><textarea rows={4} value={formulario.observacoesPublicas} onChange={(e) => mudar("observacoesPublicas", e.target.value)} /></Campo><Campo rotulo="Observações internas" dica="Não aparecem no portal."><textarea rows={4} value={formulario.observacoesInternas} onChange={(e) => mudar("observacoesInternas", e.target.value)} /></Campo></div>{salvo && detalhes ? <GestaoConteudoInterclasse detalhes={detalhes} documento={documento} setDocumento={setDocumento} salvarDocumento={salvarDocumento} enviarDocumento={enviarDocumento} arquivarDocumento={arquivarDocumento} atualizacao={atualizacao} setAtualizacao={setAtualizacao} salvarAtualizacao={salvarAtualizacao} arquivarAtualizacao={arquivarAtualizacao} salvando={salvando} enviandoDocumento={enviandoDocumento} /> : <p className="pev-aviso pev-aviso--atencao">Salve o campeonato como rascunho para adicionar documentos e atualizações.</p>}</>;
}

function GestaoConteudoInterclasse({ detalhes, documento, setDocumento, salvarDocumento, enviarDocumento, arquivarDocumento, atualizacao, setAtualizacao, salvarAtualizacao, arquivarAtualizacao, salvando, enviandoDocumento }: {
  detalhes: DetalhesCampeonato;
  documento: DocumentoCampeonato | null;
  setDocumento: (valor: DocumentoCampeonato | null) => void;
  salvarDocumento: (evento: FormEvent<HTMLFormElement>) => void;
  enviarDocumento: (arquivo?: File) => void;
  arquivarDocumento: (item: DocumentoCampeonato) => void;
  atualizacao: FormularioAtualizacao | null;
  setAtualizacao: (valor: FormularioAtualizacao | null) => void;
  salvarAtualizacao: (evento: FormEvent<HTMLFormElement>) => void;
  arquivarAtualizacao: (item: AtualizacaoCampeonato) => void;
  salvando: boolean;
  enviandoDocumento: boolean;
}) {
  function editarAtualizacao(item: AtualizacaoCampeonato) {
    const { publicado, atualizadoEm: _atualizadoEm, ...campos } = item;
    void _atualizadoEm;
    setAtualizacao({ ...campos, publicacao: publicado === true ? "publicar" : publicado === false ? "ocultar" : "manter" });
  }

  if (documento) return <form className="pev-formulario-inline" onSubmit={salvarDocumento}><div className="pev-formulario__topo"><div><small>DOCUMENTO DO CAMPEONATO</small><h3>{documento.id === undefined ? "Adicionar documento" : "Editar documento"}</h3></div><button type="button" className="pev-botao pev-botao--texto" onClick={() => setDocumento(null)}>Fechar</button></div><div className="pev-grade-campos pev-grade-campos--tres"><Campo rotulo="Título"><input value={documento.titulo} onChange={(e) => setDocumento({ ...documento, titulo: e.target.value })} required /></Campo><Campo rotulo="Tipo"><select value={documento.tipo} onChange={(e) => setDocumento({ ...documento, tipo: e.target.value })}><option value="regulamento">Regulamento</option><option value="tabela">Tabela</option><option value="comunicado">Comunicado</option><option value="relatorio">Relatório</option><option value="imagem">Imagem</option><option value="anexo">Anexo</option></select></Campo><Campo rotulo="Ordem"><input type="number" min={0} value={documento.ordem} onChange={(e) => setDocumento({ ...documento, ordem: Number(e.target.value) })} /></Campo><Campo rotulo="Descrição" largo><textarea rows={4} value={documento.descricao} onChange={(e) => setDocumento({ ...documento, descricao: e.target.value })} /></Campo><Campo rotulo="Link autorizado"><input type="text" value={documento.linkExterno} onChange={(e) => setDocumento({ ...documento, linkExterno: e.target.value })} placeholder="https://" /></Campo><Campo rotulo="Arquivo" dica="Todo upload começa privado; o endpoint libera o objeto somente após persistir a publicação."><input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => void enviarDocumento(e.target.files?.[0])} disabled={enviandoDocumento} />{documento.arquivoUrl && <span className="pev-arquivo-salvo"><a href={documento.arquivoUrl} target="_blank" rel="noreferrer">Abrir arquivo</a><button type="button" onClick={() => setDocumento({ ...documento, arquivoUrl: "" })}>Remover</button></span>}</Campo></div><div className="pev-publicacao"><label><input type="checkbox" checked={documento.publicado} onChange={(e) => setDocumento({ ...documento, publicado: e.target.checked })} /><span>Publicar documento no portal</span></label><p>Arquivos de rascunho permanecem privados. A publicação exige confirmação ao salvar.</p></div><div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={() => setDocumento(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando || enviandoDocumento}>{enviandoDocumento ? "Enviando…" : salvando ? "Salvando…" : "Salvar documento"}</button></div></form>;

  if (atualizacao) return <form className="pev-formulario-inline" onSubmit={salvarAtualizacao}><div className="pev-formulario__topo"><div><small>NOTÍCIA OU ATUALIZAÇÃO</small><h3>{atualizacao.id === undefined ? "Adicionar atualização" : "Editar atualização"}</h3></div><button type="button" className="pev-botao pev-botao--texto" onClick={() => setAtualizacao(null)}>Fechar</button></div><div className="pev-grade-campos pev-grade-campos--tres"><Campo rotulo="Título"><input value={atualizacao.titulo} onChange={(e) => setAtualizacao({ ...atualizacao, titulo: e.target.value })} required /></Campo><Campo rotulo="Data"><input type="date" value={atualizacao.data} onChange={(e) => setAtualizacao({ ...atualizacao, data: e.target.value })} /></Campo><Campo rotulo="Ordem"><input type="number" min={0} value={atualizacao.ordem} onChange={(e) => setAtualizacao({ ...atualizacao, ordem: Number(e.target.value) })} /></Campo><Campo rotulo="Texto da atualização" largo><textarea rows={6} value={atualizacao.texto} onChange={(e) => setAtualizacao({ ...atualizacao, texto: e.target.value })} /></Campo><Campo rotulo="Visibilidade"><select value={atualizacao.publicacao} onChange={(e) => setAtualizacao({ ...atualizacao, publicacao: e.target.value as FormularioAtualizacao["publicacao"] })}>{atualizacao.id !== undefined && <option value="manter">Manter visibilidade atual</option>}<option value="ocultar">Rascunho / oculta</option><option value="publicar">Publicar no portal</option></select></Campo></div>{atualizacao.id !== undefined && atualizacao.publicacao === "manter" && <p className="pev-aviso pev-aviso--atencao">A API administrativa ainda não informa a visibilidade atual desta atualização. “Manter” evita alterar esse estado por engano.</p>}<div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={() => setAtualizacao(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar atualização"}</button></div></form>;

  return <div className="pev-grade-campos"><section className="pev-subpainel"><div className="pev-subpainel__topo"><div><h2>Documentos</h2><p>Publique regulamentos, tabelas, comunicados e anexos autorizados.</p></div><button type="button" className="pev-botao pev-botao--primario" onClick={() => setDocumento({ ...documentoVazio, ordem: detalhes.documentos.length })}>+ Adicionar documento</button></div>{!detalhes.documentos.length && <EstadoVazio titulo="Nenhum documento" texto="Adicione somente arquivos e links reais deste campeonato." />}<div className="pev-grade-subitens">{detalhes.documentos.map((item, indice) => <article key={item.id ?? indice}><span className={classeStatus(item.publicado ? "publicado" : "rascunho")}>{item.publicado ? "Público" : "Privado"}</span><h3>{item.titulo}</h3><p>{item.tipo.replaceAll("_", " ")}</p><div>{(item.arquivoUrl || item.linkExterno) && <a className="pev-botao" href={item.arquivoUrl || item.linkExterno} target="_blank" rel="noreferrer">Abrir</a>}<button type="button" className="pev-botao" onClick={() => setDocumento({ ...item })}>Editar</button><button type="button" className="pev-botao pev-botao--perigoso" onClick={() => void arquivarDocumento(item)} disabled={salvando}>Arquivar</button></div></article>)}</div></section><section className="pev-subpainel"><div className="pev-subpainel__topo"><div><h2>Notícias e atualizações</h2><p>Registre mudanças de fase, comunicados e informações públicas do campeonato.</p></div><button type="button" className="pev-botao pev-botao--primario" onClick={() => setAtualizacao({ ...atualizacaoVazia, ordem: detalhes.atualizacoes.length })}>+ Adicionar atualização</button></div>{!detalhes.atualizacoes.length && <EstadoVazio titulo="Nenhuma atualização" texto="Use esta área quando houver uma informação real para registrar." />}<div className="pev-grade-subitens">{detalhes.atualizacoes.map((item, indice) => <article key={item.id ?? indice}><span className={classeStatus(item.publicado === true ? "publicado" : "rascunho")}>{item.publicado === true ? "Pública" : item.publicado === false ? "Rascunho" : "Visibilidade não informada"}</span><h3>{item.titulo}</h3><p>{item.data ? dataLegivel(item.data) : "Sem data informada"}</p><div><button type="button" className="pev-botao" onClick={() => editarAtualizacao(item)}>Editar</button><button type="button" className="pev-botao pev-botao--perigoso" onClick={() => void arquivarAtualizacao(item)} disabled={salvando}>Arquivar</button></div></article>)}</div></section></div>;
}
function EtapaParticipantes({ participantes, novoParticipante, setNovoParticipante, adicionar, renomear, remover, salvando }: { participantes: Participante[]; novoParticipante: Participante; setNovoParticipante: (valor: Participante) => void; adicionar: (evento: FormEvent<HTMLFormElement>) => void; renomear: (item: Participante, indice: number) => void; remover: (item: Participante, indice: number) => void; salvando: boolean }) { return <><p className="pev-introducao">Use nomes de exibição claros. A posição inicial define a ordem usada ao gerar o mata-mata.</p><form className="pev-adicionar-inline" onSubmit={adicionar}><label><span>Equipe ou turma</span><input value={novoParticipante.nome} onChange={(e) => setNovoParticipante({ ...novoParticipante, nome: e.target.value })} placeholder="Nome cadastrado" required /></label><label><span>Nome exibido na chave</span><input value={novoParticipante.nomeExibicao} onChange={(e) => setNovoParticipante({ ...novoParticipante, nomeExibicao: e.target.value })} placeholder="Deixe vazio para repetir o nome" /></label><label><span>Apelido opcional</span><input value={novoParticipante.apelido} onChange={(e) => setNovoParticipante({ ...novoParticipante, apelido: e.target.value })} /></label><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>Adicionar participante</button></form>{!participantes.length && <EstadoVazio titulo="Nenhum participante" texto="Adicione as turmas ou equipes que disputarão esta edição." />}<ol className="pev-participantes">{participantes.map((item, indice) => <li key={item.id ?? `${item.nome}-${indice}`}><span>{indice + 1}</span><div><strong>{item.nomeExibicao || item.nome}</strong>{item.apelido && <small>{item.apelido}</small>}</div><div><button type="button" className="pev-botao" onClick={() => void renomear(item, indice)}>Renomear na chave</button><button type="button" className="pev-botao pev-botao--perigoso" onClick={() => void remover(item, indice)}>Remover</button></div></li>)}</ol></>; }
function EtapaFormato({ formulario, mudar, participantes, gerar, podeGerar, salvando }: { formulario: FormularioCampeonato; mudar: <K extends keyof FormularioCampeonato>(chave: K, valor: FormularioCampeonato[K]) => void; participantes: Participante[]; gerar: () => void; podeGerar: boolean; salvando: boolean }) { const mataMata = formulario.formato === "mata_mata"; return <><div className="pev-formatos">{formatos.map(([valor, nome]) => <label className={formulario.formato === valor ? "ativo" : ""} key={valor}><input type="radio" name="formato" value={valor} checked={formulario.formato === valor} onChange={() => mudar("formato", valor)} /><strong>{nome}</strong><span>{valor === "mata_mata" ? "O vencedor avança automaticamente até a final." : "Você cria fases, confrontos e avanços manualmente."}</span></label>)}</div><div className="pev-gerar-chave"><div><strong>{participantes.filter((item) => item.ativo).length} participantes ativos</strong><p>{mataMata ? (podeGerar ? "A geração usa a ordem mostrada na etapa anterior. Você poderá revisar tudo antes de publicar." : "Salve o rascunho primeiro; depois o painel poderá gerar e persistir a chave.") : "Na chave personalizada, siga para Fases e jogos para montar os confrontos e o caminho dos vencedores."}</p></div>{mataMata && <button type="button" className="pev-botao pev-botao--primario" disabled={!podeGerar || salvando || participantes.filter((item) => item.ativo).length < 2} onClick={() => void gerar()}>{salvando ? "Gerando…" : "Gerar chave inicial"}</button>}</div></>; }

function EtapaChave({ detalhes, participantes, fase, setFase, salvarFase, partida, setPartida, salvarPartida, abrirResultado, salvando }: { detalhes: DetalhesCampeonato | null; participantes: Participante[]; fase: FormularioFase | null; setFase: (valor: FormularioFase | null) => void; salvarFase: (e: FormEvent<HTMLFormElement>) => void; partida: FormularioPartida | null; setPartida: (valor: FormularioPartida | null) => void; salvarPartida: (e: FormEvent<HTMLFormElement>) => void; abrirResultado: (jogo: Partida) => void; salvando: boolean }) {
  const fases = detalhes?.fases ?? [];
  const jogos = detalhes?.partidas ?? [];
  const chavePublicada = Boolean(detalhes?.item.chavePublicada);
  const participantesAtivos = participantes.filter((item) => item.ativo);

  return <>
    <div className="pev-barra-resultados">
      <div><strong>Prévia administrativa da chave</strong><p>O público só verá fases e jogos marcados como publicados quando a chave também estiver publicada.</p></div>
      <div>
        <button type="button" className="pev-botao" onClick={() => setFase({ ...faseVazia, ordem: fases.length + 1, publicado: chavePublicada })}>+ Adicionar fase</button>
        <button type="button" className="pev-botao pev-botao--primario" disabled={!fases.length} onClick={() => setPartida({ faseId: fases[0]?.id ?? "", rodada: "", ordem: jogos.length + 1, participanteAId: null, participanteBId: null, data: "", horario: "", local: "", observacoesPublicas: "", observacoesInternas: "", proximaPartidaId: null, proximaPosicao: "", publicado: chavePublicada })}>+ Adicionar jogo</button>
      </div>
    </div>

    {fase && <form className="pev-formulario-inline" onSubmit={salvarFase}>
      <h3>Nova fase</h3>
      <div className="pev-grade-campos pev-grade-campos--quatro">
        <Campo rotulo="Nome"><input value={fase.nome} onChange={(e) => setFase({ ...fase, nome: e.target.value })} required /></Campo>
        <Campo rotulo="Tipo"><select value={fase.tipo} onChange={(e) => setFase({ ...fase, tipo: e.target.value })}><option value="eliminatoria">Eliminatória</option><option value="grupos">Grupos</option><option value="classificacao">Classificação</option><option value="terceiro_lugar">Terceiro lugar</option><option value="personalizada">Personalizada</option></select></Campo>
        <Campo rotulo="Ordem"><input type="number" min={1} value={fase.ordem} onChange={(e) => setFase({ ...fase, ordem: Number(e.target.value) })} /></Campo>
        <Campo rotulo="Jogos previstos"><input type="number" min={1} value={fase.quantidadeJogos} onChange={(e) => setFase({ ...fase, quantidadeJogos: Number(e.target.value) })} /></Campo>
      </div>
      <div className="pev-publicacao"><label><input type="checkbox" checked={fase.publicado} onChange={(e) => setFase({ ...fase, publicado: e.target.checked })} /><span>Publicar fase na chave pública</span></label><p>Quando a chave do campeonato já está publicada, novas fases podem nascer públicas ou continuar em revisão.</p></div>
      <div><button type="button" className="pev-botao" onClick={() => setFase(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>Salvar fase</button></div>
    </form>}

    {partida && <form className="pev-formulario-inline" onSubmit={salvarPartida}>
      <h3>Novo jogo</h3>
      <div className="pev-grade-campos pev-grade-campos--quatro">
        <Campo rotulo="Fase"><select value={String(partida.faseId)} onChange={(e) => setPartida({ ...partida, faseId: e.target.value })}>{fases.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Campo>
        <Campo rotulo="Participante A"><select value={partida.participanteAId === null ? "" : String(partida.participanteAId)} onChange={(e) => setPartida({ ...partida, participanteAId: e.target.value || null })}><option value="">A definir</option>{participantesAtivos.map((item) => <option key={item.id ?? item.nome} value={item.id}>{item.nomeExibicao || item.nome}</option>)}</select></Campo>
        <Campo rotulo="Participante B"><select value={partida.participanteBId === null ? "" : String(partida.participanteBId)} onChange={(e) => setPartida({ ...partida, participanteBId: e.target.value || null })}><option value="">A definir</option>{participantesAtivos.map((item) => <option key={item.id ?? item.nome} value={item.id}>{item.nomeExibicao || item.nome}</option>)}</select></Campo>
        <Campo rotulo="Rodada"><input value={partida.rodada} onChange={(e) => setPartida({ ...partida, rodada: e.target.value })} /></Campo>
        <Campo rotulo="Data"><input type="date" value={partida.data} onChange={(e) => setPartida({ ...partida, data: e.target.value })} /></Campo>
        <Campo rotulo="Horário"><input type="time" value={partida.horario} onChange={(e) => setPartida({ ...partida, horario: e.target.value })} /></Campo>
        <Campo rotulo="Local"><input value={partida.local} onChange={(e) => setPartida({ ...partida, local: e.target.value })} /></Campo>
        <Campo rotulo="Próxima partida"><select value={partida.proximaPartidaId === null ? "" : String(partida.proximaPartidaId)} onChange={(e) => setPartida({ ...partida, proximaPartidaId: e.target.value || null, proximaPosicao: e.target.value ? partida.proximaPosicao : "" })}><option value="">Sem avanço configurado</option>{jogos.map((jogo) => <option key={jogo.id} value={jogo.id}>{jogo.rodada || `Jogo ${jogo.ordem}`} — {jogo.participanteANome || "A definir"} × {jogo.participanteBNome || "A definir"}</option>)}</select></Campo>
        <Campo rotulo="Posição na próxima partida"><select value={partida.proximaPosicao} disabled={!partida.proximaPartidaId} onChange={(e) => setPartida({ ...partida, proximaPosicao: e.target.value as "" | "a" | "b" })}><option value="">Sem posição</option><option value="a">Posição A</option><option value="b">Posição B</option></select></Campo>
      </div>
      <div className="pev-publicacao"><label><input type="checkbox" checked={partida.publicado} onChange={(e) => setPartida({ ...partida, publicado: e.target.checked })} /><span>Publicar jogo na chave pública</span></label><p>Use rascunho para jogos que ainda precisam de revisão, mesmo em campeonatos já publicados.</p></div>
      <div><button type="button" className="pev-botao" onClick={() => setPartida(null)}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>Salvar jogo</button></div>
    </form>}

    <PreviaChave fases={fases} partidas={jogos} abrirResultado={abrirResultado} />
    {!fases.length && <EstadoVazio titulo="Chave ainda não gerada" texto="Volte à etapa de formato para gerar o mata-mata ou adicione uma fase manualmente." />}
  </>;
}

function PreviaChave({ fases, partidas, abrirResultado }: { fases: Fase[]; partidas: Partida[]; abrirResultado: (jogo: Partida) => void }) { return <div className="pev-chave" tabIndex={0} aria-label="Prévia rolável da chave do campeonato">{[...fases].sort((a, b) => a.ordem - b.ordem).map((fase) => <section key={fase.id}><h3>{fase.nome}</h3><div>{partidas.filter((jogo) => String(jogo.faseId) === String(fase.id)).sort((a, b) => a.ordem - b.ordem).map((jogo) => <article key={jogo.id}><small>{jogo.rodada || `Jogo ${jogo.ordem}`} · {statusLegivel(jogo.situacao)}</small><p className={String(jogo.vencedorId) === String(jogo.participanteAId) ? "vencedor" : ""}><span>{jogo.participanteANome || "A definir"}</span><strong>{jogo.placarA ?? "—"}</strong></p><p className={String(jogo.vencedorId) === String(jogo.participanteBId) ? "vencedor" : ""}><span>{jogo.participanteBNome || "A definir"}</span><strong>{jogo.placarB ?? "—"}</strong></p>{jogo.vencedorNome && <em>Avança: {jogo.vencedorNome}</em>}<button type="button" className="pev-botao" onClick={() => abrirResultado(jogo)}>{jogo.vencedorId ? "Corrigir resultado" : "Registrar resultado"}</button></article>)}</div></section>)}</div>; }
function EtapaRevisao({ formulario, participantes, detalhes }: { formulario: FormularioCampeonato; participantes: Participante[]; detalhes: DetalhesCampeonato | null }) { const alertas = [!formulario.nome && "Nome não informado", !formulario.modalidade && "Modalidade não informada", participantes.length < 2 && "Menos de dois participantes", !(detalhes?.fases.length) && "Chave ainda não gerada", !formulario.dataInicial && "Data inicial não informada"].filter(Boolean) as string[]; return <><div className="pev-revisao"><article><span>Campeonato</span><strong>{formulario.nome || "Não informado"}</strong><p>{[formulario.edicao || formulario.ano, formulario.modalidade, formulario.categoria].filter(Boolean).join(" · ") || "Complete as informações básicas."}</p></article><article><span>Participantes</span><strong>{participantes.length}</strong><p>{participantes.map((item) => item.nomeExibicao || item.nome).join(", ") || "Nenhum participante"}</p></article><article><span>Estrutura</span><strong>{detalhes?.fases.length ?? 0} fase(s) · {detalhes?.partidas.length ?? 0} jogo(s)</strong><p>{formatos.find(([valor]) => valor === formulario.formato)?.[1]}</p></article></div>{alertas.length ? <div className="pev-aviso pev-aviso--atencao"><strong>Revise antes de publicar:</strong><ul>{alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}</ul></div> : <p className="pev-aviso pev-aviso--sucesso">Informações essenciais preenchidas. Confira a prévia da chave e siga para a publicação.</p>}<PreviaChave fases={detalhes?.fases ?? []} partidas={detalhes?.partidas ?? []} abrirResultado={() => undefined} /></>; }
function EtapaPublicacao({ formulario, mudar, participantes, detalhes, salvar, campeaoSelecionado, setCampeaoSelecionado, definirCampeao, salvando }: { formulario: FormularioCampeonato; mudar: <K extends keyof FormularioCampeonato>(chave: K, valor: FormularioCampeonato[K]) => void; participantes: Participante[]; detalhes: DetalhesCampeonato | null; salvar: () => void; campeaoSelecionado: string; setCampeaoSelecionado: (valor: string) => void; definirCampeao: () => void; salvando: boolean }) { const pronto = Boolean(formulario.nome && formulario.modalidade && participantes.length >= 2); return <div className="pev-publicar-campeonato"><h3>Controle de visibilidade</h3><label><input type="checkbox" checked={formulario.chavePublicada} onChange={(e) => mudar("chavePublicada", e.target.checked)} /><span><strong>Publicar a chave e os jogos</strong><small>A página poderá mostrar fases, confrontos e placares marcados como públicos.</small></span></label><label><input type="checkbox" checked={formulario.publicado} onChange={(e) => mudar("publicado", e.target.checked)} /><span><strong>Publicar o campeonato no portal</strong><small>Desmarque para manter todo o campeonato como rascunho.</small></span></label><div className="pev-resumo-publicacao"><strong>{detalhes?.partidas.length ?? 0} jogos · {participantes.length} participantes</strong><p>{pronto ? "Ao publicar, revise cada jogo que ainda está com data ou participante a definir." : "Complete nome, modalidade e ao menos dois participantes."}</p></div><button type="button" className="pev-botao pev-botao--primario" onClick={salvar} disabled={!pronto || salvando}>{salvando ? "Publicando…" : "Salvar e publicar campeonato"}</button><div className="pev-encerrar-campeonato"><h3>Encerrar campeonato</h3><p>Use somente depois de conferir todos os resultados. Esta ação registra o campeão e muda a situação para encerrado.</p><label><span>Campeão</span><select value={campeaoSelecionado} onChange={(e) => setCampeaoSelecionado(e.target.value)}><option value="">Escolha o participante</option>{participantes.filter((item) => item.ativo && item.id !== undefined).map((item) => <option key={item.id} value={String(item.id)}>{item.nomeExibicao || item.nome}</option>)}</select></label><button type="button" className="pev-botao pev-botao--perigoso" onClick={definirCampeao} disabled={!campeaoSelecionado || salvando}>Registrar campeão e encerrar</button></div></div>; }

function FormularioResultado({ jogo, fases, partidas, participantes, resultado, setResultado, salvar, fechar, salvando }: {
  jogo: Partida;
  fases: Fase[];
  partidas: Partida[];
  participantes: Participante[];
  resultado: ResultadoPartida;
  setResultado: (valor: ResultadoPartida) => void;
  salvar: (e: FormEvent<HTMLFormElement>) => void;
  fechar: () => void;
  salvando: boolean;
}) {
  const corrigindo = jogo.vencedorId !== null || jogo.placarA !== null || jogo.placarB !== null;
  const final = resultado.situacao === "encerrada" || resultado.situacao === "wo";
  const participantesAtivos = participantes.filter((item) => item.ativo && item.id !== undefined);
  const nomeParticipante = (id: string) => participantesAtivos.find((item) => String(item.id) === id)?.nomeExibicao || participantesAtivos.find((item) => String(item.id) === id)?.nome || "Participante";
  const proximasPartidas = partidas.filter((item) => String(item.id) !== String(jogo.id));

  return <form className="pev-resultado" onSubmit={salvar}>
    <div className="pev-formulario__topo"><div><small>{corrigindo ? "CORREÇÃO COM HISTÓRICO" : "EDIÇÃO DO JOGO E RESULTADO"}</small><h3>{jogo.participanteANome || "A definir"} × {jogo.participanteBNome || "A definir"}</h3></div><button type="button" className="pev-botao pev-botao--texto" onClick={fechar}>Fechar</button></div>
    {corrigindo && <p className="pev-aviso pev-aviso--atencao">Qualquer alteração deste jogo será registrada no histórico e exige um motivo. Mudar vencedor, participantes ou avanço pode afetar partidas posteriores e exigir nova confirmação.</p>}
    {corrigindo && !final && <p className="pev-aviso pev-aviso--atencao">Ao retirar o estado final, o placar, o vencedor e a forma de vitória serão limpos com registro histórico.</p>}
    <div className="pev-grade-campos pev-grade-campos--tres">
      <Campo rotulo="Fase"><select value={resultado.faseId} onChange={(e) => setResultado({ ...resultado, faseId: e.target.value })} required><option value="">Escolha a fase</option>{[...fases].sort((a, b) => a.ordem - b.ordem).map((fase) => <option value={String(fase.id)} key={fase.id}>{fase.nome}</option>)}</select></Campo>
      <Campo rotulo="Rodada"><input value={resultado.rodada} onChange={(e) => setResultado({ ...resultado, rodada: e.target.value })} /></Campo>
      <Campo rotulo="Ordem na fase"><input type="number" min={0} value={resultado.ordem} onChange={(e) => setResultado({ ...resultado, ordem: Number(e.target.value) })} /></Campo>
      <Campo rotulo="Participante A"><select value={resultado.participanteAId} onChange={(e) => setResultado({ ...resultado, participanteAId: e.target.value, vencedorId: resultado.vencedorId && resultado.vencedorId !== e.target.value && resultado.vencedorId !== resultado.participanteBId ? "" : resultado.vencedorId })}><option value="">A definir</option>{participantesAtivos.map((item) => <option key={item.id} value={String(item.id)}>{item.nomeExibicao || item.nome}</option>)}</select></Campo>
      <Campo rotulo="Participante B"><select value={resultado.participanteBId} onChange={(e) => setResultado({ ...resultado, participanteBId: e.target.value, vencedorId: resultado.vencedorId && resultado.vencedorId !== e.target.value && resultado.vencedorId !== resultado.participanteAId ? "" : resultado.vencedorId })}><option value="">A definir</option>{participantesAtivos.map((item) => <option key={item.id} value={String(item.id)}>{item.nomeExibicao || item.nome}</option>)}</select></Campo>
      <Campo rotulo="Situação"><select value={resultado.situacao} onChange={(e) => setResultado({ ...resultado, situacao: e.target.value, ...(e.target.value === "wo" ? { placarA: "", placarB: "", formaVitoria: "W.O." } : {}) })}><option value="agendada">Agendada</option><option value="em_andamento">Em andamento</option><option value="encerrada">Encerrada</option><option value="adiada">Adiada</option><option value="cancelada">Cancelada</option><option value="wo">Vitória por W.O.</option><option value="data_a_definir">Data a definir</option></select></Campo>
      <Campo rotulo="Data"><input type="date" value={resultado.data} onChange={(e) => setResultado({ ...resultado, data: e.target.value })} /></Campo>
      <Campo rotulo="Horário"><input type="time" value={resultado.horario} onChange={(e) => setResultado({ ...resultado, horario: e.target.value })} /></Campo>
      <Campo rotulo="Local"><input value={resultado.local} onChange={(e) => setResultado({ ...resultado, local: e.target.value })} /></Campo>
      <Campo rotulo="Próxima partida do vencedor"><select value={resultado.proximaPartidaId} onChange={(e) => setResultado({ ...resultado, proximaPartidaId: e.target.value, proximaPosicao: e.target.value ? resultado.proximaPosicao : "" })}><option value="">Sem avanço configurado</option>{proximasPartidas.map((item) => <option value={String(item.id)} key={item.id}>{fases.find((fase) => String(fase.id) === String(item.faseId))?.nome || "Fase"} — {item.rodada || `Jogo ${item.ordem}`}</option>)}</select></Campo>
      <Campo rotulo="Posição na próxima partida"><select value={resultado.proximaPosicao} disabled={!resultado.proximaPartidaId} onChange={(e) => setResultado({ ...resultado, proximaPosicao: e.target.value as ResultadoPartida["proximaPosicao"] })}><option value="">Escolha a posição</option><option value="a">Participante A</option><option value="b">Participante B</option></select></Campo>
      {final && <><Campo rotulo={`Placar — ${nomeParticipante(resultado.participanteAId)}`}><input type="number" min={0} value={resultado.placarA} disabled={resultado.situacao === "wo"} onChange={(e) => setResultado({ ...resultado, placarA: e.target.value })} /></Campo><Campo rotulo={`Placar — ${nomeParticipante(resultado.participanteBId)}`}><input type="number" min={0} value={resultado.placarB} disabled={resultado.situacao === "wo"} onChange={(e) => setResultado({ ...resultado, placarB: e.target.value })} /></Campo><Campo rotulo="Vencedor"><select value={resultado.vencedorId} onChange={(e) => setResultado({ ...resultado, vencedorId: e.target.value })}><option value="">Ainda não definido</option>{resultado.participanteAId && <option value={resultado.participanteAId}>{nomeParticipante(resultado.participanteAId)}</option>}{resultado.participanteBId && <option value={resultado.participanteBId}>{nomeParticipante(resultado.participanteBId)}</option>}</select></Campo><Campo rotulo="Forma da vitória"><input value={resultado.formaVitoria} onChange={(e) => setResultado({ ...resultado, formaVitoria: e.target.value })} placeholder="Placar, W.O., decisão…" /></Campo></>}
      <Campo rotulo="Publicação do placar"><select value={resultado.placarPublicado ? "sim" : "nao"} onChange={(e) => setResultado({ ...resultado, placarPublicado: e.target.value === "sim" })}><option value="nao">Ocultar placar</option><option value="sim">Mostrar placar</option></select></Campo>
      <Campo rotulo="Visibilidade do jogo"><select value={resultado.publicado ? "sim" : "nao"} onChange={(e) => setResultado({ ...resultado, publicado: e.target.value === "sim" })}><option value="nao">Jogo em rascunho</option><option value="sim">Jogo publicado</option></select></Campo>
      <Campo rotulo="Resumo da partida" largo><textarea rows={4} value={resultado.resumo} onChange={(e) => setResultado({ ...resultado, resumo: e.target.value })} /></Campo>
      <Campo rotulo="Destaques" largo><textarea rows={3} value={resultado.destaques} onChange={(e) => setResultado({ ...resultado, destaques: e.target.value })} /></Campo>
      <Campo rotulo="Observações públicas"><textarea rows={3} value={resultado.observacoesPublicas} onChange={(e) => setResultado({ ...resultado, observacoesPublicas: e.target.value })} /></Campo>
      <Campo rotulo="Observações internas"><textarea rows={3} value={resultado.observacoesInternas} onChange={(e) => setResultado({ ...resultado, observacoesInternas: e.target.value })} /></Campo>
      {corrigindo && <Campo rotulo="Motivo da correção" dica="Obrigatório para qualquer mudança após existir resultado." largo><textarea rows={3} value={resultado.motivo} onChange={(e) => setResultado({ ...resultado, motivo: e.target.value })} required /></Campo>}
    </div>
    <div className="pev-acoes-formulario"><button type="button" className="pev-botao" onClick={fechar}>Cancelar</button><button type="submit" className="pev-botao pev-botao--primario" disabled={salvando}>{salvando ? "Verificando impacto…" : corrigindo ? "Verificar e salvar correção" : final ? "Registrar resultado" : "Salvar jogo"}</button></div>
  </form>;
}

function normalizarCampeonato(item: Record<string, unknown>): Campeonato { const campeao = item.campeao && typeof item.campeao === "object" ? item.campeao as Record<string, unknown> : {}; return { id: (item.id as Identificador) ?? crypto.randomUUID(), slug: obterTexto(item, "slug"), nome: obterTexto(item, "nome", "titulo"), edicao: obterTexto(item, "edicao"), ano: item.ano === null || item.ano === undefined ? null : obterNumero(item, "ano"), modalidade: obterTexto(item, "modalidade"), categoria: obterTexto(item, "categoria"), turno: obterTexto(item, "turno"), descricao: obterTexto(item, "descricao"), regulamento: obterTexto(item, "regulamento"), organizacao: obterTexto(item, "organizacao"), locais: obterTexto(item, "locais", "local"), observacoesPublicas: obterTexto(item, "observacoesPublicas"), observacoesInternas: obterTexto(item, "observacoesInternas"), formato: obterTexto(item, "formato") || "mata_mata", situacao: obterTexto(item, "situacao") || "proximo", faseAtual: obterTexto(item, "faseAtual"), dataInicial: obterTexto(item, "dataInicial"), dataFinal: obterTexto(item, "dataFinal"), imagemCapaUrl: obterTexto(item, "imagemCapaUrl"), chavePublicada: obterBooleano(item, "chavePublicada"), publicado: obterBooleano(item, "publicado"), ativo: obterBooleano(item, "ativo", true), campeaoNome: obterTexto(campeao, "nome") || obterTexto(item, "campeaoNome"), atualizadoEm: obterTexto(item, "atualizadoEm") || undefined }; }
function normalizarDetalhes(resposta: Record<string, unknown>): DetalhesCampeonato { const item = resposta.item && typeof resposta.item === "object" ? resposta.item as Record<string, unknown> : resposta; return { item: normalizarCampeonato(item), participantes: (Array.isArray(resposta.participantes) ? resposta.participantes as Record<string, unknown>[] : []).map((p) => ({ id: p.id as Identificador, nome: obterTexto(p, "nome"), nomeExibicao: obterTexto(p, "nomeExibicao"), apelido: obterTexto(p, "apelido"), posicaoInicial: obterNumero(p, "posicaoInicial"), ativo: obterBooleano(p, "ativo", true) })), fases: (Array.isArray(resposta.fases) ? resposta.fases as Record<string, unknown>[] : []).map((f) => ({ id: f.id as Identificador, nome: obterTexto(f, "nome"), ordem: obterNumero(f, "ordem"), tipo: obterTexto(f, "tipo"), quantidadeJogos: obterNumero(f, "quantidadeJogos"), publicado: obterBooleano(f, "publicado"), ativo: obterBooleano(f, "ativo", true) })), partidas: (Array.isArray(resposta.partidas) ? resposta.partidas as Record<string, unknown>[] : []).map(normalizarPartida), documentos: (Array.isArray(resposta.documentos) ? resposta.documentos as Record<string, unknown>[] : []).map(normalizarDocumentoCampeonato), atualizacoes: (Array.isArray(resposta.atualizacoes) ? resposta.atualizacoes as Record<string, unknown>[] : []).map(normalizarAtualizacaoCampeonato) }; }
function normalizarPartida(p: Record<string, unknown>): Partida { const numeroOuNulo = (chave: string) => p[chave] === null || p[chave] === undefined ? null : Number(p[chave]); return { id: p.id as Identificador, faseId: p.faseId as Identificador, rodada: obterTexto(p, "rodada"), ordem: obterNumero(p, "ordem"), participanteAId: p.participanteAId as Identificador | null, participanteBId: p.participanteBId as Identificador | null, participanteANome: obterTexto(p, "participanteANome"), participanteBNome: obterTexto(p, "participanteBNome"), placarA: numeroOuNulo("placarA"), placarB: numeroOuNulo("placarB"), vencedorId: p.vencedorId as Identificador | null, vencedorNome: obterTexto(p, "vencedorNome"), formaVitoria: obterTexto(p, "formaVitoria"), data: obterTexto(p, "data"), horario: obterTexto(p, "horario"), local: obterTexto(p, "local"), situacao: obterTexto(p, "situacao") || "agendada", placarPublicado: obterBooleano(p, "placarPublicado"), resumo: obterTexto(p, "resumo"), destaques: obterTexto(p, "destaques"), observacoesPublicas: obterTexto(p, "observacoesPublicas"), observacoesInternas: obterTexto(p, "observacoesInternas"), proximaPartidaId: p.proximaPartidaId as Identificador | null, proximaPosicao: (obterTexto(p, "proximaPosicao") as "" | "a" | "b") || "", publicado: obterBooleano(p, "publicado") }; }
function normalizarDocumentoCampeonato(item: Record<string, unknown>): DocumentoCampeonato { return { id: item.id as Identificador | undefined, titulo: obterTexto(item, "titulo"), tipo: obterTexto(item, "tipo") || "anexo", descricao: obterTexto(item, "descricao"), arquivoUrl: obterTexto(item, "arquivoUrl", "url"), linkExterno: obterTexto(item, "linkExterno", "link"), ordem: obterNumero(item, "ordem"), publicado: obterBooleano(item, "publicado"), ativo: obterBooleano(item, "ativo", true) }; }
function normalizarAtualizacaoCampeonato(item: Record<string, unknown>): AtualizacaoCampeonato { return { id: item.id as Identificador | undefined, titulo: obterTexto(item, "titulo"), texto: obterTexto(item, "texto", "descricao"), data: obterTexto(item, "data"), ordem: obterNumero(item, "ordem"), publicado: Object.hasOwn(item, "publicado") ? obterBooleano(item, "publicado") : undefined, ativo: Object.hasOwn(item, "ativo") ? obterBooleano(item, "ativo", true) : undefined, atualizadoEm: obterTexto(item, "atualizadoEm") || undefined }; }
