/* ==========================================================================
   pages/shared/core-storage.js — слой хранения (safeStorage — localStorage с опциональным fallback на window.storage), все ключи хранилища, тема оформления.

   Файл 4 из 18, на которые разбит движок (реорганизовано из 6
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

/**
 * Слой хранения прогресса. window.storage — API, специфичный для
 * среды разработки (Claude.ai) — на обычном сайте (GitHub Pages и
 * везде ещё) его не существует. Реальный, всегда доступный механизм —
 * localStorage: он есть в любом браузере без исключений, синхронный
 * по природе, но обёрнут в те же async-методы для единообразия
 * остального кода. window.storage используется ДОПОЛНИТЕЛЬНО, если
 * доступен (например, при разработке внутри Claude.ai), но никогда
 * не единственный источник — иначе прогресс не сохранялся бы вовсе.
 */
const safeStorage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return { key, value: raw };
    } catch {
      // localStorage недоступен (приватный режим Safari и т.п.) —
      // пробуем дальше через window.storage, если он есть.
    }
    try {
      if (typeof window !== "undefined" && window.storage) {
        return await window.storage.get(key);
      }
    } catch {
      // нет данных ни там, ни там
    }
    return null;
  },
  async set(key, value) {
    let localOk = false;
    try {
      localStorage.setItem(key, value);
      localOk = true;
    } catch {
      // localStorage недоступен — не страшно, если сработает window.storage ниже
    }
    try {
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.set(key, value);
      }
    } catch {
      // window.storage недоступен — не страшно, если localStorage сработал выше
    }
    return localOk ? { key, value } : null;
  },
  /**
   * Полностью удаляет ключ — НЕ то же самое, что set(key, null):
   * localStorage.setItem(key, null) записал бы строку "null" (а не
   * удалил бы ключ), что ломало бы всё, что дальше делает
   * `JSON.parse(value)` и ожидает объект, а не JS-null.
   */
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage недоступен — не страшно, если сработает window.storage ниже
    }
    try {
      if (typeof window !== "undefined" && window.storage && window.storage.delete) {
        await window.storage.delete(key);
      }
    } catch {
      // window.storage недоступен или без delete — не критично
    }
  },
};


const STORAGE_KEY = "js-track-answers";

const THEME_KEY = "js-track-theme";

const SOUND_KEY = "js-track-sound";

const ACHIEVEMENTS_KEY = "js-track-achievements";

const XP_KEY = "js-track-xp";

const CERT_NAME_KEY = "js-track-cert-name";

const SANDBOX_KEY = "js-track-sandbox";

const STREAK_KEY = "js-track-streak";

const HISTORY_KEY = "js-track-history";

const REVIEW_SCHEDULE_KEY = "js-track-review-schedule";

const ONBOARDING_SEEN_KEY = "js-track-onboarding-seen";

const PWA_INSTALL_DISMISSED_KEY = "js-track-pwa-install-dismissed";

const REMINDER_OFFER_DISMISSED_KEY = "js-track-reminder-offer-dismissed";


const THEMES = {
  light: {
    bg: "#FAF7F2", surface: "#FFFFFF", surfaceAlt: "#F3ECE4", border: "#E4D9CC",
    text: "#2B2118", textDim: "#6E5F50", accent: "#0F6B5C", accent2: "#CC4A24",
    success: "#2D6B38", successBg: "#EEF5EA", error: "#A8371F", errorBg: "#FBEDE8",
    console: "#1B1712", consoleText: "#E8DFD3",
  },
  dark: {
    bg: "#161310", surface: "#211C17", surfaceAlt: "#2C251E", border: "#3D342A",
    text: "#F5EDE1", textDim: "#A89684", accent: "#2BA894", accent2: "#F0794F",
    success: "#5FB86C", successBg: "#1A2E1B", error: "#E85D42", errorBg: "#3A1712",
    console: "#0D0B09", consoleText: "#D9CFC0",
  },
};


/**
 * Читает и применяет сохранённую тему — выставляет data-theme на
 * <html>, чтобы CSS custom properties (var(--accent) и т.д. в
 * shared.css) сразу переключились на нужную палитру. Каждая страница
 * вызывает это ОДИН раз при загрузке.
 * @returns {Promise<"dark"|"light">}
 */
async function loadAndApplyTheme() {
  let mode = "dark";
  try {
    const res = await safeStorage.get(THEME_KEY);
    const saved = res && res.value ? JSON.parse(res.value) : null;
    if (saved === "dark" || saved === "light") mode = saved;
  } catch {
    // ключа ещё нет — остаёмся на теме по умолчанию
  }
  document.documentElement.setAttribute("data-theme", mode);
  return mode;
}


/**
 * Переключает и сохраняет тему — используется кнопкой в шапке на
 * каждой странице.
 * @returns {Promise<"dark"|"light">} новый режим
 */
async function toggleAndSaveTheme(currentMode) {
  const next = currentMode === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  await safeStorage.set(THEME_KEY, JSON.stringify(next));
  return next;
}

