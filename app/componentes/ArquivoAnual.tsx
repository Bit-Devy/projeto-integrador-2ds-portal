"use client";

// consulta o arquivo por ano sem misturar os registros atuais com os antigos
import { useEffect, useRef, useState } from "react";
import { anoDoPortal } from "../conteudo/periodos";

export type ItemArquivoAnual = { id: string | number; ano: number; titulo: string; descricao: string; observacao?: string };
export default function ArquivoAnual({ titulo, itens, fechar }: { titulo: string; itens: ItemArquivoAnual[]; fechar: () => void }) {
  const anos = [...new Set([anoDoPortal(), ...itens.map((item) => item.ano)])].sort((a, b) => b - a);
  const [ano, setAno] = useState(String(itens.length ? Math.max(...itens.map((item) => item.ano)) : anoDoPortal()));
  const [busca, setBusca] = useState(""); const [pagina, setPagina] = useState(1);
  const janela = useRef<HTMLDialogElement>(null);
  useEffect(() => { janela.current?.showModal(); janela.current?.querySelector<HTMLElement>("h2")?.focus(); }, []);
  const limpar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtrados = itens.filter((item) => (ano === "todos" || item.ano === Number(ano)) && limpar(`${item.titulo} ${item.descricao}`).includes(limpar(busca.trim())));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 20));
  return <dialog ref={janela} className="dialogo-anonimato arquivo-anual" aria-labelledby="titulo-arquivo-anual" onCancel={(evento) => { evento.preventDefault(); fechar(); }}><h2 id="titulo-arquivo-anual" tabIndex={-1}>{titulo}</h2><p>O histórico permanece salvo mesmo depois da mudança de gestão.</p><div className="form-servico"><label>Pesquisar no arquivo<input type="search" value={busca} onChange={(evento) => { setBusca(evento.target.value); setPagina(1); }} placeholder="Nome, turma, série ou turno" /></label><label>Ano<select value={ano} onChange={(evento) => { setAno(evento.target.value); setPagina(1); }}><option value="todos">Todos os anos</option>{anos.map((valor) => <option key={valor}>{valor}</option>)}</select></label></div><p>{filtrados.length} registro(s) encontrado(s)</p><div className="lista-arquivo-anual">{filtrados.slice((pagina - 1) * 20, pagina * 20).map((item) => <article key={item.id}><small>{item.ano} · Arquivado</small><h3>{item.titulo}</h3><p>{item.descricao}</p>{item.observacao && <p>{item.observacao}</p>}</article>)}</div>{!filtrados.length && <p>Nenhum registro para esta busca e ano.</p>}<div className="acoes-dialogo-anonimato">{paginas > 1 && <><button type="button" className="botao-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>{pagina} de {paginas}</span><button type="button" className="botao-secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Próxima</button></>}<button type="button" className="botao-primario" onClick={fechar}>Fechar arquivo</button></div></dialog>;
}
