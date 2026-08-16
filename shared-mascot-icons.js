/* ==========================================================================
   pages/shared/mascot-icons.jsx — SVG-компоненты Байта (иконка-лицо и
   полнофигурная иллюстрация). Реплики/хелперы (MASCOT_NAME,
   homeCompanionLine, hashStr) — в engine.js, здесь только визуал.
   ========================================================================== */

function MascotIllustration({
  size = 120,
  color = "currentColor",
  pose = "wave"
}) {
  const isCelebrate = pose === "celebrate";
  const isThink = pose === "think";
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 1.3,
    viewBox: "0 0 100 130",
    fill: "none",
    style: {
      flexShrink: 0
    }
  }, isCelebrate && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z",
    fill: color,
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M85 14l1.6 3.6L90 19l-3.4 1.4L85 24l-1.6-3.6L80 19l3.4-1.4z",
    fill: color,
    opacity: "0.85"
  })), pose === "wave" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-8 2-12 10-12 20",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c10-6 20-4 24-22",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  })) : isCelebrate ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-10-8-14-20-10-34",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c10-8 14-20 10-34",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  })) : isThink ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M26 82c-8 2-12 10-12 20",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M74 82c6-14 2-20-8-24",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  })) : null, /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "50",
    y2: "68",
    stroke: color,
    strokeWidth: "4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "22",
    y: "68",
    width: "56",
    height: "50",
    rx: "18",
    stroke: color,
    strokeWidth: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "12",
    x2: "50",
    y2: "22",
    stroke: color,
    strokeWidth: "4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "8",
    r: "4.2",
    fill: color
  }), /*#__PURE__*/React.createElement("rect", {
    x: "28",
    y: "22",
    width: "44",
    height: "38",
    rx: "14",
    stroke: color,
    strokeWidth: "4"
  }), isCelebrate ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M35 39.5c1.6-3 6.2-3 7.8 0",
    stroke: color,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M57 39.5c1.6-3 6.2-3 7.8 0",
    stroke: color,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "49.5",
    rx: "7.5",
    ry: "5",
    fill: color
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "41",
    cy: "41",
    r: "4.2",
    fill: color
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "59",
    cy: "41",
    r: "4.2",
    fill: color
  }), isThink ? /*#__PURE__*/React.createElement("path", {
    d: "M41 49.5c2.2 1.1 4.6 1.6 9 1.6s6.8-.5 9-1.6",
    stroke: color,
    strokeWidth: "4.5",
    strokeLinecap: "round",
    fill: "none"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M40 48c2.3 2 5.4 2.8 10 2.8s7.7-.8 10-2.8",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none"
  })));
}
function MascotIcon({
  size = 24,
  color = "currentColor",
  mood = "idle"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      flexShrink: 0
    }
  }, mood === "celebrate" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 4.2l.5 1.2L4.7 5.9l-1.2.5L3 7.6l-.5-1.2L1.3 5.9l1.2-.5z",
    fill: color,
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20.3 3.4l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z",
    fill: color,
    opacity: "0.85"
  })), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "7",
    x2: "12",
    y2: "3.4",
    stroke: color,
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "2.6",
    r: "1.3",
    fill: color
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "7",
    width: "16",
    height: "13",
    rx: "4.5",
    stroke: color,
    strokeWidth: "1.8"
  }), mood === "correct" || mood === "celebrate" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7.3 13.7c.55-1 2.15-1 2.7 0",
    stroke: color,
    strokeWidth: "1.6",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.3 13.7c.55-1 2.15-1 2.7 0",
    stroke: color,
    strokeWidth: "1.6",
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "12",
    cy: "17.1",
    rx: "2.5",
    ry: "1.7",
    fill: color
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "13.2",
    r: "1.5",
    fill: color
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "13.2",
    r: "1.5",
    fill: color
  }), mood === "wrong" ? /*#__PURE__*/React.createElement("path", {
    d: "M9.5 17c.75.4 1.6.6 2.5.6s1.75-.2 2.5-.6",
    stroke: color,
    strokeWidth: "1.6",
    strokeLinecap: "round",
    fill: "none"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M9 16.8c.8.7 1.9 1 3 1s2.2-.3 3-1",
    stroke: color,
    strokeWidth: "1.8",
    strokeLinecap: "round",
    fill: "none"
  })));
}