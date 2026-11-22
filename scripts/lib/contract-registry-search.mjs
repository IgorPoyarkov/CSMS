/**
 * Разбор публичного поиска реестра контрактов zakupki.gov.ru.
 *
 * Только открытые страницы: реестровый номер, статус, заказчик, номер и предмет
 * контракта, цена и даты. ЭЦП и токен ЕИС не нужны. Функции чистые — HTML
 * можно разбирать офлайн из снимка.
 */

const EIS = "https://zakupki.gov.ru/epz/contract";

export function buildContractSearchUrl({ inn = "", regNumber = "", page = 1 } = {}) {
  const params = new URLSearchParams({
    ...(regNumber ? { searchString: regNumber } : { customerINN: inn }),
    recordsPerPage: "_500",
    pageNumber: String(page),
    sortBy: "BY_MODIFY_DATE",
    sortDirection: "false",
  });
  return `${EIS}/search/results.html?${params}`;
}

/** Год зашит в реестровом номере: позиции 11–12 (например …26… → 2026). */
export function yearFromRegNumber(regNumber) {
  const value = String(regNumber ?? "");
  return /^\d{19}$/.test(value) ? 2000 + Number(value.slice(11, 13)) : 0;
}

function text(value) {
  return String(value ?? "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#8381;|₽/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^№\s*/, "")
    .trim();
}

function money(value) {
  const normalized = text(value)
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d{1,2})?/);
  return match ? match[0] : "";
}

function isoDate(value) {
  const match = text(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function statusOf(value) {
  const label = text(value).toLowerCase();
  if (label.includes("завершен")) return "completed";
  if (label.includes("прекращ") || label.includes("расторг")) return "terminated";
  if (label.includes("приостанов")) return "suspended";
  return "in_execution";
}

/** Значение поля по заголовку блока внутри одной карточки поиска. */
function fieldByTitle(entry, title, valueClass = "registry-entry__body-value") {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<div class="registry-entry__body-title">\\s*${escaped}\\s*</div>\\s*` +
      `<div class="${valueClass}"[^>]*>([\\s\\S]*?)</div>`,
    "i",
  );
  const match = entry.match(pattern);
  return match ? text(match[1].replace(/<[^>]+>/g, " ")) : "";
}

/** Предмет контракта лежит в блоке «Объекты закупки» другой разметки. */
function objectByTitle(entry, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<div class="d-flex lots-wrap-content__body__title">\\s*${escaped}\\s*</div>[\\s\\S]*?` +
      `<div class="d-flex lots-wrap-content__body__val"[^>]*>([\\s\\S]*?)</div>`,
    "i",
  );
  const match = entry.match(pattern);
  return match ? text(match[1].replace(/<[^>]+>/g, " ")) : "";
}

/** Дата из правого блока «Заключение контракта» / «Срок исполнения» и т.д. */
function dateByTitle(entry, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<div class="data-block__title">\\s*${escaped}\\s*</div>\\s*` +
      `<div class="data-block__value"[^>]*>([\\s\\S]*?)</div>`,
    "i",
  );
  const match = entry.match(pattern);
  return match ? isoDate(match[1].replace(/<[^>]+>/g, " ")) : "";
}

/**
 * Извлекаем карточки из HTML поиска. Возвращаем только записи с 19-значным
 * реестровым номером — остальные строки выдачи в реестр контрактов не попадают.
 */
export function parseContractSearchHtml(html) {
  const source = String(html ?? "");
  const entries = source.split(/<div class="search-registry-entry-block/).slice(1);
  return entries.flatMap((entry) => {
    const number = entry.match(/common-info\.html\?reestrNumber=(\d{19})/)?.[1];
    if (!number) return [];
    const status = text(
      entry.match(/registry-entry__header-mid__title">([\s\S]*?)<\/div>/)?.[1],
    );
    const price = text(entry.match(/price-block__value[^>]*>([\s\S]*?)<\/div>/)?.[1]);
    const contractNumber = fieldByTitle(entry, "Контракт");
    const contractName =
      objectByTitle(entry, "Объекты закупки") ||
      fieldByTitle(entry, "Наименование объекта закупки");
    return [{
      eisRegistryNumber: number,
      year: yearFromRegNumber(number),
      status: statusOf(status),
      statusLabel: status,
      customerName: fieldByTitle(entry, "Заказчик", "registry-entry__body-href"),
      contractNumber,
      contractName,
      contractPrice: money(price),
      contractDate: dateByTitle(entry, "Заключение контракта"),
      executionEndDate: dateByTitle(entry, "Срок исполнения"),
      eisPublishDate: dateByTitle(entry, "Размещен контракт в реестре контрактов"),
      updatedAt: dateByTitle(entry, "Обновлен контракт в реестре контрактов"),
    }];
  });
}
