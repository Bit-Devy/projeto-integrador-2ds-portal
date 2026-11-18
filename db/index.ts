import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { obterAmbiente } from "../worker/ambiente";

// cria o acesso tipado ao banco
export function getDb() {
  // lê o vínculo do banco no ambiente
  const d1 = obterAmbiente().DB;

  if (!d1) {
    throw new Error("O banco D1 não está disponível. Confira o vínculo DB em wrangler.jsonc.");
  }

  // conecta o drizzle com as tabelas do portal
  return drizzle(d1, { schema });
}

// devolve o acesso direto ao banco d1
export function getD1() {
  const d1 = obterAmbiente().DB;
  if (!d1) throw new Error("O banco de dados do portal não está disponível.");
  return d1;
}
