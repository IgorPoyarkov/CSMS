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
    // Текст инструкции и код берём из ЕИС: локальную формулировку не изобретаем.
    instructionForParticipant: characteristic.instruction ?? "",
    instructionSourceCode:
      characteristic.characteristicsFillingInstructionCode ?? "",
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
      instructionSourceCode:
        characteristic.instructionSourceCode || existing.instructionSourceCode,
      isMandatoryFromKtru: true,
      isAdditionalOverKtru: false,
    };
  }

  return merged;
};


