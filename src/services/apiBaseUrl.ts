/**
 * Единый адрес csms-api для всех клиентов.
 *
 * В dev явный адрес не нужен: Vite проксирует `/api` и `/openapi` на :5099,
 * поэтому relatives пути работают без CORS и без привязки к порту бэкенда.
 * В prod обращаемся к тому же origin (например, за reverse-proxy): жёсткий
 * `http://localhost:5099` в собранном фронте указывал бы на компьютер пользователя.
 * Явно заданный VITE_EIS_API_URL по-прежнему имеет наивысший приоритет.
 */

const origin = globalThis.location?.origin ?? "";

export const CSMS_API_BASE_URL =
  import.meta.env.VITE_EIS_API_URL || (import.meta.env.DEV ? "" : origin);

/** json-server живёт отдельно от /api и в dev остаётся на :3001. */
export const JSON_SERVER_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : origin);
