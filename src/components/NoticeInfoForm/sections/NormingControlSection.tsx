import { useFormContext } from "react-hook-form";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { useOkpd2Dictionary } from "../../../services/Okpd2Ref/okpd2Ref.api";
import {
  collectNormingViolations,
  formatRub,
} from "../../../services/Okpd2Ref/normingControl";
import LegalActRefs from "../../LegalAct/LegalActRefs";
import styles from "../NoticeInfoForm.module.scss";

/**
 * Подпись главного подписанта под нарушением нормирования (ПП РФ N 926 от
 * 02.09.2015). Пока цена единицы нормируемой позиции превышает предельную и
 * обоснование не подписано, извещение считается с ошибкой и не сохраняется.
 * Опустить контроль вправе только руководитель контрактной службы либо
 * контрактный управляющий — он подписывает, что организация идёт на нарушение
 * осознанно. Подпись фиксируется в извещении и может быть отозвана, пока
 * извещение не размещено.
 */
const NormingControlSection = () => {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "eis-main");
  const {
    watch,
    setValue,
    register,
    formState: { errors },
  } = useFormContext<NoticeInfoFormValues>();
  const { isHead, myRole } = useMyContractRole();

  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const items = watch("purchaseObjects.items") ?? [];
  const signedByName = watch("normingControl.breachConfirmedByName");
  const signedByDate = watch("normingControl.breachConfirmedDate");
  const signedReason = watch("normingControl.breachReason");

  const violations = collectNormingViolations(
    items.map((item) => ({
      code: item.okpd2OrKtruCode,
      unitPrice: item.unitPrice,
    })),
    okpd2Refs,
  );

  // Снятие подписи: контроль нормирования снова работает в полном объёме
  const clearSignature = () => {
    setValue("normingControl.breachConfirmedByName", "", {
      shouldValidate: true,
    });
    setValue("normingControl.breachConfirmedDate", "", {
      shouldValidate: true,
    });
  };

  // Подпись без нарушений контроля не нужна — предлагаем её отозвать, чтобы в
  // размещённом извещении не осталось ложного основания
  if (violations.length === 0) {
    if (!signedByName) {
      return null;
    }

    return (
      <section className={block("section")}>
        <h2 className={block("section-title")}>Контроль нормирования</h2>
        <div className={block("yellow-warning")}>
          <span className={block("warning-badge")}>!</span>
          <span>
            Превышений предельных цен нет, подпись главного подписанта (
            {signedByName}) не требуется.
          </span>
          <button
            type="button"
            className={block("link-btn")}
            onClick={clearSignature}
          >
            Отозвать подпись
          </button>
        </div>
      </section>
    );
  }

  const signerFullName = myRole?.employeeFullName ?? "";
  const canSign = isHead && Boolean(signerFullName);
  const reasonMissing = !(signedReason ?? "").trim();

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Контроль нормирования</h2>

      <ul className={block("norm-list")}>
        {violations.map((violation) => (
          <li key={violation.index} className={block("norm-item")}>
            Позиция {violation.index + 1} ({violation.code} — {violation.name}):
            цена за единицу {formatRub(violation.unitPrice)} при предельной{" "}
            {formatRub(violation.normLimit)}, превышение{" "}
            {formatRub(violation.excess)}
          </li>
        ))}
      </ul>

      {signedByName ? (
        <div className={block("yellow-warning")}>
          <span className={block("warning-badge")}>!</span>
          <span>
            Нарушение нормирования принято главным подписантом {signedByName}
            {signedByDate ? ` от ${formatDate(signedByDate)}` : ""}. Основание:{" "}
            {signedReason || "не указано"}. Контроль опущен, извещение
            сохраняется с зафиксированным нарушением.
          </span>
          <button
            type="button"
            className={block("link-btn")}
            onClick={clearSignature}
          >
            Отозвать подпись
          </button>
        </div>
      ) : (
        <div className={block("danger-warning")}>
          <span className={block("danger-badge")}>!</span>
          <div className={block("field-col")}>
            <span>
              Цена единицы нормируемой позиции не может превышать предельную (ПП
              РФ N 926). Сохранение извещения заблокировано: снижение контроля
              возможно только после подписи главного подписанта — руководитель
              контрактной службы или контрактный управляющий.
            </span>
            <span className={block("caption")}>
              Основание нарушения нормирования (метод обоснования НМЦК, ссылки
              на правовые акты)
            </span>
            <textarea
              className={block("textarea")}
              rows={2}
              placeholder="Например: позицией 7 ПП РФ N 926 предельная цена не установлена для конкретного исполнения"
              {...register("normingControl.breachReason")}
            />
            <button
              type="button"
              className={block("small-btn", ["danger"])}
              disabled={!canSign || reasonMissing}
              onClick={() => {
                setValue(
                  "normingControl.breachConfirmedByName",
                  signerFullName,
                  {
                    shouldValidate: true,
                  },
                );
                setValue(
                  "normingControl.breachConfirmedDate",
                  new Date().toISOString().slice(0, 10),
                  {
                    shouldValidate: true,
                  },
                );
              }}
            >
              Подписать нарушение главным подписантом
            </button>
            {!canSign && (
              <span className={block("red-note")}>
                {isHead
                  ? "Не удалось определить ФИО подписанта в составе контрактной службы."
                  : "Опустить контроль нормирования может только руководитель контрактной службы (контрактный управляющий)."}
              </span>
            )}
            {reasonMissing && (
              <span className={block("red-note")}>
                Без основания нарушение подписать нельзя.
              </span>
            )}
            {errors.normingControl?.breachConfirmedByName?.message && (
              <span className={block("red-note")}>
                {errors.normingControl.breachConfirmedByName.message}
              </span>
            )}
            {/* Реквизиты акта берутся из реестра: правка нормы уходит в одну
                запись реестра, а не в текст этого предупреждения */}
            <LegalActRefs
              component="NormingControlSection"
              caption="Контроль по актам"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default NormingControlSection;
