import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import { uiSolutionGroups, uiSolutionTotal } from "./uiSolutions.config";
import styles from "./UiSolutions.module.scss";

/**
 * Каталог UI-решений проекта.
 *
 * Страница отвечает на три вопроса по каждому решению: зачем оно нужно,
 * где применяется и где лежит реализация. Поиск идёт по всем четырём полям,
 * группы можно отфильтровать чипами — так новый экран собирается из уже
 * принятых решений, а не из новых случайных классов.
 */

export default function UiSolutionsPage() {
  const { bem } = useUtils();
  const block = bem(styles, "ui-solutions");

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");

  const normalizedQuery = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    const groups =
      activeGroup === "all"
        ? uiSolutionGroups
        : uiSolutionGroups.filter((group) => group.id === activeGroup);

    if (!normalizedQuery) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          [item.title, item.purpose, item.usage, item.implementation]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeGroup, normalizedQuery]);

  const visibleCount = visibleGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <main className={block()}>
      <header className={block("header")}>
        <h1 className={block("title")}>UI-решения проекта</h1>
        <p className={block("subtitle")}>
          Полный структурированный перечень интерфейсных решений CSMS: что
          применено, зачем и где. Всего {uiSolutionTotal} решений в{" "}
          {uiSolutionGroups.length} группах. Поиск идёт по названию, назначению,
          месту применения и пути реализации.
        </p>
        <p className={block("count")}>
          Показано: {visibleCount} из {uiSolutionTotal}
        </p>
      </header>

      <div className={block("toolbar")}>
        <label className={block("search")}>
          <span className="visually-hidden">Поиск по UI-решениям</span>
          <input
            type="search"
            value={query}
            placeholder="Найти решение: модалка, валидация, тема, таблица…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className={block("chips")} role="group" aria-label="Группы решений">
          <button
            type="button"
            className={block("chip", activeGroup === "all" ? ["active"] : [])}
            aria-pressed={activeGroup === "all"}
            onClick={() => setActiveGroup("all")}
          >
            Все
            <span className={block("chip-count")}>{uiSolutionTotal}</span>
          </button>

          {uiSolutionGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={block("chip", activeGroup === group.id ? ["active"] : [])}
              aria-pressed={activeGroup === group.id}
              onClick={() => setActiveGroup(group.id)}
            >
              {group.title}
              <span className={block("chip-count")}>{group.items.length}</span>
            </button>
          ))}
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className={block("empty")}>
          Ничего не найдено. Попробуйте другой запрос или сбросьте фильтр группы.
        </p>
      ) : (
        visibleGroups.map((group) => (
          <section className={block("group")} key={group.id}>
            <div className={block("group-head")}>
              <h2 className={block("group-title")}>{group.title}</h2>
              <span className={block("group-count")}>
                {group.items.length} решений
              </span>
            </div>
            <p className={block("group-description")}>{group.description}</p>

            <ul className={block("grid")}>
              {group.items.map((item) => (
                <li className={block("card")} key={item.id}>
                  <h3 className={block("card-title")}>{item.title}</h3>

                  <p className={block("label")}>Назначение</p>
                  <p className={block("text")}>{item.purpose}</p>

                  <p className={block("label")}>Где применяется</p>
                  <p className={block("text")}>{item.usage}</p>

                  <p className={block("label")}>Реализация</p>
                  <code className={block("code")}>{item.implementation}</code>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
