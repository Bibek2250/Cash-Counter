import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUD } from "../js/currencies.js";
import { normalise, parseCommand } from "../js/voice-parser.js";

/** Asserts that a phrase parses to the expected command. */
function expectCommand(phrase, expected) {
  assert.deepEqual(parseCommand(phrase, AUD), expected, `"${phrase}"`);
}

describe("normalise", () => {
  it("turns spoken numbers into digits", () => {
    assert.match(normalise("add twenty five coins", AUD), / add 25 coins /);
    assert.match(normalise("add 1,000 dollars", AUD), / add 1000 dollars /);
  });

  it("reads 'N hundred' as a count when there's no such note", () => {
    assert.match(normalise("two hundred dollar notes", AUD), / 2 100 dollar notes /);
  });
});

describe("parseCommand: adding and removing", () => {
  const cases = [
    ["add 3 $50 notes", { type: "add", id: "n5000", amount: 3 }],
    ["add three fifty dollar notes", { type: "add", id: "n5000", amount: 3 }],
    ["two hundred dollar notes", { type: "add", id: "n10000", amount: 2 }],
    ["a $5 note", { type: "add", id: "n500", amount: 1 }],
    ["add a dollar coin", { type: "add", id: "c100", amount: 1 }],
    ["add two 2 dollar coins", { type: "add", id: "c200", amount: 2 }],
    ["add 5 50c coins", { type: "add", id: "c50", amount: 5 }],
    ["add twenty five 10 cent coins", { type: "add", id: "c10", amount: 25 }],
    ["remove one 20 cent coin", { type: "add", id: "c20", amount: -1 }],
    ["take away 2 $50 notes", { type: "add", id: "n5000", amount: -2 }],
    ["add 3 $0.05", { type: "add", id: "c5", amount: 3 }],
    ["add 4 A$20 notes", { type: "add", id: "n2000", amount: 4 }],
  ];
  for (const [phrase, expected] of cases) {
    it(`"${phrase}"`, () => expectCommand(phrase, expected));
  }
});

describe("parseCommand: coin rolls", () => {
  const cases = [
    ["add 2 rolls of $2 coins", { type: "add", id: "r200", amount: 2 }],
    ["add three 50 cent rolls", { type: "add", id: "r50", amount: 3 }],
    ["add a dollar roll", { type: "add", id: "r100", amount: 1 }],
    ["add 5 rolls of 10 cent coins", { type: "add", id: "r10", amount: 5 }],
    ["remove one roll of 10c coins", { type: "add", id: "r10", amount: -1 }],
    ["set $2 rolls to 6", { type: "set", id: "r200", count: 6 }],
    ["add 2 rolls of $50 notes", null], // notes don't come in rolls
  ];
  for (const [phrase, expected] of cases) {
    it(`"${phrase}"`, () => expectCommand(phrase, expected));
  }
});

describe("parseCommand: other commands", () => {
  it("sets an exact count", () => {
    expectCommand("set $10 notes to 4", { type: "set", id: "n1000", count: 4 });
    expectCommand("change ten dollar notes to seven", { type: "set", id: "n1000", count: 7 });
  });

  it("understands the simple commands", () => {
    expectCommand("what's the total", { type: "summary" });
    expectCommand("clear all", { type: "clear" });
    expectCommand("undo", { type: "undo" });
    expectCommand("help", { type: "help" });
    expectCommand("stop listening", { type: "stop" });
  });

  it("asks about the float and banking", () => {
    expectCommand("how much do I bank", { type: "float" });
    expectCommand("what's the float", { type: "float" });
    expectCommand("read the deposit", { type: "float" });
    // A note or coin in the phrase still means counting it.
    expectCommand("add 2 $20 notes to the bank", { type: "add", id: "n2000", amount: 2 });
  });

  it("returns null for anything else", () => {
    expectCommand("blah blah", null);
    expectCommand("add 3 $7 notes", null); // there's no $7 note
    expectCommand("switch to euros", null); // only Australian dollars are counted
  });
});
