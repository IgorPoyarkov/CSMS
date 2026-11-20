import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import Loader from "../UI/Loader";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import {
  useAcceptance,
  useAcceptanceMeta,
  useCreateAcceptance,
  useUpdateAcceptance,
  useValidateAcceptance,
} from "../../services/Acceptance/acceptance.api";
import type {
  AcceptanceIssue,
  AcceptanceKind,
} from "../../services/Acceptance/acceptance.types";
import { readApiError } from "../../services/csmsApi";
import {
  acceptanceActor,
  acceptanceFormFrom,
  acceptanceKindLabels,
  addWorkingDaysIso,
  buildAcceptanceInput,
  emptyAcceptanceForm,
  formatMoney,
  issueIsError,
  maxReviewTermDays,
  validateAcceptanceForm,
  type AcceptanceFormState,
  type FormErrors,
} from "./acceptance.config";
import styles from "./Acceptance.module.scss";

/**
 * Форма документа о приёмке.
 *
 * Снимок контракта берётся из реестра и дальше хранится вместе с документом:
 * модуль не пересчитывает условия по текущей карточке. Юридические проверки
 * ст. 94 выполняет сервер — кнопка «Проверить по правилам» вызывает тот же
 * код, что и сохранение.
 */
export default function AcceptanceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "acceptance");

  const isEdit = Boolean(id);
  const { organization, employee, user } = useMyContractRole();
  const orgId = organization ? String(organization.id) : "";
  const actor = acceptanceActor(employee, user?.email);

  const { data: contracts = [] } = useContractRegistry(orgId || undefined);
  const { data: meta } = useAcceptanceMeta();
  const { data: existing, isLoading: isExistingLoading } = useAcceptance(id);

  const createMutation = useCreateAcceptance();
  const updateMutation = useUpdateAcceptance();
  const validateMutation = useValidateAcceptance();

  const [form, setForm] = useState<AcceptanceFormState>(emptyAcceptanceForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverIssues, setServerIssues] = useState<AcceptanceIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const contract = useMemo(
    () => contracts.find((item) => String(item.id) === form.contractId),
    [contracts, form.contractId],
  );

  const reviewDeadline = useMemo(() => {
    const term = Number(form.acceptanceTermDays);

    return form.documentDate && Number.isFinite(term) && term > 0
      ? addWorkingDaysIso(form.documentDate, term)
      : "";
  }, [form.documentDate, form.acceptanceTermDays]);

  useEffect(() => {
    if (existing) {
      setForm(acceptanceFormFrom(existing.input));
    }
  }, [existing]);

  useEffect(() => {
    if (isEdit || !contracts.length) return;

    const preset = searchParams.get("contractId");
    if (!preset) return;

    const found = contracts.find((item) => String(item.id) === preset);
    if (found) {
      setForm((current) => ({ ...current, ...snapshotOf(found) }));
    }
  }, [contracts, isEdit, searchParams]);

  const setField = <K extends keyof AcceptanceFormState>(
    key: K,
    value: AcceptanceFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;

      const next = { ...current };
      delete next[key as string];

      return next;
    });
  };

  const pickContract = (contractId: string) => {
    const found = contracts.find((item) => String(item.id) === contractId);

    if (!found) {
      setField("contractId", contractId);
      return;
    }

    setForm((current) => ({ ...current, ...snapshotOf(found) }));
  };

  const buildInput = () => buildAcceptanceInput(form, orgId, actor);

  const handleCheck = async () => {
    setSubmitError(null);
    setErrors(validateAcceptanceForm(form));

    try {
      const issues = await validateMutation.mutateAsync(buildInput());
      setServerIssues(issues);
    } catch (error) {
      setSubmitError(readApiError(error, "Не удалось проверить условия."));
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const nextErrors = validateAcceptanceForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      const input = buildInput();

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, input, actor });
        navigate(`/acceptances/${id}`);
        return;
      }

      const created = await createMutation.mutateAsync(input);
      navigate(`/acceptances/${created.id}`);
    } catch (error) {
      setSubmitError(
        readApiError(
          error,
          "Не удалось сохранить документ. Проверьте условия.",
        ),
      );
    }
  };

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    validateMutation.isPending;

  if (isEdit && isExistingLoading) {
    return (
      <main className={block()}>
        <div className={block("loading")}>
          <Loader count={3} size={260} />
        </div>
      </main>
    );
  }

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>
            {isEdit ? "Редактирование документа о приёмке" : "Новая приёмка"}
          </h1>
          <p className={block("subtitle")}>
            Снимок контракта сохраняется вместе с документом. Позиции и
            недостатки добавляются в карточке; правила ст. 94 44-ФЗ проверяются
            на сервере.
          </p>
        </div>

        <div className={block("header-actions")}>
          <button
            type="button"
            className={block("secondary")}
            onClick={() => navigate("/acceptances")}
          >
            К реестру
          </button>
        </div>
      </header>

      {!orgId && (
        <p className={block("alert")}>
          Организация не определена: войдите в учётную запись сотрудника.
        </p>
      )}

      {submitError && (
        <div className={block("alert", ["error"])}>
          <span>{submitError}</span>
        </div>
      )}

      {serverIssues.length > 0 && (
        <ul className={block("issues")}>
          {serverIssues.map((issue, index) => (
            <li
              key={`${issue.field}-${index}`}
              className={block("issue", [
                issueIsError(issue.severity) ? "error" : "",
              ])}
            >
              <span className={block("issue-field")}>{issue.field}</span>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <section className={block("section")}>
        <h2 className={block("section-title")}>Контракт</h2>

        <div className={block("grid")}>
          <label className={block("field", ["wide"])}>
            <span className={block("field-label")}>Контракт из реестра</span>
            <select
              className={block("select")}
              value={form.contractId}
              disabled={isEdit}
              onChange={(event) => pickContract(event.target.value)}
            >
              <option value="">Выберите контракт</option>
              {contracts.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  № {item.contractNumber} — {item.contractName}
                </option>
              ))}
            </select>
            {errors.contractId && (
              <span className={block("field-error")}>{errors.contractId}</span>
            )}
          </label>

          <ReadonlyField
            block={block}
            label="Заказчик"
            value={form.customerName || "—"}
          />
          <ReadonlyField
            block={block}
            label="Поставщик"
            value={form.supplierName || "—"}
          />
          <ReadonlyField
            block={block}
            label="ИНН поставщика"
            value={form.supplierInn || "—"}
          />
          <ReadonlyField
            block={block}
            label="Цена контракта"
            value={`${formatMoney(
              form.contractPrice ? Number(form.contractPrice) : null,
            )} ₽`}
          />
          <ReadonlyField
            block={block}
            label="Дата заключения"
            value={formatDate(form.contractDate) || "—"}
          />
          <ReadonlyField
            block={block}
            label="Реестровый номер ЕИС"
            value={form.eisRegistryNumber || "—"}
          />
        </div>

        {!contract && form.contractId && (
          <p className={block("section-note")}>
            Контракт с идентификатором {form.contractId} не найден в реестре:
            снимок сохранён в документе, но проверить статус по карточке нельзя.
          </p>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Документ</h2>

        <div className={block("grid")}>
          <label className={block("field")}>
            <span className={block("field-label")}>Вид документа</span>
            <select
              className={block("select")}
              value={form.kind}
              disabled={isEdit}
              onChange={(event) =>
                setField("kind", event.target.value as AcceptanceKind)
              }
            >
              {(Object.keys(acceptanceKindLabels) as AcceptanceKind[]).map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {acceptanceKindLabels[kind]}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>Номер документа</span>
            <input
              className={block("input")}
              value={form.documentNumber}
              onChange={(event) =>
                setField("documentNumber", event.target.value)
              }
            />
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>Дата документа</span>
            <input
              type="date"
              className={block("input")}
              value={form.documentDate}
              onChange={(event) => setField("documentDate", event.target.value)}
            />
            {errors.documentDate && (
              <span className={block("field-error")}>
                {errors.documentDate}
              </span>
            )}
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>
              Срок приёмки, рабочих дней
            </span>
            <input
              type="number"
              min={1}
              max={maxReviewTermDays}
              className={block("input")}
              value={form.acceptanceTermDays}
              onChange={(event) =>
                setField("acceptanceTermDays", event.target.value)
              }
            />
            {errors.acceptanceTermDays ? (
              <span className={block("field-error")}>
                {errors.acceptanceTermDays}
              </span>
            ) : (
              <span className={block("field-hint")}>
                Предельный срок рассмотрения — до {maxReviewTermDays} дней
                {reviewDeadline
                  ? `; документ рассмотреть до ${reviewDeadline}`
                  : ""}
                .
              </span>
            )}
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>Номер этапа</span>
            <input
              type="number"
              min={1}
              className={block("input")}
              value={form.stageNumber}
              onChange={(event) => setField("stageNumber", event.target.value)}
            />
            {errors.stageNumber && (
              <span className={block("field-error")}>{errors.stageNumber}</span>
            )}
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>Наименование этапа</span>
            <input
              className={block("input")}
              value={form.stageName}
              onChange={(event) => setField("stageName", event.target.value)}
            />
          </label>

          <label className={block("field", ["wide"])}>
            <span className={block("field-label")}>Место приёмки</span>
            <input
              className={block("input")}
              value={form.deliveryPlace}
              onChange={(event) =>
                setField("deliveryPlace", event.target.value)
              }
            />
          </label>

          <label className={block("field", ["wide"])}>
            <span className={block("field-label")}>Примечания</span>
            <textarea
              className={block("textarea")}
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </label>
        </div>
      </section>

      {form.kind === "Correction" && (
        <section className={block("section")}>
          <h2 className={block("section-title")}>Исправляемый документ</h2>

          <div className={block("grid")}>
            <label className={block("field")}>
              <span className={block("field-label")}>
                Номер исправляемого документа
              </span>
              <input
                className={block("input")}
                value={form.correctedDocumentNumber}
                onChange={(event) =>
                  setField("correctedDocumentNumber", event.target.value)
                }
              />
              {errors.correctedDocumentNumber && (
                <span className={block("field-error")}>
                  {errors.correctedDocumentNumber}
                </span>
              )}
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>
                Дата исправляемого документа
              </span>
              <input
                type="date"
                className={block("input")}
                value={form.correctedDocumentDate}
                onChange={(event) =>
                  setField("correctedDocumentDate", event.target.value)
                }
              />
              {errors.correctedDocumentDate && (
                <span className={block("field-error")}>
                  {errors.correctedDocumentDate}
                </span>
              )}
            </label>

            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Причина исправления</span>
              <textarea
                className={block("textarea")}
                value={form.correctionReason}
                onChange={(event) =>
                  setField("correctionReason", event.target.value)
                }
              />
              {errors.correctionReason && (
                <span className={block("field-error")}>
                  {errors.correctionReason}
                </span>
              )}
            </label>
          </div>
        </section>
      )}

      <section className={block("section")}>
        <h2 className={block("section-title")}>Экспертиза</h2>

        <div className={block("grid")}>
          <label className={block("checkbox")}>
            <input
              type="checkbox"
              checked={form.expertiseRequired}
              onChange={(event) => {
                setField("expertiseRequired", event.target.checked);

                if (!event.target.checked) {
                  setField("expertiseByThirdParty", false);
                }
              }}
            />
            <span>Контракт предусматривает экспертизу</span>
          </label>

          <label className={block("checkbox")}>
            <input
              type="checkbox"
              checked={form.expertiseByThirdParty}
              disabled={!form.expertiseRequired}
              onChange={(event) =>
                setField("expertiseByThirdParty", event.target.checked)
              }
            />
            <span>Экспертиза проводится сторонней организацией</span>
          </label>

          {form.expertiseByThirdParty && (
            <>
              <label className={block("field")}>
                <span className={block("field-label")}>
                  Организация-эксперт
                </span>
                <input
                  className={block("input")}
                  value={form.expertiseOrganization}
                  onChange={(event) =>
                    setField("expertiseOrganization", event.target.value)
                  }
                />
                {errors.expertiseOrganization && (
                  <span className={block("field-error")}>
                    {errors.expertiseOrganization}
                  </span>
                )}
              </label>

              <label className={block("field")}>
                <span className={block("field-label")}>Номер заключения</span>
                <input
                  className={block("input")}
                  value={form.expertiseConclusionNumber}
                  onChange={(event) =>
                    setField("expertiseConclusionNumber", event.target.value)
                  }
                />
                {errors.expertiseConclusionNumber && (
                  <span className={block("field-error")}>
                    {errors.expertiseConclusionNumber}
                  </span>
                )}
              </label>

              <label className={block("field")}>
                <span className={block("field-label")}>Дата заключения</span>
                <input
                  type="date"
                  className={block("input")}
                  value={form.expertiseConclusionDate}
                  onChange={(event) =>
                    setField("expertiseConclusionDate", event.target.value)
                  }
                />
                {errors.expertiseConclusionDate && (
                  <span className={block("field-error")}>
                    {errors.expertiseConclusionDate}
                  </span>
                )}
              </label>
            </>
          )}
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Приёмочная комиссия</h2>

        <div className={block("grid")}>
          <label className={block("checkbox")}>
            <input
              type="checkbox"
              checked={form.commissionRequired}
              onChange={(event) =>
                setField("commissionRequired", event.target.checked)
              }
            />
            <span>Приёмка проводится комиссией</span>
          </label>

          {form.commissionRequired && (
            <>
              <label className={block("field")}>
                <span className={block("field-label")}>
                  Номер решения о комиссии
                </span>
                <input
                  className={block("input")}
                  value={form.commissionDecisionNumber}
                  onChange={(event) =>
                    setField("commissionDecisionNumber", event.target.value)
                  }
                />
                {errors.commissionDecisionNumber && (
                  <span className={block("field-error")}>
                    {errors.commissionDecisionNumber}
                  </span>
                )}
              </label>

              <label className={block("field")}>
                <span className={block("field-label")}>
                  Дата решения о комиссии
                </span>
                <input
                  type="date"
                  className={block("input")}
                  value={form.commissionDecisionDate}
                  onChange={(event) =>
                    setField("commissionDecisionDate", event.target.value)
                  }
                />
                {errors.commissionDecisionDate && (
                  <span className={block("field-error")}>
                    {errors.commissionDecisionDate}
                  </span>
                )}
              </label>
            </>
          )}
        </div>
      </section>

      <div className={block("form-actions")}>
        <button
          type="button"
          className={block("secondary")}
          onClick={() => void handleCheck()}
          disabled={!orgId || busy}
        >
          {validateMutation.isPending ? "Проверка…" : "Проверить по правилам"}
        </button>

        <button
          type="button"
          className={block("primary")}
          onClick={() => void handleSubmit()}
          disabled={!orgId || busy}
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {meta && (
        <p className={block("muted")}>
          Ставки НДС: {meta.vatRates.map((rate) => `${rate} %`).join(", ")}.
          Предельный срок рассмотрения — {meta.maxReviewTermDays} рабочих дней.
        </p>
      )}
    </main>
  );
}

/**
 * Снимок контракта для формы. Отдельная функция, чтобы правила заполнения
 * были в одном месте и не расползались по обработчикам.
 */
const snapshotOf = (
  contract: ContractRegistryItem,
): Partial<AcceptanceFormState> => ({
  contractId: String(contract.id ?? ""),
  contractNumber: contract.contractNumber,
  contractName: contract.contractName,
  contractPrice: String(contract.contractPrice ?? ""),
  contractStatus: contract.status,
  contractDate: contract.contractDate ?? "",
  customerName: contract.customerName ?? "",
  supplierName: contract.supplierName ?? "",
  supplierInn: contract.supplierInn ?? "",
  ikz: contract.ikz ?? "",
  eisRegistryNumber: contract.eisRegistryNumber ?? "",
});

function ReadonlyField({
  block,
  label,
  value,
}: {
  block: (element?: string, modifiers?: string[]) => string;
  label: string;
  value: string;
}) {
  return (
    <div className={block("field")}>
      <span className={block("field-label")}>{label}</span>
      <input className={block("input")} value={value} readOnly />
    </div>
  );
}
