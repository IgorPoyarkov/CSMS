import type { ContractSmpRecord } from "../ContractSmp/contractSmp.schema";

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

type CsvRow = Record<(typeof COLUMNS)[number], string>;

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
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Парсит CSV-файл в массив строк (полей).
 * Возвращает `null` при ошибке — пользователь подтвердит данные перед сохранением.
 */
export const parseCsv = (text: string): CsvRow[] | null => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;

  const header = lines[0].split(";").map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== header.length) continue;

    const row: Record<string, string> = {};
    header.forEach((col, idx) => {
      row[col] = values[idx] ?? "";
    });

    // Приводим к ожидаемому типу
    rows.push({
      contractNumber: row.contractNumber ?? "",
      contractDate: row.contractDate ?? "",
      supplierName: row.supplierName ?? "",
      supplierInn: row.supplierInn ?? "",
      documentType: row.documentType ?? "",
      documentNumber: row.documentNumber ?? "",
      documentDate: row.documentDate ?? "",
      amount: row.amount ?? "",
      supplierFull: row.supplierFull ?? "",
      isSmpSubject: row.isSmpSubject ?? "false",
      receivedAt: row.receivedAt ?? "",
      status: row.status ?? "accepted",
      supplierConfirmedAt: row.supplierConfirmedAt ?? "",
      customerConfirmedAt: row.customerConfirmedAt ?? "",
    });
  }

  return rows.length > 0 ? rows : null;
};

/** Парсит одну CSV-строку с учётом кавычек */
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
};

/**
 * Преобразует CSV-строку в массив записей для создания в базе.
 * Поля-константы (тип, статус) берутся из строк; пользователь подтвердит перед сохранением.
 */
export const csvToSmpRecords = (
  csvRows: CsvRow[],
  contractId: string | number,
  organizationId: string | number,
): Omit<ContractSmpRecord, "id" | "createdAt">[] => {
  const docTypeMap: Record<string, string> = {
    договор: "subContract",
    декларация: "declaration",
    акт: "acceptance",
    платёж: "payment",
  };

  return csvRows.map((row) => ({
    contractId,
    organizationId,
    documentType: docTypeMap[row.documentType.toLowerCase()] ?? "subContract",
    documentNumber: row.documentNumber,
    documentDate: row.documentDate,
    amount: row.amount,
    isSmpSubject: row.isSmpSubject === "true" || row.isSmpSubject === "Да",
    receivedAt: row.receivedAt || new Date().toISOString().slice(0, 16),
    status: row.status === "pushedToEis" ? "pushedToEis" : "accepted",
    supplierConfirmedAt: row.supplierConfirmedAt || "",
    supplierConfirmedBy: row.supplierFull,
    customerConfirmedAt: row.customerConfirmedAt || "",
    eisPublishDate: row.status === "pushedToEis" ? new Date().toISOString().slice(0, 10) : "",
    eisRecordNumber: "",
  }));
};
