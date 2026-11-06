// lê as permissões atuais a cada pedido sem guardar acessos antigos em cache
import { getD1 } from "../../db";
import { cargoComPermissoes, cargosProtegidos, obterCargo, type PermissoesCargo } from "./cargos";

export async function obterPermissoesCargo(chave: string): Promise<PermissoesCargo> {
  const padrao = obterCargo(chave);
  if (!padrao) return { editar: [], consultar: [], publicos: false };
  if (cargosProtegidos.includes(chave)) return { editar: padrao.editar, consultar: padrao.consultar, publicos: padrao.publicos };
  const linha = await getD1().prepare("SELECT editar_json, consultar_json FROM permissoes_cargos WHERE cargo = ?").bind(chave).first<{ editar_json: string; consultar_json: string }>();
  if (!linha) return { editar: padrao.editar, consultar: padrao.consultar, publicos: padrao.publicos };
  try {
    const editar = JSON.parse(linha.editar_json), consultar = JSON.parse(linha.consultar_json);
    if (!Array.isArray(editar) || !Array.isArray(consultar)) throw new Error("Permissões inválidas");
    const efetivo = cargoComPermissoes(chave, { editar, consultar, publicos: false })!;
    return { editar: efetivo.editar, consultar: efetivo.consultar, publicos: false };
  } catch { return { editar: [], consultar: [], publicos: false }; }
}
