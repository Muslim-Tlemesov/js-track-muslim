/* ==========================================================================
   pages/tree.jsx — «Карта знаний»: то же дерево тем, что в сайдбаре, но
   как визуальный граф (корень → ветки-категории → листья-темы).

   Нашёл при переносе: KNOWLEDGE_TREE/TREE_LEAF_LABEL в старой версии
   покрывали только исходные 9 тем — 3 более новые (naming/array-
   mutability/object-methods, добавленные позже) в дереве не появлялись
   вообще. Добавил их в соответствующие ветки.
   ========================================================================== */

const KNOWLEDGE_TREE = [{
  id: "basics",
  label: "Основы",
  emoji: "🌱",
  color: "#6BCB77",
  topicIds: ["vars", "naming", "strings", "destructuring"]
}, {
  id: "data",
  label: "Работа с данными",
  emoji: "📦",
  color: "#FFD93D",
  topicIds: ["arrays", "array-mutability", "objects", "object-methods", "loops"]
}, {
  id: "advanced",
  label: "Продвинутое",
  emoji: "🔺",
  color: "#FF6B6B",
  topicIds: ["async", "classes", "dom"]
}, {
  id: "typescript",
  label: "TypeScript",
  emoji: "🔷",
  color: "#3178C6",
  topicIds: [],
  comingSoon: true
}, {
  id: "angular",
  label: "Angular",
  emoji: "🅰️",
  color: "#DD0031",
  topicIds: [],
  comingSoon: true
}];
const TREE_LEAF_LABEL = {
  vars: "let / const",
  naming: "Именование",
  strings: "Строки",
  destructuring: "Деструктуризация",
  arrays: "Массивы",
  "array-mutability": "Мутабельность",
  objects: "Объекты",
  "object-methods": "Методы объектов",
  loops: "Циклы",
  async: "Async / await",
  classes: "Классы",
  dom: "DOM"
};
function weightedPct(topicProgress, topicIds) {
  let correct = 0,
    total = 0;
  topicIds.forEach(id => {
    const p = topicProgress[id];
    if (!p) return;
    correct += p.correct;
    total += p.total;
  });
  return total > 0 ? Math.round(correct / total * 100) : 0;
}
function TreeNode({
  cx,
  cy,
  r,
  pct,
  color,
  label,
  emoji,
  locked,
  clickable,
  onClick,
  labelWidth = 110,
  fontSize = 11
}) {
  const circumference = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, pct)) / 100 * circumference;
  const isDone = pct >= 100;
  return /*#__PURE__*/React.createElement("g", {
    style: {
      cursor: clickable ? "pointer" : "default"
    },
    onClick: clickable ? onClick : undefined
  }, /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: cy,
    r: r,
    fill: locked ? "transparent" : `${color}1A`,
    stroke: "var(--border)",
    strokeWidth: 1.5,
    strokeDasharray: locked ? "4 3" : "none"
  }), !locked && /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: cy,
    r: r,
    fill: "none",
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: "round",
    strokeDasharray: `${dash} ${circumference}`,
    transform: `rotate(-90 ${cx} ${cy})`,
    style: {
      transition: "stroke-dasharray 0.4s ease"
    }
  }), locked ? /*#__PURE__*/React.createElement("svg", {
    x: cx - r * 0.45,
    y: cy - r * 0.45,
    width: r * 0.9,
    height: r * 0.9,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--text-dim)",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "11",
    x: "3",
    y: "11",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  })) : /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy + (emoji ? 6 : 5),
    textAnchor: "middle",
    fontSize: r,
    style: {
      userSelect: "none"
    }
  }, emoji), isDone && !locked && /*#__PURE__*/React.createElement("circle", {
    cx: cx + r * 0.72,
    cy: cy - r * 0.72,
    r: r * 0.32,
    fill: "var(--success)"
  }), isDone && !locked && /*#__PURE__*/React.createElement("svg", {
    x: cx + r * 0.72 - r * 0.2,
    y: cy - r * 0.72 - r * 0.2,
    width: r * 0.4,
    height: r * 0.4,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: 3.5,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })), /*#__PURE__*/React.createElement("foreignObject", {
    x: cx - labelWidth / 2,
    y: cy + r + 4,
    width: labelWidth,
    height: 34
  }, /*#__PURE__*/React.createElement("div", {
    xmlns: "http://www.w3.org/1999/xhtml",
    style: {
      fontSize,
      textAlign: "center",
      lineHeight: 1.2,
      color: locked ? "var(--text-dim)" : "var(--text)",
      fontWeight: 600,
      fontStyle: locked ? "italic" : "normal"
    }
  }, label, !locked && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: Math.max(9, fontSize - 1),
      color: "var(--text-dim)",
      fontWeight: 400
    }
  }, pct, "%"), locked && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: Math.max(9, fontSize - 1),
      color: "var(--text-dim)",
      fontWeight: 400
    }
  }, "\u0441\u043A\u043E\u0440\u043E"))));
}
function KnowledgeTreeContent({
  topicProgress,
  levelProgress
}) {
  const W = 900;
  const rootY = 46;
  const branchY = 190;
  const leafY = 340;
  const LEAF_LABEL_WIDTH = 50;
  const branchXs = KNOWLEDGE_TREE.map((_, i) => (i + 0.5) / KNOWLEDGE_TREE.length * W);
  const slotWidth = W / KNOWLEDGE_TREE.length;
  const rootX = W / 2;
  const overallPct = weightedPct(topicProgress, KNOWLEDGE_TREE.filter(b => !b.comingSoon).flatMap(b => b.topicIds));
  function leafGap(leafCount) {
    if (leafCount <= 1) return 0;
    const fitSlot = (slotWidth - LEAF_LABEL_WIDTH - 20) / (leafCount - 1);
    return Math.max(LEAF_LABEL_WIDTH, fitSlot);
  }
  function leafX(branchIdx, leafIdx, leafCount) {
    if (leafCount <= 1) return branchXs[branchIdx];
    return branchXs[branchIdx] + (leafIdx - (leafCount - 1) / 2) * leafGap(leafCount);
  }
  function elbowPath(x1, y1, x2, y2) {
    const midY = y1 + (y2 - y1) * 0.55;
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter tree-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tree-page__title"
  }, "\uD83C\uDF33 \u041A\u0430\u0440\u0442\u0430 \u0437\u043D\u0430\u043D\u0438\u0439"), /*#__PURE__*/React.createElement("div", {
    className: "tree-page__subtitle"
  }, "\u0422\u043E \u0436\u0435 \u0441\u0430\u043C\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E \u0442\u0435\u043C, \u0447\u0442\u043E \u0438 \u0432 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435 \u043A\u0443\u0440\u0441\u0430, \u0442\u043E\u043B\u044C\u043A\u043E \u0446\u0435\u043B\u0438\u043A\u043E\u043C. \u041A\u0430\u0436\u0434\u0430\u044F \u0432\u0435\u0440\u0448\u0438\u043D\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u043E \u043C\u0435\u0440\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0442\u0435\u043C\u044B \u2014 \u043D\u0430\u0436\u043C\u0438 \u043D\u0430 \u043B\u0438\u0441\u0442, \u0447\u0442\u043E\u0431\u044B \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0442\u0435\u043C\u0435."), /*#__PURE__*/React.createElement("div", {
    className: "tree-page__svg-wrap"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} 400`,
    width: "100%",
    style: {
      minWidth: 640,
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "var(--border)",
    strokeWidth: 1.5
  }, branchXs.map((bx, i) => /*#__PURE__*/React.createElement("path", {
    key: `root-${KNOWLEDGE_TREE[i].id}`,
    d: elbowPath(rootX, rootY + 32, bx, branchY - 26)
  })), KNOWLEDGE_TREE.map((branch, bi) => branch.topicIds.map((topicId, li) => {
    const leafCount = branch.topicIds.length;
    const lx = leafX(bi, li, leafCount);
    return /*#__PURE__*/React.createElement("path", {
      key: `${branch.id}-${topicId}`,
      d: elbowPath(branchXs[bi], branchY + 26, lx, leafY - 20)
    });
  }))), /*#__PURE__*/React.createElement(TreeNode, {
    cx: rootX,
    cy: rootY,
    r: 32,
    pct: overallPct,
    color: "var(--accent)",
    emoji: "\uD83D\uDFE3",
    label: "JavaScript"
  }), KNOWLEDGE_TREE.map((branch, bi) => {
    const pct = branch.comingSoon ? 0 : weightedPct(topicProgress, branch.topicIds);
    return /*#__PURE__*/React.createElement(TreeNode, {
      key: branch.id,
      cx: branchXs[bi],
      cy: branchY,
      r: 26,
      pct: pct,
      color: branch.color,
      emoji: branch.emoji,
      label: branch.label,
      locked: branch.comingSoon
    });
  }), KNOWLEDGE_TREE.map((branch, bi) => branch.topicIds.map((topicId, li) => {
    const leafCount = branch.topicIds.length;
    const lx = leafX(bi, li, leafCount);
    const p = topicProgress[topicId] || {
      correct: 0,
      total: 0
    };
    const pct = p.total > 0 ? Math.round(p.correct / p.total * 100) : 0;
    const locked = isTopicLockedFor(levelProgress, topicId);
    return /*#__PURE__*/React.createElement(TreeNode, {
      key: topicId,
      cx: lx,
      cy: leafY,
      r: 20,
      pct: pct,
      color: branch.color,
      emoji: "\uD83D\uDCC4",
      label: TREE_LEAF_LABEL[topicId] || topicId,
      locked: locked,
      labelWidth: LEAF_LABEL_WIDTH,
      fontSize: 9.5,
      clickable: !locked,
      onClick: () => {
        window.location.href = `questions.html?topic=${topicId}`;
      }
    });
  })))), /*#__PURE__*/React.createElement("div", {
    className: "tree-page__legend"
  }, /*#__PURE__*/React.createElement("span", null, "\u2713 \u0442\u0435\u043C\u0430 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u0430 \u043D\u0430 100%"), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD12 \u0437\u0430\u043A\u0440\u044B\u0442\u043E (\u043D\u0443\u0436\u043D\u043E \u043F\u043E\u0434\u043D\u044F\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C) \u0438\u043B\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0432 \u043A\u0443\u0440\u0441\u0435")));
}
function PageRoot() {
  const [themeMode, setThemeMode] = React.useState("dark");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [state, setState] = React.useState(null);
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
  if (!state) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
      currentPage: "tree",
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
      onResetProgress: handleResetProgress
    }), /*#__PURE__*/React.createElement("main", {
      id: "main-content",
      tabIndex: -1,
      className: "page-loading"
    }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026"));
  }
  const levelProgress = computeLevelProgress(state.answers);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
    currentPage: "tree",
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
    onResetProgress: handleResetProgress
  }), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    tabIndex: -1,
    className: "page-content page-content--wide"
  }, /*#__PURE__*/React.createElement(KnowledgeTreeContent, {
    topicProgress: state.topicProgress,
    levelProgress: levelProgress
  })));
}
const mainRoot = ReactDOM.createRoot(document.getElementById("app-mount"));
mainRoot.render(/*#__PURE__*/React.createElement(PageRoot, null));