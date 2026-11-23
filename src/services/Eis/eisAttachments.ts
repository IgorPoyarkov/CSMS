/**
 * Вложения пакета ЕИС 17.0: модель, проверки и сборка XML.
 *
 * Почему отдельный модуль: вложения встречаются в четырёх документах
 * (извещение, проект контракта, приёмка, отчёт СМП), и правила у них общие —
 * имя файла, размер, отпечаток, ссылка на содержимое. Держать их копией в
 * каждом сборщике XML значит разойтись в требованиях через месяц.
 *
 * Структура взята из Альбома 17.0, а не из догадок:
 * — `attachmentWithKindType` (`CommonTypes.xsd`) — вложение извещения:
 *   `publishedContentId?`, `fileName`, `fileSize?`, `docDescription?`,
 *   `docDate?`, `choice(url | contentId | content)`, **`docKindInfo`**,
 *   `cryptoSigns?`. Код вида документа обязателен, справочник — `nsiEPDocTypes`;
 * — `contractProjectFileType` (`IntegrationCPTypes.xsd`) — файл проекта
 *   контракта: `fileName`, `docDescription?`, `choice(url | contentId | content)`,
 *   `fileSize?`, `fileFingerPrint?`. Отпечаток здесь есть, в извещении его нет.
 *
 * Отпечаток и размер ЕИС при передаче считает сама («элемент игнорируется при
 * приёме, автоматически заполняется при передаче»). Поэтому их отсутствие —
 * предупреждение, а не ошибка: без них пакет уйдёт, но сверить файл глазами
 * будет не с чем.
 */

import { escapeXml } from "./eisPacket";

/** Вложение в терминах нашего домена: файл + как он попадёт в ЕИС. */
export interface EisAttachment {
  /** id записи у нас — для ссылки из интерфейса, в XML не уходит. */
  id?: string;
  fileName: string;
  /** Описание для человека: в извещении `docDescription`, в файлах проекта то же. */
  description?: string;
  /** Размер в байтах; ЕИС заполняет сама, но для сверки полезен. */
  fileSize?: number;
  /** Отпечаток файла (hash); поддерживается только файлами проекта. */
  fileFingerPrint?: string;
  /** Содержимое файла в base64 — взаимоисключающе с `contentId` и `url`. */
  contentBase64?: string;
  /** Идентификатор контента, уже загруженного в ЕИС. */
  contentId?: string;
  /** Ссылка на скачивание; при приёме ЕИС её значение контролирует. */
  url?: string;
  /** Дата/время прикрепления (`xs:dateTime`). */
  docDate?: string;
  /** Код вида документа из `nsiEPDocTypes` — обязателен в извещении. */
  docKindCode?: string;
  /** Наименование вида документа; ЕИС при приёме игнорирует. */
  docKindName?: string;
  /**
   * Ссылка на наше хранилище (`storageRef` в модели извещения).
   * В XML не уходит: ЕИС не умеет читать наше хранилище, файл надо передать
   * через `content`/`contentId`/`url`.
   */
  storageRef?: string;
  /**
   * Файл уже опубликован в ЕИС (статус `published` модели извещения).
   *
   * Тогда отсутствие content/contentId — не потеря: файл в портале есть,
   * просто его идентификатор у нас не сохранён.
   */
  publishedInEis?: boolean;
}

/** Насколько вложение мешает приёму пакета. */
export type EisAttachmentIssueSeverity = "error" | "warning";

export interface EisAttachmentIssue {
  /** Имя файла как в записи — чтобы интерфейс мог показать, о чём речь. */
  fileName: string;
  /** Стабильный ключ для тестов и фильтров. */
  code: string;
  message: string;
  severity: EisAttachmentIssueSeverity;
  /** Поле нашей модели, которое надо заполнить. */
  field: string | null;
}

/** Требования конкретного документа: где-то код вида обязателен, где-то нет. */
export interface EisAttachmentRequirements {
  /** XSD требует `docKindInfo` (извещение, `attachmentListWithKindType`). */
  requireDocKind?: boolean;
  /** Нужна ссылка на содержимое: `url`, `contentId` или `content`. */
  requireContent?: boolean;
  /** Проверять ли размер файла (`fileSize`). */
  checkSize?: boolean;
  /** Проверять ли отпечаток: он есть только у файлов проекта контракта. */
  checkFingerprint?: boolean;
}

/** Справочник видов прикреплённых документов — источник кодов `docKindInfo`. */
export const EIS_ATTACHMENT_DOC_KIND_SOURCE = "nsiEPDocTypes";

/** Пределы XSD 17.0 для полей вложения. */
export const EIS_ATTACHMENT_LIMITS = {
  /** base:fileNameType. */
  fileName: 1024,
  /** base:text4000Type (описание). */
  description: 4000,
  /** text10Type — код вида документа. */
  docKindCode: 10,
  /** text2000Type — наименование вида документа. */
  docKindName: 2000,
} as const;

const text = (value: unknown): string => String(value ?? "").trim();

const positiveInteger = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(text(value));

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Привести записи к общей модели.
 *
 * Пустые строки превращаются в `undefined`, а записи без имени файла не
 * выбрасываются молча: именно они чаще всего и ломают пакет, поэтому о них
 * сообщает `eisAttachmentIssues`.
 */
export const normalizeEisAttachments = (
  items: ReadonlyArray<EisAttachment | null | undefined> | null | undefined,
): EisAttachment[] =>
  (items ?? [])
    .filter((item): item is EisAttachment => Boolean(item))
    .map((item) => {
      const fileSize = positiveInteger(item.fileSize);

      return {
        ...item,
        fileName: text(item.fileName),
        description: text(item.description) || undefined,
        fileFingerPrint: text(item.fileFingerPrint) || undefined,
        contentBase64: text(item.contentBase64) || undefined,
        contentId: text(item.contentId) || undefined,
        url: text(item.url) || undefined,
        docDate: text(item.docDate) || undefined,
        docKindCode: text(item.docKindCode) || undefined,
        docKindName: text(item.docKindName) || undefined,
        storageRef: text(item.storageRef) || undefined,
        ...(fileSize === undefined ? { fileSize: undefined } : { fileSize }),
      };
    });

/** Есть ли у вложения хоть один способ передать файл. */
export const hasEisAttachmentContent = (item: EisAttachment): boolean =>
  Boolean(item.contentBase64 || item.contentId || item.url);

/** Есть ли отпечаток — по нему видно, что файл действительно сверяли. */
export const hasEisAttachmentFingerprint = (item: EisAttachment): boolean =>
  Boolean(item.fileFingerPrint);

/** Сколько ошибок и предупреждений — для одной строки в интерфейсе. */
export const eisAttachmentIssueCounts = (
  issues: ReadonlyArray<EisAttachmentIssue>,
) => ({
  errors: issues.filter((item) => item.severity === "error").length,
  warnings: issues.filter((item) => item.severity === "warning").length,
});

/**
 * Проверки вложений.
 *
 * Уровни выбраны осознанно: ошибка — то, что ЕИС отклонит или потеряет
 * (нет имени, нет файла, нет кода вида в документе, где он обязателен);
 * предупреждение — то, что ЕИС досчитает сама (размер, отпечаток).
 */
export const eisAttachmentIssues = (
  items: ReadonlyArray<EisAttachment>,
  requirements: EisAttachmentRequirements = {},
): EisAttachmentIssue[] => {
  const issues: EisAttachmentIssue[] = [];
  const seen = new Map<string, number>();

  items.forEach((item, index) => {
    const label = item.fileName || `вложение № ${index + 1}`;

    const add = (
      severity: EisAttachmentIssueSeverity,
      code: string,
      message: string,
      suffix: string,
    ) =>
      issues.push({
        fileName: label,
        code,
        message,
        severity,
        field: `attachments.${index}.${suffix}`,
      });

    if (!item.fileName) {
      add(
        "error",
        "attachment.no_file_name",
        "У вложения не указано имя файла: без fileName ЕИС не сможет принять документ.",
        "fileName",
      );
    } else if (item.fileName.length > EIS_ATTACHMENT_LIMITS.fileName) {
      add(
        "error",
        "attachment.file_name_too_long",
        `Имя файла длиннее ${EIS_ATTACHMENT_LIMITS.fileName} символов (base:fileNameType XSD 17.0).`,
        "fileName",
      );
    } else {
      const key = item.fileName.toLowerCase();
      const firstIndex = seen.get(key);

      if (firstIndex !== undefined) {
        add(
          "error",
          "attachment.duplicate_file_name",
          `Файл с именем «${item.fileName}» уже приложен выше (№ ${firstIndex + 1}): ЕИС сверяет вложения по имени и дубликат не различит.`,
          "fileName",
        );
      } else {
        seen.set(key, index);
      }
    }

    if (item.description && item.description.length > EIS_ATTACHMENT_LIMITS.description) {
      add(
        "error",
        "attachment.description_too_long",
        `Описание длиннее ${EIS_ATTACHMENT_LIMITS.description} символов (base:text4000Type).`,
        "description",
      );
    }

    if (requirements.requireContent !== false && !hasEisAttachmentContent(item)) {
      if (item.publishedInEis) {
        // Файл уже в ЕИС: повторно передавать нечего, но и утверждать, что
        // вложение уйдёт в новой версии, мы не можем — идентификатор контента
        // портала у нас не сохранён.
        add(
          "warning",
          "attachment.published_without_content_id",
          "Файл уже опубликован в ЕИС, но идентификатор его контента не сохранён: при новой версии документа вложение нужно приложить заново.",
          "contentId",
        );
      } else {
        // Файл может быть приложен у нас (storageRef) — тогда это не «нет файла»,
        // а «файл не передан в ЕИС»: разные причины, разные действия.
        add(
          "error",
          item.storageRef
            ? "attachment.local_storage_only"
            : "attachment.no_content",
          item.storageRef
            ? "Файл хранится только у нас (storageRef): ЕИС его не прочитает. Нужен content, contentId уже загруженного файла или url."
            : "У вложения нет самого файла: нужен content (base64), contentId уже загруженного файла или url. " +
                "Без этого в ЕИС уйдёт только описание.",
          item.storageRef ? "storageRef" : "contentBase64",
        );
      }
    }

    if (item.docKindCode && item.docKindCode.length > EIS_ATTACHMENT_LIMITS.docKindCode) {
      add(
        "error",
        "attachment.doc_kind_too_long",
        `Код вида документа длиннее ${EIS_ATTACHMENT_LIMITS.docKindCode} символов (text10Type).`,
        "docKindCode",
      );
    } else if (requirements.requireDocKind && !item.docKindCode) {
      // Уровень — предупреждение, а не ошибка: поля для кода в модели
      // извещения пока нет (это зона документов), и блокировать выгрузку
      // целиком из-за отсутствующего поля мы не вправе. Но и молчать нельзя:
      // без docKindInfo ФЛК ЕИС отклонит вложение.
      add(
        "warning",
        "attachment.no_doc_kind",
        `Не указан вид документа (docKindInfo/code из справочника ${EIS_ATTACHMENT_DOC_KIND_SOURCE}): ` +
          "XSD 17.0 требует его для каждого вложения извещения — без кода ФЛК ЕИС отклонит вложение.",
        "docKindCode",
      );
    }

    if (requirements.checkSize !== false && !item.fileSize) {
      add(
        "warning",
        "attachment.no_size",
        "Размер файла не указан — ЕИС заполнит его при передаче. Для сверки лучше указать.",
        "fileSize",
      );
    }

    if (requirements.checkFingerprint && !hasEisAttachmentFingerprint(item)) {
      add(
        "warning",
        "attachment.no_fingerprint",
        "Отпечаток файла не указан: ЕИС считает hash сама, но проверить, что отправлен тот же файл, будет нечем.",
        "fileFingerPrint",
      );
    }

    if (item.docDate && Number.isNaN(Date.parse(item.docDate))) {
      add(
        "warning",
        "attachment.bad_doc_date",
        "Дата прикрепления не разбирается как xs:dateTime — ЕИС проигнорирует её.",
        "docDate",
      );
    }
  });

  return issues;
};

const contentChoiceXml = (item: EisAttachment, indent: string): string => {
  if (item.contentBase64) {
    return `${indent}<content>${item.contentBase64}</content>`;
  }

  if (item.contentId) {
    return `${indent}<contentId>${escapeXml(item.contentId)}</contentId>`;
  }

  if (item.url) {
    return `${indent}<url>${escapeXml(item.url)}</url>`;
  }

  return "";
};

const joinXml = (lines: ReadonlyArray<string>): string =>
  lines.filter((line) => line !== "").join("\n");

/**
 * Блок `attachmentsInfo` извещения (`attachmentListWithKindType`).
 *
 * Порядок детей — по последовательности XSD, переставлять нельзя.
 * Пустых блоков не создаём: `attachmentInfo` без имени файла ЕИС отклонит
 * так же, как пустой `attachmentsInfo`.
 */
export const buildEisAttachmentsInfoXml = (
  items: ReadonlyArray<EisAttachment>,
  indent = "  ",
): string => {
  if (items.length === 0) {
    return "";
  }

  const inner = indent + "  ";
  const itemInner = inner + "  ";

  const rows = items.map((item) =>
    joinXml([
      `${inner}<attachmentInfo>`,
      item.fileName
        ? `${itemInner}<fileName>${escapeXml(item.fileName)}</fileName>`
        : "",
      item.fileSize ? `${itemInner}<fileSize>${item.fileSize}</fileSize>` : "",
      item.description
        ? `${itemInner}<docDescription>${escapeXml(item.description)}</docDescription>`
        : "",
      item.docDate
        ? `${itemInner}<docDate>${escapeXml(item.docDate)}</docDate>`
        : "",
      contentChoiceXml(item, itemInner),
      item.docKindCode
        ? `${itemInner}<docKindInfo><code>${escapeXml(item.docKindCode)}</code>${
            item.docKindName
              ? `<name>${escapeXml(item.docKindName)}</name>`
              : ""
          }</docKindInfo>`
        : "",
      `${inner}</attachmentInfo>`,
    ]),
  );

  return joinXml([
    `${indent}<attachmentsInfo>`,
    ...rows,
    `${indent}</attachmentsInfo>`,
  ]);
};

/**
 * Блок `contractProjectFilesInfo` проекта контракта
 * (`contractProjectFileType`).
 *
 * Здесь есть `fileFingerPrint` — в извещении его нет, поэтому тип отдельный.
 */
export const buildEisContractProjectFilesXml = (
  items: ReadonlyArray<EisAttachment>,
  indent = "  ",
): string => {
  if (items.length === 0) {
    return "";
  }

  const inner = indent + "  ";
  const itemInner = inner + "  ";

  const rows = items.map((item) =>
    joinXml([
      `${inner}<contractProjectFileInfo>`,
      item.fileName
        ? `${itemInner}<fileName>${escapeXml(item.fileName)}</fileName>`
        : "",
      item.description
        ? `${itemInner}<docDescription>${escapeXml(item.description)}</docDescription>`
        : "",
      contentChoiceXml(item, itemInner),
      item.fileSize ? `${itemInner}<fileSize>${item.fileSize}</fileSize>` : "",
      item.fileFingerPrint
        ? `${itemInner}<fileFingerPrint>${escapeXml(item.fileFingerPrint)}</fileFingerPrint>`
        : "",
      `${inner}</contractProjectFileInfo>`,
    ]),
  );

  return joinXml([
    `${indent}<contractProjectFilesInfo>`,
    ...rows,
    `${indent}</contractProjectFilesInfo>`,
  ]);
};
