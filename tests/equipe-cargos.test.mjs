// verifica as vagas da equipe e os nomes usados nas reuniões em um banco isolado
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import { cargosPainel } from "../app/lib/cargos.ts";
import { dadosMembroEquipe, obterCargoEquipe, vagasDoCargo } from "../app/lib/equipe.ts";
import { condicaoVagaLivre } from "../app/conteudo/equipe.ts";

test("as vagas da equipe seguem o estatuto e usam somente cargos disponíveis no painel", () => {
  assert.deepEqual(vagasDoCargo("presidente").map((item) => item.chave), ["titular"]);
  assert.equal(vagasDoCargo("esportes").length, 2);
  assert.deepEqual(vagasDoCargo("conselho-fiscal-tarde").map((item) => item.chave), ["efetivo", "suplente"]);
  assert.equal(vagasDoCargo("geral").length, 3);
  assert.equal(vagasDoCargo("coe-secretario").length, 1);
  assert.equal(vagasDoCargo("apoio")[0].chave, "apoio");
  for (const cargo of cargosPainel) assert.ok(vagasDoCargo(cargo.chave).length);
  for (const chave of ["representante", "vice-representante", "professor-conselheiro", "coe-fiscal", "inventado"]) assert.deepEqual(vagasDoCargo(chave), []);
  assert.equal(obterCargoEquipe({ cargo: "Presidente" }).chave, "presidente");
  assert.equal(obterCargoEquipe({ cargoChave: "inventado", cargo: "Presidente" }), undefined);
  assert.equal(dadosMembroEquipe(1, { nome: "Pessoa anterior", cargo: "Diretoria Social" }), null);
  assert.equal(dadosMembroEquipe(1, { nome: "Pessoa anterior", cargo: "Presidente" }).vaga, "titular");
  assert.equal(dadosMembroEquipe(1, { nome: "Pessoa fiscal", cargoChave: "conselho-fiscal-tarde", vaga: "suplente", turno: "manha" }).turno, "tarde");
});

test("a gravação impede duas publicações na mesma vaga mesmo sem uma consulta anterior", () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE conteudos (id INTEGER PRIMARY KEY, tipo TEXT, titulo TEXT, dados_json TEXT, publicado INTEGER, criado_em TEXT DEFAULT '2026-01-01')");
    const inserir = sqlite.prepare(`INSERT INTO conteudos (tipo, titulo, dados_json, publicado) SELECT ?, ?, ?, ? WHERE ${condicaoVagaLivre}`);
    const dados = JSON.stringify({ ano: 2026, cargoChave: "social", vaga: "diretor-1" });
    assert.equal(inserir.run("membros", "Primeira pessoa", dados, 1, "membros", 1, dados, -1, dados, dados, dados).changes, 1);
    assert.equal(inserir.run("membros", "Segunda pessoa", dados, 1, "membros", 1, dados, -1, dados, dados, dados).changes, 0);
    assert.equal(inserir.run("membros", "Rascunho", dados, 0, "membros", 0, dados, -1, dados, dados, dados).changes, 1);
    sqlite.exec("UPDATE conteudos SET publicado = 0 WHERE id = 1");
    assert.equal(inserir.run("membros", "Substituição", dados, 1, "membros", 1, dados, -1, dados, dados, dados).changes, 1);
  } finally { sqlite.close(); }
});

test("a equipe publica por cargo e vaga e oferece apenas nomes publicados às reuniões", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    const preparar = (sql, valores = []) => ({
      bind: (...recebidos) => preparar(sql, recebidos),
      async first(coluna) { const linha = sqlite.prepare(sql).get(...valores) ?? null; return coluna ? linha?.[coluna] : linha; },
      async all() { return { results: sqlite.prepare(sql).all(...valores), success: true, meta: { changes: sqlite.prepare("SELECT changes() AS total").get().total } }; },
      async run() { const resultado = sqlite.prepare(sql).run(...valores); return { success: true, meta: { changes: resultado.changes, last_row_id: Number(resultado.lastInsertRowid) } }; },
    });
    const d1 = { prepare: preparar, async batch(comandos) {
      sqlite.exec("SAVEPOINT lote");
      try { const resultados = []; for (const comando of comandos) resultados.push(await comando.all()); sqlite.exec("RELEASE lote"); return resultados; }
      catch (erro) { sqlite.exec("ROLLBACK TO lote; RELEASE lote"); throw erro; }
    } };
    const { default: worker } = await import(`../dist/server/index.js?equipe=${Date.now()}`);
    const senha = "senha.admin*2026.teste";
    const ambiente = { DB: d1, ADMIN_LOGIN: "admin", ADMIN_PASSWORD: senha, SESSION_SECRET: "segredo exclusivo dos testes isolados da equipe", ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
    const jar = new Map();
    async function chamar(caminho, { method = "GET", corpo, formulario, esperado = 200, autenticado = true } = {}) {
      const headers = { origin: "http://localhost", ...(autenticado ? { cookie: [...jar].map(([nome, valor]) => `${nome}=${valor}`).join("; ") } : {}) };
      if (corpo) headers["content-type"] = "application/json";
      if (formulario) headers["content-type"] = "application/x-www-form-urlencoded";
      const resposta = await worker.fetch(new Request(`http://localhost${caminho}`, { method, headers, body: formulario ? new URLSearchParams(formulario) : corpo ? JSON.stringify(corpo) : undefined }), ambiente, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(resposta.status, esperado, `${method} ${caminho}: ${resposta.status === esperado ? "" : await resposta.clone().text()}`);
      for (const cookie of resposta.headers.getSetCookie()) { const [nome, ...valor] = cookie.split(";")[0].split("="); jar.set(nome, valor.join("=")); }
      return resposta;
    }
    await chamar("/api/equipe-presencas", { autenticado: false, esperado: 401 });
    await chamar("/api/login", { method: "POST", formulario: { login: "admin", senha, geral: "1", returnTo: "/painel" }, esperado: 303 });
    async function publicar(nome, cargoChave, vaga, extras = {}, esperado = 201) {
      const resposta = await chamar("/api/conteudo", { method: "POST", esperado, corpo: { tipo: "membros", publicado: true, dados: { nome, cargoChave, vaga, diretoria: "Gestão fictícia", turma: "1A", biografia: "Integrante usado somente no teste isolado", fotoUrl: "", contato: "", ...extras } } });
      return resposta.json();
    }
    const primeira = await publicar("Nome publicado 1", "esportes", "diretor-1", { turno: "manha" });
    await publicar("Nome publicado 2", "esportes", "diretor-2", { turno: "tarde" });
    await publicar("Vaga repetida", "esportes", "diretor-1", {}, 400);
    await publicar("Vaga inexistente", "esportes", "diretor-3", {}, 400);
    await publicar("Cargo removido", "representante", "titular", {}, 400);
    await publicar("Fiscal tarde", "conselho-fiscal-tarde", "efetivo", { turno: "manha" });
    await publicar("Apoio 1", "apoio", "apoio");
    await publicar("Apoio 2", "apoio", "apoio");
    const rascunho = await chamar("/api/conteudo", { method: "POST", esperado: 201, corpo: { tipo: "membros", publicado: false, dados: { nome: "Nome em rascunho", cargoChave: "esportes", vaga: "diretor-1", diretoria: "Esportes" } } });
    assert.equal((await rascunho.json()).item.publicado, false);
    let lista = (await (await chamar("/api/equipe-presencas")).json()).itens;
    assert.equal(lista.length, 5);
    assert.deepEqual(lista.filter((item) => item.cargoChave === "esportes").map((item) => item.nome), ["Nome publicado 1", "Nome publicado 2"]);
    assert.equal(lista.find((item) => item.nome === "Fiscal tarde").turno, "tarde");
    assert.equal(lista.some((item) => item.nome === "Nome em rascunho"), false);
    assert.equal(lista.some((item) => item.nome.includes("Administração geral")), false);

    // retirar alguém do público libera somente a sua própria vaga para a próxima pessoa
    await chamar("/api/conteudo", { method: "PUT", corpo: { id: primeira.item.id, tipo: "membros", publicado: false, dados: primeira.item.dados } });
    await publicar("Substituição publicada", "esportes", "diretor-1");
    await chamar("/api/conteudo", { method: "PUT", esperado: 400, corpo: { id: primeira.item.id, tipo: "membros", publicado: true, dados: primeira.item.dados } });
    lista = (await (await chamar("/api/equipe-presencas")).json()).itens;
    assert.equal(lista.some((item) => item.nome === "Nome publicado 1"), false);
    assert.equal(lista.some((item) => item.nome === "Substituição publicada"), true);
  } finally { sqlite.close(); }
});
