/* ==========================================================================
   pages/shared/core-streak.js — серия дней подряд — обновляется ТОЛЬКО из submitAnswer (см. core-xp.js), не при простом открытии страницы.

   Файл 6 из 18, на которые разбит движок (реорганизовано из 6
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
 * Читает текущую серию БЕЗ обновления — используется страницами
 * только для отображения (loadCoreState). Обновление (инкремент/сброс)
 * происходит ИСКЛЮЧИТЕЛЬНО при реальном ответе на вопрос — см.
 * loadAndUpdateDailyStreak() ниже, вызывается из submitAnswer(), а не
 * при простом открытии страницы: иначе серия росла бы просто от
 * захода на сайт, без единого решённого вопроса, что обесценивает
 * саму механику "не теряй серию".
 * @returns {Promise<{count: number, best: number, lastDate: string|null}>}
 */
async function getStreak() {
  let record = { count: 0, best: 0, lastDate: null };
  try {
    const res = await safeStorage.get(STREAK_KEY);
    if (res && res.value) record = JSON.parse(res.value);
  } catch {
    // первого запуска ещё не было
  }
  return record;
}

/**
 * Обновляет (инкрементирует/сбрасывает) дневную серию занятий по факту
 * РЕАЛЬНОГО ответа на вопрос. Идемпотентно для одного и того же
 * календарного дня — повторный вызов в тот же день серию не тронет.
 * @returns {Promise<{count: number, best: number, lastDate: string, brokenCount: number|null}>}
 */

/**
 * Дата в формате YYYY-MM-DD по МЕСТНОМУ времени пользователя — НЕ
 * toISOString().slice(0, 10) (та даёт UTC). Реальный найденный баг:
 * человек, занимающийся в 00:30 по местному времени в часовом поясе
 * восточнее UTC (например UTC+8), формально ещё "вчера" по UTC —
 * серия дней, календарь активности и напоминания могли посчитать это
 * днём раньше, чем реально было у пользователя на часах.
 */
function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


async function loadAndUpdateDailyStreak() {
  let record = { count: 0, best: 0, lastDate: null };
  try {
    const res = await safeStorage.get(STREAK_KEY);
    if (res && res.value) record = JSON.parse(res.value);
  } catch {
    // первого запуска ещё не было
  }
  const prevBest = record.best || 0;
  const today = new Date();
  const todayStr = getLocalDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateKey(yesterday);

  let brokenCount = null;
  let nextRecord;
  if (record.lastDate === todayStr) {
    nextRecord = { count: record.count, best: Math.max(prevBest, record.count), lastDate: todayStr };
  } else if (record.lastDate === yesterdayStr) {
    const count = record.count + 1;
    nextRecord = { count, best: Math.max(prevBest, count), lastDate: todayStr };
  } else {
    if (record.count > 1) brokenCount = record.count;
    nextRecord = { count: 1, best: Math.max(prevBest, 1), lastDate: todayStr };
  }
  await safeStorage.set(STREAK_KEY, JSON.stringify(nextRecord));
  return { ...nextRecord, brokenCount };
}

