import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  BaseEmployeeSchema,
  BaseHumanSchema,
  BaseStructuralUnitSchema,
  EmployeeRegisterSchema,
  type BaseEmployee,
  type BaseHuman,
  type BaseStructuralUnit,
  type EmployeeRegister,
  type EmployeeProfileChanges,
} from "./StaffingTable.schema";
import z from "zod";

const fetchHumans = async (): Promise<BaseHuman[]> => {
  const response = await api.get("/humans");
  return z.array(BaseHumanSchema).parse(response.data);
};

const createHuman = async (human: BaseHuman): Promise<BaseHuman> => {
  const response = await api.post("/humans", human);
  return BaseHumanSchema.parse(response.data);
};

const fetchEmployees = async (): Promise<EmployeeRegister[]> => {
  const response = await api.get("/employees");
  return z.array(EmployeeRegisterSchema).parse(response.data);
};

const fetchEmployeeById = async (
  currentId: string | number,
): Promise<BaseEmployee> => {
  const response = await api.get(
    `/employees/${currentId}?_expand=structuralUnit`,
  );
  return BaseEmployeeSchema.parse(response.data);
};

const createEmployee = async (
  employee: BaseEmployee,
): Promise<BaseEmployee> => {
  const response = await api.post("/employees", employee);
  return BaseEmployeeSchema.parse(response.data);
};

// Учётная запись и работник связаны полем userId: запрос идёт фильтром, потому
// что у одной учётки всегда один профиль в штатном расписании
const fetchEmployeeByUserId = async (
  userId: string | number,
): Promise<BaseEmployee | null> => {
  const response = await api.get("/employees", {
    params: { userId, _expand: "structuralUnit" },
  });
  const employees = z.array(BaseEmployeeSchema).parse(response.data);

  return employees[0] ?? null;
};

// Профиль редактирует только сам работник, поэтому меняем точечно поля
// личного кабинета, а не всю запись: PUT затёр бы бы поля, которых нет в форме
const updateEmployeeProfile = async ({
  id,
  changes,
}: {
  id: string | number;
  changes: EmployeeProfileChanges;
}): Promise<BaseEmployee> => {
  const response = await api.patch(`/employees/${id}`, changes);

  return BaseEmployeeSchema.parse(response.data);
};

export const useFetchHumans = () => {
  return useQuery({
    queryKey: ["human"],
    queryFn: fetchHumans,
  });
};

export const useCreateHuman = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHuman,
    onSuccess: (newHuman) => {
      queryClient.setQueryData<BaseHuman[]>(["human"], (oldData) => {
        return oldData ? [...oldData, newHuman] : [newHuman];
      });
    },
  });
};

export const useFetchEmployees = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });
};

export const useFetchEmployeeById = (id: string | number) => {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => fetchEmployeeById(id),
    enabled: !!id,
  });
};

// Профиль текущего пользователя ищется по учётной записи, а не по id
// сотрудника: id учётки и id в штатном расписании — разные сущности
export const employeeProfileQueryKey = ["employees", "profile"];

export const useFetchEmployeeByUserId = (
  userId: string | number | undefined,
) => {
  return useQuery({
    queryKey: [...employeeProfileQueryKey, String(userId)],
    queryFn: () => fetchEmployeeByUserId(userId as string | number),
    enabled: Boolean(userId),
  });
};

export const useUpdateEmployeeProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmployeeProfile,
    onSuccess: (employee) => {
      // Профиль обновляем сразу в кеше, чтобы кабинет показал новые значения
      // без повторного запроса
      if (employee.userId !== undefined) {
        queryClient.setQueryData(
          [...employeeProfileQueryKey, String(employee.userId)],
          employee,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

// Штатное расписание принадлежит конкретной организации-заказчику, поэтому
// подразделения и сотрудники запрашиваются с фильтром organizationId:
// иначе в контрактную службу можно было бы выбрать чужое подразделение.
export const structuralUnitsQueryKey = ["structuralUnits"];

const fetchStructuralUnits = async (
  organizationId: string | number,
): Promise<BaseStructuralUnit[]> => {
  const response = await api.get("/structuralUnits", {
    params: { organizationId },
  });

  return z.array(BaseStructuralUnitSchema).parse(response.data);
};

const fetchOrganizationEmployees = async (
  organizationId: string | number,
): Promise<BaseEmployee[]> => {
  const response = await api.get("/employees", { params: { organizationId } });

  return z.array(BaseEmployeeSchema).parse(response.data);
};

export const useFetchStructuralUnits = (
  organizationId: string | number | undefined,
) => {
  return useQuery({
    queryKey: [
      ...structuralUnitsQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchStructuralUnits(organizationId as string | number),
    enabled: Boolean(organizationId),
  });
};

export const useFetchOrganizationEmployees = (
  organizationId: string | number | undefined,
) => {
  return useQuery({
    queryKey: ["employees", "organization", String(organizationId)],
    queryFn: () =>
      fetchOrganizationEmployees(organizationId as string | number),
    enabled: Boolean(organizationId),
  });
};
