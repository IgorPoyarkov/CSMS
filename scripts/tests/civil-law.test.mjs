import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CIVIL_INSTITUTES,
  FZ44_ARTICLE34_MATRIX,
  articleText,
  buildLegalBasis,
  classifyNormKind,
  classifyProcurement,
  loadCivilSnapshot,
  normalizeDeclaredKind,
  okpd2Signal,
  resolveOkpd2Kinds,
  validateAgainstSnapshot,
} from "../lib/civil-law.mjs";

const snapshot = loadCivilSnapshot();

test("снимок ГК и матрица ст. 34 самодостаточны", () => {
  assert.ok(articleText(snapshot, "gk2:702"));
  assert.ok(articleText(snapshot, "fz44:34"));
  const fake = classifyProcurement({ subject: "Ремонт дороги" });
  assert.deepEqual(validateAgainstSnapshot(fake, snapshot), {
    ok: true,
    missing: [],
  });
  for (const institute of Object.values(CIVIL_INSTITUTES)) {
    for (const reference of institute.articles) {
      assert.ok(articleText(snapshot, reference), `нет текста ${reference}`);
    }
  }
  for (const link of FZ44_ARTICLE34_MATRIX) {
    assert.ok(link.fz44 && link.priority);
  }
});

test("«Работы по поставке телевизора» — mismatch, а не молчаливая подмена", () => {
  const result = classifyProcurement({
    subject: "Работы по поставке телевизора",
    objectName: "Телевизор",
    okpd2Codes: ["26.20.1"],
  });
  assert.equal(result.declaredKind, "works");
  assert.equal(result.objectKind, "goods");
  assert.equal(result.mismatch.detected, true);
  assert.equal(result.mismatch.severity, "high");
  assert.ok(result.mismatch.basis.includes("gk2:702"));
  assert.ok(result.mismatch.basis.includes("gk2:454"));
  assert.equal(result.reviewRequired, true);
  assert.match(result.reasons.join(" "), /Расхождение/);
});

test("ОКПД2 — косвенный сигнал: без предмета ошибки нет", () => {
  assert.deepEqual(okpd2Signal("41.20"), { kind: "works", confidence: 0.7 });
  assert.deepEqual(okpd2Signal("26.20.1"), { kind: "goods", confidence: 0.7 });
  assert.equal(okpd2Signal("").kind, "unknown");
  const result = classifyProcurement({
    subject: "Выполнение работ по ремонту дороги",
    okpd2Codes: ["42.11"],
  });
  assert.equal(result.mismatch.detected, false);
  assert.ok(
    result.institutes.some((item) => item.id === "works-contract-state"),
  );
  assert.ok(result.institutes.some((item) => item.id === "works-construction"));
});

test("Вид объекта: спорные разделы определяются по первому слову наименования", () => {
  // Раздел 71: по коду неоднозначен, по наименованию — услуга или работа
  assert.deepEqual(okpd2Signal("71.11"), {
    kind: "ambiguous",
    confidence: 0.3,
  });
  assert.deepEqual(okpd2Signal("71.11", "Услуги в области архитектуры"), {
    kind: "services",
    confidence: 0.5,
  });
  assert.deepEqual(
    okpd2Signal("71.11.1", "Работы графические для архитектурных целей"),
    { kind: "works", confidence: 0.5 },
  );

  // Разделы, которых нет в таблице кодов: 49–56 (транспорт, проживание,
  // питание), 84 (госуправление), 97–99
  assert.equal(okpd2Signal("49.10").kind, "unknown");
  assert.equal(
    okpd2Signal("49.10", "Услуги железнодорожного транспорта").kind,
    "services",
  );
  assert.equal(
    okpd2Signal("84.11", "Услуги государственного управления").kind,
    "services",
  );
  assert.equal(okpd2Signal("98.10", "Продукция различная").kind, "goods");
  assert.equal(okpd2Signal("98.20", "Услуги различные").kind, "services");

  // Однозначный раздел кода сильнее наименования
  assert.equal(okpd2Signal("26.20.1", "Услуги по ремонту").kind, "goods");
  assert.equal(okpd2Signal("41.20", "Работы по ремонту").kind, "works");
});

test("Вид объекта: позиция без родителей наследует вид соседей по группе", () => {
  const kinds = resolveOkpd2Kinds([
    {
      code: "52.23.19",
      name: "Услуги вспомогательные прочие, связанные с воздушным транспортом",
    },
    { code: "52.23.19.110", name: "Работы водолазные по обслуживанию судов" },
    { code: "52.23.19.111", name: "Работы авиационные" },
    // Ни раздела кода, ни первого слова недостаточно: решают соседи
    { code: "52.23.19.112", name: "Съемки воздушные" },
  ]);

  assert.equal(kinds.get("52.23.19.112").kind, "works");
  assert.equal(kinds.get("52.23.19.112").confidence, 0.4);
  // Родительская позиция определена по первому слову, соседей у неё нет
  assert.equal(kinds.get("52.23.19").kind, "services");

  // Ничья между соседями оставляет позицию неопределённой. Раздел 84 не
  // описан таблицей кодов, поэтому вид соседей задают их наименования
  const tie = resolveOkpd2Kinds([
    { code: "84.11.10.110", name: "Продукция прочая" },
    { code: "84.11.10.111", name: "Работы прочие" },
    { code: "84.11.10.112", name: "Съемки воздушные" },
  ]);
  assert.equal(tie.get("84.11.10.112").kind, "unknown");
});

test("Первая отсечка: вид предмета из формы против ОКПД2 не меняет вердикт по ГК", () => {
  const mismatch = classifyProcurement({
    subject: "Выполнение работ по ремонту дороги",
    declaredKind: "goods",
    okpd2Codes: ["41.20"],
  });
  assert.equal(normalizeDeclaredKind("works_repair"), "works");
  assert.equal(normalizeDeclaredKind("services_maintenance"), "services");
  assert.equal(normalizeDeclaredKind("PRODUCT"), "goods");
  assert.equal(mismatch.okpd2Consistency.source, "form");
  assert.equal(mismatch.okpd2Consistency.signal, "works");
  assert.equal(mismatch.okpd2Consistency.status, "mismatch");
  assert.match(mismatch.okpd2Consistency.message, /ручная сверка/);
  // Это сигнал к проверке, а не новое обвинение в нарушении.
  assert.equal(mismatch.mismatch.detected, false);
  assert.equal(mismatch.reviewRequired, true);

  const match = classifyProcurement({
    subject: "Выполнение работ по ремонту дороги",
    declaredKind: "works",
    okpd2Codes: ["41.20"],
  });
  assert.equal(match.okpd2Consistency.status, "match");

  const ambiguous = classifyProcurement({
    subject: "Выполнение работ по ремонту дороги",
    declaredKind: "works",
    okpd2Codes: ["71.11"],
  });
  assert.equal(ambiguous.okpd2Consistency.status, "ambiguous");
  assert.equal(ambiguous.mismatch.detected, false);

  const unknown = classifyProcurement({
    subject: "Поставка телевизора",
    declaredKind: "goods",
  });
  assert.equal(unknown.okpd2Consistency.status, "unknown");
});

test("«Поставка и монтаж» — смешанный предмет с оговоркой, не mismatch", () => {
  const result = classifyProcurement({
    subject: "Поставка и монтаж оборудования",
    okpd2Codes: ["26.20.1"],
  });
  assert.equal(result.mismatch.detected, false);
  assert.ok(result.exceptions.includes("mixedSubjectGoodsWorks"));
  assert.equal(result.effectiveKind, "goods");
  assert.ok(result.institutes.some((item) => item.id === "goods-supply-state"));
  assert.ok(result.institutes.some((item) => item.id === "works-contract"));
  assert.equal(result.reviewRequired, true);
});

test("Поставка материалов в ходе работ не переопределяет квалификацию", () => {
  const result = classifyProcurement({
    subject: "Выполнение работ по текущему ремонту с поставкой материалов",
    okpd2Codes: ["43.31"],
  });
  assert.equal(result.declaredKind, "works");
  assert.equal(result.mismatch.detected, false);
  assert.ok(result.exceptions.includes("embeddedSupply"));
  assert.equal(result.effectiveKind, "works");
  assert.ok(
    result.institutes.some((item) => item.id === "works-contract-state"),
  );
  assert.ok(
    result.institutes.some((item) => item.id === "goods-purchase-sale"),
  );
});

test("«Услуги по ремонту» получает предупреждение о возможном подряде", () => {
  const result = classifyProcurement({
    subject: "Оказание услуг по текущему ремонту здания",
    okpd2Codes: ["41.20"],
  });
  assert.equal(result.declaredKind, "services");
  assert.ok(result.notes.some((note) => note.includes("ст. 702")));
  assert.equal(result.reviewRequired, true);
});

test("Контракт жизненного цикла разрешает смешанный объект", () => {
  const result = classifyProcurement({
    subject:
      "Контракт жизненного цикла на поставку оборудования с последующим обслуживанием и ремонтом",
    okpd2Codes: ["28.29"],
  });
  assert.ok(result.exceptions.includes("lifecycleContract"));
  assert.equal(result.mismatch.detected, false);
  assert.equal(result.effectiveKind, "goods");
});

test("Обоснование состоит только из дословных фрагментов снимка", () => {
  const result = classifyProcurement({
    subject: "Выполнение работ по капитальному ремонту дороги",
    okpd2Codes: ["42.11"],
  });
  const basis = buildLegalBasis(result, snapshot);
  assert.ok(basis.length >= 3);
  assert.equal(basis[0].priority, "special");
  for (const item of basis) {
    assert.ok(item.quote.length > 20);
    assert.ok(articleText(snapshot, item.reference).includes(item.quote));
    assert.match(item.textSha256, /^[0-9A-F]{64}$/);
    assert.match(item.sourceUrl, /^https:\/\/www\.consultant\.ru\//);
  }
});

test("Неподтверждённые институты не получают выдуманных статей", () => {
  const lease = classifyProcurement({ subject: "Аренда помещения" });
  const leaseInstitute = lease.institutes.find((item) => item.id === "lease");
  assert.ok(leaseInstitute);
  assert.deepEqual(leaseInstitute.articles, []);
  assert.deepEqual(leaseInstitute.pendingArticles, ["gk2:606"]);
  assert.equal(lease.reviewRequired, true);
  assert.deepEqual(buildLegalBasis(lease, snapshot), []);
});

test("Пустой предмет не порождает вставок", () => {
  const result = classifyProcurement({ subject: "" });
  assert.equal(result.declaredKind, "unknown");
  assert.deepEqual(result.institutes, []);
  assert.equal(result.reviewRequired, true);
  assert.ok(result.confidence < 0.5);
});

test("Характер нормы выводится из проверенного текста", () => {
  assert.equal(
    classifyNormKind(articleText(snapshot, "gk2:702")),
    "definitional",
  );
  assert.equal(
    classifyNormKind(articleText(snapshot, "gk1:401")),
    "dispositive",
  );
  assert.equal(
    classifyNormKind(articleText(snapshot, "gk2:469")),
    "imperative",
  );
});

test("Прогон по 112 реальным предметам 2026 года не даёт пропущенных статей", () => {
  const file = "docs/snapshots/contract-subjects-2026.json";
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(data.count, 112);
  let works = 0;
  let goods = 0;
  let services = 0;
  let mismatch = 0;
  for (const item of data.items) {
    const result = classifyProcurement({ subject: item.contractName });
    assert.deepEqual(validateAgainstSnapshot(result, snapshot), {
      ok: true,
      missing: [],
    });
    if (result.declaredKind === "works") works += 1;
    if (result.declaredKind === "goods") goods += 1;
    if (result.declaredKind === "services") services += 1;
    if (result.mismatch.detected) mismatch += 1;
  }
  assert.ok(works > 0, "среди дорожных контрактов должны быть работы");
  assert.ok(goods + services + works === data.count);
  // Число расхождений фиксируем как факт прогона, а не как ожидаемую норму.
  console.log(
    `112 предметов: работы=${works}, товары=${goods}, услуги=${services}, расхождения=${mismatch}`,
  );
});
