import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlan } from "../../services/PurchasePlan/purchasePlan.api";
import {
  usePurchaseNotes,
  useUpdatePurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.api";
import {
  latestPurchaseNoteForPosition,
  type PurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.schema";
import {
  toNumber,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import { useAddProcurement } from "../../services/Procurements/procurement.api";
import type { RawProcurement } from "../../services/Procurements/procurement.schema";
import { DEFAULT_PROCUREMENT_TYPES } from "../ProcurementProcessing/procurement.config";
import PurchaseNoteModal from "./PurchaseNoteModal";
import styles from "./PurchaseNoteModal.module.scss";

/**
 * Полноэкранная страница формирования потребности (служебной записки по
 * позиции плана-графика): `/purchase-plans/:id/positions/:positionId/requirement`.
 */
export default function PurchaseNotePage() {
  const { id, positionId } = useParams<{ id: string; positionId: string }>();
  const [searchParams] = useSearchParams();
  const noteIdParam = searchParams.get("noteId");
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "purchase-note-modal");

  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;

  const {
    data: plan,
    isLoading: isPlanLoading,
    isError,
    error,
  } = usePurchasePlan(id, organizationId);
  const { data: purchaseNotes = [], isLoading: isNotesLoading } =
    usePurchaseNotes(organizationId);

  const { mutate: createProcurement } = useAddProcurement();
  const { mutate: patchNote } = useUpdatePurchaseNote();

  const position: PurchasePlanPosition | undefined = positionId
    ? plan?.positions.find((item) => String(item.id) === positionId)
    : undefined;

  if (isOrgLoading) {
    return (
      <p className={block("status")}>Определяем организацию заказчика...</p>
    );
  }

  if (!organizationId) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик, поэтому
          потребность недоступна. Обратитесь к администратору системы.
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          ← К списку планов-графиков
        </button>
      </div>
    );
  }

  if (isPlanLoading || isNotesLoading) {
    return (
      <p className={block("status")}>Загрузка сведений плана-графика и СЗ...</p>
    );
  }

  if (isError || !plan) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          План-график недоступен: {String(error)}
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          ← К списку планов-графиков
        </button>
      </div>
    );
  }

  if (!position) {
    return (
      <div className={block()}>
        <p className={block("status")}>
          Запись плана-графика не найдена в этом документе.
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate(`/purchase-plans/${plan.id}`)}
        >
          ← К плану-графику
        </button>
      </div>
    );
  }

  const backToPlan = () => navigate(`/purchase-plans/${plan.id}`);

  const handleSaveAndProceedToNotice = (note: PurchaseNote) => {
    const buildNoticeState = () => ({
      ikz: note.ikz || position.identificationCode,
      name: note.subject || position.objectOfPurchase,
      procurementType:
        note.procurementType ||
        DEFAULT_PROCUREMENT_TYPES[DEFAULT_PROCUREMENT_TYPES.length - 1],
      nmck: note.initialMaxPrice
        ? Number.parseFloat(note.initialMaxPrice)
        : (toNumber(position.amountTotal) ?? 0),
      planPositionNumber: String(
        position.purchaseNumber ?? position.serialNumber ?? "",
      ),
      responsibleFio: note.initiatorName,
      smpRequiredPercent:
        (note.requiresSmpSubcontracting ??
        (note.smpRequiredPercent !== undefined &&
          note.smpRequiredPercent > 0))
          ? note.smpRequiredPercent
          : undefined,
      purchaseNoteId: note.id,
      purchaseNoteNumber: String(note.noteNumber),
      objectDescriptionId: note.objectDescriptionId ?? undefined,
      authorizedBodyName:
        note.authorizedBodyName || position.authorizedBodyName || undefined,
      jointOrganizerName:
        note.jointOrganizerName || position.jointOrganizerName || undefined,
      kbk: note.kbk || position.kbk || undefined,
    });

    if (
      note.procurementId !== undefined &&
      note.procurementId !== null &&
      note.procurementId !== ""
    ) {
      navigate(`/procurement-processing/${note.procurementId}/notice-info`, {
        state: buildNoticeState(),
      });
      return;
    }

    const raw: RawProcurement = {
      "Идентификационный код закупки":
        note.ikz || position.identificationCode || "",
      "Наименование закупки": note.subject || position.objectOfPurchase,
      "Начальная (максимальная) цена контракта, руб": note.initialMaxPrice
        ? Number.parseFloat(note.initialMaxPrice) || 0
        : (toNumber(position.amountTotal) ?? 0),
      "Тип закупки":
        note.procurementType ||
        DEFAULT_PROCUREMENT_TYPES[DEFAULT_PROCUREMENT_TYPES.length - 1],
      "Уполномоченный орган (учреждение)":
        note.authorizedBodyName || position.authorizedBodyName || "",
      "Организатор совместной закупки":
        note.jointOrganizerName || position.jointOrganizerName || "",
      "КБК": note.kbk || position.kbk || "",
    };

    createProcurement(raw, {
      onSuccess: (created) => {
        if (note.id !== undefined) {
          patchNote({ id: note.id, procurementId: created.id });
        }
        navigate(`/procurement-processing/${created.id}/notice-info`, {
          state: buildNoticeState(),
        });
      },
    });
  };

  const selectedNote =
    (noteIdParam
      ? purchaseNotes.find((n) => String(n.id) === noteIdParam)
      : undefined) ?? latestPurchaseNoteForPosition(purchaseNotes, position.id);

  return (
    <PurchaseNoteModal
      organizationId={organizationId}
      plan={plan}
      position={position}
      initialNote={selectedNote}
      onClose={backToPlan}
      onSaved={backToPlan}
      onSaveAndProceedToNotice={handleSaveAndProceedToNotice}
    />
  );
}
