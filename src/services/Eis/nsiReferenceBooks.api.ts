import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

/**
 * Каталог справочников ЕИС и связка «XSD → НСИ → наш компонент».
 *
 * JSON собирается скриптом scripts/reference-books/build_reference_book_links.py
 * из выгрузки «Все справочники по ЭП»: 104 листа, коды НСИ, число записей и
 * файлы XSD/UI, где встречен код. Это описание справочников, а не сами значения:
 * значения живут в /api/references/* на бэке.
 */

const NsiFileRefSchema = z.object({
  file: z.string(),
  hits: z.number(),
  lines: z.array(z.number()),
  source: z.enum(["xsd", "code", "declared"]),
});

const NsiBookSchema = z.object({
  sheet: z.string(),
  code: z.string(),
  codes: z.array(z.string()),
  title: z.string(),
  columns: z.array(z.string()),
  rowCount: z.number(),
  sampleRows: z.array(z.array(z.string())),
  ktruItems: z.number(),
  xsdRefs: z.array(NsiFileRefSchema),
  uiRefs: z.array(NsiFileRefSchema),
});

const NsiCatalogSchema = z.object({
  sourceFile: z.string(),
  generatedAt: z.string(),
  bookCount: z.number(),
  xsdFileCount: z.number(),
  ktru: z.object({
    descriptorSheets: z.array(z.string()),
    descriptorCodes: z.array(z.string()),
    valueSheets: z.array(z.string()),
    appDataset: z.string(),
    appEndpoint: z.string(),
  }),
  externalDatasets: z.array(
    z.object({
      code: z.string(),
      inArchive: z.union([z.boolean(), z.literal("descriptor-only")]),
      source: z.string(),
      ui: z.array(z.string()),
    }),
  ),
  books: z.array(NsiBookSchema),
});

export type NsiFileRef = z.infer<typeof NsiFileRefSchema>;
export type NsiBook = z.infer<typeof NsiBookSchema>;
export type NsiCatalog = z.infer<typeof NsiCatalogSchema>;

export const NSI_CATALOG_KEY = "nsi-reference-books";

const fetchCatalog = async (): Promise<NsiCatalog> => {
  const { data } = await axios.get("/nsi-reference-books.json");

  return NsiCatalogSchema.parse(data);
};

/** Каталог НСИ/read-only: меняется только при пересборке скриптом. */
export const useNsiReferenceBooks = () =>
  useQuery({
    queryKey: [NSI_CATALOG_KEY],
    queryFn: fetchCatalog,
    staleTime: 60 * 60_000,
  });

export const fileNameOf = (path: string): string =>
  path.replace(/\\/g, "/").split("/").pop() ?? path;

/** Справочники, упомянутые в конкретном XSD-файле карты покрытия. */
export const nsiBooksForXsd = (
  catalog: NsiCatalog,
  xsdFile: string,
): NsiBook[] => {
  const names = new Set(
    xsdFile
      .split(/[+,]/)
      .map((part) => fileNameOf(part.trim()).replace(/:\d+$/, ""))
      .filter(Boolean),
  );

  return catalog.books.filter((book) =>
    book.xsdRefs.some((ref) => names.has(fileNameOf(ref.file))),
  );
};
