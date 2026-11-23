import { z } from "zod";
import type { ContractServiceRosterRow } from "../ContractService/contractService.config";
import type { ContractServiceFunction } from "../ContractService/contractService.schema";
import { addWorkingDaysIso } from "../Notifications/deadlineNotifications";
import type { Task, TaskExecutionStep } from "../Tasks/tasks.schema";

/**
 * КС-уведомление о ненадлежащем исполнении контракта.
 *
 * Уведомление не уходит в ЕИС: по п. 2.4 Типового положения (приказ Минфина
 * России № 158н) руководитель службы распределяет функции между работниками,
 * поэтому выявленное нарушение должно попасть в руки тому члену КС, за которым
 * закреплено соответствующее направление — претензионно-исковая работа
 * (п. 3.5.3) либо СМП/СОНКО (п. 3.5.2). Если функция никому не назначена,
 * уведомление идёт руководителю службы (контрактному управляющему): он
 * распределяет дальше по подчинённости.
 *
 * Носителем уведомления служит задача КС: она уже доставляется в личный
 * кабинет работника, имеет срок, этапы и видна руководителю — отдельная
 * коллекция не нужна.
 */

export const CONTRACT_VIOLATION_SUBJECTS = [
  "quality",
  "deadline",
  "documents",
  "smpVolume",
  "smpLate",
  "smpFalse",
  "other",
] as const;

export const ContractViolationSubjectSchema = z.enum(
  CONTRACT_VIOLATION_SUBJECTS,
);

export type ContractViolationSubject = z.infer<
  typeof ContractViolationSubjectSchema
>;

/** Откуда пришло нарушение: приёмка или сведения о привлечении СМП. */
export const CONTRACT_VIOLATION_SOURCES = ["acceptance", "smp"] as const;

export type ContractViolationSource =
  (typeof CONTRACT_VIOLATION_SOURCES)[number];

export const contractViolationSourceLabels: Record<
  ContractViolationSource,
  string
> = {
  acceptance: "Приёмка (входящий документ о приёмке)",
  smp: "Сведения о привлечении СМП/СОНКО",
};

export const contractViolationSubjectLabels: Record<
  ContractViolationSubject,
  string
> = {
  quality: "Качество и комплектность поставленного",
  deadline: "Просрочка поставки / выполнения работ",
  documents: "Не представлены документы и сведения",
  smpVolume: "Недопривлечение СМП/СОНКО",
  smpLate: "Нарушен срок сведений о привлечении СМП",
  smpFalse: "Недостоверные сведения о привлечении СМП",
  other: "Иное нарушение условий контракта",
};

/** Что именно проверяет сотрудник, выбравший предмет нарушения. */
export const contractViolationSubjectHints: Record<
  ContractViolationSubject,
  string
> = {
  quality:
    "Недостатки товара, работ или услуг, некомплектность, несоответствие условиям контракта",
  deadline:
    "Товар не поставлен, работы или услуги не выполнены к сроку, предусмотренному контрактом",
  documents:
    "Не переданы документы, подтверждающие исполнение, либо сведения для реестра контрактов",
  smpVolume:
    "Объём привлечения СМП/СОНКО меньше установленного ч. 5 ст. 30 44-ФЗ (ПП РФ № 1466)",
  smpLate:
    "Сведения о привлечении СМП направлены позже срока, установленного контрактом (ПП РФ № 1466)",
  smpFalse:
    "В сведениях о привлечении СМП указаны договоры, которые не заключались или не исполнялись",
  other: "Нарушение иных условий контракта, не вошедшее в перечень выше",
};

/** Нормативное основание по умолчанию — сотрудник может уточнить в форме. */
export const contractViolationLegalBasis: Record<
  ContractViolationSubject,
  string
> = {
  quality: "ч. 1, 2 ст. 94, ч. 8 ст. 34 44-ФЗ",
  deadline: "ч. 7 ст. 34, ст. 94 44-ФЗ (пени)",
  documents: "ч. 6, 8 ст. 94, ч. 3 ст. 103 44-ФЗ",
  smpVolume: "ч. 5 ст. 30 44-ФЗ, ПП РФ № 1466",
  smpLate: "ч. 4 ст. 30 44-ФЗ, ПП РФ № 1466",
  smpFalse: "ч. 5 ст. 30 44-ФЗ, ПП РФ № 1466",
  other: "ст. 34, 94 44-ФЗ",
};

/** Требование к поставщику, которое подставляется по предмету нарушения. */
export const contractViolationSubjectRequirement: Record<
  ContractViolationSubject,
  string
> = {
  quality:
    "Устранить выявленные недостатки (заменить товар) в согласованный срок и уплатить неустойку (штраф) по условиям контракта.",
  deadline:
    "Завершить поставку (выполнение работ, оказание услуг) и уплатить пени за просрочку исполнения обязательства.",
  documents:
    "Представить документы (сведения), предусмотренные контрактом, в установленный срок.",
  smpVolume:
    "Довести объём привлечения СМП/СОНКО до установленного контрактом и уплатить неустойку за недопривлечение.",
  smpLate:
    "Представить сведения о привлечении СМП/СОНКО и уплатить неустойку за нарушение срока.",
  smpFalse:
    "Подтвердить достоверность сведений о привлечении СМП/СОНКО либо представить уточнённые сведения.",
  other: "Устранить нарушение условий контракта и сообщить о принятых мерах.",
};

/**
 * Функции КС, по которым маршрутизируется уведомление.
 *
 * Порядок в списке — приоритет: уведомление о нарушении по СМП сначала идёт
 * ответственному за СМП/СОНКО, а претензионную работу ведёт функция п. 3.5.3.
 */
export const contractViolationSubjectFunctions: Record<
  ContractViolationSubject,
  ContractServiceFunction[]
> = {
  quality: ["reporting_appeals", "contract_execution_interaction"],
  deadline: ["reporting_appeals", "contract_execution_interaction"],
  documents: ["reporting_appeals", "contract_execution_interaction"],
  smpVolume: ["reporting_smnp", "reporting_appeals"],
  smpLate: ["reporting_smnp", "reporting_appeals"],
  smpFalse: ["reporting_smnp", "reporting_appeals"],
  other: ["reporting_appeals", "contract_execution_interaction"],
};

/** Руководитель службы или контрактный управляющий — резервный адресат. */
const LEADER_ROLE_PATTERN = /Руководитель службы|Контрактный управляющий/;

/**
 * Кому уйдёт уведомление.
 *
 * Сначала — работники с закреплённой функцией (в порядке приоритета), затем
 * руководитель службы / контрактный управляющий: по п. 2.4 он распределяет
 * функции и полномочия, поэтому нарушение без ответственного направления
 * попадает к нему, а не «в никуда».
 */
export const contractViolationRecipients = (
  roster: ContractServiceRosterRow[],
  subject: ContractViolationSubject,
): ContractServiceRosterRow[] => {
  for (const code of contractViolationSubjectFunctions[subject]) {
    const assigned = roster.filter((row) =>
      (row.functions ?? []).includes(code),
    );

    if (assigned.length > 0) {
      return assigned;
    }
  }

  const leaders = roster.filter((row) => LEADER_ROLE_PATTERN.test(row.role));

  return leaders.length > 0 ? leaders : roster.slice(0, 1);
};

/** Подпись адресата: «Фамилия И. О. — роль в КС». */
export const contractViolationRecipientLabel = (
  row: ContractServiceRosterRow,
): string =>
  [row.employeeFullName, row.role].filter(Boolean).join(" · ") ||
  "работник КС";

/** Функция, по которой уведомление попало конкретному работнику. */
export const contractViolationRecipientFunction = (
  row: ContractServiceRosterRow,
  subject: ContractViolationSubject,
): ContractServiceFunction | undefined =>
  contractViolationSubjectFunctions[subject].find((code) =>
    (row.functions ?? []).includes(code),
  );
// ─── Форма уведомления ──────────────────────────────────────────────────────

const isoDate = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, message);

export const ContractViolationNoticeSchema = z.object({
  // Предмет нарушения — то, что выявил сотрудник
  subject: ContractViolationSubjectSchema,
  // Существо: что, когда и при каких обстоятельствах выявлено
  essence: z
    .string()
    .min(20, "Опишите, что именно выявлено (не короче 20 знаков)"),
  // Требование к поставщику
  requirement: z
    .string()
    .min(10, "Укажите требование к поставщику (не короче 10 знаков)"),
  // Основание: пункт контракта либо норма права
  basis: z.string().optional(),
  // Расчётная сумма неустойки/штрафа — необязательна
  amount: z
    .string()
    .refine(
      (value) => value === "" || /^\d+([.,]\d{1,2})?$/.test(value),
      "Сумма — число, например 12500.50",
    )
    .optional(),
  // Срок, к которому поставщик должен отреагировать
  dueDate: isoDate("Укажите срок исполнения требования"),
});

export type ContractViolationNoticeForm = z.infer<
  typeof ContractViolationNoticeSchema
>;

/** Пустая форма: дата по умолчанию — 5 рабочих дней на претензионную работу. */
export const emptyContractViolationNotice = (
  overrides: Partial<ContractViolationNoticeForm> = {},
  todayIso: string = new Date().toISOString().slice(0, 10),
): ContractViolationNoticeForm => {
  const subject: ContractViolationSubject = overrides.subject ?? "quality";

  return {
    subject,
    essence: "",
    requirement: contractViolationSubjectRequirement[subject],
    basis: "",
    amount: "",
    dueDate: addWorkingDaysIso(todayIso, 5) ?? todayIso,
    ...overrides,
  };
};

// ─── Задача КС ──────────────────────────────────────────────────────────────

export interface ContractViolationSourceRef {
  /** Подпись документа-основания: «Документ о приёмке № 12 от 20.11.2026». */
  label?: string;
  /** Адрес карточки источника в системе. */
  link?: string;
}

export interface ContractViolationTaskInput {
  organizationId: string | number;
  contractId: string | number;
  contractNumber: string;
  contractSubject?: string;
  ikz?: string;
  source: ContractViolationSource;
  sourceRef?: ContractViolationSourceRef;
  notice: ContractViolationNoticeForm;
  /** Кто выявил нарушение — сотрудник приёмки или СМП. */
  detectedByName?: string;
  detectedByEmployeeId?: string | number;
  assignee: ContractServiceRosterRow;
  todayIso?: string;
}

const amountValue = (value?: string): number | null => {
  if (!value) return null;
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) ? normalized : null;
};

/**
 * Этапы уведомления: проверка → требование поставщику → неустойка и реестр.
 * Даты этапов разнесены по сроку исполнения, чтобы в личном кабинете был
 * виден маршрут, а не одна финальная дата.
 */
const noticeSteps = (
  todayIso: string,
  dueIso: string,
): TaskExecutionStep[] => {
  const checkDue = addWorkingDaysIso(todayIso, 2) ?? dueIso;
  const claimDue = addWorkingDaysIso(todayIso, 4) ?? dueIso;

  return [
    {
      id: "notice-step-1",
      order: 1,
      stageLabel: "Проверка",
      title:
        "Проверить документы и зафиксировать факт ненадлежащего исполнения",
      detail:
        "Сверить документы о приёмке (сведения о СМП) с условиями контракта, приложить подтверждения к задаче.",
      expectedArtifact: "Перечень подтверждающих документов",
      dueDate: checkDue,
      isDone: false,
    },
    {
      id: "notice-step-2",
      order: 2,
      stageLabel: "Претензионная работа",
      title: "Направить поставщику требование об устранении нарушения",
      detail:
        "Подготовить и направить требование (претензию), зафиксировать дату направления и способ доставки.",
      expectedArtifact: "Требование (претензия) с отметкой о направлении",
      dueDate: claimDue,
      isDone: false,
    },
    {
      id: "notice-step-3",
      order: 3,
      stageLabel: "Неустойка и реестр",
      title:
        "Начислить неустойку (штраф) и внести сведения в реестр контрактов",
      detail:
        "Рассчитать пени или штраф по условиям контракта, при необходимости оформить служебную записку на подпись руководителя КС.",
      expectedArtifact: "Расчёт неустойки и сведения об исполнении в реестре",
      dueDate: dueIso,
      isDone: false,
    },
  ];
};

/** Пункт приказа № 158н для функции, по которой ставится задача. */
const FUNCTION_CLAUSES: Partial<Record<ContractServiceFunction, string>> = {
  reporting_smnp: "3.5.2",
  reporting_appeals: "3.5.3",
  contract_execution_interaction: "3.4.6",
};

/**
 * Собирает задачу КС из уведомления.
 *
 * Задача ставится по той функции, которой наделён адресат: уведомление по СМП
 * уходит ответственному за СМП/СОНКО (п. 3.5.2), остальные — по претензионной
 * работе (п. 3.5.3). Если функции никому не назначены, задача всё равно
 * создаётся по п. 3.5.3 и попадает руководителю службы. Источник — «система»:
 * уведомление сформировано по факту выявленного нарушения, а не поручением
 * руководителя.
 */
export const buildContractViolationTask = ({
  organizationId,
  contractId,
  contractNumber,
  contractSubject,
  ikz,
  source,
  sourceRef,
  notice,
  detectedByName,
  detectedByEmployeeId,
  assignee,
  todayIso = new Date().toISOString().slice(0, 10),
}: ContractViolationTaskInput): Task => {
  const label = contractViolationSubjectLabels[notice.subject];
  const basis =
    notice.basis?.trim() || contractViolationLegalBasis[notice.subject];
  const amount = amountValue(notice.amount);
  // Функция адресата: по ней же ставится задача, иначе в карточке задачи
  // «Функция КС» не совпадала бы с полномочиями исполнителя
  const taskFunction =
    contractViolationRecipientFunction(assignee, notice.subject) ??
    "reporting_appeals";
  const taskClause = FUNCTION_CLAUSES[taskFunction] ?? "3.5.3";

  const description = [
    `Предмет нарушения: ${label}.`,
    contractViolationSubjectHints[notice.subject],
    sourceRef?.label
      ? `Источник: ${sourceRef.label} (${contractViolationSourceLabels[
          source
        ].toLowerCase()}).`
      : `Источник: ${contractViolationSourceLabels[source].toLowerCase()}.`,
    "",
    `Что выявлено: ${notice.essence.trim()}`,
    `Требование: ${notice.requirement.trim()}`,
    `Основание: ${basis}`,
    amount !== null
      ? `Расчётная неустойка (штраф): ${amount.toLocaleString("ru-RU")} ₽`
      : "",
    "",
    `Контракт: № ${contractNumber}${ikz ? ` · ИКЗ ${ikz}` : ""}${
      contractSubject ? ` · ${contractSubject}` : ""
    }`,
    detectedByName ? `Выявил: ${detectedByName}` : "",
    `Карточка контракта: /contract-registry/${String(contractId)}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    organizationId,
    title: `КС-уведомление: ${label} · контракт № ${contractNumber}`,
    description,
    status: "pending",
    origin: "system",
    functionCode: taskFunction,
    order158nPoolCode: taskFunction,
    order158nClause: taskClause,
    legalBasis: basis,
    requiredInputs: [
      "Документы, подтверждающие нарушение (акт приёмки, сведения о СМП)",
      "Условия контракта об ответственности сторон",
    ],
    completionCriteria:
      "Требование направлено поставщику, неустойка начислена, сведения внесены в реестр контрактов",
    steps: noticeSteps(todayIso, notice.dueDate),
    assigneeId: assignee.employeeId ?? "",
    assigneeName: assignee.employeeFullName ?? "",
    assignedByEmployeeId: detectedByEmployeeId,
    assignedByName: detectedByName,
    dueDate: notice.dueDate,
    createdAt: todayIso,
  };
};

