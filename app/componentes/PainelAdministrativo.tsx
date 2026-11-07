// ativa recursos do navegador
"use client";

// explica as opções de marcar sem alterar seu funcionamento
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";

// importa eventos, efeitos e controles de estado
import { FormEvent, useEffect, useRef, useState } from "react";
// importa os campos e tipos do painel
import { configuracaoPainel, tiposConteudoPainel, type CampoPainel } from "../conteudo/campos-painel";
// importa a ordenação dos registros
import { ordenarRegistrosMaisRecentes } from "../conteudo/ordenacao";
// importa os tipos dos conteúdos e mensagens
import type { RegistroConteudo, TipoConteudo, NoticiaGecep } from "../conteudo/tipos";
// importa o painel do mapa
import PainelMapaColegio from "./PainelMapaColegio";
// importa o cadastro de turmas e seus vínculos com as salas
import PainelTurmas from "./PainelTurmas";
// importa as áreas do sistema de eventos
import PainelEventosInternos from "./PainelEventosInternos";
import PainelInterclasses from "./PainelInterclasses";
import PainelReunioes from "./PainelReunioes";
import PainelRepresentantes from "./PainelRepresentantes";
// importa a biblioteca e os documentos usados em todo o portal
import PainelDocumentos from "./PainelDocumentos";
import NoticiasPainel from "./NoticiasPainel";
import PainelSenhas from "./PainelSenhas";
import PainelCargos from "./PainelCargos";
import PainelHistoricoAcessos from "./PainelHistoricoAcessos";
import PainelConsulta from "./PainelConsulta";
import PainelMensagens from "./PainelMensagens";
import { areaRestrita, areasPainel, cargoComPermissoes, podeAcessar, recursoConteudo, type RecursoPainel } from "../lib/cargos";
import type { UsuarioPainel } from "../lib/sessao";
import { confirmarEncerramentoDestaque } from "./encerrar-destaque";
import { useSaidaPainel } from "./useSaidaPainel";
import EscolherArquivo from "./BibliotecaArquivos";
import SeletorPagina from "./SeletorPagina";
// liga a composição da equipe às vagas do estatuto
import CamposCargoEquipe from "./CamposCargoEquipe";
import { obterCargoEquipe } from "../lib/equipe";
import {
  confirmarSaida,
  useAvisoMudancas,
} from "./painel-eventos-comum";

// define os valores aceitos nos campos
type ValorCampo = string | number | boolean;
// identifica as novas áreas administrativas especializadas
type SecaoEventosPainel = "eventos-internos" | "interclasses" | "reunioes" | "representantes" | "turmas";

// mostra a área administrativa
export default function PainelAdministrativo({ usuario }: { usuario: UsuarioPainel }) {
  const cargo = cargoComPermissoes(usuario.cargo, usuario.permissoes)!;
  const nomeUsuario = `${usuario.nome} · ${cargo.nome}`;
  const pode = (recurso: RecursoPainel, escrita = false) => podeAcessar(usuario.cargo, recurso, escrita, usuario.permissoes);
  const [cargosAbertos, setCargosAbertos] = useState(false);
  const permiteConteudo = (item: TipoConteudo) => item === "documentos" ? ["documentos", "arquivos", "oficiais"].some((recurso) => pode(recurso as RecursoPainel)) : pode(recursoConteudo(item));
  const primeiroTipo = tiposConteudoPainel.find((item) => item !== "eventos" && permiteConteudo(item));
  const primeiraSecao = !primeiroTipo ? ([["eventos", "eventos-internos"], ["interclasses", "interclasses"], ["reunioes", "reunioes"], ["representantes", "representantes"], ["turmas", "turmas"]] as const).find(([recurso]) => pode(recurso))?.[1] : undefined;
  const [senhasAbertas, setSenhasAbertas] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  // guarda a seção de conteúdo atual
  const [noticiaOriginal, setNoticiaOriginal] = useState<NoticiaGecep | null>(null);
  const [revisaoNoticias, setRevisaoNoticias] = useState(0);
  const [noticiaJaPublicada, setNoticiaJaPublicada] = useState(false);
  const [cancelarNoticia, setCancelarNoticia] = useState(false);
  const janelaCancelar = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (cancelarNoticia) janelaCancelar.current?.showModal(); }, [cancelarNoticia]);
  const [tipo, setTipo] = useState<TipoConteudo>(primeiroTipo || "noticias");
  const [abaDocumentos, setAbaDocumentos] = useState<"arquivos" | "normas" | "publicacoes">(pode("arquivos") ? "arquivos" : pode("oficiais") ? "normas" : "publicacoes");
  // controla a seção de mensagens
  const [mensagensAbertas, setMensagensAbertas] = useState(pode("mensagens"));
  // controla a seção do mapa
  const [mapaAberto, setMapaAberto] = useState(!pode("mensagens") && !primeiroTipo && !primeiraSecao && pode("mapa"));
  // controla as áreas especializadas de eventos e representação
  const [secaoEventos, setSecaoEventos] = useState<SecaoEventosPainel | null>(pode("mensagens") ? null : primeiraSecao || null);
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
    if (tipo === "noticias" || cargosAbertos || senhasAbertas || historicoAberto || secaoEventos || mapaAberto || mensagensAbertas || !podeAcessar(usuario.cargo, recursoConteudo(tipo), true, usuario.permissoes)) return;
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
  }, [tipo, usuario.cargo, usuario.permissoes, cargosAbertos, senhasAbertas, historicoAberto, secaoEventos, mapaAberto, mensagensAbertas]);

  // troca a seção de conteúdo
  async function trocarTipo(novoTipo: TipoConteudo) {
    if (!cargosAbertos && !senhasAbertas && !historicoAberto && !mensagensAbertas && !mapaAberto && !secaoEventos && tipo === novoTipo) return;
    if (!await prepararTroca()) return;
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
  async function abrirMensagens() {
    if (mensagensAbertas) return;
    if (!await prepararTroca()) return;
    setMensagensAbertas(true);
    setMapaAberto(false);
    setSecaoEventos(null);
    setErro("");
    setFormulario(null);
    setIdEditando(null);
  }

  // abre a seção do mapa
  async function abrirMapa() {
    if (mapaAberto) return;
    if (!await prepararTroca()) return;
    setMapaAberto(true);
    setMensagensAbertas(false);
    setSecaoEventos(null);
    setErro("");
    setFormulario(null);
    setIdEditando(null);
  }

  // abre uma área administrativa especializada
  async function abrirSecaoEventos(secao: SecaoEventosPainel) {
    if (secaoEventos === secao) return;
    if (!await prepararTroca()) return;
    setSecaoEventos(secao);
    setMapaAberto(false);
    setMensagensAbertas(false);
    setErro("");
    setFormulario(null);
    setIdEditando(null);
  }

  // centraliza a confirmação antes de desmontar qualquer editor do painel
  async function prepararTroca() {
    if (!await confirmarSaida(estadoSujo)) return false;
    setConteudoSujo(false);
    setPainelFilhoSujo(false);
    setCargosAbertos(false);
    setSenhasAbertas(false);
    setHistoricoAberto(false);
    return true;
  }

  // confirma a saída antes de trocar de página ou voltar pelo navegador
  useSaidaPainel(estadoSujo);

  // prepara um formulário vazio
  function novoRegistro() {
    // cria o valor inicial de cada campo
    const valores = Object.fromEntries(
      configuracao.campos.map((campo) => [campo.chave, campo.tipo === "checkbox" ? false : campo.tipo === "number" ? 0 : campo.opcoes?.[0]?.valor ?? ""]),
    );
    setFormulario({ ...valores, ...(tipo === "membros" ? { cargoChave: "", vaga: "", turno: "" } : {}), areaResponsavel: areaRestrita(usuario.cargo) || "geral" });
    setPublicado(true);
    setNoticiaJaPublicada(false);
    setNoticiaOriginal(null);
    setIdEditando(null);
    setConteudoSujo(false);
  }

  // preenche o formulário para edição
  function editarRegistro(item: RegistroConteudo) {
    // lê os dados salvos do registro
    const dados = item.dados as unknown as Record<string, ValorCampo>;
    // completa campos que ainda não possuem valor
    setFormulario(Object.fromEntries(configuracao.campos.map((campo) => [campo.chave, dados[campo.chave] ?? (campo.tipo === "checkbox" ? false : campo.tipo === "number" ? 0 : "")])));
    setFormulario((atual) => atual ? { ...atual, ...(tipo === "membros" ? { cargoChave: obterCargoEquipe(dados)?.chave || "", vaga: String(dados.vaga || ""), turno: String(dados.turno || "") } : {}), areaResponsavel: String(dados.areaResponsavel || "geral") } : atual);
    setPublicado(item.publicado);
    setNoticiaOriginal(item.tipo === "noticias" ? item.dados as NoticiaGecep : null);
    setNoticiaJaPublicada(item.publicado || Boolean((item.dados as { jaPublicada?: boolean }).jaPublicada));
    setIdEditando(item.id);
    setConteudoSujo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // salva um registro novo ou editado
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario) return;
    const rascunho = tipo === "noticias" && (evento.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "rascunho";
    setSalvando(true);
    setErro("");

    try {
      // envia o formulário para a api
      const resposta = await fetch("/api/conteudo", {
        method: idEditando ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: idEditando, tipo, dados: formulario, publicado: tipo === "noticias" ? !rascunho : publicado }),
      });
      // lê o registro salvo
      const resultado = await resposta.json() as { item?: RegistroConteudo; erro?: string };
      if (!resposta.ok || !resultado.item) throw new Error(resultado.erro || "Não foi possível salvar.");
      // atualiza e reordena a lista na tela
      setItens((atuais) => ordenarRegistrosMaisRecentes(idEditando
        ? atuais.map((item) => item.id === idEditando ? resultado.item as RegistroConteudo : item)
        : [...atuais, resultado.item as RegistroConteudo]));
      setRevisaoNoticias((valor) => valor + 1);
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

  async function mudarFormulario(campo: string, valor: ValorCampo) {
    if (tipo === "noticias" && campo === "destaque" && valor === false && publicado && noticiaOriginal?.destaque) {
      if (!await confirmarEncerramentoDestaque(noticiaOriginal.destaqueAte, true)) return;
    }
    setFormulario((atual) => atual ? { ...atual, [campo]: valor } : atual);
    setConteudoSujo(true);
  }

  async function fecharFormulario() {
    if (tipo === "noticias" && conteudoSujo) { setCancelarNoticia(true); return; }
    if (!await confirmarSaida(conteudoSujo)) return;
    setFormulario(null);
    setIdEditando(null);
    setConteudoSujo(false);
  }

  const recursoAtual: RecursoPainel = mapaAberto ? "mapa" : mensagensAbertas ? "mensagens" : secaoEventos === "eventos-internos" ? "eventos" : secaoEventos || (tipo === "documentos" ? abaDocumentos === "arquivos" ? "arquivos" : abaDocumentos === "normas" ? "oficiais" : "documentos" : recursoConteudo(tipo));
  const somenteConsulta = !pode(recursoAtual, true);
  return (
    <div className="painel-administrativo">
      {/* menu lateral do painel */}
      <aside className="menu-painel">
        {/* identificação do usuário */}
        <div className="usuario-painel"><span>GE</span><div><small>Área da gestão</small><strong>{nomeUsuario}</strong></div></div>
        {/* botões das seções */}
        <nav aria-label="Seções do painel">
          {/* Eventos legados continuam no backup e na migração, mas novas edições
              usam somente o painel relacional para não criar duas fontes. */}
          {tiposConteudoPainel.filter((nomeTipo) => nomeTipo !== "eventos" && permiteConteudo(nomeTipo)).map((nomeTipo) => <button type="button" className={!cargosAbertos && !senhasAbertas && !historicoAberto && !mensagensAbertas && !mapaAberto && !secaoEventos && tipo === nomeTipo ? "ativo" : ""} onClick={() => trocarTipo(nomeTipo)} key={nomeTipo}>{configuracaoPainel[nomeTipo].nome}</button>)}
          <span className="grupo-menu-painel">Eventos, reuniões e turmas</span>
          {pode("eventos") && <button type="button" className={secaoEventos === "eventos-internos" ? "ativo" : ""} onClick={() => abrirSecaoEventos("eventos-internos")}>Eventos internos</button>}
          {pode("interclasses") && <button type="button" className={secaoEventos === "interclasses" ? "ativo" : ""} onClick={() => abrirSecaoEventos("interclasses")}>Interclasses e campeonatos</button>}
          {pode("reunioes") && <button type="button" className={secaoEventos === "reunioes" ? "ativo" : ""} onClick={() => abrirSecaoEventos("reunioes")}>Reuniões, atas e presenças</button>}
          {pode("representantes") && <button type="button" className={secaoEventos === "representantes" ? "ativo" : ""} onClick={() => abrirSecaoEventos("representantes")}>Representantes</button>}
          {pode("turmas") && <button type="button" className={secaoEventos === "turmas" ? "ativo" : ""} onClick={() => abrirSecaoEventos("turmas")}>Turmas</button>}
          {pode("mapa") && <button type="button" className={mapaAberto ? "ativo" : ""} onClick={abrirMapa}>Mapa e ensalamento</button>}
          {pode("mensagens") && <button type="button" className={mensagensAbertas ? "ativo" : ""} onClick={abrirMensagens}>Mensagens recebidas</button>}
          {usuario.cargo === "geral" && <>
            <span className="grupo-menu-painel">Administração</span>
            <button type="button" className={cargosAbertos ? "ativo" : ""} onClick={async () => { if (!await prepararTroca()) return; setFormulario(null); setSecaoEventos(null); setMapaAberto(false); setMensagensAbertas(false); setCargosAbertos(true); }}>Gerenciamento de cargos</button>
            <button type="button" className={senhasAbertas ? "ativo" : ""} onClick={async () => { if (!await prepararTroca()) return; setFormulario(null); setSecaoEventos(null); setMapaAberto(false); setMensagensAbertas(false); setSenhasAbertas(true); }}>Registro de senhas</button>
            <button type="button" className={historicoAberto ? "ativo" : ""} onClick={async () => { if (!await prepararTroca()) return; setFormulario(null); setSecaoEventos(null); setMapaAberto(false); setMensagensAbertas(false); setHistoricoAberto(true); }}>Histórico de acessos</button>
          </>}
        </nav>
        {/* saída do painel */}
        <a className="sair-painel" href="/api/logout">Sair do painel</a>
      </aside>

      {/* confirma o descarte sem usar uma janela do navegador */}
      <dialog ref={janelaCancelar} className="dialogo-anonimato" aria-labelledby="titulo-cancelar-noticia" onCancel={() => setCancelarNoticia(false)}><h2 id="titulo-cancelar-noticia">Descartar alterações?</h2><p>As alterações não salvas desta notícia serão perdidas.</p><div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" onClick={() => { janelaCancelar.current?.close(); setCancelarNoticia(false); }}>Continuar editando</button><button type="button" className="botao-primario" onClick={() => { janelaCancelar.current?.close(); setCancelarNoticia(false); setFormulario(null); setIdEditando(null); setConteudoSujo(false); }}>Descartar alterações</button></div></dialog>
      {/* conteúdo da seção escolhida */}
      <div className="conteudo-painel">
        {/* painel do mapa ou das mensagens */}
        {!cargosAbertos && !historicoAberto && !senhasAbertas && !secaoEventos && !mapaAberto && !mensagensAbertas && tipo === "documentos" && <div className="abas-documentos" role="group" aria-label="Áreas de documentos">{([["arquivos", "Arquivos"], ["normas", "Estatuto e Regimento"], ["publicacoes", "Publicações"]] as const).filter(([aba]) => pode(aba === "arquivos" ? "arquivos" : aba === "normas" ? "oficiais" : "documentos")).map(([aba, nome]) => <button type="button" key={aba} aria-pressed={abaDocumentos === aba} onClick={async () => { if (!await prepararTroca()) return; setFormulario(null); setAbaDocumentos(aba); }}>{nome}</button>)}</div>}
        {cargosAbertos ? <PainelCargos aoMudarEstadoSujo={setPainelFilhoSujo} /> : historicoAberto ? <PainelHistoricoAcessos /> : senhasAbertas ? <PainelSenhas aoMudarEstadoSujo={setPainelFilhoSujo} /> : !pode(recursoAtual) ? <section className="consulta-painel"><h1>Nenhum menu disponível</h1><p>Solicite à administração a liberação dos menus necessários para seu cargo.</p></section> : mensagensAbertas ? <PainelMensagens somenteConsulta={somenteConsulta} /> : somenteConsulta ? <PainelConsulta key={recursoAtual} recurso={recursoAtual} publicos={cargo.publicos} /> : secaoEventos === "eventos-internos" ? (
          <PainelEventosInternos cargo={usuario.cargo} aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "interclasses" ? (
          <PainelInterclasses aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "reunioes" ? (
          <PainelReunioes cargo={usuario.cargo} aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "representantes" ? (
          <PainelRepresentantes aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : secaoEventos === "turmas" ? (
          <PainelTurmas aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : mapaAberto ? (
          <PainelMapaColegio aoMudarEstadoSujo={setPainelFilhoSujo} />
        ) : (
          <>
            {/* título e botão de novo registro */}
            <header className="topo-painel">
              <div><span className="rotulo-secao">PAINEL DE CONTEÚDO</span><h1>{configuracao.nome}</h1><p>{configuracao.descricao}</p></div>
              {!formulario && (tipo !== "documentos" || abaDocumentos === "publicacoes") && <button type="button" onClick={novoRegistro}>+ Novo {configuracao.singular}</button>}
            </header>

            {/* aviso de erro */}
            {erro && <p className="erro-painel" role="alert">{erro}</p>}

            {/* separa os arquivos privados das versões oficiais e das publicações */}


            {/* formulário ou lista de registros */}
            {tipo === "documentos" && abaDocumentos !== "publicacoes" ? <PainelDocumentos key={abaDocumentos} aba={abaDocumentos} aoMudarEstadoSujo={setPainelFilhoSujo} /> : formulario ? (
              <form className={tipo === "noticias" ? "formulario-painel formulario-noticia" : "formulario-painel"} onSubmit={salvar}>
                {/* título do formulário */}
                <div className="titulo-formulario-painel"><div><small>{idEditando ? "EDITANDO" : "NOVO REGISTRO"}</small><h2>{idEditando ? "Atualizar" : "Adicionar"} {configuracao.singular}</h2></div><button type="button" onClick={fecharFormulario}>Fechar</button></div>
                {/* campos configurados para a seção */}
                <div className="grade-campos-painel">
                  {["noticias", "projetos", "documentos"].includes(tipo) && <label className="campo-largo"><span>Área responsável</span>{areaRestrita(usuario.cargo) ? <input value={areasPainel.find((area) => area.chave === areaRestrita(usuario.cargo))?.nome || ""} readOnly /> : <select value={String(formulario.areaResponsavel || "geral")} onChange={(evento) => void mudarFormulario("areaResponsavel", evento.target.value)}>{areasPainel.map((area) => <option key={area.chave} value={area.chave}>{area.nome}</option>)}</select>}<small>A área define quem pode editar esta publicação. Use Colégio e comunidade escolar para assuntos do CEP que afetam os estudantes. Comunicação e acesso geral acompanham todas as áreas.</small></label>}

                  {tipo === "membros" && <CamposCargoEquipe dados={formulario} mudar={mudarFormulario} />}
                  {configuracao.campos.filter((campo) => (tipo !== "membros" || campo.chave !== "cargo") && (!campo.dependeDe || Boolean(formulario[campo.dependeDe]))).map((campo) => <CampoFormulario campo={campo} valor={formulario[campo.chave]} mudar={(valor) => mudarFormulario(campo.chave, valor)} enviarArquivo={(arquivo) => enviarArquivo(campo.chave, arquivo)} key={campo.chave} />)}
                  {tipo !== "noticias" && <label className="campo-publicado"><CheckboxComAjuda checked={publicado} onChange={(evento) => { setPublicado(evento.target.checked); setConteudoSujo(true); }} explicacao={descricaoCheckbox("publicado")} aria-label={"Publicar este registro no portal"} /><span>Publicar este registro no portal</span></label>}
                </div>
                {tipo === "noticias" && <p className="ajuda-busca">Salvar registro publica a notícia no portal. Salvar em rascunho mantém uma notícia nova apenas no painel.</p>}
                {/* botões do formulário */}
                <div className="acoes-formulario-painel"><button type="button" onClick={fecharFormulario}>Cancelar</button>{tipo === "noticias" && !noticiaJaPublicada && <button type="submit" name="acao" value="rascunho" formNoValidate disabled={salvando}>Salvar em rascunho</button>}<button type="submit" name="acao" value="publicar" disabled={salvando}>{salvando ? "Salvando..." : "Salvar registro"}</button></div>
              </form>
            ) : tipo === "noticias" ? <NoticiasPainel editar={editarRegistro} atualizacao={revisaoNoticias} /> : (
              <div className="lista-painel">
                {/* estados da lista */}
                {carregando && <p>Carregando registros...</p>}
                {!carregando && !itens.length && <div className="vazio-painel"><strong>Nenhum registro</strong><p>Use o botão acima para adicionar o primeiro item.</p></div>}
                {/* registros da seção */}
                {itens.filter((item) => !(tipo === "documentos" && "documentoOficial" in item.dados)).map((item) => (
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
  if (campo.tipo === "checkbox") return <label className="campo-publicado"><CheckboxComAjuda checked={Boolean(valor)} onChange={(evento) => mudar(evento.target.checked)} explicacao={descricaoCheckbox(campo.chave)} aria-label={campo.rotulo} /><span>{campo.rotulo}</span></label>;
  // mostra uma área de texto
  if (campo.tipo === "textarea") return <label className="campo-largo"><span>{campo.rotulo}</span><textarea rows={5} value={String(valor ?? "")} onChange={(evento) => mudar(evento.target.value)} required={campo.obrigatorio} />{campo.dica && <small>{campo.dica}</small>}</label>;
  // mostra uma lista de opções
  if (campo.tipo === "select") return <label><span>{campo.rotulo}</span><select value={String(valor ?? "")} onChange={(evento) => mudar(evento.target.value)} required={campo.obrigatorio}>{campo.opcoes?.map((opcao) => <option value={opcao.valor} key={opcao.valor}>{opcao.nome}</option>)}</select></label>;
  // mostra o endereço e envio de arquivo
  if (campo.tipo === "arquivo") return <div className="campo-largo"><label><span>{campo.rotulo}</span><input type="text" inputMode="url" value={String(valor ?? "")} onChange={(evento) => mudar(evento.target.value)} placeholder="Cole um link ou envie um arquivo abaixo" required={campo.obrigatorio} /><input className="entrada-arquivo" type="file" accept={["imagemUrl", "fotoUrl"].includes(campo.chave) ? "image/png,image/jpeg,image/webp" : ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.odt,.ods,.odp"} onChange={(evento) => enviarArquivo(evento.target.files?.[0])} />{campo.dica && <small>{campo.dica}</small>}</label><EscolherArquivo aceitar={["imagemUrl", "fotoUrl"].includes(campo.chave) ? "imagem" : "todos"} selecionar={(arquivo) => mudar(arquivo.url)} /></div>;
  // oferece páginas publicadas para o botão interno da notícia
  if (campo.tipo === "pagina") return <label><span>{campo.rotulo}</span><SeletorPagina valor={String(valor ?? "")} mudar={(endereco) => mudar(endereco)} /></label>;
  // mostra um campo simples
  return <label className={campo.chave === "destaqueAte" ? "campo-largo" : undefined}><span>{campo.rotulo}</span><input type={campo.tipo} value={String(valor ?? "")} step={campo.tipo === "number" ? "0.01" : undefined} onChange={(evento) => mudar(campo.tipo === "number" ? Number(evento.target.value) : evento.target.value)} required={campo.obrigatorio} />{campo.dica && <small>{campo.dica}</small>}</label>;
}


// transforma a data para leitura
function formatarData(data?: string) {
  if (!data) return "agora";
  // trata datas do banco como horário universal
  const momento = new Date(data.replace(" ", "T") + (data.includes("Z") ? "" : "Z"));
  return Number.isNaN(momento.getTime()) ? data : momento.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
