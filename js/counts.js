/**
 * Pure counting logic: no DOM, no storage. Everything here is covered by tests/counts.test.js.
 */

/** Largest count per note/coin. Keeps every total far inside Number.MAX_SAFE_INTEGER. */
export const MAX_COUNT = 99999;

/** Turns anything (typed text, saved data, voice input) into a whole count from 0 to MAX_COUNT. */
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
 * Older versions saved notes by dollar value ("n100" = $100). They are now keyed
 * by cents ("n10000"). Returns a converted copy; anything else is returned unchanged.
 */
export function migrateLegacyCounts(raw) {
  if (raw === null || typeof raw !== "object") return raw;
  if (!Object.hasOwn(raw, "n100") || Object.hasOwn(raw, "n10000")) return raw;
  const migrated = { ...raw };
  for (const dollars of [100, 50, 20, 10, 5]) {
    migrated[`n${dollars * 100}`] = raw[`n${dollars}`];
    delete migrated[`n${dollars}`];
  }
  return migrated;
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

/** Bulk step for "+5"/"+10" buttons and Shift+arrow keys (rolls go up by 5, like notes). */
export function bulkStep(item) {
  return item.kind === "coin" ? 10 : 5;
}

/** True when at least one note or coin is counted. */
export function hasAnyCounts(counts) {
  return Object.values(counts).some((n) => n > 0);
}
