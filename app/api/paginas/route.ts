// oferece ao editor apenas destinos que existem no portal
import { exigirAdministradorApi } from "../../lib/autorizacao";
import { garantirBanco } from "../../../db/inicializar";
import { paginasPublicadas } from "../../conteudo/paginas";

export async function GET() {
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  await garantirBanco();
  return Response.json({ itens: await paginasPublicadas() }, { headers: { "cache-control": "private, no-store" } });
}
