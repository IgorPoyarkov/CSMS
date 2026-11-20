import axios from "axios";
import type { AxiosError, AxiosInstance } from "axios";

/**
 * Общий клиент csms-api (backend на .NET, PostgreSQL).
 *
 * Модули изменения контрактов и электронного актирования живут не в
 * json-server, а в csms-api. В dev без явного адреса идём через прокси Vite
 * (/api → localhost:5099): браузер видит один origin, и CORS-блокировка не
 * возникает. В production поведение прежнее — абсолютный адрес csms-api.
 *
 * ВАЖНО: это не замена `src/services/axios.instance.ts` для json-server —
 * у того другая база и другой набор эндпоинтов.
 */
const BASE_URL =
  import.meta.env.VITE_EIS_API_URL ||
  (import.meta.env.DEV ? "" : "http://localhost:5099");

export const csmsApiBaseUrl = BASE_URL;

export const createCsmsApi = (): AxiosInstance =>
  axios.create({
    baseURL: BASE_URL,
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
  });

interface ProblemLike {
  detail?: unknown;
  title?: unknown;
  message?: unknown;
  errors?: unknown;
}

const firstValidationError = (errors: unknown): string | undefined => {
  if (!errors || typeof errors !== "object") return undefined;

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const text = value.find((item) => typeof item === "string");
      if (typeof text === "string") return text;
    }

    if (typeof value === "string" && value.trim()) return value;
  }

  return undefined;
};

/**
 * Достать человекочитаемый текст ошибки.
 *
 * csms-api отвечает ProblemDetails (`detail`/`title`), а доменные исключения
 * приходят как 409 с русским текстом в `detail`. Для сетевых сбоев остаётся
 * сообщение axios, но пользователю всё равно нужен понятный fallback.
 */
export const readApiError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<ProblemLike>).response?.data;

    if (data) {
      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail;
      }

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (typeof data.title === "string" && data.title.trim()) {
        return data.title;
      }

      const validation = firstValidationError(data.errors);
      if (validation) return validation;
    }

    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
};
