"use client";

import { useState } from "react";
import CartaoNoticia from "./CartaoNoticia";
import { noticias } from "../dados";
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
import SeletorAno from "./SeletorAno";
import { anoInicial, pertenceAoAno } from "../conteudo/periodos";

// mostra e filtra todas as notícias
export default function ListaNoticias({ buscaInicial = "" }: { buscaInicial?: string }) {
  // começa com a busca que veio do cabeçalho
  const [busca, setBusca] = useState(buscaInicial);
  const [ano, setAno] = useState(() => anoInicial());
  // busca as notícias publicadas
  const { dados: noticiasPublicadas, carregando } = useConteudoPublico("noticias", noticias);

  // filtra as notícias pelo texto digitado
  const filtradas = noticiasPublicadas.filter((noticia) => {
    const texto = `${noticia.titulo} ${noticia.resumo} ${noticia.categoria}`.toLowerCase();
    return pertenceAoAno(noticia.data, ano) && texto.includes(busca.trim().toLowerCase());
  });

  return (
    <>
      {/* período e campo de busca das notícias */}
      <SeletorAno
        id="ano-noticias"
        ano={ano}
        datas={noticiasPublicadas.map((noticia) => noticia.data)}
        alterar={setAno}
      />
      <div className="filtro-noticias">
        <label htmlFor="busca-noticias">Buscar nas notícias</label>
        <div>
          <input
            id="busca-noticias"
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Digite um projeto, assunto ou palavra"
          />
          <button type="button" onClick={() => setBusca("")}>
            Limpar
          </button>
        </div>
        {busca && (
          <p>
            {filtradas.length} resultado(s) para “{busca}”
          </p>
        )}
        {carregando && <p>Atualizando notícias...</p>}
      </div>
      {/* resultado da busca */}
      <div className="grade-noticias grade-noticias-completa">
        {filtradas.map((noticia) => (
          <CartaoNoticia noticia={noticia} key={noticia.titulo} />
        ))}
      </div>
      {/* aviso de busca sem resultado */}
      {filtradas.length === 0 && (
        <p className="sem-resultados">Nenhuma notícia corresponde a essa busca.</p>
      )}
    </>
  );
}
