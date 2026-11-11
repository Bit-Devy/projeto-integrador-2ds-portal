// ativa recursos do navegador
"use client";

// importa os recursos de estado e efeito do react
import { useEffect, useState } from "react";
// importa a ordenação dos conteúdos
import { ordenarConteudosMaisRecentes } from "./ordenacao";
// importa os tipos de conteúdo
import { tiposComAno } from "./ciclos";
import type { DadosPorTipo, TipoConteudo } from "./tipos";

// carrega conteúdos públicos mantendo dados iniciais como apoio
export function useConteudoPublico<T extends TipoConteudo>(
  tipo: T,
  dadosIniciais: DadosPorTipo[T][],
) {
  // guarda os dados ordenados e o estado de carregamento
  const [dados, setDados] = useState(() => ordenarConteudosMaisRecentes(dadosIniciais));
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // busca uma versão atualizada quando o tipo muda
  useEffect(() => {
    // permite cancelar a busca ao desmontar o componente
    const controle = new AbortController();

    // consulta os conteúdos públicos da api
    fetch(`/api/conteudo?tipo=${tipo}${tiposComAno.includes(tipo) ? "&ano=todos" : ""}`, { signal: controle.signal, cache: "no-store" })
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
        setErro("");
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
        setErro("Não foi possível atualizar os dados. Tente novamente em alguns instantes.");
      })
      .finally(() => setCarregando(false));

    // cancela a busca pendente ao sair
    return () => controle.abort();
  }, [tipo]);

  // devolve os dados e o estado da busca
  return { dados, carregando, erro };
}
