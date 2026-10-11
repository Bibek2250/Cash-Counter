/**
 * Service worker: lets the app open and work with no internet connection.
 *
 * Only this site's own files are ever cached or served from the cache; requests to anywhere
 * else pass straight through untouched. Bump CACHE whenever files change so devices update.
 */
const CACHE = "cash-counter-v18";

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
  "./js/storage.js",
  "./js/voice.js",
  "./js/voice-parser.js",
  "./fonts/archivo-latin.woff2",
  "./fonts/archivo-latin-ext.woff2",
  "./fonts/jetbrains-mono-latin.woff2",
  "./fonts/jetbrains-mono-latin-ext.woff2",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
];

/** On a slow connection, stop waiting for the network after this long and use the saved copy. */
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_FILES))
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

/** Only same-origin, successful, non-redirected responses are worth keeping. */
function isCacheable(response) {
  return response.ok && response.type === "basic" && !response.redirected;
}

// Network first so updates show up; fall back to the saved copy when offline or slow.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return; // never touch other sites

  const fromNetwork = fetch(request).then((response) => {
    if (!isCacheable(response)) return response;
    const copy = response.clone();
    return caches.open(CACHE).then((cache) => cache.put(request, copy)).then(() => response);
  });
  // Keep the worker alive so the cache still updates even if the saved copy is served first.
  event.waitUntil(fromNetwork.catch(() => {}));

  event.respondWith((async () => {
    // Only page loads fall back to the app shell; other files never get HTML back.
    const saved = (await caches.match(request)) ??
      (request.mode === "navigate" ? await caches.match("./index.html") : undefined);
    if (!saved) return fromNetwork.catch(() => Response.error());

    const timeout = new Promise((_, reject) => setTimeout(reject, NETWORK_TIMEOUT_MS));
    try {
      const response = await Promise.race([fromNetwork, timeout]);
      return response.ok ? response : saved;
    } catch {
      return saved;
    }
  })());
});
