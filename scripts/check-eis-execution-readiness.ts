import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EIS_BASE_DOCUMENT_TYPES,
  EIS_PAY_DOCUMENT_TYPE_CODES,
  EIS_RUBLE_CURRENCY_CODE,
  acceptanceEisReadiness,
  acceptanceInputEisReadiness,
  contractRegistryNumber,
  eisXmlReadinessBadge,
  eisXmlReadinessText,
  isKbk,
  isOkpd2Code,
  okeiCodeFromUnit,
  paymentEisReadiness,
  paymentFormBlocking,
} from "../src/services/Eis/eisExecutionReadiness";
import type {
  AcceptanceInput,
  AcceptancePosition,
  AcceptanceResponse,
} from "../src/services/Acceptance/acceptance.types";
import {
  ContractPaymentSchema,
  buildPayDocumentInfo,
  paymentXsdCodeFor,
} from "../src/services/ContractRegistry/contractRegistry.schema";

/**
 * Smoke-проверка готовности приёмки и оплаты к XML ЕИС (Альбом 17.0).
 *
 * Проверяются: коды `payDocumentType` из XSD (PC/PN/RC — не этапы расчёта),
 * обязательные поля `contractExecutionPaymentType` и
 * `contractExecutionDocAcceptanceType`, разблокировка по мере заполнения,
 * отсутствие ложных блокировок у запланированного платежа и форма значений
 * (КБК, ОКПД2, ОКЕИ, деньги).
 *
 * Запуск: npm run check:eis-execution.
 */

// 1. Коды типов платежа: аванс/промежуточный/финальный — это не PC/PN/RC.
// PN в XSD — неустойка, RC — возврат; прежний маппинг отправлял в ЕИС
// «возврат» вместо окончательного расчёта.
assert.equal(EIS_PAY_DOCUMENT_TYPE_CODES.length, 9);
assert.ok(EIS_PAY_DOCUMENT_TYPE_CODES.includes("PN"));
assert.ok(EIS_BASE_DOCUMENT_TYPES.includes("A"));
assert.equal(paymentXsdCodeFor("advance"), "PC");
assert.equal(paymentXsdCodeFor("intermediate"), "PC");
assert.equal(paymentXsdCodeFor("final"), "PC");
assert.equal(EIS_RUBLE_CURRENCY_CODE, "643");

// 2. Реестровый номер: у импортированных карточек он лежит в contractNumber
assert.equal(
  contractRegistryNumber({ contractNumber: "0373100000123000001" }),
  "0373100000123000001",
);
assert.equal(
  contractRegistryNumber({
    contractNumber: "17АН_26",
    eisRegistryNumber: "0373100000123000002",
  }),
  "0373100000123000002",
);
assert.equal(contractRegistryNumber({ contractNumber: "17АН_26" }), "");

// 3. Формы значений
assert.ok(isKbk("12345678901234567890"));
assert.ok(!isKbk("1234567890123456789"));
assert.ok(isOkpd2Code("2630111900"));
assert.ok(!isOkpd2Code("26.30"));
assert.equal(okeiCodeFromUnit("шт"), "796");
assert.equal(okeiCodeFromUnit("796"), "796");
assert.equal(okeiCodeFromUnit("ведро"), null);

const contract = {
  eisRegistryNumber: "0373100000123000001",
  supplierInn: "7701234567",
};

const goodPayment = {
  paymentDocumentNumber: "145",
  paymentDate: "2026-03-05",
  amount: "125000.00",
  paymentType: "final" as const,
  paymentTypeCode: undefined,
  treasuryExecution: false,
  baseDocumentType: "C" as const,
  invoiceNumber: "СЧ-12",
  invoiceDate: "2026-03-01",
  status: "sent" as const,
};

// 4. Полный платёж проходит проверку, неполный — нет
const readyPayment = paymentEisReadiness(goodPayment, contract, {
  now: "2026-03-06T10:00:00+03:00",
});
assert.equal(
  readyPayment.ok,
  true,
  readyPayment.blocking.map((issue) => issue.message).join("; "),
);
assert.equal(readyPayment.xsdType, "contractExecutionPaymentType");
assert.equal(eisXmlReadinessText(readyPayment), "");

const emptyPayment = paymentEisReadiness(
  { ...goodPayment, paymentDocumentNumber: "", paymentDate: "", amount: "" },
  contract,
);
assert.equal(emptyPayment.ok, false);
assert.equal(emptyPayment.blocking.length, 3);
assert.ok(eisXmlReadinessText(emptyPayment).includes("payDocumentNum"));
assert.ok(eisXmlReadinessBadge(emptyPayment).startsWith("не готов"));

// Планируемый платёж без номера и даты не блокируется: документов ещё нет
const plannedPayment = paymentEisReadiness(
  {
    ...goodPayment,
    paymentDocumentNumber: "",
    paymentDate: "",
    status: "scheduled",
  },
  contract,
);
assert.equal(plannedPayment.ok, true);
assert.ok(plannedPayment.warnings.length >= 2);

// 5. Казначейское исполнение требует КБК
const treasury = paymentEisReadiness(
  { ...goodPayment, treasuryExecution: true, kbk: "" },
  contract,
);
assert.equal(treasury.ok, false);
assert.ok(treasury.blocking.some((issue) => issue.path.endsWith("/KBK")));

const treasuryWithKbk = paymentEisReadiness(
  { ...goodPayment, treasuryExecution: true, kbk: "12345678901234567890" },
  contract,
);
assert.equal(treasuryWithKbk.ok, true);

const badKbk = paymentEisReadiness(
  { ...goodPayment, treasuryExecution: true, kbk: "12345" },
  contract,
);
assert.equal(badKbk.ok, false);

// 6. Сумма — moneyPositiveType: без нуля и третьего знака после запятой
for (const amount of ["0", "0.00", "12.345", "-5.00", "abc"]) {
  assert.equal(
    paymentEisReadiness({ ...goodPayment, amount }, contract).ok,
    false,
    `сумма «${amount}» должна блокироваться`,
  );
}

// 7. Возврат и основание «акт приёмки»
const refund = paymentEisReadiness(
  { ...goodPayment, paymentTypeCode: "RC" },
  contract,
);
assert.equal(refund.ok, true);
assert.ok(refund.warnings.some((issue) => issue.path.endsWith("/payDocumentType")));

const acceptanceBase = paymentEisReadiness(
  { ...goodPayment, baseDocumentType: "A", baseDocumentSid: "" },
  contract,
);
assert.equal(acceptanceBase.ok, false);
assert.ok(acceptanceBase.blocking.some((issue) => issue.path.includes("RDICSid")));

const acceptanceBaseWithSid = paymentEisReadiness(
  {
    ...goodPayment,
    baseDocumentType: "A",
    baseDocumentSid: "123e4567-e89b-12d3-a456-426614174000",
    baseDocumentNumber: "А-7",
    baseDocumentDate: "2026-03-01",
  },
  contract,
);
assert.equal(acceptanceBaseWithSid.ok, true);

// 8. Без реестрового номера контракта платёж не адресуется
assert.equal(
  paymentEisReadiness(goodPayment, { contractNumber: "17АН_26" }).ok,
  false,
);

// 8a. Но сохранение факта оплаты блокируют только поля самого платежа:
// реквизиты контракта правятся в карточке, а не в форме платежа
const noContractNumber = paymentEisReadiness(goodPayment, {
  contractNumber: "17АН_26",
  supplierInn: "7701234567",
});
assert.equal(noContractNumber.ok, false);
assert.equal(paymentFormBlocking(noContractNumber).length, 0);
assert.equal(paymentFormBlocking(emptyPayment).length, 3);

// 9. buildPayDocumentInfo: поля XSD на месте, валюта — рубли
const paymentRecord = ContractPaymentSchema.parse({
  contractId: "1",
  ...goodPayment,
  kbk: "12345678901234567890",
});
const payInfo = buildPayDocumentInfo(paymentRecord);
assert.equal(payInfo.payDocumentType, "PC");
assert.equal(payInfo.currency, "643");
assert.equal(payInfo.baseDocumentType, "C");
assert.equal(payInfo.kbk, "12345678901234567890");
assert.notEqual(payInfo.paymentDeadlineDate, "");

// Старая запись без новых полей читается: реестр не должен падать на истории
const legacyPayment = ContractPaymentSchema.parse({
  amount: "100.00",
  status: "paid",
});
assert.equal(legacyPayment.baseDocumentType, "C");
assert.equal(legacyPayment.kbk, undefined);

// 10. Приёмка: contractExecutionDocAcceptanceType
const acceptanceInput = (
  patch: Partial<AcceptanceInput> = {},
): AcceptanceInput => ({
  organizationId: "1",
  contractId: "1",
  contractNumber: "17АН_26",
  contractName: "Поставка картриджей",
  contractPrice: 125000,
  contractStatus: "in_execution",
  contractDate: "2026-01-15",
  customerName: "Заказчик",
  supplierName: "Поставщик",
  supplierInn: "7701234567",
  ikz: "1".repeat(36),
  eisRegistryNumber: "0373100000123000001",
  stageNumber: null,
  stageName: null,
  kind: "Primary",
  documentNumber: "А-7",
  documentDate: "2026-03-01",
  correctedDocumentNumber: null,
  correctedDocumentDate: null,
  correctionReason: null,
  acceptanceTermDays: 10,
  expertiseRequired: false,
  expertiseByThirdParty: false,
  expertiseOrganization: null,
  expertiseConclusionNumber: null,
  expertiseConclusionDate: null,
  commissionRequired: false,
  commissionDecisionNumber: null,
  commissionDecisionDate: null,
  deliveryPlace: null,
  notes: null,
  createdBy: "Тест",
  ...patch,
});

const position: AcceptancePosition = {
  id: "p1",
  name: "Картридж лазерный",
  okpd2: "2630111900",
  unit: "шт",
  quantity: 10,
  unitPrice: 12500,
  vatRate: 20,
  totalWithVat: 125000,
  vatAmount: 20833.33,
  totalWithoutVat: 104166.67,
  countryOrigin: "643",
  registryNumber: "123",
};

const acceptanceOf = (
  patch: Partial<AcceptanceResponse> = {},
): AcceptanceResponse => ({
  id: "a1",
  input: acceptanceInput(),
  status: "Accepted",
  result: "Accepted",
  revision: 1,
  positions: [position],
  defects: [],
  events: [],
  issues: [],
  totalWithVat: 125000,
  vatAmount: 20833.33,
  totalWithoutVat: 104166.67,
  reviewDeadline: "2026-03-16",
  createdAt: "2026-03-01T10:00:00+03:00",
  updatedAt: "2026-03-02T10:00:00+03:00",
  submittedAt: "2026-03-01T11:00:00+03:00",
  reviewedAt: "2026-03-02T10:00:00+03:00",
  signedAt: "2026-03-02T10:00:00+03:00",
  signedBy: "Иванов И. И.",
  registeredAt: null,
  registeredBy: null,
  eisRegistrationNumber: null,
  eisRegistrationDate: null,
  refusalReason: null,
  returnComment: null,
  cancelledReason: null,
  ...patch,
});

const readyAcceptance = acceptanceEisReadiness(acceptanceOf(), {
  now: "2026-03-03T10:00:00+03:00",
});
assert.equal(
  readyAcceptance.ok,
  true,
  readyAcceptance.blocking.map((issue) => issue.message).join("; "),
);
assert.equal(readyAcceptance.xsdType, "contractExecutionDocAcceptanceType");

// Шапка без реестрового номера и номера документа не готова
const emptyHeader = acceptanceInputEisReadiness(
  acceptanceInput({ eisRegistryNumber: null, documentNumber: null }),
);
assert.equal(emptyHeader.ok, false);
assert.equal(emptyHeader.blocking.length, 2);
assert.ok(eisXmlReadinessText(emptyHeader).includes("documentNum"));

// 11. Итог приёмки: ЕИС принимает только состоявшуюся приёмку
for (const result of [null, "Refused", "ReturnedForRevision"] as const) {
  assert.equal(
    acceptanceEisReadiness(acceptanceOf({ result })).ok,
    false,
    `итог «${result}» не должен считаться готовым`,
  );
}
assert.equal(
  acceptanceEisReadiness(
    acceptanceOf({ result: "AcceptedWithDiscrepancies" }),
  ).ok,
  true,
);

// 12. Позиции: productsInfo обязателен, ставка НДС — из справочника
assert.equal(acceptanceEisReadiness(acceptanceOf({ positions: [] })).ok, false);
assert.equal(
  acceptanceEisReadiness(
    acceptanceOf({ positions: [{ ...position, vatRate: 18 }] }),
  ).ok,
  false,
);
assert.equal(
  acceptanceEisReadiness(
    acceptanceOf({ positions: [{ ...position, okpd2: "26.30" }] }),
  ).ok,
  false,
);

// Незнакомая единица — предупреждение, а не блокировка: код ОКЕИ уточняют
// по справочнику, но документ из-за текста «ведро» не отвергается
const oddUnit = acceptanceEisReadiness(
  acceptanceOf({ positions: [{ ...position, unit: "ведро" }] }),
);
assert.equal(oddUnit.ok, true);
assert.ok(oddUnit.warnings.some((issue) => issue.path.includes("OKEIInfo")));

// 13. Дата подписания заказчиком: без неё — предупреждение (в XML уйдёт дата
// документа), а с ней замечаний по deliveryAcceptDate нет
const unsigned = acceptanceEisReadiness(acceptanceOf({ signedAt: null }));
assert.equal(unsigned.ok, true);
assert.ok(
  unsigned.warnings.some((issue) => issue.path.includes("deliveryAcceptDate")),
);

// 14. Требования проверки сверяются со снимком схем: если Альбом 17.0 обновится
// и обязательные поля изменятся, проверка упадёт здесь, а не на отправке в ЕИС
type CatalogField = {
  name: string;
  optional: boolean;
  documentation: string | null;
};

const catalog = JSON.parse(
  readFileSync("public/eis-schemas/catalog.json", "utf8"),
) as { types: { name: string; fields: CatalogField[] }[] };

const catalogType = (name: string) => {
  const type = catalog.types.find((item) => item.name === name);
  assert.ok(type, `тип ${name} не найден в снимке схем ЕИС`);

  return type;
};

const requiredFields = (name: string): string[] =>
  catalogType(name)
    .fields.filter((field) => !field.optional)
    .map((field) => field.name)
    .sort();

assert.deepEqual(requiredFields("oosCETypesX1_contractExecutionDocAcceptanceType"), [
  "docAcceptanceInfo",
  "regNumber",
  "schemeVersion",
]);
assert.deepEqual(
  requiredFields(
    "oosCETypesX1_contractExecutionDocAcceptanceType_docAcceptanceInfo",
  ),
  [
    "deliveryAcceptDate",
    "documentDate",
    "documentNum",
    "documentType",
    "productsInfo",
  ],
);
assert.deepEqual(
  requiredFields(
    "oosCETypesX1_contractExecutionDocAcceptanceType_docAcceptanceInfo_productsInfo_productsContractInfo_productInfo",
  ),
  ["fulfilledCost"],
);
assert.deepEqual(requiredFields("oosCETypesX1_contractExecutionPaymentType"), [
  "payDocumentInfo",
  "regNumber",
  "schemeVersion",
]);
assert.deepEqual(
  requiredFields("oosCETypesX1_contractExecutionPaymentType_payDocumentInfo"),
  ["currency", "paid"],
);

// Номер, дата и тип платежа не помечены обязательными в XSD, но их наличие
// ЕИС проверяет на приёме — поэтому они блокируют отправку
for (const field of ["payDocumentNum", "payDocumentDate", "payDocumentType"]) {
  const definition = catalogType(
    "oosCETypesX1_contractExecutionPaymentType_payDocumentInfo",
  ).fields.find((item) => item.name === field);

  assert.ok(definition, `поле ${field} не найдено в payDocumentInfo`);
  assert.ok(
    (definition.documentation ?? "").includes("обязательность заполнения"),
    `XSD больше не требует ${field} на приёме — проверку надо пересмотреть`,
  );
}

console.log(
  "OK: готовность приёмки и оплаты к XML ЕИС 17.0 (check-eis-execution-readiness)",
);
