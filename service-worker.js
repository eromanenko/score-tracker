const CACHE_NAME = 'score-tracker-v1.1.9';

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        "./",
        "./icon.png",
        "./index.html",
        "./main.js",
        "./manifest.json",
        "./style.css",
        "./storage.service.js",
        "./ui.i18n.service.js",
        "./modal.service.js",
        "./assets/games.json",
        "./components/app-root.js",
        "./components/game-select/game-select.js",
        "./components/player-setup/player-setup.js",
        "./components/score-tracker/score-tracker.js",
        "./components/scorers/category-scorer.js",
        "./components/scorers/cumulative-scorer.js",
        "./components/scorers/tracker-scorer.js"
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response, or fetch from network
      return response || fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});