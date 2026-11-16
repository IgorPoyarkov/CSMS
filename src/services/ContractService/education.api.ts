import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  EmployeeEducationSchema,
  type EmployeeEducation,
} from "./education.schema";

const ENDPOINT = "/employeeEducations";

export const employeeEducationsQueryKey = ["employeeEducations"];

// Получить все образования организации (через связи employee → organization)
const fetchOrganizationEducations = async (
  organizationId: string | number,
): Promise<EmployeeEducation[]> => {
  // Получаем всех сотрудников организации
  const empResponse = await api.get("/employees", {
    params: { organizationId },
  });
  const employeeIds: string[] = (empResponse.data ?? []).map(
    (emp: { id: string | number }) => String(emp.id),
  );

  if (employeeIds.length === 0) return [];

  // Получаем все образования и фильтруем по нашим сотрудникам
  const eduResponse = await api.get(ENDPOINT);
  const allEducations = (eduResponse.data ?? []) as unknown[];

  return allEducations
    .filter((edu) =>
      employeeIds.includes(String((edu as Record<string, unknown>).employeeId)),
    )
    .map((edu) => EmployeeEducationSchema.parse(edu));
};

// Получить все образования одного работника
const fetchEmployeeEducations = async (
  employeeId: string | number,
): Promise<EmployeeEducation[]> => {
  const response = await api.get(ENDPOINT, { params: { employeeId } });
  const list = (response.data ?? []) as unknown[];

  return list.map((edu) => EmployeeEducationSchema.parse(edu));
};

// Сохранить (создать или обновить) образование
const saveEducation = async (
  education: EmployeeEducation,
): Promise<EmployeeEducation> => {
  if (education.id) {
    const response = await api.put(
      `${ENDPOINT}/${education.id}`,
      education,
    );

    return EmployeeEducationSchema.parse(response.data);
  }

  const response = await api.post(ENDPOINT, education);

  return EmployeeEducationSchema.parse(response.data);
};

// Удалить образование
const deleteEducation = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);

  return id;
};

// Хуки
export const useOrganizationEducations = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...employeeEducationsQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () =>
      fetchOrganizationEducations(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useEmployeeEducations = (employeeId: string | number | undefined) =>
  useQuery({
    queryKey: [...employeeEducationsQueryKey, "employee", String(employeeId)],
    queryFn: () => fetchEmployeeEducations(employeeId as string | number),
    enabled: Boolean(employeeId),
  });

export const useSaveEducation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveEducation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeEducationsQueryKey,
      });
    },
  });
};

export const useDeleteEducation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEducation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeEducationsQueryKey,
      });
    },
  });
};
