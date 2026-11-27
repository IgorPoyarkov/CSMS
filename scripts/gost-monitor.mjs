/**
 * Мониторинг новых ГОСТов на protect.gost.ru и локальный снимок карточек.
 *
 * Запуск:
 *   node scripts/gost-monitor.mjs --dry-run
 *   node scripts/gost-monitor.mjs --months 2
 *
 * Снимок сохраняется в public/gost/catalog.json — фронт читает его без API
 * и без обращения к внешнему сайту (стратегия snapshot-first).
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseGostDetail,
  parseGostList,
  parseGostPages,
} from "./lib/gost-standards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const BASE = "https://protect.gost.ru";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function fetchHtml(url, { attempts = 3 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ru-RU,ru;q=0.9",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} для ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function recentMonths(count) {
  const months = [];
  const now = new Date();
  for (let offset = 0; offset < count; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }
  return months;
}

const listUrl = ({ year, month }, page = 1) =>
  page === 1
    ? `${BASE}/gost/?year=${year}&month=${month}`
    : `${BASE}/gost?year=${year}&month=${month}&search=&page=${page}`;

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function collectNewGosts({
  months = 2,
  maxPages = 20,
  onProgress = () => {},
} = {}) {
  const found = new Map();
  const periods = recentMonths(months);

  for (const period of periods) {
    const firstPage = await fetchHtml(listUrl(period));
    const items = parseGostList(firstPage);
    for (const item of items) found.set(item.id, item);

    const pages = parseGostPages(firstPage).filter(
      (page) => page > 1 && page <= maxPages,
    );
    for (const page of pages) {
      const pageItems = parseGostList(await fetchHtml(listUrl(period, page)));
      for (const item of pageItems) found.set(item.id, item);
      onProgress(`Список ${period.year}-${period.month}, стр. ${page}: ${pageItems.length}`);
    }
    onProgress(`Список ${period.year}-${period.month}: ${items.length} принятых`);
  }

  return [...found.values()];
}

export function buildCatalog(previous, details, { base = BASE } = {}) {
  const byId = new Map((previous?.items ?? []).map((item) => [item.id, item]));
  for (const item of details) byId.set(item.id, item);

  const items = [...byId.values()].sort((a, b) => {
    const byDesignation = String(a.designation).localeCompare(
      String(b.designation),
      "ru",
    );
    return byDesignation || String(a.id).localeCompare(String(b.id));
  });
  const payload = JSON.stringify(items);
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 12);
  const version = `gost-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${hash}`;

  return {
    version,
    generatedAt: new Date().toISOString(),
    source: base,
    sourcePage: `${base}/gost/`,
    itemCount: items.length,
    items,
  };
}

async function main() {
  const months = Number(arg("months", "2"));
  const maxPages = Number(arg("max-pages", "20"));
  const out = path.resolve(ROOT, arg("out", "public/gost/catalog.json"));
  const stateFile = path.resolve(ROOT, arg("state", "docs/snapshots/gost/state.json"));
  const dryRun = hasFlag("dry-run");
  const includeAll = hasFlag("include-all-statuses");
  const refresh = hasFlag("refresh");

  if (!Number.isFinite(months) || months < 1 || months > 24) {
    throw new Error("--months должно быть от 1 до 24");
  }

  const previous = await readJson(out, { items: [] });
  const state = await readJson(stateFile, { seenIds: [] });
  const seen = new Set(state.seenIds ?? []);

  const listed = await collectNewGosts({
    months,
    maxPages,
    onProgress: (message) => console.log(message),
  });
  const filtered = includeAll ? listed : listed.filter((item) => /принят/i.test(item.status));
  const fresh = refresh ? filtered : filtered.filter((item) => !seen.has(item.id));
  const skipped = filtered.length - fresh.length;

  const details = [];
  for (const [index, item] of fresh.entries()) {
    const detail = await fetchHtml(item.sourceUrl);
    details.push(parseGostDetail(detail, { ...item, collectedAt: new Date().toISOString() }));
    if ((index + 1) % 10 === 0 || index + 1 === fresh.length) {
      console.log(`Карточки: ${index + 1}/${fresh.length}`);
    }
    // Не заваливаем сайт: между карточками небольшая пауза.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const catalog = buildCatalog(previous, details);
  const nextState = {
    lastRunAt: new Date().toISOString(),
    months,
    seenIds: [...new Set([...(state.seenIds ?? []), ...filtered.map((item) => item.id)])],
  };

  console.log(
    `ГОСТов в списке: ${filtered.length}, новых карточек: ${fresh.length}, уже в снимке: ${skipped}, итого в снимке: ${catalog.itemCount}`,
  );
  console.log(`Версия снимка: ${catalog.version}`);

  if (dryRun) {
    console.log("DRY-RUN: файлы не записаны");
    return;
  }

  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  await fs.writeFile(stateFile, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  console.log(`Снимок: ${out}`);
  console.log(`Состояние: ${stateFile}`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await main();
}
