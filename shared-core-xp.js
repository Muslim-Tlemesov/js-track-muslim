/* ==========================================================================
   pages/shared/core-xp.js — submitAnswer — главная функция записи ответа: XP, достижения, серия, история, интервальное повторение.

   Файл 15 из 18, на которые разбит движок (реорганизовано из 6
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

const XP_PER_CORRECT_ANSWER = 25;

/**
 * Записывает ответ на вопрос целиком: обновляет answers, XP (только на
 * ПЕРВЫЙ верный ответ, не на повторные), серию верных ответов подряд,
 * лог истории, и проверяет/разлочивает новые достижения. Возвращает
 * всё, что странице нужно для обновления экрана — включая тексты
 * новых достижений (для тоста).
 *
 * @param {Object} params
 * @param {Object} params.question - элемент из ALL_QUESTIONS (с topicId/topicTitle)
 * @param {boolean} params.isCorrect
 * @param {number} params.elapsedMs
 * @returns {Promise<{xpGained: number, newlyUnlocked: Array, levelJustUnlocked: number|null}>}
 */
async function submitAnswer({ question, isCorrect, elapsedMs }) {
  // Реальная учебная активность — единственный законный повод обновить
  // серию дней и отметить "сегодня был активен" (для напоминаний).
  // Ждём завершения обеих операций — страницы обычно вызывают
  // loadCoreState() сразу после submitAnswer(), и без await здесь
  // возможна гонка: чтение STREAK_KEY могло бы случиться раньше, чем
  // запись успела бы завершиться.
  await Promise.all([loadAndUpdateDailyStreak(), setLastActiveToday()]);

  // answers
  const answersRes = await safeStorage.get(STORAGE_KEY);
  let answers = {};
  try { if (answersRes && answersRes.value) answers = JSON.parse(answersRes.value); } catch { /* нет данных */ }
  const alreadyCorrect = answers[question.id]?.status === "correct";
  // Факт "этот вопрос уже был решён верно" — необратимый: если позже
  // (например, вернувшись назад по навигации) ответить на тот же
  // вопрос неверно, статус не должен откатиться на "wrong" — иначе
  // следующий верный ответ снова прошёл бы условие ниже (isCorrect &&
  // !alreadyCorrect) и начислял XP повторно за один и тот же вопрос.
  const finalStatus = alreadyCorrect || isCorrect ? "correct" : "wrong";
  answers = { ...answers, [question.id]: { status: finalStatus } };
  await safeStorage.set(STORAGE_KEY, JSON.stringify(answers));

  // XP — только на первый верный ответ на именно этот вопрос
  let xpGained = 0;
  if (isCorrect && !alreadyCorrect) {
    const xpRes = await safeStorage.get(XP_KEY);
    let xp = 0;
    try { if (xpRes && xpRes.value) xp = JSON.parse(xpRes.value).xp || 0; } catch { /* нет данных */ }
    xpGained = XP_PER_CORRECT_ANSWER;
    await safeStorage.set(XP_KEY, JSON.stringify({ xp: xp + xpGained }));
  }

  // достижения + серия верных ответов подряд + самый быстрый верный ответ
  const achRes = await safeStorage.get(ACHIEVEMENTS_KEY);
  let achState = { unlocked: [], bestStreak: 0, currentStreak: 0, fastestAnswerMs: null };
  try { if (achRes && achRes.value) achState = { ...achState, ...JSON.parse(achRes.value) }; } catch { /* нет данных */ }

  const nextCurrentStreak = isCorrect ? achState.currentStreak + 1 : 0;
  const nextBestStreak = Math.max(achState.bestStreak, nextCurrentStreak);
  const nextFastest = isCorrect && (achState.fastestAnswerMs === null || elapsedMs < achState.fastestAnswerMs)
    ? elapsedMs
    : achState.fastestAnswerMs;

  const topicProgress = computeTopicProgress(answers);
  const levelProgress = computeLevelProgress(answers);
  const totalCorrect = Object.values(topicProgress).reduce((s, t) => s + t.correct, 0);
  const isLevelUnlockedFn = (level) => isLevelUnlockedFor(levelProgress, level);

  const ctx = { totalCorrect, bestStreak: nextBestStreak, topicProgress, isLevelUnlocked: isLevelUnlockedFn, fastestAnswerMs: nextFastest };
  const unlockedSet = new Set(achState.unlocked);
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id) && a.check(ctx));
  newlyUnlocked.forEach((a) => unlockedSet.add(a.id));

  await safeStorage.set(ACHIEVEMENTS_KEY, JSON.stringify({
    unlocked: [...unlockedSet], bestStreak: nextBestStreak, currentStreak: nextCurrentStreak, fastestAnswerMs: nextFastest,
  }));

  // лог истории обучения (максимум MAX_HISTORY_ENTRIES последних попыток)
  // — через IndexedDB, без чтения всех предыдущих записей на каждую новую.
  await addHistoryEntry({
    questionId: question.id, tags: question.tags || [], topicId: question.topicId,
    topicTitle: question.topicTitle, correct: isCorrect, elapsedMs, ts: Date.now(),
  });

  // разблокировка уровня сложности — сравниваем ДО/ПОСЛЕ этого ответа
  let levelJustUnlocked = null;
  for (const lvl of LEVELS) {
    if (lvl.level === 1) continue;
    const wasUnlocked = isLevelUnlockedFor(computeLevelProgress(answers), lvl.level) &&
      !isLevelUnlockedFor(computeLevelProgress({ ...answers, [question.id]: undefined }), lvl.level);
    if (wasUnlocked) levelJustUnlocked = lvl.level;
  }

  return { answers, xpGained, newlyUnlocked, levelJustUnlocked, currentStreak: nextCurrentStreak };
}

/* ==========================================================================
   Движок выполнения кода студента — используется CodeEditor и логикой
   сдачи code-вопросов на "Вопросах"/"Консоли"/"Экзамене" и т.д.
   ========================================================================== */

