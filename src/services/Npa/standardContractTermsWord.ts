import type { StandardContractTerm } from "./standardContractTerms.api";

/**
 * Парсер дословного текста типовых условий контрактов в структурированный
 * Word-документ. Текст приходит из снимка pravo.gov.ru через csms-api: здесь
 * он не пересказывается и не редактируется, разметка только помогает Word
 * показать официальную структуру (шапка, разделы, пункты, подпункты).
 *
 * Модуль не делает запросов: источник данных — каталог из React Query на
 * странице библиотеки НПА и в конструкторе проекта контракта.
 */

export type StandardTermBlockKind =
  | "agency"
  | "decree"
  | "title"
  | "section"
  | "clause"
  | "subclause"
  | "paragraph";

export interface StandardTermBlock {
  kind: StandardTermBlockKind;
  /** Дословная строка снимка, без изменений текста и нумерации. */
  text: string;
}

const ROMAN_HEADING = /^(?:I{1,3}|IV|V|VI|VII|VIII|IX|X)\.\s+\S/;
const NUMBERED_CLAUSE = /^\d{1,3}\.\s+\S/;
const SUBITEM = /^(?:[а-яё]|\d{1,2})\)\s+\S|^[-–—]\s+\S/;
const DECREE_DATE = /^от\s+\d{1,2}\s+\p{L}+\s+\d{4}\s+г\.\s+№/iu;
const AGENCY_LINE =
  /^(?:ПРАВИТЕЛЬСТВО РОССИЙСКОЙ ФЕДЕРАЦИИ|ПОСТАНОВЛЕНИЕ|МОСКВА|УТВЕРЖДЕНЫ|ПРИЛОЖЕНИЕ)$/iu;

/**
 * Разбор по строкам: пустые строки снимка не несут текста, поэтому в документ
 * не попадают, а каждая оставшаяся строка сохраняется как есть. Проверка в
 * `check:standard-terms` сверяет, что склейка блоков даёт тот же текст.
 */
export const parseStandardContractTermsText = (
  text: string,
): StandardTermBlock[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/u, ""))
    .filter((line) => line.length > 0)
    .map((line) => {
      if (AGENCY_LINE.test(line)) return { kind: "agency" as const, text: line };
      if (DECREE_DATE.test(line)) return { kind: "decree" as const, text: line };
      if (ROMAN_HEADING.test(line)) return { kind: "section" as const, text: line };
      if (NUMBERED_CLAUSE.test(line)) return { kind: "clause" as const, text: line };
      if (SUBITEM.test(line)) return { kind: "subclause" as const, text: line };
      const upper = line === line.toUpperCase() && !/\d/u.test(line);
      return { kind: upper ? ("title" as const) : ("paragraph" as const), text: line };
    });

/** Имя файла без символов, которые ломают сохранение в Windows и ЕИС. */
const fileBaseName = (term: StandardContractTerm): string =>
  `Типовые_условия_ПП_РФ_№${term.number}_от_${term.adoptionDate}`.replace(
    /[\\/:*?"<>|\s]+/gu,
    "_",
  );

/** Сборка .docx из блоков снимка. Содержимое блоков не изменяется. */
export const buildStandardContractTermsDocx = async (
  term: StandardContractTerm,
): Promise<Blob> => {
  const {
    AlignmentType,
    Document,
    Footer,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const blocks = parseStandardContractTermsText(term.text);
  const font = "Times New Roman";

  const paragraph = (block: StandardTermBlock) => {
    const common = {
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80, line: 276 },
      children: [
        new TextRun({
          text: block.text,
          font,
          size: 22,
          bold:
            block.kind === "agency" ||
            block.kind === "decree" ||
            block.kind === "title" ||
            block.kind === "section",
        }),
      ],
    };

    switch (block.kind) {
      case "agency":
        return new Paragraph({
          ...common,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        });
      case "title":
      case "section":
        return new Paragraph({
          ...common,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
        });
      case "clause":
        return new Paragraph({ ...common, indent: { firstLine: 567 } });
      case "subclause":
        return new Paragraph({ ...common, indent: { left: 567 } });
      default:
        return new Paragraph(common);
    }
  };

  const document = new Document({
    creator: "CSMS",
    title: term.passing,
    subject: term.title,
    description: [
      `Источник текста: ${term.textSource}`,
      `Редакция от ${term.redDate.slice(0, 4)}-${term.redDate.slice(4, 6)}-${term.redDate.slice(6, 8)}`,
      `SHA-256 текста: ${term.textSha256}`,
    ].join(" · "),
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Текст: ${term.textSource} · ${term.sourceUrl}`,
                    font,
                    size: 14,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: blocks.map(paragraph),
      },
    ],
  });

  return Packer.toBlob(document);
};

/** Скачивание документа с тем же именем, что и у других выгрузок проекта. */
export const downloadStandardContractTermsDocx = async (
  term: StandardContractTerm,
): Promise<void> => {
  const blob = await buildStandardContractTermsDocx(term);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileBaseName(term)}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Браузер успевает начать скачивание до освобождения object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
