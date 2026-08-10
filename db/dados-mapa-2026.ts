// importa as funções de normalização do mapa
import { aliasesNormalizados, normalizarNumeroSala, normalizarTextoBusca } from "../app/mapa/normalizacao";
// importa os tipos das categorias e turnos
import type { GrupoCategoriaMapa, TurnoMapa } from "../app/mapa/tipos";

// identifica esta versão da carga inicial
export const CHAVE_CARGA_MAPA_2026 = "mapa-colegio-pdf-2026-fe7c105a-v2";

// define uma categoria da carga inicial
export type CategoriaMapaInicial = {
  grupo: GrupoCategoriaMapa;
  slug: string;
  nome: string;
  ordem: number;
};

// define um local da carga inicial
export type LocalMapaInicial = {
  chaveImportacao: string;
  nome: string;
  nomeNormalizado: string;
  numero: string;
  numeroNormalizado: string;
  nomeAlternativo: string;
  nomeAlternativoNormalizado: string;
  tipo: string;
  ala: string;
  andar: string;
  ordem: number;
};

// define uma turma da carga inicial
export type TurmaMapaInicial = {
  chaveImportacao: string;
  nome: string;
  nomeNormalizado: string;
  aliases: string;
  aliasesNormalizados: string;
  turno: TurnoMapa;
  tipo: string;
  curso: string;
  serie: string;
  turma: string;
  ordem: number;
};

// define um ensalamento da carga inicial
export type EnsalamentoMapaInicial = {
  chaveImportacao: string;
  chaveTurma: string;
  chaveLocal: string;
  turno: TurnoMapa;
  tipo: string;
  ordem: number;
};

// categorias básicas usadas pela carga inicial
export const categoriasMapaIniciais: CategoriaMapaInicial[] = [
  { grupo: "atividade", slug: "aula_regular", nome: "Aula regular", ordem: 10 },
  { grupo: "atividade", slug: "curso_tecnico", nome: "Curso técnico", ordem: 20 },
  { grupo: "atividade", slug: "idiomas", nome: "CELEM ou curso de idiomas", ordem: 30 },
  { grupo: "atividade", slug: "extracurricular", nome: "Atividade extracurricular", ordem: 40 },
  { grupo: "atividade", slug: "outro", nome: "Outro", ordem: 50 },
  { grupo: "local", slug: "sala_aula", nome: "Sala de aula", ordem: 10 },
  { grupo: "local", slug: "laboratorio", nome: "Laboratório", ordem: 20 },
  { grupo: "local", slug: "biblioteca", nome: "Biblioteca", ordem: 30 },
  { grupo: "local", slug: "auditorio", nome: "Auditório", ordem: 40 },
  { grupo: "local", slug: "setor_administrativo", nome: "Setor administrativo", ordem: 50 },
  { grupo: "local", slug: "espaco_esportivo", nome: "Espaço esportivo", ordem: 60 },
  { grupo: "local", slug: "outro", nome: "Outro", ordem: 70 },
];

// define uma linha simples de local
type LinhaLocal = readonly [andar: string, ala: string, numero: string, nome: string];

// locais copiados do mapa de 2026
const linhasLocais: LinhaLocal[] = [
  ["1", "Par", "112", "Sala dos Professores"],
  ["1", "Par", "114", ""],
  ["1", "Par", "116", ""],
  ["1", "Par", "118", ""],
  ["1", "Par", "120", ""],
  ["1", "Par", "122", ""],
  ["1", "Par", "124", ""],
  ["1", "Par", "126", ""],
  ["1", "Par", "128", ""],
  ["1", "Par", "130", ""],
  ["1", "Ímpar", "113B", ""],
  ["1", "Ímpar", "113C", "Laboratório de Física"],
  ["1", "Ímpar", "115", ""],
  ["1", "Ímpar", "117", ""],
  ["1", "Ímpar", "119", ""],
  ["1", "Ímpar", "121", ""],
  ["1", "Ímpar", "123", ""],
  ["1", "Ímpar", "125", ""],
  ["1", "Ímpar", "127", ""],
  ["1", "Ímpar", "129", ""],
  ["2", "Par", "212", ""],
  ["2", "Par", "214", ""],
  ["2", "Par", "216", ""],
  ["2", "Par", "218", ""],
  ["2", "Par", "220", ""],
  ["2", "Par", "222", ""],
  ["2", "Par", "224", ""],
  ["2", "Par", "226", ""],
  ["2", "Par", "228", ""],
  ["2", "Par", "230", ""],
  ["2", "Ímpar", "213B", ""],
  ["2", "Ímpar", "213C", "Laboratório de Química"],
  ["2", "Ímpar", "215", ""],
  ["2", "Ímpar", "217", ""],
  ["2", "Ímpar", "219", ""],
  ["2", "Ímpar", "221", ""],
  ["2", "Ímpar", "223", ""],
  ["2", "Ímpar", "225", ""],
  ["2", "Ímpar", "227", ""],
  ["2", "Ímpar", "229", ""],
  ["3", "Par", "302", "DANCEP"],
  ["3", "Par", "304", "INFOCEP"],
  ["3", "Par", "306", "Setor de Estágio"],
  ["3", "Par", "312", "Laboratório de Informática"],
  ["3", "Par", "314", "Laboratório de Informática"],
  ["3", "Par", "316", "Laboratório de Informática"],
  ["3", "Par", "318", "Laboratório de PAV"],
  ["3", "Par", "320", "Sala de Pranchetas - TE"],
  ["3", "Par", "322", "Sala de Teatro Iara"],
  ["3", "Par", "324", "Laboratório de Línguas"],
  ["3", "Par", "326", "SRM - DI / AHSD"],
  ["3", "Par", "328", "Sala do Coro"],
  ["3", "Par", "330", "Sala de Humanidades"],
  ["3", "Par", "308", "Torre - DANCEP"],
  ["3", "Ímpar", "303", "Cordenação do CELEM"],
  ["3", "Ímpar", "305", "Cordenação de História"],
  ["3", "Ímpar", "313", "Laboratório de Matemática"],
  ["3", "Ímpar", "311A", "Laboratório de Biologia"],
  ["3", "Ímpar", "315", ""],
  ["3", "Ímpar", "317", ""],
  ["3", "Ímpar", "319", ""],
  ["3", "Ímpar", "321", ""],
  ["3", "Ímpar", "323", ""],
  ["3", "Ímpar", "325", ""],
  ["3", "Ímpar", "327", ""],
  ["3", "Ímpar", "329", ""],
  ["3", "Ímpar", "307", "Torre - Orquestra"],
];

// define uma linha simples com os três turnos
type LinhaEnsalamento = readonly [
  andar: string,
  ala: string,
  numero: string,
  manha: string,
  tarde: string,
  noite: string,
];

// ensalamentos copiados do mapa de 2026
const linhasEnsalamentos: LinhaEnsalamento[] = [
  ["1", "Par", "114", "Reforço", "Reforço", ""],
  ["1", "Par", "116", "Reforço", "Reforço", ""],
  ["1", "Par", "118", "3A", "1A", ""],
  ["1", "Par", "120", "3B", "1B", ""],
  ["1", "Par", "122", "3C", "1C", ""],
  ["1", "Par", "124", "3D", "1D", ""],
  ["1", "Par", "126", "3E", "1E", ""],
  ["1", "Par", "128", "3F", "1F", ""],
  ["1", "Par", "130", "3G", "1J", ""],
  ["1", "Ímpar", "113B", "CELEM", "CURCEP", "PAV"],
  ["1", "Ímpar", "115", "2PD", "6A", "1PAV"],
  ["1", "Ímpar", "117", "3PD", "6B", "3PAV"],
  ["1", "Ímpar", "119", "2DS", "6C", "1TE"],
  ["1", "Ímpar", "121", "3DS", "7A", "4TE"],
  ["1", "Ímpar", "123", "2TT", "7B", "1SB"],
  ["1", "Ímpar", "125", "3TT", "7C", "4SB"],
  ["1", "Ímpar", "127", "2TE", "8A", "1TT"],
  ["1", "Ímpar", "129", "3TE", "8B", "3TT"],
  ["2", "Par", "212", "3H", "1H", ""],
  ["2", "Par", "214", "3I", "1I", ""],
  ["2", "Par", "216", "3J", "1G", ""],
  ["2", "Par", "218", "3K", "1K", ""],
  ["2", "Par", "220", "3L", "1L", ""],
  ["2", "Par", "222", "3M", "1M", ""],
  ["2", "Par", "224", "3N", "1N", ""],
  ["2", "Par", "226", "3O", "1O", ""],
  ["2", "Par", "228", "3P", "1P", ""],
  ["2", "Par", "230", "3Q", "1Q", ""],
  ["2", "Ímpar", "213B", "CELEM", "CURCEP", "CURCEP"],
  ["2", "Ímpar", "215", "2A", "8C", "1A"],
  ["2", "Ímpar", "217", "2B", "9A", "1B"],
  ["2", "Ímpar", "219", "2C", "9B", "2A"],
  ["2", "Ímpar", "221", "2D", "9C", "2B"],
  ["2", "Ímpar", "223", "2E", "1PD", ""],
  ["2", "Ímpar", "225", "2F", "1DS", "1DS"],
  ["2", "Ímpar", "227", "2G", "1TT", "3A"],
  ["2", "Ímpar", "229", "2H", "1TE", "3B"],
  ["3", "Ímpar", "315", "2I", "2A", ""],
  ["3", "Ímpar", "317", "2J", "2B", ""],
  ["3", "Ímpar", "319", "2K", "3A", ""],
  ["3", "Ímpar", "321", "2L", "CELEM", "CELEM"],
  ["3", "Ímpar", "323", "2M", "CELEM", "CELEM"],
  ["3", "Ímpar", "325", "2N", "CELEM", "CELEM"],
  ["3", "Ímpar", "327", "2O", "CELEM", "CELEM"],
  ["3", "Ímpar", "329", "2P", "CELEM", "CELEM"],
];

// transforma as linhas simples em locais completos
export const locaisMapa2026: LocalMapaInicial[] = linhasLocais.map(
  ([andar, ala, numero, nome], indice) => ({
    chaveImportacao: chaveLocal(numero),
    nome: nome || `Sala ${numero}`,
    nomeNormalizado: normalizarTextoBusca(nome || `Sala ${numero}`),
    numero,
    numeroNormalizado: normalizarNumeroSala(numero),
    nomeAlternativo: nomeAlternativo(nome),
    nomeAlternativoNormalizado: normalizarTextoBusca(nomeAlternativo(nome)),
    tipo: tipoLocal(nome),
    ala,
    andar: `${andar}º andar`,
    ordem: indice + 1,
  }),
);

// relaciona cada coluna ao seu turno
const turnosPorColuna: TurnoMapa[] = ["manha", "tarde", "noite"];
// guarda uma única cópia de cada turma
const turmasPorChave = new Map<string, TurmaMapaInicial>();

// recebe os ensalamentos criados pelas linhas
export const ensalamentosMapa2026: EnsalamentoMapaInicial[] = [];

// percorre cada sala e seus turnos
for (const linha of linhasEnsalamentos) {
  const numero = linha[2];
  // percorre as três colunas de turno
  for (let indiceTurno = 0; indiceTurno < turnosPorColuna.length; indiceTurno += 1) {
    const turno = turnosPorColuna[indiceTurno];
    const nome = linha[indiceTurno + 3];
    if (!nome) continue;

    // cria a chave única da turma
    const nomeNormalizado = normalizarTextoBusca(nome);
    const tipo = tipoAtividade(nome);
    const chaveTurma = `pdf2026:turma:${turno}:${nomeNormalizado}`;
    // cadastra a turma somente na primeira ocorrência
    if (!turmasPorChave.has(chaveTurma)) {
      const partes = separarTurma(nome);
      const aliases = criarAliases(nome);
      turmasPorChave.set(chaveTurma, {
        chaveImportacao: chaveTurma,
        nome,
        nomeNormalizado,
        aliases,
        aliasesNormalizados: aliasesNormalizados(aliases),
        turno,
        tipo,
        curso: "",
        serie: partes.serie,
        turma: partes.turma,
        ordem: turmasPorChave.size + 1,
      });
    }

    // relaciona a turma com a sala e o turno
    ensalamentosMapa2026.push({
      chaveImportacao: `pdf2026:ensalamento:${turno}:${nomeNormalizado}:${normalizarNumeroSala(numero)}`,
      chaveTurma,
      chaveLocal: chaveLocal(numero),
      turno,
      tipo,
      ordem: ensalamentosMapa2026.length + 1,
    });
  }
}

// transforma o mapa de turmas em uma lista
export const turmasMapa2026 = [...turmasPorChave.values()];

// confirma as quantidades verificadas na fonte
if (locaisMapa2026.length !== 67 || turmasMapa2026.length !== 100 || ensalamentosMapa2026.length !== 112) {
  throw new Error("A carga do mapa de 2026 não corresponde às quantidades verificadas no PDF.");
}

// cria a chave única de um local
function chaveLocal(numero: string) {
  return `pdf2026:local:${normalizarNumeroSala(numero)}`;
}

// descobre o tipo de um local pelo nome
function tipoLocal(nome: string) {
  if (/^laboratório\b/i.test(nome)) return "laboratorio";
  if (/^(sala dos professores|setor de estágio|cordenação)\b/i.test(nome)) {
    return "setor_administrativo";
  }
  return nome ? "outro" : "sala_aula";
}

// corrige um nome alternativo conhecido
function nomeAlternativo(nome: string) {
  return nome.startsWith("Cordenação") ? nome.replace("Cordenação", "Coordenação") : "";
}

// descobre o tipo de uma atividade pelo nome
function tipoAtividade(nome: string) {
  if (nome === "CELEM") return "idiomas";
  if (nome === "Reforço") return "outro";
  return "aula_regular";
}

// separa a série e a letra de uma turma
function separarTurma(nome: string) {
  // procura um número seguido por letras
  const partes = nome.match(/^(\d+)([A-Z]+)$/);
  return partes ? { serie: partes[1], turma: partes[2] } : { serie: "", turma: "" };
}

// cria formas alternativas de escrever uma turma
function criarAliases(nome: string) {
  // separa a série e a letra quando possível
  const partes = nome.match(/^(\d+)([A-Z]+)$/);
  if (!partes) return "";
  const [, serie, turma] = partes;
  return `${serie}º ${turma}, ${serie}° ${turma}, ${serie} ${turma}`;
}
