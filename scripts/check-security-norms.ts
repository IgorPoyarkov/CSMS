import assert from "node:assert/strict";
import {
  SECURITY_NORMS,
  applicationSecurityRange,
  securityPercent,
  validateSecurityNorms,
  type SecurityNormsIssue,
} from "../src/services/Security/securityNorms";

/**
 * Нормы размеров обеспечений (ч. 1 ст. 44, ч. 6–7 ст. 34, ст. 96 Закона № 44-ФЗ).
 *
 * Модуль общий для служебной записки, извещения и проекта контракта: проверяем
 * порог НМЦК 20 млн для обеспечения заявки, пределы исполнения 0,5–30 %,
 * правило «не меньше аванса» при авансе свыше 30 %, сверку суммы и уровни
 * замечаний. Заявка и гарантия — ошибки, исполнение — ошибка, кроме законного
 * превышения 30 % при авансе свыше 30 % НМЦК (там предупреждение).
 *
 * Запуск: npm run check:security-norms (rolldown собирает TS, затем Node).
 */

const codes = (issues: SecurityNormsIssue[]): string[] =>
  issues.map((issue) => issue.code);

// Разбор значений формы: пустая строка — «не задано», запятая допустима.
assert.equal(securityPercent(""), null);
assert.equal(securityPercent("  "), null);
assert.equal(securityPercent(undefined), null);
assert.equal(securityPercent(null), null);
assert.equal(securityPercent(Number.NaN), null);
assert.equal(securityPercent("12,5"), 12.5);
assert.equal(securityPercent("52"), 52);

// Обеспечение заявки: порог НМЦК 20 млн (ч. 1 ст. 44).
assert.deepEqual(applicationSecurityRange(5_000_000), {
  min: 0.5,
  max: 1,
  byNmck: true,
});
assert.deepEqual(applicationSecurityRange(20_000_000), {
  min: 0.5,
  max: 1,
  byNmck: true,
});
assert.deepEqual(applicationSecurityRange(20_000_001), {
  min: 0.5,
  max: 5,
  byNmck: true,
});
assert.deepEqual(applicationSecurityRange(0), {
  min: 0.5,
  max: 5,
  byNmck: false,
});

// 12 % при НМЦК 5 млн — вне 0,5–1 %: ошибка, утверждение блокируется.
const appOver = validateSecurityNorms({
  price: 5_000_000,
  application: { required: true, percent: 12 },
});
assert.deepEqual(codes(appOver), ["app_percent_out_of_range"]);
assert.equal(appOver[0].level, "error");
assert.equal(appOver[0].field, "application");
assert.match(appOver[0].message, /12/);
assert.match(appOver[0].legalRef, /ст\. 44/);

// 4 % при НМЦК 50 млн — норма; 6 % — уже нет.
assert.equal(
  validateSecurityNorms({
    price: 50_000_000,
    application: { required: true, percent: 4 },
  }).length,
  0,
);
assert.deepEqual(
  codes(
    validateSecurityNorms({
      price: 50_000_000,
      application: { required: true, percent: 6 },
    }),
  ),
  ["app_percent_out_of_range"],
);
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    application: { required: true, percent: 0.5 },
  }).length,
  0,
);
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    application: { required: true, percent: 1 },
  }).length,
  0,
);

// Пустой размер при включённом требовании — ошибка.
assert.deepEqual(
  codes(
    validateSecurityNorms({
      price: 5_000_000,
      application: { required: true, percent: "" },
    }),
  ),
  ["app_percent_missing"],
);
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    application: { required: true, percent: "" },
  })[0].level,
  "error",
);
// Выключенное требование не проверяется.
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    application: { required: false, percent: 12 },
  }).length,
  0,
);

// 52 % обеспечения исполнения без аванса — ошибка: вне 0,5–30 % (ч. 6 ст. 96).
const perfOver = validateSecurityNorms({
  price: 5_000_000,
  performance: { required: true, percent: "52" },
});
assert.deepEqual(codes(perfOver), ["perf_percent_out_of_range"]);
assert.equal(perfOver[0].level, "error");
assert.equal(perfOver[0].field, "performance");
assert.match(perfOver[0].message, /30 %/);

// 0 % — ниже минимума 0,5 %: ошибка.
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    performance: { required: true, percent: 0 },
  })[0].level,
  "error",
);
// Ровно 30 % — норма.
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    performance: { required: true, percent: 30 },
  }).length,
  0,
);

// Аванс 40 %: размер не ниже аванса, поэтому 45 % допустимы (предупреждение),
// а 20 % — ошибка «ниже аванса».
const advanceOver = validateSecurityNorms({
  price: 5_000_000,
  performance: { required: true, percent: 45 },
  advance: { percent: 40, treasurySupport: false },
});
assert.deepEqual(codes(advanceOver), ["perf_percent_out_of_range"]);
assert.equal(advanceOver[0].level, "warning");
assert.match(advanceOver[0].message, /аванс 40/);

// Аванс 40 % без казначейского сопровождения: обеспечение не меньше аванса.
const advanceIssues = validateSecurityNorms({
  price: 5_000_000,
  performance: { required: true, percent: 20 },
  advance: { percent: 40, treasurySupport: false },
});
assert.deepEqual(codes(advanceIssues), ["perf_below_advance"]);
assert.equal(advanceIssues[0].level, "error");
// С казначейским сопровождением база — НМЦК за вычетом аванса, правило молчит.
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    performance: { required: true, percent: 20 },
    advance: { percent: 40, treasurySupport: true },
  }).length,
  0,
);
// Аванс до 30 % правило не включает.
assert.equal(
  validateSecurityNorms({
    price: 5_000_000,
    performance: { required: true, percent: 10 },
    advance: { percent: 30 },
  }).length,
  0,
);

// Сумма обеспечения сверяется с процентом от цены (допуск — 1 рубль).
// Расхождение — предупреждение: сумма пересчитывается при изменении цены.
const amountMismatch = validateSecurityNorms({
  price: 1_000_000,
  performance: { required: true, percent: 10, amount: 50_000 },
});
assert.deepEqual(codes(amountMismatch), ["perf_amount_mismatch"]);
assert.equal(amountMismatch[0].level, "warning");
assert.equal(
  validateSecurityNorms({
    price: 1_000_000,
    performance: { required: true, percent: 10, amount: 100_000 },
  }).length,
  0,
);
assert.equal(
  validateSecurityNorms({
    price: 1_000_000,
    performance: { required: true, percent: 10, amount: "100000.90" },
  }).length,
  0,
);

// Гарантийные обязательства — не более 10 % (ч. 7 ст. 34): ошибка.
const warrantyOver = validateSecurityNorms({
  warranty: { required: true, percent: 12 },
});
assert.deepEqual(codes(warrantyOver), ["warranty_percent_out_of_range"]);
assert.equal(warrantyOver[0].level, "error");
assert.equal(
  validateSecurityNorms({ warranty: { required: true, percent: 10 } }).length,
  0,
);
assert.equal(
  validateSecurityNorms({ warranty: { required: true, percent: "" } })[0]
    .level,
  "error",
);
// 0 % при включённом требовании — та же ошибка, что пустое значение:
// извещение приходит с дефолтом 0, и обеспечение фактически отсутствует.
assert.deepEqual(
  codes(validateSecurityNorms({ warranty: { required: true, percent: 0 } })),
  ["warranty_percent_missing"],
);

// Заявка, исполнение и гарантия вне норм — три ошибки; исполнение без аванса
// в исключение не попадает.
const all = validateSecurityNorms({
  price: 5_000_000,
  application: { required: true, percent: 12 },
  performance: { required: true, percent: 52 },
  warranty: { required: true, percent: 12 },
});
assert.deepEqual(codes(all), [
  "app_percent_out_of_range",
  "perf_percent_out_of_range",
  "warranty_percent_out_of_range",
]);
assert.ok(all.every((issue) => issue.level === "error"));
assert.ok(all.every((issue) => issue.legalRef.length > 0));

// Пределы совпадают с нормой: 20 млн, 0,5–30 % и 10 %.
assert.equal(SECURITY_NORMS.applicationThreshold, 20_000_000);
assert.equal(SECURITY_NORMS.performanceMin, 0.5);
assert.equal(SECURITY_NORMS.performanceMax, 30);
assert.equal(SECURITY_NORMS.warrantyMax, 10);

console.log("check:security-norms — все проверки пройдены");

