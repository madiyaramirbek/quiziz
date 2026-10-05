// Загрузка тестов. Все данные лежат в одном файле tests.json:
// локально его собирает app.py, на хостинге он создаётся командой build.py.

let cache = null;

/**
 * { files: [{ id, source, title, total, tests: [{id, title, count, from, to, questions}] }],
 *   errors: [{ source, errors }] }
 */
export async function loadCatalog() {
  if (!cache) {
    const response = await fetch("tests.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`tests.json: ${response.status}`);
    cache = await response.json();
  }
  return cache;
}

/** Сбрасываем кэш при возврате на главную — чтобы подхватить правки файла. */
export function resetCatalog() {
  cache = null;
}

/** Один тест: { source, fileTitle, id, title, questions } или null */
export async function findTest(fileId, testId) {
  const catalog = await loadCatalog();
  const file = catalog.files.find((f) => String(f.id) === String(fileId));
  const test = file?.tests.find((t) => String(t.id) === String(testId));
  return test ? { ...test, source: file.source, fileTitle: file.title } : null;
}
