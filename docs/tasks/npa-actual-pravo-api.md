# API актуальной редакции НПА (actual.pravo.gov.ru / ips.pravo.gov.ru)

Источник НПА — только `pravo.gov.ru` (обязательное требование, см. `PROJECT.md`
«Источник НПА»). Актуальная редакция документа (с поправками) отдаётся порталом
`actual.pravo.gov.ru`, данные — из банка `ips.pravo.gov.ru`. Ниже — выясненный
реверс-инжинирингом API для программного получения актуальной редакции.

## База API

`http://actual.pravo.gov.ru:8000/api/ebpi/` (ASP.NET WebAPI; значение берётся из
`config.js` портала — `HTTP_HOST`). `bpa=ebpi` — код банка правовой информации.

Ответы — JSON, `charset=utf-8`; HTML документа приходит JSON-строкой.

## Цепочка получения актуальной редакции

### 1. Карточка документа (номер опубликования → id документа)

```
GET /api/ebpi/card/?bpa=ebpi&t={"pnum":"<номер опубликования>"}
```

`t` — URL-кодированный JSON. Пример ответа (ПП № 1875):

```json
{
  "docid": 313664,
  "docstate": "Действует с изменениями",
  "docpassing": "Постановление Правительства Российской Федерации от 23.12.2024 № 1875",
  "docname": "О мерах по предоставлению национального режима ...",
  "dochash": "04f46ea3a989cb4a95e7fb325353636a045142e504c36c2e8788191849119384",
  "publications": ["... 25.12.2024, № 0001202412250018", "..."],
  "error": ""
}
```

`docid` — внутренний целочисленный id документа (он же `rdk` в других вызовах).

### 2. Список редакций

```
GET /api/ebpi/redactions/?bpa=ebpi&t={"pnum":"<номер опубликования>"}
```

Ответ — массив `redactions[]`, у каждой: `redid` (int), `reddate` (yyyyMMdd),
`redcaption`, флаги `actual` (актуальная), `redinitial` (исходная), `hascontent`,
`contentcomplete`, `redstatus`.

Актуальная редакция — запись с `actual: true && hascontent: true`. Пример:

```json
{ "redid": 498227, "reddate": "20261101", "redcaption": " с 01.11.2026, актуальная, ...",
  "actual": true, "redinitial": false, "hascontent": true, "contentcomplete": true }
```

### 3. Текст редакции (HTML)

```
GET /api/ebpi/redtext?bpa=ebpi&t=<redid>&ttl=2
```

Ответ — JSON вида `{"redtext":"<!DOCTYPE html> ..."}`. В `redtext` — Word-HTML
(`xmlns:w="...office:word"`) с таблицами перечней: строка `<tr id="rNNN">`
с ячейками `<td>№</td><td><p class="L">наименование</p></td><td>код ОКПД2</td>`.

Пример строки перечня (Приложение № 1):

```html
<tr id="r200"><td>39.</td><td><p class="L">Подъемники, не включенные в другие группировки</p></td><td>28.22.11.190</td></tr>
```

## Кнопка «Скачать Word»

Серверного эндпоинта скачивания DOCX нет. Кнопка портала генерирует `.doc`
на клиенте: берёт HTML из `redtext` и сохраняет как Blob с типом
`data:application/msword;charset=utf-8`. То есть «Word-документ» = тот же
`redtext`-HTML, сохранённый как `.doc`.

## Другие полезные вызовы

- `GET /api/ebpi/getcontent/?bpa=ebpi&rdk=<docid>` — оглавление (`rdk` = `docid` из card).
- `GET /api/ebpi/bpainfo?bpa=ebpi&f=1` — служебная информация банка.

## Что это даёт агенту НПА

Текущий агент качает PDF первоначального опубликования с
`publication.pravo.gov.ru` и распознаёт его OCR'ом. По этому API можно вместо
OCR брать **актуальную редакцию уже как HTML**:

1. `card` → `docid`;
2. `redactions` → `redid` записи с `actual: true`;
3. `redtext` → JSON со строкой `redtext` (Word-HTML);
4. разобрать таблицы `<tr>` → (номер, наименование, код ОКПД2) — без OCR.

Адаптация `PravoDocumentClient` под этот API + новый HTML-парсер таблиц вместо
`NpaPdfParser`/OCR — отдельная задача бэкенда.
