// ativa recursos do navegador
"use client";

// importa os projetos iniciais
import { projetos } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";

// mostra a grade de projetos
export default function GradeProjetos() {
  // busca os projetos publicados
  const { dados } = useConteudoPublico("projetos", projetos);

  // mostra o aviso quando não há projetos
  if (!dados.length) return <p className="sem-resultados">Nenhum projeto publicado no momento.</p>;

  return (
    <div className="grade-projetos">
      {/* cartões dos projetos */}
      {dados.map((projeto, indice) => (
        <article className="cartao-projeto" key={`${projeto.titulo}-${projeto.id ?? indice}`}>
          <div className="topo-projeto"><span>{String(indice + 1).padStart(2, "0")}</span><small>{projeto.estado}</small></div>
          <b>{projeto.categoria}</b><h3>{projeto.titulo}</h3><p>{projeto.texto}</p>
          {projeto.link && <a href={projeto.link} target="_blank" rel="noreferrer">Conhecer esta ação ›</a>}
        </article>
      ))}
    </div>
  );
}
