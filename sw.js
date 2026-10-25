/* Service Worker для offline-работы PWA «Инвест-план».
   Внешних запросов нет: кэшируются только файлы приложения. */
const CACHE_NAME = "iis3-v7";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./src/app.js",
  "./src/model.js",
  "./src/state.js",
  "./src/lib/iis.js",
  "./src/lib/format.js",
  "./src/data/defaults.js",
  "./src/data/stocks.js",
  "./src/data/instruments.js",
  "./src/data/rules.js",
  "./src/ui/styles.css",
  "./src/ui/components.js",
  "./src/ui/accounts.js",
  "./src/ui/allocation.js",
  "./src/ui/purchases.js",
  "./src/ui/ladder.js",
  "./src/ui/reference.js",
  "./src/ui/settings.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

// При активации — удаляем старые кэши (в т.ч. от «Бюджета») и берём контроль над страницей
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// «Сеть сначала» для своих файлов: пока есть интернет — свежая версия и обновление
// кэша, офлайн — последняя сохранённая копия. Чужие адреса не обрабатываем.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return response;
    }).catch(() => caches.match(req).then((cached) => cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
