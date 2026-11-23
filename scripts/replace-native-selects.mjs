import fs from "node:fs";
import path from "node:path";

/**
 * Замена нативных <select> на единый компонент src/components/UI/Select.
 *
 * Скрипт делает только механическую часть: меняет теги и добавляет импорт.
 * API компонента совпадает с нативным select, поэтому содержимое
 * <option>, register(), value/onChange и className остаются как были.
 *
 * Запуск: node scripts/replace-native-selects.mjs [--dry]
 */

const root = process.cwd();
const srcDir = path.join(root, "src");
const selectFile = path.join(srcDir, "components", "UI", "Select.tsx");
const dry = process.argv.includes("--dry");

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && full.endsWith(".tsx")) {
      files.push(full);
    }
  }

  return files;
};

const importPathFor = (file) => {
  let relative = path.relative(
    path.dirname(file),
    path.join(srcDir, "components", "UI", "Select"),
  );
  relative = relative.split(path.sep).join("/");

  if (!relative.startsWith(".")) {
    relative = `./${relative}`;
  }

  return relative;
};

const insertImport = (code, importLine) => {
  const lines = code.split(/\r?\n/);
  let insertAt = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (/^import\b/.test(lines[index])) {
      let end = index;

      while (end < lines.length && !/;\s*$/.test(lines[end])) {
        end += 1;
      }

      insertAt = end + 1;
      index = end;
      continue;
    }

    const trimmed = lines[index].trim();

    if (
      insertAt > 0 &&
      trimmed !== "" &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*")
    ) {
      break;
    }
  }

  lines.splice(insertAt, 0, importLine);

  return lines.join("\n");
};

const files = walk(srcDir);
const report = [];
let total = 0;

for (const file of files) {
  if (path.resolve(file) === path.resolve(selectFile)) continue;

  let code = fs.readFileSync(file, "utf8");

  if (!/<select[\s>]/.test(code)) continue;

  const count = (code.match(/<select[\s>]/g) ?? []).length;

  code = code.replace(/<select(\s[^>]*)?>/g, "<Select$1>");
  code = code.replace(/<\/select>/g, "</Select>");

  const importLine = `import Select from "${importPathFor(file)}";`;

  if (
    !code.includes(importLine) &&
    !/from\s+["'][^"']*\/UI\/Select["']/.test(code)
  ) {
    code = insertImport(code, importLine);
  }

  total += count;
  report.push({
    file: path.relative(root, file).split(path.sep).join("/"),
    count,
  });

  if (!dry) {
    fs.writeFileSync(file, code, "utf8");
  }
}

report.sort((first, second) => second.count - first.count);

for (const row of report) {
  console.log(`${row.count.toString().padStart(2, " ")}  ${row.file}`);
}

console.log(
  `\n${dry ? "Будет заменено" : "Заменено"}: ${total} select в ${report.length} файлах.`,
);
