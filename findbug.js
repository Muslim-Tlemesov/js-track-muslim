/* ==========================================================================
   pages/findbug.jsx — «Найди баг»: кликни на строку, где спрятана
   проблема — активный поиск, а не выбор из списка вариантов.
   ========================================================================== */

function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [headerState, setHeaderState] = React.useState(null);
  const [idx, setIdx] = React.useState(0);
  const [pickedLine, setPickedLine] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
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
  const snippet = BUG_SHUFFLED[idx];
  const lines = snippet.code.split("\n");
  const isLast = idx === BUG_SHUFFLED.length - 1;
  const isCorrect = checked && pickedLine === snippet.buggyLine;
  const pick = lineIdx => {
    if (checked) return;
    setPickedLine(lineIdx);
  };
  const check = () => {
    if (pickedLine === null || checked) return;
    setChecked(true);
    setScore(prev => ({
      correct: prev.correct + (pickedLine === snippet.buggyLine ? 1 : 0),
      total: prev.total + 1
    }));
  };
  const next = () => {
    setIdx(i => (i + 1) % BUG_SHUFFLED.length);
    setPickedLine(null);
    setChecked(false);
  };
  const restart = () => {
    setIdx(0);
    setPickedLine(null);
    setChecked(false);
    setScore({
      correct: 0,
      total: 0
    });
  };
  const lineClass = i => {
    if (!checked) return pickedLine === i ? " findbug__line--picked" : "";
    if (i === snippet.buggyLine) return " findbug__line--correct-answer";
    if (i === pickedLine) return " findbug__line--wrong-answer";
    return "";
  };
  const headerProps = headerState ? {
    currentPage: "findbug",
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
    currentPage: "findbug",
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
    className: "question-card question-enter findbug"
  }, /*#__PURE__*/React.createElement("div", {
    className: "findbug__header-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "findbug__title"
  }, "\uD83D\uDC1B \u041D\u0430\u0439\u0434\u0438 \u0431\u0430\u0433"), /*#__PURE__*/React.createElement("button", {
    onClick: restart,
    className: "findbug__restart-btn"
  }, "\u21BA \u041D\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "findbug__subtitle"
  }, "\u041A\u043B\u0438\u043A\u043D\u0438 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443, \u0433\u0434\u0435 \u0441\u043F\u0440\u044F\u0442\u0430\u043D\u0430 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u2014 \u043D\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u0439 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430, \u0430 \u0438\u043C\u0435\u043D\u043D\u043E \u043D\u0430\u0439\u0434\u0438 \u0435\u0451 \u0432 \u043A\u043E\u0434\u0435."), /*#__PURE__*/React.createElement("div", {
    className: "findbug__progress-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u041F\u0440\u0438\u043C\u0435\u0440 ", idx + 1, " \u0438\u0437 ", BUG_SHUFFLED.length), /*#__PURE__*/React.createElement("span", null, "\u0412\u0435\u0440\u043D\u043E: ", score.correct, " \u0438\u0437 ", score.total)), /*#__PURE__*/React.createElement("div", {
    className: "findbug__topic-badge"
  }, snippet.topic), /*#__PURE__*/React.createElement("pre", {
    className: "mono findbug__code"
  }, lines.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => pick(i),
    className: `findbug__line${lineClass(i)}`,
    dangerouslySetInnerHTML: {
      __html: highlightJs(line) || "\u00A0"
    }
  }))), !checked ? /*#__PURE__*/React.createElement("button", {
    onClick: check,
    disabled: pickedLine === null,
    className: "findbug__check-btn"
  }, "\u2713 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: `findbug__result${isCorrect ? " findbug__result--correct" : " findbug__result--wrong"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "findbug__result-title"
  }, isCorrect ? `✓ Точно! Строка ${snippet.buggyLine + 1}` : `✗ Баг на самом деле в строке ${snippet.buggyLine + 1}`), /*#__PURE__*/React.createElement("div", {
    className: "findbug__result-explanation"
  }, snippet.explanation), /*#__PURE__*/React.createElement("div", {
    className: "findbug__result-fixed-label"
  }, "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442"), /*#__PURE__*/React.createElement("pre", {
    className: "mono findbug__result-fixed",
    dangerouslySetInnerHTML: {
      __html: highlightJs(snippet.fixed)
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: next,
    className: "findbug__next-btn"
  }, isLast ? "Начать по кругу заново" : "Следующий пример", " \u2192")))));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));