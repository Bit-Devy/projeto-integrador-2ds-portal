// reutiliza a regra já usada pelo mapa, mantendo buscas por turma consistentes
import {
  normalizarSlug as normalizarSlugBase,
  normalizarTextoBusca as normalizarTextoBuscaBase,
  normalizarTurno as normalizarTurnoBase,
} from "../mapa/normalizacao";

export const normalizarTextoBusca = normalizarTextoBuscaBase;
export const normalizarTurno = normalizarTurnoBase;

// gera slugs estáveis para URLs, com hífens em vez do sublinhado usado em enums
export function normalizarSlugPublico(valor: unknown) {
  return normalizarSlugBase(valor).replaceAll("_", "-").slice(0, 100);
}

// mantém a forma canônica que faz 3º J, 3° J, 3 J e 3J coincidirem
export function normalizarTurma(valor: unknown) {
  return normalizarTextoBuscaBase(valor);
}

// aceita nomes amigáveis usados por formulários antigos sem abrir a whitelist
export function normalizarSituacaoEvento(valor: unknown) {
  const chave = normalizarSlugBase(valor);
  if (chave === "agendado" || chave === "agendada" || chave === "futuro") return "proximo";
  if (chave === "acontecendo_agora" || chave === "andamento") return "em_andamento";
  return chave;
}

// reúne os horários em um texto de apresentação sem perder os campos originais
export function combinarHorario(inicial: string, final: string) {
  if (inicial && final) return `${inicial}–${final}`;
  return inicial || final;
}
