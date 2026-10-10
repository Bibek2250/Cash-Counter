// Service worker: lets the app open and work with no internet connection.
// Change the version number whenever you update the app, so devices pick up the new files.
const CACHE = "cash-counter-v11";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./voice.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];
// On a slow connection, give up waiting for the network after this long and use the saved copy.
const TIMEOUT_MS = 3000;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Try the network first so updates show up; fall back to the saved copy when offline or slow.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Only successful responses are saved, so an error page never replaces a good copy.
  const network = fetch(req).then(res => {
    if (!res.ok) return res;
    const copy = res.clone();
    return caches.open(CACHE).then(cache => cache.put(req, copy)).then(() => res);
  });
  // Keep the worker alive so the cache still updates if the saved copy is served first.
  event.waitUntil(network.catch(() => {}));

  event.respondWith((async () => {
    // Only page loads fall back to the app shell; images, fonts etc. never get HTML back.
    const fallback = (await caches.match(req)) ||
      (req.mode === "navigate" ? await caches.match("./index.html") : undefined);
    try {
      if (!fallback) return await network;
      const timeout = new Promise((_, reject) => setTimeout(reject, TIMEOUT_MS));
      const res = await Promise.race([network, timeout]);
      return res.ok ? res : fallback;
    } catch {
      return fallback || Response.error();
    }
  })());
});
