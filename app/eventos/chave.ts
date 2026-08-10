import { ErroEventos } from "./validacao";

export type ParticipanteChave = {
  id: number;
  nome: string;
  posicaoInicial: number;
};

export type JogoPlanejado = {
  ordem: number;
  participanteA: ParticipanteChave | null;
  participanteB: ParticipanteChave | null;
  proximaFaseOrdem: number | null;
  proximaPartidaOrdem: number | null;
  proximaPosicao: "" | "a" | "b";
  vencedorAutomatico: ParticipanteChave | null;
};

export type FasePlanejada = {
  nome: string;
  ordem: number;
  tipo: "eliminatoria";
  jogos: JogoPlanejado[];
};

// prepara uma chave simples, preenchendo vagas livres sem inventar equipes
export function planejarChaveMataMata(participantesRecebidos: ParticipanteChave[]) {
  const participantes = [...participantesRecebidos]
    .sort((a, b) => a.posicaoInicial - b.posicaoInicial || a.id - b.id);
  if (participantes.length < 2) throw new ErroEventos("Adicione pelo menos dois participantes antes de gerar a chave.");
  if (participantes.length > 128) throw new ErroEventos("A chave aceita no máximo 128 participantes.");
  const ids = participantes.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new ErroEventos("A lista da chave contém participantes repetidos.");

  const tamanho = proximaPotenciaDeDois(participantes.length);
  // distribui as folgas em confrontos diferentes. Apenas completar o fim da
  // lista com vagas vazias criaria, por exemplo, um jogo "vaga x vaga" para
  // seis equipes numa chave de oito e deixaria uma semifinal sem classificado.
  const vagas: Array<ParticipanteChave | null> = [];
  const folgas = tamanho - participantes.length;
  let indiceParticipante = 0;
  for (let indiceJogo = 0; indiceJogo < tamanho / 2; indiceJogo += 1) {
    vagas.push(participantes[indiceParticipante++] ?? null);
    if (indiceJogo < folgas) vagas.push(null);
    else vagas.push(participantes[indiceParticipante++] ?? null);
  }

  const fases: FasePlanejada[] = [];
  let quantidadeJogos = tamanho / 2;
  let ordemFase = 1;
  while (quantidadeJogos >= 1) {
    const jogos: JogoPlanejado[] = [];
    for (let indice = 0; indice < quantidadeJogos; indice += 1) {
      const participanteA = ordemFase === 1 ? vagas[indice * 2] : null;
      const participanteB = ordemFase === 1 ? vagas[indice * 2 + 1] : null;
      const vencedorAutomatico = participanteA && !participanteB
        ? participanteA
        : participanteB && !participanteA
          ? participanteB
          : null;
      jogos.push({
        ordem: indice + 1,
        participanteA,
        participanteB,
        proximaFaseOrdem: quantidadeJogos > 1 ? ordemFase + 1 : null,
        proximaPartidaOrdem: quantidadeJogos > 1 ? Math.floor(indice / 2) + 1 : null,
        proximaPosicao: quantidadeJogos > 1 ? (indice % 2 === 0 ? "a" : "b") : "",
        vencedorAutomatico,
      });
    }
    fases.push({ nome: nomeDaFase(quantidadeJogos), ordem: ordemFase, tipo: "eliminatoria", jogos });
    quantidadeJogos /= 2;
    ordemFase += 1;
  }
  return fases;
}

// valida uma ligação manual entre duas partidas da mesma chave
export function validarLigacaoPartida(partidaId: number, proximaPartidaId: number | null, posicao: string) {
  if (!proximaPartidaId) {
    if (posicao) throw new ErroEventos("Remova a posição quando não houver próxima partida.");
    return;
  }
  if (partidaId === proximaPartidaId) throw new ErroEventos("Uma partida não pode avançar para ela mesma.");
  if (posicao !== "a" && posicao !== "b") throw new ErroEventos("Escolha a posição A ou B na próxima partida.");
}

function proximaPotenciaDeDois(valor: number) {
  let potencia = 1;
  while (potencia < valor) potencia *= 2;
  return potencia;
}

function nomeDaFase(quantidadeJogos: number) {
  if (quantidadeJogos === 1) return "Final";
  if (quantidadeJogos === 2) return "Semifinais";
  if (quantidadeJogos === 4) return "Quartas de final";
  if (quantidadeJogos === 8) return "Oitavas de final";
  if (quantidadeJogos === 16) return "Dezesseis avos de final";
  return `Fase de ${quantidadeJogos * 2}`;
}
