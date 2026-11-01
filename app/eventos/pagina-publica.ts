import { notFound } from "next/navigation";
import { garantirBanco } from "../../db/inicializar";
import { ErroEventos } from "./validacao";

export async function exigirPublicacao(carregar: () => Promise<unknown>) {
  await garantirBanco();
  try {
    await carregar();
  } catch (erro) {
    if (erro instanceof ErroEventos && erro.status === 404) notFound();
    throw erro;
  }
}
