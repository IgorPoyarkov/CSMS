/**
 * Перенос поставщиков из документов в справочник контрагентов.
 *
 * До справочника реквизиты подрядчиков вводились в каждой форме заново, и один
 * и тот же поставщик был записан по-разному (полное и сокращённое наименование,
 * ИНН с пробелами, без КПП). Скрипт собирает всех поставщиков из документов,
 * где они уже есть, и заводит по одной карточке на ИНН.
 *
 * Источники:
 *   - contractRegistry     — supplierName / supplierInn / supplierKpp
 *   - contractProjects     — supplierName / supplierInn
 *   - contractSmpRecords   — supplierName / supplierInn / supplierKpp
 *   - purchaseNotes        — nmckOffers[].supplierName / supplierInn (КП)
 *
 * Правила:
 *   - ключ справочника — ИНН: записи без валидного ИНН (10 или 12 цифр) не
 *     переносятся, иначе справочник наполнится «поставщиками без ИНН»;
 *   - пустые поля дозаполняются из других документов, заполненные не
 *     перезаписываются: документ мог быть исправлен вручную;
 *   - существующие карточки не дублируются, повторный запуск безопасен;
 *   - вердикт реестра МСП не переносится: он живёт в `smpRegistry`, а не в
 *     карточке контрагента.
 *
 * Использование:
 *   node scripts/migrate-counterparties.mjs
 *   node scripts/migrate-counterparties.mjs --dry-run
 */

import {
  createPgPool,
  ensureSchema,
  loadDbFromPg,
  upsertDocument,
} from "./lib/pg-store.mjs";

const dryRun = process.argv.includes("--dry-run");
const pool = createPgPool();
const client = await pool.connect();

const normalizeInn = (value) => String(value ?? "").replace(/\D/g, "");
const normalizeKpp = (value) => String(value ?? "").replace(/\D/g, "");
const cleanText = (value) => String(value ?? "").trim();
const isValidInn = (inn) => inn.length === 10 || inn.length === 12;

/** Кандидаты: ИНН → карточка, куда собираются данные из всех документов. */
const candidates = new Map();

const addCandidate = (source, { inn, name, kpp }) => {
  const digits = normalizeInn(inn);
  if (!isValidInn(digits)) return;

  const cleanName = cleanText(name);
  const cleanKpp = normalizeKpp(kpp);
  const existing = candidates.get(digits);

  if (!existing) {
    candidates.set(digits, {
      inn: digits,
      name: cleanName,
      kpp: cleanKpp,
      sources: [source],
    });

    return;
  }

  if (!existing.name && cleanName) existing.name = cleanName;
  if (!existing.kpp && cleanKpp) existing.kpp = cleanKpp;
  if (!existing.sources.includes(source)) existing.sources.push(source);
};

try {
  await client.query("BEGIN");
  await ensureSchema(client);
  const db = await loadDbFromPg(client);

  for (const contract of db.contractRegistry ?? []) {
    addCandidate("contractRegistry", {
      inn: contract.supplierInn,
      name: contract.supplierName,
      kpp: contract.supplierKpp,
    });
  }

  for (const project of db.contractProjects ?? []) {
    addCandidate("contractProjects", {
      inn: project.supplierInn,
      name: project.supplierName,
    });
  }

  for (const record of db.contractSmpRecords ?? []) {
    addCandidate("contractSmpRecords", {
      inn: record.supplierInn,
      name: record.supplierName,
      kpp: record.supplierKpp,
    });
  }

  for (const note of db.purchaseNotes ?? []) {
    for (const offer of note.nmckOffers ?? []) {
      addCandidate("purchaseNotes", {
        inn: offer.supplierInn,
        name: offer.supplierName,
      });
    }
  }

  // Уже заведённые карточки: по ИНН, а не по id — id мог быть создан сервером
  const existingByInn = new Map(
    (db.counterparties ?? []).map((item) => [normalizeInn(item.inn), item]),
  );

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let untouched = 0;
  const skipped = [];

  for (const candidate of candidates.values()) {
    const existing = existingByInn.get(candidate.inn);

    if (!candidate.name) {
      // Наименование — обязательное поле карточки: поставщика без названия
      // заводить нельзя, его не узнать в списке. Такие записи перечисляем,
      // чтобы их дозаполнили вручную
      skipped.push({ inn: candidate.inn, sources: candidate.sources });
      continue;
    }

    if (existing) {
      const nextName = existing.name?.trim() || candidate.name;
      const nextKpp = normalizeKpp(existing.kpp) || candidate.kpp;
      const changed =
        nextName !== existing.name || nextKpp !== (existing.kpp ?? "");

      if (!changed) {
        untouched++;
        continue;
      }

      const next = {
        ...existing,
        name: nextName,
        kpp: nextKpp || undefined,
        updatedAt: now,
      };

      if (!dryRun) {
        await upsertDocument(client, "counterparties", next);
      }
      updated++;
      continue;
    }

    const next = {
      id: `counterparty-${candidate.inn}`,
      inn: candidate.inn,
      name: candidate.name,
      kpp: candidate.kpp || undefined,
      isActive: true,
      note: `Заведён переносом из документов: ${candidate.sources.join(", ")}`,
      createdAt: now,
      updatedAt: now,
    };

    if (!dryRun) {
      await upsertDocument(client, "counterparties", next);
    }
    created++;
  }

  if (dryRun) {
    await client.query("ROLLBACK");
  } else {
    await client.query("COMMIT");
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Контрагенты: найдено ${candidates.size} ИНН, ` +
      `создано ${created}, дозаполнено ${updated}, без изменений ${untouched}.`,
  );

  if (skipped.length > 0) {
    console.log(
      `Пропущено без наименования: ${skipped.length}. Заполните вручную:`,
    );
    for (const item of skipped) {
      console.log(`  ИНН ${item.inn} — ${item.sources.join(", ")}`);
    }
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
