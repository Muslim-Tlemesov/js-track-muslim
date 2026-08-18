/* ==========================================================================
   pages/history.jsx — «История обучения»: календарь активности (в стиле
   GitHub contribution graph) и лог попыток по дням.
   ========================================================================== */

function activityColorStyle(count) {
  if (count === 0) return "var(--surface-alt)";
  if (count <= 2) return "color-mix(in srgb, var(--success) 25%, var(--surface-alt))";
  if (count <= 5) return "color-mix(in srgb, var(--success) 55%, var(--surface-alt))";
  return "var(--success)";
}
function ActivityCalendar({
  historyLog
}) {
  const weeks = React.useMemo(() => buildActivityCalendar(historyLog), [historyLog]);
  const monthLabels = weeks.map((week, wi) => {
    const firstDay = new Date(week[0].ts);
    if (firstDay.getDate() > 7) return null;
    if (wi === 0) return RU_MONTHS[firstDay.getMonth()].slice(0, 3);
    const prevWeekMonth = new Date(weeks[wi - 1][0].ts).getMonth();
    return firstDay.getMonth() !== prevWeekMonth ? RU_MONTHS[firstDay.getMonth()].slice(0, 3) : null;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "activity-calendar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "activity-calendar__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "activity-calendar__month-labels"
  }, monthLabels.map((label, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "activity-calendar__month-label"
  }, label && /*#__PURE__*/React.createElement("span", null, label)))), /*#__PURE__*/React.createElement("div", {
    className: "activity-calendar__weeks"
  }, weeks.map((week, wi) => /*#__PURE__*/React.createElement("div", {
    key: wi,
    className: "activity-calendar__week"
  }, week.map((day, di) => /*#__PURE__*/React.createElement("div", {
    key: di,
    title: day.isFuture ? undefined : `${formatDayLabel(day.ts)}: ${day.count} ${day.count === 1 ? "попытка" : day.count < 5 && day.count > 0 ? "попытки" : "попыток"}`,
    className: `activity-calendar__cell${day.isToday ? " activity-calendar__cell--today" : ""}${day.isFuture ? " activity-calendar__cell--future" : ""}`,
    style: {
      background: day.isFuture ? "transparent" : activityColorStyle(day.count)
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "activity-calendar__legend"
  }, /*#__PURE__*/React.createElement("span", null, "\u043C\u0435\u043D\u044C\u0448\u0435"), [0, 1, 3, 6].map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    className: "activity-calendar__cell",
    style: {
      background: activityColorStyle(c)
    }
  })), /*#__PURE__*/React.createElement("span", null, "\u0431\u043E\u043B\u044C\u0448\u0435"))));
}
function HistoryEntry({
  entry
}) {
  const label = entry.tags && entry.tags.length ? entry.tags.join(" / ") : entry.topicTitle;
  return /*#__PURE__*/React.createElement("div", {
    className: `history-entry${entry.correct ? " history-entry--correct" : " history-entry--wrong"}`
  }, entry.correct ? "✓" : "✗", /*#__PURE__*/React.createElement("span", {
    className: "mono history-entry__label"
  }, label));
}
function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [state, setState] = React.useState(null);
  const [historyLog, setHistoryLog] = React.useState([]);
  React.useEffect(() => {
    (async () => {
      const mode = await loadAndApplyTheme();
      setThemeMode(mode);
      try {
        const soundRes = await safeStorage.get(SOUND_KEY);
        if (soundRes && soundRes.value === "off") setSoundEnabled(false);
      } catch {/* звук включён по умолчанию */}
      const core = await loadCoreState();
      setState({
        ...core,
        achievementsTotal: ACHIEVEMENTS.length
      });
      setHistoryLog(await getHistoryEntries());
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
  if (!state) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
      currentPage: "history",
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
  const days = groupHistoryByDay(historyLog);
  const loggedIds = new Set(historyLog.map(e => e.questionId));
  const legacyEntries = Object.keys(state.answers).filter(id => !loggedIds.has(id) && QUESTION_BY_ID[id]).map(id => ({
    questionId: id,
    correct: state.answers[id]?.status === "correct",
    tags: QUESTION_BY_ID[id].tags || [],
    topicTitle: QUESTION_BY_ID[id].topicTitle
  }));
  const isEmpty = days.length === 0 && legacyEntries.length === 0;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
    currentPage: "history",
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
    className: "question-card question-enter history-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "history-page__title"
  }, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u044F"), /*#__PURE__*/React.createElement("div", {
    className: "history-page__subtitle"
  }, "\u0427\u0442\u043E \u0438 \u043A\u043E\u0433\u0434\u0430 \u0431\u044B\u043B\u043E \u043E\u0442\u0432\u0435\u0447\u0435\u043D\u043E \u2014 \u043F\u043E \u0434\u043D\u044F\u043C. \u041E\u0441\u043E\u0431\u0435\u043D\u043D\u043E \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u043E \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0441\u043F\u0443\u0441\u0442\u044F \u043C\u0435\u0441\u044F\u0446."), /*#__PURE__*/React.createElement("div", {
    className: "history-page__section-label"
  }, "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"), /*#__PURE__*/React.createElement("div", {
    className: "history-page__calendar-wrap"
  }, /*#__PURE__*/React.createElement(ActivityCalendar, {
    historyLog: historyLog
  })), isEmpty ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement(MascotIllustration, {
    size: 72,
    mood: "think"
  }), /*#__PURE__*/React.createElement("div", {
    className: "empty-state__message"
  }, "\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E \u2014 \u043E\u0442\u0432\u0435\u0442\u044C \u043D\u0430 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432, \u0438 \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F.")) : /*#__PURE__*/React.createElement("div", {
    className: "history-page__days"
  }, days.map(day => /*#__PURE__*/React.createElement("div", {
    key: day.dayKey
  }, /*#__PURE__*/React.createElement("div", {
    className: "history-page__day-label"
  }, day.label), /*#__PURE__*/React.createElement("div", {
    className: "history-page__day-entries"
  }, day.entries.map((entry, i) => /*#__PURE__*/React.createElement(HistoryEntry, {
    key: i,
    entry: entry
  }))))), legacyEntries.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "history-page__day-label history-page__day-label--legacy"
  }, "\u0420\u0430\u043D\u044C\u0448\u0435 ", /*#__PURE__*/React.createElement("span", {
    className: "history-page__legacy-note"
  }, "(\u0434\u043E \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u2014 \u0431\u0435\u0437 \u0442\u043E\u0447\u043D\u043E\u0439 \u0434\u0430\u0442\u044B)")), /*#__PURE__*/React.createElement("div", {
    className: "history-page__day-entries"
  }, legacyEntries.map((entry, i) => /*#__PURE__*/React.createElement(HistoryEntry, {
    key: i,
    entry: entry
  }))))))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(PageRoot, null)));