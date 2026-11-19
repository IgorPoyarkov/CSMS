import { useMemo, useState } from "react";
import {
  KIND_LABELS,
  useEisSchemaCatalog,
  type EisSchemaType,
} from "../../services/Eis/eisSchemaCatalog";
import styles from "./EisSchemaExplorerPage.module.scss";

const PAGE_SIZE = 100;

/**
 * Обозреватель Альбома ЕИС — «Swagger для XSD».
 *
 * Показывает установленную версию схем, все пространства имён, типы и поля.
 * Это документация по формату обмена, а не редактор: XSD приходят из csms-api,
 * который скачивает и проверяет их. Типы для компиляции лежат в
 * services/Eis/generated/eisSchemas.generated.d.ts.
 */
export default function EisSchemaExplorerPage() {
  const { data: catalog, isPending, isError, error } = useEisSchemaCatalog();

  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("");
  const [kind, setKind] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!catalog) return [];

    const needle = query.trim().toLocaleLowerCase();

    return catalog.types.filter((type) => {
      if (namespace && type.namespace !== namespace) return false;
      if (kind && type.kind !== kind) return false;
      if (!needle) return true;

      if (
        type.name.toLocaleLowerCase().includes(needle) ||
        type.namespace.toLocaleLowerCase().includes(needle) ||
        (type.base ?? "").toLocaleLowerCase().includes(needle) ||
        (type.documentation ?? "").toLocaleLowerCase().includes(needle)
      ) {
        return true;
      }

      return type.fields.some(
        (field) =>
          field.name.toLocaleLowerCase().includes(needle) ||
          field.type.toLocaleLowerCase().includes(needle),
      );
    });
  }, [catalog, query, namespace, kind]);

  const selected = useMemo(
    () => catalog?.types.find((type) => type.name === selectedName) ?? null,
    [catalog, selectedName],
  );

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setLimit(PAGE_SIZE);
  };

  if (isPending) {
    return <div className={styles.state}>Загружаю каталог XSD…</div>;
  }

  if (isError) {
    return (
      <div className={styles.stateError}>
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!catalog) {
    return <div className={styles.state}>Каталог XSD недоступен.</div>;
  }

  return (
    <div className={styles.explorer}>
      <h1 className={styles.title}>Обозреватель XSD Альбома ЕИС</h1>
      <p className={styles.lead}>
        Официальные схемы ЕИС версии {catalog.version}:{" "}
        {catalog.xsdFileCount} XSD, {catalog.types.length} определений,{" "}
        {catalog.namespaces.length} пространств имён. Каталог сгенерирован{" "}
        {new Date(catalog.generatedAt).toLocaleString("ru-RU")} из документа{" "}
        zakupki.gov.ru #{catalog.sourceId}.
      </p>

      <div className={styles.notice}>
        Это описание формата обмена, а не генератор XML. Типы доступны в коде
        как{" "}
        <code>import type {"{ ... }"} from "@/services/Eis/generated/eisSchemas.generated"</code>
        . Схемы обновляются автоматически в csms-api; чтобы пересобрать каталог
        и типы, запустите <code>scripts/generate-schema-docs.ps1</code>.
      </div>

      <div className={styles.stats}>
        <Stat label="Версия" value={catalog.version} />
        <Stat label="XSD-файлов" value={String(catalog.xsdFileCount)} />
        <Stat label="Определений" value={String(catalog.types.length)} />
        <Stat label="Пространств имён" value={String(catalog.namespaces.length)} />
        <Stat label="SHA-256 архива" value={catalog.sha256.slice(0, 16)} />
      </div>

      <div className={styles.filters}>
        <label className={styles.filter}>
          <span>Поиск по имени, полю, описанию</span>
          <input
            type="search"
            value={query}
            placeholder="Например, Contract or ИНН"
            onChange={(event) => changeFilter(setQuery, event.target.value)}
          />
        </label>
        <label className={styles.filter}>
          <span>Пространство имён</span>
          <select
            value={namespace}
            onChange={(event) => changeFilter(setNamespace, event.target.value)}
          >
            <option value="">Все ({catalog.namespaces.length})</option>
            {catalog.namespaces.map((info) => (
              <option key={info.uri} value={info.uri}>
                {info.alias} · {info.typeCount} ({info.uri})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filter}>
          <span>Вид определения</span>
          <select
            value={kind}
            onChange={(event) => changeFilter(setKind, event.target.value)}
          >
            <option value="">Все</option>
            <option value="element">Корневые элементы</option>
            {Object.entries(KIND_LABELS)
              .filter(([value]) => value !== "element")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            Найдено {filtered.length}
            {filtered.length > limit ? `, показаны первые ${limit}` : ""}
          </div>
          <div className={styles.list}>
            {filtered.slice(0, limit).map((type) => (
              <button
                key={type.name}
                type="button"
                className={
                  type.name === selectedName
                    ? `${styles.item} ${styles.itemActive}`
                    : styles.item
                }
                onClick={() => setSelectedName(type.name)}
              >
                <span className={styles.itemKind}>
                  {KIND_LABELS[type.kind] ?? type.kind}
                </span>
                <span className={styles.itemName}>{type.name}</span>
                <span className={styles.itemMeta}>
                  {catalog.namespaces.find((info) => info.uri === type.namespace)
                    ?.alias ?? type.namespace}
                  {type.fields.length > 0 ? ` · ${type.fields.length} полей` : ""}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className={styles.listEmpty}>Ничего не найдено.</div>
            )}
          </div>
          {filtered.length > limit && (
            <button
              type="button"
              className={styles.more}
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
            >
              Показать ещё {Math.min(PAGE_SIZE, filtered.length - limit)}
            </button>
          )}
        </section>

        <section className={styles.detailPanel}>
          {selected ? (
            <TypeDetail type={selected} />
          ) : (
            <div className={styles.detailEmpty}>
              Выберите тип слева, чтобы увидеть поля, обязательность и связи.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} title={value}>
        {value}
      </span>
    </div>
  );
}

function TypeDetail({ type }: { type: EisSchemaType }) {
  return (
    <>
      <div className={styles.detailKind}>{KIND_LABELS[type.kind] ?? type.kind}</div>
      <h2 className={styles.detailTitle}>{type.name}</h2>
      <div className={styles.detailNs}>{type.namespace}</div>

      {type.documentation && (
        <p className={styles.detailDoc}>{type.documentation}</p>
      )}

      {type.base && (
        <div className={styles.detailBase}>
          {type.kind === "enum" || type.kind === "element" ? "Основа: " : "Базовый тип: "}
          <code>{type.base}</code>
        </div>
      )}

      {type.enumValues.length > 0 && (
        <div className={styles.enumBlock}>
          <div className={styles.sectionTitle}>
            Допустимые значения ({type.enumValues.length})
          </div>
          <div className={styles.enumValues}>
            {type.enumValues.map((value) => (
              <code key={value}>{value}</code>
            ))}
          </div>
        </div>
      )}

      {type.fields.length > 0 && (
        <div className={styles.fieldsBlock}>
          <div className={styles.sectionTitle}>
            Поля и атрибуты ({type.fields.length})
          </div>
          <table className={styles.fields}>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Тип</th>
                <th>Обязательность</th>
              </tr>
            </thead>
            <tbody>
              {type.fields.map((field) => (
                <tr key={field.name}>
                  <td>
                    <code>{field.name}</code>
                    {field.documentation && (
                      <div className={styles.fieldDoc}>{field.documentation}</div>
                    )}
                  </td>
                  <td className={styles.fieldType}>
                    {field.type}
                    {field.array ? "[]" : ""}
                  </td>
                  <td>{field.optional ? "необязательно" : "обязательно"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
