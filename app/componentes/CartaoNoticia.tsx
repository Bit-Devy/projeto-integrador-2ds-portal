// importa o tipo usado pela notícia
import type { NoticiaGecep } from "../conteudo/tipos";

// mostra os dados de uma notícia
export default function CartaoNoticia({ noticia }: { noticia: NoticiaGecep }) {
  // escolhe o endereço da notícia
  const link = noticia.link || (noticia.id ? `/noticias/${noticia.id}` : "/noticias");
  // verifica se o endereço é externo
  const externo = link.startsWith("http");

  return (
    <article className="cartao-noticia">
      {/* imagem e data da notícia */}
      <div className={`imagem-noticia imagem-${noticia.cor}`}>
        <img src="/logo-gecep.png" alt="" />
        <span>{formatarData(noticia.data)}</span>
      </div>
      {/* texto e link da notícia */}
      <div className="corpo-noticia">
        <small>{noticia.categoria}</small>
        <h3>{noticia.titulo}</h3>
        <p>{noticia.resumo}</p>
        <a href={link} target={externo ? "_blank" : undefined} rel={externo ? "noreferrer" : undefined}>
          Ler notícia completa <span aria-hidden="true">›</span>
        </a>
      </div>
    </article>
  );
}

// transforma a data para leitura
function formatarData(data: string) {
  // mantém datas fora do padrão
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  // separa as partes da data
  const [ano, mes, dia] = data.split("-");
  // guarda as abreviações dos meses
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${dia} ${meses[Number(mes) - 1]} ${ano}`;
}
