/* ==========================================================================
   pages/shared/pwa-reminders.js — напоминания о серии дней — Periodic Background Sync (best-effort, без сервера).

   Файл 12 из 18, на которые разбит движок (реорганизовано из 6
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

/**
 * Уместный момент для предложения включить напоминания — та же
 * вовлечённость, что и для установки PWA (серия ≥ 2 дней), плюс
 * разрешение на уведомления ещё не запрошено или не отклонено, плюс
 * сам API вообще существует в этом браузере.
 * @param {{count: number}|null} streak
 */
async function shouldOfferReminders(streak) {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "default") return false; // уже разрешено или отклонено раньше
  if (!streak || streak.count < 2) return false;
  try {
    const res = await safeStorage.get(REMINDER_OFFER_DISMISSED_KEY);
    if (res && res.value === "1") return false;
  } catch {
    // нет данных — считаем, что ещё не отказывались
  }
  return true;
}


async function dismissReminderOffer() {
  await safeStorage.set(REMINDER_OFFER_DISMISSED_KEY, "1");
}


/* ==========================================================================
   Напоминание о серии дней — через IndexedDB (не window.storage: он
   недоступен внутри service worker, а IndexedDB — обычный веб-API,
   работает из обоих контекстов). Настоящих push-уведомлений без сервера
   не бывает — это Periodic Background Sync, лучшее, что доступно
   статичному сайту: работает только в Chrome/Edge на Android при
   установленном PWA, точное время не гарантировано браузером.
   ========================================================================== */

const REMINDER_DB_NAME = "js-track-reminder";

const REMINDER_STORE = "state";


function openReminderDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(REMINDER_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(REMINDER_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}


async function setLastActiveToday() {
  try {
    const db = await openReminderDb();
    const tx = db.transaction(REMINDER_STORE, "readwrite");
    tx.objectStore(REMINDER_STORE).put(getLocalDateKey(), "lastActiveDate");
    await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
    db.close();
  } catch {
    // IndexedDB недоступен (приватный режим и т.п.) — напоминания просто не сработают
  }
}


async function getLastActiveDate() {
  try {
    const db = await openReminderDb();
    const tx = db.transaction(REMINDER_STORE, "readonly");
    const value = await new Promise((res, rej) => {
      const r = tx.objectStore(REMINDER_STORE).get("lastActiveDate");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    db.close();
    return value || null;
  } catch {
    return null;
  }
}


/**
 * Запрашивает разрешение на уведомления и best-effort регистрирует
 * Periodic Background Sync. Возвращает, удалось ли реально включить
 * фоновую проверку (не только разрешение на уведомления) — используется,
 * чтобы честно сказать пользователю, сработает ли это на его устройстве.
 * @returns {Promise<{granted: boolean, periodicSyncSupported: boolean}>}
 */
async function enableStreakReminders() {
  if (typeof Notification === "undefined") return { granted: false, periodicSyncSupported: false };
  const permission = await Notification.requestPermission();
  const granted = permission === "granted";
  let periodicSyncSupported = false;
  if (granted && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ("periodicSync" in reg) {
        await reg.periodicSync.register("streak-reminder-check", { minInterval: 20 * 60 * 60 * 1000 });
        periodicSyncSupported = true;
      }
    } catch {
      // Periodic Background Sync недоступен на этом устройстве/браузере
    }
  }
  return { granted, periodicSyncSupported };
}

