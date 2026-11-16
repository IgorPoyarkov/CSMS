import {
  addBusinessDays,
  businessDaysAfter,
  businessDaysUntil,
} from "../Calendar/calendar.schema";
import {
  CUSTOMER_EIS_DEADLINE_RULE,
  SMP_DEADLINE_RULES,
  SMP_PAYMENT_EARLY_DEADLINE_WORKING_DAYS,
  smpDeadlineRuleByCode,
} from "./pp1466";
import {
  contractSmpDocumentTypeLabels,
  isRecordAccepted,
  receivedDateOf,
  type ContractSmpRecord,
} from "./contractSmp.schema";

/**
 * Расчёт сроков по типовым условиям привлечения СМП/СОНКО (Tasks 9, п. 7,
 * п/п 5) — чистые функции, без React и запросов: их можно проверить руками
 * на сидовых записях.
 *
 * Пять сроков подрядчика по ПП РФ от 23.12.2016 N 1466:
 *  — п. 2: 5 рабочих дней со дня заключения договора с субподрядчиком —
 *    декларация о принадлежности к СМП/СОНКО и заверенная копия договора;
 *  — п. 3: те же документы при замене субподрядчика — 5 дней со дня договора
 *    с новым субподрядчиком;
 *  — п. 4 (а): 10 рабочих дней со дня оплаты перед субподрядчиком — копии
 *    документов о приёмке;
 *  — п. 4 (б): копии платёжных поручений — 10 рабочих дней, если оплата прошла
 *    раньше срока по контракту с заказчиком, иначе 5 рабочих дней со дня оплаты;
 *  — п. 5: 7 рабочих дней с даты подписания подрядчиком документа о приёмке —
 *    оплата обязательств перед субподрядчиком.
 *
 * Отдельный контур — срок заказчика: 3 рабочих дня с момента получения сведений
 * (ч. 3 ст. 103 44-ФЗ). Два контура возвращаются раздельно, чтобы в интерфейсе
 * подсветить разными цветами, кто именно накосячил.
 *
 * Рабочие дни считаются по производственному календарю проекта
 * (services/Calendar): выходные и праздничные дни по ст. 112 ТК РФ. Дни переноса
 * передают списком `extraHolidays` — их Правительство утверждает ежегодно.
 */

export type SmpDeadlineContour = "supplier" | "customer";

export type SmpDeadlineStatus = "met" | "pending" | "overdue" | "no_basis";

export const smpDeadlineStatusLabels: Record<SmpDeadlineStatus, string> = {
  met: "в срок",
  pending: "ожидается",
  overdue: "просрочено",
  no_basis: "нет основания для расчёта",
};

export interface SmpDeadlineItem {
  // Устойчивый ключ строки таблицы
  key: string;
  ruleCode: string;
  // Пункт типовых условий или норма закона
  clause: string;
  title: string;
  basis: string;
  contour: SmpDeadlineContour;
  workingDays: number;
  // Дата события, от которого считается срок
  startDate: string;
  // Дата наступления срока
  dueDate: string;
  // Подпись документа, к которому относится срок
  documentLabel: string;
  supplierName?: string;
  recordId?: string | number;
  status: SmpDeadlineStatus;
  // Просрочка в рабочих днях (0, если срок не нарушен)
  overdueBusinessDays: number;
  // Рабочих дней до срока; отрицательное — сколько дней просрочено
  remainingBusinessDays: number;
  // id акта из legalActs — ссылка на норму, а не текст
  actId: string;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const documentLabel = (record: ContractSmpRecord): string =>
  `${contractSmpDocumentTypeLabels[record.documentType]} № ${
    record.documentNumber || "—"
  } от ${record.documentDate || "—"}`;

// Документы, которые подрядчик приложил к договору субподрядчика: по прямой
// ссылке, а если ссылки нет — по ИНН того же субподрядчика
const linkedDocuments = (
  subContract: ContractSmpRecord,
  records: ContractSmpRecord[],
  type: ContractSmpRecord["documentType"],
): ContractSmpRecord[] =>
  records.filter((record) => {
    if (record.documentType !== type) return false;
    if (String(record.id) === String(subContract.id)) return false;

    if (
      record.subContractRecordId !== undefined &&
      record.subContractRecordId !== ""
    ) {
      return String(record.subContractRecordId) === String(subContract.id);
    }

    return Boolean(record.supplierInn) && record.supplierInn === subContract.supplierInn;
  });

// Представлен ли документ до наступления срока
const submittedWithin = (
  documents: ContractSmpRecord[],
  dueDate: string,
): boolean =>
  documents.some(
    (document) =>
      document.status !== "rejected" &&
      receivedDateOf(document) !== "" &&
      receivedDateOf(document) <= dueDate,
  );

interface DeadlineRequest {
  ruleCode: string;
  clause: string;
  title: string;
  basis: string;
  contour: SmpDeadlineContour;
  workingDays: number;
  startDate: string | undefined;
  record: ContractSmpRecord;
  documentLabel: string;
  // Признак «сдано в срок» — проверяется уже по вычисленной дате срока
  isMet?: (dueDate: string) => boolean;
  actId: string;
}

const buildDeadline = (
  request: DeadlineRequest,
  today: string,
  extraHolidays: string[],
): SmpDeadlineItem => {
  const startDate = request.startDate ?? "";
  const dueDate = startDate
    ? addBusinessDays(startDate, request.workingDays, extraHolidays)
    : "";

  const base = {
    key: `${request.ruleCode}-${String(request.record.id ?? request.documentLabel)}`,
    ruleCode: request.ruleCode,
    clause: request.clause,
    title: request.title,
    basis: request.basis,
    contour: request.contour,
    workingDays: request.workingDays,
    startDate,
    dueDate,
    documentLabel: request.documentLabel,
    supplierName: request.record.supplierName,
    recordId: request.record.id,
    actId: request.actId,
  };

  if (!dueDate) {
    return {
      ...base,
      status: "no_basis",
      overdueBusinessDays: 0,
      remainingBusinessDays: 0,
    };
  }

  const overdueBusinessDays = businessDaysAfter(dueDate, today, extraHolidays);
  const remainingBusinessDays = businessDaysUntil(dueDate, today, extraHolidays);
  const met = request.isMet?.(dueDate) ?? false;

  return {
    ...base,
    status: met ? "met" : overdueBusinessDays > 0 ? "overdue" : "pending",
    overdueBusinessDays: met ? 0 : overdueBusinessDays,
    remainingBusinessDays: met ? 0 : remainingBusinessDays,
  };
};

const ruleOr = (code: "p2" | "p3" | "p4a" | "p4b" | "p5") =>
  smpDeadlineRuleByCode(code) ?? SMP_DEADLINE_RULES[0];

// Сроки подрядчика по всем записям контракта
export const computeSupplierDeadlines = (
  records: ContractSmpRecord[],
  options: { today?: string; extraHolidays?: string[] } = {},
): SmpDeadlineItem[] => {
  const today = options.today ?? todayIso();
  const extraHolidays = options.extraHolidays ?? [];
  const deadlines: SmpDeadlineItem[] = [];

  records.forEach((record) => {
    // п. 2 и п. 3 — декларация и заверенная копия договора с субподрядчиком
    if (record.documentType === "subContract") {
      const rule = ruleOr(record.isReplacementSubContract ? "p3" : "p2");

      deadlines.push(
        buildDeadline(
          {
            ruleCode: rule.code,
            clause: rule.clause,
            title: rule.title,
            basis: rule.basis,
            contour: "supplier",
            workingDays: rule.workingDays,
            startDate: record.documentDate,
            record,
            documentLabel: documentLabel(record),
            actId: rule.actId,
            isMet: (dueDate) =>
              submittedWithin(
                linkedDocuments(record, records, "declaration"),
                dueDate,
              ),
          },
          today,
          extraHolidays,
        ),
      );

      // п. 4 — копии документов о приёмке и платёжных поручений считаются
      // со дня оплаты обязательств перед субподрядчиком
      if (record.paidToSupplierDate) {
        const rule4a = ruleOr("p4a");
        deadlines.push(
          buildDeadline(
            {
              ruleCode: rule4a.code,
              clause: rule4a.clause,
              title: rule4a.title,
              basis: rule4a.basis,
              contour: "supplier",
              workingDays: rule4a.workingDays,
              startDate: record.paidToSupplierDate,
              record,
              documentLabel: `Оплата по договору № ${record.documentNumber}`,
              actId: rule4a.actId,
              isMet: (dueDate) =>
                submittedWithin(
                  linkedDocuments(record, records, "acceptance"),
                  dueDate,
                ),
            },
            today,
            extraHolidays,
          ),
        );

        const rule4b = ruleOr("p4b");
        const workingDays = record.paidEarlierThanContractSchedule
          ? SMP_PAYMENT_EARLY_DEADLINE_WORKING_DAYS
          : rule4b.workingDays;

        deadlines.push(
          buildDeadline(
            {
              ruleCode: rule4b.code,
              clause: rule4b.clause,
              // п. 4: другой срок, когда оплата прошла раньше срока контракта
              title: record.paidEarlierThanContractSchedule
                ? `${rule4b.title} (оплата раньше срока по контракту)`
                : rule4b.title,
              basis: rule4b.basis,
              contour: "supplier",
              workingDays,
              startDate: record.paidToSupplierDate,
              record,
              documentLabel: `Оплата по договору № ${record.documentNumber}`,
              actId: rule4b.actId,
              isMet: (dueDate) =>
                submittedWithin(
                  linkedDocuments(record, records, "payment"),
                  dueDate,
                ),
            },
            today,
            extraHolidays,
          ),
        );
      }
    }

    // п. 5 — подрядчик платит субподрядчику в течение 7 рабочих дней с даты
    // подписания им документа о приёмке
    if (record.documentType === "acceptance" && record.acceptanceSignedDate) {
      const rule5 = ruleOr("p5");
      const parentSubContract = records.find(
        (candidate) =>
          candidate.documentType === "subContract" &&
          ((record.subContractRecordId !== undefined &&
            record.subContractRecordId !== "" &&
            String(candidate.id) === String(record.subContractRecordId)) ||
            (Boolean(record.supplierInn) &&
              record.supplierInn === candidate.supplierInn)),
      );

      deadlines.push(
        buildDeadline(
          {
            ruleCode: rule5.code,
            clause: rule5.clause,
            title: rule5.title,
            basis: rule5.basis,
            contour: "supplier",
            workingDays: rule5.workingDays,
            startDate: record.acceptanceSignedDate,
            record,
            documentLabel: documentLabel(record),
            actId: rule5.actId,
            isMet: (dueDate) =>
              Boolean(
                parentSubContract?.paidToSupplierDate &&
                  parentSubContract.paidToSupplierDate <= dueDate,
              ) ||
              submittedWithin(linkedDocuments(record, records, "payment"), dueDate),
          },
          today,
          extraHolidays,
        ),
      );
    }
  });

  return deadlines;
};

// Срок заказчика: 3 рабочих дня с момента получения сведений (ч. 3 ст. 103)
export const computeCustomerDeadlines = (
  records: ContractSmpRecord[],
  options: { today?: string; extraHolidays?: string[] } = {},
): SmpDeadlineItem[] => {
  const today = options.today ?? todayIso();
  const extraHolidays = options.extraHolidays ?? [];

  return records
    .filter((record) => record.status !== "rejected")
    .map((record) =>
      buildDeadline(
        {
          ruleCode: CUSTOMER_EIS_DEADLINE_RULE.code,
          clause: CUSTOMER_EIS_DEADLINE_RULE.clause,
          title: CUSTOMER_EIS_DEADLINE_RULE.title,
          basis: `${CUSTOMER_EIS_DEADLINE_RULE.basis} (${documentLabel(record)})`,
          contour: "customer",
          workingDays: CUSTOMER_EIS_DEADLINE_RULE.workingDays,
          startDate: receivedDateOf(record),
          record,
          documentLabel: documentLabel(record),
          actId: CUSTOMER_EIS_DEADLINE_RULE.actId,
          // Заказчик успел, если сведения уже выгружены в ЕИС
          isMet: () => record.status === "pushedToEis",
        },
        today,
        extraHolidays,
      ),
    );
};

export interface SmpDeadlines {
  supplier: SmpDeadlineItem[];
  customer: SmpDeadlineItem[];
  all: SmpDeadlineItem[];
  // Просрочки по каждому контуру — для подсветки «кто виноват»
  supplierOverdue: SmpDeadlineItem[];
  customerOverdue: SmpDeadlineItem[];
}

// Полный расчёт: два контура раздельно плюс общим списком
export const computeSmpDeadlines = (
  records: ContractSmpRecord[],
  options: { today?: string; extraHolidays?: string[] } = {},
): SmpDeadlines => {
  const supplier = computeSupplierDeadlines(records, options);
  const customer = computeCustomerDeadlines(records, options);
  const all = [...supplier, ...customer];

  return {
    supplier,
    customer,
    all,
    supplierOverdue: supplier.filter((item) => item.status === "overdue"),
    customerOverdue: customer.filter((item) => item.status === "overdue"),
  };
};

// Просрочка подрядчика, за которую начисляется неустойка: только принятые
// заказчиком сведения, отклонённые считать нельзя
export const overdueOfAcceptedRecords = (
  records: ContractSmpRecord[],
  options: { today?: string; extraHolidays?: string[] } = {},
): SmpDeadlineItem[] => {
  const acceptedIds = new Set(
    records.filter(isRecordAccepted).map((record) => String(record.id)),
  );

  return computeSupplierDeadlines(records, options).filter(
    (item) =>
      item.status === "overdue" &&
      (item.recordId === undefined || acceptedIds.has(String(item.recordId))),
  );
};
