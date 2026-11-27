import type { ContractProject } from "./contractProject.schema";
import {
  buildContractDocument,
  type ContractDocument,
} from "./contractDocument";

/**
 * Выгрузка проекта контракта в Word. Текст берётся из той же модели, что и
 * предпросмотр в конструкторе: разделы, приложения, подписи и выбранные
 * типовые условия ПП РФ попадают в файл без пересказа и правок формулировок.
 */

const triggerBlobDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const safeFileName = (value: string): string =>
  value.replace(/[\\/:*?"<>|\s]+/gu, "_").replace(/_{2,}/gu, "_");

/** Сборка DOCX из уже собранного документа — удобно для превью и проверок. */
export const buildContractDocumentDocx = async (
  document: ContractDocument,
  standardTerm?: ContractProject["standardTerm"],
): Promise<Blob> => {
  const {
    AlignmentType,
    Document,
    Footer,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const font = "Times New Roman";
  const run = (text: string, bold = false) =>
    new TextRun({ text, font, size: 22, bold });

  const heading = (text: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 120 },
      children: [run(text, true)],
    });

  const body = (text: string, indent = false) =>
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80, line: 276 },
      indent: indent ? { firstLine: 567 } : undefined,
      children: [run(text)],
    });

  const children = [
    ...document.title.split("\n").filter(Boolean).map(heading),
    body(document.preamble),
    ...document.sections.flatMap((section) => [
      heading(`${section.number}. ${section.title.toUpperCase()}`),
      ...section.paragraphs.map((paragraph) => body(paragraph, true)),
    ]),
  ];

  if (document.appendices.length > 0) {
    children.push(heading("Приложения"));
    for (const appendix of document.appendices) {
      children.push(
        body(
          `${appendix.number}. ${appendix.title}${appendix.note ? ` — ${appendix.note}` : ""}`,
        ),
      );
    }
  }

  children.push(...document.signature.map((line) => body(line)));

  const sourceNote = standardTerm
    ? `Типовые условия: ${standardTerm.textSource} · ${standardTerm.sourceUrl} · SHA-256 ${standardTerm.textSha256}`
    : "Проект контракта сформирован в CSMS";

  const doc = new Document({
    creator: "CSMS",
    title: document.title.replace(/\n/gu, " "),
    description: sourceNote,
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: sourceNote, font, size: 14, italics: true }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
};

export const buildContractProjectDocx = async (
  project: ContractProject,
): Promise<Blob> =>
  buildContractDocumentDocx(buildContractDocument(project), project.standardTerm);

export const downloadContractProjectDocx = async (
  project: ContractProject,
): Promise<void> => {
  const blob = await buildContractProjectDocx(project);
  const base = safeFileName(
    project.contractNumber || project.ikz || project.contractName,
  );
  triggerBlobDownload(blob, `Проект_контракта_${base}.docx`);
};
