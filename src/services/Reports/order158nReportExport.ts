import type {
  BaseOrganization,
  OrganizationCustomer,
} from "../Organization/organization.schema";
import { contractServiceFunctionParagraph } from "../../components/ContractService/contractService.config";
import {
  ORDER_158N_PERIOD_TYPE_LABELS,
  ORDER_158N_REPORT_STATUS_LABELS,
  type Order158nCheckStatus,
  type Order158nReport,
} from "./order158nReport.schema";

const formatIsoToRu = (iso?: string): string => {
  if (!iso) return "—";
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
};

const formatMoneyRu = (value: number): string =>
  `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ₽`;

const CHECK_STATUS_LABELS: Record<Order158nCheckStatus, string> = {
  pass: "Соответствует",
  warning: "Требует внимания",
  fail: "Нарушение",
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const buildFileName = (report: Order158nReport, ext: "pdf" | "docx"): string => {
  const safeNum = (report.reportNumber || "158н").replace(
    /[^\wа-яА-ЯёЁ-]+/g,
    "_",
  );
  return `Отчёт_КС_158н_${safeNum}_${report.year}.${ext}`;
};

const extractOrgDetails = (
  report: Order158nReport,
  organization?: BaseOrganization | OrganizationCustomer | null,
) => {
  const fullName =
    organization?.fullName ||
    report.organizationFullName ||
    "Организация-заказчик";
  const shortName =
    organization?.shortName || report.organizationShortName || "";
  const registryNumber =
    organization && "registryNumber" in organization
      ? organization.registryNumber
      : undefined;
  const identifiers = [
    organization?.inn || report.organizationInn
      ? `ИНН ${organization?.inn || report.organizationInn}`
      : "",
    organization?.kpp || report.organizationKpp
      ? `КПП ${organization?.kpp || report.organizationKpp}`
      : "",
    organization?.ogrn || report.organizationOgrn
      ? `ОГРН ${organization?.ogrn || report.organizationOgrn}`
      : "",
    organization?.okpo ? `ОКПО ${organization.okpo}` : "",
    registryNumber ? `Реестровый № в ЕИС ${registryNumber}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const address =
    organization?.legalAddress || report.organizationAddress || "";
  const contacts = [
    organization?.phone ? `Тел.: ${organization.phone}` : "",
    organization?.email ? `E-mail: ${organization.email}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return { fullName, shortName, identifiers, address, contacts };
};

/**
 * Экспорт отчёта о деятельности контрактной службы по Приказу Минфина № 158н
 * в PDF (.pdf) со встроенным кириллическим шрифтом Roboto.
 */
export async function exportOrder158nReportToPdf(
  report: Order158nReport,
  organization?: BaseOrganization | OrganizationCustomer | null,
): Promise<string> {
  const [pdfMakeMod, pdfFontsMod] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  type PdfMakeRuntime = {
    addVirtualFileSystem?: (vfs: Record<string, string>) => void;
    vfs?: Record<string, string>;
    createPdf: (docDefinition: unknown) => {
      download: (filename?: string) => void;
      getBlob?: () => Promise<Blob>;
    };
  };

  const pdfMake = ((pdfMakeMod as { default?: PdfMakeRuntime }).default ??
    pdfMakeMod) as PdfMakeRuntime;
  const pdfFonts = ((pdfFontsMod as { default?: Record<string, string> })
    .default ?? pdfFontsMod) as Record<string, string>;

  if (typeof pdfMake.addVirtualFileSystem === "function") {
    pdfMake.addVirtualFileSystem(pdfFonts);
  } else {
    pdfMake.vfs = pdfFonts;
  }

  const org = extractOrgDetails(report, organization);

  const passportRows: [string, string][] = [
    [
      "Заказчик",
      `${org.fullName}${org.shortName && org.shortName !== org.fullName ? ` (${org.shortName})` : ""}`,
    ],
    ...(org.identifiers
      ? [["Реквизиты (ИНН / КПП / ОГРН / ЕИС)", org.identifiers] as [string, string]]
      : []),
    ...(org.address ? [["Место нахождения", org.address] as [string, string]] : []),
    ...(org.contacts ? [["Контактные данные", org.contacts] as [string, string]] : []),
    [
      "Отчётный период и вид отчёта",
      `${report.periodLabel} (${ORDER_158N_PERIOD_TYPE_LABELS[report.periodType]})`,
    ],
    [
      "Номер, дата и статус отчёта",
      `№ ${report.reportNumber} от ${formatIsoToRu(report.reportDate)} · Статус: ${ORDER_158N_REPORT_STATUS_LABELS[report.status]}`,
    ],
    [
      "Способ создания КС (п. 2.1 № 158н)",
      `${report.creationMethodLabel}${report.structuralUnitName ? ` («${report.structuralUnitName}»)` : ""}`,
    ],
    [
      "Приказ о создании / КУ",
      report.orderNumber
        ? `№ ${report.orderNumber} от ${formatIsoToRu(report.orderDate)}`
        : "Не указан",
    ],
    [
      "Руководитель КС / КУ (п. 2.3)",
      report.headName
        ? `${report.headName}${report.headPosition ? ` (${report.headPosition})` : ""}${report.headOrderNumber ? `, приказ № ${report.headOrderNumber} от ${formatIsoToRu(report.headOrderDate)}` : ""}`
        : "Не назначен",
    ],
    [
      "Штатная численность / СГОЗ по ПГ",
      `${report.headcount} чел. · Годовой объём закупок по ПГ: ${formatMoneyRu(report.annualPlannedVolume)}`,
    ],
  ];

  const kpiSummaryRows: [string, string][] = [
    [
      "Индекс соответствия Приказу № 158н",
      `${report.complianceScorePercent}% (${CHECK_STATUS_LABELS[report.complianceStatus]})`,
    ],
    [
      "Планирование (п. 3.1)",
      `Планов-графиков: ${report.plansCount} (опубл.: ${report.plansPublishedCount}), позиций: ${report.planPositionsCount}, объём: ${formatMoneyRu(report.plansTotalAmount)}`,
    ],
    [
      "Потребности, ООЗ и НМЦК (п. 3.2)",
      `СЗ: ${report.notesTotalCount} (согл.: ${report.notesApprovedCount}, с НМЦК: ${report.notesWithNmckCount} на ${formatMoneyRu(report.notesNmckTotalAmount)}); ООЗ: ${report.oozTotalCount} (без нарушений 158н: ${report.oozCompliantCount}); Дефектовки: ${report.defectListsCount}`,
    ],
    [
      "Определение поставщиков (п. 3.3)",
      `Закупок: ${report.procurementsCount} (извещ.: ${report.noticesPublishedCount}), оценок ПП № 2604: ${report.bidEvaluationsCount}, доля СМП: ${report.smnpSharePercent}%`,
    ],
    [
      "Контрактация и исполнение (п. 3.4–3.5)",
      `Проектов: ${report.contractProjectsCount}; Контрактов в реестре: ${report.contractsTotalCount} на ${formatMoneyRu(report.contractsTotalAmount)} (оплачено ${formatMoneyRu(report.contractsPaidAmount)}); Исполнено: ${report.contractsCompletedCount}, просрочено: ${report.contractsOverdueCount}; Неустойки: ${report.penaltiesCount} (${formatMoneyRu(report.penaltiesAmount)})`,
    ],
    [
      "Задачи, сроки и образование (п. 2.5)",
      `Задач КС: ${report.tasksTotalCount} (выполнено: ${report.tasksCompletedCount}, просрочено: ${report.tasksOverdueCount}, своевременность: ${report.tasksOnTimeRate}%); Образование п. 2.5 подтверждено: ${report.educationCompliantCount} из ${report.educationTotalChecked} чел.; Подписаний ЭП: ${report.edsSignedCount} (отказов: ${report.edsRejectedCount})`,
    ],
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [32, 32, 32, 40] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      lineHeight: 1.22,
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `Отчёт КС по Приказу Минфина № 158н · № ${report.reportNumber} от ${formatIsoToRu(report.reportDate)}`,
          fontSize: 7.5,
          color: "#64748B",
        },
        {
          text: `Стр. ${currentPage} из ${pageCount}`,
          fontSize: 7.5,
          color: "#64748B",
          alignment: "right",
        },
      ],
      margin: [32, 8, 32, 0],
    }),
    content: [
      {
        columns: [
          {
            width: "54%",
            stack: [
              { text: org.fullName, bold: true, fontSize: 9 },
              ...(org.identifiers
                ? [{ text: org.identifiers, fontSize: 7.5, color: "#475569", margin: [0, 2, 0, 0] }]
                : []),
              ...(org.address
                ? [{ text: org.address, fontSize: 7.5, color: "#475569", margin: [0, 1, 0, 0] }]
                : []),
            ],
          },
          {
            width: "46%",
            stack: [
              { text: "УТВЕРЖДАЮ", bold: true, fontSize: 9, alignment: "right" },
              {
                text: "Руководитель заказчика / уполномоченное лицо",
                fontSize: 8,
                alignment: "right",
                margin: [0, 2, 0, 0],
              },
              {
                text: `________________ / ${report.approvedByName || "____________________"} /`,
                fontSize: 8,
                alignment: "right",
                margin: [0, 9, 0, 0],
              },
              {
                text: "«___» ______________ 202__ г.",
                fontSize: 8,
                alignment: "right",
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },
      {
        text: "ОТЧЁТ О ДЕЯТЕЛЬНОСТИ КОНТРАКТНОЙ СЛУЖБЫ",
        bold: true,
        fontSize: 12.5,
        alignment: "center",
        margin: [0, 0, 0, 3] as [number, number, number, number],
      },
      {
        text: "сформирован в соответствии с Типовым положением (регламентом) о контрактной службе (Приказ Минфина России от 31.07.2020 № 158н)",
        fontSize: 8.5,
        italics: true,
        color: "#475569",
        alignment: "center",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: "1. Общие сведения о заказчике и организации контрактной службы",
        bold: true,
        fontSize: 10.5,
        margin: [0, 2, 0, 4] as [number, number, number, number],
      },
      {
        table: {
          widths: ["35%", "65%"],
          body: passportRows.map(([label, val]) => [
            { text: label, bold: true, fontSize: 8, fillColor: "#F5F7FA" },
            { text: val, fontSize: 8 },
          ]),
        },
        layout: {
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: "2. Сводные показатели деятельности за отчётный период",
        bold: true,
        fontSize: 10.5,
        margin: [0, 2, 0, 4] as [number, number, number, number],
      },
      {
        table: {
          widths: ["35%", "65%"],
          body: kpiSummaryRows.map(([label, val]) => [
            { text: label, bold: true, fontSize: 8, fillColor: "#F0FDF4" },
            { text: val, fontSize: 8 },
          ]),
        },
        layout: {
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: "3. Контроль соответствия требованиям Приказа Минфина № 158н",
        bold: true,
        fontSize: 10.5,
        margin: [0, 2, 0, 4] as [number, number, number, number],
      },
      {
        table: {
          headerRows: 1,
          widths: [62, 130, 74, "*"],
          body: [
            [
              { text: "Пункт", bold: true, fontSize: 8, fillColor: "#EEF2F6" },
              { text: "Требование № 158н", bold: true, fontSize: 8, fillColor: "#EEF2F6" },
              { text: "Статус", bold: true, fontSize: 8, fillColor: "#EEF2F6" },
              { text: "Фактические сведения по данным системы", bold: true, fontSize: 8, fillColor: "#EEF2F6" },
            ],
            ...report.complianceChecks.map((check) => [
              { text: check.clause, bold: true, fontSize: 8 },
              { text: check.title, fontSize: 8 },
              {
                text: CHECK_STATUS_LABELS[check.status],
                bold: true,
                fontSize: 8,
                color:
                  check.status === "pass"
                    ? "#166534"
                    : check.status === "warning"
                      ? "#B45309"
                      : "#B91C1C",
              },
              { text: check.detail, fontSize: 8 },
            ]),
          ],
        },
        layout: {
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: "4. Исполнение функций и полномочий Раздела III Приказа № 158н",
        bold: true,
        fontSize: 10.5,
        margin: [0, 2, 0, 4] as [number, number, number, number],
      },
      {
        table: {
          headerRows: 1,
          widths: [40, 118, 44, 62, "*"],
          body: [
            [
              { text: "Пункт", bold: true, fontSize: 7.5, fillColor: "#EEF2F6" },
              { text: "Функция КС", bold: true, fontSize: 7.5, fillColor: "#EEF2F6" },
              { text: "Назнач.", bold: true, fontSize: 7.5, alignment: "right", fillColor: "#EEF2F6" },
              { text: "Задачи (вып/пр.)", bold: true, fontSize: 7.5, alignment: "right", fillColor: "#EEF2F6" },
              { text: "Результаты деятельности", bold: true, fontSize: 7.5, fillColor: "#EEF2F6" },
            ],
            ...report.functionActivities.map((fn) => [
              { text: fn.paragraph, bold: true, fontSize: 8 },
              { text: fn.title, fontSize: 8 },
              { text: `${fn.assignedEmployeesCount} чел.`, fontSize: 8, alignment: "right" },
              {
                text: `${fn.tasksTotal} (${fn.tasksCompleted} / ${fn.tasksOverdue})`,
                fontSize: 8,
                alignment: "right",
              },
              {
                text: `${fn.keyMetricLabel}: ${fn.keyMetricValue}\n${fn.subIndicators.map((s) => `• ${s.label}: ${s.value}`).join("\n")}`,
                fontSize: 7.5,
              },
            ]),
          ],
        },
        layout: {
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: "5. Персональный состав, образование (п. 2.5) и эффективность работы сотрудников КС",
        bold: true,
        fontSize: 10.5,
        margin: [0, 2, 0, 4] as [number, number, number, number],
      },
      report.employeePerformances.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ["*", 66, 95, 58, 56],
              body: [
                [
                  { text: "ФИО и роль в КС", bold: true, fontSize: 7.5, fillColor: "#EEF2F6" },
                  { text: "Функции (III)", bold: true, fontSize: 7.5, fillColor: "#EEF2F6" },
                  { text: "Образование (п. 2.5)", bold: true, fontSize: 7.5, fillColor: "#EEF2F6" },
                  { text: "Задачи / Срок", bold: true, fontSize: 7.5, alignment: "right", fillColor: "#EEF2F6" },
                  { text: "Оценка / KPI", bold: true, fontSize: 7.5, alignment: "right", fillColor: "#EEF2F6" },
                ],
                ...report.employeePerformances.map((emp) => [
                  {
                    text: `${emp.fullName}\n${emp.role}${emp.leaveDaysCount > 0 ? ` · Отсутств.: ${emp.leaveDaysCount} раб. дн.` : ""}`,
                    fontSize: 7.5,
                  },
                  {
                    text:
                      emp.functions.length > 0
                        ? emp.functions
                            .map((f) => contractServiceFunctionParagraph(f))
                            .join(", ")
                        : "Не наделены",
                    fontSize: 7.5,
                  },
                  {
                    text: `${emp.educationSummary}${emp.educationWarning ? `\n(!) ${emp.educationWarning}` : ""}`,
                    fontSize: 7.5,
                    color: emp.dpoExpired
                      ? "#B91C1C"
                      : !emp.hasProfileEducation || emp.dpoExpiringSoon
                        ? "#B45309"
                        : "#0F172A",
                  },
                  {
                    text: `${emp.tasksCompleted}/${emp.tasksTotal} (${emp.onTimeRate}%)${emp.tasksOverdue > 0 ? `\nпроср.: ${emp.tasksOverdue}` : ""}`,
                    fontSize: 7.5,
                    alignment: "right",
                  },
                  {
                    text:
                      emp.averageScore !== null && emp.averageScore !== undefined
                        ? `${emp.averageScore} б.\n(${emp.salaryImpactText})`
                        : "Нет оценок",
                    fontSize: 7.5,
                    alignment: "right",
                  },
                ]),
              ],
            },
            layout: {
              hLineColor: () => "#CBD5E1",
              vLineColor: () => "#CBD5E1",
            },
            margin: [0, 0, 0, 10] as [number, number, number, number],
          }
        : {
            text: "Сотрудники контрактной службы в составе не зарегистрированы.",
            fontSize: 8.5,
            italics: true,
            margin: [0, 0, 0, 10] as [number, number, number, number],
          },
      {
        text: "6. Выводы, замечания и рекомендации по итогам периода",
        bold: true,
        fontSize: 10.5,
        margin: [0, 2, 0, 4] as [number, number, number, number],
      },
      ...(report.conclusionNote
        ? [
            {
              text: report.conclusionNote,
              fontSize: 8.5,
              margin: [0, 0, 0, 5] as [number, number, number, number],
            },
          ]
        : []),
      {
        ul: report.recommendations.map((rec) => ({ text: rec, fontSize: 8.5 })),
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },
      {
        table: {
          headerRows: 1,
          widths: ["38%", "34%", "28%"],
          body: [
            [
              { text: "Должность / Роль", bold: true, fontSize: 8.5, fillColor: "#F5F7FA" },
              { text: "ФИО", bold: true, fontSize: 8.5, fillColor: "#F5F7FA" },
              { text: "Подпись / Дата", bold: true, fontSize: 8.5, fillColor: "#F5F7FA" },
            ],
            [
              { text: "Руководитель контрактной службы / Контрактный управляющий", fontSize: 8.5 },
              { text: report.headName || report.preparedByName || "____________________", fontSize: 8.5 },
              { text: `_____________ / ${formatIsoToRu(report.reportDate)}`, fontSize: 8.5 },
            ],
            ...(report.preparedByName && report.preparedByName !== report.headName
              ? [
                  [
                    { text: "Отчёт сформировал (исполнитель)", fontSize: 8.5 },
                    { text: report.preparedByName, fontSize: 8.5 },
                    { text: `_____________ / ${formatIsoToRu(report.reportDate)}`, fontSize: 8.5 },
                  ],
                ]
              : []),
          ],
        },
        layout: {
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
        },
      },
    ],
  };

  const fileName = buildFileName(report, "pdf");
  const pdfDoc = pdfMake.createPdf(docDefinition);
  if (typeof pdfDoc.getBlob === "function") {
    const blob = await pdfDoc.getBlob();
    triggerBlobDownload(blob, fileName);
  } else {
    pdfDoc.download(fileName);
  }
  return fileName;
}

/**
 * Экспорт отчёта о деятельности контрактной службы по Приказу Минфина № 158н
 * в Microsoft Word (.docx).
 */
export async function exportOrder158nReportToDocx(
  report: Order158nReport,
  organization?: BaseOrganization | OrganizationCustomer | null,
): Promise<string> {
  const {
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
  } = await import("docx");

  const org = extractOrgDetails(report, organization);
  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "CBD5E1",
  };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const makeCell = (text: string, bold = false, size = 18) =>
    new TableCell({
      margins: { top: 70, bottom: 70, left: 80, right: 80 },
      children: text.split("\n").map(
        (line) =>
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold,
                size,
                font: "Times New Roman",
              }),
            ],
          }),
      ),
    });

  const makeHeading = (text: string) =>
    new Paragraph({
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({
          text,
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: org.fullName,
                bold: true,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          ...(org.identifiers
            ? [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: org.identifiers,
                      size: 18,
                      color: "475569",
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 80, after: 140 },
            children: [
              new TextRun({
                text: "УТВЕРЖДАЮ\nРуководитель заказчика / уполномоченное лицо\n________________ / ____________________ /\n«___» ______________ 202__ г.",
                bold: false,
                size: 19,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "ОТЧЁТ О ДЕЯТЕЛЬНОСТИ КОНТРАКТНОЙ СЛУЖБЫ",
                bold: true,
                size: 26,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `по Приказу Минфина России от 31.07.2020 № 158н · № ${report.reportNumber} от ${formatIsoToRu(report.reportDate)} · Период: ${report.periodLabel}`,
                italics: true,
                size: 19,
                font: "Times New Roman",
              }),
            ],
          }),
          makeHeading("1. Общие сведения и соответствие Приказу № 158н"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders,
            rows: [
              new TableRow({
                tableHeader: true,
                children: ["Пункт", "Требование № 158н", "Статус", "Сведения"].map(
                  (h) => makeCell(h, true),
                ),
              }),
              ...report.complianceChecks.map(
                (c) =>
                  new TableRow({
                    children: [
                      makeCell(c.clause, true),
                      makeCell(c.title),
                      makeCell(CHECK_STATUS_LABELS[c.status], true),
                      makeCell(c.detail),
                    ],
                  }),
              ),
            ],
          }),
          makeHeading("2. Исполнение функций Раздела III Приказа № 158н"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders,
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  "Пункт",
                  "Функция",
                  "Сотрудников",
                  "Задач (вып/проср)",
                  "Ключевые показатели",
                ].map((h) => makeCell(h, true)),
              }),
              ...report.functionActivities.map(
                (fn) =>
                  new TableRow({
                    children: [
                      makeCell(fn.paragraph, true),
                      makeCell(fn.title),
                      makeCell(`${fn.assignedEmployeesCount} чел.`),
                      makeCell(
                        `${fn.tasksTotal} (${fn.tasksCompleted}/${fn.tasksOverdue})`,
                      ),
                      makeCell(
                        `${fn.keyMetricLabel}: ${fn.keyMetricValue}\n${fn.subIndicators.map((s) => `${s.label}: ${s.value}`).join("\n")}`,
                      ),
                    ],
                  }),
              ),
            ],
          }),
          makeHeading(
            "3. Персонал контрактной службы, образование (п. 2.5) и KPI",
          ),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders,
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  "ФИО",
                  "Роль",
                  "Образование (п. 2.5)",
                  "Задачи / В срок",
                  "Средний балл / KPI",
                ].map((h) => makeCell(h, true)),
              }),
              ...(report.employeePerformances.length > 0
                ? report.employeePerformances.map(
                    (emp) =>
                      new TableRow({
                        children: [
                          makeCell(emp.fullName, true),
                          makeCell(emp.role),
                          makeCell(emp.educationSummary),
                          makeCell(
                            `${emp.tasksCompleted}/${emp.tasksTotal} (${emp.onTimeRate}%)`,
                          ),
                          makeCell(
                            emp.averageScore !== null &&
                              emp.averageScore !== undefined
                              ? `${emp.averageScore} (${emp.salaryImpactText})`
                              : "Нет оценок",
                          ),
                        ],
                      }),
                  )
                : [
                    new TableRow({
                      children: [
                        makeCell("Сотрудники КС не назначены"),
                        makeCell("—"),
                        makeCell("—"),
                        makeCell("—"),
                        makeCell("—"),
                      ],
                    }),
                  ]),
            ],
          }),
          makeHeading("4. Выводы и рекомендации"),
          ...(report.conclusionNote
            ? [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: report.conclusionNote,
                      size: 20,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ]
            : []),
          ...report.recommendations.map(
            (rec) =>
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `• ${rec}`,
                    size: 19,
                    font: "Times New Roman",
                  }),
                ],
              }),
          ),
          new Paragraph({
            spacing: { before: 180 },
            children: [
              new TextRun({
                text: `Руководитель контрактной службы / КУ: _____________ / ${report.headName || report.preparedByName || "________________"} /   Дата: ${formatIsoToRu(report.reportDate)}`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const fileName = buildFileName(report, "docx");
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, fileName);
  return fileName;
}
