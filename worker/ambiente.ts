// importa o armazenamento separado de cada pedido
import { AsyncLocalStorage } from "node:async_hooks";

// descreve os recursos disponíveis no servidor
export type AmbientePortal = {
  ASSETS?: Fetcher;
  DB?: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
};

// mantém os recursos corretos durante cada pedido
export const ambienteDaRequisicao = new AsyncLocalStorage<AmbientePortal>();

// devolve os recursos do pedido atual
export function obterAmbiente() {
  // usa um objeto vazio fora de um pedido
  return ambienteDaRequisicao.getStore() ?? {};
}
