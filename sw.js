/* Service worker voor de Reflectie-app: houdt de app offline beschikbaar.
   Plaats dit bestand naast reflectie-app.html (zelfde map, via https). */
const V = 'reflectie-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // De vragen-API regelt de app zelf (lokale cache + achtergrondsync)
  if (u.hostname.endsWith('script.google.com') || u.hostname.endsWith('googleusercontent.com')) return;

  // Pagina: eerst netwerk (altijd de nieuwste versie), anders de bewaarde kopie
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)); return res; })
        .catch(() => caches.match(r).then(m => m || caches.match('./')))
    );
    return;
  }

  // Eigen bestanden en lettertypes: bewaarde kopie meteen, op de achtergrond verversen
  if (u.origin === location.origin || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(r).then(m => {
        const net = fetch(r)
          .then(res => {
            if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)); }
            return res;
          })
          .catch(() => m);
        return m || net;
      })
    );
  }
});
