import { toNumber, type PurchasePlan } from "./purchasePlan.schema";

/**
 * Действующий план-график заказчика.
 *
 * На главной нужен ровно один «текущий» документ, поэтому из всех планов
 * выбирается план года, который идёт сейчас: черновик не должен перекрывать
 * опубликованную версию, а из нескольких редакций открывается самая свежая.
 * Удалённые планы (removed) не участвуют — открывать в них нечего.
 */
const STATUS_WEIGHT: Record<PurchasePlan["status"], number> = {
  changed: 3,
  published: 2,
  draft: 1,
  removed: 0,
};

// Год берём из planYear, а если поле пустое — из реестрового номера: первые
// четыре цифры номера по 44-ФЗ и есть год формирования плана-графика.
const planYearOf = (plan: PurchasePlan): number | null => {
  const explicit = toNumber(plan.planYear);

  if (explicit !== null) {
    return explicit;
  }

  const fromNumber = Number(String(plan.planNumber).slice(0, 4));

  return Number.isFinite(fromNumber) ? fromNumber : null;
};

const versionOf = (plan: PurchasePlan): number =>
  toNumber(plan.versionNumber) ?? 0;

const stampOf = (plan: PurchasePlan): number => {
  const value = plan.publishDate ?? plan.createDate ?? "";

  return value ? Date.parse(value) || 0 : 0;
};

const comparePlans = (a: PurchasePlan, b: PurchasePlan): number =>
  (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0) ||
  versionOf(b) - versionOf(a) ||
  stampOf(b) - stampOf(a) ||
  String(b.planNumber).localeCompare(String(a.planNumber), "ru", {
    numeric: true,
  });

export const findCurrentPurchasePlan = (
  plans: PurchasePlan[],
  year: number = new Date().getFullYear(),
): PurchasePlan | undefined =>
  plans
    .filter((plan) => plan.status !== "removed" && planYearOf(plan) === year)
    .sort(comparePlans)[0];

/**
 * Ссылка на текущий план-график. Если плана на этот год ещё нет, ведём
 * в реестр планов-графиков: создание документа с главной больше не нужно,
 * а «пустая» карточка вместо списка только запутала бы заказчика.
 */
export const currentPurchasePlanPath = (
  plan: PurchasePlan | undefined,
): string => {
  const id = plan?.id;

  return id !== undefined && id !== null && id !== ""
    ? `/purchase-plans/${id}`
    : "/purchase-plans";
};
