import z from "zod";

/**
 * Обращение в ЕИС на получение тестового доступа.
 *
 * Отдельный модуль CSMS: готовим обращение, проверяем настройки, подписываем
 * файл ЭЦП на рабочем месте заказчика. Отдельного личного кабинета разработчика
 * ЕИС нет — обращение отправляется через публичные каналы ЕИС/техподдержку.
 */

export const EIS_TEST_ACCESS_CHANNELS = [
  {
    id: "feedback",
    label: "Форма обратной связи ЕИС",
    value: "https://zakupki.gov.ru/epz/main/public/user-feedback.html",
    kind: "url",
  },
  {
    id: "support-phone-1",
    label: "Техподдержка ЕИС",
    value: "8 800 600-90-89",
    kind: "phone",
  },
  {
    id: "support-phone-2",
    label: "Техподдержка ЕИС (Москва)",
    value: "8 (495) 739-25-83",
    kind: "phone",
  },
  {
    id: "nr-help",
    label: "ГИС «Независимый регистратор»",
    value: "help-nr@zakupki.gov.ru",
    kind: "email",
  },
] as const;

export const EIS_TEST_ACCESS_STATUSES = [
  "draft",
  "prepared",
  "signed",
  "sent",
] as const;

export type EisTestAccessStatus = (typeof EIS_TEST_ACCESS_STATUSES)[number];

export const eisTestAccessStatusLabels: Record<EisTestAccessStatus, string> = {
  draft: "Черновик",
  prepared: "Подготовлено",
  signed: "Подписано ЭП",
  sent: "Отправлено в ЕИС",
};

export const EIS_TEST_ACCESS_CHECKS = [
  {
    id: "inn",
    label: "ИНН организации заполнен",
    hint: "ИНН нужен для идентификации участника/заказчика в ЕИС.",
  },
  {
    id: "org",
    label: "Карточка организации заполнена",
    hint: "Наименование, ОГРН/КПП, адрес и контакты попадут в обращение.",
  },
  {
    id: "certificate",
    label: "Есть действующий сертификат ЭП",
    hint: "Обращение и файлы подписываются квалифицированной ЭП на рабочем месте.",
  },
  {
    id: "system_description",
    label: "Описание системы подготовлено",
    hint: "Краткое описание CSMS и цели интеграции включается в обращение.",
  },
  {
    id: "eis_registration",
    label: "Организация зарегистрирована в ЕИС",
    hint: "Реестровый номер/учётная запись ЕИС ускоряют обработку обращения.",
  },
] as const;

export type EisTestAccessCheckId = (typeof EIS_TEST_ACCESS_CHECKS)[number]["id"];

export const EisTestAccessRequestSchema = z.object({
  id: z.string(),
  status: z.enum(EIS_TEST_ACCESS_STATUSES).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),

  // Организация как подрядчик/участник интеграции
  contractorName: z.string().trim().min(1, "Укажите наименование организации"),
  contractorShortName: z.string().optional().or(z.literal("")),
  contractorInn: z
    .string()
    .trim()
    .regex(/^(\d{10}|\d{12})$/, "ИНН должен содержать 10 или 12 цифр"),
  contractorKpp: z.string().optional().or(z.literal("")),
  contractorOgrn: z.string().optional().or(z.literal("")),
  contractorAddress: z.string().optional().or(z.literal("")),
  contractorEmail: z.string().optional().or(z.literal("")),
  contractorPhone: z.string().optional().or(z.literal("")),

  // Контактное лицо
  contactName: z.string().trim().min(1, "Укажите контактное лицо"),
  contactPosition: z.string().optional().or(z.literal("")),
  contactEmail: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),

  // Данные ЕИС/интеграции
  eisRegistryNumber: z.string().optional().or(z.literal("")),
  eisSection: z.string().optional().or(z.literal("")),
  systemName: z.string().trim().min(1, "Укажите название системы"),
  // Старые черновики сохранялись без описания: поле необязательно при чтении,
  // новая форма всегда записывает непустое значение.
  systemDescription: z.string().trim().default(""),
  purpose: z.string().trim().min(1, "Укажите цель обращения"),
  requestText: z.string().trim().min(1, "Текст обращения не должен быть пустым"),

  // Чеклист
  checkInn: z.boolean().default(false),
  checkOrg: z.boolean().default(false),
  checkCertificate: z.boolean().default(false),
  checkSystemDescription: z.boolean().default(false),
  checkEisRegistration: z.boolean().default(false),
  // Старые поля оставлены для совместимости с сохранёнными черновиками.
  checkFnsApi: z.boolean().optional().default(false),
  fnsApiComment: z.string().optional().or(z.literal("")),

  // Подпись
  signedAt: z.string().optional().or(z.literal("")),
  signedBy: z.string().optional().or(z.literal("")),
  signatureFileName: z.string().optional().or(z.literal("")),
});

export type EisTestAccessRequest = z.infer<typeof EisTestAccessRequestSchema>;
export type EisTestAccessRequestInput = z.input<typeof EisTestAccessRequestSchema>;

export const EisTestAccessRequestListSchema = z.array(EisTestAccessRequestSchema);

export const createEmptyEisTestAccessRequest = (
  now = new Date().toISOString(),
): EisTestAccessRequest => ({
  id: `eis-test-access-${Date.now()}`,
  status: "draft",
  createdAt: now,
  updatedAt: now,
  contractorName: "",
  contractorShortName: "",
  contractorInn: "",
  contractorKpp: "",
  contractorOgrn: "",
  contractorAddress: "",
  contractorEmail: "",
  contractorPhone: "",
  contactName: "",
  contactPosition: "",
  contactEmail: "",
  contactPhone: "",
  eisRegistryNumber: "",
  eisSection: "44-ФЗ / тестовый контур",
  systemName: "CSMS — Система управления контрактной службой заказчика",
  systemDescription:
    "CSMS (Система управления контрактной службой заказчика) — внутренняя система организации для планирования закупок, формирования извещений и документов, ведения контрактов, контроля исполнения, работы с ЭП и подготовки обмена с ЕИС. Система используется заказчиком для автоматизации работы контрактной службы и интеграции с внешними государственными информационными системами.",
  purpose:
    "Получение тестового доступа к ЕИС для проверки обмена сведениями и интеграции.",
  requestText: "",
  checkInn: false,
  checkOrg: false,
  checkCertificate: false,
  checkSystemDescription: true,
  checkEisRegistration: false,
  checkFnsApi: false,
  fnsApiComment: "",
  signedAt: "",
  signedBy: "",
  signatureFileName: "",
});

export const buildEisTestAccessRequestText = (
  value: EisTestAccessRequest,
): string => {
  const date = new Date().toLocaleDateString("ru-RU");
  const lines = [
    `Дата: ${date}`,
    "",
    "В техническую поддержку Единой информационной системы в сфере закупок",
    "",
    "Обращение на предоставление тестового доступа к ЕИС",
    "",
    `Организация/подрядчик: ${value.contractorName || "—"}`,
    value.contractorShortName ? `Краткое наименование: ${value.contractorShortName}` : null,
    `ИНН: ${value.contractorInn || "—"}`,
    value.contractorKpp ? `КПП: ${value.contractorKpp}` : null,
    value.contractorOgrn ? `ОГРН: ${value.contractorOgrn}` : null,
    value.contractorAddress ? `Адрес: ${value.contractorAddress}` : null,
    value.eisRegistryNumber ? `Реестровый номер в ЕИС: ${value.eisRegistryNumber}` : null,
    value.eisSection ? `Раздел/контур ЕИС: ${value.eisSection}` : null,
    "",
    "Контактное лицо:",
    `ФИО: ${value.contactName || "—"}`,
    value.contactPosition ? `Должность: ${value.contactPosition}` : null,
    `Email: ${value.contactEmail || value.contractorEmail || "—"}`,
    `Телефон: ${value.contactPhone || value.contractorPhone || "—"}`,
    "",
    `Система: ${value.systemName || "—"}`,
    "Краткое описание системы:",
    value.systemDescription?.trim() || "—",
    "",
    `Цель обращения: ${value.purpose || "—"}`,
    "",
    "Просьба:",
    "1. Предоставить тестовый доступ к ЕИС/тестовому контуру для проверки интеграции.",
    "2. Сообщить требования к учётным данным, сертификатам, сетевым настройкам и регламенту обмена.",
    "3. Указать канал и формат передачи технических параметров доступа.",
    "",
    "Подготовлено в CSMS.",
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
};
