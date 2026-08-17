/* ==========================================================================
   pages/shared/Header.jsx — шапка для многостраничной версии. Главное
   отличие от старой SPA-версии: вместо onClick+setMode (переключение
   состояния в памяти) — настоящие <a href="..."> ссылки (переход между
   реальными HTML-страницами). "Активная" кнопка определяется тем,
   совпадает ли её href с текущей страницей (currentPage), а не JS-
   состоянием mode.

   Тема/звук по-прежнему переключаются БЕЗ перезагрузки страницы (это не
   навигация, а мгновенное локальное действие) — у них остаётся React
   state и onClick, как раньше.

   РЕДИЗАЙН: раньше все 13 разделов + сброс/звук/тема лежали одним
   рядом из 16 кнопок в app-header — реальная проблема, найденная при
   разборе: такой ряд не говорит пользователю "вот что делать дальше",
   а вываливает весь список сразу, без иерархии важности. Теперь два
   уровня: НА ВИДУ — только "Домой" и "Вопросы" (два самых частых
   действия), ОСТАЛЬНОЕ — за одной кнопкой-меню, сгруппированное по
   смыслу (Обучение / Инструменты / Прогресс), плюс настройки внизу
   того же меню.
   ========================================================================== */

const HEADER_PRIMARY_ITEMS = [{
  page: "index",
  href: "index.html",
  icon: "🏠",
  label: "Домой"
}, {
  page: "questions",
  href: "questions.html",
  icon: "📘",
  label: "Вопросы"
}];
const HEADER_MENU_GROUPS = [{
  title: "Обучение",
  items: [{
    page: "practice",
    href: "practice.html",
    icon: "🎲",
    label: "Практика"
  }, {
    page: "exam",
    href: "exam.html",
    icon: "🌙",
    label: "Экзамен"
  }, {
    page: "viz",
    href: "viz.html",
    icon: "🎬",
    label: "Визуализации"
  }, {
    page: "predict",
    href: "predict.html",
    icon: "🔮",
    label: "Предскажи вывод"
  }, {
    page: "findbug",
    href: "findbug.html",
    icon: "🐛",
    label: "Найди баг"
  }]
}, {
  title: "Инструменты",
  items: [{
    page: "sandbox",
    href: "sandbox.html",
    icon: "💻",
    label: "Консоль"
  }, {
    page: "project",
    href: "project.html",
    icon: "🎯",
    label: "Мини-проект"
  }]
}, {
  title: "Прогресс",
  items: [{
    page: "summary",
    href: "summary.html",
    icon: "📊",
    label: "Итоги"
  }, {
    page: "history",
    href: "history.html",
    icon: "📅",
    label: "История"
  }, {
    page: "tree",
    href: "tree.html",
    icon: "🌳",
    label: "Карта знаний"
  }, {
    page: "profile",
    href: "profile.html",
    icon: "👤",
    label: "Профиль"
  }]
}];

/**
 * @param {Object} props
 * @param {string} props.currentPage - "index"|"questions"|"summary"|... — какая страница открыта сейчас
 * @param {number} props.totalCorrect
 * @param {number} props.totalQuestions
 * @param {number} props.overallPct
 * @param {Object|null} props.streak
 * @param {number} props.xp
 * @param {number} props.rank
 * @param {number} props.rankXpForNext
 * @param {number} props.rankXpIntoRank
 * @param {number} props.achievementsCount
 * @param {number} props.achievementsTotal
 * @param {string} props.themeMode
 * @param {Function} props.onToggleTheme
 * @param {boolean} props.soundEnabled
 * @param {Function} props.onToggleSound
 * @param {Function} props.onResetProgress
 */
function Header({
  currentPage,
  totalCorrect,
  totalQuestions,
  overallPct,
  streak,
  xp,
  rank,
  rankXpForNext,
  rankXpIntoRank,
  achievementsCount,
  achievementsTotal,
  themeMode,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onResetProgress
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  // Активный раздел меню подсвечивает саму кнопку-триггер — так видно,
  // что "текущая страница где-то там", даже когда меню закрыто.
  const isPrimaryPage = HEADER_PRIMARY_ITEMS.some(item => item.page === currentPage);
  const activeGroupTitle = !isPrimaryPage ? HEADER_MENU_GROUPS.find(g => g.items.some(item => item.page === currentPage))?.title : null;
  return /*#__PURE__*/React.createElement("header", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header__brand"
  }, /*#__PURE__*/React.createElement("a", {
    href: "index.html",
    className: "app-header__mascot",
    title: "\u0411\u0430\u0439\u0442 \u2014 \u043C\u0430\u0441\u043A\u043E\u0442 js.track"
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 18,
    color: "var(--accent)"
  })), /*#__PURE__*/React.createElement("a", {
    href: "index.html",
    className: "app-header__logo",
    style: {
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono app-header__logo-accent"
  }, "{"), "js", /*#__PURE__*/React.createElement("span", {
    className: "app-header__logo-accent"
  }, "."), "track", /*#__PURE__*/React.createElement("span", {
    className: "mono app-header__logo-accent"
  }, "}")), /*#__PURE__*/React.createElement("span", {
    className: "app-tagline app-header__tagline"
  }, "\u043E\u0442 Beginner \u0434\u043E Junior \xB7 \u0442\u043E\u043B\u044C\u043A\u043E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 JS")), /*#__PURE__*/React.createElement("div", {
    className: "header-actions app-header__actions"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header__stats"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono app-header__stats-count"
  }, totalCorrect, "/", totalQuestions), "\u0432\u0435\u0440\u043D\u043E \xB7 ", overallPct, "% \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E"), streak && streak.count > 0 && /*#__PURE__*/React.createElement("div", {
    className: "app-header__badge",
    title: `Дней подряд с занятиями${streak.best > streak.count ? ` · лучшая серия: ${streak.best}` : ""}`
  }, "\uD83D\uDD25 ", streak.count, " ", streak.count === 1 ? "день" : streak.count < 5 ? "дня" : "дней"), /*#__PURE__*/React.createElement("div", {
    className: "app-header__badge",
    title: `${xp} XP всего · до следующего звания осталось ${Math.max(0, rankXpForNext - rankXpIntoRank)} XP`
  }, "\u2B50 ", rankTitle(rank), " \xB7 ", xp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "app-header__badge app-header__badge--achievements",
    title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F"
  }, "\uD83C\uDFC6 ", achievementsCount, "/", achievementsTotal), HEADER_PRIMARY_ITEMS.map(item => /*#__PURE__*/React.createElement("a", {
    key: item.page,
    href: item.href,
    className: `nav-btn nav__btn${currentPage === item.page ? " nav__btn--active" : ""}`,
    "aria-current": currentPage === item.page ? "page" : undefined
  }, item.icon, " ", item.label)), /*#__PURE__*/React.createElement("button", {
    className: `nav-btn nav__btn app-header__menu-trigger${activeGroupTitle ? " nav__btn--active" : ""}${menuOpen ? " app-header__menu-trigger--open" : ""}`,
    onClick: () => setMenuOpen(v => !v),
    "aria-expanded": menuOpen,
    "aria-haspopup": "true"
  }, "\u2630 ", activeGroupTitle || "Меню")), menuOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-backdrop",
    onClick: () => setMenuOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-panel",
    role: "menu"
  }, HEADER_MENU_GROUPS.map(group => /*#__PURE__*/React.createElement("div", {
    key: group.title,
    className: "app-header__menu-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-group-title"
  }, group.title), /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-group-items"
  }, group.items.map(item => /*#__PURE__*/React.createElement("a", {
    key: item.page,
    href: item.href,
    className: `nav-btn nav__btn${currentPage === item.page ? " nav__btn--active" : ""}`,
    "aria-current": currentPage === item.page ? "page" : undefined
  }, item.icon, " ", item.label))))), /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-group-title"
  }, "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"), /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-group-items"
  }, /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn nav__btn--dim",
    onClick: onResetProgress,
    "aria-label": "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441"
  }, "\u21BA \u0421\u0431\u0440\u043E\u0441"), /*#__PURE__*/React.createElement("button", {
    className: `nav-btn nav__btn${soundEnabled ? "" : " nav__btn--dim"}`,
    onClick: onToggleSound,
    "aria-label": soundEnabled ? "Выключить звук" : "Включить звук"
  }, soundEnabled ? "🔊 Звук вкл" : "🔇 Звук выкл"), /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn",
    onClick: onToggleTheme,
    "aria-label": "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0442\u0435\u043C\u0443"
  }, themeMode === "dark" ? "☀️ Светлая" : "🌙 Тёмная"))))));
}