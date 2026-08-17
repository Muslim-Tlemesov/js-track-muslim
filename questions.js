/* ==========================================================================
   pages/questions.jsx — основной поток обучения: сайдбар с темами,
   экран теории, вопросы (пока только type:"quiz" — code-вопросы это
   отдельный, следующий заход, требует переноса CodeEditor+движка
   выполнения кода).
   ========================================================================== */

function Sidebar({
  topicProgress,
  levelProgress,
  currentTopicId,
  onJumpToTopic
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-tagline sidebar__title"
  }, "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043A\u0443\u0440\u0441\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "sidebar__topic-list"
  }, LEVELS.map(lvl => {
    const topicsInLevel = TOPICS.filter(t => t.level === lvl.level);
    const locked = !isLevelUnlockedFor(levelProgress, lvl.level);
    if (locked) {
      const prevLvl = LEVELS.find(l => l.level === lvl.level - 1);
      const prevProg = levelProgress[prevLvl.level];
      const remaining = Math.max(0, Math.ceil(prevProg.total * LEVEL_UNLOCK_THRESHOLD) - prevProg.correct);
      return /*#__PURE__*/React.createElement("div", {
        key: lvl.level,
        className: "sidebar__locked-level"
      }, /*#__PURE__*/React.createElement("div", {
        className: "sidebar__locked-title"
      }, lvl.emoji, " ", lvl.label), /*#__PURE__*/React.createElement("div", {
        className: "sidebar__locked-desc"
      }, "\u041D\u0443\u0436\u043D\u043E \u0435\u0449\u0451 ", remaining, " ", remaining === 1 ? "верный ответ" : "верных ответов", " \u043D\u0430 \u0443\u0440\u043E\u0432\u043D\u0435 \xAB", prevLvl.emoji, " ", prevLvl.label, "\xBB."));
    }
    return topicsInLevel.map(t => {
      const prog = topicProgress[t.id];
      const isActive = t.id === currentTopicId;
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        className: `topic-btn sidebar__topic-btn${isActive ? " sidebar__topic-btn--active" : ""}`,
        onClick: () => onJumpToTopic(t.id)
      }, /*#__PURE__*/React.createElement("span", {
        className: "sidebar__topic-name"
      }, t.title), /*#__PURE__*/React.createElement("span", {
        className: "mono sidebar__topic-progress"
      }, prog.done, "/", prog.total));
    });
  })));
}
function QuizQuestion({
  question,
  onSubmit,
  feedback
}) {
  const [selected, setSelected] = React.useState(null);
  React.useEffect(() => {
    setSelected(null);
  }, [question.id]);
  const checked = feedback !== null;
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "quiz-question__prompt"
  }, question.prompt), /*#__PURE__*/React.createElement("div", {
    className: "quiz-question__options"
  }, question.options.map((opt, i) => {
    let stateClass = "";
    if (checked) {
      if (i === question.correct) stateClass = " opt-btn--correct";else if (i === selected) stateClass = " opt-btn--wrong";
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      className: `opt-btn quiz-question__option${stateClass}`,
      disabled: checked,
      onClick: () => {
        setSelected(i);
        onSubmit(i);
      }
    }, opt);
  })), checked && /*#__PURE__*/React.createElement("div", {
    className: "quiz-question__why"
  }, feedback.isCorrect ? question.why.right : question.why.byOption?.[selected] || question.why.wrong));
}
function CodeQuestion({
  question,
  onSubmit,
  feedback
}) {
  const [code, setCode] = React.useState(question.starter || "");
  const [isRunning, setIsRunning] = React.useState(false);
  const [runResult, setRunResult] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  React.useEffect(() => {
    setCode(question.starter || "");
    setRunResult(null);
    setShowHint(false);
  }, [question.id]);
  const checked = feedback !== null;
  const handleRun = () => {
    if (checked) return;
    setIsRunning(true);
    setTimeout(async () => {
      // Вопросы про DOM (dom-3..dom-6) используют "живой" объект-
      // заглушку (button/card/title/el) вместо реального DOM.
      // liveKind/liveVarName — простые строки, безопасно уходят в
      // Worker (сам объект строится уже внутри него) — раньше такие
      // вопросы принудительно шли в синхронный путь на главном потоке,
      // где тяжёлая команда без явного цикла могла подвесить вкладку.
      const result = await runUserCode(code, {
        liveKind: question.liveKind,
        liveVarName: question.liveVarName
      });
      setRunResult(result);
      setIsRunning(false);
      const isCorrect = !result.error && logsMatch(result.logs, question.expectedLogs);
      onSubmit(isCorrect);
    }, 350);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "quiz-question__prompt"
  }, question.prompt), /*#__PURE__*/React.createElement(CodeEditor, {
    value: code,
    onChange: setCode,
    disabled: checked,
    minHeight: 140
  }), runResult && /*#__PURE__*/React.createElement("div", {
    className: "code-question__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "code-question__console-label"
  }, "\u25B8 CONSOLE"), runResult.error ? /*#__PURE__*/React.createElement("div", {
    className: "code-question__console-error"
  }, "\u2715 Error: ", runResult.error) : runResult.logs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "code-question__console-empty"
  }, "(\u043D\u0435\u0442 \u0432\u044B\u0432\u043E\u0434\u0430 console.log)") : runResult.logs.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "mono code-question__console-line"
  }, line))), /*#__PURE__*/React.createElement("div", {
    className: "code-question__actions"
  }, !checked && /*#__PURE__*/React.createElement("button", {
    className: "code-question__run-btn",
    onClick: handleRun,
    disabled: isRunning
  }, isRunning ? "Выполняется…" : "▶ Выполнить"), !checked && question.hint && /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn",
    onClick: () => setShowHint(v => !v)
  }, showHint ? "Скрыть подсказку" : "Подсказка")), showHint && !checked && /*#__PURE__*/React.createElement("div", {
    className: "code-question__hint"
  }, question.hint), checked && /*#__PURE__*/React.createElement("div", {
    className: "quiz-question__why"
  }, feedback.isCorrect ? question.why.right : question.why.wrong));
}
function PageRoot() {
  const [state, setState] = React.useState(null);
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [feedback, setFeedback] = React.useState(null); // { isCorrect } | null
  const [achievementToast, setAchievementToast] = React.useState(null);
  const [levelToast, setLevelToast] = React.useState(null);
  const questionStartRef = React.useRef(Date.now());
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
      const params = new URLSearchParams(window.location.search);
      const topicParam = params.get("topic");
      if (topicParam) {
        const lessonIdx = NAV_ITEMS.findIndex(it => it.type === "lesson" && it.topicId === topicParam);
        setCurrentIdx(lessonIdx !== -1 ? lessonIdx : 0);
      } else {
        setCurrentIdx(findResumeIndex(NAV_ITEMS, core.answers, core.topicProgress));
      }
    })();
  }, []);
  React.useEffect(() => {
    questionStartRef.current = Date.now();
    setFeedback(null);
  }, [currentIdx]);
  const handleToggleTheme = async () => {
    const next = await toggleAndSaveTheme(themeMode);
    setThemeMode(next);
  };
  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await safeStorage.set(SOUND_KEY, next ? "on" : "off");
  };
  const handleJumpToTopic = topicId => {
    const lessonIdx = NAV_ITEMS.findIndex(it => it.type === "lesson" && it.topicId === topicId);
    if (lessonIdx !== -1) setCurrentIdx(lessonIdx);
  };
  const handleStartQuestions = () => {
    setCurrentIdx(i => i + 1);
  };
  const showResultToasts = result => {
    if (result.levelJustUnlocked) {
      const lvl = LEVELS.find(l => l.level === result.levelJustUnlocked);
      setLevelToast(lvl);
      setTimeout(() => setLevelToast(null), 4000);
    }
    if (result.newlyUnlocked && result.newlyUnlocked.length > 0) {
      // показываем по одному, с небольшой задержкой между ними, если
      // открылось сразу несколько — иначе они бы просто перезаписали
      // друг друга и было бы видно только последнее.
      result.newlyUnlocked.forEach((a, i) => {
        setTimeout(() => {
          setAchievementToast(a);
          setTimeout(() => setAchievementToast(null), 4000);
        }, i * 4200);
      });
    }
  };
  const handleQuizSubmit = async optionIdx => {
    if (feedback !== null) return; // защита от повторной отправки
    const item = NAV_ITEMS[currentIdx];
    const isCorrect = optionIdx === item.correct;
    setFeedback({
      isCorrect
    });
    if (isCorrect) playCorrectTick(soundEnabled);
    const result = await submitAnswer({
      question: item,
      isCorrect,
      elapsedMs: Date.now() - questionStartRef.current
    });
    await updateReviewSchedule(item.id, isCorrect);
    const core = await loadCoreState();
    setState(prev => ({
      ...prev,
      ...core
    }));
    showResultToasts(result);
  };
  const handleCodeSubmit = async isCorrect => {
    if (feedback !== null) return;
    const item = NAV_ITEMS[currentIdx];
    setFeedback({
      isCorrect
    });
    if (isCorrect) playCorrectTick(soundEnabled);
    const result = await submitAnswer({
      question: item,
      isCorrect,
      elapsedMs: Date.now() - questionStartRef.current
    });
    await updateReviewSchedule(item.id, isCorrect);
    const core = await loadCoreState();
    setState(prev => ({
      ...prev,
      ...core
    }));
    showResultToasts(result);
  };
  const handleNext = () => {
    if (currentIdx < NAV_ITEMS.length - 1) setCurrentIdx(i => i + 1);
  };
  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx(i => i - 1);
  };
  if (!state) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
      currentPage: "questions",
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
  const item = NAV_ITEMS[currentIdx];
  const levelProgress = computeLevelProgress(state.answers);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
    currentPage: "questions",
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
    className: "layout"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    topicProgress: state.topicProgress,
    levelProgress: levelProgress,
    currentTopicId: item.topicId,
    onJumpToTopic: handleJumpToTopic
  }), /*#__PURE__*/React.createElement("div", {
    className: "layout__main"
  }, item.type === "lesson" ? /*#__PURE__*/React.createElement(LessonCard, {
    lesson: item.lesson,
    topicId: item.topicId,
    topicTitle: item.topicTitle,
    onStart: handleStartQuestions
  }) : item.type === "code" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CodeQuestion, {
    question: item,
    onSubmit: handleCodeSubmit,
    feedback: feedback
  }), feedback && /*#__PURE__*/React.createElement("div", {
    className: "mascot-feedback"
  }, /*#__PURE__*/React.createElement("div", {
    className: `mascot-feedback__avatar mascot-feedback__avatar--${feedback.isCorrect ? "correct" : "wrong"}`
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 20,
    color: feedback.isCorrect ? "var(--success)" : "var(--accent)",
    mood: feedback.isCorrect ? "correct" : "wrong"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mascot-feedback__bubble"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mascot-feedback__name"
  }, MASCOT_NAME), (feedback.isCorrect ? MASCOT_CORRECT : MASCOT_WRONG)[hashStr(item.id + feedback.isCorrect) % (feedback.isCorrect ? MASCOT_CORRECT : MASCOT_WRONG).length])), /*#__PURE__*/React.createElement("div", {
    className: "questions-page__nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn",
    onClick: handleBack,
    disabled: currentIdx === 0
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn nav__btn--active",
    onClick: handleNext,
    disabled: currentIdx >= NAV_ITEMS.length - 1
  }, "\u0414\u0430\u043B\u0435\u0435 \u2192"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(QuizQuestion, {
    question: item,
    onSubmit: handleQuizSubmit,
    feedback: feedback
  }), feedback && /*#__PURE__*/React.createElement("div", {
    className: "mascot-feedback"
  }, /*#__PURE__*/React.createElement("div", {
    className: `mascot-feedback__avatar mascot-feedback__avatar--${feedback.isCorrect ? "correct" : "wrong"}`
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 20,
    color: feedback.isCorrect ? "var(--success)" : "var(--accent)",
    mood: feedback.isCorrect ? "correct" : "wrong"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mascot-feedback__bubble"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mascot-feedback__name"
  }, MASCOT_NAME), (feedback.isCorrect ? MASCOT_CORRECT : MASCOT_WRONG)[hashStr(item.id + feedback.isCorrect) % (feedback.isCorrect ? MASCOT_CORRECT : MASCOT_WRONG).length])), /*#__PURE__*/React.createElement("div", {
    className: "questions-page__nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn",
    onClick: handleBack,
    disabled: currentIdx === 0
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    className: "nav-btn nav__btn nav__btn--active",
    onClick: handleNext,
    disabled: currentIdx >= NAV_ITEMS.length - 1
  }, "\u0414\u0430\u043B\u0435\u0435 \u2192"))))), levelToast && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    onClick: () => setLevelToast(null),
    className: "toast toast--level"
  }, /*#__PURE__*/React.createElement("span", {
    className: "toast--level__emoji"
  }, levelToast.emoji), /*#__PURE__*/React.createElement("div", {
    className: "toast--level__title"
  }, "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u043E\u0442\u043A\u0440\u044B\u0442!"), /*#__PURE__*/React.createElement("div", {
    className: "toast--level__desc"
  }, "\xAB", levelToast.label, "\xBB \u0442\u0435\u043F\u0435\u0440\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D")), achievementToast && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    onClick: () => setAchievementToast(null),
    className: "toast toast--achievement"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toast--achievement__avatar"
  }, /*#__PURE__*/React.createElement(MascotIcon, {
    size: 18,
    color: "var(--accent2)",
    mood: "celebrate"
  })), /*#__PURE__*/React.createElement("span", {
    className: "toast--achievement__text"
  }, /*#__PURE__*/React.createElement("strong", null, MASCOT_NAME, ":"), " ", MASCOT_ACHIEVEMENT[hashStr(achievementToast.id) % MASCOT_ACHIEVEMENT.length], " ", /*#__PURE__*/React.createElement("strong", null, achievementToast.title), " \u2014 ", achievementToast.description)));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));