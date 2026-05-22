// Single source of truth for the deployed shell version. Bump this constant
// on every deploy — the new SW will install, broadcast the value, and the
// client will reflect it in the drawer header.
const VERSION = 'v19';
const CACHE = `kor-companion-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './app.js',
  './commands.js',
  './history.js',
  './store.js',
  './db.js',
  './statuses.js',
  './icon.svg',
  './fonts/fonts.css',
  './fonts/im-fell-english-400.woff2',
  './fonts/im-fell-english-400i.woff2',
  './fonts/im-fell-dw-pica-sc-400.woff2',
  './splash/splash-1290x2796.png',
  './splash/splash-1284x2778.png',
  './splash/splash-1242x2688.png',
  './splash/splash-1242x2208.png',
  './splash/splash-1179x2556.png',
  './splash/splash-1170x2532.png',
  './splash/splash-1125x2436.png',
  './splash/splash-828x1792.png',
  './splash/splash-750x1334.png',
];

self.addEventListener('install', (event) => {
  // `cache: 'reload'` bypasses the HTTP cache so a CACHE bump always
  // fetches the freshest copy of every shell asset.
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) =>
        c.postMessage({ type: 'CACHE_VERSION', value: VERSION })
      ))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_CACHE_VERSION') {
    const reply = { type: 'CACHE_VERSION', value: VERSION };
    if (event.ports?.[0]) event.ports[0].postMessage(reply);
    else event.source?.postMessage(reply);
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
