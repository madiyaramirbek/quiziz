// Экран результата теста.

import { saveResult } from "./storage.js";
import { escapeHtml, launchConfetti, scoreColor } from "./utils.js";

const RING_LENGTH = 2 * Math.PI * 80; // длина окружности кольца (r = 80)

/**
 * test    — данные теста с сервера
 * answers — [{ number, question, chosen, correct, isCorrect }]
 * onRetry — функция, которая начинает тест заново
 */
export function renderResult(app, { test, answers, onRetry }) {
  const total = answers.length;
  const right = answers.filter((a) => a.isCorrect).length;
  const wrong = total - right;
  const percent = Math.round((right / total) * 100);
  const mistakes = answers.filter((a) => !a.isCorrect);

  saveResult(test.source, test.id, percent);

  app.innerHTML = `
    <section class="result screen">
      <div class="result-card">
        <h1>Результат теста</h1>
        <div class="result-test">${escapeHtml(test.title)}</div>
        <div class="result-file">📄 ${escapeHtml(test.fileTitle)}</div>

        <div class="score-ring" style="--ring-color:${scoreColor(percent)}">
          <svg viewBox="0 0 180 180">
            <circle class="track" cx="90" cy="90" r="80"/>
            <circle class="ring" cx="90" cy="90" r="80"
              stroke-dasharray="${RING_LENGTH}" stroke-dashoffset="${RING_LENGTH}"/>
          </svg>
          <div class="inside">
            <div class="score-percent" id="percent">0%</div>
            <div class="score-fraction">${right} / ${total}</div>
          </div>
        </div>

        <div class="result-message">${message(percent)}</div>

        <div class="stats">
          <div class="stat good"><div class="stat-value">${right}</div><div class="stat-label">Правильных</div></div>
          <div class="stat bad"><div class="stat-value">${wrong}</div><div class="stat-label">Ошибок</div></div>
          <div class="stat"><div class="stat-value">${percent}%</div><div class="stat-label">Процент</div></div>
          <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Всего</div></div>
        </div>

        <div class="result-actions">
          <button class="btn" id="retry">↻ Пройти ещё раз</button>
          <a class="btn btn-secondary" href="#/">← Вернуться к тестам</a>
        </div>
      </div>

      ${mistakes.length ? `
        <div class="mistakes">
          <h2>Разбор ошибок (${mistakes.length})</h2>
          ${mistakes.map((m, i) => `
            <div class="mistake" style="animation-delay:${i * 50}ms">
              <div class="mistake-num">Вопрос ${m.number} · №${m.fileNumber} в файле</div>
              <div class="mistake-q">${escapeHtml(m.question)}</div>
              <div class="answer-row yours">
                <span class="label">Ваш ответ</span>
                <span>${m.chosen === null ? "— время вышло" : m.chosen.map(escapeHtml).join("<br>")}</span>
              </div>
              <div class="answer-row right">
                <span class="label">${m.correct.length > 1 ? "Правильные ответы" : "Правильный ответ"}</span>
                <span>${m.correct.map(escapeHtml).join("<br>")}</span>
              </div>
              ${m.note ? `<div class="note">💡 ${escapeHtml(m.note)}</div>` : ""}
            </div>`).join("")}
        </div>`
      : `<p class="perfect">Ни одной ошибки — идеально! 🏆</p>`}
    </section>
  `;

  app.querySelector("#retry").addEventListener("click", () => {
    window.scrollTo({ top: 0 });
    onRetry();
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

  animateScore(app, percent);
  if (percent >= 80) launchConfetti();
}

/** Анимация кольца и счётчика процентов */
function animateScore(app, percent) {
  const ring = app.querySelector(".score-ring .ring");
  const label = app.querySelector("#percent");
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = RING_LENGTH * (1 - percent / 100);
  });

  const duration = 1100;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    label.textContent = `${Math.round(percent * eased)}%`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function message(percent) {
  if (percent === 100) return "Блестяще! Все ответы верны 🏆";
  if (percent >= 85) return "Отличный результат! 🔥";
  if (percent >= 70) return "Хорошо! Ещё немного практики 💪";
  if (percent >= 50) return "Неплохо, но стоит повторить 📖";
  return "Нужно подучить — попробуйте ещё раз 🙂";
}
