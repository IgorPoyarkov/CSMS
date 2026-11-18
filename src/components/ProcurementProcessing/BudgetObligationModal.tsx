import { useState, type FormEvent } from "react";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import MoneyInput from "../UI/MoneyInput/MoneyInput";
import { useCreateBudgetObligation } from "../../services/Procurements/procurement.api";
import type {
  BudgetObligation,
  Procurement,
} from "../../services/Procurements/procurement.schema";
import styles from "./BudgetObligationModal.module.scss";

interface BudgetObligationModalProps {
  procurement: Procurement;
  organizationId?: string | number;
  onClose: () => void;
  onCreated?: (obligation: BudgetObligation) => void;
}

/**
 * Формирование бюджетного обязательства по текущему извещению.
 *
 * Номер обязательства формируется по извещению (БО-<номер|id>-<год>),
 * КБК и сумма предзаполняются из закупки. Запись уходит в коллекцию
 * `budgetObligations`, чтобы её можно было показать в реестре и выгрузить.
 */
const BudgetObligationModal = ({
  procurement,
  organizationId,
  onClose,
  onCreated,
}: BudgetObligationModalProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "budget-obligation");

  const today = new Date().toISOString().slice(0, 10);
  const obligationNumber = `БО-${
    procurement.noticeNumber || procurement.id
  }-${today.slice(0, 4)}`;

  const [obligationDate, setObligationDate] = useState(today);
  const [kbk, setKbk] = useState(procurement.kbk ?? "");
  const [amount, setAmount] = useState<number | string>(procurement.nmck);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createObligation, isPending } = useCreateBudgetObligation();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Укажите сумму бюджетного обязательства больше нуля.");
      return;
    }
    if (!kbk.trim()) {
      setError("Укажите КБК бюджетного обязательства.");
      return;
    }

    createObligation(
      {
        organizationId,
        procurementId: procurement.id,
        ikz: procurement.ikz,
        noticeNumber: procurement.noticeNumber,
        obligationNumber,
        obligationDate,
        kbk: kbk.trim(),
        amount: numericAmount.toFixed(2),
        comment: comment.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: (created) => {
          onCreated?.(created);
          onClose();
        },
        onError: () => {
          setError("Не удалось сохранить бюджетное обязательство.");
        },
      },
    );
  };

  return (
    <CustomModal onClose={onClose}>
      <form className={block()} onSubmit={handleSubmit}>
        <h2 className={block("title")}>Бюджетное обязательство</h2>
        <p className={block("hint")}>
          Извещение {procurement.noticeNumber || "не размещено"} · ИКЗ{" "}
          {procurement.ikz}
        </p>

        <div className={block("grid")}>
          <div className={block("field")}>
            <span className={block("label")}>Номер обязательства</span>
            <input
              className={block("input")}
              value={obligationNumber}
              readOnly
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="bo-date">
              Дата обязательства
            </label>
            <input
              id="bo-date"
              className={block("input")}
              type="date"
              value={obligationDate}
              onChange={(event) => setObligationDate(event.target.value)}
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="bo-kbk">
              КБК
            </label>
            <input
              id="bo-kbk"
              className={block("input")}
              value={kbk}
              onChange={(event) => setKbk(event.target.value)}
              placeholder="20 цифр"
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="bo-amount">
              Сумма, руб.
            </label>
            <MoneyInput
              id="bo-amount"
              className={block("input")}
              value={amount}
              onChange={(next) => setAmount(next)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="bo-comment">
              Примечание
            </label>
            <textarea
              id="bo-comment"
              className={block("textarea")}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Например: принято на учёт по извещению"
            />
          </div>
        </div>

        {error && (
          <p className={block("error")} role="alert">
            {error}
          </p>
        )}

        <div className={block("actions")}>
          <button
            type="button"
            className={block("btn")}
            onClick={onClose}
            disabled={isPending}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={block("btn", ["primary"])}
            disabled={isPending}
          >
            {isPending ? "Формируем…" : "Сформировать"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default BudgetObligationModal;
