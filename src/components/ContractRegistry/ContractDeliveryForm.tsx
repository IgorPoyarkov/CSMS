import { useState, type FormEvent } from "react";
import { useCreateDelivery } from "../../services/ContractRegistry/contractRegistry.api";
import type { ContractDelivery } from "../../services/ContractRegistry/contractRegistry.schema";
import { readApiError } from "../../services/csmsApi";
import styles from "./ContractRegistry.module.scss";
import Select from "../UI/Select";

/**
 * Ручной ввод поставки и результата приёмки (ст. 94 44-ФЗ).
 *
 * Это упрощённый реестр для случаев, когда документ оформлен на бумаге или
 * пришёл из ЕИС выгрузкой. Полный сценарий приёмки с расхождениями, отказом и
 * регистрацией в ЕИС ведёт модуль электронного актирования — ссылка на него
 * стоит в подвале секции.
 */
interface ContractDeliveryFormProps {
  contractId: string | number;
  onDone: () => void;
}

const deliveryResults: ContractDelivery["result"][] = [
  "accepted",
  "accepted_with_notes",
  "rejected",
];

const deliveryResultLabels: Record<ContractDelivery["result"], string> = {
  accepted: "Принято",
  accepted_with_notes: "Принято с замечаниями",
  rejected: "Отклонено",
};

const moneyPattern = /^\d+(\.\d{1,2})?$/;

export default function ContractDeliveryForm({
  contractId,
  onDone,
}: ContractDeliveryFormProps) {
  const createDelivery = useCreateDelivery();

  const [itemName, setItemName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [actNumber, setActNumber] = useState("");
  const [actDate, setActDate] = useState("");
  const [result, setResult] =
    useState<ContractDelivery["result"]>("accepted");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (itemName.trim().length < 5) {
      setError("Наименование — не короче 5 символов");
      return;
    }
    const money = amount.trim().replace(",", ".");
    if (money !== "" && !moneyPattern.test(money)) {
      setError("Сумма поставки — число с точностью до копеек");
      return;
    }
    if (actNumber.trim() && actNumber.trim().length < 3) {
      setError("Номер акта приёмки короче 3 символов");
      return;
    }

    createDelivery.mutate(
      {
        contractId,
        itemName: itemName.trim(),
        deliveryDate,
        quantity: quantity.trim(),
        unit: unit.trim(),
        amount: money,
        acceptanceActNumber: actNumber.trim(),
        acceptanceActDate: actDate,
        result,
        notes: notes.trim(),
      },
      {
        onSuccess: onDone,
        onError: (mutationError) =>
          setError(
            readApiError(mutationError, "Не удалось сохранить поставку."),
          ),
      },
    );
  }

  return (
    <form className={styles.inlineForm} onSubmit={handleSubmit}>
      <label className={styles.inlineField}>
        <span>Наименование</span>
        <input
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          placeholder="товар, работа или услуга"
        />
      </label>

      <label className={styles.inlineField}>
        <span>Дата поставки</span>
        <input
          type="date"
          value={deliveryDate}
          onChange={(event) => setDeliveryDate(event.target.value)}
        />
      </label>

      <label className={styles.inlineField}>
        <span>Количество</span>
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="10"
        />
      </label>

      <label className={styles.inlineField}>
        <span>Единица измерения</span>
        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          placeholder="шт."
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
        <span>№ акта приёмки</span>
        <input
          value={actNumber}
          onChange={(event) => setActNumber(event.target.value)}
          placeholder="например, 12"
        />
      </label>

      <label className={styles.inlineField}>
        <span>Дата акта</span>
        <input
          type="date"
          value={actDate}
          onChange={(event) => setActDate(event.target.value)}
        />
      </label>

      <label className={styles.inlineField}>
        <span>Результат приёмки</span>
        <Select
          value={result}
          onChange={(event) =>
            setResult(event.target.value as ContractDelivery["result"])
          }
        >
          {deliveryResults.map((value) => (
            <option key={value} value={value}>
              {deliveryResultLabels[value]}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.inlineField}>
        <span>Замечания</span>
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="если есть"
        />
      </label>

      {error && <p className={styles.inlineError}>{error}</p>}

      <div className={styles.inlineFormActions}>
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={createDelivery.isPending}
        >
          {createDelivery.isPending ? "Сохранение…" : "Сохранить акт"}
        </button>
        <button
          type="button"
          className={styles.btnSmall}
          onClick={onDone}
          disabled={createDelivery.isPending}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
