"use client";

// consulta registros internos sem oferecer ações que alteram o banco
import { FormEvent, useEffect, useRef, useState } from "react";
import { ListaBiblioteca } from "./BibliotecaArquivos";
import { configuracaoPainel } from "../conteudo/campos-painel";
import type { TipoConteudo } from "../conteudo/tipos";
import type { RecursoPainel } from "../lib/cargos";
import { anoDoRegistro } from "../conteudo/ciclos";
import { anoDoPortal } from "../conteudo/periodos";
import "./painel-consulta.css";

type Registro = Record<string, unknown>;
type Filtros = { busca: string; estado: string; ano: string };
const tiposConteudo = ["noticias", "projetos", "membros", "movimentos", "documentos", "canais", "calendario", "cantina", "estagios"];
const porPagina = 20;
const recursosAnuais = ["noticias", "projetos", "membros", "calendario", "cantina", "estagios", "turmas", "representantes", "eventos", "interclasses", "reunioes"];

// organiza a leitura dos mesmos cadastros usados pelos editores
export default function PainelConsulta({ recurso, publicos = false }: { recurso: RecursoPainel; publicos?: boolean }) {
  const [itens, setItens] = useState<Registro[]>([]);
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [detalhe, setDetalhe] = useState<Registro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({ busca: "", estado: recurso === "noticias" && !publicos || recurso === "mensagens" ? "ativas" : "todos", ano: String(anoDoPortal()) });
  const [consulta, setConsulta] = useState(filtros);
  const [tentativa, setTentativa] = useState(0);
  const painelDetalhe = useRef<HTMLDivElement>(null);
  const noticiaPrivada = recurso === "noticias" && !publicos;
  const temAno = recursosAnuais.includes(recurso);
  const listaLocal = (tiposConteudo.includes(recurso) && !noticiaPrivada) || ["mapa", "turmas", "oficiais"].includes(recurso);

  // cada consulta privada usa a autorização do servidor e preserva a paginação
  useEffect(() => {
    if (recurso === "arquivos") return;
    const controle = new AbortController();
    const inicio = setTimeout(() => { setCarregando(true); setErro(""); setDetalhe(null); }, 0);
    async function carregar() {
      const parametros = new URLSearchParams();
      if (!publicos) parametros.set("todos", "1");
      if (!listaLocal) { parametros.set("pagina", String(pagina)); parametros.set("limite", String(porPagina)); }
      if (consulta.busca && !listaLocal) parametros.set("busca", consulta.busca);
      if (temAno) parametros.set("ano", consulta.ano);
      if (noticiaPrivada) { parametros.set("visao", consulta.estado); parametros.set("ano", consulta.ano); }
      else if (recurso === "mensagens") parametros.set("arquivadas", consulta.estado === "arquivadas" ? "1" : "0");
      else if (consulta.estado === "arquivadas" && !listaLocal) parametros.set(recurso === "representantes" ? "arquivado" : "situacao", recurso === "representantes" ? "1" : "arquivado");
      let caminho: string;
      if (recurso === "mapa" || recurso === "turmas") { parametros.set("secao", recurso === "turmas" ? "turmas" : "locais"); caminho = "/api/mapa"; }
      else if (recurso === "oficiais") caminho = "/api/documentos-oficiais";
      else if (tiposConteudo.includes(recurso)) { parametros.set("tipo", ({ calendario: "agenda", cantina: "cardapios", estagios: "oportunidades" } as Record<string, string>)[recurso] || recurso); caminho = "/api/conteudo"; }
      else caminho = `/api/${recurso}`;
      const resposta = await fetch(`${caminho}?${parametros}`, { cache: "no-store", signal: controle.signal });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar os registros.");
      const recebidos: Registro[] = recurso === "mensagens" ? dados.mensagens || [] : recurso === "mapa" ? dados.locais || [] : recurso === "turmas" ? dados.turmas || [] : dados.itens || [];
      if (recurso === "turmas") for (const turma of recebidos) turma.salas = (dados.ensalamentos || []).filter((vinculo: Registro) => vinculo.turmaAtividadeId === turma.id && vinculo.ativo).map((vinculo: Registro) => {
        const sala = (dados.locais || []).find((local: Registro) => local.id === vinculo.localId);
        return sala ? { nome: sala.nome, turno: vinculo.turno, publicado: vinculo.publicado } : { nome: "Sem sala definida", turno: vinculo.turno };
      });
      if (controle.signal.aborted) return;
      setItens(recebidos.map((item) => temAno ? { ...item, arquivadoAno: anoDoRegistro(dadosRegistro(item), String(item.criadoEm || "")) !== anoDoPortal() } : item));
      setTotal(Number(dados.total ?? dados.paginacao?.total ?? recebidos.length));
      setTotalPaginas(Math.max(1, Number(dados.totalPaginas ?? dados.paginacao?.totalPaginas ?? (noticiaPrivada ? Math.ceil(Number(dados.total || 0) / porPagina) : 1))));
    }
    void carregar().catch((falha) => { if (!controle.signal.aborted) setErro(falha instanceof Error ? falha.message : "Não foi possível consultar os registros."); }).finally(() => { if (!controle.signal.aborted) { clearTimeout(inicio); setCarregando(false); } });
    return () => { clearTimeout(inicio); controle.abort(); };
  }, [recurso, publicos, pagina, consulta, listaLocal, noticiaPrivada, temAno, tentativa]);

  // aproxima o detalhe depois de abrir sem acionar nenhuma alteração
  useEffect(() => { if (detalhe) painelDetalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [detalhe]);
  async function abrir(item: Registro) {
    setErro(""); setAbrindo(true);
    try {
      if (["eventos", "interclasses", "reunioes", "representantes"].includes(recurso)) {
        const resposta = await fetch(`/api/${recurso}/${encodeURIComponent(String(item.id))}${publicos ? "" : "?todos=1"}`, { cache: "no-store" });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível abrir os detalhes.");
        // reuniões e campeonatos também possuem listas de documentos e registros relacionados
        setDetalhe(["reunioes", "interclasses"].includes(recurso) ? { ...objeto(dados.item), ...Object.fromEntries(Object.entries(dados).filter(([chave]) => chave !== "item")) } : objeto(dados.item));
      } else setDetalhe(dadosRegistro(item));
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível abrir os detalhes."); }
    finally { setAbrindo(false); }
  }
  function buscar(evento: FormEvent<HTMLFormElement>) { evento.preventDefault(); setConsulta({ ...filtros }); setPagina(1); setDetalhe(null); }
  const filtrados = listaLocal ? itens.filter((item) => {
    const registro = dadosRegistro(item);
    return (!temAno || anoDoRegistro(registro, String(item.criadoEm || "")) === Number(consulta.ano)) && (!consulta.busca || normalizar(JSON.stringify(registro)).includes(normalizar(consulta.busca))) && (consulta.estado === "todos" || estadoRegistro(item) === consulta.estado);
  }) : itens;
  const paginas = listaLocal ? Math.max(1, Math.ceil(filtrados.length / porPagina)) : totalPaginas;
  const paginaAtual = Math.min(pagina, paginas);
  const visiveis = listaLocal ? filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina) : filtrados;
  const titulo = ({ eventos: "Eventos internos", interclasses: "Interclasses e campeonatos", reunioes: "Reuniões, atas e presenças", representantes: "Representantes", arquivos: "Biblioteca de arquivos", mapa: "Mapa e ensalamento", turmas: "Turmas", oficiais: "Estatuto e regimento", mensagens: "Mensagens recebidas" } as Record<string, string>)[recurso] || configuracaoPainel[(( { calendario: "agenda", cantina: "cardapios", estagios: "oportunidades" } as Record<string, string>)[recurso] || recurso) as TipoConteudo]?.nome || "Consulta";
  return <section className="consulta-painel">
    <header className="topo-painel"><div><span className="rotulo-secao">SOMENTE CONSULTA</span><h1>{titulo}</h1><p>{publicos ? "Consulte as publicações disponíveis para seu cargo." : "Consulte publicações, rascunhos e registros arquivados disponíveis para seu cargo."} Este acesso não permite alterações.</p></div></header>
    {erro && <p className="erro-painel" role="alert">{erro} <button className="pev-botao" type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></p>}
    {recurso === "arquivos" ? <ListaBiblioteca /> : <>
      {/* a busca e os filtros também estão disponíveis para quem apenas consulta */}
      <form className="consulta-filtros" onSubmit={buscar}><label>{recurso === "mensagens" ? "Buscar protocolo" : "Buscar registro"}<input type="search" value={filtros.busca} maxLength={120} onChange={(evento) => setFiltros({ ...filtros, busca: evento.target.value })} placeholder={recurso === "mensagens" ? "Ex.: GECEP-2026-00001" : "Nome ou título"} /></label>{!publicos && recurso !== "oficiais" && <label>Exibir<select value={filtros.estado} onChange={(evento) => setFiltros({ ...filtros, estado: evento.target.value })}>{noticiaPrivada || recurso === "mensagens" ? <option value="ativas">Ativas</option> : <option value="todos">Todos os registros</option>}{noticiaPrivada && <option value="rascunhos">Rascunhos</option>}{listaLocal && <><option value="publicadas">Publicados</option><option value="rascunhos">Rascunhos ou fora do público</option></>}<option value="arquivadas">Arquivados</option></select></label>}{temAno && <label>Ano<input type="number" min={1900} max={2199} required value={filtros.ano} onChange={(evento) => setFiltros({ ...filtros, ano: evento.target.value })} /></label>}<button className="pev-botao pev-botao--primario" type="submit">Buscar</button></form>
      {carregando ? <p role="status">Carregando registros…</p> : !erro && <p className="ajuda-busca">{listaLocal ? filtrados.length : total} registros encontrados</p>}
      <div className="consulta-lista" aria-busy={carregando}>{!carregando && visiveis.map((item, indice) => <article key={String(item.id ?? item.chave ?? indice)}><div><span className={estadoRegistro(item) === "publicadas" ? "estado-publicado" : "estado-rascunho"}>{rotuloEstado(item)}</span><h2>{String(item.titulo || item.nome || item.protocolo || "Registro")}</h2><p>{resumoRegistro(item)}</p></div><button className="pev-botao" type="button" disabled={abrindo} onClick={() => void abrir(item)}>Consultar detalhes</button></article>)}</div>
      {!carregando && !erro && !visiveis.length && <p>Nenhum registro encontrado. Ajuste a busca ou os filtros.</p>}
      {!carregando && paginas > 1 && <nav className="consulta-paginacao" aria-label="Páginas dos registros"><button className="pev-botao" type="button" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button><span>Página {paginaAtual} de {paginas}</span><button className="pev-botao" type="button" disabled={paginaAtual >= paginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button></nav>}
      {detalhe && <div ref={painelDetalhe} className="detalhes-consulta" role="region" aria-label="Detalhes do registro"><h2>{String(detalhe.titulo || detalhe.nome || "Detalhes do registro")}</h2><CamposConsulta dados={detalhe} /><button type="button" className="pev-botao" onClick={() => setDetalhe(null)}>Fechar detalhes</button></div>}
    </>}
  </section>;
}

// apresenta estados legíveis sem depender de uma única estrutura de cadastro
function objeto(valor: unknown): Registro { return valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Registro : {}; }
function dadosRegistro(item: Registro) { return { ...objeto(item.dados), ...Object.fromEntries(Object.entries(item).filter(([chave]) => chave !== "dados")) }; }
function normalizar(valor: string) { return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"); }
function estadoRegistro(item: Registro) {
  const registro = dadosRegistro(item);
  if (registro.arquivadoAno || registro.arquivado || registro.arquivada || registro.arquivadoEm || registro.ativo === false || registro.status === "arquivada" || registro.publicado === false && registro.jaPublicada) return "arquivadas";
  return registro.publicado === false ? "rascunhos" : "publicadas";
}
function rotuloEstado(item: Registro) { return ({ arquivadas: "Arquivado", rascunhos: "Rascunho · fora do público", publicadas: item.status ? nomeValor(item.status) : "Publicado" })[estadoRegistro(item)]; }
function resumoRegistro(item: Registro) { const dados = dadosRegistro(item); return [dados.protocolo, dados.turma, dados.turno ? nomeValor(dados.turno) : "", dados.data || dados.dataInicial || dados.atualizadoEm || dados.criadoEm].filter(Boolean).map(String).join(" · "); }
const nomesCampos: Record<string, string> = { imagemUrl: "Imagem", imagemCapaUrl: "Imagem de capa", arquivoUrl: "Documento", link: "Endereço", inicioValidade: "Válida a partir de", fimValidade: "Válida até", observacoesInternas: "Observações internas", nivelEnsino: "Nível de ensino", nomeSnapshot: "Nome registrado", turmaSnapshot: "Turma registrada", funcaoSnapshot: "Função registrada", placarA: "Placar da primeira equipe", placarB: "Placar da segunda equipe", participanteANome: "Primeira equipe", participanteBNome: "Segunda equipe", jaPublicada: "Já foi publicada", publico: "Disponível ao público", tipoContato: "Forma de contato" };
const nomesValores: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite", medio: "Ensino Médio", fundamental: "Ensino Fundamental", outro: "Outro", aula_regular: "Aula regular", curso_tecnico: "Curso técnico", nova: "Nova", em_analise: "Em análise", respondida: "Respondida", arquivada: "Arquivada", proximo: "Próximo", em_andamento: "Em andamento", encerrado: "Encerrado", agendada: "Agendada", cancelado: "Cancelado", adiado: "Adiado", nao_informada: "Não informada" };
// apresenta as vagas da equipe sem mostrar os códigos usados no cadastro
const nomesVagas: Record<string, string> = { "diretor-1": "Diretor 1", "diretor-2": "Diretor 2", "tecnico-1": "Responsável técnico 1", "tecnico-2": "Responsável técnico 2", "tecnico-3": "Responsável técnico 3", efetivo: "Efetivo", suplente: "Suplente", titular: "Titular", apoio: "Apoio voluntário" };
function nomeValor(valor: unknown) { const texto = String(valor); return nomesValores[texto] || nomesVagas[texto] || texto; }
function nomeCampo(chave: string) { return ({ membrosGecepPresentes: "Membros do GECEP presentes", vaga: "Vaga no cargo", vagaNome: "Vaga no cargo" } as Record<string, string>)[chave] || nomesCampos[chave] || chave.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (letra) => letra.toUpperCase()); }
function campoVisivel(chave: string, valor: unknown) { return !["cargoChave", "confirmado"].includes(chave) && valor !== "" && valor !== null && valor !== undefined && !(Array.isArray(valor) && !valor.length) && !/normalizad|(^id$|Id$)|slug|chaveImportacao|arquivoChave|ordem|exemplo/i.test(chave); }

// mostra textos e anexos sem transformar o detalhe em um formulário editável
function CamposConsulta({ dados }: { dados: Registro }) {
  return <dl>{Object.entries(dados).filter(([chave, valor]) => campoVisivel(chave, valor) && !(chave === "vaga" && dados.vagaNome)).map(([chave, valor]) => <div key={chave}><dt>{nomeCampo(chave)}</dt><dd>{Array.isArray(valor) ? valor.map((item, indice) => <div className="consulta-subregistro" key={indice}>{typeof item === "object" && item ? <CamposConsulta dados={objeto(item)} /> : nomeValor(item)}</div>) : typeof valor === "object" && valor ? <CamposConsulta dados={objeto(valor)} /> : typeof valor === "boolean" ? valor ? "Sim" : "Não" : typeof valor === "string" && /^(\/(?!\/)|https?:\/\/)/.test(valor) ? <a href={valor} target="_blank" rel="noreferrer">Abrir arquivo ou endereço ↗</a> : nomeValor(valor)}</dd></div>)}</dl>;
}
