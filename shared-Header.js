/* ==========================================================================
   pages/shared/Header.jsx — шапка + боковая панель (десктоп) + нижняя
   таб-панель (мобильный) для многостраничной версии. Вместо
   onClick+setMode (старая SPA) — настоящие <a href="..."> ссылки.
   "Активная" кнопка/вкладка определяется тем, совпадает ли её href с
   текущей страницей (currentPage), а не JS-состоянием.

   Тема/звук переключаются БЕЗ перезагрузки страницы — у них остаётся
   React state и onClick.

   РЕДИЗАЙН (3 итерации): 1) все 13 разделов одним рядом из 16 кнопок —
   без иерархии. 2) свели к 2 кнопкам на виду + одному общему меню,
   затем к 4 равнозначным режимам с выпадающими списками — но всё
   ещё ОДНА горизонтальная панель на любом экране, просто по-разному
   сжатая. 3) (эта) — отдельная UX-архитектура по форм-фактору, не
   просто @media на одной и той же разметке: на десктопе — боковая
   панель слева (Sidebar, аккордеон — группы раскрываются прямо внутри
   колонки), на мобильном — нижняя таб-панель (BottomTabBar, 5 вкладок,
   группы с подпунктами открывают лист СНИЗУ ВВЕРХ). Сама шапка (App
   Header) теперь только бренд + компактная статистика + настройки —
   навигация целиком переехала в Sidebar/BottomTabBar. Header
   возвращает их как соседние элементы одного фрагмента — ни одна из
   13 страниц не редактировалась ради этого, они по-прежнему просто
   рендерят <Header {...props} />.
   ========================================================================== */

const HEADER_MAIN_NAV = [{
  key: "home",
  label: "Главная",
  page: "index",
  href: "index.html"
}, {
  key: "learn",
  label: "Учёба",
  items: [{
    page: "questions",
    href: "questions.html",
    label: "Вопросы"
  }, {
    page: "tree",
    href: "tree.html",
    label: "Карта знаний"
  }]
}, {
  key: "practice",
  label: "Практика",
  items: [{
    page: "practice",
    href: "practice.html",
    label: "Практика"
  }, {
    page: "predict",
    href: "predict.html",
    label: "Предскажи вывод"
  }, {
    page: "findbug",
    href: "findbug.html",
    label: "Найди баг"
  }, {
    page: "viz",
    href: "viz.html",
    label: "Визуализации"
  }, {
    page: "sandbox",
    href: "sandbox.html",
    label: "Консоль"
  }, {
    page: "project",
    href: "project.html",
    label: "Мини-проект"
  }]
}, {
  key: "progress",
  label: "Прогресс",
  items: [{
    page: "summary",
    href: "summary.html",
    label: "Итоги"
  }, {
    page: "history",
    href: "history.html",
    label: "История"
  }, {
    page: "profile",
    href: "profile.html",
    label: "Профиль"
  }, {
    page: "exam",
    href: "exam.html",
    label: "Экзамен"
  }]
}];

// Нижняя таб-панель — ровно 5 вкладок (как в мокапе): Главная и
// Профиль ведут напрямую, Учёба/Практика/Прогресс открывают лист с
// подпунктами снизу вверх (та же группировка, что и в HEADER_MAIN_NAV,
// Профиль вынесен из группы "Прогресс" в отдельную вкладку — 13
// разделов не теряются, "Прогресс"-группа в таб-баре просто содержит
// на один пункт меньше, чем в HEADER_MAIN_NAV).
const BOTTOM_TABS = [{
  key: "home",
  label: "Главная",
  page: "index",
  href: "index.html"
}, {
  key: "learn",
  label: "Учёба",
  groupKey: "learn"
}, {
  key: "practice",
  label: "Практика",
  groupKey: "practice"
}, {
  key: "progress",
  label: "Прогресс",
  groupKey: "progress"
}, {
  key: "profile",
  label: "Профиль",
  page: "profile",
  href: "profile.html"
}];
function AppLogo() {
  return /*#__PURE__*/React.createElement("a", {
    href: "index.html",
    className: "app-header__brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "app-header__mascot",
    title: "\u0411\u0430\u0439\u0442 \u2014 \u043C\u0430\u0441\u043A\u043E\u0442 js.track"
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    className: "app-header__logo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono app-header__logo-accent"
  }, "{"), "js", /*#__PURE__*/React.createElement("span", {
    className: "app-header__logo-accent"
  }, "."), "track", /*#__PURE__*/React.createElement("span", {
    className: "mono app-header__logo-accent"
  }, "}")));
}

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
  // Раскрытая группа В САЙДБАРЕ (десктоп, аккордеон — свой стейт).
  const [sidebarOpenGroup, setSidebarOpenGroup] = React.useState(() => HEADER_MAIN_NAV.find(m => m.items?.some(it => it.page === currentPage))?.key || null);
  // Открытый лист В ТАБ-ПАНЕЛИ (мобильный) — своё отдельное состояние,
  // не путать с sidebarOpenGroup: на экране одновременно смонтированы
  // ОБА варианта (видимость решает CSS-медиа-запрос), поэтому у них
  // не может быть общего state без риска странного поведения при
  // ресайзе окна между desktop/mobile.
  const [tabSheetOpen, setTabSheetOpen] = React.useState(null);
  // Настройки (сброс/звук/тема) — отдельное всплывающее меню от
  // кнопки-шестерёнки в самой шапке (общее и для десктопа, и мобильного).
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const settingsPanel = /*#__PURE__*/React.createElement("div", {
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
  }, soundEnabled ? "Звук вкл" : "Звук выкл"), /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn",
    onClick: onToggleTheme,
    "aria-label": "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0442\u0435\u043C\u0443"
  }, themeMode === "dark" ? "Светлая тема" : "Тёмная тема")));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("header", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement(AppLogo, null), /*#__PURE__*/React.createElement("div", {
    className: "app-header__stats"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono app-header__stats-count"
  }, totalCorrect, "/", totalQuestions), "\u0432\u0435\u0440\u043D\u043E \xB7 ", overallPct, "% \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "app-header__badges"
  }, streak && streak.count > 0 && /*#__PURE__*/React.createElement("div", {
    className: "app-header__badge",
    title: `Дней подряд с занятиями${streak.best > streak.count ? ` · лучшая серия: ${streak.best}` : ""}`
  }, "\uD83D\uDD25 ", streak.count), /*#__PURE__*/React.createElement("div", {
    className: "app-header__badge app-header__badge--xp",
    title: `${xp} XP всего · до следующего звания осталось ${Math.max(0, rankXpForNext - rankXpIntoRank)} XP`
  }, "\u2B50 ", xp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "app-header__badge app-header__badge--achievements",
    title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F"
  }, achievementsCount, "/", achievementsTotal)), /*#__PURE__*/React.createElement("button", {
    className: `nav-btn nav__btn app-header__mode-trigger${settingsOpen ? " app-header__mode-trigger--open" : ""}`,
    onClick: () => setSettingsOpen(v => !v),
    "aria-expanded": settingsOpen,
    "aria-haspopup": "true",
    "aria-label": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"
  }, "\u2699"), settingsOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-backdrop",
    onClick: () => setSettingsOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-panel app-header__menu-panel--settings",
    role: "menu"
  }, settingsPanel))), /*#__PURE__*/React.createElement("nav", {
    className: "app-sidebar",
    "aria-label": "\u041E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F"
  }, HEADER_MAIN_NAV.map(mode => {
    const Icon = NAV_ICON_BY_PAGE[mode.page] || NAV_ICON_BY_PAGE[mode.items?.[0]?.page];
    if (!mode.items) {
      return /*#__PURE__*/React.createElement("a", {
        key: mode.key,
        href: mode.href,
        className: `app-sidebar__item${currentPage === mode.page ? " app-sidebar__item--active" : ""}`,
        "aria-current": currentPage === mode.page ? "page" : undefined
      }, Icon && /*#__PURE__*/React.createElement(Icon, {
        size: 17
      }), " ", mode.label);
    }
    const isActive = mode.items.some(item => item.page === currentPage);
    const isOpen = sidebarOpenGroup === mode.key;
    return /*#__PURE__*/React.createElement("div", {
      key: mode.key,
      className: "app-sidebar__group"
    }, /*#__PURE__*/React.createElement("button", {
      className: `app-sidebar__item app-sidebar__item--group${isActive ? " app-sidebar__item--active" : ""}`,
      onClick: () => setSidebarOpenGroup(cur => cur === mode.key ? null : mode.key),
      "aria-expanded": isOpen
    }, Icon && /*#__PURE__*/React.createElement(Icon, {
      size: 17
    }), " ", mode.label, /*#__PURE__*/React.createElement("span", {
      className: `app-sidebar__caret${isOpen ? " app-sidebar__caret--open" : ""}`
    }, "\u25BE")), isOpen && /*#__PURE__*/React.createElement("div", {
      className: "app-sidebar__subitems"
    }, mode.items.map(item => /*#__PURE__*/React.createElement("a", {
      key: item.page,
      href: item.href,
      className: `app-sidebar__subitem${currentPage === item.page ? " app-sidebar__subitem--active" : ""}`,
      "aria-current": currentPage === item.page ? "page" : undefined
    }, item.label))));
  })), /*#__PURE__*/React.createElement("nav", {
    className: "app-bottombar",
    "aria-label": "\u041E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F"
  }, tabSheetOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-backdrop",
    onClick: () => setTabSheetOpen(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-bottombar__sheet",
    role: "menu"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header__menu-group-items"
  }, HEADER_MAIN_NAV.find(m => m.key === tabSheetOpen)?.items.map(item => {
    const ItemIcon = NAV_ICON_BY_PAGE[item.page];
    return /*#__PURE__*/React.createElement("a", {
      key: item.page,
      href: item.href,
      className: `nav-btn nav__btn${currentPage === item.page ? " nav__btn--active" : ""}`,
      "aria-current": currentPage === item.page ? "page" : undefined
    }, ItemIcon && /*#__PURE__*/React.createElement(ItemIcon, {
      size: 16
    }), " ", item.label);
  })))), BOTTOM_TABS.map(tab => {
    const Icon = NAV_ICON_BY_PAGE[tab.page] || NAV_ICON_BY_PAGE[HEADER_MAIN_NAV.find(m => m.key === tab.groupKey)?.items[0]?.page];
    const groupMode = tab.groupKey && HEADER_MAIN_NAV.find(m => m.key === tab.groupKey);
    const isActive = tab.page ? currentPage === tab.page : groupMode?.items.some(it => it.page === currentPage);
    if (tab.href) {
      return /*#__PURE__*/React.createElement("a", {
        key: tab.key,
        href: tab.href,
        className: `app-bottombar__tab${isActive ? " app-bottombar__tab--active" : ""}`,
        "aria-current": isActive ? "page" : undefined
      }, Icon && /*#__PURE__*/React.createElement(Icon, {
        size: 20
      }), /*#__PURE__*/React.createElement("span", {
        className: "app-bottombar__tab-label"
      }, tab.label));
    }
    return /*#__PURE__*/React.createElement("button", {
      key: tab.key,
      className: `app-bottombar__tab${isActive ? " app-bottombar__tab--active" : ""}`,
      onClick: () => setTabSheetOpen(cur => cur === tab.groupKey ? null : tab.groupKey),
      "aria-expanded": tabSheetOpen === tab.groupKey
    }, Icon && /*#__PURE__*/React.createElement(Icon, {
      size: 20
    }), /*#__PURE__*/React.createElement("span", {
      className: "app-bottombar__tab-label"
    }, tab.label));
  })));
}