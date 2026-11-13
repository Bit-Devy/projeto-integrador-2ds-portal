// cobre os vínculos e o encerramento anual com as rotas reais do portal
import test from "node:test";
import assert from "node:assert/strict";
import { abrirPortalMemoria } from "./apoio/portal-memoria.mjs";
import { anoDoPortal, dataDoPortal } from "../app/conteudo/periodos.ts";

const json = async (resposta) => (await resposta).json();

function criarNoMapa(chamar, entidade, dados) {
  return json(chamar("/api/mapa", { method: "POST", corpo: { entidade, dados }, esperado: 201 })).then(({ item }) => item);
}

function sala(chamar, nome) {
  return criarNoMapa(chamar, "locais", { nome, tipo: "sala_aula", ala: "Par", publicado: true });
}

const turmaBase = { nivelEnsino: "medio", serie: "2", tipo: "idiomas", turno: "manha", ativo: true, publicado: true };

// permite dias diferentes e horários consecutivos e conserva os vínculos anteriores
test("turnos parciais compartilham a sala sem sobreposição de dias e horários", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar } = portal;
  try {
    const idiomas = await sala(chamar, "Sala fictícia de idiomas");
    const outra = await sala(chamar, "Outra sala fictícia");
    const parcial = { ...turmaBase, salaId: idiomas.id, turnoParcial: true };
    const horario = { horarioInicial: "08:00", horarioFinal: "10:00" };
    const alemao = await criarNoMapa(chamar, "turmas", { ...parcial, ...horario, nome: "2A Alemão", diasSemana: ["quarta", "segunda"] });
    const japones = await criarNoMapa(chamar, "turmas", { ...parcial, nome: "1B Japonês", horarioInicial: "10:00", horarioFinal: "11:40", diasSemana: ["segunda"] });
    const italiano = await criarNoMapa(chamar, "turmas", { ...parcial, ...horario, nome: "1C Italiano", diasSemana: ["terca"] });
    const mapa = await json(chamar("/api/mapa", { jar: new Map() }));
    assert.equal(mapa.ensalamentos.filter((item) => item.localId === idiomas.id).length, 3);
    assert.deepEqual(mapa.turmas.find((item) => item.id === alemao.id).diasSemana, ["segunda", "quarta"]);
    assert.deepEqual(mapa.turmas.find((item) => item.id === italiano.id).diasSemana, ["terca"]);
    for (const [dados, quantidade] of [
      [{ ...parcial, nome: "Choque entre horários", horarioInicial: "09:50", horarioFinal: "10:15", diasSemana: ["segunda"] }, 2],
      [{ ...turmaBase, nome: "Turno inteiro", salaId: idiomas.id }, 3],
    ]) {
      const conflito = await json(chamar("/api/mapa", { method: "POST", corpo: { entidade: "turmas", dados }, esperado: 409 }));
      assert.equal(conflito.conflitos.length, quantidade);
    }
    for (const diasSemana of [[], ["feriado"], "segunda"]) {
      await chamar("/api/mapa", { method: "POST", corpo: { entidade: "turmas", dados: { ...parcial, ...horario, nome: "Dias inválidos", diasSemana } }, esperado: 400 });
    }
    await chamar("/api/mapa", { method: "POST", corpo: { entidade: "turmas", dados: { ...parcial, nome: "Horário inválido", horarioInicial: "11:40", horarioFinal: "10:00" } }, esperado: 400 });
    await chamar("/api/mapa", { method: "PUT", corpo: { entidade: "turmas", id: japones.id, dados: { horarioInicial: "09:59" } }, esperado: 409 });
    const choqueDeDias = await json(chamar("/api/mapa", { method: "PUT", corpo: { entidade: "turmas", id: italiano.id, dados: { diasSemana: ["quarta"] } }, esperado: 409 }));
    assert.equal(choqueDeDias.conflitos.length, 1);
    assert.match(choqueDeDias.conflitos[0].nome, /Alemão \(Seg, Qua · 08:00/);
    await chamar("/api/mapa", { method: "PUT", corpo: { entidade: "locais", id: idiomas.id, dados: { turmaId: japones.id } } });
    // confere a proteção do banco pela rota que grava o vínculo diretamente
    const teatro = await criarNoMapa(chamar, "turmas", { ...turmaBase, ...horario, nome: "Teatro", turnoParcial: true, diasSemana: ["quarta"] });
    await chamar("/api/mapa", { method: "POST", corpo: { entidade: "ensalamentos", dados: { turmaAtividadeId: teatro.id, localId: idiomas.id, turno: "manha", tipo: "idiomas", publicado: true } }, esperado: 409 });
    const vinculo = (await json(chamar("/api/mapa"))).ensalamentos.find((item) => item.turmaAtividadeId === alemao.id);
    await chamar("/api/mapa", { method: "PUT", corpo: { entidade: "ensalamentos", id: vinculo.id, dados: { ...vinculo, localId: outra.id } } });
    await chamar("/api/mapa", { method: "PUT", corpo: { entidade: "turmas", id: alemao.id, dados: { ativo: false } } });
    const historico = await json(chamar(`/api/mapa?historico=${alemao.id}`));
    assert.deepEqual(historico.turma.diasSemana, ["segunda", "quarta"]);
    assert.deepEqual(new Set(historico.salas.map((item) => item.sala)), new Set([idiomas.nome, outra.nome]));
    assert.ok(historico.salas.every((item) => item.encerradoEm));
    await chamar(`/api/mapa?historico=${alemao.id}`, { jar: new Map(), esperado: 401 });
  } finally { await portal.fechar(); }
});

// não bloqueia dois períodos cujo único dia comum não tem aula
test("a sala confere se o dia de aula está dentro da validade comum", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar } = portal;
  try {
    const local = await sala(chamar, "Sala de cursos com datas limitadas");
    const primeiroDia = new Date(Date.UTC(anoDoPortal(), 0, 1)).getUTCDay();
    const segunda = 1 + (8 - primeiroDia) % 7;
    const dia = (deslocamento) => new Date(Date.UTC(anoDoPortal(), 0, segunda + deslocamento)).toISOString().slice(0, 10);
    const base = { ...turmaBase, salaId: local.id, turnoParcial: true, horarioInicial: "08:00", horarioFinal: "10:00", diasSemana: ["segunda"] };
    const primeiro = await criarNoMapa(chamar, "turmas", { ...base, nome: "Primeiro período", inicioValidade: dia(0), fimValidade: dia(2) });
    await criarNoMapa(chamar, "turmas", { ...base, nome: "Segundo período", inicioValidade: dia(2), fimValidade: dia(7) });
    const edicao = await json(chamar("/api/mapa", { method: "PUT", corpo: { entidade: "turmas", id: primeiro.id, dados: { diasSemana: ["segunda", "sexta"] } } }));
    assert.equal(edicao.item.fimValidade, dia(2));
    await chamar("/api/mapa", { method: "POST", corpo: { entidade: "turmas", dados: { ...base, nome: "Período coincidente", inicioValidade: dia(6), fimValidade: dia(8) } }, esperado: 409 });
  } finally { await portal.fechar(); }
});

// preserva o primeiro titular na reunião e permite preencher a vaga com outro cadastro
test("destituição fecha a vaga anterior e mantém o histórico da turma", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar } = portal;
  try {
    const turma = await criarNoMapa(chamar, "turmas", { ...turmaBase, nome: "Turma fictícia de representação" });
    const ano = anoDoPortal();
    const hoje = dataDoPortal();
    const inicio = `${ano}-01-01`;
    const contatos = [{ tipo: "email", valor: "representacao@example.test" }, { tipo: "telefone", valor: "(41) 90000-0000" }];
    const dados = { nome: "Primeira titular fictícia", turmaAtividadeId: turma.id, turma: turma.nome, nivelEnsino: "medio", serie: "2", turno: "manha", funcao: "titular", inicioMandato: inicio, fimMandato: `${ano}-12-31`, contatos, observacaoInterna: "anotação interna fictícia", ativo: true };
    const criar = (campos, esperado = 201) => json(chamar("/api/representantes", { method: "POST", corpo: { dados: { ...dados, ...campos } }, esperado }));
    await criar({ contatos: [...contatos, { tipo: "whatsapp", valor: "(41) 90000-0001" }] }, 400);
    await criar({ contatos: [{ tipo: "email", valor: "inválido" }] }, 400);
    const { item: primeira } = await criar({ publicado: false });
    assert.equal(primeira.publicado, true);
    const rota = `/api/representantes/${primeira.id}`;
    const publico = { jar: new Map() };
    const detalhePublico = (await json(chamar(rota, publico))).item;
    assert.deepEqual(detalhePublico.contatos, []);
    assert.equal(detalhePublico.observacaoInterna, undefined);
    assert.match((await json(chamar(rota, publico))).item.mapaUrl, new RegExp(`turmaId=${turma.id}#`));
    await criar({ nome: "Vaga ocupada" }, 409);
    const editar = (campos, esperado = 200) => chamar("/api/representantes", { method: "PUT", corpo: { id: primeira.id, dados: campos }, esperado });
    await editar({ turmaAtividadeId: turma.id + 1 }, 400);
    await editar({ funcao: "vice" }, 400);
    await editar({ nome: "Outra pessoa" }, 400);
    await editar({ contatosPublicos: true, publicado: false });
    assert.deepEqual((await json(chamar(rota, publico))).item.contatos, contatos);
    const lista = await json(chamar(`/api/representantes?turmaId=${turma.id}`, publico));
    assert.equal(lista.itens[0].contatos, undefined);
    const { item: reuniao } = await json(chamar("/api/reunioes", { method: "POST", corpo: { dados: { titulo: "Reunião fictícia de representantes", tipo: "representantes", data: hoje } }, esperado: 201 }));
    const presencas = await json(chamar("/api/reunioes", { method: "PUT", corpo: { acao: "gerar_presencas", id: reuniao.id, filtros: { turma: turma.nome } } }));
    assert.equal(presencas.presencas[0].nome, dados.nome);
    const encerramento = { acao: "destituir", id: primeira.id, confirmado: true, dados: { inicioMandato: inicio, fimMandato: hoje } };
    await chamar("/api/representantes", { method: "PUT", corpo: { ...encerramento, confirmado: false }, esperado: 400 });
    await chamar("/api/representantes", { method: "PUT", corpo: { ...encerramento, dados: { inicioMandato: inicio, fimMandato: `${ano + 1}-01-01` } }, esperado: 400 });
    const encerrado = (await json(chamar("/api/representantes", { method: "PUT", corpo: encerramento }))).item;
    assert.equal(encerrado.fimMandato, hoje);
    assert.ok(encerrado.destituidoEm);
    await chamar(rota, { ...publico, esperado: 404 });
    await editar({ ativo: true }, 409);
    const nova = (await criar({ nome: "Titular sucessora fictícia", inicioMandato: hoje, contatos: [] })).item;
    assert.deepEqual((await json(chamar(`/api/representantes?turmaId=${turma.id}`, publico))).itens.map((item) => item.id), [nova.id]);
    await chamar("/api/mapa", { method: "PUT", corpo: { entidade: "turmas", id: turma.id, dados: { ativo: false } } });
    const historico = await json(chamar(`/api/mapa?historico=${turma.id}`));
    assert.deepEqual(historico.representantes.map((item) => item.nome), [dados.nome, nova.nome]);
    assert.equal(historico.representantes[0].fimMandato, hoje);
    assert.equal(historico.representantes[0].contatos, undefined);
    assert.equal((await json(chamar(`/api/reunioes/${reuniao.id}?todos=1`))).presencas[0].nome, dados.nome);
  } finally { await portal.fechar(); }
});

// troca o relógio do portal e confere as permissões depois da virada
test("lançamentos e comprovantes de exercícios encerrados saem da consulta pública", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, senhaAdmin } = portal;
  const DataOriginal = globalThis.Date;
  try {
    const ano = anoDoPortal();
    const upload = new FormData();
    upload.set("arquivo", new File(["Comprovante fictício de teste"], "comprovante-teste.txt", { type: "text/plain" }));
    const arquivo = await json(chamar("/api/arquivos", { method: "POST", arquivo: upload, esperado: 201 }));
    const dados = { descricao: "Lançamento fictício", data: `${ano}-03-02`, categoria: "Teste", tipo: "entrada", valor: 12, comprovanteUrl: arquivo.url };
    const criar = (data, esperado) => json(chamar("/api/conteudo", { method: "POST", corpo: { tipo: "movimentos", dados: { ...dados, data }, publicado: true }, esperado }));
    await criar(`${ano - 1}-03-02`, 400);
    await criar(`${ano + 1}-03-02`, 400);
    const { item } = await criar(dados.data, 201);
    const publico = { jar: new Map() };
    await chamar(arquivo.url, publico);
    assert.ok((await json(chamar("/api/conteudo?tipo=movimentos", publico))).itens.some((registro) => registro.id === item.id));
    const instante = `${ano + 1}-01-01T03:01:00Z`;
    globalThis.Date = class extends DataOriginal {
      constructor(...argumentos) { super(...(argumentos.length ? argumentos : [instante])); }
      static now() { return DataOriginal.parse(instante); }
    };
    const rota = "/api/conteudo?tipo=movimentos";
    for (const consulta of [rota, `${rota}&ano=todos`, `${rota}&ano=${ano}`]) {
      assert.equal((await json(chamar(consulta, publico))).itens.some((registro) => registro.id === item.id), false);
    }
    await chamar(arquivo.url, { ...publico, esperado: 401 });
    await chamar(`${rota}&todos=1&ano=${ano}`, { ...publico, esperado: 401 });
    const jar = new Map();
    await chamar("/api/login", { jar, method: "POST", formulario: { login: "admin", senha: senhaAdmin, geral: "1" }, esperado: 303 });
    const arquivoAnual = (await json(chamar(`${rota}&todos=1&ano=${ano}`, { jar }))).itens;
    assert.equal(arquivoAnual.find((registro) => registro.id === item.id).arquivadoAno, true);
    for (const consulta of ["1", "1800", "2300"]) {
      assert.deepEqual((await json(chamar(`${rota}&todos=1&ano=${consulta}`, { jar }))).itens, []);
    }
    assert.equal((await json(chamar(`${rota}&todos=1`, { jar }))).itens.some((registro) => registro.id === item.id), false);
    await chamar("/api/conteudo", { jar, method: "PUT", corpo: { id: item.id, tipo: "movimentos", dados: { ...dados, data: `${ano + 1}-01-01` } }, esperado: 409 });
    await chamar(`/api/conteudo?id=${item.id}`, { jar, method: "DELETE", esperado: 409 });
    await chamar(arquivo.url, { jar });
    await chamar(arquivo.url, { jar, method: "DELETE", esperado: 409 });
  } finally {
    globalThis.Date = DataOriginal;
    await portal.fechar();
  }
});
