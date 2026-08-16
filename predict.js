/* ==========================================================================
   pages/predict.jsx — «Предскажи вывод»: активное вспоминание без
   вариантов ответа — код показывается, нужно самому написать, что
   выведет console.log. Полностью изолирован от прогресса курса.
   ========================================================================== */

function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [idx, setIdx] = React.useState(0);
  const [input, setInput] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [score, setScore] = React.useState({
    correct: 0,
    total: 0
  });
  React.useEffect(() => {
    (async () => {
      const mode = await loadAndApplyTheme();
      setThemeMode(mode);
      try {
        const soundRes = await safeStorage.get(SOUND_KEY);
        if (soundRes && soundRes.value === "off") setSoundEnabled(false);
      } catch {/* звук включён по умолчанию */}
      const core = await loadCoreState();
      setHeaderState({
        ...core,
        achievementsTotal: ACHIEVEMENTS.length
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
  const snippet = PREDICT_SHUFFLED[idx];
  const isLast = idx === PREDICT_SHUFFLED.length - 1;
  const check = () => {
    if (!input.trim() || result) return;
    const graded = gradePrediction(input, snippet.expected);
    setResult(graded);
    setScore(prev => ({
      correct: prev.correct + (graded.allCorrect ? 1 : 0),
      total: prev.total + 1
    }));
  };
  const next = () => {
    setIdx(i => (i + 1) % PREDICT_SHUFFLED.length);
    setInput("");
    setResult(null);
  };
  const restart = () => {
    setIdx(0);
    setInput("");
    setResult(null);
    setScore({
      correct: 0,
      total: 0
    });
  };
  const headerProps = headerState ? {
    currentPage: "predict",
    totalCorrect: headerState.totalCorrect,
    totalQuestions: headerState.totalQuestions,
    overallPct: headerState.overallPct,
    streak: headerState.streak,
    xp: headerState.xp,
    rank: headerState.rank,
    rankXpForNext: xpThresholdForRank(headerState.rank + 1) - xpThresholdForRank(headerState.rank),
    rankXpIntoRank: headerState.xp - xpThresholdForRank(headerState.rank),
    achievementsCount: Object.keys(headerState.unlockedAchievements).length,
    achievementsTotal: headerState.achievementsTotal,
    themeMode,
    onToggleTheme: handleToggleTheme,
    soundEnabled,
    onToggleSound: handleToggleSound,
    onResetProgress: handleResetProgressWithConfirm
  } : {
    currentPage: "predict",
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
    themeMode,
    onToggleTheme: handleToggleTheme,
    soundEnabled,
    onToggleSound: handleToggleSound,
    onResetProgress: handleResetProgressWithConfirm
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter predict"
  }, /*#__PURE__*/React.createElement("div", {
    className: "predict__header-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "predict__title"
  }, "\uD83D\uDD2E \u041F\u0440\u0435\u0434\u0441\u043A\u0430\u0436\u0438 \u0432\u044B\u0432\u043E\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: restart,
    className: "predict__restart-btn"
  }, "\u21BA \u041D\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "predict__subtitle"
  }, "\u041D\u0438\u043A\u0430\u043A\u0438\u0445 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u043E\u0442\u0432\u0435\u0442\u0430 \u2014 \u043D\u0430\u043F\u0438\u0448\u0438 \u0441\u0430\u043C, \u0447\u0442\u043E \u043F\u043E\u043A\u0430\u0436\u0435\u0442 console.log. \u0415\u0441\u043B\u0438 \u0432\u044B\u0437\u043E\u0432\u043E\u0432 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E, \u043F\u0438\u0448\u0438 \u043A\u0430\u0436\u0434\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441 \u043D\u043E\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438, \u0432 \u0442\u043E\u043C \u043F\u043E\u0440\u044F\u0434\u043A\u0435, \u0432 \u043A\u043E\u0442\u043E\u0440\u043E\u043C \u043E\u043D\u0438 \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0432\u044B\u0432\u0435\u0434\u0443\u0442\u0441\u044F."), /*#__PURE__*/React.createElement("div", {
    className: "predict__progress-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u041F\u0440\u0438\u043C\u0435\u0440 ", idx + 1, " \u0438\u0437 ", PREDICT_SHUFFLED.length), /*#__PURE__*/React.createElement("span", null, "\u0412\u0435\u0440\u043D\u043E: ", score.correct, " \u0438\u0437 ", score.total)), /*#__PURE__*/React.createElement("div", {
    className: "predict__topic-badge"
  }, snippet.topic), /*#__PURE__*/React.createElement("pre", {
    className: "mono predict__code"
  }, snippet.code), /*#__PURE__*/React.createElement("textarea", {
    value: input,
    onChange: e => setInput(e.target.value),
    disabled: !!result,
    placeholder: "\u0427\u0442\u043E \u0432\u044B\u0432\u0435\u0434\u0435\u0442 console.log? \u041A\u0430\u0436\u0434\u044B\u0439 \u0432\u044B\u0437\u043E\u0432 \u2014 \u0441 \u043D\u043E\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438\u2026",
    "aria-label": "\u0422\u0432\u043E\u0439 \u043F\u0440\u043E\u0433\u043D\u043E\u0437 \u0432\u044B\u0432\u043E\u0434\u0430 console.log",
    spellCheck: false,
    autoCorrect: "off",
    autoCapitalize: "off",
    autoComplete: "off",
    onKeyDown: e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        result ? next() : check();
      }
    },
    className: "predict__textarea"
  }), /*#__PURE__*/React.createElement("div", {
    className: "predict__hint"
  }, "Ctrl+Enter (\u2318+Enter \u043D\u0430 Mac) \u2014 ", result ? "следующий пример" : "проверить"), !result ? /*#__PURE__*/React.createElement("button", {
    onClick: check,
    disabled: !input.trim(),
    className: "predict__check-btn"
  }, "\u2713 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: `predict__result${result.allCorrect ? " predict__result--correct" : " predict__result--wrong"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "predict__result-title"
  }, result.allCorrect ? "✓ Верно!" : "✗ Не совсем"), /*#__PURE__*/React.createElement("div", {
    className: "predict__result-rows"
  }, result.rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "mono predict__result-row"
  }, r.correct ? "✓" : "✗", /*#__PURE__*/React.createElement("span", {
    className: "predict__result-label"
  }, "\u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C:"), /*#__PURE__*/React.createElement("span", {
    className: "predict__result-expected"
  }, r.expected ?? "—"), !r.correct && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "predict__result-label"
  }, "\u0442\u0432\u043E\u0439 \u043E\u0442\u0432\u0435\u0442:"), /*#__PURE__*/React.createElement("span", {
    className: "predict__result-actual"
  }, r.actual ?? "—"))))), /*#__PURE__*/React.createElement("div", {
    className: "predict__explanation"
  }, snippet.explanation)), /*#__PURE__*/React.createElement("button", {
    onClick: next,
    className: "predict__next-btn"
  }, isLast ? "Начать по кругу заново" : "Следующий пример", " \u2192")))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));