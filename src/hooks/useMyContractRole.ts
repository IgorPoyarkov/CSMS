import { useFetchCurrentUser } from "../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../services/StaffingTable/StaffingTable.api";
import { useCurrentOrganization } from "../services/Organization/organization.api";
import { useContractService } from "../services/ContractService/contractService.api";
import type { ContractServiceFunction } from "../services/ContractService/contractService.schema";
import { contractServiceRoster } from "../components/ContractService/contractService.config";

// Функции раздела III приказа Минфина РФ № 158н, дающие право формировать
// и изменять потребность (служебную записку по позиции плана-графика).
const PURCHASE_NOTE_ALLOWED_FUNCTIONS: ReadonlyArray<ContractServiceFunction> =
  ["planning", "purchase_description", "supplier_determination"];

// Роль вошедшего пользователя в контрактной службе организации. Нужна сразу
// нескольким разделам: личный кабинет показывает роль и права руководителя,
// список задач и форма потребности (СЗ) решают, доступно ли редактирование.
const useMyContractRole = () => {
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
  // управляющий (Раздел III приказа Минфина России N 158н)
  const isHead = Boolean(
    myRole?.role.includes("Руководитель") ||
      myRole?.role.includes("Контрактный управляющий"),
  );

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
  };
};

export default useMyContractRole;
