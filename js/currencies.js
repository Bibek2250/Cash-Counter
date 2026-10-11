/**
 * Australian notes and coins.
 *
 * Values are stored as integers in cents, so totals never suffer from floating-point rounding.
 *
 * Sizes are the real note length/height and coin diameter in millimetres, so the drawn
 * pictures keep true proportions. Colours are close to the real money, not exact.
 *
 * `rolls` lists how many coins a standard bank roll holds, by coin value.
 */

/** Height of the drawn note artwork, in SVG units. Note widths are scaled to it. */
export const NOTE_ART_HEIGHT = 65;

const METAL = {
  gold: "#c99a2e",
  silver: "#9aa4a8",
};

/**
 * @param {number} value      in cents
 * @param {string} color      CSS colour
 * @param {number} lengthMm   real length
 * @param {number} heightMm   real height
 * @param {number} [bumps]    raised tactile dots (1–5)
 */
function note(value, color, lengthMm, heightMm, bumps = 0) {
  return { kind: "note", value, color, width: (lengthMm * NOTE_ART_HEIGHT) / heightMm, bumps };
}

/**
 * @param {number} value
 * @param {string} color
 * @param {number} diameterMm
 * @param {{sides?: number, stars?: boolean}} [extras]
 *   sides: the 12-sided 50c coin; stars: the Southern Cross on the $2.
 */
function coin(value, color, diameterMm, extras = {}) {
  return { kind: "coin", value, color, width: diameterMm, ...extras };
}

const DEFINITION = {
  code: "AUD", name: "Australian dollar", locale: "en-AU", minor: 100, symbol: "$", logo: "$",
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
  // $2 roll = $50, $1 = $20, 50c = $10, 20c = $4, 10c = $4, 5c = $2
  rolls: { 200: 25, 100: 20, 50: 20, 20: 20, 10: 40, 5: 40 },
};

/**
 * Adds the id, the text printed on the picture and the spoken name to a note or coin.
 * e.g. 10000 note → id "n10000", face "100", name "100 dollar note";
 *      50 coin    → id "c50",    face "50c", name "50 cent coin".
 */
function describe(item, def) {
  const major = item.value / def.minor;
  const isSubunit = major < 1;
  const number = isSubunit ? String(item.value) : major.toLocaleString(def.locale);
  // Coins show the symbol (e.g. "$2"); notes show just the number.
  const coinSymbol = item.kind === "coin" ? def.symbol : "";
  return Object.freeze({
    ...item,
    id: (item.kind === "coin" ? "c" : "n") + item.value,
    face: isSubunit ? item.value + def.subunitMark : coinSymbol + number,
    name: `${number} ${isSubunit ? def.subunit : def.unit} ${item.kind}`,
  });
}

/**
 * A bank roll of one coin, counted as a single item worth the whole roll.
 * e.g. $2 coin, 25 to a roll → id "r200", value 5000, name "2 dollar coin roll".
 */
function describeRoll(coinItem, size) {
  return Object.freeze({
    ...coinItem,
    kind: "roll",
    id: `r${coinItem.value}`,
    coinId: coinItem.id,
    coinValue: coinItem.value,
    size,
    value: coinItem.value * size,
    name: `${coinItem.name} roll`,
  });
}

function buildCurrency(def) {
  const notes = Object.freeze(def.notes.map((n) => describe(n, def)));
  const coins = Object.freeze(def.coins.map((c) => describe(c, def)));
  const rolls = Object.freeze(coins.filter((c) => def.rolls[c.value]).map((c) => describeRoll(c, def.rolls[c.value])));
  const formatter = new Intl.NumberFormat(def.locale, {
    style: "currency",
    currency: def.code,
    currencyDisplay: "narrowSymbol",
  });
  return Object.freeze({
    ...def,
    notes,
    coins,
    rolls,
    /** Loose notes and coins: what a spoken or typed amount like "$2" can refer to. */
    denominations: Object.freeze([...notes, ...coins]),
    /** Everything with its own count, including rolls. */
    all: Object.freeze([...notes, ...coins, ...rolls]),
    /** Formats an amount in cents, e.g. 126070 → "$1,260.70". */
    format: (amount) => formatter.format(amount / def.minor),
  });
}

export const AUD = buildCurrency(DEFINITION);
