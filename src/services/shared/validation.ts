import { z } from "zod";

/**
 * Общие хелперы zod-схем. Пустая строка из текстового input приравнивается
 * к «не заполнено»: все optional* принимают и "", и undefined. Перенос локальных
 * хелперов в один модуль не меняет правила валидации — сохранены refine-тела.
 */

/** Необязательный текст: "" или строка не короче minLength. */
export const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

/** Обязательный текст с минимальной длиной. */
export const requiredText = (minLength: number, message: string) =>
  z.string().min(minLength, message);

/** Необязательное поле под регулярное выражение. */
export const optionalPattern = (pattern: RegExp, message: string) =>
  z
    .string()
    .refine((value) => value === "" || pattern.test(value), message)
    .optional();

const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** Дата ГГГГ-ММ-ДД; "" и undefined допустимы. */
export const optionalDate = (
  message = "Неверный формат даты (ГГГГ-ММ-ДД)",
) => optionalPattern(ISO_DATE_PATTERN, message);

/** Денежная сумма с точностью до копеек; "" и undefined допустимы. */
export const optionalMoney = (
  message = "Укажите сумму числом с точностью до копеек",
) => optionalPattern(MONEY_PATTERN, message);

/** Обязательная сумма: пустая строка недопустима. */
export const requiredMoney = (message: string) =>
  z
    .string()
    .min(1, message)
    .refine(
      (value) => MONEY_PATTERN.test(value),
      "Укажите сумму числом с точностью до копеек",
    );

/** Процент от 0 до 100; "" и undefined допустимы. */
export const optionalPercent = () =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (PERCENT_PATTERN.test(value) &&
          Number(value) >= 0 &&
          Number(value) <= 100),
      "Укажите значение от 0 до 100",
    )
    .optional();

/** Цена единицы: до 11 знаков после запятой (п. 11 Положения № 60). */
export const optionalUnitPrice = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,11})?$/.test(value),
      "Цена единицы указывается с точностью до 11 знаков после запятой",
    )
    .optional();

/** Неотрицательное целое из строки; пустое значение становится undefined. */
export const optionalNonNegativeInt = () =>
  z
    .union([z.number(), z.string(), z.undefined()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
    })
    .optional();

/** Дробное число из строки; пустое значение становится undefined. */
export const optionalSmpPercent = () =>
  z
    .union([z.number(), z.string(), z.undefined()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .optional();
