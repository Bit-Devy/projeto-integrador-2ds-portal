// usa a mesma escrita de turma nas buscas do site
import { normalizarTurma } from "./normalizacao";
import { normalizarBusca, type JogoPublico } from "./modelo-publico";

// lista os esportes que podem ser escolhidos no painel
export const esportesInterclasse = [
  { nome: "Futsal", simbolo: "⚽" },
  { nome: "Futebol", simbolo: "⚽" },
  { nome: "Vôlei", simbolo: "🏐" },
  { nome: "Basquete", simbolo: "🏀" },
  { nome: "Handebol", simbolo: "🤾" },
  { nome: "Queimada", simbolo: "◉" },
  { nome: "Tênis de mesa", simbolo: "🏓" },
  { nome: "Badminton", simbolo: "🏸" },
  { nome: "Xadrez", simbolo: "♟" },
  { nome: "Atletismo", simbolo: "🏃" },
] as const;

// encontra o símbolo do esporte escolhido
export function simboloEsporte(modalidade?: string) {
  return (
    esportesInterclasse.find(
      (item) => normalizarTurma(item.nome) === normalizarTurma(modalidade || ""),
    )?.simbolo || "🏆"
  );
}

// aceita a série e de uma a três letras
export const padraoTurmaInterclasse = /^[1236789][A-Z]{1,3}$/;

// tira os espaços das pontas e padroniza as letras
export function normalizarNomeTurma(nome: string) {
  return nome.trim().toUpperCase();
}

// coloca o ensino fundamental e o médio na mesma sequência
export function anoEscolarTurma(nome: string): number | null {
  const turma = normalizarNomeTurma(nome);
  if (!padraoTurmaInterclasse.test(turma)) return null;
  const serie = Number(turma[0]);
  // o primeiro ano do médio vem depois do nono ano
  return serie <= 3 ? serie + 9 : serie;
}

// separa cada turma quando encontra um espaço ou uma linha nova
export function separarTurmas(texto: string): string[] {
  return texto
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(normalizarNomeTurma);
}

export type JogoPosicionado = {
  id?: number;
  proximaPartidaId?: number | null;
  proximaPosicao?: "" | "a" | "b";
  ordem?: number;
};

export type ModoChave = "dois-lados" | "um-lado";
type PontoChave = { x: number; y: number };

// usa a fase informada ou encontra a primeira rodada com jogos pendentes
export function indiceFaseParaAbrir(
  fases: Array<{ nome?: string; jogos: JogoPublico[] }>,
  atual: string,
) {
  const nomeAtual = normalizarBusca(atual);
  const cadastrada = fases.findIndex(
    ({ nome, jogos }) => nomeAtual && jogos.length && normalizarBusca(nome || "") === nomeAtual,
  );
  if (cadastrada >= 0) return cadastrada;

  const concluidas = new Set(["encerrada", "wo", "cancelada"]);
  const pendente = fases.findIndex(({ jogos }) =>
    jogos.some((jogo) => jogo.formaVitoria !== "bye" && !concluidas.has(jogo.situacao || "")),
  );
  return pendente >= 0 ? pendente : fases.findLastIndex(({ jogos }) => jogos.length > 0);
}

// deixa uma margem em volta de toda a chave na visão inicial
export const margemDaChave = 24;
export function calcularZoomDaChave(
  larguraVisor: number,
  alturaVisor: number,
  larguraChave: number,
  alturaChave: number,
) {
  const larguraDisponivel = Math.max(1, larguraVisor - margemDaChave * 2);
  const alturaDisponivel = Math.max(1, alturaVisor - margemDaChave * 2);
  return Math.min(1, larguraDisponivel / larguraChave, alturaDisponivel / alturaChave);
}

// organiza cada grupo de jogos pelo caminho até a final
export function posicionarChave<T extends JogoPosicionado>(
  fases: Array<{ jogos: T[]; nome?: string; tipo?: string }>,
  modo: ModoChave = "um-lado",
) {
  // usa cartões iguais e deixa espaço para as linhas
  const alturaJogo = 184;
  const larguraJogo = 280;
  const intervalo = 24;
  const passoLinha = alturaJogo + intervalo;
  const passoColuna = larguraJogo + 56;
  const topoFases = 46;
  const alturaAvanco = 32;
  const posicoes = new Map<T, PontoChave>();
  const colunas = new Map<T, number>();
  const porId = new Map<number, T>();
  const origens = new Map<T, T[]>();
  const destinos = new Map<T, T>();
  const jogos = fases.flatMap((fase) => fase.jogos);

  // encontra cada jogo sem mudar os dados cadastrados
  fases.forEach((fase, coluna) => {
    fase.jogos.forEach((jogo) => {
      colunas.set(jogo, coluna);
      if (jogo.id !== undefined) porId.set(jogo.id, jogo);
    });
  });

  // aceita apenas avanços para uma fase seguinte
  for (const jogo of jogos) {
    const destino = jogo.proximaPartidaId == null ? undefined : porId.get(jogo.proximaPartidaId);
    if (!destino || colunas.get(destino)! <= colunas.get(jogo)!) continue;
    destinos.set(jogo, destino);
    const grupo = origens.get(destino) ?? [];
    grupo.push(jogo);
    origens.set(destino, grupo);
  }

  // mantém o lado de cada vaga ao organizar os confrontos
  for (const grupo of origens.values()) {
    const lado = (jogo: T) =>
      jogo.proximaPosicao === "a" ? 0 : jogo.proximaPosicao === "b" ? 1 : 2;
    grupo.sort((a, b) => lado(a) - lado(b) || (a.ordem ?? 0) - (b.ordem ?? 0));
  }

  const faseFinal = fases.findIndex(
    (fase) => fase.tipo !== "terceiro_lugar" && normalizarTurma(fase.nome || "") === "final",
  );
  const colunaFinal =
    faseFinal >= 0
      ? faseFinal
      : fases.findLastIndex((fase) => fase.jogos.length > 0 && fase.tipo !== "terceiro_lugar");
  const raizes = jogos.filter((jogo) => !destinos.has(jogo));
  const espelhada =
    modo === "dois-lados" &&
    raizes.some((jogo) => colunas.get(jogo) === colunaFinal && origens.has(jogo));

  // deixa as fases posteriores fora do espaço usado pelos dois lados da final
  const colunaX = (coluna: number) =>
    (espelhada && coluna > colunaFinal ? coluna + colunaFinal : coluna) * passoColuna;

  // coloca os jogos iniciais juntos e centraliza seus destinos
  const proximaLinha = { indice: 0 };
  function posicionar(jogo: T, direcao: -1 | 1, quadro = posicoes, linha = proximaLinha): number {
    const grupo = origens.get(jogo) ?? [];
    const linhas = grupo.map((origem) => posicionar(origem, direcao, quadro, linha));
    const y = linhas.length
      ? (Math.min(...linhas) + Math.max(...linhas)) / 2
      : linha.indice++ * passoLinha;
    const coluna = colunas.get(jogo)!;
    const x = direcao === 1 ? colunaX(coluna) : (2 * colunaFinal - coluna) * passoColuna;
    quadro.set(jogo, { x, y });
    return y;
  }

  // encontra quanto espaço cada metade precisa acima e abaixo do jogo que chega à final
  function medirLado(grupo: T[], direcao: -1 | 1) {
    const quadro = new Map<T, PontoChave>();
    const linha = { indice: 0 };
    const centros = grupo.map((jogo) => posicionar(jogo, direcao, quadro, linha));
    const centro = centros.length ? (Math.min(...centros) + Math.max(...centros)) / 2 : 0;
    return {
      quadro,
      centro,
      acima: centro,
      abaixo: Math.max(0, (linha.indice - 1) * passoLinha - centro),
    };
  }

  // coloca cada ramo da final no lado da vaga para a qual ele avança
  const jogosEspelhados = new Set<T>();
  for (const jogo of raizes) {
    const grupo = origens.get(jogo);
    if (!espelhada || colunas.get(jogo) !== colunaFinal || !grupo?.length) {
      posicionar(jogo, 1);
      continue;
    }
    const esquerda: T[] = [];
    const direita: T[] = [];
    for (const origem of grupo) {
      const lado = origem.proximaPosicao || (esquerda.length <= direita.length ? "a" : "b");
      (lado === "a" ? esquerda : direita).push(origem);
    }
    const lados = [medirLado(esquerda, 1), medirLado(direita, -1)];
    const raio = Math.max(...lados.map(({ acima, abaixo }) => Math.max(acima, abaixo)));
    const yFinal = proximaLinha.indice * passoLinha + raio;
    // alinha as chegadas à final e usa a mesma altura nos dois lados
    for (const lado of lados) {
      for (const [partida, ponto] of lado.quadro) {
        const distancia = ponto.y - lado.centro;
        const espaco = distancia < 0 ? lado.acima : lado.abaixo;
        const y = yFinal + (espaco ? (distancia * raio) / espaco : 0);
        posicoes.set(partida, { x: ponto.x, y });
        jogosEspelhados.add(partida);
      }
    }
    posicoes.set(jogo, { x: colunaX(colunaFinal), y: yFinal });
    proximaLinha.indice += Math.ceil((raio * 2) / passoLinha) + 1;
  }

  // liga os cartões pelas bordas voltadas para o próximo jogo
  const avancos: Array<PontoChave & { origem: T; indiceFase: number }> = [];
  const conexoes = Array.from(destinos, ([origem, destino]) => {
    const inicio = posicoes.get(origem)!;
    const fim = posicoes.get(destino)!;
    const avancaParaDireita = inicio.x < fim.x;
    const entrada = fim.x + (avancaParaDireita ? 0 : larguraJogo);
    const meio = entrada + ((passoColuna - larguraJogo) / 2) * (avancaParaDireita ? -1 : 1);
    const saida = {
      x: inicio.x + (avancaParaDireita ? larguraJogo : 0),
      y: inicio.y + alturaJogo / 2,
    };
    const chegada = { x: entrada, y: fim.y + alturaJogo / 2 };
    const faseOrigem = colunas.get(origem)!;
    const faseDestino = colunas.get(destino)!;
    if (jogosEspelhados.has(origem)) {
      // sinaliza uma fase pulada na própria linha sem criar outro jogo
      for (let fase = faseOrigem + 1; fase < faseDestino; fase++) {
        const x = inicio.x + (avancaParaDireita ? 1 : -1) * passoColuna * (fase - faseOrigem);
        avancos.push({ origem, indiceFase: fase, x, y: saida.y });
      }
    }
    const alinhada = saida.y === chegada.y;
    const pontos = alinhada
      ? [saida, chegada]
      : [saida, { x: meio, y: saida.y }, { x: meio, y: chegada.y }, chegada];
    const caminho = alinhada
      ? `M ${saida.x} ${saida.y} H ${chegada.x}`
      : `M ${saida.x} ${saida.y} H ${meio} V ${chegada.y} H ${chegada.x}`;
    return { origem, destino, pontos, pulaFase: faseDestino > faseOrigem + 1, caminho };
  });
  return {
    posicoes,
    conexoes,
    avancos,
    alturaAvanco,
    alturaJogo,
    larguraJogo,
    passoColuna,
    topoFases,
    colunaFinal,
    colunaX,
    espelhada,
    largura: Math.max(
      larguraJogo,
      colunaX(fases.length - 1) + larguraJogo,
      espelhada ? 2 * colunaFinal * passoColuna + larguraJogo : 0,
    ),
    altura: Math.max(alturaJogo, ...Array.from(posicoes.values(), (ponto) => ponto.y + alturaJogo)),
  };
}
