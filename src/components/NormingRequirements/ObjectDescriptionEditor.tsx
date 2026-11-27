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
  buildObjectDescriptionSummaryText,
  CHARACTERISTIC_CATEGORIES,
  CHARACTERISTIC_VALUE_TYPES,
  characteristicCategoryLabels,
  characteristicValueTypeLabels,
  emptyCharacteristic,
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
  type ObjectCharacteristic,
  type ObjectDescription,
  type ObjectDescriptionProductType,
  type ObjectDescriptionStatus,
  type ObjectStandardRef,
} from "../../services/ObjectDescription/objectDescription.schema";
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
import { useGostCatalog } from "../../services/GostRef/gostRef.api";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";
import KtruSelect from "../UI/KtruSelect/KtruSelect";
import CustomCheckbox from "../UI/CustomCheckbox";
import CustomButton from "../UI/CustomButton";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import Order158nValidatorPanel from "./Order158nValidatorPanel";
import CustomModal from "../UI/CustomModal";
import styles from "./NormingRequirementsPage.module.scss";
import Select from "../UI/Select";

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

  const [draft, setDraft] = useState<ObjectDescription>(initialValue);
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
      }),
    [draft, hasKtruForOkpd2, ktruDictionaryUnavailable],
  );
  const blockingErrors = complianceIssues.filter((i) => i.level === "error");

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
      return {
        ...prev,
        okpd2Code: code,
        okpd2Name: name,
        title: prev.title.trim() || !name ? prev.title : name,
        productType: autoProductType ?? prev.productType,
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
    setDraft((prev) => ({
      ...prev,
      productType: object.productType ?? prev.productType,
      okpd2Code: object.okpd2Code || prev.okpd2Code,
      okpd2Name: object.okpd2Name || prev.okpd2Name,
      ktruCode: object.ktruCode ?? "",
      ktruName: object.ktruName ?? "",
      unit: object.unit ?? "",
      quantity: object.quantity || "1",
      useKtru: Boolean(object.useKtru),
      characteristics: object.characteristics ?? [],
      standards: object.standards ?? [],
    }));
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

      {/* Секция 1: Идентификация объекта, ОКПД2 и КТРУ */}
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>01</span>
          Идентификация объекта закупки (ОКПД2 / КТРУ / объём)
        </legend>

        <div className={block("grid")}>
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
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>02</span>
          Структурированные характеристики (ст. 33 44-ФЗ / ПП 145 / ПП 926)
        </legend>

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
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          <span className={block("legend-index")}>03</span>
          Стандарты, товарные знаки и гарантии (ст. 33 44-ФЗ)
        </legend>

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
          <div className={block("standards-head")}>
            <span className={block("label")}>
              Нормативные документы, ГОСТ и технические регламенты (п. 2 ч. 1
              ст. 33)
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
              Иные требования (упаковка, маркировка, сопутствующие документы)
            </label>
            <textarea
              id="ooz-other"
              className={block("textarea")}
              rows={2}
              value={draft.otherRequirements}
              onChange={(e) => patch("otherRequirements", e.target.value)}
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

      {/* Секция 4: Автоконтроль соответствия 44-ФЗ / ПП 145 */}
      <div className={block("compliance-panel")}>
        <h3 className={block("compliance-title")}>
          Проверка соответствия ст. 33 44-ФЗ и ПП РФ № 145
        </h3>
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

      {/* Секция 5: Живая проверка по Приказу Минфина № 158н */}
      <Order158nValidatorPanel
        compact
        descriptions={[draft]}
        selectedId={draft.id ?? "draft"}
        contractService={contractService}
        educations={educations}
        okpd2Dictionary={okpd2Dictionary}
      />

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