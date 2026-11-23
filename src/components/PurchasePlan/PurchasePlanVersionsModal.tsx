import { useMemo, useState } from "react";
import {
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import { type PurchasePlan } from "../../services/PurchasePlan/purchasePlan.schema";
import {
  planVersionKindLabels,
  type PlanVersionKind,
} from "../../services/PurchasePlan/purchasePlanVersion.schema";
import {
  useCreatePurchasePlanVersion,
  useDeletePurchasePlanVersion,
  usePurchasePlanVersions,
} from "../../services/PurchasePlan/purchasePlanVersion.api";
import { diffPurchasePlans } from "../../services/PurchasePlan/purchasePlanDiff";
import { formatMoney, planTotalAmount } from "./purchasePlan.config";
import styles from "./PurchasePlanVersionsModal.module.scss";
import Select from "../UI/Select";

interface PurchasePlanVersionsModalProps {
  plan: PurchasePlan;
  onClose: () => void;
}

const CURRENT_PLAN_KEY = "__current__";

export default function PurchasePlanVersionsModal({
  plan,
  onClose,
}: PurchasePlanVersionsModalProps) {
  const planId = plan.id as string | number;
  const orgId = plan.organizationId;

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: versions = [], isLoading } = usePurchasePlanVersions(
    planId,
    orgId,
  );
  const createVersionMut = useCreatePurchasePlanVersion();
  const deleteVersionMut = useDeletePurchasePlanVersion();
  const updatePlanMut = useUpdatePurchasePlan();

  const nextVersionNumber = useMemo(() => {
    if (versions.length === 0) return Number(plan.versionNumber || 1) + 1;
    return Math.max(...versions.map((v) => v.versionNumber)) + 1;
  }, [versions, plan.versionNumber]);

  const [newLabel, setNewLabel] = useState(
    () =>
      `Редакция № ${Number(plan.versionNumber || 1) + 1} (${
        plan.status === "published" ? "размещённая" : "черновик"
      })`,
  );
  const [newKind, setNewKind] = useState<PlanVersionKind>(() =>
    plan.status === "published" ? "published" : "draft",
  );
  const [newComment, setNewComment] = useState("");
  const [leftVersionKey, setLeftVersionKey] = useState<string>("");
  const [rightVersionKey, setRightVersionKey] =
    useState<string>(CURRENT_PLAN_KEY);
  const [onlyChanges, setOnlyChanges] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const effectiveLeftKey = useMemo(() => {
    if (leftVersionKey) return leftVersionKey;
    if (versions.length >= 2) return String(versions[1].id);
    if (versions.length === 1) return String(versions[0].id);
    return CURRENT_PLAN_KEY;
  }, [leftVersionKey, versions]);

  const resolveSnapshot = (key: string): { label: string; plan: PurchasePlan } => {
    if (key === CURRENT_PLAN_KEY) {
      return { label: "Текущее состояние плана", plan };
    }
    const found = versions.find((v) => String(v.id) === String(key));
    return found
      ? {
          label: `Версия № ${found.versionNumber}: ${found.versionLabel}`,
          plan: found.snapshot,
        }
      : { label: "Текущее состояние плана", plan };
  };

  const leftSide = resolveSnapshot(effectiveLeftKey);
  const rightSide = resolveSnapshot(rightVersionKey);

  const diffResult = useMemo(
    () => diffPurchasePlans(leftSide.plan, rightSide.plan),
    [leftSide.plan, rightSide.plan],
  );

  const visiblePositions = useMemo(
    () =>
      onlyChanges
        ? diffResult.positions.filter((p) => p.kind !== "unchanged")
        : diffResult.positions,
    [diffResult.positions, onlyChanges],
  );

  const handleSaveSnapshot = async () => {
    setStatusMessage(null);
    await createVersionMut.mutateAsync({
      purchasePlanId: planId,
      organizationId: orgId,
      versionNumber: nextVersionNumber,
      versionLabel:
        newLabel.trim() || `Редакция № ${nextVersionNumber}`,
      snapshotStatus: newKind,
      createdAt: todayIso,
      createdBy:
        plan.approvalAuthor ||
        plan.customer.responsiblePerson ||
        "Специалист КС",
      comment: newComment.trim(),
      snapshot: {
        ...plan,
        versionNumber: String(nextVersionNumber),
      },
    });
    setNewLabel(`Редакция № ${nextVersionNumber + 1}`);
    setNewComment("");
    setStatusMessage(`Версия № ${nextVersionNumber} сохранена в историю.`);
  };

  const handleRestoreAsDraft = async (versionId: string | number | undefined) => {
    const target = versions.find((v) => String(v.id) === String(versionId));
    if (!target) return;

    // Перед откатом сохраняем резервный снимок текущего состояния
    await createVersionMut.mutateAsync({
      purchasePlanId: planId,
      organizationId: orgId,
      versionNumber: nextVersionNumber,
      versionLabel: `Автоснимок перед откатом к v.${target.versionNumber}`,
      snapshotStatus: "rollback",
      createdAt: todayIso,
      createdBy: plan.customer.responsiblePerson || "Специалист КС",
      comment: `Резервная копия перед восстановлением версии № ${target.versionNumber}`,
      snapshot: plan,
    });

    await updatePlanMut.mutateAsync({
      id: planId,
      data: {
        ...target.snapshot,
        id: planId,
        organizationId: orgId,
        status: "draft",
        versionNumber: String(nextVersionNumber + 1),
        publishDate: "",
        remarks: `Восстановлено из версии № ${target.versionNumber} (${target.versionLabel}) от ${target.createdAt}`,
      },
    });

    setStatusMessage(
      `План-график восстановлен в статус «Проект (черновик)» по версии № ${target.versionNumber}.`,
    );
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              История версий и сравнение редакций плана-графика №{" "}
              {plan.planNumber}
            </h2>
            <p className={styles.subtitle}>
              Сохранение снимков (черновики, утверждённые редакции, ЕИС), откат
              и построчное сравнение изменений по позициям и объёму финансирования.
            </p>
          </div>
          <button
            type="button"
            className={styles["close-btn"]}
            onClick={onClose}
            aria-label="Закрыть историю версий"
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>
          {/* === Зафиксировать новую версию === */}
          <section className={styles.section}>
            <h3 className={styles["section-title"]}>
              Сохранить текущее состояние как версию № {nextVersionNumber}
            </h3>
            <div className={styles["snapshot-form"]}>
              <div className={styles.field}>
                <label className={styles.label}>Название версии</label>
                <input
                  className={styles.input}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Тип редакции</label>
                <Select
                  className={styles.select}
                  value={newKind}
                  onChange={(e) =>
                    setNewKind(e.target.value as PlanVersionKind)
                  }
                >
                  <option value="draft">Черновик</option>
                  <option value="approved">Утверждённая редакция</option>
                  <option value="published">Опубликована в ЕИС</option>
                </Select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Комментарий к изменениям</label>
                <input
                  className={styles.input}
                  placeholder="Причина корректировки, обоснование..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles["btn--primary"]}`}
                disabled={createVersionMut.isPending}
                onClick={handleSaveSnapshot}
              >
                {createVersionMut.isPending
                  ? "Сохранение..."
                  : "Сохранить снимок"}
              </button>
            </div>
            {statusMessage && (
              <p className={styles.subtitle} style={{ color: "var(--state-success)" }}>
                {statusMessage}
              </p>
            )}
          </section>

          {/* === История версий === */}
          <section className={styles.section}>
            <h3 className={styles["section-title"]}>
              Сохранённые редакции ({versions.length})
            </h3>
            {isLoading ? (
              <p className={styles.subtitle}>Загрузка истории версий...</p>
            ) : versions.length === 0 ? (
              <p className={styles.subtitle}>
                История версий пока пуста. Сохраните первый снимок выше.
              </p>
            ) : (
              <div className={styles["versions-list"]}>
                {versions.map((ver) => (
                  <div key={String(ver.id)} className={styles["version-row"]}>
                    <div className={styles["version-meta"]}>
                      <span className={styles["version-title"]}>
                        v.{ver.versionNumber} — {ver.versionLabel} (
                        {planVersionKindLabels[ver.snapshotStatus]})
                      </span>
                      <span className={styles["version-sub"]}>
                        Дата: {ver.createdAt} · Автор:{" "}
                        {ver.createdBy || "—"} · Позиций:{" "}
                        {ver.snapshot.positions.length} · Объём:{" "}
                        {formatMoney(planTotalAmount(ver.snapshot))}
                      </span>
                      {ver.comment && (
                        <span className={styles["version-sub"]}>
                          Комментарий: {ver.comment}
                        </span>
                      )}
                    </div>
                    <div className={styles["version-actions"]}>
                      <button
                        type="button"
                        className={styles.btn}
                        onClick={() => setLeftVersionKey(String(ver.id))}
                      >
                        Сравнить (База A)
                      </button>
                      <button
                        type="button"
                        className={styles.btn}
                        disabled={
                          updatePlanMut.isPending || createVersionMut.isPending
                        }
                        onClick={() => handleRestoreAsDraft(ver.id)}
                      >
                        Восстановить как черновик
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles["btn--danger"]}`}
                        disabled={deleteVersionMut.isPending}
                        onClick={() =>
                          ver.id !== undefined && deleteVersionMut.mutate(ver.id)
                        }
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* === Сравнение редакций === */}
          <section className={styles.section}>
            <h3 className={styles["section-title"]}>
              Сравнение версий плана-графика
            </h3>
            <div className={styles["compare-bar"]}>
              <div className={styles.field}>
                <label className={styles.label}>Базовая редакция (Было)</label>
                <Select
                  className={styles.select}
                  value={effectiveLeftKey}
                  onChange={(e) => setLeftVersionKey(e.target.value)}
                >
                  <option value={CURRENT_PLAN_KEY}>
                    Текущее состояние плана
                  </option>
                  {versions.map((v) => (
                    <option key={String(v.id)} value={String(v.id)}>
                      v.{v.versionNumber} — {v.versionLabel} ({v.createdAt})
                    </option>
                  ))}
                </Select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Сравниваемая редакция (Стало)</label>
                <Select
                  className={styles.select}
                  value={rightVersionKey}
                  onChange={(e) => setRightVersionKey(e.target.value)}
                >
                  <option value={CURRENT_PLAN_KEY}>
                    Текущее состояние плана
                  </option>
                  {versions.map((v) => (
                    <option key={String(v.id)} value={String(v.id)}>
                      v.{v.versionNumber} — {v.versionLabel} ({v.createdAt})
                    </option>
                  ))}
                </Select>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyChanges}
                  onChange={(e) => setOnlyChanges(e.target.checked)}
                />
                Показывать только изменения
              </label>
            </div>

            <div className={styles["delta-strip"]}>
              <div className={styles["delta-card"]}>
                <span className={styles["delta-label"]}>Позиций: было → стало</span>
                <span className={styles["delta-value"]}>
                  {diffResult.summary.beforeCount} →{" "}
                  {diffResult.summary.afterCount}
                </span>
              </div>
              <div className={styles["delta-card"]}>
                <span className={styles["delta-label"]}>Разница объёма (Δ)</span>
                <span
                  className={`${styles["delta-value"]} ${
                    diffResult.summary.amountDelta > 0
                      ? styles["delta-value--plus"]
                      : diffResult.summary.amountDelta < 0
                        ? styles["delta-value--minus"]
                        : ""
                  }`}
                >
                  {diffResult.summary.amountDelta > 0 ? "+" : ""}
                  {formatMoney(diffResult.summary.amountDelta)}
                </span>
              </div>
              <div className={styles["delta-card"]}>
                <span className={styles["delta-label"]}>Добавлено / Исключено</span>
                <span className={styles["delta-value"]}>
                  +{diffResult.summary.added} / −{diffResult.summary.removed}
                </span>
              </div>
              <div className={styles["delta-card"]}>
                <span className={styles["delta-label"]}>Изменено позиций</span>
                <span className={styles["delta-value"]}>
                  {diffResult.summary.modified}
                </span>
              </div>
            </div>

            {diffResult.headerDiffs.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Реквизит плана-графика</th>
                    <th>Было ({leftSide.label})</th>
                    <th>Стало ({rightSide.label})</th>
                  </tr>
                </thead>
                <tbody>
                  {diffResult.headerDiffs.map((h) => (
                    <tr key={h.field}>
                      <td>
                        <strong>{h.label}</strong>
                      </td>
                      <td>
                        <span className={styles["old-val"]}>{h.before}</span>
                      </td>
                      <td>
                        <span className={styles["new-val"]}>{h.after}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {visiblePositions.length === 0 ? (
              <p className={styles.subtitle}>
                Между выбранными редакциями отличий по позициям плана-графика не
                обнаружено.
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>№ / ИКЗ</th>
                    <th>Объект закупки</th>
                    <th>Δ Финансирование</th>
                    <th>Детализация изменений</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePositions.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <span
                          className={`${styles.kind} ${
                            styles[`kind--${item.kind}`]
                          }`}
                        >
                          {item.kind === "added"
                            ? "Добавлена"
                            : item.kind === "removed"
                              ? "Исключена"
                              : item.kind === "modified"
                                ? "Изменена"
                                : "Без изменений"}
                        </span>
                      </td>
                      <td>
                        <div>№ {item.purchaseNumber}</div>
                        <div className={styles.subtitle}>
                          {item.identificationCode}
                        </div>
                      </td>
                      <td>{item.objectOfPurchase}</td>
                      <td>
                        {item.amountDelta !== 0
                          ? `${item.amountDelta > 0 ? "+" : ""}${formatMoney(
                              item.amountDelta,
                            )}`
                          : formatMoney(item.afterAmount)}
                      </td>
                      <td>
                        {item.kind === "added" && (
                          <span>
                            Включена позиция на сумму{" "}
                            {formatMoney(item.afterAmount)}
                          </span>
                        )}
                        {item.kind === "removed" && (
                          <span>
                            Исключена позиция (ранее{" "}
                            {formatMoney(item.beforeAmount)})
                          </span>
                        )}
                        {item.kind === "modified" && (
                          <ul className={styles["diff-list"]}>
                            {item.fieldDiffs.map((fd) => (
                              <li key={fd.field}>
                                <strong>{fd.label}:</strong>{" "}
                                <span className={styles["old-val"]}>
                                  {fd.before}
                                </span>
                                <span className={styles["new-val"]}>
                                  {fd.after}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {item.kind === "unchanged" && "Совпадает"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
