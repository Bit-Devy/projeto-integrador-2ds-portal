// reproduz as marcações dos dois calendários enviados pelo colégio
import { calendarioVazio, datasEntre, diaDaSemana } from "./calendario";
import type { CalendarioEscolar, DiaEscolar } from "./tipos";

export function calendarioInicial2026(modalidade: CalendarioEscolar["modalidade"]) {
  const calendario = calendarioVazio(2026, modalidade);
  calendario.publicado = true;
  calendario.inicioSegundoSemestre = "2026-07-27";
  calendario.inicioSegundoTrimestre = "2026-05-18";
  calendario.inicioTerceiroTrimestre = "2026-09-09";
  const marcar = (inicio: string, fim: string, tipo: DiaEscolar["tipo"], descricao: string, letivo = false) => {
    for (const data of datasEntre(`2026-${inicio}`, `2026-${fim}`)) {
      const dia = calendario.dias.find((item) => item.data === data)!;
      Object.assign(dia, { tipo, descricao, letivo });
    }
  };
  for (const dia of calendario.dias) if (dia.data >= "2026-02-05" && dia.data <= "2026-12-18" && ![0, 6].includes(diaDaSemana(dia.data))) Object.assign(dia, { tipo: "letivo", letivo: true });
  marcar("01-01", "01-22", "ferias", "Férias escolares");
  marcar("01-23", "02-02", "recesso", "Recesso escolar");
  marcar("02-03", "02-04", "planejamento", "Estudo e planejamento");
  for (const [inicio, fim] of [["02-16", "02-18"], ["04-02", "04-02"], ["04-20", "04-20"], ["06-05", "06-05"], ["07-11", "07-22"], ["10-13", "10-13"], ["12-21", "12-22"]]) marcar(inicio, fim, "recesso", "Recesso escolar");
  marcar("07-23", "07-24", "planejamento", "Estudo e planejamento");
  marcar("09-12", "09-12", "planejamento", "Estudo e planejamento");
  marcar("12-23", "12-31", "ferias", "Férias escolares");
  const feriados: Record<string, string> = { "01-01": "Ano Novo", "02-17": "Carnaval", "04-03": "Paixão de Cristo", "04-05": "Páscoa", "04-21": "Tiradentes", "05-01": "Dia do Trabalho", "06-04": "Corpus Christi", "09-07": "Independência do Brasil", "09-08": "Nossa Senhora da Luz dos Pinhais", "10-12": "Nossa Senhora Aparecida", "11-02": "Finados", "11-15": "Proclamação da República", "11-20": "Consciência Negra", "12-25": "Natal" };
  for (const [data, descricao] of Object.entries(feriados)) marcar(data, data, "feriado", descricao);
  marcar("05-15", "05-15", "planejamento", "Estudo e planejamento");
  // os conselhos simultâneos às aulas preservam os totais letivos do documento
  const conselhos = modalidade === "anual" ? [["05-19", "05-30"], ["09-10", "09-21"], ["12-14", "12-19"]] : [["04-25", "04-25"], ["07-03", "07-03"], ["12-14", "12-17"], ["12-19", "12-19"]];
  for (const [inicio, fim] of conselhos) for (const data of datasEntre(`2026-${inicio}`, `2026-${fim}`)) {
    const dia = calendario.dias.find((item) => item.data === data)!;
    dia.tipo = "conselho"; dia.descricao = "Conselho de classe";
  }
  if (modalidade === "semestral") {
    marcar("07-03", "07-03", "conselho", "Conselho de classe sem aulas");
    marcar("08-22", "08-22", "letivo", "Sábado letivo", true);
  }
  for (const data of ["04-15", "06-25", "08-24", "10-30"]) calendario.dias.find((dia) => dia.data === `2026-${data}`)!.descricao = "Plano de abandono · brigada escolar";
  return calendario;
}
