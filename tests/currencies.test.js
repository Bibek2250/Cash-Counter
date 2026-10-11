import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CURRENCIES, DEFAULT_CURRENCY, getCurrency, isCurrencyCode } from "../js/currencies.js";

describe("currencies", () => {
  it("includes all six supported currencies", () => {
    assert.deepEqual(Object.keys(CURRENCIES).sort(), ["AUD", "EUR", "INR", "JPY", "NPR", "USD"]);
  });

  for (const currency of Object.values(CURRENCIES)) {
    describe(currency.code, () => {
      it("has unique ids", () => {
        const ids = currency.all.map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length);
      });

      it("uses positive whole-number values", () => {
        for (const item of currency.all) assert.ok(Number.isInteger(item.value) && item.value > 0, item.id);
      });

      it("lists notes and coins from largest to smallest", () => {
        for (const list of [currency.notes, currency.coins]) {
          const values = list.map((item) => item.value);
          assert.deepEqual(values, [...values].sort((a, b) => b - a));
        }
      });

      it("gives every item a picture label and a spoken name", () => {
        for (const item of currency.all) {
          assert.ok(item.face.length > 0 && item.face.length <= 6, `${item.id} face "${item.face}"`);
          assert.match(item.name, new RegExp(`${item.kind}$`));
        }
      });

      it("has its own storage key", () => {
        const keys = Object.values(CURRENCIES).map((c) => c.storageKey);
        assert.equal(keys.filter((k) => k === currency.storageKey).length, 1);
      });

      it("is frozen so it can't be changed at runtime", () => {
        assert.ok(Object.isFrozen(currency) && Object.isFrozen(currency.all) && Object.isFrozen(currency.all[0]));
      });
    });
  }

  it("formats amounts the local way", () => {
    assert.equal(CURRENCIES.AUD.format(126070), "$1,260.70");
    assert.equal(CURRENCIES.EUR.format(50830), "€508.30");
    assert.equal(CURRENCIES.JPY.format(46410), "¥46,410");
    assert.equal(CURRENCIES.INR.format(1234568), "₹12,34,568");
    assert.match(CURRENCIES.NPR.format(1234568), /^Rs\s12,34,568$/);
  });

  it("names items clearly for speech", () => {
    const names = (code) => CURRENCIES[code].all.map((item) => item.name);
    assert.ok(names("AUD").includes("100 dollar note"));
    assert.ok(names("AUD").includes("50 cent coin"));
    assert.ok(names("JPY").includes("10,000 yen note"));
    assert.ok(names("INR").includes("20 rupee coin"));
  });

  it("only accepts known currency codes", () => {
    assert.equal(isCurrencyCode("EUR"), true);
    assert.equal(isCurrencyCode("XYZ"), false);
    assert.equal(isCurrencyCode("__proto__"), false);
    assert.equal(isCurrencyCode(null), false);
    assert.equal(getCurrency("nonsense").code, DEFAULT_CURRENCY);
  });
});
