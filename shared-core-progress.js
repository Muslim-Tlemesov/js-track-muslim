/* ==========================================================================
   pages/shared/core-progress.js — прогресс по темам/уровням, звания, loadCoreState (читается на каждой странице), сброс прогресса, порядок вопросов.

   Файл 13 из 18, на которые разбит движок (реорганизовано из 6
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
 * Прогресс по каждой теме: сколько вопросов отвечено/верно из общего
 * числа. Используется для процента прохождения курса и разблокировки
 * уровней сложности.
 */
function computeTopicProgress(answers) {
  const map = {};
  TOPICS.forEach((t) => {
    const qs = t.questions;
    const done = qs.filter((q) => answers[q.id]).length;
    const correct = qs.filter((q) => answers[q.id]?.status === "correct").length;
    map[t.id] = { done, total: qs.length, correct };
  });
  return map;
}


function computeLevelProgress(answers) {
  const map = {};
  LEVELS.forEach((lvl) => {
    const qs = TOPICS.filter((t) => t.level === lvl.level).flatMap((t) => t.questions);
    const correct = qs.filter((q) => answers[q.id]?.status === "correct").length;
    map[lvl.level] = { correct, total: qs.length, pct: qs.length > 0 ? correct / qs.length : 0 };
  });
  return map;
}


function isLevelUnlockedFor(levelProgress, level) {
  if (level <= 1) return true;
  const prev = levelProgress[level - 1];
  if (!prev || prev.total === 0) return false;
  return prev.pct >= LEVEL_UNLOCK_THRESHOLD;
}


// Ранг — отдельная, самостоятельная прогрессия по очкам опыта, не
// путать со "сложностью" темы (LEVELS). Порог для ранга r растёт
// квадратично (30 * r * (r-1)), поэтому каждый следующий ранг требует
// больше XP, чем предыдущий.
function xpThresholdForRank(rank) {
  return 30 * rank * (rank - 1);
}

function rankForXp(xp) {
  let rank = 1;
  while (xpThresholdForRank(rank + 1) <= xp) rank++;
  return rank;
}

function rankTitle(rank) {
  if (rank <= 2) return "Новичок";
  if (rank <= 5) return "Начинающий JS";
  if (rank <= 9) return "Junior JS";
  return "Уверенный Junior JS";
}


function timeGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}


function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}


/**
 * Читает всё состояние, нужное практически любой странице — ответы,
 * XP, достижения, серию. Один вызов вместо нескольких отдельных
 * chтений, чтобы не дублировать этот блок в каждом page-скрипте.
 * @returns {Promise<Object>}
 */
async function loadCoreState() {
  // ВАЖНО: используем getStreak() (только чтение), не
  // loadAndUpdateDailyStreak() — эта функция вызывается на КАЖДОЙ
  // странице при простом открытии, и если бы она обновляла серию,
  // "день" засчитывался бы просто от захода на сайт, без единого
  // решённого вопроса. Обновление серии и отметка "активен сегодня"
  // (для напоминаний) происходят только внутри submitAnswer() — по
  // факту реального ответа.
  const [answersRes, xpRes, achRes, streak] = await Promise.all([
    safeStorage.get(STORAGE_KEY),
    safeStorage.get(XP_KEY),
    safeStorage.get(ACHIEVEMENTS_KEY),
    getStreak(),
  ]);

  let answers = {};
  try { if (answersRes && answersRes.value) answers = JSON.parse(answersRes.value); } catch { /* нет данных */ }

  let xp = 0;
  try { if (xpRes && xpRes.value) xp = JSON.parse(xpRes.value).xp || 0; } catch { /* нет данных */ }

  let unlockedAchievements = {};
  try {
    if (achRes && achRes.value) {
      const parsed = JSON.parse(achRes.value);
      unlockedAchievements = Object.fromEntries((parsed.unlocked || []).map((id) => [id, true]));
    }
  } catch { /* нет данных */ }

  const topicProgress = computeTopicProgress(answers);
  const totalCorrect = Object.values(topicProgress).reduce((s, t) => s + t.correct, 0);
  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = ALL_QUESTIONS.length;
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const rank = rankForXp(xp);

  return {
    answers, xp, rank, unlockedAchievements, streak, topicProgress,
    totalCorrect, totalAnswered, totalQuestions, overallPct,
  };
}


/**
 * Ключи хранилища, которые составляют "прогресс" в том смысле, в каком
 * его понимает кнопка "Сбросить весь прогресс" — ответы, XP,
 * достижения, серия дней, история обучения, расписание интервального
 * повторения, черновик в песочнице, имя для сертификата, флаг "видел
 * онбординг". НЕ включены THEME_KEY/SOUND_KEY (это настройки
 * интерфейса, не прогресс — незачем сбрасывать тему или звук вместе
 * с прогрессом) и *_DISMISSED_KEY (состояние баннеров — тоже не
 * прогресс по сути).
 */
const PROGRESS_KEYS = [
  STORAGE_KEY, XP_KEY, ACHIEVEMENTS_KEY, STREAK_KEY,
  REVIEW_SCHEDULE_KEY, SANDBOX_KEY, CERT_NAME_KEY, ONBOARDING_SEEN_KEY,
];


/**
 * Сбрасывает ВЕСЬ прогресс — единая функция вместо дублирования
 * неполного списка на каждой странице (реальный найденный баг: 13
 * страниц сбрасывали только STORAGE_KEY/XP_KEY/ACHIEVEMENTS_KEY,
 * оставляя серию дней, историю, расписание повторения и черновик
 * песочницы нетронутыми — вопреки тому, что было написано в
 * подтверждении "Сбросить весь прогресс?").
 */
async function resetAllProgress() {
  // Реальная найденная проблема (внешний технический разбор): раньше
  // localStorage-шаг шёл через Promise.all — если ХОТЬ ОДИН ключ
  // падал (например safeStorage недоступен в приватном режиме
  // браузера), Promise.all отклонялся ЦЕЛИКОМ, resetAllProgress
  // выбрасывал исключение, и следующие два шага (история в IndexedDB,
  // напоминания в другой IndexedDB) вообще не выполнялись —
  // пользователь думал бы, что сбросил всё, а по факту часть данных
  // осталась молча нетронутой. Теперь все 3 хранилища ВСЕГДА пытаются
  // очиститься независимо от того, упал ли предыдущий шаг — через
  // allSettled, не all — и функция возвращает, что именно не
  // удалось, чтобы вызывающий код мог честно предупредить
  // пользователя, а не тихо считать успехом.
  const failed = [];

  const localResults = await Promise.allSettled(PROGRESS_KEYS.map((key) => safeStorage.remove(key)));
  localResults.forEach((r, i) => {
    if (r.status === "rejected") failed.push(`localStorage: ${PROGRESS_KEYS[i]}`);
  });

  try {
    await clearHistory();
  } catch {
    failed.push("история обучения (IndexedDB)");
  }

  // IndexedDB-след для напоминаний ("последняя активная дата") — тоже
  // часть прогресса, но хранится отдельно от safeStorage (см.
  // pwa-reminders.js), поэтому чистится своим механизмом.
  try {
    if (typeof indexedDB !== "undefined") {
      const deleted = await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase("js-track-reminder");
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => resolve(false);
      });
      if (!deleted) failed.push("напоминания (IndexedDB)");
    }
  } catch {
    failed.push("напоминания (IndexedDB)");
  }

  return { allCleared: failed.length === 0, failed };
}


/**
 * Диалог подтверждения + сброс + перезагрузка страницы — раньше эта
 * обёртка (не сама логика сброса, а именно confirm+reload вокруг неё)
 * была дословно продублирована в 13 файлах страниц, по одной копии на
 * каждую. Исправишь текст подтверждения или добавишь шаг после
 * сброса в одном месте — 12 остальных страниц осталось бы со старой
 * версией, если не отследить все копии вручную. Теперь каждая
 * страница просто передаёт эту функцию напрямую в Header, без
 * собственной локальной обёртки.
 */
async function handleResetProgressWithConfirm() {
  const ok = window.confirm("Сбросить весь прогресс? Это действие нельзя отменить.");
  if (!ok) return;
  const result = await resetAllProgress();
  if (!result.allCleared) {
    window.alert(
      "Часть данных не удалось сбросить: " + result.failed.join(", ") +
      ". Попробуй ещё раз — если проблема повторится, дело может быть в настройках приватности браузера."
    );
  }
  window.location.reload();
}


// Порядок вопросов внутри темы перемешан один раз за сессию (детерминированно
// по id темы + случайность сессии) — порядок самих тем остаётся по программе
// курса. window.__JS_TRACK_SHUFFLE_SEED__ позволяет тестам зафиксировать
// конкретный порядок для воспроизводимости.
function seededRandom(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const sessionEntropy =
    typeof window !== "undefined" && window.__JS_TRACK_SHUFFLE_SEED__ !== undefined
      ? window.__JS_TRACK_SHUFFLE_SEED__
      : Date.now();
  seed = (seed ^ sessionEntropy) >>> 0;
  return () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 8) / 0x1000000;
  };
}


function shuffleValues(arr, seedStr) {
  const rand = seededRandom(seedStr);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


const SHUFFLED_TOPICS = TOPICS.map((t) => ({
  ...t,
  questions: shuffleValues(t.questions, t.id),
}));


// Плоский список для НАВИГАЦИИ — перед вопросами каждой темы вставлен
// экран теории ({ type: "lesson", ... }).
const NAV_ITEMS = SHUFFLED_TOPICS.flatMap((t) => [
  { type: "lesson", topicId: t.id, topicTitle: t.title, lesson: t.lesson },
  ...t.questions.map((q) => ({ ...q, topicId: t.id, topicTitle: t.title })),
]);


/**
 * Индекс, на который должно вести "Продолжить обучение" — первый
 * неотвеченный вопрос по всему курсу. Если это первый вопрос ещё не
 * начатой темы, возвращает индекс её экрана теории, а не сразу вопроса.
 */
function findResumeIndex(navItems, answers, topicProgress) {
  for (let i = 0; i < navItems.length; i++) {
    const item = navItems[i];
    if (item.type === "lesson") continue;
    if (!answers[item.id]) {
      const topicDone = topicProgress[item.topicId]?.done || 0;
      if (topicDone === 0) {
        const lessonIdx = navItems.findIndex((it) => it.type === "lesson" && it.topicId === item.topicId);
        return lessonIdx !== -1 ? lessonIdx : i;
      }
      return i;
    }
  }
  return 0;
}


/** Тема заблокирована, если уровень сложности, к которому она относится, ещё не открыт. */
function isTopicLockedFor(levelProgress, topicId) {
  return !isLevelUnlockedFor(levelProgress, TOPIC_LEVEL[topicId]);
}

