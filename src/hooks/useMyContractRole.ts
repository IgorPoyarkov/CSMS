import { useFetchCurrentUser } from "../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../services/StaffingTable/StaffingTable.api";
import { useCurrentOrganization } from "../services/Organization/organization.api";
import { useContractService } from "../services/ContractService/contractService.api";
import { contractServiceRoster } from "../components/ContractService/contractService.config";

// Роль вошедшего пользователя в контрактной службе организации. Нужна сразу
// нескольким разделам: личный кабинет показывает роль и права руководителя,
// список задач организации решает, доступно ли редактирование карточки задачи.
const useMyContractRole = () => {
  const { data: user } = useFetchCurrentUser();
  const { data: organization } = useCurrentOrganization();
  const { data: contractService } = useContractService(organization?.id);
  // Учётная запись и штатное расписание связаны полем userId
  const { data: employee } = useFetchEmployeeByUserId(user?.id);

  const roster = contractService ? contractServiceRoster(contractService) : [];
  const myRole = roster.find(
    (row) => String(row.employeeId ?? "") === String(employee?.id),
  );

  // Назначать задачи и оценивать их может руководитель службы или контрактный
  // управляющий (Раздел III приказа Минфина России N 158н)
  const isHead = Boolean(
    myRole?.role.includes("Руководитель") ||
      myRole?.role.includes("Контрактный управляющий"),
  );

  // Роль «инициатор закупки» (Tasks 8, п. 4): работник подразделения-заказчика,
  // который НЕ входит в контрактную службу. Он готовит описание объекта
  // закупки и смету у нас, видит только свои черновики, а готовое описание
  // направляет в КС. Отдельной записи в справочнике ролей не нужно: роль
  // выводится из состава службы, как и остальные роли интерфейса.
  const isContractServiceMember = Boolean(myRole);
  const isPurchaseInitiator = Boolean(employee) && !isContractServiceMember;

  return {
    user,
    organization,
    contractService,
    employee,
    myRole,
    isHead,
    isContractServiceMember,
    isPurchaseInitiator,
  };
};

export default useMyContractRole;
