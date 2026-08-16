

/* ==========================================================================
   pages/shared/engine-core.js (продолжение) — уровни, прогресс по
   темам, звания, реплики маскота Байта, submitAnswer (главная функция
   записи ответа — XP, достижения, разблокировка уровня), порядок
   вопросов (NAV_ITEMS), эмодзи тем. Использует TOPICS/ALL_QUESTIONS
   из engine-content.js — должен загружаться после него.
   ========================================================================== */

/* ==========================================================================
   pages/shared/engine-core.js — общий "движок" данных и состояния,
   подключается на КАЖДОЙ странице через <script src="shared-engine-
   core.js">. Без React — обычные async-функции для чтения состояния
   при загрузке страницы (в отличие от прежней SPA, где React-хуки
   держали состояние в памяти непрерывно между "экранами", здесь
   каждая страница — новая загрузка).

   Прогресс хранится в localStorage (см. safeStorage ниже) — обычный
   браузерный API, доступный на любом сайте без исключений. Переход
   между страницами не теряет ответы/XP/серию: следующая страница
   просто читает то же самое хранилище заново.

   Этот файл — первый из шести, на которые разбит движок (раньше был
   один engine.js на ~3700 строк). Порядок подключения в HTML важен —
   файлы делят одну глобальную область видимости, и более поздние
   файлы используют то, что объявлено в более ранних:
     1. shared-engine-content.js — TOPICS/ALL_QUESTIONS (учебный контент)
     2. shared-engine-core.js    — этот файл: состояние, прогресс, XP
     3. shared-engine-code.js    — движок выполнения пользовательского кода
     4. shared-engine-debugger.js — парсер для пошагового отладчика
     5. shared-engine-editor.js  — подсветка синтаксиса, автодополнение
     6. shared-engine-features.js — резервные копии, история, предсказания,
        экзамен, мини-проект, "найди баг", PWA, напоминания, шеринг
   ========================================================================== */

/**
 * Слой хранения прогресса. window.storage — API, специфичный для
 * среды разработки (Claude.ai) — на обычном сайте (GitHub Pages и
 * везде ещё) его не существует. Реальный, всегда доступный механизм —
 * localStorage: он есть в любом браузере без исключений, синхронный
 * по природе, но обёрнут в те же async-методы для единообразия
 * остального кода. window.storage используется ДОПОЛНИТЕЛЬНО, если
 * доступен (например, при разработке внутри Claude.ai), но никогда
 * не единственный источник — иначе прогресс не сохранялся бы вовсе.
 */
const safeStorage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return { key, value: raw };
    } catch {
      // localStorage недоступен (приватный режим Safari и т.п.) —
      // пробуем дальше через window.storage, если он есть.
    }
    try {
      if (typeof window !== "undefined" && window.storage) {
        return await window.storage.get(key);
      }
    } catch {
      // нет данных ни там, ни там
    }
    return null;
  },
  async set(key, value) {
    let localOk = false;
    try {
      localStorage.setItem(key, value);
      localOk = true;
    } catch {
      // localStorage недоступен — не страшно, если сработает window.storage ниже
    }
    try {
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.set(key, value);
      }
    } catch {
      // window.storage недоступен — не страшно, если localStorage сработал выше
    }
    return localOk ? { key, value } : null;
  },
  /**
   * Полностью удаляет ключ — НЕ то же самое, что set(key, null):
   * localStorage.setItem(key, null) записал бы строку "null" (а не
   * удалил бы ключ), что ломало бы всё, что дальше делает
   * `JSON.parse(value)` и ожидает объект, а не JS-null.
   */
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage недоступен — не страшно, если сработает window.storage ниже
    }
    try {
      if (typeof window !== "undefined" && window.storage && window.storage.delete) {
        await window.storage.delete(key);
      }
    } catch {
      // window.storage недоступен или без delete — не критично
    }
  },
};

const STORAGE_KEY = "js-track-answers";
const THEME_KEY = "js-track-theme";
const SOUND_KEY = "js-track-sound";
const ACHIEVEMENTS_KEY = "js-track-achievements";
const XP_KEY = "js-track-xp";
const CERT_NAME_KEY = "js-track-cert-name";
const SANDBOX_KEY = "js-track-sandbox";
const STREAK_KEY = "js-track-streak";
const HISTORY_KEY = "js-track-history";
const REVIEW_SCHEDULE_KEY = "js-track-review-schedule";
const ONBOARDING_SEEN_KEY = "js-track-onboarding-seen";
const PWA_INSTALL_DISMISSED_KEY = "js-track-pwa-install-dismissed";
const REMINDER_OFFER_DISMISSED_KEY = "js-track-reminder-offer-dismissed";

const THEMES = {
  light: {
    bg: "#FAF7F2", surface: "#FFFFFF", surfaceAlt: "#F3ECE4", border: "#E4D9CC",
    text: "#2B2118", textDim: "#6E5F50", accent: "#0F6B5C", accent2: "#CC4A24",
    success: "#2D6B38", successBg: "#EEF5EA", error: "#A8371F", errorBg: "#FBEDE8",
    console: "#1B1712", consoleText: "#E8DFD3",
  },
  dark: {
    bg: "#161310", surface: "#211C17", surfaceAlt: "#2C251E", border: "#3D342A",
    text: "#F5EDE1", textDim: "#A89684", accent: "#2BA894", accent2: "#F0794F",
    success: "#5FB86C", successBg: "#1A2E1B", error: "#E85D42", errorBg: "#3A1712",
    console: "#0D0B09", consoleText: "#D9CFC0",
  },
};

const ALL_QUESTIONS = TOPICS.flatMap((t) =>
  t.questions.map((q) => ({ ...q, topicId: t.id, topicTitle: t.title }))
);
// Быстрый поиск вопроса по id — нужен HistoryScreen для старого прогресса,
// отвеченного ещё до появления лога истории (там есть только id в answers).
const QUESTION_BY_ID = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));
const LEVELS = [
  { level: 1, emoji: "🟢", label: "Новичок" },
  { level: 2, emoji: "🟡", label: "Средний" },
  { level: 3, emoji: "🔴", label: "Продвинутый" },
];
const LEVEL_UNLOCK_THRESHOLD = 0.8;

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

const MASCOT_NAME = "Байт";
const MASCOT_CORRECT = [
  "Вот это да! Ты явно понял суть.",
  "Именно так! Продолжай в том же духе.",
  "Отлично — ты справляешься лучше, чем сам думаешь.",
  "Верно! Ещё один шаг ближе к Junior.",
  "Так держать — это было по-настоящему уверенно.",
  "Красиво! JS понемногу поддаётся.",
  "Есть! Именно на этом многие спотыкаются, а ты нет.",
];
const MASCOT_WRONG = [
  "Не страшно — ошибки это нормальная часть обучения. Смотри объяснение ниже.",
  "Почти! Прочитай объяснение — и на следующий раз точно получится.",
  "Бывает — даже опытные разработчики иногда путают такое.",
  "Окей, разберём почему — и пойдём дальше увереннее.",
  "Такие ошибки — самые полезные: запомнится надолго.",
];
const MASCOT_ACHIEVEMENT = [
  "Оп! Ещё один трофей в коллекции.",
  "Заслуженно — я всё видел.",
  "Вот это результат! Горжусь.",
  "Так и запишем: ты это сделал.",
  "Не жди, я всё равно скажу — молодец!",
];
const MASCOT_HOME_NEW = [
  "Погнали — я рядом на каждом шаге.",
  "Первый вопрос всегда самый простой. Начнём?",
  "Ты и я против синтаксиса JS. Начинаем.",
];
const MASCOT_HOME_STREAK = [
  "Серия дней растёт — я слежу за этим внимательнее, чем ты думаешь.",
  "Каждый день понемногу — так это и работает.",
  "Не разрывай серию ради меня. Ну ладно, ради себя тоже сойдёт.",
];
const MASCOT_HOME_HIGH_PROGRESS = [
  "Ты почти у цели — я нервничаю сильнее тебя.",
  "Ещё немного, и курс твой полностью.",
  "Финишная прямая. Я в предвкушении.",
];
const MASCOT_HOME_RETURNING = [
  "Рад снова видеть — продолжим с того же места.",
  "С возвращением. Помню, на чём остановились.",
  "Ты вернулся — значит, идём дальше.",
];

function homeCompanionLine({ hasStarted, streak, overallPct }, seed) {
  if (!hasStarted) {
    const pool = MASCOT_HOME_NEW;
    return pool[hashStr(seed) % pool.length];
  }
  if (overallPct >= 80) {
    const pool = MASCOT_HOME_HIGH_PROGRESS;
    return pool[hashStr(seed) % pool.length];
  }
  if (streak && streak.count >= 3) {
    const pool = MASCOT_HOME_STREAK;
    return pool[hashStr(seed) % pool.length];
  }
  const pool = MASCOT_HOME_RETURNING;
  return pool[hashStr(seed) % pool.length];
}

/**
 * Читает и применяет сохранённую тему — выставляет data-theme на
 * <html>, чтобы CSS custom properties (var(--accent) и т.д. в
 * shared.css) сразу переключились на нужную палитру. Каждая страница
 * вызывает это ОДИН раз при загрузке.
 * @returns {Promise<"dark"|"light">}
 */
async function loadAndApplyTheme() {
  let mode = "dark";
  try {
    const res = await safeStorage.get(THEME_KEY);
    const saved = res && res.value ? JSON.parse(res.value) : null;
    if (saved === "dark" || saved === "light") mode = saved;
  } catch {
    // ключа ещё нет — остаёмся на теме по умолчанию
  }
  document.documentElement.setAttribute("data-theme", mode);
  return mode;
}

/**
 * Переключает и сохраняет тему — используется кнопкой в шапке на
 * каждой странице.
 * @returns {Promise<"dark"|"light">} новый режим
 */
async function toggleAndSaveTheme(currentMode) {
  const next = currentMode === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  await safeStorage.set(THEME_KEY, JSON.stringify(next));
  return next;
}

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
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

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
  await Promise.all(PROGRESS_KEYS.map((key) => safeStorage.remove(key)));
  await clearHistory(); // история — отдельная IndexedDB, не safeStorage, чистится своим механизмом
  // IndexedDB-след для напоминаний ("последняя активная дата") — тоже
  // часть прогресса, но хранится отдельно от safeStorage (см.
  // engine-features.js), поэтому чистится своим механизмом.
  try {
    if (typeof indexedDB !== "undefined") {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase("js-track-reminder");
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
      });
    }
  } catch {
    // IndexedDB недоступен — не критично, остальной прогресс уже сброшен
  }
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
  await resetAllProgress();
  window.location.reload();
}

/* ==========================================================================
   Навигация по вопросам ("Вопросы" / questions.html) — перемешивание,
   плоский список для навигации, поиск точки продолжения, блокировка тем.
   ========================================================================== */

const TOPIC_LEVEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.level]));

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

const TOPIC_EMOJI = {
  vars: "🧩", naming: "🏷️", strings: "🔤", destructuring: "📤",
  arrays: "🔢", "array-mutability": "♻️", objects: "🗂️", "object-methods": "🔧",
  loops: "🔁", async: "⏳", classes: "🏗️", dom: "🌐",
};

const ACHIEVEMENTS = [
  {
    id: "first_correct",
    emoji: "🥇",
    title: "Первый шаг",
    description: "Первый правильный ответ",
    check: (ctx) => ctx.totalCorrect >= 1,
  },
  {
    id: "streak_7",
    emoji: "✨",
    title: "Разогрелся",
    description: "7 правильных ответов подряд",
    check: (ctx) => ctx.bestStreak >= 7,
  },
  {
    id: "streak_10",
    emoji: "🔥",
    title: "В ударе",
    description: "10 правильных ответов подряд",
    check: (ctx) => ctx.bestStreak >= 10,
  },
  {
    id: "first_topic",
    emoji: "📚",
    title: "Тема закрыта",
    description: "Завершена первая тема",
    check: (ctx) =>
      Object.values(ctx.topicProgress).some((p) => p.total > 0 && p.done === p.total),
  },
  {
    id: "level_2",
    emoji: "🎓",
    title: "Новый уровень",
    description: "Открыт второй уровень",
    check: (ctx) => ctx.isLevelUnlocked(2),
  },
  {
    id: "speed_10s",
    emoji: "⚡",
    title: "Молниеносно",
    description: "Ответил на вопрос быстрее чем за 10 секунд",
    check: (ctx) => ctx.fastestAnswerMs != null && ctx.fastestAnswerMs <= 10000,
  },
  {
    id: "level_complete",
    emoji: "💯",
    title: "Полная зачистка",
    description: "Пройдены все темы уровня",
    check: (ctx) =>
      LEVELS.some((lvl) =>
        TOPICS.filter((t) => t.level === lvl.level).every((t) => {
          const p = ctx.topicProgress[t.id];
          return p && p.total > 0 && p.done === p.total;
        })
      ),
  },
  {
    id: "course_complete",
    emoji: "🏆",
    title: "Курс пройден",
    description: "Пройден весь курс целиком",
    check: (ctx) => {
      const progresses = Object.values(ctx.topicProgress);
      return progresses.length > 0 && progresses.every((p) => p.total > 0 && p.done === p.total);
    },
  },
];

const XP_PER_CORRECT_ANSWER = 25;
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

