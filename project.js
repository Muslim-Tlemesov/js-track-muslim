/* ==========================================================================
   pages/project.jsx — «Мини-проект: Таймер». Без проверки правильности —
   просто собери рабочую вещь: код запускается с "живыми" startBtn/
   display/setInterval, и реальный предпросмотр тикает по клику.
   ========================================================================== */

function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [code, setCode] = React.useState(PROJECT_TIMER_STARTER);
  const [displayText, setDisplayText] = React.useState("0 сек");
  const [runResult, setRunResult] = React.useState(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const intervalsRef = React.useRef([]);
  const liveRef = React.useRef(null);
  const pendingRunTimeoutRef = React.useRef(null);
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
    return () => {
      if (pendingRunTimeoutRef.current) clearTimeout(pendingRunTimeoutRef.current);
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
    };
  }, []);
  const handleToggleTheme = async () => {
    setThemeMode(await toggleAndSaveTheme(themeMode));
  };
  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await safeStorage.set(SOUND_KEY, next ? "on" : "off");
  };
  const stopAllIntervals = () => {
    if (pendingRunTimeoutRef.current) {
      clearTimeout(pendingRunTimeoutRef.current);
      pendingRunTimeoutRef.current = null;
    }
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  };
  const run = () => {
    stopAllIntervals();
    setDisplayText("0 сек");
    setIsRunning(true);
    pendingRunTimeoutRef.current = setTimeout(async () => {
      pendingRunTimeoutRef.current = null;
      const startBtn = {
        handlers: {},
        addEventListener(ev, cb) {
          this.handlers[ev] = cb;
        }
      };
      const display = {
        _text: "0 сек",
        get textContent() {
          return this._text;
        },
        set textContent(v) {
          this._text = String(v);
          setDisplayText(this._text);
        }
      };
      const trackedSetInterval = (fn, ms) => {
        const id = setInterval(fn, ms);
        intervalsRef.current.push(id);
        return id;
      };
      const trackedClearInterval = id => {
        clearInterval(id);
        intervalsRef.current = intervalsRef.current.filter(x => x !== id);
      };
      const result = await runUserCode(code, {
        extraArgs: {
          startBtn,
          display,
          setInterval: trackedSetInterval,
          clearInterval: trackedClearInterval
        }
      });
      setRunResult(result);
      setIsRunning(false);
      liveRef.current = startBtn;
    }, 350);
  };
  const handlePreviewClick = () => {
    liveRef.current?.handlers.click?.();
  };
  const resetToStarter = () => {
    stopAllIntervals();
    setCode(PROJECT_TIMER_STARTER);
    setDisplayText("0 сек");
    setRunResult(null);
    liveRef.current = null;
  };
  const headerProps = headerState ? {
    currentPage: "project",
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
    currentPage: "project",
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
    className: "question-card question-enter project"
  }, /*#__PURE__*/React.createElement("div", {
    className: "project__header-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "project__title"
  }, "\u041C\u0438\u043D\u0438-\u043F\u0440\u043E\u0435\u043A\u0442: \u0422\u0430\u0439\u043C\u0435\u0440"), /*#__PURE__*/React.createElement("div", {
    className: "project__subtitle"
  }, "\u0417\u0434\u0435\u0441\u044C \u043D\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043D\u0430 \xAB\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E/\u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\xBB \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u0441\u043E\u0431\u0435\u0440\u0438 \u0440\u0430\u0431\u043E\u0447\u0443\u044E \u0432\u0435\u0449\u044C. \u041D\u0430\u043F\u0438\u0448\u0438 \u043A\u043E\u0434, \u043D\u0430\u0436\u043C\u0438 \xAB\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C\xBB, \u0430 \u0437\u0430\u0442\u0435\u043C \u0436\u043C\u0438 \u043D\u0430 \u043A\u043D\u043E\u043F\u043A\u0443 \u0432 \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435 \u043D\u0438\u0436\u0435 \u2014 \u0442\u0430\u0439\u043C\u0435\u0440 \u0434\u043E\u043B\u0436\u0435\u043D \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0442\u0438\u043A\u0430\u0442\u044C.")), /*#__PURE__*/React.createElement("button", {
    onClick: resetToStarter,
    className: "project__reset-btn"
  }, "\u21BA \u041D\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "project__preview"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono project__display"
  }, displayText), /*#__PURE__*/React.createElement("button", {
    onClick: handlePreviewClick,
    className: "project__preview-btn"
  }, "\u0421\u0442\u0430\u0440\u0442 / \u0421\u0442\u043E\u043F"), /*#__PURE__*/React.createElement("div", {
    className: "project__preview-hint"
  }, "\u25B6 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u0430\u0436\u043C\u0438 \xAB\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C\xBB")), /*#__PURE__*/React.createElement(CodeEditor, {
    value: code,
    onChange: setCode,
    minHeight: 200,
    onKeyDown: e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "project__hint"
  }, "Ctrl+Enter (\u2318+Enter \u043D\u0430 Mac) \u2014 \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A"), /*#__PURE__*/React.createElement("div", {
    className: "project__actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: run,
    disabled: isRunning,
    className: "project__run-btn"
  }, isRunning ? "Выполняется…" : "▶ Запустить")), runResult?.error && /*#__PURE__*/React.createElement("div", {
    className: "project__error"
  }, "\u2297 Error: ", runResult.error))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));