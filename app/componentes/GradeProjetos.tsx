// ativa recursos do navegador
"use client";

// importa os projetos iniciais
import { useEffect, useRef, useState } from "react";
import SeletorAno from "./SeletorAno";
import { anoDoPortal } from "../conteudo/periodos";
import { anoDoRegistro } from "../conteudo/ciclos";
import { projetos } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";

// mostra a grade de projetos
export default function GradeProjetos() {
  // busca os projetos publicados
  const { dados } = useConteudoPublico("projetos", projetos);

  const [ano, setAno] = useState(String(anoDoPortal()));
  const abriuDestino = useRef(false);
  const exibidos = dados.filter((item) => ano === "todos" || anoDoRegistro(item as unknown as Record<string, unknown>, item.criadoEm) === Number(ano));

  // abre o ano do projeto quando uma notícia aponta diretamente para seu cartão
  useEffect(() => {
    if (abriuDestino.current) return;
    const id = window.location.hash.match(/^#projeto-(\d+)$/)?.[1];
    const projeto = id && dados.find((item) => String(item.id) === id);
    if (!projeto) return;
    const inicio = setTimeout(() => { abriuDestino.current = true; setAno(String(anoDoRegistro(projeto as unknown as Record<string, unknown>, projeto.criadoEm))); document.getElementById(`projeto-${projeto.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0);
    return () => clearTimeout(inicio);
  }, [dados]);
  useEffect(() => {
    if (!abriuDestino.current) return;
    const id = window.location.hash.slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ano, dados]);

  // mantém todos os anos disponíveis mesmo quando o ano atual está vazio
  return (
    <><SeletorAno id="ano-projetos-publicos" ano={ano} datas={dados.map((item) => `${anoDoRegistro(item as unknown as Record<string, unknown>, item.criadoEm)}-01-01`)} alterar={setAno} />{!exibidos.length && <p className="sem-resultados">Nenhum projeto publicado neste ano.</p>}<div className="grade-projetos">
      {/* cartões dos projetos */}
      {exibidos.map((projeto, indice) => (
        <article id={`projeto-${projeto.id}`} className="cartao-projeto" key={`${projeto.titulo}-${projeto.id ?? indice}`}>
          <div className="topo-projeto"><span>{String(indice + 1).padStart(2, "0")}</span><small>{projeto.estado}</small></div>
          <b>{projeto.categoria}</b><h3>{projeto.titulo}</h3><p>{projeto.texto}</p>
          {projeto.link && <a href={projeto.link} target="_blank" rel="noreferrer">Conhecer esta ação ›</a>}
        </article>
      ))}
    </div></>
  );
}
