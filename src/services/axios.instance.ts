import axios from "axios";
import { JSON_SERVER_BASE_URL } from "./apiBaseUrl";

export const api = axios.create({
  baseURL: JSON_SERVER_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
