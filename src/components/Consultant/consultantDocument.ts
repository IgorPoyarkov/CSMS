// Разбор локальной markdown-копии нормативного акта для просмотра в консультанте.
// Заголовки статей и части получают якоря, чтобы ссылка из ответа вела к нужной норме.

export interface DocBlock {
  id?: string;
  // Ближайший заголовок главы/раздела — нужен для вложенного меню статей.
  chapterId?: string;
  kind: "chapter" | "article" | "part" | "item" | "text";
  text: string;
}

const withoutDots = (value: string) => value.replace(/\./g, "");

// В текстах встречаются и «ст. 34», и «Статья 241» (это статья 24.1).
// Якорь строим без точек: both «24.1» и «241» дают article-241.
export const anchorFromRef = (ref?: string | null): string | null => {
  if (!ref) return null;
  // Без \b: JS не считает кириллицу «словом», поэтому граница HERE не сработает.
  const article =
    ref.match(/стат(?:ьями|ьям|ьей|ьею|ье|ья|ьи|ью|ей|ею|е|и)?\.?\s*(\d+(?:\.\d+)?)/i) ??
    ref.match(/ст\.?\s*(\d+(?:\.\d+)?)/i);
  if (!article) return null;
  const part = ref.match(/ч(?:асть|асти|астью)?\.?\s*(\d+(?:\.\d+)?)/i);
  return part
    ? `article-${withoutDots(article[1])}-part-${withoutDots(part[1])}`
    : `article-${withoutDots(article[1])}`;
};

// В конвертированном тексте исключённые пункты остались голыми номерами
// («8)», «4)», «2.») — такие строки не несут текста и в просмотр не попадают.
const isEmptyMarker = (line: string) =>
  /^(?:\d+(?:\.\d+)*\.|[а-яё]\))\s*$/i.test(line);

// DOCX→markdown склеивает составные номера: «1.1)» стало «11)», «4.1)» — «41)».
// Восстанавливаем точку по предыдущему номеру: 4) → 41) = 4.1), 10) → 101) = 10.1).
const restoreItemNumber = (raw: string, previous: number | null) => {
  if (raw.includes(".") || previous === null) return raw;
  const prefix = String(previous);
  const rest = raw.startsWith(prefix) ? raw.slice(prefix.length) : "";
  return Number(raw) > previous + 1 && rest && !rest.startsWith("0")
    ? `${previous}.${rest}`
    : raw;
};

// В старых копиях DOCX→markdown склеил точки в номерах статей: «24.2» стало
// «242», «276.1» — «2761». Восстанавливаем точку по предыдущему заголовку,
// а не по жёсткому списку оснований: у других кодексов свои составные номера,
// и «242» в ГК РФ — настоящая статья, а не «24.2».
const restoreArticleNumber = (raw: string, previous: string) => {
  if (raw.includes(".") || !previous || previous.includes(".")) return raw;
  if (!raw.startsWith(previous) || raw.length <= previous.length) return raw;
  const suffix = raw.slice(previous.length);
  return /^\d{1,2}$/.test(suffix) ? `${previous}.${suffix}` : raw;
};

// DOCX склеил точки и в номерах частей: «6.1» → «61», «42.1» → «421».
// Составной номер выбивается из последовательности простых номеров статьи,
// поэтому восстановление делаем по последнему простому номеру (5 → 51 = 5.1).
const restorePartNumber = (raw: string, lastPlain: number | null) => {
  if (raw.includes(".") || lastPlain === null) return raw;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= lastPlain + 1) return raw;
  const prefix = String(lastPlain);
  return raw.startsWith(prefix) ? `${prefix}.${raw.slice(prefix.length)}` : raw;
};

const REPEAL_RE = /утратил|утратила|исключен|исключена|не действует|отменен|отменена/i;
const REPEAL_BODY_RE = /^(?:утрати(?:л|ла|ли)\s+силу|исключен(?:а|ы|о)?)\.?$/i;
const CYRILLIC_ALPHABET = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const letterIndex = (letter: string) =>
  CYRILLIC_ALPHABET.indexOf(letter.toLowerCase()) + 1;

export const parseLawDocument = (markdown: string): DocBlock[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: DocBlock[] = [];
  let article = "";
  let chapterId = "";
  let partNumber = "";
  let lastPlainPart: number | null = null;
  let previousItem: number | null = null;
  let previousArticleRaw = "";
  let currentItemId = "";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      const text = heading[1].trim();
      const articleMatch = text.match(/^Статья\s+(\d+(?:\.\d+)?)\b/i);
      const articleNumber = articleMatch
        ? restoreArticleNumber(articleMatch[1], previousArticleRaw)
        : "";
      // В заголовке показываем настоящий номер («Статья 24.2»), а якорь
      // остаётся без точек — так сходится со ссылкой «ст. 24.2».
      const headingText = articleMatch
        ? text.replace(articleMatch[1], articleNumber)
        : text;
      // Отменённые статьи часто остаются пустыми заголовками («## Статья 13.»).
      let next = i + 1;
      while (next < lines.length && !/^##\s/.test(lines[next].trim())) next += 1;
      const body = lines
        .slice(i + 1, next)
        .map((item) => item.trim())
        .filter(Boolean)
        .join(" ");
      if (
        REPEAL_RE.test(text) ||
        (articleMatch && !body) ||
        REPEAL_BODY_RE.test(body)
      ) {
        i = next - 1;
        continue;
      }

      article = articleMatch ? withoutDots(articleNumber) : "";
      previousArticleRaw = articleMatch?.[1] ?? "";
      partNumber = "";
      lastPlainPart = null;
      previousItem = null;
      currentItemId = "";
      if (articleMatch) {
        blocks.push({
          id: `article-${article}`,
          chapterId,
          kind: "article",
          text: headingText,
        });
      } else {
        const chapter = text.match(/^Глава\s+(\d+(?:\.\d+)?)\b/i);
        chapterId = chapter ? `chapter-${withoutDots(chapter[1])}` : `chapter-${blocks.length}`;
        blocks.push({ id: chapterId, kind: "chapter", text });
      }
      continue;
    }

    const part = article && line.match(/^(\d+(?:\.\d+)?)\.\s+(.+)$/);
    if (part) {
      const partNumberText = restorePartNumber(part[1], lastPlainPart);
      if (!partNumberText.includes(".")) lastPlainPart = Number(partNumberText);
      partNumber = withoutDots(partNumberText);
      previousItem = null;
      currentItemId = "";
      blocks.push({
        id: `article-${article}-part-${partNumber}`,
        kind: "part",
        // Якорь без точек сохраняется, а в тексте показываем «18.1», не «181».
        text: line.replace(part[1], partNumberText),
      });
      continue;
    }

    const item = line.match(/^(\d+(?:\.\d+)?)\)\s*(.*)$/);
    if (item) {
      const number = restoreItemNumber(item[1], previousItem);
      const content = item[2].trim();
      // Составной номер («1.2») не сдвигает счётчик — он относится к пункту 1.
      previousItem = Number(number.includes(".") ? number.split(".")[0] : number);
      // Голые номера исключённых пунктов в просмотр не попадают.
      if (!content) continue;
      const suffix = number.replace(/\./g, "-");
      currentItemId = article
        ? partNumber
          ? `article-${article}-part-${partNumber}-item-${suffix}`
          : `article-${article}-item-${suffix}`
        : "";
      blocks.push({
        id: currentItemId || undefined,
        kind: "item",
        text: `${number}) ${content}`,
      });
      continue;
    }

    const letterItem = line.match(/^([а-яё])\)\s*(.+)$/i);
    if (letterItem) {
      const index = letterIndex(letterItem[1]);
      blocks.push({
        id: currentItemId && index ? `${currentItemId}-sub-${index}` : undefined,
        kind: "item",
        text: line,
      });
      continue;
    }

    // Пустая строка части («12.») в просмотр не попадает, но счётчик простых
    // номеров двигает: иначе следующий «121» не восстановится в «12.1».
    const emptyPart = line.match(/^(\d+)\.$/);
    if (emptyPart) {
      lastPlainPart = Number(emptyPart[1]);
      continue;
    }

    if (isEmptyMarker(line)) continue;
    // Сноски об изменении статьи («### …») не разрывают нумерацию пунктов.
    blocks.push({ kind: "text", text: line });
  }

  return blocks;
};

// Ссылки внутри того же закона: «ч. 1 ст. 34», «статьей 22 настоящего Федерального закона».
export interface DocTextSegment {
  text: string;
  anchor?: string;
}

const ARTICLE_WORD = String.raw`стат(?:ьями|ьям|ьей|ьею|ье|ья|ьи|ью|ей|ею|е|и)?|ст`;
const PART_WORD = String.raw`ч(?:астями|астях|астью|асти|асть|астей)?`;
const NUMBER = String.raw`\d+(?:\.\d+)?`;
const REF_RE = new RegExp(
  `(?:${PART_WORD}\\.?\\s*(${NUMBER})\\s*)?(?:${ARTICLE_WORD})\\.?\\s*(${NUMBER})`,
  "gi",
);
// «частями 1, 21, 4, 43 и 44 статьи 15» — каждая часть получает свою ссылку.
const MULTI_PART_RE = new RegExp(
  `(?:${PART_WORD})\\.?\\s*(${NUMBER}(?:\\s*(?:,|и)\\s*${NUMBER})*)\\s+(?:${ARTICLE_WORD})\\.?\\s*(${NUMBER})`,
  "gi",
);
const ITEM_WORD = String.raw`пункт(?:ом|а|у|ы|ами|ах|е)?`;
const SUB_WORD = String.raw`подпункт(?:ом|а|у|ы|ами|ах|е)?`;
// «подпункт "в" пункта 1», но и сокращённое «подпунктами "в" …, "б" пункта 2».
const ITEM_RE = new RegExp(
  `(?:(?:(${SUB_WORD})\\s*)?["«]([а-яё])["»]\\s*)?${ITEM_WORD}\\.?\\s*(${NUMBER}(?:\\s*(?:,|и)\\s*${NUMBER})*)`,
  "gi",
);

interface RefSpan {
  start: number;
  end: number;
  anchor: string;
}

// Внутренние нормы помечаем «настоящим Федеральным законом»; ссылки на другие
// законы (с датой или номером) не должны вести в эту копию ФЗ.
const isInternalRef = (text: string, index: number, end: number, found: string) => {
  const before = text.slice(Math.max(0, index - 120), index);
  const sentenceBefore = before.split(/[.;]\s/).pop() ?? before;
  const after = text.slice(end, end + 140);
  const context = `${sentenceBefore}${found}${after}`;
  const external = /Федерального закона\s+(?:от|№)|№\s*\d+\s*-\s*ФЗ/i.test(after);
  const internal = /насто(?:ящего|ящим|ящем)\s+Федеральн(?:ого|ым|ом)\s+закона/i.test(
    context,
  );
  return !external || internal;
};

export const splitDocumentRefs = (
  text: string,
  anchors: Set<string>,
): DocTextSegment[] => {
  const spans: RefSpan[] = [];

  for (const match of text.matchAll(MULTI_PART_RE)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (!isInternalRef(text, index, end, match[0])) continue;

    const list = match[1];
    const articleNumber = match[2];
    const articleAnchor = `article-${withoutDots(articleNumber)}`;
    const listOffset = index + match[0].indexOf(list);
    for (const number of list.matchAll(new RegExp(NUMBER, "g"))) {
      const start = listOffset + (number.index ?? 0);
      const anchor = `${articleAnchor}-part-${withoutDots(number[0])}`;
      if (anchors.has(anchor)) {
        spans.push({ start, end: start + number[0].length, anchor });
      }
    }
    const articleStart = index + match[0].lastIndexOf(articleNumber);
    if (anchors.has(articleAnchor)) {
      spans.push({
        start: articleStart,
        end: articleStart + articleNumber.length,
        anchor: articleAnchor,
      });
    }
  }

  for (const match of text.matchAll(REF_RE)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (spans.some((span) => index < span.end && end > span.start)) continue;
    if (!isInternalRef(text, index, end, match[0])) continue;

    let anchor = anchorFromRef(match[0]);
    if (!anchor || !anchors.has(anchor)) {
      const article = anchor?.replace(/-part-.*$/, "");
      anchor = article && anchors.has(article) ? article : null;
    }
    if (anchor) spans.push({ start: index, end, anchor });
  }

  // Пункты и подпункты («пунктами 1 и 2 части 1 статьи 34») получают якоря
  // по статье/части, которая указана сразу после перечисления.
  for (const match of text.matchAll(ITEM_RE)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (!isInternalRef(text, index, end, match[0])) continue;

    const after = text.slice(end, end + 160);
    const before = text.slice(Math.max(0, index - 160), index);
    const articleContext = new RegExp(
      `(?:${ARTICLE_WORD})\\.?\\s*(${NUMBER})`,
      "i",
    );
    const articleMatch =
      after.match(articleContext) ?? before.match(articleContext);
    if (!articleMatch) continue;
    const articleAnchor = `article-${withoutDots(articleMatch[1])}`;
    if (!anchors.has(articleAnchor)) continue;

    const partMatch = after.match(
      new RegExp(`(?:${PART_WORD})\\.?\\s*(${NUMBER})`, "i"),
    );
    const base = partMatch
      ? `${articleAnchor}-part-${withoutDots(partMatch[1])}`
      : articleAnchor;
    const letter = match[2]?.toLowerCase();
    const list = match[3];
    const listOffset = index + match[0].indexOf(list);
    const numbers = [...list.matchAll(new RegExp(NUMBER, "g"))];

    if (letter) {
      const number = numbers[0]?.[0];
      if (!number) continue;
      const suffix = number.replace(/\./g, "-");
      const sub = `-sub-${letterIndex(letter)}`;
      const anchor = [
        `${base}-item-${suffix}${sub}`,
        `${articleAnchor}-item-${suffix}${sub}`,
      ].find((candidate) => anchors.has(candidate));
      if (anchor) spans.push({ start: index, end, anchor });
      continue;
    }

    for (const number of numbers) {
      const start = listOffset + (number.index ?? 0);
      const suffix = number[0].replace(/\./g, "-");
      const anchor = [
        `${base}-item-${suffix}`,
        `${articleAnchor}-item-${suffix}`,
      ].find((candidate) => anchors.has(candidate));
      if (anchor) spans.push({ start, end: start + number[0].length, anchor });
    }
  }

  const segments: DocTextSegment[] = [];
  let last = 0;
  for (const span of spans.sort((a, b) => a.start - b.start)) {
    if (span.start < last) continue;
    if (span.start > last) segments.push({ text: text.slice(last, span.start) });
    segments.push({ text: text.slice(span.start, span.end), anchor: span.anchor });
    last = span.end;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
};
