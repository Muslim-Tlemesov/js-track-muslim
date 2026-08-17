/* ==========================================================================
   pages/shared/data-achievements.js — звания (LEVELS), достижения (ACHIEVEMENTS), эмодзи/уровни тем, реплики маскота Байта.

   Файл 3 из 18, на которые разбит движок (реорганизовано из 6
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

const LEVELS = [
  { level: 1, emoji: "🟢", label: "Новичок" },
  { level: 2, emoji: "🟡", label: "Средний" },
  { level: 3, emoji: "🔴", label: "Продвинутый" },
];

const LEVEL_UNLOCK_THRESHOLD = 0.8;


const ACHIEVEMENTS = [
  {
    id: "first_correct",
    title: "Первый шаг",
    description: "Первый правильный ответ",
    check: (ctx) => ctx.totalCorrect >= 1,
  },
  {
    id: "streak_7",
    title: "Разогрелся",
    description: "7 правильных ответов подряд",
    check: (ctx) => ctx.bestStreak >= 7,
  },
  {
    id: "streak_10",
    title: "В ударе",
    description: "10 правильных ответов подряд",
    check: (ctx) => ctx.bestStreak >= 10,
  },
  {
    id: "first_topic",
    title: "Тема закрыта",
    description: "Завершена первая тема",
    check: (ctx) =>
      Object.values(ctx.topicProgress).some((p) => p.total > 0 && p.done === p.total),
  },
  {
    id: "level_2",
    title: "Новый уровень",
    description: "Открыт второй уровень",
    check: (ctx) => ctx.isLevelUnlocked(2),
  },
  {
    id: "speed_10s",
    title: "Молниеносно",
    description: "Ответил на вопрос быстрее чем за 10 секунд",
    check: (ctx) => ctx.fastestAnswerMs != null && ctx.fastestAnswerMs <= 10000,
  },
  {
    id: "level_complete",
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
    title: "Курс пройден",
    description: "Пройден весь курс целиком",
    check: (ctx) => {
      const progresses = Object.values(ctx.topicProgress);
      return progresses.length > 0 && progresses.every((p) => p.total > 0 && p.done === p.total);
    },
  },
];


/* ==========================================================================
   Навигация по вопросам ("Вопросы" / questions.html) — перемешивание,
   плоский список для навигации, поиск точки продолжения, блокировка тем.
   ========================================================================== */

const TOPIC_LEVEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.level]));


const TOPIC_EMOJI = {
  vars: "🧩", naming: "🏷️", strings: "🔤", destructuring: "📤",
  arrays: "🔢", "array-mutability": "♻️", objects: "🗂️", "object-methods": "🔧",
  loops: "🔁", async: "⏳", classes: "🏗️", dom: "🌐",
};


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

