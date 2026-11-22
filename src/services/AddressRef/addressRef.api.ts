import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  AddressMunicipalitySchema,
  AddressRegionSchema,
  type AddressMunicipality,
  type AddressRegion,
} from "./addressRef.schema";

// Справочник адресов читается часто и меняется редко: субъекты РФ правятся
// раз в несколько лет, подсказки по муниципальным образованиям пополняются
// вручную, поэтому данные держим в кеше час
const REGIONS_QUERY_KEY = ["addressRegions"];
const MUNICIPALITIES_QUERY_KEY = ["addressMunicipalities"];

export const useAddressRegions = () => {
  return useQuery({
    queryKey: REGIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get("/addressRegions");

      return AddressRegionSchema.array().parse(response.data) as AddressRegion[];
    },
    staleTime: 60 * 60 * 1000,
    // Справочник статичный: повторять запрос при недоступности бессмысленно
    retry: 0,
  });
};

// Подсказки по муниципальным образованиям выбранного субъекта: справочник
// заполняется по мере подключения регионов из ФИАС, поэтому список может быть
// неполным — значение допустимо ввести вручную
export const useAddressMunicipalities = (
  regionId: string | number | undefined,
) => {
  return useQuery({
    queryKey: [...MUNICIPALITIES_QUERY_KEY, String(regionId)],
    queryFn: async () => {
      const response = await api.get("/addressMunicipalities", {
        params: { regionId },
      });

      return AddressMunicipalitySchema.array().parse(
        response.data,
      ) as AddressMunicipality[];
    },
    enabled: Boolean(regionId),
    staleTime: 60 * 60 * 1000,
    // Подсказки необязательны: значение можно ввести вручную
    retry: 0,
  });
};

// Субъект РФ находится и по названию: в извещениях место поставки хранится
// строкой, а не ссылкой на справочник
export const findRegionByName = (
  regions: AddressRegion[],
  name: string | undefined,
): AddressRegion | undefined => {
  const wanted = (name ?? "").trim().toLowerCase();

  if (!wanted) {
    return undefined;
  }

  return regions.find((region) => region.name.toLowerCase() === wanted);
};
