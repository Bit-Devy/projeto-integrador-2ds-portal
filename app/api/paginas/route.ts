// oferece ao editor apenas destinos que existem no portal
import { verificarAdministrador } from "../../lib/autorizacao";
import { podeAcessar } from "../../lib/cargos";
import { garantirBanco } from "../../../db/inicializar";
import { paginasBasicasPublicadas } from "../../conteudo/paginas";
import { consultarDestinos, gruposDestinos } from "../../conteudo/destinos";

export async function GET(request: Request) {
  const { usuario } = await verificarAdministrador();
  if (!usuario) return Response.json({ erro: "Entre no painel para consultar os destinos." }, { status: 401 });
  if (!["noticias", "calendario", "paginas"].some((recurso) => podeAcessar(usuario.cargo, recurso as "noticias" | "calendario" | "paginas", false, usuario.permissoes))) return Response.json({ erro: "Seu cargo não pode consultar estes destinos." }, { status: 403 });
  await garantirBanco();
  try {
    const parametros = new URL(request.url).searchParams;
    return Response.json(parametros.has("grupo") ? await consultarDestinos(parametros) : { itens: await paginasBasicasPublicadas(), grupos: gruposDestinos }, { headers: { "cache-control": "private, no-store" } });
  } catch (erro) { return Response.json({ erro: erro instanceof Error ? erro.message : "Não foi possível consultar as publicações." }, { status: 400 }); }
}
