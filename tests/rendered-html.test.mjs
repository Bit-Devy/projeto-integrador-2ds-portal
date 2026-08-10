// importa as verificações dos resultados
import assert from "node:assert/strict";
// importa a criação dos testes
import test from "node:test";

// verifica a resposta da tela inicial
test("renderiza a página inicial do GECEP", async () => {
  // monta um endereço único para o servidor criado
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  // carrega o servidor compilado
  const { default: worker } = await import(workerUrl.href);

  // pede a tela inicial ao servidor
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      // fornece os controles esperados pelo servidor
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  // confirma o resultado e o tipo da resposta
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  // confirma que a página contém o nome do grêmio
  const html = await response.text();
  assert.match(html, /GECEP/);
});
