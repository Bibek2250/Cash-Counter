/**
 * Float: how much of the counted cash stays in the till, and how much goes to the bank.
 * Pure: no DOM, no storage. Everything here is covered by tests/float.test.js.
 *
 * Amounts are in cents, like everywhere else in the app.
 */

/** Largest float that can be set: $10,000. */
export const MAX_FLOAT = 1_000_000;

/**
 * Turns typed text like "200", "$1,250.50" or ".5" into cents, or null if it isn't an amount.
 * Amounts above `max` are capped.
 */
export function parseMoney(text, currency, max = MAX_FLOAT) {
  const cleaned = String(text ?? "").replace(/[\s,$]/g, "");
  if (!/^(?:\d+\.?\d{0,2}|\.\d{1,2})$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * currency.minor);
  return Math.min(Math.max(cents, 0), max);
}

/** Cents as plain text for the float box: 20000 → "200", 20050 → "200.50". */
export function moneyText(cents, currency) {
  const major = cents / currency.minor;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

/**
 * Reads a saved amount like { target: 20000 } from untrusted data (e.g. localStorage):
 * a whole number of cents from 0 to `max`.
 */
export function sanitizeFloatTarget(raw, max = MAX_FLOAT) {
  const target = raw !== null && typeof raw === "object" ? raw.target : undefined;
  return Number.isInteger(target) ? Math.min(Math.max(target, 0), max) : 0;
}

/**
 * Splits the counted total into float and bank.
 * When there's less than the float, all of it stays in the till and `short` says how much is missing.
 */
export function splitFloat(total, target) {
  const keep = Math.min(total, target);
  return { keep, bank: total - keep, short: target - keep };
}
