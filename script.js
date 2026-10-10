// Every currency's notes and coins. Values are in the currency's smallest counted unit
// (cents for AUD/USD/EUR; whole yen and rupees for JPY/NPR/INR, which have no small coins in use).
//   note(value, colour, length mm, height mm, tactile bumps)
//   coin(value, metal colour, diameter mm, extras)
// Real sizes keep the pictures in true proportion. Bumps are the raised dots on Australian notes
// that let people who are blind tell them apart. Colours are close to the real money, not exact.
const GOLD="#c99a2e", SILVER="#9aa4a8", COPPER="#b5653a", BRASS="#c8a24a", NORDIC="#d4b04c", BRONZE="#a8743f", ALU="#c9cdd0";
const note = (value, color, mm, h, bumps=0) => ({kind:"note", value, color, w:mm*65/h, bumps});
const coin = (value, color, mm, extra={}) => ({kind:"coin", value, color, w:mm, ...extra});

const CURRENCIES = {
  AUD: {name:"Australian dollar", locale:"en-AU", minor:100, symbol:"$", unit:"dollar", sub:"cent", subMark:"c", country:"AUSTRALIA",
    key:"aud-cash-counter-v3", // the original save slot, so existing counts carry over
    notes:[note(10000,"#2f8f4e",158,65,5), note(5000,"#d9a514",151,65,4), note(2000,"#d2502f",144,65,3), note(1000,"#2d6fc0",137,65,2), note(500,"#a2508f",130,65,1)],
    coins:[coin(200,GOLD,20.5,{stars:true}), coin(100,GOLD,25), coin(50,SILVER,31.65,{sides:12}), coin(20,SILVER,28.65), coin(10,SILVER,23.6), coin(5,SILVER,19.41)]},
  USD: {name:"US dollar", locale:"en-US", minor:100, symbol:"$", unit:"dollar", sub:"cent", subMark:"¢", country:"UNITED STATES",
    notes:[note(10000,"#3d8fa6",156,66), note(5000,"#b5577c",156,66), note(2000,"#6f9a5a",156,66), note(1000,"#d07a32",156,66), note(500,"#7b5ea7",156,66), note(200,"#4f7d5a",156,66), note(100,"#5f7f5a",156,66)],
    coins:[coin(100,BRASS,26.49), coin(50,SILVER,30.61), coin(25,SILVER,24.26), coin(10,SILVER,17.91), coin(5,SILVER,21.21,{smooth:true}), coin(1,COPPER,19.05,{smooth:true})]},
  EUR: {name:"Euro", locale:"en-IE", minor:100, symbol:"€", unit:"euro", sub:"cent", subMark:"c", country:"EURO",
    notes:[note(50000,"#8e5a9b",160,82), note(20000,"#c9a43a",153,77), note(10000,"#3f9a5a",147,77), note(5000,"#e08a2e",140,77), note(2000,"#3b6fb6",133,72), note(1000,"#d0453c",127,67), note(500,"#8a8f94",120,62)],
    coins:[coin(200,SILVER,25.75,{inner:GOLD}), coin(100,GOLD,23.25,{inner:SILVER}), coin(50,NORDIC,24.25), coin(20,NORDIC,22.25), coin(10,NORDIC,19.75), coin(5,COPPER,21.25,{smooth:true}), coin(2,COPPER,18.75,{smooth:true}), coin(1,COPPER,16.25,{smooth:true})]},
  JPY: {name:"Japanese yen", locale:"en-US", minor:1, symbol:"¥", unit:"yen", country:"NIPPON",
    notes:[note(10000,"#8a6a3f",160,76), note(5000,"#8e6aa8",156,76), note(2000,"#4f8a6e",154,76), note(1000,"#3f6fa8",150,76)],
    coins:[coin(500,BRASS,26.5,{inner:SILVER}), coin(100,SILVER,22.6), coin(50,SILVER,21,{hole:true}), coin(10,BRONZE,23.5,{smooth:true}), coin(5,BRASS,22,{hole:true,smooth:true}), coin(1,ALU,20,{smooth:true})]},
  NPR: {name:"Nepalese rupee", locale:"en-IN", minor:1, symbol:"Rs", unit:"rupee", country:"NEPAL",
    notes:[note(1000,"#5a6fa8",160,70), note(500,"#a0703a",155,70), note(100,"#3f8a4f",150,70), note(50,"#6a5aa0",145,70), note(20,"#d0783a",140,70), note(10,"#9a4a3a",135,70), note(5,"#c04a4a",130,70)],
    coins:[coin(10,SILVER,27,{inner:BRASS}), coin(5,SILVER,25), coin(2,BRASS,23), coin(1,BRASS,20)]},
  INR: {name:"Indian rupee", locale:"en-IN", minor:1, symbol:"₹", unit:"rupee", country:"INDIA",
    notes:[note(500,"#8f9089",150,66), note(200,"#e3b23c",146,66), note(100,"#9b8fc4",142,66), note(50,"#4fb3c9",135,66), note(20,"#b8c24a",129,63), note(10,"#8a5a3a",123,63)],
    coins:[coin(20,BRASS,27,{sides:12,inner:SILVER}), coin(10,BRASS,27,{inner:SILVER}), coin(5,BRASS,25), coin(2,SILVER,23), coin(1,SILVER,20)]},
};

// Fill in each note/coin's id, labels and spoken name, e.g. "$100" / "100 dollar note", "50c" / "50 cent coin".
for(const cur of Object.values(CURRENCIES)){
  for(const d of [...cur.notes, ...cur.coins]){
    const major = d.value / cur.minor, isSub = major < 1;
    const num = isSub ? String(d.value) : major.toLocaleString(cur.locale);
    d.id = (d.kind==="coin" ? "c" : "n") + d.value;
    d.face = isSub ? d.value + cur.subMark : (d.kind==="coin" && cur.symbol!=="¥" ? cur.symbol : "") + num; // printed on the picture
    d.name = `${num} ${isSub ? cur.sub : cur.unit} ${d.kind}`;
  }
}

const CURRENCY_KEY = "cash-counter-currency";
let currency = "AUD", CUR = CURRENCIES.AUD, NOTES = CUR.notes, COINS = CUR.coins, ALL = [...NOTES, ...COINS];
let KEY = CUR.key, money = null;
try{ const c = localStorage.getItem(CURRENCY_KEY); if(CURRENCIES[c]) currency = c; }catch(e){}

const isCoin = d => d.kind === "coin";
const MOTION_KEY = "aud-cash-counter-calm";
const MAX = 99999; // per denomination; keeps totals well inside safe integer range
const fmt = v => money.format(v / CUR.minor);
const osReduced = matchMedia("(prefers-reduced-motion: reduce)");
const calm = () => osReduced.matches || document.documentElement.classList.contains("calm");
const clampQty = v => { const n=Math.floor(Number(v)); return Number.isFinite(n)&&n>0?Math.min(n,MAX):0; };
const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;");

// Drawn banknote: clear window, portrait, wave pattern, any tactile bumps and a big value.
function noteArt(d){
  const W=d.w, px=W*.56, face=d.face, fs = face.length<=3 ? 27 : face.length===4 ? 23 : face.length===5 ? 20 : 17;
  let bumps=""; for(let i=0;i<d.bumps;i++) bumps+=`<circle cx="${36+i*7}" cy="7" r="2.3"/>`;
  return `<svg viewBox="0 0 ${W} 65" aria-hidden="true" focusable="false">
    <rect width="${W}" height="65" rx="4" style="fill:var(--c)"/>
    <path d="M0 48Q${W*.25} 34 ${W*.5} 48T${W} 46V65H0Z" fill="#fff" fill-opacity=".14"/>
    <path d="M0 20Q${W*.3} 8 ${W*.6} 20T${W} 16M0 26Q${W*.3} 14 ${W*.6} 26T${W} 22" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1.2"/>
    <ellipse cx="${px}" cy="36" rx="15" ry="20" fill="#000" fill-opacity=".1" stroke="#fff" stroke-opacity=".3"/>
    <circle cx="${px}" cy="30" r="7" fill="#000" fill-opacity=".22"/>
    <path d="M${px-13} 53Q${px-12} 39 ${px} 39Q${px+12} 39 ${px+13} 53Z" fill="#000" fill-opacity=".22"/>
    <rect x="7" y="6" width="19" height="53" rx="4" fill="#e9f7ff" fill-opacity=".75" stroke="#fff" stroke-opacity=".8"/>
    <path d="M16.5 15l2 5.5h5.5l-4.5 3.5 1.8 5.5-4.8-3.4-4.8 3.4 1.8-5.5-4.5-3.5h5.5z" fill="#7aa9c4" fill-opacity=".8"/>
    <path d="M12 44q4.5-8 9 0M12 50q4.5-8 9 0" fill="none" stroke="#7aa9c4" stroke-width="1.4"/>
    <g fill="#fff" fill-opacity=".85">${bumps}</g>
    <text x="${W-7}" y="31" text-anchor="end" font-family="Archivo, Arial, sans-serif" font-size="${fs}" font-weight="800" fill="#fff" stroke="#000" stroke-opacity=".55" stroke-width="3.5" paint-order="stroke">${esc(face)}</text>
    <text x="${W-7}" y="60" text-anchor="end" font-family="Archivo, Arial, sans-serif" font-size="7" font-weight="700" letter-spacing="1.2" fill="#fff" fill-opacity=".8">${CUR.country}</text>
  </svg>`;
}

// Drawn coin: metal shine, milled or smooth edge, 12 sides where real, two-metal centres,
// holes (yen) and a big value.
function coinArt(d){
  const shape = r => d.sides
    ? `<polygon points="${Array.from({length:d.sides},(_,k)=>{const a=(k*360/d.sides+15)*Math.PI/180;return `${(50+r*Math.cos(a)).toFixed(2)},${(50+r*Math.sin(a)).toFixed(2)}`;}).join(" ")}"`
    : `<circle cx="50" cy="50" r="${r}"`;
  const ink = "#241b10", gid = `g-${currency}-${d.id}`;
  const stars = d.stars ? `<g fill="${ink}" fill-opacity=".45"><circle cx="50" cy="17" r="2.6"/><circle cx="37" cy="23" r="2"/><circle cx="63" cy="23" r="2.2"/><circle cx="50" cy="29" r="1.6"/><circle cx="57" cy="27" r="1.2"/></g>` : "";
  const fs = d.hole ? 26 : d.face.length<=2 ? 40 : d.face.length===3 ? 33 : d.face.length===4 ? 27 : 23;
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <defs><radialGradient id="${gid}" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/>
    </radialGradient></defs>
    ${shape(49)} style="fill:var(--c)"/>
    ${d.inner ? `${shape(31)} fill="${d.inner}" stroke="#000" stroke-opacity=".2"/>` : ""}
    ${shape(49)} fill="url(#${gid})"/>
    ${d.sides || d.smooth ? "" : `<circle cx="50" cy="50" r="47" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3" stroke-dasharray="1.2 1.7"/>`}
    ${shape(40)} fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/>
    ${d.hole ? `<circle cx="50" cy="50" r="12" style="fill:var(--surface-solid)" stroke="#000" stroke-opacity=".35" stroke-width="2"/>` : ""}
    ${stars}
    <text x="50" y="${d.hole?34:d.stars?66:50+fs*.36}" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="${fs}" font-weight="800" fill="${ink}" stroke="#fff" stroke-opacity=".4" stroke-width="2" paint-order="stroke">${esc(d.face)}</text>
  </svg>`;
}

let rowIndex=0;
function buildRows(list, container){
  container.innerHTML = "";
  for(const d of list){
    const row = document.createElement("div");
    row.className = "row"; row.dataset.id = d.id;
    row.style.setProperty("--i", rowIndex++);
    const bulk = isCoin(d) ? 10 : 5;
    row.innerHTML = `
      <div class="denom"><span class="chip${isCoin(d)?" coin":" note"}${d.sides?" scallop":""}" style="--c:${d.color};--w:${d.w}" data-stack="0" role="img" aria-label="${d.name}">${isCoin(d)?coinArt(d):noteArt(d)}</span></div>
      <div class="counter">
        <button class="step" type="button" data-step="-1" aria-label="Remove one ${d.name}">−</button>
        <input class="qty" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" id="q-${d.id}" aria-label="Number of ${d.name}s" aria-describedby="tips" value="0">
        <button class="step" type="button" data-step="1" aria-label="Add one ${d.name}">+</button>
        <button class="quick" type="button" data-step="${bulk}" aria-label="+${bulk} ${d.name}s">+${bulk}</button>
      </div>
      <div class="line zero" id="t-${d.id}"></div>`;
    container.appendChild(row);
  }
}

const bar = document.getElementById("bar");
const logo = document.querySelector(".logo");

// Swap the whole page over to another currency (each keeps its own saved counts).
function useCurrency(code){
  currency = code; CUR = CURRENCIES[code]; NOTES = CUR.notes; COINS = CUR.coins; ALL = [...NOTES, ...COINS];
  KEY = CUR.key || "cash-counter-" + code;
  const digits = CUR.minor === 100 ? 2 : 0;
  money = new Intl.NumberFormat(CUR.locale, {style:"currency", currency:code, currencyDisplay:"narrowSymbol", minimumFractionDigits:digits, maximumFractionDigits:digits});
  rowIndex = 0;
  buildRows(NOTES, document.getElementById("notes"));
  buildRows(COINS, document.getElementById("coins"));
  bar.innerHTML = "";
  for(const d of ALL){ const i=document.createElement("i"); i.id="b-"+d.id; i.style.background=d.color; bar.appendChild(i); }
  logo.textContent = CUR.symbol === "Rs" ? "₨" : CUR.symbol;
  document.getElementById("currency").value = code;
  try{ localStorage.setItem(CURRENCY_KEY, code); }catch(e){}
}
useCurrency(currency);

function qty(id){ return clampQty(document.getElementById("q-"+id).value); }

let shown=0, animFrom=0, animTo=0, animStart=0, raf=0;
const grandEl = document.getElementById("grand");
const panel = document.querySelector(".total");
const miniGrand = document.getElementById("miniGrand");
const showTotal = c => { grandEl.textContent = miniGrand.textContent = fmt(c); };
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
function animateTotal(to, instant){
  if(to===animTo) return;
  cancelAnimationFrame(raf);
  if(!instant){ restart(grandEl, "bump"); restart(panel, "flash"); }
  if(instant||calm()){ shown=animTo=to; showTotal(to); return; }
  animFrom=shown; animTo=to; animStart=performance.now();
  const tick = now => {
    const t=Math.min(1,(now-animStart)/450), e=1-Math.pow(1-t,3);
    shown=Math.round(animFrom+(animTo-animFrom)*e);
    showTotal(shown);
    if(t<1) raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
}

// Screen readers hear one settled message, not every keystroke or animation frame.
const announceEl = document.getElementById("announce");
let announceTimer=0;
function announce(msg){
  clearTimeout(announceTimer);
  announceTimer=setTimeout(() => { announceEl.textContent=msg; }, 600);
}

let last = {};
function update(instant){
  let notes=0, coins=0; const state={}, changed=[];
  for(const d of ALL){ const q=qty(d.id); state[d.id]=q; if(isCoin(d)) coins+=q*d.value; else notes+=q*d.value; }
  const total=notes+coins;
  for(const d of ALL){
    const q=state[d.id], line=q*d.value;
    const t=document.getElementById("t-"+d.id);
    t.textContent=fmt(line); t.classList.toggle("zero",q===0);
    const row=t.closest(".row"); row.style.setProperty("--share",(total?line/total*100:0)+"%");
    document.getElementById("b-"+d.id).style.flexGrow=line;
    // "−" stays focusable at zero (so keyboard focus isn't lost) but says it can't go lower
    row.querySelector('[data-step="-1"]').setAttribute("aria-disabled", q===0);
    const c=row.querySelector(".chip");
    c.dataset.stack = q===0 ? 0 : q<2 ? 1 : q<5 ? 2 : q<20 ? 3 : 4; // how tall the pile looks
    if(last[d.id]!==undefined && last[d.id]!==q){ restart(c, "pop"); changed.push(d); }
  }
  last=state;
  animateTotal(total, instant);
  if(!instant){
    // e.g. "100 dollar notes: 3, $300.00. Total $1,260.70"
    const d=changed.length===1 && changed[0];
    announce((d ? `${d.name}s: ${state[d.id]}, ${fmt(state[d.id]*d.value)}. ` : "")+"Total "+fmt(total));
  }
  for(const id of ["notesSub","notesSub2","miniNotes"]) document.getElementById(id).textContent=fmt(notes);
  for(const id of ["coinsSub","coinsSub2","miniCoins"]) document.getElementById(id).textContent=fmt(coins);
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
}

function setAll(map, instant){ for(const d of ALL) document.getElementById("q-"+d.id).value=clampQty(map[d.id]); update(instant); }

function adjust(id, delta){
  const before=qty(id);
  document.getElementById("q-"+id).value=Math.min(MAX,Math.max(0,before+delta));
  const changed=qty(id)-before;
  hideToast(); update();
  if(changed) celebrate(id, changed);
}

// Little effects for button presses: chips fly into the total and "+$5.00" floats up.
// Purely visual, so hidden from screen readers.
function celebrate(id, changed){
  if(calm()) return;
  const d=ALL.find(x => x.id===id), row=document.querySelector(`.row[data-id="${id}"]`);
  const lineRect=document.getElementById("t-"+id).getBoundingClientRect();
  const f=document.createElement("div");
  f.className="float"+(changed<0?" minus":""); f.setAttribute("aria-hidden","true");
  f.textContent=(changed<0?"−":"+")+fmt(Math.abs(changed)*d.value);
  f.style.left=(lineRect.left+lineRect.width/2)+"px"; f.style.top=(lineRect.top-6)+"px";
  document.body.appendChild(f);
  f.addEventListener("animationend", () => f.remove());
  if(changed<0) return;

  const chip=row.querySelector(".chip"), from=chip.getBoundingClientRect(), to=(miniTotal.classList.contains("show")?miniGrand:grandEl).getBoundingClientRect(); // fly to whichever total is on screen
  const dx=to.left+to.width/2-(from.left+from.width/2), dy=to.top+to.height/2-(from.top+from.height/2);
  for(let n=0;n<Math.min(changed,5);n++){
    const fly=chip.cloneNode(true);
    fly.classList.remove("pop"); fly.classList.add("flyer"); fly.removeAttribute("data-stack");
    fly.removeAttribute("role"); fly.setAttribute("aria-hidden","true");
    fly.style.left=from.left+"px"; fly.style.top=from.top+"px";
    document.body.appendChild(fly);
    const spin=isCoin(d)?"rotateY(720deg)":"rotateX(540deg)";
    fly.animate([
      {transform:"translate(0,0) scale(1)", opacity:1},
      {transform:`translate(${dx*.5}px,${dy*.5-80}px) scale(1.3) ${spin.replace(/\d+/, m => m/2)}`, opacity:1, offset:.45},
      {transform:`translate(${dx}px,${dy}px) scale(.35) ${spin}`, opacity:0}
    ], {duration:700, delay:n*70, easing:"cubic-bezier(.5,0,.6,1)", fill:"backwards"}).onfinish=() => fly.remove();
  }
}

// Show the slim total bar once the big total has scrolled up out of view.
const miniTotal = document.getElementById("miniTotal");
new IntersectionObserver(([e]) => {
  miniTotal.classList.toggle("show", !e.isIntersecting && e.boundingClientRect.top < 0);
}).observe(grandEl);

// The total panel tilts in 3D toward the mouse.
if(matchMedia("(hover: hover) and (pointer: fine)").matches){
  panel.addEventListener("pointermove", e => {
    if(calm()) return;
    const r=panel.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    panel.classList.add("tilting");
    panel.style.setProperty("--rx", ((.5-y)*7).toFixed(2)+"deg");
    panel.style.setProperty("--ry", ((x-.5)*9).toFixed(2)+"deg");
    panel.style.setProperty("--mx", (x*100).toFixed(1)+"%");
    panel.style.setProperty("--my", (y*100).toFixed(1)+"%");
  });
  panel.addEventListener("pointerleave", () => {
    panel.classList.remove("tilting");
    panel.style.setProperty("--rx","0deg"); panel.style.setProperty("--ry","0deg");
  });
}

// "Reduce motion" switch, for anyone who finds the animation distracting or uncomfortable.
// Hidden when the device is already set to reduce motion (everything is still then).
const motionBtn = document.getElementById("motionBtn");
function setCalm(on){
  document.documentElement.classList.toggle("calm", on);
  motionBtn.setAttribute("aria-pressed", on);
  try{ localStorage.setItem(MOTION_KEY, on ? "1" : ""); }catch(e){}
}
motionBtn.hidden = osReduced.matches;
osReduced.addEventListener?.("change", () => { motionBtn.hidden = osReduced.matches; });
motionBtn.onclick = () => setCalm(motionBtn.getAttribute("aria-pressed")!=="true");
try{ setCalm(localStorage.getItem(MOTION_KEY)==="1"); }catch(e){}

// "Clear all" can be undone; the offer stays while the mouse or keyboard is on it,
// so nobody is rushed. Any new edit dismisses it.
const toast = document.getElementById("toast");
let undoState=null, toastTimer=0;
const startToastTimer = () => { clearTimeout(toastTimer); toastTimer=setTimeout(hideToast, 10000); };
function hideToast(){ toast.hidden=true; undoState=null; clearTimeout(toastTimer); }
for(const ev of ["mouseenter","focusin"]) toast.addEventListener(ev, () => clearTimeout(toastTimer));
for(const ev of ["mouseleave","focusout"]) toast.addEventListener(ev, () => { if(undoState) startToastTimer(); });
let clearedFrom=null; // the "Clear all" button used, so Undo can hand focus back to it
function clearAll(){
  clearedFrom=this;
  const prev={...last};
  if(!Object.values(prev).some(q => q>0)){ announce("Nothing to clear. Total $0.00"); return; }
  setAll({});
  announce("All counts cleared. Total $0.00. Press Undo to bring them back.");
  undoState=prev; toast.hidden=false;
  startToastTimer();
}
document.getElementById("clearBtn").onclick = clearAll;
document.getElementById("miniClearBtn").onclick = clearAll;
document.getElementById("undoBtn").onclick = () => {
  if(undoState){ setAll(undoState); announce("Counts restored. Total "+fmt(animTo)); }
  hideToast();
  (clearedFrom || document.getElementById("clearBtn")).focus({preventScroll:true});
};

document.addEventListener("input", e => {
  if(!e.target.matches("input.qty")) return;
  const clean=e.target.value.replace(/\D/g,"").slice(0,5);
  if(clean!==e.target.value) e.target.value=clean;
  hideToast(); update();
});
// Empty a "0" box on tap so you can type straight away; leaving it blank puts the 0 back.
document.addEventListener("focusin", e => { if(e.target.matches("input.qty") && e.target.value==="0") e.target.value=""; });
document.addEventListener("focusout", e => { if(e.target.matches("input.qty") && e.target.value==="") e.target.value="0"; });
document.addEventListener("change", e => { if(e.target.matches("input.qty")){ e.target.value=qty(e.target.id.slice(2)); update(); } });
// Arrow keys change the count by one; with Shift held, by 5 notes or 10 coins.
document.addEventListener("keydown", e => {
  if(!e.target.matches("input.qty") || (e.key!=="ArrowUp" && e.key!=="ArrowDown")) return;
  e.preventDefault();
  const id=e.target.id.slice(2), step=e.shiftKey ? (isCoin({id}) ? 10 : 5) : 1;
  adjust(id, e.key==="ArrowUp" ? step : -step);
});
document.addEventListener("click", e => {
  const b=e.target.closest("[data-step]"); if(!b) return;
  adjust(b.closest(".row").dataset.id, Number(b.dataset.step));
});

// Keep other open tabs in sync with this one.
addEventListener("storage", e => {
  if(e.key!==KEY) return;
  let s=null; try{ s=JSON.parse(e.newValue); }catch(err){}
  setAll(s && typeof s==="object" ? s : {});
});

function loadSaved(){
  let saved=null;
  try{ saved=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  // Older versions saved Australian notes by dollar value ("n100" = $100); they're now by cents ("n10000").
  if(currency==="AUD" && saved && "n100" in saved && !("n10000" in saved))
    for(const v of [100,50,20,10,5]){ saved["n"+v*100]=saved["n"+v]; delete saved["n"+v]; }
  last={}; animTo=-1; // forces the total to redraw in the new currency's format
  setAll(saved && typeof saved==="object" ? saved : {}, true);
}
loadSaved();

// Currency picker
document.getElementById("currency").addEventListener("change", e => {
  hideToast();
  useCurrency(e.target.value);
  loadSaved();
  announce(`Now counting ${CUR.name}s. Total ${fmt(animTo)}`);
});
