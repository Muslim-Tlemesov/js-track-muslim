/* ==========================================================================
   pages/shared/Common.jsx — маленькие переиспользуемые UI-примитивы,
   нужные больше чем одной странице (Домой, Итоги, Профиль).
   ========================================================================== */

/** Круговой индикатор прогресса (0-100%). color — необязательное
    переопределение (иначе done ? success : accent). */
function CircularProgress({
  pct,
  size = 56,
  strokeWidth = 5,
  done,
  color
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - Math.min(pct, 100) / 100 * c;
  const resolvedColor = color || (done ? "var(--success)" : "var(--accent)");
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--border)",
    strokeWidth: strokeWidth
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: resolvedColor,
    strokeWidth: strokeWidth,
    strokeDasharray: c,
    strokeDashoffset: offset,
    strokeLinecap: "round",
    transform: `rotate(-90 ${size / 2} ${size / 2})`,
    style: {
      transition: "stroke-dashoffset 0.5s ease"
    }
  }), /*#__PURE__*/React.createElement("text", {
    x: "50%",
    y: "50%",
    textAnchor: "middle",
    dy: "0.35em",
    className: "mono",
    fontSize: size * 0.22,
    fill: "var(--text)",
    fontWeight: "700"
  }, pct, "%"));
}

/** Карточка-показатель dashboard'а — эмодзи + значение + цветная полоска сверху. */
function DashboardCard({
  emoji,
  label,
  value,
  stripeColor
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "topic-card dashboard-card",
    style: {
      "--stripe-color": stripeColor
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__stripe"
  }), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__body"
  }, emoji && /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__emoji"
  }, emoji), /*#__PURE__*/React.createElement("div", {
    className: "mono dashboard-card__value"
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__label"
  }, label)));
}

/** Компактная карточка с одним числовым показателем. */
function StatCard({
  value,
  label,
  color
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono stat-card__value",
    style: {
      color
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "stat-card__label"
  }, label));
}