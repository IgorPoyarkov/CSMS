import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import {
  PurchaseNoteSchema,
  emptyPurchaseNote,
  nextPurchaseNoteNumber,
  type PurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.schema";
import {
  useCreatePurchaseNote,
  usePurchaseNotes,
} from "../../services/PurchaseNote/purchaseNote.api";
import { MINIMUM_SMP_REQUIRED_PERCENT } from "../../services/ContractSmp/pp1466";
import type {
  PurchasePlan,
  PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import styles from "./PurchaseNoteModal.module.scss";

/**
 * Служебная записка по позиции плана-графика (Tasks 9, п. 7, п/п 3) — вторая
 * из двух служебок, заводится кликом по позиции в карточке плана-графика.
 *
 * Она носитель требований по закупке: здесь фиксируется процент привлечения
 * СМП/СОНКО (п. 1 ПП РФ от 23.12.2016 N 1466), который наследуется вниз по
 * цепочке ПГ → СЗ → извещение → проект контракта → контракт → реестр.
 * Основание — бюджетная смета — заводится строкой: отдельной сущности сметы
 * в системе нет, бюджетная служебка в этом заходе не делается.
 */

interface PurchaseNoteModalProps {
  organizationId: string | number;
  plan: PurchasePlan;
  position: PurchasePlanPosition;
  onClose: () => void;
  // Родителю нужен результат: карточка ПГ показывает номер служебки у позиции
  onSaved?: (note: PurchaseNote) => void;
}

export default function PurchaseNoteModal({
  organizationId,
  plan,
  position,
  onClose,
  onSaved,
}: PurchaseNoteModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "purchase-note-modal");

  const { data: existingNotes = [] } = usePurchaseNotes(organizationId);
  const createNote = useCreatePurchaseNote();

  const methods = useForm({
    resolver: zodResolver(PurchaseNoteSchema),
    defaultValues: {
      ...emptyPurchaseNote(organizationId),
      noteNumber: nextPurchaseNoteNumber(existingNotes),
      purchasePlanId: plan.id,
      purchasePlanNumber: plan.planNumber,
      positionId: position.id,
      positionSerialNumber: String(position.serialNumber ?? ""),
      positionUniqueNumber: String(position.uniqueNumber ?? ""),
      subject: position.objectOfPurchase ?? "",
      initialMaxPrice: String(position.amountTotal ?? ""),
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = methods;

  const percent = Number(watch("smpRequiredPercent"));
  const price = Number.parseFloat(String(watch("initialMaxPrice") ?? ""));
  const requiredAmount =
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(percent) &&
    percent > 0
      ? Math.round(price * percent) / 100
      : null;

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function onSubmit(data: PurchaseNote) {
    createNote.mutate(data, {
      onSuccess: (created) => {
        onSaved?.(created);
        onClose();
      },
    });
  }

  return (
    <CustomModal onClose={onClose}>
      <form className={block()} onSubmit={handleSubmit(onSubmit)}>
        <header className={block("header")}>
          <h2 className={block("title")}>
            Служебная записка по позиции плана-графика
          </h2>
          <p className={block("caption")}>
            План-график {plan.planNumber} · запись №{" "}
            {position.serialNumber || "—"} · {position.objectOfPurchase}
          </p>
        </header>

        <fieldset className={block("section")}>
          <legend>Реквизиты служебной записки</legend>
          <div className={block("grid")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="note-number">
                Номер служебной записки
              </label>
              <input
                id="note-number"
                className={block("input")}
                {...register("noteNumber")}
              />
              {errorText("noteNumber") && (
                <span className={block("error")}>
                  {errorText("noteNumber")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="note-date">
                Дата служебной записки
              </label>
              <input
                id="note-date"
                className={block("input")}
                type="date"
                {...register("noteDate")}
              />
              {errorText("noteDate") && (
                <span className={block("error")}>{errorText("noteDate")}</span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="note-initiator">
                Инициатор (должность, ФИО)
              </label>
              <input
                id="note-initiator"
                className={block("input")}
                {...register("initiatorName")}
                placeholder="Начальник отдела — Иванов И. И."
              />
              {errorText("initiatorName") && (
                <span className={block("error")}>
                  {errorText("initiatorName")}
                </span>
              )}
            </div>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="note-basis">
                Основание — бюджетная смета (строкой)
              </label>
              <input
                id="note-basis"
                className={block("input")}
                {...register("basis")}
                placeholder="Бюджетная смета на 2026 год, строка 0001…"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Предмет закупки и требования</legend>
          <div className={block("grid")}>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="note-subject">
                Предмет закупки
              </label>
              <input
                id="note-subject"
                className={block("input")}
                {...register("subject")}
              />
              {errorText("subject") && (
                <span className={block("error")}>{errorText("subject")}</span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="note-nmck">
                НМЦК, рублей
              </label>
              <input
                id="note-nmck"
                className={block("input")}
                {...register("initialMaxPrice")}
                placeholder="0.00"
              />
              {errorText("initialMaxPrice") && (
                <span className={block("error")}>
                  {errorText("initialMaxPrice")}
                </span>
              )}
            </div>
            <div className={block("field", ["smp"])}>
              <label className={block("label")} htmlFor="note-smp-percent">
                Требование о привлечении СМП/СОНКО, % от цены контракта
              </label>
              <input
                id="note-smp-percent"
                className={block("input", ["code"])}
                type="number"
                min={MINIMUM_SMP_REQUIRED_PERCENT}
                max={100}
                step="1"
                {...register("smpRequiredPercent")}
              />
              {errorText("smpRequiredPercent") && (
                <span className={block("error")}>
                  {errorText("smpRequiredPercent")}
                </span>
              )}
              <p className={block("hint")}>
                Не менее {MINIMUM_SMP_REQUIRED_PERCENT}% по п. 1 типовых условий
                (ПП РФ от 23.12.2016 N 1466). Сроки подачи сведений подрядчиком
                здесь не указываются — они фиксированы теми же типовыми
                условиями.
                {requiredAmount !== null
                  ? ` Требуемый объём при НМЦК ${price.toLocaleString(
                      "ru-RU",
                    )} руб — ${requiredAmount.toLocaleString("ru-RU")} руб.`
                  : ""}
              </p>
            </div>
          </div>
        </fieldset>

        <footer className={block("footer")}>
          {createNote.isError && (
            <span className={block("error")}>
              Служебная записка не сохранена: {String(createNote.error)}
            </span>
          )}
          <div className={block("footer-actions")}>
            <button
              type="button"
              onClick={onClose}
              disabled={createNote.isPending}
            >
              Отмена
            </button>
            <button type="submit" disabled={createNote.isPending}>
              {createNote.isPending ? "Сохранение..." : "Сохранить служебку"}
            </button>
          </div>
        </footer>
      </form>
    </CustomModal>
  );
}
