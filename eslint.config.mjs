// importa a criação da configuração de qualidade
import { defineConfig, globalIgnores } from "eslint/config";
// importa as regras para páginas
import nextVitals from "eslint-config-next/core-web-vitals";
// importa as regras para código tipado
import nextTs from "eslint-config-next/typescript";

// reúne as regras e os arquivos ignorados
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // substitui a lista padrão de arquivos ignorados
  globalIgnores([
    // ignora arquivos criados automaticamente
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

// entrega a configuração ao verificador
export default eslintConfig;
