// confere os campos dos serviços antes de gravar uma publicação
import { ErroJsonInvalido } from "../lib/corpo-json";
import { dataValida } from "./calendario";

export function validarServico(tipo: string, dados: Record<string, unknown>) {
  const falhar = (mensagem: string): never => { throw new ErroJsonInvalido(mensagem); };
  if (["agenda", "cardapios", "oportunidades"].includes(tipo) && !dataValida(String(dados.data || ""))) falhar("Informe uma data válida.");
  if (["agenda", "cardapios"].includes(tipo)) {
    dados.dataFim ||= dados.data;
    if (!dataValida(String(dados.dataFim)) || String(dados.dataFim) < String(dados.data) || Date.parse(String(dados.dataFim)) - Date.parse(String(dados.data)) > 366 * 86400000) falhar("Informe um período de até um ano, com o fim depois do início.");
  }
  if (tipo === "agenda") {
    if (!["anual", "semestral", "ambos"].includes(String(dados.modalidade))) falhar("Escolha para qual calendário esta data aparece.");
    if (dados.horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(dados.horario))) falhar("Informe um horário válido.");
    if (String(dados.descricao || "").length > 1600) falhar("Use uma descrição de até 1600 caracteres.");
  }
  if (tipo === "cardapios") {
    if (!["merenda", "apmf", "gecep", "robotica"].includes(String(dados.categoria))) falhar("Escolha um setor válido da cantina.");
    if (!["todos", "manha", "tarde", "noite"].includes(String(dados.turno))) falhar("Escolha um turno válido.");
    if (dados.preco && (!/^\d{1,5}([.,]\d{1,2})?$/.test(String(dados.preco)) || Number(String(dados.preco).replace(",", ".")) < 0)) falhar("Informe um preço válido ou deixe vazio.");
    if (dados.categoria === "merenda") dados.preco = "";
  }
  if (tipo === "oportunidades") {
    if (!["estagio", "emprego", "aprendiz", "concurso"].includes(String(dados.categoria)) || !["aberta", "encerrada", "suspensa"].includes(String(dados.situacao))) falhar("Escolha o tipo e a situação da oportunidade.");
    if (dados.prazo && (!dataValida(String(dados.prazo)) || String(dados.prazo) < String(dados.data))) falhar("O prazo precisa ser uma data igual ou posterior à publicação.");
    try { if (!["http:", "https:"].includes(new URL(String(dados.link)).protocol)) falhar("Informe o endereço completo para candidatura ou edital."); }
    catch { falhar("Informe o endereço completo para candidatura ou edital."); }
  }
}
