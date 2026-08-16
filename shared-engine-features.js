/* ==========================================================================
   pages/shared/engine-features.js — всё остальное: резервное
   копирование прогресса, история обучения и календарь активности,
   тренажёр "Предскажи вывод", помощник для liveKind-вопросов, экзамен,
   стартовый код мини-проекта, примеры для "Найди баг", озвучка
   терминов, установка PWA, напоминания о серии, интервальное
   повторение, публичная ссылка на прогресс. Загружается последним —
   использует функции/данные из всех остальных engine-*.js файлов.
   ========================================================================== */


/* ==========================================================================
   Резервное копирование прогресса — экспорт/импорт всего состояния
   одним JSON-файлом.
   ========================================================================== */

const PROGRESS_EXPORT_KEYS = [
  STORAGE_KEY, XP_KEY, ACHIEVEMENTS_KEY, STREAK_KEY,
  CERT_NAME_KEY, THEME_KEY, SOUND_KEY, SANDBOX_KEY, REVIEW_SCHEDULE_KEY,
];

/**
 * История обучения хранится отдельно от остального прогресса — в
 * IndexedDB (см. addHistoryEntry/getHistoryEntries в engine-core.js),
 * не в safeStorage — поэтому не проходит через обычный перебор
 * PROGRESS_EXPORT_KEYS и упаковывается отдельным полем payload.history.
 */
async function buildProgressExportPayload() {
  const data = {};
  for (const key of PROGRESS_EXPORT_KEYS) {
    const res = await safeStorage.get(key);
    if (res && res.value !== undefined) data[key] = res.value;
  }
  const history = await getHistoryEntries();
  return { app: "js.track", version: 2, exportedAt: new Date().toISOString(), data, history };
}

async function exportProgressData() {
  const payload = await buildProgressExportPayload();
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.download = `js-track-progress-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * @param {File} file
 * @throws {Error} с человекочитаемым сообщением, если файл повреждён
 * или не похож на экспорт js.track.
 */
async function importProgressData(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл повреждён или это не JSON.");
  }
  if (!parsed || parsed.app !== "js.track" || typeof parsed.data !== "object" || parsed.data === null) {
    throw new Error("Это не похоже на файл прогресса js.track.");
  }
  for (const [key, value] of Object.entries(parsed.data)) {
    if (PROGRESS_EXPORT_KEYS.includes(key)) {
      await safeStorage.set(key, value);
    }
  }
  // history — отдельное поле (версия 2+ файла бэкапа); в файлах версии
  // 1 (до переноса на IndexedDB) история была ещё частью data.HISTORY_KEY —
  // подхватываем и такой старый формат тоже, чтобы не терять историю
  // при импорте бэкапа, сделанного до этого изменения.
  if (Array.isArray(parsed.history)) {
    await clearHistory();
    for (const entry of parsed.history) {
      const { id, ...rest } = entry;
      await addHistoryEntry(rest);
    }
  } else if (typeof parsed.data["js-track-history"] === "string") {
    try {
      const legacyHistory = JSON.parse(parsed.data["js-track-history"]);
      if (Array.isArray(legacyHistory)) {
        await clearHistory();
        for (const entry of legacyHistory) await addHistoryEntry(entry);
      }
    } catch {
      // старое поле повреждено — не критично, остальной прогресс уже восстановлен
    }
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

/* ==========================================================================
   «Предскажи вывод» — данные примеров и функция проверки.
   ========================================================================== */

const PREDICT_SNIPPETS = [
  {
    id: "hoist-var",
    topic: "var и hoisting",
    code: `console.log(a);\nvar a = 5;`,
    expected: ["undefined"],
    explanation: "var поднимается (hoisting) в начало своей области видимости, но БЕЗ значения — только объявление, не присваивание. К моменту console.log(a) переменная a уже существует, но ещё не получила значение 5, поэтому выводится undefined, а не ошибка.",
  },
  {
    id: "hoist-let-loop-var",
    topic: "var и hoisting",
    code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}`,
    expected: ["3", "3", "3"],
    explanation: "var не создаёт отдельную переменную i на каждой итерации — она одна общая на весь цикл. Все три setTimeout выполняются ПОСЛЕ того, как цикл уже полностью завершился (i успело дойти до 3), поэтому все три обращаются к одной и той же i = 3.",
  },
  {
    id: "hoist-let-loop-let",
    topic: "var и hoisting",
    code: `for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}`,
    expected: ["0", "1", "2"],
    explanation: "let, в отличие от var, создаёт НОВУЮ переменную i на каждой итерации цикла — каждый setTimeout 'запоминает' своё собственное значение i через замыкание. Поэтому вывод идёт по порядку: 0, 1, 2.",
  },
  {
    id: "coerce-1",
    topic: "Приведение типов",
    code: `console.log(1 + "1");`,
    expected: ["11"],
    explanation: "+ с одной строкой всегда работает как конкатенация (склейка), а не сложение — число 1 приводится к строке '1', и получается '1' + '1' = '11'.",
  },
  {
    id: "coerce-2",
    topic: "Приведение типов",
    code: `console.log("5" - 1);`,
    expected: ["4"],
    explanation: "У минуса нет 'строкового' смысла (в отличие от +), поэтому JS приводит строку '5' к числу 5, и получается обычное вычитание: 5 - 1 = 4.",
  },
  {
    id: "coerce-3",
    topic: "Приведение типов",
    code: `console.log("5" + 3);`,
    expected: ["53"],
    explanation: "+ со строкой всегда конкатенация: 3 сначала превращается в строку '3', а затем строки '5' и '3' склеиваются в '53'.",
  },
  {
    id: "coerce-4",
    topic: "Приведение типов",
    code: `console.log("5" - "2");`,
    expected: ["3"],
    explanation: "У минуса всегда числовой смысл — обе строки приводятся к числам (5 и 2), и получается обычное вычитание: 5 - 2 = 3.",
  },
  {
    id: "loose-eq",
    topic: "Приведение типов",
    code: `console.log(1 == "1");`,
    expected: ["true"],
    explanation: "== сравнивает значения С приведением типов — строка '1' сначала превращается в число 1, и 1 == 1 → true. Для сравнения БЕЗ приведения типов используют ===.",
  },
  {
    id: "strict-eq",
    topic: "Приведение типов",
    code: `console.log(1 === "1");`,
    expected: ["false"],
    explanation: "=== сравнивает и значение, и тип, без приведения — число 1 и строка '1' имеют разный тип (number и string), поэтому результат false, даже несмотря на 'похожесть' значений.",
  },
  {
    id: "nan-eq",
    topic: "Приведение типов",
    code: `console.log(NaN === NaN);`,
    expected: ["false"],
    explanation: "NaN — единственное значение в JS, которое не равно даже самому себе. Поэтому NaN === NaN всегда false. Чтобы проверить, является ли значение NaN, используют Number.isNaN(x), а не x === NaN.",
  },
  {
    id: "typeof-nan",
    topic: "Приведение типов",
    code: `console.log(typeof NaN);`,
    expected: ["number"],
    explanation: "Как ни странно, typeof NaN — 'number': NaN формально относится к числовому типу, просто обозначает 'не число' (результат некорректной математической операции), а не отсутствие типа.",
  },
  {
    id: "typeof-null",
    topic: "Приведение типов",
    code: `console.log(typeof null);`,
    expected: ["object"],
    explanation: "Это исторический баг языка JS, который решили не исправлять (иначе сломался бы старый код): typeof null возвращает 'object', хотя null — отдельный примитивный тип, а не объект.",
  },
  {
    id: "float-precision",
    topic: "Числа",
    code: `console.log(0.1 + 0.2);`,
    expected: ["0.30000000000000004"],
    explanation: "Компьютеры хранят дробные числа в двоичном виде, а 0.1 и 0.2 нельзя точно представить в двоичной системе (как 1/3 нельзя точно записать в десятичной) — отсюда крошечная погрешность округления в результате.",
  },
  {
    id: "array-tostring",
    topic: "Приведение типов",
    code: `console.log([1, 2, 3].toString());`,
    expected: ["1,2,3"],
    explanation: "Метод toString() у массива склеивает все элементы через запятую в одну строку, без пробелов и без квадратных скобок — получается '1,2,3'.",
  },
  {
    id: "bool-empty-array",
    topic: "Приведение типов",
    code: `console.log(Boolean([]));`,
    expected: ["true"],
    explanation: "В JS 'ложными' (falsy) считаются только конкретные значения: 0, '', null, undefined, NaN и false. Пустой массив [] в этот список не входит — любой объект (включая массив, даже пустой) всегда truthy.",
  },
  {
    id: "loose-eq-array",
    topic: "Приведение типов",
    code: `console.log([] == false);`,
    expected: ["true"],
    explanation: "== приводит оба операнда к числам при сравнении с булевым значением: false → 0, а [] → '' (пустая строка) → 0. В итоге 0 == 0 → true — характерный пример того, почему == часто ведёт себя неожиданно.",
  },
  {
    id: "template-literal",
    topic: "Шаблонные строки",
    code: `const x = 5;\nconsole.log(\`Result: \${x + 1}\`);`,
    expected: ["Result: 6"],
    explanation: "Внутри ${ } шаблонной строки можно писать любое JS-выражение, не только имя переменной — x + 1 вычисляется (5 + 1 = 6) и подставляется в текст.",
  },
  {
    id: "nullish",
    topic: "Optional chaining и ??",
    code: `const user = { name: "Дана" };\nconsole.log(user.age ?? "unknown");`,
    expected: ["unknown"],
    explanation: "?? возвращает правое значение только если левое — именно null или undefined. У user нет свойства age, значит user.age — undefined, и ?? подставляет 'unknown'.",
  },
  {
    id: "destr-default",
    topic: "Деструктуризация",
    code: `const { a = 10 } = {};\nconsole.log(a);`,
    expected: ["10"],
    explanation: "{ a = 10 } задаёт значение по умолчанию: оно используется, только если у объекта нет свойства a (или оно равно undefined). Так как объект пустой {}, a становится 10.",
  },
  {
    id: "ctor-this",
    topic: "this и классы",
    code: `function Foo() { this.x = 10; }\nconst f = new Foo();\nconsole.log(f.x);`,
    expected: ["10"],
    explanation: "new Foo() создаёт новый пустой объект и вызывает Foo с this, указывающим на этот новый объект. this.x = 10 записывает свойство x именно в него, поэтому f.x — 10.",
  },
  {
    id: "event-loop-order",
    topic: "Event Loop",
    code: `console.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");`,
    expected: ["A", "D", "C", "B"],
    explanation: "Сначала выполняется весь синхронный код по порядку (A, затем D). Затем движок разбирает микрозадачи (Promise.then) — C. И только в самом конце — макрозадачи (setTimeout) — B, даже с задержкой 0мс.",
  },
];

const PREDICT_SHUFFLED = shuffleValues(PREDICT_SNIPPETS, "predict-output");

/**
 * Сверяет предсказанный пользователем вывод с заранее посчитанным
 * expected-массивом: построчно, без учёта пробелов по краям строки,
 * пустые строки ввода игнорируются.
 */
function gradePrediction(userText, expectedLines) {
  const userLines = userText.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const maxLen = Math.max(userLines.length, expectedLines.length);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    const expected = expectedLines[i] ?? null;
    const actual = userLines[i] ?? null;
    rows.push({ expected, actual, correct: expected !== null && actual !== null && expected === actual });
  }
  const allCorrect = rows.every((r) => r.correct) && userLines.length === expectedLines.length;
  return { allCorrect, rows };
}

/**
 * Создаёт "живой" DOM-подобный объект для вопросов с liveKind (dom-3..
 * dom-6) — button.addEventListener(...), card.style, title.textContent,
 * el.classList — без реального DOM, но с тем же API, что нужен в этих
 * конкретных заданиях.
 */
function makeLiveObject(kind) {
  if (kind === "addEventListener") {
    return { handlers: {}, addEventListener(event, cb) { this.handlers[event] = cb; } };
  }
  if (kind === "style") {
    return { style: {} };
  }
  if (kind === "textContent") {
    return { textContent: "" };
  }
  if (kind === "classList") {
    return {
      classList: {
        list: [],
        toggle(cls) {
          const i = this.list.indexOf(cls);
          if (i >= 0) this.list.splice(i, 1);
          else this.list.push(cls);
        },
      },
    };
  }
  return {};
}

/* ==========================================================================
   «Экзамен» — константы, подбор случайных вопросов, звук победы.
   ========================================================================== */

const EXAM_QUESTION_COUNT = 30;
const EXAM_DURATION_SECONDS = 20 * 60;

function formatExamTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sampleExamQuestions(count) {
  const pool = ALL_QUESTIONS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function playVictoryChime(soundEnabled = true) {
  if (!soundEnabled) return;
  if (typeof document !== "undefined" && document.hidden) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    // Web Audio недоступен — молча пропускаем звук.
  }
}

/* ==========================================================================
   «Мини-проект: Таймер» — стартовый код для свободной сборки без
   проверки правильности.
   ========================================================================== */

const PROJECT_TIMER_STARTER =
`// Собери таймер: кнопка запускает и останавливает отсчёт
// секунд, а дисплей сверху показывает текущее время.
//
// Доступно:
//   startBtn.addEventListener("click", () => { ... })
//   display.textContent = "..."   — меняет текст на экране
//   setInterval(fn, ms) / clearInterval(id) — как в браузере

let seconds = 0;
let running = false;
let intervalId = null;

startBtn.addEventListener("click", () => {
  running = !running;
  if (running) {
    intervalId = setInterval(() => {
      seconds++;
      display.textContent = seconds + " сек";
    }, 1000);
  } else {
    clearInterval(intervalId);
  }
});
`;

/* ==========================================================================
   «Найди баг» — данные примеров с багом на конкретной строке.
   ========================================================================== */

const BUG_SNIPPETS = [
  {
    id: "map-no-return",
    topic: "map",
    code: `const arr = [1, 2, 3];\n\narr.map(item => {\n  console.log(item);\n});`,
    buggyLine: 2,
    explanation: "map() должен возвращать значение для каждого элемента — здесь колбэк ничего не возвращает (нет return), поэтому результат map — это [undefined, undefined, undefined], который к тому же нигде не сохраняется. Если задача — просто пройтись по массиву, нужен forEach, а не map. Если нужен новый массив — не хватает return.",
    fixed: `const arr = [1, 2, 3];\n\narr.forEach(item => {\n  console.log(item);\n});`,
  },
  {
    id: "queryselector-no-var",
    topic: "DOM",
    code: `document.querySelector(".btn");\n\naddEventListener("click", () => {\n  console.log("clicked");\n});`,
    buggyLine: 0,
    explanation: "Результат querySelector нигде не сохранён — он просто выбрасывается. А addEventListener без указания элемента перед точкой вызывается не на кнопке, а неявно на window (в браузере window — глобальный объект, и его методы доступны без явного window.). В итоге обработчик сработает при клике где угодно на странице, а не только по .btn.",
    fixed: `const btn = document.querySelector(".btn");\n\nbtn.addEventListener("click", () => {\n  console.log("clicked");\n});`,
  },
  {
    id: "assignment-in-if",
    topic: "Условия",
    code: `let x = 5;\n\nif (x = 10) {\n  console.log("x is 10");\n}`,
    buggyLine: 2,
    explanation: "Один знак = — это присваивание, а не сравнение. x = 10 запишет 10 в x и вернёт 10 как значение всего выражения — а 10 truthy, поэтому блок выполнится ВСЕГДА, независимо от того, что было в x раньше. Нужно ===.",
    fixed: `let x = 5;\n\nif (x === 10) {\n  console.log("x is 10");\n}`,
  },
  {
    id: "missing-await",
    topic: "async/await",
    code: `async function loadData() {\n  const result = fetch("/api/data");\n  console.log(result);\n}`,
    buggyLine: 1,
    explanation: "fetch() возвращает Promise, а не сами данные. Без await result — это объект Promise в состоянии pending, а не ответ сервера. console.log(result) покажет 'Promise { <pending> }', а не то, что реально пришло с сервера.",
    fixed: `async function loadData() {\n  const result = await fetch("/api/data");\n  console.log(result);\n}`,
  },
  {
    id: "infinite-loop",
    topic: "Циклы",
    code: `let i = 0;\n\nwhile (i < 5) {\n  console.log(i);\n}`,
    buggyLine: 2,
    explanation: "Внутри цикла i никогда не меняется — нет i++. Условие i < 5 остаётся истинным вечно, и цикл никогда не завершится (вкладка браузера зависнет от бесконечного вывода в консоль).",
    fixed: `let i = 0;\n\nwhile (i < 5) {\n  console.log(i);\n  i++;\n}`,
  },
  {
    id: "typo-length",
    topic: "Строки",
    code: `const word = "JavaScript";\nconsole.log(word.lenght);`,
    buggyLine: 1,
    explanation: "Опечатка: lenght вместо length. Это не выбросит ошибку — просто у строки нет свойства lenght, и JS вернёт undefined вместо реальной длины строки.",
    fixed: `const word = "JavaScript";\nconsole.log(word.length);`,
  },
  {
    id: "switch-fallthrough",
    topic: "switch",
    code: `function getGrade(score) {\n  let result;\n  switch (true) {\n    case score >= 90:\n      result = "A";\n    case score >= 70:\n      result = "B";\n    default:\n      result = "C";\n  }\n  return result;\n}`,
    buggyLine: 4,
    explanation: "После result = \"A\" нет break — выполнение проваливается (fallthrough) в следующий case, не проверяя его условие заново, а затем и в default. Из-за этого getGrade(95) вернёт не 'A', а 'C': присвоятся все три значения по очереди, и результатом останется последнее.",
    fixed: `function getGrade(score) {\n  let result;\n  switch (true) {\n    case score >= 90:\n      result = "A";\n      break;\n    case score >= 70:\n      result = "B";\n      break;\n    default:\n      result = "C";\n  }\n  return result;\n}`,
  },
  {
    id: "const-reassign",
    topic: "const",
    code: `const total = 100;\ntotal = total - 20;\nconsole.log(total);`,
    buggyLine: 1,
    explanation: "const запрещает переприсваивание переменной после объявления. Эта строка бросит TypeError: Assignment to constant variable, и console.log вообще не выполнится.",
    fixed: `let total = 100;\ntotal = total - 20;\nconsole.log(total);`,
  },
  {
    id: "invoke-instead-of-reference",
    topic: "Функции",
    code: `function handleClick() {\n  console.log("clicked!");\n}\n\nbtn.addEventListener("click", handleClick());`,
    buggyLine: 4,
    explanation: "Скобки после handleClick вызывают функцию немедленно, прямо в момент настройки обработчика, а не передают её как ссылку. addEventListener получит то, что handleClick() вернёт (обычно undefined) — и реальный клик по кнопке уже ничего не вызовет.",
    fixed: `function handleClick() {\n  console.log("clicked!");\n}\n\nbtn.addEventListener("click", handleClick);`,
  },
  {
    id: "missing-new",
    topic: "this и классы",
    code: `function User(name) {\n  this.name = name;\n}\n\nconst u = User("Alice");\nconsole.log(u.name);`,
    buggyLine: 4,
    explanation: "Без new функция User выполняется как обычный вызов, а не как конструктор: она не создаёт новый объект и ничего не возвращает (u становится undefined), а this внутри указывает не на новый объект. u.name затем упадёт с TypeError, потому что нельзя прочитать свойство у undefined.",
    fixed: `function User(name) {\n  this.name = name;\n}\n\nconst u = new User("Alice");\nconsole.log(u.name);`,
  },
  {
    id: "off-by-one",
    topic: "Циклы",
    code: `const items = ["a", "b", "c"];\n\nfor (let i = 0; i <= items.length; i++) {\n  console.log(items[i]);\n}`,
    buggyLine: 2,
    explanation: "У массива из 3 элементов индексы 0, 1, 2 — а items.length равен 3. Условие i <= items.length допускает i = 3, а items[3] не существует, поэтому последняя итерация выведет undefined. Нужно строгое <.",
    fixed: `const items = ["a", "b", "c"];\n\nfor (let i = 0; i < items.length; i++) {\n  console.log(items[i]);\n}`,
  },
  {
    id: "missing-return-arrow",
    topic: "Функции",
    code: `const double = (n) => {\n  n * 2;\n};\n\nconsole.log(double(5));`,
    buggyLine: 1,
    explanation: "У стрелочной функции с фигурными скобками { } нет неявного возврата — нужен явный return. Сейчас n * 2 просто вычисляется и никуда не сохраняется, поэтому double(5) вернёт undefined, а не 10.",
    fixed: `const double = (n) => {\n  return n * 2;\n};\n\nconsole.log(double(5));`,
  },
  {
    id: "array-reference-equality",
    topic: "Приведение типов",
    code: `const a = [1, 2, 3];\nconst b = [1, 2, 3];\n\nif (a === b) {\n  console.log("equal");\n} else {\n  console.log("not equal");\n}`,
    buggyLine: 3,
    explanation: "Массивы и объекты сравниваются по ссылке, а не по содержимому. a и b — это два РАЗНЫХ массива с одинаковым содержимым, поэтому a === b всегда false, и в консоль всегда попадёт 'not equal', даже если элементы совпадают один в один.",
    fixed: `const a = [1, 2, 3];\nconst b = [1, 2, 3];\n\nif (JSON.stringify(a) === JSON.stringify(b)) {\n  console.log("equal");\n} else {\n  console.log("not equal");\n}`,
  },
  {
    id: "global-leak",
    topic: "var и hoisting",
    code: `function setCount() {\n  count = 10;\n}\n\nsetCount();\nconsole.log(count);`,
    buggyLine: 1,
    explanation: "Здесь нет let/const/var — count объявляется случайно, как глобальная переменная (в нестрогом режиме браузер это тихо позволяет). Код 'работает' и печатает 10, но это скрытая утечка в глобальную область: другой код, использующий имя count, может неожиданно сломаться. В строгом режиме ('use strict') или в модулях эта строка вместо этого бросит ReferenceError.",
    fixed: `function setCount() {\n  let count = 10;\n  return count;\n}\n\nconsole.log(setCount());`,
  },
  {
    id: "lost-this-binding",
    topic: "this и классы",
    code: `const counter = {\n  count: 0,\n  increment() {\n    this.count++;\n  },\n};\n\nsetTimeout(counter.increment, 1000);`,
    buggyLine: 7,
    explanation: "counter.increment передаётся как голая ссылка на функцию, оторванная от counter. Когда setTimeout вызовет её через секунду, this внутри будет уже не counter, а глобальный объект — увеличится (точнее, испортится в NaN) какое-то глобальное значение, а не counter.count.",
    fixed: `const counter = {\n  count: 0,\n  increment() {\n    this.count++;\n  },\n};\n\nsetTimeout(() => counter.increment(), 1000);`,
  },
];

const BUG_SHUFFLED = shuffleValues(BUG_SNIPPETS, "find-the-bug");

/* ==========================================================================
   Пошаговый отладчик — самодельный мини-парсер JS (без AST-библиотек):
   разбивает код на операторы, вставляет вызов __dbgSnap(строка, {vars})
   после каждого простого оператора и внутри каждой ветки if/цикла —
   так UI может листать готовый массив "снимков" состояния переменных
   по шагам, без необходимости реально приостанавливать выполнение.
   ========================================================================== */

const TERM_PRONUNCIATIONS = {
  ".includes()": "dot includes",
  ".length": "dot length",
  ".then()": "dot then",
  "DOM": "D O M",
  "Object.assign(target, ...sources)": "Object dot assign",
  "Object.entries(obj)": "Object dot entries",
  "Object.freeze(obj)": "Object dot freeze",
  "Object.keys(obj)": "Object dot keys",
  "Object.values(obj)": "Object dot values",
  "Promise (промис)": "Promise",
  "addEventListener": "add event listener",
  "async": "async",
  "await": "await",
  "camelCase": "camel case",
  "classList.toggle()": "class list dot toggle",
  "confirm()": "confirm",
  "console.log()": "console dot log",
  "const": "const",
  "extends": "extends",
  "fetch": "fetch",
  "filter": "filter",
  "for...in": "for in",
  "for...of": "for of",
  "forEach": "for each",
  "immutable (неизменяемость)": "immutable",
  "let": "let",
  "map": "map",
  "nullish coalescing (??)": "nullish coalescing",
  "optional chaining (?.)": "optional chaining",
  "push/pop": "push, pop",
  "querySelector": "query selector",
  "reduce": "reduce",
  "rest-параметр (...)": "rest parameter",
  "slice": "slice",
  "sort": "sort",
  "splice": "splice",
  "spread (...)": "spread",
  "spread у объектов { ...obj }": "spread",
  "style.backgroundColor": "style dot background color",
  "textContent": "text content",
  "this": "this",
  "undefined / null": "undefined, null",
  "var": "var",
  "класс (class)": "class",
  "конструктор (constructor)": "constructor",
  "обработчик события (event listener)": "event listener",
  "префикс is/has/can для булевых значений": "is, has, can",
  "строка (string)": "string",
  "шаблонная строка (template literal)": "template literal",
  "экземпляр (instance)": "instance",
};

let cachedEnglishVoice = null;
let voiceSearchAttempted = false;

/**
 * Ищет лучший доступный английский голос среди системных — сначала
 * специально помеченные "естественные"/облачные голоса (обычно куда
 * менее роботизированные, чем локальный голос по умолчанию), потом
 * любой en-US/en-GB, и только в крайнем случае — что найдётся с en.
 */
function pickBestEnglishVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const byPriority = [
    (v) => /google/i.test(v.name) && /en-US|en_US/i.test(v.lang + v.name),
    (v) => /natural|neural|enhanced|premium/i.test(v.name) && /^en/i.test(v.lang),
    (v) => v.localService === false && /^en/i.test(v.lang),
    (v) => /^en-US$/i.test(v.lang),
    (v) => /^en-GB$/i.test(v.lang),
    (v) => /^en/i.test(v.lang),
  ];
  for (const test of byPriority) {
    const found = voices.find(test);
    if (found) return found;
  }
  return null;
}

/**
 * Проговаривает переданный текст английским голосом. Голос ищется один
 * раз и кэшируется — getVoices() у части браузеров грузит список
 * асинхронно, поэтому если список ещё пуст при самом первом вызове,
 * подписываемся на voiceschanged и пробуем снова.
 */
function speakTerm(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // прерываем предыдущую озвучку, если ещё не закончилась
  const utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.92; // чуть медленнее обычного — термин легче разобрать на слух
  utter.pitch = 1;
  if (!cachedEnglishVoice && !voiceSearchAttempted) {
    cachedEnglishVoice = pickBestEnglishVoice();
    if (!cachedEnglishVoice && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        () => { cachedEnglishVoice = pickBestEnglishVoice(); },
        { once: true }
      );
    }
    voiceSearchAttempted = true;
  }
  if (cachedEnglishVoice) utter.voice = cachedEnglishVoice;
  window.speechSynthesis.speak(utter);
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

/**
 * @param {{count: number}|null} streak
 * @returns {Promise<boolean>}
 */
async function shouldOfferPwaInstall(streak) {
  if (typeof window === "undefined") return false;
  const isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (isStandalone) return false;
  if (!streak || streak.count < 2) return false;
  try {
    const res = await safeStorage.get(PWA_INSTALL_DISMISSED_KEY);
    if (res && res.value === "1") return false;
  } catch {
    // нет данных — считаем, что ещё не отказывались
  }
  return true;
}

async function dismissPwaInstallOffer() {
  await safeStorage.set(PWA_INSTALL_DISMISSED_KEY, "1");
}

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
    tx.objectStore(REMINDER_STORE).put(new Date().toISOString().slice(0, 10), "lastActiveDate");
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

/**
 * @param {Object} stats - { certName, rank, xp, streakCount, overallPct, achievementsUnlocked, achievementsTotal }
 * @returns {string} относительный URL вида "share.html?d=..."
 */
function buildShareUrl(stats) {
  const compact = {
    n: stats.certName || "",
    r: stats.rank,
    x: stats.xp,
    s: stats.streakCount || 0,
    p: stats.overallPct,
    a: stats.achievementsUnlocked,
    t: stats.achievementsTotal,
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  return `share.html?d=${encoded}`;
}

/**
 * @param {string} encoded - значение параметра ?d= из URL
 * @returns {Object|null} расшифрованные данные, или null если ссылка повреждена
 */
function decodeShareData(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const compact = JSON.parse(json);
    return {
      certName: compact.n || "",
      rank: compact.r,
      xp: compact.x,
      streakCount: compact.s,
      overallPct: compact.p,
      achievementsUnlocked: compact.a,
      achievementsTotal: compact.t,
    };
  } catch {
    return null;
  }
}
