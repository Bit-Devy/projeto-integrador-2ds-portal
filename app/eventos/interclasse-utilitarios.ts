// usa a mesma escrita de turma nas buscas do site
import { normalizarTurma } from "./normalizacao";

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
  return esportesInterclasse.find((item) => normalizarTurma(item.nome) === normalizarTurma(modalidade || ""))?.simbolo || "🏆";
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
  return texto.trim().split(/[\s,;]+/).filter(Boolean).map(normalizarNomeTurma);
}

export type JogoPosicionado = {
  id?: number;
  proximaPartidaId?: number | null;
  proximaPosicao?: "" | "a" | "b";
  ordem?: number;
};

// organiza cada grupo de jogos pelo caminho até a final
export function posicionarChave<T extends JogoPosicionado>(fases: Array<{ jogos: T[] }>) {
  // usa cartões iguais e deixa espaço para as linhas
  const alturaJogo = 184;
  const larguraJogo = 280;
  const intervalo = 24;
  const passoColuna = larguraJogo + 56;
  const topoFases = 46;
  const posicoes = new Map<T, { x: number; y: number }>();
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
    const lado = (jogo: T) => jogo.proximaPosicao === "a" ? 0 : jogo.proximaPosicao === "b" ? 1 : 2;
    grupo.sort((a, b) => lado(a) - lado(b) || (a.ordem ?? 0) - (b.ordem ?? 0));
  }

  // coloca os jogos iniciais juntos e centraliza seus destinos
  let proximaLinha = 0;
  function posicionar(jogo: T): number {
    const existente = posicoes.get(jogo);
    if (existente) return existente.y;
    const grupo = origens.get(jogo) ?? [];
    const linhas = grupo.map(posicionar);
    const y = linhas.length ? (Math.min(...linhas) + Math.max(...linhas)) / 2 : proximaLinha++ * (alturaJogo + intervalo);
    posicoes.set(jogo, { x: colunas.get(jogo)! * passoColuna, y });
    return y;
  }

  // inclui finais e grupos independentes das chaves personalizadas
  jogos.filter((jogo) => !destinos.has(jogo)).forEach(posicionar);

  // passa as folgas pela linha livre e junta os avanços no espaço entre fases
  const conexoes = Array.from(destinos, ([origem, destino]) => {
    const inicio = posicoes.get(origem)!;
    const fim = posicoes.get(destino)!;
    const meio = fim.x - (passoColuna - larguraJogo) / 2;
    const pontos = [
      { x: inicio.x + larguraJogo, y: inicio.y + alturaJogo / 2 },
      { x: meio, y: inicio.y + alturaJogo / 2 },
      { x: meio, y: fim.y + alturaJogo / 2 },
      { x: fim.x, y: fim.y + alturaJogo / 2 },
    ];
    return { origem, destino, pontos, pulaFase: colunas.get(destino)! > colunas.get(origem)! + 1,
      caminho: `M ${pontos[0].x} ${pontos[0].y} H ${meio} V ${pontos[2].y} H ${pontos[3].x}` };
  });
  return {
    posicoes, conexoes, alturaJogo, larguraJogo, passoColuna, topoFases,
    largura: Math.max(larguraJogo, fases.length * passoColuna - (passoColuna - larguraJogo)),
    altura: Math.max(alturaJogo, ...Array.from(posicoes.values(), (ponto) => ponto.y + alturaJogo)),
  };
}
