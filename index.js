/* ==========================================================================
   pages/index.jsx — загрузчик и содержимое главной страницы. Каждая
   страница имеет свой файл с этим же именем (index.html + index.css +
   index.jsx) — по аналогии с остальными разделами.
   ========================================================================== */

function PwaInstallBanner({
  deferredPrompt,
  onInstalled,
  onDismiss
}) {
  const handleInstall = async () => {
    deferredPrompt.prompt();
    const {
      outcome
    } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      onInstalled();
    } else {
      onDismiss();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__icon"
  }, "\uD83D\uDCF2"), /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__title"
  }, "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438 js.track \u043D\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D"), /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__desc"
  }, "\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u0441 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u0441\u0442\u043E\u043B\u0430, \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0438 \u0431\u0435\u0437 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0430")), /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleInstall,
    className: "pwa-banner__install-btn"
  }, "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "pwa-banner__dismiss-btn",
    "aria-label": "\u041D\u0435 \u0441\u0435\u0439\u0447\u0430\u0441"
  }, "\u2715")));
}
function ReminderBanner({
  onEnable,
  onDismiss
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner pwa-banner--reminder"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__icon"
  }, "\uD83D\uDD14"), /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__title"
  }, "\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0442\u044C \u0432\u0435\u0447\u0435\u0440\u043E\u043C, \u0435\u0441\u043B\u0438 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u043D\u0435 \u043F\u043E\u0437\u0430\u043D\u0438\u043C\u0430\u043B\u0441\u044F?"), /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__desc"
  }, "\u041B\u0443\u0447\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043D\u0430 Android \u0441 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435\u043C")), /*#__PURE__*/React.createElement("div", {
    className: "pwa-banner__actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onEnable,
    className: "pwa-banner__install-btn"
  }, "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "pwa-banner__dismiss-btn",
    "aria-label": "\u041D\u0435 \u0441\u0435\u0439\u0447\u0430\u0441"
  }, "\u2715")));
}

/**
 * РЕДИЗАЙН главного экрана — найденная проблема: раньше самое ценное
 * место экрана занимал CircularProgress ("вот твой процент"), а не
 * действие ("вот что делать сейчас"). Теперь порядок обратный —
 * карточка "Продолжить" с конкретным следующим шагом (тема, номер
 * вопроса внутри темы, мини-прогресс) идёт первой и визуально
 * доминирует, а общий процент/разбивка по темам — во ВТОРИЧНОМ блоке
 * "Твой прогресс" ниже, уже как информация, а не главное действие.
 */
function HomeContent({
  state,
  onContinue
}) {
  const {
    overallPct,
    totalCorrect,
    totalQuestions,
    rank,
    streak,
    certName,
    answers,
    topicProgress,
    xp
  } = state;
  const hasStarted = state.totalAnswered > 0;
  const resumeIdx = findResumeIndex(NAV_ITEMS, answers, topicProgress);
  const resumeItem = NAV_ITEMS[resumeIdx];
  const isLessonScreen = resumeItem.type === "lesson";
  const topicQuestions = NAV_ITEMS.filter(it => it.topicId === resumeItem.topicId && it.type !== "lesson");
  const posInTopic = isLessonScreen ? 0 : topicQuestions.findIndex(it => it.id === resumeItem.id) + 1;
  const continuePct = topicQuestions.length > 0 ? Math.round((posInTopic - 1) / topicQuestions.length * 100) : 0;

  // Темы, которых студент уже коснулся — полная разбивка по всем 12
  // темам уже есть на "Итогах", здесь достаточно компактного среза,
  // чтобы не дублировать её один в один.
  const touchedTopics = TOPICS.filter(t => (topicProgress[t.id]?.done || 0) > 0).slice(0, 4);
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter home"
  }, /*#__PURE__*/React.createElement("div", {
    className: "home__greeting"
  }, hasStarted ? "Добро пожаловать обратно" : timeGreeting(), certName ? `, ${certName}` : "", "!"), /*#__PURE__*/React.createElement("div", {
    className: "home__mascot-wrap"
  }, /*#__PURE__*/React.createElement(MascotIllustration, {
    size: 72,
    color: "var(--accent)",
    pose: overallPct >= 100 ? "celebrate" : "wave"
  })), /*#__PURE__*/React.createElement("div", {
    className: "home__companion-line"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "home__companion-name"
  }, MASCOT_NAME, ":"), " ", homeCompanionLine({
    hasStarted,
    streak,
    overallPct
  }, new Date().toDateString())), /*#__PURE__*/React.createElement("button", {
    className: "home__continue-card",
    onClick: onContinue
  }, /*#__PURE__*/React.createElement("div", {
    className: "home__continue-label"
  }, hasStarted ? "Продолжить" : "Начать"), /*#__PURE__*/React.createElement("div", {
    className: "home__continue-topic"
  }, resumeItem.topicTitle), !isLessonScreen && topicQuestions.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "home__continue-sub"
  }, "\u0412\u043E\u043F\u0440\u043E\u0441 ", posInTopic, " \u0438\u0437 ", topicQuestions.length), /*#__PURE__*/React.createElement("div", {
    className: "home__continue-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "home__continue-bar-fill",
    style: {
      width: `${continuePct}%`
    }
  }))), isLessonScreen && /*#__PURE__*/React.createElement("div", {
    className: "home__continue-sub"
  }, "\u041D\u043E\u0432\u0430\u044F \u0442\u0435\u043C\u0430 \u2014 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u0442\u0435\u043E\u0440\u0438\u044F"), /*#__PURE__*/React.createElement("div", {
    className: "home__continue-arrow"
  }, "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "home__stats-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "home__stats-chip"
  }, "\uD83D\uDD25 ", streak && streak.count > 0 ? `${streak.count} ${streak.count === 1 ? "день" : streak.count < 5 ? "дня" : "дней"}` : "—"), /*#__PURE__*/React.createElement("div", {
    className: "home__stats-chip"
  }, "\u2B50 ", xp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "home__stats-chip"
  }, "\uD83C\uDFC6 ", rankTitle(rank))), /*#__PURE__*/React.createElement("div", {
    className: "home__progress-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "home__progress-section-title"
  }, "\u0422\u0432\u043E\u0439 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441"), /*#__PURE__*/React.createElement("div", {
    className: "home__progress-section-row"
  }, /*#__PURE__*/React.createElement(CircularProgress, {
    pct: overallPct,
    size: 68,
    strokeWidth: 6,
    done: overallPct >= 100
  }), /*#__PURE__*/React.createElement("div", {
    className: "home__progress-section-text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "home__progress-pct"
  }, overallPct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "home__progress-detail"
  }, totalCorrect, " / ", totalQuestions, " \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432"))), touchedTopics.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "home__progress-topics"
  }, touchedTopics.map(t => {
    const p = topicProgress[t.id];
    const pct = p.total > 0 ? Math.round(p.correct / p.total * 100) : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "home__progress-topic-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "home__progress-topic-name"
    }, t.title), /*#__PURE__*/React.createElement("div", {
      className: "home__progress-topic-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "home__progress-topic-bar-fill",
      style: {
        width: `${pct}%`
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "mono home__progress-topic-pct"
    }, pct, "%"));
  })), /*#__PURE__*/React.createElement("a", {
    href: "summary.html",
    className: "home__progress-more-link"
  }, "\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435 \u0442\u0435\u043C\u044B \u2192")) : /*#__PURE__*/React.createElement("div", {
    className: "home__progress-empty"
  }, "\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0440\u0430\u0437\u0431\u0438\u0432\u043A\u0430 \u043F\u043E \u0442\u0435\u043C\u0430\u043C, \u043A\u0430\u043A \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u0447\u043D\u0451\u0448\u044C \u043E\u0442\u0432\u0435\u0447\u0430\u0442\u044C \u043D\u0430 \u0432\u043E\u043F\u0440\u043E\u0441\u044B.")));
}
function PageRoot() {
  const [state, setState] = React.useState(null);
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [showPwaBanner, setShowPwaBanner] = React.useState(false);
  const [showReminderBanner, setShowReminderBanner] = React.useState(false);
  React.useEffect(() => {
    const handler = e => {
      e.preventDefault(); // подавляем системный баннер — покажем свой, в подходящий момент
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  React.useEffect(() => {
    (async () => {
      const mode = await loadAndApplyTheme();
      setThemeMode(mode);
      try {
        const soundRes = await safeStorage.get(SOUND_KEY);
        if (soundRes && soundRes.value === "off") setSoundEnabled(false);
      } catch {/* звук включён по умолчанию */}
      const core = await loadCoreState();
      let certName = "";
      try {
        const certRes = await safeStorage.get(CERT_NAME_KEY);
        if (certRes && certRes.value) certName = certRes.value;
      } catch {/* имя ещё не вводили */}
      setState({
        ...core,
        certName,
        achievementsTotal: 26
      });
      setShowPwaBanner(await shouldOfferPwaInstall(core.streak));
      setShowReminderBanner(await shouldOfferReminders(core.streak));
    })();
  }, []);
  const handlePwaInstalled = () => setShowPwaBanner(false);
  const handlePwaDismiss = async () => {
    setShowPwaBanner(false);
    await dismissPwaInstallOffer();
  };
  const handleEnableReminders = async () => {
    setShowReminderBanner(false);
    await enableStreakReminders();
  };
  const handleReminderDismiss = async () => {
    setShowReminderBanner(false);
    await dismissReminderOffer();
  };
  const handleToggleTheme = async () => {
    const next = await toggleAndSaveTheme(themeMode);
    setThemeMode(next);
  };
  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await safeStorage.set(SOUND_KEY, next ? "on" : "off");
  };
  const handleContinue = () => {
    window.location.href = "questions.html";
  };
  if (!state) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
      currentPage: "index",
      totalCorrect: 0,
      totalQuestions: ALL_QUESTIONS.length,
      overallPct: 0,
      streak: null,
      xp: 0,
      rank: 1,
      rankXpForNext: 30,
      rankXpIntoRank: 0,
      achievementsCount: 0,
      achievementsTotal: 26,
      themeMode: themeMode,
      onToggleTheme: handleToggleTheme,
      soundEnabled: soundEnabled,
      onToggleSound: handleToggleSound,
      onResetProgress: handleResetProgressWithConfirm
    }), /*#__PURE__*/React.createElement("main", {
      id: "main-content",
      tabIndex: -1,
      className: "page-content"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-loading"
    }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026")));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
    currentPage: "index",
    totalCorrect: state.totalCorrect,
    totalQuestions: state.totalQuestions,
    overallPct: state.overallPct,
    streak: state.streak,
    xp: state.xp,
    rank: state.rank,
    rankXpForNext: xpThresholdForRank(state.rank + 1) - xpThresholdForRank(state.rank),
    rankXpIntoRank: state.xp - xpThresholdForRank(state.rank),
    achievementsCount: Object.keys(state.unlockedAchievements).length,
    achievementsTotal: state.achievementsTotal,
    themeMode: themeMode,
    onToggleTheme: handleToggleTheme,
    soundEnabled: soundEnabled,
    onToggleSound: handleToggleSound,
    onResetProgress: handleResetProgressWithConfirm
  }), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, deferredPrompt && showPwaBanner && /*#__PURE__*/React.createElement(PwaInstallBanner, {
    deferredPrompt: deferredPrompt,
    onInstalled: handlePwaInstalled,
    onDismiss: handlePwaDismiss
  }), showReminderBanner && /*#__PURE__*/React.createElement(ReminderBanner, {
    onEnable: handleEnableReminders,
    onDismiss: handleReminderDismiss
  }), /*#__PURE__*/React.createElement(HomeContent, {
    state: state,
    onContinue: handleContinue
  })));
}

/* Один React-корень на всю страницу (шапка + контент рендерятся вместе,
   через фрагмент <>...</>) — раньше по ошибке создавался ВТОРОЙ корень
   на #header-root прямо внутри тела компонента при каждом рендере, что
   в реальном браузере вызвало бы предупреждение/ошибку React
   ("createRoot() on a container that has already been passed..."). */
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));