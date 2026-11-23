import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import Loader from "../UI/Loader";
import {
  useAcceptAcceptance,
  useAcceptance,
  useAcceptanceAction,
  useAcceptanceMeta,
  useAddAcceptanceDefect,
  useAddAcceptancePosition,
  useRegisterAcceptance,
  useRemoveAcceptanceDefect,
  useRemoveAcceptancePosition,
} from "../../services/Acceptance/acceptance.api";
import type {
  AcceptanceDefectRequirement,
  AcceptanceInput,
  AcceptanceResult,
} from "../../services/Acceptance/acceptance.types";
import { readApiError } from "../../services/csmsApi";
import {
  acceptanceEisReadiness,
  okeiCodeFromUnit,
} from "../../services/Eis/eisExecutionReadiness";
import {
  acceptanceActor,
  acceptanceActions,
  acceptanceKindLabels,
  acceptanceRequirementLabels,
  acceptanceRequirementOrder,
  acceptanceResultLabels,
  acceptanceStatusLabels,
  acceptanceStatusTone,
  acceptanceVatRates,
  buildAcceptanceActText,
  canEditAcceptance,
  canEditAcceptancePositions,
  canManageAcceptanceDefects,
  formatMoney,
  issueIsError,
  maxReviewTermDays,
  parseNumber,
  todayIso,
} from "./acceptance.config";
import styles from "./Acceptance.module.scss";
import Select from "../UI/Select";

type BlockClassName = (element?: string, modifiers?: string[]) => string;

// Строка метаданных объявлена вне страницы: компонент внутри рендера создавал
// бы заново экземпляр с тем же именем и сбрасывал бы своё состояние.
const MetaRow = ({
  block,
  label,
  value,
}: {
  block: BlockClassName;
  label: string;
  value: string;
}) => (
  <div className={block("meta-row")}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

/**
 * Карточка документа о приёмке.
 *
 * Здесь видно, что зафиксировано в снимке, какие правила сработали, какие
 * позиции и недостатки внесены и какие действия допустимы в текущем статусе.
 * Кнопок «просто поменять статус» нет: каждое действие — отдельный маршрут
 * домена, который заново проверяет ст. 94 и пишет событие в журнал.
 */
export default function AcceptanceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "acceptance");

  const { organization, employee, user } = useMyContractRole();
  const actor = acceptanceActor(employee, user?.email);

  const { data: acceptance, isLoading, isError, error, refetch } =
    useAcceptance(id);
  const { data: meta } = useAcceptanceMeta();

  const actionMutation = useAcceptanceAction();
  const acceptMutation = useAcceptAcceptance();
  const registerMutation = useRegisterAcceptance();
  const addPositionMutation = useAddAcceptancePosition();
  const removePositionMutation = useRemoveAcceptancePosition();
  const addDefectMutation = useAddAcceptanceDefect();
  const removeDefectMutation = useRemoveAcceptanceDefect();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<
    "refuse" | "return" | "cancel" | null
  >(null);
  const [actionComment, setActionComment] = useState("");
  const [acceptResult, setAcceptResult] =
    useState<AcceptanceResult>("Accepted");
  const [acceptComment, setAcceptComment] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regDate, setRegDate] = useState(todayIso());

  const [positionName, setPositionName] = useState("");
  const [positionOkpd2, setPositionOkpd2] = useState("");
  const [positionUnit, setPositionUnit] = useState("");
  const [positionQuantity, setPositionQuantity] = useState("");
  const [positionPrice, setPositionPrice] = useState("");
  const [positionVat, setPositionVat] = useState("20");
  const [positionCountry, setPositionCountry] = useState("");
  const [positionRegistry, setPositionRegistry] = useState("");

  const [defectPositionId, setDefectPositionId] = useState("");
  const [defectDescription, setDefectDescription] = useState("");
  const [defectQuantity, setDefectQuantity] = useState("");
  const [defectRequirement, setDefectRequirement] =
    useState<AcceptanceDefectRequirement>("Repair");

  const issueErrors =
    acceptance?.issues.filter((issue) => issueIsError(issue.severity)) ?? [];
  const issueWarnings =
    acceptance?.issues.filter((issue) => !issueIsError(issue.severity)) ?? [];

  const run = async (operation: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setActionError(null);

    try {
      await operation();
    } catch (failure) {
      setActionError(readApiError(failure, fallback));
    } finally {
      setBusy(false);
    }
  };

  const runAction = (action: "submit") => {
    if (!id) return;

    void run(
      () => actionMutation.mutateAsync({ id, action, actor }),
      "Действие не выполнено.",
    );
  };

  const runCommentAction = () => {
    if (!id || !pendingAction) return;

    if (!actionComment.trim()) {
      setActionError(
        "Укажите комментарий: без него контрагент не поймёт, что исправлять.",
      );
      return;
    }

    void run(async () => {
      await actionMutation.mutateAsync({
        id,
        action: pendingAction,
        actor,
        comment: actionComment.trim(),
      });
      setPendingAction(null);
      setActionComment("");
    }, "Действие не выполнено.");
  };

  const runAccept = () => {
    if (!id) return;

    void run(
      () =>
        acceptMutation.mutateAsync({
          id,
          actor,
          result: acceptResult,
          comment: acceptComment.trim() || undefined,
        }),
      "Не удалось подписать итог приёмки.",
    );
  };

  const runRegister = () => {
    if (!id) return;

    void run(
      () =>
        registerMutation.mutateAsync({
          id,
          actor,
          registrationNumber: regNumber.trim(),
          registrationDate: regDate,
        }),
      "Не удалось зафиксировать регистрацию.",
    );
  };

  const addPosition = () => {
    if (!id) return;

    const quantity = parseNumber(positionQuantity);
    const unitPrice = parseNumber(positionPrice);
    const vatRate = parseNumber(positionVat);

    if (!positionName.trim() || !positionUnit.trim()) {
      setActionError("Укажите наименование и единицу измерения позиции.");
      return;
    }

    if (quantity === null || quantity <= 0 || unitPrice === null || unitPrice <= 0) {
      setActionError("Количество и цена позиции должны быть больше нуля.");
      return;
    }

    void run(async () => {
      await addPositionMutation.mutateAsync({
        id,
        name: positionName.trim(),
        okpd2: positionOkpd2.trim() || undefined,
        unit: positionUnit.trim(),
        quantity,
        unitPrice,
        vatRate: vatRate ?? 20,
        countryOrigin: positionCountry.trim() || undefined,
        registryNumber: positionRegistry.trim() || undefined,
        actor,
      });

      setPositionName("");
      setPositionOkpd2("");
      setPositionUnit("");
      setPositionQuantity("");
      setPositionPrice("");
      setPositionCountry("");
      setPositionRegistry("");
    }, "Не удалось добавить позицию.");
  };

  const removePosition = (positionId: string) => {
    if (!id) return;

    if (!window.confirm("Удалить позицию из документа?")) return;

    void run(
      () => removePositionMutation.mutateAsync({ id, positionId, actor }),
      "Не удалось удалить позицию.",
    );
  };

  const addDefect = () => {
    if (!id) return;

    const quantity = parseNumber(defectQuantity);

    if (defectDescription.trim().length < 10) {
      setActionError("Опишите недостаток (не менее 10 символов).");
      return;
    }

    if (quantity === null || quantity <= 0) {
      setActionError("Количество по недостатку должно быть больше нуля.");
      return;
    }

    void run(async () => {
      await addDefectMutation.mutateAsync({
        id,
        positionId: defectPositionId || null,
        description: defectDescription.trim(),
        quantity,
        requirement: defectRequirement,
        actor,
      });

      setDefectDescription("");
      setDefectQuantity("");
    }, "Не удалось зафиксировать недостаток.");
  };

  const removeDefect = (defectId: string) => {
    if (!id) return;

    if (!window.confirm("Снять недостаток?")) return;

    void run(
      () => removeDefectMutation.mutateAsync({ id, defectId, actor }),
      "Не удалось снять недостаток.",
    );
  };

  const printAct = () => {
    if (!acceptance) return;

    const text = buildAcceptanceActText(acceptance);
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      setActionError("Браузер заблокировал окно печати: разрешите всплывающие окна.");
      return;
    }

    printWindow.document.title = `Акт приёмки ${acceptance.input.documentNumber ?? ""}`;
    const pre = printWindow.document.createElement("pre");
    pre.style.fontFamily = "Georgia, 'Times New Roman', serif";
    pre.style.fontSize = "13px";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.padding = "24px";
    pre.textContent = text;

    printWindow.document.body.append(pre);
    printWindow.focus();
    printWindow.print();
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

  if (isError || !acceptance) {
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
          <Link className={block("action")} to="/acceptances">
            К реестру
          </Link>
        </div>
      </main>
    );
  }

  const input: AcceptanceInput = acceptance.input;
  const editable = canEditAcceptance(acceptance.status);
  const positionsEditable = canEditAcceptancePositions(acceptance.status);
  const defectsEditable = canManageAcceptanceDefects(acceptance.status);
  const actions = acceptanceActions(acceptance.status);
  // Готовность к XML ЕИС: считается по сохранённому документу, чтобы человек
  // видел, что именно не примет шлюз, не дожидаясь отказа на сборке пакета
  const eisReadiness = acceptanceEisReadiness(acceptance);

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>
            {acceptanceKindLabels[input.kind]} № {input.documentNumber || "—"} от{" "}
            {formatDate(input.documentDate ?? undefined) || "—"}
          </h1>
          <p className={block("subtitle")}>
            Контракт № {input.contractNumber || "—"} —{" "}
            {input.contractName || "наименование не указано"}
          </p>
        </div>

        <div className={block("header-actions")}>
          <span
            className={block("status", [
              acceptanceStatusTone(acceptance.status),
            ])}
          >
            {acceptanceStatusLabels[acceptance.status]}
          </span>
          <Link className={block("action")} to="/acceptances">
            К реестру
          </Link>
          <button
            type="button"
            className={block("secondary")}
            onClick={printAct}
          >
            Печать акта
          </button>
          {editable && (
            <button
              type="button"
              className={block("secondary")}
              onClick={() => navigate(`/acceptances/${acceptance.id}/edit`)}
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

      {acceptance.refusalReason && (
        <p className={block("alert")}>
          Мотивированный отказ: {acceptance.refusalReason}
        </p>
      )}

      {acceptance.returnComment && (
        <p className={block("alert")}>
          Возвращено для уточнения: {acceptance.returnComment}
        </p>
      )}

      {acceptance.cancelledReason && (
        <p className={block("alert")}>Отменён: {acceptance.cancelledReason}</p>
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
            <li key={`warning-${issue.field}-${index}`} className={block("issue")}>
              <span className={block("issue-field")}>{issue.field}</span>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <section className={block("section")}>
        <h2 className={block("section-title")}>Снимок контракта</h2>

        <dl className={block("meta")}>
          <MetaRow block={block} label="Номер" value={input.contractNumber || "—"} />
          <MetaRow block={block} label="Наименование" value={input.contractName || "—"} />
          <MetaRow block={block}
            label="Цена контракта"
            value={`${formatMoney(input.contractPrice)} ₽`}
          />
          <MetaRow block={block} label="Дата заключения" value={formatDate(input.contractDate ?? undefined) || "—"} />
          <MetaRow block={block} label="Заказчик" value={input.customerName || "—"} />
          <MetaRow block={block} label="Поставщик" value={input.supplierName || "—"} />
          <MetaRow block={block} label="ИНН поставщика" value={input.supplierInn || "—"} />
          <MetaRow block={block} label="ИКЗ" value={input.ikz || "—"} />
          <MetaRow block={block} label="Реестровый номер ЕИС" value={input.eisRegistryNumber || "—"} />
          {input.stageNumber && (
            <MetaRow block={block}
              label="Этап"
              value={`${input.stageNumber}${input.stageName ? ` — ${input.stageName}` : ""}`}
            />
          )}
        </dl>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Условия приёмки</h2>

        <dl className={block("meta")}>
          <MetaRow block={block}
            label="Срок рассмотрения"
            value={`${input.acceptanceTermDays} раб. дней${
              acceptance.reviewDeadline
                ? `, до ${formatDate(acceptance.reviewDeadline ?? undefined)}`
                : ""
            }`}
          />
          <MetaRow block={block}
            label="Экспертиза"
            value={
              input.expertiseRequired
                ? input.expertiseByThirdParty
                  ? `сторонняя: ${input.expertiseOrganization ?? "—"}, заключение № ${
                      input.expertiseConclusionNumber ?? "—"
                    } от ${formatDate(input.expertiseConclusionDate ?? undefined) || "—"}`
                  : "своими силами заказчика"
                : "не предусмотрена"
            }
          />
          <MetaRow block={block}
            label="Приёмочная комиссия"
            value={
              input.commissionRequired
                ? `решение № ${input.commissionDecisionNumber ?? "—"} от ${
                    formatDate(input.commissionDecisionDate ?? undefined) || "—"
                  }`
                : "не требуется"
            }
          />
          <MetaRow block={block} label="Место приёмки" value={input.deliveryPlace || "—"} />
          {input.notes && <MetaRow block={block} label="Примечания" value={input.notes} />}
        </dl>

        {input.kind === "Correction" && (
          <p className={block("section-note")}>
            Корректировочный документ к акту №{" "}
            {input.correctedDocumentNumber ?? "—"} от{" "}
            {formatDate(input.correctedDocumentDate ?? undefined) || "—"}. Причина:{" "}
            {input.correctionReason ?? "—"}
          </p>
        )}
      </section>

      <section className={block("section")}>
        <div className={block("card-head")}>
          <h2 className={block("section-title")}>Позиции</h2>
          <span className={block("muted")}>
            Ревизия {acceptance.revision} · позиций {acceptance.positions.length}
          </span>
        </div>

        {acceptance.positions.length === 0 ? (
          <p className={block("section-note")}>
            Позиций пока нет. Для направления заказчику нужна хотя бы одна
            позиция принятого.
          </p>
        ) : (
          <div className={block("table-wrap")}>
            <table className={block("table")}>
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>ОКПД2</th>
                  <th>Кол-во</th>
                  <th>Цена</th>
                  <th>НДС</th>
                  <th>Сумма с НДС</th>
                  {positionsEditable && <th />}
                </tr>
              </thead>
              <tbody>
                {acceptance.positions.map((position) => (
                  <tr key={position.id}>
                    <td>{position.name}</td>
                    <td>{position.okpd2 || "—"}</td>
                    <td>
                      {position.quantity} {position.unit}
                    </td>
                    <td>{formatMoney(position.unitPrice)} ₽</td>
                    <td>{position.vatRate} %</td>
                    <td>{formatMoney(position.totalWithVat)} ₽</td>
                    {positionsEditable && (
                      <td>
                        <div className={block("table-actions")}>
                          <button
                            type="button"
                            className={block("action", ["danger"])}
                            disabled={busy}
                            onClick={() => removePosition(position.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {positionsEditable && (
          <div className={block("inline-form")}>
            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Наименование</span>
              <input
                className={block("input")}
                value={positionName}
                onChange={(event) => setPositionName(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>ОКПД2</span>
              <input
                className={block("input")}
                value={positionOkpd2}
                onChange={(event) => setPositionOkpd2(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Единица</span>
              <input
                className={block("input")}
                value={positionUnit}
                onChange={(event) => setPositionUnit(event.target.value)}
                placeholder="шт / 796"
              />
              {/* ЕИС ждёт код ОКЕИ: подсказываем распознанный код, но текст
                  не переписываем — человек сам решает, как хранить единицу */}
              {positionUnit.trim() && (
                <span className={block("field-hint")}>
                  {okeiCodeFromUnit(positionUnit)
                    ? `ОКЕИ: ${okeiCodeFromUnit(positionUnit)}`
                    : "код ОКЕИ не распознан — укажите код из справочника"}
                </span>
              )}
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Количество</span>
              <input
                className={block("input")}
                value={positionQuantity}
                onChange={(event) => setPositionQuantity(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Цена с НДС, ₽</span>
              <input
                className={block("input")}
                value={positionPrice}
                onChange={(event) => setPositionPrice(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>НДС</span>
              <Select
                className={block("select")}
                value={positionVat}
                onChange={(event) => setPositionVat(event.target.value)}
              >
                {acceptanceVatRates.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate} %
                  </option>
                ))}
              </Select>
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Страна происхождения</span>
              <input
                className={block("input")}
                value={positionCountry}
                onChange={(event) => setPositionCountry(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Реестровая запись</span>
              <input
                className={block("input")}
                value={positionRegistry}
                onChange={(event) => setPositionRegistry(event.target.value)}
              />
            </label>

            <div className={block("card-actions")}>
              <button
                type="button"
                className={block("primary")}
                disabled={busy}
                onClick={addPosition}
              >
                Добавить позицию
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Недостатки</h2>

        {acceptance.defects.length === 0 ? (
          <p className={block("section-note")}>
            Недостатки не зафиксированы. Для приёмки с расхождениями или отказа
            нужен хотя бы один недостаток.
          </p>
        ) : (
          <div className={block("table-wrap")}>
            <table className={block("table")}>
              <thead>
                <tr>
                  <th>Позиция</th>
                  <th>Описание</th>
                  <th>Кол-во</th>
                  <th>Требование</th>
                  {defectsEditable && <th />}
                </tr>
              </thead>
              <tbody>
                {acceptance.defects.map((defect) => {
                  const position = acceptance.positions.find(
                    (item) => item.id === defect.positionId,
                  );

                  return (
                    <tr key={defect.id}>
                      <td>{position?.name ?? "документ в целом"}</td>
                      <td>{defect.description}</td>
                      <td>{defect.quantity}</td>
                      <td>{defect.requirementLabel}</td>
                      {defectsEditable && (
                        <td>
                          <div className={block("table-actions")}>
                            <button
                              type="button"
                              className={block("action", ["danger"])}
                              disabled={busy}
                              onClick={() => removeDefect(defect.id)}
                            >
                              Снять
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {defectsEditable && (
          <div className={block("inline-form")}>
            <label className={block("field")}>
              <span className={block("field-label")}>Позиция</span>
              <Select
                className={block("select")}
                value={defectPositionId}
                onChange={(event) => setDefectPositionId(event.target.value)}
              >
                <option value="">Документ в целом</option>
                {acceptance.positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Описание недостатка</span>
              <input
                className={block("input")}
                value={defectDescription}
                onChange={(event) => setDefectDescription(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Количество</span>
              <input
                className={block("input")}
                value={defectQuantity}
                onChange={(event) => setDefectQuantity(event.target.value)}
              />
            </label>

            <label className={block("field")}>
              <span className={block("field-label")}>Требование</span>
              <Select
                className={block("select")}
                value={defectRequirement}
                onChange={(event) =>
                  setDefectRequirement(
                    event.target.value as AcceptanceDefectRequirement,
                  )
                }
              >
                {acceptanceRequirementOrder.map((requirement) => (
                  <option key={requirement} value={requirement}>
                    {acceptanceRequirementLabels[requirement]}
                  </option>
                ))}
              </Select>
            </label>

            <div className={block("card-actions")}>
              <button
                type="button"
                className={block("secondary")}
                disabled={busy}
                onClick={addDefect}
              >
                Зафиксировать недостаток
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Итоги</h2>

        <div className={block("totals")}>
          <div className={block("total")}>
            <span>Сумма с НДС</span>
            <strong>{formatMoney(acceptance.totalWithVat)} ₽</strong>
          </div>
          <div className={block("total")}>
            <span>НДС</span>
            <strong>{formatMoney(acceptance.vatAmount)} ₽</strong>
          </div>
          <div className={block("total")}>
            <span>Без НДС</span>
            <strong>{formatMoney(acceptance.totalWithoutVat)} ₽</strong>
          </div>
          <div className={block("total")}>
            <span>Итог приёмки</span>
            <strong>
              {acceptance.result
                ? acceptanceResultLabels[acceptance.result]
                : "не определён"}
            </strong>
          </div>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Готовность к передаче в ЕИС (XML 17.0)
        </h2>

        <p className={block("section-note")}>
          Проверка по схеме `contractExecutionDocAcceptanceType`:{" "}
          {eisReadiness.summary}. Пакет собирает шлюз csms-api из этого
          документа — если замечания останутся, он откажет до подписания.
        </p>

        {eisReadiness.blocking.length > 0 && (
          <ul className={block("issues")}>
            {eisReadiness.blocking.map((issue, index) => (
              <li
                key={`xml-error-${issue.path}-${index}`}
                className={block("issue", ["error"])}
              >
                <span className={block("issue-field")}>{issue.path}</span>
                <span>
                  {issue.message}
                  {issue.hint ? ` — ${issue.hint}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {eisReadiness.warnings.length > 0 && (
          <ul className={block("issues")}>
            {eisReadiness.warnings.map((issue, index) => (
              <li key={`xml-warn-${issue.path}-${index}`} className={block("issue")}>
                <span className={block("issue-field")}>{issue.path}</span>
                <span>
                  {issue.message}
                  {issue.hint ? ` — ${issue.hint}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {eisReadiness.ok && (
          <p className={block("section-note")}>
            Блокирующих замечаний нет: документ можно передавать в ЕИС. Код вида
            документа (nsiContractExecutionDoc) и идентификатор заказчика
            указываются при сборке пакета на шлюзе.
          </p>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Действия</h2>

        {actions.length === 0 ? (
          <p className={block("section-note")}>
            В статусе «{acceptanceStatusLabels[acceptance.status]}» действий нет:
            документ закрыт.
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
                  if (action.key === "submit") {
                    runAction("submit");
                    return;
                  }

                  if (
                    action.key === "refuse" ||
                    action.key === "return" ||
                    action.key === "cancel"
                  ) {
                    setPendingAction(action.key);
                    setActionComment("");
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {pendingAction && (
          <div className={block("inline-form")}>
            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>
                {pendingAction === "refuse"
                  ? "Причина мотивированного отказа"
                  : pendingAction === "return"
                    ? "Что нужно уточнить"
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
                onClick={runCommentAction}
                disabled={busy}
              >
                Подтвердить
              </button>
            </div>
          </div>
        )}

        {acceptance.status === "Submitted" && (
          <div className={block("inline-form")}>
            <label className={block("field")}>
              <span className={block("field-label")}>Итог приёмки</span>
              <Select
                className={block("select")}
                value={acceptResult}
                onChange={(event) =>
                  setAcceptResult(event.target.value as AcceptanceResult)
                }
              >
                <option value="Accepted">
                  {acceptanceResultLabels.Accepted}
                </option>
                <option value="AcceptedWithDiscrepancies">
                  {acceptanceResultLabels.AcceptedWithDiscrepancies}
                </option>
              </Select>
            </label>

            <label className={block("field", ["wide"])}>
              <span className={block("field-label")}>Комментарий</span>
              <input
                className={block("input")}
                value={acceptComment}
                onChange={(event) => setAcceptComment(event.target.value)}
              />
            </label>

            <div className={block("card-actions")}>
              <button
                type="button"
                className={block("primary")}
                onClick={runAccept}
                disabled={busy}
              >
                Подписать итог
              </button>
            </div>
          </div>
        )}

        {(acceptance.status === "Accepted" ||
          acceptance.status === "AcceptedWithDiscrepancies") && (
          <div className={block("inline-form")}>
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
                onClick={runRegister}
                disabled={busy || !regNumber.trim()}
              >
                Зарегистрировать
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Связанные документы</h2>

        <div className={block("card-actions")}>
          <Link
            className={block("action")}
            to={`/contract-changes?contractId=${input.contractId}`}
          >
            Изменения и расторжения по контракту
          </Link>
          <Link
            className={block("action")}
            to={`/contract-changes/new?contractId=${input.contractId}`}
          >
            Оформить изменение или расторжение
          </Link>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>История</h2>

        <ul className={block("events")}>
          {acceptance.events.map((event, index) => (
            <li key={`${event.at}-${index}`} className={block("event")}>
              <div className={block("event-head")}>
                <span>{formatDate(event.at)}</span>
                <span>
                  {acceptanceStatusLabels[event.from]} →{" "}
                  {acceptanceStatusLabels[event.to]}
                </span>
                <span>{event.actor}</span>
              </div>
              <span className={block("doc-title")}>{event.action}</span>
              <span className={block("event-comment")}>{event.comment}</span>
            </li>
          ))}
        </ul>

        <dl className={block("meta")}>
          <MetaRow block={block}
            label="Создан"
            value={`${formatDate(acceptance.createdAt)} · ${input.createdBy}`}
          />
          <MetaRow block={block} label="Обновлён" value={formatDate(acceptance.updatedAt) || "—"} />
          {acceptance.submittedAt && (
            <MetaRow block={block} label="Направлен" value={formatDate(acceptance.submittedAt)} />
          )}
          {acceptance.reviewedAt && (
            <MetaRow block={block} label="Рассмотрен" value={formatDate(acceptance.reviewedAt)} />
          )}
          {acceptance.signedAt && (
            <MetaRow block={block}
              label="Подписан"
              value={`${formatDate(acceptance.signedAt)} · ${
                acceptance.signedBy ?? "—"
              }`}
            />
          )}
          {acceptance.registeredAt && (
            <MetaRow block={block}
              label="Зарегистрирован"
              value={`${formatDate(acceptance.registeredAt)} · ${
                acceptance.registeredBy ?? "—"
              }`}
            />
          )}
          {acceptance.eisRegistrationNumber && (
            <MetaRow block={block}
              label="Номер в ЕИС"
              value={`${acceptance.eisRegistrationNumber} от ${
                formatDate(acceptance.eisRegistrationDate ?? undefined) || "—"
              }`}
            />
          )}
        </dl>

        {meta && (
          <p className={block("muted")}>
            Предельный срок рассмотрения документа заказчиком —{" "}
            {meta.maxReviewTermDays} рабочих дней (ч. 13 ст. 94 44-ФЗ), но не
            более {maxReviewTermDays}.
          </p>
        )}
      </section>
    </main>
  );
}
