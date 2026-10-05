// Точка входа: простой роутер по адресу после «#».
//   #/            — список тестов
//   #/test/2/3    — файл 2, тест 3

import { resetCatalog } from "./api.js";
import { renderHome } from "./home.js";
import { renderQuiz } from "./quiz.js";

const app = document.getElementById("app");
let cleanup = () => {}; // останавливает таймер предыдущего экрана

async function route() {
  cleanup();
  cleanup = () => {};
  window.scrollTo({ top: 0 });

  const match = location.hash.match(/^#\/test\/(\d+)\/(\d+)/);
  try {
    if (match) {
      cleanup = await renderQuiz(app, match[1], match[2]);
    } else {
      resetCatalog();
      await renderHome(app);
    }
  } catch (error) {
    console.error(error);
    app.innerHTML = `
      <section class="screen panel">
        <h2>Не удалось загрузить тесты</h2>
        <p>Если сайт открыт локально, убедитесь, что запущен <b>start.bat</b> (или <b>python app.py</b>),
           и обновите страницу.</p>
      </section>`;
  }
}

window.addEventListener("hashchange", route);
route();
