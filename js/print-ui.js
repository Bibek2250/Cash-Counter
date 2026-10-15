/**
 * Print safe count: builds a plain report of the safe (see report.js) and opens the browser's
 * print dialog. In Safe mode the report is also built for Ctrl+P / the browser menu, so
 * whichever way someone prints, they get the report rather than the app's buttons.
 * The till has no printed report.
 */
import { h } from "./dom.js";
import { buildSafeReport } from "./report.js";

/**
 * @param {{currency: object, mode: string, counts: Record<string, number>, safeExpected: () => number}} app
 *   `mode` and `counts` are read live through getters.
 * @param {{button: HTMLButtonElement, report: HTMLElement}} ui
 */
export function initPrint(app, ui) {
  const { currency } = app;
  const fmt = (cents) => currency.format(cents);

  function table(group) {
    return h("table", {},
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, group.heading), h("th", { scope: "col" }, "How many"), h("th", { scope: "col" }, "Amount"))),
      h("tbody", {}, group.lines.map((line) => h("tr", { class: line.count ? "" : "zero" },
        h("td", {}, line.label), h("td", {}, String(line.count)), h("td", {}, fmt(line.amount))))),
      h("tfoot", {}, h("tr", {},
        h("th", { scope: "row", colspan: "2" }, `${group.heading} total`), h("td", {}, fmt(group.subtotal)))),
    );
  }

  function resultText(report) {
    if (report.status === "balanced") return "Balanced";
    return `${report.status === "over" ? "Over" : "Short"} by ${fmt(report.difference)}`;
  }

  function render() {
    const report = buildSafeReport({ counts: app.counts, currency, expected: app.safeExpected() });
    const printed = new Date().toLocaleString(currency.locale, { dateStyle: "full", timeStyle: "short" });
    const row = (label, value, status) => h("div", { dataset: status ? { status } : {} }, h("dt", {}, label), h("dd", {}, value));

    ui.report.replaceChildren(
      h("h1", {}, "Safe count"),
      h("p", { class: "printed" }, `Printed ${printed}`),
      ...report.groups.map(table),
      h("dl", { class: "report-summary" },
        h("div", { class: "grand" }, h("dt", {}, "Safe total"), h("dd", {}, fmt(report.total))),
        report.status === "unset"
          ? row("Expected in safe", "Not entered")
          : [row("Expected in safe", fmt(report.expected)), row("Result", resultText(report), report.status)],
      ),
      h("div", { class: "signatures" },
        h("p", {}, "Counted by ____________________"),
        h("p", {}, "Checked by ____________________"),
      ),
    );
  }

  window.addEventListener("beforeprint", () => {
    if (app.mode === "safe") render();
  });
  ui.button.addEventListener("click", () => {
    render();
    window.print();
  });
}
