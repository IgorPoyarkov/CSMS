import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { ATTACHED_DOC_CATEGORIES } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

const AttachedDocsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { control } = useFormContext<NoticeInfoFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "attachedDocs",
  });

  const [draftFiles, setDraftFiles] = useState<
    Record<string, { fileName: string; description: string }>
  >({});

  const handleFilePick = (
    categoryId: string,
    fileList: FileList | null
  ) => {
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
    categoryId:
      | "nmck_justification"
      | "contract_project"
      | "object_description"
      | "application_requirements"
      | "evaluation_order"
      | "additional_docs"
  ) => {
    const draft = draftFiles[categoryId];
    if (!draft?.fileName) return;

    append({
      id: String(Date.now()),
      category: categoryId,
      fileName: draft.fileName,
      description: draft.description || draft.fileName,
    });

    setDraftFiles((prev) => ({
      ...prev,
      [categoryId]: { fileName: "", description: "" },
    }));
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Прилагаемые документы</h2>

      <div className={block("form-grid")}>
        {ATTACHED_DOC_CATEGORIES.map((cat) => {
          const categoryDocs = fields
            .map((f, idx) => ({ ...f, index: idx }))
            .filter((f) => f.category === cat.id);
          const draft = draftFiles[cat.id] || { fileName: "", description: "" };

          return (
            <div key={cat.id} className={block("row")}>
              <span className={block("label")}>
                {cat.title}
                {cat.required && <sup>*</sup>}
              </span>

              <div className={block("field-col")}>
                {cat.hint && <p className={block("red-note")}>{cat.hint}</p>}

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
                  <span className={block("muted")}>Нет прикреплённых файлов</span>
                ) : (
                  <ul className={block("doc-list")}>
                    {categoryDocs.map((doc) => (
                      <li key={doc.id} className={block("doc-item")}>
                        <span>
                          <strong>{doc.fileName}</strong> — {doc.description}
                        </span>
                        <button
                          type="button"
                          className={block("small-btn", ["danger"])}
                          onClick={() => remove(doc.index)}
                        >
                          Удалить
                        </button>
                      </li>
                    ))}
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
