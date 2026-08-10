import { obterPartida } from "../../../../../eventos/banco";
import { identificadorDaRota, prepararLeitura, responderErroEventos } from "../../../../eventos/apoio";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; jogo: string }> },
) {
  try {
    const { todos, bloqueio } = await prepararLeitura(request);
    if (bloqueio) return bloqueio;
    const { id, jogo } = await params;
    return Response.json({
      item: await obterPartida(identificadorDaRota(id), identificadorDaRota(jogo), todos),
    }, { headers: { "cache-control": todos ? "private, no-store" : "public, max-age=30" } });
  } catch (erro) {
    return responderErroEventos(erro, "GET /api/interclasses/[id]/jogos/[jogo]");
  }
}
