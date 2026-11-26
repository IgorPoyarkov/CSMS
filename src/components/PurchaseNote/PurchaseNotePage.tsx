import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlan } from "../../services/PurchasePlan/purchasePlan.api";
import {
  usePurchaseNotes,
  useUpdatePurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.api";
import {
  filterVisiblePurchaseNotes,
  isVisiblePurchaseNote,
  latestPurchaseNoteForPosition,
  type PurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.schema";
import type { PurchasePlanPosition } from "../../services/PurchasePlan/purchasePlan.schema";
import { useAddProcurement } from "../../services/Procurements/procurement.api";
import PurchaseNoteModal from "./PurchaseNoteModal";
import {
  buildNoticeLocationState,
  buildProcurementRaw,
  hasProcurement,
  procurementRoute,
} from "./purchaseNoteNavigation";
import styles from "./PurchaseNoteModal.module.scss";

/**
 * Полноэкранная страница потребности (служебной записки).
 *
 * Канонический адрес — `/purchase-notes/:noteId`; новая СЗ по позиции ПГ —
 * `/purchase-notes/new?planId=…&positionId=…`. Старый адрес
 * `/purchase-plans/:id/positions/:positionId/requirement?noteId=…` остаётся
 * рабочим для сохранённых закладок: СЗ больше не часть плана-графика.
 */
export default function PurchaseNotePage() {
  const { id, positionId, noteId } = useParams<{
    id?: string;
    positionId?: string;
    noteId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "purchase-note-modal");

  // «new» — создание СЗ по позиции ПГ, а не идентификатор документа
  const isNewNote = noteId === "new";
  const noteIdParam = isNewNote
    ? undefined
    : (noteId ?? searchParams.get("noteId") ?? undefined);
  const planIdParam = searchParams.get("planId") ?? id;
  const positionIdParam = searchParams.get("positionId") ?? positionId;

  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;

  const { data: purchaseNotes = [], isLoading: isNotesLoading } =
    usePurchaseNotes(organizationId);

  // В маршруте /purchase-notes/:noteId основание (план и позиция) берётся из
  // самой СЗ: отдельный документ не обязан открываться через план-график
  const requestedNote = noteIdParam
    ? purchaseNotes.find((note) => String(note.id) === noteIdParam)
    : undefined;
  const planId = planIdParam ?? requestedNote?.purchasePlanId ?? undefined;
  const positionIdResolved =
    positionIdParam ?? requestedNote?.positionId ?? undefined;

  const {
    data: plan,
    isLoading: isPlanLoading,
    isError,
    error,
  } = usePurchasePlan(planId, organizationId);

  const { mutate: createProcurement } = useAddProcurement();
  const { mutate: patchNote } = useUpdatePurchaseNote();

  const position: PurchasePlanPosition | undefined = positionIdResolved
    ? plan?.positions.find(
        (item) => String(item.id) === String(positionIdResolved),
      )
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
          onClick={() => navigate("/purchase-notes")}
        >
          ← К реестру потребностей
        </button>
      </div>
    );
  }

  if (isPlanLoading || isNotesLoading) {
    return (
      <p className={block("status")}>Загрузка сведений плана-графика и СЗ...</p>
    );
  }

  // Новая СЗ без основания или ссылка на удалённую СЗ: открывать нечего
  if (!planId) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          {noteIdParam
            ? "Служебная записка не найдена: возможно, она удалена."
            : "Не указана позиция плана-графика — основание для служебной записки."}
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-notes")}
        >
          ← К реестру потребностей
        </button>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          Не удалось загрузить позицию плана-графика (основание СЗ):{" "}
          {String(error)}
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-notes")}
        >
          ← К реестру потребностей
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
          onClick={() => navigate("/purchase-notes")}
        >
          ← К реестру потребностей
        </button>
      </div>
    );
  }

  const backToNotes = () => navigate("/purchase-notes");

  const handleSaveAndProceedToNotice = (note: PurchaseNote) => {
    // Сведения СЗ — заготовка извещения: состояние передаётся форме, а запись
    // закупки создаётся только если по СЗ её ещё нет
    const state = buildNoticeLocationState(note, position);

    if (hasProcurement(note)) {
      navigate(
        procurementRoute(note.procurementId as string | number, "notice"),
        { state },
      );
      return;
    }

    createProcurement(buildProcurementRaw(note, position), {
      onSuccess: (created) => {
        if (note.id !== undefined) {
          patchNote({ id: note.id, procurementId: created.id });
        }
        navigate(procurementRoute(created.id, "notice"), { state });
      },
    });
  };

  const visiblePurchaseNotes = filterVisiblePurchaseNotes(purchaseNotes);
  const selectedNote = isNewNote
    ? undefined
    : requestedNote && isVisiblePurchaseNote(requestedNote)
      ? requestedNote
      : noteIdParam
        ? undefined
        : latestPurchaseNoteForPosition(visiblePurchaseNotes, position.id);

  return (
    <PurchaseNoteModal
      organizationId={organizationId}
      plan={plan}
      position={position}
      initialNote={selectedNote}
      onClose={backToNotes}
      onSaved={backToNotes}
      onSaveAndProceedToNotice={handleSaveAndProceedToNotice}
    />
  );
}
