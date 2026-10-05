// Главная страница: тесты, сгруппированные по файлам.

import { loadCatalog } from "./api.js";
import { getResult, getSettings, saveSettings } from "./storage.js";
import { escapeHtml, scoreColor } from "./utils.js";

export async function renderHome(app) {
  app.innerHTML = `<div class="loader"></div>`;
  const catalog = await loadCatalog();
  const settings = getSettings();

  const totalQuestions = catalog.files.reduce((sum, f) => sum + f.total, 0);
  const totalTests = catalog.files.reduce((sum, f) => sum + f.tests.length, 0);

  app.innerHTML = `
    <section class="screen">
      <header class="hero">
        <div class="brand"><span class="brand-mark">К</span> Квиз-тренажёр</div>
        <h1>Подготовка <em>к сессии</em></h1>
        <div class="toolbar">
          <span class="chip"><b>${totalQuestions}</b> ${plural(totalQuestions, "вопрос", "вопроса", "вопросов")}</span>
          <span class="chip"><b>${totalTests}</b> ${plural(totalTests, "тест", "теста", "тестов")}</span>
          <label class="chip toggle">
            Таймер ${settings.seconds} с
            <input type="checkbox" id="timer-toggle" ${settings.timer ? "checked" : ""}>
            <span class="switch"></span>
          </label>
        </div>
      </header>

      ${catalog.files.map(renderFile).join("")}
      ${catalog.errors.map(renderFileError).join("")}
      ${catalog.files.length || catalog.errors.length ? "" : `
        <div class="panel"><h2>Нет файлов с вопросами</h2>
          <p>Положите .docx или .txt рядом с app.py и обновите страницу.</p></div>`}
    </section>
  `;

  app.querySelector("#timer-toggle").addEventListener("change", (event) => {
    saveSettings({ ...getSettings(), timer: event.target.checked });
  });
}

/** Раздел одного файла: заголовок с именем файла и сетка тестов */
function renderFile(file) {
  return `
    <section class="file-section">
      <div class="file-head">
        <h2 class="section-title">📄 ${escapeHtml(file.title)}</h2>
        <span class="file-meta">${file.total} ${plural(file.total, "вопрос", "вопроса", "вопросов")} ·
          ${file.tests.length} ${plural(file.tests.length, "тест", "теста", "тестов")}</span>
      </div>
      <div class="tests-grid">
        ${file.tests.map((test, i) => renderCard(file, test, i)).join("")}
      </div>
    </section>
  `;
}

function renderCard(file, test, index) {
  const result = getResult(file.source, test.id);
  const best = result
    ? `<div class="best" style="--best-color:${scoreColor(result.best)}">
         <div class="best-row"><span>Лучший результат</span><b>${result.best}%</b></div>
         <div class="best-bar"><span style="width:${result.best}%"></span></div>
       </div>`
    : `<div class="best"><div class="best-row"><span>Ещё не пройден</span></div>
         <div class="best-bar"></div></div>`;

  return `
    <article class="test-card" style="animation-delay:${Math.min(index, 12) * 40}ms">
      <div class="test-head">
        <span class="test-number">${String(test.id).padStart(2, "0")}</span>
        ${result
          ? `<span class="badge done">✓ ${result.attempts} ${plural(result.attempts, "попытка", "попытки", "попыток")}</span>`
          : `<span class="badge">${test.count} вопр.</span>`}
      </div>
      <div>
        <div class="test-title">${escapeHtml(test.title)}</div>
        <div class="test-meta">${test.count} ${plural(test.count, "вопрос", "вопроса", "вопросов")} · №${test.from}–${test.to}</div>
      </div>
      ${best}
      <a class="btn ${result ? "btn-secondary" : ""} btn-wide" href="#/test/${file.id}/${test.id}">
        ${result ? "Пройти ещё раз" : "Пройти"}
      </a>
    </article>
  `;
}

function renderFileError(file) {
  return `
    <section class="file-section">
      <h2 class="section-title">📄 ${escapeHtml(file.source)}</h2>
      <div class="panel" style="margin:0">
        <p>Не получилось прочитать этот файл:</p>
        <ul class="error-list">${file.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
      </div>
    </section>
  `;
}

/** 1 вопрос, 2 вопроса, 5 вопросов */
function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
