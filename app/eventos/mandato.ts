// impede que mandatos antigos ou futuros apareçam como atuais
export function condicaoMandatoVigente(alias = "r", data = "date('now')") {
  return `(${alias}.inicio_mandato = '' OR ${alias}.inicio_mandato <= ${data})
    AND (${alias}.fim_mandato = '' OR ${alias}.fim_mandato >= ${data})`;
}

// confere o mesmo período nos resumos do painel
export function mandatoVigenteEm(item: { inicioMandato: string; fimMandato: string }, data = new Date().toISOString().slice(0, 10)) {
  return (!item.inicioMandato || item.inicioMandato <= data) && (!item.fimMandato || item.fimMandato >= data);
}
