import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  VacationScheduleListSchema,
  VacationScheduleSchema,
  type VacationSchedule,
} from "./vacationSchedule.schema";

const ENDPOINT = "/vacationSchedules";

export const vacationSchedulesQueryKey = ["vacationSchedules"];

/**
 * Годовые графики отпусков организации.
 *
 * Хранится один документ на организацию и год: утверждённый график — постоянный
 * документ, а изменения в него вносятся приказом (перенос отпуска), поэтому
 * правки идут в ту же запись, а новая запись создаётся только на следующий год.
 */
const fetchVacationSchedules = async (
  organizationId: string | number,
): Promise<VacationSchedule[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return VacationScheduleListSchema.parse(data);
};

// json-server при любой мутации вычищает записи с «битыми» внешними
// ссылками, а пустая строка в поле *Id — такая же битая ссылка (см.
// PROJECT_STATE, п. 1). Пустые идентификаторы вырезаем и на уровне
// документа, и во вложенных строках и частях отпуска.
const cleanIds = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) =>
        !/Id$/.test(key) ||
        (item !== "" && item !== null && item !== undefined),
    ),
  ) as T;

const prepareForSave = (schedule: VacationSchedule): VacationSchedule => {
  const cleaned = cleanIds(
    schedule as unknown as Record<string, unknown>,
  ) as unknown as VacationSchedule;

  return {
    ...cleaned,
    rows: (cleaned.rows ?? []).map((row) => ({
      ...cleanIds(row as unknown as Record<string, unknown>),
      parts: (row.parts ?? []).map((part) =>
        cleanIds(part as unknown as Record<string, unknown>),
      ),
    })),
  } as VacationSchedule;
};

export const useOrganizationVacationSchedules = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...vacationSchedulesQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchVacationSchedules(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

/**
 * График конкретного года. Запрос не дублирует обращение к серверу: список
 * лет организации уже лежит в кэше `useOrganizationVacationSchedules`,
 * отбор по году делается из него — так переключение года не дёргает базу.
 */
export const useVacationSchedule = (
  organizationId: string | number | undefined,
  year: number,
) => {
  const schedules = useOrganizationVacationSchedules(organizationId);

  return {
    ...schedules,
    data: (schedules.data ?? []).find(
      (schedule) => Number(schedule.year) === Number(year),
    ),
  };
};

export const useCreateVacationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: VacationSchedule) => {
      const { data } = await api.post(
        ENDPOINT,
        VacationScheduleSchema.parse(prepareForSave(schedule)),
      );

      return VacationScheduleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vacationSchedulesQueryKey });
    },
  });
};

export const useUpdateVacationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<VacationSchedule>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        prepareForSave(changes as VacationSchedule),
      );

      return VacationScheduleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vacationSchedulesQueryKey });
    },
  });
};

export const useDeleteVacationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vacationSchedulesQueryKey });
    },
  });
};
