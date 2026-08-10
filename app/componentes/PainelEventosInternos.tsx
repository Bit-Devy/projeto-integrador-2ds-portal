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
  obterTexto,
  requisitarPainel,
  requisitarTodasPaginasPainel,
  statusLegivel,
  turnosPainel,
  useAvisoMudancas,
  type AoMudarEstadoSujo,
  type Identificador,
} from "./painel-eventos-comum";

type EventoInterno = {
  id: Identificador;
  titulo: string;
  subtitulo: string;
  slug: string;
  descricaoCurta: string;
  descricao: string;
  categoria: string;
  imagemCapaUrl: string;
  dataInicial: string;
  dataFinal: string;
  horarioInicial: string;
  horarioFinal: string;
  local: string;
  turno: string;
  publicoDestinado: string;
  organizacao: string;
  programacao: string;
  orientacoes: string;
  linkExterno: string;
  documentos: string[];
  imagens: string[];
  observacoesPublicas: string;
  observacoesInternas: string;
  situacao: string;
  publicado: boolean;
  arquivado: boolean;
  atualizadoEm?: string;
};

type FormularioEvento = Omit<EventoInterno, "id" | "atualizadoEm">;

const formularioVazio: FormularioEvento = {
  titulo: "", subtitulo: "", slug: "", descricaoCurta: "", descricao: "", categoria: "",
  imagemCapaUrl: "", dataInicial: "", dataFinal: "", horarioInicial: "", horarioFinal: "", local: "", turno: "",
  publicoDestinado: "", organizacao: "", programacao: "", orientacoes: "", linkExterno: "",
  documentos: [], imagens: [], observacoesPublicas: "", observacoesInternas: "", situacao: "proximo", publicado: false, arquivado: false,
};

const situacoesEvento = [
  ["proximo", "Próximo / agendado"], ["em_andamento", "Acontecendo agora"],
  ["encerrado", "Encerrado"], ["adiado", "Adiado"], ["cancelado", "Cancelado"],
] as const;

export default function PainelEventosInternos({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  const [itens, setItens] = useState<EventoInterno[]>([]);
  const [formulario, setFormulario] = useState<FormularioEvento | null>(null);
  const [idEditando, setIdEditando] = useState<Identificador | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [mudou, setMudou] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [filtroPublicacao, setFiltroPublicacao] = useState("");
  const [filtroAno, setFiltroAno] = useState("");

  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const itens = await requisitarTodasPaginasPainel<Record<string, unknown>>("/api/eventos?todos=1", ["eventos", "eventosInternos"]);
      setItens(itens.map(normalizarEvento));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao carregar os eventos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { const temporizador = window.setTimeout(() => void carregar(), 0); return () => window.clearTimeout(temporizador); }, [carregar]);

  const anos = useMemo(() => Array.from(new Set(itens.map((item) => item.dataInicial.slice(0, 4)).filter(Boolean))).sort().reverse(), [itens]);
  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return itens.filter((item) => {
      const texto = normalizarBusca([item.titulo, item.subtitulo, item.categoria, item.local, item.publicoDestinado].join(" "));
      const publicacao = item.arquivado ? "arquivado" : item.publicado ? "publicado" : "rascunho";
      return (!termo || texto.includes(termo))
        && (!filtroSituacao || item.situacao === filtroSituacao)
        && (!filtroPublicacao || publicacao === filtroPublicacao)
        && (!filtroAno || item.dataInicial.startsWith(filtroAno));
    });
  }, [busca, filtroAno, filtroPublicacao, filtroSituacao, itens]);

  function mudar<K extends keyof FormularioEvento>(chave: K, valor: FormularioEvento[K]) {
    setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual);
    setMudou(true);
    setSucesso("");
  }

  function novo() {
    if (!confirmarSaida(mudou)) return;
    setFormulario({ ...formularioVazio, documentos: [], imagens: [] });
    setIdEditando(null);
    setMudou(false);
    setErro("");
    setSucesso("");
  }

  function editar(item: EventoInterno) {
    if (!confirmarSaida(mudou)) return;
    const { id: _id, atualizadoEm: _atualizadoEm, ...dados } = item;
    void _id;
    void _atualizadoEm;
    setFormulario({ ...dados, documentos: [...item.documentos], imagens: [...item.imagens] });
    setIdEditando(item.id);
    setMudou(false);
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicar(item: EventoInterno) {
    if (!confirmarSaida(mudou)) return;
    const { id: _id, atualizadoEm: _atualizadoEm, ...dados } = item;
    void _id;
    void _atualizadoEm;
    setFormulario({ ...dados, titulo: `${item.titulo} — cópia`, slug: "", publicado: false, arquivado: false });
    setIdEditando(null);
    setMudou(true);
    setErro("");
    setSucesso("Cópia preparada. Revise as datas e salve como rascunho.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fechar() {
    if (!confirmarSaida(mudou)) return;
    setFormulario(null);
    setIdEditando(null);
    setMudou(false);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>, publicarAgora = false) {
    evento.preventDefault();
    if (!formulario) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const dados = {
        ...formulario,
        slug: formulario.slug || criarSlug(formulario.titulo),
        publicado: publicarAgora ? true : formulario.publicado,
      };
      await requisitarPainel("/api/eventos", {
        method: idEditando === null ? "POST" : "PUT",
        ...corpoJson(idEditando === null ? { dados } : { id: idEditando, dados }),
      });
      setFormulario(null);
      setIdEditando(null);
      setMudou(false);
      setSucesso(publicarAgora ? "Evento salvo e publicado com sucesso." : dados.publicado ? "Evento atualizado com sucesso." : "Rascunho salvo com sucesso.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao salvar o evento.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarEstado(item: EventoInterno, alteracoes: Partial<EventoInterno>, mensagem: string) {
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      await requisitarPainel("/api/eventos", { method: "PUT", ...corpoJson({ id: item.id, dados: alteracoes }) });
      setSucesso(mensagem);
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar o evento.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar(item: EventoInterno) {
    if (!window.confirm(`Arquivar “${item.titulo}”? Ele deixará de aparecer nas listas públicas atuais, mas seu histórico será preservado.`)) return;
    await alterarEstado(item, { arquivado: true }, "Evento arquivado. A publicação foi preservada para a consulta histórica.");
  }

  async function enviar(campo: "imagemCapaUrl" | "documentos" | "imagens", arquivo?: File) {
    if (!arquivo || !formulario) return;
    setEnviando(campo);
    setErro("");
    try {
      // O arquivo nasce privado. A API só o torna público junto com a publicação
      // do evento, evitando que um rascunho seja acessível pela URL direta.
      const resultado = await enviarArquivoPainel(arquivo, "privada");
      if (campo === "imagemCapaUrl") mudar(campo, resultado.url);
      else mudar(campo, [...formulario[campo], resultado.url]);
      setSucesso(`Arquivo “${resultado.nome || arquivo.name}” enviado. Salve o evento para confirmar a alteração.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar o arquivo.");
    } finally {
      setEnviando("");
    }
  }

  return (
    <section className="pev-painel" aria-labelledby="titulo-painel-eventos-internos">
      <CabecalhoPainel rotulo="AGENDA DO PORTAL" titulo="Eventos internos" descricao="Cadastre atividades do colégio e do GECEP, acompanhe a publicação e preserve o arquivo histórico." acao={formulario ? undefined : novo} nomeAcao="+ Novo evento" />
      <MensagensPainel erro={erro} sucesso={sucesso} />

      {formulario ? (
        <form className="pev-formulario" onSubmit={salvar}>
          <div className="pev-formulario__topo">
            <div><small>{idEditando === null ? "NOVO REGISTRO" : "EDITANDO EVENTO"}</small><h2 id="titulo-painel-eventos-internos">{idEditando === null ? "Cadastrar evento" : formulario.titulo}</h2></div>
            <button type="button" className="pev-botao pev-botao--texto" onClick={fechar}>Fechar</button>
          </div>

          <fieldset className="pev-bloco"><legend>Apresentação</legend><div className="pev-grade-campos">
            <Campo rotulo="Título"><input value={formulario.titulo} onChange={(e) => mudar("titulo", e.target.value)} required maxLength={180} /></Campo>
            <Campo rotulo="Subtítulo"><input value={formulario.subtitulo} onChange={(e) => mudar("subtitulo", e.target.value)} maxLength={220} /></Campo>
            <Campo rotulo="Endereço amigável" dica="Pode deixar em branco: o painel cria a partir do título."><input value={formulario.slug} onChange={(e) => mudar("slug", criarSlug(e.target.value))} placeholder="mostra-cultural-2026" /></Campo>
            <Campo rotulo="Categoria"><input value={formulario.categoria} onChange={(e) => mudar("categoria", e.target.value)} placeholder="Cultura, esporte, campanha…" /></Campo>
            <Campo rotulo="Descrição curta" largo><textarea rows={3} value={formulario.descricaoCurta} onChange={(e) => mudar("descricaoCurta", e.target.value)} maxLength={500} /></Campo>
            <Campo rotulo="Descrição completa" largo><textarea rows={7} value={formulario.descricao} onChange={(e) => mudar("descricao", e.target.value)} /></Campo>
          </div></fieldset>

          <fieldset className="pev-bloco"><legend>Data, local e público</legend><div className="pev-grade-campos pev-grade-campos--tres">
            <Campo rotulo="Data inicial"><input type="date" value={formulario.dataInicial} onChange={(e) => mudar("dataInicial", e.target.value)} required /></Campo>
            <Campo rotulo="Data final"><input type="date" value={formulario.dataFinal} min={formulario.dataInicial || undefined} onChange={(e) => mudar("dataFinal", e.target.value)} /></Campo>
            <Campo rotulo="Horário inicial"><input type="time" value={formulario.horarioInicial} onChange={(e) => mudar("horarioInicial", e.target.value)} /></Campo>
            <Campo rotulo="Horário final"><input type="time" value={formulario.horarioFinal} onChange={(e) => mudar("horarioFinal", e.target.value)} /></Campo>
            <Campo rotulo="Local"><input value={formulario.local} onChange={(e) => mudar("local", e.target.value)} /></Campo>
            <Campo rotulo="Turno"><select value={formulario.turno} onChange={(e) => mudar("turno", e.target.value)}>{turnosPainel.map(([valor, nome]) => <option key={valor} value={valor}>{valor ? nome : "Não se aplica"}</option>)}</select></Campo>
            <Campo rotulo="Situação"><select value={formulario.situacao} onChange={(e) => mudar("situacao", e.target.value)}>{situacoesEvento.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo>
            <Campo rotulo="Público destinado"><input value={formulario.publicoDestinado} onChange={(e) => mudar("publicoDestinado", e.target.value)} /></Campo>
            <Campo rotulo="Organização responsável"><input value={formulario.organizacao} onChange={(e) => mudar("organizacao", e.target.value)} /></Campo>
            <Campo rotulo="Link externo"><input type="url" value={formulario.linkExterno} onChange={(e) => mudar("linkExterno", e.target.value)} placeholder="https://" /></Campo>
          </div></fieldset>

          <fieldset className="pev-bloco"><legend>Conteúdo e orientações</legend><div className="pev-grade-campos">
            <Campo rotulo="Programação" dica="Uma atividade por linha."><textarea rows={6} value={formulario.programacao} onChange={(e) => mudar("programacao", e.target.value)} /></Campo>
            <Campo rotulo="Orientações"><textarea rows={6} value={formulario.orientacoes} onChange={(e) => mudar("orientacoes", e.target.value)} /></Campo>
            <Campo rotulo="Observações públicas" largo><textarea rows={4} value={formulario.observacoesPublicas} onChange={(e) => mudar("observacoesPublicas", e.target.value)} /></Campo>
            <Campo rotulo="Observações internas" dica="Visível somente para administradores." largo><textarea rows={4} value={formulario.observacoesInternas} onChange={(e) => mudar("observacoesInternas", e.target.value)} /></Campo>
          </div></fieldset>

          <fieldset className="pev-bloco"><legend>Imagens e documentos</legend><div className="pev-grade-campos">
            <Campo rotulo="Imagem de capa" dica="PNG, JPG ou WebP, com até 10 MB.">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void enviar("imagemCapaUrl", e.target.files?.[0])} disabled={Boolean(enviando)} />
              {formulario.imagemCapaUrl && <span className="pev-arquivo-salvo">Capa enviada <button type="button" onClick={() => mudar("imagemCapaUrl", "")}>Remover</button></span>}
            </Campo>
            <Campo rotulo="Galeria de imagens">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void enviar("imagens", e.target.files?.[0])} disabled={Boolean(enviando)} />
              <ListaArquivos itens={formulario.imagens} remover={(indice) => mudar("imagens", formulario.imagens.filter((_, i) => i !== indice))} />
            </Campo>
            <Campo rotulo="Documentos" dica="Envie PDF ou imagem. Você pode adicionar vários arquivos." largo>
              <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => void enviar("documentos", e.target.files?.[0])} disabled={Boolean(enviando)} />
              <ListaArquivos itens={formulario.documentos} remover={(indice) => mudar("documentos", formulario.documentos.filter((_, i) => i !== indice))} />
            </Campo>
          </div></fieldset>

          <div className="pev-publicacao">
            <label><input type="checkbox" checked={formulario.publicado} onChange={(e) => mudar("publicado", e.target.checked)} /><span>Publicado no portal</span></label>
            <p>{formulario.publicado ? "As informações ficam visíveis ao público depois de salvar." : "Somente administradores podem ver este rascunho."}</p>
          </div>
          {mudou && <p className="pev-alteracoes" role="status">Há mudanças não salvas.</p>}
          <div className="pev-acoes-formulario">
            <button type="button" className="pev-botao" onClick={fechar} disabled={salvando}>Cancelar</button>
            <button type="submit" className="pev-botao" disabled={salvando}>{salvando ? "Salvando…" : formulario.publicado ? "Salvar alterações" : "Salvar rascunho"}</button>
            {!formulario.publicado && <button type="button" className="pev-botao pev-botao--primario" disabled={salvando} onClick={(e) => void salvar(e as unknown as FormEvent<HTMLFormElement>, true)}>{salvando ? "Publicando…" : "Salvar e publicar"}</button>}
          </div>
        </form>
      ) : (
        <>
          <div className="pev-filtros">
            <label className="pev-filtro--busca"><span>Buscar evento</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Título, categoria, local ou público" /></label>
            <label><span>Situação</span><select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}><option value="">Todas</option>{situacoesEvento.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
            <label><span>Publicação</span><select value={filtroPublicacao} onChange={(e) => setFiltroPublicacao(e.target.value)}><option value="">Todos</option><option value="publicado">Publicados</option><option value="rascunho">Rascunhos</option><option value="arquivado">Arquivados</option></select></label>
            <label><span>Ano</span><select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}><option value="">Todos</option>{anos.map((ano) => <option key={ano}>{ano}</option>)}</select></label>
          </div>
          {carregando && <EstadoVazio titulo="Carregando eventos…" texto="Aguarde enquanto consultamos os registros." />}
          {!carregando && !filtrados.length && <EstadoVazio titulo={itens.length ? "Nenhum evento encontrado" : "Nenhum evento cadastrado"} texto={itens.length ? "Altere os filtros ou a busca para ver outros registros." : "Use “Novo evento” para criar o primeiro registro, sem inventar informações."} />}
          <div className="pev-lista">
            {filtrados.map((item) => <article className="pev-cartao" key={item.id}>
              <div className="pev-cartao__estados"><span className={classeStatus(item.arquivado ? "arquivado" : item.publicado ? "publicado" : "rascunho")}>{item.arquivado ? "Arquivado" : item.publicado ? "Publicado" : "Rascunho"}</span><span className={classeStatus(item.situacao)}>{statusLegivel(item.situacao)}</span></div>
              <div className="pev-cartao__conteudo"><h2>{item.titulo || "Evento sem título"}</h2><p>{[dataLegivel(item.dataInicial), item.horarioInicial, item.local].filter(Boolean).join(" · ")}</p>{item.descricaoCurta && <small>{item.descricaoCurta}</small>}</div>
              <div className="pev-cartao__acoes">
                <button type="button" className="pev-botao" onClick={() => editar(item)}>Editar</button>
                <button type="button" className="pev-botao" onClick={() => duplicar(item)}>Duplicar</button>
                {!item.arquivado && <button type="button" className="pev-botao" disabled={salvando} onClick={() => void alterarEstado(item, { publicado: !item.publicado }, item.publicado ? "Evento movido para rascunho." : "Evento publicado com sucesso.")}>{item.publicado ? "Tornar rascunho" : "Publicar"}</button>}
                {!item.arquivado && <button type="button" className="pev-botao pev-botao--perigoso" disabled={salvando} onClick={() => void arquivar(item)}>Arquivar</button>}
              </div>
            </article>)}
          </div>
        </>
      )}
    </section>
  );
}

function ListaArquivos({ itens, remover }: { itens: string[]; remover: (indice: number) => void }) {
  if (!itens.length) return null;
  return <ul className="pev-arquivos">{itens.map((url, indice) => <li key={`${url}-${indice}`}><a href={url} target="_blank" rel="noreferrer">Arquivo {indice + 1}</a><button type="button" onClick={() => remover(indice)}>Remover</button></li>)}</ul>;
}

function normalizarEvento(registro: Record<string, unknown>): EventoInterno {
  const lista = (chave: string) => {
    const valor = registro[chave];
    if (Array.isArray(valor)) return valor.map((item) => typeof item === "string" ? item : item && typeof item === "object" ? obterTexto(item as Record<string, unknown>, "arquivoUrl", "url", "linkExterno") : "").filter(Boolean);
    if (typeof valor === "string" && valor.trim()) {
      try { const convertido = JSON.parse(valor) as unknown; if (Array.isArray(convertido)) return convertido.filter((item): item is string => typeof item === "string"); } catch { return valor.split("\n").filter(Boolean); }
    }
    return [];
  };
  return {
    id: (registro.id as Identificador) ?? crypto.randomUUID(),
    titulo: obterTexto(registro, "titulo", "nome"), subtitulo: obterTexto(registro, "subtitulo"),
    slug: obterTexto(registro, "slug"), descricaoCurta: obterTexto(registro, "descricaoCurta", "resumo"),
    descricao: obterTexto(registro, "descricao", "descricaoCompleta"), categoria: obterTexto(registro, "categoria"),
    imagemCapaUrl: obterTexto(registro, "imagemCapaUrl", "imagemUrl", "imagem"), dataInicial: obterTexto(registro, "dataInicial", "data"),
    dataFinal: obterTexto(registro, "dataFinal"), horarioInicial: obterTexto(registro, "horarioInicial", "horario"),
    horarioFinal: obterTexto(registro, "horarioFinal"), local: obterTexto(registro, "local"),
    turno: obterTexto(registro, "turno"), publicoDestinado: obterTexto(registro, "publicoDestinado", "publico"),
    organizacao: obterTexto(registro, "organizacao", "organizacaoResponsavel"), programacao: obterTexto(registro, "programacao"),
    orientacoes: obterTexto(registro, "orientacoes"), linkExterno: obterTexto(registro, "linkExterno", "link"),
    documentos: lista("documentos"), imagens: lista("imagens"), observacoesPublicas: obterTexto(registro, "observacoesPublicas", "observacoes"),
    observacoesInternas: obterTexto(registro, "observacoesInternas"),
    situacao: obterTexto(registro, "situacao", "status") || "proximo", publicado: obterBooleano(registro, "publicado"),
    arquivado: obterBooleano(registro, "arquivado"), atualizadoEm: obterTexto(registro, "atualizadoEm") || undefined,
  };
}
