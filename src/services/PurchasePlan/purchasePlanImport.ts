import {
  PurchasePlanPositionSchema,
  buildIdentificationCode,
  buildPositionUniqueNumber,
  type PurchasePlanPosition,
} from "./purchasePlan.schema";
import { findOkpd2ByCode, type Okpd2Ref } from "../Okpd2Ref/okpd2Ref.api";

/**
 * Парсер, маппер и валидатор импорта закупок из внешних файлов (CSV/TSV, JSON)
 * и форматов ЕИС (XML tenderPlan2020 / purchasePlan) для автозаполнения черновиков ПГ.
 */

export type ImportSourceFormat = "csv" | "json" | "eis_xml";

export type PgImportTargetField =
  | "ignore"
  | "purchaseNumber"
  | "identificationCode"
  | "objectOfPurchase"
  | "okpd2Code"
  | "okpd2Name"
  | "kbk"
  | "plannedPlacementYear"
  | "amountTotal"
  | "amountCurrentYear"
  | "amountPlanPeriodFirstYear"
  | "amountPlanPeriodSecondYear"
  | "amountSubsequentYears"
  | "authorizedBodyName"
  | "jointOrganizerName"
  | "isPublicDiscussionRequired";

export const PG_IMPORT_FIELD_OPTIONS: {
  value: PgImportTargetField;
  label: string;
}[] = [
  { value: "ignore", label: "— Не импортировать —" },
  { value: "objectOfPurchase", label: "Объект закупки *" },
  { value: "okpd2Code", label: "Код ОКПД2" },
  { value: "okpd2Name", label: "Наименование по ОКПД2" },
  { value: "kbk", label: "КБК (20 цифр)" },
  { value: "amountTotal", label: "Объём финансирования, всего (₽)" },
  { value: "amountCurrentYear", label: "Финансирование текущий год (₽)" },
  { value: "amountPlanPeriodFirstYear", label: "Финансирование 1-й плановый год (₽)" },
  { value: "amountPlanPeriodSecondYear", label: "Финансирование 2-й плановый год (₽)" },
  { value: "amountSubsequentYears", label: "Последующие годы (₽)" },
  { value: "plannedPlacementYear", label: "Год размещения" },
  { value: "purchaseNumber", label: "Номер закупки (4 цифры)" },
  { value: "identificationCode", label: "ИКЗ (20–36 символов)" },
  { value: "authorizedBodyName", label: "Уполномоченный орган" },
  { value: "jointOrganizerName", label: "Организатор совместной закупки" },
  { value: "isPublicDiscussionRequired", label: "Общественное обсуждение (Да/Нет)" },
];

export interface ParsedImportTable {
  format: ImportSourceFormat;
  headers: string[];
  rows: Record<string, string>[];
  suggestedMapping: Record<string, PgImportTargetField>;
  detectedPlanNumber?: string;
  detectedPlanYear?: string;
  warnings: string[];
}

export interface ImportedPositionRow {
  rowIndex: number;
  position: PurchasePlanPosition;
  errors: string[];
  notices: string[];
  isValid: boolean;
}

const HEADER_MATCHERS: {
  field: PgImportTargetField;
  patterns: RegExp[];
}[] = [
  {
    field: "identificationCode",
    patterns: [/икз/i, /ikz/i, /identification.?code/i, /purchase.?id/i],
  },
  {
    field: "purchaseNumber",
    patterns: [/номер.?закуп/i, /purchase.?num/i, /pos.?num/i, /^№/i],
  },
  {
    field: "objectOfPurchase",
    patterns: [
      /объект.?закуп/i,
      /предмет.?закуп/i,
      /наименование.?объект/i,
      /object.?of.?purchase/i,
      /^object$/i,
      /purchase.?object/i,
    ],
  },
  {
    field: "okpd2Code",
    patterns: [/окпд/i, /okpd/i, /код.?окпд/i],
  },
  {
    field: "okpd2Name",
    patterns: [/наим.*окпд/i, /okpd.*name/i],
  },
  {
    field: "kbk",
    patterns: [/кбк/i, /kbk/i, /бюджет.?класс/i],
  },
  {
    field: "amountTotal",
    patterns: [
      /всего/i,
      /итого/i,
      /объ[её]м.*фин/i,
      /amount.?total/i,
      /сумма/i,
      /нмцк/i,
    ],
  },
  {
    field: "amountCurrentYear",
    patterns: [/текущ/i, /current.?year/i, /2026/],
  },
  {
    field: "amountPlanPeriodFirstYear",
    patterns: [/перв.*год/i, /first.?year/i, /2027/],
  },
  {
    field: "amountPlanPeriodSecondYear",
    patterns: [/втор.*год/i, /second.?year/i, /2028/],
  },
  {
    field: "amountSubsequentYears",
    patterns: [/последующ/i, /subsequent/i],
  },
  {
    field: "plannedPlacementYear",
    patterns: [/год.?размещ/i, /планируем.*год/i, /placement.?year/i, /plan.?year/i],
  },
  {
    field: "authorizedBodyName",
    patterns: [/уполномоч/i, /authorized/i],
  },
  {
    field: "jointOrganizerName",
    patterns: [/совмест/i, /joint/i],
  },
  {
    field: "isPublicDiscussionRequired",
    patterns: [/обсужден/i, /discussion/i],
  },
];

export const detectColumnMapping = (
  headers: string[],
): Record<string, PgImportTargetField> => {
  const result: Record<string, PgImportTargetField> = {};
  const used = new Set<PgImportTargetField>();

  for (const header of headers) {
    let matched: PgImportTargetField = "ignore";
    for (const candidate of HEADER_MATCHERS) {
      if (used.has(candidate.field)) continue;
      if (candidate.patterns.some((re) => re.test(header))) {
        matched = candidate.field;
        used.add(candidate.field);
        break;
      }
    }
    result[header] = matched;
  }

  return result;
};

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
};

const parseDelimitedTable = (text: string): ParsedImportTable => {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      format: "csv",
      headers: [],
      rows: [],
      suggestedMapping: {},
      warnings: ["Файл должен содержать строку заголовков и минимум одну строку данных."],
    };
  }

  const first = lines[0];
  const semiCount = (first.match(/;/g) ?? []).length;
  const tabCount = (first.match(/\t/g) ?? []).length;
  const commaCount = (first.match(/,/g) ?? []).length;
  const delimiter =
    tabCount >= semiCount && tabCount >= commaCount && tabCount > 0
      ? "\t"
      : semiCount >= commaCount && semiCount > 0
        ? ";"
        : ",";

  const headers = splitCsvLine(first, delimiter).map(
    (h, idx) => h || `Колонка ${idx + 1}`,
  );
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i], delimiter);
    if (cells.every((c) => c === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }

  return {
    format: "csv",
    headers,
    rows,
    suggestedMapping: detectColumnMapping(headers),
    warnings: [],
  };
};

// Простой извлекатель XML-тегов, работающий и в браузере (DOMParser), и в Node SSR/тестах
const extractXmlTagText = (block: string, tagNames: string[]): string => {
  for (const tag of tagNames) {
    const re = new RegExp(
      `<(?:[a-zA-Z0-9_-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tag}>`,
      "i",
    );
    const match = block.match(re);
    if (match) {
      return match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  return "";
};

const extractXmlBlocks = (xml: string, tagNames: string[]): string[] => {
  for (const tag of tagNames) {
    const re = new RegExp(
      `<(?:[a-zA-Z0-9_-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tag}>`,
      "gi",
    );
    const matches = Array.from(xml.matchAll(re)).map((m) => m[0]);
    if (matches.length > 0) return matches;
  }
  return [];
};

const parseEisXml = (xmlText: string): ParsedImportTable => {
  const cleaned = xmlText.replace(/^\uFEFF/, "").trim();
  const planNumber = extractXmlTagText(cleaned, ["planNumber", "regNum"]);
  const planYear = extractXmlTagText(cleaned, ["planYear", "financialYear"]);
  const posBlocks = extractXmlBlocks(cleaned, [
    "position",
    "planPosition",
    "purchasePlanPosition",
    "tenderPlanPosition",
  ]);

  const headers = [
    "purchaseNumber",
    "identificationCode",
    "objectOfPurchase",
    "okpd2Code",
    "okpd2Name",
    "kbk",
    "plannedPlacementYear",
    "amountTotal",
    "amountCurrentYear",
    "amountPlanPeriodFirstYear",
    "amountPlanPeriodSecondYear",
    "isPublicDiscussionRequired",
  ];

  const rows: Record<string, string>[] = posBlocks.map((block) => ({
    purchaseNumber: extractXmlTagText(block, [
      "purchaseNumber",
      "positionNumber",
      "extNumber",
    ]),
    identificationCode: extractXmlTagText(block, [
      "IKZ",
      "ikz",
      "identificationCode",
    ]),
    objectOfPurchase: extractXmlTagText(block, [
      "objectInfo",
      "objectOfPurchase",
      "purchaseObjectInfo",
      "name",
    ]),
    okpd2Code: extractXmlTagText(block, ["OKPD2Code", "okpd2Code", "code"]),
    okpd2Name: extractXmlTagText(block, ["OKPD2Name", "okpd2Name"]),
    kbk: extractXmlTagText(block, ["KBK", "kbk", "kbkCode"]),
    plannedPlacementYear:
      extractXmlTagText(block, ["publishYear", "plannedPlacementYear"]) ||
      planYear,
    amountTotal: extractXmlTagText(block, ["total", "amountTotal"]),
    amountCurrentYear: extractXmlTagText(block, [
      "currentYear",
      "amountCurrentYear",
    ]),
    amountPlanPeriodFirstYear: extractXmlTagText(block, [
      "firstYear",
      "amountPlanPeriodFirstYear",
    ]),
    amountPlanPeriodSecondYear: extractXmlTagText(block, [
      "secondYear",
      "amountPlanPeriodSecondYear",
    ]),
    isPublicDiscussionRequired: extractXmlTagText(block, [
      "publicDiscussion",
      "isPublicDiscussionRequired",
    ]),
  }));

  const warnings: string[] = [];
  if (rows.length === 0) {
    warnings.push(
      "В XML не найдены теги позиций (<position>, <planPosition>, <purchasePlanPosition>). Проверьте структуру выгрузки ЕИС.",
    );
  }

  return {
    format: "eis_xml",
    headers,
    rows,
    suggestedMapping: detectColumnMapping(headers),
    detectedPlanNumber: planNumber || undefined,
    detectedPlanYear: planYear || undefined,
    warnings,
  };
};

const parseJsonImport = (jsonText: string): ParsedImportTable => {
  const warnings: string[] = [];
  try {
    const parsed = JSON.parse(jsonText.replace(/^\uFEFF/, "").trim()) as unknown;
    let rawRows: Record<string, unknown>[] = [];
    let detectedPlanNumber: string | undefined;
    let detectedPlanYear: string | undefined;

    if (Array.isArray(parsed)) {
      rawRows = parsed.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      );
    } else if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.planNumber === "string") detectedPlanNumber = obj.planNumber;
      if (obj.planYear !== undefined) detectedPlanYear = String(obj.planYear);
      if (Array.isArray(obj.positions)) {
        rawRows = obj.positions.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null,
        );
      }
    }

    if (rawRows.length === 0) {
      return {
        format: "json",
        headers: [],
        rows: [],
        suggestedMapping: {},
        warnings: ["JSON не содержит массива позиций плана-графика."],
      };
    }

    const headerSet = new Set<string>();
    rawRows.forEach((row) =>
      Object.keys(row).forEach((key) => {
        if (typeof row[key] !== "object" || row[key] === null) {
          headerSet.add(key);
        }
      }),
    );
    const headers = Array.from(headerSet);
    const rows = rawRows.map((row) =>
      Object.fromEntries(
        headers.map((h) => [
          h,
          row[h] === undefined || row[h] === null ? "" : String(row[h]),
        ]),
      ),
    );

    return {
      format: "json",
      headers,
      rows,
      suggestedMapping: detectColumnMapping(headers),
      detectedPlanNumber,
      detectedPlanYear,
      warnings,
    };
  } catch (err) {
    return {
      format: "json",
      headers: [],
      rows: [],
      suggestedMapping: {},
      warnings: [`Ошибка разбора JSON: ${String(err)}`],
    };
  }
};

export const parseExternalPurchasePlanSource = (
  content: string,
  fileName = "",
): ParsedImportTable => {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".xml") || trimmed.startsWith("<")) {
    return parseEisXml(trimmed);
  }
  if (
    lowerName.endsWith(".json") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("{")
  ) {
    return parseJsonImport(trimmed);
  }
  return parseDelimitedTable(trimmed);
};

const normalizeMoneyString = (raw: string | undefined): string => {
  if (!raw) return "";
  const cleaned = raw
    .replace(/\u00A0/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const num = Number(cleaned);
  return Number.isFinite(num) ? num.toFixed(2) : "";
};

const parseBool = (raw: string | undefined): boolean => {
  if (!raw) return false;
  return /^(да|true|1|yes|\+)$/i.test(raw.trim());
};

export const buildImportedPositions = ({
  rows,
  mapping,
  planYear,
  planNumber,
  inn,
  kpp,
  startSerialNumber = 1,
  okpd2Refs = [],
}: {
  rows: Record<string, string>[];
  mapping: Record<string, PgImportTargetField>;
  planYear: string;
  planNumber: string;
  inn?: string;
  kpp?: string;
  startSerialNumber?: number;
  okpd2Refs?: Okpd2Ref[];
}): ImportedPositionRow[] => {
  const reverseMap = new Map<PgImportTargetField, string>();
  for (const [col, target] of Object.entries(mapping)) {
    if (target !== "ignore" && !reverseMap.has(target)) {
      reverseMap.set(target, col);
    }
  }

  const getVal = (row: Record<string, string>, field: PgImportTargetField) => {
    const col = reverseMap.get(field);
    return col ? (row[col] ?? "").trim() : "";
  };

  return rows.map((row, idx) => {
    const serial = startSerialNumber + idx;
    const rawPurchaseNum = getVal(row, "purchaseNumber").replace(/\D/g, "");
    const purchaseNumber = (rawPurchaseNum || String(serial)).padStart(4, "0").slice(-4);
    const kbk = getVal(row, "kbk").replace(/\D/g, "");
    const okpd2Code = getVal(row, "okpd2Code");
    const okpd2Match = findOkpd2ByCode(okpd2Refs, okpd2Code);
    const okpd2Name = getVal(row, "okpd2Name") || okpd2Match?.name || "";
    const objectOfPurchase = getVal(row, "objectOfPurchase");
    const plannedPlacementYear =
      getVal(row, "plannedPlacementYear").replace(/\D/g, "").slice(0, 4) ||
      planYear;

    const amountCurrent = normalizeMoneyString(getVal(row, "amountCurrentYear"));
    const amountFirst = normalizeMoneyString(
      getVal(row, "amountPlanPeriodFirstYear"),
    );
    const amountSecond = normalizeMoneyString(
      getVal(row, "amountPlanPeriodSecondYear"),
    );
    const amountSubsequent = normalizeMoneyString(
      getVal(row, "amountSubsequentYears"),
    );
    let amountTotal = normalizeMoneyString(getVal(row, "amountTotal"));

    const partsSum =
      (Number(amountCurrent) || 0) +
      (Number(amountFirst) || 0) +
      (Number(amountSecond) || 0) +
      (Number(amountSubsequent) || 0);

    let resolvedCurrent = amountCurrent;
    if (!amountTotal && partsSum > 0) {
      amountTotal = partsSum.toFixed(2);
    } else if (amountTotal && partsSum === 0) {
      resolvedCurrent = amountTotal;
    }

    const rawIkz = getVal(row, "identificationCode").replace(/\s+/g, "");
    const generatedIkz =
      rawIkz ||
      buildIdentificationCode({
        planYear: plannedPlacementYear || planYear,
        inn,
        kpp,
        purchaseNumber,
        serialNumber: serial,
        okpd2Code,
        kbk,
      });

    const uniqueNumber = buildPositionUniqueNumber(planNumber, serial);

    const position: PurchasePlanPosition = {
      id: Date.now() + idx,
      serialNumber: serial,
      uniqueNumber: uniqueNumber || undefined,
      purchaseNumber,
      identificationCode: generatedIkz || "",
      objectOfPurchase,
      plannedPlacementYear: plannedPlacementYear || planYear,
      amountTotal: amountTotal || "0.00",
      amountCurrentYear: resolvedCurrent || "0.00",
      amountPlanPeriodFirstYear: amountFirst || "0.00",
      amountPlanPeriodSecondYear: amountSecond || "0.00",
      amountSubsequentYears: amountSubsequent || "0.00",
      isPublicDiscussionRequired: parseBool(
        getVal(row, "isPublicDiscussionRequired"),
      ),
      authorizedBodyName: getVal(row, "authorizedBodyName"),
      jointOrganizerName: getVal(row, "jointOrganizerName"),
      okpd2Code,
      okpd2Name,
      objectName: objectOfPurchase,
      kbk,
      kbkEntries: kbk
        ? [
            {
              kbk,
              amountTotal: amountTotal || "0.00",
              amountCurrentYear: resolvedCurrent || "0.00",
              amountPlanPeriodFirstYear: amountFirst || "0.00",
              amountPlanPeriodSecondYear: amountSecond || "0.00",
              amountSubsequentYears: amountSubsequent || "0.00",
            },
          ]
        : [],
      status: "planned",
      statusDate: "",
    };

    const parsed = PurchasePlanPositionSchema.safeParse(position);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => issue.message);
    const notices: string[] = [];

    if (!rawIkz && generatedIkz) {
      notices.push("ИКЗ сформирован автоматически по ИНН/КПП/КБК");
    } else if (!generatedIkz) {
      notices.push("ИКЗ не сформирован (укажите 20-значный КБК или внесите вручную)");
    }
    if (okpd2Match?.isNormed) {
      notices.push("Код ОКПД2 подлежит обязательному нормированию (ПП № 926)");
    }
    if (okpd2Match?.isAuctionRequired) {
      notices.push("Код ОКПД2 входит в аукционный перечень (РП № 471-р)");
    }

    return {
      rowIndex: idx + 1,
      position,
      errors,
      notices,
      isValid: parsed.success,
    };
  });
};

export const buildSampleCsvTemplate = (planYear = "2026"): string =>
  [
    "Номер закупки;Объект закупки;Код ОКПД2;КБК;Год размещения;Всего (руб);Текущий год;1-й плановый год;Общественное обсуждение",
    `0010;Поставка компьютерной техники для нужд контрактной службы;26.20.15.000;80107090120100110244;${planYear};1850000.00;1850000.00;0.00;Нет`,
    `0011;Оказание услуг по техническому обслуживанию медицинского оборудования;33.13.12.000;80109010210100110244;${planYear};2400000.00;1600000.00;800000.00;Нет`,
    `0012;Поставка расходных медицинских материалов (перчатки, шприцы);22.19.60.119;80109010210100110244;${planYear};950000.00;950000.00;0.00;Нет`,
  ].join("\n");

export const buildSampleEisXml = (
  planNumber = "202603770123450009",
  planYear = "2026",
): string => `<?xml version="1.0" encoding="UTF-8"?>
<tenderPlan2020>
  <commonInfo>
    <planNumber>${planNumber}</planNumber>
    <planYear>${planYear}</planYear>
  </commonInfo>
  <positions>
    <position>
      <purchaseNumber>0021</purchaseNumber>
      <IKZ>26277012345677701010010021001244</IKZ>
      <objectInfo>Поставка лекарственных препаратов для стационара</objectInfo>
      <OKPD2Code>21.20.10.110</OKPD2Code>
      <OKPD2Name>Препараты лекарственные</OKPD2Name>
      <KBK>80109010210100110244</KBK>
      <publishYear>${planYear}</publishYear>
      <financeInfo>
        <total>4200000.00</total>
        <currentYear>4200000.00</currentYear>
        <firstYear>0.00</firstYear>
        <secondYear>0.00</secondYear>
      </financeInfo>
      <publicDiscussion>false</publicDiscussion>
    </position>
    <position>
      <purchaseNumber>0022</purchaseNumber>
      <objectInfo>Текущий ремонт помещений приёмного отделения</objectInfo>
      <OKPD2Code>41.20.40.000</OKPD2Code>
      <KBK>80109010210100110244</KBK>
      <publishYear>${planYear}</publishYear>
      <financeInfo>
        <total>3150000.00</total>
        <currentYear>3150000.00</currentYear>
        <firstYear>0.00</firstYear>
        <secondYear>0.00</secondYear>
      </financeInfo>
      <publicDiscussion>false</publicDiscussion>
    </position>
  </positions>
</tenderPlan2020>
`;
