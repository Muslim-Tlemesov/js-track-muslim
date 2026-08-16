/* ==========================================================================
   pages/shared/code-worker.js — запуск кода в Web Worker — эмбедит функции из code-runner.js через .toString() в тело воркера.

   Файл 10 из 18, на которые разбит движок (реорганизовано из 6
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

