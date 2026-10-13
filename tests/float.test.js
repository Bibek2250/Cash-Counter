import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUD } from "../js/currencies.js";
import { MAX_FLOAT, moneyText, parseMoney, sanitizeFloatTarget, splitFloat } from "../js/float.js";

describe("parseMoney", () => {
  it("reads typed amounts in cents", () => {
    assert.equal(parseMoney("200", AUD), 20000);
    assert.equal(parseMoney("$1,250.50", AUD), 125050);
    assert.equal(parseMoney(" 0.05 ", AUD), 5);
    assert.equal(parseMoney(".5", AUD), 50);
    assert.equal(parseMoney("12.", AUD), 1200);
  });

  it("rejects anything that isn't an amount", () => {
    for (const bad of ["", "abc", "1.234", "-5", "1e3", "1.2.3", null, undefined]) {
      assert.equal(parseMoney(bad, AUD), null, String(bad));
    }
  });

  it("caps the float", () => assert.equal(parseMoney("99999999", AUD), MAX_FLOAT));
});

describe("moneyText", () => {
  it("drops .00 but keeps cents", () => {
    assert.equal(moneyText(20000, AUD), "200");
    assert.equal(moneyText(20050, AUD), "200.50");
  });
});

describe("sanitizeFloatTarget", () => {
  it("keeps a good saved float", () => assert.equal(sanitizeFloatTarget({ target: 30000 }), 30000));

  it("turns missing or broken data into no float", () => {
    for (const bad of [null, "x", [], 42, {}, { target: "200" }, { target: 1.5 }, { target: -5 }]) {
      assert.equal(sanitizeFloatTarget(bad), 0, JSON.stringify(bad));
    }
  });

  it("caps an oversized float", () => assert.equal(sanitizeFloatTarget({ target: 1e12 }), MAX_FLOAT));
});

describe("splitFloat", () => {
  it("keeps the float and banks the rest", () => {
    assert.deepEqual(splitFloat(113700, 20000), { keep: 20000, bank: 93700, short: 0 });
  });

  it("banks everything when there's no float", () => {
    assert.deepEqual(splitFloat(5000, 0), { keep: 0, bank: 5000, short: 0 });
  });

  it("keeps it all and says how much is missing when there's less than the float", () => {
    assert.deepEqual(splitFloat(15000, 20000), { keep: 15000, bank: 0, short: 5000 });
  });

  it("handles an empty till", () => {
    assert.deepEqual(splitFloat(0, 20000), { keep: 0, bank: 0, short: 20000 });
  });
});
