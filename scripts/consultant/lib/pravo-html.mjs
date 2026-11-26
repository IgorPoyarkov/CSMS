// Разбор HTML, который портал pravo.gov.ru отдаёт как «.doc» (на самом деле
// это Word-совместимый HTML). Нужны два представления: плоский текст для
// сверки и текст с заголовками статей для RAG.

const decode = (value) =>
  String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "…")
    .replace(/&laquo;/gi, "«")
    .replace(/&raquo;/gi, "»")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

const clean = (html, { dropEditionMarks }) => {
  let result = String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<title>[\s\S]*?<\/title>/gi, " ")
    // Чекбоксы «Список изменяющих документов» — элемент интерфейса портала.
    .replace(/<input[^>]*>/gi, " ")
    .replace(/<label[^>]*>[\s\S]*?<\/label>/gi, " ");
  if (dropEditionMarks) {
    // Внутренние ссылки портала оставляем как обычный текст (там могут быть
    // номера актов), а сноски «(В редакции …)» удаляем: это не текст нормы.
    result = result
      .replace(/<span class="cmd[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/<span class="mark[^"]*"[^>]*>[\s\S]*?<\/span>/gi, " ")
      .replace(/<span class="cmd[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, "$1");
  }
  // Добавочные номера статей, частей и пунктов портал выделяет span-суперскриптом
  // W9: «276<span class="W9">1</span>» — это статья 276.1, «4<span class="W9">1</span>)»
  // — пункт 4.1). Если просто снять теги, получаются несуществующие «2761» и «41».
  // Восстанавливаем точку до общей очистки тегов, для txt и md одинаково.
  result = result.replace(
    /<span class=["']W9["'][^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner) => {
      const suffix = decode(inner).trim();
      return /^\d+$/.test(suffix) ? `.${suffix}` : suffix;
    },
  );
  return result;
};

/** Плоский текст: одна строка на абзац, удобно для grep и ручной сверки. */
export function htmlToText(html) {
  const body = clean(html, { dropEditionMarks: false })
    .replace(/<\/(p|div|li|tr|h[1-6]|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decode(body)
    .replace(/[ \t\xa0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Текст для индекса: заголовки статей становятся markdown-заголовками,
 * поэтому чанкер из knowledge.mjs сохранит номер статьи в title.
 */
export function htmlToMarkdown(html) {
  const body = clean(html, { dropEditionMarks: true })
    .replace(/<p class="H"[^>]*>/gi, "\n\n## ")
    .replace(/<p class="A"[^>]*>/gi, "\n\n### ")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return decode(body)
    .replace(/[ \t\xa0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^#+\s*$/gm, "")
    .trim();
}

/** Заголовок редакции для шапки скачанного файла. */
export function editionHeader(caption, documentName) {
  return (
    `<div id="topText" style="font-style:italic;font-size:16px">` +
    `<div>${documentName}</div><div>Официальный текст</div>` +
    `<div>Редакция ${caption}</div><hr></div>`
  );
}
