// importa os testes e as regras reais do armazenamento
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tipoArquivoValido } from "../app/arquivos/formatos.ts";
import { possuiReferenciaPublica } from "../app/arquivos/publicacao.ts";
import { caminhoInterno } from "../app/conteudo/paginas.ts";
import { ambienteDaRequisicao } from "../worker/ambiente.ts";

// confere formatos reais e tentativas de trocar apenas o nome do arquivo
test("a biblioteca aceita planilhas e texto mas recusa arquivos disfarçados", async () => {
  const png = new Uint8Array(await readFile("public/logo-gecep.png"));
  assert.equal(tipoArquivoValido("logo.png", "image/png", png), "image/png");
  assert.equal(tipoArquivoValido("dados.csv", "text/csv", new TextEncoder().encode("nome,valor\nexemplo,10\n")), "text/csv");
  assert.equal(tipoArquivoValido("dados.txt", "text/plain", new TextEncoder().encode("texto de teste")), "text/plain");
  assert.throws(() => tipoArquivoValido("imagem.png", "image/png", new TextEncoder().encode("isto não é uma imagem")), /conteúdo/);
  assert.throws(() => tipoArquivoValido("estatuto.pdf", "application/pdf", png), /conteúdo/);
  assert.throws(() => tipoArquivoValido("arquivo.html", "text/html", new TextEncoder().encode("<script>")), /Envie/);
  assert.throws(() => tipoArquivoValido("dados.csv", "text/csv", new Uint8Array([0, 1, 2])), /conteúdo/);
});

// usa o banco completo para verificar a privacidade e os arquivos compartilhados
test("um upload só fica público enquanto houver um vínculo público real", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const arquivo of (await readdir("drizzle")).filter((nome) => nome.endsWith(".sql")).sort()) sqlite.exec(await readFile(`drizzle/${arquivo}`, "utf8"));
    const preparar = (sql, valores = []) => ({ bind: (...recebidos) => preparar(sql, recebidos), async first() { return sqlite.prepare(sql).get(...valores) ?? null; } });
    await ambienteDaRequisicao.run({ DB: { prepare: preparar } }, async () => {
      const chave = "imagem-teste.png", url = `/api/arquivos/${chave}`;
      assert.equal(await possuiReferenciaPublica(chave), false);
      const primeiro = sqlite.prepare("INSERT INTO conteudos(tipo,titulo,dados_json,publicado) VALUES ('noticias','Teste',?,0)").run(JSON.stringify({ imagemUrl: url })).lastInsertRowid;
      assert.equal(await possuiReferenciaPublica(chave), false);
      sqlite.prepare("UPDATE conteudos SET publicado = 1 WHERE id = ?").run(primeiro);
      assert.equal(await possuiReferenciaPublica(chave), true);
      const segundo = sqlite.prepare("INSERT INTO conteudos(tipo,titulo,dados_json,publicado) VALUES ('noticias','Outro teste',?,1)").run(JSON.stringify({ imagemUrl: url })).lastInsertRowid;
      sqlite.prepare("DELETE FROM conteudos WHERE id = ?").run(primeiro);
      assert.equal(await possuiReferenciaPublica(chave), true);
      sqlite.prepare("DELETE FROM conteudos WHERE id = ?").run(segundo);
      sqlite.prepare("INSERT INTO conteudos(tipo,titulo,dados_json,publicado) VALUES ('noticias','Campo interno',?,1)").run(JSON.stringify({ observacoesInternas: url }));
      assert.equal(await possuiReferenciaPublica(chave), false);
      sqlite.prepare("INSERT INTO documentos_oficiais(chave,titulo,arquivo_url) VALUES ('estatuto','Estatuto',?)").run(url);
      assert.equal(await possuiReferenciaPublica(chave), true);
      sqlite.prepare("UPDATE documentos_oficiais SET arquivo_url = '/api/arquivos/outro.pdf'").run();
      assert.equal(await possuiReferenciaPublica(chave), false);
    });
  } finally { sqlite.close(); }
});

// impede que um botão interno seja usado como saída disfarçada
test("os botões internos recusam endereços de outros sites", () => {
  assert.equal(caminhoInterno("/estatuto").pathname, "/estatuto");
  for (const endereco of ["https://example.com", "//example.com", "/\\example.com", "/caminho com espaço"]) assert.equal(caminhoInterno(endereco), null);
});
