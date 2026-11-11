// permite ligar páginas e setores sem apagar suas publicações
import { getD1 } from "../../../db";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { lerObjetoJson } from "../../lib/corpo-json";
import { obterModulos } from "../../servicos/banco";
import { modulosPadrao } from "../../servicos/tipos";

export async function GET() { return Response.json({ modulos: await obterModulos() }, { headers: { "cache-control": "no-store" } }); }
export async function PUT(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi("paginas");
  if (resposta) return resposta;
  try {
    const corpo = await lerObjetoJson(request);
    if (!corpo.modulos || typeof corpo.modulos !== "object" || Array.isArray(corpo.modulos)) throw new Error("Informe as chaves das páginas.");
    const dados = corpo.modulos as Record<string, unknown>;
    if (Object.keys(dados).length !== Object.keys(modulosPadrao).length || Object.keys(modulosPadrao).some((chave) => typeof dados[chave] !== "boolean")) throw new Error("Confira todas as chaves de ativação.");
    await obterModulos();
    const modulos = Object.fromEntries(Object.keys(modulosPadrao).map((chave) => [chave, dados[chave]]));
    await getD1().prepare("INSERT INTO modulos_portal (chave, dados_json) VALUES ('paginas', ?) ON CONFLICT (chave) DO UPDATE SET dados_json = excluded.dados_json, atualizado_em = CURRENT_TIMESTAMP").bind(JSON.stringify(modulos)).run();
    return Response.json({ modulos });
  } catch (erro) { return Response.json({ erro: erro instanceof Error ? erro.message : "Não foi possível atualizar as páginas." }, { status: 400 }); }
}
