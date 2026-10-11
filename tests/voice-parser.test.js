import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CURRENCIES } from "../js/currencies.js";
import { normalise, parseCommand } from "../js/voice-parser.js";

/** Asserts that a phrase in a currency parses to the expected command. */
function expectCommand(code, phrase, expected) {
  assert.deepEqual(parseCommand(phrase, CURRENCIES[code]), expected, `${code}: "${phrase}"`);
}

describe("normalise", () => {
  it("turns spoken numbers into digits", () => {
    assert.match(normalise("add twenty five coins", CURRENCIES.AUD), / add 25 coins /);
    assert.match(normalise("add 1,000 yen", CURRENCIES.JPY), / add 1000 yen /);
  });

  it("reads 'N hundred' as a note when one exists, otherwise as a count", () => {
    assert.match(normalise("five hundred rupee note", CURRENCIES.INR), / 500 rupee note /);
    assert.match(normalise("two hundred dollar notes", CURRENCIES.AUD), / 2 100 dollar notes /);
  });
});

describe("parseCommand: adding and removing", () => {
  const cases = [
    ["AUD", "add 3 $50 notes", { type: "add", id: "n5000", amount: 3 }],
    ["AUD", "add three fifty dollar notes", { type: "add", id: "n5000", amount: 3 }],
    ["AUD", "two hundred dollar notes", { type: "add", id: "n10000", amount: 2 }],
    ["AUD", "a $5 note", { type: "add", id: "n500", amount: 1 }],
    ["AUD", "add a dollar coin", { type: "add", id: "c100", amount: 1 }],
    ["AUD", "add 5 50c coins", { type: "add", id: "c50", amount: 5 }],
    ["AUD", "add twenty five 10 cent coins", { type: "add", id: "c10", amount: 25 }],
    ["AUD", "remove one 20 cent coin", { type: "add", id: "c20", amount: -1 }],
    ["AUD", "take away 2 $50 notes", { type: "add", id: "n5000", amount: -2 }],
    ["AUD", "add 3 $0.05", { type: "add", id: "c5", amount: 3 }],
    ["USD", "add 3 quarters", { type: "add", id: "c25", amount: 3 }],
    ["USD", "add 4 pennies", { type: "add", id: "c1", amount: 4 }],
    ["USD", "add a $1 bill", { type: "add", id: "n100", amount: 1 }],
    ["USD", "add 2 $1 coins", { type: "add", id: "c100", amount: 2 }],
    ["EUR", "add 3 €50 notes", { type: "add", id: "n5000", amount: 3 }],
    ["EUR", "add two 2 euro coins", { type: "add", id: "c200", amount: 2 }],
    ["EUR", "add 1 five hundred euro note", { type: "add", id: "n50000", amount: 1 }],
    ["JPY", "add 3 ten thousand yen notes", { type: "add", id: "n10000", amount: 3 }],
    ["JPY", "add 2 ¥1,000 notes", { type: "add", id: "n1000", amount: 2 }],
    ["NPR", "add 2 Rs 1000 notes", { type: "add", id: "n1000", amount: 2 }],
    ["NPR", "add 3 ten rupee coins", { type: "add", id: "c10", amount: 3 }],
    ["NPR", "add 4 ten rupee notes", { type: "add", id: "n10", amount: 4 }],
    ["INR", "add 2 ₹500 notes", { type: "add", id: "n500", amount: 2 }],
    ["INR", "add 2 twenty rupee coins", { type: "add", id: "c20", amount: 2 }],
    ["INR", "add 5 ₹20", { type: "add", id: "n20", amount: 5 }],
  ];
  for (const [code, phrase, expected] of cases) {
    it(`${code}: "${phrase}"`, () => expectCommand(code, phrase, expected));
  }
});

describe("parseCommand: other commands", () => {
  it("sets an exact count", () => {
    expectCommand("AUD", "set $10 notes to 4", { type: "set", id: "n1000", count: 4 });
    expectCommand("AUD", "change ten dollar notes to seven", { type: "set", id: "n1000", count: 7 });
  });

  it("switches currency", () => {
    expectCommand("AUD", "switch to euros", { type: "switch", code: "EUR" });
    expectCommand("EUR", "change currency to indian rupees", { type: "switch", code: "INR" });
    expectCommand("AUD", "use japanese yen", { type: "switch", code: "JPY" });
  });

  it("doesn't mistake a count change for a currency switch", () => {
    expectCommand("EUR", "change 5 euro notes to 4", { type: "set", id: "n500", count: 4 });
  });

  it("understands the simple commands", () => {
    expectCommand("AUD", "what's the total", { type: "summary" });
    expectCommand("AUD", "clear all", { type: "clear" });
    expectCommand("AUD", "undo", { type: "undo" });
    expectCommand("AUD", "help", { type: "help" });
    expectCommand("AUD", "stop listening", { type: "stop" });
  });

  it("returns null for anything else", () => {
    expectCommand("AUD", "blah blah", null);
    expectCommand("AUD", "add 3 $7 notes", null); // there's no $7 note
  });
});
