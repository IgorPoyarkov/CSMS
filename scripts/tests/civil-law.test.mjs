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
  okpd2Signal,
  validateAgainstSnapshot,
} from "../lib/civil-law.mjs";

const snapshot = loadCivilSnapshot();

test("снимок ГК и матрица ст. 34 самодостаточны", () => {
  assert.ok(articleText(snapshot, "gk2:702"));
  assert.ok(articleText(snapshot, "fz44:34"));
  const fake = classifyProcurement({ subject: "Ремонт дороги" });
  assert.deepEqual(validateAgainstSnapshot(fake, snapshot), { ok: true, missing: [] });
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
  assert.ok(result.institutes.some((item) => item.id === "works-contract-state"));
  assert.ok(result.institutes.some((item) => item.id === "works-construction"));
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
  assert.ok(result.institutes.some((item) => item.id === "works-contract-state"));
  assert.ok(result.institutes.some((item) => item.id === "goods-purchase-sale"));
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
