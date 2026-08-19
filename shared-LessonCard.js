/* ==========================================================================
   pages/shared/LessonCard.jsx — экран теории перед вопросами темы.
   ========================================================================== */

function LessonCard({
  lesson,
  topicId,
  topicTitle,
  onStart
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "question-card question-enter lesson-card lesson-card--calm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lesson-card__badge-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono lesson-card__badge"
  }, "// \u0442\u0435\u043E\u0440\u0438\u044F")), /*#__PURE__*/React.createElement("div", {
    className: "lesson-card__title"
  }, topicTitle), /*#__PURE__*/React.createElement("p", {
    className: "lesson-card__intro"
  }, lesson.intro), /*#__PURE__*/React.createElement("div", {
    className: "lesson-card__section-label"
  }, "\u0421\u043B\u043E\u0432\u0430\u0440\u044C \u0442\u0435\u0440\u043C\u0438\u043D\u043E\u0432"), /*#__PURE__*/React.createElement("div", {
    className: "lesson-card__terms"
  }, lesson.terms.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "lesson-card__term"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono lesson-card__term-name"
  }, t.term), TERM_PRONUNCIATIONS[t.term] && /*#__PURE__*/React.createElement("button", {
    onClick: () => speakTerm(TERM_PRONUNCIATIONS[t.term]),
    "aria-label": `Прослушать произношение: ${TERM_PRONUNCIATIONS[t.term]}`,
    title: "\u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C \u043F\u0440\u043E\u0438\u0437\u043D\u043E\u0448\u0435\u043D\u0438\u0435",
    className: "lesson-card__speak-btn"
  }, "\u25B6"), /*#__PURE__*/React.createElement("span", {
    className: "lesson-card__term-def"
  }, t.def)))), lesson.example && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "lesson-card__section-label lesson-card__section-label--example"
  }, "\u041F\u0440\u0438\u043C\u0435\u0440"), /*#__PURE__*/React.createElement("pre", {
    className: "mono lesson-card__example-code",
    dangerouslySetInnerHTML: {
      __html: highlightJs(lesson.example.code)
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lesson-card__example-output"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lesson-card__example-output-label"
  }, "\u0412\u044B\u0432\u0435\u0434\u0435\u0442:"), lesson.example.output.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "mono lesson-card__example-output-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lesson-card__example-output-arrow"
  }, "\u276F "), line)))), /*#__PURE__*/React.createElement("button", {
    className: "lesson-card__start-btn",
    onClick: onStart
  }, "\u041D\u0430\u0447\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u2192"));
}