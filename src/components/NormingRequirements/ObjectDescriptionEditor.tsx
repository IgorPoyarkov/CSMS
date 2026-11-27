import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import PurchaseObjectsSection from "./PurchaseObjectsSection";
import { usePurchaseObjects, useUpdatePurchaseObject } from "../../services/PurchaseObject/purchaseObject.api";
import type { PurchaseObject } from "../../services/PurchaseObject/purchaseObject.schema";
import { formatMoney } from "../PurchasePlan/purchasePlan.config";
import { usePurchasePlan } from "../../services/PurchasePlan/purchasePlan.api";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import {
  applyDescriptionComponentToggle,
  buildObjectDescriptionSummaryText,
  CHARACTERISTIC_CATEGORIES,
  CHARACTERISTIC_VALUE_TYPES,
  characteristicCategoryLabels,
  characteristicValueTypeLabels,
  CONSTRUCTION_DOC_TYPES,
  constructionDocTypeLabels,
  DESCRIPTION_COMPONENT_DOCUMENTS,
  DESCRIPTION_COMPONENTS,
  descriptionComponentLabels,
  emptyCharacteristic,
  emptyDescriptionAttachment,
  formatCharacteristicValue,
  gostPublicationYear,
  MODERN_GOST_MIN_YEAR,
  STANDARD_TYPES,
  standardTypeLabels,
  TRADEMARK_RULES,
  trademarkRuleLabels,
  validateObjectDescriptionCompliance,
  OBJECT_DESCRIPTION_PRODUCT_TYPE_LABELS,
  OBJECT_DESCRIPTION_PRODUCT_TYPES,
  type CharacteristicCategory,
  type DescriptionComponent,
  type ObjectCharacteristic,
  type ObjectDescription,
  type ObjectDescriptionAttachment,
  type ObjectDescriptionProductType,
  type ObjectDescriptionStatus,
  type ObjectStandardRef,
} from "../../services/ObjectDescription/objectDescription.schema";
import {
  checkOkpd2NationalRegime,
  recommendNationalRegime,
} from "../../services/NationalRegime/pp1875";
import { formatFileSize } from "../../services/ContractSmp/sourceFile";
import {
  isGoodsObjectDescription,
  mergeKtruCharacteristics,
  ktruToObjectCharacteristics,
} from "../../services/ObjectDescription/descriptionTemplates";
import {
  findKtruByCode,
  findKtruByOkpd2,
  ktruMandatoryNotice,
  useCharacteristicsFillingInstructions,
  useKtruDictionary,
} from "../../services/KtruRef/ktruRef.api";
import type {
  KtruCharacteristic,
  KtruRef,
} from "../../services/KtruRef/ktruRef.schema";
import {
  findGostInCatalog,
  gostHintSummary,
} from "../../services/GostRef/gostRef.schema";
import {
  findGostRequirements,
  type GostRequirement,
} from "../../services/GostRef/gostRequirements.schema";
import {
  useGostCatalog,
  useGostRequirements,
} from "../../services/GostRef/gostRef.api";
import {
  findAgentDocuments,
  findAgentSuggestions,
  type OozAgentDocument,
} from "../../services/OozAgent/oozAgent.schema";
import { useOozAgent } from "../../services/OozAgent/oozAgent.api";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";
import KtruSelect from "../UI/KtruSelect/KtruSelect";
import CustomCheckbox from "../UI/CustomCheckbox";
import CustomButton from "../UI/CustomButton";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import Order158nValidatorPanel from "./Order158nValidatorPanel";
import AgentFullTextModal from "./AgentFullTextModal";
import CustomModal from "../UI/CustomModal";
import styles from "./NormingRequirementsPage.module.scss";
import Select from "../UI/Select";

/** Добавляем требование в конец поля, но не повторяем уже включённое. */
const appendUnique = (current: string, value: string): string => {
  const existing = current.trim();
  if (!existing) return value;
  return existing.includes(value) ? existing : `${existing}\n${value}`;
};

const AGENT_STATUS_LABELS: Record<string, string> = {
  has_requirements: "есть требования с цитатами",
  no_quotes: "в тексте нет подходящих цитат",
  needs_full_text: "нужен полный текст — поле не заполняется",
};

const SUGGESTION_STATUS_LABELS: Record<string, string> = {
  confirmed: "проверено по тексту",
  needs_review: "требует проверки",
  unconfirmed: "не подтверждено",
};

interface ObjectDescriptionEditorProps {
  initialValue: ObjectDescription;
  /** Организация заказчика — нужна, чтобы прочитать исходный план-график */
  organizationId?: string | number;
  templatesByCode: Record<string, ObjectDescription>;
  contractService?: ContractService | null;
  educations?: EmployeeEducation[];
  isHead: boolean;
  defaultApproverName: string;
  isSaving: boolean;
  /**
   * Сохранить карточку как черновик, не закрывая редактор. Нужен, чтобы
   * «Добавить объект» работал в ещё не сохранённой карточке из СЗ.
   */
  onPersistDraft?: (value: ObjectDescription) => Promise<
    ObjectDescription | undefined
  >;
  onSave: (value: ObjectDescription) => void;
  onCancel: () => void;
}

/**
 * Структурированный редактор описания объекта закупки (ст. 33 44-ФЗ,
 * ПП РФ N 145 и п. 7 ПП РФ N 926). Работает и как самостоятельный конструктор
 * на /norming-requirements, и как основа для интеграции в СЗ и извещение.
 */
export default function ObjectDescriptionEditor({
  initialValue,
  organizationId,
  templatesByCode,
  contractService,
  educations = [],
  isHead,
  defaultApproverName,
  isSaving,
  onPersistDraft,
  onSave,
  onCancel,
}: ObjectDescriptionEditorProps) {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");
  const { data: okpd2Dictionary = [] } = useOkpd2Dictionary();
  // Снимок новых ГОСТов: подсказки по введённому обозначению без запросов к ЕИС.
  const { data: gostCatalog } = useGostCatalog();
  // Требования из полного текста ГОСТов — подстановка в поля ООЗ.
  const { data: gostRequirements } = useGostRequirements();
  // Агент ООЗ: ГОСТ и НПА из локальных снимков, без сети и LLM.
  const { data: oozAgent } = useOozAgent();
  const [fullTextDoc, setFullTextDoc] = useState<OozAgentDocument | null>(null);

  const [draft, setDraft] = useState<ObjectDescription>(initialValue);
  // Агент показывает только документы текущего ОКПД2. НПА ст. 33 применимы
  // ко всем описаниям, поэтому они приходят вместе с требованиями ГОСТа.
  const agentDocuments = useMemo(
    () => findAgentDocuments(oozAgent, draft.okpd2Code),
    [oozAgent, draft.okpd2Code],
  );
  const agentSuggestions = useMemo(() => {
    const gostSuggestions = agentDocuments
      .filter((doc) => doc.kind === "GOST")
      .flatMap((doc) => findAgentSuggestions(oozAgent, doc.code))
      .filter((suggestion) => suggestion.kind === "GOST");
    // Цитаты из полного текста НПА привязаны к документу текущего ОКПД2.
    const npaDocSuggestions = agentDocuments.flatMap((doc) =>
      findAgentSuggestions(oozAgent, doc.code).filter(
        (item) => item.kind === "NPA" && Boolean(item.documentCode),
      ),
    );
    // Нормы ст. 33 не зависят от выбранного ГОСТа и не дублируются.
    const suggestions = [
      ...gostSuggestions,
      ...npaDocSuggestions,
      ...findAgentSuggestions(oozAgent, ""),
    ];
    return suggestions.filter((suggestion) => {
      if (!suggestion.field.startsWith("descriptionComponents.")) return true;
      const component = suggestion.field.slice(
        "descriptionComponents.".length,
      );
      return !draft.descriptionComponents.some((item) => item === component);
    });
  }, [oozAgent, agentDocuments, draft.descriptionComponents]);
  // id карточки, сохранённой прямо из редактора (например, при добавлении
  // объекта). Исходный id приходит из списка ООЗ или из перехода по СЗ.
  const [persistedId, setPersistedId] = useState<string | number | undefined>(
    initialValue.id,
  );
  const descriptionId = persistedId ?? initialValue.id;
  const [categoryFilter, setCategoryFilter] = useState<
    CharacteristicCategory | "all"
  >("all");
  const [showPreview, setShowPreview] = useState(false);
  // Характеристики в форме редактируются у выбранного объекта закупки.
  const [activeObjectId, setActiveObjectId] = useState<
    string | number | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Попытка изменить единицу, зафиксированную позицией КТРУ.
  const [unitChangeBlocked, setUnitChangeBlocked] = useState(false);
  // Как в ЕИС: показывать в карточке КТРУ только обязательные поля.
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  // Поля КТРУ без единицы измерения заблокированы, пока пользователь не
  // решит задать единицу вручную (кнопка «Открыть» у такого поля).
  const [manualUnitCharacteristics, setManualUnitCharacteristics] = useState<
    string[]
  >([]);

  const { data: allPurchaseObjects = [] } = usePurchaseObjects(
    organizationId ?? initialValue?.organizationId ?? undefined,
  );
  const updatePurchaseObject = useUpdatePurchaseObject();
  const purchaseObjects = useMemo(
    () =>
      allPurchaseObjects.filter(
        (item) =>
          item.objectDescriptionId !== undefined &&
          String(item.objectDescriptionId) === String(descriptionId),
      ),
    [allPurchaseObjects, descriptionId],
  );

  // Все выбранные коды: код ООЗ плюс коды отдельных объектов закупки.
  const selectedOkpd2Codes = useMemo(
    () =>
      [
        draft.okpd2Code,
        ...purchaseObjects.map((item) => item.okpd2Code),
        ...(draft.okpd2Items ?? []).map((item) => item.code),
      ]
        .filter((code) => Boolean(code?.trim()))
        .map((code) => code.trim().toLowerCase()),
    [draft.okpd2Code, draft.okpd2Items, purchaseObjects],
  );
  const matchedOkpd2 = useMemo(
    () => findOkpd2ByCode(okpd2Dictionary, draft.okpd2Code),
    [okpd2Dictionary, draft.okpd2Code],
  );
  const templateForCode = draft.okpd2Code
    ? templatesByCode[draft.okpd2Code]
    : undefined;

  // Выбранная позиция КТРУ: единица измерения и характеристики берутся из неё,
  // поэтому справочник нужен даже если селект уже вернул код при выборе
  const {
    data: ktruDictionary = [],
    isLoading: ktruDictionaryLoading,
  } = useKtruDictionary();
  const { data: fillingInstructions = {} } =
    useCharacteristicsFillingInstructions();
  const instructionOptions = useMemo(
    () => Object.entries(fillingInstructions),
    [fillingInstructions],
  );
  const ktruForOkpd2 = useMemo(
    () =>
      selectedOkpd2Codes.flatMap((code) =>
        findKtruByOkpd2(ktruDictionary, code),
      ),
    [ktruDictionary, selectedOkpd2Codes],
  );
  const hasKtruForOkpd2 = ktruForOkpd2.length > 0;
  // Пока справочник грузится (или недоступен), флаг не прячем: иначе он
  // «мигнёт» на время загрузки или исчезнет при сбое НСИ.
  const ktruDictionaryUnavailable =
    !ktruDictionaryLoading && ktruDictionary.length === 0;
  const hideKtruFlag =
    Boolean(draft.okpd2Code) && !ktruDictionaryUnavailable && !hasKtruForOkpd2;
  const selectedKtru = useMemo(
    () => findKtruByCode(ktruDictionary, draft.ktruCode),
    [ktruDictionary, draft.ktruCode],
  );
  const ktruUnit = selectedKtru?.unit?.trim() ? selectedKtru.unit : "";
  const ktruUnitOptions =
    selectedKtru?.unitOptions?.length === 0 && ktruUnit
      ? [ktruUnit]
      : (selectedKtru?.unitOptions ?? []);
  // Единица фиксируется каталогом, только если в позиции она одна.
  const unitFromKtru =
    draft.useKtru && ktruUnitOptions.length === 1 && Boolean(ktruUnit);
  // Карточка может открыться уже с выбранной позицией КТРУ — обработчик
  // handleSelectKtru тогда не вызывался. Значение берём из справочника сразу
  // в форме и в сохраняемом документе, без лишней записи в состояние.
  const unitValue = unitFromKtru ? ktruUnit : draft.unit;
  // Сверяем даты обязательного применения с сегодняшним днём: пользователь
  // должен видеть, обязательна позиция уже или станет обязательной позже.
  const mandatoryNotice = useMemo(
    () => (selectedKtru ? ktruMandatoryNotice(selectedKtru) : null),
    [selectedKtru],
  );
  // Пока КТРУ не выбран, единицу не трогаем: она придёт из каталога
  const unitWaitingForKtru = draft.useKtru && !selectedKtru;
  const showNewGoodsRequirement = isGoodsObjectDescription(draft);

  // Национальный режим по ПП РФ № 1875: режим определяет агент по коду ОКПД2,
  // поэтому ч. 1.1 ст. 33 не нужно включать «по памяти».
  const nationalRegimeCheck = useMemo(
    () => checkOkpd2NationalRegime(draft.okpd2Code, okpd2Dictionary),
    [draft.okpd2Code, okpd2Dictionary],
  );
  const nationalRegimeRecommendation = useMemo(
    () => recommendNationalRegime(draft.okpd2Code, okpd2Dictionary),
    [draft.okpd2Code, okpd2Dictionary],
  );
  const expectedNationalRegime =
    nationalRegimeCheck.regime === "ban" ||
    nationalRegimeCheck.regime === "restriction"
      ? nationalRegimeCheck.regime
      : null;
  // Короткая подпись режима для карточки: та же формулировка, что в извещении.
  const nationalRegimeLabel =
    expectedNationalRegime === "ban"
      ? "запрет (приложение № 1)"
      : expectedNationalRegime === "restriction"
        ? "ограничение (приложение № 2)"
        : "";
  /**
   * Предустановка ч. 1.1 ст. 33: режим по ПП РФ № 1875 агент уже определил,
   * поэтому при выборе кода с запретом или ограничением раздел включается
   * сразу. Работ и услуг правило не касается.
   */
  const regimePresetRequired = (
    code: string,
    productType: ObjectDescriptionProductType,
  ): boolean => {
    if (!productType.startsWith("PRODUCT")) return false;
    const regime = checkOkpd2NationalRegime(code, okpd2Dictionary).regime;
    return regime === "ban" || regime === "restriction";
  };

  // ОКПД2 обязан быть общим с позицией плана-графика: иначе закупка не связана
  // с ПГ, и сохранение блокируется до внесения изменений в план-график.
  const { data: purchasePlan, isLoading: purchasePlanLoading } = usePurchasePlan(
    draft.purchasePlanId,
    organizationId ?? draft.organizationId ?? undefined,
  );
  const planPosition = useMemo(
    () =>
      purchasePlan?.positions.find(
        (item) => String(item.id) === String(draft.positionId),
      ),
    [purchasePlan, draft.positionId],
  );
  // Все коды позиции ПГ в исходном регистре — они же используются для
  // кнопки «Вернуть код из ПГ» в сообщении о расхождении.
  const planOkpd2Options = useMemo(() => {
    if (!planPosition) return [];
    const codes = [
      { code: planPosition.okpd2Code ?? "", name: planPosition.okpd2Name },
      ...(planPosition.okpd2Items ?? []).map((item) => ({
        code: item.okpd2Code ?? "",
        name: item.okpd2Name,
      })),
    ];
    const seen = new Set<string>();
    return codes.filter((item) => {
      const code = item.code?.trim();
      if (!code || seen.has(code.toLowerCase())) return false;
      seen.add(code.toLowerCase());
      return true;
    });
  }, [planPosition]);
  const planOkpd2Codes = useMemo(
    () => planOkpd2Options.map((item) => item.code.trim().toLowerCase()),
    [planOkpd2Options],
  );
  // Коды в исходном регистре — их отдаём в селекторы: при клике список
  // открывается на коде из ПГ, а не на первой странице справочника ОКПД2.
  const planOkpd2SelectCodes = useMemo(
    () => planOkpd2Options.map((item) => item.code.trim()),
    [planOkpd2Options],
  );
  const planContextExpected = Boolean(draft.purchasePlanId || draft.positionId);
  const planPositionMissing =
    planContextExpected && !purchasePlanLoading && !planPosition;
  // Каждый выбранный код ООЗ должен быть в ПГ: иначе закупка не связана
  // с позицией плана-графика, и все действия с ООЗ блокируются.
  const planOkpd2Mismatch =
    (Boolean(planPosition) || planPositionMissing) &&
    (selectedOkpd2Codes.length === 0 ||
      selectedOkpd2Codes.some((code) => !planOkpd2Codes.includes(code)));
  const planCheckPending =
    Boolean(draft.purchasePlanId) &&
    (purchasePlanLoading || (!purchasePlan && Boolean(organizationId)));
  const planBlocked =
    planOkpd2Mismatch || planPositionMissing || planCheckPending;

  // Инструкция участнику — текст из ЕИС. Если справочник подгрузился позже
  // позиции КТРУ, формулировку по сохранённому коду берём при показе и сохранении.
  const instructionText = (item: ObjectCharacteristic) =>
    (item.instructionSourceCode &&
      fillingInstructions[item.instructionSourceCode]) ||
    item.instructionForParticipant;

  const complianceIssues = useMemo(
    () =>
      validateObjectDescriptionCompliance(draft, {
        hasKtruForOkpd2: ktruDictionaryUnavailable
          ? undefined
          : hasKtruForOkpd2,
        expectedNationalRegime,
      }),
    [
      draft,
      hasKtruForOkpd2,
      ktruDictionaryUnavailable,
      expectedNationalRegime,
    ],
  );
  const blockingErrors = complianceIssues.filter((i) => i.level === "error");

  // Сводка для шапки и навигации по разделам: только реальные значения карточки,
  // без «прогресс-баров», которые нельзя проверить.
  const errorCount = blockingErrors.length;
  const warningCount = complianceIssues.length - errorCount;
  const filledAttachmentCount = draft.descriptionAttachments.filter(
    (attachment) => attachment.fileName.trim() || attachment.url.trim(),
  ).length;
  const sectionNavItems: Array<{
    id: string;
    index: string;
    label: string;
    note: string;
    level?: "error" | "warning" | "ok";
  }> = [
    {
      id: "ooz-section-1",
      index: "01",
      label: "Предмет и ОКПД2",
      note: draft.okpd2Code || "код не выбран",
    },
    {
      id: "ooz-section-2",
      index: "02",
      label: "Характеристики",
      note: `${draft.characteristics.length} шт.`,
    },
    {
      id: "ooz-section-3",
      index: "03",
      label: "Требования и материалы",
      note: `${draft.standards.length} док. · ${filledAttachmentCount} файл.`,
    },
    {
      id: "ooz-section-4",
      index: "04",
      label: "Специальные правила",
      note: showNewGoodsRequirement ? "товар" : "работы/услуги",
    },
    {
      id: "ooz-section-5",
      index: "05",
      label: "Контроль",
      note:
        complianceIssues.length === 0
          ? "без замечаний"
          : `${errorCount} ошиб. · ${warningCount} предупр.`,
      level:
        errorCount > 0 ? "error" : complianceIssues.length > 0 ? "warning" : "ok",
    },
  ];

  const visibleCharacteristics = useMemo(() => {
    if (categoryFilter === "all") {
      return draft.characteristics.map((item, idx) => ({ item, idx }));
    }
    return draft.characteristics
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.category === categoryFilter);
  }, [draft.characteristics, categoryFilter]);

  // Обязательные характеристики выбранной позиции КТРУ, которых ещё нет в ООЗ:
  // система должна предупреждать, а не заставлять пользователя сверять вручную.
  const missingMandatoryKtru = useMemo(() => {
    if (!draft.useKtru || !selectedKtru) return [];
    const present = new Set(
      draft.characteristics.map((c) => c.name.trim().toLowerCase()),
    );
    return selectedKtru.characteristics.filter(
      (c) => c.isMandatory && !present.has(c.name.trim().toLowerCase()),
    );
  }, [draft.useKtru, selectedKtru, draft.characteristics]);

  const hasMandatoryKtru = useMemo(
    () => selectedKtru?.characteristics.some((c) => c.isMandatory) ?? false,
    [selectedKtru],
  );
  // Переключатель в карточке позиции: обязательные поля видны всегда,
  // необязательные скрываются только из списка (в ООЗ они не теряются).
  const visibleKtruCharacteristics = useMemo(
    () =>
      mandatoryOnly
        ? (selectedKtru?.characteristics.filter((c) => c.isMandatory) ?? [])
        : (selectedKtru?.characteristics ?? []),
    [mandatoryOnly, selectedKtru],
  );

  /** Поле КТРУ, у которого в каталоге нет единицы измерения. */
  const ktruUnitAbsent = (item: ObjectCharacteristic) => {
    if (!draft.useKtru || !selectedKtru) return false;
    const source = selectedKtru.characteristics.find(
      (characteristic) =>
        characteristic.name.trim().toLowerCase() ===
        item.name.trim().toLowerCase(),
    );
    return Boolean(source && !source.unit?.trim());
  };

  /**
   * Пока пользователь не «открыл» такую характеристику, поле заблокировано.
   * Единица, заданная вручную (в том числе в сохранённом черновике), также
   * считается открытой — локальный список не теряется при перезагрузке.
   */
  const isUnitMissingInKtru = (item: ObjectCharacteristic) =>
    ktruUnitAbsent(item) &&
    !manualUnitCharacteristics.includes(item.id) &&
    !item.unit.trim();

  /** Единица задана вручную там, где КТРУ её не предусматривает. */
  const isManualUnitChange = (item: ObjectCharacteristic) =>
    ktruUnitAbsent(item) && Boolean(item.unit.trim());

  const openCharacteristicUnit = (id: string) => {
    setManualUnitCharacteristics((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
  };

  /** Вернуть характеристику к состоянию КТРУ и снять ручную единицу. */
  const closeCharacteristicUnit = (idx: number) => {
    const item = draft.characteristics[idx];
    if (!item) return;
    setManualUnitCharacteristics((prev) =>
      prev.filter((id) => id !== item.id),
    );
    updateCharacteristic(idx, {
      unit: "",
      unitManuallyChanged: false,
      unitChangeJustification: "",
    });
  };

  const previewText = useMemo(
    () => buildObjectDescriptionSummaryText(draft),
    [draft],
  );

  const patch = <K extends keyof ObjectDescription>(
    key: K,
    value: ObjectDescription[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSubmitError("");
  };

  /**
   * Подстановка требования с дословной цитатой: пользователь видит источник
   * и решает, нужно ли оно в описании. Повторные нажатия не дублируют текст.
   * Одна функция обслуживает требования ГОСТа и подсказки агента по НПА.
   */
  const applySuggestedRequirement = ({
    field,
    value,
  }: {
    field: string;
    value: string;
  }) => {
    setDraft((prev) => {
      switch (field) {
        case "warrantyTermMonths":
          return { ...prev, warrantyTermMonths: value };
        case "warrantyRequirements":
          return {
            ...prev,
            warrantyRequirements: appendUnique(
              prev.warrantyRequirements,
              value,
            ),
          };
        case "otherRequirements":
          return {
            ...prev,
            otherRequirements: appendUnique(prev.otherRequirements, value),
          };
        default:
          break;
      }
      if (field.startsWith("descriptionComponents.")) {
        const component = field.slice(
          "descriptionComponents.".length,
        ) as DescriptionComponent;
        if (!DESCRIPTION_COMPONENTS.includes(component)) return prev;
        return prev.descriptionComponents.includes(component)
          ? prev
          : {
              ...prev,
              descriptionComponents: [...prev.descriptionComponents, component],
            };
      }
      return prev;
    });
    setSubmitError("");
  };

  const applyGostRequirement = (requirement: GostRequirement) =>
    applySuggestedRequirement(requirement);

  /** Смена основного кода ОКПД2: обнуляет неактуальную привязку к КТРУ. */
  const applyOkpd2 = (code: string, name: string) => {
    setDraft((prev) => {
      // Позиций КТРУ по коду нет — флаг применения каталога сохранять нельзя.
      const ktruAvailable =
        !code ||
        ktruDictionaryLoading ||
        ktruDictionary.length === 0 ||
        findKtruByOkpd2(ktruDictionary, code).length > 0;
      // Вид объекта закупки подставляем системно по справочнику ОКПД2.
      const okpd2Kind = findOkpd2ByCode(okpd2Dictionary, code)?.objectKind;
      const autoProductType: ObjectDescriptionProductType | undefined =
        okpd2Kind === "goods"
          ? "PRODUCT"
          : okpd2Kind === "works"
            ? "WORK"
            : okpd2Kind === "services"
              ? "SERVICE"
              : undefined;
      const nextProductType = autoProductType ?? prev.productType;
      return {
        ...prev,
        okpd2Code: code,
        okpd2Name: name,
        title: prev.title.trim() || !name ? prev.title : name,
        productType: nextProductType,
        // Режим ПП РФ № 1875 предустанавливает ч. 1.1 ст. 33: не заставляем
        // заказчика искать запрет или ограничение по коду вручную.
        nationalRegimeRestriction:
          prev.nationalRegimeRestriction ||
          regimePresetRequired(code, nextProductType),
        useKtru: ktruAvailable ? prev.useKtru : false,
        ktruCode: ktruAvailable ? prev.ktruCode : "",
        ktruName: ktruAvailable ? prev.ktruName : "",
        characteristics: ktruAvailable
          ? prev.characteristics
          : prev.characteristics.map((c) => ({
              ...c,
              isMandatoryFromKtru: false,
            })),
      };
    });
    setSubmitError("");
  };

  /**
   * Выбор объекта закупки: редактор характеристик и общие поля переключаются
   * на данные выбранного объекта, а не на «первый попавшийся» код ООЗ.
   */
  const handleSelectPurchaseObject = (object: PurchaseObject) => {
    setActiveObjectId(object.id ?? null);
    setDraft((prev) => {
      const nextProductType = object.productType ?? prev.productType;
      const nextCode = object.okpd2Code || prev.okpd2Code;
      return {
        ...prev,
        productType: nextProductType,
        okpd2Code: nextCode,
        okpd2Name: object.okpd2Name || prev.okpd2Name,
        ktruCode: object.ktruCode ?? "",
        ktruName: object.ktruName ?? "",
        unit: object.unit ?? "",
        quantity: object.quantity || "1",
        useKtru: Boolean(object.useKtru),
        characteristics: object.characteristics ?? [],
        standards: object.standards ?? [],
        nationalRegimeRestriction:
          prev.nationalRegimeRestriction ||
          regimePresetRequired(nextCode, nextProductType),
      };
    });
    setSubmitError("");
  };

  const handleSelectKtru = (item: KtruRef | null) => {
    setUnitChangeBlocked(false);
    // При смене позиции старые «открытые» единицы не имеют отношения к новым
    // полям каталога — начинаем с чистого списка.
    setManualUnitCharacteristics([]);
    // Если в позиции несколько единиц, не подставляем первую молча:
    // пользователь должен выбрать нужную сам.
    const options =
      item?.unitOptions?.length === 0 && item?.unit?.trim()
        ? [item.unit.trim()]
        : (item?.unitOptions ?? []);
    setDraft((prev) => {
      const next: ObjectDescription = {
        ...prev,
        ktruCode: item?.ktruCode ?? "",
        ktruName: item?.name ?? "",
        // Выбор позиции КТРУ включает её применение: иначе поля каталога
        // останутся недоступны, хотя позиция уже выбрана.
        useKtru: item ? true : prev.useKtru,
        ktruRefusalReason: item ? "" : prev.ktruRefusalReason,
        // Единица фиксируется позицией КТРУ, только если она единственная.
        unit: item ? (options.length === 1 ? options[0] : "") : prev.unit,
      };
      if (item) {
        // Переносим ВСЕ поля позиции КТРУ — и обязательные, и необязательные.
        // Селект только фильтрует список позиций и не должен исключать поля.
        next.characteristics = mergeKtruCharacteristics(
          next.characteristics,
          ktruToObjectCharacteristics(item),
        );
      }
      return next;
    });
    setSubmitError("");
  };

  /** Снять КТРУ, чтобы пользователь мог свободно выбрать единицу измерения. */
  const removeKtruForUnitChange = () => {
    setDraft((prev) => ({
      ...prev,
      useKtru: false,
      ktruCode: "",
      ktruName: "",
    }));
    setUnitChangeBlocked(false);
  };

  const handleApplyKtruCharacteristics = () => {
    if (!selectedKtru) return;
    patch(
      "characteristics",
      mergeKtruCharacteristics(
        draft.characteristics,
        ktruToObjectCharacteristics(selectedKtru),
      ),
    );
  };

  /** Добавить одно поле выбранной позиции КТРУ (в т. ч. необязательное). */
  const addKtruCharacteristic = (characteristic: KtruCharacteristic) => {
    if (!selectedKtru) return;
    const mapped = ktruToObjectCharacteristics({
      ...selectedKtru,
      characteristics: [characteristic],
    });
    if (mapped.length === 0) return;
    patch(
      "characteristics",
      mergeKtruCharacteristics(draft.characteristics, mapped),
    );
  };

  /**
   * Гарантировать сохранение карточки перед добавлением объекта. В карточке,
   * открытой из СЗ, id может отсутствовать — без него объект не привязать.
   */
  const ensureDescription = async (): Promise<
    string | number | undefined
  > => {
    if (descriptionId !== undefined && descriptionId !== null && descriptionId !== "") {
      return descriptionId;
    }
    if (!onPersistDraft) return undefined;
    if (!draft.title.trim()) {
      setSubmitError("Укажите наименование объекта закупки.");
      return undefined;
    }
    if (!draft.okpd2Code.trim()) {
      setSubmitError("Выберите код ОКПД2.");
      return undefined;
    }
    try {
      const saved = await onPersistDraft({ ...draft, status: "draft" });
      if (saved?.id !== undefined && saved.id !== null && saved.id !== "") {
        setPersistedId(saved.id);
        setDraft((prev) => ({ ...prev, id: saved.id }));
        return saved.id;
      }
    } catch {
      setSubmitError(
        "Не удалось сохранить карточку ООЗ. Проверьте данные и повторите.",
      );
    }
    return undefined;
  };

  const handleApplyNormingTemplate = (code = draft.okpd2Code) => {
    const template = templatesByCode[code];
    if (!template || template.characteristics.length === 0) {
      return;
    }
    const existingNames = new Set(
      draft.characteristics.map((c) => c.name.trim().toLowerCase()),
    );
    const cloned = template.characteristics
      .filter((c) => !existingNames.has(c.name.trim().toLowerCase()))
      .map((c) => ({
        ...c,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
    if (cloned.length === 0) {
      return;
    }
    const cleanedCurrent = draft.characteristics.filter((c) => c.name.trim());
    patch("characteristics", [...cleanedCurrent, ...cloned]);
  };

  const addCharacteristic = (
    category: CharacteristicCategory = categoryFilter === "all"
      ? "consumer"
      : categoryFilter,
  ) => {
    patch("characteristics", [
      ...draft.characteristics,
      {
        ...emptyCharacteristic(category),
        isAdditionalOverKtru: draft.useKtru,
      },
    ]);
  };

  const updateCharacteristic = (
    idx: number,
    changes: Partial<ObjectCharacteristic>,
  ) => {
    const next = [...draft.characteristics];
    next[idx] = { ...next[idx], ...changes };
    patch("characteristics", next);
  };

  const removeCharacteristic = (idx: number) => {
    const next = [...draft.characteristics];
    next.splice(idx, 1);
    patch("characteristics", next);
  };

  const addStandard = () => {
    const item: ObjectStandardRef = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      standardType: "GOST",
      code: "",
      title: "",
      hasDeviation: false,
      deviationJustification: "",
    };
    patch("standards", [...draft.standards, item]);
  };

  const updateStandard = (
    idx: number,
    changes: Partial<ObjectStandardRef>,
  ) => {
    const next = [...draft.standards];
    next[idx] = { ...next[idx], ...changes };
    patch("standards", next);
  };

  const removeStandard = (idx: number) => {
    const next = [...draft.standards];
    next.splice(idx, 1);
    patch("standards", next);
  };

  // Приложения к описанию (п. 3 ч. 1 ст. 33): файл выбирается в браузере, в
  // карточке остаются имя, размер и ссылка/реквизиты приложения — так же, как
  // в остальных документах закупки.
  const addDescriptionAttachment = (component: DescriptionComponent) => {
    patch("descriptionAttachments", [
      ...draft.descriptionAttachments,
      emptyDescriptionAttachment(component),
    ]);
  };

  const updateDescriptionAttachment = (
    id: string,
    changes: Partial<ObjectDescriptionAttachment>,
  ) => {
    patch(
      "descriptionAttachments",
      draft.descriptionAttachments.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  };

  const removeDescriptionAttachment = (id: string) => {
    patch(
      "descriptionAttachments",
      draft.descriptionAttachments.filter((item) => item.id !== id),
    );
  };

  const pickDescriptionAttachmentFile = (
    id: string,
    files: FileList | null,
  ) => {
    const file = files?.[0];
    if (!file) return;
    updateDescriptionAttachment(id, {
      fileName: file.name,
      fileSize: file.size,
    });
  };

  // Снятие компонента убирает его приложения: материалы, которых нет в составе
  // описания, не должны оставаться в карточке. При включении компонента-
  // материала сразу показываем строку приложения — иначе файл некуда положить.
  // Само правило — чистая функция в схеме, чтобы его можно было проверить тестом.
  const toggleDescriptionComponent = (
    component: DescriptionComponent,
    checked: boolean,
  ) => {
    setDraft((prev) => ({
      ...prev,
      ...applyDescriptionComponentToggle(prev, component, checked),
    }));
    setSubmitError("");
  };

  const pickGoodsImageFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setDraft((prev) => ({
      ...prev,
      goodsImageFileName: file.name,
      goodsImageFileSize: file.size,
    }));
    setSubmitError("");
  };

  // Ручное решение по флагу ч. 1.1 сильнее автонастройки: код ОКПД2 при этом
  // не меняется, поэтому предустановка больше не срабатывает.
  const handleNationalRegimeToggle = (checked: boolean) => {
    patch("nationalRegimeRestriction", checked);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowPreview(true);
    }
  };

  /**
   * Сохранение — это действие, а не значение поля: черновик, передача в КС
   * и утверждение руководителем выбираются кнопками внизу карточки.
   */
  const saveWithStatus = (requestedStatus: ObjectDescriptionStatus) => {
    const status =
      requestedStatus === "approved" && !isHead ? "ready" : requestedStatus;

    // Общий код ОКПД2 с позицией ПГ — обязательное условие связки закупки.
    // Пока расхождение не устранено, любые действия с ООЗ недоступны.
    if (planCheckPending) {
      setSubmitError(
        "Дождитесь проверки ОКПД2 по позиции плана-графика.",
      );
      return;
    }
    if (planOkpd2Mismatch || planPositionMissing) {
      setSubmitError(
        "ОКПД2 ООЗ не совпадает с ОКПД2 позиции плана-графика. Верните код кнопками в блоке ОКПД2 либо внесите изменения в ПГ (добавьте общий код ОКПД2).",
      );
      return;
    }

    if (!draft.title.trim()) {
      setSubmitError("Укажите наименование объекта закупки.");
      return;
    }
    if (!draft.okpd2Code.trim()) {
      setSubmitError("Выберите код ОКПД2.");
      return;
    }
    const emptyChar = draft.characteristics.find((c) => !c.name.trim());
    if (emptyChar) {
      setSubmitError(
        "У каждой добавленной характеристики должно быть заполнено наименование показателя (или удалите пустую строку).",
      );
      return;
    }

    const emptyStd = draft.standards.find((s) => !s.code.trim());
    if (emptyStd) {
      setSubmitError(
        "Укажите обозначение каждого добавленного стандарта (ГОСТ / ТР ТС / ТУ) или удалите пустую строку.",
      );
      return;
    }

    // Блокируем перевод в статус «Готово» / «Утверждено», пока есть ошибки по 44-ФЗ / ПП 145
    if (status !== "draft" && blockingErrors.length > 0) {
      setSubmitError(
        "Устраните обязательные нарушения ст. 33 44-ФЗ / ПП РФ N 145 или сохраните документ как «Черновик».",
      );
      return;
    }

    const nextToSave: ObjectDescription = {
      ...draft,
      status,
      // Единица из КТРУ фиксируется каталогом даже если карточка открыта
      // повторно и в сохранённом документе поле было пустым.
      unit: unitValue,
      // Текст инструкции показателя фиксируем из ЕИС на момент сохранения
      characteristics: draft.characteristics.map((item) => ({
        ...item,
        instructionForParticipant: instructionText(item),
      })),
      // При неопределённом объёме в ООЗ фиксируем 1 — ЕИС требует числовое значение
      quantity: draft.isIndeterminateVolume ? "1" : draft.quantity,
      approvedByName:
        status === "approved"
          ? draft.approvedByName || defaultApproverName
          : draft.approvedByName,
      approvedDate:
        status === "approved"
          ? draft.approvedDate || new Date().toISOString().slice(0, 10)
          : draft.approvedDate,
    };

    // Характеристики редактируются у выбранного объекта, поэтому сохраняем
    // их обратно в отдельный документ, а не только в плоские поля ООЗ.
    if (activeObjectId !== null && activeObjectId !== undefined) {
      updatePurchaseObject.mutate({
        id: activeObjectId,
        productType: nextToSave.productType,
        okpd2Code: nextToSave.okpd2Code,
        okpd2Name: nextToSave.okpd2Name,
        ktruCode: nextToSave.ktruCode,
        ktruName: nextToSave.ktruName,
        unit: nextToSave.unit,
        quantity: nextToSave.quantity,
        isIndeterminateVolume: nextToSave.isIndeterminateVolume,
        useKtru: nextToSave.useKtru,
        characteristics: nextToSave.characteristics,
        standards: nextToSave.standards,
      });
    }

    onSave(nextToSave);
  };

  return (
    <form
      className={block("editor")}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={block("editor-head")}>
        <div>
          <h2 className={block("editor-title")}>
            {draft.id
              ? "Редактирование описания объекта закупки"
              : "Новое структурированное описание объекта закупки"}
          </h2>
          <p className={block("hint")}>
            Структура сформирована по ст. 33 44-ФЗ, ПП РФ № 145 (Правила КТРУ)
            и п. 7 ПП РФ № 926 (нормирование).
          </p>
          <div className={block("head-meta")}>
            {draft.ikz ? (
              <span className={block("ikz-badge")} title="ИКЗ из позиции плана-графика">
                ИКЗ: {draft.ikz}
              </span>
            ) : (
              <span className={block("ikz-badge", ["empty"])}>
                ИКЗ не сформирован в плане-графике
              </span>
            )}
            <span className={block("status-badge", [draft.status])}>
              {draft.status === "draft"
                ? "Черновик"
                : draft.status === "ready"
                  ? "Готово к согласованию"
                  : "Утверждено"}
            </span>
          </div>
        </div>
        <div className={block("editor-actions")}>
          <button
            type="button"
            className={block("secondary-btn")}
            title="Показать готовый текст ООЗ, который можно скопировать в техническое задание или извещение"
            onClick={() => setShowPreview(true)}
          >
            Текст ООЗ для ТЗ и извещения
          </button>
          <button
            type="button"
            className={block("secondary-btn")}
            onClick={onCancel}
          >
            ← К списку ООЗ
          </button>
        </div>
      </div>

      {/* Оглавление формы: пять разделов и несколько экранов прокрутки.
          Показывает состав раздела и живые показатели карточки. */}
      <nav className={block("section-nav")} aria-label="Разделы описания">
        {sectionNavItems.map((item) => (
          <a
            key={item.id}
            className={block("section-nav-link")}
            href={`#${item.id}`}
          >
            <span className={block("section-nav-index")}>{item.index}</span>
            <span className={block("section-nav-text")}>
              <span className={block("section-nav-label")}>{item.label}</span>
              <span className={block("section-nav-note", [item.level ?? "plain"])}>
                {item.note}
              </span>
            </span>
          </a>
        ))}
      </nav>

      {/* Секция 1: Идентификация объекта, ОКПД2 и КТРУ */}
      <fieldset id="ooz-section-1" className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>01</span>
          Идентификация объекта закупки (ОКПД2 / КТРУ / объём)
        </legend>
        <p className={block("section-intro")}>
          Что закупаем и по какому коду. Код ОКПД2 сверяется с позицией
          плана-графика: расхождение блокирует сохранение карточки.
        </p>

        <div className={block("grid")}>
          <div className={block("group-head")}>
            <span className={block("group-head-text")}>Предмет закупки</span>
            <span className={block("group-head-note")}>
              наименование и вид объекта — попадают в СЗ и извещение
            </span>
          </div>

          <div className={block("field", ["full"])}>
            <label className={block("label")} htmlFor="ooz-title">
              Наименование объекта закупки *
            </label>
            <textarea
              id="ooz-title"
              className={block("textarea")}
              rows={2}
              placeholder="Например: Поставка медицинской функциональной кровати"
              value={draft.title}
              onChange={(e) => patch("title", e.target.value)}
            />
          </div>

          {/* Вид предмета — источник правды для СЗ, извещения и ЕИС.
              Первые три значения совпадают с productType ЕИС 17.0, два
              «товар при …» кодируются PRODUCT + родительский объект. */}
          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-product-type">
              Вид объекта закупки *
            </label>
            <Select
              id="ooz-product-type"
              className={block("select")}
              value={draft.productType}
              onChange={(e) =>
                patch(
                  "productType",
                  e.target.value as ObjectDescriptionProductType,
                )
              }
            >
              {OBJECT_DESCRIPTION_PRODUCT_TYPES.filter(
                (type) =>
                  type !== "PRODUCT_DURING_WORK" &&
                  type !== "PRODUCT_DURING_SERVICE",
              ).map((type) => (
                <option key={type} value={type}>
                  {OBJECT_DESCRIPTION_PRODUCT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>

          <div className={block("group-head")}>
            <span className={block("group-head-text")}>
              Классификация и сверка с планом-графиком
            </span>
            <span className={block("group-head-note")}>
              ОКПД2, объекты закупки и характеристики позиции
            </span>
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")}>Код по ОКПД2 *</label>
            <Okpd2Select
              code={draft.okpd2Code}
              name={draft.okpd2Name}
              allowedCodes={planOkpd2SelectCodes}
              initialQuery={planOkpd2SelectCodes[0] ?? ""}
              multilineLabel
              onSelect={(item) => applyOkpd2(item?.code ?? "", item?.name ?? "")}
            />

            {/* Каждый объект закупки — отдельный документ со своими
                характеристиками, связями с ПГ/СЗ и родительским объектом. */}
            <PurchaseObjectsSection
              // Живые данные карточки, а не исходный снимок: после
              // автосохранения объекты должны фильтроваться по новому id.
              description={{ ...draft, id: descriptionId }}
              organizationId={organizationId}
              activeObjectId={activeObjectId}
              allowedCodes={planOkpd2SelectCodes}
              templates={Object.values(templatesByCode)}
              positionRequisites={{
                plan2020Number: purchasePlan?.planNumber
                  ? String(purchasePlan.planNumber)
                  : undefined,
                positionUniqueNumber: planPosition?.uniqueNumber
                  ? String(planPosition.uniqueNumber)
                  : undefined,
                positionSerialNumber: planPosition?.serialNumber
                  ? String(planPosition.serialNumber)
                  : undefined,
              }}
              onEnsureDescription={ensureDescription}
              onSelect={handleSelectPurchaseObject}
            />

            {(planOkpd2Mismatch || planPositionMissing) && (
              <>
                <p className={block("error-msg")}>
                  Один или несколько кодов ОКПД2 не совпадают с кодами позиции
                  плана-графика (или позиция не найдена). Верните код кнопкой
                  ниже либо добавьте общий код в ПГ. Действия с ООЗ
                  заблокированы.
                </p>
                {planOkpd2Options.length > 0 && (
                  <div className={block("plan-restore")}>
                    <span>Вернуть код из ПГ:</span>
                    {planOkpd2Options.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        className={block("inline-btn")}
                        onClick={() =>
                          applyOkpd2(option.code, option.name ?? "")
                        }
                      >
                        {option.code}
                        {option.name ? ` — ${option.name}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {planCheckPending && (
              <p className={block("field-hint")}>
                Проверяем код ОКПД2 по позиции плана-графика…
              </p>
            )}
            {matchedOkpd2?.isNormed && (
              <div className={block("norming-banner")}>
                <span>
                  Код <strong>{matchedOkpd2.code}</strong> подлежит
                  обязательному нормированию (ПП РФ N 926).
                  {matchedOkpd2.normLimit !== undefined
                    ? ` Предельная цена единицы: ${formatMoney(matchedOkpd2.normLimit)}.`
                    : ""}
                </span>
                {templateForCode && (
                  <button
                    type="button"
                    className={block("inline-btn")}
                    onClick={() => handleApplyNormingTemplate()}
                  >
                    + Подставить типовые требования ПП 926 (
                    {templateForCode.characteristics.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={block("group-head")}>
            <span className={block("group-head-text")}>Объём закупки</span>
            <span className={block("group-head-note")}>
              количество и единица измерения по ОКЕИ
            </span>
          </div>

          {/* Флаг объёма — отдельная строка: иначе его длинная подпись
              сдвигает «Количество» относительно поля «Единица измерения». */}
          <div className={block("field", ["full", "check"])}>
            <CustomCheckbox
              label="Невозможно определить объём (ч. 24 ст. 22 44-ФЗ)"
              checked={draft.isIndeterminateVolume}
              onChange={(e) => {
                const checked = e.target.checked;
                setDraft((prev) => ({
                  ...prev,
                  isIndeterminateVolume: checked,
                  // ЕИС всё равно требует число: при неопределённом объёме
                  // фиксируем 1 и блокируем редактирование поля
                  quantity: checked ? "1" : prev.quantity,
                }));
                setSubmitError("");
              }}
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-unit">
              Единица измерения (ОКЕИ)
            </label>
            <OkeiSelect
              id="ooz-unit"
              value={unitValue}
              valueMode="symbol"
              showCodeHint
              disabled={unitWaitingForKtru}
              placeholder="шт, компл, усл. ед, кг (ОКЕИ)…"
              onChange={(nextUnit) => {
                // Единица из КТРУ фиксирована каталогом: предупреждаем о
                // попытке замены и предлагаем снять позицию.
                if (unitFromKtru && nextUnit !== ktruUnit) {
                  setUnitChangeBlocked(true);
                  return;
                }
                setUnitChangeBlocked(false);
                patch("unit", nextUnit);
              }}
            />
            {unitFromKtru ? (
              <span className={block("field-hint")}>
                Единица подставлена из позиции КТРУ — снимите КТРУ, чтобы
                выбрать другую.
              </span>
            ) : unitWaitingForKtru ? (
              <span className={block("field-hint")}>
                Сначала выберите позицию КТРУ — единица подставится из каталога.
              </span>
            ) : selectedKtru && ktruUnitOptions.length > 1 ? (
              <span className={block("warning-msg")}>
                В позиции КТРУ несколько единиц ({ktruUnitOptions.join(", ")}) —
                выберите нужную вручную.
              </span>
            ) : (
              <span className={block("field-hint")}>
                Выберите единицу вручную (КТРУ не применяется).
              </span>
            )}
            {unitChangeBlocked && (
              <span className={block("warning-msg")}>
                Единица измерения определена позицией КТРУ ({ktruUnit}).
                Изменить её можно только после снятия КТРУ.{" "}
                <button
                  type="button"
                  className={block("inline-btn")}
                  onClick={removeKtruForUnitChange}
                >
                  Снять КТРУ
                </button>
              </span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-qty">
              Количество (объём)
            </label>
            <input
              id="ooz-qty"
              className={block("input")}
              type="text"
              disabled={draft.isIndeterminateVolume}
              placeholder="1"
              value={draft.isIndeterminateVolume ? "1" : draft.quantity}
              onChange={(e) => patch("quantity", e.target.value)}
            />
          </div>

          <div className={block("group-head")}>
            <span className={block("group-head-text")}>
              Каталог КТРУ (ПП РФ № 145)
            </span>
            <span className={block("group-head-note")}>
              позиция каталога заполняет объём и характеристики
            </span>
          </div>

          {!hideKtruFlag && (
            <div className={block("field", ["full", "check"])}>
              <label className={block("label")} htmlFor="ooz-ktru">
                Применение КТРУ (ПП РФ № 145)
              </label>
              <CustomCheckbox
                label="Включать позицию каталога товаров, работ, услуг"
                checked={draft.useKtru}
                onChange={(e) => patch("useKtru", e.target.checked)}
              />
              {/* Раздел 1 — только выбор подходящей позиции КТРУ.
                  Фильтры сужают список, но не скрывают выбранную позицию.
                  Сами поля ОЗ редактируются в разделе 2.2. */}
              {draft.useKtru && (
                <KtruSelect
                  className={block("ktru-select")}
                  okpd2Code={planPosition?.okpd2Code ?? draft.okpd2Code}
                  ktruCode={draft.ktruCode}
                  initialQuery={planPosition?.ktruCode ?? ""}
                  onSelect={handleSelectKtru}
                  disabled={!draft.okpd2Code}
                />
              )}
              {draft.useKtru && mandatoryNotice && (
                <span className={block("warning-msg")}>{mandatoryNotice}</span>
              )}
              {draft.useKtru && !draft.ktruRefusalReason && !draft.ktruCode && (
                <span className={block("field-hint")}>
                  Если позиция КТРУ не подходит, укажите обоснование отказа —
                  оно сохранится в ООЗ.
                </span>
              )}
              {draft.useKtru && selectedKtru && (
                <span className={block("field-hint")}>
                  Поля выбранной позиции КТРУ (обязательные и необязательные)
                  доступны в разделе 2.2 «Структурированные характеристики».
                </span>
              )}
            </div>
          )}
        </div>
      </fieldset>

      {/* Секция 2: Структурированные характеристики.
          Описание ОЗ по КТРУ перенесено сюда из раздела 1: раздел 1 только
          выбирает позицию каталога, а все её поля живут в 2.2. */}
      <fieldset id="ooz-section-2" className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>02</span>
          Структурированные характеристики (ст. 33 44-ФЗ / ПП 145 / ПП 926)
        </legend>
        <p className={block("section-intro")}>
          Показатели, по которым участник заполняет заявку. Обязательные поля
          выбранной позиции КТРУ подставляются из каталога, остальные можно
          добавить вручную.
        </p>

        {draft.useKtru && (
          <div className={block("ktru-description")}>
            <div className={block("ktru-description-head")}>
              <span className={block("label")}>
                Описание ОЗ по позиции КТРУ
              </span>
              {selectedKtru ? (
                <span className={block("field-hint")}>
                  <span className={block("code-badge")}>
                    {selectedKtru.ktruCode}
                  </span>{" "}
                  — {selectedKtru.name}. Полей каталога:{" "}
                  {selectedKtru.characteristics.length} (обязательных:{" "}
                  {
                    selectedKtru.characteristics.filter(
                      (characteristic) => characteristic.isMandatory,
                    ).length
                  }
                  , необязательных:{" "}
                  {
                    selectedKtru.characteristics.filter(
                      (characteristic) => !characteristic.isMandatory,
                    ).length
                  }
                  ). Все они доступны ниже; переключатель скрывает только
                  необязательные из списка.
                </span>
              ) : (
                <span className={block("field-hint")}>
                  Выберите позицию КТРУ в разделе 1 — все её поля, включая
                  необязательные, появятся здесь.
                </span>
              )}
            </div>

            {selectedKtru && selectedKtru.characteristics.length > 0 && (
              <>
                {/* Как в ЕИС: переключатель «Показывать только обязательные».
                    Необязательные поля скрываются только из списка — в ООЗ
                    они остаются доступны кнопкой «Подставить все поля». */}
                <CustomCheckbox
                  wrapperClassName={block("ktru-filter")}
                  compact
                  label="Показывать только обязательные характеристики"
                  checked={mandatoryOnly}
                  onChange={(event) => setMandatoryOnly(event.target.checked)}
                />
                <div className={block("ktru-field-list")}>
                  {visibleKtruCharacteristics.map((characteristic) => {
                    const added = draft.characteristics.some(
                      (item) =>
                        item.name.trim().toLowerCase() ===
                        characteristic.name.trim().toLowerCase(),
                    );
                    return (
                      <div
                        key={characteristic.id}
                        className={block("ktru-field")}
                        data-added={added ? "true" : undefined}
                      >
                        <span className={block("ktru-field-name")}>
                          {characteristic.name}
                          {!characteristic.unit?.trim() && (
                            <span
                              className={block("ktru-field-unit-empty")}
                              title="В КТРУ нет единицы измерения"
                            >
                              {" "}
                              · без единицы
                            </span>
                          )}
                        </span>
                        <span
                          className={block("ktru-field-badge", [
                            characteristic.isMandatory
                              ? "required"
                              : "optional",
                          ])}
                        >
                          {characteristic.isMandatory
                            ? "обязательное"
                            : "необязательное"}
                        </span>
                        <button
                          type="button"
                          className={block("inline-btn")}
                          disabled={added}
                          onClick={() => addKtruCharacteristic(characteristic)}
                        >
                          {added ? "Добавлено" : "+ Добавить поле"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={block("inline-btn")}
                  onClick={handleApplyKtruCharacteristics}
                >
                  + Подставить все поля КТРУ (
                  {selectedKtru.characteristics.length})
                </button>
              </>
            )}

            {selectedKtru && mandatoryNotice && (
              <span className={block("warning-msg")}>{mandatoryNotice}</span>
            )}
            {missingMandatoryKtru.length > 0 && (
              <span className={block("warning-msg")}>
                Не добавлены обязательные характеристики КТРУ:{" "}
                {missingMandatoryKtru.map((c) => c.name).join(", ")}. Нажмите
                «+ Подставить все поля КТРУ» или добавьте их вручную.
              </span>
            )}
            {selectedKtru &&
              !hasMandatoryKtru &&
              draft.characteristics.length === 0 && (
                <span className={block("warning-msg")}>
                  В выбранной позиции КТРУ нет обязательных характеристик —
                  добавьте характеристики объекта закупки вручную (ст. 33
                  44-ФЗ).
                </span>
              )}
          </div>
        )}

        {draft.characteristics.length === 0 && (
          <p className={block("characteristics-warning")}>
            <strong>Внимание:</strong> не добавлено ни одной характеристики.
            Ст. 33 44-ФЗ требует описания объекта закупки, а для позиции КТРУ
            показатели обязательны (ПП РФ № 145). Это предупреждение —
            сохранение ООЗ не блокируется.
          </p>
        )}

        <div className={block("char-toolbar")}>
          <div className={block("chips")}>
            <button
              type="button"
              className={block("chip", categoryFilter === "all" ? ["active"] : [])}
              onClick={() => setCategoryFilter("all")}
            >
              Все ({draft.characteristics.length})
            </button>
            {CHARACTERISTIC_CATEGORIES.map((cat) => {
              const count = draft.characteristics.filter(
                (c) => c.category === cat,
              ).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={block(
                    "chip",
                    categoryFilter === cat ? ["active"] : [],
                  )}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {characteristicCategoryLabels[cat]} ({count})
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={block("add-btn")}
            onClick={() => addCharacteristic()}
          >
            + Добавить характеристику
          </button>
        </div>

        {visibleCharacteristics.length === 0 ? (
          <p className={block("empty-inline")}>
            В выбранной категории пока нет характеристик.
          </p>
        ) : (
          <>
            <div className={block("char-list")}>
            {visibleCharacteristics.map(({ item, idx }) => (
              <div key={item.id} className={block("char-card")}>
                <div className={block("char-row-main")}>
                  <div className={block("field")}>
                    <label className={block("label")}>Категория</label>
                    <Select
                      className={block("select")}
                      value={item.category}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          category: e.target.value as CharacteristicCategory,
                        })
                      }
                    >
                      {CHARACTERISTIC_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {characteristicCategoryLabels[cat]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className={block("field", ["grow"])}>
                    <label className={block("label")}>
                      Наименование показателя *
                    </label>
                    <input
                      className={block("input")}
                      type="text"
                      placeholder="Например: Мощность, Диагональ, Материал корпуса"
                      value={item.name}
                      onChange={(e) =>
                        updateCharacteristic(idx, { name: e.target.value })
                      }
                    />
                  </div>

                  <div
                    className={block("field", ["unit"])}
                    title={
                      isUnitMissingInKtru(item)
                        ? "В КТРУ нет единицы измерения. Нажмите «Открыть», чтобы задать её вручную."
                        : ktruUnitAbsent(item)
                          ? "Единица задана вручную. Нажмите «Вернуть как в КТРУ», чтобы заблокировать поле."
                          : undefined
                    }
                  >
                    <label className={block("label")}>Ед. изм.</label>
                    <OkeiSelect
                      compact
                      value={item.unit}
                      valueMode="symbol"
                      placeholder="мм, кг, Вт"
                      disabled={isUnitMissingInKtru(item)}
                      onChange={(nextUnit) =>
                        updateCharacteristic(idx, {
                          unit: nextUnit,
                          ...(ktruUnitAbsent(item)
                            ? {
                                unitManuallyChanged: Boolean(nextUnit.trim()),
                                ...(nextUnit.trim()
                                  ? {}
                                  : { unitChangeJustification: "" }),
                              }
                            : {}),
                        })
                      }
                    />
                    {isUnitMissingInKtru(item) && (
                      <>
                        <span className={block("field-hint")}>
                          В КТРУ нет единицы измерения
                        </span>
                        <button
                          type="button"
                          className={block("inline-btn")}
                          onClick={() => openCharacteristicUnit(item.id)}
                        >
                          Открыть
                        </button>
                      </>
                    )}
                    {ktruUnitAbsent(item) &&
                      !isUnitMissingInKtru(item) && (
                        <>
                          <span className={block("field-hint")}>
                            {isManualUnitChange(item)
                              ? "Единица изменена вручную"
                              : "Единица задаётся вручную"}
                          </span>
                          <button
                            type="button"
                            className={block("inline-btn")}
                            onClick={() => closeCharacteristicUnit(idx)}
                          >
                            Вернуть как в КТРУ
                          </button>
                        </>
                      )}
                  </div>

                  <div className={block("field")}>
                    <label className={block("label")}>Вид значения</label>
                    <Select
                      className={block("select")}
                      value={item.valueType}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          valueType: e.target
                            .value as ObjectCharacteristic["valueType"],
                        })
                      }
                    >
                      {CHARACTERISTIC_VALUE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>
                          {characteristicValueTypeLabels[vt]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <button
                    type="button"
                    className={block("req-remove")}
                    onClick={() => removeCharacteristic(idx)}
                    title="Удалить характеристику"
                  >
                    ✕
                  </button>
                </div>

                <div className={block("char-row-values")}>
                  {item.valueType === "range" ? (
                    <>
                      <div className={block("field")}>
                        <label className={block("label")}>От (минимум)</label>
                        <input
                          className={block("input")}
                          type="text"
                          placeholder="Нижняя граница"
                          value={item.minValue}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              minValue: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className={block("field")}>
                        <label className={block("label")}>До (максимум)</label>
                        <input
                          className={block("input")}
                          type="text"
                          placeholder="Верхняя граница"
                          value={item.maxValue}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              maxValue: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  ) : item.valueType === "min" ? (
                    <div className={block("field")}>
                      <label className={block("label")}>Не менее</label>
                      <input
                        className={block("input")}
                        type="text"
                        placeholder="Минимальное значение"
                        value={item.minValue}
                        onChange={(e) =>
                          updateCharacteristic(idx, {
                            minValue: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : item.valueType === "max" ? (
                    <div className={block("field")}>
                      <label className={block("label")}>Не более</label>
                      <input
                        className={block("input")}
                        type="text"
                        placeholder="Максимальное значение"
                        value={item.maxValue}
                        onChange={(e) =>
                          updateCharacteristic(idx, {
                            maxValue: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className={block("field", ["wide"])}>
                      <label className={block("label")}>
                        {item.valueType === "enum"
                          ? "Допустимые варианты (через ;)"
                          : "Значение / формулировка требования"}
                      </label>
                      <input
                        className={block("input")}
                        type="text"
                        placeholder="Укажите значение или описание требования"
                        value={item.valueText}
                        onChange={(e) =>
                          updateCharacteristic(idx, {
                            valueText: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className={block("field", ["wide"])}>
                    <label className={block("label")}>
                      Инструкция участнику по показателю (п. 2 ч. 1 ст. 33)
                    </label>
                    {/* Текст берётся из справочника ЕИС: пользователь выбирает
                        формулировку, но не пишет её от руки. */}
                    <select
                      className={block("input")}
                      value={item.instructionSourceCode}
                      disabled={instructionOptions.length === 0}
                      onChange={(e) => {
                        const code = e.target.value;
                        updateCharacteristic(idx, {
                          instructionSourceCode: code,
                          instructionForParticipant:
                            fillingInstructions[code] ?? "",
                        });
                      }}
                    >
                      <option value="">Не выбрана</option>
                      {instructionOptions.map(([code, text]) => (
                        <option key={code} value={code} title={text}>
                          {text}
                        </option>
                      ))}
                    </select>
                    {instructionText(item) && (
                      <input
                        className={block("input")}
                        type="text"
                        readOnly
                        title={instructionText(item)}
                        value={instructionText(item)}
                      />
                    )}
                    {instructionOptions.length === 0 && (
                      <span className={block("field-hint")}>
                        Справочник ЕИС «Инструкции по заполнению характеристик
                        в заявке» не загружен. Загрузите его в разделе
                        справочников НСИ и повторите.
                      </span>
                    )}
                  </div>
                </div>

                <div className={block("char-flags")}>
                  {draft.useKtru && item.isMandatoryFromKtru && (
                    <span className={block("char-preview-badge")}>
                      Обязательная характеристика из КТРУ
                    </span>
                  )}
                  {draft.useKtru &&
                    selectedKtru &&
                    !item.isMandatoryFromKtru &&
                    !item.isAdditionalOverKtru &&
                    selectedKtru.characteristics.some(
                      (characteristic) =>
                        characteristic.name.trim().toLowerCase() ===
                        item.name.trim().toLowerCase(),
                    ) && (
                      <span className={block("char-preview-badge")}>
                        Необязательная характеристика из КТРУ
                      </span>
                    )}
                  {draft.useKtru && item.isAdditionalOverKtru && (
                    <span className={block("char-preview-badge")}>
                      Дополнительная характеристика сверх КТРУ (требует
                      обоснования по ПП 145)
                    </span>
                  )}
                  <span className={block("char-preview-badge")}>
                    Итого: {formatCharacteristicValue(item)}
                  </span>
                </div>

                {isManualUnitChange(item) && (
                  <div className={block("justification-box")}>
                    <label className={block("label")}>
                      Обоснование единицы, которой нет в КТРУ *
                    </label>
                    <textarea
                      className={block("textarea")}
                      rows={2}
                      placeholder="Почему для показателя задана единица, которой нет в позиции КТРУ…"
                      value={item.unitChangeJustification}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          unitChangeJustification: e.target.value,
                        })
                      }
                    />
                    {!item.unitChangeJustification.trim() && (
                      <span className={block("field-hint", ["warning"])}>
                        Без обоснования ООЗ не пройдёт автоконтроль и не будет
                        утверждено.
                      </span>
                    )}
                  </div>
                )}

                {draft.useKtru && item.isAdditionalOverKtru && (
                  <div className={block("justification-box")}>
                    <label className={block("label")}>
                      Обоснование необходимости дополнительной характеристики
                      сверх КТРУ (п. 6 Правил использования КТРУ, ПП 145) *
                    </label>
                    <textarea
                      className={block("textarea")}
                      rows={2}
                      placeholder="Укажите технологическую, медицинскую, санитарную или эксплуатационную необходимость…"
                      value={item.additionalJustification}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          additionalJustification: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className={block("add-btn")}
            onClick={() => addCharacteristic()}
          >
            + Добавить характеристику
          </button>
          </>
        )}
      </fieldset>

      {/* Секция 3: Товарный знак, ГОСТ, гарантии и инструкция */}
      <fieldset id="ooz-section-3" className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>03</span>
          Стандарты, товарные знаки, состав описания и гарантии (ст. 33
          44-ФЗ)
        </legend>
        <p className={block("section-intro")}>
          Что именно требуется от товара: товарный знак, документы по
          стандартизации, материалы описания, упаковка, маркировка, гарантия и
          инструкция участнику.
        </p>

        <div className={block("group-head", ["section"])}>
          <span className={block("group-head-text")}>
            Товарный знак и эквивалентность
          </span>
          <span className={block("group-head-note")}>п. 1 ч. 1 ст. 33</span>
        </div>

        <div className={block("grid")}>
          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-trademark-rule">
              Указание товарного знака (п. 1 ч. 1 ст. 33)
            </label>
            <Select
              id="ooz-trademark-rule"
              className={block("select")}
              value={draft.trademarkRule}
              onChange={(e) =>
                patch(
                  "trademarkRule",
                  e.target.value as ObjectDescription["trademarkRule"],
                )
              }
            >
              {TRADEMARK_RULES.map((rule) => (
                <option key={rule} value={rule}>
                  {trademarkRuleLabels[rule]}
                </option>
              ))}
            </Select>
          </div>

          {draft.trademarkRule !== "none" && (
            <>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="ooz-trademark-name">
                  Наименование товарного знака *
                </label>
                <input
                  id="ooz-trademark-name"
                  className={block("input")}
                  type="text"
                  value={draft.trademarkName}
                  onChange={(e) => patch("trademarkName", e.target.value)}
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="ooz-trademark-just">
                  Параметры эквивалентности / обоснование *
                </label>
                <input
                  id="ooz-trademark-just"
                  className={block("input")}
                  type="text"
                  placeholder="Критерии эквивалентности или обоснование совместимости"
                  value={draft.trademarkJustification}
                  onChange={(e) =>
                    patch("trademarkJustification", e.target.value)
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className={block("standards-block")}>
          <div className={block("group-head", ["section"])}>
            <span className={block("group-head-text")}>
              Документы по стандартизации (п. 2 ч. 1 ст. 33)
            </span>
            <span className={block("group-head-note")}>
              ГОСТ, ГОСТ Р и технические регламенты
            </span>
          </div>
          <div className={block("standards-head")}>
            <span className={block("label")}>
              Перечень документов, соответствие которым требуется
            </span>
            <button
              type="button"
              className={block("add-btn")}
              onClick={addStandard}
            >
              + Добавить ГОСТ / регламент
            </button>
          </div>
          <span className={block("field-hint")}>
            Год определяется из обозначения ГОСТ. Документы до{" "}
            {MODERN_GOST_MIN_YEAR} г. помечаются предупреждением — проверьте
            действующую редакцию в ЕИС. Подсказки — по локальному снимку новых
            ГОСТов
            {gostCatalog
              ? ` ${gostCatalog.version} от ${gostCatalog.generatedAt.slice(0, 10)}`
              : ""}
            .
          </span>

          {draft.standards.map((std, idx) => {
            const gostYear =
              std.standardType === "GOST"
                ? gostPublicationYear(std.code)
                : null;
            const gostHint =
              std.standardType === "GOST"
                ? findGostInCatalog(gostCatalog, std.code)
                : null;
            const requirementSuggestions =
              std.standardType === "GOST"
                ? findGostRequirements(gostRequirements, std.code)
                : [];
            return (
              <div key={std.id} className={block("standard-row")}>
                <Select
                  className={block("select")}
                  value={std.standardType}
                  onChange={(e) =>
                    updateStandard(idx, {
                      standardType: e.target
                        .value as ObjectStandardRef["standardType"],
                    })
                  }
                >
                  {STANDARD_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {standardTypeLabels[st]}
                    </option>
                  ))}
                </Select>
                <input
                  className={block("input")}
                  type="text"
                  placeholder="Номер (например, ГОСТ Р 50444-2020)"
                  value={std.code}
                  onChange={(e) => updateStandard(idx, { code: e.target.value })}
                />
                <input
                  className={block("input")}
                  type="text"
                  placeholder="Наименование стандарта"
                  value={std.title}
                  onChange={(e) => updateStandard(idx, { title: e.target.value })}
                />
                {gostHint && (
                  <div
                    className={block("gost-hint", ["full"])}
                    title={gostHint.sourceUrl || undefined}
                  >
                    <div className={block("gost-hint-head")}>
                      <span className={block("gost-hint-title")}>
                        {gostHint.designation} — {gostHint.title}
                      </span>
                      {std.title.trim() !== gostHint.title && (
                        <div className={block("gost-hint-action")}>
                          <CustomButton
                            configuration={{
                              button: {
                                name: `gost-title-${idx}`,
                                value: "Подставить название",
                                type: "button",
                              },
                            }}
                            ariaLabel={`Подставить название ${gostHint.designation}`}
                            onClick={() =>
                              updateStandard(idx, { title: gostHint.title })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <span className={block("gost-hint-meta")}>
                      {gostHintSummary(gostHint)}
                    </span>
                    {requirementSuggestions.length > 0 && (
                      <div className={block("gost-hint-suggestions")}>
                        {requirementSuggestions.map((requirement, reqIdx) => (
                          <div
                            key={`${requirement.field}-${reqIdx}`}
                            className={block("gost-hint-suggestion")}
                          >
                            <div className={block("gost-hint-action")}>
                              <CustomButton
                                configuration={{
                                  button: {
                                    name: `gost-req-${idx}-${reqIdx}`,
                                    value: `Подставить: ${requirement.label}`,
                                    type: "button",
                                  },
                                }}
                                ariaLabel={`Подставить ${requirement.label} из ${gostHint.designation}`}
                                onClick={() =>
                                  applyGostRequirement(requirement)
                                }
                              />
                            </div>
                            <span
                              className={block("gost-hint-quote")}
                              title={requirement.quote}
                            >
                              {requirement.quote}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className={block("standard-flag")}>
                  <CustomCheckbox
                    compact
                    label="Отклонение от показателей стандарта"
                    checked={std.hasDeviation}
                    onChange={(e) =>
                      updateStandard(idx, { hasDeviation: e.target.checked })
                    }
                  />
                </div>
                <button
                  type="button"
                  className={block("req-remove", ["standard-remove"])}
                  onClick={() => removeStandard(idx)}
                  title="Удалить стандарт"
                >
                  ✕
                </button>
                {std.hasDeviation && (
                  <div className={block("justification-box", ["full"])}>
                    <input
                      className={block("input")}
                      type="text"
                      placeholder="Обоснование необходимости использования нестандартных показателей (п. 2 ч. 1 ст. 33) *"
                      value={std.deviationJustification}
                      onChange={(e) =>
                        updateStandard(idx, {
                          deviationJustification: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                {gostYear !== null && gostYear < MODERN_GOST_MIN_YEAR && (
                  <span className={block("warning-msg", ["standard"])}>
                    ГОСТ принят в {gostYear} году — ОЗ не гостировалось после{" "}
                    {MODERN_GOST_MIN_YEAR} г. Проверьте, есть ли действующая
                    редакция не ранее {MODERN_GOST_MIN_YEAR} года.
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Агент ООЗ по ГОСТ и НПА: только локальные снимки и дословные цитаты. */}
        {oozAgent && (
          <div className={block("standards-block")}>
            <div className={block("standards-head")}>
              <span className={block("label")}>
                Агент ООЗ: ГОСТ и НПА по коду ОКПД2
              </span>
              <span className={block("gost-hint-meta")}>
                {oozAgent.version}
              </span>
            </div>
            <span className={block("field-hint")}>
              Документы подобраны из отбора по плану-графику; каждая подсказка
              показывает цитату из снимка. Там, где полного текста нет, поле не
              заполняется.
            </span>
            {agentDocuments.length === 0 ? (
              <span className={block("field-hint")}>
                Для этого кода ОКПД2 документы в снимке агента не найдены.
              </span>
            ) : (
              agentDocuments.map((agentDoc, agentDocIdx) => (
                <div
                  key={`agent-doc-${agentDoc.kind}-${agentDoc.code}`}
                  className={block("gost-hint")}
                  title={agentDoc.sourceUrl || undefined}
                >
                  <div className={block("gost-hint-head")}>
                    <span className={block("gost-hint-title")}>
                      {agentDoc.kind === "NPA"
                        ? standardTypeLabels[agentDoc.standardType]
                        : agentDoc.code}
                      {" — "}
                      {agentDoc.name}
                    </span>
                  </div>
                  <span className={block("gost-hint-meta")}>
                    {AGENT_STATUS_LABELS[agentDoc.status] ?? agentDoc.status}
                  </span>
                  {agentDoc.fullTextUrl && (
                    <div className={block("gost-hint-action")}>
                      <CustomButton
                        configuration={{
                          button: {
                            name: `agent-full-text-${agentDocIdx}`,
                            value: "Открыть полный текст",
                            type: "button",
                          },
                        }}
                        ariaLabel={`Открыть полный текст: ${agentDoc.name}`}
                        onClick={() => setFullTextDoc(agentDoc)}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
            {agentSuggestions.length > 0 && (
              <div className={block("gost-hint-suggestions")}>
                {agentSuggestions.map((suggestion, suggestionIdx) => (
                  <div
                    key={`agent-suggestion-${suggestion.source}-${suggestion.field}-${suggestionIdx}`}
                    className={block("gost-hint-suggestion")}
                  >
                    <div className={block("gost-hint-action")}>
                      <CustomButton
                        configuration={{
                          button: {
                            name: `ooz-agent-${suggestionIdx}`,
                            value: `Подставить: ${suggestion.label}`,
                            type: "button",
                          },
                        }}
                        ariaLabel={`Подставить ${suggestion.label} из ${suggestion.source}`}
                        onClick={() => applySuggestedRequirement(suggestion)}
                      />
                    </div>
                    <span
                      className={block("gost-hint-quote")}
                      title={`${suggestion.source}: ${suggestion.quote}`}
                    >
                      {suggestion.source}: {suggestion.quote}
                      {" · "}
                      {SUGGESTION_STATUS_LABELS[suggestion.status] ??
                        suggestion.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* П. 3 ч. 1 ст. 33: состав описания и материалы к нему. Упаковка и
            маркировка уже описаны в этом блоке, поэтому состав описания живёт
            здесь же, а не отдельной секцией. */}
        <div className={block("standards-block", ["composition"])}>
          <div className={block("group-head", ["section"])}>
            <span className={block("group-head-text")}>
              Состав описания (п. 3 ч. 1 ст. 33)
            </span>
            <span className={block("group-head-note")}>
              отмечено {draft.descriptionComponents.length} из{" "}
              {DESCRIPTION_COMPONENTS.length} · материалов:{" "}
              {filledAttachmentCount}
            </span>
          </div>
          <span className={block("field-hint")}>
            Отмечайте только те материалы, которые включены в описание.
            Спецификации, планы, чертежи, эскизы, фотографии, результаты
            испытаний и подтверждение соответствия существуют только как
            приложение — для них нужен файл или реквизиты приложения.
          </span>

          {/* Отметки — компактной сеткой: 13 материалов не должны занимать
              два экрана прокрутки отдельными карточками. */}
          <div className={block("composition-grid")}>
            {DESCRIPTION_COMPONENTS.map((component) => {
              const checked = draft.descriptionComponents.includes(component);
              const needsDocument =
                DESCRIPTION_COMPONENT_DOCUMENTS.includes(component);
              const filledCount = draft.descriptionAttachments.filter(
                (item) =>
                  item.component === component &&
                  Boolean(item.fileName.trim() || item.url.trim()),
              ).length;

              return (
                <div
                  key={component}
                  className={block("composition-chip")}
                  data-checked={checked ? "true" : undefined}
                >
                  <CustomCheckbox
                    compact
                    label={descriptionComponentLabels[component]}
                    checked={checked}
                    onChange={(e) =>
                      toggleDescriptionComponent(component, e.target.checked)
                    }
                  />
                  {needsDocument && (
                    <span
                      className={block("composition-chip-meta")}
                      data-missing={
                        checked && filledCount === 0 ? "true" : undefined
                      }
                    >
                      {filledCount > 0
                        ? `файлов: ${filledCount}`
                        : checked
                          ? "файл не приложен"
                          : "нужен файл"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Приложения — только для отмеченных материалов-документов:
              пустые группы не занимают место в форме. */}
          {DESCRIPTION_COMPONENTS.filter(
            (component) =>
              draft.descriptionComponents.includes(component) &&
              DESCRIPTION_COMPONENT_DOCUMENTS.includes(component),
          ).map((component) => {
            const attachments = draft.descriptionAttachments.filter(
              (item) => item.component === component,
            );

            return (
              <div key={component} className={block("attachment-group")}>
                <div className={block("attachment-group-head")}>
                  <span className={block("attachment-group-title")}>
                    {descriptionComponentLabels[component]}
                  </span>
                  <button
                    type="button"
                    className={block("inline-btn")}
                    onClick={() => addDescriptionAttachment(component)}
                  >
                    + Добавить файл
                  </button>
                </div>
                {attachments.length === 0 && (
                  <span className={block("field-hint")}>
                    Файл не приложен — материал не будет считаться переданным
                    в описании.
                  </span>
                )}
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={block("attachment-row")}
                  >
                    <div className={block("file-field")}>
                      <label
                        className={block("label")}
                        htmlFor={`ooz-att-file-${attachment.id}`}
                      >
                        Файл
                      </label>
                      <input
                        id={`ooz-att-file-${attachment.id}`}
                        className={block("file-input")}
                        type="file"
                        onChange={(e) =>
                          pickDescriptionAttachmentFile(
                            attachment.id,
                            e.target.files,
                          )
                        }
                      />
                      {attachment.fileName && (
                        <span className={block("attachment-meta")}>
                          {attachment.fileName}
                          {attachment.fileSize
                            ? ` · ${formatFileSize(attachment.fileSize)}`
                            : ""}
                        </span>
                      )}
                    </div>
                    <div className={block("file-field")}>
                      <label
                        className={block("label")}
                        htmlFor={`ooz-att-url-${attachment.id}`}
                      >
                        Ссылка или реквизиты приложения
                      </label>
                      <input
                        id={`ooz-att-url-${attachment.id}`}
                        className={block("input")}
                        type="text"
                        placeholder="Например: приложение № 1 к ООЗ"
                        value={attachment.url}
                        onChange={(e) =>
                          updateDescriptionAttachment(attachment.id, {
                            url: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className={block("req-remove")}
                      onClick={() => removeDescriptionAttachment(attachment.id)}
                      title="Удалить приложение"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          <span className={block("field-hint")}>
            Файл обрабатывается в браузере и не загружается в систему:
            сохраняются имя, размер и реквизиты приложения. Сам файл
            прикладывается к извещению в ЕИС.
          </span>
        </div>

        <div className={block("group-head", ["section"])}>
          <span className={block("group-head-text")}>
            Требования к поставке, упаковке и гарантии
          </span>
          <span className={block("group-head-note")}>
            ч. 4 и п. 3 ч. 1 ст. 33 · упаковка и маркировка — часть описания
          </span>
        </div>

        <div className={block("grid")}>
          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-warranty-months">
              Гарантийный срок, месяцев (ч. 4 ст. 33)
            </label>
            <input
              id="ooz-warranty-months"
              className={block("input")}
              type="text"
              placeholder="Например: 24"
              value={draft.warrantyTermMonths}
              onChange={(e) => patch("warrantyTermMonths", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-warranty-req">
              Требования к объёму гарантии, монтажу и обучению (ч. 4 ст. 33)
            </label>
            <textarea
              id="ooz-warranty-req"
              className={block("textarea")}
              rows={2}
              placeholder="Порядок гарантийного обслуживания, расходы на доставку, монтаж, наладку, обучение персонала..."
              value={draft.warrantyRequirements}
              onChange={(e) => patch("warrantyRequirements", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-instruction">
              Инструкция по объекту закупки для участника (п. 2 ч. 1 ст. 33)
            </label>
            <p className={block("field-hint")}>
              Инструкция по отдельному показателю заполняется из справочника
              ЕИС и редактируется в карточке показателя.
            </p>
            <textarea
              id="ooz-instruction"
              className={block("textarea", ["instruction"])}
              rows={3}
              placeholder="Дополнительные пояснения к объекту закупки, если они нужны…"
              value={draft.participantInstruction}
              onChange={(e) => patch("participantInstruction", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-other">
              Требования к упаковке, маркировке и сопутствующие документы
              (ст. 481 ГК РФ, п. 3 ч. 1 ст. 33)
            </label>
            <p className={block("field-hint")}>
              Отметки «Упаковка», «Маркировка», «Этикетки» в составе описания
              включают эти материалы в документацию; сами требования
              формулируются здесь — с указанием стандарта или иного документа.
            </p>
            <textarea
              id="ooz-other"
              className={block("textarea")}
              rows={2}
              placeholder="Например: упаковка по ГОСТ Р 53645-2009, маркировка в соответствии с требованиями к медицинским изделиям..."
              value={draft.otherRequirements}
              onChange={(e) => patch("otherRequirements", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label
              className={block("label")}
              htmlFor="ooz-non-standard-justification"
            >
              Обоснование показателей, не основанных на техрегламентах и
              стандартах (п. 2 ч. 1 ст. 33)
            </label>
            <p className={block("field-hint")}>
              Заполняется, если в описании используются показатели, для которых
              нет технических регламентов и документов по стандартизации.
            </p>
            <textarea
              id="ooz-non-standard-justification"
              className={block("textarea")}
              rows={2}
              placeholder="Например: технические регламенты и документы по стандартизации для данного показателя отсутствуют"
              value={draft.nonStandardIndicatorsJustification}
              onChange={(e) =>
                patch("nonStandardIndicatorsJustification", e.target.value)
              }
            />
          </div>

          <div className={block("field", ["full", "check"])}>
            {showNewGoodsRequirement && (
              <CustomCheckbox
                label="Поставляемый товар должен быть новым (не бывшим в употреблении, п. 7 ч. 1 ст. 33)"
                checked={draft.isNewGoodsRequired}
                onChange={(e) =>
                  patch("isNewGoodsRequired", e.target.checked)
                }
              />
            )}
            <CustomCheckbox
              label="Подтверждаю, что в ООЗ не включены требования, влекущие ограничение количества участников закупки (п. 1 ч. 1 ст. 33 44-ФЗ)"
              checked={draft.noRestrictionDeclaration}
              onChange={(e) =>
                patch("noRestrictionDeclaration", e.target.checked)
              }
            />
          </div>
        </div>
      </fieldset>

      {/* Секция 4: Специальные правила п. 4–8 ч. 1 и ч. 1.1 ст. 33.
          Состав описания (п. 3) живёт в секции 03 рядом с упаковкой и
          маркировкой. Товарные правила показываем только для товара, п. 8 —
          только для работ: редактор не должен предлагать неприменимые
          требования. */}
      <fieldset id="ooz-section-4" className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>04</span>
          Специальные правила описания (п. 4–8 ч. 1, ч. 1.1 ст. 33)
        </legend>
        <p className={block("section-intro")}>
          Правила включаются только для своего вида объекта: товарные — для
          товара, строительные — для работ. Для работ и услуг товарные правила
          в форме не показываются.
        </p>

        {/* П. 4 ч. 1 ст. 33: изображение товара обязательно, если описание
            ссылается на соответствие товара изображению. */}
        {showNewGoodsRequirement && (
          <div className={block("grid")}>
            <div className={block("group-head")}>
              <span className={block("group-head-text")}>
                Изображение товара (п. 4 ч. 1 ст. 33)
              </span>
              <span className={block("group-head-note")}>
                обязательно, если описание ссылается на изображение
              </span>
            </div>
            <div className={block("field", ["full", "check"])}>
              <CustomCheckbox
                label="В описании есть требование о соответствии товара изображению (п. 4 ч. 1 ст. 33)"
                checked={draft.goodsImageRequired}
                onChange={(e) =>
                  patch("goodsImageRequired", e.target.checked)
                }
              />
            </div>
            {draft.goodsImageRequired && (
              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="ooz-goods-image">
                  Изображение товара: файл, ссылка или реквизиты *
                </label>
                <div className={block("attachment-row")}>
                  <div className={block("file-field")}>
                    <input
                      id="ooz-goods-image"
                      className={block("file-input")}
                      type="file"
                      accept="image/*"
                      onChange={(e) => pickGoodsImageFile(e.target.files)}
                    />
                    {draft.goodsImageFileName && (
                      <span className={block("attachment-meta")}>
                        {draft.goodsImageFileName}
                        {draft.goodsImageFileSize
                          ? ` · ${formatFileSize(draft.goodsImageFileSize)}`
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className={block("file-field")}>
                    <input
                      className={block("input")}
                      type="text"
                      placeholder="Ссылка или реквизиты: приложение № 1 к ООЗ, файл photo-01.jpg"
                      value={draft.goodsImageReference}
                      onChange={(e) =>
                        patch("goodsImageReference", e.target.value)
                      }
                    />
                    <input
                      className={block("input")}
                      type="text"
                      placeholder="Ссылка на файл (http://…), если изображение размещено в сети"
                      value={draft.goodsImageUrl}
                      onChange={(e) => patch("goodsImageUrl", e.target.value)}
                    />
                  </div>
                </div>
                <span className={block("field-hint")}>
                  Изображение должно позволять идентифицировать товар и
                  подготовить заявку. Файл выбирается в браузере: в карточке
                  сохраняются имя, размер и реквизиты, сам файл прикладывается
                  к извещению.
                </span>
              </div>
            )}
          </div>
        )}

        {/* П. 5 ч. 1 ст. 33: право заказчика установить требование об
            осмотре образца или макета товара. */}
        {showNewGoodsRequirement && (
          <div className={block("grid")}>
            <div className={block("group-head")}>
              <span className={block("group-head-text")}>
                Осмотр образца или макета (п. 5 ч. 1 ст. 33)
              </span>
              <span className={block("group-head-note")}>
                порядок, место и сроки осмотра
              </span>
            </div>
            <div className={block("field", ["full", "check"])}>
              <CustomCheckbox
                label="Установлено требование об осмотре образца или макета товара (п. 5 ч. 1 ст. 33)"
                checked={draft.sampleInspectionRequired}
                onChange={(e) =>
                  patch("sampleInspectionRequired", e.target.checked)
                }
              />
              <span className={block("field-hint")}>
                Порядок, место и сроки осмотра указываются в описании объекта
                закупки или в извещении.
              </span>
            </div>
            {draft.sampleInspectionRequired && (
              <>
                <div className={block("field", ["wide"])}>
                  <label className={block("label")} htmlFor="ooz-sample-place">
                    Место осмотра образца или макета *
                  </label>
                  <input
                    id="ooz-sample-place"
                    className={block("input")}
                    type="text"
                    placeholder="Например: г. Москва, ул. Примерная, д. 1, каб. 5"
                    value={draft.sampleInspectionPlace}
                    onChange={(e) =>
                      patch("sampleInspectionPlace", e.target.value)
                    }
                  />
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="ooz-sample-start">
                    Осмотр с
                  </label>
                  <input
                    id="ooz-sample-start"
                    className={block("input")}
                    type="date"
                    value={draft.sampleInspectionStartDate}
                    onChange={(e) =>
                      patch("sampleInspectionStartDate", e.target.value)
                    }
                  />
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="ooz-sample-end">
                    Осмотр по
                  </label>
                  <input
                    id="ooz-sample-end"
                    className={block("input")}
                    type="date"
                    value={draft.sampleInspectionEndDate}
                    onChange={(e) =>
                      patch("sampleInspectionEndDate", e.target.value)
                    }
                  />
                </div>
                <div className={block("field", ["wide"])}>
                  <label
                    className={block("label")}
                    htmlFor="ooz-sample-procedure"
                  >
                    Порядок осмотра
                  </label>
                  <textarea
                    id="ooz-sample-procedure"
                    className={block("textarea")}
                    rows={3}
                    placeholder="Например: осмотр по предварительной записи, образец предоставляет участник закупки"
                    value={draft.sampleInspectionProcedure}
                    onChange={(e) =>
                      patch("sampleInspectionProcedure", e.target.value)
                    }
                  />
                </div>
                <div className={block("field", ["wide"])}>
                  <label
                    className={block("label")}
                    htmlFor="ooz-sample-schedule"
                  >
                    График осмотра
                  </label>
                  <textarea
                    id="ooz-sample-schedule"
                    className={block("textarea")}
                    rows={2}
                    placeholder="Например: пн–пт с 10:00 до 16:00, перерыв 13:00–14:00"
                    value={draft.sampleInspectionSchedule}
                    onChange={(e) =>
                      patch("sampleInspectionSchedule", e.target.value)
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* П. 6 ч. 1 ст. 33: для лекарственных средств указываются МНН, а при
            наличии — торговое наименование с обоснованием. */}
        {showNewGoodsRequirement && (
          <div className={block("grid")}>
            <div className={block("group-head")}>
              <span className={block("group-head-text")}>
                Лекарственные средства (п. 6 ч. 1 ст. 33)
              </span>
              <span className={block("group-head-note")}>
                МНН и основание указания торгового наименования
              </span>
            </div>
            <div className={block("field", ["full", "check"])}>
              <CustomCheckbox
                label="Объект закупки — лекарственное средство (п. 6 ч. 1 ст. 33)"
                checked={draft.isMedicinalProduct}
                onChange={(e) => patch("isMedicinalProduct", e.target.checked)}
              />
              <span className={block("field-hint")}>
                Для лекарственных средств указывается международное
                непатентованное наименование, а при наличии — торговое
                наименование с обоснованием.
              </span>
            </div>
            {draft.isMedicinalProduct && (
              <>
                <div className={block("field", ["wide"])}>
                  <label className={block("label")} htmlFor="ooz-inn">
                    Международное непатентованное наименование (МНН) *
                  </label>
                  <textarea
                    id="ooz-inn"
                    className={block("textarea")}
                    rows={2}
                    placeholder="Например: парацетамол; при нескольких МНН — перечислите через точку с запятой"
                    value={draft.innIndication}
                    onChange={(e) => patch("innIndication", e.target.value)}
                  />
                </div>
                <div className={block("field", ["wide"])}>
                  <label
                    className={block("label")}
                    htmlFor="ooz-trade-name-basis"
                  >
                    Основание указания торгового наименования
                  </label>
                  <input
                    id="ooz-trade-name-basis"
                    className={block("input")}
                    type="text"
                    placeholder="Например: зарегистрированы препараты только с одним торговым наименованием"
                    value={draft.tradeNameUseBasis}
                    onChange={(e) => patch("tradeNameUseBasis", e.target.value)}
                  />
                  <span className={block("field-hint")}>
                    Торговое наименование допустимо только при наличии
                    основания, предусмотренного п. 6 ч. 1 ст. 33.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* П. 8 ч. 1 ст. 33: при выполнении работ по строительству описание
            формируется по проектной или сметной документации. */}
        {draft.productType === "WORK" && (
          <div className={block("grid")}>
            <div className={block("group-head")}>
              <span className={block("group-head-text")}>
                Работы по строительству (п. 8 ч. 1 ст. 33)
              </span>
              <span className={block("group-head-note")}>
                проектная или сметная документация
              </span>
            </div>
            <div className={block("field", ["full", "check"])}>
              <CustomCheckbox
                label="Работы по строительству, реконструкции, капитальному ремонту, сносу объекта капитального строительства (п. 8 ч. 1 ст. 33)"
                checked={draft.capitalConstructionWork}
                onChange={(e) =>
                  patch("capitalConstructionWork", e.target.checked)
                }
              />
              <span className={block("field-hint")}>
                Описание формируется по проектной документации, а в случаях,
                предусмотренных ч. 8.1 ст. 33, — по сметной документации.
              </span>
            </div>
            {draft.capitalConstructionWork && (
              <>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="ooz-cc-doc-type">
                    Документация, определяющая описание *
                  </label>
                  <Select
                    id="ooz-cc-doc-type"
                    className={block("select")}
                    value={draft.constructionDocType}
                    onChange={(e) =>
                      patch(
                        "constructionDocType",
                        e.target
                          .value as ObjectDescription["constructionDocType"],
                      )
                    }
                  >
                    {CONSTRUCTION_DOC_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {constructionDocTypeLabels[type]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className={block("field", ["wide"])}>
                  <label className={block("label")} htmlFor="ooz-cc-details">
                    Реквизиты документации
                  </label>
                  <input
                    id="ooz-cc-details"
                    className={block("input")}
                    type="text"
                    placeholder="Например: проектная документация № 12-ПД, утв. 01.02.2026"
                    value={draft.constructionDocDetails}
                    onChange={(e) =>
                      patch("constructionDocDetails", e.target.value)
                    }
                  />
                  <span className={block("field-hint")}>
                    Укажите номер и дату утверждения документации, чтобы
                    описание было проверяемым.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Ч. 1.1 ст. 33: описание товара российского происхождения содержит
            его характеристики и может предусматривать исключения,
            установленные Правительством РФ. */}
        {showNewGoodsRequirement && (
          <div className={block("grid")}>
            <div className={block("group-head")}>
              <span className={block("group-head-text")}>
                Национальный режим (ч. 1.1 ст. 33)
              </span>
              <span className={block("group-head-note")}>
                ПП РФ № 1875 · код ОКПД2 подсказывает режим
              </span>
            </div>
            <div className={block("field", ["full", "check"])}>
              <CustomCheckbox
                label="Закупка товара российского происхождения (ч. 1.1 ст. 33)"
                checked={draft.nationalRegimeRestriction}
                onChange={(e) =>
                  handleNationalRegimeToggle(e.target.checked)
                }
              />
              <span className={block("field-hint")}>
                Описание товара российского происхождения должно содержать
                характеристики такого товара; исключения, установленные
                Правительством РФ, указываются отдельно.
              </span>
              {draft.okpd2Code ? (
                <div className={block("regime-hint")}>
                  <span className={block("regime-hint-title")}>
                    {expectedNationalRegime
                      ? `ПП РФ № 1875: ${nationalRegimeLabel}`
                      : "ПП РФ № 1875: код вне перечней запрета и ограничения"}
                  </span>
                  <span className={block("regime-hint-text")}>
                    {nationalRegimeRecommendation.reason}
                    {nationalRegimeCheck.note
                      ? ` ${nationalRegimeCheck.note}`
                      : ""}
                  </span>
                  {expectedNationalRegime &&
                    !draft.nationalRegimeRestriction && (
                      <span className={block("warning-msg")}>
                        Режим по коду ОКПД2 действует, но раздел отключён
                        вручную: характеристики российского товара обязательны
                        (ч. 1.1 ст. 33). Верните флаг либо обоснуйте
                        неприменение в описании.
                      </span>
                    )}
                </div>
              ) : (
                <span className={block("field-hint")}>
                  Укажите код ОКПД2 — агент по ПП РФ № 1875 определит режим и
                  включит раздел автоматически.
                </span>
              )}
            </div>
            {draft.nationalRegimeRestriction && (
              <>
                <div className={block("field", ["wide"])}>
                  <label className={block("label")} htmlFor="ooz-ru-goods">
                    Характеристики товара российского происхождения *
                  </label>
                  <textarea
                    id="ooz-ru-goods"
                    className={block("textarea")}
                    rows={3}
                    placeholder="Например: изделие произведено в Российской Федерации, соответствует требованиям ПП РФ от 23.12.2024 № 1875"
                    value={draft.russianGoodsCharacteristics}
                    onChange={(e) =>
                      patch("russianGoodsCharacteristics", e.target.value)
                    }
                  />
                </div>
                <div className={block("field", ["wide"])}>
                  <label
                    className={block("label")}
                    htmlFor="ooz-national-exception"
                  >
                    Исключение, установленное Правительством РФ
                  </label>
                  <input
                    id="ooz-national-exception"
                    className={block("input")}
                    type="text"
                    placeholder="Например: подпункт «б» пункта 3 перечня, утв. ПП РФ № 1875"
                    value={draft.nationalRegimeException}
                    onChange={(e) =>
                      patch("nationalRegimeException", e.target.value)
                    }
                  />
                  <span className={block("field-hint")}>
                    Заполняется, только если закупка попадает под исключение из
                    ограничений, установленных Правительством РФ.
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </fieldset>

      <fieldset id="ooz-section-5" className={block("fieldset", ["check"])}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>05</span>
          Контроль описания
        </legend>
        <p className={block("section-intro")}>
          Проверки идут по мере заполнения: ошибки блокируют согласование,
          предупреждения нужно осознанно принять до сохранения.
        </p>

        <div className={block("compliance-panel")}>
          <div className={block("group-head", ["section"])}>
            <span className={block("group-head-text")}>
              Соответствие ст. 33 44-ФЗ и ПП РФ № 145
            </span>
            <span className={block("group-head-note")}>
              {complianceIssues.length === 0
                ? "замечаний нет"
                : `${errorCount} ошиб. · ${warningCount} предупр.`}
            </span>
          </div>
          {complianceIssues.length === 0 ? (
            <p className={block("compliance-ok")}>
              Нарушений и замечаний не выявлено — описание готово к включению в СЗ
              и извещение.
            </p>
          ) : (
            <ul className={block("compliance-list")}>
              {complianceIssues.map((issue) => (
                <li
                  key={issue.code}
                  className={block("compliance-item", [issue.level])}
                >
                  <strong>
                    {issue.level === "error" ? "Ошибка:" : "Предупреждение:"}
                  </strong>{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Живая проверка по Приказу Минфина № 158н */}
        <Order158nValidatorPanel
          compact
          descriptions={[draft]}
          selectedId={draft.id ?? "draft"}
          contractService={contractService}
          educations={educations}
          okpd2Dictionary={okpd2Dictionary}
        />
      </fieldset>

      {/* Полный текст документа агента — зафиксированный снимок из public/. */}
      {fullTextDoc && (
        <AgentFullTextModal
          document={fullTextDoc}
          onClose={() => setFullTextDoc(null)}
        />
      )}

      {/* Текст для ТЗ/извещения открывается отдельным окном: кнопка в шапке
          сама по себе не объясняла, зачем нужна «Макет ТЗ». */}
      {showPreview && (
        <CustomModal onClose={() => setShowPreview(false)}>
          <div className={block("preview-modal")}>
            <div className={block("preview-head")}>
              <h3>Текст ООЗ для технического задания и извещения</h3>
              <button
                type="button"
                className={block("secondary-btn")}
                onClick={() => setShowPreview(false)}
              >
                Закрыть
              </button>
            </div>
            <p className={block("preview-note")}>
              Ниже собран текст из заполненных полей карточки (наименование,
              коды ОКПД2, КТРУ, характеристики, стандарты и требования).
              Скопируйте его в техническое задание или вставьте в извещение —
              при изменении карточки текст обновится.
            </p>
            <pre className={block("preview-pre")}>{previewText}</pre>
            <div className={block("preview-actions")}>
              <button
                type="button"
                className={block("primary-btn")}
                onClick={handleCopyText}
              >
                {copied ? "Скопировано ✓" : "Копировать текст"}
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {submitError && <p className={block("error-msg")}>{submitError}</p>}

      <footer className={block("editor-footer")}>
        <button
          type="button"
          className={block("secondary-btn")}
          onClick={onCancel}
          disabled={isSaving}
        >
          Отмена
        </button>
        <button
          type="button"
          className={block("secondary-btn")}
          onClick={() => saveWithStatus("draft")}
          disabled={isSaving || planBlocked}
          title={planBlocked ? "Сначала устраните расхождение ОКПД2 с ПГ" : undefined}
        >
          Сохранить как черновик
        </button>
        <button
          type="button"
          className={block("primary-btn")}
          onClick={() => saveWithStatus("ready")}
          disabled={isSaving || planBlocked}
          title={planBlocked ? "Сначала устраните расхождение ОКПД2 с ПГ" : undefined}
        >
          {isSaving ? "Сохранение…" : "Сохранить и направить в КС"}
        </button>
        {/* Утверждение — отдельное действие руководителя КС: оно открывает
            следующие этапы. Нац режим по ПП РФ № 1875 здесь не проверяем:
            его задаёт КС позже, при подготовке извещения. */}
        <button
          type="button"
          className={block("approve-btn")}
          onClick={() => saveWithStatus("approved")}
          disabled={isSaving || planBlocked || !isHead}
          title={
            planBlocked
              ? "Сначала устраните расхождение ОКПД2 с ПГ"
              : isHead
                ? "Утвердить ООЗ и открыть следующие этапы закупки"
                : "Утверждает руководитель контрактной службы"
          }
        >
          Утвердить
        </button>
      </footer>
      <p className={block("footer-hint")}>
        Национальный режим по ПП РФ № 1875 на этапе ООЗ не проверяется — его
        устанавливает контрактная служба на следующих этапах закупки.
      </p>
    </form>
  );
}