import {
  contractSmpDocumentTypeLabels,
  isRecordAccepted,
  type ContractSmpRecord,
} from "./contractSmp.schema";
import {
  computeSupplierDeadlines,
  type SmpDeadlineItem,
} from "./deadlines";
import {
  isSmpRegistryEntryFound,
  normalizeInn,
  smpRegistryCategoryLabels,
  type SmpRegistryEntry,
} from "./smpRegistry.schema";

/**
 * Контроль сведений о привлечении СМП: сверка субподрядчика с реестром МСП и
 * проверка сроков предоставления документов и оплаты по ним (ПП РФ от
 * 23.12.2016 N 1466, п. 2-5).
 *
 * Зачем отдельный модуль:
 * — объём привлечения закрывают только договоры с субподрядчиками из реестра
 *   МСП (ч. 6 ст. 30 44-ФЗ), но в карточку реквизиты приходят из XML ЕИС и от
 *   подрядчика — признак «СМП» в них заявлен, а не подтверждён;
 * — сроки по типовым условиям уже считаются в `deadlines.ts`, но их результат
 *   нигде не связывался с конкретной записью: заказчик видел общую таблицу и не
 *   понимал, из-за какого документа просрочка;
 * — одна проверка на форму, таблицу сведений и хронологию исполнения — одна
 *   правда о том, можно ли принять сведения и что нарушено.
 *
 * Сверка с реестром идёт ТОЛЬКО по ИНН: наименование меняется и допускает
 * совпадение с одноимённой организацией, ИНН — нет. Записи без ИНН считаются
 * непроверенными, а не «не СМП». Так же и непроверенный ИНН: справочник хранит
 * результаты точечных запросов к сервису ФНС, поэтому отсутствие записи —
 * «не проверено» (статус `unchecked`), а не «не в реестре», и приёмку такая
 * запись не блокирует — иначе каждый ещё не сверенный ИНН получал бы отказ.
 */

export type SmpCheckSeverity = "error" | "warning";

export type SmpCheckCode = "registry" | "deadline";

/** Поле записи, из-за которого возникло замечание: его правят в форме. */
export type SmpCheckField =
  | "supplierInn"
  | "documentDate"
  | "paidToSupplierDate"
  | "acceptanceSignedDate";

export interface SmpCheckIssue {
  field: SmpCheckField;
  code: SmpCheckCode;
  message: string;
  severity: SmpCheckSeverity;
  /** Что сделать, чтобы замечание снялось. */
  hint?: string;
}

export type SmpRegistryStatus =
  | "in_registry"
  | "excluded"
  | "out_of_registry"
  /** ИНН ещё не сверялся с сервисом ФНС: вердикта нет, приёмка не блокируется. */
  | "unchecked"
  | "unknown";

export interface SmpRegistryCheck {
  /** Проверка применима: договор с субподрядчиком, заявленным как СМП/СОНКО. */
  applicable: boolean;
  status: SmpRegistryStatus;
  /** Найденная запись реестра (по ИНН). */
  entry: SmpRegistryEntry | null;
  /** Есть ли в справочнике хотя бы одна сверка (не влияет на вердикт по ИНН). */
  registryLoaded: boolean;
  /**
   * Первое представление этого ИНН как СМП. Повторно реестр не блокирует
   * приёмку: ИНН уже проверяли по ранее принятому договору.
   */
  firstSubmission: boolean;
  /** Ранее принятый договор с тем же ИНН. */
  verifiedBy?: ContractSmpRecord;
  /** Готовая формулировка для интерфейса и подсказки `title`. */
  text: string;
}

export interface SmpRecordCheck {
  registry: SmpRegistryCheck;
  /** Ошибки: нарушение, которое нельзя пропустить. */
  blocking: SmpCheckIssue[];
  warnings: SmpCheckIssue[];
  /** Нет ошибок: предупреждения не считаются провалом проверки. */
  ok: boolean;
  /**
   * «Принять и подтвердить» недоступно: реестр МСП не подтверждает, что
   * субподрядчик является субъектом МСП, а объём закрывают только такие
   * договоры (ч. 6 ст. 30 44-ФЗ).
   */
  acceptanceBlocked: boolean;
  /** Ближайший или нарушенный срок по этой записи. */
  deadline: SmpDeadlineItem | null;
  /** Срок строкой: «просрочка 3 раб. дн. (срок 04.12.2026, п. 2)». */
  deadlineText: string;
  summary: string;
}

export interface SmpCheckOptions {
  /** Дата проверки в ГГГГ-ММ-ДД; по умолчанию — сегодня. */
  today?: string;
  /** Переносы выходных, утверждённые Правительством на год. */
  extraHolidays?: string[];
}


// ─── Даты в подписи ────────────────────────────────────────────────────────

const isoDate = (value?: string | null): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : raw.slice(0, 10);
};

const showDate = (value?: string | null): string => {
  const [year, month, day] = isoDate(value).split("-");
  return day && month && year ? `${day}.${month}.${year}` : "";
};

/** Подпись документа — та же, что в таблице сроков (`deadlines.ts`). */
const documentLabel = (record: ContractSmpRecord): string =>
  `${contractSmpDocumentTypeLabels[record.documentType]} № ${
    record.documentNumber || "—"
  } от ${record.documentDate || "—"}`;

// ─── Реестр МСП ────────────────────────────────────────────────────────────

/**
 * Ранее принятый договор с тем же ИНН: ИНН уже сверяли с реестром, повторная
 * блокировка приёмки по акту или платёжке не нужна.
 */
export const acceptedSubContractWithSameInn = (
  record: ContractSmpRecord,
  records: ContractSmpRecord[],
): ContractSmpRecord | undefined => {
  const inn = normalizeInn(record.supplierInn);
  if (!inn) return undefined;

  return records.find(
    (candidate) =>
      candidate.documentType === "subContract" &&
      candidate.isSmpSubject &&
      isRecordAccepted(candidate) &&
      String(candidate.id) !== String(record.id) &&
      normalizeInn(candidate.supplierInn) === inn,
  );
};

const registryEntryByInn = (
  record: ContractSmpRecord,
  registry: SmpRegistryEntry[],
): SmpRegistryEntry | null => {
  const inn = normalizeInn(record.supplierInn);
  if (!inn) return null;

  return registry.find((entry) => normalizeInn(entry.inn) === inn) ?? null;
};

const registryStatusOf = (
  inn: string,
  entry: SmpRegistryEntry | null,
): SmpRegistryStatus => {
  if (!inn) return "unknown";
  // Записи нет — этот ИНН ещё не сверяли: «не в реестре» утверждать нельзя
  if (!entry) return "unchecked";
  // Сверка выполнена и ИНН в реестре не значится
  if (!isSmpRegistryEntryFound(entry)) return "out_of_registry";
  return entry.isActive ? "in_registry" : "excluded";
};

const registryTextOf = (
  status: SmpRegistryStatus,
  entry: SmpRegistryEntry | null,
  inn: string,
): string => {
  switch (status) {
    case "in_registry": {
      const category = entry?.category
        ? smpRegistryCategoryLabels[entry.category]
        : "";
      const number = entry?.registryNumber
        ? `, запись № ${entry.registryNumber}`
        : "";
      return `В реестре МСП${category ? `: ${category}` : ""}${number}`;
    }
    case "excluded": {
      const reason = entry?.note ? ` (${entry.note})` : "";
      return `Исключён из реестра МСП${reason}`;
    }
    case "out_of_registry":
      return `ИНН ${inn} в реестре МСП не найден`;
    case "unchecked":
      return `ИНН ${inn} не сверялся с реестром МСП`;
    default:
      return "ИНН не указан — принадлежность к реестру МСП не проверена";
  }
};

/**
 * Проверка субподрядчика по реестру МСП.
 *
 * Проверяются только договоры с субподрядчиком, заявленным как СМП/СОНКО:
 * декларация, акт и платёжка относятся к тому же ИНН, и повторять сверку по
 * каждому документу незачем — объём закрывает сам договор.
 */
export const smpRegistryCheck = (
  record: ContractSmpRecord,
  records: ContractSmpRecord[],
  registry: SmpRegistryEntry[],
): SmpRegistryCheck => {
  const applicable =
    record.documentType === "subContract" && record.isSmpSubject;

  if (!applicable) {
    return {
      applicable: false,
      status: "unknown",
      entry: null,
      registryLoaded: registry.length > 0,
      firstSubmission: false,
      text: "",
    };
  }

  const inn = normalizeInn(record.supplierInn);
  const registryLoaded = registry.length > 0;
  const entry = registryEntryByInn(record, registry);
  const status = registryStatusOf(inn, entry);
  const verifiedBy = acceptedSubContractWithSameInn(record, records);

  const base = registryTextOf(status, entry, inn);
  const text = verifiedBy
    ? `${base} · ИНН уже проверялся по договору № ${
        verifiedBy.documentNumber || "—"
      }`
    : base;

  return {
    applicable: true,
    status,
    entry,
    registryLoaded,
    firstSubmission: !verifiedBy,
    verifiedBy,
    text,
  };
};

// ─── Сроки по этой записи ──────────────────────────────────────────────────

/**
 * Сроки ПП 1466, относящиеся к одной записи.
 *
 * `computeSupplierDeadlines` считает по всему набору, поэтому запись под рукой
 * должна быть в наборе: при редактировании она заменяет сохранённую версию, при
 * создании — добавляется в конец. Новая запись без id ищется по подписи
 * документа: у сохранённых записей id есть, поэтому подпись уникальна.
 */
export const smpRecordDeadlines = (
  record: ContractSmpRecord,
  records: ContractSmpRecord[],
  options: SmpCheckOptions = {},
): SmpDeadlineItem[] => {
  const scope =
    record.id === undefined
      ? [...records, record]
      : [
          ...records.filter(
            (candidate) => String(candidate.id) !== String(record.id),
          ),
          record,
        ];
  const label = documentLabel(record);

  return computeSupplierDeadlines(scope, options).filter((item) =>
    record.id !== undefined
      ? String(item.recordId) === String(record.id)
      : item.recordId === undefined && item.documentLabel === label,
  );
};

const deadlineField = (item: SmpDeadlineItem): SmpCheckField => {
  if (item.ruleCode === "p5") return "acceptanceSignedDate";
  if (item.ruleCode === "p4a" || item.ruleCode === "p4b") {
    return "paidToSupplierDate";
  }
  return "documentDate";
};

const byDue = (left: SmpDeadlineItem, right: SmpDeadlineItem): number =>
  left.dueDate.localeCompare(right.dueDate);

/** Самый тяжёлый срок: сначала просроченный, затем ожидаемый, затем в срок. */
const pickDeadline = (
  deadlines: SmpDeadlineItem[],
): SmpDeadlineItem | null => {
  const overdue = deadlines
    .filter((item) => item.status === "overdue")
    .sort(
      (left, right) => right.overdueBusinessDays - left.overdueBusinessDays,
    );
  if (overdue.length > 0) return overdue[0];

  const pending = deadlines
    .filter((item) => item.status === "pending")
    .sort(byDue);
  if (pending.length > 0) return pending[0];

  return (
    deadlines.filter((item) => item.status === "met").sort(byDue)[0] ?? null
  );
};

/** Короткая подпись срока — для таблицы сведений и хронологии. */
export const smpDeadlineShort = (item: SmpDeadlineItem): string => {
  if (item.status === "overdue") {
    return `просрочка ${item.overdueBusinessDays} раб. дн.`;
  }
  if (item.status === "pending") {
    return item.remainingBusinessDays > 0
      ? `осталось ${item.remainingBusinessDays} раб. дн.`
      : "срок сегодня";
  }
  if (item.status === "met") return "в срок";
  return "";
};

export const smpDeadlineText = (item: SmpDeadlineItem): string => {
  const due = showDate(item.dueDate);
  const rule = `${item.clause}, ${item.workingDays} раб. дн. ${item.basis}`;

  if (item.status === "overdue") {
    return `Просрочка ${item.overdueBusinessDays} раб. дн.: срок был ${due} (${rule})`;
  }
  if (item.status === "pending") {
    return item.remainingBusinessDays > 0
      ? `Срок до ${due} — осталось ${item.remainingBusinessDays} раб. дн. (${rule})`
      : `Срок наступает сегодня, ${due} (${rule})`;
  }
  if (item.status === "met") return `Срок соблюдён: ${due} (${rule})`;
  return "";
};

const deadlineIssue = (item: SmpDeadlineItem): SmpCheckIssue => ({
  field: deadlineField(item),
  code: "deadline",
  severity: "error",
  message: `${item.clause} ПП 1466: ${item.title} — срок ${showDate(
    item.dueDate,
  )}, просрочка ${item.overdueBusinessDays} раб. дн.`,
  hint: `${item.basis}; проверьте дату документа и наличие подтверждающего файла.`,
});

// ─── Итоговая проверка записи ──────────────────────────────────────────────

/**
 * Одна проверка на запись: реестр МСП + сроки ПП 1466.
 *
 * Блокирует приёмку только реестр МСП и только при первом представлении ИНН:
 * просрочка — факт исполнения, её фиксируют и начисляют неустойку, но сведения
 * всё равно принимаются. Приёмка «СМП, которого нет в реестре» наоборот
 * закрывала бы объём привлечения незаконно.
 */
export const smpRecordCheck = (
  record: ContractSmpRecord,
  records: ContractSmpRecord[],
  registry: SmpRegistryEntry[],
  options: SmpCheckOptions = {},
): SmpRecordCheck => {
  const registryCheck = smpRegistryCheck(record, records, registry);
  const issues: SmpCheckIssue[] = [];

  if (registryCheck.applicable) {
    if (
      registryCheck.status === "out_of_registry" ||
      registryCheck.status === "excluded"
    ) {
      issues.push({
        field: "supplierInn",
        code: "registry",
        severity: registryCheck.firstSubmission ? "error" : "warning",
        message: registryCheck.firstSubmission
          ? `${registryCheck.text}: договор не закроет объём привлечения СМП (ч. 6 ст. 30 44-ФЗ).`
          : `${registryCheck.text}: ИНН принимали ранее, проверьте изменение статуса в реестре.`,
        hint:
          "Проверьте ИНН; если субподрядчик не является субъектом МСП/СОНКО — снимите признак «Субъект МСП / СОНКО», иначе объём привлечения будет завышен.",
      });
    } else if (registryCheck.status === "unchecked") {
      // Сверки по этому ИНН ещё не было — значит и «не СМП» сказать нельзя.
      // Приёмку не блокируем: вердикт появится после проверки в реестре, а до
      // неё объём привлечения просто не подтверждён
      issues.push({
        field: "supplierInn",
        code: "registry",
        severity: "warning",
        message: `${registryCheck.text}: договор пока не подтверждает объём привлечения СМП (ч. 6 ст. 30 44-ФЗ).`,
        hint: "Нажмите «Проверить в реестре МСП» — ответ сервиса ФНС по этому ИНН сохранится в справочнике.",
      });
    } else if (registryCheck.status === "unknown") {
      issues.push({
        field: "supplierInn",
        code: "registry",
        severity: "warning",
        message:
          "ИНН субподрядчика не указан: принадлежность к реестру МСП не проверена.",
        hint: "Заполните ИНН — по нему сверяется реестр МСП.",
      });
    }
  }

  const deadlines = smpRecordDeadlines(record, records, options);
  for (const item of deadlines) {
    if (item.status === "overdue") issues.push(deadlineIssue(item));
  }

  const blocking = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const deadline = pickDeadline(deadlines);

  return {
    registry: registryCheck,
    blocking,
    warnings,
    ok: blocking.length === 0,
    acceptanceBlocked: blocking.some(
      (issue) => issue.code === "registry" && issue.field === "supplierInn",
    ),
    deadline,
    deadlineText: deadline ? smpDeadlineText(deadline) : "",
    summary: `блокирующих ${blocking.length} · предупреждений ${warnings.length}`,
  };
};

// ─── Подписи для интерфейса ────────────────────────────────────────────────

export type SmpCheckTone = "ok" | "warning" | "error";

export const smpCheckTone = (check: SmpRecordCheck): SmpCheckTone =>
  !check.ok ? "error" : check.warnings.length > 0 ? "warning" : "ok";

/** Короткая подпись для таблицы сведений. */
export const smpCheckBadge = (check: SmpRecordCheck): string => {
  if (!check.ok) return `ошибок: ${check.blocking.length}`;
  if (check.warnings.length > 0) return `внимание: ${check.warnings.length}`;
  return "проверено";
};

/** Все замечания строкой — для `title` и раскрывающихся списков. */
export const smpCheckIssuesText = (check: SmpRecordCheck): string =>
  [...check.blocking, ...check.warnings]
    .map((issue) => `• ${issue.message}${issue.hint ? ` ${issue.hint}` : ""}`)
    .join("\n");

// ─── Отметки о просрочке для хронологии исполнения ─────────────────────────

export interface SmpDeadlineMark {
  recordId?: string | number;
  ruleCode: string;
  clause: string;
  title: string;
  dueDate: string;
  overdueBusinessDays: number;
}

/**
 * Просроченные сроки по записям: хронология показывает их рядом с событием,
 * иначе «позже срока» видно только в таблице сроков внутри блока СМП.
 */
export const smpOverdueMarks = (
  records: ContractSmpRecord[],
  options: SmpCheckOptions = {},
): SmpDeadlineMark[] =>
  computeSupplierDeadlines(records, options)
    .filter((item) => item.status === "overdue")
    .map((item) => ({
      recordId: item.recordId,
      ruleCode: item.ruleCode,
      clause: item.clause,
      title: item.title,
      dueDate: item.dueDate,
      overdueBusinessDays: item.overdueBusinessDays,
    }));
