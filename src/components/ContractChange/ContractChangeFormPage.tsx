import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import Loader from "../UI/Loader";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import {
  useContractChange,
  useContractChangeBases,
  useCreateContractChange,
  useUpdateContractChange,
  useValidateContractChange,
} from "../../services/ContractChange/contractChange.api";
import type {
  ContractChangeIssue,
  ContractChangeKind,
} from "../../services/ContractChange/contractChange.types";
import { readApiError } from "../../services/csmsApi";
import {
  buildContractChangeInput,
  contractChangeActor,
  contractChangeFormFrom,
  contractChangeKindLabels,
  contractChangeStatusLabels,
  emptyContractChangeForm,
  formatMoney,
  issueIsError,
  validateContractChangeForm,
  type ContractChangeFormState,
  type FormErrors,
} from "./contractChange.config";
import styles from "./ContractChange.module.scss";
import Select from "../UI/Select";

/**
 * Форма изменения или расторжения контракта.
 *
 * Снимок контракта берётся из реестра и дальше хранится вместе с документом:
 * модуль не пересчитывает условия по текущей карточке. Юридические проверки
 * ст. 95 выполняет сервер — кнопка «Проверить по правилам» вызывает тот же
 * код, что и сохранение, поэтому расхождений между формой и API нет.
 */
export default function ContractChangeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "contract-change");

  const isEdit = Boolean(id);
  const { organization, employee, user } = useMyContractRole();
  const orgId = organization ? String(organization.id) : "";
  const actor = contractChangeActor(employee, user?.email);

  const { data: contracts = [] } = useContractRegistry(orgId || undefined);
  const { data: bases = [] } = useContractChangeBases();
  const { data: existing, isLoading: isExistingLoading } = useContractChange(id);

  const createMutation = useCreateContractChange();
  const updateMutation = useUpdateContractChange();
  const validateMutation = useValidateContractChange();

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverIssues, setServerIssues] = useState<ContractChangeIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Как и в форме приёмки: снимок из API или контракт из параметра URL —
  // источник, правки пользователя — слой сверху. Смена источника сбрасывает
  // правки во время рендера, без эффекта с setState.
  const presetContractId = isEdit ? null : searchParams.get("contractId");
  const presetContract = useMemo(
    () =>
      presetContractId
        ? (contracts.find((item) => String(item.id) === presetContractId) ?? null)
        : null,
    [contracts, presetContractId],
  );
  const initialForm = useMemo(
    () =>
      existing
        ? contractChangeFormFrom(existing.input)
        : presetContract
          ? { ...emptyContractChangeForm(), ...snapshotOf(presetContract) }
          : emptyContractChangeForm(),
    [existing, presetContract],
  );
  const [formState, setFormState] = useState<{
    source: ContractChangeFormState;
    edits: Partial<ContractChangeFormState>;
  }>(() => ({ source: initialForm, edits: {} }));

  if (formState.source !== initialForm) {
    setFormState({ source: initialForm, edits: {} });
  }

  const form = { ...formState.source, ...formState.edits };
  const setForm = (
    next:
      | ContractChangeFormState
      | ((prev: ContractChangeFormState) => ContractChangeFormState),
  ) => {
    setFormState((current) => {
      const currentForm = { ...current.source, ...current.edits };
      return {
        source: current.source,
        edits: typeof next === "function" ? next(currentForm) : next,
      };
    });
  };

  const basisOptions = useMemo(
    () => bases.filter((basis) => basis.kind === form.kind),
    [bases, form.kind],
  );

  const basis = useMemo(
    () => bases.find((item) => item.code === form.basisCode),
    [bases, form.basisCode],
  );

  const contract = useMemo(
    () => contracts.find((item) => String(item.id) === form.contractId),
    [contracts, form.contractId],
  );

  const setField = <K extends keyof ContractChangeFormState>(
    key: K,
    value: ContractChangeFormState[K],
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

  const changeKind = (kind: ContractChangeKind) => {
    const allowed = bases.filter((item) => item.kind === kind);
    const keep = allowed.some((item) => item.code === form.basisCode)
      ? form.basisCode
      : (allowed[0]?.code ?? "");

    setForm((current) => ({ ...current, kind, basisCode: keep }));
  };

  const buildInput = () => buildContractChangeInput(form, orgId, actor);

  const handleCheck = async () => {
    setSubmitError(null);
    setErrors(validateContractChangeForm(form, basis));

    try {
      const issues = await validateMutation.mutateAsync(buildInput());
      setServerIssues(issues);
    } catch (error) {
      setSubmitError(readApiError(error, "Не удалось проверить условия."));
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const nextErrors = validateContractChangeForm(form, basis);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      const input = buildInput();

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, input, actor });
        navigate(`/contract-changes/${id}`);
        return;
      }

      const created = await createMutation.mutateAsync(input);
      navigate(`/contract-changes/${created.id}`);
    } catch (error) {
      setSubmitError(
        readApiError(error, "Не удалось сохранить документ. Проверьте условия."),
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
            {isEdit
              ? "Редактирование документа"
              : "Новое изменение или расторжение"}
          </h1>
          <p className={block("subtitle")}>
            Снимок контракта сохраняется вместе с документом. Основание
            определяет, какие условия менять допустимо: правила ст. 95 44-ФЗ
            проверяются на сервере.
          </p>
        </div>

        <div className={block("header-actions")}>
          <button
            type="button"
            className={block("secondary")}
            onClick={() => navigate("/contract-changes")}
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
            <Select
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
            </Select>
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
            label="Цена контракта"
            value={`${formatMoney(form.contractPrice ? Number(form.contractPrice) : null)} ₽`}
          />
          <ReadonlyField
            block={block}
            label="Дата заключения"
            value={formatDate(form.contractDate) || "—"}
          />
          <ReadonlyField
            block={block}
            label="Статус контракта"
            value={
              contractChangeStatusLabels[
                form.contractStatus as keyof typeof contractChangeStatusLabels
              ] ?? (form.contractStatus || "—")
            }
          />
          <ReadonlyField
            block={block}
            label="Срок исполнения"
            value={formatDate(form.contractExecutionEndDate) || "—"}
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
        <h2 className={block("section-title")}>Основание и причина</h2>

        <div className={block("grid")}>
          <label className={block("field")}>
            <span className={block("field-label")}>Вид документа</span>
            <Select
              className={block("select")}
              value={form.kind}
              disabled={isEdit}
              onChange={(event) =>
                changeKind(event.target.value as ContractChangeKind)
              }
            >
              {(Object.keys(contractChangeKindLabels) as ContractChangeKind[]).map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {contractChangeKindLabels[kind]}
                  </option>
                ),
              )}
            </Select>
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>Правовое основание</span>
            <Select
              className={block("select")}
              value={form.basisCode}
              onChange={(event) => setField("basisCode", event.target.value)}
            >
              <option value="">Выберите основание</option>
              {basisOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.article} — {item.title}
                </option>
              ))}
            </Select>
            {errors.basisCode && (
              <span className={block("field-error")}>{errors.basisCode}</span>
            )}
          </label>

          <label className={block("field")}>
            <span className={block("field-label")}>Дата документа</span>
            <input
              type="date"
              className={block("input")}
              value={form.changeDate}
              onChange={(event) => setField("changeDate", event.target.value)}
            />
            {errors.changeDate && (
              <span className={block("field-error")}>{errors.changeDate}</span>
            )}
          </label>

          <label className={block("field", ["wide"])}>
            <span className={block("field-label")}>Причина</span>
            <textarea
              className={block("textarea")}
              value={form.reason}
              onChange={(event) => setField("reason", event.target.value)}
              placeholder="Существенное нарушение условий, снижение цены, акт органа власти…"
            />
            {errors.reason && (
              <span className={block("field-error")}>{errors.reason}</span>
            )}
          </label>

          <label className={block("field", ["wide"])}>
            <span className={block("field-label")}>Описание (необязательно)</span>
            <textarea
              className={block("textarea")}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </label>
        </div>

        {basis && (
          <p className={block("section-note")}>
            {basis.description}
            {basis.maxPriceIncreasePercent > 0 &&
              ` Допустимое увеличение цены — до ${basis.maxPriceIncreasePercent} %.`}
            {basis.maxQuantityPercent > 0 &&
              ` Предел изменения количества — ${basis.maxQuantityPercent} %.`}
          </p>
        )}
      </section>

      {basis && form.kind === "Termination" && (
        <section className={block("section")}>
          <h2 className={block("section-title")}>Расторжение</h2>

          <div className={block("grid")}>
            <label className={block("field")}>
              <span className={block("field-label")}>Дата расторжения</span>
              <input
                type="date"
                className={block("input")}
                value={form.terminationDate}
                onChange={(event) =>
                  setField("terminationDate", event.target.value)
                }
              />
              {errors.terminationDate && (
                <span className={block("field-error")}>
                  {errors.terminationDate}
                </span>
              )}
            </label>

            {basis.requiresCourtDecision && (
              <>
                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Номер судебного акта
                  </span>
                  <input
                    className={block("input")}
                    value={form.courtDecisionNumber}
                    onChange={(event) =>
                      setField("courtDecisionNumber", event.target.value)
                    }
                  />
                  {errors.courtDecisionNumber && (
                    <span className={block("field-error")}>
                      {errors.courtDecisionNumber}
                    </span>
                  )}
                </label>

                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Дата судебного акта
                  </span>
                  <input
                    type="date"
                    className={block("input")}
                    value={form.courtDecisionDate}
                    onChange={(event) =>
                      setField("courtDecisionDate", event.target.value)
                    }
                  />
                  {errors.courtDecisionDate && (
                    <span className={block("field-error")}>
                      {errors.courtDecisionDate}
                    </span>
                  )}
                </label>
              </>
            )}

            {basis.requiresUnilateralNotice && (
              <>
                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Номер уведомления
                  </span>
                  <input
                    className={block("input")}
                    value={form.noticeNumber}
                    onChange={(event) =>
                      setField("noticeNumber", event.target.value)
                    }
                  />
                  {errors.noticeNumber && (
                    <span className={block("field-error")}>
                      {errors.noticeNumber}
                    </span>
                  )}
                </label>

                <label className={block("field")}>
                  <span className={block("field-label")}>Дата уведомления</span>
                  <input
                    type="date"
                    className={block("input")}
                    value={form.noticeDate}
                    onChange={(event) => setField("noticeDate", event.target.value)}
                  />
                  {errors.noticeDate && (
                    <span className={block("field-error")}>
                      {errors.noticeDate}
                    </span>
                  )}
                </label>
              </>
            )}
          </div>

          {basis.requiresUnilateralNotice && (
            <p className={block("section-note")}>
              Решение об одностороннем отказе вступает в силу не ранее чем через
              10 дней с даты надлежащего уведомления другой стороны.
            </p>
          )}
        </section>
      )}

      {basis && form.kind === "Modification" && (
        <section className={block("section")}>
          <h2 className={block("section-title")}>Новые условия</h2>

          <div className={block("grid")}>
            <label className={block("field")}>
              <span className={block("field-label")}>Новая цена, ₽</span>
              <input
                className={block("input")}
                value={form.newPrice}
                disabled={!basis.allowsPriceChange}
                onChange={(event) => setField("newPrice", event.target.value)}
              />
              {errors.newPrice && (
                <span className={block("field-error")}>{errors.newPrice}</span>
              )}
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Новое количество</span>
              <input
                className={block("input")}
                value={form.newQuantity}
                disabled={!basis.allowsQuantityChange}
                onChange={(event) => setField("newQuantity", event.target.value)}
              />
              {errors.newQuantity && (
                <span className={block("field-error")}>{errors.newQuantity}</span>
              )}
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Единица измерения</span>
              <input
                className={block("input")}
                value={form.quantityUnit}
                onChange={(event) => setField("quantityUnit", event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>
                Текущее количество в карточке
              </span>
              <input
                className={block("input")}
                value={form.contractQuantity}
                onChange={(event) =>
                  setField("contractQuantity", event.target.value)
                }
                placeholder="Если не заполнено, лимит 10 % проверить нельзя"
              />
            </label>

            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Новый предмет</span>
              <textarea
                className={block("textarea")}
                value={form.newSubject}
                disabled={!basis.allowsQualityImprovement}
                onChange={(event) => setField("newSubject", event.target.value)}
              />
              {errors.newSubject && (
                <span className={block("field-error")}>{errors.newSubject}</span>
              )}
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Новый поставщик</span>
              <input
                className={block("input")}
                value={form.newSupplier}
                disabled={!basis.requiresNewSupplier}
                onChange={(event) => setField("newSupplier", event.target.value)}
              />
              {errors.newSupplier && (
                <span className={block("field-error")}>{errors.newSupplier}</span>
              )}
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Новый срок исполнения</span>
              <input
                type="date"
                className={block("input")}
                value={form.newExecutionEndDate}
                onChange={(event) =>
                  setField("newExecutionEndDate", event.target.value)
                }
              />
              {errors.newExecutionEndDate && (
                <span className={block("field-error")}>
                  {errors.newExecutionEndDate}
                </span>
              )}
            </label>

            {basis.requiresGovernmentAct && (
              <>
                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Номер акта органа власти
                  </span>
                  <input
                    className={block("input")}
                    value={form.governmentActNumber}
                    onChange={(event) =>
                      setField("governmentActNumber", event.target.value)
                    }
                  />
                  {errors.governmentActNumber && (
                    <span className={block("field-error")}>
                      {errors.governmentActNumber}
                    </span>
                  )}
                </label>

                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Дата акта органа власти
                  </span>
                  <input
                    type="date"
                    className={block("input")}
                    value={form.governmentActDate}
                    onChange={(event) =>
                      setField("governmentActDate", event.target.value)
                    }
                  />
                  {errors.governmentActDate && (
                    <span className={block("field-error")}>
                      {errors.governmentActDate}
                    </span>
                  )}
                </label>
              </>
            )}

            {basis.requiresFormula && (
              <label className={block("field", ["wide"])}>
                <span className={block("field-label")}>
                  Формула и порядок расчёта
                </span>
                <textarea
                  className={block("textarea")}
                  value={form.formulaText}
                  onChange={(event) => setField("formulaText", event.target.value)}
                />
                {errors.formulaText && (
                  <span className={block("field-error")}>
                    {errors.formulaText}
                  </span>
                )}
              </label>
            )}

            {basis.requiresUnitPrice && (
              <>
                <label className={block("field")}>
                  <span className={block("field-label")}>Цена единицы, ₽</span>
                  <input
                    className={block("input")}
                    value={form.unitPrice}
                    onChange={(event) => setField("unitPrice", event.target.value)}
                  />
                  {errors.unitPrice && (
                    <span className={block("field-error")}>
                      {errors.unitPrice}
                    </span>
                  )}
                </label>

                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Начальная максимальная цена, ₽
                  </span>
                  <input
                    className={block("input")}
                    value={form.initialMaxPrice}
                    onChange={(event) =>
                      setField("initialMaxPrice", event.target.value)
                    }
                  />
                </label>
              </>
            )}
          </div>
        </section>
      )}

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
    </main>
  );
}

/**
 * Снимок контракта для формы. Отдельная функция, чтобы правила заполнения
 * были в одном месте и не расползались по обработчикам.
 */
const snapshotOf = (
  contract: ContractRegistryItem,
): Partial<ContractChangeFormState> => ({
  contractId: String(contract.id ?? ""),
  contractNumber: contract.contractNumber,
  contractName: contract.contractName,
  contractPrice: String(contract.contractPrice ?? ""),
  contractStatus: contract.status,
  contractDate: contract.contractDate ?? "",
  customerName: contract.customerName ?? "",
  supplierName: contract.supplierName ?? "",
  ikz: contract.ikz ?? "",
  eisRegistryNumber: contract.eisRegistryNumber ?? "",
  contractExecutionEndDate: contract.executionEndDate ?? "",
  initialMaxPrice: contract.initialMaxPrice ?? "",
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
