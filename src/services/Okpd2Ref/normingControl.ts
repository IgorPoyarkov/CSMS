import { findOkpd2ByCode } from "./okpd2Ref.api";
import type { Okpd2Ref } from "./okpd2Ref.schema";

/**
 * Контроль обязательного нормирования (ПП РФ N 926 от 02.09.2015 «Об общих
 * правилах определения требований к закупаемым заказчиками отдельным видам
 * товаров, работ, услуг (в том числе предельных цен…)» и ПП РФ N 1047 от
 * 13.10.2014 «Нормативные затраты»).
 *
 * Позиции, помеченные в справочнике ОКПД2 как нормируемые (`isNormed`), имеют
 * предельную цену единицы (`normLimit`). Цена за единицу выше предельной —
 * нарушение. Оно не блокирует закупку насовсем: заказчик вправе пойти на
 * нарушение, но только когда обоснование подпишет главный подписант
 * (руководитель контрактной службы или контрактный управляющий). До его подписи
 * превышение считается ошибкой и не даёт сохранить документ, после —
 * понижается до предупреждения, а факт нарушения остаётся зафиксированным.
 */

// Проверяемый позиции-кандидат: код ОКПД2 позиции и цена за единицу
export interface NormingSubject {
  code?: string;
  unitPrice?: number;
}

export interface NormingViolationBase {
  code: string;
  name: string;
  unitPrice: number;
  normLimit: number;
  excess: number;
}

export interface NormingViolation extends NormingViolationBase {
  index: number;
}

/**
 * Признак нарушения по одной позиции. Возвращает null, если код не нормируется,
 * предельная цена не установлена или цена единицы не превышает предельную.
 */
export const normingViolation = (
  subject: NormingSubject,
  dictionary: Okpd2Ref[],
): NormingViolationBase | null => {
  const matched = findOkpd2ByCode(dictionary, subject.code);

  if (!matched?.isNormed) {
    return null;
  }

  const normLimit = matched.normLimit;
  const unitPrice = subject.unitPrice;

  if (normLimit === undefined || normLimit === null) {
    return null;
  }

  if (
    typeof unitPrice !== "number" ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= normLimit
  ) {
    return null;
  }

  return {
    code: matched.code,
    name: matched.name,
    unitPrice,
    normLimit,
    excess: Number((unitPrice - normLimit).toFixed(2)),
  };
};

// Нарушения по всем позициям с сохранением номера позиции для подсказки в форме
export const collectNormingViolations = (
  subjects: NormingSubject[],
  dictionary: Okpd2Ref[],
): NormingViolation[] => {
  const violations: NormingViolation[] = [];

  subjects.forEach((subject, index) => {
    const violation = normingViolation(subject, dictionary);

    if (violation) {
      violations.push({ ...violation, index });
    }
  });

  return violations;
};

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatRub = (value: number): string =>
  `${rubFormatter.format(value)} руб.`;
