/** entrada do servidor do portal */
// importa o tratamento de imagens do servidor
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
// importa o servidor das páginas
import handler from "vinext/server/app-router-entry";
// importa o ambiente de cada pedido
import { ambienteDaRequisicao, type AmbientePortal } from "./ambiente";

// descreve os recursos obrigatórios do servidor
interface Env extends AmbientePortal {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

// descreve o controle de tarefas do servidor
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// recebe todos os pedidos do portal
const worker = {
  // decide como cada pedido será atendido
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // separa o endereço do pedido
    const url = new URL(request.url);

    // trata os pedidos de otimização de imagem
    if (url.pathname === "/_vinext/image") {
      // reúne os tamanhos de imagem permitidos
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      // busca e transforma a imagem pedida
      return handleImageOptimization(request, {
        // busca o arquivo original
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        // ajusta o tamanho e o formato da imagem
        transformImage: async (body, { width, format, quality }) => {
          // aplica a transformação disponível no servidor
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    // entrega os outros pedidos ao servidor das páginas
    return ambienteDaRequisicao.run(env, () => handler.fetch(request, env, ctx));
  },
};

// exporta o servidor para a plataforma
export default worker;
