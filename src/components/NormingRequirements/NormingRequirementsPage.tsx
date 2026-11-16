import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { formatMoney } from "../PurchasePlan/purchasePlan.config";
import {
  searchOkpd2,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import styles from "./NormingRequirementsPage.module.scss";

const REQUIREMENT_TYPES: { id: string; label: string }[] = [
  { id: "consumer", label: "Потребительские свойства" },
  { id: "quality", label: "Качественные свойства" },
  { id: "functional", label: "Функциональные свойства" },
  { id: "other", label: "Иные требования" },
];

interface NormingRequirement {
  id: string;
  requirementType: string;
  requirementText: string;
}

export default function NormingRequirementsPage() {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");

  const { data: dictionary = [], isLoading } = useOkpd2Dictionary();
  const [query, setQuery] = useState("");
  const [requirementsByCode, setRequirementsByCode] = useState<
    Record<string, NormingRequirement[]>
  >({});

  const STORAGE_KEY = "csms_norming_requirements";

  const loadRequirements = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setRequirementsByCode(JSON.parse(raw));
      }
    } catch {
      // игнорируем ошибки чтения
    }
  };

  const saveRequirements = (next: Record<string, NormingRequirement[]>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // игнорируем ошибки записи
    }
    setRequirementsByCode(next);
  };

  useMemo(() => {
    loadRequirements();
  }, []);

  const normedCodes = useMemo(() => {
    const matched = searchOkpd2(dictionary, query, Number.MAX_SAFE_INTEGER);
    return matched.filter((item) => item.isNormed);
  }, [dictionary, query]);

  const getRequirements = (code: string): NormingRequirement[] =>
    requirementsByCode[code] ?? [];

  const addRequirement = (code: string) => {
    const next: NormingRequirement[] = [
      ...getRequirements(code),
      { id: String(Date.now()), requirementType: "consumer", requirementText: "" },
    ];
    saveRequirements({ ...requirementsByCode, [code]: next });
  };

  const updateRequirement = (
    code: string,
    index: number,
    field: keyof NormingRequirement,
    value: string,
  ) => {
    const list = [...(requirementsByCode[code] ?? [])];
    list[index] = { ...list[index], [field]: value };
    saveRequirements({ ...requirementsByCode, [code]: list });
  };

  const removeRequirement = (code: string, index: number) => {
    const list = [...(requirementsByCode[code] ?? [])];
    list.splice(index, 1);
    saveRequirements({ ...requirementsByCode, [code]: list });
  };

  if (isLoading) {
    return (
      <section className={block("section")}>
        <h1 className={block("title")}>Типовые требования (ПП РФ N 926)</h1>
        <p className={block("muted")}>Загрузка справочника ОКПД2…</p>
      </section>
    );
  }

  return (
    <section className={block("section")}>
      <header className={block("header")}>
        <h1 className={block("title")}>Типовые требования (ПП РФ N 926)</h1>
        <p className={block("summary")}>
          Управление типовыми требованиями для кодов ОКПД2, подлежащих
          обязательному нормированию. Требования используются как шаблон при
          заполнении позиций объекта закупки в извещениях.
        </p>
      </header>

      <div className={block("toolbar")}>
        <input
          className={block("search")}
          type="search"
          placeholder="Поиск по коду или наименованию ОКПД2…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className={block("count")}>
          Нормируемых кодов: {normedCodes.length}
        </span>
      </div>

      <div className={block("list")}>
        {normedCodes.length === 0 ? (
          <p className={block("empty")}>
            Нормируемых кодов не найдено. Проверьте справочник ОКПД2
            (<Link to="/okpd2">открыть справочник</Link>).
          </p>
        ) : (
          normedCodes.map((item) => (
            <div key={item.code} className={block("item")}>
              <div className={block("item-head")}>
                <span className={block("item-code")}>{item.code}</span>
                <span className={block("item-name")}>{item.name}</span>
                {item.normLimit !== null && item.normLimit !== undefined && (
                  <span className={block("item-limit")}>
                    Предельная цена: {formatMoney(item.normLimit)}
                  </span>
                )}
              </div>

              <div className={block("item-body")}>
                <div className={block("req-list")}>
                  {getRequirements(item.code).map((req, i) => (
                    <div key={req.id} className={block("req-row")}>
                      <select
                        className={block("req-select")}
                        value={req.requirementType}
                        onChange={(e) =>
                          updateRequirement(item.code, i, "requirementType", e.target.value)
                        }
                      >
                        {REQUIREMENT_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className={block("req-input")}
                        type="text"
                        placeholder="Текст требования"
                        value={req.requirementText}
                        onChange={(e) =>
                          updateRequirement(item.code, i, "requirementText", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className={block("req-remove")}
                        onClick={() => removeRequirement(item.code, i)}
                        title="Удалить требование"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={block("add-btn")}
                  onClick={() => addRequirement(item.code)}
                >
                  + Добавить требование
                </button>
                {getRequirements(item.code).length > 0 && (
                  <p className={block("hint")}>
                    Требования сохранятся и будут подставляться в позицию
                    объекта закупки при выборе кода {item.code}.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <footer className={block("footer")}>
        <Link className={block("back-link")} to="/">
          ← Назад на главную
        </Link>
      </footer>
    </section>
  );
}
