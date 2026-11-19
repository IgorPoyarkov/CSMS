import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  eisPackageSchema,
  isStatusPending,
  signatureTaskSchema,
  type EisDocumentType,
  type EisPackage,
} from "./eisPackages.schema";

/**
 * Клиент шлюза обмена с ЕИС (отдельный сервис, репозиторий csms-api).
 *
 * Это не json-server: другой адрес, другая природа и настоящие правила.
 * Поэтому отдельный экземпляр axios, а не общий `api`: у шлюза свои таймауты
 * и своя обработка ошибок (409 с текстом на русском вместо 400/500).
 */

const BASE_URL = import.meta.env.VITE_EIS_API_URL || "http://localhost:5099";

export const EIS_GATEWAY_URL = BASE_URL;

const eisApi = axios.create({
  baseURL: BASE_URL,
  // Отправка пакета в ЕИС идёт через сеть и может занять время: 5 секунд
  // json-server здесь мало
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export const eisPackagesQueryKey = ["eisPackages"];

/**
 * Ошибка шлюза как текст для человека.
 *
 * На нарушение правил шлюз отвечает 409 и полем `detail` на русском — его и
 * показываем. Остальное объясняем сами: «сервис не запущен» иначе выглядит
 * как «Network Error», и человек идёт искать причину в браузере.
 */
export const describeEisError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)
      ?.detail;

    if (detail) return detail;

    if (error.code === "ECONNABORTED") {
      return "Шлюз не ответил за 15 секунд. Проверьте, что он запущен и не завис.";
    }

    if (!error.response) {
      return `Шлюз ЕИС недоступен (${BASE_URL}). Запустите его: dotnet run --project csms-api/src/Csms.Api`;
    }

    return `Шлюз вернул ошибку ${error.response.status}.`;
  }

  if (error instanceof Error) return error.message;

  return String(error);
};

export const useEisPackages = () =>
  useQuery({
    queryKey: eisPackagesQueryKey,
    queryFn: async () => {
      const { data } = await eisApi.get("/api/eis/packages");

      return eisPackageSchema.array().parse(data);
    },
    // Пока пакет в проверке, ФЛК сама не «дозреет»: опрашиваем раз в 5 секунд,
    // чтобы человек не жал кнопку вручную. Когда ждать нечего — не опрашиваем
    refetchInterval: (query) =>
      query.state.data?.some((item) => isStatusPending(item.status)) ? 5000 : false,
  });

export interface CreateEisPackageInput {
  documentType: EisDocumentType;
  contractEisNumber: string;
  ikz: string;
}

export const useCreateEisPackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEisPackageInput) => {
      const { data } = await eisApi.post("/api/eis/packages", input);

      return eisPackageSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eisPackagesQueryKey });
    },
  });
};

/** Получить содержимое и хеш — первый шаг подписания. */
export const useStartEisSigning = () =>
  useMutation({
    mutationFn: async (id: string) => {
      const { data } = await eisApi.post(`/api/eis/packages/${id}/signing`);

      return signatureTaskSchema.parse(data);
    },
  });

export interface AttachSignatureInput {
  id: string;
  signatureBase64: string;
  signerThumbprint: string;
  signedContentSha256: string;
}

export const useAttachEisSignature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: AttachSignatureInput) => {
      const { data } = await eisApi.put(
        `/api/eis/packages/${id}/signature`,
        body,
      );

      return eisPackageSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eisPackagesQueryKey });
    },
  });
};

/**
 * Действия по пакету: отправить, спросить результат, вернуть в работу.
 *
 * Все три — один POST без тела, поэтому одна фабрика. Разные эндпоинты, а не
 * «поставить статус»: статус ставит шлюз по результату действия, и подделать
 * его из интерфейса нельзя.
 */
const usePackageAction = (buildPath: (id: string) => string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await eisApi.post(buildPath(id));

      return eisPackageSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eisPackagesQueryKey });
    },
  });
};

export const useSendEisPackage = () =>
  usePackageAction((id) => `/api/eis/packages/${id}/send`);

export const useRefreshEisPackage = () =>
  usePackageAction((id) => `/api/eis/packages/${id}/refresh`);

export const useReviseEisPackage = () =>
  usePackageAction((id) => `/api/eis/packages/${id}/revise`);

/**
 * SHA-256 в hex, как считает шлюз.
 *
 * Считается по тем самым байтам, которые уйдут в плагин на подпись, и
 * отправляется вместе с подписью. Если содержимое на сервере успело
 * измениться, хеши не сойдутся и шлюз откажет — вместо тихого «подписали
 * одно, отправили другое».
 */
export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/** Метаданные каталога XSD-схем на шлюзе CSMS-API (/api/eis/schemas). */
export interface EisSchemaStatusResponse {
  activeVersion?: string;
  availableVersions?: string[];
  lastCheckedAt?: string;
  documentsCount?: number;
}

export interface EisSchemaCatalogItem {
  code?: string;
  title?: string;
  xsdFile?: string;
  rootElement?: string;
  version?: string;
}

export const useEisSchemaStatus = (enabled = false) =>
  useQuery({
    queryKey: ["eisSchemaStatus"],
    enabled,
    queryFn: async () => {
      const { data } = await eisApi.get<EisSchemaStatusResponse>(
        "/api/eis/schemas/status",
      );
      return data;
    },
    retry: false,
  });

export const useEisSchemaCatalog = (enabled = false) =>
  useQuery({
    queryKey: ["eisSchemaCatalog"],
    enabled,
    queryFn: async () => {
      const { data } = await eisApi.get<EisSchemaCatalogItem[]>(
        "/api/eis/schemas/catalog",
      );
      return data;
    },
    retry: false,
  });

/** Для тестов и отладки: доступ к клиенту без хуков. */
export { eisApi };

export type { EisPackage };
