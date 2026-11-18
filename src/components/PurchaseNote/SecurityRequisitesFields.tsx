import type {
  BudgetPart13Art44Requisites,
  OrganizationSecurityAccount,
} from "../../services/Organization/organization.schema";
import styles from "./PurchaseNoteModal.module.scss";

interface SecurityRequisitesFieldsProps {
  idPrefix: string;
  title?: string;
  account?: OrganizationSecurityAccount;
  onAccountChange: (next: OrganizationSecurityAccount) => void;
  showBudgetPart13Art44?: boolean;
  budgetAccount?: BudgetPart13Art44Requisites;
  onBudgetAccountChange?: (next: BudgetPart13Art44Requisites) => void;
  disabled?: boolean;
}

/**
 * Поля платёжных реквизитов для перечисления обеспечения (заявки, контракта,
 * гарантийных обязательств) и подраздел бюджетного счёта по ч. 13 ст. 44 44-ФЗ.
 */
export default function SecurityRequisitesFields({
  idPrefix,
  title = "Реквизиты счёта для перечисления обеспечения",
  account = {},
  onAccountChange,
  showBudgetPart13Art44 = false,
  budgetAccount = {},
  onBudgetAccountChange,
  disabled = false,
}: SecurityRequisitesFieldsProps) {
  const patchAccount = (patch: Partial<OrganizationSecurityAccount>) =>
    onAccountChange({ ...account, ...patch });

  const patchBudget = (patch: Partial<BudgetPart13Art44Requisites>) =>
    onBudgetAccountChange?.({ ...budgetAccount, ...patch });

  return (
    <div className={styles["purchase-note-modal__subbox"]}>
      <p className={styles["purchase-note-modal__subbox-title"]}>{title}</p>
      <div className={styles["purchase-note-modal__grid"]}>
        <div
          className={`${styles["purchase-note-modal__field"]} ${styles["purchase-note-modal__field--wide"]}`}
        >
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-recipient-name`}
          >
            Получатель платежа
          </label>
          <input
            id={`${idPrefix}-recipient-name`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.recipientName ?? ""}
            onChange={(e) => patchAccount({ recipientName: e.target.value })}
            placeholder="Полное наименование заказчика / УФК"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-recipient-inn`}
          >
            ИНН получателя
          </label>
          <input
            id={`${idPrefix}-recipient-inn`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.recipientInn ?? ""}
            onChange={(e) => patchAccount({ recipientInn: e.target.value })}
            placeholder="10 цифр"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-recipient-kpp`}
          >
            КПП получателя
          </label>
          <input
            id={`${idPrefix}-recipient-kpp`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.recipientKpp ?? ""}
            onChange={(e) => patchAccount({ recipientKpp: e.target.value })}
            placeholder="9 цифр"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-settlement`}
          >
            Расчётный / казначейский счёт
          </label>
          <input
            id={`${idPrefix}-settlement`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.settlementAccount ?? ""}
            onChange={(e) =>
              patchAccount({ settlementAccount: e.target.value })
            }
            placeholder="20 цифр"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-personal`}
          >
            Лицевой счёт
          </label>
          <input
            id={`${idPrefix}-personal`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.personalAccount ?? ""}
            onChange={(e) => patchAccount({ personalAccount: e.target.value })}
            placeholder="Номер лицевого счёта"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-bik`}
          >
            БИК банка / ТОФК
          </label>
          <input
            id={`${idPrefix}-bik`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.bik ?? ""}
            onChange={(e) => patchAccount({ bik: e.target.value })}
            placeholder="9 цифр"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-bank`}
          >
            Наименование банка
          </label>
          <input
            id={`${idPrefix}-bank`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.bankName ?? ""}
            onChange={(e) => patchAccount({ bankName: e.target.value })}
            placeholder="ОТДЕЛЕНИЕ КУРСК БАНКА РОССИИ // УФК…"
          />
        </div>

        <div className={styles["purchase-note-modal__field"]}>
          <label
            className={styles["purchase-note-modal__label"]}
            htmlFor={`${idPrefix}-corr`}
          >
            Корреспондентский / ЕКС счёт
          </label>
          <input
            id={`${idPrefix}-corr`}
            className={styles["purchase-note-modal__input"]}
            disabled={disabled}
            value={account.correspondentAccount ?? ""}
            onChange={(e) =>
              patchAccount({ correspondentAccount: e.target.value })
            }
            placeholder="20 цифр"
          />
        </div>
      </div>

      {showBudgetPart13Art44 && onBudgetAccountChange && (
        <div className={styles["purchase-note-modal__nested-box"]}>
          <p className={styles["purchase-note-modal__subbox-title"]}>
            Реквизиты счета для перечисления денежных средств в случае,
            предусмотренном ч. 13 ст. 44 Закона № 44-ФЗ (в соответствующий
            бюджет бюджетной системы Российской Федерации)
          </p>
          <div className={styles["purchase-note-modal__grid"]}>
            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-inn`}
              >
                ИНН получателя
              </label>
              <input
                id={`${idPrefix}-b-inn`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.recipientInn ?? ""}
                onChange={(e) => patchBudget({ recipientInn: e.target.value })}
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-kpp`}
              >
                КПП получателя
              </label>
              <input
                id={`${idPrefix}-b-kpp`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.recipientKpp ?? ""}
                onChange={(e) => patchBudget({ recipientKpp: e.target.value })}
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-kbk`}
              >
                КБК доходов
              </label>
              <input
                id={`${idPrefix}-b-kbk`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.incomeKbk ?? ""}
                onChange={(e) => patchBudget({ incomeKbk: e.target.value })}
                placeholder="20 знаков"
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-oktmo`}
              >
                ОКТМО
              </label>
              <input
                id={`${idPrefix}-b-oktmo`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.oktmo ?? ""}
                onChange={(e) => patchBudget({ oktmo: e.target.value })}
                placeholder="8 или 11 знаков"
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-eks`}
              >
                Номер единого казначейского счета
              </label>
              <input
                id={`${idPrefix}-b-eks`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.singleTreasuryAccount ?? ""}
                onChange={(e) =>
                  patchBudget({ singleTreasuryAccount: e.target.value })
                }
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-ks`}
              >
                Номер казначейского счета
              </label>
              <input
                id={`${idPrefix}-b-ks`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.treasuryAccount ?? ""}
                onChange={(e) =>
                  patchBudget({ treasuryAccount: e.target.value })
                }
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-bik`}
              >
                БИК ТОФК
              </label>
              <input
                id={`${idPrefix}-b-bik`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.bikTofk ?? ""}
                onChange={(e) => patchBudget({ bikTofk: e.target.value })}
              />
            </div>

            <div className={styles["purchase-note-modal__field"]}>
              <label
                className={styles["purchase-note-modal__label"]}
                htmlFor={`${idPrefix}-b-name`}
              >
                Получатель
              </label>
              <input
                id={`${idPrefix}-b-name`}
                className={styles["purchase-note-modal__input"]}
                disabled={disabled}
                value={budgetAccount.recipientName ?? ""}
                onChange={(e) => patchBudget({ recipientName: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
