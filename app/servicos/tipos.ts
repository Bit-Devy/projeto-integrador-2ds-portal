// reúne as opções das páginas que podem ser ligadas pela gestão
export const modulosPadrao = { calendario: true, cantina: true, merenda: true, apmf: true, gecep: true, robotica: true, estagios: true };
export type ModulosPortal = typeof modulosPadrao;
export type ModuloPortal = keyof ModulosPortal;
export const nomesModulos: Record<ModuloPortal, string> = { calendario: "Calendário", cantina: "Cantina", merenda: "Merenda do colégio", apmf: "Cardápio da APMF", gecep: "Cardápio do GECEP", robotica: "Cardápio da robótica", estagios: "Central de Estágios" };
export const modalidades = [{ valor: "anual", nome: "Anual · ensino regular" }, { valor: "semestral", nome: "Semestral · semestral e subsequente" }] as const;
export type ModalidadeCalendario = "anual" | "semestral";
export const tiposDia = { letivo: "Dia letivo", feriado: "Feriado", recesso: "Recesso escolar", planejamento: "Estudo e planejamento", conselho: "Conselho de classe", ferias: "Férias", sem_aula: "Sem aula" };
export type DiaEscolar = { data: string; tipo: keyof typeof tiposDia; letivo: boolean; descricao: string };
export type CalendarioEscolar = { ano: number; modalidade: ModalidadeCalendario; titulo: string; publicado: boolean; aulasDia: number; frequenciaMinima: number; inicioSegundoSemestre: string; inicioSegundoTrimestre: string; inicioTerceiroTrimestre: string; dias: DiaEscolar[]; atualizadoEm?: string };

// guarda os dados dos novos conteúdos sem criar um segundo catálogo de publicações
export type CompromissoCalendario = { id?: number; titulo: string; data: string; dataFim: string; horario: string; modalidade: "anual" | "semestral" | "ambos"; descricao: string; paginaUrl: string; publicado?: boolean };
export type ItemCardapio = { id?: number; titulo: string; categoria: "merenda" | "apmf" | "gecep" | "robotica"; data: string; dataFim: string; turno: string; descricao: string; preco: string; imagemUrl: string; publicado?: boolean };
export type Oportunidade = { id?: number; titulo: string; categoria: "estagio" | "emprego" | "aprendiz" | "concurso"; organizacao: string; local: string; modalidade: string; escolaridade: string; requisitos: string; descricao: string; jornada: string; remuneracao: string; beneficios: string; quantidade: string; data: string; prazo: string; situacao: "aberta" | "encerrada" | "suspensa"; link: string; fonte: string; arquivoUrl: string; publicado?: boolean };
