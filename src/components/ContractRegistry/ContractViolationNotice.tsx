import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import {
  contractServiceRoster,
  functionLabels,
} from "../../services/ContractService/contractService.config";
import { useCreateTask } from "../../services/Tasks/tasks.api";
import {
  CONTRACT_VIOLATION_SUBJECTS,
  ContractViolationNoticeSchema,
  buildContractViolationTask,
  contractViolationLegalBasis,
  contractViolationRecipientFunction,
  contractViolationRecipientLabel,
  contractViolationRecipients,
  contractViolationSourceLabels,
  contractViolationSubjectHints,
  contractViolationSubjectLabels,
  contractViolationSubjectRequirement,
  emptyContractViolationNotice,
  type ContractViolationNoticeForm,
  type ContractViolationSource,
  type ContractViolationSourceRef,
  type ContractViolationSubject,
} from "../../services/ContractViolation/contractViolation.schema";
import Select from "../UI/Select";
import styles from "./ContractRegistry.module.scss";

/**
 * КС-уведомление о ненадлежащем исполнении (карточка контракта).
 *
 * Открывается из приёмки и из сведений о привлечении СМП: сотрудник, который
 * принимает документ или вносит сведения, и есть тот, кто видит нарушение
 * первым. Здесь собирается предмет нарушения, существо, требование и
 * основание, а задача уходит члену КС по структуре службы — ответственному за
 * направление (п. 3.5.3 / 3.5.2) либо руководителю службы, если функции никому
 * не назначены.
 */
interface ContractViolationNoticeProps {
  contractId: string | number;
  contractNumber: string;
  contractSubject?: string;
  ikz?: string;
  source: ContractViolationSource;
  /** Предмет нарушения по умолчанию — зависит от источника. */
  defaultSubject?: ContractViolationSubject;
  /** Что уже известно о нарушении: подставляется в «что выявлено». */
  defaultEssence?: string;
  /** Документ-основание: акт приёмки, запись СМП. */
  sourceRef?: ContractViolationSourceRef;
  /** Уже рассчитанная неустойка (штраф). */
  defaultAmount?: string;
  onClose: () => void;
}

export default function ContractViolationNotice({
  contractId,
  contractNumber,
  contractSubject,
  ikz,
  source,
  defaultSubject = "quality",
  defaultEssence = "",
  sourceRef,
  defaultAmount = "",
  onClose,
}: ContractViolationNoticeProps) {
  const { bem, fullName } = useUtils();
  const block = bem(styles, "notice-form");

  const { employee, organization, contractService, myRole } =
    useMyContractRole();
  const createTask = useCreateTask();

  const methods = useForm<ContractViolationNoticeForm>({
    resolver: zodResolver(ContractViolationNoticeSchema) as any,
    defaultValues: emptyContractViolationNotice({
      subject: defaultSubject,
      essence: defaultEssence,
      amount: defaultAmount,
    }),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = methods;

  const subject = useWatch({
    control: methods.control,
    name: "subject",
  }) as ContractViolationSubject;

  // Состав КС неизменен на время открытой формы: ростер нужен только для
  // выбора адресата, поэтому считаем его один раз
  const roster = useMemo(
    () => (contractService ? contractServiceRoster(contractService) : []),
    [contractService],
  );
  const recipients = useMemo(
    () => contractViolationRecipients(roster, subject),
    [roster, subject],
  );
  // Адресат не хранится в форме: при смене предмета нарушения список
  // ответственных меняется, и «залипший» id увёл бы задачу не тому работнику
  const [recipientId, setRecipientId] = useState("");
  const recipient =
    recipients.find((row) => String(row.employeeId) === recipientId) ??
    recipients[0];

  const [formError, setFormError] = useState("");
  const [createdId, setCreatedId] = useState<string | number | null>(null);

  const detectedByName = employee
    ? [fullName(employee.employee ?? {}), myRole?.role ?? ""]
        .filter(Boolean)
        .join(", ")
    : "";

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function handleSubjectChange(next: ContractViolationSubject) {
    setValue("subject", next, { shouldValidate: true, shouldDirty: true });
    // Требование переписываем только если человек его ещё не правил —
    // иначе смена предмета затрёт введённый текст
    const current = methods.getValues("requirement");
    if (!current || current === contractViolationSubjectRequirement[subject]) {
      setValue("requirement", contractViolationSubjectRequirement[next], {
        shouldValidate: true,
      });
    }
  }

  function onSubmit(values: ContractViolationNoticeForm) {
    if (!organization?.id) {
      setFormError(
        "Не определена организация заказчика — уведомление некому адресовать.",
      );
      return;
    }

    if (!recipient || recipient.employeeId === undefined) {
      setFormError(
        "В контрактной службе не определён ответственный работник. Назначьте функции в разделе «Контрактная служба» — уведомление должно уйти в конкретные руки.",
      );
      return;
    }

    setFormError("");
    createTask.mutate(
      buildContractViolationTask({
        organizationId: organization.id,
        contractId,
        contractNumber,
        contractSubject,
        ikz,
        source,
        sourceRef,
        notice: values,
        detectedByName,
        detectedByEmployeeId: employee?.id,
        assignee: recipient,
      }),
      {
        onSuccess: (task) => setCreatedId(task.id ?? ""),
        onError: (error) =>
          setFormError(
            error instanceof Error
              ? error.message
              : "Не удалось поставить задачу в контрактную службу",
          ),
      },
    );
  }

  const recipientFn = recipient
    ? contractViolationRecipientFunction(recipient, subject)
    : undefined;

  return (
    <div className={block()} onClick={onClose}>
      <div
        className={block("window")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={block("head")}>
          <h3 className={block("title")}>
            КС-уведомление о ненадлежащем исполнении
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

        {createdId !== null ? (
          <div className={block("success")}>
            <p className={block("successTitle")}>Уведомление направлено в КС</p>
            <p className={block("successText")}>
              Задача поставлена:{" "}
              {recipient ? contractViolationRecipientLabel(recipient) : "—"}
              {recipientFn ? ` · ${functionLabels[recipientFn]}` : ""}. Она
              появилась в личном кабинете работника и в списке задач
              организации.
            </p>
            <div className={block("actions")}>
              <Link
                className={styles.projectionLink}
                to={`/tasks/${String(createdId)}`}
              >
                Открыть задачу
              </Link>
              <button
                type="button"
                className={styles.btnSmall}
                onClick={onClose}
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
            <p className={block("source")}>
              Источник: {contractViolationSourceLabels[source]}
              {sourceRef?.label ? ` · ${sourceRef.label}` : ""}
              {sourceRef?.link && (
                <>
                  {" "}
                  <Link className={styles.projectionLink} to={sourceRef.link}>
                    Открыть документ
                  </Link>
                </>
              )}
            </p>

            <div className={block("grid")}>
              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="notice-subject">
                  Предмет нарушения
                </label>
                <Select
                  id="notice-subject"
                  className={block("select")}
                  value={subject}
                  onChange={(event) =>
                    handleSubjectChange(
                      event.target.value as ContractViolationSubject,
                    )
                  }
                >
                  {CONTRACT_VIOLATION_SUBJECTS.map((code) => (
                    <option key={code} value={code}>
                      {contractViolationSubjectLabels[code]}
                    </option>
                  ))}
                </Select>
                <span className={block("hint")}>
                  {contractViolationSubjectHints[subject]}
                </span>
              </div>

              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="notice-essence">
                  Что выявлено
                </label>
                <textarea
                  id="notice-essence"
                  className={block("textarea")}
                  rows={4}
                  placeholder="Например: при приёмке партии по документу № 12 от 20.11.2026 обнаружено несоответствие количества и отсутствие паспортов качества"
                  {...register("essence")}
                />
                {errorText("essence") && (
                  <span className={block("error")}>{errorText("essence")}</span>
                )}
              </div>

              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="notice-requirement">
                  Требование к поставщику
                </label>
                <textarea
                  id="notice-requirement"
                  className={block("textarea")}
                  rows={3}
                  {...register("requirement")}
                />
                {errorText("requirement") && (
                  <span className={block("error")}>
                    {errorText("requirement")}
                  </span>
                )}
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="notice-basis">
                  Основание (пункт контракта / норма)
                </label>
                <input
                  id="notice-basis"
                  className={block("input")}
                  placeholder={contractViolationLegalBasis[subject]}
                  {...register("basis")}
                />
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="notice-amount">
                  Неустойка (штраф), ₽ — если рассчитана
                </label>
                <input
                  id="notice-amount"
                  className={block("input")}
                  inputMode="decimal"
                  placeholder="12500.50"
                  {...register("amount")}
                />
                {errorText("amount") && (
                  <span className={block("error")}>{errorText("amount")}</span>
                )}
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="notice-due">
                  Срок исполнения требования
                </label>
                <input
                  id="notice-due"
                  className={block("input")}
                  type="date"
                  {...register("dueDate")}
                />
                {errorText("dueDate") && (
                  <span className={block("error")}>{errorText("dueDate")}</span>
                )}
              </div>
            </div>

            {/* Маршрутизация по структуре КС: адресат виден до отправки */}
            <div className={block("route")}>
              {recipient ? (
                <>
                  <span className={block("routeLabel")}>Уйдёт в КС:</span>
                  <strong>{contractViolationRecipientLabel(recipient)}</strong>
                  {recipientFn && (
                    <span className={block("hint")}>
                      функция {functionLabels[recipientFn]}
                    </span>
                  )}
                  {recipients.length > 1 && (
                    <Select
                      className={block("select")}
                      value={String(recipient.employeeId ?? "")}
                      onChange={(event) => setRecipientId(event.target.value)}
                      aria-label="Ответственный в контрактной службе"
                    >
                      {recipients.map((row) => (
                        <option
                          key={String(row.employeeId)}
                          value={String(row.employeeId ?? "")}
                        >
                          {contractViolationRecipientLabel(row)}
                        </option>
                      ))}
                    </Select>
                  )}
                </>
              ) : (
                <span className={block("routeWarning")}>
                  В контрактной службе не определён ответственный работник —
                  уведомление некому направить.{" "}
                  <Link
                    className={styles.projectionLink}
                    to="/contract-service"
                  >
                    Открыть контрактную службу
                  </Link>
                </span>
              )}
            </div>

            <p className={block("hint")}>
              Выявил:{" "}
              {detectedByName || "вход не выполнен — задача будет без постановщика"}.
              Само уведомление в ЕИС не уходит: сведения об исполнении
              направляются отдельным пакетом.
            </p>

            {formError && <p className={block("error")}>{formError}</p>}

            <div className={block("actions")}>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={createTask.isPending || !recipient}
              >
                {createTask.isPending ? "Отправка…" : "Направить в КС"}
              </button>
              <button
                type="button"
                className={styles.btnSmall}
                onClick={onClose}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

