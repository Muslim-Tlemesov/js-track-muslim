/* ==========================================================================
   pages/shared/misc-backup.js — резервное копирование прогресса — экспорт/импорт одним JSON-файлом, со структурной валидацией.

   Файл 16 из 18, на которые разбит движок (реорганизовано из 6
   файлов после соответствующего разбора архитектуры — раньше
   engine-core.js/engine-features.js смешивали storage+XP+streak+review
   и PWA+напоминания+шеринг соответственно в одном файле каждый).
   Порядок подключения в HTML важен — файлы делят одну глобальную
   область видимости:
     1. shared-data-topics.js
     2. shared-data-questions.js
     3. shared-data-achievements.js
     4. shared-core-storage.js
     5. shared-core-history.js
     6. shared-core-streak.js
     7. shared-code-runner.js
     8. shared-code-syntax.js
     9. shared-code-debugger.js
     10. shared-code-worker.js
     11. shared-pwa-install.js
     12. shared-pwa-reminders.js
     13. shared-core-progress.js
     14. shared-core-review.js
     15. shared-core-xp.js
     16. shared-misc-backup.js
     17. shared-misc-quizmodes.js
     18. shared-misc-share.js
   ========================================================================== */

/* ==========================================================================
   Резервное копирование прогресса — экспорт/импорт всего состояния
   одним JSON-файлом.
   ========================================================================== */

const PROGRESS_EXPORT_KEYS = [
  STORAGE_KEY, XP_KEY, ACHIEVEMENTS_KEY, STREAK_KEY,
  CERT_NAME_KEY, THEME_KEY, SOUND_KEY, SANDBOX_KEY, REVIEW_SCHEDULE_KEY,
];


/**
 * История обучения хранится отдельно от остального прогресса — в
 * IndexedDB (см. addHistoryEntry/getHistoryEntries в core-history.js),
 * не в safeStorage — поэтому не проходит через обычный перебор
 * PROGRESS_EXPORT_KEYS и упаковывается отдельным полем payload.history.
 */
async function buildProgressExportPayload() {
  const data = {};
  for (const key of PROGRESS_EXPORT_KEYS) {
    const res = await safeStorage.get(key);
    if (res && res.value !== undefined) data[key] = res.value;
  }
  const history = await getHistoryEntries();
  return { app: "js.track", version: 2, exportedAt: new Date().toISOString(), data, history };
}


async function exportProgressData() {
  const payload = await buildProgressExportPayload();
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.download = `js-track-progress-${getLocalDateKey()}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}


/**
 * Валидаторы формы для каждого поля бэкапа — раньше единственной
 * проверкой было parsed.app === "js.track", а дальше значения писались
 * в хранилище как есть, без проверки структуры. Можно было "успешно"
 * импортировать { "js-track-xp": "hello" } и получить XP=0 без единого
 * предупреждения — файл выглядел бы принятым, а часть данных тихо
 * терялась. Каждый валидатор получает УЖЕ распарсенное значение (сама
 * функция ниже сначала пробует JSON.parse строки) и возвращает true,
 * если форма похожа на настоящую.
 */
const PROGRESS_FIELD_VALIDATORS = {
  [STORAGE_KEY]: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  [XP_KEY]: (v) => v !== null && typeof v === "object" && typeof v.xp === "number",
  [ACHIEVEMENTS_KEY]: (v) => v !== null && typeof v === "object" && Array.isArray(v.unlocked),
  [STREAK_KEY]: (v) => v !== null && typeof v === "object" && typeof v.count === "number",
  [REVIEW_SCHEDULE_KEY]: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
};


/**
 * @param {File} file
 * @throws {Error} с человекочитаемым сообщением, если файл повреждён,
 * не похож на экспорт js.track, или структура какого-то поля не
 * соответствует ожидаемой форме (см. PROGRESS_FIELD_VALIDATORS).
 * Валидирует ВСЁ целиком ДО того, как что-либо записать в хранилище —
 * частично применённый повреждённый импорт был бы хуже, чем полностью
 * отклонённый: пользователь либо получает рабочий результат, либо
 * ничего не меняется вообще, без промежуточного "наполовину".
 */
async function importProgressData(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл повреждён или это не JSON.");
  }
  if (!parsed || parsed.app !== "js.track" || typeof parsed.data !== "object" || parsed.data === null) {
    throw new Error("Это не похоже на файл прогресса js.track.");
  }
  if (typeof parsed.version !== "number") {
    throw new Error("В файле нет номера версии — это не похоже на настоящий экспорт js.track.");
  }

  // Фаза 1: валидация — парсим и проверяем форму КАЖДОГО поля, ничего
  // ещё не записывая. При первом же несоответствии — отказ целиком.
  const toWrite = {};
  for (const [key, rawValue] of Object.entries(parsed.data)) {
    if (!PROGRESS_EXPORT_KEYS.includes(key)) continue; // неизвестный ключ — игнорируем, не ошибка
    const validator = PROGRESS_FIELD_VALIDATORS[key];
    if (!validator) {
      // CERT_NAME_KEY/THEME_KEY/SOUND_KEY/SANDBOX_KEY/ONBOARDING_SEEN_KEY —
      // простые строки, не JSON-объекты, достаточно проверить сам тип.
      if (typeof rawValue !== "string") {
        throw new Error(`Повреждённое значение "${key}" — ожидали текст.`);
      }
      toWrite[key] = rawValue;
      continue;
    }
    let value;
    try {
      value = JSON.parse(rawValue);
    } catch {
      throw new Error(`Повреждённое значение "${key}" — не валидный JSON.`);
    }
    if (!validator(value)) {
      throw new Error(`Файл повреждён: поле "${key}" имеет неожиданную структуру.`);
    }
    toWrite[key] = rawValue;
  }

  let historyToImport = null;
  if (parsed.history !== undefined) {
    if (!Array.isArray(parsed.history)) {
      throw new Error("Файл повреждён: история должна быть списком записей.");
    }
    historyToImport = parsed.history;
  } else if (typeof parsed.data["js-track-history"] === "string") {
    // Файлы версии 1 (до переноса истории на IndexedDB) — история была
    // ещё частью data.HISTORY_KEY как отдельная JSON-строка.
    try {
      const legacyHistory = JSON.parse(parsed.data["js-track-history"]);
      if (Array.isArray(legacyHistory)) historyToImport = legacyHistory;
      else throw new Error("Файл повреждён: история в старом формате имеет неожиданную структуру.");
    } catch (e) {
      if (e.message.startsWith("Файл повреждён")) throw e;
      throw new Error("Файл повреждён: история в старом формате — не валидный JSON.");
    }
  }

  // Фаза 2: запись — только если ВСЁ выше прошло без единой ошибки.
  for (const [key, value] of Object.entries(toWrite)) {
    await safeStorage.set(key, value);
  }
  if (historyToImport) {
    await clearHistory();
    for (const entry of historyToImport) {
      const { id, ...rest } = entry;
      await addHistoryEntry(rest);
    }
  }
}

