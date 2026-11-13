"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ListaPaginada, RepresentantePublico } from "../eventos/tipos";
import { formatarData, normalizarBusca, temTexto } from "../eventos/modelo-publico";
import { useConsultaPublica } from "../eventos/useConsultaPublica";
import CabecalhoPagina from "./CabecalhoPagina";
import { EstadoCarregando, EstadoErro, EstadoVazio } from "./EstadoConsultaPublica";
import { enderecoContatoRepresentante, nomesContatosRepresentante } from "../eventos/contatos-representante";

function rotuloTurno(valor: string) {
  return ({ manha: "Manhã", tarde: "Tarde", noite: "Noite" } as Record<string, string>)[valor] || valor;
}

function rotuloFuncao(valor: string) {
  return ({ titular: "Representante titular", vice: "Vice-representante", suplente: "Suplente", outra: "Outra função" } as Record<string, string>)[valor] || valor;
}

function rotuloNivel(valor: string) {
  return ({ fundamental: "Ensino Fundamental", medio: "Ensino Médio", outro: "Outro" } as Record<string, string>)[valor] || valor.replaceAll("_", " ");
}

function nomeRepresentante(representante: RepresentantePublico) {
  return representante.nomeExibicao || representante.nome;
}

function periodoMandato(representante: RepresentantePublico) {
  const inicio = formatarData(representante.inicioMandato);
  const fim = formatarData(representante.fimMandato);
  if (inicio && fim) return `${inicio} a ${fim}`;
  if (inicio) return `Desde ${inicio}`;
  if (fim) return `Até ${fim}`;
  return "Não informado";
}

type FiltrosRepresentante = { busca: string; turma: string; turmaId: string; turno: string; nivel: string; serie: string; funcao: string };
type Ordenacao = "turma" | "turno" | "nome";

export function PaginaRepresentantes({ filtrosIniciais = {}, abrirTabelaInicial = false }: { filtrosIniciais?: Partial<FiltrosRepresentante>; abrirTabelaInicial?: boolean }) {
  const [filtros, setFiltros] = useState<FiltrosRepresentante>({ busca: filtrosIniciais.busca || "", turma: filtrosIniciais.turma || "", turmaId: filtrosIniciais.turmaId || "", turno: filtrosIniciais.turno || "", nivel: filtrosIniciais.nivel || "", serie: filtrosIniciais.serie || "", funcao: filtrosIniciais.funcao || "" });
  // separa os campos digitados dos filtros enviados pelo botão buscar
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);
  const [buscou, setBuscou] = useState(Boolean(filtrosIniciais.turmaId));
  const [detalhe, setDetalhe] = useState<{ id: number; origem: "cartao" | "tabela" } | null>(null);
  const [pagina, setPagina] = useState(1);
  const [mostrarTabela, setMostrarTabela] = useState(abrirTabelaInicial);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("turma");
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");
  // guarda a busca que deve levar a pessoa até o resultado
  const [envios, setEnvios] = useState(filtrosIniciais.turmaId ? 1 : 0);
  const ultimaDescida = useRef(0);
  const url = useMemo(() => {
    const parametros = new URLSearchParams({ pagina: String(pagina), limite: "500", ordenar: ordenacao, direcao });
    Object.entries(filtrosAplicados).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    return `/api/representantes?${parametros.toString()}`;
  }, [direcao, filtrosAplicados, ordenacao, pagina]);
  const { dados, carregando, erro, recarregar } = useConsultaPublica<ListaPaginada<RepresentantePublico>>(url, buscou || mostrarTabela);
  const representantes = useMemo(() => [...(dados?.itens || [])].sort((a, b) => {
    const valorA = ordenacao === "nome" ? nomeRepresentante(a) : ordenacao === "turma" ? `${a.serie} ${a.turma}` : a.turno;
    const valorB = ordenacao === "nome" ? nomeRepresentante(b) : ordenacao === "turma" ? `${b.serie} ${b.turma}` : b.turno;
    const comparacao = normalizarBusca(valorA).localeCompare(normalizarBusca(valorB), "pt-BR", { numeric: true });
    return direcao === "asc" ? comparacao : -comparacao;
  }), [dados, direcao, ordenacao]);

  // leva o acesso vindo do crt até a tabela depois de carregar os representantes
  const desceuParaTabela = useRef(false);
  useEffect(() => {
    if (!abrirTabelaInicial || carregando || erro || desceuParaTabela.current) return;
    const quadro = requestAnimationFrame(() => {
      document.getElementById("tabela-completa-representantes")?.scrollIntoView({ block: "start", behavior: "instant" });
      desceuParaTabela.current = true;
    });
    return () => cancelAnimationFrame(quadro);
  }, [abrirTabelaInicial, carregando, erro]);

  // espera a resposta antes de mostrar o resultado na mesma página
  useEffect(() => {
    if (!buscou || carregando || ultimaDescida.current === envios) return;
    const quadro = requestAnimationFrame(() => {
      document.getElementById("resultado-representantes")?.scrollIntoView({ block: "start", behavior: "instant" });
      ultimaDescida.current = envios;
    });
    return () => cancelAnimationFrame(quadro);
  }, [buscou, carregando, envios]);

  function alterar(campo: keyof FiltrosRepresentante, valor: string) {
    setFiltros((atuais) => ({ ...atuais, ...(campo === "turma" || campo === "turno" ? { turmaId: "" } : {}), [campo]: valor }));
  }
  // só mostra os cartões depois que a pessoa confirma a busca
  function buscar() {
    setDetalhe(null);
    setFiltrosAplicados({ ...filtros }); setBuscou(true); setPagina(1); setEnvios((valor) => valor + 1); recarregar();
    // fecha o teclado do celular para deixar o resultado visível
    if (window.matchMedia("(max-width: 780px)").matches && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
  function limpar() { const vazios = { busca: "", turma: "", turmaId: "", turno: "", nivel: "", serie: "", funcao: "" }; setFiltros(vazios); setFiltrosAplicados(vazios); setDetalhe(null); setBuscou(false); setPagina(1); }
  function abrirDetalhe(id: number, origem: "cartao" | "tabela") {
    setDetalhe((atual) => atual?.id === id && atual.origem === origem ? null : { id, origem });
  }
  function ordenar(campo: Ordenacao) {
    if (ordenacao === campo) setDirecao((atual) => atual === "asc" ? "desc" : "asc");
    else { setOrdenacao(campo); setDirecao("asc"); setPagina(1); }
  }
  function ariaOrdenacao(campo: Ordenacao): "ascending" | "descending" | "none" {
    if (ordenacao !== campo) return "none";
    return direcao === "asc" ? "ascending" : "descending";
  }

  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="Representantes de turma" resumo="Encontre representantes publicados por nome, turma, turno, nível de ensino, série ou função." caminho="Representação / Representantes" />
      <div className="limite pagina-conteudo pagina-eventos">
        <form className="filtros-eventos filtros-representantes" onSubmit={(evento) => { evento.preventDefault(); buscar(); }} aria-label="Busca e filtros de representantes">
          <label className="filtro-busca-largo"><span>Buscar pelo nome</span><input type="search" value={filtros.busca} onChange={(evento) => alterar("busca", evento.target.value)} placeholder="Nome do representante" /></label>
          <label className="filtro-busca-largo"><span>Buscar pela turma</span><input type="search" value={filtros.turma} onChange={(evento) => alterar("turma", evento.target.value)} placeholder="Ex.: 3º J, 3 J ou 3J" /></label>
          <label><span>Turno</span><select value={filtros.turno} onChange={(evento) => alterar("turno", evento.target.value)}><option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label>
          <label><span>Nível de ensino</span><select value={filtros.nivel} onChange={(evento) => alterar("nivel", evento.target.value)}><option value="">Todos</option><option value="fundamental">Ensino Fundamental</option><option value="medio">Ensino Médio</option><option value="outro">Outro</option></select></label>
          <label><span>Ano ou série</span><input value={filtros.serie} onChange={(evento) => alterar("serie", evento.target.value)} placeholder="Todos" /></label>
          <label><span>Função</span><select value={filtros.funcao} onChange={(evento) => alterar("funcao", evento.target.value)}><option value="">Todas</option><option value="titular">Representante titular</option><option value="vice">Vice-representante</option><option value="suplente">Suplente</option><option value="outra">Outra função</option></select></label>
          <button type="submit">Buscar</button>
          <button type="button" onClick={limpar}>Limpar filtros</button>
          <p className="ajuda-busca">Escolha os filtros e clique em Buscar para ver os cartões. A busca desconsidera acentos, espaços e os símbolos º e °.</p>
        </form>
        <div id="resultado-representantes" className="resultado-filtros" aria-live="polite">{buscou && !carregando && !erro && <span>{dados?.paginacao.total ?? representantes.length} {dados?.paginacao.total === 1 ? "representante encontrado" : "representantes encontrados"}</span>}</div>
        {carregando && <EstadoCarregando texto="Carregando representantes publicados…" />}
        {erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
        {buscou && !carregando && !erro && !representantes.length && <EstadoVazio titulo="Nenhum representante encontrado" texto="Não há representante publicado que corresponda à busca e aos filtros escolhidos." />}
        {buscou && !!representantes.length && <div className="grade-representantes">{representantes.map((representante) => {
          const aberto = detalhe?.id === representante.id && detalhe.origem === "cartao";
          return <article key={representante.id}>
            <div><span>{representante.turma}</span>{temTexto(representante.serie) && <small>{representante.serie}</small>}</div>
            <h2><button className="nome-representante-acao" type="button" aria-expanded={aberto} onClick={() => abrirDetalhe(representante.id, "cartao")}>{nomeRepresentante(representante)} <span aria-hidden="true">{aberto ? "⌃" : "›"}</span></button></h2>
            <strong>{rotuloFuncao(representante.funcao)} · {rotuloTurno(representante.turno)}</strong>
            {aberto && <DetalheRepresentante id={representante.id} />}
          </article>;
        })}</div>}

        {<section className="secao-tabela-representantes" aria-labelledby="titulo-tabela-representantes"><div><h2 id="titulo-tabela-representantes">Tabela completa de representantes</h2><p>Compare e ordene os registros públicos por turma, turno ou nome.</p></div><button type="button" className="botao-secundario" aria-expanded={mostrarTabela} aria-controls="tabela-completa-representantes" onClick={() => setMostrarTabela((valor) => !valor)}>{mostrarTabela ? "Ocultar tabela completa" : "Ver tabela completa de representantes"}</button></section>}
        {mostrarTabela && <div id="tabela-completa-representantes" className="tabela-responsiva"><table className="tabela-eventos tabela-representantes"><caption>Representantes publicados</caption><thead><tr><th scope="col" aria-sort={ariaOrdenacao("turma")}><button type="button" onClick={() => ordenar("turma")}>Turma <span aria-hidden="true">↕</span></button></th><th scope="col">Ano ou série</th><th scope="col">Nível de ensino</th><th scope="col" aria-sort={ariaOrdenacao("turno")}><button type="button" onClick={() => ordenar("turno")}>Turno <span aria-hidden="true">↕</span></button></th><th scope="col" aria-sort={ariaOrdenacao("nome")}><button type="button" onClick={() => ordenar("nome")}>Representante <span aria-hidden="true">↕</span></button></th><th scope="col">Função</th><th scope="col">Período do mandato</th></tr></thead>
          <tbody>{representantes.map((representante) => {
            const aberto = detalhe?.id === representante.id && detalhe.origem === "tabela";
            return <Fragment key={representante.id}>
              <tr><th scope="row">{representante.turma}</th><td>{representante.serie || "—"}</td><td>{rotuloNivel(representante.nivelEnsino)}</td><td>{rotuloTurno(representante.turno)}</td><td><button type="button" className="nome-representante-acao" aria-expanded={aberto} onClick={() => abrirDetalhe(representante.id, "tabela")}>{nomeRepresentante(representante)} <span aria-hidden="true">{aberto ? "⌃" : "›"}</span></button></td><td>{rotuloFuncao(representante.funcao)}</td><td>{periodoMandato(representante)}</td></tr>
              {aberto && <tr><td colSpan={7}><DetalheRepresentante id={representante.id} /></td></tr>}
            </Fragment>;
          })}</tbody></table></div>}
        {(dados?.paginacao.totalPaginas ?? 1) > 1 && <nav className="paginacao-eventos" aria-label="Páginas de representantes"><button type="button" disabled={pagina <= 1} onClick={() => setPagina((valor) => Math.max(1, valor - 1))}>‹ Página anterior</button><span>Página {dados?.paginacao.pagina} de {dados?.paginacao.totalPaginas}</span><button type="button" disabled={pagina >= (dados?.paginacao.totalPaginas ?? 1)} onClick={() => setPagina((valor) => valor + 1)}>Próxima página ›</button></nav>}
      </div>
    </main>
  );
}

// abre os contatos autorizados e o ensalamento ao consultar o representante
function DetalheRepresentante({ id }: { id: number }) {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<{ item: RepresentantePublico }>(`/api/representantes/${id}`);
  if (carregando) return <p role="status">Carregando os dados do representante…</p>;
  if (erro) return <EstadoErro mensagem={erro} tentarNovamente={recarregar} />;
  if (!dados) return null;
  const item = dados.item;
  return <section className="detalhe-representante-publico" aria-label={`Dados de ${nomeRepresentante(item)}`}>
    <dl className="dados-mandato">
      <div><dt>Turma</dt><dd>{item.turma} · {item.ano}</dd></div>
      <div><dt>Nível de ensino</dt><dd>{rotuloNivel(item.nivelEnsino)}</dd></div>
      <div><dt>Mandato</dt><dd>{periodoMandato(item)}</dd></div>
      {item.contatos?.map((contato, indice) => <div key={indice}>
        <dt>{nomesContatosRepresentante[contato.tipo]}</dt>
        <dd><a href={enderecoContatoRepresentante(contato)} target={contato.tipo === "whatsapp" ? "_blank" : undefined} rel="noreferrer">{contato.valor}</a></dd>
      </div>)}
    </dl>
    {temTexto(item.observacaoPublica) && <p>{item.observacaoPublica}</p>}
    {item.mapaUrl && <Link className="botao-secundario" href={item.mapaUrl}>Ver ensalamento da turma ›</Link>}
  </section>;
}
