// protege o assunto dos registros além de proteger o menu
import { getD1 } from "../../db";
import { areaRestrita, areasPainel } from "./cargos";
import type { UsuarioPainel } from "./sessao";

export function areaPermitida(usuario: UsuarioPainel, area: unknown) {
  const restrita = areaRestrita(usuario.cargo);
  return !restrita || area === restrita;
}
export function escolherArea(usuario: UsuarioPainel, recebida: unknown, anterior = "geral") {
  const restrita = areaRestrita(usuario.cargo);
  if (restrita) return restrita;
  return areasPainel.some((area) => area.chave === recebida) ? String(recebida) : anterior;
}
export function erroArea() { return Response.json({ erro: "Este registro pertence a outra área do grêmio." }, { status: 403 }); }
export async function definirAreaRegistro(recurso: "eventos" | "reunioes", id: unknown, recebida: unknown, usuario: UsuarioPainel) {
  const tabela = recurso === "eventos" ? "eventos_internos" : "reunioes";
  const atual = await getD1().prepare(`SELECT area_responsavel FROM ${tabela} WHERE id = ?`).bind(Number(id)).first<{ area_responsavel: string }>();
  if (!atual) return "geral";
  const area = escolherArea(usuario, recebida, atual.area_responsavel);
  await getD1().prepare(`UPDATE ${tabela} SET area_responsavel = ? WHERE id = ?`).bind(area, Number(id)).run();
  return area;
}
