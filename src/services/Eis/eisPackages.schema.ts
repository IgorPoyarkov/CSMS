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
 * собирает шлюз: исполнение — из доменного документа (см.
 * `EIS_DOCUMENT_TYPES_WITH_DOMAIN_BUILD`), СМП — пока черновой заглушкой.
 */
export const EIS_DOCUMENT_TYPES_WITH_PAYLOAD: readonly EisDocumentType[] = [
  "Notification",
  "ContractProject",
];

export const isEisDocumentTypeWithPayload = (
  type: EisDocumentType,
): boolean => EIS_DOCUMENT_TYPES_WITH_PAYLOAD.includes(type);

/**
 * Типы, для которых шлюз собирает пакет сам — из доменного документа, по XSD.
 *
 * Это не «пустой payload»: фронт передаёт не XML, а ссылку на документ, а
 * шлюз берёт его из своей базы (`POST /api/acceptances/{id}/eis-package`
 * для приёмки). Так пакет собирается из тех же данных, что подтверждены в
 * системе, и не зависит от того, что успел отрисовать браузер.
 */
export const EIS_DOCUMENT_TYPES_WITH_DOMAIN_BUILD: readonly EisDocumentType[] = [
  "ContractExecution",
];

export const isEisDomainBuildType = (type: EisDocumentType): boolean =>
  EIS_DOCUMENT_TYPES_WITH_DOMAIN_BUILD.includes(type);

/**
 * Типы без доменного маппера в шлюзе: содержимое собирается черновой
 * заглушкой (`isPlaceholderFormat`). Интерфейс обязан это показывать — иначе
 * человек считает, что отправил файл обмена, а отправил заготовку.
 */
export const EIS_DOCUMENT_TYPES_PLACEHOLDER_ONLY: readonly EisDocumentType[] = [
  "SmpAttraction",
];

export const isEisPlaceholderOnlyType = (type: EisDocumentType): boolean =>
  EIS_DOCUMENT_TYPES_PLACEHOLDER_ONLY.includes(type);

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

/**
 * Вложение пакета так, как его вернул шлюз.
 *
 * Поля необязательные: шлюз заполняет их по мере появления (после Б4/Б7 —
 * документ-источник и файлы). Схема не должна падать, если вложение пришло
 * с сокращённым набором: пакет всё равно нужно показать человеку.
 */
export const eisPackageAttachmentSchema = z.object({
  fileName: z.string(),
  description: z.string().nullish().transform((value) => value ?? null),
  fileSize: z.number().nullish().transform((value) => value ?? null),
  fileFingerPrint: z.string().nullish().transform((value) => value ?? null),
  /** Код вида документа из nsiEPDocTypes. */
  docKindCode: z.string().nullish().transform((value) => value ?? null),
  contentId: z.string().nullish().transform((value) => value ?? null),
  url: z.string().nullish().transform((value) => value ?? null),
});

export type EisPackageAttachment = z.infer<typeof eisPackageAttachmentSchema>;

/**
 * Замечание проверки Раздела 2 извещения (вложения), как его видит публикация.
 *
 * `severity` здесь не для красоты: ЕИС отклоняет документ только по ошибкам,
 * предупреждения — то, что она досчитает или стерпит (размер файла, отпечаток,
 * отсутствующий код вида документа). Одна и та же проверка живёт в
 * `noticeAttachmentReadiness` и в интерфейсе извещения.
 */
export const eisNoticeReadinessIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  /** Категория документа Раздела 2 формы извещения. */
  category: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  message: z.string(),
});

export type EisNoticeReadinessIssue = z.infer<
  typeof eisNoticeReadinessIssueSchema
>;

/**
 * Снимок готовности извещения к передаче в ЕИС.
 *
 * Снимок, а не «текущая готовность»: пакет живёт дольше, чем документ, и через
 * неделю уже не объяснить, почему пакет ушёл с неполным Разделом 2. Поэтому
 * момент проверки, документы и замечания передаются в шлюз вместе с XML, а
 * шлюз возвращает их в карточке пакета.
 */
export const eisNoticeReadinessSchema = z.object({
  ok: z.boolean(),
  blocking: z.array(eisNoticeReadinessIssueSchema),
  warnings: z.array(eisNoticeReadinessIssueSchema),
  /** Документы Раздела 2, которые фактически уходят вместе с извещением. */
  attachments: z.array(eisPackageAttachmentSchema),
  checkedAt: z.string(),
  noticeId: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  noticeNumber: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  ikz: z.string(),
});

export type EisNoticeReadiness = z.infer<typeof eisNoticeReadinessSchema>;

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
  /**
   * Проверки шлюза до отправки: XSD, обязательные поля, справочники.
   * От `flkErrors` отличаются источником: это не ответ ЕИС, а отказ шлюза
   * принять документ — исправлять надо у нас, а не в портале.
   */
  validationErrors: z
    .array(flkErrorSchema)
    .nullish()
    .transform((value) => value ?? []),
  /** Вложения, которые ушли вместе с документом. */
  attachments: z
    .array(eisPackageAttachmentSchema)
    .nullish()
    .transform((value) => value ?? []),
  /**
   * Снимок готовности извещения, с которым пакет формировали.
   *
   * `null` — шлюз снимок ещё не возвращает (или пакет не извещения). Поле
   * мягкое намеренно: карточка пакета должна открываться и без него, а
   * проверка не должна зависеть от версии шлюза.
   */
  attachmentReadiness: eisNoticeReadinessSchema
    .nullish()
    .transform((value) => value ?? null),
  /** Реестровый номер сведений об исполнении, который присвоил ЕИС. */
  regNumberExecution: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
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
  /**
   * Документы Раздела 2, приложенные к извещению.
   *
   * Передаются отдельно от XML, чтобы шлюз мог сверить список вложений с
   * документом и вернуть его в карточке пакета как есть, не разбирая XML.
   */
  attachments: z.array(eisPackageAttachmentSchema).optional(),
  /**
   * Снимок готовности извещения: доказательство, что Раздел 2 проверен.
   */
  attachmentReadiness: eisNoticeReadinessSchema.optional(),
  /**
   * Блокирующие замечания Раздела 2 списком строк — поле, которое шлюз уже
   * проверяет: на `Notification` с непустым списком он отвечает 409 и не
   * создаёт пакет.
   *
   * Не заменяет снимок и не выводится из него на сервере: шлюз не разбирает
   * нашу модель извещения, ему нужен плоский список текстов. Поэтому
   * `attachmentBlockingIssues` — страхующая проверка (сервер), а
   * `attachmentReadiness` — подробности для человека (карточка пакета).
   * Пустой массив — «Раздел 2 проверен, блокирующих замечаний нет»; отсутствие
   * поля — «не проверяли», и тогда шлюз пропускает пакет.
   */
  attachmentBlockingIssues: z.array(z.string()).optional(),
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
