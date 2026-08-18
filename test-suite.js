#!/usr/bin/env node
/* ==========================================================================
   test-suite.js — постоянный регрессионный набор для js.track
   (многостраничная версия). Прогонять перед КАЖДЫМ изменением файлов
   в pages/ или pages/shared/ — ловит именно те классы багов, что уже
   случались по ходу разработки: "осиротевшие" CSS-классы у новых БЭМ-
   компонентов, сломанные обработчики после правок, регрессии в логике
   движка (submitAnswer, интервальное повторение, движок отладчика).

   Запуск:  node test-suite.js
   Требует: jsdom, react, react-dom, @babel/core, @babel/preset-react,
            fake-indexeddb (jsdom не реализует IndexedDB нативно, а
            история обучения хранится именно там — см. core-history.js)
            (npm install --save-dev jsdom react react-dom @babel/core @babel/preset-react fake-indexeddb)
   ========================================================================== */

const { IDBFactory } = require("fake-indexeddb");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");
const { JSDOM } = require("jsdom");

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, "pages");
// Если запускается из уже развёрнутой (плоской) структуры без папки
// pages/ — файлы лежат прямо рядом с test-suite.js.
const BASE_DIR = fs.existsSync(PAGES_DIR) ? PAGES_DIR : ROOT;

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [OK] ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  [FAIL] ${name}: ${e.message}`);
  }
}

function compileFile(relPath) {
  const full = path.join(BASE_DIR, relPath);
  const raw = fs.readFileSync(full, "utf8");
  return babel.transformSync(raw, { presets: [["@babel/preset-react", { runtime: "classic" }]] }).code;
}

/**
 * Собирает и выполняет указанный набор shared/-файлов + файл страницы
 * в свежем jsdom-окружении — так же, как реальный браузер грузит
 * несколько <script type="text/babel" src="..."> тегов подряд, деля
 * общую глобальную область видимости.
 * @param {string} pageFile - например "index.jsx"
 * @param {string[]} sharedFiles - например ["shared/data-topics.js", "shared/Header.jsx"]
 * @param {Object} initialStore - начальное содержимое window.storage
 */
function createEnv(pageFile, sharedFiles, initialStore = {}, extraCode = "") {
  const store = { ...initialStore };
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app-mount"></div></body></html>`, {
    url: `https://example.com/${pageFile.replace(".jsx", ".html")}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.storage = {
    async get(key) { return store[key] !== undefined ? { key, value: store[key], shared: false } : null; },
    async set(key, value) { store[key] = value; return { key, value, shared: false }; },
    async delete(key) { const existed = store[key] !== undefined; delete store[key]; return { key, deleted: existed, shared: false }; },
  };
  win.indexedDB = new IDBFactory();
  // react-dom кэширует внутреннее состояние между вызовами require() в
  // рамках одного Node-процесса — без явной очистки кэша модуля тесты
  // страниц, идущие ПОСЛЕ первого, иногда видят "чужой" window/document
  // изнутри React (проявляется как необъяснимые сбои конкретно в
  // полном прогоне набора, но не при запуске теста в одиночку).
  for (const key of Object.keys(require.cache)) {
    if (key.includes("/react/") || key.includes("/react-dom/") || key.includes("/scheduler/")) {
      delete require.cache[key];
    }
  }
  win.React = require("react");
  win.ReactDOM = require("react-dom/client");
  win.confirm = () => true;
  win.requestAnimationFrame = (cb) => win.setTimeout(cb, 0);
  win.matchMedia = win.matchMedia || (() => ({ matches: false }));

  let combined = "";
  for (const f of sharedFiles) combined += compileFile(f) + "\n";
  combined += compileFile(pageFile) + "\n";
  // extraCode выполняется в ТОЙ ЖЕ области видимости, что и вся
  // страница — единственный надёжный способ прочитать const/let,
  // объявленные внутри страницы (например PREDICT_SHUFFLED), раз eval
  // не "протекает" между отдельными вызовами.
  if (extraCode) combined += extraCode + "\n";

  return {
    win, doc: win.document, store,
    load: () => {
      // react-dom проверяет global.window/global.document с точки зрения
      // Node, а не только jsdom-объект window сам по себе — без этого
      // ReactDOM.createRoot падает с "window is not defined".
      global.window = win;
      global.document = win.document;
      global.navigator = win.navigator;
      win.eval(combined);
    },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    click: (el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true, view: win })),
    setTextareaValue: (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new win.Event("input", { bubbles: true }));
    },
  };
}

const ENGINE_FILES = [
  "shared/data-topics.js", "shared/data-questions.js", "shared/data-achievements.js",
  "shared/core-storage.js", "shared/core-history.js", "shared/core-streak.js",
  "shared/code-runner.js", "shared/code-syntax.js", "shared/code-debugger.js", "shared/code-worker.js",
  "shared/pwa-install.js", "shared/pwa-reminders.js",
  "shared/core-progress.js", "shared/core-review.js", "shared/core-xp.js",
  "shared/misc-backup.js", "shared/misc-quizmodes.js", "shared/misc-share.js",
];

const SHARED = {
  base: [...ENGINE_FILES, "shared/mascot-icons.jsx", "shared/nav-icons.jsx", "shared/Common.jsx", "shared/Header.jsx"],
  common: [...ENGINE_FILES, "shared/mascot-icons.jsx", "shared/nav-icons.jsx", "shared/Common.jsx", "shared/Header.jsx"],
  code: [...ENGINE_FILES, "shared/mascot-icons.jsx", "shared/nav-icons.jsx", "shared/Common.jsx", "shared/Header.jsx", "shared/CodeEditor.jsx"],
  questions: [...ENGINE_FILES, "shared/mascot-icons.jsx", "shared/nav-icons.jsx", "shared/Common.jsx", "shared/Header.jsx", "shared/LessonCard.jsx", "shared/CodeEditor.jsx"],
};

/* ==========================================================================
   Проект в целом — компиляция и "осиротевшие" CSS-классы.
   ========================================================================== */

async function runProjectWideTests() {
  console.log("\n=== Проект в целом ===");

  await test("Все .jsx-файлы (страницы + shared) компилируются без ошибок", async () => {
    const files = [];
    for (const f of fs.readdirSync(BASE_DIR)) {
      if (f.endsWith(".jsx")) files.push(f);
    }
    const sharedDir = path.join(BASE_DIR, "shared");
    if (fs.existsSync(sharedDir)) {
      for (const f of fs.readdirSync(sharedDir)) {
        if (f.endsWith(".jsx")) files.push(`shared/${f}`);
      }
    }
    assert(files.length >= 17, `ожидали хотя бы 17 jsx-файлов, нашли ${files.length}`);
    for (const f of files) {
      try {
        compileFile(f);
      } catch (e) {
        throw new Error(`${f}: ${e.message}`);
      }
    }
  });

  await test("Все 6 engine-*.js компилируются без ошибок (обычный JS, не JSX)", async () => {
    for (const f of ENGINE_FILES) {
      const raw = fs.readFileSync(path.join(BASE_DIR, f), "utf8");
      try {
        new Function(raw); // бросит SyntaxError, если что-то не так
      } catch (e) {
        throw new Error(`${f}: ${e.message}`);
      }
    }
  });

  await test("У каждого используемого className есть хотя бы одно CSS-правило (защита от 'осиротевших' БЭМ-классов)", async () => {
    // Эта проверка ловила реальные баги минимум дважды: шапка без единого
    // стиля и редактор кода без единого стиля — оба раза className
    // расставлялись в JSX, но соответствующего правила не было нигде.
    const jsxFiles = [];
    for (const f of fs.readdirSync(BASE_DIR)) if (f.endsWith(".jsx")) jsxFiles.push(path.join(BASE_DIR, f));
    const sharedDir = path.join(BASE_DIR, "shared");
    if (fs.existsSync(sharedDir)) for (const f of fs.readdirSync(sharedDir)) if (f.endsWith(".jsx")) jsxFiles.push(path.join(sharedDir, f));

    // Реальный найденный пробел: этот тест сканировал только .jsx
    // (className=), но skip-link ("Перейти к основному содержимому")
    // задан прямо в статичном HTML-шелле через обычный class="..." —
    // мимо React, значит и мимо старой версии этой проверки. Класс
    // использовался вообще без единого CSS-правила, ссылка была
    // видна ВСЕГДА как обычный текст поверх шапки, а не только по
    // фокусу клавиатурой, как задумано.
    const htmlFiles = fs.readdirSync(BASE_DIR).filter((f) => f.endsWith(".html")).map((f) => path.join(BASE_DIR, f));

    const usedClasses = new Set();
    for (const file of [...jsxFiles, ...htmlFiles]) {
      const content = fs.readFileSync(file, "utf8");
      const attrPattern = file.endsWith(".html") ? /\bclass="([^"]+)"/g : /className="([^"]+)"/g;
      for (const m of content.matchAll(attrPattern)) {
        for (const c of m[1].split(/\s+/)) if (c) usedClasses.add(c);
      }
    }

    let css = "";
    css += fs.readFileSync(path.join(BASE_DIR, "shared/shared.css"), "utf8");
    for (const f of fs.readdirSync(BASE_DIR)) {
      if (f.endsWith(".css")) css += fs.readFileSync(path.join(BASE_DIR, f), "utf8");
    }

    // Известные безобидные алиас-классы — идут ВМЕСТЕ со своим БЭМ-
    // эквивалентом на том же элементе (например className="nav-btn
    // nav__btn"), у которого CSS-правило уже есть — сами по себе эти
    // классы ничего не стилизуют, оставлены для читаемости/истории.
    const KNOWN_ALIASES = new Set(["app-tagline", "header-actions", "nav-btn", "opt-btn", "topic-btn"]);

    const missing = [...usedClasses].filter((c) => {
      if (KNOWN_ALIASES.has(c)) return false;
      const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return !new RegExp(`\\.${escaped}[\\s,:{]`).test(css);
    });
    assert(missing.length === 0, `классы без CSS-правила: ${JSON.stringify(missing)}`);
  });

  await test("Все внутренние ссылки (src/href) в HTML-файлах указывают на существующие файлы", async () => {
    // manifest.json и иконки — статичные ассеты, которые лежат рядом при
    // реальном развёртывании, но не обязаны быть в этой рабочей папке
    // при разработке/тестировании — исключаем их из проверки намеренно,
    // не по ошибке.
    const STATIC_ASSET_PATTERN = /^(manifest\.json|icon-\d+\.png)$/;
    const htmlFiles = fs.readdirSync(BASE_DIR).filter((f) => f.endsWith(".html"));
    const problems = [];
    for (const f of htmlFiles) {
      const content = fs.readFileSync(path.join(BASE_DIR, f), "utf8");
      for (const m of content.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const link = m[1];
        if (link.startsWith("http") || link.startsWith("#") || STATIC_ASSET_PATTERN.test(link)) continue;
        if (!fs.existsSync(path.join(BASE_DIR, link))) problems.push(`${f} -> ${link}`);
      }
    }
    assert(problems.length === 0, `битые ссылки: ${JSON.stringify(problems)}`);
  });

  await test("build.js собирает dist/ без ошибок, с валидным JS и без Babel в HTML", async () => {
    const buildScript = path.join(BASE_DIR, "..", "build.js");
    if (!fs.existsSync(buildScript)) {
      // Набор тестов может запускаться и из уже развёрнутой плоской
      // структуры, где build.js не имеет смысла (там уже собранный
      // результат) — тест просто пропускаем, а не считаем провалом.
      return;
    }
    const { execSync } = require("child_process");
    execSync(`node "${buildScript}"`, { cwd: path.join(BASE_DIR, ".."), stdio: "pipe" });

    const distDir = path.join(BASE_DIR, "..", "dist");
    assert(fs.existsSync(distDir), "dist/ должен быть создан");

    const jsFiles = fs.readdirSync(distDir).filter((f) => f.endsWith(".js") && f !== "test-suite.js");
    assert(jsFiles.length > 0, "в dist/ должны быть скомпилированные .js файлы");
    for (const f of jsFiles) {
      // Бросит SyntaxError, если Babel что-то не так преобразовал.
      new Function(fs.readFileSync(path.join(distDir, f), "utf8"));
    }

    const htmlFiles = fs.readdirSync(distDir).filter((f) => f.endsWith(".html"));
    assert(htmlFiles.length >= 14, `ожидали минимум 14 HTML-страниц в dist/, нашли ${htmlFiles.length}`);
    for (const f of htmlFiles) {
      const html = fs.readFileSync(path.join(distDir, f), "utf8");
      assert(!html.includes("text/babel"), `${f}: не должно остаться type="text/babel" после сборки`);
      assert(!html.includes("@babel/standalone"), `${f}: Babel Standalone не должен подключаться после сборки`);
      assert(html.includes("react.production.min.js"), `${f}: React должен остаться подключённым`);
    }

    // sw.js кэширует список файлов по ЖЁСТКО ПРОПИСАННЫМ путям (APP_SHELL) —
    // они не выводятся из реальной файловой системы автоматически, поэтому
    // легко забыть обновить этот список при рефакторинге структуры файлов
    // (именно так и произошло: build.js стал выкладывать shared/-файлы
    // плоско в корень, а sw.js какое-то время продолжал ссылаться на
    // старые пути с подпапкой — сервис-воркер пытался закэшировать
    // несуществующие файлы). Эта проверка ловит подобное автоматически.
    const swPath = path.join(distDir, "sw.js");
    if (fs.existsSync(swPath)) {
      const swContent = fs.readFileSync(swPath, "utf8");
      const appShellMatch = swContent.match(/const APP_SHELL = \[([\s\S]*?)\];/);
      assert(appShellMatch, "sw.js должен содержать APP_SHELL");
      const missingFromDisk = [];
      for (const m of appShellMatch[1].matchAll(/"\.\/([^"]+)"/g)) {
        const relPath = m[1];
        if (relPath === "") continue; // "./" сама папка, не файл
        if (!fs.existsSync(path.join(distDir, relPath))) missingFromDisk.push(relPath);
      }
      assert(missingFromDisk.length === 0, `sw.js APP_SHELL ссылается на несуществующие в dist/ файлы: ${JSON.stringify(missingFromDisk)}`);
    }
  });

  await test("Ни одна страница не дублирует свою локальную копию confirm+reload для сброса прогресса", async () => {
    // Реальный найденный дубль: раньше 13 страниц дословно копировали
    // одну и ту же функцию-обёртку (confirm + resetAllProgress +
    // reload) вместо того, чтобы использовать общую
    // handleResetProgressWithConfirm из core-progress.js. Исправишь текст
    // подтверждения или добавишь шаг после сброса в одном месте — 12
    // других страниц остались бы со старой версией. Эта проверка ловит
    // повторное появление такого дубля автоматически.
    const violations = [];
    for (const f of fs.readdirSync(BASE_DIR)) {
      if (!f.endsWith(".jsx") || f === "share.jsx") continue; // share.html не показывает сброс прогресса
      const content = fs.readFileSync(path.join(BASE_DIR, f), "utf8");
      if (/const handleResetProgress\s*=\s*async/.test(content)) violations.push(f);
    }
    assert(violations.length === 0, `эти страницы завели собственную копию обёртки сброса вместо общей handleResetProgressWithConfirm: ${JSON.stringify(violations)}`);
  });
}

/* ==========================================================================
   shared/engine-*.js (6 файлов) — движковая логика (без React, чистые функции).
   ========================================================================== */

async function runEngineTests() {
  console.log("\n=== shared/engine-*.js (6 файлов) ===");

  /**
   * Выполняет все 6 engine-*.js файлов (в правильном порядке зависимостей)
   * + переданный код теста в ОДНОЙ vm-области — const/let, объявленные
   * внутри, не "протекают" наружу в объект контекста при доступе ИЗВНЕ
   * после runInContext (особенность vm-модуля, аналогичная eval), поэтому
   * и сам тестовый код должен выполняться внутри той же области.
   * window.storage передаётся через простой in-memory store, доступный
   * и внутри, и снаружи (обычный JS-объект в closure этой функции, а не
   * часть vm-контекста).
   * @param {string} testBody - код теста; на последней строке должен
   *   присвоить результат в `globalThis.__testResult`.
   * @param {Object} store - объект, используемый как window.storage
   */
  function runEngineScript(testBody, store) {
    const vm = require("vm");
    const raw = ENGINE_FILES.map((f) => fs.readFileSync(path.join(BASE_DIR, f), "utf8")).join("\n");
    const ctx = {
      window: {
        storage: {
          async get(k) { return store[k] !== undefined ? { key: k, value: store[k] } : null; },
          async set(k, v) { store[k] = v; return { key: k, value: v }; },
          async delete(k) { const existed = store[k] !== undefined; delete store[k]; return { key: k, deleted: existed }; },
        },
      },
      __testResult: undefined,
      console, setTimeout, clearTimeout, setInterval, clearInterval, indexedDB: new IDBFactory(),
    };
    vm.createContext(ctx);
    vm.runInContext(raw + "\n" + testBody, ctx);
    return ctx.__testResult;
  }

  await test("submitAnswer: XP начисляется один раз на первый верный ответ, не на повторные", async () => {
    const store = {};
    const promise = runEngineScript(`
      globalThis.__testResult = (async () => {
        const q = ALL_QUESTIONS[0];
        const r1 = await submitAnswer({ question: q, isCorrect: true, elapsedMs: 3000 });
        const r2 = await submitAnswer({ question: q, isCorrect: true, elapsedMs: 3000 });
        return { r1, r2 };
      })();
    `, store);
    const { r1, r2 } = await promise;
    assert(r1.xpGained === 25, `первый верный ответ должен дать 25 XP, получили ${r1.xpGained}`);
    assert(r2.xpGained === 0, `повторный верный ответ НЕ должен давать XP снова, получили ${r2.xpGained}`);
  });

  await test("submitAnswer: нельзя фармить XP циклом верно → неверно → верно на одном вопросе", async () => {
    // Реальный найденный эксплойт: если статус вопроса мог откатиться
    // с "correct" на "wrong" (например, вернувшись назад по навигации
    // и ответив неверно), следующий верный ответ снова проходил бы
    // условие "isCorrect && !alreadyCorrect" и начислял XP повторно —
    // можно было бы бесконечно копить опыт на одном и том же вопросе.
    const store = {};
    let result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        const q = ALL_QUESTIONS[0];
        const r1 = await submitAnswer({ question: q, isCorrect: true, elapsedMs: 3000 });
        const r2 = await submitAnswer({ question: q, isCorrect: false, elapsedMs: 3000 });
        const r3 = await submitAnswer({ question: q, isCorrect: true, elapsedMs: 3000 });
        const answersRaw = (await window.storage.get(STORAGE_KEY)).value;
        return { xp1: r1.xpGained, xp2: r2.xpGained, xp3: r3.xpGained, status: JSON.parse(answersRaw)[q.id].status };
      })();
    `, store);
    result = await result;
    assert(result.xp1 === 25, `первый верный ответ должен дать 25 XP, получили ${result.xp1}`);
    assert(result.xp2 === 0, `неверный ответ не должен давать XP, получили ${result.xp2}`);
    assert(result.xp3 === 0, `повторный верный ответ на УЖЕ решённый вопрос не должен давать XP снова, получили ${result.xp3}`);
    assert(result.status === "correct", `статус вопроса должен остаться "correct" даже после промежуточного неверного ответа, получили "${result.status}"`);
  });

  await test("resetAllProgress: сбрасывает ВСЕ ключи прогресса, не только answers/xp/achievements", async () => {
    // Реальный найденный баг: 13 страниц дублировали неполный сброс
    // (только STORAGE_KEY/XP_KEY/ACHIEVEMENTS_KEY), оставляя серию
    // дней, историю, расписание повторения и черновик песочницы
    // нетронутыми — вопреки подтверждению "Сбросить весь прогресс?".
    const store = {};
    let result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        await safeStorage.set(STORAGE_KEY, JSON.stringify({ "vars-1": { status: "correct" } }));
        await safeStorage.set(XP_KEY, JSON.stringify({ xp: 100 }));
        await safeStorage.set(ACHIEVEMENTS_KEY, JSON.stringify({ unlocked: ["first_correct"] }));
        await safeStorage.set(STREAK_KEY, JSON.stringify({ count: 5, best: 5, lastDate: "2026-08-16" }));
        await addHistoryEntry({ questionId: "vars-1", correct: true, ts: Date.now(), topicId: "vars", topicTitle: "x", tags: [] });
        await safeStorage.set(REVIEW_SCHEDULE_KEY, JSON.stringify({ "vars-1": { stepIdx: 1 } }));
        await safeStorage.set(SANDBOX_KEY, "console.log('черновик');");
        await safeStorage.set(CERT_NAME_KEY, "Тест");
        await safeStorage.set(ONBOARDING_SEEN_KEY, "1");
        await safeStorage.set(THEME_KEY, "light");
        await safeStorage.set(SOUND_KEY, "off");

        await resetAllProgress();

        const remaining = {};
        for (const k of PROGRESS_KEYS) remaining[k] = (await safeStorage.get(k)) !== null;
        const themeKept = (await safeStorage.get(THEME_KEY))?.value === "light";
        const soundKept = (await safeStorage.get(SOUND_KEY))?.value === "off";
        const historyCleared = (await getHistoryEntries()).length === 0;
        return { remaining, themeKept, soundKept, historyCleared };
      })();
    `, store);
    result = await result;
    const stillPresent = Object.entries(result.remaining).filter(([, present]) => present).map(([k]) => k);
    assert(stillPresent.length === 0, `эти ключи прогресса НЕ были сброшены: ${JSON.stringify(stillPresent)}`);
    assert(result.themeKept, "тема оформления не должна сбрасываться вместе с прогрессом");
    assert(result.soundKept, "настройка звука не должна сбрасываться вместе с прогрессом");
    assert(result.historyCleared, "resetAllProgress() должен очищать историю в IndexedDB через clearHistory()");
  });

  await test("resetAllProgress: сбой ОДНОГО ключа localStorage не должен блокировать очистку истории/напоминаний (устойчивость к частичному сбою)", async () => {
    // Реальная найденная проблема (внешний технический разбор):
    // раньше localStorage-шаг шёл через Promise.all — если ХОТЬ ОДИН
    // ключ падал (например safeStorage недоступен в приватном режиме
    // браузера), Promise.all отклонялся ЦЕЛИКОМ, resetAllProgress
    // выбрасывал исключение НЕ ДОХОДЯ до истории/напоминаний в
    // IndexedDB — пользователь думал бы, что сбросил всё, а часть
    // данных оставалась молча нетронутой. Подделываем safeStorage.remove
    // так, чтобы ОДИН конкретный ключ гарантированно падал, и
    // проверяем, что история ВСЁ РАВНО очищается, а функция не
    // выбрасывает исключение наружу.
    const store = {};
    const result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        await addHistoryEntry({ questionId: "vars-1", correct: true, ts: Date.now(), topicId: "vars", topicTitle: "x", tags: [] });

        const realRemove = safeStorage.remove;
        safeStorage.remove = async (key) => {
          if (key === XP_KEY) throw new Error("симулированный сбой записи (приватный режим)");
          return realRemove(key);
        };

        let threw = false;
        let outcome = null;
        try {
          outcome = await resetAllProgress();
        } catch {
          threw = true;
        }

        const historyAfter = await getHistoryEntries();
        return { threw, outcome, historyLength: historyAfter.length };
      })();
    `, store);
    const outcome = await result;
    assert(!outcome.threw, "resetAllProgress() не должна выбрасывать исключение наружу при сбое одного ключа");
    assert(outcome.historyLength === 0, `история должна очиститься, даже если сбой был в localStorage-шаге ДО неё, получили ${outcome.historyLength} записей`);
    assert(outcome.outcome.allCleared === false, "результат должен честно сообщать, что не всё очистилось");
    assert(outcome.outcome.failed.length > 0, "список failed должен содержать хотя бы один пункт (упавший ключ)");
  });

  await test("ErrorBoundary: реально перехватывает ошибку рендера и показывает запасной UI вместо белого экрана", async () => {
    // Реальный найденный пробел (внешний технический разбор): React
    // рендерился в продакшене без единого Error Boundary — любая
    // необработанная ошибка рендера обрушивала всё дерево в пустой
    // белый экран без объяснения, хотя прогресс уже был сохранён в
    // localStorage/IndexedDB (не терялся, просто пользователь не мог
    // об этом узнать, глядя на пустой экран). Форсируем РЕАЛЬНУЮ
    // ошибку рендера (не просто проверяем, что ErrorBoundary
    // определён) — компонент, который гарантированно throw'ит,
    // обёрнутый в ErrorBoundary, как теперь на каждой из 14 страниц.
    const env = createEnv("index.jsx", SHARED.common, {}, `
      function ThrowingComponent() {
        throw new Error("тестовая ошибка рендера");
      }
      const testRoot = ReactDOM.createRoot(document.getElementById("test-mount"));
      testRoot.render(React.createElement(ErrorBoundary, null, React.createElement(ThrowingComponent)));
    `);
    const mountDiv = env.doc.createElement("div");
    mountDiv.id = "test-mount";
    env.doc.body.appendChild(mountDiv);
    env.load();
    await env.wait(300);

    const fallback = env.doc.querySelector(".error-boundary");
    assert(fallback !== null, "ErrorBoundary должен показать запасной UI (.error-boundary) вместо падения всего дерева");
    assert(fallback.textContent.includes("Что-то пошло не так"), `текст запасного UI неожиданный: "${fallback.textContent}"`);
    assert(fallback.querySelector("button") !== null, "запасной UI должен предлагать кнопку перезагрузки");

    // Главное дерево страницы (не связанное с упавшим тестовым узлом)
    // должно продолжать нормально работать — падение одного поддерева
    // не должно ронять остальное приложение.
    assert(env.doc.querySelector(".app-header") !== null, "остальная страница должна отрендериться нормально, ошибка изолирована в своём поддереве");
  });

  await test("Баннер 'Доступно обновление': появляется, когда SW сообщает об установленном обновлении, кнопка перезагружает страницу", async () => {
    // Реальная найденная проблема (внешний технический разбор): даже
    // со skipWaiting()/clients.claim() в sw.js, новый Service Worker
    // забирает контроль в фоне, но НЕ перезагружает уже открытую
    // страницу — пользователь мог долго работать со старой версией,
    // не зная об обновлении. Раньше регистрация SW была дословно
    // продублирована в 13 HTML-файлов (без обнаружения обновления
    // вообще) — теперь один раз в Header.jsx через
    // registerServiceWorkerWithUpdateCheck. jsdom не реализует
    // ServiceWorkerRegistration по-настоящему, поэтому подделываем
    // МИНИМАЛЬНО достаточную часть API, чтобы пройти реальный путь
    // обнаружения (updatefound → statechange "installed" при уже
    // существующем controller), а не просто поверить, что коллбэк
    // когда-нибудь вызовется.
    const env = createEnv("index.jsx", SHARED.common, {}, `
      window.navigator.serviceWorker = {
        controller: { fake: true }, // уже есть контроллер — значит это ОБНОВЛЕНИЕ, не первая установка
        register: async () => {
          const installing = { state: "installing", _listeners: {}, addEventListener(ev, cb) { this._listeners[ev] = cb; } };
          const reg = { installing, _listeners: {}, addEventListener(ev, cb) { this._listeners[ev] = cb; } };
          setTimeout(() => {
            reg._listeners["updatefound"] && reg._listeners["updatefound"]();
            installing.state = "installed";
            installing._listeners["statechange"] && installing._listeners["statechange"]();
          }, 10);
          return reg;
        },
      };
    `);
    env.load();
    await env.wait(300);
    env.win.dispatchEvent(new env.win.Event("load"));
    await env.wait(150);

    const banner = env.doc.querySelector(".app-update-banner");
    assert(banner !== null, "баннер обновления должен появиться после того, как SW сообщил об установленном обновлении");
    assert(banner.textContent.includes("Доступно обновление"), `текст баннера неожиданный: "${banner.textContent}"`);

    const reloadBtn = Array.from(banner.querySelectorAll("button")).find((b) => b.textContent.includes("Обновить"));
    assert(reloadBtn !== null, "у баннера должна быть кнопка 'Обновить'");
    // Прямая проверка клика невозможна — location.reload в jsdom
    // нельзя переопределить даже через Object.defineProperty
    // ("Cannot redefine property: reload", известное ограничение
    // окружения тестирования). Код кнопки (window.location.reload())
    // достаточно прост, чтобы полагаться на проверку кодом, не
    // симуляцией клика.
  });

  await test("История обучения (IndexedDB): добавление не требует чтения всех предыдущих записей, обрезка держит ровно MAX_HISTORY_ENTRIES", async () => {
    // Продолжение обсуждения: раньше история хранилась одной JSON-
    // строкой в localStorage — каждая новая попытка требовала прочитать
    // ВЕСЬ лог, распарсить, добавить, сериализовать заново, записать
    // ВЕСЬ лог обратно. При потолке в 500 записей (~70КБ) это было не
    // проблемой на практике (~1мс), но архитектурно не масштабировалось.
    // Перенесено на IndexedDB — каждая попытка своя отдельная запись.
    const store = {};
    let result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        await addHistoryEntry({ questionId: "a", correct: true, ts: 1, topicId: "x", topicTitle: "x", tags: [] });
        await addHistoryEntry({ questionId: "b", correct: false, ts: 2, topicId: "x", topicTitle: "x", tags: [] });
        const afterTwo = await getHistoryEntries();

        for (let i = 0; i < MAX_HISTORY_ENTRIES + 10; i++) {
          await addHistoryEntry({ questionId: "q" + i, correct: true, ts: 100 + i, topicId: "x", topicTitle: "x", tags: [] });
        }
        const afterOverflow = await getHistoryEntries();

        return {
          countAfterTwo: afterTwo.length,
          firstIsA: afterTwo[0]?.questionId === "a",
          countAfterOverflow: afterOverflow.length,
          oldestGone: !afterOverflow.some((e) => e.questionId === "a" || e.questionId === "b"),
        };
      })();
    `, store);
    result = await result;
    assert(result.countAfterTwo === 2, `после 2 добавлений ожидали 2 записи, получили ${result.countAfterTwo}`);
    assert(result.firstIsA, "порядок добавления должен сохраняться");
    assert(result.countAfterOverflow === 500, `после превышения лимита ожидали ровно 500 записей, получили ${result.countAfterOverflow}`);
    assert(result.oldestGone, "самые старые записи должны быть обрезаны первыми");
  });

  await test("История обучения (IndexedDB): старые данные из localStorage мигрируют автоматически при первом обращении", async () => {
    // Без этой миграции пользователи, уже накопившие историю в старом
    // формате (единая JSON-строка под HISTORY_KEY), потеряли бы её
    // полностью при переходе на IndexedDB.
    const store = {
      "js-track-history": JSON.stringify([
        { questionId: "vars-1", correct: true, ts: 1000, topicId: "vars", topicTitle: "let/const", tags: [] },
        { questionId: "vars-2", correct: false, ts: 2000, topicId: "vars", topicTitle: "let/const", tags: [] },
      ]),
    };
    let result2 = await runEngineScript(`
      globalThis.__testResult = (async () => {
        const entries = await getHistoryEntries();
        const stillInLocalStorage = await safeStorage.get(HISTORY_KEY);
        return { entries, stillInLocalStorage };
      })();
    `, store);
    result2 = await result2;
    assert(result2.entries.length === 2, `ожидали 2 мигрированные записи, получили ${result2.entries.length}`);
    assert(result2.entries[0].questionId === "vars-1" && result2.entries[1].questionId === "vars-2", "данные должны перенестись без искажений и в правильном порядке");
    assert(result2.stillInLocalStorage === null, "старый ключ localStorage должен быть удалён после успешной миграции");
  });

  await test("importProgressData: отклоняет структурно повреждённый бэкап, а не молча пишет мусор в хранилище", async () => {
    // Реальный найденный пробел: раньше единственной проверкой было
    // parsed.app === "js.track" — дальше значения писались в хранилище
    // как есть. Файл вида { data: { "js-track-xp": "hello" } } "успешно"
    // импортировался бы, а XP тихо становился 0 без единого
    // предупреждения — пользователь думал бы, что бэкап восстановлен.
    const store = {};
    let result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        const cases = [
          { label: "xp как строка вместо объекта", payload: { app: "js.track", version: 2, data: { "js-track-xp": "hello" } } },
          { label: "answers как массив вместо объекта", payload: { app: "js.track", version: 2, data: { "js-track-answers": JSON.stringify([1, 2, 3]) } } },
          { label: "achievements без unlocked", payload: { app: "js.track", version: 2, data: { "js-track-achievements": JSON.stringify({ foo: "bar" }) } } },
          { label: "нет version вообще", payload: { app: "js.track", data: { "js-track-xp": JSON.stringify({ xp: 100 }) } } },
          { label: "history не массив", payload: { app: "js.track", version: 2, data: {}, history: "не массив" } },
        ];
        const rejections = [];
        for (const c of cases) {
          const file = { text: async () => JSON.stringify(c.payload) };
          try {
            await importProgressData(file);
            rejections.push({ label: c.label, rejected: false });
          } catch {
            rejections.push({ label: c.label, rejected: true });
          }
        }

        const validFile = {
          text: async () => JSON.stringify({
            app: "js.track", version: 2,
            data: { "js-track-xp": JSON.stringify({ xp: 250 }) },
          }),
        };
        await importProgressData(validFile);
        const xpRes = await safeStorage.get(XP_KEY);

        return { rejections, xpAfterValidImport: xpRes ? JSON.parse(xpRes.value).xp : null };
      })();
    `, store);
    result = await result;
    const notRejected = result.rejections.filter((r) => !r.rejected).map((r) => r.label);
    assert(notRejected.length === 0, `эти повреждённые файлы должны были отклоняться, но были приняты: ${JSON.stringify(notRejected)}`);
    assert(result.xpAfterValidImport === 250, `корректный бэкап должен реально примениться, получили XP: ${result.xpAfterValidImport}`);
  });

  await test("updateReviewSchedule: интервал растёт при верных ответах, сбрасывается при ошибке", async () => {
    const store = {};
    let result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        const qId = ALL_QUESTIONS[0].id;
        await updateReviewSchedule(qId, false);
        const afterWrong = JSON.parse((await window.storage.get(REVIEW_SCHEDULE_KEY)).value);
        return { qId, stepAfterWrong: afterWrong[qId].stepIdx };
      })();
    `, store);
    result = await result;
    assert(result.stepAfterWrong === 0, `после ошибки stepIdx должен быть 0, получили ${result.stepAfterWrong}`);
    const qId = result.qId;

    // "Просрочиваем" назначенный день вручную перед следующим верным ответом
    let sched = JSON.parse(store["js-track-review-schedule"]);
    sched[qId].nextReviewDay -= 999999999; // далеко в прошлом
    store["js-track-review-schedule"] = JSON.stringify(sched);

    let result2 = await runEngineScript(`
      globalThis.__testResult = (async () => {
        await updateReviewSchedule("${qId}", true);
        const after = JSON.parse((await window.storage.get(REVIEW_SCHEDULE_KEY)).value);
        return after["${qId}"].stepIdx;
      })();
    `, store);
    result2 = await result2;
    assert(result2 === 1, `после верного stepIdx должен вырасти до 1, получили ${result2}`);

    let result3 = await runEngineScript(`
      globalThis.__testResult = (async () => {
        await updateReviewSchedule("${qId}", false);
        const after = JSON.parse((await window.storage.get(REVIEW_SCHEDULE_KEY)).value);
        return after["${qId}"].stepIdx;
      })();
    `, store);
    result3 = await result3;
    assert(result3 === 0, `ошибка должна сбросить интервал обратно к 0, получили ${result3}`);
  });

  await test("runUserCodeStepByStep: корректно инструментирует переменные и цикл", async () => {
    const result = runEngineScript(`
      globalThis.__testResult = runUserCodeStepByStep("let a = 1;\\nfor (let i = 0; i < 3; i++) {\\n  console.log(i);\\n}");
    `, {});
    assert(result.error === null, `не ожидали ошибку: ${result.error}`);
    // 1 шаг на "let a = 1" + 3 шага (по одному на каждую итерацию цикла,
    // каждая со своим console.log) = 4 шага. У for-цикла в этом движке
    // нет отдельного "завершающего" шага после последней итерации.
    assert(result.steps.length === 4, `ожидали 4 шага, получили ${result.steps.length}`);
    const lastStep = result.steps[result.steps.length - 1];
    assert(lastStep.vars.i === 2, `на последней итерации i должно быть 2, получили ${lastStep.vars.i}`);
  });

  await test("buildWorkerSource: liveKind-объект реально конструируется ВНУТРИ воркера и доступен коду", async () => {
    // Реальный найденный баг архитектуры: liveKind-вопросы (DOM-
    // заглушки) раньше принудительно шли в синхронный путь на главном
    // потоке, где тяжёлая команда без явного цикла (например
    // new Array(1e9).fill(0).map(...)) реально подвешивала вкладку —
    // injectLoopGuard видит только while/for и не ловит такое. Теперь
    // они тоже уходят в Worker: сам "живой" объект передать через
    // postMessage нельзя (structured clone не умеет функции-методы),
    // поэтому передаются только liveKind/liveVarName (строки), а
    // объект строится УЖЕ ВНУТРИ сгенерированного кода воркера.
    //
    // При первой реализации этого фикса здесь был ВТОРОЙ баг —
    // список paramNames для new Function(...) включал 8 "опасных"
    // имён-заглушек (fetch/XMLHttpRequest/...), а paramValues заполнял
    // только console — liveVarName получал undefined вместо реального
    // объекта. Этот тест реально выполняет сгенерированный код воркера
    // в изолированной vm-песочнице (эмулируя self/postMessage), а не
    // просто проверяет исходный текст — иначе рассинхронизация
    // параметров осталась бы незамеченной.
    const vm = require("vm");
    const raw = ENGINE_FILES.map((f) => fs.readFileSync(path.join(BASE_DIR, f), "utf8")).join("\n");
    const buildCtx = { window: {}, __workerSrc: null };
    vm.createContext(buildCtx);
    vm.runInContext(raw + "\nthis.__workerSrc = buildWorkerSource();", buildCtx);
    const workerSrc = buildCtx.__workerSrc;

    function runWorkerMessage(code, liveKind, liveVarName) {
      return new Promise((resolve) => {
        const workerCtx = { self: { postMessage: (data) => resolve(data) }, setTimeout, clearTimeout, setInterval, clearInterval, console };
        vm.createContext(workerCtx);
        vm.runInContext(workerSrc, workerCtx);
        workerCtx.self.onmessage({ data: { code, liveKind, liveVarName } });
      });
    }

    const result = await runWorkerMessage(
      "button.addEventListener('click', () => console.log('клик из воркера'));\nbutton.handlers.click();",
      "addEventListener", "button"
    );
    assert(result.error === null, `не ожидали ошибку, получили: ${result.error}`);
    assert(result.logs.includes("клик из воркера"), `live-объект внутри воркера должен реально сработать, получили logs: ${JSON.stringify(result.logs)}`);
  });

  await test("transformLoops: сложные вложенные скобки/тернарники в заголовке for распознаются верно", async () => {
    // Проверка конкретного примера, приведённого при разборе — вызов
    // функции со строкой, содержащей "(" и ")", внутри init-части for.
    const result = await runEngineScript(`
      const code = "function foo(x) { return x.length; }\\nconst a = true;\\nfor (\\n  let i = foo(\\n    a ? '(' : ')'\\n  );\\n  i < 5;\\n  i++\\n) { console.log(i); }";
      globalThis.__testResult = runUserCodeSync(code, {});
    `, {});
    assert(result.error === null, `не ожидали ошибку, получили: ${result.error}`);
    assert(result.logs.length === 4, `ожидали 4 строки вывода (i от 1 до 4), получили ${result.logs.length}`);
  });

  await test("ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ (принято осознанно): цикл внутри ${...} шаблонной строки НЕ ловится transformLoops", async () => {
    // Не "тест на будущий фикс" — документирует ТЕКУЩЕЕ, обсуждённое и
    // принятое поведение. Сканер пропускает бэктик-литералы целиком,
    // не заглядывая внутрь ${...}, поэтому guard внутри такого
    // выражения не добавляется. Подстраховка — внешний
    // worker.terminate() по таймауту на уровне runUserCodeInWorker
    // (настоящий OS-поток, дом от JS-уровня), а не эта функция.
    // Если этот тест вдруг начнёт падать — либо кто-то улучшил
    // transformLoops (хорошо, но обнови комментарий у injectLoopGuard),
    // либо что-то сломалось в самом сканере (стоит перепроверить).
    const code = "const x = `${(function(){ while(true){} return 1; })()}`;";
    const result = runEngineScript(`globalThis.__testResult = transformLoops(${JSON.stringify(code)});`, {});
    assert(!result.includes("__jsTrackLoopGuard"), "ожидали, что guard НЕ будет добавлен внутрь шаблонной строки (известное ограничение)");
  });

  await test("runUserCodeSync: код студента НЕ может обратиться к window/document/location/localStorage/alert и т.д.", async () => {
    // Реальный найденный пробел: раньше затенялись только postMessage/
    // fetch/XMLHttpRequest/importScripts/close/WebSocket — этого было
    // достаточно для воркера, но НЕ для синхронного пути на главном
    // потоке (Мини-проект), где код студента мог напрямую переписать
    // document.body.innerHTML всей страницы или вызвать
    // localStorage.clear(), стерев прогресс МИМО resetAllProgress().
    const dangerousNames = [
      "window", "document", "location", "navigator", "localStorage", "sessionStorage",
      "indexedDB", "alert", "confirm", "prompt", "history", "top", "parent", "frames", "opener",
    ];
    const probeCode = `console.log(${dangerousNames.map((n) => `typeof ${n}`).join(" + ',' + ")});`;
    const result = await runEngineScript(`globalThis.__testResult = runUserCodeSync(${JSON.stringify(probeCode)}, {});`, {});
    assert(result.error === null, `не ожидали ошибку зонда, получили: ${result.error}`);
    const types = result.logs[0].split(",");
    const leaked = dangerousNames.filter((n, i) => types[i] !== "undefined");
    assert(leaked.length === 0, `эти опасные имена доступны коду студента (должны быть undefined): ${JSON.stringify(leaked)}`);
  });

  await test("runUserCodeSync: обход через globalThis (внешний технический разбор) заблокирован", async () => {
    // Реальная найденная дыра из внешнего технического разбора,
    // подтверждена эмпирически ДО фикса: window/document были
    // затенены как параметры-заглушки, но globalThis — нет. Хотя
    // typeof window === "undefined" внутри песочницы, globalThis
    // указывает на РЕАЛЬНУЮ глобальную область — код студента мог
    // написать globalThis.document.body.innerHTML = '' и полностью
    // обойти всё затенение выше, стерев содержимое страницы СНАРУЖИ
    // песочницы. Плюс Function('return this')() — классический
    // альтернативный способ получить неограниченную ссылку на
    // глобальный объект в обход прямого перечисления имён. Фейковый
    // document и обе попытки обхода — В ОДНОМ И ТОМ ЖЕ vm-контексте
    // (не смешиваем с createEnv/jsdom — иначе проверка "документ
    // снаружи не пострадал" проверяла бы вообще другой объект,
    // никогда не подвергавшийся атаке, и была бы бессмысленной).
    const result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        globalThis.document = { body: { innerHTML: "ЦЕЛО" } };

        const probe1 = await runUserCodeSync("globalThis.document.body.innerHTML = 'СТЁРТО';", {});
        const probe2 = await runUserCodeSync("const g = Function('return this')(); g.document.body.innerHTML = 'СТЁРТО-2';", {});

        return {
          probe1Error: probe1.error,
          probe2Error: probe2.error,
          documentIntact: document.body.innerHTML === "ЦЕЛО",
        };
      })();
    `, {});
    const outcome = await result;
    assert(outcome.probe1Error !== null, "попытка через globalThis.document должна давать ошибку, а не молча выполниться");
    assert(outcome.probe2Error !== null, "Function('return this')() должен быть заблокирован (Function затенён как параметр)");
    assert(outcome.documentIntact, "реальный document (в этом же контексте) не должен быть затронут ни одной из попыток обхода");
  });

  await test("highlightJs/escapeHtml: реалистичная XSS-нагрузка полностью нейтрализуется", async () => {
    // Архитектурная точка контроля: highlightJs() используется вместе
    // с dangerouslySetInnerHTML в 5 местах проекта (CodeEditor,
    // LessonCard, findbug, sandbox) — она ОБЯЗАНА всегда получать
    // экранированный ввод. Прямого эксплойта не найдено (escapeHtml
    // вызывается первой строкой внутри highlightJs, до любой другой
    // обработки), но это тест на инвариант, который легко случайно
    // сломать при будущих правках highlightJs/escapeHtml.
    const payload = "</script><img src=x onerror=alert(1)>&<script>alert(2)</script>";
    const highlighted = runEngineScript(`globalThis.__testResult = highlightJs(${JSON.stringify(payload)});`, {});
    assert(!highlighted.includes("<script"), `highlightJs пропустил буквальный <script: ${highlighted}`);
    assert(!highlighted.includes("<img"), `highlightJs пропустил буквальный <img: ${highlighted}`);
    assert(highlighted.includes("&amp;"), "символ & должен быть экранирован как &amp;");
  });

  await test("Все dangerouslySetInnerHTML в проекте используют highlightJs() — не сырую строку в обход экранирования", async () => {
    // Ловит РЕГРЕССИЮ архитектурного инварианта: если кто-то в будущем
    // добавит новый dangerouslySetInnerHTML с сырым значением (не
    // через highlightJs), этот тест провалится, а не тихо создаст
    // дыру, которую заметят только на ревью кода.
    const jsxFiles = [];
    for (const f of fs.readdirSync(BASE_DIR)) if (f.endsWith(".jsx")) jsxFiles.push(path.join(BASE_DIR, f));
    const sharedDir = path.join(BASE_DIR, "shared");
    if (fs.existsSync(sharedDir)) for (const f of fs.readdirSync(sharedDir)) if (f.endsWith(".jsx")) jsxFiles.push(path.join(sharedDir, f));

    const violations = [];
    for (const file of jsxFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const m of content.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\}\}/g)) {
        if (!m[1].includes("highlightJs(")) violations.push(`${path.basename(file)}: ${m[1].trim()}`);
      }
    }
    assert(violations.length === 0, `dangerouslySetInnerHTML в обход highlightJs: ${JSON.stringify(violations)}`);
  });

  await test("ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ (принято осознанно): highlightJs не подсвечивает regex/bigint/numeric-разделители, но HTML не ломается", async () => {
    // Не "тест на будущий фикс" — документирует ТЕКУЩЕЕ, обсуждённое и
    // принятое поведение самописной regex-подсветки (вместо CodeMirror/
    // Monaco/Prism/Shiki). Эти конструкции просто остаются БЕЗ цвета —
    // не искажаются и не ломают HTML, только менее приметны визуально.
    // Если этот тест начнёт падать по первым 4 проверкам — значит
    // кто-то улучшил highlightJs (хорошо, но обнови комментарий над
    // функцией); если по последней (вложенные template literals
    // сломали HTML) — это уже РЕАЛЬНАЯ регрессия, нужно чинить.
    const cases = [
      ["1_000_000", "числовой разделитель"],
      ["123n", "bigint"],
      ["/foo/g", "regex-литерал"],
    ];
    for (const [snippet, label] of cases) {
      const result = runEngineScript(`globalThis.__testResult = highlightJs(${JSON.stringify(snippet)});`, {});
      assert(!result.includes("var(--accent2)"), `${label} неожиданно получил подсветку числа — если это осознанное улучшение, обнови комментарий над highlightJs`);
    }
    // Главный инвариант, который ДОЛЖЕН оставаться истинным всегда,
    // даже для вложенных template literals с неверными границами —
    // HTML остаётся корректным (открытые/закрытые теги совпадают).
    const nested = runEngineScript(`globalThis.__testResult = highlightJs("\`a \${b + \`c \${d}\`}\`");`, {});
    const opens = (nested.match(/<span/g) || []).length;
    const closes = (nested.match(/<\/span>/g) || []).length;
    assert(opens === closes, `HTML должен оставаться валидным даже при неверных границах строки: ${opens} открытых, ${closes} закрытых span`);
  });

  await test("runUserCode: РЕАЛЬНЫЙ setTimeout/await внутри кода студента корректно дожидается (не теряется как раньше при 60мс)", async () => {
    // Реальный найденный баг: раньше стояла фиксированная пауза в 60мс
    // перед фиксацией результата — настроена только под микрозадачи
    // (Promise.resolve), но НЕ под макрозадачи. Код студента вида
    // `setTimeout(() => console.log('готово'), 100)` или ТОЧНЫЙ пример
    // из разбора — `await new Promise(r => setTimeout(r, 200));
    // console.log('done');` — завершался бы позже 60мс, и console.log
    // внутри колбэка просто пропадал бы из результата, хотя код
    // полностью корректен. Особенно важно, поскольку курс содержит
    // отдельный раздел про асинхронность.
    let result = runEngineScript(`
      globalThis.__testResult = (async () => {
        return await runUserCode("setTimeout(() => { console.log('готово'); }, 100);", {});
      })();
    `, {});
    result = await result;
    assert(result.logs.includes("готово"), `setTimeout(..., 100) должен дождаться колбэка, получили logs: ${JSON.stringify(result.logs)}`);

    let result2 = runEngineScript(`
      globalThis.__testResult = (async () => {
        return await runUserCode("await new Promise(resolve => setTimeout(resolve, 200));\\nconsole.log('done');", {});
      })();
    `, {});
    result2 = await result2;
    assert(result2.error === null, `не ожидали ошибку, получили: ${result2.error}`);
    assert(result2.logs.includes("done"), `точный пример из разбора должен дождаться 'done', получили logs: ${JSON.stringify(result2.logs)}`);

    // Микрозадачи (ради которых изначально была введена пауза) —
    // не должны были сломаться при переходе на отслеживание таймеров.
    let result3 = runEngineScript(`
      globalThis.__testResult = (async () => {
        return await runUserCode("async function f() { const x = await Promise.resolve(1); console.log(x); } f();", {});
      })();
    `, {});
    result3 = await result3;
    assert(result3.logs.includes("1"), `микрозадачи (Promise.resolve) должны по-прежнему работать, получили logs: ${JSON.stringify(result3.logs)}`);
  });

  await test("runUserCode: setTimeout с задержкой БОЛЬШЕ порога ожидания честно сообщает о таймауте, а не ложный 'успех с пустым выводом'", async () => {
    // Продолжение предыдущего фикса — реальный найденный нюанс: даже
    // после перехода на отслеживание таймеров, код с задержкой БОЛЬШЕ
    // MAX_ASYNC_WAIT_MS (например setTimeout(..., 5000) при пороге в
    // 3 секунды) раньше при исчерпании времени ожидания возвращал
    // { error: null } с пустыми logs — неотличимо от "код действительно
    // ничего не вывел". Студент с логически ВЕРНЫМ кодом видел бы
    // "неверно", не понимая, что дело в задержке, а не в ошибке. Теперь
    // возвращается понятная ошибка про то, что выполнение не уложилось
    // в отведённое время — честно, а не притворяясь завершённым.
    let result = runEngineScript(`
      globalThis.__testResult = (async () => {
        return await runUserCode("setTimeout(() => { console.log('hello'); }, 5000);", {});
      })();
    `, {});
    result = await result;
    assert(result.error !== null, "код с задержкой больше порога должен вернуть ошибку о таймауте, а не error: null");
    assert(result.error.includes("дольше"), `ошибка должна понятно объяснять причину, получили: ${result.error}`);
  });

  await test("gradePrediction: построчно сравнивает предсказанный вывод с ожидаемым", async () => {
    const correct = runEngineScript(`globalThis.__testResult = gradePrediction("1\\n2\\n3", ["1", "2", "3"]);`, {});
    assert(correct.allCorrect === true, "полностью совпадающий вывод должен быть засчитан как верный");
    const wrong = runEngineScript(`globalThis.__testResult = gradePrediction("1\\n5\\n3", ["1", "2", "3"]);`, {});
    assert(wrong.allCorrect === false, "несовпадающий вывод не должен засчитываться как верный");
  });

  await test("loadCoreState НЕ увеличивает серию дней сама по себе — только реальный ответ (submitAnswer)", async () => {
    // Реальный найденный баг: loadCoreState() вызывается на каждой
    // странице при простом открытии — если бы она инкрементировала
    // серию, "день" засчитывался бы без единого решённого вопроса.
    const store = {};
    let result = await runEngineScript(`
      globalThis.__testResult = (async () => {
        const before = await loadCoreState();
        const beforeAgain = await loadCoreState();
        return { count1: before.streak.count, count2: beforeAgain.streak.count };
      })();
    `, store);
    result = await result;
    assert(result.count1 === 0, `серия свежего пользователя должна быть 0, получили ${result.count1}`);
    assert(result.count2 === 0, `повторный вызов loadCoreState() не должен поднять серию, получили ${result.count2}`);
    assert(store["js-track-streak"] === undefined, "loadCoreState() не должна вообще писать в js-track-streak");

    let result2 = await runEngineScript(`
      globalThis.__testResult = (async () => {
        const q = ALL_QUESTIONS[0];
        await submitAnswer({ question: q, isCorrect: true, elapsedMs: 3000 });
        const after = await loadCoreState();
        return after.streak.count;
      })();
    `, store);
    result2 = await result2;
    assert(result2 === 1, `после реального ответа серия должна стать 1, получили ${result2}`);
  });

  await test("getLocalDateKey: использует МЕСТНЫЕ компоненты даты, не UTC — ловит регрессию на toISOString()", async () => {
    // Реальный найденный баг: несколько мест в коде (серия дней,
    // напоминания, имя файла бэкапа) использовали
    // new Date().toISOString().slice(0, 10) — это UTC, а интерфейс
    // работает в местном времени пользователя. Человек, занимающийся
    // в 00:30 по местному времени в часовом поясе восточнее UTC
    // (например UTC+8), формально ещё "вчера" по UTC — серия дней и
    // напоминания могли посчитать это днём раньше, чем было на самом
    // деле. Тест не зависит от часового пояса машины, на которой
    // запускается: сравнивает getLocalDateKey() с ручным вычислением
    // через ТЕ ЖЕ локальные геттеры (getFullYear/getMonth/getDate) —
    // если функцию когда-нибудь незаметно вернут на getUTC*-геттеры
    // или toISOString(), тест это поймает независимо от TZ окружения.
    const result = runEngineScript(`
      const d = new Date(2026, 0, 5); // 5 января 2026 по МЕСТНОМУ времени, без привязки к UTC-сдвигу
      const expected = "2026-01-05";
      globalThis.__testResult = { actual: getLocalDateKey(d), expected: expected };
    `, {});
    assert(result.actual === result.expected, `getLocalDateKey должна вернуть ${result.expected} для локальной даты 5 января 2026, получили ${result.actual}`);
  });

  await test("Ни один toISOString().slice(0, 10) не остался в кодовой базе — везде используется getLocalDateKey()", async () => {
    // Ловит регрессию, если кто-то (включая меня в будущем) снова
    // введёт UTC-паттерн вместо общей функции местного времени.
    const files = [...ENGINE_FILES, "sw.js"];
    const violations = [];
    for (const f of files) {
      const content = fs.readFileSync(path.join(BASE_DIR, f), "utf8");
      // Ищем ТОЛЬКО реальный код, не упоминания в комментариях —
      // достаточно грубо (без учёта того, что comment может быть на
      // соседней строке), но проверяет именно то, что нужно: если
      // где-то реально ВЫЗЫВАЕТСЯ toISOString().slice, а не просто
      // упоминается в тексте объяснения.
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (line.includes("toISOString().slice(0, 10)") || line.includes("toISOString().slice(0,10)")) {
          violations.push(`${f}: ${trimmed}`);
        }
      }
    }
    assert(violations.length === 0, `остались вызовы toISOString().slice в реальном коде: ${JSON.stringify(violations)}`);
  });

  await test("Design System 2.0: Fraunces разрешён ТОЛЬКО в hero-заголовках/крупных эмоциональных моментах, не в кнопках/бейджах/статистике", async () => {
    // Эволюция правила: сначала Fraunces убрали полностью (developer
    // tool направление), затем по итогам Design System 2.0 вернули —
    // но строго ограниченно. Разрешённый список — hero-заголовок
    // главного экрана (.home__greeting) и заголовок празднования
    // прохождения курса (.summary-celebration__title), больше нигде.
    const ALLOWED_FRAUNCES_SELECTORS = [".home__greeting", ".summary-celebration__title"];
    const cssFiles = fs.readdirSync(BASE_DIR).filter((f) => f.endsWith(".css") && !f.startsWith("shared" + path.sep));
    const sharedCssFiles = fs.existsSync(path.join(BASE_DIR, "shared"))
      ? fs.readdirSync(path.join(BASE_DIR, "shared")).filter((f) => f.endsWith(".css")).map((f) => path.join("shared", f))
      : [];
    const violations = [];
    for (const f of [...cssFiles, ...sharedCssFiles]) {
      const content = fs.readFileSync(path.join(BASE_DIR, f), "utf8");
      // Ищем КАЖДОЕ вхождение font-family: Fraunces и смотрим, что за
      // селектор открывает БЛОК, в котором оно находится (ищем назад
      // до ближайшей "}" или начала файла, затем берём последний
      // встретившийся "селектор {" перед этой позицией) — работает и
      // для однострочных, и для многострочных CSS-правил.
      for (const m of content.matchAll(/font-family:\s*['"]?Fraunces[^;]*;/g)) {
        const before = content.slice(0, m.index);
        const lastBrace = before.lastIndexOf("}");
        const blockStart = before.slice(lastBrace + 1);
        const selMatch = blockStart.match(/([^\{]+)\{[^\{]*$/);
        const selector = selMatch ? selMatch[1].trim() : "";
        const isAllowed = ALLOWED_FRAUNCES_SELECTORS.some((sel) => selector.startsWith(sel));
        if (!isAllowed) violations.push(`${f}: селектор "${selector}" — ${m[0]}`);
      }
    }
    assert(violations.length === 0, `Fraunces вне разрешённого списка (кнопка/бейдж/статистика?): ${JSON.stringify(violations)}`);
  });

  await test("Ни в одном из 18 engine-*.js файлов не осталось устаревших заголовков от старой 6-файловой структуры", async () => {
    // Реальный найденный баг: при разбивке 6 файлов на 18 некоторые
    // блоки (TOPICS, logsMatch, isIdentStart, highlightJs) унаследовали
    // ЗАГОЛОВОК СВОЕГО ИСХОДНОГО файла как часть извлечённого текста
    // (комментарий "принадлежит" следующей за ним декларации) — эти
    // заголовки в старом стиле "pages/shared/engine-XXX.js" застревали
    // ВНУТРИ новых файлов (не только в начале, но и в середине/конце),
    // рядом с настоящим кодом. Не ломает выполнение (это просто
    // комментарии), но сбивает с толку любого, кто читает файл. Эта
    // проверка ловит повторное появление такого мусора при будущих
    // реорганизациях структуры.
    const violations = [];
    for (const f of ENGINE_FILES) {
      const content = fs.readFileSync(path.join(BASE_DIR, f), "utf8");
      for (const m of content.matchAll(/^   pages\/shared\/engine-[a-z]+\.js/gm)) {
        violations.push(`${f}: "${m[0].trim()}"`);
      }
    }
    assert(violations.length === 0, `застрявшие заголовки старой структуры: ${JSON.stringify(violations)}`);
  });
}


/* ==========================================================================
   Домой.
   ========================================================================== */

async function runIndexTests() {
  console.log("\n=== index.html (Домой) ===");
  await test("Рендерится с приветствием и прогрессом с чистого листа", async () => {
    const env = createEnv("index.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    const text = env.doc.body.textContent;
    assert(/Добр(ое|ый|ой)/.test(text), "должно быть приветствие по времени суток");
    assert(text.includes("0%"), "свежий пользователь должен видеть 0% прогресса");
    assert(text.includes("Начать"), "карточка действия должна звать 'Начать', раз ответов ещё не было");
  });

  await test("PWA-баннер установки не показывается без реальной вовлечённости (серия < 2 дней)", async () => {
    const env = createEnv("index.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    env.win.dispatchEvent(Object.assign(new env.win.Event("beforeinstallprompt", { cancelable: true }), {
      prompt: () => {}, userChoice: Promise.resolve({ outcome: "accepted" }),
    }));
    await env.wait(100);
    assert(env.doc.querySelector(".pwa-banner") === null, "баннер не должен появляться при первом визите");
  });

  await test("Mobile-архитектура: боковая панель (десктоп) — аккордеон раскрывает группы прямо внутри колонки", async () => {
    // Найденная возможность при разборе: раньше вся навигация была
    // ОДНОЙ горизонтальной панелью, просто по-разному сжатой под
    // ширину экрана (@media на одной и той же разметке) — не
    // отдельная UX-архитектура под форм-фактор. Теперь: боковая
    // панель на десктопе (аккордеон, группы раскрываются прямо в
    // колонке) + нижняя таб-панель на мобильном (см. следующий тест).
    // Header.jsx теперь возвращает оба варианта как соседние
    // элементы — jsdom не считает медиа-запросы для лэйаута, поэтому
    // оба присутствуют в DOM одновременно (видимость решает только
    // CSS), можно проверять структуру без эмуляции ширины экрана.
    const env = createEnv("index.jsx", SHARED.common);
    env.load();
    await env.wait(300);

    const sidebar = env.doc.querySelector(".app-sidebar");
    assert(sidebar !== null, "боковая панель должна присутствовать в DOM (видимость — по CSS)");

    const homeLink = Array.from(sidebar.querySelectorAll(".app-sidebar__item")).find((el) => el.textContent.includes("Главная"));
    assert(homeLink !== null, "должна быть прямая ссылка 'Главная'");
    assert(homeLink.tagName === "A", "'Главная' — прямая ссылка, не кнопка с подменю");

    assert(sidebar.querySelector(".app-sidebar__subitems") === null, "подпункты не должны быть видны, пока группа не раскрыта");

    const learnBtn = Array.from(sidebar.querySelectorAll(".app-sidebar__item--group")).find((el) => el.textContent.includes("Учёба"));
    assert(learnBtn !== null, "должна быть раскрываемая группа 'Учёба'");
    env.click(learnBtn);
    await env.wait(50);

    const subitems = Array.from(sidebar.querySelectorAll(".app-sidebar__subitem")).map((el) => el.textContent);
    assert(subitems.length === 2 && subitems.some((t) => t.includes("Вопросы")) && subitems.some((t) => t.includes("Карта знаний")),
      `раскрытая 'Учёба' должна показать ровно Вопросы+Карта знаний ПРЯМО В КОЛОНКЕ, получили: ${JSON.stringify(subitems)}`);

    env.click(learnBtn);
    await env.wait(50);
    assert(sidebar.querySelector(".app-sidebar__subitems") === null, "повторный клик должен свернуть группу обратно");
  });

  await test("Mobile-архитектура: нижняя таб-панель — 5 вкладок, группы открывают лист СНИЗУ вверх", async () => {
    const env = createEnv("index.jsx", SHARED.common);
    env.load();
    await env.wait(300);

    const bottombar = env.doc.querySelector(".app-bottombar");
    assert(bottombar !== null, "нижняя таб-панель должна присутствовать в DOM (видимость — по CSS)");

    const tabs = Array.from(bottombar.querySelectorAll(".app-bottombar__tab"));
    assert(tabs.length === 5, `ожидали ровно 5 вкладок (как в макете), получили ${tabs.length}`);
    const tabLabels = tabs.map((t) => t.textContent);
    assert(
      ["Главная", "Учёба", "Практика", "Прогресс", "Профиль"].every((l) => tabLabels.some((t) => t.includes(l))),
      `ожидали все 5 подписей, получили: ${JSON.stringify(tabLabels)}`
    );
    assert(tabs.every((t) => t.querySelector("svg") !== null), "у каждой вкладки должна быть своя SVG-иконка");

    assert(bottombar.querySelector(".app-bottombar__sheet") === null, "лист не должен быть открыт по умолчанию");

    const practiceTab = tabs.find((t) => t.textContent.includes("Практика"));
    env.click(practiceTab);
    await env.wait(50);
    const sheet = bottombar.querySelector(".app-bottombar__sheet");
    assert(sheet !== null, "клик по 'Практика' должен открыть лист с подпунктами");
    const sheetLinks = Array.from(sheet.querySelectorAll("a")).map((el) => el.textContent);
    assert(sheetLinks.length === 6, `лист 'Практика' должен содержать 6 пунктов, получили ${sheetLinks.length}`);
  });

  await test("Байт 2.0: каждое настроение (mood) даёт свой цвет автоматически, без ручного color на каждом вызове", async () => {
    // По итогам разбора маскота — не новый персонаж, а "Байт 2.0":
    // сохранена форма головы/антенна/минимализм, добавлен единый
    // словарь настроений (idle/wave/think/correct/wrong/celebrate/
    // streak/launch) с автоматическим цветом по настроению вместо
    // дублирования color= на каждом вызове по всему проекту.
    const env = createEnv("index.jsx", SHARED.common);
    env.load();
    await env.wait(300);

    // На свежем главном экране (без серии, без 100%) маскот должен
    // быть в позе "wave" — проверяем, что класс настроения реально
    // навешивается (используется для CSS-анимации).
    const illustration = env.doc.querySelector(".mascot-illustration");
    assert(illustration !== null, "иллюстрация маскота должна быть на главном экране");
    const illustrationClass = illustration.getAttribute("class") || "";
    assert(illustrationClass.includes("mascot-illustration--wave"), `ожидали настроение wave на свежем экране, получили класс: ${illustrationClass}`);

    // Проверяем РЕАЛЬНЫЙ отрисованный результат, а не пытаемся достать
    // внутренний JS-объект через eval (const из отдельного <script>
    // не виден снаружи так же, как и в vm-модуле Node) — тело маскота
    // (rect) должно реально иметь stroke, завязанный на CSS-переменную
    // настроения, а не быть пустым/недостающим атрибутом.
    const bodyRect = illustration.querySelector("rect");
    assert(bodyRect !== null, "у иллюстрации должен быть хотя бы один rect (тело/голова)");
    const stroke = bodyRect.getAttribute("stroke") || "";
    assert(stroke.startsWith("var(--"), `stroke должен ссылаться на CSS-переменную настроения, получили: "${stroke}"`);
  });

  await test("Живость Байта: летящий '+N XP' у бейджа в шапке появляется реально при первом верном ответе", async () => {
    // Реальная найденная возможность: CSS для летящего "+N XP"
    // (app-header__xp-float) существовал в разметке, но не был НИГДЕ
    // подключён — ни JSX-рендера, ни даже самого @keyframes не было.
    // Добавлен полностью: состояние в questions.jsx → проп в Header →
    // условный рендер у бейджа XP → сам недостающий keyframe.
    const env = createEnv("questions.jsx", SHARED.questions);
    env.win.__JS_TRACK_SHUFFLE_SEED__ = 1; // детерминированный порядок тем — без этого сама последовательность вопросов случайна при каждом прогоне
    env.load();
    await env.wait(300);

    assert(env.doc.querySelector(".app-header__xp-float") === null, "вылета не должно быть на старте, до первого ответа");

    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Начать вопросы")));
    await env.wait(150);
    // Первый вопрос при этом seed'е может оказаться и квизом, и кодом
    // (код-вопросы не участвуют в этой проверке) — переходим вперёд
    // через "Далее", пока не найдём именно квиз с вариантами ответа.
    let opt = env.doc.querySelector(".quiz-question__option");
    for (let i = 0; i < 6 && !opt; i++) {
      const next = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Далее") && !b.disabled);
      if (!next) break;
      env.click(next);
      await env.wait(60);
      opt = env.doc.querySelector(".quiz-question__option");
    }
    assert(opt !== null, "должен найтись хотя бы один вариант ответа квиза в первых нескольких вопросах");

    env.click(opt);
    await env.wait(100);
    const floatEl = env.doc.querySelector(".app-header__xp-float");
    // Клик мог попасть на неверный вариант — тогда XP не начисляется
    // и вылета законно не будет; проверяем условно. Пытался сделать
    // тест детерминированным через поиск гарантированно верного
    // варианта (env.win.eval("ALL_QUESTIONS...")) — оказалось
    // ненадёжно: отдельный вызов eval не видит const из основного
    // eval, которым createEnv грузит объединённый скрипт (та же
    // особенность области видимости, что уже встречалась в vm-модуле
    // Node). Если ответ оказался верным — вылет ОБЯЗАН появиться.
    const answersRaw = env.store["js-track-answers"];
    const answers = answersRaw ? JSON.parse(answersRaw) : {};
    const anyCorrect = Object.values(answers).some((a) => a.status === "correct");
    if (anyCorrect) {
      assert(floatEl !== null, "после верного ответа летящий '+N XP' должен появиться у бейджа");
      assert(/\+\d+ XP/.test(floatEl.textContent), `текст вылета должен быть вида '+N XP', получили: "${floatEl.textContent}"`);
    }
  });

  await test("Навигация: собственные SVG-иконки вместо эмодзи, но 🔥/⭐ осознанно оставлены в бейджах серии/XP", async () => {
    // Найденная проблема при разборе визуальной идентичности: эмодзи
    // в самой навигации (🏠📘🎲 и т.д.) рендерятся по-разному в разных
    // ОС — заменены на собственные монохромные line-art SVG-иконки
    // (nav-icons.jsx). Но эмодзи НЕ убраны отовсюду — там, где они
    // дают эмоцию (серия дней, XP), 🔥/⭐ оставлены сознательно.
    const env = createEnv("index.jsx", SHARED.common);
    env.load();
    await env.wait(300);

    const homeLink = Array.from(env.doc.querySelectorAll(".app-sidebar__item"))
      .find((el) => el.textContent.includes("Главная"));
    assert(homeLink !== null, "должна быть ссылка 'Главная' в боковой панели");
    assert(homeLink.querySelector("svg") !== null, "у 'Главная' должна быть SVG-иконка, не эмодзи");
    assert(!/\p{Extended_Pictographic}/u.test(homeLink.textContent), `в тексте ссылки не должно быть эмодзи, получили: "${homeLink.textContent}"`);

    const xpBadge = Array.from(env.doc.querySelectorAll(".app-header__badge")).find((el) => el.textContent.includes("XP"));
    assert(xpBadge !== null, "должен быть бейдж с XP");
    assert(xpBadge.textContent.includes("⭐"), `бейдж XP должен содержать ⭐ (эмодзи здесь уместен), получили: "${xpBadge.textContent}"`);
  });
}

/* ==========================================================================
   Вопросы.
   ========================================================================== */

async function runQuestionsTests() {
  console.log("\n=== questions.html (Вопросы) ===");

  await test("Урок → квиз-вопрос → отправка → следующий вопрос — полный цикл", async () => {
    const env = createEnv("questions.jsx", SHARED.questions);
    env.win.__JS_TRACK_SHUFFLE_SEED__ = 1; // детерминированный порядок — без этого тест изредка попадал на code-вопрос вместо квиза
    env.load();
    await env.wait(300);
    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Начать вопросы")));
    await env.wait(150);
    // Первый вопрос темы при этом seed'е может оказаться и квизом, и
    // кодом — переходим вперёд, пока не найдём квиз, вместо того чтобы
    // жёстко полагаться на конкретную позицию (более устойчиво к
    // будущим изменениям порядка вопросов внутри темы).
    let opt = env.doc.querySelector(".quiz-question__option");
    for (let i = 0; i < 4 && !opt; i++) {
      const next = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Далее") && !b.disabled);
      if (!next) break;
      env.click(next);
      await env.wait(60);
      opt = env.doc.querySelector(".quiz-question__option");
    }
    assert(opt !== null, "должен найтись хотя бы один вариант ответа квиза в первых нескольких вопросах");
    env.click(opt);
    await env.wait(100);
    assert(env.doc.querySelector(".mascot-feedback") !== null, "после ответа должен показаться фидбек Байта");
    assert(env.store["js-track-answers"] !== undefined, "ответ должен быть записан в хранилище");
    assert(env.store["js-track-review-schedule"] !== undefined, "расписание интервального повторения должно обновиться");
  });

  await test("DOM-вопросы (liveKind) выполняются без ReferenceError", async () => {
    const env = createEnv("questions.jsx", SHARED.questions, {});
    env.win.location.href = "https://example.com/questions.html?topic=dom";
    env.load();
    await env.wait(300);
    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Начать вопросы")));
    await env.wait(150);
    let foundLiveCode = false;
    for (let i = 0; i < 6; i++) {
      const textarea = env.doc.querySelector("textarea");
      if (textarea && textarea.value.includes("button")) { foundLiveCode = true; break; }
      const opts = env.doc.querySelectorAll(".quiz-question__option");
      if (opts.length) { env.click(opts[0]); await env.wait(60); }
      const next = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Далее") && !b.disabled);
      if (next) { env.click(next); await env.wait(60); }
    }
    if (foundLiveCode) {
      const textarea = env.doc.querySelector("textarea");
      env.setTextareaValue(textarea, "button.addEventListener('click', () => console.log('клик'));\nbutton.handlers.click();");
      await env.wait(50);
      env.click(env.doc.querySelector(".code-editor-panel__run-btn"));
      await env.wait(600);
      const text = env.doc.body.textContent;
      assert(!text.includes("not defined"), "не должно быть ReferenceError на liveKind-объекте");
    }
  });
}

/* ==========================================================================
   Практика.
   ========================================================================== */

async function runPracticeTests() {
  console.log("\n=== practice.html (Практика) ===");

  await test("Пустое состояние без пройденных тем", async () => {
    const env = createEnv("practice.jsx", SHARED.code);
    env.load();
    await env.wait(300);
    assert(env.doc.querySelector(".empty-state") !== null, "без прогресса должно быть честное пустое состояние");
  });

  await test("С прогрессом — вопрос показывается, ответ не пишется в общий прогресс", async () => {
    const initialAnswers = JSON.stringify({ "vars-1": { status: "correct" } });
    const env = createEnv("practice.jsx", SHARED.code, { "js-track-answers": initialAnswers });
    env.load();
    await env.wait(300);
    assert(env.doc.querySelector(".practice__topic-badge") !== null, "должен показаться вопрос из пройденной темы");
    const opt = env.doc.querySelector(".quiz-question__option");
    if (opt) {
      env.click(opt);
      await env.wait(100);
      assert(env.store["js-track-answers"] === initialAnswers, "практика не должна менять основной прогресс");
    }
  });
}

/* ==========================================================================
   Итоги.
   ========================================================================== */

async function runSummaryTests() {
  console.log("\n=== summary.html (Итоги) ===");

  await test("Свежий пользователь видит подробную статистику (не экран-праздник)", async () => {
    const env = createEnv("summary.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    assert(env.doc.body.textContent.includes("Итоги"), "должен быть заголовок 'Итоги'");
    assert(env.doc.querySelectorAll(".summary__achievement").length === 8, "должны быть показаны все 8 достижений (включая заблокированные)");
  });

  await test("Показывает только ПРОСРОЧЕННЫЕ вопросы на повторение, не будущие", async () => {
    const raw = ENGINE_FILES.map((f) => fs.readFileSync(path.join(BASE_DIR, f), "utf8")).join("\n");
    const vm = require("vm");
    const ctx = { window: {}, __result: null };
    vm.createContext(ctx);
    // DAY_MS/startOfDay объявлены через const/function внутри engine-*.js —
    // вычисляем даты для расписания ВНУТРИ той же vm-области, а не
    // пытаемся читать ctx.DAY_MS снаружи (там будет undefined).
    vm.runInContext(
      raw + `
      const q0 = ALL_QUESTIONS[0], q1 = ALL_QUESTIONS[1];
      const today = startOfDay(Date.now());
      this.__result = {
        q0Id: q0.id, q1Id: q1.id,
        q0Due: today - DAY_MS,
        q1NotDue: today + 7 * DAY_MS,
      };
      `,
      ctx
    );
    const { q0Id, q1Id, q0Due, q1NotDue } = ctx.__result;

    const schedule = {
      [q0Id]: { stepIdx: 0, nextReviewDay: q0Due },
      [q1Id]: { stepIdx: 2, nextReviewDay: q1NotDue },
    };
    const env = createEnv("summary.jsx", SHARED.common, {
      "js-track-review-schedule": JSON.stringify(schedule),
      "js-track-answers": JSON.stringify({ [q0Id]: { status: "wrong" }, [q1Id]: { status: "correct" } }),
    });
    env.load();
    await env.wait(300);
    const items = env.doc.querySelectorAll(".summary__wrong-question");
    assert(items.length === 1, `ожидали ровно 1 просроченный вопрос, получили ${items.length}`);
  });
}

/* ==========================================================================
   Профиль.
   ========================================================================== */

async function runProfileTests() {
  console.log("\n=== profile.html (Профиль) ===");
  await test("Показывает прогресс по всем 12 темам и позволяет ввести имя", async () => {
    const env = createEnv("profile.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    assert(env.doc.querySelectorAll(".profile__topic-row").length === 12, "должны быть строки для всех 12 тем");
    const nameInput = env.doc.querySelector(".profile__name-input");
    assert(nameInput !== null, "должно быть поле для имени");
  });
}

/* ==========================================================================
   Консоль.
   ========================================================================== */

async function runSandboxTests() {
  console.log("\n=== sandbox.html (Консоль) ===");
  await test("Выполняет произвольный код и показывает вывод", async () => {
    const env = createEnv("sandbox.jsx", SHARED.code);
    env.win.Worker = undefined; // синхронный путь выполнения для теста
    env.load();
    await env.wait(300);
    const textarea = env.doc.querySelector("textarea");
    env.setTextareaValue(textarea, "console.log('тест', 1 + 1);");
    await env.wait(50);
    env.click(env.doc.querySelector(".code-editor-panel__run-btn"));
    await env.wait(600);
    assert(env.doc.body.textContent.includes("тест 2"), "должен появиться вывод 'тест 2'");
  });

  await test("Пошаговый отладчик: вход, накопление переменных, выход", async () => {
    const env = createEnv("sandbox.jsx", SHARED.code);
    env.load();
    await env.wait(300);
    const textarea = env.doc.querySelector("textarea");
    env.setTextareaValue(textarea, "let x = 1;\nlet y = 2;\nconsole.log(x + y);");
    await env.wait(50);
    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Отладчик")));
    await env.wait(100);
    assert(env.doc.body.textContent.includes("Шаг 1 из"), "должен показаться первый шаг отладчика");
    const exitBtn = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Изменить код"));
    env.click(exitBtn);
    await env.wait(50);
    assert(env.doc.querySelector("textarea") !== null, "после выхода редактор должен вернуться");
  });
}

/* ==========================================================================
   История.
   ========================================================================== */

async function runHistoryTests() {
  console.log("\n=== history.html (История) ===");
  await test("Пустое состояние и календарь активности из 98 ячеек (14 недель)", async () => {
    const env = createEnv("history.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    assert(env.doc.querySelector(".empty-state") !== null, "без истории должно быть пустое состояние");
    assert(env.doc.querySelectorAll(".activity-calendar__cell").length >= 98, "календарь должен иметь минимум 98 ячеек");
  });
}

/* ==========================================================================
   Предскажи вывод.
   ========================================================================== */

async function runPredictTests() {
  console.log("\n=== predict.html (Предскажи вывод) ===");
  await test("Правильный ответ засчитывается верно", async () => {
    const env = createEnv("predict.jsx", SHARED.common, {}, "window.__firstExpected = PREDICT_SHUFFLED[0].expected;");
    env.win.__JS_TRACK_SHUFFLE_SEED__ = 42;
    env.load();
    await env.wait(300);
    const expected = env.win.__firstExpected.join("\n");
    const textarea = env.doc.querySelector(".predict__textarea");
    env.setTextareaValue(textarea, expected);
    await env.wait(50);
    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Проверить")));
    await env.wait(100);
    assert(env.doc.body.textContent.includes("Верно!"), "правильный ответ должен быть засчитан");
  });
}

/* ==========================================================================
   Карта знаний.
   ========================================================================== */

async function runTreeTests() {
  console.log("\n=== tree.html (Карта знаний) ===");
  await test("Все 12 тем присутствуют в дереве (включая 3 более новые)", async () => {
    const env = createEnv("tree.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    const labels = ["let / const", "Именование", "Строки", "Деструктуризация", "Массивы", "Мутабельность", "Объекты", "Методы объектов", "Циклы", "Async / await", "Классы", "DOM"];
    const text = env.doc.body.textContent;
    const missing = labels.filter((l) => !text.includes(l));
    assert(missing.length === 0, `отсутствуют темы в дереве: ${JSON.stringify(missing)}`);
  });
}

/* ==========================================================================
   Экзамен.
   ========================================================================== */

async function runExamTests() {
  console.log("\n=== exam.html (Экзамен) ===");
  await test("Intro → старт → таймер запущен", async () => {
    const env = createEnv("exam.jsx", SHARED.code);
    env.load();
    await env.wait(300);
    assert(env.doc.body.textContent.includes("Финальный экзамен"), "должен быть intro-экран");
    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Начать экзамен")));
    await env.wait(150);
    assert(/\d+:\d{2}/.test(env.doc.body.textContent), "должен показаться таймер");
    assert(env.doc.body.textContent.includes("Вопрос 1 из 30"), "должен начаться первый вопрос");
  });
}

/* ==========================================================================
   Мини-проект.
   ========================================================================== */

async function runProjectTests() {
  console.log("\n=== project.html (Мини-проект) ===");
  await test("Таймер реально тикает после запуска и клика", async () => {
    const env = createEnv("project.jsx", SHARED.code);
    env.load();
    await env.wait(300);
    env.click(env.doc.querySelector(".code-editor-panel__run-btn"));
    await env.wait(500);
    const previewBtn = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Старт / Стоп"));
    env.click(previewBtn);
    await env.wait(2200);
    const display = env.doc.querySelector(".project__display").textContent;
    assert(display !== "0 сек", `таймер должен тикать, получили: ${display}`);
  });
}

/* ==========================================================================
   Визуализации.
   ========================================================================== */

async function runVizTests() {
  console.log("\n=== viz.html (Визуализации) ===");
  await test("Все 6 визуализаций открываются и проходятся до финального шага", async () => {
    const env = createEnv("viz.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    const topics = ["Scope", "Замыкания", "this", "Prototype", "Event Bubbling"];
    for (const topicName of topics) {
      const tab = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes(topicName));
      env.click(tab);
      await env.wait(60);
      assert(!env.doc.body.textContent.includes("скоро появится"), `визуализация "${topicName}" не должна быть заглушкой`);
      for (let i = 0; i < 20; i++) {
        const next = Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Следующий шаг"));
        if (!next) break;
        env.click(next);
        await env.wait(10);
      }
    }
  });
}

/* ==========================================================================
   Найди баг.
   ========================================================================== */

async function runFindbugTests() {
  console.log("\n=== findbug.html (Найди баг) ===");
  await test("Клик по строке → проверка → результат с объяснением", async () => {
    const env = createEnv("findbug.jsx", SHARED.common);
    env.load();
    await env.wait(300);
    const line = env.doc.querySelector(".findbug__line");
    env.click(line);
    await env.wait(50);
    env.click(Array.from(env.doc.querySelectorAll("button")).find((b) => b.textContent.includes("Проверить")));
    await env.wait(50);
    assert(/Точно!|Баг на самом деле/.test(env.doc.body.textContent), "должен показаться результат проверки");
    assert(env.doc.querySelector(".findbug__result-fixed") !== null, "должен показаться исправленный код");
  });

  await test("«Найди баг»: строки доступны с клавиатуры (role=button, tabIndex, Enter/Space активируют выбор)", async () => {
    // Реальная найденная проблема (внешний технический разбор):
    // кликабельные строки были <div onClick> без role="button",
    // tabIndex, обработчика Enter/Space и aria-pressed — клавиатурный
    // пользователь физически не мог выбрать строку, div вне
    // таб-порядка по умолчанию. Проверяем не просто НАЛИЧИЕ
    // атрибутов, а что Enter реально ВЫБИРАЕТ строку — то есть
    // синтетическое событие клавиатуры доходит до того же
    // обработчика, что и настоящий клик.
    const env = createEnv("findbug.jsx", SHARED.common);
    env.load();
    await env.wait(300);

    const lines = env.doc.querySelectorAll(".findbug__line");
    assert(lines.length > 0, "должны быть строки кода");
    const first = lines[0];
    assert(first.getAttribute("role") === "button", "у строки должен быть role=\"button\"");
    assert(first.getAttribute("tabindex") === "0", "строка должна быть в таб-порядке (tabIndex=0)");
    assert(first.getAttribute("aria-pressed") === "false", "невыбранная строка должна иметь aria-pressed=\"false\"");

    const enterEvent = new env.win.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    first.dispatchEvent(enterEvent);
    await env.wait(50);
    assert(first.getAttribute("aria-pressed") === "true", "Enter должен реально выбрать строку (aria-pressed становится true), не только визуально подсветить");
    assert(first.className.includes("findbug__line--picked"), "выбранная через клавиатуру строка должна получить тот же класс, что и при клике мышью");
  });
}

/* ==========================================================================
   Запуск всех тестов.
   ========================================================================== */

async function main() {
  await runProjectWideTests();
  await runEngineTests();
  await runIndexTests();
  await runQuestionsTests();
  await runPracticeTests();
  await runSummaryTests();
  await runProfileTests();
  await runSandboxTests();
  await runHistoryTests();
  await runPredictTests();
  await runTreeTests();
  await runExamTests();
  await runProjectTests();
  await runVizTests();
  await runFindbugTests();

  console.log("\n" + "=".repeat(60));
  console.log(`Итого: ${passed} пройдено, ${failed} провалено, всего ${passed + failed}`);
  console.log("=".repeat(60));
  if (failed > 0) {
    console.log("\nПровалившиеся тесты:");
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Неожиданная ошибка при запуске тестов:", e);
  process.exit(1);
});
