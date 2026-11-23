import test from "node:test";
import assert from "node:assert/strict";
import {
  articleText,
  buildContractRequirements,
  loadCivilSnapshot,
} from "../lib/civil-law.mjs";
import { CIVIL_CONTRACT_REQUIREMENTS } from "../lib/civil-law-core.mjs";

const snapshot = loadCivilSnapshot();

const projectWith = (overrides = {}) => ({
  kind: overrides.kind,
  subject: {
    objectName: "Поставка телевизора",
    description: "Телевизор с диагональю 55 дюймов",
    quantity: "10 шт",
    deliveryPlace: "г. Белгород",
    ...(overrides.subject || {}),
  },
  price: {
    finalPrice: 100_000,
    isFixed: true,
    paymentTermDays: 7,
    paymentProcedure: "full",
    ...(overrides.price || {}),
  },
  term: {
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    acceptanceProcedure: "Приёмка по акту",
    acceptanceTermDays: 5,
    acceptanceActForm: "Акт приёмки",
    ...(overrides.term || {}),
  },
  quality: {
    qualityRequirements: "Соответствие техническим условиям",
    ...(overrides.quality || {}),
  },
  responsibility: {
    penaltyFormula: "1/300 ставки",
    fixedPenaltyAmount: 5_000,
  },
  sectionOverrides: overrides.sectionOverrides || [],
});

test("поставка: условия ГК и императивы 44-ФЗ собираются вместе и заполнены", () => {
  const result = buildContractRequirements(projectWith(), snapshot);
  assert.equal(result.classification.effectiveKind, "goods");
  const ids = result.requirements.map((item) => item.id);
  for (const id of [
    "subject-essential",
    "goods-name-quantity",
    "goods-quality",
    "price-fixed-44",
    "payment-acceptance-44",
    "liability-44",
  ]) {
    assert.ok(ids.includes(id), `нет условия ${id}`);
  }
  const quantity = result.requirements.find((item) => item.id === "goods-name-quantity");
  assert.equal(quantity.status, "filled");
  assert.deepEqual(quantity.missingPaths, []);
  assert.equal(result.counts.total, result.requirements.length);
  assert.equal(
    result.counts.total,
    result.counts.filled +
      result.counts.partial +
      result.counts.missing +
      result.counts.overridden,
  );
});

test("вид предмета из формы контракта доходит до сверки с ОКПД2", () => {
  const result = buildContractRequirements(
    projectWith({
      kind: "works_repair",
      subject: { objectName: "Ремонт дороги", okpd2Code: "26.20.1" },
    }),
    snapshot,
  );
  assert.equal(result.classification.okpd2Consistency.source, "form");
  assert.equal(result.classification.okpd2Consistency.declared, "works");
  assert.equal(result.classification.okpd2Consistency.status, "mismatch");
});

test("подряд: цена работы, приёмка и гарантия качества приходят из ГК", () => {
  const project = projectWith({
    subject: {
      objectName: "Ремонт помещения",
      description: "Капитальный ремонт помещения",
      objectList: "",
    },
  });
  const result = buildContractRequirements(project, snapshot);
  assert.equal(result.classification.effectiveKind, "works");
  const ids = result.requirements.map((item) => item.id);
  for (const id of [
    "works-result",
    "works-state-terms",
    "works-price",
    "works-acceptance",
    "works-quality-warranty",
  ]) {
    assert.ok(ids.includes(id), `нет условия ${id}`);
  }
  const resultRequirement = result.requirements.find((item) => item.id === "works-result");
  assert.equal(resultRequirement.status, "partial");
  assert.ok(resultRequirement.missingPaths.includes("subject.objectList"));
  assert.ok(
    result.requirements.some((item) => item.articleRefs.includes("gk2:766")),
    "нет специальной нормы для подрядных работ на госнужды",
  );
});

test("все цитаты — дословные фрагменты снимка, а не пересказ", () => {
  const variants = [
    projectWith(),
    projectWith({
      subject: { objectName: "Ремонт помещения", description: "Капитальный ремонт" },
    }),
    projectWith({
      subject: { objectName: "Оказание услуг по обучению", description: "Обучение сотрудников" },
    }),
  ];
  for (const project of variants) {
    const result = buildContractRequirements(project, snapshot);
    for (const requirement of result.requirements) {
      assert.ok(requirement.quotes.length > 0, `пустые цитаты: ${requirement.id}`);
      for (const quote of requirement.quotes) {
        const [act, number] = quote.reference.split(":");
        const text = articleText(snapshot, quote.reference);
        assert.ok(text, `нет статьи ${quote.reference} в снимке`);
        assert.ok(
          snapshot.acts[act].articles[number].text.includes(quote.quote),
          `цитата не дословная: ${quote.reference}`,
        );
        assert.equal(quote.textSha256, snapshot.acts[act].articles[number].textSha256);
      }
    }
  }
  assert.ok(CIVIL_CONTRACT_REQUIREMENTS.length >= 12);
});

test("расхождение предмета видно и в условиях контракта", () => {
  const result = buildContractRequirements(
    projectWith({
      subject: {
        objectName: "Работы по поставке телевизора",
        description: "Работы по поставке телевизора",
      },
    }),
    snapshot,
  );
  assert.equal(result.classification.mismatch.detected, true);
  assert.deepEqual(result.classification.mismatch.basis, [
    "gk2:454",
    "gk2:506",
    "gk2:702",
    "gk2:703",
  ]);
  assert.equal(result.classification.reviewRequired, true);
});

test("институт без текста снимка даёт pendingArticles без выдуманных цитат", () => {
  const result = buildContractRequirements(
    projectWith({
      subject: { objectName: "Аренда помещения", description: "Аренда помещения" },
    }),
    snapshot,
  );
  assert.ok(
    result.pendingArticles.some((item) => item.reference === "gk2:606"),
    "аренда должна ждать ст. 606 ГК РФ",
  );
  for (const requirement of result.requirements) {
    for (const quote of requirement.quotes) {
      assert.notEqual(quote.reference, "gk2:606");
    }
  }
});

test("ручное переопределение раздела учитывается как заполненное условие", () => {
  const project = projectWith({
    subject: { objectName: "", description: "", quantity: "" },
    sectionOverrides: [{ sectionId: "subject", text: "Предмет из вручную отредактированного текста" }],
  });
  const result = buildContractRequirements(project, snapshot);
  const requirement = result.requirements.find((item) => item.id === "subject-essential");
  assert.equal(requirement.status, "overridden");
});

test("оговорка в норме помечает условие как рекомендацию, а не жёсткое требование", () => {
  const result = buildContractRequirements(
    projectWith({
      subject: { objectName: "Ремонт помещения", description: "Капитальный ремонт" },
    }),
    snapshot,
  );
  const worksResult = result.requirements.find((item) => item.id === "works-result");
  assert.equal(worksResult.normKind, "mixed");
  const qualifier = worksResult.qualifierNotes.find((note) => note.reference === "gk2:703");
  assert.ok(qualifier, "в ст. 703 ГК должна быть найдена оговорка");
  assert.match(qualifier.quote, /если иное не предусмотрено/i);

  const subjectEssential = result.requirements.find((item) => item.id === "subject-essential");
  assert.equal(subjectEssential.normKind, "imperative");
  assert.deepEqual(subjectEssential.qualifierNotes, []);
  assert.ok(
    result.requirements.some((item) => item.normKind === "dispositive"),
    "условие только из диспозитивной нормы должно быть помечено",
  );
});
