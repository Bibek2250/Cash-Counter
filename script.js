const NOTES = [
  {id:"n100",cents:10000,label:"$100",color:"var(--n100)"},
  {id:"n50", cents:5000, label:"$50", color:"var(--n50)",ink:true},
  {id:"n20", cents:2000, label:"$20", color:"var(--n20)"},
  {id:"n10", cents:1000, label:"$10", color:"var(--n10)"},
  {id:"n5",  cents:500,  label:"$5",  color:"var(--n5)"}
];
const COINS = [
  {id:"c200",cents:200,label:"$2", color:"var(--gold)"},
  {id:"c100",cents:100,label:"$1", color:"var(--gold)"},
  {id:"c50", cents:50, label:"50c",color:"var(--silver)",scallop:true},
  {id:"c20", cents:20, label:"20c",color:"var(--silver)"},
  {id:"c10", cents:10, label:"10c",color:"var(--silver)"},
  {id:"c5",  cents:5,  label:"5c", color:"var(--silver)"}
];
const ALL = [...NOTES, ...COINS];
const isCoin = d => d.id[0] === "c";
const KEY = "aud-cash-counter-v3";
const MAX = 99999; // per denomination; keeps totals well inside safe integer range
const fmt = c => "$" + (c/100).toLocaleString("en-AU",{minimumFractionDigits:2,maximumFractionDigits:2});
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clampQty = v => { const n=Math.floor(Number(v)); return Number.isFinite(n)&&n>0?Math.min(n,MAX):0; };

function buildRows(list, container){
  for(const d of list){
    const row = document.createElement("div");
    row.className = "row"; row.dataset.id = d.id;
    const bulk = isCoin(d) ? 10 : 5;
    row.innerHTML = `
      <div class="denom"><span class="chip${isCoin(d)?" coin":""}${d.scallop?" scallop":""}${d.ink?" ink-dark":""}" style="background:${d.color}">${d.label}</span></div>
      <div class="counter">
        <button class="step" type="button" data-step="-1" aria-label="Remove one ${d.label}">−</button>
        <input class="qty" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" id="q-${d.id}" aria-label="Number of ${d.label} ${isCoin(d)?"coins":"notes"}" value="0">
        <button class="step" type="button" data-step="1" aria-label="Add one ${d.label}">+</button>
        <button class="quick" type="button" data-step="${bulk}" aria-label="Add ${bulk} ${d.label}">+${bulk}</button>
      </div>
      <div class="line zero" id="t-${d.id}">$0.00</div>`;
    container.appendChild(row);
  }
}
buildRows(NOTES, document.getElementById("notes"));
buildRows(COINS, document.getElementById("coins"));

const bar = document.getElementById("bar");
for(const d of ALL){ const i=document.createElement("i"); i.id="b-"+d.id; i.style.background=d.color; bar.appendChild(i); }

function qty(id){ return clampQty(document.getElementById("q-"+id).value); }

let shown=0, animFrom=0, animTo=0, animStart=0, raf=0;
const grandEl = document.getElementById("grand");
function animateTotal(to, instant){
  if(to===animTo) return;
  cancelAnimationFrame(raf);
  if(!instant){ grandEl.classList.remove("bump"); void grandEl.offsetWidth; grandEl.classList.add("bump"); }
  if(instant||reduced){ shown=animTo=to; grandEl.textContent=fmt(to); return; }
  animFrom=shown; animTo=to; animStart=performance.now();
  const tick = now => {
    const t=Math.min(1,(now-animStart)/450), e=1-Math.pow(1-t,3);
    shown=Math.round(animFrom+(animTo-animFrom)*e);
    grandEl.textContent=fmt(shown);
    if(t<1) raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
}

// Screen readers hear only the settled total, not every animation frame.
const announceEl = document.getElementById("announce");
let announceTimer=0;
function announce(total){
  clearTimeout(announceTimer);
  announceTimer=setTimeout(() => { announceEl.textContent="Total "+fmt(total); }, 600);
}

let last = {};
function update(instant){
  let notes=0, coins=0; const state={};
  for(const d of ALL){ const q=qty(d.id); state[d.id]=q; if(isCoin(d)) coins+=q*d.cents; else notes+=q*d.cents; }
  const total=notes+coins;
  for(const d of ALL){
    const q=state[d.id], line=q*d.cents;
    const t=document.getElementById("t-"+d.id);
    t.textContent=fmt(line); t.classList.toggle("zero",q===0);
    const row=t.closest(".row"); row.style.setProperty("--share",(total?line/total*100:0)+"%");
    document.getElementById("b-"+d.id).style.flexGrow=line;
    if(last[d.id]!==undefined && last[d.id]!==q){ const c=row.querySelector(".chip"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
  }
  last=state;
  animateTotal(total, instant);
  if(!instant) announce(total);
  document.getElementById("notesSub").textContent=document.getElementById("notesSub2").textContent=fmt(notes);
  document.getElementById("coinsSub").textContent=document.getElementById("coinsSub2").textContent=fmt(coins);
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
}

function setAll(map, instant){ for(const d of ALL) document.getElementById("q-"+d.id).value=clampQty(map[d.id]); update(instant); }

function adjust(id, delta){
  document.getElementById("q-"+id).value=Math.min(MAX,Math.max(0,qty(id)+delta));
  hideToast(); update();
}

// "Clear all" can be undone for a few seconds; any new edit dismisses the offer.
const toast = document.getElementById("toast");
let undoState=null, toastTimer=0;
function hideToast(){ toast.hidden=true; undoState=null; clearTimeout(toastTimer); }
document.getElementById("clearBtn").onclick = () => {
  const prev={...last};
  if(!Object.values(prev).some(q => q>0)) return;
  setAll({});
  undoState=prev; toast.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(hideToast, 8000);
};
document.getElementById("undoBtn").onclick = () => { if(undoState) setAll(undoState); hideToast(); };

document.addEventListener("input", e => {
  if(!e.target.matches("input.qty")) return;
  const clean=e.target.value.replace(/\D/g,"").slice(0,5);
  if(clean!==e.target.value) e.target.value=clean;
  hideToast(); update();
});
document.addEventListener("change", e => { if(e.target.matches("input.qty")){ e.target.value=qty(e.target.id.slice(2)); update(); } });
document.addEventListener("keydown", e => {
  if(!e.target.matches("input.qty") || (e.key!=="ArrowUp" && e.key!=="ArrowDown")) return;
  e.preventDefault();
  adjust(e.target.id.slice(2), e.key==="ArrowUp"?1:-1);
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

let saved=null;
try{ saved=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
setAll(saved && typeof saved==="object" ? saved : {}, true);
