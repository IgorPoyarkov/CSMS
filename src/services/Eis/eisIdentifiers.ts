/**
 * Идентификаторы, по которым ЕИС находит контракт и закупку.
 *
 * Вынесены отдельно от схем пакетов, потому что те же правила нужны карточке
 * контракта: если номер проверяется в одном месте и не проверяется в другом,
 * в реестр спокойно попадает мусор, а на отправке выясняется, что отправлять
 * нечего. Одно правило — одна функция.
 */

/** Реестровый номер контракта в ЕИС — 19 цифр (присваивает портал). */
export const EIS_CONTRACT_NUMBER_LENGTH = 19;

/** ИКЗ — идентификационный код закупки, 36 разрядов. */
export const IKZ_LENGTH = 36;

const digitsOnlyPattern = (length: number): RegExp =>
  new RegExp(`^\\d{${length}}$`);

export const isEisContractNumber = (value: string): boolean =>
  digitsOnlyPattern(EIS_CONTRACT_NUMBER_LENGTH).test(value.trim());

export const isIkz = (value: string): boolean =>
  digitsOnlyPattern(IKZ_LENGTH).test(value.trim());

/**
 * Оставить только цифры.
 *
 * Номера копируют из ЕИС и из писем: там пробелы, неразрывные пробелы и
 * дефисы. Вырезать их на вводе честнее, чем ругаться «не те символы».
 */
export const digitsOnly = (value: string): string => value.replace(/\D/g, "");
