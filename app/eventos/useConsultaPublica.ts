"use client";

import { useCallback, useEffect, useState } from "react";

type EstadoConsulta<T> = {
  dados: T | null;
  carregando: boolean;
  erro: string;
  recarregar: () => void;
};

// consulta os dados públicos sem mostrar uma resposta antiga durante a busca
export function useConsultaPublica<T>(url: string, habilitada = true): EstadoConsulta<T> {
  const [tentativa, setTentativa] = useState(0);
  const chave = `${url}\u0000${tentativa}`;
  const [resultado, setResultado] = useState<{ chave: string; dados: T | null; erro: string }>({ chave: "", dados: null, erro: "" });

  const recarregar = useCallback(() => setTentativa((valor) => valor + 1), []);

  useEffect(() => {
    if (!habilitada) return;
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
  }, [chave, url, habilitada]);

  const carregando = habilitada && resultado.chave !== chave;
  return {
    dados: !habilitada || carregando ? null : resultado.dados,
    carregando,
    erro: !habilitada || carregando ? "" : resultado.erro,
    recarregar,
  };
}
