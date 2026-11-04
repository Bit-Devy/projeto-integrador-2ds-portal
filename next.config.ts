// importa o tipo da configuração do portal
import type { NextConfig } from "next";

// guarda as opções do portal
const nextConfig: NextConfig = {
  // permite os arquivos de até dez megabytes e os dados do formulário
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

// entrega a configuração ao servidor
export default nextConfig;
