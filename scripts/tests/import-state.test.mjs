/** Проверки курсоров инкрементального импорта (без сети и PostgreSQL). */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  datasetCursor,
  lastEisNumber,
  loadImportState,
  markChecked,
  newSinceCursor,
  saveImportState,
} from "../lib/import-state.mjs";
import { parseContractSearchHtml } from "../lib/contract-registry-search.mjs";
import { mergeUnique } from "../import-contract-registry.mjs";

test("курсор отбирает только новые номера, сравнение числовое", () => {
  const numbers = ["99", "120", "1000", "99"];
  assert.deepEqual(newSinceCursor(numbers, ""), ["99", "120", "1000"]);
  assert.deepEqual(newSinceCursor(numbers, "120"), ["1000"]);
  assert.equal(lastEisNumber(numbers), "1000");
});

test("ручной номер не откатывает курсор назад", () => {
  const state = loadImportState(path.join(os.tmpdir(), "csms-state-not-exists.json"));
  markChecked(state, "notices", { imported: 2, cursor: "120" });
  markChecked(state, "notices", { imported: 1, cursor: "50" });
  assert.equal(datasetCursor(state, "notices"), "120");
  assert.equal(state.datasets.notices.processedCount, 3);
});

test("битый state не роняет импорт", () => {
  const file = path.join(os.tmpdir(), `csms-state-broken-${process.pid}.json`);
  fs.writeFileSync(file, "{ не JSON", "utf8");
  try {
    assert.deepEqual(loadImportState(file).datasets, {});
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test("state сохраняется атомарно и читается обратно", () => {
  const file = path.join(os.tmpdir(), `csms-state-roundtrip-${process.pid}.json`);
  try {
    const state = loadImportState(file);
    markChecked(state, "contractRegistry", { imported: 1, cursor: "120" });
    saveImportState(state, file);
    assert.equal(datasetCursor(loadImportState(file), "contractRegistry"), "120");
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test("ручной номер перекрывает старую запись, номер только в eisUrl", () => {
  const number = "2462904043926000006";
  const existing = [{
    id: "eis-old",
    contractName: "старое название",
    eisUrl: `https://zakupki.gov.ru/epz/contract/contractCard/common-info.html?reestrNumber=${number}`,
  }];
  const incoming = [{ id: 999, eisRegistryNumber: number, contractName: "новое название" }];
  const merged = mergeUnique(existing, incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].contractName, "новое название");
});

test("парсер публичной выдачи реестра контрактов", () => {
  const html = `
    <div class="search-registry-entry-block">
      <div class="registry-entry__header-mid__number">
        <a href="/epz/contract/contractCard/common-info.html?reestrNumber=3261801071026000012">№ 3261801071026000012</a>
      </div>
      <div class="registry-entry__header-mid__title">Исполнение завершено</div>
      <div class="registry-entry__body-title">Заказчик</div>
      <div class="registry-entry__body-href"><a>Тестовая организация</a></div>
      <div class="registry-entry__body-title">Контракт</div>
      <div class="registry-entry__body-value">№ А0576913</div>
      <div class="d-flex lots-wrap-content__body__title">Объекты закупки</div>
      <div class="d-flex lots-wrap-content__body__val"><span>поставка литературы</span></div>
      <div class="price-block__value">41 509,60 &#8381;</div>
      <div class="data-block__title">Заключение контракта</div>
      <div class="data-block__value">24.09.2026</div>
      <div class="data-block__title">Срок исполнения</div>
      <div class="data-block__value">31.12.2026</div>
    </div>`;
  const rows = parseContractSearchHtml(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].eisRegistryNumber, "3261801071026000012");
  assert.equal(rows[0].year, 2026);
  assert.equal(rows[0].status, "completed");
  assert.equal(rows[0].contractNumber, "А0576913");
  assert.equal(rows[0].contractName, "поставка литературы");
  assert.equal(rows[0].contractPrice, "41509.60");
  assert.equal(rows[0].contractDate, "2026-09-24");
  assert.equal(rows[0].executionEndDate, "2026-12-31");
});
