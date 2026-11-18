// usa os mesmos tipos aceitos pela api
import { limiteContatosEquipe, tiposContatoEquipe, type ContatoEquipe } from "../conteudo/contatos-equipe";

// edita a lista de contatos que acompanha a publicação do integrante
export default function CamposContatoEquipe({ contatos, alterar, desabilitado }: {
  contatos: ContatoEquipe[];
  alterar: (contatos: ContatoEquipe[]) => void;
  desabilitado: boolean;
}) {
  function mudar(indice: number, contato: ContatoEquipe) {
    alterar(contatos.map((atual, posicao) => posicao === indice ? contato : atual));
  }

  return <fieldset className="campo-largo campos-contato-equipe" disabled={desabilitado}>
    <legend>Contatos do integrante</legend>
    <p>Adicione até três contatos autorizados para exibição na ficha pública.</p>
    {contatos.map((contato, indice) => {
      const campo = tiposContatoEquipe[contato.tipo];
      return <div className="linha-contato-equipe" key={indice}>
        <label>
          <span>Tipo de contato {indice + 1}</span>
          <select value={contato.tipo} onChange={(evento) => mudar(indice, { tipo: evento.target.value as ContatoEquipe["tipo"], valor: "" })}>
            {Object.entries(tiposContatoEquipe).map(([tipo, opcao]) => <option value={tipo} key={tipo}>{opcao.nome}</option>)}
          </select>
        </label>
        <label>
          <span>{campo.nome}</span>
          <input type={campo.campo} value={contato.valor} placeholder={campo.exemplo} maxLength={campo.tamanho} required
            onChange={(evento) => mudar(indice, { ...contato, valor: evento.target.value })} />
        </label>
        <button className="botao-secundario" type="button" aria-label={`Remover contato ${indice + 1}`}
          onClick={() => alterar(contatos.filter((_, posicao) => posicao !== indice))}>Remover</button>
      </div>;
    })}
    {contatos.length < limiteContatosEquipe && <button className="botao-secundario adicionar-contato-equipe" type="button"
      onClick={() => alterar([...contatos, { tipo: "whatsapp", valor: "" }])}>+ Adicionar contato</button>}
  </fieldset>;
}
