/* ==========================================================================
   pages/viz.jsx — «Визуализации»: переключатель между темами. Все 6
   визуализаций (Event Loop/Scope/Замыкания/this/Prototype/Event
   Bubbling) полностью реализованы — каждая по ~150-230 строк
   собственной пошаговой логики, суммарно сопоставимо по объёму с
   целой страницей «Вопросы». Поле ready на VIZ_TOPICS ниже оставлено
   архитектурно (не как техдолг, а как явный переключатель) — если
   добавится новая, ещё не готовая визуализация, её можно будет
   пометить ready: false и она сама покажет честную заглушку «скоро»
   (см. ниже), вместо недоделанной страницы под видом готовой.
   ========================================================================== */

const VIZ_TOPICS = [{
  id: "eventloop",
  label: "Event Loop",
  ready: true
}, {
  id: "scope",
  label: "Scope",
  ready: true
}, {
  id: "closures",
  label: "Замыкания",
  ready: true
}, {
  id: "this",
  label: "this",
  ready: true
}, {
  id: "prototype",
  label: "Prototype",
  ready: true
}, {
  id: "bubbling",
  label: "Event Bubbling",
  ready: true
}];
const EVENT_LOOP_CODE = ["console.log('1');", "", "setTimeout(() => {", "  console.log('2');", "}, 0);", "", "Promise.resolve().then(() => {", "  console.log('3');", "});", "", "console.log('4');"];
const EVENT_LOOP_STEPS = [{
  line: null,
  callStack: [],
  webApis: [],
  microtasks: [],
  macrotasks: [],
  output: [],
  note: "Начинаем. Все зоны пусты, скрипт ещё не запущен."
}, {
  line: 0,
  callStack: ["console.log('1')"],
  webApis: [],
  microtasks: [],
  macrotasks: [],
  output: [],
  note: "console.log('1') — синхронный код, попадает прямо в Call Stack."
}, {
  line: 0,
  callStack: [],
  webApis: [],
  microtasks: [],
  macrotasks: [],
  output: ["1"],
  note: "Строка выполнена и тут же снята со стека. '1' уже в консоли."
}, {
  line: 2,
  callStack: ["setTimeout(...)"],
  webApis: [],
  microtasks: [],
  macrotasks: [],
  output: ["1"],
  note: "setTimeout вызван — сам вызов синхронный, попадает в Call Stack на мгновение."
}, {
  line: 2,
  callStack: [],
  webApis: ["⏱ таймер 0мс"],
  microtasks: [],
  macrotasks: [],
  output: ["1"],
  note: "setTimeout передаёт колбэк браузеру (Web API) и сразу освобождает стек — JS не ждёт таймер."
}, {
  line: 2,
  callStack: [],
  webApis: [],
  microtasks: [],
  macrotasks: ["console.log('2')"],
  output: ["1"],
  note: "Таймер (0мс) истёк мгновенно — колбэк переехал в Callback Queue (macrotask), но выполнится не сразу."
}, {
  line: 6,
  callStack: ["Promise.resolve().then(...)"],
  webApis: [],
  microtasks: [],
  macrotasks: ["console.log('2')"],
  output: ["1"],
  note: "Promise.resolve().then(...) вызван — тоже синхронный вызов, попадает в стек на мгновение."
}, {
  line: 6,
  callStack: [],
  webApis: [],
  microtasks: ["console.log('3')"],
  macrotasks: ["console.log('2')"],
  output: ["1"],
  note: "Уже разрешённый промис кладёт колбэк сразу в Microtask Queue — она отдельная и приоритетнее очереди колбэков."
}, {
  line: 10,
  callStack: ["console.log('4')"],
  webApis: [],
  microtasks: ["console.log('3')"],
  macrotasks: ["console.log('2')"],
  output: ["1"],
  note: "console.log('4') — снова синхронный код, выполняется прямо сейчас, без очередей."
}, {
  line: 10,
  callStack: [],
  webApis: [],
  microtasks: ["console.log('3')"],
  macrotasks: ["console.log('2')"],
  output: ["1", "4"],
  note: "'4' в консоли. Весь синхронный код скрипта закончился — Call Stack пуст."
}, {
  line: null,
  callStack: [],
  webApis: [],
  microtasks: ["console.log('3')"],
  macrotasks: ["console.log('2')"],
  output: ["1", "4"],
  note: "Event Loop смотрит: стек пуст → сначала ВСЕГДА проверяется Microtask Queue, а не Callback Queue."
}, {
  line: 7,
  callStack: ["console.log('3')"],
  webApis: [],
  microtasks: [],
  macrotasks: ["console.log('2')"],
  output: ["1", "4"],
  note: "Микротаска перенесена в стек и выполняется — раньше, чем макротаска из setTimeout."
}, {
  line: 7,
  callStack: [],
  webApis: [],
  microtasks: [],
  macrotasks: ["console.log('2')"],
  output: ["1", "4", "3"],
  note: "'3' в консоли — и это раньше '2', хотя setTimeout был вызван раньше в коде!"
}, {
  line: null,
  callStack: [],
  webApis: [],
  microtasks: [],
  macrotasks: ["console.log('2')"],
  output: ["1", "4", "3"],
  note: "Microtask Queue пуста. Только теперь Event Loop берёт задачу из Callback Queue."
}, {
  line: 3,
  callStack: ["console.log('2')"],
  webApis: [],
  microtasks: [],
  macrotasks: [],
  output: ["1", "4", "3"],
  note: "Колбэк из setTimeout наконец выполняется — последним, хотя был запланирован раньше промиса."
}, {
  line: 3,
  callStack: [],
  webApis: [],
  microtasks: [],
  macrotasks: [],
  output: ["1", "4", "3", "2"],
  note: "Готово! Итоговый порядок: 1, 4, 3, 2 — сначала весь синхронный код, потом микротаски, и только потом макротаски."
}];
function EventLoopZone({
  title,
  items,
  colorVar,
  emptyHint
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "viz__zone"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono viz__zone-title",
    style: {
      color: `var(${colorVar})`
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "viz__zone-items"
  }, items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__zone-empty"
  }, emptyHint) : items.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "mono viz__zone-item",
    style: {
      "--zone-color": `var(${colorVar})`
    }
  }, item))));
}
function EventLoopViz() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = EVENT_LOOP_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === EVENT_LOOP_STEPS.length - 1;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "viz__intro"
  }, "\u041E\u0434\u0438\u043D \u0438 \u0442\u043E\u0442 \u0436\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043B\u043E\u043C\u0430\u0435\u0442 \u0438\u043D\u0442\u0443\u0438\u0446\u0438\u044E \u043F\u043E\u0447\u0442\u0438 \u0443 \u0432\u0441\u0435\u0445 \u043D\u043E\u0432\u0438\u0447\u043A\u043E\u0432: \u043F\u043E\u0447\u0435\u043C\u0443 setTimeout(fn, 0) \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043D\u0435 \u0441\u0440\u0430\u0437\u0443, \u0430 Promise \u2014 \u0440\u0430\u043D\u044C\u0448\u0435 \u043D\u0435\u0433\u043E? \u041F\u0440\u043E\u0439\u0434\u0438 \u043F\u043E \u0448\u0430\u0433\u0430\u043C \u0438 \u0443\u0432\u0438\u0434\u0438\u0448\u044C, \u043A\u0430\u043A \u043A\u043E\u0434 \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0434\u0432\u0438\u0436\u0435\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0437\u043E\u043D\u0430\u043C\u0438."), /*#__PURE__*/React.createElement("pre", {
    className: "mono viz__code"
  }, EVENT_LOOP_CODE.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `viz__code-line${step.line === i ? " viz__code-line--active" : ""}`
  }, line || "\u00A0"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__zones"
  }, /*#__PURE__*/React.createElement(EventLoopZone, {
    title: "Call Stack",
    items: step.callStack,
    colorVar: "--accent",
    emptyHint: "\u043F\u0443\u0441\u0442\u043E"
  }), /*#__PURE__*/React.createElement(EventLoopZone, {
    title: "Web APIs",
    items: step.webApis,
    colorVar: "--accent2",
    emptyHint: "\u043F\u0443\u0441\u0442\u043E"
  }), /*#__PURE__*/React.createElement(EventLoopZone, {
    title: "Microtask Queue",
    items: step.microtasks,
    colorVar: "--success",
    emptyHint: "\u043F\u0443\u0441\u0442\u043E"
  }), /*#__PURE__*/React.createElement(EventLoopZone, {
    title: "Callback Queue",
    items: step.macrotasks,
    colorVar: "--text-dim",
    emptyHint: "\u043F\u0443\u0441\u0442\u043E"
  })), /*#__PURE__*/React.createElement("div", {
    className: "viz__note"
  }, step.note), /*#__PURE__*/React.createElement("div", {
    className: "viz__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__console-body"
  }, step.output.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : step.output.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "viz__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__console-arrow"
  }, "\u276F "), l)))), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", stepIdx + 1, " \u0438\u0437 ", EVENT_LOOP_STEPS.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(0),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.max(0, i - 1)),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.min(EVENT_LOOP_STEPS.length - 1, i + 1)),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующий шаг →"))));
}
function ComingSoonViz({
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement(MascotIllustration, {
    size: 72,
    mood: "think"
  }), /*#__PURE__*/React.createElement("div", {
    className: "empty-state__message"
  }, "\u0412\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \xAB", label, "\xBB \u0441\u043A\u043E\u0440\u043E \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C."));
}

/* ==========================================================================
   Scope — цепочка областей видимости.
   ========================================================================== */

const SCOPE_CODE = ["let x = 'global';", "", "function outer() {", "  let y = 'outer';", "", "  function inner() {", "    let z = 'inner';", "    console.log(x, y, z);", "  }", "", "  inner();", "}", "", "outer();"];
const SCOPE_G = {
  name: "Global",
  vars: [{
    name: "x",
    value: "'global'"
  }]
};
const SCOPE_O = {
  name: "outer()",
  vars: [{
    name: "y",
    value: "'outer'"
  }]
};
const SCOPE_I = {
  name: "inner()",
  vars: [{
    name: "z",
    value: "'inner'"
  }]
};
const SCOPE_STEPS = [{
  line: null,
  scopes: [],
  lookup: null,
  output: [],
  note: "Начинаем. Пока не создано ни одной области видимости, кроме глобальной."
}, {
  line: 0,
  scopes: [SCOPE_G],
  lookup: null,
  output: [],
  note: "let x — переменная попадает в глобальную область видимости."
}, {
  line: 13,
  scopes: [SCOPE_G],
  lookup: null,
  output: [],
  note: "outer() вызывается — это создаст новую область видимости, вложенную в глобальную."
}, {
  line: 2,
  scopes: [SCOPE_G, {
    name: "outer()",
    vars: []
  }],
  lookup: null,
  output: [],
  note: "Внутри outer() открывается новая, вложенная область видимости."
}, {
  line: 3,
  scopes: [SCOPE_G, SCOPE_O],
  lookup: null,
  output: [],
  note: "let y — переменная попадает в область видимости outer(), а не в глобальную."
}, {
  line: 10,
  scopes: [SCOPE_G, SCOPE_O],
  lookup: null,
  output: [],
  note: "inner() вызывается — откроется ещё одна, ещё более вложенная область видимости."
}, {
  line: 5,
  scopes: [SCOPE_G, SCOPE_O, {
    name: "inner()",
    vars: []
  }],
  lookup: null,
  output: [],
  note: "Внутри inner() — третий, самый вложенный уровень."
}, {
  line: 6,
  scopes: [SCOPE_G, SCOPE_O, SCOPE_I],
  lookup: null,
  output: [],
  note: "let z — переменная видна только внутри inner()."
}, {
  line: 7,
  scopes: [SCOPE_G, SCOPE_O, SCOPE_I],
  lookup: {
    variable: "z",
    foundIn: "inner()"
  },
  output: [],
  note: "console.log ищет z — и сразу находит её в текущей, самой близкой области видимости."
}, {
  line: 7,
  scopes: [SCOPE_G, SCOPE_O, SCOPE_I],
  lookup: {
    variable: "y",
    foundIn: "outer()"
  },
  output: [],
  note: "Ищет y — в inner() такой переменной нет, поднимается на уровень выше, в outer() — находит."
}, {
  line: 7,
  scopes: [SCOPE_G, SCOPE_O, SCOPE_I],
  lookup: {
    variable: "x",
    foundIn: "Global"
  },
  output: [],
  note: "Ищет x — нет ни в inner(), ни в outer(), поднимается до самого верха, в Global — находит."
}, {
  line: 7,
  scopes: [SCOPE_G, SCOPE_O, SCOPE_I],
  lookup: null,
  output: ["global outer inner"],
  note: "Все три переменные найдены. Это и есть цепочка областей видимости — поиск идёт снизу вверх, изнутри наружу."
}, {
  line: 8,
  scopes: [SCOPE_G, SCOPE_O],
  lookup: null,
  output: ["global outer inner"],
  note: "inner() завершился — его область видимости (и z вместе с ней) уничтожается."
}, {
  line: 11,
  scopes: [SCOPE_G],
  lookup: null,
  output: ["global outer inner"],
  note: "outer() тоже завершился — его область видимости (и y) тоже уничтожается."
}, {
  line: null,
  scopes: [SCOPE_G],
  lookup: null,
  output: ["global outer inner"],
  note: "Остаётся только глобальная область видимости с x. Важно: снаружи никогда не видно y и z — подняться по цепочке можно только изнутри наружу, не наоборот."
}];
function ScopeNested({
  scopes,
  lookup
}) {
  if (scopes.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "viz__scope-empty"
    }, "\u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u043E");
  }
  function renderLevel(i) {
    const s = scopes[i];
    const isDeepest = i === scopes.length - 1;
    const highlighted = lookup && lookup.foundIn === s.name;
    return /*#__PURE__*/React.createElement("div", {
      key: s.name,
      className: `viz__scope-box${highlighted ? " viz__scope-box--highlight" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "mono viz__scope-name"
    }, s.name), s.vars.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "viz__scope-vars"
    }, s.vars.map(v => /*#__PURE__*/React.createElement("div", {
      key: v.name,
      className: "mono viz__scope-var"
    }, v.name, " = ", /*#__PURE__*/React.createElement("span", {
      className: "viz__scope-var-value"
    }, v.value)))), !isDeepest && /*#__PURE__*/React.createElement("div", {
      className: "viz__scope-child"
    }, renderLevel(i + 1)));
  }
  return renderLevel(0);
}
function ScopeViz() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = SCOPE_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === SCOPE_STEPS.length - 1;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "viz__intro"
  }, "\u0412\u043B\u043E\u0436\u0435\u043D\u043D\u0430\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u0432\u0438\u0434\u0438\u0442 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u0444\u0443\u043D\u043A\u0446\u0438\u0439 \u2014 \u0430 \u0441\u043D\u0430\u0440\u0443\u0436\u0438 \u0432\u043D\u0443\u0442\u0440\u044C \u0437\u0430\u0433\u043B\u044F\u043D\u0443\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F. \u041F\u0440\u043E\u0439\u0434\u0438 \u043F\u043E \u0448\u0430\u0433\u0430\u043C \u0438 \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438, \u043A\u0430\u043A \u0443\u0441\u0442\u0440\u043E\u0435\u043D \u043F\u043E\u0438\u0441\u043A \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0432\u0432\u0435\u0440\u0445 \u043F\u043E \u0446\u0435\u043F\u043E\u0447\u043A\u0435."), /*#__PURE__*/React.createElement("pre", {
    className: "mono viz__code"
  }, SCOPE_CODE.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `viz__code-line${step.line === i ? " viz__code-line--active" : ""}`
  }, line || "\u00A0"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__scope-wrap"
  }, /*#__PURE__*/React.createElement(ScopeNested, {
    scopes: step.scopes,
    lookup: step.lookup
  })), step.lookup && /*#__PURE__*/React.createElement("div", {
    className: "viz__lookup-note"
  }, "\u0438\u0449\u0435\u043C ", /*#__PURE__*/React.createElement("span", {
    className: "mono viz__lookup-var"
  }, step.lookup.variable), " \u2192 \u043D\u0430\u0448\u043B\u0438 \u0432 ", /*#__PURE__*/React.createElement("span", {
    className: "mono viz__lookup-found"
  }, step.lookup.foundIn)), /*#__PURE__*/React.createElement("div", {
    className: "viz__note"
  }, step.note), /*#__PURE__*/React.createElement("div", {
    className: "viz__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__console-body"
  }, step.output.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : step.output.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "viz__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__console-arrow"
  }, "\u276F "), l)))), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", stepIdx + 1, " \u0438\u0437 ", SCOPE_STEPS.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(0),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.max(0, i - 1)),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.min(SCOPE_STEPS.length - 1, i + 1)),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующий шаг →"))));
}

/* ==========================================================================
   Замыкания (Closures).
   ========================================================================== */

const CLOSURE_CODE = ["function makeCounter() {", "  let count = 0;", "", "  return function () {", "    count++;", "    return count;", "  };", "}", "", "const counter = makeCounter();", "", "console.log(counter());", "console.log(counter());", "console.log(counter());"];
const CLOSURE_STEPS = [{
  line: null,
  box: null,
  output: [],
  note: "Начинаем. Замыкания пока не существует."
}, {
  line: 9,
  box: null,
  output: [],
  note: "makeCounter() вызывается."
}, {
  line: 1,
  box: {
    count: 0
  },
  output: [],
  note: "Внутри makeCounter() создаётся область видимости с count = 0."
}, {
  line: 3,
  box: {
    count: 0
  },
  output: [],
  note: "Возвращается внутренняя функция — она 'запоминает' область видимости makeCounter(), в которой была создана. Это и есть замыкание."
}, {
  line: 9,
  box: {
    count: 0,
    dying: true
  },
  output: [],
  note: "Обычно, когда функция завершается, её переменные уничтожаются — но не в этот раз: возвращённая функция всё ещё держит на них ссылку, поэтому область видимости остаётся живой."
}, {
  line: 9,
  box: {
    count: 0
  },
  output: [],
  note: "counter — это функция, к которой 'приклеена' её личная копия области видимости с count."
}, {
  line: 11,
  box: {
    count: 0,
    active: true
  },
  output: [],
  note: "counter() вызывается впервые."
}, {
  line: 4,
  box: {
    count: 1,
    active: true
  },
  output: [],
  note: "count++ — меняется та самая переменная count из замыкания, не новая."
}, {
  line: 5,
  box: {
    count: 1
  },
  output: ["1"],
  note: "Возвращается 1."
}, {
  line: 12,
  box: {
    count: 1,
    active: true
  },
  output: ["1"],
  note: "counter() вызывается второй раз — это тот же самый counter, то же самое замыкание."
}, {
  line: 4,
  box: {
    count: 2,
    active: true
  },
  output: ["1"],
  note: "count++ снова — но count не сбросился в 0! Замыкание помнит предыдущее значение между вызовами."
}, {
  line: 5,
  box: {
    count: 2
  },
  output: ["1", "2"],
  note: "Возвращается 2."
}, {
  line: 13,
  box: {
    count: 2,
    active: true
  },
  output: ["1", "2"],
  note: "Третий вызов — снова то же самое замыкание."
}, {
  line: 4,
  box: {
    count: 3,
    active: true
  },
  output: ["1", "2"],
  note: "count++ ещё раз → 3."
}, {
  line: 5,
  box: {
    count: 3
  },
  output: ["1", "2", "3"],
  note: "Итог: 1, 2, 3. Каждый вызов counter() не начинает с нуля — потому что count живёт в замыкании, которое существует, пока существует сама функция counter."
}];
function ClosureViz() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = CLOSURE_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === CLOSURE_STEPS.length - 1;
  const boxState = !step.box ? "" : step.box.active ? " viz__closure-box--active" : step.box.dying ? " viz__closure-box--dying" : "";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "viz__intro"
  }, "\u041F\u043E\u0447\u0435\u043C\u0443 count \u043D\u0435 \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0432 0 \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u043D\u043E\u0432\u043E\u043C \u0432\u044B\u0437\u043E\u0432\u0435 counter()? \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u043B\u0430 \u0443\u043C\u0435\u0440\u0435\u0442\u044C \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 makeCounter() \u2014 \u043D\u043E \u043D\u0435 \u0443\u043C\u0438\u0440\u0430\u0435\u0442. \u0421\u043C\u043E\u0442\u0440\u0438, \u043F\u043E\u0447\u0435\u043C\u0443."), /*#__PURE__*/React.createElement("pre", {
    className: "mono viz__code"
  }, CLOSURE_CODE.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `viz__code-line${step.line === i ? " viz__code-line--active" : ""}`
  }, line || "\u00A0"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__closure-wrap"
  }, step.box === null ? /*#__PURE__*/React.createElement("div", {
    className: "viz__scope-empty"
  }, "\u0437\u0430\u043C\u044B\u043A\u0430\u043D\u0438\u044F \u043F\u043E\u043A\u0430 \u043D\u0435\u0442") : /*#__PURE__*/React.createElement("div", {
    className: `viz__closure-box${boxState}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono viz__closure-label"
  }, "\u0437\u0430\u043C\u044B\u043A\u0430\u043D\u0438\u0435 makeCounter()"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__closure-value"
  }, "count = ", step.box.count), step.box.dying && /*#__PURE__*/React.createElement("div", {
    className: "viz__closure-dying-note"
  }, "\u043E\u0431\u044B\u0447\u043D\u043E \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u0438\u043B\u043E\u0441\u044C \u0431\u044B \u2014 \u043D\u043E \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0436\u0438\u0432\u043E"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__note"
  }, step.note), /*#__PURE__*/React.createElement("div", {
    className: "viz__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__console-body"
  }, step.output.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : step.output.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "viz__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__console-arrow"
  }, "\u276F "), l)))), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", stepIdx + 1, " \u0438\u0437 ", CLOSURE_STEPS.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(0),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.max(0, i - 1)),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.min(CLOSURE_STEPS.length - 1, i + 1)),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующий шаг →"))));
}

/* ==========================================================================
   this — контекст вызова.
   ========================================================================== */

const THIS_CODE = ["const obj = {", "  name: 'Аяулым',", "  regular: function () {", "    return this.name;", "  },", "};", "", "const extracted = obj.regular;", "", "console.log(obj.regular());", "console.log(extracted());"];
const THIS_STEPS = [{
  line: null,
  binding: null,
  output: [],
  note: "Начинаем."
}, {
  line: 0,
  binding: null,
  output: [],
  note: "Создаётся obj — объект с именем и методом regular."
}, {
  line: 7,
  binding: null,
  output: [],
  note: "extracted = obj.regular — та же самая функция копируется в отдельную переменную. Сама функция не хранит внутри себя 'какой это объект' — this определится только в момент вызова."
}, {
  line: 9,
  binding: {
    label: "obj",
    detail: "вызвана как obj.regular() — через точку"
  },
  output: [],
  note: "obj.regular() — функция вызвана через obj, с точкой перед ней. Именно это делает this внутри равным obj."
}, {
  line: 3,
  binding: {
    label: "obj",
    detail: "this.name → obj.name"
  },
  output: [],
  note: "this.name обращается к свойству name у this, а this сейчас — obj."
}, {
  line: 9,
  binding: {
    label: "obj"
  },
  output: ["Аяулым"],
  note: "Возвращается 'Аяулым'."
}, {
  line: 10,
  binding: {
    label: "не obj",
    detail: "вызвана как extracted() — без объекта перед точкой"
  },
  output: ["Аяулым"],
  note: "extracted() — та же самая функция, но вызвана сама по себе, без объекта перед ней. this внутри уже не obj."
}, {
  line: 3,
  binding: {
    label: "не obj",
    detail: "this.name → undefined"
  },
  output: ["Аяулым"],
  note: "this.name теперь ищет свойство name у чего-то, что не является obj — такого свойства там нет."
}, {
  line: 10,
  binding: {
    label: "не obj"
  },
  output: ["Аяулым", "undefined"],
  note: "Возвращается undefined. Одна и та же функция дала два разных результата — потому что this зависит от того, КАК функцию вызвали, а не от того, где она объявлена."
}];
function ThisViz() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = THIS_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === THIS_STEPS.length - 1;
  const isBound = step.binding && step.binding.label === "obj";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "viz__intro"
  }, "\u041E\u0434\u043D\u0430 \u0438 \u0442\u0430 \u0436\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u044F, \u0432\u044B\u0437\u0432\u0430\u043D\u043D\u0430\u044F \u0434\u0432\u0443\u043C\u044F \u0440\u0430\u0437\u043D\u044B\u043C\u0438 \u0441\u043F\u043E\u0441\u043E\u0431\u0430\u043C\u0438, \u0434\u0430\u0451\u0442 \u0434\u0432\u0430 \u0440\u0430\u0437\u043D\u044B\u0445 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430. this \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F \u043D\u0435 \u0442\u0430\u043C, \u0433\u0434\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0430, \u0430 \u0442\u0430\u043C, \u0433\u0434\u0435 \u0438 \u041A\u0410\u041A \u043E\u043D\u0430 \u0432\u044B\u0437\u0432\u0430\u043D\u0430."), /*#__PURE__*/React.createElement("pre", {
    className: "mono viz__code"
  }, THIS_CODE.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `viz__code-line${step.line === i ? " viz__code-line--active" : ""}`
  }, line || "\u00A0"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__this-wrap"
  }, step.binding === null ? /*#__PURE__*/React.createElement("div", {
    className: "viz__scope-empty"
  }, "this \u0435\u0449\u0451 \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D") : /*#__PURE__*/React.createElement("div", {
    className: `viz__this-box${isBound ? " viz__this-box--bound" : " viz__this-box--unbound"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono viz__this-label"
  }, "this \u2192"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__this-value"
  }, step.binding.label), step.binding.detail && /*#__PURE__*/React.createElement("div", {
    className: "viz__this-detail"
  }, step.binding.detail))), /*#__PURE__*/React.createElement("div", {
    className: "viz__note"
  }, step.note), /*#__PURE__*/React.createElement("div", {
    className: "viz__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__console-body"
  }, step.output.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : step.output.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "viz__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__console-arrow"
  }, "\u276F "), l)))), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", stepIdx + 1, " \u0438\u0437 ", THIS_STEPS.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(0),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.max(0, i - 1)),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.min(THIS_STEPS.length - 1, i + 1)),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующий шаг →"))));
}

/* ==========================================================================
   Prototype — цепочка прототипов.
   ========================================================================== */

const PROTOTYPE_CODE = ["const animal = {", "  eats: true,", "  walk() { return 'идёт'; }", "};", "", "const rabbit = Object.create(animal);", "rabbit.jumps = true;", "", "console.log(rabbit.jumps);", "console.log(rabbit.eats);", "console.log(rabbit.walk());", "console.log(rabbit.flies);"];
const P_RABBIT_EMPTY = {
  name: "rabbit",
  vars: []
};
const P_RABBIT_FULL = {
  name: "rabbit",
  vars: [{
    name: "jumps",
    value: "true"
  }]
};
const P_ANIMAL = {
  name: "animal",
  vars: [{
    name: "eats",
    value: "true"
  }, {
    name: "walk",
    value: "ƒ ()"
  }]
};
const P_OBJECT_PROTO = {
  name: "Object.prototype",
  vars: [{
    name: "hasOwnProperty",
    value: "ƒ ()"
  }, {
    name: "toString",
    value: "ƒ ()"
  }]
};
const P_NULL = {
  name: "null",
  vars: []
};
const PROTOTYPE_STEPS = [{
  line: null,
  chain: [],
  lookup: null,
  output: [],
  note: "Начинаем. Пока не создано ни одного объекта."
}, {
  line: 0,
  chain: [],
  lookup: null,
  output: [],
  note: "Создаём animal — обычный объект со свойством eats и методом walk."
}, {
  line: 5,
  chain: [P_RABBIT_EMPTY, P_ANIMAL],
  lookup: null,
  output: [],
  note: "rabbit создаётся через Object.create(animal) — это значит, что скрытая ссылка rabbit → [[Prototype]] указывает на animal. Собственных свойств у rabbit пока нет."
}, {
  line: 6,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: null,
  output: [],
  note: "rabbit.jumps = true — добавляем СОБСТВЕННОЕ свойство прямо на rabbit, а не в animal."
}, {
  line: 8,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: {
    variable: "jumps",
    foundIn: "rabbit"
  },
  output: [],
  note: "rabbit.jumps — движок сначала смотрит на сам rabbit. Находит сразу же — это собственное свойство, подниматься по цепочке не нужно."
}, {
  line: 8,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: {
    variable: "jumps",
    foundIn: "rabbit"
  },
  output: ["true"],
  note: "Выводится true."
}, {
  line: 9,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: {
    variable: "eats",
    foundIn: "animal"
  },
  output: ["true"],
  note: "rabbit.eats — на самом rabbit такого свойства нет. Движок поднимается по цепочке на уровень выше, в animal — и находит его там."
}, {
  line: 9,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: {
    variable: "eats",
    foundIn: "animal"
  },
  output: ["true", "true"],
  note: "Выводится true — свойство унаследовано из прототипа, а не лежит на самом rabbit."
}, {
  line: 10,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: {
    variable: "walk",
    foundIn: "animal"
  },
  output: ["true", "true"],
  note: "rabbit.walk() — метод walk тоже не свой у rabbit, находится в animal. Методы обычно живут именно в прототипе — так они не копируются в каждый отдельный объект."
}, {
  line: 10,
  chain: [P_RABBIT_FULL, P_ANIMAL],
  lookup: {
    variable: "walk",
    foundIn: "animal"
  },
  output: ["true", "true", "'идёт'"],
  note: "Выводится 'идёт'."
}, {
  line: 11,
  chain: [P_RABBIT_FULL, P_ANIMAL, P_OBJECT_PROTO, P_NULL],
  lookup: {
    variable: "flies",
    foundIn: null
  },
  output: ["true", "true", "'идёт'"],
  note: "rabbit.flies — ищем на rabbit (нет), поднимаемся в animal (нет), поднимаемся в Object.prototype (тоже нет). Цепочка заканчивается на null — подниматься дальше некуда."
}, {
  line: 11,
  chain: [P_RABBIT_FULL, P_ANIMAL, P_OBJECT_PROTO, P_NULL],
  lookup: {
    variable: "flies",
    foundIn: null
  },
  output: ["true", "true", "'идёт'", "undefined"],
  note: "Когда свойство не нашлось нигде вплоть до null — результат undefined. Это и есть цепочка прототипов: поиск идёт вверх по [[Prototype]], пока не найдётся значение или цепочка не закончится в null."
}];
function PrototypeChain({
  chain,
  lookup
}) {
  if (chain.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "viz__scope-empty"
    }, "\u0446\u0435\u043F\u043E\u0447\u043A\u0430 \u0435\u0449\u0451 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "viz__chain"
  }, chain.map((s, idx) => {
    const isNull = s.name === "null";
    const found = lookup && lookup.foundIn === s.name;
    const exhausted = isNull && lookup && lookup.foundIn === null;
    const dim = isNull || s.name === "Object.prototype";
    const stateClass = found ? " viz__chain-node--found" : exhausted ? " viz__chain-node--exhausted" : dim ? " viz__chain-node--dim" : "";
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: s.name
    }, idx > 0 && /*#__PURE__*/React.createElement("span", {
      className: "viz__chain-arrow"
    }, "\u2192"), /*#__PURE__*/React.createElement("div", {
      className: `viz__chain-node${isNull ? " viz__chain-node--null" : ""}${stateClass}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "mono viz__chain-node-name"
    }, s.name), s.vars.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "viz__chain-node-vars"
    }, s.vars.map(v => /*#__PURE__*/React.createElement("div", {
      key: v.name,
      className: "mono viz__chain-node-var"
    }, v.name, ": ", /*#__PURE__*/React.createElement("span", {
      className: "viz__chain-node-var-value"
    }, v.value))))));
  }));
}
function PrototypeViz() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = PROTOTYPE_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === PROTOTYPE_STEPS.length - 1;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "viz__intro"
  }, "\u041E\u0431\u044A\u0435\u043A\u0442 \u0432\u0438\u0434\u0438\u0442 \u043D\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0432\u043E\u0438 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430, \u043D\u043E \u0438 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0441\u0432\u043E\u0435\u0433\u043E \u043F\u0440\u043E\u0442\u043E\u0442\u0438\u043F\u0430 \u2014 \u0438 \u043F\u0440\u043E\u0442\u043E\u0442\u0438\u043F\u0430 \u043F\u0440\u043E\u0442\u043E\u0442\u0438\u043F\u0430, \u0438 \u0442\u0430\u043A \u0434\u0430\u043B\u0435\u0435 \u0432\u0432\u0435\u0440\u0445 \u043F\u043E \u0446\u0435\u043F\u043E\u0447\u043A\u0435, \u043F\u043E\u043A\u0430 \u043E\u043D\u0430 \u043D\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0441\u044F \u043D\u0430 null."), /*#__PURE__*/React.createElement("pre", {
    className: "mono viz__code"
  }, PROTOTYPE_CODE.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `viz__code-line${step.line === i ? " viz__code-line--active" : ""}`
  }, line || "\u00A0"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__chain-wrap"
  }, /*#__PURE__*/React.createElement(PrototypeChain, {
    chain: step.chain,
    lookup: step.lookup
  })), step.lookup && /*#__PURE__*/React.createElement("div", {
    className: "viz__lookup-note"
  }, "\u0438\u0449\u0435\u043C ", /*#__PURE__*/React.createElement("span", {
    className: "mono viz__lookup-var"
  }, step.lookup.variable), step.lookup.foundIn ? /*#__PURE__*/React.createElement(React.Fragment, null, " \u2192 \u043D\u0430\u0448\u043B\u0438 \u0432 ", /*#__PURE__*/React.createElement("span", {
    className: "mono viz__lookup-found"
  }, step.lookup.foundIn)) : /*#__PURE__*/React.createElement(React.Fragment, null, " \u2192 ", /*#__PURE__*/React.createElement("span", {
    className: "mono viz__lookup-notfound"
  }, "\u043D\u0438\u0433\u0434\u0435 \u043D\u0435 \u043D\u0430\u0448\u043B\u0438"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__note"
  }, step.note), /*#__PURE__*/React.createElement("div", {
    className: "viz__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__console-body"
  }, step.output.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : step.output.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "viz__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__console-arrow"
  }, "\u276F "), l)))), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", stepIdx + 1, " \u0438\u0437 ", PROTOTYPE_STEPS.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(0),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.max(0, i - 1)),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.min(PROTOTYPE_STEPS.length - 1, i + 1)),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующий шаг →"))));
}

/* ==========================================================================
   Event Bubbling — всплытие событий.
   ========================================================================== */

const BUBBLING_CODE = ["// <div id=\"outer\">", "//   <div id=\"middle\">", "//     <button id=\"inner\">Click me</button>", "//   </div>", "// </div>", "", "outer.addEventListener('click', () => console.log('outer'));", "middle.addEventListener('click', () => console.log('middle'));", "inner.addEventListener('click', () => console.log('inner'));", "", "// Пользователь кликает по кнопке inner"];
const BUBBLING_STEPS = [{
  line: null,
  active: null,
  fired: [],
  output: [],
  note: "Три вложенных элемента: outer содержит middle, middle содержит кнопку inner. У каждого свой обработчик click."
}, {
  line: 6,
  active: null,
  fired: [],
  output: [],
  note: "Вешаем обработчик на outer."
}, {
  line: 7,
  active: null,
  fired: [],
  output: [],
  note: "Вешаем обработчик на middle."
}, {
  line: 8,
  active: null,
  fired: [],
  output: [],
  note: "Вешаем обработчик на inner."
}, {
  line: 10,
  active: "inner",
  fired: [],
  output: [],
  note: "Пользователь кликает по кнопке. Событие рождается там, где произошёл клик, — на inner. Это цель события (event.target)."
}, {
  line: 8,
  active: "inner",
  fired: ["inner"],
  output: ["inner"],
  note: "Сначала срабатывает обработчик самого inner — это фаза цели (target phase)."
}, {
  line: 7,
  active: "middle",
  fired: ["inner"],
  output: ["inner"],
  note: "Дальше событие 'всплывает' — поднимается к родителю, middle. Кликали не по middle, но у него тоже есть обработчик click, и он тоже сработает."
}, {
  line: 7,
  active: "middle",
  fired: ["inner", "middle"],
  output: ["inner", "middle"],
  note: "Сработал обработчик middle."
}, {
  line: 6,
  active: "outer",
  fired: ["inner", "middle"],
  output: ["inner", "middle"],
  note: "Событие поднимается ещё выше — до outer."
}, {
  line: 6,
  active: "outer",
  fired: ["inner", "middle", "outer"],
  output: ["inner", "middle", "outer"],
  note: "Сработал и обработчик outer. Подниматься дальше некуда (кроме document) — всплытие завершено."
}, {
  line: null,
  active: null,
  fired: ["inner", "middle", "outer"],
  output: ["inner", "middle", "outer"],
  note: "Итог: один клик по inner вызвал ВСЕ три обработчика — от цели наружу. Это и есть bubbling. Именно поэтому работает делегирование событий: можно повесить один обработчик на outer и ловить клики по любым его потомкам."
}];
function DomBox({
  id,
  label,
  active,
  fired,
  children
}) {
  const isActive = active === id;
  const hasFired = fired.includes(id);
  const stateClass = isActive ? " viz__dom-box--active" : hasFired ? " viz__dom-box--fired" : "";
  return /*#__PURE__*/React.createElement("div", {
    className: `viz__dom-box${stateClass}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__dom-box-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono viz__dom-box-label"
  }, label), hasFired && /*#__PURE__*/React.createElement("span", {
    className: "viz__dom-box-check"
  }, "\u2713")), children);
}
function BubblingViz() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = BUBBLING_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === BUBBLING_STEPS.length - 1;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "viz__intro"
  }, "\u041A\u043B\u0438\u043A \u043F\u043E \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u043C\u0443 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0443 \u043D\u0435 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u043D\u0451\u043C \u2014 \u0441\u043E\u0431\u044B\u0442\u0438\u0435 \u043F\u043E\u0434\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F \u0432\u0432\u0435\u0440\u0445 \u043F\u043E \u0434\u0435\u0440\u0435\u0432\u0443 DOM, \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u044F \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0438 \u0432\u0441\u0435\u0445 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u0435\u0439 \u043F\u043E \u043F\u0443\u0442\u0438."), /*#__PURE__*/React.createElement("pre", {
    className: "mono viz__code"
  }, BUBBLING_CODE.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `viz__code-line${step.line === i ? " viz__code-line--active" : ""}`
  }, line || "\u00A0"))), /*#__PURE__*/React.createElement("div", {
    className: "viz__dom-wrap"
  }, /*#__PURE__*/React.createElement(DomBox, {
    id: "outer",
    label: "#outer",
    active: step.active,
    fired: step.fired
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__dom-box-child"
  }, /*#__PURE__*/React.createElement(DomBox, {
    id: "middle",
    label: "#middle",
    active: step.active,
    fired: step.fired
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__dom-box-child"
  }, /*#__PURE__*/React.createElement(DomBox, {
    id: "inner",
    label: "#inner (button)",
    active: step.active,
    fired: step.fired
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "viz__note"
  }, step.note), /*#__PURE__*/React.createElement("div", {
    className: "viz__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono viz__console-body"
  }, step.output.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "viz__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : step.output.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "viz__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__console-arrow"
  }, "\u276F "), l)))), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", stepIdx + 1, " \u0438\u0437 ", BUBBLING_STEPS.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(0),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.max(0, i - 1)),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStepIdx(i => Math.min(BUBBLING_STEPS.length - 1, i + 1)),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующий шаг →"))));
}
function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [topic, setTopic] = React.useState("eventloop");
  React.useEffect(() => {
    (async () => {
      const mode = await loadAndApplyTheme();
      setThemeMode(mode);
      try {
        const soundRes = await safeStorage.get(SOUND_KEY);
        if (soundRes && soundRes.value === "off") setSoundEnabled(false);
      } catch {/* звук включён по умолчанию */}
      const core = await loadCoreState();
      setHeaderState({
        ...core,
        achievementsTotal: ACHIEVEMENTS.length
      });
    })();
  }, []);
  const handleToggleTheme = async () => {
    setThemeMode(await toggleAndSaveTheme(themeMode));
  };
  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await safeStorage.set(SOUND_KEY, next ? "on" : "off");
  };
  const headerProps = headerState ? {
    currentPage: "viz",
    totalCorrect: headerState.totalCorrect,
    totalQuestions: headerState.totalQuestions,
    overallPct: headerState.overallPct,
    streak: headerState.streak,
    xp: headerState.xp,
    rank: headerState.rank,
    rankXpForNext: xpThresholdForRank(headerState.rank + 1) - xpThresholdForRank(headerState.rank),
    rankXpIntoRank: headerState.xp - xpThresholdForRank(headerState.rank),
    achievementsCount: Object.keys(headerState.unlockedAchievements).length,
    achievementsTotal: headerState.achievementsTotal,
    themeMode,
    onToggleTheme: handleToggleTheme,
    soundEnabled,
    onToggleSound: handleToggleSound,
    onResetProgress: handleResetProgressWithConfirm
  } : {
    currentPage: "viz",
    totalCorrect: 0,
    totalQuestions: ALL_QUESTIONS.length,
    overallPct: 0,
    streak: null,
    xp: 0,
    rank: 1,
    rankXpForNext: 30,
    rankXpIntoRank: 0,
    achievementsCount: 0,
    achievementsTotal: ACHIEVEMENTS.length,
    themeMode,
    onToggleTheme: handleToggleTheme,
    soundEnabled,
    onToggleSound: handleToggleSound,
    onResetProgress: handleResetProgressWithConfirm
  };
  const activeTopic = VIZ_TOPICS.find(t => t.id === topic);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter viz"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viz__topic-tabs"
  }, VIZ_TOPICS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTopic(t.id),
    className: `viz__topic-tab${topic === t.id ? " viz__topic-tab--active" : ""}`
  }, t.label, !t.ready && " · скоро"))), topic === "eventloop" ? /*#__PURE__*/React.createElement(EventLoopViz, null) : topic === "scope" ? /*#__PURE__*/React.createElement(ScopeViz, null) : topic === "closures" ? /*#__PURE__*/React.createElement(ClosureViz, null) : topic === "this" ? /*#__PURE__*/React.createElement(ThisViz, null) : topic === "prototype" ? /*#__PURE__*/React.createElement(PrototypeViz, null) : topic === "bubbling" ? /*#__PURE__*/React.createElement(BubblingViz, null) : /*#__PURE__*/React.createElement(ComingSoonViz, {
    label: activeTopic.label
  }))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(PageRoot, null)));