import { useState } from "react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import {
  useCurrentOrganization,
  useUpdateOrganization,
} from "../../services/Organization/organization.api";
import type {
  BudgetPart13Art44Requisites,
  OrganizationProcurementRequisites,
  OrganizationSecurityAccount,
} from "../../services/Organization/organization.schema";
import SecurityRequisitesFields from "../PurchaseNote/SecurityRequisitesFields";
import styles from "./ContractServicePage.module.scss";

/**
 * Карточка платёжных реквизитов заказчика для обеспечений (ст. 44, ст. 96).
 *
 * Заполняется и актуализируется членом контрактной службы, чтобы при
 * формировании потребности (СЗ) и извещения реквизиты подставлялись
 * автоматически без повторного ручного набора.
 */
export default function CustomerProcurementRequisitesCard() {
  const { bem, fullName } = useUtils();
  const block = bem(styles, "contract-service");
  const { data: organization } = useCurrentOrganization();
  const { employee, canEditCustomerRequisites } = useMyContractRole();
  const updateOrg = useUpdateOrganization();

  const savedReqs = organization?.procurementRequisites;

  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrganizationProcurementRequisites>(() => ({
    securityRequisites: savedReqs?.securityRequisites ?? {
      recipientName: organization?.fullName ?? "",
      recipientInn: organization?.inn ?? "",
      recipientKpp: organization?.kpp ?? "",
    },
    budgetPart13Art44Requisites: savedReqs?.budgetPart13Art44Requisites ?? {
      recipientName: organization?.fullName ?? "",
      recipientInn: organization?.inn ?? "",
      recipientKpp: organization?.kpp ?? "",
    },
    defaultApplicationSecurityOrder:
      savedReqs?.defaultApplicationSecurityOrder ?? "",
    defaultContractSecurityOrder: savedReqs?.defaultContractSecurityOrder ?? "",
    defaultWarrantySecurityOrder: savedReqs?.defaultWarrantySecurityOrder ?? "",
  }));

  if (!organization) return null;

  const openEdit = () => {
    setSaveMessage(null);
    setDraft({
      securityRequisites: organization.procurementRequisites
        ?.securityRequisites ?? {
        recipientName: organization.fullName ?? "",
        recipientInn: organization.inn ?? "",
        recipientKpp: organization.kpp ?? "",
      },
      budgetPart13Art44Requisites: organization.procurementRequisites
        ?.budgetPart13Art44Requisites ?? {
        recipientName: organization.fullName ?? "",
        recipientInn: organization.inn ?? "",
        recipientKpp: organization.kpp ?? "",
      },
      defaultApplicationSecurityOrder:
        organization.procurementRequisites?.defaultApplicationSecurityOrder ??
        "",
      defaultContractSecurityOrder:
        organization.procurementRequisites?.defaultContractSecurityOrder ?? "",
      defaultWarrantySecurityOrder:
        organization.procurementRequisites?.defaultWarrantySecurityOrder ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!canEditCustomerRequisites || !organization.id) return;
    const authorName = employee?.employee
      ? fullName(employee.employee)
      : undefined;

    updateOrg.mutate(
      {
        id: organization.id,
        patch: {
          procurementRequisites: {
            ...draft,
            updatedAt: new Date().toISOString().slice(0, 10),
            updatedByName: authorName,
          },
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setSaveMessage("Платёжные реквизиты заказчика актуализированы.");
        },
      },
    );
  };

  const sec = savedReqs?.securityRequisites;
  const bud = savedReqs?.budgetPart13Art44Requisites;

  return (
    <section className={block("education-summary")}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div>
          <h3 className={block("education-summary-title")}>
            Реквизиты заказчика для перечисления обеспечений (ст. 44, ст. 96)
          </h3>
          <p className={block("education-summary-lead")}>
            Вносит и актуализирует член контрактной службы; реквизиты
            автоматически подставляются в форму потребности (СЗ) и извещение.
            {savedReqs?.updatedAt
              ? ` Актуализировано ${savedReqs.updatedAt}${savedReqs.updatedByName ? ` (${savedReqs.updatedByName})` : ""}.`
              : ""}
          </p>
        </div>

        {canEditCustomerRequisites && !isEditing && (
          <button
            type="button"
            className={block("edit-button")}
            onClick={openEdit}
          >
            {savedReqs ? "Актуализировать реквизиты" : "Внести реквизиты"}
          </button>
        )}
      </div>

      {saveMessage && <p className={block("status")}>{saveMessage}</p>}

      {!isEditing ? (
        <dl className={block("requisites")}>
          <div className={block("requisite")}>
            <dt>Получатель (ИНН / КПП)</dt>
            <dd>
              {sec?.recipientName || organization.fullName} (
              {sec?.recipientInn || organization.inn} /{" "}
              {sec?.recipientKpp || organization.kpp || "—"})
            </dd>
          </div>
          <div className={block("requisite")}>
            <dt>Расчётный / лицевой счёт и БИК</dt>
            <dd>
              {sec?.settlementAccount || sec?.personalAccount || sec?.bik
                ? `Р/с ${sec.settlementAccount || "—"}, Л/с ${sec.personalAccount || "—"}, БИК ${sec.bik || "—"}`
                : "не заполнены"}
            </dd>
          </div>
          <div className={block("requisite")}>
            <dt>Бюджетный счёт по ч. 13 ст. 44 (КБК / ОКТМО / ТОФК)</dt>
            <dd>
              {bud?.incomeKbk || bud?.treasuryAccount || bud?.bikTofk
                ? `КБК ${bud.incomeKbk || "—"}, ОКТМО ${bud.oktmo || "—"}, КС ${bud.treasuryAccount || "—"}, БИК ТОФК ${bud.bikTofk || "—"}`
                : "не заполнены"}
            </dd>
          </div>
        </dl>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "10px",
          }}
        >
          <SecurityRequisitesFields
            idPrefix="org-req"
            title="Базовые реквизиты счёта заказчика для обеспечений"
            account={draft.securityRequisites}
            onAccountChange={(next: OrganizationSecurityAccount) =>
              setDraft((prev) => ({ ...prev, securityRequisites: next }))
            }
            showBudgetPart13Art44
            budgetAccount={draft.budgetPart13Art44Requisites}
            onBudgetAccountChange={(next: BudgetPart13Art44Requisites) =>
              setDraft((prev) => ({
                ...prev,
                budgetPart13Art44Requisites: next,
              }))
            }
            disabled={!canEditCustomerRequisites}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "10px",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <span>Типовой порядок внесения обеспечения заявки</span>
              <textarea
                rows={2}
                value={draft.defaultApplicationSecurityOrder ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    defaultApplicationSecurityOrder: e.target.value,
                  }))
                }
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <span>Типовой порядок внесения обеспечения контракта</span>
              <textarea
                rows={2}
                value={draft.defaultContractSecurityOrder ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    defaultContractSecurityOrder: e.target.value,
                  }))
                }
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <span>Типовой порядок внесения обеспечения гарантии</span>
              <textarea
                rows={2}
                value={draft.defaultWarrantySecurityOrder ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    defaultWarrantySecurityOrder: e.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={block("edit-button")}
              disabled={updateOrg.isPending}
              onClick={handleSave}
            >
              {updateOrg.isPending ? "Сохранение…" : "Сохранить реквизиты"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={updateOrg.isPending}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
