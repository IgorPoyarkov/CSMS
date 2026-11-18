import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calculator,
  ExternalLink,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  PenLine,
  Scale,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import KtruSelect from "../UI/KtruSelect/KtruSelect";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import MoneyInput from "../UI/MoneyInput/MoneyInput";
import CustomCheckbox from "../UI/CustomCheckbox";
import AddressCascade from "../UI/AddressCascade/AddressCascade";
import SecurityRequisitesFields from "./SecurityRequisitesFields";
import PurchaseNoteStatusBadge from "./PurchaseNoteStatusBadge";
import MarketNmckCalculator from "../Nmck/MarketNmckCalculator";
import {
  PurchaseNoteSchema,
  emptyDeliveryPlace,
  emptyPurchaseNote,
  hasSmpSubcontractingRequirement,
  nextPurchaseNoteNumber,
  purchaseNotesForPosition,
  type NmckSignature,
  type PurchaseNote,
  type PurchaseNoteObjectItem,
  type PurchaseNoteStatus,
} from "../../services/PurchaseNote/purchaseNote.schema";
import EdsSignModal from "../Eds/EdsSignModal";
import {
  useLogSignatureEvent,
  useSignatureEvents,
  type SignatureEvent,
} from "../../services/Eds/eds.api";
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
  COST_ITEM_CATEGORY_LABELS,
  MARKET_PRICE_SOURCE_SHORT,
  NMCK_METHOD_LABELS,
  type NmckCalculationRecord,
  type NmckMarketOffer,
} from "../../services/Nmck/nmck.schema";
import {
  calculateCostNmck,
  calculateMarketNmck,
  exportNmckCalculationToDocx,
  exportNmckCalculationToPdf,
  formatNmckMoney,
} from "../../services/Nmck/marketNmck";
import {
  checkOkpd2AuctionList,
  isContestPlacingWay,
  validatePlacingWayAgainstAuctionList,
} from "../../services/Okpd2Ref/auctionListControl";
import {
  checkOkpd2NationalRegime,
  nationalRegimeExpectedLabel,
  validateNationalRegime,
} from "../../services/NationalRegime/pp1875";
import { useSmpRegistry } from "../../services/ContractSmp/smpRegistry.api";
import {
  analyzeNmckSmpComposition,
  smpRegistryCategoryLabels,
} from "../../services/ContractSmp/smpRegistry.schema";
import {
  BEST_DIRECTIONS,
  OBJECT_CATEGORY_LIMITS,
  SCORING_MODES,
  bestDirectionLabels,
  criterionFormulaText,
  criterionShortLabels,
  defaultCriteria,
  detectObjectCategory,
  indicatorFormulaHint,
  indicatorKindsByCriterion,
  normalizeCriteria,
  objectCategoryLimits,
  pp2604Applies,
  procedureApplicabilityHint,
  procedureKindFromPlacingWay,
  scoringModeLabels,
  validateBidEvaluation,
  type Criterion,
} from "../../services/BidEvaluation/bidEvaluation.schema";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import { useKtruDictionary } from "../../services/KtruRef/ktruRef.api";
import { checkKtruUsage } from "../../services/KtruRef/ktruControl";
import type { KtruRef } from "../../services/KtruRef/ktruRef.schema";
import type { Okpd2Ref } from "../../services/Okpd2Ref/okpd2Ref.schema";
import {
  NATIONAL_REGIME_OPTIONS,
  PLACING_WAYS_ALL,
  PP2571_POSITIONS,
} from "../../services/Procurements/noticeInfo.config";
import { formatDeliveryAddress } from "../../services/AddressRef/addressRef.schema";
import { formatCharacteristicValue } from "../../services/ObjectDescription/objectDescription.schema";
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

// Годовые суммы финансирования по КБК: в СЗ правятся по годам, «всего»
// считается как их сумма. Объёмы плана-графика выступают лимитом.
type KbkYearField =
  | "amountCurrentYear"
  | "amountPlanPeriodFirstYear"
  | "amountPlanPeriodSecondYear"
  | "amountSubsequentYears";

type KbkLimitField =
  | "limitCurrentYear"
  | "limitPlanPeriodFirstYear"
  | "limitPlanPeriodSecondYear"
  | "limitSubsequentYears";

interface KbkFundingEntry {
  id: string;
  kbk?: string;
  amountCurrentYear?: string;
  amountPlanPeriodFirstYear?: string;
  amountPlanPeriodSecondYear?: string;
  amountSubsequentYears?: string;
}

interface KbkFundingRow {
  id: string;
  kbk: string;
  limitCurrentYear: number | null;
  limitPlanPeriodFirstYear: number | null;
  limitPlanPeriodSecondYear: number | null;
  limitSubsequentYears: number | null;
  amountCurrentYear: number | null;
  amountPlanPeriodFirstYear: number | null;
  amountPlanPeriodSecondYear: number | null;
  amountSubsequentYears: number | null;
  total: number;
}

const KBK_YEAR_COLUMNS: {
  field: KbkYearField;
  limitField: KbkLimitField;
  label: string;
}[] = [
  {
    field: "amountCurrentYear",
    limitField: "limitCurrentYear",
    label: "текущий год",
  },
  {
    field: "amountPlanPeriodFirstYear",
    limitField: "limitPlanPeriodFirstYear",
    label: "1-й год планового периода",
  },
  {
    field: "amountPlanPeriodSecondYear",
    limitField: "limitPlanPeriodSecondYear",
    label: "2-й год планового периода",
  },
  {
    field: "amountSubsequentYears",
    limitField: "limitSubsequentYears",
    label: "последующие годы",
  },
];

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
  const { data: ktruRefs = [] } = useKtruDictionary();
  const { data: allObjectDescriptions = [] } =
    useOrganizationObjectDescriptions(organizationId);
  const { data: contractRegistryItems = [] } =
    useContractRegistry(organizationId);
  // Журнал ЭП: по нему находим уже подписанную НМЦК этой служебной записки
  const { data: signatureEvents = [] } = useSignatureEvents(organizationId);
  const logSignatureEvent = useLogSignatureEvent();
  // Реестр МСП: по нему проверяются поставщики из коммерческих предложений
  const { data: smpRegistry = [] } = useSmpRegistry();
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
  const [showNmckSign, setShowNmckSign] = useState(false);
  const [nmckSignMessage, setNmckSignMessage] = useState<string | null>(null);
  const [smpApplyMessage, setSmpApplyMessage] = useState<string | null>(null);
  const [isExportingNmckDocx, setIsExportingNmckDocx] = useState(false);
  const [isExportingNmckPdf, setIsExportingNmckPdf] = useState(false);
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const proceedAfterSaveRef = useRef(false);
  // Раскрытые для правки объекты закупки. Новая позиция раскрывается сразу,
  // после «Сохранить» — сворачивается в короткую строку.
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const isItemExpanded = (id: string) => expandedItemIds.has(id);
  const expandItem = (id: string) =>
    setExpandedItemIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const collapseItem = (id: string) =>
    setExpandedItemIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  const toggleItemExpanded = (id: string) =>
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const kbkEntries = useMemo(() => positionKbkEntries(position), [position]);

  // Коды ОКПД2 позиций плана-графика: добавить объект с другим кодом нельзя
  const allowedOkpd2Codes = useMemo(() => {
    const codes = Array.from(
      new Set(
        plan.positions
          .map((planPosition) => planPosition.okpd2Code?.trim())
          .filter((code): code is string => Boolean(code)),
      ),
    );
    return codes.length > 0 ? codes : undefined;
  }, [plan]);
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
      (position.identificationCode && desc.ikz === position.identificationCode),
  );

  // Инициатор закупки — сотрудник из штатного расписания организации.
  // В справочнике это запись BaseEmployee: ФИО лежит во вложенном employee
  // (BaseHuman), а должность — в самой записи. Поэтому ФИО берём из
  // вложенного человека, иначе в списке остаются пустые варианты.
  const formatEmployeeInitiator = (emp: {
    position?: string;
    employee?: { surname?: string; name?: string; patronymic?: string };
    surname?: string;
    name?: string;
    patronymic?: string;
  }) => {
    const person = emp.employee ?? emp;
    const fio = fullName(person) || "ФИО не указано";
    return `${emp.position ? `${emp.position} — ` : ""}${fio}`;
  };

  const defaultInitiatorEmployee = employee;
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
                ktruCode: "",
                ktruName: "",
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
        // Критерии ПП РФ N 2604 всегда держим полным набором из четырёх
        // критериев: так значимость и показатели редактируются стабильно
        evaluationCriteria: normalizeCriteria(
          note.evaluationCriteria && note.evaluationCriteria.length > 0
            ? note.evaluationCriteria
            : defaultCriteria(),
        ),
        // НМЦК по умолчанию — сумма из обоснования, если расчёт уже выполнен;
        // иначе сохранённое значение, затем объём из плана-графика
        initialMaxPrice:
          note.initialMaxPrice ||
          (note.nmckCalculation
            ? String(note.nmckCalculation.nmckTotal)
            : String(position.amountTotal ?? "")),
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
      evaluationCriteria: defaultCriteria(),
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
          ktruCode: autoMatchedDesc?.ktruCode ?? "",
          ktruName: "",
          unit: autoMatchedDesc?.unit || "",
          quantity: firstQty,
          unitPrice: "",
          totalPrice: String(position.amountTotal ?? ""),
          // Национальный режим ставится по умолчанию по ПП РФ № 1875:
          // на этапе служебной записки заказчик уже видит ожидаемый режим
          nationalRegimeType:
            checkOkpd2NationalRegime(
              position.okpd2Code || autoMatchedDesc?.okpd2Code || "",
              okpd2Refs,
            ).regime ?? "none",
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
    setError,
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

  // Автоподстановка текущего пользователя как инициатора закупки при создании
  // новой СЗ: id берётся из штатной записи, а не из вложенного ФИО
  useEffect(() => {
    if (editingNoteId !== undefined) return;
    if (!employee) return;
    const currentName = getValues("initiatorName");
    if (currentName && currentName.trim()) return;
    setValue("initiatorEmployeeId", employee.id);
    setValue("initiatorName", formatEmployeeInitiator(employee));
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
  // Отсчёт относительного срока: по умолчанию с даты заключения контракта
  const watchedDeliveryFromContract = Boolean(
    watch("deliveryTermFromContractDate") ?? true,
  );
  const watchedAcceptanceMode = watch("acceptanceTermMode") ?? "event";
  const watchedStatus = (watch("status") ?? "draft") as PurchaseNoteStatus;
  // Способ определения поставщика по умолчанию не подставляется: пока
  // пользователь не выбрал его, способ считается незаданным
  const watchedPlacingWay = watch("placingWayCode") ?? "";
  const watchedItems = (watch("items") ?? []) as PurchaseNoteObjectItem[];
  const watchedOozId = watch("objectDescriptionId");
  const selectedOoz = objectDescriptions.find(
    (desc) =>
      watchedOozId !== null &&
      watchedOozId !== undefined &&
      String(desc.id) === String(watchedOozId),
  );
  // Готовность ООЗ и полнота закупок по позиции плана-графика
  const watchedOozSetComplete = Boolean(watch("oozSetComplete"));
  const watchedPositionProcurementsComplete = Boolean(
    watch("positionProcurementsComplete"),
  );
  const auctionValidation = validatePlacingWayAgainstAuctionList(
    watchedPlacingWay,
    watchedItems.map((item) => ({
      code: item.okpd2Code,
      name: item.name,
    })),
    okpd2Refs,
  );

  // Национальный режим (ПП РФ N 1875): объявленный по каждой позиции режим
  // сверяется с перечнями запрета (приложение N 1) и ограничения (приложение N 2)
  const nationalRegimeValidation = validateNationalRegime(
    watchedItems.map((item) => ({
      code: item.okpd2Code,
      name: item.name,
      declaredMode: item.nationalRegimeType,
    })),
    okpd2Refs,
  );

  // Критерии оценки по ПП РФ N 2604: вид процедуры берём из выбранного
  // способа закупки, категорию объекта — из ОКПД2 позиций плана-графика.
  // Раздел критериев открывается только для конкурса (OK*/EOK*): пока
  // способ не выбран или выбран аукцион/котировки/ЕП — критериев в СЗ нет.
  const evaluationWaySelected = Boolean(watchedPlacingWay);
  const evaluationKind = procedureKindFromPlacingWay(watchedPlacingWay);
  const evaluationApplies =
    evaluationWaySelected &&
    isContestPlacingWay(watchedPlacingWay) &&
    pp2604Applies(evaluationKind);
  const evaluationOkpd2Codes = watchedItems
    .map((item) => item.okpd2Code)
    .filter((code): code is string => Boolean(code));
  const detectedCategory = detectObjectCategory(evaluationOkpd2Codes);
  const watchedEvaluationCategory = watch("evaluationObjectCategory");
  const evaluationCategory =
    watchedEvaluationCategory || detectedCategory.category || "works_services";
  const evaluationLimits = objectCategoryLimits(evaluationCategory);
  // useWatch следит за вложенными полями критериев (значимость, показатели),
  // поэтому чекбокс и редактор показателей перерисовываются сразу
  const watchedEvaluationCriteria = useWatch({
    control,
    name: "evaluationCriteria",
  });
  const evaluationCriteria = normalizeCriteria(
    (watchedEvaluationCriteria ?? []) as Criterion[],
  );
  const evaluationIssues = evaluationApplies
    ? validateBidEvaluation(
        {
          procedureKind: evaluationKind,
          objectCategory: evaluationCategory,
          criteria: evaluationCriteria,
          bids: [],
          status: "draft",
          nmck: watch("initialMaxPrice") ?? "",
          okpd2Codes: evaluationOkpd2Codes,
        },
        { checkIndicators: false, checkBids: false },
      )
    : [];

  // Категория по умолчанию — из ОКПД2 позиции плана-графика (только конкурс)
  useEffect(() => {
    if (!evaluationApplies) {
      return;
    }
    if (!getValues("evaluationObjectCategory") && detectedCategory.category) {
      setValue("evaluationObjectCategory", detectedCategory.category as never, {
        shouldDirty: false,
      });
    }
  }, [evaluationApplies, detectedCategory.category, getValues, setValue]);

  // Критерии существуют в СЗ только для конкурса: для аукциона, запроса
  // котировок и невыбранного способа раздел не показывается, а при
  // сохранении критерии в запись не попадают (см. onSubmit).
  useEffect(() => {
    if (!evaluationApplies) {
      return;
    }

    const current = getValues("evaluationCriteria");

    if (!Array.isArray(current) || current.length === 0) {
      setValue("evaluationCriteria", defaultCriteria(), {
        shouldDirty: false,
      });
    }
  }, [evaluationApplies, getValues, setValue]);

  const watchedAdvantageSmp = Boolean(watch("advantageSmpPart3Art30"));
  const watchedSmpSubcontracting = Boolean(watch("requiresSmpSubcontracting"));
  const smpConflictWarning = watchedAdvantageSmp && watchedSmpSubcontracting;

  const watchedUnifiedPart1Art31 =
    watch("unifiedRequirementsPart1Art31") !== false;
  const watchedRequirementP1Part1Art31 = Boolean(
    watch("requirementP1Part1Art31"),
  );
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
  const watchedNmckSignature = watch("nmckSignature") as
    | NmckSignature
    | undefined;

  // ООЗ первично: пока набор объектов не признан конечным, задание на
  // подготовку НМЦК и расчёт блокируются. Для тарифного и затратного методов
  // ограничение мягче — их состав тоже может включать товары, но описание
  // всё равно нужно, поэтому оставляем предупреждение.
  const nmckMethod = watchedNmckCalculation?.method;
  const nmckMethodSoft = nmckMethod === "tariff" || nmckMethod === "cost";
  const oozReady = Boolean(selectedOoz) && watchedOozSetComplete;
  const nmckRequestAllowed = oozReady || nmckMethodSoft;

  // Суммы финансирования по КБК правятся по годам: «всего» — расчётная
  // величина. Объёмы плана-графика служат лимитом, превышать их нельзя.
  const watchedKbkFunding = (watch("kbkFundingAmounts") ??
    []) as KbkFundingEntry[];
  const kbkFundingRows = useMemo<KbkFundingRow[]>(() => {
    const entries =
      kbkEntries.length > 0
        ? kbkEntries
        : [
            {
              kbk: defaultKbk,
              amountTotal: position.amountTotal,
              amountCurrentYear: position.amountCurrentYear,
              amountPlanPeriodFirstYear: position.amountPlanPeriodFirstYear,
              amountPlanPeriodSecondYear: position.amountPlanPeriodSecondYear,
              amountSubsequentYears: position.amountSubsequentYears,
            },
          ];
    const single = entries.length === 1;

    // Для одной записи в ПГ годовые суммы могут лежать только на позиции —
    // тогда берём их оттуда как лимит
    const limitOf = (
      entryValue: string | number | undefined,
      positionValue: string | number | undefined,
    ) => toNumber(entryValue ?? (single ? positionValue : undefined));

    return entries.map((entry, idx) => {
      const id = `kbk-${idx}`;
      const override = watchedKbkFunding.find((row) => row.id === id);

      const limitCurrentYear = limitOf(
        entry.amountCurrentYear,
        position.amountCurrentYear,
      );
      const limitPlanPeriodFirstYear = limitOf(
        entry.amountPlanPeriodFirstYear,
        position.amountPlanPeriodFirstYear,
      );
      const limitPlanPeriodSecondYear = limitOf(
        entry.amountPlanPeriodSecondYear,
        position.amountPlanPeriodSecondYear,
      );
      const limitSubsequentYears = limitOf(
        entry.amountSubsequentYears,
        position.amountSubsequentYears,
      );

      const amountCurrentYear =
        toNumber(override?.amountCurrentYear) ?? limitCurrentYear;
      const amountPlanPeriodFirstYear =
        toNumber(override?.amountPlanPeriodFirstYear) ??
        limitPlanPeriodFirstYear;
      const amountPlanPeriodSecondYear =
        toNumber(override?.amountPlanPeriodSecondYear) ??
        limitPlanPeriodSecondYear;
      const amountSubsequentYears =
        toNumber(override?.amountSubsequentYears) ?? limitSubsequentYears;

      return {
        id,
        kbk: entry.kbk ?? defaultKbk,
        limitCurrentYear,
        limitPlanPeriodFirstYear,
        limitPlanPeriodSecondYear,
        limitSubsequentYears,
        amountCurrentYear,
        amountPlanPeriodFirstYear,
        amountPlanPeriodSecondYear,
        amountSubsequentYears,
        total:
          (amountCurrentYear ?? 0) +
          (amountPlanPeriodFirstYear ?? 0) +
          (amountPlanPeriodSecondYear ?? 0) +
          (amountSubsequentYears ?? 0),
      };
    });
  }, [kbkEntries, defaultKbk, position, watchedKbkFunding]);

  const kbkFundingTotal = kbkFundingRows.reduce(
    (total, row) => total + row.total,
    0,
  );
  const nmckValue = toNumber(watch("initialMaxPrice")) ?? 0;
  const kbkFundingDiff = Number((kbkFundingTotal - nmckValue).toFixed(2));

  // Превышения объёмов плана-графика по годам — блокируют сохранение
  const kbkLimitViolations = useMemo(() => {
    const issues: {
      kbk: string;
      label: string;
      amount: number;
      limit: number;
    }[] = [];

    kbkFundingRows.forEach((row) => {
      KBK_YEAR_COLUMNS.forEach((column) => {
        const amount = row[column.field] ?? 0;
        const limit = row[column.limitField];
        if (limit !== null && amount - limit > 0.005) {
          issues.push({
            kbk: row.kbk,
            label: column.label,
            amount,
            limit,
          });
        }
      });
    });

    return issues;
  }, [kbkFundingRows]);

  const setKbkFundingYears = (
    id: string,
    kbk: string,
    amounts: Partial<Record<KbkYearField, number>>,
  ) => {
    const current = (getValues("kbkFundingAmounts") ?? []) as KbkFundingEntry[];
    const patch: Partial<KbkFundingEntry> = { kbk };
    KBK_YEAR_COLUMNS.forEach((column) => {
      const value = amounts[column.field];
      if (value !== undefined) patch[column.field] = String(value);
    });

    const exists = current.some((row) => row.id === id);
    const next = exists
      ? current.map((row) => (row.id === id ? { ...row, ...patch } : row))
      : [...current, { id, ...patch } as KbkFundingEntry];

    setValue("kbkFundingAmounts", next, { shouldDirty: true });
  };

  const setKbkFundingYear = (
    row: KbkFundingRow,
    field: KbkYearField,
    amount: number,
  ) => setKbkFundingYears(row.id, row.kbk, { [field]: amount });

  // Фактическая НМЦК раскладывается по годам пропорционально объёмам ПГ:
  // суммы остаются в пределах лимитов, а «всего» равно НМЦК
  const distributeNmckAcrossYears = (row: KbkFundingRow, total: number) => {
    const limits = KBK_YEAR_COLUMNS.map(
      (column) => row[column.limitField] ?? 0,
    );
    const limitSum = limits.reduce((sum, value) => sum + value, 0);
    const weights = limitSum > 0 ? limits : [1, 0, 0, 0];
    const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;

    const amounts: Partial<Record<KbkYearField, number>> = {};
    let distributed = 0;

    KBK_YEAR_COLUMNS.forEach((column, index) => {
      const isLast = index === KBK_YEAR_COLUMNS.length - 1;
      const value = isLast
        ? Number((total - distributed).toFixed(2))
        : Number(((total * weights[index]) / weightSum).toFixed(2));
      if (!isLast) distributed += value;
      amounts[column.field] = Math.max(0, value);
    });

    setKbkFundingYears(row.id, row.kbk, amounts);
  };

  // Проверка поставщиков КП по реестру МСП: сколько из них субъекты малого
  // и среднего предпринимательства и какую настройку СМП это обосновывает
  const smpComposition = useMemo(
    () =>
      analyzeNmckSmpComposition(
        rawWatchedNmckOffers ?? watchedNmckCalculation?.offers ?? [],
        smpRegistry,
      ),
    [rawWatchedNmckOffers, watchedNmckCalculation, smpRegistry],
  );

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

  // Стоимость объекта закупки = цена × количество. Пересчитываем её при
  // изменении цены или количества; ручная правка стоимости сохраняется.
  const recalcItemTotal = (
    index: number,
    overrides?: { quantity?: string; unitPrice?: string },
  ) => {
    if (isReadOnly) return;
    const qtyRaw =
      overrides?.quantity ?? getValues(`items.${index}.quantity`) ?? "";
    const priceRaw =
      overrides?.unitPrice ?? getValues(`items.${index}.unitPrice`) ?? "";
    const quantity = Number.parseFloat(String(qtyRaw).replace(",", "."));
    const unitPrice = Number.parseFloat(String(priceRaw).replace(",", "."));

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return;

    setValue(`items.${index}.totalPrice`, (quantity * unitPrice).toFixed(2), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

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

  // Единое структурированное ООЗ на служебную записку: набор характеристик
  // в СЗ один, поэтому ООЗ выбирается над таблицей позиций, а не в каждой
  // строке. Первая позиция подтягивает реквизиты из описания.
  const handleSelectNoteOoz = (selectedId: string) => {
    if (isReadOnly) return;
    setValue("objectDescriptionId", selectedId || undefined);
    setValue("items.0.objectDescriptionId", selectedId || undefined);
    const found = objectDescriptions.find(
      (desc) => String(desc.id) === selectedId,
    );
    if (!found) return;

    setValue("items.0.name", found.title);
    if (found.okpd2Code) {
      setValue("items.0.okpd2Code", found.okpd2Code);
      // Национальный режим по умолчанию — по ПП РФ № 1875
      setValue(
        "items.0.nationalRegimeType",
        checkOkpd2NationalRegime(found.okpd2Code, okpd2Refs).regime ?? "none",
        { shouldDirty: true },
      );
    }
    if (found.okpd2Name) setValue("items.0.okpd2Name", found.okpd2Name);
    setValue("items.0.ktruCode", found.ktruCode ?? "");
    setValue("items.0.ktruName", "");
    if (found.unit) setValue("items.0.unit", found.unit);
    if (!watchedIndeterminate && found.quantity) {
      setValue("items.0.quantity", found.quantity);
    }

    if (!watch("subject")?.trim()) {
      setValue("subject", found.title);
    }
    if (found.otherRequirements && !watch("otherRequirements")) {
      setValue("otherRequirements", found.otherRequirements);
    }
  };

  // Выбор ОКПД2 в позиции: наименование, национальный режим по ПП РФ № 1875
  // и сброс КТРУ, если оно относится к другому коду
  const handleSelectItemOkpd2 = (index: number, selected: Okpd2Ref | null) => {
    if (isReadOnly) return;
    const code = selected?.code ?? "";
    setValue(`items.${index}.okpd2Code`, code);
    setValue(`items.${index}.okpd2Name`, selected?.name ?? "");
    setValue(
      `items.${index}.nationalRegimeType`,
      checkOkpd2NationalRegime(code, okpd2Refs).regime ?? "none",
      { shouldDirty: true },
    );

    const currentKtru = getValues(`items.${index}.ktruCode`);
    if (
      currentKtru &&
      !ktruRefs.some((k) => k.ktruCode === currentKtru && k.okpd2Code === code)
    ) {
      setValue(`items.${index}.ktruCode`, "");
      setValue(`items.${index}.ktruName`, "");
    }
  };

  // Выбор позиции КТРУ: наименование и единица измерения каталога
  const handleSelectItemKtru = (index: number, item: KtruRef | null) => {
    if (isReadOnly) return;
    setValue(`items.${index}.ktruCode`, item?.ktruCode ?? "", {
      shouldDirty: true,
    });
    setValue(`items.${index}.ktruName`, item?.name ?? "", {
      shouldDirty: true,
    });
    if (item && !getValues(`items.${index}.name`)) {
      setValue(`items.${index}.name`, item.name);
    }
    if (item?.unit && !getValues(`items.${index}.unit`)) {
      setValue(`items.${index}.unit`, item.unit);
    }
  };

  // ООЗ конкретного объекта закупки: характеристики живут под своей позицией
  const handleSelectItemOoz = (index: number, selectedId: string) => {
    if (isReadOnly) return;
    setValue(`items.${index}.objectDescriptionId`, selectedId || undefined);
    const found = objectDescriptions.find(
      (desc) => String(desc.id) === selectedId,
    );
    if (!found) return;

    if (!getValues(`items.${index}.name`)) {
      setValue(`items.${index}.name`, found.title);
    }
    if (found.okpd2Code && !getValues(`items.${index}.okpd2Code`)) {
      setValue(`items.${index}.okpd2Code`, found.okpd2Code);
      setValue(`items.${index}.okpd2Name`, found.okpd2Name ?? "");
      setValue(
        `items.${index}.nationalRegimeType`,
        checkOkpd2NationalRegime(found.okpd2Code, okpd2Refs).regime ?? "none",
        { shouldDirty: true },
      );
    }
    if (found.ktruCode && !getValues(`items.${index}.ktruCode`)) {
      setValue(`items.${index}.ktruCode`, found.ktruCode);
    }
    if (found.unit && !getValues(`items.${index}.unit`)) {
      setValue(`items.${index}.unit`, found.unit);
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
    const found = orgEmployees.find((emp) => String(emp.id) === selectedValue);
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

    // Связь с планом-графиком: коды ОКПД2 вне позиций плана не допускаются
    if (allowedOkpd2Codes && allowedOkpd2Codes.length > 0) {
      const allowedSet = new Set(allowedOkpd2Codes);
      const foreignCodes = Array.from(
        new Set(
          (data.items ?? [])
            .map((item) => item.okpd2Code)
            .filter(
              (code): code is string =>
                typeof code === "string" &&
                code.length > 0 &&
                !allowedSet.has(code),
            ),
        ),
      );

      if (foreignCodes.length > 0) {
        setError("root", {
          message: `Коды ОКПД2 вне плана-графика: ${foreignCodes.join(", ")}. Выберите позиции из плана-графика заказчика`,
        });

        return;
      }
    }

    // ПП РФ N 1875: запрет/ограничение обязательны, но не установлены —
    // потребность не сохраняется (обход по Enter недопустим)
    if (nationalRegimeValidation.blocksSave) {
      setError("root", {
        message:
          nationalRegimeValidation.summary ??
          "Национальный режим не соответствует перечням ПП РФ N 1875",
      });
      return;
    }

    // Суммы по КБК не могут превышать объёмы финансирования из плана-графика
    if (kbkLimitViolations.length > 0) {
      setError("root", {
        message: `Суммы по КБК превышают объёмы плана-графика: ${kbkLimitViolations
          .map(
            (issue) =>
              `${issue.kbk || "без кода"} (${issue.label}) — ${formatRub(issue.amount)} при лимите ${formatRub(issue.limit)}`,
          )
          .join("; ")}`,
      });
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

    // ООЗ позиции: если описание выбрано, у служебной записки появляется
    // файл описания. Он переносится в прилагаемые документы извещения
    // после согласования СЗ.
    const oozId = firstItem?.objectDescriptionId ?? data.objectDescriptionId;
    const oozFileName =
      data.objectDescriptionFileName ||
      (oozId !== undefined && oozId !== null && oozId !== ""
        ? `Описание_объекта_закупки_СЗ_${data.noteNumber || "черновик"}.docx`
        : undefined);

    const normalized: PurchaseNote = {
      ...data,
      // Критерии фиксируются вместе со способом закупки и категорией по ОКПД2:
      // из СЗ они попадают в извещение. Если выбран не конкурс (или способ
      // ещё не выбран), Положение N 2604 не применяется — полей в СЗ нет.
      evaluationProcedureKind: evaluationApplies ? evaluationKind : undefined,
      evaluationObjectCategory: evaluationApplies
        ? evaluationCategory
        : undefined,
      evaluationOkpd2Codes: evaluationApplies
        ? evaluationOkpd2Codes
        : undefined,
      evaluationCriteria: evaluationApplies ? evaluationCriteria : undefined,
      kbk: defaultKbk || data.kbk,
      kbkDisagreementAuthor:
        data.kbkDisagreement && employee?.employee
          ? fullName(employee.employee)
          : data.kbkDisagreementAuthor,
      items: normalizedItems,
      objectDescriptionId: oozId,
      objectDescriptionFileName: oozFileName,
      objectDescriptionFileUpdatedAt: oozFileName
        ? (data.objectDescriptionFileUpdatedAt ??
          new Date().toISOString().slice(0, 10))
        : undefined,
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
          (emp) => formatEmployeeInitiator(emp) === watchedInitiatorName,
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
  }, [
    watchedNmckCalculation,
    rawWatchedNmckOffers,
    firstItemQty,
    firstItemUnit,
    position,
    todayIso,
    watch,
  ]);

  // ─── Подписанная НМЦК (журнал ЭП) ─────────────────────────────────────────

  // Последнее успешное подписание обоснования НМЦК по этой служебной записке
  const signedNmckEvent = useMemo(() => {
    if (editingNoteId === undefined || editingNoteId === "") return null;
    const matched = signatureEvents.filter(
      (event) =>
        event.entityType === "nmck" &&
        String(event.entityId) === String(editingNoteId) &&
        event.result === "signed",
    );
    return (
      [...matched].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ??
      null
    );
  }, [signatureEvents, editingNoteId]);

  // Перенос реквизитов подписи и файла обоснования в карточку СЗ
  const applyNmckSignature = (event: SignatureEvent) => {
    if (isReadOnly) return;
    const fallbackFileName = `Обоснование_НМЦК_СЗ_${watch("noteNumber") || "черновик"}.docx`;
    const fileName = watchedNmckFileName || fallbackFileName;
    const fileUpdatedAt =
      watchedNmckFileUpdatedAt || event.createdAt.slice(0, 10);

    const signature: NmckSignature = {
      signedAt: event.createdAt,
      signedBy: event.userLabel || event.certificateOwner || "",
      certificateOwner: event.certificateOwner || "",
      certificateSerial: event.certificateSerial || "",
      certificateInn: event.certificateInn || "",
      fileName,
      fileUpdatedAt,
      nmckTotal: String(watch("initialMaxPrice") ?? ""),
      method: watchedNmckCalculation?.method,
      eventId: event.id,
      documentLabel: event.documentLabel,
    };

    setValue("nmckSignature", signature);
    if (!watchedNmckFileName) setValue("nmckFileName", fileName);
    if (!watchedNmckFileUpdatedAt) setValue("nmckFileUpdatedAt", fileUpdatedAt);
    setNmckSignMessage(
      "Подписанная НМЦК притянута в служебную записку. Сохраните СЗ, чтобы зафиксировать её в карточке.",
    );
  };

  // НМЦК уже подписана и сохранена в системе, а в карточке подписи нет —
  // подтягиваем автоматически. Ручной файл в СЗ не перетираем: его заменит
  // только явная кнопка «Притянуть подписанную НМЦК».
  useEffect(() => {
    if (isReadOnly || !signedNmckEvent) return;
    if (getValues("nmckSignature")) return;
    if (getValues("nmckFileName")) return;
    applyNmckSignature(signedNmckEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedNmckEvent, isReadOnly]);

  const canSignNmck =
    !isReadOnly &&
    editingNoteId !== undefined &&
    editingNoteId !== "" &&
    Boolean(watchedNmckCalculation || watchedNmckFileName);

  const nmckSignHint = !editingNoteId
    ? "Сначала сохраните служебную записку: подписывается сохранённый документ."
    : !watchedNmckCalculation && !watchedNmckFileName
      ? "Сначала сформируйте или приложите обоснование НМЦК."
      : "Подписать обоснование НМЦК сертификатом заказчика";

  const handleNmckSigned = (event: SignatureEvent) => {
    setShowNmckSign(false);

    if (event.result !== "signed") {
      logSignatureEvent.mutate(event);
      setNmckSignMessage(
        "Подпись не принята: сертификат не принадлежит заказчику. Попытка записана в журнал ЭП.",
      );
      return;
    }

    logSignatureEvent.mutate(event, {
      onSuccess: (saved) => {
        applyNmckSignature({ ...event, id: saved.id ?? event.id });
        setNmckSignMessage(
          "НМЦК подписана, событие записано в журнал ЭП. Сохраните служебную записку, чтобы подпись осталась в карточке.",
        );
      },
      onError: () => {
        applyNmckSignature(event);
        setNmckSignMessage(
          "Подпись сформирована, но журнал ЭП недоступен. Сохраните СЗ — реквизиты подписи останутся в карточке.",
        );
      },
    });
  };

  // Применение рекомендации по СМП: либо закупка только среди СМП/СОНКО,
  // Детализирующие показатели критерия: добавляем и удаляем прямо в СЗ.
  // Сумма значимости показателей критерия должна давать 100% (п. 7).
  const addCriterionIndicator = (criterionIndex: number) => {
    if (isReadOnly) return;
    const current = normalizeCriteria(
      (getValues("evaluationCriteria") ?? []) as Criterion[],
    );
    const next = current.map((criterion, index) =>
      index === criterionIndex
        ? {
            ...criterion,
            indicators: [
              ...criterion.indicators,
              {
                name: "",
                kind: indicatorKindsByCriterion[criterion.type][0] ?? "quality",
                weightPercent: 0,
                unit: "",
                best: "max" as const,
                scoring: "formula" as const,
                scaleText: "",
              },
            ],
          }
        : criterion,
    );
    setValue("evaluationCriteria", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeCriterionIndicator = (
    criterionIndex: number,
    indicatorIndex: number,
  ) => {
    if (isReadOnly) return;
    const current = normalizeCriteria(
      (getValues("evaluationCriteria") ?? []) as Criterion[],
    );
    const next = current.map((criterion, index) =>
      index === criterionIndex
        ? {
            ...criterion,
            indicators: criterion.indicators.filter(
              (_, i) => i !== indicatorIndex,
            ),
          }
        : criterion,
    );
    setValue("evaluationCriteria", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // либо привлечение субподрядчиков в объёме доли СМП в выборке КП
  const applySmpRecommendation = () => {
    const recommendation = smpComposition.recommendation;
    if (!recommendation || isReadOnly) return;

    if (recommendation.mode === "smp_only") {
      setValue("advantageSmpPart3Art30", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("requiresSmpSubcontracting", false);
      setValue("smpRequiredPercent", undefined);
      setSmpApplyMessage(
        "Установлена закупка только среди СМП/СОНКО: все поставщики из выборки КП входят в реестр МСП.",
      );
      return;
    }

    if (recommendation.mode === "subcontracting") {
      const percent = recommendation.percent ?? 5;
      setValue("advantageSmpPart3Art30", false);
      setValue("requiresSmpSubcontracting", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("smpRequiredPercent", percent, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setSmpApplyMessage(
        `Установлено привлечение СМП/СОНКО — ${percent}%: доля субъектов МСП в выборке коммерческих предложений.`,
      );
    }
  };

  const handleExportSavedNmckDocx = async () => {
    if (!watchedNmckCalculation) return;
    setIsExportingNmckDocx(true);
    try {
      await exportNmckCalculationToDocx({
        title: `ОБОСНОВАНИЕ НМЦК К СЗ № ${watch("noteNumber") || "б/н"}`,
        organizationName:
          organization?.shortName || organization?.fullName || "",
        organization: organization ?? plan.customer ?? null,
        ikz: watch("ikz") || position.identificationCode || "",
        record: watchedNmckCalculation,
        marketResult: savedMarketEvaluation ?? undefined,
        fileName: `Обоснование_НМЦК_СЗ_${watch("noteNumber") || "черновик"}.docx`,
      });
    } finally {
      setIsExportingNmckDocx(false);
    }
  };

  const handleExportSavedNmckPdf = async () => {
    if (!watchedNmckCalculation) return;
    setIsExportingNmckPdf(true);
    try {
      await exportNmckCalculationToPdf({
        title: `ОБОСНОВАНИЕ НМЦК К СЗ № ${watch("noteNumber") || "б/н"}`,
        organizationName:
          organization?.shortName || organization?.fullName || "",
        organization: organization ?? plan.customer ?? null,
        ikz: watch("ikz") || position.identificationCode || "",
        record: watchedNmckCalculation,
        marketResult: savedMarketEvaluation ?? undefined,
        fileName: `Обоснование_НМЦК_44ФЗ_СЗ_${watch("noteNumber") || "черновик"}.pdf`,
      });
    } finally {
      setIsExportingNmckPdf(false);
    }
  };

  return (
    <form className={block()} onSubmit={handleSubmit(onSubmit)}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <button type="button" className={block("back")} onClick={onClose}>
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
          {/* Инициатор — первым, на всю ширину; статус — рядом с ним */}
          <div className={block("field", ["wide"])}>
            <div className={block("initiator-row")}>
              <div className={block("field", ["grow"])}>
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

              <div className={block("status-inline")}>
                <span className={block("label")}>Статус согласования СЗ</span>
                {/* Статус меняется автоматически по мере прохождения СЗ
                    и не редактируется вручную. */}
                <PurchaseNoteStatusBadge status={watchedStatus} />
                <input type="hidden" {...register("status")} />
              </div>
            </div>
          </div>

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
              <span className={block("error")}>{errorText("noteNumber")}</span>
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
            <CustomCheckbox
              label="Невозможно определить количество/объём товаров, работ, услуг (ч. 24 ст. 22 Закона № 44-ФЗ — во всех объектах количество фиксируется равным 1)"
              checked={watchedIndeterminate}
              disabled={isReadOnly}
              onChange={(e) => handleToggleIndeterminate(e.target.checked)}
            />
          </div>

          {/* Единое ООЗ: один набор характеристик на служебную записку.
              Выбор объекта идёт над таблицей — видно, что выбрал заказчик. */}
          <div className={block("field", ["wide"])}>
            <div className={block("label-row")}>
              <label className={block("label")} htmlFor="note-ooz">
                Структурированное ООЗ — единый набор характеристик (из
                /norming-requirements)
              </label>
              <Link to="/norming-requirements" className={block("inline-link")}>
                Редактировать в конструкторе ООЗ
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
            </div>
            <select
              id="note-ooz"
              className={block("select")}
              disabled={isReadOnly}
              value={
                watchedOozId !== null && watchedOozId !== undefined
                  ? String(watchedOozId)
                  : ""
              }
              onChange={(e) => handleSelectNoteOoz(e.target.value)}
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
            {selectedOoz ? (
              <span className={block("hint")}>
                Источник:{" "}
                {autoMatchedDesc &&
                String(autoMatchedDesc.id) === String(selectedOoz.id)
                  ? "подобрано автоматически по позиции плана-графика / ИКЗ"
                  : "выбрано вручную"}
                . Характеристик в ООЗ: {selectedOoz.characteristics.length}
                {selectedOoz.ktruCode ? ` · КТРУ ${selectedOoz.ktruCode}` : ""}.
                Состав характеристик ведётся в конструкторе ООЗ, в СЗ он только
                выбирается.
              </span>
            ) : (
              <span className={block("hint")}>
                ООЗ подбирается по позиции плана-графика автоматически. Если
                описание не найдено, его заводят в конструкторе ООЗ — в СЗ
                характеристики не редактируются.
              </span>
            )}
          </div>

          {/* Готовность ООЗ: без конечного набора объектов нельзя подобрать
              сопоставимые товары и корректно определить НМЦК */}
          <div className={block("field", ["wide"])}>
            <div className={block("ooz-flags")}>
              <CustomCheckbox
                label="Набор объектов закупки конечный — описание готово для определения НМЦК"
                checked={watchedOozSetComplete}
                disabled={isReadOnly}
                onChange={(e) =>
                  setValue("oozSetComplete", e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              <CustomCheckbox
                label="Это последняя закупка по позиции плана-графика (дальнейших закупок не будет)"
                checked={watchedPositionProcurementsComplete}
                disabled={isReadOnly}
                onChange={(e) =>
                  setValue("positionProcurementsComplete", e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              <span className={block("hint")}>
                Пока набор не признан конечным, задание на подготовку НМЦК и
                расчёт блокируются: для метода сопоставимых рыночных цен нужны
                идентичные или сопоставимые товары. Для тарифного и затратного
                методов ограничение мягче, но описание всё равно необходимо.
              </span>
            </div>
          </div>

          {/* Сводная таблица объектов закупки: ОКПД2 / КТРУ, правка и удаление */}
          <div className={block("field", ["wide"])}>
            <div className={block("positions-table-wrap")}>
              <table className={block("positions-table")}>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>ОКПД2 / КТРУ</th>
                    <th>Наименование</th>
                    <th>Ед.</th>
                    <th>Кол-во</th>
                    <th>Цена, руб.</th>
                    <th>Сумма, руб.</th>
                    <th>Нац. режим</th>
                    <th>При работах</th>
                    <th aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {itemFields.map((item, idx) => {
                    const itemOkpd2 = watch(`items.${idx}.okpd2Code`) || "";
                    const itemUnit = watch(`items.${idx}.unit`) || "";
                    const itemKtru = watch(`items.${idx}.ktruCode`) || "";
                    const itemName = watch(`items.${idx}.name`) || "";
                    const itemQuantity = watch(`items.${idx}.quantity`) || "";
                    const itemUnitPrice = watch(`items.${idx}.unitPrice`) || "";
                    const itemTotalPrice =
                      watch(`items.${idx}.totalPrice`) || "";
                    const itemRegimeValue =
                      watch(`items.${idx}.nationalRegimeType`) || "none";
                    const itemSupplyDuringWorks = watch(
                      `items.${idx}.isSupplyDuringWorks`,
                    );
                    const itemOozId = watch(`items.${idx}.objectDescriptionId`);
                    const itemDesc = objectDescriptions.find(
                      (desc) => String(desc.id) === String(itemOozId),
                    );
                    const itemRegime = checkOkpd2NationalRegime(
                      itemOkpd2,
                      okpd2Refs,
                    );
                    const itemRegimeIssue =
                      nationalRegimeValidation.issues.find(
                        (issue) => issue.code === itemRegime.code,
                      );
                    const ktruIssue = checkKtruUsage(
                      ktruRefs,
                      itemOkpd2,
                      itemKtru,
                    );
                    const auctionCheck = checkOkpd2AuctionList(
                      itemOkpd2,
                      okpd2Refs,
                    );
                    // Ключ раскрытия — собственный id объекта: useFieldArray
                    // подменяет поле id своим ключом
                    const rowId = watch(`items.${idx}.id`) || item.id;
                    const expanded = isItemExpanded(rowId);

                    // Свёрнутая позиция — краткий срез без полей ввода
                    if (!expanded) {
                      return (
                        <tr key={item.id}>
                          <td className={block("positions-index")}>
                            {idx + 1}
                          </td>
                          <td className={block("positions-code-cell")}>
                            <span className={block("positions-code")}>
                              {itemOkpd2 || "—"}
                            </span>
                            {itemKtru && (
                              <span className={block("hint")}>
                                КТРУ {itemKtru}
                              </span>
                            )}
                            {(ktruIssue || auctionCheck.inAuctionList) && (
                              <span className={block("warning")}>
                                Есть предупреждения — раскройте позицию
                              </span>
                            )}
                          </td>
                          <td>{itemName || "—"}</td>
                          <td>{itemUnit || "—"}</td>
                          <td>
                            {watchedIndeterminate ? "1" : itemQuantity || "1"}
                          </td>
                          <td>{formatRub(itemUnitPrice)}</td>
                          <td>{formatRub(itemTotalPrice)}</td>
                          <td>
                            {itemRegimeValue === "ban"
                              ? "запрет"
                              : itemRegimeValue === "restriction"
                                ? "ограничение"
                                : itemRegimeValue === "advantage"
                                  ? "преимущество"
                                  : "нет"}
                          </td>
                          <td>{itemSupplyDuringWorks ? "да" : "—"}</td>
                          <td>
                            <div className={block("row-actions")}>
                              <button
                                type="button"
                                className={block("link-btn")}
                                disabled={isReadOnly}
                                onClick={() => toggleItemExpanded(rowId)}
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                className={block("danger-btn")}
                                disabled={isReadOnly}
                                onClick={() => removeItem(idx)}
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={item.id}>
                        {/* Редактор позиции: наименование на всю ширину,
                            остальные свойства — сеткой под ним. Так поля и
                            кнопки не выходят за форму. */}
                        <tr>
                          <td colSpan={10}>
                            <div className={block("item-editor")}>
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
                                  placeholder="Наименование"
                                  {...register(`items.${idx}.name`)}
                                />
                              </div>

                              <div className={block("item-editor-grid")}>
                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    ОКПД2 / КТРУ
                                  </span>
                                  <Okpd2Select
                                    code={itemOkpd2}
                                    allowedCodes={allowedOkpd2Codes}
                                    disabled={isReadOnly}
                                    onSelect={(selected) =>
                                      handleSelectItemOkpd2(idx, selected)
                                    }
                                  />
                                  <KtruSelect
                                    className={block("select")}
                                    okpd2Code={itemOkpd2}
                                    ktruCode={itemKtru}
                                    disabled={isReadOnly}
                                    onSelect={(ktru) =>
                                      handleSelectItemKtru(idx, ktru)
                                    }
                                  />
                                  {ktruIssue && (
                                    <span
                                      className={block(
                                        ktruIssue.level === "error"
                                          ? "error"
                                          : "hint",
                                      )}
                                    >
                                      {ktruIssue.message}
                                    </span>
                                  )}
                                  {auctionCheck.inAuctionList && (
                                    <span className={block("hint")}>
                                      Аукционный перечень (РП РФ № 471-р) —
                                      обязателен электронный аукцион.
                                    </span>
                                  )}
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Единица измерения
                                  </span>
                                  <OkeiSelect
                                    value={itemUnit}
                                    disabled={isReadOnly}
                                    onChange={(val) =>
                                      setValue(`items.${idx}.unit`, val)
                                    }
                                  />
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Количество
                                  </span>
                                  <input
                                    className={block("input")}
                                    disabled={
                                      isReadOnly || watchedIndeterminate
                                    }
                                    value={
                                      watchedIndeterminate ? "1" : itemQuantity
                                    }
                                    onChange={(e) => {
                                      const nextQuantity = e.target.value;
                                      setValue(
                                        `items.${idx}.quantity`,
                                        nextQuantity,
                                      );
                                      recalcItemTotal(idx, {
                                        quantity: nextQuantity,
                                      });
                                    }}
                                    placeholder="1"
                                  />
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Цена за ед., руб.
                                  </span>
                                  <MoneyInput
                                    className={block("input")}
                                    value={itemUnitPrice}
                                    onChange={(next) => {
                                      const nextPrice = next
                                        ? String(next)
                                        : "";
                                      setValue(
                                        `items.${idx}.unitPrice`,
                                        nextPrice,
                                        { shouldDirty: true },
                                      );
                                      recalcItemTotal(idx, {
                                        unitPrice: nextPrice,
                                      });
                                    }}
                                  />
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Стоимость, руб.
                                  </span>
                                  <MoneyInput
                                    className={block("input")}
                                    value={itemTotalPrice}
                                    onChange={(next) =>
                                      setValue(
                                        `items.${idx}.totalPrice`,
                                        next ? String(next) : "",
                                        { shouldDirty: true },
                                      )
                                    }
                                  />
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Национальный режим
                                  </span>
                                  <select
                                    className={block("select")}
                                    {...register(
                                      `items.${idx}.nationalRegimeType`,
                                    )}
                                  >
                                    {NATIONAL_REGIME_OPTIONS.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  {itemRegime.regime && (
                                    <span className={block("hint")}>
                                      ПП РФ № 1875:{" "}
                                      {itemRegime.regime === "ban"
                                        ? "запрет"
                                        : "ограничение"}
                                      {itemRegime.groupLabel
                                        ? ` — ${itemRegime.groupLabel}`
                                        : ""}
                                    </span>
                                  )}
                                  {itemRegimeIssue && (
                                    <span
                                      className={block(
                                        itemRegimeIssue.level === "error"
                                          ? "error"
                                          : "warning",
                                      )}
                                    >
                                      {itemRegimeIssue.message}
                                    </span>
                                  )}
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Товар при выполнении работ
                                  </span>
                                  <CustomCheckbox
                                    compact
                                    aria-label={`Товар поставляется при выполнении работ, позиция ${idx + 1}`}
                                    {...register(
                                      `items.${idx}.isSupplyDuringWorks`,
                                    )}
                                  />
                                </div>
                              </div>

                              <div className={block("item-editor-actions")}>
                                <button
                                  type="button"
                                  className={block("link-btn")}
                                  disabled={isReadOnly}
                                  onClick={() => collapseItem(rowId)}
                                >
                                  Сохранить
                                </button>
                                <button
                                  type="button"
                                  className={block("danger-btn")}
                                  disabled={isReadOnly}
                                  onClick={() => removeItem(idx)}
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* ООЗ и характеристики — под своим объектом закупки */}
                        <tr>
                          <td colSpan={10}>
                            <div className={block("item-ooz")}>
                              <div className={block("field", ["wide"])}>
                                <label
                                  className={block("label")}
                                  htmlFor={`note-item-ooz-${idx}`}
                                >
                                  ООЗ объекта закупки
                                </label>
                                <select
                                  id={`note-item-ooz-${idx}`}
                                  className={block("select")}
                                  disabled={isReadOnly}
                                  value={
                                    itemOozId !== null &&
                                    itemOozId !== undefined
                                      ? String(itemOozId)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleSelectItemOoz(idx, e.target.value)
                                  }
                                >
                                  <option value="">
                                    — Не выбрано (характеристики не заданы) —
                                  </option>
                                  {objectDescriptions.map((desc) => (
                                    <option
                                      key={String(desc.id)}
                                      value={String(desc.id)}
                                    >
                                      {desc.title} ({desc.okpd2Code}
                                      {desc.ktruCode
                                        ? ` · КТРУ ${desc.ktruCode}`
                                        : ""}
                                      )
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {itemDesc ? (
                                itemDesc.characteristics.length > 0 ? (
                                  <ul className={block("item-ooz-list")}>
                                    {itemDesc.characteristics.map(
                                      (characteristic) => (
                                        <li key={characteristic.id}>
                                          <strong>
                                            {characteristic.name}:
                                          </strong>{" "}
                                          {formatCharacteristicValue(
                                            characteristic,
                                          )}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                ) : (
                                  <span className={block("hint")}>
                                    В выбранном ООЗ нет характеристик.
                                  </span>
                                )
                              ) : (
                                <span className={block("hint")}>
                                  Характеристики появятся после выбора ООЗ.
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className={block("link-btn")}
              disabled={isReadOnly}
              onClick={() => {
                const id = `item-${Date.now()}`;
                appendItem({
                  id,
                  objectDescriptionId: undefined,
                  name: "",
                  okpd2Code: "",
                  okpd2Name: "",
                  ktruCode: "",
                  ktruName: "",
                  unit: "",
                  quantity: "1",
                  unitPrice: "",
                  totalPrice: "",
                  nationalRegimeType: "none",
                  isSupplyDuringWorks: false,
                });
                expandItem(id);
              }}
            >
              + Добавить объект закупки
            </button>

            {/* Сводка по национальному режиму (ПП РФ N 1875): ожидаемый режим
                по перечням приложений N 1 и N 2 против выбранного в позициях */}
            {nationalRegimeValidation.expectedMode && (
              <div className={block("field", ["wide"])}>
                <span className={block("hint")}>
                  Национальный режим по ПП РФ № 1875: по объектам закупки
                  ожидается «
                  {nationalRegimeExpectedLabel(
                    nationalRegimeValidation.expectedMode,
                  )}
                  ».
                </span>
                {nationalRegimeValidation.issues.map((issue, issueIndex) => (
                  <span
                    key={`regime-${issue.code}-${issueIndex}`}
                    className={block(
                      issue.level === "error" ? "error" : "warning",
                    )}
                  >
                    {issue.message}
                  </span>
                ))}
              </div>
            )}
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
              <option value="">Выберите способ</option>
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

          {/* Критерии оценки заявок — рядом со способом закупки, чтобы было
              видно, за что и как оцениваются заявки */}
          {evaluationApplies && (
            <div className={block("field", ["wide"])}>
              <div className={block("evaluation-box")}>
                <div className={block("label-row")}>
                  <strong>Критерии оценки заявок (ПП РФ № 2604)</strong>
                  <span className={block("hint")}>
                    Сумма значимости критериев — 100%
                  </span>
                </div>
                <p className={block("hint")}>
                  {procedureApplicabilityHint[evaluationKind]}
                </p>

                <div className={block("grid")}>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-eval-category"
                    >
                      Категория объекта закупки (приложение N 2)
                    </label>
                    <select
                      id="note-eval-category"
                      className={block("select")}
                      {...register("evaluationObjectCategory")}
                    >
                      {OBJECT_CATEGORY_LIMITS.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <span className={block("hint")}>
                      Цена — не менее {evaluationLimits.minPrice}%, расходы —{" "}
                      {evaluationLimits.maxExpenses === null
                        ? "не применяются"
                        : `не более ${evaluationLimits.maxExpenses}%`}
                      , характеристики и квалификация — не более{" "}
                      {evaluationLimits.maxNonCost}%.
                    </span>
                  </div>

                  <div className={block("field")}>
                    <span className={block("label")}>
                      Связь с ОКПД2 позиции плана-графика
                    </span>
                    {detectedCategory.matches.length === 0 ? (
                      <span className={block("hint")}>
                        Коды ОКПД2 в объектах закупки не указаны — категория
                        выбрана вручную.
                      </span>
                    ) : (
                      <span className={block("hint")}>
                        {detectedCategory.matches
                          .map(
                            (match) =>
                              `${match.code} → ${
                                match.category
                                  ? objectCategoryLimits(match.category).label
                                  : "правило не найдено"
                              }`,
                          )
                          .join("; ")}
                        {detectedCategory.conflict
                          ? ". Объекты попали в разные категории — выберите категорию вручную."
                          : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className={block("evaluation-criteria")}>
                  {evaluationCriteria.map((criterion, index) => (
                    <div
                      className={block("evaluation-criterion")}
                      key={criterion.type}
                    >
                      <label className={block("checkbox")}>
                        <input
                          type="checkbox"
                          {...register(`evaluationCriteria.${index}.enabled`)}
                        />
                        <span>{criterionShortLabels[criterion.type]}</span>
                      </label>

                      {criterion.enabled && (
                        <>
                          <div className={block("evaluation-criterion-head")}>
                            <label className={block("label")}>
                              Значимость критерия, %
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              className={block("input", ["code"])}
                              {...register(
                                `evaluationCriteria.${index}.weightPercent`,
                              )}
                            />
                          </div>
                          <p className={block("hint")}>
                            {criterionFormulaText[criterion.type]}
                          </p>

                          {criterion.type !== "price" && (
                            <div className={block("indicator-list")}>
                              <span className={block("label")}>
                                Детализирующие показатели критерия (сумма
                                значимости — 100%)
                              </span>
                              {criterion.indicators.map((_, indicatorIndex) => (
                                <div
                                  className={block("indicator-row")}
                                  key={indicatorIndex}
                                >
                                  <input
                                    className={block("input")}
                                    placeholder="Наименование показателя"
                                    aria-label={`Показатель ${indicatorIndex + 1}`}
                                    {...register(
                                      `evaluationCriteria.${index}.indicators.${indicatorIndex}.name`,
                                    )}
                                  />
                                  <input
                                    className={block("input", ["code"])}
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    placeholder="%"
                                    aria-label={`Значимость показателя ${indicatorIndex + 1}, %`}
                                    {...register(
                                      `evaluationCriteria.${index}.indicators.${indicatorIndex}.weightPercent`,
                                    )}
                                  />
                                  <select
                                    className={block("select")}
                                    aria-label={`Направление оценки показателя ${indicatorIndex + 1}`}
                                    {...register(
                                      `evaluationCriteria.${index}.indicators.${indicatorIndex}.best`,
                                    )}
                                  >
                                    {BEST_DIRECTIONS.map((direction) => (
                                      <option key={direction} value={direction}>
                                        {bestDirectionLabels[direction]}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className={block("select")}
                                    aria-label={`Способ оценки показателя ${indicatorIndex + 1}`}
                                    {...register(
                                      `evaluationCriteria.${index}.indicators.${indicatorIndex}.scoring`,
                                    )}
                                  >
                                    {SCORING_MODES.map((mode) => (
                                      <option key={mode} value={mode}>
                                        {scoringModeLabels[mode]}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className={block("danger-btn")}
                                    onClick={() =>
                                      removeCriterionIndicator(
                                        index,
                                        indicatorIndex,
                                      )
                                    }
                                  >
                                    Удалить
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className={block("link-btn")}
                                onClick={() => addCriterionIndicator(index)}
                              >
                                + Добавить показатель
                              </button>
                              <span className={block("hint")}>
                                {indicatorFormulaHint}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {evaluationIssues.length > 0 && (
                  <div className={block("evaluation-issues")}>
                    {evaluationIssues.map((issue, index) => (
                      <div
                        key={`${issue.level}-${index}`}
                        className={block("alert-warning")}
                        role="alert"
                      >
                        {issue.level === "error" ? "Ошибка: " : "Внимание: "}
                        {issue.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <div className={block("field", ["wide"])}>
                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        {...register("deliveryTermFromContractDate")}
                      />
                      <span>С даты заключения контракта</span>
                    </label>
                  </div>
                  <div className={block("field")}>
                    <label
                      className={block("label")}
                      htmlFor="note-start-offset"
                    >
                      {watchedDeliveryFromContract
                        ? "Начало через (дней с даты заключения контракта)"
                        : "Начало через (дней с даты, указанной в закупке)"}
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
                    <label className={block("label")} htmlFor="note-start-date">
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
          {/* Верхний уровень раздела: НМЦК, аванс и сопровождение. Дальше
              идёт расшифровка — КБК, обоснование, файл и запрос. */}
          <div className={block("field", ["wide"])}>
            <div className={block("finance-summary")}>
              <div className={block("finance-summary-col")}>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="note-nmck">
                    НМЦК, рублей *
                  </label>
                  <MoneyInput
                    id="note-nmck"
                    className={block("input")}
                    value={watch("initialMaxPrice")}
                    ariaLabel="Начальная (максимальная) цена контракта"
                    onChange={(next) =>
                      setValue("initialMaxPrice", next ? String(next) : "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <span className={block("hint")}>
                    По умолчанию — сумма из обоснования, если расчёт выполнен;
                    иначе объём финансового обеспечения из плана-графика.
                  </span>
                  {errorText("initialMaxPrice") && (
                    <span className={block("error")}>
                      {errorText("initialMaxPrice")}
                    </span>
                  )}
                </div>

                <div className={block("field")}>
                  <span className={block("label")}>Аванс</span>
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
              </div>
            </div>
          </div>

          {/* Казначейское сопровождение — отдельный блок */}
          <div className={block("field", ["wide"])}>
            <div className={block("support-block")}>
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
                  <span>Не требуется</span>
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
                  <span>Требуется</span>
                </label>
              </div>
              {watchedTreasury && (
                <select
                  aria-label="Вид казначейского сопровождения"
                  className={block("select")}
                  {...register("treasurySupportType")}
                >
                  <option value="full">
                    Полное казначейское сопровождение
                  </option>
                  <option value="advance_only">
                    Казначейское сопровождение только аванса
                  </option>
                </select>
              )}
              <span className={block("hint")}>
                Казначейское сопровождение расчётов по контракту ведётся
                территориальным органом Федерального казначейства.
              </span>
            </div>
          </div>

          {/* Банковское сопровождение — отдельный блок */}
          <div className={block("field", ["wide"])}>
            <div className={block("support-block")}>
              <span className={block("label")}>Банковское сопровождение</span>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("requiresBankSupport")} />
                <span>Требуется банковское сопровождение контракта</span>
              </label>
              <span className={block("hint")}>
                Банковское сопровождение устанавливается отдельно от
                казначейского — по решению заказчика.
              </span>
            </div>
          </div>

          {/* КБК: суммы правятся по годам, «всего» считается; превышать
              объёмы плана-графика нельзя + запрос на изменение КБК/КВР */}
          <div className={block("field", ["wide"])}>
            <div className={block("kbk-box")}>
              <div className={block("label-row")}>
                <strong>КБК и финансирование по годам</strong>
                <span className={block("hint")}>
                  Годовые суммы правятся в пределах объёмов плана-графика,
                  «Всего» рассчитывается автоматически
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className={block("kbk-table")}>
                  <thead>
                    <tr>
                      <th>КБК</th>
                      {KBK_YEAR_COLUMNS.map((column) => (
                        <th key={column.field}>{column.label}</th>
                      ))}
                      <th title="Итог по КБК рассчитывается по годовым суммам и не редактируется">
                        Всего (расчёт), руб.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbkFundingRows.map((row) => (
                      <tr key={row.id}>
                        <td className={block("mono")}>
                          {row.kbk || "не указан"}
                        </td>
                        {KBK_YEAR_COLUMNS.map((column) => {
                          const amount = row[column.field] ?? 0;
                          const limit = row[column.limitField];
                          const overLimit =
                            limit !== null && amount - limit > 0.005;

                          return (
                            <td key={column.field}>
                              <div
                                className={block("kbk-cell", [
                                  overLimit ? "over" : "",
                                ])}
                              >
                                <MoneyInput
                                  className={block("input")}
                                  value={row[column.field] ?? ""}
                                  disabled={isReadOnly}
                                  ariaLabel={`${column.label} по КБК ${row.kbk || "без кода"}`}
                                  onChange={(next) =>
                                    setKbkFundingYear(row, column.field, next)
                                  }
                                />
                                {limit !== null && (
                                  <span
                                    className={block(
                                      overLimit ? "error" : "hint",
                                    )}
                                  >
                                    лимит ПГ: {formatRub(limit)}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          <strong>{formatRub(row.total)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {kbkLimitViolations.length > 0 && (
                <div className={block("warning")}>
                  Превышение объёмов плана-графика:{" "}
                  {kbkLimitViolations
                    .map(
                      (issue) =>
                        `${issue.kbk || "без кода"} (${issue.label}) — ${formatRub(issue.amount)} при лимите ${formatRub(issue.limit)}`,
                    )
                    .join("; ")}
                </div>
              )}

              <div className={block("kbk-summary")}>
                <span>
                  Итого по КБК: <strong>{formatRub(kbkFundingTotal)}</strong>
                </span>
                <span>
                  НМЦК: <strong>{formatRub(nmckValue)}</strong>
                </span>
                {Math.abs(kbkFundingDiff) > 0.01 && (
                  <span className={block("warning")}>
                    Расхождение: {formatRub(kbkFundingDiff)} — проверьте суммы
                    по КБК
                  </span>
                )}
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
                    disabled={!nmckRequestAllowed}
                    title={
                      nmckRequestAllowed
                        ? undefined
                        : "Сначала сформируйте ООЗ и отметьте, что набор объектов конечный"
                    }
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

              {!oozReady && (
                <div className={block("alert-warning")} role="status">
                  <strong>Сначала описание объекта закупки.</strong> Пока ООЗ не
                  сформирован и набор объектов не признан конечным, задание на
                  подготовку НМЦК и расчёт заблокированы: для сопоставимых цен
                  нужны идентичные или сопоставимые товары, а без описания
                  невозможно сформулировать запрос.
                  {nmckMethodSoft
                    ? " Для тарифного и затратного методов ограничение мягче, но их состав тоже может включать товар — проверьте описание."
                    : ""}
                </div>
              )}

              {watchedNmckCalculation && (
                <div className={block("nmck-card")}>
                  <div className={block("nmck-card-head")}>
                    <div className={block("card-title-inline")}>
                      {watchedNmckCalculation.method === "normative" ? (
                        <Scale size={15} aria-hidden="true" />
                      ) : watchedNmckCalculation.method === "tariff" ? (
                        <Landmark size={15} aria-hidden="true" />
                      ) : watchedNmckCalculation.method === "cost" ? (
                        <Layers size={15} aria-hidden="true" />
                      ) : (
                        <Calculator size={15} aria-hidden="true" />
                      )}
                      <span
                        className={block(
                          "nmck-badge",
                          watchedNmckCalculation.exceedsNormLimit ||
                            watchedNmckCalculation.tariffExpired
                            ? ["danger"]
                            : [],
                        )}
                      >
                        {NMCK_METHOD_LABELS[watchedNmckCalculation.method]}
                      </span>
                      <span className={block("hint")} style={{ marginTop: 0 }}>
                        от{" "}
                        {watchedNmckCalculation.calculationDate ||
                          watchedNmckCalculation.calculatedAt}
                        {watchedNmckCalculation.calculatorName
                          ? ` · ${watchedNmckCalculation.calculatorName}`
                          : ""}
                      </span>
                    </div>

                    <div className={block("header-actions")}>
                      <button
                        type="button"
                        className={block("mode-btn")}
                        disabled={isExportingNmckDocx || isExportingNmckPdf}
                        onClick={handleExportSavedNmckDocx}
                      >
                        <FileDown size={13} aria-hidden="true" />{" "}
                        {isExportingNmckDocx
                          ? "Формирование…"
                          : "Выгрузить (.docx)"}
                      </button>
                      <button
                        type="button"
                        className={block("mode-btn")}
                        disabled={isExportingNmckDocx || isExportingNmckPdf}
                        onClick={handleExportSavedNmckPdf}
                        title="Сформировать PDF-документ по стандартам 44-ФЗ с реквизитами заказчика"
                      >
                        <FileText size={13} aria-hidden="true" />{" "}
                        {isExportingNmckPdf ? "Формирование…" : "PDF (44-ФЗ)"}
                      </button>
                    </div>
                  </div>

                  {watchedNmckCalculation.method === "market_analysis" ? (
                    <>
                      <div className={block("nmck-kpis")}>
                        <div className={block("nmck-kpi")}>
                          <span>Итоговая НМЦК</span>
                          <strong>
                            {formatNmckMoney(watchedNmckCalculation.nmckTotal)}{" "}
                            ₽
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
                  ) : watchedNmckCalculation.method === "normative" ? (
                    <>
                      <div className={block("nmck-kpis")}>
                        <div className={block("nmck-kpi")}>
                          <span>Итоговая НМЦК</span>
                          <strong>
                            {formatNmckMoney(watchedNmckCalculation.nmckTotal)}{" "}
                            ₽
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
                  ) : watchedNmckCalculation.method === "tariff" ? (
                    <>
                      <div className={block("nmck-kpis")}>
                        <div className={block("nmck-kpi")}>
                          <span>Итоговая НМЦК</span>
                          <strong>
                            {formatNmckMoney(watchedNmckCalculation.nmckTotal)}{" "}
                            ₽
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Регулируемый тариф</span>
                          <strong>
                            {formatNmckMoney(
                              watchedNmckCalculation.tariffUnitPrice ??
                                watchedNmckCalculation.meanUnitPrice,
                            )}{" "}
                            ₽ / {watchedNmckCalculation.unit}
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Объём (кол-во)</span>
                          <strong>
                            {watchedNmckCalculation.quantity}{" "}
                            {watchedNmckCalculation.unit}
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Срок действия тарифа</span>
                          <strong>
                            {watchedNmckCalculation.tariffValidTo
                              ? `до ${watchedNmckCalculation.tariffValidTo}`
                              : "не указан"}
                          </strong>
                        </div>
                      </div>
                      <p className={block("hint")} style={{ marginTop: 0 }}>
                        <strong>Официальный источник:</strong>{" "}
                        {watchedNmckCalculation.tariffSourceName || "—"}
                        {watchedNmckCalculation.tariffDocument
                          ? ` · Акт: ${watchedNmckCalculation.tariffDocument}`
                          : ""}
                      </p>
                      {watchedNmckCalculation.tariffExpired && (
                        <div className={block("alert-warning")} role="alert">
                          Внимание: срок действия выбранного тарифа (
                          {watchedNmckCalculation.tariffValidTo}) истёк на дату
                          расчёта.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={block("nmck-kpis")}>
                        <div className={block("nmck-kpi")}>
                          <span>Итоговая НМЦК</span>
                          <strong>
                            {formatNmckMoney(watchedNmckCalculation.nmckTotal)}{" "}
                            ₽
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Сумма статей затрат</span>
                          <strong>
                            {formatNmckMoney(
                              watchedNmckCalculation.costSubtotal ?? 0,
                            )}{" "}
                            ₽
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Коэффициент прибыли / прибыль</span>
                          <strong>
                            k ={" "}
                            {(
                              watchedNmckCalculation.costProfitCoeff ?? 1
                            ).toFixed(2)}{" "}
                            (+
                            {formatNmckMoney(
                              watchedNmckCalculation.costProfitAmount ?? 0,
                            )}{" "}
                            ₽)
                          </strong>
                        </div>
                        <div className={block("nmck-kpi")}>
                          <span>Расчётная цена единицы</span>
                          <strong>
                            {formatNmckMoney(
                              watchedNmckCalculation.costUnitPrice ??
                                watchedNmckCalculation.meanUnitPrice,
                            )}{" "}
                            ₽ / {watchedNmckCalculation.unit}
                          </strong>
                        </div>
                      </div>
                      {watchedNmckCalculation.costItems &&
                        watchedNmckCalculation.costItems.length > 0 && (
                          <div style={{ overflowX: "auto" }}>
                            <table className={block("nmck-table")}>
                              <thead>
                                <tr>
                                  <th>№</th>
                                  <th>Категория и статья затрат</th>
                                  <th>Обоснование</th>
                                  <th>Стоимость, ₽</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculateCostNmck({
                                  quantity: watchedNmckCalculation.quantity,
                                  costInputScope:
                                    watchedNmckCalculation.costInputScope,
                                  items: watchedNmckCalculation.costItems,
                                  profitCoeff:
                                    watchedNmckCalculation.costProfitCoeff ?? 1,
                                }).evaluatedItems.map((row, idx) => (
                                  <tr key={row.item.id}>
                                    <td>{idx + 1}</td>
                                    <td>
                                      [
                                      {
                                        COST_ITEM_CATEGORY_LABELS[
                                          row.item.category ?? "other"
                                        ]
                                      }
                                      ] {row.item.name || "—"}
                                    </td>
                                    <td>{row.item.basis || "—"}</td>
                                    <td>
                                      <strong>
                                        {row.isValidAmount
                                          ? formatNmckMoney(row.numericAmount)
                                          : "—"}
                                      </strong>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      {watchedNmckCalculation.costProfitBasis && (
                        <p className={block("hint")} style={{ marginTop: 0 }}>
                          <strong>Обоснование прибыли:</strong>{" "}
                          {watchedNmckCalculation.costProfitBasis}
                        </p>
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

              {/* Подписанная НМЦК: подпись в системе и притягивание в карточку */}
              <div className={block("signature-box")}>
                <div className={block("label-row")}>
                  <strong>
                    Подписанная НМЦК (электронная подпись заказчика)
                  </strong>
                  <div className={block("header-actions")}>
                    {signedNmckEvent && (
                      <button
                        type="button"
                        className={block("mode-btn")}
                        onClick={() => applyNmckSignature(signedNmckEvent)}
                        disabled={isReadOnly}
                      >
                        <FileCheck2 size={13} aria-hidden="true" /> Притянуть
                        подписанную НМЦК
                      </button>
                    )}
                    <button
                      type="button"
                      className={block("btn-accent")}
                      onClick={() => setShowNmckSign(true)}
                      disabled={!canSignNmck}
                      title={canSignNmck ? undefined : nmckSignHint}
                    >
                      <PenLine size={14} aria-hidden="true" /> Подписать НМЦК
                    </button>
                  </div>
                </div>

                {watchedNmckSignature ? (
                  <div className={block("signature-meta")}>
                    <span>
                      <strong>Подписано:</strong>{" "}
                      {watchedNmckSignature.signedAt || "—"}
                      {watchedNmckSignature.signedBy
                        ? ` · ${watchedNmckSignature.signedBy}`
                        : ""}
                    </span>
                    <span>
                      <strong>Сертификат:</strong>{" "}
                      {watchedNmckSignature.certificateOwner || "—"}
                      {watchedNmckSignature.certificateSerial
                        ? ` · ${watchedNmckSignature.certificateSerial}`
                        : ""}
                      {watchedNmckSignature.certificateInn
                        ? ` · ИНН ${watchedNmckSignature.certificateInn}`
                        : ""}
                    </span>
                    <span>
                      <strong>Файл:</strong>{" "}
                      {watchedNmckSignature.fileName ||
                        watchedNmckFileName ||
                        "не указан"}
                      {watchedNmckSignature.fileUpdatedAt
                        ? ` (от ${watchedNmckSignature.fileUpdatedAt})`
                        : ""}
                    </span>
                  </div>
                ) : signedNmckEvent ? (
                  <span className={block("hint")}>
                    В журнале ЭП найдена подписанная НМЦК от{" "}
                    {signedNmckEvent.createdAt}
                    {signedNmckEvent.certificateOwner
                      ? ` (${signedNmckEvent.certificateOwner})`
                      : ""}
                    . Нажмите «Притянуть подписанную НМЦК», чтобы подставить её
                    в служебную записку.
                  </span>
                ) : (
                  <span className={block("hint")}>{nmckSignHint}</span>
                )}

                {nmckSignMessage && (
                  <div className={block("alert-warning")} role="status">
                    {nmckSignMessage}
                  </div>
                )}
              </div>

              {/* Проверка поставщиков КП по реестру МСП и рекомендация по СМП */}
              <div className={block("smp-check")}>
                <div className={block("label-row")}>
                  <strong>
                    Проверка поставщиков по реестру МСП (ст. 30 Закона № 44-ФЗ)
                  </strong>
                  <span className={block("hint")} style={{ marginTop: 0 }}>
                    КП в выборке: {smpComposition.total}
                  </span>
                </div>

                {smpComposition.total === 0 ? (
                  <span className={block("hint")}>
                    Коммерческие предложения не заполнены — проверять нечего.
                    Сформируйте расчёт НМЦК или добавьте КП вручную.
                  </span>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table className={block("nmck-table")}>
                        <thead>
                          <tr>
                            <th>№</th>
                            <th>Поставщик</th>
                            <th>ИНН</th>
                            <th>Реестр МСП</th>
                          </tr>
                        </thead>
                        <tbody>
                          {smpComposition.rows.map((row, idx) => (
                            <tr key={row.offer.id}>
                              <td>{idx + 1}</td>
                              <td>{row.offer.supplierName || "—"}</td>
                              <td className={block("mono")}>
                                {row.offer.supplierInn || "—"}
                              </td>
                              <td>
                                {row.status === "smp" ? (
                                  <span className={block("smp-status", ["ok"])}>
                                    {row.entry?.category
                                      ? smpRegistryCategoryLabels[
                                          row.entry.category
                                        ]
                                      : "СМП"}
                                  </span>
                                ) : row.status === "not_smp" ? (
                                  <span className={block("smp-status", ["no"])}>
                                    не в реестре
                                  </span>
                                ) : (
                                  <span
                                    className={block("smp-status", ["unknown"])}
                                  >
                                    нужен ИНН
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {smpComposition.recommendation && (
                      <div className={block("smp-recommendation")}>
                        <div className={block("smp-recommendation-head")}>
                          <strong>{smpComposition.recommendation.title}</strong>
                          <span
                            className={block("hint")}
                            style={{ marginTop: 0 }}
                          >
                            СМП: {smpComposition.smpCount} из{" "}
                            {smpComposition.total} ·{" "}
                            {smpComposition.smpSharePercent.toFixed(0)}%
                          </span>
                        </div>
                        <p className={block("hint")} style={{ marginTop: 0 }}>
                          {smpComposition.recommendation.reason}
                        </p>
                        {smpComposition.recommendation.mode !== "none" && (
                          <button
                            type="button"
                            className={block("btn-accent")}
                            onClick={applySmpRecommendation}
                            disabled={isReadOnly}
                          >
                            <ShieldCheck size={14} aria-hidden="true" />{" "}
                            Применить рекомендацию
                          </button>
                        )}
                      </div>
                    )}

                    {smpApplyMessage && (
                      <div className={block("alert-warning")} role="status">
                        {smpApplyMessage}
                      </div>
                    )}
                  </>
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
                    disabled={!nmckRequestAllowed}
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
                  organization={organization ?? plan.customer ?? null}
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
                    // Единственный КБК по умолчанию следует за НМЦК, если
                    // заказчик ещё не корректировал суммы по годам: раскладываем
                    // НМЦК пропорционально объёмам ПГ, не превышая лимиты
                    if (kbkFundingRows.length === 1) {
                      const onlyRow = kbkFundingRows[0];
                      const hasOverride = watchedKbkFunding.some(
                        (row) => row.id === onlyRow.id,
                      );
                      if (!hasOverride) {
                        distributeNmckAcrossYears(onlyRow, record.nmckTotal);
                      }
                    }
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
                    Наличие на праве собственности или на ином законном
                    основании производственных мощностей и технологического
                    оборудования для исполнения государственного контракта (п. 1
                    ПП РФ от 25.12.2014 № 1482)
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
                    Дополнительные требования к участникам по ч. 2 ст. 31 Закона
                    № 44-ФЗ (ПП РФ от 29.12.2021 № 2571)
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
                    (подрядчика, исполнителя) от исполнения контракта по причине
                    введения в отношении заказчика санкций и (или) мер
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
                    <label
                      className={block("label")}
                      htmlFor="note-app-sec-pct"
                    >
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

      {showNmckSign && editingNoteId !== undefined && editingNoteId !== "" && (
        <EdsSignModal
          action="nmck_confirm"
          entityType="nmck"
          entityId={editingNoteId}
          documentLabel={`Обоснование НМЦК по СЗ № ${watch("noteNumber") || editingNoteId} от ${watch("noteDate") || "б/н"}`}
          onClose={() => setShowNmckSign(false)}
          onSigned={handleNmckSigned}
        />
      )}

      <footer className={block("footer")}>
        {errorText("root") && (
          <span className={block("error")}>{errorText("root")}</span>
        )}
        {nationalRegimeValidation.hasErrors && (
          <span className={block("error")}>
            {nationalRegimeValidation.summary}
          </span>
        )}
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
            disabled={
              isBusy || isReadOnly || nationalRegimeValidation.blocksSave
            }
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
              disabled={
                isBusy || isReadOnly || nationalRegimeValidation.blocksSave
              }
              onClick={() => {
                proceedAfterSaveRef.current = true;
              }}
            >
              {isBusy ? "Подготовка..." : "Сохранить и перейти к извещению →"}
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}
