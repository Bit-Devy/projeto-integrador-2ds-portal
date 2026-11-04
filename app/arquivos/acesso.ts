// mantém os anexos privados dentro da área que os enviou
import { areaRestrita } from "../lib/cargos";
import type { UsuarioPainel } from "../lib/sessao";
import { obterAmbiente } from "../../worker/ambiente";
import { possuiReferenciaPublica } from "./publicacao";
import { ErroJsonInvalido } from "../lib/corpo-json";

export async function podeUsarArquivo(chave: string, usuario: UsuarioPainel, metadados?: Record<string, string>) {
  const area = areaRestrita(usuario.cargo);
  if (!area) return true;
  const dados = metadados ?? (await obterAmbiente().BUCKET?.get(chave))?.customMetadata;
  return dados?.areaResponsavel === area || await possuiReferenciaPublica(chave);
}

// confere também os arquivos escolhidos por uma chamada direta à api
export async function validarArquivosDoCargo(valor: unknown, usuario: UsuarioPainel) {
  if (!areaRestrita(usuario.cargo)) return;
  const chaves = new Set<string>();
  function visitar(item: unknown) {
    if (typeof item === "string") {
      const caminho = item.match(/^\/api\/arquivos\/([^/?#]+)(?:[?#].*)?$/);
      if (caminho) { try { chaves.add(decodeURIComponent(caminho[1])); } catch { throw new ErroJsonInvalido("Arquivo inválido."); } }
    } else if (Array.isArray(item)) item.forEach(visitar);
    else if (item && typeof item === "object") {
      const objeto = item as Record<string, unknown>;
      if (typeof objeto.arquivoChave === "string" && objeto.arquivoChave.trim()) chaves.add(objeto.arquivoChave.trim());
      Object.values(item).forEach(visitar);
    }
  }
  visitar(valor);
  for (const chave of chaves) if (!await podeUsarArquivo(chave, usuario)) throw new ErroJsonInvalido("Este arquivo é privado de outra área do grêmio.");
}
