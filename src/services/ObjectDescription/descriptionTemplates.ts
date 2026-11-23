import {
  classifyProcurement,
  okpd2Signal,
} from "../../../scripts/lib/civil-law-core.mjs";
import type { KtruRef } from "../KtruRef/ktruRef.schema";
import type {
  ObjectCharacteristic,
  ObjectDescription,
} from "./objectDescription.schema";

/**
 * Оцифрованные шаблоны для карточки ООЗ.
 *
 * Характеристики КТРУ приходят структурированными (тип значения, границы,
 * единица), поэтому их можно перенести в описание без ручного перевода в текст.
 * Инструкция участнику здесь — только часть, относящаяся к объекту закупки:
 * полная инструкция формируется на этапе извещения (там есть не только ООЗ).
 */

export const PARTICIPANT_INSTRUCTION_HINT =
  "Здесь формируется часть инструкции по объекту закупки. Полная инструкция по заполнению заявки собирается на этапе извещения.";

/**
 * Признак товарной позиции: п. 7 ч. 1 ст. 33 применяется к товару, в том числе
 * поставляемому в ходе работ/услуг. Неизвестный код ОКПД2 оставляем видимым —
 * скрыть обязательное требование хуже, чем показать лишнее поле.
 */
export const isGoodsObjectDescription = (
  description: Pick<ObjectDescription, "title" | "okpd2Code">,
): boolean => {
  const signal = okpd2Signal(description.okpd2Code).kind;
  if (signal === "goods" || signal === "unknown" || signal === "ambiguous") {
    return true;
  }

  const classification = classifyProcurement({
    subject: description.title,
    okpd2Code: description.okpd2Code,
  });

  return classification.exceptions.some((exception) =>
    ["embeddedSupply", "mixedSubjectGoodsWorks"].includes(exception),
  );
};

/** Перенос характеристик позиции КТРУ в набор характеристик ООЗ. */
export const ktruToObjectCharacteristics = (
  item: KtruRef,
): ObjectCharacteristic[] =>
  item.characteristics.map((characteristic, index) => ({
    id: `ktru-${item.ktruCode}-${index}`,
    category: characteristic.valueType === "text" ? "quality" : "technical",
    name: characteristic.name,
    unit: characteristic.unit ?? "",
    valueType: characteristic.valueType,
    valueText: characteristic.valueText ?? "",
    minValue: characteristic.minValue ?? "",
    maxValue: characteristic.maxValue ?? "",
    isMandatoryFromKtru: characteristic.isMandatory,
    isAdditionalOverKtru: false,
    additionalJustification: "",
    instructionForParticipant: characteristic.instruction ?? "",
  }));

/**
 * Добавление характеристик КТРУ к уже заполненным вручную: совпавшие по
 * наименованию строки обновляются, остальные пользовательские строки сохраняются.
 */
export const mergeKtruCharacteristics = (
  current: ObjectCharacteristic[],
  fromKtru: ObjectCharacteristic[],
): ObjectCharacteristic[] => {
  const byName = new Map(
    current.map((characteristic) => [
      characteristic.name.trim().toLowerCase(),
      characteristic,
    ]),
  );

  const merged = [...current];
  for (const characteristic of fromKtru) {
    const key = characteristic.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, characteristic);
      merged.push(characteristic);
      continue;
    }

    const index = merged.findIndex((item) => item.id === existing.id);
    merged[index] = {
      ...existing,
      unit: characteristic.unit || existing.unit,
      valueType: characteristic.valueType,
      valueText: characteristic.valueText || existing.valueText,
      minValue: characteristic.minValue || existing.minValue,
      maxValue: characteristic.maxValue || existing.maxValue,
      instructionForParticipant:
        characteristic.instructionForParticipant ||
        existing.instructionForParticipant,
      isMandatoryFromKtru: true,
      isAdditionalOverKtru: false,
    };
  }

  return merged;
};

const unitSuffix = (unit: string) => (unit ? ` ${unit}` : "");

/**
 * Готовый шаблон инструкции участнику по п. 2 ч. 1 ст. 33 44-ФЗ.
 * Текст собирается только из структурированных показателей ООЗ: для
 * диапазонов, ограничений и перечней формулировки отличаются.
 */
export const buildParticipantInstructionTemplate = (
  description: ObjectDescription,
): string => {
  const lines = [
    "Инструкция по заполнению первой части заявки (часть описания объекта закупки, п. 2 ч. 1 ст. 33 44-ФЗ):",
    "Участник закупки указывает конкретные показатели, соответствующие требованиям описания объекта закупки и единицам измерения, в них указанным.",
  ];

  for (const characteristic of description.characteristics) {
    if (!characteristic.name.trim()) continue;
    const name = `«${characteristic.name.trim()}»`;
    const unit = unitSuffix(characteristic.unit.trim());

    switch (characteristic.valueType) {
      case "range":
        lines.push(
          `По показателю ${name} участник указывает значение в диапазоне от ${
            characteristic.minValue.trim() || "—"
          } до ${characteristic.maxValue.trim() || "—"}${unit}, включая границы диапазона.`,
        );
        break;
      case "min":
        lines.push(
          `По показателю ${name} участник указывает конкретное значение не менее ${
            characteristic.minValue.trim() || "—"
          }${unit}.`,
        );
        break;
      case "max":
        lines.push(
          `По показателю ${name} участник указывает конкретное значение не более ${
            characteristic.maxValue.trim() || "—"
          }${unit}.`,
        );
        break;
      case "enum":
        lines.push(
          `По показателю ${name} участник указывает одно значение из перечня: ${
            characteristic.valueText.trim() || "—"
          }${unit}.`,
        );
        break;
      case "exact":
        lines.push(
          `По показателю ${name} участник указывает конкретное значение ${
            characteristic.valueText.trim() || "—"
          }${unit}.`,
        );
        break;
      default:
        break;
    }
  }

  if (description.characteristics.length === 0) {
    lines.push(
      "Характеристики с диапазонами, ограничениями и перечнями значений в описании не установлены.",
    );
  }

  lines.push(
    "Для показателей с диапазоном участник вправе указать любое значение в пределах диапазона; для показателей «не менее» / «не более» — конкретное значение, удовлетворяющее ограничению; для перечня — одно значение из перечня.",
  );

  return lines.join("\n");
};
