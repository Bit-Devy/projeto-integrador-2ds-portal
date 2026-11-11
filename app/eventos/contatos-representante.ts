import type { ContatoRepresentante } from "./tipos";

export const nomesContatosRepresentante = { whatsapp: "WhatsApp", email: "E-mail", telefone: "Telefone" };

// monta o endereço de contato apenas com os dados conferidos no cadastro
export function enderecoContatoRepresentante({ tipo, valor }: ContatoRepresentante) {
  if (tipo === "email") return `mailto:${encodeURIComponent(valor).replace("%40", "@")}`;
  const numero = valor.replace(/\D/g, "");
  if (tipo === "whatsapp") {
    const local = !valor.startsWith("+") && (numero.length === 10 || numero.length === 11);
    return `https://wa.me/${local ? "55" : ""}${numero}`;
  }
  return `tel:${valor.startsWith("+") ? "+" : ""}${numero}`;
}
