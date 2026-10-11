/**
 * Cash Counter: entry point.
 *
 * All counts live in `state.counts` (one number per note/coin id). Every change goes through
 * commitCounts(), which saves, re-renders and announces, so the page can never drift out of
 * sync with the data.
 */
import { coinArt, noteArt } from "./art.js";
import {
  bulkStep, clampCount, hasAnyCounts, MAX_COUNT, migrateLegacyCounts, pileLevel, sanitizeCounts, totals,
} from "./counts.js";
import { CURRENCIES, getCurrency } from "./currencies.js";
import { h, restartAnimation } from "./dom.js";
import { celebrate, initMotionSwitch, initTilt, isCalm } from "./effects.js";
import { readJSON, readString, STORAGE_KEYS, writeJSON, writeString } from "./storage.js";
import { initVoice } from "./voice.js";

const UNDO_TIMEOUT_MS = 10_000;
const ANNOUNCE_DELAY_MS = 600;
const TOTAL_ANIMATION_MS = 450;
const MAX_DIGITS = String(MAX_COUNT).length;

const byId = (id) => document.getElementById(id);
const ui = {
  logo: document.querySelector(".logo"),
  currencySelect: byId("currency"),
  panel: document.querySelector(".total"),
  grand: byId("grand"),
  bar: byId("bar"),
  clearButton: byId("clearBtn"),
  miniTotal: byId("miniTotal"),
  miniGrand: byId("miniGrand"),
  miniClearButton: byId("miniClearBtn"),
  toast: byId("toast"),
  undoButton: byId("undoBtn"),
  notesList: byId("notes"),
  coinsList: byId("coins"),
  subtotals: {
    notes: [byId("notesSub"), byId("notesSub2"), byId("miniNotes")],
    coins: [byId("coinsSub"), byId("coinsSub2"), byId("miniCoins")],
  },
  announcer: byId("announce"),
};

const state = {
  currency: getCurrency(readString(STORAGE_KEYS.currency)),
  counts: {},
  /** Counts from before "Clear all", while Undo is still on offer. */
  undoCounts: null,
  /** The "Clear all" button that was used, so Undo can return focus to it. */
  clearedFrom: null,
};

/** Elements for each note/coin row, keyed by id. */
let rows = new Map();

// ---------------------------------------------------------------------------
// Screen reader announcements: one settled message, not one per keystroke or frame.

let announceTimer = 0;
function announce(message) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    ui.announcer.textContent = message;
  }, ANNOUNCE_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Total display, counting up smoothly to the new amount.

const totalAnimation = { shown: 0, target: null, frame: 0 };

function showTotal(amount) {
  const text = state.currency.format(amount);
  ui.grand.textContent = text;
  ui.miniGrand.textContent = text;
}

function animateTotal(target, instant) {
  if (target === totalAnimation.target) return;
  cancelAnimationFrame(totalAnimation.frame);
  totalAnimation.target = target;

  if (!instant) {
    restartAnimation(ui.grand, "bump");
    restartAnimation(ui.panel, "flash");
  }
  if (instant || isCalm()) {
    totalAnimation.shown = target;
    showTotal(target);
    return;
  }

  const from = totalAnimation.shown;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / TOTAL_ANIMATION_MS);
    const eased = 1 - (1 - progress) ** 3;
    totalAnimation.shown = Math.round(from + (target - from) * eased);
    showTotal(totalAnimation.shown);
    if (progress < 1) totalAnimation.frame = requestAnimationFrame(tick);
  };
  totalAnimation.frame = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Building the rows for the current currency.

function buildRow(item, index) {
  const isCoin = item.kind === "coin";
  const bulk = bulkStep(item);
  const art = isCoin ? coinArt(item, state.currency) : noteArt(item, state.currency);

  const chip = h("span", {
    class: ["chip", item.kind, item.sides && "scallop"].filter(Boolean).join(" "),
    role: "img",
    "aria-label": item.name,
    dataset: { stack: "0" },
    style: { "--c": item.color, "--w": item.width },
  }, art);

  const minus = h("button", { class: "step", type: "button", "aria-label": `Remove one ${item.name}`, dataset: { step: "-1" } }, "−");
  const input = h("input", {
    class: "qty", type: "text", inputmode: "numeric", pattern: "[0-9]*", maxlength: MAX_DIGITS,
    autocomplete: "off", id: `q-${item.id}`, "aria-label": `Number of ${item.name}s`, "aria-describedby": "tips", value: "0",
  });
  const plus = h("button", { class: "step", type: "button", "aria-label": `Add one ${item.name}`, dataset: { step: "1" } }, "+");
  // The name starts with the visible text so voice-control users can say "click plus 5".
  const quick = h("button", { class: "quick", type: "button", "aria-label": `+${bulk} ${item.name}s`, dataset: { step: String(bulk) } }, `+${bulk}`);
  const line = h("div", { class: "line zero", id: `t-${item.id}` });

  const row = h("div", { class: "row", dataset: { id: item.id }, style: { "--i": index } },
    h("div", { class: "denom" }, chip),
    h("div", { class: "counter" }, minus, input, plus, quick),
    line,
  );
  const barSegment = h("i", { style: { background: item.color } });
  return { item, row, chip, input, minus, line, barSegment };
}

function buildCurrencyView() {
  const { currency } = state;
  const built = currency.all.map(buildRow);
  rows = new Map(built.map((r) => [r.item.id, r]));
  ui.notesList.replaceChildren(...built.filter((r) => r.item.kind === "note").map((r) => r.row));
  ui.coinsList.replaceChildren(...built.filter((r) => r.item.kind === "coin").map((r) => r.row));
  ui.bar.replaceChildren(...built.map((r) => r.barSegment));
  ui.logo.textContent = currency.logo;
  ui.currencySelect.value = currency.code;
}

// ---------------------------------------------------------------------------
// Rendering counts.

function render(previous, instant) {
  const { currency, counts } = state;
  const sums = totals(counts, currency);
  const changed = [];

  for (const { item, row, chip, input, minus, line, barSegment } of rows.values()) {
    const count = counts[item.id];
    const lineTotal = count * item.value;

    line.textContent = currency.format(lineTotal);
    line.classList.toggle("zero", count === 0);
    row.style.setProperty("--share", `${sums.total ? (lineTotal / sums.total) * 100 : 0}%`);
    barSegment.style.flexGrow = String(lineTotal);
    // "−" stays focusable at zero (so keyboard focus isn't lost) but says it can't go lower.
    minus.setAttribute("aria-disabled", String(count === 0));
    chip.dataset.stack = String(pileLevel(count));

    // Don't fight someone who is typing: leave a focused box alone if it already means this count.
    const typing = document.activeElement === input && clampCount(input.value) === count;
    if (!typing) input.value = String(count);

    if (previous && previous[item.id] !== count) {
      changed.push(item);
      if (!instant) restartAnimation(chip, "pop");
    }
  }

  for (const el of ui.subtotals.notes) el.textContent = currency.format(sums.notes);
  for (const el of ui.subtotals.coins) el.textContent = currency.format(sums.coins);
  animateTotal(sums.total, instant);
  return { changed, total: sums.total };
}

/**
 * The single place counts change: stores, saves, re-renders and (unless quiet) announces.
 * @param {Record<string, number>} next
 * @param {{instant?: boolean, quiet?: boolean}} [options]
 */
function commitCounts(next, { instant = false, quiet = false } = {}) {
  const previous = state.counts;
  state.counts = sanitizeCounts(next, state.currency);
  writeJSON(state.currency.storageKey, state.counts);
  const { changed, total } = render(previous, instant);

  if (quiet || instant) return;
  const fmt = state.currency.format;
  if (changed.length === 1) {
    // e.g. "100 dollar notes: 3, $300.00. Total $1,260.70"
    const [item] = changed;
    const count = state.counts[item.id];
    announce(`${item.name}s: ${count}, ${fmt(count * item.value)}. Total ${fmt(total)}`);
  } else {
    announce(`Total ${fmt(total)}`);
  }
}

function adjust(id, delta) {
  const before = state.counts[id];
  hideUndo();
  commitCounts({ ...state.counts, [id]: before + delta });
  const change = state.counts[id] - before;
  if (change === 0) return;

  const { item, chip, line } = rows.get(id);
  const visibleTotal = ui.miniTotal.classList.contains("show") ? ui.miniGrand : ui.grand;
  celebrate({
    chip, line, target: visibleTotal,
    label: `${change < 0 ? "−" : "+"}${state.currency.format(Math.abs(change) * item.value)}`,
    adding: change > 0,
    count: change,
    spinAxis: item.kind === "coin" ? "Y" : "X",
  });
}

function setCount(id, count) {
  adjust(id, clampCount(count) - state.counts[id]);
}

// ---------------------------------------------------------------------------
// Clear all & Undo. The offer stays while the mouse or keyboard is on it, so nobody is rushed.

let undoTimer = 0;

function startUndoTimer() {
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, UNDO_TIMEOUT_MS);
}

function hideUndo() {
  ui.toast.hidden = true;
  state.undoCounts = null;
  clearTimeout(undoTimer);
}

function clearAll(sourceButton = ui.clearButton) {
  const fmt = state.currency.format;
  if (!hasAnyCounts(state.counts)) {
    announce(`Nothing to clear. Total ${fmt(0)}`);
    return;
  }
  const previous = state.counts;
  commitCounts({}, { quiet: true });
  announce(`All counts cleared. Total ${fmt(0)}. Press Undo to bring them back.`);
  state.undoCounts = previous;
  state.clearedFrom = sourceButton;
  ui.toast.hidden = false;
  startUndoTimer();
}

function undo() {
  if (!state.undoCounts) return;
  commitCounts(state.undoCounts, { quiet: true });
  announce(`Counts restored. Total ${state.currency.format(totals(state.counts, state.currency).total)}`);
  hideUndo();
  state.clearedFrom?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Currencies: each keeps its own saved counts.

function loadSavedCounts() {
  const saved = migrateLegacyCounts(readJSON(state.currency.storageKey), state.currency.code);
  state.counts = {};
  totalAnimation.target = null; // force a redraw in the new currency's format
  commitCounts(saved, { instant: true });
}

function switchCurrency(code) {
  if (!Object.hasOwn(CURRENCIES, code)) return;
  hideUndo();
  state.currency = CURRENCIES[code];
  writeString(STORAGE_KEYS.currency, code);
  buildCurrencyView();
  loadSavedCounts();
  announce(`Now counting ${state.currency.name}s. Total ${state.currency.format(totals(state.counts, state.currency).total)}`);
}

// ---------------------------------------------------------------------------
// Events.

function rowIdFor(element) {
  return element.closest(".row")?.dataset.id;
}

function wireEvents() {
  ui.currencySelect.addEventListener("change", (event) => switchCurrency(event.target.value));
  ui.clearButton.addEventListener("click", () => clearAll(ui.clearButton));
  ui.miniClearButton.addEventListener("click", () => clearAll(ui.miniClearButton));
  ui.undoButton.addEventListener("click", undo);
  for (const type of ["mouseenter", "focusin"]) ui.toast.addEventListener(type, () => clearTimeout(undoTimer));
  for (const type of ["mouseleave", "focusout"]) {
    ui.toast.addEventListener(type, () => {
      if (state.undoCounts) startUndoTimer();
    });
  }

  const lists = [ui.notesList, ui.coinsList];
  for (const list of lists) {
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-step]");
      if (button) adjust(rowIdFor(button), Number(button.dataset.step));
    });

    list.addEventListener("input", (event) => {
      const input = event.target;
      if (!input.matches("input.qty")) return;
      const digits = input.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
      if (digits !== input.value) input.value = digits;
      hideUndo();
      commitCounts({ ...state.counts, [rowIdFor(input)]: clampCount(digits) });
    });

    // Empty a "0" box on focus so people can type straight away; leaving it blank puts the 0 back.
    list.addEventListener("focusin", (event) => {
      if (event.target.matches("input.qty") && event.target.value === "0") event.target.value = "";
    });
    list.addEventListener("focusout", (event) => {
      const input = event.target;
      if (input.matches("input.qty")) input.value = String(state.counts[rowIdFor(input)]);
    });

    // Arrow keys change a count by one; with Shift, by 5 notes or 10 coins.
    list.addEventListener("keydown", (event) => {
      const input = event.target;
      if (!input.matches("input.qty") || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      event.preventDefault();
      const id = rowIdFor(input);
      const step = event.shiftKey ? bulkStep(rows.get(id).item) : 1;
      adjust(id, event.key === "ArrowUp" ? step : -step);
    });
  }

  // Keep other open tabs in sync with this one.
  window.addEventListener("storage", (event) => {
    if (event.key !== state.currency.storageKey) return;
    let next = null;
    try {
      next = JSON.parse(event.newValue);
    } catch {
      // Treat unreadable data as empty.
    }
    commitCounts(next ?? {}, { quiet: true });
  });

  // Show the slim total bar once the big total has scrolled up out of view.
  new IntersectionObserver(([entry]) => {
    ui.miniTotal.classList.toggle("show", !entry.isIntersecting && entry.boundingClientRect.top < 0);
  }).observe(ui.grand);
}

// ---------------------------------------------------------------------------
// Offline support. With Trusted Types enforced, the service worker URL has to come from a
// named policy, and that policy only ever allows this one file.

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const policy = window.trustedTypes?.createPolicy("cash-counter", {
    createScriptURL(url) {
      if (url === "./sw.js") return url;
      throw new TypeError(`Blocked script URL: ${url}`);
    },
  });
  const url = policy ? policy.createScriptURL("./sw.js") : "./sw.js";
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(url).catch(() => {
      // Offline support is optional; the app works without it.
    });
  });
}

// ---------------------------------------------------------------------------
// Start.

buildCurrencyView();
loadSavedCounts();
wireEvents();
initMotionSwitch(byId("motionBtn"));
initTilt(ui.panel);
initVoice(
  {
    get currency() { return state.currency; },
    get counts() { return state.counts; },
    adjust,
    setCount,
    clearAll: () => clearAll(ui.clearButton),
    undo,
    canUndo: () => state.undoCounts !== null,
    switchCurrency,
  },
  { mic: byId("micBtn"), read: byId("readBtn"), status: byId("voiceStatus") },
);
registerServiceWorker();
