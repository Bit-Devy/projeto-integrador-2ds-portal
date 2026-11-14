"use client";

// usa os controles da tela e guarda as alterações da navegação
import { useEffect, useId, useMemo, useRef, useState } from "react";
// usa os mesmos dados da chave pública e do painel
import type { FasePublica, JogoPublico } from "../eventos/modelo-publico";
// prepara os textos que aparecem nos jogos
import { formatarData, normalizarBusca, rotuloSituacao, textoParticipante } from "../eventos/modelo-publico";
// calcula a posição dos cartões e das linhas
import { posicionarChave, type ModoChave } from "../eventos/interclasse-utilitarios";

// guarda o jogo e o lado escolhido para a troca
export type PosicaoChave = { partidaId: number; posicao: "a" | "b" };

// mostra o nome da turma ou avisa que ela ainda será definida
export function nomeEquipe(jogo: JogoPublico, lado: "a" | "b") {
  return (lado === "a" ? jogo.participanteANome || jogo.nomeParticipanteA || textoParticipante(jogo.participanteA) : jogo.participanteBNome || jogo.nomeParticipanteB || textoParticipante(jogo.participanteB)) || "A definir";
}

// move o visor para o centro de uma fase
function rolarParaColuna(visor: HTMLDivElement, x: number, top: number, behavior: ScrollBehavior = "auto") {
  const margem = visor.querySelector<HTMLElement>(".ic-prancheta")?.offsetLeft ?? 24;
  visor.scrollTo({ left: margem + x - visor.clientWidth / 2, top, behavior });
}

// mostra a chave e permite navegar ou editar os confrontos
export default function ChaveInterativa({ fases, partidas, abrirJogo, trocar, desabilitado = false, erro, sucesso }: {
  fases: FasePublica[];
  partidas: JogoPublico[];
  abrirJogo?: (jogo: JogoPublico) => void;
  trocar?: (origem: PosicaoChave, destino: PosicaoChave) => void;
  desabilitado?: boolean;
  erro?: string;
  sucesso?: string;
}) {
  // guarda a busca, a navegação e a posição escolhida
  const filtroId = useId();
  const visor = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ x: number; y: number; esquerda: number; topo: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [modo, setModo] = useState<ModoChave>("dois-lados");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<PosicaoChave | null>(null);
  // mantém a mesma chave quando a tela cheia abre ou fecha
  const [telaCheia, setTelaCheia] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const botaoTelaCheia = useRef<HTMLButtonElement>(null);
  const estavaEmTelaCheia = useRef(false);
  const rolagem = useRef({ left: 0, top: 0 });
  // recupera o foco e a rolagem ao voltar da tela cheia
  useEffect(() => {
    if (telaCheia) dialogo.current?.showModal();
    else if (estavaEmTelaCheia.current) botaoTelaCheia.current?.focus({ preventScroll: true });
    const elemento = visor.current;
    if (elemento && (telaCheia || estavaEmTelaCheia.current)) {
      elemento.scrollTo({ left: rolagem.current.left - elemento.clientWidth / 2, top: rolagem.current.top });
    }
    estavaEmTelaCheia.current = telaCheia;
  }, [telaCheia]);
  // salva a posição antes de mudar o tamanho da tela
  function alternarTelaCheia() {
    const elemento = visor.current;
    rolagem.current = { left: elemento ? elemento.scrollLeft + elemento.clientWidth / 2 : 0, top: elemento?.scrollTop ?? 0 };
    setTelaCheia((atual) => !atual);
  }
  // organiza as fases e calcula onde cada jogo aparece
  const colunas = useMemo(() => [...fases].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((fase) => ({
    ...fase, jogos: [...(fase.partidas || fase.jogos || partidas.filter((jogo) => jogo.faseId === fase.id))].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
  })), [fases, partidas]);
  const desenho = useMemo(() => posicionarChave(colunas, modo), [colunas, modo]);
  // mantém a leitura e o teclado na mesma ordem dos cartões na tela
  const colunasOrganizadas = useMemo(() => colunas.flatMap((fase, indiceFase) => {
    const porPosicao = new Map<number, JogoPublico[]>();
    for (const jogo of fase.jogos) {
      const { x } = desenho.posicoes.get(jogo)!;
      if (!porPosicao.has(x)) porPosicao.set(x, []);
      porPosicao.get(x)!.push(jogo);
    }
    if (!porPosicao.size) porPosicao.set(desenho.colunaX(indiceFase), []);
    return Array.from(porPosicao, ([x, jogos]) => ({
      indiceFase, x, nome: fase.nome,
      rotulo: porPosicao.size > 1 ? `${fase.nome} · ${x > desenho.colunaX(desenho.colunaFinal) ? "direita" : "esquerda"}` : fase.nome,
      jogos: jogos.sort((a, b) => desenho.posicoes.get(a)!.y - desenho.posicoes.get(b)!.y),
    }));
  }).sort((a, b) => a.x - b.x), [colunas, desenho]);
  const jogos = colunas.flatMap((fase) => fase.jogos);

  // enquadra a final na visão dos dois lados ao abrir ou trocar o formato
  const final = colunasOrganizadas.find((fase) => fase.indiceFase === desenho.colunaFinal)?.jogos[0];
  const pontoFinal = final && desenho.posicoes.get(final);
  const centroFinal = desenho.espelhada && pontoFinal ? pontoFinal.x + desenho.larguraJogo / 2 : null;
  const alturaFinal = pontoFinal ? pontoFinal.y + desenho.topoFases + desenho.alturaJogo / 2 : 0;
  const largura = desenho.largura;
  const zoomAtual = useRef(zoom);
  useEffect(() => {
    zoomAtual.current = zoom;
  }, [zoom]);
  useEffect(() => {
    const elemento = visor.current;
    if (!elemento) return;
    if (centroFinal === null) elemento.scrollTo({ left: 0, top: 0 });
    else rolarParaColuna(elemento, centroFinal * zoomAtual.current, 24 + alturaFinal * zoomAtual.current - elemento.clientHeight / 2);
  }, [centroFinal, alturaFinal, largura, modo]);
  // encontra as turmas mesmo com diferenças na escrita
  const termo = normalizarBusca(busca);
  const corresponde = (jogo: JogoPublico) => !termo || normalizarBusca(`${nomeEquipe(jogo, "a")} ${nomeEquipe(jogo, "b")}`).includes(termo);
  const mover = (distancia: number) => visor.current?.scrollBy({ left: distancia, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  // mostra o centro da fase escolhida sem deixar os jogos fora da tela
  function irParaFase(fase: (typeof colunasOrganizadas)[number]) {
    const elemento = visor.current;
    if (!elemento || !fase.jogos.length) return;
    const primeiro = desenho.posicoes.get(fase.jogos[0])!.y;
    const ultimo = desenho.posicoes.get(fase.jogos.at(-1)!)!.y + desenho.alturaJogo;
    rolarParaColuna(elemento, (fase.x + desenho.larguraJogo / 2) * zoom,
      Math.max(0, ((primeiro + ultimo) / 2 + desenho.topoFases) * zoom + 24 - elemento.clientHeight / 2),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  }

  // troca as duas posições escolhidas pelo toque ou teclado
  function escolher(posicao: PosicaoChave) {
    if (desabilitado) return;
    if (!selecionada) { setSelecionada(posicao); return; }
    if (selecionada.partidaId !== posicao.partidaId || selecionada.posicao !== posicao.posicao) trocar?.(selecionada, posicao);
    setSelecionada(null);
  }

  if (!colunas.length) return <div className="ic-vazio"><span aria-hidden="true">🏆</span><h3>Chave ainda não publicada</h3><p>Os confrontos aparecerão aqui assim que a organização publicar.</p></div>;

  const conteudo = <section className="ic-chave" aria-label="Chave interativa do campeonato">
    {/* abre a mesma chave em tela cheia */}
    <div className="ic-tela-cheia-barra">
      <button ref={botaoTelaCheia} type="button" className="pev-botao" onClick={alternarTelaCheia}>{telaCheia ? "Sair da tela cheia ↙" : "Abrir em tela cheia ↗"}</button>
    </div>
    {telaCheia && (erro || sucesso) && <p className={`ic-chave-aviso ${erro ? "ic-chave-aviso-erro" : ""}`} role={erro ? "alert" : "status"}>{erro || sucesso}</p>}
    {/* mostra a busca e as instruções da chave */}
    <div className="ic-chave-topo"><div><span className="ic-sobretitulo">DO PRIMEIRO JOGO À FINAL</span><h2>Chave do campeonato</h2><p>{trocar ? "Arraste uma turma para trocar posições. No celular ou teclado, selecione duas posições." : "Explore as fases e toque em um jogo para ver os detalhes."}</p></div><label className="ic-busca" htmlFor={filtroId}><span>Encontre sua turma</span><input id={filtroId} type="search" placeholder="Ex.: 2DS" value={busca} onChange={(e) => setBusca(e.target.value)} /></label></div>
    {/* permite pular de fase e ajustar o tamanho dos cartões */}
    <div className="ic-ferramentas">
      <div className="ic-atalhos-fases" role="group" aria-label="Ir para uma fase">{colunasOrganizadas.filter((fase) => fase.jogos.length).map((fase) => <button type="button" key={`${fase.indiceFase}-${fase.x}`} onClick={() => irParaFase(fase)}>{fase.rotulo}</button>)}</div>
      <div className="ic-controles-visualizacao">
        <div className="ic-zoom">
          <button type="button" aria-label="Diminuir zoom" disabled={zoom <= 0.6} onClick={() => setZoom((atual) => Math.max(0.6, +(atual - 0.1).toFixed(1)))}>−</button>
          <button type="button" aria-label="Restaurar zoom e posição" onClick={() => {
            setZoom(1);
            requestAnimationFrame(() => {
              const elemento = visor.current;
              if (!elemento) return;
              if (centroFinal === null) elemento.scrollTo({ left: 0, top: 0 });
              else rolarParaColuna(elemento, centroFinal, 24 + alturaFinal - elemento.clientHeight / 2);
            });
          }}>{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Aumentar zoom" disabled={zoom >= 1.4} onClick={() => setZoom((atual) => Math.min(1.4, +(atual + 0.1).toFixed(1)))}>+</button>
        </div>
        {telaCheia && <select aria-label="Visualização da chave" value={modo} onChange={(evento) => setModo(evento.target.value === "um-lado" ? "um-lado" : "dois-lados")}>
          <option value="dois-lados">Dois lados</option>
          <option value="um-lado">Um lado</option>
        </select>}
      </div>
    </div>
    {selecionada && <div className="ic-selecao" role="status">Selecione a posição de destino para trocar as turmas.<button type="button" onClick={() => setSelecionada(null)}>Cancelar troca</button></div>}
    {termo && <p className="ic-resultado-busca" role="status">{jogos.filter(corresponde).length} jogo(s) com “{busca}”</p>}
    {/* move a chave quando a pessoa arrasta o fundo */}
    <div className="ic-visor" ref={visor} tabIndex={0} role="region" aria-label="Chave com rolagem horizontal e vertical. Use as setas ou arraste o fundo."
      onPointerDown={(e) => { if (e.pointerType !== "mouse" || e.button !== 0 || (e.target as HTMLElement).closest("button, input")) return; const elemento = e.currentTarget; arraste.current = { x: e.clientX, y: e.clientY, esquerda: elemento.scrollLeft, topo: elemento.scrollTop }; elemento.setPointerCapture(e.pointerId); elemento.classList.add("arrastando"); }}
      onPointerMove={(e) => { if (!arraste.current) return; e.currentTarget.scrollLeft = arraste.current.esquerda - (e.clientX - arraste.current.x); e.currentTarget.scrollTop = arraste.current.topo - (e.clientY - arraste.current.y); }}
      onPointerUp={(e) => { arraste.current = null; e.currentTarget.classList.remove("arrastando"); }}
      onPointerCancel={(e) => { arraste.current = null; e.currentTarget.classList.remove("arrastando"); }}>
      <div className="ic-area-desenho" style={{ width: desenho.largura * zoom + 48, height: (desenho.altura + desenho.topoFases + 24) * zoom + 48 }}>
        <div className="ic-prancheta" style={{ left: `max(24px, calc((100% - ${desenho.largura * zoom}px) / 2))`, width: desenho.largura, height: desenho.altura + desenho.topoFases + 24, transform: `scale(${zoom})` }}>
          {/* liga cada jogo ao destino do vencedor */}
          <svg className="ic-conexoes" width={desenho.largura} height={desenho.altura + desenho.topoFases + 24} aria-hidden="true"><g transform={`translate(0 ${desenho.topoFases})`}>{desenho.conexoes.map((conexao, indice) =>
            <path key={conexao.origem.id ?? indice} className={`${conexao.pulaFase ? "ic-conexao-folga" : ""} ${termo && corresponde(conexao.origem) ? "ic-conexao-destaque" : ""}`} d={conexao.caminho} />
          )}</g></svg>
          {colunasOrganizadas.map((fase) => <section key={`${fase.indiceFase}-${fase.x}`} aria-label={fase.rotulo}>
            <h3 className={`ic-fase-titulo ${fase.indiceFase === desenho.colunaFinal ? "ic-fase-final" : ""}`} style={{ left: fase.x }}>{fase.indiceFase === desenho.colunaFinal && <span aria-hidden="true">🏆 </span>}{fase.nome}<small>{fase.jogos.length} {fase.jogos.length === 1 ? "jogo" : "jogos"}</small></h3>
            {fase.jogos.map((jogo, indice) => {
              // destaca o resultado e identifica a folga nas próximas fases
              const ponto = desenho.posicoes.get(jogo)!;
              const indiceDestino = colunas.findIndex((faseDestino) => faseDestino.jogos.some((destino) => destino.id === jogo.proximaPartidaId));
              const avancaPorFolga = indiceDestino > fase.indiceFase + 1;
              const temPlacar = jogo.placarPublicado === true && jogo.placarA !== null && jogo.placarA !== undefined && jogo.placarB !== null && jogo.placarB !== undefined;
              const folga = jogo.formaVitoria === "bye";
              const editarPosicoes = Boolean(trocar && fase.indiceFase === 0);
              // monta o cartão com turmas, placar e data
              const conteudo = <><div className="ic-jogo-cabecalho"><span>JOGO {jogo.ordem ?? indice + 1}</span><span className={jogo.situacao === "em_andamento" ? "ic-ao-vivo" : ""}>{folga ? "Avanço direto" : rotuloSituacao(jogo.situacao)}</span></div>{(["a", "b"] as const).map((lado) => {
                const nome = nomeEquipe(jogo, lado);
                const id = lado === "a" ? jogo.participanteAId : jogo.participanteBId;
                const ganhou = jogo.vencedorId ? jogo.vencedorId === id : Boolean(jogo.vencedorNome && jogo.vencedorNome === nome);
                const posicao = { partidaId: jogo.id!, posicao: lado };
                const ativa = selecionada?.partidaId === jogo.id && selecionada?.posicao === lado;
                const miolo = <><span className="ic-equipe-inicial" aria-hidden="true">{nome === "A definir" ? "·" : nome.slice(0, 2).toUpperCase()}</span><span className="ic-equipe-nome">{folga && !id ? "Folga" : nome}</span><strong>{temPlacar ? lado === "a" ? jogo.placarA : jogo.placarB : ganhou ? "✓" : "—"}</strong></>;
                // permite trocar as posições antes dos jogos começarem
                return editarPosicoes ? <button type="button" className={`ic-equipe ${ganhou ? "ic-ganhador" : ""} ${ativa ? "ic-posicao-selecionada" : ""}`} key={lado} disabled={desabilitado} aria-label={`Selecionar ${nome}, posição ${lado.toUpperCase()}, jogo ${jogo.ordem}`} aria-pressed={ativa} draggable={!desabilitado && Boolean(id)}
                  onClick={() => escolher(posicao)} onDragStart={(e) => { e.dataTransfer.setData("application/gecep-chave", JSON.stringify(posicao)); e.dataTransfer.effectAllowed = "move"; setSelecionada(posicao); }}
                  onDragOver={(e) => { if (e.dataTransfer.types.includes("application/gecep-chave")) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                  onDrop={(e) => { e.preventDefault(); try { const origem = JSON.parse(e.dataTransfer.getData("application/gecep-chave")) as PosicaoChave; if (typeof origem.partidaId === "number" && (origem.posicao === "a" || origem.posicao === "b")) trocar?.(origem, posicao); } catch { /* ignora dados que não vieram da chave */ } finally { setSelecionada(null); } }} onDragEnd={() => setSelecionada(null)}>{miolo}</button> : <div key={lado} className={`ic-equipe ${ganhou ? "ic-ganhador" : ""}`}>{miolo}</div>;
              })}<div className="ic-jogo-rodape"><span>{folga ? "Classificado para a próxima fase" : [formatarData(jogo.data), jogo.horario].filter(Boolean).join(" · ") || "Data a definir"}{avancaPorFolga && <small className="ic-avanco-folga">Vencedor tem folga e vai direto para {colunas[indiceDestino].nome}</small>}</span>{!editarPosicoes && <span aria-hidden="true">↗</span>}</div></>;
              return <article className={`ic-jogo ${termo && !corresponde(jogo) ? "ic-jogo-apagado" : ""} ${termo && corresponde(jogo) ? "ic-jogo-encontrado" : ""}`} style={{ left: ponto.x, top: ponto.y + desenho.topoFases, height: desenho.alturaJogo }} key={jogo.id ?? indice}>
                {editarPosicoes ? <>{conteudo}{abrirJogo && <button type="button" className="ic-editar-jogo" onClick={() => abrirJogo(jogo)} disabled={desabilitado}>Editar jogo e resultado ↗</button>}</> : abrirJogo ? <button type="button" className="ic-abrir-jogo" onClick={() => abrirJogo(jogo)} aria-label={`${nomeEquipe(jogo, "a")} contra ${nomeEquipe(jogo, "b")}. Abrir detalhes do jogo`}>{conteudo}</button> : conteudo}
              </article>;
            })}
          </section>)}
        </div>
      </div>
    </div>
    <div className="ic-chave-base"><span><i /> Vencedor / classificado</span><span>Arraste o fundo para explorar</span><div><button type="button" aria-label="Mover para a esquerda" onClick={() => mover(-desenho.passoColuna * zoom)}>←</button><button type="button" aria-label="Mover para a direita" onClick={() => mover(desenho.passoColuna * zoom)}>→</button></div></div>
  </section>;
  // fecha a tela cheia sem descartar as alterações
  return telaCheia ? <dialog className="ic-chave-tela-cheia" ref={dialogo} aria-label="Chave do campeonato em tela cheia" onCancel={(e) => { e.preventDefault(); alternarTelaCheia(); }}>{conteudo}</dialog> : conteudo;
}
