/* ==========================================================================
   pages/shared/mascot-icons.jsx — SVG-компоненты Байта (иконка-лицо и
   полнофигурная иллюстрация). Реплики/хелперы (MASCOT_NAME,
   homeCompanionLine, hashStr) — в data-achievements.js, здесь только
   визуал.

   БАЙТ 2.0 — сохранена форма головы, антенна, минимализм, узнаваемое
   лицо (по итогам разбора: "не менять на другого персонажа, сделать
   2.0"). Добавлено: единый словарь настроений (mood) вместо
   разрозненных pose/mood с ручным цветом на каждом вызове — теперь
   цвет определяется настроением автоматически (см.
   MASCOT_MOOD_COLOR_VAR ниже), плюс несколько новых поз (idle/wrong/
   streak/launch) и лёгкие аксессуары (лампочка при "think", огонёк
   при "streak", ракета при "launch").
   ========================================================================== */

/**
 * Настроение → CSS-переменная цвета. НЕ жёстко прописанный цвет —
 * именно ИМЯ переменной, чтобы явный проп color (если передан)
 * мог полностью её переопределить, а сама переменная переключалась
 * вместе с темой без участия JS.
 */
const MASCOT_MOOD_COLOR_VAR = {
  idle: "var(--accent)",
  wave: "var(--accent)",
  think: "var(--mascot-think)",
  correct: "var(--success)",
  wrong: "var(--mascot-wrong)",
  celebrate: "var(--mascot-celebrate)",
  streak: "var(--mascot-streak)",
  launch: "var(--mascot-celebrate)"
};
function MascotIllustration({
  size = 120,
  color,
  mood = "idle",
  pose,
  animated = true
}) {
  // pose — устаревшее имя пропа, оставлено для обратной совместимости
  // на случай, если где-то ещё не обновлён вызов.
  const m = pose || mood;
  const c = color || MASCOT_MOOD_COLOR_VAR[m] || MASCOT_MOOD_COLOR_VAR.idle;
  const isCelebrate = m === "celebrate" || m === "launch";
  const isThink = m === "think";
  const isWrong = m === "wrong";
  const isStreak = m === "streak";
  const isLaunch = m === "launch";
  // Глаза-кружки (не закрытые/счастливые) есть у idle/wave/think/
  // streak/wrong — только там уместен блик "жизни" в зрачке.
  const hasOpenEyes = !isCelebrate && m !== "correct" && !isWrong;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 1.3,
    viewBox: "0 0 100 130",
    fill: "none",
    style: {
      flexShrink: 0,
      overflow: "visible"
    },
    className: animated ? `mascot-illustration mascot-illustration--${m}` : undefined
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "122",
    rx: "26",
    ry: "4",
    fill: c,
    opacity: "0.12"
  }), isCelebrate && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    className: "mascot-illustration__sparkle--1",
    d: "M12 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    className: "mascot-illustration__sparkle--2",
    d: "M85 14l1.6 3.6L90 19l-3.4 1.4L85 24l-1.6-3.6L80 19l3.4-1.4z",
    fill: c
  })), isThink &&
  /*#__PURE__*/
  // Лампочка-аксессуар — "учим новую тему, смотри внимательно".
  React.createElement("g", {
    className: "mascot-illustration__bulb",
    opacity: "0.9"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "82",
    cy: "18",
    r: "7",
    stroke: c,
    strokeWidth: "3",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M82 25v4M78 31h8",
    stroke: c,
    strokeWidth: "3",
    strokeLinecap: "round"
  })), isStreak &&
  /*#__PURE__*/
  // Огонёк-аксессуар — серия дней подряд.
  React.createElement("path", {
    className: "mascot-illustration__flame",
    d: "M80 16c0 5-4 6-4 10a4 4 0 0 0 8 0c0-1-1-2-1-3 2 1 3 3 3 5a6 6 0 0 1-12 0c0-6 6-8 6-12z",
    fill: c
  }), isLaunch &&
  /*#__PURE__*/
  // Ракета-аксессуар — курс пройден полностью.
  React.createElement("g", {
    transform: "translate(78 8) rotate(35)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 0c3 0 5 4 5 9s-2 6-5 6-5-1-5-6 2-9 5-9z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12l-3 5 5-1M10 12l3 5-5-1",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "7",
    r: "2",
    fill: "var(--bg)"
  })), m === "wave" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-8 2-12 10-12 20",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    className: "mascot-illustration__wave-arm",
    d: "M74 82c10-6 20-4 24-22",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })) : isCelebrate ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-10-8-14-20-10-34",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c10-8 14-20 10-34",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })) : isThink ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-8 2-12 10-12 20",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c6-14 2-20-8-24",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })) : isWrong ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-8 2-12 10-12 20",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c8-2 4-16-6-20",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })) : m === "correct" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-10-4-16-12-14-24",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c10-4 16-12 14-24",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })) : isStreak ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-8 2-12 10-12 20",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c12-2 18 2 20-16",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })) :
  /*#__PURE__*/
  // idle — обе руки спокойно опущены вдоль тела
  React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-6 4-9 12-8 22",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c6 4 9 12 8 22",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "50",
    y2: "68",
    stroke: c,
    strokeWidth: "4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "22",
    y: "68",
    width: "56",
    height: "50",
    rx: "18",
    stroke: c,
    strokeWidth: "4",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "12",
    x2: "50",
    y2: "22",
    stroke: c,
    strokeWidth: "4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "mascot-illustration__antenna-dot",
    cx: "50",
    cy: "8",
    r: "4.2",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "28",
    y: "22",
    width: "44",
    height: "38",
    rx: "14",
    stroke: c,
    strokeWidth: "4",
    strokeLinejoin: "round"
  }), isCelebrate ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M35 39.5c1.6-3 6.2-3 7.8 0",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M57 39.5c1.6-3 6.2-3 7.8 0",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "49.5",
    rx: "7.5",
    ry: "5",
    fill: c
  })) : m === "correct" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M35 39.5c1.6-3 6.2-3 7.8 0",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M57 39.5c1.6-3 6.2-3 7.8 0",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M40 48c2.3 3 5.4 4.3 10 4.3s7.7-1.3 10-4.3",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  })) : isWrong ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M37 40.5l7-2.5M56 38l7 2.5",
    stroke: c,
    strokeWidth: "3.6",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "41",
    cy: "42.5",
    r: "3.6",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "59",
    cy: "42.5",
    r: "3.6",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M43 51.5c2-1.6 4.6-2.3 7-2.3s5 .7 7 2.3",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    className: "mascot-illustration__eye",
    cx: "41",
    cy: "41",
    r: "4.2",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    className: "mascot-illustration__eye",
    cx: "59",
    cy: "41",
    r: "4.2",
    fill: c
  }), hasOpenEyes && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "42.3",
    cy: "39.7",
    r: "1.1",
    fill: "var(--bg)",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60.3",
    cy: "39.7",
    r: "1.1",
    fill: "var(--bg)",
    opacity: "0.9"
  })), isThink ? /*#__PURE__*/React.createElement("path", {
    d: "M41 49.5c2.2 1.1 4.6 1.6 9 1.6s6.8-.5 9-1.6",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }) : m === "idle" ? /*#__PURE__*/React.createElement("path", {
    d: "M43 49c1.7 1.2 4.1 1.8 7 1.8s5.3-.6 7-1.8",
    stroke: c,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M40 48c2.3 2 5.4 2.8 10 2.8s7.7-.8 10-2.8",
    stroke: c,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  })));
}
function MascotIcon({
  size = 24,
  color,
  mood = "idle"
}) {
  const c = color || MASCOT_MOOD_COLOR_VAR[mood] || MASCOT_MOOD_COLOR_VAR.idle;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      flexShrink: 0
    },
    className: `mascot-icon mascot-icon--${mood}`
  }, mood === "celebrate" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 4.2l.5 1.2L4.7 5.9l-1.2.5L3 7.6l-.5-1.2L1.3 5.9l1.2-.5z",
    fill: c,
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20.3 3.4l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z",
    fill: c,
    opacity: "0.85"
  })), mood === "streak" && /*#__PURE__*/React.createElement("path", {
    d: "M17.5 4.5c0 2-1.6 2.4-1.6 4a1.6 1.6 0 0 0 3.2 0c0-.4-.4-.8-.4-1.2.8.4 1.2 1.2 1.2 2a2.4 2.4 0 0 1-4.8 0c0-2.4 2.4-3.2 2.4-4.8z",
    fill: c
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "7",
    x2: "12",
    y2: "3.4",
    stroke: c,
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "2.6",
    r: "1.3",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "7",
    width: "16",
    height: "13",
    rx: "4.5",
    stroke: c,
    strokeWidth: "1.8"
  }), mood === "correct" || mood === "celebrate" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7.3 13.7c.55-1 2.15-1 2.7 0",
    stroke: c,
    strokeWidth: "1.6",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.3 13.7c.55-1 2.15-1 2.7 0",
    stroke: c,
    strokeWidth: "1.6",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "12",
    cy: "17.1",
    rx: "2.5",
    ry: "1.7",
    fill: c
  })) : mood === "wrong" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 13.3l2-.9M14 12.4l2 .9",
    stroke: c,
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "14",
    r: "1.4",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "14",
    r: "1.4",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 17.3c.75-.55 1.6-.8 2.5-.8s1.75.25 2.5.8",
    stroke: c,
    strokeWidth: "1.6",
    strokeLinecap: "round",
    fill: "none"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "13.2",
    r: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "13.2",
    r: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 16.8c.8.7 1.9 1 3 1s2.2-.3 3-1",
    stroke: c,
    strokeWidth: "1.8",
    strokeLinecap: "round",
    fill: "none"
  })));
}