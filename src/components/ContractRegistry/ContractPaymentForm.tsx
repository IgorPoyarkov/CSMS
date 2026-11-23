import { useState, type FormEvent } from "react";
import { useCreatePayment } from "../../services/ContractRegistry/contractRegistry.api";
import {
  CONTRACT_PAYMENT_XSD_CODES,
  CONTRACT_PAYMENT_XSD_LABELS,
  type ContractPayment,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  EIS_BASE_DOCUMENT_LABELS,
  EIS_BASE_DOCUMENT_TYPES,
  eisXmlReadinessBadge,
  paymentEisReadiness,
  paymentFormBlocking,
  type EisContractIdentifiers,
} from "../../services/Eis/eisExecutionReadiness";
import { readApiError } from "../../services/csmsApi";
import styles from "./ContractRegistry.module.scss";
import Select from "../UI/Select";

/**
 * Ручной ввод платежа по контракту (ст. 34 ч. 12, 13.1 44-ФЗ).
 *
 * Нужен, когда оплата прошла вне выгрузки ЕИС: фактическое исполнение из
 * карточки ЕИС показывает соседняя секция проекции, а здесь фиксируется
 * платёж, который заказчик провёл сам. Правила те же, что в схеме реестра:
 * сумма — число с копейками, дата — ГГГГ-ММ-ДД, статус — только из домена.
 *
 * Перед сохранением платёж проверяется по требованиям Альбома 17.0
 * (`paymentEisReadiness`): без номера, даты, суммы, кода типа платежа и КБК
 * при казначейском исполнении ЕИС документ не примет, и лучше узнать об этом
 * здесь, чем из отказа шлюза после подписания.
 */
interface ContractPaymentFormProps {
  contractId: string | number;
  /** Реквизиты контракта: реестровый номер и ИНН поставщика для проверки. */
  contract: EisContractIdentifiers;
  onDone: () => void;
}

const paymentTypes: ContractPayment["paymentType"][] = [
  "advance",
  "intermediate",
  "final",
];

const paymentTypeLabels: Record<ContractPayment["paymentType"], string> = {
  advance: "Аванс",
  intermediate: "Промежуточный",
  final: "Окончательный расчёт",
};

const paymentStatuses: ContractPayment["status"][] = [
  "scheduled",
  "sent",
  "paid",
  "rejected",
];

const paymentStatusLabels: Record<ContractPayment["status"], string> = {
  scheduled: "Запланирован",
  sent: "Направлен в казначейство",
  paid: "Оплачен",
  rejected: "Отклонён",
};

export default function ContractPaymentForm({
  contractId,
  contract,
  onDone,
}: ContractPaymentFormProps) {
  const createPayment = useCreatePayment();

  const [documentNumber, setDocumentNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] =
    useState<ContractPayment["paymentType"]>("advance");
  const [status, setStatus] =
    useState<ContractPayment["status"]>("scheduled");
  const [bankDocumentNumber, setBankDocumentNumber] = useState("");
  const [treasuryExecution, setTreasuryExecution] = useState(false);
  const [paymentTypeCode, setPaymentTypeCode] = useState(
    "" as ContractPayment["paymentTypeCode"] | "",
  );
  const [kbk, setKbk] = useState("");
  const [baseDocumentType, setBaseDocumentType] =
    useState<ContractPayment["baseDocumentType"]>("C");
  const [baseDocumentNumber, setBaseDocumentNumber] = useState("");
  const [baseDocumentDate, setBaseDocumentDate] = useState("");
  const [baseDocumentSid, setBaseDocumentSid] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [error, setError] = useState("");

  /** Платёж в том виде, в каком его проверит ЕИС (без id и контракта). */
  const draft = {
    paymentDocumentNumber: documentNumber.trim(),
    paymentDate,
    amount: amount.trim().replace(",", "."),
    paymentType,
    paymentTypeCode: paymentTypeCode || undefined,
    invoiceNumber: invoiceNumber.trim(),
    invoiceDate,
    bankDocumentNumber: bankDocumentNumber.trim(),
    treasuryExecution,
    kbk: kbk.trim(),
    baseDocumentType,
    baseDocumentNumber: baseDocumentNumber.trim(),
    baseDocumentDate,
    baseDocumentSid: baseDocumentSid.trim(),
    status,
  } as const;

  // Считается на каждый ввод: человек видит, что именно мешает ЕИС, ещё до
  // нажатия «Сохранить», а не после отказа шлюза
  const readiness = paymentEisReadiness(draft, contract);
  // Сохранение блокируют только поля платёжного документа: реквизиты контракта
  // правятся в карточке, а факт уже прошедшей оплаты надо зафиксировать
  const saveBlocking = paymentFormBlocking(readiness);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saveBlocking.length > 0) {
      setError(
        "ЕИС не примет платёж. " +
          saveBlocking
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; "),
      );
      return;
    }

    createPayment.mutate(
      {
        contractId,
        ...draft,
        paymentTypeCode: paymentTypeCode || undefined,
      },
      {
        onSuccess: onDone,
        onError: (mutationError) =>
          setError(readApiError(mutationError, "Не удалось сохранить платёж.")),
      },
    );
  }

  return (
    <form className={styles.inlineForm} onSubmit={handleSubmit}>
      <label className={styles.inlineField}>
        <span>№ платёжного документа</span>
        <input
          value={documentNumber}
          onChange={(event) => setDocumentNumber(event.target.value)}
          placeholder="например, 145"
        />
      </label>

      <label className={styles.inlineField}>
        <span>Дата платежа</span>
        <input
          type="date"
          value={paymentDate}
          onChange={(event) => setPaymentDate(event.target.value)}
        />
      </label>

      <label className={styles.inlineField}>
        <span>Сумма, ₽</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
        />
      </label>

      <label className={styles.inlineField}>
        <span>Тип платежа</span>
        <Select
          value={paymentType}
          onChange={(event) =>
            setPaymentType(event.target.value as ContractPayment["paymentType"])
          }
        >
          {paymentTypes.map((type) => (
            <option key={type} value={type}>
              {paymentTypeLabels[type]}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.inlineField}>
        <span>Статус</span>
        <Select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ContractPayment["status"])
          }
        >
          {paymentStatuses.map((value) => (
            <option key={value} value={value}>
              {paymentStatusLabels[value]}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.inlineField}>
        <span>Банковский документ</span>
        <input
          value={bankDocumentNumber}
          onChange={(event) => setBankDocumentNumber(event.target.value)}
          placeholder="№ п/п"
        />
      </label>

      {/* Код типа платежа по XSD: PC — оплата контрагенту (аванс,
          промежуточный, окончательный), PN — неустойка, RC — возврат.
          Пустое значение = PC, чтобы не заставлять выбирать очевидное */}
      <label className={styles.inlineField}>
        <span>Тип платежа в ЕИС</span>
        <Select
          value={paymentTypeCode ?? ""}
          onChange={(event) =>
            setPaymentTypeCode(
              (event.target.value || "") as
                | ContractPayment["paymentTypeCode"]
                | "",
            )
          }
        >
          <option value="">PC — по умолчанию (оплата контрагенту)</option>
          {CONTRACT_PAYMENT_XSD_CODES.map((code) => (
            <option key={code} value={code}>
              {CONTRACT_PAYMENT_XSD_LABELS[code]}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.inlineField}>
        <span>Документ-основание</span>
        <Select
          value={baseDocumentType}
          onChange={(event) =>
            setBaseDocumentType(
              event.target.value as ContractPayment["baseDocumentType"],
            )
          }
        >
          {EIS_BASE_DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EIS_BASE_DOCUMENT_LABELS[type]}
            </option>
          ))}
        </Select>
      </label>

      {baseDocumentType !== "C" && (
        <>
          <label className={styles.inlineField}>
            <span>№ документа-основания</span>
            <input
              value={baseDocumentNumber}
              onChange={(event) => setBaseDocumentNumber(event.target.value)}
              placeholder="номер акта приёмки"
            />
          </label>

          <label className={styles.inlineField}>
            <span>Дата документа-основания</span>
            <input
              type="date"
              value={baseDocumentDate}
              onChange={(event) => setBaseDocumentDate(event.target.value)}
            />
          </label>
        </>
      )}

      {baseDocumentType === "A" && (
        <label className={styles.inlineField}>
          <span>Идентификатор акта в ЕИС (RDICSid)</span>
          <input
            value={baseDocumentSid}
            onChange={(event) => setBaseDocumentSid(event.target.value)}
            placeholder="из карточки документа о приёмке в ЕИС"
          />
        </label>
      )}

      <label className={styles.inlineField}>
        <span>Счёт-фактура №</span>
        <input
          value={invoiceNumber}
          onChange={(event) => setInvoiceNumber(event.target.value)}
          placeholder="номер счёта-фактуры"
        />
      </label>

      <label className={styles.inlineField}>
        <span>Счёт-фактура от</span>
        <input
          type="date"
          value={invoiceDate}
          onChange={(event) => setInvoiceDate(event.target.value)}
        />
      </label>

      {/* Казначейское исполнение меняет срок оплаты по ч. 13.1 ст. 34:
          10 рабочих дней вместо 7 */}
      <label className={styles.inlineCheckbox}>
        <input
          type="checkbox"
          checked={treasuryExecution}
          onChange={(event) => setTreasuryExecution(event.target.checked)}
        />
        <span>Казначейское исполнение (срок оплаты 10 р. д.)</span>
      </label>

      <label className={styles.inlineField}>
        <span>КБК{treasuryExecution ? " (обязателен)" : ""}</span>
        <input
          value={kbk}
          onChange={(event) => setKbk(event.target.value)}
          placeholder="20 цифр"
          inputMode="numeric"
        />
      </label>

      <p
        className={`${styles.xmlNotice} ${
          readiness.ok ? styles.xmlNotice_ok : styles.xmlNotice_error
        }`}
        title={readiness.summary}
      >
        ЕИС XML 17.0: {eisXmlReadinessBadge(readiness)}
        {readiness.blocking.slice(0, 2).map((issue) => (
          <span key={issue.path} className={styles.xmlNoticeItem}>
            {issue.path}: {issue.message}
          </span>
        ))}
        {readiness.blocking.length > saveBlocking.length && (
          <span className={styles.xmlNoticeItem}>
            Реквизиты контракта (реестровый номер, ИНН поставщика) правятся в
            карточке контракта: сохранить факт оплаты они не мешают, но пакет в
            ЕИС без них не уйдёт.
          </span>
        )}
      </p>

      {error && <p className={styles.inlineError}>{error}</p>}

      <div className={styles.inlineFormActions}>
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={createPayment.isPending}
        >
          {createPayment.isPending ? "Сохранение…" : "Сохранить платёж"}
        </button>
        <button
          type="button"
          className={styles.btnSmall}
          onClick={onDone}
          disabled={createPayment.isPending}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
