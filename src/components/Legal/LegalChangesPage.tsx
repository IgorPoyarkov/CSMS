import { useMemo } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useNpaActs } from "../../services/LegalNpa/legalNpa.api";
import {
  npaCompleteness,
  npaKindLabels,
  npaKindOf,
} from "../../services/LegalNpa/legalNpa.schema";
import styles from "./LegalNpa.module.scss";

/**
 * Контроль состояния реестра НПА: где не хватает редакций до порога и какие
 * версии ещё не подтверждены администратором. Это рабочая очередь для роли
 * `npa_admin`, а не лента новостей.
 */
export default function LegalChangesPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "legal-changes");
  const { data: acts = [], isLoading } = useNpaActs();

  const incomplete = useMemo(
    () =>
      acts
        .map((act) => ({ act, completeness: npaCompleteness(act) }))
        .filter((item) => !item.completeness.complete)
        .sort((a, b) => b.completeness.missing - a.completeness.missing),
    [acts],
  );

  const unverified = useMemo(
    () =>
      acts
        .flatMap((act) =>
          act.versions
            .filter((version) => !version.verified)
            .map((version) => ({ act, version })),
        )
        .sort((a, b) => b.version.validFrom.localeCompare(a.version.validFrom)),
    [acts],
  );

  const totalVersions = acts.reduce(
    (sum, act) => sum + act.versions.length,
    0,
  );

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>Состояние реестра НПА</h1>
          <p className={block("subtitle")}>
            Очередь администратора НПА: акты, где не хватает редакций до порога
            (7 для ФЗ, 3 для остальных), и редакции, ожидающие подтверждения.
            Черновые редакции не используются в проверках и ответах
            консультанта.
          </p>
        </div>
        <div className={block("totals")}>
          <span className={block("total")}>
            <b>{acts.length}</b> актов
          </span>
          <span className={block("total")}>
            <b>{totalVersions}</b> редакций
          </span>
          <span className={block("total", ["warn"])}>
            <b>{unverified.length}</b> ждут подтверждения
          </span>
        </div>
      </header>

      {isLoading && <p className={block("hint")}>Загрузка…</p>}

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Не хватает редакций ({incomplete.length})
        </h2>
        {incomplete.length === 0 ? (
          <p className={block("hint")}>
            У всех актов набор редакций соответствует порогу.
          </p>
        ) : (
          <ul className={block("list")}>
            {incomplete.map(({ act, completeness }) => (
              <li key={act.id} className={block("row")}>
                <div>
                  <Link className={block("row-title")} to={`/legal/${act.id}`}>
                    {act.shortName}
                  </Link>
                  <span className={block("row-meta")}>
                    {npaKindLabels[npaKindOf(act)]} · {completeness.actual} из{" "}
                    {completeness.required}
                  </span>
                </div>
                <span className={block("chip", ["warn"])}>
                  не хватает {completeness.missing}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Ожидают подтверждения ({unverified.length})
        </h2>
        {unverified.length === 0 ? (
          <p className={block("hint")}>Все загруженные редакции подтверждены.</p>
        ) : (
          <ul className={block("list")}>
            {unverified.map(({ act, version }) => (
              <li key={`${act.id}-${version.id}`} className={block("row")}>
                <div>
                  <Link className={block("row-title")} to={`/legal/${act.id}`}>
                    {act.shortName} · {version.revision}
                  </Link>
                  <span className={block("row-meta")}>
                    с {formatDate(version.validFrom)}
                    {version.contentStatus === "metadata"
                      ? " · только реквизиты"
                      : " · текст загружен"}
                  </span>
                </div>
                <Link className={block("link")} to={`/legal/${act.id}`}>
                  Проверить →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={block("hint")}>
        Проверка порога из терминала: <code>node scripts/npa-sync.mjs --check</code>.
        Обновление редакций: <code>node scripts/npa-sync.mjs --source=pravo --url=…</code>.
      </p>
    </section>
  );
}
