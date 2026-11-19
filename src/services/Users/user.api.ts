import {
  BaseUserSchema,
  type BaseUser,
  type Login,
  type Register,
} from "./user.schema";
import { api } from "../axios.instance";
import {
  ACCESS_TOKEN_KEY,
  fetchAccessProfile,
  loginAccess,
  logoutAccess,
} from "../Access/access.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const fetchCurrentUser = async (
  email: string,
): Promise<BaseUser | null> => {
  // Если есть сессия csms-api, пользователь приходит в составе профиля прав:
  // сервер уже собрал его вместе с организацией, сотрудником и КС.
  if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
    const profile = await fetchAccessProfile();
    if (profile?.user) {
      const parsed = BaseUserSchema.safeParse(profile.user);
      if (parsed.success) return parsed.data;
    }
  }

  try {
    const response = await api.get<BaseUser[]>(`/users?email=${email}`);

    if (response.data && response.data.length > 0) {
      return BaseUserSchema.parse(response.data[0]);
    }
    return null;
  } catch {
    return null;
  }
};

export const loginUser = async (credentials: Login): Promise<BaseUser> => {
  // Сначала пробуем полноценный бэкенд. Если он не поднят (старый режим
  // json-server), остаётся прежний путь — так переход не ломает разработку.
  try {
    const profile = await loginAccess(
      credentials.email ?? "",
      credentials.password ?? "",
    );
    if (profile.user) {
      const parsed = BaseUserSchema.safeParse(profile.user);
      if (parsed.success) return parsed.data;
    }
  } catch {
    // Ниже fallback на json-server.
  }

  try {
    const response = await api.get<BaseUser[]>(
      `/users?email=${credentials.email}&password=${credentials.password}`,
    );

    if (!response.data || response.data.length === 0) {
      throw new Error("401");
    }

    return BaseUserSchema.parse(response.data[0]);
  } catch (error) {
    if (error instanceof Error && error.message === "401") {
      throw "Неверный логин или пароль";
    }
    throw "Ошибка соединения с сервером";
  }
};

export const registerUserApi = async (credentials: Register): Promise<void> => {
  try {
    const checkResponse = await api.get<BaseUser[]>(
      `/users?email=${credentials.email}`,
    );

    if (checkResponse.data && checkResponse.data.length > 0) {
      throw new Error("EMAIL_EXISTS");
    }

    await api.post<BaseUser>("/users", credentials);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      throw "Аккаунт с данным Email уже существует";
    }

    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw "Некорректные данные для регистрации";
    }
    throw "Не удалось создать аккаунт";
  }
};

export const logoutUserApi = async (): Promise<void> => {
  await logoutAccess();
};

export const useFetchCurrentUser = () => {
  const savedEmail = localStorage.getItem("user_email") || "";
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) || "";

  return useQuery({
    queryKey: ["user", savedEmail, token],
    queryFn: () => fetchCurrentUser(savedEmail),
    retry: false,
    enabled: Boolean(savedEmail || token),
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (validatedUser) => {
      localStorage.setItem("user_email", validatedUser.email || "");
      queryClient.setQueryData(
        ["user", validatedUser.email, localStorage.getItem(ACCESS_TOKEN_KEY) || ""],
        validatedUser,
      );
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: registerUserApi,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY) || "";
      await logoutUserApi();
      return savedToken;
    },
    onSuccess: (savedToken) => {
      const savedEmail = localStorage.getItem("user_email") || "";
      localStorage.removeItem("user_email");
      queryClient.setQueryData(["user", savedEmail, savedToken], null);
      queryClient.invalidateQueries();
    },
  });
};
