import { writeFileSync } from "node:fs";
import {
  OBJECT_CATEGORY_LIMITS,
  OKPD2_CATEGORY_RULES,
  PP2604_APPENDIX2_SOURCE,
  PP2604_FOOD_PURPOSE_RULE,
} from "../src/services/BidEvaluation/bidEvaluation.schema";

/**
 * Готовит снимок приложения N 2 и связей ОКПД2 для импортёра csms-api.
 * Данные уже сверены с PDF официального опубликования; скрипт только
 * переносит их в машиночитаемый вид без ручного переписывания.
 */
const purposePrefixes = ["10", "11"];

const seed = {
  rulesVersion: "pp2604-rules-v1",
  source: PP2604_APPENDIX2_SOURCE,
  categories: OBJECT_CATEGORY_LIMITS,
  rules: [
    ...purposePrefixes.map((prefix) => ({
      ...PP2604_FOOD_PURPOSE_RULE,
      prefix,
      purpose: "food_for_social_orgs",
      sortOrder: -1,
    })),
    ...OKPD2_CATEGORY_RULES.map((rule, index) => ({
      ...rule,
      purpose: null,
      sortOrder: index,
    })),
  ],
};

const target = process.argv[2];
if (!target) {
  throw new Error("Укажите путь к файлу снимка: npm run export:pp2604-seed -- <путь>");
}

writeFileSync(target, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
console.log(
  `Снимок записан: ${target} (${seed.categories.length} позиций, ${seed.rules.length} связей)`,
);
