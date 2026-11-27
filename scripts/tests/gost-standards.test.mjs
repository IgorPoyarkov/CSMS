import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeHtml,
  findGostHint,
  gostYear,
  normalizeDesignation,
  parseGostDetail,
  parseGostList,
  parseGostPages,
  repairMojibake,
} from "../lib/gost-standards.mjs";

const listHtml = `
<table><tbody>
<tr>
  <td>1</td>
  <td><a href="/gost/details/0322c246-31cd-46c7-b275-121add2c666a">
      <span>ГОСТ 10583-2026</span></a></td>
  <td><span class="line-clamp-2">Рапс. Технические условия</span></td>
  <td>12</td>
  <td><span>★&nbsp; Принят</span></td>
</tr>
<tr>
  <td>2</td>
  <td><a href="/gost/details/a2e4064f-db65-4ad3-a017-73cdaa1aad07">
      <span>ГОСТ 15845-2024</span></a></td>
  <td><span>Изделия кабельные. Термины и определения</span></td>
  <td>32</td>
  <td><span>✓&nbsp; Действует</span></td>
</tr>
</tbody></table>
<nav><a href="/gost?year=2026&amp;month=11&amp;search=&amp;page=2">2</a>
<a href="/gost?year=2026&amp;month=11&amp;search=&amp;page=3">3</a></nav>`;

const field = (label, value) =>
  `<span class="text-xs text-gray-400 uppercase tracking-wider">${label}</span>` +
  `<p class="text-sm font-medium mt-0.5">${value}</p>`;

const detailHtml = `
<meta name="DESCRIPTION" Content="ГОСТ 10583-2026 Рапс. Технические условия">
<h1>ГОСТ 10583-2026</h1>
<p class="text-gray-400 mt-1 text-sm italic max-w-3xl">Rape. Specifications</p>
${field("Обозначение", "ГОСТ 10583-2026")}
${field("Полное обозначение", "ГОСТ 10583-2026")}
${field("Заглавие на русском языке", "Рапс. Технические условия")}
${field("Номер приказа", "1343-ст")}
${field("Дата приказа", "20.10.2026")}
${field("Дата введения в действие", "01.01.2027")}
${field("Дата введения в действие(примечание)", "-")}
${field("Код ОКС", "67.060")}
${field("Ключевые слова", "рапс, типы")}
${field("Область применения", "Настоящий стандарт распространяется на семена рапса")}
${field("Обозначение заменяемого(ых)", "ГОСТ 10583-76")}
${field("Обозначение заменяющего", "-")}
${field("Технический комитет", "002 - Зерно")}`;

test("список оставляет только принятые ГОСТы и разбирает колонки", () => {
  const items = parseGostList(listHtml);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "0322c246-31cd-46c7-b275-121add2c666a");
  assert.equal(items[0].designation, "ГОСТ 10583-2026");
  assert.equal(items[0].title, "Рапс. Технические условия");
  assert.equal(items[0].pages, 12);
  assert.equal(items[0].status, "Принят");
  assert.equal(items[0].sourceUrl, "https://protect.gost.ru/gost/details/0322c246-31cd-46c7-b275-121add2c666a");

  assert.equal(parseGostList(listHtml, { onlyNew: false }).length, 2);
});

test("пагинация собирает номера страниц", () => {
  assert.deepEqual(parseGostPages(listHtml), [2, 3]);
  assert.deepEqual(parseGostPages("<html>одна страница</html>"), []);
});

test("карточка даёт локальный текст и ссылочные данные", () => {
  const item = parseGostDetail(detailHtml, parseGostList(listHtml)[0]);
  assert.equal(item.titleEn, "Rape. Specifications");
  assert.equal(item.orderNumber, "1343-ст");
  assert.equal(item.orderDate, "20.10.2026");
  assert.equal(item.effectiveDate, "01.01.2027");
  assert.equal(item.effectiveNote, "");
  assert.equal(item.ics, "67.060");
  assert.equal(item.keywords, "рапс, типы");
  assert.equal(item.replaces, "ГОСТ 10583-76");
  assert.equal(item.replacedBy, "");
  assert.equal(item.technicalCommittee, "002 - Зерно");
  assert.match(item.text, /семена рапса/);
  assert.match(item.text, /рапс, типы/);
  assert.equal(item.title, "Рапс. Технические условия");
});

test("подсказка находит ГОСТ по обозначению с нормализацией", () => {
  const items = parseGostList(listHtml);
  const hint = findGostHint("  гост  10583-2026 ", items);
  assert.equal(hint?.id, items[0].id);
  assert.equal(findGostHint("ГОСТ 10583-2025", items), null);
  assert.equal(findGostHint("", items), null);
  assert.equal(normalizeDesignation("ГОСТ Р 2.102-2023"), "ГОСТ Р 2.102-2023");
});

test("год принятия берётся из обозначения", () => {
  assert.equal(gostYear("ГОСТ Р 2.102-2023"), 2023);
  assert.equal(gostYear("ГОСТ 10382-85"), 1985);
  assert.equal(gostYear("ГОСТ 12.1.004-91"), 1991);
  assert.equal(gostYear("ГОСТ без года"), null);
});

test("HTML-сущности раскодируются", () => {
  assert.equal(decodeHtml("&laquo;ГОСТ&nbsp;10583&amp;2026&raquo;"), "«ГОСТ 10583&2026»");
});

test("смешанная латиница в тексте карточки восстанавливается", () => {
  assert.equal(
    repairMojibake("семена рапса (Brбssica nбpus)"),
    "семена рапса (Brassica napus)",
  );
  assert.equal(repairMojibake("Р. aeruginоsa"), "Р. aeruginosa");
  assert.equal(repairMojibake("Область применения"), "Область применения");
});
