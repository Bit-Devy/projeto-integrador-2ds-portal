import {
  arquivarDocumentoEvento,
  arquivarEvento,
  atualizarDocumentoEvento,
  atualizarEvento,
  criarDocumentoEvento,
  criarEvento,
  duplicarEvento,
  listarEventos,
  obterDocumentoParaSincronizacao,
  obterCentralEventos,
  obterEvento,
} from "../../eventos/banco";
import { dadosDoCorpo, ErroEventos } from "../../eventos/validacao";
import {
  lerObjeto,
  prepararEscrita,
  prepararLeitura,
  responderErroEventos,
  sincronizarArquivosDoEvento,
  sincronizarVisibilidadeArquivo,
} from "./apoio";

export async function GET(request: Request) {
  try {
    const { parametros, todos, bloqueio } = await prepararLeitura(request);
    if (bloqueio) return bloqueio;
    if (parametros.get("central") === "1" || parametros.get("visao") === "central") {
      if (todos) throw new ErroEventos("A central é uma projeção exclusivamente pública.");
      return Response.json(await obterCentralEventos(), { headers: { "cache-control": "public, max-age=30" } });
    }
    return Response.json(await listarEventos(parametros, todos), {
      headers: { "cache-control": todos ? "private, no-store" : "public, max-age=30" },
    });
  } catch (erro) {
    return responderErroEventos(erro, "GET /api/eventos");
  }
}

export async function POST(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    if (corpo.acao === "duplicar") {
      const item = await duplicarEvento(corpo.id);
      await sincronizarArquivosDoEvento(item);
      return Response.json({ item }, { status: 201 });
    }
    if (corpo.entidade === "documentos") {
      const dados = dadosDoCorpo(corpo);
      const item = await criarDocumentoEvento(corpo.eventoId ?? corpo.id, dados);
      await sincronizarVisibilidadeArquivo(item);
      return Response.json({ item }, { status: 201 });
    }
    const item = await criarEvento(dadosDoCorpo(corpo));
    await sincronizarArquivosDoEvento(item);
    return Response.json({ item }, { status: 201 });
  } catch (erro) {
    return responderErroEventos(erro, "POST /api/eventos");
  }
}

export async function PUT(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    if (corpo.entidade === "documentos") {
      const dados = dadosDoCorpo(corpo);
      const anterior = await obterDocumentoParaSincronizacao("evento", corpo.id);
      const item = await atualizarDocumentoEvento(corpo.id, dados);
      await sincronizarVisibilidadeArquivo(anterior);
      await sincronizarVisibilidadeArquivo(item);
      return Response.json({ item });
    }
    if (corpo.acao === "duplicar") {
      const item = await duplicarEvento(corpo.id);
      await sincronizarArquivosDoEvento(item);
      return Response.json({ item });
    }
    const anterior = await obterEvento(String(corpo.id ?? ""), true);
    const item = await atualizarEvento(corpo.id, dadosDoCorpo(corpo));
    await sincronizarArquivosDoEvento(anterior, item);
    return Response.json({ item });
  } catch (erro) {
    return responderErroEventos(erro, "PUT /api/eventos");
  }
}

export async function DELETE(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const parametros = new URL(request.url).searchParams;
    const id = parametros.get("id");
    if (parametros.get("entidade") === "documentos") {
      const anterior = await obterDocumentoParaSincronizacao("evento", id);
      const resposta = await arquivarDocumentoEvento(id);
      await sincronizarVisibilidadeArquivo(anterior);
      return Response.json(resposta);
    }
    const anterior = await obterEvento(String(id ?? ""), true);
    const resposta = await arquivarEvento(id);
    await sincronizarArquivosDoEvento(anterior);
    return Response.json(resposta);
  } catch (erro) {
    return responderErroEventos(erro, "DELETE /api/eventos");
  }
}
