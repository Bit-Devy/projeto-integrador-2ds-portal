// confirma apenas destaques cujo prazo ainda não terminou
import { tempoRestanteDestaque } from "../conteudo/prazo-destaque";
import { confirmarNoPainel } from "./confirmacao-painel";

export async function confirmarEncerramentoDestaque(prazo?: string, aoSalvar = false) {
  const tempo = prazo ? tempoRestanteDestaque(prazo) : null;
  if (!tempo) return true;
  const restante = tempo.menosDeUmaHora ? "Falta menos de 1 hora" : `Faltam ${tempo.dias} ${tempo.dias === 1 ? "dia" : "dias"} e ${tempo.horas} ${tempo.horas === 1 ? "hora" : "horas"}`;
  return confirmarNoPainel("Encerrar destaque antes do prazo?", `${restante} para o fim do destaque. Tem certeza de que deseja encerrar antes do prazo?${aoSalvar ? " A alteração será aplicada ao salvar a notícia." : ""}`, "Encerrar destaque", "Manter destaque");
}
