#!/usr/bin/env node
/**
 * Скачивание официальных текстов НПА с actual.pravo.gov.ru для локального RAG.
 * Портал отдаёт «.doc», который на самом деле является Word-совместимым HTML;
 * дополнительно сохраняются плоский текст и текст с заголовками статей.
 *
 *   node scripts/consultant/fetch-pravo.mjs search 44 --kind=Федеральный закон
 *   node scripts/consultant/fetch-pravo.mjs list <hash>
 *   node scripts/consultant/fetch-pravo.mjs get <hash> <redid> <slug> [--role=actual]
 *   node scripts/consultant/fetch-pravo.mjs sync [--only=fz-44] [--force]
 *
 * `sync` читает manifest `scripts/consultant/pravo-sources.json`; скачанные
 * файлы попадают в `.tmp/pravo-downloads/` (индекс и тексты не коммитятся).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { editionHeader, htmlToMarkdown, htmlToText } from "./lib/pravo-html.mjs";

const API = "http://actual.pravo.gov.ru:8000/api/ebpi";
const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, ".tmp/pravo-downloads");
const MANIFEST = path.join(import.meta.dirname, "pravo-sources.json");

const url = (endpoint, params) =>
  `${API}/${endpoint}/?bpa=ebpi&${new URLSearchParams(params)}`;

const json = async (endpoint, params) => {
  const response = await fetch(url(endpoint, params), {
    headers: { "User-Agent": "CSMS-Consultant/1.0 (local RAG)" },
  });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  return response.json();
};

const print = (value) => process.stdout.write(`${value}\n`);

/** Поиск по номеру: AttrId 6 — «номер документа», AttrMode 8 — точный поиск. */
async function search(args) {
  const number = args[0];
  if (!number) throw new Error("Укажите номер: search 44");
  const option = (name) => {
    const found = args.find((arg) => arg.startsWith(`--${name}=`));
    return found ? found.slice(name.length + 3) : null;
  };
  const kind = option("kind");
  const contains = option("contains");
  const q = encodeURIComponent(
    JSON.stringify([{ AttrId: 6, AttrMode: 8, Words: [number] }]),
  );
  const response = await fetch(`${API}/attrsearch/?bpa=ebpi&q=${q}`);
  const data = await response.json();
  let docs = data.docs ?? [];
  if (kind) docs = docs.filter((doc) => (doc.docpassing ?? "").includes(kind));
  if (contains) docs = docs.filter((doc) => (doc.docpassing ?? "").includes(contains));
  print(`Найдено: ${docs.length} из ${data.docscount ?? 0}`);
  for (const doc of docs) {
    print(
      [
        doc.docpassing ?? "?",
        doc.docstate ?? "?",
        doc.dochash ?? "?",
        doc.docimagepath ?? "-",
      ].join(" | "),
    );
  }
}

async function list(hash) {
  const card = await json("card", { t: JSON.stringify({ hash }) });
  const data = await json("redactions", {
    t: JSON.stringify({ hash, ttl: 4 }),
  });
  print(`Акт: ${card.docpassing ?? "?"} (${card.docid ?? "?"})`);
  print(`Всего редакций: ${(data.redactions ?? []).length}`);
  for (const red of data.redactions ?? []) {
    print(
      [
        red.redid,
        red.reddate,
        red.actual ? "АКТУАЛЬНАЯ" : red.redstatus ?? "?",
        red.hascontent ? "текст есть" : "только образ",
        red.redcaption ?? "",
      ].join(" | "),
    );
  }
}

async function download(hash, redid, slug, role, ttl) {
  const card = await json("card", { t: JSON.stringify({ hash }) });
  const reds = await json("redactions", {
    t: JSON.stringify({ hash, ttl: 4 }),
  });
  const red = (reds.redactions ?? []).find(
    (item) => String(item.redid) === String(redid),
  );
  if (!red) throw new Error(`Редакция ${redid} не найдена у ${hash}`);

  const text = await json("redtext", { t: String(redid), ttl });
  if (text.error || !text.redtext) {
    throw new Error(`Нет текста редакции ${redid}: ${text.error ?? "пусто"}`);
  }

  const documentName = card.docpassing ?? "НПА";
  const caption = red.redcaption ?? `от ${red.reddate}`;
  const doc = text.redtext.replace(
    /<body[^>]*>/i,
    (match) => `${match}${editionHeader(caption, documentName)}`,
  );

  await fs.mkdir(OUT, { recursive: true });
  const base = path.join(OUT, slug);
  const files = [
    [`${base}.doc`, /^\s*<!doctype html>/i.test(doc) ? doc : `<!DOCTYPE html>${doc}`],
    [`${base}.txt`, htmlToText(doc)],
    [`${base}.md`, htmlToMarkdown(doc)],
  ];
  for (const [file, content] of files) await fs.writeFile(file, content, "utf8");

  return {
    slug,
    role,
    act: documentName,
    hash,
    redid: Number(redid),
    date: red.reddate,
    caption,
    actual: red.actual === true,
    hasContent: red.hascontent === true,
    cardUrl: `http://actual.pravo.gov.ru/list.html#hash=${hash}&bpa=ebpi&ttl=4`,
    publicationUrl: card.docimagepath ?? null,
    files: files.map(([file]) => path.relative(ROOT, file).replace(/\\/g, "/")),
    bytes: files.map(([, content]) => Buffer.byteLength(content, "utf8")),
  };
}

async function sync(args) {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const only = args.find((arg) => arg.startsWith("--only="))?.slice(7);
  const force = args.includes("--force");
  const statusFile = path.join(OUT, "downloaded.json");
  const status = JSON.parse(
    (await fs.readFile(statusFile, "utf8").catch(() => null)) ?? "{}",
  );

  for (const act of manifest.acts ?? []) {
    if (only && act.id !== only) continue;
    for (const red of act.redactions ?? []) {
      // Будущие редакции храним в манифете для справки, но в базу не кладём.
      if (red.role === "future") {
        print(`Пропущено: ${act.id}-${red.slug} (не вступившая в силу)`);
        continue;
      }
      const slug = `${act.id}-${red.slug}`;
      const output = path.join(OUT, `${slug}.md`);
      if (!force && status[slug] && (await fs.stat(output).catch(() => null))) {
        print(`Пропущено: ${slug} (уже скачано)`);
        continue;
      }
      const info = await download(
        act.hash,
        red.redid,
        slug,
        red.role ?? "archive",
        String(red.ttl ?? 4),
      );
      status[slug] = { ...info, actId: act.id, shortName: act.shortName };
      print(`Скачано: ${slug} · ${info.date} · ${info.caption}`);
    }
  }

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(
    statusFile,
    `${JSON.stringify(
      Object.fromEntries(
        Object.entries(status)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, value]),
      ),
      null,
      2,
    )}\n`,
    "utf8",
  );
  print(`Статус: ${path.relative(ROOT, statusFile).replace(/\\/g, "/")}`);
}

/**
 * Пересборка txt/md из уже скачанных .doc без обращения к порталу. Нужна,
 * когда меняется конвертер (например, восстановление точек в добавочных
 * номерах статей): исходный HTML уже сохранён, сеть не требуется.
 */
async function reconvert() {
  const statusFile = path.join(OUT, "downloaded.json");
  const status = JSON.parse(await fs.readFile(statusFile, "utf8"));
  let done = 0;
  for (const [slug, info] of Object.entries(status)) {
    const docFile = path.join(OUT, `${slug}.doc`);
    let doc;
    try {
      doc = await fs.readFile(docFile, "utf8");
    } catch {
      print(`Пропущено: ${slug} (нет .doc — файл из публикации)`);
      continue;
    }
    const txt = htmlToText(doc);
    const md = htmlToMarkdown(doc);
    await fs.writeFile(path.join(OUT, `${slug}.txt`), txt, "utf8");
    await fs.writeFile(path.join(OUT, `${slug}.md`), md, "utf8");
    if (Array.isArray(info.files)) {
      info.bytes = info.files.map((file, index) => {
        if (file.endsWith(".txt")) return Buffer.byteLength(txt, "utf8");
        if (file.endsWith(".md")) return Buffer.byteLength(md, "utf8");
        return info.bytes?.[index] ?? 0;
      });
    }
    done += 1;
  }
  await fs.writeFile(
    statusFile,
    `${JSON.stringify(
      Object.fromEntries(
        Object.entries(status)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, value]),
      ),
      null,
      2,
    )}\n`,
    "utf8",
  );
  print(`Переконвертировано из .doc: ${done}`);
}

const [command, ...args] = process.argv.slice(2);
if (command === "search") await search(args);
else if (command === "list") await list(args[0]);
else if (command === "get") {
  const option = (name, fallback) => {
    const found = args.find((arg) => arg.startsWith(`--${name}=`));
    return found ? found.slice(name.length + 3) : fallback;
  };
  const info = await download(
    args[0],
    args[1],
    args[2],
    option("role", "archive"),
    option("ttl", "4"),
  );
  print(`${info.files.join(", ")} (${info.date})`);
} else if (command === "sync") await sync(args);
else if (command === "reconvert") await reconvert();
else {
  print(
    [
      "Команды:",
      "  search <номер> [--kind=<тип>] [--contains=< слова>]  найти акт и его hash",
      "  list <hash>                                          список редакций",
      "  get <hash> <redid> <slug> [--role=actual]            скачать редакцию",
      "  sync [--only=<id>] [--force]                          все акты из manifest",
      "  reconvert                                            пересобрать txt/md из .doc",
    ].join("\n"),
  );
}
