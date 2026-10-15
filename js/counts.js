/**
 * Pure counting logic: no DOM, no storage. Everything here is covered by tests/counts.test.js.
 */

/** Largest count per note/coin. Keeps every total far inside Number.MAX_SAFE_INTEGER. */
export const MAX_COUNT = 99999;

/** Turns anything (typed text, saved data) into a whole count from 0 to MAX_COUNT. */
export function clampCount(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_COUNT);
}

/**
 * Builds a clean counts object for a currency from untrusted data (e.g. localStorage).
 * Unknown keys are dropped and every value is clamped, so bad data can never reach the page.
 */
export function sanitizeCounts(raw, currency) {
  const source = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const counts = {};
  for (const item of currency.all) {
    counts[item.id] = Object.hasOwn(source, item.id) ? clampCount(source[item.id]) : 0;
  }
  return counts;
}

/**
 * Sums notes, coins and the overall total, in the currency's smallest unit.
 * Coin rolls count towards coins; `rolls` is their share of that, and `coinCount` is how
 * many coins there are in all, loose and rolled.
 */
export function totals(counts, currency) {
  const count = (item) => counts[item.id] ?? 0;
  const sum = (items) => items.reduce((acc, item) => acc + count(item) * item.value, 0);
  const notes = sum(currency.notes);
  const rolls = sum(currency.rolls);
  const coins = sum(currency.coins) + rolls;
  const coinCount = currency.coins.reduce((acc, item) => acc + count(item), 0) +
    currency.rolls.reduce((acc, item) => acc + count(item) * item.size, 0);
  return { notes, coins, rolls, coinCount, total: notes + coins };
}

/** How tall the drawn pile looks for a count: 0 (none) to 4 (lots). */
export function pileLevel(count) {
  if (count === 0) return 0;
  if (count < 2) return 1;
  if (count < 5) return 2;
  if (count < 20) return 3;
  return 4;
}

/** Bulk step for Shift+arrow keys: 5 notes, 10 coins, 5 rolls. */
export function bulkStep(item) {
  return item.kind === "coin" ? 10 : 5;
}

/** True when at least one note or coin is counted. */
export function hasAnyCounts(counts) {
  return Object.values(counts).some((n) => n > 0);
}

/**
 * Counts with no loose coins, for the safe (which only holds coin rolls).
 * Coins that can't be rolled are kept, so nothing is lost if a currency has one.
 */
export function rollsOnly(counts, currency) {
  const next = { ...counts };
  for (const roll of currency.rolls) next[roll.coinId] = 0;
  return next;
}
