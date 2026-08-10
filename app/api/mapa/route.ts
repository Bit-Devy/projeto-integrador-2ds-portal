// importa a preparação das tabelas
import { garantirBanco } from "../../../db/inicializar";
// importa as operações do banco do mapa
import {
  atualizarRegistroMapa,
  criarRegistroMapa,
  excluirRegistroMapa,
  exportarDadosMapa,
  importarDadosMapa,
  obterDadosMapa,
} from "../../mapa/banco";
// importa o tipo das entidades do mapa
import type { EntidadeMapa } from "../../mapa/tipos";
// importa os formatos privado e público do mapa
import type { DadosMapa, DadosMapaPublico } from "../../mapa/tipos";
// importa a normalização dos turnos
import { normalizarTurno } from "../../mapa/normalizacao";
// importa os recursos de validação do mapa
import { ErroMapa, objetoRecebido } from "../../mapa/validacao";
// importa as verificações de administrador e origem
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";

// lista as entidades aceitas pela api
const entidades: EntidadeMapa[] = ["categorias", "locais", "turmas", "ensalamentos"];

// lista ou exporta os dados do mapa
export async function GET(request: Request) {
  try {
    // prepara o banco e lê os parâmetros
    await garantirBanco();
    const parametros = new URL(request.url).searchParams;
    const todos = parametros.get("todos") === "1";
    const exportar = parametros.get("exportar") === "1";
    // exige administrador para dados privados ou exportação
    if (todos || exportar) {
      const { resposta } = await exigirAdministradorApi();
      if (resposta) return resposta;
    }
    // valida o turno recebido
    const turnoRecebido = parametros.get("turno")?.slice(0, 20);
    if (turnoRecebido && !normalizarTurno(turnoRecebido)) {
      throw new ErroMapa("Escolha um turno válido.");
    }

    // exporta a cópia completa quando solicitado
    if (exportar) return respostaJson(await exportarDadosMapa(), 200, true);
    // busca os dados com os filtros recebidos
    const dados = await obterDadosMapa({
      todos,
      busca: parametros.get("busca")?.slice(0, 120),
      turno: turnoRecebido,
      tipo: parametros.get("tipo")?.slice(0, 80),
    });
    // esconde os campos internos da resposta pública
    return respostaJson(todos ? dados : dadosPublicos(dados), 200, todos);
  } catch (erro) {
    return responderErro(erro);
  }
}

// cria um registro ou importa uma cópia do mapa
export async function POST(request: Request) {
  // exige uma chamada válida de administrador
  const bloqueio = await autorizarEscrita(request);
  if (bloqueio) return bloqueio;

  try {
    // prepara o banco e valida o corpo recebido
    await garantirBanco();
    const corpo = objetoRecebido(await request.json());
    // executa a importação quando solicitada
    if (corpo.acao === "importar") {
      if (corpo.confirmar !== true) {
        throw new ErroMapa("Confirme a importação antes de alterar os dados.");
      }
      return Response.json(await importarDadosMapa(corpo.dados));
    }

    // cria um registro na entidade informada
    const entidade = validarEntidade(corpo.entidade);
    const item = await criarRegistroMapa(entidade, corpo.dados);
    if (!item) throw new Error("O banco não devolveu o registro criado.");
    return Response.json({ item }, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}

// atualiza um registro do mapa
export async function PUT(request: Request) {
  // exige uma chamada válida de administrador
  const bloqueio = await autorizarEscrita(request);
  if (bloqueio) return bloqueio;

  try {
    // prepara o banco e valida o corpo recebido
    await garantirBanco();
    const corpo = objetoRecebido(await request.json());
    // atualiza o registro na entidade informada
    const entidade = validarEntidade(corpo.entidade);
    const item = await atualizarRegistroMapa(entidade, corpo.id, corpo.dados);
    if (!item) throw new Error("O banco não devolveu o registro atualizado.");
    return Response.json({ item });
  } catch (erro) {
    return responderErro(erro);
  }
}

// exclui um registro do mapa
export async function DELETE(request: Request) {
  // exige uma chamada válida de administrador
  const bloqueio = await autorizarEscrita(request);
  if (bloqueio) return bloqueio;

  try {
    // prepara o banco e lê os parâmetros
    await garantirBanco();
    const parametros = new URL(request.url).searchParams;
    const entidadeUrl = parametros.get("entidade");
    const idUrl = parametros.get("id");
    // aceita o identificador enviado no endereço
    if (entidadeUrl || idUrl) {
      const entidade = validarEntidade(entidadeUrl);
      return Response.json(await excluirRegistroMapa(entidade, idUrl));
    }

    // aceita também o identificador enviado no corpo
    const corpo = objetoRecebido(await request.json());
    const entidade = validarEntidade(corpo.entidade);
    return Response.json(await excluirRegistroMapa(entidade, corpo.id));
  } catch (erro) {
    return responderErro(erro);
  }
}

// protege as operações de escrita
async function autorizarEscrita(request: Request) {
  // bloqueia chamadas de outra origem
  if (!origemValida(request)) {
    return Response.json({ erro: "Origem inválida." }, { status: 403 });
  }
  const { resposta } = await exigirAdministradorApi();
  return resposta;
}

// confirma se a entidade existe
function validarEntidade(valor: unknown): EntidadeMapa {
  if (!entidades.includes(valor as EntidadeMapa)) {
    throw new ErroMapa("Escolha uma entidade válida do mapa.");
  }
  return valor as EntidadeMapa;
}

// transforma erros em respostas da api
function responderErro(erro: unknown) {
  // mantém a mensagem e o estado dos erros esperados
  if (erro instanceof ErroMapa) {
    return Response.json({ erro: erro.message }, { status: erro.status });
  }
  // informa quando o json recebido está quebrado
  if (erro instanceof SyntaxError) {
    return Response.json({ erro: "O corpo da solicitação não contém JSON válido." }, { status: 400 });
  }
  // explica conflitos entre registros relacionados
  if (erro instanceof Error && /foreign key constraint/i.test(erro.message)) {
    return Response.json({ erro: "O registro ainda está relacionado a outros dados do mapa." }, { status: 409 });
  }
  console.error("Erro na API do mapa do colégio:", erro);
  return Response.json({ erro: "Não foi possível concluir a operação no mapa do colégio." }, { status: 500 });
}

// cria uma resposta com a regra de cache correta
function respostaJson(dados: unknown, status: number, privado: boolean) {
  return Response.json(dados, {
    status,
    headers: {
      "cache-control": privado ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

// remove campos internos dos dados públicos
function dadosPublicos(dados: DadosMapa): DadosMapaPublico {
  return {
    // seleciona somente os campos públicos de cada entidade
    categorias: dados.categorias.map(({ id, grupo, slug, nome, ordem }) => ({ id, grupo, slug, nome, ordem })),
    locais: dados.locais.map((local) => ({
      id: local.id, nome: local.nome, numero: local.numero, nomeAlternativo: local.nomeAlternativo,
      tipo: local.tipo, ala: local.ala, andar: local.andar, bloco: local.bloco, setor: local.setor,
      corredor: local.corredor, referencia: local.referencia, descricao: local.descricao,
      instrucoes: local.instrucoes, observacoes: local.observacoes, acessibilidade: local.acessibilidade,
      horario: local.horario, imagemUrl: local.imagemUrl, ordem: local.ordem, atualizadoEm: local.atualizadoEm,
    })),
    turmas: dados.turmas.map((turma) => ({
      id: turma.id, nome: turma.nome, nomeNormalizado: turma.nomeNormalizado, aliases: turma.aliases,
      turno: turma.turno, tipo: turma.tipo, curso: turma.curso, serie: turma.serie, turma: turma.turma,
      descricao: turma.descricao, observacoes: turma.observacoes, inicioValidade: turma.inicioValidade,
      fimValidade: turma.fimValidade, ordem: turma.ordem, atualizadoEm: turma.atualizadoEm,
    })),
    ensalamentos: dados.ensalamentos.map((ensalamento) => ({
      id: ensalamento.id, turmaAtividadeId: ensalamento.turmaAtividadeId, localId: ensalamento.localId,
      turno: ensalamento.turno, tipo: ensalamento.tipo, observacoes: ensalamento.observacoes,
      inicioValidade: ensalamento.inicioValidade, fimValidade: ensalamento.fimValidade,
      ordem: ensalamento.ordem, atualizadoEm: ensalamento.atualizadoEm,
    })),
  };
}
