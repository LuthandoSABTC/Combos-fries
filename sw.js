// Combos Fries: saves the menu on the phone so it still opens with weak or no signal.
const CACHE = "combos-v1";
const FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  // Page: try network first (fresh menu), fall back to the saved copy when offline.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("/", cp)); return r; }).catch(() => caches.match("/")));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
