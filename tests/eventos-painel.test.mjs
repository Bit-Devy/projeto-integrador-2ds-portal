// confere o painel e o portal sem deixar eventos de teste no banco local
import test from "node:test";
import assert from "node:assert/strict";
import { abrirPortalMemoria } from "./apoio/portal-memoria.mjs";
import { cargosPainel, menusGerenciaveis, podeAcessar } from "../app/lib/cargos.ts";
import { horarioDoEvento } from "../app/eventos/modelo-publico.ts";
import { validarEventoInterno } from "../app/eventos/validacao.ts";

test("o evento pode ocupar o dia todo sem perder os horários específicos", () => {
  const base = { titulo: "Evento fictício", dataInicial: "2026-11-06", horarioInicial: "09:00", horarioFinal: "17:00" };
  assert.equal(validarEventoInterno(base).diaTodo, false);
  const diaTodo = validarEventoInterno({ ...base, diaTodo: true });
  assert.equal(diaTodo.horarioInicial, "09:00");
  assert.equal(diaTodo.horarioFinal, "17:00");
  assert.equal(horarioDoEvento(diaTodo), "Dia todo");
  assert.equal(horarioDoEvento({ ...diaTodo, diaTodo: false }), "09:00–17:00");
  assert.throws(() => validarEventoInterno({ ...base, horarioFinal: "08:00" }), /término/);
  assert.doesNotThrow(() => validarEventoInterno({ ...base, horarioFinal: "08:00", diaTodo: true }));
});

test("as situações chegam ao portal e arquivar retira o evento e os anexos do público", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, sqlite } = portal;
  try {
    const formulario = new FormData(); formulario.set("arquivo", new File(["anexo fictício"], "evento-teste.txt", { type: "text/plain" }));
    const arquivo = await (await chamar("/api/arquivos", { method: "POST", arquivo: formulario, esperado: 201 })).json();
    const dados = { titulo: "Evento fictício do painel", dataInicial: "2026-11-06", horarioInicial: "09:00", horarioFinal: "17:00", diaTodo: true, publicado: true, documentos: [arquivo.url], descricao: "Conteúdo preservado", observacoesInternas: "Observação privada" };
    const evento = (await (await chamar("/api/eventos", { method: "POST", corpo: { dados }, esperado: 201 })).json()).item;
    assert.equal(evento.diaTodo, true);
    assert.equal(evento.horario, "Dia todo");
    const total = sqlite.prepare("SELECT COUNT(*) total FROM eventos_internos").get().total;
    for (const method of ["POST", "PUT"]) await chamar("/api/eventos", { method, corpo: { acao: "duplicar", id: evento.id }, esperado: 400 });
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM eventos_internos").get().total, total);
    for (const [situacao, filtro] of [["proximo", "proximo"], ["em_andamento", "acontecendo_agora"], ["encerrado", "encerrado"], ["cancelado", "cancelado"], ["adiado", "adiado"]]) {
      const alterado = (await (await chamar("/api/eventos", { method: "PUT", corpo: { id: evento.id, dados: { situacao } } })).json()).item;
      assert.equal(alterado.descricao, dados.descricao);
      assert.equal(alterado.observacoesInternas, dados.observacoesInternas);
      assert.equal(alterado.diaTodo, true);
      const publico = await (await chamar(`/api/eventos?situacao=${filtro}`)).json();
      assert.ok(publico.itens.some((item) => item.id === evento.id));
      assert.equal(publico.itens.find((item) => item.id === evento.id).observacoesInternas, undefined);
      assert.equal((await (await chamar(`/api/eventos/${evento.id}`)).json()).item.horario, "Dia todo");
    }
    for (const [situacao, campo] of [["proximo", "proximosEventos"], ["em_andamento", "acontecendoAgora"]]) {
      await chamar("/api/eventos", { method: "PUT", corpo: { id: evento.id, dados: { situacao } } });
      const central = await (await chamar("/api/eventos?central=1")).json();
      assert.ok(central[campo].some((item) => item.id === evento.id));
    }
    const especifico = (await (await chamar("/api/eventos", { method: "PUT", corpo: { id: evento.id, dados: { diaTodo: false } } })).json()).item;
    assert.equal(especifico.horarioInicial, "09:00"); assert.equal(especifico.horarioFinal, "17:00");
    await chamar(arquivo.url, { jar: new Map() });
    await chamar(`/api/eventos?id=${evento.id}`, { method: "DELETE" });
    await chamar(`/api/eventos/${evento.id}`, { esperado: 404, jar: new Map() });
    await chamar(arquivo.url, { esperado: 401, jar: new Map() });
    assert.equal((await (await chamar("/api/eventos")).json()).itens.some((item) => item.id === evento.id), false);
    const arquivado = (await (await chamar(`/api/eventos/${evento.id}?todos=1`)).json()).item;
    assert.equal(arquivado.publicado, false); assert.equal(arquivado.arquivado, true);
    assert.equal(arquivado.descricao, dados.descricao);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM eventos_internos").get().total, total);
  } finally { await portal.fechar(); }
});

test("cada cargo abre na primeira aba permitida na ordem do menu", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, senhaAdmin } = portal;
  try {
    for (const cargo of cargosPainel) {
      let jar = portal.cookies;
      if (cargo.chave !== "geral") {
        const login = `teste${cargo.chave.replaceAll("-", "")}`;
        const acesso = await (await chamar("/api/acessos", { method: "POST", corpo: { cargo: cargo.chave, nome: "Pessoa fictícia", login, senhaAtual: senhaAdmin, confirmado: true }, esperado: 201 })).json();
        jar = new Map();
        await chamar("/api/login", { jar, method: "POST", formulario: { login, senha: acesso.senha, geral: "0", returnTo: "/painel" }, esperado: 303 });
      }
      const primeiro = menusGerenciaveis.find((menu) => podeAcessar(cargo.chave, menu.chave));
      const nome = primeiro.chave === "arquivos" || primeiro.chave === "oficiais" || primeiro.chave === "documentos" ? "Documentos" : primeiro.nome;
      const html = await (await chamar("/painel", { jar })).text();
      const titulo = html.slice(html.indexOf('class="conteudo-painel"')).match(/<h[12][^>]*>([^<]+)<\/h[12]>/)?.[1];
      assert.equal(titulo, nome, cargo.nome);
    }
    const acesso = await (await chamar("/api/acessos", { method: "POST", corpo: { cargo: "apoio", nome: "Consulta fictícia", login: "consultapainel", senhaAtual: senhaAdmin, confirmado: true }, esperado: 201 })).json();
    const jar = new Map();
    await chamar("/api/login", { jar, method: "POST", formulario: { login: acesso.login, senha: acesso.senha, geral: "0", returnTo: "/painel" }, esperado: 303 });
    for (const [consultar, nome] of [[["mensagens", "noticias"], "Notícias"], [["mensagens", "projetos"], "Projetos"], [["mensagens", "turmas"], "Turmas"], [["mensagens", "mapa"], "Mapa e ensalamento"], [["mensagens"], "Mensagens recebidas"], [["mensagens", "arquivos"], "Biblioteca de arquivos"]]) {
      await chamar("/api/cargos", { method: "PUT", corpo: { cargo: "apoio", editar: [], consultar, senhaAtual: senhaAdmin, confirmado: true } });
      const html = await (await chamar("/painel", { jar })).text();
      assert.equal(html.slice(html.indexOf('class="conteudo-painel"')).match(/<h[12][^>]*>([^<]+)<\/h[12]>/)?.[1], nome, consultar.join(", "));
    }
  } finally { await portal.fechar(); }
});
