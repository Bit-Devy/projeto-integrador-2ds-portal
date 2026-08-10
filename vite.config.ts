// importa a integração com as páginas
import vinext from "vinext";
// importa a criação da configuração
import { defineConfig } from "vite";

// monta a configuração do servidor local
export default defineConfig(async () => {
  // importa a integração com a plataforma
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
