/**
 * Printed safe count report: every note and coin roll in the safe, line by line, with the
 * total and whether the safe is balanced, over or short. Pure: no DOM, no storage.
 * Everything here is covered by tests/report.test.js.
 *
 * Amounts are in cents, like everywhere else in the app.
 */
import { checkSafe } from "./safe.js";

/** "$100 notes", "$2 rolls (25 coins, $50.00 each)" */
function lineLabel(item, currency) {
  if (item.kind === "note") return `${currency.symbol}${item.face} notes`;
  return `${item.face} rolls (${item.size} coins, ${currency.format(item.value)} each)`;
}

function group(heading, items, counts, currency) {
  const lines = items.map((item) => {
    const count = counts[item.id] ?? 0;
    return { label: lineLabel(item, currency), count, amount: count * item.value };
  });
  return { heading, lines, subtotal: lines.reduce((acc, line) => acc + line.amount, 0) };
}

/**
 * @param {{counts: Record<string, number>, currency: object, expected: number}} input
 * @returns {{groups: object[], total: number, expected: number, status: string, difference: number}}
 */
export function buildSafeReport({ counts, currency, expected }) {
  // The safe only holds notes and coin rolls.
  const groups = [group("Notes", currency.notes, counts, currency), group("Coin rolls", currency.rolls, counts, currency)];
  // The total is always what the printed lines add up to.
  const total = groups.reduce((acc, g) => acc + g.subtotal, 0);
  return { groups, total, expected, ...checkSafe(total, expected) };
}
