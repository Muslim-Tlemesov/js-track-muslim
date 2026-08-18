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

/**
 * Регистрация Service Worker + обнаружение обновления — раньше этот
 * же код (без обнаружения обновления) был дословно продублирован в
 * 13 HTML-файлах отдельным инлайновым <script>. Реальный найденный
 * пробел (внешний технический разбор): даже с skipWaiting()/
 * clients.claim() в самом sw.js (см. sw.js), новый Service Worker
 * забирает контроль в фоне, но НЕ перезагружает уже открытую
 * страницу — пользователь мог долго работать со старой версией
 * JS/HTML в памяти вкладки, не зная, что вышло обновление. Теперь
 * onUpdateAvailable вызывается именно в тот момент, когда есть ЧТО
 * предложить обновить (не при самой первой установке — тогда
 * navigator.serviceWorker.controller ещё null, устанавливать нечего
 * поверх, показывать баннер не о чем).
 *
 * @param {Function} onUpdateAvailable - вызывается, когда новый SW
 *   установлен И уже есть предыдущий контроллер (то есть это
 *   обновление, а не первая установка).
 */
function registerServiceWorkerWithUpdateCheck(onUpdateAvailable) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const doRegister = () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            onUpdateAvailable();
          }
        });
      });
    }).catch(() => {
      // офлайн-режим просто не заработает — само приложение это не ломает
    });
  };
  // Реальный найденный риск гонки: раньше регистрация всегда ждала
  // window "load" через addEventListener. Но эта функция вызывается
  // из React useEffect — а React-страницы здесь компилируют JSX ПРЯМО
  // В БРАУЗЕРЕ через Babel Standalone (медленнее обычного precompiled
  // JS), так что к моменту, когда React вообще успевает
  // смонтироваться и отработать useEffect, событие "load" на медленном
  // соединении вполне могло УЖЕ произойти. Слушатель, добавленный
  // ПОСЛЕ события, никогда не сработает — события не "воспроизводятся"
  // для опоздавших подписчиков. Проверяем document.readyState:
  // если страница уже загружена — регистрируем сразу, не ждём
  // события, которое, возможно, уже никогда не придёт.
  if (document.readyState === "complete") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister);
  }
}

