import type {
  ContractChangeBasis,
  ContractChangeDocumentType,
  ContractChangeInput,
  ContractChangeKind,
  ContractChangeStatus,
} from "../../services/ContractChange/contractChange.types";

/**
 * Подписи, тон статусов и клиентская проверка формы изменения/расторжения.
 *
 * Клиентская проверка повторяет только очевидные требования формы (заполнены
 * поля, суммы и сроки согласованы). Юридические правила ст. 95 44-ФЗ остаются
 * на сервере: `POST /validate` и сохранение используют один и тот же код.
 */

export const contractChangeStatusLabels: Record<ContractChangeStatus, string> =
  {
    Draft: "Черновик",
    OnApproval: "На согласовании",
    Approved: "Согласован",
    Signed: "Подписан",
    RegisteredInEis: "Зарегистрирован в ЕИС",
    Rejected: "Отклонён",
    Cancelled: "Отменён",
  };

export const contractChangeStatusOrder: ContractChangeStatus[] = [
  "Draft",
  "OnApproval",
  "Approved",
  "Signed",
  "RegisteredInEis",
  "Rejected",
  "Cancelled",
];

export const contractChangeKindLabels: Record<ContractChangeKind, string> = {
  Modification: "Изменение контракта",
  Termination: "Расторжение контракта",
};

export const contractChangeDocumentTypeLabels: Record<
  ContractChangeDocumentType,
  string
> = {
  Agreement: "Соглашение",
  Notice: "Уведомление",
  Decision: "Решение",
  CourtDecision: "Судебный акт",
  Attachment: "Приложение",
};

export const contractChangeDocumentTypes: ContractChangeDocumentType[] = [
  "Agreement",
  "Notice",
  "Decision",
  "CourtDecision",
  "Attachment",
];

export const contractStatusLabels: Record<string, string> = {
  signed: "Подписан",
  in_execution: "В исполнении",
  suspended: "Приостановлен",
  completed: "Исполнен",
  terminated: "Расторгнут",
};

export type StatusTone = "draft" | "progress" | "success" | "danger" | "muted";

export const contractChangeStatusTone = (
  status: ContractChangeStatus,
): StatusTone => {
  switch (status) {
    case "OnApproval":
      return "progress";
    case "Approved":
    case "Signed":
    case "RegisteredInEis":
      return "success";
    case "Rejected":
      return "danger";
    case "Cancelled":
      return "muted";
    default:
      return "draft";
  }
};

export type ContractChangeActionKey =
  | "submit"
  | "approve"
  | "reject"
  | "sign"
  | "register"
  | "cancel";

export interface ContractChangeActionDescriptor {
  key: ContractChangeActionKey;
  label: string;
  tone?: "primary" | "danger";
}

/** Доступные действия по статусу — ровно те маршруты, что есть на backend. */
export const contractChangeActions = (
  status: ContractChangeStatus,
): ContractChangeActionDescriptor[] => {
  switch (status) {
    case "Draft":
    case "Rejected":
      return [
        { key: "submit", label: "На согласование", tone: "primary" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    case "OnApproval":
      return [
        { key: "approve", label: "Согласовать", tone: "primary" },
        { key: "reject", label: "Отклонить", tone: "danger" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    case "Approved":
      return [
        { key: "sign", label: "Подписать", tone: "primary" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    case "Signed":
      return [
        { key: "register", label: "Зарегистрировать в ЕИС", tone: "primary" },
        { key: "cancel", label: "Отменить", tone: "danger" },
      ];
    default:
      return [];
  }
};

export const canEditContractChange = (status: ContractChangeStatus): boolean =>
  status === "Draft" || status === "Rejected";

export const canManageContractChangeDocuments = (
  status: ContractChangeStatus,
): boolean => status === "Draft" || status === "Rejected";

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

export const addDaysIso = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".");

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
};

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
};

// ─── Состояние формы ───────────────────────────────────────────────────────

export interface ContractChangeFormState {
  contractId: string;
  contractNumber: string;
  contractName: string;
  contractPrice: string;
  contractStatus: string;
  contractDate: string;
  customerName: string;
  supplierName: string;
  ikz: string;
  eisRegistryNumber: string;
  contractQuantity: string;
  contractExecutionEndDate: string;
  kind: ContractChangeKind;
  basisCode: string;
  reason: string;
  description: string;
  changeDate: string;
  terminationDate: string;
  newPrice: string;
  newQuantity: string;
  quantityUnit: string;
  newSubject: string;
  newSupplier: string;
  newExecutionEndDate: string;
  noticeNumber: string;
  noticeDate: string;
  courtDecisionNumber: string;
  courtDecisionDate: string;
  governmentActNumber: string;
  governmentActDate: string;
  formulaText: string;
  unitPrice: string;
  initialMaxPrice: string;
}

export const emptyContractChangeForm = (): ContractChangeFormState => ({
  contractId: "",
  contractNumber: "",
  contractName: "",
  contractPrice: "",
  contractStatus: "",
  contractDate: "",
  customerName: "",
  supplierName: "",
  ikz: "",
  eisRegistryNumber: "",
  contractQuantity: "",
  contractExecutionEndDate: "",
  kind: "Modification",
  basisCode: "",
  reason: "",
  description: "",
  changeDate: todayIso(),
  terminationDate: "",
  newPrice: "",
  newQuantity: "",
  quantityUnit: "",
  newSubject: "",
  newSupplier: "",
  newExecutionEndDate: "",
  noticeNumber: "",
  noticeDate: "",
  courtDecisionNumber: "",
  courtDecisionDate: "",
  governmentActNumber: "",
  governmentActDate: "",
  formulaText: "",
  unitPrice: "",
  initialMaxPrice: "",
});

const textOf = (value: string | null | undefined): string => value ?? "";

export const contractChangeFormFrom = (
  input: ContractChangeInput,
): ContractChangeFormState => ({
  contractId: input.contractId,
  contractNumber: input.contractNumber,
  contractName: input.contractName,
  contractPrice: String(input.contractPrice),
  contractStatus: input.contractStatus,
  contractDate: textOf(input.contractDate),
  customerName: textOf(input.customerName),
  supplierName: textOf(input.supplierName),
  ikz: textOf(input.ikz),
  eisRegistryNumber: textOf(input.eisRegistryNumber),
  contractQuantity:
    input.contractQuantity === null ? "" : String(input.contractQuantity),
  contractExecutionEndDate: textOf(input.contractExecutionEndDate),
  kind: input.kind,
  basisCode: input.basisCode,
  reason: input.reason,
  description: textOf(input.description),
  changeDate: input.changeDate,
  terminationDate: textOf(input.terminationDate),
  newPrice: input.newPrice === null ? "" : String(input.newPrice),
  newQuantity: input.newQuantity === null ? "" : String(input.newQuantity),
  quantityUnit: textOf(input.quantityUnit),
  newSubject: textOf(input.newSubject),
  newSupplier: textOf(input.newSupplier),
  newExecutionEndDate: textOf(input.newExecutionEndDate),
  noticeNumber: textOf(input.noticeNumber),
  noticeDate: textOf(input.noticeDate),
  courtDecisionNumber: textOf(input.courtDecisionNumber),
  courtDecisionDate: textOf(input.courtDecisionDate),
  governmentActNumber: textOf(input.governmentActNumber),
  governmentActDate: textOf(input.governmentActDate),
  formulaText: textOf(input.formulaText),
  unitPrice: input.unitPrice === null ? "" : String(input.unitPrice),
  initialMaxPrice:
    input.initialMaxPrice === null ? "" : String(input.initialMaxPrice),
});

export const buildContractChangeInput = (
  form: ContractChangeFormState,
  organizationId: string,
  createdBy: string,
): ContractChangeInput => ({
  organizationId,
  contractId: form.contractId.trim(),
  contractNumber: form.contractNumber.trim(),
  contractName: form.contractName.trim(),
  contractPrice: parseNumber(form.contractPrice) ?? 0,
  contractStatus: form.contractStatus.trim().toLowerCase(),
  contractDate: emptyToNull(form.contractDate),
  customerName: emptyToNull(form.customerName),
  supplierName: emptyToNull(form.supplierName),
  ikz: emptyToNull(form.ikz),
  eisRegistryNumber: emptyToNull(form.eisRegistryNumber),
  contractQuantity: parseNumber(form.contractQuantity),
  contractExecutionEndDate: emptyToNull(form.contractExecutionEndDate),
  kind: form.kind,
  basisCode: form.basisCode,
  reason: form.reason.trim(),
  description: emptyToNull(form.description),
  changeDate: form.changeDate || todayIso(),
  terminationDate: emptyToNull(form.terminationDate),
  newPrice: parseNumber(form.newPrice),
  newQuantity: parseNumber(form.newQuantity),
  quantityUnit: emptyToNull(form.quantityUnit),
  newSubject: emptyToNull(form.newSubject),
  newSupplier: emptyToNull(form.newSupplier),
  newExecutionEndDate: emptyToNull(form.newExecutionEndDate),
  noticeNumber: emptyToNull(form.noticeNumber),
  noticeDate: emptyToNull(form.noticeDate),
  courtDecisionNumber: emptyToNull(form.courtDecisionNumber),
  courtDecisionDate: emptyToNull(form.courtDecisionDate),
  governmentActNumber: emptyToNull(form.governmentActNumber),
  governmentActDate: emptyToNull(form.governmentActDate),
  formulaText: emptyToNull(form.formulaText),
  unitPrice: parseNumber(form.unitPrice),
  initialMaxPrice: parseNumber(form.initialMaxPrice),
  createdBy,
});

// ─── Проверка формы ────────────────────────────────────────────────────────

export type FormErrors = Record<string, string>;

export const validateContractChangeForm = (
  form: ContractChangeFormState,
  basis: ContractChangeBasis | undefined,
): FormErrors => {
  const errors: FormErrors = {};
  const contractPrice = parseNumber(form.contractPrice);

  if (!form.contractId) {
    errors.contractId = "Выберите контракт из реестра.";
  }

  if (contractPrice === null || contractPrice <= 0) {
    errors.contractPrice = "В карточке контракта не указана цена.";
  }

  if (!basis) {
    errors.basisCode = "Выберите основание изменения или расторжения.";
    return errors;
  }

  if (form.reason.trim().length < 10) {
    errors.reason = "Опишите причину (не менее 10 символов).";
  }

  if (!form.changeDate) {
    errors.changeDate = "Укажите дату документа.";
  } else if (form.contractDate && form.changeDate < form.contractDate) {
    errors.changeDate = "Дата документа не может быть раньше даты контракта.";
  }

  if (form.kind === "Termination") {
    if (!form.terminationDate) {
      errors.terminationDate = "Укажите дату расторжения.";
    } else if (form.changeDate && form.terminationDate < form.changeDate) {
      errors.terminationDate =
        "Дата расторжения не может быть раньше даты документа.";
    }

    if (basis.requiresCourtDecision) {
      if (!form.courtDecisionNumber) {
        errors.courtDecisionNumber = "Укажите номер судебного акта.";
      }

      if (!form.courtDecisionDate) {
        errors.courtDecisionDate = "Укажите дату судебного акта.";
      }

      if (
        form.terminationDate &&
        form.courtDecisionDate &&
        form.terminationDate < form.courtDecisionDate
      ) {
        errors.terminationDate =
          "Дата расторжения не может быть раньше даты судебного акта.";
      }
    }

    if (basis.requiresUnilateralNotice) {
      if (!form.noticeNumber) {
        errors.noticeNumber = "Укажите номер уведомления.";
      }

      if (!form.noticeDate) {
        errors.noticeDate = "Укажите дату уведомления.";
      } else if (form.terminationDate) {
        const earliest = addDaysIso(form.noticeDate, 10);

        if (earliest && form.terminationDate < earliest) {
          errors.terminationDate = `Решение вступает в силу не ранее ${earliest} (10 дней с даты уведомления).`;
        }
      }
    }

    return errors;
  }

  const newPrice = parseNumber(form.newPrice);

  if (newPrice !== null) {
    if (newPrice <= 0) {
      errors.newPrice = "Новая цена должна быть больше нуля.";
    } else if (
      basis.onlyPriceReduction &&
      contractPrice !== null &&
      newPrice >= contractPrice
    ) {
      errors.newPrice = "По этому основанию цена может только снижаться.";
    } else if (
      contractPrice !== null &&
      newPrice > contractPrice &&
      (basis.maxPriceIncreasePercent <= 0 ||
        newPrice > contractPrice * (1 + basis.maxPriceIncreasePercent / 100))
    ) {
      errors.newPrice =
        basis.maxPriceIncreasePercent <= 0
          ? "Увеличение цены по выбранному основанию не допускается."
          : `Увеличение цены не может превышать ${basis.maxPriceIncreasePercent} % цены контракта.`;
    }
  } else if (
    !basis.allowsPriceChange &&
    form.newPrice.trim() &&
    contractPrice !== null
  ) {
    errors.newPrice = "Выбранное основание не допускает изменения цены.";
  }

  if (basis.allowsQuantityChange) {
    const newQuantity = parseNumber(form.newQuantity);
    const contractQuantity = parseNumber(form.contractQuantity);

    if (newQuantity === null || newQuantity <= 0) {
      errors.newQuantity = "Укажите новое количество или объём.";
    } else if (contractQuantity !== null && contractQuantity > 0) {
      const percent =
        (Math.abs(newQuantity - contractQuantity) / contractQuantity) * 100;

      if (percent > basis.maxQuantityPercent) {
        errors.newQuantity = `Количество можно изменить не более чем на ${basis.maxQuantityPercent} %.`;
      }
    }
  }

  if (basis.requiresGovernmentAct) {
    if (!form.governmentActNumber) {
      errors.governmentActNumber = "Укажите номер акта органа власти.";
    }

    if (!form.governmentActDate) {
      errors.governmentActDate = "Укажите дату акта органа власти.";
    }
  }

  if (basis.requiresFormula && !form.formulaText.trim()) {
    errors.formulaText = "Укажите формулу и порядок расчёта.";
  }

  if (basis.requiresUnitPrice) {
    const unitPrice = parseNumber(form.unitPrice);
    const initialMaxPrice = parseNumber(form.initialMaxPrice);

    if (unitPrice === null || unitPrice <= 0) {
      errors.unitPrice = "Укажите цену единицы.";
    } else if (
      initialMaxPrice !== null &&
      initialMaxPrice > 0 &&
      unitPrice > initialMaxPrice
    ) {
      errors.unitPrice =
        "Цена единицы не может превышать начальную максимальную цену.";
    }
  }

  if (basis.requiresNewSupplier && !form.newSupplier.trim()) {
    errors.newSupplier = "Укажите нового поставщика.";
  }

  if (form.newSubject.trim() && !basis.allowsQualityImprovement) {
    errors.newSubject = "Предмет контракта по этому основанию не меняется.";
  }

  if (
    form.newExecutionEndDate &&
    form.newExecutionEndDate !== form.contractExecutionEndDate &&
    !basis.requiresGovernmentAct
  ) {
    errors.newExecutionEndDate =
      "Срок исполнения меняется только по акту органа власти.";
  }

  return errors;
};

// ─── Автор действия и заготовки документов ─────────────────────────────────

/**
 * Кто выполняет действие. В журнал попадает ФИО работника, а не логин:
 * подписант и согласующий должны читаться без расшифровки учётных записей.
 */
export const contractChangeActor = (
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

const conditionLines = (input: ContractChangeInput): string[] => {
  const lines: string[] = [];

  if (input.newPrice !== null) {
    lines.push(`Новая цена контракта: ${formatMoney(input.newPrice)} ₽.`);
  }

  if (input.newQuantity !== null) {
    lines.push(
      `Новое количество (объём): ${input.newQuantity}${
        input.quantityUnit ? ` ${input.quantityUnit}` : ""
      }.`,
    );
  }

  if (input.newSubject) {
    lines.push(`Новый предмет контракта: ${input.newSubject}.`);
  }

  if (input.newSupplier) {
    lines.push(
      `Новый поставщик (подрядчик, исполнитель): ${input.newSupplier}.`,
    );
  }

  if (input.newExecutionEndDate) {
    lines.push(`Новый срок исполнения: ${input.newExecutionEndDate}.`);
  }

  return lines;
};

/**
 * Заготовка текста документа по снимку контракта и основанию.
 *
 * Это именно заготовка: текст сохраняется как документ и получает хеш, после
 * чего его можно согласовать и подписать. Юридические реквизиты, которых нет
 * в карточке, оставлены прочерками — их заполняет пользователь, а не система.
 */
export const buildContractChangeDocumentDraft = (
  type: ContractChangeDocumentType,
  input: ContractChangeInput,
  basis: ContractChangeBasis | undefined,
): { title: string; content: string } => {
  const basisLine = basis
    ? `${basis.article} — ${basis.title}`
    : input.basisCode || "основание не указано";

  const header = [
    `Контракт № ${input.contractNumber || "—"} от ${input.contractDate ?? "—"}`,
    `Заказчик: ${input.customerName ?? "—"}`,
    `Поставщик (подрядчик, исполнитель): ${input.supplierName ?? "—"}`,
    `Цена контракта: ${formatMoney(input.contractPrice)} ₽`,
    `Правовое основание: ${basisLine}`,
    "",
  ];

  const footer = [
    "",
    "Причина:",
    input.reason || "—",
    "",
    "Приложения:",
    "1. —",
    "",
    "Подписи сторон:",
    "Заказчик: ____________________ / ____________________",
    "Поставщик: __________________ / ____________________",
  ];

  if (input.kind === "Termination") {
    const terminationLine = `Дата расторжения контракта: ${
      input.terminationDate ?? "—"
    }.`;

    if (type === "Notice") {
      return {
        title: `Уведомление об отказе от исполнения контракта № ${
          input.contractNumber || "—"
        }`,
        content: [
          "УВЕДОМЛЕНИЕ",
          "об одностороннем отказе от исполнения контракта",
          "",
          ...header,
          terminationLine,
          "Решение вступает в силу не ранее чем через 10 дней с даты надлежащего уведомления другой стороны.",
          ...(input.noticeNumber
            ? [`Номер уведомления: ${input.noticeNumber}.`]
            : []),
          ...(input.noticeDate
            ? [`Дата уведомления: ${input.noticeDate}.`]
            : []),
          ...footer,
        ].join("\n"),
      };
    }

    if (type === "Decision") {
      return {
        title: `Решение об одностороннем отказе от исполнения контракта № ${
          input.contractNumber || "—"
        }`,
        content: [
          "РЕШЕНИЕ",
          "об одностороннем отказе от исполнения контракта",
          "",
          ...header,
          terminationLine,
          ...(input.noticeNumber
            ? [
                `Уведомление: № ${input.noticeNumber} от ${input.noticeDate ?? "—"}.`,
              ]
            : []),
          ...footer,
        ].join("\n"),
      };
    }

    if (type === "CourtDecision") {
      return {
        title: `Судебный акт о расторжении контракта № ${
          input.contractNumber || "—"
        }`,
        content: [
          "СУДЕБНЫЙ АКТ",
          "о расторжении контракта",
          "",
          ...header,
          `Номер судебного акта: ${input.courtDecisionNumber ?? "—"}.`,
          `Дата судебного акта: ${input.courtDecisionDate ?? "—"}.`,
          terminationLine,
          ...footer,
        ].join("\n"),
      };
    }

    return {
      title: `Соглашение о расторжении контракта № ${
        input.contractNumber || "—"
      }`,
      content: [
        "СОГЛАШЕНИЕ",
        "о расторжении контракта",
        "",
        ...header,
        terminationLine,
        "Стороны подтверждают, что обязательства прекращаются с указанной даты, а расчёты завершаются в порядке, установленном контрактом.",
        ...footer,
      ].join("\n"),
    };
  }

  if (type === "Attachment") {
    return {
      title: `Приложение к соглашению об изменении контракта № ${
        input.contractNumber || "—"
      }`,
      content: [
        "ПРИЛОЖЕНИЕ",
        "к соглашению об изменении контракта",
        "",
        ...header,
        ...conditionLines(input),
        ...footer,
      ].join("\n"),
    };
  }

  return {
    title: `Соглашение об изменении контракта № ${input.contractNumber || "—"}`,
    content: [
      "СОГЛАШЕНИЕ",
      "об изменении контракта",
      "",
      ...header,
      "Стороны договорились изменить условия контракта следующим образом:",
      ...conditionLines(input),
      ...footer,
    ].join("\n"),
  };
};
