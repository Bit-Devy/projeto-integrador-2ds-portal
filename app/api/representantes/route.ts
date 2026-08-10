import {
  arquivarRepresentante,
  atualizarRepresentante,
  criarRepresentante,
  diagnosticoRepresentantes,
  listarRepresentantes,
} from "../../eventos/banco";
import { dadosDoCorpo, ErroEventos } from "../../eventos/validacao";
import { lerObjeto, prepararEscrita, prepararLeitura, responderErroEventos } from "../eventos/apoio";

export async function GET(request: Request) {
  try {
    const { parametros, todos, bloqueio } = await prepararLeitura(request);
    if (bloqueio) return bloqueio;
    if (parametros.get("diagnostico") === "1") {
      if (!todos) throw new ErroEventos("O diagnóstico exige a visão administrativa.", 401);
      return Response.json(await diagnosticoRepresentantes(), { headers: { "cache-control": "private, no-store" } });
    }
    return Response.json(await listarRepresentantes(parametros, todos), {
      headers: { "cache-control": todos ? "private, no-store" : "public, max-age=30" },
    });
  } catch (erro) {
    return responderErroEventos(erro, "GET /api/representantes");
  }
}

export async function POST(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    return Response.json({ item: await criarRepresentante(dadosDoCorpo(corpo)) }, { status: 201 });
  } catch (erro) {
    return responderErroEventos(erro, "POST /api/representantes");
  }
}

export async function PUT(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    return Response.json({ item: await atualizarRepresentante(corpo.id, dadosDoCorpo(corpo)) });
  } catch (erro) {
    return responderErroEventos(erro, "PUT /api/representantes");
  }
}

export async function DELETE(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    return Response.json(await arquivarRepresentante(new URL(request.url).searchParams.get("id")));
  } catch (erro) {
    return responderErroEventos(erro, "DELETE /api/representantes");
  }
}
