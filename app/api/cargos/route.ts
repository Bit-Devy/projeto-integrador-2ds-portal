// permite apenas à administração revisar os menus de cada cargo
import { getD1 } from "../../../db";
import { cargosPainel, cargosProtegidos, menusGerenciaveis, obterCargo, type RecursoPainel } from "../../lib/cargos";
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { obterPermissoesCargo } from "../../lib/permissoes-cargos";
import { confirmarSenhaDoAcesso } from "../../lib/senhas-painel";
import { lerObjetoJson, ErroJsonInvalido } from "../../lib/corpo-json";
import { consumirTentativa, guardarNavegador, identificarNavegador, limparTentativasLogin } from "../../lib/limites";

const cabecalhos = { "cache-control": "private, no-store" };
export async function GET() {
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  const personalizados = new Set((await getD1().prepare("SELECT cargo FROM permissoes_cargos").all<{ cargo: string }>()).results.map((item) => item.cargo));
  const itens = await Promise.all(cargosPainel.map(async (cargo) => ({ ...cargo, ...await obterPermissoesCargo(cargo.chave), personalizado: personalizados.has(cargo.chave), protegido: cargosProtegidos.includes(cargo.chave) })));
  return Response.json({ itens, menus: menusGerenciaveis }, { headers: cabecalhos });
}

// exige a senha do administrador em cada salvamento ou restauração
export async function PUT(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { acesso, resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  try {
    const corpo = await lerObjetoJson(request);
    if (corpo.confirmado !== true) throw new ErroJsonInvalido("Revise e confirme as permissões antes de continuar.");
    const cargo = obterCargo(String(corpo.cargo || ""));
    if (!cargo) throw new ErroJsonInvalido("Escolha um cargo válido.");
    if (cargosProtegidos.includes(cargo.chave)) return Response.json({ erro: "Os acessos da administração, do presidente e do vice-presidente são protegidos." }, { status: 403 });
    const restaurar = corpo.restaurar === true;
    const editar = restaurar ? cargo.editar : validarLista(corpo.editar);
    const consultar = restaurar ? cargo.consultar : validarLista(corpo.consultar);
    if (editar.some((item) => consultar.includes(item))) throw new ErroJsonInvalido("Escolha apenas um nível de acesso para cada menu.");
    const navegador = identificarNavegador(request);
    const tentativa = await consumirTentativa("login", navegador);
    if (!tentativa.permitido) return guardarNavegador(Response.json({ erro: "Aguarde antes de tentar confirmar sua senha novamente." }, { status: 429 }), request, navegador);
    const usuario = acesso.usuario!;
    if (!await confirmarSenhaDoAcesso(String(corpo.senhaAtual || ""), usuario.acessoId, usuario.versao)) return guardarNavegador(Response.json({ erro: "Senha do acesso geral incorreta. Nenhuma permissão foi alterada." }, { status: 403 }), request, navegador);
    await limparTentativasLogin(navegador);
    if (restaurar) await getD1().prepare("DELETE FROM permissoes_cargos WHERE cargo = ?").bind(cargo.chave).run();
    else await getD1().prepare(`INSERT INTO permissoes_cargos (cargo, editar_json, consultar_json) VALUES (?, ?, ?)
      ON CONFLICT(cargo) DO UPDATE SET editar_json = excluded.editar_json, consultar_json = excluded.consultar_json, atualizado_em = CURRENT_TIMESTAMP`).bind(cargo.chave, JSON.stringify(editar), JSON.stringify(consultar)).run();
    return guardarNavegador(Response.json({ item: { ...cargo, ...await obterPermissoesCargo(cargo.chave), personalizado: !restaurar, protegido: false } }, { headers: cabecalhos }), request, navegador);
  } catch (erro) {
    if (erro instanceof ErroJsonInvalido) return Response.json({ erro: erro.message }, { status: 400 });
    console.error("Falha ao alterar permissões de cargo", erro);
    return Response.json({ erro: "Não foi possível alterar as permissões." }, { status: 500 });
  }
}

// recusa menus inventados duplicados ou exclusivos da administração
function validarLista(valor: unknown): RecursoPainel[] {
  if (!Array.isArray(valor) || valor.length > menusGerenciaveis.length || valor.some((item) => !menusGerenciaveis.some((menu) => menu.chave === item)) || new Set(valor).size !== valor.length) throw new ErroJsonInvalido("Selecione menus válidos, sem repetições. A seção Administração não pode ser concedida a outros cargos.");
  return valor;
}
