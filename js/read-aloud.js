/**
 * "Read total" speaks the count aloud using the browser's built-in speech synthesis.
 * Everything spoken is also shown on screen for people who can't hear it.
 */
import { totals } from "./counts.js";

const canSpeak = "speechSynthesis" in window;

/** e.g. "Total $1,260.70. Notes $1,220.00: 100 dollar notes: 3, 50 dollar notes: 12. Coins $40.70: none." */
export function summaryText(currency, counts) {
  const describeGroup = (items) => {
    const counted = items.filter((item) => counts[item.id] > 0);
    if (counted.length === 0) return "none.";
    const sum = counted.reduce((acc, item) => acc + counts[item.id] * item.value, 0);
    return `${currency.format(sum)}: ${counted.map((item) => `${item.name}s: ${counts[item.id]}`).join(", ")}.`;
  };
  const { total } = totals(counts, currency);
  const rolls = currency.rolls.some((item) => counts[item.id] > 0) ? ` Coin rolls ${describeGroup(currency.rolls)}` : "";
  return `Total ${currency.format(total)}. Notes ${describeGroup(currency.notes)} Coins ${describeGroup(currency.coins)}${rolls}`;
}

/**
 * Pressing "Read total" again while it's speaking stops it.
 * @param {{currency: object, counts: object}} app
 * @param {{read: HTMLButtonElement, label: HTMLElement, status: HTMLElement}} ui
 */
export function initReadAloud(app, ui) {
  if (!canSpeak) {
    ui.read.hidden = true;
    return;
  }
  let current = null;

  function setReading(utterance) {
    current = utterance;
    ui.label.textContent = utterance ? "Stop reading" : "Read total";
  }

  function stop() {
    setReading(null);
    speechSynthesis.cancel();
  }

  ui.read.addEventListener("click", () => {
    if (current) {
      stop();
      ui.status.hidden = true;
      return;
    }
    const text = summaryText(app.currency, app.counts);
    ui.status.hidden = false;
    ui.status.replaceChildren(text);
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = app.currency.locale;
    // Only the utterance still playing may reset the button; a cancelled one fires late events.
    const done = () => { if (current === utterance) setReading(null); };
    utterance.addEventListener("end", done);
    utterance.addEventListener("error", done);
    setReading(utterance);
    speechSynthesis.speak(utterance);
  });

  // Don't keep talking in a tab the person has left.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && current) stop();
  });
}
