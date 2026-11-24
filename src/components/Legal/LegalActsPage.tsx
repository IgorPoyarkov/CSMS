import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useNpaActs } from "../../services/LegalNpa/legalNpa.api";
import {
  NPA_ACT_KINDS,
  npaCompleteness,
  npaKindLabels,
  npaKindOf,
  sortVersions,
  versionOnDate,
  type NpaActKind,
} from "../../services/LegalNpa/legalNpa.schema";
import Select from "../UI/Select";
import styles from "./LegalNpa.module.scss";

/**
 * Реестр НПА с редакциями. Показывает, сколько редакций загружено на горизонте
 * релевантности и хватает ли их до ориентира (3 редакции для любого вида
 * акта). У 44-ФЗ горизонт — 01.01.2022: до этой даты закон действовал в другом
 * каркасе, а контрактов тех лет в системе нет, поэтому архивные редакции не
 * загружаются и в полноте не учитываются. Порог — ориентир: подтверждённый
 * источником набор считается полным и при меньшем числе редакций.
 */
export default function LegalActsPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "legal-acts");
  const { data: acts = [], isLoading, isError, error } = useNpaActs();

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<NpaActKind | "all">("all");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return acts
      .filter((act) => {
        if (kind !== "all" && npaKindOf(act) !== kind) return false;
        if (onlyIncomplete && npaCompleteness(act).complete) return false;
        if (!normalized) return true;

        return [act.shortName, act.fullName, act.actNumber]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => a.shortName.localeCompare(b.shortName, "ru"));
  }, [acts, query, kind, onlyIncomplete]);

  const totals = useMemo(() => {
    const complete = acts.filter((act) => npaCompleteness(act).complete).length;
    return { all: acts.length, complete, incomplete: acts.length - complete };
  }, [acts]);

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>НПА и редакции</h1>
          <p className={block("subtitle")}>
            Реестр актов с версиями. Ориентир полноты — 3 редакции для любого
            вида акта. У 44-ФЗ учитываются только редакции с 01.01.2022: до
            этой даты закон действовал в другом каркасе, а контрактов тех лет в
            системе нет — архивные редакции не загружаются. Если в источнике
            редакций меньше, это не ошибка: набор достаточно отметить
            подтверждённым. Неподтверждённая редакция в проверках и ответах
            консультанта не используется.
          </p>
        </div>
        <div className={block("totals")}>
          <span className={block("total")}>
            <b>{totals.all}</b> актов
          </span>
          <span className={block("total", ["ok"])}>
            <b>{totals.complete}</b> полный набор
          </span>
          <span className={block("total", ["warn"])}>
            <b>{totals.incomplete}</b> без подтверждения
          </span>
        </div>
      </header>

      <div className={block("filters")}>
        <input
          className={block("search")}
          type="search"
          value={query}
          placeholder="Название, номер или аббревиатура"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Поиск по НПА"
        />

        <Select
          className={block("select")}
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as NpaActKind | "all")
          }
          aria-label="Вид акта"
        >
          <option value="all">Все виды</option>
          {NPA_ACT_KINDS.map((item) => (
            <option key={item} value={item}>
              {npaKindLabels[item]}
            </option>
          ))}
        </Select>

        <label className={block("toggle")}>
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(event) => setOnlyIncomplete(event.target.checked)}
          />
          Только неполные
        </label>
      </div>

      {isLoading && <p className={block("hint")}>Загрузка реестра…</p>}

      {isError && (
        <p className={block("error")}>
          Не удалось загрузить реестр: {String((error as Error)?.message ?? "")}
          . Проверьте, что PG-адаптер запущен на порту 3002.
        </p>
      )}

      {!isLoading && !isError && acts.length === 0 && (
        <div className={block("empty")}>
          <p>Реестр пуст. Заполните каркас демонстрационными редакциями:</p>
          <code>node scripts/npa-sync.mjs --seed</code>
          <p>
            Затем проверьте порог:{" "}
            <code>node scripts/npa-sync.mjs --check</code>
          </p>
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <div className={block("list")}>
          {visible.map((act) => {
            const completeness = npaCompleteness(act);
            const current = versionOnDate(sortVersions(act.versions));
            const percent = Math.min(
              100,
              Math.round((completeness.actual / completeness.required) * 100),
            );
            // Порог — ориентир. Если источник подтвердил, что редакций всего
            // меньше, набор полный: это не ошибка и не «недобор».
            const badgeText = completeness.sourceComplete
              ? `${completeness.actual} ред. · источник подтвердил`
              : completeness.complete
                ? `${completeness.actual} / ${completeness.required} · полный набор`
                : `${completeness.actual} из ${completeness.required} · не подтверждено`;

            return (
              <article key={act.id} className={block("card")}>
                <div className={block("card-top")}>
                  <div>
                    <h2 className={block("card-title")}>{act.shortName}</h2>
                    <p className={block("card-kind")}>
                      {npaKindLabels[npaKindOf(act)]}
                      {act.actNumber ? ` · № ${act.actNumber}` : ""}
                      {act.adoptedDate
                        ? ` · ${formatDate(act.adoptedDate)}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={block("badge", [
                      completeness.complete ? "ok" : "warn",
                    ])}
                  >
                    {badgeText}
                  </span>
                </div>

                <div className={block("bar")} aria-hidden="true">
                  <span
                    className={block("bar-fill", [
                      completeness.complete ? "ok" : "warn",
                    ])}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className={block("card-current")}>
                  Действующая редакция:{" "}
                  <b>{current?.revision ?? "не загружена"}</b>
                  {current ? ` · с ${formatDate(current.validFrom)}` : ""}
                </p>

                {completeness.relevantFrom && (
                  <p className={block("card-horizon")}>
                    Горизонт: редакции с{" "}
                    {formatDate(completeness.relevantFrom)}
                    {completeness.archived > 0
                      ? ` · архивных в реестре: ${completeness.archived}`
                      : " · архивные не загружаются"}
                  </p>
                )}

                <div className={block("card-actions")}>
                  <Link className={block("link")} to={`/legal/${act.id}`}>
                    Открыть версии →
                  </Link>
                  {act.sourceUrl && (
                    <a
                      className={block("source")}
                      href={act.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Первоисточник
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && acts.length > 0 && visible.length === 0 && (
        <p className={block("hint")}>По выбранным фильтрам актов не найдено.</p>
      )}
    </section>
  );
}
