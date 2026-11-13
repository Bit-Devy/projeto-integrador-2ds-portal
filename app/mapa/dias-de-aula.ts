// organiza os dias da semana de segunda a domingo
export const diasDeAula = [
  { chave: "segunda", nome: "Segunda-feira", curto: "Seg" },
  { chave: "terca", nome: "Terça-feira", curto: "Ter" },
  { chave: "quarta", nome: "Quarta-feira", curto: "Qua" },
  { chave: "quinta", nome: "Quinta-feira", curto: "Qui" },
  { chave: "sexta", nome: "Sexta-feira", curto: "Sex" },
  { chave: "sabado", nome: "Sábado", curto: "Sáb" },
  { chave: "domingo", nome: "Domingo", curto: "Dom" },
] as const;

export type DiaDeAula = (typeof diasDeAula)[number]["chave"];
export const semanaInteira = (1 << diasDeAula.length) - 1;

// guarda um bit por dia para comparar os horários no banco
export function mascaraDiasDeAula(dias: DiaDeAula[]) {
  return diasDeAula.reduce((mascara, dia, indice) => dias.includes(dia.chave) ? mascara | (1 << indice) : mascara, 0);
}

export function diasDaMascara(mascara: number): DiaDeAula[] {
  return diasDeAula.filter((_, indice) => (mascara & (1 << indice)) !== 0).map((dia) => dia.chave);
}

// mostra os dias escolhidos na ordem da semana
export function rotuloDiasDeAula(dias: DiaDeAula[], curto = false) {
  if (dias.length === diasDeAula.length) return "Todos os dias";
  return diasDeAula.filter((dia) => dias.includes(dia.chave)).map((dia) => curto ? dia.curto : dia.nome).join(", ");
}
