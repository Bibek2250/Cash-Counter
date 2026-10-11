/**
 * Tiny helpers for building elements without HTML strings.
 *
 * The page never assigns markup through innerHTML, which is what lets index.html enforce
 * Trusted Types: text always goes in as text nodes, so it can't be interpreted as HTML.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function applyAttributes(element, attributes) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "class") {
      element.setAttribute("class", value);
    } else if (name === "style") {
      // CSSOM writes are allowed by the Content Security Policy; style="" attributes are not.
      for (const [property, propertyValue] of Object.entries(value)) {
        element.style.setProperty(property, String(propertyValue));
      }
    } else if (name === "dataset") {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(name, value === true ? "" : String(value));
    }
  }
}

function appendChildren(element, children) {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : String(child));
  }
}

/** Creates an HTML element: h("button", { class: "step", type: "button" }, "+") */
export function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  applyAttributes(element, attributes);
  appendChildren(element, children);
  return element;
}

/** Creates an SVG element: svg("circle", { cx: 50, cy: 50, r: 10 }) */
export function svg(tag, attributes = {}, ...children) {
  const element = document.createElementNS(SVG_NS, tag);
  applyAttributes(element, attributes);
  appendChildren(element, children);
  return element;
}

/** Re-runs a CSS animation class by removing it, forcing a reflow, and adding it again. */
export function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}
