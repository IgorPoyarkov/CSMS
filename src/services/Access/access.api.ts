import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Клиент контура доступа csms-api (PostgreSQL + API). Это не json-server:
 * права вычисляет сервер по утверждённому составу контрактной службы, фронт
 * только читает готовый профиль. При отсутствии токена или недоступном API
 * вызывающие переходят на прежний json-server-режим.
 */
const BASE_URL =
  import.meta.env.VITE_ACCESS_API_URL ||
  import.meta.env.VITE_EIS_API_URL ||
  "http://localhost:5099";

export const ACCESS_TOKEN_KEY = "csms_access_token";

export const accessApi = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

accessApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const jsonDocumentSchema = z.record(z.string(), z.unknown());

export const AccessProfileSchema = z.object({
  user: jsonDocumentSchema.nullable(),
  organization: jsonDocumentSchema.nullable(),
  employee: jsonDocumentSchema.nullable(),
  contractService: jsonDocumentSchema.nullable(),
  myRole: z.string().nullable(),
  isHead: z.boolean(),
  isInContractService: z.boolean(),
  myFunctions: z.array(z.string()),
  canEditPurchaseNote: z.boolean(),
  canDisagreeKbk: z.boolean(),
  canEditCustomerRequisites: z.boolean(),
  purchaseNoteDeniedReason: z.string().nullable(),
  isContractServiceMember: z.boolean(),
  isPurchaseInitiator: z.boolean(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export type AccessProfile = z.infer<typeof AccessProfileSchema>;

const LoginResponseSchema = z.object({
  token: z.string().min(1),
  profile: AccessProfileSchema,
});

export const hasAccessSession = (): boolean =>
  Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));

/** Профиль по токену. Возвращает null при 401/недоступности — сигнал fallback. */
export const fetchAccessProfile = async (): Promise<AccessProfile | null> => {
  if (!hasAccessSession()) return null;

  try {
    const response = await accessApi.get("/api/access/me");
    return AccessProfileSchema.parse(response.data);
  } catch {
    return null;
  }
};

export const useAccessProfile = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  return useQuery({
    queryKey: ["accessProfile", token],
    queryFn: fetchAccessProfile,
    retry: false,
    enabled: Boolean(token),
    staleTime: 60_000,
  });
};

/** Вход в контур доступа. Пароль уходит на сервер и там хешируется. */
export const loginAccess = async (
  email: string,
  password: string,
): Promise<AccessProfile> => {
  const response = await accessApi.post("/api/access/login", { email, password });
  const result = LoginResponseSchema.parse(response.data);
  localStorage.setItem(ACCESS_TOKEN_KEY, result.token);
  return result.profile;
};

export const logoutAccess = async (): Promise<void> => {
  if (!hasAccessSession()) return;

  try {
    await accessApi.post("/api/access/logout");
  } finally {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};
