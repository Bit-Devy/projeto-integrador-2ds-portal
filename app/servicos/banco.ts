// consulta configurações sem guardar versões antigas das chaves de ativação
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";
import { modulosPadrao, type CalendarioEscolar, type ModuloPortal, type ModulosPortal } from "./tipos";
import { completarCalendario } from "./calendario";

export async function obterModulos(): Promise<ModulosPortal> {
  await garantirBanco();
  const linha = await getD1().prepare("SELECT dados_json FROM modulos_portal WHERE chave = 'paginas'").first<{ dados_json: string }>();
  const dados = linha ? JSON.parse(linha.dados_json) : {};
  return Object.fromEntries(Object.entries(modulosPadrao).map(([chave, padrao]) => [chave, typeof dados[chave] === "boolean" ? dados[chave] : padrao])) as ModulosPortal;
}
export function moduloAtivo(modulos: ModulosPortal, chave: ModuloPortal) {
  return modulos[chave] && (!["merenda", "apmf", "gecep", "robotica"].includes(chave) || modulos.cantina);
}
export async function obterCalendarios(todos = false) {
  await garantirBanco();
  const linhas = await getD1().prepare(`SELECT dados_json, atualizado_em FROM calendarios_escolares ${todos ? "" : "WHERE publicado = 1"} ORDER BY ano DESC, modalidade`).all<{ dados_json: string; atualizado_em: string }>();
  return linhas.results.map((linha) => completarCalendario({ ...JSON.parse(linha.dados_json), atualizadoEm: linha.atualizado_em } as CalendarioEscolar));
}
