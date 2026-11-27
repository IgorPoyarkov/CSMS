import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  GostCatalogSchema,
  type GostCatalog,
} from "./gostRef.schema";
import {
  GostRequirementsCatalogSchema,
  type GostRequirementsCatalog,
} from "./gostRequirements.schema";

/**
 * Снимок новых ГОСТов лежит рядом со статикой (`public/gost/catalog.json`),
 * поэтому подсказки работают и без запущенного csms-api. Обновляет снимок
 * `scripts/gost-monitor.mjs` по расписанию — термин `snapshot-first`.
 */
export const gostCatalogQueryKey = ["gostCatalog"];

export const useGostCatalog = () =>
  useQuery<GostCatalog>({
    queryKey: gostCatalogQueryKey,
    // Снимок меняется только при новом прогоне монитора, не при каждом рендере.
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data } = await axios.get<unknown>("/gost/catalog.json", {
        timeout: 10_000,
      });
      return GostCatalogSchema.parse(data);
    },
  });

/**
 * Требования из полного текста ГОСТов. Снимок собирается из страниц,
 * сохранённых через браузер, и лежит рядом с каталогом карточек.
 */
export const gostRequirementsQueryKey = ["gostRequirements"];

export const useGostRequirements = () =>
  useQuery<GostRequirementsCatalog>({
    queryKey: gostRequirementsQueryKey,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data } = await axios.get<unknown>("/gost/requirements.json", {
        timeout: 10_000,
      });
      return GostRequirementsCatalogSchema.parse(data);
    },
  });
