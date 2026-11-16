// External Areas — lets the page open with no signal.
// The page itself: try the network first (so updates arrive), fall back to the saved copy.
const CACHE = "external-areas-v1";
const PAGE = "/external-areas/";
const ASSETS = [PAGE, "/favicon.png", "/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // uploads go straight to the network
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;             // Google script calls are handled by the page
  if (req.mode === "navigate" || url.pathname === PAGE || url.pathname === PAGE + "index.html") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(PAGE, copy));
        return res;
      }).catch(() => caches.match(PAGE))
    );
    return;
  }
  if (ASSETS.includes(url.pathname)) e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
