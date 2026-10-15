/**
 * Service worker: lets the app open and work with no internet connection.
 *
 * Each version's files are downloaded together, fresh from the site, when that version
 * installs, and the app is always served from that one set. So a phone never runs a mix of
 * old and new files. A new version installs in the background; the page then offers Refresh.
 *
 * Only this site's own listed files are ever cached; requests to anywhere else pass straight
 * through untouched. Bump CACHE whenever any file changes, or devices won't update.
 */
const CACHE = "cash-counter-v27";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/app.js",
  "./js/art.js",
  "./js/counts.js",
  "./js/currencies.js",
  "./js/dom.js",
  "./js/effects.js",
  "./js/float.js",
  "./js/float-ui.js",
  "./js/safe.js",
  "./js/safe-ui.js",
  "./js/report.js",
  "./js/print-ui.js",
  "./js/storage.js",
  "./js/read-aloud.js",
  "./fonts/archivo-latin.woff2",
  "./fonts/archivo-latin-ext.woff2",
  "./fonts/jetbrains-mono-latin.woff2",
  "./fonts/jetbrains-mono-latin-ext.woff2",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // cache: "reload" skips the browser's own copies (GitHub Pages lets them live 10 minutes),
  // so a new version can't be saved with files left over from the old one.
  const fresh = APP_FILES.map((file) => new Request(file, { cache: "reload" }));
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(fresh))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Serve the installed version; anything not in it goes to the network untouched.
// Nothing is written to the cache here, so crafted links (e.g. "?x=...") can't fill it.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return; // never touch other sites

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Only page loads fall back to the app shell; other files never get HTML back.
    const saved = (await cache.match(request)) ??
      (request.mode === "navigate" ? await cache.match("./index.html") : undefined);
    return saved ?? fetch(request);
  })());
});
