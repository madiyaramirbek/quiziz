// Небольшие вспомогательные функции.

/** Защита от HTML-инъекций: текст вопросов вставляем только через эту функцию. */
export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Перемешивание Фишера–Йетса. Возвращает НОВЫЙ массив, исходный не меняется. */
export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Перемешивает так, чтобы ни один элемент не остался на «запрещённой» позиции
 * (isForbidden(item, index) === true). Перебирает случайные варианты —
 * для 25 вопросов подходящий находится за несколько попыток.
 * Если элемент всего один, это невозможно — тогда просто возвращаем как есть.
 */
export function shuffleAvoiding(items, isForbidden, tries = 1000) {
  let result = shuffle(items);
  for (let i = 0; i < tries && result.some(isForbidden); i++) {
    result = shuffle(items);
  }
  return result;
}

/**
 * Перемешивает варианты ответа так, чтобы правильные варианты
 * не оказались на тех же позициях, что в прошлый раз.
 * lastPositions — массив позиций (или одно число в старом формате).
 */
export function shuffleOptions(options, lastPositions) {
  const forbidden = new Set([].concat(lastPositions ?? []));
  return shuffleAvoiding(options, (option, i) => option.correct && forbidden.has(i));
}

export function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/** Цвет по проценту: красный → жёлтый → зелёный. */
export function scoreColor(percent) {
  if (percent >= 80) return "#4f8a5b";
  if (percent >= 50) return "#b9862a";
  return "#c4483a";
}

/** Конфетти поверх страницы. */
export function launchConfetti(count = 140) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#c96442", "#e0a37f", "#4f8a5b", "#b9862a", "#1f1e1b", "#d6d2c4"];
  const layer = document.createElement("div");
  layer.className = "confetti";
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = pick(colors);
    piece.style.animationDuration = `${2.2 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 300}px`);
    piece.style.setProperty("--rot", `${Math.random() * 900}deg`);
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 5000);
}
