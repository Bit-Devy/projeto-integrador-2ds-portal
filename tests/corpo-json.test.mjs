import assert from "node:assert/strict";
import test from "node:test";
import { ErroJsonInvalido, lerObjetoJson } from "../app/lib/corpo-json.ts";

for (const body of ['{"titulo":', "", "null", "[]", '"texto"', "42"]) {
  test(`rejeita corpo inválido: ${JSON.stringify(body)}`, async () => {
    const request = new Request("http://localhost/api/mensagens", { method: "POST", body });
    await assert.rejects(lerObjetoJson(request), ErroJsonInvalido);
  });
}

test("preserva um objeto JSON válido", async () => {
  const objeto = { titulo: "Teste", publicado: false };
  const request = new Request("http://localhost/api/conteudo", { method: "POST", body: JSON.stringify(objeto) });
  assert.deepEqual(await lerObjetoJson(request), objeto);
});

test("não classifica falhas alheias ao parse como JSON inválido", async () => {
  const erro = new TypeError("Falha de leitura");
  await assert.rejects(lerObjetoJson({ async json() { throw erro; } }), (recebido) => recebido === erro);
});
