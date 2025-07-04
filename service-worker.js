const CACHE_NAME = 'score-sheet-cache-v1';

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("score-tracker-cache").then(cache => {
      return cache.addAll([
        "/",
        "./icon.png",
        "./index.html",
        "./main.js",
        "./manifest.json",
        "./storage.service.js",
        "./style.css",
        "./components/app-root.js",
        "./components/player-setup/player-setup.js",
        "./components/player-setup/player-setup.css",
        "./components/player-setup/player-setup.html",
        "./components/game-select/game-select.js",
        "./components/game-select/game-select.css",
        "./components/game-select/game-select.html",
        "./components/score-tracker/score-tracker.js"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
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
});