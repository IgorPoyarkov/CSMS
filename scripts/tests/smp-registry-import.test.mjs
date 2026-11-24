/** Проверки импорта реестра МСП (без PostgreSQL: только разбор выгрузки). */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSmpRegistryDocs,
  parseSmpRegistryText,
} from "../import-smp-registry.mjs";

const CSV = [
  "ИНН;Наименование субъекта;Категория;Реестровый номер;Регион;Дата включения;Дата исключения",
  "4630000790;АО «Курсктара»;Микропредприятие;МСП-000123;Курская область;01.08.2016;",
  "3123001111;ООО «Ромашка»;Малое предприятие;МСП-000124;Белгородская область;10.09.2017;10.10.2024",
].join("\n");

test("CSV выгрузки: ИНН, категория и даты разбираются по заголовку", () => {
  const { rows, skipped } = parseSmpRegistryText(CSV);

  assert.equal(skipped.length, 0);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    inn: "4630000790",
    name: "АО «Курсктара»",
    category: "micro",
    registryNumber: "МСП-000123",
    region: "Курская область",
    includedAt: "2016-08-01",
    excludedAt: "",
  });
  assert.equal(rows[1].category, "small");
  assert.equal(rows[1].excludedAt, "2024-10-10");
});

test("исключённая из реестра компания остаётся справочником, но не активной", () => {
  const { docs } = buildSmpRegistryDocs(parseSmpRegistryText(CSV).rows);
  const active = docs.find((doc) => doc.inn === "4630000790");
  const excluded = docs.find((doc) => doc.inn === "3123001111");

  assert.equal(active.isActive, true);
  assert.equal(active.registryNumber, "МСП-000123");
  assert.equal(excluded.isActive, false);
  assert.match(excluded.note, /Исключён из реестра 2024-10-10/);
});

test("запись без корректного ИНН отбрасывается с причиной", () => {
  const text = [
    "ИНН,Наименование,Категория",
    "463000079,АО «Курсктара»,Микро",
    "4630000790,,Микро",
  ].join("\n");

  const { rows, skipped } = parseSmpRegistryText(text);
  assert.equal(rows.length, 0);
  assert.equal(skipped.length, 2);
  assert.match(skipped[0].reason, /не 10 и не 12 цифр/);
  assert.match(skipped[1].reason, /наименование/);
});

test("повтор ИНН перекрывается последней записью выгрузки", () => {
  const docs = buildSmpRegistryDocs([
    { inn: "4630000790", name: "АО «Курсктара»", category: "micro" },
    { inn: "4630000790", name: "АО «Курсктара»", category: "medium" },
  ]);

  assert.equal(docs.docs.length, 1);
  assert.equal(docs.docs[0].category, "medium");
});

test("JSON-бэкап: ключи документа принимаются как есть", () => {
  const { docs } = buildSmpRegistryDocs([
    {
      id: 7,
      inn: "4630000790",
      name: "АО «Курсктара»",
      category: "small",
      isActive: false,
      note: "прекращение деятельности",
    },
  ]);

  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, "4630000790");
  assert.equal(docs[0].isActive, false);
  assert.equal(docs[0].note, "прекращение деятельности");
});

test("файл без обязательных колонок не импортируется молча", () => {
  assert.throws(
    () => parseSmpRegistryText("Наименование;Категория\nООО «Ромашка»;Микро"),
    /ИНН/,
  );
});
