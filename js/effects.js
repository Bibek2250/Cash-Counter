/**
 * Purely visual extras: the reduce-motion setting, flying chips, floating "+$5.00" labels and
 * the 3D tilt on the total panel. Nothing here affects the count, and every effect is hidden
 * from screen readers.
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

const MAX_TILT_X = 7; // degrees, up/down
const MAX_TILT_Y = 9; // degrees, left/right
/** How far (degrees) the phone has to turn from its resting angle for the full tilt. */
const ORIENTATION_RANGE = 20;
/** How quickly the resting angle catches up with how the phone is held (0–1 per event). */
const ORIENTATION_DRIFT = 0.02;

const clamp = (n) => Math.max(-1, Math.min(1, n));

/**
 * Tilts the panel in 3D:
 * - mouse and trackpad: toward the pointer;
 * - phones and tablets: as the device is tilted (motion sensor), and toward a finger pressing it.
 * x and y run from -1 to 1 in the functions below.
 */
export function initTilt(panel) {
  /** follow: "tilting" snaps to the pointer, "following" smooths out the motion sensor. */
  const setTilt = (x, y, follow) => {
    panel.classList.toggle("tilting", follow === "tilting");
    panel.classList.toggle("following", follow === "following");
    panel.style.setProperty("--rx", `${(-y * MAX_TILT_X).toFixed(2)}deg`);
    panel.style.setProperty("--ry", `${(x * MAX_TILT_Y).toFixed(2)}deg`);
    panel.style.setProperty("--mx", `${((x + 1) * 50).toFixed(1)}%`);
    panel.style.setProperty("--my", `${((y + 1) * 50).toFixed(1)}%`);
  };
  const reset = () => {
    panel.classList.remove("tilting", "following");
    panel.style.setProperty("--rx", "0deg");
    panel.style.setProperty("--ry", "0deg");
  };
  const tiltToward = (event) => {
    const box = panel.getBoundingClientRect();
    setTilt(((event.clientX - box.left) / box.width) * 2 - 1, ((event.clientY - box.top) / box.height) * 2 - 1, "tilting");
  };

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    panel.addEventListener("pointermove", (event) => {
      if (!isCalm()) tiltToward(event);
    });
    panel.addEventListener("pointerleave", reset);
    return;
  }

  // Touch: lean toward the finger while it's pressed. Doesn't block scrolling.
  let pressed = false;
  panel.addEventListener("pointerdown", (event) => {
    if (isCalm()) return;
    pressed = true;
    tiltToward(event);
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
    panel.addEventListener(type, () => {
      pressed = false;
      reset();
    });
  }

  initOrientationTilt((x, y) => {
    if (!pressed && !isCalm()) setTilt(x, y, "following");
  });
}

/**
 * Follows the device's motion sensor. The resting angle is however the phone is being held
 * and slowly follows it, so only tilting it from there moves the panel.
 * Some browsers (iPhone and iPad Safari) only send readings once the person allows it, which
 * can only be asked after a tap; until then the listener simply hears nothing.
 */
function initOrientationTilt(onTilt) {
  if (typeof DeviceOrientationEvent === "undefined") return;
  let rest = null;

  window.addEventListener("deviceorientation", ({ beta, gamma }) => {
    if (beta === null || gamma === null) return; // no sensor
    rest ??= { beta, gamma };
    rest.beta += (beta - rest.beta) * ORIENTATION_DRIFT;
    rest.gamma += (gamma - rest.gamma) * ORIENTATION_DRIFT;
    onTilt(clamp((gamma - rest.gamma) / ORIENTATION_RANGE), clamp((beta - rest.beta) / ORIENTATION_RANGE));
  });

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    document.addEventListener("click", () => {
      DeviceOrientationEvent.requestPermission().catch(() => {
        // Declined or unavailable: the panel still tilts when pressed.
      });
    }, { once: true });
  }
}
