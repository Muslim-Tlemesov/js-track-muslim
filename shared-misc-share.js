/* ==========================================================================
   pages/shared/misc-share.js — публичная ссылка на прогресс — кодирование/декодирование статистики прямо в URL.

   Файл 18 из 18, на которые разбит движок (реорганизовано из 6
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
 * @param {Object} stats - { certName, rank, xp, streakCount, overallPct, achievementsUnlocked, achievementsTotal }
 * @returns {string} относительный URL вида "share.html?d=..."
 */
function buildShareUrl(stats) {
  const compact = {
    n: stats.certName || "",
    r: stats.rank,
    x: stats.xp,
    s: stats.streakCount || 0,
    p: stats.overallPct,
    a: stats.achievementsUnlocked,
    t: stats.achievementsTotal,
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  return `share.html?d=${encoded}`;
}


/**
 * @param {string} encoded - значение параметра ?d= из URL
 * @returns {Object|null} расшифрованные данные, или null если ссылка повреждена
 */
function decodeShareData(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const compact = JSON.parse(json);
    return {
      certName: compact.n || "",
      rank: compact.r,
      xp: compact.x,
      streakCount: compact.s,
      overallPct: compact.p,
      achievementsUnlocked: compact.a,
      achievementsTotal: compact.t,
    };
  } catch {
    return null;
  }
}
