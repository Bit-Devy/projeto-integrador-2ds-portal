// importa os turnos aceitos pelo mapa
import { turnosMapa, type TurnoMapa } from "./tipos";

// relaciona ordinais escritos com seus números
const ordinaisPorExtenso: Record<string, string> = {
  primeiro: "1",
  primeira: "1",
  segundo: "2",
  segunda: "2",
  terceiro: "3",
  terceira: "3",
  quarto: "4",
  quarta: "4",
  quinto: "5",
  quinta: "5",
  sexto: "6",
  sexta: "6",
  setimo: "7",
  setima: "7",
  oitavo: "8",
  oitava: "8",
  nono: "9",
  nona: "9",
};

// prepara um texto para buscas sem acentos ou símbolos
export function normalizarTextoBusca(valor: unknown) {
  // converte o valor para texto minúsculo sem acentos
  let texto = removerAcentos(String(valor ?? "").trim().toLowerCase())
    .replace(/[º°ª]/g, " ");

  // troca cada ordinal escrito pelo número correspondente
  for (const [ordinal, numero] of Object.entries(ordinaisPorExtenso)) {
    texto = texto.replace(new RegExp(`\\b${ordinal}\\b`, "g"), numero);
  }

  // mantém somente letras e números
  return texto.replace(/[^a-z0-9]+/g, "");
}

// prepara o número de uma sala para comparação
export function normalizarNumeroSala(valor: unknown) {
  // remove o texto sala do início
  const texto = removerAcentos(String(valor ?? "").trim().toLowerCase())
    .replace(/^sala\s*/i, "");
  return texto.replace(/[^a-z0-9]+/g, "");
}

// transforma um valor em identificador simples
export function normalizarSlug(valor: unknown) {
  // limita o identificador a letras números e sublinhados
  return removerAcentos(String(valor ?? "").trim().toLowerCase())
    .replace(/[º°ª]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

// aceita somente um turno cadastrado
export function normalizarTurno(valor: unknown): TurnoMapa | "" {
  const turno = normalizarSlug(valor);
  // devolve vazio quando o turno não existe
  return turnosMapa.includes(turno as TurnoMapa) ? turno as TurnoMapa : "";
}

// organiza apelidos sem repetição
export function aliasesNormalizados(valor: unknown) {
  const vistos = new Set<string>();
  // separa normaliza e remove apelidos repetidos
  const aliases = String(valor ?? "")
    .split(/[\n,;]+/)
    .map(normalizarTextoBusca)
    .filter((alias) => alias && !vistos.has(alias) && Boolean(vistos.add(alias)));
  return aliases.join("\n");
}

// verifica se uma busca aparece nos apelidos
export function contemAliasNormalizado(aliases: string, busca: string) {
  return aliases.split("\n").some((alias) => alias.includes(busca));
}

// remove marcas de acentuação do texto
function removerAcentos(valor: string) {
  return valor.normalize("NFD").replace(/\p{M}/gu, "");
}
