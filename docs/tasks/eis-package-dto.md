# DTO пакета ЕИС для бэк-потока (Б4)

Спецификация полей, которые фронт уже отправляет в `POST /api/eis/packages`
и будет использовать после `Б4`. Источник — `src/services/Eis/eisPackages.schema.ts`
(`createEisPackageInputSchema`) и `EisPackagesPage.create()`.

Сейчас шлюз читает только первые четыре поля; `source` и `customer` он
игнорирует (System.Text.Json по умолчанию не падает на неизвестных свойствах),
поэтому добавление полей безопасно и не требует синхронного релиза.

## Тело запроса

| Поле | Тип | Обязательность | Что это |
|---|---|---|---|
| `documentType` | `"Notification" \| "ContractProject" \| "SmpAttraction" \| "ContractExecution"` | обязательно | вид сведений в ЕИС |
| `contractEisNumber` | `string` | обязательно | реестровый номер контракта в ЕИС (19 цифр) |
| `ikz` | `string` | обязательно | ИКЗ, 36 разрядов |
| `payloadXml` | `string \| null` | опционально | готовый XML пакета для `Notification` и `ContractProject` |
| `source` | `EisPackageSource \| null` | опционально (**новое, Б4**) | документ CSMS, из которого собран `payloadXml` |
| `customer` | `EisPackageCustomerSnapshot \| null` | опционально (**новое, Б4**) | снимок реквизитов заказчика на момент формирования |

## `source` — ссылка на документ-источник

```json
{
  "documentKind": "Notice",
  "documentId": "1",
  "documentNumber": "0148200000126000001"
}
```

| Поле | Тип | Обязательность | Комментарий |
|---|---|---|---|
| `documentKind` | `"Notice" \| "ContractProject" \| "Contract" \| "SmpReport" \| "ContractExecution"` | обязательно | таблица-источник в CSMS |
| `documentId` | `string`, непустое | обязательно | `id` документа в json-server (позже — GUID) |
| `documentNumber` | `string` | опционально | номер документа в ЕИС, если присвоен |

Зачем: после `Б4` карточка пакета должна объяснять, из какого документа он
собран, и позволять пересобрать XML без человека. Фронт заполняет
`documentId` для `Notification` и `ContractProject`; для остальных типов
`source` не передаётся.

## `customer` — снимок заказчика

```json
{
  "fullName": "ГБУЗ «Городская поликлиника № 1»",
  "shortName": "ГБУЗ ГП № 1",
  "inn": "0148000000",
  "kpp": "014801001",
  "okopf": "75203",
  "okfs": "13",
  "oktmo": "01482000001",
  "oktmoPpo": "01482000001",
  "regNumber": "01482000001"
}
```

Все поля опциональны и повторяют `OrganizationRequisitesSchema`. `regNumber` —
код по СПЗ (реестровый номер заказчика в ЕИС); фронт его пока не передаёт,
потому что в карточке организации нет отдельного поля СПЗ.

Зачем: пакет живёт годами, а карточку организации правят. Снимок фиксирует,
от чьего имени подписывался документ, и объясняет расхождение с текущей
карточкой.

## Что должен сделать `Б4`

1. Принять `source` и `customer` в `CreatePackageRequest` и сохранить в
   `EisPackage` (`SourceDocumentKind`, `SourceDocumentId`,
   `SourceDocumentNumber`, снимок заказчика — отдельным JSON или набором полей).
2. Отдавать их в ответах `GET /api/eis/packages` — тогда фронт покажет ссылку
   на источник в карточке пакета (после этого нужно расширить
   `eisPackageSchema`).
3. Снимок заказчика не перезаписывать при повторных действиях над пакетом:
   он фиксируется в момент создания.
