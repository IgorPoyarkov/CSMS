import z from "zod";

/**
 * Электронная подпись заказчика: учёт сертификатов и журнал подписаний.
 *
 * Позиция по Tasks 9, п. 1: принимать ключевые контейнеры заказчика «к себе»
 * нельзя — квалифицированный сертификат выдан конкретному физическому лицу,
 * а ключ по ст. 10 63-ФЗ обязан храниться в тайне и не передаваться третьим
 * лицам. Подпись остаётся у заказчика и ставится в нашем интерфейсе (крипто-
 * графический плагин на его рабочем месте), а мы ведём журнал: кто, когда,
 * каким сертификатом и над каким документом. Журнал — аудит и удобство,
 * юридический факт подтверждает сама подпись, лог её не заменяет.
 *
 * Проверка «сертификат наш или не наш» идёт по ИНН организации: в subject
 * квалифицированной ЭП должностного лица заказчик обязан увидеть ИННЮЛ
 * (реквизит организации) и СНИЛС подписанта. Сертификат с чужим ИНН к
 * подписанию документов этого заказчика не допускается.
 */

// ─── Сертификат ─────────────────────────────────────────────────────────────

// Откуда взялись атрибуты: из плагина на рабочем месте заказчика, внесены
// вручную (демо без плагина) или прочитаны из учётной записи организации
export const EDS_CERTIFICATE_SOURCES = [
  "plugin",
  "manual",
  "imported",
] as const;

export type EdsCertificateSource = (typeof EDS_CERTIFICATE_SOURCES)[number];

export const edsCertificateSourceLabels: Record<EdsCertificateSource, string> =
  {
    plugin: "КриптоПро ЭЦП Browser plug-in",
    manual: "Внесено вручную",
    imported: "Импортировано из карточки организации",
  };

// Алгоритмы подписи по 63-ФЗ: у заказчика должен быть ГОСТ Р 34.10-2012
export const EDS_SIGNATURE_ALGORITHMS = [
  "ГОСТ Р 34.10-2012 256",
  "ГОСТ Р 34.10-2012 512",
] as const;

export type EdsSignatureAlgorithm = (typeof EDS_SIGNATURE_ALGORITHMS)[number];

const optionalText = (max = 300) =>
  z.string().max(max).optional().or(z.literal(""));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ожидается дата в формате ГГГГ-ММ-ДД")
  .optional()
  .or(z.literal(""));

const inn = z
  .string()
  .refine((value) => value === "" || /^(\d{10}|\d{12})$/.test(value), {
    message: "ИНН должен содержать 10 (юрлицо) или 12 (ИП) цифр",
  })
  .optional();

export const EdsCertificateSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),

  // Человек, которому выдан сертификат: ЭП всегда принадлежит физическому лицу
  ownerName: z.string().trim().min(3, "Укажите владельца сертификата"),
  ownerPosition: optionalText(150),
  ownerSnils: z
    .string()
    .refine(
      (value) => value === "" || /^\d{11}$/.test(value),
      "СНИЛС — 11 цифр",
    )
    .optional(),

  // Реквизиты организации из subject сертификата (ИННЮЛ) — по нему сверяем,
  // что подпись поставлена от имени этого заказчика
  inn,
  ogrn: z
    .string()
    .refine(
      (value) => value === "" || /^(\d{13}|\d{15})$/.test(value),
      "ОГРН — 13 или 15 цифр",
    )
    .optional(),

  subject: optionalText(500),
  issuer: optionalText(500),
  serialNumber: optionalText(64),
  fingerprint: optionalText(128),
  signatureAlgorithm: optionalText(40),

  validFrom: isoDate,
  validTo: isoDate,

  // Заблокированный или отозванный сертификат не принимает участие в подписи,
  // но остаётся в журнале: проверка спрашивает историю, а не только текущие
  isRevoked: z.boolean().default(false),
  revokeDate: isoDate,
  // МЧД: подпись по доверенности, а не руководителя
  isProxy: z.boolean().default(false),
  proxyNumber: optionalText(100),

  source: z.enum(EDS_CERTIFICATE_SOURCES).default("manual"),
  note: optionalText(500),
});

export type EdsCertificate = z.infer<typeof EdsCertificateSchema>;
export const EdsCertificateListSchema = z.array(EdsCertificateSchema);

// ─── Журнал подписаний ──────────────────────────────────────────────────────

export const SIGNATURE_EVENT_ACTIONS = [
  "smp_supplier_confirm",
  "smp_customer_confirm",
  "smp_reject",
  "smp_eis_export",
  "penalty_accrue",
  "nmck_confirm",
  "eds_login",
  "journal_pdf_export",
] as const;

export type SignatureEventAction = (typeof SIGNATURE_EVENT_ACTIONS)[number];

export const signatureEventActionLabels: Record<SignatureEventAction, string> =
  {
    smp_supplier_confirm: "Подтверждение достоверности сведений (подрядчик)",
    smp_customer_confirm: "Принятие сведений и подтверждение (заказчик)",
    smp_reject: "Отклонение сведений",
    smp_eis_export: "Выгрузка сведений в ЕИС",
    penalty_accrue: "Начисление неустойки подрядчику",
    nmck_confirm: "Подписание обоснования НМЦК",
    eds_login: "Вход в систему по ЭП",
    journal_pdf_export: "Выгрузка подписанного PDF-отчёта журнала ЭП",
  };

export const SIGNATURE_EVENT_RESULTS = [
  "signed",
  "rejected_certificate",
  "failed",
] as const;

export type SignatureEventResult = (typeof SIGNATURE_EVENT_RESULTS)[number];

export const signatureEventResultLabels: Record<SignatureEventResult, string> =
  {
    signed: "Подписано",
    rejected_certificate: "Отказано: сертификат не принадлежит заказчику",
    failed: "Ошибка подписания",
  };

export const SIGNATURE_EVENT_ENTITY_TYPES = [
  "contractSmpRecord",
  "contract",
  "contractPenalty",
  "purchaseNote",
  "nmck",
  "session",
  "edsJournalReport",
] as const;

export type SignatureEventEntityType =
  (typeof SIGNATURE_EVENT_ENTITY_TYPES)[number];

export const signatureEventEntityTypeLabels: Record<
  SignatureEventEntityType,
  string
> = {
  contractSmpRecord: "Сведения о привлечении СМП",
  contract: "Контракт",
  contractPenalty: "Неустойка",
  purchaseNote: "Служебная записка (потребность)",
  nmck: "Обоснование НМЦК",
  session: "Сеанс входа",
  edsJournalReport: "Отчёт журнала ЭП для контролирующих органов",
};

export const SignatureEventSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  contractId: z.union([z.string(), z.number()]).optional(),

  // Кто нажал «Подписать» в нашем интерфейсе
  userId: z.union([z.string(), z.number()]).optional(),
  userLabel: optionalText(200),

  action: z.enum(SIGNATURE_EVENT_ACTIONS),
  entityType: z.enum(SIGNATURE_EVENT_ENTITY_TYPES),
  entityId: z.union([z.string(), z.number()]),
  // Человекочитаемое название документа: «Договор №5 от 15.01.2026»
  documentLabel: z.string().trim().min(1, "Укажите подписываемый документ"),

  // Снимок сертификата на момент подписания. Он сохраняется копией, а не
  // ссылкой: сертификат отзывают, продлевают, меняют владельца — а в журнале
  // должно остаться, чем именно расписались
  certificateId: z.union([z.string(), z.number()]).optional(),
  certificateOwner: optionalText(200),
  certificateInn: inn,
  certificateSerial: optionalText(64),
  certificateFingerprint: optionalText(128),
  certificateAlgorithm: optionalText(40),
  certificateValidTo: isoDate,
  // Результат сверки ИНН сертификата с ИНН организации
  innMatched: z.boolean().default(false),
  certificateSource: z.enum(EDS_CERTIFICATE_SOURCES).default("manual"),

  result: z.enum(SIGNATURE_EVENT_RESULTS).default("signed"),
  comment: optionalText(1000),
  createdAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
      "Ожидается дата и время",
    ),
});

export type SignatureEvent = z.infer<typeof SignatureEventSchema>;
export type SignatureEventInput = z.input<typeof SignatureEventSchema>;
export const SignatureEventListSchema = z.array(SignatureEventSchema);

// ─── Помощники ──────────────────────────────────────────────────────────────

export const emptyEdsCertificate = (): EdsCertificate => ({
  organizationId: "",
  ownerName: "",
  ownerPosition: "",
  ownerSnils: "",
  inn: "",
  ogrn: "",
  subject: "",
  issuer: "",
  serialNumber: "",
  fingerprint: "",
  signatureAlgorithm: "ГОСТ Р 34.10-2012 256",
  validFrom: "",
  validTo: "",
  isRevoked: false,
  isProxy: false,
  source: "manual",
  note: "",
});

// Дата «2026-11-16» → «16.11.2026» без зависимости от локали браузера
const toRuDate = (isoDate: string | undefined): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
};

export const formatCertificatePeriod = (
  certificate: EdsCertificate,
): string => {
  const from = toRuDate(certificate.validFrom);
  const to = toRuDate(certificate.validTo);
  if (!from && !to) return "срок не указан";
  return `${from || "?"} — ${to || "?"}`;
};

// Подпись сертификата для списка и для журнала: «Фамилия И.О., срез 4629...»
export const formatCertificateLabel = (certificate: EdsCertificate): string => {
  const serial = certificate.serialNumber
    ? `${certificate.serialNumber.slice(0, 8)}…`
    : "без номера";
  return `${certificate.ownerName}, срез ${serial}`;
};

export const isCertificateExpiredOn = (
  certificate: EdsCertificate,
  date: string,
): boolean => Boolean(certificate.validTo && date > certificate.validTo);

export const isCertificateUsableOn = (
  certificate: EdsCertificate,
  date: string,
): boolean =>
  !certificate.isRevoked && !isCertificateExpiredOn(certificate, date);

// Статус сертификата для интерфейса: зелёный «действует», жёлтый «истекает»,
// красный «просрочен или отозван». Истекающий выделен заранее: замена
// сертификата занимает дни, а подписывать нечем будет уже завтра
export const EDS_CERTIFICATE_STATES = [
  "active",
  "expiring",
  "expired",
  "revoked",
] as const;

export type EdsCertificateState = (typeof EDS_CERTIFICATE_STATES)[number];

export const edsCertificateStateLabels: Record<EdsCertificateState, string> = {
  active: "Действует",
  expiring: "Истекает в ближайшие 60 дней",
  expired: "Просрочен",
  revoked: "Отозван",
};

export const certificateStateOn = (
  certificate: EdsCertificate,
  today: string,
): EdsCertificateState => {
  if (certificate.isRevoked) return "revoked";
  if (isCertificateExpiredOn(certificate, today)) return "expired";

  const warnDate = new Date(`${today}T00:00:00`);
  warnDate.setDate(warnDate.getDate() + 60);
  const warnIso = warnDate.toISOString().slice(0, 10);
  if (certificate.validTo && certificate.validTo <= warnIso) return "expiring";

  return "active";
};

// Сертификат принадлежит организации, если ИНН из subject совпал с ИНН
// заказчика. Для ИП и физлиц совпадение не ищем: у них в subject нет ИННЮЛ,
// и право подписи подтверждается МЧД (isProxy)
export const certificateBelongsToOrganization = (
  certificate: EdsCertificate,
  organizationInn: string | undefined,
): boolean =>
  Boolean(organizationInn) &&
  Boolean(certificate.inn) &&
  certificate.inn === organizationInn;

// Извлечение ИННЮЛ и СНИЛС из subject вида
// «CN=Иванов Иван Иванович, INNЮЛ=4629040439, SNILS=112-233-145, O=ОКУ ...».
// Разные УЦ пишут реквизиты по-разному — кириллицей, латиницей и в смеси
// («INNЮЛ»), а СНИЛС то с дефисами, то без — поэтому допускаем оба написания.
export const extractInnFromSubject = (subject: string): string => {
  const match = subject.match(
    /(?:ИHH|ИНН|INN)(?:ЮЛ|ФЛ|YL|FL)?\s*[:=]\s*(\d{10}|\d{12})/i,
  );
  return match ? match[1] : "";
};

export const extractSnilsFromSubject = (subject: string): string => {
  const match = subject.match(/(?:СНИЛС|SNILS)\s*[:=]\s*([\d-]{11,15})/i);
  return match ? match[1].replace(/\D/g, "") : "";
};

export const extractNameFromSubject = (subject: string): string => {
  const match = subject.match(/(?:CN|ФИО)\s*[:=]\s*([^,]+)/i);
  return match ? match[1].trim() : "";
};

// ─── Идентификация человека по сертификату ───────────────────────────────────

// У работника в штатном расписании СНИЛС не хранится, поэтому связка
// «сертификат → человек» строится по ФИО из subject и ИНН организации.
// ФИО приводится к набору токенов: регистр, «ё»→«е», точки и дефисы в
// написании отчества роли не играют («И.О.» и «Игоревна» сверяются отдельно).
const personTokens = (value: string): string[] =>
  (value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^a-zа-я]+/i)
    .filter(Boolean);

// Фамилия совпадает только целиком, имя и отчество допускают инициал:
// в subject квалифицированного сертификата встречается и
// «Пояркова София Игоревна», и «Пояркова С. И.»
const tokenMatches = (tokens: string[], word: string, allowInitial: boolean) =>
  tokens.some(
    (token) =>
      token === word ||
      (allowInitial && token.length === 1 && word.startsWith(token)),
  );

export const personNamesMatch = (
  subjectName: string,
  human: {
    surname?: string;
    name?: string;
    patronymic?: string;
  },
): boolean => {
  const tokens = personTokens(subjectName);
  if (tokens.length === 0) return false;

  const surname = (human.surname || "").toLowerCase().replace(/ё/g, "е").trim();
  const name = (human.name || "").toLowerCase().replace(/ё/g, "е").trim();
  const patronymic = (human.patronymic || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim();

  if (!surname || !name) return false;
  if (!tokenMatches(tokens, surname, false)) return false;
  if (!tokenMatches(tokens, name, true)) return false;

  // Отчество в сертификате указано — сверяем: тёзки с разными отчествами
  // в штатке встречаются
  if (patronymic && tokens.length >= 3) {
    return tokenMatches(tokens, patronymic, true);
  }

  return true;
};

// Ключ сертификата для дедупликации: один и тот же контейнер плагин отдаёт
// живьём, а реестр — записью с атрибутами, в интерфейсе он должен быть один раз
export const certificateIdentityKey = (certificate: EdsCertificate): string =>
  certificate.serialNumber
    ? `serial:${certificate.serialNumber.toUpperCase()}`
    : `id:${String(certificate.id ?? certificate.ownerName)}`;

/**
 * Живые сертификаты плагина ставим первыми, затем зарегистрированные за
 * организацией; совпадающие по серийнику не дублируются.
 */
export const mergeCertificateLists = (
  pluginCertificates: EdsCertificate[],
  registeredCertificates: EdsCertificate[],
): EdsCertificate[] => {
  const seen = new Set<string>();
  const merged: EdsCertificate[] = [];

  for (const certificate of [
    ...pluginCertificates,
    ...registeredCertificates,
  ]) {
    const key = certificateIdentityKey(certificate);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(certificate);
  }

  return merged;
};
