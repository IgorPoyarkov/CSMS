// Временный скрипт: моковые сведения о привлечении СМП по контракту
// 2462904043926000011 (ОКУ «Курскавтодор», ремонт дороги «Курск — Борисоглебск»).
//
// Субподрядчики и номера договоров взяты из публичной карточки ЕИС этого
// контракта (`contractCardProjections`), поэтому ручные записи не спорят с
// выгрузкой: у всех пяти ИНН сверка реестра МСП даёт «в реестре».
//
// Что показывает набор:
//   * «ТРАНСКОМ» — договор 57,7 млн, акт + оплата на 28 млн и отклонённая
//     платёжка на 3 млн (в объём не идёт);
//   * «ДК Технический центр» — договор уже выгружен в ЕИС, акт и оплата полные;
//   * «ГИЛАРИС» — акт 4,27 млн, оплата 4,27 млн и вторая платёжка 2 млн ещё не
//     принята заказчиком;
//   * «АВАНГАРД» — декларация и акт без оплаты (объём по акту не закрыт);
//   * ИП Ильина — договор подан, но заказчиком не принят, документов нет.
//
// Запуск: node scripts/seed-smp-mock.mjs [--keep] [--no-percent]
// По умолчанию прежние записи контракта удаляются (повторный запуск не плодит
// дубли), а контракту выставляется процент привлечения 25% — ровно столько
// даёт требование ЕИС (96 614 228,68 ₽ от цены 386 456 914,70 ₽).
import { createPgPool, PG_SCHEMA } from "./lib/pg-store.mjs";

const API = process.env.PG_ADAPTER_URL || "http://localhost:3002";
const COLLECTION = "contractSmpRecords";
const CONTRACT_ID = "eis-2462904043926000011";
const ORGANIZATION_ID = 6;
const REQUIRED_PERCENT = "25";

const keep = process.argv.includes("--keep");
const setPercent = !process.argv.includes("--no-percent");
const pool = createPgPool();

const request = async (path, init) => {
  const response = await fetch(`${API}${path}`, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} → ${response.status} ${text}`,
    );
  }
  return text ? JSON.parse(text) : null;
};

const post = (doc) =>
  request(`/${COLLECTION}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });

const at = (date, time = "10:00") => `${date}T${time}`;
const now = new Date().toISOString();

const TRANSKOM =
  'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ПРОИЗВОДСТВЕННО-ТОРГОВАЯ КОМПАНИЯ "ТРАНСКОМ""';
const DKTECH =
  'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ДК ТЕХНИЧЕСКИЙ ЦЕНТР"';
const GILARIS = 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ГИЛАРИС"';
const AVANGARD = 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "АВАНГАРД"';
const ILINA = "ИЛЬИНА ОЛЕСЯ МИХАЙЛОВНА";

const common = {
  organizationId: ORGANIZATION_ID,
  contractId: CONTRACT_ID,
  okpd2Code: "42.11.20.200",
  priceType: "contract",
  unitPrice: "",
  isSmpSubject: true,
  isReplacementSubContract: false,
  paidEarlierThanContractSchedule: false,
  paidToSupplierDate: "",
  acceptanceSignedDate: "",
  sourceFileName: "",
  eisPublishDate: "",
  eisRecordNumber: "",
  comment: "",
  createdAt: now,
};

const contracts = [
  {
    key: "transkom",
    documentType: "subContract",
    documentNumber: "376/ТК/26",
    documentDate: "2026-05-22",
    amount: "57705000.00",
    subject:
      "Поставка и монтаж металлоконструкций и изделий из металла для устройства барьерного ограждения",
    period: "2026-06 — 2026-10",
    supplierName: TRANSKOM,
    supplierInn: "3245006478",
    supplierKpp: "324501001",
    receivedAt: at("2026-05-25", "11:30"),
    status: "accepted",
    supplierConfirmedAt: at("2026-05-25", "11:30"),
    supplierConfirmedBy: "Генеральный директор Меркулов С. П.",
    supplierConfirmedDocument: "Письмо № 218 от 25.05.2026",
    customerConfirmedAt: at("2026-05-28", "14:10"),
    customerConfirmedBy:
      "Начальник отдела исполнения контрактов Сотникова Е. Н.",
    customerConfirmedDocument: "Заключение о приёмке сведений от 28.05.2026",
  },
  {
    key: "dktech",
    documentType: "subContract",
    documentNumber: "60-С",
    documentDate: "2026-08-17",
    amount: "16402500.00",
    subject:
      "Поставка и монтаж автоматизированной системы управления дорожным движением (АСУДД)",
    period: "2026-09 — 2026-12",
    supplierName: DKTECH,
    supplierInn: "6155089771",
    supplierKpp: "615501001",
    receivedAt: at("2026-08-18", "09:40"),
    status: "pushedToEis",
    supplierConfirmedAt: at("2026-08-18", "09:40"),
    supplierConfirmedBy: "Директор Абрамов К. И.",
    supplierConfirmedDocument: "Письмо № 64 от 18.08.2026",
    customerConfirmedAt: at("2026-08-19", "16:25"),
    customerConfirmedBy:
      "Начальник отдела исполнения контрактов Сотникова Е. Н.",
    customerConfirmedDocument: "Заключение о приёмке сведений от 19.08.2026",
    eisPublishDate: "2026-08-20",
    eisRecordNumber: "2462904043926000011-0002",
  },
];

contracts.push(
  {
    key: "gilaris",
    documentType: "subContract",
    documentNumber: "7Р_26",
    documentDate: "2026-10-09",
    amount: "8538976.54",
    subject:
      "Выполнение работ по ремонту тротуара по ул. Союзной от дома № 351 до дома № 319",
    period: "2026-10 — 2026-11",
    supplierName: GILARIS,
    supplierInn: "4632306047",
    supplierKpp: "463201001",
    receivedAt: at("2026-10-10", "10:15"),
    status: "accepted",
    supplierConfirmedAt: at("2026-10-10", "10:15"),
    supplierConfirmedBy: "Директор Белых Р. В.",
    supplierConfirmedDocument: "Письмо № 31 от 10.10.2026",
    customerConfirmedAt: at("2026-10-13", "11:05"),
    customerConfirmedBy:
      "Начальник отдела исполнения контрактов Сотникова Е. Н.",
    customerConfirmedDocument: "Заключение о приёмке сведений от 13.10.2026",
  },
  {
    key: "avangard",
    documentType: "subContract",
    documentNumber: "09-07/АВНГ/26",
    documentDate: "2026-10-09",
    amount: "3532042.50",
    subject:
      "Поставка нерудных материалов (щебень, песок) для устройства оснований дорожной одежды",
    period: "2026-10 — 2026-12",
    supplierName: AVANGARD,
    supplierInn: "3100012686",
    supplierKpp: "310001001",
    receivedAt: at("2026-10-12", "08:30"),
    status: "accepted",
    supplierConfirmedAt: at("2026-10-12", "08:30"),
    supplierConfirmedBy: "Генеральный директор Шевцов А. Н.",
    supplierConfirmedDocument: "Письмо № 89 от 12.10.2026",
    customerConfirmedAt: at("2026-10-14", "15:40"),
    customerConfirmedBy:
      "Начальник отдела исполнения контрактов Сотникова Е. Н.",
    customerConfirmedDocument: "Заключение о приёмке сведений от 14.10.2026",
  },
  {
    key: "ilina",
    documentType: "subContract",
    documentNumber: "03/08/26-7Р",
    documentDate: "2026-08-03",
    amount: "2990900.00",
    subject:
      "Оказание услуг по работе строительных машин и механизмов с экипажем",
    period: "2026-08 — 2026-10",
    supplierName: ILINA,
    supplierInn: "462101919114",
    supplierKpp: "",
    receivedAt: at("2026-08-05", "13:00"),
    status: "submitted",
    supplierConfirmedAt: at("2026-08-05", "13:00"),
    supplierConfirmedBy: "Индивидуальный предприниматель Ильина О. М.",
    supplierConfirmedDocument: "Письмо № 14 от 05.08.2026",
  },
);

// Документы к договорам: `basis` — ключ договора, к которому прислан документ
const documents = [
  {
    basis: "transkom",
    documentType: "acceptance",
    documentNumber: "АКТ-3",
    documentDate: "2026-09-30",
    amount: "28000000.00",
    subject: "Металлоконструкции барьерного ограждения, ПК 148+00 — ПК 168+00",
    period: "2026-09",
    supplierName: TRANSKOM,
    supplierInn: "3245006478",
    supplierKpp: "324501001",
    receivedAt: at("2026-10-01", "09:20"),
    status: "accepted",
    acceptanceSignedDate: "2026-09-30",
    customerConfirmedAt: at("2026-10-05", "10:15"),
    customerConfirmedBy: "Ведущий инженер Гриднева О. В.",
    customerConfirmedDocument: "Проверка акта АКТ-3",
  },
  {
    basis: "transkom",
    documentType: "payment",
    documentNumber: "1204",
    documentDate: "2026-10-12",
    amount: "28000000.00",
    subject: "Оплата по акту АКТ-3",
    period: "2026-10",
    supplierName: TRANSKOM,
    supplierInn: "3245006478",
    supplierKpp: "324501001",
    receivedAt: at("2026-10-13", "11:40"),
    status: "accepted",
    paidToSupplierDate: "2026-10-12",
    customerConfirmedAt: at("2026-10-16", "12:00"),
    customerConfirmedBy: "Ведущий инженер Гриднева О. В.",
    customerConfirmedDocument: "Сверка платёжного поручения № 1204",
  },
  {
    basis: "transkom",
    documentType: "payment",
    documentNumber: "1188",
    documentDate: "2026-10-05",
    amount: "3000000.00",
    subject: "Оплата по договору № 376/ТК/26 (аванс)",
    period: "2026-10",
    supplierName: TRANSKOM,
    supplierInn: "3245006478",
    supplierKpp: "324501001",
    receivedAt: at("2026-10-06", "08:10"),
    status: "rejected",
    paidToSupplierDate: "2026-10-05",
    comment:
      "Отклонено: в назначении платежа указан другой договор, требуется повторная платёжка",
  },
  {
    basis: "dktech",
    documentType: "acceptance",
    documentNumber: "АКТ-9",
    documentDate: "2026-11-10",
    amount: "16402500.00",
    subject: "АСУДД: шкафы управления, детекторы транспорта, монтаж и пусконаладка",
    period: "2026-11",
    supplierName: DKTECH,
    supplierInn: "6155089771",
    supplierKpp: "615501001",
    receivedAt: at("2026-11-11", "10:05"),
    status: "accepted",
    acceptanceSignedDate: "2026-11-10",
    customerConfirmedAt: at("2026-11-13", "14:30"),
    customerConfirmedBy: "Ведущий инженер Гриднева О. В.",
    customerConfirmedDocument: "Проверка акта АКТ-9",
  },
  {
    basis: "dktech",
    documentType: "payment",
    documentNumber: "1388",
    documentDate: "2026-11-20",
    amount: "16402500.00",
    subject: "Оплата по акту АКТ-9",
    period: "2026-11",
    supplierName: DKTECH,
    supplierInn: "6155089771",
    supplierKpp: "615501001",
    receivedAt: at("2026-11-21", "09:35"),
    status: "accepted",
    paidToSupplierDate: "2026-11-20",
    customerConfirmedAt: at("2026-11-23", "10:10"),
    customerConfirmedBy: "Ведущий инженер Гриднева О. В.",
    customerConfirmedDocument: "Сверка платёжного поручения № 1388",
  },
];

documents.push(
  {
    basis: "gilaris",
    documentType: "acceptance",
    documentNumber: "АКТ-4",
    documentDate: "2026-10-30",
    amount: "4269488.27",
    subject: "Ремонт тротуара по ул. Союзной: устройство покрытия и бордюра",
    period: "2026-10",
    supplierName: GILARIS,
    supplierInn: "4632306047",
    supplierKpp: "463201001",
    receivedAt: at("2026-11-02", "09:10"),
    status: "accepted",
    acceptanceSignedDate: "2026-10-30",
    customerConfirmedAt: at("2026-11-05", "10:45"),
    customerConfirmedBy: "Ведущий инженер Гриднева О. В.",
    customerConfirmedDocument: "Проверка акта АКТ-4",
  },
  {
    basis: "gilaris",
    documentType: "payment",
    documentNumber: "1290",
    documentDate: "2026-11-06",
    amount: "4269488.27",
    subject: "Оплата по акту АКТ-4",
    period: "2026-11",
    supplierName: GILARIS,
    supplierInn: "4632306047",
    supplierKpp: "463201001",
    receivedAt: at("2026-11-09", "11:20"),
    status: "accepted",
    paidToSupplierDate: "2026-11-06",
    customerConfirmedAt: at("2026-11-11", "15:00"),
    customerConfirmedBy: "Ведущий инженер Гриднева О. В.",
    customerConfirmedDocument: "Сверка платёжного поручения № 1290",
  },
  {
    basis: "gilaris",
    documentType: "payment",
    documentNumber: "1421",
    documentDate: "2026-11-21",
    amount: "2000000.00",
    subject: "Частичная оплата по договору № 7Р_26 (следующий этап)",
    period: "2026-11",
    supplierName: GILARIS,
    supplierInn: "4632306047",
    supplierKpp: "463201001",
    receivedAt: at("2026-11-23", "08:40"),
    status: "submitted",
    paidToSupplierDate: "2026-11-21",
    comment: "Прислано в пятницу вечером, заказчик ещё не проверил",
  },
  {
    basis: "avangard",
    documentType: "declaration",
    documentNumber: "Д-5",
    documentDate: "2026-10-09",
    amount: "",
    subject:
      "Декларация о принадлежности к субъектам малого предпринимательства",
    period: "2026-10",
    supplierName: AVANGARD,
    supplierInn: "3100012686",
    supplierKpp: "310001001",
    receivedAt: at("2026-10-12", "08:30"),
    status: "accepted",
    customerConfirmedAt: at("2026-10-14", "15:40"),
    customerConfirmedBy:
      "Начальник отдела исполнения контрактов Сотникова Е. Н.",
    customerConfirmedDocument: "Проверка декларации Д-5",
  },
  {
    basis: "avangard",
    documentType: "acceptance",
    documentNumber: "АКТ-12",
    documentDate: "2026-11-18",
    amount: "1766021.25",
    subject: "Щебень и песок для оснований дорожной одежды, первая партия",
    period: "2026-11",
    supplierName: AVANGARD,
    supplierInn: "3100012686",
    supplierKpp: "310001001",
    receivedAt: at("2026-11-19", "10:30"),
    status: "submitted",
    acceptanceSignedDate: "2026-11-18",
    comment: "Акт прислан, оплаты ещё не было — объём по нему не закрыт",
  },
);

/** Сумма по типу документа без отклонённых — как считает `smpDocumentsAmount`. */
const sumOf = (type, list, includeRejected = false) =>
  list
    .filter(
      (item) =>
        item.documentType === type &&
        (includeRejected || item.status !== "rejected"),
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

// Контракт: цена и требование ЕИС — нужны, чтобы ожидаемый прогресс посчитался
// по тем же числам, что покажет карточка
const contractRow = await pool.query(
  `SELECT doc FROM ${PG_SCHEMA}.documents
   WHERE collection = 'contractRegistry' AND doc_id = $1`,
  [CONTRACT_ID],
);
const contract = contractRow.rows[0]?.doc;
if (!contract) {
  throw new Error(`В базе нет контракта ${CONTRACT_ID}`);
}
const projectionRow = await pool.query(
  `SELECT doc FROM ${PG_SCHEMA}.documents
   WHERE collection = 'contractCardProjections' AND doc_id = $1`,
  ["2462904043926000011"],
);
const eisRequirementSum = Number(
  projectionRow.rows[0]?.doc?.Smp?.[0]?.RequirementSum ?? 0,
);
console.log(
  `Контракт ${contract.contractNumber}: цена ${Number(
    contract.contractPrice,
  ).toLocaleString("ru-RU")} ₽, требование ЕИС ${eisRequirementSum.toLocaleString(
    "ru-RU",
  )} ₽`,
);

// Процент привлечения: у контракта он не заполнен, а из карточки ЕИС приходит
// только сумма требования — восстанавливаем 25% и сохраняем, иначе прогресс-бар
// не посчитает требуемый объём
if (setPercent) {
  const patched = await request(
    `/contractRegistry/${encodeURIComponent(CONTRACT_ID)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smpRequiredPercent: REQUIRED_PERCENT }),
    },
  );
  console.log(`smpRequiredPercent = ${patched.smpRequiredPercent}% (--no-percent отключает)`);
}

// Повторный запуск не должен плодить дубли: чистим записи этого контракта
const existing = await request(`/${COLLECTION}?contractId=${CONTRACT_ID}`);
if (existing.length > 0) {
  if (keep) {
    console.log(`Оставлено прежних записей: ${existing.length} (--keep)`);
  } else {
    for (const record of existing) {
      await request(`/${COLLECTION}/${encodeURIComponent(record.id)}`, {
        method: "DELETE",
      });
    }
    console.log(`Удалено прежних записей: ${existing.length}`);
  }
}

const created = new Map();

for (const contractDoc of contracts) {
  const { key, ...payload } = contractDoc;
  const saved = await post({ ...common, ...payload });
  created.set(key, saved);
  console.log(
    `+ договор № ${saved.documentNumber} — ${saved.supplierName.slice(0, 40)}… — id ${saved.id}, ${saved.status}`,
  );
}

for (const documentDoc of documents) {
  const { basis, ...payload } = documentDoc;
  const parent = created.get(basis);
  const saved = await post({
    ...common,
    ...payload,
    subContractRecordId: parent.id,
  });
  console.log(
    `  └ ${saved.documentType} № ${saved.documentNumber} — ${Number(
      saved.amount || 0,
    ).toLocaleString("ru-RU")} ₽ → договор № ${parent.documentNumber}, ${saved.status}`,
  );
}

const acceptedContracts = contracts.filter(
  (item) => item.status === "accepted" || item.status === "pushedToEis",
);
const contracted = acceptedContracts.reduce(
  (sum, item) => sum + Number(item.amount),
  0,
);
const paid = sumOf("payment", documents);
const accepted = sumOf("acceptance", documents);
const rejected = sumOf("payment", documents, true) - paid;
const price = Number(contract.contractPrice);
const percent = Number(REQUIRED_PERCENT);
const required = Math.round(price * percent) / 100;
const format = (value) => value.toLocaleString("ru-RU");

console.log("\nОжидаемый расчёт в карточке:");
console.log(`  договоров с СМП принято: ${format(contracted)} ₽`);
console.log(`  оплачено субподрядчикам: ${format(paid)} ₽ (отклонено ${format(rejected)} ₽)`);
console.log(`  принято по актам:        ${format(accepted)} ₽`);
console.log(
  `  требуется ${percent}%: ${format(required)} ₽, прогресс ${
    Math.round((paid / required) * 10000) / 100
  }%`,
);

await pool.end();

