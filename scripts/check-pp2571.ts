import assert from "node:assert/strict";
import {
  PP2571_EIS_LIMITS,
  PP2571_POSITIONS,
  PP2571_SOURCE,
  buildPp2571EisRequirements,
  buildPp2571RequirementText,
  getPp2571Applicability,
  isCompetitivePlacingWay,
  matchPp2571Position,
  normalizePp2571Positions,
  pp2571EisCode,
  pp2571ExperienceShare,
  pp2571ObjectsForPosition,
  resolvePp2571Position,
  validatePp2571Requirements,
  type Pp2571Issue,
} from "../src/services/Pp2571/pp2571.schema";
import { buildEis17RequirementsXml } from "../src/services/Eis/eis17Types";
import {
  PurchaseNoteSchema,
  emptyPurchaseNote,
} from "../src/services/PurchaseNote/purchaseNote.schema";

/**
 * Smoke-проверка правил ПП РФ от 29.12.2021 № 2571.
 * Запуск: npm run check:pp2571 (rolldown собирает TS, затем выполняет Node).
 *
 * Проверяются: каталог позиций и пороги по п. 3 «а», сопоставление объектов
 * закупки, применимость, генератор текста требования, правила валидатора
 * (пп. 1 «а», 1 «б», 3 «а», 3 «б», 4) и встраивание в схему СЗ.
 */

const codes = (issues: Pp2571Issue[]) => issues.map((issue) => issue.code);
const byCode = (issues: Pp2571Issue[], code: string) =>
  issues.find((issue) => issue.code === code);

// 1. Каталог: позиции приложения, применяемые в проекте, и пороги п. 3 «а».
assert.equal(PP2571_POSITIONS.length, 6);
assert.equal(new Set(PP2571_POSITIONS.map((item) => item.id)).size, 6);
assert.ok(PP2571_SOURCE.act.includes("29.12.2021 № 2571"));
assert.ok(PP2571_SOURCE.references.length > 0);

const position = (number: number) => {
  const found = PP2571_POSITIONS.find((item) => item.number === number);
  assert.ok(found, `позиция ${number} должна быть в каталоге`);
  return found;
};

assert.equal(position(1).threshold.regional, 500_000);
assert.equal(position(6).threshold.regional, 5_000_000);
assert.equal(position(6).threshold.federal, 10_000_000);
assert.equal(position(10).threshold.regional, 5_000_000);
assert.equal(position(17).threshold.regional, 5_000_000);
assert.equal(position(18).threshold.regional, 5_000_000);
assert.equal(position(34).threshold.regional, 500_000);
assert.equal(position(34).threshold.canBeSkippedBelow, 500_000);
assert.ok(position(6).documents.some((doc) => /разрешение на ввод/.test(doc)));
assert.ok(position(1).licenses?.some((license) => /лицензия/.test(license)));

// 2. Разбор сохранённых значений: идентификатор, метка, номер, мусор.
assert.equal(resolvePp2571Position("pp2571-6")?.number, 6);
assert.equal(
  resolvePp2571Position(
    "Позиция 6 разд. II ПП РФ № 2571 (Работы по строительству, реконструкции объекта кап. строительства)",
  )?.id,
  "pp2571-6",
);
assert.equal(resolvePp2571Position("18")?.id, "pp2571-18");
assert.equal(resolvePp2571Position("позиция 17 разд. III")?.id, "pp2571-17");
assert.equal(resolvePp2571Position("неизвестно"), undefined);
assert.deepEqual(
  normalizePp2571Positions(["pp2571-6", "6", "pp2571-17", "мусор"]),
  ["pp2571-6", "pp2571-17"],
);

// 3. Сопоставление объектов закупки с позициями приложения.
const matchNumber = (item: Parameters<typeof matchPp2571Position>[0]) =>
  matchPp2571Position(item)?.position.number;

assert.equal(
  matchNumber({
    name: "Работы по строительству автомобильной дороги",
    okpd2Code: "42.11.20",
  }),
  17,
);
assert.equal(
  matchNumber({
    name: "Работы по ремонту и содержанию автомобильной дороги",
    okpd2Code: "42.11.20",
  }),
  18,
);
assert.equal(
  matchNumber({
    name: "Работы по капитальному ремонту здания школы",
    okpd2Code: "43.3",
  }),
  10,
);
assert.equal(
  matchNumber({
    name: "Строительство школы на 500 мест",
    okpd2Code: "41.20.40",
  }),
  6,
);
assert.equal(
  matchNumber({
    name: "Услуги по обеспечению охраны объектов",
    okpd2Code: "80.20.10",
  }),
  34,
);
assert.equal(
  matchNumber({
    name: "Работы по сохранению объекта культурного наследия (реставрация фасада)",
  }),
  1,
);
assert.equal(
  matchNumber({ name: "Поставка бумаги", okpd2Code: "17.12.14" }),
  undefined,
);

// 4. Применимость: способ закупки, объект и порог НМЦК.
assert.equal(isCompetitivePlacingWay("EA20"), true);
assert.equal(isCompetitivePlacingWay("EP93"), false);
assert.equal(isCompetitivePlacingWay(""), true);

const applicable = (nmck: number, placingWayCode: string) =>
  getPp2571Applicability({
    nmck,
    placingWayCode,
    items: [
      { name: "Строительство школы", okpd2Code: "41.20.40" },
    ],
  }).find((item) => item.position.number === 6)!;

assert.equal(applicable(6_000_000, "EA20").applicable, true);
assert.equal(applicable(4_000_000, "EA20").applicable, false);
assert.equal(applicable(6_000_000, "EP93").applicable, false);
assert.equal(applicable(11_000_000, "EA20").threshold, 5_000_000);

// 5. Доля опыта и текст требования по графе приложения.
assert.equal(pp2571ExperienceShare(position(6), 50_000_000), 50);
assert.equal(pp2571ExperienceShare(position(6), 150_000_000), 40);
assert.equal(pp2571ExperienceShare(position(6), 600_000_000), 30);
assert.equal(pp2571ExperienceShare(position(34), 5_000_000), undefined);

const requirementText = buildPp2571RequirementText(["pp2571-17"], 6_000_000);
assert.match(requirementText, /Позиция 17 приложения/);
assert.match(requirementText, /не менее 50 %/);
assert.match(requirementText, /Подтверждающие документы/);
assert.match(requirementText, /разрешение на ввод/);
assert.equal(buildPp2571RequirementText([], 6_000_000), "");

// 6. Валидатор: нормальные данные не дают замечаний.
const constructionInput = {
  nmck: 6_000_000,
  placingWayCode: "EA20",
  items: [{ name: "Строительство школы", okpd2Code: "41.20.40" }],
  selectedPositions: ["pp2571-6"],
  additionalRequirementsPart2Art31: true,
  additionalRequirementsPart2Art31Text:
    "Документы по графе приложения ПП РФ № 2571",
};
assert.deepEqual(codes(validatePp2571Requirements(constructionInput)), []);

// П. 3 «а»: единственный поставщик — позиции не устанавливаются.
assert.ok(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      placingWayCode: "EP93",
    }),
    "pp2571-non-competitive",
  ),
);

// П. 1 «а»: позиции и флаг ч. 2 ст. 31 должны быть согласованы.
assert.ok(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      additionalRequirementsPart2Art31: false,
    }),
    "pp2571-part2-flag",
  ),
);
assert.ok(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      selectedPositions: [],
    }),
    "pp2571-part2-no-positions",
  ),
);

// П. 3 «а»: порог НМЦК для позиции 6 — 5 млн для региональных нужд.
const belowThreshold = validatePp2571Requirements({
  ...constructionInput,
  nmck: 3_000_000,
});
assert.ok(byCode(belowThreshold, "pp2571-threshold"));
assert.match(
  byCode(belowThreshold, "pp2571-threshold")!.message,
  /превышает 5\s000\s000/,
);

// П. 1 «а»: объект подпадает под позицию, требование обязательно.
const missingRequirementInput = {
  ...constructionInput,
  selectedPositions: [],
  additionalRequirementsPart2Art31: false,
  additionalRequirementsPart2Art31Text: "",
};
assert.equal(
  byCode(
    validatePp2571Requirements(missingRequirementInput),
    "pp2571-required-by-object",
  )?.level,
  "error",
);
assert.equal(
  byCode(
    validatePp2571Requirements({ ...missingRequirementInput, isDraft: true }),
    "pp2571-required-by-object",
  )?.level,
  "warning",
);

// Позиция не соответствует объекту закупки.
assert.ok(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      selectedPositions: ["pp2571-34"],
    }),
    "pp2571-object-mismatch",
  ),
);

// П. 4: только вместе с ч. 2.1 ст. 31 и с текстом.
const point4Issues = validatePp2571Requirements({
  ...constructionInput,
  point4Requirement: true,
});
assert.ok(byCode(point4Issues, "pp2571-point4-without-part2-1"));
assert.ok(byCode(point4Issues, "pp2571-point4-text"));
assert.equal(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      requirementsPart2_1Art31: true,
      point4Requirement: true,
      point4RequirementText: "Порядок подтверждения опыта",
    }),
    "pp2571-point4-text",
  ),
  undefined,
);

// П. 1 «б»: без ч. 1.1 ст. 31 санкционный РНП обязателен.
assert.ok(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      requirementsPart1_1Art31: false,
      sanctionsRnpRequirement: false,
    }),
    "pp2571-sanctions-rnp",
  ),
);
assert.equal(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      requirementsPart1_1Art31: false,
      sanctionsRnpRequirement: true,
    }),
    "pp2571-sanctions-rnp",
  ),
  undefined,
);

// Графа приложения: описание подтверждающих документов не пустое.
assert.ok(
  byCode(
    validatePp2571Requirements({
      ...constructionInput,
      additionalRequirementsPart2Art31Text: "",
    }),
    "pp2571-documents-description",
  ),
);

// 7. Схема СЗ: валидатор встроен в superRefine и блокирует сохранение.
const baseNote = emptyPurchaseNote("org-1");
const validNote = {
  ...baseNote,
  noteNumber: "1",
  noteDate: "2026-11-23",
  initiatorName: "Иванов Иван Иванович",
  subject: "Строительство школы на 500 мест",
  placingWayCode: "EA20",
  initialMaxPrice: "6000000.00",
  items: [
    {
      id: "item-1",
      name: "Строительство школы на 500 мест",
      okpd2Code: "41.20.40",
      okpd2Name: "Здания и работы по возведению зданий",
      quantity: "1",
    },
  ],
  additionalRequirementsPart2Art31: true,
  additionalRequirementsPart2Art31Text:
    "Документы по графе приложения ПП РФ № 2571",
  pp2571Positions: ["pp2571-6"],
  status: "approved" as const,
};

const validResult = PurchaseNoteSchema.safeParse(validNote);
assert.equal(
  validResult.success,
  true,
  validResult.success ? "" : JSON.stringify(validResult.error.issues),
);

const thresholdNoteResult = PurchaseNoteSchema.safeParse({
  ...validNote,
  initialMaxPrice: "3000000.00",
});
assert.equal(thresholdNoteResult.success, false);
assert.ok(
  !thresholdNoteResult.success &&
    thresholdNoteResult.error.issues.some(
      (issue) => issue.path[0] === "pp2571Positions",
    ),
);

const noFlagResult = PurchaseNoteSchema.safeParse({
  ...validNote,
  additionalRequirementsPart2Art31: false,
  additionalRequirementsPart2Art31Text: "",
});
assert.equal(noFlagResult.success, false);
assert.ok(
  !noFlagResult.success &&
    noFlagResult.error.issues.some(
      (issue) => issue.path[0] === "additionalRequirementsPart2Art31",
    ),
);

// Черновик сохраняется с предупреждениями, согласованная СЗ — нет.
const draftResult = PurchaseNoteSchema.safeParse({
  ...validNote,
  status: "draft" as const,
  pp2571Positions: [],
  additionalRequirementsPart2Art31: false,
  additionalRequirementsPart2Art31Text: "",
});
assert.equal(
  draftResult.success,
  true,
  draftResult.success ? "" : JSON.stringify(draftResult.error.issues),
);

const approvedMissingResult = PurchaseNoteSchema.safeParse({
  ...validNote,
  pp2571Positions: [],
  additionalRequirementsPart2Art31: false,
  additionalRequirementsPart2Art31Text: "",
});
assert.equal(approvedMissingResult.success, false);

// Старые СЗ с текстовыми метками позиций проходят валидацию без миграции.
const legacyLabelResult = PurchaseNoteSchema.safeParse({
  ...validNote,
  pp2571Positions: [
    "Позиция 6 разд. II ПП РФ № 2571 (Работы по строительству, реконструкции объекта кап. строительства)",
  ],
});
assert.equal(
  legacyLabelResult.success,
  true,
  legacyLabelResult.success
    ? ""
    : JSON.stringify(legacyLabelResult.error.issues),
);

// 9. Выгрузка в ЕИС: связь «позиция приложения → addRequirement».
// В XML `shortName` — код записи nsiPurchasePreferences (до 20 символов),
// `name` — наименование позиции, `content` — текст требования с ОКПД2
// объектов закупки. Метка позиции в shortName не помещается, поэтому код
// хранится отдельно от подписи.
assert.equal(pp2571EisCode("pp2571-6"), "PP2571-6");
assert.equal(pp2571EisCode("Позиция 17 разд. III"), "PP2571-17");
assert.equal(pp2571EisCode("неизвестно"), "");

PP2571_POSITIONS.forEach((item) => {
  assert.ok(
    item.eisCode.length > 0 &&
      item.eisCode.length <= PP2571_EIS_LIMITS.shortName,
    `код ЕИС позиции ${item.number} должен укладываться в shortName (${PP2571_EIS_LIMITS.shortName})`,
  );
  assert.ok(
    item.label.length <= PP2571_EIS_LIMITS.name,
    `наименование позиции ${item.number} должно укладываться в text2000Type`,
  );
});
assert.equal(
  new Set(PP2571_POSITIONS.map((item) => item.eisCode)).size,
  PP2571_POSITIONS.length,
);

const eisItems = [
  { name: "Строительство школы на 500 мест", okpd2Code: "41.20.40" },
  {
    name: "Работы по строительству автомобильной дороги",
    okpd2Code: "42.11.20",
  },
  { name: "Поставка бумаги", okpd2Code: "17.12.14" },
];

assert.deepEqual(pp2571ObjectsForPosition("pp2571-17", eisItems), [
  "ОКПД2 42.11.20 — Работы по строительству автомобильной дороги",
]);

const eisRequirements = buildPp2571EisRequirements(
  ["pp2571-6", "pp2571-17"],
  eisItems,
  20_000_000,
);
assert.equal(eisRequirements.length, 2);

const [schoolRequirement, roadRequirement] = eisRequirements;
assert.equal(schoolRequirement.shortName, "PP2571-6");
assert.equal(schoolRequirement.name, position(6).label);
assert.ok(schoolRequirement.content.includes("ОКПД2 41.20.40"));
assert.ok(!schoolRequirement.content.includes("42.11.20"));
assert.ok(!schoolRequirement.content.includes("17.12.14"));
// 20 млн ≤ 100 млн — первая ступень приложения: не менее 50 % НМЦК.
assert.ok(schoolRequirement.content.includes("не менее 50 %"));
assert.ok(roadRequirement.content.includes("ОКПД2 42.11.20"));
eisRequirements.forEach((requirement) => {
  assert.ok(requirement.content.length <= PP2571_EIS_LIMITS.content);
});

const requirementWithoutObjects = buildPp2571EisRequirements(
  ["pp2571-34"],
  eisItems,
  1_000_000,
);
assert.equal(requirementWithoutObjects.length, 1);
assert.ok(requirementWithoutObjects[0].content.includes("не указаны"));

// XML-фрагмент requirementsInfo: все три поля addRequirement на месте.
const requirementsXml = buildEis17RequirementsXml([
  {
    code: "TU44",
    name: "Дополнительные требования к участникам закупок (ч. 2 ст. 31)",
    addRequirements: eisRequirements,
  },
]);
assert.ok(requirementsXml.includes("<shortName>PP2571-6</shortName>"));
assert.ok(requirementsXml.includes("<shortName>PP2571-17</shortName>"));
assert.ok(requirementsXml.includes("<name>Позиция 6 разд. II"));
assert.ok(requirementsXml.includes("ОКПД2 41.20.40"));
assert.equal(requirementsXml.includes("<addRequirement></addRequirement>"), false);

// Код ЕИС в каталоге не нарушает ограничение shortName — правило молчит.
const eisCodeIssues = validatePp2571Requirements({
  nmck: 20_000_000,
  placingWayCode: "EA20",
  items: eisItems,
  selectedPositions: ["pp2571-6"],
  additionalRequirementsPart2Art31: true,
  additionalRequirementsPart2Art31Text: "Документы по графе приложения",
});
assert.equal(codes(eisCodeIssues).includes("pp2571-eis-code"), false);

console.log("check:pp2571 — все проверки пройдены");


