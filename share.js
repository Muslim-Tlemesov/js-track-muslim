/* ==========================================================================
   pages/share.jsx — публичная карточка прогресса (снимок на момент
   генерации ссылки, не живой профиль). Без Header/навигации — эта
   страница может открыть человек, который вообще не пользуется
   js.track, поэтому она максимально самодостаточна и объясняет, что
   это за сайт, а не только показывает цифры.
   ========================================================================== */

function pluralizeRu(n, one, few, many) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
function ShareCard({
  data
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter share-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__badge"
  }, "js.track"), /*#__PURE__*/React.createElement("div", {
    className: "share-card__title"
  }, data.certName ? `${data.certName} изучает JavaScript` : "Прогресс изучения JavaScript"), /*#__PURE__*/React.createElement("div", {
    className: "share-card__pct"
  }, data.overallPct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "share-card__pct-label"
  }, "\u043A\u0443\u0440\u0441\u0430 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stats-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-value"
  }, rankTitle(data.rank)), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-label"
  }, "\u0437\u0432\u0430\u043D\u0438\u0435")), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-value"
  }, data.xp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-label"
  }, "\u043E\u043F\u044B\u0442\u0430")), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-value"
  }, data.streakCount > 0 ? `${data.streakCount} ${pluralizeRu(data.streakCount, "день", "дня", "дней")}` : "—"), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-label"
  }, "\u0441\u0435\u0440\u0438\u044F")), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-value"
  }, data.achievementsUnlocked, "/", data.achievementsTotal), /*#__PURE__*/React.createElement("div", {
    className: "share-card__stat-label"
  }, "\u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439"))), /*#__PURE__*/React.createElement("div", {
    className: "share-card__note"
  }, "\u042D\u0442\u043E \u0441\u043D\u0438\u043C\u043E\u043A \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430 \u043D\u0430 \u043C\u043E\u043C\u0435\u043D\u0442, \u043A\u043E\u0433\u0434\u0430 \u0431\u044B\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u2014 \u043D\u0435 \u0436\u0438\u0432\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430."), /*#__PURE__*/React.createElement("a", {
    href: "index.html",
    className: "share-card__cta"
  }, "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C js.track \u0441\u0430\u043C\u043E\u043C\u0443 \u2192"));
}
function InvalidCard() {
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter share-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "share-card__badge"
  }, "js.track"), /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty-state__message"
  }, "\u042D\u0442\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u0430.")), /*#__PURE__*/React.createElement("a", {
    href: "index.html",
    className: "share-card__cta"
  }, "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 js.track \u2192"));
}
function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  React.useEffect(() => {
    (async () => {
      setThemeMode(await loadAndApplyTheme());
    })();
  }, []);
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("d");
  const data = encoded ? decodeShareData(encoded) : null;
  return /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content share-page"
  }, data ? /*#__PURE__*/React.createElement(ShareCard, {
    data: data
  }) : /*#__PURE__*/React.createElement(InvalidCard, null));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));