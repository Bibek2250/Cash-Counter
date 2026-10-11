/**
 * Notes and coins for every supported currency.
 *
 * Values are stored as integers in each currency's smallest counted unit, so totals never
 * suffer from floating-point rounding: cents for AUD/USD/EUR, and whole yen / rupees for
 * JPY/NPR/INR (which have no smaller coins in everyday use).
 *
 * Sizes are the real note length/height and coin diameter in millimetres, so the drawn
 * pictures keep true proportions. Colours are close to the real money, not exact.
 */

/** Height of the drawn note artwork, in SVG units. Note widths are scaled to it. */
export const NOTE_ART_HEIGHT = 65;

const METAL = {
  gold: "#c99a2e",
  silver: "#9aa4a8",
  copper: "#b5653a",
  brass: "#c8a24a",
  nordicGold: "#d4b04c",
  bronze: "#a8743f",
  aluminium: "#c9cdd0",
};

/**
 * @param {number} value      in the currency's smallest unit
 * @param {string} color      CSS colour
 * @param {number} lengthMm   real length
 * @param {number} heightMm   real height
 * @param {number} [bumps]    raised tactile dots (Australian notes have 1–5)
 */
function note(value, color, lengthMm, heightMm, bumps = 0) {
  return { kind: "note", value, color, width: (lengthMm * NOTE_ART_HEIGHT) / heightMm, bumps };
}

/**
 * @param {number} value
 * @param {string} color
 * @param {number} diameterMm
 * @param {{sides?: number, inner?: string, hole?: boolean, smooth?: boolean, stars?: boolean}} [extras]
 *   sides: polygon coins (AUD 50c, INR ₹20); inner: centre metal of two-metal coins;
 *   hole: holed yen coins; smooth: no milled edge; stars: the Southern Cross on the AUD $2.
 */
function coin(value, color, diameterMm, extras = {}) {
  return { kind: "coin", value, color, width: diameterMm, ...extras };
}

const DEFINITIONS = {
  AUD: {
    name: "Australian dollar", locale: "en-AU", minor: 100, symbol: "$", logo: "$",
    unit: "dollar", subunit: "cent", subunitMark: "c", country: "AUSTRALIA",
    storageKey: "aud-cash-counter-v3", // the app's original save slot, so old counts carry over
    notes: [
      note(10000, "#2f8f4e", 158, 65, 5), note(5000, "#d9a514", 151, 65, 4), note(2000, "#d2502f", 144, 65, 3),
      note(1000, "#2d6fc0", 137, 65, 2), note(500, "#a2508f", 130, 65, 1),
    ],
    coins: [
      coin(200, METAL.gold, 20.5, { stars: true }), coin(100, METAL.gold, 25), coin(50, METAL.silver, 31.65, { sides: 12 }),
      coin(20, METAL.silver, 28.65), coin(10, METAL.silver, 23.6), coin(5, METAL.silver, 19.41),
    ],
  },
  USD: {
    name: "US dollar", locale: "en-US", minor: 100, symbol: "$", logo: "$",
    unit: "dollar", subunit: "cent", subunitMark: "¢", country: "UNITED STATES",
    notes: [
      note(10000, "#3d8fa6", 156, 66), note(5000, "#b5577c", 156, 66), note(2000, "#6f9a5a", 156, 66),
      note(1000, "#d07a32", 156, 66), note(500, "#7b5ea7", 156, 66), note(200, "#4f7d5a", 156, 66),
      note(100, "#5f7f5a", 156, 66),
    ],
    coins: [
      coin(100, METAL.brass, 26.49), coin(50, METAL.silver, 30.61), coin(25, METAL.silver, 24.26),
      coin(10, METAL.silver, 17.91), coin(5, METAL.silver, 21.21, { smooth: true }), coin(1, METAL.copper, 19.05, { smooth: true }),
    ],
  },
  EUR: {
    name: "Euro", locale: "en-IE", minor: 100, symbol: "€", logo: "€",
    unit: "euro", subunit: "cent", subunitMark: "c", country: "EURO",
    notes: [
      note(50000, "#8e5a9b", 160, 82), note(20000, "#c9a43a", 153, 77), note(10000, "#3f9a5a", 147, 77),
      note(5000, "#e08a2e", 140, 77), note(2000, "#3b6fb6", 133, 72), note(1000, "#d0453c", 127, 67),
      note(500, "#8a8f94", 120, 62),
    ],
    coins: [
      coin(200, METAL.silver, 25.75, { inner: METAL.gold }), coin(100, METAL.gold, 23.25, { inner: METAL.silver }),
      coin(50, METAL.nordicGold, 24.25), coin(20, METAL.nordicGold, 22.25), coin(10, METAL.nordicGold, 19.75),
      coin(5, METAL.copper, 21.25, { smooth: true }), coin(2, METAL.copper, 18.75, { smooth: true }),
      coin(1, METAL.copper, 16.25, { smooth: true }),
    ],
  },
  JPY: {
    name: "Japanese yen", locale: "en-US", minor: 1, symbol: "¥", logo: "¥",
    unit: "yen", country: "NIPPON",
    notes: [
      note(10000, "#8a6a3f", 160, 76), note(5000, "#8e6aa8", 156, 76), note(2000, "#4f8a6e", 154, 76),
      note(1000, "#3f6fa8", 150, 76),
    ],
    coins: [
      coin(500, METAL.brass, 26.5, { inner: METAL.silver }), coin(100, METAL.silver, 22.6),
      coin(50, METAL.silver, 21, { hole: true }), coin(10, METAL.bronze, 23.5, { smooth: true }),
      coin(5, METAL.brass, 22, { hole: true, smooth: true }), coin(1, METAL.aluminium, 20, { smooth: true }),
    ],
  },
  NPR: {
    name: "Nepalese rupee", locale: "en-IN", minor: 1, symbol: "Rs", logo: "₨",
    unit: "rupee", country: "NEPAL",
    notes: [
      note(1000, "#5a6fa8", 160, 70), note(500, "#a0703a", 155, 70), note(100, "#3f8a4f", 150, 70),
      note(50, "#6a5aa0", 145, 70), note(20, "#d0783a", 140, 70), note(10, "#9a4a3a", 135, 70),
      note(5, "#c04a4a", 130, 70),
    ],
    coins: [
      coin(10, METAL.silver, 27, { inner: METAL.brass }), coin(5, METAL.silver, 25),
      coin(2, METAL.brass, 23), coin(1, METAL.brass, 20),
    ],
  },
  INR: {
    name: "Indian rupee", locale: "en-IN", minor: 1, symbol: "₹", logo: "₹",
    unit: "rupee", country: "INDIA",
    notes: [
      note(500, "#8f9089", 150, 66), note(200, "#e3b23c", 146, 66), note(100, "#9b8fc4", 142, 66),
      note(50, "#4fb3c9", 135, 66), note(20, "#b8c24a", 129, 63), note(10, "#8a5a3a", 123, 63),
    ],
    coins: [
      coin(20, METAL.brass, 27, { sides: 12, inner: METAL.silver }), coin(10, METAL.brass, 27, { inner: METAL.silver }),
      coin(5, METAL.brass, 25), coin(2, METAL.silver, 23), coin(1, METAL.silver, 20),
    ],
  },
};

export const DEFAULT_CURRENCY = "AUD";

/**
 * Adds the id, the text printed on the picture and the spoken name to a note or coin.
 * e.g. AUD 10000 note → id "n10000", face "100", name "100 dollar note";
 *      AUD 50 coin    → id "c50",    face "50c", name "50 cent coin".
 */
function describe(item, def) {
  const major = item.value / def.minor;
  const isSubunit = major < 1;
  const number = isSubunit ? String(item.value) : major.toLocaleString(def.locale);
  // Coins show the symbol (e.g. "$2", "₹10"); notes show just the number. Yen coins are
  // too small for "¥", and NPR's "Rs" is spelled out on the logo only.
  const coinSymbol = item.kind === "coin" && def.symbol !== "¥" ? def.symbol : "";
  return Object.freeze({
    ...item,
    id: (item.kind === "coin" ? "c" : "n") + item.value,
    face: isSubunit ? item.value + def.subunitMark : coinSymbol + number,
    name: `${number} ${isSubunit ? def.subunit : def.unit} ${item.kind}`,
  });
}

function buildCurrency(code, def) {
  const notes = Object.freeze(def.notes.map((n) => describe(n, def)));
  const coins = Object.freeze(def.coins.map((c) => describe(c, def)));
  const digits = def.minor === 100 ? 2 : 0;
  const formatter = new Intl.NumberFormat(def.locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return Object.freeze({
    ...def,
    code,
    notes,
    coins,
    all: Object.freeze([...notes, ...coins]),
    storageKey: def.storageKey ?? `cash-counter-${code}`,
    /** Formats an amount in the smallest unit, e.g. 126070 → "$1,260.70". */
    format: (amount) => formatter.format(amount / def.minor),
  });
}

/** @type {Readonly<Record<string, ReturnType<typeof buildCurrency>>>} */
export const CURRENCIES = Object.freeze(
  Object.fromEntries(Object.entries(DEFINITIONS).map(([code, def]) => [code, buildCurrency(code, def)])),
);

export function isCurrencyCode(code) {
  return typeof code === "string" && Object.hasOwn(CURRENCIES, code);
}

export function getCurrency(code) {
  return isCurrencyCode(code) ? CURRENCIES[code] : CURRENCIES[DEFAULT_CURRENCY];
}
