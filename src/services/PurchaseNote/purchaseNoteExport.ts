import { formatDeliveryAddress } from "../AddressRef/addressRef.schema";
import {
  ORGANIZATION_BUDGET_LEVEL_LABELS,
  type BaseOrganization,
  type BudgetPart13Art44Requisites,
  type OrganizationSecurityAccount,
} from "../Organization/organization.schema";
import type {
  PurchasePlan,
  PurchasePlanPosition,
} from "../PurchasePlan/purchasePlan.schema";
import {
  getPurchaseNoteStatusMeta,
  hasSmpSubcontractingRequirement,
  type PurchaseNote,
  type PurchaseNoteObjectItem,
} from "./purchaseNote.schema";
import {
  NATIONAL_REGIME_OPTIONS,
  PLACING_WAYS_CONTEST,
} from "../../components/NoticeInfoForm/noticeInfo.config";

export interface PurchaseNoteExportContext {
  note: PurchaseNote;
  organization?: BaseOrganization | null;
  plan?: PurchasePlan | null;
  position?: PurchasePlanPosition | null;
}

interface KeyValueRow {
  label: string;
  value: string;
}

interface PurchaseNoteExportModel {
  fileBaseName: string;
  organizationTitle: string;
  organizationDetails: string;
  documentTitle: string;
  documentSubtitle: string;
  statusLabel: string;
  approvalLine: string;
  generalRows: KeyValueRow[];
  items: PurchaseNoteObjectItem[];
  deliveryRows: KeyValueRow[];
  requirementBullets: string[];
  warrantyAndSecurityRows: KeyValueRow[];
  signatureRows: { role: string; person: string; signHint: string }[];
}

const formatIsoToRu = (iso?: string): string => {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}.${match[2]}.${match[1]}`;
};

const formatMoneyText = (raw?: string | number): string => {
  if (raw === undefined || raw === null || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} ₽`;
};

const placingWayLabel = (code?: string): string => {
  if (!code) return "—";
  const found = PLACING_WAYS_CONTEST.find((w) => w.code === code);
  return found ? `${found.label} (${found.code})` : code;
};

const nationalRegimeLabel = (id?: string): string => {
  const found = NATIONAL_REGIME_OPTIONS.find((item) => item.id === id);
  return found?.label ?? "Не установлено";
};

const formatSecurityAccount = (acc?: OrganizationSecurityAccount): string => {
  if (!acc) return "не указаны";
  const parts = [
    acc.recipientName && `Получатель: ${acc.recipientName}`,
    acc.recipientInn && `ИНН: ${acc.recipientInn}`,
    acc.recipientKpp && `КПП: ${acc.recipientKpp}`,
    acc.settlementAccount && `Р/с (казначейский счёт): ${acc.settlementAccount}`,
    acc.personalAccount && `Лицевой счёт: ${acc.personalAccount}`,
    acc.bik && `БИК: ${acc.bik}`,
    acc.bankName && `Банк: ${acc.bankName}`,
    acc.correspondentAccount && `Кор/с (ЕКС): ${acc.correspondentAccount}`,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("; ") : "не указаны";
};

const formatBudgetPart13Account = (
  acc?: BudgetPart13Art44Requisites,
): string => {
  if (!acc) return "не указаны";
  const parts = [
    acc.recipientName && `Получатель: ${acc.recipientName}`,
    acc.recipientInn && `ИНН получателя: ${acc.recipientInn}`,
    acc.recipientKpp && `КПП получателя: ${acc.recipientKpp}`,
    acc.incomeKbk && `КБК доходов: ${acc.incomeKbk}`,
    acc.oktmo && `ОКТМО: ${acc.oktmo}`,
    acc.singleTreasuryAccount && `Номер ЕКС: ${acc.singleTreasuryAccount}`,
    acc.treasuryAccount && `Номер казначейского счёта: ${acc.treasuryAccount}`,
    acc.bikTofk && `БИК ТОФК: ${acc.bikTofk}`,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("; ") : "не указаны";
};

const buildDeliveryText = (note: PurchaseNote): string => {
  if (note.deliveryPlaces && note.deliveryPlaces.length > 0) {
    const formatted = note.deliveryPlaces
      .map((place, idx) => {
        const line = formatDeliveryAddress(place);
        return line
          ? `${note.deliveryPlaces!.length > 1 ? `${idx + 1}) ` : ""}${line}`
          : "";
      })
      .filter(Boolean);
    if (formatted.length > 0) return formatted.join("\n");
  }
  return note.deliveryPlace?.trim() || "Не указано";
};

const sanitizeFilePart = (raw: string): string =>
  raw.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "SZ";

export const buildPurchaseNoteExportModel = ({
  note,
  organization,
  plan,
  position,
}: PurchaseNoteExportContext): PurchaseNoteExportModel => {
  const statusMeta = getPurchaseNoteStatusMeta(note.status);
  const noteNum = note.noteNumber || String(note.id ?? "б/н");
  const noteDateRu = formatIsoToRu(note.noteDate);

  const orgTitle =
    organization?.fullName ||
    organization?.shortName ||
    plan?.customer.fullName ||
    "Организация-заказчик";
  const orgReqs = [
    organization?.inn ? `ИНН ${organization.inn}` : "",
    organization?.kpp ? `КПП ${organization.kpp}` : "",
    organization?.ogrn ? `ОГРН ${organization.ogrn}` : "",
    organization?.legalAddress ? `Адрес: ${organization.legalAddress}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const planNumber = note.purchasePlanNumber || plan?.planNumber || "—";
  const posSerial =
    note.positionSerialNumber || String(position?.serialNumber ?? "") || "—";
  const posUnique =
    note.positionUniqueNumber || String(position?.uniqueNumber ?? "") || "—";
  const ikz = note.ikz || position?.identificationCode || "не сформирован";

  const budgetLevelText =
    note.budgetLevel ||
    (organization?.budgetLevel
      ? ORGANIZATION_BUDGET_LEVEL_LABELS[organization.budgetLevel]
      : "—");

  const kbkText = note.kbk || position?.kbk || "не указан в ПГ";
  const kbkEntries = position?.kbkEntries?.filter((e) => e.kbk) ?? [];
  const kbkYearlyParts: string[] = [];
  if (kbkEntries.length > 0) {
    for (const entry of kbkEntries) {
      kbkYearlyParts.push(
        `${entry.kbk}: всего ${formatMoneyText(entry.amountTotal)}, тек. год ${formatMoneyText(entry.amountCurrentYear)}, 1-й пл. ${formatMoneyText(entry.amountPlanPeriodFirstYear)}, 2-й пл. ${formatMoneyText(entry.amountPlanPeriodSecondYear)}, послед. ${formatMoneyText(entry.amountSubsequentYears)}`,
      );
    }
  } else if (position) {
    kbkYearlyParts.push(
      `${kbkText}: всего ${formatMoneyText(position.amountTotal)}, тек. год ${formatMoneyText(position.amountCurrentYear)}, 1-й пл. ${formatMoneyText(position.amountPlanPeriodFirstYear)}, 2-й пл. ${formatMoneyText(position.amountPlanPeriodSecondYear)}, послед. ${formatMoneyText(position.amountSubsequentYears)}`,
    );
  } else {
    kbkYearlyParts.push(kbkText);
  }
  const kbkBlock = [
    ...kbkYearlyParts,
    note.kbkDisagreement
      ? `[Запрос на изменение КБК: предлагаемый КБК ${note.kbkSuggested || "—"}; обоснование: ${note.kbkDisagreementComment || "не приведено"}${note.kbkDisagreementAuthor ? ` (${note.kbkDisagreementAuthor})` : ""}]`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const nmckFileParts: string[] = [];
  if (note.nmckFileName) {
    nmckFileParts.push(
      `Файл: ${note.nmckFileName}${note.nmckFileUpdatedAt ? ` (от ${formatIsoToRu(note.nmckFileUpdatedAt)})` : ""}`,
    );
  }
  if (note.nmckRequestStatus && note.nmckRequestStatus !== "none") {
    const reqLabel =
      note.nmckRequestStatus === "received"
        ? "Запрос на файл НМЦК выполнен (получен)"
        : "Направлен запрос на подготовку файла НМЦК";
    const meta = [
      note.nmckRequestAssignee && `исполнитель: ${note.nmckRequestAssignee}`,
      note.nmckRequestDate && `дата: ${formatIsoToRu(note.nmckRequestDate)}`,
      note.nmckRequestComment,
    ]
      .filter(Boolean)
      .join(", ");
    nmckFileParts.push(meta ? `${reqLabel} (${meta})` : reqLabel);
  }
  const nmckFileText =
    nmckFileParts.length > 0 ? nmckFileParts.join("\n") : "Не приложен";

  const treasuryText = note.requiresTreasurySupport
    ? note.treasurySupportType === "advance_only"
      ? "Да — казначейское сопровождение только аванса"
      : "Да — полное казначейское сопровождение"
    : "Нет";

  const advanceText = note.hasAdvance
    ? `Предусмотрен: ${note.advancePercent || "0"} %`
    : "Не предусмотрен";

  const approvalLineParts = [`Статус: ${statusMeta.label}`];
  if (note.approvalUpdatedBy) {
    approvalLineParts.push(`обновил: ${note.approvalUpdatedBy}`);
  }
  if (note.approvalUpdatedAt) {
    approvalLineParts.push(formatIsoToRu(note.approvalUpdatedAt));
  }
  if (note.approvalComment) {
    approvalLineParts.push(`комментарий: ${note.approvalComment}`);
  }

  const generalRows: KeyValueRow[] = [
    { label: "Основание (План-график)", value: `ПГ № ${planNumber}, позиция № ${posSerial} (уник. № ${posUnique})` },
    { label: "Идентификационный код закупки (ИКЗ)", value: ikz },
    { label: "Инициатор закупки", value: note.initiatorName || "—" },
    { label: "Предмет закупки", value: note.subject || "—" },
    { label: "Способ определения поставщика", value: placingWayLabel(note.placingWayCode) },
    { label: "Тип закупки", value: note.procurementType || "—" },
    {
      label: "Невозможно определить количество (ч. 24 ст. 22)",
      value: note.isIndeterminateVolume ? "Да (количество в объектах фиксируется = 1)" : "Нет",
    },
    { label: "НМЦК / максимальное значение цены контракта", value: formatMoneyText(note.initialMaxPrice) },
    { label: "Метод обоснования цены (ст. 22)", value: note.priceBasis || "—" },
    { label: "Файл и запрос на обоснование НМЦК", value: nmckFileText },
    { label: "КБК и разбивка по годам (из ПГ)", value: kbkBlock },
    { label: "Уровень бюджета", value: budgetLevelText },
    { label: "Источник финансирования", value: note.fundingSource || "—" },
    { label: "Авансирование", value: advanceText },
    { label: "Казначейское сопровождение", value: treasuryText },
    { label: "Банковское сопровождение", value: note.requiresBankSupport ? "Требуется" : "Не требуется" },
    ...(note.authorizedBodyName
      ? [{ label: "Уполномоченный орган", value: note.authorizedBodyName }]
      : []),
    ...(note.jointOrganizerName
      ? [{ label: "Организатор совместной закупки", value: note.jointOrganizerName }]
      : []),
  ];

  const items: PurchaseNoteObjectItem[] =
    note.items && note.items.length > 0
      ? note.items
      : [
          {
            id: "legacy-1",
            name: note.subject || position?.objectOfPurchase || "—",
            okpd2Code: note.okpd2Code || position?.okpd2Code || "",
            okpd2Name: note.okpd2Name || position?.okpd2Name || "",
            unit: note.unit || "—",
            quantity: note.isIndeterminateVolume ? "1" : note.quantity || "1",
            unitPrice: "",
            totalPrice: note.initialMaxPrice || "",
            nationalRegimeType: note.nationalRegimeType ?? "none",
            isSupplyDuringWorks: false,
          },
        ];

  const deliveryTermText =
    note.deliveryTermMode === "absolute"
      ? `Абсолютные даты: с ${formatIsoToRu(note.desiredStartDate)} по ${formatIsoToRu(note.desiredEndDate)}`
      : `Относительный срок: начало через ${note.deliveryStartOffsetDays ?? 0} дн. с даты заключения, исполнение ${note.executionTermDays ?? "—"} дн.`;

  const acceptanceTermText =
    note.acceptanceTermMode === "date"
      ? `Конкретной датой: ${formatIsoToRu(note.acceptanceDate)}`
      : `От события: ${note.acceptanceTermDays ?? "—"} раб. дн. (${note.acceptanceEventBase || "с даты поступления документа о приёмке в ЕИС"})`;

  const deliveryRows: KeyValueRow[] = [
    { label: "Срок поставки / исполнения", value: deliveryTermText },
    { label: "Срок приёмки", value: acceptanceTermText },
    { label: "Места поставки", value: buildDeliveryText(note) },
  ];

  const withDesc = (title: string, desc?: string) =>
    desc && desc.trim() ? `${title} — ${desc.trim()}` : title;

  const requirementBullets: string[] = [];
  if (note.advantageSmpPart3Art30) {
    requirementBullets.push(
      "Преимущество субъектам малого предпринимательства и СОНКО (только СМП, ч. 3 ст. 30 Закона № 44-ФЗ).",
    );
  }
  if (hasSmpSubcontractingRequirement(note)) {
    requirementBullets.push(
      `Требование о привлечении субподрядчиков/соисполнителей из числа СМП и СОНКО (ч. 5 ст. 30, ПП РФ № 1466): ${note.smpRequiredPercent ?? "не указано"} %.`,
    );
  }
  if (note.requirementsPart1_1Art31) {
    requirementBullets.push(
      "Требования к участникам закупок в соответствии с ч. 1.1 ст. 31 Закона № 44-ФЗ (отсутствие в реестре недобросовестных поставщиков).",
    );
  }
  if (note.pp1482ProductionFacilities) {
    requirementBullets.push(
      withDesc(
        "Наличие на праве собственности или ином законном основании производственных мощностей и технологического оборудования (п. 1 ПП РФ от 25.12.2014 № 1482).",
        note.pp1482ProductionFacilitiesText,
      ),
    );
  }
  if (note.pp1482FinancialStability) {
    requirementBullets.push(
      withDesc(
        "Финансовая устойчивость и платежеспособность участника (п. 1 ПП РФ от 25.12.2014 № 1482).",
        note.pp1482FinancialStabilityText,
      ),
    );
  }
  if (note.pp1482Specialists) {
    requirementBullets.push(
      withDesc(
        "Наличие квалифицированных специалистов с профессиональным образованием, заключивших трудовые договоры (п. 1 ПП РФ от 25.12.2014 № 1482).",
        note.pp1482SpecialistsText,
      ),
    );
  }
  if (note.requirementP1Part1Art31) {
    requirementBullets.push(
      withDesc(
        "Требование к участникам закупок в соответствии с п. 1 ч. 1 ст. 31 Закона № 44-ФЗ.",
        note.requirementP1Part1Art31Text,
      ),
    );
  }
  if (note.unifiedRequirementsPart1Art31 !== false) {
    requirementBullets.push(
      withDesc(
        "Единые требования к участникам закупок (ч. 1 ст. 31 Закона № 44-ФЗ).",
        note.unifiedRequirementsPart1Art31Text,
      ),
    );
  }
  if (note.additionalRequirementsPart2Art31) {
    const posList =
      note.pp2571Positions && note.pp2571Positions.length > 0
        ? ` (позиции ПП РФ № 2571: ${note.pp2571Positions.join("; ")})`
        : "";
    requirementBullets.push(
      withDesc(
        `Дополнительные требования к участникам по ч. 2 ст. 31 Закона № 44-ФЗ${posList}.`,
        note.additionalRequirementsPart2Art31Text,
      ),
    );
  }
  if (note.requirementsPart2_1Art31) {
    requirementBullets.push(
      withDesc(
        "Требования к участникам закупок в соответствии с ч. 2.1 ст. 31 Закона № 44-ФЗ.",
        note.requirementsPart2_1Art31Text,
      ),
    );
    if (note.pp2571Point4Requirement) {
      requirementBullets.push(
        withDesc(
          "Требования в соответствии с пунктом 4 ПП РФ от 29.12.2021 № 2571.",
          note.pp2571Point4RequirementText,
        ),
      );
    }
  }
  if (note.sanctionsRnpRequirement) {
    requirementBullets.push(
      "Требование об отсутствии в РНП информации, включенной в связи с отказом от исполнения контракта по причине введения в отношении заказчика санкций и (или) мер ограничительного характера.",
    );
  }
  if (requirementBullets.length === 0) {
    requirementBullets.push("Дополнительные требования и преимущества не установлены.");
  }

  const warrantyAndSecurityRows: KeyValueRow[] = [
    {
      label: "Гарантия качества товара, работы, услуги",
      value: note.requiresQualityWarranty
        ? [
            note.warrantyMaintenanceInfo &&
              `1) Требования к гарантийному обслуживанию: ${note.warrantyMaintenanceInfo}`,
            note.manufacturerWarrantyInfo &&
              `2) Требования к гарантии производителя: ${note.manufacturerWarrantyInfo}`,
            `3) Срок и объём предоставления гарантии: ${note.warrantyTermAndVolume || "—"}${note.warrantyTermMonths !== undefined ? ` (${note.warrantyTermMonths} мес.)` : ""}`,
          ]
            .filter(Boolean)
            .join("\n")
        : "Не требуется",
    },
    {
      label: "Обеспечение заявки",
      value: note.requiresApplicationSecurity
        ? [
            `Размер: ${note.applicationSecurityPercent || "—"} %`,
            note.applicationSecurityOrder &&
              `Порядок предоставления: ${note.applicationSecurityOrder}`,
            `Реквизиты счёта: ${formatSecurityAccount(note.applicationSecurityRequisites)}`,
            `Бюджетный счёт по ч. 13 ст. 44 44-ФЗ: ${formatBudgetPart13Account(note.applicationSecurityBudgetRequisites)}`,
          ]
            .filter(Boolean)
            .join("\n")
        : "Не требуется",
    },
    {
      label: "Обеспечение исполнения контракта",
      value: note.requiresContractSecurity
        ? [
            `Размер: ${note.contractSecurityPercent || "—"} %`,
            note.contractSecurityOrder &&
              `Порядок предоставления: ${note.contractSecurityOrder}`,
            `Реквизиты счёта: ${formatSecurityAccount(note.contractSecurityRequisites)}`,
          ]
            .filter(Boolean)
            .join("\n")
        : "Не требуется",
    },
    {
      label: "Обеспечение гарантийных обязательств",
      value:
        note.requiresQualityWarranty && note.requiresWarrantySecurity
          ? [
              `Размер: ${note.warrantySecurityPercent || "—"} %`,
              note.warrantySecurityOrder &&
                `Порядок предоставления: ${note.warrantySecurityOrder}`,
              `Реквизиты счёта: ${formatSecurityAccount(note.warrantySecurityRequisites)}`,
            ]
              .filter(Boolean)
              .join("\n")
          : "Не требуется",
    },
    {
      label: "Односторонний отказ (ст. 95)",
      value: note.allowUnilateralRefusalArt95 ? "Допустим" : "Не предусмотрен",
    },
    ...(note.otherRequirements?.trim()
      ? [{ label: "Дополнительные условия", value: note.otherRequirements.trim() }]
      : []),
    ...(note.comment?.trim()
      ? [{ label: "Примечание к СЗ", value: note.comment.trim() }]
      : []),
  ];

  const signatureRows = [
    {
      role: "Инициатор закупки",
      person: note.initiatorName || "____________________________",
      signHint: "____________________ / «___» _________ 202__ г.",
    },
    {
      role: "Контрактная служба / Контрактный управляющий",
      person:
        note.approvalUpdatedBy ||
        organization?.responsiblePerson ||
        "____________________________",
      signHint: "____________________ / «___» _________ 202__ г.",
    },
    {
      role: "Утверждаю (Руководитель заказчика / Уполномоченное лицо)",
      person: "____________________________",
      signHint: "____________________ / «___» _________ 202__ г.",
    },
  ];

  return {
    fileBaseName: `СЗ_№${sanitizeFilePart(noteNum)}_${sanitizeFilePart(note.noteDate || "без_даты")}`,
    organizationTitle: orgTitle,
    organizationDetails: orgReqs,
    documentTitle: `СЛУЖЕБНАЯ ЗАПИСКА (ПОТРЕБНОСТЬ В ЗАКУПКЕ) № ${noteNum}`,
    documentSubtitle: `от ${noteDateRu}`,
    statusLabel: statusMeta.label,
    approvalLine: approvalLineParts.join(" · "),
    generalRows,
    items,
    deliveryRows,
    requirementBullets,
    warrantyAndSecurityRows,
    signatureRows,
  };
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Экспорт сформированной служебной записки (потребности) в Microsoft Word (.docx)
 * для дальнейшего согласования и подписания вне системы.
 */
export const exportPurchaseNoteToDocx = async (
  context: PurchaseNoteExportContext,
): Promise<void> => {
  const model = buildPurchaseNoteExportModel(context);
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");

  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "B4C2BA",
  };
  const tableBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
    insideHorizontal: borderStyle,
    insideVertical: borderStyle,
  };

  const makeMultilineParagraphs = (text: string, bold = false) =>
    text.split("\n").map(
      (line) =>
        new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({
              text: line,
              bold,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
    );

  const makeKvTable = (rows: KeyValueRow[]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: rows.map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: makeMultilineParagraphs(row.label, true),
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: makeMultilineParagraphs(row.value, false),
              }),
            ],
          }),
      ),
    });

  const makeSectionTitle = (title: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 24,
          font: "Times New Roman",
        }),
      ],
    });

  const itemsHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      "№",
      "Наименование объекта закупки",
      "ОКПД2",
      "Ед. (ОКЕИ)",
      "Кол-во",
      "Цена, ₽",
      "Сумма, ₽",
      "Нац. режим",
    ].map(
      (head) =>
        new TableCell({
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: head,
                  bold: true,
                  size: 18,
                  font: "Times New Roman",
                }),
              ],
            }),
          ],
        }),
    ),
  });

  const itemDataRows = model.items.map(
    (item, idx) =>
      new TableRow({
        children: [
          String(idx + 1),
          `${item.name || "—"}${item.isSupplyDuringWorks ? " (поставка товара при работах)" : ""}`,
          [item.okpd2Code, item.okpd2Name].filter(Boolean).join(" — ") || "—",
          item.unit || "—",
          context.note.isIndeterminateVolume ? "1" : item.quantity || "1",
          item.unitPrice ? formatMoneyText(item.unitPrice) : "—",
          item.totalPrice ? formatMoneyText(item.totalPrice) : "—",
          nationalRegimeLabel(item.nationalRegimeType),
        ].map(
          (val) =>
            new TableCell({
              margins: { top: 70, bottom: 70, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: val,
                      size: 18,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
  );

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Роль", "Должность / ФИО", "Подпись / Дата"].map(
          (head) =>
            new TableCell({
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: head,
                      bold: true,
                      size: 19,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
      ...model.signatureRows.map(
        (sig) =>
          new TableRow({
            children: [sig.role, sig.person, sig.signHint].map(
              (val) =>
                new TableCell({
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: val,
                          size: 19,
                          font: "Times New Roman",
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: model.organizationTitle,
                bold: true,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          ...(model.organizationDetails
            ? [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 180 },
                  children: [
                    new TextRun({
                      text: model.organizationDetails,
                      size: 18,
                      color: "555555",
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: model.documentTitle,
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: model.documentSubtitle,
                size: 22,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: model.approvalLine,
                italics: true,
                size: 19,
                color: "444444",
                font: "Times New Roman",
              }),
            ],
          }),
          makeSectionTitle("1. Основные сведения и финансирование"),
          makeKvTable(model.generalRows),
          makeSectionTitle("2. Объекты закупки"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [itemsHeaderRow, ...itemDataRows],
          }),
          makeSectionTitle("3. Сроки и места поставки / приёмки"),
          makeKvTable(model.deliveryRows),
          makeSectionTitle("4. Преимущества и требования к участникам"),
          ...model.requirementBullets.map(
            (bullet) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: `• ${bullet}`,
                    size: 20,
                    font: "Times New Roman",
                  }),
                ],
              }),
          ),
          makeSectionTitle("5. Гарантия качества, обеспечения и прочие условия"),
          makeKvTable(model.warrantyAndSecurityRows),
          makeSectionTitle("6. Лист согласования и подписания вне системы"),
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${model.fileBaseName}.docx`);
};

/**
 * Экспорт сформированной служебной записки (потребности) в PDF (.pdf)
 * со встроенным кириллическим шрифтом Roboto для печати и подписания вне системы.
 */
export const exportPurchaseNoteToPdf = async (
  context: PurchaseNoteExportContext,
): Promise<void> => {
  const model = buildPurchaseNoteExportModel(context);
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

  const kvTable = (rows: KeyValueRow[]) => ({
    table: {
      widths: ["35%", "65%"],
      body: rows.map((row) => [
        { text: row.label, bold: true, fontSize: 9 },
        { text: row.value, fontSize: 9 },
      ]),
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  const itemsTable = {
    table: {
      headerRows: 1,
      widths: [18, "*", 72, 48, 36, 52, 56, 62],
      body: [
        [
          { text: "№", bold: true, fontSize: 8 },
          { text: "Наименование объекта", bold: true, fontSize: 8 },
          { text: "ОКПД2", bold: true, fontSize: 8 },
          { text: "Ед.", bold: true, fontSize: 8 },
          { text: "Кол-во", bold: true, fontSize: 8 },
          { text: "Цена, ₽", bold: true, fontSize: 8 },
          { text: "Сумма, ₽", bold: true, fontSize: 8 },
          { text: "Нац. режим", bold: true, fontSize: 8 },
        ],
        ...model.items.map((item, idx) => [
          { text: String(idx + 1), fontSize: 8 },
          {
            text: `${item.name || "—"}${item.isSupplyDuringWorks ? " (поставка товара при работах)" : ""}`,
            fontSize: 8,
          },
          {
            text:
              [item.okpd2Code, item.okpd2Name].filter(Boolean).join(" — ") ||
              "—",
            fontSize: 8,
          },
          { text: item.unit || "—", fontSize: 8 },
          {
            text: context.note.isIndeterminateVolume
              ? "1"
              : item.quantity || "1",
            fontSize: 8,
          },
          {
            text: item.unitPrice ? formatMoneyText(item.unitPrice) : "—",
            fontSize: 8,
          },
          {
            text: item.totalPrice ? formatMoneyText(item.totalPrice) : "—",
            fontSize: 8,
          },
          { text: nationalRegimeLabel(item.nationalRegimeType), fontSize: 8 },
        ]),
      ],
    },
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [32, 34, 32, 36] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      lineHeight: 1.25,
    },
    content: [
      {
        text: model.organizationTitle,
        bold: true,
        alignment: "right",
        fontSize: 10,
      },
      ...(model.organizationDetails
        ? [
            {
              text: model.organizationDetails,
              alignment: "right",
              fontSize: 8,
              color: "#555555",
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
          ]
        : []),
      {
        text: model.documentTitle,
        bold: true,
        fontSize: 13,
        alignment: "center",
        margin: [0, 4, 0, 2] as [number, number, number, number],
      },
      {
        text: model.documentSubtitle,
        fontSize: 10.5,
        alignment: "center",
      },
      {
        text: model.approvalLine,
        italics: true,
        fontSize: 8.5,
        color: "#444444",
        alignment: "center",
        margin: [0, 3, 0, 12] as [number, number, number, number],
      },
      {
        text: "1. Основные сведения и финансирование",
        bold: true,
        fontSize: 11,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      kvTable(model.generalRows),
      {
        text: "2. Объекты закупки",
        bold: true,
        fontSize: 11,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      itemsTable,
      {
        text: "3. Сроки и места поставки / приёмки",
        bold: true,
        fontSize: 11,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      kvTable(model.deliveryRows),
      {
        text: "4. Преимущества и требования к участникам",
        bold: true,
        fontSize: 11,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      {
        ul: model.requirementBullets,
        fontSize: 9,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: "5. Гарантия качества, обеспечения и прочие условия",
        bold: true,
        fontSize: 11,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      kvTable(model.warrantyAndSecurityRows),
      {
        text: "6. Лист согласования и подписания вне системы",
        bold: true,
        fontSize: 11,
        margin: [0, 8, 0, 4] as [number, number, number, number],
      },
      {
        table: {
          headerRows: 1,
          widths: ["34%", "33%", "33%"],
          body: [
            [
              { text: "Роль", bold: true, fontSize: 9 },
              { text: "Должность / ФИО", bold: true, fontSize: 9 },
              { text: "Подпись / Дата", bold: true, fontSize: 9 },
            ],
            ...model.signatureRows.map((sig) => [
              { text: sig.role, fontSize: 8.5 },
              { text: sig.person, fontSize: 8.5 },
              { text: sig.signHint, fontSize: 8.5 },
            ]),
          ],
        },
      },
    ],
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  if (typeof pdfDoc.getBlob === "function") {
    const blob = await pdfDoc.getBlob();
    triggerBlobDownload(blob, `${model.fileBaseName}.pdf`);
  } else {
    pdfDoc.download(`${model.fileBaseName}.pdf`);
  }
};
