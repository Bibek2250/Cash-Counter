/**
 * Safe check: compares the counted safe with how much should be in it.
 * Pure: no DOM, no storage. Everything here is covered by tests/safe.test.js.
 *
 * Amounts are in cents, like everywhere else in the app.
 */

/** Largest expected safe amount that can be set: $1,000,000. */
export const MAX_SAFE = 100_000_000;

/**
 * How the counted total compares with the expected amount.
 * `status` is "unset" (no expected amount yet), "balanced", "over" or "short";
 * `difference` is how far off it is, always zero or more.
 */
export function checkSafe(total, expected) {
  if (expected === 0) return { status: "unset", difference: 0 };
  if (total === expected) return { status: "balanced", difference: 0 };
  return total > expected
    ? { status: "over", difference: total - expected }
    : { status: "short", difference: expected - total };
}
