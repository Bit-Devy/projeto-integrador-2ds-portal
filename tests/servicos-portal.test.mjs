// exercita as rotas reais com banco e arquivos descartáveis
import test from "node:test";
import assert from "node:assert/strict";
import { abrirPortalMemoria } from "./apoio/portal-memoria.mjs";
import { calendarioVazio } from "../app/servicos/calendario.ts";

test("publica calendários e compromissos com destinos reais e preserva anos anteriores", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, sqlite } = portal;
  try {
    const calendarios = (await (await chamar("/api/calendario", { jar: new Map() })).json()).itens;
    assert.equal(calendarios.length, 2);
    assert.equal(
      calendarios.every((item) => item.dias.filter((dia) => dia.letivo).length === 200),
      true,
    );
    await chamar("/api/calendario?todos=1", { jar: new Map(), esperado: 401 });
    const proximo = calendarioVazio(2027, "semestral");
    proximo.dias[35] = { ...proximo.dias[35], tipo: "letivo", letivo: true };
    await chamar("/api/calendario", { method: "PUT", corpo: { calendario: proximo } });
    assert.equal(
      (await (await chamar("/api/calendario", { jar: new Map() })).json()).itens.length,
      2,
    );
    await chamar("/api/calendario", {
      method: "PUT",
      corpo: { calendario: { ...proximo, publicado: true } },
    });
    assert.equal(
      (await (await chamar("/api/calendario", { jar: new Map() })).json()).itens.length,
      3,
    );
    await chamar("/api/calendario", {
      method: "PUT",
      corpo: { calendario: { ...proximo, dias: proximo.dias.slice(1) } },
      esperado: 400,
    });
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM calendarios_escolares").get().total, 3);

    // uma partida futura já criada na chave pode ser vinculada sem inventar jogos
    sqlite.exec(
      "INSERT INTO campeonatos (slug,nome,modalidade,ano,publicado,chave_publicada) VALUES ('copa-teste','Copa de teste','futsal',2026,1,1)",
    );
    const campeonato = sqlite
      .prepare("SELECT id FROM campeonatos WHERE slug='copa-teste'")
      .get().id;
    const fase = sqlite
      .prepare(
        "INSERT INTO fases_campeonato (campeonato_id,nome,publicado) VALUES (?,'Final',1) RETURNING id",
      )
      .get(campeonato).id;
    const jogo = sqlite
      .prepare("INSERT INTO partidas (campeonato_id,fase_id,publicado) VALUES (?,?,1) RETURNING id")
      .get(campeonato, fase).id;
    const caminhoJogo = `/eventos/interclasses/copa-teste/jogos/${jogo}`;
    const paginas = (await (await chamar("/api/paginas")).json()).itens;
    assert.equal(
      paginas.some((item) => item.url === caminhoJogo),
      false,
    );
    const jogos = (
      await (await chamar(`/api/paginas?grupo=jogos&campeonato=${campeonato}&ano=2026`)).json()
    ).itens;
    assert.equal(
      jogos.some((item) => item.url === caminhoJogo),
      true,
    );
    for (const caminho of ["/calendario", "/cantina"])
      assert.equal(
        paginas.some((item) => item.url === caminho),
        true,
      );
    const dados = {
      titulo: "Final da copa",
      data: "2027-04-12",
      dataFim: "2027-04-13",
      horario: "10:30",
      modalidade: "semestral",
      descricao: "Data fictícia para testar o vínculo",
      paginaUrl: caminhoJogo,
    };
    const compromisso = (
      await (
        await chamar("/api/conteudo", {
          method: "POST",
          corpo: { tipo: "agenda", dados, publicado: true },
          esperado: 201,
        })
      ).json()
    ).item;
    for (const paginaUrl of [
      "/nao-existe",
      caminhoJogo + "999",
      "https://outro.example",
      "//outro.example",
    ])
      await chamar("/api/conteudo", {
        method: "POST",
        corpo: { tipo: "agenda", dados: { ...dados, paginaUrl }, publicado: true },
        esperado: 400,
      });
    await chamar("/api/conteudo", {
      method: "POST",
      corpo: { tipo: "agenda", dados: { ...dados, dataFim: "2027-04-01" }, publicado: true },
      esperado: 400,
    });
    sqlite.prepare("UPDATE partidas SET publicado=0 WHERE id=?").run(jogo);
    const publica = (
      await (await chamar("/api/conteudo?tipo=agenda&ano=2027", { jar: new Map() })).json()
    ).itens;
    assert.equal(publica.find((item) => item.id === compromisso.id).dados.paginaUrl, "");
    await chamar("/api/conteudo", {
      method: "PUT",
      corpo: { id: compromisso.id, tipo: "agenda", dados, publicado: true },
      esperado: 400,
    });
    await chamar("/api/conteudo", {
      method: "PUT",
      corpo: {
        id: compromisso.id,
        tipo: "agenda",
        dados: { ...dados, paginaUrl: "" },
        publicado: false,
      },
    });
    assert.equal(
      (await (await chamar("/api/conteudo?tipo=agenda&ano=2027", { jar: new Map() })).json()).itens
        .length,
      0,
    );
  } finally {
    await portal.fechar();
  }
});

test("cada chave oculta somente seu setor e protege também páginas apis e anexos", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar } = portal;
  try {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF5sAAAAASUVORK5CYII=",
      "base64",
    );
    const envio = new FormData();
    envio.set("arquivo", new File([png], "prato.png", { type: "image/png" }));
    const arquivo = await (
      await chamar("/api/arquivos", { method: "POST", arquivo: envio, esperado: 201 })
    ).json();
    for (const categoria of ["merenda", "apmf", "gecep", "robotica"])
      await chamar("/api/conteudo", {
        method: "POST",
        corpo: {
          tipo: "cardapios",
          dados: {
            titulo: "Prato fictício",
            categoria,
            data: "2026-11-09",
            dataFim: "2026-11-13",
            turno: "manha",
            descricao: "Composição fictícia",
            preco: "4,50",
            imagemUrl: categoria === "apmf" ? arquivo.url : "",
          },
          publicado: true,
        },
        esperado: 201,
      });
    await chamar(arquivo.url, { jar: new Map() });
    const modulos = (await (await chamar("/api/modulos")).json()).modulos;
    await chamar("/api/modulos", {
      method: "PUT",
      corpo: { modulos: { ...modulos, apmf: false } },
    });
    const setores = (
      await (await chamar("/api/conteudo?tipo=cardapios", { jar: new Map() })).json()
    ).itens;
    assert.equal(setores.length, 3);
    assert.equal(
      setores.some((item) => item.dados.categoria === "apmf"),
      false,
    );
    assert.equal(setores.find((item) => item.dados.categoria === "merenda").dados.preco, "");
    await chamar(arquivo.url, { jar: new Map(), esperado: 401 });
    await chamar("/api/modulos", {
      method: "PUT",
      corpo: { modulos: { ...modulos, cantina: false, calendario: false } },
    });
    for (const caminho of [
      "/cantina",
      "/calendario",
      "/api/calendario",
      "/api/conteudo?tipo=cardapios",
      "/api/conteudo?tipo=agenda",
    ])
      await chamar(caminho, { jar: new Map(), esperado: 404 });
    await chamar(arquivo.url, { jar: new Map(), esperado: 401 });
    assert.equal(
      (await (await chamar("/api/conteudo?tipo=cardapios&todos=1")).json()).itens.length,
      4,
    );
    const paginas = (await (await chamar("/api/paginas")).json()).itens;
    assert.equal(
      paginas.some((item) => ["/cantina", "/calendario"].includes(item.url)),
      false,
    );
    const html = await (await chamar("/", { jar: new Map() })).text();
    const nav = html.slice(
      html.indexOf('id="menu-principal"'),
      html.indexOf("</nav>", html.indexOf('id="menu-principal"')),
    );
    assert.doesNotMatch(nav, /href="\/(cantina|calendario)"/);
    await chamar("/api/modulos", { method: "PUT", corpo: { modulos } });
    await chamar(arquivo.url, { jar: new Map() });
    await chamar("/cantina", { jar: new Map() });
    await chamar("/calendario", { jar: new Map() });
  } finally {
    await portal.fechar();
  }
});

test("consulta de rascunhos não concede edição dos serviços e as permissões mudam na sessão", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, senhaAdmin } = portal;
  try {
    const acesso = await (
      await chamar("/api/acessos", {
        method: "POST",
        corpo: {
          cargo: "apoio",
          login: "leitorservicos",
          nome: "Leitor fictício",
          senhaAtual: senhaAdmin,
          confirmado: true,
        },
        esperado: 201,
      })
    ).json();
    const jar = new Map();
    await chamar("/api/login", {
      jar,
      method: "POST",
      formulario: { login: acesso.login, senha: acesso.senha, geral: "0" },
      esperado: 303,
    });
    const modulos = (await (await chamar("/api/modulos")).json()).modulos;
    await chamar("/api/calendario?todos=1", { jar, esperado: 403 });
    await chamar("/api/cargos", {
      method: "PUT",
      corpo: {
        cargo: "apoio",
        editar: [],
        consultar: ["calendario", "cantina", "paginas"],
        senhaAtual: senhaAdmin,
        confirmado: true,
      },
    });
    await chamar("/api/calendario?todos=1", { jar });
    for (const tipo of ["agenda", "cardapios"])
      await chamar(`/api/conteudo?tipo=${tipo}&todos=1`, { jar });
    await chamar("/api/modulos", { jar, method: "PUT", corpo: { modulos }, esperado: 403 });
    await chamar("/api/calendario", {
      jar,
      method: "PUT",
      corpo: { calendario: calendarioVazio(2028, "anual") },
      esperado: 403,
    });
    await chamar("/api/cargos", {
      method: "PUT",
      corpo: {
        cargo: "apoio",
        editar: ["calendario"],
        consultar: [],
        senhaAtual: senhaAdmin,
        confirmado: true,
      },
    });
    await chamar("/api/calendario", {
      jar,
      method: "PUT",
      corpo: { calendario: calendarioVazio(2028, "anual") },
    });
    const historico = (await (await chamar("/api/historico-acessos")).json()).itens;
    assert.ok(historico);
  } finally {
    await portal.fechar();
  }
});

// confere a retirada do setor com dados de uma instalação antiga
test("central removida não pode ser acessada ou reativada", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, sqlite, senhaAdmin } = portal;
  try {
    const dadosLegados = {
      titulo: "Registro antigo",
      arquivoUrl: "/api/arquivos/edital-antigo.txt",
    };
    const inserir = sqlite.prepare(
      "INSERT INTO conteudos (tipo, titulo, dados_json, publicado) VALUES (?, ?, ?, 1) RETURNING id",
    );
    const vaga = inserir.get("oportunidades", dadosLegados.titulo, JSON.stringify(dadosLegados));
    portal.objetos.set("edital-antigo.txt", {
      bytes: new TextEncoder().encode("Edital antigo"),
      httpMetadata: { contentType: "text/plain" },
    });
    const noticia = inserir.get(
      "noticias",
      "Notícia com atalho antigo",
      JSON.stringify({
        titulo: "Notícia com atalho antigo",
        categoria: "Avisos",
        resumo: "Texto mantido",
        data: "2026-11-15",
        botaoInternoAtivo: true,
        botaoInternoUrl: "/estagios?ano=2026",
        botaoInternoTexto: "Abrir central",
      }),
    );
    const compromisso = inserir.get(
      "agenda",
      "Compromisso com atalho antigo",
      JSON.stringify({
        titulo: "Compromisso com atalho antigo",
        data: "2026-11-15",
        paginaUrl: "/estagios",
      }),
    );
    sqlite
      .prepare("INSERT OR REPLACE INTO modulos_portal (chave, dados_json) VALUES ('paginas', ?)")
      .run(JSON.stringify({ estagios: true, cantina: false }));
    sqlite
      .prepare(
        "INSERT INTO permissoes_cargos (cargo, editar_json, consultar_json) VALUES ('apoio', ?, ?)",
      )
      .run('["estagios","noticias"]', '["calendario"]');

    const visitante = new Map();
    await chamar("/estagios", { jar: visitante, esperado: 404 });
    await chamar("/api/conteudo?tipo=oportunidades", { jar: visitante, esperado: 400 });
    await chamar("/api/conteudo?tipo=oportunidades&todos=1", { esperado: 400 });
    await chamar("/api/conteudo", {
      method: "POST",
      corpo: { tipo: "oportunidades", dados: dadosLegados },
      esperado: 400,
    });
    await chamar("/api/conteudo", {
      method: "PUT",
      corpo: { id: vaga.id, acao: "arquivar" },
      esperado: 404,
    });
    await chamar(`/api/conteudo?id=${vaga.id}`, { method: "DELETE", esperado: 404 });
    await chamar(dadosLegados.arquivoUrl, { jar: visitante, esperado: 401 });
    assert.equal(
      sqlite.prepare("SELECT publicado FROM conteudos WHERE id = ?").get(vaga.id).publicado,
      1,
    );

    const modulos = (await (await chamar("/api/modulos")).json()).modulos;
    assert.equal(Object.hasOwn(modulos, "estagios"), false);
    assert.equal(modulos.cantina, false);
    await chamar("/api/modulos", {
      method: "PUT",
      corpo: { modulos: { ...modulos, estagios: true } },
      esperado: 400,
    });
    const permissoes = await (await chamar("/api/cargos")).json();
    assert.equal(
      permissoes.menus.some((item) => item.chave === "estagios"),
      false,
    );
    assert.deepEqual(permissoes.itens.find((item) => item.chave === "apoio").editar, ["noticias"]);
    await chamar("/api/cargos", {
      method: "PUT",
      corpo: {
        cargo: "apoio",
        editar: ["estagios"],
        consultar: [],
        senhaAtual: senhaAdmin,
        confirmado: true,
      },
      esperado: 400,
    });

    const paginas = await (await chamar("/api/paginas")).json();
    assert.equal(
      paginas.itens.some((item) => item.url === "/estagios"),
      false,
    );
    const painel = await (await chamar("/painel")).text();
    assert.doesNotMatch(painel, /Central de Estágios/);
    const html = await (await chamar(`/noticias/${noticia.id}`, { jar: visitante })).text();
    assert.match(html, /Texto mantido/);
    assert.doesNotMatch(html, /href="\/estagios/);
    const noticias = await (await chamar("/api/conteudo?tipo=noticias&todos=1")).json();
    assert.equal(
      noticias.itens.find((item) => item.id === noticia.id).dados.botaoInternoAtivo,
      false,
    );
    const agenda = await (await chamar("/api/conteudo?tipo=agenda&todos=1")).json();
    assert.equal(agenda.itens.find((item) => item.id === compromisso.id).dados.paginaUrl, "");
  } finally {
    await portal.fechar();
  }
});
