import { useFetchCurrentUser } from "../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../services/StaffingTable/StaffingTable.api";
import { useCurrentOrganization } from "../services/Organization/organization.api";
import { useContractService } from "../services/ContractService/contractService.api";
import {
  ContractServiceSchema,
  type ContractServiceFunction,
} from "../services/ContractService/contractService.schema";
import { BaseUserSchema } from "../services/Users/user.schema";
import { BaseOrganizationSchema } from "../services/Organization/organization.schema";
import { BaseEmployeeSchema } from "../services/StaffingTable/StaffingTable.schema";
import {
  hasAccessSession,
  useAccessProfile,
} from "../services/Access/access.api";
import {
  contractServiceRoster,
  isContractServiceLeader,
  type ContractServiceRosterRow,
} from "../services/ContractService/contractService.config";

// Функции раздела III приказа Минфина РФ № 158н, дающие право формировать
// и изменять потребность (служебную записку по позиции плана-графика).
const PURCHASE_NOTE_ALLOWED_FUNCTIONS: ReadonlyArray<ContractServiceFunction> =
  ["planning", "purchase_description", "supplier_determination"];

// Роль вошедшего пользователя в контрактной службе организации. Нужна сразу
// нескольким разделам: личный кабинет показывает роль и права руководителя,
// список задач и форма потребности (СЗ) решают, доступно ли редактирование.
//
// При наличии сессии csms-api права приходят готовым профилем: сервер сам
// собирает пользователя, организацию, сотрудника и КС из PostgreSQL. Старый
// расчёт на данных json-server оставлен как fallback для локальной разработки.
const useMyContractRole = () => {
  const backendSession = hasAccessSession();
  const accessQuery = useAccessProfile();

  const { data: user, isLoading: isUserLoading } = useFetchCurrentUser();
  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const { data: contractService, isLoading: isCsLoading } = useContractService(
    organization?.id,
  );
  // Учётная запись и штатное расписание связаны полем userId
  const { data: employee, isLoading: isEmpLoading } = useFetchEmployeeByUserId(
    user?.id,
  );

  if (backendSession) {
    const profile = accessQuery.data;

    if (!profile) {
      return {
        user: undefined,
        organization: undefined,
        contractService: undefined,
        employee: undefined,
        myRole: undefined,
        isHead: false,
        isLoading: accessQuery.isLoading || accessQuery.isFetching,
        isInContractService: false,
        myFunctions: [] as ContractServiceFunction[],
        canEditPurchaseNote: false,
        canDisagreeKbk: false,
        canEditCustomerRequisites: false,
        purchaseNoteDeniedReason: null as string | null,
        isContractServiceMember: false,
        isPurchaseInitiator: false,
        roles: [] as string[],
        permissions: [] as string[],
      };
    }

    const parsedService = ContractServiceSchema.safeParse(
      profile.contractService,
    ).data;
    const parsedEmployee = BaseEmployeeSchema.safeParse(profile.employee).data;
    const backendRoster = parsedService ? contractServiceRoster(parsedService) : [];

    // Компоненты личного кабинета читают myRole как строку таблицы состава
    // (role, position, functions), поэтому профиль API приводим к тому же
    // виду. Само решение о правах уже принято сервером.
    const myFunctions = profile.myFunctions as ContractServiceFunction[];
    const rosterRow: ContractServiceRosterRow | undefined =
      backendRoster.find(
        (row) => String(row.employeeId ?? "") === String(parsedEmployee?.id),
      ) ??
      (profile.myRole
        ? {
            key: `api-${String(parsedEmployee?.id ?? "")}`,
            role: profile.myRole,
            employeeId: parsedEmployee?.id,
            position: parsedEmployee?.position,
            functions: myFunctions,
          }
        : undefined);

    return {
      user: BaseUserSchema.safeParse(profile.user).data,
      organization: BaseOrganizationSchema.safeParse(profile.organization).data,
      contractService: parsedService,
      employee: parsedEmployee,
      myRole: rosterRow,
      isHead: profile.isHead,
      isLoading: false,
      isInContractService: profile.isInContractService,
      myFunctions,
      canEditPurchaseNote: profile.canEditPurchaseNote,
      canDisagreeKbk: profile.canDisagreeKbk,
      canEditCustomerRequisites: profile.canEditCustomerRequisites,
      purchaseNoteDeniedReason: profile.purchaseNoteDeniedReason,
      isContractServiceMember: profile.isContractServiceMember,
      isPurchaseInitiator: profile.isPurchaseInitiator,
      roles: profile.roles,
      permissions: profile.permissions,
    };
  }

  const isLoading =
    isUserLoading || isOrgLoading || isCsLoading || isEmpLoading;

  const roster = contractService ? contractServiceRoster(contractService) : [];
  const myRole = roster.find(
    (row) => String(row.employeeId ?? "") === String(employee?.id),
  );

  // При способе создания «структурное подразделение» все работники этого
  // подразделения ведут закупки в рамках КС (п. 2.1 приказа № 158н).
  const inStructuralUnitCs = Boolean(
    contractService?.creationMethod === "structural_unit" &&
      employee?.structuralUnitId !== undefined &&
      employee.structuralUnitId !== "" &&
      contractService.structuralUnitId !== undefined &&
      contractService.structuralUnitId !== "" &&
      String(employee.structuralUnitId) ===
        String(contractService.structuralUnitId),
  );

  const isInContractService = Boolean(myRole || inStructuralUnitCs);
  const myFunctions: ContractServiceFunction[] = myRole?.functions ?? [];

  // Назначать задачи и оценивать их может руководитель службы или контрактный
  // управляющий (Раздел III приказа Минфина России N 158н). Права определяем
  // по идентификатору работника в снимке КС, а не по русской подписи роли:
  // подпись меняется при редактировании приказа, employeeId — нет.
  const isHead = isContractServiceLeader(contractService, employee?.id);

  // Редактировать поля СЗ (потребности) вправе руководитель КС, контрактный
  // управляющий, работник структурного подразделения КС либо член КС с
  // полномочиями планирования (3.1), описания объекта / НМЦК (3.2) или
  // определения поставщика (3.3).
  const canEditPurchaseNote = Boolean(
    !isLoading &&
      user &&
      employee &&
      contractService &&
      (isHead ||
        inStructuralUnitCs ||
        myFunctions.some((fn) => PURCHASE_NOTE_ALLOWED_FUNCTIONS.includes(fn))),
  );

  // Заявить несогласие по КБК из ПГ может ответственный за планирование в КС (п. 3.1),
  // руководитель КС / КУ либо согласующий документы на этапах заключения / исполнения (п. 3.4, 3.5).
  const canDisagreeKbk = Boolean(
    !isLoading &&
      user &&
      employee &&
      contractService &&
      (isHead ||
        inStructuralUnitCs ||
        myFunctions.includes("planning") ||
        myFunctions.includes("contract_conclusion") ||
        myFunctions.includes("contract_execution")),
  );

  // Вносить и актуализировать реквизиты заказчика для обеспечений вправе любой
  // уполномоченный член контрактной службы / КУ / руководитель.
  const canEditCustomerRequisites = Boolean(
    !isLoading &&
      user &&
      employee &&
      contractService &&
      (isHead || inStructuralUnitCs || myFunctions.length > 0),
  );

  let purchaseNoteDeniedReason: string | null = null;
  if (!isLoading && !canEditPurchaseNote) {
    if (!user || !employee) {
      purchaseNoteDeniedReason =
        "Для изменения полей потребности выполните вход в учётную запись сотрудника организации.";
    } else if (!contractService) {
      purchaseNoteDeniedReason =
        "В организации не утверждена контрактная служба или контрактный управляющий (раздел «Контрактная служба»).";
    } else if (!isInContractService) {
      purchaseNoteDeniedReason =
        "Вы не входите в состав контрактной службы организации (приказ Минфина России № 158н). Поля СЗ доступны только для просмотра.";
    } else {
      purchaseNoteDeniedReason =
        "В составе контрактной службы вам не назначены полномочия п. 3.1 (планирование), п. 3.2 (описание объекта и НМЦК) или п. 3.3 (определение поставщика). Поля СЗ доступны только для просмотра.";
    }
  }

  // Роль «инициатор закупки» (Tasks 8, п. 4): работник подразделения-заказчика,
  // который НЕ входит в контрактную службу. Он готовит описание объекта
  // закупки и смету у нас, видит только свои черновики, а готовое описание
  // направляет в КС. Отдельной записи в справочнике ролей не нужно: роль
  // выводится из состава службы, как и остальные роли интерфейса.
  // «Входит в КС» учитывает и способ «структурное подразделение» (inStructuralUnitCs).
  const isContractServiceMember = isInContractService;
  const isPurchaseInitiator = Boolean(employee) && !isInContractService;

  return {
    user,
    organization,
    contractService,
    employee,
    myRole,
    isHead,
    isLoading,
    isInContractService,
    myFunctions,
    canEditPurchaseNote,
    canDisagreeKbk,
    canEditCustomerRequisites,
    purchaseNoteDeniedReason,
    isContractServiceMember,
    isPurchaseInitiator,
    roles: [] as string[],
    permissions: [] as string[],
  };
};

export default useMyContractRole;
