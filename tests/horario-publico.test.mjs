import assert from "node:assert/strict";
import test from "node:test";
import { formatarData, formatarDataHora } from "../app/eventos/modelo-publico.ts";

for (const timestamp of [
  "2026-11-01 00:46:12", "2026-11-01T00:46:12", "2026-11-01T00:46:12Z",
  "2026-11-01T00:46:12.123Z", "2026-10-31T21:46:12-03:00", "2026-11-01T03:46:12+03:00",
]) {
  test(`converte o instante ${timestamp} para São Paulo`, () => {
    assert.equal(formatarDataHora(timestamp), "31/10/2026, 21:46");
  });
}

test("trata a virada de ano e respeita o fuso IANA", () => {
  assert.equal(formatarDataHora("2027-01-01 01:15:00"), "31/12/2026, 22:15");
  assert.equal(formatarDataHora("2018-12-01 01:30:00"), "30/11/2018, 23:30");
});

test("preserva datas sem horário, valores vazios e o tratamento de texto inválido", () => {
  assert.equal(formatarDataHora("2026-11-01"), "01/11/2026");
  assert.equal(formatarData("2026-11-01"), "01/11/2026");
  assert.equal(formatarDataHora(undefined), "");
  assert.equal(formatarDataHora(""), "");
  assert.equal(formatarDataHora("data inválida"), "data inválida");
});

for (const TZ of ["UTC", "America/Sao_Paulo", "Asia/Tokyo"]) {
  test(`o horário público independe do fuso do processo: ${TZ}`, () => {
    const anterior = process.env.TZ;
    try {
      process.env.TZ = TZ;
      assert.equal(new Intl.DateTimeFormat().resolvedOptions().timeZone, TZ);
      assert.equal(formatarDataHora("2026-11-01 00:46:12"), "31/10/2026, 21:46");
    } finally {
      if (anterior === undefined) delete process.env.TZ;
      else process.env.TZ = anterior;
    }
  });
}
