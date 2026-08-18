/* ==========================================================================
   pages/summary.jsx — «Итоги»: общая статистика, достижения, тренд
   точности за 2 недели, интервальное повторение вопросов с ошибками,
   прогресс по каждой теме, скачивание сертификата.
   ========================================================================== */

function pluralizeRu(n, one, few, many) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
function CelebrationView({
  state,
  onShowDetails,
  onResetProgress,
  certName,
  onCertNameChange,
  onDownloadCertificate,
  onShare,
  shareStatus
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter summary-celebration"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary-celebration__title"
  }, "\u041F\u043E\u0437\u0434\u0440\u0430\u0432\u043B\u044F\u0435\u043C!"), /*#__PURE__*/React.createElement("div", {
    className: "summary-celebration__subtitle"
  }, "\u0412\u044B \u0438\u0437\u0443\u0447\u0438\u043B\u0438 JavaScript \u2014 \u043E\u0442 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u0434\u043E async/await."), /*#__PURE__*/React.createElement("div", {
    className: "summary-celebration__label"
  }, "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "summary__cards-grid summary__cards-grid--celebration"
  }, /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u041E\u043F\u044B\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E",
    stripeColor: "var(--accent)",
    value: `${state.xp} XP`
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0421\u0435\u0440\u0438\u044F",
    stripeColor: "var(--accent2)",
    value: state.streak && state.streak.count > 0 ? `${state.streak.count} ${pluralizeRu(state.streak.count, "день", "дня", "дней")}` : "—"
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0417\u0432\u0430\u043D\u0438\u0435 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u0430",
    stripeColor: "var(--success)",
    value: rankTitle(state.rank)
  })), /*#__PURE__*/React.createElement("div", {
    className: "summary-celebration__cert-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: certName,
    onChange: e => onCertNameChange(e.target.value),
    placeholder: "\u0418\u043C\u044F \u0434\u043B\u044F \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u0430 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
    "aria-label": "\u0418\u043C\u044F \u0434\u043B\u044F \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u0430",
    maxLength: 60,
    className: "summary-celebration__cert-input"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onDownloadCertificate,
    className: "summary-celebration__cert-btn"
  }, "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442 (PNG)"), /*#__PURE__*/React.createElement("button", {
    onClick: onShare,
    className: "summary-celebration__share-btn"
  }, shareStatus === "copied" ? "✓ Ссылка скопирована" : shareStatus === "failed" ? "Не вышло" : "Поделиться ссылкой"), /*#__PURE__*/React.createElement("button", {
    onClick: onResetProgress,
    className: "summary-celebration__repeat-btn"
  }, "\u21BA \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u043A\u0443\u0440\u0441"), /*#__PURE__*/React.createElement("button", {
    onClick: onShowDetails,
    className: "summary-celebration__details-link"
  }, "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u0443\u044E \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443")));
}
function ProgressTrendChart({
  historyLog
}) {
  const points = React.useMemo(() => buildDailyAccuracy(historyLog, 14), [historyLog]);
  if (points.length < 2) {
    return /*#__PURE__*/React.createElement("div", {
      className: "summary__trend-empty"
    }, "\u041F\u043E\u043A\u0430 \u043C\u0430\u043B\u043E\u0432\u0430\u0442\u043E \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0433\u0440\u0430\u0444\u0438\u043A\u0430 \u2014 \u043F\u043E\u043A\u0430\u0436\u0435\u0442\u0441\u044F, \u043A\u0430\u043A \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0445\u043E\u0442\u044F \u0431\u044B \u043F\u0430\u0440\u0430 \u0434\u043D\u0435\u0439 \u0437\u0430\u043D\u044F\u0442\u0438\u0439.");
  }
  const W = 600,
    H = 130,
    padX = 8,
    padY = 14;
  const stepX = (W - padX * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - p.pct / 100) * (H - padY * 2),
    ...p
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${H - padY} L ${coords[0].x} ${H - padY} Z`;
  return /*#__PURE__*/React.createElement("div", {
    className: "summary__trend-wrap"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    width: "100%",
    style: {
      minWidth: 420,
      display: "block"
    }
  }, [0, 50, 100].map(v => {
    const y = padY + (1 - v / 100) * (H - padY * 2);
    return /*#__PURE__*/React.createElement("g", {
      key: v
    }, /*#__PURE__*/React.createElement("line", {
      x1: padX,
      y1: y,
      x2: W - padX,
      y2: y,
      stroke: "var(--border)",
      strokeWidth: 1,
      strokeDasharray: "3 3"
    }), /*#__PURE__*/React.createElement("text", {
      x: padX,
      y: y - 3,
      fontSize: 9,
      fill: "var(--text-dim)"
    }, v, "%"));
  }), /*#__PURE__*/React.createElement("path", {
    d: areaPath,
    fill: "color-mix(in srgb, var(--accent) 10%, transparent)",
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: linePath,
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), coords.map((c, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: c.x,
    cy: c.y,
    r: 3.5,
    fill: "var(--surface)",
    stroke: "var(--accent)",
    strokeWidth: 2
  }, /*#__PURE__*/React.createElement("title", null, formatDayLabel(c.day), ": ", c.pct, "% (", c.total, " ", c.total === 1 ? "вопрос" : c.total < 5 ? "вопроса" : "вопросов", ")")))));
}
function PageRoot() {
  const [state, setState] = React.useState(null);
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [certName, setCertName] = React.useState("");
  const [showDetails, setShowDetails] = React.useState(false);
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
      const achRes = await safeStorage.get(ACHIEVEMENTS_KEY);
      let fastestAnswerMs = null;
      try {
        if (achRes && achRes.value) fastestAnswerMs = JSON.parse(achRes.value).fastestAnswerMs ?? null;
      } catch {/* нет данных */}
      const historyLog = await getHistoryEntries();
      const dueReviewQuestions = await getDueReviewQuestions();
      setState({
        ...core,
        achievementsTotal: ACHIEVEMENTS.length,
        fastestAnswerMs,
        historyLog,
        dueReviewQuestions
      });
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
  const [shareStatus, setShareStatus] = React.useState(null);
  const copyShareLink = () => {
    if (!state) return;
    const url = buildShareUrl({
      certName,
      rank: state.rank,
      xp: state.xp,
      streakCount: state.streak?.count || 0,
      overallPct: state.overallPct,
      achievementsUnlocked: Object.keys(state.unlockedAchievements).length,
      achievementsTotal: state.achievementsTotal
    });
    const fullUrl = `${window.location.origin}${window.location.pathname.replace(/summary\.html$/, "")}${url}`;
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setShareStatus("copied");
      setTimeout(() => setShareStatus(null), 2000);
    }, () => {
      setShareStatus("failed");
      setTimeout(() => setShareStatus(null), 2000);
    });
  };
  const downloadCertificate = () => {
    if (!state) return;
    const pct = state.totalQuestions ? Math.round(state.totalCorrect / state.totalQuestions * 100) : 0;
    const rootStyles = getComputedStyle(document.documentElement);
    const c = name => rootStyles.getPropertyValue(name).trim();
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = c("--bg");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = c("--accent");
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
    ctx.fillStyle = c("--accent");
    ctx.font = "600 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("JS.TRACK", canvas.width / 2, 110);
    ctx.fillStyle = c("--text");
    ctx.font = "700 44px sans-serif";
    ctx.fillText("Сертификат о прохождении курса", canvas.width / 2, 200);
    ctx.font = "400 22px sans-serif";
    ctx.fillStyle = c("--text-dim");
    ctx.fillText("От Beginner до Junior · JavaScript (ES6+)", canvas.width / 2, 250);
    const trimmedName = certName.trim();
    if (trimmedName) {
      ctx.font = "600 30px sans-serif";
      ctx.fillStyle = c("--text");
      ctx.fillText(trimmedName, canvas.width / 2, 315);
    }
    ctx.font = "700 64px sans-serif";
    ctx.fillStyle = c("--accent");
    ctx.fillText(`${pct}%`, canvas.width / 2, 380);
    ctx.font = "600 24px sans-serif";
    ctx.fillStyle = c("--accent2");
    ctx.fillText(rankTitle(state.rank), canvas.width / 2, 420);
    ctx.font = "400 20px sans-serif";
    ctx.fillStyle = c("--text-dim");
    ctx.fillText(`${state.totalCorrect} из ${state.totalQuestions} вопросов верно`, canvas.width / 2, 455);
    const dateStr = new Date().toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    ctx.font = "400 18px sans-serif";
    ctx.fillStyle = c("--text-dim");
    ctx.fillText(dateStr, canvas.width / 2, 560);
    const link = document.createElement("a");
    link.download = "js-track-certificate.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  if (!state) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
      currentPage: "summary",
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
  const pct = state.totalQuestions ? Math.round(state.totalCorrect / state.totalQuestions * 100) : 0;
  const isComplete = state.totalAnswered >= state.totalQuestions;
  const totalWrong = state.totalAnswered - state.totalCorrect;
  const weakestTopics = TOPICS.map(t => {
    const p = state.topicProgress[t.id];
    const pctT = p && p.total > 0 ? Math.round(p.correct / p.total * 100) : null;
    return {
      t,
      p,
      pctT
    };
  }).filter(x => x.p && x.p.done > 0 && x.pctT !== null && x.pctT < 100).sort((a, b) => a.pctT - b.pctT).slice(0, 3);
  const headerProps = {
    currentPage: "summary",
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
    themeMode,
    onToggleTheme: handleToggleTheme,
    soundEnabled,
    onToggleSound: handleToggleSound,
    onResetProgress: handleResetProgressWithConfirm
  };
  if (isComplete && !showDetails) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
      id: "main-content",
      tabIndex: -1,
      className: "page-content"
    }, /*#__PURE__*/React.createElement(CelebrationView, {
      state: state,
      onShowDetails: () => setShowDetails(true),
      onResetProgress: handleResetProgressWithConfirm,
      certName: certName,
      onCertNameChange: handleCertNameChange,
      onDownloadCertificate: downloadCertificate,
      onShare: copyShareLink,
      shareStatus: shareStatus
    })));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary__title-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary__title"
  }, "\u0418\u0442\u043E\u0433\u0438"), isComplete && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDetails(false),
    className: "summary__back-to-celebration"
  }, "\u041D\u0430\u0437\u0430\u0434 \u043A \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u043A\u0443")), /*#__PURE__*/React.createElement("div", {
    className: "summary__subtitle"
  }, "\u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043E ", state.totalAnswered, " \u0438\u0437 ", state.totalQuestions, " \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432"), isComplete && /*#__PURE__*/React.createElement("div", {
    className: "summary__complete-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary__complete-banner-title"
  }, "\u041A\u0443\u0440\u0441 \u043F\u0440\u043E\u0439\u0434\u0435\u043D \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E!"), /*#__PURE__*/React.createElement("div", {
    className: "summary__complete-banner-desc"
  }, pct, "% \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0445 \u043E\u0442\u0432\u0435\u0442\u043E\u0432 \u0438\u0437 ", state.totalQuestions, " \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432. \u041C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442 \u043D\u0430 \u043F\u0430\u043C\u044F\u0442\u044C."), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: certName,
    onChange: e => handleCertNameChange(e.target.value),
    placeholder: "\u0418\u043C\u044F \u0434\u043B\u044F \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u0430 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
    "aria-label": "\u0418\u043C\u044F \u0434\u043B\u044F \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u0430",
    maxLength: 60,
    className: "summary__complete-banner-input"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: downloadCertificate,
    className: "summary__complete-banner-btn"
  }, "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442 (PNG)")), /*#__PURE__*/React.createElement("button", {
    onClick: copyShareLink,
    className: "summary__share-btn"
  }, shareStatus === "copied" ? "✓ Ссылка скопирована" : shareStatus === "failed" ? "Не вышло" : "Поделиться прогрессом"), /*#__PURE__*/React.createElement("div", {
    className: "summary__cards-grid"
  }, /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0421\u0435\u0440\u0438\u044F",
    stripeColor: "var(--accent2)",
    value: state.streak && state.streak.count > 0 ? `${state.streak.count} ${pluralizeRu(state.streak.count, "день", "дня", "дней")}` : "—"
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0412\u0435\u0440\u043D\u044B\u0445 \u043E\u0442\u0432\u0435\u0442\u043E\u0432",
    stripeColor: "var(--accent)",
    value: `${pct}%`
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0422\u0435\u043C \u0438\u0437\u0443\u0447\u0435\u043D\u043E",
    stripeColor: "var(--success)",
    value: `${TOPICS.filter(t => {
      const p = state.topicProgress[t.id];
      return p && p.total > 0 && p.done === p.total;
    }).length}/${TOPICS.length}`
  }), /*#__PURE__*/React.createElement(DashboardCard, {
    label: "\u0417\u0432\u0430\u043D\u0438\u0435",
    stripeColor: "var(--error)",
    value: rankTitle(state.rank)
  })), /*#__PURE__*/React.createElement("div", {
    className: "summary__stat-row"
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: state.totalCorrect,
    label: "\u0432\u0435\u0440\u043D\u043E",
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: totalWrong,
    label: "\u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439",
    color: "var(--error)"
  }), state.fastestAnswerMs != null && /*#__PURE__*/React.createElement(StatCard, {
    value: `${(state.fastestAnswerMs / 1000).toFixed(1)}с`,
    label: "\u0441\u0430\u043C\u044B\u0439 \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0432\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442",
    color: "var(--accent2)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: `${state.xp} XP`,
    label: "\u0432\u0441\u0435\u0433\u043E \u043E\u043F\u044B\u0442\u0430",
    color: "var(--accent2)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "summary__section-label"
  }, "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F (", Object.keys(state.unlockedAchievements).length, "/", ACHIEVEMENTS.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "summary__achievements-grid"
  }, ACHIEVEMENTS.map(a => {
    const unlocked = !!state.unlockedAchievements[a.id];
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      title: a.description,
      className: `summary__achievement${unlocked ? " summary__achievement--unlocked" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "summary__achievement-title"
    }, a.title), /*#__PURE__*/React.createElement("div", {
      className: "summary__achievement-desc"
    }, a.description));
  })), /*#__PURE__*/React.createElement("div", {
    className: "summary__section-label"
  }, "\u0422\u0440\u0435\u043D\u0434 \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u0438 (14 \u0434\u043D\u0435\u0439)"), /*#__PURE__*/React.createElement("div", {
    className: "summary__trend-section"
  }, /*#__PURE__*/React.createElement(ProgressTrendChart, {
    historyLog: state.historyLog
  })), weakestTopics.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "summary__weak-topics"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary__weak-topics-title"
  }, "\u26A0\uFE0F \u0421\u0442\u043E\u0438\u0442 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0432 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C"), /*#__PURE__*/React.createElement("div", {
    className: "summary__weak-topics-list"
  }, weakestTopics.map(({
    t,
    p,
    pctT
  }) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "summary__weak-topic-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "summary__weak-topic-name"
  }, t.title), /*#__PURE__*/React.createElement("span", {
    className: "mono summary__weak-topic-pct"
  }, pctT, "% (", p.correct, "/", p.total, ")"))))), state.dueReviewQuestions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "summary__wrong-questions"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary__section-label"
  }, "\u041F\u043E\u0440\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C (", state.dueReviewQuestions.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "summary__wrong-questions-hint"
  }, "\u0412\u043E\u043F\u0440\u043E\u0441\u044B, \u0433\u0434\u0435 \u0440\u0430\u043D\u044C\u0448\u0435 \u0431\u044B\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u2014 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0434\u043E \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043F\u043E\u043A\u0430\u0437\u0430 \u0440\u0430\u0441\u0442\u0451\u0442 \u0441 \u043A\u0430\u0436\u0434\u044B\u043C \u0432\u0435\u0440\u043D\u044B\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u043C."), /*#__PURE__*/React.createElement("div", {
    className: "summary__wrong-questions-list"
  }, state.dueReviewQuestions.map(q => /*#__PURE__*/React.createElement("a", {
    key: q.id,
    href: `questions.html?topic=${q.topicId}`,
    className: "summary__wrong-question"
  }, /*#__PURE__*/React.createElement("span", {
    className: "summary__wrong-question-topic"
  }, q.topicTitle, ": "), /*#__PURE__*/React.createElement("span", {
    className: "summary__wrong-question-prompt"
  }, q.prompt))))), /*#__PURE__*/React.createElement("div", {
    className: "summary__section-label"
  }, "\u041F\u043E \u0442\u0435\u043C\u0430\u043C"), /*#__PURE__*/React.createElement("div", {
    className: "summary__topics-grid"
  }, TOPICS.map(t => {
    const p = state.topicProgress[t.id];
    const pctT = p.total ? Math.round(p.correct / p.total * 100) : 0;
    const started = p.done > 0;
    return {
      t,
      p,
      pctT,
      started
    };
  }).sort((a, b) => a.started !== b.started ? a.started ? -1 : 1 : a.pctT - b.pctT).map(({
    t,
    p,
    pctT,
    started
  }) => {
    const barColor = !started ? "var(--text-dim)" : pctT >= 85 ? "var(--success)" : pctT >= 60 ? "var(--accent2)" : "var(--error)";
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "topic-card summary__topic-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "summary__topic-card-stripe",
      style: {
        "--stripe-color": LEVELS[t.level - 1] ? "var(--accent)" : "var(--accent)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "summary__topic-card-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "summary__topic-card-title"
    }, t.title), /*#__PURE__*/React.createElement(CircularProgress, {
      pct: started ? pctT : 0,
      size: 58,
      strokeWidth: 5,
      done: started && pctT === 100,
      color: started ? barColor : "var(--border)"
    }), /*#__PURE__*/React.createElement("div", {
      className: "mono summary__topic-card-count"
    }, p.correct, "/", p.total)));
  })))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));