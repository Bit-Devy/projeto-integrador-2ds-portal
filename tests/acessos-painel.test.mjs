// verifica o servidor real com um banco isolado e senhas usadas apenas neste teste
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import { cargosPainel, podeAcessar, areaRestrita, obterCargo, areasPainel } from "../app/lib/cargos.ts";
import { prepararSenha, conferirSenha } from "../app/lib/senhas-painel.ts";
import { ambienteDaRequisicao } from "../worker/ambiente.ts";

test("os cargos do estatuto separam edição, consulta e administração de senhas", () => {
  assert.equal(cargosPainel.filter((cargo) => /^Art\. (4[6-9]|5[0-8])$/.test(cargo.artigo)).length, 13);
  for (const cargo of cargosPainel) assert.equal(podeAcessar(cargo.chave, "geral", true), cargo.chave === "geral");
  assert.equal(podeAcessar("esportes", "interclasses", true), true);
  assert.equal(podeAcessar("esportes", "noticias", true), true);
  assert.equal(podeAcessar("comunicacao", "noticias", true), true);
  assert.equal(podeAcessar("esportes", "movimentos", true), false);
  assert.equal(podeAcessar("conselho-fiscal-manha", "movimentos"), true);
  assert.equal(podeAcessar("conselho-fiscal-manha", "movimentos", true), false);
  assert.equal(areaRestrita("esportes"), "esportes");
  assert.equal(areaRestrita("comunicacao"), null);
  assert.equal(podeAcessar("cargo-inventado", "noticias"), false);
  for (const cargo of ["professor-conselheiro", "suplente", "vice-representante", "coe-fiscal"]) {
    assert.equal(obterCargo(cargo), undefined);
    assert.equal(podeAcessar(cargo, "noticias"), false);
  }
  assert.ok(areasPainel.some((area) => area.chave === "colegio"));
});

test("as senhas usam sal diferente e não ficam recuperáveis no banco", async () => {
  await ambienteDaRequisicao.run({ SESSION_SECRET: "segredo isolado do teste de hashes" }, async () => {
    const a = await prepararSenha("senha isolada de teste");
    const b = await prepararSenha("senha isolada de teste");
    assert.notEqual(a.sal, b.sal); assert.notEqual(a.resumo, b.resumo);
    assert.equal(a.busca, b.busca);
    assert.equal(await conferirSenha("senha isolada de teste", a), true);
    assert.equal(await conferirSenha("outra senha", a), false);
  });
});

test("o painel protege os cargos, as vagas e as sessões em todo o ciclo de senhas", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    const preparar = (sql, valores = []) => ({
      bind: (...recebidos) => preparar(sql, recebidos),
      async first(coluna) { const linha = sqlite.prepare(sql).get(...valores) ?? null; return coluna ? linha?.[coluna] : linha; },
      async all() { const results = sqlite.prepare(sql).all(...valores); return { results, success: true, meta: { changes: sqlite.prepare("SELECT changes() AS total").get().total } }; },
      async run() { const resultado = sqlite.prepare(sql).run(...valores); return { success: true, meta: { changes: resultado.changes, last_row_id: Number(resultado.lastInsertRowid) } }; },
    });
    const d1 = { prepare: preparar, async batch(comandos) { sqlite.exec("SAVEPOINT lote"); try { const resultado = []; for (const comando of comandos) resultado.push(await comando.all()); sqlite.exec("RELEASE lote"); return resultado; } catch (erro) { sqlite.exec("ROLLBACK TO lote; RELEASE lote"); throw erro; } } };
    const objetos = new Map();
    const bucket = {
      async put(chave, bytes, metadados) { objetos.set(chave, { bytes: new Uint8Array(bytes), ...metadados }); },
      async get(chave) { const item = objetos.get(chave); return item ? { ...item, body: item.bytes, httpEtag: "teste", arrayBuffer: async () => item.bytes.buffer, writeHttpMetadata(headers) { headers.set("content-type", item.httpMetadata?.contentType || "text/plain"); } } : null; },
      async list() { return { objects: [...objetos].map(([key, item]) => ({ key, size: item.bytes.length, uploaded: new Date(), ...item })), truncated: false }; },
      async delete(chave) { objetos.delete(chave); },
    };
    const { default: worker } = await import(`../dist/server/index.js?acessos=${Date.now()}`);
    const senhaInicial = "senha geral apenas do teste isolado";
    const ambiente = { DB: d1, BUCKET: bucket, ADMIN_PASSWORD: senhaInicial, SESSION_SECRET: "segredo longo exclusivo do banco de teste", ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
    async function chamar(caminho, { jar = new Map(), method = "GET", corpo, formulario, arquivo, esperado = 200 } = {}) {
      const headers = { origin: "http://localhost", cookie: [...jar].map(([chave, valor]) => `${chave}=${valor}`).join("; ") };
      if (corpo) headers["content-type"] = "application/json";
      if (formulario) headers["content-type"] = "application/x-www-form-urlencoded";
      const resposta = await worker.fetch(new Request(`http://localhost${caminho}`, { method, headers, body: arquivo || (formulario ? new URLSearchParams(formulario) : corpo ? JSON.stringify(corpo) : undefined) }), ambiente, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(resposta.status, esperado, `${method} ${caminho}`);
      for (const cookie of resposta.headers.getSetCookie()) { const [nome, ...valor] = cookie.split(";")[0].split("="); jar.set(nome, valor.join("=")); }
      return resposta;
    }
    async function entrar(senha, geral = false, jar = new Map()) { const resposta = await chamar("/api/login", { jar, method: "POST", formulario: { senha, geral: geral ? "1" : "0", returnTo: "/painel" }, esperado: 303 }); return { jar, destino: resposta.headers.get("location") }; }
    const geral = (await entrar(senhaInicial, true)).jar;
    await chamar("/api/historico-acessos", { esperado: 401 });
    const entradasIniciais = await (await chamar("/api/historico-acessos", { jar: geral })).json();
    assert.equal(entradasIniciais.total, 1);
    const entradaGeral = entradasIniciais.itens[0].id;
    assert.ok(entradasIniciais.itens[0].entradaEm);
    const outraEntrada = (await entrar(senhaInicial, true)).jar;
    const entradasRepetidas = await (await chamar("/api/historico-acessos", { jar: outraEntrada })).json();
    assert.equal(entradasRepetidas.total, 2);
    assert.notEqual(entradasRepetidas.itens[0].id, entradaGeral);
    const semAcoes = await (await chamar(`/api/historico-acessos?id=${entradasRepetidas.itens[0].id}`, { jar: geral })).json();
    assert.equal(semAcoes.total, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM acessos_painel").get().total, 1);
    assert.match((await entrar(senhaInicial)).destino, /erro=1/);
    await chamar("/api/acessos", { esperado: 401 });
    const semConfirmar = { cargo: "esportes", nome: "Teste esportes", senhaAtual: senhaInicial };
    await chamar("/api/acessos", { jar: geral, method: "POST", corpo: semConfirmar, esperado: 400 });
    await chamar("/api/acessos", { jar: geral, method: "POST", corpo: { ...semConfirmar, confirmado: true, senhaAtual: "errada" }, esperado: 403 });
    async function criar(cargo, nome = "Pessoa do teste") { return (await chamar("/api/acessos", { jar: geral, method: "POST", corpo: { cargo, nome, senhaAtual: senhaInicial, confirmado: true }, esperado: 201 })).json(); }
    const esportes1 = await criar("esportes"); const esportes2 = await criar("esportes");
    await chamar("/api/acessos", { jar: geral, method: "POST", corpo: { ...semConfirmar, confirmado: true }, esperado: 409 });
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM acessos_painel WHERE cargo='esportes'").get().total, 2);
    assert.match((await entrar(esportes1.senha, true)).destino, /erro=1/);
    const esportes = (await entrar(esportes1.senha)).jar;
    await chamar("/api/acessos", { jar: esportes, esperado: 403 });
    await chamar("/api/historico-acessos", { jar: esportes, esperado: 403 });
    await chamar(`/api/historico-acessos?id=${entradaGeral}`, { jar: esportes, esperado: 403 });
    await chamar("/api/conteudo?tipo=movimentos&todos=1", { jar: esportes, esperado: 403 });
    await chamar("/api/documentos-oficiais", { jar: esportes, method: "PUT", corpo: {}, esperado: 403 });
    await chamar("/api/mapa", { jar: esportes, method: "POST", corpo: {}, esperado: 403 });
    // o histórico recebe frases do servidor e ignora consultas e operações recusadas
    const totalAntesFalha = sqlite.prepare("SELECT COUNT(*) AS total FROM acoes_painel WHERE entrada_id = ?").get(entradaGeral).total;
    await chamar("/api/representantes", { jar: geral, method: "POST", corpo: { dados: {} }, esperado: 400 });
    await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: geral });
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM acoes_painel WHERE entrada_id = ?").get(entradaGeral).total, totalAntesFalha);
    const representanteHistorico = (await (await chamar("/api/representantes", { jar: geral, method: "POST", corpo: { dados: { nome: "Davi do teste de histórico", nivelEnsino: "Ensino Médio", serie: "3ª série", turma: "3º J", turno: "manha", funcao: "titular", inicioMandato: "2000-01-01", fimMandato: "2199-12-31", publicado: false, ativo: true } }, esperado: 201 })).json()).item;
    await chamar(`/api/representantes?id=${representanteHistorico.id}`, { jar: geral, method: "DELETE" });
    const acoesRepresentante = await (await chamar(`/api/historico-acessos?id=${entradaGeral}`, { jar: geral })).json();
    assert.ok(acoesRepresentante.acoes.some((item) => item.resumo === "Representante “Davi do teste de histórico” cadastrado"));
    assert.ok(acoesRepresentante.acoes.some((item) => item.resumo === "Representante “Davi do teste de histórico” arquivado"));
    const textoHistorico = JSON.stringify(acoesRepresentante);
    for (const segredo of [senhaInicial, esportes1.senha, esportes2.senha]) assert.equal(textoHistorico.includes(segredo), false);
    const noticia = { tipo: "noticias", dados: { titulo: "Notícia de teste", categoria: "Aviso", resumo: "Resumo", data: "2026-11-03", areaResponsavel: "social" }, publicado: true };
    const idSocial = (await (await chamar("/api/conteudo", { jar: geral, method: "POST", corpo: noticia, esperado: 201 })).json()).item.id;
    const propria = (await (await chamar("/api/conteudo", { jar: esportes, method: "POST", corpo: noticia, esperado: 201 })).json()).item;
    assert.equal(propria.dados.areaResponsavel, "esportes");
    const listaEsportes = await (await chamar("/api/conteudo?tipo=noticias&todos=1&visao=ativas&ano=2026&areaResponsavel=social", { jar: esportes })).json();
    assert.equal(listaEsportes.total, 1); assert.equal(listaEsportes.itens[0].id, propria.id);
    await chamar("/api/conteudo", { jar: esportes, method: "PUT", corpo: { ...noticia, id: idSocial }, esperado: 403 });
    await chamar(`/api/conteudo?id=${idSocial}`, { jar: esportes, method: "DELETE", corpo: { senha: esportes1.senha }, esperado: 403 });
    // a senha de outro cargo não confirma a exclusão de uma notícia
    await chamar(`/api/conteudo?id=${propria.id}`, { jar: esportes, method: "DELETE", corpo: { senha: senhaInicial }, esperado: 403 });
    await chamar(`/api/conteudo?id=${propria.id}`, { jar: esportes, method: "DELETE", corpo: { senha: esportes1.senha } });
    const evento = { dados: { titulo: "Evento social teste", categoria: "Social", dataInicial: "2026-11-03", areaResponsavel: "social" } };
    const eventoSocial = (await (await chamar("/api/eventos", { jar: geral, method: "POST", corpo: evento, esperado: 201 })).json()).item;
    const eventoEsportes = (await (await chamar("/api/eventos", { jar: esportes, method: "POST", corpo: { dados: { ...evento.dados, titulo: "Evento esportivo teste" } }, esperado: 201 })).json()).item;
    const eventos = await (await chamar("/api/eventos?todos=1&areaResponsavel=social", { jar: esportes })).json();
    assert.deepEqual(eventos.itens.map((item) => item.id), [eventoEsportes.id]);
    await chamar(`/api/eventos/${eventoSocial.id}?todos=1`, { jar: esportes, esperado: 403 });
    await chamar("/api/eventos", { jar: esportes, method: "PUT", corpo: { id: eventoSocial.id, dados: { titulo: "Tentativa bloqueada" } }, esperado: 403 });
    await chamar(`/api/eventos?id=${eventoSocial.id}`, { jar: esportes, method: "DELETE", esperado: 403 });
    const documentoEvento = (await (await chamar("/api/eventos", { jar: geral, method: "POST", corpo: { entidade: "documentos", eventoId: eventoSocial.id, dados: { titulo: "Anexo do evento", tipo: "documento", linkExterno: "https://example.org/teste.pdf" } }, esperado: 201 })).json()).item;
    await chamar(`/api/eventos?entidade=documentos&id=${documentoEvento.id}`, { jar: esportes, method: "DELETE", esperado: 403 });
    // uploads grandes continuam privados e não podem ser publicados por outra área
    const formularioArquivo = new FormData();
    formularioArquivo.set("arquivo", new File(["a".repeat(7 * 1024 * 1024)], "arquivo-grande-teste.txt", { type: "text/plain" }));
    const arquivoPrivado = await (await chamar("/api/arquivos", { jar: geral, method: "POST", arquivo: formularioArquivo, esperado: 201 })).json();
    await chamar(arquivoPrivado.url, { esperado: 401 });
    await chamar(arquivoPrivado.url, { jar: esportes, esperado: 403 });
    const bibliotecaEsportes = await (await chamar("/api/arquivos", { jar: esportes })).json();
    assert.equal(bibliotecaEsportes.itens.some((item) => item.chave === arquivoPrivado.chave), false);
    await chamar("/api/conteudo", { jar: esportes, method: "POST", corpo: { ...noticia, dados: { ...noticia.dados, imagemUrl: arquivoPrivado.url, imagemAlt: "Teste", creditoImagem: "Teste" } }, esperado: 400 });
    await chamar("/api/eventos", { jar: esportes, method: "POST", corpo: { entidade: "documentos", eventoId: eventoEsportes.id, dados: { titulo: "Tentativa de anexo", arquivoChave: arquivoPrivado.chave, tipo: "documento" } }, esperado: 403 });
    const formularioProprio = new FormData(); formularioProprio.set("arquivo", new File(["arquivo da área"], "esportes.txt", { type: "text/plain" }));
    const arquivoProprio = await (await chamar("/api/arquivos", { jar: esportes, method: "POST", arquivo: formularioProprio, esperado: 201 })).json();
    await chamar(arquivoProprio.url, { jar: esportes });
    await chamar(arquivoProprio.url, { esperado: 401 });
    await chamar("/api/eventos", { jar: esportes, method: "PUT", corpo: null, esperado: 400 });
    // as reuniões e seus anexos também respeitam a área eleitoral
    const eleitoral = await criar("coe-secretario"); const eleitoralJar = (await entrar(eleitoral.senha)).jar;
    const reuniao = { dados: { titulo: "Reunião geral teste", tipo: "interna_gecep", data: "2026-11-03" } };
    const reuniaoGeral = (await (await chamar("/api/reunioes", { jar: geral, method: "POST", corpo: reuniao, esperado: 201 })).json()).item;
    const reuniaoEleitoral = (await (await chamar("/api/reunioes", { jar: eleitoralJar, method: "POST", corpo: { dados: { ...reuniao.dados, titulo: "Reunião eleitoral teste" } }, esperado: 201 })).json()).item;
    await chamar(`/api/reunioes/${reuniaoGeral.id}?todos=1`, { jar: eleitoralJar, esperado: 403 });
    await chamar("/api/reunioes", { jar: eleitoralJar, method: "PUT", corpo: { id: reuniaoGeral.id, dados: { titulo: "Tentativa bloqueada" } }, esperado: 403 });
    const reunioesEleitorais = await (await chamar("/api/reunioes?todos=1", { jar: eleitoralJar })).json();
    assert.deepEqual(reunioesEleitorais.itens.map((item) => item.id), [reuniaoEleitoral.id]);
    const imprensa = await criar("comunicacao"); const imprensaJar = (await entrar(imprensa.senha)).jar;
    assert.ok((await (await chamar("/api/conteudo?tipo=noticias&todos=1&visao=ativas&ano=2026", { jar: imprensaJar })).json()).itens.some((item) => item.id === idSocial));
    // assuntos do colégio podem ser publicados pela gestão e acompanhados pela imprensa
    const noticiaColegio = (await (await chamar("/api/conteudo", { jar: geral, method: "POST", corpo: { ...noticia, dados: { ...noticia.dados, titulo: "Aviso do colégio", areaResponsavel: "colegio" } }, esperado: 201 })).json()).item;
    assert.equal(noticiaColegio.dados.areaResponsavel, "colegio");
    const noticiasImprensa = await (await chamar("/api/conteudo?tipo=noticias&todos=1&visao=ativas&ano=2026", { jar: imprensaJar })).json();
    assert.ok(noticiasImprensa.itens.some((item) => item.id === noticiaColegio.id));
    await chamar("/api/conteudo", { jar: esportes, method: "PUT", corpo: { ...noticia, id: noticiaColegio.id }, esperado: 403 });
    const fiscal = await criar("conselho-fiscal-manha"); const fiscalJar = (await entrar(fiscal.senha)).jar;
    await chamar("/api/conteudo?tipo=movimentos&todos=1", { jar: fiscalJar });
    await chamar("/api/conteudo", { jar: fiscalJar, method: "POST", corpo: { tipo: "movimentos", dados: { descricao: "Teste", data: "2026-11-03", tipo: "entrada", categoria: "Teste", valor: 1 } }, esperado: 403 });
    const tesouraria = await criar("primeiro-tesoureiro"); const tesourariaJar = (await entrar(tesouraria.senha)).jar;
    await chamar("/api/conteudo?tipo=movimentos&todos=1", { jar: tesourariaJar });
    const movimentoTeste = (await (await chamar("/api/conteudo", { jar: tesourariaJar, method: "POST", corpo: { tipo: "movimentos", dados: { descricao: "Teste financeiro", data: "2026-11-03", tipo: "entrada", categoria: "Teste", valor: 1 } }, esperado: 201 })).json()).item;
    await chamar(`/api/conteudo?id=${movimentoTeste.id}`, { jar: tesourariaJar, method: "DELETE" });
    const documentoSocial = (await (await chamar("/api/conteudo", { jar: geral, method: "POST", corpo: { tipo: "documentos", dados: { titulo: "Documento social de teste", categoria: "Social", tipo: "pdf", texto: "Teste", link: "https://example.org/doc.pdf", areaResponsavel: "social" } }, esperado: 201 })).json()).item;
    await chamar(`/api/conteudo?id=${documentoSocial.id}`, { jar: tesourariaJar, method: "DELETE", esperado: 403 });
    const apoio = await criar("apoio"); const apoioJar = (await entrar(apoio.senha)).jar;
    await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: apoioJar, esperado: 403 });
    await chamar("/api/conteudo?tipo=noticias", { jar: apoioJar });
    // uma troca encerra as sessões anteriores e inutiliza a senha antiga
    const novaSenha = (await (await chamar("/api/acessos", { jar: geral, method: "PUT", corpo: { id: esportes1.id, nome: "Esportes atualizado", senhaAtual: senhaInicial, confirmado: true } })).json()).senha;
    await chamar("/api/interclasses?todos=1", { jar: esportes, esperado: 401 });
    assert.match((await entrar(esportes1.senha)).destino, /erro=1/);
    const esportesNovo = (await entrar(novaSenha)).jar;
    await chamar("/api/interclasses?todos=1", { jar: esportesNovo });
    await chamar("/api/acessos", { jar: geral, method: "DELETE", corpo: { id: esportes1.id, senhaAtual: senhaInicial, confirmado: true } });
    await chamar("/api/interclasses?todos=1", { jar: esportesNovo, esperado: 401 });
    const cadastro = await (await chamar("/api/acessos", { jar: geral })).json();
    assert.ok(cadastro.historico.length > 0); assert.equal("resumo" in cadastro.itens[0], false); assert.equal("senha" in cadastro.itens[0], false);
    const principal = cadastro.itens.find((item) => item.cargo === "geral");
    await chamar("/api/acessos", { jar: geral, method: "DELETE", corpo: { id: principal.id, senhaAtual: senhaInicial, confirmado: true }, esperado: 409 });
    const geral2 = await criar("geral"); await criar("geral");
    await chamar("/api/acessos", { jar: geral, method: "POST", corpo: { cargo: "geral", nome: "Excesso", senhaAtual: senhaInicial, confirmado: true }, esperado: 409 });
    // a própria senha geral pode ser trocada sem derrubar quem fez a troca
    const segundoJar = (await entrar(geral2.senha, true)).jar;
    const antigoJar = new Map(segundoJar);
    const entradasAntesTroca = sqlite.prepare("SELECT COUNT(*) AS total FROM entradas_painel").get().total;
    const atualizada = (await (await chamar("/api/acessos", { jar: segundoJar, method: "PUT", corpo: { id: geral2.id, nome: "Geral alterado", senhaAtual: geral2.senha, novaSenha: "senha geral nova do teste", confirmado: true } })).json()).senha;
    assert.equal(atualizada, "senha geral nova do teste");
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM entradas_painel").get().total, entradasAntesTroca);
    await chamar("/api/acessos", { jar: segundoJar }); await chamar("/api/acessos", { jar: antigoJar, esperado: 401 });
    assert.match((await entrar(geral2.senha, true)).destino, /erro=1/);
    // a senha inicial não volta a funcionar depois de ser trocada
    await chamar("/api/acessos", { jar: segundoJar, method: "PUT", corpo: { id: principal.id, nome: "Principal alterado", senhaAtual: atualizada, confirmado: true } });
    assert.match((await entrar(senhaInicial, true)).destino, /erro=1/);
    // cargos retirados não podem criar acessos nem reutilizar senhas e sessões antigas
    const cargosRemovidos = ["professor-conselheiro", "suplente", "vice-representante", "coe-fiscal"];
    for (const cargo of cargosRemovidos) {
      await chamar("/api/acessos", { jar: segundoJar, method: "POST", corpo: { cargo, nome: "Cargo removido", senhaAtual: atualizada, confirmado: true }, esperado: 400 });
    }
    const legado = await criarAcessoLegado();
    const legadoJar = (await entrar(legado.senha)).jar;
    for (const cargo of cargosRemovidos) {
      sqlite.prepare("UPDATE acessos_painel SET cargo = ? WHERE id = ?").run(cargo, legado.id);
      assert.match((await entrar(legado.senha)).destino, /erro=1/);
      await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: legadoJar, esperado: 401 });
      const cadastroAtual = await (await chamar("/api/acessos", { jar: segundoJar })).json();
      assert.equal(cadastroAtual.itens.some((item) => item.id === legado.id), false);
      assert.equal(cadastroAtual.cargos.some((item) => item.chave === cargo), false);
    }
    async function criarAcessoLegado() {
      return (await chamar("/api/acessos", { jar: segundoJar, method: "POST", corpo: { cargo: "apoio", nome: "Acesso anterior de teste", senhaAtual: atualizada, confirmado: true }, esperado: 201 })).json();
    }
    // cinco tentativas erradas bloqueiam inclusive o modo geral no mesmo navegador
    const limitado = new Map();
    for (let tentativa = 0; tentativa < 5; tentativa++) await entrar("senha incorreta", tentativa % 2 === 0, limitado);
    const bloqueado = await entrar(atualizada, true, limitado);
    assert.match(bloqueado.destino, /erro=limite/);
    const estadoLimite = await (await chamar("/api/limites?acao=login", { jar: limitado })).json();
    assert.equal(estadoLimite.limite.bloqueado, true);
    // as ações continuam separadas depois de trocar ou revogar uma senha
    const historicoPreservado = await (await chamar(`/api/historico-acessos?id=${entradaGeral}`, { jar: segundoJar })).json();
    assert.ok(historicoPreservado.acoes.some((item) => item.resumo.includes("Davi do teste de histórico")));
    const paginaHistorico = await (await chamar("/api/historico-acessos", { jar: segundoJar })).json();
    assert.ok(paginaHistorico.itens.length <= 20);
    await chamar("/api/historico-acessos?id=inválido", { jar: segundoJar, esperado: 400 });
    await chamar("/api/historico-acessos?id=9999999", { jar: segundoJar, esperado: 404 });
    const buscaSemCuringa = await (await chamar("/api/historico-acessos?busca=%25", { jar: segundoJar })).json();
    assert.equal(buscaSemCuringa.total, 0);
    // a segunda vaga permanece utilizável após revogar a primeira
    assert.match((await entrar(esportes2.senha)).destino, /\/painel$/);
  } finally { sqlite.close(); }
});
