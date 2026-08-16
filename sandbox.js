/* ==========================================================================
   pages/sandbox.jsx — «Свободная консоль»: произвольный JS без привязки
   к заданиям, плюс пошаговый отладчик (кнопка «Отладчик»).
   ========================================================================== */

const SANDBOX_DEFAULT_CODE = "let a = 5;\nlet b = 10;\n\nconsole.log(a + b);\n";
function DebugPanel({
  session,
  setSession,
  onExit
}) {
  const {
    steps,
    idx,
    error,
    code
  } = session;
  const hasSteps = steps.length > 0;
  const step = hasSteps ? steps[idx] : null;
  const isFirst = idx === 0;
  const isLast = idx === steps.length - 1;
  const codeLines = code.split("\n");
  const outputSoFar = hasSteps ? steps.slice(0, idx + 1).flatMap(s => s.logs) : [];
  const goToStep = delta => {
    setSession(prev => ({
      ...prev,
      idx: Math.max(0, Math.min(prev.steps.length - 1, prev.idx + delta))
    }));
  };
  const goToFirstStep = () => setSession(prev => ({
    ...prev,
    idx: 0
  }));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__header-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__label"
  }, "\uD83D\uDC1E \u041F\u043E\u0448\u0430\u0433\u043E\u0432\u044B\u0439 \u043E\u0442\u043B\u0430\u0434\u0447\u0438\u043A \u2014 \u0432\u044B\u0437\u043E\u0432\u044B \u0444\u0443\u043D\u043A\u0446\u0438\u0439 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0442\u0441\u044F \u0446\u0435\u043B\u0438\u043A\u043E\u043C, \u0431\u0435\u0437 \u0437\u0430\u0445\u043E\u0434\u0430 \u0432\u043D\u0443\u0442\u0440\u044C"), /*#__PURE__*/React.createElement("button", {
    onClick: onExit,
    className: "debug-panel__exit-btn"
  }, "\u270F\uFE0F \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043A\u043E\u0434")), /*#__PURE__*/React.createElement("div", {
    className: "ide-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ide-split-left"
  }, /*#__PURE__*/React.createElement("pre", {
    className: "mono debug-panel__code"
  }, codeLines.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `debug-panel__code-line${hasSteps && step.line === i ? " debug-panel__code-line--active" : ""}`,
    dangerouslySetInnerHTML: {
      __html: highlightJs(line) || "\u00A0"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "ide-split-right"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__vars-label"
  }, "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435", hasSteps && step.line != null ? ` — после строки ${step.line + 1}` : ""), !hasSteps ? /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__vars-empty"
  }, "\u0448\u0430\u0433\u043E\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") : Object.keys(step.vars).length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__vars-empty"
  }, "\u043F\u043E\u043A\u0430 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439") : /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__vars-list"
  }, Object.entries(step.vars).map(([name, value]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    className: "mono debug-panel__var-chip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "debug-panel__var-name"
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "debug-panel__var-eq"
  }, " = "), /*#__PURE__*/React.createElement("span", {
    className: "debug-panel__var-value"
  }, formatDebugValue(value)))))), /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono debug-panel__console-body"
  }, outputSoFar.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__console-empty"
  }, "// \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E") : outputSoFar.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "debug-panel__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "debug-panel__console-arrow"
  }, "\u276F "), l)))), error && (isLast || !hasSteps) && /*#__PURE__*/React.createElement("div", {
    className: "debug-panel__error"
  }, "\u2297 ", error))), hasSteps && /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-row",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "viz__step-count"
  }, "\u0428\u0430\u0433 ", idx + 1, " \u0438\u0437 ", steps.length), /*#__PURE__*/React.createElement("div", {
    className: "viz__nav-buttons"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: goToFirstStep,
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u21BA \u0421\u043D\u0430\u0447\u0430\u043B\u0430"), /*#__PURE__*/React.createElement("button", {
    onClick: () => goToStep(-1),
    disabled: isFirst,
    className: "viz__nav-btn"
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    onClick: () => goToStep(1),
    disabled: isLast,
    className: "viz__nav-btn viz__nav-btn--primary"
  }, isLast ? "Готово" : "Следующая строка →"))));
}
function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [code, setCode] = React.useState(SANDBOX_DEFAULT_CODE);
  const [runResult, setRunResult] = React.useState(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState(null);
  const [debugSession, setDebugSession] = React.useState(null);
  const pendingRunTimeoutRef = React.useRef(null);
  React.useEffect(() => {
    (async () => {
      const mode = await loadAndApplyTheme();
      setThemeMode(mode);
      try {
        const soundRes = await safeStorage.get(SOUND_KEY);
        if (soundRes && soundRes.value === "off") setSoundEnabled(false);
      } catch {/* звук включён по умолчанию */}
      try {
        const res = await safeStorage.get(SANDBOX_KEY);
        if (res && res.value) setCode(res.value);
      } catch {/* черновика ещё нет — остаёмся на примере по умолчанию */}
      const core = await loadCoreState();
      setHeaderState({
        ...core,
        achievementsTotal: ACHIEVEMENTS.length
      });
    })();
    return () => {
      if (pendingRunTimeoutRef.current) clearTimeout(pendingRunTimeoutRef.current);
      if (typeof terminateActiveCodeWorker === "function") terminateActiveCodeWorker();
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
  const updateCode = value => {
    setCode(value);
    safeStorage.set(SANDBOX_KEY, value);
  };
  const stopPendingRun = () => {
    if (pendingRunTimeoutRef.current) {
      clearTimeout(pendingRunTimeoutRef.current);
      pendingRunTimeoutRef.current = null;
    }
    if (typeof terminateActiveCodeWorker === "function") terminateActiveCodeWorker();
  };
  const run = () => {
    stopPendingRun();
    setIsRunning(true);
    pendingRunTimeoutRef.current = setTimeout(async () => {
      pendingRunTimeoutRef.current = null;
      const result = await runUserCode(code);
      setRunResult(result);
      setIsRunning(false);
    }, 350);
  };
  const resetToExample = () => {
    stopPendingRun();
    updateCode(SANDBOX_DEFAULT_CODE);
    setRunResult(null);
  };
  const startDebug = () => {
    const result = runUserCodeStepByStep(code);
    setDebugSession({
      steps: result.steps,
      idx: 0,
      error: result.error,
      code
    });
  };
  const stopDebug = () => setDebugSession(null);
  const copyCode = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus(null), 1500);
    }, () => {
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus(null), 1500);
    });
  };
  const headerProps = headerState ? {
    currentPage: "sandbox",
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
    onResetProgress: handleResetProgress
  } : {
    currentPage: "sandbox",
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
    onResetProgress: handleResetProgress
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, headerProps), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter sandbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sandbox__header-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sandbox__title"
  }, "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u0430\u044F \u043A\u043E\u043D\u0441\u043E\u043B\u044C"), /*#__PURE__*/React.createElement("div", {
    className: "sandbox__subtitle"
  }, "\u041F\u0438\u0448\u0438 \u043B\u044E\u0431\u043E\u0439 JS \u0438 \u0441\u043C\u043E\u0442\u0440\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u2014 \u0431\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043A \u0437\u0430\u0434\u0430\u043D\u0438\u044F\u043C, \u0431\u0435\u0437 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043E\u0442\u0432\u0435\u0442\u0430.")), !debugSession && /*#__PURE__*/React.createElement("button", {
    onClick: resetToExample,
    className: "sandbox__reset-btn"
  }, "\u21BA \u041F\u0440\u0438\u043C\u0435\u0440 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E")), debugSession ? /*#__PURE__*/React.createElement(DebugPanel, {
    session: debugSession,
    setSession: setDebugSession,
    onExit: stopDebug
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CodeEditor, {
    value: code,
    onChange: updateCode,
    minHeight: 220,
    onKeyDown: e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sandbox__hint"
  }, "Ctrl+Enter (\u2318+Enter \u043D\u0430 Mac) \u2014 \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u043A\u043E\u0434\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "sandbox__actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: run,
    disabled: isRunning,
    className: "sandbox__run-btn"
  }, isRunning ? "Выполняется…" : "▶ Выполнить"), /*#__PURE__*/React.createElement("button", {
    onClick: startDebug,
    className: "sandbox__debug-btn"
  }, "\uD83D\uDC1E \u041E\u0442\u043B\u0430\u0434\u0447\u0438\u043A"), runResult && /*#__PURE__*/React.createElement("button", {
    onClick: copyCode,
    className: "sandbox__copy-btn"
  }, copyStatus === "copied" ? "✓ Скопировано" : copyStatus === "failed" ? "Не вышло" : "⧉ Копировать код")), runResult && /*#__PURE__*/React.createElement("div", {
    className: "sandbox__console"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sandbox__console-label"
  }, "\u25B7 console"), /*#__PURE__*/React.createElement("div", {
    className: "mono sandbox__console-body"
  }, runResult.error && /*#__PURE__*/React.createElement("div", {
    className: "sandbox__console-error"
  }, "\u2297 Error: ", runResult.error), !runResult.error && runResult.logs.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "sandbox__console-empty"
  }, "// \u043D\u0435\u0442 \u0432\u044B\u0432\u043E\u0434\u0430 \u2014 \u0434\u043E\u0431\u0430\u0432\u044C console.log(...)"), runResult.logs.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sandbox__console-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sandbox__console-arrow"
  }, "\u276F "), l))))))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));