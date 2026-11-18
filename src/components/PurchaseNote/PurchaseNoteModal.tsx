import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calculator,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText,
  Scale,
  Upload,
  X,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import AddressCascade from "../UI/AddressCascade/AddressCascade";
import SecurityRequisitesFields from "./SecurityRequisitesFields";
import PurchaseNoteStatusBadge from "./PurchaseNoteStatusBadge";
import MarketNmckCalculator from "../Nmck/MarketNmckCalculator";
import {
  PURCHASE_NOTE_STATUSES,
  PURCHASE_NOTE_STATUS_META,
  PurchaseNoteSchema,
  emptyDeliveryPlace,
  emptyPurchaseNote,
  hasSmpSubcontractingRequirement,
  nextPurchaseNoteNumber,
  purchaseNotesForPosition,
  type PurchaseNote,
  type PurchaseNoteObjectItem,
  type PurchaseNoteStatus,
} from "../../services/PurchaseNote/purchaseNote.schema";
import {
  useCreatePurchaseNote,
  usePurchaseNotes,
  useUpdatePurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.api";
import {
  exportPurchaseNoteToDocx,
  exportPurchaseNoteToPdf,
} from "../../services/PurchaseNote/purchaseNoteExport";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import { useOrganizationObjectDescriptions } from "../../services/ObjectDescription/objectDescription.api";
import {
  ORGANIZATION_BUDGET_LEVEL_LABELS,
  type BudgetPart13Art44Requisites,
  type OrganizationSecurityAccount,
} from "../../services/Organization/organization.schema";
import { useUpdateOrganization } from "../../services/Organization/organization.api";
import { MINIMUM_SMP_REQUIRED_PERCENT } from "../../services/ContractSmp/pp1466";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import {
  MARKET_PRICE_SOURCE_SHORT,
  NMCK_METHOD_LABELS,
  type NmckCalculationRecord,
  type NmckMarketOffer,
} from "../../services/Nmck/nmck.schema";
import {
  calculateMarketNmck,
  exportNmckCalculationToDocx,
  formatNmckMoney,
} from "../../services/Nmck/marketNmck";
import {
  checkOkpd2AuctionList,
  validatePlacingWayAgainstAuctionList,
} from "../../services/Okpd2Ref/auctionListControl";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import {
  NATIONAL_REGIME_OPTIONS,
  PLACING_WAYS_ALL,
  PP2571_POSITIONS,
} from "../../services/Procurements/noticeInfo.config";
import { DEFAULT_PROCUREMENT_TYPES } from "../ProcurementProcessing/procurement.config";
import { formatDeliveryAddress } from "../../services/AddressRef/addressRef.schema";
import {
  positionKbkCodes,
  positionKbkEntries,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import styles from "./PurchaseNoteModal.module.scss";

/**
 * Полноэкранная форма «Сформировать потребность» (служебная записка по позиции ПГ).
 *
 * Реализует правила Закона № 44-ФЗ и приказа Минфина РФ № 158н:
 * - право правки ограничено полномочиями в КС (неавторизованным — режим чтения);
 * - КБК наследуется из ПГ без правки (несогласие доступно планировщику/согласующему);
 * - единый флаг ч. 24 ст. 22 над списком объектов закупки фиксирует количество = 1;
 * - относительные/абсолютные сроки поставки, приёмка от события/датой, множественные места поставки;
 * - уровень бюджета фиксирован от заказчика, источник финансирования текстом,
 *   аванс без «порядка оплаты», казначейское (полное / только аванса) и банковское сопровождение;
 * - СМП (предупреждение при сочетании «только СМП» и «привлечение СМП»), ст. 31 / ПП 1482 / ПП 2571 / РНП санкции;
 * - составная гарантия качества (3 поля) -> доступ к обеспечению гарантии, все 3 обеспечения с реквизитами + бюджет ч. 13 ст. 44.
 */

interface PurchaseNoteModalProps {
  organizationId: string | number;
  plan: PurchasePlan;
  position: PurchasePlanPosition;
  initialNote?: PurchaseNote;
  onClose: () => void;
  onSaved?: (note: PurchaseNote) => void;
  onSaveAndProceedToNotice?: (note: PurchaseNote) => void;
}

const formatRub = (value: string | number | undefined): string => {
  const num = toNumber(value);
  if (num === null) return "—";
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)} ₽`;
};

export default function PurchaseNoteModal({
  organizationId,
  plan,
  position,
  initialNote,
  onClose,
  onSaved,
  onSaveAndProceedToNotice,
}: PurchaseNoteModalProps) {
  const { bem, fullName } = useUtils();
  const block = bem(styles, "purchase-note-modal");
  const {
    organization,
    employee,
    isLoading: isRoleLoading,
    canEditPurchaseNote,
    canDisagreeKbk,
    canEditCustomerRequisites,
    purchaseNoteDeniedReason,
  } = useMyContractRole();
  const isReadOnly = !canEditPurchaseNote;

  const { data: existingNotes = [] } = usePurchaseNotes(organizationId);
  const { data: orgEmployees = [] } =
    useFetchOrganizationEmployees(organizationId);
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: allObjectDescriptions = [] } =
    useOrganizationObjectDescriptions(organizationId);
  const { data: contractRegistryItems = [] } =
    useContractRegistry(organizationId);
  const objectDescriptions = allObjectDescriptions.filter(
    (item) => item.kind === "object_description",
  );

  const positionNotes = useMemo(
    () => purchaseNotesForPosition(existingNotes, position.id),
    [existingNotes, position.id],
  );

  const createNote = useCreatePurchaseNote();
  const updateNote = useUpdatePurchaseNote();
  const updateOrganization = useUpdateOrganization();

  const [editingNoteId, setEditingNoteId] = useState<
    string | number | undefined
  >(initialNote?.id);
  const [requisitesSyncMessage, setRequisitesSyncMessage] = useState<
    string | null
  >(null);
  const [showNmckWorkspace, setShowNmckWorkspace] = useState(false);
  const [isExportingNmckDocx, setIsExportingNmckDocx] = useState(false);
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const proceedAfterSaveRef = useRef(false);

  const kbkEntries = useMemo(() => positionKbkEntries(position), [position]);
  const positionKbks = positionKbkCodes(position);
  const defaultKbk = position.kbk || positionKbks[0] || "";
  const orgBudgetLevelLabel = organization?.budgetLevel
    ? ORGANIZATION_BUDGET_LEVEL_LABELS[organization.budgetLevel]
    : "Не определён в карточке организации";
  const orgReqs = organization?.procurementRequisites;

  const defaultSecurityAccount: OrganizationSecurityAccount =
    orgReqs?.securityRequisites ?? {
      recipientName: organization?.fullName ?? "",
      recipientInn: organization?.inn ?? "",
      recipientKpp: organization?.kpp ?? "",
    };

  const defaultBudgetAccount: BudgetPart13Art44Requisites =
    orgReqs?.budgetPart13Art44Requisites ?? {
      recipientName: organization?.fullName ?? "",
      recipientInn: organization?.inn ?? "",
      recipientKpp: organization?.kpp ?? "",
    };

  // Подбираем связанное ООЗ из конструктора (если уже заведено для этой позиции/ИКЗ)
  const autoMatchedDesc = objectDescriptions.find(
    (desc) =>
      (position.id !== undefined &&
        desc.positionId !== undefined &&
        String(desc.positionId) === String(position.id)) ||
      (position.identificationCode &&
        desc.ikz === position.identificationCode),
  );

  const formatEmployeeInitiator = (emp: {
    position?: string;
    surname?: string;
    name?: string;
    patronymic?: string;
  }) => `${emp.position ? `${emp.position} — ` : ""}${fullName(emp)}`;

  const defaultInitiatorEmployee = employee?.employee;
  const defaultInitiatorText = defaultInitiatorEmployee
    ? formatEmployeeInitiator(defaultInitiatorEmployee)
    : "";

  const buildDefaults = (note?: PurchaseNote): PurchaseNote => {
    const base = emptyPurchaseNote(organizationId);
    if (note) {
      const legacyItems: PurchaseNoteObjectItem[] =
        note.items && note.items.length > 0
          ? note.items
          : [
              {
                id: "item-1",
                objectDescriptionId: note.objectDescriptionId ?? undefined,
                name: note.subject || position.objectOfPurchase || "",
                okpd2Code: note.okpd2Code || position.okpd2Code || "",
                okpd2Name: note.okpd2Name || position.okpd2Name || "",
                unit: note.unit || "",
                quantity: note.isIndeterminateVolume
                  ? "1"
                  : note.quantity || "1",
                unitPrice: "",
                totalPrice: note.initialMaxPrice || "",
                nationalRegimeType: note.nationalRegimeType ?? "none",
                isSupplyDuringWorks: false,
              },
            ];

      const legacyPlaces =
        note.deliveryPlaces && note.deliveryPlaces.length > 0
          ? note.deliveryPlaces
          : [
              {
                ...emptyDeliveryPlace("1"),
                address: note.deliveryPlace || "",
              },
            ];

      return {
        ...base,
        ...note,
        initiatorEmployeeId: note.initiatorEmployeeId ?? undefined,
        ikz: note.ikz || position.identificationCode || "",
        kbk: defaultKbk || note.kbk || "",
        budgetLevel: note.budgetLevel || orgBudgetLevelLabel,
        authorizedBodyName:
          note.authorizedBodyName || position.authorizedBodyName || "",
        jointOrganizerName:
          note.jointOrganizerName || position.jointOrganizerName || "",
        items: legacyItems,
        deliveryPlaces: legacyPlaces,
        deliveryTermMode:
          note.deliveryTermMode ??
          (note.desiredStartDate || note.desiredEndDate
            ? "absolute"
            : "relative"),
        acceptanceTermMode:
          note.acceptanceTermMode ?? (note.acceptanceDate ? "date" : "event"),
        requiresSmpSubcontracting: hasSmpSubcontractingRequirement(note),
        requiresQualityWarranty: Boolean(
          note.requiresQualityWarranty ||
            note.warrantyTermAndVolume ||
            note.requiresWarrantySecurity,
        ),
        pp2571Positions: note.pp2571Positions ?? [],
        requirementsPart1_1Art31: note.requirementsPart1_1Art31 ?? true,
        pp2571Point4RequirementText:
          note.pp2571Point4RequirementText || base.pp2571Point4RequirementText,
        applicationSecurityRequisites:
          note.applicationSecurityRequisites ?? defaultSecurityAccount,
        applicationSecurityBudgetRequisites:
          note.applicationSecurityBudgetRequisites ?? defaultBudgetAccount,
        contractSecurityRequisites:
          note.contractSecurityRequisites ?? defaultSecurityAccount,
        warrantySecurityRequisites:
          note.warrantySecurityRequisites ?? defaultSecurityAccount,
      };
    }

    const firstQty = autoMatchedDesc?.isIndeterminateVolume
      ? "1"
      : autoMatchedDesc?.quantity || "1";

    return {
      ...base,
      noteNumber: nextPurchaseNoteNumber(existingNotes),
      purchasePlanId: plan.id,
      purchasePlanNumber: plan.planNumber,
      positionId: position.id,
      positionSerialNumber: String(position.serialNumber ?? ""),
      positionUniqueNumber: String(position.uniqueNumber ?? ""),
      ikz: position.identificationCode || "",
      initiatorEmployeeId: defaultInitiatorEmployee?.id,
      initiatorName: defaultInitiatorText,
      objectDescriptionId: autoMatchedDesc?.id ?? undefined,
      authorizedBodyName: position.authorizedBodyName || "",
      jointOrganizerName: position.jointOrganizerName || "",
      kbk: defaultKbk,
      budgetLevel: orgBudgetLevelLabel,
      fundingSource: orgBudgetLevelLabel,
      subject: position.objectOfPurchase || autoMatchedDesc?.title || "",
      isIndeterminateVolume: autoMatchedDesc?.isIndeterminateVolume ?? false,
      items: [
        {
          id: "item-1",
          objectDescriptionId: autoMatchedDesc?.id ?? undefined,
          name: position.objectOfPurchase || autoMatchedDesc?.title || "",
          okpd2Code: position.okpd2Code || autoMatchedDesc?.okpd2Code || "",
          okpd2Name: position.okpd2Name || autoMatchedDesc?.okpd2Name || "",
          unit: autoMatchedDesc?.unit || "",
          quantity: firstQty,
          unitPrice: "",
          totalPrice: String(position.amountTotal ?? ""),
          nationalRegimeType: "none",
          isSupplyDuringWorks: false,
        },
      ],
      okpd2Code: position.okpd2Code || autoMatchedDesc?.okpd2Code || "",
      okpd2Name: position.okpd2Name || autoMatchedDesc?.okpd2Name || "",
      unit: autoMatchedDesc?.unit || "",
      quantity: firstQty,
      initialMaxPrice: String(position.amountTotal ?? ""),
      warrantyTermMonths: autoMatchedDesc?.warrantyTermMonths
        ? Number(autoMatchedDesc.warrantyTermMonths) || 12
        : 12,
      warrantyTermAndVolume: autoMatchedDesc?.warrantyTermMonths
        ? `Гарантийный срок: ${autoMatchedDesc.warrantyTermMonths} мес.${autoMatchedDesc.warrantyRequirements ? ` — ${autoMatchedDesc.warrantyRequirements}` : ""}`
        : "",
      requiresQualityWarranty: Boolean(autoMatchedDesc?.warrantyTermMonths),
      otherRequirements: autoMatchedDesc?.otherRequirements || "",
      applicationSecurityOrder:
        orgReqs?.defaultApplicationSecurityOrder ||
        base.applicationSecurityOrder,
      contractSecurityOrder:
        orgReqs?.defaultContractSecurityOrder || base.contractSecurityOrder,
      warrantySecurityOrder:
        orgReqs?.defaultWarrantySecurityOrder || base.warrantySecurityOrder,
      applicationSecurityRequisites: defaultSecurityAccount,
      applicationSecurityBudgetRequisites: defaultBudgetAccount,
      contractSecurityRequisites: defaultSecurityAccount,
      warrantySecurityRequisites: defaultSecurityAccount,
    };
  };

  const methods = useForm({
    resolver: zodResolver(PurchaseNoteSchema),
    defaultValues: buildDefaults(initialNote),
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = methods;

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const {
    fields: placeFields,
    append: appendPlace,
    remove: removePlace,
  } = useFieldArray({
    control,
    name: "deliveryPlaces",
  });

  // Подставляем реквизиты организации и уровень бюджета после их загрузки (для новой СЗ)
  useEffect(() => {
    if (!organization) return;
    if (organization.budgetLevel) {
      setValue(
        "budgetLevel",
        ORGANIZATION_BUDGET_LEVEL_LABELS[organization.budgetLevel],
      );
    }
    if (initialNote) return;

    const reqs = organization.procurementRequisites;
    if (reqs?.securityRequisites) {
      const curApp = getValues("applicationSecurityRequisites");
      if (!curApp?.settlementAccount && !curApp?.personalAccount) {
        setValue("applicationSecurityRequisites", reqs.securityRequisites);
        setValue("contractSecurityRequisites", reqs.securityRequisites);
        setValue("warrantySecurityRequisites", reqs.securityRequisites);
      }
    }
    if (reqs?.budgetPart13Art44Requisites) {
      const curBud = getValues("applicationSecurityBudgetRequisites");
      if (!curBud?.incomeKbk && !curBud?.treasuryAccount) {
        setValue(
          "applicationSecurityBudgetRequisites",
          reqs.budgetPart13Art44Requisites,
        );
      }
    }
  }, [organization, initialNote, setValue, getValues]);

  // Автоподстановка текущего пользователя как инициатора закупки при создании новой СЗ
  useEffect(() => {
    if (editingNoteId !== undefined) return;
    if (!employee?.employee) return;
    const currentName = getValues("initiatorName");
    if (currentName && currentName.trim()) return;
    setValue("initiatorEmployeeId", employee.employee.id);
    setValue("initiatorName", formatEmployeeInitiator(employee.employee));
  }, [employee, editingNoteId, setValue, getValues]);

  const isEditMode = editingNoteId !== undefined && editingNoteId !== "";
  const isBusy =
    createNote.isPending ||
    updateNote.isPending ||
    updateOrganization.isPending;

  const watchedIndeterminate = Boolean(watch("isIndeterminateVolume"));
  const watchedKbkDisagreement = Boolean(watch("kbkDisagreement"));
  const watchedHasAdvance = Boolean(watch("hasAdvance"));
  const watchedTreasury = Boolean(watch("requiresTreasurySupport"));
  const watchedDeliveryMode = watch("deliveryTermMode") ?? "relative";
  const watchedAcceptanceMode = watch("acceptanceTermMode") ?? "event";
  const watchedStatus = (watch("status") ?? "draft") as PurchaseNoteStatus;
  const watchedPlacingWay = watch("placingWayCode") || "OKP20";
  const watchedItems = (watch("items") ?? []) as PurchaseNoteObjectItem[];
  const auctionValidation = validatePlacingWayAgainstAuctionList(
    watchedPlacingWay,
    watchedItems.map((item) => ({
      code: item.okpd2Code,
      name: item.name,
    })),
    okpd2Refs,
  );

  const watchedAdvantageSmp = Boolean(watch("advantageSmpPart3Art30"));
  const watchedSmpSubcontracting = Boolean(watch("requiresSmpSubcontracting"));
  const smpConflictWarning = watchedAdvantageSmp && watchedSmpSubcontracting;

  const watchedUnifiedPart1Art31 = watch("unifiedRequirementsPart1Art31") !== false;
  const watchedRequirementP1Part1Art31 = Boolean(watch("requirementP1Part1Art31"));
  const watchedPart1_1Art31 = Boolean(watch("requirementsPart1_1Art31"));
  const watchedPp1482Facilities = Boolean(watch("pp1482ProductionFacilities"));
  const watchedPp1482Finance = Boolean(watch("pp1482FinancialStability"));
  const watchedPp1482Specialists = Boolean(watch("pp1482Specialists"));
  const watchedSanctionsRnp = Boolean(watch("sanctionsRnpRequirement"));
  const rnpConflictWarning = watchedPart1_1Art31 && watchedSanctionsRnp;

  const watchedPart2Art31 = Boolean(watch("additionalRequirementsPart2Art31"));
  const watchedPart2_1Art31 = Boolean(watch("requirementsPart2_1Art31"));
  const watchedPp2571Point4 = Boolean(watch("pp2571Point4Requirement"));
  const watchedPp2571 = watch("pp2571Positions") ?? [];

  const watchedAppSec = Boolean(watch("requiresApplicationSecurity"));
  const watchedContractSec = Boolean(watch("requiresContractSecurity"));
  const watchedQualityWarranty = Boolean(watch("requiresQualityWarranty"));
  const watchedWarrantySec = Boolean(watch("requiresWarrantySecurity"));

  const watchedInitiatorEmployeeId = watch("initiatorEmployeeId");
  const watchedInitiatorName = watch("initiatorName") || "";
  const watchedNmckFileName = watch("nmckFileName") || "";
  const watchedNmckFileUpdatedAt = watch("nmckFileUpdatedAt") || "";
  const watchedNmckRequestStatus = watch("nmckRequestStatus") ?? "none";
  const rawWatchedNmckOffers = watch("nmckOffers") as
    | NmckMarketOffer[]
    | undefined;
  const watchedNmckCalculation = watch("nmckCalculation") as
    | NmckCalculationRecord
    | undefined;

  const percent = Number(watch("smpRequiredPercent"));
  const price = Number.parseFloat(String(watch("initialMaxPrice") ?? ""));
  const requiredAmount =
    watchedSmpSubcontracting &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(percent) &&
    percent > 0
      ? Math.round(price * percent) / 100
      : null;

  // Единый переключатель «невозможно определить количество» синхронизирует quantity = "1" у всех объектов
  const handleToggleIndeterminate = (checked: boolean) => {
    if (isReadOnly) return;
    setValue("isIndeterminateVolume", checked);
    if (checked) {
      const currentItems = getValues("items") ?? [];
      currentItems.forEach((_, idx) => {
        setValue(`items.${idx}.quantity`, "1");
      });
      setValue("quantity", "1");
    }
  };

  // Привязка структурированного ООЗ к конкретному объекту закупки
  const handleSelectItemOoz = (index: number, selectedId: string) => {
    if (isReadOnly) return;
    setValue(`items.${index}.objectDescriptionId`, selectedId || undefined);
    const found = objectDescriptions.find(
      (desc) => String(desc.id) === selectedId,
    );
    if (!found) return;

    setValue(`items.${index}.name`, found.title);
    if (found.okpd2Code) setValue(`items.${index}.okpd2Code`, found.okpd2Code);
    if (found.okpd2Name) setValue(`items.${index}.okpd2Name`, found.okpd2Name);
    if (found.unit) setValue(`items.${index}.unit`, found.unit);
    if (!watchedIndeterminate && found.quantity) {
      setValue(`items.${index}.quantity`, found.quantity);
    }

    if (index === 0) {
      setValue("objectDescriptionId", selectedId || undefined);
      if (!watch("subject")?.trim()) {
        setValue("subject", found.title);
      }
      if (found.otherRequirements && !watch("otherRequirements")) {
        setValue("otherRequirements", found.otherRequirements);
      }
    }
  };

  // Гарантия качества даёт право установить обеспечение гарантийных обязательств
  const handleToggleQualityWarranty = (checked: boolean) => {
    if (isReadOnly) return;
    setValue("requiresQualityWarranty", checked);
    if (!checked) {
      setValue("requiresWarrantySecurity", false);
    }
  };

  const togglePp2571 = (pos: string) => {
    if (isReadOnly) return;
    const next = watchedPp2571.includes(pos)
      ? watchedPp2571.filter((item) => item !== pos)
      : [...watchedPp2571, pos];
    setValue("pp2571Positions", next);
  };

  const handleApplyOrgRequisites = () => {
    if (isReadOnly || !organization) return;
    setValue("applicationSecurityRequisites", defaultSecurityAccount);
    setValue("contractSecurityRequisites", defaultSecurityAccount);
    setValue("warrantySecurityRequisites", defaultSecurityAccount);
    setValue("applicationSecurityBudgetRequisites", defaultBudgetAccount);
    if (orgReqs?.defaultApplicationSecurityOrder) {
      setValue(
        "applicationSecurityOrder",
        orgReqs.defaultApplicationSecurityOrder,
      );
    }
    if (orgReqs?.defaultContractSecurityOrder) {
      setValue("contractSecurityOrder", orgReqs.defaultContractSecurityOrder);
    }
    if (orgReqs?.defaultWarrantySecurityOrder) {
      setValue("warrantySecurityOrder", orgReqs.defaultWarrantySecurityOrder);
    }
    setRequisitesSyncMessage(
      "Реквизиты и порядки подставлены из карточки заказчика.",
    );
  };

  const handleSaveOrgRequisites = () => {
    if (!canEditCustomerRequisites || isReadOnly || !organization?.id) return;
    const securitySource =
      getValues("contractSecurityRequisites") ??
      getValues("applicationSecurityRequisites") ??
      defaultSecurityAccount;
    const budgetSource =
      getValues("applicationSecurityBudgetRequisites") ?? defaultBudgetAccount;
    const authorName = employee?.employee
      ? fullName(employee.employee)
      : undefined;

    updateOrganization.mutate(
      {
        id: organization.id,
        patch: {
          procurementRequisites: {
            securityRequisites: securitySource,
            budgetPart13Art44Requisites: budgetSource,
            defaultApplicationSecurityOrder: getValues(
              "applicationSecurityOrder",
            ),
            defaultContractSecurityOrder: getValues("contractSecurityOrder"),
            defaultWarrantySecurityOrder: getValues("warrantySecurityOrder"),
            updatedAt: new Date().toISOString().slice(0, 10),
            updatedByName: authorName,
          },
        },
      },
      {
        onSuccess: () => {
          setRequisitesSyncMessage(
            "Реквизиты сохранены и актуализированы в карточке организации.",
          );
        },
      },
    );
  };

  const handleSwitchToCreateNew = () => {
    if (isReadOnly) return;
    setEditingNoteId(undefined);
    reset(buildDefaults(undefined));
  };

  const handleSelectExistingNote = (note: PurchaseNote) => {
    setEditingNoteId(note.id);
    reset(buildDefaults(note));
  };

  const handleSelectInitiator = (selectedValue: string) => {
    if (isReadOnly) return;
    if (!selectedValue) {
      setValue("initiatorEmployeeId", undefined);
      setValue("initiatorName", "");
      return;
    }
    const found = orgEmployees.find(
      (emp) => String(emp.id) === selectedValue,
    );
    if (found) {
      setValue("initiatorEmployeeId", found.id);
      setValue("initiatorName", formatEmployeeInitiator(found), {
        shouldValidate: true,
      });
    } else {
      setValue("initiatorEmployeeId", undefined);
      setValue("initiatorName", selectedValue, { shouldValidate: true });
    }
  };

  const handleExport = async (format: "docx" | "pdf") => {
    setExportFormat(format);
    setExportError(null);
    try {
      const snapshot = {
        ...(getValues() as PurchaseNote),
        id: editingNoteId,
        kbk: defaultKbk || getValues("kbk"),
      };
      const context = { note: snapshot, organization, plan, position };
      if (format === "docx") {
        await exportPurchaseNoteToDocx(context);
      } else {
        await exportPurchaseNoteToPdf(context);
      }
    } catch (err) {
      setExportError(
        `Не удалось выгрузить СЗ в ${format.toUpperCase()}: ${String(err)}`,
      );
    } finally {
      setExportFormat(null);
    }
  };

  const handleNmckFileChange = (files: FileList | null) => {
    if (isReadOnly || !files || files.length === 0) return;
    const file = files[0];
    setValue("nmckFileName", file.name);
    setValue("nmckFileUpdatedAt", new Date().toISOString().slice(0, 10));
    if (watch("nmckRequestStatus") === "requested") {
      setValue("nmckRequestStatus", "received");
    }
  };

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function onSubmit(data: PurchaseNote) {
    if (isReadOnly) {
      proceedAfterSaveRef.current = false;
      return;
    }

    const shouldProceed = proceedAfterSaveRef.current;
    proceedAfterSaveRef.current = false;

    const firstItem = data.items?.[0];
    const normalizedItems = (data.items ?? []).map((it) => ({
      ...it,
      quantity: data.isIndeterminateVolume ? "1" : it.quantity || "1",
    }));

    const placeStrings = (data.deliveryPlaces ?? [])
      .map((place) => formatDeliveryAddress(place))
      .filter(Boolean);

    const actorName = employee?.employee ? fullName(employee.employee) : "";
    const statusChanged =
      initialNote && data.status && data.status !== initialNote.status;

    const normalized: PurchaseNote = {
      ...data,
      kbk: defaultKbk || data.kbk,
      kbkDisagreementAuthor:
        data.kbkDisagreement && employee?.employee
          ? fullName(employee.employee)
          : data.kbkDisagreementAuthor,
      items: normalizedItems,
      objectDescriptionId:
        firstItem?.objectDescriptionId ?? data.objectDescriptionId,
      okpd2Code: firstItem?.okpd2Code || data.okpd2Code || "",
      okpd2Name: firstItem?.okpd2Name || data.okpd2Name || "",
      unit: firstItem?.unit || data.unit || "",
      quantity: data.isIndeterminateVolume
        ? "1"
        : firstItem?.quantity || data.quantity || "1",
      nationalRegimeType:
        firstItem?.nationalRegimeType || data.nationalRegimeType || "none",
      deliveryPlace: placeStrings.join("; ") || data.deliveryPlace || "",
      treasurySupportType: data.requiresTreasurySupport
        ? data.treasurySupportType || "full"
        : "",
      requiresWarrantySecurity: data.requiresQualityWarranty
        ? Boolean(data.requiresWarrantySecurity)
        : false,
      smpRequiredPercent: data.requiresSmpSubcontracting
        ? data.smpRequiredPercent
        : undefined,
      approvalUpdatedAt:
        statusChanged || !data.approvalUpdatedAt
          ? new Date().toISOString().slice(0, 10)
          : data.approvalUpdatedAt,
      approvalUpdatedBy:
        statusChanged && actorName
          ? actorName
          : data.approvalUpdatedBy || actorName || undefined,
    };

    const handleAfterSave = (saved: PurchaseNote) => {
      onSaved?.(saved);
      if (shouldProceed && onSaveAndProceedToNotice) {
        onSaveAndProceedToNotice(saved);
      } else {
        onClose();
      }
    };

    if (isEditMode && editingNoteId !== undefined) {
      updateNote.mutate(
        { id: editingNoteId, ...normalized },
        { onSuccess: handleAfterSave },
      );
    } else {
      createNote.mutate(normalized, { onSuccess: handleAfterSave });
    }
  }

  // Текущее значение select инициатора (либо id сотрудника из штатки, либо текстовый фолбэк)
  const matchedInitiatorByText =
    watchedInitiatorEmployeeId !== undefined &&
    watchedInitiatorEmployeeId !== null
      ? orgEmployees.find(
          (emp) => String(emp.id) === String(watchedInitiatorEmployeeId),
        )
      : orgEmployees.find(
          (emp) =>
            formatEmployeeInitiator(emp) === watchedInitiatorName ||
            fullName(emp) === watchedInitiatorName,
        );
  const initiatorSelectValue = matchedInitiatorByText
    ? String(matchedInitiatorByText.id)
    : watchedInitiatorName;

  const firstItemQty = Number.parseFloat(
    watchedIndeterminate ? "1" : watch("items.0.quantity") || "1",
  );
  const firstItemUnit = watch("items.0.unit") || "ед.";

  const savedMarketEvaluation = useMemo(() => {
    if (
      !watchedNmckCalculation ||
      watchedNmckCalculation.method !== "market_analysis"
    ) {
      return null;
    }
    return calculateMarketNmck({
      quantity: watchedNmckCalculation.quantity,
      calculationDate: watchedNmckCalculation.calculationDate,
      applyAutoInflation: watchedNmckCalculation.applyAutoInflation,
      annualInflationPercent: watchedNmckCalculation.annualInflationPercent,
      selectedBasis: watchedNmckCalculation.selectedBasis,
      offers: watchedNmckCalculation.offers,
    });
  }, [watchedNmckCalculation]);

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  const inlineInitialNmckRecord: NmckCalculationRecord | null = useMemo(() => {
    if (watchedNmckCalculation) return watchedNmckCalculation;
    if (!rawWatchedNmckOffers || rawWatchedNmckOffers.length === 0) return null;
    const legacyResult = calculateMarketNmck({
      quantity: firstItemQty > 0 ? firstItemQty : 1,
      calculationDate: todayIso,
      offers: rawWatchedNmckOffers,
    });
    return {
      method: "market_analysis",
      calculatedAt: todayIso,
      calculationDate: todayIso,
      subject: watch("subject") || position.objectOfPurchase || "",
      okpd2Code: watch("items.0.okpd2Code") || position.okpd2Code || "",
      okpd2Name: watch("items.0.okpd2Name") || position.okpd2Name || "",
      quantity: String(firstItemQty > 0 ? firstItemQty : 1),
      unit: firstItemUnit,
      offers: rawWatchedNmckOffers,
      activeCount: legacyResult.activeCount,
      meanUnitPrice: legacyResult.meanUnitPrice,
      minUnitPrice: legacyResult.minUnitPrice,
      maxUnitPrice: legacyResult.maxUnitPrice,
      stdDev: legacyResult.stdDev,
      cvPercent: legacyResult.cvPercent,
      isHomogeneous: legacyResult.isHomogeneous,
      nmckMinTotal: legacyResult.nmckMinTotal,
      nmckTotal: legacyResult.nmckTotal,
    };
  }, [watchedNmckCalculation, rawWatchedNmckOffers, firstItemQty, firstItemUnit, position, todayIso, watch]);

  const handleExportSavedNmckDocx = async () => {
    if (!watchedNmckCalculation) return;
    setIsExportingNmckDocx(true);
    try {
      await exportNmckCalculationToDocx({
        title: `ОБОСНОВАНИЕ НМЦК К СЗ № ${watch("noteNumber") || "б/н"}`,
        organizationName:
          organization?.shortName || organization?.fullName || "",
        ikz: watch("ikz") || position.identificationCode || "",
        record: watchedNmckCalculation,
        marketResult: savedMarketEvaluation ?? undefined,
        fileName: `Обоснование_НМЦК_СЗ_${watch("noteNumber") || "черновик"}.docx`,
      });
    } finally {
      setIsExportingNmckDocx(false);
    }
  };

  return (
    <form className={block()} onSubmit={handleSubmit(onSubmit)}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <button
            type="button"
            className={block("back")}
            onClick={onClose}
          >
            ← К плану-графику
          </button>
          <div className={block("status-row")}>
            <h1 className={block("title")}>
              {isEditMode
                ? `Потребность (СЗ № ${watch("noteNumber") || editingNoteId})`
                : "Сформировать потребность (служебная записка по ПГ)"}
            </h1>
            <PurchaseNoteStatusBadge status={watchedStatus} />
          </div>
          <p className={block("caption")}>
            Основание: план-график {plan.planNumber} · запись №{" "}
            {position.serialNumber || "—"} · уник. №{" "}
            {position.uniqueNumber || "—"} · ИКЗ{" "}
            {position.identificationCode || "не сформирован"}
          </p>
        </div>

        <div className={block("header-actions")}>
          <button
            type="button"
            className={block("mode-btn")}
            disabled={exportFormat !== null}
            onClick={() => handleExport("docx")}
            title="Выгрузить сформированную СЗ в Microsoft Word (.docx) для подписания вне системы"
          >
            <FileSpreadsheet size={14} aria-hidden="true" />{" "}
            {exportFormat === "docx" ? "Формирование…" : "Выгрузить .docx"}
          </button>
          <button
            type="button"
            className={block("mode-btn")}
            disabled={exportFormat !== null}
            onClick={() => handleExport("pdf")}
            title="Выгрузить сформированную СЗ в PDF (.pdf) для подписания вне системы"
          >
            <FileText size={14} aria-hidden="true" />{" "}
            {exportFormat === "pdf" ? "Формирование…" : "Выгрузить .pdf"}
          </button>
          {isEditMode && (
            <button
              type="button"
              className={block("mode-btn")}
              disabled={isReadOnly || isBusy}
              onClick={handleSwitchToCreateNew}
            >
              + Новая СЗ по позиции
            </button>
          )}
        </div>
      </header>

      {exportError && (
        <div className={block("alert-warning")} role="alert">
          {exportError}
        </div>
      )}

      {positionNotes.length > 1 && (
        <div className={block("notes-switcher")}>
          <span className={block("label")}>СЗ по данной позиции ПГ:</span>
          {positionNotes.map((n) => (
            <button
              key={String(n.id ?? n.noteNumber)}
              type="button"
              className={block(
                "note-pill",
                String(n.id) === String(editingNoteId) ? ["active"] : [],
              )}
              onClick={() => handleSelectExistingNote(n)}
            >
              <span>СЗ № {n.noteNumber || n.id}</span>
              <PurchaseNoteStatusBadge status={n.status} compact />
            </button>
          ))}
        </div>
      )}

      {isRoleLoading && (
        <div className={block("readonly-banner", ["loading"])} role="status">
          Проверяем права пользователя в контрактной службе…
        </div>
      )}

      {!isRoleLoading && isReadOnly && purchaseNoteDeniedReason && (
        <div className={block("readonly-banner")} role="status">
          <strong>Режим только для чтения (нет прав по КС):</strong>{" "}
          {purchaseNoteDeniedReason}
        </div>
      )}

      {/* 1. Реквизиты потребности, инициатор из штата и статус согласования */}
      <fieldset className={block("section")} disabled={isReadOnly}>
        <legend>1. Реквизиты потребности и согласование</legend>
        <div className={block("grid")}>
          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-number">
              Номер СЗ *
            </label>
            <input
              id="note-number"
              className={block("input")}
              {...register("noteNumber")}
            />
            {errorText("noteNumber") && (
              <span className={block("error")}>
                {errorText("noteNumber")}
              </span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-date">
              Дата СЗ *
            </label>
            <input
              id="note-date"
              className={block("input")}
              type="date"
              {...register("noteDate")}
            />
            {errorText("noteDate") && (
              <span className={block("error")}>{errorText("noteDate")}</span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-initiator">
              Инициатор закупки (из списка сотрудников организации) *
            </label>
            <select
              id="note-initiator"
              className={block("select")}
              value={initiatorSelectValue}
              onChange={(e) => handleSelectInitiator(e.target.value)}
            >
              <option value="">— Выберите сотрудника-инициатора —</option>
              {orgEmployees.map((emp) => {
                const label = formatEmployeeInitiator(emp);
                const isMe =
                  defaultInitiatorEmployee &&
                  String(emp.id) === String(defaultInitiatorEmployee.id);
                return (
                  <option key={String(emp.id)} value={String(emp.id)}>
                    {label}
                    {isMe ? " (текущий пользователь)" : ""}
                  </option>
                );
              })}
              {!matchedInitiatorByText && watchedInitiatorName && (
                <option value={watchedInitiatorName}>
                  {watchedInitiatorName} (введено ранее)
                </option>
              )}
            </select>
            {errorText("initiatorName") && (
              <span className={block("error")}>
                {errorText("initiatorName")}
              </span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-approval-status">
              Статус согласования СЗ
            </label>
            <select
              id="note-approval-status"
              className={block("select")}
              {...register("status")}
            >
              {PURCHASE_NOTE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {PURCHASE_NOTE_STATUS_META[st].label}
                </option>
              ))}
            </select>
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="note-approval-comment">
              Резолюция / комментарий согласования
            </label>
            <input
              id="note-approval-comment"
              className={block("input")}
              {...register("approvalComment")}
              placeholder="Например: согласовано без замечаний / вернуть на доработку НМЦК…"
            />
          </div>
        </div>
      </fieldset>

      {/* 2. Предмет закупки и множество объектов закупки */}
      <fieldset className={block("section")} disabled={isReadOnly}>
        <legend>2. Предмет и объекты закупки (ст. 33, ч. 24 ст. 22)</legend>
        <div className={block("grid")}>
          {/* Предмет закупки — самое верхнее поле */}
          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="note-subject">
              Предмет закупки *
            </label>
            <input
              id="note-subject"
              className={block("input")}
              {...register("subject")}
            />
            {errorText("subject") && (
              <span className={block("error")}>{errorText("subject")}</span>
            )}
          </div>

          {/* Флаг невозможности определить количество — строго над объектами */}
          <div className={block("field", ["wide"])}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                checked={watchedIndeterminate}
                disabled={isReadOnly}
                onChange={(e) => handleToggleIndeterminate(e.target.checked)}
              />
              <span>
                Невозможно определить количество/объём товаров, работ, услуг (ч.
                24 ст. 22 Закона № 44-ФЗ — во всех объектах количество
                фиксируется равным 1)
              </span>
            </label>
          </div>

          {/* Список объектов закупки */}
          <div className={block("field", ["wide"])}>
            {itemFields.map((item, idx) => {
              const itemDescId = watch(`items.${idx}.objectDescriptionId`);
              const itemOkpd2 = watch(`items.${idx}.okpd2Code`) || "";
              const itemUnit = watch(`items.${idx}.unit`) || "";

              return (
                <div key={item.id} className={block("item-card")}>
                  <div className={block("item-card-header")}>
                    <span>Объект закупки № {idx + 1}</span>
                    {itemFields.length > 1 && (
                      <button
                        type="button"
                        className={block("danger-btn")}
                        disabled={isReadOnly}
                        onClick={() => removeItem(idx)}
                      >
                        Удалить объект
                      </button>
                    )}
                  </div>

                  <div className={block("grid")}>
                    <div className={block("field", ["wide"])}>
                      <div className={block("label-row")}>
                        <label
                          className={block("label")}
                          htmlFor={`note-item-ooz-${idx}`}
                        >
                          Связанное структурированное ООЗ (из
                          /norming-requirements)
                        </label>
                        <Link
                          to="/norming-requirements"
                          className={block("inline-link")}
                        >
                          Открыть конструктор ООЗ (/norming-requirements)
                          <ExternalLink size={12} aria-hidden="true" />
                        </Link>
                      </div>
                      <select
                        id={`note-item-ooz-${idx}`}
                        className={block("select")}
                        value={
                          itemDescId !== null && itemDescId !== undefined
                            ? String(itemDescId)
                            : ""
                        }
                        onChange={(e) =>
                          handleSelectItemOoz(idx, e.target.value)
                        }
                      >
                        <option value="">
                          — Не выбрано (заполнить вручную / позже) —
                        </option>
                        {objectDescriptions.map((desc) => (
                          <option key={String(desc.id)} value={String(desc.id)}>
                            {desc.title} ({desc.okpd2Code}
                            {desc.ktruCode ? ` · КТРУ ${desc.ktruCode}` : ""})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={block("field", ["wide"])}>
                      <label
                        className={block("label")}
                        htmlFor={`note-item-name-${idx}`}
                      >
                        Наименование объекта закупки *
                      </label>
                      <input
                        id={`note-item-name-${idx}`}
                        className={block("input")}
                        {...register(`items.${idx}.name`)}
                      />
                    </div>

                    <div className={block("field")}>
                      <span className={block("label")}>Код ОКПД2</span>
                      <Okpd2Select
                        code={itemOkpd2}
                        disabled={isReadOnly}
                        onSelect={(selected) => {
                          setValue(
                            `items.${idx}.okpd2Code`,
                            selected?.code ?? "",
                          );
                          setValue(
                            `items.${idx}.okpd2Name`,
                            selected?.name ?? "",
                          );
                        }}
                      />
                      {itemOkpd2 &&
                        checkOkpd2AuctionList(itemOkpd2, okpd2Refs)
                          .inAuctionList && (
                          <span className={block("hint")}>
                            Код входит в аукционный перечень (РП РФ № 471-р) —
                            обязателен электронный аукцион.
                          </span>
                        )}
                    </div>

                    <div className={block("field")}>
                      <span className={block("label")}>
                        Единица измерения (ОКЕИ)
                      </span>
                      <OkeiSelect
                        value={itemUnit}
                        disabled={isReadOnly}
                        onChange={(val) => setValue(`items.${idx}.unit`, val)}
                      />
                    </div>

                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor={`note-item-qty-${idx}`}
                      >
                        Количество / объём
                      </label>
                      <input
                        id={`note-item-qty-${idx}`}
                        className={block("input")}
                        disabled={isReadOnly || watchedIndeterminate}
                        value={
                          watchedIndeterminate
                            ? "1"
                            : (watch(`items.${idx}.quantity`) ?? "")
                        }
                        onChange={(e) =>
                          setValue(`items.${idx}.quantity`, e.target.value)
                        }
                        placeholder="1"
                      />
                    </div>

                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor={`note-item-price-${idx}`}
                      >
                        Цена за единицу, руб.
                      </label>
                      <input
                        id={`note-item-price-${idx}`}
                        className={block("input")}
                        {...register(`items.${idx}.unitPrice`)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor={`note-item-total-${idx}`}
                      >
                        Сумма по объекту, руб.
                      </label>
                      <input
                        id={`note-item-total-${idx}`}
                        className={block("input")}
                        {...register(`items.${idx}.totalPrice`)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor={`note-item-regime-${idx}`}
                      >
                        Национальный режим (ст. 14 44-ФЗ)
                      </label>
                      <select
                        id={`note-item-regime-${idx}`}
                        className={block("select")}
                        {...register(`items.${idx}.nationalRegimeType`)}
                      >
                        {NATIONAL_REGIME_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={block("field", ["wide"])}>
                      <label className={block("checkbox")}>
                        <input
                          type="checkbox"
                          {...register(`items.${idx}.isSupplyDuringWorks`)}
                        />
                        <span>
                          Товар поставляется при выполнении работ / оказании
                          услуг
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className={block("link-btn")}
              disabled={isReadOnly}
              onClick={() =>
                appendItem({
                  id: `item-${Date.now()}`,
                  objectDescriptionId: undefined,
                  name: "",
                  okpd2Code: "",
                  okpd2Name: "",
                  unit: "",
                  quantity: "1",
                  unitPrice: "",
                  totalPrice: "",
                  nationalRegimeType: "none",
                  isSupplyDuringWorks: false,
                })
              }
            >
              + Добавить объект закупки
            </button>
          </div>
        </div>
      </fieldset>

      {/* 3. Способ, относительные/абсолютные сроки поставки, приёмка, места поставки */}
      <fieldset className={block("section")} disabled={isReadOnly}>
        <legend>
          3. Способ определения поставщика, сроки поставки, приёмки и места
        </legend>
        <div className={block("grid")}>
          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-placing-way">
              Способ определения поставщика
            </label>
            <select
              id="note-placing-way"
              className={block("select")}
              {...register("placingWayCode")}
            >
              {PLACING_WAYS_ALL.map((way) => (
                <option key={way.code} value={way.code}>
                  {way.label}
                </option>
              ))}
            </select>
            {auctionValidation.hasViolation &&
              auctionValidation.warningMessage && (
                <div className={block("alert-warning")} role="alert">
                  <div>{auctionValidation.warningMessage}</div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      className={block("link-btn")}
                      onClick={() => setValue("placingWayCode", "EA20")}
                    >
                      Установить электронный аукцион (EA20)
                    </button>
                  )}
                </div>
              )}
            {!auctionValidation.hasViolation &&
              auctionValidation.infoMessage && (
                <span className={block("hint")}>
                  {auctionValidation.infoMessage}
                </span>
              )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-proc-type">
              Направление / тип закупки
            </label>
            <select
              id="note-proc-type"
              className={block("select")}
              {...register("procurementType")}
            >
              {DEFAULT_PROCUREMENT_TYPES.map((typeLabel) => (
                <option key={typeLabel} value={typeLabel}>
                  {typeLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Сроки поставки: относительные или абсолютные */}
          <div className={block("field", ["wide"])}>
            <span className={block("label")}>Срок поставки / исполнения</span>
            <div className={block("subbox")}>
              <div className={block("radio-row")}>
                <label className={block("radio")}>
                  <input
                    type="radio"
                    value="relative"
                    checked={watchedDeliveryMode === "relative"}
                    onChange={() => setValue("deliveryTermMode", "relative")}
                  />
                  <span>Относительный срок (в днях от даты заключения)</span>
                </label>
                <label className={block("radio")}>
                  <input
                    type="radio"
                    value="absolute"
                    checked={watchedDeliveryMode === "absolute"}
                    onChange={() => setValue("deliveryTermMode", "absolute")}
                  />
                  <span>Абсолютный срок (календарными датами)</span>
                </label>
              </div>

              {watchedDeliveryMode === "relative" ? (
                <div className={block("grid")}>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-start-offset"
                    >
                      Начало через (дней с даты заключения контракта)
                    </label>
                    <input
                      id="note-start-offset"
                      type="number"
                      min={0}
                      className={block("input")}
                      {...register("deliveryStartOffsetDays")}
                    />
                  </div>
                  <div className={block("field")}>
                    <label className={block("label")} htmlFor="note-exec-days">
                      Срок поставки / выполнения (дней)
                    </label>
                    <input
                      id="note-exec-days"
                      type="number"
                      min={0}
                      className={block("input")}
                      {...register("executionTermDays")}
                    />
                  </div>
                </div>
              ) : (
                <div className={block("grid")}>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-start-date"
                    >
                      Дата начала исполнения
                    </label>
                    <input
                      id="note-start-date"
                      type="date"
                      className={block("input")}
                      {...register("desiredStartDate")}
                    />
                  </div>
                  <div className={block("field")}>
                    <label className={block("label")} htmlFor="note-end-date">
                      Дата окончания исполнения
                    </label>
                    <input
                      id="note-end-date"
                      type="date"
                      className={block("input")}
                      {...register("desiredEndDate")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Сроки приёмки: от события или датой */}
          <div className={block("field", ["wide"])}>
            <span className={block("label")}>Срок приёмки (ст. 94 44-ФЗ)</span>
            <div className={block("subbox")}>
              <div className={block("radio-row")}>
                <label className={block("radio")}>
                  <input
                    type="radio"
                    value="event"
                    checked={watchedAcceptanceMode === "event"}
                    onChange={() => setValue("acceptanceTermMode", "event")}
                  />
                  <span>От события (рабочих дней после наступления)</span>
                </label>
                <label className={block("radio")}>
                  <input
                    type="radio"
                    value="date"
                    checked={watchedAcceptanceMode === "date"}
                    onChange={() => setValue("acceptanceTermMode", "date")}
                  />
                  <span>Конкретной датой</span>
                </label>
              </div>

              {watchedAcceptanceMode === "event" ? (
                <div className={block("grid")}>
                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="note-accept-event"
                    >
                      Событие, от которого исчисляется срок приёмки
                    </label>
                    <input
                      id="note-accept-event"
                      className={block("input")}
                      {...register("acceptanceEventBase")}
                      placeholder="с даты поступления заказчику документа о приёмке в ЕИС"
                    />
                  </div>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-accept-days"
                    >
                      Срок приёмки (рабочих дней)
                    </label>
                    <input
                      id="note-accept-days"
                      type="number"
                      min={1}
                      className={block("input")}
                      {...register("acceptanceTermDays")}
                    />
                  </div>
                </div>
              ) : (
                <div className={block("grid")}>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-accept-date"
                    >
                      Дата окончания приёмки
                    </label>
                    <input
                      id="note-accept-date"
                      type="date"
                      className={block("input")}
                      {...register("acceptanceDate")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Множественные места поставки — тот же каскад, что в Извещении */}
          <div className={block("field", ["wide"])}>
            <span className={block("label")}>
              Места поставки товара, выполнения работы или оказания услуги
            </span>
            {placeFields.map((placeField, pIndex) => {
              const currentPlace =
                watch(`deliveryPlaces.${pIndex}`) ?? placeField;

              return (
                <div key={placeField.id} className={block("item-card")}>
                  <div className={block("item-card-header")}>
                    <span>Место поставки № {pIndex + 1}</span>
                    {placeFields.length > 1 && (
                      <button
                        type="button"
                        className={block("danger-btn")}
                        disabled={isReadOnly}
                        onClick={() => removePlace(pIndex)}
                      >
                        Удалить место поставки
                      </button>
                    )}
                  </div>
                  <AddressCascade
                    idPrefix={`sz-delivery-place-${pIndex}`}
                    disabled={isReadOnly}
                    value={currentPlace}
                    onChange={(next) =>
                      setValue(
                        `deliveryPlaces.${pIndex}`,
                        { ...currentPlace, ...next },
                        { shouldValidate: true },
                      )
                    }
                  />
                </div>
              );
            })}

            <button
              type="button"
              className={block("link-btn")}
              disabled={isReadOnly}
              onClick={() =>
                appendPlace(emptyDeliveryPlace(String(Date.now())))
              }
            >
              + Добавить место поставки товара, выполнения работы или оказания
              услуги
            </button>
          </div>
        </div>
      </fieldset>

      {/* 4. Финансирование, КБК по годам, НМЦК, аванс и сопровождение */}
      <fieldset className={block("section")} disabled={isReadOnly}>
        <legend>
          4. Финансирование, НМЦК, аванс и сопровождение (ст. 22, 34)
        </legend>
        <div className={block("grid")}>
          {/* КБК + разбивка финансирования по годам из ПГ (справочно) + запрос на изменение КБК/КВР */}
          <div className={block("field", ["wide"])}>
            <div className={block("kbk-box")}>
              <div className={block("label-row")}>
                <strong>
                  КБК и разбивка финансирования по годам (из плана-графика,
                  информационно)
                </strong>
                <span className={block("mono")}>
                  Основной КБК: {defaultKbk || watch("kbk") || "не указан в ПГ"}
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className={block("kbk-table")}>
                  <thead>
                    <tr>
                      <th>КБК</th>
                      <th>Всего</th>
                      <th>Текущий год</th>
                      <th>1-й год пл. пер.</th>
                      <th>2-й год пл. пер.</th>
                      <th>Последующие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbkEntries.length > 0 ? (
                      kbkEntries.map((entry, idx) => (
                        <tr key={`${entry.kbk ?? "kbk"}-${idx}`}>
                          <td className={block("mono")}>
                            {entry.kbk || "не указан"}
                          </td>
                          <td>
                            {formatRub(
                              entry.amountTotal ??
                                (kbkEntries.length === 1
                                  ? position.amountTotal
                                  : undefined),
                            )}
                          </td>
                          <td>
                            {formatRub(
                              entry.amountCurrentYear ??
                                (kbkEntries.length === 1
                                  ? position.amountCurrentYear
                                  : undefined),
                            )}
                          </td>
                          <td>
                            {formatRub(
                              entry.amountPlanPeriodFirstYear ??
                                (kbkEntries.length === 1
                                  ? position.amountPlanPeriodFirstYear
                                  : undefined),
                            )}
                          </td>
                          <td>
                            {formatRub(
                              entry.amountPlanPeriodSecondYear ??
                                (kbkEntries.length === 1
                                  ? position.amountPlanPeriodSecondYear
                                  : undefined),
                            )}
                          </td>
                          <td>
                            {formatRub(
                              entry.amountSubsequentYears ??
                                (kbkEntries.length === 1
                                  ? position.amountSubsequentYears
                                  : undefined),
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={block("mono")}>
                          {defaultKbk || "не указан в ПГ"}
                        </td>
                        <td>{formatRub(position.amountTotal)}</td>
                        <td>{formatRub(position.amountCurrentYear)}</td>
                        <td>{formatRub(position.amountPlanPeriodFirstYear)}</td>
                        <td>{formatRub(position.amountPlanPeriodSecondYear)}</td>
                        <td>{formatRub(position.amountSubsequentYears)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  disabled={isReadOnly || !canDisagreeKbk}
                  {...register("kbkDisagreement")}
                />
                <span>
                  Запрос на изменение КБК (КВР) — например, если бухгалтерия
                  указала, что это не ОС или по выбранному КВР нельзя провести
                  расход
                </span>
              </label>

              {watchedKbkDisagreement && (
                <div className={block("nested-box")}>
                  <div className={block("grid")}>
                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="note-kbk-suggested"
                      >
                        Предлагаемый КБК
                      </label>
                      <input
                        id="note-kbk-suggested"
                        className={block("input")}
                        disabled={isReadOnly || !canDisagreeKbk}
                        {...register("kbkSuggested")}
                        placeholder="20-значный код КБК"
                      />
                    </div>
                    <div className={block("field", ["wide"])}>
                      <label
                        className={block("label")}
                        htmlFor="note-kbk-comment"
                      >
                        Обоснование запроса на изменение КБК в ПГ
                      </label>
                      <input
                        id="note-kbk-comment"
                        className={block("input")}
                        disabled={isReadOnly || !canDisagreeKbk}
                        {...register("kbkDisagreementComment")}
                        placeholder="Укажите замечание бухгалтерии / предлагаемый КВР и КОСГУ…"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-budget-level">
              Уровень бюджета заказчика
            </label>
            <input
              id="note-budget-level"
              className={block("input", ["readonly"])}
              value={orgBudgetLevelLabel}
              readOnly
              disabled
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-funding-source">
              Источник финансирования (текстом)
            </label>
            <input
              id="note-funding-source"
              className={block("input")}
              {...register("fundingSource")}
              placeholder="Бюджет Курской области / средства ОМС / ПД…"
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="note-nmck">
              НМЦК, рублей
            </label>
            <input
              id="note-nmck"
              className={block("input")}
              {...register("initialMaxPrice")}
              placeholder="0.00"
            />
            {errorText("initialMaxPrice") && (
              <span className={block("error")}>
                {errorText("initialMaxPrice")}
              </span>
            )}
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="note-price-basis">
              Обоснование НМЦК (ст. 22 Закона № 44-ФЗ)
            </label>
            <textarea
              id="note-price-basis"
              rows={2}
              className={block("textarea")}
              {...register("priceBasis")}
            />
          </div>

          {/* Файл обоснования НМЦК, запрос на него и кнопка провалиться/начать делать расчёт */}
          <div className={block("field", ["wide"])}>
            <div className={block("nmck-box")}>
              <div className={block("label-row")}>
                <strong>
                  Обоснование НМЦК (ст. 22 Закона № 44-ФЗ), файл и запрос
                </strong>
                <div className={block("header-actions")}>
                  <Link
                    to={`/nmck-calculator?planId=${plan.id}&positionId=${position.id}${editingNoteId ? `&noteId=${editingNoteId}` : ""}`}
                    className={block("inline-link")}
                  >
                    Открыть модуль расчёта НМЦК
                    <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    className={block("btn-accent")}
                    onClick={() => setShowNmckWorkspace((prev) => !prev)}
                  >
                    <Calculator size={14} aria-hidden="true" />{" "}
                    {showNmckWorkspace
                      ? "Скрыть расчёт НМЦК"
                      : watchedNmckCalculation
                        ? "Пересчитать / изменить обоснование"
                        : "Рассчитать НМЦК здесь"}
                  </button>
                </div>
              </div>

              {watchedNmckCalculation && (
                <div className={block("nmck-card")}>
                  <div className={block("nmck-card-head")}>
                    <div className={block("card-title-inline")}>
                      {watchedNmckCalculation.method === "normative" ? (
                        <Scale size={15} aria-hidden="true" />
                      ) : (
                        <Calculator size={15} aria-hidden="true" />
                      )}
                      <span
                        className={block(
                          "nmck-badge",
                          watchedNmckCalculation.exceedsNormLimit
                            ? ["danger"]
                            : [],
                        )}
                      >
                        {NMCK_METHOD_LABELS[watchedNmckCalculation.method]}
                      </span>
                      <span className={block("hint")} style={{ marginTop: 0 }}>
                        от {watchedNmckCalculation.calculationDate || watchedNmckCalculation.calculatedAt}
                        {watchedNmckCalculation.calculatorName
                          ? ` · ${watchedNmckCalculation.calculatorName}`
                          : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={block("mode-btn")}
                      disabled={isExportingNmckDocx}
                      onClick={handleExportSavedNmckDocx}
                    >
                      <FileDown size={13} aria-hidden="true" />{" "}
                      {isExportingNmckDocx
                        ? "Формирование…"
                        : "Выгрузить обоснование (.docx)"}
                    </button>
                  </div>

                  {watchedNmckCalculation.method === "market_analysis" ? (
                    <>
                      <div className={block("nmck-kpis")}>
                        <div className={block("nmck-kpi")}>
                          <span>Итоговая НМЦК</span>
                          <strong>
                            {formatNmckMoney(watchedNmckCalculation.nmckTotal)} ₽
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Средняя цена ед.</span>
                          <strong>
                            {formatNmckMoney(
                              watchedNmckCalculation.meanUnitPrice,
                            )}{" "}
                            ₽
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Учтено источников</span>
                          <strong>
                            {watchedNmckCalculation.activeCount} из{" "}
                            {watchedNmckCalculation.offers.length}
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Вариация V / СКО</span>
                          <strong>
                            {watchedNmckCalculation.cvPercent.toFixed(2)}%{" "}
                            {watchedNmckCalculation.isHomogeneous
                              ? "(однородна ≤33%)"
                              : "(> 33%)"}
                          </strong>
                        </div>
                      </div>

                      {savedMarketEvaluation &&
                        savedMarketEvaluation.evaluatedOffers.length > 0 && (
                          <div style={{ overflowX: "auto" }}>
                            <table className={block("nmck-table")}>
                              <thead>
                                <tr>
                                  <th>№</th>
                                  <th>Источник / Поставщик</th>
                                  <th>Документ / Дата</th>
                                  <th>Цена ед., ₽</th>
                                  <th>Привед. цена, ₽</th>
                                  <th>Статус</th>
                                </tr>
                              </thead>
                              <tbody>
                                {savedMarketEvaluation.evaluatedOffers.map(
                                  (ev, idx) => (
                                    <tr key={ev.offer.id}>
                                      <td>{idx + 1}</td>
                                      <td>
                                        [
                                        {
                                          MARKET_PRICE_SOURCE_SHORT[
                                            ev.offer.sourceType ??
                                              "commercial_offer"
                                          ]
                                        }
                                        ] {ev.offer.supplierName || "—"}
                                      </td>
                                      <td>
                                        {ev.offer.sourceDocument || "б/н"}
                                        {ev.offer.offerDate
                                          ? ` от ${ev.offer.offerDate}`
                                          : ""}
                                      </td>
                                      <td>
                                        {ev.isValidPrice
                                          ? formatNmckMoney(ev.baseUnitPrice)
                                          : "—"}
                                      </td>
                                      <td>
                                        <strong>
                                          {ev.isValidPrice
                                            ? formatNmckMoney(
                                                ev.adjustedUnitPrice,
                                              )
                                            : "—"}
                                        </strong>
                                      </td>
                                      <td>
                                        {ev.isIncluded && ev.isValidPrice
                                          ? "Учтён"
                                          : "Исключён"}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </>
                  ) : (
                    <>
                      <div className={block("nmck-kpis")}>
                        <div className={block("nmck-kpi")}>
                          <span>Итоговая НМЦК</span>
                          <strong>
                            {formatNmckMoney(watchedNmckCalculation.nmckTotal)} ₽
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Код ОКПД2</span>
                          <strong>
                            {watchedNmckCalculation.okpd2Code || "не указан"}
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Предельная цена по ОКПД2</span>
                          <strong>
                            {watchedNmckCalculation.normLimitUnitPrice !==
                            undefined
                              ? `${formatNmckMoney(watchedNmckCalculation.normLimitUnitPrice)} ₽`
                              : "Не задана в ОКПД2"}
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Принятая цена ед. × объём</span>
                          <strong>
                            {formatNmckMoney(
                              watchedNmckCalculation.normativeUnitPrice ??
                                watchedNmckCalculation.meanUnitPrice,
                            )}{" "}
                            ₽ × {watchedNmckCalculation.quantity}{" "}
                            {watchedNmckCalculation.unit}
                          </strong>
                        </div>
                      </div>
                      <p className={block("hint")} style={{ marginTop: 0 }}>
                        <strong>НПА:</strong>{" "}
                        {watchedNmckCalculation.normativeAct || "—"}
                        {watchedNmckCalculation.normativeDocument
                          ? ` · Документ / пункт: ${watchedNmckCalculation.normativeDocument}`
                          : ""}
                      </p>
                      {watchedNmckCalculation.exceedsNormLimit && (
                        <div className={block("alert-warning")} role="alert">
                          Внимание: принятая цена единицы превышает предел
                          обязательного нормирования по ОКПД2 (
                          {formatNmckMoney(
                            watchedNmckCalculation.normLimitUnitPrice ?? 0,
                          )}{" "}
                          ₽).
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className={block("file-row")}>
                <label className={block("mode-btn")}>
                  <Upload size={14} aria-hidden="true" /> Загрузить файл
                  обоснования НМЦК
                  <input
                    type="file"
                    hidden
                    disabled={isReadOnly}
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.ods,.csv"
                    onChange={(e) => handleNmckFileChange(e.target.files)}
                  />
                </label>

                {watchedNmckFileName ? (
                  <span className={block("file-chip")}>
                    <span>
                      {watchedNmckFileName}
                      {watchedNmckFileUpdatedAt
                        ? ` (от ${watchedNmckFileUpdatedAt})`
                        : ""}
                    </span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className={block("danger-btn")}
                        onClick={() => {
                          setValue("nmckFileName", "");
                          setValue("nmckFileUpdatedAt", "");
                        }}
                        title="Открепить файл НМЦК"
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ) : (
                  <span className={block("hint")}>
                    Файл обоснования НМЦК пока не приложен
                  </span>
                )}
              </div>

              <div className={block("grid")}>
                <div className={block("field")}>
                  <label
                    className={block("label")}
                    htmlFor="note-nmck-req-status"
                  >
                    Статус запроса на файл НМЦК
                  </label>
                  <select
                    id="note-nmck-req-status"
                    className={block("select")}
                    {...register("nmckRequestStatus")}
                  >
                    <option value="none">Не запрашивался</option>
                    <option value="requested">
                      Направлен запрос на подготовку НМЦК
                    </option>
                    <option value="received">Файл НМЦК получен</option>
                  </select>
                </div>

                {watchedNmckRequestStatus !== "none" && (
                  <>
                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="note-nmck-req-assignee"
                      >
                        Ответственный за подготовку НМЦК
                      </label>
                      <select
                        id="note-nmck-req-assignee"
                        className={block("select")}
                        {...register("nmckRequestAssignee")}
                      >
                        <option value="">— Выберите сотрудника —</option>
                        {orgEmployees.map((emp) => {
                          const label = formatEmployeeInitiator(emp);
                          return (
                            <option key={String(emp.id)} value={label}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="note-nmck-req-date"
                      >
                        Срок / дата запроса
                      </label>
                      <input
                        id="note-nmck-req-date"
                        type="date"
                        className={block("input")}
                        {...register("nmckRequestDate")}
                      />
                    </div>

                    <div className={block("field", ["wide"])}>
                      <label
                        className={block("label")}
                        htmlFor="note-nmck-req-comment"
                      >
                        Комментарий к запросу на НМЦК
                      </label>
                      <input
                        id="note-nmck-req-comment"
                        className={block("input")}
                        {...register("nmckRequestComment")}
                        placeholder="Какие КП / прайсы или расчёты нужно приложить…"
                      />
                    </div>
                  </>
                )}
              </div>

              {showNmckWorkspace && (
                <MarketNmckCalculator
                  embedded
                  initialRecord={inlineInitialNmckRecord}
                  defaultSubject={
                    watch("subject") || position.objectOfPurchase || ""
                  }
                  defaultOkpd2Code={
                    watch("items.0.okpd2Code") ||
                    watch("okpd2Code") ||
                    position.okpd2Code ||
                    ""
                  }
                  defaultOkpd2Name={
                    watch("items.0.okpd2Name") ||
                    watch("okpd2Name") ||
                    position.okpd2Name ||
                    ""
                  }
                  defaultQuantity={
                    Number.isFinite(firstItemQty) && firstItemQty > 0
                      ? String(firstItemQty)
                      : "1"
                  }
                  defaultUnit={firstItemUnit}
                  defaultIkz={watch("ikz") || position.identificationCode || ""}
                  defaultCalculatorName={
                    employee?.employee ? fullName(employee.employee) : ""
                  }
                  organizationName={
                    organization?.shortName || organization?.fullName || ""
                  }
                  planAmountLimit={toNumber(position.amountTotal)}
                  contractRegistryItems={contractRegistryItems}
                  canUpdatePlanAmount={false}
                  disabled={isReadOnly}
                  saveButtonLabel="Подставить расчёт и обоснование в СЗ"
                  onSaveToPosition={({ record, basisText }) => {
                    if (isReadOnly) return;
                    setValue("initialMaxPrice", record.nmckTotal.toFixed(2), {
                      shouldValidate: true,
                    });
                    setValue("priceBasis", basisText);
                    setValue("nmckOffers", record.offers);
                    setValue("nmckCalculation", record);
                    setValue(
                      "nmckFileName",
                      `Обоснование_НМЦК_СЗ_${watch("noteNumber") || "черновик"}.docx`,
                    );
                    setValue("nmckFileUpdatedAt", record.calculatedAt);
                    if (record.okpd2Code && !watch("items.0.okpd2Code")) {
                      setValue("items.0.okpd2Code", record.okpd2Code);
                      setValue("items.0.okpd2Name", record.okpd2Name || "");
                    }
                    if (watch("nmckRequestStatus") === "requested") {
                      setValue("nmckRequestStatus", "received");
                    }
                    setShowNmckWorkspace(false);
                  }}
                  onClose={() => setShowNmckWorkspace(false)}
                />
              )}
            </div>
          </div>

          {/* Аванс */}
          <div className={block("field")}>
            <label className={block("checkbox")}>
              <input type="checkbox" {...register("hasAdvance")} />
              <span>Предусмотрен аванс</span>
            </label>
            {watchedHasAdvance && (
              <input
                className={block("input")}
                {...register("advancePercent")}
                placeholder="Размер аванса, %"
              />
            )}
          </div>

          {/* Казначейское сопровождение — радиокнопками Да / Нет + select с двумя выборами */}
          <div className={block("field")}>
            <span className={block("label")}>
              Казначейское сопровождение (ст. 242.23 БК РФ)
            </span>
            <div className={block("radio-row")}>
              <label className={block("radio")}>
                <input
                  type="radio"
                  checked={!watchedTreasury}
                  onChange={() => {
                    setValue("requiresTreasurySupport", false);
                    setValue("treasurySupportType", "");
                  }}
                />
                <span>Нет</span>
              </label>
              <label className={block("radio")}>
                <input
                  type="radio"
                  checked={watchedTreasury}
                  onChange={() => {
                    setValue("requiresTreasurySupport", true);
                    if (!watch("treasurySupportType")) {
                      setValue("treasurySupportType", "full");
                    }
                  }}
                />
                <span>Да</span>
              </label>
            </div>
            {watchedTreasury && (
              <select
                aria-label="Вид казначейского сопровождения"
                className={block("select")}
                {...register("treasurySupportType")}
              >
                <option value="full">Полное казначейское сопровождение</option>
                <option value="advance_only">
                  Казначейское сопровождение только аванса
                </option>
              </select>
            )}
          </div>

          {/* Банковское сопровождение чекбоксом */}
          <div className={block("field")}>
            <span className={block("label")}>Банковское сопровождение</span>
            <label className={block("checkbox")}>
              <input type="checkbox" {...register("requiresBankSupport")} />
              <span>Требуется банковское сопровождение контракта</span>
            </label>
          </div>
        </div>
      </fieldset>

      {/* 5. Преимущества СМП, требования ст. 31, ПП 1482, ПП 2571 и санкционный РНП */}
      <fieldset className={block("section")} disabled={isReadOnly}>
        <legend>
          5. СМП/СОНКО (ст. 30) и требования к участникам (ст. 31, ПП 1482, ПП
          2571)
        </legend>
        <div className={block("grid")}>
          {/* СМП: только среди СМП + галочка привлечения субподрядчиков -> размер */}
          <div className={block("field", ["smp"])}>
            <label className={block("checkbox")}>
              <input type="checkbox" {...register("advantageSmpPart3Art30")} />
              <span>Закупка только среди СМП и СОНКО (ч. 3 ст. 30 44-ФЗ)</span>
            </label>

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("requiresSmpSubcontracting")}
              />
              <span>
                Требование о привлечении субподрядчиков (соисполнителей) из
                числа СМП и СОНКО (ч. 5 ст. 30, ПП РФ № 1466)
              </span>
            </label>

            {smpConflictWarning && (
              <div className={block("alert-warning")} role="alert">
                Предупреждение: так нельзя — нельзя одновременно устанавливать
                преимущество/закупку только среди СМП (ч. 3 ст. 30) и требование
                о привлечении субподрядчиков из СМП (ч. 5 ст. 30 Закона №
                44-ФЗ).
              </div>
            )}

            {watchedSmpSubcontracting && (
              <div className={block("subbox")}>
                <label className={block("label")} htmlFor="note-smp-percent">
                  Размер привлечения субподрядчиков из СМП/СОНКО (ч. 5 ст. 30,
                  ПП РФ № 1466), % *
                </label>
                <input
                  id="note-smp-percent"
                  className={block("input", ["code"])}
                  type="number"
                  min={MINIMUM_SMP_REQUIRED_PERCENT}
                  max={100}
                  step="1"
                  {...register("smpRequiredPercent")}
                />
                {errorText("smpRequiredPercent") && (
                  <span className={block("error")}>
                    {errorText("smpRequiredPercent")}
                  </span>
                )}
                <p className={block("hint")}>
                  Не менее {MINIMUM_SMP_REQUIRED_PERCENT}% по п. 1 ПП РФ от
                  23.12.2016 № 1466.
                  {requiredAmount !== null
                    ? ` Требуемый объём при НМЦК ${price.toLocaleString("ru-RU")} руб — ${requiredAmount.toLocaleString("ru-RU")} руб.`
                    : ""}
                </p>
              </div>
            )}
          </div>

          {/* Требования к участникам по ст. 31, ПП 1482 и ПП 2571 */}
          <div className={block("field", ["wide"])}>
            <span className={block("label")}>
              Требования к участникам закупки (ст. 31 Закона № 44-ФЗ)
            </span>
            <div className={block("pp2571-list")}>
              {/* Первый: ч. 1.1 ст. 31 (по умолчанию true, БЕЗ поля описания) */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("requirementsPart1_1Art31")}
                  />
                  <span>
                    Требования к участникам закупок в соответствии с ч. 1.1 ст.
                    31 Закона № 44-ФЗ (включено по умолчанию)
                  </span>
                </label>
              </div>

              {/* Три требования ПП РФ № 1482 — каждое со своим полем описания */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("pp1482ProductionFacilities")}
                  />
                  <span>
                    Наличие на праве собственности или на ином законном основании
                    производственных мощностей и технологического оборудования
                    для исполнения государственного контракта (п. 1 ПП РФ от
                    25.12.2014 № 1482)
                  </span>
                </label>
                {watchedPp1482Facilities && (
                  <div className={block("req-desc")}>
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("pp1482ProductionFacilitiesText")}
                      placeholder="Описание требуемых производственных мощностей и оборудования (п. 1 ПП РФ № 1482)…"
                    />
                  </div>
                )}
              </div>

              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("pp1482FinancialStability")}
                  />
                  <span>
                    Финансовая устойчивость и платежеспособность (п. 1 ПП РФ от
                    25.12.2014 № 1482)
                  </span>
                </label>
                {watchedPp1482Finance && (
                  <div className={block("req-desc")}>
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("pp1482FinancialStabilityText")}
                      placeholder="Описание показателей финансовой устойчивости и платежеспособности (п. 1 ПП РФ № 1482)…"
                    />
                  </div>
                )}
              </div>

              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("pp1482Specialists")} />
                  <span>
                    Наличие специалистов, имеющих профессиональное образование,
                    отвечающих соответствующим квалификационным требованиям,
                    заключивших с участником размещения государственного
                    оборонного заказа трудовые договоры, необходимых в
                    соответствии с документацией о закупке для исполнения
                    государственного контракта (п. 1 ПП РФ от 25.12.2014 № 1482)
                  </span>
                </label>
                {watchedPp1482Specialists && (
                  <div className={block("req-desc")}>
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("pp1482SpecialistsText")}
                      placeholder="Описание квалификационных требований к специалистам по ГОЗ (п. 1 ПП РФ № 1482)…"
                    />
                  </div>
                )}
              </div>

              {/* п. 1 ч. 1 ст. 31 + поле описания */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("requirementP1Part1Art31")}
                  />
                  <span>
                    Требование к участникам закупок в соответствии с п. 1 ч. 1
                    ст. 31 Закона № 44-ФЗ
                  </span>
                </label>
                {watchedRequirementP1Part1Art31 && (
                  <div className={block("req-desc")}>
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("requirementP1Part1Art31Text")}
                      placeholder="Укажите конкретную лицензию / членство в СРО / разрешение по законодательству РФ…"
                    />
                  </div>
                )}
              </div>

              {/* ч. 1 ст. 31 + поле описания */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("unifiedRequirementsPart1Art31")}
                  />
                  <span>
                    Единые требования к участникам закупок в соответствии с ч. 1
                    ст. 31 Закона № 44-ФЗ
                  </span>
                </label>
                {watchedUnifiedPart1Art31 && (
                  <div className={block("req-desc")}>
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("unifiedRequirementsPart1Art31Text")}
                      placeholder="Описание единых требований по ч. 1 ст. 31 Закона № 44-ФЗ…"
                    />
                  </div>
                )}
              </div>

              {/* ч. 2 ст. 31 + ПП 2571 + поле описания */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("additionalRequirementsPart2Art31")}
                  />
                  <span>
                    Дополнительные требования к участникам по ч. 2 ст. 31
                    Закона № 44-ФЗ (ПП РФ от 29.12.2021 № 2571)
                  </span>
                </label>

                {watchedPart2Art31 && (
                  <div className={block("nested-box")}>
                    {PP2571_POSITIONS.map((pos) => (
                      <label key={pos} className={block("checkbox")}>
                        <input
                          type="checkbox"
                          checked={watchedPp2571.includes(pos)}
                          onChange={() => togglePp2571(pos)}
                        />
                        <span>{pos}</span>
                      </label>
                    ))}
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("additionalRequirementsPart2Art31Text")}
                      placeholder="Описание дополнительных требований к участникам по ч. 2 ст. 31 Закона № 44-ФЗ…"
                    />
                  </div>
                )}
              </div>

              {/* ч. 2.1 ст. 31 + описание + вложенный п. 4 ПП 2571 со стандартным текстом */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("requirementsPart2_1Art31")}
                  />
                  <span>
                    Требования к участникам закупок в соответствии с ч. 2.1 ст.
                    31 Закона № 44-ФЗ
                  </span>
                </label>

                {watchedPart2_1Art31 && (
                  <div className={block("nested-box")}>
                    <textarea
                      rows={2}
                      className={block("textarea")}
                      {...register("requirementsPart2_1Art31Text")}
                      placeholder="Описание требований универсальной предквалификации (ч. 2.1 ст. 31)…"
                    />
                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        {...register("pp2571Point4Requirement")}
                      />
                      <span>
                        Требования в соответствии с пунктом 4 ПП РФ от
                        29.12.2021 № 2571
                      </span>
                    </label>
                    {watchedPp2571Point4 && (
                      <div className={block("req-desc")}>
                        <textarea
                          rows={3}
                          className={block("textarea")}
                          {...register("pp2571Point4RequirementText")}
                          placeholder="Стандартный текст требования в соответствии с п. 4 ПП РФ от 29.12.2021 № 2571…"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Последний: РНП из-за санкций (БЕЗ поля описания) */}
              <div className={block("req-item")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("sanctionsRnpRequirement")}
                  />
                  <span>
                    Требование об отсутствии в реестре недобросовестных
                    поставщиков (подрядчиков, исполнителей) информации,
                    включенной в такой реестр в связи с отказом поставщика
                    (подрядчика, исполнителя) от исполнения контракта по
                    причине введения в отношении заказчика санкций и (или) мер
                    ограничительного характера
                  </span>
                </label>
              </div>

              {rnpConflictWarning && (
                <div className={block("alert-warning")} role="alert">
                  Предупреждение: требование об отсутствии в РНП по ч. 1.1 ст.
                  31 Закона № 44-ФЗ и санкционное требование об отсутствии в РНП
                  вместе не должны устанавливаться.
                </div>
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {/* 6. Обеспечение заявки, контракта, гарантия качества и обеспечение гарантий */}
      <fieldset className={block("section")} disabled={isReadOnly}>
        <legend>
          6. Обеспечение заявки, контракта, гарантия качества и реквизиты
        </legend>

        <div className={block("toolbar-row")}>
          <span className={block("hint")}>
            Реквизиты счёта заказчика и бюджетного счёта по ч. 13 ст. 44 44-ФЗ
            вносит и актуализирует уполномоченный член КС.
          </span>
          <div className={block("radio-row")}>
            <button
              type="button"
              className={block("mode-btn")}
              disabled={isReadOnly}
              onClick={handleApplyOrgRequisites}
            >
              Подставить из карточки заказчика
            </button>
            {canEditCustomerRequisites && (
              <button
                type="button"
                className={block("mode-btn")}
                disabled={isReadOnly || updateOrganization.isPending}
                onClick={handleSaveOrgRequisites}
              >
                {updateOrganization.isPending
                  ? "Сохранение…"
                  : "Актуализировать реквизиты заказчика"}
              </button>
            )}
          </div>
        </div>
        {requisitesSyncMessage && (
          <p className={block("hint")}>{requisitesSyncMessage}</p>
        )}

        <div className={block("grid")}>
          {/* Обеспечение заявки + бюджетный счёт ч. 13 ст. 44 */}
          <div className={block("field", ["wide"])}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("requiresApplicationSecurity")}
              />
              <span>Требуется обеспечение заявки (ст. 44 Закона № 44-ФЗ)</span>
            </label>

            {watchedAppSec && (
              <div className={block("subbox")}>
                <div className={block("grid")}>
                  <div className={block("field")}>
                    <label className={block("label")} htmlFor="note-app-sec-pct">
                      Размер обеспечения заявки, % от НМЦК
                    </label>
                    <input
                      id="note-app-sec-pct"
                      className={block("input", ["code"])}
                      {...register("applicationSecurityPercent")}
                      placeholder="1"
                    />
                  </div>
                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="note-app-sec-order"
                    >
                      Порядок предоставления обеспечения заявки
                    </label>
                    <textarea
                      id="note-app-sec-order"
                      rows={2}
                      className={block("textarea")}
                      {...register("applicationSecurityOrder")}
                    />
                  </div>
                </div>

                <SecurityRequisitesFields
                  idPrefix="sz-app-sec"
                  title="Реквизиты счета для перечисления обеспечения заявки"
                  account={watch("applicationSecurityRequisites")}
                  onAccountChange={(next) =>
                    setValue("applicationSecurityRequisites", next)
                  }
                  showBudgetPart13Art44
                  budgetAccount={watch("applicationSecurityBudgetRequisites")}
                  onBudgetAccountChange={(next) =>
                    setValue("applicationSecurityBudgetRequisites", next)
                  }
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>

          {/* Обеспечение исполнения контракта */}
          <div className={block("field", ["wide"])}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("requiresContractSecurity")}
              />
              <span>
                Требуется обеспечение исполнения контракта (ст. 96 Закона №
                44-ФЗ)
              </span>
            </label>

            {watchedContractSec && (
              <div className={block("subbox")}>
                <div className={block("grid")}>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-contract-sec-pct"
                    >
                      Размер обеспечения исполнения контракта, %
                    </label>
                    <input
                      id="note-contract-sec-pct"
                      className={block("input", ["code"])}
                      {...register("contractSecurityPercent")}
                      placeholder="5"
                    />
                  </div>
                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="note-contract-sec-order"
                    >
                      Порядок предоставления обеспечения исполнения контракта
                    </label>
                    <textarea
                      id="note-contract-sec-order"
                      rows={2}
                      className={block("textarea")}
                      {...register("contractSecurityOrder")}
                    />
                  </div>
                </div>

                <SecurityRequisitesFields
                  idPrefix="sz-contract-sec"
                  title="Реквизиты счета для перечисления обеспечения исполнения контракта"
                  account={watch("contractSecurityRequisites")}
                  onAccountChange={(next) =>
                    setValue("contractSecurityRequisites", next)
                  }
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>

          {/* Визуально объединённый контур: гарантия качества -> обеспечение гарантийных обязательств */}
          <div className={block("warranty-group")}>
            <div className={block("warranty-group-head")}>
              <h3 className={block("warranty-group-title")}>
                Гарантия качества и обеспечение гарантийных обязательств (единый
                связанный блок)
              </h3>
              <span className={block("hint")}>
                Обеспечение гарантийных обязательств доступно только при
                установленной гарантии качества
              </span>
            </div>

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                checked={watchedQualityWarranty}
                disabled={isReadOnly}
                onChange={(e) => handleToggleQualityWarranty(e.target.checked)}
              />
              <span>Требуется гарантия качества товара, работы, услуги</span>
            </label>

            {watchedQualityWarranty && (
              <div className={block("nested-box")}>
                <div className={block("grid")}>
                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="note-warranty-maint"
                    >
                      1) Информация о требованиях к гарантийному обслуживанию
                      товара
                    </label>
                    <textarea
                      id="note-warranty-maint"
                      rows={2}
                      className={block("textarea")}
                      {...register("warrantyMaintenanceInfo")}
                    />
                  </div>

                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="note-warranty-mfg"
                    >
                      2) Требования к гарантии производителя товара
                    </label>
                    <textarea
                      id="note-warranty-mfg"
                      rows={2}
                      className={block("textarea")}
                      {...register("manufacturerWarrantyInfo")}
                    />
                  </div>

                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="note-warranty-term"
                    >
                      3) Срок, на который предоставляется гарантия и (или)
                      требования к объему предоставления гарантий качества
                      товара, работы, услуги *
                    </label>
                    <textarea
                      id="note-warranty-term"
                      rows={2}
                      className={block("textarea")}
                      {...register("warrantyTermAndVolume")}
                      placeholder="Например: 24 месяца со дня подписания документа о приёмке, в полном объёме…"
                    />
                    {errorText("warrantyTermAndVolume") && (
                      <span className={block("error")}>
                        {errorText("warrantyTermAndVolume")}
                      </span>
                    )}
                  </div>

                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-warranty-months"
                    >
                      Гарантийный срок (справочно, мес.)
                    </label>
                    <input
                      id="note-warranty-months"
                      type="number"
                      min={0}
                      className={block("input")}
                      {...register("warrantyTermMonths")}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={block("warranty-connector")}>
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  disabled={isReadOnly || !watchedQualityWarranty}
                  {...register("requiresWarrantySecurity")}
                />
                <span>
                  Требуется обеспечение гарантийных обязательств (доступно при
                  включённой гарантии качества)
                </span>
              </label>
              {errorText("requiresWarrantySecurity") && (
                <span className={block("error")}>
                  {errorText("requiresWarrantySecurity")}
                </span>
              )}

              {watchedQualityWarranty && watchedWarrantySec && (
                <div className={block("nested-box")}>
                  <div className={block("grid")}>
                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="note-warranty-sec-pct"
                      >
                        Размер обеспечения гарантийных обязательств, %
                      </label>
                      <input
                        id="note-warranty-sec-pct"
                        className={block("input", ["code"])}
                        {...register("warrantySecurityPercent")}
                        placeholder="1"
                      />
                    </div>
                    <div className={block("field", ["wide"])}>
                      <label
                        className={block("label")}
                        htmlFor="note-warranty-sec-order"
                      >
                        Порядок предоставления обеспечения гарантийных
                        обязательств
                      </label>
                      <textarea
                        id="note-warranty-sec-order"
                        rows={2}
                        className={block("textarea")}
                        {...register("warrantySecurityOrder")}
                      />
                    </div>
                  </div>

                  <SecurityRequisitesFields
                    idPrefix="sz-warranty-sec"
                    title="Реквизиты счета для перечисления обеспечения гарантийных обязательств"
                    account={watch("warrantySecurityRequisites")}
                    onAccountChange={(next) =>
                      setValue("warrantySecurityRequisites", next)
                    }
                    disabled={isReadOnly}
                  />
                </div>
              )}
            </div>
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("allowUnilateralRefusalArt95")}
              />
              <span>
                Допустим односторонний отказ от исполнения контракта (ст. 95
                Закона № 44-ФЗ)
              </span>
            </label>
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="note-other-req">
              Дополнительные условия для извещения и проекта контракта
            </label>
            <textarea
              id="note-other-req"
              rows={2}
              className={block("textarea")}
              {...register("otherRequirements")}
              placeholder="Особые требования инициатора, технические или правовые оговорки…"
            />
          </div>
        </div>
      </fieldset>

      <footer className={block("footer")}>
        {(createNote.isError || updateNote.isError) && (
          <span className={block("error")}>
            Потребность не сохранена:{" "}
            {String(createNote.error || updateNote.error)}
          </span>
        )}
        <div className={block("footer-actions")}>
          <button type="button" onClick={onClose} disabled={isBusy}>
            {isReadOnly ? "Назад к плану-графику" : "Отмена"}
          </button>
          <button
            type="submit"
            className={block("btn-primary")}
            disabled={isBusy || isReadOnly}
            onClick={() => {
              proceedAfterSaveRef.current = false;
            }}
          >
            {isBusy ? "Сохранение..." : "Сохранить потребность"}
          </button>
          {onSaveAndProceedToNotice && (
            <button
              type="submit"
              className={block("btn-accent")}
              disabled={isBusy || isReadOnly}
              onClick={() => {
                proceedAfterSaveRef.current = true;
              }}
            >
              {isBusy
                ? "Подготовка..."
                : "Сохранить и перейти к извещению →"}
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}
