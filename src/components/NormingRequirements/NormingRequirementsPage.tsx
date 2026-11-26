import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import { useOrganizationEducations } from "../../services/ContractService/education.api";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import {
  useAttachNoticeAttachment,
  useNotices,
} from "../../services/Procurements/noticeInfo.api";
import { buildObjectDescriptionAttachment } from "../../services/Procurements/noticeAttachment.schema";
import {
  useCreateObjectDescription,
  useDeleteObjectDescription,
  useNormingTemplates,
  useOrganizationObjectDescriptions,
  useUpdateObjectDescription,
} from "../../services/ObjectDescription/objectDescription.api";
import {
  characteristicCategoryLabels,
  emptyObjectDescription,
  formatCharacteristicValue,
  OBJECT_DESCRIPTION_STATUSES,
  objectDescriptionStatusLabels,
  validateObjectDescriptionCompliance,
  type ObjectDescription,
  type ObjectDescriptionStatus,
} from "../../services/ObjectDescription/objectDescription.schema";
import { validateOrder158nCompliance } from "../../services/ObjectDescription/order158nValidator";
import { contractServiceRoster } from "../../services/ContractService/contractService.config";
import {
  useCreateTask,
  useOrganizationTasks,
  useUpdateTask,
} from "../../services/Tasks/tasks.api";
import { emptyTask } from "../../services/Tasks/tasks.schema";
import LegalActRefs from "../LegalAct/LegalActRefs";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import NormingTemplatesTab from "./NormingTemplatesTab";
import ObjectDescriptionEditor from "./ObjectDescriptionEditor";
import Order158nValidatorPanel from "./Order158nValidatorPanel";
import styles from "./NormingRequirementsPage.module.scss";

type ActiveTab = "descriptions" | "templates";

/**
 * Единая точка работы со структурированным описанием объекта закупки (ООЗ):
 * 1) Конструктор ООЗ по ст. 33 44-ФЗ, ПП РФ № 145 (КТРУ) и ГОСТ;
 * 2) Типовые требования по п. 7 ПП РФ № 926 для нормируемых кодов ОКПД2.
 */
export default function NormingRequirementsPage() {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextParams = useMemo(() => {
    const read = (key: string) => searchParams.get(key) ?? "";
    return {
      purchasePlanId: read("purchasePlanId"),
      positionId: read("positionId"),
      purchaseNoteId: read("purchaseNoteId"),
      // Конкретный ООЗ, связанный с СЗ: из СЗ переходим в его карточку,
      // а не создаём новое пустое описание.
      oozId: read("oozId"),
      ikz: read("ikz"),
      okpd2Code: read("okpd2Code"),
      okpd2Name: read("okpd2Name"),
      ktruCode: read("ktruCode"),
      useKtru: read("useKtru") === "true",
      ktruRefusalReason: read("ktruRefusalReason"),
      title: read("title"),
      returnTo: read("returnTo"),
    };
  }, [searchParams]);
  const { organization, contractService, employee, user, isHead } =
    useMyContractRole();

  const currentFio = useMemo(() => {
    const emp = employee?.employee;
    const fio = [emp?.surname, emp?.name, emp?.patronymic]
      .filter(Boolean)
      .join(" ");
    return fio || user?.email || "";
  }, [employee, user]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: tasks = [] } = useOrganizationTasks(organization?.id);
  // Ответственный в КС — руководитель службы (первая строка ростера)
  const reviewer = contractService
    ? contractServiceRoster(contractService)[0]
    : undefined;
  const reviewerId = reviewer?.employeeId;

  const today = (): string => new Date().toISOString().slice(0, 10);
  const addDays = (date: string, days: number): string => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  };

  // Невозможность определить объём (ч. 24 ст. 22 44-ФЗ) делает объект предметом
  // нормирования: по ч. 24 ст. 22 при таком способе обоснования НМЦК применяется
  // ст. 19 44-ФЗ. После направления в КС / утверждения ставим системную задачу
  // «пронормировать объект».
  const maybeCreateNormingTask = (value: ObjectDescription) => {
    if (!organization?.id) return;

    const existingActive = tasks.filter(
      (task) =>
        value.id !== undefined &&
        value.id !== null &&
        value.id !== "" &&
        String(task.objectDescriptionId ?? "") === String(value.id) &&
        task.functionCode === "planning" &&
        (task.status === "pending" || task.status === "in_progress"),
    );

    // ООЗ вернули на доработку: закрываем старую задачу — при повторной
    // отправке появится новая.
    if (value.status === "draft") {
      for (const task of existingActive) {
        if (task.id === undefined) continue;
        updateTask.mutate({
          id: task.id,
          changes: {
            status: "completed",
            result: "ООЗ возвращён на доработку.",
          },
        });
      }
      return;
    }

    if (!value.isIndeterminateVolume) return;
    // Пока статус ООЗ не менялся, задача должна быть одна.
    if (existingActive.length > 0) return;
    if (reviewerId === undefined || reviewerId === "") return;

    createTask.mutate({
      ...emptyTask(organization.id),
      objectDescriptionId: value.id,
      title: `Пронормировать объект закупки: ${
        value.title || "объект закупки"
      }`.slice(0, 150),
      description: [
        `В ООЗ указано «Невозможно определить объём» (ч. 24 ст. 22 44-ФЗ).`,
        `По ч. 24 ст. 22 при таком способе обоснования НМЦК применяется нормирование (ст. 19 44-ФЗ, ПП РФ № 926 / № 1047).`,
        value.purchaseNoteId !== undefined &&
        value.purchaseNoteId !== null &&
        value.purchaseNoteId !== ""
          ? `Служебная записка: № ${value.purchaseNoteId}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      origin: "system",
      functionCode: "planning",
      assigneeId: reviewerId,
      assigneeName: reviewer?.employeeFullName ?? "",
      assignedByEmployeeId: employee?.id ?? "",
      assignedByName: currentFio,
      dueDate: addDays(today(), 5),
    });
  };

  const { data: allItems = [], isLoading } = useOrganizationObjectDescriptions(
    organization?.id,
  );
  const { data: educations = [] } = useOrganizationEducations(organization?.id);
  const { data: okpd2Dictionary = [] } = useOkpd2Dictionary();
  const { byCode: templatesByCode } = useNormingTemplates(organization?.id);
  const createMutation = useCreateObjectDescription();
  const updateMutation = useUpdateObjectDescription();
  const deleteMutation = useDeleteObjectDescription();
  // ООЗ — документ Раздела 2 извещения: при сохранении он прикладывается к
  // связанному извещению (по procurementId или purchaseNoteId), а не только
  // остаётся в своём реестре. Статус следует за статусом ООЗ.
  const { data: notices = [] } = useNotices();
  const attachToNotice = useAttachNoticeAttachment();

  const attachObjectDescription = (saved: ObjectDescription) => {
    if (saved.kind !== "object_description") return;

    const notice = notices.find(
      (item) =>
        (saved.procurementId !== undefined &&
          String(item.procurementId ?? "") === String(saved.procurementId)) ||
        (saved.purchaseNoteId !== undefined &&
          String(item.purchaseNoteId ?? "") === String(saved.purchaseNoteId)),
    );

    if (!notice?.id) return;

    attachToNotice.mutate({
      noticeId: notice.id,
      attachment: buildObjectDescriptionAttachment({
        description: saved,
        noticeId: notice.id,
        procurementId: saved.procurementId,
        purchaseNoteId: saved.purchaseNoteId,
        uploadedBy: currentFio,
      }),
    });
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("descriptions");
  const [editingItem, setEditingItem] = useState<ObjectDescription | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ObjectDescriptionStatus | "all"
  >("all");
  const [pageSize, setPageSize] = useState<PageSizeValue>(10);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [validatorSelectedId, setValidatorSelectedId] = useState<
    string | number | null
  >(null);
  const validatorRef = useRef<HTMLDivElement>(null);

  const objectDescriptions = useMemo(() => {
    const onlyDescriptions = allItems.filter(
      (item) => item.kind === "object_description",
    );
    const needle = searchQuery.trim().toLowerCase();

    return onlyDescriptions.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        item.title.toLowerCase().includes(needle) ||
        item.okpd2Code.toLowerCase().includes(needle) ||
        (item.okpd2Name ?? "").toLowerCase().includes(needle) ||
        (item.ktruCode ?? "").toLowerCase().includes(needle) ||
        (item.ikz ?? "").toLowerCase().includes(needle)
      );
    });
  }, [allItems, searchQuery, statusFilter]);

  const effectiveSize =
    pageSize === "all" ? Math.max(objectDescriptions.length, 1) : pageSize;
  const totalPages = Math.max(
    1,
    Math.ceil(objectDescriptions.length / effectiveSize),
  );
  const safePage = Math.min(page, totalPages);
  const pagedDescriptions = useMemo(() => {
    const start = (safePage - 1) * effectiveSize;
    return objectDescriptions.slice(start, start + effectiveSize);
  }, [objectDescriptions, safePage, effectiveSize]);

  const applyContextToDescription = (value: ObjectDescription) => {
    if (contextParams.purchasePlanId)
      value.purchasePlanId = contextParams.purchasePlanId;
    if (contextParams.positionId) value.positionId = contextParams.positionId;
    if (contextParams.purchaseNoteId)
      value.purchaseNoteId = contextParams.purchaseNoteId;
    if (contextParams.ikz) value.ikz = contextParams.ikz;
    if (contextParams.okpd2Code) value.okpd2Code = contextParams.okpd2Code;
    if (contextParams.okpd2Name) value.okpd2Name = contextParams.okpd2Name;
    if (contextParams.ktruCode) value.ktruCode = contextParams.ktruCode;
    value.useKtru = contextParams.useKtru || Boolean(contextParams.ktruCode);
    if (contextParams.ktruRefusalReason)
      value.ktruRefusalReason = contextParams.ktruRefusalReason;
    if (contextParams.title) value.title = contextParams.title;
    return value;
  };

  const openNewEditor = () => {
    const fresh = emptyObjectDescription(
      organization?.id ?? null,
      "object_description",
    );
    fresh.authorName = currentFio;
    applyContextToDescription(fresh);
    setActiveTab("descriptions");
    setEditingItem(fresh);
  };

  // При переходе из СЗ/ПГ открываем карточку конкретного ООЗ, если он уже
  // связан с запиской. Иначе — новый редактор с подставленным контекстом.
  const contextKey = contextParams.returnTo
    ? [
        contextParams.returnTo,
        contextParams.positionId,
        contextParams.purchaseNoteId,
        contextParams.oozId,
        organization?.id ?? "",
      ].join("|")
    : "";
  const [appliedContextKey, setAppliedContextKey] = useState("");
  useEffect(() => {
    if (!contextKey || contextKey === appliedContextKey) return;
    // Ждём загрузку справочника: иначе связанный ООЗ ещё не найден и
    // откроется пустая карточка.
    if (isLoading) return;

    setAppliedContextKey(contextKey);
    setActiveTab("descriptions");

    const linked = contextParams.oozId
      ? allItems.find(
          (item) =>
            item.kind === "object_description" &&
            String(item.id) === String(contextParams.oozId),
        )
      : undefined;
    if (linked) {
      setEditingItem(linked);
      return;
    }

    const fresh = emptyObjectDescription(
      organization?.id ?? null,
      "object_description",
    );
    fresh.authorName = currentFio;
    setEditingItem(applyContextToDescription(fresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contextKey,
    appliedContextKey,
    isLoading,
    allItems,
    contextParams.oozId,
    organization?.id,
    currentFio,
  ]);

  const openDuplicate = (source: ObjectDescription) => {
    const clone: ObjectDescription = {
      ...source,
      id: undefined,
      status: "draft",
      approvedByName: "",
      approvedDate: "",
      title: `${source.title} (копия)`,
      authorName: currentFio || source.authorName,
      characteristics: source.characteristics.map((c) => ({
        ...c,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      standards: source.standards.map((s) => ({
        ...s,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };
    setActiveTab("descriptions");
    setEditingItem(clone);
  };

  const handleCreateFromTemplate = (template: ObjectDescription) => {
    const fresh = emptyObjectDescription(
      organization?.id ?? null,
      "object_description",
    );
    fresh.title = template.okpd2Name || template.title;
    fresh.okpd2Code = template.okpd2Code;
    fresh.okpd2Name = template.okpd2Name;
    fresh.unit = template.unit;
    fresh.authorName = currentFio;
    fresh.characteristics = template.characteristics.map((c) => ({
      ...c,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    setActiveTab("descriptions");
    setEditingItem(fresh);
  };

  const handleSave = (value: ObjectDescription) => {
    const normalized: ObjectDescription = {
      ...value,
      organizationId: value.organizationId ?? organization?.id ?? null,
    };

    if (normalized.id !== undefined && normalized.id !== "") {
      updateMutation.mutate(
        { ...normalized, id: normalized.id },
        {
          onSuccess: (saved) => {
            setEditingItem(null);
            attachObjectDescription(saved);
            maybeCreateNormingTask(saved);
            if (contextParams.returnTo)
              navigate(`${contextParams.returnTo}&oozId=${saved.id ?? ""}`);
          },
        },
      );
    } else {
      createMutation.mutate(normalized, {
        onSuccess: (saved) => {
          setEditingItem(null);
          attachObjectDescription(saved);
          maybeCreateNormingTask(saved);
        },
      });
    }
  };

  /**
   * Сохранить карточку как черновик без закрытия редактора. Нужно для
   * «Добавить объект»: объект создаётся только после появления id у ООЗ.
   */
  const handlePersistDraft = async (
    value: ObjectDescription,
  ): Promise<ObjectDescription | undefined> => {
    const normalized: ObjectDescription = {
      ...value,
      status: "draft",
      organizationId: value.organizationId ?? organization?.id ?? null,
    };
    try {
      if (normalized.id !== undefined && normalized.id !== "") {
        return await updateMutation.mutateAsync({
          ...normalized,
          id: normalized.id,
        });
      }
      return await createMutation.mutateAsync(normalized);
    } catch {
      return undefined;
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div className={block("header-top")}>
          <div>
            <h1 className={block("title")}>
              Описание объекта закупки (ООЗ) и нормирование
            </h1>
            <p className={block("summary")}>
              Структурированное формирование характеристик товара, работы или
              услуги по ст. 33 44-ФЗ, правил КТРУ (ПП РФ № 145) и типовых
              требований нормирования (ПП РФ № 926) для последующей передачи в
              служебную записку и извещение.
            </p>
          </div>
          {!editingItem && (
            <button
              type="button"
              className={block("primary-btn")}
              onClick={openNewEditor}
            >
              + Новое описание объекта
            </button>
          )}
        </div>
        <LegalActRefs component="NormingRequirementsPage" />
      </header>

      {!editingItem && (
        <div className={block("tabs")} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "descriptions"}
            className={block(
              "tab",
              activeTab === "descriptions" ? ["active"] : [],
            )}
            onClick={() => setActiveTab("descriptions")}
          >
            Конструктор ООЗ (
            {allItems.filter((i) => i.kind === "object_description").length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "templates"}
            className={block(
              "tab",
              activeTab === "templates" ? ["active"] : [],
            )}
            onClick={() => setActiveTab("templates")}
          >
            Типовые требования по ОКПД2 (п. 7 ПП 926)
          </button>
        </div>
      )}

      {editingItem ? (
        <ObjectDescriptionEditor
          key={String(editingItem.id ?? "new")}
          initialValue={editingItem}
          organizationId={organization?.id}
          templatesByCode={templatesByCode}
          contractService={contractService}
          educations={educations}
          isHead={isHead}
          defaultApproverName={currentFio}
          isSaving={isSaving}
          onPersistDraft={handlePersistDraft}
          onSave={handleSave}
          onCancel={() => setEditingItem(null)}
        />
      ) : activeTab === "templates" ? (
        <NormingTemplatesTab
          organizationId={organization?.id}
          onCreateDescriptionFromTemplate={handleCreateFromTemplate}
        />
      ) : (
        <div className={block("section")}>
          <div className={block("toolbar")}>
            <input
              className={block("search")}
              type="search"
              placeholder="Поиск по названию, ОКПД2, КТРУ или ИКЗ…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />

            <div className={block("chips")}>
              <button
                type="button"
                className={block(
                  "chip",
                  statusFilter === "all" ? ["active"] : [],
                )}
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                Все
              </button>
              {OBJECT_DESCRIPTION_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={block(
                    "chip",
                    statusFilter === st ? ["active"] : [],
                  )}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                >
                  {objectDescriptionStatusLabels[st]}
                </button>
              ))}
            </div>

            <PageSizePicker
              sizes={[5, 10, 25, "all"]}
              value={pageSize}
              onChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </div>

          <div ref={validatorRef}>
            <Order158nValidatorPanel
              descriptions={objectDescriptions}
              selectedId={validatorSelectedId}
              onSelectId={setValidatorSelectedId}
              contractService={contractService}
              educations={educations}
              okpd2Dictionary={okpd2Dictionary}
            />
          </div>

          {isLoading ? (
            <p className={block("muted")}>
              Загрузка описаний объектов закупки…
            </p>
          ) : pagedDescriptions.length === 0 ? (
            <div className={block("empty-box")}>
              <p className={block("empty")}>
                Сохранённых структурированных описаний по текущему фильтру нет.
              </p>
              <button
                type="button"
                className={block("primary-btn")}
                onClick={openNewEditor}
              >
                Создать первое описание объекта закупки
              </button>
            </div>
          ) : (
            <div className={block("list")}>
              {pagedDescriptions.map((item) => {
                const issues = validateObjectDescriptionCompliance(item);
                const errorsCount = issues.filter(
                  (i) => i.level === "error",
                ).length;
                const warningsCount = issues.filter(
                  (i) => i.level === "warning",
                ).length;
                const order158nReport = validateOrder158nCompliance(item, {
                  contractService,
                  educations,
                  okpd2Dictionary,
                });
                const isExpanded = expandedId === item.id;

                return (
                  <article key={String(item.id)} className={block("item")}>
                    <div className={block("item-head")}>
                      <div className={block("item-title-col")}>
                        <div className={block("item-badges")}>
                          <span
                            className={block("status-badge", [item.status])}
                          >
                            {objectDescriptionStatusLabels[item.status]}
                          </span>
                          <span className={block("item-code")}>
                            ОКПД2 {item.okpd2Code}
                          </span>
                          {item.useKtru && item.ktruCode && (
                            <span className={block("ktru-badge")}>
                              КТРУ {item.ktruCode}
                            </span>
                          )}
                          {errorsCount > 0 ? (
                            <span
                              className={block("compliance-badge", ["error"])}
                            >
                              Ошибок: {errorsCount}
                            </span>
                          ) : warningsCount > 0 ? (
                            <span
                              className={block("compliance-badge", ["warning"])}
                            >
                              Замечаний: {warningsCount}
                            </span>
                          ) : (
                            <span className={block("compliance-badge", ["ok"])}>
                              Соответствует ст. 33 / ПП 145
                            </span>
                          )}
                          {order158nReport.failCount > 0 ? (
                            <span
                              className={block("compliance-badge", ["error"])}
                            >
                              158н: нарушений {order158nReport.failCount}
                            </span>
                          ) : order158nReport.warningCount > 0 ? (
                            <span
                              className={block("compliance-badge", ["warning"])}
                            >
                              158н: внимание {order158nReport.warningCount}
                            </span>
                          ) : (
                            <span className={block("compliance-badge", ["ok"])}>
                              158н: Соответствует
                            </span>
                          )}
                        </div>

                        <h2 className={block("item-title")}>{item.title}</h2>
                        <p className={block("item-meta")}>
                          Характеристик: {item.characteristics.length}
                          {item.standards.length > 0
                            ? ` · Стандартов: ${item.standards.length}`
                            : ""}
                          {item.unit || item.quantity
                            ? ` · Объём: ${item.isIndeterminateVolume ? "не определён" : `${item.quantity || "—"} ${item.unit || ""}`.trim()}`
                            : ""}
                          {item.authorName
                            ? ` · Составитель: ${item.authorName}`
                            : ""}
                        </p>
                      </div>

                      <div className={block("item-controls")}>
                        {item.purchaseNoteId !== undefined &&
                          item.purchaseNoteId !== null &&
                          item.purchaseNoteId !== "" && (
                            <Link
                              className={block("secondary-btn")}
                              to={`/purchase-notes/${item.purchaseNoteId}`}
                            >
                              Открыть СЗ
                            </Link>
                          )}
                        <button
                          type="button"
                          className={block("secondary-btn")}
                          onClick={() => {
                            setValidatorSelectedId(item.id ?? null);
                            validatorRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }}
                        >
                          Проверить по № 158н
                        </button>
                        <button
                          type="button"
                          className={block("secondary-btn")}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : (item.id ?? null))
                          }
                        >
                          {isExpanded ? "Свернуть" : "Состав"}
                        </button>
                        <button
                          type="button"
                          className={block("secondary-btn")}
                          onClick={() => openDuplicate(item)}
                        >
                          Копия
                        </button>
                        <button
                          type="button"
                          className={block("primary-btn")}
                          onClick={() => setEditingItem(item)}
                        >
                          Изменить
                        </button>
                        {item.id !== undefined && (
                          <button
                            type="button"
                            className={block("req-remove")}
                            onClick={() => deleteMutation.mutate(item.id!)}
                            title="Удалить описание"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={block("item-details")}>
                        {item.characteristics.length > 0 && (
                          <table className={block("char-table")}>
                            <thead>
                              <tr>
                                <th>Категория</th>
                                <th>Показатель</th>
                                <th>Значение</th>
                                <th>КТРУ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.characteristics.map((c) => (
                                <tr key={c.id}>
                                  <td>
                                    {characteristicCategoryLabels[c.category]}
                                  </td>
                                  <td>{c.name}</td>
                                  <td>{formatCharacteristicValue(c)}</td>
                                  <td>
                                    {c.isMandatoryFromKtru
                                      ? "Обяз. КТРУ"
                                      : c.isAdditionalOverKtru
                                        ? "Доп. (ПП 145)"
                                        : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className={block("pagination")}>
              <button
                type="button"
                className={block("secondary-btn")}
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Назад
              </button>
              <span className={block("count")}>
                Страница {safePage} из {totalPages}
              </span>
              <button
                type="button"
                className={block("secondary-btn")}
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      )}

      <footer className={block("footer")}>
        <Link
          className={block("back-link")}
          to={
            contextParams.returnTo ||
            (contextParams.purchaseNoteId
              ? `/purchase-notes/${contextParams.purchaseNoteId}`
              : "/norming-requirements")
          }
        >
          {contextParams.returnTo || contextParams.purchaseNoteId
            ? "← Вернуться в СЗ"
            : "← К списку ООЗ"}
        </Link>
        <Link className={block("back-link")} to="/procurement-processing">
          Перейти к обработке закупок →
        </Link>
      </footer>
    </section>
  );
}
