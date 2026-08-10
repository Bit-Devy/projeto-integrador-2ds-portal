// ativa recursos do navegador
"use client";

// importa eventos, efeitos e controles de estado
import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useState } from "react";
// importa os campos e tipos do painel
import { configuracaoPainel, tiposConteudoPainel, type CampoPainel } from "../conteudo/campos-painel";
// importa a ordenação dos registros
import { ordenarRegistrosMaisRecentes } from "../conteudo/ordenacao";
// importa os tipos dos conteúdos e mensagens
import type { MensagemParticipacao, RegistroConteudo, TipoConteudo } from "../conteudo/tipos";
// importa o painel do mapa
import PainelMapaColegio from "./PainelMapaColegio";
// importa as áreas do sistema de eventos
import PainelEventosInternos from "./PainelEventosInternos";
import PainelInterclasses from "./PainelInterclasses";
import PainelReunioes from "./PainelReunioes";
import PainelRepresentantes from "./PainelRepresentantes";
import {
  autorizarNavegacaoPainel,
  confirmarSaida,
  useAvisoMudancas,
} from "./painel-eventos-comum";

// define os valores aceitos nos campos
type ValorCampo = string | number | boolean;
// identifica as novas áreas administrativas especializadas
type SecaoEventosPainel = "eventos-internos" | "interclasses" | "reunioes" | "representantes";

// mostra a área administrativa
export default function PainelAdministrativo({ nomeUsuario }: { nomeUsuario: string }) {
  // guarda a seção de conteúdo atual
  const [tipo, setTipo] = useState<TipoConteudo>("noticias");
  // controla a seção de mensagens
  const [mensagensAbertas, setMensagensAbertas] = useState(false);
  // controla a seção do mapa
  const [mapaAberto, setMapaAberto] = useState(false);
  // controla as áreas especializadas de eventos e representação
  const [secaoEventos, setSecaoEventos] = useState<SecaoEventosPainel | null>(null);
  // guarda os registros carregados
  const [itens, setItens] = useState<RegistroConteudo[]>([]);
  // controla o carregamento
  const [carregando, setCarregando] = useState(true);
  // guarda a mensagem de erro
  const [erro, setErro] = useState("");
  // guarda os campos do formulário
  const [formulario, setFormulario] = useState<Record<string, ValorCampo> | null>(null);
  // guarda o registro em edição
  const [idEditando, setIdEditando] = useState<number | null>(null);
  // controla a publicação do registro
  const [publicado, setPublicado] = useState(true);
  // controla o salvamento
  const [salvando, setSalvando] = useState(false);
  // reúne o estado não salvo do editor legado e do painel especializado aberto
  const [conteudoSujo, setConteudoSujo] = useState(false);
  const [painelFilhoSujo, setPainelFilhoSujo] = useState(false);

  const estadoSujo = conteudoSujo || painelFilhoSujo;
  useAvisoMudancas(estadoSujo);

  // escolhe a configuração da seção
  const configuracao = configuracaoPainel[tipo];

  // carrega os registros da seção atual
  useEffect(() => {
    // evita atualizar a tela depois de sair
    let ativo = true;
    // consulta todos os registros do tipo
    fetch(`/api/conteudo?tipo=${tipo}&todos=1`)
      .then(async (resposta) => {
        // lê e ordena os registros recebidos
        const dados = await resposta.json() as { itens?: RegistroConteudo[]; erro?: string };
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar os registros.");
        if (ativo) setItens(ordenarRegistrosMaisRecentes(dados.itens ?? []));
      })
      .catch((falha) => ativo && setErro(falha instanceof Error ? falha.message : "Erro inesperado."))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [tipo]);

  // troca a seção de conteúdo
  function trocarTipo(novoTipo: TipoConteudo) {
    if (!mensagensAbertas && !mapaAberto && !secaoEventos && tipo === novoTipo) return;
    if (!prepararTroca()) return;
    setCarregando(true);
    setErro("");
    setMensagensAbertas(false);
    setMapaAberto(false);
    setSecaoEventos(null);
    setTipo(novoTipo);
    setFormulario(null);
    setIdEditando(null);
  }

  // abre a seção de mensagens
  function abrirMensagens() {
    if (mensagensAbertas) return;
    if (!prepararTroca()) return;
    setMensagensAbertas(true);
    setMapaAberto(false);
    setSecaoEventos(null);
    setErro("");
    setFormulario(null);
    setIdEditando(null);
  }

  // abre a seção do mapa
  function abrirMapa() {
    if (mapaAberto) return;
    if (!prepararTroca()) return;
    setMapaAberto(true);
    setMensagensAbertas(false);
    setSecaoEventos(null);
    setErro("");
    setFormulario(null);
    setIdEditando(null);
  }

  // abre uma área administrativa especializada
  function abrirSecaoEventos(secao: SecaoEventosPainel) {
    if (secaoEventos === secao) return;
    if (!prepararTroca()) return;
    setSecaoEventos(secao);
    setMapaAberto(false);
    setMensagensAbertas(false);
    setErro("");
    setFormulario(null);
    setIdEditando(null);
  }

  // centraliza a confirmação antes de desmontar qualquer editor do painel
  function prepararTroca() {
    if (!confirmarSaida(estadoSujo)) return false;
    setConteudoSujo(false);
    setPainelFilhoSujo(false);
    return true;
  }

  // confirma links que deixam o painel, inclusive o logout. Links abertos em
  // outra aba não desmontam o editor atual e, portanto, não descartam dados.
  function confirmarNavegacao(evento: ReactMouseEvent<HTMLDivElement>) {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const origem = evento.target instanceof Element ? evento.target : null;
    const link = origem?.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const destino = link.getAttribute("href");
    if (!destino || destino.startsWith("#") || !estadoSujo) return;
    if (!confirmarSaida(true)) {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }
    autorizarNavegacaoPainel();
    setConteudoSujo(false);
    setPainelFilhoSujo(false);
  }

  // prepara um formulário vazio
  function novoRegistro() {
    // cria o valor inicial de cada campo
    const valores = Object.fromEntries(
      configuracao.campos.map((campo) => [campo.chave, campo.tipo === "checkbox" ? false : campo.tipo === "number" ? 0 : campo.opcoes?.[0]?.valor ?? ""]),
    );
    setFormulario(valores);
    setPublicado(true);
    setIdEditando(null);
    setConteudoSujo(false);
  }

  // preenche o formulário para edição
  function editarRegistro(item: RegistroConteudo) {
    // lê os dados salvos do registro
    const dados = item.dados as unknown as Record<string, ValorCampo>;
    // completa campos que ainda não possuem valor
    setFormulario(Object.fromEntries(configuracao.campos.map((campo) => [campo.chave, dados[campo.chave] ?? (campo.tipo === "checkbox" ? false : campo.tipo === "number" ? 0 : "")])));
    setPublicado(item.publicado);
    setIdEditando(item.id);
    setConteudoSujo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // salva um registro novo ou editado
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario) return;
    setSalvando(true);
    setErro("");

    try {
      // envia o formulário para a api
      const resposta = await fetch("/api/conteudo", {
        method: idEditando ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: idEditando, tipo, dados: formulario, publicado }),
      });
      // lê o registro salvo
      const resultado = await resposta.json() as { item?: RegistroConteudo; erro?: string };
      if (!resposta.ok || !resultado.item) throw new Error(resultado.erro || "Não foi possível salvar.");
      // atualiza e reordena a lista na tela
      setItens((atuais) => ordenarRegistrosMaisRecentes(idEditando
        ? atuais.map((item) => item.id === idEditando ? resultado.item as RegistroConteudo : item)
        : [...atuais, resultado.item as RegistroConteudo]));
      setFormulario(null);
      setIdEditando(null);
      setConteudoSujo(false);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  // exclui um registro após confirmação
  async function excluir(item: RegistroConteudo) {
    if (!window.confirm(`Excluir “${item.titulo}”? Esta ação não pode ser desfeita.`)) return;
    const resposta = await fetch(`/api/conteudo?id=${item.id}`, { method: "DELETE" });
    if (resposta.ok) setItens((atuais) => atuais.filter((registro) => registro.id !== item.id));
    else setErro("Não foi possível excluir o registro.");
  }

  // envia um arquivo e guarda seu endereço
  async function enviarArquivo(campo: string, arquivo?: File) {
    if (!arquivo || !formulario) return;
    setSalvando(true);
    setErro("");
    const dados = new FormData();
    dados.append("arquivo", arquivo);
    try {
      // envia o arquivo para o servidor
      const resposta = await fetch("/api/arquivos", { method: "POST", body: dados });
      const resultado = await resposta.json() as { url?: string; erro?: string };
      if (!resposta.ok || !resultado.url) throw new Error(resultado.erro || "Não foi possível enviar o arquivo.");
      setFormulario((atual) => atual ? { ...atual, [campo]: resultado.url as string } : atual);
      setConteudoSujo(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao enviar arquivo.");
    } finally {
      setSalvando(false);
    }
  }

  function mudarFormulario(campo: string, valor: ValorCampo) {
    setFormulario((atual) => atual ? { ...atual, [campo]: valor } : atual);
    setConteudoSujo(true);
  }

  function fecharFormulario() {
    if (!confirmarSaida(conteudoSujo)) return;
    setFormulario(null);
    setIdEditando(null);
    setConteudoSujo(false);
  }

  // baixa uma cópia de todos os conteúdos
  async function baixarCopia() {
    setErro("");
    try {
      // busca todos os tipos de conteúdo
      const pares = await Promise.all(tiposConteudoPainel.map(async (nomeTipo) => {
        const resposta = await fetch(`/api/conteudo?tipo=${nomeTipo}&todos=1`);
        if (!resposta.ok) throw new Error("Não foi possível montar a cópia dos dados.");
        const dados = await resposta.json() as { itens: RegistroConteudo[] };
        return [nomeTipo, dados.itens] as const;
      }));
      // cria o arquivo de cópia
      const arquivo = new Blob([JSON.stringify({ versao: 1, exportadoEm: new Date().toISOString(), conteudos: Object.fromEntries(pares) }, null, 2)], { type: "application/json" });
      // inicia o download do arquivo
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `copia-dados-gecep-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao gerar a cópia.");
    }
  }

  return (
    <div className="painel-administrativo" onClickCapture={confirmarNavegacao}>
      {/* menu lateral do painel */}
      <aside className="menu-painel">
        {/* identificação do usuário */}
        <div className="usuario-painel"><span>GE</span><div><small>Área da gestão</small><strong>{nomeUsuario}</strong></div></div>
        {/* botões das seções */}
        <nav aria-label="Seções do painel">
          {/* Eventos legados continuam no backup e na migração, mas novas edições
              usam somente o painel relacional para não criar duas fontes. */}
          {tiposConteudoPainel.filter((nomeTipo) => nomeTipo !== "eventos").map((nomeTipo) => <button type="button" className={!mensagensAbertas && !mapaAberto && !secaoEventos && tipo === nomeTipo ? "ativo" : ""} onClick={() => trocarTipo(nomeTipo)} key={nomeTipo}>{configuracaoPainel[nomeTipo].nome}</button>)}
          <span className="grupo-menu-painel">Eventos, reuniões e turmas</span>
          <button type="button" className={secaoEventos === "eventos-internos" ? "ativo" : ""} onClick={() => abrirSecaoEventos("eventos-internos")}>Eventos internos</button>
          <button type="button" className={secaoEventos === "interclasses" ? "ativo" : ""} onClick={() => abrirSecaoEventos("interclasses")}>Interclasses e campeonatos</button>
          <button type="button" className={secaoEventos === "reunioes" ? "ativo" : ""} onClick={() => abrirSecaoEventos("reunioes")}>Reuniões, atas e presenças</button>
          <button type="button" className={secaoEventos === "representantes" ? "ativo" : ""} onClick={() => abrirSecaoEventos("representantes")}>Representantes</button>
          <button type="button" className={mapaAberto ? "ativo" : ""} onClick={abrirMapa}>Mapa e ensalamento</button>
          <button type="button" className={mensagensAbertas ? "ativo" : ""} onClick={abrirMensagens}>Mensagens recebidas</button>
        </nav>
        {/* cópia e saída do painel */}
        <button type="button" className="botao-copia" onClick={baixarCopia}>Baixar cópia dos conteúdos</button>
        <a className="sair-painel" href="/api/logout">Sair do painel</a>
      </aside>

      {/* conteúdo da seção escolhida */}
      <div className="conteudo-painel">
        {/* painel do mapa ou das mensagens */}
        {secaoEventos === "eventos-internos" ? (
          <PainelEventosInternos aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "interclasses" ? (
          <PainelInterclasses aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "reunioes" ? (
          <PainelReunioes aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "representantes" ? (
          <PainelRepresentantes aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : mapaAberto ? (
          <PainelMapaColegio aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : mensagensAbertas ? (
          <PainelMensagens />
        ) : (
          <>
            {/* título e botão de novo registro */}
            <header className="topo-painel">
              <div><span className="rotulo-secao">PAINEL DE CONTEÚDO</span><h1>{configuracao.nome}</h1><p>{configuracao.descricao}</p></div>
              {!formulario && <button type="button" onClick={novoRegistro}>+ Novo {configuracao.singular}</button>}
            </header>

            {/* aviso de erro */}
            {erro && <p className="erro-painel" role="alert">{erro}</p>}

            {/* formulário ou lista de registros */}
            {formulario ? (
              <form className="formulario-painel" onSubmit={salvar}>
                {/* título do formulário */}
                <div className="titulo-formulario-painel"><div><small>{idEditando ? "EDITANDO" : "NOVO REGISTRO"}</small><h2>{idEditando ? "Atualizar" : "Adicionar"} {configuracao.singular}</h2></div><button type="button" onClick={fecharFormulario}>Fechar</button></div>
                {/* campos configurados para a seção */}
                <div className="grade-campos-painel">
                  {configuracao.campos.map((campo) => <CampoFormulario campo={campo} valor={formulario[campo.chave]} mudar={(valor) => mudarFormulario(campo.chave, valor)} enviarArquivo={(arquivo) => enviarArquivo(campo.chave, arquivo)} key={campo.chave} />)}
                  <label className="campo-publicado"><input type="checkbox" checked={publicado} onChange={(evento) => { setPublicado(evento.target.checked); setConteudoSujo(true); }} /><span>Publicar este registro no portal</span></label>
                </div>
                {/* botões do formulário */}
                <div className="acoes-formulario-painel"><button type="button" onClick={fecharFormulario}>Cancelar</button><button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar registro"}</button></div>
              </form>
            ) : (
              <div className="lista-painel">
                {/* estados da lista */}
                {carregando && <p>Carregando registros...</p>}
                {!carregando && !itens.length && <div className="vazio-painel"><strong>Nenhum registro</strong><p>Use o botão acima para adicionar o primeiro item.</p></div>}
                {/* registros da seção */}
                {itens.map((item) => (
                  <article key={item.id}><span className={item.publicado ? "estado-publicado" : "estado-rascunho"}>{item.publicado ? "Publicado" : "Rascunho"}</span><div><h2>{item.titulo}</h2><p>Atualizado em {formatarData(item.atualizadoEm)}</p></div><div className="acoes-item-painel"><button type="button" onClick={() => editarRegistro(item)}>Editar</button><button type="button" onClick={() => excluir(item)}>Excluir</button></div></article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// mostra um campo conforme seu tipo
function CampoFormulario({ campo, valor, mudar, enviarArquivo }: { campo: CampoPainel; valor: ValorCampo | undefined; mudar: (valor: ValorCampo) => void; enviarArquivo: (arquivo?: File) => void }) {
  // mostra uma caixa de seleção
  if (campo.tipo === "checkbox") return <label className="campo-publicado"><input type="checkbox" checked={Boolean(valor)} onChange={(evento) => mudar(evento.target.checked)} /><span>{campo.rotulo}</span></label>;
  // mostra uma área de texto
  if (campo.tipo === "textarea") return <label className="campo-largo"><span>{campo.rotulo}</span><textarea rows={5} value={String(valor ?? "")} onChange={(evento) => mudar(evento.target.value)} required={campo.obrigatorio} />{campo.dica && <small>{campo.dica}</small>}</label>;
  // mostra uma lista de opções
  if (campo.tipo === "select") return <label><span>{campo.rotulo}</span><select value={String(valor ?? "")} onChange={(evento) => mudar(evento.target.value)} required={campo.obrigatorio}>{campo.opcoes?.map((opcao) => <option value={opcao.valor} key={opcao.valor}>{opcao.nome}</option>)}</select></label>;
  // mostra o endereço e envio de arquivo
  if (campo.tipo === "arquivo") return <label className="campo-largo"><span>{campo.rotulo}</span><input type="url" value={String(valor ?? "")} onChange={(evento) => mudar(evento.target.value)} placeholder="Cole um link ou envie um arquivo abaixo" required={campo.obrigatorio} /><input className="entrada-arquivo" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(evento) => enviarArquivo(evento.target.files?.[0])} />{campo.dica && <small>{campo.dica}</small>}</label>;
  // mostra um campo simples
  return <label><span>{campo.rotulo}</span><input type={campo.tipo} value={String(valor ?? "")} step={campo.tipo === "number" ? "0.01" : undefined} onChange={(evento) => mudar(campo.tipo === "number" ? Number(evento.target.value) : evento.target.value)} required={campo.obrigatorio} />{campo.dica && <small>{campo.dica}</small>}</label>;
}


// mostra e organiza as mensagens recebidas
function PainelMensagens() {
  // guarda as mensagens e os estados da lista
  const [mensagens, setMensagens] = useState<MensagemParticipacao[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [visao, setVisao] = useState<"recebidas" | "arquivadas">("recebidas");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [atualizacao, setAtualizacao] = useState(0);

  // carrega as mensagens da página atual
  useEffect(() => {
    // permite cancelar a consulta
    const controlador = new AbortController();
    let ativo = true;
    // monta os filtros da consulta
    const parametros = new URLSearchParams({ pagina: String(pagina) });
    if (visao === "arquivadas") parametros.set("arquivadas", "1");
    if (buscaAplicada) parametros.set("busca", buscaAplicada);

    // consulta as mensagens no servidor
    fetch(`/api/mensagens?${parametros}`, { signal: controlador.signal }).then(async (resposta) => {
      // lê a página recebida
      const dados = await resposta.json() as { mensagens?: MensagemParticipacao[]; pagina?: number; total?: number; totalPaginas?: number; erro?: string };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar as mensagens.");
      if (!ativo) return;
      setMensagens(dados.mensagens ?? []);
      setPagina(dados.pagina ?? 1);
      setTotal(dados.total ?? 0);
      setTotalPaginas(dados.totalPaginas ?? 1);
    }).catch((falha) => {
      if (ativo && (!(falha instanceof Error) || falha.name !== "AbortError")) {
        setErro(falha instanceof Error ? falha.message : "Erro inesperado.");
      }
    }).finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
      controlador.abort();
    };
  }, [atualizacao, buscaAplicada, pagina, visao]);

  // pesquisa pelo protocolo digitado
  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novaBusca = busca.trim();
    setCarregando(true);
    setErro("");
    setPagina(1);
    if (novaBusca === buscaAplicada) setAtualizacao((valor) => valor + 1);
    else setBuscaAplicada(novaBusca);
  }

  // limpa a pesquisa atual
  function limparBusca() {
    setCarregando(true);
    setErro("");
    setBusca("");
    setBuscaAplicada("");
    setPagina(1);
  }

  // troca entre mensagens recebidas e arquivadas
  function trocarVisao(novaVisao: "recebidas" | "arquivadas") {
    if (novaVisao === visao) return;
    setCarregando(true);
    setErro("");
    setVisao(novaVisao);
    setPagina(1);
  }

  // abre outra página de mensagens
  function irParaPagina(novaPagina: number) {
    if (novaPagina === pagina) return;
    setCarregando(true);
    setErro("");
    setPagina(novaPagina);
  }

  // atualiza o status de uma mensagem
  async function mudarStatus(id: number, status: string) {
    setErro("");
    const resposta = await fetch("/api/mensagens", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (resposta.ok) {
      setCarregando(true);
      setAtualizacao((valor) => valor + 1);
    }
    else setErro("Não foi possível atualizar a mensagem.");
  }

  // exclui uma mensagem após confirmação
  async function excluirMensagem(id: number) {
    if (!window.confirm("Excluir esta mensagem permanentemente?")) return;
    setErro("");
    const resposta = await fetch(`/api/mensagens?id=${id}`, { method: "DELETE" });
    if (resposta.ok) {
      setCarregando(true);
      setAtualizacao((valor) => valor + 1);
    }
    else setErro("Não foi possível excluir a mensagem.");
  }

  // escolhe os números mostrados na paginação
  const paginas = paginasVisiveis(pagina, totalPaginas);

  return (
    <section className="mensagens-painel">
      {/* título e total de mensagens */}
      <div className="cabecalho-mensagens"><div><span className="rotulo-secao">PARTICIPAÇÃO</span><h2>Mensagens recebidas</h2><p>Consulte, organize e localize as participações enviadas pelo portal.</p></div><strong aria-label={`${total} mensagens encontradas`}>{total}</strong></div>

      {/* filtros e busca das mensagens */}
      <div className="ferramentas-mensagens">
        <div className="filtros-mensagens" aria-label="Exibir mensagens">
          <button type="button" className={visao === "recebidas" ? "ativo" : ""} onClick={() => trocarVisao("recebidas")}>Caixa de entrada</button>
          <button type="button" className={visao === "arquivadas" ? "ativo" : ""} onClick={() => trocarVisao("arquivadas")}>Arquivadas</button>
        </div>
        <form className="busca-mensagens" onSubmit={pesquisar}>
          <label htmlFor="busca-protocolo">Buscar por protocolo</label>
          <div>
            <input id="busca-protocolo" type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Ex.: GECEP-2026-00042" maxLength={40} />
            {(busca || buscaAplicada) && <button type="button" className="limpar-busca" onClick={limparBusca}>Limpar</button>}
            <button type="submit">Pesquisar</button>
          </div>
        </form>
      </div>

      {/* estados de erro, carregamento e lista vazia */}
      {erro && <p className="erro-painel" role="alert">{erro}</p>}
      {carregando && !mensagens.length && <div className="vazio-painel"><strong>Carregando mensagens...</strong></div>}
      {!carregando && !erro && !mensagens.length && <div className="vazio-painel"><strong>{buscaAplicada ? "Nenhuma mensagem encontrada" : visao === "arquivadas" ? "Nenhuma mensagem arquivada" : "Nenhuma mensagem recebida"}</strong><p>{buscaAplicada ? "Confira o protocolo informado e tente novamente." : visao === "arquivadas" ? "As mensagens arquivadas aparecerão aqui." : "Novos envios aparecerão aqui."}</p></div>}
      {/* cartões das mensagens */}
      <div className="lista-mensagens-painel">
        {mensagens.map((mensagem) => (
          <article key={mensagem.id}>
            <div className="topo-mensagem"><span>{mensagem.protocolo}</span><time>{formatarData(mensagem.criadoEm)}</time></div>
            <span className="assunto-mensagem">{mensagem.assunto}</span>
            <h3>{mensagem.titulo}</h3>
            <p>{mensagem.mensagem}</p>
            <small>{mensagem.anonimo ? "Identidade preservada" : `${mensagem.nome} · ${mensagem.turma}`}</small>
            {mensagem.contato && <small className="contato-mensagem">Contato: {nomeTipoContato(mensagem.tipoContato)} · {mensagem.contato}</small>}
            <div><select aria-label={`Status da mensagem ${mensagem.protocolo}`} value={mensagem.status} onChange={(evento) => mudarStatus(mensagem.id, evento.target.value)}><option value="nova">Nova</option><option value="em_analise">Em análise</option><option value="respondida">Respondida</option><option value="arquivada">Arquivada</option></select><button type="button" onClick={() => excluirMensagem(mensagem.id)}>Excluir</button></div>
          </article>
        ))}
      </div>

      {/* botões de paginação */}
      {totalPaginas > 1 && (
        <nav className="paginacao-mensagens" aria-label="Páginas de mensagens">
          <button type="button" onClick={() => irParaPagina(Math.max(1, pagina - 1))} disabled={pagina === 1 || carregando}>Anterior</button>
          {paginas.map((numero) => <button type="button" className={pagina === numero ? "ativo" : ""} aria-current={pagina === numero ? "page" : undefined} onClick={() => irParaPagina(numero)} disabled={carregando} key={numero}>{numero}</button>)}
          <button type="button" onClick={() => irParaPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas || carregando}>Próxima</button>
        </nav>
      )}
    </section>
  );
}

// escolhe até cinco páginas próximas
function paginasVisiveis(paginaAtual: number, totalPaginas: number) {
  const quantidade = Math.min(5, totalPaginas);
  const inicio = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - quantidade + 1));
  return Array.from({ length: quantidade }, (_, indice) => inicio + indice);
}

// mostra o nome do tipo de contato
function nomeTipoContato(tipo: string) {
  return ({ whatsapp: "WhatsApp", telefone: "Telefone", email: "E-mail", instagram: "Instagram", outro: "Outro" } as Record<string, string>)[tipo] ?? "Outro";
}

// transforma a data para leitura
function formatarData(data?: string) {
  if (!data) return "agora";
  // trata datas do banco como horário universal
  const momento = new Date(data.replace(" ", "T") + (data.includes("Z") ? "" : "Z"));
  return Number.isNaN(momento.getTime()) ? data : momento.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
