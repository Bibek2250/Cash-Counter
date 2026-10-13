/**
 * Float & banking section: the person enters how much to leave in the till, and the rest of
 * the counted total is shown as the amount to bank. The maths lives in float.js.
 */
import { totals } from "./counts.js";
import { moneyText, parseMoney, sanitizeFloatTarget, splitFloat } from "./float.js";
import { readJSON, STORAGE_KEYS, writeJSON } from "./storage.js";

/**
 * @param {{currency: object, counts: Record<string, number>, announce: (message: string) => void}} app
 *   `counts` is read live through a getter.
 * @param {{target: HTMLInputElement, kept: HTMLElement, status: HTMLElement, bank: HTMLElement,
 *   bankSub: HTMLElement}} ui
 * @returns {{update: () => void, summary: () => string}}
 */
export function initFloat(app, ui) {
  const { currency } = app;
  const fmt = (cents) => currency.format(cents);
  let target = sanitizeFloatTarget(readJSON(STORAGE_KEYS.float));

  const split = () => splitFloat(totals(app.counts, currency).total, target);

  function render() {
    const { keep, bank, short } = split();
    ui.kept.textContent = fmt(keep);
    ui.bank.textContent = fmt(bank);
    ui.bankSub.textContent = `Bank ${fmt(bank)}`;
    ui.status.hidden = short === 0 || keep === 0; // nothing counted yet: no need to say "short"
    ui.status.textContent = `${fmt(short)} short of the ${fmt(target)} float`;
    if (document.activeElement !== ui.target) ui.target.value = target ? moneyText(target, currency) : "";
  }

  /** Short spoken/announced summary, e.g. "Keep $200.00 in the till. Bank $1,060.70." */
  function summary() {
    const { keep, bank, short } = split();
    if (target === 0) return `No float set. Bank ${fmt(bank)}.`;
    const shortText = short ? `, ${fmt(short)} short of the float` : "";
    return `Keep ${fmt(keep)} in the till${shortText}. Bank ${fmt(bank)}.`;
  }

  ui.target.addEventListener("input", () => {
    const cleaned = ui.target.value.replace(/[^\d.,$]/g, "");
    if (cleaned !== ui.target.value) ui.target.value = cleaned;
    const cents = cleaned.trim() === "" ? 0 : parseMoney(cleaned, currency);
    if (cents === null) return;
    target = cents;
    writeJSON(STORAGE_KEYS.float, { target });
    render();
    app.announce(summary());
  });
  // Leaving the box tidies the text, e.g. "$200.5" → "200.50".
  ui.target.addEventListener("change", render);

  // Keep other open tabs in sync with this one.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEYS.float) return;
    let next = null;
    try {
      next = JSON.parse(event.newValue);
    } catch {
      // Treat unreadable data as no float.
    }
    target = sanitizeFloatTarget(next);
    render();
  });

  render();
  return { update: render, summary };
}
