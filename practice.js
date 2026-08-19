/* ==========================================================================
   pages/practice.jsx — «Практика»: случайные вопросы из уже пройденных
   тем, без таймера и без давления. Не влияет на прогресс курса/XP/
   достижения — та же философия, что и у «Экзамена» (отдельная,
   низкоставочная проверка себя), только без таймера и конечного числа
   вопросов: можно листать сколько угодно, пока не надоест.
   ========================================================================== */

function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [eligiblePool, setEligiblePool] = React.useState(null); // null = загрузка, [] = нет доступных тем
  const [current, setCurrent] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [runResult, setRunResult] = React.useState(null);
  const [isRunning, setIsRunning] = React.useState(false);
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

      // Практика только по темам, где есть хотя бы один верный ответ —
      // иначе это было бы способом подглядеть вопросы из ещё не
      // пройденного материала без прохождения самой темы по порядку.
      const touchedTopicIds = new Set(TOPICS.filter(t => (core.topicProgress[t.id]?.correct || 0) > 0).map(t => t.id));
      const pool = ALL_QUESTIONS.filter(q => touchedTopicIds.has(q.topicId));
      setEligiblePool(pool);
      if (pool.length > 0) {
        const first = pool[Math.floor(Math.random() * pool.length)];
        setCurrent(first);
        setCode(first.starter || "");
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
  const isCode = current?.type === "code";
  const nextQuestion = () => {
    if (!eligiblePool || eligiblePool.length === 0) return;
    const candidates = eligiblePool.length === 1 ? eligiblePool : eligiblePool.filter(q => q.id !== current?.id);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrent(chosen);
    setCode(chosen?.starter || "");
    setSelected(null);
    setChecked(false);
    setRunResult(null);
  };
  const submitQuiz = optionIdx => {
    if (checked) return;
    setSelected(optionIdx);
    setChecked(true);
    const isCorrect = optionIdx === current.correct;
    if (isCorrect) playCorrectTick(soundEnabled);
    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1
    }));
  };
  const submitCode = () => {
    if (checked) return;
    setIsRunning(true);
    setTimeout(async () => {
      const result = await runUserCode(code, {
        liveKind: current.liveKind,
        liveVarName: current.liveVarName
      });
      setRunResult(result);
      setIsRunning(false);
      setChecked(true);
      const isCorrect = !result.error && logsMatch(result.logs, current.expectedLogs);
      if (isCorrect) playCorrectTick(soundEnabled);
      setScore(s => ({
        correct: s.correct + (isCorrect ? 1 : 0),
        total: s.total + 1
      }));
    }, 350);
  };
  const headerProps = headerState ? {
    currentPage: "practice",
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
    currentPage: "practice",
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
  let body;
  if (eligiblePool === null) {
    body = /*#__PURE__*/React.createElement("div", {
      className: "page-loading"
    }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026");
  } else if (eligiblePool.length === 0) {
    body = /*#__PURE__*/React.createElement("div", {
      className: "question-card question-enter practice"
    }, /*#__PURE__*/React.createElement("div", {
      className: "practice__title"
    }, "\u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0430"), /*#__PURE__*/React.createElement("div", {
      className: "empty-state"
    }, /*#__PURE__*/React.createElement(MascotIllustration, {
      size: 72,
      mood: "think"
    }), /*#__PURE__*/React.createElement("div", {
      className: "empty-state__message"
    }, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043D\u043E\u0439 \u0442\u0435\u043C\u044B \u2014 \u043E\u0442\u0432\u0435\u0442\u044C \u0432\u0435\u0440\u043D\u043E \u0445\u043E\u0442\u044F \u0431\u044B \u043D\u0430 \u043E\u0434\u0438\u043D \u0432\u043E\u043F\u0440\u043E\u0441 \u0432 \xAB\u0412\u043E\u043F\u0440\u043E\u0441\u0430\u0445\xBB, \u0438 \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0434\u043B\u044F \u0440\u0430\u0437\u043C\u0438\u043D\u043A\u0438.")));
  } else {
    body = /*#__PURE__*/React.createElement("div", {
      className: "question-card question-enter practice"
    }, /*#__PURE__*/React.createElement("div", {
      className: "practice__header-row"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "practice__title"
    }, "\u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0430"), /*#__PURE__*/React.createElement("div", {
      className: "practice__subtitle"
    }, "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0438\u0437 \u0443\u0436\u0435 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043D\u043E\u0433\u043E \u2014 \u0431\u0435\u0437 \u0442\u0430\u0439\u043C\u0435\u0440\u0430, \u0431\u0435\u0437 \u0432\u043B\u0438\u044F\u043D\u0438\u044F \u043D\u0430 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441. \u0420\u0430\u0437\u043C\u0438\u043D\u043A\u0430 \u043F\u0435\u0440\u0435\u0434 \u0441\u043D\u043E\u043C \u0438\u043B\u0438 \u043C\u0435\u0436\u0434\u0443 \u0434\u0435\u043B\u043E\u043C.")), /*#__PURE__*/React.createElement("div", {
      className: "practice__score"
    }, "\u0412\u0435\u0440\u043D\u043E ", score.correct, " \u0438\u0437 ", score.total)), /*#__PURE__*/React.createElement("div", {
      className: "badge",
      style: {
        marginBottom: "16px"
      }
    }, current.topicTitle), !isCode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "quiz-question__prompt"
    }, current.prompt), /*#__PURE__*/React.createElement("div", {
      className: "quiz-question__options"
    }, current.options.map((opt, i) => {
      let stateClass = "";
      if (checked && i === current.correct) stateClass = " opt-btn--correct";else if (checked && i === selected) stateClass = " opt-btn--wrong";
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: `opt-btn quiz-question__option practice__option${stateClass}`,
        disabled: checked,
        onClick: () => submitQuiz(i)
      }, opt);
    }))), isCode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "quiz-question__prompt"
    }, current.prompt), /*#__PURE__*/React.createElement(CodeEditorPanel, {
      value: code,
      onChange: setCode,
      disabled: checked,
      minHeight: 140,
      onRun: checked ? undefined : submitCode,
      running: isRunning,
      output: runResult ? runResult.logs : undefined,
      outputError: runResult ? runResult.error : null,
      onKeyDown: e => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          submitCode();
        }
      }
    })), checked && /*#__PURE__*/React.createElement("div", {
      className: `quiz-question__why practice__why${(isCode ? !runResult.error && logsMatch(runResult.logs, current.expectedLogs) : selected === current.correct) ? "" : " practice__why--wrong"}`
    }, isCode ? !runResult.error && logsMatch(runResult.logs, current.expectedLogs) ? current.why.right : current.why.wrong : selected === current.correct ? current.why.right : current.why.byOption?.[selected] || current.why.wrong), checked && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "16px"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: nextQuestion,
      className: "btn btn--primary"
    }, "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u2192")));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, body));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(PageRoot, null)));