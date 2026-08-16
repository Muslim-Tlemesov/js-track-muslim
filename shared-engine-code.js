/* ==========================================================================
   pages/shared/engine-code.js — движок выполнения пользовательского
   кода: защита от бесконечных циклов, замена "умных" кавычек с
   мобильной клавиатуры, запуск в Web Worker с таймаутом (либо
   синхронно как запасной путь), сверка вывода console.log с ожидаемым.
   ========================================================================== */

function logsMatch(actualLogs, expectedLogs) {
  const trimJoin = (arr) => (arr || []).map((l) => l.trim()).join("\n");
  return trimJoin(actualLogs) === trimJoin(expectedLogs);
}

function formatArg(a) {
  if (typeof a === "string") return a;
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

const MAX_LOOP_ITERATIONS = 100000;

/**
 * Мобильные клавиатуры (в основном Gboard на Android, «умная
 * пунктуация») могут молча заменить последовательности вроде ">=" на
 * юникод-символ "≥", даже когда студент физически набрал два обычных
 * символа. autoCorrect="off" на textarea (см. CodeEditor) должен это
 * предотвращать, но не все клавиатуры полностью его слушаются для
 * подстановки символов — это отдельная категория от orthographic
 * autocorrect. Используется и в checkSyntaxError (живая проверка), и в
 * runUserCodeSync/buildWorkerSource (на случай, если студент нажал
 * "Выполнить" раньше debounce'а живой проверки, или вставил код из
 * буфера обмена) — без неё была бы голая ошибка "Unexpected token '≤'"
 * вместо понятного объяснения, что вообще произошло.
 */
const MOBILE_KEYBOARD_SUBSTITUTES = {
  "≥": ">=",
  "≤": "<=",
  "≡": "===",
  "≠": "!==",
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2026": "...",
};

/**
 * Best-effort защита от случайных бесконечных циклов (typo вроде i--
 * вместо i++, забытое обновление счётчика). Оборачивает счётчиком
 * итераций только УСЛОВИЕ while(...) и C-style for(;;) — не тело
 * цикла. Тело сознательно не трогаем: искать его парную "}" надёжно
 * невозможно без полноценного парсера JS (произвольная вложенность
 * скобок), а ложное срабатывание там сломало бы синтаксически верный
 * код новичка — хуже, чем вообще не защищать.
 *
 * for...of / for...in не трогаются — они естественно ограничены
 * размером перебираемой коллекции.
 *
 * Строки, шаблонные литералы и комментарии пропускаются как непрозрачные
 * блоки, чтобы текст вида "while (x)" внутри строки не приняли за цикл.
 * Регулярные выражения (/.../ ) не разбираются отдельно — на коротких
 * учебных сниппетах этого разумного упрощения достаточно; при любой
 * неопределённости функция ничего не меняет, а не рискует сломать код.
 */
/**
 * ИЗВЕСТНОЕ АРХИТЕКТУРНОЕ ОГРАНИЧЕНИЕ (осознанно принятое, не забытый
 * баг): transformLoops() ниже — самодельный посимвольный сканер, а не
 * настоящий AST-парсер (Acorn/Babel parser/Esprima). Для большинства
 * реального кода студентов этого достаточно (проверено: вложенные
 * скобки и тернарники внутри заголовка for — включая вызовы функций
 * со строками, содержащими "(" и ")" — распознаются верно). Но
 * НАЙДЕН и ПОДТВЕРЖДЁН конкретный пробел: цикл, спрятанный внутри
 * ${...}-выражения шаблонной строки, сканер не видит вообще —
 * бэктик-литералы пропускаются целиком как непрозрачный текст:
 *
 *   `${(function(){ while(true){} })()}`   — guard НЕ добавляется
 *
 * Сознательно НЕ переписано на настоящий AST-парсер (обсуждалось и
 * отклонено): почти весь пользовательский код теперь и так уходит в
 * Web Worker (см. runUserCodeInWorker) с внешним "сторожем" —
 * WORKER_EXECUTION_TIMEOUT_MS с последующим worker.terminate().
 * Это НАСТОЯЩИЙ отдельный OS-поток — terminate() убивает его извне
 * независимо от того, что происходит внутри синхронно, в отличие от
 * попытки прервать код на ТОМ ЖЕ потоке (что в JS в принципе
 * невозможно). Поэтому даже полный провал transformLoops() на каком-
 * то экзотическом коде не оставляет пользователя с зависшей вкладкой
 * навсегда — максимум на WORKER_EXECUTION_TIMEOUT_MS.
 *
 * Единственное место, где этой подстраховки НЕТ — синхронный путь с
 * extraArgs (замыкания на реальный React-state, см. "Мини-проект" в
 * project.jsx) — там Worker принципиально невозможен (замыкания не
 * пересекают границу postMessage), а значит и внешний terminate() не
 * применить. Риск признан приемлемым: этот путь работает с
 * фиксированным простым стартовым кодом (таймер на addEventListener/
 * setInterval), а не с произвольным кодом студента без ограничений.
 */
function injectLoopGuard(code) {
  try {
    return transformLoops(code);
  } catch {
    return code;
  }
}

function transformLoops(src) {
  let out = "";
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    // строки/шаблонные литералы — копируем как есть, не заглядывая внутрь
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }

    // однострочные и блочные комментарии — тоже не трогаем
    if (ch === "/" && src[i + 1] === "/") {
      let j = src.indexOf("\n", i);
      if (j === -1) j = n;
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      let j = src.indexOf("*/", i + 2);
      j = j === -1 ? n : j + 2;
      out += src.slice(i, j);
      i = j;
      continue;
    }

    const rest = src.slice(i);
    const whileMatch = /^while\s*\(/.exec(rest);
    const forMatch = !whileMatch && /^for\s*\(/.exec(rest);
    const isWordBefore = i > 0 && /[A-Za-z0-9_$]/.test(src[i - 1]);

    if ((whileMatch || forMatch) && !isWordBefore) {
      const kw = whileMatch ? "while" : "for";
      const openParenIdx = src.indexOf("(", i + kw.length);
      const closeParenIdx = findMatchingParen(src, openParenIdx);
      if (closeParenIdx === -1) {
        // не нашли парную скобку (не должно случаться на валидном JS,
        // но на всякий случай не рискуем) — копируем ключевое слово как есть
        out += kw;
        i += kw.length;
        continue;
      }
      const header = src.slice(openParenIdx + 1, closeParenIdx);
      const newHeader = kw === "while" ? guardCondition(header) : guardForHeader(header);
      out += kw + "(" + newHeader + ")";
      i = closeParenIdx + 1;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

function findMatchingParen(src, openIdx) {
  let depth = 0;
  for (let k = openIdx; k < src.length; k++) {
    const c = src[k];
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      k++;
      while (k < src.length) {
        if (src[k] === "\\") { k += 2; continue; }
        if (src[k] === quote) break;
        k++;
      }
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

function guardCondition(cond) {
  const trimmed = cond.trim();
  if (trimmed === "") return "__jsTrackLoopGuard()";
  return `__jsTrackLoopGuard() && (${cond})`;
}

// разбивает заголовок C-style for на 3 части по верхнеуровневым ';'
// (не внутри скобок/строк) — если частей не 3, это for...of/for...in
// или что-то нестандартное, и мы его не трогаем
function guardForHeader(header) {
  const parts = splitTopLevel(header, ";");
  if (parts.length !== 3) return header;
  const [init, cond, update] = parts;
  return `${init};${guardCondition(cond)};${update}`;
}

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let k = 0; k < str.length; k++) {
    const c = str[k];
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      k++;
      while (k < str.length) {
        if (str[k] === "\\") { k += 2; continue; }
        if (str[k] === quote) break;
        k++;
      }
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === sep && depth === 0) {
      parts.push(str.slice(start, k));
      start = k + 1;
    }
  }
  parts.push(str.slice(start));
  return parts;
}

/**
 * Реально выполняет JS-код пользователя (через new Function) и
 * перехватывает вызовы console.log. extraArgs позволяет передать
 * в код именованные «живые» объекты (button/card/title/el) для
 * DOM-песочницы. Перед выполнением код проходит через injectLoopGuard —
 * best-effort защиту от случайных бесконечных циклов (см. комментарий выше).
 *
 * @param {string} code
 * @param {Object<string, any>} [extraArgs]
 * @returns {{logs: string[], error: string|null}}
 */
/**
 * Синхронная реализация — используется ТОЛЬКО когда в extraArgs есть
 * «живые» объекты (DOM-подобные button/card/title/el для liveKind-
 * вопросов, или display/startBtn в Мини-проекте): Worker не имеет
 * доступа к DOM и не может держать такие объекты — их нельзя передать
 * через postMessage (structured clone не поддерживает DOM-узлы и
 * объекты с геттерами/сеттерами, завязанными на React state).
 */
async function runUserCodeSync(code, extraArgs = {}) {
  const logs = [];
  // Та же проверка, что и в checkSyntaxError (см. подробный комментарий
  // там) — здесь нужна ОТДЕЛЬНО на случай, если студент нажал
  // "Выполнить" раньше, чем сработал debounce живой проверки синтаксиса
  // (500мс), или вставил код из буфера обмена. Без неё тут была бы
  // голая ошибка вида "Unexpected token '≤'" вместо понятного объяснения.
  for (const [wrong, right] of Object.entries(MOBILE_KEYBOARD_SUBSTITUTES)) {
    if (code.includes(wrong)) {
      return { logs, error: `клавиатура заменила «${right}» на символ «${wrong}» — удали его и введи «${right}» вручную, по одному символу` };
    }
  }
  const fakeConsole = {
    log: (...args) => logs.push(args.map(formatArg).join(" ")),
  };
  const guardPrelude =
    `let __jsTrackLoopCount = 0;\n` +
    `function __jsTrackLoopGuard() {\n` +
    `  if (++__jsTrackLoopCount > ${MAX_LOOP_ITERATIONS}) {\n` +
    `    throw new Error('Слишком много итераций — похоже на бесконечный цикл. Проверь условие выхода.');\n` +
    `  }\n` +
    `  return true;\n` +
    `}\n`;
  const guardedCode = guardPrelude + injectLoopGuard(code);
  // Опасные глобальные имена затеняются как undefined-параметры — этот
  // путь выполняется на ГЛАВНОМ потоке (Мини-проект с замыканиями на
  // React-state, или запасной вариант в очень старых браузерах без
  // Worker), поэтому здесь реальная вкладка со своим DOM, а не
  // изолированный воркер. Реальный найденный пробел: раньше
  // затенялись только postMessage/fetch/... (актуально и для воркера
  // тоже), но НЕ window/document/location/navigator/localStorage/
  // indexedDB/alert — код студента мог напрямую переписать
  // document.body.innerHTML всей страницы, дёрнуть localStorage.clear()
  // (стерев прогресс МИМО resetAllProgress) или location.href
  // (увести со страницы). Это не классическая XSS (код вводит сам
  // пользователь, атаковать других им нельзя), но для учебной
  // песочницы — реальная дыра в изоляции, не только неаккуратность:
  // случайно написанный document.body.innerHTML = "" в песочнице
  // стирал бы всё приложение с экрана, а не просто "не сработал бы".
  const dangerousNames = [
    "postMessage", "fetch", "XMLHttpRequest", "importScripts", "close", "WebSocket",
    "window", "document", "location", "navigator", "localStorage", "sessionStorage",
    "indexedDB", "alert", "confirm", "prompt", "history", "top", "parent", "frames", "opener",
  ];
  // Мини-проект передаёт СВОИ setInterval/clearInterval через extraArgs
  // (обёрнутые вокруг реального React setState для живого таймера) —
  // если так, уважаем это и НЕ подключаем отслеживаемые таймеры поверх
  // (иначе конфликт имён параметров, и вдобавок там таймер ДОЛЖЕН
  // продолжать тикать после возврата из этой функции, а не завершиться
  // по MAX_ASYNC_WAIT_MS). Отслеживание нужно только там, где никто
  // другой не распоряжается setTimeout/setInterval — обычные code-
  // вопросы, "Консоль", экзамен.
  const hasCustomTimers = "setTimeout" in extraArgs || "setInterval" in extraArgs;
  let tracked = null;
  const timerNames = [];
  const timerValues = [];
  if (!hasCustomTimers) {
    tracked = createTrackedTimers(setTimeout, clearTimeout, setInterval, clearInterval);
    timerNames.push("setTimeout", "clearTimeout", "setInterval", "clearInterval");
    timerValues.push(tracked.trackedSetTimeout, tracked.trackedClearTimeout, tracked.trackedSetInterval, tracked.trackedClearInterval);
  }
  const argNames = ["console", ...dangerousNames, ...timerNames, ...Object.keys(extraArgs)];
  const argValues = [fakeConsole, ...dangerousNames.map(() => undefined), ...timerValues, ...Object.values(extraArgs)];
  try {
    // Оборачиваем тело в async IIFE — иначе "await" на верхнем уровне
    // кода студента (ровно то, чему учит раздел курса про
    // асинхронность: `await new Promise(r => setTimeout(r, 200));
    // console.log('done');` без обёртки в отдельную async-функцию) был
    // бы синтаксической ошибкой: обычная функция, созданная через
    // new Function(...), никогда не бывает async сама по себе. Заодно
    // это упрощает обработку ошибок — синхронный throw внутри такого
    // IIFE становится отклонённым промисом, так что await fn(...) ниже
    // ловит и синхронные, и асинхронные ошибки одним и тем же catch.
    // eslint-disable-next-line no-new-func
    const fn = new Function(...argNames, `return (async () => {\n${guardedCode}\n})();`);
    await fn(...argValues);
    if (tracked) {
      const { timedOut } = await waitForPendingTimers(tracked.getPending, MAX_ASYNC_WAIT_MS, ASYNC_POLL_INTERVAL_MS, setTimeout);
      if (timedOut) {
        return { logs, error: `Код выполняется дольше ${MAX_ASYNC_WAIT_MS / 1000} секунд (есть незавершённый setTimeout/setInterval с большой задержкой) — вывод мог оказаться неполным.` };
      }
    }
    return { logs, error: null };
  } catch (e) {
    return { logs, error: e.message };
  }
}

/* ============================================================
   ВЫПОЛНЕНИЕ КОДА В WEB WORKER
   ============================================================
   Раньше весь код пользователя (включая случайный `while (true) {}`)
   выполнялся синхронно на главном потоке — единственной защитой был
   best-effort счётчик итераций (injectLoopGuard), который всё равно
   блокирует UI до срабатывания, а если инструментация не распознала
   какую-то конструкцию цикла — зависает насовсем, без единого способа
   прервать выполнение (JS-поток нельзя прервать снаружи).

   Web Worker решает обе проблемы: выполнение идёт в отдельном потоке
   (UI не блокируется вообще), и его в любой момент можно принудительно
   остановить через worker.terminate() — настоящий "выключатель", а не
   просто счётчик, надеющийся поймать цикл вовремя.

   Ограничение: Worker не видит DOM и не может получить объекты с
   геттерами/сеттерами, завязанными на React state (structured clone
   их не пропустит) — поэтому используется ТОЛЬКО когда extraArgs
   пустой. Все 4 liveKind DOM-вопроса и Мини-проект (там тоже передаются
   псевдо-DOM объекты) по-прежнему выполняются синхронно на главном
   потоке через runUserCodeSync — это небольшой курируемый набор
   заданий, а не произвольный код, так что риск там ниже.
   ============================================================ */

const WORKER_EXECUTION_TIMEOUT_MS = 4000; // если Worker не ответил за это время — считаем зависшим и прерываем

// Текст воркера собирается из строковых представлений уже существующих
// чистых функций (.toString()) — они не трогают DOM/window, поэтому
// один в один переносятся в изолированный контекст воркера без
// дублирования логики вручную.
function buildWorkerSource() {
  return `
${formatArg.toString()}
${injectLoopGuard.toString()}
${transformLoops.toString()}
${findMatchingParen.toString()}
${guardCondition.toString()}
${guardForHeader.toString()}
${splitTopLevel.toString()}
${makeLiveObject.toString()}
${createTrackedTimers.toString()}
${waitForPendingTimers.toString()}
const MAX_LOOP_ITERATIONS = ${MAX_LOOP_ITERATIONS};
const MOBILE_KEYBOARD_SUBSTITUTES = ${JSON.stringify(MOBILE_KEYBOARD_SUBSTITUTES)};
const MAX_ASYNC_WAIT_MS = ${MAX_ASYNC_WAIT_MS};
const ASYNC_POLL_INTERVAL_MS = ${ASYNC_POLL_INTERVAL_MS};

self.onmessage = async function (e) {
  const code = e.data.code;
  const liveKind = e.data.liveKind;
  const liveVarName = e.data.liveVarName;
  const logs = [];
  // См. подробный комментарий у checkSyntaxError/runUserCodeSync в
  // основном коде приложения — та же защита нужна и здесь, в воркере,
  // поскольку это основной путь выполнения для обычных code-вопросов,
  // "Консоли" И (после исправления реального найденного бага) для
  // liveKind-вопросов тоже — раньше они принудительно шли в
  // синхронный путь на главном потоке, из-за чего тяжёлая команда без
  // явного цикла (например new Array(1e9).fill(0).map(...)) реально
  // подвешивала вкладку — injectLoopGuard видит только while/for и не
  // ловит такое. "Живой" DOM-объект нельзя передать через postMessage
  // (structured clone не умеет функции-методы), поэтому вместо самого
  // объекта сюда приходит только liveKind/liveVarName (простые строки)
  // — сам объект конструируется здесь же, внутри воркера.
  for (const wrong in MOBILE_KEYBOARD_SUBSTITUTES) {
    if (code.indexOf(wrong) !== -1) {
      self.postMessage({ logs: logs, error: "клавиатура заменила «" + MOBILE_KEYBOARD_SUBSTITUTES[wrong] + "» на символ «" + wrong + "» — удали его и введи «" + MOBILE_KEYBOARD_SUBSTITUTES[wrong] + "» вручную, по одному символу" });
      return;
    }
  }
  const fakeConsole = {
    log: function () {
      const args = Array.prototype.slice.call(arguments);
      logs.push(args.map(formatArg).join(" "));
    },
  };
  const guardPrelude =
    "let __jsTrackLoopCount = 0;\\n" +
    "function __jsTrackLoopGuard() {\\n" +
    "  if (++__jsTrackLoopCount > " + MAX_LOOP_ITERATIONS + ") {\\n" +
    "    throw new Error('Слишком много итераций — похоже на бесконечный цикл. Проверь условие выхода.');\\n" +
    "  }\\n" +
    "  return true;\\n" +
    "}\\n";
  const guardedCode = guardPrelude + injectLoopGuard(code);
  try {
    // Затеняем опасные глобальные имена воркера как undefined-параметры:
    // new Function(...) выполняет тело в ГЛОБАЛЬНОЙ области видимости
    // воркера (не в замыкании этого onmessage), так что код пользователя
    // технически мог бы напрямую обратиться к self.postMessage (подделать
    // наш собственный результат раньше, чем реальный код доработает),
    // fetch/XMLHttpRequest (сетевые запросы из воркера — здесь никаких
    // легитимных сценариев для этого нет, это песочница синтаксиса JS,
    // а не курс по сети), importScripts (загрузка стороннего кода) или
    // close() (сам себя убить). Параметры с этими именами перекрывают
    // одноимённые глобальные переменные ТОЛЬКО внутри тела этой функции —
    // сам воркер продолжает пользоваться ими как обычно (self.postMessage
    // ниже в этом же файле не затронут, это отдельная область видимости).
    const paramNames = ["console", "postMessage", "self", "fetch", "XMLHttpRequest", "importScripts", "close", "WebSocket"];
    // ВАЖНО: paramValues должен иметь ровно столько же элементов, сколько
    // paramNames ДО добавления liveVarName — иначе new Function(...)
    // просто не дошла бы до последнего параметра со значением
    // (все "опасные" имена-заглушки без явного undefined сдвигали бы
    // позицию liveVarName, и внутри пользовательского кода он был бы
    // undefined вместо реального live-объекта).
    const paramValues = [fakeConsole, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
    // Реальный найденный баг (был раньше): фиксированная пауза в 60мс
    // перед postMessage была настроена только под микрозадачи, не под
    // setTimeout/setInterval пользовательского кода — console.log
    // внутри setTimeout(..., 100) никогда бы не попал в logs, хотя код
    // полностью корректен (см. подробный комментарий у runUserCodeSync
    // в основном коде приложения). Здесь та же отслеживаемая замена
    // таймеров, что и там.
    const tracked = createTrackedTimers(setTimeout, clearTimeout, setInterval, clearInterval);
    paramNames.push("setTimeout", "clearTimeout", "setInterval", "clearInterval");
    paramValues.push(tracked.trackedSetTimeout, tracked.trackedClearTimeout, tracked.trackedSetInterval, tracked.trackedClearInterval);
    if (liveKind && liveVarName) {
      paramNames.push(liveVarName);
      paramValues.push(makeLiveObject(liveKind));
    }
    // Async IIFE — тот же приём, что и в runUserCodeSync: даёт
    // top-level await в коде студента (без обёртки в отдельную async-
    // функцию) и приводит синхронный throw к отклонённому промису, так
    // что await ниже ловит и синхронные, и асинхронные ошибки одним catch.
    const fn = new Function(...paramNames, "return (async () => {\\n" + guardedCode + "\\n})();");
    await fn(...paramValues);
    const timerWait = await waitForPendingTimers(tracked.getPending, MAX_ASYNC_WAIT_MS, ASYNC_POLL_INTERVAL_MS, setTimeout);
    if (timerWait.timedOut) {
      self.postMessage({ logs: logs, error: "Код выполняется дольше " + (MAX_ASYNC_WAIT_MS / 1000) + " секунд (есть незавершённый setTimeout/setInterval с большой задержкой) — вывод мог оказаться неполным." });
    } else {
      self.postMessage({ logs: logs, error: null });
    }
  } catch (err) {
    self.postMessage({ logs: logs, error: err.message });
  }
};
`;
}

let workerSourceUrl = null;
function getWorkerSourceUrl() {
  if (!workerSourceUrl) {
    const blob = new Blob([buildWorkerSource()], { type: "application/javascript" });
    workerSourceUrl = URL.createObjectURL(blob);
  }
  return workerSourceUrl;
}

// Ссылка на активный воркер — нужна, чтобы явно прервать ПРЕДЫДУЩЕЕ
// выполнение, если пользователь запускает код повторно до того, как
// предыдущий запуск успел ответить (быстрый повторный клик "Выполнить").
let activeCodeWorker = null;

function terminateActiveCodeWorker() {
  if (activeCodeWorker) {
    activeCodeWorker.terminate();
    activeCodeWorker = null;
  }
}

/**
 * Выполняет код в Web Worker и возвращает Promise<{logs, error}> — тот
 * же формат результата, что и у runUserCodeSync, так что вызывающему
 * коду не важно, каким путём код на самом деле выполнился.
 */
function runUserCodeInWorker(code, liveKind = null, liveVarName = null) {
  return new Promise((resolve) => {
    terminateActiveCodeWorker();
    let worker;
    try {
      worker = new Worker(getWorkerSourceUrl());
    } catch {
      // Worker не удалось создать (очень старый браузер, ограничения
      // окружения) — откатываемся на синхронное выполнение. Если это
      // liveKind-вопрос, нужно и здесь построить живой объект тем же
      // способом, что и в основном синхронном пути.
      const extraArgs = liveKind && liveVarName ? { [liveVarName]: makeLiveObject(liveKind) } : {};
      resolve(runUserCodeSync(code, extraArgs));
      return;
    }
    activeCodeWorker = worker;

    const timeoutId = setTimeout(() => {
      worker.terminate();
      if (activeCodeWorker === worker) activeCodeWorker = null;
      resolve({ logs: [], error: "Код выполняется слишком долго — похоже на бесконечный цикл. Выполнение прервано." });
    }, WORKER_EXECUTION_TIMEOUT_MS);

    worker.onmessage = (e) => {
      clearTimeout(timeoutId);
      worker.terminate();
      if (activeCodeWorker === worker) activeCodeWorker = null;
      resolve(e.data);
    };

    worker.onerror = (err) => {
      clearTimeout(timeoutId);
      worker.terminate();
      if (activeCodeWorker === worker) activeCodeWorker = null;
      resolve({ logs: [], error: err.message || "Ошибка выполнения кода." });
    };

    worker.postMessage({ code, liveKind, liveVarName });
  });
}

/**
 * Реально выполняет JS-код пользователя и перехватывает вызовы
 * console.log. extraArgs позволяет передать в код именованные «живые»
 * объекты (button/card/title/el для DOM-песочницы, display/startBtn
 * для Мини-проекта) — если он непустой, выполнение идёт синхронно на
 * главном потоке (см. runUserCodeSync), потому что такие объекты
 * нельзя передать в Worker. Если extraArgs пустой (обычные code-
 * вопросы, свободная «Консоль», экзамен) — выполнение уходит в Worker,
 * не блокируя UI и с возможностью принудительно прервать зависший код.
 *
 * ВСЕГДА возвращает Promise<{logs, error}> — единообразно для обоих
 * путей, чтобы вызывающему коду не нужно было знать, как именно код
 * выполнился на этот раз.
 *
 * РЕАЛЬНЫЙ НАЙДЕННЫЙ БАГ (был раньше): вместо этого здесь стояла
 * фиксированная пауза в 60мс ("ASYNC_FLUSH_DELAY_MS"), настроенная
 * только под МИКРОзадачи — простые async/await-цепочки вроде
 * `async function f() { const x = await Promise.resolve(1); console.log(x); }`
 * (этого достаточно, они планируются "сразу после" синхронного кода),
 * но НЕ под МАКРОзадачи: код студента вида
 * `setTimeout(() => console.log('готово'), 100)` или
 * `await new Promise(r => setTimeout(r, 200)); console.log('done');`
 * (ровно то, чему учит раздел курса про асинхронность) завершался бы
 * ПОЗЖЕ, чем через 60мс — console.log внутри колбэка просто НЕ попадал
 * бы в результат, хотя код полностью корректен. Приложение говорило
 * бы студенту "неверно", хотя он прав.
 *
 * Исправлено: setTimeout/setInterval/clearTimeout/clearInterval
 * ЗАТЕНЯЮТСЯ отслеживаемыми обёртками (см. createTrackedTimers ниже)
 * — вместо гадания с фиксированной паузой код реально ЖДЁТ, пока все
 * запланированные таймеры отработают (или явно очищены), опрашивая
 * состояние с шагом ASYNC_POLL_INTERVAL_MS, но не дольше
 * MAX_ASYNC_WAIT_MS суммарно — если студент забыл clearInterval или
 * поставил заведомо огромную задержку, ждать вечно тоже не будем.
 *
 * @param {string} code
 * @param {Object<string, any>} [extraArgs]
 * @returns {Promise<{logs: string[], error: string|null}>}
 */
const MAX_ASYNC_WAIT_MS = 3000;
const ASYNC_POLL_INTERVAL_MS = 30;

/**
 * Создаёт отслеживаемые обёртки над setTimeout/setInterval — считает,
 * сколько таймеров сейчас "в ожидании" (запланированы, но ещё не
 * сработали и не очищены явно). setInterval считается "в ожидании"
 * до явного clearInterval — если код никогда его не вызывает, счётчик
 * никогда не дойдёт до нуля сам, и waitForPendingTimers остановится
 * по MAX_ASYNC_WAIT_MS, а не будет ждать бесконечно.
 */
function createTrackedTimers(realSetTimeout, realClearTimeout, realSetInterval, realClearInterval) {
  let pending = 0;
  const timeoutIds = new Set();
  const intervalIds = new Set();
  const trackedSetTimeout = (fn, delay, ...args) => {
    pending++;
    const id = realSetTimeout(() => {
      pending--;
      timeoutIds.delete(id);
      fn(...args);
    }, delay);
    timeoutIds.add(id);
    return id;
  };
  const trackedClearTimeout = (id) => {
    if (timeoutIds.has(id)) { pending--; timeoutIds.delete(id); }
    realClearTimeout(id);
  };
  const trackedSetInterval = (fn, delay, ...args) => {
    pending++;
    const id = realSetInterval(fn, delay, ...args);
    intervalIds.add(id);
    return id;
  };
  const trackedClearInterval = (id) => {
    if (intervalIds.has(id)) { pending--; intervalIds.delete(id); }
    realClearInterval(id);
  };
  return {
    trackedSetTimeout, trackedClearTimeout, trackedSetInterval, trackedClearInterval,
    getPending: () => pending,
  };
}

/**
 * Ждёт, пока getPending() не вернёт 0 (все таймеры пользовательского
 * кода отработали или явно очищены), но не дольше maxWaitMs суммарно.
 * setTimeout здесь — НАСТОЯЩИЙ, снаружи песочницы, не тот, что видит
 * код студента (тот уже переопределён на trackedSetTimeout выше).
 *
 * Возвращает { timedOut } — РЕАЛЬНЫЙ найденный нюанс: раньше при
 * исчерпании maxWaitMs результат фиксировался как обычный успех
 * (error: null) с тем, что успело накопиться в logs — код студента с
 * setTimeout(..., 5000) при пороге в 3 секунды выглядел бы как "готово,
 * но пустой вывод" вместо честного "не успели дождаться". Это не
 * значит, что код неверный — просто задержка больше, чем мы готовы
 * ждать при проверке. Вызывающий код (runUserCodeSync/воркер)
 * использует timedOut, чтобы вернуть понятную ошибку вместо ложного
 * "успеха".
 */
function waitForPendingTimers(getPending, maxWaitMs, pollIntervalMs, realSetTimeout) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      if (getPending() <= 0) {
        resolve({ timedOut: false });
      } else if (Date.now() - start >= maxWaitMs) {
        resolve({ timedOut: true });
      } else {
        realSetTimeout(check, pollIntervalMs);
      }
    }
    realSetTimeout(check, pollIntervalMs);
  });
}

/**
 * @param {string} code
 * @param {Object} [options]
 * @param {Object} [options.extraArgs] - готовые ЖИВЫЕ объекты с
 *   замыканиями на состояние React главного потока (например
 *   "Мини-проект" передаёт setInterval, обёрнутый вокруг реального
 *   setState) — их НЕЛЬЗЯ передать в Worker (structured clone не умеет
 *   сериализовать функции), поэтому наличие extraArgs всегда означает
 *   синхронное выполнение на главном потоке.
 * @param {string} [options.liveKind] - вид "живого" DOM-объекта для
 *   liveKind-вопросов (addEventListener/style/textContent/classList) —
 *   в отличие от extraArgs, это просто СТРОКА, безопасно передаётся в
 *   Worker через postMessage, а сам объект конструируется УЖЕ ВНУТРИ
 *   воркера (см. buildWorkerSource) — реальный найденный баг был в
 *   том, что раньше ЛЮБой liveKind-вопрос принудительно уходил в
 *   синхронный путь на главном потоке, хотя тяжёлая (но без явного
 *   цикла, вроде new Array(1e9).fill(0).map(...)) команда внутри такого
 *   вопроса реально подвешивала вкладку на десятки секунд — ничего не
 *   ловило её, потому что injectLoopGuard видит только while/for.
 * @param {string} [options.liveVarName] - имя переменной для liveKind-объекта
 */
async function runUserCode(code, options = {}) {
  const { extraArgs = {}, liveKind = null, liveVarName = null } = options;
  const hasClosureArgs = Object.keys(extraArgs).length > 0;
  if (hasClosureArgs || typeof Worker === "undefined") {
    // extraArgs с реальными замыканиями (Мини-проект) — обязан остаться
    // на главном потоке; Worker недоступен вообще — тоже единственный
    // оставшийся вариант, несмотря на риск зависания при тяжёлом коде.
    // Внешняя фиксированная пауза здесь больше не нужна — runUserCodeSync
    // теперь сама дожидается пользовательских setTimeout/setInterval
    // (см. её собственный комментарий про исправленный баг с 60мс).
    return runUserCodeSync(code, extraArgs);
  }
  return runUserCodeInWorker(code, liveKind, liveVarName);
}
function checkSyntaxError(code) {
  if (!code || !code.trim()) return null;
  for (const [wrong, right] of Object.entries(MOBILE_KEYBOARD_SUBSTITUTES)) {
    const idx = code.indexOf(wrong);
    if (idx !== -1) {
      const line = code.slice(0, idx).split("\n").length;
      return { line, message: `клавиатура заменила «${right}» на символ «${wrong}» — удали его и введи «${right}» вручную, по одному символу` };
    }
  }
  if (typeof window === "undefined" || !window.Babel) return null;
  try {
    window.Babel.transform(code, { presets: [] });
    return null;
  } catch (e) {
    if (!e.loc) return null; // не синтаксическая ошибка Babel — не наш случай, молчим
    const firstLine = String(e.message).split("\n")[0];
    const message = firstLine.replace(/^unknown:\s*/, "").replace(/\s*\(\d+:\d+\)\s*$/, "");
    return { line: e.loc.line, message };
  }
}

const JS_KEYWORDS =
  "const|let|var|function|return|if|else|for|while|of|in|class|extends|new|this|async|await|true|false|null|undefined|typeof|try|catch|throw|import|export|default|super|break|continue";

function escapeHtml(s) {
  // Экранируем только &, < и > — кавычки НАРОЧНО не экранируются,
  // highlightJs ищет буквальные ' " ` в уже экранированной строке.
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

