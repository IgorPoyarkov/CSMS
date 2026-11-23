import { useMemo, useState, type FormEvent } from "react";
import {
  useContractEvents,
  useContractStages,
  useCreateContractEvent,
  useDeleteContractEvent,
  useUpdateContractEvent,
} from "../../services/ContractRegistry/contractRegistry.api";
import {
  CONTRACT_EVENT_CHECKPOINTS,
  contractEventCheckpointLabels,
  nextContractEvent,
  sortContractEvents,
  type ContractEvent,
  type ContractEventCheckpoint,
  type ContractRegistryItem,
  type ContractStage,
} from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import {
  contractCardActDecision,
  contractCardActPaidTotal,
  contractCardActTotal,
  type ContractCardAct,
  type ContractCardDecision,
  type ContractCardPayment,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import styles from "./ContractRegistry.module.scss";
import Select from "../UI/Select";

/**
 * Чекпоинты исполнения контракта (Tasks 8 п. 2 б).
 *
 * Чекпоинт — это факт хозяйственной жизни, а не наша выдумка: контракт
 * подписан, документ о приёмке подписан, оплата прошла. Логика та же, что у
 * этапов исполнения, только этапов может и не быть: тогда чекпоинты относятся
 * к контракту целиком и называются чекпоинтами контракта, а не этапа.
 *
 * Факты приёмки и оплаты приходят из выгрузки карточки ЕИС (акты и платёжные
 * поручения) и привязываются к этапу по sid из акта. Ручная отметка нужна
 * только там, где ЕИС ничего не публикует, — она дополняет факты, а не
 * подменяет их.
 */

interface ContractEventsSectionProps {
  contractId: string | number;
  /** Дата заключения: подписание — первый чекпоинт контракта. */
  contract?: ContractRegistryItem;
}

/** Оплата и решение по одному акту приёмки. */
interface StageActFact {
  act: ContractCardAct;
  total: number | null;
  paid: number;
  accepted: boolean;
}

/** Чекпоинты одного этапа: приёмка и оплата из выгрузки ЕИС. */
interface StageCheckpoints {
  key: string;
  name: string;
  period: string;
  stageSid: string | null;
  acts: StageActFact[];
  acceptedTotal: number;
  paidTotal: number;
}

const today = (): string => new Date().toISOString().slice(0, 10);

/** ISO → ДД.ММ.ГГГГ: в таблице чекпоинтов даты как в карточке. */
const isoToDisplay = (value?: string | null): string => {
  const raw = (value ?? "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
};

/** Акты, привязанные к этапу по sid; без sid — к контракту целиком. */
const actsForStage = (
  acts: ContractCardAct[],
  payments: ContractCardPayment[],
  decisions: ContractCardDecision[],
  stageSid: string | null,
): StageActFact[] =>
  acts
    .filter((act) => {
      const actStage = act.Stage?.TechnicalSid ?? act.Stage?.Sid ?? null;
      return stageSid === null ? true : actStage === stageSid;
    })
    .map((act) => ({
      act,
      total: contractCardActTotal(act),
      paid: contractCardActPaidTotal(act, payments),
      accepted: Boolean(contractCardActDecision(act, decisions)),
    }));

/**
 * Чекпоинты по этапам: у этапа свои акты и оплаты. Если этапов в ЕИС нет —
 * один набор чекпоинтов на контракт целиком (и это факт, а не заглушка).
 */
const buildStageCheckpoints = (
  stages: ContractStage[],
  acts: ContractCardAct[],
  payments: ContractCardPayment[],
  decisions: ContractCardDecision[],
): StageCheckpoints[] => {
  if (stages.length === 0) {
    const facts = actsForStage(acts, payments, decisions, null);
    return [
      {
        key: "contract",
        name: "Контракт целиком",
        period: "",
        stageSid: null,
        acts: facts,
        acceptedTotal: facts.reduce((sum, item) => sum + (item.total ?? 0), 0),
        paidTotal: facts.reduce((sum, item) => sum + item.paid, 0),
      },
    ];
  }

  const result = stages.map((stage) => {
    const stageSid = stage.sid || null;
    const facts = actsForStage(acts, payments, decisions, stageSid);
    const start = isoToDisplay(stage.startDate);
    const end = isoToDisplay(stage.endDate);
    return {
      key: stageSid ?? `stage-${stage.stageNumber}`,
      name: stage.name,
      period: start || end ? `${start || "…"} — ${end || "…"}` : "",
      stageSid,
      acts: facts,
      acceptedTotal: facts.reduce((sum, item) => sum + (item.total ?? 0), 0),
      paidTotal: facts.reduce((sum, item) => sum + item.paid, 0),
    };
  });

  // Акты без sid этапа не должны исчезнуть из карточки: показываем их
  // отдельной строкой «Вне этапов» — это те же факты, просто без привязки
  const outside = actsForStage(
    acts.filter(
      (act) => !(act.Stage?.TechnicalSid ?? act.Stage?.Sid),
    ),
    payments,
    decisions,
    null,
  );
  if (outside.length > 0) {
    result.push({
      key: "outside",
      name: "Вне этапов",
      period: "",
      stageSid: null,
      acts: outside,
      acceptedTotal: outside.reduce((sum, item) => sum + (item.total ?? 0), 0),
      paidTotal: outside.reduce((sum, item) => sum + item.paid, 0),
    });
  }

  return result;
};

/** Статус чекпоинта этапа по фактам ЕИС: приёмка и оплата. */
const checkpointStatus = (
  fact: StageCheckpoints,
): { label: string; tone: "done" | "waiting" | "partial" } => {
  if (fact.acts.length === 0) return { label: "ожидает приёмки", tone: "waiting" };
  if (fact.acceptedTotal > 0 && fact.paidTotal >= fact.acceptedTotal) {
    return { label: "оплачено", tone: "done" };
  }
  if (fact.paidTotal > 0) return { label: "частично оплачено", tone: "partial" };
  return { label: "принято, не оплачено", tone: "partial" };
};

export default function ContractEventsSection({
  contractId,
  contract,
}: ContractEventsSectionProps) {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "events");

  const { data: events = [], isLoading } = useContractEvents(contractId);
  const { data: stages = [] } = useContractStages(contractId);
  const { data: projection } = useContractCardProjection(contractId);
  const createEvent = useCreateContractEvent();
  const updateEvent = useUpdateContractEvent();
  const deleteEvent = useDeleteContractEvent();
  const saving = createEvent.isPending || updateEvent.isPending;

  // Снимок ФИО того, кто отмечает чекпоинт: запись должна читаться и после
  // изменения штатного расписания
  const { employee } = useMyContractRole();
  const human = employee?.employee;
  const employeeName = human ? fullName(human) : "";

  const ordered = useMemo(() => sortContractEvents(events), [events]);
  const nextCheckpoint = useMemo(() => nextContractEvent(events), [events]);

  // Факты по этапам: акты приёмки и оплаты из выгрузки ЕИС. Пустой список
  // этапов — это один набор чекпоинтов на контракт целиком, а не «нет данных»
  const stageCheckpoints = useMemo(
    () =>
      buildStageCheckpoints(
        stages,
        projection?.Acts ?? [],
        projection?.Payments ?? [],
        projection?.Decisions ?? [],
      ),
    [stages, projection],
  );

  const [formOpen, setFormOpen] = useState(false);
  // Правка уже созданной отметки: null — форма добавляет новую запись
  const [editing, setEditing] = useState<ContractEvent | null>(null);
  const [checkpoint, setCheckpoint] =
    useState<ContractEventCheckpoint>(nextCheckpoint);
  // Этап, к которому относится отметка: пусто — контракт целиком
  const [stageKey, setStageKey] = useState("");
  const [occurredAt, setOccurredAt] = useState(today());
  const [basis, setBasis] = useState("");
  const [comment, setComment] = useState("");

  const stageOptions = stageCheckpoints.filter(
    (item) => item.key !== "contract" && item.key !== "outside",
  );

  function openForm() {
    // По умолчанию предлагаем ближайший неотмеченный шаг
    setEditing(null);
    setCheckpoint(nextContractEvent(events));
    setStageKey(stageOptions[0]?.key ?? "");
    setOccurredAt(today());
    setBasis("");
    setComment("");
    setFormOpen(true);
  }

  // Правка отметки: автор и дата ввода остаются прежними — исправляем только
  // сведения о самом событии, чтобы журнал не терял, кто его вёл
  function openEdit(entry: ContractEvent) {
    setEditing(entry);
    setCheckpoint(entry.checkpoint);
    setStageKey(entry.stageSid ?? "");
    setOccurredAt(entry.occurredAt ?? today());
    setBasis(entry.basis ?? "");
    setComment(entry.comment ?? "");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const stage = stageOptions.find((item) => item.key === stageKey);
    const payload = {
      checkpoint,
      occurredAt,
      stageSid: stage?.stageSid ?? undefined,
      stageName: stage?.name,
      basis: basis.trim(),
      comment: comment.trim(),
    };

    if (editing) {
      if (editing.id === undefined) return;

      updateEvent.mutate({
        id: editing.id,
        ...payload,
        updatedAt: today(),
      });
    } else {
      createEvent.mutate({
        contractId,
        ...payload,
        employeeId: human?.id,
        employeeName: employeeName || undefined,
        createdAt: today(),
      });
    }

    closeForm();
  }

  function handleDelete(entry: ContractEvent) {
    if (
      !confirm(
        `Удалить отметку «${contractEventCheckpointLabels[entry.checkpoint]}»?`,
      )
    ) {
      return;
    }

    if (editing?.id === entry.id) closeForm();
    if (entry.id === undefined) return;

    deleteEvent.mutate(entry.id);
  }

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Чекпоинты исполнения</h4>

      <p className={styles.projectionEmpty}>
        Чекпоинт — это факт хозяйственной жизни: контракт подписан, документ о
        приёмке подписан, оплата прошла. Приёмка и оплата приходят из выгрузки
        карточки ЕИС и привязаны к этапам; ручная отметка нужна только там, где
        ЕИС ничего не публикует.
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Этап / контракт</th>
            <th>Период</th>
            <th>Приёмка (акт)</th>
            <th>Оплата, ₽</th>
            <th>Чекпоинт</th>
          </tr>
        </thead>
        <tbody>
          {contract && (
            <tr>
              <td>Контракт</td>
              <td>
                {formatDate(contract.contractDate)
                  ? `от ${formatDate(contract.contractDate)}`
                  : "дата не указана"}
              </td>
              <td>—</td>
              <td>—</td>
              <td>
                <span className={block("status", ["done"])}>подписан</span>
              </td>
            </tr>
          )}

          {stageCheckpoints.map((stage) => {
            const status = checkpointStatus(stage);
            return (
              <tr key={stage.key}>
                <td>
                  {stage.name}
                  {stage.stageSid && (
                    <span className={styles.projectionNote}>
                      sid {stage.stageSid}
                    </span>
                  )}
                </td>
                <td>{stage.period || "—"}</td>
                <td>
                  {stage.acts.length === 0 && (
                    <span className={styles.projectionMissing}>нет акта</span>
                  )}
                  {stage.acts.map((fact) => (
                    <span
                      key={
                        fact.act.FileName ??
                        `${fact.act.ActNumber}-${fact.act.ActDate}`
                      }
                      className={styles.projectionNote}
                    >
                      № {fact.act.ActNumber ?? "—"} от{" "}
                      {isoToDisplay(fact.act.ActDate) || "—"}
                      {fact.total !== null &&
                        ` на ${fact.total.toLocaleString("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ₽`}
                      {fact.accepted ? " · подписан" : " · без решения"}
                    </span>
                  ))}
                </td>
                <td>
                  {stage.paidTotal > 0
                    ? stage.paidTotal.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                  {stage.acceptedTotal > 0 && (
                    <span className={styles.projectionNote}>
                      принято на{" "}
                      {stage.acceptedTotal.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₽
                    </span>
                  )}
                </td>
                <td>
                  <span className={block("status", [status.tone])}>
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h5 className={styles.subTitle}>Отметки заказчика</h5>

      {isLoading && <p className={block("empty")}>Загрузка чекпоинтов…</p>}

      {!isLoading && ordered.length === 0 && (
        <p className={block("empty")}>
          Ручных отметок нет. Факты приёмки и оплаты уже видны выше по выгрузке
          ЕИС; отметку добавляют, когда документа в ЕИС ещё нет — например,
          «проект контракта сформирован» или «начато исполнение».
        </p>
      )}

      {ordered.length > 0 && (
        <ol className={block("list")}>
          {ordered.map((entry) => (
            <li
              key={entry.id}
              className={block("item", [
                editing?.id === entry.id ? "editing" : "",
              ])}
            >
              <span
                className={block("dot", [entry.checkpoint])}
                aria-hidden="true"
              />
              <div className={block("body")}>
                <div className={block("head")}>
                  <span className={block("label")}>
                    {contractEventCheckpointLabels[entry.checkpoint]}
                  </span>
                  <span className={block("date")}>
                    {entry.occurredAt
                      ? formatDate(entry.occurredAt)
                      : "дата не указана"}
                  </span>
                </div>

                {(entry.stageName ||
                  entry.employeeName ||
                  entry.basis ||
                  entry.updatedAt) && (
                  <div className={block("meta")}>
                    {entry.stageName && <span>Этап: {entry.stageName}</span>}
                    {entry.employeeName && (
                      <span>Отметил: {entry.employeeName}</span>
                    )}
                    {entry.basis && <span>Основание: {entry.basis}</span>}
                    {entry.updatedAt && (
                      <span>Изменено: {formatDate(entry.updatedAt)}</span>
                    )}
                  </div>
                )}

                {entry.comment && (
                  <p className={block("comment")}>{entry.comment}</p>
                )}
              </div>

              <button
                type="button"
                className={block("edit")}
                onClick={() => openEdit(entry)}
                disabled={saving}
                title="Изменить отметку"
                aria-label={`Изменить отметку «${contractEventCheckpointLabels[entry.checkpoint]}»`}
              >
                ✎
              </button>

              <button
                type="button"
                className={block("delete")}
                onClick={() => handleDelete(entry)}
                disabled={deleteEvent.isPending}
                title="Удалить отметку"
                aria-label={`Удалить отметку «${contractEventCheckpointLabels[entry.checkpoint]}»`}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {formOpen ? (
        <form className={block("form")} onSubmit={handleSubmit}>
          <p className={block("formTitle")}>
            {editing ? "Правка отметки" : "Новая отметка чекпоинта"}
          </p>

          <div className={block("field")}>
            <label
              className={block("fieldLabel")}
              htmlFor={`event-checkpoint-${contractId}`}
            >
              Чекпоинт
            </label>
            <Select
              id={`event-checkpoint-${contractId}`}
              className={block("select")}
              value={checkpoint}
              onChange={(event) =>
                setCheckpoint(event.target.value as ContractEventCheckpoint)
              }
            >
              {CONTRACT_EVENT_CHECKPOINTS.map((value) => (
                <option key={value} value={value}>
                  {contractEventCheckpointLabels[value]}
                </option>
              ))}
            </Select>
          </div>

          {/* Этап выбирается только когда он есть в ЕИС: у контракта без
              разбивки чекпоинт относится к контракту целиком */}
          {stageOptions.length > 0 && (
            <div className={block("field")}>
              <label
                className={block("fieldLabel")}
                htmlFor={`event-stage-${contractId}`}
              >
                Этап
              </label>
              <Select
                id={`event-stage-${contractId}`}
                className={block("select")}
                value={stageKey}
                onChange={(event) => setStageKey(event.target.value)}
              >
                <option value="">Контракт целиком</option>
                {stageOptions.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className={block("field")}>
            <label
              className={block("fieldLabel")}
              htmlFor={`event-date-${contractId}`}
            >
              Дата события
            </label>
            <input
              id={`event-date-${contractId}`}
              className={block("input")}
              type="date"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label
              className={block("fieldLabel")}
              htmlFor={`event-basis-${contractId}`}
            >
              Документ-основание
            </label>
            <input
              id={`event-basis-${contractId}`}
              className={block("input")}
              value={basis}
              onChange={(event) => setBasis(event.target.value)}
              placeholder="Протокол № 3 от 12.11.2026, приказ № 45-Д"
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label
              className={block("fieldLabel")}
              htmlFor={`event-comment-${contractId}`}
            >
              Комментарий
            </label>
            <input
              id={`event-comment-${contractId}`}
              className={block("input")}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Сведения размещены в реестре контрактов ЕИС"
            />
          </div>

          <div className={block("formActions")}>
            <button
              type="button"
              className={block("btnGhost")}
              onClick={closeForm}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={block("btnPrimary")}
              disabled={saving}
            >
              {saving
                ? "Сохранение…"
                : editing
                  ? "Сохранить"
                  : "Отметить чекпоинт"}
            </button>
          </div>
        </form>
      ) : (
        <div className={block("actions")}>
          <button
            type="button"
            className={block("btnPrimary")}
            onClick={openForm}
          >
            + Отметить чекпоинт
          </button>
          <span className={block("hint")}>
            Следующий шаг: {contractEventCheckpointLabels[nextCheckpoint]}
          </span>
        </div>
      )}
    </section>
  );
}
