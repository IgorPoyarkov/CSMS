/**
 * Курсоры инкрементального импорта открытых данных ЕИС.
 *
 * Большой проход по ИНН делается один раз. Дальше раз в день поиск отдаёт только
 * свежие номера, и парсер получает те из них, что старше сохранённого курсора.
 * У каждого набора данных (планы, извещения, контракты) свой курсор и время
 * последней проверки. Состояние лежит вне репозитория — в %TEMP%, чтобы не
 * делать рабочую директорию источником истины и не коммитить операционные данные.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_STATE_FILE = path.join(
  os.tmpdir(),
  "csms-eis-import-state.json",
);

const emptyState = () => ({
  version: 1,
  datasets: {},
});

/** Нормализуем прочитанный JSON: битый/старый state не должен ронять импорт. */
function normalize(value) {
  const state = emptyState();
  if (!value || typeof value !== "object") return state;
  const datasets = value.datasets && typeof value.datasets === "object"
    ? value.datasets
    : {};
  for (const [name, item] of Object.entries(datasets)) {
    if (!item || typeof item !== "object") continue;
    state.datasets[name] = {
      cursor: typeof item.cursor === "string" ? item.cursor : "",
      processedCount: Number(item.processedCount) || 0,
      lastCheckedAt: typeof item.lastCheckedAt === "string" ? item.lastCheckedAt : null,
      lastImportedAt: typeof item.lastImportedAt === "string" ? item.lastImportedAt : null,
    };
  }
  return state;
}

export function loadImportState(filePath = DEFAULT_STATE_FILE) {
  if (!fs.existsSync(filePath)) return emptyState();
  try {
    return normalize(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return emptyState();
  }
}

export function saveImportState(state, filePath = DEFAULT_STATE_FILE) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  const temp = `${filePath}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(normalize(state), null, 2)}\n`, "utf8");
  fs.renameSync(temp, filePath);
}

/** Курсор набора данных: '' означает, что большой проход ещё не делался. */
export function datasetCursor(state, name) {
  return state.datasets[name]?.cursor ?? "";
}

/**
 * Номера ЕИС — цифровые строки, но у планов-графиков длина может отличаться,
 * поэтому сравниваем численно. Нецифровые значения сравниваем как строки.
 */
export function compareEisNumbers(left, right) {
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    const delta = BigInt(left) - BigInt(right);
    return delta > 0n ? 1 : delta < 0n ? -1 : 0;
  }
  return String(left).localeCompare(String(right));
}

/** Отбираем только номера старше курсора. */
export function newSinceCursor(numbers, cursor) {
  const unique = [...new Set((numbers ?? []).map(String).filter(Boolean))]
    .sort(compareEisNumbers);
  return cursor
    ? unique.filter((number) => compareEisNumbers(number, cursor) > 0)
    : unique;
}

/** Максимальный номер ЕИС в списке — новый курсор набора данных. */
export function lastEisNumber(numbers) {
  const unique = (numbers ?? []).map(String).filter(Boolean);
  return unique.length ? unique.sort(compareEisNumbers).at(-1) : "";
}

/** Обновляем курсор после успешного разбора: lastCheckedAt — каждый запуск. */
export function markChecked(state, name, { imported = 0, cursor = null, at = new Date() } = {}) {
  const previous = state.datasets[name] ?? {
    cursor: "",
    processedCount: 0,
    lastCheckedAt: null,
    lastImportedAt: null,
  };
  const iso = at.toISOString();
  // Ручной запрос старого номера не должен откатывать курсор назад.
  const nextCursor = cursor && compareEisNumbers(cursor, previous.cursor) > 0
    ? cursor
    : previous.cursor;
  state.datasets[name] = {
    cursor: nextCursor,
    processedCount: previous.processedCount + imported,
    lastCheckedAt: iso,
    lastImportedAt: imported > 0 ? iso : previous.lastImportedAt,
  };
  return state.datasets[name];
}
