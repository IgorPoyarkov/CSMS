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
