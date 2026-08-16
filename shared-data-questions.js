/* ==========================================================================
   pages/shared/data-questions.js — ALL_QUESTIONS/QUESTION_BY_ID — производные от TOPICS (плоский список всех вопросов + быстрый поиск по id).

   Файл 2 из 18, на которые разбит движок (реорганизовано из 6
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

const ALL_QUESTIONS = TOPICS.flatMap((t) =>
  t.questions.map((q) => ({ ...q, topicId: t.id, topicTitle: t.title }))
);

// Быстрый поиск вопроса по id — нужен HistoryScreen для старого прогресса,
// отвеченного ещё до появления лога истории (там есть только id в answers).
const QUESTION_BY_ID = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));
