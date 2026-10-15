/**
 * Safe check section: the person enters how much should be in the safe, and the counted
 * safe total is shown as balanced, over or short. The maths lives in safe.js.
 */
import { totals } from "./counts.js";
import { moneyText, parseMoney, sanitizeFloatTarget } from "./float.js";
import { checkSafe, MAX_SAFE } from "./safe.js";
import { readJSON, STORAGE_KEYS, writeJSON } from "./storage.js";

/**
 * @param {{currency: object, counts: Record<string, number>, announce: (message: string) => void}} app
 *   `counts` is read live through a getter (the safe's counts while in Safe mode).
 * @param {{expected: HTMLInputElement, counted: HTMLElement, result: HTMLElement,
 *   resultLabel: HTMLElement, resultAmount: HTMLElement, sub: HTMLElement}} ui
 * @returns {{update: () => void, summary: () => string, expected: () => number}}
 */
export function initSafe(app, ui) {
  const { currency } = app;
  const fmt = (cents) => currency.format(cents);
  let expected = sanitizeFloatTarget(readJSON(STORAGE_KEYS.safeExpected), MAX_SAFE);

  const check = () => {
    const total = totals(app.counts, currency).total;
    // Nothing counted yet: no need to say "short" before counting has started.
    if (total === 0 && expected > 0) return { total, status: "waiting", difference: 0 };
    return { total, ...checkSafe(total, expected) };
  };

  const LABELS = {
    unset: "Enter the expected amount", waiting: "Start counting", balanced: "Balanced", over: "Over by", short: "Short by",
  };

  function render() {
    const { total, status, difference } = check();
    ui.counted.textContent = fmt(total);
    ui.result.dataset.status = status;
    ui.resultLabel.textContent = LABELS[status];
    ui.resultAmount.textContent = status === "over" || status === "short" ? fmt(difference) : status === "balanced" ? "✓" : "";
    ui.sub.textContent = status === "over" || status === "short" ? `${LABELS[status]} ${fmt(difference)}` : status === "balanced" ? "Balanced" : "";
    if (document.activeElement !== ui.expected) ui.expected.value = expected ? moneyText(expected, currency) : "";
  }

  /** Short spoken/announced summary, e.g. "Safe short by $15.00. Counted $1,985.00 of $2,000.00." */
  function summary() {
    const { total, status, difference } = check();
    if (status === "unset") return `Safe total ${fmt(total)}. No expected amount set.`;
    if (status === "waiting") return `Nothing counted in the safe yet. Expected ${fmt(expected)}.`;
    const verdict = status === "balanced" ? "Safe balanced" : `Safe ${status} by ${fmt(difference)}`;
    return `${verdict}. Counted ${fmt(total)} of ${fmt(expected)}.`;
  }

  ui.expected.addEventListener("input", () => {
    const cleaned = ui.expected.value.replace(/[^\d.,$]/g, "");
    if (cleaned !== ui.expected.value) ui.expected.value = cleaned;
    const cents = cleaned.trim() === "" ? 0 : parseMoney(cleaned, currency, MAX_SAFE);
    if (cents === null) return;
    expected = cents;
    writeJSON(STORAGE_KEYS.safeExpected, { target: expected });
    render();
    app.announce(summary());
  });
  // Leaving the box tidies the text, e.g. "$2000.5" → "2000.50".
  ui.expected.addEventListener("change", render);

  // Keep other open tabs in sync with this one.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEYS.safeExpected) return;
    let next = null;
    try {
      next = JSON.parse(event.newValue);
    } catch {
      // Treat unreadable data as no expected amount.
    }
    expected = sanitizeFloatTarget(next, MAX_SAFE);
    render();
  });

  render();
  return { update: render, summary, expected: () => expected };
}
