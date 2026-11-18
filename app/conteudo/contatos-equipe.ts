// usa o mesmo formato de telefone e e-mail dos representantes
import { enderecoContatoRepresentante } from "../eventos/contatos-representante";
import { ErroJsonInvalido } from "../lib/corpo-json";

// define os campos que podem aparecer na ficha pública
export const tiposContatoEquipe = {
  whatsapp: { nome: "WhatsApp", campo: "tel", exemplo: "(41) 99999-9999", tamanho: 30 },
  telefone: { nome: "Telefone", campo: "tel", exemplo: "(41) 3333-3333", tamanho: 30 },
  instagram: {
    nome: "Instagram",
    campo: "text",
    exemplo: "@usuario ou link do perfil",
    tamanho: 250,
  },
  email: { nome: "E-mail", campo: "email", exemplo: "nome@exemplo.org", tamanho: 254 },
  link: { nome: "Outro link", campo: "text", exemplo: "https://exemplo.org", tamanho: 12000 },
} as const;

export const limiteContatosEquipe = 3;
export type ContatoEquipe = { tipo: keyof typeof tiposContatoEquipe; valor: string };

// confere o valor e monta o endereço de cada contato
export function enderecoContatoEquipe({ tipo, valor }: ContatoEquipe): string {
  if (!valor || valor.length > tiposContatoEquipe[tipo].tamanho) return "";

  if (tipo === "email") {
    return /^[^\s@<>]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(valor)
      ? enderecoContatoRepresentante({ tipo, valor })
      : "";
  }
  if (tipo === "whatsapp" || tipo === "telefone") {
    const digitos = valor.replace(/\D/g, "").length;
    const minimo = tipo === "whatsapp" ? 10 : 8;
    if (!/^\+?[\d ().-]+$/.test(valor) || digitos < minimo || digitos > 15) return "";
    return enderecoContatoRepresentante({ tipo, valor });
  }
  if (tipo === "instagram") {
    const usuario =
      valor.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?(?:[?#].*)?$/i)?.[1] ??
      valor.replace(/^@/, "");
    return /^[a-z0-9_][a-z0-9_.]{0,29}$/i.test(usuario) &&
      !usuario.endsWith(".") &&
      !usuario.includes("..")
      ? `https://www.instagram.com/${usuario}/`
      : "";
  }

  if (
    valor.startsWith("/") &&
    !valor.startsWith("//") &&
    !valor.includes("\\") &&
    !/[\t\r\n]/.test(valor)
  )
    return valor;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

// lê apenas os tipos e valores que podem virar um contato
function lerContatoEquipe(entrada: unknown): ContatoEquipe | null {
  if (!entrada || typeof entrada !== "object") return null;
  const { tipo, valor } = entrada as Record<string, unknown>;
  if (
    typeof tipo !== "string" ||
    !Object.hasOwn(tiposContatoEquipe, tipo) ||
    typeof valor !== "string"
  )
    return null;
  const contato = { tipo: tipo as ContatoEquipe["tipo"], valor: valor.trim() };
  return enderecoContatoEquipe(contato) ? contato : null;
}

// mantém o link antigo ao abrir ou editar uma ficha já publicada
export function contatosDoMembro(dados: {
  contatos?: unknown;
  contato?: unknown;
}): ContatoEquipe[] {
  const entradas: unknown[] = Array.isArray(dados.contatos)
    ? dados.contatos
    : [{ tipo: "link", valor: dados.contato }];
  return entradas
    .slice(0, limiteContatosEquipe)
    .map(lerContatoEquipe)
    .filter((contato) => contato !== null);
}

// impede que a api grave contatos inválidos ou acima do limite
export function validarContatosEquipe(entradas: unknown): ContatoEquipe[] {
  if (!Array.isArray(entradas) || entradas.length > limiteContatosEquipe) {
    throw new ErroJsonInvalido("Adicione no máximo três contatos para o integrante.");
  }
  return entradas.map((entrada, indice) => {
    const contato = lerContatoEquipe(entrada);
    if (!contato) throw new ErroJsonInvalido(`Confira o tipo e o valor do contato ${indice + 1}.`);
    return contato;
  });
}
