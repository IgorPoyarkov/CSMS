import type {
  AcceptanceInput,
  AcceptancePosition,
  AcceptanceResponse,
} from "../Acceptance/acceptance.types";
import {
  EIS_CONTRACT_NUMBER_LENGTH,
  IKZ_LENGTH,
  isEisContractNumber,
  isIkz,
} from "./eisIdentifiers";

/**
 * Готовность приёмки и оплаты к передаче в ЕИС (Альбом 17.0).
 *
 * Зачем отдельный модуль, если шлюз всё равно валидирует XML по XSD:
 * — отказ шлюза приходит после нажатия «Сформировать пакет», и человек
 *   узнаёт о пустом номере платёжного документа из текста чужой ошибки;
 * — половину требований можно проверить до отправки, потому что они про наши
 *   же поля: номер документа, сумма, ставка НДС, КБК, реестровый номер;
 * — одна проверка на форму, карточку и шлюз — одна правда о том, что документ
 *   готов. Разъехавшиеся правила дают «в форме зелено, в ЕИС отказ».
 *
 * Требования взяты из снимка схем `public/eis-schemas/catalog.json`
 * (версия 17.0), типы:
 * — `contractExecutionDocAcceptanceType` (приёмка): обязательны
 *   `schemeVersion`, `regNumber`, `docAcceptanceInfo`; внутри — `documentType`,
 *   `documentDate`, `documentNum` (≤ 100), `deliveryAcceptDate`,
 *   `productsInfo`, а у каждой позиции — `fulfilledCost`;
 * — `contractExecutionPaymentType` (оплата): обязательны `schemeVersion`,
 *   `regNumber`, `payDocumentInfo`; внутри — `currency` и `paid`, а
 *   `payDocumentNum` (≤ 50), `payDocumentDate` и `payDocumentType`
 *   контролируются на приёме («При приеме контролируется обязательность
 *   заполнения»).
 *
 * Ссылочные значения (`documentType`, `VATCode`, `KBK`, `OKEIInfo/code`) ЕИС
 * сверяет со своими справочниками, поэтому здесь проверяется только форма
 * значения: выдумывать коды нельзя, их берут из `nsi*`.
 */

// ─── Коды и форматы XSD ────────────────────────────────────────────────────

/**
 * `payDocumentInfo/payDocumentType` — природа платежа, а не этап расчёта.
 * В Альбоме 17.0: PC — оплата контрагенту, PT — налоги и сборы, PE — по
 * исполнительному листу, PN — неустойка, RC/RE/RN — возвраты, PG/RG —
 * удержание гарантом. Аванс, промежуточный и окончательный расчёт этим полем
 * не различаются: все три — «оплата контрагенту».
 */
export const EIS_PAY_DOCUMENT_TYPE_CODES = [
  "PC",
  "PT",
  "PE",
  "PN",
  "RC",
  "RE",
  "RN",
  "PG",
  "RG",
] as const;

export type EisPayDocumentTypeCode =
  (typeof EIS_PAY_DOCUMENT_TYPE_CODES)[number];

export const EIS_PAY_DOCUMENT_TYPE_LABELS: Record<
  EisPayDocumentTypeCode,
  string
> = {
  PC: "PC — оплата контрагенту",
  PT: "PT — оплата налогов, сборов",
  PE: "PE — оплата по исполнительному листу",
  PN: "PN — оплата неустойки (штрафа, пени)",
  RC: "RC — возврат оплаты контрагенту",
  RE: "RE — возврат оплаты по исполнительному листу",
  RN: "RN — возврат неустойки (штрафа, пени)",
  PG: "PG — перечисление суммы удержания гарантом",
  RG: "RG — возврат суммы удержания гаранту",
};

/** Коды возврата: для них сумма читается как возвращённая, а не уплаченная. */
export const EIS_REFUND_PAY_DOCUMENT_TYPES: EisPayDocumentTypeCode[] = [
  "RC",
  "RE",
  "RN",
  "RG",
];

/**
 * `payDocumentInfo/baseDocumentInfo/baseDocumentType` — документ-основание
 * платежа: C — контракт (аванс), A — документ о приёмке, N — начисление
 * неустойки, U — удержание.
 */
export const EIS_BASE_DOCUMENT_TYPES = ["C", "A", "N", "U"] as const;

export type EisBaseDocumentType = (typeof EIS_BASE_DOCUMENT_TYPES)[number];

export const EIS_BASE_DOCUMENT_LABELS: Record<EisBaseDocumentType, string> = {
  C: "C — контракт (оплата аванса)",
  A: "A — документ о приёмке",
  N: "N — сведения о начислении неустойки",
  U: "U — сведения об удержании",
};

/** Рубли: `currency/@code` справочника ЦБ РФ. Других валют в CSMS нет. */
export const EIS_RUBLE_CURRENCY_CODE = "643";

/** Ставки НДС, которые понимает `nsiVATList` для документов с 2019 года. */
export const EIS_VAT_RATES = [0, 5, 7, 10, 20];

/** `xs:date` — только ГГГГ-ММ-ДД, без времени и часового пояса. */
export const isIsoDate = (value: string | null | undefined): boolean => {
  const text = (value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  // Сравниваем компоненты локальной даты: `toISOString()` переводит момент в
  // UTC, и в UTC+3 полночь уезжает на предыдущий день — проверка отвергала бы
  // корректные даты
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/**
 * Денежное значение XSD (`moneyType`, `moneyPositiveType`): число с копейками.
 * Разделитель — точка: запятая в документ не пойдёт, XML её не знает.
 */
const isMoney = (value: unknown, positive: boolean): boolean => {
  const text = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return false;

  return positive ? Number(text) > 0 : true;
};

/** `moneyType` — сумма с копейками (не «1e3» и не «12.345»). */
export const isEisMoney = (value: unknown): boolean => isMoney(value, false);

/** `moneyPositiveType` — строго больше нуля. */
export const isEisPositiveMoney = (value: unknown): boolean =>
  isMoney(value, true);

/** КБК — 20 разрядов (`kbkType`). ЕИС сверяет его с контрактом. */
export const isKbk = (value: string | null | undefined): boolean =>
  /^\d{20}$/.test((value ?? "").trim());

/** ОКПД2: 10 разрядов, с детализацией до характеристики — 12. */
export const isOkpd2Code = (value: string | null | undefined): boolean =>
  /^(\d{10}|\d{12})$/.test((value ?? "").trim());

/** ОКСМ — трёхзначный цифровой код страны (643 — Россия). */
export const isOksmCode = (value: string | null | undefined): boolean =>
  /^\d{3}$/.test((value ?? "").trim());

/**
 * Единица измерения в терминах ОКЕИ.
 *
 * В домене актирования `unit` — свободный текст («шт», «кг»), а XSD ждёт
 * `OKEIInfo/code` — три разряда. Таблица ниже покрывает ходовые единицы: если
 * она не узнала текст, готовность не блокируется, а просит указать код —
 * выдумать код за человека нельзя, его берут из справочника ОКЕИ.
 */
const OKEI_CODES_BY_UNIT: Record<string, string> = {
  "шт": "796",
  "штука": "796",
  "кг": "166",
  "килограмм": "166",
  "т": "168",
  "тонна": "168",
  "м": "006",
  "метр": "006",
  "м2": "055",
  "кв. м": "055",
  "м3": "113",
  "куб. м": "113",
  "л": "112",
  "литр": "112",
  "компл": "839",
  "комплект": "839",
  "упак": "778",
  "упаковка": "778",
  "усл. ед.": "876",
  "услуга": "876",
};

/** Код ОКЕИ по тексту единицы либо null, если текст не распознан. */
export const okeiCodeFromUnit = (
  unit: string | null | undefined,
): string | null => {
  const text = (unit ?? "").trim().toLowerCase();

  if (!text) return null;
  if (/^\d{3}$/.test(text)) return text;

  return OKEI_CODES_BY_UNIT[text] ?? null;
};

// ─── Результат проверки ────────────────────────────────────────────────────

export type EisXmlSeverity = "error" | "warning";

export interface EisXmlIssue {
  /** Путь в XSD: по нему видно, какое поле ЕИС не примет. */
  path: string;
  message: string;
  severity: EisXmlSeverity;
  /** Что сделать, чтобы замечание снялось. */
  hint?: string;
}

export interface EisXmlReadiness {
  /** Тип документа Альбома 17.0, по которому шла проверка. */
  xsdType: string;
  ok: boolean;
  blocking: EisXmlIssue[];
  warnings: EisXmlIssue[];
  summary: string;
  checkedAt: string;
}

const readinessOf = (
  xsdType: string,
  issues: EisXmlIssue[],
  now: string,
): EisXmlReadiness => {
  const blocking = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    xsdType,
    ok: blocking.length === 0,
    blocking,
    warnings,
    summary: `блокирующих ${blocking.length} · предупреждений ${warnings.length}`,
    checkedAt: now,
  };
};

/**
 * Текст для формы: первые три блокирующих замечания и счётчик остальных.
 * Простыня из десяти пунктов не читается, а «и ещё N» отправляет в карточку,
 * где они перечислены целиком.
 */
export const eisXmlReadinessText = (readiness: EisXmlReadiness): string => {
  if (readiness.ok) return "";

  const shown = readiness.blocking
    .slice(0, 3)
    .map((issue, index) => `${index + 1}) ${issue.path}: ${issue.message}`)
    .join(" ");

  const rest =
    readiness.blocking.length > 3
      ? ` … и ещё ${readiness.blocking.length - 3}.`
      : "";

  return (
    `Документ не пройдёт валидацию XML ЕИС (${readiness.xsdType}): ${shown}${rest} ` +
    "Исправьте поля и повторите: ЕИС отклонит документ, собранный из этих данных."
  );
};

/** Короткая подпись для таблиц и карточек. */
export const eisXmlReadinessBadge = (readiness: EisXmlReadiness): string =>
  readiness.ok
    ? readiness.warnings.length > 0
      ? `готов, замечаний ${readiness.warnings.length}`
      : "готов"
    : `не готов: ${readiness.blocking.length}`;

/**
 * Замечания, которые исправляются в самой форме платежа.
 *
 * Реквизиты контракта (реестровый номер, ИНН поставщика) правятся в карточке
 * контракта, поэтому сохранение факта оплаты они не блокируют: уже прошедший
 * платёж нужно зафиксировать, даже если контракт ещё не зарегистрирован в ЕИС.
 * Блокируют только поля самого платёжного документа.
 */
export const paymentFormBlocking = (
  readiness: EisXmlReadiness,
): EisXmlIssue[] =>
  readiness.blocking.filter(
    (issue) =>
      issue.path.startsWith("payDocumentInfo") ||
      issue.path.startsWith("paymentsSumInfo"),
  );

/** Текст всех замечаний — для подсказки `title` и раскрывающихся списков. */
export const eisXmlIssuesText = (readiness: EisXmlReadiness): string =>
  [...readiness.blocking, ...readiness.warnings]
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("\n");

// ─── Оплата: contractExecutionPaymentType ──────────────────────────────────

export type EisPaymentStatus = "scheduled" | "sent" | "paid" | "rejected";

/** Поля платежа, которые нужны проверке (структурно, без схемы реестра). */
export interface EisPaymentSource {
  paymentDocumentNumber?: string;
  paymentDate?: string;
  amount?: string;
  paymentType?: "advance" | "intermediate" | "final";
  paymentTypeCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  bankDocumentNumber?: string;
  regNumberExecution?: string;
  treasuryExecution?: boolean;
  kbk?: string;
  baseDocumentType?: string;
  baseDocumentNumber?: string;
  baseDocumentDate?: string;
  baseDocumentSid?: string;
  status?: EisPaymentStatus;
}

/** Реквизиты контракта, без которых сведения об исполнении не адресуются. */
export interface EisContractIdentifiers {
  eisRegistryNumber?: string;
  contractNumber?: string;
  supplierInn?: string;
}

/**
 * Реестровый номер контракта: у импортированных из ЕИС карточек
 * `eisRegistryNumber` пуст, а 19-значный `contractNumber` — это и есть
 * реестровый номер. Без такой подстановки форма требовала бы номер, который
 * в карточке уже есть.
 */
export const contractRegistryNumber = (
  contract: EisContractIdentifiers,
): string => {
  const direct = (contract.eisRegistryNumber ?? "").trim();

  if (direct) return direct;

  const imported = (contract.contractNumber ?? "").trim();

  return isEisContractNumber(imported) ? imported : "";
};

/**
 * Код по умолчанию для платежа по контракту.
 *
 * Аванс, промежуточный и окончательный расчёт в XSD различаются не типом
 * платёжного документа, а документом-основанием и этапом, поэтому все три —
 * «оплата контрагенту» (PC). Неустойка и возврат — отдельные коды, их
 * выбирают вручную: угадывать за человека природу платежа нельзя.
 */
export const EIS_DEFAULT_PAY_DOCUMENT_TYPE: EisPayDocumentTypeCode = "PC";

const isPayDocumentTypeCode = (value: string): value is EisPayDocumentTypeCode =>
  (EIS_PAY_DOCUMENT_TYPE_CODES as readonly string[]).includes(value);

/** ЕИС контролирует номер и дату платежа на приёме для отправленных сведений. */
const paymentSent = (status?: EisPaymentStatus): boolean =>
  status === "sent" || status === "paid";

/**
 * Готовность платежа к передаче в ЕИС (`contractExecutionPaymentType`).
 *
 * Пока платёж только запланирован, номер и дата ещё могут быть пустыми: это
 * предупреждение. Для отправленных и оплаченных — блокирующее замечание,
 * потому что ЕИС без них документ не примет.
 */
export const paymentEisReadiness = (
  payment: EisPaymentSource,
  contract: EisContractIdentifiers,
  options: { now?: string } = {},
): EisXmlReadiness => {
  const issues: EisXmlIssue[] = [];
  const sent = paymentSent(payment.status);
  const add = (issue: EisXmlIssue) => issues.push(issue);

  if (!contractRegistryNumber(contract)) {
    add({
      severity: "error",
      path: "contractExecutionPaymentType/regNumber",
      message:
        "в карточке контракта нет реестрового номера ЕИС — " +
        `${EIS_CONTRACT_NUMBER_LENGTH} цифр`,
      hint: "Заполните блок «Реквизиты для ЕИС» в карточке контракта.",
    });
  }

  const documentNumber = (payment.paymentDocumentNumber ?? "").trim();

  if (!documentNumber) {
    add({
      severity: sent ? "error" : "warning",
      path: "payDocumentInfo/payDocumentNum",
      message: sent
        ? "номер платёжного документа обязателен: ЕИС контролирует его на приёме"
        : "номер платёжного документа пока не указан",
      hint: "Номер берётся из платёжного поручения (до 50 знаков).",
    });
  } else if (documentNumber.length > 50) {
    add({
      severity: "error",
      path: "payDocumentInfo/payDocumentNum",
      message: `номер платёжного документа длиннее 50 знаков (${documentNumber.length})`,
    });
  }

  const paymentDate = (payment.paymentDate ?? "").trim();

  if (!paymentDate) {
    add({
      severity: sent ? "error" : "warning",
      path: "payDocumentInfo/payDocumentDate",
      message: sent
        ? "дата платёжного документа обязательна: ЕИС контролирует её на приёме"
        : "дата платёжного документа пока не указана",
    });
  } else if (!isIsoDate(paymentDate)) {
    add({
      severity: "error",
      path: "payDocumentInfo/payDocumentDate",
      message: `дата «${paymentDate}» не в формате ГГГГ-ММ-ДД`,
    });
  }

  if (!isEisPositiveMoney(payment.amount)) {
    add({
      severity: "error",
      path: "payDocumentInfo/paid",
      message:
        "сумма платежа должна быть положительным числом с копейками " +
        `(сейчас «${String(payment.amount ?? "")}»)`,
    });
  }

  const explicitCode = (payment.paymentTypeCode ?? "").trim();
  const code = explicitCode || EIS_DEFAULT_PAY_DOCUMENT_TYPE;

  if (!isPayDocumentTypeCode(code)) {
    add({
      severity: "error",
      path: "payDocumentInfo/payDocumentType",
      message: `код «${code}» не из справочника типов платежа`,
      hint: `Допустимые коды: ${EIS_PAY_DOCUMENT_TYPE_CODES.join(", ")}.`,
    });
  } else if (EIS_REFUND_PAY_DOCUMENT_TYPES.includes(code)) {
    add({
      severity: "warning",
      path: "payDocumentInfo/payDocumentType",
      message:
        `код ${code} — возврат: ЕИС прочитает сумму как возвращённую, ` +
        "а не уплаченную",
      hint: "Для оплаты поставщику оставьте PC.",
    });
  }

  const kbk = (payment.kbk ?? "").trim();

  if (payment.treasuryExecution && !kbk) {
    add({
      severity: "error",
      path: "paymentsSumInfo/budgetFinancingsInfo/KBK",
      message:
        "при казначейском исполнении нужен КБК: без него ЕИС не разложит " +
        "платёж по бюджетной классификации",
    });
  }

  if (kbk && !isKbk(kbk)) {
    add({
      severity: "error",
      path: "paymentsSumInfo/budgetFinancingsInfo/KBK",
      message: `КБК — 20 цифр, сейчас ${kbk.replace(/\D/g, "").length}`,
    });
  }

  const baseType = (payment.baseDocumentType ?? "C").trim();

  if (!(EIS_BASE_DOCUMENT_TYPES as readonly string[]).includes(baseType)) {
    add({
      severity: "error",
      path: "payDocumentInfo/baseDocumentInfo/baseDocumentType",
      message: `тип документа-основания «${baseType}» не из справочника`,
      hint: `Допустимые: ${EIS_BASE_DOCUMENT_TYPES.join(", ")}.`,
    });
  } else if (baseType === "A") {
    if (!(payment.baseDocumentSid ?? "").trim()) {
      add({
        severity: "error",
        path: "payDocumentInfo/baseDocumentInfo/docAcceptance/RDICSid",
        message:
          "для основания «документ о приёмке» нужен идентификатор документа " +
          "в ЕИС (RDICSid)",
        hint:
          "Он приходит после регистрации приёмки в ЕИС. Пока его нет, " +
          "для аванса выбирайте основание «контракт» (C).",
      });
    }

    if (
      !(payment.baseDocumentNumber ?? "").trim() ||
      !payment.baseDocumentDate
    ) {
      add({
        severity: "warning",
        path: "payDocumentInfo/baseDocumentInfo/docAcceptance",
        message:
          "номер и дата документа о приёмке не заполнены: сверять платёж " +
          "с актом придётся вручную",
      });
    }
  } else if (baseType === "N" || baseType === "U") {
    add({
      severity: "warning",
      path: "payDocumentInfo/baseDocumentInfo/penaltyRequirement",
      message:
        "основание «неустойка» передаётся отдельными сведениями о начислении " +
        "или удержании — без них ЕИС не найдёт документ",
    });
  }

  if (!(payment.invoiceNumber ?? "").trim() && !payment.invoiceDate) {
    add({
      severity: "warning",
      path: "payDocumentInfo/baseDocumentInfo",
      message:
        "счёт-фактура не указана: платёж нечем связать с основанием, " +
        "кроме номера и даты поручения",
    });
  }

  if (payment.status === "paid" && !(payment.regNumberExecution ?? "").trim()) {
    add({
      severity: "warning",
      path: "contractExecutionPaymentType/regNumberExecution",
      message:
        "реестровый номер сведений об исполнении не сохранён: его присваивает " +
        "ЕИС после приёма, без него повторная отправка создаст дубль",
    });
  }

  if (!(contract.supplierInn ?? "").trim()) {
    add({
      severity: "warning",
      path: "recipientInfo",
      message:
        "в контракте нет ИНН поставщика: ЕИС сверяет получателя платежа " +
        "с контрактом",
    });
  }

  return readinessOf(
    "contractExecutionPaymentType",
    issues,
    options.now ?? new Date().toISOString(),
  );
};

// ─── Приёмка: contractExecutionDocAcceptanceType ───────────────────────────

/**
 * Проверки шапки документа о приёмке: то, что видно в форме ещё до добавления
 * позиций. Используется и в форме (предупреждения), и в полной проверке
 * карточки — правила не дублируются.
 */
const acceptanceDocumentIssues = (input: AcceptanceInput): EisXmlIssue[] => {
  const issues: EisXmlIssue[] = [];

  const registryNumber = (input.eisRegistryNumber ?? "").trim();

  if (!registryNumber) {
    issues.push({
      severity: "error",
      path: "contractExecutionDocAcceptanceType/regNumber",
      message:
        "нет реестрового номера контракта в ЕИС: документ о приёмке " +
        "не к чему привязать",
      hint: "Заполните номер в карточке контракта, блок «Реквизиты для ЕИС».",
    });
  } else if (!isEisContractNumber(registryNumber)) {
    issues.push({
      severity: "error",
      path: "contractExecutionDocAcceptanceType/regNumber",
      message:
        `реестровый номер «${registryNumber}» не из ` +
        `${EIS_CONTRACT_NUMBER_LENGTH} цифр`,
    });
  }

  const documentNumber = (input.documentNumber ?? "").trim();

  if (!documentNumber) {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo/documentNum",
      message: "номер документа о приёмке обязателен",
      hint: "XSD ограничивает его 100 знаками.",
    });
  } else if (documentNumber.length > 100) {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo/documentNum",
      message: `номер документа длиннее 100 знаков (${documentNumber.length})`,
    });
  }

  if (!input.documentDate) {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo/documentDate",
      message: "дата документа о приёмке не заполнена",
    });
  } else if (!isIsoDate(input.documentDate)) {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo/documentDate",
      message: `дата «${input.documentDate}» не в формате ГГГГ-ММ-ДД`,
    });
  }

  if (input.kind === "Correction") {
    if (!(input.correctedDocumentNumber ?? "").trim()) {
      issues.push({
        severity: "error",
        path: "docAcceptanceInfo/modificationReasonInfo",
        message: "не указан номер исправляемого документа",
      });
    }

    if (!input.correctedDocumentDate) {
      issues.push({
        severity: "error",
        path: "docAcceptanceInfo/modificationReasonInfo",
        message: "не указана дата исправляемого документа",
      });
    }

    if ((input.correctionReason ?? "").trim().length < 10) {
      issues.push({
        severity: "error",
        path: "docAcceptanceInfo/modificationReasonInfo",
        message: "причина исправления короче 10 знаков",
      });
    }
  }

  const ikz = (input.ikz ?? "").trim();

  if (!ikz) {
    issues.push({
      severity: "warning",
      path: "contractInfo/ikz",
      message:
        "ИКЗ не заполнен: связь с позицией плана-графика ЕИС восстановит " +
        "по реестровому номеру контракта",
    });
  } else if (!isIkz(ikz)) {
    issues.push({
      severity: "warning",
      path: "contractInfo/ikz",
      message: `ИКЗ должен быть из ${IKZ_LENGTH} цифр, сейчас ${ikz.length}`,
    });
  }

  if (!(input.supplierInn ?? "").trim()) {
    issues.push({
      severity: "warning",
      path: "participantInfo/INN",
      message:
        "ИНН поставщика не заполнен: ЕИС сверяет исполнителя по контракту",
    });
  }

  return issues;
};

/**
 * Проверки одной позиции (`productsInfo/productsContractInfo/productInfo`).
 * `fulfilledCost` в XSD обязателен, остальное ЕИС проверяет бизнес-контролем:
 * без ОКПД2, ОКЕИ и ставки НДС документ уходит на уточнение.
 */
const acceptancePositionIssues = (
  position: AcceptancePosition,
  index: number,
): EisXmlIssue[] => {
  const issues: EisXmlIssue[] = [];
  const label = `Позиция ${index + 1}`;

  if (!position.name.trim()) {
    issues.push({
      severity: "error",
      path: "productInfo/name",
      message: `${label}: наименование не заполнено`,
    });
  } else if (position.name.length > 2000) {
    issues.push({
      severity: "error",
      path: "productInfo/name",
      message: `${label}: наименование длиннее 2000 знаков`,
    });
  }

  if (!(position.quantity > 0)) {
    issues.push({
      severity: "error",
      path: "productInfo/quantity",
      message: `${label}: количество должно быть больше нуля`,
    });
  }

  if (!isEisMoney(position.unitPrice) || position.unitPrice <= 0) {
    issues.push({
      severity: "error",
      path: "productInfo/unitPrice",
      message: `${label}: цена за единицу — положительная сумма с копейками`,
    });
  }

  if (!EIS_VAT_RATES.includes(position.vatRate)) {
    issues.push({
      severity: "error",
      path: "productInfo/VATRateInfo",
      message:
        `${label}: ставка НДС ${position.vatRate} % не из справочника ` +
        `(${EIS_VAT_RATES.join(", ")} %)`,
    });
  }

  if (!(position.totalWithVat > 0)) {
    issues.push({
      severity: "error",
      path: "productInfo/fulfilledCost",
      message: `${label}: стоимость исполненных обязательств равна нулю`,
    });
  }

  if (!okeiCodeFromUnit(position.unit)) {
    issues.push({
      severity: "warning",
      path: "productInfo/OKEIInfo/@code",
      message: `${label}: единица «${position.unit}» не сопоставлена с ОКЕИ`,
      hint:
        "В XML уходит код ОКЕИ (3 разряда): 796 — штука, 166 — килограмм, " +
        "876 — услуга.",
    });
  }

  const okpd2 = (position.okpd2 ?? "").trim();

  if (!okpd2) {
    issues.push({
      severity: "warning",
      path: "productInfo/OKPD2Info/@code",
      message: `${label}: ОКПД2 не указан — ЕИС вернёт документ на уточнение`,
    });
  } else if (!isOkpd2Code(okpd2)) {
    issues.push({
      severity: "error",
      path: "productInfo/OKPD2Info/@code",
      message: `${label}: ОКПД2 «${okpd2}» — 10 цифр (12 с детализацией)`,
    });
  }

  const country = (position.countryOrigin ?? "").trim();

  if (country && !isOksmCode(country)) {
    issues.push({
      severity: "error",
      path: "productInfo/originCountry/@countryCode",
      message: `${label}: страна происхождения «${country}» — код ОКСМ, 3 цифры`,
    });
  }

  if (!(position.registryNumber ?? "").trim()) {
    issues.push({
      severity: "warning",
      path: "productInfo/sid",
      message:
        `${label}: нет реестрового номера записи ЕИС — позицию сопоставят ` +
        "по ОКПД2 и наименованию",
    });
  }

  return issues;
};

/**
 * Готовность шапки документа о приёмке — для формы, где позиции ещё не
 * заведены. Полная проверка (с позициями и итогом) — ниже.
 */
export const acceptanceInputEisReadiness = (
  input: AcceptanceInput,
  options: { now?: string } = {},
): EisXmlReadiness =>
  readinessOf(
    "contractExecutionDocAcceptanceType",
    acceptanceDocumentIssues(input),
    options.now ?? new Date().toISOString(),
  );

/**
 * Готовность документа о приёмке к передаче в ЕИС.
 *
 * Кроме формы проверяется итог: ЕИС принимает сведения об исполнении только по
 * состоявшейся приёмке. Мотивированный отказ и возврат на уточнение — это
 * движения документа, а не исполнение, поэтому в XML они не уходят.
 */
export const acceptanceEisReadiness = (
  acceptance: AcceptanceResponse,
  options: { now?: string } = {},
): EisXmlReadiness => {
  const issues = acceptanceDocumentIssues(acceptance.input);

  if (acceptance.positions.length === 0) {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo/productsInfo",
      message:
        "в документе нет позиций: блок productsInfo обязателен, без него " +
        "ЕИС нечего исполнять",
    });
  }

  acceptance.positions.forEach((position, index) => {
    issues.push(...acceptancePositionIssues(position, index));
  });

  if (acceptance.result === null) {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo/deliveryAcceptDate",
      message:
        "итог приёмки не подписан: дату подписания заказчиком ЕИС требует " +
        "обязательной",
      hint: "Подпишите итог в карточке приёмки.",
    });
  } else if (acceptance.result === "Refused") {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo",
      message:
        "мотивированный отказ не передаётся как сведения об исполнении — " +
        "исполнения по такому документу нет",
    });
  } else if (acceptance.result === "ReturnedForRevision") {
    issues.push({
      severity: "error",
      path: "docAcceptanceInfo",
      message:
        "документ возвращён на уточнение: передавать его в ЕИС рано",
    });
  }

  if (!acceptance.signedAt) {
    issues.push({
      severity: "warning",
      path: "docAcceptanceInfo/deliveryAcceptDate",
      message:
        "дата подписания заказчиком не зафиксирована: в XML уйдёт дата " +
        "документа о приёмке",
    });
  }

  return readinessOf(
    "contractExecutionDocAcceptanceType",
    issues,
    options.now ?? new Date().toISOString(),
  );
};

