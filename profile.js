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

// Чисто визуальный тир (1-4) для звёзд-индикатора звания на этой
// странице — те же пороги, что и у rankTitle() в core-progress.js, но
// не добавлено туда же: используется исключительно здесь, не имеет
// смысла раздувать общий движок ради одной декоративной детали.
function rankTier(rank) {
  if (rank <= 2) return 1;
  if (rank <= 5) return 2;
  if (rank <= 9) return 3;
  return 4;
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
      const historyLog = await getHistoryEntries();
      if (historyLog.length > 0) {
        const earliestTs = historyLog.reduce((min, e) => e.ts < min ? e.ts : min, historyLog[0].ts);
        setMemberSince(new Date(earliestTs).toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }));
      }
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
      onResetProgress: handleResetProgressWithConfirm
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
    onResetProgress: handleResetProgressWithConfirm
  }), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter profile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "profile__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "profile__avatar",
    style: {
      "--avatar-mood": state.streak && state.streak.count >= 3 ? "var(--warning)" : "var(--accent)"
    }
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 30,
    mood: state.streak && state.streak.count >= 3 ? "streak" : "idle"
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
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card profile__xp-card",
    style: {
      "--stripe-color": "var(--accent)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__stripe"
  }), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono dashboard-card__value"
  }, state.xp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__label"
  }, "\u041E\u043F\u044B\u0442"), /*#__PURE__*/React.createElement("div", {
    className: "profile__xp-progress-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "profile__xp-progress-fill",
    style: {
      width: `${Math.min(100, Math.round((state.xp - xpThresholdForRank(state.rank)) / (xpThresholdForRank(state.rank + 1) - xpThresholdForRank(state.rank)) * 100))}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "profile__xp-progress-label"
  }, "\u0434\u043E \xAB", rankTitle(state.rank + 1), "\xBB: ", Math.max(0, xpThresholdForRank(state.rank + 1) - state.xp), " XP"))), /*#__PURE__*/React.createElement("div", {
    className: "topic-card dashboard-card profile__rank-card",
    style: {
      "--stripe-color": "var(--error)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__stripe"
  }), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono dashboard-card__value"
  }, rankTitle(state.rank)), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-card__label"
  }, "\u0417\u0432\u0430\u043D\u0438\u0435"), /*#__PURE__*/React.createElement("div", {
    className: "profile__rank-tiers",
    title: `Тир ${rankTier(state.rank)} из 4`
  }, [1, 2, 3, 4].map(tier => /*#__PURE__*/React.createElement("svg", {
    key: tier,
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: tier <= rankTier(state.rank) ? "var(--error)" : "none",
    stroke: "var(--error)",
    strokeWidth: "1.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
  })))))), /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0421\u0435\u0440\u0438\u044F",
    stripeColor: "var(--accent2)",
    value: state.streak && state.streak.count > 0 ? `${state.streak.count} ${pluralizeRu(state.streak.count, "день", "дня", "дней")}` : "—"
  })), /*#__PURE__*/React.createElement("div", {
    className: "profile__section-label"
  }, "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F (", Object.keys(state.unlockedAchievements).length, "/", state.achievementsTotal, ")"), /*#__PURE__*/React.createElement("div", {
    className: "profile__achievements-grid"
  }, ACHIEVEMENTS.map(a => {
    const unlocked = !!state.unlockedAchievements[a.id];
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      title: a.description,
      className: `profile__achievement${unlocked ? " profile__achievement--unlocked" : ""}`
    }, unlocked ? /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "var(--xp)",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "profile__achievement-icon"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 4H4a3 3 0 0 0 3 5M17 4h3a3 3 0 0 1-3 5"
    })) : /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "var(--text-muted)",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "profile__achievement-icon"
    }, /*#__PURE__*/React.createElement("rect", {
      width: "16",
      height: "11",
      x: "4",
      y: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 11V7a5 5 0 0 1 10 0v4"
    })), /*#__PURE__*/React.createElement("div", {
      className: "profile__achievement-title"
    }, a.title), /*#__PURE__*/React.createElement("div", {
      className: "profile__achievement-desc"
    }, a.description));
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
  }, "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442 \u2014 \u0432 \xAB\u0418\u0442\u043E\u0433\u0430\u0445\xBB"))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(PageRoot, null)));