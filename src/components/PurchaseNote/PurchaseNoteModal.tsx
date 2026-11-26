import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calculator,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  Scale,
  Upload,
  X,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import MoneyInput from "../UI/MoneyInput/MoneyInput";
import CustomCheckbox from "../UI/CustomCheckbox";
import CustomSelect from "../UI/CustomSelect";
import AddressCascade from "../UI/AddressCascade/AddressCascade";
import SecurityRequisitesFields from "./SecurityRequisitesFields";
import PurchaseNoteStatusBadge from "./PurchaseNoteStatusBadge";
import PurchaseNoteSectionActions from "./PurchaseNoteSectionActions";
import OozPickerModal from "./OozPickerModal";
import {
  PurchaseNoteSchema,
  emptyDeliveryPlace,
  emptyPurchaseNote,
  filterVisiblePurchaseNotes,
  hasSmpSubcontractingRequirement,
  isDraftLikePurchaseNote,
  mergePurchaseNoteFiles,
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
  useAttachNoticeAttachment,
  useNotices,
} from "../../services/Procurements/noticeInfo.api";
import { buildNmckJustificationAttachment } from "../../services/Procurements/noticeAttachment.schema";
import {
  exportPurchaseNoteToDocx,
  exportPurchaseNoteToPdf,
} from "../../services/PurchaseNote/purchaseNoteExport";
import { useCreateTask, useUpdateTask } from "../../services/Tasks/tasks.api";
import { emptyTask, type Task } from "../../services/Tasks/tasks.schema";
import { contractServiceRoster } from "../../services/ContractService/contractService.config";
import {
  addDays,
  DEFECT_LIST_REVIEW_DAYS,
} from "../../services/DefectList/defectList.schema";
import {
  useOrganizationObjectDescriptions,
  useUpdateObjectDescription,
} from "../../services/ObjectDescription/objectDescription.api";
import { usePurchaseObjects } from "../../services/PurchaseObject/purchaseObject.api";
import type { PurchaseObject } from "../../services/PurchaseObject/purchaseObject.schema";
import {
  ORGANIZATION_BUDGET_LEVEL_LABELS,
  type BudgetPart13Art44Requisites,
  type OrganizationSecurityAccount,
} from "../../services/Organization/organization.schema";
import { useUpdateOrganization } from "../../services/Organization/organization.api";
import { MINIMUM_SMP_REQUIRED_PERCENT } from "../../services/ContractSmp/pp1466";
import { useContractSmpRecordsBatch } from "../../services/ContractSmp/contractSmp.api";
import { smpVolumeSources } from "../../services/ContractSmp/contractSmp.schema";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import { buildContractProjectDraft } from "../../services/ContractProject/contractProjectPrefill";
import { validateSecurityNorms } from "../../services/Security/securityNorms";
import {
  buildContractDocument,
  formatContractDate,
  type ContractDocument,
} from "../../services/ContractProject/contractDocument";
import {
  COST_ITEM_CATEGORY_LABELS,
  MARKET_PRICE_SOURCE_SHORT,
  NMCK_METHOD_LABELS,
  type NmckCalculationRecord,
} from "../../services/Nmck/nmck.schema";
import {
  calculateCostNmck,
  calculateMarketNmck,
  exportNmckCalculationToDocx,
  exportNmckCalculationToPdf,
  formatNmckMoney,
} from "../../services/Nmck/marketNmck";
import {
  isContestPlacingWay,
  validatePlacingWayAgainstAuctionList,
} from "../../services/Okpd2Ref/auctionListControl";
import {
  checkSmpRequirements,
  validateSmpMixing,
} from "../../services/Okpd2Ref/smpControl";
import {
  checkOkpd2NationalRegime,
  isAdvantageApplicable,
  nationalRegimeExpectedLabel,
  nationalRegimeModeLabel,
  recommendNationalRegime,
  validateNationalRegime,
} from "../../services/NationalRegime/pp1875";
import { okpd2Signal } from "../../../scripts/lib/civil-law-core.mjs";
import {
  BEST_DIRECTIONS,
  SCORING_MODES,
  bestDirectionLabels,
  criterionFormulaText,
  criterionShortLabels,
  defaultCriteria,
  detectObjectCategory,
  indicatorFormulaHint,
  indicatorKindLabels,
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
import { usePp2604MappingOrDefault } from "../../services/Pp2604/pp2604.api";
import {
  okpd2RefForChecks,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import { useKtruDictionary } from "../../services/KtruRef/ktruRef.api";
import { checkKtruUsage } from "../../services/KtruRef/ktruControl";
import { LIFECYCLE_CASES_PP1087, PLACING_WAYS_ALL } from "../../services/Procurements/noticeInfo.config";
import {
  buildPp2571RequirementText,
  normalizePp2571Positions,
  validatePp2571Requirements,
  type Pp2571Issue,
} from "../../services/Pp2571/pp2571.schema";
import Pp2571RequirementsPanel from "./Pp2571RequirementsPanel";

import { formatDeliveryAddress } from "../../services/AddressRef/addressRef.schema";
import {
  formatCharacteristicValue,
  getObjectDescriptionOkpd2Codes,
  isEmbeddedSupplyProductType,
  type ObjectDescription,
} from "../../services/ObjectDescription/objectDescription.schema";
import {
  positionKbkCodes,
  positionKbkEntries,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import styles from "./PurchaseNoteModal.module.scss";
import Select from "../UI/Select";

/**
 * Полноэкранная форма «Сформировать потребность» (служебная записка по позиции ПГ).
 *
 * Реализует правила Закона № 44-ФЗ и приказа Минфина РФ № 158н:
 * - право правки ограничено полномочиями в КС (неавторизованным — режим чтения);
 * - КБК наследуется из ПГ без правки (несогласие доступно планировщику/согласующему);
 * - признак неопределённого объёма (ч. 24 ст. 22) задаётся в ООЗ и только
 *   переносится в СЗ — отдельного переключателя над объектами нет;
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

// Сумма без знака рубля: единица измерения уже указана в заголовке графы
const formatRub = (value: string | number | undefined): string => {
  const num = toNumber(value);
  if (num === null) return "—";
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)}`;
};

/**
 * Объекты СЗ создаются только из ООЗ. Источник состава — отдельная коллекция
 * `purchaseObjects`: у каждого объекта свой код ОКПД2, КТРУ, единица,
 * количество и характеристики. Для старых ООЗ без отдельных объектов
 * сохраняется совместимость — позиции строятся по плоскому списку кодов.
 * Ручного добавления/удаления объектов в служебной записке нет.
 */
const buildNoteItemsFromOoz = (
  desc: ObjectDescription,
  position: PurchasePlanPosition,
  objects: PurchaseObject[] = [],
  existingItems: PurchaseNoteObjectItem[] = [],
): PurchaseNoteObjectItem[] => {
  const descriptionObjects = objects.filter(
    (item) =>
      item.objectDescriptionId !== undefined &&
      String(item.objectDescriptionId) === String(desc.id),
  );
  const descriptionCodes = getObjectDescriptionOkpd2Codes(desc);
  // ООЗ без кода ОКПД2 всё равно должна дать одну позицию — иначе СЗ
  // останется без объектов и её нельзя будет сохранить.
  const codes = descriptionCodes.length
    ? descriptionCodes
    : [{ code: position.okpd2Code ?? "", name: position.okpd2Name }];
  const fallbackItems = codes.map(({ code, name }, idx) => ({
    id: `item-${idx + 1}`,
    objectDescriptionId: desc.id,
    name: desc.title,
    okpd2Code: code,
    okpd2Name: name ?? desc.okpd2Name ?? "",
    ktruCode: desc.ktruCode ?? "",
    ktruName: desc.ktruName ?? "",
    unit: desc.unit ?? "",
    quantity: desc.isIndeterminateVolume ? "1" : desc.quantity || "1",
    unitPrice: "",
    totalPrice: "",
    nationalRegimeType: "none" as const,
    // «Товар при работе/услуге» задаётся в ООЗ и наследуется СЗ.
    isSupplyDuringWorks: isEmbeddedSupplyProductType(desc.productType),
  }));
  const items = descriptionObjects.length
    ? descriptionObjects.map((object, idx) => ({
        id: `item-${idx + 1}`,
        objectDescriptionId: desc.id,
        purchaseObjectId: object.id,
        name: object.name || desc.title,
        okpd2Code: object.okpd2Code,
        okpd2Name: object.okpd2Name ?? desc.okpd2Name ?? "",
        ktruCode: object.ktruCode ?? desc.ktruCode ?? "",
        ktruName: object.ktruName ?? desc.ktruName ?? "",
        unit: object.unit ?? desc.unit ?? "",
        quantity:
          desc.isIndeterminateVolume || object.isIndeterminateVolume
            ? "1"
            : object.quantity || desc.quantity || "1",
        unitPrice: "",
        totalPrice: "",
        nationalRegimeType: "none" as const,
        isSupplyDuringWorks: isEmbeddedSupplyProductType(
          object.productType ?? desc.productType,
        ),
      }))
    : fallbackItems;

  // При пересборке состава из ООЗ сохраняем установленный в СЗ национальный
  // режим: позиции сопоставляются по коду ОКПД2.
  const itemsWithRegime = items.map((item) => {
    const prev = existingItems.find(
      (existing) =>
        Boolean(existing.okpd2Code) && existing.okpd2Code === item.okpd2Code,
    );
    return prev
      ? {
          ...item,
          nationalRegimeType: prev.nationalRegimeType,
          imposibilityBan: prev.imposibilityBan,
          imposibilityBanReason: prev.imposibilityBanReason,
        }
      : item;
  });

  const total = String(position.amountTotal ?? "");
  const totalNumber = toNumber(total) ?? 0;
  return itemsWithRegime.map((item) => ({
    ...item,
    totalPrice:
      totalNumber > 0
        ? (totalNumber / itemsWithRegime.length).toFixed(2)
        : total,
  }));
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

/**
 * Графы финансирования по КБК. Подписи — конкретные годы плана-графика,
 * а не «текущий год / 1-й год планового периода»: пользователю нужно видеть
 * календарный год, к которому относится сумма.
 */
const kbkYearColumns = (
  baseYear: number,
): {
  field: KbkYearField;
  limitField: KbkLimitField;
  label: string;
}[] => [
  {
    field: "amountCurrentYear",
    limitField: "limitCurrentYear",
    label: `Сумма на ${baseYear} год, руб.`,
  },
  {
    field: "amountPlanPeriodFirstYear",
    limitField: "limitPlanPeriodFirstYear",
    label: `Сумма на ${baseYear + 1} год, руб.`,
  },
  {
    field: "amountPlanPeriodSecondYear",
    limitField: "limitPlanPeriodSecondYear",
    label: `Сумма на ${baseYear + 2} год, руб.`,
  },
  {
    field: "amountSubsequentYears",
    limitField: "limitSubsequentYears",
    label: "Сумма на последующие годы, руб.",
  },
];

// Варианты «Национального режима» в позиции СЗ. Агент ПП РФ № 1875 помечает
// рекомендованный вариант и ставит его первым в списке.
const REGIME_OPTION_LABELS: Record<string, string> = {
  none: "нет",
  ban: "запрет",
  restriction: "ограничение",
  advantage: "преимущество",
};

const REGIME_OPTION_ORDER = [
  "none",
  "ban",
  "restriction",
  "advantage",
] as const;

// Подписи статусов проекта контракта в плашке основания превью
const CONTRACT_PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "черновик",
  published: "опубликован",
  signed: "подписан",
  terminated: "расторгнут",
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
  const location = useLocation();
  const navigate = useNavigate();
  const {
    organization,
    employee,
    contractService,
    isLoading: isRoleLoading,
    canEditPurchaseNote,
    canEditCustomerRequisites,
    purchaseNoteDeniedReason,
  } = useMyContractRole();
  const isReadOnly = !canEditPurchaseNote;

  const { data: existingNotes = [] } = usePurchaseNotes(organizationId);
  const visibleExistingNotes = useMemo(
    () => filterVisiblePurchaseNotes(existingNotes),
    [existingNotes],
  );
  const { mapping } = usePp2604MappingOrDefault();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: ktruRefs = [] } = useKtruDictionary();
  const { data: allObjectDescriptions = [] } =
    useOrganizationObjectDescriptions(organizationId);
  // Объекты закупки из ООЗ: СЗ получает их состав целиком, без ручного
  // добавления позиций и без плоского списка кодов ОКПД2.
  const { data: purchaseObjects = [], isLoading: purchaseObjectsLoading } =
    usePurchaseObjects(organizationId);
  // Журнал ЭП: по нему находим уже подписанную НМЦК этой служебной записки
  const { data: signatureEvents = [] } = useSignatureEvents(organizationId);
  const logSignatureEvent = useLogSignatureEvent();
  const objectDescriptions = allObjectDescriptions.filter(
    (item) => item.kind === "object_description",
  );

  const positionNotes = useMemo(
    () => purchaseNotesForPosition(visibleExistingNotes, position.id),
    [visibleExistingNotes, position.id],
  );

  const createNote = useCreatePurchaseNote();
  const updateNote = useUpdatePurchaseNote();
  // Утверждение ООЗ доступно прямо из блока 2 СЗ: без этого перехода разделы
  // НМЦК и требований остаются закрытыми, даже если у пользователя есть права.
  const updateObjectDescription = useUpdateObjectDescription();
  // Обоснование НМЦК — документ Раздела 2 извещения: при сохранении СЗ он
  // прикладывается к связанному извещению, а не только остаётся в записке.
  const { data: notices = [] } = useNotices();
  const attachToNotice = useAttachNoticeAttachment();
  const updateOrganization = useUpdateOrganization();

  const [editingNoteId, setEditingNoteId] = useState<
    string | number | undefined
  >(initialNote?.id);
  const [requisitesSyncMessage, setRequisitesSyncMessage] = useState<
    string | null
  >(null);
  const [showNmckSign, setShowNmckSign] = useState(false);
  const [nmckSignMessage, setNmckSignMessage] = useState<string | null>(null);
  // Модалка «Есть ли подготовленное ООЗ?» показывается при создании новой СЗ,
  // пока не выбрано описание объекта закупки.
  const [showOozPicker, setShowOozPicker] = useState(() => !initialNote);
  const [isExportingNmckDocx, setIsExportingNmckDocx] = useState(false);
  const [isExportingNmckPdf, setIsExportingNmckPdf] = useState(false);
  // Период для анализа практики привлечения СМП: по умолчанию прошлый год
  const smpPracticeBaseYear = new Date().getFullYear() - 1;
  const [smpPracticeYear, setSmpPracticeYear] = useState(smpPracticeBaseYear);
  const smpPracticeYears = useMemo(
    () => [
      smpPracticeBaseYear,
      smpPracticeBaseYear - 1,
      smpPracticeBaseYear - 2,
    ],
    [smpPracticeBaseYear],
  );
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const proceedAfterSaveRef = useRef(false);
  // Целевой статус кнопки согласования: обычный переход или запрос решения КС
  // по исключению нацрежима (сначала создаётся системная задача).
  type WorkflowTarget = PurchaseNoteStatus | "ks_review";
  const workflowStatusRef = useRef<WorkflowTarget | null>(null);
  // Раскрытые для правки объекты закупки: после «Сохранить» позиция
  // сворачивается в короткую строку.
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const isItemExpanded = (id: string) => expandedItemIds.has(id);
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

  // Коды ОКПД2 позиций плана-графика и связанных ООЗ: объекты СЗ приходят
  // из ООЗ целиком, поэтому дополнительные коды тоже должны проходить сверку.
  const allowedOkpd2Codes = useMemo(() => {
    const codes = new Set<string>();
    const add = (code?: string | null) => {
      const trimmed = code?.trim();
      if (trimmed) codes.add(trimmed);
    };
    plan.positions.forEach((planPosition) => {
      add(planPosition.okpd2Code);
      planPosition.okpd2Items?.forEach((item) => add(item.okpd2Code));
    });
    objectDescriptions
      .filter(
        (desc) =>
          (position.id !== undefined &&
            desc.positionId !== undefined &&
            String(desc.positionId) === String(position.id)) ||
          (Boolean(position.identificationCode) &&
            desc.ikz === position.identificationCode),
      )
      .forEach((desc) =>
        getObjectDescriptionOkpd2Codes(desc).forEach((item) => add(item.code)),
      );
    return codes.size > 0 ? Array.from(codes) : undefined;
  }, [plan, objectDescriptions, position]);
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
    // Годовая разбивка финансирования заполняется сразу по всем кодам ПГ.
    // Ранее в СЗ попадал только первый КБК, а лимиты по остальным кодам
    // считались пустыми — НМЦК нельзя было проверить по детализации плана.
    const initialFundingAmounts = kbkEntries.map((entry, idx) => ({
      id: `kbk-${idx}`,
      kbk: entry.kbk,
      amountCurrentYear: String(entry.amountCurrentYear ?? ""),
      amountPlanPeriodFirstYear: String(entry.amountPlanPeriodFirstYear ?? ""),
      amountPlanPeriodSecondYear: String(
        entry.amountPlanPeriodSecondYear ?? "",
      ),
      amountSubsequentYears: String(entry.amountSubsequentYears ?? ""),
    }));

    if (note) {
      // Признак объёма хранится в ООЗ. Старое поле СЗ остаётся фолбэком только
      // для записей без связанного описания.
      const noteOoz =
        objectDescriptions.find(
          (desc) =>
            (note.objectDescriptionId !== undefined &&
              String(desc.id) === String(note.objectDescriptionId)) ||
            (note.items ?? []).some(
              (item) =>
                item.objectDescriptionId !== undefined &&
                String(item.objectDescriptionId) === String(desc.id),
            ),
        ) ?? autoMatchedDesc;
      const noteIndeterminate =
        noteOoz?.isIndeterminateVolume ?? note.isIndeterminateVolume ?? false;

      const legacyItems: PurchaseNoteObjectItem[] =
        note.items && note.items.length > 0
          ? note.items.map((item) => {
              // КТРУ наследуется из карточки ООЗ: СЗ, сохранённая до
              // подстановки КТРУ, может нести объект без кода, хотя в ООЗ
              // позиция уже выбрана.
              if (item.ktruCode) return item;
              const itemOoz =
                objectDescriptions.find(
                  (desc) =>
                    item.objectDescriptionId !== undefined &&
                    String(desc.id) === String(item.objectDescriptionId),
                ) ?? noteOoz;
              return itemOoz?.ktruCode
                ? {
                    ...item,
                    ktruCode: itemOoz.ktruCode,
                    ktruName: item.ktruName || itemOoz.ktruName || "",
                  }
                : item;
            })
          : [
              {
                id: "item-1",
                objectDescriptionId: note.objectDescriptionId ?? undefined,
                name: note.subject || position.objectOfPurchase || "",
                okpd2Code: note.okpd2Code || position.okpd2Code || "",
                okpd2Name: note.okpd2Name || position.okpd2Name || "",
                // КТРУ берём из связанного ООЗ, снимок позиции ПГ — фолбэк.
                ktruCode: noteOoz?.ktruCode || position.ktruCode || "",
                ktruName: noteOoz?.ktruName || position.ktruName || "",
                // ktruCode/ktruName живут в items и в ООЗ; верхний уровень СЗ
                // их не хранит, поэтому берём снимок из позиции ПГ.
                unit: note.unit || "",
                quantity: noteIndeterminate ? "1" : note.quantity || "1",
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
        isIndeterminateVolume: noteIndeterminate,
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
        purchaseNumber:
          note.purchaseNumber || String(position.purchaseNumber ?? ""),
        plannedPlacementYear:
          note.plannedPlacementYear ?? position.plannedPlacementYear ?? "",
        positionStatus: note.positionStatus || position.status || "",
        positionStatusDate:
          note.positionStatusDate || position.statusDate || "",
        ikz: note.ikz || position.identificationCode || "",
        kbk: defaultKbk || note.kbk || "",
        kbkFundingAmounts:
          note.kbkFundingAmounts && note.kbkFundingAmounts.length > 0
            ? note.kbkFundingAmounts
            : initialFundingAmounts,
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
        pp2571Positions: normalizePp2571Positions(note.pp2571Positions),
        // Требование ч. 1.1 ст. 31 обязательно для всех закупок: значение
        // из старой записи не может его отключить
        requirementsPart1_1Art31: true,
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
      noteNumber: nextPurchaseNoteNumber(visibleExistingNotes),
      purchasePlanId: plan.id,
      purchasePlanNumber: plan.planNumber,
      positionId: position.id,
      positionSerialNumber: String(position.serialNumber ?? ""),
      positionUniqueNumber: String(position.uniqueNumber ?? ""),
      purchaseNumber: String(position.purchaseNumber ?? ""),
      plannedPlacementYear: position.plannedPlacementYear ?? "",
      positionStatus: position.status ?? "",
      positionStatusDate: position.statusDate ?? "",
      ikz: position.identificationCode || "",
      initiatorEmployeeId: defaultInitiatorEmployee?.id,
      initiatorName: defaultInitiatorText,
      objectDescriptionId: autoMatchedDesc?.id ?? undefined,
      authorizedBodyName: position.authorizedBodyName || "",
      jointOrganizerName: position.jointOrganizerName || "",
      kbk: defaultKbk,
      kbkFundingAmounts: initialFundingAmounts,
      budgetLevel: orgBudgetLevelLabel,
      fundingSource: orgBudgetLevelLabel,
      subject: position.objectOfPurchase || autoMatchedDesc?.title || "",
      isIndeterminateVolume: autoMatchedDesc?.isIndeterminateVolume ?? false,
      items: autoMatchedDesc
        ? buildNoteItemsFromOoz(
            autoMatchedDesc,
            position,
            purchaseObjects,
            getValues("items") ?? [],
          )
        : [
            {
              id: "item-1",
              name: position.objectOfPurchase || "",
              okpd2Code: position.okpd2Code || "",
              okpd2Name: position.okpd2Name || "",
              ktruCode: position.ktruCode || "",
              ktruName: position.ktruName || "",
              unit: "",
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
    setError,
    getValues,
    reset,
    formState: { errors },
  } = methods;

  const { fields: itemFields, replace } = useFieldArray({
    control,
    name: "items",
  });

  // Возврат из конструктора ООЗ: описание приходит в query, объекты СЗ
  // пересоздаются целиком по всем объектам ООЗ. Выборочное ручное добавление
  // здесь больше не нужно — ООЗ единственный источник состава объектов.
  // Один и тот же id применяем один раз, иначе перезагрузка справочника
  // затёр бы пользовательские правки реквизитов позиций.
  const appliedOozQueryIdRef = useRef<string | null>(null);
  useEffect(() => {
    const oozId = new URLSearchParams(location.search).get("oozId");
    if (!oozId || isReadOnly || appliedOozQueryIdRef.current === oozId) return;
    const desc = objectDescriptions.find((item) => String(item.id) === oozId);
    if (!desc) return;
    appliedOozQueryIdRef.current = oozId;
    setValue("objectDescriptionId", oozId, { shouldDirty: true });
    // Признак объёма не редактируется в СЗ — он приходит из выбранного ООЗ
    setValue("isIndeterminateVolume", Boolean(desc.isIndeterminateVolume), {
      shouldDirty: true,
    });
    setValue(
      "items",
      buildNoteItemsFromOoz(
        desc,
        position,
        purchaseObjects,
        getValues("items") ?? [],
      ),
      {
        shouldDirty: true,
      },
    );
    if (!getValues("subject")?.trim()) setValue("subject", desc.title);
    if (desc.otherRequirements && !getValues("otherRequirements")) {
      setValue("otherRequirements", desc.otherRequirements);
    }
    // Вернулись из конструктора с выбранным ООЗ — модалку выбора закрываем.
    setShowOozPicker(false);
  }, [
    location.search,
    objectDescriptions,
    position,
    purchaseObjects,
    setValue,
    getValues,
    isReadOnly,
  ]);

  // При первом открытии новой СЗ отдельные объекты могут прийти из запроса
  // позже, чем форма получила значения по умолчанию. Пересобираем состав один
  // раз, не затирая пользовательские правки.
  const appliedAutoOozRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      initialNote ||
      purchaseObjectsLoading ||
      !autoMatchedDesc ||
      isReadOnly
    ) {
      return;
    }
    const key = String(autoMatchedDesc.id);
    if (appliedAutoOozRef.current === key) return;
    appliedAutoOozRef.current = key;
    setValue(
      "isIndeterminateVolume",
      Boolean(autoMatchedDesc.isIndeterminateVolume),
    );
    replace(
      buildNoteItemsFromOoz(
        autoMatchedDesc,
        position,
        purchaseObjects,
        getValues("items") ?? [],
      ),
    );
  }, [
    initialNote,
    purchaseObjectsLoading,
    autoMatchedDesc,
    position,
    purchaseObjects,
    setValue,
    replace,
    getValues,
    isReadOnly,
  ]);

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
  const createKsTask = useCreateTask();
  const updateKsTask = useUpdateTask();
  const isBusy =
    createNote.isPending ||
    updateNote.isPending ||
    updateOrganization.isPending ||
    createKsTask.isPending ||
    updateKsTask.isPending;

  const watchedHasAdvance = Boolean(watch("hasAdvance"));
  const watchedTreasury = Boolean(watch("requiresTreasurySupport"));
  const watchedDeliveryMode = watch("deliveryTermMode") ?? "relative";
  // Отсчёт относительного срока: по умолчанию с даты заключения контракта
  const watchedDeliveryFromContract = Boolean(
    watch("deliveryTermFromContractDate") ?? true,
  );
  const watchedAcceptanceMode = watch("acceptanceTermMode") ?? "event";
  const watchedStatus = (watch("status") ?? "draft") as PurchaseNoteStatus;
  const watchedKsReviewTaskId = watch("ksReviewTaskId");
  // Способ определения поставщика по умолчанию не подставляется: пока
  // пользователь не выбрал его, способ считается незаданным
  const watchedPlacingWay = watch("placingWayCode") ?? "";
  const watchedItems = (watch("items") ?? []) as PurchaseNoteObjectItem[];

  // Название модуля мест зависит от вида объекта закупки: поставка товара,
  // выполнение работ или оказание услуг. Вид берём из ОКПД2 позиций.
  const deliveryPlaceKinds = new Set(
    watchedItems
      .map((item) => okpd2Signal(item.okpd2Code, item.okpd2Name).kind)
      .filter(
        (kind) => kind === "goods" || kind === "works" || kind === "services",
      ),
  );
  const deliveryPlaceKind =
    deliveryPlaceKinds.size === 1 ? [...deliveryPlaceKinds][0] : "mixed";
  const deliveryPlaceNoun =
    deliveryPlaceKind === "goods"
      ? "поставки товара"
      : deliveryPlaceKind === "works"
        ? "выполнения работ"
        : deliveryPlaceKind === "services"
          ? "оказания услуг"
          : "поставки товара, выполнения работ или оказания услуг";
  const watchedOozId = watch("objectDescriptionId");
  // ООЗ может быть связан тремя способами: явным objectDescriptionId в СЗ,
  // ссылкой в позициях (старые записи) или автоматическим подбором по
  // позиции ПГ/ИКЗ. Раньше читался только первый — из-за этого кнопка
  // «Утвердить ООЗ» оставалась заблокированной даже у пользователя со всеми
  // правами, если описание подставилось позже инициализации формы.
  const selectedOoz =
    objectDescriptions.find(
      (desc) =>
        watchedOozId !== null &&
        watchedOozId !== undefined &&
        String(desc.id) === String(watchedOozId),
    ) ??
    objectDescriptions.find((desc) =>
      watchedItems.some(
        (item) =>
          item.objectDescriptionId !== undefined &&
          String(item.objectDescriptionId) === String(desc.id),
      ),
    ) ??
    autoMatchedDesc;

  // Выбор ООЗ из модалки «Есть ли подготовленное ООЗ?»: описание подставляется
  // целиком (объекты, признак объёма, предмет), как при возврате из конструктора.
  const applySelectedOoz = (desc: ObjectDescription) => {
    setValue("objectDescriptionId", desc.id as string | number, {
      shouldDirty: true,
    });
    setValue("isIndeterminateVolume", Boolean(desc.isIndeterminateVolume), {
      shouldDirty: true,
    });
    setValue(
      "items",
      buildNoteItemsFromOoz(
        desc,
        position,
        purchaseObjects,
        getValues("items") ?? [],
      ),
      { shouldDirty: true },
    );
    if (!getValues("subject")?.trim()) setValue("subject", desc.title);
    if (desc.otherRequirements && !getValues("otherRequirements")) {
      setValue("otherRequirements", desc.otherRequirements);
    }
    setShowOozPicker(false);
  };

  // Признак неопределённого объёма задаётся в ООЗ; переключателя в СЗ нет.
  // Для старых записей без ООЗ сохраняем значение самих СЗ.
  const watchedIndeterminate = Boolean(
    selectedOoz?.isIndeterminateVolume ?? watch("isIndeterminateVolume"),
  );
  // Проверки сканируют справочник на каждую позицию: без мемоизации они
  // повторялись бы при каждом нажатии в любой поле формы (watch подписывает
  // всю модалку), а строк в служебке бывает больше десятка.
  const auctionValidation = useMemo(
    () =>
      validatePlacingWayAgainstAuctionList(
        watchedPlacingWay,
        watchedItems.map((item) => ({
          code: item.okpd2Code,
          name: item.name,
        })),
        okpd2Refs,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedPlacingWay, watchedItems, okpd2Refs],
  );

  // Национальный режим (ПП РФ N 1875): объявленный по каждой позиции режим
  // сверяется с перечнями запрета (приложение N 1) и ограничения (приложение N 2)
  const nationalRegimeValidation = useMemo(
    () =>
      validateNationalRegime(
        watchedItems.map((item) => ({
          code: item.okpd2Code,
          name: item.name,
          declaredMode: item.nationalRegimeType,
        })),
        okpd2Refs,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedItems, okpd2Refs],
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
  const detectedCategory = detectObjectCategory(
    evaluationOkpd2Codes,
    undefined,
    mapping,
  );
  const watchedEvaluationCategory = watch("evaluationObjectCategory");
  const evaluationCategory =
    watchedEvaluationCategory || detectedCategory.category || "works_services";
  const evaluationLimits = objectCategoryLimits(evaluationCategory, mapping);
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
        { checkIndicators: false, checkBids: false, mapping },
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
  // Требование ч. 1.1 ст. 31 включено всегда и не редактируется — от него
  // зависят проверки ПП РФ № 2571 и состав требований в извещении
  const watchedPart1_1Art31 = true;
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

  // Нормы размеров обеспечений: заявка и гарантийные обязательства — ошибки,
  // исполнение — ошибка в общем случае. Ошибки блокируют утверждение, черновик
  // сохраняется; список выводится в блоке обеспечения.
  const securityNormsIssues = validateSecurityNorms({
    price: watch("initialMaxPrice"),
    application: {
      required: watchedAppSec,
      percent: watch("applicationSecurityPercent"),
    },
    performance: {
      required: watchedContractSec,
      percent: watch("contractSecurityPercent"),
    },
    warranty: {
      required: watchedWarrantySec,
      percent: watch("warrantySecurityPercent"),
    },
    advance: {
      percent: watchedHasAdvance ? watch("advancePercent") : null,
      treasurySupport: watchedTreasury,
    },
  });
  const securityNormsErrors = securityNormsIssues.filter(
    (issue) => issue.level === "error",
  );

  const watchedNmckFileName = watch("nmckFileName") || "";
  const watchedNmckFileUpdatedAt = watch("nmckFileUpdatedAt") || "";
  const watchedNmckCalculation = watch("nmckCalculation") as
    | NmckCalculationRecord
    | undefined;
  const watchedNmckSignature = watch("nmckSignature") as
    | NmckSignature
    | undefined;
  // Тип цены наследуется из обоснования НМЦК: неопределённый объём даёт
  // максимальное значение цены (ч. 24 ст. 22 44-ФЗ), иначе — НМЦК
  const nmckPriceTypeLabel = watch("isIndeterminateVolume")
    ? "Максимальное значение цены контракта (ч. 24 ст. 22 44-ФЗ)"
    : "Начальная (максимальная) цена контракта";

  // Чекпоинты «набор объектов конечный» и «последняя закупка по позиции ПГ»
  // убраны из формы: состав объектов задаёт ООЗ. Блок НМЦК открывается только
  // после утверждения ООЗ; остальные разделы — после подписания НМЦК в ЭП
  // (иного признака «НМЦК утверждена» в модели нет).
  const oozApproved = selectedOoz?.status === "approved";
  // Показываем точную причину неактивной кнопки: право, отсутствие ООЗ,
  // уже утверждённый статус или выполняющаяся мутация.
  const approveOozDisabledReason = isReadOnly
    ? (purchaseNoteDeniedReason ?? "Нет права редактировать служебную записку")
    : !selectedOoz
      ? "ООЗ не подставлен к позиции плана-графика"
      : oozApproved
        ? "ООЗ уже утверждено"
        : updateObjectDescription.isPending
          ? "Идёт утверждение ООЗ"
          : undefined;
  const oozReady = oozApproved;
  // Разделы «Сроки поставки / приёмки / места» и далее открываются сразу после
  // утверждения ООЗ — вместе с блоком обоснования НМЦК, чтобы в запросе
  // коммерческих предложений можно было указать условия оплаты, поставки и
  // приёмки (задача на заполнение этих полей уходит исполнителю).
  const laterSectionsReady = oozReady;

  // Годы в графах КБК берём из плана-графика: подписи должны быть
  // календарными, а не «текущий год / 1-й год планового периода»
  const kbkColumns = useMemo(
    () => kbkYearColumns(Number(plan.planYear) || new Date().getFullYear()),
    [plan.planYear],
  );

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

  // Требования ПП РФ от 29.12.2021 № 2571: в форме показываем все замечания
  // (ошибки и предупреждения), в zod-схему попадают только ошибки —
  // см. PurchaseNoteSchema.superRefine.
  const watchedPart2Art31Text =
    watch("additionalRequirementsPart2Art31Text") ?? "";
  const watchedPoint4Art31Text = watch("pp2571Point4RequirementText") ?? "";
  const watchedPlacingWayCode = watch("placingWayCode");
  const watchedNoteStatus = watch("status") ?? "draft";

  // Валидатор лёгкий, а watch-массивы пересоздаются на каждом рендере —
  // мемоизация здесь не даёт выигрыша и создаёт лишние зависимости.
  const pp2571Issues: Pp2571Issue[] = validatePp2571Requirements({
    nmck: nmckValue,
    placingWayCode: watchedPlacingWayCode,
    items: watchedItems,
    selectedPositions: watchedPp2571,
    additionalRequirementsPart2Art31: watchedPart2Art31,
    additionalRequirementsPart2Art31Text: watchedPart2Art31Text,
    point4Requirement: watchedPp2571Point4,
    point4RequirementText: watchedPoint4Art31Text,
    requirementsPart2_1Art31: watchedPart2_1Art31,
    requirementsPart1_1Art31: watchedPart1_1Art31,
    sanctionsRnpRequirement: watchedSanctionsRnp,
    isDraft: watchedNoteStatus === "draft",
  });

  // Валидация ст. 30 Закона № 44-ФЗ: ограничения по СМП зависят от НМЦК.
  // Преимущества ст. 28/29 определяются перечнями ОКПД2, а не размером НМЦК.
  const smpValidation = useMemo(
    () =>
      checkSmpRequirements(
        nmckValue,
        watchedItems.map((item) => ({
          code: item.okpd2Code,
          name: item.name,
        })),
        okpd2Refs,
      ),
    [nmckValue, watchedItems, okpd2Refs],
  );

  // Валидация на смешивание товаров из перечня ОКПД2 ст. 28/29 и без перечня
  const smpMixingValidation = useMemo(
    () =>
      validateSmpMixing(
        watchedItems.map((item) => ({
          code: item.okpd2Code,
          name: item.name,
        })),
        okpd2Refs,
      ),
    [watchedItems, okpd2Refs],
  );

  // Рекомендации по ст. 30: ограничение только для СМП оправдано, когда
  // конкуренция по собранным КП достаточная. Рекомендации справочные и
  // сохранение служебной записки не блокируют.
  const smpRecommendations = useMemo(() => {
    const tips: string[] = [];
    const offers = watchedNmckCalculation?.offers ?? [];
    const activeOffers =
      offers.filter((offer) => offer.included !== false).length ||
      (watchedNmckCalculation?.activeCount ?? 0);
    const smpOnlyRequired = smpValidation[0]?.smpOnlyRequired ?? false;

    if (offers.length === 0) {
      tips.push(
        "Коммерческие предложения ещё не собраны: конкуренцию оценить нельзя, рекомендация уточнится после расчёта НМЦК.",
      );
    } else if (activeOffers >= 3) {
      tips.push(
        `Активных КП: ${activeOffers}. Конкуренция достаточная — ограничение только для СМП (ч. 3 ст. 30) критично не сужает круг участников.`,
      );
    } else {
      tips.push(
        `Активных КП: ${activeOffers}. Конкуренция ограничена: устанавливать закупку только среди СМП рискованно — рассмотрите требование о привлечении субподрядчиков (ч. 5 ст. 30) либо расширьте запрос КП.`,
      );
    }

    if (!smpOnlyRequired) {
      tips.push(
        "НМЦК превышает лимит ст. 30: ограничение только для СМП (ч. 3 ст. 30) неприменимо.",
      );
    } else if (!watchedAdvantageSmp && !watchedSmpSubcontracting) {
      tips.push(
        "НМЦК в пределах лимита ст. 30: можно установить преимущество для СМП/СОНКО (ч. 3 ст. 30) или требование о привлечении субподрядчиков (ч. 5 ст. 30).",
      );
    }

    return tips;
  }, [
    watchedNmckCalculation,
    smpValidation,
    watchedAdvantageSmp,
    watchedSmpSubcontracting,
  ]);

  // Практика прошлых лет: система сама считает средний фактический уровень
  // привлечения СМП по контрактам заказчика за выбранный год и предлагает
  // готовый процент. Сопоставимость по ОКПД2 — приоритет, но если связанных
  // извещений с кодами нет, показываем расчёт по всем контрактам года, а не
  // пустую подсказку: пользователь не должен идти в реестр за цифрой.
  const { data: registryContracts = [] } = useContractRegistry(
    organizationId,
    laterSectionsReady,
  );
  const practiceContracts = useMemo(
    () =>
      registryContracts
        .filter(
          (contract) =>
            String(contract.contractDate ?? "").startsWith(
              String(smpPracticeYear),
            ) &&
            contract.id !== undefined &&
            contract.id !== null &&
            contract.id !== "",
        )
        // Записи СМП читаются по одному контракту: ограничиваем выборку
        // последними 100 контрактами года, чтобы форма не отправляла сотни
        // запросов; средний процент от этого не теряет смысла
        .sort((a, b) =>
          String(b.contractDate ?? "").localeCompare(
            String(a.contractDate ?? ""),
          ),
        )
        .slice(0, 100),
    [registryContracts, smpPracticeYear],
  );
  const practiceSmpQueries = useContractSmpRecordsBatch(
    practiceContracts.map((contract) => contract.id),
  );
  const smpPractice = useMemo(() => {
    // Сопоставимость определяем по ОКПД2 самого контракта: коды берём из
    // связанного извещения, а не из субдоговоров — предмет контракта
    // достаточен, чтобы считать практику сопоставимой
    const prefixes = watchedItems
      .map((item) => (item.okpd2Code ?? "").replace(/,/g, ".").slice(0, 4))
      .filter(Boolean);
    const comparablePercents: number[] = [];
    const allPercents: number[] = [];

    practiceContracts.forEach((contract, index) => {
      const records = practiceSmpQueries[index]?.data ?? [];
      if (records.length === 0) return;

      const price = Number.parseFloat(String(contract.contractPrice ?? ""));
      if (!Number.isFinite(price) || price <= 0) return;

      const percent = (smpVolumeSources(records).actual / price) * 100;
      if (!Number.isFinite(percent) || percent <= 0) return;

      allPercents.push(percent);

      const notice = notices.find(
        (item) =>
          contract.procurementId !== undefined &&
          contract.procurementId !== null &&
          String(item.procurementId ?? "") === String(contract.procurementId),
      );
      const contractCodes = (notice?.purchaseObjects?.items ?? [])
        .map((item) => (item.okpd2Code ?? "").replace(/,/g, "."))
        .filter(Boolean);
      const comparable =
        prefixes.length === 0 ||
        (contractCodes.length > 0 &&
          contractCodes.some((code) =>
            prefixes.some((prefix) => code.startsWith(prefix)),
          ));

      if (comparable) comparablePercents.push(percent);
    });

    // Сопоставимые контракты точнее; если их нет — предлагаем расчёт по всем
    // контрактам года, иначе пользователь остаётся без предложения
    const percents =
      comparablePercents.length > 0 ? comparablePercents : allPercents;

    return {
      contracts: percents.length,
      comparable: comparablePercents.length > 0,
      average:
        percents.length > 0
          ? percents.reduce((total, value) => total + value, 0) /
            percents.length
          : null,
    };
  }, [practiceContracts, practiceSmpQueries, watchedItems, notices]);

  // Превышения объёмов плана-графика по годам — блокируют сохранение
  const kbkLimitViolations = useMemo(() => {
    const issues: {
      kbk: string;
      label: string;
      amount: number;
      limit: number;
    }[] = [];

    kbkFundingRows.forEach((row) => {
      kbkColumns.forEach((column) => {
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
  }, [kbkFundingRows, kbkColumns]);

  const setKbkFundingYears = (
    id: string,
    kbk: string,
    amounts: Partial<Record<KbkYearField, number>>,
  ) => {
    const current = (getValues("kbkFundingAmounts") ?? []) as KbkFundingEntry[];
    const patch: Partial<KbkFundingEntry> = { kbk };
    kbkColumns.forEach((column) => {
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

  // Гарантия качества даёт право установить обеспечение гарантийных обязательств
  const handleToggleQualityWarranty = (checked: boolean) => {
    if (isReadOnly) return;
    setValue("requiresQualityWarranty", checked);
    if (!checked) {
      setValue("requiresWarrantySecurity", false);
    }
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
      workflowStatusRef.current = null;
      return;
    }

    const workflowTarget = workflowStatusRef.current;
    workflowStatusRef.current = null;
    const targetStatus: PurchaseNoteStatus =
      workflowTarget === "ks_review"
        ? "in_review"
        : (workflowTarget ?? data.status ?? "draft");

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

    // ПП РФ N 1875: запрет/ограничение обязательны, но не установлены.
    // Черновик сохраняется и уходит в КС системной задачей; «Утвердить»
    // становится доступно только после согласования КС.
    if (nationalRegimeValidation.blocksSave && targetStatus === "approved") {
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

    // Нормы размеров обеспечений (ч. 1 ст. 44, ч. 6–7 ст. 34, ст. 96): заявка и
    // гарантийные обязательства — ошибки, исполнение — ошибка в общем случае.
    // Выше 30 % допустимо при авансе свыше 30 % НМЦК, поэтому проверка идёт по
    // модулю норм с данными формы, а не по схеме. Черновик сохраняется, а
    // «Утвердить» — нет.
    if (targetStatus === "approved") {
      const securityErrors = validateSecurityNorms({
        price: data.initialMaxPrice,
        application: {
          required: Boolean(data.requiresApplicationSecurity),
          percent: data.applicationSecurityPercent,
        },
        performance: {
          required: Boolean(data.requiresContractSecurity),
          percent: data.contractSecurityPercent,
        },
        warranty: {
          required: Boolean(data.requiresWarrantySecurity),
          percent: data.warrantySecurityPercent,
        },
        advance: {
          percent: data.hasAdvance ? data.advancePercent : null,
          // Казначейское сопровождение снимает правило «не меньше аванса»
          treasurySupport: watchedTreasury,
        },
      }).filter((issue) => issue.level === "error");

      if (securityErrors.length > 0) {
        setError("root", {
          message: `Размеры обеспечений не соответствуют нормам: ${securityErrors
            .map((issue) => issue.message)
            .join(" ")}`,
        });
        return;
      }
    }

    const shouldProceed = proceedAfterSaveRef.current;
    proceedAfterSaveRef.current = false;

    const firstItem = data.items?.[0];
    // Признак объёма приходит из ООЗ; в СЗ его только перенаследуем в данные
    // записи, чтобы извещение, экспорт и проект контракта видели тот же флаг.
    const indeterminate = Boolean(
      selectedOoz?.isIndeterminateVolume ?? data.isIndeterminateVolume,
    );
    const normalizedItems = (data.items ?? []).map((it) => ({
      ...it,
      quantity: indeterminate ? "1" : it.quantity || "1",
    }));

    const placeStrings = (data.deliveryPlaces ?? [])
      .map((place) => formatDeliveryAddress(place))
      .filter(Boolean);

    const actorName = employee?.employee ? fullName(employee.employee) : "";
    const statusChanged = initialNote && targetStatus !== initialNote.status;

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
      status: targetStatus,
      isIndeterminateVolume: indeterminate,
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
      // Пустые строки файлов не сохраняем: иначе в СЗ копятся «пустышки»,
      // а извещение и проект контракта получают битые вложения
      isStructuredForm: data.isStructuredForm ?? true,
      contractProjectFiles: (data.contractProjectFiles ?? [])
        .filter((file) => file.fileName.trim().length > 0)
        .map((file) => ({
          ...file,
          fileName: file.fileName.trim(),
          description: file.description?.trim() ?? "",
        })),
      objectDescriptionId: oozId,
      objectDescriptionFileName: oozFileName,
      objectDescriptionFileUpdatedAt: oozFileName
        ? (data.objectDescriptionFileUpdatedAt ??
          new Date().toISOString().slice(0, 10))
        : undefined,
      objectDescriptionFiles: (data.objectDescriptionFiles ?? [])
        .filter((file) => file.fileName.trim().length > 0)
        .map((file) => ({
          ...file,
          fileName: file.fileName.trim(),
          description: file.description?.trim() ?? "",
        })),
      okpd2Code: firstItem?.okpd2Code || data.okpd2Code || "",
      okpd2Name: firstItem?.okpd2Name || data.okpd2Name || "",
      unit: firstItem?.unit || data.unit || "",
      quantity: indeterminate
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
      // НМЦК прикладываем к извещению, если оно уже заведено по этой записке
      // или по закупке. Нет файла обоснования — нет и вложения.
      const nmckAttachment = buildNmckJustificationAttachment({
        note: saved,
        uploadedBy: actorName,
      });
      const relatedNotice = notices.find(
        (item) =>
          (saved.id !== undefined &&
            String(item.purchaseNoteId ?? "") === String(saved.id)) ||
          (saved.procurementId !== undefined &&
            String(item.procurementId ?? "") === String(saved.procurementId)),
      );

      if (nmckAttachment && relatedNotice?.id) {
        attachToNotice.mutate({
          noticeId: relatedNotice.id,
          attachment: { ...nmckAttachment, noticeId: relatedNotice.id },
        });
      }

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

  // ─── Действия согласования ──────────────────────────────────────────────────
  // Исполнитель системной задачи — работник КС с функцией описания объекта;
  // если такой не назначен, задача адресуется руководителю КС.
  const ksAssignee = useMemo(() => {
    const roster = contractService
      ? contractServiceRoster(contractService)
      : [];
    return (
      roster.find((row) => row.functions?.includes("purchase_description")) ??
      roster[0]
    );
  }, [contractService]);

  const submitWorkflow = (target: WorkflowTarget) => {
    workflowStatusRef.current = target;
    proceedAfterSaveRef.current = false;
    void handleSubmit(onSubmit)();
  };

  /**
   * ПП РФ № 1875: если режим не установлен, СЗ сохраняется черновиком и
   * направляется в КС системной задачей. Прямой «Утвердить» в этом случае
   * недоступен — он откроется после согласования КС.
   */
  const requestKsReview = () => {
    if (!organization?.id || !ksAssignee?.employeeId) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const actor = employee?.employee ? fullName(employee.employee) : "";
    const task: Task = {
      ...emptyTask(organization.id),
      title: `Согласование СЗ ${watch("noteNumber") || editingNoteId || ""}: национальный режим`,
      description:
        "Проверить национальный режим по ПП РФ № 1875 и согласовать или вернуть служебную записку на доработку.",
      origin: "system",
      status: "pending",
      functionCode: "purchase_description",
      order158nPoolCode: "purchase_description",
      assigneeId: ksAssignee.employeeId,
      assigneeName: ksAssignee.employeeFullName ?? "",
      assignedByEmployeeId: employee?.id,
      assignedByName: actor || undefined,
      dueDate: addDays(todayIso, DEFECT_LIST_REVIEW_DAYS),
      createdAt: todayIso,
    };

    createKsTask.mutate(task, {
      onSuccess: (created) => {
        setValue("ksReviewTaskId", created.id);
        setValue("ksReviewRequestedAt", todayIso);
        submitWorkflow("ks_review");
      },
    });
  };

  /**
   * Утвердить ООЗ прямо из СЗ. Раньше это можно было сделать только в
   * конструкторе ООЗ и только руководителю КС: контрактный управляющий с
   * полными правами на СЗ застревал на закрытом блоке НМЦК. Право утверждать
   * ООЗ приравниваем к праву редактировать СЗ (оно включает и isHead).
   */
  const approveOozFromNote = () => {
    if (
      !selectedOoz ||
      selectedOoz.id === undefined ||
      isReadOnly ||
      updateObjectDescription.isPending
    ) {
      return;
    }
    // Если ООЗ найден через позиции или автоподбор, сохраняем явную связь —
    // иначе после перезагрузки кнопка снова окажется заблокированной.
    if (String(watchedOozId ?? "") !== String(selectedOoz.id)) {
      setValue("objectDescriptionId", selectedOoz.id, { shouldDirty: true });
    }
    const approver = employee?.employee ? fullName(employee.employee) : "";
    updateObjectDescription.mutate({
      id: selectedOoz.id,
      status: "approved",
      approvedByName: selectedOoz.approvedByName || approver || undefined,
      approvedDate:
        selectedOoz.approvedDate || new Date().toISOString().slice(0, 10),
    });
  };

  const canWorkflowAction = !isReadOnly && !isBusy && isEditMode;
  const isDraftLikeStatus = isDraftLikePurchaseNote(watchedStatus);

  const completeKsReview = () => {
    const hasKsTask =
      watchedKsReviewTaskId !== undefined &&
      watchedKsReviewTaskId !== null &&
      watchedKsReviewTaskId !== "";
    if (hasKsTask) {
      updateKsTask.mutate({
        id: watchedKsReviewTaskId,
        changes: {
          status: "completed",
          result: "Согласовано",
          completedAt: new Date().toISOString().slice(0, 10),
        },
      });
    }
    submitWorkflow("ks_approved");
  };

  // ─── Согласование отдельных блоков СЗ ──────────────────────────────────────
  // Каждый блок (секцию) контрактная служба может утвердить или вернуть на
  // доработку отдельно. Отметки хранятся в `sectionReviews` и не влияют на
  // общий статус документа.
  const watchedSectionReviews = watch("sectionReviews") ?? [];
  const sectionReviewOf = (sectionId: string) =>
    watchedSectionReviews.find((item) => item.sectionId === sectionId);
  const isSectionApproved = (sectionId: string) =>
    sectionReviewOf(sectionId)?.status === "approved";
  const setSectionReview = (
    sectionId: string,
    status: "approved" | "revision",
  ) => {
    if (isReadOnly) return;
    const actorName = employee?.employee ? fullName(employee.employee) : "";
    const today = new Date().toISOString().slice(0, 10);
    const next = watchedSectionReviews.filter(
      (item) => item.sectionId !== sectionId,
    );
    next.push({
      sectionId,
      status,
      updatedBy: actorName || undefined,
      updatedAt: today,
    });
    setValue("sectionReviews", next, { shouldDirty: true });
  };

  // Мини-модальное окно: какие блокирующие замечания мешают утвердить блок.
  const [approvalBlockedFor, setApprovalBlockedFor] = useState<{
    sectionId: string;
    warnings: string[];
  } | null>(null);

  const collectBlockingWarnings = (): string[] => {
    const warnings: string[] = [];
    if (nationalRegimeValidation.blocksSave && nationalRegimeValidation.summary) {
      warnings.push(nationalRegimeValidation.summary);
    }
    for (const issue of pp2571Issues) {
      if (issue.level === "error") warnings.push(issue.message);
    }
    for (const violation of kbkLimitViolations) {
      warnings.push(
        `Суммы по КБК превышают объёмы плана-графика: ${violation.kbk || "без кода"} (${violation.label})`,
      );
    }
    // Нормы обеспечений: заявка и гарантийные обязательства — ошибки,
    // исполнение — ошибка, кроме законного превышения 30 % при авансе.
    for (const issue of securityNormsErrors) {
      warnings.push(issue.message);
    }
    const rootError = errorText("root");
    if (rootError) warnings.push(rootError);
    return warnings;
  };

  const requestApproveSection = (sectionId: string) => {
    const warnings = collectBlockingWarnings();
    if (warnings.length > 0) {
      setApprovalBlockedFor({ sectionId, warnings });
      return;
    }
    setSectionReview(sectionId, "approved");
  };

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
    const next = current.map((criterion, index) => {
      const kind = indicatorKindsByCriterion[criterion.type][0] ?? "quality";

      return index === criterionIndex
        ? {
            ...criterion,
            indicators: [
              ...criterion.indicators,
              {
                // Вид показателя берётся из справочника Положения N 2604,
                // поэтому наименование сразу заполнено официальной формулировкой
                name: indicatorKindLabels[kind],
                kind,
                weightPercent: 0,
                unit: "",
                best: "max" as const,
                scoring: "formula" as const,
                scaleText: "",
                otherOrder: "",
              },
            ],
          }
        : criterion;
    });
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
        signer: watchedNmckSignature
          ? {
              compiledBy: watchedNmckSignature.signedBy || "",
              approver: watchedNmckSignature.signedBy || "",
              certificateOwner: watchedNmckSignature.certificateOwner || "",
              certificateSerial: watchedNmckSignature.certificateSerial || "",
              certificateInn: watchedNmckSignature.certificateInn || "",
              signedAt: watchedNmckSignature.signedAt || "",
            }
          : undefined,
        ooAttachments: mergePurchaseNoteFiles(
          watch("objectDescriptionFiles"),
          watch("objectDescriptionFileName"),
          watch("objectDescriptionFileUpdatedAt"),
        ).map((file) => ({
          fileName: file.fileName,
          updatedAt: file.fileUpdatedAt,
        })),
      });
    } finally {
      setIsExportingNmckPdf(false);
    }
  };

  // Превью обоснования НМЦК: тот же PDF-генератор, что и при экспорте, но
  // готовый блоб не скачивается, а показывается в форме во встроенной рамке
  const nmckPreviewUrlRef = useRef("");
  const [nmckPreviewUrl, setNmckPreviewUrl] = useState("");
  const [isBuildingNmckPreview, setIsBuildingNmckPreview] = useState(false);

  const buildNmckPreview = async () => {
    if (!watchedNmckCalculation) return;
    setIsBuildingNmckPreview(true);
    try {
      const blobs: Blob[] = [];
      await exportNmckCalculationToPdf({
        title: `ОБОСНОВАНИЕ НМЦК К СЗ № ${watch("noteNumber") || "б/н"}`,
        organizationName:
          organization?.shortName || organization?.fullName || "",
        organization: organization ?? plan.customer ?? null,
        ikz: watch("ikz") || position.identificationCode || "",
        record: watchedNmckCalculation,
        marketResult: savedMarketEvaluation ?? undefined,
        fileName: `Обоснование_НМЦК_44ФЗ_СЗ_${watch("noteNumber") || "черновик"}.pdf`,
        signer: watchedNmckSignature
          ? {
              compiledBy: watchedNmckSignature.signedBy || "",
              approver: watchedNmckSignature.signedBy || "",
              certificateOwner: watchedNmckSignature.certificateOwner || "",
              certificateSerial: watchedNmckSignature.certificateSerial || "",
              certificateInn: watchedNmckSignature.certificateInn || "",
              signedAt: watchedNmckSignature.signedAt || "",
            }
          : undefined,
        ooAttachments: mergePurchaseNoteFiles(
          watch("objectDescriptionFiles"),
          watch("objectDescriptionFileName"),
          watch("objectDescriptionFileUpdatedAt"),
        ).map((file) => ({
          fileName: file.fileName,
          updatedAt: file.fileUpdatedAt,
        })),
        deliver: (blob) => blobs.push(blob),
      });
      const blob = blobs[0];
      if (!blob) return;
      if (nmckPreviewUrlRef.current) {
        URL.revokeObjectURL(nmckPreviewUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      nmckPreviewUrlRef.current = url;
      setNmckPreviewUrl(url);
    } finally {
      setIsBuildingNmckPreview(false);
    }
  };

  // Превью строится автоматически, как только появилось обоснование НМЦК
  useEffect(() => {
    if (!oozReady || !watchedNmckCalculation) return;
    void buildNmckPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oozReady, watchedNmckCalculation]);

  // Blob-URL освобождаем при размонтировании формы
  useEffect(
    () => () => {
      if (nmckPreviewUrlRef.current) {
        URL.revokeObjectURL(nmckPreviewUrlRef.current);
      }
    },
    [],
  );

  // Превью проекта контракта: собираем тем же документ-билдером, что и
  // конструктор. По умолчанию берём сохранённый проект контракта закупки
  // (вместе с правками конструктора), по кнопке — пересобираем из введённых в
  // служебную записку значений: видно, что даёт каждая основа.
  const { data: contractProjects = [] } = useOrganizationContractProjects(
    laterSectionsReady ? organizationId : undefined,
  );
  const watchedContractProcurementId = watch("procurementId");
  const watchedContractIkz = watch("ikz");
  const linkedContractProject = useMemo(() => {
    const hasProcurement =
      watchedContractProcurementId !== undefined &&
      watchedContractProcurementId !== null &&
      watchedContractProcurementId !== "";
    return contractProjects.find(
      (project) =>
        (hasProcurement &&
          String(project.procurementId ?? "") ===
            String(watchedContractProcurementId)) ||
        (Boolean(watchedContractIkz) &&
          String(project.ikz ?? "") === watchedContractIkz),
    );
  }, [contractProjects, watchedContractProcurementId, watchedContractIkz]);

  const [contractPreviewDocument, setContractPreviewDocument] =
    useState<ContractDocument | null>(null);
  // Чем собрано превью — показываем пользователю, чтобы было видно, учтены ли
  // правки, сделанные в конструкторе проекта контракта
  const [contractPreviewBasis, setContractPreviewBasis] = useState("");
  const [contractPreviewMode, setContractPreviewMode] = useState<
    "project" | "note"
  >("project");
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);
  // Пока проекта контракта по закупке нет, «сохранённая редакция» недоступна:
  // превью собирается по введённым значениям
  const effectiveContractPreviewMode: "project" | "note" =
    contractPreviewMode === "project" && linkedContractProject
      ? "project"
      : "note";

  const buildContractPreview = (mode = effectiveContractPreviewMode) => {
    const values = getValues() as PurchaseNote;
    const procurementId = values.procurementId;
    const hasProcurement =
      procurementId !== undefined &&
      procurementId !== null &&
      procurementId !== "";

    // Извещение — источник выше по цепочке ПГ → СЗ → извещение → проект контракта
    const linkedNotice = hasProcurement
      ? notices.find(
          (notice) =>
            String(notice.procurementId ?? "") === String(procurementId),
        )
      : undefined;
    const savedProject =
      mode === "project" ? linkedContractProject : undefined;

    // Сохранённый проект (в том числе отредактированный в конструкторе) —
    // приоритетная основа; иначе собираем черновик из введённых значений
    // служебной записки, ООЗ и извещения
    const project =
      savedProject ??
      buildContractProjectDraft({
        organizationId,
        procurementId: procurementId ?? undefined,
        notice: linkedNotice ?? null,
        note: values,
        objectDescription: selectedOoz ?? null,
        organization: organization ?? plan.customer ?? null,
        ikz: values.ikz,
        noticeNumber: linkedNotice?.generalInfo?.noticeNumber || undefined,
        nmck: toNumber(values.initialMaxPrice) ?? undefined,
        today: values.noteDate || undefined,
      });

    setContractPreviewDocument(buildContractDocument(project));
    setContractPreviewBasis(
      savedProject
        ? [
            "сохранённый проект контракта закупки",
            savedProject.contractNumber
              ? `№ ${savedProject.contractNumber}`
              : "",
            CONTRACT_PROJECT_STATUS_LABELS[savedProject.status] ??
              savedProject.status,
            savedProject.updatedAt
              ? `редакция от ${formatContractDate(savedProject.updatedAt)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : linkedContractProject
          ? "введённые значения служебной записки — без правок сохранённого проекта контракта"
          : "введённые значения служебной записки (проект контракта по закупке ещё не создан)",
    );
  };

  const switchContractPreviewMode = (mode: "project" | "note") => {
    setContractPreviewMode(mode);
    buildContractPreview(mode);
  };

  // Собираем превью в момент раскрытия: так оно всегда отражает текущие
  // значения формы и/или актуальную редакцию проекта контракта
  const handleContractPreviewToggle = (event: {
    currentTarget: HTMLDetailsElement;
  }) => {
    const open = event.currentTarget.open;
    setIsContractPreviewOpen(open);
    if (open) buildContractPreview();
  };

  // Если проекты контрактов подгрузились позже, чем открыли превью,
  // пересобираем документ, чтобы показать отредактированную редакцию
  useEffect(() => {
    if (isContractPreviewOpen) buildContractPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractProjects]);

  // Контекст для конструктора ООЗ: он должен знать, из какой позиции ПГ и СЗ
  // пришёл пользователь, чтобы создать описание с готовыми сквозными ссылками
  // и вернуть его обратно в форму после сохранения.
  const normingContext = {
    purchasePlanId: String(plan.id ?? ""),
    positionId: String(position.id ?? ""),
    purchaseNoteId: String(editingNoteId ?? ""),
    ikz: watch("ikz") || position.identificationCode || "",
    okpd2Code: watch("items.0.okpd2Code") || position.okpd2Code || "",
    okpd2Name: watch("items.0.okpd2Name") || position.okpd2Name || "",
    ktruCode: watch("items.0.ktruCode") || position.ktruCode || "",
    useKtru: String(position.useKtru ?? false),
    ktruRefusalReason: position.ktruRefusalReason || "",
    title: watch("subject") || position.objectOfPurchase || "",
    returnTo: `${location.pathname}${location.search}`,
  };
  // Переход из СЗ открывает карточку конкретного ООЗ, если он уже связан.
  const normingLinkParams = new URLSearchParams({
    ...normingContext,
    oozId:
      selectedOoz?.id !== undefined && selectedOoz?.id !== null
        ? String(selectedOoz.id)
        : "",
  }).toString();
  // «Создать новое ООЗ» не должно открывать связанное описание.
  const normingNewLinkParams = new URLSearchParams(normingContext).toString();

  return (
    <form className={block()} onSubmit={handleSubmit(onSubmit)}>
      {showOozPicker && (
        <OozPickerModal
          descriptions={objectDescriptions}
          positionOkpd2={position.okpd2Code}
          onSelect={applySelectedOoz}
          onCreateNew={() =>
            navigate(`/norming-requirements?${normingNewLinkParams}`)
          }
          onClose={() => setShowOozPicker(false)}
        />
      )}
      <header className={block("header")}>
        <div className={block("header-main")}>
          <button type="button" className={block("back")} onClick={onClose}>
            ← К реестру потребностей
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
          {/* Номер и дата СЗ — первая строка реквизитов. */}
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

          {/* Инициатор определяется системно при создании инициации: в форме
              его не выбирают. Статус меняется автоматически по мере
              прохождения СЗ и тоже не редактируется вручную. */}
          <input type="hidden" {...register("status")} />
          <input type="hidden" {...register("initiatorEmployeeId")} />
          <input type="hidden" {...register("initiatorName")} />
          <input type="hidden" {...register("approvalComment")} />
        </div>
      </fieldset>

      {/* 2. Предмет закупки и множество объектов закупки */}
      <fieldset
        className={block("section", isSectionApproved("objects") ? ["locked"] : [])}
        disabled={isReadOnly}
      >
        <legend>2. Предмет и объекты закупки (ст. 33, ч. 24 ст. 22)</legend>
        <PurchaseNoteSectionActions
          review={sectionReviewOf("objects")}
          canReview={canWorkflowAction}
          onApprove={() => requestApproveSection("objects")}
          onRevision={() => setSectionReview("objects", "revision")}
          constructorLink={{
            to: `/norming-requirements?${normingLinkParams}`,
            label: "Открыть конструктор ООЗ",
          }}
        />
        <div className={block("grid")}>
          {/* Предмет закупки — самое верхнее поле */}
          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="note-subject">
              Предмет закупки *
            </label>
            <textarea
              id="note-subject"
              className={block("textarea")}
              rows={3}
              placeholder="Развёрнутый предмет закупки — текст переносится и полностью виден в форме"
              {...register("subject")}
            />
            {errorText("subject") && (
              <span className={block("error")}>{errorText("subject")}</span>
            )}
          </div>

          {/* Объекты и их характеристики переносятся из ООЗ в таблицу ниже.
              ООЗ утверждается здесь же: пока статус не approved, блок НМЦК и
              остальные разделы скрыты. */}
          <div className={block("field", ["wide"])}>
            <div className={block("label-row")}>
              <span className={block("label")}>Объекты закупки</span>
              <div className={block("footer-actions")}>
                <button
                  type="button"
                  className={block("btn-accent")}
                  disabled={
                    isReadOnly ||
                    !selectedOoz ||
                    oozApproved ||
                    updateObjectDescription.isPending
                  }
                  title={approveOozDisabledReason}
                  onClick={approveOozFromNote}
                >
                  {updateObjectDescription.isPending
                    ? "Утверждение..."
                    : "Утвердить ООЗ"}
                </button>
                {canWorkflowAction && isDraftLikeStatus && (
                  <button
                    type="button"
                    className={block("btn")}
                    onClick={() => submitWorkflow("in_review")}
                  >
                    Направить в КС
                  </button>
                )}
              </div>
            </div>
            {updateObjectDescription.isError && (
              <span className={block("error")}>
                Не удалось утвердить ООЗ, попробуйте ещё раз.
              </span>
            )}
          </div>

          {/* Сводная таблица объектов закупки: ОКПД2 / КТРУ и правка реквизитов */}
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
                    <th>Нац. режим</th>
                    <th aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {itemFields.map((item, idx) => {
                    const itemOkpd2 = watch(`items.${idx}.okpd2Code`) || "";
                    const itemUnit = watch(`items.${idx}.unit`) || "";
                    const itemKtru = watch(`items.${idx}.ktruCode`) || "";
                    const itemKtruName = watch(`items.${idx}.ktruName`) || "";
                    const itemName = watch(`items.${idx}.name`) || "";
                    const itemQuantity = watch(`items.${idx}.quantity`) || "";
                    const itemRegimeValue =
                      watch(`items.${idx}.nationalRegimeType`) || "none";
                    const itemOozId = watch(`items.${idx}.objectDescriptionId`);
                    const itemDesc = objectDescriptions.find(
                      (desc) => String(desc.id) === String(itemOozId),
                    );
                    // Оба контроля ищут код в справочнике линейно — передаём
                    // уже найденную по индексу запись вместо всех 21 066 кодов
                    const itemOkpd2Refs = okpd2RefForChecks(
                      okpd2Refs,
                      itemOkpd2,
                    );
                    const itemRegime = checkOkpd2NationalRegime(
                      itemOkpd2,
                      itemOkpd2Refs,
                    );
                    // «Преимущество» — право заказчика и только по товарам,
                    // когда запрет/ограничение по коду не обязательны
                    const itemAdvantageApplicable = isAdvantageApplicable(
                      itemOkpd2,
                      itemRegime.regime,
                    );
                    // Агент ПП РФ № 1875: рекомендованный режим и обоснование
                    const itemRegimeRec = recommendNationalRegime(
                      itemOkpd2,
                      itemOkpd2Refs,
                    );
                    const regimeOptions = REGIME_OPTION_ORDER.map((value) => ({
                      value,
                      label: REGIME_OPTION_LABELS[value],
                      recommended: value === itemRegimeRec.mode,
                    })).sort(
                      (a, b) => Number(b.recommended) - Number(a.recommended),
                    );
                    const itemRegimeIssue =
                      nationalRegimeValidation.issues.find(
                        (issue) => issue.code === itemRegime.code,
                      );
                    // Контроль КТРУ в СЗ нужен только для несовпадения
                    // каталога и ОКПД2: справочные подсказки по аукционному
                    // перечню и требованию выбора позиции КТРУ здесь не
                    // выводятся, они относятся к этапам ПГ и извещения
                    const ktruIssue = checkKtruUsage(
                      ktruRefs,
                      itemOkpd2,
                      itemKtru,
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
                            {ktruIssue?.level === "error" && (
                              <span className={block("error")}>
                                Есть ошибки — раскройте позицию
                              </span>
                            )}
                          </td>
                          <td>{itemName || "—"}</td>
                          <td>{itemUnit || "—"}</td>
                          <td>
                            {watchedIndeterminate ? "1" : itemQuantity || "1"}
                          </td>
                          <td>
                            {itemRegimeValue === "ban"
                              ? "запрет"
                              : itemRegimeValue === "restriction"
                                ? "ограничение"
                                : itemRegimeValue === "advantage"
                                  ? "преимущество"
                                  : "нет"}
                          </td>
                          <td>
                            <div className={block("row-actions")}>
                              {/* Объект закупки пришёл из карточки ООЗ целиком
                                   и в СЗ не правится: строку раскрывают, чтобы
                                   посмотреть перенесённые реквизиты и
                                   характеристики. */}
                              <button
                                type="button"
                                className={block("link-btn")}
                                onClick={() => toggleItemExpanded(rowId)}
                              >
                                Подробнее
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={item.id}>
                        {/* Реквизиты объекта пришли из карточки ООЗ целиком:
                            блок только показывает перенесённые данные. Цену за
                            единицу и стоимость здесь не выводим — их даёт
                            обоснование НМЦК, оттуда же они уходят в
                            извещение. */}
                        <tr>
                          <td colSpan={8}>
                            <div className={block("item-editor")}>
                              <div className={block("field", ["wide"])}>
                                <span className={block("label")}>
                                  Наименование объекта закупки
                                </span>
                                <span className={block("field-value")}>
                                  {itemName || "—"}
                                </span>
                              </div>

                              <div className={block("item-editor-grid")}>
                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    ОКПД2 / КТРУ
                                  </span>
                                  <span className={block("field-value")}>
                                    {itemOkpd2 || "—"}
                                    {itemKtru
                                      ? ` · КТРУ ${itemKtru}${itemKtruName ? ` — ${itemKtruName}` : ""}`
                                      : ""}
                                  </span>
                                  {!itemKtru && itemDesc?.ktruCode && (
                                    <span className={block("hint")}>
                                      В ООЗ выбрана позиция КТРУ{" "}
                                      {itemDesc.ktruCode} — обновите объекты,
                                      вернувшись в конструктор ООЗ.
                                    </span>
                                  )}
                                  {ktruIssue?.level === "error" && (
                                    <span className={block("error")}>
                                      {ktruIssue.message}
                                    </span>
                                  )}
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Единица измерения
                                  </span>
                                  <span className={block("field-value")}>
                                    {itemUnit || "—"}
                                  </span>
                                </div>

                                <div className={block("field")}>
                                  <span className={block("label")}>
                                    Количество
                                  </span>
                                  <span className={block("field-value")}>
                                    {watchedIndeterminate
                                      ? "1"
                                      : itemQuantity || "1"}
                                  </span>
                                </div>

                                <div className={block("field", ["wide"])}>
                                  <label
                                    className={block("label")}
                                    htmlFor={`item-regime-${idx}`}
                                  >
                                    Национальный режим
                                  </label>
                                  {/* Режим приходит из ООЗ по коду ОКПД2, но
                                      остаётся доступным для изменения, в том
                                      числе когда ООЗ уже утверждено */}
                                  <Select
                                    id={`item-regime-${idx}`}
                                    className={block("select")}
                                    disabled={isReadOnly}
                                    {...register(
                                      `items.${idx}.nationalRegimeType`,
                                      {
                                        // Флаг «невозможность применения»
                                        // относится только к запрету и
                                        // ограничению: при смене режима его
                                        // значение и обоснование сбрасываем,
                                        // иначе в сохранении остаётся
                                        // несовместимая комбинация
                                        onChange: (event) => {
                                          const next = String(
                                            event.target.value,
                                          );

                                          if (
                                            next !== "ban" &&
                                            next !== "restriction"
                                          ) {
                                            setValue(
                                              `items.${idx}.imposibilityBan`,
                                              false,
                                              { shouldDirty: true },
                                            );
                                            setValue(
                                              `items.${idx}.imposibilityBanReason`,
                                              "",
                                              { shouldDirty: true },
                                            );
                                          }
                                        },
                                      },
                                    )}
                                  >
                                    {regimeOptions.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                        {option.recommended
                                          ? " — рекомендуется"
                                          : ""}
                                      </option>
                                    ))}
                                  </Select>
                                  {/* Рекомендация агента по коду ОКПД2 */}
                                  <span className={block("hint")}>
                                    {`Агент ПП РФ № 1875: рекомендуется «${REGIME_OPTION_LABELS[itemRegimeRec.mode]}» — ${itemRegimeRec.reason}`}
                                  </span>
                                  {itemAdvantageApplicable && (
                                    <span className={block("hint")}>
                                      «Преимущество» по ст. 14 Закона № 44-ФЗ —
                                      применяется только к товарам российского
                                      происхождения, когда запрет и ограничение
                                      не установлены.
                                    </span>
                                  )}
                                  {/* По работам и услугам преимущество не
                                      выводим вовсе: это не ошибка заказчика, а
                                      отсутствие самого механизма */}
                                  {!itemAdvantageApplicable &&
                                    itemRegime.regime && (
                                      <span className={block("hint")}>
                                        {`«Преимущество» недоступно: по коду обязательно «${nationalRegimeModeLabel(itemRegime.regime)}».`}
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

                                {/* Флаг имеет смысл только при установленном
                                    запрете или ограничении: без них
                                    «невозможность применения» противоречит
                                    самому режиму */}
                                {(itemRegimeValue === "ban" ||
                                  itemRegimeValue === "restriction") && (
                                  <div className={block("field", ["wide"])}>
                                    <label className={block("checkbox")}>
                                      <input
                                        type="checkbox"
                                        {...register(
                                          `items.${idx}.imposibilityBan`,
                                        )}
                                      />
                                      <span>
                                        Невозможность применения
                                        запрета/ограничения по ст. 14 (ПП РФ №
                                        1875)
                                      </span>
                                    </label>
                                    {watch(`items.${idx}.imposibilityBan`) && (
                                      <textarea
                                        rows={2}
                                        placeholder="Обоснование невозможности применения запрета/ограничения (ПП РФ № 1875)"
                                        className={block("textarea")}
                                        {...register(
                                          `items.${idx}.imposibilityBanReason`,
                                        )}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={block("item-editor-actions")}>
                                <button
                                  type="button"
                                  className={block("link-btn")}
                                  onClick={() => collapseItem(rowId)}
                                >
                                  Свернуть
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Характеристики приходят вместе с объектом из ООЗ,
                            выбирать описание в строке больше не нужно */}
                        <tr>
                          <td colSpan={8}>
                            <div className={block("item-ooz")}>
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
                                    В ООЗ этого объекта нет характеристик.
                                  </span>
                                )
                              ) : (
                                <span className={block("hint")}>
                                  Объект заведён без ООЗ — характеристики не
                                  заданы.
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

            {/* Валидация национального режима (ПП РФ N 1875): показываем
                ожидаемый режим и все замечания по позициям — ошибки блокируют
                сохранение, предупреждения и info носят справочный характер */}
            {(nationalRegimeValidation.expectedMode ||
              nationalRegimeValidation.issues.length > 0) && (
              <div className={block("field", ["wide"])}>
                {nationalRegimeValidation.expectedMode && (
                  <span className={block("hint")}>
                    Национальный режим по ПП РФ № 1875: по объектам закупки
                    ожидается «
                    {nationalRegimeExpectedLabel(
                      nationalRegimeValidation.expectedMode,
                    )}
                    ».
                  </span>
                )}
                {nationalRegimeValidation.summary && (
                  <span
                    className={block(
                      nationalRegimeValidation.hasErrors ? "error" : "hint",
                    )}
                  >
                    {nationalRegimeValidation.summary}
                  </span>
                )}
                {nationalRegimeValidation.issues.map((issue, issueIndex) => (
                  <span
                    key={`regime-${issue.code}-${issueIndex}`}
                    className={block(
                      issue.level === "error"
                        ? "error"
                        : issue.level === "warning"
                          ? "warning"
                          : "hint",
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

      {/* 3. НМЦК: отдельный блок сразу после ООЗ. ООЗ задаёт количество и
          единицу измерения, НМЦК — цену за единицу и стоимость объектов */}
      {oozReady && (
        <fieldset
          className={block("section", isSectionApproved("nmck") ? ["locked"] : [])}
          disabled={isReadOnly}
        >
          <legend>3. Обоснование НМЦК (ст. 22 Закона № 44-ФЗ)</legend>
          <PurchaseNoteSectionActions
            review={sectionReviewOf("nmck")}
            canReview={canWorkflowAction}
            onApprove={() => requestApproveSection("nmck")}
            onRevision={() => setSectionReview("nmck", "revision")}
            constructorLink={{
              to: `/nmck-calculator?planId=${plan.id}&positionId=${position.id}${editingNoteId ? `&noteId=${editingNoteId}` : ""}`,
              label: "Открыть модуль расчёта НМЦК",
            }}
          />
          {/* Двухколоночная сетка: поле НМЦК занимает ровно половину
              ширины раздела, остальные поля — на всю ширину */}
          <div className={block("grid", ["two"])}>
            <div className={block("field", ["half"])}>
              <label className={block("label")} htmlFor="note-nmck">
                НМЦК, рублей *
              </label>
              <div className={block("nmck-row")}>
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
              </div>
              <span className={block("hint")}>{nmckPriceTypeLabel}</span>
              {errorText("initialMaxPrice") && (
                <span className={block("error")}>
                  {errorText("initialMaxPrice")}
                </span>
              )}
            </div>

            {/* Текстовое обоснование НМЦК не дублируем в форме: оно
                формируется в модуле расчёта и доступно в PDF-файле.
                Значение сохраняем скрытым, чтобы не потерять в старых СЗ. */}
            <input type="hidden" {...register("priceBasis")} />

            {/* Файл обоснования НМЦК, запрос на него и кнопка провалиться/начать делать расчёт */}
            <div className={block("field", ["wide"])}>
              <div className={block("nmck-box")}>
                <div className={block("label-row")}>
                  <strong>Файл обоснования НМЦК и запрос КП</strong>
                </div>

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
                        {watchedNmckCalculation.commercialRequestSent && (
                          <span className={block("nmck-status-badge")}>
                            Запрос ком. предложений
                          </span>
                        )}
                        <span
                          className={block("hint")}
                          style={{ marginTop: 0 }}
                        >
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
                              {formatNmckMoney(
                                watchedNmckCalculation.nmckTotal,
                              )}{" "}
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
                              {formatNmckMoney(
                                watchedNmckCalculation.nmckTotal,
                              )}{" "}
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
                              {formatNmckMoney(
                                watchedNmckCalculation.nmckTotal,
                              )}{" "}
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
                            {watchedNmckCalculation.tariffValidTo}) истёк на
                            дату расчёта.
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={block("nmck-kpis")}>
                          <div className={block("nmck-kpi")}>
                            <span>Итоговая НМЦК</span>
                            <strong>
                              {formatNmckMoney(
                                watchedNmckCalculation.nmckTotal,
                              )}{" "}
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
                                      watchedNmckCalculation.costProfitCoeff ??
                                      1,
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

                {/* Обоснование НМЦК показываем готовым PDF с прокруткой.
                    Нативный <details> свёрнут по умолчанию и не блокируется
                    disabled у fieldset, поэтому превью доступно и при чтении. */}
                <details className={block("nmck-preview")}>
                  <summary>
                    <strong>Обоснование НМЦК</strong>
                  </summary>
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
                    {watchedNmckCalculation && (
                      <button
                        type="button"
                        className={block("mode-btn")}
                        onClick={() => void buildNmckPreview()}
                        disabled={isBuildingNmckPreview}
                      >
                        <FileDown size={13} aria-hidden="true" />
                        {isBuildingNmckPreview
                          ? "Формирование…"
                          : "Обновить превью"}
                      </button>
                    )}
                  </div>

                  {nmckPreviewUrl ? (
                    <iframe
                      className={block("nmck-preview-frame")}
                      src={nmckPreviewUrl}
                      title="Обоснование НМЦК"
                    />
                  ) : (
                    <span className={block("hint")}>
                      {isBuildingNmckPreview
                        ? "Формируется превью обоснования НМЦК…"
                        : "Превью появится после расчёта обоснования НМЦК."}
                    </span>
                  )}

                  {nmckSignMessage && (
                    <div className={block("alert-warning")} role="status">
                      {nmckSignMessage}
                    </div>
                  )}
                </details>
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {/* 4. Способ, относительные/абсолютные сроки поставки, приёмка, места */}
      {laterSectionsReady && (
        <fieldset
          className={block("section", isSectionApproved("procedure") ? ["locked"] : [])}
          disabled={isReadOnly}
        >
          <legend>
            4. Способ определения поставщика, сроки поставки, приёмки и места
          </legend>
          <PurchaseNoteSectionActions
            review={sectionReviewOf("procedure")}
            canReview={canWorkflowAction}
            onApprove={() => requestApproveSection("procedure")}
            onRevision={() => setSectionReview("procedure", "revision")}
          />
          <div className={block("grid")}>
            {/* Способ закупки — на всю ширину: длинные официальные названия
              должны читаться целиком, без обрезки многоточием */}
            <div className={block("field", ["wide"])}>
              <span className={block("label")}>
                Способ определения поставщика
              </span>
              {/* Кастомный список: нативный select с длинными названиями
                способов выпадал за пределы экрана */}
              <CustomSelect
                listData={PLACING_WAYS_ALL}
                selectedValue={watchedPlacingWay || null}
                placeholder="Выберите способ"
                modifier={["wrap"]}
                getKey={(way) => way.code}
                getLabel={(way) => way.label}
                renderItem={(way) => way.label}
                searchable
                searchPlaceholder="Поиск способа закупки…"
                onClick={(_key, way) =>
                  setValue("placingWayCode", way.code, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
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
                      <Select
                        id="note-eval-category"
                        className={block("select")}
                        {...register("evaluationObjectCategory")}
                      >
                        {mapping.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </Select>
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
                                    ? objectCategoryLimits(
                                        match.category,
                                        mapping,
                                      ).label
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
                                {criterion.indicators.map(
                                  (indicator, indicatorIndex) => {
                                    // Вид показателя выбирается из справочника
                                    // Положения N 2604 — как формулы критерия,
                                    // а не вводится свободным текстом
                                    const allowedKinds = [
                                      ...(indicatorKindsByCriterion[
                                        criterion.type
                                      ] ?? []),
                                    ];
                                    if (
                                      indicator.kind &&
                                      !allowedKinds.includes(indicator.kind)
                                    ) {
                                      allowedKinds.unshift(indicator.kind);
                                    }

                                    return (
                                      <div
                                        className={block("indicator-row")}
                                        key={indicatorIndex}
                                      >
                                        <Select
                                          className={block("select")}
                                          aria-label={`Вид показателя ${indicatorIndex + 1}`}
                                          {...register(
                                            `evaluationCriteria.${index}.indicators.${indicatorIndex}.kind`,
                                            {
                                              onChange: (event) => {
                                                const kind = event.target
                                                  .value as keyof typeof indicatorKindLabels;
                                                const label =
                                                  indicatorKindLabels[kind];
                                                if (label) {
                                                  setValue(
                                                    `evaluationCriteria.${index}.indicators.${indicatorIndex}.name`,
                                                    label,
                                                    {
                                                      shouldDirty: true,
                                                      shouldValidate: true,
                                                    },
                                                  );
                                                }
                                              },
                                            },
                                          )}
                                        >
                                          {allowedKinds.map((kind) => (
                                            <option key={kind} value={kind}>
                                              {indicatorKindLabels[kind]}
                                            </option>
                                          ))}
                                        </Select>
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
                                        <Select
                                          className={block("select")}
                                          aria-label={`Направление оценки показателя ${indicatorIndex + 1}`}
                                          {...register(
                                            `evaluationCriteria.${index}.indicators.${indicatorIndex}.best`,
                                          )}
                                        >
                                          {BEST_DIRECTIONS.map((direction) => (
                                            <option
                                              key={direction}
                                              value={direction}
                                            >
                                              {bestDirectionLabels[direction]}
                                            </option>
                                          ))}
                                        </Select>
                                        <Select
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
                                        </Select>
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
                                        {indicator.scoring === "other" && (
                                          <input
                                            className={block("input", ["full"])}
                                            aria-label={`Иной порядок оценки показателя ${indicatorIndex + 1}`}
                                            placeholder="Опишите иной порядок оценки (п. 22 Положения)"
                                            {...register(
                                              `evaluationCriteria.${index}.indicators.${indicatorIndex}.otherOrder`,
                                            )}
                                          />
                                        )}
                                      </div>
                                    );
                                  },
                                )}
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
                  <div className={block("grid", ["aligned"])}>
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
                      <label
                        className={block("label")}
                        htmlFor="note-exec-days"
                      >
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
                  <div className={block("grid", ["aligned"])}>
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
              <span className={block("label")}>
                Срок приёмки (ст. 94 44-ФЗ)
              </span>
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

            {/* Множественные места поставки — тот же каскад, что в Извещении.
              Название модуля зависит от вида объекта закупки */}
            <div className={block("field", ["wide"])}>
              <span className={block("label")}>Места {deliveryPlaceNoun}</span>
              {placeFields.map((placeField, pIndex) => {
                const currentPlace =
                  watch(`deliveryPlaces.${pIndex}`) ?? placeField;

                return (
                  <div key={placeField.id} className={block("item-card")}>
                    <div className={block("item-card-header")}>
                      <span>
                        Место {deliveryPlaceNoun} № {pIndex + 1}
                      </span>
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
                + Добавить место {deliveryPlaceNoun}
              </button>
            </div>
          </div>
        </fieldset>
      )}

      {/* 5. Финансирование, КБК по годам, аванс и сопровождение */}
      {laterSectionsReady && (
        <fieldset
          className={block("section", isSectionApproved("finance") ? ["locked"] : [])}
          disabled={isReadOnly}
        >
          <legend>5. Финансирование, аванс и сопровождение (ст. 34)</legend>
          <PurchaseNoteSectionActions
            review={sectionReviewOf("finance")}
            canReview={canWorkflowAction}
            onApprove={() => requestApproveSection("finance")}
            onRevision={() => setSectionReview("finance", "revision")}
          />
          <div className={block("grid")}>
            {/* Верхний уровень раздела: аванс. НМЦК и её обоснование
              вынесены в отдельный блок сразу после ООЗ. */}
            <div className={block("field", ["wide"])}>
              <div className={block("finance-summary")}>
                {/* Аванс: компактный чекбокс и поле процента в одной строке */}
                <div className={block("advance-row")}>
                  <CustomCheckbox
                    compact
                    label="Предусмотрен аванс"
                    checked={watchedHasAdvance}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setValue("hasAdvance", event.target.checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  {watchedHasAdvance && (
                    <input
                      className={block("input", ["advance"])}
                      {...register("advancePercent")}
                      placeholder="Размер аванса, %"
                      aria-label="Размер аванса, %"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Бюджет и источник финансирования — в начале раздела и на всю
              ширину: длинные значения должны читаться целиком */}
            <div className={block("field", ["wide"])}>
              <span className={block("label")}>Уровень бюджета заказчика</span>
              <span className={block("readonly-value")}>
                {orgBudgetLevelLabel || "не указан"}
              </span>
            </div>

            <div className={block("field", ["wide"])}>
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
                  <Select
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
                  </Select>
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

                {/* Таблица КБК не скроллится: подписи годов переносятся,
                    колонки делят доступную ширину */}
                <div className={block("kbk-table-wrap")}>
                  <table className={block("kbk-table")}>
                    <thead>
                      <tr>
                        <th>КБК</th>
                        {kbkColumns.map((column) => (
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
                          {kbkColumns.map((column) => {
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
                                  {/* Подпись лимита рендерится всегда: при
                                      отсутствии превышения держим пустую
                                      строку, чтобы инпуты оставались на одном
                                      уровне во всех строках таблицы */}
                                  <span
                                    className={block("kbk-hint", [
                                      overLimit ? "over" : "",
                                    ])}
                                  >
                                    {limit !== null && overLimit
                                      ? `лимит ПГ: ${formatRub(limit)}`
                                      : "\u00A0"}
                                  </span>
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

                {/* Флаг «Запрос на изменение КБК (КВР)» убран из формы.
                    Поля схемы (kbkDisagreement, kbkSuggested,
                    kbkDisagreementComment) сохранены для совместимости со
                    старыми записями, автор запроса проставляется в submit. */}
              </div>
            </div>

            {/* Уровень бюджета и источник финансирования вынесены в начало
              раздела, чтобы длинные значения читались целиком */}
          </div>
        </fieldset>
      )}

      {!laterSectionsReady && (
        <div className={block("pending-notice")}>
          Утвердите структурированное ООЗ кнопкой в блоке 2 «Предмет и объекты
          закупки», затем подготовьте и подпишите обоснование НМЦК в ЭП.
          Остальные требования служебной записки появятся после этого.
        </div>
      )}

      {laterSectionsReady && (
        <>
          {/* 6. Преимущества СМП, требования ст. 31, ПП 1482, ПП 2571 и санкционный РНП */}
          <fieldset
            className={block("section", isSectionApproved("participants") ? ["locked"] : [])}
            disabled={isReadOnly}
          >
            <legend>
              6. СМП/СОНКО (ст. 30) и требования к участникам (ст. 31, ПП 1482,
              ПП 2571)
            </legend>
            <PurchaseNoteSectionActions
              review={sectionReviewOf("participants")}
              canReview={canWorkflowAction}
              onApprove={() => requestApproveSection("participants")}
              onRevision={() => setSectionReview("participants", "revision")}
            />
            <div className={block("grid")}>
              {/* СМП: только среди СМП + галочка привлечения субподрядчиков -> размер */}
              <div className={block("field", ["smp"])}>
                {/* Предупреждения валидации ст. 30 и смешивания перечней ОКПД2 */}
                {smpMixingValidation.warningMessage && (
                  <div className={block("alert-warning")} role="alert">
                    <strong>Внимание!</strong>{" "}
                    {smpMixingValidation.warningMessage}
                  </div>
                )}
                {smpValidation.some((v) => v.smpSubcontractingRequired) && (
                  <div className={block("hint")}>
                    ч. 5 ст. 30 Закона № 44-ФЗ — требуется привлечение
                    СМП-субподрядчиков (не менее 5% от цены контракта).
                  </div>
                )}

                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("advantageSmpPart3Art30")}
                  />
                  <span>
                    Закупка только среди СМП и СОНКО (ч. 3 ст. 30 44-ФЗ)
                  </span>
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
                    Предупреждение: так нельзя — нельзя одновременно
                    устанавливать преимущество/закупку только среди СМП (ч. 3
                    ст. 30) и требование о привлечении субподрядчиков из СМП (ч.
                    5 ст. 30 Закона № 44-ФЗ).
                  </div>
                )}

                {/* Рекомендации по итогам анализа КП: помогают выбрать между
                    ограничением ч. 3 ст. 30 и привлечением субподрядчиков */}
                {smpRecommendations.length > 0 && (
                  <div className={block("recommendations")}>
                    <strong>Рекомендации по ст. 30</strong>
                    <ul>
                      {smpRecommendations.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Практика прошлых лет: средний фактический уровень
                    привлечения СМП по сопоставимым контрактам. Ничего не
                    навязываем — расчёт показываем, применить можно кнопкой */}
                <div className={block("practice")}>
                  <div className={block("label-row")}>
                    <strong>Практика прошлых лет</strong>
                    <label className={block("practice-year")}>
                      Период
                      <Select
                        className={block("select")}
                        value={String(smpPracticeYear)}
                        onChange={(event) =>
                          setSmpPracticeYear(Number(event.target.value))
                        }
                      >
                        {smpPracticeYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  {smpPractice.average !== null ? (
                    <>
                      <span className={block("hint")}>
                        Предлагаемый уровень привлечения СМП —{" "}
                        <strong>{smpPractice.average.toFixed(1)}%</strong>:
                        средний фактический процент по {smpPractice.contracts}{" "}
                        {smpPractice.contracts === 1
                          ? "контракту"
                          : "контрактам"}{" "}
                        за {smpPracticeYear} год
                        {smpPractice.comparable
                          ? " с сопоставимым предметом."
                          : " (сопоставимых по ОКПД2 не нашлось — расчёт по всем контрактам года)."}
                      </span>
                      <button
                        type="button"
                        className={block("link-btn")}
                        onClick={() => {
                          const percent = smpPractice.average?.toFixed(1) ?? "";
                          setValue("smpRequiredPercent", percent, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (!watchedAdvantageSmp) {
                            setValue("requiresSmpSubcontracting", true, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                      >
                        Применить {smpPractice.average.toFixed(1)}% как размер
                        привлечения
                      </button>
                    </>
                  ) : (
                    <span className={block("hint")}>
                      За {smpPracticeYear} год в контрактах заказчика нет
                      сведений о привлечении СМП — укажите процент вручную.
                    </span>
                  )}
                </div>

                {watchedSmpSubcontracting && (
                  <div className={block("subbox")}>
                    <label
                      className={block("label")}
                      htmlFor="note-smp-percent"
                    >
                      Размер привлечения субподрядчиков из СМП/СОНКО (ч. 5 ст.
                      30, ПП РФ № 1466), % *
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
                  {/* Первый: ч. 1.1 ст. 31 — обязательное требование, включено
                      всегда и не редактируется (БЕЗ поля описания) */}
                  <div className={block("req-item")}>
                    <CustomCheckbox
                      label="Требования к участникам закупок в соответствии с ч. 1.1 ст. 31 Закона № 44-ФЗ (включено по умолчанию)"
                      checked
                      readOnly
                      disabled
                    />
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
                        оборудования для исполнения государственного контракта
                        (п. 1 ПП РФ от 25.12.2014 № 1482)
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
                        Финансовая устойчивость и платежеспособность (п. 1 ПП РФ
                        от 25.12.2014 № 1482)
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
                      <input
                        type="checkbox"
                        {...register("pp1482Specialists")}
                      />
                      <span>
                        Наличие специалистов, имеющих профессиональное
                        образование, отвечающих соответствующим квалификационным
                        требованиям, заключивших с участником размещения
                        государственного оборонного заказа трудовые договоры,
                        необходимых в соответствии с документацией о закупке для
                        исполнения государственного контракта (п. 1 ПП РФ от
                        25.12.2014 № 1482)
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
                        Требование к участникам закупок в соответствии с п. 1 ч.
                        1 ст. 31 Закона № 44-ФЗ
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
                        Единые требования к участникам закупок в соответствии с
                        ч. 1 ст. 31 Закона № 44-ФЗ
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

                    {/* Позиции приложения, пороги НМЦК и подтверждающие документы.
                    Список разворачивается по флагу ч. 2 ст. 31; замечания
                    валидатора видны всегда, чтобы рассинхрон флага и выбранных
                    позиций обнаруживался до сохранения */}
                    <Pp2571RequirementsPanel
                      open={watchedPart2Art31}
                      nmck={nmckValue}
                      placingWayCode={watchedPlacingWayCode}
                      items={watchedItems}
                      selected={watchedPp2571}
                      onChange={(next) =>
                        setValue("pp2571Positions", next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      issues={pp2571Issues}
                      onFillRequirementText={() => {
                        setValue(
                          "additionalRequirementsPart2Art31Text",
                          buildPp2571RequirementText(watchedPp2571, nmckValue),
                          { shouldDirty: true, shouldValidate: true },
                        );
                        if (!watchedPart2Art31) {
                          setValue("additionalRequirementsPart2Art31", true, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      disabled={isReadOnly}
                    />

                    {watchedPart2Art31 && (
                      <div className={block("nested-box")}>
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
                        Требования к участникам закупок в соответствии с ч. 2.1
                        ст. 31 Закона № 44-ФЗ
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
                        причине введения в отношении заказчика санкций и (или)
                        мер ограничительного характера
                      </span>
                    </label>
                  </div>

                  {rnpConflictWarning && (
                    <div className={block("alert-warning")} role="alert">
                      Предупреждение: требование об отсутствии в РНП по ч. 1.1
                      ст. 31 Закона № 44-ФЗ и санкционное требование об
                      отсутствии в РНП вместе не должны устанавливаться.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </fieldset>

          {/* 7. Обеспечение заявки, контракта, гарантия качества и обеспечение гарантий */}
          <fieldset
            className={block("section", isSectionApproved("security") ? ["locked"] : [])}
            disabled={isReadOnly}
          >
            <legend>
              7. Обеспечение заявки, контракта, гарантия качества и реквизиты
            </legend>
            <PurchaseNoteSectionActions
              review={sectionReviewOf("security")}
              canReview={canWorkflowAction}
              onApprove={() => requestApproveSection("security")}
              onRevision={() => setSectionReview("security", "revision")}
            />

            <div className={block("toolbar-row")}>
              <span className={block("hint")}>
                Реквизиты счёта заказчика и бюджетного счёта по ч. 13 ст. 44
                44-ФЗ вносит и актуализирует уполномоченный член КС.
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
                  <span>
                    Требуется обеспечение заявки (ст. 44 Закона № 44-ФЗ)
                  </span>
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
                      budgetAccount={watch(
                        "applicationSecurityBudgetRequisites",
                      )}
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
                          Порядок предоставления обеспечения исполнения
                          контракта
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
                    Гарантия качества и обеспечение гарантийных обязательств
                    (единый связанный блок)
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
                    onChange={(e) =>
                      handleToggleQualityWarranty(e.target.checked)
                    }
                  />
                  <span>
                    Требуется гарантия качества товара, работы, услуги
                  </span>
                </label>

                {watchedQualityWarranty && (
                  <div className={block("nested-box")}>
                    <div className={block("grid")}>
                      <div className={block("field", ["wide"])}>
                        <label
                          className={block("label")}
                          htmlFor="note-warranty-maint"
                        >
                          1) Информация о требованиях к гарантийному
                          обслуживанию товара
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
                      Требуется обеспечение гарантийных обязательств (доступно
                      при включённой гарантии качества)
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

              {securityNormsIssues.length > 0 && (
                <div className={block("field", ["wide"])}>
                  <span className={block("label")}>
                    Размеры обеспечений: ошибки {securityNormsErrors.length},
                    предупреждения{" "}
                    {securityNormsIssues.length - securityNormsErrors.length}
                  </span>
                  <ul className={block("security-norms")}>
                    {securityNormsIssues.map((issue) => {
                      const isError = issue.level === "error";
                      return (
                        <li
                          key={`${issue.code}-${issue.field}-${issue.level}`}
                          className={[
                            block("security-norm"),
                            isError ? block("security-norm", ["error"]) : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          role={isError ? "alert" : "status"}
                        >
                          <span className={block("security-norm-level")}>
                            {isError
                              ? "Ошибка — блокирует утверждение"
                              : "Предупреждение"}
                          </span>
                          {issue.message}
                          <span className={block("security-norm-ref")}>
                            {issue.legalRef}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

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
        </>
      )}

      {/* 8. Проект контракта — последний раздел формы: файл утверждённого
          проекта контракта подтягивается в СЗ и извещение автоматически */}
      {laterSectionsReady && (
        <fieldset
          className={block("section", isSectionApproved("contract") ? ["locked"] : [])}
          disabled={isReadOnly}
        >
          <legend>8. Проект контракта</legend>
          <PurchaseNoteSectionActions
            review={sectionReviewOf("contract")}
            canReview={canWorkflowAction}
            onApprove={() => requestApproveSection("contract")}
            onRevision={() => setSectionReview("contract", "revision")}
            constructorOnClick={{
              label: "Открыть конструктор проекта контракта",
              onClick: () => {
                const procurementId = watch("procurementId");
                const hasProcurement =
                  procurementId !== undefined &&
                  procurementId !== null &&
                  procurementId !== "";
                navigate(
                  hasProcurement
                    ? `/procurement-processing/${procurementId}/contract-project`
                    : "/contract-projects",
                );
              },
            }}
          />
          <div className={block("subblock")}>
            <div className={block("field", ["wide"])}>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("isLifecycleContract")} />
                <span>
                  С поставщиком (подрядчиком, исполнителем) будет заключён
                  контракт жизненного цикла (ПП РФ от 28.11.2013 № 1087)
                </span>
              </label>
              {watch("isLifecycleContract") && (
                <div className={block("nested-box")}>
                  {LIFECYCLE_CASES_PP1087.map((item) => (
                    <label key={item} className={block("checkbox")}>
                      <input
                        type="checkbox"
                        checked={(watch("lifecycleCasesPP1087") ?? []).includes(item)}
                        onChange={() => {
                          const current = watch("lifecycleCasesPP1087") ?? [];
                          const next = current.includes(item)
                            ? current.filter((caseItem) => caseItem !== item)
                            : [...current, item];
                          setValue("lifecycleCasesPP1087", next, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className={block("hint")}>
              Проект контракта формируется в структурированной форме — отдельным
              конструктором. После утверждения его файл подтягивается в
              служебную записку и извещение.
            </p>

            {/* Превью проекта контракта: собирается из введённых значений СЗ
                либо из уже отредактированного проекта контракта закупки.
                Свёрнуто по умолчанию; <details> не блокируется disabled
                у fieldset, поэтому доступно и в режиме чтения. */}
            <details
              className={block("contract-preview")}
              onToggle={handleContractPreviewToggle}
            >
              <summary>
                <strong>Предпросмотр проекта контракта</strong>
              </summary>
              <div className={block("contract-preview-body")}>
                {/* Кнопки внутри disabled fieldset заблокированы, поэтому в
                    режиме чтения панель управления не показываем: остаётся
                    только текст документа и его основание */}
                {!isReadOnly && (
                  <div className={block("contract-preview-toolbar")}>
                    <div className={block("contract-preview-modes")}>
                      <button
                        type="button"
                        className={block("mode-btn", [
                          effectiveContractPreviewMode === "note"
                            ? "active"
                            : "",
                        ])}
                        onClick={() => switchContractPreviewMode("note")}
                      >
                        По введённым значениям
                      </button>
                      <button
                        type="button"
                        className={block("mode-btn", [
                          effectiveContractPreviewMode === "project"
                            ? "active"
                            : "",
                        ])}
                        disabled={!linkedContractProject}
                        title={
                          linkedContractProject
                            ? "Сохранённая редакция проекта контракта закупки — с правками конструктора"
                            : "Проект контракта по закупке ещё не создан"
                        }
                        onClick={() => switchContractPreviewMode("project")}
                      >
                        Сохранённый проект
                      </button>
                    </div>
                    <button
                      type="button"
                      className={block("mode-btn")}
                      onClick={() => buildContractPreview()}
                    >
                      <FileDown size={13} aria-hidden="true" /> Обновить превью
                    </button>
                  </div>
                )}
                {contractPreviewDocument ? (
                  <article className={block("contract-preview-doc")}>
                    <p className={block("contract-preview-source")}>
                      Основание: {contractPreviewBasis || "—"}
                    </p>
                    <h4 className={block("contract-preview-title")}>
                      {contractPreviewDocument.title}
                    </h4>
                    <p className={block("contract-preview-text")}>
                      {contractPreviewDocument.preamble}
                    </p>
                    {contractPreviewDocument.sections.map((section) => (
                      <div
                        key={section.id}
                        className={block("contract-preview-section")}
                      >
                        <h5>
                          {section.number}. {section.title}
                        </h5>
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    ))}
                    {contractPreviewDocument.appendices.length > 0 && (
                      <div className={block("contract-preview-section")}>
                        <h5>Приложения</h5>
                        {contractPreviewDocument.appendices.map((appendix) => (
                          <p key={appendix.number}>
                            {appendix.number}. {appendix.title}
                            {appendix.note ? ` — ${appendix.note}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className={block("contract-preview-signature")}>
                      {contractPreviewDocument.signature.map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </article>
                ) : (
                  <span className={block("hint")}>
                    Превью собирается при раскрытии: по сохранённой редакции
                    проекта контракта закупки, а если его ещё нет — по введённым
                    значениям служебной записки.
                  </span>
                )}
              </div>
            </details>
          </div>
        </fieldset>
      )}

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

      {approvalBlockedFor && (
        <div
          className={block("mini-modal-backdrop")}
          onClick={() => setApprovalBlockedFor(null)}
        >
          <div
            className={block("mini-modal")}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={block("mini-modal-title")}>
              Блок не может быть утверждён
            </h3>
            <p className={block("hint")}>
              Устраните блокирующие замечания и повторите утверждение:
            </p>
            <ul className={block("mini-modal-list")}>
              {approvalBlockedFor.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <button
              type="button"
              className={block("btn-accent")}
              onClick={() => setApprovalBlockedFor(null)}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      <footer className={block("footer")}>
        {errorText("root") && (
          <span className={block("error")}>{errorText("root")}</span>
        )}
        {nationalRegimeValidation.hasErrors && (
          <span className={block("alert-warning")}>
            {nationalRegimeValidation.summary}. Черновик сохраняется, но
            утверждение требует решения КС.
          </span>
        )}
        {(createNote.isError || updateNote.isError) && (
          <span className={block("error")}>
            Потребность не сохранена:{" "}
            {String(createNote.error || updateNote.error)}
          </span>
        )}
        <div className={block("footer-actions")}>
          {canWorkflowAction &&
            isDraftLikeStatus &&
            !nationalRegimeValidation.blocksSave && (
              <button
                type="button"
                className={block("btn-accent")}
                onClick={() => submitWorkflow("in_review")}
              >
                Отправить на согласование
              </button>
            )}
          {canWorkflowAction &&
            isDraftLikeStatus &&
            nationalRegimeValidation.blocksSave && (
              <button
                type="button"
                className={block("btn-accent")}
                disabled={!organization?.id || !ksAssignee?.employeeId}
                onClick={requestKsReview}
              >
                Запросить решение КС
              </button>
            )}
          {canWorkflowAction && watchedStatus === "in_review" && (
            <>
              <button
                type="button"
                className={block("btn")}
                onClick={() => submitWorkflow("revision")}
              >
                Отправить на доработку
              </button>
              <button
                type="button"
                className={block("btn-primary")}
                onClick={completeKsReview}
              >
                Согласовать КС
              </button>
            </>
          )}
          {canWorkflowAction && watchedStatus === "ks_approved" && (
            <>
              <button
                type="button"
                className={block("btn")}
                onClick={() => submitWorkflow("revision")}
              >
                Отправить на доработку
              </button>
              <button
                type="button"
                className={block("btn-primary")}
                onClick={() => submitWorkflow("approved")}
              >
                Утвердить
              </button>
            </>
          )}
          <button type="button" onClick={onClose} disabled={isBusy}>
            {isReadOnly ? "Назад к реестру потребностей" : "Отмена"}
          </button>
          <button
            type="submit"
            className={block("btn-primary")}
            disabled={
              isBusy || isReadOnly || nationalRegimeValidation.blocksSave
            }
            title={
              nationalRegimeValidation.blocksSave
                ? "Исправьте национальный режим: по позициям обязательны запрет или ограничение"
                : undefined
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
