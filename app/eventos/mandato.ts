import { dataDoPortal, dataSqlDoPortal } from "../conteudo/periodos";

// impede que mandatos antigos ou futuros apareçam como atuais
export function condicaoMandatoVigente(alias = "r", data = dataSqlDoPortal()) {
  return `(${alias}.inicio_mandato = '' OR ${alias}.inicio_mandato <= ${data})
    AND (${alias}.fim_mandato = '' OR ${alias}.fim_mandato >= ${data})`;
}

// confere o mesmo período nos resumos do painel
export function mandatoVigenteEm(item: { inicioMandato: string; fimMandato: string }, data = dataDoPortal()) {
  return (!item.inicioMandato || item.inicioMandato <= data) && (!item.fimMandato || item.fimMandato >= data);
}
