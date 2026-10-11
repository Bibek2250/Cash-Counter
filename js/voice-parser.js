/**
 * Turns a spoken phrase into a command object. Pure: no DOM, no speech APIs, no app state,
 * so every rule is covered by tests/voice-parser.test.js.
 *
 * Commands:
 *   { type: "add", id, amount }     amount may be negative ("remove 2 ...")
 *   { type: "set", id, count }      "set ten dollar notes to 4"
 *   { type: "switch", code }        "switch to euros"
 *   { type: "summary" | "clear" | "undo" | "help" | "stop" }
 * Returns null when the phrase isn't understood.
 */

/** How people say each currency: symbols, the main unit and the small unit (as regex source). */
const SPEECH_WORDS = {
  AUD: { symbols: "a\\$|aud|\\$", unit: "dollars?|bucks?|aud", subunit: "cents?|c" },
  USD: { symbols: "us\\$|usd|\\$", unit: "dollars?|bucks?|usd", subunit: "cents?|c|¢" },
  EUR: { symbols: "€|eur", unit: "euros?|eur", subunit: "cents?|c" },
  JPY: { symbols: "¥|￥|jpy", unit: "yen|jpy" },
  NPR: { symbols: "rs\\.?|npr|रु|₨", unit: "rupees?|npr" },
  INR: { symbols: "₹|rs\\.?|inr", unit: "rupees?|inr" },
};

/** Words that pick a currency in "switch to ..." commands. */
const CURRENCY_NAMES = [
  ["AUD", /australia/],
  ["USD", /\b(us|u\.s\.|usa|america|american)\b/],
  ["EUR", /euro/],
  ["JPY", /\byen\b|japan/],
  ["NPR", /nepal/],
  ["INR", /india/],
];

const SMALL_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const TENS_PATTERN = new RegExp(
  `\\b(${TENS.slice(2).join("|")})(?:[ -](${SMALL_NUMBERS.slice(1, 10).join("|")}))?\\b`, "g");
const SMALL_PATTERN = new RegExp(`\\b(${SMALL_NUMBERS.join("|")})\\b`, "g");

/** US coin nicknames, rewritten to plain values before parsing. */
const US_NICKNAMES = [
  [/\bhalf dollars?\b/g, "50 cent coin"],
  [/\bquarters?\b/g, "25 cent coin"],
  [/\bdimes?\b/g, "10 cent coin"],
  [/\bnickels?\b/g, "5 cent coin"],
  [/\bpenn(?:y|ies)\b/g, "1 cent coin"],
];

/**
 * Lower-cases the phrase and turns spoken numbers into digits:
 * "add three fifty dollar notes" → " add 3 50 dollar notes ".
 */
export function normalise(text, currency) {
  let t = ` ${String(text).toLowerCase().replace(/(\d),(?=\d)/g, "$1").replace(/,/g, " ")} `;
  t = t.replace(/\b(?:a|an) (hundred|thousand)\b/g, "1 $1");
  t = t.replace(/\ban? (dollar|euro|rupee|yen)\b/g, "1 $1");
  if (currency.code === "USD") {
    for (const [pattern, replacement] of US_NICKNAMES) t = t.replace(pattern, replacement);
  }
  t = t.replace(TENS_PATTERN, (_, tens, unit) => String(TENS.indexOf(tens) * 10 + (unit ? SMALL_NUMBERS.indexOf(unit) : 0)));
  t = t.replace(SMALL_PATTERN, (word) => String(SMALL_NUMBERS.indexOf(word)));

  // "5 hundred" is a 500 note when one exists (₹500); otherwise it means five 100s
  // ("2 hundred dollar notes" = two $100 notes).
  const faceValues = new Set(currency.all.map((item) => item.value / currency.minor));
  t = t.replace(/\b(\d+) (hundred|thousand)\b/g, (_, n, word) => {
    const multiplier = word === "hundred" ? 100 : 1000;
    const combined = Number(n) * multiplier;
    return faceValues.has(combined) ? String(combined) : `${n} ${multiplier}`;
  });
  return t.replace(/\bhundred\b/g, "100").replace(/\bthousand\b/g, "1000");
}

/**
 * Finds the note or coin mentioned in a normalised phrase, e.g. "$50", "50 dollar",
 * "50 cents", "€2", "500 rupee note", "10000 yen".
 * Returns { item, rest } where rest is the phrase with that mention removed, or null.
 */
export function findDenomination(t, currency) {
  const words = SPEECH_WORDS[currency.code];
  const amountWords = [words.unit, words.subunit, "notes?", "bills?", "coins?"].filter(Boolean).join("|");
  const pattern = new RegExp(
    `(?<![a-z])(?:${words.symbols})\\s?(\\d+(?:\\.\\d+)?)|(\\d+(?:\\.\\d+)?)\\s*(${amountWords})(?![a-z])`, "g");
  const subunitPattern = words.subunit ? new RegExp(`^(?:${words.subunit})$`) : null;
  const wantsCoin = /\bcoins?\b/.test(t);
  const wantsNote = /\b(notes?|bills?)\b/.test(t);

  for (const match of t.matchAll(pattern)) {
    const [whole, symbolAmount, wordAmount, word = ""] = match;
    const n = parseFloat(symbolAmount ?? wordAmount);
    const asMajor = Math.round(n * currency.minor);
    let value = asMajor;
    if (symbolAmount === undefined) {
      if (subunitPattern?.test(word)) value = Math.round(n);
      // "50 coin" with no 50-dollar coin means the 50 cent coin
      else if (/^coin/.test(word) && !currency.coins.some((c) => c.value === asMajor)) value = Math.round(n);
    }

    const matches = currency.all.filter((item) => item.value === value);
    // Some values exist as both a note and a coin (US $1, ₹10, ₹20): "coin" or "note" decides,
    // otherwise the note.
    const item = matches.find((m) => (wantsCoin ? m.kind === "coin" : wantsNote ? m.kind === "note" : true)) ?? matches[0];
    if (item) return { item, rest: `${t.slice(0, match.index)} ${t.slice(match.index + whole.length)}` };
  }
  return null;
}

/** Parses one spoken phrase into a command for the given currency. */
export function parseCommand(text, currency) {
  const t = normalise(text, currency);
  const found = findDenomination(t, currency);

  if (!found) {
    if (/\bstop\b|\bturn off\b/.test(t)) return { type: "stop" };
    if (/\bhelp\b|what can i say/.test(t)) return { type: "help" };
    if (/\b(switch|change|use|currency)\b/.test(t)) {
      const hit = CURRENCY_NAMES.find(([, pattern]) => pattern.test(t));
      if (hit) return { type: "switch", code: hit[0] };
    }
  }
  if (/\bundo\b/.test(t)) return { type: "undo" };
  if (/\b(clear|reset|start over)\b/.test(t)) return { type: "clear" };
  if (!found) return /\b(total|how much|read|summary|count)\b/.test(t) ? { type: "summary" } : null;

  const { item, rest } = found;
  const setTo = /\b(set|make|change|put)\b/.test(t) && rest.match(/\b(?:to|at|=)\s*(\d+)/);
  if (setTo) return { type: "set", id: item.id, count: Number(setTo[1]) };

  const amount = Number(rest.match(/\d+/)?.[0] ?? 1);
  const removing = /\b(remove|minus|take|subtract|delete|less|away)\b/.test(t);
  return { type: "add", id: item.id, amount: removing ? -amount : amount };
}
