import z from "zod";

/**
 * Пакеты сведений для ЕИС — контракт с отдельным сервисом (csms-api).
 *
 * Шлюз живёт в другом репозитории, поэтому ответы проверяются схемой: если
 * контракт разъедется (переименовали поле, сменили статус), фронт упадёт
 * здесь с понятной ошибкой, а не покажет «undefined» в интерфейсе. Это тот же
 * приём, что и для json-server, но здесь он важнее: правки делает другой
 * проект.
 */

export const EIS_DOCUMENT_TYPES = [
  "SmpAttraction",
  "ContractExecution",
] as const;

export type EisDocumentType = (typeof EIS_DOCUMENT_TYPES)[number];

export const EIS_PACKAGE_STATUSES = [
  "Draft",
  "Signing",
  "Signed",
  "SentToEis",
  "FlkChecking",
  "AcceptedInLk",
  "RejectedByFlk",
  "SendFailed",
] as const;

export type EisPackageStatus = (typeof EIS_PACKAGE_STATUSES)[number];

export const eisDocumentTypeLabels: Record<EisDocumentType, string> = {
  SmpAttraction: "Привлечение СМП",
  ContractExecution: "Исполнение контракта",
};

export const eisPackageStatusLabels: Record<EisPackageStatus, string> = {
  Draft: "Черновик",
  Signing: "Подписание",
  Signed: "Подписан",
  SentToEis: "Отправлен в ЕИС",
  FlkChecking: "Проверка ФЛК",
  AcceptedInLk: "Принят ЕИС",
  RejectedByFlk: "Отклонён ФЛК",
  SendFailed: "Ошибка отправки",
};

/**
 * Цвет статуса. Не косметика: «принят» и «отправлен» легко перепутать
 * глазами, а разница между ними — юридическая.
 */
export type EisStatusTone = "ok" | "warn" | "danger" | "progress" | "muted";

export const eisPackageStatusTones: Record<EisPackageStatus, EisStatusTone> = {
  Draft: "muted",
  Signing: "progress",
  Signed: "progress",
  SentToEis: "progress",
  FlkChecking: "progress",
  AcceptedInLk: "ok",
  RejectedByFlk: "danger",
  SendFailed: "danger",
};

/** Пакет ждёт ответа ЕИС: по таким имеет смысл опрашивать статус самим. */
export const isStatusPending = (status: EisPackageStatus): boolean =>
  status === "SentToEis" || status === "FlkChecking";

export const flkErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
});

export type FlkError = z.infer<typeof flkErrorSchema>;

export const eisPackageEventSchema = z.object({
  at: z.string(),
  from: z.enum(EIS_PACKAGE_STATUSES),
  to: z.enum(EIS_PACKAGE_STATUSES),
  comment: z.string(),
});

export type EisPackageEvent = z.infer<typeof eisPackageEventSchema>;

export const eisPackageSchema = z.object({
  id: z.string(),
  documentType: z.enum(EIS_DOCUMENT_TYPES),
  contractEisNumber: z.string(),
  ikz: z.string(),
  status: z.enum(EIS_PACKAGE_STATUSES),
  payloadXml: z.string(),
  payloadSha256: z.string(),
  payloadSchemaVersion: z.string(),
  /** true — содержимое собрано заглушкой, это не файл обмена. */
  isPlaceholderFormat: z.boolean(),
  signatureBase64: z.string().nullable(),
  signerThumbprint: z.string().nullable(),
  signedAt: z.string().nullable(),
  eisGuid: z.string().nullable(),
  lastError: z.string().nullable(),
  flkErrors: z.array(flkErrorSchema),
  history: z.array(eisPackageEventSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EisPackage = z.infer<typeof eisPackageSchema>;

export const signatureTaskSchema = z.object({
  payloadXml: z.string(),
  payloadSha256: z.string(),
  schemaVersion: z.string(),
  isPlaceholder: z.boolean(),
});

export type SignatureTask = z.infer<typeof signatureTaskSchema>;

/** Реестровый номер контракта в ЕИС — 19 цифр, как проверяет шлюз. */
export const EIS_CONTRACT_NUMBER_LENGTH = 19;

export const isEisContractNumber = (value: string): boolean =>
  new RegExp(`^\\d{${EIS_CONTRACT_NUMBER_LENGTH}}$`).test(value.trim());
