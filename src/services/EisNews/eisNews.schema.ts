import { z } from "zod";

/** Один элемент RSS-ленты новостей ЕИС. */
export const EisNewsItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  summary: z.string().optional(),
  url: z.string().url(),
  publishedAt: z.string().optional(),
});

export type EisNewsItem = z.infer<typeof EisNewsItemSchema>;

/** Полный ответ API: метаданные кэша + массив элементов. */
export const EisNewsFeedSchema = z.object({
  // null приходит, когда лента ещё ни разу не загрузилась (ЕИС недоступен)
  fetchedAt: z.union([z.string(), z.null()]).optional(),
  cached: z.boolean().optional(),
  items: z.array(EisNewsItemSchema).default([]),
});

export type EisNewsFeed = z.infer<typeof EisNewsFeedSchema>;
