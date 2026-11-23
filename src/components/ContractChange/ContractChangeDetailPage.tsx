import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import Loader from "../UI/Loader";
import {
  useAddContractChangeDocument,
  useContractChange,
  useContractChangeAction,
  useContractChangeBases,
  useContractChangeMeta,
  useRegisterContractChange,
  useRemoveContractChangeDocument,
} from "../../services/ContractChange/contractChange.api";
import type {
  ContractChangeDocumentType,
  ContractChangeInput,
} from "../../services/ContractChange/contractChange.types";
import { readApiError } from "../../services/csmsApi";
import {
  buildContractChangeDocumentDraft,
  canEditContractChange,
  canManageContractChangeDocuments,
  contractChangeActions,
  contractChangeActor,
  contractChangeDocumentTypeLabels,
  contractChangeDocumentTypes,
  contractChangeKindLabels,
  contractChangeStatusLabels,
  contractChangeStatusTone,
  contractStatusLabels,
  formatMoney,
  issueIsError,
  todayIso,
} from "./contractChange.config";
import styles from "./ContractChange.module.scss";
import Select from "../UI/Select";

/**
 * Карточка документа об изменении или расторжении.
 *
 * Здесь видно, что именно зафиксировано в снимке, какие правила сработали и
 * какие действия допустимы в текущем статусе. Кнопок «просто поменять статус»
 * нет: каждое действие — отдельный маршрут домена, который заново проверяет
 * ст. 95 и пишет событие в журнал.
 */
export default function ContractChangeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "contract-change");

  const { organization, employee, user } = useMyContractRole();
  const actor = contractChangeActor(employee, user?.email);

  const {
    data: change,
    isLoading,
    isError,
    error,
    refetch,
  } = useContractChange(id);
  const { data: bases = [] } = useContractChangeBases();
  const { data: meta } = useContractChangeMeta();

  const actionMutation = useContractChangeAction();
  const registerMutation = useRegisterContractChange();
  const addDocumentMutation = useAddContractChangeDocument();
  const removeDocumentMutation = useRemoveContractChangeDocument();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "reject" | "cancel" | null
  >(null);
  const [actionComment, setActionComment] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regDate, setRegDate] = useState(todayIso());
  const [docType, setDocType] =
    useState<ContractChangeDocumentType>("Agreement");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  // Основание ищем без useMemo: вложенное поле снимка меняется вместе с
  // документом, а список оснований мал — кешировать здесь нечего.
  const basis = bases.find((item) => item.code === change?.input.basisCode);

  const issueErrors =
    change?.issues.filter((issue) => issueIsError(issue.severity)) ?? [];
  const issueWarnings =
    change?.issues.filter((issue) => !issueIsError(issue.severity)) ?? [];

  const defaultDocumentType = (): ContractChangeDocumentType => {
    if (!change) return "Agreement";
    if (change.input.kind === "Modification") return "Agreement";
    if (basis?.requiresCourtDecision) return "CourtDecision";
    if (basis?.requiresUnilateralNotice) return "Notice";

    return "Agreement";
  };

  const resetDocumentForm = (type: ContractChangeDocumentType) => {
    setDocType(type);

    if (change) {
      const draft = buildContractChangeDocumentDraft(type, change.input, basis);
      setDocTitle(draft.title);
      setDocContent(draft.content);
    }
  };

  const runAction = async (action: "submit" | "approve" | "sign") => {
    if (!id) return;

    setBusy(true);
    setActionError(null);

    try {
      await actionMutation.mutateAsync({ id, action, actor });
    } catch (actionFailure) {
      setActionError(readApiError(actionFailure, "Действие не выполнено."));
    } finally {
      setBusy(false);
    }
  };

  const runCommentAction = async () => {
    if (!id || !pendingAction) return;

    if (!actionComment.trim()) {
      setActionError(
        "Укажите причину: без неё автор не поймёт, что исправлять.",
      );
      return;
    }

    setBusy(true);
    setActionError(null);

    try {
      await actionMutation.mutateAsync({
        id,
        action: pendingAction,
        actor,
        comment: actionComment.trim(),
      });
      setPendingAction(null);
      setActionComment("");
    } catch (actionFailure) {
      setActionError(readApiError(actionFailure, "Действие не выполнено."));
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    if (!id) return;

    setBusy(true);
    setActionError(null);

    try {
      await registerMutation.mutateAsync({
        id,
        actor,
        registrationNumber: regNumber.trim(),
        registrationDate: regDate,
      });
    } catch (registerFailure) {
      setActionError(
        readApiError(registerFailure, "Не удалось зафиксировать регистрацию."),
      );
    } finally {
      setBusy(false);
    }
  };

  const addDocument = async () => {
    if (!id) return;

    setBusy(true);
    setActionError(null);

    try {
      await addDocumentMutation.mutateAsync({
        id,
        type: docType,
        title: docTitle.trim(),
        content: docContent.trim(),
        actor,
      });
      setDocTitle("");
      setDocContent("");
    } catch (documentFailure) {
      setActionError(
        readApiError(documentFailure, "Не удалось добавить документ."),
      );
    } finally {
      setBusy(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    if (!id) return;

    if (
      !window.confirm(
        "Удалить документ из комплекта? Действие попадёт в журнал.",
      )
    ) {
      return;
    }

    setBusy(true);
    setActionError(null);

    try {
      await removeDocumentMutation.mutateAsync({ id, documentId, actor });
    } catch (documentFailure) {
      setActionError(
        readApiError(documentFailure, "Не удалось удалить документ."),
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <main className={block()}>
        <div className={block("loading")}>
          <Loader count={3} size={260} />
        </div>
      </main>
    );
  }

  if (isError || !change) {
    return (
      <main className={block()}>
        <div className={block("alert", ["error"])}>
          <span>
            Документ не загружен: {readApiError(error, "csms-api недоступен.")}
          </span>
          <button
            type="button"
            className={block("action")}
            onClick={() => void refetch()}
          >
            Повторить
          </button>
        </div>
        <div className={block("form-actions")}>
          <Link className={block("action")} to="/contract-changes">
            К реестру
          </Link>
        </div>
      </main>
    );
  }

  const input: ContractChangeInput = change.input;
  const editable = canEditContractChange(change.status);
  const documentsEditable = canManageContractChangeDocuments(change.status);
  const actions = contractChangeActions(change.status);
  const needsRegistration = basis?.requiresEisRegistration ?? true;

  // Строка метаданных объявлена внутри карточки: ей нужен тот же bem-класс,
  // что и остальным элементам, а выносить функцию с замыканием незачем.
  const MetaRow = ({ label, value }: { label: string; value: string }) => (
    <div className={block("meta-row")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>
            {contractChangeKindLabels[input.kind]} №{" "}
            {input.contractNumber || "—"}
          </h1>
          <p className={block("subtitle")}>
            {input.contractName || "Наименование контракта не указано"}
          </p>
        </div>

        <div className={block("header-actions")}>
          <span
            className={block("status", [
              contractChangeStatusTone(change.status),
            ])}
          >
            {contractChangeStatusLabels[change.status]}
          </span>
          <Link className={block("action")} to="/contract-changes">
            К реестру
          </Link>
          {editable && (
            <button
              type="button"
              className={block("secondary")}
              onClick={() => navigate(`/contract-changes/${change.id}/edit`)}
            >
              Редактировать
            </button>
          )}
        </div>
      </header>

      {!organization && (
        <p className={block("alert")}>
          Организация не определена: действия будут записаны от имени «Система».
        </p>
      )}

      {actionError && (
        <div className={block("alert", ["error"])}>
          <span>{actionError}</span>
        </div>
      )}

      {change.rejectedReason && (
        <p className={block("alert")}>Отклонён: {change.rejectedReason}</p>
      )}

      {change.cancelledReason && (
        <p className={block("alert")}>Отменён: {change.cancelledReason}</p>
      )}

      {issueErrors.length > 0 && (
        <ul className={block("issues")}>
          {issueErrors.map((issue, index) => (
            <li
              key={`error-${issue.field}-${index}`}
              className={block("issue", ["error"])}
            >
              <span className={block("issue-field")}>{issue.field}</span>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      {issueWarnings.length > 0 && (
        <ul className={block("issues")}>
          {issueWarnings.map((issue, index) => (
            <li
              key={`warning-${issue.field}-${index}`}
              className={block("issue")}
            >
              <span className={block("issue-field")}>{issue.field}</span>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <section className={block("section")}>
        <h2 className={block("section-title")}>Снимок контракта</h2>

        <dl className={block("meta")}>
          <MetaRow label="Номер" value={input.contractNumber || "—"} />
          <MetaRow label="Наименование" value={input.contractName || "—"} />
          <MetaRow
            label="Цена контракта"
            value={`${formatMoney(input.contractPrice)} ₽`}
          />
          <MetaRow
            label="Статус"
            value={
              contractStatusLabels[input.contractStatus] ?? input.contractStatus
            }
          />
          <MetaRow
            label="Дата заключения"
            value={formatDate(input.contractDate ?? undefined) || "—"}
          />
          <MetaRow label="Заказчик" value={input.customerName || "—"} />
          <MetaRow label="Поставщик" value={input.supplierName || "—"} />
          <MetaRow label="ИКЗ" value={input.ikz || "—"} />
          <MetaRow
            label="Реестровый номер ЕИС"
            value={input.eisRegistryNumber || "—"}
          />
          <MetaRow
            label="Срок исполнения"
            value={
              formatDate(input.contractExecutionEndDate ?? undefined) || "—"
            }
          />
        </dl>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Основание</h2>

        <dl className={block("meta")}>
          <MetaRow
            label="Правовое основание"
            value={
              basis
                ? `${basis.article} — ${basis.title}`
                : input.basisCode || "не указано"
            }
          />
          <MetaRow
            label="Дата документа"
            value={formatDate(input.changeDate) || "—"}
          />
          {input.terminationDate && (
            <MetaRow
              label="Дата расторжения"
              value={formatDate(input.terminationDate)}
            />
          )}
          {input.noticeNumber && (
            <MetaRow
              label="Уведомление"
              value={`№ ${input.noticeNumber} от ${
                formatDate(input.noticeDate ?? undefined) || "—"
              }`}
            />
          )}
          {input.courtDecisionNumber && (
            <MetaRow
              label="Судебный акт"
              value={`№ ${input.courtDecisionNumber} от ${
                formatDate(input.courtDecisionDate ?? undefined) || "—"
              }`}
            />
          )}
          {input.governmentActNumber && (
            <MetaRow
              label="Акт органа власти"
              value={`№ ${input.governmentActNumber} от ${
                formatDate(input.governmentActDate ?? undefined) || "—"
              }`}
            />
          )}
        </dl>

        <p className={block("muted")}>{input.reason}</p>
        {input.description && (
          <p className={block("muted")}>{input.description}</p>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Новые условия</h2>

        {input.kind === "Termination" ? (
          <p className={block("section-note")}>
            Условия исполнения при расторжении не меняются. Расчёты и дата
            прекращения обязательств фиксируются в документе.
          </p>
        ) : (
          <dl className={block("meta")}>
            <MetaRow
              label="Новая цена"
              value={
                input.newPrice === null
                  ? "—"
                  : `${formatMoney(input.newPrice)} ₽`
              }
            />
            <MetaRow
              label="Новое количество"
              value={
                input.newQuantity === null
                  ? "—"
                  : `${input.newQuantity}${
                      input.quantityUnit ? ` ${input.quantityUnit}` : ""
                    }`
              }
            />
            <MetaRow label="Новый предмет" value={input.newSubject || "—"} />
            <MetaRow label="Новый поставщик" value={input.newSupplier || "—"} />
            <MetaRow
              label="Новый срок исполнения"
              value={formatDate(input.newExecutionEndDate ?? undefined) || "—"}
            />
            <MetaRow label="Формула" value={input.formulaText || "—"} />
            <MetaRow
              label="Цена единицы"
              value={
                input.unitPrice === null
                  ? "—"
                  : `${formatMoney(input.unitPrice)} ₽`
              }
            />
          </dl>
        )}
      </section>

      <section className={block("section")}>
        <div className={block("card-head")}>
          <h2 className={block("section-title")}>Документы</h2>
          <span className={block("muted")}>
            Ревизия {change.revision} · документов {change.documents.length}
          </span>
        </div>

        {change.documents.length === 0 ? (
          <p className={block("section-note")}>
            Комплект пуст. Для согласования нужен документ «
            {basis?.requiresCourtDecision
              ? contractChangeDocumentTypeLabels.CourtDecision
              : basis?.requiresUnilateralNotice
                ? contractChangeDocumentTypeLabels.Notice
                : contractChangeDocumentTypeLabels.Agreement}
            ».
          </p>
        ) : (
          <ul className={block("doc-list")}>
            {change.documents.map((document) => (
              <li key={document.id} className={block("doc")}>
                <div className={block("doc-head")}>
                  <span className={block("doc-title")}>
                    {document.title} ·{" "}
                    {contractChangeDocumentTypeLabels[document.type]}
                  </span>
                  <span className={block("doc-meta")}>
                    ред. {document.version} · {document.createdBy} ·{" "}
                    {formatDate(document.createdAt)}
                    {!document.matchesHash && " · хеш не совпадает"}
                  </span>
                </div>

                <p className={block("doc-content")}>{document.content}</p>

                {documentsEditable && (
                  <div className={block("card-actions")}>
                    <button
                      type="button"
                      className={block("action", ["danger"])}
                      disabled={busy}
                      onClick={() => void removeDocument(document.id)}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {documentsEditable && (
          <div className={block("inline-form")}>
            <label className={block("field")}>
              <span className={block("field-label")}>Тип документа</span>
              <Select
                className={block("select")}
                value={docType}
                onChange={(event) =>
                  resetDocumentForm(
                    event.target.value as ContractChangeDocumentType,
                  )
                }
              >
                {contractChangeDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {contractChangeDocumentTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </label>

            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Заголовок</span>
              <input
                className={block("input")}
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
              />
            </label>

            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Текст документа</span>
              <textarea
                className={block("textarea")}
                value={docContent}
                onChange={(event) => setDocContent(event.target.value)}
              />
            </label>

            <div className={block("card-actions")}>
              <button
                type="button"
                className={block("secondary")}
                onClick={() => resetDocumentForm(defaultDocumentType())}
                disabled={busy}
              >
                Сформировать заготовку
              </button>
              <button
                type="button"
                className={block("primary")}
                onClick={() => void addDocument()}
                disabled={busy || !docContent.trim()}
              >
                Добавить документ
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Действия</h2>

        {actions.length === 0 ? (
          <p className={block("section-note")}>
            В статусе «{contractChangeStatusLabels[change.status]}» действий
            нет: документ закрыт.
          </p>
        ) : (
          <div className={block("card-actions")}>
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={block("action", [action.tone ?? ""])}
                disabled={busy}
                onClick={() => {
                  if (action.key === "register") return;
                  if (action.key === "reject" || action.key === "cancel") {
                    setPendingAction(action.key);
                    setActionComment("");
                    return;
                  }

                  void runAction(action.key);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {(pendingAction || change.status === "Signed") && (
          <div className={block("inline-form")}>
            {pendingAction && (
              <>
                <label className={block("field", ["wide"])}>
                  <span className={block("field-label")}>
                    {pendingAction === "reject"
                      ? "Причина отклонения"
                      : "Причина отмены"}
                  </span>
                  <textarea
                    className={block("textarea")}
                    value={actionComment}
                    onChange={(event) => setActionComment(event.target.value)}
                  />
                </label>

                <div className={block("card-actions")}>
                  <button
                    type="button"
                    className={block("secondary")}
                    onClick={() => setPendingAction(null)}
                    disabled={busy}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className={block("danger")}
                    onClick={() => void runCommentAction()}
                    disabled={busy}
                  >
                    Подтвердить
                  </button>
                </div>
              </>
            )}

            {change.status === "Signed" && needsRegistration && (
              <>
                <label className={block("field")}>
                  <span className={block("field-label")}>
                    Номер регистрации в ЕИС
                  </span>
                  <input
                    className={block("input")}
                    value={regNumber}
                    onChange={(event) => setRegNumber(event.target.value)}
                  />
                </label>

                <label className={block("field")}>
                  <span className={block("field-label")}>Дата регистрации</span>
                  <input
                    type="date"
                    className={block("input")}
                    value={regDate}
                    onChange={(event) => setRegDate(event.target.value)}
                  />
                </label>

                <div className={block("card-actions")}>
                  <button
                    type="button"
                    className={block("primary")}
                    onClick={() => void register()}
                    disabled={busy || !regNumber.trim()}
                  >
                    Зарегистрировать
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {change.status === "Signed" && !needsRegistration && (
          <p className={block("section-note")}>
            По этому основанию регистрация в ЕИС не требуется.
          </p>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Связанные документы</h2>

        <div className={block("card-actions")}>
          <Link
            className={block("action")}
            to={`/acceptances?contractId=${input.contractId}`}
          >
            Приёмки по контракту
          </Link>
          <Link
            className={block("action")}
            to={`/acceptances/new?contractId=${input.contractId}`}
          >
            Оформить приёмку
          </Link>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>История</h2>

        <ul className={block("events")}>
          {change.events.map((event, index) => (
            <li key={`${event.at}-${index}`} className={block("event")}>
              <div className={block("event-head")}>
                <span>{formatDate(event.at)}</span>
                <span>
                  {contractChangeStatusLabels[event.from]} →{" "}
                  {contractChangeStatusLabels[event.to]}
                </span>
                <span>{event.actor}</span>
              </div>
              <span className={block("doc-title")}>{event.action}</span>
              <span className={block("event-comment")}>{event.comment}</span>
            </li>
          ))}
        </ul>

        <dl className={block("meta")}>
          <MetaRow
            label="Создан"
            value={`${formatDate(change.createdAt)} · ${input.createdBy}`}
          />
          <MetaRow
            label="Обновлён"
            value={formatDate(change.updatedAt) || "—"}
          />
          {change.submittedAt && (
            <MetaRow
              label="На согласовании с"
              value={formatDate(change.submittedAt)}
            />
          )}
          {change.approvedAt && (
            <MetaRow label="Согласован" value={formatDate(change.approvedAt)} />
          )}
          {change.signedAt && (
            <MetaRow
              label="Подписан"
              value={`${formatDate(change.signedAt)} · ${change.signedBy ?? "—"}`}
            />
          )}
          {change.registeredAt && (
            <MetaRow
              label="Зарегистрирован"
              value={`${formatDate(change.registeredAt)} · ${
                change.registeredBy ?? "—"
              }`}
            />
          )}
          {change.eisRegistrationNumber && (
            <MetaRow
              label="Номер в ЕИС"
              value={`${change.eisRegistrationNumber} от ${
                formatDate(change.eisRegistrationDate ?? undefined) || "—"
              }`}
            />
          )}
        </dl>

        {meta && (
          <p className={block("muted")}>
            Срок вступления в силу одностороннего отказа —{" "}
            {meta.unilateralNoticeDays} дней с даты уведомления.
          </p>
        )}
      </section>
    </main>
  );
}
