/**
 * Проверка справочника контрагентов: ключ по ИНН, вердикт МСП из справочника
 * сверок, реквизиты для документов.
 *
 * Запуск: npm run check:counterparties (rolldown собирает TS, затем Node).
 *
 * Что фиксируем:
 * — карточка заводится только по полному ИНН (10 или 12 цифр), разделители и
 *   пробелы схлопываются, иначе один поставщик попал бы в справочник дважды;
 * — вердикт МСП не хранится в карточке: он берётся из `smpRegistry`, поэтому
 *   повторная сверка не требует правки справочника;
 * — отсутствие записи в справочнике сверок — «не проверялся», а не «не СМП»:
 *   иначе непроверенный поставщик получал бы ложный отказ;
 * — запись из полной выгрузки реестра приходит без `found` и считается
 *   найденной, исключённые помечаются отдельным статусом;
 * — документы копируют реквизиты (`counterpartyRequisites`), поэтому правка
 *   карточки задним числом не меняет уже оформленные сведения.
 */

import assert from "node:assert/strict";
import {
  COUNTERPARTY_SMP_NOT_CHECKED_TEXT,
  CounterpartySchema,
  counterpartyRequisites,
  counterpartySearchText,
  counterpartySmpLabel,
  counterpartySmpVerdict,
  counterpartyTitle,
  createCounterpartyDraft,
  isCounterpartyInnComplete,
  isCounterpartySmpVerdictFresh,
  withSmpVerdict,
  type Counterparty,
} from "../src/services/Counterparty/counterparty.schema";
import {
  smpRegistryCategoryLabels,
  type SmpRegistryEntry,
} from "../src/services/ContractSmp/smpRegistry.schema";

const card = (over: Partial<Counterparty> = {}): Counterparty => ({
  inn: "4630000790",
  name: "АО «Курсктара»",
  kpp: "463001001",
  isActive: true,
  ...over,
});

const entry = (over: Partial<SmpRegistryEntry> = {}): SmpRegistryEntry => ({
  inn: "4630000790",
  name: "АО «Курсктара»",
  isActive: true,
  ...over,
});

const formatDate = (iso?: string) => (iso ? iso.slice(0, 10) : "");

// ИНН — ключ справочника: только 10 или 12 цифр, разделители не мешают
assert.equal(isCounterpartyInnComplete("4630000790"), true);
assert.equal(isCounterpartyInnComplete("463 000 0790"), true);
assert.equal(isCounterpartyInnComplete("463000079"), false);
assert.equal(isCounterpartyInnComplete("46300007901"), false);
assert.equal(isCounterpartyInnComplete(""), false);
assert.equal(isCounterpartyInnComplete(undefined), false);

// Заготовка нормализует ИНН и обрезает наименование
assert.deepEqual(createCounterpartyDraft(" 4630 000 790 ", "  ООО «Ромашка» "), {
  inn: "4630000790",
  name: "ООО «Ромашка»",
  isActive: true,
});

// Поиск идёт и по ИНН, и по обоим наименованиям
const searchable = card({ shortName: "Курсктара" });
assert.match(counterpartySearchText(searchable), /4630000790/);
assert.match(counterpartySearchText(searchable), /курсктара/);
assert.equal(counterpartyTitle(card()), "АО «Курсктара» · ИНН 4630000790");

// Вердикт: нет записи — «не проверялся», а не «не СМП»
assert.deepEqual(counterpartySmpVerdict(undefined), { status: "unchecked" });

// Сверен и не найден
assert.deepEqual(
  counterpartySmpVerdict(entry({ found: false, checkedAt: "2026-11-01" })),
  { status: "out_of_registry", checkedAt: "2026-11-01" },
);

// Найден в реестре — с категорией и датой сверки
assert.deepEqual(
  counterpartySmpVerdict(
    entry({ found: true, category: "micro", checkedAt: "2026-11-01" }),
  ),
  { status: "in_registry", category: "micro", checkedAt: "2026-11-01" },
);

// Запись из полной выгрузки приходит без `found` — ИНН найден
assert.deepEqual(counterpartySmpVerdict(entry({ category: "small" })), {
  status: "in_registry",
  category: "small",
  checkedAt: undefined,
});

// Исключённый из реестра не считается СМП, но это видно отдельным статусом
assert.equal(
  counterpartySmpVerdict(entry({ found: true, isActive: false })).status,
  "excluded",
);

// Карточка сопоставляется с записью сверки по нормализованному ИНН
const withVerdict = withSmpVerdict(card({ inn: "4630 000 790" }), [
  entry({ inn: "4630000790", found: true, category: "micro" }),
]);
assert.equal(withVerdict.smp.status, "in_registry");
assert.equal(withVerdict.smp.category, "micro");
assert.equal(withSmpVerdict(card(), []).smp.status, "unchecked");

// Свежесть вердикта: 30 дней, дата в будущем и мусор — не свежие
const now = new Date("2026-11-24T00:00:00Z");
assert.equal(
  isCounterpartySmpVerdictFresh(
    { status: "in_registry", checkedAt: "2026-11-10T00:00:00Z" },
    30,
    now,
  ),
  true,
);
assert.equal(
  isCounterpartySmpVerdictFresh(
    { status: "in_registry", checkedAt: "2026-10-01T00:00:00Z" },
    30,
    now,
  ),
  false,
);
assert.equal(
  isCounterpartySmpVerdictFresh({ status: "unchecked" }, 30, now),
  false,
);
assert.equal(
  isCounterpartySmpVerdictFresh(
    { status: "in_registry", checkedAt: "не дата" },
    30,
    now,
  ),
  false,
);

// Подписи вердикта
assert.equal(
  counterpartySmpLabel(
    { status: "unchecked" },
    smpRegistryCategoryLabels,
    formatDate,
  ),
  COUNTERPARTY_SMP_NOT_CHECKED_TEXT,
);
assert.equal(
  counterpartySmpLabel(
    { status: "in_registry", category: "micro", checkedAt: "2026-11-10" },
    smpRegistryCategoryLabels,
    formatDate,
  ),
  "В реестре МСП: микропредприятие (проверено 2026-11-10)",
);
assert.equal(
  counterpartySmpLabel(
    { status: "out_of_registry", checkedAt: "2026-11-10" },
    smpRegistryCategoryLabels,
    formatDate,
  ),
  "В реестре МСП не найден (проверено 2026-11-10)",
);
assert.equal(
  counterpartySmpLabel(
    { status: "excluded", checkedAt: "2026-11-10" },
    smpRegistryCategoryLabels,
    formatDate,
  ),
  "Исключён из реестра МСП (проверено 2026-11-10)",
);

// Реквизиты для документа: ИНН и наименование копируются, КПП может отсутствовать
assert.deepEqual(counterpartyRequisites(card()), {
  supplierName: "АО «Курсктара»",
  supplierInn: "4630000790",
  supplierKpp: "463001001",
});
assert.deepEqual(counterpartyRequisites(card({ kpp: undefined })), {
  supplierName: "АО «Курсктара»",
  supplierInn: "4630000790",
  supplierKpp: "",
});

// Схема карточки: `isActive` по умолчанию, лишние поля отбрасываются
const parsed = CounterpartySchema.parse({
  inn: "4630000790",
  name: "АО «Курсктара»",
  smpCategory: "micro",
});
assert.equal(parsed.isActive, true);
assert.equal("smpCategory" in parsed, false);

console.log(
  "OK   Контрагенты: ключ по ИНН, вердикт МСП из справочника сверок (нет записи = «не проверено»), реквизиты копируются в документы",
);
