import type { EisSchemaCatalog, EisSchemaType } from "../eisSchemaCatalog";

/**
 * Описания полей XSD из каталога схем.
 *
 * Карта `EIS_XSD_COVERAGE` хранит путь поля в XSD, но не копирует текст
 * описания: он уже есть в `public/eis-schemas/catalog.json`, который
 * генерируется из Альбома ЕИС. Здесь путь резолвится в тип каталога и берётся
 * `documentation` — так колонка «Что написано рядом» заполняется у всех полей,
 * а не только у тех, где описание вписано в карту вручную.
 */

/** Короткое имя типа: `oostypesX1_zfcs_purchasePlanType` → `zfcs_purchasePlanType`. */
const shortTypeName = (name: string): string => {
  const separator = name.indexOf("_");

  return separator === -1 ? name : name.slice(separator + 1);
};

const buildIndex = (catalog: EisSchemaCatalog): Map<string, EisSchemaType> => {
  const index = new Map<string, EisSchemaType>();

  for (const type of catalog.types) {
    index.set(type.name, type);

    const shortName = shortTypeName(type.name);

    if (!index.has(shortName)) {
      index.set(shortName, type);
    }
  }

  return index;
};

// Каталог большой (несколько мегабайт), поэтому индекс строится один раз на
// объект ответа react-query, а не на каждый рендер строки таблицы.
const indexCache = new WeakMap<EisSchemaCatalog, Map<string, EisSchemaType>>();

const catalogIndex = (
  catalog: EisSchemaCatalog,
): Map<string, EisSchemaType> => {
  const cached = indexCache.get(catalog);

  if (cached) {
    return cached;
  }

  const index = buildIndex(catalog);

  indexCache.set(catalog, index);

  return index;
};

const findType = (
  catalog: EisSchemaCatalog,
  name: string,
): EisSchemaType | null => {
  const index = catalogIndex(catalog);

  return index.get(name) ?? index.get(shortTypeName(name)) ?? null;
};

/** `zfcs_purchaseNotificationType + zfcs_notificationEFType` → два корня. */
const rootTypes = (xsdType: string): string[] =>
  xsdType
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * Составной путь (`a + b`, `a / b`, варианты в скобках) не резолвим: он
 * описывает выбор из нескольких веток, и одного «написано рядом» у него нет.
 */
const isCompositePath = (path: string): boolean => /[+()]|\s\/\s/.test(path);

const docForPath = (
  catalog: EisSchemaCatalog,
  root: string,
  path: string,
): string | null => {
  let current = findType(catalog, root);
  let documentation: string | null = null;

  for (const segment of path.split("/")) {
    if (!current) {
      return null;
    }

    const field = current.fields.find((item) => item.name === segment);

    if (!field) {
      return null;
    }

    documentation = field.documentation;
    current = field.type ? findType(catalog, field.type) : null;
  }

  return documentation;
};

/**
 * Описание поля по пути XSD. Приоритет — ручная цитата `fallback` из карты,
 * затем `documentation` каталога. `null` означает, что описания нет.
 */
export const eisXsdDoc = (
  catalog: EisSchemaCatalog | undefined,
  xsdType: string,
  xsdPath: string | null,
  fallback?: string,
): string | null => {
  if (fallback) {
    return fallback;
  }

  if (!catalog || !xsdPath || isCompositePath(xsdPath)) {
    return null;
  }

  for (const root of rootTypes(xsdType)) {
    const documentation = docForPath(catalog, root, xsdPath);

    if (documentation) {
      return documentation;
    }
  }

  return null;
};
