"use client";

// usa os controles da tela e guarda as alterações da navegação
import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
// usa os mesmos dados da chave pública e do painel
import type { FasePublica, JogoPublico } from "../eventos/modelo-publico";
// prepara os textos que aparecem nos jogos
import {
  formatarData,
  normalizarBusca,
  rotuloSituacao,
  textoParticipante,
} from "../eventos/modelo-publico";
// calcula a posição dos cartões e das linhas
import {
  calcularZoomDaChave,
  indiceFaseParaAbrir,
  margemDaChave,
  posicionarChave,
  type ModoChave,
} from "../eventos/interclasse-utilitarios";

// guarda o jogo e o lado escolhido para a troca
export type PosicaoChave = { partidaId: number; posicao: "a" | "b" };

// mostra o nome da turma ou avisa que ela ainda será definida
export function nomeEquipe(jogo: JogoPublico, lado: "a" | "b") {
  return (
    (lado === "a"
      ? jogo.participanteANome || jogo.nomeParticipanteA || textoParticipante(jogo.participanteA)
      : jogo.participanteBNome ||
        jogo.nomeParticipanteB ||
        textoParticipante(jogo.participanteB)) || "A definir"
  );
}

// move o visor para uma posição da prancheta
function rolarParaPonto(
  visor: HTMLDivElement,
  prancheta: HTMLDivElement,
  x: number,
  y: number,
  behavior: ScrollBehavior = "auto",
) {
  visor.scrollTo({
    left: prancheta.offsetLeft + x - visor.clientWidth / 2,
    top: prancheta.offsetTop + y - visor.clientHeight / 2,
    behavior,
  });
}

// usa o mesmo limite de tela do menu do portal
const consultaTelaCelular = "(max-width: 780px)";
function acompanharTelaCelular(notificar: () => void) {
  const tela = window.matchMedia(consultaTelaCelular);
  tela.addEventListener("change", notificar);
  return () => tela.removeEventListener("change", notificar);
}

// mostra a chave e permite navegar ou editar os confrontos
export default function ChaveInterativa({
  fases,
  partidas,
  faseInicialNoCelular,
  abrirJogo,
  trocar,
  desabilitado = false,
  erro,
  sucesso,
}: {
  fases: FasePublica[];
  partidas: JogoPublico[];
  faseInicialNoCelular?: string;
  abrirJogo?: (jogo: JogoPublico) => void;
  trocar?: (origem: PosicaoChave, destino: PosicaoChave) => void;
  desabilitado?: boolean;
  erro?: string;
  sucesso?: string;
}) {
  // guarda a busca, a navegação e a posição escolhida
  const filtroId = useId();
  const visor = useRef<HTMLDivElement>(null);
  const prancheta = useRef<HTMLDivElement>(null);
  const atalhos = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ x: number; y: number; esquerda: number; topo: number } | null>(null);
  const [medidasVisor, setMedidasVisor] = useState<{ largura: number; altura: number } | null>(
    null,
  );
  const [zoomEscolhido, setZoomEscolhido] = useState<number | null>(null);
  const [faseEscolhida, setFaseEmFoco] = useState<string | null>();
  const [modoEscolhido, setModo] = useState<ModoChave | null>(null);
  const inicioNoCelular = useSyncExternalStore(
    acompanharTelaCelular,
    () => faseInicialNoCelular !== undefined && window.matchMedia(consultaTelaCelular).matches,
    () => false,
  );
  const modo = modoEscolhido ?? (inicioNoCelular ? "um-lado" : "dois-lados");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<PosicaoChave | null>(null);
  // mantém a mesma chave quando a tela cheia abre ou fecha
  const [telaCheia, setTelaCheia] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const botaoTelaCheia = useRef<HTMLButtonElement>(null);
  const estavaEmTelaCheia = useRef(false);
  const centroDoVisor = useRef<{ x: number; y: number } | null>(null);
  // abre o visor antes de medir o espaço e recupera o foco ao sair
  useLayoutEffect(() => {
    if (telaCheia && !dialogo.current?.open) dialogo.current?.showModal();
    else if (estavaEmTelaCheia.current) botaoTelaCheia.current?.focus({ preventScroll: true });
    estavaEmTelaCheia.current = telaCheia;
  }, [telaCheia]);

  // usa o mesmo ponto da chave ao ampliar ou mudar o tamanho da tela
  function guardarCentro() {
    const elemento = visor.current;
    const quadro = prancheta.current;
    if (!elemento || !quadro) return;
    centroDoVisor.current = {
      x: (elemento.scrollLeft + elemento.clientWidth / 2 - quadro.offsetLeft) / zoom,
      y: (elemento.scrollTop + elemento.clientHeight / 2 - quadro.offsetTop) / zoom,
    };
  }

  function alternarTelaCheia() {
    if (zoomEscolhido !== null) guardarCentro();
    setTelaCheia((atual) => !atual);
  }
  // organiza as fases e calcula onde cada jogo aparece
  const colunas = useMemo(
    () =>
      [...fases]
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map((fase) => ({
          ...fase,
          jogos: [
            ...(fase.partidas || fase.jogos || partidas.filter((jogo) => jogo.faseId === fase.id)),
          ].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
        })),
    [fases, partidas],
  );
  const desenho = useMemo(() => posicionarChave(colunas, modo), [colunas, modo]);
  // mantém a leitura e o teclado na mesma ordem dos cartões na tela
  const colunasOrganizadas = useMemo(
    () =>
      colunas
        .flatMap((fase, indiceFase) => {
          const porPosicao = new Map<
            number,
            { jogos: JogoPublico[]; avancos: typeof desenho.avancos }
          >();
          function grupoNaPosicao(x: number) {
            const grupo = porPosicao.get(x) ?? { jogos: [], avancos: [] };
            porPosicao.set(x, grupo);
            return grupo;
          }
          for (const jogo of fase.jogos) {
            const { x } = desenho.posicoes.get(jogo)!;
            grupoNaPosicao(x).jogos.push(jogo);
          }
          for (const avanco of desenho.avancos) {
            if (avanco.indiceFase === indiceFase) grupoNaPosicao(avanco.x).avancos.push(avanco);
          }
          if (!porPosicao.size) grupoNaPosicao(desenho.colunaX(indiceFase));
          return Array.from(porPosicao, ([x, { jogos, avancos }]) => {
            const nome = fase.nome || `Fase ${indiceFase + 1}`;
            const lado = x > desenho.colunaX(desenho.colunaFinal) ? "direita" : "esquerda";
            const mostraLado = desenho.espelhada && indiceFase < desenho.colunaFinal;
            const rotulo = mostraLado ? `${nome} · ${lado}` : nome;
            jogos.sort((a, b) => desenho.posicoes.get(a)!.y - desenho.posicoes.get(b)!.y);
            const primeiro = jogos[0];
            const ultimo = jogos.at(-1);
            const topo = Math.min(
              primeiro ? desenho.posicoes.get(primeiro)!.y : Infinity,
              ...avancos.map((avanco) => avanco.y - desenho.alturaAvanco / 2),
            );
            const base = Math.max(
              ultimo ? desenho.posicoes.get(ultimo)!.y + desenho.alturaJogo : -Infinity,
              ...avancos.map((avanco) => avanco.y + desenho.alturaAvanco / 2),
            );
            const foco = Number.isFinite(topo)
              ? {
                  x: x + desenho.larguraJogo / 2,
                  y: (topo + base) / 2 + desenho.topoFases,
                  altura: base - topo,
                }
              : null;
            const confrontos = jogos.filter((jogo) => jogo.formaVitoria !== "bye").length;
            const folgas = jogos.length - confrontos + avancos.length;
            const chave = mostraLado ? `${indiceFase}-${lado}` : String(indiceFase);
            return { chave, indiceFase, x, nome, rotulo, jogos, avancos, foco, folgas, confrontos };
          });
        })
        .sort((a, b) => a.x - b.x),
    [colunas, desenho],
  );
  const jogos = colunas.flatMap((fase) => fase.jogos);

  const largura = desenho.largura;
  const altura = desenho.altura + desenho.topoFases;
  // usa o mesmo enquadramento dos atalhos quando a chave pública abre no celular
  const faseInicial =
    inicioNoCelular && faseEscolhida === undefined
      ? indiceFaseParaAbrir(colunas, faseInicialNoCelular ?? "")
      : -1;
  const faseEmFoco = faseInicial >= 0 ? String(faseInicial) : faseEscolhida;
  const foco = colunasOrganizadas.find((fase) => fase.chave === faseEmFoco)?.foco;
  const zoomEncaixe = medidasVisor
    ? calcularZoomDaChave(medidasVisor.largura, medidasVisor.altura, largura, altura)
    : 1;
  const zoomFase =
    foco && medidasVisor
      ? calcularZoomDaChave(
          medidasVisor.largura,
          medidasVisor.altura,
          desenho.larguraJogo,
          foco.altura,
        )
      : zoomEncaixe;
  const zoom = Math.max(zoomEncaixe, zoomEscolhido ?? zoomFase);
  const temColunas = colunas.length > 0;

  // reserva espaço para centralizar a fase mesmo quando a chave cabe na largura
  const margemParaFoco = (metadeVisor: number, distancia: number) =>
    Math.max(margemDaChave, metadeVisor - distancia * zoom);
  const espacoFoco =
    foco && medidasVisor
      ? {
          esquerda: margemParaFoco(medidasVisor.largura / 2, foco.x),
          direita: margemParaFoco(medidasVisor.largura / 2, largura - foco.x),
          topo: margemParaFoco(medidasVisor.altura / 2, foco.y),
          base: margemParaFoco(medidasVisor.altura / 2, altura - foco.y),
        }
      : null;

  // mede o visor para enquadrar a chave ou a fase escolhida
  useLayoutEffect(() => {
    const elemento = visor.current;
    if (!elemento) return;
    function medir() {
      const largura = elemento?.clientWidth ?? 0;
      const altura = elemento?.clientHeight ?? 0;
      if (!largura || !altura) return;
      setMedidasVisor((atual) =>
        atual?.largura === largura && atual.altura === altura ? atual : { largura, altura },
      );
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [telaCheia, temColunas]);

  // navega depois de aplicar o zoom ao desenho
  const focoX = foco?.x;
  const focoY = foco?.y;
  useLayoutEffect(() => {
    const centro =
      focoX !== undefined && focoY !== undefined ? { x: focoX, y: focoY } : centroDoVisor.current;
    if (!visor.current || !prancheta.current || !centro) return;
    rolarParaPonto(visor.current, prancheta.current, centro.x * zoom, centro.y * zoom);
    centroDoVisor.current = null;
  }, [focoX, focoY, zoom, telaCheia, medidasVisor]);

  // deixa o atalho selecionado visível sem mover a página
  useLayoutEffect(() => {
    const barra = atalhos.current;
    const selecionado = barra?.querySelector("button[aria-pressed='true']");
    if (!inicioNoCelular || !barra || !selecionado) return;
    const { left, width } = selecionado.getBoundingClientRect();
    barra.scrollLeft += left - barra.getBoundingClientRect().left - (barra.clientWidth - width) / 2;
  }, [faseEmFoco, inicioNoCelular, telaCheia]);

  // o menor zoom e o botão central sempre voltam para a chave inteira
  function enquadrarChave() {
    centroDoVisor.current = null;
    setFaseEmFoco(null);
    setZoomEscolhido(null);
    visor.current?.scrollTo({ left: 0, top: 0 });
  }

  function ajustarZoom(fator: number) {
    const proximo = Math.min(1.4, zoom * fator);
    if (proximo <= zoomEncaixe) enquadrarChave();
    else {
      guardarCentro();
      setFaseEmFoco(null);
      setZoomEscolhido(proximo);
    }
  }

  // encontra as turmas mesmo com diferenças na escrita
  const termo = normalizarBusca(busca);
  const corresponde = (jogo: JogoPublico) =>
    !termo || normalizarBusca(`${nomeEquipe(jogo, "a")} ${nomeEquipe(jogo, "b")}`).includes(termo);
  const mover = (distancia: number) =>
    visor.current?.scrollBy({
      left: distancia,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });

  // enquadra todos os cartões da fase e centraliza a coluna escolhida
  function irParaFase(fase: (typeof colunasOrganizadas)[number]) {
    if (!fase.foco) return;
    if (fase.chave === faseEmFoco && visor.current && prancheta.current) {
      rolarParaPonto(visor.current, prancheta.current, fase.foco.x * zoom, fase.foco.y * zoom);
      return;
    }
    centroDoVisor.current = null;
    setZoomEscolhido(null);
    setFaseEmFoco(fase.chave);
  }

  // troca as duas posições escolhidas pelo toque ou teclado
  function escolher(posicao: PosicaoChave) {
    if (desabilitado) return;
    if (!selecionada) {
      setSelecionada(posicao);
      return;
    }
    if (selecionada.partidaId !== posicao.partidaId || selecionada.posicao !== posicao.posicao)
      trocar?.(selecionada, posicao);
    setSelecionada(null);
  }

  if (!colunas.length)
    return (
      <div className="ic-vazio">
        <span aria-hidden="true">🏆</span>
        <h3>Chave ainda não publicada</h3>
        <p>Os confrontos aparecerão aqui assim que a organização publicar.</p>
      </div>
    );

  const conteudo = (
    <section className="ic-chave" aria-label="Chave interativa do campeonato">
      {/* abre a mesma chave em tela cheia */}
      <div className="ic-tela-cheia-barra">
        <button
          ref={botaoTelaCheia}
          type="button"
          className="pev-botao"
          onClick={alternarTelaCheia}
        >
          {telaCheia ? "Sair da tela cheia ↙" : "Abrir em tela cheia ↗"}
        </button>
      </div>
      {telaCheia && (erro || sucesso) && (
        <p
          className={`ic-chave-aviso ${erro ? "ic-chave-aviso-erro" : ""}`}
          role={erro ? "alert" : "status"}
        >
          {erro || sucesso}
        </p>
      )}
      {/* mostra a busca e as instruções da chave */}
      <div className="ic-chave-topo">
        <div>
          <span className="ic-sobretitulo">DO PRIMEIRO JOGO À FINAL</span>
          <h2>Chave do campeonato</h2>
          <p>
            {trocar
              ? "Arraste uma turma para trocar posições. No celular ou teclado, selecione duas posições."
              : "Explore as fases e toque em um jogo para ver os detalhes."}
          </p>
        </div>
        <label className="ic-busca" htmlFor={filtroId}>
          <span>Encontre sua turma</span>
          <input
            id={filtroId}
            type="search"
            placeholder="Ex.: 2DS"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
      </div>
      {/* permite pular de fase e ajustar o tamanho dos cartões */}
      <div className="ic-ferramentas">
        <div className="ic-atalhos-fases" ref={atalhos} role="group" aria-label="Ir para uma fase">
          {colunasOrganizadas
            .filter((fase) => fase.foco)
            .map((fase) => (
              <button
                type="button"
                key={fase.chave}
                aria-pressed={faseEmFoco === fase.chave}
                onClick={() => irParaFase(fase)}
              >
                {fase.rotulo}
              </button>
            ))}
        </div>
        <div className="ic-controles-visualizacao">
          <div className="ic-zoom">
            <button
              type="button"
              aria-label="Diminuir zoom"
              disabled={zoom <= zoomEncaixe}
              onClick={() => ajustarZoom(1 / 1.25)}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Enquadrar a chave inteira"
              title="Enquadrar a chave inteira"
              onClick={enquadrarChave}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Aumentar zoom"
              disabled={zoom >= 1.4}
              onClick={() => ajustarZoom(1.25)}
            >
              +
            </button>
          </div>
          {telaCheia && (
            <select
              aria-label="Visualização da chave"
              value={modo}
              onChange={(evento) => {
                enquadrarChave();
                setModo(evento.target.value === "um-lado" ? "um-lado" : "dois-lados");
              }}
            >
              <option value="dois-lados">Dois lados</option>
              <option value="um-lado">Um lado</option>
            </select>
          )}
        </div>
      </div>
      {selecionada && (
        <div className="ic-selecao" role="status">
          Selecione a posição de destino para trocar as turmas.
          <button type="button" onClick={() => setSelecionada(null)}>
            Cancelar troca
          </button>
        </div>
      )}
      {termo && (
        <p className="ic-resultado-busca" role="status">
          {jogos.filter(corresponde).length} jogo(s) com “{busca}”
        </p>
      )}
      {/* move a chave quando a pessoa arrasta o fundo */}
      <div
        className={desenho.espelhada ? "ic-visor ic-visor-espelhado" : "ic-visor"}
        ref={visor}
        style={telaCheia ? undefined : { height: altura + margemDaChave * 2 + 2 }}
        tabIndex={0}
        role="region"
        aria-label="Chave com rolagem horizontal e vertical. Use as setas ou arraste o fundo."
        onPointerDown={(e) => {
          if (
            e.pointerType !== "mouse" ||
            e.button !== 0 ||
            (e.target as HTMLElement).closest("button, input")
          )
            return;
          const elemento = e.currentTarget;
          arraste.current = {
            x: e.clientX,
            y: e.clientY,
            esquerda: elemento.scrollLeft,
            topo: elemento.scrollTop,
          };
          elemento.setPointerCapture(e.pointerId);
          elemento.classList.add("arrastando");
        }}
        onPointerMove={(e) => {
          if (!arraste.current) return;
          e.currentTarget.scrollLeft = arraste.current.esquerda - (e.clientX - arraste.current.x);
          e.currentTarget.scrollTop = arraste.current.topo - (e.clientY - arraste.current.y);
        }}
        onPointerUp={(e) => {
          arraste.current = null;
          e.currentTarget.classList.remove("arrastando");
        }}
        onPointerCancel={(e) => {
          arraste.current = null;
          e.currentTarget.classList.remove("arrastando");
        }}
      >
        <div
          className="ic-area-desenho"
          style={{
            width:
              largura * zoom +
              (espacoFoco ? espacoFoco.esquerda + espacoFoco.direita : margemDaChave * 2),
            height:
              altura * zoom + (espacoFoco ? espacoFoco.topo + espacoFoco.base : margemDaChave * 2),
          }}
        >
          <div
            className="ic-prancheta"
            ref={prancheta}
            style={{
              left:
                espacoFoco?.esquerda ??
                `max(${margemDaChave}px, calc((100% - ${largura * zoom}px) / 2))`,
              top:
                espacoFoco?.topo ??
                `max(${margemDaChave}px, calc((100% - ${altura * zoom}px) / 2))`,
              width: largura,
              height: altura,
              transform: `scale(${zoom})`,
            }}
          >
            {/* liga cada jogo ao destino do vencedor */}
            <svg className="ic-conexoes" width={largura} height={altura} aria-hidden="true">
              <g transform={`translate(0 ${desenho.topoFases})`}>
                {desenho.conexoes.map((conexao, indice) => (
                  <path
                    key={conexao.origem.id ?? indice}
                    className={`${conexao.pulaFase && !desenho.espelhada ? "ic-conexao-folga" : ""} ${termo && corresponde(conexao.origem) ? "ic-conexao-destaque" : ""}`}
                    d={conexao.caminho}
                  />
                ))}
              </g>
            </svg>
            {colunasOrganizadas.map((fase) => (
              <section key={fase.chave} aria-label={fase.rotulo}>
                <h3
                  className={`ic-fase-titulo ${fase.indiceFase === desenho.colunaFinal ? "ic-fase-final" : ""}`}
                  style={{ left: fase.x }}
                >
                  {fase.indiceFase === desenho.colunaFinal && <span aria-hidden="true">🏆 </span>}
                  {fase.nome}
                  <small>
                    {[
                      (fase.confrontos || !fase.folgas) &&
                        `${fase.confrontos} ${fase.confrontos === 1 ? "jogo" : "jogos"}`,
                      fase.folgas && `${fase.folgas} ${fase.folgas === 1 ? "folga" : "folgas"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </h3>
                {/* mostra a folga na coluna pela qual o vencedor já está classificado */}
                {fase.avancos.map((avanco, indice) => (
                  <span
                    className={`ic-avanco-direto ${termo && !corresponde(avanco.origem) ? "ic-jogo-apagado" : ""}`}
                    key={avanco.origem.id ?? indice}
                    style={{
                      left: avanco.x + desenho.larguraJogo / 2,
                      top: avanco.y + desenho.topoFases,
                      height: desenho.alturaAvanco,
                    }}
                  >
                    Avanço direto
                  </span>
                ))}
                {fase.jogos.map((jogo, indice) => {
                  // destaca o resultado e identifica a folga nas próximas fases
                  const ponto = desenho.posicoes.get(jogo)!;
                  const indiceDestino = colunas.findIndex((faseDestino) =>
                    faseDestino.jogos.some((destino) => destino.id === jogo.proximaPartidaId),
                  );
                  const avancaPorFolga = indiceDestino > fase.indiceFase + 1;
                  const temPlacar =
                    jogo.placarPublicado === true &&
                    jogo.placarA !== null &&
                    jogo.placarA !== undefined &&
                    jogo.placarB !== null &&
                    jogo.placarB !== undefined;
                  const folga = jogo.formaVitoria === "bye";
                  const editarPosicoes = Boolean(trocar && fase.indiceFase === 0);
                  // monta o cartão com turmas, placar e data
                  const conteudo = (
                    <>
                      <div className="ic-jogo-cabecalho">
                        <span>JOGO {jogo.ordem ?? indice + 1}</span>
                        <span className={jogo.situacao === "em_andamento" ? "ic-ao-vivo" : ""}>
                          {folga ? "Avanço direto" : rotuloSituacao(jogo.situacao)}
                        </span>
                      </div>
                      {(["a", "b"] as const).map((lado) => {
                        const nome = nomeEquipe(jogo, lado);
                        const id = lado === "a" ? jogo.participanteAId : jogo.participanteBId;
                        const ganhou = jogo.vencedorId
                          ? jogo.vencedorId === id
                          : Boolean(jogo.vencedorNome && jogo.vencedorNome === nome);
                        const posicao = { partidaId: jogo.id!, posicao: lado };
                        const ativa =
                          selecionada?.partidaId === jogo.id && selecionada?.posicao === lado;
                        const miolo = (
                          <>
                            <span className="ic-equipe-inicial" aria-hidden="true">
                              {nome === "A definir" ? "·" : nome.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="ic-equipe-nome">{folga && !id ? "Folga" : nome}</span>
                            <strong>
                              {temPlacar
                                ? lado === "a"
                                  ? jogo.placarA
                                  : jogo.placarB
                                : ganhou
                                  ? "✓"
                                  : "—"}
                            </strong>
                          </>
                        );
                        // permite trocar as posições antes dos jogos começarem
                        return editarPosicoes ? (
                          <button
                            type="button"
                            className={`ic-equipe ${ganhou ? "ic-ganhador" : ""} ${ativa ? "ic-posicao-selecionada" : ""}`}
                            key={lado}
                            disabled={desabilitado}
                            aria-label={`Selecionar ${nome}, posição ${lado.toUpperCase()}, jogo ${jogo.ordem}`}
                            aria-pressed={ativa}
                            draggable={!desabilitado && Boolean(id)}
                            onClick={() => escolher(posicao)}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "application/gecep-chave",
                                JSON.stringify(posicao),
                              );
                              e.dataTransfer.effectAllowed = "move";
                              setSelecionada(posicao);
                            }}
                            onDragOver={(e) => {
                              if (e.dataTransfer.types.includes("application/gecep-chave")) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              try {
                                const origem = JSON.parse(
                                  e.dataTransfer.getData("application/gecep-chave"),
                                ) as PosicaoChave;
                                if (
                                  typeof origem.partidaId === "number" &&
                                  (origem.posicao === "a" || origem.posicao === "b")
                                )
                                  trocar?.(origem, posicao);
                              } catch {
                                /* ignora dados que não vieram da chave */
                              } finally {
                                setSelecionada(null);
                              }
                            }}
                            onDragEnd={() => setSelecionada(null)}
                          >
                            {miolo}
                          </button>
                        ) : (
                          <div key={lado} className={`ic-equipe ${ganhou ? "ic-ganhador" : ""}`}>
                            {miolo}
                          </div>
                        );
                      })}
                      <div className="ic-jogo-rodape">
                        <span>
                          {folga
                            ? "Classificado para a próxima fase"
                            : [formatarData(jogo.data), jogo.horario].filter(Boolean).join(" · ") ||
                              "Data a definir"}
                          {avancaPorFolga && (
                            <small className="ic-avanco-folga">
                              Vencedor tem folga e vai direto para {colunas[indiceDestino].nome}
                            </small>
                          )}
                        </span>
                        {!editarPosicoes && <span aria-hidden="true">↗</span>}
                      </div>
                    </>
                  );
                  return (
                    <article
                      className={`ic-jogo ${termo && !corresponde(jogo) ? "ic-jogo-apagado" : ""} ${termo && corresponde(jogo) ? "ic-jogo-encontrado" : ""}`}
                      style={{
                        left: ponto.x,
                        top: ponto.y + desenho.topoFases,
                        height: desenho.alturaJogo,
                      }}
                      key={jogo.id ?? indice}
                    >
                      {editarPosicoes ? (
                        <>
                          {conteudo}
                          {abrirJogo && (
                            <button
                              type="button"
                              className="ic-editar-jogo"
                              onClick={() => abrirJogo(jogo)}
                              disabled={desabilitado}
                            >
                              Editar jogo e resultado ↗
                            </button>
                          )}
                        </>
                      ) : abrirJogo ? (
                        <button
                          type="button"
                          className="ic-abrir-jogo"
                          onClick={() => abrirJogo(jogo)}
                          aria-label={`${nomeEquipe(jogo, "a")} contra ${nomeEquipe(jogo, "b")}. Abrir detalhes do jogo`}
                        >
                          {conteudo}
                        </button>
                      ) : (
                        conteudo
                      )}
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      </div>
      <div className="ic-chave-base">
        <span>
          <i /> Vencedor / classificado
        </span>
        <span>Arraste o fundo para explorar</span>
        <div>
          <button
            type="button"
            aria-label="Mover para a esquerda"
            onClick={() => mover(-desenho.passoColuna * zoom)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Mover para a direita"
            onClick={() => mover(desenho.passoColuna * zoom)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
  // fecha a tela cheia sem descartar as alterações
  return telaCheia ? (
    <dialog
      className="ic-chave-tela-cheia"
      ref={dialogo}
      aria-label="Chave do campeonato em tela cheia"
      onCancel={(e) => {
        e.preventDefault();
        alternarTelaCheia();
      }}
    >
      {conteudo}
    </dialog>
  ) : (
    conteudo
  );
}
