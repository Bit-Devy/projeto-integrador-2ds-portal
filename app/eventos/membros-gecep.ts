// guarda os nomes da equipe na data da reunião
import { listarMembrosEquipe } from "../conteudo/equipe";
import { obterCargo } from "../lib/cargos";
import { ErroEventos, objetoRecebido } from "./validacao";

export type MembroGecepPresente = {
  membroId: number;
  cargoChave: string;
  vaga: string;
  nome: string;
  cargo: string;
  vagaNome: string;
  turno: string;
  confirmado?: boolean;
};

// lê o retrato salvo sem consultar ocupantes que podem ter mudado
export function lerMembrosGecep(valor: unknown): MembroGecepPresente[] {
  try {
    const itens = typeof valor === "string" ? JSON.parse(valor) : valor;
    return Array.isArray(itens) ? itens.filter((item) => item && Number.isSafeInteger(item.membroId) && typeof item.nome === "string" && typeof item.cargoChave === "string" && typeof item.vaga === "string") : [];
  } catch { return []; }
}

// aceita novas presenças somente de pessoas publicadas na equipe
export async function prepararMembrosGecep(valor: unknown, anteriores: MembroGecepPresente[], publicado: boolean): Promise<MembroGecepPresente[]> {
  if (valor === undefined) valor = anteriores;
  if (!Array.isArray(valor) || valor.length > 200) throw new ErroEventos("Escolha uma lista válida de membros do GECEP presentes.");
  const equipe = await listarMembrosEquipe();
  const encontrados = new Set<number>();
  return valor.map((recebido) => {
    const item = objetoRecebido(recebido);
    const membroId = Number(item.membroId);
    const cargoChave = String(item.cargoChave || "");
    const vaga = String(item.vaga || "");
    if (typeof item.membroId !== "number" || !Number.isSafeInteger(membroId) || membroId < 1 || !obterCargo(cargoChave) || encontrados.has(membroId)) throw new ErroEventos("Escolha cada integrante apenas uma vez, usando um cargo válido.");
    encontrados.add(membroId);
    const anterior = anteriores.find((membro) => membro.membroId === membroId && membro.cargoChave === cargoChave && membro.vaga === vaga);
    const atual = equipe.find((membro) => membro.id === membroId && membro.cargoChave === cargoChave && membro.vaga === vaga);
    if (!atual && !anterior?.confirmado) throw new ErroEventos(`Cadastre e publique o integrante de ${obterCargo(cargoChave)!.nome} em Equipe antes de publicar esta ata.`);
    if (anterior) return { ...anterior, confirmado: Boolean(anterior.confirmado || publicado) };
    return { membroId, cargoChave, vaga, nome: atual!.nome, cargo: atual!.cargo, vagaNome: atual!.vagaNome, turno: atual!.turno, confirmado: publicado };
  });
}
