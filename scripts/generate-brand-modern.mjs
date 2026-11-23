/**
 * Генератор неонового комплекта фирменного знака КСЗ.
 *
 * Основной вариант бренда — тёмная стеклянная плитка с неоновым контуром
 * циан → индиго → магента (тема «Современные закупки»). Текстовая часть
 * (аббревиатура КСЗ и подписи) уже переведена в кривые в классических SVG,
 * поэтому скрипт берёт готовые `<g>` с путями и перекрашивает их: так
 * комплект остаётся типографически идентичным, а шрифты в системе не нужны.
 *
 * Запуск: `node scripts/generate-brand-modern.mjs`
 * Растр после генерации: см. `scripts/generate-brand-png.ps1` или README.
 */
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "public/brand";
const TILE_FROM = "#16233A";
const TILE_TO = "#070B14";
const EDGE = ["#22D3EE", "#7C8CFF", "#F472B6"];
const TEXT = "#E8F0FF";
const MIST = "#A8B8D0";

/** Монограмма «К»: стойка, верхний луч с полкой, нижний луч с ножкой. */
const glyph = (stand, top, leg) =>
  `<rect x="16.5" y="16" width="7" height="32" rx="3.5" fill="${stand}"/>` +
  `<path d="M22.5 31.5 L37 17" stroke="${top}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M37 17 H43" stroke="${top}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M22.5 32.5 L37 47" stroke="${stand}" stroke-width="7" stroke-linecap="round"/>` +
  `<path d="M37 47 V52" stroke="${leg}" stroke-width="7" stroke-linecap="round"/>`;

/** Неоновая плитка 64×64 со свечением. */
const neonTile = (id) =>
  `<rect width="64" height="64" rx="14" fill="url(#tile-${id})"/>` +
  `<rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="url(#edge-${id})" stroke-width="1.5" opacity="0.9"/>` +
  `<g filter="url(#glow-${id})">${glyph(TEXT, EDGE[0], EDGE[1])}</g>`;

/** Монохромная плитка: монограмма вырезана маской, один цвет на печать. */
const monoTile = (id, color) =>
  `<rect width="64" height="64" rx="14" fill="${color}" mask="url(#cut-${id})"/>`;

const neonDefs = (id) =>
  `<linearGradient id="tile-${id}" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${TILE_FROM}"/><stop offset="1" stop-color="${TILE_TO}"/>` +
  `</linearGradient>` +
  `<linearGradient id="edge-${id}" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${EDGE[0]}"/><stop offset="0.55" stop-color="${EDGE[1]}"/>` +
  `<stop offset="1" stop-color="${EDGE[2]}"/></linearGradient>` +
  `<filter id="glow-${id}" x="-40%" y="-40%" width="180%" height="180%">` +
  `<feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="${EDGE[0]}" flood-opacity="0.55"/>` +
  `</filter>`;

const monoDefs = (id) =>
  `<mask id="cut-${id}"><rect width="64" height="64" fill="#fff"/>` +
  `<g fill="#000">${glyph("#000", "#000", "#000")}</g></mask>`;

const COMMENT =
  "КСЗ в теме «Современные закупки»: стеклянная плитка, неоновый контур, свечение. Надписи в кривых.";

const svg = (viewBox, w, h, label, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}" role="img" aria-label="${label}">` +
  `<!-- ${COMMENT} --><defs>${defs}</defs>${body}</svg>\n`;

/** Текстовые группы (КСЗ + подписи) из готового SVG, перекрашенные под тему. */
const textGroups = (file, colors) => {
  const source = readFileSync(`${DIR}/${file}`, "utf8");
  const groups = source.match(
    /<g transform="translate\([^)]*\) scale\([^)]*\)"[^>]*>[\s\S]*?<\/g>/g,
  );
  if (!groups) throw new Error(`Не найдены текстовые группы в ${file}`);

  return groups
    .map((group, index) =>
      group.replace(/fill="#[0-9a-fA-F]{6}"/, `fill="${colors[index]}"`),
    )
    .join("");
};

const write = (name, content) => {
  writeFileSync(`${DIR}/${name}`, content, "utf8");
  console.log("·", name, content.length, "байт");
};

// ─── Знак ────────────────────────────────────────────────────────────────────

write(
  "csms-mark-modern.svg",
  svg(
    "0 0 64 64",
    64,
    64,
    "КСЗ — знак в теме «Современные закупки»",
    neonDefs("mark"),
    neonTile("mark"),
  ),
);

for (const [suffix, color] of [
  ["mono-black", "#000000"],
  ["mono-white", "#FFFFFF"],
]) {
  write(
    `csms-mark-modern-${suffix}.svg`,
    svg(
      "0 0 64 64",
      64,
      64,
      `КСЗ — знак в теме «Современные закупки», монохром ${suffix === "mono-black" ? "чёрный" : "белый"}`,
      monoDefs(`mark-${suffix}`),
      monoTile(`mark-${suffix}`, color),
    ),
  );
}

// ─── Горизонтальный логотип ──────────────────────────────────────────────────

const horizontal = (name, id, tile, defs, colors) =>
  write(
    name,
    svg(
      "0 0 480.87 88",
      480.87,
      88,
      "КСЗ — логотип в теме «Современные закупки»",
      defs,
      `<g transform="translate(16 12)">${tile}</g>` +
        textGroups("csms-logo-horizontal.svg", colors),
    ),
  );

horizontal(
  "csms-logo-horizontal-modern.svg",
  "logo",
  neonTile("logo"),
  neonDefs("logo"),
  [TEXT, MIST],
);
horizontal(
  "csms-logo-horizontal-modern-mono-black.svg",
  "logo-mono-black",
  monoTile("logo-mono-black", "#000000"),
  monoDefs("logo-mono-black"),
  ["#000000", "#000000"],
);
horizontal(
  "csms-logo-horizontal-modern-mono-white.svg",
  "logo-mono-white",
  monoTile("logo-mono-white", "#FFFFFF"),
  monoDefs("logo-mono-white"),
  ["#FFFFFF", "#FFFFFF"],
);

// ─── Вертикальная компоновка ─────────────────────────────────────────────────

write(
  "csms-logo-stacked-modern.svg",
  svg(
    "0 0 284.75 216",
    284.75,
    216,
    "КСЗ — вертикальный логотип в теме «Современные закупки»",
    neonDefs("stacked"),
    `<g transform="translate(94.37 20)">${neonTile("stacked")}</g>` +
      textGroups("csms-logo-stacked.svg", [TEXT, MIST, MIST]),
  ),
);

// ─── Логотип для документов ──────────────────────────────────────────────────

write(
  "csms-logo-owner-modern.svg",
  svg(
    "0 0 480.87 104",
    480.87,
    104,
    "КСЗ — логотип с реквизитами владельца, тема «Современные закупки»",
    neonDefs("owner"),
    `<g transform="translate(16 16)">${neonTile("owner")}</g>` +
      textGroups("csms-logo-owner.svg", [TEXT, MIST, MIST]),
  ),
);

console.log("Готово: неоновый комплект в", DIR);
