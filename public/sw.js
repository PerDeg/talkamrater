// Service worker: gör att spelet kan installeras och startar även utan internet.
// Hämtar alltid färska filer när nätet finns, och använder sparade filer annars.
const CACHE = 'talkamrater-v1';
const VOICE = 'talkamrater-rost-v1';
const SHELL = ['./', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== VOICE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Rösten: samma text ger alltid samma ljud, så spara den och använd den direkt
  if (e.request.method === 'GET' && url.origin === location.origin && url.pathname.endsWith('/api/tts')) {
    e.respondWith(caches.open(VOICE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) {
        // Högst 300 sparade meningar, de äldsta försvinner först
        c.put(e.request, res.clone()).then(() => c.keys()).then(keys => Promise.all(keys.slice(0, Math.max(0, keys.length - 300)).map(k => c.delete(k))));
      }
      return res;
    }))));
    return;
  }
  // API-anrop och andra sajter (t.ex. typsnitt) går alltid direkt till nätet
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
