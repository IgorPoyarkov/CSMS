#!/usr/bin/env python3
"""Собирает каталог справочников ЕИС и связывает его с XSD и фронтендом.

Источник — XLSX «Все справочники по ЭП» (выгрузка структуры НСИ ЕИС). На выходе
static JSON для /legal-сulture: для каждого справочника код НСИ, название,
колонки, число записей и файлы XSD/UI, где этот код встречается.

Запуск:
  python scripts/reference-books/build_reference_book_links.py --xlsx <путь к xlsx>

Python нужен только для сбора: в рантайме приложение читает готовый JSON.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# Коды НСИ в XSD и в коде пишутся по-разному: nsiPlacingWay, NSI_PLACING_WAY,
# nsi_placing_way, ZAKUPKI_NSI.NSI_PLACING_WAY. Приводим всё к одному виду.
TOKEN_RE = re.compile(
    r"(?i)\b(?:zakupki_nsi\.)?(?:nsi_z\.)?(nsi[_-]?[a-z0-9_]+)\b"
)
GENERIC_TOKENS = {
    "nsi", "nsiz", "nsiall", "nsis", "nsid", "nsicode", "nsilist",
}
# Один и тот же справочник в XLSX, XSD и нашем API называется по-разному.
ALIASES = {
    "nsispecialpurchases2020": "nsirpgzspecialpurchase2020",
    "nsicharacteristicsfillinginstructions": "nsifillingcharacteristics",
}
UI_HINTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui-hints.json")
KTRU_CODE_RE = re.compile(r"\b\d{2}\.\d{2}\.\d{2}\.\d{3}-\d{8}\b")
TABLE_RE = re.compile(
    r"(?i)\b(?:zakupki_nsi|nsi_z)\.([a-z0-9_]+)\b|\b(NSI_[A-Z0-9_]{3,})\b"
)
COLUMN_RE = re.compile(r"^[A-Z][A-Z0-9_]{2,}$")


def normalize(token: str) -> str:
    return re.sub(r"[^a-z0-9]", "", token.lower())


def norm_ident(value: str) -> str:
    """nsiPlacingWay, NSI_PLACING_WAY -> nsiplacingway."""
    return normalize(re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value))


def table_aliases(sheets: list[dict]) -> dict[str, str]:
    """Связывает таблицы БД из листов с кодами НСИ из NSI_ALL_LIST."""
    result: dict[str, str] = {}
    for sheet in sheets:
        if "перечень справочников" not in sheet["name"].lower():
            continue
        for row in sheet["rows"]:
            if len(row) < 3:
                continue
            code = norm_ident(row[1])
            if not code.startswith("nsi"):
                continue
            # 3 — EXPORT_TAG (имя выгрузки), 6 — TABLES_NAME (таблица БД).
            for index in (3, 6):
                cell = row[index] if len(row) > index else ""
                key = norm_ident(cell)
                if key:
                    result[key] = code
    return result


def column_index(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha()).upper()
    index = 0
    for ch in letters:
        index = index * 26 + ord(ch) - 64
    return index - 1


def read_sheets(xlsx_path: str) -> tuple[list[dict], list[str]]:
    """Возвращает листы с ненулевыми ячейками и всеми строками как списки."""
    with zipfile.ZipFile(xlsx_path) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        strings = [
            "".join(t.text or "" for t in si.iter(f"{{{NS_MAIN}}}t"))
            for si in shared_root.findall(f"{{{NS_MAIN}}}si")
        ]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.get("Id"): rel.get("Target") for rel in rels}

        sheets = []
        for sheet in workbook.findall(f"{{{NS_MAIN}}}sheets/{{{NS_MAIN}}}sheet"):
            rid = sheet.get(f"{{{NS_REL}}}id")
            target = targets[rid].lstrip("/")
            path = target if target.startswith("xl/") else f"xl/{target}"
            root = ET.fromstring(archive.read(path))
            rows = []
            for row in root.findall(f".//{{{NS_MAIN}}}sheetData/{{{NS_MAIN}}}row"):
                cells = {}
                for cell in row.findall(f"{{{NS_MAIN}}}c"):
                    value_el = cell.find(f"{{{NS_MAIN}}}v")
                    if value_el is None:
                        inline = cell.find(f"{{{NS_MAIN}}}is")
                        value = (
                            "".join(t.text or "" for t in inline.iter(f"{{{NS_MAIN}}}t"))
                            if inline is not None
                            else ""
                        )
                    else:
                        value = value_el.text or ""
                        if cell.get("t") == "s" and value:
                            value = strings[int(value)]
                    if value:
                        cells[column_index(cell.get("r", "A1"))] = value
                if cells:
                    rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
            sheets.append({"name": sheet.get("name"), "rows": rows})
    return sheets


def pick_title(sheet: dict) -> str:
    for row in sheet["rows"][:3]:
        for cell in row:
            text = re.sub(r"\s+", " ", cell).strip()
            if "справочник" in text.lower() and 8 < len(text) < 400:
                return text
    for row in sheet["rows"][:2]:
        for cell in row:
            text = re.sub(r"\s+", " ", cell).strip()
            if len(text) > 12 and re.search(r"[А-Яа-яЁё]", text):
                return text[:300]
    return sheet["name"]


def pick_columns(rows: list[list[str]]) -> tuple[int, list[str]]:
    for index, row in enumerate(rows[:8]):
        candidates = [cell.strip() for cell in row if COLUMN_RE.match(cell.strip())]
        if len(candidates) >= 2:
            return index, candidates[:40]
    return 0, []


def scan_sources(base: str, extensions: tuple[str, ...]) -> dict[str, dict[str, list[int]]]:
    """Код НСИ -> файл -> номера строк."""
    found: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [
            name for name in dirnames
            if name not in {"node_modules", ".git", "dist", "bin", "obj", "generated"}
        ]
        for filename in filenames:
            if not filename.endswith(extensions):
                continue
            full = os.path.join(dirpath, filename)
            relative = os.path.relpath(full, ROOT).replace(os.sep, "/")
            if "/generated/" in relative or relative.endswith(".d.ts"):
                # Сгенерированные типы дублируют XSD, но не являются UI-кодом.
                if base.endswith(os.sep + "src"):
                    continue
            try:
                with open(full, encoding="utf-8", errors="ignore") as source:
                    lines = source.readlines()
            except OSError:
                continue
            for line_number, line in enumerate(lines, 1):
                for token in TOKEN_RE.findall(line):
                    key = normalize(token)
                    if key not in GENERIC_TOKENS:
                        found[key][relative].append(line_number)
    return found


def build_book(sheet: dict, aliases: dict[str, str]) -> dict:
    rows = sheet["rows"]
    header_index, columns = pick_columns(rows)
    flat = " ".join(cell for row in rows for cell in row)
    tokens = Counter(
        key for token in TOKEN_RE.findall(flat)
        if (key := normalize(token)) not in GENERIC_TOKENS
    )
    # Листы называют справочник таблицей БД (ZAKUPKI_NSI.NSI_...), а XSD и API —
    # кодом НСИ. Подставляем код по NSI_ALL_LIST, чтобы связать их с XSD.
    for match in TABLE_RE.finditer(flat):
        key = norm_ident(match.group(1) or match.group(2))
        code = aliases.get(key)
        if code:
            tokens[code] += 1
    if "перечень справочников" in sheet["name"].lower():
        primary = "nsialllist"
    elif tokens:
        # Код без суффикса List предпочтительнее: он используется в XSD и API.
        primary = next(
            (token for token, _ in tokens.most_common() if not token.endswith("list")),
            tokens.most_common(1)[0][0],
        )
    else:
        primary = ""
    data_rows = rows[header_index + 1:]
    ktru_items = sum(1 for row in rows if any(KTRU_CODE_RE.search(cell) for cell in row))
    return {
        "sheet": sheet["name"],
        "code": primary,
        "codes": [token for token, _ in tokens.most_common(16)],
        # Полный набор кодов нужен только для связки с XSD/UI; в JSON не пишется.
        "_allCodes": sorted(tokens),
        "title": pick_title(sheet),
        "columns": columns,
        "rowCount": len(data_rows),
        "sampleRows": [[cell[:160] for cell in row[:8]] for row in data_rows[:3]],
        "ktruItems": ktru_items,
    }


def token_variants(token: str) -> set[str]:
    """XSD использует nsiFooList там, где в выгрузке написано nsiFoo."""
    variants = {token}
    for suffix in ("list", "s"):
        if token.endswith(suffix) and len(token) > len(suffix) + 3:
            variants.add(token[: -len(suffix)])
        else:
            variants.add(token + suffix)
    return variants


def link_tokens(book: dict, locations: dict, aliases: dict) -> dict:
    """Собирает ссылки на файлы по всем кодам справочника, включая алиасы."""
    files: dict[str, dict] = defaultdict(lambda: {"lines": [], "hits": 0})
    for token in book["_allCodes"]:
        keys = token_variants(token)
        keys.update(
            a for a, target in aliases.items() if target == token
        )
        for key in keys:
            for path, lines in locations.get(key, {}).items():
                entry = files[path]
                entry["lines"] = sorted(set(entry["lines"] + lines))[:12]
                entry["hits"] += len(lines)
    return files


def attach_links(books: list[dict], xsd: dict, ui: dict) -> None:
    with open(UI_HINTS_FILE, encoding="utf-8") as source:
        ui_hints = json.load(source)

    for book in books:
        xsd_files = link_tokens(book, xsd, ALIASES)
        book["xsdRefs"] = [
            {"file": path, "hits": info["hits"], "lines": info["lines"], "source": "xsd"}
            for path, info in sorted(
                xsd_files.items(), key=lambda item: -item[1]["hits"]
            )[:8]
        ]

        ui_files = link_tokens(book, ui, ALIASES)
        for token in book["_allCodes"]:
            for path in ui_hints.get(token, []):
                if os.path.isfile(os.path.join(ROOT, path)):
                    entry = ui_files[path]
                    entry["hits"] += 1
                    entry["declared"] = True
        book["uiRefs"] = [
            {
                "file": path,
                "hits": info["hits"],
                "lines": info["lines"],
                "source": "declared" if info.get("declared") else "code",
            }
            for path, info in sorted(
                ui_files.items(), key=lambda item: -item[1]["hits"]
            )[:8]
        ]
        del book["_allCodes"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", required=True, help="Путь к XLSX со справочниками ЕИС")
    parser.add_argument(
        "--out",
        default=os.path.join(ROOT, "public", "nsi-reference-books.json"),
        help="Куда записать каталог",
    )
    args = parser.parse_args()

    sheets = read_sheets(args.xlsx)
    aliases = table_aliases(sheets)
    books = [build_book(sheet, aliases) for sheet in sheets]
    all_list_codes = next(
        (book["_allCodes"] for book in books if book["code"] == "nsialllist"),
        [],
    )
    xsd = scan_sources(os.path.join(ROOT, "eis-parser", "schemas"), (".xsd",))
    ui = scan_sources(os.path.join(ROOT, "src"), (".ts", ".tsx"))
    attach_links(books, xsd, ui)

    ktru_books = [
        book["sheet"] for book in books
        if "ktru" in " ".join(book["codes"]) and book["code"] != "nsialllist"
    ]
    ktru_codes = sorted({code for code in all_list_codes if "ktru" in code})
    ktru_item_sheets = [book["sheet"] for book in books if book["ktruItems"] > 0]
    with open(UI_HINTS_FILE, encoding="utf-8") as source:
        hints = json.load(source)
    external = [
        {
            **item,
            "ui": [
                path for path in item["ui"]
                if os.path.isfile(os.path.join(ROOT, path))
            ],
        }
        for item in hints.get("_external", [])
    ]
    payload = {
        "sourceFile": os.path.basename(args.xlsx),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "bookCount": len(books),
        "xsdFileCount": len({
            ref["file"] for book in books for ref in book["xsdRefs"]
        }),
        "ktru": {
            "descriptorSheets": ["Перечень справочников ЕИС"] if ktru_codes else [],
            "descriptorCodes": ktru_codes,
            "valueSheets": ktru_item_sheets,
            "appDataset": "nsiKTRU",
            "appEndpoint": "/api/references/nsiKTRU/items",
        },
        "externalDatasets": external,
        "books": books,
    }
    with open(args.out, "w", encoding="utf-8") as output:
        json.dump(payload, output, ensure_ascii=False, separators=(",", ":"))

    print(f"Листов: {len(books)}")
    print(f"Связано с XSD: {sum(bool(b['xsdRefs']) for b in books)}")
    print(f"Связано с UI: {sum(bool(b['uiRefs']) for b in books)}")
    print(f"Книг с KTRU в кодах: {len(ktru_books)}")
    print(f"Листов с кодами позиций КТРУ: {payload['ktru']['valueSheets']}")
    print(f"Записано: {args.out} ({os.path.getsize(args.out)} байт)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
