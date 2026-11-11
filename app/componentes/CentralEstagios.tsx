"use client";

// pesquisa vagas publicadas e conserva o histórico das inscrições encerradas
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
import { formatarDia, hojeNoParana } from "../servicos/calendario";
import SeletorAno from "./SeletorAno";
import { anoDoPortal } from "../conteudo/periodos";
import type { Oportunidade } from "../servicos/tipos";

const categorias: Record<string, string> = { estagio: "Estágio", emprego: "Emprego", aprendiz: "Jovem aprendiz", concurso: "Concurso" };
function estado(item: Oportunidade) { return item.situacao === "aberta" && item.prazo && item.prazo < hojeNoParana() ? "encerrada" : item.situacao; }
export default function CentralEstagios() {
  const { dados, erro, carregando } = useConteudoPublico("oportunidades", []);
  const [busca, setBusca] = useState(""); const [consulta, setConsulta] = useState("");
  const [tipo, setTipo] = useState(""); const [situacao, setSituacao] = useState("aberta");
  const [ano, setAno] = useState(String(anoDoPortal()));
  const [pagina, setPagina] = useState(1);
  const [detalhe, setDetalhe] = useState<Oportunidade | null>(null);
  const janela = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (detalhe) { janela.current?.showModal(); janela.current?.querySelector<HTMLElement>("h2")?.focus(); if (janela.current) janela.current.scrollTop = 0; } }, [detalhe]);
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtradas = dados.filter((item) => (ano === "todos" || item.data.startsWith(ano)) && (!tipo || item.categoria === tipo) && (!situacao || estado(item) === situacao) && (!consulta || normalizar(`${item.titulo} ${item.organizacao} ${item.local} ${item.escolaridade}`).includes(normalizar(consulta))));
  const paginas = Math.max(1, Math.ceil(filtradas.length / 12)); const atual = Math.min(pagina, paginas);
  function buscar(evento: FormEvent) { evento.preventDefault(); setConsulta(busca.trim()); setPagina(1); }
  function fechar() { janela.current?.close(); setDetalhe(null); }
  return <div className="limite pagina-conteudo servicos-portal">
    <section className="servico-bloco"><div className="topo-servico"><div><span className="rotulo-secao">OPORTUNIDADES</span><h2>Seu próximo passo começa aqui</h2></div></div>
      <div className="ferramentas-ano-painel"><SeletorAno id="ano-oportunidades-publicas" ano={ano} datas={dados.map((item) => item.data)} alterar={(valor) => { setAno(valor); setPagina(1); }} /><button className="botao-cinza-pequeno" type="button" onClick={() => { setAno("todos"); setSituacao(""); setPagina(1); }}>Arquivo de oportunidades</button></div><form className="form-servico busca-oportunidades" onSubmit={buscar}><label>Buscar oportunidade<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Título, instituição, curso ou cidade" /></label><label>Tipo<select value={tipo} onChange={(evento) => { setTipo(evento.target.value); setPagina(1); }}><option value="">Todas as categorias</option>{Object.entries(categorias).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label><label>Situação<select value={situacao} onChange={(evento) => { setSituacao(evento.target.value); setPagina(1); }}><option value="aberta">Inscrições abertas</option><option value="encerrada">Encerradas</option><option value="suspensa">Suspensas</option><option value="">Todas</option></select></label><button className="botao-primario" type="submit">Buscar</button></form>
      {erro && <p role="alert" className="erro-painel">{erro}</p>}{carregando ? <p role="status">Carregando oportunidades…</p> : <p className="nota-servico">{filtradas.length} oportunidade(s) encontrada(s)</p>}
      <div className="grade-oportunidades">{filtradas.slice((atual - 1) * 12, atual * 12).map((item) => <article id={`vaga-${item.id}`} key={item.id}><div className="tipo-oportunidade">{categorias[item.categoria]}<span>{estado(item) === "aberta" ? "Aberta" : estado(item) === "suspensa" ? "Suspensa" : "Encerrada"}</span></div><h3>{item.titulo}</h3><strong>{item.organizacao}</strong><p>{item.local} · {item.modalidade}</p><p>{item.escolaridade}</p>{item.remuneracao && <p>{item.remuneracao}</p>}<small>{item.prazo ? `Inscrições até ${formatarDia(item.prazo)}` : "Prazo não informado"}</small><button type="button" className="botao-secundario" onClick={() => setDetalhe(item)}>Ver oportunidade ›</button></article>)}</div>
      {!carregando && !filtradas.length && <p className="sem-resultados">Nenhuma oportunidade encontrada. Experimente outra busca ou situação.</p>}
      {paginas > 1 && <nav className="semana-cantina" aria-label="Páginas de oportunidades"><button type="button" className="botao-cinza-pequeno" disabled={atual <= 1} onClick={() => setPagina(atual - 1)}>Anterior</button><span>{atual} de {paginas}</span><button type="button" className="botao-cinza-pequeno" disabled={atual >= paginas} onClick={() => setPagina(atual + 1)}>Próxima</button></nav>}
    </section>
    <dialog ref={janela} className="dialogo-anonimato dialogo-oportunidade" aria-labelledby="titulo-oportunidade" onCancel={(evento) => { evento.preventDefault(); fechar(); }}>{detalhe && <><span className="rotulo-secao">{categorias[detalhe.categoria]}</span><h2 id="titulo-oportunidade" tabIndex={-1}>{detalhe.titulo}</h2><p>{detalhe.organizacao} · {detalhe.local}</p><dl className="dados-oportunidade">{[["Situação", estado(detalhe) === "aberta" ? "Inscrições abertas" : estado(detalhe) === "suspensa" ? "Suspensa" : "Encerrada"], ["Modalidade", detalhe.modalidade], ["Escolaridade", detalhe.escolaridade], ["Requisitos", detalhe.requisitos], ["Atividades", detalhe.descricao], ["Jornada", detalhe.jornada], ["Bolsa ou remuneração", detalhe.remuneracao], ["Benefícios", detalhe.beneficios], ["Vagas", detalhe.quantidade], ["Publicação", formatarDia(detalhe.data)], ["Prazo", detalhe.prazo ? formatarDia(detalhe.prazo) : "Não informado"], ["Fonte", detalhe.fonte]].filter(([, valor]) => valor).map(([nome, valor]) => <div key={nome}><dt>{nome}</dt><dd>{valor}</dd></div>)}</dl><div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" onClick={fechar}>Fechar</button>{detalhe.arquivoUrl && <a className="botao-secundario" href={detalhe.arquivoUrl} target="_blank" rel="noreferrer">Abrir documento ↗</a>}<a className="botao-primario" href={detalhe.link} target="_blank" rel="noreferrer">{estado(detalhe) === "aberta" ? "Candidatura ou edital ↗" : "Consultar publicação original ↗"}</a></div></>}</dialog>
  </div>;
}
