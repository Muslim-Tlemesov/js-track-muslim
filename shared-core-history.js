/* ==========================================================================
   pages/shared/core-history.js — история обучения — IndexedDB (не safeStorage, см. safeStorage.js), миграция старых данных, календарь активности.

   Файл 5 из 18, на которые разбит движок (реорганизовано из 6
   файлов после соответствующего разбора архитектуры — раньше
   engine-core.js/engine-features.js смешивали storage+XP+streak+review
   и PWA+напоминания+шеринг соответственно в одном файле каждый).
   Порядок подключения в HTML важен — файлы делят одну глобальную
   область видимости:
     1. shared-data-topics.js
     2. shared-data-questions.js
     3. shared-data-achievements.js
     4. shared-core-storage.js
     5. shared-core-history.js
     6. shared-core-streak.js
     7. shared-code-runner.js
     8. shared-code-syntax.js
     9. shared-code-debugger.js
     10. shared-code-worker.js
     11. shared-pwa-install.js
     12. shared-pwa-reminders.js
     13. shared-core-progress.js
     14. shared-core-review.js
     15. shared-core-xp.js
     16. shared-misc-backup.js
     17. shared-misc-quizmodes.js
     18. shared-misc-share.js
   ========================================================================== */

const MAX_HISTORY_ENTRIES = 500;


/**
 * История обучения — раньше хранилась одной JSON-строкой в
 * localStorage: каждая новая попытка требовала прочитать ВЕСЬ лог,
 * распарсить, добавить запись, сериализовать заново, записать ВЕСЬ
 * лог обратно. При максимуме в 500 записей это ~70КБ и ~1мс на
 * операцию — не проблема на практике, но архитектурно не
 * масштабируется (при снятии потолка или росте лога стало бы хуже).
 * Перенесено на IndexedDB — каждая попытка своя отдельная запись,
 * добавление новой НЕ требует читать все остальные.
 */
const HISTORY_DB_NAME = "js-track-history-db";

const HISTORY_STORE = "entries";


function openHistoryDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HISTORY_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Одноразовая миграция старой истории (единая JSON-строка в
// localStorage под HISTORY_KEY) в IndexedDB — без неё пользователи,
// уже накопившие историю, потеряли бы её при переходе на новое
// хранилище. Флаг в памяти — на одну загрузку страницы миграция
// пробуется максимум один раз, независимо от того, сколько мест её
// вызовет (addHistoryEntry и getHistoryEntries оба могут вызвать её
// первыми, в зависимости от того, что случится раньше на странице).
let historyMigrationAttempted = false;

async function migrateHistoryIfNeeded() {
  if (historyMigrationAttempted) return;
  historyMigrationAttempted = true;
  try {
    const old = await safeStorage.get(HISTORY_KEY);
    if (!old || !old.value) return;
    const oldEntries = JSON.parse(old.value);
    if (!Array.isArray(oldEntries) || oldEntries.length === 0) return;
    const db = await openHistoryDb();
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    const store = tx.objectStore(HISTORY_STORE);
    for (const entry of oldEntries) {
      const { id, ...rest } = entry; // id — новый autoIncrement, старого (если был) не сохраняем
      store.add(rest);
    }
    await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
    db.close();
    await safeStorage.remove(HISTORY_KEY);
  } catch {
    // IndexedDB недоступен или старые данные повреждены — не критично,
    // просто начнётся новая история с нуля.
  }
}


/**
 * Добавляет одну попытку в историю — НЕ требует прочитать
 * существующие записи (в отличие от старого подхода через
 * safeStorage). Сама подрезает лог до MAX_HISTORY_ENTRIES, удаляя
 * самые старые записи по мере необходимости.
 */
async function addHistoryEntry(entry) {
  await migrateHistoryIfNeeded();
  try {
    const db = await openHistoryDb();
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    const store = tx.objectStore(HISTORY_STORE);
    store.add(entry);
    await new Promise((resolve) => {
      const countReq = store.count();
      countReq.onsuccess = () => {
        const excess = countReq.result - MAX_HISTORY_ENTRIES;
        if (excess <= 0) { resolve(); return; }
        // autoIncrement id растёт по порядку добавления — курсор по
        // умолчанию идёт от меньшего id, то есть от самых старых записей.
        const cursorReq = store.openCursor();
        let deleted = 0;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && deleted < excess) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorReq.onerror = () => resolve();
      };
      countReq.onerror = () => resolve();
    });
    await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
    db.close();
  } catch {
    // IndexedDB недоступен (приватный режим и т.п.) — история просто
    // не запишется в этот раз, не критично для остального прогресса.
  }
}


/** @returns {Promise<Array>} все записи истории, в порядке добавления */
async function getHistoryEntries() {
  await migrateHistoryIfNeeded();
  try {
    const db = await openHistoryDb();
    const tx = db.transaction(HISTORY_STORE, "readonly");
    const entries = await new Promise((resolve) => {
      const req = tx.objectStore(HISTORY_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    db.close();
    return entries;
  } catch {
    return [];
  }
}


async function clearHistory() {
  try {
    const db = await openHistoryDb();
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    tx.objectStore(HISTORY_STORE).clear();
    await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
    db.close();
  } catch {
    // не критично
  }
}


/* ==========================================================================
   История обучения — группировка по дням, календарь активности.
   ========================================================================== */

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}


const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];


function formatDayLabel(dayStartTs) {
  const today = startOfDay(Date.now());
  const diffDays = Math.round((today - dayStartTs) / 86400000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  const d = new Date(dayStartTs);
  const withYear = d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : "";
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}${withYear}`;
}


function groupHistoryByDay(historyLog) {
  const byDay = {};
  historyLog.forEach((entry) => {
    const dayKey = startOfDay(entry.ts);
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(entry);
  });
  return Object.keys(byDay)
    .map(Number)
    .sort((a, b) => b - a)
    .map((dayKey) => ({ dayKey, label: formatDayLabel(dayKey), entries: byDay[dayKey] }));
}


const DAY_MS = 86400000;

const CALENDAR_WEEKS = 14;


function buildActivityCalendar(historyLog) {
  const counts = {};
  historyLog.forEach((e) => {
    const day = startOfDay(e.ts);
    counts[day] = (counts[day] || 0) + 1;
  });
  const todayStart = startOfDay(Date.now());
  const todayDow = new Date(todayStart).getDay();
  const gridEnd = todayStart + (6 - todayDow) * DAY_MS;
  const gridStart = gridEnd - (CALENDAR_WEEKS * 7 - 1) * DAY_MS;

  const weeks = [];
  for (let w = 0; w < CALENDAR_WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const ts = gridStart + (w * 7 + d) * DAY_MS;
      week.push({ ts, count: counts[ts] || 0, isFuture: ts > todayStart, isToday: ts === todayStart });
    }
    weeks.push(week);
  }
  return weeks;
}


/**
 * Точность по дням за последние N дней (по умолчанию 14) — для графика
 * тренда в «Итогах». Дни без единой попытки просто пропускаются (не
 * добавляют точку на графике с 0%), а не искажают линию нулями.
 */
function buildDailyAccuracy(historyLog, days = 14) {
  const today = startOfDay(Date.now());
  const byDay = {};
  historyLog.forEach((e) => {
    const day = startOfDay(e.ts);
    if (!byDay[day]) byDay[day] = { correct: 0, total: 0 };
    byDay[day].total += 1;
    if (e.correct) byDay[day].correct += 1;
  });
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = today - i * DAY_MS;
    const d = byDay[day];
    if (d) points.push({ day, pct: Math.round((d.correct / d.total) * 100), total: d.total });
  }
  return points;
}

/* ==========================================================================
   Установка PWA — своя кнопка вместо системного баннера "на удачу".
   Показывается только после реальной вовлечённости (серия ≥ 2 дней),
   не показывается повторно, если пользователь уже отказался, и не
   показывается, если приложение уже установлено (display-mode: standalone
   на Android/десктопе, navigator.standalone на iOS).
   ========================================================================== */

