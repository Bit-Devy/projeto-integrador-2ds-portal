// calcula o tempo até o final do último dia de destaque no horário do paraná
export function tempoRestanteDestaque(prazo: string, agora = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return null;
  const inicio = new Date(`${prazo}T00:00:00-03:00`);
  if (Number.isNaN(inicio.getTime()) || inicio.toISOString().slice(0, 10) !== prazo) return null;
  const restante = inicio.getTime() + 24 * 60 * 60 * 1000 - agora.getTime();
  if (restante <= 0) return null;
  const totalHoras = Math.floor(restante / 3600000);
  return { dias: Math.floor(totalHoras / 24), horas: totalHoras % 24, menosDeUmaHora: totalHoras === 0 };
}
