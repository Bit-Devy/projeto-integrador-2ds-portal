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
  assert.deepEqual(fases.map((fase) => fase.jogos.length), [4, 2, 1]);
  assert.equal(fases[0].jogos.filter((jogo) => jogo.vencedorAutomatico).length, 2);
  assert.ok(fases[0].jogos.every((jogo) => jogo.proximaFaseOrdem === 2));
  assert.equal(fases.at(-1).jogos[0].proximaPartidaOrdem, null);

  assert.doesNotThrow(() => validarLigacaoPartida(1, 2, "a"));
  assert.throws(() => validarLigacaoPartida(1, 1, "a"), /ela mesma/i);
  assert.throws(() => validarLigacaoPartida(1, 2, "c"), /posição A ou B/i);
  assert.throws(
    () => planejarChaveMataMata([participantes[0]]),
    /pelo menos dois/i,
  );
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

test("documentação cobre os fluxos administrativos e operacionais", async () => {
  const arquivos = [
    "docs/eventos.md",
    "docs/interclasses.md",
    "docs/reunioes-e-atas.md",
    "docs/representantes.md",
  ];
  const texto = (await Promise.all(arquivos.map((arquivo) => readFile(arquivo, "utf8")))).join("\n");
  for (const assunto of [
    "Como cadastrar um evento",
    "Como criar um interclasse",
    "Gerar uma chave",
    "Registrar um resultado",
    "Corrigir um resultado",
    "Como criar uma reunião",
    "Como registrar presenças",
    "Como publicar uma ata",
    "Como adicionar uma votação",
    "Como cadastrar um representante",
    "Como trocar o representante",
    "npm run db:migrate:local",
    "npm run test:local",
  ]) {
    assert.match(texto, new RegExp(escaparExpressao(assunto), "i"), `a documentação deve explicar: ${assunto}`);
  }
});

async function importarDominio(nome) {
  const url = new URL(`../app/eventos/${nome}.ts`, import.meta.url);
  url.searchParams.set("teste", `${nome}-${Date.now()}-${Math.random()}`);
  return import(url.href);
}

function escaparExpressao(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
