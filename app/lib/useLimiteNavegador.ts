// ativa os recursos do navegador
"use client";

// importa o controle dos avisos e do tempo de espera
import { useCallback, useEffect, useState } from "react";
// importa os tipos dos limites
import type { AcaoLimitada, EstadoLimite } from "./limites-tipos";

// consulta o servidor e libera o formulário quando a espera termina
export function useLimiteNavegador(acao: AcaoLimitada) {
  const [limite, setLimite] = useState<EstadoLimite | null>(null);
  const [liberarEm, setLiberarEm] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState("");

  // atualiza o aviso usando o prazo devolvido pelo servidor
  const receberLimite = useCallback((recebido: EstadoLimite) => {
    setLimite(recebido);
    setLiberarEm(recebido.bloqueado ? Date.now() + recebido.tentarEm * 1000 : 0);
  }, []);

  // prepara o cookie e confere as tentativas antes de liberar o envio
  const atualizar = useCallback(async () => {
    setCarregando(true);
    setErroConsulta("");
    try {
      const resposta = await fetch(`/api/limites?acao=${acao}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Não foi possível verificar a disponibilidade. Tente novamente.");
      const dados = await resposta.json() as { limite: EstadoLimite };
      receberLimite(dados.limite);
    } catch {
      setErroConsulta("Não foi possível verificar a disponibilidade. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [acao, receberLimite]);

  // consulta o prazo ao abrir a página ou voltar para esta aba
  useEffect(() => {
    const inicio = setTimeout(() => { void atualizar(); }, 0);
    function aoVoltar() {
      if (document.visibilityState === "visible") void atualizar();
    }
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { clearTimeout(inicio); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [atualizar]);

  // confere novamente o servidor quando o bloqueio termina
  useEffect(() => {
    if (!liberarEm) return;
    const temporizador = setTimeout(() => { void atualizar(); }, Math.max(0, liberarEm - Date.now()) + 1000);
    return () => clearTimeout(temporizador);
  }, [liberarEm, atualizar]);

  return { limite, liberarEm, carregando, erroConsulta, atualizar, receberLimite };
}
