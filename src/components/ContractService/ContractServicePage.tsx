import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useContractService } from "../../services/ContractService/contractService.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { type PurchasePlan } from "../../services/PurchasePlan/purchasePlan.schema";
import { planTotalAmount } from "../PurchasePlan/purchasePlan.config";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import ContractServiceForm from "./ContractServiceForm";
import ContractServiceView from "./ContractServiceView";
import styles from "./ContractServicePage.module.scss";

interface ContractServicePageProps {}

// Совокупный годовой объём закупок заказчика: берём план последнего года
// планирования — именно он проверяется при решении «служба или
// контрактный управляющий» (ч. 21 ст. 38 44-ФЗ)
const annualVolumeOfLatestPlanYear = (plans: PurchasePlan[]): number => {
  if (plans.length === 0) {
    return 0;
  }

  const latestYear = plans.reduce(
    (max, plan) => Math.max(max, Number(plan.planYear) || 0),
    0,
  );

  return plans
    .filter((plan) => Number(plan.planYear) === latestYear)
    .reduce((total, plan) => total + planTotalAmount(plan), 0);
};

export default function ContractServicePage({}: ContractServicePageProps) {
  const { bem } = useUtils();
  const block = bem(styles, "contract-service");
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useFetchCurrentUser();
  const {
    data: organization,
    isLoading: isOrganizationLoading,
    isError: isOrganizationError,
  } = useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: service,
    isLoading: isServiceLoading,
    isError: isServiceError,
    error: serviceError,
  } = useContractService(organizationId);
  const { data: plans = [] } = usePurchasePlans(organizationId);

  const [isEditing, setIsEditing] = useState(false);

  const organizationName = organization
    ? `${organization.shortName || organization.fullName} (ИНН ${organization.inn})`
    : "Организация-заказчик не определена";
  const annualVolume = annualVolumeOfLatestPlanYear(plans);

  if (isUserLoading) {
    return <p className={block("status")}>Проверяем учётную запись...</p>;
  }

  if (!user) {
    return (
      <div className={block("notice", ["warning"])}>
        <p className={block("status")}>
          Сведения о контрактной службе указывают контрактный управляющий или
          руководитель заказчика. Войдите в учётную запись.
        </p>
        <button
          type="button"
          className={block("action")}
          onClick={() => navigate("/account/login")}
        >
          Войти
        </button>
      </div>
    );
  }

  if (isOrganizationLoading) {
    return (
      <p className={block("status")}>Определяем организацию заказчика...</p>
    );
  }

  if (isOrganizationError || !organizationId || !organization) {
    return (
      <p className={block("status", ["error"])}>
        К вашей учётной записи не привязана организация-заказчик, поэтому
        сведения о контрактной службе недоступны. Обратитесь к администратору
        системы.
      </p>
    );
  }

  if (isServiceLoading) {
    return <p className={block("status")}>Загрузка сведений о службе...</p>;
  }

  if (isServiceError) {
    return (
      <p className={block("status", ["error"])}>
        Не удалось загрузить сведения о контрактной службе:{" "}
        {String(serviceError)}
      </p>
    );
  }

  // Способ не указан — форма обязательна: без неё план-график не формируется
  if (!service || isEditing) {
    return (
      <>
        <ContractServiceForm
          key={service ? `edit-${String(service.id)}` : "create"}
          organizationId={organizationId}
          organizationName={organizationName}
          service={service ?? undefined}
          onSaved={() => setIsEditing(false)}
          onCancel={service ? () => setIsEditing(false) : undefined}
        />
        <p className={block("footnote")}>
          Совокупный годовой объём закупок по планам-графикам организации:{" "}
          {new Intl.NumberFormat("ru-RU").format(annualVolume)} ₽
        </p>
      </>
    );
  }

  return (
    <ContractServiceView
      service={service}
      organizationName={organizationName}
      onEdit={() => setIsEditing(true)}
    />
  );
}
