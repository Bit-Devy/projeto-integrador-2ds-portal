// encontra o ano atual sem prender o portal a uma gestão
export function anoDoPortal(data = new Date()) {
  return Number(new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(data));
}

// aceita todos os anos ou um ano válido informado no endereço
export function anoInicial(valor?: string) {
  return valor === "todos" || /^(19|20|21)\d{2}$/.test(valor || "") ? valor! : String(anoDoPortal());
}

// reúne o histórico e permite preparar o próximo ano
export function anosDisponiveis(datas: string[], selecionado: string, atual = anoDoPortal()) {
  const ano = Number(selecionado) || atual;
  return [...new Set([atual, atual + 1, ano - 1, ano, ano + 1, ...datas.map((data) => Number(data.slice(0, 4)))])]
    .filter((valor) => Number.isInteger(valor) && valor >= 1900 && valor <= 2199)
    .sort((a, b) => b - a);
}

// filtra um período mantendo os outros registros no banco
export function pertenceAoAno(data: string, ano: string) {
  return ano === "todos" || data.slice(0, 4) === ano;
}

// confere o prazo do destaque até o final do dia no paraná
export function destaqueValido(noticia: { destaque: boolean; destaqueAte?: string }, agora = new Date()) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
  return noticia.destaque && (!noticia.destaqueAte || noticia.destaqueAte >= hoje);
}
