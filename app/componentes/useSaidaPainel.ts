"use client";

// protege os links e o botão voltar enquanto há alterações no editor
import { useEffect } from "react";
import { confirmarSaida, autorizarNavegacaoPainel } from "./painel-eventos-comum";

export function useSaidaPainel(mudou: boolean) {
  useEffect(() => {
    if (!mudou) return;
    const endereco = window.location.href;
    const estadoAnterior = window.history.state;
    const marca = crypto.randomUUID();
    let saindo = false;
    let removendo = false;
    const estadoGuardado = { ...(estadoAnterior || {}), protecaoGecep: marca };
    window.history.pushState(estadoGuardado, "", endereco);

    // retira a proteção sem disparar uma navegação do roteador para a mesma página
    function removerProtecao(continuar?: () => void) {
      if (removendo) return;
      removendo = true; saindo = true;
      document.removeEventListener("click", protegerLink, true);
      window.removeEventListener("popstate", protegerVolta, true);
      if (window.history.state?.protecaoGecep === marca && window.location.href === endereco) {
        window.addEventListener("popstate", (evento) => { evento.stopImmediatePropagation(); continuar?.(); }, { capture: true, once: true });
        window.history.back();
      } else continuar?.();
    }

    // confirma antes de usar os links do menu do cabeçalho ou do rodapé
    async function protegerLink(evento: MouseEvent) {
      if (saindo || evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      const origem = evento.target instanceof Element ? evento.target : null;
      const link = origem?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const recebido = link.getAttribute("href");
      if (!recebido || recebido.startsWith("#")) return;
      const destino = new URL(link.href, endereco);
      if (!["http:", "https:"].includes(destino.protocol)) return;
      if (destino.pathname === location.pathname && destino.search === location.search && destino.hash) return;
      evento.preventDefault(); evento.stopImmediatePropagation();
      if (!await confirmarSaida(true)) return;
      autorizarNavegacaoPainel(); removerProtecao(() => window.location.assign(destino.href));
    }

    // mantém o formulário no lugar ao cancelar o botão voltar do navegador
    async function protegerVolta(evento: PopStateEvent) {
      if (saindo) return;
      evento.stopImmediatePropagation();
      window.history.pushState(estadoGuardado, "", endereco);
      if (!await confirmarSaida(true)) return;
      saindo = true;
      autorizarNavegacaoPainel();
      window.history.go(-2);
    }
    document.addEventListener("click", protegerLink, true);
    window.addEventListener("popstate", protegerVolta, true);
    return () => {
      document.removeEventListener("click", protegerLink, true);
      window.removeEventListener("popstate", protegerVolta, true);
      if (!saindo) removerProtecao();
    };
  }, [mudou]);
}
