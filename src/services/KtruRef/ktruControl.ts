import type { KtruCharacteristic, KtruRef } from "./ktruRef.schema";
import { findKtruByCode, findKtruByOkpd2 } from "./ktruRef.api";

/**
 * Правила применения КТРУ (ПП РФ от 08.02.2017 № 145).
 *
 * Если позиция ОКПД2 есть в каталоге, описание объекта закупки формируется по
 * позиции КТРУ: наименование, единица измерения и характеристики каталога
 * обязательны. Дополнительные характеристики сверх КТРУ допускаются только
 * с обоснованием (п. 6 Правил).
 */

export interface KtruIssue {
  level: "warning" | "error";
  code: string;
  message: string;
}

const formatCharacteristic = (c: KtruCharacteristic): string => {
  const unit = c.unit ? ` ${c.unit}` : "";
  switch (c.valueType) {
    case "range":
      return [
        c.minValue && `от ${c.minValue}`,
        c.maxValue && `до ${c.maxValue}`,
      ]
        .filter(Boolean)
        .join(" ")
        .concat(unit);
    case "min":
      return c.minValue ? `не менее ${c.minValue}${unit}` : "не задано";
    case "max":
      return c.maxValue ? `не более ${c.maxValue}${unit}` : "не задано";
    default:
      return c.valueText ? `${c.valueText}${unit}` : "не задано";
  }
};

/** Текст характеристики КТРУ для единого набора характеристик */
export const ktruCharacteristicText = (c: KtruCharacteristic): string =>
  `${c.name}: ${formatCharacteristic(c)}`;

/**
 * Проверка позиции закупки на наличие в КТРУ.
 *
 * Возвращает предупреждение, если код ОКПД2 присутствует в каталоге,
 * а позиция КТРУ не выбрана, либо выбранная позиция относится к другому
 * коду ОКПД2.
 */
export const checkKtruUsage = (
  dictionary: KtruRef[],
  okpd2Code: string | undefined,
  ktruCode?: string,
): KtruIssue | null => {
  if (!okpd2Code?.trim()) return null;

  const matchedByOkpd2 = findKtruByOkpd2(dictionary, okpd2Code);
  const selected = findKtruByCode(dictionary, ktruCode);

  if (selected) {
    if (selected.okpd2Code !== okpd2Code) {
      return {
        level: "error",
        code: "KTRU_OKPD2_MISMATCH",
        message: `Позиция КТРУ ${selected.ktruCode} относится к ОКПД2 ${selected.okpd2Code}, а в позиции указан ${okpd2Code}.`,
      };
    }
    return null;
  }

  if (matchedByOkpd2.length > 0) {
    return {
      level: "warning",
      code: "KTRU_REQUIRED",
      message: `Код ОКПД2 ${okpd2Code} есть в КТРУ (${matchedByOkpd2
        .map((item) => item.ktruCode)
        .join(
          ", ",
        )}). По ПП РФ № 145 описание объекта закупки нужно формировать по позиции каталога: наименование, единица измерения и характеристики КТРУ обязательны.`,
    };
  }

  return null;
};

/** Обязательные характеристики выбранной позиции КТРУ */
export const mandatoryKtruCharacteristics = (
  dictionary: KtruRef[],
  ktruCode: string | undefined,
): KtruCharacteristic[] =>
  findKtruByCode(dictionary, ktruCode)?.characteristics.filter(
    (c) => c.isMandatory,
  ) ?? [];

/**
 * Требования к позиции из КТРУ для блока набора характеристик извещения.
 * Используются типы требований ПП РФ № 926 (consumer/quality/functional/other).
 */
export const ktruRequirements = (
  dictionary: KtruRef[],
  ktruCodes: string[],
): {
  id: string;
  requirementType: "consumer" | "quality" | "functional" | "other";
  requirementText: string;
}[] =>
  ktruCodes.flatMap((code) => {
    const item = findKtruByCode(dictionary, code);
    if (!item) return [];
    return item.characteristics.map((c, index) => ({
      id: `ktru-${item.ktruCode}-${index}`,
      requirementType: "consumer" as const,
      requirementText: `[КТРУ ${item.ktruCode}] ${ktruCharacteristicText(c)}`,
    }));
  });
