// Экран прохождения теста: один вопрос за раз.
// Два вида вопросов:
//   - обычный (один правильный ответ) — ответ засчитывается сразу по клику;
//   - с несколькими правильными (q.multi) — отмечаем варианты и жмём «Проверить».
//     Засчитывается, только если отмечены ровно все правильные.

import { findTest } from "./api.js";
import { getLastLayout, getSettings, saveLastLayout } from "./storage.js";
import { escapeHtml, pick, shuffleAvoiding, shuffleOptions } from "./utils.js";
import { renderResult } from "./result.js";

const PRAISE = ["Верно! 🎉", "Отлично! 🔥", "Так держать! 💪", "Супер! ⭐", "В точку! 🎯"];
const OOPS = ["Неверно 😕", "Мимо 🙈", "Почти… 😬"];
const RING_LENGTH = 2 * Math.PI * 20; // длина окружности таймера (r = 20)

/**
 * Рисует тест в контейнере app.
 * Возвращает функцию очистки (останавливает таймер и снимает обработчики).
 */
export async function renderQuiz(app, fileId, testId) {
  app.innerHTML = `<div class="loader"></div>`;
  const test = await findTest(fileId, testId);

  if (!test) {
    app.innerHTML = `
      <section class="screen panel">
        <h2>Тест не найден</h2>
        <p>Возможно, файл с вопросами изменился.</p>
        <br><a class="btn" href="#/">← К тестам</a>
      </section>`;
    return () => {};
  }

  const settings = getSettings();
  let state;          // состояние текущей попытки
  let timerId = null; // интервал таймера

  // ---------- начало (или повтор) попытки ----------

  function start() {
    state = {
      index: 0,
      streak: 0,
      answered: false,
      selected: new Set(), // отмеченные варианты (для вопросов с несколькими ответами)
      answers: [],
      questions: buildAttempt(),
    };
    showQuestion();
  }

  /**
   * Готовит новую попытку: перемешивает вопросы теста и варианты ответов так,
   * чтобы по сравнению с прошлым прохождением
   *   - каждый вопрос стоял на другом месте;
   *   - правильный ответ был под другой буквой.
   * Флаг correct «едет» вместе с текстом варианта, поэтому проверка не ломается.
   */
  function buildAttempt() {
    const last = getLastLayout(test.source, test.id);

    const order = shuffleAvoiding(test.questions, (q, i) => last?.order?.[q.number] === i);
    const questions = order.map((q) => ({
      ...q,
      options: shuffleOptions(q.options, last?.correct?.[q.number]),
    }));

    saveLastLayout(test.source, test.id, {
      order: Object.fromEntries(questions.map((q, i) => [q.number, i])),
      correct: Object.fromEntries(questions.map((q) => [q.number, correctIndexes(q)])),
    });
    return questions;
  }

  // ---------- показ вопроса ----------

  function showQuestion() {
    const total = state.questions.length;
    const q = state.questions[state.index];
    state.answered = false;
    state.selected = new Set();

    app.innerHTML = `
      <section class="quiz screen">
        <div class="quiz-top">
          <button class="icon-btn" id="exit" title="Выйти к тестам">✕</button>
          <span class="counter"><b>${state.index + 1}</b> / ${total}</span>
          <span class="spacer"></span>
          <span class="pill streak ${state.streak >= 3 ? "hot" : ""}" id="streak" title="Правильно подряд">🔥 ${state.streak}</span>
          ${settings.timer ? `
            <div class="timer" id="timer">
              <svg viewBox="0 0 50 50"><circle class="track" cx="25" cy="25" r="20"/>
                <circle class="ring" cx="25" cy="25" r="20"
                  stroke-dasharray="${RING_LENGTH}" stroke-dashoffset="0"/></svg>
              <span>${settings.seconds}</span>
            </div>` : ""}
        </div>

        <div class="progress"><div class="progress-fill" style="width:${(state.index / total) * 100}%"></div></div>

        <div class="question">
          <span class="question-label">${escapeHtml(test.fileTitle)} · ${escapeHtml(test.title)} · №${q.number} в файле</span>
          <h2 class="question-text">${escapeHtml(q.text)}</h2>
          ${q.multi ? `<span class="multi-badge">Несколько правильных ответов — отметьте все</span>` : ""}
        </div>

        <div class="options ${q.multi ? "multi" : ""}">
          ${q.options.map((o, i) => `
            <button class="option" data-index="${i}">
              <span class="key">${i + 1}</span>
              <span class="text">${escapeHtml(o.text)}</span>
              <span class="mark"></span>
            </button>`).join("")}
        </div>

        ${q.multi ? `<div class="check-row"><button class="btn" id="check" disabled>Проверить</button></div>` : ""}
        <div id="feedback-slot"></div>
        <p class="hint">Клавиши <kbd>1</kbd>–<kbd>${q.options.length}</kbd> — ${q.multi ? "отметить" : "ответ"},
          <kbd>Enter</kbd> — ${q.multi ? "проверить / дальше" : "дальше"}</p>
      </section>
    `;

    // плавно дотягиваем прогресс до текущего вопроса
    requestAnimationFrame(() => {
      app.querySelector(".progress-fill").style.width = `${((state.index + 0.5) / total) * 100}%`;
    });

    app.querySelector("#exit").addEventListener("click", exit);
    app.querySelectorAll(".option").forEach((button) => {
      button.addEventListener("click", () => pickOption(Number(button.dataset.index)));
    });
    app.querySelector("#check")?.addEventListener("click", () => submit([...state.selected]));

    if (settings.timer) startTimer();
  }

  /** Клик по варианту: обычный вопрос — сразу ответ, «множественный» — отметить/снять */
  function pickOption(index) {
    if (state.answered) return;
    const q = state.questions[state.index];
    if (!q.multi) {
      submit([index]);
      return;
    }
    if (state.selected.has(index)) state.selected.delete(index);
    else state.selected.add(index);
    app.querySelectorAll(".option").forEach((button, i) => {
      button.classList.toggle("is-selected", state.selected.has(i));
    });
    app.querySelector("#check").disabled = state.selected.size === 0;
  }

  // ---------- таймер ----------

  function startTimer() {
    let left = settings.seconds;
    const box = app.querySelector("#timer");
    const ring = box.querySelector(".ring");
    const label = box.querySelector("span");

    stopTimer();
    timerId = setInterval(() => {
      left -= 1;
      label.textContent = left;
      ring.style.strokeDashoffset = RING_LENGTH * (1 - left / settings.seconds);
      box.classList.toggle("warn", left <= 10 && left > 5);
      box.classList.toggle("danger", left <= 5);
      if (left <= 0) {
        // время вышло: что успели отметить — то и проверяем, иначе ошибка
        submit(state.selected.size ? [...state.selected] : null);
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  // ---------- проверка ответа ----------

  /** chosen — массив номеров выбранных вариантов, null — время вышло */
  function submit(chosen) {
    if (state.answered) return;
    state.answered = true;
    stopTimer();

    const q = state.questions[state.index];
    const correct = correctIndexes(q);
    const picked = new Set(chosen ?? []);
    const isCorrect = chosen !== null && picked.size === correct.length && correct.every((i) => picked.has(i));

    state.streak = isCorrect ? state.streak + 1 : 0;
    state.answers.push({
      number: state.index + 1,
      fileNumber: q.number,
      question: q.text,
      chosen: chosen === null ? null : chosen.map((i) => q.options[i].text),
      correct: correct.map((i) => q.options[i].text),
      note: q.note,
      isCorrect,
    });

    // раскрашиваем варианты
    app.querySelectorAll(".option").forEach((button, i) => {
      button.disabled = true;
      button.classList.remove("is-selected");
      const mark = button.querySelector(".mark");
      if (q.options[i].correct) {
        button.classList.add("is-correct");
        if (!picked.has(i) && q.multi) button.classList.add("is-missed"); // забыли отметить
        mark.textContent = "✓";
      } else if (picked.has(i)) {
        button.classList.add("is-wrong");
        mark.textContent = "✗";
      } else {
        button.classList.add("is-dim");
      }
    });
    app.querySelector(".check-row")?.remove();

    const streak = app.querySelector("#streak");
    streak.textContent = `🔥 ${state.streak}`;
    streak.classList.toggle("hot", state.streak >= 3);
    if (isCorrect) streak.classList.add("bump");

    const isLast = state.index === state.questions.length - 1;
    const title = chosen === null ? "Время вышло ⏰" : isCorrect ? pick(PRAISE) : pick(OOPS);
    const correctText = correct.map((i) => `<b>${escapeHtml(q.options[i].text)}</b>`).join("; ");
    const sub = isCorrect
      ? (state.streak >= 3 ? `${state.streak} подряд!` : "+1 балл")
      : `${correct.length > 1 ? "Правильные ответы" : "Правильный ответ"}: ${correctText}`;

    app.querySelector("#feedback-slot").innerHTML = `
      <div class="feedback ${isCorrect ? "good" : "bad"}">
        <div>
          <div class="feedback-title">${title}</div>
          <div class="feedback-sub">${sub}</div>
          ${q.note ? `<div class="note">💡 ${escapeHtml(q.note)}</div>` : ""}
        </div>
        <button class="btn ${isCorrect ? "" : "btn-dark"}" id="next">
          ${isLast ? "Результат 🏁" : "Следующий →"}
        </button>
      </div>
    `;
    const nextButton = app.querySelector("#next");
    nextButton.addEventListener("click", next);
    nextButton.focus({ preventScroll: true });
    nextButton.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- переход дальше ----------

  function next() {
    if (state.index < state.questions.length - 1) {
      state.index += 1;
      showQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      renderResult(app, { test, answers: state.answers, onRetry: start });
    }
  }

  function exit() {
    const inProgress = state.answers.length > 0 && state.index < state.questions.length;
    if (!inProgress || confirm("Выйти из теста? Прогресс этой попытки не сохранится.")) {
      location.hash = "#/";
    }
  }

  // ---------- клавиатура ----------

  function onKey(event) {
    if (!app.querySelector(".quiz")) return; // мы на экране результата
    const q = state.questions[state.index];
    const number = Number(event.key);
    if (!state.answered && number >= 1 && number <= q.options.length) {
      pickOption(number - 1);
    } else if (event.key === "Enter" && document.activeElement?.id !== "next") {
      event.preventDefault(); // иначе Enter «нажмёт» вариант, на котором стоит фокус
      if (state.answered) next();
      else if (q.multi && state.selected.size) submit([...state.selected]);
    }
  }
  document.addEventListener("keydown", onKey);

  start();

  return () => {
    stopTimer();
    document.removeEventListener("keydown", onKey);
  };
}

/** Номера правильных вариантов в текущем (перемешанном) порядке */
function correctIndexes(q) {
  return q.options.flatMap((o, i) => (o.correct ? [i] : []));
}
