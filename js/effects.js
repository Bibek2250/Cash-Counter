/**
 * Purely visual extras: the reduce-motion setting, flying chips and floating "+$5.00" labels.
 * Nothing here affects the count, and every effect is hidden from screen readers.
 */
import { h } from "./dom.js";
import { readString, STORAGE_KEYS, writeString } from "./storage.js";

const systemReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/** True when animation should be skipped (device setting or the in-app switch). */
export function isCalm() {
  return systemReducedMotion.matches || document.documentElement.classList.contains("calm");
}

/**
 * Wires up the "Reduce motion" switch. It's hidden when the device already asks for reduced
 * motion, because everything is still then anyway.
 */
export function initMotionSwitch(button) {
  const apply = (on) => {
    document.documentElement.classList.toggle("calm", on);
    button.setAttribute("aria-pressed", String(on));
  };
  const syncVisibility = () => {
    button.hidden = systemReducedMotion.matches;
  };

  apply(readString(STORAGE_KEYS.calm) === "1");
  syncVisibility();
  systemReducedMotion.addEventListener("change", syncVisibility);
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    apply(on);
    writeString(STORAGE_KEYS.calm, on ? "1" : "");
  });
}

const FLYER_LIMIT = 5;

/**
 * Shows a floating "+$5.00" / "−$5.00" by the row total and, when adding, sends copies of the
 * chip flying into the visible total.
 * @param {{chip: Element, line: Element, target: Element, label: string, adding: boolean, count: number, spinAxis: "X"|"Y"}} options
 */
export function celebrate({ chip, line, target, label, adding, count, spinAxis }) {
  if (isCalm()) return;

  const lineBox = line.getBoundingClientRect();
  const floater = h("div", { class: adding ? "float" : "float minus", "aria-hidden": "true" }, label);
  floater.style.left = `${lineBox.left + lineBox.width / 2}px`;
  floater.style.top = `${lineBox.top - 6}px`;
  document.body.append(floater);
  floater.addEventListener("animationend", () => floater.remove());
  if (!adding) return;

  const from = chip.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const turns = spinAxis === "Y" ? 720 : 540;

  for (let n = 0; n < Math.min(count, FLYER_LIMIT); n++) {
    const flyer = chip.cloneNode(true);
    flyer.classList.remove("pop");
    flyer.classList.add("flyer");
    flyer.removeAttribute("data-stack");
    flyer.removeAttribute("role");
    flyer.removeAttribute("aria-label");
    flyer.setAttribute("aria-hidden", "true");
    flyer.style.left = `${from.left}px`;
    flyer.style.top = `${from.top}px`;
    document.body.append(flyer);
    const animation = flyer.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(1.3) rotate${spinAxis}(${turns / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.35) rotate${spinAxis}(${turns}deg)`, opacity: 0 },
      ],
      { duration: 700, delay: n * 70, easing: "cubic-bezier(.5, 0, .6, 1)", fill: "backwards" },
    );
    const remove = () => flyer.remove();
    animation.finished.then(remove, remove); // also tidies up if the animation is cancelled
  }
}
