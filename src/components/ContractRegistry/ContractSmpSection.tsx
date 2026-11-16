import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useContractSmpRecords,
  useCreateContractSmpRecord,
  useUpdateContractSmpRecord,
  useDeleteContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.api";
import {
  ContractSmpRecordSchema,
  emptyContractSmpRecord,
  computeSmpVolume,
  computeSmpPenalty,
  contractSmpDocumentTypeLabels,
  contractSmpStatusLabels,
  type ContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.schema";
import {
  computeSmpDeadlines,
  smpDeadlineStatusLabels,
} from "../../services/ContractSmp/deadlines";
import { useCreatePenalty } from "../../services/ContractRegistry/contractRegistry.api";
import styles from "./ContractRegistry.module.scss";
import useUtils from "../../hooks/useUtils";

/**
 * Секция «Привлечение СМП» в карточке контракта (Tasks 9, п. 7, п/п 7).
 *
 * Показывает:
 * 1) Прогресс-бар требуемого vs фактического объёма привлечения СМП
 * 2) Таблицу дедлайнов — два контура разными цветами (подрядчик / заказчик)
 * 3) Таблицу всех записей с подтверждением достоверности
 * 4) Кнопку создания новой записи и кнопку начисления неустойки
 */

interface SmpSectionProps {
  contractId: string | number;
  contractPrice: string | number | undefined;
  smpRequiredPercent: string | number | undefined;
  subcontractingSmpNoteNumber: string | undefined;
}

export default function SmpSection({
  contractId,
  contractPrice,
  smpRequiredPercent,
  subcontractingSmpNoteNumber,
}: SmpSectionProps) {
  const { bem } = useUtils();
  const block = bem(styles, "smp-section");

  const { data: records = [] } = useContractSmpRecords(contractId);
  const createRecord = useCreateContractSmpRecord();
  const updateRecord = useUpdateContractSmpRecord();
  const deleteRecord = useDeleteContractSmpRecord();
  const createPenalty = useCreatePenalty();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContractSmpRecord | null>(null);

  // Объём: требуемый, факт, прогресс
  const volume = useMemo(
    () => computeSmpVolume(records, contractPrice, smpRequiredPercent),
    [records, contractPrice, smpRequiredPercent],
  );

  // Дедлайны: подрядчик + заказчик
  const deadlines = useMemo(() => computeSmpDeadlines(records), [records]);

  // Максимальная просрочка подрядчика (для неустойки)
  const maxOverdueDays = useMemo(
    () =>
      deadlines.supplier.reduce(
        (max, d) => Math.max(max, d.overdueBusinessDays),
        0,
      ),
    [deadlines.supplier],
  );

  // Авто-неустойка
  const penaltyResult = useMemo(
    () => computeSmpPenalty(volume.shortfall, maxOverdueDays),
    [volume.shortfall, maxOverdueDays],
  );

  // ─── Действия ────────────────────────────────────────────────────────────

  function handleCreate() {
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
  }

  function handleSave(data: ContractSmpRecord) {
    if (editing && editing.id != null) {
      updateRecord.mutate({ id: editing.id, ...data });
    } else {
      createRecord.mutate(data);
    }
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id: string | number) {
    if (!confirm("Удалить запись?")) return;
    deleteRecord.mutate(id);
  }

  function handleStatusChange(
    id: string | number,
    status: ContractSmpRecord["status"],
  ) {
    updateRecord.mutate({ id, status });
  }

  function handleAccruePenalty() {
    if (!penaltyResult || penaltyResult.amount <= 0) return;
    if (!confirm(`Начислить неустойку ${penaltyResult.amount} ₽?`)) return;

    createPenalty.mutate({
      contractId,
      type: "other",
      amount: penaltyResult.penalty.amount,
      status: "accrued",
      detectedDate: new Date().toISOString().slice(0, 10),
      description: penaltyResult.penalty.description,
      reference: penaltyResult.penalty.reference,
    });
  }

  // ─── Подпись прогресс-бара ──────────────────────────────────────────────

  const progressColor =
    volume.progress >= 100
      ? "var(--state-success)"
      : volume.progress >= 50
        ? "var(--state-warning)"
        : "var(--state-danger)";

  return (
    <section className={block()}>
      <h4 className={styles.subTitle}>
        Привлечение СМП/СОНКО (ч. 5 ст. 30 44-ФЗ)
      </h4>

      {/* Ссылка на служебку */}
      {subcontractingSmpNoteNumber && (
        <p className={block("note")}>
          Требование из служебной записки № {subcontractingSmpNoteNumber} по
          позиции плана-графика: {smpRequiredPercent}% от цены контракта
        </p>
      )}

      {/* Прогресс-бар объёма */}
      <div className={block("volume")}>
        <div className={block("volume-header")}>
          <span>Требуемый объём:</span>
          <strong>{volume.required.toLocaleString("ru-RU")} ₽</strong>
        </div>
        <div className={block("volume-header")}>
          <span>Факт (принятые договоры с СМП):</span>
          <strong style={{ color: progressColor }}>
            {volume.actual.toLocaleString("ru-RU")} ₽
          </strong>
        </div>
        <div className={block("progress-bar")}>
          <div
            className={block("progress-fill")}
            style={{
              width: `${Math.min(volume.progress, 100)}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        <div className={block("volume-footer")}>
          {volume.isComplete ? (
            <span style={{ color: "var(--state-success)" }}>
              ✓ Объём привлечённых СМП закрыт полностью
            </span>
          ) : (
            <>
              <span>
                Недобрано:{" "}
                <strong style={{ color: "var(--state-danger)" }}>
                  {volume.shortfall.toLocaleString("ru-RU")} ₽
                </strong>{" "}
                ({volume.progress.toFixed(1)}%)
              </span>
              {penaltyResult && penaltyResult.amount > 0 && (
                <span>
                  {" "}
                  · Неустойка:{" "}
                  <strong style={{ color: "var(--state-danger)" }}>
                    {penaltyResult.amount.toLocaleString("ru-RU")} ₽
                  </strong>{" "}
                  ({maxOverdueDays} раб. дн.)
                </span>
              )}
            </>
          )}
        </div>
        {!volume.isComplete && penaltyResult && (
          <button
            className={block("btnPenalty")}
            onClick={handleAccruePenalty}
            disabled={createPenalty.isPending}
          >
            {createPenalty.isPending ? "Начисление..." : "Начислить неустойку"}
          </button>
        )}
      </div>

      {/* Дедлайны подрядчика и заказчика */}
      {(deadlines.supplier.length > 0 || deadlines.customer.length > 0) && (
        <div className={block("deadlines")}>
          <h5 className={block("deadlinesTitle")}>
            Сроки по типовым условиям (ПП РФ от 23.12.2016 N 1466)
          </h5>

          {/* Контур подрядчика */}
          {deadlines.supplier.length > 0 && (
            <div className={block("deadlinesTable")}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Документ</th>
                    <th>Требование</th>
                    <th>Отсчёт от</th>
                    <th>Срок (раб. дн.)</th>
                    <th>Статус</th>
                    <th>Превышение</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.supplier.map((item) => (
                    <tr
                      key={item.key}
                      className={
                        item.status === "overdue" ? styles.rowDanger : ""
                      }
                    >
                      <td className={styles.reference}>
                        {item.documentLabel}
                        {item.supplierName && (
                          <>
                            <br />
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {item.supplierName}
                            </span>
                          </>
                        )}
                      </td>
                      <td>
                        {item.title}
                        <br />
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item.basis}
                        </span>
                      </td>
                      <td>{item.startDate}</td>
                      <td>
                        {item.dueDate}
                        <br />
                        <span style={{ fontSize: "11px" }}>
                          ({item.workingDays} раб. дн.)
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              item.status === "met"
                                ? "var(--state-success)"
                                : item.status === "overdue"
                                  ? "var(--state-danger)"
                                  : "var(--state-warning)",
                            fontWeight:
                              item.status === "overdue" ? "700" : "400",
                          }}
                        >
                          {smpDeadlineStatusLabels[item.status]}
                        </span>
                      </td>
                      <td>
                        {item.overdueBusinessDays > 0 && (
                          <span
                            style={{
                              color: "var(--state-danger)",
                              fontWeight: "600",
                            }}
                          >
                            {item.overdueBusinessDays} раб. дн.
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span style={{ fontSize: "11px" }}>
                            {item.remainingBusinessDays > 0
                              ? `${item.remainingBusinessDays} дн. осталось`
                              : "сегодня"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Контур заказчика */}
          {deadlines.customer.length > 0 && (
            <div className={block("deadlinesTable")}>
              <h6 className={block("customerDeadlineTitle")}>
                Контур заказчика (ч. 3 ст. 103 44-ФЗ)
              </h6>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Сведения</th>
                    <th>Получены</th>
                    <th>Срок в ЕИС</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.customer.map((item) => (
                    <tr
                      key={item.key}
                      className={
                        item.status === "overdue" ? styles.rowDanger : ""
                      }
                    >
                      <td className={styles.reference}>{item.documentLabel}</td>
                      <td>{item.startDate}</td>
                      <td>{item.dueDate}</td>
                      <td>
                        <span
                          style={{
                            color:
                              item.status === "met"
                                ? "var(--state-success)"
                                : "var(--state-danger)",
                            fontWeight:
                              item.status === "overdue" ? "700" : "400",
                          }}
                        >
                          {item.status === "met"
                            ? "Выгружено в ЕИС"
                            : item.status === "overdue"
                              ? `Просрочка ${item.overdueBusinessDays} раб. дн.`
                              : "Ожидается"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Таблица записей */}
      {records.length > 0 && (
        <div className={block("records")}>
          <h5 className={block("recordsTitle")}>
            Сведения о привлечении ({records.length})
          </h5>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Номер / дата</th>
                <th>Субподрядчик</th>
                <th>Сумма, ₽</th>
                <th>СМП</th>
                <th>Получено</th>
                <th>Статус</th>
                <th>Подтверждения (п. 6 ПП 1466)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{contractSmpDocumentTypeLabels[record.documentType]}</td>
                  <td>
                    № {record.documentNumber} от {record.documentDate}
                  </td>
                  <td>
                    {record.supplierName}
                    {record.supplierInn && (
                      <>
                        <br />
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          ИНН {record.supplierInn}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {record.amount
                      ? Number(record.amount).toLocaleString("ru-RU")
                      : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {record.isSmpSubject ? "✓" : "—"}
                  </td>
                  <td>{record.receivedAt?.slice(0, 10)}</td>
                  <td>
                    <select
                      className={block("statusSelect")}
                      value={record.status}
                      onChange={(event) =>
                        handleStatusChange(
                          record.id!,
                          event.target.value as ContractSmpRecord["status"],
                        )
                      }
                    >
                      {Object.entries(contractSmpStatusLabels).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td style={{ fontSize: "11px" }}>
                    {record.supplierConfirmedAt && (
                      <div>
                        Подрядчик: {record.supplierConfirmedAt.slice(0, 10)}
                        {record.supplierConfirmedBy && (
                          <>
                            <br />
                            <span>{record.supplierConfirmedBy}</span>
                          </>
                        )}
                      </div>
                    )}
                    {record.customerConfirmedAt && (
                      <div>
                        Заказчик: {record.customerConfirmedAt.slice(0, 10)}
                        {record.customerConfirmedBy && (
                          <>
                            <br />
                            <span>{record.customerConfirmedBy}</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.btnSmall}
                      onClick={() => setEditing(record)}
                    >
                      Ред
                    </button>
                    <button
                      className={`${styles.btnSmall} ${styles.btnDanger}`}
                      onClick={() => handleDelete(record.id!)}
                    >
                      Удал
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Кнопка загрузки */}
      <div className={block("actions")}>
        <button className={styles.btnPrimary} onClick={handleCreate}>
          + Загрузить сведения
        </button>
        {records.length > 0 && (
          <span className={block("hint")}>
            Требуемый объём привлечённых СМП:{" "}
            {volume.required.toLocaleString("ru-RU")} ₽{" · "}
            Факт: {volume.actual.toLocaleString("ru-RU")} ₽{" · "}
            Недобрано: {volume.shortfall.toLocaleString("ru-RU")} ₽
          </span>
        )}
      </div>

      {/* Форма создания / редактирования */}
      {showForm && (
        <ContractSmpRecordForm
          contractId={contractId}
          record={editing ?? null}
          onClose={handleCancel}
          onSave={handleSave}
        />
      )}
    </section>
  );
}

// ─── Форма создания / редактирования записи ────────────────────────────────

interface FormProps {
  contractId: string | number;
  record: ContractSmpRecord | null;
  onClose: () => void;
  onSave: (data: ContractSmpRecord) => void;
}

function ContractSmpRecordForm({
  contractId,
  record,
  onClose,
  onSave,
}: FormProps) {
  const { bem } = useUtils();
  const block = bem(styles, "smp-form");
  const isEditing = record !== null;

  const methods = useForm<ContractSmpRecord>({
    resolver: zodResolver(ContractSmpRecordSchema) as any,
    defaultValues: record ?? emptyContractSmpRecord("", contractId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods;

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function onSubmit(data: ContractSmpRecord) {
    onSave(data);
  }

  return (
    <div className={block()} onClick={onClose}>
      <div className={block("window")} onClick={(e) => e.stopPropagation()}>
        <div className={block("head")}>
          <h3 className={block("title")}>
            {isEditing ? "Редактировать сведения" : "Новые сведения о СМП"}
          </h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <div className={block("grid")}>
            {/* Тип */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-doc-type">
                Тип документа
              </label>
              <select
                id="smp-doc-type"
                className={block("select")}
                {...register("documentType")}
              >
                {Object.entries(contractSmpDocumentTypeLabels).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Номер / дата */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-doc-number">
                Номер
              </label>
              <input
                id="smp-doc-number"
                className={block("input")}
                {...register("documentNumber")}
              />
              {errorText("documentNumber") && (
                <span className={block("error")}>
                  {errorText("documentNumber")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-doc-date">
                Дата
              </label>
              <input
                id="smp-doc-date"
                className={block("input")}
                type="date"
                {...register("documentDate")}
              />
              {errorText("documentDate") && (
                <span className={block("error")}>
                  {errorText("documentDate")}
                </span>
              )}
            </div>

            {/* Сумма */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-amount">
                Сумма, ₽
              </label>
              <input
                id="smp-amount"
                className={block("input")}
                {...register("amount")}
                placeholder="0.00"
              />
              {errorText("amount") && (
                <span className={block("error")}>{errorText("amount")}</span>
              )}
            </div>

            {/* Субподрядчик */}
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="smp-supplier">
                Субподрядчик (наименование)
              </label>
              <input
                id="smp-supplier"
                className={block("input")}
                {...register("supplierName")}
                placeholder="ООО «Субподрядчик»"
              />
              {errorText("supplierName") && (
                <span className={block("error")}>
                  {errorText("supplierName")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-inn">
                ИНН
              </label>
              <input
                id="smp-inn"
                className={block("input")}
                {...register("supplierInn")}
                placeholder="10 или 12 цифр"
              />
              {errorText("supplierInn") && (
                <span className={block("error")}>
                  {errorText("supplierInn")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-kpp">
                КПП
              </label>
              <input
                id="smp-kpp"
                className={block("input")}
                {...register("supplierKpp")}
                placeholder="9 цифр"
              />
            </div>

            {/* СМП */}
            <div className={block("field")}>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("isSmpSubject")} />
                Субъект МСП / СОНКО
              </label>
            </div>

            {/* Получено */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-received">
                Получено от подрядчика (дата и время)
              </label>
              <input
                id="smp-received"
                className={block("input")}
                type="datetime-local"
                {...register("receivedAt")}
              />
              {errorText("receivedAt") && (
                <span className={block("error")}>
                  {errorText("receivedAt")}
                </span>
              )}
            </div>

            {/* Дата оплаты субподрядчику */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-paid-date">
                Дата оплаты субподрядчику
              </label>
              <input
                id="smp-paid-date"
                className={block("input")}
                type="date"
                {...register("paidToSupplierDate")}
              />
            </div>

            {/* Подписано подрядчиком */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-acceptance-date">
                Подписано подрядчиком о приёмке
              </label>
              <input
                id="smp-acceptance-date"
                className={block("input")}
                type="date"
                {...register("acceptanceSignedDate")}
              />
            </div>

            {/* Раньше срока контракта */}
            <div className={block("field")}>
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  {...register("paidEarlierThanContractSchedule")}
                />
                Оплата раньше срока по контракту (п. 4б, 10 раб. дн.)
              </label>
            </div>

            {/* Замена субподрядчика */}
            <div className={block("field")}>
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  {...register("isReplacementSubContract")}
                />
                Замена субподрядчика (п. 3, 5 раб. дн. от нового договора)
              </label>
            </div>
          </div>

          {/* Подтверждения достоверности */}
          <fieldset className={block("section")}>
            <legend>Подтверждения достоверности (п. 6 ПП РФ N 1466)</legend>
            <div className={block("grid")}>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="smp-supplier-confirmed"
                >
                  Подрядчик подтвердил (дата)
                </label>
                <input
                  id="smp-supplier-confirmed"
                  className={block("input")}
                  type="datetime-local"
                  {...register("supplierConfirmedAt")}
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-supplier-by">
                  Кем (ФИО подрядчика)
                </label>
                <input
                  id="smp-supplier-by"
                  className={block("input")}
                  {...register("supplierConfirmedBy")}
                  placeholder="Иванов И. И."
                />
              </div>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="smp-customer-confirmed"
                >
                  Заказчик подтвердил (дата)
                </label>
                <input
                  id="smp-customer-confirmed"
                  className={block("input")}
                  type="datetime-local"
                  {...register("customerConfirmedAt")}
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-customer-by">
                  Кем (ФИО заказчика)
                </label>
                <input
                  id="smp-customer-by"
                  className={block("input")}
                  {...register("customerConfirmedBy")}
                  placeholder="Петров П. П."
                />
              </div>
            </div>
          </fieldset>

          <footer className={block("footer")}>
            <div className={block("actions")}>
              <button type="button" onClick={onClose}>
                Отмена
              </button>
              <button type="submit">
                {isEditing ? "Сохранить" : "Создать"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
