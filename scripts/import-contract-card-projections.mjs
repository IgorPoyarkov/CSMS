/**
 * Импорт готовых проекций публичных карточек контрактов в PostgreSQL.
 *
 * Проекция eis-parser — это ContractCardViewDto со всеми полями (Acts, Decisions,
 * Payments, Messages, Executions, SkippedFiles, Smp). Она не является сущностью БД,
 * поэтому кладётся в отдельную jsonb-коллекцию `contractCardProjections` целиком:
 * фронт получает все поля без потери и без новых кириллических колонок.
 * `Smp` — подтаблица контракта «Информация о привлечении СМП, СОНО»: требуемый
 * процент из условий контракта и субподрядчики, если заказчик их опубликовал.
 *
 * Важно: поиск ЕИС по ИНН не фильтрует выдачу, поэтому по умолчанию импортируются
 * только проекции, которые удалось связать с уже известным контрактом из
 * `contractRegistry` (по реестровому или номеру контракта). Чужие карточки
 * пропускаются; `--allow-unmatched` включает их явным решением пользователя.
 *
 * Запись точечная (upsert по реестровому номеру): существующие коллекции не
 * очищаются. `--db` здесь не нужен — источник списка контрактов всегда PG.
 *
 * Примеры:
 *   node scripts/import-contract-card-projections.mjs --dir <каталог-проекций> --dry-run
 *   node scripts/import-contract-card-projections.mjs --dir <каталог-проекций>
 *   node scripts/import-contract-card-projections.mjs --dir <каталог-проекций> --allow-unmatched
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readDb } from "./lib/db-write.mjs";
import {
  createPgPool,
  ensureSchema,
  PG_SCHEMA,
  upsertDocument,
} from "./lib/pg-store.mjs";

const COLLECTION = "contractCardProjections";
// Сколько проекций «потеряли» факты и были восстановлены из БД
let factsRestored = 0;

function parseArgs(argv) {
  const args = {
    dir: "",
    limit: 0,
    allowUnmatched: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--allow-unmatched") {
      args.allowUnmatched = true;
      continue;
    }
    if (flag === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (!flag.startsWith("--")) continue;
    const key = flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) continue;
    args[key] = value;
    i += 1;
  }
  args.limit = Number(args.limit) || 0;
  return args;
}

/** Номер из eisUrl старых записей, у которых нет eisRegistryNumber. */
function registryNumber(item) {
  const fromUrl = String(item.eisUrl ?? "").match(/reestrNumber=(\d{19})/)?.[1];
  return String(item.eisRegistryNumber || fromUrl || "");
}

/** Номер контракта из проекции — им тоже можно привязать карточку к своей записи. */
function contractNumbers(projection) {
  const numbers = new Set();
  for (const act of projection.Acts ?? []) {
    if (act?.Contract?.Number) numbers.add(String(act.Contract.Number));
  }
  for (const payment of projection.Payments ?? []) {
    if (payment?.ContractNumber) numbers.add(String(payment.ContractNumber));
  }
  return [...numbers];
}

/** Значение без разметки и лишних пробелов. */
function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Подрядчик из наименования получателя платежа. Казначейство пишет его в
 * скобках: «МИНИСТЕРСТВО ФИНАНСОВ … (ООО "ТЕРРА", л/с 712Ч5749001)».
 * Возвращает наименование из скобок и ИНН получателя.
 */
function supplierFromPayments(projection) {
  for (const payment of projection.Payments ?? []) {
    const name = text(payment?.RecipientName);
    if (!name) continue;
    const inside = name.match(/\(([^()]+)\)/)?.[1] ?? "";
    // Кириллица не входит в \w, поэтому \b после «с» не сработал бы — границу
    // лицевого счёта задаём явно: пробел или конец строки
    const withoutAccount = text(inside.split(/,?\s*л\/с(?=\s|$)/i)[0]).replace(
      /,$/,
      "",
    );
    const candidate = withoutAccount || name;
    return {
      supplierName: candidate,
      supplierInn: text(payment?.RecipientInn),
      supplierKpp: text(payment?.RecipientKpp),
    };
  }
  return {};
}

/** Подрядчик из акта приёмки: сторона с ролью «Подрядчик». */
function supplierFromActs(projection) {
  for (const act of projection.Acts ?? []) {
    for (const party of act?.Parties ?? []) {
      const role = text(party?.Role).toLowerCase();
      if (!role.includes("подрядчик") && !role.includes("поставщик")) continue;
      const name = text(party?.Name) || text(party?.ShortName);
      if (!name) continue;
      return {
        supplierName: name,
        supplierInn: text(party?.Inn),
        supplierKpp: text(party?.Kpp),
      };
    }
  }
  return {};
}

/** Сумма числом в строку с двумя знаками: 147712728.82 → «147712728.82». */
function moneyString(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = typeof value === "number"
    ? value
    : Number.parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
}

/**
 * Поля реестра из проекции карточки ЕИС: блок General (вкладка «Общая
 * информация» + печатная форма), а если его ещё нет — из реквизитов актов и
 * платёжных поручений. Пустые поля реестра заполняются, заполненные не
 * трогаются: ручная правка заказчика важнее данных портала.
 */
export function registryPatchFromProjection(projection) {
  const general = projection.General ?? {};
  const generalSupplier = {
    supplierName: text(general.SupplierName),
    supplierInn: text(general.SupplierInn),
    supplierKpp: text(general.SupplierKpp),
  };
  const fromPayments = supplierFromPayments(projection);
  const supplier =
    generalSupplier.supplierName || generalSupplier.supplierInn
      ? generalSupplier
      : fromPayments.supplierName
        ? fromPayments
        : supplierFromActs(projection);

  return {
    supplierName: supplier.supplierName ?? "",
    supplierInn: supplier.supplierInn ?? "",
    supplierKpp: supplier.supplierKpp ?? "",
    customerName: text(general.CustomerName),
    ikz: text(general.Ikz),
    contractPrice: moneyString(general.ContractPrice),
    advanceAmount: moneyString(general.AdvanceAmount),
    performanceSecurityAmount: moneyString(general.PerformanceSecurityAmount),
    executionStartDate: text(general.ExecutionStartDate),
    executionEndDate: text(general.ExecutionEndDate),
  };
}

/**
 * Дополнить запись реестра значениями из проекции. Возвращает новый объект
 * и список заполненных полей; если дополнять нечего — null.
 */
export function mergeRegistryFields(contract, patch) {
  const filled = [];
  const next = { ...contract };
  for (const [field, value] of Object.entries(patch)) {
    if (!value) continue;
    if (text(next[field])) continue;
    next[field] = value;
    filled.push(field);
  }
  return filled.length ? { contract: next, filled } : null;
}

/**
 * Поля-факты проекции. Режим `--card-fields-only` пишет только `General`,
 * остальные массивы остаются пустыми — такой файл не должен обнулять уже
 * импортированные акты и платежи.
 */
const FACT_KEYS = [
  "Acts",
  "Decisions",
  "Payments",
  "Messages",
  "Executions",
  "Smp",
];

/** Есть ли в проекции хоть один факт хозяйственной жизни. */
export function hasFacts(projection) {
  return FACT_KEYS.some(
    (key) => Array.isArray(projection?.[key]) && projection[key].length > 0,
  );
}

/**
 * Сохранить факты прежней проекции, если новая пришла «реквизитной»: иначе
 * прогон `--card-fields-only` в новый каталог стёр бы акты и платежи в БД.
 * Новый `General` и служебные поля при этом остаются новыми.
 */
export function preserveFacts(next, previous) {
  if (!previous || hasFacts(next) || !hasFacts(previous)) {
    return { doc: next, restored: [] };
  }

  const doc = { ...next };
  const restored = [];
  for (const key of FACT_KEYS) {
    if (!Array.isArray(previous[key]) || previous[key].length === 0) continue;
    doc[key] = previous[key];
    restored.push(key);
  }
  // Список пропущенных файлов — тоже факт выгрузки, стаб его не знает
  if (
    !(next.SkippedFiles ?? []).length &&
    (previous.SkippedFiles ?? []).length
  ) {
    doc.SkippedFiles = previous.SkippedFiles;
    restored.push("SkippedFiles");
  }

  return { doc, restored };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) throw new Error("Укажите --dir <каталог с проекциями *.json>");
  if (!fs.existsSync(args.dir)) throw new Error(`Каталог не найден: ${args.dir}`);

  const files = fs
    .readdirSync(args.dir)
    .filter((name) => /^\d{19}\.json$/.test(name))
    .sort();
  if (args.limit > 0) files.splice(args.limit);

  const db = await readDb();
  const byRegNumber = new Map();
  const byContractNumber = new Map();
  for (const contract of db.contractRegistry ?? []) {
    const reg = registryNumber(contract);
    if (reg) byRegNumber.set(reg, contract);
    if (contract.contractNumber) {
      byContractNumber.set(String(contract.contractNumber), contract);
    }
  }

  const docs = [];
  // Заполнение пустых полей реестра по данным карточки: подрядчик, аванс,
  // срок исполнения, ИКЗ, обеспечение. Ключ — id записи реестра.
  const registryUpdates = new Map();
  const skipped = [];
  for (const file of files) {
    const regNumber = path.basename(file, ".json");
    const projection = JSON.parse(fs.readFileSync(path.join(args.dir, file), "utf8"));
    const contract =
      byRegNumber.get(regNumber) ??
      contractNumbers(projection).map((n) => byContractNumber.get(n)).find(Boolean);

    if (!contract && !args.allowUnmatched) {
      skipped.push(regNumber);
      continue;
    }

    if (contract) {
      const merged = mergeRegistryFields(
        contract,
        registryPatchFromProjection(projection),
      );
      if (merged) registryUpdates.set(String(contract.id), merged);
    }

    // Все поля проекции остаются на верхнем уровне: фронт читает Acts/Payments
    // как есть, а служебные ключи добавляют связь со своим реестром контрактов.
    docs.push({
      ...projection,
      id: regNumber,
      regNumber,
      contractId: contract?.id ?? null,
      organizationId: contract?.organizationId ?? null,
      contractNumber: contract?.contractNumber ?? null,
      eisUrl: `https://zakupki.gov.ru/epz/contract/contractCard/common-info.html?reestrNumber=${regNumber}`,
      source: "eis-public-card",
      importedAt: new Date().toISOString(),
    });
  }

  if (!args.dryRun && docs.length && process.env.PG_SYNC !== "0") {
    const pool = createPgPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureSchema(client);
      // Текущие проекции: нужны, чтобы «реквизитная» выгрузка (--card-fields-only)
      // не стёрла акты и платежи, которые уже есть в БД
      const existingRows = await client.query(
        `SELECT doc_id, doc FROM ${PG_SCHEMA}.documents
         WHERE collection = $1 AND doc_id = ANY($2)`,
        [COLLECTION, docs.map((doc) => doc.id)],
      );
      const previousById = new Map(
        existingRows.rows.map((row) => [row.doc_id, row.doc]),
      );

      // Только upsert: никаких DELETE, остальные коллекции не трогаются.
      for (const doc of docs) {
        const { doc: merged, restored } = preserveFacts(
          doc,
          previousById.get(doc.id),
        );
        if (restored.length) {
          factsRestored += 1;
          console.warn(
            `${doc.id}: поля ${restored.join(", ")} сохранены из прежней проекции`,
          );
        }
        await upsertDocument(client, COLLECTION, merged);
      }
      // Реестр дополняем теми же данными: пустые поля подрядчика и аванса
      // иначе остаются пустыми и в списке, и в фильтре «есть аванс».
      for (const merged of registryUpdates.values()) {
        await upsertDocument(client, "contractRegistry", merged.contract);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "import",
        files: files.length,
        imported: docs.length,
        registryPatched: registryUpdates.size,
        factsRestored,
        skippedUnmatched: skipped.length,
        skippedSample: skipped.slice(0, 5),
        collection: COLLECTION,
        pgSync: process.env.PG_SYNC !== "0",
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Ошибка импорта проекций карточек: ${error.message}`);
    process.exitCode = 1;
  });
}
