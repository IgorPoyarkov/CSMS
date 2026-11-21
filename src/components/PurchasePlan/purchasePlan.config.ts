import type { ConfigurationInput } from "../UI/CustomInput";
import {
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
  type PurchasePlanPositionStatus,
  type PurchasePlanStatus,
} from "../../services/PurchasePlan/purchasePlan.schema";

export interface Option<TValue extends string> {
  value: TValue;
  label: string;
}

// Статусы плана-графика, как в карточке ПГ личного кабинета заказчика ЕИС
export const purchasePlanStatusOptions: Option<PurchasePlanStatus>[] = [
  { value: "draft", label: "Проект" },
  { value: "published", label: "Размещен в ЕИС" },
  { value: "changed", label: "Изменен" },
  { value: "removed", label: "Удален" },
];

const findLabel = <TValue extends string>(
  options: Option<TValue>[],
  value: TValue | undefined,
): string => options.find((option) => option.value === value)?.label ?? "—";

export const purchasePlanStatusLabel = (status?: PurchasePlanStatus): string =>
  findLabel(purchasePlanStatusOptions, status);

// Статусы записи плана-графика (графа «Статус» в просмотре плана-графика):
// позиция запланирована, размещена после контроля, изменена или исключена
export const positionStatusOptions: Option<PurchasePlanPositionStatus>[] = [
  { value: "planned", label: "Запланирована" },
  { value: "placed", label: "Размещена" },
  { value: "changed", label: "Изменена" },
  { value: "cancelled", label: "Исключена из плана" },
];

export const positionStatusLabel = (
  status?: PurchasePlanPositionStatus,
): string => findLabel(positionStatusOptions, status);

// Справочники ЕИС 17.0 (IntegrationTPTypes.xsd)
export const ownerRoleOptions: Option<"CU" | "OA">[] = [
  { value: "CU", label: "CU — Заказчик" },
  {
    value: "OA",
    label: "OA — Организация, осуществляющая полномочия заказчика",
  },
];

export const pfhdTypeOptions: Option<"IND" | "CONS">[] = [
  { value: "IND", label: "IND — Индивидуальный ПФХД" },
  { value: "CONS", label: "CONS — Сводный ПФХД" },
];

export const modificationStatusOptions: Option<"N" | "E">[] = [
  { value: "N", label: "N — Новая позиция" },
  { value: "E", label: "E — Изменение сведений позиции" },
];

export const modificationDecisionOptions: Option<
  "notSpecified" | "purchaseChanged" | "purchaseCanceled"
>[] = [
  { value: "notSpecified", label: "Не указано (новая позиция)" },
  { value: "purchaseChanged", label: "Изменение закупки" },
  { value: "purchaseCanceled", label: "Отмена закупки" },
];

// Основания изменения плана-графика — пункт 22 Положения N 1279:
// подпункты "а" (пункты 1–4 части 8 статьи 16 Закона N 44-ФЗ), "б"–"е".
export const tpChangeReasonOptions = [
  {
    code: "1",
    name: "Изменение объёма финансового обеспечения для осуществления закупок (пункты 1–4 части 8 статьи 16 Закона N 44-ФЗ)",
  },
  {
    code: "2",
    name: "Уточнение информации об объекте закупки",
  },
  {
    code: "3",
    name: "Исполнение предписания органов контроля в сфере закупок",
  },
  {
    code: "4",
    name: "Признание определения поставщика (подрядчика, исполнителя) несостоявшимся",
  },
  {
    code: "5",
    name: "Расторжение контракта",
  },
  {
    code: "6",
    name: "Возникновение иных обстоятельств, предвидеть которые при утверждении плана-графика было невозможно",
  },
] as const;

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (value: string | number | undefined): string => {
  const amount = toNumber(value);

  return amount === null ? "—" : `${moneyFormatter.format(amount)} ₽`;
};

/**
 * Сумма без знака валюты — для таблиц, где единица измерения уже указана в
 * заголовке графы (графы объёма финансового обеспечения плана-графика).
 */
export const formatMoneyValue = (
  value: string | number | undefined,
): string => {
  const amount = toNumber(value);

  return amount === null ? "—" : moneyFormatter.format(amount);
};

/**
 * Маска КБК — 20 разрядов: главный администратор доходов/расходов (3),
 * раздел (2), подраздел (2), целевая статья (10, может содержать буквы),
 * вид расходов (3). Например: 801 05 02 05104S2106 414. Сам код хранится
 * без разделителей.
 */
const KBK_GROUPS = [3, 2, 2, 10, 3];

export const formatKbk = (kbk: string | undefined): string => {
  if (!kbk) {
    return "—";
  }

  // Буквы в целевой статье — часть кода, поэтому чистим только разделители
  const digits = kbk.replace(/[^0-9A-Za-zА-Яа-я]/g, "");

  if (digits.length !== 20) {
    return kbk;
  }

  let offset = 0;

  return KBK_GROUPS.map((length) => {
    const part = digits.slice(offset, offset + length);
    offset += length;

    return part;
    // Неразрывные пробелы: маска КБК всегда читается в одну строку
  }).join("\u00A0");
};

// Совокупный объём ПГ: берём указанный, иначе считаем по объёму
// финансового обеспечения записей ПГ
export const planTotalAmount = (plan: PurchasePlan): number => {
  const declared = toNumber(plan.totalAmount);

  if (declared !== null) {
    return declared;
  }

  const positionsTotal = plan.positions.reduce(
    (total, position) => total + (toNumber(position.amountTotal) ?? 0),
    0,
  );
  // Итог формы ПГ включает и записи, и особые закупки (п. 16, подп. "е"
  // Положения N 1279; totalsInfo XSD ЕИС 17.0)
  const specialTotal = (plan.specialPurchases ?? []).reduce(
    (total, item) => total + (toNumber(item.amountTotal) ?? 0),
    0,
  );

  return positionsTotal + specialTotal;
};

// Подписи граф объёма финансового обеспечения: плановый период всегда
// следует за текущим годом, поэтому годы считаем от года планирования
export const planPeriodLabels = (planYear: string | number) => {
  const year = Number(planYear);
  const current = Number.isFinite(year) ? year : new Date().getFullYear();

  return {
    total: "Всего",
    currentYear: `на текущий финансовый год (${current})`,
    firstPlanYear: `на первый год планового периода (${current + 1})`,
    secondPlanYear: `на второй год планового периода (${current + 2})`,
    subsequentYears: `на последующие годы (${current + 3} и далее)`,
  };
};

/**
 * Годы для селекта «Планируемый год размещения извещения»: текущий и
 * следующие 4 года (всего 5). Этого достаточно и для основных, и для особых
 * позиций ПГ; лишние года в выпадающем списке только мешают выбору.
 */
export const placementYearOptions = (
  fromYear: number = new Date().getFullYear(),
  span = 4,
): Option<string>[] =>
  Array.from({ length: span + 1 }, (_, index) => {
    const year = fromYear + index;

    return { value: String(year), label: String(year) };
  });

// Обязательное общественное обсуждение (ст. 20 44-ФЗ) — селект, а не чекбокс:
// в форме ЕИС это графа «Да/Нет»
export const publicDiscussionOptions: Option<"false" | "true">[] = [
  { value: "false", label: "Не требуется" },
  { value: "true", label: "Требуется (ст. 20 44-ФЗ)" },
];

// Типовые коды видов расходов (приказ Минфина России № 82н) для селекта КВР
export const kvrOptions: Option<string>[] = [
  { value: "241", label: "241 — НИОКР" },
  { value: "242", label: "242 — Закупка товаров, работ, услуг в сфере ИКТ" },
  { value: "243", label: "243 — Капитальный ремонт" },
  { value: "244", label: "244 — Прочая закупка товаров, работ и услуг" },
  { value: "245", label: "245 — Оборона" },
  { value: "246", label: "246 — Безопасность" },
  { value: "247", label: "247 — Правосудие" },
  { value: "248", label: "248 — Органы государственной власти" },
  { value: "249", label: "249 — Органы местного самоуправления" },
  { value: "250", label: "250 — Учреждения" },
  { value: "251", label: "251 — Внебюджетные фонды" },
  { value: "252", label: "252 — Международные организации" },
  { value: "253", label: "253 — Иные организации" },
  { value: "290", label: "290 — Прочие расходы" },
];

export const planHeaderFields: ConfigurationInput<PurchasePlan>[] = [
  {
    label: { value: "Номер плана-графика" },
    input: { name: "planNumber", placeholder: "202603770123450001" },
  },
  {
    label: { value: "Год планирования" },
    input: { name: "planYear", placeholder: "2026" },
  },
  {
    label: { value: "Номер версии" },
    input: { name: "versionNumber", placeholder: "1" },
  },
  {
    label: { value: "Дата утверждения" },
    input: { name: "approvalDate", type: "date" },
  },
  {
    // XSD различает confirmDate (утверждение плана) и approveDate
    // (утверждение обоснования плана) — обе даты обязательны для выгрузки
    label: { value: "Дата утверждения обоснования плана" },
    input: { name: "approveDate", type: "date" },
  },
  {
    label: { value: "Утвердил (должность, ФИО)" },
    input: { name: "approvalAuthor", placeholder: "Главный врач И.И. Иванов" },
  },
  {
    label: { value: "Ответственный за планирование — должность" },
    input: {
      name: "responsibleContactInfo.position",
      placeholder: "Начальник отдела закупок",
    },
  },
  {
    label: { value: "Ответственный за планирование — ФИО" },
    input: {
      name: "responsibleContactInfo.fullName",
      placeholder: "Иванов Иван Иванович",
    },
  },
  {
    label: { value: "Ответственный за планирование — телефон" },
    input: {
      name: "responsibleContactInfo.phone",
      placeholder: "+7 (4722) 00-00-00",
    },
  },
  {
    label: { value: "Ответственный за планирование — email" },
    input: {
      name: "responsibleContactInfo.email",
      placeholder: "planning@example.ru",
    },
  },
  {
    label: { value: "Дата размещения в ЕИС" },
    input: { name: "publishDate", type: "date" },
  },
  {
    label: { value: "Ссылка на план-график в ЕИС" },
    input: {
      name: "eisUrl",
      placeholder: "https://zakupki.gov.ru/epz/buyer/purchasePlan/view.html",
    },
  },
  {
    label: { value: "Совокупный объём закупок, ₽" },
    input: { name: "totalAmount", placeholder: "12500000.00" },
  },
  {
    label: { value: "Единица измерения по ОКЕИ" },
    input: { name: "okeiCode", placeholder: "383" },
  },
  {
    label: { value: "Наименование единицы измерения" },
    input: { name: "okeiName", placeholder: "рубль" },
  },
  {
    label: { value: "Примечание" },
    input: { name: "remarks", placeholder: "Основание размещения заказа" },
  },
];

// Поля записи плана-графика в порядке граф формы ПГ (приказ 145/206н)
export const positionFields: ConfigurationInput<PurchasePlanPosition>[] = [
  {
    label: { value: "№ п/п" },
    input: { name: "serialNumber", placeholder: "1" },
  },
  {
    label: { value: "Уникальный номер позиции (формируется системой)" },
    input: { name: "uniqueNumber", placeholder: "202601442000018001000127" },
  },
  {
    label: { value: "Номер закупки, включенной в план-график" },
    input: { name: "purchaseNumber", placeholder: "0001" },
  },
  {
    label: { value: "Идентификационный код закупки (ИКЗ)" },
    input: {
      name: "identificationCode",
      placeholder: "3160300000357000000100000015П166",
    },
  },
  {
    label: { value: "Объект закупки" },
    input: {
      name: "objectOfPurchase",
      placeholder: "Поставка медицинского оборудования",
    },
  },
  {
    label: { value: "Планируемый год размещения извещения" },
    input: { name: "plannedPlacementYear", placeholder: "2026" },
  },
  {
    label: { value: "Объём финансового обеспечения, всего, ₽" },
    input: { name: "amountTotal", placeholder: "1250000.00" },
  },
  {
    label: { value: "Планируемые платежи на текущий финансовый год, ₽" },
    input: { name: "amountCurrentYear" },
  },
  {
    label: { value: "Планируемые платежи на первый год планового периода, ₽" },
    input: { name: "amountPlanPeriodFirstYear" },
  },
  {
    label: { value: "Планируемые платежи на второй год планового периода, ₽" },
    input: { name: "amountPlanPeriodSecondYear" },
  },
  {
    label: { value: "Планируемые платежи на последующие годы, ₽" },
    input: { name: "amountSubsequentYears" },
  },
  {
    label: { value: "Уполномоченный орган (учреждение)" },
    input: {
      name: "authorizedBodyName",
      placeholder: "Департамент здравоохранения города Москвы",
    },
  },
  {
    label: { value: "Организатор совместного конкурса (аукциона)" },
    input: { name: "jointOrganizerName" },
  },
  {
    label: { value: "Наименование объекта закупки" },
    input: {
      name: "objectName",
      placeholder: "Аппарат ультразвуковой диагностики экспертного класса",
    },
  },

  // КБК нужен для группировки записей ПГ по расходам и поиска по ним
  {
    label: { value: "КБК" },
    input: {
      name: "kbk",
      placeholder: "20011000000000000000",
    },
  },
  {
    label: { value: "Дата размещения записи (прохождения контроля)" },
    input: { name: "statusDate", type: "date" },
  },
];

// Поля ОКПД2 заполняются выбором из справочника (Okpd2Select), а не вводом с
// клавиатуры, поэтому они вынесены из positionFields и рисуются отдельно
export const okpd2FieldLabels = {
  code: "Код ОКПД2",
  name: "Наименование товара, работы, услуги по ОКПД2",
} as const;
