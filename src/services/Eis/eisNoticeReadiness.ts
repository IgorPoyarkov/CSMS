import {
  noticeAttachmentReadiness,
  type NoticeInfoFormValues,
} from "../Procurements/noticeInfo.schema";
import {
  normalizeNoticeAttachments,
  type NoticeAttachmentStatus,
} from "../Procurements/noticeAttachment.schema";
import { normalizeEisAttachments, type EisAttachment } from "./eisAttachments";
import type {
  EisNoticeReadiness,
  EisPackageAttachment,
} from "./eisPackages.schema";

/**
 * Готовность извещения к передаче в ЕИС (Раздел 2 формы, п. 8 Положения
 * ПП РФ № 60).
 *
 * Зачем отдельный модуль, если проверка уже есть в `noticeInfo.schema.ts`:
 * там она смотрит на форму («можно ли публиковать»), а здесь — на пакет
 * сведений («что именно уйдёт в ЕИС и с какими замечаниями»). Разница
 * практическая:
 * — в пакет попадают только утверждённые документы (черновик и отложенный
 *   остаются в системе, но не уходят);
 * — вложения переводятся в термины шлюза: имя, размер, отпечаток, код вида
 *   документа из `nsiEPDocTypes` — по ним ЕИС и сверяет файлы;
 * — результат — снимок с моментом проверки: пакет живёт дольше документа, и
 *   «почему ушло с неполным Разделом 2» должно быть объяснимо.
 *
 * Правила не дублируются: вызывается та же `noticeAttachmentReadiness`, что
 * блокирует публикацию. Одно правило — одно место, иначе интерфейс и шлюз
 * разойдутся в требованиях.
 */

/**
 * Статусы, при которых документ действительно уходит в ЕИС.
 *
 * `draft` — файл выбран, но не утверждён; `suspended_before_publish` — человек
 * намеренно отложил документ. Оба статуса остаются в системе, но в пакет не
 * попадают: ЕИС получила бы неполный Раздел 2.
 */
const EIS_SENT_ATTACHMENT_STATUSES: NoticeAttachmentStatus[] = [
  "approved",
  "attached",
  "published",
];

/** Что из извещения нужно для проверки: документы, способ и ИКЗ. */
export type EisNoticeReadinessSource = Pick<
  NoticeInfoFormValues,
  "id" | "generalInfo" | "attachedDocs"
>;

/**
 * Вложение в терминах шлюза.
 *
 * Источник — модель извещения, но поля переименованы под контракт пакета:
 * `sha256`/`fingerprint` становятся `fileFingerPrint` (`contractProjectFileType`
 * называет отпечаток именно так), а код вида документа берётся из
 * `nsiEPDocTypes`.
 */
const toPackageAttachment = (item: EisAttachment): EisPackageAttachment => ({
  fileName: item.fileName,
  description: item.description ?? null,
  fileSize: item.fileSize ?? null,
  fileFingerPrint: item.fileFingerPrint ?? null,
  docKindCode: item.docKindCode ?? null,
  contentId: item.contentId ?? null,
  url: item.url ?? null,
});

/**
 * Готовность извещения к передаче в ЕИС.
 *
 * Возвращает и блокирующие замечания, и предупреждения: первые запрещают
 * создание пакета, вторые показываются рядом с кнопкой. Документы, которые
 * уйдут, перечислены отдельно — их видно и до отправки, и в карточке пакета
 * после неё.
 */
export const eisNoticeReadiness = (
  notice: EisNoticeReadinessSource,
  options: { now?: string } = {},
): EisNoticeReadiness => {
  const check = noticeAttachmentReadiness(notice);
  const docs = normalizeNoticeAttachments(notice.attachedDocs);
  const sent = docs.filter((doc) =>
    EIS_SENT_ATTACHMENT_STATUSES.includes(doc.status ?? "attached"),
  );

  const issues = check.issues.map((issue) => ({
    severity: issue.severity,
    category: issue.category ?? null,
    message: issue.message,
  }));

  return {
    ok: check.ok,
    blocking: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
    attachments: normalizeEisAttachments(
      sent.map((doc) => ({
        id: String(doc.id),
        fileName: doc.fileName,
        description: doc.description,
        fileSize: doc.fileSize,
        // Отпечаток в модели извещения лежит либо в `sha256`, либо в
        // `fingerprint`: для ЕИС это одно поле — файл должен быть сверяем
        fileFingerPrint: doc.sha256 ?? doc.fingerprint,
        url: doc.url,
        storageRef: doc.storageRef,
        publishedInEis: doc.status === "published",
        docKindCode: doc.docKindCode,
        docKindName: doc.docKindName,
      })),
    ).map(toPackageAttachment),
    checkedAt: options.now ?? new Date().toISOString(),
    noticeId:
      notice.id !== undefined && notice.id !== null ? String(notice.id) : null,
    noticeNumber: notice.generalInfo.noticeNumber ?? null,
    ikz: notice.generalInfo.ikz ?? "",
  };
};

/**
 * Блокирующие замечания простым списком строк — то, что уходит в шлюз полем
 * `attachmentBlockingIssues`.
 *
 * Зачем дублировать замечания, если шлюз получает и снимок: снимок шлюз пока
 * не разбирает, а список строк — уже работающий контракт (`EisPackageService`
 * на `Notification` отказывает 409, если список не пуст). Это страхующая
 * проверка на стороне сервера: даже если интерфейс обойдут или соберут пакет
 * из другого клиента, извещение с неполным Разделом 2 в ЕИС не уйдёт.
 *
 * Нормализация повторяет серверную (убрать пустые, обрезать пробелы, убрать
 * повторы): тогда тело запроса совпадает с тем, что шлюз вывел бы в тексте
 * отказа, и лишние строки не раздувают пакет.
 */
export const eisNoticeBlockingIssues = (
  readiness: EisNoticeReadiness,
): string[] =>
  Array.from(
    new Set(
      readiness.blocking
        .map((issue) => issue.message.trim())
        .filter((message) => message.length > 0),
    ),
  );

/**
 * Текст блокировки для формы: что именно мешает передать извещение в ЕИС.
 *
 * Показываем первые три замечания целиком и счётчик остальных: простыня из
 * семи пунктов не читается, а «и ещё 4» отправляет человека в Раздел 2, где
 * они и перечислены.
 */
export const eisNoticeReadinessError = (
  readiness: EisNoticeReadiness,
): string => {
  const shown = readiness.blocking
    .slice(0, 3)
    .map((issue, index) => `${index + 1}) ${issue.message}`)
    .join(" ");
  const rest =
    readiness.blocking.length > 3
      ? ` … и ещё ${readiness.blocking.length - 3}.`
      : "";

  return (
    `Извещение не готово к передаче в ЕИС (блокирующих замечаний: ` +
    `${readiness.blocking.length}). ${shown}${rest} ` +
    "Это та же проверка, что и при публикации извещения: ЕИС отклонит " +
    "документ с неполным Разделом 2."
  );
};

/** Короткая сводка для карточки пакета и подписи под формой. */
export const eisNoticeReadinessSummary = (
  readiness: EisNoticeReadiness,
): string =>
  `документов ${readiness.attachments.length} · ` +
  `блокирующих ${readiness.blocking.length} · ` +
  `предупреждений ${readiness.warnings.length}`;

/**
 * Относится ли снимок готовности к этому пакету.
 *
 * Шлюз получает XML и номера, но не документ-источник, поэтому перед отправкой
 * полезно убедиться, что снимок сделан по тому же извещению: ИКЗ — единственный
 * идентификатор, который есть и у документа, и у пакета.
 */
export const isEisPackageOfNotice = (
  pkg: { ikz: string; documentType: string },
  readiness: EisNoticeReadiness,
): boolean =>
  pkg.documentType === "Notification" &&
  Boolean(readiness.ikz) &&
  pkg.ikz === readiness.ikz;
