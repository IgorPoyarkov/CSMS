import { useState, type FormEvent } from "react";
import { useCreatePayment } from "../../services/ContractRegistry/contractRegistry.api";
import type { ContractPayment } from "../../services/ContractRegistry/contractRegistry.schema";
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
 */
interface ContractPaymentFormProps {
  contractId: string | number;
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

const moneyPattern = /^\d+(\.\d{1,2})?$/;

export default function ContractPaymentForm({
  contractId,
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
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const money = amount.trim().replace(",", ".");
    if (!moneyPattern.test(money)) {
      setError("Сумма платежа — число с точностью до копеек");
      return;
    }
    if (documentNumber.trim() && documentNumber.trim().length < 3) {
      setError("Номер платёжного документа короче 3 символов");
      return;
    }

    createPayment.mutate(
      {
        contractId,
        paymentDocumentNumber: documentNumber.trim(),
        paymentDate,
        amount: money,
        paymentType,
        status,
        bankDocumentNumber: bankDocumentNumber.trim(),
        treasuryExecution,
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
