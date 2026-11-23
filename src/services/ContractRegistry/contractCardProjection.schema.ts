import { z } from "zod";
import { paymentDeadlineDays } from "./contractRegistry.schema";

/**
 * Проекция публичной карточки контракта ЕИС (`ContractCardViewDto` воркера
 * `eis-parser`) — не сущность нашей БД, а снимок выгрузки: воркер скачивает
 * акты приёмки, решения заказчика, платёжные поручения и сообщения ЭДО.
 *
 * Документ лежит в jsonb-коллекции `contractCardProjections` целиком, поэтому
 * схема читает только те блоки, которые показывает карточка реестра. Значения
 * приходят из XML Казначейства и бывают пустыми: приводим их к `string | null`
 * и `number | null`, чтобы разметка не занималась разбором строк.
 */

/** Текст из XML: пустая строка и пробелы означают «поля нет». */
const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined || String(value).trim() === ""
      ? null
      : String(value),
  );

/** Денежная сумма: в проекции встречается и числом, и строкой с точкой. */
const amount = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed =
      typeof value === "number"
        ? value
        : Number.parseFloat(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  });

// ─── Документ о приёмке (ОН_АКТРЕЗРАБП) ────────────────────────────────────

/** Строка работ/товаров акта: для карточки важен только состав и ОКПД2. */
export const ContractCardActWorkItemSchema = z.object({
  LineNumber: text,
  Name: text,
  Okpd2Code: text,
  Okpd2Name: text,
  KtruCode: text,
  // Идентификаторы КТРУ в ЕИС: ИдКТРУ, технический и ЕА-идентификатор
  KtruId: text,
  TechnicalKtruId: text,
  EaKtruId: text,
  Quantity: text,
  UnitName: text,
  Price: amount,
  SumWithoutVat: amount,
  SumWithVat: amount,
  VatRate: text,
  VatSum: amount,
});

/** Банковские реквизиты стороны акта: нужны для платёжного документа. */
export const ContractCardBankRequisitesSchema = z.object({
  PersonalAccount: text,
  BankBik: text,
  BankName: text,
  CorrespondentAccount: text,
  TreasuryAccount: text,
  CounterpartyName: text,
  RequisitesId: text,
});

/** Сторона договора в акте приёмки: заказчик или подрядчик. */
export const ContractCardPartySchema = z.object({
  Role: text,
  Name: text,
  ShortName: text,
  Inn: text,
  Kpp: text,
  ParticipantId: text,
  Address: text,
  Phone: text,
  Email: text,
  BankRequisites: ContractCardBankRequisitesSchema.nullish(),
});

/** Вложение акта приёмки (КС-2, ЖПР, исполнительная документация). */
export const ContractCardAttachmentSchema = z.object({
  ContentId: text,
  FileName: text,
  Hash: text,
  Extension: text,
  AttachedAt: text,
  DocumentKindName: text,
});

/** Подписант акта приёмки. */
export const ContractCardSignatorySchema = z.object({
  Position: text,
  LastName: text,
  FirstName: text,
  MiddleName: text,
  AuthorityBasis: text,
});

export type ContractCardBankRequisites = z.infer<
  typeof ContractCardBankRequisitesSchema
>;
export type ContractCardParty = z.infer<typeof ContractCardPartySchema>;
export type ContractCardAttachment = z.infer<
  typeof ContractCardAttachmentSchema
>;
export type ContractCardSignatory = z.infer<
  typeof ContractCardSignatorySchema
>;

/** Итоги акта: без НДС, с НДС и сумма налога. */
export const ContractCardActTotalsSchema = z.object({
  SumWithoutVat: amount,
  SumWithVat: amount,
  VatSum: amount,
});

export const ContractCardActSchema = z.object({
  ActNumber: text,
  ActDate: text,
  RegNumber: text,
  Knd: text,
  FileName: text,
  // Идентификаторы выгрузки: нужны, чтобы ссылаться на исходный XML карточки
  FileId: text,
  SourceArchive: text,
  FormVersion: text,
  InfoDate: text,
  InfoTime: text,
  CurrencyCode: text,
  ObjectName: text,
  // Ссылка на контракт из блока ИдДог: в проекции не всегда заполнена
  Contract: z
    .object({
      Number: text,
      Date: text,
      GovernmentContractId: text,
      ContractVersionId: text,
    })
    .nullish(),
  // Этап исполнения: ИдЭтапКонт — GUID, ТехИдЭтапКонт — номер в ЕИС
  Stage: z.object({ Sid: text, TechnicalSid: text, Ikz: text }).nullish(),
  // Период выполнения работ и дата предъявления
  Period: z
    .object({
      StartDate: text,
      EndDate: text,
      PresentationDate: text,
      OperationContent: text,
    })
    .nullish(),
  Totals: ContractCardActTotalsSchema.nullish(),
  WorkItems: z.array(ContractCardActWorkItemSchema).default([]),
  // Стороны договора с реквизитами: из них собирается печатная форма акта
  Parties: z.array(ContractCardPartySchema).default([]),
  // Вложения акта (КС-2, исполнительная документация)
  Attachments: z.array(ContractCardAttachmentSchema).default([]),
  // Подписанты: должность, ФИО, основание полномочий
  Signatories: z.array(ContractCardSignatorySchema).default([]),
});

export type ContractCardAct = z.infer<typeof ContractCardActSchema>;

// ─── Решение заказчика о приёмке (ОН_АКТРЕЗРАБПОК) ─────────────────────────

export const ContractCardDecisionSchema = z.object({
  // Номер и дата акта, к которому относится решение
  PostedDocumentNumber: text,
  PostedDocumentDate: text,
  OperationCode: text,
  CustomerName: text,
  InfoDate: text,
});

export type ContractCardDecision = z.infer<typeof ContractCardDecisionSchema>;

// ─── Платёжное поручение Казначейства ──────────────────────────────────────

export const ContractCardPaymentSchema = z.object({
  DocumentNumber: text,
  DocumentDate: text,
  // Дата списания и дата исполнения: нужны для отметки оплаты в чекпоинтах
  ChargeOffDate: text,
  ExecutionDate: text,
  Sum: amount,
  RegNumber: text,
  Purpose: text,
  PaymentType: text,
  ContractNumber: text,
  ContractDate: text,
  // Ссылка на акт приёмки внутри назначения платежа — по ней платёж
  // сопоставляется с документом о приёмке
  AcceptanceDocumentNumber: text,
  AcceptanceDocumentDate: text,
  // Плательщик: заказчик (казначейство) с ИНН, КПП, счётом и банком
  PayerName: text,
  PayerInn: text,
  PayerKpp: text,
  PayerBik: text,
  PayerAccount: text,
  PayerBankName: text,
  // Получатель платежа — это и есть подрядчик (поставщик, исполнитель):
  // реестр контрактов его не отдаёт, а платёжное поручение содержит
  RecipientName: text,
  RecipientInn: text,
  RecipientKpp: text,
  RecipBik: text,
  RecipAccount: text,
  RecipBankName: text,
  // Идентификатор государственного контракта (ИГК) и КБК
  Igk: text,
  Kbk: text,
  // Сумма прописью из платёжного поручения
  SumInWords: text,
  DocumentId: text,
  FileName: text,
  // Номера электронного документа (ЭД) в казначействе
  EdNo: text,
  EdDate: text,
});

export type ContractCardPayment = z.infer<typeof ContractCardPaymentSchema>;

// ─── Сообщение ЭДО (только для счётчика в шапке секции) ────────────────────

export const ContractCardMessageSchema = z.object({
  MessageType: text,
  EventDate: text,
  EventTime: text,
  OperatorName: text,
});

export type ContractCardMessage = z.infer<typeof ContractCardMessageSchema>;

// ─── Сведения о привлечении СМП/СОНО (подтаблица контракта) ────────────────

/**
 * Субподрядчик из XML контракта ЕИС. `StatusCode` — код статуса ЕИС:
 * 30 — субъект малого предпринимательства, 40 — СОНО. Остальное — реквизиты
 * субдоговора, по которым считается фактический объём привлечения.
 */
export const ContractCardSmpSubcontractorSchema = z.object({
  Inn: text,
  Kpp: text,
  Name: text,
  StatusCode: text,
  StatusName: text,
  ContractSum: amount,
  ContractDate: text,
  ContractNumber: text,
  ContractSubject: text,
  Okpd2Code: text,
});

/** Один XML контракта с блоком subContractorsSum: требование + субподрядчики. */
export const ContractCardSmpSchema = z.object({
  RequirementPercent: amount,
  RequirementSum: amount,
  // Ответственность за неисполнение условия привлечения СМП (текст из XML)
  Responsibility: text,
  Subcontractors: z.array(ContractCardSmpSubcontractorSchema).default([]),
  SourceFile: text,
});

export type ContractCardSmpSubcontractor = z.infer<
  typeof ContractCardSmpSubcontractorSchema
>;
export type ContractCardSmp = z.infer<typeof ContractCardSmpSchema>;

// ─── Реквизиты контракта из HTML-карточки ЕИС ──────────────────────────────

/**
 * Блок `General`: то, чего нет в XML вложений — поставщик с ИНН/КПП, аванс,
 * срок исполнения, ИКЗ, обеспечение и счета сторон. Разбирается воркером из
 * вкладки «Общая информация» и печатной формы карточки, после чего импорт
 * переносит заполненные значения в запись реестра контрактов.
 */
export const ContractCardGeneralSchema = z.object({
  ContractNumber: text,
  ContractDate: text,
  ContractName: text,
  ContractPrice: amount,
  CurrencyName: text,
  Ikz: text,
  CustomerName: text,
  CustomerInn: text,
  CustomerKpp: text,
  SupplierName: text,
  SupplierInn: text,
  SupplierKpp: text,
  AdvancePercent: amount,
  AdvanceAmount: amount,
  PerformanceSecurityAmount: amount,
  ExecutionStartDate: text,
  ExecutionEndDate: text,
  SupplierPersonalAccount: text,
  SupplierAccount: text,
  SupplierBankName: text,
  SupplierBik: text,
  SupplierCorrespondentAccount: text,
  CustomerAccount: text,
  CustomerBankName: text,
  CustomerBik: text,
  SourceFile: text,
});

export type ContractCardGeneral = z.infer<typeof ContractCardGeneralSchema>;

// ─── Документ коллекции `contractCardProjections` ──────────────────────────

/**
 * Служебные ключи (`id`, `regNumber`, `contractId`, `organizationId`) добавляет
 * импорт `scripts/import-contract-card-projections.mjs`: они связывают
 * публичную карточку с записью своего реестра контрактов.
 */
export const ContractCardProjectionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  RegNumber: text,
  regNumber: text,
  contractId: z.union([z.string(), z.number()]).nullish(),
  contractNumber: text,
  importedAt: text,
  eisUrl: text,
  Acts: z.array(ContractCardActSchema).default([]),
  Decisions: z.array(ContractCardDecisionSchema).default([]),
  Payments: z.array(ContractCardPaymentSchema).default([]),
  Messages: z.array(ContractCardMessageSchema).default([]),
  // Подтаблица контракта «Информация о привлечении СМП, СОНО»: у старых
  // выгрузок поля нет вовсе, поэтому default([]) — это «сведений не выгружали»
  Smp: z.array(ContractCardSmpSchema).default([]),
  // Реквизиты контракта из HTML-карточки: у выгрузок до появления блока его
  // нет — тогда null, и карточка добирает подрядчика из платежей и актов.
  General: ContractCardGeneralSchema.nullish(),
});

export type ContractCardProjection = z.infer<
  typeof ContractCardProjectionSchema
>;

export const ContractCardProjectionListSchema = z.array(
  ContractCardProjectionSchema,
);

// ─── Утилиты сопоставления ─────────────────────────────────────────────────

/**
 * Номера документов сравниваем без пробелов, «№» и разделителей: в акте номер
 * «1», а в назначении платежа — «Документ о приемке № 1 от 25.09.2026».
 */
const sameDocumentNumber = (
  left: string | null,
  right: string | null,
): boolean => {
  const normalize = (value: string | null) =>
    (value ?? "").replace(/[^\dA-Za-zА-Яа-яЁё]/g, "").toLowerCase();
  const a = normalize(left);
  return a !== "" && a === normalize(right);
};

/** Итог акта: с НДС, а если портал не заполнил НДС — без НДС. */
export const contractCardActTotal = (act: ContractCardAct): number | null =>
  act.Totals?.SumWithVat ?? act.Totals?.SumWithoutVat ?? null;

/** Сумма всех актов приёмки. */
export const contractCardActsTotal = (acts: ContractCardAct[]): number =>
  acts.reduce((sum, act) => sum + (contractCardActTotal(act) ?? 0), 0);

/** Сумма всех платёжных поручений. */
export const contractCardPaymentsTotal = (
  payments: ContractCardPayment[],
): number =>
  payments.reduce((sum, payment) => sum + (payment.Sum ?? 0), 0);

/** Платежи, в назначении которых указан этот акт приёмки. */
export const contractCardActPayments = (
  act: ContractCardAct,
  payments: ContractCardPayment[],
): ContractCardPayment[] =>
  payments.filter((payment) =>
    sameDocumentNumber(payment.AcceptanceDocumentNumber, act.ActNumber),
  );

/** Оплачено по акту — сумма связанных платёжных поручений. */
export const contractCardActPaidTotal = (
  act: ContractCardAct,
  payments: ContractCardPayment[],
): number => contractCardPaymentsTotal(contractCardActPayments(act, payments));

/** Решение заказчика по акту: сопоставляем по номеру принятого документа. */
export const contractCardActDecision = (
  act: ContractCardAct,
  decisions: ContractCardDecision[],
): ContractCardDecision | null =>
  decisions.find((decision) =>
    sameDocumentNumber(decision.PostedDocumentNumber, act.ActNumber),
  ) ?? null;

// ─── СМП: строки подтаблицы и объёмы ───────────────────────────────────────

/**
 * Строки подтаблицы СМП из всех XML контракта: карточка может содержать
 * несколько версий контракта, поэтому повторённый субдоговор показываем один
 * раз — ключ «ИНН + номер договора», как и при разборе XML в воркере.
 */
export const contractCardSmpRows = (
  smp: ContractCardSmp[],
): ContractCardSmpSubcontractor[] => {
  const seen = new Set<string>();
  const rows: ContractCardSmpSubcontractor[] = [];
  for (const document of smp) {
    for (const row of document.Subcontractors) {
      if (!row.Inn) continue;
      const key = `${row.Inn}|${row.ContractNumber ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  return rows;
};

/** Требуемый объём из карточки ЕИС: процент, сумма и текст ответственности. */
export const contractCardSmpRequirement = (
  smp: ContractCardSmp[],
): { percent: number | null; sum: number | null; responsibility: string | null } => ({
  percent:
    smp.find((item) => item.RequirementPercent !== null)
      ?.RequirementPercent ?? null,
  sum:
    smp.find((item) => item.RequirementSum !== null)?.RequirementSum ?? null,
  responsibility:
    smp.find((item) => item.Responsibility)?.Responsibility ?? null,
});

/** Фактический объём привлечения — сумма субдоговоров со СМП/СОНО. */
export const contractCardSmpTotal = (
  rows: ContractCardSmpSubcontractor[],
): number => rows.reduce((sum, row) => sum + (row.ContractSum ?? 0), 0);

// ─── Сведения для строки реестра и карточки ────────────────────────────────

/**
 * Наименование вида документа, а не предмета: так ЕИС подписывает УПД
 * («Документ об отгрузке товаров (выполнении работ)…»). В `ObjectName` акта
 * работ/услуг лежит предмет, в УПД — только вид документа.
 */
const DOCUMENT_TITLE = /^документ\s/i;

/** Сжимаем пробелы и переводы строк из XML: в разметке они не нужны. */
const tidy = (value: string | null | undefined): string =>
  String(value ?? "").replace(/\s+/g, " ").trim();

/**
 * Предмет контракта.
 *
 * Приоритет источников: блок `General` карточки ЕИС (`ContractName` — это и
 * есть «Предмет контракта» на вкладке «Общая информация»), затем предмет из
 * акта приёмки — у актов работ и услуг в `ObjectName` лежит наименование
 * объекта («Ремонт автомобильной дороги …»), а у УПД там только вид документа.
 * Наименование объекта закупки из поисковой выдачи ЕИС (поле реестра
 * `contractName`) — последний вариант, его подставляет вызывающая сторона.
 */
export const contractCardSubject = (
  projection?: ContractCardProjection | null,
): string => {
  const general = tidy(projection?.General?.ContractName);
  if (general) return general;

  for (const act of projection?.Acts ?? []) {
    const name = tidy(act.ObjectName);
    if (!name || DOCUMENT_TITLE.test(name)) continue;
    return name;
  }

  return "";
};

/**
 * Подрядчик из выгрузки ЕИС.
 *
 * Реестр контрактов поставщика не отдаёт (в 2026 году заполнены единицы
 * записей), поэтому имя берём из карточки: блок `General`, затем получатель
 * платежа, затем сторона акта. Казначейство пишет подрядчика в скобках —
 * «МИНИСТЕРСТВО ФИНАНСОВ … (ООО "ТЕРРА", л/с 712Ч5749001)», — поэтому из
 * скобок вырезаем лицевой счёт, а если скобок нет, оставляем строку целиком.
 */
export const contractCardSupplier = (
  projection?: ContractCardProjection | null,
): { name: string; inn: string } => {
  const general = projection?.General;
  if (general?.SupplierName || general?.SupplierInn) {
    return { name: tidy(general.SupplierName), inn: tidy(general.SupplierInn) };
  }

  for (const payment of projection?.Payments ?? []) {
    const name = tidy(payment.RecipientName);
    if (!name) continue;
    const inside = name.match(/\(([^()]+)\)/)?.[1] ?? "";
    // Кириллица не входит в \w, поэтому границу лицевого счёта задаём явно
    const withoutAccount = inside
      .split(/,?\s*л\/с(?=\s|$)/i)[0]
      .replace(/,$/, "")
      .trim();
    return {
      name: withoutAccount || name,
      inn: tidy(payment.RecipientInn),
    };
  }

  for (const act of projection?.Acts ?? []) {
    for (const party of act.Parties) {
      const role = tidy(party.Role).toLowerCase();
      if (!role.includes("подрядчик") && !role.includes("поставщик")) continue;
      const name = tidy(party.Name) || tidy(party.ShortName);
      if (!name) continue;
      return { name, inn: tidy(party.Inn) };
    }
  }

  return { name: "", inn: "" };
};

/**
 * Срок исполнения из карточки ЕИС (блок `General`). У выгрузок без разбора
 * вкладки «Общая информация» поля пустые — карточка тогда берёт то, что есть
 * в записи реестра.
 */
export const contractCardExecutionPeriod = (
  projection?: ContractCardProjection | null,
): { start: string; end: string } => ({
  start: tidy(projection?.General?.ExecutionStartDate),
  end: tidy(projection?.General?.ExecutionEndDate),
});

/**
 * Вид документа о приёмке. КНД 1115131 — универсальный передаточный документ
 * (УПД); остальные документы ЕИС — документы о приёмке (работ, услуг,
 * товаров). Код КНД показываем рядом: по нему документ ищется в ЕИС и в ЭДО.
 */
export const contractCardActKind = (
  act: ContractCardAct,
): { label: string; code: string | null; isUpd: boolean } => {
  const code = act.Knd;
  const title = tidy(act.ObjectName);
  const looksLikeUpd =
    code === "1115131" || /отгрузке|передаче имущественных/i.test(title);

  return looksLikeUpd
    ? { label: "УПД", code, isUpd: true }
    : { label: "Документ о приёмке", code, isUpd: false };
};

/**
 * Предмет приёмки по структурированному составу акта (`WorkItems`), а не по
 * наименованию вида документа: в актах работ там перечислены позиции сметы,
 * в УПД — отгруженные товары. Длинный состав сворачиваем, полный список
 * показывается в подсказке (`contractCardActSubjectFull`).
 */
export const contractCardActSubject = (
  act: ContractCardAct,
  limit = 3,
): string => {
  const names = act.WorkItems.map((item) => tidy(item.Name)).filter(Boolean);
  if (names.length === 0) {
    return tidy(act.Period?.OperationContent) || tidy(act.ObjectName);
  }
  if (names.length <= limit) return names.join("; ");
  return `${names.slice(0, limit).join("; ")} · ещё ${names.length - limit}`;
};

/** Полный состав акта — для подсказки при наведении на предмет приёмки. */
export const contractCardActSubjectFull = (act: ContractCardAct): string =>
  act.WorkItems.map((item) => tidy(item.Name))
    .filter(Boolean)
    .join("; ") ||
  tidy(act.Period?.OperationContent) ||
  tidy(act.ObjectName);

/**
 * Акт приёмки, на который ссылается платёжное поручение. Обратное
 * сопоставление к `contractCardActPayments`: нужно, чтобы связка «акт ↔ оплата»
 * проверялась с двух сторон и несопоставленный документ был виден.
 */
export const contractCardPaymentAct = (
  payment: ContractCardPayment,
  acts: ContractCardAct[],
): ContractCardAct | null =>
  acts.find((act) =>
    sameDocumentNumber(payment.AcceptanceDocumentNumber, act.ActNumber),
  ) ?? null;

/** Суммы платежей по годам: фактическая разбивка вместо paymentsSumInfo. */
export const contractCardPaymentsByYear = (
  payments: ContractCardPayment[],
): { year: string; sum: number }[] => {
  const byYear = new Map<string, number>();
  for (const payment of payments) {
    const year = tidy(payment.DocumentDate).slice(0, 4) || "без даты";
    byYear.set(year, (byYear.get(year) ?? 0) + (payment.Sum ?? 0));
  }
  return [...byYear.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([year, sum]) => ({ year, sum }));
};

/**
 * Дата подписания документа о приёмке: дата решения заказчика, а если решения
 * ещё нет — дата самого акта. От неё отсчитывается срок оплаты по ч. 13.1
 * ст. 34 44-ФЗ и проверяется срок приёмки.
 */
export const contractCardActAcceptedAt = (
  act: ContractCardAct,
  decisions: ContractCardDecision[],
): string | null => {
  const decision = contractCardActDecision(act, decisions);
  return (
    tidy(decision?.PostedDocumentDate) ||
    tidy(decision?.InfoDate) ||
    tidy(act.ActDate) ||
    null
  );
};

/**
 * Дата из XML → `Date`. В выгрузке встречаются и `ГГГГ-ММ-ДД`, и ISO с временем,
 * и `ДД.ММ.ГГГГ` из ручных записей: без нормализации сравнение сроков молча
 * возвращало бы «нет данных» вместо реальной просрочки.
 */
const toDate = (value: string | null | undefined): Date | null => {
  const raw = tidy(value);
  if (!raw) return null;
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  const iso = dotted
    ? `${dotted[3]}-${dotted[2]}-${dotted[1]}`
    : raw.slice(0, 10);
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Разница дат в календарных днях: `b − a`. Отрицательная — `b` раньше `a`. */
export const contractCardDaysBetween = (
  a: string | null | undefined,
  b: string | null | undefined,
): number | null => {
  const from = toDate(a);
  const to = toDate(b);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

/**
 * Дата, до которой заказчик обязан оплатить принятый документ по ч. 13.1
 * ст. 34 44-ФЗ: 7 рабочих дней с даты подписания документа о приёмке, 10 — при
 * казначейском сопровождении. Отсчёт ведём именно от подписания акта, а не от
 * даты платежа: иначе просрочку заказчика не увидеть.
 */
export const contractCardPaymentDeadline = (
  acceptedAt: string | null,
  treasury = false,
): string | null => {
  const start = toDate(acceptedAt);
  if (!start) return null;
  const date = new Date(start.getTime());
  const days = paymentDeadlineDays(treasury);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
};

/** Первый платёж по акту — для колонки «Оплачен» в таблице актов. */
export const contractCardActPayment = (
  act: ContractCardAct,
  payments: ContractCardPayment[],
): ContractCardPayment | null => contractCardActPayments(act, payments)[0] ?? null;

/**
 * Получатель платежа в читаемом виде. В ЕИС он приходит строкой
 * `МИНИСТЕРСТВО … (ООО "ТЕРРА", л/с 712Ч5749001)`: в скобках — контрагент и его
 * лицевой счёт в казначействе. Лицевой счёт в колонке не нужен, а без него
 * строка хотя бы показывает подрядчика рядом с распорядителем средств.
 */
export const contractCardRecipientName = (
  value: string | null | undefined,
): string => {
  const raw = tidy(value);
  if (!raw) return "";
  return raw
    .replace(/\s*\(([^()]*)\)\s*$/, (_match, inside: string) => {
      const parts = String(inside)
        .split(",")
        .map((part) => part.trim())
        .filter(
          (part) =>
            part &&
            !/^л\/с/i.test(part) &&
            !/^лицевой/i.test(part) &&
            !/^\d{4,}/.test(part),
        );
      return parts.length > 0 ? ` (${parts.join(", ")})` : "";
    })
    .trim();
};




