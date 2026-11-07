// verifica atas, integrantes e anexos em um banco isolado do site em desenvolvimento
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";

test("as atas preservam os membros da equipe e salvam seus anexos sem publicações incompletas", async () => {
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
    const { default: worker } = await import(`../dist/server/index.js?reunioes-equipe=${Date.now()}`);
    const senha = "senha.admin*2026.teste";
    const ambiente = { DB: d1, BUCKET: bucket, ADMIN_LOGIN: "admin", ADMIN_PASSWORD: senha, SESSION_SECRET: "segredo exclusivo das atas e presenças em teste", ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
    const jar = new Map();
    async function chamar(caminho, { method = "GET", corpo, formulario, arquivo, esperado = 200, autenticado = true, cookies = jar } = {}) {
      const headers = { origin: "http://localhost", ...(autenticado ? { cookie: [...cookies].map(([nome, valor]) => `${nome}=${valor}`).join("; ") } : {}) };
      if (corpo) headers["content-type"] = "application/json";
      if (formulario) headers["content-type"] = "application/x-www-form-urlencoded";
      const resposta = await worker.fetch(new Request(`http://localhost${caminho}`, { method, headers, body: arquivo || (formulario ? new URLSearchParams(formulario) : corpo ? JSON.stringify(corpo) : undefined) }), ambiente, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(resposta.status, esperado, `${method} ${caminho}: ${resposta.status === esperado ? "" : await resposta.clone().text()}`);
      for (const cookie of resposta.headers.getSetCookie()) { const [nome, ...valor] = cookie.split(";")[0].split("="); cookies.set(nome, valor.join("=")); }
      return resposta;
    }
    await chamar("/api/login", { method: "POST", formulario: { login: "admin", senha, geral: "1", returnTo: "/painel" }, esperado: 303 });
    const total = (tabela) => sqlite.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get().total;
    async function membro(nome, cargoChave, vaga, publicado = true) {
      return (await (await chamar("/api/conteudo", { method: "POST", esperado: 201, corpo: { tipo: "membros", publicado, dados: { nome, cargoChave, vaga, turno: "manha", diretoria: "Equipe fictícia", turma: "1A", biografia: "Integrante do teste isolado", fotoUrl: "", contato: "" } } })).json()).item;
    }
    const diretorUm = await membro("Nome original da diretoria 1", "esportes", "diretor-1");
    const diretorDois = await membro("Nome original da diretoria 2", "esportes", "diretor-2");
    const pessoaPrivada = await membro("Nome ainda privado", "presidente", "titular", false);
    const presenca = (item) => ({ membroId: item.id, cargoChave: item.dados.cargoChave, vaga: item.dados.vaga });
    const dados = {
      titulo: "Ata completa do teste isolado", slug: "ata-completa-teste-isolado", tipo: "interna_gecep", data: "2026-11-06",
      horarioInicial: "09:00", horarioFinal: "10:30", local: "Sala fictícia de reuniões", turno: "manha", niveisEnsino: ["fundamental", "medio"],
      descricaoCurta: "Descrição curta preservada", responsaveis: "Responsáveis preservados", pauta: "Pauta pública preservada", pautaInterna: "Pauta interna preservada",
      discussoes: "Assuntos discutidos preservados", resumo: "Resumo público preservado", decisoes: "Decisões preservadas", propostas: "Propostas preservadas",
      encaminhamentos: "Encaminhamentos preservados", ata: "Ata completa preservada", transcricao: "Transcrição preservada", observacoesPublicas: "Observações públicas preservadas",
      observacoesInternas: "Observações internas preservadas", situacao: "encerrada", publicado: true, quantidadeParticipantesPublicada: true,
    };

    // nenhuma ata é criada quando um integrante ainda não existe ou não está publicado
    const antes = total("reunioes");
    for (const membroInvalido of [{ membroId: 999999, cargoChave: "esportes", vaga: "diretor-1" }, presenca(pessoaPrivada)]) {
      const resposta = await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { dados: { ...dados, membrosGecepPresentes: [membroInvalido] } } });
      assert.match((await resposta.json()).erro, /Equipe/);
      assert.equal(total("reunioes"), antes);
    }

    // o servidor usa os dois nomes da equipe e ignora nomes enviados pelo navegador
    const criada = (await (await chamar("/api/reunioes", { method: "POST", esperado: 201, corpo: { dados: { ...dados, membrosGecepPresentes: [{ ...presenca(diretorUm), nome: "Nome adulterado", cargo: "Cargo adulterado" }, presenca(diretorDois)] } } })).json()).item;
    assert.deepEqual(criada.membrosGecepPresentes.map((item) => item.nome), ["Nome original da diretoria 1", "Nome original da diretoria 2"]);
    assert.equal(criada.membrosGecepPresentes[0].cargo.includes("Esporte"), true);
    const completa = (await (await chamar(`/api/reunioes/${criada.id}?todos=1`)).json()).item;
    for (const [campo, valor] of Object.entries(dados)) assert.deepEqual(completa[campo], valor, `o campo antigo ${campo} deve ser preservado`);
    const publica = await (await chamar(`/api/reunioes/${criada.slug}`, { autenticado: false })).json();
    assert.deepEqual(publica.item.membrosGecepPresentes.map((item) => item.nome), criada.membrosGecepPresentes.map((item) => item.nome));
    assert.equal("pautaInterna" in publica.item, false);
    assert.equal("observacoesInternas" in publica.item, false);

    // alterações e exclusões da equipe não reescrevem uma ata que já foi publicada
    await chamar("/api/conteudo", { method: "PUT", corpo: { id: diretorUm.id, tipo: "membros", publicado: true, dados: { ...diretorUm.dados, nome: "Nome da nova gestão" } } });
    await chamar(`/api/conteudo?id=${diretorDois.id}`, { method: "DELETE" });
    await chamar("/api/reunioes", { method: "PUT", corpo: { id: criada.id, dados: { resumo: "Somente o resumo foi revisado" } } });
    const historica = (await (await chamar(`/api/reunioes/${criada.id}?todos=1`)).json()).item;
    assert.deepEqual(historica.membrosGecepPresentes.map((item) => item.nome), ["Nome original da diretoria 1", "Nome original da diretoria 2"]);
    assert.deepEqual(historica.membrosGecepPresentes.map((item) => item.vaga), ["diretor-1", "diretor-2"]);

    // um rascunho precisa rever o integrante retirado da equipe antes de publicar
    const apoio = await membro("Apoio antes da publicação", "apoio", "apoio");
    const rascunho = (await (await chamar("/api/reunioes", { method: "POST", esperado: 201, corpo: { dados: { ...dados, titulo: "Ata em preparo", slug: "ata-em-preparo", publicado: false, membrosGecepPresentes: [presenca(apoio)] } } })).json()).item;
    await chamar(`/api/conteudo?id=${apoio.id}`, { method: "DELETE" });
    await chamar("/api/reunioes", { method: "PUT", esperado: 400, corpo: { id: rascunho.id, dados: { publicado: true } } });
    assert.equal(sqlite.prepare("SELECT publicado FROM reunioes WHERE id = ?").get(rascunho.id).publicado, 0);
    const antesDuplicar = total("reunioes");
    await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { acao: "duplicar", id: criada.id } });
    assert.equal(total("reunioes"), antesDuplicar);

    // cada upload entra na biblioteca ainda privado antes de ser ligado à ata
    async function enviar(nome) {
      const formulario = new FormData(); formulario.set("arquivo", new File([`conteúdo fictício de ${nome}`], nome, { type: "text/plain" }));
      const upload = await (await chamar("/api/arquivos", { method: "POST", arquivo: formulario, esperado: 201 })).json();
      const biblioteca = await (await chamar("/api/arquivos")).json();
      assert.equal(biblioteca.itens.some((item) => item.chave === upload.chave && item.publico === false), true);
      await chamar(upload.url, { autenticado: false, esperado: 401 });
      return upload;
    }
    const direto = await enviar("anexo-enviado-na-ata.txt");
    const biblioteca = await enviar("anexo-escolhido-na-biblioteca.txt");
    const documento = (arquivo, publicado = true) => ({ titulo: arquivo.nome, tipo: "anexo", descricao: "Anexo fictício", arquivoUrl: arquivo.url, linkExterno: "", data: "2026-11-06", ordem: 1, publicado });

    // uma falha em qualquer documento cancela o cadastro inteiro e a edição inteira
    const quantidades = { reunioes: total("reunioes"), documentos: total("documentos_reuniao") };
    await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { dados: { ...dados, titulo: "Ata com anexo inválido", slug: "ata-anexo-invalido", documentosNovos: [documento(direto), { titulo: "Sem arquivo" }] } } });
    assert.equal(total("reunioes"), quantidades.reunioes);
    assert.equal(total("documentos_reuniao"), quantidades.documentos);
    await chamar("/api/reunioes", { method: "PUT", esperado: 400, corpo: { id: criada.id, dados: { resumo: "Não pode ser salvo", documentosNovos: [documento(direto), { titulo: "Sem arquivo" }] } } });
    assert.equal(sqlite.prepare("SELECT resumo FROM reunioes WHERE id = ?").get(criada.id).resumo, "Somente o resumo foi revisado");
    assert.equal(total("documentos_reuniao"), quantidades.documentos);

    // um endereço sem objeto no armazenamento também impede qualquer gravação
    const inexistente = { ...documento(direto), titulo: "Arquivo que não existe", arquivoUrl: "/api/arquivos/inexistente.txt" };
    await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { dados: { ...dados, titulo: "Ata com arquivo inexistente", slug: "ata-arquivo-inexistente", documentosNovos: [documento(direto), inexistente] } } });
    assert.equal(total("reunioes"), quantidades.reunioes);
    assert.equal(total("documentos_reuniao"), quantidades.documentos);
    await chamar("/api/reunioes", { method: "PUT", esperado: 400, corpo: { id: criada.id, dados: { resumo: "Não pode salvar arquivo inexistente", documentosNovos: [documento(direto), inexistente] } } });
    assert.equal(sqlite.prepare("SELECT resumo FROM reunioes WHERE id = ?").get(criada.id).resumo, "Somente o resumo foi revisado");
    assert.equal(total("documentos_reuniao"), quantidades.documentos);

    // o formulário de anexos também precisa conferir o arquivo antes de gravar
    await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { entidade: "documentos", reuniaoId: criada.id, dados: inexistente } });
    assert.equal(total("documentos_reuniao"), quantidades.documentos);
    const anexoIndividual = (await (await chamar("/api/reunioes", { method: "POST", esperado: 201, corpo: { entidade: "documentos", reuniaoId: criada.id, dados: documento(direto, false) } })).json()).item;
    await chamar("/api/reunioes", { method: "PUT", corpo: { entidade: "documentos", id: anexoIndividual.id, dados: { titulo: "Título revisado sem trocar o arquivo" } } });
    const anexoAntes = sqlite.prepare("SELECT * FROM documentos_reuniao WHERE id = ?").get(anexoIndividual.id);
    assert.equal(anexoAntes.arquivo_url, direto.url);
    assert.equal(anexoAntes.titulo, "Título revisado sem trocar o arquivo");
    await chamar("/api/reunioes", { method: "PUT", esperado: 400, corpo: { entidade: "documentos", id: anexoIndividual.id, dados: { ...inexistente, titulo: "Não pode substituir o anexo anterior" } } });
    assert.deepEqual(sqlite.prepare("SELECT * FROM documentos_reuniao WHERE id = ?").get(anexoIndividual.id), anexoAntes);

    // o nome alternativo da chave recebe as mesmas verificações antes de salvar
    const chaveInexistente = { ...documento(direto), arquivoUrl: "https://example.com/anexo", chave: "arquivo-inexistente-pelo-alias.txt" };
    const antesAlias = total("documentos_reuniao");
    await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { entidade: "documentos", reuniaoId: criada.id, dados: chaveInexistente } });
    assert.equal(total("documentos_reuniao"), antesAlias);
    await chamar("/api/reunioes", { method: "POST", esperado: 400, corpo: { dados: { ...dados, titulo: "Ata com chave inválida", slug: "ata-chave-invalida", documentosNovos: [chaveInexistente] } } });
    assert.equal(total("reunioes"), quantidades.reunioes);
    assert.equal(total("documentos_reuniao"), antesAlias);

    // o mesmo vínculo permite usar um arquivo recém enviado ou escolhido da biblioteca
    const comAnexos = (await (await chamar("/api/reunioes", { method: "POST", esperado: 201, corpo: { dados: { ...dados, titulo: "Ata com anexos", slug: "ata-com-anexos", documentosNovos: [documento(direto), documento(biblioteca)] } } })).json()).item;
    const detalheAnexos = await (await chamar(`/api/reunioes/${comAnexos.slug}`, { autenticado: false })).json();
    assert.deepEqual(detalheAnexos.documentos.map((item) => item.arquivoUrl), [direto.url, biblioteca.url]);
    await chamar(direto.url, { autenticado: false });
    await chamar(biblioteca.url, { autenticado: false });
    const listaPublicada = (await (await chamar("/api/arquivos")).json()).itens;
    for (const arquivo of [direto, biblioteca]) assert.equal(listaPublicada.find((item) => item.chave === arquivo.chave).publico, true);

    // anexar ao rascunho não libera o arquivo para os visitantes
    const privado = await enviar("anexo-de-rascunho.txt");
    const ataPrivada = (await (await chamar("/api/reunioes", { method: "POST", esperado: 201, corpo: { dados: { ...dados, titulo: "Ata privada com anexo", slug: "ata-privada-anexo", publicado: false, documentosNovos: [documento(privado)] } } })).json()).item;
    await chamar(`/api/reunioes/${ataPrivada.slug}`, { autenticado: false, esperado: 404 });
    await chamar(privado.url, { autenticado: false, esperado: 401 });
    assert.equal((await (await chamar("/api/arquivos")).json()).itens.find((item) => item.chave === privado.chave).publico, false);
    await chamar(`/api/reunioes?id=${comAnexos.id}`, { method: "DELETE" });
    for (const arquivo of [direto, biblioteca]) await chamar(arquivo.url, { autenticado: false, esperado: 401 });

    // uma diretoria não pode usar o nome alternativo da chave para publicar arquivos de outra área
    const credencialEsportes = await (await chamar("/api/acessos", { method: "POST", esperado: 201, corpo: { cargo: "esportes", login: "esportesatas", nome: "Diretoria fictícia de esportes", senhaAtual: senha, confirmado: true } })).json();
    await chamar("/api/cargos", { method: "PUT", corpo: { cargo: "esportes", editar: ["reunioes", "arquivos"], consultar: [], senhaAtual: senha, confirmado: true } });
    const cookiesEsportes = new Map();
    await chamar("/api/login", { method: "POST", esperado: 303, cookies: cookiesEsportes, formulario: { login: credencialEsportes.login, senha: credencialEsportes.senha, geral: "0", returnTo: "/painel" } });
    const ataEsportes = (await (await chamar("/api/reunioes", { method: "POST", esperado: 201, cookies: cookiesEsportes, corpo: { dados: { ...dados, titulo: "Ata própria de esportes", slug: "ata-propria-esportes" } } })).json()).item;
    assert.equal(ataEsportes.areaResponsavel, "esportes");
    const chaveSocial = "arquivo-privado-da-diretoria-social.txt";
    await bucket.put(chaveSocial, new TextEncoder().encode("arquivo privado de outra diretoria"), { httpMetadata: { contentType: "text/plain" }, customMetadata: { areaResponsavel: "social", visibilidade: "privada", nome: "Arquivo social privado" } });
    const documentoOutraArea = { titulo: "Não pode publicar este arquivo", tipo: "anexo", arquivoUrl: "https://example.com/endereco-externo", chave: chaveSocial, publicado: true };
    const antesArquivoOutraArea = { reunioes: total("reunioes"), documentos: total("documentos_reuniao") };
    const negadoIndividual = await chamar("/api/reunioes", { method: "POST", esperado: 403, cookies: cookiesEsportes, corpo: { entidade: "documentos", reuniaoId: ataEsportes.id, dados: documentoOutraArea } });
    assert.match((await negadoIndividual.json()).erro, /privado de outra área/);
    const negadoPublicacao = await chamar("/api/reunioes", { method: "POST", esperado: 403, cookies: cookiesEsportes, corpo: { dados: { ...dados, titulo: "Ata que não pode usar arquivo social", slug: "ata-arquivo-social-negado", documentosNovos: [documentoOutraArea] } } });
    assert.match((await negadoPublicacao.json()).erro, /privado de outra área/);
    assert.deepEqual({ reunioes: total("reunioes"), documentos: total("documentos_reuniao") }, antesArquivoOutraArea);
    assert.equal(objetos.get(chaveSocial).customMetadata.visibilidade, "privada");
    assert.equal(sqlite.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  } finally { sqlite.close(); }
});
