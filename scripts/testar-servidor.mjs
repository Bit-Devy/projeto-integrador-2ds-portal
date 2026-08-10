// importa as verificações dos resultados
import assert from "node:assert/strict";
// importa a leitura de arquivos
import { readFile } from "node:fs/promises";
// importa a execução de programas
import { spawn } from "node:child_process";

// guarda o endereço usado pelos testes
const endereco = "http://127.0.0.1:5173";
// inicia o servidor local
const servidor = spawn(process.execPath, ["scripts/comando-local.mjs", "vite"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

// guarda as mensagens do servidor
let registro = "";
// recebe as mensagens normais do servidor
servidor.stdout.on("data", (parte) => { registro += parte.toString(); });
// recebe as mensagens de erro do servidor
servidor.stderr.on("data", (parte) => { registro += parte.toString(); });

// executa a sequência completa de testes
try {
  // espera o servidor ficar disponível
  await esperarServidor();

  // verifica a tela inicial
  const inicio = await fetch(`${endereco}/`);
  assert.equal(inicio.status, 200);
  assert.match(await inicio.text(), /GECEP/);

  // verifica a tela de entrada
  const login = await fetch(`${endereco}/login`);
  assert.equal(login.status, 200);

  // verifica a proteção do painel
  const painelSemLogin = await fetch(`${endereco}/painel`, { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(painelSemLogin.status));
  assert.match(painelSemLogin.headers.get("location") ?? "", /\/login/);

  // verifica o conteúdo público
  const conteudoPublico = await fetch(`${endereco}/api/conteudo?tipo=noticias`);
  assert.equal(conteudoPublico.status, 200);
  const dadosPublicos = await conteudoPublico.json();
  assert.ok(Array.isArray(dadosPublicos.itens));

  // verifica a proteção do conteúdo privado
  const protegido = await fetch(`${endereco}/api/conteudo?tipo=noticias&todos=1`);
  assert.equal(protegido.status, 401);

  // verifica o mapa antes da entrada
  await testarMapaPublicoSemLogin();

  // verifica as novas áreas públicas e suas proteções antes da entrada
  await testarSistemaEventosSemLogin();

  // entra no painel com a senha local
  const senha = await lerSenhaLocal();
  const formulario = new URLSearchParams({ senha, returnTo: "/painel" });
  const respostaLogin = await fetch(`${endereco}/api/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: formulario,
  });
  assert.equal(respostaLogin.status, 303);
  // separa o cookie recebido pelo login
  const cookie = (respostaLogin.headers.get("set-cookie") ?? "").split(";")[0];
  assert.match(cookie, /^gecep_sessao=/);

  // verifica o painel após a entrada
  const painelComLogin = await fetch(`${endereco}/painel`, { headers: { cookie } });
  assert.equal(painelComLogin.status, 200);
  assert.match(await painelComLogin.text(), /PAINEL DE CONTEÚDO/);

  // executa os testes das áreas privadas
  await testarMapa(cookie);
  await testarSistemaEventos(cookie);
  await testarConteudo(cookie);
  await testarMensagens(cookie);
  await testarArquivos(cookie);

  console.log("Servidor local, banco, login, mapa, eventos, painel, CRUD e arquivos: OK");
} catch (erro) {
  // mostra o registro quando algum teste falha
  console.error(registro);
  throw erro;
} finally {
  // encerra o servidor mesmo após uma falha
  await encerrarServidor();
}

// espera o servidor responder
async function esperarServidor() {
  // tenta acessar o servidor por um tempo limitado
  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    // encerra quando o processo já falhou
    if (servidor.exitCode !== null) throw new Error("O servidor foi encerrado antes de iniciar.");
    try {
      const resposta = await fetch(`${endereco}/`, { signal: AbortSignal.timeout(600) });
      if (resposta.ok) return;
    } catch {
      // aguarda a próxima tentativa
    }
    // cria um pequeno intervalo entre tentativas
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  throw new Error("O servidor local não respondeu dentro do tempo esperado.");
}

// lê a senha usada no teste local
async function lerSenhaLocal() {
  // procura a senha no arquivo privado
  const texto = await readFile(".dev.vars", "utf8");
  // encontra a linha que guarda a senha
  const linha = texto.split(/\r?\n/).find((item) => item.startsWith("ADMIN_PASSWORD="));
  // separa somente o valor da senha
  const senha = linha?.slice("ADMIN_PASSWORD=".length).trim();
  // exige uma senha configurada
  if (!senha) throw new Error("Defina ADMIN_PASSWORD em .dev.vars antes do teste.");
  return senha;
}

// encerra o servidor iniciado pelo teste
async function encerrarServidor() {
  // ignora quando o servidor já terminou
  if (servidor.exitCode !== null) return;
  servidor.kill("SIGTERM");
  // espera o encerramento ou o limite de tempo
  await Promise.race([
    new Promise((resolver) => servidor.once("exit", resolver)),
    new Promise((resolver) => setTimeout(resolver, 3000)),
  ]);
}

// testa os dados públicos e as proteções do mapa
async function testarMapaPublicoSemLogin() {
  // verifica a página pública do mapa
  const pagina = await fetch(`${endereco}/mapa-do-colegio`);
  assert.equal(pagina.status, 200);
  const html = await pagina.text();
  assert.match(html, /Mapa do Colégio/);
  assert.match(html, /Carregando informações do colégio/);

  // verifica a primeira leitura dos dados
  const respostaPublica = await fetch(`${endereco}/api/mapa`);
  assert.equal(respostaPublica.status, 200);
  const dados = await respostaPublica.json();
  assert.ok(dados.locais.length >= 67);
  assert.ok(dados.turmas.length >= 100);
  assert.ok(dados.ensalamentos.length >= 112);
  assert.ok(dados.categorias.some((item) => item.slug === "aula_regular"));
  assert.ok(dados.locais.every((item) => !("chaveImportacao" in item)));

  // verifica se uma nova leitura não repete os dados
  const segundaLeitura = await fetch(`${endereco}/api/mapa?teste=idempotencia`);
  assert.equal(segundaLeitura.status, 200);
  const dadosRepetidos = await segundaLeitura.json();
  assert.equal(dadosRepetidos.locais.length, dados.locais.length);
  assert.equal(dadosRepetidos.turmas.length, dados.turmas.length);
  assert.equal(dadosRepetidos.ensalamentos.length, dados.ensalamentos.length);

  // verifica a sala de uma turma conhecida
  const turma3J = dados.turmas.find((item) => item.nome === "3J" && item.turno === "manha");
  assert.ok(turma3J);
  const ensalamento3J = dados.ensalamentos.find((item) => item.turmaAtividadeId === turma3J.id);
  const local3J = dados.locais.find((item) => item.id === ensalamento3J?.localId);
  assert.equal(local3J?.numero, "216");

  // verifica a busca por turma
  const buscaTurma = await fetch(`${endereco}/api/mapa?busca=${encodeURIComponent("3º J")}&turno=manha&tipo=aula_regular`);
  assert.equal(buscaTurma.status, 200);
  const resultadoTurma = await buscaTurma.json();
  assert.ok(resultadoTurma.turmas.some((item) => item.nome === "3J"));

  // verifica a classificação das turmas
  const nomesTurmasEmOutro = [...new Set(
    dados.turmas.filter((item) => item.tipo === "outro").map((item) => item.nome),
  )];
  assert.deepEqual(nomesTurmasEmOutro, ["Reforço"]);
  assert.ok(dados.turmas.some((item) => item.nome === "2PD" && item.tipo === "aula_regular"));
  assert.ok(dados.turmas.some((item) => item.nome === "CURCEP" && item.tipo === "aula_regular"));

  // verifica a busca por sala
  const buscaSala = await fetch(`${endereco}/api/mapa?busca=${encodeURIComponent("Sala 214")}`);
  assert.equal(buscaSala.status, 200);
  const resultadoSala = await buscaSala.json();
  assert.ok(resultadoSala.locais.some((item) => item.numero === "214"));

  // verifica a busca por locais especiais
  for (const pesquisa of [
    { termo: "Laboratório", nome: /Laboratório/i },
    { termo: "DANCEP", nome: /DANCEP/i },
    { termo: "Coro", nome: /Coro/i },
    { termo: "SRM - DI", nome: /SRM\s*-\s*DI/i },
  ]) {
    const resposta = await fetch(`${endereco}/api/mapa?busca=${encodeURIComponent(pesquisa.termo)}`);
    assert.equal(resposta.status, 200);
    const resultado = await resposta.json();
    assert.ok(
      resultado.locais.some((item) => pesquisa.nome.test(item.nome)),
      `${pesquisa.termo} deve encontrar um local publicado`,
    );
  }

  // verifica a busca pela atividade de reforço
  const buscaReforco = await fetch(`${endereco}/api/mapa?busca=${encodeURIComponent("Reforço")}&tipo=outro`);
  assert.equal(buscaReforco.status, 200);
  assert.ok((await buscaReforco.json()).turmas.some((item) => item.nome === "Reforço"));

  // verifica filtros usados ao mesmo tempo
  const filtroCombinado = await fetch(`${endereco}/api/mapa?turno=manha&tipo=idiomas`);
  assert.equal(filtroCombinado.status, 200);
  const resultadoCombinado = await filtroCombinado.json();
  assert.deepEqual(resultadoCombinado.locais.map((item) => item.numero).sort(), ["113B", "213B"]);
  assert.ok(resultadoCombinado.ensalamentos.every((item) => item.turno === "manha" && item.tipo === "idiomas"));

  // rejeita um turno que não existe
  const turnoInvalido = await fetch(`${endereco}/api/mapa?turno=inexistente`);
  assert.equal(turnoInvalido.status, 400);

  // protege a lista administrativa
  const listaProtegida = await fetch(`${endereco}/api/mapa?todos=1`);
  assert.equal(listaProtegida.status, 401);
  const escritaProtegida = await fetch(`${endereco}/api/mapa`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ entidade: "locais", dados: { nome: "Não deve ser criado", tipo: "outro" } }),
  });
  assert.equal(escritaProtegida.status, 401);
}

// testa as páginas públicas e a proteção uniforme do domínio de eventos
async function testarSistemaEventosSemLogin() {
  // todas as entradas principais devem abrir sem sessão
  for (const rota of [
    "/eventos",
    "/eventos/internos",
    "/eventos/interclasses",
    "/eventos/reunioes",
    "/representantes",
    "/calendario",
  ]) {
    const resposta = await fetch(`${endereco}${rota}`);
    assert.equal(resposta.status, 200, `A rota pública ${rota} deve responder.`);
  }

  // as páginas especializadas mostram as publicações antes do arquivo de filtros
  for (const [rota, titulos] of [
    ["/eventos/internos", ["Acontecendo agora", "Próximos eventos", "Eventos recentes", "Procurar outro evento"]],
    ["/eventos/interclasses", ["Interclasses acontecendo agora", "Últimos resultados", "Campeonatos encerrados", "Procurar campeonato"]],
    ["/eventos/reunioes", ["Últimas reuniões", "Próximas reuniões", "Reuniões internas do GECEP", "Procurar reunião ou ata"]],
  ]) {
    const pagina = await fetch(`${endereco}${rota}`);
    const html = await pagina.text();
    for (const titulo of titulos) assert.match(html, new RegExp(titulo), `${rota} deve apresentar ${titulo}.`);
  }

  // links de "ver todos" mantêm o arquivo aberto e expõem os filtros correspondentes
  for (const [rota, filtro] of [
    ["/eventos/internos?situacao=encerrado", "Público destinado"],
    ["/eventos/interclasses?situacao=encerrado", "Buscar campeonato"],
    ["/eventos/reunioes?tipo=interna_gecep", "Buscar reunião"],
  ]) {
    const pagina = await fetch(`${endereco}${rota}`);
    const html = await pagina.text();
    assert.match(html, /aria-expanded="true"/);
    assert.match(html, new RegExp(filtro));
  }

  // as coleções públicas devem responder no mesmo formato paginado
  for (const api of ["/api/eventos", "/api/interclasses", "/api/reunioes", "/api/representantes"]) {
    const respostaPublica = await fetch(`${endereco}${api}`);
    assert.equal(respostaPublica.status, 200, `A leitura pública de ${api} deve responder.`);
    const lista = await respostaPublica.json();
    assert.ok(Array.isArray(lista.itens));
    assert.equal(typeof lista.paginacao?.total, "number");

    // a inclusão de rascunhos e dados internos exige autenticação
    const respostaAdministrativa = await fetch(`${endereco}${api}?todos=1`);
    assert.equal(respostaAdministrativa.status, 401, `${api}?todos=1 deve ser protegido.`);

    // todos os verbos de escrita devem ser bloqueados antes da validação do corpo
    for (const method of ["POST", "PUT", "DELETE"]) {
      const complemento = method === "DELETE" ? "?id=1" : "";
      const respostaEscrita = await fetch(`${endereco}${api}${complemento}`, {
        method,
        ...(method === "DELETE" ? {} : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dados: {} }),
        }),
      });
      assert.equal(respostaEscrita.status, 401, `${method} ${api} deve exigir uma sessão.`);
    }
  }

  // a central tem um contrato público fechado e também não expõe campos privados
  const respostaCentral = await fetch(`${endereco}/api/eventos?central=1`);
  assert.equal(respostaCentral.status, 200);
  const central = await respostaCentral.json();
  assert.deepEqual(Object.keys(central).sort(), [
    "acontecendoAgora",
    "interclassesEmAndamento",
    "proximosEventos",
    "proximosJogos",
    "reunioesRecentes",
  ]);
  assert.ok(Object.values(central).every(Array.isArray));
  afirmarSemCamposPrivados(central);
}

// testa o fluxo HTTP integrado de eventos, interclasses, reuniões e representantes
async function testarSistemaEventos(cookie) {
  const sufixo = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000)}`;
  const criados = {
    representante: 0,
    evento: 0,
    campeonato: 0,
    reuniao: 0,
    reuniaoInterna: 0,
    fases: [],
    participantes: [],
    itensReuniao: [],
    votacoes: [],
    presencas: [],
  };

  try {
    // cadastra um representante em rascunho, com uma turma escrita de forma humana
    const nomeRepresentante = `Representante HTTP ${sufixo}`;
    const nomeExibicao = `Representante ${sufixo}`;
    const respostaRepresentante = await requisicaoDominio(cookie, "/api/representantes", "POST", {
      dados: {
        nome: nomeRepresentante,
        nomeExibicao,
        nivelEnsino: "Ensino Médio",
        serie: "3ª série",
        turma: "3º J",
        turno: "manha",
        funcao: "titular",
        inicioMandato: "2099-02-01",
        fimMandato: "2099-12-20",
        observacaoPublica: "Representante criado pelo teste HTTP local.",
        observacaoInterna: `não publicar representante ${sufixo}`,
        publicado: false,
        ativo: true,
      },
    }, 201);
    criados.representante = respostaRepresentante.item.id;

    // um rascunho não pode ser consultado pela projeção pública
    await requisicaoPublica(`/api/representantes/${criados.representante}`, 404);
    let buscaTurma = await requisicaoPublica(`/api/representantes?busca=${encodeURIComponent("3ºJ")}&limite=100`);
    assert.ok(!buscaTurma.itens.some((item) => item.id === criados.representante));

    // publica e encontra a turma mesmo sem espaço e com o símbolo ordinal
    await requisicaoDominio(cookie, "/api/representantes", "PUT", {
      id: criados.representante,
      dados: { publicado: true },
    });
    buscaTurma = await requisicaoPublica(`/api/representantes?busca=${encodeURIComponent("3ºJ")}&limite=100&teste=${sufixo}`);
    const representantePublico = buscaTurma.itens.find((item) => item.id === criados.representante);
    assert.ok(representantePublico, "A busca normalizada por 3ºJ deve encontrar 3º J.");
    assert.equal(representantePublico.turma, "3º J");
    afirmarSemCamposPrivados(representantePublico);

    // arquiva o representante e impede que ele continue visível ao público
    const arquivamentoRepresentante = await requisicaoDominio(
      cookie,
      `/api/representantes?id=${criados.representante}`,
      "DELETE",
    );
    assert.equal(arquivamentoRepresentante.arquivado, true);
    const representanteArquivado = (
      await requisicaoDominio(cookie, `/api/representantes/${criados.representante}?todos=1`)
    ).item;
    assert.equal(representanteArquivado.ativo, false);
    assert.ok(representanteArquivado.arquivadoEm);
    await requisicaoPublica(`/api/representantes/${criados.representante}?teste=arquivado-${sufixo}`, 404);

    // a reativação limpa o arquivamento, mas sempre volta como rascunho
    const representanteReativado = (await requisicaoDominio(cookie, "/api/representantes", "PUT", {
      id: criados.representante,
      dados: { ativo: true, publicado: true },
    })).item;
    assert.equal(representanteReativado.ativo, true);
    assert.equal(representanteReativado.publicado, false);
    assert.equal(representanteReativado.arquivadoEm, null);
    await requisicaoPublica(`/api/representantes/${criados.representante}?teste=reativado-${sufixo}`, 404);

    // republica para que o cadastro possa alimentar a lista de presença adiante
    const representanteRepublicado = (await requisicaoDominio(cookie, "/api/representantes", "PUT", {
      id: criados.representante,
      dados: { publicado: true },
    })).item;
    assert.equal(representanteRepublicado.publicado, true);
    assert.equal(representanteRepublicado.ativo, true);
    assert.equal(representanteRepublicado.arquivadoEm, null);
    const detalheRepresentanteRepublicado = await requisicaoPublica(
      `/api/representantes/${criados.representante}?teste=republicado-${sufixo}`,
    );
    assert.equal(detalheRepresentanteRepublicado.item.id, criados.representante);
    afirmarSemCamposPrivados(detalheRepresentanteRepublicado);

    // cria um evento interno com conteúdo público e uma observação estritamente privada
    const respostaEvento = await requisicaoDominio(cookie, "/api/eventos", "POST", {
      dados: {
        titulo: `Evento HTTP ${sufixo}`,
        subtitulo: "Integração local",
        descricaoCurta: "Evento temporário do teste local.",
        descricao: "Conteúdo público do evento temporário.",
        categoria: "Teste",
        dataInicial: "2099-10-20",
        dataFinal: "2099-10-20",
        horarioInicial: "09:00",
        horarioFinal: "10:30",
        local: "Auditório",
        turno: "manha",
        publicoDestinado: "Comunidade escolar",
        situacao: "proximo",
        observacoesPublicas: "Observação pública do teste.",
        observacoesInternas: `não publicar evento ${sufixo}`,
        publicado: false,
        ativo: true,
      },
    }, 201);
    criados.evento = respostaEvento.item.id;
    const slugEvento = respostaEvento.item.slug;
    await requisicaoPublica(`/api/eventos/${slugEvento}`, 404);

    // publica o evento e confirma o DTO e a página de detalhe públicos
    await requisicaoDominio(cookie, "/api/eventos", "PUT", {
      id: criados.evento,
      dados: { publicado: true },
    });
    const eventoPublico = (await requisicaoPublica(`/api/eventos/${slugEvento}?teste=${sufixo}`)).item;
    assert.equal(eventoPublico.id, criados.evento);
    assert.equal(eventoPublico.observacoesPublicas, "Observação pública do teste.");
    afirmarSemCamposPrivados(eventoPublico);
    assert.equal((await fetch(`${endereco}/eventos/internos/${slugEvento}`)).status, 200);

    // cria quatro equipes junto do campeonato e mantém a chave como rascunho
    const equipes = ["A", "B", "C", "D"].map((letra, indice) => ({
      nome: `Equipe ${letra} ${sufixo}`,
      nomeExibicao: `Equipe ${letra}`,
      posicaoInicial: indice + 1,
      ativo: true,
    }));
    const respostaCampeonato = await requisicaoDominio(cookie, "/api/interclasses", "POST", {
      dados: {
        nome: `Interclasse HTTP ${sufixo}`,
        edicao: "Teste local",
        ano: 2099,
        modalidade: "Futsal",
        categoria: "Misto",
        turno: "tarde",
        descricao: "Campeonato temporário do teste HTTP.",
        regulamento: "Mata-mata com quatro equipes.",
        formato: "mata_mata",
        situacao: "em_andamento",
        dataInicial: "2099-09-01",
        dataFinal: "2099-09-30",
        observacoesInternas: `não publicar campeonato ${sufixo}`,
        chavePublicada: false,
        publicado: false,
        ativo: true,
        participantes: equipes,
      },
    }, 201);
    criados.campeonato = respostaCampeonato.item.id;
    const slugCampeonato = respostaCampeonato.item.slug;
    await requisicaoPublica(`/api/interclasses/${slugCampeonato}`, 404);

    // a geração automática deve produzir duas semifinais e uma final
    const chave = await requisicaoDominio(cookie, "/api/interclasses", "PUT", {
      acao: "gerar_chave",
      id: criados.campeonato,
    });
    assert.equal(chave.participantes.length, 4);
    assert.equal(chave.fases.length, 2);
    assert.equal(chave.partidas.length, 3);
    criados.fases = chave.fases.map((item) => item.id);
    criados.participantes = chave.participantes.map((item) => item.id);

    const semifinal = chave.partidas.find((item) => (
      item.participanteAId && item.participanteBId && item.proximaPartidaId
    ));
    assert.ok(semifinal, "A chave de quatro equipes deve conter uma semifinal ligada à final.");
    const participanteInvalido = chave.participantes.find((item) => (
      item.id !== semifinal.participanteAId && item.id !== semifinal.participanteBId
    ));
    assert.ok(participanteInvalido);

    // rejeita um vencedor que não participou da partida
    const vencedorInvalido = await requisicaoDominio(cookie, "/api/interclasses", "PUT", {
      acao: "registrar_resultado",
      partidaId: semifinal.id,
      dados: {
        vencedorId: participanteInvalido.id,
        situacao: "wo",
        formaVitoria: "wo",
        placarPublicado: true,
      },
    }, 400);
    assert.match(vencedorInvalido.erro ?? "", /vencedor|partida|particip/i);

    // registra W.O. válido e confirma o avanço automático para a final
    const resultadoWo = await requisicaoDominio(cookie, "/api/interclasses", "PUT", {
      acao: "registrar_resultado",
      partidaId: semifinal.id,
      dados: {
        vencedorId: semifinal.participanteAId,
        situacao: "wo",
        formaVitoria: "wo",
        placarA: null,
        placarB: null,
        placarPublicado: true,
      },
    });
    assert.equal(resultadoWo.item.situacao, "wo");
    assert.equal(resultadoWo.item.vencedorId, semifinal.participanteAId);
    const chaveComAvanco = await requisicaoDominio(cookie, `/api/interclasses/${criados.campeonato}?todos=1`);
    const partidaSeguinte = chaveComAvanco.partidas.find((item) => item.id === semifinal.proximaPartidaId);
    assert.ok(partidaSeguinte);
    const campoAvanco = semifinal.proximaPosicao === "a" ? "participanteAId" : "participanteBId";
    assert.equal(partidaSeguinte[campoAvanco], semifinal.participanteAId);
    // enquanto outra semifinal está pendente, a fase atual continua coerentemente nela
    assert.equal(chaveComAvanco.item.faseAtual, semifinal.faseNome);

    // conclui a outra semifinal e confirma a transição da fase atual para a final
    const outraSemifinal = chaveComAvanco.partidas.find((item) => (
      item.id !== semifinal.id
      && item.faseId === semifinal.faseId
      && item.participanteAId
      && item.participanteBId
      && item.proximaPartidaId === semifinal.proximaPartidaId
    ));
    assert.ok(outraSemifinal, "A chave deve conter uma segunda semifinal ligada à mesma final.");
    await requisicaoDominio(cookie, "/api/interclasses", "PUT", {
      acao: "registrar_resultado",
      partidaId: outraSemifinal.id,
      dados: {
        vencedorId: outraSemifinal.participanteAId,
        situacao: "encerrada",
        formaVitoria: "placar",
        placarA: 2,
        placarB: 1,
        placarPublicado: true,
      },
    });
    const chaveNaFinal = await requisicaoDominio(cookie, `/api/interclasses/${criados.campeonato}?todos=1`);
    const final = chaveNaFinal.partidas.find((item) => item.id === semifinal.proximaPartidaId);
    assert.ok(final);
    assert.notEqual(final.faseNome, semifinal.faseNome);
    assert.equal(chaveNaFinal.item.faseAtual, final.faseNome);
    assert.equal(chaveNaFinal.item.proximaPartida?.id, final.id);
    assert.ok(chaveNaFinal.item.ultimoResultado);

    // publica apenas o campeonato; a chave e seus resumos ainda devem permanecer ocultos
    await requisicaoDominio(cookie, "/api/interclasses", "PUT", {
      id: criados.campeonato,
      dados: { publicado: true, chavePublicada: false },
    });
    const campeonatoSemChave = await requisicaoPublica(
      `/api/interclasses/${slugCampeonato}?teste=sem-chave-${sufixo}`,
    );
    assert.equal(campeonatoSemChave.item.id, criados.campeonato);
    assert.equal(campeonatoSemChave.item.chavePublicada, false);
    assert.equal(campeonatoSemChave.item.proximaPartida, null);
    assert.equal(campeonatoSemChave.item.ultimoResultado, null);
    assert.deepEqual(campeonatoSemChave.participantes, []);
    assert.deepEqual(campeonatoSemChave.fases, []);
    assert.deepEqual(campeonatoSemChave.partidas, []);
    afirmarSemCamposPrivados(campeonatoSemChave);
    await requisicaoPublica(
      `/api/interclasses/${slugCampeonato}/jogos/${semifinal.id}?teste=sem-chave-${sufixo}`,
      404,
    );

    // publica a chave como uma unidade e verifica jogos e resumos públicos
    await requisicaoDominio(cookie, "/api/interclasses", "PUT", {
      id: criados.campeonato,
      dados: { chavePublicada: true },
    });
    const campeonatoPublico = await requisicaoPublica(`/api/interclasses/${slugCampeonato}?teste=com-chave-${sufixo}`);
    assert.equal(campeonatoPublico.item.id, criados.campeonato);
    assert.equal(campeonatoPublico.item.chavePublicada, true);
    assert.equal(campeonatoPublico.participantes.length, 4);
    assert.equal(campeonatoPublico.partidas.length, 3);
    assert.equal(campeonatoPublico.item.proximaPartida?.id, final.id);
    assert.ok(campeonatoPublico.item.ultimoResultado);
    assert.ok(campeonatoPublico.partidas.some((item) => item.id === semifinal.id && item.situacao === "wo"));
    afirmarSemCamposPrivados(campeonatoPublico);
    const jogoPublico = await requisicaoPublica(`/api/interclasses/${slugCampeonato}/jogos/${semifinal.id}`);
    assert.equal(jogoPublico.item.vencedorId, semifinal.participanteAId);
    afirmarSemCamposPrivados(jogoPublico);
    assert.equal((await fetch(`${endereco}/eventos/interclasses/${slugCampeonato}`)).status, 200);
    assert.equal((await fetch(`${endereco}/eventos/interclasses/${slugCampeonato}/jogos/${semifinal.id}`)).status, 200);

    // cria uma reunião e mantém a pauta interna fora da resposta pública
    const respostaReuniao = await requisicaoDominio(cookie, "/api/reunioes", "POST", {
      dados: {
        titulo: `Reunião HTTP ${sufixo}`,
        tipo: "representantes",
        data: "2099-08-20",
        horarioInicial: "13:30",
        horarioFinal: "15:00",
        local: "Sala do GECEP",
        turno: "tarde",
        niveisEnsino: ["Ensino Médio"],
        descricaoCurta: "Reunião temporária do teste HTTP.",
        responsaveis: "GECEP",
        pauta: "Pauta pública do teste.",
        pautaInterna: `não publicar pauta ${sufixo}`,
        observacoesInternas: `não publicar reunião ${sufixo}`,
        situacao: "agendada",
        quantidadeParticipantesPublicada: false,
        publicado: false,
        ativo: true,
      },
    }, 201);
    criados.reuniao = respostaReuniao.item.id;
    const slugReuniao = respostaReuniao.item.slug;
    await requisicaoPublica(`/api/reunioes/${slugReuniao}`, 404);

    // gera a lista a partir do cadastro e guarda os dados como snapshot
    const geracaoPresencas = await requisicaoDominio(cookie, "/api/reunioes", "PUT", {
      acao: "gerar_presencas",
      id: criados.reuniao,
      filtros: { turma: "3ºJ" },
    });
    const presenca = geracaoPresencas.presencas.find((item) => item.representanteId === criados.representante);
    assert.ok(presenca, "A geração deve incluir o representante temporário.");
    criados.presencas.push(...geracaoPresencas.presencas.map((item) => item.id));
    assert.equal(presenca.nome, nomeExibicao);
    assert.equal(presenca.turma, "3º J");

    // alterar o cadastro atual não pode reescrever a presença histórica
    await requisicaoDominio(cookie, "/api/representantes", "PUT", {
      id: criados.representante,
      dados: { nomeExibicao: `${nomeExibicao} atualizado` },
    });
    const reuniaoComSnapshot = await requisicaoDominio(cookie, `/api/reunioes/${criados.reuniao}?todos=1`);
    assert.equal(reuniaoComSnapshot.presencas.find((item) => item.id === presenca.id)?.nome, nomeExibicao);

    // publica a presença, registra um encaminhamento e uma votação pública
    await requisicaoDominio(cookie, "/api/reunioes", "PUT", {
      entidade: "presencas",
      id: presenca.id,
      dados: {
        situacao: "presente",
        publicado: true,
        observacaoPublica: "Presença confirmada no teste local.",
      },
    });
    const itemReuniao = await requisicaoDominio(cookie, "/api/reunioes", "POST", {
      entidade: "itens",
      reuniaoId: criados.reuniao,
      dados: {
        tipo: "encaminhamento",
        titulo: `Encaminhamento ${sufixo}`,
        conteudo: "Executar a ação definida durante a reunião de teste.",
        responsaveis: "GECEP",
        prazo: "2099-08-30",
        ordem: 1,
        publicado: true,
        ativo: true,
      },
    }, 201);
    criados.itensReuniao.push(itemReuniao.item.id);
    assert.equal(itemReuniao.item.publicado, true);
    assert.equal(itemReuniao.item.ativo, true);

    // o detalhe administrativo preserva estado e uma edição parcial não despublica o item
    let detalheReuniaoAdministrativo = await requisicaoDominio(
      cookie,
      `/api/reunioes/${criados.reuniao}?todos=1`,
    );
    let itemAdministrativo = detalheReuniaoAdministrativo.itens.find((item) => item.id === itemReuniao.item.id);
    assert.equal(itemAdministrativo?.publicado, true);
    assert.equal(itemAdministrativo?.ativo, true);
    const conteudoItemAtualizado = "Executar e documentar a ação definida durante a reunião de teste.";
    const itemEditado = await requisicaoDominio(cookie, "/api/reunioes", "PUT", {
      entidade: "itens",
      id: itemReuniao.item.id,
      dados: { conteudo: conteudoItemAtualizado },
    });
    assert.equal(itemEditado.item.conteudo, conteudoItemAtualizado);
    assert.equal(itemEditado.item.publicado, true);
    assert.equal(itemEditado.item.ativo, true);
    detalheReuniaoAdministrativo = await requisicaoDominio(
      cookie,
      `/api/reunioes/${criados.reuniao}?todos=1&teste=item-editado-${sufixo}`,
    );
    itemAdministrativo = detalheReuniaoAdministrativo.itens.find((item) => item.id === itemReuniao.item.id);
    assert.equal(itemAdministrativo?.conteudo, conteudoItemAtualizado);
    assert.equal(itemAdministrativo?.publicado, true);
    assert.equal(itemAdministrativo?.ativo, true);

    const votacao = await requisicaoDominio(cookie, "/api/reunioes", "POST", {
      entidade: "votacoes",
      reuniaoId: criados.reuniao,
      dados: {
        titulo: `Votação ${sufixo}`,
        pergunta: "A proposta de teste foi aprovada?",
        resultado: "Aprovada",
        decisaoFinal: "Executar a proposta.",
        abstencoes: 0,
        ordem: 1,
        publicado: true,
        interno: false,
        ativo: true,
        opcoes: [
          { texto: "Sim", quantidadeVotos: 3, ordem: 1, ativo: true },
          { texto: "Não", quantidadeVotos: 1, ordem: 2, ativo: true },
        ],
      },
    }, 201);
    criados.votacoes.push(votacao.item.id);

    // publica a reunião e confere itens, votação e presença sem campos internos
    await requisicaoDominio(cookie, "/api/reunioes", "PUT", {
      id: criados.reuniao,
      dados: {
        publicado: true,
        situacao: "encerrada",
        quantidadeParticipantesPublicada: true,
      },
    });
    const reuniaoPublica = await requisicaoPublica(`/api/reunioes/${slugReuniao}?teste=${sufixo}`);
    assert.equal(reuniaoPublica.item.id, criados.reuniao);
    assert.equal(reuniaoPublica.item.quantidadeParticipantes, 1);
    assert.equal(
      reuniaoPublica.itens.find((item) => item.id === itemReuniao.item.id)?.conteudo,
      conteudoItemAtualizado,
    );
    assert.ok(reuniaoPublica.votacoes.some((item) => item.id === votacao.item.id && item.opcoes.length === 2));
    assert.ok(reuniaoPublica.presencas.some((item) => (
      item.id === presenca.id && item.nome === nomeExibicao && item.situacao === "presente"
    )));
    afirmarSemCamposPrivados(reuniaoPublica);
    assert.equal((await fetch(`${endereco}/eventos/reunioes/${slugReuniao}`)).status, 200);

    // uma reunião interna aceita membros manuais sem vínculo com representantes
    const reuniaoInterna = await requisicaoDominio(cookie, "/api/reunioes", "POST", {
      dados: {
        titulo: `Reunião interna HTTP ${sufixo}`,
        tipo: "interna_gecep",
        data: "2099-08-21",
        horarioInicial: "16:00",
        local: "Sala do GECEP",
        pautaInterna: `pauta estritamente interna ${sufixo}`,
        situacao: "encerrada",
        quantidadeParticipantesPublicada: true,
        publicado: false,
        ativo: true,
      },
    }, 201);
    criados.reuniaoInterna = reuniaoInterna.item.id;
    const presencaManual = await requisicaoDominio(cookie, "/api/reunioes", "POST", {
      entidade: "presencas",
      reuniaoId: criados.reuniaoInterna,
      dados: {
        nome: `Membro GECEP ${sufixo}`,
        funcao: "membro",
        situacao: "presente",
        observacaoInterna: `não publicar presença interna ${sufixo}`,
        publicado: true,
        ativo: true,
      },
    }, 201);
    criados.presencas.push(presencaManual.item.id);
    await requisicaoDominio(cookie, "/api/reunioes", "PUT", {
      id: criados.reuniaoInterna,
      dados: { publicado: true },
    });
    const internaPublica = await requisicaoPublica(`/api/reunioes/${reuniaoInterna.item.slug}`);
    assert.ok(internaPublica.presencas.some((item) => item.id === presencaManual.item.id));
    afirmarSemCamposPrivados(internaPublica);
  } finally {
    // todo registro temporário é despublicado e arquivado, inclusive filhos acessíveis pela API
    await arquivarSistemaEventosSemFalhar(cookie, criados);
  }
}

// envia uma requisição autenticada e inclui o erro da API na falha do teste
async function requisicaoDominio(cookie, caminho, method = "GET", body, statusEsperado = 200) {
  const resposta = await fetch(`${endereco}${caminho}`, {
    method,
    headers: {
      cookie,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const resultado = await resposta.json();
  assert.equal(
    resposta.status,
    statusEsperado,
    resultado.erro || `Falha em ${method} ${caminho}: HTTP ${resposta.status}`,
  );
  return resultado;
}

// lê uma resposta JSON pública e aceita um status específico para cenários negativos
async function requisicaoPublica(caminho, statusEsperado = 200) {
  const resposta = await fetch(`${endereco}${caminho}`, { cache: "no-store" });
  const resultado = await resposta.json();
  assert.equal(
    resposta.status,
    statusEsperado,
    resultado.erro || `Falha em GET público ${caminho}: HTTP ${resposta.status}`,
  );
  return resultado;
}

// percorre o DTO público para impedir regressões de privacidade em objetos aninhados
function afirmarSemCamposPrivados(valor, caminho = "resposta") {
  const camposPrivados = new Set([
    "ativo",
    "arquivadoEm",
    "arquivoChave",
    "criadoEm",
    "interno",
    "observacaoInterna",
    "observacoesInternas",
    "pautaInterna",
    "publicado",
    "quantidadeParticipantesPublicada",
    "representanteId",
    "reuniaoId",
    "turmaAtividadeId",
  ]);
  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => afirmarSemCamposPrivados(item, `${caminho}[${indice}]`));
    return;
  }
  if (!valor || typeof valor !== "object") return;
  for (const [chave, item] of Object.entries(valor)) {
    assert.ok(!camposPrivados.has(chave), `O campo privado ${caminho}.${chave} vazou no DTO público.`);
    afirmarSemCamposPrivados(item, `${caminho}.${chave}`);
  }
}

// despublica e arquiva os dados temporários sem esconder a falha original do teste
async function arquivarSistemaEventosSemFalhar(cookie, criados) {
  const reunioesCriadas = [criados.reuniao, criados.reuniaoInterna].filter(Boolean);
  if (reunioesCriadas.length) {
    // recupera também os filhos criados imediatamente antes de uma eventual falha
    for (const reuniaoId of reunioesCriadas) {
      try {
        const detalhe = await requisicaoDominio(cookie, `/api/reunioes/${reuniaoId}?todos=1`);
        criados.presencas.push(...detalhe.presencas.map((item) => item.id));
        criados.votacoes.push(...detalhe.votacoes.map((item) => item.id));
        criados.itensReuniao.push(...detalhe.itens.map((item) => item.id));
      } catch {
        // a limpeza segue com os identificadores já conhecidos
      }
    }
    for (const [entidade, ids] of [
      ["presencas", criados.presencas],
      ["votacoes", criados.votacoes],
      ["itens", criados.itensReuniao],
    ]) {
      for (const id of new Set(ids)) await arquivarFilhoSemFalhar(cookie, "/api/reunioes", entidade, id);
    }
    for (const reuniaoId of reunioesCriadas) {
      await despublicarEArquivarSemFalhar(cookie, "/api/reunioes", reuniaoId);
    }
  }

  if (criados.campeonato) {
    // consulta novamente para também limpar filhos criados antes de uma eventual falha
    try {
      const detalhe = await requisicaoDominio(cookie, `/api/interclasses/${criados.campeonato}?todos=1`);
      criados.fases.push(...detalhe.fases.map((item) => item.id));
      criados.participantes.push(...detalhe.participantes.map((item) => item.id));
    } catch {
      // a limpeza segue com os identificadores já conhecidos
    }
    for (const id of new Set(criados.fases)) await arquivarFilhoSemFalhar(cookie, "/api/interclasses", "fases", id);
    for (const id of new Set(criados.participantes)) await arquivarFilhoSemFalhar(cookie, "/api/interclasses", "participantes", id);
    await despublicarEArquivarSemFalhar(cookie, "/api/interclasses", criados.campeonato, { chavePublicada: false });
  }

  if (criados.evento) await despublicarEArquivarSemFalhar(cookie, "/api/eventos", criados.evento);
  if (criados.representante) await despublicarEArquivarSemFalhar(cookie, "/api/representantes", criados.representante);
}

// arquiva uma subentidade sem lançar erros durante o bloco finally
async function arquivarFilhoSemFalhar(cookie, api, entidade, id) {
  try {
    await fetch(`${endereco}${api}?entidade=${entidade}&id=${id}`, { method: "DELETE", headers: { cookie } });
  } catch {
    // a falha original continuará sendo apresentada pelo teste
  }
}

// remove uma entidade da área pública antes de guardar seu histórico como arquivado
async function despublicarEArquivarSemFalhar(cookie, api, id, extras = {}) {
  try {
    await fetch(`${endereco}${api}`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ id, dados: { publicado: false, ...extras } }),
    });
    await fetch(`${endereco}${api}?id=${id}`, { method: "DELETE", headers: { cookie } });
  } catch {
    // a falha original continuará sendo apresentada pelo teste
  }
}

// testa a administração completa do mapa
async function testarMapa(cookie) {
  // cria nomes únicos para os dados temporários
  const sufixo = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  // guarda os códigos para a limpeza final
  let idLocal = 0;
  let idTurma = 0;
  let idEnsalamento = 0;

  try {
    // rejeita uma ala que não existe
    const alaInvalida = await fetch(`${endereco}/api/mapa`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        entidade: "locais",
        dados: {
          nome: `Local com ala inválida ${sufixo}`,
          tipo: "outro",
          ala: "Ala de teste",
          ativo: true,
          publicado: true,
        },
      }),
    });
    assert.equal(alaInvalida.status, 400);
    assert.match((await alaInvalida.json()).erro ?? "", /ala/i);

    // exporta todos os dados do mapa
    const respostaExportacao = await fetch(`${endereco}/api/mapa?todos=1&exportar=1`, { headers: { cookie } });
    assert.equal(respostaExportacao.status, 200);
    const exportacao = await respostaExportacao.json();
    assert.equal(exportacao.versao, 1);
    assert.ok(Array.isArray(exportacao.locais));

    // exige confirmação antes da importação
    const importacaoSemConfirmar = await fetch(`${endereco}/api/mapa`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ acao: "importar", dados: exportacao }),
    });
    assert.equal(importacaoSemConfirmar.status, 400);

    // cria um local temporário
    const local = await requisicaoMapa(cookie, "POST", {
      entidade: "locais",
      dados: {
        nome: `Local temporário ${sufixo}`,
        numero: `T${String(Date.now()).slice(-8)}`,
        nomeAlternativo: `Apelido local ${sufixo}`,
        tipo: "sala_aula",
        ala: "Fora do prédio",
        andar: "Andar de teste",
        observacoes: "Observação exclusiva do local.",
        ativo: true,
        publicado: false,
      },
    }, 201);
    idLocal = local.item.id;

    // cria uma atividade temporária
    const turma = await requisicaoMapa(cookie, "POST", {
      entidade: "turmas",
      dados: {
        nome: `Atividade temporária ${sufixo}`,
        aliases: `apelido ${sufixo}`,
        turno: "tarde",
        tipo: "outro",
        observacoes: "Observação exclusiva da atividade.",
        ativo: true,
        publicado: false,
      },
    }, 201);
    idTurma = turma.item.id;

    // liga a atividade ao local
    const ensalamento = await requisicaoMapa(cookie, "POST", {
      entidade: "ensalamentos",
      dados: {
        turmaAtividadeId: idTurma,
        localId: idLocal,
        turno: "tarde",
        tipo: "outro",
        observacoes: "Observação exclusiva do ensalamento.",
        ativo: true,
        publicado: false,
      },
    }, 201);
    idEnsalamento = ensalamento.item.id;

    // confirma que rascunhos não aparecem no mapa público
    let publico = await obterMapaPublico(sufixo);
    assert.ok(!publico.locais.some((item) => item.id === idLocal));
    assert.ok(!publico.turmas.some((item) => item.id === idTurma));
    assert.ok(!publico.ensalamentos.some((item) => item.id === idEnsalamento));

    // publica o local temporário
    await requisicaoMapa(cookie, "PUT", {
      entidade: "locais",
      id: idLocal,
      dados: {
        nome: `Local temporário ${sufixo}`,
        numero: `T${String(Date.now()).slice(-8)}`,
        nomeAlternativo: `Apelido local ${sufixo}`,
        tipo: "sala_aula",
        ala: "Fora do prédio",
        andar: "Andar de teste",
        observacoes: "Observação exclusiva do local.",
        ativo: true,
        publicado: true,
      },
    });
    // publica a atividade temporária
    await requisicaoMapa(cookie, "PUT", {
      entidade: "turmas",
      id: idTurma,
      dados: {
        nome: `Atividade temporária ${sufixo}`,
        aliases: `apelido ${sufixo}`,
        turno: "tarde",
        tipo: "outro",
        observacoes: "Observação exclusiva da atividade.",
        ativo: true,
        publicado: true,
      },
    });
    // publica a ligação temporária
    await requisicaoMapa(cookie, "PUT", {
      entidade: "ensalamentos",
      id: idEnsalamento,
      dados: {
        turmaAtividadeId: idTurma,
        localId: idLocal,
        turno: "tarde",
        tipo: "outro",
        observacoes: "Observação exclusiva do ensalamento.",
        ativo: true,
        publicado: true,
      },
    });

    // confirma os dados publicados
    publico = await obterMapaPublico(sufixo);
    assert.equal(publico.locais.find((item) => item.id === idLocal)?.observacoes, "Observação exclusiva do local.");
    assert.equal(publico.turmas.find((item) => item.id === idTurma)?.observacoes, "Observação exclusiva da atividade.");
    // encontra a ligação publicada
    const vinculo = publico.ensalamentos.find((item) => item.id === idEnsalamento);
    assert.equal(vinculo?.localId, idLocal);
    assert.equal(vinculo?.observacoes, "Observação exclusiva do ensalamento.");

    // encontra a atividade publicada
    const turmaPublicada = publico.turmas.find((item) => item.id === idTurma);
    assert.ok(turmaPublicada);
    assert.ok(vinculo);

    // esconde uma ligação com validade futura
    await requisicaoMapa(cookie, "PUT", {
      entidade: "ensalamentos",
      id: idEnsalamento,
      dados: { ...vinculo, inicioValidade: "2999-01-01", ativo: true, publicado: true },
    });
    publico = await obterMapaPublico(`${sufixo}-validade-futura`);
    assert.ok(!publico.ensalamentos.some((item) => item.id === idEnsalamento));
    // restaura a ligação sem data inicial
    await requisicaoMapa(cookie, "PUT", {
      entidade: "ensalamentos",
      id: idEnsalamento,
      dados: { ...vinculo, inicioValidade: "", ativo: true, publicado: true },
    });

    // esconde uma atividade com validade vencida
    await requisicaoMapa(cookie, "PUT", {
      entidade: "turmas",
      id: idTurma,
      dados: { ...turmaPublicada, fimValidade: "2000-01-01", ativo: true, publicado: true },
    });
    publico = await obterMapaPublico(`${sufixo}-validade-expirada`);
    assert.ok(!publico.turmas.some((item) => item.id === idTurma));
    assert.ok(!publico.ensalamentos.some((item) => item.id === idEnsalamento));
    // restaura a atividade sem data final
    await requisicaoMapa(cookie, "PUT", {
      entidade: "turmas",
      id: idTurma,
      dados: { ...turmaPublicada, fimValidade: "", ativo: true, publicado: true },
    });

    // importa uma atualização parcial
    const importacaoParcial = await requisicaoMapa(cookie, "POST", {
      acao: "importar",
      confirmar: true,
      dados: { versao: 1, turmas: [{ ...turmaPublicada, turno: "noite", ativo: true, publicado: true }] },
    });
    assert.equal(importacaoParcial.importados.turmas, 1);
    publico = await obterMapaPublico(`${sufixo}-importacao`);
    assert.equal(publico.turmas.find((item) => item.id === idTurma)?.turno, "noite");
    assert.equal(publico.ensalamentos.find((item) => item.id === idEnsalamento)?.turno, "noite");
    // repete a importação para conferir a estabilidade
    await requisicaoMapa(cookie, "POST", {
      acao: "importar",
      confirmar: true,
      dados: { versao: 1, turmas: [{ ...turmaPublicada, turno: "noite", ativo: true, publicado: true }] },
    });

    // devolve o turno original da atividade
    await requisicaoMapa(cookie, "PUT", {
      entidade: "turmas",
      id: idTurma,
      dados: { ...turmaPublicada, turno: "tarde", ativo: true, publicado: true },
    });

    // verifica a lista usada pelo painel
    const dadosAdministrativos = await fetch(`${endereco}/api/mapa?todos=1`, { headers: { cookie } });
    assert.equal(dadosAdministrativos.status, 200);
    const mapaAdministrativo = await dadosAdministrativos.json();
    assert.equal(mapaAdministrativo.turmas.filter((item) => item.id === idTurma).length, 1);
    const sala214 = mapaAdministrativo.locais.find((item) => item.numero === "214");
    assert.ok(sala214?.id);

    // troca o local da atividade
    await requisicaoMapa(cookie, "PUT", {
      entidade: "ensalamentos",
      id: idEnsalamento,
      dados: {
        turmaAtividadeId: idTurma,
        localId: sala214.id,
        turno: "tarde",
        tipo: "outro",
        observacoes: "Sala alterada pelo teste local.",
        ativo: true,
        publicado: true,
      },
    });
    publico = await obterMapaPublico(`${sufixo}-troca`);
    assert.equal(publico.ensalamentos.find((item) => item.id === idEnsalamento)?.localId, sala214.id);

    // volta a ligação para rascunho
    await requisicaoMapa(cookie, "PUT", {
      entidade: "ensalamentos",
      id: idEnsalamento,
      dados: {
        turmaAtividadeId: idTurma,
        localId: sala214.id,
        turno: "tarde",
        tipo: "outro",
        ativo: true,
        publicado: false,
      },
    });
    publico = await obterMapaPublico(`${sufixo}-rascunho`);
    assert.ok(!publico.ensalamentos.some((item) => item.id === idEnsalamento));

    // exclui os dados temporários
    await excluirMapa(cookie, "ensalamentos", idEnsalamento);
    idEnsalamento = 0;
    await excluirMapa(cookie, "turmas", idTurma);
    idTurma = 0;
    await excluirMapa(cookie, "locais", idLocal);
    idLocal = 0;
  } finally {
    // remove os dados que sobraram após uma falha
    if (idEnsalamento) await excluirMapaSemFalhar(cookie, "ensalamentos", idEnsalamento);
    if (idTurma) await excluirMapaSemFalhar(cookie, "turmas", idTurma);
    if (idLocal) await excluirMapaSemFalhar(cookie, "locais", idLocal);
  }
}

// envia um pedido ao mapa e confere a resposta
async function requisicaoMapa(cookie, method, body, statusEsperado = 200) {
  const resposta = await fetch(`${endereco}/api/mapa`, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const resultado = await resposta.json();
  assert.equal(resposta.status, statusEsperado, resultado.erro || `Falha em ${method} /api/mapa`);
  return resultado;
}

// lê o mapa público sem usar o cache
async function obterMapaPublico(chave) {
  const resposta = await fetch(`${endereco}/api/mapa?teste=${encodeURIComponent(chave)}`, { cache: "no-store" });
  assert.equal(resposta.status, 200);
  return resposta.json();
}

// tenta excluir um item durante a limpeza
async function excluirMapaSemFalhar(cookie, entidade, id) {
  await fetch(`${endereco}/api/mapa?entidade=${entidade}&id=${id}`, { method: "DELETE", headers: { cookie } });
}

// exclui um item e confere o resultado
async function excluirMapa(cookie, entidade, id) {
  const resposta = await fetch(`${endereco}/api/mapa?entidade=${entidade}&id=${id}`, { method: "DELETE", headers: { cookie } });
  const resultado = await resposta.json();
  assert.equal(resposta.status, 200, resultado.erro || `Falha ao excluir ${entidade}`);
  assert.equal(resultado.removido, true);
}

// testa a criação, edição e exclusão de conteúdo
async function testarConteudo(cookie) {
  // cria um projeto temporário
  const titulo = `Projeto de teste ${Date.now()}`;
  const respostaCriacao = await fetch(`${endereco}/api/conteudo`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "projetos",
      publicado: false,
      dados: { titulo, categoria: "Teste", estado: "Rascunho", texto: "Registro temporário do teste local.", link: "" },
    }),
  });
  assert.equal(respostaCriacao.status, 201);
  const criado = (await respostaCriacao.json()).item;
  assert.ok(criado?.id);

  // edita o projeto temporário
  const respostaEdicao = await fetch(`${endereco}/api/conteudo`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      id: criado.id,
      tipo: "projetos",
      publicado: false,
      dados: { titulo: `${titulo} editado`, categoria: "Teste", estado: "Rascunho", texto: "Registro temporário atualizado.", link: "" },
    }),
  });
  assert.equal(respostaEdicao.status, 200);

  // exclui o projeto temporário
  const respostaExclusao = await fetch(`${endereco}/api/conteudo?id=${criado.id}`, {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(respostaExclusao.status, 200);
}

// testa o recebimento e a administração de mensagens
async function testarMensagens(cookie) {
  // cria títulos únicos para as mensagens
  const titulo = `Mensagem de teste ${Date.now()}`;
  const tituloSemContato = `Mensagem sem contato ${Date.now()}`;
  // rejeita um contato que não é válido
  const respostaContatoInvalido = await fetch(`${endereco}/api/mensagens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nome: "Teste local",
      turma: "Teste",
      assunto: "Teste",
      titulo,
      mensagem: "Esta mensagem confirma a validação do contato opcional.",
      tipoContato: "email",
      contato: "email-invalido",
      anonimo: false,
      site: "",
    }),
  });
  assert.equal(respostaContatoInvalido.status, 400);

  // envia uma mensagem com contato
  const respostaEnvio = await fetch(`${endereco}/api/mensagens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nome: "Teste local",
      turma: "Teste",
      assunto: "Teste",
      titulo,
      mensagem: "Esta mensagem temporária confirma o funcionamento do formulário.",
      tipoContato: "whatsapp",
      contato: "(41) 99999-9999",
      anonimo: true,
      site: "",
    }),
  });
  assert.equal(respostaEnvio.status, 201);

  // envia uma mensagem sem contato
  const respostaSemContato = await fetch(`${endereco}/api/mensagens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nome: "Teste local",
      turma: "Teste",
      assunto: "Teste",
      titulo: tituloSemContato,
      mensagem: "Esta mensagem temporária confirma que o contato é opcional.",
      tipoContato: "",
      contato: "",
      anonimo: false,
      site: "",
    }),
  });
  assert.equal(respostaSemContato.status, 201);

  // encontra as mensagens no painel
  const respostaLista = await fetch(`${endereco}/api/mensagens`, { headers: { cookie } });
  assert.equal(respostaLista.status, 200);
  const lista = (await respostaLista.json()).mensagens;
  const mensagem = lista.find((item) => item.titulo === titulo);
  assert.ok(mensagem?.id);
  assert.match(mensagem.protocolo, /^GECEP-\d{4}-\d{5,}$/);
  assert.equal(mensagem.tipoContato, "whatsapp");
  assert.equal(mensagem.contato, "(41) 99999-9999");
  const mensagemSemContato = lista.find((item) => item.titulo === tituloSemContato);
  assert.ok(mensagemSemContato?.id);
  assert.equal(mensagemSemContato.tipoContato, "");
  assert.equal(mensagemSemContato.contato, "");

  // busca uma mensagem pelo protocolo
  const respostaBusca = await fetch(`${endereco}/api/mensagens?busca=${encodeURIComponent(mensagem.protocolo)}`, { headers: { cookie } });
  assert.equal(respostaBusca.status, 200);
  const resultadoBusca = await respostaBusca.json();
  assert.equal(resultadoBusca.total, 1);
  assert.equal(resultadoBusca.mensagens[0]?.id, mensagem.id);

  // cria mensagens extras para testar as páginas
  const idsMensagensExtras = [];
  for (let indice = 0; indice < 5; indice += 1) {
    const respostaExtra = await fetch(`${endereco}/api/mensagens`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nome: "Teste local",
        turma: "Teste",
        assunto: "Teste",
        titulo: `Mensagem extra ${indice} ${Date.now()}`,
        mensagem: "Esta mensagem temporária confirma a paginação do painel.",
        tipoContato: "",
        contato: "",
        anonimo: false,
        site: "",
      }),
    });
    assert.equal(respostaExtra.status, 201);
    const extra = await respostaExtra.json();
    // separa o número usado para excluir a mensagem
    idsMensagensExtras.push(Number(extra.protocolo.split("-").at(-1)));
  }

  // verifica a primeira página de mensagens
  const respostaPrimeiraPagina = await fetch(`${endereco}/api/mensagens?pagina=1`, { headers: { cookie } });
  assert.equal(respostaPrimeiraPagina.status, 200);
  const primeiraPagina = await respostaPrimeiraPagina.json();
  assert.equal(primeiraPagina.mensagens.length, 6);
  assert.ok(primeiraPagina.totalPaginas >= 2);

  // verifica a segunda página de mensagens
  const respostaSegundaPagina = await fetch(`${endereco}/api/mensagens?pagina=2`, { headers: { cookie } });
  assert.equal(respostaSegundaPagina.status, 200);
  const segundaPagina = await respostaSegundaPagina.json();
  assert.equal(segundaPagina.pagina, 2);
  assert.ok(segundaPagina.mensagens.length >= 1);

  // muda a mensagem para análise
  const respostaEstado = await fetch(`${endereco}/api/mensagens`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ id: mensagem.id, status: "em_analise" }),
  });
  assert.equal(respostaEstado.status, 200);

  // arquiva a mensagem
  const respostaArquivamento = await fetch(`${endereco}/api/mensagens`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ id: mensagem.id, status: "arquivada" }),
  });
  assert.equal(respostaArquivamento.status, 200);

  // esconde a mensagem arquivada da lista ativa
  const respostaBuscaAtivas = await fetch(`${endereco}/api/mensagens?busca=${encodeURIComponent(mensagem.protocolo)}`, { headers: { cookie } });
  assert.equal((await respostaBuscaAtivas.json()).total, 0);

  // encontra a mensagem na lista arquivada
  const respostaBuscaArquivadas = await fetch(`${endereco}/api/mensagens?arquivadas=1&busca=${encodeURIComponent(mensagem.protocolo)}`, { headers: { cookie } });
  assert.equal(respostaBuscaArquivadas.status, 200);
  const resultadoArquivadas = await respostaBuscaArquivadas.json();
  assert.equal(resultadoArquivadas.total, 1);
  assert.equal(resultadoArquivadas.mensagens[0]?.status, "arquivada");

  // exclui a mensagem com contato
  const respostaExclusao = await fetch(`${endereco}/api/mensagens?id=${mensagem.id}`, {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(respostaExclusao.status, 200);

  // exclui a mensagem sem contato
  const respostaExclusaoSemContato = await fetch(`${endereco}/api/mensagens?id=${mensagemSemContato.id}`, {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(respostaExclusaoSemContato.status, 200);

  // exclui as mensagens usadas na paginação
  for (const id of idsMensagensExtras) {
    const respostaExclusaoExtra = await fetch(`${endereco}/api/mensagens?id=${id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(respostaExclusaoExtra.status, 200);
  }
}

// testa o envio, a leitura e a exclusão de arquivos
async function testarArquivos(cookie) {
  // rejeita um arquivo cujo tipo declarado não corresponde ao conteúdo
  const formularioFalso = new FormData();
  formularioFalso.append("arquivo", new File(["não é uma imagem"], "falso.png", { type: "image/png" }));
  const respostaFalsa = await fetch(`${endereco}/api/arquivos`, {
    method: "POST",
    headers: { cookie },
    body: formularioFalso,
  });
  assert.equal(respostaFalsa.status, 400);

  // prepara uma imagem para o envio
  const bytes = await readFile("public/logo-gecep.png");
  const formulario = new FormData();
  // adiciona a imagem ao formulário
  formulario.append("arquivo", new File([bytes], "logo-teste.png", { type: "image/png" }));

  // envia a imagem ao servidor
  const respostaEnvio = await fetch(`${endereco}/api/arquivos`, {
    method: "POST",
    headers: { cookie },
    body: formulario,
  });
  assert.equal(respostaEnvio.status, 201);
  const arquivo = await respostaEnvio.json();
  assert.ok(arquivo.url && arquivo.chave);

  // lê a imagem pelo endereço recebido
  const respostaLeitura = await fetch(`${endereco}${arquivo.url}`);
  assert.equal(respostaLeitura.status, 200);
  assert.match(respostaLeitura.headers.get("content-type") ?? "", /image\/png/);

  // exclui a imagem enviada
  const respostaExclusao = await fetch(`${endereco}/api/arquivos/${encodeURIComponent(arquivo.chave)}`, {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(respostaExclusao.status, 200);

  // um anexo privado continua protegido mesmo para quem conhece sua URL
  const formularioPrivado = new FormData();
  formularioPrivado.append("arquivo", new File([bytes], "logo-privado.png", { type: "image/png" }));
  formularioPrivado.append("visibilidade", "privada");
  const respostaEnvioPrivado = await fetch(`${endereco}/api/arquivos`, {
    method: "POST",
    headers: { cookie },
    body: formularioPrivado,
  });
  assert.equal(respostaEnvioPrivado.status, 201);
  const privado = await respostaEnvioPrivado.json();
  assert.equal(privado.visibilidade, "privada");
  try {
    const leituraSemSessao = await fetch(`${endereco}${privado.url}`);
    assert.equal(leituraSemSessao.status, 401);
    const leituraComSessao = await fetch(`${endereco}${privado.url}`, { headers: { cookie } });
    assert.equal(leituraComSessao.status, 200);
    assert.equal(leituraComSessao.headers.get("cache-control"), "private, no-store");
  } finally {
    await fetch(`${endereco}/api/arquivos/${encodeURIComponent(privado.chave)}`, {
      method: "DELETE",
      headers: { cookie },
    });
  }

  // uma chave compartilhada não pode ser privatizada pela cópia em rascunho
  const formularioCompartilhado = new FormData();
  formularioCompartilhado.append("arquivo", new File([bytes], "capa-compartilhada.png", { type: "image/png" }));
  formularioCompartilhado.append("visibilidade", "privada");
  const envioCompartilhado = await fetch(`${endereco}/api/arquivos`, {
    method: "POST",
    headers: { cookie },
    body: formularioCompartilhado,
  });
  assert.equal(envioCompartilhado.status, 201);
  const compartilhado = await envioCompartilhado.json();
  let eventoOrigem = 0;
  let eventoCopia = 0;
  try {
    const sufixo = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000)}`;
    const origem = await requisicaoDominio(cookie, "/api/eventos", "POST", {
      dados: {
        titulo: `Evento com capa compartilhada ${sufixo}`,
        dataInicial: "2099-11-01",
        situacao: "proximo",
        imagemCapaUrl: compartilhado.url,
        publicado: true,
        ativo: true,
      },
    }, 201);
    eventoOrigem = origem.item.id;
    assert.equal((await fetch(`${endereco}${compartilhado.url}`)).status, 200);

    const copia = await requisicaoDominio(cookie, "/api/eventos", "POST", {
      acao: "duplicar",
      id: eventoOrigem,
    }, 201);
    eventoCopia = copia.item.id;
    assert.equal(copia.item.publicado, false);
    assert.equal(
      (await fetch(`${endereco}${compartilhado.url}`)).status,
      200,
      "A cópia em rascunho não pode privatizar a capa da origem publicada.",
    );

    await requisicaoDominio(cookie, `/api/eventos?id=${eventoOrigem}`, "DELETE");
    assert.equal(
      (await fetch(`${endereco}${compartilhado.url}`)).status,
      200,
      "O arquivo de um evento arquivado e ainda publicado deve continuar acessível.",
    );

    await requisicaoDominio(cookie, "/api/eventos", "PUT", {
      id: eventoOrigem,
      dados: { publicado: false },
    });
    assert.equal(
      (await fetch(`${endereco}${compartilhado.url}`)).status,
      401,
      "Sem referências públicas restantes, a chave deve voltar a ser privada.",
    );
  } finally {
    if (eventoCopia) await despublicarEArquivarSemFalhar(cookie, "/api/eventos", eventoCopia);
    if (eventoOrigem) await despublicarEArquivarSemFalhar(cookie, "/api/eventos", eventoOrigem);
    await fetch(`${endereco}/api/arquivos/${encodeURIComponent(compartilhado.chave)}`, {
      method: "DELETE",
      headers: { cookie },
    });
  }
}
