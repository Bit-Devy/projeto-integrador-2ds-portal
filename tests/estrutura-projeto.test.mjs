// importa a criação dos testes
import test from "node:test";
// importa as verificações dos resultados
import assert from "node:assert/strict";
// importa a leitura de arquivos e pastas
import { readFile, stat } from "node:fs/promises";

// verifica as ligações com o banco e os arquivos
test("declara banco e armazenamento do portal", async () => {
  const configuracao = await readFile("wrangler.jsonc", "utf8");
  assert.match(configuracao, /"binding": "DB"/);
  assert.match(configuracao, /"binding": "BUCKET"/);
});

// verifica os arquivos principais do portal
test("possui as rotas principais e o painel", async () => {
  // reúne os arquivos que precisam existir
  const arquivos = [
    "app/page.tsx",
    "app/calendario/page.tsx",
    "app/transparencia/page.tsx",
    "app/sugestoes/page.tsx",
    "app/painel/page.tsx",
    "app/login/page.tsx",
    "app/api/login/route.ts",
    "app/api/logout/route.ts",
    "app/api/conteudo/route.ts",
    "app/api/mensagens/route.ts",
    "app/api/arquivos/route.ts",
  ];
  // confirma cada arquivo da lista
  for (const arquivo of arquivos) assert.ok((await stat(arquivo)).isFile(), `${arquivo} deve existir`);
});

// verifica os dados iniciais disponíveis
test("mantém os dados fáceis de editar em um só lugar", async () => {
  const fonte = await readFile("app/conteudo/dados-iniciais.ts", "utf8");
  // confirma cada grupo de dados esperado
  for (const nome of ["membrosIniciais", "eventosIniciais", "noticiasIniciais", "projetosIniciais", "documentosIniciais", "movimentosIniciais"]) {
    assert.match(fonte, new RegExp(`export const ${nome}`));
  }
});

// verifica a migração e o documento do projeto
test("inclui migração e documentação em PDF", async () => {
  const migracao = await readFile("drizzle/0000_smart_quasar.sql", "utf8");
  assert.match(migracao, /CREATE TABLE `conteudos`/);
  assert.match(migracao, /CREATE TABLE `mensagens`/);
  // confirma se o arquivo começa como um pdf
  const pdf = await readFile("public/documentacao/Documentacao-Projeto-GECEP.pdf");
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
});
