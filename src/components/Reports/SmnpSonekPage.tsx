import { useState } from "react";
import {
  smnpShare,
  MINIMUM_SMNP_SHARE,
  checkSmnpPlan,
  type SmnpSonekPlan,
  type SmnpSonekReport,
  type SmnpSonekProcurement,
  type SmnpSonekRecord,
} from "../../services/Reports/smnpSonek.schema";
import {
  useSmnpPlans,
  useSmnpReports,
  useSmnpProcurements,
  useDeleteSmnpPlan,
  useDeleteSmnpReport,
  useDeleteSmnpProcurement,
} from "../../services/Reports/smnpSonek.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import LegalActRefs from "../LegalAct/LegalActRefs";
import SmnpSonekModal, { type SmnpRecordType } from "./SmnpSonekModal";
import styles from "./SmnpSonek.module.scss";

export default function SmnpSonekPage() {
  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;

  const { data: plans, isLoading: plansLoading } = useSmnpPlans(orgId);
  const { data: reports, isLoading: reportsLoading } = useSmnpReports(orgId);
  const { data: procurements, isLoading: procLoading } =
    useSmnpProcurements(orgId);

  const [activeTab, setActiveTab] = useState<
    "plans" | "reports" | "procurements"
  >("plans");

  const { mutate: deletePlan } = useDeleteSmnpPlan();
  const { mutate: deleteReport } = useDeleteSmnpReport();
  const { mutate: deleteProcurement } = useDeleteSmnpProcurement();

  const handleDelete = (type: string, id: string | number) => {
    if (!confirm("Удалить запись?")) return;
    const safeId = id as string | number;
    if (type === "plan") deletePlan(safeId);
    else if (type === "report") deleteReport(safeId);
    else if (type === "procurement") deleteProcurement(safeId);
  };

  // ─── Состояние модалки ─────────────────────────────────────────────────────
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: SmnpRecordType;
    editing?: SmnpSonekRecord;
  }>({ open: false, type: "plan" });

  const openCreateModal = (type: SmnpRecordType) =>
    setModalState({ open: true, type });

  const openEditModal = (type: SmnpRecordType, record: SmnpSonekRecord) =>
    setModalState({ open: true, type, editing: record });

  const closeModal = () => setModalState((s) => ({ ...s, open: false }));

  const tabs = [
    { id: "plans" as const, label: "Планы" },
    { id: "reports" as const, label: "Отчёты" },
    { id: "procurements" as const, label: "Закупки СМП/СОНКО" },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Отчёты СМП/СОНКО (ч. 1 ст. 30 ФЗ-44)</h2>
      <LegalActRefs component="SmnpSonekPage" />

      {/* Табы */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Информация о минимальной доле */}
      <div className={styles.infoBox}>
        <strong>Минимальная доля СМП:</strong> {MINIMUM_SMNP_SHARE}% (ч. 1 ст.
        30 ФЗ-44). Не путать с 5% — это минимальный процент привлечения
        субподрядчиков из числа СМП внутри одного контракта (п. 1 типовых
        условий, ПП РФ от 23.12.2016 N 1466)
      </div>

      {/* ===== ПЛАНЫ ===== */}
      {activeTab === "plans" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Планы закупок у СМП/СОНКО</h3>
            <button
              className={styles.btnPrimary}
              onClick={() => openCreateModal("plan")}
            >
              + Новый план
            </button>
          </div>

          {plansLoading ? (
            <div className={styles.loader}>Загрузка...</div>
          ) : !plans || plans.length === 0 ? (
            <div className={styles.empty}>Планов нет</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Год</th>
                  <th>Тип</th>
                  <th>План СМП, руб</th>
                  <th>План СОНКО, руб</th>
                  <th>Всего закупок, руб</th>
                  <th>Плановая доля СМП, %</th>
                  <th>В ЕИС</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p: SmnpSonekPlan) => (
                  <tr key={p.id}>
                    <td>{p.year}</td>
                    <td>
                      {p.type === "annual" ? "Годовой" : `Кв. ${p.quarter}`}
                    </td>
                    <td>{p.plannedSmnpAmount}</td>
                    <td>{p.plannedSonekAmount}</td>
                    <td>{p.totalProcurementAmount}</td>
                    <td>{p.plannedSmnpPercent}</td>
                    <td>{p.publishedInEis ? "Да" : "Нет"}</td>
                    <td className={styles.actions}>
                      <button
                        className={styles.btnSmall}
                        onClick={() => openEditModal("plan", p)}
                      >
                        Ред
                      </button>
                      <button
                        className={styles.btnDanger}
                        onClick={() => handleDelete("plan", p.id ?? "")}
                      >
                        Удал
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== ОТЧЁТЫ ===== */}
      {activeTab === "reports" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Отчёты о закупках у СМП/СОНКО</h3>
            <button
              className={styles.btnPrimary}
              onClick={() => openCreateModal("report")}
            >
              + Новый отчёт
            </button>
          </div>

          {reportsLoading ? (
            <div className={styles.loader}>Загрузка...</div>
          ) : !reports || reports.length === 0 ? (
            <div className={styles.empty}>Отчётов нет</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Год</th>
                  <th>Тип</th>
                  <th>Факт СМП, руб</th>
                  <th>Факт СОНКО, руб</th>
                  <th>Всего закупок, руб</th>
                  <th>Фактическая доля СМП, %</th>
                  <th>Выполнено</th>
                  <th>В ЕИС</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r: SmnpSonekReport) => {
                  const share = smnpShare(
                    r.actualSmnpAmount ?? 0,
                    r.totalProcurementAmount ?? 0,
                  );
                  const check = checkSmnpPlan(0, share);
                  const statusColors: Record<string, string> = {
                    draft: "var(--state-warning)",
                    review: "var(--accent)",
                    published: "var(--state-success)",
                    archived: "var(--text-secondary)",
                  };
                  return (
                    <tr key={r.id}>
                      <td>{r.year}</td>
                      <td>
                        {r.type === "annual" ? "Годовой" : `Кв. ${r.quarter}`}
                      </td>
                      <td>{r.actualSmnpAmount}</td>
                      <td>{r.actualSonekAmount}</td>
                      <td>{r.totalProcurementAmount}</td>
                      <td
                        className={
                          check.compliant
                            ? styles.cellSuccess
                            : styles.cellDanger
                        }
                      >
                        {share}%
                      </td>
                      <td
                        className={
                          check.compliant
                            ? styles.cellSuccess
                            : styles.cellDanger
                        }
                      >
                        {check.compliant ? "✓" : "✗"}
                      </td>
                      <td>{r.publishedInEis ? "Да" : "Нет"}</td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ color: statusColors[r.status] }}
                        >
                          {r.status === "draft"
                            ? "Черновик"
                            : r.status === "review"
                              ? "На проверке"
                              : r.status === "published"
                                ? "Опубликован"
                                : "Архив"}
                        </span>
                      </td>
                      <td className={styles.actions}>
                        <button
                          className={styles.btnSmall}
                          onClick={() => openEditModal("report", r)}
                        >
                          Ред
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDelete("report", r.id ?? "")}
                        >
                          Удал
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== ЗАКУПКИ СМП/СОНКО ===== */}
      {activeTab === "procurements" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Закупки у СМП/СОНКО</h3>
            <button
              className={styles.btnPrimary}
              onClick={() => openCreateModal("procurement")}
            >
              + Добавить закупку
            </button>
          </div>

          {procLoading ? (
            <div className={styles.loader}>Загрузка...</div>
          ) : !procurements || procurements.length === 0 ? (
            <div className={styles.empty}>Закупок нет</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ИКЗ</th>
                  <th>Наименование</th>
                  <th>Тип</th>
                  <th>Способ</th>
                  <th>НМЦК, руб</th>
                  <th>Цена, руб</th>
                  <th>Экономия, руб</th>
                  <th>В ЕИС</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {procurements.map((p: SmnpSonekProcurement) => (
                  <tr key={p.id}>
                    <td className={styles.ikz}>{p.ikz}</td>
                    <td>{p.procurementName}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${p.supplierType === "smnp" ? styles.badgeSmnp : styles.badgeSonek}`}
                      >
                        {p.supplierType === "smnp" ? "СМП" : "СОНКО"}
                      </span>
                    </td>
                    <td>{p.procurementMethod}</td>
                    <td>{p.initialPrice}</td>
                    <td>{p.contractPrice}</td>
                    <td>{p.savingsAmount}</td>
                    <td>{p.publishedInEis ? "Да" : "Нет"}</td>
                    <td className={styles.actions}>
                      <button
                        className={styles.btnSmall}
                        onClick={() => openEditModal("procurement", p)}
                      >
                        Ред
                      </button>
                      <button
                        className={styles.btnDanger}
                        onClick={() => handleDelete("procurement", p.id ?? "")}
                      >
                        Удал
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== Модалка ===== */}
      {modalState.open && (
        <SmnpSonekModal
          organizationId={orgId ?? ""}
          recordType={modalState.type}
          existingRecord={modalState.editing}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
