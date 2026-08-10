// ativa recursos do navegador
"use client";

// importa os recursos de estado e efeito do react
import { useEffect, useState } from "react";
// importa a ordenação dos conteúdos
import { ordenarConteudosMaisRecentes } from "./ordenacao";
// importa os tipos de conteúdo
import type { DadosPorTipo, TipoConteudo } from "./tipos";

// carrega conteúdos públicos mantendo dados iniciais como apoio
export function useConteudoPublico<T extends TipoConteudo>(
  tipo: T,
  dadosIniciais: DadosPorTipo[T][],
) {
  // guarda os dados ordenados e o estado de carregamento
  const [dados, setDados] = useState(() => ordenarConteudosMaisRecentes(dadosIniciais));
  const [carregando, setCarregando] = useState(true);

  // busca uma versão atualizada quando o tipo muda
  useEffect(() => {
    // permite cancelar a busca ao desmontar o componente
    const controle = new AbortController();

    // consulta os conteúdos públicos da api
    fetch(`/api/conteudo?tipo=${tipo}`, { signal: controle.signal })
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error("Conteúdo temporariamente indisponível.");
        // define o formato esperado da resposta
        return resposta.json() as Promise<{
          itens: Array<{
            id: number;
            dados: DadosPorTipo[T];
            publicado: boolean;
            criadoEm?: string;
          }>;
        }>;
      })
      .then((resultado) => {
        // junta os dados do item com os campos do registro
        setDados(ordenarConteudosMaisRecentes(
          resultado.itens.map((item) => ({
            ...item.dados,
            id: item.id,
            publicado: item.publicado,
            criadoEm: item.criadoEm,
          })),
        ));
      })
      .catch((erro) => {
        if (erro instanceof Error && erro.name === "AbortError") return;
        // mantém os dados do arquivo se o banco estiver fora do ar
      })
      .finally(() => setCarregando(false));

    // cancela a busca pendente ao sair
    return () => controle.abort();
  }, [tipo]);

  // devolve os dados e o estado da busca
  return { dados, carregando };
}
