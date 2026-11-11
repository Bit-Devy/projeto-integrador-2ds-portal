// usa datas sem horário para não deslocar os dias conforme o navegador
import { tiposDia, type CalendarioEscolar, type DiaEscolar } from "./tipos";

export function dataValida(data: string) {
  const instante = new Date(`${data}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 10) === data;
}
export function datasEntre(inicio: string, fim: string) {
  if (!dataValida(inicio) || !dataValida(fim) || fim < inicio || Number(fim.slice(0, 4)) - Number(inicio.slice(0, 4)) > 1) throw new Error("Informe um intervalo de datas válido.");
  const dias: string[] = [];
  for (let instante = Date.parse(`${inicio}T12:00:00Z`); instante <= Date.parse(`${fim}T12:00:00Z`); instante += 86400000) dias.push(new Date(instante).toISOString().slice(0, 10));
  return dias;
}
export function diaDaSemana(data: string) { return new Date(`${data}T12:00:00Z`).getUTCDay(); }
export function formatarDia(data: string) { return dataValida(data) ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${data}T12:00:00Z`)) : ""; }
export function hojeNoParana() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }

// prepara um ano vazio sem inventar os feriados dos próximos calendários
export function calendarioVazio(ano: number, modalidade: CalendarioEscolar["modalidade"]): CalendarioEscolar {
  return { ano, modalidade, titulo: `Calendário escolar ${ano}`, publicado: false, aulasDia: 6, frequenciaMinima: 75, inicioSegundoSemestre: `${ano}-07-01`, inicioSegundoTrimestre: `${ano}-05-01`, inicioTerceiroTrimestre: `${ano}-09-01`, dias: datasEntre(`${ano}-01-01`, `${ano}-12-31`).map((data) => ({ data, tipo: "sem_aula", letivo: false, descricao: "" })) };
}

// completa os calendários salvos antes da separação dos trimestres
export function completarCalendario(calendario: CalendarioEscolar): CalendarioEscolar {
  return { ...calendario, inicioSegundoTrimestre: calendario.inicioSegundoTrimestre || `${calendario.ano}-${calendario.ano === 2026 ? "05-18" : "05-01"}`, inicioTerceiroTrimestre: calendario.inicioTerceiroTrimestre || `${calendario.ano}-${calendario.ano === 2026 ? "09-09" : "09-01"}` };
}

// confere o ano inteiro antes de substituir um calendário salvo
export function validarCalendario(valor: unknown): CalendarioEscolar {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Informe os dados do calendário.");
  const recebido = completarCalendario(valor as CalendarioEscolar);
  if (!Number.isInteger(recebido.ano) || recebido.ano < 1900 || recebido.ano > 2199 || !["anual", "semestral"].includes(recebido.modalidade)) throw new Error("Escolha um ano e uma modalidade válidos.");
  if (typeof recebido.publicado !== "boolean" || typeof recebido.titulo !== "string" || !recebido.titulo.trim() || recebido.titulo.length > 150) throw new Error("Informe o título e a publicação do calendário.");
  if (!Number.isInteger(recebido.aulasDia) || recebido.aulasDia < 1 || recebido.aulasDia > 20 || !Number.isFinite(recebido.frequenciaMinima) || recebido.frequenciaMinima < 1 || recebido.frequenciaMinima > 100) throw new Error("Informe a quantidade de aulas e a frequência mínima válidas.");
  if (!dataValida(recebido.inicioSegundoSemestre) || recebido.inicioSegundoSemestre.slice(0, 4) !== String(recebido.ano)) throw new Error("Informe o início do segundo semestre neste ano.");
  if (recebido.modalidade === "anual" && (![recebido.inicioSegundoTrimestre, recebido.inicioTerceiroTrimestre].every((data) => dataValida(data) && data.slice(0, 4) === String(recebido.ano)) || recebido.inicioTerceiroTrimestre <= recebido.inicioSegundoTrimestre)) throw new Error("Informe o início do segundo e do terceiro trimestre em ordem, dentro deste ano.");
  const datas = datasEntre(`${recebido.ano}-01-01`, `${recebido.ano}-12-31`);
  if (!Array.isArray(recebido.dias) || recebido.dias.length !== datas.length || new Set(recebido.dias.map((dia) => dia.data)).size !== datas.length) throw new Error("O calendário deve conter todos os dias do ano, sem repetições.");
  const dias = recebido.dias.map((dia): DiaEscolar => {
    if (!datas.includes(dia.data) || !Object.hasOwn(tiposDia, dia.tipo) || typeof dia.letivo !== "boolean" || typeof dia.descricao !== "string" || dia.descricao.length > 300) throw new Error("Confira as datas e as descrições do calendário.");
    if (dia.letivo && !["letivo", "conselho"].includes(dia.tipo)) throw new Error("Somente dias letivos e conselhos com aula podem contar como aula.");
    if (dia.tipo === "letivo" && !dia.letivo) throw new Error("Um dia letivo precisa contar como aula.");
    return { data: dia.data, tipo: dia.tipo, letivo: dia.letivo, descricao: dia.descricao.trim() };
  }).sort((a, b) => a.data.localeCompare(b.data));
  return { ano: recebido.ano, modalidade: recebido.modalidade, titulo: recebido.titulo.trim(), publicado: recebido.publicado, aulasDia: recebido.aulasDia, frequenciaMinima: recebido.frequenciaMinima, inicioSegundoSemestre: recebido.inicioSegundoSemestre, inicioSegundoTrimestre: recebido.inicioSegundoTrimestre, inicioTerceiroTrimestre: recebido.inicioTerceiroTrimestre, dias };
}

// calcula somente as aulas dos dias marcados como letivos no período escolhido
export function calcularFaltas(calendario: CalendarioEscolar, inicio: string, fim: string, aulasDia = 6) {
  if (!dataValida(inicio) || !dataValida(fim) || fim < inicio || inicio.slice(0, 4) !== String(calendario.ano) || fim.slice(0, 4) !== String(calendario.ano)) throw new Error("Escolha datas deste calendário, com o fim depois do início.");
  if (!Number.isInteger(aulasDia) || aulasDia < 1 || aulasDia > 20) throw new Error("Informe de 1 a 20 aulas por dia.");
  const dias = calendario.dias.filter((dia) => dia.letivo && dia.data >= inicio && dia.data <= fim);
  return { dias: dias.length, aulas: dias.length * aulasDia, ultimoDia: dias.at(-1)?.data || "", primeiroDia: dias[0]?.data || "" };
}
export function margemFaltas(calendario: CalendarioEscolar, faltas: number, inicio: string, fim: string, aulasDia = 6) {
  if (!Number.isInteger(faltas) || faltas < 0 || faltas > 100000) throw new Error("Informe uma quantidade válida de faltas em aulas.");
  const total = calcularFaltas(calendario, inicio, fim, aulasDia);
  const limite = Math.floor(total.aulas * (100 - calendario.frequenciaMinima) / 100 + 1e-8);
  return { ...total, limite, restante: Math.max(0, limite - faltas), excedidas: Math.max(0, faltas - limite) };
}

// distribui a margem pelos próximos dias com aula sem contar feriados e recessos
export function preverAusencias(calendario: CalendarioEscolar, margem: number, inicio: string, fim: string, aulasDia = 6, hoje = hojeNoParana()) {
  const futuras = calendario.dias.filter((dia) => dia.letivo && dia.data >= hoje && dia.data >= inicio && dia.data <= fim).map((dia) => dia.data).sort();
  const dias = Math.min(Math.floor(margem / aulasDia), futuras.length);
  const aulasParciais = futuras[dias] ? Math.min(margem - dias * aulasDia, aulasDia) : 0;
  return { dias, ate: dias ? futuras[dias - 1] : "", proximoDia: aulasParciais ? futuras[dias] : "", aulasParciais, referencia: hoje, restantes: futuras.length };
}
