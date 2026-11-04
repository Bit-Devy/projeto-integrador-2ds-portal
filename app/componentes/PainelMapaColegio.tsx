// ativa os recursos do navegador
"use client";

// mantém neste painel apenas o cadastro dos espaços físicos do colégio
import { FormEvent, useCallback, useEffect, useState } from "react";
import CheckboxComAjuda, { descricaoCheckbox } from "./CheckboxComAjuda";
import { alasMapa, type CategoriaMapa, type DadosMapa, type LocalMapa } from "../mapa/tipos";
import { confirmarSaida, useAvisoMudancas, type AoMudarEstadoSujo } from "./painel-eventos-comum";
import { confirmarNoPainel } from "./confirmacao-painel";
type ValorFormulario = string | number | boolean | null;
type FormularioMapa = Record<string, ValorFormulario>;
const dadosVazios: DadosMapa = { categorias: [], locais: [], turmas: [], ensalamentos: [] };
const alas = alasMapa.map((ala) => ({ valor: ala, nome: ala }));
// reúne as salas e os campos de localização usados no portal
export default function PainelMapaColegio({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  const [dados, setDados] = useState<DadosMapa>(dadosVazios);
  const [formulario, setFormulario] = useState<FormularioMapa | null>(null);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mudou, setMudou] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  useAvisoMudancas(mudou, aoMudarEstadoSujo);
  // consulta também as salas que ainda não estão públicas
  const carregar = useCallback(async () => {
    try { setDados(await buscarDadosMapa()); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as salas."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { const inicio = setTimeout(() => { void carregar(); }, 0); return () => clearTimeout(inicio); }, [carregar]);
  const categoriasLocal = dados.categorias.filter((categoria) => categoria.grupo === "local").sort(compararOrdemNome);
  const registros = dados.locais.filter((local) => (!busca || normalizar(`${local.nome} ${local.numero} ${local.nomeAlternativo} ${local.ala}`).includes(normalizar(busca))) && (!filtroTipo || local.tipo === filtroTipo) && (!filtroEstado || (filtroEstado === "publicado" ? local.publicado && local.ativo : !local.publicado || !local.ativo))).sort(compararOrdemNome);
  // prepara os campos para cadastrar uma nova sala
  function novoRegistro() {
    setFormulario({ nome: "", numero: "", nomeAlternativo: "", tipo: categoriasLocal.find((item) => item.slug === "sala_aula")?.slug || categoriasLocal[0]?.slug || "outro", ala: "", andar: "", bloco: "", setor: "", corredor: "", referencia: "", descricao: "", instrucoes: "", observacoes: "", acessibilidade: "", horario: "", imagemUrl: "", ordem: 0, ativo: true, publicado: true });
    setIdEditando(null); setMudou(false); setErro(""); setSucesso("");
  }
  // acompanha as mudanças para avisar antes de fechar sem salvar
  function editarRegistro(local: LocalMapa) { setFormulario({ ...local }); setIdEditando(local.id); setMudou(false); setErro(""); setSucesso(""); }
  function mudar(chave: string, valor: ValorFormulario) { setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual); setMudou(true); setSucesso(""); }
  async function fecharFormulario() { if (salvando || !await confirmarSaida(mudou)) return; setFormulario(null); setMudou(false); }
  // salva apenas os dados físicos da sala neste painel
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!formulario || salvando) return;
    setSalvando(true); setErro(""); setSucesso("");
    try {
      const resposta = await fetch("/api/mapa", { method: idEditando ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entidade: "locais", id: idEditando, dados: formulario }) });
      const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar a sala.");
      setFormulario(null); setMudou(false); setSucesso("Sala salva. Ela já pode ser escolhida no cadastro de turmas quando estiver ativa e publicada."); await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a sala."); }
    finally { setSalvando(false); }
  }
  // confirma a exclusão e impede remover uma sala ainda vinculada
  async function excluir(local: LocalMapa) {
    if (!await confirmarNoPainel("Excluir sala?", `Excluir “${local.nome}”? Salas com vínculos de turmas precisam ser desvinculadas antes.`, "Excluir sala", "Cancelar")) return;
    setErro(""); setSalvando(true);
    try {
      const resposta = await fetch(`/api/mapa?entidade=locais&id=${local.id}`, { method: "DELETE" }); const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível excluir a sala.");
      setSucesso("Sala excluída."); await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível excluir a sala."); }
    finally { setSalvando(false); }
  }
  // envia a imagem antes de associar seu endereço ao cadastro
  async function enviarImagem(arquivo?: File) {
    if (!arquivo) return; setSalvando(true); setErro("");
    try {
      const corpo = new FormData(); corpo.append("arquivo", arquivo);
      const resposta = await fetch("/api/arquivos", { method: "POST", body: corpo }); const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível enviar a imagem."); mudar("imagemUrl", resultado.url);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a imagem."); }
    finally { setSalvando(false); }
  }
  return <section className="painel-mapa">
    <header className="topo-painel"><div><span className="rotulo-secao">GUIA DO COLÉGIO</span><h1>Mapa e ensalamento</h1><p>Cadastre e publique salas e locais do colégio. Para criar turmas e definir a ocupação por turno, use o menu Turmas.</p></div>{!formulario && <button type="button" disabled={carregando || salvando} onClick={novoRegistro}>+ Cadastrar sala</button>}</header>
    {erro && <p className="erro-painel" role="alert">{erro}</p>}{sucesso && <p className="sucesso-painel" role="status">{sucesso}</p>}
    {formulario ? <form className="formulario-painel formulario-mapa-painel" onSubmit={salvar}>
      <div className="titulo-formulario-painel"><h2>{idEditando ? "Atualizar sala" : "Cadastrar sala"}</h2><button type="button" onClick={fecharFormulario}>Fechar</button></div>
      <div className="grade-campos-painel"><CamposLocal formulario={formulario} mudar={mudar} categorias={categoriasLocal} enviarImagem={enviarImagem} /></div>
      <div className="acoes-formulario-painel"><button type="button" onClick={fecharFormulario}>Cancelar</button><button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar sala"}</button></div>
    </form> : <>
      <div className="ferramentas-salas"><label>Buscar sala ou local<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Número, nome ou ala" /></label><label>Tipo do local<select value={filtroTipo} onChange={(evento) => setFiltroTipo(evento.target.value)}><option value="">Todos</option>{categoriasLocal.map((item) => <option key={item.id} value={item.slug}>{item.nome}</option>)}</select></label><label>Publicação<select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)}><option value="">Todas</option><option value="publicado">Publicadas</option><option value="oculto">Fora do público</option></select></label></div>
      {carregando && <p role="status">Carregando salas...</p>}
      <div className="lista-painel lista-mapa-painel" aria-busy={carregando}>{registros.map((local) => <CartaoLocal local={local} dados={dados} editar={() => editarRegistro(local)} excluir={() => void excluir(local)} key={local.id} />)}</div>
      {!carregando && !registros.length && <p>Nenhuma sala encontrada.</p>}
    </>}
  </section>;
}

// mostra os campos de um local
function CamposLocal({ formulario, mudar, categorias, enviarImagem }: { formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void; categorias: CategoriaMapa[]; enviarImagem: (arquivo?: File) => void }) {
  return <>
    {/* identificação e tipo do local */}
    <Campo chave="nome" rotulo="Nome" formulario={formulario} mudar={mudar} obrigatorio />
    <Campo chave="numero" rotulo="Número da sala" formulario={formulario} mudar={mudar} />
    <Campo chave="nomeAlternativo" rotulo="Nome alternativo ou apelido" formulario={formulario} mudar={mudar} />
    <CampoSelecao chave="tipo" rotulo="Tipo do local" formulario={formulario} mudar={mudar} opcoes={categorias.map((item) => ({ valor: item.slug, nome: item.nome }))} obrigatorio />
    {/* localização do espaço */}
    <CampoSelecao chave="ala" rotulo="Ala" formulario={formulario} mudar={mudar} opcoes={alas} obrigatorio={Boolean(formulario.publicado)} />
    <Campo chave="andar" rotulo="Andar" formulario={formulario} mudar={mudar} />
    <Campo chave="bloco" rotulo="Bloco" formulario={formulario} mudar={mudar} />
    <Campo chave="setor" rotulo="Setor" formulario={formulario} mudar={mudar} />
    <Campo chave="corredor" rotulo="Corredor" formulario={formulario} mudar={mudar} />
    {/* descrições do local */}
    <Campo chave="referencia" rotulo="Ponto de referência" formulario={formulario} mudar={mudar} largo />
    <Campo chave="descricao" rotulo="Descrição" formulario={formulario} mudar={mudar} largo textarea />
    <Campo chave="instrucoes" rotulo="Instruções de como chegar" formulario={formulario} mudar={mudar} largo textarea />
    <Campo chave="observacoes" rotulo="Observações deste local" formulario={formulario} mudar={mudar} largo textarea />
    <Campo chave="acessibilidade" rotulo="Informações de acessibilidade" formulario={formulario} mudar={mudar} largo textarea />
    <Campo chave="horario" rotulo="Horário ou funcionamento" formulario={formulario} mudar={mudar} largo />
    {/* imagem do local */}
    <Campo chave="imagemUrl" rotulo="Imagem ou mapa relacionado" formulario={formulario} mudar={mudar} tipo="url" largo />
    <label className="campo-largo campo-envio-mapa"><span>Enviar imagem</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(evento) => enviarImagem(evento.target.files?.[0])} /><small>A imagem só será associada depois que o registro for salvo.</small></label>
    {/* ordem e publicação */}
    <Campo chave="ordem" rotulo="Ordem de exibição" formulario={formulario} mudar={mudar} tipo="number" />
    <CampoBooleano chave="ativo" rotulo="Local ativo" formulario={formulario} mudar={mudar} />
    <CampoBooleano chave="publicado" rotulo="Publicar no portal" formulario={formulario} mudar={mudar} />
  </>;
}

// mostra um campo de texto ou número
function Campo({ chave, rotulo, formulario, mudar, tipo = "text", obrigatorio = false, largo = false, textarea = false, dica }: { chave: string; rotulo: string; formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void; tipo?: string; obrigatorio?: boolean; largo?: boolean; textarea?: boolean; dica?: string }) {
  // escolhe o tamanho e o valor do campo
  const classe = largo ? "campo-largo" : undefined;
  const valor = formulario[chave] ?? "";
  return <label className={classe}><span>{rotulo}</span>{textarea
    ? <textarea rows={4} value={String(valor)} onChange={(evento) => mudar(chave, evento.target.value)} required={obrigatorio} />
    : <input type={tipo} value={String(valor)} step={tipo === "number" ? "1" : undefined} onChange={(evento) => mudar(chave, tipo === "number" ? Number(evento.target.value) : evento.target.value)} required={obrigatorio} />}{dica && <small>{dica}</small>}</label>;
}

// mostra um campo com opções
function CampoSelecao({ chave, rotulo, formulario, mudar, opcoes, obrigatorio = false }: { chave: string; rotulo: string; formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void; opcoes: Array<{ valor: string; nome: string }>; obrigatorio?: boolean }) {
  return <label><span>{rotulo}</span><select value={String(formulario[chave] ?? "")} onChange={(evento) => mudar(chave, evento.target.value)} required={obrigatorio}><option value="">Selecione</option>{opcoes.map((opcao) => <option value={opcao.valor} key={opcao.valor}>{opcao.nome}</option>)}</select></label>;
}

// mostra um campo de verdadeiro ou falso
function CampoBooleano({ chave, rotulo, formulario, mudar }: { chave: string; rotulo: string; formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void }) {
  return <label className="campo-publicado"><CheckboxComAjuda checked={Boolean(formulario[chave])} onChange={(evento) => mudar(chave, evento.target.checked)} explicacao={descricaoCheckbox(chave)} aria-label={rotulo} /><span>{rotulo}</span></label>;
}

// mostra o resumo de um local
function CartaoLocal({ local, dados, editar, excluir }: { local: LocalMapa; dados: DadosMapa; editar: () => void; excluir: () => void }) {
  // encontra os usos ativos do local
  const usos = dados.ensalamentos.filter((item) => item.localId === local.id && item.ativo);
  // verifica se faltam dados principais
  const incompleto = !local.andar || !local.ala || !local.descricao || !local.instrucoes;
  return <article><Estado publicado={local.publicado} ativo={local.ativo} /><div><h2>{local.numero ? `Sala ${local.numero} · ` : ""}{local.nome}</h2><p>{[local.ala, local.andar, nomeCategoria(local.tipo, dados.categorias)].filter(Boolean).join(" · ") || "Localização não informada"}</p><div className="avisos-registro-mapa">{incompleto && <span>Informações incompletas</span>}{!usos.length && <span>Sem usos cadastrados</span>}</div><small>Atualizado em {formatarData(local.atualizadoEm)}</small></div><Acoes editar={editar} excluir={excluir} /></article>;
}

// mostra o estado de publicação
function Estado({ publicado, ativo }: { publicado: boolean; ativo: boolean }) {
  return <span className={publicado && ativo ? "estado-publicado" : "estado-rascunho"}>{!ativo ? "Inativo" : publicado ? "Publicado" : "Rascunho"}</span>;
}

// mostra os botões de edição e exclusão
function Acoes({ editar, excluir }: { editar: () => void; excluir: () => void }) {
  return <div className="acoes-item-painel"><button type="button" onClick={editar}>Editar</button><button type="button" onClick={excluir}>Excluir</button></div>;
}

// encontra o nome de uma categoria
function nomeCategoria(slug: string, categorias: CategoriaMapa[]) {
  return categorias.find((item) => item.slug === slug)?.nome ?? slug ?? "Tipo não informado";
}

// simplifica um texto para comparação
function normalizar(valor?: string) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[º°ª]/g, "").replace(/[^a-z0-9]+/g, "");
}

// ordena pela posição e pelo nome
function compararOrdemNome<T extends { ordem: number; nome: string }>(a: T, b: T) {
  return a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });
}

// transforma a data para leitura
function formatarData(data?: string) {
  if (!data) return "agora";
  // trata datas do banco como horário universal
  const momento = new Date(data.replace(" ", "T") + (data.includes("Z") ? "" : "Z"));
  return Number.isNaN(momento.getTime()) ? data : momento.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// busca todos os dados administrativos do mapa
async function buscarDadosMapa(): Promise<DadosMapa> {
  // consulta também os rascunhos
  const resposta = await fetch("/api/mapa?todos=1", { cache: "no-store" });
  // lê os grupos retornados
  const resultado = await resposta.json() as Partial<DadosMapa> & { erro?: string };
  if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível carregar o mapa e o ensalamento.");
  return {
    categorias: resultado.categorias ?? [],
    locais: resultado.locais ?? [],
    turmas: resultado.turmas ?? [],
    ensalamentos: resultado.ensalamentos ?? [],
  };
}
