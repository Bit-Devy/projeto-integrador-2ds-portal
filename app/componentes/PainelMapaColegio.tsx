// ativa recursos do navegador
"use client";

// importa eventos, efeitos e controles do react
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
// importa as alas permitidas
import { alasMapa } from "../mapa/tipos";
// importa os tipos dos dados do mapa
import type {
  CategoriaMapa,
  DadosMapa,
  EnsalamentoMapa,
  EntidadeMapa,
  LocalMapa,
  TurmaAtividadeMapa,
} from "../mapa/tipos";
import {
  confirmarSaida,
  useAvisoMudancas,
  type AoMudarEstadoSujo,
} from "./painel-eventos-comum";

// define os valores aceitos no formulário
type ValorFormulario = string | number | boolean | null;
// define os campos do formulário
type FormularioMapa = Record<string, ValorFormulario>;
// cria um nome menor para o tipo de turma
type TurmaMapa = TurmaAtividadeMapa;

// guarda a estrutura inicial dos dados
const dadosVazios: DadosMapa = { categorias: [], locais: [], turmas: [], ensalamentos: [] };
// guarda os turnos disponíveis
const turnos = [
  { valor: "manha", nome: "Manhã" },
  { valor: "tarde", nome: "Tarde" },
  { valor: "noite", nome: "Noite" },
];
// transforma as alas em opções
const alas = alasMapa.map((ala) => ({ valor: ala, nome: ala }));

// mostra o painel de mapa e ensalamento
export default function PainelMapaColegio({ aoMudarEstadoSujo }: { aoMudarEstadoSujo?: AoMudarEstadoSujo } = {}) {
  // guarda a seção atual
  const [entidade, setEntidade] = useState<EntidadeMapa>("locais");
  // guarda todos os dados do mapa
  const [dados, setDados] = useState<DadosMapa>(dadosVazios);
  // controla o carregamento e o salvamento
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  // guarda as mensagens da tela
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  // guarda o formulário e a edição
  const [formulario, setFormulario] = useState<FormularioMapa | null>(null);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [mudou, setMudou] = useState(false);
  // guarda a busca e os filtros
  const [busca, setBusca] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  // aponta para o campo de importação
  const entradaImportacao = useRef<HTMLInputElement>(null);

  useAvisoMudancas(mudou, aoMudarEstadoSujo);

  // recarrega os dados após uma alteração
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      setDados(await buscarDadosMapa());
    } catch (falha) {
      setSucesso("");
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao carregar os registros.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // carrega os dados ao abrir o painel
  useEffect(() => {
    // evita atualizar a tela depois de sair
    let ativo = true;
    buscarDadosMapa()
      .then((resultado) => { if (ativo) setDados(resultado); })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : "Erro inesperado ao carregar os registros."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  // separa os tipos de atividade
  const categoriasAtividade = useMemo(
    () => dados.categorias.filter((categoria) => categoria.grupo === "atividade").sort(compararOrdemNome),
    [dados.categorias],
  );
  // separa os tipos de local
  const categoriasLocal = useMemo(
    () => dados.categorias.filter((categoria) => categoria.grupo === "local").sort(compararOrdemNome),
    [dados.categorias],
  );

  // filtra e ordena os registros mostrados
  const registros = useMemo(() => {
    // simplifica o texto pesquisado
    const termo = normalizar(busca);
    if (entidade === "locais") {
      // filtra salas e locais
      return dados.locais.filter((local) => {
        // encontra os usos do local
        const ensalamentos = dados.ensalamentos.filter((item) => item.localId === local.id);
        return correspondeBusca(termo, local.nome, local.numero, local.nomeAlternativo)
          && correspondeEstado(local.publicado, filtroEstado)
          && ((!filtroTurno && !filtroTipo) || ensalamentos.some((item) =>
            (!filtroTurno || item.turno === filtroTurno)
            && (!filtroTipo || item.tipo === filtroTipo)));
      }).sort(compararOrdemNome);
    }
    if (entidade === "turmas") {
      // filtra turmas e atividades
      return dados.turmas.filter((turma) => correspondeBusca(termo, turma.nome, turma.aliases, turma.curso, turma.serie)
        && correspondeEstado(turma.publicado, filtroEstado)
        && (!filtroTurno || turma.turno === filtroTurno)
        && (!filtroTipo || turma.tipo === filtroTipo)).sort(compararOrdemNome);
    }
    if (entidade === "ensalamentos") {
      // filtra os ensalamentos
      return dados.ensalamentos.filter((item) => {
        const turma = dados.turmas.find((registro) => registro.id === item.turmaAtividadeId);
        const local = dados.locais.find((registro) => registro.id === item.localId);
        return correspondeBusca(termo, turma?.nome, local?.nome, local?.numero)
          && correspondeEstado(item.publicado, filtroEstado)
          && (!filtroTurno || item.turno === filtroTurno)
          && (!filtroTipo || item.tipo === filtroTipo);
      }).sort((a, b) => b.id - a.id);
    }
    // filtra os tipos cadastrados
    return dados.categorias.filter((categoria) => correspondeBusca(termo, categoria.nome, categoria.slug))
      .sort(compararOrdemNome);
  }, [busca, dados, entidade, filtroEstado, filtroTipo, filtroTurno]);

  // troca a seção e limpa a tela
  function trocarEntidade(novaEntidade: EntidadeMapa) {
    if (novaEntidade === entidade) return;
    if (!confirmarSaida(mudou)) return;
    setEntidade(novaEntidade);
    setFormulario(null);
    setIdEditando(null);
    setMudou(false);
    setBusca("");
    setFiltroTurno("");
    setFiltroTipo("");
    setFiltroEstado("");
    setErro("");
    setSucesso("");
  }

  // prepara um formulário vazio
  function novoRegistro() {
    // escolhe o primeiro tipo disponível
    const primeirosTipos = entidade === "locais" ? categoriasLocal : categoriasAtividade;
    // guarda os campos iniciais de cada seção
    const formularios: Record<EntidadeMapa, FormularioMapa> = {
      locais: {
        nome: "", numero: "", nomeAlternativo: "", tipo: primeirosTipos[0]?.slug ?? "outro",
        ala: "", andar: "", bloco: "", setor: "", corredor: "", referencia: "", descricao: "",
        instrucoes: "", observacoes: "", acessibilidade: "", horario: "", imagemUrl: "", ordem: 0,
        ativo: true, publicado: true,
      },
      turmas: {
        nome: "", nomeNormalizado: "", aliases: "", turno: "manha", tipo: primeirosTipos[0]?.slug ?? "outro",
        curso: "", serie: "", turma: "", descricao: "", observacoes: "", inicioValidade: "",
        fimValidade: "", ordem: 0, ativo: true, publicado: true,
      },
      ensalamentos: {
        turmaAtividadeId: dados.turmas[0]?.id ?? 0, localId: dados.locais[0]?.id ?? null,
        turno: dados.turmas[0]?.turno ?? "manha", tipo: dados.turmas[0]?.tipo ?? primeirosTipos[0]?.slug ?? "outro",
        observacoes: "", inicioValidade: "", fimValidade: "", ordem: 0, ativo: true, publicado: true,
      },
      categorias: { grupo: "atividade", slug: "", nome: "", ordem: 0, ativo: true },
    };
    setFormulario(formularios[entidade]);
    setIdEditando(null);
    setMudou(false);
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // preenche o formulário para edição
  function editarRegistro(registro: LocalMapa | TurmaMapa | EnsalamentoMapa | CategoriaMapa) {
    // remove os campos controlados pelo servidor
    const copia = Object.fromEntries(
      Object.entries(registro)
        .filter(([chave]) => !["id", "criadoEm", "atualizadoEm"].includes(chave))
        .map(([chave, valor]) => [chave, valor ?? ""]),
    ) as FormularioMapa;
    setFormulario(copia);
    setIdEditando(registro.id);
    setMudou(false);
    setErro("");
    setSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // muda um campo do formulário
  function mudar(chave: string, valor: ValorFormulario) {
    setFormulario((atual) => atual ? { ...atual, [chave]: valor } : atual);
    setMudou(true);
    setSucesso("");
  }

  // escolhe a turma e completa seus dados
  function selecionarTurma(valor: string) {
    const id = Number(valor);
    const turma = dados.turmas.find((item) => item.id === id);
    setFormulario((atual) => atual ? {
      ...atual,
      turmaAtividadeId: id,
      turno: turma?.turno ?? atual.turno,
      tipo: turma?.tipo ?? atual.tipo,
    } : atual);
    setMudou(true);
    setSucesso("");
  }

  function fecharFormulario() {
    if (!confirmarSaida(mudou)) return;
    setFormulario(null);
    setIdEditando(null);
    setMudou(false);
  }

  // salva um registro novo ou editado
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      // envia os dados para a api
      const resposta = await fetch("/api/mapa", {
        method: idEditando ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entidade, id: idEditando, dados: formulario }),
      });
      // lê o resultado da operação
      const resultado = await resposta.json() as { erro?: string };
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar o registro.");
      setFormulario(null);
      setIdEditando(null);
      setMudou(false);
      setSucesso(idEditando ? "Registro atualizado com sucesso." : "Registro criado com sucesso.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  // exclui um registro após confirmação
  async function excluir(registro: LocalMapa | TurmaMapa | EnsalamentoMapa | CategoriaMapa) {
    // encontra o nome mostrado na confirmação
    const nome = nomeRegistro(entidade, registro, dados);
    if (!window.confirm(`Excluir “${nome}”? Esta ação não pode ser desfeita.`)) return;
    setErro("");
    setSucesso("");
    try {
      // monta os dados da exclusão
      const parametros = new URLSearchParams({ entidade, id: String(registro.id) });
      const resposta = await fetch(`/api/mapa?${parametros}`, { method: "DELETE" });
      const resultado = await resposta.json() as { erro?: string };
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível excluir o registro.");
      setSucesso("Registro excluído com sucesso.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro inesperado ao excluir.");
    }
  }

  // envia uma imagem para o servidor
  async function enviarImagem(arquivo?: File) {
    if (!arquivo || !formulario) return;
    setSalvando(true);
    setErro("");
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    try {
      // envia o arquivo e lê seu endereço
      const resposta = await fetch("/api/arquivos", { method: "POST", body: corpo });
      const resultado = await resposta.json() as { url?: string; erro?: string };
      if (!resposta.ok || !resultado.url) throw new Error(resultado.erro || "Não foi possível enviar a imagem.");
      mudar("imagemUrl", resultado.url);
      setSucesso("Imagem enviada. Salve o local para concluir a alteração.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao enviar a imagem.");
    } finally {
      setSalvando(false);
    }
  }

  // baixa os dados do mapa em json
  async function exportar() {
    setErro("");
    try {
      const resposta = await fetch("/api/mapa?todos=1&exportar=1", { cache: "no-store" });
      const resultado = await resposta.json() as Record<string, unknown> & { erro?: string };
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível exportar os dados.");
      // cria o arquivo de exportação
      const arquivo = new Blob([JSON.stringify(resultado, null, 2)], { type: "application/json" });
      // inicia o download do arquivo
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mapa-colegio-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao exportar os dados.");
    }
  }

  // importa dados de um arquivo json
  async function importar(evento: ChangeEvent<HTMLInputElement>) {
    // lê e limpa o campo de arquivo
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    if (arquivo.size > 2 * 1024 * 1024) {
      setErro("O arquivo JSON deve ter no máximo 2 MB.");
      return;
    }
    try {
      // transforma o arquivo em dados
      const conteudo = JSON.parse(await arquivo.text()) as unknown;
      if (!window.confirm("Importar estes dados em modo de mesclagem? Os registros existentes não serão apagados.")) return;
      setSalvando(true);
      setErro("");
      setSucesso("");
      // envia os dados em modo de mesclagem
      const resposta = await fetch("/api/mapa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "importar", confirmar: true, dados: conteudo }),
      });
      const resultado = await resposta.json() as { erro?: string };
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível importar os dados.");
      setSucesso("Importação concluída em modo de mesclagem.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof SyntaxError ? "O arquivo selecionado não contém um JSON válido." : falha instanceof Error ? falha.message : "Erro ao importar os dados.");
    } finally {
      setSalvando(false);
    }
  }

  // escolhe os nomes da seção atual
  const nomeEntidade = nomesEntidades[entidade];

  return (
    <section className="painel-mapa">
      {/* título e botão de novo registro */}
      <header className="topo-painel topo-painel-mapa">
        <div>
          <span className="rotulo-secao">GUIA DO COLÉGIO</span>
          <h1>Mapa e ensalamento</h1>
          <p>Gerencie locais, turmas, atividades e mudanças de sala publicadas no portal.</p>
        </div>
        {!formulario && <button type="button" onClick={novoRegistro}>+ Novo {nomeEntidade.singular}</button>}
      </header>

      {/* abas das seções do mapa */}
      <nav className="abas-mapa-painel" aria-label="Dados do mapa e ensalamento">
        {(Object.keys(nomesEntidades) as EntidadeMapa[]).map((item) => (
          <button type="button" className={entidade === item ? "ativo" : ""} aria-current={entidade === item ? "page" : undefined} onClick={() => trocarEntidade(item)} key={item}>
            {nomesEntidades[item].plural}
          </button>
        ))}
      </nav>

      {/* importação, busca e filtros */}
      <div className="ferramentas-mapa-painel">
        {/* botões dos arquivos json */}
        <div className="acoes-dados-mapa">
          <button type="button" onClick={exportar}>Exportar JSON</button>
          <button type="button" onClick={() => entradaImportacao.current?.click()} disabled={salvando}>Importar JSON</button>
          <input ref={entradaImportacao} type="file" accept="application/json,.json" onChange={importar} hidden tabIndex={-1} />
        </div>
        {/* busca nos registros */}
        <label className="busca-registros-mapa">
          <span>Buscar {entidade === "locais" ? "sala ou local" : entidade === "turmas" ? "turma ou atividade" : "nos registros"}</span>
          <input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder={entidade === "locais" ? "Ex.: 214 ou laboratório" : "Ex.: 3º J ou CELEM"} />
        </label>
        {/* filtros das seções principais */}
        {entidade !== "categorias" && (
          <>
            <label><span>Turno</span><select value={filtroTurno} onChange={(evento) => setFiltroTurno(evento.target.value)}><option value="">Todos</option>{turnos.map((turno) => <option value={turno.valor} key={turno.valor}>{turno.nome}</option>)}</select></label>
            <label><span>Tipo de atividade</span><select value={filtroTipo} onChange={(evento) => setFiltroTipo(evento.target.value)}><option value="">Todos</option>{categoriasAtividade.map((categoria) => <option value={categoria.slug} key={categoria.id}>{categoria.nome}</option>)}</select></label>
            <label><span>Publicação</span><select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)}><option value="">Publicados e rascunhos</option><option value="publicado">Publicado</option><option value="rascunho">Rascunho</option></select></label>
          </>
        )}
      </div>

      {/* mensagens da operação */}
      {erro && <p className="erro-painel" role="alert">{erro}</p>}
      {sucesso && <p className="sucesso-painel" role="status">{sucesso}</p>}

      {/* formulário ou lista da seção */}
      {formulario ? (
        <form className="formulario-painel formulario-mapa-painel" onSubmit={salvar}>
          {/* título do formulário */}
          <div className="titulo-formulario-painel">
            <div><small>{idEditando ? "EDITANDO" : "NOVO REGISTRO"}</small><h2>{idEditando ? "Atualizar" : "Adicionar"} {nomeEntidade.singular}</h2></div>
            <button type="button" onClick={fecharFormulario}>Fechar</button>
          </div>
          {/* campos da seção atual */}
          <div className="grade-campos-painel">
            {entidade === "locais" && <CamposLocal formulario={formulario} mudar={mudar} categorias={categoriasLocal} enviarImagem={enviarImagem} />}
            {entidade === "turmas" && <CamposTurma formulario={formulario} mudar={mudar} categorias={categoriasAtividade} />}
            {entidade === "ensalamentos" && <CamposEnsalamento formulario={formulario} mudar={mudar} selecionarTurma={selecionarTurma} turmas={dados.turmas} locais={dados.locais} categorias={categoriasAtividade} />}
            {entidade === "categorias" && <CamposCategoria formulario={formulario} mudar={mudar} />}
          </div>
          {/* botões do formulário */}
          <div className="acoes-formulario-painel">
            <button type="button" onClick={fecharFormulario}>Cancelar</button>
            <button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar registro"}</button>
          </div>
        </form>
      ) : (
        <div className="lista-painel lista-mapa-painel" aria-busy={carregando}>
          {/* total e estado vazio */}
          {!erro && <p className="total-registros-mapa" role="status">{carregando ? "Carregando registros..." : `${registros.length} ${registros.length === 1 ? "registro encontrado" : "registros encontrados"}`}</p>}
          {!carregando && !erro && !registros.length && <div className="vazio-painel"><strong>Nenhum registro encontrado</strong><p>Ajuste os filtros ou adicione um novo registro.</p></div>}
          {/* cartões da seção atual */}
          {entidade === "locais" && (registros as LocalMapa[]).map((registro) => <CartaoLocal key={registro.id} local={registro} dados={dados} editar={() => editarRegistro(registro)} excluir={() => excluir(registro)} />)}
          {entidade === "turmas" && (registros as TurmaMapa[]).map((registro) => <CartaoTurma key={registro.id} turma={registro} dados={dados} editar={() => editarRegistro(registro)} excluir={() => excluir(registro)} />)}
          {entidade === "ensalamentos" && (registros as EnsalamentoMapa[]).map((registro) => <CartaoEnsalamento key={registro.id} ensalamento={registro} dados={dados} editar={() => editarRegistro(registro)} excluir={() => excluir(registro)} />)}
          {entidade === "categorias" && (registros as CategoriaMapa[]).map((registro) => <CartaoCategoria key={registro.id} categoria={registro} editar={() => editarRegistro(registro)} excluir={() => excluir(registro)} />)}
        </div>
      )}
    </section>
  );
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

// mostra os campos de uma turma
function CamposTurma({ formulario, mudar, categorias }: { formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void; categorias: CategoriaMapa[] }) {
  return <>
    {/* identificação e busca da turma */}
    <Campo chave="nome" rotulo="Nome da turma ou atividade" formulario={formulario} mudar={mudar} obrigatorio />
    <Campo chave="nomeNormalizado" rotulo="Nome normalizado" formulario={formulario} mudar={mudar} dica="Pode ficar vazio: o servidor gera automaticamente." />
    <Campo chave="aliases" rotulo="Apelidos usados na busca" formulario={formulario} mudar={mudar} largo textarea dica="Separe por vírgulas ou linhas." />
    {/* turno e tipo da turma */}
    <CampoSelecao chave="turno" rotulo="Turno" formulario={formulario} mudar={mudar} opcoes={turnos} obrigatorio />
    <CampoSelecao chave="tipo" rotulo="Tipo de atividade" formulario={formulario} mudar={mudar} opcoes={categorias.map((item) => ({ valor: item.slug, nome: item.nome }))} obrigatorio />
    {/* dados escolares */}
    <Campo chave="curso" rotulo="Curso" formulario={formulario} mudar={mudar} />
    <Campo chave="serie" rotulo="Série ou ano" formulario={formulario} mudar={mudar} />
    <Campo chave="turma" rotulo="Turma" formulario={formulario} mudar={mudar} />
    {/* descrições e validade */}
    <Campo chave="descricao" rotulo="Descrição" formulario={formulario} mudar={mudar} largo textarea />
    <Campo chave="observacoes" rotulo="Observações desta turma ou atividade" formulario={formulario} mudar={mudar} largo textarea />
    <Campo chave="inicioValidade" rotulo="Início da validade" formulario={formulario} mudar={mudar} tipo="date" />
    <Campo chave="fimValidade" rotulo="Fim da validade" formulario={formulario} mudar={mudar} tipo="date" />
    {/* ordem e publicação */}
    <Campo chave="ordem" rotulo="Ordem" formulario={formulario} mudar={mudar} tipo="number" />
    <CampoBooleano chave="ativo" rotulo="Turma ou atividade ativa" formulario={formulario} mudar={mudar} />
    <CampoBooleano chave="publicado" rotulo="Publicar no portal" formulario={formulario} mudar={mudar} />
  </>;
}

// mostra os campos de um ensalamento
function CamposEnsalamento({ formulario, mudar, selecionarTurma, turmas, locais, categorias }: { formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void; selecionarTurma: (valor: string) => void; turmas: TurmaMapa[]; locais: LocalMapa[]; categorias: CategoriaMapa[] }) {
  return <>
    {/* turma, turno e tipo */}
    <label><span>Turma ou atividade</span><select value={String(formulario.turmaAtividadeId ?? "")} onChange={(evento) => selecionarTurma(evento.target.value)} required><option value="">Selecione</option>{[...turmas].sort(compararOrdemNome).map((item) => <option value={item.id} key={item.id}>{item.nome} · {nomeTurno(item.turno)}</option>)}</select></label>
    <CampoSelecao chave="turno" rotulo="Turno" formulario={formulario} mudar={mudar} opcoes={turnos} obrigatorio />
    <CampoSelecao chave="tipo" rotulo="Tipo de atividade" formulario={formulario} mudar={mudar} opcoes={categorias.map((item) => ({ valor: item.slug, nome: item.nome }))} obrigatorio />
    {/* local e observações */}
    <label><span>Sala ou local</span><select value={String(formulario.localId ?? "")} onChange={(evento) => mudar("localId", evento.target.value ? Number(evento.target.value) : null)}><option value="">Sem sala definida</option>{[...locais].sort(compararOrdemNome).map((item) => <option value={item.id} key={item.id}>{item.numero ? `Sala ${item.numero} · ` : ""}{item.nome}</option>)}</select></label>
    <Campo chave="observacoes" rotulo="Observações somente deste ensalamento" formulario={formulario} mudar={mudar} largo textarea />
    {/* validade, ordem e publicação */}
    <Campo chave="inicioValidade" rotulo="Início da validade" formulario={formulario} mudar={mudar} tipo="date" />
    <Campo chave="fimValidade" rotulo="Fim da validade" formulario={formulario} mudar={mudar} tipo="date" />
    <Campo chave="ordem" rotulo="Ordem" formulario={formulario} mudar={mudar} tipo="number" />
    <CampoBooleano chave="ativo" rotulo="Ensalamento ativo" formulario={formulario} mudar={mudar} />
    <CampoBooleano chave="publicado" rotulo="Publicar no portal" formulario={formulario} mudar={mudar} />
  </>;
}

// mostra os campos de uma categoria
function CamposCategoria({ formulario, mudar }: { formulario: FormularioMapa; mudar: (chave: string, valor: ValorFormulario) => void }) {
  return <>
    {/* grupo, nome e código */}
    <CampoSelecao chave="grupo" rotulo="Usada em" formulario={formulario} mudar={mudar} opcoes={[{ valor: "atividade", nome: "Turmas e atividades" }, { valor: "local", nome: "Locais e salas" }]} obrigatorio />
    <Campo chave="nome" rotulo="Nome exibido" formulario={formulario} mudar={mudar} obrigatorio />
    <Campo chave="slug" rotulo="Código" formulario={formulario} mudar={mudar} obrigatorio dica="Use letras sem acento, números e sublinhado." />
    {/* ordem e estado da categoria */}
    <Campo chave="ordem" rotulo="Ordem" formulario={formulario} mudar={mudar} tipo="number" />
    <CampoBooleano chave="ativo" rotulo="Tipo disponível" formulario={formulario} mudar={mudar} />
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
  return <label className="campo-publicado"><input type="checkbox" checked={Boolean(formulario[chave])} onChange={(evento) => mudar(chave, evento.target.checked)} /><span>{rotulo}</span></label>;
}

// mostra o resumo de um local
function CartaoLocal({ local, dados, editar, excluir }: { local: LocalMapa; dados: DadosMapa; editar: () => void; excluir: () => void }) {
  // encontra os usos ativos do local
  const usos = dados.ensalamentos.filter((item) => item.localId === local.id && item.ativo);
  // verifica se faltam dados principais
  const incompleto = !local.andar || !local.ala || !local.descricao || !local.instrucoes;
  return <article><Estado publicado={local.publicado} ativo={local.ativo} /><div><h2>{local.numero ? `Sala ${local.numero} · ` : ""}{local.nome}</h2><p>{[local.ala, local.andar, nomeCategoria(local.tipo, dados.categorias)].filter(Boolean).join(" · ") || "Localização não informada"}</p><div className="avisos-registro-mapa">{incompleto && <span>Informações incompletas</span>}{!usos.length && <span>Sem usos cadastrados</span>}</div><small>Atualizado em {formatarData(local.atualizadoEm)}</small></div><Acoes editar={editar} excluir={excluir} /></article>;
}

// mostra o resumo de uma turma
function CartaoTurma({ turma, dados, editar, excluir }: { turma: TurmaMapa; dados: DadosMapa; editar: () => void; excluir: () => void }) {
  // encontra os ensalamentos ativos
  const usos = dados.ensalamentos.filter((item) => item.turmaAtividadeId === turma.id && item.ativo);
  // verifica se falta uma sala
  const semSala = !usos.length || usos.some((item) => !item.localId);
  // verifica se faltam dados principais
  const incompleto = !turma.tipo || !turma.turno;
  return <article><Estado publicado={turma.publicado} ativo={turma.ativo} /><div><h2>{turma.nome}</h2><p>{nomeTurno(turma.turno)} · {nomeCategoria(turma.tipo, dados.categorias)}</p><div className="avisos-registro-mapa">{semSala && <span className="aviso-sem-sala">Sem sala</span>}{incompleto && <span>Registro incompleto</span>}</div><small>Atualizado em {formatarData(turma.atualizadoEm)}</small></div><Acoes editar={editar} excluir={excluir} /></article>;
}

// mostra o resumo de um ensalamento
function CartaoEnsalamento({ ensalamento, dados, editar, excluir }: { ensalamento: EnsalamentoMapa; dados: DadosMapa; editar: () => void; excluir: () => void }) {
  // encontra a turma e o local ligados
  const turma = dados.turmas.find((item) => item.id === ensalamento.turmaAtividadeId);
  const local = dados.locais.find((item) => item.id === ensalamento.localId);
  return <article><Estado publicado={ensalamento.publicado} ativo={ensalamento.ativo} /><div><h2>{turma?.nome || "Turma não encontrada"}</h2><p>{nomeTurno(ensalamento.turno)} · {local ? `${local.numero ? `Sala ${local.numero} · ` : ""}${local.nome}` : "Sem sala definida"}</p><div className="avisos-registro-mapa">{!local && <span className="aviso-sem-sala">Sem sala</span>}</div><small>Atualizado em {formatarData(ensalamento.atualizadoEm)}</small></div><Acoes editar={editar} excluir={excluir} /></article>;
}

// mostra o resumo de uma categoria
function CartaoCategoria({ categoria, editar, excluir }: { categoria: CategoriaMapa; editar: () => void; excluir: () => void }) {
  return <article><span className={categoria.ativo ? "estado-publicado" : "estado-rascunho"}>{categoria.ativo ? "Disponível" : "Inativa"}</span><div><h2>{categoria.nome}</h2><p>{categoria.grupo === "atividade" ? "Turmas e atividades" : "Locais e salas"} · {categoria.slug}</p><small>Atualizado em {formatarData(categoria.atualizadoEm)}</small></div><Acoes editar={editar} excluir={excluir} /></article>;
}

// mostra o estado de publicação
function Estado({ publicado, ativo }: { publicado: boolean; ativo: boolean }) {
  return <span className={publicado && ativo ? "estado-publicado" : "estado-rascunho"}>{!ativo ? "Inativo" : publicado ? "Publicado" : "Rascunho"}</span>;
}

// mostra os botões de edição e exclusão
function Acoes({ editar, excluir }: { editar: () => void; excluir: () => void }) {
  return <div className="acoes-item-painel"><button type="button" onClick={editar}>Editar</button><button type="button" onClick={excluir}>Excluir</button></div>;
}

// guarda os nomes das seções
const nomesEntidades: Record<EntidadeMapa, { singular: string; plural: string }> = {
  locais: { singular: "local", plural: "Locais e salas" },
  turmas: { singular: "turma ou atividade", plural: "Turmas e atividades" },
  ensalamentos: { singular: "ensalamento", plural: "Ensalamentos" },
  categorias: { singular: "tipo", plural: "Tipos cadastrados" },
};

// encontra o nome de um registro
function nomeRegistro(entidade: EntidadeMapa, registro: LocalMapa | TurmaMapa | EnsalamentoMapa | CategoriaMapa, dados: DadosMapa) {
  if (entidade === "ensalamentos") {
    const ensalamento = registro as EnsalamentoMapa;
    return dados.turmas.find((item) => item.id === ensalamento.turmaAtividadeId)?.nome ?? `Ensalamento ${registro.id}`;
  }
  return (registro as LocalMapa | TurmaMapa | CategoriaMapa).nome || `Registro ${registro.id}`;
}

// encontra o nome de uma categoria
function nomeCategoria(slug: string, categorias: CategoriaMapa[]) {
  return categorias.find((item) => item.slug === slug)?.nome ?? slug ?? "Tipo não informado";
}

// encontra o nome de um turno
function nomeTurno(turno: string) {
  return turnos.find((item) => item.valor === turno)?.nome ?? turno ?? "Turno não informado";
}

// compara a busca com vários textos
function correspondeBusca(termo: string, ...valores: Array<string | undefined>) {
  return !termo || valores.some((valor) => normalizar(valor).includes(termo));
}

// verifica se o estado combina com o filtro
function correspondeEstado(publicado: boolean, filtro: string) {
  return !filtro || (filtro === "publicado" ? publicado : !publicado);
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
