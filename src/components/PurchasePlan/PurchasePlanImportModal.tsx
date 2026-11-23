import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { organizationToCustomer, type BaseOrganization } from "../../services/Organization/organization.schema";
import {
  useCreatePurchasePlan,
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import {
  emptyPurchasePlan,
  type PurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  PG_IMPORT_FIELD_OPTIONS,
  buildImportedPositions,
  buildSampleCsvTemplate,
  buildSampleEisXml,
  parseExternalPurchasePlanSource,
  type PgImportTargetField,
} from "../../services/PurchasePlan/purchasePlanImport";
import { useCreatePurchasePlanVersion } from "../../services/PurchasePlan/purchasePlanVersion.api";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import styles from "./PurchasePlanImportModal.module.scss";
import Select from "../UI/Select";

interface PurchasePlanImportModalProps {
  organization: BaseOrganization;
  existingPlans: PurchasePlan[];
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

export default function PurchasePlanImportModal({
  organization,
  existingPlans,
  onClose,
}: PurchasePlanImportModalProps) {
  const navigate = useNavigate();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const createPlanMut = useCreatePurchasePlan();
  const updatePlanMut = useUpdatePurchasePlan();
  const createVersionMut = useCreatePurchasePlanVersion();

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [defaultYear] = useState(() => String(new Date().getFullYear()));
  const [step, setStep] = useState<WizardStep>(1);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, PgImportTargetField>>(
    {},
  );
  const [targetMode, setTargetMode] = useState<"new_draft" | "append_draft">(
    "new_draft",
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [planNumber, setPlanNumber] = useState(
    () => `${new Date().getFullYear()}${organization.inn}0009`,
  );
  const [planYear, setPlanYear] = useState(defaultYear);
  const [remarks, setRemarks] = useState(
    "Черновик сформирован мастером импорта данных (CSV/XML ЕИС)",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parsed = useMemo(
    () =>
      rawText.trim()
        ? parseExternalPurchasePlanSource(rawText, fileName)
        : null,
    [rawText, fileName],
  );

  const effectiveMapping = useMemo(() => {
    if (!parsed) return {};
    return { ...parsed.suggestedMapping, ...mapping };
  }, [parsed, mapping]);

  const draftPlans = useMemo(
    () => existingPlans.filter((p) => p.status === "draft"),
    [existingPlans],
  );

  const targetExistingDraft = useMemo(
    () =>
      draftPlans.find((p) => String(p.id) === String(selectedDraftId)) ??
      draftPlans[0],
    [draftPlans, selectedDraftId],
  );

  const previewRows = useMemo(() => {
    if (!parsed || parsed.rows.length === 0) return [];
    const baseSerial =
      targetMode === "append_draft" && targetExistingDraft
        ? (targetExistingDraft.positions?.length ?? 0) + 1
        : 1;
    const effectivePlanNum =
      targetMode === "append_draft" && targetExistingDraft
        ? targetExistingDraft.planNumber
        : planNumber;
    const effectivePlanYr =
      targetMode === "append_draft" && targetExistingDraft
        ? String(targetExistingDraft.planYear)
        : planYear;

    return buildImportedPositions({
      rows: parsed.rows,
      mapping: effectiveMapping,
      planYear: effectivePlanYr,
      planNumber: effectivePlanNum,
      inn: organization.inn,
      kpp: organization.kpp,
      startSerialNumber: baseSerial,
      okpd2Refs,
    });
  }, [
    parsed,
    effectiveMapping,
    targetMode,
    targetExistingDraft,
    planNumber,
    planYear,
    organization.inn,
    organization.kpp,
    okpd2Refs,
  ]);

  const validRows = previewRows.filter((r) => r.isValid);
  const totalImportedAmount = validRows.reduce(
    (s, r) => s + Number(r.position.amountTotal || 0),
    0,
  );

  const applySourceText = (text: string, name: string) => {
    setRawText(text);
    setFileName(name);
    const initialParsed = parseExternalPurchasePlanSource(text, name);
    setMapping(initialParsed.suggestedMapping);
    if (initialParsed.detectedPlanNumber) {
      setPlanNumber(initialParsed.detectedPlanNumber);
    }
    if (initialParsed.detectedPlanYear) {
      setPlanYear(initialParsed.detectedPlanYear);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    applySourceText(text, file.name);
  };

  const handleDownloadSampleCsv = () => {
    const csv = `\uFEFF${buildSampleCsvTemplate(planYear)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pg_import_sample_${planYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async () => {
    if (validRows.length === 0) return;
    setSubmitError(null);

    try {
      const positionsToSave = validRows.map((r) => r.position);

      if (targetMode === "append_draft" && targetExistingDraft?.id) {
        const mergedPositions = [
          ...(targetExistingDraft.positions ?? []),
          ...positionsToSave,
        ];
        const mergedTotal = mergedPositions
          .reduce((s, p) => s + Number(p.amountTotal || 0), 0)
          .toFixed(2);
        const updated = await updatePlanMut.mutateAsync({
          id: targetExistingDraft.id,
          data: {
            ...targetExistingDraft,
            positions: mergedPositions,
            totalAmount: mergedTotal,
          },
        });
        if (updated.id !== undefined) {
          await createVersionMut.mutateAsync({
            purchasePlanId: updated.id,
            organizationId: organization.id as string | number,
            versionNumber: Number(updated.versionNumber || 1) + 1,
            versionLabel: `Импорт позиций (${positionsToSave.length} шт.)`,
            snapshotStatus: "imported",
            createdAt: todayIso,
            createdBy: organization.responsiblePerson || "Мастер импорта",
            comment: `Добавлено ${positionsToSave.length} позиций из ${fileName || "внешнего источника"}`,
            snapshot: updated,
          });
          onClose();
          navigate(`/purchase-plans/${updated.id}`);
        }
        return;
      }

      const draftPlan: PurchasePlan = {
        ...emptyPurchasePlan(),
        organizationId: organization.id as string | number,
        customer: organizationToCustomer(organization),
        planNumber,
        planYear,
        status: "draft",
        versionNumber: "1",
        totalAmount: totalImportedAmount.toFixed(2),
        remarks,
        positions: positionsToSave,
      };

      const created = await createPlanMut.mutateAsync(draftPlan);
      if (created.id !== undefined) {
        await createVersionMut.mutateAsync({
          purchasePlanId: created.id,
          organizationId: organization.id as string | number,
          versionNumber: 1,
          versionLabel: "Черновик № 1 (импорт из файла / ЕИС)",
          snapshotStatus: "imported",
          createdAt: todayIso,
          createdBy: organization.responsiblePerson || "Мастер импорта",
          comment: `Импортировано ${positionsToSave.length} позиций из ${fileName || "буфера"}`,
          snapshot: created,
        });
        onClose();
        navigate(`/purchase-plans/${created.id}`);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Не удалось сохранить черновик ПГ",
      );
    }
  };

  const isSubmitting =
    createPlanMut.isPending ||
    updatePlanMut.isPending ||
    createVersionMut.isPending;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Мастер загрузки закупок в черновик плана-графика
            </h2>
            <p className={styles.subtitle}>
              Импорт из CSV/TSV, JSON или выгрузки ЕИС XML (tenderPlan2020) с
              проверкой КБК, ИКЗ и ОКПД2.
            </p>
          </div>
          <button
            type="button"
            className={styles["close-btn"]}
            onClick={onClose}
            aria-label="Закрыть мастер"
          >
            ✕
          </button>
        </header>

        <nav className={styles.steps}>
          <button
            type="button"
            className={`${styles["step-btn"]} ${
              step === 1 ? styles["step-btn--active"] : ""
            }`}
            onClick={() => setStep(1)}
          >
            1. Источник данных
          </button>
          <button
            type="button"
            className={`${styles["step-btn"]} ${
              step === 2 ? styles["step-btn--active"] : ""
            }`}
            disabled={!parsed || parsed.rows.length === 0}
            onClick={() => setStep(2)}
          >
            2. Сопоставление полей
          </button>
          <button
            type="button"
            className={`${styles["step-btn"]} ${
              step === 3 ? styles["step-btn--active"] : ""
            }`}
            disabled={!parsed || parsed.rows.length === 0}
            onClick={() => setStep(3)}
          >
            3. Проверка 44-ФЗ ({previewRows.length})
          </button>
          <button
            type="button"
            className={`${styles["step-btn"]} ${
              step === 4 ? styles["step-btn--active"] : ""
            }`}
            disabled={validRows.length === 0}
            onClick={() => setStep(4)}
          >
            4. Создание черновика
          </button>
        </nav>

        <div className={styles.body}>
          {step === 1 && (
            <>
              <div className={styles.toolbar}>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json,.xml"
                  className={styles["file-input"]}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() =>
                    applySourceText(
                      buildSampleCsvTemplate(planYear),
                      `sample_${planYear}.csv`,
                    )
                  }
                >
                  Загрузить пример CSV
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() =>
                    applySourceText(
                      buildSampleEisXml(planNumber, planYear),
                      `eis_tenderPlan_${planYear}.xml`,
                    )
                  }
                >
                  Загрузить пример XML ЕИС
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={handleDownloadSampleCsv}
                >
                  Скачать шаблон CSV
                </button>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Содержимое файла (CSV с «;» / «,», JSON или XML ЕИС)
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="Вставьте содержимое CSV, JSON или XML-файла ЕИС..."
                  value={rawText}
                  onChange={(e) => applySourceText(e.target.value, fileName)}
                />
              </div>

              {parsed && (
                <div className={styles.subtitle}>
                  Определён формат:{" "}
                  <strong>
                    {parsed.format === "eis_xml"
                      ? "XML ЕИС (tenderPlan)"
                      : parsed.format === "json"
                        ? "JSON"
                        : "CSV / Таблица"}
                  </strong>{" "}
                  · Строк позиций: <strong>{parsed.rows.length}</strong>
                </div>
              )}

              {parsed?.warnings.map((w) => (
                <div key={w} className={styles["warning-box"]}>
                  {w}
                </div>
              ))}
            </>
          )}

          {step === 2 && parsed && (
            <>
              <p className={styles.subtitle}>
                Проверьте соответствие колонок загруженного файла полям позиции
                плана-графика (Приказ МЭР/Минфина 145/206н).
              </p>
              <div className={styles["mapping-grid"]}>
                {parsed.headers.map((col) => (
                  <div key={col} className={styles["mapping-card"]}>
                    <span className={styles["mapping-col"]}>{col}</span>
                    <span className={styles["mapping-sample"]}>
                      Пример: {parsed.rows[0]?.[col] || "—"}
                    </span>
                    <Select
                      className={styles.select}
                      value={effectiveMapping[col] ?? "ignore"}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [col]: e.target.value as PgImportTargetField,
                        }))
                      }
                    >
                      {PG_IMPORT_FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className={styles.subtitle}>
                Готово к загрузке позиций: <strong>{validRows.length}</strong> из{" "}
                <strong>{previewRows.length}</strong> · Итоговый объём:{" "}
                <strong>
                  {totalImportedAmount.toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  руб.
                </strong>
              </div>

              <div className={styles["table-wrap"]}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Объект закупки / ИКЗ</th>
                      <th>ОКПД2 / КБК</th>
                      <th>Всего, руб.</th>
                      <th>Проверка 44-ФЗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.rowIndex}>
                        <td>{row.position.purchaseNumber}</td>
                        <td>
                          <div>{row.position.objectOfPurchase || "—"}</div>
                          <div className={styles.subtitle}>
                            ИКЗ: {row.position.identificationCode || "не задан"}
                          </div>
                        </td>
                        <td>
                          <div>ОКПД2: {row.position.okpd2Code || "—"}</div>
                          <div>КБК: {row.position.kbk || "—"}</div>
                        </td>
                        <td>
                          {Number(row.position.amountTotal || 0).toLocaleString(
                            "ru-RU",
                            { minimumFractionDigits: 2 },
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              row.isValid
                                ? styles["status-ok"]
                                : styles["status-err"]
                            }
                          >
                            {row.isValid ? "Корректно" : "Ошибка"}
                          </span>
                          {row.errors.length > 0 && (
                            <ul className={styles["error-list"]}>
                              {row.errors.map((err) => (
                                <li key={err}>{err}</li>
                              ))}
                            </ul>
                          )}
                          {row.notices.length > 0 && (
                            <ul className={styles["notice-list"]}>
                              {row.notices.map((n) => (
                                <li key={n}>{n}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className={styles.toolbar}>
                <button
                  type="button"
                  className={`${styles.btn} ${
                    targetMode === "new_draft" ? styles["btn--primary"] : ""
                  }`}
                  onClick={() => setTargetMode("new_draft")}
                >
                  Создать новый черновик ПГ
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${
                    targetMode === "append_draft" ? styles["btn--primary"] : ""
                  }`}
                  disabled={draftPlans.length === 0}
                  onClick={() => setTargetMode("append_draft")}
                >
                  Добавить в существующий черновик ({draftPlans.length})
                </button>
              </div>

              {targetMode === "new_draft" ? (
                <div className={styles["form-grid"]}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Номер нового плана-графика
                    </label>
                    <input
                      className={styles.input}
                      value={planNumber}
                      onChange={(e) => setPlanNumber(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Год планирования</label>
                    <input
                      className={styles.input}
                      value={planYear}
                      onChange={(e) => setPlanYear(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Примечание к черновику</label>
                    <input
                      className={styles.input}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>
                    Выберите существующий черновик ПГ
                  </label>
                  <Select
                    className={styles.select}
                    value={String(targetExistingDraft?.id ?? "")}
                    onChange={(e) => setSelectedDraftId(e.target.value)}
                  >
                    {draftPlans.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        ПГ № {p.planNumber} ({p.planYear} г., позиций:{" "}
                        {p.positions.length})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className={styles.subtitle}>
                Заказчик: <strong>{organization.fullName}</strong> (ИНН{" "}
                {organization.inn}) · Будет загружено позиций:{" "}
                <strong>{validRows.length}</strong> на сумму{" "}
                <strong>
                  {totalImportedAmount.toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  руб.
                </strong>
                . Автоматически сохранится стартовая версия в истории изменений.
              </div>

              {submitError && (
                <div className={styles["warning-box"]}>{submitError}</div>
              )}
            </>
          )}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btn}
            onClick={() =>
              step > 1 ? setStep((s) => (s - 1) as WizardStep) : onClose()
            }
          >
            {step > 1 ? "← Назад" : "Отмена"}
          </button>

          {step < 4 ? (
            <button
              type="button"
              className={`${styles.btn} ${styles["btn--primary"]}`}
              disabled={
                !parsed ||
                parsed.rows.length === 0 ||
                (step === 3 && validRows.length === 0)
              }
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
            >
              Далее →
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles["btn--primary"]}`}
              disabled={isSubmitting || validRows.length === 0}
              onClick={handleImportSubmit}
            >
              {isSubmitting
                ? "Сохраняем черновик..."
                : `Импортировать в план-график (${validRows.length})`}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
