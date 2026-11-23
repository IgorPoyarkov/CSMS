import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Проверка машиночитаемой модели приказа Минстроя России от 23.12.2019 № 841/пр.
 * Запуск: npm run check:841 (или node scripts/check-order-841.mjs).
 *
 * Скрипт не заменяет полноценный JSON Schema-валидатор: он проверяет
 * структурные инварианты, целостность ссылок и синхронность данных со схемой.
 */

const dataUrl = new URL(
  "../docs/legal/841-pr/order-841-pr.json",
  import.meta.url,
);
const schemaUrl = new URL(
  "../docs/legal/841-pr/order-841-pr.schema.json",
  import.meta.url,
);

const data = JSON.parse(readFileSync(dataUrl, "utf8"));
const schema = JSON.parse(readFileSync(schemaUrl, "utf8"));

const problems = [];
const fail = (message) => problems.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};

const uniqueBy = (items, key, label) => {
  const seen = new Set();
  for (const item of items) {
    const value = item[key];
    check(Boolean(value), `${label}: отсутствует поле ${key}`);
    check(!seen.has(value), `${label}: повторяется ${key} = ${value}`);
    seen.add(value);
  }
  return seen;
};

const defs = schema.$defs;
const requiredOf = (name) => new Set(defs[name].required);
const allowedOf = (name) => new Set(Object.keys(defs[name].properties));

/**
 * Проверяет набор обязательных и необязательных ключей объекта
 * по описанию в $defs JSON-схемы.
 */
const checkShape = (value, defName, path) => {
  const required = requiredOf(defName);
  const allowed = allowedOf(defName);

  for (const key of required) {
    check(
      Object.prototype.hasOwnProperty.call(value, key),
      `${path}: нет обязательного поля «${key}»`,
    );
  }
  for (const key of Object.keys(value)) {
    check(
      allowed.has(key),
      `${path}: поле «${key}» отсутствует в схеме ${defName}`,
    );
  }
};

// 1. Базовые поля и версия схемы
check(
  data.$schema === "./order-841-pr.schema.json",
  `$schema должен ссылаться на order-841-pr.schema.json, получено: ${data.$schema}`,
);
check(
  /^\d+\.\d+\.\d+$/.test(data.schemaVersion),
  "schemaVersion должен быть semver",
);
check(data.source?.number === "841/пр", "source.number должен быть «841/пр»");
check(data.source?.date === "2019-12-23", "source.date должен быть 2019-12-23");
check(
  data.source?.registration?.number === "57401",
  "registration.number должен быть 57401",
);

// 2. Уникальность идентификаторов
const documentIds = uniqueBy(data.documents, "id", "documents");
const clauseIds = uniqueBy(data.clauses, "id", "clauses");
const appendixIds = uniqueBy(data.appendices, "id", "appendices");
const formulaIds = uniqueBy(data.formulas, "id", "formulas");
const relationIds = uniqueBy(data.relations, "id", "relations");
uniqueBy(data.definitions ?? [], "id", "definitions");
uniqueBy(data.consistencyNotes ?? [], "id", "consistencyNotes");
uniqueBy(data.externalReferences ?? [], "id", "externalReferences");

// 3. Соответствие объектов описанию в схеме
for (const document of data.documents) {
  checkShape(document, "document", `document:${document.id}`);
}
for (const clause of data.clauses) {
  checkShape(clause, "clause", `clause:${clause.id}`);
}
for (const appendix of data.appendices) {
  checkShape(appendix, "appendix", `appendix:${appendix.id}`);
  for (const field of appendix.headerFields) {
    checkShape(field, "field", `${appendix.id}.headerFields:${field.id}`);
  }
  for (const field of appendix.footerFields ?? []) {
    checkShape(field, "field", `${appendix.id}.footerFields:${field.id}`);
  }
  for (const table of appendix.tables) {
    checkShape(table, "table", `${appendix.id}.tables:${table.id}`);
    for (const column of table.columns) {
      checkShape(column, "column", `${table.id}.columns:${column.no}`);
    }
    for (const row of [...table.rows, ...table.totalRows]) {
      checkShape(row, "tableRow", `${table.id}.rows:${row.id}`);
    }
    for (const invariant of table.invariants) {
      checkShape(
        invariant,
        "invariant",
        `${table.id}.invariants:${invariant.id}`,
      );
    }
  }
  for (const rule of appendix.fillRules) {
    checkShape(rule, "fillRule", `${appendix.id}.fillRules:${rule.id}`);
  }
}
for (const formula of data.formulas) {
  checkShape(formula, "formula", `formula:${formula.id}`);
}
for (const relation of data.relations) {
  checkShape(relation, "relation", `relation:${relation.id}`);
}

// 4. Ссылочная целостность
for (const clause of data.clauses) {
  check(
    documentIds.has(clause.document),
    `clause:${clause.id}: неизвестный документ ${clause.document}`,
  );
  for (const ref of clause.appendixRefs) {
    check(
      appendixIds.has(ref) || documentIds.has(ref),
      `clause:${clause.id}: неизвестная ссылка на приложение ${ref}`,
    );
  }
  for (const ref of clause.formulaRefs ?? []) {
    check(
      formulaIds.has(ref),
      `clause:${clause.id}: неизвестная формула ${ref}`,
    );
  }
}

for (const appendix of data.appendices) {
  check(
    documentIds.has(appendix.document),
    `appendix:${appendix.id}: неизвестный документ ${appendix.document}`,
  );
  check(
    appendix.id.startsWith(`${appendix.document}-app-`),
    `appendix:${appendix.id}: id не соответствует документу ${appendix.document}`,
  );
  check(
    appendix.legalBasis.length > 0,
    `appendix:${appendix.id}: пустой legalBasis`,
  );
  for (const ref of appendix.legalBasis) {
    check(
      clauseIds.has(ref),
      `appendix:${appendix.id}: неизвестный пункт ${ref}`,
    );
  }
  for (const ref of appendix.relatedAppendices) {
    check(
      appendixIds.has(ref),
      `appendix:${appendix.id}: неизвестное приложение ${ref}`,
    );
  }
  for (const ref of appendix.formulaRefs) {
    check(
      formulaIds.has(ref),
      `appendix:${appendix.id}: неизвестная формула ${ref}`,
    );
  }
  for (const rule of appendix.fillRules) {
    check(
      clauseIds.has(rule.clause),
      `appendix:${appendix.id}: правило ${rule.id} ссылается на неизвестный пункт ${rule.clause}`,
    );
  }

  // Графы таблиц нумеруются подряд с 1, id уникальны внутри таблицы.
  for (const table of appendix.tables) {
    const numbers = table.columns.map((column) => column.no);
    numbers.forEach((number, index) => {
      check(
        number === index + 1,
        `${table.id}: нарушена нумерация граф (${numbers.join(", ")})`,
      );
    });
    const columnIds = new Set(table.columns.map((column) => column.id));
    check(
      columnIds.size === table.columns.length,
      `${table.id}: повторяются id граф`,
    );
    for (const row of [...table.rows, ...table.totalRows]) {
      for (const columnNo of row.valueColumns ?? []) {
        check(
          numbers.includes(columnNo),
          `${table.id}: строка ${row.id} ссылается на отсутствующую графу ${columnNo}`,
        );
      }
    }
    check(
      table.id.startsWith(`${appendix.id}-`),
      `${table.id}: id таблицы не начинается с ${appendix.id}-`,
    );
  }

  // Строки итогов должны ссылаться на существующие totalRows.
  for (const total of appendix.totals) {
    const totalIds = new Set(
      appendix.tables.flatMap((table) => table.totalRows.map((row) => row.id)),
    );
    check(
      totalIds.has(total),
      `appendix:${appendix.id}: неизвестная итоговая строка ${total}`,
    );
  }
}

for (const formula of data.formulas) {
  check(
    clauseIds.has(formula.clause),
    `formula:${formula.id}: неизвестный пункт ${formula.clause}`,
  );
  for (const ref of formula.appliesTo) {
    check(
      appendixIds.has(ref),
      `formula:${formula.id}: неизвестное приложение ${ref}`,
    );
  }
}

// 5. Связи: from/to должны разрешаться в известный узел
const nodeIds = new Set([
  ...documentIds,
  ...clauseIds,
  ...appendixIds,
  ...formulaIds,
]);
for (const relation of data.relations) {
  check(
    nodeIds.has(relation.from),
    `relation:${relation.id}: неизвестный from ${relation.from}`,
  );
  check(
    nodeIds.has(relation.to),
    `relation:${relation.id}: неизвестный to ${relation.to}`,
  );
  check(
    relation.from !== relation.to,
    `relation:${relation.id}: связь узла с самим собой`,
  );
}

// 6. Согласованность сводки с фактическими данными
const actualByDocument = data.appendices.reduce((acc, appendix) => {
  acc[appendix.document] = (acc[appendix.document] ?? 0) + 1;
  return acc;
}, {});
const actualByKind = data.appendices.reduce((acc, appendix) => {
  acc[appendix.kind] = (acc[appendix.kind] ?? 0) + 1;
  return acc;
}, {});
const withTables = data.appendices.filter(
  (appendix) => appendix.tables.length > 0,
).length;
const published = data.appendices
  .filter((appendix) => appendix.placement.publishInEis)
  .map((appendix) => appendix.id)
  .sort();

check(
  data.summary.appendixCount === data.appendices.length,
  "summary.appendixCount не совпадает",
);
check(
  JSON.stringify(data.summary.byDocument) === JSON.stringify(actualByDocument),
  `summary.byDocument не совпадает: ${JSON.stringify(actualByDocument)}`,
);
check(
  JSON.stringify(data.summary.byKind) === JSON.stringify(actualByKind),
  `summary.byKind не совпадает: ${JSON.stringify(actualByKind)}`,
);
check(
  data.summary.formsWithTables === withTables,
  "summary.formsWithTables не совпадает",
);
check(
  data.summary.formsWithoutTables === data.appendices.length - withTables,
  "summary.formsWithoutTables не совпадает",
);
check(
  JSON.stringify(data.summary.publishedInEis.slice().sort()) ===
    JSON.stringify(published),
  "summary.publishedInEis не совпадает с placement.publishInEis",
);

// 7. Ожидаемый состав приложений (6 к Порядку + 3 к Методике)
check(data.summary.appendixCount === 9, "ожидается 9 приложений (6 + 3)");
check(
  data.appendices.filter((appendix) => appendix.document === "poryadok")
    .length === 6,
  "к Порядку должно быть 6 приложений",
);
check(
  data.appendices.filter((appendix) => appendix.document === "metodika")
    .length === 3,
  "к Методике должно быть 3 приложения",
);

// 8. Каждая форма, кроме протокола, должна содержать таблицу
for (const appendix of data.appendices) {
  if (appendix.kind !== "protocol") {
    check(appendix.tables.length > 0, `appendix:${appendix.id}: нет таблицы`);
  }
}

// 9. Итог
if (problems.length > 0) {
  console.error(`Проверка 841/пр не пройдена, проблем: ${problems.length}`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

assert.equal(data.appendices.length, 9);
console.log(
  `Проверка 841/пр пройдена: приложений — ${data.appendices.length}, ` +
    `связей — ${data.relations.length}, формул — ${data.formulas.length}, ` +
    `пунктов — ${data.clauses.length}.`,
);
