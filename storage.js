// Сохранение настроек и лучших результатов в браузере (localStorage).
// Если хранилище недоступно (приватный режим), всё просто работает без него.

const RESULTS_KEY = "quiz-results-v1";
const SETTINGS_KEY = "quiz-settings-v1";
const LAYOUT_KEY = "quiz-layout-v1";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — ничего страшного */
  }
}

// ---------- настройки ----------

export function getSettings() {
  return { timer: true, seconds: 30, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
}

// ---------- результаты ----------
// Ключ включает имя файла, чтобы результаты разных файлов не смешивались.

function resultKey(source, testId) {
  return `${source}#${testId}`;
}

/** { best: 84, attempts: 3, last: 76 } или null */
export function getResult(source, testId) {
  return read(RESULTS_KEY, {})[resultKey(source, testId)] ?? null;
}

// ---------- раскладка прошлого прохождения ----------
// { order: {номерВопроса: позиция}, correct: {номерВопроса: позицияПравильногоОтвета} }
// Нужна, чтобы в следующий раз вопрос и правильный ответ оказались на других местах.

export function getLastLayout(source, testId) {
  return read(LAYOUT_KEY, {})[resultKey(source, testId)] ?? null;
}

export function saveLastLayout(source, testId, layout) {
  const all = read(LAYOUT_KEY, {});
  all[resultKey(source, testId)] = layout;
  write(LAYOUT_KEY, all);
}

export function saveResult(source, testId, percent) {
  const all = read(RESULTS_KEY, {});
  const key = resultKey(source, testId);
  const old = all[key] ?? { best: 0, attempts: 0 };
  all[key] = { best: Math.max(old.best, percent), attempts: old.attempts + 1, last: percent };
  write(RESULTS_KEY, all);
}
