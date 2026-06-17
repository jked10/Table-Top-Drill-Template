/* DrillFrame service worker — offline app shell.
   Bump CACHE on every release so clients pull fresh files. */
const CACHE = "drillframe-v1";
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/config.js",
  "./js/scenarios.js",
  "./js/tts.js",
  "./js/ai.js",
  "./js/sync.js",
  "./js/drill.js",
  "./js/results.js",
  "./js/report.js",
  "./js/participant.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls (Anthropic, Firebase, fonts handled by browser)
  if (url.origin !== self.location.origin) return;
  // Network-first for the HTML document so updates show; fall back to cache offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  // Cache-first for same-origin assets.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
});
