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

/**
 * Реальный найденный пробел (внешний технический разбор): React
 * рендерится в продакшене без единого Error Boundary по всему
 * проекту — любая необработанная ошибка рендера (а их 14 страниц,
 * каждая со своей сложной логикой) обрушивает всё дерево в пустой
 * белый экран без объяснения и без возможности восстановиться, а
 * прогресс в это время уже сохранён в localStorage/IndexedDB (не
 * теряется), просто пользователь об этом не узнает, глядя на белый
 * экран. Один общий компонент оборачивает <PageRoot /> на каждой из
 * 14 страниц — упавший рендер показывает понятное сообщение с кнопкой
 * перезагрузки вместо тишины.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }
  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }
  componentDidCatch(error, info) {
    // Приложение без бэкенда — отправлять телеметрию некуда, но след
    // в консоли остаётся для отладки через удалённый доступ/скриншот.
    console.error("js.track: необработанная ошибка рендера", error, info);
  }
  render() {
    if (this.state.hasError) {
      return /*#__PURE__*/React.createElement("div", {
        className: "error-boundary"
      }, /*#__PURE__*/React.createElement(MascotIcon, {
        size: 40,
        mood: "wrong"
      }), /*#__PURE__*/React.createElement("div", {
        className: "error-boundary__title"
      }, "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A"), /*#__PURE__*/React.createElement("div", {
        className: "error-boundary__desc"
      }, "\u041D\u0435\u043F\u0440\u0435\u0434\u0432\u0438\u0434\u0435\u043D\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B. \u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0443\u0436\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u2014 \u043C\u043E\u0436\u043D\u043E \u0441\u043F\u043E\u043A\u043E\u0439\u043D\u043E \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C."), /*#__PURE__*/React.createElement("button", {
        className: "btn btn--primary",
        onClick: () => window.location.reload()
      }, "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C"));
    }
    return this.props.children;
  }
}