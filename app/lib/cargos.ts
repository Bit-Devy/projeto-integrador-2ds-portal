// reúne os cargos do estatuto e as áreas que cada um pode administrar
export const areasPainel = [
  { chave: "geral", nome: "Gestão geral" },
  { chave: "colegio", nome: "Colégio e comunidade escolar" },
  { chave: "social", nome: "Social" },
  { chave: "financeiro", nome: "Tesouraria e prestação de contas" },
  { chave: "comunicacao", nome: "Comunicação e imprensa" },
  { chave: "esportes", nome: "Esporte e lazer" },
  { chave: "saude", nome: "Saúde e meio ambiente" },
  { chave: "cultura", nome: "Cultura e diversidade" },
  { chave: "academico", nome: "Relações acadêmicas" },
  { chave: "tecnico", nome: "Educação técnica profissional" },
  { chave: "eleitoral", nome: "Comissão Eleitoral" },
] as const;
export type AreaPainel = typeof areasPainel[number]["chave"];
export type RecursoPainel = "geral" | "noticias" | "projetos" | "membros" | "movimentos" | "documentos" | "oficiais" | "arquivos" | "canais" | "eventos" | "interclasses" | "reunioes" | "representantes" | "mapa" | "turmas" | "mensagens";
export type CargoPainel = { chave: string; nome: string; artigo: string; descricao: string; area: AreaPainel; editar: RecursoPainel[]; consultar: RecursoPainel[]; publicos?: boolean };
const todos: RecursoPainel[] = ["noticias", "projetos", "membros", "movimentos", "documentos", "oficiais", "arquivos", "canais", "eventos", "interclasses", "reunioes", "representantes", "mapa", "turmas", "mensagens"];
const secretaria: RecursoPainel[] = ["noticias", "documentos", "arquivos", "reunioes", "representantes", "mapa", "turmas"];
const publicacoes: RecursoPainel[] = ["noticias", "projetos", "eventos", "arquivos", "documentos"];
function cargo(chave: string, nome: string, artigo: string, descricao: string, area: AreaPainel, editar: RecursoPainel[], consultar: RecursoPainel[] = [], publicos = false): CargoPainel {
  return { chave, nome, artigo, descricao, area, editar, consultar, publicos };
}
export const cargosPainel: CargoPainel[] = [
  cargo("geral", "Administração geral", "Acesso técnico", "Painel completo, documentos oficiais e registro de senhas", "geral", ["geral", ...todos]),
  cargo("presidente", "Presidente", "Art. 46", "Coordenação da gestão e de todas as áreas, sem administrar senhas", "geral", todos),
  cargo("vice-presidente", "Vice-Presidente", "Art. 47", "Coordenação e substituição da presidência, sem administrar senhas", "geral", todos),
  cargo("primeiro-secretario", "Primeiro-Secretário", "Art. 48", "Avisos, convocações, atas, documentos, representantes e turmas", "geral", secretaria),
  cargo("segundo-secretario", "Segundo-Secretário", "Art. 49", "Auxílio à secretaria e manutenção dos registros", "geral", secretaria),
  cargo("primeiro-tesoureiro", "Primeiro-Tesoureiro", "Art. 50", "Lançamentos financeiros e documentos de prestação de contas", "financeiro", ["movimentos", "documentos", "arquivos"]),
  cargo("segundo-tesoureiro", "Segundo-Tesoureiro", "Art. 51", "Auxílio à tesouraria e prestação de contas", "financeiro", ["movimentos", "documentos", "arquivos"]),
  cargo("social", "Diretoria Social", "Art. 52", "Notícias, projetos, eventos e documentos da área social", "social", publicacoes),
  cargo("comunicacao", "Diretoria de Assuntos de Comunicação e Imprensa", "Art. 53", "Notícias e divulgação de todas as áreas, canais oficiais e mensagens", "comunicacao", ["noticias", "projetos", "eventos", "documentos", "arquivos", "canais", "mensagens"]),
  cargo("esportes", "Diretoria de Assuntos de Esporte e Lazer", "Art. 54", "Campeonatos, interclasses e publicações de esporte e lazer", "esportes", [...publicacoes, "interclasses"], ["mapa", "turmas"]),
  cargo("saude", "Diretoria de Saúde e Meio Ambiente", "Art. 55", "Publicações, projetos e eventos de saúde e meio ambiente", "saude", publicacoes),
  cargo("cultura", "Diretoria de Assuntos Culturais e Diversidade", "Art. 56", "Publicações, projetos e eventos culturais e de diversidade", "cultura", publicacoes),
  cargo("academico", "Diretoria de Relações Acadêmicas", "Art. 57", "Publicações, projetos e eventos acadêmicos", "academico", publicacoes, ["mapa", "turmas"]),
  cargo("tecnico", "Diretoria de Educação Técnica Profissional", "Art. 58", "Publicações, projetos e eventos dos cursos técnicos", "tecnico", publicacoes, ["mapa", "turmas"]),
  ...["manha", "tarde", "noite"].map((turno) => cargo(`conselho-fiscal-${turno}`, `Conselho Fiscal — ${turno === "manha" ? "manhã" : turno}`, "Arts. 70 e 74", "Consulta aos registros financeiros, documentos e reuniões, sem alterar as contas; duas senhas para efetivo e suplente", "geral", [], ["movimentos", "documentos", "arquivos", "reunioes"])),
  cargo("coe-presidente", "Comissão Eleitoral — Presidente", "Arts. 95 e 96", "Publicações, documentos e reuniões do processo eleitoral", "eleitoral", ["noticias", "projetos", "eventos", "documentos", "arquivos", "reunioes"]),
  cargo("coe-vice-presidente", "Comissão Eleitoral — Vice-Presidente", "Arts. 95 e 96", "Organização e publicações do processo eleitoral", "eleitoral", ["noticias", "projetos", "eventos", "documentos", "arquivos", "reunioes"]),
  cargo("coe-secretario", "Comissão Eleitoral — Secretário-Geral", "Art. 97", "Atas, avisos, documentos e reuniões eleitorais", "eleitoral", ["noticias", "documentos", "arquivos", "reunioes"]),
  cargo("coe-midia", "Comissão Eleitoral — Gestor Midiático", "Art. 98", "Notícias e materiais de comunicação do processo eleitoral", "eleitoral", ["noticias", "documentos", "arquivos"]),
  cargo("apoio", "Apoio da diretoria e apoio temporário", "Arts. 64 a 68", "Consulta às publicações; o estatuto não concede poder de decisão ao apoio", "geral", [], ["noticias", "projetos", "eventos", "documentos"], true),
];

// mantém a administração e a presidência fora das alterações manuais
export const cargosProtegidos = ["geral", "presidente", "vice-presidente"];
export type PermissoesCargo = Pick<CargoPainel, "editar" | "consultar" | "publicos">;
export const menusGerenciaveis: Array<{ chave: RecursoPainel; nome: string }> = [
  { chave: "noticias", nome: "Notícias" }, { chave: "projetos", nome: "Projetos" },
  { chave: "membros", nome: "Equipe" }, { chave: "movimentos", nome: "Transparência" },
  { chave: "documentos", nome: "Documentos — publicações" }, { chave: "arquivos", nome: "Documentos — biblioteca de arquivos" },
  { chave: "oficiais", nome: "Documentos — estatuto e regimento" }, { chave: "canais", nome: "Canais de contato" },
  { chave: "eventos", nome: "Eventos internos" }, { chave: "interclasses", nome: "Interclasses e campeonatos" },
  { chave: "reunioes", nome: "Reuniões, atas e presenças" }, { chave: "representantes", nome: "Representantes" },
  { chave: "turmas", nome: "Turmas" }, { chave: "mapa", nome: "Mapa e ensalamento" }, { chave: "mensagens", nome: "Mensagens recebidas" },
];

// usa apenas os menus conhecidos e nunca permite repassar a administração
export function cargoComPermissoes(chave: string, permissoes?: PermissoesCargo): CargoPainel | undefined {
  const padrao = obterCargo(chave);
  if (!padrao || !permissoes || cargosProtegidos.includes(chave)) return padrao;
  const permitidos = new Set(menusGerenciaveis.map((item) => item.chave));
  return { ...padrao, editar: permissoes.editar.filter((item) => permitidos.has(item)), consultar: permissoes.consultar.filter((item) => permitidos.has(item)), publicos: permissoes.publicos ?? false };
}

// mantém as regras iguais no menu e no servidor
export function obterCargo(chave: string) { return cargosPainel.find((item) => item.chave === chave); }
export function podeAcessar(cargoRecebido: string, recurso: RecursoPainel, escrita = false, permissoes?: PermissoesCargo) {
  if (recurso === "geral") return cargoRecebido === "geral";
  const cargo = cargoComPermissoes(cargoRecebido, permissoes);
  return Boolean(cargo && (cargo.editar.includes(recurso) || (!escrita && cargo.consultar.includes(recurso))));
}
export function areaRestrita(cargoRecebido: string): AreaPainel | null {
  const cargo = obterCargo(cargoRecebido);
  return !cargo || cargo.area === "geral" || cargo.chave === "comunicacao" ? null : cargo.area;
}
export function recursoConteudo(tipo: string): RecursoPainel {
  return ({ noticias: "noticias", projetos: "projetos", membros: "membros", movimentos: "movimentos", documentos: "documentos", canais: "canais", eventos: "eventos" } as Record<string, RecursoPainel>)[tipo] || "geral";
}
