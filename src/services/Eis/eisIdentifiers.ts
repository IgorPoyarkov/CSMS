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
 * Стабильная часть ИКЗ, которая не меняется при перезаключении контракта:
 * год планирования + ИНН + КПП + код позиции плана-графика (разряды 20–26).
 * Разряды 27–36 описывают конкретную закупку и при переторге отличаются.
 */
export const ikzPositionKey = (value: string): string | null => {
  const ikz = value.trim();
  if (!isIkz(ikz)) return null;
  return [
    ikz.slice(0, 2),
    ikz.slice(3, 13),
    ikz.slice(13, 19),
    ikz.slice(19, 26),
  ].join("|");
};

/**
 * Оставить только цифры.
 *
 * Номера копируют из ЕИС и из писем: там пробелы, неразрывные пробелы и
 * дефисы. Вырезать их на вводе честнее, чем ругаться «не те символы».
 */
export const digitsOnly = (value: string): string => value.replace(/\D/g, "");
