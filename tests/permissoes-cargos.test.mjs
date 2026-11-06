// verifica as permissões reais em um banco isolado sem alterar o desenvolvimento
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import { cargosPainel, obterCargo } from "../app/lib/cargos.ts";

test("a administração gerencia cargos sem transferir seus privilégios e a consulta não permite mudanças", async () => {
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
    const objetos = new Map();
    const bucket = {
      async put(chave, bytes, metadados) { objetos.set(chave, { bytes: new Uint8Array(bytes), ...metadados }); },
      async get(chave) { const item = objetos.get(chave); return item ? { ...item, body: item.bytes, httpEtag: "teste", arrayBuffer: async () => item.bytes.buffer, writeHttpMetadata(headers) { headers.set("content-type", item.httpMetadata?.contentType || "text/plain"); } } : null; },
      async list() { return { objects: [...objetos].map(([key, item]) => ({ key, size: item.bytes.length, uploaded: new Date(), ...item })), truncated: false }; },
      async delete(chave) { objetos.delete(chave); },
    };
    const { default: worker } = await import(`../dist/server/index.js?permissoes=${Date.now()}`);
    const senhaAdmin = "senha.admin*2026.teste";
    const ambiente = { DB: d1, BUCKET: bucket, ADMIN_LOGIN: "admin", ADMIN_PASSWORD: senhaAdmin, SESSION_SECRET: "segredo exclusivo dos testes de permissões de cargos", ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
    async function chamar(caminho, { jar = new Map(), method = "GET", corpo, formulario, arquivo, esperado = 200 } = {}) {
      const headers = { origin: "http://localhost", cookie: [...jar].map(([nome, valor]) => `${nome}=${valor}`).join("; ") };
      if (corpo) headers["content-type"] = "application/json";
      if (formulario) headers["content-type"] = "application/x-www-form-urlencoded";
      const resposta = await worker.fetch(new Request(`http://localhost${caminho}`, { method, headers, body: arquivo || (formulario ? new URLSearchParams(formulario) : corpo ? JSON.stringify(corpo) : undefined) }), ambiente, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(resposta.status, esperado, `${method} ${caminho}: ${resposta.status === esperado ? "" : await resposta.clone().text()}`);
      for (const cookie of resposta.headers.getSetCookie()) { const [nome, ...valor] = cookie.split(";")[0].split("="); jar.set(nome, valor.join("=")); }
      return resposta;
    }
    async function entrar(login, senha, geral = false) {
      const jar = new Map();
      const resposta = await chamar("/api/login", { jar, method: "POST", formulario: { login, senha, geral: geral ? "1" : "0", returnTo: "/painel" }, esperado: 303 });
      return { jar, destino: resposta.headers.get("location") };
    }
    const admin = (await entrar("admin", senhaAdmin, true)).jar;
    const editar = (cargo, dados = {}, esperado = 200, jar = admin) => chamar("/api/cargos", { jar, method: "PUT", corpo: { cargo, editar: [], consultar: [], senhaAtual: senhaAdmin, confirmado: true, ...dados }, esperado });
    async function criarAcesso(cargo, login) {
      return (await chamar("/api/acessos", { jar: admin, method: "POST", corpo: { cargo, login, nome: `Pessoa fictícia ${login}`, senhaAtual: senhaAdmin, confirmado: true }, esperado: 201 })).json();
    }
    const apoio = await criarAcesso("apoio", "apoioteste");
    const leitor = (await entrar(apoio.login, apoio.senha)).jar;
    const cadastro = await (await chamar("/api/cargos", { jar: admin })).json();
    assert.equal(cadastro.itens.some((item) => item.chave === "representante"), false);
    assert.equal(cargosPainel.some((item) => item.chave === "representante"), false);
    assert.equal(cadastro.menus.some((item) => item.chave === "geral"), false);
    for (const cargo of ["geral", "presidente", "vice-presidente"]) assert.equal(cadastro.itens.find((item) => item.chave === cargo).protegido, true);
    await chamar("/api/cargos", { esperado: 401 });
    await chamar("/api/cargos", { jar: leitor, esperado: 403 });
    await editar("apoio", {}, 403, leitor);
    await editar("apoio", { confirmado: false }, 400);
    await editar("apoio", { senhaAtual: "senha.incorreta*2026" }, 403);
    for (const cargo of ["geral", "presidente", "vice-presidente"]) {
      await editar(cargo, {}, 403);
      await editar(cargo, { restaurar: true }, 403);
    }
    for (const cargo of ["representante", "inventado"]) await editar(cargo, {}, 400);
    for (const recurso of ["geral", "acessos", "cargos", "historico-acessos", "inventado"]) await editar("apoio", { editar: [recurso] }, 400);
    await editar("apoio", { editar: ["noticias", "noticias"] }, 400);
    await editar("apoio", { editar: ["noticias"], consultar: ["noticias"] }, 400);
    await editar("apoio", { editar: "noticias" }, 400);
    await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: leitor, esperado: 403 });

    // a mesma sessão recebe a permissão nova sem precisar conhecer uma senha diferente
    await editar("apoio", { editar: ["noticias"] });
    const noticia = { tipo: "noticias", dados: { titulo: "Rascunho exclusivo da consulta", categoria: "Aviso", resumo: "Resumo fictício da verificação de cargos", data: "2026-11-06", areaResponsavel: "geral" }, publicado: false };
    const rascunho = (await (await chamar("/api/conteudo", { jar: leitor, method: "POST", corpo: noticia, esperado: 201 })).json()).item;
    const publicada = (await (await chamar("/api/conteudo", { jar: admin, method: "POST", corpo: { ...noticia, dados: { ...noticia.dados, titulo: "Notícia arquivada da consulta" }, publicado: true }, esperado: 201 })).json()).item;
    await chamar("/api/conteudo", { jar: admin, method: "PUT", corpo: { tipo: "noticias", id: publicada.id, dados: publicada.dados, publicado: false } });
    const evento = (await (await chamar("/api/eventos", { jar: admin, method: "POST", corpo: { dados: { titulo: "Evento arquivado da consulta", categoria: "Social", dataInicial: "2026-11-06", publicado: false } }, esperado: 201 })).json()).item;
    await chamar(`/api/eventos?id=${evento.id}`, { jar: admin, method: "DELETE" });
    const arquivoForm = new FormData(); arquivoForm.set("arquivo", new File(["arquivo privado fictício"], "consulta.txt", { type: "text/plain" }));
    const arquivo = await (await chamar("/api/arquivos", { jar: admin, method: "POST", arquivo: arquivoForm, esperado: 201 })).json();
    sqlite.prepare("INSERT INTO mensagens (nome,turma,assunto,titulo,mensagem,status) VALUES ('Pessoa fictícia','2DS','Teste','Mensagem arquivada da consulta','Conteúdo fictício','arquivada')").run();

    // a consulta enxerga os registros internos mas não consegue gravar nem por chamadas diretas
    await editar("apoio", { consultar: cadastro.menus.map((item) => item.chave) });
    for (const tipo of ["projetos", "membros", "movimentos", "documentos", "canais"]) await chamar(`/api/conteudo?tipo=${tipo}&todos=1`, { jar: leitor });
    for (const recurso of ["interclasses", "reunioes", "representantes"]) {
      await chamar(`/api/${recurso}?todos=1`, { jar: leitor });
      await chamar(`/api/${recurso}`, { jar: leitor, method: "POST", corpo: { dados: {} }, esperado: 403 });
    }
    await chamar("/api/documentos-oficiais", { jar: leitor });
    await chamar("/api/documentos-oficiais", { jar: leitor, method: "PUT", corpo: {}, esperado: 403 });
    const leitura = await (await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: leitor })).json();
    assert.ok(leitura.itens.some((item) => item.id === rascunho.id));
    assert.ok(leitura.itens.some((item) => item.id === publicada.id && !item.publicado && item.dados.jaPublicada));
    const arquivadas = await (await chamar("/api/conteudo?tipo=noticias&todos=1&visao=arquivadas&ano=2026", { jar: leitor })).json();
    assert.ok(arquivadas.itens.some((item) => item.id === publicada.id));
    // a consulta paginada mantém os rascunhos das páginas seguintes disponíveis
    const inserirRascunho = sqlite.prepare("INSERT INTO conteudos (tipo,titulo,dados_json,publicado) VALUES ('noticias',?,?,0)");
    for (let indice = 0; indice < 22; indice++) inserirRascunho.run(`Rascunho paginado ${indice}`, JSON.stringify({ ...noticia.dados, titulo: `Rascunho paginado ${indice}`, jaPublicada: false }));
    const primeiraPagina = await (await chamar("/api/conteudo?tipo=noticias&todos=1&visao=rascunhos&ano=2026&pagina=1", { jar: leitor })).json();
    const segundaPagina = await (await chamar("/api/conteudo?tipo=noticias&todos=1&visao=rascunhos&ano=2026&pagina=2", { jar: leitor })).json();
    assert.equal(primeiraPagina.itens.length, 20);
    assert.ok(segundaPagina.itens.length > 0);
    assert.ok(!segundaPagina.itens.some((item) => primeiraPagina.itens.some((anterior) => anterior.id === item.id)));
    const eventos = await (await chamar("/api/eventos?todos=1&situacao=arquivado", { jar: leitor })).json();
    assert.ok(eventos.itens.some((item) => item.id === evento.id));
    await chamar(`/api/eventos/${evento.id}?todos=1`, { jar: leitor });
    const mensagens = await (await chamar("/api/mensagens?arquivadas=1", { jar: leitor })).json();
    assert.ok(mensagens.mensagens.some((item) => item.titulo === "Mensagem arquivada da consulta"));
    await chamar("/api/arquivos", { jar: leitor }); await chamar(arquivo.url, { jar: leitor });
    await chamar("/api/mapa?todos=1&secao=turmas", { jar: leitor });
    await chamar("/api/mapa?todos=1&secao=locais", { jar: leitor });
    await chamar("/api/conteudo", { jar: leitor, method: "POST", corpo: noticia, esperado: 403 });
    await chamar("/api/conteudo", { jar: leitor, method: "PUT", corpo: { ...noticia, id: rascunho.id }, esperado: 403 });
    await chamar(`/api/conteudo?id=${rascunho.id}`, { jar: leitor, method: "DELETE", esperado: 403 });
    for (const method of ["POST", "PUT", "DELETE"]) await chamar(`/api/eventos${method === "DELETE" ? `?id=${evento.id}` : ""}`, { jar: leitor, method, corpo: method === "DELETE" ? undefined : { id: evento.id, dados: {} }, esperado: 403 });
    await chamar("/api/arquivos", { jar: leitor, method: "POST", arquivo: arquivoForm, esperado: 403 });
    await chamar(arquivo.url, { jar: leitor, method: "PUT", corpo: {}, esperado: 403 });
    await chamar(arquivo.url, { jar: leitor, method: "DELETE", esperado: 403 });
    await chamar("/api/mensagens", { jar: leitor, method: "PUT", corpo: { id: 1, status: "respondida" }, esperado: 403 });
    await chamar("/api/mensagens?id=1", { jar: leitor, method: "DELETE", esperado: 403 });
    await chamar("/api/mapa", { jar: leitor, method: "POST", corpo: { entidade: "turmas", dados: {} }, esperado: 403 });

    // turmas e salas podem ter permissões de edição diferentes
    await editar("apoio", { editar: ["mapa"], consultar: ["turmas"] });
    const sala = (await (await chamar("/api/mapa", { jar: leitor, method: "POST", corpo: { entidade: "locais", dados: { nome: "Sala do teste de permissões", tipo: "sala_aula", ala: "Par", publicado: false } }, esperado: 201 })).json()).item;
    await chamar("/api/mapa", { jar: leitor, method: "POST", corpo: { entidade: "turmas", dados: {} }, esperado: 403 });
    await editar("apoio", { editar: ["turmas"] });
    const paginaTurmas = await (await chamar("/painel", { jar: leitor })).text();
    const menuTurmas = paginaTurmas.match(/<nav aria-label="Seções do painel">([\s\S]*?)<\/nav>/)?.[1] || "";
    assert.match(menuTurmas, />Turmas</);
    assert.doesNotMatch(menuTurmas, />Notícias</);
    assert.match(paginaTurmas, /<h1[^>]*>Turmas<\/h1>/);
    await chamar("/api/mapa?todos=1", { jar: leitor });
    await chamar("/api/mapa?todos=1&secao=locais", { jar: leitor, esperado: 403 });
    await chamar("/api/mapa?todos=1&secao=turmas", { jar: leitor });
    await chamar("/api/mapa", { jar: leitor, method: "PUT", corpo: { entidade: "locais", id: sala.id, dados: sala }, esperado: 403 });
    await chamar("/api/mapa", { jar: leitor, method: "POST", corpo: { entidade: "turmas", dados: { nome: "Turma do teste de permissões", tipo: "aula_regular", turno: "manha", nivelEnsino: "medio", publicado: false } }, esperado: 201 });
    await chamar("/api/acessos", { jar: leitor, esperado: 403 });
    await chamar("/api/historico-acessos", { jar: leitor, esperado: 403 });

    // um cargo com somente documentos abre as publicações e não a biblioteca bloqueada
    await editar("apoio", { consultar: ["documentos"] });
    const paginaDocumentos = await (await chamar("/painel", { jar: leitor })).text();
    const abasDocumentos = paginaDocumentos.match(/<div class="abas-documentos"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
    assert.match(abasDocumentos, />Publicações</);
    assert.doesNotMatch(abasDocumentos, />Arquivos</);
    assert.match(paginaDocumentos, /<h1[^>]*>Documentos<\/h1>/);

    // restaurar o padrão devolve exatamente os acessos previstos para o cargo
    await editar("apoio", { restaurar: true });
    const restaurado = (await (await chamar("/api/cargos", { jar: admin })).json()).itens.find((item) => item.chave === "apoio");
    assert.equal(restaurado.personalizado, false);
    assert.deepEqual(restaurado.editar, obterCargo("apoio").editar);
    assert.deepEqual(restaurado.consultar, obterCargo("apoio").consultar);
    await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: leitor, esperado: 403 });

    // dados adulterados nunca concedem a administração ou retiram as proteções fixas
    sqlite.prepare("INSERT OR REPLACE INTO permissoes_cargos (cargo,editar_json,consultar_json) VALUES ('apoio','[\"geral\"]','[]')").run();
    for (const caminho of ["/api/cargos", "/api/acessos", "/api/historico-acessos"]) await chamar(caminho, { jar: leitor, esperado: 403 });
    for (const cargo of ["geral", "presidente", "vice-presidente"]) sqlite.prepare("INSERT OR REPLACE INTO permissoes_cargos (cargo,editar_json,consultar_json) VALUES (?,'[]','[]')").run(cargo);
    await chamar("/api/cargos", { jar: admin });
    for (const [cargo, login] of [["presidente", "presidenciateste"], ["vice-presidente", "viceteste"]]) {
      const acesso = await criarAcesso(cargo, login);
      const protegido = (await entrar(acesso.login, acesso.senha)).jar;
      await chamar("/api/conteudo", { jar: protegido, method: "POST", corpo: noticia, esperado: 201 });
      await chamar("/api/cargos", { jar: protegido, esperado: 403 });
    }

    // o cargo removido não aparece nem consegue usar uma senha ou sessão antiga
    const legado = await criarAcesso("apoio", "legadoteste");
    const jarLegado = (await entrar(legado.login, legado.senha)).jar;
    sqlite.prepare("UPDATE acessos_painel SET cargo = 'representante' WHERE id = ?").run(legado.id);
    assert.match((await entrar(legado.login, legado.senha)).destino, /erro=1/);
    await chamar("/api/conteudo?tipo=noticias&todos=1", { jar: jarLegado, esperado: 401 });
    const senhas = await (await chamar("/api/acessos", { jar: admin })).json();
    assert.equal(senhas.itens.some((item) => item.id === legado.id), false);
    await chamar("/api/acessos", { jar: admin, method: "POST", corpo: { cargo: "representante", login: "representanteteste", nome: "Cargo removido", senhaAtual: senhaAdmin, confirmado: true }, esperado: 400 });
  } finally { sqlite.close(); }
});
