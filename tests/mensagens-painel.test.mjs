// confere os filtros e a preservação das mensagens em um banco isolado
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";

test("mensagens começam pelas novas e podem ser filtradas sem permitir exclusão", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    const preparar = (sql, valores = []) => ({
      bind: (...recebidos) => preparar(sql, recebidos),
      async first(coluna) { const linha = sqlite.prepare(sql).get(...valores) ?? null; return coluna ? linha?.[coluna] : linha; },
      async all() { return { results: sqlite.prepare(sql).all(...valores), success: true }; },
      async run() { const resultado = sqlite.prepare(sql).run(...valores); return { success: true, meta: { changes: resultado.changes, last_row_id: Number(resultado.lastInsertRowid) } }; },
    });
    const d1 = { prepare: preparar, async batch(comandos) {
      sqlite.exec("SAVEPOINT lote");
      try { const resultados = []; for (const comando of comandos) resultados.push(await comando.all()); sqlite.exec("RELEASE lote"); return resultados; }
      catch (erro) { sqlite.exec("ROLLBACK TO lote; RELEASE lote"); throw erro; }
    } };
    const { default: worker } = await import(`../dist/server/index.js?mensagens=${Date.now()}`);
    const ambiente = { DB: d1, ADMIN_LOGIN: "admin", ADMIN_PASSWORD: "senha.admin*2026.teste", SESSION_SECRET: "segredo exclusivo do teste isolado de mensagens", ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
    const cookies = new Map();
    async function chamar(caminho, { method = "GET", corpo, formulario, esperado = 200, autenticado = true } = {}) {
      const headers = { origin: "http://localhost", cookie: autenticado ? [...cookies].map(([nome, valor]) => `${nome}=${valor}`).join("; ") : "" };
      if (corpo) headers["content-type"] = "application/json";
      if (formulario) headers["content-type"] = "application/x-www-form-urlencoded";
      const resposta = await worker.fetch(new Request(`http://localhost${caminho}`, { method, headers, body: formulario ? new URLSearchParams(formulario) : corpo ? JSON.stringify(corpo) : undefined }), ambiente, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(resposta.status, esperado, `${method} ${caminho}: ${resposta.status === esperado ? "" : await resposta.clone().text()}`);
      for (const cookie of resposta.headers.getSetCookie()) { const [nome, ...valor] = cookie.split(";")[0].split("="); cookies.set(nome, valor.join("=")); }
      return resposta;
    }
    await chamar("/api/login", { method: "POST", formulario: { login: "admin", senha: ambiente.ADMIN_PASSWORD, geral: "1", returnTo: "/painel" }, esperado: 303 });
    for (const status of ["nova", "em_analise", "respondida", "arquivada"]) for (let indice = 1; indice <= 7; indice += 1) {
      sqlite.prepare("INSERT INTO mensagens (nome,turma,assunto,titulo,mensagem,status,criado_em,anonimo,tipo_contato,contato) VALUES (?,?,?,?,?,?,?,?,?,?)").run("Pessoa fictícia", "2DS", "Teste", `${status} ${indice}`, `Texto completo da mensagem ${status} ${indice}\ncom outra linha`, status, "2026-11-06 12:00:00", indice === 1 ? 1 : 0, "email", "ficticio@example.test");
    }

    // o painel abre pela primeira aba permitida e a api mantém o filtro de novas
    const html = await (await chamar("/painel")).text();
    assert.match(html, /<h1[^>]*>Notícias<\/h1>/);
    assert.match(html, />Mensagens recebidas<\/button>/);
    assert.doesNotMatch(html, /id="busca-protocolo"/);
    const inicio = await (await chamar("/api/mensagens")).json();
    assert.equal(inicio.total, 7);
    assert.equal(inicio.mensagens.length, 6);
    assert.equal(inicio.totalPaginas, 2);
    assert.ok(inicio.mensagens.every((item) => item.status === "nova"));
    for (const status of ["nova", "em_analise", "respondida", "arquivada"]) {
      const lista = await (await chamar(`/api/mensagens?status=${status}`)).json();
      assert.equal(lista.total, 7);
      assert.ok(lista.mensagens.every((item) => item.status === status));
      const segunda = await (await chamar(`/api/mensagens?status=${status}&pagina=2`)).json();
      assert.equal(segunda.mensagens.length, 1);
      assert.ok(segunda.mensagens.every((item) => item.status === status));
      assert.equal(segunda.mensagens[0].anonimo, true);
      for (const campo of ["nome", "turma", "tipoContato", "contato"]) assert.equal(segunda.mensagens[0][campo], "");
    }
    assert.equal((await (await chamar("/api/mensagens?status=todas")).json()).total, 28);
    assert.equal((await (await chamar("/api/mensagens?arquivadas=1")).json()).total, 7);
    await chamar("/api/mensagens?status=inventado", { esperado: 400 });

    // o protocolo encontra a participação completa em qualquer etapa escolhida
    const mensagem = inicio.mensagens[0];
    const busca = await (await chamar(`/api/mensagens?status=todas&busca=${mensagem.protocolo}`)).json();
    assert.equal(busca.total, 1);
    assert.equal(busca.mensagens[0].mensagem, mensagem.mensagem);
    await chamar("/api/mensagens", { method: "PUT", corpo: { id: mensagem.id, status: "em_analise" } });
    assert.equal((await (await chamar(`/api/mensagens?busca=${mensagem.protocolo}`)).json()).total, 0);
    assert.equal((await (await chamar(`/api/mensagens?status=em_analise&busca=${mensagem.protocolo}`)).json()).total, 1);
    await chamar("/api/mensagens", { method: "PUT", corpo: { id: mensagem.id, status: "arquivada" } });

    // nem a administração consegue apagar um envio já arquivado
    const tentativa = await chamar(`/api/mensagens?id=${mensagem.id}`, { method: "DELETE", esperado: 405 });
    assert.equal(tentativa.headers.get("allow"), "GET, POST, PUT");
    assert.match((await tentativa.json()).erro, /não podem ser apagadas/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM mensagens").get().total, 28);
    assert.equal(sqlite.prepare("SELECT status FROM mensagens WHERE id=?").get(mensagem.id).status, "arquivada");
    await chamar("/api/mensagens?id=1", { method: "DELETE", autenticado: false, esperado: 401 });
  } finally { sqlite.close(); }
});
