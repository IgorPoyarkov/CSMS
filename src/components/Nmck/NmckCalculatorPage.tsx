import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ExternalLink } from "lucide-react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { ORGANIZATION_BUDGET_LEVEL_LABELS } from "../../services/Organization/organization.schema";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../../services/StaffingTable/StaffingTable.api";
import {
  usePurchasePlans,
  useUpdatePositionPlanAmount,
} from "../../services/PurchasePlan/purchasePlan.api";
import {
  positionKbkCodes,
  toNumber,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  useCreatePurchaseNote,
  usePurchaseNotes,
  useUpdatePurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.api";
import {
  emptyPurchaseNote,
  filterVisiblePurchaseNotes,
  mergePurchaseNoteFiles,
  nextPurchaseNoteNumber,
  purchaseNotesForPosition,
  type PurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.schema";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import { useEdsCertificates } from "../../services/Eds/eds.api";
import {
  formatNmckMoney,
  parseNumericInput,
} from "../../services/Nmck/marketNmck";
import { type NmckCalculationRecord } from "../../services/Nmck/nmck.schema";
import LegalActRefs from "../LegalAct/LegalActRefs";
import MarketNmckCalculator from "./MarketNmckCalculator";
import styles from "./NmckCalculatorPage.module.scss";

const CREATE_NEW_NOTE_KEY = "__create_new__";

/**
 * Полноэкранный модуль расчёта НМЦК (анализ рынка, нормативный, тарифный и затратный
 * методы по ст. 22 Закона № 44-ФЗ и Приказу МЭР № 567) с сохранением обоснования
 * в Служебную записку (`/nmck-calculator`). В ПГ при необходимости обновляется только
 * плановый объём финансирования (`amountTotal`).
 */
export default function NmckCalculatorPage() {
  const { bem, fullName } = useUtils();
  const block = bem(styles, "nmck-page");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;
  const { data: user } = useFetchCurrentUser();
  const { data: employee } = useFetchEmployeeByUserId(user?.id);
  const { canEditPurchaseNote, purchaseNoteDeniedReason, isHead } =
    useMyContractRole();

  const { data: plans = [], isLoading: isPlansLoading } =
    usePurchasePlans(organizationId);
  const { data: purchaseNotes = [], isLoading: isNotesLoading } =
    usePurchaseNotes(organizationId);
  const visiblePurchaseNotes = useMemo(
    () => filterVisiblePurchaseNotes(purchaseNotes),
    [purchaseNotes],
  );
  const { data: contractRegistryItems = [] } =
    useContractRegistry(organizationId);
  const { data: edsCertificates = [] } = useEdsCertificates(organizationId);

  const updatePositionAmount = useUpdatePositionPlanAmount();
  const createNote = useCreatePurchaseNote();
  const updateNote = useUpdatePurchaseNote();

  const [savedNotice, setSavedNotice] = useState<{
    planId: string;
    positionId: string;
    noteId: string;
    noteNumber: string;
    nmckTotal: number;
    updatedAmount: boolean;
    createdNewNote: boolean;
  } | null>(null);

  const paramPlanId = searchParams.get("planId") ?? "";
  const paramPositionId = searchParams.get("positionId") ?? "";
  const paramNoteId = searchParams.get("noteId") ?? "";

  const selectedPlan = useMemo(() => {
    if (plans.length === 0) return undefined;
    if (paramPlanId) {
      return plans.find((p) => String(p.id) === paramPlanId) ?? plans[0];
    }
    return plans[0];
  }, [plans, paramPlanId]);

  const planPositions = useMemo(
    () => selectedPlan?.positions ?? [],
    [selectedPlan],
  );

  const selectedPosition = useMemo(() => {
    if (planPositions.length === 0) return undefined;
    if (paramPositionId) {
      return (
        planPositions.find((pos) => String(pos.id) === paramPositionId) ??
        planPositions[0]
      );
    }
    return planPositions[0];
  }, [planPositions, paramPositionId]);

  const positionNotes = useMemo(
    () => purchaseNotesForPosition(visiblePurchaseNotes, selectedPosition?.id),
    [visiblePurchaseNotes, selectedPosition?.id],
  );

  const effectiveNoteTarget = useMemo(() => {
    if (
      paramNoteId &&
      positionNotes.some((n) => String(n.id) === paramNoteId)
    ) {
      return paramNoteId;
    }
    if (positionNotes.length > 0) {
      const latest = positionNotes[positionNotes.length - 1];
      return latest.id !== undefined ? String(latest.id) : CREATE_NEW_NOTE_KEY;
    }
    return CREATE_NEW_NOTE_KEY;
  }, [paramNoteId, positionNotes]);

  const selectedNote = useMemo(
    () =>
      effectiveNoteTarget !== CREATE_NEW_NOTE_KEY
        ? positionNotes.find((n) => String(n.id) === effectiveNoteTarget)
        : undefined,
    [effectiveNoteTarget, positionNotes],
  );

  const handleSaveToNote = ({
    record,
    basisText,
    updatePlanAmount,
  }: {
    record: NmckCalculationRecord;
    basisText: string;
    updatePlanAmount: boolean;
  }) => {
    if (
      !organizationId ||
      !selectedPlan?.id ||
      selectedPosition?.id === undefined ||
      !canEditPurchaseNote
    ) {
      return;
    }
    setSavedNotice(null);

    const parsedQty = parseNumericInput(record.quantity);
    const unitPriceStr =
      Number.isFinite(parsedQty) && parsedQty > 0
        ? (record.nmckTotal / parsedQty).toFixed(2)
        : "";
    const nmckStr = record.nmckTotal.toFixed(2);
    const resolvedOkpd2 = record.okpd2Code || selectedPosition.okpd2Code || "";
    const resolvedOkpd2Name =
      record.okpd2Name || selectedPosition.okpd2Name || "";

    const maybeSyncPlanAmount = () => {
      if (!updatePlanAmount) return;
      updatePositionAmount.mutate({
        planId: selectedPlan.id!,
        organizationId,
        positionId: selectedPosition.id!,
        amountTotal: record.nmckTotal,
      });
    };

    const onNoteSaved = (saved: PurchaseNote, createdNewNote: boolean) => {
      maybeSyncPlanAmount();
      if (saved.id !== undefined) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("noteId", String(saved.id));
        setSearchParams(nextParams, { replace: true });
      }
      setSavedNotice({
        planId: String(selectedPlan.id),
        positionId: String(selectedPosition.id),
        noteId: String(saved.id ?? ""),
        noteNumber: saved.noteNumber || String(saved.id ?? "б/н"),
        nmckTotal: record.nmckTotal,
        updatedAmount: updatePlanAmount,
        createdNewNote,
      });
    };

    if (selectedNote?.id !== undefined) {
      const nextItems =
        selectedNote.items && selectedNote.items.length === 1
          ? [
              {
                ...selectedNote.items[0],
                okpd2Code: resolvedOkpd2 || selectedNote.items[0].okpd2Code,
                okpd2Name: resolvedOkpd2Name || selectedNote.items[0].okpd2Name,
                unit: record.unit || selectedNote.items[0].unit,
                quantity: selectedNote.isIndeterminateVolume
                  ? "1"
                  : record.quantity,
                unitPrice: unitPriceStr || selectedNote.items[0].unitPrice,
                totalPrice: nmckStr,
              },
            ]
          : selectedNote.items;

      updateNote.mutate(
        {
          id: selectedNote.id,
          initialMaxPrice: nmckStr,
          priceBasis: basisText,
          nmckOffers: record.offers,
          nmckCalculation: record,
          okpd2Code: resolvedOkpd2 || selectedNote.okpd2Code,
          okpd2Name: resolvedOkpd2Name || selectedNote.okpd2Name,
          unit: record.unit || selectedNote.unit,
          quantity: selectedNote.isIndeterminateVolume
            ? "1"
            : record.quantity || selectedNote.quantity,
          nmckFileUpdatedAt: record.calculatedAt,
          ...(selectedNote.nmckRequestStatus === "requested"
            ? { nmckRequestStatus: "received" as const }
            : {}),
          items: nextItems,
        },
        {
          onSuccess: (saved) => onNoteSaved(saved, false),
        },
      );
      return;
    }

    const base = emptyPurchaseNote(organizationId);
    const defaultKbk =
      selectedPosition.kbk || positionKbkCodes(selectedPosition)[0] || "";
    const budgetLevelLabel = organization?.budgetLevel
      ? ORGANIZATION_BUDGET_LEVEL_LABELS[organization.budgetLevel]
      : "";
    const initiatorEmp = employee?.employee;
    const initiatorLabel = initiatorEmp
      ? `${employee?.position ? `${employee.position} — ` : ""}${fullName(initiatorEmp)}`
      : record.calculatorName || "Специалист контрактной службы";
    const subjectText =
      record.subject.trim().length >= 5
        ? record.subject.trim()
        : selectedPosition.objectOfPurchase || "Закупка по позиции ПГ";

    const newNote: PurchaseNote = {
      ...base,
      noteNumber: nextPurchaseNoteNumber(visiblePurchaseNotes),
      purchasePlanId: selectedPlan.id,
      purchasePlanNumber: selectedPlan.planNumber,
      positionId: selectedPosition.id,
      positionSerialNumber: String(selectedPosition.serialNumber ?? ""),
      positionUniqueNumber: String(selectedPosition.uniqueNumber ?? ""),
      ikz: selectedPosition.identificationCode || "",
      initiatorEmployeeId: initiatorEmp?.id,
      initiatorName:
        initiatorLabel.trim().length >= 3
          ? initiatorLabel.trim()
          : "Специалист КС",
      authorizedBodyName: selectedPosition.authorizedBodyName || "",
      jointOrganizerName: selectedPosition.jointOrganizerName || "",
      kbk: defaultKbk,
      budgetLevel: budgetLevelLabel,
      fundingSource: budgetLevelLabel || base.fundingSource,
      subject: subjectText,
      items: [
        {
          id: "item-1",
          name: subjectText,
          okpd2Code: resolvedOkpd2,
          okpd2Name: resolvedOkpd2Name,
          unit: record.unit || "шт",
          quantity: record.quantity || "1",
          unitPrice: unitPriceStr,
          totalPrice: nmckStr,
          nationalRegimeType: "none",
          isSupplyDuringWorks: false,
        },
      ],
      okpd2Code: resolvedOkpd2,
      okpd2Name: resolvedOkpd2Name,
      unit: record.unit || "шт",
      quantity: record.quantity || "1",
      initialMaxPrice: nmckStr,
      priceBasis: basisText,
      nmckFileUpdatedAt: record.calculatedAt,
      nmckRequestStatus: "received",
      nmckOffers: record.offers,
      nmckCalculation: record,
    };

    createNote.mutate(newNote, {
      onSuccess: (saved) => onNoteSaved(saved, true),
    });
  };

  if (isOrgLoading || isPlansLoading || isNotesLoading) {
    return (
      <p className={block("status")}>
        Загружаем планы-графики, служебные записки и данные организации…
      </p>
    );
  }

  if (!organizationId) {
    return (
      <section className={block()}>
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик. Для привязки
          расчёта к СЗ войдите под учётной записью организации.
        </p>
      </section>
    );
  }

  const calculatorName = employee?.employee ? fullName(employee.employee) : "";
  const myCertificate = edsCertificates.find(
    (certificate) =>
      calculatorName !== "" &&
      certificate.ownerName.trim() === calculatorName.trim(),
  );
  const signer = {
    compiledBy: calculatorName,
    compiledPosition:
      myCertificate?.ownerPosition ||
      employee?.position ||
      "Работник контрактной службы",
    approver: isHead
      ? calculatorName
      : organization?.responsiblePerson || "",
    certificateOwner: myCertificate?.ownerName || "",
    certificateSerial: myCertificate?.serialNumber || "",
    certificateInn: myCertificate?.inn || "",
  };
  const ooAttachments = mergePurchaseNoteFiles(
    selectedNote?.objectDescriptionFiles,
    selectedNote?.objectDescriptionFileName,
    selectedNote?.objectDescriptionFileUpdatedAt,
  ).map((file) => ({ fileName: file.fileName, updatedAt: file.fileUpdatedAt }));
  const existingPosAmountTotal = toNumber(selectedPosition?.amountTotal);
  const firstNoteItem = selectedNote?.items?.[0];
  const initialRecord: NmckCalculationRecord | null =
    selectedNote?.nmckCalculation ?? null;

  const isSaving =
    createNote.isPending ||
    updateNote.isPending ||
    updatePositionAmount.isPending;
  const saveError =
    createNote.error || updateNote.error || updatePositionAmount.error;

  const calcKey = `${selectedPlan?.id ?? "none"}-${selectedPosition?.id ?? "none"}-${effectiveNoteTarget}-${initialRecord?.calculatedAt ?? ""}-${initialRecord?.method ?? ""}`;

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <button
            type="button"
            className={block("back")}
            onClick={() =>
              selectedPlan?.id
                ? navigate(`/purchase-plans/${selectedPlan.id}`)
                : navigate("/purchase-plans")
            }
          >
            {selectedPlan?.id
              ? `← К плану-графику ${selectedPlan.planNumber}`
              : "← К планам-графикам"}
          </button>
          <h1 className={block("title")}>
            Расчёт и обоснование НМЦК (ст. 22 Закона № 44-ФЗ)
          </h1>
          <p className={block("subtitle")}>
            Обоснование цены (анализ рынка, нормативный, тарифный и затратный
            методы по Приказу МЭР № 567) сохраняется в Служебную записку
            (потребность) и не загромождает план-график.
          </p>
          <p className={block("subtitle")}>
            Обоснование НМЦК формируется в выбранной Служебной записке. Для
            проектно-сметного метода расчёт выполняется в разделе «Сметы и НМЦК».
          </p>
        </div>
      </header>

      <LegalActRefs component="NmckCalculatorPage" />

      {/* План, позиция и СЗ приходят параметрами маршрута — селекторы не нужны.
          Здесь только возврат в СЗ и полное отображение привязки. */}
      <div className={block("card")}>
        <h2 className={block("card-title")}>
          Обоснование НМЦК для Служебной записки
        </h2>
        <div>
          <Link
            className={block("link-btn")}
            to={
              selectedNote?.id !== undefined
                ? `/purchase-notes/${selectedNote.id}`
                : "/purchase-notes"
            }
          >
            ← Вернуться в СЗ (потребность)
          </Link>
        </div>

        {plans.length === 0 && (
          <div className={block("banner", ["info"])}>
            <span>
              У организации пока нет планов-графиков. Вы можете выполнить расчёт
              автономно и выгрузить обоснование (.docx), либо сначала создать
              план-график.
            </span>
            <Link className={block("link-btn")} to="/purchase-plans">
              Перейти к планам-графикам
            </Link>
          </div>
        )}
      </div>

      {!canEditPurchaseNote && purchaseNoteDeniedReason && (
        <div className={block("banner", ["info"])} role="status">
          <span>
            Сохранение в Служебную записку недоступно (
            {purchaseNoteDeniedReason}
            ), но вы можете выполнить расчёт и выгрузить файл обоснования
            (.docx).
          </span>
        </div>
      )}

      {saveError && (
        <div className={block("banner", ["error"])} role="alert">
          <span>
            Не удалось сохранить обоснование в СЗ: {String(saveError)}
          </span>
        </div>
      )}

      {savedNotice && (
        <div className={block("banner", ["success"])} role="status">
          <span>
            <CheckCircle2
              size={15}
              style={{ verticalAlign: "text-bottom", marginRight: 6 }}
              aria-hidden="true"
            />
            Обоснование НМЦК{" "}
            <strong>{formatNmckMoney(savedNotice.nmckTotal)} ₽</strong>{" "}
            {savedNotice.createdNewNote
              ? "сохранено в новую СЗ"
              : "обновлено в СЗ"}{" "}
            <strong>№ {savedNotice.noteNumber}</strong>
            {savedNotice.updatedAmount
              ? " (плановый объём финансирования в ПГ также обновлён)."
              : "."}
          </span>
          <div className={block("banner-actions")}>
            <Link
              className={block("link-btn")}
              to={
                savedNotice.noteId
                  ? `/purchase-notes/${savedNotice.noteId}`
                  : "/purchase-notes"
              }
            >
              <ExternalLink size={13} aria-hidden="true" /> Открыть СЗ
              (потребность)
            </Link>
            <Link
              className={block("link-btn")}
              to={`/purchase-plans/${savedNotice.planId}`}
            >
              Перейти к таблице ПГ
            </Link>
          </div>
        </div>
      )}

      {/* Основной калькулятор НМЦК (анализ рынка и нормативный метод по ОКПД2) */}
      <MarketNmckCalculator
        key={calcKey}
        initialRecord={initialRecord}
        defaultSubject={
          selectedNote?.subject || selectedPosition?.objectOfPurchase || ""
        }
        defaultOkpd2Code={
          firstNoteItem?.okpd2Code ||
          selectedNote?.okpd2Code ||
          selectedPosition?.okpd2Code ||
          ""
        }
        defaultOkpd2Name={
          firstNoteItem?.okpd2Name ||
          selectedNote?.okpd2Name ||
          selectedPosition?.okpd2Name ||
          ""
        }
        defaultQuantity={
          firstNoteItem?.quantity || selectedNote?.quantity || "1"
        }
        defaultUnit={firstNoteItem?.unit || selectedNote?.unit || "шт"}
        defaultIkz={
          selectedNote?.ikz || selectedPosition?.identificationCode || ""
        }
        defaultCalculatorName={calculatorName}
        signer={signer}
        ooAttachments={ooAttachments}
        organizationName={
          organization?.shortName || organization?.fullName || ""
        }
        organization={organization ?? selectedPlan?.customer ?? null}
        planAmountLimit={existingPosAmountTotal}
        contractRegistryItems={contractRegistryItems}
        isSaving={isSaving}
        saveButtonLabel={
          selectedNote
            ? `Сохранить обоснование в СЗ № ${selectedNote.noteNumber}`
            : "Создать СЗ и сохранить обоснование"
        }
        onSaveToPosition={
          canEditPurchaseNote &&
          selectedPlan?.id &&
          selectedPosition?.id !== undefined
            ? handleSaveToNote
            : undefined
        }
      />
    </section>
  );
}
