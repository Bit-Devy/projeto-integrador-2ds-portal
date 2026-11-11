// separa o ano de publicação da série escolar e mantém os cadastros permanentes
import { anoDoPortal } from "./periodos";

export const tiposComAno = ["projetos", "membros", "agenda", "cardapios", "oportunidades"];
export function anoDoRegistro(dados: Record<string, unknown>, criadoEm = "", atual = anoDoPortal()) {
  const data = String(dados.data || dados.dataInicial || dados.dataDocumento || "");
  const numero = Number(data.slice(0, 4) || dados.ano || criadoEm.slice(0, 4) || atual);
  return Number.isInteger(numero) && numero >= 1900 && numero <= 2199 ? numero : atual;
}
export function registroDeOutroAno(dados: Record<string, unknown>, criadoEm = "", atual = anoDoPortal()) { return anoDoRegistro(dados, criadoEm, atual) !== atual; }
