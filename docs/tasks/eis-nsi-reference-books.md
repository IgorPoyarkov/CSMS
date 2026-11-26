# Справочники ЕИС: связь XSD ↔ НСИ ↔ фронтенд (2026-11-26)

## Источник

Архив `Все_справочники_по_ЭП_v368(15.1)FCSNF-25057.zip`, внутри — XLSX на
104 листа (15 186 непустых строк). Это **структура и значения справочников ЕИС**:
код НСИ, таблица БД, колонки и строки. Прямых ссылок на XSD или на наши
компоненты в файле нет — они выводятся по коду НСИ.

## Что собрано

`scripts/reference-books/build_reference_book_links.py` читает XLSX и пишет
`public/nsi-reference-books.json`:

- для каждого из 104 листов — код НСИ, все встреченные коды, название,
  таблицу/колонки, число записей и 3 примера строк;
- `xsdRefs` — файлы из `eis-parser/schemas/Schemas44/*.xsd`, где встречен код
  (включая варианты `nsiFoo` / `nsiFooList` и таблицы БД из `NSI_ALL_LIST`);
- `uiRefs` — файлы `src/**`, где код встречается в коде, плюс ручная связка из
  `scripts/reference-books/ui-hints.json` для компонентов, которые читают
  справочник под другим именем;
- `ktru` и `externalDatasets` — отдельно описанные итоги по КТРУ и по
  справочникам, которых в выгрузке нет.

Итог пересборки: 72 справочника связаны с XSD, 27 — с интерфейсом.

```powershell
python scripts\reference-books\build_reference_book_links.py --xlsx <путь к xlsx>
```

Фронт читает JSON один раз через `useNsiReferenceBooks()`
(`src/services/Eis/nsiReferenceBooks.api.ts`, zod-проверка, React Query).
В модалке «Покрытие XSD ЕИС» (`EisCoverageModal`) под таблицей полей показан
список справочников этого XSD-файла и компоненты, которые их читают.

## КТРУ есть?

**Есть только описания справочника, нет позиций.** В листе «Перечень справочников
ЕИС» (код `nsiAllList`) записаны 11 кодов: `nsiKTRU`, `nsiKTRUNew`,
`nsiKTRUNewActive`, `nsiKTRUNewInactive`, `nsiKTRUNotUsingReasons`,
`nsiKTRUS`, `nsiRightSideKTRU`, `nsiRightSideKTRUs`, `nsiMinShareRusProductKTRUNKMISMNN`,
`nsiMinShareRusProductKTRUNKMISMNNLink` и др. Отдельного листа с кодами позиций
вида `01.13.43.110-00000002` в архиве нет (`ktru.valueSheets` пуст).

Рабочие позиции КТRU у нас подключены отдельно:
`KtruSelect` → `src/services/KtruRef/ktruRef.api.ts` → `/api/references/nsiKTRU/items`
(сейчас снимок; импорт через `getNsiRequest` готов, но ждёт токен ЕИС).

## Чего в архиве нет

`externalDatasets` в JSON фиксирует справочники, которые наши компоненты
используют, но которых нет среди 104 листов:

| Код | Где у нас | Источник |
| --- | --- | --- |
| `nsiOKPD2` | `Okpd2Select` | дерево НСИ ЕИС, `/api/references/nsiOKPD2/all` (21 066) |
| `nsiKTRU` | `KtruSelect` | `/api/references/nsiKTRU/items`, только описание в архиве |
| `nsiOKEI` | `OkeiSelect` | `/api/okei` + локальный снимок |
| `nsiKLADR` / `nsiOKTMO` | `AddressCascade` | ФИАС/ГАР по мастер-токену; ОКТМО нет загрузки |
| `nsiKOKS` | `KoksPickerModal` | локальный `/koksRefs` |
| `nsiPurchasePreferences` | ПП РФ № 2571, нацрежим | отдельный справочник ЕИС |

Поэтому «связать все XSD и все компоненты этими справочниками» возможно не
для всех пар: где справочника в выгрузке нет, связь показана как внешний
датасет с указанием реального источника, а не выдуманным кодом.

## Ограничения

- JSON содержит описания справочников, а не полные значения: для 104 листов
  это было бы несколько мегабайт и дублировало бы `/api/references/*`.
- Связка по коду НСИ — текстовая, а не семантическая: если в XSD код не
  упомянут, пара в каталог не попадёт (например, для части полей карты
  покрытия справочник в выгрузке не найден).
- `src/services/Eis/generated/**` из сканирования исключён: это сгенерированные
  из XSD типы, а не интерфейс.
