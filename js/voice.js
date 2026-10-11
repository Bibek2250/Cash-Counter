/**
 * Voice: "Read total" speaks the count aloud, and "Voice commands" lets people count hands-free.
 * Uses the browser's built-in speech APIs. Everything spoken is also shown on screen for people
 * who can't hear it. The phrase → command logic lives in voice-parser.js.
 */
import { hasAnyCounts, totals } from "./counts.js";
import { h } from "./dom.js";
import { parseCommand } from "./voice-parser.js";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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

function helpText(currency) {
  const exampleNote = currency.notes[1] ?? currency.notes[0];
  const exampleCoin = currency.coins[currency.coins.length - 1];
  const rollTip = currency.rolls.length ? `Add 2 rolls of ${currency.rolls[0].name.replace(/ roll$/, "")}s. ` : "";
  return `You can say things like: add 3 ${exampleNote.name}s. Remove one ${exampleCoin.name}. ${rollTip}` +
    `Set ${currency.notes[0].name}s to 4. What's the total. Clear all. Undo. Or stop listening.`;
}

/**
 * @param {object} app  the counter's API (see createVoiceApi in app.js)
 * @param {{mic: HTMLButtonElement, read: HTMLButtonElement, status: HTMLElement}} ui
 */
export function initVoice(app, ui) {
  let recognition = null;
  let listening = false;

  function say(text, heard) {
    ui.status.hidden = false;
    ui.status.replaceChildren(
      heard ? h("span", { class: "heard" }, `You said: “${heard}”`) : "",
      text,
    );
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = app.currency.locale;
    speechSynthesis.speak(utterance);
  }

  function setListening(on) {
    listening = on;
    ui.mic.setAttribute("aria-pressed", String(on));
    ui.mic.classList.toggle("listening", on);
    if (!recognition) return;
    try {
      if (on) {
        recognition.lang = app.currency.locale;
        recognition.start();
      } else {
        recognition.stop();
      }
    } catch {
      // start() throws if recognition is already running; nothing to do.
    }
  }

  /** Carries out one command and returns the reply to speak. */
  function run(command) {
    const currency = app.currency;
    switch (command.type) {
      case "stop":
        setListening(false);
        return "Stopped listening.";
      case "help":
        return helpText(currency);
      case "summary":
        return summaryText(currency, app.counts);
      case "undo":
        if (!app.canUndo()) return "There's nothing to undo.";
        app.undo();
        return `Restored. ${summaryText(currency, app.counts)}`;
      case "clear":
        if (!hasAnyCounts(app.counts)) return "There's nothing to clear.";
        app.clearAll();
        return "All counts cleared. Say undo to bring them back.";
      case "add":
      case "set": {
        const item = currency.all.find((i) => i.id === command.id);
        const before = app.counts[item.id];
        if (command.type === "set") app.setCount(item.id, command.count);
        else app.adjust(item.id, command.amount);
        const after = app.counts[item.id];
        if (before === after && after === 0) return `There are no ${item.name}s to remove.`;
        const change = after - before;
        const did = change > 0 ? `Added ${change}` : change < 0 ? `Removed ${-change}` : "No change";
        const { total } = totals(app.counts, currency);
        return `${did}. ${item.name}s: ${after}, ${currency.format(after * item.value)}. Total ${currency.format(total)}.`;
      }
      default:
        return null;
    }
  }

  // "Read total"
  if (canSpeak) ui.read.addEventListener("click", () => say(summaryText(app.currency, app.counts)));
  else ui.read.hidden = true;

  // "Voice commands": listens until pressed again (or "stop listening").
  if (!SpeechRecognition) {
    ui.mic.hidden = true; // e.g. Firefox: no recognition, but "Read total" still works
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.addEventListener("result", (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      // Ignore anything heard while we're talking, so we don't react to our own voice.
      if (!result.isFinal || (canSpeak && speechSynthesis.speaking)) continue;
      let reply = null;
      for (let a = 0; a < result.length && reply === null; a++) {
        const command = parseCommand(result[a].transcript, app.currency);
        if (command) reply = run(command);
      }
      say(reply ?? "Sorry, I didn't understand that. Say help for examples.", result[0].transcript.trim());
    }
  });

  // Browsers stop listening after a pause; carry on until the person turns it off.
  recognition.addEventListener("end", () => {
    if (!listening) return;
    try {
      recognition.start();
    } catch {
      // Already restarting.
    }
  });

  recognition.addEventListener("error", (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setListening(false);
      say("The microphone is blocked. Allow microphone access in your browser settings to use voice commands.");
    } else if (event.error === "network") {
      setListening(false);
      say("Voice commands need an internet connection in this browser.");
    }
  });

  ui.mic.addEventListener("click", () => {
    if (listening) {
      setListening(false);
      say("Stopped listening.");
      return;
    }
    setListening(true);
    say(`Listening. ${helpText(app.currency)}`);
  });
}
