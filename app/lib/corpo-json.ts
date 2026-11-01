export class ErroJsonInvalido extends Error {}

export async function lerObjetoJson(request: Request): Promise<Record<string, unknown>> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch (erro) {
    if (!(erro instanceof SyntaxError)) throw erro;
    throw new ErroJsonInvalido("Envie um corpo JSON válido.");
  }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
    throw new ErroJsonInvalido("Envie um objeto JSON válido.");
  }
  return corpo as Record<string, unknown>;
}
