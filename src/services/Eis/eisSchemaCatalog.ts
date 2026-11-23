import { useQuery } from "@tanstack/react-query";

/**
 * Каталог XSD Альбома ЕИС для обозревателя схем.
 *
 * Файл кладёт генератор csms-api/scripts/generate-schema-docs.ps1 в public/.
 * Это не запрос к ЕИС и не json-server: статический снимок установленной
 * версии схем, поэтому его можно читать даже когда шлюз не запущен.
 */

export interface EisSchemaField {
  name: string;
  type: string;
  optional: boolean;
  array: boolean;
  documentation: string | null;
}

export interface EisSchemaType {
  name: string;
  namespace: string;
  kind: string;
  base: string | null;
  documentation: string | null;
  fields: EisSchemaField[];
  enumValues: string[];
}

export interface EisNamespaceInfo {
  uri: string;
  alias: string;
  typeCount: number;
}

export interface EisSchemaCatalog {
  version: string;
  sourceId: string;
  sha256: string;
  generatedAt: string;
  xsdFileCount: number;
  namespaces: EisNamespaceInfo[];
  types: EisSchemaType[];
}

export const EIS_SCHEMA_CATALOG_URL = `${import.meta.env.BASE_URL}eis-schemas/catalog.json`;

export const eisSchemaCatalogQueryKey = ["eisSchemaCatalog"];

/**
 * Предвычисленные индексы каталога (8,7 МБ, около 20 тысяч типов).
 * Без них фильтр переводил в нижний регистр имя, пространство имён, описание
 * и все поля каждого типа при каждом нажатии в строке поиска, а каждая строка
 * списка искала пространство имён линейным find.
 */
export interface EisCatalogIndex {
  /** Псевдоним пространства имён по URI — для подписи в строке списка. */
  namespaceAliases: Map<string, string>;
  /** Тип по имени — вместо линейного поиска выбранного определения. */
  typesByName: Map<string, EisSchemaType>;
  /** Нижний регистр всех полей поиска, собранный один раз на каталог. */
  searchRows: { type: EisSchemaType; haystack: string }[];
}

const catalogIndexCache = new WeakMap<EisSchemaCatalog, EisCatalogIndex>();

export const getEisCatalogIndex = (
  catalog: EisSchemaCatalog,
): EisCatalogIndex => {
  const cached = catalogIndexCache.get(catalog);
  if (cached) return cached;

  const namespaceAliases = new Map<string, string>(
    catalog.namespaces.map((info) => [info.uri, info.alias] as const),
  );
  const typesByName = new Map<string, EisSchemaType>(
    catalog.types.map((type) => [type.name, type] as const),
  );
  const searchRows = catalog.types.map((type) => ({
    type,
    haystack: [
      type.name,
      type.namespace,
      type.base ?? "",
      type.documentation ?? "",
      ...type.fields.flatMap((field) => [field.name, field.type]),
    ]
      .join("\n")
      .toLocaleLowerCase(),
  }));

  const index = { namespaceAliases, typesByName, searchRows };
  catalogIndexCache.set(catalog, index);
  return index;
};

export const useEisSchemaCatalog = () =>
  useQuery({
    queryKey: eisSchemaCatalogQueryKey,
    // Снимок меняется только при обновлении XSD и перегенерации каталога
    staleTime: Number.POSITIVE_INFINITY,
    // Статический файл: при 404 повтор не поможет, нужна перегенерация
    retry: 0,
    queryFn: async (): Promise<EisSchemaCatalog> => {
      const response = await fetch(EIS_SCHEMA_CATALOG_URL);

      if (!response.ok) {
        throw new Error(
          `Не удалось прочитать каталог XSD (${response.status}). ` +
            "Запустите csms-api/scripts/generate-schema-docs.ps1",
        );
      }

      return (await response.json()) as EisSchemaCatalog;
    },
  });

export const KIND_LABELS: Record<string, string> = {
  complex: "ComplexType",
  element: "Элемент",
  enum: "Перечисление",
  list: "Список",
  union: "Union",
  simple: "SimpleType",
  type: "Тип",
};
