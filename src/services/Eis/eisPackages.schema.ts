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
  "Notification",
  "ContractProject",
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
  Notification: "Извещение о закупке",
  ContractProject: "Проект контракта",
  SmpAttraction: "Привлечение СМП",
  ContractExecution: "Исполнение контракта",
};

/**
 * Типы, которые собираются из документов CSMS (извещение и проект контракта)
 * и потому могут передать в шлюз готовый XML (payloadXml). Остальные типы
 * шлюз собирает заглушкой.
 */
export const EIS_DOCUMENT_TYPES_WITH_PAYLOAD: readonly EisDocumentType[] = [
  "Notification",
  "ContractProject",
];

export const isEisDocumentTypeWithPayload = (
  type: EisDocumentType,
): boolean => EIS_DOCUMENT_TYPES_WITH_PAYLOAD.includes(type);

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

/**
 * Вид документа CSMS, из которого собран `payloadXml`.
 *
 * Шлюзу это нужно, чтобы после Б4 показать в пакете ссылку на источник и
 * пересобрать документ без человека. Пока (до Б4) поле просто уходит в теле
 * запроса и шлюзом игнорируется.
 */
export const EIS_PACKAGE_SOURCE_KINDS = [
  "Notice",
  "ContractProject",
  "Contract",
  "SmpReport",
  "ContractExecution",
] as const;

export type EisPackageSourceKind = (typeof EIS_PACKAGE_SOURCE_KINDS)[number];

export const eisPackageSourceSchema = z.object({
  documentKind: z.enum(EIS_PACKAGE_SOURCE_KINDS),
  /** Идентификатор документа в CSMS (json-server id или GUID). */
  documentId: z.string().min(1),
  /** Номер документа ЕИС, если он уже присвоен. */
  documentNumber: z.string().optional(),
});

export type EisPackageSource = z.infer<typeof eisPackageSourceSchema>;

/**
 * Снимок заказчика на момент формирования пакета.
 *
 * Пакет живёт годами, а карточку организации за это время правят. Снимок
 * фиксирует, от чьего имени подписывался документ, и позволяет объяснить
 * расхождение с текущей карточкой.
 */
export const eisPackageCustomerSnapshotSchema = z.object({
  fullName: z.string().optional(),
  shortName: z.string().optional(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
  okopf: z.string().optional(),
  okfs: z.string().optional(),
  oktmo: z.string().optional(),
  oktmoPpo: z.string().optional(),
  /** Код по СПЗ (реестровый номер заказчика в ЕИС). */
  regNumber: z.string().optional(),
});

export type EisPackageCustomerSnapshot = z.infer<
  typeof eisPackageCustomerSnapshotSchema
>;

/**
 * Тело запроса на создание пакета. Проверяется перед отправкой: пустой
 * `documentId` или незнакомый вид документа должны падать здесь, а не
 * превращаться в 400 от шлюза.
 */
export const createEisPackageInputSchema = z.object({
  documentType: z.enum(EIS_DOCUMENT_TYPES),
  contractEisNumber: z.string(),
  ikz: z.string(),
  payloadXml: z.string().optional(),
  source: eisPackageSourceSchema.optional(),
  customer: eisPackageCustomerSnapshotSchema.optional(),
});

/**
 * Проверки идентификаторов живут отдельно: те же правила нужны карточке
 * контракта, поэтому здесь только реэкспорт, без второй копии регулярки.
 */
export {
  EIS_CONTRACT_NUMBER_LENGTH,
  IKZ_LENGTH,
  digitsOnly,
  isEisContractNumber,
  isIkz,
} from "./eisIdentifiers";
