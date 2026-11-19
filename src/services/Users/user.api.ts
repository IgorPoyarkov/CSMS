import {
  BaseUserSchema,
  type BaseUser,
  type Login,
  type Register,
} from "./user.schema";
import { api } from "../axios.instance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const fetchCurrentUser = async (
  email: string,
): Promise<BaseUser | null> => {
  try {
    const response = await api.get<BaseUser[]>(`/users?email=${email}`);

    if (response.data && response.data.length > 0) {
      return BaseUserSchema.parse(response.data[0]);
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const loginUser = async (credentials: Login): Promise<BaseUser> => {
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
  return Promise.resolve();
};

export const useFetchCurrentUser = () => {
  const savedEmail = localStorage.getItem("user_email") || "";

  return useQuery({
    queryKey: ["user", savedEmail],
    queryFn: () => fetchCurrentUser(savedEmail),
    retry: false,
    enabled: Boolean(savedEmail),
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (validatedUser) => {
      localStorage.setItem("user_email", validatedUser.email || "");
      queryClient.setQueryData(["user", validatedUser.email], validatedUser);
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
    mutationFn: logoutUserApi,
    onSuccess: () => {
      const savedEmail = localStorage.getItem("user_email") || "";
      localStorage.removeItem("user_email");
      queryClient.setQueryData(["user", savedEmail], null);
      queryClient.invalidateQueries();
    },
  });
};
