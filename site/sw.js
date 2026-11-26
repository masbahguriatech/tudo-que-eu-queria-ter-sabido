// Service worker: guarda os arquivos do fliperama pra ele abrir mesmo offline.
// VERSION e ASSETS são atualizados pelo scripts/build.py. Não edite à mão.

const VERSION = '443d0013db4c';
const ASSETS = ["./", "./index.html", "./favicon.svg", "./css/arcade.css", "./js/app.js", "./js/content.js", "./js/dom.js", "./js/game.js", "./js/render.js", "./js/save.js"];
const CACHE = `modo-multiplayer-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('modo-multiplayer-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Página: tenta a rede primeiro (pra pegar atualização), cai pro cache se estiver offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // Demais arquivos: cache primeiro, rede depois.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
