// usa os avisos de validação do painel
import { ErroEventos } from "./validacao";
// lê a série pelo nome cadastrado da turma
import { anoEscolarTurma } from "./interclasse-utilitarios";

// guarda os dados da turma que entra no sorteio
export type ParticipanteChave = {
  id: number;
  nome: string;
  nomeCadastrado?: string;
  posicaoInicial: number;
};

// guarda o confronto e o destino do vencedor
export type JogoPlanejado = {
  ordem: number;
  participanteA: ParticipanteChave | null;
  participanteB: ParticipanteChave | null;
  proximaFaseOrdem: number | null;
  proximaPartidaOrdem: number | null;
  proximaPosicao: "" | "a" | "b";
  vencedorAutomatico: ParticipanteChave | null;
};

// reúne os jogos da mesma rodada
export type FasePlanejada = {
  nome: string;
  ordem: number;
  tipo: "eliminatoria";
  jogos: JogoPlanejado[];
};

// guarda a turma ou o jogo que vai preencher uma vaga
type VagaChave = {
  participante: ParticipanteChave | null;
  origem: { jogo: JogoPlanejado } | null;
  anos: number[];
  folgas: number;
};

// conta quantos pares próximos podem jogar na mesma rodada
export function quantidadeParesProximos(nomes: string[], limite: number) {
  const anos = nomes.map(anoEscolarTurma).filter((ano): ano is number => ano !== null).sort((a, b) => a - b);
  let pares = 0;
  for (let indice = 0; indice < anos.length - 1; indice++) {
    if (anos[indice + 1] - anos[indice] <= limite) { pares++; indice++; }
  }
  return pares;
}

// sorteia os jogos e deixa só uma folga nas rodadas ímpares
export function planejarChaveMataMata(participantesRecebidos: ParticipanteChave[], diferencaMaximaAnos: number | null = null) {
  // confere a lista antes de montar os jogos
  const participantes = embaralhar(participantesRecebidos);
  if (participantes.length < 2) throw new ErroEventos("Adicione pelo menos dois participantes antes de gerar a chave.");
  if (participantes.length > 128) throw new ErroEventos("A chave aceita no máximo 128 participantes.");
  if (new Set(participantes.map((item) => item.id)).size !== participantes.length) throw new ErroEventos("A lista da chave contém participantes repetidos.");
  if (diferencaMaximaAnos !== null && (!Number.isInteger(diferencaMaximaAnos) || diferencaMaximaAnos < 1 || diferencaMaximaAnos > 3)) throw new ErroEventos("Escolha uma diferença máxima de 1 a 3 anos.");

  // usa a série cadastrada e mantém o nome público separado
  let vagas: VagaChave[] = participantes.map((participante) => {
    const ano = anoEscolarTurma(participante.nomeCadastrado ?? participante.nome);
    if (diferencaMaximaAnos !== null && ano === null) throw new ErroEventos(`Revise o nome cadastrado da turma ${participante.nomeCadastrado ?? participante.nome}. Use a série e de 1 a 3 letras, como 6A ou 2DS.`);
    return { participante, origem: null, anos: ano === null ? [] : [ano], folgas: 0 };
  });

  // aproxima as séries sem prender o sorteio quando o confronto for necessário
  if (diferencaMaximaAnos !== null) vagas = aproximarTurmas(vagas, diferencaMaximaAnos);
  const fases: FasePlanejada[] = [];
  while (vagas.length > 1) {
    const ordemFase = fases.length + 1;
    const quantidadeTurmas = vagas.length;
    const proximasVagas: VagaChave[] = [];
    const jogos: JogoPlanejado[] = [];

    // a folga das próximas rodadas pula direto para o jogo seguinte
    if (ordemFase > 1 && vagas.length % 2 === 1) {
      const indiceFolga = escolherFolga(vagas, diferencaMaximaAnos);
      const [vagaFolga] = vagas.splice(indiceFolga, 1);
      proximasVagas.push({ ...vagaFolga, folgas: vagaFolga.folgas + 1 });
    }

    // junta duas vagas por jogo e liga os vencedores ao seu destino
    for (let indice = 0; indice < vagas.length; indice += 2) {
      const vagaA = vagas[indice];
      const vagaB = vagas[indice + 1] ?? null;
      const jogo: JogoPlanejado = {
        ordem: jogos.length + 1,
        participanteA: vagaA.participante,
        participanteB: vagaB?.participante ?? null,
        proximaFaseOrdem: null,
        proximaPartidaOrdem: null,
        proximaPosicao: "",
        vencedorAutomatico: !vagaB ? vagaA.participante : null,
      };
      jogos.push(jogo);
      for (const [vaga, posicao] of [[vagaA, "a"], [vagaB, "b"]] as const) {
        if (!vaga?.origem) continue;
        vaga.origem.jogo.proximaFaseOrdem = ordemFase;
        vaga.origem.jogo.proximaPartidaOrdem = jogo.ordem;
        vaga.origem.jogo.proximaPosicao = posicao;
      }
      proximasVagas.push({ participante: null, origem: { jogo },
        anos: [...vagaA.anos, ...(vagaB?.anos ?? [])], folgas: Math.max(vagaA.folgas, vagaB?.folgas ?? 0) + (vagaB ? 0 : 1) });
    }

    // mantém grupos próximos juntos até o encontro ser necessário
    fases.push({ nome: nomeDaFase(quantidadeTurmas), ordem: ordemFase, tipo: "eliminatoria", jogos });
    vagas = diferencaMaximaAnos === null ? proximasVagas : proximasVagas.sort((a, b) => mediaAnos(a) - mediaAnos(b));
  }
  return fases;
}

// troca as posições sem mexer na lista recebida
function embaralhar<T>(valores: readonly T[]): T[] {
  const resultado = [...valores];
  for (let indice = resultado.length - 1; indice > 0; indice--) {
    const destino = Math.floor(Math.random() * (indice + 1));
    [resultado[indice], resultado[destino]] = [resultado[destino], resultado[indice]];
  }
  return resultado;
}

// usa a média para manter caminhos de séries próximas lado a lado
function mediaAnos(vaga: VagaChave) {
  return vaga.anos.reduce((total, ano) => total + ano, 0) / (vaga.anos.length || 1);
}

// deixa a turma sem par para uma folga ou um confronto inevitável
function aproximarTurmas(vagas: VagaChave[], limite: number) {
  const ordenadas = [...vagas].sort((a, b) => mediaAnos(a) - mediaAnos(b));
  const pares: VagaChave[][] = [];
  const restantes: VagaChave[] = [];
  for (let indice = 0; indice < ordenadas.length; indice++) {
    if (indice + 1 < ordenadas.length && mediaAnos(ordenadas[indice + 1]) - mediaAnos(ordenadas[indice]) <= limite) {
      pares.push([ordenadas[indice], ordenadas[++indice]]);
    } else restantes.push(ordenadas[indice]);
  }
  // escolhe uma única folga se sobrar um número ímpar de turmas
  const folga = restantes.length % 2 === 1 ? restantes.splice(escolherFolga(restantes, limite), 1) : [];
  for (let indice = 0; indice < restantes.length; indice += 2) pares.push([restantes[indice], restantes[indice + 1]]);
  if (folga.length) pares.push(folga);
  const grupos = pares.sort((a, b) => mediaAnos(a[0]) - mediaAnos(b[0]));

  // o lado do grupo e os nomes dentro de cada série também são sorteados
  if (Math.random() < 0.5) grupos.reverse();
  const vagaFolga = grupos.find((grupo) => grupo.length === 1);
  return [...grupos.filter((grupo) => grupo.length === 2).flatMap((grupo) => embaralhar(grupo)), ...(vagaFolga ?? [])];
}

// escolhe a folga sem antecipar encontros distantes
function escolherFolga(vagas: VagaChave[], limite: number | null) {
  const candidatas = embaralhar(vagas.map((vaga, indice) => ({ vaga, indice })));
  if (limite === null) return candidatas.sort((a, b) => a.vaga.folgas - b.vaga.folgas)[0].indice;

  // escolhe a folga que deixa os outros confrontos mais próximos
  const distancia = (indiceFolga: number) => {
    const restantes = vagas.filter((_, indice) => indice !== indiceFolga);
    let total = 0;
    for (let indice = 0; indice < restantes.length; indice += 2) total += Math.max(0, Math.abs(mediaAnos(restantes[indice]) - mediaAnos(restantes[indice + 1])) - limite);
    return total;
  };
  return candidatas.sort((a, b) => distancia(a.indice) - distancia(b.indice) || a.vaga.folgas - b.vaga.folgas)[0].indice;
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

// dá o nome da fase pela quantidade de turmas que chegou nela
function nomeDaFase(quantidadeTurmas: number) {
  if (quantidadeTurmas === 2) return "Final";
  if (quantidadeTurmas <= 4) return "Semifinais";
  if (quantidadeTurmas <= 8) return "Quartas de final";
  if (quantidadeTurmas <= 16) return "Oitavas de final";
  if (quantidadeTurmas <= 32) return "Dezesseis avos de final";
  return `Fase de ${quantidadeTurmas}`;
}
