"use client";

// importa os controles da ajuda e mantém o comportamento da caixa original
import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";

// explica o que muda ao marcar e desmarcar cada opção do painel
export function descricaoCheckbox(chave: string) {
  const descricoes: Record<string, string> = {
    publicado: "Marcado: permite mostrar este registro no portal depois de salvar. Desmarcado: mantém o registro fora da consulta pública. Anexos também dependem da publicação do conteúdo ao qual pertencem.",
    ativo: "Marcado: mantém este cadastro disponível para uso. Desmarcado: desativa o cadastro e impede seu uso como registro atual, preservando o histórico. A exibição pública também depende da opção de publicação.",
    real: "Marcado: identifica o documento como oficial no catálogo. Desmarcado: identifica como publicação do GECEP. Esta opção não publica o arquivo; a publicação é controlada separadamente.",
    destaque: "Marcado: permite destacar esta notícia na página inicial, entre as notícias do ano atual. Desmarcado: não dá prioridade de destaque; a notícia publicada continua na lista e ainda pode aparecer na seleção automática quando não há destaques.",
    botaoInternoAtivo: "Marcado: permite escolher uma página do portal e mostrar um botão para ela no fim da notícia. Desmarcado: oculta esse botão na notícia.",
    botaoExternoAtivo: "Marcado: mostra o botão para o endereço externo informado, com confirmação antes da saída do GECEP. Desmarcado: oculta esse botão na notícia.",
    chavePublicada: "Marcado: libera a chave e os jogos que também estiverem publicados, desde que o campeonato esteja público. Desmarcado: oculta a chave e os jogos da página pública, sem apagar os resultados salvos.",
    limitar: "Marcado: o sorteio procura adiar confrontos entre séries distantes. Desmarcado: não aplica essa preferência. Não é uma proibição absoluta; confrontos distantes podem ser necessários conforme as turmas e rodadas.",
    vincularSala: "Marcado: exige escolher uma sala publicada e confere a ocupação no turno e período da turma. Havendo conflito, pede confirmação. Desmarcado: não cria um novo vínculo; os vínculos existentes são mantidos.",
    quantidadeParticipantesPublicada: "Marcado: permite exibir a quantidade total de participantes na reunião pública. Desmarcado: oculta esse total. Não publica os nomes nem as presenças individuais.",
    fundamental: "Marcado: inclui o Ensino Fundamental entre os níveis da reunião. Desmarcado: retira esse nível. Não publica a reunião nem altera as presenças já registradas.",
    medio: "Marcado: inclui o Ensino Médio entre os níveis da reunião. Desmarcado: retira esse nível. Não publica a reunião nem altera as presenças já registradas.",
    selecionada: "Marcado: inclui esta presença na seleção para a atualização em lote. Desmarcado: deixa esta presença fora da seleção. A caixa sozinha não altera a situação nem a publicação da presença.",
    mandato: "Marcado: mantém o mandato ativo dentro das datas de início e fim. Desmarcado: retira o representante das consultas atuais. Para aparecer no portal, a publicação e a turma também precisam estar válidas.",
    fase: "Marcado: permite mostrar esta fase quando a chave e o campeonato estiverem públicos. Desmarcado: mantém esta fase fora da chave pública, sem apagar seus registros.",
    partida: "Marcado: permite mostrar este jogo quando a chave, a fase e o campeonato estiverem públicos. Desmarcado: mantém este jogo em rascunho, sem apagar o placar salvo.",
    presenca: "Marcado: permite mostrar esta presença individual na reunião publicada. Desmarcado: mantém esta presença apenas no painel. A quantidade total de participantes tem uma opção separada.",
    votacao: "Marcado: permite mostrar o resultado geral desta votação na reunião publicada. Desmarcado: oculta o resultado público e preserva os dados no painel. Não publica votos individuais.",
    item: "Marcado: permite mostrar este item na reunião publicada. Desmarcado: mantém este item apenas no painel, sem apagar seu conteúdo.",
  };
  return descricoes[chave] || descricoes.publicado;
}

// mostra a mesma explicação por mouse teclado ou toque sem marcar a caixa ao clicar no ícone
export default function CheckboxComAjuda({ explicacao, ...props }: InputHTMLAttributes<HTMLInputElement> & { explicacao: string }) {
  const id = useId();
  const ancora = useRef<HTMLSpanElement>(null);
  const [passando, setPassando] = useState(false);
  const [fixado, setFixado] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0, transform: "none" });
  const aberto = passando || fixado;
  function posicionar() {
    const caixa = ancora.current?.getBoundingClientRect();
    if (!caixa) return;
    setPosicao({ left: Math.max(8, Math.min(caixa.left, window.innerWidth - 328)), top: caixa.bottom + 300 < window.innerHeight ? caixa.bottom + 8 : caixa.top - 8, transform: caixa.bottom + 300 < window.innerHeight ? "none" : "translateY(-100%)" });
  }
  useEffect(() => {
    if (!aberto) return;
    const fechar = () => { setFixado(false); setPassando(false); };
    const fora = (evento: PointerEvent) => { if (!ancora.current?.contains(evento.target as Node)) fechar(); };
    const teclado = (evento: KeyboardEvent) => { if (evento.key === "Escape") fechar(); };
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", teclado);
    window.addEventListener("scroll", fechar, true); window.addEventListener("resize", fechar);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", teclado); window.removeEventListener("scroll", fechar, true); window.removeEventListener("resize", fechar); };
  }, [aberto]);
  return <span className="checkbox-com-ajuda" ref={ancora} onMouseEnter={() => { posicionar(); setPassando(true); }} onMouseLeave={() => setPassando(false)}>
    <input {...props} type="checkbox" aria-describedby={aberto ? id : props["aria-describedby"]} />
    <button type="button" className="icone-ajuda-checkbox" aria-label={`Explicar: ${props["aria-label"] || "esta opção"}`} aria-expanded={aberto} aria-controls={aberto ? id : undefined} onFocus={() => { posicionar(); setPassando(true); }} onBlur={() => setPassando(false)} onClick={(evento) => { evento.preventDefault(); evento.stopPropagation(); posicionar(); setFixado(!fixado); if (fixado) setPassando(false); }}>i</button>
    {aberto && createPortal(<span id={id} role="tooltip" className="descricao-checkbox" style={posicao}>{explicacao}</span>, document.body)}
  </span>;
}
