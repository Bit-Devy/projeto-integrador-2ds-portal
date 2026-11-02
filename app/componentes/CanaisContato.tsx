"use client";

// importa os canais e a consulta dos endereços publicados
import { canaisIniciais } from "../conteudo/dados-iniciais";
import { useConteudoPublico } from "../conteudo/useConteudoPublico";

// mostra os destinos editáveis e mantém o envio de mensagens em um só lugar
export default function CanaisContato() {
  const { dados } = useConteudoPublico("canais", canaisIniciais);
  return <div className="grade-canais-contato">
    {dados.map((canal) => {
      const externo = canal.link.startsWith("http");
      return <a className="cartao-canal" href={canal.link} key={canal.id ?? canal.titulo} target={externo ? "_blank" : undefined} rel={externo ? "noreferrer" : undefined}>
        <span aria-hidden="true">{canal.icone}</span><h2>{canal.titulo}</h2><p>{canal.descricao}</p><small>Acessar canal {externo ? "↗" : "›"}</small>
      </a>;
    })}
    <a className="cartao-canal" href="/sugestoes"><span aria-hidden="true">✉</span><h2>Mensagem pelo portal</h2><p>Envie dúvidas, propostas e sugestões para análise da gestão.</p><small>Participar e enviar uma mensagem ›</small></a>
  </div>;
}
