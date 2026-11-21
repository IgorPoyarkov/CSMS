import { Link, useNavigate, useParams } from "react-router-dom";
import PurchasePlanPositionModal from "./PurchasePlanPositionModal";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  usePurchasePlan,
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import {
  emptyPurchasePlanPosition,
  toNumber,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import { roundMoney } from "../../services/Nmck/marketNmck";
import useUtils from "../../hooks/useUtils";
import styles from "./PurchasePlanPositionModal.module.scss";

/**
 * Редактирование / добавление конкретной позиции плана-графика — отдельная
 * страница карточки позиции (роут `/purchase-plans/:id/positions/:positionId/edit`
 * или `/new`), оформленная по образцу карточки позиции ЕИС pg2020.
 */
export default function PurchasePlanPositionEditPage() {
  const { id } = useParams<{ id: string }>();
  const { positionId } = useParams<{ positionId?: string }>();
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "position-modal");
  const { data: organization, isLoading: isOrgLoading } = useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: plan,
    isLoading,
    isError,
    error,
  } = usePurchasePlan(id, organizationId);
  const { mutate: updatePlan, isPending: isSaving } = useUpdatePurchasePlan();

  const isNew = !positionId;
  const position: PurchasePlanPosition | undefined = positionId
    ? plan?.positions.find((item) => String(item.id) === positionId)
    : undefined;
  const currentPosition: PurchasePlanPosition =
    position ?? emptyPurchasePlanPosition();

  if (isOrgLoading) {
    return <p className={block("status")}>Определяем организацию заказчика...</p>;
  }

  if (!organizationId) {
    return (
      <div className={block("state-card")}>
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик, поэтому
          планы-графики недоступны. Обратитесь к администратору системы.
        </p>
        <Link to="/purchase-plans" className={block("back-link")}>
          ← К списку планов-графиков
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <p className={block("status")}>Загрузка плана-графика...</p>;
  }

  if (isError || !plan) {
    return (
      <div className={block("state-card")}>
        <p className={block("status", ["error"])}>
          План-график недоступен: {String(error)}
        </p>
        <Link to="/purchase-plans" className={block("back-link")}>
          ← К списку планов-графиков
        </Link>
      </div>
    );
  }

  if (positionId && !position) {
    return (
      <div className={block("state-card")}>
        <p className={block("status")}>
          Запись плана-графика не найдена в этом плане-графике.
        </p>
        <Link
          to={`/purchase-plans/${plan.id}?tab=positions`}
          className={block("back-link")}
        >
          ← К позициям плана-графика
        </Link>
      </div>
    );
  }

  function savePosition(positionToSave: PurchasePlanPosition) {
    if (!plan) {
      return;
    }

    const nextPositions = isNew
      ? [...plan.positions, positionToSave]
      : plan.positions.map((item) =>
          position && item.id === position.id ? positionToSave : item,
        );

    const nextTotalAmount =
      plan.totalAmount !== undefined && plan.totalAmount !== ""
        ? roundMoney(
            nextPositions.reduce(
              (acc, item) => acc + (toNumber(item.amountTotal) ?? 0),
              0,
            ),
          ).toFixed(2)
        : plan.totalAmount;

    updatePlan(
      {
        id: plan.id as string | number,
        data: { ...plan, totalAmount: nextTotalAmount, positions: nextPositions },
      },
      { onSuccess: () => navigate(`/purchase-plans/${plan.id}?tab=positions`) },
    );
  }

  function deletePosition() {
    if (!plan || !positionId) {
      return;
    }

    const index = plan.positions.findIndex(
      (item) => String(item.id) === positionId,
    );

    if (index === -1) {
      return;
    }

    updatePlan(
      {
        id: plan.id as string | number,
        data: {
          ...plan,
          positions: plan.positions.filter((_, itemIndex) => itemIndex !== index),
        },
      },
      { onSuccess: () => navigate(`/purchase-plans/${plan.id}?tab=positions`) },
    );
  }

  return (
    <PurchasePlanPositionModal
      asPage
      plan={plan}
      position={currentPosition}
      index={position ? plan.positions.indexOf(position) : plan.positions.length}
      positions={plan.positions}
      isNew={isNew}
      isSaving={isSaving}
      onClose={() => navigate(`/purchase-plans/${plan.id}?tab=positions`)}
      onSave={savePosition}
      onDelete={!isNew ? deletePosition : undefined}
    />
  );
}
