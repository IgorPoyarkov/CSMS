import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

// Каталог собирается скриптом scripts/consultant/build-npa-library.mjs из
// pravo-catalog.json, карточек pravo.gov.ru, манифеста загрузок и поискового
// индекса. JSON лежит в public/, поэтому сервер консультанта не нужен только
// для списка — сами тексты по-прежнему отдаёт /api/consultant/source/npa/:slug.
const NpaLibraryItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  shortName: z.string(),
  title: z.string(),
  kind: z.string(),
  number: z.string(),
  year: z.string(),
  relevantFrom: z.string(),
  role: z.string(),
  date: z.string(),
  redid: z.number().nullable(),
  actId: z.string(),
  cardUrl: z.string(),
  publicationUrl: z.string(),
  formats: z.array(z.string()),
  chunks: z.number(),
  status: z.enum(["available", "missing-card", "future", "archive", "no-text"]),
  note: z.string(),
  viewerUrl: z.string(),
  sourceUrl: z.string(),
  wordUrl: z.string(),
});

const NpaLibrarySchema = z.object({
  builtAt: z.string(),
  total: z.number(),
  available: z.number(),
  missingCard: z.number(),
  archive: z.number(),
  future: z.number(),
  indexedChunks: z.number(),
  kinds: z.array(z.string()),
  items: z.array(NpaLibraryItemSchema),
});

export type NpaLibraryItem = z.infer<typeof NpaLibraryItemSchema>;
export type NpaLibrary = z.infer<typeof NpaLibrarySchema>;

export const NPA_LIBRARY_KEY = "npa-library";

const fetchNpaLibrary = async (): Promise<NpaLibrary> => {
  const { data } = await axios.get("/npa-library.json");
  return NpaLibrarySchema.parse(data);
};

/** Каталог НПА проекта: серверные данные живут только в React Query. */
export const useNpaLibrary = () =>
  useQuery({
    queryKey: [NPA_LIBRARY_KEY],
    queryFn: fetchNpaLibrary,
    staleTime: 5 * 60_000,
  });
