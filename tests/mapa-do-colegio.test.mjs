// importa as verificações dos resultados
import assert from "node:assert/strict";
// importa a leitura de arquivos e pastas
import { readFile, readdir, stat } from "node:fs/promises";
// importa o registro de carregadores
import { register } from "node:module";
// importa a montagem de caminhos
import path from "node:path";
// importa a criação dos testes
import test from "node:test";
// importa a transformação de caminhos em endereços
import { pathToFileURL } from "node:url";

// guarda a pasta principal do projeto
const raiz = process.cwd();

// resolve arquivos sem extensão durante os testes
const carregadorTypeScript = `
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
// registra o carregador temporário
register(`data:text/javascript,${encodeURIComponent(carregadorTypeScript)}`, import.meta.url);

// verifica a limpeza dos textos usados na busca
test("normaliza variações de turma, sala, acentos e espaços", async () => {
  // carrega as funções de normalização
  const { normalizarNumeroSala, normalizarSlug, normalizarTextoBusca } = await importarNormalizacao();

  // compara as diferentes formas da mesma turma
  for (const forma of ["3º J", "3° J", "3 J", "3J", "terceiro J"]) {
    assert.equal(normalizarTextoBusca(forma), "3j", `${forma} deve encontrar 3J`);
  }

  assert.equal(normalizarNumeroSala("214"), "214");
  assert.equal(normalizarNumeroSala("Sala 214"), "214");
  assert.equal(normalizarNumeroSala("  sala    214  "), "214");
  assert.equal(
    normalizarTextoBusca("  Laboratório   de   Informática  "),
    normalizarTextoBusca("laboratorio de informatica"),
  );
  assert.equal(normalizarTextoBusca("Coordenação do CELEM"), "coordenacaodocelem");
  assert.equal(normalizarSlug("Aula regular"), "aula_regular");
  assert.equal(normalizarSlug("aula_regular"), "aula_regular");
});

// verifica as alas aceitas pelo cadastro
test("restringe a ala dos locais às três opções administráveis", async () => {
  // carrega a validação dos locais
  const { validarLocalMapa } = await importarValidacao("alas-permitidas");
  const localBase = { nome: "Local de teste", tipo: "outro", ativo: true, publicado: true };

  // aceita as três alas oferecidas pelo painel
  for (const ala of ["Par", "Ímpar", "Fora do prédio"]) {
    assert.equal(validarLocalMapa({ ...localBase, ala }).ala, ala);
  }
  assert.equal(validarLocalMapa({ ...localBase, ala: "Impar" }).ala, "Ímpar");
  assert.equal(validarLocalMapa({ ...localBase, ala: "fora do predio" }).ala, "Fora do prédio");
  assert.equal(validarLocalMapa({ ...localBase, ala: "", publicado: false }).ala, "");

  // rejeita um local publicado sem ala
  assert.throws(
    () => validarLocalMapa({ ...localBase, ala: "" }),
    /ala/i,
    "um local publicado deve possuir uma das três alas",
  );

  // rejeita uma ala fora da lista
  assert.throws(
    () => validarLocalMapa({ ...localBase, ala: "Ala de teste" }),
    /ala/i,
    "a API não deve aceitar uma ala fora das opções do painel",
  );
});

// verifica as quantidades da carga do mapa
test("mantém as quantidades verificadas da carga do PDF de 2026", async () => {
  // carrega os dados usados na contagem
  const dados = await importarDadosMapa("quantidades");

  assert.equal(dados.locaisMapa2026.length, 67);
  assert.equal(dados.turmasMapa2026.length, 100);
  assert.equal(dados.ensalamentosMapa2026.length, 112);

  // conta os ensalamentos por turno
  const porTurno = contarPor(dados.ensalamentosMapa2026, (item) => item.turno);
  assert.deepEqual(porTurno, { manha: 45, tarde: 45, noite: 22 });
});

// verifica a classificação das atividades
test("classifica as turmas do PDF como aula regular e preserva somente Reforço em Outro", async () => {
  // carrega os dados usados na classificação
  const dados = await importarDadosMapa("classificacao-atualizada");

  assert.deepEqual(contarPor(dados.turmasMapa2026, (item) => item.tipo), {
    outro: 2,
    aula_regular: 95,
    idiomas: 3,
  });
  assert.deepEqual(contarPor(dados.ensalamentosMapa2026, (item) => item.tipo), {
    outro: 4,
    aula_regular: 96,
    idiomas: 12,
  });

  // encontra os nomes classificados como outro
  const nomesEmOutro = [...new Set(
    dados.turmasMapa2026
      .filter((item) => item.tipo === "outro")
      .map((item) => item.nome),
  )];
  assert.deepEqual(nomesEmOutro, ["Reforço"]);

  // confere a categoria de cada turma
  for (const turma of dados.turmasMapa2026) {
    if (turma.nome === "CELEM") {
      assert.equal(turma.tipo, "idiomas");
    } else if (turma.nome === "Reforço") {
      assert.equal(turma.tipo, "outro");
    } else {
      assert.equal(turma.tipo, "aula_regular", `${turma.nome} deve aparecer em Aula regular`);
    }
  }

  // confere turmas que precisam ser aulas regulares
  for (const nome of ["2PD", "3DS", "2TT", "4TE", "1SB", "CURCEP", "PAV"]) {
    assert.ok(
      dados.turmasMapa2026.some((item) => item.nome === nome && item.tipo === "aula_regular"),
      `${nome} deve estar disponível em Aula regular`,
    );
  }

  // confere a categoria de cada ligação
  const tiposPorTurma = new Map(dados.turmasMapa2026.map((item) => [item.chaveImportacao, item.tipo]));
  for (const ensalamento of dados.ensalamentosMapa2026) {
    assert.equal(ensalamento.tipo, tiposPorTurma.get(ensalamento.chaveTurma));
  }
});

// verifica as chaves e as ligações da carga
test("usa chaves únicas, determinísticas e relacionamentos válidos no seed", async () => {
  // cria duas cargas independentes para comparação
  const primeiraCarga = await importarDadosMapa("idempotencia-a");
  const segundaCarga = await importarDadosMapa("idempotencia-b");

  // verifica as chaves de cada grupo
  for (const [nome, itens] of [
    ["locais", primeiraCarga.locaisMapa2026],
    ["turmas", primeiraCarga.turmasMapa2026],
    ["ensalamentos", primeiraCarga.ensalamentosMapa2026],
  ]) {
    const chaves = itens.map((item) => item.chaveImportacao);
    assert.equal(new Set(chaves).size, chaves.length, `as chaves de ${nome} devem ser únicas`);
    assert.ok(chaves.every(Boolean), `todos os registros de ${nome} devem possuir chave`);
  }

  assert.deepEqual(
    extrairChaves(primeiraCarga),
    extrairChaves(segundaCarga),
    "reexecutar a carga deve produzir as mesmas chaves",
  );
  assert.match(primeiraCarga.CHAVE_CARGA_MAPA_2026, /^mapa-colegio-pdf-2026-fe7c105a-v\d+$/);

  // confirma que todas as ligações apontam para itens reais
  const chavesLocais = new Set(primeiraCarga.locaisMapa2026.map((item) => item.chaveImportacao));
  const chavesTurmas = new Set(primeiraCarga.turmasMapa2026.map((item) => item.chaveImportacao));
  for (const ensalamento of primeiraCarga.ensalamentosMapa2026) {
    assert.ok(chavesLocais.has(ensalamento.chaveLocal), `${ensalamento.chaveLocal} deve existir`);
    assert.ok(chavesTurmas.has(ensalamento.chaveTurma), `${ensalamento.chaveTurma} deve existir`);
  }

  // confirma a sala conhecida da turma 3j
  const turma3J = primeiraCarga.turmasMapa2026.find(
    (item) => item.nome === "3J" && item.turno === "manha",
  );
  assert.ok(turma3J, "3J da manhã deve existir");
  const uso3J = primeiraCarga.ensalamentosMapa2026.find(
    (item) => item.chaveTurma === turma3J.chaveImportacao,
  );
  assert.equal(uso3J?.chaveLocal, "pdf2026:local:216");
});

// verifica a página e os itens de navegação do mapa
test("possui página pública, Notícias e menu Mais acessível", async () => {
  // lê os arquivos usados pela página e pelo menu
  const [pagina, menu, estilos] = await Promise.all([
    readFile(path.join(raiz, "app/mapa-do-colegio/page.tsx"), "utf8"),
    readFile(path.join(raiz, "app/componentes/EstruturaPortal.tsx"), "utf8"),
    readFile(path.join(raiz, "app/globals.css"), "utf8"),
  ]);

  assert.match(pagina, /title:\s*["']Mapa do Colégio \| GECEP["']/);
  assert.match(pagina, /MapaColegioInterativo/);
  assert.match(menu, /nome:\s*["']Notícias["']\s*,\s*destino:\s*["']\/noticias["']/);
  assert.match(menu, /nome:\s*["']Mais["']/);
  assert.match(menu, /nome:\s*["']Mapa do Colégio["'][\s\S]*destino:\s*["']\/mapa-do-colegio["']/);
  assert.match(menu, /aria-expanded=/);
  assert.match(menu, /aria-controls=/);
  assert.match(menu, /onFocus=/);
  assert.match(estilos, /\.item-menu-tem-submenu\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:/s);
  assert.match(estilos, /\.botao-submenu\s*\{[^}]*position:\s*static/s);
  assert.doesNotMatch(estilos, /\.submenu-aberto\s*>\s*\.botao-submenu\s+span\s*\{[^}]*rotate/s);
});

// verifica a exibição dos detalhes opcionais
test("não renderiza os detalhes opcionais quando eles estão vazios", async () => {
  // carrega a renderização e a interface do mapa
  const [{ renderToStaticMarkup }, interfaceMapa] = await Promise.all([
    // importa o renderizador do react
    import("react-dom/server"),
    importarInterfaceMapa("detalhes-opcionais"),
  ]);
  const dados = dadosMapaParaInterface();
  const turma = dados.turmas[0];
  const local = dados.locais[0];
  const ensalamento = dados.ensalamentos[0];

  // monta um cartão de turma sem detalhes
  const htmlTurmaVazia = renderToStaticMarkup(interfaceMapa.CartaoResultadoTurma({
    resultado: { turma, local, ensalamento },
    categorias: dados.categorias,
  }));
  // confirma que rótulos vazios não aparecem
  for (const rotulo of [
    "Como chegar",
    "Descrição da turma ou atividade",
    "Descrição do local",
    "Observações",
    "Acessibilidade do local",
    "Funcionamento",
    "Início da validade",
    "Fim da validade",
  ]) {
    assert.ok(!htmlTurmaVazia.includes(rotulo), `${rotulo} não deve aparecer sem conteúdo`);
  }

  // monta um cartão de local sem detalhes
  const htmlLocalVazio = renderToStaticMarkup(interfaceMapa.CartaoResultadoLocal({
    resultado: { local, usos: [{ turma, ensalamento }] },
    categorias: dados.categorias,
  }));
  for (const rotulo of ["Descrição", "Como chegar", "Observações do local", "Acessibilidade", "Funcionamento"]) {
    assert.ok(!htmlLocalVazio.includes(rotulo), `${rotulo} do local não deve aparecer sem conteúdo`);
  }

  // preenche os detalhes da turma
  const turmaPreenchida = {
    ...turma,
    descricao: "Descrição confirmada da atividade.",
    observacoes: "Observação da atividade.",
    inicioValidade: "2026-01-01",
    fimValidade: "2026-12-31",
  };
  // preenche os detalhes do local
  const localPreenchido = {
    ...local,
    descricao: "Descrição confirmada do local.",
    instrucoes: "Instruções confirmadas.",
    observacoes: "Observação do local.",
    acessibilidade: "Informação de acessibilidade.",
    horario: "Informação de funcionamento.",
  };
  // preenche os detalhes da ligação
  const ensalamentoPreenchido = { ...ensalamento, observacoes: "Observação do ensalamento." };
  // monta o cartão com todos os detalhes
  const htmlPreenchido = renderToStaticMarkup(interfaceMapa.CartaoResultadoTurma({
    resultado: { turma: turmaPreenchida, local: localPreenchido, ensalamento: ensalamentoPreenchido },
    categorias: dados.categorias,
  }));
  // confirma a presença de cada detalhe
  for (const texto of [
    "Descrição confirmada da atividade.",
    "Descrição confirmada do local.",
    "Instruções confirmadas.",
    "Observação da atividade.",
    "Observação do ensalamento.",
    "Observação do local.",
    "Informação de acessibilidade.",
    "Informação de funcionamento.",
    "01/01/2026",
    "31/12/2026",
  ]) {
    assert.ok(htmlPreenchido.includes(texto), `${texto} deve aparecer quando cadastrado`);
  }
});

// verifica a pesquisa por atividades especiais
test("inclui locais especiais e Reforço na primeira pesquisa em Outro", async () => {
  // prepara os dados e os módulos da busca
  const dados = dadosMapaParaInterface();
  const [{ renderToStaticMarkup }, interfaceMapa, buscaPublica, carga] = await Promise.all([
    // importa o renderizador do react
    import("react-dom/server"),
    importarInterfaceMapa("locais-na-primeira-pesquisa"),
    importarTypeScript("app/mapa/busca-publica.ts", "buscas-especiais"),
    importarDadosMapa("locais-especiais-reais"),
  ]);
  // separa os locais que também funcionam como atividades
  const locaisEspeciaisReais = carga.locaisMapa2026.filter(buscaPublica.localPesquisavelComoAtividade);
  assert.equal(locaisEspeciaisReais.length, 18);

  // confere locais especiais conhecidos
  for (const [termo, nomeEsperado] of [
    ["laboratórios", "Laboratório de Informática"],
    ["dancep", "DANCEP"],
    ["coro", "Sala do Coro"],
    ["SRM-DI", "SRM - DI / AHSD"],
  ]) {
    assert.ok(
      buscaPublica.buscarLocaisEspeciaisComoAtividade(carga.locaisMapa2026, termo)
        .some((local) => local.nome === nomeEsperado),
      `${termo} deve encontrar ${nomeEsperado}`,
    );
  }
  assert.ok(!buscaPublica.localPesquisavelComoAtividade(dados.locais[0]), "Sala 114 não é atividade especial");

  // simula os filtros da primeira pesquisa
  globalThis.__estadosMapaColegioTeste = ["manha", "outro", "", "incompleto", []];
  try {
    const html = renderToStaticMarkup(interfaceMapa.BuscaTurma({ dados }));
    for (const opcao of [
      "Reforço",
      "Laboratório de Informática",
      "DANCEP",
      "Sala do Coro",
      "SRM - DI / AHSD",
    ]) {
      assert.ok(html.includes(opcao), `${opcao} deve estar disponível em Outro na primeira pesquisa`);
    }
  } finally {
    // remove os dados usados pela simulação
    delete globalThis.__estadosMapaColegioTeste;
  }
});

// verifica a administração e a estrutura do mapa
test("possui painel protegido, APIs com publicação e migração do mapa", async () => {
  // lê a página, o painel, a api e as migrações
  const [paginaPainel, painel, painelMapa, tiposMapa, fontesApi, bancoMapa, migracoes] = await Promise.all([
    readFile(path.join(raiz, "app/painel/page.tsx"), "utf8"),
    readFile(path.join(raiz, "app/componentes/PainelAdministrativo.tsx"), "utf8"),
    readFile(path.join(raiz, "app/componentes/PainelMapaColegio.tsx"), "utf8"),
    readFile(path.join(raiz, "app/mapa/tipos.ts"), "utf8"),
    lerFontesRecursivamente(path.join(raiz, "app/api/mapa")),
    readFile(path.join(raiz, "app/mapa/banco.ts"), "utf8"),
    lerMigracoes(),
  ]);
  // junta os pontos que consultam o mapa
  const fontesMapa = `${fontesApi}\n${bancoMapa}`;

  // confere a proteção e os controles do painel
  assert.match(paginaPainel, /exigirUsuarioPainel\(["']\/painel["']\)/);
  assert.match(painel, /Mapa e ensalamento/);
  assert.match(painelMapa, /CampoSelecao\s+chave=["']ala["']/);
  assert.match(painelMapa, /opcoes=\{alas\}/);
  for (const ala of ["Par", "Ímpar", "Fora do prédio"]) assert.ok(tiposMapa.includes(ala));

  // confere as proteções e os filtros da api
  assert.match(fontesApi, /export async function GET/);
  assert.match(fontesApi, /export async function (?:POST|PUT|DELETE)/);
  assert.match(fontesApi, /exigirAdministradorApi/);
  assert.match(fontesApi, /origemValida/);
  assert.match(fontesMapa, /publicado\s*=\s*1/);
  assert.match(fontesMapa, /ativo\s*=\s*1/);

  // confere as tabelas necessárias
  for (const tabela of ["categorias_mapa", "locais_colegio", "turmas_atividades", "ensalamentos"]) {
    assert.match(migracoes, new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?[\\\"\`]${tabela}[\\\"\`]`));
  }
  assert.match(migracoes, /CREATE UNIQUE INDEX[^;]+chave_importacao/is);
});

// carrega as funções de limpeza de texto
async function importarNormalizacao(sufixo = "normalizacao") {
  return importarTypeScript("app/mapa/normalizacao.ts", sufixo);
}

// carrega os dados iniciais do mapa
async function importarDadosMapa(sufixo) {
  return importarTypeScript("db/dados-mapa-2026.ts", sufixo);
}

// prepara e carrega a validação do mapa
async function importarValidacao(sufixo) {
  // monta os caminhos dos módulos usados
  const caminho = path.join(raiz, "app/mapa/validacao.ts");
  const normalizacao = pathToFileURL(path.join(raiz, "app/mapa/normalizacao.ts")).href;
  // troca os imports locais por endereços completos
  const fonte = (await readFile(caminho, "utf8"))
    .replace('from "./normalizacao"', `from "${normalizacao}"`)
    .replace('from "./tipos"', `from "${pathToFileURL(path.join(raiz, "app/mapa/tipos.ts")).href}"`);
  // importa o compilador de typescript
  const moduloTypeScript = await import("typescript");
  // aceita as duas formas de exportação do compilador
  const typescript = moduloTypeScript.default ?? moduloTypeScript;
  // transforma o código tipado em código comum
  const compilado = typescript.transpileModule(fonte, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  // cria um endereço único para o módulo
  const url = `data:text/javascript,${encodeURIComponent(compilado)}#${encodeURIComponent(sufixo)}`;
  // importa o módulo criado para o teste
  return import(url);
}

// prepara e carrega os cartões do mapa
async function importarInterfaceMapa(sufixo) {
  // encontra o arquivo da interface
  const caminho = path.join(raiz, "app/componentes/MapaColegioInterativo.tsx");
  // cria versões simples dos controles de estado
  const estados = `data:text/javascript,${encodeURIComponent(`
    export const FormEvent = undefined;
    export const ReactNode = undefined;
    export function useEffect() {}
    export function useMemo(calcular) { return calcular(); }
    export function useState(inicial) {
      const fila = globalThis.__estadosMapaColegioTeste;
      return [Array.isArray(fila) && fila.length ? fila.shift() : inicial, () => {}];
    }
  `)}`;
  // adapta os imports e libera os cartões para o teste
  const fonte = (await readFile(caminho, "utf8"))
    .replace('from "react"', `from "${estados}"`)
    .replace(
      'from "../mapa/busca-publica"',
      `from "${pathToFileURL(path.join(raiz, "app/mapa/busca-publica.ts")).href}"`,
    )
    .replace("function BuscaTurma(", "export function BuscaTurma(")
    .replace("function CartaoResultadoTurma(", "export function CartaoResultadoTurma(")
    .replace("function CartaoResultadoLocal(", "export function CartaoResultadoLocal(");
  // importa o compilador de typescript
  const moduloTypeScript = await import("typescript");
  // aceita as duas formas de exportação do compilador
  const typescript = moduloTypeScript.default ?? moduloTypeScript;
  // transforma a interface em código comum
  const compilado = typescript.transpileModule(fonte, {
    compilerOptions: {
      jsx: typescript.JsxEmit.ReactJSX,
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText.replace(
    // aponta a criação de elementos para o pacote instalado
    /["']react\/jsx-runtime["']/g,
    `"${pathToFileURL(path.join(raiz, "node_modules/react/jsx-runtime.js")).href}"`,
  );
  // cria um endereço único para o módulo
  const url = `data:text/javascript,${encodeURIComponent(compilado)}#${encodeURIComponent(sufixo)}`;
  // importa o módulo criado para o teste
  return import(url);
}

// cria um mapa pequeno para testar a interface
function dadosMapaParaInterface() {
  // reúne os campos comuns dos locais
  const camposLocal = {
    numero: "", nomeAlternativo: "", ala: "Par", andar: "3º andar", bloco: "", setor: "",
    corredor: "", referencia: "", descricao: "", instrucoes: "", observacoes: "",
    acessibilidade: "", horario: "", imagemUrl: "", ordem: 1, atualizadoEm: "2026-01-01 12:00:00",
  };
  // cria locais comuns e especiais
  const locais = [
    { ...camposLocal, id: 1, nome: "Sala 114", numero: "114", tipo: "sala_aula" },
    { ...camposLocal, id: 2, nome: "Laboratório de Informática", numero: "312", tipo: "laboratorio" },
    { ...camposLocal, id: 3, nome: "DANCEP", numero: "302", tipo: "outro" },
    { ...camposLocal, id: 4, nome: "Sala do Coro", numero: "328", tipo: "outro" },
    { ...camposLocal, id: 5, nome: "SRM - DI / AHSD", numero: "326", tipo: "outro" },
  ];
  // cria uma atividade de reforço
  const turma = {
    id: 10, nome: "Reforço", nomeNormalizado: "reforco", aliases: "", turno: "manha", tipo: "outro",
    curso: "", serie: "", turma: "", descricao: "", observacoes: "", inicioValidade: "",
    fimValidade: "", ordem: 1, atualizadoEm: "2026-01-01 12:00:00",
  };
  // liga a atividade a uma sala
  const ensalamento = {
    id: 20, turmaAtividadeId: 10, localId: 1, turno: "manha", tipo: "outro", observacoes: "",
    inicioValidade: "", fimValidade: "", ordem: 1, atualizadoEm: "2026-01-01 12:00:00",
  };
  // entrega os dados no formato da interface
  return {
    categorias: [
      { id: 1, grupo: "atividade", slug: "aula_regular", nome: "Aula regular", ordem: 10 },
      { id: 2, grupo: "atividade", slug: "outro", nome: "Outro", ordem: 50 },
      { id: 3, grupo: "local", slug: "sala_aula", nome: "Sala de aula", ordem: 10 },
      { id: 4, grupo: "local", slug: "laboratorio", nome: "Laboratório", ordem: 20 },
      { id: 5, grupo: "local", slug: "outro", nome: "Outro", ordem: 70 },
    ],
    locais,
    turmas: [turma],
    ensalamentos: [ensalamento],
  };
}

// importa um arquivo tipado com um endereço único
function importarTypeScript(caminho, sufixo) {
  const url = pathToFileURL(path.join(raiz, caminho));
  url.searchParams.set("teste", sufixo);
  // importa o arquivo com um endereço exclusivo
  return import(url.href);
}

// conta itens pelo valor escolhido
function contarPor(itens, obterChave) {
  // soma os itens que possuem a mesma chave
  return itens.reduce((totais, item) => {
    const chave = obterChave(item);
    totais[chave] = (totais[chave] ?? 0) + 1;
    return totais;
  }, {});
}

// separa as chaves de cada grupo
function extrairChaves(dados) {
  // separa as chaves em listas
  return {
    locais: dados.locaisMapa2026.map((item) => item.chaveImportacao),
    turmas: dados.turmasMapa2026.map((item) => item.chaveImportacao),
    ensalamentos: dados.ensalamentosMapa2026.map((item) => item.chaveImportacao),
  };
}

// lê os arquivos de código de uma pasta
async function lerFontesRecursivamente(diretorio) {
  // guarda os itens encontrados na pasta
  let entradas;
  // tenta listar o conteúdo da pasta
  try {
    entradas = await readdir(diretorio, { withFileTypes: true });
  } catch (erro) {
    // trata uma pasta que ainda não existe
    if (erro && erro.code === "ENOENT") return "";
    throw erro;
  }

  // reúne o conteúdo dos arquivos encontrados
  const partes = [];
  for (const entrada of entradas) {
    // monta o caminho de cada item
    const destino = path.join(diretorio, entrada.name);
    // entra nas subpastas ou lê arquivos de código
    if (entrada.isDirectory()) partes.push(await lerFontesRecursivamente(destino));
    else if (/\.(?:ts|tsx)$/.test(entrada.name)) partes.push(await readFile(destino, "utf8"));
  }
  return partes.join("\n");
}

// lê todas as migrações do banco
async function lerMigracoes() {
  // encontra e ordena os arquivos de migração
  const diretorio = path.join(raiz, "drizzle");
  const arquivos = (await readdir(diretorio))
    .filter((arquivo) => arquivo.endsWith(".sql"))
    .sort();
  // lê todas as migrações ao mesmo tempo
  const fontes = await Promise.all(arquivos.map((arquivo) => readFile(path.join(diretorio, arquivo), "utf8")));
  return fontes.join("\n");
}

// confirma que este arquivo de teste existe
await stat(path.join(raiz, "tests/mapa-do-colegio.test.mjs"));
