/**
 * Новости ЕИС из RSS-ленты zakupki.gov.ru.
 *
 * RSS-лента ЕИС содержит заголовки, описания, ссылки и даты публикаций.
 * Фронтенд запрашивает данные через адаптер PG (`/pg-api/__rss/eis-news`),
 * а не напрямую — так избегаем CORS-ограничений браузера.
 *
 * Запуск: `node -e "import('./scripts/lib/eis-news.mjs').then(m => m.fetchEisNews({limit:3}))"`
 */

/** Источник RSS-ленты новостей ЕИС. */
export const EIS_NEWS_RSS_URL =
  process.env.EIS_NEWS_RSS_URL?.trim() ||
  "https://zakupki.gov.ru/epz/main/public/news/rss";

/** Базовый домен для абсолютных ссылок. */
export const EIS_NEWS_ORIGIN =
  process.env.EIS_NEWS_ORIGIN?.trim() || "https://zakupki.gov.ru";

/** TTL кэша в минутах (по умолчанию 15). */
export const EIS_NEWS_TTL_MINUTES =
  Number(process.env.EIS_NEWS_TTL_MINUTES) || 15;

/**
 * Декодирует XML-сущности: &amp; → &, &lt; → <, &gt; → >, &quot; → ", &apos; → '.
 */
const decodeXmlEntities = (text) =>
  String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

/**
 * Извлекает содержимое тега (с поддержкой CDATA).
 */
const extractTag = (xml, tag) => {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = pattern.exec(xml);
  if (!match) return "";
  return decodeXmlEntities(
    match[1].replace(/<!\[CDATA\[(.*?)\]\]>|<[^>]*>/g, "$1"),
  );
};

/**
 * Парсит RSS-ленту: извлекает первые `limit` элементов.
 *
 * RSS ЕИС — большой файл (3+ МБ), поэтому лучше не скачивать целиком.
 * Здесь парсим уже полученный текст и ограничиваем количество элементов.
 */
const parseItems = (xml, limit = 10) => {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while (items.length < limit && (match = itemRegex.exec(xml))) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");

    if (title) {
      items.push({
        id: `news-${items.length}-${title.slice(0, 30)}`,
        title,
        summary: description?.slice(0, 250) || undefined,
        url: link.startsWith("http") ? link : `${EIS_NEWS_ORIGIN}${link}`,
        publishedAt: pubDate || undefined,
      });
    }
  }
  return items;
};

/**
 * Скачивает RSS-ленту, парсит и возвращает отфильтрованный список.
 *
 * Использует fetch с ограничением по времени (timeout), т.к. лента ЕИС
 * может быть большой. Тело читается до получения достаточного количества
 * элементов или по таймауту.
 *
 * При ошибке сети / TLS возвращает `null` — вызывающий код может
 * использовать кэшированные данные или показать сообщение об ошибке.
 */
const fetchFeed = async (limit = 10, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(EIS_NEWS_RSS_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        // Заголовок обязан быть ASCII: кириллица в User-Agent ломает fetch
        "User-Agent": "CSMS/1.0 (customer contract service)",
      },
    });

    if (!response.ok) {
      throw new Error(`ЕИС ответил ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return parseItems(text, limit);
  } catch (error) {
    // Не выкидываем ошибку внутрь — возвращаем null,
    // чтобы вызывающий код мог использовать кэш или показать ошибку на фронте
    console.error(`[eis-news] не удалось получить ленту: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Кэш результатов: `{ fetchedAt, items }`. */
let _cache = { fetchedAt: null, items: [] };

/**
 * Загрузка новостей ЕИС с кэшированием.
 *
 * @param {object} options
 * @param {number} [options.limit=10] — максимальное количество элементов
 * @param {boolean} [options.refresh=false] — игнорировать кэш
 * @returns {Promise<{ fetchedAt: string|null, cached: boolean, items: EisNewsItem[] }>}
 */
export const fetchEisNews = async ({ limit = 10, refresh = false } = {}) => {
  // Проверяем кэш
  const now = Date.now();
  const ttlMs = EIS_NEWS_TTL_MINUTES * 60 * 1000;
  if (!refresh && _cache.fetchedAt && now - _cache.fetchedAt < ttlMs) {
    return {
      fetchedAt: new Date(_cache.fetchedAt).toISOString(),
      cached: true,
      items: _cache.items,
    };
  }

  const items = await fetchFeed(limit);

  // fetchFeed вернул null при сетевой ошибке или ошибке TLS.
  // Если в кэше есть хоть какие-то данные, возвращаем их как устаревшие,
  // иначе фронт увидит пустую ленту и покажет сообщение об ошибке.
  if (items === null) {
    if (_cache.items.length > 0) {
      return {
        fetchedAt: _cache.fetchedAt
          ? new Date(_cache.fetchedAt).toISOString()
          : null,
        cached: true,
        items: _cache.items,
      };
    }
    return { fetchedAt: null, cached: false, items: [] };
  }

  _cache = { fetchedAt: now, items };
  return { fetchedAt: new Date(now).toISOString(), cached: false, items };
};

/**
 * Очистка кэша (полезно при ручном перезапуске сервера).
 */
export const clearNewsCache = () => {
  _cache = { fetchedAt: null, items: [] };
};

/**
 * Последний удачный ответ из кэша — чтобы страница не оставалась пустой,
 * если ЕИС временно недоступен.
 */
export const getCachedNews = () => ({
  fetchedAt: _cache.fetchedAt ? new Date(_cache.fetchedAt).toISOString() : null,
  items: _cache.items,
});
