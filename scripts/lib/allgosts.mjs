/**
 * Чистый парсер страницы allgosts.ru: карточка + полный текст стандарта.
 * Сеть здесь не используется — только разбор уже полученного HTML.
 * robots.txt сайта разрешает HTML-страницы, но запрещает /search и файлы
 * .pdf/.doc/.docx; скачивать их не нужно, текст лежит прямо в <article>.
 */

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  hellip: "…",
};

export function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/** Пробелы и переводы строк в тексте стандарта не несут смысла. */
export const normText = (value) =>
  decodeHtml(value).replace(/\s+/g, " ").trim();

function stripTags(html) {
  return decodeHtml(
    String(html ?? "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

const RU_DIGITS = {
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
  пятнадцать: 15,
  двадцать: 20,
  двадцатьодин: 21,
  тридцать: 30,
  тридцатьшесть: 36,
};

/**
 * «пять лет», «2 года», «18 месяцев» → месяцы. Неизвестную форму не выдумываем.
 */
export function warrantyMonths(text) {
  const value = normText(text).toLowerCase();
  const years = /(\d+|[а-яё]+)\s*(?:лет|год|года|г\.|летний)/.exec(value);
  if (years) {
    const raw = years[1].toLowerCase().replace(/[\s-]+/g, "");
    const count = /^\d+$/.test(raw) ? Number(raw) : RU_DIGITS[raw];
    return typeof count === "number" && count > 0 ? count * 12 : null;
  }
  const months = /(\d+|[а-яё]+)\s*месяц(?:ев|а|ев)?/.exec(value);
  if (months) {
    const raw = months[1].toLowerCase().replace(/[\s-]+/g, "");
    const count = /^\d+$/.test(raw) ? Number(raw) : RU_DIGITS[raw];
    return typeof count === "number" && count > 0 ? count : null;
  }
  return null;
}

/** Из заголовка «ГОСТ 1232-2017 Изоляторы…» берём только обозначение. */
export const designationOf = (value) => {
  const text = normText(value);
  return /^(ГОСТ(?: Р)?\s*[\d.]+-[\d]{4})/i.exec(text)?.[1] ?? text;
};

/** Разбиваем <article> на разделы по <h2>/<h3>: «9 Гарантии изготовителя» и т.п. */
export function parseSections(html) {
  const article = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] ?? "";
  const headings = [...article.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)];
  const sections = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = normText(stripTags(headings[index][1]));
    const from = headings[index].index + headings[index][0].length;
    const to = headings[index + 1]?.index ?? article.length;
    const paragraphs = [...article.slice(from, to).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => normText(stripTags(match[1])))
      .filter(Boolean);
    sections.push({ heading, paragraphs });
  }
  return sections;
}

/**
 * Тот же текст, но уже выгруженный из браузера в .txt: заголовки разделов —
 * строки вида «9 Гарантии изготовителя» или «Приложение А», остальное — абзацы.
 */
export function parseGostText(text, sourceUrl = "") {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map(normText)
    .filter(Boolean);
  const sections = [];
  let current = { heading: "", paragraphs: [] };
  for (const line of lines) {
    if (/^(?:\d{1,2}|Приложение\s+[А-ЯЁA-Z])\s+\S/.test(line)) {
      if (current.paragraphs.length) sections.push(current);
      current = { heading: line, paragraphs: [] };
    } else {
      current.paragraphs.push(line);
    }
  }
  if (current.paragraphs.length) sections.push(current);
  return {
    designation: designationOf(lines.find((line) => /^ГОСТ[ Р]?\s/.test(line)) ?? ""),
    title: "",
    status: "",
    effectiveDate: "",
    sourceUrl,
    text: normText(text),
    sections,
  };
}

/** Карточка + текст + разделы страницы allgosts.ru. */
export function parseAllgostsPage(html, sourceUrl = "") {
  const article = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] ?? "";
  const text = normText(stripTags(article));
  const designation = designationOf(
    stripTags(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? ""),
  );
  const sections = parseSections(html);
  return {
    designation,
    title: "",
    status: "",
    effectiveDate: "",
    sourceUrl,
    text,
    sections,
  };
}

const sentencesOf = (paragraph) =>
  paragraph.split(/(?<=[.!?])\s+(?=[А-ЯA-Z0-9])/).map(normText).filter(Boolean);

/**
 * Берем не первое упоминание, а наиболее конкретное: раздел «Упаковка»
 * важнее общего перечня «в части требований к приемке, методам испытаний…».
 */
function bestSentence(sections, test, score) {
  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const section of sections) {
    if (/нормативные ссылки|библиограф|термины|определения|сокращ/i.test(section.heading)) continue;
    for (const paragraph of section.paragraphs) {
      for (const sentence of sentencesOf(paragraph)) {
        // Ссылки на другие стандарты — не требование к нашему товару.
        if (/^ГОСТ(?: Р)?\s/i.test(sentence)) continue;
        // Заголовки пунктов и определения не являются требованиями.
        if (sentence.length < 25 || /^\d+(?:\.\d+)*\s+[а-яa-z]+:/i.test(sentence)) continue;
        if (!test(sentence, section.heading)) continue;
        const value = score(sentence, section.heading);
        if (value > bestScore && sentence.length <= 400) {
          best = sentence;
          bestScore = value;
        }
      }
    }
  }
  return best;
}

function pickSentences(sections, test, limit = 3) {
  const found = [];
  for (const section of sections) {
    for (const paragraph of section.paragraphs) {
      if (!test(paragraph, section.heading)) continue;
      for (const sentence of sentencesOf(paragraph)) {
        if (!found.includes(sentence)) found.push(sentence);
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}

/**
 * Структурированные требования для ООЗ. Каждое значение сопровождается
 * дословной цитатой из текста стандарта — без цитаты поле не предлагается.
 */
export function extractGostRequirements(parsed) {
  const sections = parsed.sections ?? [];
  const text = normText(parsed.text ?? "");
  const result = [];
  const add = (requirement) => {
    const quote = normText(requirement.quote);
    // Цитата обязана дословно присутствовать в тексте стандарта.
    if (quote.length >= 10 && text.includes(quote)) {
      result.push({ ...requirement, quote });
    }
  };

  const warrantyQuote = pickSentences(
    sections,
    (paragraph, heading) =>
      /гарантийный срок/i.test(paragraph) || /гаранти/i.test(heading),
  ).find((sentence) => /гарантийный срок/i.test(sentence));
  if (warrantyQuote) {
    const months = warrantyMonths(warrantyQuote);
    if (months) {
      add({
        field: "warrantyTermMonths",
        label: "Гарантийный срок",
        value: String(months),
        months,
        quote: warrantyQuote,
        section: "Гарантии изготовителя",
      });
    }
  }

  const guarantee = pickSentences(
    sections,
    (paragraph, heading) =>
      /гарантирует|гарантийные обязательства/i.test(paragraph) &&
      /гаранти/i.test(heading),
    2,
  ).find((sentence) => /изготовитель гарантирует/i.test(sentence));
  if (guarantee) {
    add({
      field: "warrantyRequirements",
      label: "Гарантия на оборудование",
      value: guarantee,
      quote: guarantee,
      section: "Гарантии изготовителя",
    });
  }

  // Js-флаг \b не работает с кириллицей, поэтому границу слова проверяем явно.
  const wordAtStart = (sentence, word) => {
    const index = sentence.toLowerCase().indexOf(word);
    return index >= 0 && index < 60;
  };
  const numbered = (sentence, word) =>
    new RegExp(`^\\d+(?:\\.\\d+)*\\s*${word}`, "i").test(sentence);

  // Монтаж предлагаем только если в стандарте есть отдельный раздел про
  // монтаж/эксплуатацию. Упоминания монтажа в методах испытаний — не требование.
  const installation = bestSentence(
    sections,
    (sentence, heading) =>
      /монтаж|установк|ввод в эксплуатацию/i.test(sentence) &&
      (/монтаж|эксплуатац|установк/i.test(heading) ||
        numbered(sentence, "(?:монтаж|установка|ввод в эксплуатацию)")),
    (sentence) =>
      (numbered(sentence, "(?:монтаж|установка|ввод в эксплуатацию)") ? 4 : 0) +
      (/должен|должна|должны|осуществляется|проводится|устанавливается/i.test(sentence) ? 2 : 0) -
      (/испытани|измеритель|дождевальн|трансформатор/i.test(sentence) ? 6 : 0) -
      (sentence.length > 300 ? 2 : 0),
  );
  if (installation) {
    add({
      field: "warrantyRequirements",
      label: "Монтаж и ввод в эксплуатацию",
      value: installation,
      quote: installation,
      section: "Эксплуатация / монтаж",
    });
  }

  // Упоминание «маркировок ТС» в перечне документов — не требование к упаковке,
  // поэтому цитата должна начинаться с упаковки/тары/маркировки или быть пунктом.
  const packaging = bestSentence(
    sections,
    (sentence) =>
      /упаковк|тара|маркиров/i.test(sentence) &&
      (numbered(sentence, "(?:упаковка|тара|маркировка)") ||
        wordAtStart(sentence, "упаковка") ||
        wordAtStart(sentence, "тара") ||
        wordAtStart(sentence, "маркировка") ||
        /упаковывается|маркируется/i.test(sentence)),
    (sentence, heading) =>
      (/упаковк|маркиров|тар/i.test(heading) ? 2 : 0) +
      (wordAtStart(sentence, "упаковка") || wordAtStart(sentence, "тара") ? 1 : 0) +
      (numbered(sentence, "упаковка") ? 4 : 0) +
      (/должен|должна|должны|упаковывается|маркируется|осуществляется/i.test(sentence) ? 2 : 0) -
      (sentence.length > 200 ? 2 : 0) -
      (/приемк|методам испытаний/i.test(sentence) ? 3 : 0),
  );
  if (packaging) {
    add({
      field: "otherRequirements",
      label: "Тара и упаковка",
      value: packaging,
      quote: packaging,
      section: "Упаковка и маркировка",
    });
    add({
      field: "descriptionComponents.packaging",
      label: "Включить «Упаковка» в состав описания",
      value: "packaging",
      quote: packaging,
      section: "Упаковка и маркировка",
    });
  }

  return result;
}
