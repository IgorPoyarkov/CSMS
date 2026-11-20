import type {
  AcceptanceDefectRequirement,
  AcceptanceInput,
  AcceptanceKind,
  AcceptanceResponse,
  AcceptanceResult,
  AcceptanceStatus,
} from "../../services/Acceptance/acceptance.types";

/**
 * Подписи, тон статусов и клиентская проверка формы приёмки.
 *
 * Юридические правила ст. 94 44-ФЗ (срок 1–20 рабочих дней, экспертиза,
 * комиссия, суммы, недостатки) остаются на сервере. Здесь — только то, что
 * можно проверить до отправки, чтобы не гонять пользователя по кругу.
 */

export const acceptanceStatusLabels: Record<AcceptanceStatus, string> = {
  Draft: "Черновик",
  Submitted: "Направлен заказчику",
  Accepted: "Принято",
  AcceptedWithDiscrepancies: "Принято с расхождениями",
  Refused: "Мотивированный отказ",
  ReturnedForRevision: "Возвращено для уточнения",
  RegisteredInEis: "Зарегистрирован в ЕИС",
  Cancelled: "Отменён",
};

export const acceptanceStatusOrder: AcceptanceStatus[] = [
  "Draft",
  "Submitted",
  "Accepted",
  "AcceptedWithDiscrepancies",
  "Refused",
  "ReturnedForRevision",
  "RegisteredInEis",
  "Cancelled",
];

export const acceptanceKindLabels: Record<AcceptanceKind, string> = {
  Primary: "Документ о приёмке",
  Correction: "Корректировочный документ",
};

export const acceptanceResultLabels: Record<AcceptanceResult, string> = {
  ReturnedForRevision: "Возвращено для уточнения",
  Accepted: "Принято без расхождений",
  AcceptedWithDiscrepancies: "Принято с расхождениями",
  Refused: "Не принято",
};

export const acceptanceRequirementLabels: Record<
  AcceptanceDefectRequirement,
  string
> = {
  Replace: "Заменить",
  Repair: "Устранить недостаток",
  DeductPrice: "Уменьшить цену",
  Reject: "Не принимать",
};

export const acceptanceRequirementOrder: AcceptanceDefectRequirement[] = [
  "Replace",
  "Repair",
  "DeductPrice",
  "Reject",
];

export const acceptanceVatRates: number[] = [0, 5, 7, 10, 20];

export const maxReviewTermDays = 20;

export type AcceptanceStatusTone =
  | "draft"
  | "progress"
  | "success"
  | "danger"
  | "muted";

export const acceptanceStatusTone = (
  status: AcceptanceStatus,
): AcceptanceStatusTone => {
  switch (status) {
    case "Submitted":
      return "progress";
    case "Accepted":
    case "AcceptedWithDiscrepancies":
    case "RegisteredInEis":
      return "success";
    case "Refused":
      return "danger";
    case "ReturnedForRevision":
      return "progress";
    case "Cancelled":
      return "muted";
    default:
      return "draft";
  }
};

export type AcceptanceActionKey =
  | "submit"
  | "accept"
  | "refuse"
  | "return"
  | "register"
  | "cancel";

export interface AcceptanceActionDescriptor {
  key: AcceptanceActionKey;
  label: string;
  tone?: "primary" | "danger";
}

/** Действия по статусу — ровно те маршруты, что поддерживает backend. */
export const acceptanceActions = (
  status: AcceptanceStatus,
): AcceptanceActionDescriptor[] => {
  switch (status) {
    case "Draft":
    case "ReturnedForRevision":
      return [
        { key: "submit", label: "Направить заказчику", tone: "primary" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    case "Submitted":
      return [
        { key: "accept", label: "Подписать итог", tone: "primary" },
        { key: "refuse", label: "Мотивированный отказ", tone: "danger" },
        { key: "return", label: "Вернуть на уточнение" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    case "Accepted":
    case "AcceptedWithDiscrepancies":
      return [
        { key: "register", label: "Зарегистрировать в ЕИС", tone: "primary" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    default:
      return [];
  }
};

export const canEditAcceptance = (status: AcceptanceStatus): boolean =>
  status === "Draft" || status === "ReturnedForRevision";

export const canEditAcceptancePositions = (status: AcceptanceStatus): boolean =>
  status === "Draft" || status === "ReturnedForRevision";

export const canManageAcceptanceDefects = (status: AcceptanceStatus): boolean =>
  status === "Draft" ||
  status === "Submitted" ||
  status === "ReturnedForRevision";

export const issueIsError = (severity: string): boolean =>
  severity.toLowerCase() === "error";

export const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const pad = (value: number): string => String(value).padStart(2, "0");

export const todayIso = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Срок рассмотрения в рабочих днях без переносов праздников (как в домене). */
export const addWorkingDaysIso = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(date.getTime()) || days <= 0) return "";

  let added = 0;

  while (added < days) {
    date.setDate(date.getDate() + 1);

    if (date.getDay() !== 0 && date.getDay() !== 6) {
      added += 1;
    }
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".");

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: string): number | null => {
  const parsed = parseNumber(value);

  return parsed === null ? null : Math.trunc(parsed);
};

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
};

// ─── Состояние формы ───────────────────────────────────────────────────────

export interface AcceptanceFormState {
  contractId: string;
  contractNumber: string;
  contractName: string;
  contractPrice: string;
  contractStatus: string;
  contractDate: string;
  customerName: string;
  supplierName: string;
  supplierInn: string;
  ikz: string;
  eisRegistryNumber: string;
  stageNumber: string;
  stageName: string;
  kind: AcceptanceKind;
  documentNumber: string;
  documentDate: string;
  correctedDocumentNumber: string;
  correctedDocumentDate: string;
  correctionReason: string;
  acceptanceTermDays: string;
  expertiseRequired: boolean;
  expertiseByThirdParty: boolean;
  expertiseOrganization: string;
  expertiseConclusionNumber: string;
  expertiseConclusionDate: string;
  commissionRequired: boolean;
  commissionDecisionNumber: string;
  commissionDecisionDate: string;
  deliveryPlace: string;
  notes: string;
}

export const emptyAcceptanceForm = (): AcceptanceFormState => ({
  contractId: "",
  contractNumber: "",
  contractName: "",
  contractPrice: "",
  contractStatus: "",
  contractDate: "",
  customerName: "",
  supplierName: "",
  supplierInn: "",
  ikz: "",
  eisRegistryNumber: "",
  stageNumber: "",
  stageName: "",
  kind: "Primary",
  documentNumber: "",
  documentDate: todayIso(),
  correctedDocumentNumber: "",
  correctedDocumentDate: "",
  correctionReason: "",
  acceptanceTermDays: "10",
  expertiseRequired: false,
  expertiseByThirdParty: false,
  expertiseOrganization: "",
  expertiseConclusionNumber: "",
  expertiseConclusionDate: "",
  commissionRequired: false,
  commissionDecisionNumber: "",
  commissionDecisionDate: "",
  deliveryPlace: "",
  notes: "",
});

const textOf = (value: string | null | undefined): string => value ?? "";

export const acceptanceFormFrom = (
  input: AcceptanceInput,
): AcceptanceFormState => ({
  contractId: input.contractId,
  contractNumber: input.contractNumber,
  contractName: input.contractName,
  contractPrice: String(input.contractPrice),
  contractStatus: input.contractStatus,
  contractDate: textOf(input.contractDate),
  customerName: textOf(input.customerName),
  supplierName: textOf(input.supplierName),
  supplierInn: textOf(input.supplierInn),
  ikz: textOf(input.ikz),
  eisRegistryNumber: textOf(input.eisRegistryNumber),
  stageNumber: input.stageNumber === null ? "" : String(input.stageNumber),
  stageName: textOf(input.stageName),
  kind: input.kind,
  documentNumber: textOf(input.documentNumber),
  documentDate: textOf(input.documentDate),
  correctedDocumentNumber: textOf(input.correctedDocumentNumber),
  correctedDocumentDate: textOf(input.correctedDocumentDate),
  correctionReason: textOf(input.correctionReason),
  acceptanceTermDays: String(input.acceptanceTermDays),
  expertiseRequired: input.expertiseRequired,
  expertiseByThirdParty: input.expertiseByThirdParty,
  expertiseOrganization: textOf(input.expertiseOrganization),
  expertiseConclusionNumber: textOf(input.expertiseConclusionNumber),
  expertiseConclusionDate: textOf(input.expertiseConclusionDate),
  commissionRequired: input.commissionRequired,
  commissionDecisionNumber: textOf(input.commissionDecisionNumber),
  commissionDecisionDate: textOf(input.commissionDecisionDate),
  deliveryPlace: textOf(input.deliveryPlace),
  notes: textOf(input.notes),
});

export const buildAcceptanceInput = (
  form: AcceptanceFormState,
  organizationId: string,
  createdBy: string,
): AcceptanceInput => ({
  organizationId,
  contractId: form.contractId.trim(),
  contractNumber: form.contractNumber.trim(),
  contractName: form.contractName.trim(),
  contractPrice: parseNumber(form.contractPrice) ?? 0,
  contractStatus: form.contractStatus.trim().toLowerCase(),
  contractDate: emptyToNull(form.contractDate),
  customerName: emptyToNull(form.customerName),
  supplierName: emptyToNull(form.supplierName),
  supplierInn: emptyToNull(form.supplierInn),
  ikz: emptyToNull(form.ikz),
  eisRegistryNumber: emptyToNull(form.eisRegistryNumber),
  stageNumber: parseInteger(form.stageNumber),
  stageName: emptyToNull(form.stageName),
  kind: form.kind,
  documentNumber: emptyToNull(form.documentNumber),
  documentDate: emptyToNull(form.documentDate),
  correctedDocumentNumber: emptyToNull(form.correctedDocumentNumber),
  correctedDocumentDate: emptyToNull(form.correctedDocumentDate),
  correctionReason: emptyToNull(form.correctionReason),
  acceptanceTermDays:
    parseInteger(form.acceptanceTermDays) ?? maxReviewTermDays,
  expertiseRequired: form.expertiseRequired,
  expertiseByThirdParty: form.expertiseRequired && form.expertiseByThirdParty,
  expertiseOrganization: emptyToNull(form.expertiseOrganization),
  expertiseConclusionNumber: emptyToNull(form.expertiseConclusionNumber),
  expertiseConclusionDate: emptyToNull(form.expertiseConclusionDate),
  commissionRequired: form.commissionRequired,
  commissionDecisionNumber: emptyToNull(form.commissionDecisionNumber),
  commissionDecisionDate: emptyToNull(form.commissionDecisionDate),
  deliveryPlace: emptyToNull(form.deliveryPlace),
  notes: emptyToNull(form.notes),
  createdBy,
});

// ─── Проверка формы ────────────────────────────────────────────────────────

export type FormErrors = Record<string, string>;

export const validateAcceptanceForm = (
  form: AcceptanceFormState,
): FormErrors => {
  const errors: FormErrors = {};

  if (!form.contractId) {
    errors.contractId = "Выберите контракт из реестра.";
  }

  const price = parseNumber(form.contractPrice);

  if (price === null || price <= 0) {
    errors.contractPrice = "В карточке контракта не указана цена.";
  }

  const term = parseInteger(form.acceptanceTermDays);

  if (term === null || term < 1 || term > maxReviewTermDays) {
    errors.acceptanceTermDays = `Срок приёмки — от 1 до ${maxReviewTermDays} рабочих дней.`;
  }

  if (
    form.documentDate &&
    form.contractDate &&
    form.documentDate < form.contractDate
  ) {
    errors.documentDate = "Дата документа не может быть раньше даты контракта.";
  }

  if (form.stageNumber.trim()) {
    const stage = parseInteger(form.stageNumber);

    if (stage === null || stage <= 0) {
      errors.stageNumber = "Номер этапа должен быть больше нуля.";
    }
  }

  if (form.kind === "Correction") {
    if (!form.correctedDocumentNumber) {
      errors.correctedDocumentNumber = "Укажите номер исправляемого документа.";
    }

    if (!form.correctedDocumentDate) {
      errors.correctedDocumentDate = "Укажите дату исправляемого документа.";
    }

    if (form.correctionReason.trim().length < 10) {
      errors.correctionReason =
        "Опишите причину исправления (не менее 10 символов).";
    }

    if (
      form.documentDate &&
      form.correctedDocumentDate &&
      form.documentDate < form.correctedDocumentDate
    ) {
      errors.documentDate =
        "Дата корректировочного документа не может быть раньше исправляемого.";
    }
  }

  if (form.expertiseByThirdParty && !form.expertiseRequired) {
    errors.expertiseRequired =
      "Сторонняя экспертиза возможна, только если она предусмотрена контрактом.";
  }

  if (form.expertiseRequired && form.expertiseByThirdParty) {
    if (!form.expertiseOrganization.trim()) {
      errors.expertiseOrganization =
        "Укажите организацию, проводившую экспертизу.";
    }

    if (!form.expertiseConclusionNumber) {
      errors.expertiseConclusionNumber = "Укажите номер заключения.";
    }

    if (!form.expertiseConclusionDate) {
      errors.expertiseConclusionDate = "Укажите дату заключения.";
    }

    if (
      form.documentDate &&
      form.expertiseConclusionDate &&
      form.expertiseConclusionDate > form.documentDate
    ) {
      errors.expertiseConclusionDate =
        "Заключение не может быть позже даты документа о приёмке.";
    }
  }

  if (form.commissionRequired) {
    if (!form.commissionDecisionNumber) {
      errors.commissionDecisionNumber = "Укажите номер решения о комиссии.";
    }

    if (!form.commissionDecisionDate) {
      errors.commissionDecisionDate = "Укажите дату решения о комиссии.";
    }

    if (
      form.documentDate &&
      form.commissionDecisionDate &&
      form.commissionDecisionDate > form.documentDate
    ) {
      errors.commissionDecisionDate =
        "Решение о комиссии не может быть позже даты документа.";
    }
  }

  return errors;
};

// ─── Автор действия и печатная форма акта ──────────────────────────────────

/**
 * Кто выполняет действие. В журнал попадает ФИО работника, а не логин:
 * подписант акта должен читаться без расшифровки учётных записей.
 */
export const acceptanceActor = (
  employee:
    | {
        employee?: {
          surname?: string;
          name?: string;
          patronymic?: string;
        } | null;
      }
    | null
    | undefined,
  email?: string,
): string => {
  const fio = [
    employee?.employee?.surname,
    employee?.employee?.name,
    employee?.employee?.patronymic,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");

  return fio || email || "Система";
};

/**
 * Текст акта приёмки для просмотра и печати.
 *
 * Это не «скачиваемый документ», а читаемое представление сохранённого
 * документа: позиции, недостатки и итог берутся из ответа API, поэтому
 * распечатка совпадает с тем, что согласовали и подписали.
 */
export const buildAcceptanceActText = (
  acceptance: AcceptanceResponse,
): string => {
  const input = acceptance.input;
  const lines: string[] = [
    `АКТ ПРИЁМКИ № ${input.documentNumber ?? "—"} от ${input.documentDate ?? "—"}`,
    input.kind === "Correction"
      ? `Корректировочный документ к акту № ${input.correctedDocumentNumber ?? "—"} от ${input.correctedDocumentDate ?? "—"}`
      : "Первичный документ о приёмке",
    "",
    `Контракт № ${input.contractNumber || "—"} от ${input.contractDate ?? "—"}`,
    `Заказчик: ${input.customerName ?? "—"}`,
    `Поставщик (подрядчик, исполнитель): ${input.supplierName ?? "—"}${
      input.supplierInn ? `, ИНН ${input.supplierInn}` : ""
    }`,
    input.stageNumber
      ? `Этап исполнения: ${input.stageNumber}${input.stageName ? ` — ${input.stageName}` : ""}`
      : "",
    input.deliveryPlace ? `Место приёмки: ${input.deliveryPlace}` : "",
    `Срок рассмотрения: ${input.acceptanceTermDays} рабочих дней (до ${acceptance.reviewDeadline ?? "—"})`,
    "",
    "Принято:",
  ].filter(Boolean);

  acceptance.positions.forEach((position, index) => {
    lines.push(
      `${index + 1}. ${position.name} — ${position.quantity} ${position.unit} × ${formatMoney(
        position.unitPrice,
      )} ₽ = ${formatMoney(position.totalWithVat)} ₽ (НДС ${position.vatRate} %: ${formatMoney(
        position.vatAmount,
      )} ₽)`,
    );
  });

  lines.push(
    "",
    `Итого с НДС: ${formatMoney(acceptance.totalWithVat)} ₽`,
    `НДС: ${formatMoney(acceptance.vatAmount)} ₽`,
    `Без НДС: ${formatMoney(acceptance.totalWithoutVat)} ₽`,
    "",
  );

  if (acceptance.defects.length > 0) {
    lines.push("Выявленные недостатки:");

    acceptance.defects.forEach((defect, index) => {
      lines.push(
        `${index + 1}. ${defect.description} — ${defect.quantity} ед., требование: ${acceptanceRequirementLabels[defect.requirement]}`,
      );
    });

    lines.push("");
  }

  lines.push(
    `Итог приёмки: ${
      acceptance.result
        ? acceptanceResultLabels[acceptance.result]
        : "не определён"
    }`,
  );

  if (acceptance.refusalReason) {
    lines.push(`Причина отказа: ${acceptance.refusalReason}`);
  }

  if (acceptance.returnComment) {
    lines.push(`Что уточнить: ${acceptance.returnComment}`);
  }

  if (input.notes) {
    lines.push("", `Примечания: ${input.notes}`);
  }

  lines.push(
    "",
    "Подписи сторон:",
    `Заказчик: ${acceptance.signedBy ?? "____________________"} / ____________________`,
    "Поставщик: __________________ / ____________________",
  );

  return lines.join("\n");
};
