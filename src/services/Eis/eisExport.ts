/**
 * Экспорт сведений о привлечении СМП в CSV (поля реестра ЕИС).
 *
 * ТЗ (CurrentTasks.md, п.7): выгрузка — CSV или печатная форма,
 * отправка XML в ЕИС не делается. CSV содержит поля, которые
 * заказчик вносит в карточку контракта ЕИС без ручного набора.
 */

/** Столбцы CSV */
export const COLUMNS = [
  "contractNumber",
  "contractDate",
  "supplierName",
  "supplierInn",
  "documentType",
  "documentNumber",
  "documentDate",
  "amount",
  "supplierFull",
  "isSmpSubject",
  "receivedAt",
  "status",
  "supplierConfirmedAt",
  "customerConfirmedAt",
] as const;

export type CsvRow = Record<(typeof COLUMNS)[number], string>;

/**
 * Конвертирует массив записей в CSV-строку.
 * Данные экранируются: кавычки, переносы строк, запятые.
 */
export const recordsToCsv = (records: CsvRow[]): string => {
  const header = [...COLUMNS].join(";"); // разделитель — точка с запятой (Excel на русском)
  const rows = records.map((r) =>
    COLUMNS.map((c) => escapeCsvField(String(r[c] ?? ""))).join(";"),
  );

  return [header, ...rows].join("\n");
};

/** Экранирует значение для CSV (когда разделитель — точка с запятой) */
const escapeCsvField = (value: string): string => {
  if (value.includes('"') || value.includes(";") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Скачивает CSV-файл в браузер.
 */
export const downloadCsv = (csv: string, fileName: string): void => {
  // BOM для корректного открытия в Excel (UTF-8 с BOM)
  downloadText("\uFEFF" + csv, fileName, "text/csv;charset=utf-8");
};

/** Скачать текстовый файл с заданным типом содержимого. */
export const downloadText = (
  text: string,
  fileName: string,
  mime: string,
): void => {
  const blob = new Blob([text], { type: mime });
  downloadBlob(blob, fileName);
};

/** Скачать бинарный файл (например, подпись `.sig` в DER). */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
