import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractRegistryItemListSchema,
  type ContractRegistryItem,
} from "../ContractRegistry/contractRegistry.schema";
import {
  ContractSmpRecordSchema,
  type ContractSmpRecord,
  type ContractSmpRecordInput,
} from "../ContractSmp/contractSmp.schema";
import { contractSmpQueryKey } from "../ContractSmp/contractSmp.api";
import { useOrganizations } from "../Organization/organization.api";
import {
  CONTRACTOR_SESSION_KEY,
  ContractorSessionSchema,
  normalizeContractorInn,
  type ContractorSession,
} from "./contractor.schema";

/**
 * Данные личного кабинета подрядчика (Tasks 9, п. 6).
 *
 * Подрядчик — внешний пользователь без учётной записи заказчика, поэтому
 * канал один: реестр контрактов, отфильтрованный по ИНН поставщика, и сведения
 * о привлечении СМП по найденным контрактам. Отдельного бэкенда для подрядчика
 * нет — запросы идут туда же, куда и у контрактной службы, но фильтр по ИНН
 * задаётся на сервере (`supplierInn`), а не вырезается из «всего реестра» на
 * клиенте: чужие контракты в выборку не попадают даже при ошибке в интерфейсе.
 *
 * Запись СМП создаётся от имени подрядчика в контракте заказчика:
 * `organizationId` берётся из карточки контракта, а не из сессии, — иначе
 * заказчик сведений не увидит.
 */

const CONTRACTS_ENDPOINT = "/contractRegistry";
const SMP_ENDPOINT = "/contractSmpRecords";

export const contractorQueryKey = ["contractor"];

// ─── Сессия ─────────────────────────────────────────────────────────────────

export const readContractorSession = (): ContractorSession | null => {
  const raw = localStorage.getItem(CONTRACTOR_SESSION_KEY);
  if (!raw) return null;

  try {
    return ContractorSessionSchema.parse(JSON.parse(raw));
  } catch {
    // Битая запись не должна ронять кабинет: её проще затереть
    localStorage.removeItem(CONTRACTOR_SESSION_KEY);
    return null;
  }
};

export const saveContractorSession = (session: ContractorSession): void => {
  localStorage.setItem(
    CONTRACTOR_SESSION_KEY,
    JSON.stringify(ContractorSessionSchema.parse(session)),
  );
};

export const clearContractorSession = (): void => {
  localStorage.removeItem(CONTRACTOR_SESSION_KEY);
};

// ─── Контракты подрядчика ───────────────────────────────────────────────────

const fetchContractsByInn = async (
  inn: string,
): Promise<ContractRegistryItem[]> => {
  const { data } = await api.get(CONTRACTS_ENDPOINT, {
    params: { supplierInn: inn },
  });

  return ContractRegistryItemListSchema.parse(data ?? []);
};

/** Контракты, где подрядчик записан поставщиком по ИНН. */
export const useContractorContracts = (inn: string | undefined) =>
  useQuery({
    queryKey: [...contractorQueryKey, "contracts", inn ?? ""],
    queryFn: () => fetchContractsByInn(normalizeContractorInn(inn ?? "")),
    enabled: Boolean(inn),
  });

/**
 * Сведения о привлечении СМП по всем контрактам подрядчика. Контракты уже
 * лежат в кэше предыдущего запроса, поэтому фильтрация по их идентификаторам
 * выполняется на клиенте и не требует второго обращения к реестру.
 */
export const useContractorSmpRecords = (
  contracts: ContractRegistryItem[] | undefined,
) => {
  const ids = (contracts ?? [])
    .map((contract) => String(contract.id ?? ""))
    .filter(Boolean);

  return useQuery({
    queryKey: [...contractorQueryKey, "smp", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<ContractSmpRecord[]> => {
      const { data } = await api.get(SMP_ENDPOINT);
      const all = ContractSmpRecordSchema.array().parse(data ?? []);
      const wanted = new Set(ids);

      return all.filter((record) => wanted.has(String(record.contractId)));
    },
  });
};

/**
 * Подрядчики, у которых уже есть контракты в реестре, — подсказка на экране
 * входа. Выборка строится по сжатым данным реестра, поэтому не зависит от того,
 * заведена ли у подрядчика организация в справочнике.
 */
export interface ContractorDirectoryEntry {
  inn: string;
  name: string;
  contracts: number;
  customers: number;
}

export const useContractorDirectory = (enabled = true) =>
  useQuery({
    queryKey: [...contractorQueryKey, "directory"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ContractorDirectoryEntry[]> => {
      const { data } = await api.get(CONTRACTS_ENDPOINT);
      const all = ContractRegistryItemListSchema.parse(data ?? []);
      const map = new Map<
        string,
        ContractorDirectoryEntry & { orgs: Set<string> }
      >();

      for (const contract of all) {
        const inn = normalizeContractorInn(String(contract.supplierInn ?? ""));
        if (!inn) continue;

        const entry = map.get(inn) ?? {
          inn,
          name: contract.supplierName ?? "",
          contracts: 0,
          customers: 0,
          orgs: new Set<string>(),
        };

        entry.contracts += 1;
        entry.orgs.add(
          String(contract.organizationId ?? contract.customerName ?? ""),
        );
        if (!entry.name && contract.supplierName) {
          entry.name = contract.supplierName;
        }
        map.set(inn, entry);
      }

      return [...map.values()]
        .map(({ orgs, ...entry }) => ({ ...entry, customers: orgs.size }))
        .sort((left, right) => right.contracts - left.contracts);
    },
  });

/** Реквизиты заказчиков для подписи групп контрактов (ИНН из справочника). */
export const useContractorOrganizations = () => useOrganizations();

// ─── Вход ───────────────────────────────────────────────────────────────────

export interface ContractorLoginResult {
  session: ContractorSession;
  contracts: number;
}

/**
 * Вход по ИНН: проверяем, что под этим ИНН в реестре есть контракты, и только
 * тогда заводим сессию. Пароля нет — это внешний контур на данных, которые и
 * так опубликованы в ЕИС; на стенде он заменяет ссылку-приглашение из
 * Tasks 9 п. 6, а на проде закрывается токеном приглашения.
 */
export const useContractorLogin = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ContractorLoginResult,
    Error,
    { inn: string; representative?: string; position?: string }
  >({
    mutationFn: async ({ inn, representative = "", position = "" }) => {
      const normalized = normalizeContractorInn(inn);
      const contracts = await fetchContractsByInn(normalized);

      if (contracts.length === 0) {
        throw new Error(
          "Контрактов с таким ИНН в реестре нет. Проверьте ИНН — по нему должны быть записаны контракты, где вы поставщик.",
        );
      }

      const name =
        contracts.find((contract) => contract.supplierName)?.supplierName ||
        `Подрядчик ИНН ${normalized}`;

      const session: ContractorSession = {
        inn: normalized,
        name,
        representative,
        position,
      };

      saveContractorSession(session);

      queryClient.setQueryData(
        [...contractorQueryKey, "contracts", normalized],
        contracts,
      );

      return { session, contracts: contracts.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractorQueryKey });
    },
  });
};

export const useContractorLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      clearContractorSession();
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractorQueryKey });
    },
  });
};

// ─── Направление сведений о привлечении СМП ─────────────────────────────────

/**
 * Поля, которые заполняет подрядчик. Половин заказчика (`customerConfirmed*`,
 * `status` приёмки, `eisRecordNumber`) здесь нет намеренно: их проставляет
 * контрактная служба, и доступ к ним из кабинета подрядчика был бы подменой
 * подписи заказчика.
 */
export type ContractorSmpDraft = Partial<ContractSmpRecord> & {
  documentType: ContractSmpRecord["documentType"];
  documentNumber: string;
  documentDate: string;
  supplierName: string;
};

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const localDateTime = (): string => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Направить сведения заказчику: запись создаётся в контракте заказчика со
 * статусом `submitted`, датой получения `receivedAt` = сейчас и подтверждением
 * достоверности подрядчика (п. 6 типовых условий ПП РФ N 1466).
 *
 * `receivedAt` фиксируется именно в момент отправки, потому что от неё считается
 * срок заказчика на размещение в ЕИС — 3 рабочих дня по ч. 3 ст. 103 44-ФЗ.
 * Без неё контрактная служба выглядела бы виноватой в чужом просроченном сроке.
 */
export const useSubmitContractorSmpRecord = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ContractSmpRecord,
    Error,
    {
      contract: ContractRegistryItem;
      draft: ContractorSmpDraft;
      signer: string;
    }
  >({
    mutationFn: async ({ contract, draft, signer }) => {
      const submittedAt = localDateTime();

      const payload: ContractSmpRecordInput = {
        documentType: draft.documentType,
        documentNumber: draft.documentNumber,
        documentDate: draft.documentDate,
        supplierName: draft.supplierName,
        amount: draft.amount ?? "",
        okpd2Code: draft.okpd2Code ?? "",
        priceType: draft.priceType ?? "contract",
        unitPrice: draft.unitPrice ?? "",
        subject: draft.subject ?? "",
        period: draft.period ?? "",
        supplierInn: draft.supplierInn ?? "",
        supplierKpp: draft.supplierKpp ?? "",
        isSmpSubject: draft.isSmpSubject ?? true,
        subContractRecordId: draft.subContractRecordId,
        isReplacementSubContract: draft.isReplacementSubContract ?? false,
        paidEarlierThanContractSchedule:
          draft.paidEarlierThanContractSchedule ?? false,
        paidToSupplierDate: draft.paidToSupplierDate ?? "",
        acceptanceSignedDate: draft.acceptanceSignedDate ?? "",
        sourceFileName: draft.sourceFileName ?? "",
        comment: draft.comment ?? "",
        // Принадлежность — контракту заказчика
        organizationId: contract.organizationId,
        contractId: contract.id as string | number,
        // Момент подачи и подпись подрядчика
        receivedAt: submittedAt,
        supplierConfirmedAt: submittedAt,
        supplierConfirmedBy: signer,
        supplierConfirmedDocument:
          draft.supplierConfirmedDocument ??
          "Направлено из кабинета подрядчика",
        status: "submitted",
        createdAt: new Date().toISOString(),
      };

      const { data } = await api.post(
        SMP_ENDPOINT,
        omitEmptyReferences(ContractSmpRecordSchema.parse(payload)),
      );

      return ContractSmpRecordSchema.parse(data);
    },
    onSuccess: () => {
      // Реестр сведений общий с карточкой контракта у заказчика: обновляем
      // и кабинет подрядчика, и секцию реестра
      queryClient.invalidateQueries({ queryKey: contractorQueryKey });
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
    },
  });
};

/**
 * Правка ранее направленных сведений, пока заказчик их не принял. Сроки и
 * объём пересчитываются сами — они функции от этих же полей.
 */
export const useReviseContractorSmpRecord = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ContractSmpRecord,
    Error,
    {
      id: string | number;
      changes: Partial<ContractSmpRecord>;
      /** Подписант правки: подтверждение достоверности обновляется. */
      signer?: string;
    }
  >({
    mutationFn: async ({ id, changes, signer }) => {
      // Исправленные сведения — это новое подтверждение достоверности:
      // дата и подписант обновляются вместе с содержимым (п. 6 ПП РФ N 1466)
      const payload: Partial<ContractSmpRecord> = {
        ...changes,
        supplierConfirmedAt: localDateTime(),
        ...(signer ? { supplierConfirmedBy: signer } : {}),
      };

      const { data } = await api.patch(
        `${SMP_ENDPOINT}/${id}`,
        omitEmptyReferences(payload),
      );

      return ContractSmpRecordSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractorQueryKey });
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
    },
  });
};

/**
 * Отозвать сведения. Разрешено только непрочитанной заказчиком записи:
 * принятые сведения стали частью карточки контракта, и удалять их должен
 * заказчик, а не тот, кто их прислал.
 */
export const useWithdrawContractorSmpRecord = () => {
  const queryClient = useQueryClient();

  return useMutation<string | number, Error, ContractSmpRecord>({
    mutationFn: async (record) => {
      if (record.status !== "submitted" || record.customerConfirmedAt) {
        throw new Error(
          "Заказчик уже принял сведения — отозвать их нельзя, согласуйте правку с контрактной службой.",
        );
      }

      await api.delete(`${SMP_ENDPOINT}/${record.id}`);

      return record.id as string | number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractorQueryKey });
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
    },
  });
};
