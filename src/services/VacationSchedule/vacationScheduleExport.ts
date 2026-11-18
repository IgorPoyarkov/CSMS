import {
  MONTH_LABELS,
  initialsName,
  partEndDate,
  partMonth,
  rowUnpaidDays,
  vacationLeaveKindShortLabels,
  vacationSummary,
  type VacationPart,
  type VacationRow,
  type VacationSchedule,
} from "./vacationSchedule.schema";

/**
 * Выгрузка графика отпусков.
 *
 * DOCX повторяет сетку унифицированной формы Т-2 (Постановление Госкомстата
 * России от 05.01.2004 N 1): реквизиты работника, дни отпуска без сохранения
 * заработной платы и двенадцать месячных граф. Альбомная ориентация — иначе
 * 18 граф не помещаются. CSV — машиночитаемый срез для кадровой программы и
 * для проверки доступности работников при постановке задач.
 */

export interface VacationScheduleExportContext {
  schedule: VacationSchedule;
  organizationName?: string;
  organizationHeadName?: string;
}

const formatIso = (value: string | undefined): string => {
  if (!value) return "";
  const [year, month, day] = value.split("-");

  return day && month && year ? `${day}.${month}.${year}` : value;
};

/** Содержимое месячной графы формы Т-2: вид отпуска, дни, дата начала */
const monthCellText = (row: VacationRow, month: number): string =>
  (row.parts ?? [])
    .filter((part) => partMonth(part) === month)
    .map(
      (part) =>
        `${vacationLeaveKindShortLabels[part.kind]}, ${part.daysCount} дн., ${formatIso(
          part.startDate,
        )}`,
    )
    .join("; ");

const T2_HEADERS = [
  "№ п/п",
  "Фамилия, Имя, Отчество",
  "Должность",
  "Дата принятия на работу",
  "Отпуск без сохранения заработной платы, кал. дней",
  ...MONTH_LABELS,
  "Примечание",
];

const rowCells = (row: VacationRow, index: number): string[] => [
  String(index + 1),
  row.employeeName,
  row.position ?? "",
  formatIso(row.adoptionDate),
  rowUnpaidDays(row) ? String(rowUnpaidDays(row)) : "",
  ...MONTH_LABELS.map((_, monthIndex) => monthCellText(row, monthIndex + 1)),
  row.note ?? "",
];

// ─── CSV ─────────────────────────────────────────────────────────────────

const csvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const buildVacationScheduleCsv = (
  context: VacationScheduleExportContext,
): string => {
  const { schedule, organizationName } = context;

  const lines: string[] = [
    `График отпусков на ${schedule.year} год${
      organizationName ? `, ${organizationName}` : ""
    }`,
    "",
    T2_HEADERS.map(csvCell).join(";"),
  ];

  (schedule.rows ?? []).forEach((row, index) => {
    lines.push(rowCells(row, index).map(csvCell).join(";"));
  });

  const summary = vacationSummary(schedule);

  lines.push("");
  lines.push(
    csvCell(
      `Итого: работников ${summary.employees}, оплачиваемых дней ${summary.annualDays}, без сохранения ${summary.unpaidDays}`,
    ),
  );

  return `\uFEFF${lines.join("\r\n")}`;
};

export const downloadVacationScheduleCsv = (
  context: VacationScheduleExportContext,
): void => {
  const blob = new Blob([buildVacationScheduleCsv(context)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `vacation-schedule-${context.schedule.year}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ─── DOCX (форма Т-2) ────────────────────────────────────────────────────

export const exportVacationScheduleToDocx = async (
  context: VacationScheduleExportContext,
): Promise<void> => {
  const { schedule, organizationName, organizationHeadName } = context;

  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    PageOrientation,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  const border = { style: BorderStyle.SINGLE, size: 4, color: "8A8A8A" };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const cell = (
    text: string,
    options: { bold?: boolean; size?: number; width?: number } = {},
  ) =>
    new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      ...(options.width
        ? { width: { size: options.width, type: WidthType.PERCENTAGE } }
        : {}),
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: options.bold,
              size: options.size ?? 16,
              font: "Times New Roman",
            }),
          ],
        }),
      ],
    });

  const paragraph = (
    text: string,
    options: { bold?: boolean; size?: number; center?: boolean } = {},
  ) =>
    new Paragraph({
      ...(options.center ? { alignment: AlignmentType.CENTER } : {}),
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text,
          bold: options.bold,
          size: options.size ?? 20,
          font: "Times New Roman",
        }),
      ],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: T2_HEADERS.map((head) => cell(head, { bold: true, size: 11 })),
  });

  const dataRows = (schedule.rows ?? []).map(
    (row, index) =>
      new TableRow({
        children: rowCells(row, index).map((value) =>
          cell(value, { size: 11 }),
        ),
      }),
  );

  const summary = vacationSummary(schedule);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838,
              height: 11906,
            },
            margin: { top: 600, bottom: 600, left: 600, right: 600 },
          },
        },
        children: [
          paragraph(organizationName ?? "", { bold: true, size: 22 }),
          paragraph("График отпусков", { bold: true, center: true, size: 28 }),
          paragraph(
            `на ${schedule.year} год${
              schedule.orderNumber
                ? ` — утверждён приказом № ${schedule.orderNumber} от ${formatIso(
                    schedule.orderDate,
                  )}`
                : " — черновик"
            }`,
            { center: true, size: 20 },
          ),
          paragraph(
            `Работников в графике: ${summary.employees}. Оплачиваемых дней отпуска: ${summary.annualDays}. Дней без сохранения заработной платы: ${summary.unpaidDays}.`,
            { size: 18 },
          ),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders,
            rows: [headerRow, ...dataRows],
          }),
          paragraph(
            "Форма по ОКУД 0301016 (унифицированная форма N Т-2, Постановление Госкомстата России от 05.01.2004 N 1). График составлен в соответствии со ст. 123 ТК РФ.",
            { size: 16 },
          ),
          paragraph("", { size: 16 }),
          paragraph(
            `${organizationHeadName ? `Руководитель ${organizationHeadName}` : "Руководитель организации"}  _______________`,
            { size: 20 },
          ),
          paragraph(
            `Дата утверждения: ${formatIso(schedule.approvedAt) || "___.___.______"}`,
            { size: 20 },
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `vacation-schedule-${schedule.year}.docx`;
  link.click();
  URL.revokeObjectURL(url);
};

// ─── Текстовое предупреждение работнику (ч. 3 ст. 123 ТК РФ) ──────────────

/**
 * Готовый текст предупреждения о начале отпуска: график бесполезен, если с
 * ним не ознакомили работника под роспись не позднее чем за две недели.
 */
export const buildVacationNoticeText = (
  context: VacationScheduleExportContext,
  row: VacationRow,
  part: VacationPart,
): string =>
  [
    `Уважаемый(ая) ${initialsName(row.employeeName)}!`,
    "",
    `Уведомляем Вас о том, что согласно графику отпусков на ${context.schedule.year} год Вам предоставляется отпуск вида «${
      vacationLeaveKindShortLabels[part.kind]
    }» продолжительностью ${part.daysCount} календарных дней с ${formatIso(
      part.startDate,
    )} по ${formatIso(partEndDate(part))} включительно${
      row.position ? ` (должность: ${row.position})` : ""
    }.`,
    "",
    `Предупреждение вручено «___» ____________ 20___ г.`,
    `Работник: _______________ / ${row.employeeName} /`,
  ].join("\n");
