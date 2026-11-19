import { useEffect, useRef, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  useReferenceDatasetEvents,
  useReferenceDatasets,
  type ReferenceDatasetInfo,
} from "../../services/Eis/referenceData.api";
import styles from "./ReferenceDataBadge.module.scss";

/**
 * Индикатор выгруженных справочников НСИ в шапке.
 *
 * Показываем только настоящие снимки: у них есть URL официального источника
 * и SHA-256 из 16 hex-символов. Демо-наборы из smoke/sse (`smoke-1`, `sse-*`)
 * остаются в истории БД, но за выгруженные справочники не выдаются.
 */

const DATASET_LABELS: Record<string, string> = {
  nsiOKPD2: "ОКПД2",
  nsiKTRU: "КТРУ",
  nsiKLADR: "КЛАДР",
  nsiOKTMO: "ОКТМО",
  nsiPurchasePreferences: "Требования НСИ",
};

const datasetLabel = (code: string): string => DATASET_LABELS[code] ?? code;

const isOfficialSnapshot = (dataset: ReferenceDatasetInfo): boolean =>
  dataset.isActive &&
  !!dataset.sourceUrl &&
  !!dataset.sourceSha256 &&
  /^[0-9a-fA-F]{64}$/.test(dataset.sourceSha256);

const numberFormat = new Intl.NumberFormat("ru-RU");

const formatDate = (value: string | null): string => {
  if (!value) return "дата не указана";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
};

const ReferenceDataBadge = () => {
  const { bem } = useUtils();
  const badge = bem(styles, "reference-badge");
  const query = useReferenceDatasets();
  useReferenceDatasetEvents(query.isSuccess);

  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const datasets = (query.data ?? []).filter(isOfficialSnapshot);
  const total = datasets.reduce((sum, dataset) => sum + dataset.itemCount, 0);
  const summary = datasets.length
    ? datasets.map((dataset) => datasetLabel(dataset.code)).join(", ")
    : query.isLoading
      ? "загрузка"
      : query.isError
        ? "нет связи с API"
        : "нет выгруженных";

  const title = datasets.length
    ? datasets
        .map(
          (dataset) =>
            `${datasetLabel(dataset.code)}: ${numberFormat.format(dataset.itemCount)} записей, версия ${dataset.version}`,
        )
        .join("\n")
    : "Справочники НСИ ещё не выгружены";

  return (
    <div ref={wrapRef} className={badge("wrap", isOpen ? ["open"] : [])}>
      <button
        type="button"
        className={badge("button", isOpen ? ["open"] : [])}
        title={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className={badge("icon")} aria-hidden="true">
          ▤
        </span>
        <span className={badge("name")}>Справочники ЕИС</span>
        <span className={badge("count")}>
          {datasets.length ? numberFormat.format(total) : summary}
        </span>
        <span className={badge("arrow")} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className={badge("panel")} role="menu">
          <div className={badge("panel-title")}>Выгруженные справочники</div>

          {datasets.length === 0 ? (
            <p className={badge("empty")}>
              {query.isError
                ? "Шлюз справочников недоступен. Запустите csms-api с EIS_STORE=postgres."
                : query.isLoading
                  ? "Опрос активных версий…"
                  : "Активных выгрузок нет. Импорт делается на бэке: POST /api/references/import/eis/nsiOKPD2"}
            </p>
          ) : (
            <ul className={badge("list")}>
              {datasets.map((dataset) => (
                <li key={dataset.code} className={badge("item")}>
                  <div className={badge("item-head")}>
                    <span className={badge("item-name")}>
                      {datasetLabel(dataset.code)}
                    </span>
                    <span className={badge("item-count")}>
                      {numberFormat.format(dataset.itemCount)} записей
                    </span>
                  </div>
                  <div className={badge("item-version")} title={dataset.version}>
                    {dataset.version}
                  </div>
                  <div className={badge("item-meta")}>
                    Дата действия: {formatDate(dataset.publishedAt)} · импорт:{" "}
                    {formatDate(dataset.importedAt)}
                  </div>
                  {dataset.sourceUrl && (
                    <a
                      className={badge("item-source")}
                      href={dataset.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={dataset.sourceUrl}
                    >
                      источник: {dataset.sourceUrl}
                    </a>
                  )}
                  {dataset.sourceSha256 && (
                    <div
                      className={badge("item-sha")}
                      title={dataset.sourceSha256}
                    >
                      SHA-256: {dataset.sourceSha256.slice(0, 16)}…
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className={badge("hint")}>
            Данные API /api/references/datasets. Список обновляется по SSE при
            импорте новой версии.
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceDataBadge;
