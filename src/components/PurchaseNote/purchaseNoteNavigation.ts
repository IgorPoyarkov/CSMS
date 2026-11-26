import type { PurchaseNote } from "../../services/PurchaseNote/purchaseNote.schema";
import {
  toNumber,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import type { RawProcurement } from "../../services/Procurements/procurement.schema";
import { DEFAULT_PROCUREMENT_TYPES } from "../ProcurementProcessing/procurement.config";

/**
 * Переходы из служебной записки в смежные документы закупки.
 *
 * СЗ — самостоятельный документ, но её данные (ИКЗ, предмет, НМЦК, способ,
 * инициатор) служат заготовкой для извещения и проекта контракта. Раньше эта
 * сборка жила внутри страницы СЗ; теперь она нужна и реестру потребностей,
 * поэтому вынесена в чистые функции без хуков и обращений к API.
 */

/** Что передаём в `location.state` формам извещения и проекта контракта. */
export interface PurchaseNoteNoticeState {
  ikz: string;
  name: string;
  procurementType: string;
  nmck: number;
  planPositionNumber: string;
  responsibleFio: string;
  smpRequiredPercent?: number;
  purchaseNoteId?: string | number;
  purchaseNoteNumber: string;
  objectDescriptionId?: string | number;
  authorizedBodyName?: string;
  jointOrganizerName?: string;
  kbk?: string;
}

const lastDefaultProcurementType =
  DEFAULT_PROCUREMENT_TYPES[DEFAULT_PROCUREMENT_TYPES.length - 1];

/** Предмет закупки: из СЗ, иначе из позиции плана-графика. */
const subjectOf = (note: PurchaseNote, position?: PurchasePlanPosition) =>
  note.subject || position?.objectOfPurchase || "";

/** НМЦК: из СЗ, иначе объём позиции плана-графика. */
const nmckOf = (
  note: PurchaseNote,
  position?: PurchasePlanPosition,
): number => {
  if (note.initialMaxPrice) {
    const parsed = Number.parseFloat(note.initialMaxPrice);
    if (Number.isFinite(parsed)) return parsed;
  }
  return toNumber(position?.amountTotal) ?? 0;
};

/**
 * Состояние для форм извещения и проекта контракта: они читают его из
 * `location.state` и предзаполняют поля сведениями из СЗ.
 */
export const buildNoticeLocationState = (
  note: PurchaseNote,
  position?: PurchasePlanPosition,
): PurchaseNoteNoticeState => {
  const smpPercent =
    note.requiresSmpSubcontracting ??
    (note.smpRequiredPercent !== undefined && note.smpRequiredPercent > 0);

  return {
    ikz: note.ikz || position?.identificationCode || "",
    name: subjectOf(note, position),
    procurementType: note.procurementType || lastDefaultProcurementType,
    nmck: nmckOf(note, position),
    planPositionNumber: String(
      position?.purchaseNumber ?? position?.serialNumber ?? "",
    ),
    responsibleFio: note.initiatorName,
    smpRequiredPercent: smpPercent ? note.smpRequiredPercent : undefined,
    purchaseNoteId: note.id,
    purchaseNoteNumber: String(note.noteNumber),
    objectDescriptionId: note.objectDescriptionId ?? undefined,
    authorizedBodyName:
      note.authorizedBodyName || position?.authorizedBodyName || undefined,
    jointOrganizerName:
      note.jointOrganizerName || position?.jointOrganizerName || undefined,
    kbk: note.kbk || position?.kbk || undefined,
  };
};

/**
 * Запись закупки для реестра извещений, если по СЗ её ещё нет: без неё
 * извещение и проект контракта не к чему привязать.
 */
export const buildProcurementRaw = (
  note: PurchaseNote,
  position?: PurchasePlanPosition,
): RawProcurement => ({
  "Идентификационный код закупки":
    note.ikz || position?.identificationCode || "",
  "Наименование закупки": subjectOf(note, position),
  "Начальная (максимальная) цена контракта, руб": nmckOf(note, position),
  "Тип закупки": note.procurementType || lastDefaultProcurementType,
  "Уполномоченный орган (учреждение)":
    note.authorizedBodyName || position?.authorizedBodyName || "",
  "Организатор совместной закупки":
    note.jointOrganizerName || position?.jointOrganizerName || "",
  КБК: note.kbk || position?.kbk || "",
  // Служебная записка не содержит сроков процедуры — они появятся в извещении
  // и синхронизируются в запись закупки при его сохранении. Статус фиксируем
  // сразу: фильтры реестра считаются на сервере
  "Статус извещения": "preparing",
});

/** Связана ли СЗ с записью закупки (а значит — с извещением). */
export const hasProcurement = (note: PurchaseNote): boolean =>
  note.procurementId !== undefined &&
  note.procurementId !== null &&
  note.procurementId !== "";

export type PurchaseNoteTarget = "notice" | "contract-project";

/**
 * Адрес формы закупки: извещение или проект контракта. Оба маршрута живут под
 * `/procurement-processing/:id`, где `id` — идентификатор записи закупки.
 */
export const procurementRoute = (
  procurementId: string | number,
  target: PurchaseNoteTarget,
): string =>
  `/procurement-processing/${procurementId}/${
    target === "notice" ? "notice-info" : "contract-project"
  }`;
