import vinext from "vinext";
import { defineConfig } from "vite";

// monta a configuração do servidor local
export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  // define o servidor e as integrações usadas
  return {
    // limita o servidor ao computador local
    server: {
      host: "127.0.0.1",
    },
    // ativa as páginas e os recursos da plataforma
    plugins: [
      vinext(),
      // configura o ambiente das páginas no servidor
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
      }),
    ],
  };
});
