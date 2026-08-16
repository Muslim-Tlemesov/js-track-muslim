/* ==========================================================================
   pages/profile.jsx — «Профиль»: редактируемое имя, карточки XP/звание/
   серия, прогресс по всем темам, резервное копирование прогресса.
   ========================================================================== */

function pluralizeRu(n, one, few, many) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
function PageRoot() {
  const [state, setState] = React.useState(null);
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [certName, setCertName] = React.useState("");
  const [importStatus, setImportStatus] = React.useState(null);
  const [memberSince, setMemberSince] = React.useState(null);
  const fileInputRef = React.useRef(null);
  React.useEffect(() => {
    (async () => {
      const mode = await loadAndApplyTheme();
      setThemeMode(mode);
      try {
        const soundRes = await safeStorage.get(SOUND_KEY);
        if (soundRes && soundRes.value === "off") setSoundEnabled(false);
      } catch {/* звук включён по умолчанию */}
      try {
        const certRes = await safeStorage.get(CERT_NAME_KEY);
        if (certRes && certRes.value) setCertName(certRes.value);
      } catch {/* имя ещё не вводили */}
      const core = await loadCoreState();
      setState({
        ...core,
        achievementsTotal: ACHIEVEMENTS.length
      });
      const histRes = await safeStorage.get(HISTORY_KEY);
      try {
        if (histRes && histRes.value) {
          const historyLog = JSON.parse(histRes.value);
          if (historyLog.length > 0) {
            const earliestTs = historyLog.reduce((min, e) => e.ts < min ? e.ts : min, historyLog[0].ts);
            setMemberSince(new Date(earliestTs).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
              day: "numeric"
            }));
          }
        }
      } catch {/* нет лога истории */}
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
  const handleResetProgress = async () => {
    const ok = window.confirm("Сбросить весь прогресс? Это действие нельзя отменить.");
    if (!ok) return;
    await Promise.all([safeStorage.set(STORAGE_KEY, JSON.stringify({})), safeStorage.set(XP_KEY, JSON.stringify({
      xp: 0
    })), safeStorage.set(ACHIEVEMENTS_KEY, JSON.stringify({
      unlocked: []
    }))]);
    window.location.reload();
  };
  const handleCertNameChange = value => {
    setCertName(value);
    safeStorage.set(CERT_NAME_KEY, value);
  };
  const handleImportFile = async e => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const ok = window.confirm("Импорт заменит весь текущий прогресс данными из файла (ответы, XP, достижения, серию, историю). Это действие нельзя отменить. Продолжить?");
    if (!ok) return;
    try {
      await importProgressData(file);
      window.location.reload();
    } catch (err) {
      setImportStatus({
        type: "error",
        message: err.message
      });
    }
  };
  if (!state) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
      currentPage: "profile",
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
      themeMode: themeMode,
      onToggleTheme: handleToggleTheme,
      soundEnabled: soundEnabled,
      onToggleSound: handleToggleSound,
      onResetProgress: handleResetProgress
    }), /*#__PURE__*/React.createElement("main", {
      id: "main-content",
      tabIndex: -1,
      className: "page-loading"
    }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026"));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
    currentPage: "profile",
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
    onResetProgress: handleResetProgress
  }), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter profile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "profile__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "profile__avatar"
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 30,
    color: "var(--accent)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "profile__header-text"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: certName,
    onChange: e => handleCertNameChange(e.target.value),
    placeholder: "\u0422\u0432\u043E\u0451 \u0438\u043C\u044F (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
    "aria-label": "\u0422\u0432\u043E\u0451 \u0438\u043C\u044F",
    maxLength: 60,
    className: "profile__name-input"
  }), /*#__PURE__*/React.createElement("div", {
    className: "profile__member-since"
  }, memberSince ? `С нами с ${memberSince}` : "Только начинаешь путь — добро пожаловать"))), /*#__PURE__*/React.createElement("div", {
    className: "profile__cards-grid"
  }, /*#__PURE__*/React.createElement(DashboardCard, {
    emoji: "\u2B50",
    label: "\u041E\u043F\u044B\u0442",
    stripeColor: "var(--accent)",
    value: `${state.xp} XP`
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    emoji: "\uD83C\uDFC6",
    label: "\u0417\u0432\u0430\u043D\u0438\u0435",
    stripeColor: "var(--error)",
    value: rankTitle(state.rank)
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    emoji: "\uD83D\uDD25",
    label: "\u0421\u0435\u0440\u0438\u044F",
    stripeColor: "var(--accent2)",
    value: state.streak && state.streak.count > 0 ? `${state.streak.count} ${pluralizeRu(state.streak.count, "день", "дня", "дней")}` : "—"
  })), /*#__PURE__*/React.createElement("div", {
    className: "profile__section-label"
  }, "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043F\u043E \u0432\u0441\u0435\u043C \u0442\u0435\u043C\u0430\u043C"), /*#__PURE__*/React.createElement("div", {
    className: "profile__topic-list"
  }, TOPICS.map(t => {
    const p = state.topicProgress[t.id] || {
      done: 0,
      total: t.questions.length,
      correct: 0
    };
    const pct = p.total > 0 ? Math.round(p.correct / p.total * 100) : 0;
    const barColor = pct >= 80 ? "var(--success)" : pct >= 40 ? "var(--accent2)" : p.done > 0 ? "var(--error)" : "var(--border)";
    const levelInfo = LEVELS.find(l => l.level === t.level);
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "profile__topic-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "profile__topic-emoji",
      title: levelInfo?.label
    }, levelInfo?.emoji), /*#__PURE__*/React.createElement("span", {
      className: "profile__topic-name"
    }, t.title), /*#__PURE__*/React.createElement("div", {
      className: "profile__topic-bar-track"
    }, /*#__PURE__*/React.createElement("div", {
      className: "profile__topic-bar-fill",
      style: {
        width: `${pct}%`,
        background: barColor
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "mono profile__topic-stats"
    }, p.done, "/", p.total, " \xB7 ", pct, "%"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "profile__section-label"
  }, "\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "profile__backup-desc"
  }, "\u0412\u0435\u0441\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u2014 \u043E\u0447\u0438\u0441\u0442\u043A\u0430 \u043A\u044D\u0448\u0430 \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0430 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 \u0441\u043E\u0442\u0440\u0451\u0442 \u0435\u0433\u043E \u0431\u0435\u0437 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F. \u0421\u043A\u0430\u0447\u0430\u0439 \u0444\u0430\u0439\u043B \u0441\u0435\u0439\u0447\u0430\u0441, \u0447\u0442\u043E\u0431\u044B \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043F\u043E\u0437\u0436\u0435."), /*#__PURE__*/React.createElement("div", {
    className: "profile__backup-actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: exportProgressData,
    className: "profile__backup-btn"
  }, "\u2193 \u0421\u043A\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 (JSON)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setImportStatus(null);
      fileInputRef.current?.click();
    },
    className: "profile__backup-btn"
  }, "\u21BB \u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437 \u0444\u0430\u0439\u043B\u0430"), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    accept: "application/json,.json",
    "aria-label": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u0441 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u043E\u043C",
    onChange: handleImportFile,
    style: {
      display: "none"
    }
  })), importStatus?.type === "error" && /*#__PURE__*/React.createElement("div", {
    className: "profile__import-error"
  }, "\u26A0 ", importStatus.message), /*#__PURE__*/React.createElement("a", {
    href: "summary.html",
    className: "profile__summary-link"
  }, "\uD83C\uDFC5 \u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442 \u2014 \u0432 \xAB\u0418\u0442\u043E\u0433\u0430\u0445\xBB"))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));