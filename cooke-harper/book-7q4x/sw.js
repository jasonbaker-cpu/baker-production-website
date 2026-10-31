/* Buyer Book offline shell. Page: network first, cached copy when offline. SDK, fonts, icons: cache first. Data is handled by Firestore's own offline cache. */
const C = 'bb-shell-v1';
const SHELL = ['./', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const isStatic = u.hostname === 'www.gstatic.com' || u.hostname.endsWith('fonts.googleapis.com') || u.hostname === 'fonts.gstatic.com' || u.hostname === 'cdnjs.cloudflare.com' || (u.origin === location.origin && /\.(png|json)$/.test(u.pathname));
  const isPage = r.mode === 'navigate' && u.origin === location.origin;
  if (isPage) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put('./', cp)); return res; }).catch(() => caches.match('./')));
  } else if (isStatic) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })));
  }
});
