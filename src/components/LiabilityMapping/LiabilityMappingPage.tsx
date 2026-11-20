import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  useLiabilityOverview,
  useLiabilityResult,
  useMapLiabilityDuty,
} from "../../services/LiabilityMapping/liabilityMapping.api";
import type { LiabilityMappingOverviewItem } from "../../services/LiabilityMapping/liabilityMapping.schema";
import styles from "./LiabilityMappingPage.module.scss";

const degreeLabels: Record<string, string> = {
  full: "полное",
  partial: "частичное",
  blanket: "общая/бланкетная",
  irrelevant: "нерелевантно",
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString("ru-RU")} ${date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatScore = (value: number): string =>
  `${Math.round(value * 100)}%`;

const LiabilityMappingPage = () => {
  const { bem } = useUtils();
  const page = bem(styles, "liability-mapping");
  const overviewQuery = useLiabilityOverview();
  const [activeDutyId, setActiveDutyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const resultQuery = useLiabilityResult(activeDutyId);
  const mapMutation = useMapLiabilityDuty();

  const items = overviewQuery.data ?? [];
  const sections = useMemo(
    () => [...new Set(items.map((item) => item.sectionTitle))].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("ru-RU");
    return items.filter((item) => {
      if (section && item.sectionTitle !== section) return false;
      if (!needle) return true;
      return `${item.clause} ${item.statement} ${item.sectionTitle}`
        .toLocaleLowerCase("ru-RU")
        .includes(needle);
    });
  }, [items, search, section]);

  const totals = useMemo(
    () => ({
      duties: items.length,
      mapped: items.filter((item) => item.hasResult).length,
      norms: items.reduce((sum, item) => sum + item.matchedCount, 0),
      review: items.reduce((sum, item) => sum + item.reviewCount, 0),
    }),
    [items],
  );

  const active = items.find((item) => item.dutyId === activeDutyId) ?? null;
  const result = resultQuery.data;

  const runMapping = (item: LiabilityMappingOverviewItem) => {
    setActiveDutyId(item.dutyId);
    void overviewQuery.refetch();
    // Форма Сущности А приходит из того же API: чтобы не дублировать 41 пункт
    // на клиенте, берём обязанность из справочника и сразу отправляем в конвейер.
    void fetch(`/api/liability-mapping/duties`)
      .then((response) => response.json())
      .then((rows: Array<{ duty: unknown; dutyId?: string }>) => {
        const row = rows.find(
          (entry) => (entry.duty as { identifiers?: { dutyId?: string } })
            ?.identifiers?.dutyId === item.dutyId,
        );
        if (!row) throw new Error("Обязанность не найдена в справочнике");
        return mapMutation.mutateAsync(row.duty);
      })
      .catch(() => undefined);
  };

  return (
    <div className={page()}>
      <div className={page("head")}>
        <div>
          <h1 className={page("title")}>
            Ответственность по обязанностям контрактной службы
          </h1>
          <p className={page("subtitle")}>
            41 пункт Приказа Минфина № 158н → гипотезы нарушений → КоАП РФ
            (КонсультантПлюс, ред. от 04.08.2026) → LLM-арбитр с ручной проверкой
            спорных совпадений.
          </p>
        </div>
        <button
          type="button"
          className={page("refresh")}
          onClick={() => void overviewQuery.refetch()}
          disabled={overviewQuery.isFetching}
        >
          {overviewQuery.isFetching ? "Обновление…" : "Обновить"}
        </button>
      </div>

      <div className={page("stats")}>
        <div className={page("stat")}>
          <span className={page("stat-value")}>{totals.duties}</span>
          <span className={page("stat-label")}>пунктов 158н</span>
        </div>
        <div className={page("stat")}>
          <span className={page("stat-value")}>{totals.mapped}</span>
          <span className={page("stat-label")}>сопоставлено</span>
        </div>
        <div className={page("stat")}>
          <span className={page("stat-value")}>{totals.norms}</span>
          <span className={page("stat-label")}>норм КоАП</span>
        </div>
        <div className={page("stat", ["warning"])}>
          <span className={page("stat-value")}>{totals.review}</span>
          <span className={page("stat-label")}>на проверке</span>
        </div>
      </div>

      {overviewQuery.isError && (
        <div className={page("error")}>
          Не удалось получить данные API:{" "}
          {overviewQuery.error instanceof Error
            ? overviewQuery.error.message
            : "неизвестная ошибка"}
        </div>
      )}

      <div className={page("layout")}>
        <section className={page("list")}>
          <div className={page("filters")}>
            <input
              className={page("search")}
              placeholder="Поиск по пункту или формулировке"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className={page("select")}
              value={section}
              onChange={(event) => setSection(event.target.value)}
            >
              <option value="">Все разделы</option>
              {sections.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          <ul className={page("items")}>
            {filtered.map((item) => (
              <li key={item.dutyId}>
                <button
                  type="button"
                  className={page("item", [
                    item.dutyId === activeDutyId ? "active" : "",
                  ])}
                  onClick={() => setActiveDutyId(item.dutyId)}
                >
                  <span className={page("item-top")}>
                    <span className={page("clause")}>{item.clause}</span>
                    <span
                      className={page("badge", [
                        item.hasResult ? "done" : "pending",
                      ])}
                    >
                      {item.hasResult
                        ? `${item.matchedCount} норм`
                        : "не сопоставлено"}
                    </span>
                  </span>
                  <span className={page("item-text")}>{item.statement}</span>
                  {item.topNormReference && (
                    <span className={page("item-norm")}>
                      {item.topNormReference} · {formatScore(item.topProbabilityScore ?? 0)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={page("detail")}>
          {!active && (
            <div className={page("placeholder")}>
              Выберите пункт 158н слева, чтобы увидеть гипотезы нарушений и
              подобранные нормы КоАП.
            </div>
          )}

          {active && resultQuery.isLoading && (
            <div className={page("placeholder")}>Загрузка результата…</div>
          )}

          {active && !resultQuery.isLoading && !result && (
            <div className={page("placeholder")}>
              <h2>{active.clause}</h2>
              <p>{active.statement}</p>
              <button
                type="button"
                className={page("run")}
                onClick={() => runMapping(active)}
                disabled={mapMutation.isPending}
              >
                {mapMutation.isPending
                  ? "Сопоставление… (локальная LLM)"
                  : "Сопоставить с КоАП"}
              </button>
            </div>
          )}

          {active && result && (
            <>
              <div className={page("detail-head")}>
                <div>
                  <h2 className={page("detail-title")}>
                    {active.clause} · {active.sectionTitle}
                  </h2>
                  <p className={page("detail-statement")}>{active.statement}</p>
                </div>
                <button
                  type="button"
                  className={page("run")}
                  onClick={() => runMapping(active)}
                  disabled={mapMutation.isPending}
                >
                  {mapMutation.isPending ? "Пересчёт…" : "Пересчитать"}
                </button>
              </div>

              <div className={page("meta")}>
                <span>Кандидатов: {result.candidate_count}</span>
                <span>Модель: {result.model_version}</span>
                <span>Промпт: {result.prompt_version}</span>
                <span>Расчёт: {formatDateTime(result.calculated_at)}</span>
                <span>run_id: {result.run_id.slice(0, 8)}</span>
              </div>

              <h3 className={page("section-title")}>Гипотезы нарушений</h3>
              <ol className={page("hypotheses")}>
                {result.violation_hypotheses.map((hypothesis) => (
                  <li key={hypothesis.id}>
                    <span className={page("kind")}>{hypothesis.kind}</span>{" "}
                    {hypothesis.text}
                  </li>
                ))}
              </ol>

              <h3 className={page("section-title")}>
                Нормы ответственности ({result.matched_liabilities.length})
              </h3>
              {result.matched_liabilities.length === 0 && (
                <div className={page("empty")}>
                  Арбитр не нашёл релевантных норм в пуле кандидатов.
                </div>
              )}
              <div className={page("norms")}>
                {result.matched_liabilities.map((norm) => (
                  <article
                    key={norm.liability_node_id}
                    className={page("norm", [
                      norm.requires_human_review ? "review" : "",
                    ])}
                  >
                    <div className={page("norm-head")}>
                      <strong>{norm.norm_reference}</strong>
                      <span
                        className={page("degree", [
                          norm.match_degree,
                        ])}
                      >
                        {degreeLabels[norm.match_degree] ?? norm.match_degree}
                      </span>
                      <span className={page("score")}>
                        {formatScore(norm.probability_score)}
                      </span>
                    </div>
                    <div className={page("bar")}>
                      <span
                        className={page("bar-fill")}
                        style={{ width: `${norm.probability_score * 100}%` }}
                      />
                    </div>
                    <p className={page("sanction")}>{norm.sanction_summary}</p>
                    <p className={page("reasoning")}>{norm.legal_reasoning}</p>
                    {norm.qualifying_conditions.length > 0 && (
                      <ul className={page("conditions")}>
                        {norm.qualifying_conditions.map((condition, index) => (
                          <li key={`${norm.liability_node_id}-${index}`}>
                            {condition}
                          </li>
                        ))}
                      </ul>
                    )}
                    {norm.requires_human_review && (
                      <div className={page("review-note")}>
                        Требуется проверка юристом
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default LiabilityMappingPage;
