"use client";

import Link from "next/link";
import { Children, useMemo, useRef, useState } from "react";
import type { ClassificacaoPublica, DocumentoPublico, FasePublica, InterclassePublico, JogoPublico, ParticipantePublico, RespostaLista } from "../eventos/modelo-publico";
import { classeSituacao, extrairItens, formatarData, formatarDataHora, rotuloSituacao, rotuloTurno, temTexto, textoParticipante, urlPublica } from "../eventos/modelo-publico";
import { useConsultaPublica } from "../eventos/useConsultaPublica";
import CabecalhoPagina from "./CabecalhoPagina";
import { BlocoTexto, GaleriaPublica, ListaDefinicoes, ListaDocumentos, VoltarPara } from "./ElementosEventos";
import { EstadoCarregando, EstadoErro, EstadoVazio, PaginacaoPublica } from "./EstadoConsultaPublica";

type RespostaInterclasse = {
  item: InterclassePublico;
  participantes?: ParticipantePublico[];
  fases?: FasePublica[];
  partidas?: JogoPublico[];
  documentos?: DocumentoPublico[];
  atualizacoes?: Array<{ id?: number; data?: string; titulo?: string; texto?: string }>;
  classificacao?: ClassificacaoPublica[];
};

function nomeJogo(jogo: JogoPublico, lado: "a" | "b") {
  return lado === "a"
    ? textoParticipante(jogo.participanteA) || jogo.participanteANome || jogo.nomeParticipanteA || "Participante a definir"
    : textoParticipante(jogo.participanteB) || jogo.participanteBNome || jogo.nomeParticipanteB || "Participante a definir";
}

function nomeVencedor(jogo: JogoPublico) {
  return textoParticipante(jogo.vencedor) || jogo.vencedorNome || "";
}

function temPlacar(jogo: JogoPublico) {
  return jogo.placarPublicado !== false && jogo.placarA !== null && jogo.placarA !== undefined && jogo.placarA !== "" && jogo.placarB !== null && jogo.placarB !== undefined && jogo.placarB !== "";
}

function resumoSituacao(campeonato: InterclassePublico) {
  const situacao = campeonato.situacao;
  const campeao = textoParticipante(campeonato.campeao);
  if (situacao === "em_andamento" && temTexto(campeonato.faseAtual)) return `Em andamento — ${campeonato.faseAtual}`;
  if (situacao === "proximo" && temTexto(campeonato.dataInicial || campeonato.dataInicio)) return `Previsão de início: ${formatarData(campeonato.dataInicial || campeonato.dataInicio)}`;
  if (situacao === "encerrado" && campeao) return `Encerrado — campeão: ${campeao}`;
  if (situacao === "adiado" && !temTexto(campeonato.dataInicial || campeonato.dataInicio)) return "Adiado — nova data ainda não definida";
  return rotuloSituacao(situacao);
}

function caminhoJogo(campeonatoSlug: string, jogo: JogoPublico) {
  const identificador = jogo.slug || jogo.id;
  return identificador ? `/eventos/interclasses/${encodeURIComponent(campeonatoSlug)}/jogos/${encodeURIComponent(String(identificador))}` : "";
}

function CartaoInterclasse({ campeonato }: { campeonato: InterclassePublico }) {
  const imagem = urlPublica(campeonato.imagemCapaUrl || campeonato.imagemUrl || campeonato.imagem);
  const destino = temTexto(campeonato.slug) ? `/eventos/interclasses/${encodeURIComponent(campeonato.slug)}` : "";
  const proxima = campeonato.proximaPartida || campeonato.proximoJogo;
  const conteudo = <>
    {imagem && <img className="capa-cartao-evento" src={imagem} alt="" />}
    <div className="conteudo-cartao-evento">
      <span className={`selo-situacao situacao-${classeSituacao(campeonato.situacao)}`}>{resumoSituacao(campeonato)}</span>
      <h2>{campeonato.nome || "Interclasse com nome ainda não publicado"}</h2>
      <p className="metadados-interclasse">{[campeonato.edicao || (campeonato.ano !== undefined ? String(campeonato.ano) : ""), campeonato.modalidade, campeonato.categoria, rotuloTurno(campeonato.turno)].filter(temTexto).join(" · ")}</p>
      {proxima && <div className="proxima-partida-cartao"><small>Próximo jogo</small><strong>{nomeJogo(proxima, "a")} × {nomeJogo(proxima, "b")}</strong>{(proxima.data || proxima.horario) && <span>{[formatarData(proxima.data), proxima.horario].filter(Boolean).join(" · ")}</span>}</div>}
      {destino && <b>Ver campeonato, chave e jogos ›</b>}
    </div>
  </>;
  return destino ? <Link className="cartao-evento-publico cartao-interclasse" href={destino}>{conteudo}</Link> : <article className="cartao-evento-publico cartao-interclasse">{conteudo}</article>;
}

function CartaoResultadoRecente({ campeonato, jogo }: { campeonato: InterclassePublico; jogo: JogoPublico }) {
  const destino = campeonato.slug ? caminhoJogo(campeonato.slug, jogo) : "";
  const conteudo = <>
    <span className={`selo-situacao situacao-${classeSituacao(jogo.situacao)}`}>{campeonato.nome || "Interclasse"}</span>
    <h3>{nomeJogo(jogo, "a")} <span aria-label="contra">×</span> {nomeJogo(jogo, "b")}</h3>
    {temPlacar(jogo) && <strong className="placar-resultado-recente">{jogo.placarA} × {jogo.placarB}</strong>}
    {nomeVencedor(jogo) && <p>Vencedor: {nomeVencedor(jogo)}</p>}
    {(formatarData(jogo.data) || jogo.horario || jogo.faseNome || jogo.fase) && <small>{[jogo.faseNome || jogo.fase, formatarData(jogo.data), jogo.horario].filter(temTexto).join(" · ")}</small>}
    {destino && <span>Ver resultado ›</span>}
  </>;
  return destino ? <Link className="cartao-resumo-central cartao-resultado-recente" href={destino}>{conteudo}</Link> : <article className="cartao-resumo-central cartao-resultado-recente">{conteudo}</article>;
}

function SecaoInterclasses({ titulo, descricao, destino, vazio, carregando, erro, recarregar, children }: { titulo: string; descricao: string; destino: string; vazio: string; carregando: boolean; erro: string; recarregar: () => void; children?: React.ReactNode }) {
  const possuiConteudo = Children.count(children) > 0;
  return <section className="secao-central-eventos secao-destaque-publica"><div className="cabecalho-lista-eventos"><div><h2>{titulo}</h2><p>{descricao}</p></div><Link href={destino}>Ver todos ›</Link></div>{carregando && <EstadoCarregando texto={`Carregando ${titulo.toLowerCase()}…`} />}{!carregando && erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}{!carregando && !erro && (possuiConteudo ? <div className="grade-resumos-central">{children}</div> : <EstadoVazio titulo="Nenhuma publicação nesta seção" texto={vazio} />)}</section>;
}

type FiltrosInterclasse = { situacao: string; ano: string; modalidade: string; categoria: string; turno: string; busca: string };

export function ListaInterclasses({ filtrosIniciais = {} }: { filtrosIniciais?: Partial<FiltrosInterclasse> }) {
  const [filtros, setFiltros] = useState<FiltrosInterclasse>({ situacao: filtrosIniciais.situacao || "", ano: filtrosIniciais.ano || "", modalidade: filtrosIniciais.modalidade || "", categoria: filtrosIniciais.categoria || "", turno: filtrosIniciais.turno || "", busca: filtrosIniciais.busca || "" });
  const [pagina, setPagina] = useState(1);
  const [arquivoAberto, setArquivoAberto] = useState(() => Object.values(filtrosIniciais).some(Boolean));
  const emAndamento = useConsultaPublica<RespostaLista<InterclassePublico> | InterclassePublico[]>("/api/interclasses?situacao=em_andamento&limite=3");
  const proximos = useConsultaPublica<RespostaLista<InterclassePublico> | InterclassePublico[]>("/api/interclasses?situacao=proximo&limite=3");
  const encerrados = useConsultaPublica<RespostaLista<InterclassePublico> | InterclassePublico[]>("/api/interclasses?situacao=encerrado&limite=6");
  const url = useMemo(() => {
    const parametros = new URLSearchParams({ pagina: String(pagina), limite: "24" });
    Object.entries(filtros).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    const consulta = parametros.toString();
    return `/api/interclasses${consulta ? `?${consulta}` : ""}`;
  }, [filtros, pagina]);
  const { dados, carregando, erro, recarregar } = useConsultaPublica<RespostaLista<InterclassePublico> | InterclassePublico[]>(url);
  const campeonatos = dados ? extrairItens(dados) : [];
  const campeonatosEmAndamento = emAndamento.dados ? extrairItens(emAndamento.dados) : [];
  const campeonatosProximos = proximos.dados ? extrairItens(proximos.dados) : [];
  const campeonatosEncerrados = encerrados.dados ? extrairItens(encerrados.dados) : [];
  const resultadosRecentes = [...campeonatosEmAndamento, ...campeonatosEncerrados]
    .flatMap((campeonato) => campeonato.ultimoResultado ? [{ campeonato, jogo: campeonato.ultimoResultado }] : [])
    .sort((primeiro, segundo) => String(segundo.jogo.atualizadoEm || segundo.jogo.data || "").localeCompare(String(primeiro.jogo.atualizadoEm || primeiro.jogo.data || "")))
    .slice(0, 3);
  function alterar(campo: keyof FiltrosInterclasse, valor: string) { setFiltros((atuais) => ({ ...atuais, [campo]: valor })); setPagina(1); }
  function limpar() { setFiltros({ situacao: "", ano: "", modalidade: "", categoria: "", turno: "", busca: "" }); setPagina(1); }
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="Interclasses" resumo="Consulte campeonatos, fases, chaves, partidas, resultados e documentos publicados." caminho="Eventos / Interclasses" />
      <div className="limite pagina-conteudo pagina-eventos">
        <div className="listas-central-eventos pagina-colecao-publica">
          <SecaoInterclasses titulo="Interclasses acontecendo agora" descricao="Campeonatos que estão com a chave pública em andamento." destino="/eventos/interclasses?situacao=em_andamento" vazio="Não há interclasses em andamento publicados." carregando={emAndamento.carregando} erro={emAndamento.erro} recarregar={emAndamento.recarregar}>
            {campeonatosEmAndamento.map((campeonato, indice) => <CartaoInterclasse campeonato={campeonato} key={campeonato.id ?? campeonato.slug ?? indice} />)}
          </SecaoInterclasses>
          <SecaoInterclasses titulo="Próximos interclasses" descricao="Campeonatos com programação publicada para começar." destino="/eventos/interclasses?situacao=proximo" vazio="Não há próximos interclasses publicados." carregando={proximos.carregando} erro={proximos.erro} recarregar={proximos.recarregar}>
            {campeonatosProximos.map((campeonato, indice) => <CartaoInterclasse campeonato={campeonato} key={campeonato.id ?? campeonato.slug ?? indice} />)}
          </SecaoInterclasses>
          <SecaoInterclasses titulo="Últimos resultados" descricao="Partidas concluídas nas chaves que já estão públicas." destino="/eventos/interclasses?situacao=encerrado" vazio="Ainda não há resultados públicos recentes." carregando={emAndamento.carregando || encerrados.carregando} erro={emAndamento.erro || encerrados.erro} recarregar={() => { emAndamento.recarregar(); encerrados.recarregar(); }}>
            {resultadosRecentes.map(({ campeonato, jogo }, indice) => <CartaoResultadoRecente campeonato={campeonato} jogo={jogo} key={`${campeonato.id ?? campeonato.slug ?? indice}-${jogo.id ?? jogo.slug ?? indice}`} />)}
          </SecaoInterclasses>
          <SecaoInterclasses titulo="Campeonatos encerrados" descricao="Edições concluídas com resultado ou registro público." destino="/eventos/interclasses?situacao=encerrado" vazio="Não há campeonatos encerrados publicados." carregando={encerrados.carregando} erro={encerrados.erro} recarregar={encerrados.recarregar}>
            {campeonatosEncerrados.slice(0, 3).map((campeonato, indice) => <CartaoInterclasse campeonato={campeonato} key={campeonato.id ?? campeonato.slug ?? indice} />)}
          </SecaoInterclasses>
        </div>
        <section className="arquivo-colecao" aria-labelledby="titulo-arquivo-interclasses"><div><h2 id="titulo-arquivo-interclasses">Todos os interclasses</h2><p>Busque por campeonato, modalidade, categoria, período, turno ou situação.</p></div><button className="botao-secundario" type="button" aria-expanded={arquivoAberto} aria-controls="filtros-arquivo-interclasses" onClick={() => setArquivoAberto((aberto) => !aberto)}>{arquivoAberto ? "Ocultar filtros" : "Procurar campeonato"}</button></section>
        {arquivoAberto && <div className="conteudo-arquivo" id="filtros-arquivo-interclasses">
          <form className="filtros-eventos" onSubmit={(evento) => evento.preventDefault()} aria-label="Filtros de interclasses">
            <label className="filtro-busca-largo"><span>Buscar campeonato</span><input type="search" value={filtros.busca} onChange={(evento) => alterar("busca", evento.target.value)} placeholder="Nome, modalidade ou edição" /></label>
            <label><span>Situação</span><select value={filtros.situacao} onChange={(evento) => alterar("situacao", evento.target.value)}><option value="">Todas</option><option value="em_andamento">Em andamento</option><option value="proximo">Próximos</option><option value="encerrado">Encerrados</option><option value="adiado">Adiados</option><option value="cancelado">Cancelados</option></select></label>
            <label><span>Ano</span><input type="number" inputMode="numeric" min="2000" max="2200" value={filtros.ano} onChange={(evento) => alterar("ano", evento.target.value)} placeholder="Todos" /></label>
            <label><span>Modalidade</span><input value={filtros.modalidade} onChange={(evento) => alterar("modalidade", evento.target.value)} placeholder="Todas" /></label>
            <label><span>Categoria</span><input value={filtros.categoria} onChange={(evento) => alterar("categoria", evento.target.value)} placeholder="Todas" /></label>
            <label><span>Turno</span><select value={filtros.turno} onChange={(evento) => alterar("turno", evento.target.value)}><option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label>
            <button type="button" onClick={limpar}>Limpar filtros</button>
          </form>
          <div className="resultado-filtros" aria-live="polite">{!carregando && !erro && <span>{dados && !Array.isArray(dados) ? dados.paginacao?.total ?? campeonatos.length : campeonatos.length} {(dados && !Array.isArray(dados) ? dados.paginacao?.total : campeonatos.length) === 1 ? "campeonato encontrado" : "campeonatos encontrados"}</span>}</div>
          {carregando && <EstadoCarregando texto="Carregando interclasses…" />}
          {erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
          {!carregando && !erro && !campeonatos.length && <EstadoVazio titulo="Nenhum interclasse encontrado" texto="Não há campeonato publicado que corresponda aos filtros escolhidos." />}
          {!!campeonatos.length && <div className="grade-eventos-publicos">{campeonatos.map((campeonato, indice) => <CartaoInterclasse campeonato={campeonato} key={campeonato.id ?? campeonato.slug ?? indice} />)}</div>}
          {dados && !Array.isArray(dados) && <PaginacaoPublica pagina={dados.paginacao?.pagina ?? pagina} totalPaginas={dados.paginacao?.totalPaginas ?? 0} aoMudar={setPagina} />}
        </div>}
      </div>
    </main>
  );
}

function fasesComJogos(fases: FasePublica[], partidas: JogoPublico[]) {
  return [...fases].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map((fase) => ({
    ...fase,
    jogos: (fase.jogos?.length ? fase.jogos : fase.partidas?.length ? fase.partidas : partidas.filter((jogo) => jogo.faseId === fase.id || (temTexto(jogo.faseNome || jogo.fase) && (jogo.faseNome || jogo.fase) === fase.nome))).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
  }));
}

function PartidaChave({ jogo, campeonatoSlug }: { jogo: JogoPublico; campeonatoSlug: string }) {
  const vencedor = nomeVencedor(jogo);
  const destino = caminhoJogo(campeonatoSlug, jogo);
  const conteudo = <>
    <div className="cabecalho-partida-chave"><span>{jogo.rodada ? `Rodada ${jogo.rodada}` : "Partida"}</span><small>{rotuloSituacao(jogo.situacao)}</small></div>
    <div className={`equipe-chave ${vencedor && vencedor === nomeJogo(jogo, "a") ? "equipe-vencedora" : ""}`}><span>{nomeJogo(jogo, "a")}</span>{temPlacar(jogo) && <strong>{jogo.placarA}</strong>}</div>
    <div className={`equipe-chave ${vencedor && vencedor === nomeJogo(jogo, "b") ? "equipe-vencedora" : ""}`}><span>{nomeJogo(jogo, "b")}</span>{temPlacar(jogo) && <strong>{jogo.placarB}</strong>}</div>
    {(jogo.data || jogo.horario) && <div className="data-chave">{[formatarData(jogo.data), jogo.horario].filter(Boolean).join(" · ")}</div>}
    {vencedor && <p className="avanco-chave"><strong>{vencedor}</strong> avançou nesta partida.</p>}
  </>;
  return destino ? <Link className="partida-chave" href={destino}>{conteudo}</Link> : <article className="partida-chave">{conteudo}</article>;
}

function ChaveCampeonato({ fases, partidas, campeonatoSlug }: { fases: FasePublica[]; partidas: JogoPublico[]; campeonatoSlug: string }) {
  const colunas = fasesComJogos(fases, partidas);
  const [faseEscolhida, setFaseEscolhida] = useState(String(colunas[0]?.id ?? colunas[0]?.nome ?? ""));
  const rolagem = useRef<HTMLDivElement>(null);
  if (!colunas.length) return <EstadoVazio titulo="Chave ainda não publicada" texto="As fases e partidas aparecerão aqui quando forem publicadas." />;
  const faseMovel = colunas.find((fase) => String(fase.id ?? fase.nome) === faseEscolhida) || colunas[0];
  const avancaram = partidas.map(nomeVencedor).filter(Boolean);
  function rolar(distancia: number) {
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rolagem.current?.scrollBy({ left: distancia, behavior: reduzirMovimento ? "auto" : "smooth" });
  }
  return (
    <section aria-labelledby="titulo-chave">
      <div className="cabecalho-chave"><div><h2 id="titulo-chave">Chave do campeonato</h2><p>As partidas são organizadas por fase. Abra um jogo para consultar todos os detalhes.</p></div><div className="controles-rolagem-chave" aria-label="Mover a chave"><button type="button" onClick={() => rolar(-340)} aria-label="Ver fases anteriores">‹</button><button type="button" onClick={() => rolar(340)} aria-label="Ver próximas fases">›</button></div></div>
      <div className="chave-desktop" ref={rolagem} tabIndex={0} role="region" aria-label="Chave do campeonato com rolagem horizontal">
        {colunas.map((fase) => <section className="coluna-fase" key={fase.id ?? fase.nome}><h3>{fase.nome || "Fase"}</h3><div>{fase.jogos?.length ? fase.jogos.map((jogo, indice) => <PartidaChave jogo={jogo} campeonatoSlug={campeonatoSlug} key={jogo.id ?? jogo.slug ?? indice} />) : <p className="fase-sem-jogos">Nenhuma partida publicada nesta fase.</p>}</div></section>)}
      </div>
      <div className="chave-mobile">
        <label htmlFor="fase-chave">Fase exibida</label>
        <select id="fase-chave" value={faseEscolhida} onChange={(evento) => setFaseEscolhida(evento.target.value)}>{colunas.map((fase) => <option value={String(fase.id ?? fase.nome)} key={fase.id ?? fase.nome}>{fase.nome || "Fase"}</option>)}</select>
        <section className="coluna-fase"><h3>{faseMovel.nome || "Fase"}</h3>{faseMovel.jogos?.length ? faseMovel.jogos.map((jogo, indice) => <PartidaChave jogo={jogo} campeonatoSlug={campeonatoSlug} key={jogo.id ?? jogo.slug ?? indice} />) : <p className="fase-sem-jogos">Nenhuma partida publicada nesta fase.</p>}</section>
      </div>
      <div className="descricao-chave" aria-label="Descrição textual dos classificados"><h3>Caminho dos classificados</h3>{avancaram.length ? <ul>{avancaram.map((nome, indice) => <li key={`${nome}-${indice}`}>{nome} avançou em uma partida concluída.</li>)}</ul> : <p>Nenhum classificado foi publicado até o momento.</p>}</div>
    </section>
  );
}

function ListaPartidas({ partidas, campeonatoSlug }: { partidas: JogoPublico[]; campeonatoSlug: string }) {
  if (!partidas.length) return <EstadoVazio titulo="Nenhuma partida publicada" texto="Os jogos aparecerão aqui quando forem publicados." />;
  return <div className="lista-partidas-publicas">{partidas.map((jogo, indice) => {
    const destino = caminhoJogo(campeonatoSlug, jogo);
    const conteudo = <><div><span className={`selo-situacao situacao-${classeSituacao(jogo.situacao)}`}>{rotuloSituacao(jogo.situacao)}</span><small>{jogo.faseNome || jogo.fase}</small></div><h3>{nomeJogo(jogo, "a")} <span>×</span> {nomeJogo(jogo, "b")}</h3>{temPlacar(jogo) && <strong className="placar-lista">{jogo.placarA} × {jogo.placarB}</strong>}<p>{[formatarData(jogo.data), jogo.horario, jogo.local].filter(temTexto).join(" · ")}</p>{destino && <b>Ver detalhes da partida ›</b>}</>;
    return destino ? <Link href={destino} key={jogo.id ?? jogo.slug ?? indice}>{conteudo}</Link> : <article key={jogo.id ?? jogo.slug ?? indice}>{conteudo}</article>;
  })}</div>;
}

function TabelaClassificacao({ linhas }: { linhas: ClassificacaoPublica[] }) {
  if (!linhas.length) return <EstadoVazio titulo="Classificação não publicada" texto="Este campeonato ainda não possui uma classificação pública." />;
  return <div className="tabela-responsiva"><table className="tabela-eventos"><caption>Classificação do campeonato</caption><thead><tr><th scope="col">Posição</th><th scope="col">Equipe ou turma</th><th scope="col">Pontos</th><th scope="col">Jogos</th><th scope="col">Vitórias</th><th scope="col">Empates</th><th scope="col">Derrotas</th><th scope="col">Saldo</th></tr></thead><tbody>{linhas.map((linha, indice) => <tr key={linha.id ?? indice}><td>{linha.posicao ?? indice + 1}</td><th scope="row">{textoParticipante(linha.participante) || "Informação ainda não publicada"}</th><td>{linha.pontos ?? "—"}</td><td>{linha.jogos ?? "—"}</td><td>{linha.vitorias ?? "—"}</td><td>{linha.empates ?? "—"}</td><td>{linha.derrotas ?? "—"}</td><td>{linha.saldo ?? "—"}</td></tr>)}</tbody></table></div>;
}

export function DetalheInterclasse({ slug, guiaInicial }: { slug: string; guiaInicial?: string }) {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<RespostaInterclasse>(`/api/interclasses/${encodeURIComponent(slug)}`);
  if (carregando) return <main id="conteudo"><CabecalhoPagina titulo="Interclasse" resumo="Carregando o campeonato…" caminho="Eventos / Interclasses" /><div className="limite pagina-conteudo"><EstadoCarregando /></div></main>;
  if (erro || !dados?.item) return <main id="conteudo"><CabecalhoPagina titulo="Interclasse" resumo="Não foi possível abrir este campeonato." caminho="Eventos / Interclasses" /><div className="limite pagina-conteudo"><EstadoErro mensagem={erro || "Campeonato não encontrado."} tentarNovamente={recarregar} /><VoltarPara href="/eventos/interclasses">Voltar para interclasses</VoltarPara></div></main>;
  const campeonato = { ...dados.item, fases: dados.fases || dados.item.fases, jogos: dados.partidas || dados.item.jogos, documentos: dados.documentos || dados.item.documentos, atualizacoes: dados.atualizacoes || dados.item.atualizacoes, classificacao: dados.classificacao || dados.item.classificacao };
  const fases = campeonato.fases || [];
  const partidas = campeonato.jogos || [];
  const classificacao = campeonato.classificacao || [];
  const guias = [{ id: "visao-geral", nome: "Visão geral", mostrar: true }, { id: "chave", nome: "Chave", mostrar: fases.length > 0 }, { id: "jogos", nome: "Jogos", mostrar: partidas.length > 0 }, { id: "classificacao", nome: "Classificação", mostrar: classificacao.length > 0 }, { id: "documentos", nome: "Regulamento e documentos", mostrar: temTexto(campeonato.regulamento) || (campeonato.documentos?.length ?? 0) > 0 }].filter((guia) => guia.mostrar);
  const guia = guias.some((item) => item.id === guiaInicial) ? guiaInicial : "visao-geral";
  const campeao = textoParticipante(campeonato.campeao);
  const proxima = campeonato.proximaPartida || campeonato.proximoJogo;
  const imagem = urlPublica(campeonato.imagemCapaUrl || campeonato.imagemUrl || campeonato.imagem);
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo={campeonato.nome || "Interclasse"} resumo={[campeonato.edicao || (campeonato.ano !== undefined ? String(campeonato.ano) : ""), campeonato.modalidade, campeonato.categoria].filter(temTexto).join(" · ") || "Informações públicas do campeonato."} caminho="Eventos / Interclasses" />
      <article className="limite pagina-conteudo detalhe-publicacao">
        <VoltarPara href="/eventos/interclasses">Voltar para interclasses</VoltarPara>
        <div className="destaques-campeonato"><span className={`selo-situacao situacao-${classeSituacao(campeonato.situacao)}`}>{resumoSituacao(campeonato)}</span>{temTexto(campeonato.faseAtual) && <span><small>Fase atual</small><strong>{campeonato.faseAtual}</strong></span>}{campeao && <span><small>Campeão</small><strong>{campeao}</strong></span>}</div>
        {imagem && <img className="capa-detalhe-campeonato" src={imagem} alt="" />}
        <nav className="guias-evento" aria-label="Seções do campeonato">{guias.map((item) => <Link href={`/eventos/interclasses/${encodeURIComponent(slug)}?guia=${item.id}`} aria-current={guia === item.id ? "page" : undefined} key={item.id}>{item.nome}</Link>)}</nav>
        {guia === "visao-geral" && <div className="conteudo-guia">
          <ListaDefinicoes itens={[{ rotulo: "Situação", valor: rotuloSituacao(campeonato.situacao) }, { rotulo: "Fase atual", valor: campeonato.faseAtual }, { rotulo: "Modalidade", valor: campeonato.modalidade }, { rotulo: "Categoria", valor: campeonato.categoria }, { rotulo: "Edição", valor: campeonato.edicao || campeonato.ano }, { rotulo: "Data de início", valor: formatarData(campeonato.dataInicial || campeonato.dataInicio) }, { rotulo: "Data de encerramento", valor: formatarData(campeonato.dataFinal || campeonato.dataFim || campeonato.dataPrevistaEncerramento) }, { rotulo: "Local ou locais", valor: Array.isArray(campeonato.locais) ? campeonato.locais.join(", ") : campeonato.locais || campeonato.local }, { rotulo: "Organização", valor: campeonato.organizacao }, { rotulo: "Equipes ou turmas", valor: campeonato.quantidadeParticipantes ?? campeonato.quantidadeEquipes }]} />
          <BlocoTexto titulo="Sobre o campeonato" conteudo={campeonato.descricaoCompleta || campeonato.descricao} />
          {proxima && <section className="bloco-conteudo-evento chamada-partida"><h2>Próximo jogo</h2><h3>{nomeJogo(proxima, "a")} × {nomeJogo(proxima, "b")}</h3><p>{[formatarData(proxima.data), proxima.horario, proxima.local].filter(temTexto).join(" · ")}</p>{caminhoJogo(slug, proxima) && <Link href={caminhoJogo(slug, proxima)}>Ver a página da partida ›</Link>}</section>}
          {campeonato.ultimoResultado && <section className="bloco-conteudo-evento chamada-partida"><h2>Último resultado</h2><h3>{nomeJogo(campeonato.ultimoResultado, "a")} {temPlacar(campeonato.ultimoResultado) ? `${campeonato.ultimoResultado.placarA} × ${campeonato.ultimoResultado.placarB}` : "×"} {nomeJogo(campeonato.ultimoResultado, "b")}</h3></section>}
          {!!campeonato.atualizacoes?.length && <section className="bloco-conteudo-evento"><h2>Notícias e atualizações</h2><div className="linha-atualizacoes">{campeonato.atualizacoes.map((atualizacao, indice) => <article key={`${atualizacao.titulo}-${indice}`}><time>{formatarData(atualizacao.data)}</time>{temTexto(atualizacao.titulo) && <h3>{atualizacao.titulo}</h3>}{temTexto(atualizacao.texto) && <p>{atualizacao.texto}</p>}</article>)}</div></section>}
          <BlocoTexto titulo="Observações" conteudo={campeonato.observacoesPublicas || campeonato.observacoes} />
        </div>}
        {guia === "chave" && <div className="conteudo-guia"><ChaveCampeonato key={slug} fases={fases} partidas={partidas} campeonatoSlug={slug} /></div>}
        {guia === "jogos" && <div className="conteudo-guia"><ListaPartidas partidas={partidas} campeonatoSlug={slug} /></div>}
        {guia === "classificacao" && <div className="conteudo-guia"><TabelaClassificacao linhas={classificacao} /></div>}
        {guia === "documentos" && <div className="conteudo-guia"><BlocoTexto titulo="Regulamento" conteudo={campeonato.regulamento} /><ListaDocumentos documentos={campeonato.documentos} titulo="Documentos do campeonato" /></div>}
        {temTexto(campeonato.atualizadoEm) && <p className="ultima-atualizacao">Última atualização: <time dateTime={campeonato.atualizadoEm}>{formatarDataHora(campeonato.atualizadoEm)}</time></p>}
      </article>
    </main>
  );
}

export function DetalheJogo({ campeonato, jogo }: { campeonato: string; jogo: string }) {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<{ item: JogoPublico }>(`/api/interclasses/${encodeURIComponent(campeonato)}/jogos/${encodeURIComponent(jogo)}`);
  const partida = dados?.item;
  if (carregando) return <main id="conteudo"><CabecalhoPagina titulo="Partida" resumo="Carregando as informações do jogo…" caminho="Eventos / Interclasses / Jogos" /><div className="limite pagina-conteudo"><EstadoCarregando /></div></main>;
  if (erro || !partida) return <main id="conteudo"><CabecalhoPagina titulo="Partida" resumo="Não foi possível abrir esta partida." caminho="Eventos / Interclasses / Jogos" /><div className="limite pagina-conteudo"><EstadoErro mensagem={erro || "Partida não encontrada."} tentarNovamente={recarregar} /><VoltarPara href={`/eventos/interclasses/${encodeURIComponent(campeonato)}`}>Voltar para o campeonato</VoltarPara></div></main>;
  const vencedor = nomeVencedor(partida);
  const resumoPlacar = temPlacar(partida)
    ? `${nomeJogo(partida, "a")}: ${partida.placarA}; ${nomeJogo(partida, "b")}: ${partida.placarB}.`
    : `${nomeJogo(partida, "a")} contra ${nomeJogo(partida, "b")}. Placar ainda não publicado.`;
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo={`${nomeJogo(partida, "a")} × ${nomeJogo(partida, "b")}`} resumo={[partida.campeonatoNome, partida.faseNome || partida.fase, partida.rodada ? `Rodada ${partida.rodada}` : ""].filter(temTexto).join(" · ") || "Informações públicas da partida."} caminho="Eventos / Interclasses / Jogos" />
      <article className="limite pagina-conteudo detalhe-publicacao">
        <VoltarPara href={`/eventos/interclasses/${encodeURIComponent(campeonato)}`}>Voltar para o campeonato</VoltarPara>
        <section className="placar-partida" aria-label="Placar da partida"><span className={`selo-situacao situacao-${classeSituacao(partida.situacao)}`}>{rotuloSituacao(partida.situacao)}</span><p className="somente-leitor">{resumoPlacar}</p><div aria-hidden="true"><strong>{nomeJogo(partida, "a")}</strong><b>{temPlacar(partida) ? partida.placarA : "—"}</b><span>×</span><b>{temPlacar(partida) ? partida.placarB : "—"}</b><strong>{nomeJogo(partida, "b")}</strong></div>{!temPlacar(partida) && <p>Placar ainda não publicado.</p>}{vencedor && <p><strong>Vencedor: {vencedor}</strong>{temTexto(partida.formaVitoria) && ` — ${partida.formaVitoria}`}</p>}</section>
        <ListaDefinicoes itens={[{ rotulo: "Fase", valor: partida.faseNome || partida.fase }, { rotulo: "Rodada", valor: partida.rodada }, { rotulo: "Data", valor: formatarData(partida.data) }, { rotulo: "Horário", valor: partida.horario }, { rotulo: "Local", valor: partida.local }, { rotulo: "Situação", valor: rotuloSituacao(partida.situacao) }]} />
        <BlocoTexto titulo="Informações importantes" conteudo={partida.informacoes} />
        <BlocoTexto titulo="Resumo da partida" conteudo={partida.resumo} />
        <BlocoTexto titulo="Destaques" conteudo={partida.destaques} />
        <BlocoTexto titulo="Observações" conteudo={partida.observacoesPublicas || partida.observacoes} />
        {!!partida.atualizacoes?.length && <section className="bloco-conteudo-evento"><h2>Atualizações</h2><div className="linha-atualizacoes">{partida.atualizacoes.map((atualizacao, indice) => <article key={`${atualizacao.data}-${indice}`}><time>{formatarDataHora(atualizacao.data)}</time>{temTexto(atualizacao.titulo) && <h3>{atualizacao.titulo}</h3>}{temTexto(atualizacao.texto) && <p>{atualizacao.texto}</p>}</article>)}</div></section>}
        {!!partida.historicoDatas?.length && <section className="bloco-conteudo-evento"><h2>Alterações de data</h2><ul>{partida.historicoDatas.map((alteracao, indice) => <li key={`${alteracao.data}-${indice}`}>{[formatarData(alteracao.data), alteracao.horario, alteracao.observacao].filter(temTexto).join(" · ")}</li>)}</ul></section>}
        {partida.proximaPartida && <section className="bloco-conteudo-evento chamada-partida"><h2>Próxima partida do vencedor</h2><h3>{nomeJogo(partida.proximaPartida, "a")} × {nomeJogo(partida.proximaPartida, "b")}</h3><p>{[formatarData(partida.proximaPartida.data), partida.proximaPartida.horario, partida.proximaPartida.local].filter(temTexto).join(" · ")}</p>{caminhoJogo(campeonato, partida.proximaPartida) && <Link href={caminhoJogo(campeonato, partida.proximaPartida)}>Abrir próxima partida ›</Link>}</section>}
        <GaleriaPublica imagens={partida.imagens} />
        {temTexto(partida.atualizadoEm) && <p className="ultima-atualizacao">Última atualização: <time dateTime={partida.atualizadoEm}>{formatarDataHora(partida.atualizadoEm)}</time></p>}
      </article>
    </main>
  );
}
