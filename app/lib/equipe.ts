// usa os mesmos cargos do registro de senhas para compor a equipe
import { cargosPainel, obterCargo } from "./cargos";

export type VagaEquipe = { chave: string; nome: string };
export type MembroEquipePresenca = {
  id: number;
  nome: string;
  cargoChave: string;
  cargo: string;
  vaga: string;
  vagaNome: string;
  turno: string;
};

const diretoriasDuplas = new Set(["social", "comunicacao", "esportes", "saude", "cultura", "academico", "tecnico"]);
export const turnosEquipe = [{ chave: "", nome: "Não informado" }, { chave: "manha", nome: "Manhã" }, { chave: "tarde", nome: "Tarde" }, { chave: "noite", nome: "Noite" }] as const;

// segue as vagas dos artigos 43, 44 e 70 sem limitar os apoios voluntários
export function vagasDoCargo(chave: string): VagaEquipe[] {
  if (!obterCargo(chave)) return [];
  if (diretoriasDuplas.has(chave)) return [{ chave: "diretor-1", nome: "Diretor 1" }, { chave: "diretor-2", nome: "Diretor 2" }];
  if (chave.startsWith("conselho-fiscal-")) return [{ chave: "efetivo", nome: "Efetivo" }, { chave: "suplente", nome: "Suplente" }];
  if (chave === "apoio") return [{ chave: "apoio", nome: "Apoio voluntário" }];
  if (chave === "geral") return [1, 2, 3].map((numero) => ({ chave: `tecnico-${numero}`, nome: `Responsável técnico ${numero}` }));
  return [{ chave: "titular", nome: "Titular" }];
}

// identifica registros antigos apenas quando o nome corresponde a um cargo conhecido
function simplificar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function obterCargoEquipe(dados: Record<string, unknown>) {
  if (typeof dados.cargoChave === "string" && dados.cargoChave) return obterCargo(dados.cargoChave);
  const nome = simplificar(String(dados.cargo || ""));
  const correspondencia = cargosPainel.find((cargo) => simplificar(cargo.nome) === nome);
  if (correspondencia) return correspondencia;
  const aliases: Record<string, string> = {
    "diretor social": "social", "diretora social": "social", "diretor de esportes": "esportes", "diretora de esportes": "esportes",
    "diretor de comunicacao": "comunicacao", "diretora de comunicacao": "comunicacao", "diretor de cultura": "cultura", "diretora de cultura": "cultura",
    "diretor de saude e meio ambiente": "saude", "diretora de saude e meio ambiente": "saude", "apoio": "apoio",
  };
  return obterCargo(aliases[nome] || "");
}

// deixa o turno do conselho fiscal ligado ao próprio cargo
export function turnoDoCargo(chave: string) {
  return chave.startsWith("conselho-fiscal-") ? chave.slice("conselho-fiscal-".length) : "";
}

// preserva os nomes públicos e identifica a vaga quando o registro já a informa
export function dadosMembroEquipe(id: number, dados: Record<string, unknown>): MembroEquipePresenca | null {
  const cargo = obterCargoEquipe(dados);
  if (!cargo || !String(dados.nome || "").trim()) return null;
  const vagas = vagasDoCargo(cargo.chave);
  const vaga = vagas.find((item) => item.chave === dados.vaga) || (!dados.vaga && vagas.length === 1 ? vagas[0] : undefined);
  if (!vaga) return null;
  return { id, nome: String(dados.nome).trim(), cargoChave: cargo.chave, cargo: cargo.nome, vaga: vaga.chave, vagaNome: vaga.nome, turno: turnoDoCargo(cargo.chave) || (turnosEquipe.some((turno) => turno.chave === dados.turno) ? String(dados.turno || "") : "") };
}
