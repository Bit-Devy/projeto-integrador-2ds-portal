import { obterCampeonato } from "../../../eventos/banco";
import { identificadorDaRota, prepararLeitura, responderErroEventos } from "../../eventos/apoio";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { todos, bloqueio } = await prepararLeitura(request);
    if (bloqueio) return bloqueio;
    const { id } = await params;
    return Response.json(await obterCampeonato(identificadorDaRota(id), todos), {
      headers: { "cache-control": todos ? "private, no-store" : "public, max-age=30" },
    });
  } catch (erro) {
    return responderErroEventos(erro, "GET /api/interclasses/[id]");
  }
}
