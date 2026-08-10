import {
  arquivarReuniao,
  arquivarSubentidadeReuniao,
  atualizarDocumentoReuniao,
  atualizarItemReuniao,
  atualizarPresencaReuniao,
  atualizarReuniao,
  atualizarStatusPresencasEmMassa,
  atualizarVotacaoReuniao,
  criarDocumentoReuniao,
  criarItemReuniao,
  criarPresencaReuniao,
  criarReuniao,
  criarVotacaoReuniao,
  duplicarReuniao,
  gerarPresencasDeRepresentantes,
  listarReunioes,
  obterDocumentoParaSincronizacao,
  obterReuniao,
} from "../../eventos/banco";
import { dadosDoCorpo, ErroEventos, objetoRecebido } from "../../eventos/validacao";
import {
  lerObjeto,
  prepararEscrita,
  prepararLeitura,
  responderErroEventos,
  sincronizarArquivosDoEvento,
  sincronizarVisibilidadeArquivo,
} from "../eventos/apoio";

export async function GET(request: Request) {
  try {
    const { parametros, todos, bloqueio } = await prepararLeitura(request);
    if (bloqueio) return bloqueio;
    return Response.json(await listarReunioes(parametros, todos), {
      headers: { "cache-control": todos ? "private, no-store" : "public, max-age=30" },
    });
  } catch (erro) {
    return responderErroEventos(erro, "GET /api/reunioes");
  }
}

export async function POST(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    if (corpo.acao === "duplicar") {
      const item = await duplicarReuniao(corpo.id);
      await sincronizarArquivosDoEvento({ documentos: item.documentos });
      return Response.json({ item }, { status: 201 });
    }
    const entidade = String(corpo.entidade ?? "");
    const reuniaoId = corpo.reuniaoId ?? corpo.id;
    if (entidade === "itens") return Response.json({ item: await criarItemReuniao(reuniaoId, corpo.dados) }, { status: 201 });
    if (entidade === "documentos") {
      const dados = objetoRecebido(corpo.dados);
      const item = await criarDocumentoReuniao(reuniaoId, dados);
      await sincronizarVisibilidadeArquivo(item);
      return Response.json({ item }, { status: 201 });
    }
    if (entidade === "votacoes") return Response.json({ item: await criarVotacaoReuniao(reuniaoId, corpo.dados) }, { status: 201 });
    if (entidade === "presencas") return Response.json({ item: await criarPresencaReuniao(reuniaoId, corpo.dados) }, { status: 201 });
    if (entidade) throw new ErroEventos("Escolha uma área válida da reunião.");
    const item = await criarReuniao(dadosDoCorpo(corpo));
    return Response.json({ item }, { status: 201 });
  } catch (erro) {
    return responderErroEventos(erro, "POST /api/reunioes");
  }
}

export async function PUT(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    if (corpo.acao === "gerar_presencas") {
      return Response.json(await gerarPresencasDeRepresentantes(corpo.id, corpo.filtros));
    }
    if (corpo.acao === "status_presencas") {
      return Response.json(await atualizarStatusPresencasEmMassa(corpo.id, corpo.situacao, corpo.ids, corpo.filtros));
    }
    const entidade = String(corpo.entidade ?? "");
    if (entidade === "itens") return Response.json({ item: await atualizarItemReuniao(corpo.id, corpo.dados) });
    if (entidade === "documentos") {
      const dados = objetoRecebido(corpo.dados);
      const anterior = await obterDocumentoParaSincronizacao("reuniao", corpo.id);
      const item = await atualizarDocumentoReuniao(corpo.id, dados);
      await sincronizarVisibilidadeArquivo(anterior);
      await sincronizarVisibilidadeArquivo(item);
      return Response.json({ item });
    }
    if (entidade === "votacoes") return Response.json({ item: await atualizarVotacaoReuniao(corpo.id, corpo.dados) });
    if (entidade === "presencas") return Response.json({ item: await atualizarPresencaReuniao(corpo.id, corpo.dados) });
    if (entidade) throw new ErroEventos("Escolha uma área editável válida da reunião.");
    const anterior = await obterReuniao(String(corpo.id ?? ""), true);
    const item = await atualizarReuniao(corpo.id, dadosDoCorpo(corpo));
    const atual = await obterReuniao(String(corpo.id ?? ""), true);
    await sincronizarArquivosDoEvento(
      { documentos: anterior.documentos },
      { documentos: atual.documentos },
    );
    return Response.json({ item });
  } catch (erro) {
    return responderErroEventos(erro, "PUT /api/reunioes");
  }
}

export async function DELETE(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const parametros = new URL(request.url).searchParams;
    const id = parametros.get("id");
    const entidade = parametros.get("entidade");
    if (entidade === "itens" || entidade === "documentos" || entidade === "votacoes" || entidade === "presencas") {
      const anterior = entidade === "documentos" ? await obterDocumentoParaSincronizacao("reuniao", id) : null;
      const resposta = await arquivarSubentidadeReuniao(entidade, id);
      if (anterior) await sincronizarVisibilidadeArquivo(anterior);
      return Response.json(resposta);
    }
    if (entidade) throw new ErroEventos("Escolha uma área válida da reunião.");
    const anterior = await obterReuniao(String(id ?? ""), true);
    const resposta = await arquivarReuniao(id);
    await sincronizarArquivosDoEvento({ documentos: anterior.documentos });
    return Response.json(resposta);
  } catch (erro) {
    return responderErroEventos(erro, "DELETE /api/reunioes");
  }
}
