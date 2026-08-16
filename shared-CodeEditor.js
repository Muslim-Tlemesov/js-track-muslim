/* ==========================================================================
   pages/shared/CodeEditor.jsx — редактор кода с подсветкой синтаксиса,
   автодополнением, нумерацией строк и живой проверкой синтаксиса.
   Логика 1:1 перенесена из старой SPA-версии, стили переведены на
   БЭМ-классы (code-editor__...) вместо инлайн.
   ========================================================================== */

function CodeEditor({
  value,
  onChange,
  onKeyDown,
  minHeight = 160,
  placeholder,
  fontSize = 14.5,
  disabled = false,
  ariaLabel = "Редактор кода"
}) {
  const taRef = React.useRef(null);
  const preRef = React.useRef(null);
  const gutterRef = React.useRef(null);
  const [ac, setAc] = React.useState(null);
  const [syntaxError, setSyntaxError] = React.useState(null);
  React.useEffect(() => {
    const timer = setTimeout(() => setSyntaxError(checkSyntaxError(value)), 500);
    return () => clearTimeout(timer);
  }, [value]);
  const lineHeightPx = fontSize * 1.6;
  const lines = value.split("\n");
  const gutterWidth = Math.max(24, String(lines.length).length * 9 + 14);
  function syncScroll() {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  }
  function recomputeAutocomplete() {
    const ta = taRef.current;
    if (!ta || document.activeElement !== ta) {
      setAc(null);
      return;
    }
    const cursorPos = ta.selectionStart;
    if (cursorPos !== ta.selectionEnd) {
      setAc(null);
      return;
    }
    const ctx = getAutocompleteWord(ta.value, cursorPos);
    if (!ctx || ctx.word.length < 1) {
      setAc(null);
      return;
    }
    const options = getAutocompleteSuggestions(ctx.word, ctx.afterDot);
    if (options.length === 0 || options.length === 1 && options[0] === ctx.word) {
      setAc(null);
      return;
    }
    const before = ta.value.slice(0, cursorPos);
    const row = (before.match(/\n/g) || []).length;
    const col = before.length - (before.lastIndexOf("\n") + 1);
    const charW = getMonoCharWidth(fontSize);
    const top = 8 + row * lineHeightPx + lineHeightPx - ta.scrollTop;
    const left = 12 + col * charW - ta.scrollLeft;
    setAc({
      options,
      active: 0,
      start: ctx.start,
      end: ctx.end,
      top,
      left
    });
  }
  function acceptSuggestion(idx) {
    if (!ac) return;
    const picked = ac.options[idx];
    const next = value.slice(0, ac.start) + picked + value.slice(ac.end);
    onChange(next);
    setAc(null);
    requestAnimationFrame(() => {
      if (taRef.current) {
        const pos = ac.start + picked.length;
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, pos);
      }
    });
  }
  function setCursor(pos, endPos) {
    requestAnimationFrame(() => {
      if (taRef.current) {
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, endPos == null ? pos : endPos);
      }
    });
  }
  function handleEnter(e) {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = value.slice(0, pos) + value.slice(end);
    const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    const currentIndent = /^[ \t]*/.exec(val.slice(lineStart, pos))[0];
    const charBefore = val[pos - 1];
    const charAfter = val[pos];
    const opensBlock = charBefore === "{" || charBefore === "[" || charBefore === "(";
    const closesMatch = opensBlock && (charBefore === "{" && charAfter === "}" || charBefore === "[" && charAfter === "]" || charBefore === "(" && charAfter === ")");
    e.preventDefault();
    const innerIndent = opensBlock ? currentIndent + "  " : currentIndent;
    let insertion, cursorPos;
    if (closesMatch) {
      insertion = `\n${innerIndent}\n${currentIndent}`;
      cursorPos = pos + 1 + innerIndent.length;
    } else {
      insertion = `\n${innerIndent}`;
      cursorPos = pos + insertion.length;
    }
    onChange(val.slice(0, pos) + insertion + val.slice(pos));
    setCursor(cursorPos);
  }
  function handleTab(e) {
    const ta = taRef.current;
    if (!ta) return;
    e.preventDefault();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const isShift = e.shiftKey;
    const isMultiline = value.slice(start, end).includes("\n");
    if (!isMultiline) {
      if (isShift) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const before = value.slice(lineStart, start);
        const m = /( {1,2})$/.exec(before);
        if (!m) return;
        onChange(value.slice(0, start - m[0].length) + value.slice(start));
        setCursor(start - m[0].length);
      } else {
        onChange(value.slice(0, start) + "  " + value.slice(end));
        setCursor(start + 2);
      }
      return;
    }
    const blockStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextNl = value.indexOf("\n", end);
    const blockEnd = nextNl === -1 ? value.length : nextNl;
    const linesInBlock = value.slice(blockStart, blockEnd).split("\n");
    let firstLineDelta = 0;
    const newLines = linesInBlock.map((line, i) => {
      if (!isShift) {
        if (i === 0) firstLineDelta = 2;
        return "  " + line;
      }
      const m = /^( {1,2})/.exec(line);
      if (!m) return line;
      if (i === 0) firstLineDelta = -m[0].length;
      return line.slice(m[0].length);
    });
    const newBlock = newLines.join("\n");
    onChange(value.slice(0, blockStart) + newBlock + value.slice(blockEnd));
    setCursor(Math.max(blockStart, start + firstLineDelta), end + (newBlock.length - linesInBlock.join("\n").length));
  }
  function handleKeyDown(e) {
    if (ac) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAc(prev => prev && {
          ...prev,
          active: (prev.active + 1) % prev.options.length
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAc(prev => prev && {
          ...prev,
          active: (prev.active - 1 + prev.options.length) % prev.options.length
        });
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        acceptSuggestion(ac.active);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAc(null);
        return;
      }
    }
    if (e.key === "Tab") {
      handleTab(e);
      return;
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      handleEnter(e);
      return;
    }
    if (onKeyDown) onKeyDown(e);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "code-editor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "code-editor__frame",
    style: {
      minHeight
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: gutterRef,
    "aria-hidden": "true",
    className: "mono code-editor__gutter",
    style: {
      width: gutterWidth,
      fontSize,
      lineHeight: `${lineHeightPx}px`
    }
  }, lines.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "code-editor__gutter-line"
  }, syntaxError?.line === i + 1 && /*#__PURE__*/React.createElement("span", {
    className: "code-editor__gutter-dot",
    title: syntaxError.message
  }), i + 1))), /*#__PURE__*/React.createElement("div", {
    className: "code-editor__body"
  }, /*#__PURE__*/React.createElement("pre", {
    ref: preRef,
    "aria-hidden": "true",
    className: "code-editor__highlight",
    style: {
      fontSize,
      lineHeight: `${lineHeightPx}px`
    },
    dangerouslySetInnerHTML: {
      __html: highlightJs(value) + "\n"
    }
  }), /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    value: value,
    placeholder: placeholder,
    disabled: disabled,
    "aria-label": ariaLabel,
    onChange: e => {
      onChange(e.target.value);
      requestAnimationFrame(recomputeAutocomplete);
    },
    onScroll: syncScroll,
    onSelect: recomputeAutocomplete,
    onBlur: () => setTimeout(() => setAc(null), 120),
    onKeyDown: handleKeyDown,
    spellCheck: false,
    autoCorrect: "off",
    autoCapitalize: "off",
    autoComplete: "off",
    className: "code-editor__textarea",
    style: {
      minHeight,
      fontSize,
      lineHeight: `${lineHeightPx}px`
    }
  }))), syntaxError && /*#__PURE__*/React.createElement("div", {
    className: "mono code-editor__error"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26A0"), " \u0421\u0442\u0440\u043E\u043A\u0430 ", syntaxError.line, ": ", syntaxError.message), ac && /*#__PURE__*/React.createElement("div", {
    className: "code-editor__autocomplete",
    style: {
      top: ac.top,
      left: ac.left + gutterWidth
    }
  }, ac.options.map((opt, i) => /*#__PURE__*/React.createElement("div", {
    key: opt,
    className: `mono code-editor__autocomplete-item${i === ac.active ? " code-editor__autocomplete-item--active" : ""}`,
    onMouseDown: e => {
      e.preventDefault();
      acceptSuggestion(i);
    }
  }, opt))));
}