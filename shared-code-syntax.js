/* ==========================================================================
   pages/shared/code-syntax.js — подсветка синтаксиса (без внешних библиотек), автодополнение, звук верного ответа.

   Файл 8 из 18, на которые разбит движок (реорганизовано из 6
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

const JS_KEYWORDS =
  "const|let|var|function|return|if|else|for|while|of|in|class|extends|new|this|async|await|true|false|null|undefined|typeof|try|catch|throw|import|export|default|super|break|continue";


function escapeHtml(s) {
  // Экранируем только &, < и > — кавычки НАРОЧНО не экранируются,
  // highlightJs ищет буквальные ' " ` в уже экранированной строке.
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


/**
 * ИЗВЕСТНОЕ АРХИТЕКТУРНОЕ ОГРАНИЧЕНИЕ (осознанно принятое, не забытый
 * недостаток): это простая regex-подсветка, не полноценный
 * JS-парсер — обсуждалось, отклонено в пользу CodeMirror/Monaco/Prism/
 * Shiki. Подтверждённые проверкой пробелы: regex-литералы, числовые
 * разделители (1_000_000), bigint (123n) и приватные поля класса
 * (#secret) рендерятся БЕЗ подсветки (просто как обычный текст —
 * не ломаются, не искажаются, только без цвета). Вложенные template
 * literals — единственный случай, где границы строки определяются
 * НЕВЕРНО (средняя часть теряет подсветку). Во ВСЕХ случаях HTML
 * остаётся корректным (все <span> открываются и закрываются как
 * надо) — escapeHtml() отрабатывает безусловно первой строкой, до
 * этой логики, так что степень поломки — чисто косметическая, не
 * влияет на безопасность (см. соседний тест на XSS-нагрузку).
 * Решение оставить как есть: сам курс не учит regex/bigint/приватным
 * полям, эти конструкции могут появиться только в "Консоли"/"Мини-
 * проекте", где студент печатает произвольный код сам.
 */
function highlightJs(code) {
  const escaped = escapeHtml(code);
  const pattern = new RegExp(
    "(//.*$)|(`(?:\\\\.|[^`\\\\])*`|'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\")|(\\b(?:" +
      JS_KEYWORDS +
      ")\\b)|(\\b\\d+(?:\\.\\d+)?\\b)",
    "gm"
  );
  // Цвета — через CSS custom properties (не хекс-значения из объекта
  // темы T) — подсветка автоматически подхватывает смену темы без
  // необходимости повторно рендерить компонент.
  return escaped.replace(pattern, (match, comment, str, kw, num) => {
    if (comment) return `<span style="color:var(--text-dim)">${comment}</span>`;
    if (str) return `<span style="color:var(--success)">${str}</span>`;
    if (kw) return `<span style="color:var(--accent); font-weight:600">${kw}</span>`;
    if (num) return `<span style="color:var(--accent2)">${num}</span>`;
    return match;
  });
}


/* ============================================================
   ПЕРЕИСПОЛЬЗУЕМЫЙ РЕДАКТОР КОДА — номера строк + автодополнение
   ============================================================
   Один общий компонент вместо четырёх независимых копий textarea+pre
   (в вопросах с кодом, мини-проекте, песочнице и экзамене) — чтобы
   номера строк и автодополнение появились везде одинаково, а не
   в одном месте случайно, в другом забыто.

   Автодополнение построено с нуля на голом textarea (у него нет
   браузерного API для этого): позиция курсора в пикселях считается
   не через тяжёлый DOM-миррор, а арифметически — раз шрифт
   моноширинный (JetBrains Mono), ширина одного символа постоянна и
   меряется один раз через canvas.measureText и кэшируется. Строка
   курсора и колонка — просто подсчёт '\n' и длины хвоста до курсора.
   Это заметно дешевле и надёжнее, чем клонировать DOM на каждое
   нажатие клавиши, и для моноширинного шрифта даёт точный результат.
   ============================================================ */

const JS_AUTOCOMPLETE_WORDS = Array.from(new Set([
  // ключевые слова
  "let", "const", "var", "function", "return", "if", "else", "for", "while", "of", "in",
  "class", "extends", "new", "this", "async", "await", "true", "false", "null", "undefined",
  "typeof", "try", "catch", "finally", "throw", "break", "continue", "switch", "case", "default",
  "do", "delete", "static", "get", "set", "super", "import", "export", "instanceof", "void", "yield",
  // консоль
  "console.log", "console.error", "console.warn", "console.table",
  // массивы
  "map", "filter", "reduce", "forEach", "find", "findIndex", "includes", "indexOf", "slice",
  "splice", "push", "pop", "shift", "unshift", "join", "split", "concat", "sort", "reverse",
  "flat", "flatMap", "some", "every", "fill", "Array.from", "Array.isArray",
  // объекты
  "keys", "values", "entries", "Object.keys", "Object.values", "Object.entries", "Object.assign",
  "Object.freeze", "hasOwnProperty",
  // строки
  "toUpperCase", "toLowerCase", "trim", "padStart", "padEnd", "replace", "replaceAll",
  "startsWith", "endsWith", "repeat", "charAt", "toString", "length",
  // промисы / async
  "then", "catch", "finally", "Promise", "Promise.resolve", "Promise.reject", "Promise.all",
  "Promise.race", "fetch",
  // таймеры
  "setTimeout", "setInterval", "clearTimeout", "clearInterval",
  // DOM
  "querySelector", "querySelectorAll", "getElementById", "addEventListener", "removeEventListener",
  "classList", "textContent", "innerHTML", "createElement", "appendChild", "remove", "dataset", "style",
  // числа / математика
  "Math.random", "Math.floor", "Math.ceil", "Math.round", "Math.max", "Math.min", "Math.abs",
  "Math.pow", "Math.sqrt", "parseInt", "parseFloat", "isNaN", "toFixed",
  // глобальные конструкторы
  "Array", "Object", "String", "Number", "Boolean", "Map", "Set", "JSON", "Date",
  "JSON.stringify", "JSON.parse",
]));


const __monoCharWidthCache = {};

function getMonoCharWidth(fontSizePx) {
  if (__monoCharWidthCache[fontSizePx]) return __monoCharWidthCache[fontSizePx];
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontSizePx}px 'JetBrains Mono', monospace`;
    const w = ctx.measureText("0").width || fontSizePx * 0.6;
    __monoCharWidthCache[fontSizePx] = w;
    return w;
  } catch {
    return fontSizePx * 0.6; // разумная оценка, если canvas недоступен
  }
}


// Хвостовой идентификатор перед курсором — то, что человек сейчас
// печатает и для чего ищем подсказки. Точка сама по себе не входит
// в идентификатор (arr.fil → слово "fil", а не "arr.fil") — это и
// используется ниже, чтобы отличить "печатаю после точки" (метод)
// от "печатаю с чистого листа" (что угодно из словаря).
function getAutocompleteWord(value, cursorPos) {
  const before = value.slice(0, cursorPos);
  const m = /[a-zA-Z_$][\w$]*$/.exec(before);
  if (!m) return null;
  const start = cursorPos - m[0].length;
  const afterDot = start > 0 && value[start - 1] === ".";
  return { word: m[0], start, end: cursorPos, afterDot };
}


function getAutocompleteSuggestions(word, afterDot) {
  if (!word || word.length < 1) return [];
  const lower = word;
  const matches = JS_AUTOCOMPLETE_WORDS.filter((cand) => {
    if (afterDot) {
      // после точки предлагаем только "голые" имена методов/свойств
      // (без собственной точки в словаре) — сама точка уже напечатана
      if (cand.includes(".")) return false;
      return cand.startsWith(lower);
    }
    // с чистого листа — сравниваем с любым сегментом словарного слова,
    // чтобы "cons" находило console.log, а "log" тоже находило console.log
    return cand.split(".").some((seg) => seg.startsWith(lower));
  });
  return matches.slice(0, 6);
}


/**
 * Короткий, ненавязчивый "тик" на обычный правильный ответ — с лёгкой
 * случайной вариацией высоты тона, чтобы не звучать одинаково при
 * каждом ответе.
 */
function playCorrectTick(soundEnabled = true) {
  if (!soundEnabled) return;
  if (typeof document !== "undefined" && document.hidden) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const baseFreq = 880;
    const detune = 1 + (Math.random() - 0.5) * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = baseFreq * detune;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
    setTimeout(() => ctx.close(), 300);
  } catch {
    // Web Audio недоступен — молча пропускаем звук.
  }
}
/* ==========================================================================
   pages/shared/engine-features.js — всё остальное: резервное
   копирование прогресса, история обучения и календарь активности,
   тренажёр "Предскажи вывод", помощник для liveKind-вопросов, экзамен,
   стартовый код мини-проекта, примеры для "Найди баг", озвучка
   терминов, установка PWA, напоминания о серии, интервальное
   повторение, публичная ссылка на прогресс. Загружается последним —
   использует функции/данные из всех остальных engine-*.js файлов.
   ========================================================================== */


