function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ==========================================================================
   pages/shared/nav-icons.jsx — собственные монохромные SVG-иконки для
   навигации, вместо эмодзи (🏠📘🎲📊👤💻🎯🌙🎬🌳🔮📅🐛). Найденная
   проблема при разборе визуальной идентичности: эмодзи в навигации
   нормальны для прототипа, но для финального продукта — рендерятся
   по-разному в разных ОС/браузерах (разный стиль, разный цвет,
   иногда цветной эмодзи-набор конфликтует с общей монохромной
   палитрой). Простой line-art, 20×20, currentColor — эмодзи
   сознательно ОСТАВЛЕНЫ там, где дают эмоцию (🔥 серия, ⭐ XP в
   бейджах шапки), не в самой навигации.

   Все иконки — 20×20 viewBox, stroke-width 1.8, округлые концы/стыки
   — тот же визуальный вес, что и у Байта (mascot-icons.jsx), чтобы
   вместе они читались как одна система, а не два разных стиля.
   ========================================================================== */

const ICON_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
function IconHome({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("path", {
    d: "M3 9.5L10 3l7 6.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 8v8.5a.5.5 0 0 0 .5.5H8v-5h4v5h2.5a.5.5 0 0 0 .5-.5V8"
  }));
}
function IconBookOpen({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("path", {
    d: "M10 5.5C8.8 4.4 7 4 4.5 4.2a.5.5 0 0 0-.5.5v9.3a.5.5 0 0 0 .55.5c2.2-.2 3.75.15 4.95 1.1V5.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 5.5C11.2 4.4 13 4 15.5 4.2a.5.5 0 0 1 .5.5v9.3a.5.5 0 0 1-.55.5c-2.2-.2-3.75.15-4.95 1.1V5.5z"
  }));
}
function IconGitBranch({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "5",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "15",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "9",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 7v6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 9c0 3 3 0 8 0"
  }));
}
function IconShuffle({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("path", {
    d: "M3 5h3.5c1.5 0 2 .5 3 2l3 6c1 1.5 1.5 2 3 2H17"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.5 3.5L17 6l-2.5 2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 15h3.5c1.5 0 2-.5 3-2l.6-1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.5 12.5L17 15l-2.5 2.5"
  }));
}
function IconSparkle({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS, {
    fill: "currentColor",
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 3l1.3 3.7L13 8l-3.7 1.3L8 13l-1.3-3.7L3 8l3.7-1.3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 11l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"
  }));
}
function IconBug({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "7",
    width: "6",
    height: "8",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 7V5M8 5.5L7 4M12 5.5l1-1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 9H4M7 12H4M13 9h3M13 12h3"
  }));
}
function IconPlay({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "7.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.3 7.2l4.6 2.8-4.6 2.8z",
    fill: "currentColor",
    stroke: "none"
  }));
}
function IconTerminal({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("rect", {
    x: "2.5",
    y: "3.5",
    width: "15",
    height: "13",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 8l2.5 2.5L6 13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.5 13H14"
  }));
}
function IconTarget({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "3.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "0.6",
    fill: "currentColor"
  }));
}
function IconBarChart({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("path", {
    d: "M4 16V11M10 16V4M16 16v-7.5"
  }));
}
function IconCalendar({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4.5",
    width: "14",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 8h14M7 3v3M13 3v3"
  }));
}
function IconUser({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "7",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
  }));
}
function IconMoon({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, ICON_PROPS), /*#__PURE__*/React.createElement("path", {
    d: "M15.5 12.3A6.5 6.5 0 1 1 7.7 4.5a5.2 5.2 0 0 0 7.8 7.8z"
  }));
}
const NAV_ICON_BY_PAGE = {
  index: IconHome,
  questions: IconBookOpen,
  tree: IconGitBranch,
  practice: IconShuffle,
  predict: IconSparkle,
  findbug: IconBug,
  viz: IconPlay,
  sandbox: IconTerminal,
  project: IconTarget,
  summary: IconBarChart,
  history: IconCalendar,
  profile: IconUser,
  exam: IconMoon
};