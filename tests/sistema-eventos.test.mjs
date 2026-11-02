// importa as verificações dos resultados
import assert from "node:assert/strict";
// importa a leitura de arquivos e pastas
import { readFile, readdir, stat } from "node:fs/promises";
// registra um resolvedor para os imports TypeScript locais sem extensão
import { register } from "node:module";
// importa a criação dos testes
import test from "node:test";
// monta caminhos locais
import path from "node:path";

const raiz = process.cwd();

// os módulos do domínio usam imports relativos sem extensão, como o restante do projeto
const resolvedorTypeScript = `
  export async function resolve(specifier, context, nextResolve) {
    try {
      return await nextResolve(specifier, context);
    } catch (erro) {
      const relativo = specifier.startsWith("./") || specifier.startsWith("../");
      if (erro?.code === "ERR_MODULE_NOT_FOUND" && relativo) {
        return nextResolve(specifier + ".ts", context);
      }
      throw erro;
    }
  }
`;
register(`data:text/javascript,${encodeURIComponent(resolvedorTypeScript)}`, import.meta.url);

test("valida o intervalo completo do evento, incluindo a passagem da meia-noite", async () => {
  const { validarEventoInterno } = await importarDominio("validacao");
  const base = { titulo: "Evento de teste", dataInicial: "2026-11-10", horarioInicial: "16:00" };
  for (const dados of [
    { dataFinal: "2026-11-10", horarioFinal: "08:00" },
    { dataFinal: "", horarioFinal: "08:00" },
    { dataFinal: "2026-11-09", horarioFinal: "18:00" },
  ]) {
    assert.throws(() => validarEventoInterno({ ...base, ...dados }), (erro) => erro.status === 400);
  }
  for (const dados of [
    { dataFinal: "2026-11-10", horarioFinal: "16:00" },
    { dataFinal: "2026-11-10", horarioFinal: "18:00" },
    { dataFinal: "", horarioFinal: "18:00" },
    { dataFinal: "2026-11-11", horarioFinal: "08:00" },
    { dataFinal: "2026-11-13", horarioFinal: "08:00" },
    { dataFinal: "2026-11-10", horarioFinal: "" },
  ]) {
    assert.doesNotThrow(() => validarEventoInterno({ ...base, ...dados }));
  }
  assert.doesNotThrow(() => validarEventoInterno({ titulo: "Data a definir" }));
});

test("normaliza as formas equivalentes de uma turma", async () => {
  const { normalizarTurma, normalizarTextoBusca, normalizarSlugPublico } = await importarDominio("normalizacao");
  const esperado = normalizarTurma("3J");

  for (const forma of ["3º J", "3° J", "3 J", "3J", "  3º   j  "]) {
    assert.equal(normalizarTurma(forma), esperado, `${forma} deve representar a turma 3J`);
  }
  assert.equal(normalizarTextoBusca("José da Silva"), "josedasilva");
  assert.equal(normalizarSlugPublico("Reunião de Representantes"), "reuniao-de-representantes");
});

test("valida confrontos, vencedores e resultado por W.O.", async () => {
  const { validarPartida } = await importarDominio("validacao");
  const partidaBase = {
    faseId: 8,
    ordem: 1,
    participanteAId: 10,
    participanteBId: 11,
    publicado: true,
  };

  assert.throws(
    () => validarPartida({ ...partidaBase, participanteBId: 10 }),
    /contra ela mesma/i,
  );
  assert.throws(
    () => validarPartida({ ...partidaBase, vencedorId: 99, situacao: "encerrada" }),
    /vencedor precisa participar/i,
  );
  assert.throws(
    () => validarPartida({ ...partidaBase, situacao: "wo" }),
    /vencedor/i,
  );

  const wo = validarPartida({
    ...partidaBase,
    situacao: "wo",
    vencedorId: 10,
    formaVitoria: "wo",
    placarA: "",
    placarB: "",
  });
  assert.equal(wo.vencedorId, 10);
  assert.equal(wo.placarA, null);
  assert.equal(wo.placarB, null);
});

test("gera uma chave de mata-mata navegável sem inventar equipes", async () => {
  const { planejarChaveMataMata, validarLigacaoPartida } = await importarDominio("chave");
  const participantes = Array.from({ length: 6 }, (_, indice) => ({
    id: indice + 1,
    nome: `Equipe ${indice + 1}`,
    posicaoInicial: indice + 1,
  }));
  const fases = planejarChaveMataMata(participantes);

  assert.deepEqual(fases.map((fase) => fase.nome), ["Quartas de final", "Semifinais", "Final"]);
  assert.deepEqual(fases.map((fase) => fase.jogos.length), [3, 1, 1]);
  assert.equal(fases[0].jogos.filter((jogo) => jogo.vencedorAutomatico).length, 0);
  assert.equal(fases[0].jogos.filter((jogo) => jogo.proximaFaseOrdem === 2).length, 2);
  assert.equal(fases[0].jogos.filter((jogo) => jogo.proximaFaseOrdem === 3).length, 1);
  assert.equal(fases.at(-1).jogos[0].proximaPartidaOrdem, null);

  assert.doesNotThrow(() => validarLigacaoPartida(1, 2, "a"));
  assert.throws(() => validarLigacaoPartida(1, 1, "a"), /ela mesma/i);
  assert.throws(() => validarLigacaoPartida(1, 2, "c"), /posição A ou B/i);
  assert.throws(
    () => planejarChaveMataMata([participantes[0]]),
    /pelo menos dois/i,
  );
});

test("cadastro aceita apenas séries válidas seguidas de uma a três letras", async () => {
  const { separarTurmas, anoEscolarTurma } = await importarDominio("interclasse-utilitarios");
  const { validarParticipante, validarCampeonato } = await importarDominio("validacao");
  assert.deepEqual(separarTurmas("6a 7B\n8ABC, 9C; 1J 2DS 3C"), ["6A", "7B", "8ABC", "9C", "1J", "2DS", "3C"]);
  assert.deepEqual(separarTurmas(" \n "), []);
  for (const nome of ["6A", "7B", "8ABC", "9C", "1J", "2DS", "3C"]) assert.equal(validarParticipante({ nome }).nome, nome);
  assert.equal(validarParticipante({ nome: " 2ds " }).nome, "2DS");
  assert.equal(validarParticipante({ nome: "Equipe Azul", nomeExibicao: "Nome atualizado" }, "Equipe Azul").nome, "Equipe Azul");
  assert.throws(() => validarParticipante({ nome: "Equipe Verde" }, "Equipe Azul"), /série/i);
  for (const nome of ["4A", "5B", "0A", "10A", "A1", "1", "1ABCD", "3C2", "1ºA", "1 A", "Equipe Azul"]) {
    assert.throws(() => validarParticipante({ nome }), /série/i, nome);
  }
  assert.equal(anoEscolarTurma("1J") - anoEscolarTurma("9A"), 1);
  assert.equal(anoEscolarTurma("3C") - anoEscolarTurma("1J"), 2);
  assert.equal(anoEscolarTurma("4A"), null);
  for (const diferencaMaximaAnos of [0, 4, 1.5, "inválido"]) assert.throws(() => validarCampeonato({ nome: "Teste", modalidade: "Futsal", diferencaMaximaAnos }));
});

test("o sorteio embaralha participantes e folgas sem alterar os cadastros", async (t) => {
  const { planejarChaveMataMata } = await importarDominio("chave");
  const participantes = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, nome: `1${String.fromCharCode(65 + i)}`, posicaoInicial: i + 1 }));
  const original = structuredClone(participantes);
  const random = t.mock.method(Math, "random", () => 0);
  const primeiro = planejarChaveMataMata(participantes)[0].jogos;
  random.mock.mockImplementation(() => 0.9999);
  const segundo = planejarChaveMataMata(participantes)[0].jogos;
  const ids = (jogos) => jogos.flatMap((jogo) => [jogo.participanteA?.id ?? null, jogo.participanteB?.id ?? null]);
  assert.notDeepEqual(ids(primeiro), ids(segundo));
  assert.deepEqual(participantes, original);
  for (const jogos of [primeiro, segundo]) {
    assert.deepEqual(new Set(ids(jogos).filter(Boolean)), new Set(participantes.map((p) => p.id)));
    assert.equal(jogos.filter((jogo) => jogo.vencedorAutomatico).length, 0);
    assert.ok(jogos.every((jogo) => jogo.participanteA || jogo.participanteB));
  }
});

test("sorteio adia encontros distantes e aceita os que forem inevitáveis", async () => {
  const { planejarChaveMataMata } = await importarDominio("chave");
  const { anoEscolarTurma } = await importarDominio("interclasse-utilitarios");
  const criar = (nomes) => nomes.map((nome, i) => ({ id: i + 1, nome: "Nome público livre", nomeCadastrado: nome, posicaoInicial: i + 1 }));
  assert.doesNotThrow(() => planejarChaveMataMata(criar(["1J", "3C"]), 1));
  assert.doesNotThrow(() => planejarChaveMataMata(criar(["1J", "3C"]), 2));
  assert.doesNotThrow(() => planejarChaveMataMata(criar(["9A", "1J"]), 1));
  assert.doesNotThrow(() => planejarChaveMataMata(criar(["6A", "6B", "6C", "3A"]), 1));
  assert.throws(() => planejarChaveMataMata(criar(["Equipe A", "6B"]), 1), /nome cadastrado/i);
  for (let repeticao = 0; repeticao < 20; repeticao++) {
    for (const nomes of [["6A", "6B", "7C", "8A"], ["6A", "6B", "6C", "3A", "3B"], ["6A", "7A", "8A", "9A", "1A", "2A", "3A", "3B"]]) {
      const jogos = planejarChaveMataMata(criar(nomes), 1)[0].jogos;
      assert.equal(jogos.flatMap((jogo) => [jogo.participanteA, jogo.participanteB]).filter(Boolean).length, nomes.length);
      for (const jogo of jogos) if (jogo.participanteA && jogo.participanteB) {
        assert.ok(Math.abs(anoEscolarTurma(jogo.participanteA.nomeCadastrado) - anoEscolarTurma(jogo.participanteB.nomeCadastrado)) <= 1);
      }
    }
  }
  const muitos = Array.from({ length: 128 }, (_, i) => ({ id: i + 1, nome: `${[6, 7, 8, 9, 1, 2, 3][i % 7]}${String.fromCharCode(65 + Math.floor(i / 7))}`, posicaoInicial: i + 1 }));
  const jogos = planejarChaveMataMata(muitos, 1)[0].jogos;
  assert.equal(jogos.length, 64);
  assert.equal(new Set(jogos.flatMap((jogo) => [jogo.participanteA.id, jogo.participanteB.id])).size, 128);
  assert.ok(jogos.every((jogo) => Math.abs(anoEscolarTurma(jogo.participanteA.nome) - anoEscolarTurma(jogo.participanteB.nome)) <= 1));
});

// verifica todas as quantidades aceitas, incluindo folgas em rodadas posteriores
test("cada rodada tem só a folga necessária e todos os caminhos chegam à final", async () => {
  const { planejarChaveMataMata } = await importarDominio("chave");
  for (let quantidade = 2; quantidade <= 128; quantidade++) {
    const participantes = Array.from({ length: quantidade }, (_, indice) => ({ id: indice + 1, nome: `1${String.fromCharCode(65 + indice % 26)}`, posicaoInicial: indice + 1 }));
    const fases = planejarChaveMataMata(participantes);
    const preenchidos = new Map();
    const destinos = new Set();
    let turmasNaRodada = quantidade;
    let jogosDisputados = 0;
    fases.forEach((fase, indiceFase) => {
      const folgas = indiceFase === 0 ? fase.jogos.filter((jogo) => jogo.vencedorAutomatico).length : fases.slice(0, indiceFase).flatMap((anterior) => anterior.jogos).filter((jogo) => jogo.proximaFaseOrdem > fase.ordem).length;
      assert.equal(folgas, turmasNaRodada % 2, `${quantidade} turmas, fase ${fase.ordem}`);
      assert.equal(fase.jogos.length, indiceFase === 0 ? Math.ceil(turmasNaRodada / 2) : Math.floor(turmasNaRodada / 2));
      fase.jogos.forEach((jogo) => {
        const chave = `${fase.ordem}:${jogo.ordem}`;
        const turmaA = jogo.participanteA?.id ?? preenchidos.get(`${chave}:a`);
        const turmaB = jogo.participanteB?.id ?? preenchidos.get(`${chave}:b`);
        assert.ok(turmaA, `o jogo ${chave} precisa ter uma turma`);
        if (!jogo.vencedorAutomatico) { assert.ok(turmaB); assert.notEqual(turmaA, turmaB); jogosDisputados++; }
        if (jogo.proximaFaseOrdem !== null) {
          assert.ok(jogo.proximaFaseOrdem > fase.ordem);
          const destino = `${jogo.proximaFaseOrdem}:${jogo.proximaPartidaOrdem}:${jogo.proximaPosicao}`;
          assert.ok(!destinos.has(destino), "cada vaga recebe apenas um vencedor");
          destinos.add(destino);
          preenchidos.set(destino, turmaA);
        } else assert.equal(fase, fases.at(-1));
      });
      turmasNaRodada = Math.ceil(turmasNaRodada / 2);
    });
    assert.equal(jogosDisputados, quantidade - 1);
    assert.equal(turmasNaRodada, 1);
  }
});

// confere se os grupos distantes ficam separados até a final
test("séries distantes só se encontram na final quando há grupos completos", async () => {
  const { planejarChaveMataMata } = await importarDominio("chave");
  // também cobre grupos ímpares que precisam de folgas em fases diferentes
  for (const nomes of [["6A", "6B", "6C", "6D", "3A", "3B", "3C", "3D"], ["6A", "6B", "6C", "3A", "3B", "3C", "3D", "3E", "3F"]]) {
    const fases = planejarChaveMataMata(nomes.map((nome, indice) => ({ id: indice + 1, nome, posicaoInicial: indice })), 1);
    const series = new Map();
    for (const fase of fases) for (const jogo of fase.jogos) {
      const chave = `${fase.ordem}:${jogo.ordem}`;
      const origens = [...(series.get(`${chave}:a`) ?? [jogo.participanteA?.nome[0]]), ...(series.get(`${chave}:b`) ?? [jogo.participanteB?.nome[0]])].filter(Boolean);
      assert.equal(new Set(origens).size, fase === fases.at(-1) ? 2 : 1);
      if (jogo.proximaFaseOrdem) series.set(`${jogo.proximaFaseOrdem}:${jogo.proximaPartidaOrdem}:${jogo.proximaPosicao}`, origens);
    }
  }
});

test("a chave alinha fases às partidas de origem, inclusive vínculos personalizados", async () => {
  const { posicionarChave } = await importarDominio("interclasse-utilitarios");
  const a = { id: 1, proximaPartidaId: 3 };
  const b = { id: 2, proximaPartidaId: 3 };
  const final = { id: 3, proximaPartidaId: null };
  const desenho = posicionarChave([{ jogos: [a, b] }, { jogos: [final] }]);
  assert.equal(desenho.posicoes.get(final).y, (desenho.posicoes.get(a).y + desenho.posicoes.get(b).y) / 2);
  assert.ok(desenho.posicoes.get(final).x > desenho.posicoes.get(a).x);
  assert.ok(desenho.altura >= desenho.posicoes.get(b).y + desenho.alturaJogo);
  // confere a centralização e os caminhos em todas as quantidades aceitas
  for (let quantidade = 2; quantidade <= 128; quantidade++) {
    const { planejarChaveMataMata } = await importarDominio("chave");
    const fases = planejarChaveMataMata(Array.from({ length: quantidade }, (_, i) => ({ id: i + 1, nome: `${i}`, posicaoInicial: i + 1 })));
    let id = 1;
    const colunas = fases.map((fase) => ({ jogos: fase.jogos.map(() => ({ id: id++, proximaPartidaId: null })) }));
    colunas.forEach((fase, indice) => fase.jogos.forEach((jogo, ordem) => { const origem = fases[indice].jogos[ordem]; jogo.proximaPartidaId = origem.proximaFaseOrdem === null ? null : colunas[origem.proximaFaseOrdem - 1].jogos[origem.proximaPartidaOrdem - 1].id; jogo.proximaPosicao = origem.proximaPosicao; }));
    const original = structuredClone(colunas);
    const desenho = posicionarChave(colunas);
    assert.deepEqual(colunas, original, "organizar a tela não pode alterar os confrontos cadastrados");
    for (const fase of colunas) {
      const linhas = fase.jogos.map((jogo) => desenho.posicoes.get(jogo).y).sort((a, b) => a - b);
      for (let i = 1; i < linhas.length; i++) assert.ok(linhas[i] - linhas[i - 1] > desenho.alturaJogo, "cartões não podem se sobrepor");
      for (const destino of fase.jogos) {
        const origens = colunas.flatMap((coluna) => coluna.jogos).filter((jogo) => jogo.proximaPartidaId === destino.id).map((jogo) => desenho.posicoes.get(jogo).y);
        if (origens.length) assert.equal(desenho.posicoes.get(destino).y, (Math.min(...origens) + Math.max(...origens)) / 2);
      }
    }
    // as linhas das folgas não podem atravessar outros cartões
    for (const conexao of desenho.conexoes) {
      for (let i = 1; i < conexao.pontos.length; i++) {
        const inicio = conexao.pontos[i - 1];
        const fim = conexao.pontos[i];
        for (const [jogo, ponto] of desenho.posicoes) {
          if (jogo === conexao.origem || jogo === conexao.destino) continue;
          const cruza = inicio.y === fim.y
            ? inicio.y > ponto.y && inicio.y < ponto.y + desenho.alturaJogo && Math.max(inicio.x, fim.x) > ponto.x && Math.min(inicio.x, fim.x) < ponto.x + desenho.larguraJogo
            : inicio.x > ponto.x && inicio.x < ponto.x + desenho.larguraJogo && Math.max(inicio.y, fim.y) > ponto.y && Math.min(inicio.y, fim.y) < ponto.y + desenho.alturaJogo;
          assert.equal(cruza, false, `${quantidade} turmas: uma linha não pode passar por dentro de outro jogo`);
        }
      }
    }
  }
});

// a ordem de cadastro não pode separar os jogos da mesma família
test("organiza vínculos cruzados e folgas em grupos próximos", async () => {
  const { posicionarChave } = await importarDominio("interclasse-utilitarios");
  const jogos = [
    { id: 1, proximaPartidaId: 5, proximaPosicao: "a" },
    { id: 2, proximaPartidaId: 6, proximaPosicao: "a" },
    { id: 3, proximaPartidaId: 5, proximaPosicao: "b" },
    { id: 4, proximaPartidaId: 7, proximaPosicao: "b" },
  ];
  const a = { id: 5, proximaPartidaId: 6, proximaPosicao: "b" };
  const b = { id: 6, proximaPartidaId: 7, proximaPosicao: "a" };
  const final = { id: 7 };
  const fases = [{ jogos }, { jogos: [a] }, { jogos: [b] }, { jogos: [final] }];
  const desenho = posicionarChave(fases);
  const linha = (jogo) => desenho.posicoes.get(jogo).y;
  assert.ok(linha(jogos[0]) < linha(jogos[2]));
  assert.ok(linha(jogos[1]) < linha(jogos[0]));
  assert.ok(linha(jogos[3]) > linha(jogos[2]));
  assert.equal(linha(a), (linha(jogos[0]) + linha(jogos[2])) / 2);
  assert.equal(linha(b), (linha(a) + linha(jogos[1])) / 2);
  const invertido = posicionarChave(fases.map((fase) => ({ jogos: [...fase.jogos].reverse() })));
  for (const jogo of [...jogos, a, b, final]) assert.deepEqual(invertido.posicoes.get(jogo), desenho.posicoes.get(jogo));
  assert.equal(desenho.conexoes.filter((conexao) => conexao.pulaFase).length, 2);
  // vínculos inválidos e jogos soltos continuam visíveis sem prender o desenho
  const soltos = [{ id: 10, proximaPartidaId: 10 }, { id: 11, proximaPartidaId: 99 }];
  const independente = posicionarChave([{ jogos: soltos }]);
  assert.equal(independente.posicoes.size, 2);
  assert.equal(independente.conexoes.length, 0);
});

test("possui as páginas públicas e navegação acessível do sistema", async () => {
  const rotas = [
    "app/eventos/page.tsx",
    "app/eventos/internos/page.tsx",
    "app/eventos/internos/[slug]/page.tsx",
    "app/eventos/interclasses/page.tsx",
    "app/eventos/interclasses/[campeonato]/page.tsx",
    "app/eventos/interclasses/[campeonato]/jogos/[jogo]/page.tsx",
    "app/eventos/reunioes/page.tsx",
    "app/eventos/reunioes/[slug]/page.tsx",
    "app/representantes/page.tsx",
  ];
  for (const rota of rotas) assert.ok((await stat(path.join(raiz, rota))).isFile(), `${rota} deve existir`);

  const [menu, chavePublica, reunioes, representantes, estilos] = await Promise.all([
    readFile("app/componentes/EstruturaPortal.tsx", "utf8"),
    readFile("app/componentes/InterclassesPublicos.tsx", "utf8"),
    readFile("app/componentes/ReunioesPublicas.tsx", "utf8"),
    readFile("app/componentes/RepresentantesPublicos.tsx", "utf8"),
    readFile("app/eventos.css", "utf8"),
  ]);

  assert.match(menu, /nome:\s*["']Eventos["']/);
  for (const item of ["Visão geral", "Eventos internos", "Interclasses", "Reuniões e atas", "Representantes"]) {
    assert.ok(menu.includes(item), `${item} deve estar na navegação`);
  }
  assert.match(menu, /onPointerEnter=/);
  assert.match(menu, /pointerType\s*===\s*["']mouse["']/);
  assert.match(menu, /onFocus=/);
  assert.match(menu, /onClick=/);
  assert.match(menu, /evento\.key\s*===\s*["']Escape["']/);
  assert.match(menu, /aria-expanded=/);
  assert.match(menu, /aria-controls=/);

  assert.match(chavePublica, /aria-label=/);
  assert.match(chavePublica, /avanç/i);
  assert.match(reunioes, /guia=/);
  assert.match(reunioes, /presenças/i);
  assert.match(representantes, /Ver tabela completa de representantes/i);
  assert.match(representantes, /<th/);
  assert.match(estilos, /@media\s*\(max-width:/);
  assert.match(estilos, /overflow-x:\s*auto/);
  assert.match(estilos, /:focus-visible/);
});

test("as coleções públicas priorizam conteúdo antes do arquivo de filtros", async () => {
  const [eventos, interclasses, reunioes, estilos] = await Promise.all([
    readFile("app/componentes/EventosInternosPublicos.tsx", "utf8"),
    readFile("app/componentes/InterclassesPublicos.tsx", "utf8"),
    readFile("app/componentes/ReunioesPublicas.tsx", "utf8"),
    readFile("app/eventos.css", "utf8"),
  ]);

  for (const [fonte, secoes, acao] of [
    [eventos, ["Acontecendo agora", "Próximos eventos", "Eventos recentes"], "Procurar outro evento"],
    [interclasses, ["Interclasses acontecendo agora", "Próximos interclasses", "Últimos resultados", "Campeonatos encerrados"], "Procurar campeonato"],
    [reunioes, ["Últimas reuniões", "Próximas reuniões", "Reuniões internas do GECEP"], "Procurar reunião ou ata"],
  ]) {
    for (const secao of secoes) assert.ok(fonte.includes(secao), `${secao} deve ser exibida.`);
    assert.ok(fonte.includes(acao), `${acao} deve abrir o arquivo da coleção.`);
    assert.ok(fonte.indexOf(secoes.at(-1)) < fonte.indexOf("filtros-eventos"), "As seções de conteúdo devem aparecer antes dos filtros.");
    assert.match(fonte, /aria-expanded=/);
    assert.match(fonte, /limite=3/);
  }
  assert.match(estilos, /arquivo-colecao/);
  assert.match(estilos, /cartao-resultado-recente/);
});

test("migração aditiva mantém schema relacional, histórico e privacidade", async () => {
  const [migracao, schema, inicializador, dadosIniciais] = await Promise.all([
    readFile("drizzle/0004_sistema_eventos.sql", "utf8"),
    readFile("db/schema.ts", "utf8"),
    readFile("db/estrutura-eventos.ts", "utf8"),
    readFile("app/conteudo/dados-iniciais.ts", "utf8"),
  ]);
  const tabelas = [
    "eventos_internos",
    "documentos_eventos",
    "campeonatos",
    "participantes_campeonato",
    "fases_campeonato",
    "partidas",
    "historico_resultados_partida",
    "campeoes_campeonato",
    "representantes",
    "reunioes",
    "itens_reuniao",
    "votacoes_reuniao",
    "opcoes_votacao_reuniao",
    "documentos_reuniao",
    "presencas_reuniao",
  ];

  for (const tabela of tabelas) {
    assert.match(migracao, new RegExp(`CREATE TABLE [\\\"\`]${tabela}[\\\"\`]`));
    assert.ok(inicializador.includes(`\`${tabela}\``), `${tabela} deve existir também no inicializador`);
  }
  assert.doesNotMatch(migracao, /\bDROP\s+(?:TABLE|COLUMN|INDEX)\b/i);
  assert.doesNotMatch(migracao, /\bDELETE\s+FROM\b/i);
  assert.match(migracao, /historico_resultados_partida/);
  assert.match(migracao, /nome_snapshot/);
  assert.match(migracao, /ON DELETE restrict/i);
  assert.match(schema, /observacoesInternas/);
  assert.match(schema, /observacaoInterna/);
  assert.match(dadosIniciais, /eventosIniciais[^=]*=\s*\[\s*\]/s);
});

async function importarDominio(nome) {
  const url = new URL(`../app/eventos/${nome}.ts`, import.meta.url);
  url.searchParams.set("teste", `${nome}-${Date.now()}-${Math.random()}`);
  return import(url.href);
}

// confirma que o diário não perdeu migrações anteriores e registra a próxima ordem
test("diário de migrações preserva 0003 e acrescenta 0004", async () => {
  const diario = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  const snapshotAnterior = JSON.parse(await readFile("drizzle/meta/0002_snapshot.json", "utf8"));
  const snapshotEventos = JSON.parse(await readFile("drizzle/meta/0004_snapshot.json", "utf8"));
  const nomes = diario.entries.map((entrada) => entrada.tag);
  assert.ok(nomes.includes("0003_reclassificar_mapa_2026"));
  assert.ok(nomes.includes("0004_sistema_eventos"));
  assert.equal(new Set(nomes).size, nomes.length);

  // evita que um arquivo SQL seja esquecido fora do diário
  const migracoes = (await readdir("drizzle")).filter((nome) => /^\d{4}_.+\.sql$/.test(nome));
  for (const arquivo of migracoes) assert.ok(nomes.includes(arquivo.slice(0, -4)), `${arquivo} deve constar no diário`);
  assert.equal(snapshotEventos.prevId, snapshotAnterior.id, "a migração de dados 0003 não deve criar um snapshot falso");
  assert.ok(Object.keys(snapshotEventos.tables).length >= 24, "o snapshot 0004 deve registrar todo o schema relacional");
});

test("protege as APIs administrativas e uploads de rascunho por construção", async () => {
  const rotas = [
    "app/api/eventos/route.ts",
    "app/api/eventos/[id]/route.ts",
    "app/api/interclasses/route.ts",
    "app/api/interclasses/[id]/route.ts",
    "app/api/interclasses/[id]/partidas/route.ts",
    "app/api/interclasses/[id]/jogos/[jogo]/route.ts",
    "app/api/reunioes/route.ts",
    "app/api/reunioes/[id]/route.ts",
    "app/api/representantes/route.ts",
    "app/api/representantes/[id]/route.ts",
  ];
  for (const rota of rotas) assert.ok((await stat(path.join(raiz, rota))).isFile(), `${rota} deve existir`);

  const [apoio, painelEventos, rotaEventos, arquivos] = await Promise.all([
    readFile("app/api/eventos/apoio.ts", "utf8"),
    readFile("app/componentes/PainelEventosInternos.tsx", "utf8"),
    readFile("app/api/eventos/route.ts", "utf8"),
    readFile("app/api/arquivos/[chave]/route.ts", "utf8"),
  ]);
  assert.match(apoio, /exigirAdministradorApi/);
  assert.match(apoio, /origemValida/);
  assert.match(painelEventos, /enviarArquivoPainel\(arquivo,\s*["']privada["']\)/);
  assert.match(rotaEventos, /sincronizarArquivosDoEvento/);
  assert.match(arquivos, /visibilidade\s*===\s*["']privada["']/);
  assert.match(arquivos, /private, no-store/);
});
