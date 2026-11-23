import { useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import {
  NOTICE_ATTACHMENT_SOURCE_LABELS,
  NOTICE_ATTACHMENT_STATUS_LABELS,
  canPublishNotice,
  canSuspendAttachmentCategory,
  isRequiredAttachmentCategory,
  normalizeNoticeAttachments,
  noticeAttachmentCategoryMeta,
  noticeAttachmentStatusMeta,
  type NoticeAttachmentStatus,
} from "../../../services/Procurements/noticeAttachment.schema";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { ATTACHED_DOC_CATEGORIES } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

/**
 * Раздел 2 формы извещения: документы закупки как составная часть извещения.
 *
 * Документы ООЗ и обоснование НМЦК приходят из утверждённой служебной записки
 * (см. `inheritAttachmentsFromPurchaseNote`), остальные прикладываются здесь.
 * У каждого документа есть статус: черновик, утверждён, приложен, отложен до
 * публикации или опубликован. Блок «Готовность к публикации» использует те же
 * правила, что и сохранение извещения, — расхождений между UI и валидацией нет.
 */
const AttachedDocsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { control } = useFormContext<NoticeInfoFormValues>();

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "attachedDocs",
  });

  const attachedDocs = useWatch({ control, name: "attachedDocs" });
  const placingWayCode = useWatch({
    control,
    name: "generalInfo.placingWayCode",
  });

  const [draftFiles, setDraftFiles] = useState<
    Record<string, { fileName: string; description: string }>
  >({});

  const normalized = useMemo(
    () => normalizeNoticeAttachments(attachedDocs ?? []),
    [attachedDocs],
  );

  const publishCheck = useMemo(
    () =>
      canPublishNotice({
        docs: normalized,
        placingWayCode,
        forPublish: true,
      }),
    [normalized, placingWayCode],
  );

  const handleFilePick = (categoryId: string, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setDraftFiles((prev) => ({
      ...prev,
      [categoryId]: {
        fileName: file.name,
        description: prev[categoryId]?.description || file.name,
      },
    }));
  };

  const handleAttach = (
    categoryId: NoticeInfoFormValues["attachedDocs"][number]["category"],
  ) => {
    const draft = draftFiles[categoryId];
    if (!draft?.fileName) return;

    const required = isRequiredAttachmentCategory(categoryId, placingWayCode);

    append({
      id: `doc-${Date.now()}`,
      category: categoryId,
      sourceKind: "manual",
      status: "attached",
      fileName: draft.fileName,
      description: draft.description || draft.fileName,
      attachedAt: new Date().toISOString(),
      isRequiredForPublish: required,
    });

    setDraftFiles((prev) => ({
      ...prev,
      [categoryId]: { fileName: "", description: "" },
    }));
  };

  // Код вида документа из nsiEPDocTypes: его знает только заказчик (справочник
  // ЕИС), поэтому вводится вручную. Пока пуст — предупреждение о ФЛК, не запрет.
  const handleDocKindCode = (index: number, code: string) => {
    const current = fields[index];

    update(index, {
      ...current,
      docKindCode: code.slice(0, 10).trim() || undefined,
    });
  };

  const handleStatus = (
    index: number,
    status: NoticeAttachmentStatus,
    categoryId: NoticeInfoFormValues["attachedDocs"][number]["category"],
  ) => {
    const current = fields[index];
    const timestamp = new Date().toISOString();

    update(index, {
      ...current,
      status,
      approvedAt:
        status === "approved"
          ? (current.approvedAt ?? timestamp)
          : current.approvedAt,
      attachedAt:
        status === "attached" || status === "published"
          ? (current.attachedAt ?? timestamp)
          : current.attachedAt,
      isRequiredForPublish:
        current.isRequiredForPublish ??
        isRequiredAttachmentCategory(categoryId, placingWayCode),
    });
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Прилагаемые документы</h2>

      <div
        className={block("publish-check", [publishCheck.ok ? "ok" : "blocked"])}
      >
        <strong>
          {publishCheck.ok
            ? "Состав документов готов к публикации"
            : "Публикация заблокирована: не хватает обязательных документов"}
        </strong>
        {publishCheck.issues.length > 0 && (
          <ul className={block("publish-issues")}>
            {publishCheck.issues.map((issue, index) => (
              <li
                key={`${issue.category ?? "doc"}-${index}`}
                className={block("publish-issue", [issue.severity])}
              >
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={block("form-grid")}>
        {ATTACHED_DOC_CATEGORIES.map((cat) => {
          const categoryDocs = fields
            .map((f, idx) => ({ ...f, index: idx }))
            .filter((f) => f.category === cat.id);
          const draft = draftFiles[cat.id] || { fileName: "", description: "" };
          const required = isRequiredAttachmentCategory(cat.id, placingWayCode);
          const canSuspend = canSuspendAttachmentCategory(cat.id);
          const categoryMeta = noticeAttachmentCategoryMeta(cat.id);

          return (
            <div key={cat.id} className={block("row")}>
              <span className={block("label")}>
                {cat.title}
                {required && <sup>*</sup>}
              </span>

              <div className={block("field-col")}>
                {categoryMeta.hint && (
                  <p className={block("red-note")}>{categoryMeta.hint}</p>
                )}

                <div className={block("inline-group")}>
                  <input
                    type="file"
                    onChange={(e) => handleFilePick(cat.id, e.target.files)}
                  />
                  <input
                    type="text"
                    placeholder="Описание файла"
                    value={draft.description}
                    className={block("input")}
                    onChange={(e) =>
                      setDraftFiles((prev) => ({
                        ...prev,
                        [cat.id]: {
                          ...draft,
                          description: e.target.value,
                        },
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={block("small-btn")}
                    onClick={() => handleAttach(cat.id)}
                  >
                    Прикрепить
                  </button>
                </div>

                {categoryDocs.length === 0 ? (
                  <span className={block("muted")}>
                    Нет прикреплённых файлов
                  </span>
                ) : (
                  <ul className={block("doc-list")}>
                    {categoryDocs.map((doc) => {
                      const status = noticeAttachmentStatusMeta(doc.status);
                      const sourceLabel =
                        NOTICE_ATTACHMENT_SOURCE_LABELS[
                          doc.sourceKind ?? "manual"
                        ];

                      return (
                        <li key={doc.id} className={block("doc-item")}>
                          <div className={block("doc-main")}>
                            <span>
                              <strong>{doc.fileName}</strong> —{" "}
                              {doc.description}
                            </span>
                            <span className={block("doc-meta")}>
                              <span
                                className={block("doc-status", [status.tone])}
                              >
                                {NOTICE_ATTACHMENT_STATUS_LABELS[status.status]}
                              </span>
                              <span className={block("doc-source")}>
                                {sourceLabel}
                              </span>
                            </span>

                            <label className={block("doc-kind")}>
                              <span className={block("doc-kind-label")}>
                                Код вида документа (nsiEPDocTypes)
                              </span>
                              <input
                                className={block("input")}
                                maxLength={10}
                                placeholder="код из справочника ЕИС"
                                value={doc.docKindCode ?? ""}
                                onChange={(event) =>
                                  handleDocKindCode(
                                    doc.index,
                                    event.target.value,
                                  )
                                }
                              />
                              {!doc.docKindCode && (
                                <span className={block("doc-kind-warning")}>
                                  Без кода вложение не пройдёт ФЛК ЕИС
                                </span>
                              )}
                            </label>
                          </div>

                          <div className={block("doc-actions")}>
                            {doc.status !== "approved" && (
                              <button
                                type="button"
                                className={block("small-btn")}
                                onClick={() =>
                                  handleStatus(doc.index, "approved", cat.id)
                                }
                              >
                                Утвердить
                              </button>
                            )}
                            {canSuspend &&
                              doc.status !== "suspended_before_publish" && (
                                <button
                                  type="button"
                                  className={block("small-btn", ["ghost"])}
                                  onClick={() =>
                                    handleStatus(
                                      doc.index,
                                      "suspended_before_publish",
                                      cat.id,
                                    )
                                  }
                                >
                                  Отложить до публикации
                                </button>
                              )}
                            {doc.status !== "draft" && (
                              <button
                                type="button"
                                className={block("small-btn", ["ghost"])}
                                onClick={() =>
                                  handleStatus(doc.index, "draft", cat.id)
                                }
                              >
                                В черновик
                              </button>
                            )}
                            <button
                              type="button"
                              className={block("small-btn", ["danger"])}
                              onClick={() => remove(doc.index)}
                            >
                              Удалить
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AttachedDocsSection;
