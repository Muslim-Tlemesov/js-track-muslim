/* ==========================================================================
   pages/shared/core-review.js — интервальное повторение — вопрос с ошибкой всплывает снова через растущий интервал.

   Файл 14 из 18, на которые разбит движок (реорганизовано из 6
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

/* ==========================================================================
   Интервальное повторение (spaced repetition) — вопрос с ошибкой
   "всплывает" снова через день, потом через 3 дня, 7, 14, 30 — если
   отвечен верно каждый раз. Ошибка на любом шаге сбрасывает интервал
   обратно к 1 дню, а не просто убирает вопрос из виду насовсем.
   ========================================================================== */

const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];


/**
 * Обновляет расписание повторения для одного вопроса по факту ответа.
 * Вызывается СВЕРХ submitAnswer (не встроено внутрь него) — расписание
 * повторения осмысленно только для вопросов основного потока курса,
 * не для экзамена/песочницы, где submitAnswer в принципе не используется
 * для сохранения прогресса таким же образом.
 * @param {string} questionId
 * @param {boolean} isCorrect
 */
async function updateReviewSchedule(questionId, isCorrect) {
  const res = await safeStorage.get(REVIEW_SCHEDULE_KEY);
  let schedule = {};
  try { if (res && res.value) schedule = JSON.parse(res.value); } catch { /* нет данных */ }

  const today = startOfDay(Date.now());
  const current = schedule[questionId];

  if (!isCorrect) {
    // ошибка — интервал всегда сбрасывается к первому шагу, независимо
    // от того, как далеко продвинулись раньше.
    schedule[questionId] = { stepIdx: 0, nextReviewDay: today + REVIEW_INTERVALS_DAYS[0] * DAY_MS };
  } else {
    const prevStepIdx = current ? current.stepIdx : -1;
    const nextStepIdx = Math.min(prevStepIdx + 1, REVIEW_INTERVALS_DAYS.length - 1);
    schedule[questionId] = { stepIdx: nextStepIdx, nextReviewDay: today + REVIEW_INTERVALS_DAYS[nextStepIdx] * DAY_MS };
  }

  await safeStorage.set(REVIEW_SCHEDULE_KEY, JSON.stringify(schedule));
}


/**
 * Вопросы, которые пора повторить сегодня (nextReviewDay <= сегодня).
 * Возвращает полные объекты вопросов (из ALL_QUESTIONS), отсортированные
 * по тому, насколько давно "просрочен" повтор — самые старые сначала.
 * @returns {Promise<Array>}
 */
async function getDueReviewQuestions() {
  const res = await safeStorage.get(REVIEW_SCHEDULE_KEY);
  let schedule = {};
  try { if (res && res.value) schedule = JSON.parse(res.value); } catch { /* нет данных */ }

  const today = startOfDay(Date.now());
  const dueIds = Object.keys(schedule)
    .filter((id) => schedule[id].nextReviewDay <= today)
    .sort((a, b) => schedule[a].nextReviewDay - schedule[b].nextReviewDay);

  return dueIds.map((id) => QUESTION_BY_ID[id]).filter(Boolean);
}

/* ==========================================================================
   Публичная ссылка на прогресс — без сервера единственный реальный
   способ "поделиться" состоянием это закодировать его прямо в URL
   (сайт статичный, хранить чужие данные негде). Ссылка — это СНИМОК на
   момент генерации, не живой профиль: если человек продолжит
   заниматься, старая ссылка не обновится сама.
   ========================================================================== */

