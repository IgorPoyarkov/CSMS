import { z } from "zod";
import type { ContractRegistryItem } from "../ContractRegistry/contractRegistry.schema";
import {
  CONTRACT_SMP_DOCUMENT_TYPES,
  CONTRACT_SMP_PRICE_TYPES,
  isRecordAccepted,
  type ContractSmpRecord,
} from "../ContractSmp/contractSmp.schema";

/**
 * Личный кабинет подрядчика (Tasks 9, п. 6: «Подрядчик сам загружает нужные
 * для реестра сведения к нам в систему и направляет их заказчику»).
 *
 * Подрядчик — внешний пользователь: своей учётной записи, сотрудника штатки и
 * контрактной службы у него нет. Идентификатором служит ИНН, с которым он
 * записан в реестре контрактов как поставщик (`contractRegistry.supplierInn`):
 * по нему кабинет и подбирает контракты. Заказчик при этом остаётся владельцем
 * данных — `organizationId` записи СМП всегда берётся из контракта заказчика,
 * поэтому сведения попадают в его карточку реестра без дополнительных связей.
 *
 * Разделение полномочий здесь не косметика, а требование п. 6 типовых условий
 * ПП РФ от 23.12.2016 N 1466: подрядчик отвечает за достоверность того, что
 * прислал, а заказчик — за то, что принял и разместил в ЕИС. Поэтому подрядчик
 * заполняет только свою половину полей и не может ни принять, ни отклонить
 * собственные сведения.
 */

export const CONTRACTOR_SESSION_KEY = "contractor_inn";

// ─── Сессия подрядчика ──────────────────────────────────────────────────────

export const ContractorSessionSchema = z.object({
  // ИНН — ключ подбора контрактов; храним нормализованным, только цифры
  inn: z.string(),
  // Наименование берём из реестра контрактов, а не с клавиатуры: так кабинет
  // не может показать чужие контракты из-за опечатки в названии
  name: z.string(),
  // ФИО и должность представителя — подписант сведений от имени подрядчика
  representative: z.string().default(""),
  position: z.string().default(""),
});

export type ContractorSession = z.infer<typeof ContractorSessionSchema>;

export const normalizeContractorInn = (value: string): string =>
  (value ?? "").replace(/\D/g, "");

export const isContractorInnValid = (inn: string): boolean =>
  /^\d{10}$|^\d{12}$/.test(normalizeContractorInn(inn));

export const contractorInnError = (inn: string): string | null => {
  const normalized = normalizeContractorInn(inn);
  if (!normalized) return "Введите ИНН — по нему кабинет найдёт ваши контракты";
  if (normalized.length !== 10 && normalized.length !== 12) {
    return "ИНН содержит 10 или 12 цифр, сейчас введено " + normalized.length;
  }
  return null;
};

/**
 * Подпись вида «Фамилия И. О., должность» — как в бумажных подтверждениях
 * подрядчика. Без представителя остаётся только наименование организации.
 */
export const contractorSignerLabel = (session: ContractorSession): string =>
  [session.representative, session.position].filter(Boolean).join(", ") ||
  session.name;

// ─── Реестр контрактов подрядчика: группировка по заказчикам ────────────────

export interface ContractorCustomerGroup {
  // Организация заказчика из карточки контракта; для импортов ЕИС её может не быть
  organizationId: string;
  customerName: string;
  /** Ключ группы: ИНН заказчика из организаций, если он сопоставлен. */
  customerInn: string;
  contracts: ContractRegistryItem[];
  /** Сумма цен контрактов группы — итог по заказчику. */
  totalPrice: number;
  /** Контракты с требованием о привлечении СМП: именно по ним подрядчик что-то направляет. */
  smpContracts: number;
}

const priceOf = (contract: ContractRegistryItem): number =>
  Number.parseFloat(String(contract.contractPrice ?? "")) || 0;

/**
 * Контракты подрядчика по заказчикам. Группировка идёт по `organizationId`
 * (он же ключ разграничения данных у заказчика), а отображаемое наименование
 * берётся из `customerName` самой карточки — так список читается так же, как
 * реестр на стороне заказчика.
 *
 * `id` у карточки организации опционален, поэтому и в параметре он опциональный.
 */
export const groupContractsByCustomer = (
  contracts: ContractRegistryItem[],
  organizations: { id?: string | number; inn?: string }[] = [],
): ContractorCustomerGroup[] => {
  const groups = new Map<string, ContractorCustomerGroup>();

  for (const contract of contracts) {
    const key = String(contract.organizationId ?? "");
    const customerName = contract.customerName?.trim() || "Заказчик не указан";

    let group = groups.get(key);
    if (!group) {
      const organization = organizations.find(
        (item) => String(item.id) === key,
      );
      group = {
        organizationId: key,
        customerName,
        customerInn: organization?.inn ?? "",
        contracts: [],
        totalPrice: 0,
        smpContracts: 0,
      };
      groups.set(key, group);
    }

    group.contracts.push(contract);
    group.totalPrice += priceOf(contract);
    if (hasSmpRequirement(contract)) group.smpContracts += 1;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      // Внутри заказчика — свежие контракты наверху: подрядчик работает по
      // действующим, а не по закрытым
      contracts: [...group.contracts].sort((left, right) =>
        String(right.contractDate ?? "").localeCompare(
          String(left.contractDate ?? ""),
        ),
      ),
    }))
    .sort(
      (left, right) =>
        right.contracts.length - left.contracts.length ||
        left.customerName.localeCompare(right.customerName, "ru"),
    );
};

// ─── Требование о привлечении СМП ───────────────────────────────────────────

/**
 * Обязан ли подрядчик привлекать СМП по контракту: процент из служебки
 * (ч. 5 ст. 30 44-ФЗ, наследуется по цепочке ПГ → СЗ → контракт). Без него
 * направлять сведения не нужно и форма не открывается.
 */
export const hasSmpRequirement = (contract: ContractRegistryItem): boolean => {
  const percent = Number.parseFloat(String(contract.smpRequiredPercent ?? ""));
  return Number.isFinite(percent) && percent > 0;
};

export const smpRequiredPercentOf = (
  contract: ContractRegistryItem,
): number | null => {
  if (!hasSmpRequirement(contract)) return null;
  return Number.parseFloat(String(contract.smpRequiredPercent ?? ""));
};

/**
 * Что подрядчик уже направлял по контракту и как это принял заказчик.
 * Раздельный учёт «отправлено» и «зачтено» нужен самому подрядчику: объём по
 * п. 1 типовых условий закрывают только принятые заказчиком договоры, поэтому
 * отправленное, но отклонённое, — это всё ещё недогруз.
 */
export interface ContractorSmpSummary {
  total: number;
  submitted: number;
  accepted: number;
  rejected: number;
  pushedToEis: number;
  /** Отправленные суммы по договорам с СМП — «в ожидании приёмки». */
  pendingAmount: number;
}

const amountOf = (record: ContractSmpRecord): number =>
  Number.parseFloat(String(record.amount ?? "")) || 0;

export const summarizeContractorSmpRecords = (
  records: ContractSmpRecord[],
): ContractorSmpSummary => {
  const summary: ContractorSmpSummary = {
    total: records.length,
    submitted: 0,
    accepted: 0,
    rejected: 0,
    pushedToEis: 0,
    pendingAmount: 0,
  };

  for (const record of records) {
    if (record.status === "pushedToEis") summary.pushedToEis += 1;
    else if (record.status === "accepted") summary.accepted += 1;
    else if (record.status === "rejected") summary.rejected += 1;
    else summary.submitted += 1;

    // В зачёт объёма идут только договоры с субподрядчиками из СМП/СОНКО,
    // акты и платёжки сами по себе объём не закрывают
    const countsForVolume =
      record.documentType === "subContract" &&
      record.isSmpSubject &&
      !isRecordAccepted(record);

    if (countsForVolume && record.status !== "rejected") {
      summary.pendingAmount += amountOf(record);
    }
  }

  return summary;
};

/**
 * Подрядчик может править и отзывать только то, что заказчик ещё не увидел:
 * после приёмки запись становится документом заказчика и меняется им.
 */
export const isRecordEditableByContractor = (
  record: ContractSmpRecord,
): boolean => record.status === "submitted" && !record.customerConfirmedAt;

/** Подрядчик подтверждает достоверность при отправке (п. 6 типовых условий). */
export const isRecordSubmittedByContractor = (
  record: ContractSmpRecord,
): boolean => Boolean(record.supplierConfirmedAt);

/** Статус контракта для подрядчика своими словами — что от него сейчас ждут. */
export type ContractorAction =
  | "nothing"
  | "submit"
  | "shortfall"
  | "closed"
  | "rejected";

export const contractorActionOf = (
  contract: ContractRegistryItem,
  records: ContractSmpRecord[],
  volume: { required: number; actual: number; isComplete: boolean },
): { action: ContractorAction; hint: string } => {
  if (!hasSmpRequirement(contract)) {
    return {
      action: "nothing",
      hint: "Требование о привлечении СМП по контракту не установлено",
    };
  }

  const rejected = records.filter((item) => item.status === "rejected").length;

  if (volume.isComplete) {
    return {
      action: "closed",
      hint: "Требуемый объём закрыт принятыми договорами с СМП",
    };
  }

  if (rejected > 0) {
    return {
      action: "rejected",
      hint: `Заказчик отклонил записей: ${rejected} — направьте заново`,
    };
  }

  if (records.length === 0) {
    return {
      action: "submit",
      hint: "Сведения о привлечении СМП ещё не направлялись",
    };
  }

  return {
    action: "shortfall",
    hint: `Недобор ${Math.max(
      0,
      volume.required - volume.actual,
    ).toLocaleString("ru-RU")} ₽ от требуемого объёма`,
  };
};

// ─── Форма направления сведений ─────────────────────────────────────────────

const optionalText = (max = 300) =>
  z.string().max(max).optional().or(z.literal(""));

const optionalMoney = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const optionalDate = () =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional();

/**
 * Поля, которые заполняет подрядчик. Это подмножество `ContractSmpRecordSchema`
 * без полей заказчика: подтверждение приёмки, статус принятия и реквизиты
 * публикации в ЕИС подрядчику недоступны — иначе он сам себе выставил бы
 * «принято», а это ровно то, ради чего введены два раздельных подтверждения
 * достоверности (п. 6 типовых условий ПП РФ от 23.12.2016 N 1466).
 */
export const ContractorSmpDraftSchema = z.object({
  documentType: z.enum(CONTRACT_SMP_DOCUMENT_TYPES),
  documentNumber: z.string().trim().min(1, "Укажите номер документа"),
  documentDate: z
    .string()
    .min(1, "Укажите дату документа")
    .refine(
      (value) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    ),
  amount: optionalMoney(),
  okpd2Code: z
    .string()
    .refine(
      (value) => value === "" || /^\d{2}(\.\d+)*$/.test(value),
      "ОКПД2: цифры и точки, например 43.31.10",
    )
    .optional(),
  priceType: z.enum(CONTRACT_SMP_PRICE_TYPES).default("contract"),
  unitPrice: optionalMoney(),
  subject: optionalText(500),
  period: optionalText(100),

  supplierName: z
    .string()
    .trim()
    .min(3, "Укажите субподрядчика, с которым заключён договор"),
  supplierInn: z
    .string()
    .refine(
      (value) => value === "" || /^\d{10}(\d{2})?$/.test(value),
      "ИНН — 10 или 12 цифр",
    )
    .optional(),
  supplierKpp: z
    .string()
    .refine((value) => value === "" || /^\d{9}$/.test(value), "КПП — 9 цифр")
    .optional(),
  isSmpSubject: z.boolean().default(true),

  // Акт приёмки и платёжное поручение относятся к конкретному договору с
  // субподрядчиком: по этой связи заказчик видит, какой договор они закрывают
  subContractRecordId: z.union([z.string(), z.number()]).optional(),

  // п. 3 и п. 4 типовых условий — от них зависят сроки
  isReplacementSubContract: z.boolean().default(false),
  paidEarlierThanContractSchedule: z.boolean().default(false),
  paidToSupplierDate: optionalDate(),
  acceptanceSignedDate: optionalDate(),

  sourceFileName: optionalText(255),
  comment: optionalText(1000),

  // Отдельное подтверждение, а не «сохранили и ладно»: оно несёт
  // ответственность за недостоверные сведения
  confirmAccurate: z
    .boolean()
    .refine((value) => value === true, "Подтвердите достоверность сведений"),
});

export type ContractorSmpDraftForm = z.input<typeof ContractorSmpDraftSchema>;

export const emptyContractorSmpDraft = (): ContractorSmpDraftForm => ({
  documentType: "subContract",
  documentNumber: "",
  documentDate: new Date().toISOString().slice(0, 10),
  amount: "",
  okpd2Code: "",
  priceType: "contract",
  unitPrice: "",
  subject: "",
  period: "",
  supplierName: "",
  supplierInn: "",
  supplierKpp: "",
  isSmpSubject: true,
  subContractRecordId: "",
  isReplacementSubContract: false,
  paidEarlierThanContractSchedule: false,
  paidToSupplierDate: "",
  acceptanceSignedDate: "",
  sourceFileName: "",
  comment: "",
  confirmAccurate: false,
});

/** Черновик из уже отправленной записи — для правки до приёмки заказчиком. */
export const contractorSmpDraftOf = (
  record: ContractSmpRecord,
): ContractorSmpDraftForm => ({
  documentType: record.documentType,
  documentNumber: record.documentNumber ?? "",
  documentDate: record.documentDate ?? "",
  amount: record.amount ?? "",
  okpd2Code: record.okpd2Code ?? "",
  priceType: record.priceType ?? "contract",
  unitPrice: record.unitPrice ?? "",
  subject: record.subject ?? "",
  period: record.period ?? "",
  supplierName: record.supplierName ?? "",
  supplierInn: record.supplierInn ?? "",
  supplierKpp: record.supplierKpp ?? "",
  isSmpSubject: record.isSmpSubject ?? true,
  subContractRecordId: record.subContractRecordId ?? "",
  isReplacementSubContract: record.isReplacementSubContract ?? false,
  paidEarlierThanContractSchedule:
    record.paidEarlierThanContractSchedule ?? false,
  paidToSupplierDate: record.paidToSupplierDate ?? "",
  acceptanceSignedDate: record.acceptanceSignedDate ?? "",
  sourceFileName: record.sourceFileName ?? "",
  comment: record.comment ?? "",
  // Правка — это новые сведения, а не продолжение старых: достоверность
  // подтверждается заново, галочку нельзя унаследовать от прежней отправки
  confirmAccurate: false,
});
