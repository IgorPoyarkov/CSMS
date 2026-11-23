import { z } from "zod";
import { isContestPlacingWay } from "../Okpd2Ref/auctionListControl";
import type { ObjectDescription } from "../ObjectDescription/objectDescription.schema";
import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";

/**
 * Документы закупки как составная часть извещения (Раздел 2 формы извещения,
 * п. 8 Положения, утв. ПП РФ от 27.01.2022 N 60).
 *
 * Модель выросла из прежнего `AttachedDocItem` (id/category/fileName/
 * description): все новые поля необязательны, поэтому старые записи в PG и
 * старые черновики форм читаются без миграции. Отсутствующие статус и
 * источник восстанавливаются в `normalizeNoticeAttachment`.
 *
 * Документы рождаются на этапе служебной записки (ООЗ и обоснование НМЦК
 * утверждаются там же), а проект контракта, порядок оценки и состав заявок
 * можно «подвесить» до публикации извещения.
 */

// ─── Категории ───────────────────────────────────────────────────────────────

export const NOTICE_ATTACHMENT_CATEGORIES = [
  {
    id: "object_description",
    title: "Описание объекта закупки (ст. 33 Закона № 44-ФЗ)",
    stage: "purchase_note",
    requiredForPublish: true,
    canSuspend: false,
    hint: "П. 1 Раздела 2 формы извещения: описание объекта закупки по ст. 33 Закона № 44-ФЗ. Утверждается на этапе служебной записки.",
  },
  {
    id: "nmck_justification",
    title: "Обоснование начальной (максимальной) цены контракта",
    stage: "purchase_note",
    requiredForPublish: true,
    canSuspend: false,
    hint: "П. 2 Раздела 2 формы извещения: обоснование НМЦК по ст. 22 Закона № 44-ФЗ. Утверждается на этапе служебной записки.",
  },
  {
    id: "application_requirements",
    title:
      "Требования к содержанию, составу заявки на участие в закупке и инструкция по её заполнению",
    stage: "notice",
    requiredForPublish: true,
    canSuspend: true,
    hint: "П. 3 Раздела 2 формы извещения: требования к содержанию и составу заявки и инструкция по её заполнению.",
  },
  {
    id: "evaluation_order",
    title: "Порядок рассмотрения и оценки заявок на участие в конкурсах",
    stage: "notice",
    requiredForPublish: false,
    canSuspend: true,
    hint: "П. 4 Раздела 2 формы извещения: порядок рассмотрения и оценки заявок. Обязателен для конкурса.",
  },
  {
    id: "contract_project",
    title: "Проект контракта",
    stage: "notice",
    requiredForPublish: true,
    canSuspend: true,
    hint: "П. 5 Раздела 2 формы извещения: проект контракта (формируется в модуле «Проект контракта»).",
  },
  {
    id: "additional_requirements",
    title:
      "Перечень дополнительных требований к извещению, участникам закупок, содержанию заявок",
    stage: "notice",
    requiredForPublish: false,
    canSuspend: true,
    hint: "П. 6 Раздела 2 формы извещения: перечень дополнительных требований (при наличии).",
  },
  {
    id: "additional_docs",
    title: "Дополнительная информация и документы",
    stage: "notice",
    requiredForPublish: false,
    canSuspend: true,
  },
] as const;

export type NoticeAttachmentCategory =
  (typeof NOTICE_ATTACHMENT_CATEGORIES)[number]["id"];

export const NOTICE_ATTACHMENT_CATEGORY_IDS = NOTICE_ATTACHMENT_CATEGORIES.map(
  (item) => item.id,
) as [NoticeAttachmentCategory, ...NoticeAttachmentCategory[]];

export interface NoticeAttachmentCategoryMeta {
  id: NoticeAttachmentCategory;
  title: string;
  stage: "purchase_note" | "notice";
  requiredForPublish: boolean;
  canSuspend: boolean;
  hint?: string;
}

export const noticeAttachmentCategoryMeta = (
  category: NoticeAttachmentCategory,
): NoticeAttachmentCategoryMeta =>
  NOTICE_ATTACHMENT_CATEGORIES.find(
    (item) => item.id === category,
  ) as NoticeAttachmentCategoryMeta;

// ─── Статусы ─────────────────────────────────────────────────────────────────

export const NOTICE_ATTACHMENT_STATUSES = [
  // Черновик: файл выбран, но ещё не утверждён.
  "draft",
  // Утверждён на своём этапе (например, ООЗ и НМЦК в служебной записке).
  "approved",
  // Приложен к извещению и готов к публикации.
  "attached",
  // Намеренно отложен до публикации — допустим только там, где canSuspend.
  "suspended_before_publish",
  // Ушёл в опубликованное извещение.
  "published",
] as const;

export type NoticeAttachmentStatus =
  (typeof NOTICE_ATTACHMENT_STATUSES)[number];

export const NOTICE_ATTACHMENT_STATUS_LABELS: Record<
  NoticeAttachmentStatus,
  string
> = {
  draft: "Черновик",
  approved: "Утверждён",
  attached: "Приложен",
  suspended_before_publish: "Отложен до публикации",
  published: "Опубликован",
};

export type NoticeAttachmentTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export const NOTICE_ATTACHMENT_STATUS_TONES: Record<
  NoticeAttachmentStatus,
  NoticeAttachmentTone
> = {
  draft: "neutral",
  approved: "success",
  attached: "info",
  suspended_before_publish: "warning",
  published: "success",
};

export const noticeAttachmentStatusMeta = (status?: string) => {
  const value =
    (status as NoticeAttachmentStatus) in NOTICE_ATTACHMENT_STATUS_LABELS
      ? (status as NoticeAttachmentStatus)
      : "attached";

  return {
    status: value,
    label: NOTICE_ATTACHMENT_STATUS_LABELS[value],
    tone: NOTICE_ATTACHMENT_STATUS_TONES[value],
  };
};

// ─── Источник документа ──────────────────────────────────────────────────────

export const NOTICE_ATTACHMENT_SOURCE_KINDS = [
  "manual",
  "purchase_note",
  "object_description",
  "nmck",
  "contract_project",
  "procurement_documents",
  "external",
] as const;

export type NoticeAttachmentSourceKind =
  (typeof NOTICE_ATTACHMENT_SOURCE_KINDS)[number];

export const NOTICE_ATTACHMENT_SOURCE_LABELS: Record<
  NoticeAttachmentSourceKind,
  string
> = {
  manual: "Загружен вручную",
  purchase_note: "Из служебной записки",
  object_description: "Из ООЗ",
  nmck: "Из обоснования НМЦК",
  contract_project: "Из проекта контракта",
  procurement_documents: "Сформирован в системе",
  external: "Внешний источник",
};

// ─── Схема ───────────────────────────────────────────────────────────────────

const idLike = z.union([z.string(), z.number()]);
const isoLike = z.string().optional();

/**
 * Контракт NoticeAttachment.
 *
 * Совместимость: `id`, `category`, `fileName` обязательны (как в прежней
 * модели), `description` допускает отсутствие — старые записи без описания
 * нормализуются в пустую строку.
 */
export const NoticeAttachmentSchema = z.object({
  id: z.string(),
  // Куда привязан документ: извещение, служебная записка, закупка
  noticeId: idLike.nullable().optional(),
  purchaseNoteId: idLike.nullable().optional(),
  procurementId: idLike.nullable().optional(),

  category: z.enum(NOTICE_ATTACHMENT_CATEGORY_IDS),
  sourceKind: z.enum(NOTICE_ATTACHMENT_SOURCE_KINDS).optional(),
  sourceId: idLike.nullable().optional(),
  sourceVersion: z.string().optional(),

  status: z.enum(NOTICE_ATTACHMENT_STATUSES).optional(),

  fileName: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().nonnegative().optional(),
  // Контроль версии содержимого: sha256 или облегчённый отпечаток
  sha256: z.string().optional(),
  fingerprint: z.string().optional(),
  // Ссылка на хранилище (если файл лежит не в БД) и публичный URL
  storageRef: z.string().optional(),
  url: z.string().optional(),

  approvedAt: isoLike,
  attachedAt: isoLike,
  uploadedBy: z.string().optional(),
  // Обязательность для публикации: по умолчанию — из категории
  isRequiredForPublish: z.boolean().optional(),
});

export type NoticeAttachment = z.infer<typeof NoticeAttachmentSchema>;
export type NoticeAttachmentInput = z.input<typeof NoticeAttachmentSchema>;
export const NoticeAttachmentListSchema = z.array(NoticeAttachmentSchema);

// ─── Нормализация и обратная совместимость ───────────────────────────────────

let attachmentSequence = 0;

const nextAttachmentId = (): string => {
  attachmentSequence += 1;
  return `att-${Date.now()}-${attachmentSequence}`;
};

export const isRequiredAttachmentCategory = (
  category: NoticeAttachmentCategory,
  placingWayCode?: string,
): boolean => {
  const meta = noticeAttachmentCategoryMeta(category);

  if (category === "evaluation_order") {
    // Порядок оценки обязателен только для конкурса (ч. 2 ст. 42 44-ФЗ)
    return isContestPlacingWay(placingWayCode);
  }

  return meta.requiredForPublish;
};

export const canSuspendAttachmentCategory = (
  category: NoticeAttachmentCategory,
): boolean => noticeAttachmentCategoryMeta(category).canSuspend;

/**
 * Приводит запись (в том числе старую, из PG) к полной модели.
 * Идемпотентно: повторный вызов ничего не меняет.
 */
export const normalizeNoticeAttachment = (
  raw: NoticeAttachmentInput | NoticeAttachment,
): NoticeAttachment => {
  const category = raw.category as NoticeAttachmentCategory;
  const meta = noticeAttachmentCategoryMeta(category);
  const status = (
    raw.status && raw.status in NOTICE_ATTACHMENT_STATUS_LABELS
      ? raw.status
      : "attached"
  ) as NoticeAttachmentStatus;

  return {
    ...raw,
    id: String(raw.id ?? nextAttachmentId()),
    category,
    status,
    fileName: raw.fileName ?? "Без имени",
    description: raw.description ?? "",
    sourceKind: raw.sourceKind ?? "manual",
    isRequiredForPublish:
      raw.isRequiredForPublish ?? meta.requiredForPublish,
    attachedAt: raw.attachedAt,
  } as NoticeAttachment;
};

export const normalizeNoticeAttachments = (
  list: Array<NoticeAttachmentInput | NoticeAttachment> | undefined | null,
): NoticeAttachment[] => (list ?? []).map(normalizeNoticeAttachment);

export const attachmentsByCategory = (
  list: NoticeAttachment[] | undefined,
  category: NoticeAttachmentCategory,
): NoticeAttachment[] =>
  (list ?? []).filter((item) => item.category === category);

export const findNoticeAttachment = (
  list: NoticeAttachment[] | undefined,
  id: string,
): NoticeAttachment | undefined =>
  (list ?? []).find((item) => String(item.id) === String(id));

// ─── Upsert и смена статуса ──────────────────────────────────────────────────

const sameSource = (
  item: NoticeAttachment,
  candidate: NoticeAttachment,
): boolean =>
  item.category === candidate.category &&
  (candidate.sourceKind ?? "manual") !== "manual" &&
  item.sourceKind === candidate.sourceKind &&
  String(item.sourceId ?? "") === String(candidate.sourceId ?? "");

/**
 * Добавляет документ или обновляет уже привязанный из того же источника.
 * Ручные файлы (`sourceKind: "manual"`) не перетираются.
 */
export const upsertNoticeAttachment = (
  list: NoticeAttachment[] | undefined,
  candidate: NoticeAttachmentInput | NoticeAttachment,
): NoticeAttachment[] => {
  const normalized = normalizeNoticeAttachment(candidate);
  const source = list ?? [];
  const index = source.findIndex(
    (item) =>
      sameSource(item, normalized) || String(item.id) === String(normalized.id),
  );

  if (index < 0) {
    return [...source, normalized];
  }

  const current = source[index];
  const next: NoticeAttachment = {
    ...current,
    // Статус не понижаем автоматически: утверждённый документ остаётся
    // утверждённым, пока его не вернули в черновик явным действием.
    status:
      current.status === "published" || current.status === "approved"
        ? current.status
        : normalized.status,
    fileName: normalized.fileName || current.fileName,
    description: normalized.description || current.description,
    sourceVersion: normalized.sourceVersion ?? current.sourceVersion,
    sha256: normalized.sha256 ?? current.sha256,
    fingerprint: normalized.fingerprint ?? current.fingerprint,
    storageRef: normalized.storageRef ?? current.storageRef,
    url: normalized.url ?? current.url,
    approvedAt: normalized.approvedAt ?? current.approvedAt,
    attachedAt: normalized.attachedAt ?? current.attachedAt,
    isRequiredForPublish:
      normalized.isRequiredForPublish ?? current.isRequiredForPublish,
  };

  return source.map((item, itemIndex) =>
    itemIndex === index ? next : item,
  );
};

export const setNoticeAttachmentStatus = (
  list: NoticeAttachment[] | undefined,
  id: string,
  status: NoticeAttachmentStatus,
  at?: string,
): NoticeAttachment[] =>
  (list ?? []).map((item) => {
    if (String(item.id) !== String(id)) return item;

    const timestamp = at ?? new Date().toISOString();

    return {
      ...item,
      status,
      approvedAt:
        status === "approved" ? (item.approvedAt ?? timestamp) : item.approvedAt,
      attachedAt:
        status === "attached" || status === "published"
          ? (item.attachedAt ?? timestamp)
          : item.attachedAt,
    };
  });

export const markNoticeAttachmentsPublished = (
  list: NoticeAttachment[] | undefined,
  at?: string,
): NoticeAttachment[] =>
  (list ?? []).map((item) =>
    item.status === "suspended_before_publish" || item.status === "draft"
      ? item
      : { ...item, status: "published", attachedAt: item.attachedAt ?? at },
  );

// ─── Наследование СЗ → извещение ─────────────────────────────────────────────

export interface InheritAttachmentsInput {
  note?: PurchaseNote | null;
  objectDescription?: ObjectDescription | null;
  existing?: NoticeAttachment[] | NoticeAttachmentInput[];
  noticeId?: string | number | null;
  now?: string;
}

const buildDescription = (...parts: Array<string | undefined>): string =>
  parts.filter(Boolean).join(" · ");

/**
 * Переносит утверждённые документы служебной записки в извещение.
 *
 * ООЗ и обоснование НМЦК считаются утверждёнными только у утверждённой СЗ
 * (`status === "approved"`), иначе они попадают в извещение черновиками и
 * блокируют публикацию — это намеренно: публиковать неутверждённое нельзя.
 */
export const inheritAttachmentsFromPurchaseNote = ({
  note,
  objectDescription,
  existing,
  noticeId,
  now,
}: InheritAttachmentsInput): NoticeAttachment[] => {
  let result = normalizeNoticeAttachments(existing);
  if (!note) return result;

  const timestamp = now ?? new Date().toISOString();
  const isNoteApproved = note.status === "approved";
  const noteStatus: NoticeAttachmentStatus = isNoteApproved
    ? "approved"
    : "draft";

  const nmckFileName =
    note.nmckFileName || note.nmckSignature?.fileName || undefined;

  if (nmckFileName) {
    const signatureNote = note.nmckSignature
      ? buildDescription(
          "подписано ЭП",
          note.nmckSignature.signedBy
            ? `(${note.nmckSignature.signedBy})`
            : undefined,
          note.nmckSignature.signedAt,
        )
      : "";

    result = upsertNoticeAttachment(result, {
      id: `sz-nmck-doc-${String(note.id ?? "new")}`,
      category: "nmck_justification",
      sourceKind: "nmck",
      sourceId: note.id ?? null,
      sourceVersion: note.nmckFileUpdatedAt,
      status: noteStatus,
      fileName: nmckFileName,
      description: buildDescription(
        note.priceBasis || "Обоснование НМЦК (из СЗ)",
        signatureNote,
      ),
      approvedAt: isNoteApproved ? timestamp : undefined,
      attachedAt: timestamp,
      purchaseNoteId: note.id ?? null,
      noticeId: noticeId ?? null,
      isRequiredForPublish: true,
    });
  }

  const oozFileName =
    note.objectDescriptionFileName ||
    (isNoteApproved && objectDescription
      ? `Описание_объекта_закупки_${objectDescription.title}.docx`
      : undefined);

  if (oozFileName) {
    const positionInfo = objectDescription
      ? buildDescription(
          objectDescription.title,
          objectDescription.okpd2Code
            ? `ОКПД2 ${objectDescription.okpd2Code}`
            : undefined,
          objectDescription.ktruCode
            ? `КТРУ ${objectDescription.ktruCode}`
            : undefined,
        )
      : note.subject;

    result = upsertNoticeAttachment(result, {
      id: `sz-ooz-doc-${String(note.id ?? "new")}`,
      category: "object_description",
      sourceKind: "object_description",
      sourceId: objectDescription?.id ?? note.objectDescriptionId ?? null,
      status: noteStatus,
      fileName: oozFileName,
      description: buildDescription(
        "Структурированное описание объекта закупки (из утверждённой СЗ)",
        positionInfo,
      ),
      approvedAt: isNoteApproved ? timestamp : undefined,
      attachedAt: timestamp,
      purchaseNoteId: note.id ?? null,
      noticeId: noticeId ?? null,
      isRequiredForPublish: true,
    });
  }

  return result;
};

// ─── Проверка готовности к публикации ────────────────────────────────────────

export type NoticeAttachmentIssueSeverity = "error" | "warning";

export interface NoticeAttachmentIssue {
  severity: NoticeAttachmentIssueSeverity;
  category?: NoticeAttachmentCategory;
  message: string;
}

export interface ValidateNoticeAttachmentsOptions {
  docs?: Array<NoticeAttachmentInput | NoticeAttachment> | null;
  placingWayCode?: string;
  // Для публикации отложенные документы допустимы только там, где canSuspend
  forPublish?: boolean;
}

const READY_STATUSES: NoticeAttachmentStatus[] = [
  "approved",
  "attached",
  "published",
];

export const validateNoticeAttachments = ({
  docs,
  placingWayCode,
  forPublish = false,
}: ValidateNoticeAttachmentsOptions): NoticeAttachmentIssue[] => {
  const list = normalizeNoticeAttachments(docs);
  const issues: NoticeAttachmentIssue[] = [];

  NOTICE_ATTACHMENT_CATEGORIES.forEach((meta) => {
    const required = isRequiredAttachmentCategory(meta.id, placingWayCode);
    const categoryDocs = attachmentsByCategory(list, meta.id);
    const ready = categoryDocs.filter((doc) =>
      READY_STATUSES.includes(doc.status ?? "attached"),
    );
    const suspended = categoryDocs.filter(
      (doc) => doc.status === "suspended_before_publish",
    );
    const drafts = categoryDocs.filter((doc) => doc.status === "draft");

    if (required && categoryDocs.length === 0) {
      issues.push({
        severity: "error",
        category: meta.id,
        message: `Раздел 2: не приложен документ «${meta.title}».`,
      });
      return;
    }

    if (required && ready.length === 0) {
      if (suspended.length > 0 && meta.canSuspend && forPublish) {
        issues.push({
          severity: "warning",
          category: meta.id,
          message: `Документ «${meta.title}» отложен до публикации — проверьте, что это допустимо для данного способа закупки.`,
        });
        return;
      }

      issues.push({
        severity: "error",
        category: meta.id,
        message: `Документ «${meta.title}» не утверждён: перед публикацией переведите его в статус «Утверждён» или «Приложен».`,
      });
      return;
    }

    if (drafts.length > 0) {
      issues.push({
        severity: "warning",
        category: meta.id,
        message: `В категории «${meta.title}» есть черновики — опубликованные сведения будут неполными.`,
      });
    }

    if (suspended.length > 0 && !meta.canSuspend) {
      issues.push({
        severity: "error",
        category: meta.id,
        message: `Документ «${meta.title}» нельзя откладывать до публикации: он утверждается на этапе служебной записки.`,
      });
    }
  });

  return issues;
};

export interface CanPublishNoticeResult {
  ok: boolean;
  issues: NoticeAttachmentIssue[];
  blocking: NoticeAttachmentIssue[];
  warnings: NoticeAttachmentIssue[];
}

/**
 * Готовность извещения к публикации по составу документов.
 * Возвращает и мягкие предупреждения, чтобы UI мог их показать.
 */
export const canPublishNotice = (
  options: ValidateNoticeAttachmentsOptions,
): CanPublishNoticeResult => {
  const issues = validateNoticeAttachments({ ...options, forPublish: true });
  const blocking = issues.filter((issue) => issue.severity === "error");

  return {
    ok: blocking.length === 0,
    issues,
    blocking,
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
};
