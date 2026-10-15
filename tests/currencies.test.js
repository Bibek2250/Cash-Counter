import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUD } from "../js/currencies.js";

describe("AUD", () => {
  it("has the five notes and six coins", () => {
    assert.deepEqual(AUD.notes.map((item) => item.id), ["n10000", "n5000", "n2000", "n1000", "n500"]);
    assert.deepEqual(AUD.coins.map((item) => item.id), ["c200", "c100", "c50", "c20", "c10", "c5"]);
  });

  it("has unique ids", () => {
    const ids = AUD.all.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("uses positive whole-number values", () => {
    for (const item of AUD.all) assert.ok(Number.isInteger(item.value) && item.value > 0, item.id);
  });

  it("lists notes and coins from largest to smallest", () => {
    for (const list of [AUD.notes, AUD.coins]) {
      const values = list.map((item) => item.value);
      assert.deepEqual(values, [...values].sort((a, b) => b - a));
    }
  });

  it("gives every item a picture label and a spoken name", () => {
    for (const item of AUD.all) {
      assert.ok(item.face.length > 0 && item.face.length <= 6, `${item.id} face "${item.face}"`);
      assert.match(item.name, new RegExp(`${item.kind}$`));
    }
  });

  it("has a bank roll for every coin, worth a whole number of coins", () => {
    assert.deepEqual(AUD.rolls.map((roll) => roll.coinId), AUD.coins.map((c) => c.id));
    for (const roll of AUD.rolls) {
      assert.ok(Number.isInteger(roll.size) && roll.size > 1, roll.id);
      assert.equal(roll.value, roll.coinValue * roll.size);
      assert.equal(roll.id, `r${roll.coinValue}`);
    }
    const rollValues = Object.fromEntries(AUD.rolls.map((roll) => [roll.coinId, roll.value]));
    assert.deepEqual(rollValues, { c200: 5000, c100: 2000, c50: 1000, c20: 400, c10: 400, c5: 200 });
  });

  it("keeps rolls out of the loose denominations", () => {
    assert.ok(AUD.denominations.every((item) => item.kind !== "roll"));
    assert.equal(AUD.all.length, AUD.denominations.length + AUD.rolls.length);
  });

  it("is frozen so it can't be changed at runtime", () => {
    assert.ok(Object.isFrozen(AUD) && Object.isFrozen(AUD.all) && Object.isFrozen(AUD.all[0]));
  });

  it("formats amounts the Australian way", () => {
    assert.equal(AUD.format(126070), "$1,260.70");
    assert.equal(AUD.format(0), "$0.00");
  });

  it("names items clearly for speech", () => {
    const names = AUD.all.map((item) => item.name);
    assert.ok(names.includes("100 dollar note"));
    assert.ok(names.includes("50 cent coin"));
    assert.ok(names.includes("2 dollar coin roll"));
  });
});
