/**
 * Сквозная связь ЕИС: позиция ПГ → извещения → контракты → оплата.
 *
 * Главный ключ — уникальный номер позиции плана-графика (`uniqueNumber`).
 * Из одной позиции ПГ могут быть сформированы несколько извещений (переторг,
 * отмена, повторный конкурс), поэтому связь «позиция → извещение» один-ко-многим.
 *
 * Контракт привязан к той же позиции через ИКЗ: year + ИНН + КПП + код позиции
 * (разряды 20–26). Разряды 27–36 меняются при перезаключении, поэтому полное
 * совпадение ИКЗ — лишь один из вариантов, а не единственный. Расторгнутый
 * контракт остаётся в цепочке: часть исполнения и оплата по его ИКЗ сохраняются
 * у первого поставщика. Неоднозначные связи не выдумываются: если позицию не
 * удалось определить однозначно, причина пишется в `eisImport`.
 *
 * Платежи связываются по точному ИКЗ контракта; если ИКЗ устарел после
 * перезаключения — по ИКЗ предыдущего контракта той же цепочки.
 *
 * Дополнительно из извещений берутся ответственные должностные лица: они
 * добавляются в штатное расписание с ролью члена КС (из структурного
 * подразделения) или инициатора закупки (вне КС). Выдуманные данные не используются.
 *
 * Использование:
 *   node scripts/link-eis-chain.mjs [--db path/to/db.json] [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

export function parseArgs(argv) {
  const args = { db: path.join(ROOT, "db.json"), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (argv[i] === "--db" && argv[i + 1]) {
      args.db = path.resolve(argv[++i]);
    }
  }
  return args;
}

const text = (value) => String(value ?? "").trim();
const id = (value) => (value === null || value === undefined || text(value) === "" ? null : String(value));

function money(value) {
  if (typeof value === "number") return value;
  const normalized = text(value).replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

const sameMoney = (left, right) =>
  Number.isFinite(money(left)) &&
  Number.isFinite(money(right)) &&
  Math.abs(money(left) - money(right)) < 0.01;

/** Стабильный ключ позиции ПГ внутри ИКЗ: год + ИНН + КПП + код позиции. */
export function ikzPositionKey(ikz) {
  const value = text(ikz);
  if (!/^\d{36}$/.test(value)) return null;
  return [
    value.slice(0, 2),
    value.slice(3, 13),
    value.slice(13, 19),
    value.slice(19, 26),
  ].join("|");
}

const ikzPrefix26 = (ikz) => text(ikz).slice(0, 26);

/** Аккуратная мера совпадения названий: только целые слова (>= 4 символов). */
function nameSimilarity(left, right) {
  const words = (value) =>
    text(value)
      .toLowerCase()
      .replace(/[^a-zа-я0-9 ]+/gi, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);
  const a = new Set(words(left));
  const b = new Set(words(right));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

const fioOf = (employee) =>
  [employee?.employee?.surname, employee?.employee?.name, employee?.employee?.patronymic]
    .filter(Boolean)
    .join(" ");

function parseFio(value) {
  const parts = text(value).split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { surname: parts[0], name: parts[1], patronymic: parts.slice(2).join(" ") };
}

// ─── Позиции плана-графика ─────────────────────────────────────────────────

function indexPlanPositions(db) {
  const byUnique = new Map();
  const byKey = new Map();
  const byPrefix = new Map();

  for (const plan of Array.isArray(db.purchasePlans) ? db.purchasePlans : []) {
    for (const position of Array.isArray(plan.positions) ? plan.positions : []) {
      const entry = {
        plan,
        position,
        uniqueNumber: text(position.uniqueNumber),
        ikz: text(position.identificationCode),
        key: ikzPositionKey(position.identificationCode),
      };
      if (entry.uniqueNumber) byUnique.set(entry.uniqueNumber, entry);
      if (entry.key) {
        const list = byKey.get(entry.key) ?? [];
        list.push(entry);
        byKey.set(entry.key, list);
      }
      if (entry.ikz) {
        const prefix = ikzPrefix26(entry.ikz);
        const list = byPrefix.get(prefix) ?? [];
        list.push(entry);
        byPrefix.set(prefix, list);
      }
    }
  }

  return { byUnique, byKey, byPrefix };
}

function oneEntry(entries) {
  return entries && entries.length === 1 ? entries[0] : null;
}

/** Найти позицию ПГ по извещению: сначала уникальный номер, затем ИКЗ. */
function findPositionForNotice(notice, index) {
  const unique = text(notice.generalInfo?.positionUniqueNumber);
  if (unique && index.byUnique.has(unique)) {
    return { entry: index.byUnique.get(unique), method: "positionUniqueNumber" };
  }

  const ikz = text(notice.generalInfo?.ikz ?? notice.ikz);
  if (ikz) {
    const byPrefix = oneEntry(index.byPrefix.get(ikzPrefix26(ikz)));
    if (byPrefix) return { entry: byPrefix, method: "ikzPrefix26" };

    const byKey = oneEntry(index.byKey.get(ikzPositionKey(ikz)));
    if (byKey) return { entry: byKey, method: "ikzPositionKey" };
  }

  // Уникальный номер есть, но сама позиция ещё не импортирована: сохраняем его
  // как ключ, чтобы связать извещения между собой хотя бы по номеру позиции.
  if (unique) return { entry: null, uniqueNumber: unique, method: "positionUniqueNumberOnly" };
  return { entry: null, uniqueNumber: null, method: "not_found" };
}

/** Найти позицию ПГ для контракта. */
function findPositionForContract(contract, index, noticesByPosition) {
  const explicit = text(contract.eisImport?.planPositionUniqueNumber);
  if (explicit && index.byUnique.has(explicit)) {
    return { entry: index.byUnique.get(explicit), method: "eisImport" };
  }

  // Явная связь через процедуру (надёжнее совпадения названий).
  const procurementId = id(contract.procurementId);
  if (procurementId) {
    for (const [unique, notices] of noticesByPosition) {
      if (notices.some((notice) => id(notice.procurementId) === procurementId)) {
        const entry = index.byUnique.get(unique);
        if (entry) return { entry, method: "procurementId" };
      }
    }
  }

  const key = ikzPositionKey(contract.ikz);
  const entries = key ? (index.byKey.get(key) ?? []) : [];
  if (entries.length === 1) return { entry: entries[0], method: "ikzPositionKey" };
  if (entries.length > 1) {
    const name = text(contract.contractName);
    const price = money(contract.contractPrice);
    const ranked = entries
      .map((entry) => ({
        entry,
        score:
          nameSimilarity(name, entry.position.objectOfPurchase) +
          (sameMoney(price, entry.position.amountTotal ?? entry.position.nmck) ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    if (ranked[0] && ranked[0].score > 1 && ranked[0].score > (ranked[1]?.score ?? 0)) {
      return { entry: ranked[0].entry, method: "ikzPositionKeyAndName" };
    }
  }
  return { entry: null, uniqueNumber: null, method: "not_found" };
}

// ─── Извещения и контракты ─────────────────────────────────────────────────

export function linkNoticesToContracts(db) {
  const notices = Array.isArray(db.notices) ? db.notices : [];
  const contracts = Array.isArray(db.contractRegistry) ? db.contractRegistry : [];
  const index = indexPlanPositions(db);
  const noticesByPosition = new Map();
  const contractsByPosition = new Map();

  // 1. Позиция ПГ → все извещения этой позиции.
  for (const notice of notices) {
    const found = findPositionForNotice(notice, index);
    const unique = found.entry?.uniqueNumber ?? found.uniqueNumber;
    notice.eisImport = {
      ...(notice.eisImport ?? {}),
      planPositionLink: {
        status: found.entry ? "linked" : "position_not_imported",
        method: found.method,
        planPositionUniqueNumber: unique,
        planId: found.entry ? id(found.entry.plan.id) : null,
        positionId: found.entry ? id(found.entry.position.id) : null,
      },
    };
    if (found.entry) {
      const gi = notice.generalInfo ?? (notice.generalInfo = {});
      gi.plan2020Number = text(found.entry.plan.planNumber) || gi.plan2020Number;
      gi.positionUniqueNumber = found.entry.uniqueNumber || gi.positionUniqueNumber;
      gi.positionSerialNumber = text(found.entry.position.serialNumber) || gi.positionSerialNumber;
    }
    if (unique) {
      const list = noticesByPosition.get(unique) ?? [];
      list.push(notice);
      noticesByPosition.set(unique, list);
    }
  }

  // 2. Контракты распределяем по тем же позициям ПГ.
  for (const contract of contracts) {
    const found = findPositionForContract(contract, index, noticesByPosition);
    const unique = found.entry?.uniqueNumber ?? null;
    contract.eisImport = {
      ...(contract.eisImport ?? {}),
      planPositionLink: {
        status: found.entry ? "linked" : "not_found",
        method: found.method,
        planPositionUniqueNumber: unique,
        planId: found.entry ? id(found.entry.plan.id) : null,
        positionId: found.entry ? id(found.entry.position.id) : null,
      },
    };
    if (unique) {
      const list = contractsByPosition.get(unique) ?? [];
      list.push(contract);
      contractsByPosition.set(unique, list);
    }
  }

  // 3. Внутри позиции упорядочиваем контракты по дате: расторгнутый + новый —
  //    это цепочка перезаключения, а не два независимых контракта.
  const reawardChains = new Map();
  for (const [unique, list] of contractsByPosition) {
    const sorted = [...list].sort((a, b) =>
      text(a.contractDate).localeCompare(text(b.contractDate)),
    );
    contractsByPosition.set(unique, sorted);
    if (sorted.length === 2) {
      const [first, second] = sorted;
      const related =
        text(first.contractName) === text(second.contractName) ||
        nameSimilarity(first.contractName, second.contractName) > 0.6 ||
        sameMoney(first.contractPrice, second.contractPrice);
      if (related) {
        first.eisImport.contractChain = {
          ...(first.eisImport.contractChain ?? {}),
          successorContractId: id(second.id),
        };
        second.eisImport.contractChain = {
          ...(second.eisImport.contractChain ?? {}),
          previousContractId: id(first.id),
        };
        reawardChains.set(unique, [first, second]);
      }
    }
  }

  // 4. Собираем связи от извещения ко всем контрактам его позиции.
  const report = [];
  const usedProcurements = new Set();

  for (const notice of notices) {
    const link = notice.eisImport.planPositionLink;
    const unique = link.planPositionUniqueNumber;
    const siblings = unique ? (noticesByPosition.get(unique) ?? [notice]) : [notice];
    const candidates = unique ? (contractsByPosition.get(unique) ?? []) : [];
    const noticeIkz = text(notice.generalInfo?.ikz ?? notice.ikz);

    const scored = candidates.map((contract) => {
      let method = "positionOnly";
      if (text(contract.ikz) === noticeIkz && noticeIkz) method = "exactIkz";
      else if (sameMoney(contract.contractPrice, notice.generalInfo?.nmck)) method = "positionAndPrice";
      else if (id(contract.procurementId) === id(notice.procurementId) && id(notice.procurementId)) method = "procurementId";
      else if (candidates.length === 1) method = "singlePositionContract";
      return { contract, method };
    });
    const priority = { exactIkz: 4, procurementId: 3, positionAndPrice: 2, singlePositionContract: 1, positionOnly: 0 };
    scored.sort(
      (a, b) =>
        priority[b.method] - priority[a.method] ||
        text(b.contract.contractDate).localeCompare(text(a.contract.contractDate)),
    );

    const primary = scored[0]?.contract ?? null;
    const primaryMethod = scored[0]?.method ?? "not_found";
    const contractIds = candidates.map((contract) => id(contract.id)).filter(Boolean);
    if (primary) {
      const procurementId = id(notice.procurementId) ?? `eis-${text(notice.generalInfo?.noticeNumber) || text(notice.id)}`;
      notice.procurementId = procurementId;
      if (!usedProcurements.has(procurementId)) {
        primary.procurementId = procurementId;
        usedProcurements.add(procurementId);
      }
      notice.contractId = id(primary.id);
      if (contractIds.length > 1) notice.contractIds = contractIds;
      else delete notice.contractIds;

      const procurement = (db.procurements ?? []).find((item) => id(item.id) === procurementId);
      if (procurement) procurement.contractId = id(primary.id);
    } else {
      delete notice.contractId;
      delete notice.contractIds;
    }

    notice.eisImport.contractLink = {
      status: primary ? "linked" : "not_found",
      contractId: id(primary?.id),
      contractIds,
      method: primaryMethod,
      candidates: candidates.length,
      noticesOnPosition: siblings.length,
      reawardChain: reawardChains.has(unique),
      reason: primary
        ? null
        : candidates.length === 0
          ? "Контракты этой позиции плана-графика в реестре отсутствуют"
          : "Не удалось однозначно выбрать контракт",
    };

    for (const { contract } of scored) {
      contract.eisImport.noticeIds = unique
        ? uniqueArray([...(contract.eisImport.noticeIds ?? []), ...siblings.map((item) => id(item.id)).filter(Boolean)])
        : contract.eisImport.noticeIds ?? [];
      contract.eisImport.noticeCount = siblings.length;
    }

    report.push({
      notice: text(notice.generalInfo?.noticeNumber) || id(notice.id),
      planPositionUniqueNumber: unique,
      noticesOnPosition: siblings.length,
      contractId: id(primary?.id),
      contractIds,
      method: primaryMethod,
      candidates: candidates.length,
      reawardChain: reawardChains.has(unique),
    });
  }

  return report;
}

const uniqueArray = (values) => [...new Set(values)];

// ─── Оплата ────────────────────────────────────────────────────────────────

/**
 * Платёж хранит ИКЗ контракта. Если после перезаключения ИКЗ изменился, ищем
 * платёж по ИКЗ предыдущего контракта той же позиции ПГ. Прямая ссылка
 * `contractId` всегда имеет приоритет.
 */
export function linkContractPayments(db) {
  const payments = Array.isArray(db.contractPayments) ? db.contractPayments : [];
  const contracts = Array.isArray(db.contractRegistry) ? db.contractRegistry : [];
  const byId = new Map(contracts.map((contract) => [id(contract.id), contract]));
  const byIkz = new Map();
  for (const contract of contracts) {
    const ikz = text(contract.ikz);
    if (!ikz) continue;
    const list = byIkz.get(ikz) ?? [];
    list.push(contract);
    byIkz.set(ikz, list);
  }

  const report = [];
  for (const payment of payments) {
    const paymentIkz = text(payment.ikz);
    let contract = id(payment.contractId) ? byId.get(id(payment.contractId)) : null;
    let method = contract ? "contractId" : null;

    if (!contract && paymentIkz && byIkz.has(paymentIkz)) {
      const candidates = byIkz.get(paymentIkz);
      if (candidates.length === 1) {
        contract = candidates[0];
        method = "ikz";
      }
    }

    if (!contract && paymentIkz) {
      // ИКЗ может принадлежать предыдущему контракту цепочки перезаключения.
      for (const candidate of contracts) {
        const previousId = id(candidate.eisImport?.contractChain?.previousContractId);
        if (!previousId) continue;
        const previous = byId.get(previousId);
        if (text(previous?.ikz) === paymentIkz) {
          contract = candidate;
          method = "ikzPreviousContract";
          break;
        }
      }
    }

    if (contract) {
      payment.contractId = id(contract.id);
      if (!paymentIkz) payment.ikz = text(contract.ikz);
      payment.eisImport = {
        ...(payment.eisImport ?? {}),
        contractLink: { status: "linked", contractId: id(contract.id), method },
      };
    } else {
      payment.eisImport = {
        ...(payment.eisImport ?? {}),
        contractLink: { status: "not_found", method: "not_found" },
      };
    }

    report.push({
      payment: id(payment.id) ?? text(payment.paymentDocumentNumber),
      contractId: id(contract?.id),
      method: method ?? "not_found",
    });
  }

  return report;
}

// ─── Ответственные должностные лица из извещений ──────────────────────────

const STAFF_SOURCE = "eis-notice";

function employeePhone(notice) {
  const phone = notice.contactInfo?.phoneNum;
  if (!phone) return text(notice.contactInfo?.phone);
  return [phone.countryCode, phone.cityCode, phone.num, phone.numExt]
    .filter(Boolean)
    .join("-");
}

/**
 * Добавляем ответственных из извещений в штатное расписание. Распределение
 * ролей идёт через структуру: сотрудник подразделения КС — член службы,
 * сотрудник подразделения заказчика — инициатор закупки. Отдельных учётных
 * записей и паролей не создаём: это публичные сведения из карточек ЕИС.
 */
export function syncNoticeResponsibleStaff(db) {
  const notices = Array.isArray(db.notices) ? db.notices : [];
  const employees = Array.isArray(db.employees) ? (db.employees ??= []) : [];
  const units = Array.isArray(db.structuralUnits) ? (db.structuralUnits ??= []) : [];
  const services = Array.isArray(db.contractServices) ? db.contractServices : [];
  const service = services.find((item) => item.organizationId === db.organizations?.[0]?.id) ?? services[0];
  const csUnitId = id(service?.structuralUnitId) ?? id(units[0]?.id) ?? "33";
  const organizationId = service?.organizationId ?? db.organizations?.[0]?.id;

  // КС в демо-БД создана из структурного подразделения заказчика (п. 2.1
  // приказа Минфина России № 158н), а не из списка работников вручную.
  if (service) {
    service.creationMethod = "structural_unit";
    service.structuralUnitId = csUnitId;
    service.members = [];
    const remark = "КС создана из структурного подразделения; состав — работники подразделения";
    if (!text(service.remarks).includes("структурного подразделения")) {
      service.remarks = text(service.remarks) ? `${service.remarks}; ${remark}` : remark;
    }
  }

  let initiatorUnit = units.find((unit) => text(unit.name).includes("инициатор"));
  if (!initiatorUnit) {
    const nextId = Math.max(0, ...units.map((unit) => Number(unit.id) || 0)) + 1;
    initiatorUnit = {
      id: nextId,
      name: "Подразделение заказчика (инициаторы закупок)",
      conventionalSymbol: "ПЗ",
      organizationId,
      eisImport: { source: STAFF_SOURCE },
    };
    units.push(initiatorUnit);
  }

  const nextEmployeeId = Math.max(0, ...employees.map((item) => Number(item.id) || 0)) + 1;
  const added = [];
  const byNotice = new Map();

  for (const notice of notices) {
    const fio =
      parseFio(text(notice.noticeState?.createdByFullName)) ??
      parseFio(
        [
          notice.contactInfo?.placerSurname,
          notice.contactInfo?.placerName,
          notice.contactInfo?.placerFathername,
        ]
          .filter(Boolean)
          .join(" "),
      );
    if (!fio) continue;
    const fullName = [fio.surname, fio.name, fio.patronymic].filter(Boolean).join(" ");
    const email = text(notice.contactInfo?.placerEmail).toLowerCase();
    const existing =
      employees.find((item) => email && text(item.email).toLowerCase() === email) ??
      employees.find((item) => fioOf(item) === fullName);
    if (existing) {
      byNotice.set(text(notice.generalInfo?.noticeNumber), existing);
      continue;
    }

    // Работники контрактной службы узнаются по служебному адресу; остальные
    // ответственные — инициаторы закупок из подразделения заказчика.
    const inCs = /ctu\.|zakup|ks\./i.test(email);
    const employee = {
      id: nextEmployeeId + added.length,
      organizationId,
      employee: fio,
      email: text(notice.contactInfo?.placerEmail),
      employeeNumber: String(nextEmployeeId + added.length).padStart(3, "0"),
      position: inCs ? "Специалист контрактной службы" : "Инициатор закупки",
      phone: employeePhone(notice),
      structuralUnitId: id(inCs ? csUnitId : initiatorUnit.id),
      eisImport: {
        source: STAFF_SOURCE,
        noticeNumbers: [text(notice.generalInfo?.noticeNumber)].filter(Boolean),
        role: inCs ? "contract_service_member" : "purchase_initiator",
      },
    };
    employees.push(employee);
    added.push(employee);
    byNotice.set(text(notice.generalInfo?.noticeNumber), employee);
  }

  return {
    added: added.map((employee) => ({
      id: employee.id,
      fullName: fioOf(employee),
      role: employee.eisImport.role,
    })),
    byNotice,
    contractService: { id: id(service?.id), creationMethod: service?.creationMethod, structuralUnitId: csUnitId },
  };
}

// ─── Задачи ответственных лиц ──────────────────────────────────────────────

const EIS = "https://zakupki.gov.ru";

const dateFromIso = (value) => text(value).match(/(\d{4}-\d{2}-\d{2})/)?.[0] ?? "";
const moneyString = (value) =>
  Number.isFinite(money(value)) ? money(value).toFixed(2) : "0.00";

/**
 * Демо-задачи по импортированным планам, извещениям и контрактам.
 *
 * Задачи по извещению получает ответственное лицо из карточки ЕИС; задачи по
 * плану и контроль оплаты по ИКЗ остаются у руководителя КС. Поэтому у
 * сотрудников с разными ролями (член КС и инициатор закупки) разные задания.
 */
export function buildNoticeTasks({
  plans = [],
  notices = [],
  contracts = [],
  org = {},
  head = null,
  staffByNotice = new Map(),
  count = 0,
}) {
  const templates = {
    plan: {
      functionCode: "planning_place_plan",
      title: (target) => `Сверить позиции плана-графика ${target.number} с ЕИС`,
      description: (target) =>
        `Проверить ${target.positions ?? 0} позиций плана-графика ${target.number}, оформить замечания по расхождениям.`,
    },
    notice: [
      {
        functionCode: "supplier_determination_notice",
        title: (target) => `Проверить извещение №${target.number} перед размещением`,
        description: (target) =>
          `Сверить НМЦК ${moneyString(target.nmck)} ₽, ИКЗ, КТРУ/ОКПД2 и сроки подачи заявок по извещению №${target.number}.`,
      },
      {
        functionCode: "purchase_description",
        title: (target) => `Подготовить обоснование НМЦК по закупке №${target.number}`,
        description: (target) =>
          `Подготовить расчёт НМЦК ${moneyString(target.nmck)} ₽ по объекту «${target.name}» по правилам ст. 22 Закона № 44-ФЗ.`,
      },
      {
        functionCode: "contract_conclusion_placing",
        title: (target) => `Подготовить проект контракта по извещению №${target.number}`,
        description: (target) =>
          `Подготовить проект контракта, проверить обеспечение и сроки исполнения по закупке «${target.name}».`,
      },
    ],
    payment: {
      functionCode: "contract_execution_payment",
      title: (target) => `Сверить оплату по ИКЗ контракта ${target.number}`,
      description: (target) =>
        `Проверить платежи по ИКЗ ${target.ikz}: суммы, даты и соответствие этапам исполнения контракта «${target.name}».`,
    },
  };

  const targets = [
    ...plans.map((plan) => ({
      kind: "plan",
      number: text(plan.planNumber),
      positions: plan.positions?.length ?? 0,
      name: plan.positions?.[0]?.objectOfPurchase ?? text(plan.planNumber),
      nmck: money(plan.totalAmount),
      dueDate: text(plan.publishDate),
      assignee: head,
    })),
    ...notices.map((notice) => {
      const number = text(notice.generalInfo?.noticeNumber ?? notice.externalId);
      return {
        kind: "notice",
        number,
        name: text(notice.generalInfo?.orderName),
        nmck: money(notice.generalInfo?.nmck),
        dueDate: dateFromIso(notice.generalInfo?.publishDTInEIS),
        assignee: staffByNotice.get(number) ?? head,
      };
    }),
    ...contracts.map((contract) => ({
      kind: "payment",
      number: text(contract.eisRegistryNumber || contract.contractNumber),
      name: text(contract.contractName),
      nmck: money(contract.contractPrice),
      dueDate: dateFromIso(contract.executionEndDate),
      ikz: text(contract.ikz),
      eisSource: text(contract.eisUrl),
      assignee: head,
    })),
  ];

  const headName = fioOf(head);
  const today = new Date().toISOString().slice(0, 10);
  const result = [];

  for (let i = 0; i < (count || targets.length); i++) {
    const target = targets[i % targets.length];
    if (!target) break;
    const step =
      target.kind === "plan"
        ? templates.plan
        : target.kind === "payment"
          ? templates.payment
          : templates.notice[i % templates.notice.length];
    const assignee = target.assignee ?? head;
    const due = new Date(`${target.dueDate || today}T00:00:00Z`);
    due.setDate(due.getDate() + 7 + (i % 3) * 3);
    result.push({
      id: 1001 + i,
      organizationId: org.id,
      title: step.title(target),
      description: step.description(target),
      status: i % 5 === 0 ? "completed" : i % 3 === 0 ? "in_progress" : "pending",
      origin: "head",
      functionCode: step.functionCode,
      order158nPoolCode: step.functionCode,
      order158nClause: `Раздел III, п. ${(i % 5) + 1}`,
      legalBasis: "п. 2.4 Типового положения (Приказ Минфина России № 233н)",
      requiredInputs: [
        "Карточка ЕИС",
        target.kind === "plan"
          ? "Позиции плана-графика"
          : target.kind === "payment"
            ? "Реестр контрактов и платежи"
            : "Печатная форма извещения",
      ],
      completionCriteria: "Сведения сверены с ЕИС, замечания устранены",
      steps: [],
      assigneeId: assignee?.id,
      assigneeName: fioOf(assignee) || headName,
      executorRole: assignee?.eisImport?.role ?? "contract_service_head",
      assignedByEmployeeId: head?.id,
      assignedByName: headName,
      dueDate: due.toISOString().slice(0, 10),
      createdAt: today,
      startedAt: "",
      completedAt: i % 5 === 0 ? today : "",
      result: i % 5 === 0 ? "Сверка выполнена по публичным данным ЕИС" : "",
      mock: true,
      eisSource:
        target.eisSource ??
        (target.kind === "plan"
          ? `${EIS}/epz/orderplan/pg2020/general-info.html?plan-number=${target.number}`
          : `${EIS}/epz/order/notice/printForm/view.html?regNumber=${target.number}`),
    });
  }

  // Контракт может попасть в выборку и через извещение, и напрямую: контроль
  // оплаты по одному ИКЗ не дублируем.
  const seenPayments = new Set();
  return result.filter((task) => {
    if (task.functionCode !== "contract_execution_payment") return true;
    if (seenPayments.has(task.eisSource)) return false;
    seenPayments.add(task.eisSource);
    return true;
  });
}

/** Пересобрать только демо-задачи; настоящие задачи пользователя не трогаем. */
function syncNoticeTasks(db, byNotice) {
  const existing = Array.isArray(db.tasks) ? db.tasks : [];
  const userTasks = existing.filter((task) => !task.mock);
  const head = db.employees?.find((item) => item.userId) ?? db.employees?.[0] ?? null;
  const linkedContracts = (db.contractRegistry ?? []).filter((contract) => id(contract.procurementId));
  const minimum =
    (db.purchasePlans?.length ?? 0) +
    (db.notices?.length ?? 0) * 3 +
    linkedContracts.length +
    1;
  const rebuilt = buildNoticeTasks({
    plans: db.purchasePlans ?? [],
    notices: db.notices ?? [],
    contracts: linkedContracts,
    org: db.organizations?.[0] ?? {},
    head,
    staffByNotice: byNotice,
    count: Math.max(existing.length, minimum),
  });
  db.tasks = [...userTasks, ...rebuilt];
  return { rebuilt: rebuilt.length, kept: userTasks.length };
}

/** Применить все связи к db.json. Возвращает отчёт для импортера и CLI. */
export function applyEisChain(db) {
  const staff = syncNoticeResponsibleStaff(db);
  const notices = linkNoticesToContracts(db);
  const payments = linkContractPayments(db);
  const taskUpdates = syncNoticeTasks(db, staff.byNotice);
  return {
    notices,
    payments,
    staff: {
      added: staff.added,
      contractService: staff.contractService,
      taskUpdates,
    },
    byNotice: staff.byNotice,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = JSON.parse(fs.readFileSync(args.db, "utf8"));
  const report = applyEisChain(db);
  if (!args.dryRun) {
    db.eisImportSummary = {
      ...(db.eisImportSummary ?? {}),
      contractLinks: report.notices,
      paymentLinks: report.payments,
      responsibleStaff: report.staff,
    };
    fs.writeFileSync(args.db, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }
  // `byNotice` — Map для импортера, в JSON он превращается в пустой объект.
  const { byNotice: _byNotice, ...printable } = report;
  console.log(JSON.stringify(printable, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
