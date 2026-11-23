import {
  normalizeNoticeAttachment,
  type NoticeAttachment,
} from "../Procurements/noticeAttachment.schema";
import {
  buildContractDocument,
  contractDocumentToText,
} from "./contractDocument";
import type { ContractProject } from "./contractProject.schema";

/**
 * Проект контракта как вложение извещения (Раздел 2, п. 5 формы извещения,
 * ПП РФ № 60).
 *
 * Зачем не только файл: Раздел 2 извещения — это состав документов, а не
 * список скачанных файлов. Пока проект контракта жил только в своём модуле,
 * извещение выглядело «неготовым»: документ есть, а к извещению не приложен,
 * и публикация блокировалась. Здесь документ переводится в ту же модель, что
 * и остальные вложения, — со статусом, источником и отпечатком.
 *
 * Отпечаток считается по тексту документа (`contractDocumentToText`), а не по
 * JSON: сохранение формы меняет порядок ключей и служебные поля, а текст
 * контракта — нет. Тот же приём (FNV-1a, 8 hex) использует генератор
 * документов закупки, поэтому отпечатки сопоставимы между модулями.
 */

const documentFingerprint = (text: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
};

/** Имя файла не должно ломать выгрузку: слеши, кавычки и двоеточия — нет. */
const fileBaseName = (value: string): string =>
  value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").trim() ||
  "bez-nomera";

export interface ContractProjectAttachmentInput {
  project: ContractProject;
  noticeId?: string | number | null;
  procurementId?: string | number | null;
  purchaseNoteId?: string | number | null;
  uploadedBy?: string;
}

export const buildContractProjectAttachment = ({
  project,
  noticeId,
  procurementId,
  purchaseNoteId,
  uploadedBy,
}: ContractProjectAttachmentInput): NoticeAttachment => {
  const document = buildContractDocument(project);
  const number = (project.contractNumber ?? "").trim();
  const base = fileBaseName(number || project.ikz || project.contractName);

  return normalizeNoticeAttachment({
    // Идентификатор привязан к карточке проекта: повторное сохранение
    // обновляет вложение, а не добавляет второе
    id: `contract-project-${String(project.id ?? procurementId ?? base)}`,
    category: "contract_project",
    sourceKind: "contract_project",
    sourceId: project.id ?? procurementId ?? null,
    sourceVersion: project.updatedAt || undefined,
    // Проект сохранён и приложен к извещению. Утверждение — отдельное
    // действие в Разделе 2: приложение документа не равно его согласованию
    status: "attached",
    fileName: `Проект_контракта_${base}.docx`,
    description: [
      project.contractName || "Проект контракта",
      number ? `№ ${number}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fingerprint: documentFingerprint(contractDocumentToText(document)),
    noticeId: noticeId ?? null,
    procurementId: procurementId ?? null,
    purchaseNoteId: purchaseNoteId ?? null,
    attachedAt: new Date().toISOString(),
    uploadedBy,
    // Код вида документа из `nsiEPDocTypes` здесь не подставляется: его
    // выбирает человек в Разделе 2 из справочника ЕИС. Выдуманный код ЕИС
    // отклонит, поэтому «по догадке» он не ставится
    isRequiredForPublish: true,
  });
};
