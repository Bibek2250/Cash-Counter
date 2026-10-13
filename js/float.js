/**
 * Float: how much of the counted cash stays in the till, and how much goes to the bank.
 * Pure: no DOM, no storage. Everything here is covered by tests/float.test.js.
 *
 * Amounts are in cents, like everywhere else in the app.
 */

/** Largest float that can be set: $10,000. */
export const MAX_FLOAT = 1_000_000;

/** Turns typed text like "200", "$1,250.50" or ".5" into cents, or null if it isn't an amount. */
export function parseMoney(text, currency) {
  const cleaned = String(text ?? "").replace(/[\s,$]/g, "");
  if (!/^(?:\d+\.?\d{0,2}|\.\d{1,2})$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * currency.minor);
  return Math.min(Math.max(cents, 0), MAX_FLOAT);
}

/** Cents as plain text for the float box: 20000 → "200", 20050 → "200.50". */
export function moneyText(cents, currency) {
  const major = cents / currency.minor;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

/** Reads the saved float from untrusted data (e.g. localStorage): a whole number of cents. */
export function sanitizeFloatTarget(raw) {
  const target = raw !== null && typeof raw === "object" ? raw.target : undefined;
  return Number.isInteger(target) ? Math.min(Math.max(target, 0), MAX_FLOAT) : 0;
}

/**
 * Splits the counted total into float and bank.
 * When there's less than the float, all of it stays in the till and `short` says how much is missing.
 */
export function splitFloat(total, target) {
  const keep = Math.min(total, target);
  return { keep, bank: total - keep, short: target - keep };
}
