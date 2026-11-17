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

// guarda a série usada para aproximar as turmas no sorteio
type TurmaSorteada = { participante: ParticipanteChave; ano: number };
type ParSorteado = [TurmaSorteada, TurmaSorteada];
type JogoInicial = [TurmaSorteada, TurmaSorteada?];

// conta quantos pares próximos podem jogar na mesma rodada
export function quantidadeParesProximos(nomes: string[], limite: number) {
  const anos = nomes.map(anoEscolarTurma).filter((ano): ano is number => ano !== null).sort((a, b) => a - b);
  let pares = 0;
  for (let indice = 0; indice < anos.length - 1; indice++) {
    if (anos[indice + 1] - anos[indice] <= limite) { pares++; indice++; }
  }
  return pares;
}

// sorteia uma chave com folgas na entrada e as mesmas fases nos dois lados
export function planejarChaveMataMata(participantesRecebidos: ParticipanteChave[], diferencaMaximaAnos: number | null = null) {
  // confere a lista antes de montar os jogos
  const participantes = embaralhar(participantesRecebidos);
  if (participantes.length < 2) throw new ErroEventos("Adicione pelo menos dois participantes antes de gerar a chave.");
  if (participantes.length > 128) throw new ErroEventos("A chave aceita no máximo 128 participantes.");
  if (new Set(participantes.map((item) => item.id)).size !== participantes.length) throw new ErroEventos("A lista da chave contém participantes repetidos.");
  if (diferencaMaximaAnos !== null && (!Number.isInteger(diferencaMaximaAnos) || diferencaMaximaAnos < 1 || diferencaMaximaAnos > 3)) throw new ErroEventos("Escolha uma diferença máxima de 1 a 3 anos.");

  // usa a série cadastrada e mantém o nome público separado
  const turmas = participantes.map((participante) => {
    const ano = anoEscolarTurma(participante.nomeCadastrado ?? participante.nome);
    if (diferencaMaximaAnos !== null && ano === null) throw new ErroEventos(`Revise o nome cadastrado da turma ${participante.nomeCadastrado ?? participante.nome}. Use a série e de 1 a 3 letras, como 6A ou 2DS.`);
    return { participante, ano: ano ?? 0 };
  });

  const capacidade = 2 ** Math.ceil(Math.log2(turmas.length));
  const primeiraRodada = sortearPrimeiraRodada(turmas, capacidade / 2, diferencaMaximaAnos);
  const fases: FasePlanejada[] = [];
  // liga todos os vencedores à rodada seguinte até chegar à final
  for (let vagas = capacidade; vagas >= 2; vagas /= 2) {
    const ordemFase = fases.length + 1;
    const jogos = Array.from({ length: vagas / 2 }, (_, indice): JogoPlanejado => {
      const par = ordemFase === 1 ? primeiraRodada[indice] : undefined;
      return {
        ordem: indice + 1,
        participanteA: par?.[0].participante ?? null,
        participanteB: par?.[1]?.participante ?? null,
        vencedorAutomatico: par && !par[1] ? par[0].participante : null,
        proximaFaseOrdem: vagas > 2 ? ordemFase + 1 : null,
        proximaPartidaOrdem: vagas > 2 ? Math.floor(indice / 2) + 1 : null,
        proximaPosicao: vagas === 2 ? "" : indice % 2 === 0 ? "a" : "b",
      };
    });
    fases.push({ nome: nomeDaFase(vagas), ordem: ordemFase, tipo: "eliminatoria", jogos });
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

// encontra o maior número de pares próximos em uma lista ordenada por série
function paresProximos(ordenadas: TurmaSorteada[], limite: number): ParSorteado[] {
  const proximos: ParSorteado[] = [];
  for (let indice = 0; indice < ordenadas.length - 1; indice++) {
    const seguinte = ordenadas[indice + 1];
    if (seguinte.ano - ordenadas[indice].ano <= limite) {
      proximos.push([ordenadas[indice], seguinte]);
      indice++;
    }
  }
  return proximos;
}

// escolhe pares próximos antes de marcar confrontos entre séries distantes
function sortearPares(turmas: TurmaSorteada[], total: number, limite: number | null): ParSorteado[] {
  if (limite === null) return Array.from({ length: total }, (_, indice) => [turmas[indice * 2], turmas[indice * 2 + 1]]);
  const ordenadas = [...turmas].sort((a, b) => a.ano - b.ano);
  const pares = embaralhar(paresProximos(ordenadas, limite)).slice(0, total);
  const escolhidas = new Set(pares.flat());
  const restantes = ordenadas.filter((turma) => !escolhidas.has(turma));
  while (pares.length < total) {
    let maisProximo = 0;
    for (let indice = 1; indice < restantes.length - 1; indice++) {
      if (restantes[indice + 1].ano - restantes[indice].ano < restantes[maisProximo + 1].ano - restantes[maisProximo].ano) maisProximo = indice;
    }
    const [a, b] = restantes.splice(maisProximo, 2);
    pares.push([a, b]);
  }
  return pares;
}

// separa grupos por série quando o corte mantém o equilíbrio e os pares próximos
function separarPorSerie(turmas: TurmaSorteada[], jogos: number, limite: number) {
  const ordenadas = [...turmas].sort((a, b) => a.ano - b.ano);
  const metade = jogos / 2;
  const totalPares = turmas.length - jogos;
  const ideal = Math.min(totalPares, paresProximos(ordenadas, limite).length);
  const cortes = embaralhar([...new Set([Math.floor(turmas.length / 2), Math.ceil(turmas.length / 2)])]);
  cortes.sort((a, b) => (ordenadas[b].ano - ordenadas[b - 1].ano) - (ordenadas[a].ano - ordenadas[a - 1].ano));
  for (const corte of cortes) {
    const lados = [ordenadas.slice(0, corte), ordenadas.slice(corte)];
    const proximos = lados.reduce((total, lado) => total + Math.min(lado.length - metade, paresProximos(lado, limite).length), 0);
    if (proximos === ideal) return Math.random() < 0.5 ? lados : lados.reverse();
  }
  return null;
}

// distribui partidas e folgas entre as metades de cada fase
function sortearPrimeiraRodada(turmas: TurmaSorteada[], jogos: number, limite: number | null): JogoInicial[] {
  if (limite !== null && jogos > 1) {
    const lados = separarPorSerie(turmas, jogos, limite);
    if (lados) return lados.flatMap((lado) => sortearPrimeiraRodada(lado, jogos / 2, limite));
  }
  const pares = sortearPares(turmas, turmas.length - jogos, limite);
  const emConfronto = new Set(pares.flat());
  const folgas = turmas.filter((turma) => !emConfronto.has(turma));
  if (limite !== null) {
    // mantém séries próximas no mesmo trecho da chave
    const media = ([a, b]: ParSorteado) => (a.ano + b.ano) / 2;
    const sentido = Math.random() < 0.5 ? 1 : -1;
    pares.sort((a, b) => sentido * (media(a) - media(b)));
    folgas.sort((a, b) => sentido * (a.ano - b.ano));
  }
  let indicePar = 0;
  let indiceFolga = 0;
  const rodada: JogoInicial[] = [];
  function distribuir(vagas: number, confrontos: number) {
    if (vagas === 1) {
      const par: JogoInicial = confrontos ? pares[indicePar++] : [folgas[indiceFolga++]];
      rodada.push(par[1] && Math.random() < 0.5 ? [par[1], par[0]] : par);
      return;
    }
    const esquerda = Math.random() < 0.5 ? Math.floor(confrontos / 2) : Math.ceil(confrontos / 2);
    distribuir(vagas / 2, esquerda);
    distribuir(vagas / 2, confrontos - esquerda);
  }
  distribuir(jogos, pares.length);
  return rodada;
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

// dá o nome da fase pelo tamanho da rodada
function nomeDaFase(quantidadeTurmas: number) {
  if (quantidadeTurmas === 2) return "Final";
  if (quantidadeTurmas <= 4) return "Semifinais";
  if (quantidadeTurmas <= 8) return "Quartas de final";
  if (quantidadeTurmas <= 16) return "Oitavas de final";
  if (quantidadeTurmas <= 32) return "Dezesseis avos de final";
  return `Fase de ${quantidadeTurmas}`;
}
