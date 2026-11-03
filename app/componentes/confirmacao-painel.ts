// abre uma confirmação acessível do site sem bloquear o navegador
let aberta = false;
export function confirmarNoPainel(titulo: string, mensagem: string, confirmar = "Descartar e continuar", cancelar = "Continuar editando"): Promise<boolean> {
  if (aberta) return Promise.resolve(false);
  aberta = true;
  return new Promise((resolver) => {
    const anterior = document.activeElement;
    const dialogo = document.createElement("dialog");
    dialogo.className = "dialogo-anonimato";
    const cabecalho = document.createElement("h2");
    cabecalho.id = `confirmacao-${crypto.randomUUID()}`;
    cabecalho.textContent = titulo;
    dialogo.setAttribute("aria-labelledby", cabecalho.id);
    const texto = document.createElement("p"); texto.textContent = mensagem;
    const acoes = document.createElement("div"); acoes.className = "acoes-dialogo-anonimato";
    function terminar(resultado: boolean) {
      dialogo.close(); dialogo.remove(); aberta = false;
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
      resolver(resultado);
    }
    const voltar = document.createElement("button"); voltar.type = "button"; voltar.className = "botao-secundario"; voltar.textContent = cancelar; voltar.onclick = () => terminar(false);
    const prosseguir = document.createElement("button"); prosseguir.type = "button"; prosseguir.className = "botao-primario"; prosseguir.textContent = confirmar; prosseguir.onclick = () => terminar(true);
    dialogo.addEventListener("cancel", (evento) => { evento.preventDefault(); terminar(false); });
    acoes.append(voltar, prosseguir); dialogo.append(cabecalho, texto, acoes); document.body.append(dialogo);
    dialogo.showModal(); voltar.focus();
  });
}
