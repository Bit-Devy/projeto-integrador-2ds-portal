// testa a passagem de gestão com um banco descartável e anos independentes da série
import test from "node:test";
import assert from "node:assert/strict";
import { abrirPortalMemoria } from "./apoio/portal-memoria.mjs";
import { anoDoPortal, dataDoPortal } from "../app/conteudo/periodos.ts";
import { arquivarCiclosEscolares } from "../db/ciclos-anuais.ts";
import { calendarioInicial2026 } from "../app/servicos/calendarios-2026.ts";
import { calendarioVazio, calcularFaltas, preverAusencias, validarCalendario } from "../app/servicos/calendario.ts";

test("turmas de outros anos não ocupam salas e arquivar encerra os representantes ligados", async () => {
  const portal = await abrirPortalMemoria(); const { chamar, sqlite } = portal; const ano = anoDoPortal();
  try {
    const sala = (await (await chamar("/api/mapa", { method: "POST", corpo: { entidade: "locais", dados: { nome: "Sala anual fictícia", tipo: "sala_aula", ala: "Par", ativo: true, publicado: true } }, esperado: 201 })).json()).item;
    const dados = { nome: "3I fictícia", ano, serie: "3", turma: "I", nivelEnsino: "medio", tipo: "aula_regular", turno: "manha", ativo: true, publicado: true, salaId: sala.id };
    const turma = (await (await chamar("/api/mapa", { method: "POST", corpo: { entidade: "turmas", dados }, esperado: 201 })).json()).item;
    const futura = (await (await chamar("/api/mapa", { method: "POST", corpo: { entidade: "turmas", dados: { ...dados, ano: ano + 1 } }, esperado: 201 })).json()).item;
    assert.equal(futura.ativo, false); assert.equal(futura.publicado, false); assert.equal(futura.ano, ano + 1);
    const membro = { nome: "Pessoa fictícia", turmaAtividadeId: turma.id, turma: turma.nome, nivelEnsino: "medio", serie: "3", turno: "manha", funcao: "titular", ativo: true, publicado: true };
    const representante = (await (await chamar("/api/representantes", { method: "POST", corpo: { dados: membro }, esperado: 201 })).json()).item;
    assert.equal(representante.ano, ano);
    await chamar("/api/representantes", { method: "POST", corpo: { dados: { ...membro, turmaAtividadeId: futura.id } }, esperado: 400 });
    await chamar("/api/mapa", { method: "PUT", corpo: { entidade: "turmas", id: turma.id, dados: { ativo: false } } });
    const arquivado = (await (await chamar(`/api/representantes/${representante.id}?todos=1`)).json()).item;
    assert.equal(arquivado.ativo, false); assert.equal(arquivado.publicado, false); assert.equal(arquivado.ano, ano); assert.ok(arquivado.arquivadoEm);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM ensalamentos WHERE local_id=? AND ativo=1").get(sala.id).total, 0);
    await chamar("/api/representantes", { method: "PUT", corpo: { id: representante.id, dados: { observacaoPublica: "Histórico preservado" } } });
    const arquivo = (await (await chamar(`/api/representantes?todos=1&arquivado=1&ano=${ano}`)).json()).itens;
    assert.equal(arquivo.some((item) => item.id === representante.id), true);
  } finally { await portal.fechar(); }
});

test("a virada para o próximo ano arquiva turmas e mantém salas e retratos antigos", async () => {
  const portal = await abrirPortalMemoria(); const { sqlite } = portal; const ano = anoDoPortal();
  try {
    sqlite.prepare("INSERT INTO turmas_atividades (ano,nome,nome_normalizado,turno,tipo,ativo,publicado) VALUES (?,'Turma futura','turma futura','manha','aula_regular',1,1)").run(ano + 1);
    const preparar = (sql, valores = []) => ({ bind: (...dados) => preparar(sql, dados), executar: () => { const retorno = sqlite.prepare(sql).run(...valores); return { success: true, meta: { changes: Number(retorno.changes) } }; } });
    const d1 = { prepare: preparar, batch: async (comandos) => comandos.map((item) => item.executar()) };
    const salas = sqlite.prepare("SELECT COUNT(*) total FROM locais_colegio").get().total;
    await arquivarCiclosEscolares(ano + 1, d1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM turmas_atividades WHERE ano=? AND ativo=1").get(ano).total, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM turmas_atividades WHERE ano=? AND ativo=1").get(ano + 1).total, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM locais_colegio").get().total, salas);
    assert.ok(sqlite.prepare("SELECT COUNT(*) total FROM turmas_atividades WHERE ano=?").get(ano).total > 0);
    assert.equal(anoDoPortal(new Date("2027-01-01T02:59:59Z")), 2026);
    assert.equal(anoDoPortal(new Date("2027-01-01T03:00:00Z")), 2027);
    assert.equal(dataDoPortal(new Date("2027-01-01T02:59:59Z")), "2026-12-31");
  } finally { await portal.fechar(); }
});

test("projetos e oportunidades começam no ano atual e o arquivo continua consultável", async () => {
  const portal = await abrirPortalMemoria(); const { chamar } = portal; const ano = anoDoPortal();
  try {
    const projeto = { titulo: "Projeto fictício anual", categoria: "Teste", estado: "Planejado", texto: "Descrição fictícia", ano: ano - 1 };
    const antigo = (await (await chamar("/api/conteudo", { method: "POST", corpo: { tipo: "projetos", dados: projeto, publicado: true }, esperado: 201 })).json()).item;
    assert.equal(antigo.arquivadoAno, true);
    assert.equal((await (await chamar("/api/conteudo?tipo=projetos", { jar: new Map() })).json()).itens.some((item) => item.id === antigo.id), false);
    assert.equal((await (await chamar(`/api/conteudo?tipo=projetos&ano=${ano-1}`, { jar: new Map() })).json()).itens.some((item) => item.id === antigo.id), true);
    assert.equal((await (await chamar("/api/conteudo?tipo=projetos&todos=1")).json()).itens.some((item) => item.id === antigo.id), true);
    const vaga = { titulo: "Vaga fictícia antiga", categoria: "estagio", organizacao: "Instituição fictícia", local: "Curitiba", modalidade: "Presencial", escolaridade: "Ensino médio", requisitos: "Matrícula ativa", descricao: "Descrição fictícia", data: `${ano - 1}-11-10`, situacao: "encerrada", fonte: "Teste fictício", link: "https://example.org/edital" };
    const oportunidade = (await (await chamar("/api/conteudo", { method: "POST", corpo: { tipo: "oportunidades", dados: vaga, publicado: true }, esperado: 201 })).json()).item;
    assert.equal(oportunidade.ano, ano - 1); assert.equal(oportunidade.arquivadoAno, true);
    assert.equal((await (await chamar("/api/conteudo?tipo=oportunidades", { jar: new Map() })).json()).itens.length, 0);
    assert.equal((await (await chamar(`/api/conteudo?tipo=oportunidades&ano=${ano - 1}`, { jar: new Map() })).json()).itens[0].id, oportunidade.id);
    const mudada = (await (await chamar("/api/conteudo", { method: "PUT", corpo: { id: oportunidade.id, tipo: "oportunidades", dados: { ...oportunidade.dados, data: `${ano}-11-10` }, publicado: true } })).json()).item;
    assert.equal(mudada.ano, ano); assert.equal(mudada.arquivadoAno, false);
  } finally { await portal.fechar(); }
});

// mantém vagas e edições anteriores acessíveis sem preencher as listas de uma nova gestão
test("equipe eventos campeonatos e reuniões separam o ano atual do histórico", async () => {
  const portal = await abrirPortalMemoria(); const { chamar, sqlite } = portal; const ano = anoDoPortal();
  try {
    for (const periodo of [ano - 1, ano]) {
      await chamar("/api/conteudo", { method: "POST", corpo: { tipo: "membros", publicado: true, dados: { nome: `Pessoa fictícia ${periodo}`, ano: periodo, cargoChave: "esportes", vaga: "diretor-1", diretoria: "Gestão fictícia", turno: "manha" } }, esperado: 201 });
      sqlite.prepare("INSERT INTO eventos_internos (slug,titulo,data_inicial,publicado) VALUES (?,?,?,1)").run(`evento-${periodo}`, `Evento fictício ${periodo}`, `${periodo}-11-10`);
      sqlite.prepare("INSERT INTO campeonatos (slug,nome,modalidade,ano,publicado) VALUES (?,?,'futsal',?,1)").run(`copa-${periodo}`, `Copa fictícia ${periodo}`, periodo);
      sqlite.prepare("INSERT INTO reunioes (slug,titulo,tipo,data,publicado) VALUES (?,?,'interna_gecep',?,1)").run(`reuniao-${periodo}`, `Reunião fictícia ${periodo}`, `${periodo}-11-10`);
    }
    const equipe = (await (await chamar("/api/equipe-presencas")).json()).itens;
    assert.deepEqual(equipe.map((item) => item.nome), [`Pessoa fictícia ${ano}`]);
    const antiga = (await (await chamar(`/api/conteudo?tipo=membros&ano=${ano - 1}`, { jar: new Map() })).json()).itens;
    assert.ok(antiga.some((item) => item.dados.nome === `Pessoa fictícia ${ano - 1}`));
    for (const recurso of ["eventos", "interclasses", "reunioes"]) {
      const atuais = (await (await chamar(`/api/${recurso}`, { jar: new Map() })).json()).itens;
      assert.equal(atuais.length, 1); assert.match(atuais[0].titulo || atuais[0].nome, new RegExp(String(ano)));
      const arquivo = (await (await chamar(`/api/${recurso}?ano=${ano - 1}&situacao=arquivado`, { jar: new Map() })).json()).itens;
      assert.equal(arquivo.length, 1); assert.match(arquivo[0].titulo || arquivo[0].nome, new RegExp(String(ano - 1)));
      const privado = (await (await chamar(`/api/${recurso}?todos=1&ano=${ano - 1}&situacao=arquivado`)).json()).itens;
      assert.equal(privado.length, 1);
    }
  } finally { await portal.fechar(); }
});

test("o seletor mantém só atalhos e pagina as notícias dentro do grupo", async () => {
  const portal = await abrirPortalMemoria(); const { chamar, sqlite } = portal; const ano = anoDoPortal();
  try {
    const inserir = sqlite.prepare("INSERT INTO conteudos (tipo,titulo,dados_json,publicado) VALUES ('noticias',?,?,1)");
    for (let indice = 0; indice < 65; indice += 1) inserir.run(`Busca fictícia ${indice}`, JSON.stringify({ data: `${ano}-11-10`, titulo: `Busca fictícia ${indice}`, resumo: "Texto fictício" }));
    const raiz = await (await chamar("/api/paginas")).json(); assert.ok(raiz.itens.length < 30); assert.equal(raiz.itens.some((item) => /^\/noticias\/\d/.test(item.url)), false);
    const primeira = await (await chamar(`/api/paginas?grupo=noticias&ano=${ano}&busca=Busca%20fictícia`)).json();
    const segunda = await (await chamar(`/api/paginas?grupo=noticias&ano=${ano}&busca=Busca%20fictícia&pagina=2`)).json();
    assert.equal(primeira.itens.length, 20); assert.equal(primeira.total, 65); assert.notEqual(primeira.itens[0].url, segunda.itens[0].url);
    const busca = await (await chamar(`/api/paginas?grupo=noticias&ano=${ano}&busca=Busca%20fictícia%2064`)).json(); assert.equal(busca.total, 1);
    await chamar("/api/paginas?grupo=inventado", { esperado: 400 });
  } finally { await portal.fechar(); }
});

test("a margem vira dias completos e aulas parciais seguindo apenas dias letivos", () => {
  const calendario = calendarioInicial2026("anual");
  const resultado = preverAusencias(calendario, 50, "2026-01-01", "2026-12-31", 6, "2026-11-10");
  assert.equal(resultado.dias, 8); assert.equal(resultado.ate, "2026-11-19"); assert.equal(resultado.proximoDia, "2026-11-23"); assert.equal(resultado.aulasParciais, 2);
  assert.equal(preverAusencias(calendario, 0, "2026-01-01", "2026-12-31", 6, "2026-11-10").dias, 0);
  const novo = calendarioVazio(2027, "anual"); novo.dias.find((dia) => dia.data === "2027-03-06").letivo = true; novo.dias.find((dia) => dia.data === "2027-03-06").tipo = "letivo";
  assert.equal(calcularFaltas(validarCalendario(novo), "2027-03-06", "2027-03-06").aulas, 6);
  novo.inicioTerceiroTrimestre = "2027-01-01"; assert.throws(() => validarCalendario(novo), /trimestre/);
});
