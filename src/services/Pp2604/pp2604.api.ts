import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { PP2604_OFFLINE_MAPPING } from "../BidEvaluation/bidEvaluation.schema";
import type { Pp2604Mapping } from "./pp2604.schema";

/**
 * Каталог 2604 импортируется в csms-api из официального PDF и отдаётся
 * готовой версией. Фронт не скачивает акт и не выводит связи сам: при
 * недоступности API проверки работают на офлайн-снимке из схемы.
 */
const BASE_URL = import.meta.env.VITE_EIS_API_URL || "http://localhost:5099";

export const pp2604Api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

export const pp2604MappingQueryKey = ["pp2604Mapping"];

export const fetchPp2604Mapping = async (
  signal?: AbortSignal,
): Promise<Pp2604Mapping> => {
  const { data } = await pp2604Api.get<Pp2604Mapping>("/api/pp2604/mapping", {
    signal,
  });

  if (!Array.isArray(data?.categories) || !Array.isArray(data?.rules)) {
    throw new Error("Некорректный ответ API каталога ПП РФ N 2604");
  }

  return data;
};

export const usePp2604Mapping = () =>
  useQuery({
    queryKey: pp2604MappingQueryKey,
    queryFn: ({ signal }) => fetchPp2604Mapping(signal),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

/**
 * Формы должны работать даже без csms-api: тогда используется тот же снимок,
 * что и в офлайн-проверках. `source` нужен, чтобы в интерфейсе было видно,
 * какие пределы сейчас действуют.
 */
export const usePp2604MappingOrDefault = () => {
  const query = usePp2604Mapping();
  const mapping = query.data ?? PP2604_OFFLINE_MAPPING;

  return {
    ...query,
    mapping,
    source: query.data ? ("api" as const) : ("offline" as const),
  };
};
