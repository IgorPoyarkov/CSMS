/*
 * Выгрузка полного текста технического документа из браузера.
 *
 * Способ применения: открыть страницу документа (например,
 * https://allgosts.ru/29/080/gost_1232-2017), открыть консоль разработчика
 * и вставить содержимое этого файла. Скрипт скачает два файла:
 *   <designation>.html — разметка <article> (со структурой разделов),
 *   <designation>.txt  — видимый текст <article>.
 *
 * Оба файла кладутся в docs/snapshots/gost/fulltext/, после чего снимок
 * требований пересобирается: node scripts/build-gost-requirements.mjs
 *
 * Почему не fetch из Node: часть сайтов отдаёт капчу на серверные запросы,
 * а в браузере страница открывается нормально. robots.txt при этом
 * разрешает обычные HTML-страницы; /search и pdf/doc скачивать не нужно.
 */
(() => {
  const article = document.querySelector("article");
  if (!article) {
    console.error("На странице нет <article> — выгрузка недоступна");
    return;
  }

  const designation =
    (document.querySelector("h1")?.textContent || document.title)
      .trim()
      .split(/\s{2,}/)[0]
      .replace(/[^\p{L}\p{N}\s.-]/gu, "")
      .replace(/\s+/g, "-") || "document";

  const save = (name, body, mime) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([body], { type: mime }));
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  save(`${designation}.html`, article.outerHTML, "text/html;charset=utf-8");
  save(`${designation}.txt`, article.innerText, "text/plain;charset=utf-8");
  console.log(`Выгружено: ${designation}.html и ${designation}.txt`);
})();
