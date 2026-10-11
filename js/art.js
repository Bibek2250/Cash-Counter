/**
 * Drawn notes and coins, built as SVG elements (no markup strings).
 * Colours come from the --c custom property on the surrounding .chip via the
 * .art-base class in style.css.
 */
import { NOTE_ART_HEIGHT } from "./currencies.js";
import { svg } from "./dom.js";

const FONT = "Archivo, Arial, sans-serif";
const H = NOTE_ART_HEIGHT;

/** Shrinks the printed value so long numbers like "10,000" still fit. */
function noteFontSize(text) {
  if (text.length <= 3) return 27;
  if (text.length === 4) return 23;
  if (text.length === 5) return 20;
  return 17;
}

function coinFontSize(item) {
  if (item.hole) return 26;
  if (item.face.length <= 2) return 40;
  if (item.face.length === 3) return 33;
  if (item.face.length === 4) return 27;
  return 23;
}

/** Banknote: clear window, portrait, wave pattern, any tactile bumps and a big value. */
export function noteArt(item, currency) {
  const w = item.width;
  const px = w * 0.56; // portrait centre

  const bumps = Array.from({ length: item.bumps }, (_, i) =>
    svg("circle", { cx: 36 + i * 7, cy: 7, r: 2.3 }),
  );

  return svg(
    "svg",
    { viewBox: `0 0 ${w} ${H}`, "aria-hidden": "true", focusable: "false" },
    svg("rect", { class: "art-base", width: w, height: H, rx: 4 }),
    svg("path", { d: `M0 48Q${w * 0.25} 34 ${w * 0.5} 48T${w} 46V${H}H0Z`, fill: "#fff", "fill-opacity": 0.14 }),
    svg("path", {
      d: `M0 20Q${w * 0.3} 8 ${w * 0.6} 20T${w} 16M0 26Q${w * 0.3} 14 ${w * 0.6} 26T${w} 22`,
      fill: "none", stroke: "#fff", "stroke-opacity": 0.2, "stroke-width": 1.2,
    }),
    // Portrait
    svg("ellipse", { cx: px, cy: 36, rx: 15, ry: 20, fill: "#000", "fill-opacity": 0.1, stroke: "#fff", "stroke-opacity": 0.3 }),
    svg("circle", { cx: px, cy: 30, r: 7, fill: "#000", "fill-opacity": 0.22 }),
    svg("path", { d: `M${px - 13} 53Q${px - 12} 39 ${px} 39Q${px + 12} 39 ${px + 13} 53Z`, fill: "#000", "fill-opacity": 0.22 }),
    // Clear window with a star and waves
    svg("rect", { x: 7, y: 6, width: 19, height: 53, rx: 4, fill: "#e9f7ff", "fill-opacity": 0.75, stroke: "#fff", "stroke-opacity": 0.8 }),
    svg("path", { d: "M16.5 15l2 5.5h5.5l-4.5 3.5 1.8 5.5-4.8-3.4-4.8 3.4 1.8-5.5-4.5-3.5h5.5z", fill: "#7aa9c4", "fill-opacity": 0.8 }),
    svg("path", { d: "M12 44q4.5-8 9 0M12 50q4.5-8 9 0", fill: "none", stroke: "#7aa9c4", "stroke-width": 1.4 }),
    svg("g", { fill: "#fff", "fill-opacity": 0.85 }, bumps),
    // Value and country
    svg("text", {
      x: w - 7, y: 31, "text-anchor": "end", "font-family": FONT, "font-size": noteFontSize(item.face), "font-weight": 800,
      fill: "#fff", stroke: "#000", "stroke-opacity": 0.55, "stroke-width": 3.5, "paint-order": "stroke",
    }, item.face),
    svg("text", {
      x: w - 7, y: 60, "text-anchor": "end", "font-family": FONT, "font-size": 7, "font-weight": 700,
      "letter-spacing": 1.2, fill: "#fff", "fill-opacity": 0.8,
    }, currency.country),
  );
}

/** A circle, or a regular polygon for coins with flat sides, centred in a 100×100 box. */
function coinShape(item, radius, attributes) {
  if (!item.sides) return svg("circle", { cx: 50, cy: 50, r: radius, ...attributes });
  const points = Array.from({ length: item.sides }, (_, k) => {
    const angle = ((k * 360) / item.sides + 15) * (Math.PI / 180);
    return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return svg("polygon", { points, ...attributes });
}

const INK = "#241b10";

/** Southern Cross stars on the Australian $2 coin. */
function southernCross() {
  const stars = [[50, 17, 2.6], [37, 23, 2], [63, 23, 2.2], [50, 29, 1.6], [57, 27, 1.2]];
  return svg("g", { fill: INK, "fill-opacity": 0.45 }, stars.map(([cx, cy, r]) => svg("circle", { cx, cy, r })));
}

/** Coin: metal shine, milled or smooth edge, two-metal centre, hole and a big value. */
export function coinArt(item, currency) {
  const gradientId = `shine-${currency.code}-${item.id}`;
  const fontSize = coinFontSize(item);
  let textY = 50 + fontSize * 0.36;
  if (item.hole) textY = 34; // above the hole
  else if (item.stars) textY = 66; // below the stars

  return svg(
    "svg",
    { viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false" },
    svg("defs", {},
      svg("radialGradient", { id: gradientId, cx: 0.35, cy: 0.3, r: 0.8 },
        svg("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 0.8 }),
        svg("stop", { offset: 0.45, "stop-color": "#fff", "stop-opacity": 0 }),
        svg("stop", { offset: 1, "stop-color": "#000", "stop-opacity": 0.28 }),
      ),
    ),
    coinShape(item, 49, { class: "art-base" }),
    item.inner && coinShape(item, 31, { fill: item.inner, stroke: "#000", "stroke-opacity": 0.2 }),
    coinShape(item, 49, { fill: `url(#${gradientId})` }),
    !item.sides && !item.smooth && svg("circle", {
      cx: 50, cy: 50, r: 47, fill: "none", stroke: "#000", "stroke-opacity": 0.3, "stroke-width": 3, "stroke-dasharray": "1.2 1.7",
    }),
    coinShape(item, 40, { fill: "none", stroke: "#fff", "stroke-opacity": 0.55, "stroke-width": 1.6 }),
    item.hole && svg("circle", { class: "art-hole", cx: 50, cy: 50, r: 12, stroke: "#000", "stroke-opacity": 0.35, "stroke-width": 2 }),
    item.stars && southernCross(),
    svg("text", {
      x: 50, y: textY, "text-anchor": "middle", "font-family": FONT, "font-size": fontSize, "font-weight": 800,
      fill: INK, stroke: "#fff", "stroke-opacity": 0.4, "stroke-width": 2, "paint-order": "stroke",
    }, item.face),
  );
}
