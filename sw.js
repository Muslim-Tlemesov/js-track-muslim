// Service worker для js.track — простое кэширование "cache first" для
// офлайн-работы. Приложение — один HTML-файл, так что кэшировать
// нужно немного: сам файл, манифест и иконки. React/ReactDOM/Babel
// подключены с CDN через <script crossorigin> — их кэширование
// оставляем самому браузеру (HTTP-кэш), здесь их не трогаем.

const CACHE_NAME = "js-track-v9";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Только GET и только свои файлы (тот же origin) — не пытаемся
  // кэшировать/перехватывать запросы к CDN (React/Babel), у них своя
  // логика кэширования на стороне браузера через обычный HTTP-кэш.
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
