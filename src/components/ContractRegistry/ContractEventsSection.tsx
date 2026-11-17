import { useMemo, useState, type FormEvent } from "react";
import {
  useContractEvents,
  useCreateContractEvent,
  useDeleteContractEvent,
} from "../../services/ContractRegistry/contractRegistry.api";
import {
  CONTRACT_EVENT_CHECKPOINTS,
  contractEventCheckpointLabels,
  nextContractEvent,
  sortContractEvents,
  type ContractEvent,
  type ContractEventCheckpoint,
} from "../../services/ContractRegistry/contractRegistry.schema";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import styles from "./ContractRegistry.module.scss";

/**
 * Чекпоинты процесса по контракту (Tasks 8, п. 2 б).
 *
 * ЕИС не сообщает, на каком шаге находится контракт: проверка, подписание,
 * включение в реестр, исполнение и оплата — это наш собственный журнал.
 * Заказчик отмечает пройденные этапы сам, с датой, документом-основанием
 * и снимком ФИО того, кто отметил. Когда появится канал обмена с ЕИС,
 * часть событий можно будет подтверждать данными оттуда, но сама запись
 * останется нашей.
 */

interface ContractEventsSectionProps {
  contractId: string | number;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export default function ContractEventsSection({
  contractId,
}: ContractEventsSectionProps) {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "events");

  const { data: events = [], isLoading } = useContractEvents(contractId);
  const createEvent = useCreateContractEvent();
  const deleteEvent = useDeleteContractEvent();

  // Снимок ФИО того, кто отмечает этап: запись должна читаться и после
  // изменения штатного расписания
  const { employee } = useMyContractRole();
  const human = employee?.employee;
  const employeeName = human ? fullName(human) : "";

  const ordered = useMemo(() => sortContractEvents(events), [events]);
  const nextCheckpoint = useMemo(() => nextContractEvent(events), [events]);

  const [formOpen, setFormOpen] = useState(false);
  const [checkpoint, setCheckpoint] =
    useState<ContractEventCheckpoint>(nextCheckpoint);
  const [occurredAt, setOccurredAt] = useState(today());
  const [basis, setBasis] = useState("");
  const [comment, setComment] = useState("");

  function openForm() {
    // По умолчанию предлагаем ближайший неотмеченный шаг
    setCheckpoint(nextContractEvent(events));
    setOccurredAt(today());
    setBasis("");
    setComment("");
    setFormOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createEvent.mutate({
      contractId,
      checkpoint,
      occurredAt,
      employeeId: human?.id,
      employeeName: employeeName || undefined,
      basis: basis.trim(),
      comment: comment.trim(),
      createdAt: today(),
    });

    setFormOpen(false);
  }

  function handleDelete(entry: ContractEvent) {
    if (
      !confirm(
        `Удалить отметку «${contractEventCheckpointLabels[entry.checkpoint]}»?`,
      )
    ) {
      return;
    }

    deleteEvent.mutate(entry.id!);
  }

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Чекпоинты процесса{ordered.length > 0 ? ` (${ordered.length})` : ""}
      </h4>

      {isLoading && <p className={block("empty")}>Загрузка этапов…</p>}

      {!isLoading && ordered.length === 0 && (
        <p className={block("empty")}>
          Этапы ещё не отмечены. Система не получает их из ЕИС — заказчик
          отмечает пройденные шаги сам, чтобы по карточке было видно, где
          находится контракт.
        </p>
      )}

      {ordered.length > 0 && (
        <ol className={block("list")}>
          {ordered.map((entry) => (
            <li key={entry.id} className={block("item")}>
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

                {(entry.employeeName || entry.basis) && (
                  <div className={block("meta")}>
                    {entry.employeeName && (
                      <span>Отметил: {entry.employeeName}</span>
                    )}
                    {entry.basis && <span>Основание: {entry.basis}</span>}
                  </div>
                )}

                {entry.comment && (
                  <p className={block("comment")}>{entry.comment}</p>
                )}
              </div>

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
          <div className={block("field")}>
            <label
              className={block("fieldLabel")}
              htmlFor={`event-checkpoint-${contractId}`}
            >
              Этап
            </label>
            <select
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
            </select>
          </div>

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
              onClick={() => setFormOpen(false)}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={block("btnPrimary")}
              disabled={createEvent.isPending}
            >
              {createEvent.isPending ? "Сохранение…" : "Отметить этап"}
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
            + Отметить этап
          </button>
          <span className={block("hint")}>
            Следующий шаг: {contractEventCheckpointLabels[nextCheckpoint]}
          </span>
        </div>
      )}
    </section>
  );
}
