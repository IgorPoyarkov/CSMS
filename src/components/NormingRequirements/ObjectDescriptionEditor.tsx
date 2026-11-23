import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import { formatMoney } from "../PurchasePlan/purchasePlan.config";
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
  OBJECT_DESCRIPTION_STATUSES,
  objectDescriptionStatusLabels,
  STANDARD_TYPES,
  standardTypeLabels,
  TRADEMARK_RULES,
  trademarkRuleLabels,
  validateObjectDescriptionCompliance,
  type CharacteristicCategory,
  type ObjectCharacteristic,
  type ObjectDescription,
  type ObjectStandardRef,
} from "../../services/ObjectDescription/objectDescription.schema";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import Order158nValidatorPanel from "./Order158nValidatorPanel";
import styles from "./NormingRequirementsPage.module.scss";
import Select from "../UI/Select";

interface ObjectDescriptionEditorProps {
  initialValue: ObjectDescription;
  templatesByCode: Record<string, ObjectDescription>;
  contractService?: ContractService | null;
  educations?: EmployeeEducation[];
  isHead: boolean;
  defaultApproverName: string;
  isSaving: boolean;
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
  templatesByCode,
  contractService,
  educations = [],
  isHead,
  defaultApproverName,
  isSaving,
  onSave,
  onCancel,
}: ObjectDescriptionEditorProps) {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");
  const { data: okpd2Dictionary = [] } = useOkpd2Dictionary();

  const [draft, setDraft] = useState<ObjectDescription>(initialValue);
  const [categoryFilter, setCategoryFilter] = useState<
    CharacteristicCategory | "all"
  >("all");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const matchedOkpd2 = useMemo(
    () => findOkpd2ByCode(okpd2Dictionary, draft.okpd2Code),
    [okpd2Dictionary, draft.okpd2Code],
  );
  const templateForCode = draft.okpd2Code
    ? templatesByCode[draft.okpd2Code]
    : undefined;

  const complianceIssues = useMemo(
    () => validateObjectDescriptionCompliance(draft),
    [draft],
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

  const handleApplyNormingTemplate = () => {
    if (!templateForCode || templateForCode.characteristics.length === 0) {
      return;
    }
    const existingNames = new Set(
      draft.characteristics.map((c) => c.name.trim().toLowerCase()),
    );
    const cloned = templateForCode.characteristics
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
      emptyCharacteristic(category),
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
    if (draft.status !== "draft" && blockingErrors.length > 0) {
      setSubmitError(
        "Устраните обязательные нарушения ст. 33 44-ФЗ / ПП РФ N 145 или сохраните документ как «Черновик».",
      );
      return;
    }

    const nextToSave: ObjectDescription = {
      ...draft,
      approvedByName:
        draft.status === "approved"
          ? draft.approvedByName || defaultApproverName
          : draft.approvedByName,
      approvedDate:
        draft.status === "approved"
          ? draft.approvedDate || new Date().toISOString().slice(0, 10)
          : draft.approvedDate,
    };

    onSave(nextToSave);
  };

  return (
    <form className={block("editor")} onSubmit={handleSubmit}>
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
        </div>
        <div className={block("editor-actions")}>
          <button
            type="button"
            className={block("secondary-btn")}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Скрыть макет ТЗ" : "Макет ТЗ"}
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
          1. Идентификация объекта закупки (ОКПД2 / КТРУ / объём)
        </legend>

        <div className={block("grid")}>
          <div className={block("field", ["wide"])}>
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

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-status">
              Статус документа
            </label>
            <Select
              id="ooz-status"
              className={block("select")}
              value={draft.status}
              onChange={(e) =>
                patch(
                  "status",
                  e.target.value as ObjectDescription["status"],
                )
              }
            >
              {OBJECT_DESCRIPTION_STATUSES.map((st) => (
                <option
                  key={st}
                  value={st}
                  disabled={st === "approved" && !isHead}
                >
                  {objectDescriptionStatusLabels[st]}
                  {st === "approved" && !isHead
                    ? " (только руководитель КС / КУ)"
                    : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")}>Код по ОКПД2 *</label>
            <Okpd2Select
              code={draft.okpd2Code}
              name={draft.okpd2Name}
              onSelect={(item) => {
                setDraft((prev) => ({
                  ...prev,
                  okpd2Code: item?.code ?? "",
                  okpd2Name: item?.name ?? "",
                  title:
                    prev.title.trim() || !item?.name ? prev.title : item.name,
                }));
                setSubmitError("");
              }}
            />
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
                    onClick={handleApplyNormingTemplate}
                  >
                    + Подставить типовые требования ПП 926 (
                    {templateForCode.characteristics.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-unit">
              Единица измерения (ОКЕИ)
            </label>
            <OkeiSelect
              id="ooz-unit"
              value={draft.unit}
              valueMode="symbol"
              showCodeHint
              placeholder="шт, компл, усл. ед, кг (ОКЕИ)…"
              onChange={(nextUnit) => patch("unit", nextUnit)}
            />
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
              placeholder={
                draft.isIndeterminateVolume ? "Не определено (ч. 24 ст. 22)" : "1"
              }
              value={draft.isIndeterminateVolume ? "" : draft.quantity}
              onChange={(e) => patch("quantity", e.target.value)}
            />
            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={draft.isIndeterminateVolume}
                onChange={(e) =>
                  patch("isIndeterminateVolume", e.target.checked)
                }
              />
              <span>Невозможно определить объём (ч. 24 ст. 22 44-ФЗ)</span>
            </label>
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-ktru">
              Применение КТРУ (ПП РФ № 145)
            </label>
            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={draft.useKtru}
                onChange={(e) => patch("useKtru", e.target.checked)}
              />
              <span>Включать позицию каталога товаров, работ, услуг</span>
            </label>
            {draft.useKtru && (
              <input
                id="ooz-ktru"
                className={block("input")}
                type="text"
                placeholder="Код позиции КТРУ (например: 32.50.14.110-00000012)"
                value={draft.ktruCode}
                onChange={(e) => patch("ktruCode", e.target.value)}
              />
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-ikz">
              ИКЗ (если уже сформирован в ПГ)
            </label>
            <input
              id="ooz-ikz"
              className={block("input")}
              type="text"
              placeholder="36 знаков — привязка к позиции ПГ / СЗ"
              value={draft.ikz}
              onChange={(e) => patch("ikz", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* Секция 2: Структурированные характеристики */}
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          2. Структурированные характеристики (ст. 33 44-ФЗ / ПП 145 / ПП 926)
        </legend>

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

                  <div className={block("field", ["unit"])}>
                    <label className={block("label")}>Ед. изм.</label>
                    <OkeiSelect
                      compact
                      value={item.unit}
                      valueMode="symbol"
                      placeholder="мм, кг, Вт"
                      onChange={(nextUnit) =>
                        updateCharacteristic(idx, { unit: nextUnit })
                      }
                    />
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
                    <input
                      className={block("input")}
                      type="text"
                      placeholder="Как участнику указать значение в заявке (неизменяемое / конкретное)"
                      value={item.instructionForParticipant}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          instructionForParticipant: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className={block("char-flags")}>
                  {draft.useKtru && (
                    <>
                      <label className={block("checkbox-label")}>
                        <input
                          type="checkbox"
                          checked={item.isMandatoryFromKtru}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              isMandatoryFromKtru: e.target.checked,
                              isAdditionalOverKtru: e.target.checked
                                ? false
                                : item.isAdditionalOverKtru,
                            })
                          }
                        />
                        <span>Обязательная характеристика из КТРУ</span>
                      </label>
                      <label className={block("checkbox-label")}>
                        <input
                          type="checkbox"
                          checked={item.isAdditionalOverKtru}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              isAdditionalOverKtru: e.target.checked,
                              isMandatoryFromKtru: e.target.checked
                                ? false
                                : item.isMandatoryFromKtru,
                            })
                          }
                        />
                        <span>
                          Дополнительная характеристика сверх КТРУ (требует
                          обоснования по ПП 145)
                        </span>
                      </label>
                    </>
                  )}
                  <span className={block("char-preview-badge")}>
                    Итого: {formatCharacteristicValue(item)}
                  </span>
                </div>

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
        )}
      </fieldset>

      {/* Секция 3: Товарный знак, ГОСТ, гарантии и инструкция */}
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          3. Стандарты, товарные знаки и гарантии (ст. 33 44-ФЗ)
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

          {draft.standards.map((std, idx) => (
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
              <label className={block("checkbox-label")}>
                <input
                  type="checkbox"
                  checked={std.hasDeviation}
                  onChange={(e) =>
                    updateStandard(idx, { hasDeviation: e.target.checked })
                  }
                />
                <span>Отклонение от показателей стандарта</span>
              </label>
              <button
                type="button"
                className={block("req-remove")}
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
            </div>
          ))}
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

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-author">
              Составитель ООЗ (специалист заказчика)
            </label>
            <input
              id="ooz-author"
              className={block("input")}
              type="text"
              value={draft.authorName}
              onChange={(e) => patch("authorName", e.target.value)}
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
              Общая инструкция по заполнению заявки участником (п. 2 ч. 1 ст.
              33)
            </label>
            <textarea
              id="ooz-instruction"
              className={block("textarea")}
              rows={2}
              placeholder="Порядок указания конкретных показателей в первой части заявки (для диапазонов, «не менее»/«не более» и перечней)..."
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

          <div className={block("field", ["wide"])}>
            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={draft.isNewGoodsRequired}
                onChange={(e) =>
                  patch("isNewGoodsRequired", e.target.checked)
                }
              />
              <span>
                Поставляемый товар должен быть новым (не бывшим в употреблении,
                п. 7 ч. 1 ст. 33)
              </span>
            </label>
            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={draft.noRestrictionDeclaration}
                onChange={(e) =>
                  patch("noRestrictionDeclaration", e.target.checked)
                }
              />
              <span>
                Подтверждаю, что в ООЗ не включены требования, влекущие
                ограничение количества участников закупки (п. 1 ч. 1 ст. 33
                44-ФЗ)
              </span>
            </label>
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

      {showPreview && (
        <div className={block("preview-box")}>
          <div className={block("preview-head")}>
            <h3>Структурированный макет ТЗ (ООЗ)</h3>
            <button
              type="button"
              className={block("inline-btn")}
              onClick={handleCopyText}
            >
              {copied ? "Скопировано ✓" : "Копировать текст"}
            </button>
          </div>
          <pre className={block("preview-pre")}>{previewText}</pre>
        </div>
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
          type="submit"
          className={block("primary-btn")}
          disabled={isSaving}
        >
          {isSaving ? "Сохранение…" : "Сохранить описание объекта закупки"}
        </button>
      </footer>
    </form>
  );
}
