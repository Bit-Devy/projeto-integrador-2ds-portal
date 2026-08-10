// importa a criação da configuração do banco
import { defineConfig } from "drizzle-kit";

// define onde ficam o esquema e as migrações
export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "sqlite",
});
