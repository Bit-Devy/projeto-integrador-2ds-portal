// confere os limites do prazo usado na confirmação do destaque
import test from "node:test";
import assert from "node:assert/strict";
import { tempoRestanteDestaque } from "../app/conteudo/prazo-destaque.ts";

test("conta dias e horas até o fim do dia no paraná", () => {
  assert.deepEqual(tempoRestanteDestaque("2026-11-05", new Date("2026-11-03T00:00:00-03:00")), { dias: 3, horas: 0, menosDeUmaHora: false });
  assert.deepEqual(tempoRestanteDestaque("2026-11-05", new Date("2026-11-04T20:00:00-03:00")), { dias: 1, horas: 4, menosDeUmaHora: false });
  assert.deepEqual(tempoRestanteDestaque("2026-11-05", new Date("2026-11-05T23:30:00-03:00")), { dias: 0, horas: 0, menosDeUmaHora: true });
});

test("não pede encerramento antecipado depois do prazo ou sem data válida", () => {
  const agora = new Date("2026-11-06T00:00:00-03:00");
  for (const prazo of ["2026-11-05", "", "2026-02-30", "data inválida"]) assert.equal(tempoRestanteDestaque(prazo, agora), null);
});
