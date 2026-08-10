"use client";

import Link from "next/link";
import { Children, useMemo, useState } from "react";
import type { CentralEventosPublica, DocumentoPublico, EventoPublico, InterclassePublico, JogoPublico, ReuniaoPublica, RespostaLista } from "../eventos/modelo-publico";
import { classeSituacao, extrairItens, formatarData, formatarDataHora, rotuloSituacao, rotuloTurno, temTexto, textoParticipante, urlPublica } from "../eventos/modelo-publico";
import { useConsultaPublica } from "../eventos/useConsultaPublica";
import CabecalhoPagina from "./CabecalhoPagina";
import { BlocoTexto, GaleriaPublica, ListaDefinicoes, ListaDocumentos, VoltarPara } from "./ElementosEventos";
import { EstadoCarregando, EstadoErro, EstadoVazio, PaginacaoPublica } from "./EstadoConsultaPublica";

function SeloSituacao({ situacao }: { situacao?: string }) {
  const rotulo = situacao === "em_andamento" ? "Em andamento" : rotuloSituacao(situacao);
  return <span className={`selo-situacao situacao-${classeSituacao(situacao)}`}>{rotulo}</span>;
}

function dataDoEvento(evento: EventoPublico) {
  const inicio = formatarData(evento.dataInicial || evento.dataInicio);
  const fim = formatarData(evento.dataFinal || evento.dataFim);
  if (inicio && fim && fim !== inicio) return `${inicio} a ${fim}`;
  return inicio || fim;
}

export function CartaoEventoInterno({ evento }: { evento: EventoPublico }) {
  const imagem = urlPublica(evento.imagemCapaUrl || evento.imagemCapa);
  const destino = temTexto(evento.slug) ? `/eventos/internos/${encodeURIComponent(evento.slug)}` : "";
  const conteudo = (
    <>
      {imagem && <img className="capa-cartao-evento" src={imagem} alt="" />}
      <div className="conteudo-cartao-evento">
        <div className="linha-selos-evento"><SeloSituacao situacao={evento.arquivado ? "arquivado" : evento.situacao} />{temTexto(evento.categoria) && <span className="categoria-publica">{evento.categoria}</span>}</div>
        <h2>{evento.titulo || "Evento com título ainda não publicado"}</h2>
        {temTexto(evento.subtitulo) && <strong className="subtitulo-evento">{evento.subtitulo}</strong>}
        {temTexto(evento.descricaoCurta || evento.descricao) && <p>{evento.descricaoCurta || evento.descricao}</p>}
        <div className="resumo-dados-cartao">
          {dataDoEvento(evento) && <time dateTime={evento.dataInicial || evento.dataInicio}>{dataDoEvento(evento)}</time>}
          {temTexto(evento.horarioInicial || evento.horario) && <span>{[evento.horarioInicial || evento.horario, evento.horarioFinal].filter(temTexto).join("–")}</span>}
          {temTexto(evento.local) && <span>{evento.local}</span>}
        </div>
        {destino && <b>Ver informações completas ›</b>}
      </div>
    </>
  );
  return destino ? <Link className="cartao-evento-publico" href={destino}>{conteudo}</Link> : <article className="cartao-evento-publico">{conteudo}</article>;
}

function CartaoInterclasseResumo({ campeonato }: { campeonato: InterclassePublico }) {
  const destino = temTexto(campeonato.slug) ? `/eventos/interclasses/${encodeURIComponent(campeonato.slug)}` : "/eventos/interclasses";
  const campeao = textoParticipante(campeonato.campeao);
  return (
    <Link className="cartao-resumo-central" href={destino}>
      <SeloSituacao situacao={campeonato.situacao} />
      <h3>{campeonato.nome || "Interclasse com nome ainda não publicado"}</h3>
      <p>{[campeonato.modalidade, campeonato.categoria, campeonato.edicao || (campeonato.ano !== undefined ? String(campeonato.ano) : "")].filter(temTexto).join(" · ")}</p>
      {temTexto(campeonato.faseAtual) && <strong>Fase atual: {campeonato.faseAtual}</strong>}
      {campeao && <strong>Campeão: {campeao}</strong>}
      <span>Ver campeonato ›</span>
    </Link>
  );
}

function CartaoJogoResumo({ jogo }: { jogo: JogoPublico }) {
  const participanteA = textoParticipante(jogo.participanteA) || jogo.participanteANome || jogo.nomeParticipanteA;
  const participanteB = textoParticipante(jogo.participanteB) || jogo.participanteBNome || jogo.nomeParticipanteB;
  const destino = jogo.campeonatoSlug && (jogo.slug || jogo.id) ? `/eventos/interclasses/${encodeURIComponent(jogo.campeonatoSlug)}/jogos/${encodeURIComponent(String(jogo.slug || jogo.id))}` : "/eventos/interclasses";
  return (
    <Link className="cartao-resumo-central" href={destino}>
      <SeloSituacao situacao={jogo.situacao} />
      <h3>{participanteA || "Participante a definir"} <span aria-label="contra">×</span> {participanteB || "Participante a definir"}</h3>
      {temTexto(jogo.faseNome || jogo.fase) && <p>{jogo.faseNome || jogo.fase}</p>}
      {(formatarData(jogo.data) || jogo.horario) && <strong>{[formatarData(jogo.data), jogo.horario].filter(Boolean).join(" · ")}</strong>}
      <span>Ver partida ›</span>
    </Link>
  );
}

function CartaoReuniaoResumo({ reuniao }: { reuniao: ReuniaoPublica }) {
  const destino = temTexto(reuniao.slug) ? `/eventos/reunioes/${encodeURIComponent(reuniao.slug)}` : "/eventos/reunioes";
  return (
    <Link className="cartao-resumo-central" href={destino}>
      <SeloSituacao situacao={reuniao.situacao} />
      <h3>{reuniao.titulo || "Reunião com título ainda não publicado"}</h3>
      {temTexto(reuniao.tipo) && <p>{reuniao.tipo}</p>}
      {(formatarData(reuniao.data) || reuniao.horario) && <strong>{[formatarData(reuniao.data), reuniao.horario].filter(Boolean).join(" · ")}</strong>}
      <span>Ver resumo e documentos ›</span>
    </Link>
  );
}

function SecaoCentral({ titulo, descricao, destino, vazio, children }: { titulo: string; descricao: string; destino: string; vazio: string; children?: React.ReactNode }) {
  const possuiConteudo = Children.count(children) > 0;
  return (
    <section className="secao-central-eventos">
      <div className="cabecalho-lista-eventos"><div><h2>{titulo}</h2><p>{descricao}</p></div><Link href={destino}>Ver tudo ›</Link></div>
      {possuiConteudo ? <div className="grade-resumos-central">{children}</div> : <EstadoVazio titulo="Nenhuma publicação nesta seção" texto={vazio} />}
    </section>
  );
}

function SecaoDestaquePublica({ titulo, descricao, destino, vazio, carregando, erro, recarregar, children }: { titulo: string; descricao: string; destino: string; vazio: string; carregando: boolean; erro: string; recarregar: () => void; children?: React.ReactNode }) {
  const possuiConteudo = Children.count(children) > 0;
  return (
    <section className="secao-central-eventos secao-destaque-publica">
      <div className="cabecalho-lista-eventos"><div><h2>{titulo}</h2><p>{descricao}</p></div><Link href={destino}>Ver todos ›</Link></div>
      {carregando && <EstadoCarregando texto={`Carregando ${titulo.toLowerCase()}…`} />}
      {!carregando && erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
      {!carregando && !erro && (possuiConteudo ? <div className="grade-resumos-central">{children}</div> : <EstadoVazio titulo="Nenhuma publicação nesta seção" texto={vazio} />)}
    </section>
  );
}

export function CentralEventos() {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<CentralEventosPublica>("/api/eventos?central=1");
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="Eventos" resumo="Acompanhe atividades do colégio, interclasses, jogos, reuniões, atas e publicações recentes do GECEP." />
      <div className="limite pagina-conteudo pagina-eventos">
        <nav className="atalhos-eventos" aria-label="Áreas de eventos">
          <Link href="/eventos/internos"><strong>Eventos internos</strong><span>Atividades, campanhas e programações</span></Link>
          <Link href="/eventos/interclasses"><strong>Interclasses</strong><span>Campeonatos, chaves e partidas</span></Link>
          <Link href="/eventos/reunioes"><strong>Reuniões e atas</strong><span>Resumos, presenças e documentos</span></Link>
          <Link href="/representantes"><strong>Representantes</strong><span>Consulte a representação das turmas</span></Link>
        </nav>
        {carregando && <EstadoCarregando texto="Carregando a central de eventos…" />}
        {erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
        {dados && <div className="listas-central-eventos">
          <SecaoCentral titulo="Acontecendo agora" descricao="Atividades que estão em andamento." destino="/eventos/internos?situacao=acontecendo_agora" vazio="Não há eventos acontecendo agora.">
            {dados.acontecendoAgora?.map((evento, indice) => <CartaoEventoInterno evento={evento} key={evento.id ?? evento.slug ?? indice} />)}
          </SecaoCentral>
          <SecaoCentral titulo="Próximos eventos" descricao="Próximas atividades internas publicadas." destino="/eventos/internos?situacao=proximo" vazio="Não há próximos eventos publicados.">
            {(dados.proximos || dados.proximosEventos)?.map((evento, indice) => <CartaoEventoInterno evento={evento} key={evento.id ?? evento.slug ?? indice} />)}
          </SecaoCentral>
          <SecaoCentral titulo="Interclasses em andamento" descricao="Campeonatos com atividades em curso." destino="/eventos/interclasses?situacao=em_andamento" vazio="Não há interclasses em andamento publicados.">
            {dados.interclassesEmAndamento?.map((campeonato, indice) => <CartaoInterclasseResumo campeonato={campeonato} key={campeonato.id ?? campeonato.slug ?? indice} />)}
          </SecaoCentral>
          <SecaoCentral titulo="Próximos jogos" descricao="Partidas com data ou programação publicada." destino="/eventos/interclasses" vazio="Não há próximos jogos publicados.">
            {dados.proximosJogos?.map((jogo, indice) => <CartaoJogoResumo jogo={jogo} key={jogo.id ?? jogo.slug ?? indice} />)}
          </SecaoCentral>
          <SecaoCentral titulo="Reuniões e atas recentes" descricao="Últimas reuniões com conteúdo público." destino="/eventos/reunioes" vazio="Não há reuniões ou atas publicadas.">
            {dados.reunioesRecentes?.map((reuniao, indice) => <CartaoReuniaoResumo reuniao={reuniao} key={reuniao.id ?? reuniao.slug ?? indice} />)}
          </SecaoCentral>
          <aside className="arquivo-eventos"><div><strong>Arquivo de eventos</strong><p>Use os filtros de ano e situação para consultar atividades encerradas e arquivadas.</p></div><div><Link className="botao-secundario" href="/eventos/internos?situacao=encerrado">Eventos encerrados</Link><Link className="botao-secundario" href="/eventos/internos?situacao=arquivado">Arquivo histórico</Link></div></aside>
        </div>}
      </div>
    </main>
  );
}

type FiltrosEvento = { situacao: string; ano: string; mes: string; categoria: string; turno: string; publico: string };

export function ListaEventosInternos({ filtrosIniciais = {} }: { filtrosIniciais?: Partial<FiltrosEvento> }) {
  const [filtros, setFiltros] = useState<FiltrosEvento>({ situacao: filtrosIniciais.situacao || "", ano: filtrosIniciais.ano || "", mes: filtrosIniciais.mes || "", categoria: filtrosIniciais.categoria || "", turno: filtrosIniciais.turno || "", publico: filtrosIniciais.publico || "" });
  const [pagina, setPagina] = useState(1);
  const [arquivoAberto, setArquivoAberto] = useState(() => Object.values(filtrosIniciais).some(Boolean));
  const agora = useConsultaPublica<RespostaLista<EventoPublico> | EventoPublico[]>("/api/eventos?situacao=acontecendo_agora&limite=3");
  const proximos = useConsultaPublica<RespostaLista<EventoPublico> | EventoPublico[]>("/api/eventos?situacao=proximo&limite=3");
  const recentes = useConsultaPublica<RespostaLista<EventoPublico> | EventoPublico[]>("/api/eventos?situacao=encerrado&limite=3");
  const url = useMemo(() => {
    const parametros = new URLSearchParams({ pagina: String(pagina), limite: "24" });
    Object.entries(filtros).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    const consulta = parametros.toString();
    return `/api/eventos${consulta ? `?${consulta}` : ""}`;
  }, [filtros, pagina]);
  const { dados, carregando, erro, recarregar } = useConsultaPublica<RespostaLista<EventoPublico> | EventoPublico[]>(url);
  const eventos = dados ? extrairItens(dados) : [];
  const eventosAgora = agora.dados ? extrairItens(agora.dados) : [];
  const eventosProximos = proximos.dados ? extrairItens(proximos.dados) : [];
  const eventosRecentes = recentes.dados ? extrairItens(recentes.dados) : [];
  function alterar(campo: keyof FiltrosEvento, valor: string) { setFiltros((atuais) => ({ ...atuais, [campo]: valor })); setPagina(1); }
  function limpar() { setFiltros({ situacao: "", ano: "", mes: "", categoria: "", turno: "", publico: "" }); setPagina(1); }

  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="Eventos internos" resumo="Atividades realizadas no colégio ou organizadas pelo GECEP, com programação, orientações e documentos publicados." caminho="Eventos / Eventos internos" />
      <div className="limite pagina-conteudo pagina-eventos">
        <div className="listas-central-eventos pagina-colecao-publica">
          <SecaoDestaquePublica titulo="Acontecendo agora" descricao="Atividades internas em andamento no colégio." destino="/eventos/internos?situacao=acontecendo_agora" vazio="Não há eventos acontecendo agora." carregando={agora.carregando} erro={agora.erro} recarregar={agora.recarregar}>
            {eventosAgora.map((evento, indice) => <CartaoEventoInterno evento={evento} key={evento.id ?? evento.slug ?? indice} />)}
          </SecaoDestaquePublica>
          <SecaoDestaquePublica titulo="Próximos eventos" descricao="Programações internas que já foram publicadas." destino="/eventos/internos?situacao=proximo" vazio="Não há próximos eventos publicados." carregando={proximos.carregando} erro={proximos.erro} recarregar={proximos.recarregar}>
            {eventosProximos.map((evento, indice) => <CartaoEventoInterno evento={evento} key={evento.id ?? evento.slug ?? indice} />)}
          </SecaoDestaquePublica>
          <SecaoDestaquePublica titulo="Eventos recentes" descricao="Atividades encerradas com informações públicas disponíveis." destino="/eventos/internos?situacao=encerrado" vazio="Ainda não há eventos recentes publicados." carregando={recentes.carregando} erro={recentes.erro} recarregar={recentes.recarregar}>
            {eventosRecentes.map((evento, indice) => <CartaoEventoInterno evento={evento} key={evento.id ?? evento.slug ?? indice} />)}
          </SecaoDestaquePublica>
        </div>
        <section className="arquivo-colecao" aria-labelledby="titulo-arquivo-eventos">
          <div><h2 id="titulo-arquivo-eventos">Arquivo de eventos</h2><p>Procure atividades por situação, período, categoria, turno ou público destinado.</p></div>
          <button className="botao-secundario" type="button" aria-expanded={arquivoAberto} aria-controls="filtros-arquivo-eventos" onClick={() => setArquivoAberto((aberto) => !aberto)}>{arquivoAberto ? "Ocultar filtros" : "Procurar outro evento"}</button>
        </section>
        {arquivoAberto && <div className="conteudo-arquivo" id="filtros-arquivo-eventos">
          <form className="filtros-eventos" onSubmit={(evento) => evento.preventDefault()} aria-label="Filtros de eventos internos">
            <label><span>Situação</span><select value={filtros.situacao} onChange={(evento) => alterar("situacao", evento.target.value)}><option value="">Todas</option><option value="proximo">Próximos</option><option value="acontecendo_agora">Acontecendo agora</option><option value="encerrado">Encerrados</option><option value="adiado">Adiados</option><option value="cancelado">Cancelados</option><option value="arquivado">Arquivados</option></select></label>
            <label><span>Ano</span><input type="number" inputMode="numeric" min="2000" max="2200" value={filtros.ano} onChange={(evento) => alterar("ano", evento.target.value)} placeholder="Todos" /></label>
            <label><span>Mês</span><select value={filtros.mes} onChange={(evento) => alterar("mes", evento.target.value)}><option value="">Todos</option>{["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((mes, indice) => <option value={String(indice + 1)} key={mes}>{mes}</option>)}</select></label>
            <label><span>Categoria</span><input value={filtros.categoria} onChange={(evento) => alterar("categoria", evento.target.value)} placeholder="Todas" /></label>
            <label><span>Turno</span><select value={filtros.turno} onChange={(evento) => alterar("turno", evento.target.value)}><option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label>
            <label><span>Público destinado</span><input value={filtros.publico} onChange={(evento) => alterar("publico", evento.target.value)} placeholder="Todos" /></label>
            <button type="button" onClick={limpar}>Limpar filtros</button>
          </form>
          <div className="resultado-filtros" aria-live="polite">{!carregando && !erro && <span>{dados && !Array.isArray(dados) ? dados.paginacao?.total ?? eventos.length : eventos.length} {(dados && !Array.isArray(dados) ? dados.paginacao?.total : eventos.length) === 1 ? "evento encontrado" : "eventos encontrados"}</span>}</div>
          {carregando && <EstadoCarregando texto="Carregando eventos internos…" />}
          {erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
          {!carregando && !erro && !eventos.length && <EstadoVazio titulo="Nenhum evento encontrado" texto="Não há publicação que corresponda aos filtros escolhidos." />}
          {!!eventos.length && <div className="grade-eventos-publicos">{eventos.map((evento, indice) => <CartaoEventoInterno evento={evento} key={evento.id ?? evento.slug ?? indice} />)}</div>}
          {dados && !Array.isArray(dados) && <PaginacaoPublica pagina={dados.paginacao?.pagina ?? pagina} totalPaginas={dados.paginacao?.totalPaginas ?? 0} aoMudar={setPagina} />}
        </div>}
      </div>
    </main>
  );
}

export function DetalheEventoInterno({ slug }: { slug: string }) {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<{ item: EventoPublico; documentos?: DocumentoPublico[] }>(`/api/eventos/${encodeURIComponent(slug)}`);
  const evento = dados?.item ? { ...dados.item, documentos: dados.documentos || dados.item.documentos } : null;
  if (carregando) return <main id="conteudo"><CabecalhoPagina titulo="Evento interno" resumo="Carregando a publicação…" caminho="Eventos / Eventos internos" /><div className="limite pagina-conteudo"><EstadoCarregando /></div></main>;
  if (erro || !evento) return <main id="conteudo"><CabecalhoPagina titulo="Evento interno" resumo="Não foi possível abrir esta publicação." caminho="Eventos / Eventos internos" /><div className="limite pagina-conteudo"><EstadoErro mensagem={erro || "Evento não encontrado."} tentarNovamente={recarregar} /><VoltarPara href="/eventos/internos">Voltar para eventos internos</VoltarPara></div></main>;
  const imagem = urlPublica(evento.imagemCapaUrl || evento.imagemCapa);
  const linkExterno = urlPublica(evento.linkExterno);
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo={evento.titulo || "Evento interno"} resumo={evento.subtitulo || evento.descricaoCurta || evento.descricao || "Informações publicadas sobre o evento."} caminho="Eventos / Eventos internos" />
      <article className="limite pagina-conteudo detalhe-publicacao">
        <VoltarPara href="/eventos/internos">Voltar para eventos internos</VoltarPara>
        <div className="topo-detalhe-evento"><div><SeloSituacao situacao={evento.arquivado ? "arquivado" : evento.situacao} />{temTexto(evento.categoria) && <span className="categoria-publica">{evento.categoria}</span>}</div>{imagem && <img src={imagem} alt="" />}</div>
        <ListaDefinicoes itens={[
          { rotulo: "Data", valor: dataDoEvento(evento) }, { rotulo: "Horário", valor: [evento.horarioInicial || evento.horario, evento.horarioFinal].filter(temTexto).join("–") }, { rotulo: "Local", valor: evento.local }, { rotulo: "Turno", valor: rotuloTurno(evento.turno) }, { rotulo: "Público destinado", valor: evento.publicoDestinado }, { rotulo: "Organização", valor: evento.organizacaoResponsavel || evento.organizacao },
        ]} />
        <BlocoTexto titulo="Sobre o evento" conteudo={evento.descricaoCompleta || evento.descricao} />
        <BlocoTexto titulo="Programação" conteudo={evento.programacao} />
        <BlocoTexto titulo="Orientações" conteudo={evento.orientacoes} />
        <BlocoTexto titulo="Observações" conteudo={evento.observacoesPublicas || evento.observacoes} />
        {linkExterno && <p><a className="botao-primario" href={linkExterno} target="_blank" rel="noreferrer">Acessar informações externas ↗</a></p>}
        <ListaDocumentos documentos={evento.documentos} />
        <GaleriaPublica imagens={evento.imagens} />
        {temTexto(evento.atualizadoEm) && <p className="ultima-atualizacao">Última atualização: <time dateTime={evento.atualizadoEm}>{formatarDataHora(evento.atualizadoEm)}</time></p>}
      </article>
    </main>
  );
}
