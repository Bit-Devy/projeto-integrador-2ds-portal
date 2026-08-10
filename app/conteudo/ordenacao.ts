// importa os tipos dos registros de conteúdo
import type { RegistroBase, RegistroConteudo } from "./tipos";

// define um conteúdo que pode ter uma data
type ConteudoComData = RegistroBase & {
  data?: string;
  dataDocumento?: string;
};

// ordena conteúdos simples do mais recente para o mais antigo
export function ordenarConteudosMaisRecentes<T>(itens: readonly T[]) {
  // escolhe a melhor data disponível para cada item
  return ordenar(itens, (item) => ({
    data: (item as ConteudoComData).data || (item as ConteudoComData).dataDocumento || (item as ConteudoComData).criadoEm || "",
    id: (item as ConteudoComData).id ?? 0,
  }));
}

// ordena registros do banco do mais recente para o mais antigo
export function ordenarRegistrosMaisRecentes<T extends RegistroConteudo>(itens: readonly T[]) {
  return ordenar(itens, (item) => {
    // lê as datas guardadas dentro dos dados do registro
    const dados = item.dados as ConteudoComData;
    return {
      data: dados.data || dados.dataDocumento || item.criadoEm || "",
      id: item.id,
    };
  });
}

// ordena uma cópia da lista pela data e depois pelo id
function ordenar<T>(itens: readonly T[], obterChave: (item: T) => { data: string; id: number }) {
  return [...itens].sort((itemA, itemB) => {
    // calcula as chaves usadas na comparação
    const chaveA = obterChave(itemA);
    const chaveB = obterChave(itemB);
    const diferencaData = chaveB.data.localeCompare(chaveA.data);
    return diferencaData || chaveB.id - chaveA.id;
  });
}
