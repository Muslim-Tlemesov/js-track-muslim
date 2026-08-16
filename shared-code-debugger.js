/* ==========================================================================
   pages/shared/code-debugger.js — пошаговый отладчик — самодельный мини-парсер JS, вставляет снимки состояния переменных.

   Файл 9 из 18, на которые разбит движок (реорганизовано из 6
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
   pages/shared/engine-debugger.js — пошаговый отладчик: самодельный
   мини-парсер JS (без AST-библиотек), который вставляет "снимки"
   состояния переменных после каждого оператора и внутри каждой ветки
   if/цикла — так UI может листать готовый массив шагов, без реальной
   приостановки выполнения. Использует formatArg из engine-code.js.
   ========================================================================== */

function isIdentStart(ch) { return /[a-zA-Z_$]/.test(ch); }

function isIdentPart(ch) { return /[a-zA-Z0-9_$]/.test(ch); }


function readIdentifierAt(src, i) {
  if (i >= src.length || !isIdentStart(src[i])) return null;
  let j = i + 1;
  while (j < src.length && isIdentPart(src[j])) j++;
  return { word: src.slice(i, j), end: j };
}


function skipTrivia(src, i) {
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
    if (ch === "/" && src[i + 1] === "/") { let j = src.indexOf("\n", i); i = j === -1 ? n : j; continue; }
    if (ch === "/" && src[i + 1] === "*") { let j = src.indexOf("*/", i + 2); i = j === -1 ? n : j + 2; continue; }
    break;
  }
  return i;
}


// Находит индекс символа, парного открывающему на openIdx ('(' / '{' / '['),
// пропуская строки/шаблонные литералы/комментарии как непрозрачные блоки —
// тот же приём, что и в transformLoops выше.
function matchBracket(src, openIdx) {
  const open = src[openIdx];
  const close = open === "(" ? ")" : open === "{" ? "}" : "]";
  let depth = 0;
  let i = openIdx;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      i++;
      while (i < n) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") { let j = src.indexOf("\n", i); i = j === -1 ? n : j; continue; }
    if (ch === "/" && src[i + 1] === "*") { let j = src.indexOf("*/", i + 2); i = j === -1 ? n : j + 2; continue; }
    if (ch === open) { depth++; i++; continue; }
    if (ch === close) { depth--; i++; if (depth === 0) return i - 1; continue; }
    i++;
  }
  return n - 1;
}


function splitTopLevelCommas(str) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch; i++;
      while (i < str.length) {
        if (str[i] === "\\") { i += 2; continue; }
        if (str[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) { parts.push(str.slice(start, i)); start = i + 1; }
  }
  parts.push(str.slice(start));
  return parts;
}


function extractDeclaredNames(raw) {
  const m = /^\s*(let|const|var)\s+/.exec(raw);
  if (!m) return [];
  const rest = raw.slice(m[0].length);
  const parts = splitTopLevelCommas(rest);
  const names = [];
  parts.forEach((p) => {
    // деструктуризация ({a,b}/[a,b]) сознательно не поддерживается —
    // см. пояснение в комментарии к разделу выше.
    const nm = /^\s*([a-zA-Z_$][\w$]*)/.exec(p);
    if (nm) names.push(nm[1]);
  });
  return names;
}


function extractTopLevelDeclaredName(raw) {
  const m = /^\s*function\s*\*?\s+([a-zA-Z_$][\w$]*)/.exec(raw);
  return m ? m[1] : null;
}


function extractForLoopVarNames(headerSrc) {
  const inner = headerSrc.slice(1, -1);
  const m = /^\s*(let|const|var)\s+([a-zA-Z_$][\w$]*)/.exec(inner);
  return m ? [m[2]] : [];
}


function parseSimpleStatement(src, from, to) {
  let i = from;
  let depth = 0;
  while (i < to) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch; i++;
      while (i < to) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") { let j = src.indexOf("\n", i); i = (j === -1 || j > to) ? to : j; continue; }
    if (ch === "/" && src[i + 1] === "*") { let j = src.indexOf("*/", i + 2); i = (j === -1 || j > to) ? to : j + 2; continue; }
    if (ch === "(" || ch === "[" || ch === "{") { depth++; i++; continue; }
    if (ch === ")" || ch === "]" || ch === "}") { depth--; i++; continue; }
    if (ch === ";" && depth <= 0) { i++; break; }
    i++;
  }
  return { kind: "simple", start: from, end: i, raw: src.slice(from, i) };
}


// function/try/switch/class целиком — не заходим внутрь (см. пояснение выше).
function parseAtomicBlockStatement(src, from, to) {
  let j = from;
  let depth = 0;
  while (j < to) {
    const ch = src[j];
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch; j++;
      while (j < to) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      continue;
    }
    if (ch === "(" || ch === "[") { depth++; j++; continue; }
    if (ch === ")" || ch === "]") { depth--; j++; continue; }
    if (ch === "{" && depth === 0) break;
    j++;
  }
  if (j >= to) return { kind: "atomic", start: from, end: to, raw: src.slice(from, to) };
  const close = matchBracket(src, j);
  const end = close + 1;
  return { kind: "atomic", start: from, end, raw: src.slice(from, end) };
}


function parseBlockOrSingle(src, i, to) {
  i = skipTrivia(src, i);
  if (src[i] === "{") {
    const close = matchBracket(src, i);
    return { braced: true, innerStart: i + 1, innerEnd: close, end: close + 1 };
  }
  const node = parseOneStatement(src, i, to);
  return { braced: false, single: node, end: node.end };
}


function parseIfChain(src, i, to) {
  const start = i;
  i += 2; // 'if'
  i = skipTrivia(src, i);
  const condOpen = i;
  const condClose = matchBracket(src, condOpen);
  const cond = { start: condOpen, end: condClose + 1 };
  const thenBody = parseBlockOrSingle(src, condClose + 1, to);
  let end = thenBody.end;
  let elseBody = null;
  let j = skipTrivia(src, end);
  const elseId = readIdentifierAt(src, j);
  if (elseId && elseId.word === "else") {
    let k = skipTrivia(src, elseId.end);
    const ifId = readIdentifierAt(src, k);
    if (ifId && ifId.word === "if") {
      const nested = parseIfChain(src, k, to);
      elseBody = { kind: "if-node", node: nested };
      end = nested.end;
    } else {
      const blk = parseBlockOrSingle(src, k, to);
      elseBody = { kind: "block-or-single", value: blk };
      end = blk.end;
    }
  }
  return { kind: "if", start, end, cond, thenBody, elseBody };
}


function parseLoopHeaderAndBody(src, i, to, keyword) {
  const start = i;
  i += keyword.length;
  i = skipTrivia(src, i);
  const parenOpen = i;
  const parenClose = matchBracket(src, parenOpen);
  const header = { start: parenOpen, end: parenClose + 1 };
  const body = parseBlockOrSingle(src, parenClose + 1, to);
  return { kind: "loop", keyword, start, end: body.end, header, body };
}


function parseDoWhile(src, i, to) {
  const start = i;
  i += 2; // 'do'
  const body = parseBlockOrSingle(src, i, to);
  let j = skipTrivia(src, body.end);
  const whileId = readIdentifierAt(src, j);
  let end = body.end;
  let header = null;
  if (whileId && whileId.word === "while") {
    let k = skipTrivia(src, whileId.end);
    const parenClose = matchBracket(src, k);
    header = { start: k, end: parenClose + 1 };
    end = parenClose + 1;
    let m = skipTrivia(src, end);
    if (src[m] === ";") end = m + 1;
  }
  return { kind: "dowhile", start, end, header, body };
}


function parseOneStatement(src, i, to) {
  i = skipTrivia(src, i);
  const id = readIdentifierAt(src, i);
  const word = id ? id.word : null;
  if (word === "if") return parseIfChain(src, i, to);
  if (word === "for" || word === "while") return parseLoopHeaderAndBody(src, i, to, word);
  if (word === "do") return parseDoWhile(src, i, to);
  if (word === "function" || word === "try" || word === "switch" || word === "class") {
    return parseAtomicBlockStatement(src, i, to);
  }
  return parseSimpleStatement(src, i, to);
}


function parseStatements(src, from, to) {
  const stmts = [];
  let i = skipTrivia(src, from);
  while (i < to) {
    const node = parseOneStatement(src, i, to);
    stmts.push(node);
    const next = skipTrivia(src, node.end);
    if (next <= i) break; // защита от зависания при неожиданном вводе
    i = next;
  }
  return stmts;
}


function lineOf(src, pos) {
  let line = 0;
  for (let k = 0; k < pos && k < src.length; k++) if (src[k] === "\n") line++;
  return line;
}


// {a, b} — сокращённая запись свойств объекта: значения a и b подставятся
// из текущей области видимости в момент вызова __dbgSnap, никакой
// дополнительной «рефлексии» переменных не требуется.
function makeSnapshotCall(src, pos, vars) {
  const line = lineOf(src, pos);
  const obj = vars.length === 0 ? "{}" : `{${vars.join(", ")}}`;
  return `\n__dbgSnap(${line}, ${obj});\n`;
}


function emitStatements(src, stmts, knownVars, out) {
  let vars = knownVars.slice();
  for (const node of stmts) {
    if (node.kind === "simple") {
      out.push(node.raw);
      extractDeclaredNames(node.raw).forEach((n) => { if (!vars.includes(n)) vars.push(n); });
      out.push(makeSnapshotCall(src, node.end, vars));
    } else if (node.kind === "atomic") {
      out.push(node.raw);
      const nm = extractTopLevelDeclaredName(node.raw);
      if (nm && !vars.includes(nm)) vars.push(nm);
      out.push(makeSnapshotCall(src, node.end, vars));
    } else if (node.kind === "if") {
      out.push(src.slice(node.start, node.cond.end));
      emitBranchBody(src, node.thenBody, vars, out);
      if (node.elseBody) {
        out.push(" else ");
        if (node.elseBody.kind === "if-node") {
          emitStatements(src, [node.elseBody.node], vars, out);
        } else {
          emitBranchBody(src, node.elseBody.value, vars, out);
        }
      }
    } else if (node.kind === "loop") {
      out.push(src.slice(node.start, node.header.end));
      const loopVars = extractForLoopVarNames(src.slice(node.header.start, node.header.end));
      const bodyVars = vars.concat(loopVars.filter((v) => !vars.includes(v)));
      emitBranchBody(src, node.body, bodyVars, out);
    } else if (node.kind === "dowhile") {
      out.push("do ");
      emitBranchBody(src, node.body, vars, out);
      if (node.header) {
        out.push(" while " + src.slice(node.header.start, node.header.end) + ";");
      }
    }
  }
}


// Тело блока инструментируется своей копией списка известных переменных
// (vars.slice() у вызывающей emitStatements) — поэтому let/const, объявленные
// внутри if/for/while, естественным образом не «протекают» в снимки ПОСЛЕ
// выхода из блока, как и в настоящем JS.
function emitBranchBody(src, body, vars, out) {
  if (body.braced) {
    out.push("{\n");
    const inner = parseStatements(src, body.innerStart, body.innerEnd);
    emitStatements(src, inner, vars, out);
    out.push("}\n");
  } else {
    out.push("{\n");
    emitStatements(src, [body.single], vars, out);
    out.push("}\n");
  }
}


const MAX_DEBUG_STEPS = 500;


function instrumentForDebugger(code) {
  const stmts = parseStatements(code, 0, code.length);
  const out = [];
  emitStatements(code, stmts, [], out);
  return out.join("");
}


/**
 * Выполняет код пользователя в пошаговом режиме и возвращает список
 * «снимков»: { line, vars, logs } — номер строки исходника, значения
 * переменных сразу после её выполнения и console.log, вызванные именно
 * в этой строке. UI затем просто листает готовый массив шагов.
 *
 * @param {string} code
 * @returns {{steps: Array<{line:number, vars:Object, logs:string[]}>, error: string|null}}
 */
function runUserCodeStepByStep(code) {
  const steps = [];
  let pendingLogs = [];
  const fakeConsole = {
    log: (...args) => pendingLogs.push(args.map(formatArg).join(" ")),
  };
  function __dbgSnap(line, vars) {
    if (steps.length >= MAX_DEBUG_STEPS) {
      throw new Error("Слишком много шагов — похоже на бесконечный цикл. Проверь условие выхода.");
    }
    steps.push({ line, vars, logs: pendingLogs });
    pendingLogs = [];
  }
  let instrumented;
  try {
    instrumented = instrumentForDebugger(code);
  } catch (e) {
    return { steps: [], error: "Не получилось разобрать код для пошагового режима: " + e.message };
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("console", "__dbgSnap", instrumented);
    fn(fakeConsole, __dbgSnap);
    if (pendingLogs.length) {
      steps.push({ line: steps.length ? steps[steps.length - 1].line : null, vars: steps.length ? steps[steps.length - 1].vars : {}, logs: pendingLogs });
    }
    return { steps, error: null };
  } catch (e) {
    return { steps, error: e.message };
  }
}


/**
 * Форматирует значение переменной для отображения в панели отладчика:
 * строки — в кавычках, функции — как ƒ (), остальное — через JSON.stringify.
 * @param {*} v
 */
function formatDebugValue(v) {
  if (typeof v === "function") return "ƒ ()";
  if (typeof v === "string") return `"${v}"`;
  if (v === undefined) return "undefined";
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

/* ==========================================================================
   Произношение терминов (Web Speech API) — используется LessonCard.
   ========================================================================== */

/* ==========================================================================
   pages/shared/engine-editor.js — подсветка синтаксиса (без внешних
   библиотек), автодополнение в редакторе кода, короткий звук верного
   ответа через Web Audio API.
   ========================================================================== */

