import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractServiceListSchema,
  ContractServiceSchema,
  isContractServiceOfOrganization,
  type ContractService,
} from "./contractService.schema";

const ENDPOINT = "/contractServices";

export const contractServicesQueryKey = ["contractServices"];

// Сведения о контрактной службе всегда принадлежат одной организации-заказчику:
// запрос идёт с фильтром organizationId, а выборка проверяется ещё и на клиенте,
// чтобы чужие сведения не попали в интерфейс.
const fetchContractServiceOfOrganization = async (
  organizationId: string | number,
): Promise<ContractService | null> => {
  const response = await api.get(ENDPOINT, { params: { organizationId } });

  const services = ContractServiceListSchema.parse(response.data).filter(
    (service) => isContractServiceOfOrganization(service, organizationId),
  );

  // У заказчика может быть только один способ создания контрактной службы
  return services[0] ?? null;
};

const fetchContractServiceById = async (
  id: string | number,
  organizationId: string | number | undefined,
): Promise<ContractService> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  const service = ContractServiceSchema.parse(response.data);

  // Прямая ссылка на сведения другого заказчика считается недоступной
  if (
    organizationId !== undefined &&
    !isContractServiceOfOrganization(service, organizationId)
  ) {
    throw new Error("Сведения относятся к другому заказчику");
  }

  return service;
};

// json-server при любой мутации удаляет документы с «битыми» ссылками: если
// поле вида *Id ссылается на несуществующую запись связанной коллекции, запись
// считается удаляемой (getRemovable в json-server). Пустая строка — как раз
// такая ссылка, поэтому пустые id из сохранения вырезаем: поля просто нет в
// записи.
const isBlank = (value: unknown): boolean =>
  value === "" || value === null || value === undefined;

const blankReferenceKeys = (item: object, keys: string[]): string[] =>
  keys.filter((key) => isBlank((item as Record<string, unknown>)[key]));

const omitKeys = <T extends object>(item: T, keys: string[]): T =>
  keys.length === 0
    ? item
    : (Object.fromEntries(
        Object.entries(item).filter(([key]) => !keys.includes(key)),
      ) as T);

const UNIT_REFERENCE_KEYS = ["structuralUnitId"];

const SERVICE_REFERENCE_KEYS = [
  "structuralUnitId",
  "declaredByEmployeeId",
  "declaredByStructuralUnitId",
  "appointedByEmployeeId",
];

export const omitEmptyReferences = (
  service: ContractService,
): ContractService => {
  const withoutEmpty = <T extends object>(item: T, keys: string[]): T =>
    omitKeys(item, blankReferenceKeys(item, keys));

  const head = service.head
    ? withoutEmpty(service.head, UNIT_REFERENCE_KEYS)
    : undefined;
  const contractManager = service.contractManager
    ? withoutEmpty(service.contractManager, UNIT_REFERENCE_KEYS)
    : undefined;

  return {
    ...withoutEmpty(service, SERVICE_REFERENCE_KEYS),
    members: service.members.map((member) =>
      withoutEmpty(member, UNIT_REFERENCE_KEYS),
    ),
    // Руководитель или управляющий без выбранного работника — тоже битая ссылка
    // на employees
    ...(head?.employeeId ? { head } : {}),
    ...(contractManager?.employeeId ? { contractManager } : {}),
  };
};

// Способ создания указывается один раз, поэтому сохранение работает как
// «создать или заменить»: запись организации всегда одна.
const saveContractService = async (
  service: ContractService,
): Promise<ContractService> => {
  if (!service.organizationId) {
    throw new Error(
      "Не указана организация — владелец сведений о контрактной службе",
    );
  }

  const current = await fetchContractServiceOfOrganization(
    service.organizationId,
  );
  const id = service.id ?? current?.id;
  const payload = omitEmptyReferences(service);

  if (id === undefined || id === null) {
    const response = await api.post(ENDPOINT, payload);

    return ContractServiceSchema.parse(response.data);
  }

  const response = await api.put(`${ENDPOINT}/${id}`, { ...payload, id });

  return ContractServiceSchema.parse(response.data);
};

const deleteContractService = async ({
  id,
  organizationId,
}: {
  id: string | number;
  organizationId: string | number | undefined;
}): Promise<string | number> => {
  // Сбросить сведения можно только своей организации
  await fetchContractServiceById(id, organizationId);
  await api.delete(`${ENDPOINT}/${id}`);

  return id;
};

export const useContractService = (
  organizationId: string | number | undefined,
) => {
  return useQuery({
    queryKey: [
      ...contractServicesQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () =>
      fetchContractServiceOfOrganization(organizationId as string | number),
    // Пока заказчик не определён, сведения не запрашиваются
    enabled: Boolean(organizationId),
  });
};

export const useSaveContractService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveContractService,
    onSuccess: (service) => {
      queryClient.setQueryData(
        [
          ...contractServicesQueryKey,
          "organization",
          String(service.organizationId),
        ],
        service,
      );
      queryClient.invalidateQueries({ queryKey: contractServicesQueryKey });
    },
  });
};

export const useDeleteContractService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteContractService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractServicesQueryKey });
    },
  });
};
