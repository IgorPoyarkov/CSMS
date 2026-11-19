/**
 * Сквозная цепочка закупки: план-график → извещение → контракт → СМП.
 *
 * Это наши доменные модели, а не копия XSD Альбома ЕИС. XSD-типы нужны только
 * на выходе (маппер в csms-api), поэтому здесь нет технических полей портала:
 * `versionNumber`, `docIntegrationInfo`, `printFormXslInfo`, `isActual` и т.п.
 * Сгенерированные типы ЕИС лежат отдельно в `../generated` и используются
 * только как `import type` в адаптерах, а не как замена этим моделям.
 *
 * Ключи связи:
 * — `purchaseNumber` — короткий номер закупки в плане-графике (до 4 цифр),
 *   по нему позиция ПГ находит закупку и извещение;
 * — `ikz` — идентификационный код закупки (36 разрядов), сквозной ключ
 *   ПГ → извещение → контракт;
 * — `localId` — id записи в нашей базе, чтобы открыть карточку.
 *
 * Номера ЕИС (`noticeNumber`, `contractRegistryNumber`) появляются только
 * после размещения. Их нельзя придумать заранее: звено хранит их как `null`,
 * а `applyEisIdentifiers` записывает, когда портал вернул номер. Так номер
 * не теряется между шагами и передаётся дальше по цепочке.
 */

/** Шаги цепочки в порядке движения документа. */
export const EIS_CHAIN_STAGES = ["plan", "notice", "contract", "smp"] as const;

export type EisChainStage = (typeof EIS_CHAIN_STAGES)[number];

export const eisChainStageLabels: Record<EisChainStage, string> = {
  plan: "План-график",
  notice: "Извещение",
  contract: "Контракт",
  smp: "Сведения СМП",
};

/**
 * Идентификаторы звена. Все поля nullable: звено может существовать, пока
 * номер ЕИС ещё не присвоен. Пустая строка здесь равна `null`, чтобы проверки
 * не различали «не заполнено» и «заполнено пробелами».
 */
export interface EisChainIdentifiers {
  /** id записи в нашей базе (json-server). */
  localId: string | null;
  /** Номер закупки в плане-графике (до 4 цифр). */
  purchaseNumber: string | null;
  /** Уникальный номер позиции плана-графика. */
  planPositionNumber: string | null;
  /** ИКЗ — 36 разрядов. */
  ikz: string | null;
  /** Номер извещения в ЕИС, приходит после публикации. */
  noticeNumber: string | null;
  /** Реестровый номер контракта в ЕИС — 19 цифр. */
  contractRegistryNumber: string | null;
}

export const emptyEisIdentifiers = (): EisChainIdentifiers => ({
  localId: null,
  purchaseNumber: null,
  planPositionNumber: null,
  ikz: null,
  noticeNumber: null,
  contractRegistryNumber: null,
});

/**
 * Ссылки на наши записи. Нужны, чтобы из цепочки открыть карточку нужного
 * шага, не разыскивая её повторно по номерам.
 */
export interface EisChainRefs {
  planId: string | null;
  planPositionId: string | null;
  procurementId: string | null;
  noticeId: string | null;
  contractId: string | null;
  contractProjectId: string | null;
  smpRecordIds: string[];
}

export const emptyEisChainRefs = (): EisChainRefs => ({
  planId: null,
  planPositionId: null,
  procurementId: null,
  noticeId: null,
  contractId: null,
  contractProjectId: null,
  smpRecordIds: [],
});

/** Одно звено цепочки. */
export interface EisChainLink {
  stage: EisChainStage;
  label: string;
  /** Запись на этом шаге существует в нашей базе. */
  present: boolean;
  identifiers: EisChainIdentifiers;
  refs: EisChainRefs;
  /** Сумма шага в рублях строкой, как в наших схемах. */
  amount: string | null;
  /** Статус шага в наших терминах (статус позиции, извещения, контракта). */
  status: string | null;
  /** Дата размещения/публикации, если она известна. */
  publishedAt: string | null;
}

export type EisChainIssueSeverity = "error" | "warning";

/**
 * Разрыв цепочки. `field` — поле нашей модели, которое надо заполнить;
 * `code` — стабильный ключ для фильтров и тестов.
 */
export interface EisChainIssue {
  stage: EisChainStage;
  code: string;
  message: string;
  severity: EisChainIssueSeverity;
  field: string | null;
}

/** Сводка по привлечению СМП на шаге «Сведения СМП». */
export interface EisChainSmpSummary {
  /** Требуемый процент из служебки/извещения, если требование установлено. */
  requiredPercent: string | null;
  /** Требуемая сумма в рублях, если её можно посчитать. */
  requiredAmount: number | null;
  /** Фактическая сумма принятых договоров с СМП. */
  actualAmount: number;
  /** Всего записей СМП по контракту. */
  recordsCount: number;
  /** Записи, которые ещё не приняты заказчиком. */
  pendingCount: number;
  /** Записи без ИНН субподрядчика. */
  withoutInnCount: number;
  /** Записи без ОКПД2 — их не примет реестр контрактов. */
  withoutOkpd2Count: number;
}

export const emptyEisSmpSummary = (): EisChainSmpSummary => ({
  requiredPercent: null,
  requiredAmount: null,
  actualAmount: 0,
  recordsCount: 0,
  pendingCount: 0,
  withoutInnCount: 0,
  withoutOkpd2Count: 0,
});

/** Прогресс цепочки: какие шаги пройдены. */
export interface EisChainProgress {
  plan: boolean;
  notice: boolean;
  contract: boolean;
  smp: boolean;
  completed: number;
  total: number;
  percent: number;
}

export const emptyEisChainProgress = (): EisChainProgress => ({
  plan: false,
  notice: false,
  contract: false,
  smp: false,
  completed: 0,
  total: EIS_CHAIN_STAGES.length,
  percent: 0,
});

/**
 * Цепочка одной закупки. `key` — стабильный ключ группировки: `purchaseNumber`,
 * если он есть, иначе ИКЗ, иначе id позиции ПГ. `organizationId` нужен для
 * фильтра по заказчику: чужие цепочки в интерфейсе не показываются.
 */
export interface EisChain {
  organizationId: string | null;
  key: string;
  purchaseNumber: string | null;
  ikz: string | null;
  links: EisChainLink[];
  smp: EisChainSmpSummary;
  issues: EisChainIssue[];
  progress: EisChainProgress;
}

/**
 * Номера, которые портал возвращает после размещения. Все поля
 * необязательные: обновляем только то, что реально пришло.
 */
export interface EisIdentifierPatch {
  purchaseNumber?: string;
  planPositionNumber?: string;
  ikz?: string;
  noticeNumber?: string;
  contractRegistryNumber?: string;
}

/** Поиск цепочки по любому из известных идентификаторов. */
export interface EisChainQuery {
  purchaseNumber?: string | null;
  ikz?: string | null;
  localId?: string | number | null;
  noticeNumber?: string | null;
  contractRegistryNumber?: string | null;
}
