import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
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
  contractSmpPriceTypeLabels,
  type ContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.schema";
import {
  computeSmpDeadlines,
  smpDeadlineStatusLabels,
} from "../../services/ContractSmp/deadlines";
import {
  readSourceFileFields,
  formatFileSize,
  SOURCE_FILE_HINT,
  type SourceFileFields,
} from "../../services/ContractSmp/sourceFile";
import {
  useCreatePenalty,
  useUpdateContract,
} from "../../services/ContractRegistry/contractRegistry.api";
import { localIsoDate } from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import {
  contractCardSmpRequirement,
  contractCardSmpRows,
  contractCardSmpTotal,
  type ContractCardSmpSubcontractor,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import {
  describeEisError,
  useCreateEisPackage,
} from "../../services/Eis/eisPackages.api";
import { eisPackageStatusLabels } from "../../services/Eis/eisPackages.schema";
import { isEisContractNumber, isIkz } from "../../services/Eis/eisIdentifiers";
import styles from "./ContractRegistry.module.scss";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import EdsSignModal from "../Eds/EdsSignModal";
import { useLogSignatureEvent } from "../../services/Eds/eds.api";
import type {
  SignatureEventAction,
  SignatureEvent,
} from "../../services/Eds/eds.schema";
import Select from "../UI/Select";

/**
 * Секция «Привлечение СМП» в карточке контракта (Tasks 9, п. 7, п/п 7).
 *
 * Показывает:
 * 1) Прогресс-бар требуемого vs фактического объёма привлечения СМП
 * 2) Таблицу дедлайнов — два контура разными цветами (подрядчик / заказчик)
 * 3) Таблицу всех записей с подтверждением достоверности
 * 4) Кнопку создания новой записи и кнопку начисления неустойки
 */

/**
 * Дата в ГГГГ-ММ-ДД. В карточке ЕИС даты субдоговоров приходят и ISO с
 * временем, и ДД.ММ.ГГГГ: форма хранит только ГГГГ-ММ-ДД, поэтому приводим
 * значение к нему — иначе черновик не пройдёт проверку даты.
 */
const isoDate = (value?: string | null): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : raw.slice(0, 10);
};

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
  const { bem, fullName, formatDate } = useUtils();
  const block = bem(styles, "smp-section");

  const { data: records = [] } = useContractSmpRecords(contractId);
  const createRecord = useCreateContractSmpRecord();
  const updateRecord = useUpdateContractSmpRecord();
  const deleteRecord = useDeleteContractSmpRecord();
  const createPenalty = useCreatePenalty();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContractSmpRecord | null>(null);
  // Черновик из подтаблицы ЕИС: субподрядчик уже опубликован заказчиком в
  // карточке контракта, но записи в нашем реестре СМП нет. Клик по строке
  // открывает форму с подставленными реквизитами — их проверяют, а не
  // перепечатывают из XML
  const [eisDraft, setEisDraft] = useState<ContractSmpRecord | null>(null);
  // Результат постановки в очередь ЕИС: строка под таблицей вместо alert —
  // отказ шлюза надо прочитать, а не закрыть по привычке
  const [eisQueued, setEisQueued] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const createEisPackage = useCreateEisPackage();

  // Требование о привлечении СМП живёт в самом контракте: у контрактов,
  // импортированных из ЕИС, процента и номера служебки нет — их можно задать
  // прямо здесь, не уходя из карточки
  const updateContract = useUpdateContract();
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [percentDraft, setPercentDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [requirementError, setRequirementError] = useState("");

  // Подтаблица «Информация о привлечении СМП, СОНО» из выгрузки карточки ЕИС:
  // сведения лежат в XML контракта, поэтому приходят вместе с проекцией
  const { data: projection } = useContractCardProjection(contractId);
  // Адрес записи в реестре ЕИС: сведения о СМП шлюз привязывает к реестровому
  // номеру контракта и ИКЗ. Без них пакет собирать не из чего — предупреждаем
  // об этом в карточке, а не после отказа шлюза
  const eisContractNumber = projection?.regNumber || projection?.RegNumber || "";
  const eisIkz = projection?.General?.Ikz ?? "";
  const canQueueEis = isEisContractNumber(eisContractNumber) && isIkz(eisIkz);
  const eisSmpRows = useMemo(
    () => contractCardSmpRows(projection?.Smp ?? []),
    [projection],
  );
  const eisRequirement = useMemo(
    () => contractCardSmpRequirement(projection?.Smp ?? []),
    [projection],
  );
  const eisTotal = useMemo(
    () => contractCardSmpTotal(eisSmpRows),
    [eisSmpRows],
  );
  // Ключи уже заведённых записей: ИНН + номер субдоговора. По ним видно, что
  // строка ЕИС не «новая» — второй раз её заводить не нужно
  const registeredEisKeys = useMemo(
    () =>
      new Set(
        records.map(
          (record) => `${record.supplierInn ?? ""}|${record.documentNumber ?? ""}`,
        ),
      ),
    [records],
  );

  // Условие привлечения СМП (процент и ответственность) публикуется в ЕИС у всех
  // контрактов с ч. 5 ст. 30 44-ФЗ, поэтому блок показываем и без субподрядчиков
  const hasEisRequirement =
    eisRequirement.percent !== null ||
    eisRequirement.sum !== null ||
    Boolean(eisRequirement.responsibility);
  const showEisSmp = eisSmpRows.length > 0 || hasEisRequirement;

  // Требование задаётся служебной запиской; если её нет, процент берём из
  // сведений ЕИС — иначе объём не считается, хотя в карточке контракта он есть
  const ownPercent =
    Number(smpRequiredPercent ?? 0) > 0 ? smpRequiredPercent : undefined;
  const effectivePercent = ownPercent ?? eisRequirement.percent ?? undefined;

  // Объём: требуемый, факт, прогресс. Факт берём из ручных записей, а если их
  // нет — из субдоговоров карточки ЕИС, чтобы прогресс не показывал ноль
  const eisActual = eisTotal > 0 ? eisTotal : undefined;
  const usesEisActual = records.length === 0 && eisTotal > 0;
  const volume = useMemo(
    () => computeSmpVolume(records, contractPrice, effectivePercent, eisActual),
    [records, contractPrice, effectivePercent, eisActual],
  );

  // Дедлайны: подрядчик + заказчик
  const deadlines = useMemo(() => computeSmpDeadlines(records), [records]);

  // Процента из служебки нет — объём не считается: при required = 0 формула
  // даёт ложное «объём привлечённых СМП закрыт полностью»
  const hasRequirement = volume.required > 0;

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
    setEisDraft(null);
    setEisQueued(null);
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
    setEisDraft(null);
  }

  function handleSave(data: ContractSmpRecord) {
    if (editing && editing.id != null) {
      updateRecord.mutate({ id: editing.id, ...data });
    } else {
      // Запись, заведённая из строки ЕИС, сразу становится пакетом сведений:
      // реквизиты человек уже подтвердил в форме, второй кнопки «выгрузить»
      // не нужно
      const fromEis = eisDraft !== null;
      createRecord.mutate(data, {
        onSuccess: (created) => {
          if (fromEis) queueEisPackage(created);
        },
      });
    }
    setShowForm(false);
    setEditing(null);
    setEisDraft(null);
  }

  /**
   * Черновик записи из строки ЕИС.
   *
   * Реквизиты субдоговора переносим один к одному: номер, дата, сумма, ОКПД2,
   * предмет и субподрядчик. Признак субъекта МСП берём из кода статуса ЕИС
   * (30 — СМП, 40 — СОНО), а не «по умолчанию»: от него зависит, закроет ли
   * договор требуемый объём привлечения.
   */
  function openEisDraft(row: ContractCardSmpSubcontractor) {
    const draft = emptyContractSmpRecord("", contractId);
    draft.documentType = "subContract";
    draft.documentNumber = row.ContractNumber ?? "";
    draft.documentDate = isoDate(row.ContractDate) || draft.documentDate;
    draft.amount = row.ContractSum !== null ? String(row.ContractSum) : "";
    draft.okpd2Code = row.Okpd2Code ?? "";
    draft.subject = row.ContractSubject ?? "";
    draft.supplierName = row.Name ?? "";
    draft.supplierInn = row.Inn ?? "";
    draft.supplierKpp = row.Kpp ?? "";
    draft.isSmpSubject = row.StatusCode === "30" || row.StatusCode === "40";
    draft.comment =
      "Реквизиты подставлены из карточки ЕИС. Проверьте состав сведений перед выгрузкой в ЕИС.";
    setEisDraft(draft);
    setEditing(null);
    setShowForm(false);
    setEisQueued(null);
  }

  /**
   * Постановка сведений в очередь ЕИС — пакет `SmpAttraction` со ссылкой на
   * запись реестра СМП (`SmpReport`). XML собирает шлюз: фронт передаёт только
   * адрес записи, так же как для актов приёмки и расторжений.
   */
  function queueEisPackage(record: ContractSmpRecord) {
    if (record.id == null) return;

    if (!canQueueEis) {
      setEisQueued({
        ok: false,
        text: "Запись сохранена, но пакет в ЕИС не создан: в карточке нет реестрового номера контракта и ИКЗ из 36 разрядов. Их присваивает портал — без них шлюз не поймёт, к какой записи реестра относятся сведения.",
      });
      return;
    }

    createEisPackage.mutate(
      {
        documentType: "SmpAttraction",
        contractEisNumber: eisContractNumber,
        ikz: eisIkz,
        source: {
          documentKind: "SmpReport",
          documentId: String(record.id),
          documentNumber: record.documentNumber || undefined,
        },
      },
      {
        onSuccess: (pkg) =>
          setEisQueued({
            ok: true,
            text: `Пакет «Привлечение СМП» создан: ${eisPackageStatusLabels[pkg.status]}. Подпишите и отправьте его в разделе «Пакеты сведений» — до отправки сведения в ЕИС не считаются опубликованными.`,
          }),
        onError: (error) =>
          setEisQueued({ ok: false, text: describeEisError(error) }),
      },
    );
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
      detectedDate: localIsoDate(),
      description: penaltyResult.penalty.description,
      reference: penaltyResult.penalty.reference,
    });
  }

  // ─── Требование о привлечении СМП (процент и основание) ──────────────────

  function openRequirement() {
    setPercentDraft(String(smpRequiredPercent ?? ""));
    setNoteDraft(subcontractingSmpNoteNumber ?? "");
    setRequirementError("");
    setRequirementOpen(true);
  }

  function saveRequirement() {
    if (!contractId) return;

    const percent = percentDraft.trim().replace(",", ".");
    const percentValid =
      percent === "" ||
      (/^\d{1,3}(\.\d{1,2})?$/.test(percent) &&
        Number(percent) >= 0 &&
        Number(percent) <= 100);
    if (!percentValid) {
      setRequirementError("Процент от 0 до 100");
      return;
    }

    updateContract.mutate(
      {
        id: contractId,
        smpRequiredPercent: percent,
        subcontractingSmpNoteNumber: noteDraft.trim(),
      },
      { onSuccess: () => setRequirementOpen(false) },
    );
  }

  // ─── Подтверждение достоверности (п. 6 ПП РФ N 1466) ──────────────────────

  const { employee, myRole } = useMyContractRole();
  const logSignature = useLogSignatureEvent();

  const signerLabel = useMemo(() => {
    const human = employee?.employee;
    if (!human) return "";
    // Подпись вида «Фамилия И. О., должность» — как в бумажных подтверждениях
    const shortName = fullName(human)
      .split(" ")
      .filter(Boolean)
      .map((word, index) => (index === 0 ? word : `${word[0]}.`))
      .join(" ");
    return [shortName, myRole?.role ?? ""].filter(Boolean).join(", ");
  }, [employee, myRole, fullName]);

  const nowLocalDateTime = () => {
    const d = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Какое действие подписываем: модалка ЭП открывается поверх таблицы
  const [signing, setSigning] = useState<{
    record: ContractSmpRecord;
    action: SignatureEventAction;
  } | null>(null);

  // Подписываем не молча: сначала журнал (кто, когда, каким сертификатом),
  // потом уже правка записи. Отказ по чужому ИНН остаётся в журнале —
  // ровно то, что спрашивает проверка
  function handleSigned(event: SignatureEvent) {
    if (!signing) return;
    const { record, action } = signing;

    logSignature.mutate(event);

    const stamp = [
      "ЭП",
      event.certificateOwner,
      event.certificateSerial
        ? `срез ${event.certificateSerial.slice(0, 8)}…`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (action === "smp_supplier_confirm") {
      updateRecord.mutate({
        id: record.id!,
        supplierConfirmedAt: nowLocalDateTime(),
        supplierConfirmedBy: signerLabel,
        supplierConfirmedDocument: stamp,
      });
    } else {
      updateRecord.mutate({
        id: record.id!,
        customerConfirmedAt: nowLocalDateTime(),
        customerConfirmedBy: signerLabel,
        customerConfirmedDocument: stamp,
        status: record.status === "submitted" ? "accepted" : record.status,
      });
    }

    setSigning(null);
  }

  function handleSupplierConfirm(record: ContractSmpRecord) {
    if (record.supplierConfirmedAt) return;
    setSigning({ record, action: "smp_supplier_confirm" });
  }

  function handleCustomerConfirm(record: ContractSmpRecord) {
    if (record.customerConfirmedAt) return;
    setSigning({ record, action: "smp_customer_confirm" });
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

      {/* Требование: процент из служебки и её номер. У контрактов из ЕИС этих
          данных нет — их можно задать здесь, остальное считается само */}
      {requirementOpen ? (
        <form
          className={block("requirement")}
          onSubmit={(event) => {
            event.preventDefault();
            saveRequirement();
          }}
        >
          <div className={block("requirementField")}>
            <label
              className={block("requirementLabel")}
              htmlFor="smp-required-percent"
            >
              Требуемый объём, % от цены контракта
            </label>
            <input
              id="smp-required-percent"
              className={block("requirementInput")}
              value={percentDraft}
              onChange={(event) => setPercentDraft(event.target.value)}
              placeholder="10"
              inputMode="decimal"
            />
          </div>

          <div className={block("requirementField")}>
            <label
              className={block("requirementLabel")}
              htmlFor="smp-note-number"
            >
              Номер служебной записки (основание)
            </label>
            <input
              id="smp-note-number"
              className={block("requirementInput")}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="например 12"
            />
          </div>

          {requirementError && (
            <span className={block("requirementError")}>{requirementError}</span>
          )}

          <div className={block("requirementActions")}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={updateContract.isPending}
            >
              {updateContract.isPending ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              className={styles.btnSmall}
              onClick={() => setRequirementOpen(false)}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <p className={block("note")}>
          <span>
            {hasRequirement
              ? `Требуемый объём: ${effectivePercent}% от цены контракта${
                  ownPercent ? "" : " (по сведениям ЕИС)"
                }`
              : "Требование о привлечении СМП не задано — объём не рассчитывается"}
            {subcontractingSmpNoteNumber &&
              ` · служебная записка № ${subcontractingSmpNoteNumber}`}
          </span>
          <button
            type="button"
            className={block("requirementBtn")}
            onClick={openRequirement}
          >
            {ownPercent || subcontractingSmpNoteNumber
              ? "Изменить требование"
              : "Указать требование"}
          </button>
        </p>
      )}

      {/* Прогресс-бар объёма */}
      <div className={block("volume")}>
        <div className={block("volume-header")}>
          <span>Требуемый объём:</span>
          <strong>
            {hasRequirement
              ? `${volume.required.toLocaleString("ru-RU")} ₽`
              : "не задан"}
          </strong>
        </div>
        <div className={block("volume-header")}>
          <span>
            {usesEisActual
              ? "Факт (субдоговоры из карточки ЕИС):"
              : "Факт (принятые договоры с СМП):"}
          </span>
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
          {!hasRequirement ? (
            <span>
              Процент не задан — объём не рассчитывается. Укажите его в блоке
              требования выше: прогресс-бар, недобор и неустойка появятся
              автоматически.
            </span>
          ) : volume.isComplete ? (
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

      {/* Подтаблица контракта из выгрузки ЕИС: сведения о субподряде лежат
          в XML контракта, поэтому появляются у каждого выгруженного контракта,
          а не только там, где заводили записи вручную */}
      {showEisSmp && (
        <div className={block("records")}>
          <h5 className={block("recordsTitle")}>
            {eisSmpRows.length > 0
              ? `По сведениям карточки ЕИС (${eisSmpRows.length})`
              : "Условие привлечения СМП по данным ЕИС"}
          </h5>
          <p className={block("hint")}>
            {eisRequirement.percent !== null &&
              `Требуемый объём по сведениям ЕИС: ${eisRequirement.percent}%`}
            {eisRequirement.sum !== null &&
              ` (${eisRequirement.sum.toLocaleString("ru-RU")} ₽)`}
            {hasEisRequirement ? " · " : ""}
            {eisSmpRows.length > 0
              ? `Факт по субдоговорам: ${eisTotal.toLocaleString("ru-RU")} ₽`
              : "Сведения о привлечённых субподрядчиках заказчик в ЕИС ещё не опубликовал"}
          </p>
          {eisRequirement.responsibility && (
            <p className={block("hint")}>{eisRequirement.responsibility}</p>
          )}
          {eisSmpRows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Субподрядчик</th>
                  <th>Статус</th>
                  <th>Субдоговор</th>
                  <th>Сумма, ₽</th>
                  <th>ОКПД2</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eisSmpRows.map((row) => (
                  <tr
                    key={`${row.Inn}|${row.ContractNumber ?? ""}`}
                    className={block("eis-row")}
                    onClick={() => openEisDraft(row)}
                    title="Завести сведения о привлечении по этому субподрядчику: реквизиты подставятся в форму"
                  >
                    <td>
                      {row.Name ?? "—"}
                      <br />
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ИНН {row.Inn}
                        {row.Kpp ? ` / КПП ${row.Kpp}` : ""}
                      </span>
                    </td>
                    <td>
                      {row.StatusCode === "30"
                        ? "СМП"
                        : row.StatusCode === "40"
                          ? "СОНО"
                          : (row.StatusName ?? "—")}
                    </td>
                    <td>
                      {row.ContractNumber ? `№ ${row.ContractNumber}` : "—"}
                      {row.ContractDate
                        ? ` от ${formatDate(row.ContractDate)}`
                        : ""}
                      {row.ContractSubject && (
                        <>
                          <br />
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {row.ContractSubject}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {row.ContractSum !== null
                        ? row.ContractSum.toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td>{row.Okpd2Code ?? "—"}</td>
                    <td>
                      {registeredEisKeys.has(
                        `${row.Inn ?? ""}|${row.ContractNumber ?? ""}`,
                      ) ? (
                        <span className={block("hint")}>заведено</span>
                      ) : (
                        <button
                          className={styles.btnSmall}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEisDraft(row);
                          }}
                          title="Открыть форму с реквизитами из карточки ЕИС: после сохранения сведения встанут в очередь на отправку в ЕИС"
                        >
                          Завести
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Таблица записей: пустое состояние объясняет, откуда берутся сведения */}
      {records.length === 0 && !showEisSmp && (
        <p className={block("empty")}>
          {projection
            ? "В выгруженном XML контракта сведений о привлечении СМП нет: субподрядчиков не привлекали либо сведения не опубликованы в ЕИС. Записи можно завести вручную — объём, сроки и неустойка посчитаются сами."
            : "Карточка ЕИС по этому контракту ещё не выгружена, поэтому подтаблицы СМП нет. Её наполнит ближайшая выгрузка воркера; пока сведения можно завести вручную."}
        </p>
      )}

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
                    <Select
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
                    </Select>
                  </td>
                  <td className={block("confirm-cell")}>
                    <div className={block("confirm-row")}>
                      {record.supplierConfirmedAt ? (
                        <span className={block("confirm-done")}>
                          Подрядчик: {record.supplierConfirmedAt.slice(0, 10)}
                          {record.supplierConfirmedBy && (
                            <>
                              <br />
                              <span>{record.supplierConfirmedBy}</span>
                            </>
                          )}
                          {record.supplierConfirmedDocument && (
                            <>
                              <br />
                              <span className={block("confirm-doc")}>
                                {record.supplierConfirmedDocument}
                              </span>
                            </>
                          )}
                        </span>
                      ) : (
                        <button
                          className={styles.btnSmall}
                          onClick={() => handleSupplierConfirm(record)}
                          disabled={updateRecord.isPending}
                          title="Действие подрядчика «подтверждаю достоверность» (п. 6 ПП РФ N 1466). В демо его выполняет заказчик — вход подрядчика по ссылке отложен (Tasks 9, п. 2, п/п 3)"
                        >
                          Подтвердить достоверность
                        </button>
                      )}
                    </div>
                    <div className={block("confirm-row")}>
                      {record.customerConfirmedAt ? (
                        <span className={block("confirm-done")}>
                          Заказчик: {record.customerConfirmedAt.slice(0, 10)}
                          {record.customerConfirmedBy && (
                            <>
                              <br />
                              <span>{record.customerConfirmedBy}</span>
                            </>
                          )}
                          {record.customerConfirmedDocument && (
                            <>
                              <br />
                              <span className={block("confirm-doc")}>
                                {record.customerConfirmedDocument}
                              </span>
                            </>
                          )}
                        </span>
                      ) : (
                        <button
                          className={styles.btnSmall}
                          onClick={() => handleCustomerConfirm(record)}
                          disabled={
                            updateRecord.isPending ||
                            record.status !== "submitted"
                          }
                          title="Действие заказчика «подтверждаю достоверность принятых сведений» (п. 6 ПП РФ N 1466). Доступно по присланным подрядчиком сведениям"
                        >
                          Принять и подтвердить
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className={styles.btnSmall}
                      onClick={() => {
                        setEisDraft(null);
                        setEditing(record);
                      }}
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

      {/* Итог постановки в очередь ЕИС: отказ шлюза надо прочитать, поэтому
          строка под таблицей, а не модальное окно */}
      {eisQueued && (
        <p
          className={block("hint")}
          style={{ color: eisQueued.ok ? "var(--state-success)" : "var(--state-danger)" }}
        >
          {eisQueued.text}{" "}
          {eisQueued.ok && (
            <Link
              className={styles.projectionLink}
              to={`/eis/packages?contractId=${String(contractId)}&documentType=SmpAttraction`}
            >
              Открыть пакеты СМП
            </Link>
          )}
        </p>
      )}

      {/* Форма создания / редактирования. Черновик из строки ЕИС открывается
          тем же окном: это создание записи, а не правка существующей.
          Условие включает `editing`, иначе кнопка «Ред» только заполняла бы
          состояние, а окно не открывалось */}
      {(showForm || eisDraft || editing !== null) && (
        <ContractSmpRecordForm
          contractId={contractId}
          record={editing ?? null}
          draft={eisDraft}
          onClose={handleCancel}
          onSave={handleSave}
        />
      )}

      {/* Модалка подписания ЭП (Tasks 9, п. 1) */}
      {signing && (
        <EdsSignModal
          action={signing.action}
          documentLabel={`${contractSmpDocumentTypeLabels[signing.record.documentType]} № ${signing.record.documentNumber} от ${signing.record.documentDate} · ${signing.record.supplierName}`}
          entityType="contractSmpRecord"
          entityId={signing.record.id!}
          onClose={() => setSigning(null)}
          onSigned={handleSigned}
        />
      )}
    </section>
  );
}

// ─── Форма создания / редактирования записи ────────────────────────────────

interface FormProps {
  contractId: string | number;
  record: ContractSmpRecord | null;
  /**
   * Черновик из строки ЕИС: реквизиты уже подставлены, но записи в реестре
   * СМП ещё нет. От `record` отличается тем, что сохранение создаёт запись, а
   * не правит существующую.
   */
  draft?: ContractSmpRecord | null;
  onClose: () => void;
  onSave: (data: ContractSmpRecord) => void;
}

function ContractSmpRecordForm({
  contractId,
  record,
  draft = null,
  onClose,
  onSave,
}: FormProps) {
  const { bem } = useUtils();
  const block = bem(styles, "smp-form");
  const isEditing = record !== null;

  const methods = useForm<ContractSmpRecord>({
    resolver: zodResolver(ContractSmpRecordSchema) as any,
    defaultValues: record ?? draft ?? emptyContractSmpRecord("", contractId),
  });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  const priceType = useWatch({ control: methods.control, name: "priceType" });

  // Файл-основание: в базе остаётся только его имя, содержимое не читается
  const [sourceFile, setSourceFile] = useState<SourceFileFields | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Записи, приложенные к этому договору: акт и платёжка привязываются к нему
  const existingSourceName = record?.sourceFileName ?? "";

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fields = readSourceFileFields(file);
    setSourceFile(fields);
    setValue("sourceFileName", fields.fileName, { shouldDirty: true });

    // Подставляем только в пустые поля: то, что уже введено вручную, не трём —
    // извлечённое остаётся подсказкой, которую человек подтверждает сам
    if (fields.documentNumber && !getValues("documentNumber")) {
      setValue("documentNumber", fields.documentNumber, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    if (fields.documentDate && !getValues("documentDate")) {
      setValue("documentDate", fields.documentDate, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function clearSourceFile() {
    setSourceFile(null);
    setValue("sourceFileName", "", { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(data: ContractSmpRecord) {
    onSave(data);
  }

  return (
    <div className={block()} onClick={onClose}>
      <div className={block("window")} onClick={(e) => e.stopPropagation()}>
        <div className={block("head")}>
          <h3 className={block("title")}>
            {isEditing
              ? "Редактировать сведения"
              : draft
                ? "Сведения из карточки ЕИС"
                : "Новые сведения о СМП"}
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
              <Select
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
              </Select>
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

            {/* Сумма и реквизиты цены для реестра ЕИС */}
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
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-okpd2">
                ОКПД2 предмета договора
              </label>
              <input
                id="smp-okpd2"
                className={block("input")}
                {...register("okpd2Code")}
                placeholder="43.31.10"
              />
              {errorText("okpd2Code") && (
                <span className={block("error")}>{errorText("okpd2Code")}</span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-price-type">
                Вид цены контракта
              </label>
              <Select
                id="smp-price-type"
                className={block("select")}
                {...register("priceType")}
              >
                {Object.entries(contractSmpPriceTypeLabels).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>
            {priceType === "unit" && (
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-unit-price">
                  Цена за единицу, ₽
                </label>
                <input
                  id="smp-unit-price"
                  className={block("input")}
                  {...register("unitPrice")}
                  placeholder="0.00"
                />
                {errorText("unitPrice") && (
                  <span className={block("error")}>
                    {errorText("unitPrice")}
                  </span>
                )}
              </div>
            )}

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
          </div>

          {/* Файл-основание: имя читаем, содержимое остаётся у пользователя */}
          <fieldset className={block("section")}>
            <legend>Файл-основание</legend>
            <div className={block("fileRow")}>
              <input
                ref={fileInputRef}
                type="file"
                id="smp-source-file"
                className={block("fileInput")}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
              />
              {(sourceFile || existingSourceName) && (
                <button
                  type="button"
                  className={block("fileClear")}
                  onClick={clearSourceFile}
                >
                  Очистить
                </button>
              )}
            </div>

            {(sourceFile || existingSourceName) && (
              <div className={block("fileInfo")}>
                <span className={block("fileName")}>
                  {sourceFile?.fileName ?? existingSourceName}
                </span>
                {sourceFile && sourceFile.size > 0 && (
                  <span className={block("fileSize")}>
                    {formatFileSize(sourceFile.size)}
                  </span>
                )}
              </div>
            )}

            {sourceFile && sourceFile.matched.length > 0 && (
              <div className={block("fileExtracted")}>
                Из имени файла прочитано:{" "}
                {sourceFile.matched
                  .map((field) =>
                    field === "documentNumber" ? "номер" : "дата",
                  )
                  .join(", ")}
                . Проверьте поля выше — распознавание содержимого документа ещё
                не подключено.
              </div>
            )}

            {sourceFile && sourceFile.matched.length === 0 && (
              <div className={block("fileEmpty")}>
                Номер и дата в имени файла не найдены — внесите их вручную.
              </div>
            )}

            <p className={block("fileHint")}>{SOURCE_FILE_HINT}</p>

            <div className={block("grid")}>
              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="smp-subject">
                  Предмет документа
                </label>
                <input
                  id="smp-subject"
                  className={block("input")}
                  {...register("subject")}
                  placeholder="Выполнение работ по благоустройству…"
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-period">
                  Период
                </label>
                <input
                  id="smp-period"
                  className={block("input")}
                  {...register("period")}
                  placeholder="2026-03 или I квартал 2026"
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-source-name">
                  Имя файла (сохраняется в базе)
                </label>
                <input
                  id="smp-source-name"
                  className={block("input")}
                  {...register("sourceFileName")}
                  readOnly
                  placeholder="Файл не выбран"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Реквизиты исполнения</legend>
            <div className={block("grid")}>
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
          </fieldset>

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
                <label className={block("label")} htmlFor="smp-supplier-doc">
                  Документ подтверждения подрядчика
                </label>
                <input
                  id="smp-supplier-doc"
                  className={block("input")}
                  placeholder="Подтверждение достоверности сведений № 1 от 12.11.2026"
                  {...register("supplierConfirmedDocument")}
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
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-customer-doc">
                  Документ принятия заказчика
                </label>
                <input
                  id="smp-customer-doc"
                  className={block("input")}
                  placeholder="Принятие сведений № 1 от 12.11.2026"
                  {...register("customerConfirmedDocument")}
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
                {isEditing
                  ? "Сохранить"
                  : draft
                    ? "Создать и отправить в ЕИС"
                    : "Создать"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
