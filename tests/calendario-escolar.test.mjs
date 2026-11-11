// confere os calendários reais e os cálculos em aulas sem depender do relógio do navegador
import test from "node:test";
import assert from "node:assert/strict";
import { calendarioInicial2026 } from "../app/servicos/calendarios-2026.ts";
import { calendarioVazio, calcularFaltas, margemFaltas, validarCalendario, dataValida } from "../app/servicos/calendario.ts";

test("os dois calendários reproduzem os totais mensais dos pdfs e os semestres", () => {
  for (const [modalidade, mensais, primeiro] of [["anual", [0,14,22,18,19,20,13,21,20,20,19,14], 101], ["semestral", [0,14,22,18,19,20,12,22,20,20,19,14], 100]]) {
    const calendario = validarCalendario(calendarioInicial2026(modalidade));
    assert.deepEqual(Array.from({ length: 12 }, (_, mes) => calendario.dias.filter((dia) => dia.letivo && Number(dia.data.slice(5,7)) === mes + 1).length), mensais);
    assert.equal(calendario.dias.filter((dia) => dia.letivo).length, 200);
    assert.equal(calendario.dias.filter((dia) => dia.letivo && dia.data < calendario.inicioSegundoSemestre).length, primeiro);
    assert.equal(calendario.dias.filter((dia) => dia.letivo).at(-1).data, "2026-12-18");
  }
});

test("o cálculo inclui os extremos e ignora feriados planejamento e recesso", () => {
  const calendario = calendarioInicial2026("anual");
  assert.equal(calcularFaltas(calendario, "2026-02-05", "2026-02-06").aulas, 12);
  assert.equal(calcularFaltas(calendario, "2026-02-16", "2026-02-18").aulas, 0);
  assert.equal(calcularFaltas(calendario, "2026-05-15", "2026-05-15").aulas, 0);
  assert.equal(calcularFaltas(calendario, "2026-05-19", "2026-05-19").aulas, 6);
  assert.equal(calcularFaltas(calendario, "2026-08-22", "2026-08-22").aulas, 0);
  assert.equal(calcularFaltas(calendarioInicial2026("semestral"), "2026-08-22", "2026-08-22").aulas, 6);
  assert.equal(calcularFaltas(calendario, "2026-02-05", "2026-02-06", 5).aulas, 10);
  for (const [inicio,fim] of [["2026-02-30","2026-03-01"],["2026-03-02","2026-03-01"],["2027-01-01","2027-01-02"]]) assert.throws(() => calcularFaltas(calendario, inicio, fim));
});

test("a margem usa aulas e separa os cem dias de cada semestre", () => {
  const anual = calendarioInicial2026("anual");
  assert.equal(margemFaltas(anual, 42, "2026-01-01", "2026-12-31").restante, 258);
  assert.equal(margemFaltas(anual, 301, "2026-01-01", "2026-12-31").excedidas, 1);
  const semestral = calendarioInicial2026("semestral");
  assert.equal(margemFaltas(semestral, 12, "2026-01-01", "2026-07-26").restante, 138);
  assert.equal(margemFaltas(semestral, 0, "2026-07-27", "2026-12-31").limite, 150);
  for (const faltas of [-1, 1.5, NaN]) assert.throws(() => margemFaltas(anual, faltas, "2026-01-01", "2026-12-31"));
});

test("os anos futuros começam vazios e anos bissextos preservam todos os dias", () => {
  assert.equal(calendarioVazio(2027, "anual").dias.length, 365);
  const bissexto = calendarioVazio(2028, "semestral");
  assert.equal(bissexto.dias.length, 366);
  assert.equal(bissexto.dias.some((dia) => dia.letivo), false);
  assert.equal(dataValida("2028-02-29"), true);
  assert.equal(dataValida("2027-02-29"), false);
  const duplicado = structuredClone(bissexto); duplicado.dias[1] = duplicado.dias[0];
  assert.throws(() => validarCalendario(duplicado));
  const feriado = structuredClone(bissexto); feriado.dias[0] = { ...feriado.dias[0], tipo: "feriado", letivo: true };
  assert.throws(() => validarCalendario(feriado));
});
