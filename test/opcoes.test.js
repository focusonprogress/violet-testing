const assert = require("node:assert/strict");
const test = require("node:test");

const { lerArgumentos, montarLote, normalizarOpcoes } = require("../lib/opcoes");

// Gerador falso: o real vem do violet-utilities e ja tem testes la.
const nomesFalsos = {
  generateGamepassNames: ({ prefix, count, separator, start }) =>
    Array.from({ length: count }, (_, i) => `${prefix}${separator}${start + i}`),
  parsePriceList: (texto) => {
    const tokens = texto.split(/[\s,;]+/).filter(Boolean);
    return {
      prices: tokens.map(Number).filter((n) => Number.isInteger(n) && n > 0),
      invalid: tokens.filter((t) => !(Number.isInteger(Number(t)) && Number(t) > 0)),
    };
  },
  renderDescription: (modelo, nome, n) => modelo.replace("{nome}", nome).replace("{n}", String(n)),
};

function opcoes(argv) {
  return normalizarOpcoes(lerArgumentos(argv));
}

test("usa padroes seguros: so previa, preco alto e regional desligado", () => {
  const o = opcoes([]);
  assert.equal(o.criar, false);
  assert.equal(o.preco, 9999);
  assert.equal(o.regional, false);
  assert.equal(o.separador, "_");
  assert.equal(o.intervalo, 3);
});

test("le opcoes com espaco ou com =", () => {
  const o = opcoes(["--prefixo", "davizin", "--modo=misto", "--separador", "espaco", "--quantidade", "3", "--criar"]);
  assert.equal(o.prefixo, "davizin");
  assert.equal(o.modo, "mixed");
  assert.equal(o.separador, " ");
  assert.equal(o.quantidade, 3);
  assert.equal(o.criar, true);
});

test("recusa opcoes invalidas", () => {
  assert.throws(() => opcoes(["--modo", "outro"]), /--modo/);
  assert.throws(() => opcoes(["--quantidade", "26"]), /--quantidade/);
  assert.throws(() => opcoes(["--intervalo", "-1"]), /--intervalo/);
  assert.throws(() => opcoes(["--qualquer", "1"]), /desconhecida/);
  assert.throws(() => opcoes(["--prefixo"]), /Falta o valor/);
  assert.throws(() => opcoes(["solto"]), /inesperado/);
});

test("monta lote com preco unico ou lista de precos", () => {
  assert.deepEqual(montarLote(opcoes(["--prefixo", "dz", "--quantidade", "2", "--preco", "50", "--descricao", "{nome}#{n}"]), nomesFalsos), [
    { name: "dz_1", price: 50, description: "dz_1#1" },
    { name: "dz_2", price: 50, description: "dz_2#2" },
  ]);
  assert.deepEqual(
    montarLote(opcoes(["--prefixo", "dz", "--precos", "100,200,300"]), nomesFalsos).map((item) => item.price),
    [100, 200, 300],
  );
  assert.throws(() => montarLote(opcoes(["--prefixo", "dz", "--precos", "100,abc"]), nomesFalsos), /invalidos/);
  assert.throws(() => montarLote(opcoes([]), nomesFalsos), /--prefixo/);
});
