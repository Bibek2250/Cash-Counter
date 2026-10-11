import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bulkStep, clampCount, hasAnyCounts, MAX_COUNT, migrateLegacyCounts, pileLevel, sanitizeCounts, totals,
} from "../js/counts.js";
import { CURRENCIES } from "../js/currencies.js";

const AUD = CURRENCIES.AUD;

describe("clampCount", () => {
  it("keeps valid whole numbers", () => {
    assert.equal(clampCount(7), 7);
    assert.equal(clampCount("42"), 42);
  });

  it("rounds down fractions", () => assert.equal(clampCount(3.9), 3));

  it("turns bad input into 0", () => {
    for (const bad of [-5, "abc", "", null, undefined, NaN, Infinity, {}, [], "1e400"]) {
      assert.equal(clampCount(bad), 0, String(bad));
    }
  });

  it("caps at the maximum", () => assert.equal(clampCount(10 ** 9), MAX_COUNT));
});

describe("sanitizeCounts", () => {
  it("fills in every item and clamps values", () => {
    const counts = sanitizeCounts({ n10000: "3", c50: -2, n5000: 1e12 }, AUD);
    assert.equal(counts.n10000, 3);
    assert.equal(counts.c50, 0);
    assert.equal(counts.n5000, MAX_COUNT);
    assert.deepEqual(Object.keys(counts).sort(), AUD.all.map((item) => item.id).sort());
  });

  it("drops unknown and dangerous keys", () => {
    const counts = sanitizeCounts(JSON.parse('{"__proto__": {"polluted": 1}, "evil": 5, "n500": 2}'), AUD);
    assert.equal(counts.evil, undefined);
    assert.equal(counts.n500, 2);
    assert.equal({}.polluted, undefined);
  });

  it("treats non-objects as empty", () => {
    for (const bad of [null, "text", 5, [1, 2, 3]]) {
      assert.ok(Object.values(sanitizeCounts(bad, AUD)).every((n) => n === 0));
    }
  });
});

describe("migrateLegacyCounts", () => {
  it("converts old dollar-keyed Australian notes to cents", () => {
    const migrated = migrateLegacyCounts({ n100: 3, n50: 12, c200: 7 }, "AUD");
    assert.equal(migrated.n10000, 3);
    assert.equal(migrated.n5000, 12);
    assert.equal(migrated.c200, 7);
    assert.equal(migrated.n100, undefined);
  });

  it("leaves new-format and other currencies alone", () => {
    const current = { n10000: 1 };
    assert.equal(migrateLegacyCounts(current, "AUD"), current);
    const usd = { n100: 4 }; // a US $1 note
    assert.equal(migrateLegacyCounts(usd, "USD"), usd);
  });
});

describe("totals", () => {
  it("adds notes and coins separately", () => {
    const counts = sanitizeCounts({ n10000: 3, n5000: 12, c200: 7 }, AUD);
    assert.deepEqual(totals(counts, AUD), { notes: 90000, coins: 1400, total: 91400 });
  });

  it("stays exact at the maximum count", () => {
    const counts = sanitizeCounts(Object.fromEntries(AUD.all.map((item) => [item.id, MAX_COUNT])), AUD);
    const { total } = totals(counts, AUD);
    assert.ok(Number.isSafeInteger(total));
  });
});

describe("helpers", () => {
  it("grows the pile in steps", () => {
    assert.deepEqual([0, 1, 2, 4, 5, 19, 20, 500].map(pileLevel), [0, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("uses bigger bulk steps for coins", () => {
    assert.equal(bulkStep(AUD.notes[0]), 5);
    assert.equal(bulkStep(AUD.coins[0]), 10);
  });

  it("knows when anything is counted", () => {
    assert.equal(hasAnyCounts({ a: 0, b: 0 }), false);
    assert.equal(hasAnyCounts({ a: 0, b: 2 }), true);
  });
});
