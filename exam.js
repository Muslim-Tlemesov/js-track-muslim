/* ==========================================================================
   pages/exam.jsx — «Финальный экзамен»: 30 случайных вопросов со всего
   курса, общий таймер 20 минут, не влияет на прогресс/XP/достижения.
   Упрощено относительно старой версии — без визуального превью живого
   DOM-элемента (LiveDomPreview) и без конфетти на отличном результате,
   оба — полировка, а не основная функциональность.
   ========================================================================== */

function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [phase, setPhase] = React.useState("intro");
  const [questions, setQuestions] = React.useState([]);
  const [idx, setIdx] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [runResult, setRunResult] = React.useState(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [timeLeftSec, setTimeLeftSec] = React.useState(EXAM_DURATION_SECONDS);
  const [timeUp, setTimeUp] = React.useState(false);
  const lastSubmittedIdxRef = React.useRef(-1);
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
  React.useEffect(() => {
    if (phase !== "running") return;
    if (timeLeftSec <= 0) {
      setTimeUp(true);
      setPhase("done");
      return;
    }
    const timeout = setTimeout(() => setTimeLeftSec(t => t - 1), 1000);
    return () => clearTimeout(timeout);
  }, [phase, timeLeftSec]);
  React.useEffect(() => {
    if (phase !== "done") return;
    const pct = questions.length ? Math.round(score / questions.length * 100) : 0;
    if (pct >= 80) playVictoryChime(soundEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const handleToggleTheme = async () => {
    setThemeMode(await toggleAndSaveTheme(themeMode));
  };
  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await safeStorage.set(SOUND_KEY, next ? "on" : "off");
  };
  const current = questions[idx] || null;
  const isCode = current?.type === "code";
  const startExam = () => {
    const qs = sampleExamQuestions(EXAM_QUESTION_COUNT);
    setQuestions(qs);
    setIdx(0);
    setScore(0);
    setSelected(null);
    setChecked(false);
    setCode(qs[0]?.starter || "");
    setRunResult(null);
    setTimeLeftSec(EXAM_DURATION_SECONDS);
    setTimeUp(false);
    lastSubmittedIdxRef.current = -1;
    setPhase("running");
  };
  const submitQuizAnswer = optionIdx => {
    if (lastSubmittedIdxRef.current === idx) return;
    lastSubmittedIdxRef.current = idx;
    setSelected(optionIdx);
    setChecked(true);
    if (optionIdx === current.correct) {
      setScore(s => s + 1);
      playCorrectTick(soundEnabled);
    }
  };
  const submitCodeAnswer = () => {
    if (lastSubmittedIdxRef.current === idx) return;
    lastSubmittedIdxRef.current = idx;
    setIsRunning(true);
    setTimeout(async () => {
      const result = await runUserCode(code, {
        liveKind: current.liveKind,
        liveVarName: current.liveVarName
      });
      setRunResult(result);
      setIsRunning(false);
      setChecked(true);
      if (!result.error && logsMatch(result.logs, current.expectedLogs)) {
        setScore(s => s + 1);
        playCorrectTick(soundEnabled);
      }
    }, 350);
  };
  const goNext = () => {
    const nextIdx = idx + 1;
    if (nextIdx >= questions.length) {
      setPhase("done");
      return;
    }
    setIdx(nextIdx);
    setSelected(null);
    setChecked(false);
    setCode(questions[nextIdx]?.starter || "");
    setRunResult(null);
  };
  const headerProps = headerState ? {
    currentPage: "exam",
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
    currentPage: "exam",
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
  if (phase === "intro") {
    body = /*#__PURE__*/React.createElement("div", {
      className: "question-card question-enter exam"
    }, /*#__PURE__*/React.createElement("div", {
      className: "exam__title"
    }, "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u044D\u043A\u0437\u0430\u043C\u0435\u043D"), /*#__PURE__*/React.createElement("div", {
      className: "exam__intro-text"
    }, EXAM_QUESTION_COUNT, " \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0432\u043F\u0435\u0440\u0435\u043C\u0435\u0448\u043A\u0443 \u0438\u0437 \u0432\u0441\u0435\u0445 \u0442\u0435\u043C \u043A\u0443\u0440\u0441\u0430 \u2014 \u0438 quiz, \u0438 \u043A\u043E\u0434. \u041D\u0430 \u0432\u0441\u0451 \u0434\u0430\u0451\u0442\u0441\u044F ", formatExamTime(EXAM_DURATION_SECONDS), " \u2014 \u0442\u0430\u0439\u043C\u0435\u0440 \u043E\u0431\u0449\u0438\u0439 \u043D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0437\u0430\u043C\u0435\u043D, \u043D\u0435 \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0443 \u043C\u0435\u0436\u0434\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u043C\u0438; \u043A\u043E\u0433\u0434\u0430 \u0432\u0440\u0435\u043C\u044F \u0432\u044B\u0439\u0434\u0435\u0442, \u044D\u043A\u0437\u0430\u043C\u0435\u043D \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441 \u0442\u0435\u043C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u043C, \u0447\u0442\u043E \u0443\u0441\u043F\u0435\u043B \u043D\u0430\u0431\u0440\u0430\u0442\u044C. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043A\u0443\u0440\u0441\u0430, XP \u0438\u043B\u0438 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u2014 \u044D\u0442\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u0435\u0431\u044F, \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442\u044C \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0443\u0433\u043E\u0434\u043D\u043E \u0440\u0430\u0437."), /*#__PURE__*/React.createElement("button", {
      onClick: startExam,
      className: "exam__start-btn"
    }, "\u25B6 \u041D\u0430\u0447\u0430\u0442\u044C \u044D\u043A\u0437\u0430\u043C\u0435\u043D"));
  } else if (phase === "done") {
    const pct = questions.length ? Math.round(score / questions.length * 100) : 0;
    const tier = pct >= 80 ? "strong" : pct >= 50 ? "mid" : "low";
    body = /*#__PURE__*/React.createElement("div", {
      className: "question-card question-enter exam exam--done"
    }, /*#__PURE__*/React.createElement("div", {
      className: `exam__done-title exam__done-title--${tier}`
    }, timeUp ? "Время вышло" : tier === "strong" ? "Экзамен пройден отлично!" : tier === "mid" ? "Экзамен завершён" : "Экзамен завершён — есть куда расти"), /*#__PURE__*/React.createElement("div", {
      className: `exam__done-pct exam__done-pct--${tier}`
    }, pct, "%"), /*#__PURE__*/React.createElement("div", {
      className: "exam__done-detail"
    }, score, " \u0438\u0437 ", questions.length, " \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0445 \u043E\u0442\u0432\u0435\u0442\u043E\u0432", timeUp && ` · успел дойти до вопроса ${Math.min(idx + 1, questions.length)} из ${questions.length}`), /*#__PURE__*/React.createElement("div", {
      className: "exam__done-mascot-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: `mascot-feedback__avatar mascot-feedback__avatar--${tier === "low" ? "wrong" : "correct"}`
    }, /*#__PURE__*/React.createElement(MascotIcon, {
      size: 20,
      mood: tier === "low" ? "wrong" : "correct"
    })), /*#__PURE__*/React.createElement("div", {
      className: "mascot-feedback__bubble"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mascot-feedback__name"
    }, MASCOT_NAME), tier === "strong" ? "Отличный результат — курс явно усвоен." : tier === "mid" ? "Хорошая база, но есть что подтянуть — глянь «Итоги», там видно, где именно." : "Не расстраивайся — пересдай, когда будешь готов. Экзамен никуда не убежит.")), /*#__PURE__*/React.createElement("button", {
      onClick: startExam,
      className: "exam__restart-btn"
    }, "\u21BA \u041F\u0440\u043E\u0439\u0442\u0438 \u0435\u0449\u0451 \u0440\u0430\u0437"));
  } else if (current) {
    const status = !checked ? null : isCode ? !runResult.error && logsMatch(runResult.logs, current.expectedLogs) ? "correct" : "wrong" : selected === current.correct ? "correct" : "wrong";
    body = /*#__PURE__*/React.createElement("div", {
      className: "question-card question-enter exam"
    }, /*#__PURE__*/React.createElement("div", {
      className: "exam__progress-row"
    }, /*#__PURE__*/React.createElement("span", null, "\u0412\u043E\u043F\u0440\u043E\u0441 ", idx + 1, " \u0438\u0437 ", questions.length), /*#__PURE__*/React.createElement("span", {
      className: `mono exam__timer${timeLeftSec <= 60 ? " exam__timer--low" : ""}`
    }, formatExamTime(timeLeftSec)), /*#__PURE__*/React.createElement("span", null, current.topicTitle)), /*#__PURE__*/React.createElement("div", {
      className: "exam__prompt"
    }, current.prompt), !isCode && /*#__PURE__*/React.createElement("div", {
      className: "quiz-question__options"
    }, current.options.map((opt, i) => {
      let stateClass = "";
      if (checked && i === current.correct) stateClass = " opt-btn--correct";else if (checked && i === selected) stateClass = " opt-btn--wrong";
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: `opt-btn quiz-question__option${stateClass}`,
        disabled: checked,
        onClick: () => submitQuizAnswer(i)
      }, opt);
    })), isCode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(CodeEditorPanel, {
      value: code,
      onChange: setCode,
      disabled: checked,
      minHeight: 140,
      onRun: checked ? undefined : submitCodeAnswer,
      running: isRunning,
      output: runResult ? runResult.logs : undefined,
      outputError: runResult ? runResult.error : null,
      onKeyDown: e => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          submitCodeAnswer();
        }
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "exam__code-hint"
    }, "Ctrl+Enter (\u2318+Enter \u043D\u0430 Mac) \u2014 \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A")), checked && /*#__PURE__*/React.createElement("div", {
      className: `exam__feedback${status === "correct" ? " exam__feedback--correct" : " exam__feedback--wrong"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "exam__feedback-title"
    }, status === "correct" ? "✓ Верно" : "✗ Пока не так"), /*#__PURE__*/React.createElement("div", {
      className: "exam__feedback-text"
    }, status === "correct" ? current.why.right : current.why.byOption?.[selected] ?? current.why.wrong)), checked && /*#__PURE__*/React.createElement("button", {
      onClick: goNext,
      className: "exam__next-btn"
    }, idx + 1 >= questions.length ? "Завершить экзамен" : "Следующий вопрос", " \u2192"));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, body));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(PageRoot, null)));