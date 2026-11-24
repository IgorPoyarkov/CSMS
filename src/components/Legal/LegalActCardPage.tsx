import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import {
  useNpaAct,
  useVerifyNpaVersion,
} from "../../services/LegalNpa/legalNpa.api";
import {
  diffNpaArticles,
  npaCompleteness,
  npaKindLabels,
  npaKindOf,
  sortVersions,
  sortVersionsDesc,
} from "../../services/LegalNpa/legalNpa.schema";
import Select from "../UI/Select";
import styles from "./LegalNpa.module.scss";

const STATUS_LABELS = {
  added: "добавлена",
  removed: "удалена",
  changed: "изменена",
} as const;

/**
 * Карточка НПА: реквизиты, полнота набора редакций, таймлайн версий и diff
 * по статьям между двумя редакциями. Пока тексты не загружены (contentStatus
 * = metadata), diff честно сообщает, что сравнивать нечего.
 */
export default function LegalActCardPage() {
  const { id } = useParams<{ id: string }>();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "legal-act");
  const { data: act, isLoading, isError } = useNpaAct(id);
  const { verify, isPending } = useVerifyNpaVersion();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  // Хронология — для выбора «было → стало», обратная — для чтения списка:
  // свежие редакции нужны первыми, архаика внизу.
  const chronological = useMemo(
    () => sortVersions(act?.versions ?? []),
    [act?.versions],
  );
  const versions = useMemo(
    () => sortVersionsDesc(act?.versions ?? []),
    [act?.versions],
  );
  const completeness = act ? npaCompleteness(act) : null;

  const fromVersion =
    chronological.find((version) => version.id === fromId) ??
    chronological[chronological.length - 2] ??
    chronological[0];
  const toVersion =
    chronological.find((version) => version.id === toId) ??
    chronological[chronological.length - 1];

  const diff = useMemo(() => {
    if (!fromVersion || !toVersion || fromVersion.id === toVersion.id) {
      return [];
    }
    return diffNpaArticles(fromVersion, toVersion);
  }, [fromVersion, toVersion]);

  const hasTexts =
    Boolean(fromVersion?.articles.length) &&
    Boolean(toVersion?.articles.length);

  if (isLoading) {
    return <p className={block("hint")}>Загрузка акта…</p>;
  }

  if (isError || !act) {
    return (
      <section className={block()}>
        <p className={block("error")}>
          Акт не найден.{" "}
          <Link className={block("link")} to="/legal">
            Вернуться к реестру
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <p className={block("kind")}>{npaKindLabels[npaKindOf(act)]}</p>
          <h1 className={block("title")}>{act.shortName}</h1>
          {act.fullName && <p className={block("full")}>{act.fullName}</p>}
          <p className={block("meta")}>
            {act.actNumber ? `№ ${act.actNumber}` : ""}
            {act.adoptedDate ? ` · принят ${formatDate(act.adoptedDate)}` : ""}
            {act.lastCheckedDate
              ? ` · сверка ${formatDate(act.lastCheckedDate)}`
              : ""}
          </p>
        </div>
        <div className={block("header-actions")}>
          <Link className={block("link")} to="/legal">
            ← Реестр НПА
          </Link>
          {act.sourceUrl && (
            <a
              className={block("link")}
              href={act.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Первоисточник
            </a>
          )}
        </div>
      </header>

      {completeness && (
        <div
          className={block("completeness", [
            completeness.complete ? "ok" : "warn",
          ])}
        >
          <b>
            {completeness.actual} из {completeness.required} редакций
          </b>
          <span>
            {completeness.sourceComplete
              ? `Источник подтвердил: всего ${completeness.actual} редакций — набор полный.`
              : completeness.complete
                ? "Порог набора выполнен."
                : "Набор не подтверждён источником. Это не ошибка: проверьте, все ли редакции загружены."}
          </span>
          <code>node scripts/npa-sync.mjs --check</code>
        </div>
      )}

      <section className={block("section")}>
        <h2 className={block("section-title")}>Редакции</h2>
        {versions.length === 0 ? (
          <div className={block("empty")}>
            <p>Редакции не загружены.</p>
            <code>node scripts/npa-sync.mjs --seed</code>
          </div>
        ) : (
          <ol className={block("timeline")}>
            {versions.map((version) => (
              <li
                key={version.id}
                className={block("version", [
                  version.verified ? "verified" : "draft",
                ])}
              >
                <div className={block("version-main")}>
                  <span className={block("version-date")}>
                    {formatDate(version.validFrom)}
                  </span>
                  <span className={block("version-revision")}>
                    {version.revision}
                  </span>
                  {version.changingAct && (
                    <span className={block("version-act")}>
                      {version.changingAct}
                    </span>
                  )}
                </div>
                <div className={block("version-side")}>
                  <span
                    className={block("chip", [
                      version.contentStatus === "text" ? "ok" : "muted",
                    ])}
                  >
                    {version.contentStatus === "text"
                      ? "текст загружен"
                      : "только реквизиты"}
                  </span>
                  <span
                    className={block("chip", [
                      version.verified ? "ok" : "warn",
                    ])}
                  >
                    {version.verified ? "подтверждена" : "черновая"}
                  </span>
                  <button
                    type="button"
                    className={block("verify")}
                    disabled={isPending}
                    onClick={() => verify(act, version.id, !version.verified)}
                  >
                    {version.verified ? "Снять" : "Подтвердить"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Сравнение редакций</h2>

        {versions.length < 2 ? (
          <p className={block("hint")}>
            Для сравнения нужны минимум две редакции.
          </p>
        ) : (
          <>
            <div className={block("compare")}>
              <label className={block("field")}>
                <span>Было</span>
                <Select
                  className={block("select")}
                  value={fromVersion?.id ?? ""}
                  onChange={(event) => setFromId(event.target.value)}
                >
                  {chronological.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.revision} · {formatDate(version.validFrom)}
                    </option>
                  ))}
                </Select>
              </label>

              <label className={block("field")}>
                <span>Стало</span>
                <Select
                  className={block("select")}
                  value={toVersion?.id ?? ""}
                  onChange={(event) => setToId(event.target.value)}
                >
                  {chronological.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.revision} · {formatDate(version.validFrom)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            {!hasTexts ? (
              <p className={block("hint")}>
                У выбранных редакций загружены только реквизиты — сравнивать
                статьи нечего. Полный текст добавляет синхронизация с
                pravo.gov.ru.
              </p>
            ) : diff.length === 0 ? (
              <p className={block("hint")}>
                В загруженных статьях различий нет.
              </p>
            ) : (
              <ul className={block("diff")}>
                {diff.map((item) => (
                  <li
                    key={`${item.status}-${item.number}`}
                    className={block("diff-item", [item.status])}
                  >
                    <div className={block("diff-head")}>
                      <b>Ст. {item.number}</b>
                      {item.title && <span>{item.title}</span>}
                      <span className={block("chip", [item.status])}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    {item.before && (
                      <p className={block("diff-before")}>{item.before}</p>
                    )}
                    {item.after && (
                      <p className={block("diff-after")}>{item.after}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </section>
  );
}
