// Московская зона: срок оплаты и «сегодня» считаются по локальному календарю,
// а `toISOString()` в UTC+3 уводит дату на день назад — проверка ловит это.
process.env.TZ = "Europe/Moscow";

import assert from "node:assert/strict";
import {
  localIsoDate,
  paymentDeadlineDate,
} from "../src/services/ContractRegistry/contractRegistry.schema";
import { contractCardPaymentDeadline } from "../src/services/ContractRegistry/contractCardProjection.schema";

/**
 * Сроки оплаты по ч. 13.1 ст. 34 44-ФЗ: 7 рабочих дней с даты подписания
 * документа о приёмке, 10 — при казначейском сопровождении.
 *
 * Запуск: npm run check:contract-deadlines (rolldown собирает TS, затем Node).
 * Даты проверяются в московской зоне: раньше `toISOString()` возвращал день
 * раньше локальной полночи, и просрочка заказчика наступала на день раньше.
 */

// Локальная полночь не должна уезжать на предыдущие сутки
assert.equal(localIsoDate(new Date("2026-05-14T00:00:00")), "2026-05-14");
assert.equal(localIsoDate(new Date("2026-01-01T00:00:00")), "2026-01-01");

// Вторник 05.05.2026: 06–08 (1–3), 11–14 (4–7) → 14.05
assert.equal(contractCardPaymentDeadline("2026-05-05"), "2026-05-14");
// 10 рабочих дней: 06–08 (1–3), 11–15 (4–8), 18–19 (9–10) → 19.05
assert.equal(contractCardPaymentDeadline("2026-05-05", true), "2026-05-19");
// Без даты приёмки срок не считается
assert.equal(contractCardPaymentDeadline(null), null);
assert.equal(contractCardPaymentDeadline(""), null);

// Тот же расчёт для ручного платежа: вторник 07.04.2026 → 16.04
assert.equal(
  paymentDeadlineDate({ paymentDate: "2026-04-07", treasuryExecution: false }),
  "2026-04-16",
);
assert.equal(
  paymentDeadlineDate({ paymentDate: "2026-04-07", treasuryExecution: true }),
  "2026-04-21",
);
// Платёж без даты — пустая строка, а не «сегодня»
assert.equal(paymentDeadlineDate({ treasuryExecution: false }), "");

console.log("OK   сроки оплаты по ч. 13.1 ст. 34: даты без сдвига UTC");
