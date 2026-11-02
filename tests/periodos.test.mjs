// importa os testes e os filtros usados pelas páginas
import test from "node:test";
import assert from "node:assert/strict";
import { anoInicial, anosDisponiveis, pertenceAoAno } from "../app/conteudo/periodos.ts";

// confere a navegação quando o ano muda e o histórico continua disponível
test("permite preparar 2027 e voltar aos anos que já têm publicações", () => {
  assert.deepEqual(anosDisponiveis(["2024-01-01", "2026-12-31"], "2027", 2027), [2028, 2027, 2026, 2024]);
  assert.equal(anoInicial("2027"), "2027");
  assert.equal(anoInicial("todos"), "todos");
  assert.equal(anoInicial("errado"), String(new Date().getFullYear()));
  assert.equal(pertenceAoAno("2026-12-31", "2027"), false);
  assert.equal(pertenceAoAno("2027-01-01", "2027"), true);
  assert.equal(pertenceAoAno("2026-12-31", "todos"), true);
});
