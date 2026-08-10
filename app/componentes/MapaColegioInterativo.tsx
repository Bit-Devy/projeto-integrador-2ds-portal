// ativa recursos do navegador
"use client";

// importa tipos, efeitos e controles de estado
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
// importa funções de busca por locais especiais
import { buscarLocaisEspeciaisComoAtividade, localPesquisavelComoAtividade } from "../mapa/busca-publica";
// importa os tipos dos dados do mapa
import type {
  CategoriaMapaPublica as CategoriaMapa,
  DadosMapaPublico as DadosMapa,
  EnsalamentoMapaPublico as EnsalamentoMapa,
  LocalMapaPublico as LocalMapa,
  TurmaAtividadeMapaPublica as TurmaAtividadeMapa,
} from "../mapa/tipos";

// guarda o texto usado para dados ausentes
const informacaoAusente = "Informação ainda não cadastrada.";

// guarda os turnos disponíveis
const turnos = [
  { valor: "manha", nome: "Manhã" },
  { valor: "tarde", nome: "Tarde" },
  { valor: "noite", nome: "Noite" },
] as const;

// define os tipos usados na busca
type Turno = "" | (typeof turnos)[number]["valor"];
type EstadoConsulta = "incompleto" | "vazio" | "resultado";

// define o resultado de uma turma
type ResultadoTurma = {
  turma: TurmaAtividadeMapa;
  ensalamento?: EnsalamentoMapa;
  local?: LocalMapa;
};

// define o resultado de um local
type ResultadoLocal = {
  local: LocalMapa;
  usos: Array<{ turma: TurmaAtividadeMapa; ensalamento: EnsalamentoMapa }>;
};

// identifica a origem de um resultado
type ResultadoBuscaPrincipal =
  | { origem: "turma"; resultado: ResultadoTurma }
  | { origem: "local"; resultado: ResultadoLocal };

// define uma opção de atividade
type OpcaoTipo = { valor: string; nome: string; ordem: number };

// mostra a consulta pública do mapa
export default function MapaColegioInterativo() {
  // guarda os dados carregados
  const [dados, setDados] = useState<DadosMapa | null>(null);
  // controla o carregamento
  const [carregando, setCarregando] = useState(true);
  // guarda a mensagem de erro
  const [erro, setErro] = useState("");
  // conta as tentativas de carregamento
  const [tentativa, setTentativa] = useState(0);

  // carrega os dados públicos do mapa
  useEffect(() => {
    // permite cancelar a busca ao sair da página
    const controle = new AbortController();

    // consulta o mapa publicado
    fetch("/api/mapa", { cache: "no-store", signal: controle.signal })
      .then(async (resposta) => {
        // lê e valida a resposta
        const resultado = await resposta.json().catch(() => null) as (DadosMapa & { erro?: string }) | null;
        if (!resposta.ok) throw new Error(resultado?.erro || "Não foi possível carregar o mapa do colégio.");
        if (!dadosMapaValidos(resultado)) throw new Error("Os dados do mapa estão em um formato inválido.");
        setDados(resultado);
      })
      .catch((falha) => {
        if (falha instanceof Error && falha.name === "AbortError") return;
        setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o mapa do colégio.");
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });

    return () => controle.abort();
  }, [tentativa]);

  // mostra o estado de carregamento
  if (carregando) {
    return (
      <section className="limite pagina-conteudo pagina-mapa-colegio">
        <EstadoMapa tipo="carregando" titulo="Carregando informações do colégio">
          Aguarde enquanto consultamos o ensalamento publicado.
        </EstadoMapa>
      </section>
    );
  }

  // mostra o erro e permite tentar de novo
  if (erro || !dados) {
    return (
      <section className="limite pagina-conteudo pagina-mapa-colegio">
        <EstadoMapa tipo="erro" titulo="Erro ao carregar" alerta>
          {erro || "Não foi possível carregar o mapa do colégio."}
          <button type="button" onClick={() => {
            setCarregando(true);
            setErro("");
            setTentativa((valor) => valor + 1);
          }}>
            Tentar novamente
          </button>
        </EstadoMapa>
      </section>
    );
  }

  return (
    <section className="limite pagina-conteudo pagina-mapa-colegio">
      {/* apresentação do mapa */}
      <div className="introducao-mapa-colegio">
        <span className="rotulo-secao">GUIA DE LOCALIZAÇÃO E ENSALAMENTO</span>
        <h2>Consulte as informações publicadas pelo colégio</h2>
        <p>
          Escolha uma turma ou pesquise uma sala pelo número ou nome. Detalhes complementares só
          aparecem quando cadastrados, sem estimativas de ala, andar ou trajeto.
        </p>
      </div>

      {/* busca por turma e atividade */}
      <BuscaTurma dados={dados} />
      {/* busca por sala e local */}
      <BuscaLocal dados={dados} />
    </section>
  );
}

// mostra a busca por turma ou atividade
function BuscaTurma({ dados }: { dados: DadosMapa }) {
  // guarda os filtros e resultados
  const [turno, setTurno] = useState<Turno>("");
  const [tipo, setTipo] = useState("");
  const [termo, setTermo] = useState("");
  const [estado, setEstado] = useState<EstadoConsulta>("incompleto");
  const [resultados, setResultados] = useState<ResultadoBuscaPrincipal[]>([]);

  // monta os tipos permitidos para o turno
  const opcoesTipo = useMemo(
    () => tiposParaTurno(dados, turno),
    [dados, turno],
  );
  // monta as turmas permitidas pelos filtros
  const turmasDisponiveis = useMemo(
    () => turno && tipo ? turmasCompativeis(dados, turno, tipo) : [],
    [dados, tipo, turno],
  );
  // separa os locais que também são atividades
  const locaisEspeciais = useMemo(
    () => valoresEquivalentes(tipo, "outro")
      ? dados.locais.filter(localPesquisavelComoAtividade)
      : [],
    [dados.locais, tipo],
  );

  // limpa os resultados da busca
  function limparResultado() {
    setEstado("incompleto");
    setResultados([]);
  }

  // troca o turno e limpa os próximos campos
  function mudarTurno(novoTurno: Turno) {
    setTurno(novoTurno);
    setTipo("");
    setTermo("");
    limparResultado();
  }

  // troca o tipo e limpa a busca
  function mudarTipo(novoTipo: string) {
    setTipo(novoTipo);
    setTermo("");
    limparResultado();
  }

  // pesquisa turmas e atividades
  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const busca = normalizarTermoMapa(termo);
    if (!turno || !tipo || !busca) {
      limparResultado();
      return;
    }

    // procura as turmas compatíveis
    const resultadosTurmas: ResultadoBuscaPrincipal[] = buscarTurmas(turmasDisponiveis, busca)
      .flatMap((turma) => resultadosDaTurma(dados, turma, turno, tipo))
      .map((resultado) => ({ origem: "turma", resultado }));
    // procura locais especiais quando o tipo é outro
    const resultadosLocais: ResultadoBuscaPrincipal[] = valoresEquivalentes(tipo, "outro")
      ? buscarLocaisEspeciaisComoAtividade(dados.locais, busca).map((local) => ({
        origem: "local",
        resultado: montarResultadoLocal(dados, local, "", ""),
      }))
      : [];
    // reúne todos os tipos de resultado
    const novosResultados = [...resultadosTurmas, ...resultadosLocais];
    setResultados(novosResultados);
    setEstado(novosResultados.length ? "resultado" : "vazio");
  }

  return (
    <section className="cartao-busca-mapa" aria-labelledby="titulo-busca-turma">
      {/* título da busca por turma */}
      <header className="cabecalho-busca-mapa">
        <span aria-hidden="true">01</span>
        <div>
          <h2 id="titulo-busca-turma">Onde fica minha turma ou atividade?</h2>
          <p>Selecione os filtros na ordem e depois informe o nome usado para a turma ou atividade.</p>
        </div>
      </header>

      {/* filtros da busca por turma */}
      <form className="formulario-busca-mapa" onSubmit={pesquisar} noValidate>
        <div className="grade-filtros-mapa grade-filtros-turma">
          <label>
            {/* escolha do turno */}
            <span>1. Turno</span>
            <select
              value={turno}
              onChange={(evento) => mudarTurno(evento.target.value as Turno)}
              aria-describedby="ajuda-turno-turma"
              required
            >
              <option value="">Selecione o turno</option>
              {turnos.map((item) => <option value={item.valor} key={item.valor}>{item.nome}</option>)}
            </select>
            <small id="ajuda-turno-turma">As opções seguintes dependem do turno.</small>
          </label>

          <label>
            {/* escolha do tipo */}
            <span>2. Tipo de atividade</span>
            <select value={tipo} onChange={(evento) => mudarTipo(evento.target.value)} disabled={!turno} required>
              <option value="">{turno ? "Selecione o tipo" : "Escolha primeiro o turno"}</option>
              {opcoesTipo.map((item) => <option value={item.valor} key={item.valor}>{item.nome}</option>)}
            </select>
            <small>{turno && !opcoesTipo.length ? "Nenhum tipo publicado para este turno." : "Os tipos seguem o turno; “Outro” também reúne espaços especiais sem turno informado."}</small>
          </label>

          <label>
            {/* nome da turma ou atividade */}
            <span>3. Turma ou atividade</span>
            <input
              type="search"
              value={termo}
              onChange={(evento) => {
                setTermo(evento.target.value);
                limparResultado();
              }}
              list="opcoes-turmas-mapa"
              placeholder={tipo ? (valoresEquivalentes(tipo, "outro") ? "Ex.: Reforço, DANCEP ou Laboratório" : "Ex.: 3º J") : "Escolha primeiro o tipo"}
              autoComplete="off"
              disabled={!turno || !tipo}
              required
            />
            <datalist id="opcoes-turmas-mapa">
              {turmasDisponiveis.map((turma) => <option value={turma.nome} key={turma.id} />)}
              {locaisEspeciais.map((local) => <option value={local.nome} key={`local-${local.id}`} />)}
            </datalist>
            <small>A busca ignora acentos, espaços e os sinais º e °. Em “Outro”, também estão os espaços especiais.</small>
          </label>
        </div>
        <button type="submit" aria-controls="resultados-busca-turma">Encontrar turma ou atividade</button>
      </form>

      {/* resultado da busca por turma */}
      <div className="resultados-mapa" id="resultados-busca-turma" aria-live="polite">
        {estado === "incompleto" && (
          <EstadoMapa tipo="incompleto" titulo="Preencha os três campos">
            Escolha turno, tipo e turma ou atividade para fazer a consulta.
          </EstadoMapa>
        )}
        {estado === "vazio" && (
          <EstadoMapa tipo="vazio" titulo="Nenhum resultado encontrado">
            Confira a escrita ou selecione outra opção disponível para o turno.
          </EstadoMapa>
        )}
        {estado === "resultado" && (
          <>
            {/* quantidade de resultados */}
            <ResumoResultados quantidade={resultados.length} singular="resultado encontrado" plural="resultados encontrados" />
            <div className="lista-resultados-mapa">
              {/* cartões das turmas e locais encontrados */}
              {resultados.map((item, indice) => item.origem === "turma"
                ? <CartaoResultadoTurma resultado={item.resultado} categorias={dados.categorias} key={`turma-${item.resultado.turma.id}-${item.resultado.ensalamento?.id ?? `sem-sala-${indice}`}`} />
                : <CartaoResultadoLocal resultado={item.resultado} categorias={dados.categorias} key={`local-${item.resultado.local.id}`} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// mostra a busca por sala ou local
function BuscaLocal({ dados }: { dados: DadosMapa }) {
  // guarda os filtros e resultados
  const [termo, setTermo] = useState("");
  const [turno, setTurno] = useState<Turno>("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState<EstadoConsulta>("incompleto");
  const [resultados, setResultados] = useState<ResultadoLocal[]>([]);
  // monta as opções de atividade
  const opcoesTipo = useMemo(() => opcoesDeTipo(dados), [dados]);

  // limpa os resultados da busca
  function limparResultado() {
    setEstado("incompleto");
    setResultados([]);
  }

  // pesquisa salas e locais
  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const busca = normalizarTermoMapa(termo);
    if (!busca) {
      limparResultado();
      return;
    }

    const encontrados = buscarLocais(dados, busca, turno, tipo);
    setResultados(encontrados);
    setEstado(encontrados.length ? "resultado" : "vazio");
  }

  return (
    <section className="cartao-busca-mapa" aria-labelledby="titulo-busca-local">
      {/* título da busca por local */}
      <header className="cabecalho-busca-mapa">
        <span aria-hidden="true">02</span>
        <div>
          <h2 id="titulo-busca-local">Procurar uma sala ou local</h2>
          <p>Pesquise pelo número, nome do espaço ou setor. Os filtros de uso são opcionais.</p>
        </div>
      </header>

      {/* filtros da busca por local */}
      <form className="formulario-busca-mapa" onSubmit={pesquisar} noValidate>
        <div className="grade-filtros-mapa grade-filtros-local">
          {/* nome ou número do local */}
          <label className="campo-busca-local">
            <span>Número, sala ou local</span>
            <input
              type="search"
              value={termo}
              onChange={(evento) => {
                setTermo(evento.target.value);
                limparResultado();
              }}
              placeholder="Ex.: 214, Sala 214 ou Biblioteca"
              autoComplete="off"
              required
            />
            <small>Também é possível pesquisar laboratórios, setores e espaços institucionais.</small>
          </label>

          {/* filtro opcional de turno */}
          <label>
            <span>Turno (opcional)</span>
            <select value={turno} onChange={(evento) => {
              setTurno(evento.target.value as Turno);
              limparResultado();
            }}>
              <option value="">Todos os turnos</option>
              {turnos.map((item) => <option value={item.valor} key={item.valor}>{item.nome}</option>)}
            </select>
          </label>

          {/* filtro opcional de atividade */}
          <label>
            <span>Tipo de atividade (opcional)</span>
            <select value={tipo} onChange={(evento) => {
              setTipo(evento.target.value);
              limparResultado();
            }}>
              <option value="">Todos os tipos</option>
              {opcoesTipo.map((item) => <option value={item.valor} key={item.valor}>{item.nome}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" aria-controls="resultados-busca-local">Procurar sala ou local</button>
      </form>

      {/* resultado da busca por local */}
      <div className="resultados-mapa" id="resultados-busca-local" aria-live="polite">
        {estado === "incompleto" && (
          <EstadoMapa tipo="incompleto" titulo="Digite uma sala ou local">
            Informe um número ou nome. Os filtros podem ficar em “Todos”.
          </EstadoMapa>
        )}
        {estado === "vazio" && (
          <EstadoMapa tipo="vazio" titulo="Nenhum resultado encontrado">
            Não há sala ou local publicado que corresponda à busca e aos filtros escolhidos.
          </EstadoMapa>
        )}
        {estado === "resultado" && (
          <>
            {/* quantidade de locais */}
            <ResumoResultados quantidade={resultados.length} singular="local encontrado" plural="locais encontrados" />
            <div className="lista-resultados-mapa">
              {/* cartões dos locais encontrados */}
              {resultados.map((resultado) => (
                <CartaoResultadoLocal resultado={resultado} categorias={dados.categorias} key={resultado.local.id} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// mostra o resultado de uma turma
function CartaoResultadoTurma({ resultado, categorias }: { resultado: ResultadoTurma; categorias: CategoriaMapa[] }) {
  // separa os dados do resultado
  const { turma, ensalamento, local } = resultado;
  // encontra a atualização mais recente
  const atualizadoEm = dataMaisRecente(turma.atualizadoEm, ensalamento?.atualizadoEm, local?.atualizadoEm);
  // verifica se existem observações
  const temObservacoes = temTexto(turma.observacoes, ensalamento?.observacoes, local?.observacoes);

  return (
    <article className="cartao-resultado-mapa">
      {/* nome, categoria e turno */}
      <header className="topo-resultado-mapa">
        <div>
          <span>{nomeCategoria(categorias, "atividade", ensalamento?.tipo || turma.tipo)}</span>
          <h3>{valorOuInformacao(turma.nome)}</h3>
        </div>
        <b>{rotuloTurno(ensalamento?.turno || turma.turno)}</b>
      </header>

      {/* localização principal */}
      <dl className="detalhes-mapa detalhes-destaque-mapa">
        <DetalheMapa rotulo="Sala ou local" valor={local ? nomeCompletoLocal(local) : ""} />
        <DetalheMapa rotulo="Ala" valor={local?.ala} />
        <DetalheMapa rotulo="Andar" valor={local?.andar} />
        <DetalheMapa rotulo="Bloco" valor={local?.bloco} />
        <DetalheMapa rotulo="Setor" valor={local?.setor} />
        <DetalheMapa rotulo="Corredor" valor={local?.corredor} />
      </dl>

      {/* descrições e instruções */}
      <div className="blocos-informacao-mapa">
        <SecaoTextoMapa titulo="Referência" texto={local?.referencia} />
        <SecaoTextoMapa titulo="Como chegar" texto={local?.instrucoes} ocultarVazio />
        <SecaoTextoMapa titulo="Descrição da turma ou atividade" texto={turma.descricao} ocultarVazio />
        <SecaoTextoMapa titulo="Descrição do local" texto={local?.descricao} ocultarVazio />
      </div>

      {/* observações disponíveis */}
      {temObservacoes && (
        <section className="observacoes-mapa" aria-label={`Observações de ${turma.nome}`}>
          <h4>Observações</h4>
          <div className="grade-observacoes-mapa">
            <SecaoTextoMapa titulo="Turma ou atividade" texto={turma.observacoes} ocultarVazio />
            <SecaoTextoMapa titulo="Ensalamento" texto={ensalamento?.observacoes} ocultarVazio />
            <SecaoTextoMapa titulo="Sala ou local" texto={local?.observacoes} ocultarVazio />
          </div>
        </section>
      )}

      {/* dados complementares */}
      <dl className="detalhes-mapa detalhes-complementares-mapa">
        <DetalheMapa rotulo="Curso" valor={turma.curso} />
        <DetalheMapa rotulo="Série ou ano" valor={turma.serie} />
        <DetalheMapa rotulo="Acessibilidade do local" valor={local?.acessibilidade} ocultarVazio />
        <DetalheMapa rotulo="Funcionamento" valor={local?.horario} ocultarVazio />
        <DetalheMapa rotulo="Início da validade" valor={formatarData(ensalamento?.inicioValidade || turma.inicioValidade)} ocultarVazio />
        <DetalheMapa rotulo="Fim da validade" valor={formatarData(ensalamento?.fimValidade || turma.fimValidade)} ocultarVazio />
      </dl>

      {/* imagem de referência */}
      {local?.imagemUrl && (
        <figure className="imagem-local-mapa">
          <img src={local.imagemUrl} alt={`Imagem ou mapa relacionado a ${local.nome}`} />
          <figcaption>Imagem de referência cadastrada para este local.</figcaption>
        </figure>
      )}

      <p className="atualizacao-mapa">Última atualização: {valorOuInformacao(formatarData(atualizadoEm))}</p>
    </article>
  );
}

// mostra o resultado de um local
function CartaoResultadoLocal({ resultado, categorias }: { resultado: ResultadoLocal; categorias: CategoriaMapa[] }) {
  // separa o local e seus usos
  const { local, usos } = resultado;
  // encontra a atualização mais recente
  const atualizadoEm = dataMaisRecente(local.atualizadoEm, ...usos.map((uso) => uso.ensalamento.atualizadoEm));

  return (
    <article className="cartao-resultado-mapa">
      {/* nome e tipo do local */}
      <header className="topo-resultado-mapa">
        <div>
          <span>{nomeCategoria(categorias, "local", local.tipo)}</span>
          <h3>{nomeCompletoLocal(local)}</h3>
        </div>
        {local.numero && <b>Sala {local.numero}</b>}
      </header>

      {/* localização detalhada */}
      <dl className="detalhes-mapa detalhes-destaque-mapa">
        <DetalheMapa rotulo="Número" valor={local.numero} />
        <DetalheMapa rotulo="Nome" valor={local.nome} />
        <DetalheMapa rotulo="Nome alternativo" valor={local.nomeAlternativo} />
        <DetalheMapa rotulo="Ala" valor={local.ala} />
        <DetalheMapa rotulo="Andar" valor={local.andar} />
        <DetalheMapa rotulo="Bloco" valor={local.bloco} />
        <DetalheMapa rotulo="Setor" valor={local.setor} />
        <DetalheMapa rotulo="Corredor" valor={local.corredor} />
      </dl>

      {/* informações extras do local */}
      <div className="blocos-informacao-mapa">
        <SecaoTextoMapa titulo="Descrição" texto={local.descricao} ocultarVazio />
        <SecaoTextoMapa titulo="Como chegar" texto={local.instrucoes} ocultarVazio />
        <SecaoTextoMapa titulo="Ponto de referência" texto={local.referencia} />
        <SecaoTextoMapa titulo="Observações do local" texto={local.observacoes} ocultarVazio />
        <SecaoTextoMapa titulo="Acessibilidade" texto={local.acessibilidade} ocultarVazio />
        <SecaoTextoMapa titulo="Funcionamento" texto={local.horario} ocultarVazio />
      </div>

      {/* turmas que usam o local */}
      <section className="usos-local-mapa" aria-labelledby={`titulo-usos-local-${local.id}`}>
        <h4 id={`titulo-usos-local-${local.id}`}>Turmas e atividades que utilizam este local</h4>
        {usos.length ? (
          <ul>
            {/* lista dos usos encontrados */}
            {usos.map(({ turma, ensalamento }) => (
              <li key={ensalamento.id}>
                <div>
                  <strong>{turma.nome}</strong>
                  <span>{rotuloTurno(ensalamento.turno || turma.turno)} · {nomeCategoria(categorias, "atividade", ensalamento.tipo || turma.tipo)}</span>
                </div>
                {ensalamento.observacoes && <p><b>Observação deste ensalamento:</b> {ensalamento.observacoes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="informacao-ausente-mapa">Nenhuma turma ou atividade cadastrada para os filtros escolhidos.</p>
        )}
      </section>

      {/* imagem de referência */}
      {local.imagemUrl && (
        <figure className="imagem-local-mapa">
          <img src={local.imagemUrl} alt={`Imagem ou mapa relacionado a ${local.nome}`} />
          <figcaption>Imagem de referência cadastrada para este local.</figcaption>
        </figure>
      )}

      <p className="atualizacao-mapa">Última atualização: {valorOuInformacao(formatarData(atualizadoEm))}</p>
    </article>
  );
}

// mostra um dado simples do mapa
function DetalheMapa({ rotulo, valor, ocultarVazio = false }: { rotulo: string; valor?: string | null; ocultarVazio?: boolean }) {
  // verifica se o dado foi preenchido
  const preenchido = Boolean(valor?.trim());
  if (!preenchido && ocultarVazio) return null;
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd className={preenchido ? undefined : "informacao-ausente-mapa"}>{preenchido ? valor : informacaoAusente}</dd>
    </div>
  );
}

// mostra um bloco de texto do mapa
function SecaoTextoMapa({ titulo, texto, ocultarVazio = false }: { titulo: string; texto?: string | null; ocultarVazio?: boolean }) {
  // verifica se o texto foi preenchido
  const preenchido = Boolean(texto?.trim());
  if (!preenchido && ocultarVazio) return null;
  return (
    <section>
      <h4>{titulo}</h4>
      <p className={preenchido ? undefined : "informacao-ausente-mapa"}>{preenchido ? texto : informacaoAusente}</p>
    </section>
  );
}

// mostra um estado da consulta
function EstadoMapa({ tipo, titulo, children, alerta = false }: { tipo: string; titulo: string; children: ReactNode; alerta?: boolean }) {
  return (
    <div className={`estado-mapa estado-mapa-${tipo}`} role={alerta ? "alert" : "status"}>
      <span aria-hidden="true">{tipo === "erro" ? "!" : tipo === "carregando" ? "…" : "⌕"}</span>
      <div><strong>{titulo}</strong><p>{children}</p></div>
    </div>
  );
}

// mostra a quantidade de resultados
function ResumoResultados({ quantidade, singular, plural }: { quantidade: number; singular: string; plural: string }) {
  return <p className="resumo-resultados-mapa"><strong>{quantidade}</strong> {quantidade === 1 ? singular : plural}.</p>;
}

// valida os grupos principais do mapa
function dadosMapaValidos(dados: DadosMapa | null): dados is DadosMapa {
  return Boolean(
    dados
    && Array.isArray(dados.categorias)
    && Array.isArray(dados.locais)
    && Array.isArray(dados.turmas)
    && Array.isArray(dados.ensalamentos),
  );
}

// simplifica um texto para a busca
export function normalizarTermoMapa(valor: string) {
  // remove acentos, palavras ordinais e sinais
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bprimeir[oa]\b/g, "1")
    .replace(/\bsegund[oa]\b/g, "2")
    .replace(/\bterceir[oa]\b/g, "3")
    .replace(/[º°]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// reúne os tipos de atividade disponíveis
function opcoesDeTipo(dados: DadosMapa): OpcaoTipo[] {
  // evita opções repetidas
  const opcoes = new Map<string, OpcaoTipo>();
  // a api pública já exclui categorias inativas
  for (const categoria of dados.categorias.filter((item) => item.grupo === "atividade")) {
    opcoes.set(normalizarTermoMapa(categoria.slug), {
      valor: categoria.slug,
      nome: categoria.nome,
      ordem: categoria.ordem,
    });
  }

  // reúne tipos usados em turmas e ensalamentos
  const valores = [
    ...dados.turmas.map((turma) => turma.tipo),
    ...dados.ensalamentos.map((ensalamento) => ensalamento.tipo),
  ];
  for (const valor of valores.filter(Boolean)) {
    const chave = normalizarTermoMapa(valor);
    if (!opcoes.has(chave)) opcoes.set(chave, { valor, nome: rotuloDoCodigo(valor), ordem: 999 });
  }

  // ordena as opções para exibição
  return [...opcoes.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

// filtra os tipos usados em um turno
function tiposParaTurno(dados: DadosMapa, turno: Turno) {
  if (!turno) return [];
  const usados = new Set<string>();
  for (const turma of dados.turmas) {
    if (turma.turno === turno) usados.add(normalizarTermoMapa(turma.tipo));
  }
  for (const ensalamento of dados.ensalamentos) {
    if (ensalamento.turno === turno) usados.add(normalizarTermoMapa(ensalamento.tipo));
  }
  if (dados.locais.some(localPesquisavelComoAtividade)) usados.add(normalizarTermoMapa("outro"));
  return opcoesDeTipo(dados).filter((item) => usados.has(normalizarTermoMapa(item.valor)));
}

// encontra turmas compatíveis com os filtros
function turmasCompativeis(dados: DadosMapa, turno: Exclude<Turno, "">, tipo: string) {
  return dados.turmas
    .filter((turma) => {
      if (turma.turno === turno && valoresEquivalentes(turma.tipo, tipo)) return true;
      return dados.ensalamentos.some((ensalamento) =>
        ensalamento.turmaAtividadeId === turma.id
        && ensalamento.turno === turno
        && valoresEquivalentes(ensalamento.tipo, tipo));
    })
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
}

// procura turmas pelo nome e apelidos
function buscarTurmas(turmas: TurmaAtividadeMapa[], busca: string) {
  // dá preferência aos nomes exatos
  const exatas = turmas.filter((turma) => termosDaTurma(turma).some((termo) => termo === busca));
  if (exatas.length) return exatas;
  return turmas.filter((turma) => termosDaTurma(turma).some((termo) => termo.includes(busca)));
}

// monta todos os nomes pesquisáveis da turma
function termosDaTurma(turma: TurmaAtividadeMapa) {
  // separa os apelidos cadastrados
  const aliases = turma.aliases.split(/[,;|\n]/).map((item) => item.trim()).filter(Boolean);
  return [turma.nome, turma.nomeNormalizado, ...aliases].map(normalizarTermoMapa).filter(Boolean);
}

// monta os resultados de uma turma
function resultadosDaTurma(dados: DadosMapa, turma: TurmaAtividadeMapa, turno: Exclude<Turno, "">, tipo: string): ResultadoTurma[] {
  // procura todos os ensalamentos compatíveis
  const ensalamentos = dados.ensalamentos.filter((item) =>
    item.turmaAtividadeId === turma.id
    && item.turno === turno
    && valoresEquivalentes(item.tipo, tipo));
  if (!ensalamentos.length) return [{ turma }];
  return ensalamentos.map((ensalamento) => ({
    turma,
    ensalamento,
    local: ensalamento.localId === null ? undefined : dados.locais.find((local) => local.id === ensalamento.localId),
  }));
}

// procura locais pelo texto e filtros
function buscarLocais(dados: DadosMapa, busca: string, turno: Turno, tipo: string): ResultadoLocal[] {
  return dados.locais
    .filter((local) => termosDoLocal(local).some((termo) => termo.includes(busca)))
    .map((local) => montarResultadoLocal(dados, local, turno, tipo))
    .filter((resultado) => (!turno && !tipo) || resultado.usos.length > 0)
    .sort((a, b) => a.local.ordem - b.local.ordem || nomeCompletoLocal(a.local).localeCompare(nomeCompletoLocal(b.local), "pt-BR", { numeric: true }));
}

// monta um local com as turmas que o usam
function montarResultadoLocal(dados: DadosMapa, local: LocalMapa, turno: Turno, tipo: string): ResultadoLocal {
  // filtra os ensalamentos do local
  const usos = dados.ensalamentos
    .filter((ensalamento) => ensalamento.localId === local.id)
    .filter((ensalamento) => !turno || ensalamento.turno === turno)
    .filter((ensalamento) => !tipo || valoresEquivalentes(ensalamento.tipo, tipo))
    .map((ensalamento) => ({
      ensalamento,
      turma: dados.turmas.find((turma) => turma.id === ensalamento.turmaAtividadeId),
    }))
    .filter((uso): uso is { turma: TurmaAtividadeMapa; ensalamento: EnsalamentoMapa } => Boolean(uso.turma));
  return { local, usos };
}

// monta todos os nomes pesquisáveis do local
function termosDoLocal(local: LocalMapa) {
  return [
    local.numero,
    local.nome,
    local.nomeAlternativo,
    local.tipo,
    local.setor,
    local.bloco,
    local.corredor,
    local.numero ? `Sala ${local.numero}` : "",
  ].map((item) => normalizarTermoMapa(item || "")).filter(Boolean);
}

// compara dois textos de busca
function valoresEquivalentes(primeiro: string, segundo: string) {
  return normalizarTermoMapa(primeiro) === normalizarTermoMapa(segundo);
}

// encontra o nome de uma categoria
function nomeCategoria(categorias: CategoriaMapa[], grupo: CategoriaMapa["grupo"], slug: string) {
  const categoria = categorias.find((item) => item.grupo === grupo && valoresEquivalentes(item.slug, slug));
  return categoria?.nome || rotuloDoCodigo(slug);
}

// transforma um código em texto
function rotuloDoCodigo(valor: string) {
  const texto = valor.replace(/[_-]+/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : informacaoAusente;
}

// encontra o nome de um turno
function rotuloTurno(turno?: string | null) {
  return turnos.find((item) => item.valor === turno)?.nome || valorOuInformacao(turno || "");
}

// monta o nome completo de um local
function nomeCompletoLocal(local: LocalMapa) {
  const nome = local.nome?.trim();
  const numero = local.numero?.trim();
  if (numero && nome && normalizarTermoMapa(nome) !== normalizarTermoMapa(`Sala ${numero}`)) return `Sala ${numero} — ${nome}`;
  if (numero) return nome || `Sala ${numero}`;
  return nome || informacaoAusente;
}

// troca valores vazios por um aviso
function valorOuInformacao(valor?: string | null) {
  return valor?.trim() || informacaoAusente;
}

// verifica se algum texto foi preenchido
function temTexto(...valores: Array<string | null | undefined>) {
  return valores.some((valor) => Boolean(valor?.trim()));
}

// encontra a data mais recente
function dataMaisRecente(...datas: Array<string | null | undefined>) {
  return datas.filter((data): data is string => Boolean(data)).sort((a, b) => b.localeCompare(a))[0];
}

// transforma a data para leitura
function formatarData(valor?: string | null) {
  if (!valor) return "";
  // reconhece datas no formato do banco
  const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  // tenta ler outros formatos de data
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR");
}
