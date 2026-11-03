// importa os testes e os filtros usados pelas páginas
import test from "node:test";
import assert from "node:assert/strict";
import { destaqueValido, anoDoPortal, anoInicial, anosDisponiveis, pertenceAoAno } from "../app/conteudo/periodos.ts";

// confere a navegação quando o ano muda e o histórico continua disponível
test("permite preparar 2027 e voltar aos anos que já têm publicações", () => {
  assert.deepEqual(anosDisponiveis(["2024-01-01", "2026-12-31"], "2027", 2027), [2028, 2027, 2026, 2024]);
  assert.equal(anoInicial("2027"), "2027");
  assert.equal(anoInicial("todos"), "todos");
  assert.equal(anoInicial("errado"), String(anoDoPortal()));
  assert.equal(pertenceAoAno("2026-12-31", "2027"), false);
  assert.equal(pertenceAoAno("2027-01-01", "2027"), true);
  assert.equal(pertenceAoAno("2026-12-31", "todos"), true);
});

// mantém o ano do paraná mesmo quando o servidor já passou da meia noite em utc
test("o ano atual acompanha o horário do colégio na virada do ano", () => {
  assert.equal(anoDoPortal(new Date("2027-01-01T01:00:00Z")), 2026);
  assert.equal(anoDoPortal(new Date("2027-01-01T03:00:00Z")), 2027);
});

// encerra o destaque apenas depois do último dia escolhido
 test("o destaque vence no fim do dia escolhido no paraná", () => {
  const noticia = { destaque: true, destaqueAte: "2026-11-02" };
  assert.equal(destaqueValido(noticia, new Date("2026-11-03T02:59:59Z")), true);
  assert.equal(destaqueValido(noticia, new Date("2026-11-03T03:00:00Z")), false);
  assert.equal(destaqueValido({ ...noticia, destaque: false }, new Date("2026-11-02T15:00:00Z")), false);
});
