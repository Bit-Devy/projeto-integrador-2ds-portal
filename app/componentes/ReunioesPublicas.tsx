"use client";

import Link from "next/link";
import { Children, useMemo, useState } from "react";
import type { DetalheReuniao, ItemReuniaoPublico, ListaPaginada, PresencaPublica, ReuniaoPublica, VotacaoPublica } from "../eventos/tipos";
import { classeSituacao, formatarData, formatarDataHora, normalizarBusca, rotuloSituacao, temTexto } from "../eventos/modelo-publico";
import { useConsultaPublica } from "../eventos/useConsultaPublica";
import CabecalhoPagina from "./CabecalhoPagina";
import { BlocoTexto, ListaDefinicoes, ListaDocumentos, VoltarPara } from "./ElementosEventos";
import { EstadoCarregando, EstadoErro, EstadoVazio, PaginacaoPublica } from "./EstadoConsultaPublica";

function rotuloTurno(valor: string) {
  return ({ manha: "Manhã", tarde: "Tarde", noite: "Noite" } as Record<string, string>)[valor] || valor;
}

function rotuloTipo(valor: string) {
  return ({ representantes: "Reunião com representantes de turma", interna_gecep: "Reunião interna do GECEP" } as Record<string, string>)[valor] || valor;
}

function rotuloNivel(valor: string) {
  return ({ fundamental: "Ensino Fundamental", medio: "Ensino Médio", outro: "Outro" } as Record<string, string>)[valor] || valor;
}

function rotuloPresenca(valor: string) {
  return ({ presente: "Presente", ausente: "Ausente", justificada: "Ausência justificada", nao_se_aplica: "Não se aplica", nao_informada: "Situação não informada" } as Record<string, string>)[valor] || valor;
}

function rotuloFuncao(valor: string) {
  return ({ titular: "Representante titular", vice: "Vice-representante", suplente: "Suplente", outra: "Outra função" } as Record<string, string>)[valor] || valor;
}

function CartaoReuniao({ reuniao }: { reuniao: ReuniaoPublica }) {
  return (
    <Link className="cartao-reuniao" href={`/eventos/reunioes/${encodeURIComponent(reuniao.slug)}`}>
      <div><span className={`selo-situacao situacao-${classeSituacao(reuniao.situacao)}`}>{rotuloSituacao(reuniao.situacao)}</span><small>{rotuloTipo(reuniao.tipo)}</small></div>
      <h2>{reuniao.titulo}</h2>
      {temTexto(reuniao.descricaoCurta) && <p>{reuniao.descricaoCurta}</p>}
      <dl><div><dt>Data</dt><dd>{formatarData(reuniao.data) || "Informação ainda não publicada"}</dd></div>{temTexto(reuniao.horario) && <div><dt>Horário</dt><dd>{reuniao.horario}</dd></div>}{temTexto(reuniao.local) && <div><dt>Local</dt><dd>{reuniao.local}</dd></div>}{reuniao.quantidadeParticipantes !== null && <div><dt>Participantes</dt><dd>{reuniao.quantidadeParticipantes}</dd></div>}</dl>
      <b>Ver resumo, presenças e documentos ›</b>
    </Link>
  );
}

function SecaoReunioes({ titulo, descricao, destino, vazio, carregando, erro, recarregar, children }: { titulo: string; descricao: string; destino: string; vazio: string; carregando: boolean; erro: string; recarregar: () => void; children?: React.ReactNode }) {
  const possuiConteudo = Children.count(children) > 0;
  return <section className="secao-central-eventos secao-destaque-publica"><div className="cabecalho-lista-eventos"><div><h2>{titulo}</h2><p>{descricao}</p></div><Link href={destino}>Ver todas ›</Link></div>{carregando && <EstadoCarregando texto={`Carregando ${titulo.toLowerCase()}…`} />}{!carregando && erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}{!carregando && !erro && (possuiConteudo ? <div className="grade-resumos-central">{children}</div> : <EstadoVazio titulo="Nenhuma publicação nesta seção" texto={vazio} />)}</section>;
}

type FiltrosReuniao = { busca: string; ano: string; mes: string; tipo: string; situacao: string; turno: string; nivel: string };

export function ListaReunioes({ filtrosIniciais = {} }: { filtrosIniciais?: Partial<FiltrosReuniao> }) {
  const [filtros, setFiltros] = useState<FiltrosReuniao>({ busca: filtrosIniciais.busca || "", ano: filtrosIniciais.ano || "", mes: filtrosIniciais.mes || "", tipo: filtrosIniciais.tipo || "", situacao: filtrosIniciais.situacao || "", turno: filtrosIniciais.turno || "", nivel: filtrosIniciais.nivel || "" });
  const [pagina, setPagina] = useState(1);
  const [arquivoAberto, setArquivoAberto] = useState(() => Object.values(filtrosIniciais).some(Boolean));
  const ultimas = useConsultaPublica<ListaPaginada<ReuniaoPublica>>("/api/reunioes?situacao=encerrada&limite=3");
  const proximas = useConsultaPublica<ListaPaginada<ReuniaoPublica>>("/api/reunioes?situacao=agendada&limite=3");
  const internas = useConsultaPublica<ListaPaginada<ReuniaoPublica>>("/api/reunioes?tipo=interna_gecep&limite=3");
  const url = useMemo(() => {
    const parametros = new URLSearchParams({ pagina: String(pagina), limite: "24" });
    Object.entries(filtros).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    const consulta = parametros.toString();
    return `/api/reunioes${consulta ? `?${consulta}` : ""}`;
  }, [filtros, pagina]);
  const { dados, carregando, erro, recarregar } = useConsultaPublica<ListaPaginada<ReuniaoPublica>>(url);
  const reunioes = dados?.itens || [];
  const reunioesUltimas = ultimas.dados?.itens || [];
  const reunioesProximas = proximas.dados?.itens || [];
  const reunioesInternas = internas.dados?.itens || [];
  function alterar(campo: keyof FiltrosReuniao, valor: string) { setFiltros((atuais) => ({ ...atuais, [campo]: valor })); setPagina(1); }
  function limpar() { setFiltros({ busca: "", ano: "", mes: "", tipo: "", situacao: "", turno: "", nivel: "" }); setPagina(1); }
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo="Reuniões e atas" resumo="Consulte reuniões publicadas, resumos, decisões, presenças históricas, atas e documentos." caminho="Eventos / Reuniões e atas" />
      <div className="limite pagina-conteudo pagina-eventos">
        <div className="listas-central-eventos pagina-colecao-publica">
          <SecaoReunioes titulo="Últimas reuniões" descricao="Resumos e atas das reuniões concluídas mais recentes." destino="/eventos/reunioes?situacao=encerrada" vazio="Ainda não há reuniões concluídas publicadas." carregando={ultimas.carregando} erro={ultimas.erro} recarregar={ultimas.recarregar}>
            {reunioesUltimas.map((reuniao, indice) => <CartaoReuniao reuniao={reuniao} key={reuniao.id ?? reuniao.slug ?? indice} />)}
          </SecaoReunioes>
          <SecaoReunioes titulo="Próximas reuniões" descricao="Encontros agendados com informações já publicadas." destino="/eventos/reunioes?situacao=agendada" vazio="Não há próximas reuniões publicadas." carregando={proximas.carregando} erro={proximas.erro} recarregar={proximas.recarregar}>
            {reunioesProximas.map((reuniao, indice) => <CartaoReuniao reuniao={reuniao} key={reuniao.id ?? reuniao.slug ?? indice} />)}
          </SecaoReunioes>
          <SecaoReunioes titulo="Reuniões internas do GECEP" descricao="Registros internos que a gestão escolheu publicar." destino="/eventos/reunioes?tipo=interna_gecep" vazio="Não há reuniões internas publicadas." carregando={internas.carregando} erro={internas.erro} recarregar={internas.recarregar}>
            {reunioesInternas.map((reuniao, indice) => <CartaoReuniao reuniao={reuniao} key={reuniao.id ?? reuniao.slug ?? indice} />)}
          </SecaoReunioes>
        </div>
        <section className="arquivo-colecao" aria-labelledby="titulo-arquivo-reunioes"><div><h2 id="titulo-arquivo-reunioes">Arquivo de reuniões e atas</h2><p>Localize uma reunião por texto, data, tipo, situação, turno ou nível de ensino.</p></div><button className="botao-secundario" type="button" aria-expanded={arquivoAberto} aria-controls="filtros-arquivo-reunioes" onClick={() => setArquivoAberto((aberto) => !aberto)}>{arquivoAberto ? "Ocultar filtros" : "Procurar reunião ou ata"}</button></section>
        {arquivoAberto && <div className="conteudo-arquivo" id="filtros-arquivo-reunioes">
          <form className="filtros-eventos" onSubmit={(evento) => evento.preventDefault()} aria-label="Filtros de reuniões">
            <label className="filtro-busca-largo"><span>Buscar reunião</span><input type="search" value={filtros.busca} onChange={(evento) => alterar("busca", evento.target.value)} placeholder="Título ou conteúdo publicado" /></label>
            <label><span>Ano</span><input type="number" inputMode="numeric" min="2000" max="2200" value={filtros.ano} onChange={(evento) => alterar("ano", evento.target.value)} placeholder="Todos" /></label>
            <label><span>Mês</span><select value={filtros.mes} onChange={(evento) => alterar("mes", evento.target.value)}><option value="">Todos</option>{["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((mes, indice) => <option value={String(indice + 1)} key={mes}>{mes}</option>)}</select></label>
            <label><span>Tipo</span><select value={filtros.tipo} onChange={(evento) => alterar("tipo", evento.target.value)}><option value="">Todos</option><option value="representantes">Com representantes</option><option value="interna_gecep">Interna do GECEP</option></select></label>
            <label><span>Situação</span><select value={filtros.situacao} onChange={(evento) => alterar("situacao", evento.target.value)}><option value="">Todas</option><option value="agendada">Agendadas</option><option value="em_andamento">Em andamento</option><option value="encerrada">Encerradas</option><option value="adiada">Adiadas</option><option value="cancelada">Canceladas</option></select></label>
            <label><span>Turno</span><select value={filtros.turno} onChange={(evento) => alterar("turno", evento.target.value)}><option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label>
            <label><span>Nível de ensino</span><select value={filtros.nivel} onChange={(evento) => alterar("nivel", evento.target.value)}><option value="">Todos</option><option value="fundamental">Ensino Fundamental</option><option value="medio">Ensino Médio</option><option value="outro">Outro</option></select></label>
            <button type="button" onClick={limpar}>Limpar filtros</button>
          </form>
          <div className="resultado-filtros" aria-live="polite">{!carregando && !erro && <span>{dados?.paginacao.total ?? reunioes.length} {(dados?.paginacao.total ?? reunioes.length) === 1 ? "reunião encontrada" : "reuniões encontradas"}</span>}</div>
          {carregando && <EstadoCarregando texto="Carregando reuniões e atas…" />}
          {erro && <EstadoErro mensagem={erro} tentarNovamente={recarregar} />}
          {!carregando && !erro && !reunioes.length && <EstadoVazio titulo="Nenhuma reunião encontrada" texto="Não há reunião publicada que corresponda aos filtros escolhidos." />}
          {!!reunioes.length && <div className="grade-reunioes">{reunioes.map((reuniao, indice) => <CartaoReuniao reuniao={reuniao} key={reuniao.id ?? reuniao.slug ?? indice} />)}</div>}
          {dados && <PaginacaoPublica pagina={dados.paginacao.pagina} totalPaginas={dados.paginacao.totalPaginas} aoMudar={setPagina} />}
        </div>}
      </div>
    </main>
  );
}

function ItensReuniao({ itens }: { itens: ItemReuniaoPublico[] }) {
  if (!itens.length) return null;
  return <section className="bloco-conteudo-evento"><h2>Itens e tarefas publicados</h2><div className="itens-reuniao">{itens.map((item) => <article key={item.id}><span>{item.tipo.replaceAll("_", " ")}</span>{temTexto(item.titulo) && <h3>{item.titulo}</h3>}{temTexto(item.conteudo) && <p>{item.conteudo}</p>}{(item.responsaveis || item.prazo) && <dl>{temTexto(item.responsaveis) && <div><dt>Responsáveis</dt><dd>{item.responsaveis}</dd></div>}{temTexto(item.prazo) && <div><dt>Prazo</dt><dd>{formatarData(item.prazo) || item.prazo}</dd></div>}</dl>}</article>)}</div></section>;
}

function Votacoes({ votacoes }: { votacoes: VotacaoPublica[] }) {
  if (!votacoes.length) return null;
  return <section className="bloco-conteudo-evento"><h2>Votações publicadas</h2><div className="votacoes-reuniao">{votacoes.map((votacao) => <article key={votacao.id}><h3>{votacao.titulo}</h3>{temTexto(votacao.pergunta) && <p><strong>{votacao.pergunta}</strong></p>}{temTexto(votacao.contexto) && <p>{votacao.contexto}</p>}{votacao.opcoes.length > 0 && <ul>{votacao.opcoes.map((opcao) => <li key={opcao.id}><span>{opcao.texto}</span><strong>{opcao.quantidadeVotos} {opcao.quantidadeVotos === 1 ? "voto" : "votos"}</strong></li>)}</ul>}<dl><div><dt>Abstenções</dt><dd>{votacao.abstencoes}</dd></div>{temTexto(votacao.resultado) && <div><dt>Resultado</dt><dd>{votacao.resultado}</dd></div>}{temTexto(votacao.decisaoFinal) && <div><dt>Decisão final</dt><dd>{votacao.decisaoFinal}</dd></div>}</dl>{temTexto(votacao.observacaoPublica) && <p>{votacao.observacaoPublica}</p>}</article>)}</div></section>;
}

type FiltrosPresenca = { busca: string; nivel: string; turno: string; serie: string; turma: string; situacao: string };

function ListaPresencas({ presencas }: { presencas: PresencaPublica[] }) {
  const [filtros, setFiltros] = useState<FiltrosPresenca>({ busca: "", nivel: "", turno: "", serie: "", turma: "", situacao: "" });
  const resultados = useMemo(() => presencas.filter((presenca) => {
    const busca = normalizarBusca(filtros.busca);
    if (busca && !normalizarBusca(`${presenca.nome} ${presenca.turma} ${presenca.serie}`).includes(busca)) return false;
    if (filtros.nivel && presenca.nivelEnsino !== filtros.nivel) return false;
    if (filtros.turno && presenca.turno !== filtros.turno) return false;
    if (filtros.serie && normalizarBusca(presenca.serie) !== normalizarBusca(filtros.serie)) return false;
    if (filtros.turma && normalizarBusca(presenca.turma) !== normalizarBusca(filtros.turma)) return false;
    return !filtros.situacao || presenca.situacao === filtros.situacao;
  }), [filtros, presencas]);
  function alterar(campo: keyof FiltrosPresenca, valor: string) { setFiltros((atuais) => ({ ...atuais, [campo]: valor })); }
  return <section aria-labelledby="titulo-presencas"><div className="cabecalho-conteudo-guia"><div><h2 id="titulo-presencas">Lista histórica de presença</h2><p>Os nomes e as turmas representam o registro preservado na data desta reunião.</p></div></div>
    <form className="filtros-eventos filtros-presencas" onSubmit={(evento) => evento.preventDefault()} aria-label="Filtros da lista de presença">
      <label className="filtro-busca-largo"><span>Buscar nome ou turma</span><input type="search" value={filtros.busca} onChange={(evento) => alterar("busca", evento.target.value)} /></label>
      <label><span>Nível</span><select value={filtros.nivel} onChange={(evento) => alterar("nivel", evento.target.value)}><option value="">Todos</option><option value="fundamental">Ensino Fundamental</option><option value="medio">Ensino Médio</option><option value="outro">Outro</option></select></label>
      <label><span>Turno</span><select value={filtros.turno} onChange={(evento) => alterar("turno", evento.target.value)}><option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label>
      <label><span>Ano ou série</span><input value={filtros.serie} onChange={(evento) => alterar("serie", evento.target.value)} /></label>
      <label><span>Turma</span><input value={filtros.turma} onChange={(evento) => alterar("turma", evento.target.value)} /></label>
      <label><span>Presença</span><select value={filtros.situacao} onChange={(evento) => alterar("situacao", evento.target.value)}><option value="">Todas</option><option value="presente">Presente</option><option value="ausente">Ausente</option><option value="justificada">Ausência justificada</option></select></label>
    </form>
    <p className="resultado-filtros" aria-live="polite">{resultados.length} {resultados.length === 1 ? "registro encontrado" : "registros encontrados"}</p>
    {!resultados.length ? <EstadoVazio titulo="Nenhuma presença encontrada" texto={presencas.length ? "Nenhum registro corresponde aos filtros escolhidos." : "A lista de presença ainda não foi publicada."} /> : <div className="tabela-responsiva"><table className="tabela-eventos tabela-presencas"><caption>Presenças publicadas nesta reunião</caption><thead><tr><th scope="col">Nome</th><th scope="col">Turma</th><th scope="col">Ano ou série</th><th scope="col">Nível</th><th scope="col">Turno</th><th scope="col">Função</th><th scope="col">Presença</th></tr></thead><tbody>{resultados.map((presenca) => <tr key={presenca.id}><th scope="row">{presenca.nome}</th><td>{presenca.turma || "—"}</td><td>{presenca.serie || "—"}</td><td>{rotuloNivel(presenca.nivelEnsino) || "—"}</td><td>{rotuloTurno(presenca.turno) || "—"}</td><td>{rotuloFuncao(presenca.funcao) || "—"}</td><td><span className={`selo-situacao situacao-${classeSituacao(presenca.situacao)}`}>{rotuloPresenca(presenca.situacao)}</span></td></tr>)}</tbody></table></div>}
  </section>;
}

export function DetalheReuniaoPublica({ slug, guiaInicial }: { slug: string; guiaInicial?: string }) {
  const { dados, carregando, erro, recarregar } = useConsultaPublica<DetalheReuniao>(`/api/reunioes/${encodeURIComponent(slug)}`);
  if (carregando) return <main id="conteudo"><CabecalhoPagina titulo="Reunião" resumo="Carregando a publicação…" caminho="Eventos / Reuniões e atas" /><div className="limite pagina-conteudo"><EstadoCarregando /></div></main>;
  if (erro || !dados?.item) return <main id="conteudo"><CabecalhoPagina titulo="Reunião" resumo="Não foi possível abrir esta publicação." caminho="Eventos / Reuniões e atas" /><div className="limite pagina-conteudo"><EstadoErro mensagem={erro || "Reunião não encontrada."} tentarNovamente={recarregar} /><VoltarPara href="/eventos/reunioes">Voltar para reuniões e atas</VoltarPara></div></main>;
  const reuniao = dados.item;
  const guias = ["resumo", "presencas", "ata-documentos"];
  const guia = guias.includes(guiaInicial || "") ? guiaInicial : "resumo";
  const haAtaOuDocumento = temTexto(reuniao.ata) || temTexto(reuniao.transcricao) || dados.documentos.length > 0;
  return (
    <main id="conteudo">
      <CabecalhoPagina titulo={reuniao.titulo} resumo={reuniao.descricaoCurta || `${rotuloTipo(reuniao.tipo)} · ${formatarData(reuniao.data)}`} caminho="Eventos / Reuniões e atas" />
      <article className="limite pagina-conteudo detalhe-publicacao">
        <VoltarPara href="/eventos/reunioes">Voltar para reuniões e atas</VoltarPara>
        <div className="destaques-campeonato"><span className={`selo-situacao situacao-${classeSituacao(reuniao.situacao)}`}>{rotuloSituacao(reuniao.situacao)}</span><span><small>Tipo</small><strong>{rotuloTipo(reuniao.tipo)}</strong></span></div>
        <nav className="guias-evento" aria-label="Seções da reunião"><Link href={`/eventos/reunioes/${encodeURIComponent(slug)}?guia=resumo`} aria-current={guia === "resumo" ? "page" : undefined}>Resumo</Link><Link href={`/eventos/reunioes/${encodeURIComponent(slug)}?guia=presencas`} aria-current={guia === "presencas" ? "page" : undefined}>Presenças</Link><Link href={`/eventos/reunioes/${encodeURIComponent(slug)}?guia=ata-documentos`} aria-current={guia === "ata-documentos" ? "page" : undefined}>Ata e documentos</Link></nav>
        {guia === "resumo" && <div className="conteudo-guia"><ListaDefinicoes itens={[{ rotulo: "Tipo", valor: rotuloTipo(reuniao.tipo) }, { rotulo: "Data", valor: formatarData(reuniao.data) }, { rotulo: "Horário", valor: reuniao.horario }, { rotulo: "Local", valor: reuniao.local }, { rotulo: "Turno", valor: rotuloTurno(reuniao.turno) }, { rotulo: "Níveis de ensino", valor: reuniao.niveisEnsino.map(rotuloNivel).join(", ") }, { rotulo: "Responsáveis", valor: reuniao.responsaveis }, { rotulo: "Quantidade de participantes", valor: reuniao.quantidadeParticipantes }]} /><BlocoTexto titulo="Pauta" conteudo={reuniao.pauta} /><BlocoTexto titulo="Assuntos discutidos" conteudo={reuniao.discussoes} /><BlocoTexto titulo="Resumo" conteudo={reuniao.resumo} /><BlocoTexto titulo="Decisões tomadas" conteudo={reuniao.decisoes} /><BlocoTexto titulo="Propostas apresentadas" conteudo={reuniao.propostas} /><BlocoTexto titulo="Encaminhamentos" conteudo={reuniao.encaminhamentos} /><ItensReuniao itens={dados.itens} /><Votacoes votacoes={dados.votacoes} /><BlocoTexto titulo="Observações" conteudo={reuniao.observacoesPublicas} /></div>}
        {guia === "presencas" && <div className="conteudo-guia"><ListaPresencas presencas={dados.presencas as PresencaPublica[]} /></div>}
        {guia === "ata-documentos" && <div className="conteudo-guia">{haAtaOuDocumento ? <><BlocoTexto titulo="Ata" conteudo={reuniao.ata} /><BlocoTexto titulo="Transcrição" conteudo={reuniao.transcricao} /><ListaDocumentos documentos={dados.documentos} titulo="Documentos e anexos" /></> : <EstadoVazio titulo="Ata e documentos ainda não publicados" texto="Esta reunião não possui ata, transcrição ou documento público no momento." />}</div>}
        {temTexto(reuniao.atualizadoEm) && <p className="ultima-atualizacao">Última atualização: <time dateTime={reuniao.atualizadoEm}>{formatarDataHora(reuniao.atualizadoEm)}</time></p>}
      </article>
    </main>
  );
}
