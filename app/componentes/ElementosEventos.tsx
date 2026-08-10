import Link from "next/link";
import type { DocumentoPublico, ImagemPublica } from "../eventos/modelo-publico";
import { formatarData, temTexto, textos, urlPublica } from "../eventos/modelo-publico";

export function ListaDefinicoes({ itens }: { itens: Array<{ rotulo: string; valor: unknown }> }) {
  const publicados = itens.filter((item) => typeof item.valor === "number" || temTexto(item.valor));
  if (!publicados.length) return null;
  return (
    <dl className="dados-evento">
      {publicados.map((item) => <div key={item.rotulo}><dt>{item.rotulo}</dt><dd>{String(item.valor)}</dd></div>)}
    </dl>
  );
}

export function BlocoTexto({ titulo, conteudo }: { titulo: string; conteudo: unknown }) {
  const paragrafos = textos(conteudo);
  if (!paragrafos.length) return null;
  return (
    <section className="bloco-conteudo-evento">
      <h2>{titulo}</h2>
      {paragrafos.map((paragrafo, indice) => <p key={`${titulo}-${indice}`}>{paragrafo}</p>)}
    </section>
  );
}

export function ListaDocumentos({ documentos, titulo = "Documentos" }: { documentos?: DocumentoPublico[]; titulo?: string }) {
  const itens = (documentos ?? []).map((documento) => ({ documento, url: urlPublica(documento.arquivoUrl || documento.url || documento.linkExterno || documento.link) }))
    .filter(({ documento, url }) => temTexto(documento.titulo) && url);
  if (!itens.length) return null;
  return (
    <section className="bloco-conteudo-evento">
      <h2>{titulo}</h2>
      <ul className="lista-documentos-evento">
        {itens.map(({ documento, url }, indice) => (
          <li key={documento.id ?? `${documento.titulo}-${indice}`}>
            <a href={url} target="_blank" rel="noreferrer">
              <span><strong>{documento.titulo}</strong>{temTexto(documento.tipo) && <small>{documento.tipo}</small>}</span>
              <span aria-hidden="true">↗</span>
            </a>
            {temTexto(documento.descricao) && <p>{documento.descricao}</p>}
            {temTexto(documento.data) && <time dateTime={documento.data}>{formatarData(documento.data)}</time>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GaleriaPublica({ imagens }: { imagens?: ImagemPublica[] }) {
  const itens = (imagens ?? []).map((imagem) => ({ imagem, url: urlPublica(imagem.arquivoUrl || imagem.url) })).filter((item) => item.url);
  if (!itens.length) return null;
  return (
    <section className="bloco-conteudo-evento">
      <h2>Imagens</h2>
      <div className="galeria-evento">
        {itens.map(({ imagem, url }, indice) => <figure key={imagem.id ?? `${url}-${indice}`}><img src={url} alt={imagem.textoAlternativo || imagem.descricao || imagem.legenda || imagem.titulo || "Imagem publicada"} />{temTexto(imagem.legenda || imagem.titulo) && <figcaption>{imagem.legenda || imagem.titulo}</figcaption>}</figure>)}
      </div>
    </section>
  );
}

export function VoltarPara({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="voltar-eventos" href={href}>‹ {children}</Link>;
}
