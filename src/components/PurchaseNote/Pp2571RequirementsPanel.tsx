import {
  formatPp2571Money,
  getPp2571Applicability,
  normalizePp2571Positions,
  PP2571_POSITIONS,
  pp2571ExperienceShare,
  resolvePp2571Position,
  type Pp2571Issue,
  type Pp2571ObjectInput,
} from "../../services/Pp2571/pp2571.schema";
import styles from "./PurchaseNoteModal.module.scss";

interface Pp2571RequirementsPanelProps {
  /** НМЦК закупки в рублях */
  nmck: number;
  /** Способ определения поставщика (код ЕИС) */
  placingWayCode?: string;
  /** Объекты закупки из СЗ */
  items: Pp2571ObjectInput[];
  /** Выбранные позиции приложения */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Замечания валидатора: ошибки блокируют сохранение, предупреждения — нет */
  issues: Pp2571Issue[];
  /** Подставить в описание требования текст по выбранным позициям */
  onFillRequirementText?: () => void;
  disabled?: boolean;
  /**
   * Развёрнут ли список позиций. Управляется флагом «Дополнительные
   * требования по ч. 2 ст. 31»: замечания валидатора показываются всегда,
   * чтобы рассинхрон флага и выбранных позиций был виден до сохранения.
   */
  open?: boolean;
}

/**
 * Блок требований ПП РФ от 29.12.2021 № 2571 в служебной записке.
 *
 * Показывает применимость позиций приложения к текущей закупке (объект +
 * порог НМЦК по п. 3 «а»), замечания валидатора и подтверждающие документы,
 * которые участник должен представить по графе приложения. Пользователь может
 * подобрать позиции по объектам и сгенерировать текст требования.
 */
export default function Pp2571RequirementsPanel({
  nmck,
  placingWayCode,
  items,
  selected,
  onChange,
  issues,
  onFillRequirementText,
  disabled = false,
  open = true,
}: Pp2571RequirementsPanelProps) {
  const selectedIds = normalizePp2571Positions(selected);
  const applicability = getPp2571Applicability({
    nmck,
    placingWayCode,
    items,
    selectedPositions: selectedIds,
  });

  const applicableIds = applicability
    .filter((item) => item.applicable)
    .map((item) => item.position.id);

  const selectedPositions = selectedIds
    .map((id) => resolvePp2571Position(id))
    .filter((position) => Boolean(position));

  const documents = Array.from(
    new Set(selectedPositions.flatMap((position) => position!.documents)),
  );
  const licenses = Array.from(
    new Set(selectedPositions.flatMap((position) => position!.licenses ?? [])),
  );

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div className={styles["purchase-note-modal__pp2571-panel"]}>
      {issues.length > 0 && (
        <ul className={styles["purchase-note-modal__pp2571-issues"]}>
          {issues.map((issue) => (
            <li
              key={`${issue.code}-${issue.message}`}
              className={[
                styles["purchase-note-modal__pp2571-issue"],
                issue.level === "error"
                  ? styles["purchase-note-modal__pp2571-issue--error"]
                  : styles["purchase-note-modal__pp2571-issue--warning"],
              ].join(" ")}
              role={issue.level === "error" ? "alert" : "status"}
            >
              <strong>
                {issue.level === "error" ? "Ошибка" : "Внимание"}.
              </strong>{" "}
              {issue.message}
              <span className={styles["purchase-note-modal__pp2571-issue-ref"]}>
                Основание: {issue.legalRef}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Рекомендация системы видна и в свёрнутом, и в раскрытом виде: иначе
          при раскрытии списка терялось пояснение, о чём предупреждение. */}
      {applicableIds.length > 0 && (
        <p className={styles["purchase-note-modal__pp2571-recommendation"]}>
          Система рекомендует установить дополнительные требования: применимы{" "}
          {applicableIds.length}{" "}
          {applicableIds.length === 1 ? "позиция" : "позиции"} приложения.{" "}
          {open
            ? "Они подсвечены в списке ниже."
            : "Включите флаг выше, чтобы выбрать их."}
        </p>
      )}

      {open && (
        <>
          <div className={styles["purchase-note-modal__pp2571-toolbar"]}>
            <button
              type="button"
              className={styles["purchase-note-modal__link-btn"]}
              onClick={() => onChange(applicableIds)}
              disabled={disabled || applicableIds.length === 0}
            >
              Подобрать позиции по объектам
            </button>
            <button
              type="button"
              className={styles["purchase-note-modal__link-btn"]}
              onClick={onFillRequirementText}
              disabled={
                disabled || selectedIds.length === 0 || !onFillRequirementText
              }
            >
              Описать требование по приложению
            </button>
          </div>

          <p className={styles["purchase-note-modal__hint"]}>
            Позиция приложения применяется, если объект закупки указан в её
            графе, НМЦК превышает порог по п. 3 «а» и способ закупки
            конкурентный. Дополнительные требования устанавливаются по ч. 2 ст.
            31 Закона № 44-ФЗ.
          </p>

          <div className={styles["purchase-note-modal__pp2571-options"]}>
            {applicability.map((item) => {
              const share = pp2571ExperienceShare(item.position, nmck);
              const checked = selectedIds.includes(item.position.id);
              const meta = [
                item.threshold > 0
                  ? `порог НМЦК: более ${formatPp2571Money(item.threshold)}`
                  : "порог НМЦК: не установлен (применяется независимо от НМЦК)",
                share !== undefined ? `опыт: не менее ${share} % НМЦК` : "",
                `код ЕИС: ${item.position.eisCode}`,
                item.matchedItems.length > 0
                  ? "объект закупки соответствует позиции"
                  : "объект по ОКПД2/наименованию не найден",
              ]
                .filter(Boolean)
                .join("; ");

              return (
                <label
                  key={item.position.id}
                  className={[
                    styles["purchase-note-modal__checkbox"],
                    styles["purchase-note-modal__pp2571-option"],
                    // Рекомендация системы — применимая позиция приложения:
                    // подсвечиваем строку, чтобы её было видно в списке
                    item.applicable
                      ? styles[
                          "purchase-note-modal__pp2571-option--recommended"
                        ]
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.position.id)}
                    disabled={disabled}
                  />
                  <span>
                    {item.position.label}
                    {item.applicable && (
                      <span
                        className={styles["purchase-note-modal__pp2571-badge"]}
                      >
                        Рекомендуется системой
                      </span>
                    )}
                    <span
                      className={styles["purchase-note-modal__pp2571-meta"]}
                    >
                      {meta}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {documents.length > 0 && (
            <div className={styles["purchase-note-modal__pp2571-docs"]}>
              <p className={styles["purchase-note-modal__subbox-title"]}>
                Информация и документы, подтверждающие соответствие
              </p>
              <ul className={styles["purchase-note-modal__pp2571-docs-list"]}>
                {documents.map((document) => (
                  <li key={document}>{document}</li>
                ))}
                {licenses.map((license) => (
                  <li key={license}>{license}</li>
                ))}
              </ul>
            </div>
          )}

          <p className={styles["purchase-note-modal__hint"]}>
            В извещение выбранные позиции уходят блоком{" "}
            <code>addRequirements</code>: <code>shortName</code> — код записи
            справочника ЕИС (до 20 символов), <code>name</code> — наименование
            позиции, <code>content</code> — текст требования и перечень ОКПД2
            объектов закупки по этой позиции. В справочнике проекта{" "}
            {PP2571_POSITIONS.length} позиции приложения (полный перечень в
            редакции от 27.04.2026) — см.{" "}
            <code>src/services/Pp2571/pp2571.schema.ts</code>.
          </p>
        </>
      )}
    </div>
  );
}
