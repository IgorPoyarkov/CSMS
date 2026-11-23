import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { formatMoney } from "../PurchasePlan/purchasePlan.config";
import {
  searchOkpd2,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import {
  useNormingTemplates,
  useUpsertNormingTemplate,
} from "../../services/ObjectDescription/objectDescription.api";
import {
  CHARACTERISTIC_CATEGORIES,
  characteristicCategoryLabels,
  emptyCharacteristic,
  type CharacteristicCategory,
  type ObjectCharacteristic,
  type ObjectDescription,
} from "../../services/ObjectDescription/objectDescription.schema";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import styles from "./NormingRequirementsPage.module.scss";
import Select from "../UI/Select";

const LEGACY_STORAGE_KEY = "csms_norming_requirements";

interface LegacyRequirement {
  id: string;
  requirementType: string;
  requirementText: string;
}

interface NormingTemplatesTabProps {
  organizationId?: string | number;
  onCreateDescriptionFromTemplate: (template: ObjectDescription) => void;
}

const mapLegacyCategory = (type: string): CharacteristicCategory => {
  if (
    type === "consumer" ||
    type === "quality" ||
    type === "functional" ||
    type === "other"
  ) {
    return type;
  }
  return "other";
};

/**
 * Вкладка типовых требований по п. 7 ПП РФ N 926 для нормируемых кодов ОКПД2.
 * Хранение переведено из localStorage в БД (objectDescriptions с kind="norming_template"),
 * при наличии старых локальных записей пользователь может перенести их в БД одним кликом.
 */
export default function NormingTemplatesTab({
  organizationId,
  onCreateDescriptionFromTemplate,
}: NormingTemplatesTabProps) {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");

  const { data: dictionary = [], isLoading: isLoadingDict } =
    useOkpd2Dictionary();
  const {
    byCode: templatesByCode,
    isLoading: isLoadingTemplates,
  } = useNormingTemplates(organizationId);
  const upsertTemplate = useUpsertNormingTemplate();

  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<PageSizeValue>(10);
  const [page, setPage] = useState(1);
  // Локальные несохранённые правки по коду ОКПД2 до нажатия «Сохранить шаблон»
  const [draftsByCode, setDraftsByCode] = useState<
    Record<string, ObjectCharacteristic[]>
  >({});
  const [legacyData, setLegacyData] = useState<
    Record<string, LegacyRequirement[]>
  >(() => {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, LegacyRequirement[]>;
        if (parsed && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {
      // игнорируем ошибки чтения старого localStorage
    }
    return {};
  });

  const normedCodes = useMemo(() => {
    const matched = searchOkpd2(dictionary, query, Number.MAX_SAFE_INTEGER);
    return matched.filter((item) => item.isNormed);
  }, [dictionary, query]);

  const effectiveSize =
    pageSize === "all" ? Math.max(normedCodes.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(normedCodes.length / effectiveSize));
  const safePage = Math.min(page, totalPages);
  const pagedCodes = useMemo(() => {
    const start = (safePage - 1) * effectiveSize;
    return normedCodes.slice(start, start + effectiveSize);
  }, [normedCodes, safePage, effectiveSize]);

  const getCharacteristics = (code: string): ObjectCharacteristic[] =>
    draftsByCode[code] ?? templatesByCode[code]?.characteristics ?? [];

  const isDirty = (code: string): boolean => Boolean(draftsByCode[code]);

  const setCodeCharacteristics = (
    code: string,
    next: ObjectCharacteristic[],
  ) => {
    setDraftsByCode((prev) => ({ ...prev, [code]: next }));
  };

  const addRow = (code: string) => {
    setCodeCharacteristics(code, [
      ...getCharacteristics(code),
      emptyCharacteristic("consumer"),
    ]);
  };

  const updateRow = (
    code: string,
    index: number,
    changes: Partial<ObjectCharacteristic>,
  ) => {
    const list = [...getCharacteristics(code)];
    list[index] = { ...list[index], ...changes };
    setCodeCharacteristics(code, list);
  };

  const removeRow = (code: string, index: number) => {
    const list = [...getCharacteristics(code)];
    list.splice(index, 1);
    setCodeCharacteristics(code, list);
  };

  const saveCodeTemplate = (code: string, name: string) => {
    const rows = getCharacteristics(code).filter((c) => c.name.trim());
    upsertTemplate.mutate(
      {
        existingId: templatesByCode[code]?.id,
        organizationId: organizationId ?? null,
        okpd2Code: code,
        okpd2Name: name,
        characteristics: rows,
      },
      {
        onSuccess: () => {
          setDraftsByCode((prev) => {
            const copy = { ...prev };
            delete copy[code];
            return copy;
          });
        },
      },
    );
  };

  const importLegacyForCode = (code: string) => {
    const legacy = legacyData[code];
    if (!legacy || legacy.length === 0) return;
    const mapped: ObjectCharacteristic[] = legacy
      .filter((r) => r.requirementText.trim())
      .map((r) => ({
        ...emptyCharacteristic(mapLegacyCategory(r.requirementType)),
        name: r.requirementText,
        valueType: "text",
        valueText: r.requirementText,
      }));
    setCodeCharacteristics(code, [...getCharacteristics(code), ...mapped]);
    const copy = { ...legacyData };
    delete copy[code];
    setLegacyData(copy);
    try {
      if (Object.keys(copy).length === 0) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } else {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(copy));
      }
    } catch {
      // игнорируем
    }
  };

  if (isLoadingDict || isLoadingTemplates) {
    return <p className={block("muted")}>Загрузка нормируемых кодов ОКПД2…</p>;
  }

  return (
    <div className={block("templates-wrap")}>
      <div className={block("toolbar")}>
        <input
          className={block("search")}
          type="search"
          placeholder="Поиск нормируемого кода или наименования ОКПД2…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <span className={block("count")}>
          Нормируемых кодов: {normedCodes.length}
        </span>
        <PageSizePicker
          sizes={[5, 10, 25, "all"]}
          value={pageSize}
          onChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>

      <div className={block("list")}>
        {pagedCodes.length === 0 ? (
          <p className={block("empty")}>
            Нормируемых кодов не найдено. Проверьте справочник ОКПД2 (
            <Link to="/okpd2">открыть справочник</Link>).
          </p>
        ) : (
          pagedCodes.map((item) => {
            const rows = getCharacteristics(item.code);
            const savedTpl = templatesByCode[item.code];
            const hasLegacy = Boolean(legacyData[item.code]?.length);

            return (
              <div key={item.code} className={block("item")}>
                <div className={block("item-head")}>
                  <span className={block("item-code")}>{item.code}</span>
                  <span className={block("item-name")}>{item.name}</span>
                  {item.normLimit !== null && item.normLimit !== undefined && (
                    <span className={block("item-limit")}>
                      Предельная цена: {formatMoney(item.normLimit)}
                    </span>
                  )}
                  {savedTpl && (
                    <button
                      type="button"
                      className={block("inline-btn")}
                      onClick={() => onCreateDescriptionFromTemplate(savedTpl)}
                    >
                      Создать ООЗ из шаблона
                    </button>
                  )}
                </div>

                {hasLegacy && (
                  <div className={block("norming-banner")}>
                    <span>
                      Найдены локальные черновики требований из прошлой сессии (
                      {legacyData[item.code].length}).
                    </span>
                    <button
                      type="button"
                      className={block("inline-btn")}
                      onClick={() => importLegacyForCode(item.code)}
                    >
                      Перенести в БД
                    </button>
                  </div>
                )}

                <div className={block("item-body")}>
                  <div className={block("req-list")}>
                    {rows.map((req, i) => (
                      <div key={req.id} className={block("req-row")}>
                        <Select
                          className={block("req-select")}
                          value={req.category}
                          onChange={(e) =>
                            updateRow(item.code, i, {
                              category: e.target
                                .value as CharacteristicCategory,
                            })
                          }
                        >
                          {CHARACTERISTIC_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {characteristicCategoryLabels[cat]}
                            </option>
                          ))}
                        </Select>
                        <input
                          className={block("req-input")}
                          type="text"
                          placeholder="Показатель (например, Назначение)"
                          value={req.name}
                          onChange={(e) =>
                            updateRow(item.code, i, { name: e.target.value })
                          }
                        />
                        <div className={block("req-unit")}>
                          <OkeiSelect
                            compact
                            value={req.unit}
                            valueMode="symbol"
                            placeholder="Ед."
                            onChange={(nextUnit) =>
                              updateRow(item.code, i, { unit: nextUnit })
                            }
                          />
                        </div>
                        <input
                          className={block("req-input")}
                          type="text"
                          placeholder="Требование / норматив значения"
                          value={req.valueText}
                          onChange={(e) =>
                            updateRow(item.code, i, {
                              valueType: "text",
                              valueText: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          className={block("req-remove")}
                          onClick={() => removeRow(item.code, i)}
                          title="Удалить требование"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={block("item-actions")}>
                    <button
                      type="button"
                      className={block("add-btn")}
                      onClick={() => addRow(item.code)}
                    >
                      + Добавить требование
                    </button>
                    {isDirty(item.code) && (
                      <button
                        type="button"
                        className={block("primary-btn")}
                        disabled={upsertTemplate.isPending}
                        onClick={() => saveCodeTemplate(item.code, item.name)}
                      >
                        {upsertTemplate.isPending
                          ? "Сохранение…"
                          : "Сохранить шаблон в БД"}
                      </button>
                    )}
                  </div>

                  {savedTpl && !isDirty(item.code) && (
                    <p className={block("hint")}>
                      Шаблон сохранён в базе ({savedTpl.characteristics.length}{" "}
                      поз.) и подставляется при создании ООЗ или позиции
                      извещения с кодом {item.code}.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className={block("pagination")}>
          <button
            type="button"
            className={block("secondary-btn")}
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Назад
          </button>
          <span className={block("count")}>
            Страница {safePage} из {totalPages}
          </span>
          <button
            type="button"
            className={block("secondary-btn")}
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
