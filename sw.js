// Service worker для js.track — простое кэширование "cache first" для
// офлайн-работы. Приложение теперь МНОГОСТРАНИЧНОЕ (12 отдельных HTML-
// страниц + общие shared/-файлы), поэтому в APP_SHELL перечислены ВСЕ
// страницы разом, а не одна — иначе офлайн работала бы только та
// страница, что была открыта в момент установки service worker.

const CACHE_NAME = "js-track-v7-multipage";

const PAGES = [
  "index", "questions", "practice", "summary", "profile", "sandbox",
  "history", "predict", "tree", "exam", "project", "viz", "findbug", "share",
];

const APP_SHELL = [
  "./",
  ...PAGES.map((p) => `./${p}.html`),
  ...PAGES.map((p) => `./${p}.css`),
  "./vendor-react.production.min.js",
  "./vendor-react-dom.production.min.js",
  "./shared-shared.css",
  "./shared-engine-content.js",
  "./shared-engine-core.js",
  "./shared-engine-code.js",
  "./shared-engine-editor.js",
  "./shared-engine-debugger.js",
  "./shared-engine-features.js",
  "./shared-mascot-icons.js",
  "./shared-Header.js",
  "./shared-Common.js",
  "./shared-CodeEditor.js",
  "./shared-LessonCard.js",
  "./manifest.json",
  "./icon-16.png",
  "./icon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll падает целиком, если ХОТЬ ОДИН файл не загрузился —
      // добавляем по одному через allSettled, чтобы отсутствие одной
      // страницы (например, опечатка в имени) не сорвало кэширование
      // всех остальных 20+ файлов.
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Кэшируем "на лету" и то, что не входило в APP_SHELL заранее
          // (например, если появится 13-я страница до следующего
          // обновления версии кэша) — но только успешные ответы того же
          // источника, не CDN-скрипты (React/Babel — их кэширует сам
          // браузер через обычный HTTP-кэш).
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

/* ==========================================================================
   Напоминание о серии дней — Periodic Background Sync (best-effort,
   без сервера). Работает только в Chrome/Edge на Android при
   установленном PWA — на iOS и в обычной вкладке браузера событие
   periodicsync просто никогда не придёт, это ограничение платформы,
   не баг. Читает последнюю активную дату из IndexedDB (не
   window.storage — он недоступен в этом контексте).
   ========================================================================== */

const REMINDER_DB_NAME = "js-track-reminder";
const REMINDER_STORE = "state";

function swGetLastActiveDate() {
  return new Promise((resolve) => {
    const req = indexedDB.open(REMINDER_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(REMINDER_STORE);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(REMINDER_STORE, "readonly");
      const r = tx.objectStore(REMINDER_STORE).get("lastActiveDate");
      r.onsuccess = () => { db.close(); resolve(r.result || null); };
      r.onerror = () => { db.close(); resolve(null); };
    };
    req.onerror = () => resolve(null);
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "streak-reminder-check") return;
  event.waitUntil(
    (async () => {
      const lastActive = await swGetLastActiveDate();
      const today = new Date().toISOString().slice(0, 10);
      if (lastActive === today) return; // уже занимался сегодня — не беспокоим
      const hour = new Date().getHours();
      if (hour < 17 || hour > 22) return; // напоминаем только вечером (17:00–22:00)
      await self.registration.showNotification("js.track", {
        body: "Не теряй серию — сегодня ещё не было ни одного вопроса.",
        icon: "./icon-192.png",
        badge: "./icon-32.png",
        tag: "streak-reminder", // новое уведомление заменяет старое, не копится
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("./questions.html"));
});
