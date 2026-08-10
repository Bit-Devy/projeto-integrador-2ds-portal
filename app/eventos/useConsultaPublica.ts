"use client";

import { useCallback, useEffect, useState } from "react";

type EstadoConsulta<T> = {
  dados: T | null;
  carregando: boolean;
  erro: string;
  recarregar: () => void;
};

// Consulta uma API pública sem manter dados antigos ou demonstrativos como fallback.
export function useConsultaPublica<T>(url: string): EstadoConsulta<T> {
  const [tentativa, setTentativa] = useState(0);
  const chave = `${url}\u0000${tentativa}`;
  const [resultado, setResultado] = useState<{ chave: string; dados: T | null; erro: string }>({ chave: "", dados: null, erro: "" });

  const recarregar = useCallback(() => setTentativa((valor) => valor + 1), []);

  useEffect(() => {
    const controle = new AbortController();

    fetch(url, { signal: controle.signal, cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => null) as { erro?: string } | null;
          throw new Error(corpo?.erro || "Não foi possível carregar as informações.");
        }
        return resposta.json() as Promise<T>;
      })
      .then((dados) => setResultado({ chave, dados, erro: "" }))
      .catch((motivo: unknown) => {
        if (motivo instanceof Error && motivo.name === "AbortError") return;
        setResultado({
          chave,
          dados: null,
          erro: motivo instanceof Error ? motivo.message : "Não foi possível carregar as informações.",
        });
      });

    return () => controle.abort();
  }, [chave, url]);

  const carregando = resultado.chave !== chave;
  return {
    dados: carregando ? null : resultado.dados,
    carregando,
    erro: carregando ? "" : resultado.erro,
    recarregar,
  };
}
