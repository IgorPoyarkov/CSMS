import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import {
  contractSmpDocumentTypeLabels,
  contractSmpPriceTypeLabels,
  contractSmpStatusLabels,
  computeSmpVolume,
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
  useReviseContractorSmpRecord,
  useSubmitContractorSmpRecord,
  useWithdrawContractorSmpRecord,
} from "../../services/Contractor/contractor.api";
import {
  ContractorSmpDraftSchema,
  contractorSignerLabel,
  contractorSmpDraftOf,
  emptyContractorSmpDraft,
  hasSmpRequirement,
  isRecordEditableByContractor,
  summarizeContractorSmpRecords,
  type ContractorSession,
  type ContractorSmpDraftForm,
} from "../../services/Contractor/contractor.schema";
import useUtils from "../../hooks/useUtils";
import styles from "./Contractor.module.scss";

/**
 * Направление сведений о привлечении СМП со стороны подрядчика
 * (Tasks 9, п. 6: «подрядчик сам загружает нужные для реестра сведения
 * к нам в систему и направляет их заказчику»).
 *
 * От секции заказчика (`ContractRegistry/ContractSmpSection.tsx`) отличается
 * не внешним видом, а полномочиями:
 * — подрядчик видит только свои записи и только свой контур сроков;
 * — он не выставляет статус приёмки и не трогает поля заказчика;
 * — отправка сразу несёт подтверждение достоверности (п. 6 ПП РФ N 1466),
 *   поэтому в форме есть отдельный флаг «подтверждаю», без него не отправит.
 *
 * Объём привлечения считается по принятым заказчиком договорам, поэтому подрядчик
 * видит две величины: зачтено (принято) и направлено (ждёт приёмки). Разница
 * между ними и есть «заказчик ещё не посмотрел», а не «я недогрузил».
 */

interface ContractorSmpSectionProps {
  contract: ContractRegistryItem;
  records: ContractSmpRecord[];
  session: ContractorSession;
}

const money = (value: number): string => value.toLocaleString("ru-RU");

const ContractorSmpSection = ({
  contract,
  records,
  session,
}: ContractorSmpSectionProps) => {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "contractor-smp");

  const submitRecord = useSubmitContractorSmpRecord();
  const reviseRecord = useReviseContractorSmpRecord();
  const withdrawRecord = useWithdrawContractorSmpRecord();

  const [editing, setEditing] = useState<ContractSmpRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<SourceFileFields | null>(null);

  const percent = contract.smpRequiredPercent;

  const volume = useMemo(
    () => computeSmpVolume(records, contract.contractPrice, percent),
    [records, contract.contractPrice, percent],
  );

  const summary = useMemo(
    () => summarizeContractorSmpRecords(records),
    [records],
  );

  // Сроки подрядчика по типовым условиям — свой контур, без чужих просрочек
  const deadlines = useMemo(
    () => computeSmpDeadlines(records).supplier,
    [records],
  );

  const sorted = useMemo(
    () =>
      [...records].sort((left, right) =>
        String(right.documentDate ?? "").localeCompare(
          String(left.documentDate ?? ""),
        ),
      ),
    [records],
  );

  if (!hasSmpRequirement(contract)) {
    return (
      <p className={block("absent")}>
        Требование о привлечении субподрядчиков из СМП и СОНКО по этому
        контракту не установлено — направлять сведения не нужно.
      </p>
    );
  }

  return (
    <div className={block()}>
      {/* ─── Объём ─────────────────────────────────────────────────────────── */}

      <div className={block("volume")}>
        <div className={block("volumeRow")}>
          <span>
            Требуемый объём — {percent}% от цены контракта{" "}
            {money(
              Number.parseFloat(String(contract.contractPrice ?? "0")) || 0,
            )}{" "}
            ₽
          </span>
          <strong>{money(volume.required)} ₽</strong>
        </div>

        <div className={block("progress")}>
          <div
            className={block("progressFill")}
            style={{
              width: `${Math.min(volume.progress, 100)}%`,
              background:
                volume.progress >= 100
                  ? "var(--state-success)"
                  : volume.progress >= 50
                    ? "var(--state-warning)"
                    : "var(--state-danger)",
            }}
          />
        </div>

        <div className={block("volumeRow")}>
          <span>
            Зачтено заказчиком · {summary.accepted + summary.pushedToEis}{" "}
            договор(ов)
          </span>
          <strong
            style={{
              color: volume.isComplete
                ? "var(--state-success)"
                : "var(--text-primary)",
            }}
          >
            {money(volume.actual)} ₽
          </strong>
        </div>

        {summary.pendingAmount > 0 && (
          <div className={block("volumeRow")}>
            <span>Направлено, ждёт приёмки заказчиком</span>
            <strong className={block("pending")}>
              {money(summary.pendingAmount)} ₽
            </strong>
          </div>
        )}

        <div className={block("foot")}>
          {volume.isComplete ? (
            <span className={block("ok")}>
              ✓ Обязательство по объёму привлечения выполнено
            </span>
          ) : (
            <span className={block("warn")}>
              Не закрыто {money(volume.shortfall)} ₽ (
              {volume.progress.toFixed(1)}% от требуемого). При недопривлечении
              контрактная служба начисляет неустойку по п. 6 типовых условий.
            </span>
          )}
        </div>
      </div>

      {/* ─── Сроки подрядчика ──────────────────────────────────────────────── */}

      {deadlines.length > 0 && (
        <div className={block("deadlines")}>
          <p className={block("subTitle")}>
            Ваши сроки по типовым условиям (ПП РФ от 23.12.2016 N 1466)
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пункт</th>
                <th>Что представить</th>
                <th>Отсчёт от</th>
                <th>Срок</th>
                <th>Состояние</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((item) => (
                <tr
                  key={item.key}
                  className={item.status === "overdue" ? styles.rowDanger : ""}
                >
                  <td>{item.clause}</td>
                  <td>
                    {item.title}
                    <br />
                    <span className={block("basis")}>{item.basis}</span>
                  </td>
                  <td>{formatDate(item.startDate)}</td>
                  <td>
                    {formatDate(item.dueDate)}
                    <br />
                    <span className={block("basis")}>
                      {item.workingDays} раб. дн.
                    </span>
                  </td>
                  <td>
                    <span className={block("deadlineStatus", [item.status])}>
                      {smpDeadlineStatusLabels[item.status]}
                      {item.status === "overdue" &&
                        ` (+${item.overdueBusinessDays} раб. дн.)`}
                      {item.status === "pending" &&
                        item.remainingBusinessDays > 0 &&
                        ` · осталось ${item.remainingBusinessDays} раб. дн.`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Отправленные сведения ─────────────────────────────────────────── */}

      <div className={block("records")}>
        <div className={block("recordsHead")}>
          <p className={block("subTitle")}>
            Направленные сведения · {sorted.length}
          </p>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setEditing(null);
              setFileInfo(null);
              setOpen(true);
            }}
          >
            + Направить сведения
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className={block("empty")}>
            По этому контракту сведений ещё не направлялось. Заказчик узнает о
            них, как только вы отправите первую запись.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Документ</th>
                <th>Субподрядчик</th>
                <th>Сумма</th>
                <th>Направлено</th>
                <th>Решение заказчика</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((record) => {
                const editable = isRecordEditableByContractor(record);
                return (
                  <tr
                    key={String(record.id)}
                    className={
                      record.status === "rejected" ? styles.rowDanger : ""
                    }
                  >
                    <td>
                      {contractSmpDocumentTypeLabels[record.documentType]}
                      <br />
                      <span className={block("basis")}>
                        № {record.documentNumber || "—"} от{" "}
                        {formatDate(record.documentDate)}
                      </span>
                    </td>
                    <td>
                      {record.supplierName}
                      {record.supplierInn && (
                        <>
                          <br />
                          <span className={block("basis")}>
                            ИНН {record.supplierInn}
                            {record.isSmpSubject ? "" : " · не из реестра МСП"}
                          </span>
                        </>
                      )}
                    </td>
                    <td className={styles.moneyCell}>
                      {record.amount
                        ? `${money(Number(record.amount))} ₽`
                        : "—"}
                    </td>
                    <td>
                      {formatDate(String(record.receivedAt ?? "").slice(0, 10))}
                      {record.supplierConfirmedAt && <br />}
                      {record.supplierConfirmedAt && (
                        <span className={block("basis")}>
                          подтверждено{" "}
                          {formatDate(
                            String(record.supplierConfirmedAt).slice(0, 10),
                          )}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={block("status", [record.status])}>
                        {contractSmpStatusLabels[record.status]}
                      </span>
                      {record.comment && <br />}
                      {record.comment && (
                        <span className={block("basis")}>{record.comment}</span>
                      )}
                    </td>
                    <td className={block("rowActions")}>
                      {editable && (
                        <>
                          <button
                            type="button"
                            className={styles.btnSmall}
                            onClick={() => {
                              setEditing(record);
                              setFileInfo(null);
                              setOpen(true);
                            }}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className={styles.btnDanger}
                            disabled={withdrawRecord.isPending}
                            onClick={() => {
                              if (!confirm("Отозвать направленные сведения?"))
                                return;
                              withdrawRecord.mutate(record);
                            }}
                          >
                            Отозвать
                          </button>
                        </>
                      )}
                      {!editable && (
                        <span className={block("basis")}>
                          {record.status === "rejected"
                            ? "согласуйте с КС"
                            : "изменение за заказчиком"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {withdrawRecord.isError && (
        <p className={block("formError")}>{withdrawRecord.error.message}</p>
      )}

      {open && (
        <SmpDraftForm
          contract={contract}
          session={session}
          record={editing}
          records={records}
          fileInfo={fileInfo}
          setFileInfo={setFileInfo}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
            setFileInfo(null);
          }}
          onSubmit={(draft) => {
            // Флаг подтверждения — часть формы, а не записи: в PATCH он не
            // уходит, иначе в сведениях появится поле, которого нет в схеме
            const { confirmAccurate, ...changes } = draft;
            void confirmAccurate;

            if (editing?.id !== undefined) {
              reviseRecord.mutate(
                {
                  id: editing.id,
                  changes,
                  // Правка обновляет и подтверждение достоверности
                  signer: contractorSignerLabel(session),
                },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setEditing(null);
                    setFileInfo(null);
                  },
                },
              );
              return;
            }

            submitRecord.mutate(
              {
                contract,
                draft,
                signer: contractorSignerLabel(session),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  setEditing(null);
                  setFileInfo(null);
                },
              },
            );
          }}
          pending={submitRecord.isPending || reviseRecord.isPending}
          error={
            submitRecord.error ??
            reviseRecord.error ??
            withdrawRecord.error ??
            null
          }
        />
      )}
    </div>
  );
};

// ─── Форма направления ──────────────────────────────────────────────────────

interface SmpDraftFormProps {
  contract: ContractRegistryItem;
  session: ContractorSession;
  record: ContractSmpRecord | null;
  /** Все записи по контракту: из них выбирается договор-основание для акта */
  records: ContractSmpRecord[];
  fileInfo: SourceFileFields | null;
  setFileInfo: (value: SourceFileFields | null) => void;
  onCancel: () => void;
  onSubmit: (draft: ContractorSmpDraftForm) => void;
  pending: boolean;
  error: Error | null;
}

const SmpDraftForm = ({
  contract,
  session,
  record,
  records,
  fileInfo,
  setFileInfo,
  onCancel,
  onSubmit,
  pending,
  error,
}: SmpDraftFormProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "contractor-smp");

  const methods = useForm<ContractorSmpDraftForm>({
    // unknown → any: схема отдаёт тип с обязательными полями, форма — входной
    resolver: zodResolver(ContractorSmpDraftSchema) as never,
    defaultValues: record
      ? contractorSmpDraftOf(record)
      : emptyContractorSmpDraft(),
    mode: "onSubmit",
  });

  const { register, handleSubmit, setValue, getValues } = methods;
  const documentType = useWatch({
    control: methods.control,
    name: "documentType",
  });
  const isSubContract = documentType === "subContract";

  // Акт приёмки и платёжное поручение — документы к уже направленному
  // договору: выбор договора связывает их в карточке заказчика
  const needsBasis =
    documentType === "acceptance" || documentType === "payment";
  const subContracts = useMemo(
    () => records.filter((item) => item.documentType === "subContract"),
    [records],
  );

  // Из имени файла читаются номер и дата, но только в пустые поля: введённое
  // руками править нечем, а достоверность подтверждает человек (п. 6)
  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsed = readSourceFileFields(file);
    setFileInfo(parsed);

    if (parsed.documentNumber && !getValues("documentNumber")) {
      setValue("documentNumber", parsed.documentNumber);
    }
    if (parsed.documentDate && !getValues("documentDate")) {
      setValue("documentDate", parsed.documentDate);
    }
    if (!getValues("sourceFileName")) {
      setValue("sourceFileName", parsed.fileName);
    }
  }

  return (
    <form
      className={block("form")}
      onSubmit={handleSubmit((draft) => onSubmit(draft))}
    >
      <div className={block("formHead")}>
        <p className={block("formTitle")}>
          {record
            ? "Правка направленных сведений"
            : "Новые сведения о привлечении СМП"}
        </p>
        <p className={block("formContract")}>
          Контракт № {contract.contractNumber} · {contract.customerName} ·
          заказчик видит запись сразу после отправки
        </p>
      </div>

      <div className={block("grid")}>
        <label className={block("field")}>
          <span className={block("label")}>Тип документа</span>
          <select className={block("input")} {...register("documentType")}>
            {Object.entries(contractSmpDocumentTypeLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className={block("field")}>
          <span className={block("label")}>Номер документа</span>
          <input
            className={block("input")}
            {...register("documentNumber")}
            placeholder="например 14/26"
          />
          {methods.formState.errors.documentNumber && (
            <span className={block("fieldError")}>
              {methods.formState.errors.documentNumber.message}
            </span>
          )}
        </label>

        <label className={block("field")}>
          <span className={block("label")}>Дата документа</span>
          <input
            className={block("input")}
            type="date"
            {...register("documentDate")}
          />
          {methods.formState.errors.documentDate && (
            <span className={block("fieldError")}>
              {methods.formState.errors.documentDate.message}
            </span>
          )}
        </label>

        <label className={block("field")}>
          <span className={block("label")}>Сумма, ₽</span>
          <input
            className={block("input")}
            {...register("amount")}
            inputMode="decimal"
            placeholder="0.00"
          />
          {methods.formState.errors.amount && (
            <span className={block("fieldError")}>
              {methods.formState.errors.amount.message}
            </span>
          )}
        </label>
      </div>

      {/* Субподрядчик нужен для любого типа сведений: договор заключается с
          ним, декларацию он подписывает, акт и платёжка относятся к его
          договору. Схема записи требует это поле всегда — прятать его для
          отдельных типов документов нельзя, иначе форма не отправится */}
      <div className={block("grid")}>
        <label className={block("field")}>
          <span className={block("label")}>Субподрядчик (соисполнитель)</span>
          <input
            className={block("input")}
            {...register("supplierName")}
            placeholder="ООО «…» или ИП Ф. И. О."
          />
          {methods.formState.errors.supplierName && (
            <span className={block("fieldError")}>
              {methods.formState.errors.supplierName.message}
            </span>
          )}
        </label>

        <label className={block("field")}>
          <span className={block("label")}>ИНН субподрядчика</span>
          <input
            className={block("input")}
            {...register("supplierInn")}
            inputMode="numeric"
            placeholder="10 или 12 цифр"
          />
          {methods.formState.errors.supplierInn && (
            <span className={block("fieldError")}>
              {methods.formState.errors.supplierInn.message}
            </span>
          )}
        </label>

        <label className={block("field")}>
          <span className={block("label")}>КПП</span>
          <input
            className={block("input")}
            {...register("supplierKpp")}
            inputMode="numeric"
            placeholder="9 цифр"
          />
          {methods.formState.errors.supplierKpp && (
            <span className={block("fieldError")}>
              {methods.formState.errors.supplierKpp.message}
            </span>
          )}
        </label>
      </div>

      {isSubContract && (
        <div className={block("grid")}>
          <label className={block("field")}>
            <span className={block("label")}>ОКПД2 предмета договора</span>
            <input
              className={block("input")}
              {...register("okpd2Code")}
              placeholder="43.31.10"
            />
            {methods.formState.errors.okpd2Code && (
              <span className={block("fieldError")}>
                {methods.formState.errors.okpd2Code.message}
              </span>
            )}
          </label>

          <label className={block("field")}>
            <span className={block("label")}>Вид цены</span>
            <select className={block("input")} {...register("priceType")}>
              {Object.entries(contractSmpPriceTypeLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className={block("field")}>
            <span className={block("label")}>Цена за единицу, ₽</span>
            <input
              className={block("input")}
              {...register("unitPrice")}
              inputMode="decimal"
            />
          </label>
        </div>
      )}

      <div className={block("grid")}>
        <label className={block("field")}>
          <span className={block("label")}>Предмет документа</span>
          <input className={block("input")} {...register("subject")} />
        </label>

        <label className={block("field")}>
          <span className={block("label")}>Период</span>
          <input
            className={block("input")}
            {...register("period")}
            placeholder="2026-09 или III квартал"
          />
        </label>

        <label className={block("field")}>
          <span className={block("label")}>Дата оплаты субподрядчику</span>
          <input
            className={block("input")}
            type="date"
            {...register("paidToSupplierDate")}
          />
        </label>

        <label className={block("field")}>
          <span className={block("label")}>Дата подписания акта приёмки</span>
          <input
            className={block("input")}
            type="date"
            {...register("acceptanceSignedDate")}
          />
        </label>
      </div>

      <div className={block("flags")}>
        <label className={block("check")}>
          <input type="checkbox" {...register("isSmpSubject")} />
          <span>
            Субподрядчик — субъект МСП или СОНКО (иначе объём не закрывается)
          </span>
        </label>
        <label className={block("check")}>
          <input type="checkbox" {...register("isReplacementSubContract")} />
          <span>
            Замена субподрядчика на этапе исполнения (п. 3 типовых условий)
          </span>
        </label>
        <label className={block("check")}>
          <input
            type="checkbox"
            {...register("paidEarlierThanContractSchedule")}
          />
          <span>
            Оплата субподрядчику прошла раньше срока по контракту с заказчиком
            (п. 4 — платёжки в 10 рабочих дней)
          </span>
        </label>
      </div>

      {needsBasis && (
        <label className={block("field")}>
          <span className={block("label")}>Договор-основание</span>
          <select
            className={block("input")}
            {...register("subContractRecordId")}
          >
            <option value="">— не указан —</option>
            {subContracts.map((item) => (
              <option key={String(item.id)} value={String(item.id)}>
                № {item.documentNumber} от {item.documentDate} ·{" "}
                {item.supplierName}
              </option>
            ))}
          </select>
          <span className={block("basis")}>
            {subContracts.length === 0
              ? "Сначала направьте договор с субподрядчиком — без него акт и платёжка не привяжутся"
              : "Заказчик сопоставит документ с этим договором"}
          </span>
        </label>
      )}

      <div className={block("file")}>
        <label className={block("label")}>Файл-основание</label>
        <input
          type="file"
          className={block("fileInput")}
          onChange={handleFile}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        {fileInfo && (
          <p className={block("fileInfo")}>
            {fileInfo.fileName}
            {fileInfo.size ? ` · ${formatFileSize(fileInfo.size)}` : ""}
            {fileInfo.matched.length > 0
              ? ` · из имени прочитано: ${fileInfo.matched
                  .map((item) =>
                    item === "documentNumber"
                      ? `номер ${fileInfo.documentNumber}`
                      : `дата ${fileInfo.documentDate}`,
                  )
                  .join(", ")} — проверьте`
              : " · номер и дата из имени не прочитались, внесите вручную"}
          </p>
        )}
        <p className={block("fileHint")}>{SOURCE_FILE_HINT}</p>
      </div>

      <label className={block("field")}>
        <span className={block("label")}>
          Комментарий для контрактной службы
        </span>
        <textarea
          className={block("input")}
          rows={2}
          {...register("comment")}
        />
      </label>

      <label className={block("confirm")}>
        <input type="checkbox" {...register("confirmAccurate")} />
        <span>
          Подтверждаю достоверность направленных сведений и понимаю
          ответственность за их недостоверность по п. 6 типовых условий ПП РФ от
          23.12.2016 N 1466. Подпись: {contractorSignerLabel(session)}
        </span>
      </label>
      {methods.formState.errors.confirmAccurate && (
        <p className={block("fieldError")}>
          {methods.formState.errors.confirmAccurate.message}
        </p>
      )}

      {error && <p className={block("formError")}>{error.message}</p>}

      <div className={block("formActions")}>
        <button type="submit" className={styles.btnPrimary} disabled={pending}>
          {pending
            ? "Отправляем…"
            : record
              ? "Сохранить правку"
              : "Направить заказчику"}
        </button>
        <button type="button" className={styles.btnSmall} onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
};

export default ContractorSmpSection;
