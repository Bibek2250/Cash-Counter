// Voice: hear the total read aloud, and count money hands-free by talking.
// Uses the browser's built-in speech features (no extra downloads). Uses NOTES, ALL,
// last, adjust(), update() and fmt() from script.js.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canSpeak = "speechSynthesis" in window;
const micBtn = document.getElementById("micBtn");
const readBtn = document.getElementById("readBtn");
const voiceStatus = document.getElementById("voiceStatus");

// Everything spoken is also shown on screen, for people who can't hear it.
function say(text, heard){
  voiceStatus.hidden = false;
  voiceStatus.innerHTML = "";
  if(heard){
    const h = document.createElement("span");
    h.className = "heard"; h.textContent = `You said: “${heard}”`;
    voiceStatus.append(h);
  }
  voiceStatus.append(document.createTextNode(text));
  if(!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = CUR.locale;
  speechSynthesis.speak(u);
}

// e.g. "Total $1,260.70. Notes $1,220.00: 100 dollar notes: 3, 50 dollar notes: 12. Coins $40.70: 2 dollar coins: 7."
function summary(){
  const part = list => {
    const items = list.filter(d => last[d.id] > 0).map(d => `${d.name}s: ${last[d.id]}`);
    const sum = list.reduce((s, d) => s + last[d.id]*d.value, 0);
    return items.length ? `${fmt(sum)}: ${items.join(", ")}.` : "none.";
  };
  const total = ALL.reduce((s, d) => s + last[d.id]*d.value, 0);
  return `Total ${fmt(total)}. Notes ${part(NOTES)} Coins ${part(COINS)}`;
}

const help = () => {
  const n = NOTES[1] || NOTES[0], c = COINS[COINS.length-1];
  return `You can say things like: add 3 ${n.name}s. Remove one ${c.name}. Set ${NOTES[0].name}s to 4. ` +
    "What's the total. Switch to euros. Clear all. Undo. Or stop listening.";
};

// How people say each currency: symbols, the main unit and the small unit.
const WORDS = {
  AUD:{sym:"a\\$|aud|\\$", unit:"dollars?|bucks?|aud", sub:"cents?|c"},
  USD:{sym:"us\\$|usd|\\$", unit:"dollars?|bucks?|usd", sub:"cents?|c|¢"},
  EUR:{sym:"€|eur", unit:"euros?|eur", sub:"cents?|c"},
  JPY:{sym:"¥|￥|jpy", unit:"yen|jpy"},
  NPR:{sym:"rs\\.?|npr|रु|₨", unit:"rupees?|npr"},
  INR:{sym:"₹|rs\\.?|inr", unit:"rupees?|inr"},
};
const CURRENCY_NAMES = [["AUD",/australia/],["USD",/\b(us|u\.s\.|usa|america|american)\b/],["EUR",/euro/],
  ["JPY",/\byen\b|japan/],["NPR",/nepal/],["INR",/india/]];

// Speech comes back as words or digits ("three", "3", "$50", "fifty cents", "10,000 yen"); turn it into digits.
const UNITS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven",
  "twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
function normalise(text){
  let t = " " + text.toLowerCase().replace(/(\d),(?=\d)/g, "$1").replace(/,/g, " ") + " ";
  t = t.replace(/\b(?:a|an) (hundred|thousand)\b/g, "1 $1").replace(/\ban? (dollar|euro|rupee|yen)\b/g, "1 $1");
  if(currency === "USD") // US coin nicknames
    t = t.replace(/\bhalf dollars?\b/g, "50 cent coin").replace(/\bquarters?\b/g, "25 cent coin")
         .replace(/\bdimes?\b/g, "10 cent coin").replace(/\bnickels?\b/g, "5 cent coin").replace(/\bpenn(y|ies)\b/g, "1 cent coin");
  t = t.replace(new RegExp(`\\b(${TENS.slice(2).join("|")})(?:[ -](${UNITS.slice(1,10).join("|")}))?\\b`, "g"),
    (m, tens, unit) => TENS.indexOf(tens)*10 + (unit ? UNITS.indexOf(unit) : 0));
  t = t.replace(new RegExp(`\\b(${UNITS.join("|")})\\b`, "g"), m => UNITS.indexOf(m));
  // "5 hundred" is a ₹500 note if one exists; otherwise it means five of the 100s ("2 hundred dollar notes").
  const faces = new Set(ALL.map(d => d.value / CUR.minor));
  t = t.replace(/\b(\d+) (hundred|thousand)\b/g, (m, n, big) => {
    const mult = big === "hundred" ? 100 : 1000;
    return faces.has(n*mult) ? String(n*mult) : `${n} ${mult}`;
  });
  return t.replace(/\bhundred\b/g, "100").replace(/\bthousand\b/g, "1000");
}

// Finds which note or coin was mentioned, e.g. "$50", "50 dollar", "50 cents", "€2", "500 rupee note", "10000 yen".
function findDenom(t){
  const w = WORDS[currency];
  const re = new RegExp(`(?<![a-z])(?:${w.sym})\\s?(\\d+(?:\\.\\d+)?)|(\\d+(?:\\.\\d+)?)\\s*(${w.unit}${w.sub ? "|" + w.sub : ""}|notes?|bills?|coins?)(?![a-z])`, "g");
  const wantCoin = /\bcoins?\b/.test(t), wantNote = /\b(notes?|bills?)\b/.test(t);
  let m;
  while((m = re.exec(t))){
    const n = parseFloat(m[1] ?? m[2]), word = m[3] || "";
    let value;
    if(m[1] !== undefined) value = Math.round(n*CUR.minor);
    else if(w.sub && new RegExp(`^(?:${w.sub})$`).test(word)) value = Math.round(n);
    else if(/^coin/.test(word) && !COINS.some(c => c.value === Math.round(n*CUR.minor))) value = Math.round(n); // "50 coin" = 50c
    else value = Math.round(n*CUR.minor);
    const options = ALL.filter(x => x.value === value);
    // Some values come as both a note and a coin (US $1, ₹10, ₹20): "coin" or "note" decides, otherwise the note.
    const d = options.find(x => wantCoin ? x.kind === "coin" : wantNote ? x.kind === "note" : true) || options[0];
    if(d) return {d, rest: t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)};
  }
  return null;
}

// Works out one spoken phrase. Returns what to say back, or null if it wasn't understood.
function runCommand(raw){
  const t = normalise(raw);
  if(/\bstop listening\b|\bstop\b|\bturn off\b/.test(t) && !findDenom(t)){ setListening(false); return "Stopped listening."; }
  if(/\bhelp\b|what can i say/.test(t)) return help();
  if(/\b(switch|change|use|currency)\b/.test(t) && !findDenom(t)){
    const hit = CURRENCY_NAMES.find(([, re]) => re.test(t));
    if(hit){
      const select = document.getElementById("currency");
      select.value = hit[0]; select.dispatchEvent(new Event("change"));
      return `Now counting ${CUR.name}s. Total ${fmt(animTo)}.`;
    }
  }
  if(/\bundo\b/.test(t)){
    const undo = document.getElementById("undoBtn");
    if(document.getElementById("toast").hidden) return "There's nothing to undo.";
    undo.click(); return "Restored. " + summary();
  }
  if(/\b(clear|reset|start over)\b/.test(t)){
    if(!Object.values(last).some(q => q > 0)) return "There's nothing to clear.";
    document.getElementById("clearBtn").click(); return "All counts cleared. Say undo to bring them back.";
  }

  const found = findDenom(t);
  if(!found){
    if(/\b(total|how much|read|summary|count)\b/.test(t)) return summary();
    return null;
  }
  const {d, rest} = found, before = last[d.id];
  const setTo = /\b(set|make|change|put)\b/.test(t) && rest.match(/\b(?:to|at|=)\s*(\d+)/);
  if(setTo){
    adjust(d.id, Number(setTo[1]) - before);
  } else {
    const n = Number((rest.match(/\d+/) || ["1"])[0]);
    adjust(d.id, /\b(remove|minus|take|subtract|delete|less|away)\b/.test(t) ? -n : n);
  }
  const now = last[d.id], diff = now - before;
  if(!diff && !now) return `There are no ${d.name}s to remove.`;
  const did = diff > 0 ? `Added ${diff}` : diff < 0 ? `Removed ${-diff}` : "No change";
  return `${did}. ${d.name}s: ${now}, ${fmt(now*d.value)}. Total ${fmt(animTo)}.`;
}

// "Read total" button
if(canSpeak) readBtn.onclick = () => say(summary());
else readBtn.hidden = true;

// Voice commands button: listens until pressed again (or "stop listening").
let rec = null, listening = false;
function setListening(on){
  listening = on;
  micBtn.setAttribute("aria-pressed", on);
  micBtn.classList.toggle("listening", on);
  if(!rec) return;
  if(on) rec.lang = CUR.locale; // e.g. Indian English for rupees
  try{ on ? rec.start() : rec.stop(); }catch(e){}
}
if(SR){
  rec = new SR();
  rec.continuous = true;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.onresult = e => {
    for(let i = e.resultIndex; i < e.results.length; i++){
      const r = e.results[i];
      if(!r.isFinal || (canSpeak && speechSynthesis.speaking)) continue; // don't react to our own voice
      let reply = null;
      for(let a = 0; a < r.length && reply === null; a++) reply = runCommand(r[a].transcript);
      say(reply ?? "Sorry, I didn't understand that. Say help for examples.", r[0].transcript.trim());
    }
  };
  // Browsers stop listening after a pause; carry on until the person turns it off.
  rec.onend = () => { if(listening) try{ rec.start(); }catch(e){} };
  rec.onerror = e => {
    if(e.error === "not-allowed" || e.error === "service-not-allowed"){
      setListening(false);
      say("The microphone is blocked. Allow microphone access in your browser settings to use voice commands.");
    } else if(e.error === "network"){
      setListening(false);
      say("Voice commands need an internet connection in this browser.");
    }
  };
  micBtn.onclick = () => {
    if(listening){ setListening(false); say("Stopped listening."); return; }
    setListening(true);
    say("Listening. " + help());
  };
} else {
  micBtn.hidden = true; // e.g. Firefox: no speech recognition, but "Read total" still works
}
