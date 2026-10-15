import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeCounts } from "../js/counts.js";
import { AUD } from "../js/currencies.js";
import { buildSafeReport } from "../js/report.js";

const report = (raw, expected) => buildSafeReport({ counts: sanitizeCounts(raw, AUD), currency: AUD, expected });

describe("buildSafeReport", () => {
  const safe = report({ n10000: 19, n5000: 1, r200: 1, c100: 3 }, 200000);

  it("lists notes and coin rolls only", () => {
    assert.deepEqual(safe.groups.map((g) => g.heading), ["Notes", "Coin rolls"]);
  });

  it("shows how many of each and how much", () => {
    const notes = safe.groups[0];
    assert.deepEqual(notes.lines[0], { label: "$100 notes", count: 19, amount: 190000 });
    assert.equal(notes.subtotal, 195000);
    assert.deepEqual(safe.groups[1].lines[0], { label: "$2 rolls (25 coins, $50.00 each)", count: 1, amount: 5000 });
  });

  it("lists every note and roll, even ones with none", () => {
    assert.equal(safe.groups[0].lines.length, AUD.notes.length);
    assert.equal(safe.groups[1].lines.length, AUD.rolls.length);
  });

  it("totals only what it lists, never loose coins", () => {
    assert.equal(safe.total, 200000);
    assert.equal(safe.status, "balanced");
  });

  it("says how much the safe is over or short", () => {
    const over = report({ n10000: 20 }, 198500);
    assert.equal(over.status, "over");
    assert.equal(over.difference, 1500);
    const short = report({ n10000: 19 }, 200000);
    assert.equal(short.status, "short");
    assert.equal(short.difference, 10000);
  });

  it("notes when no expected amount was entered", () => {
    assert.equal(report({ n10000: 1 }, 0).status, "unset");
  });
});
