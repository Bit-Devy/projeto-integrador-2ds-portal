// importa o tipo de local público
import type { LocalMapaPublico } from "./tipos";
// importa a normalização dos textos de busca
import { normalizarTextoBusca } from "./normalizacao";

// define os dados usados na busca por atividade
type LocalEspecial = Pick<LocalMapaPublico, "nome" | "numero" | "nomeAlternativo" | "tipo">;

// verifica se o local também pode aparecer como atividade
export function localPesquisavelComoAtividade(local: LocalEspecial) {
  // normaliza o tipo para comparação
  const tipo = normalizarTextoBusca(local.tipo);
  if (tipo !== "laboratorio" && tipo !== "outro") return false;

  // compara o nome real com o nome genérico da sala
  const nome = normalizarTextoBusca(local.nome);
  const nomeGenerico = normalizarTextoBusca(`Sala ${local.numero}`);
  return Boolean(nome && nome !== nomeGenerico);
}

// busca locais especiais pelo termo informado
export function buscarLocaisEspeciaisComoAtividade<T extends LocalEspecial>(locais: T[], termo: string) {
  // cria as variações aceitas do termo
  const buscas = variacoesDoTermo(termo);
  if (!buscas.length) return [];

  // filtra os locais que combinam com alguma variação
  return locais.filter((local) => {
    if (!localPesquisavelComoAtividade(local)) return false;
    // reúne os textos pesquisáveis do local
    const termos = [local.nome, local.nomeAlternativo, local.tipo]
      .map(normalizarTextoBusca)
      .filter(Boolean);
    return buscas.some((busca) => termos.some((item) => item.includes(busca)));
  });
}

// cria versões singular e plural do termo
function variacoesDoTermo(termo: string) {
  const normalizado = normalizarTextoBusca(termo);
  if (!normalizado) return [];
  // remove o s final quando ele pode indicar plural
  return normalizado.endsWith("s") && normalizado.length > 3
    ? [normalizado, normalizado.slice(0, -1)]
    : [normalizado];
}
