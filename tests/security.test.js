import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const scripts = [...readdirSync(new URL("js/", root)).filter((f) => f.endsWith(".js")).map((f) => `js/${f}`), "sw.js"];

/** Strips comments so documentation that mentions a sink doesn't count as using it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("scripts", () => {
  const sinks = [
    /\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/,
    /\bnew\s+Function\s*\(/, /set(?:Timeout|Interval)\s*\(\s*["'`]/, /createContextualFragment/,
  ];
  for (const file of scripts) {
    it(`${file} never turns strings into HTML or code`, () => {
      const text = code(read(file));
      for (const sink of sinks) assert.doesNotMatch(text, sink, `${file} uses ${sink}`);
    });
  }
});

describe("index.html", () => {
  const html = read("index.html");
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
  const directives = new Map(csp.split(";").map((d) => d.trim().split(/\s+/)).map(([name, ...v]) => [name, v]));

  it("sets a Content Security Policy", () => assert.ok(csp, "CSP meta tag missing"));

  it("blocks everything by default and only allows the site's own scripts", () => {
    assert.deepEqual(directives.get("default-src"), ["'none'"]);
    assert.deepEqual(directives.get("script-src"), ["'self'"]);
    assert.deepEqual(directives.get("base-uri"), ["'none'"]);
    assert.deepEqual(directives.get("form-action"), ["'none'"]);
  });

  it("never allows inline code or eval", () => {
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|unsafe-hashes|data:|blob:|\*/);
  });

  it("enforces Trusted Types", () => {
    assert.deepEqual(directives.get("require-trusted-types-for"), ["'script'"]);
    assert.deepEqual(directives.get("trusted-types"), ["cash-counter"]);
  });

  it("has no inline scripts, inline handlers or third-party resources", () => {
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
    assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//i);
  });

  it("doesn't leak the address to other sites", () => {
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
  });
});

describe("sw.js", () => {
  it("lists every app script for offline use", () => {
    const sw = read("sw.js");
    for (const file of scripts.filter((f) => f !== "sw.js")) assert.ok(sw.includes(`"./${file}"`), `${file} not cached`);
  });
});
