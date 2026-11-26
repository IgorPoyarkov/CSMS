import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";
import type { ContractProject } from "./contractProject.schema";

/**
 * Поля проекта контракта, унаследованные из утверждённой служебной записки.
 *
 * Правило проекта: значения, зафиксированные утверждённой СЗ, не меняются
 * нигде — ни в извещении, ни в проекте контракта. Для извещения это уже
 * реализовано в `noticeApprovedFields.ts`; здесь тот же подход для проекта
 * контракта: список путей — единственный источник и для блокировки в UI, и для
 * восстановления значений при сохранении.
 *
 * Перечень повторяет `buildContractProjectDraft`: сюда входят только поля,
 * которые предзаполняются из СЗ (или из неё же при отсутствии извещения).
 * Собственные реквизиты проекта — номер, дата, подписанты, агент, банковские
 * реквизиты — остаются редактируемыми.
 */
export const CONTRACT_PROJECT_NOTE_LOCKED_PATHS = [
  // Предмет и объект закупки
  "contractName",
  "subject.objectName",
  "subject.description",
  "subject.okpd2Code",
  "subject.quantity",
  "subject.deliveryPlace",
  // ИКЗ закупки
  "ikz",
  // Реквизиты ЕИС, которые приходят из СЗ
  "eisInfo.protocolName",
  "eisInfo.protocolNumber",
  "eisInfo.protocolPublishDate",
  "eisInfo.appNumber",
  "eisInfo.isStructuredForm",
  "eisInfo.contractProjectFiles",
  // Цена и оплата
  "price.initialMaxPrice",
  "price.finalPrice",
  "price.unitPrice",
  "price.priceBasis",
  "price.paymentProcedure",
  "price.advancePercent",
  "price.advanceAmount",
  "price.paymentTermDays",
  "price.paymentTerms",
  "price.kbk",
  "price.treasurySupport",
  "price.bankSupport",
  // Сроки и приёмка
  "term.startDate",
  "term.endDate",
  "term.validUntil",
  "term.acceptanceProcedure",
  "term.acceptanceTermDays",
  "acceptance.acceptancePlace",
  // Качество и гарантии
  "quality.qualityRequirements",
  "quality.warrantyPeriodMonths",
  "quality.guaranteeObligations",
  // Обеспечения
  "security.bidSecurityRequired",
  "security.bidSecurityPercent",
  "security.performanceSecurityRequired",
  "security.performanceSecurityPercent",
  "security.securityAmount",
  "security.warrantySecurityRequired",
  "security.warrantySecurityPercent",
  // СМП/СОНКО
  "smp.required",
  "smpRequiredPercent",
  "subcontractingSmpNoteNumber",
  "smp.termsText",
  // Изменение и расторжение
  "change.unilateralRefusal",
  "change.terminationConditions",
] as const;

/** Человекочитаемый источник для подсказки у заблокированного поля. */
export const CONTRACT_PROJECT_LOCKED_SOURCE_LABEL = "утверждённая СЗ";

export interface ContractProjectApprovedSources {
  note?: PurchaseNote | null;
}

/**
 * Список заблокированных путей. Значения, переданные СЗ, фиксируются в
 * проекте контракта независимо от статуса записки: править их можно только в
 * самой СЗ, иначе документы разойдутся.
 */
export const getContractProjectLockedPaths = ({
  note,
}: ContractProjectApprovedSources): string[] =>
  note ? [...CONTRACT_PROJECT_NOTE_LOCKED_PATHS] : [];

/** Путь заблокирован сам или является вложенным в заблокированный. */
export const isContractProjectPathLocked = (
  path: string,
  lockedPaths: readonly string[],
): boolean =>
  lockedPaths.some(
    (locked) =>
      path === locked ||
      path.startsWith(`${locked}.`) ||
      path.startsWith(`${locked}[`),
  );

// ─── Работа со значениями ─────────────────────────────────────────────────────

type FormValues = ContractProject & Record<string, unknown>;

const readPath = (values: FormValues, path: string): unknown =>
  path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current !== null && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      values,
    );

const writePath = (values: FormValues, path: string, value: unknown): void => {
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cursor: Record<string, unknown> = values;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const next = cursor[key];
    if (next === null || typeof next !== "object") {
      cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  });
};

/**
 * Возвращает форме значения утверждённых полей. Снимок — это `draft`, который
 * форма получила при предзаполнении: даже если поле удалось изменить в обход
 * `disabled` (автозаполнение, вставка, программный вызов), при сохранении
 * вернётся значение из утверждённой СЗ.
 */
export const restoreContractProjectLockedFields = (
  values: ContractProject,
  snapshot: ContractProject,
  lockedPaths: readonly string[],
): ContractProject => {
  if (lockedPaths.length === 0) return values;
  const restored = structuredClone(values) as FormValues;
  lockedPaths.forEach((path) => {
    writePath(
      restored,
      path,
      structuredClone(readPath(snapshot as FormValues, path)),
    );
  });
  return restored as ContractProject;
};
