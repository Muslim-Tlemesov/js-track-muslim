/* ==========================================================================
   pages/shared/pwa-install.js — предложение установить PWA — своя кнопка вместо системного баннера.

   Файл 11 из 18, на которые разбит движок (реорганизовано из 6
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
 * @param {{count: number}|null} streak
 * @returns {Promise<boolean>}
 */
async function shouldOfferPwaInstall(streak) {
  if (typeof window === "undefined") return false;
  const isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (isStandalone) return false;
  if (!streak || streak.count < 2) return false;
  try {
    const res = await safeStorage.get(PWA_INSTALL_DISMISSED_KEY);
    if (res && res.value === "1") return false;
  } catch {
    // нет данных — считаем, что ещё не отказывались
  }
  return true;
}


async function dismissPwaInstallOffer() {
  await safeStorage.set(PWA_INSTALL_DISMISSED_KEY, "1");
}

