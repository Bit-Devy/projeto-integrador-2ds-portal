// ativa recursos do navegador
"use client";

// importa o filtro por ano e o estado escolhido
import { useState } from "react";
import SeletorAno from "./SeletorAno";
import { pertenceAoAno } from "../conteudo/periodos";

// importa os documentos iniciais
import { documentos } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";

// mostra a grade de documentos
export default function GradeDocumentos() {
  // busca os documentos publicados
  const { dados } = useConteudoPublico("documentos", documentos);
  const [ano, setAno] = useState("todos");
  const filtrados = dados.filter((documento) => pertenceAoAno(documento.dataDocumento, ano));

  // mostra o aviso quando não há documentos
  if (!dados.length) return <p className="sem-resultados">Nenhum documento publicado no momento.</p>;

  return (
    <>
    <SeletorAno id="ano-documentos" ano={ano} datas={dados.map((documento) => documento.dataDocumento)} alterar={setAno} />
    {!filtrados.length && <p className="sem-resultados">Nenhum documento publicado neste ano.</p>}
    <div className="grade-documentos grade-documentos-completa">
      {/* cartões dos documentos */}
      {filtrados.map((documento) => {
        /* verifica se o link é externo */
        const externo = documento.link.startsWith("http");
        return (
          <a href={documento.link} className="cartao-documento" key={`${documento.titulo}-${documento.id ?? "arquivo"}`} target={externo ? "_blank" : undefined} rel={externo ? "noreferrer" : undefined}>
            <span className="icone-documento">{documento.tipo}</span>
            <span><small>{documento.categoria}</small><strong>{documento.titulo}</strong><p>{documento.texto}</p><b>{documento.real ? "Documento oficial" : "Publicação do GECEP"}</b></span>
            <i aria-hidden="true">›</i>
          </a>
        );
      })}
    </div>
    </>
  );
}
