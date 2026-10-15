import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUD } from "../js/currencies.js";
import { parseMoney, sanitizeFloatTarget } from "../js/float.js";
import { checkSafe, MAX_SAFE } from "../js/safe.js";

describe("checkSafe", () => {
  it("says when the safe is balanced", () => {
    assert.deepEqual(checkSafe(200000, 200000), { status: "balanced", difference: 0 });
  });

  it("says how much the safe is short", () => {
    assert.deepEqual(checkSafe(198500, 200000), { status: "short", difference: 1500 });
  });

  it("says how much the safe is over", () => {
    assert.deepEqual(checkSafe(200550, 200000), { status: "over", difference: 550 });
  });

  it("is short by everything when nothing is counted yet", () => {
    assert.deepEqual(checkSafe(0, 200000), { status: "short", difference: 200000 });
  });

  it("waits for an expected amount", () => {
    assert.deepEqual(checkSafe(5000, 0), { status: "unset", difference: 0 });
  });
});

describe("expected safe amount", () => {
  it("allows more than the till float limit", () => {
    assert.equal(parseMoney("25,000", AUD, MAX_SAFE), 2500000);
    assert.equal(sanitizeFloatTarget({ target: 2500000 }, MAX_SAFE), 2500000);
  });

  it("is capped", () => {
    assert.equal(parseMoney("999999999", AUD, MAX_SAFE), MAX_SAFE);
    assert.equal(sanitizeFloatTarget({ target: 1e12 }, MAX_SAFE), MAX_SAFE);
  });
});
