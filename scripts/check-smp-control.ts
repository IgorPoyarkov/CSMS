// Даты в проверке сравниваются как ISO-строки, а рабочие дни считаются через
// локальные конструкторы Date — часовой пояс на результат не влияет,
// поэтому TZ здесь не выставляем.

import assert from "node:assert/strict";
import type { ContractSmpRecord } from "../src/services/ContractSmp/contractSmp.schema";
import type { SmpRegistryEntry } from "../src/services/ContractSmp/smpRegistry.schema";
import { businessDaysAfter } from "../src/services/Calendar/calendar.schema";
import {
  smpCheckBadge,
  smpCheckTone,
  smpDeadlineShort,
  smpOverdueMarks,
  smpRecordCheck,
  smpRecordDeadlines,
  smpRegistryCheck,
} from "../src/services/ContractSmp/smpControl";

/**
 * Контроль сведений о привлечении СМП: сверка субподрядчика с реестром МСП и
 * сроки ПП 1466 по каждой записи.
 *
 * Запуск: npm run check:smp (rolldown собирает TS, затем Node).
 *
 * Что фиксируем:
 * — реестр сверяется только по ИНН, а запись без ИНН считается непроверенной,
 *   а не «не СМП» (иначе заказчик отклонял бы корректные сведения);
 * — приёмку блокирует только первый неподтверждённый ИНН: повторное
 *   представление уже проверенного ИНН и просрочка срока — не отказ, просрочка
 *   идёт в неустойку;
 * — сроки считаются по рабочим дням и привязаны к конкретной записи, включая
 *   ещё не сохранённую (без id) — иначе новая строка в форме «висела» бы в
 *   таблице сроков без своего срока.
 */

// Запись сведения: обязательные реквизиты заполнены, остальное — по умолчанию
const record = (over: Partial<ContractSmpRecord>): ContractSmpRecord => ({
  id: 1,
  organizationId: 1,
  contractId: 10,
  documentType: "subContract",
  documentNumber: "СМП-1",
  documentDate: "2026-06-01",
  priceType: "contract",
  supplierName: "ООО «МедТехСнаб»",
  supplierInn: "7701234567",
  isSmpSubject: true,
  isReplacementSubContract: false,
  paidEarlierThanContractSchedule: false,
  receivedAt: "2026-06-01T10:15",
  status: "submitted",
  ...over,
});

const registry: SmpRegistryEntry[] = [
  {
    id: 1,
    inn: "7701234567",
    name: "ООО «МедТехСнаб»",
    category: "micro",
    registryNumber: "МСП-000123",
    isActive: true,
  },
  {
    id: 2,
    inn: "7712345678",
    name: "ООО «Ромашка»",
    isActive: false,
    note: "прекращение деятельности",
  },
];

// ─── Реестр МСП ────────────────────────────────────────────────────────────

// ИНН найден в реестре: приёмку ничего не блокирует
const inRegistry = smpRegistryCheck(record({}), [record({})], registry);
assert.equal(inRegistry.applicable, true);
assert.equal(inRegistry.status, "in_registry");
assert.equal(inRegistry.firstSubmission, true);
assert.match(
  inRegistry.text,
  /В реестре МСП: Микропредприятие, запись № МСП-000123/,
);
// REGISTRY-MARK
// ИНН отсутствует в реестре: первое представление — блокирующая ошибка
const notFound = smpRecordCheck(
  record({ supplierInn: "7799999999" }),
  [],
  registry,
  { today: "2026-06-03" },
);
assert.equal(notFound.registry.status, "out_of_registry");
assert.equal(notFound.ok, false);
assert.equal(notFound.acceptanceBlocked, true);
assert.equal(notFound.blocking.length, 1);
assert.equal(notFound.blocking[0].code, "registry");
assert.equal(notFound.blocking[0].field, "supplierInn");
assert.equal(smpCheckTone(notFound), "error");
assert.equal(smpCheckBadge(notFound), "ошибок: 1");

// Тот же ИНН уже принимали по другому договору: статус понижается до
// предупреждения, приёмка не блокируется — ИНН проверяли ранее
const acceptedEarlier = record({
  id: 2,
  documentNumber: "СМП-0",
  supplierInn: "7799999999",
  status: "accepted",
});
const repeated = smpRecordCheck(
  record({ id: 3, documentNumber: "СМП-2", supplierInn: "7799999999" }),
  [acceptedEarlier],
  registry,
  { today: "2026-06-03" },
);
assert.equal(repeated.registry.firstSubmission, false);
assert.equal(repeated.registry.verifiedBy?.documentNumber, "СМП-0");
assert.equal(repeated.blocking.length, 0);
assert.equal(repeated.warnings.length, 1);
assert.equal(repeated.warnings[0].severity, "warning");
assert.equal(repeated.acceptanceBlocked, false);
assert.equal(smpCheckTone(repeated), "warning");
assert.equal(smpCheckBadge(repeated), "внимание: 1");
assert.match(repeated.registry.text, /ИНН уже проверялся по договору № СМП-0/);

// Исключённый из реестра: формулировка отличает «исключён» от «не найден»
const excluded = smpRegistryCheck(
  record({ supplierInn: "7712345678" }),
  [],
  registry,
);
assert.equal(excluded.status, "excluded");
assert.match(
  excluded.text,
  /Исключён из реестра МСП \(прекращение деятельности\)/,
);

// Без ИНН запись непроверенная, а не «не СМП»: только предупреждение
const noInn = smpRecordCheck(
  record({ id: 4, supplierInn: "" }),
  [],
  registry,
  { today: "2026-06-03" },
);
assert.equal(noInn.registry.status, "unknown");
assert.equal(noInn.ok, true);
assert.equal(noInn.acceptanceBlocked, false);
assert.equal(noInn.warnings.length, 1);
assert.equal(noInn.warnings[0].code, "registry");
assert.match(noInn.warnings[0].message, /ИНН субподрядчика не указан/);

// Подрядчик не заявлен как СМП — сверять нечего
const notSmp = smpRecordCheck(
  record({ isSmpSubject: false, supplierInn: "7799999999" }),
  [],
  registry,
  { today: "2026-06-03" },
);
assert.equal(notSmp.registry.applicable, false);
assert.equal(notSmp.registry.text, "");
assert.equal(notSmp.ok, true);
assert.equal(smpCheckBadge(notSmp), "проверено");
// DEADLINES-MARK

// ─── Сроки ПП 1466 ─────────────────────────────────────────────────────────

// Календарь: интервал считается без дня `from`, но с днём `to`. Регресс: `<=`
// в цикле добавлял лишний рабочий день, и просрочка была на день больше
assert.equal(businessDaysAfter("2026-06-05", "2026-06-08"), 1);
assert.equal(businessDaysAfter("2026-06-05", "2026-06-05"), 0);
assert.equal(businessDaysAfter("2026-06-06", "2026-06-08"), 1);

// п. 2: 5 рабочих дней со дня договора с субподрядчиком.
// 01.06.2026 (пн) + 5 раб. дн. = 08.06.2026; 12.06 — праздник, поэтому на
// 15.06.2026 просрочка 4 рабочих дня (09, 10, 11, 15)
const overdueP2 = smpRecordCheck(record({}), [], registry, {
  today: "2026-06-15",
});
assert.equal(overdueP2.deadline?.ruleCode, "p2");
assert.equal(overdueP2.deadline?.dueDate, "2026-06-08");
assert.equal(overdueP2.deadline?.overdueBusinessDays, 4);
assert.equal(smpDeadlineShort(overdueP2.deadline!), "просрочка 4 раб. дн.");
assert.equal(overdueP2.ok, false);
assert.equal(overdueP2.blocking.length, 1);
assert.equal(overdueP2.blocking[0].code, "deadline");
// Просрочка — не основание для отказа: сведения принимаются, идёт неустойка
assert.equal(overdueP2.acceptanceBlocked, false);

// Сроки привязаны к записи: у договора без оплаты их ровно один (п. 2)
assert.deepEqual(
  smpRecordDeadlines(record({}), [record({})], { today: "2026-06-15" }).map(
    (item) => item.ruleCode,
  ),
  ["p2"],
);

// п. 4: после оплаты субподрядчику появляются два срока — документы о приёмке
// (10 раб. дн.) и платёжные поручения (5 раб. дн.)
const paid = record({ paidToSupplierDate: "2026-06-01" });
const paidRules = smpRecordDeadlines(paid, [paid], { today: "2026-06-03" });
assert.deepEqual(
  paidRules.map((item) => item.ruleCode),
  ["p2", "p4a", "p4b"],
);
assert.equal(
  paidRules.find((item) => item.ruleCode === "p4a")?.dueDate,
  "2026-06-16",
);
assert.equal(
  paidRules.find((item) => item.ruleCode === "p4b")?.dueDate,
  "2026-06-08",
);

// Оплата раньше срока по контракту: для платёжных поручений 10 раб. дн.
const paidEarly = record({
  paidToSupplierDate: "2026-06-01",
  paidEarlierThanContractSchedule: true,
});
const earlyRules = smpRecordDeadlines(paidEarly, [paidEarly], {
  today: "2026-06-03",
});
assert.equal(
  earlyRules.find((item) => item.ruleCode === "p4b")?.dueDate,
  "2026-06-16",
);

// п. 5: подрядчик платит субподрядчику в течение 7 раб. дн. с даты подписания
// акта. 01.06 + 7 раб. дн. = 10.06; на 15.06 просрочка 2 раб. дн. (11, 15)
const acceptance = record({
  id: 5,
  documentType: "acceptance",
  documentNumber: "АКТ-1",
  acceptanceSignedDate: "2026-06-01",
});
const acceptanceCheck = smpRecordCheck(acceptance, [acceptance], registry, {
  today: "2026-06-15",
});
assert.equal(acceptanceCheck.deadline?.ruleCode, "p5");
assert.equal(acceptanceCheck.deadline?.dueDate, "2026-06-10");
assert.equal(acceptanceCheck.deadline?.overdueBusinessDays, 2);
assert.equal(acceptanceCheck.blocking[0].field, "acceptanceSignedDate");

// Новая запись без id: срок всё равно находится — при создании её в наборе нет.
// Регресс: раньше такая запись не попадала в расчёт и строка оставалась без срока
const draft = record({ id: undefined, documentNumber: "СМП-ЧЕРНОВИК" });
const draftRules = smpRecordDeadlines(draft, [record({})], {
  today: "2026-06-03",
});
assert.equal(draftRules.length, 1);
assert.equal(draftRules[0].ruleCode, "p2");
assert.equal(draftRules[0].status, "pending");

// Отметки для хронологии: только просрочки, каждая со своей записью
const marks = smpOverdueMarks([record({}), acceptance], { today: "2026-06-15" });
assert.deepEqual(
  marks.map((mark) => [mark.ruleCode, mark.recordId, mark.overdueBusinessDays]),
  [
    ["p2", 1, 4],
    ["p5", 5, 2],
  ],
);

console.log(
  "OK   СМП: реестр МСП по ИНН, блокировка только первого ИНН, сроки ПП 1466 по записи",
);
