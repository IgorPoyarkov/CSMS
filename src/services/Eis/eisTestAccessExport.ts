import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { downloadBlob } from "./eisExport";
import type { EdsCertificate } from "../Eds/eds.schema";
import {
  EIS_TEST_ACCESS_VERIFY_ITEMS,
  type EisTestAccessRequest,
} from "./eisTestAccess.schema";

/**
 * Экспорт обращения на тестовый доступ к ЕИС в Word (.docx).
 *
 * Документ включает текст обращения и, если обращение отмечено подписанным ЭП,
 * визуальный оттиск (штамп) электронной подписи с реквизитами сертификата.
 * Оттиск фиксирует факт подписи в интерфейсе CSMS; юридическую силу имеет
 * сама квалифицированная подпись (.sig), приложенная к обращению.
 */

const sanitizeFilePart = (value: string): string =>
  value.replace(/[^\wа-яА-ЯёЁ.-]+/g, "_").replace(/_+/g, "_").slice(0, 60);

const formatDateRu = (value?: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU");
};

const formatIsoDateRu = (value?: string): string => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
};

const border = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "999999",
};

const tableBorders = {
  top: border,
  bottom: border,
  left: border,
  right: border,
  insideHorizontal: border,
  insideVertical: border,
};

const heading = (text: string, after = 120) =>
  new Paragraph({
    spacing: { before: 180, after },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        font: "Times New Roman",
      }),
    ],
  });

const bodyParagraph = (
  text: string,
  options: { bold?: boolean; after?: number; before?: number; color?: string } = {},
) =>
  new Paragraph({
    spacing: { before: options.before ?? 40, after: options.after ?? 60 },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: 22,
        font: "Times New Roman",
        color: options.color,
      }),
    ],
  });

const kvTable = (rows: Array<[string, string]>) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              shading: { fill: "F5F7F6" },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label,
                      bold: true,
                      size: 20,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 62, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value || "—",
                      size: 20,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  });

const buildSealText = (
  request: EisTestAccessRequest,
  certificate?: EdsCertificate | null,
): string => {
  const owner = certificate?.ownerName || request.signedBy || request.contactName || "—";
  const serialSlice = certificate?.serialNumber?.trim()
    ? `${certificate.serialNumber.trim().slice(0, 8)}...`
    : "—";
  const validFrom = formatIsoDateRu(certificate?.validFrom);
  const validTo = formatIsoDateRu(certificate?.validTo);
  const inn = certificate?.inn || request.contractorInn || "—";

  return `${owner} срез ${serialSlice} действует с ${validFrom} по ${validTo} ИНН ${inn}`;
};

const buildSignatureStamp = (
  request: EisTestAccessRequest,
  certificate?: EdsCertificate | null,
): Table => {
  const certRows: Array<[string, string]> = certificate
    ? [
        ["Владелец сертификата", certificate.ownerName || "—"],
        ["Должность", certificate.ownerPosition || "—"],
        ["ИНН в сертификате", certificate.inn || "—"],
        ["Серийный номер", certificate.serialNumber || "—"],
        ["Отпечаток", certificate.fingerprint || "—"],
        ["Алгоритм подписи", certificate.signatureAlgorithm || "—"],
        [
          "Срок действия",
          `${formatIsoDateRu(certificate.validFrom)} — ${formatIsoDateRu(certificate.validTo)}`,
        ],
        ["Источник", certificate.source === "plugin" ? "КриптоПро ЭЦП Browser plug-in" : "Реестр сертификатов CSMS"],
      ]
    : [];

  const rows: Array<[string, string]> = [
    ["Статус", "ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"],
    ["Печать", buildSealText(request, certificate)],
    ["Подписант", request.signedBy || request.contactName || "—"],
    ["Дата и время отметки подписи", formatDateRu(request.signedAt)],
    ["Файл подписи", request.signatureFileName || "—"],
    ...certRows,
  ];

  const stampBorder = {
    style: BorderStyle.SINGLE,
    size: 8,
    color: "1B5E20",
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: stampBorder,
      bottom: stampBorder,
      left: stampBorder,
      right: stampBorder,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "A5C9A8" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "A5C9A8" },
    },
    rows: rows.map(([label, value], index) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            shading: { fill: index === 0 ? "E7F3E8" : "F7FBF7" },
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: label,
                    bold: true,
                    size: 20,
                    font: "Times New Roman",
                    color: "1B5E20",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 62, type: WidthType.PERCENTAGE },
            shading: { fill: index === 0 ? "E7F3E8" : "FFFFFF" },
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: value || "—",
                    bold: index === 0,
                    size: index === 0 ? 22 : 20,
                    font: "Times New Roman",
                    color: index === 0 ? "1B5E20" : "000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ),
  });
};

export async function exportEisTestAccessToDocx(
  request: EisTestAccessRequest,
  certificate?: EdsCertificate | null,
): Promise<void> {
  const date = new Date().toLocaleDateString("ru-RU");

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Дата: ${date}`,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: "В техническую поддержку Единой информационной системы в сфере закупок",
          size: 22,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 220 },
      children: [
        new TextRun({
          text: "Обращение на предоставление тестового доступа к ЕИС",
          bold: true,
          size: 28,
          font: "Times New Roman",
        }),
      ],
    }),
    heading("1. Организация / подрядчик"),
    kvTable([
      ["Полное наименование", request.contractorName || "—"],
      ["Краткое наименование", request.contractorShortName || "—"],
      ["ИНН", request.contractorInn || "—"],
      ["КПП", request.contractorKpp || "—"],
      ["ОГРН", request.contractorOgrn || "—"],
      ["Адрес", request.contractorAddress || "—"],
      ["Реестровый номер в ЕИС", request.eisRegistryNumber || "—"],
      ["Раздел / контур ЕИС", request.eisSection || "—"],
    ]),
    heading("2. Контактное лицо"),
    kvTable([
      ["ФИО", request.contactName || "—"],
      ["Должность", request.contactPosition || "—"],
      ["Email", request.contactEmail || request.contractorEmail || "—"],
      ["Телефон", request.contactPhone || request.contractorPhone || "—"],
    ]),
    heading("3. Система и цель обращения"),
    kvTable([
      ["Система", request.systemName || "—"],
      ["Цель обращения", request.purpose || "—"],
    ]),
    bodyParagraph("Описание системы и цели интеграции:", { bold: true, before: 120, after: 60 }),
    bodyParagraph(request.systemDescription?.trim() || "—", { after: 120 }),
    heading("4. Что проверяем на тестовом контуре"),
    ...EIS_TEST_ACCESS_VERIFY_ITEMS.map((item, index) =>
      bodyParagraph(`${index + 1}. ${item}`, { after: 40 }),
    ),
    heading("5. Просьба"),
    bodyParagraph(
      "1. Предоставить тестовые учётные данные (логин/пароль или сертификат) и адреса сервисов тестового контура ЕИС.",
      { after: 40 },
    ),
    bodyParagraph(
      "2. Сообщить требования к сертификатам, сетевым настройкам и регламенту обмена.",
      { after: 40 },
    ),
    bodyParagraph(
      "3. Обеспечить возможность разбора диагностических сообщений ФЛК и статусов переданных пакетов.",
      { after: 80 },
    ),
    bodyParagraph("Подготовлено в СУКСЗ.", { after: 180 }),
  ];

  if (request.signedAt || request.status === "signed" || request.status === "sent") {
    children.push(heading("Оттиск электронной подписи", 100));
    children.push(buildSignatureStamp(request, certificate));
    children.push(
      bodyParagraph(
        "Оттиск фиксирует факт подписания обращения в CSMS. Юридическую силу имеет квалифицированная электронная подпись в файле подписи (.sig), приложенном к обращению.",
        { after: 40, before: 100, color: "555555" },
      ),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 850 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = sanitizeFilePart(request.contractorInn || "eis-test-access");
  const suffix = request.signedAt ? "s-ottiskom-ep" : "obraschenie";
  downloadBlob(blob, `${suffix}-${safeName}.docx`);
}
