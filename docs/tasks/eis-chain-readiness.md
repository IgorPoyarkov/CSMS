# Готовность цепочки ПГ → СЗ → Извещение → Контракт к выгрузке в ЕИС

Аудит по состоянию на 2026-11-20. Источник цифр — код `csms/src/services/Eis/**`,
`csms/db.json`, `csms-api/src/**`, `csms-api/docs/eis-open-questions.md`,
`.koda/PROJECT_STATE.md §§27, 29–32, 35, 39, 59`. Документ — не генератор XML и не
замена C#-мапперу; это чек-лист для раздачи агентам.

## 1. Вердикт

**Цепочка как интерфейс и модель данных готова на ~80–85 %, но как контур передачи
валидных данных в ЕИС — на ~20–30 %.** До «отдать на бэк валидные данные для
XML» не хватает трёх независимых вещей:

1. **Нет маппера и утверждённых форм.** Альбом 17.0 скачан (32 XSD + 16 WSDL,
   8720 типов), нужные типы (`tenderPlan2020Type`, `notification2020Type`,
   `contractProjectType`, `zfcs_contract2015Type`, `contractExecution*`) в нём
   есть — но это просмотр формата, а не генерация XML. Утверждённых форм ТФФ
   по 658/215н и 918 в архиве нет, поэтому `PlaceholderXmlBuilder` честно пишет
   `placeholder-v0`, а корни фронтовых превью не совпадают с глобальными
   элементами XSD.
2. **Нет маппера домена в XML.** Бэкенд-билдер принимает только
   `(documentType, contractEisNumber, ikz)` (`PlaceholderXmlBuilder.cs:23`) —
   ни одного поля из карточки ПГ/извещения/контракта в XML не попадает.
3. **Нет подписи и живого канала.** CPSignEx реализован только для входа по
   сертификату; транспорт — `MockEisTransport`; ЕИС сбрасывает TLS-handshake,
   а `getNsi` отвечает «Токены для сервисов отдачи отсутствуют в ЕИС».

Отдельно: **не все справочники готовы** — КТРУ в `db.json` ограничено демо-записью
`nsiKTRU / sse-073720`, реальные выгрузки `getDocsIP` заблокированы токеном ЕСИА.

## 2. Метрики готовности

| Слой | Готовность | Что есть | Что мешает |
|---|---:|---|---|
| Интерфейс и сборка данных цепочки | ~80–85 % | формы, zod-схемы, мапперы `eis17Types.ts`, XML-превью, проверки | нет связующего UI-сборщика цепочки |
| Соответствие полей целевым XSD (строго: `mapped=1`, `partial=0.5`) | **56 %** | 60 `mapped` + 66 `partial` из 166 полей карты | 24 `missing`, 16 `derived` |
| То же, если считать `partial` за покрытые | 76 % | 126/166 | `partial` требует уточнения путей и преобразований |
| Инженерный контур отправки | ~20 % | каталог XSD, валидация, ZIP (XML + `.sig`), статусы пакетов | `placeholder-v0`, mock-транспорт, нет ЭЦП-подписи, TLS закрыт; XSD-валидация в runtime может быть отключена |
| Справочники | ~35 % | ОКПД2 — 21 066 в API с версией и SHA-256; регионы (89), муниципалитеты (31), ОКЕИ (543), организации (6) | единственный живой датасет — ОКПД2; КТРУ демо (6), нет токена ЕИС, адреса/страны/ОКТМО/КБК — ручной ввод |

**Итоговая оценка готовности передать валидные данные для ЕИС: ~20–30 %.**
Это добротно сделанный каркас с честными заглушками, а не готовый обмен.

## 3. Карта покрытия XSD (`EIS_XSD_COVERAGE`, снимок 17.0)

| Наша модель | Целевой XSD-тип | Полей | mapped | partial | missing | derived | Готовность строго |
|---|---|---:|---:|---:|---:|---:|---:|
| `NoticeInfoFormValues` | `zfcs_purchaseNotificationType` + `zfcs_notificationEFType` | 38 | 23 | 14 | 0 | 1 | 79 % |
| `ContractRegistryItem` | `zfcs_contract2015Type` | 15 | 4 | 9 | 2 | 0 | 57 % |
| `ContractStage` | `stagetInfoType / contractInfo/stage` | 6 | 3 | 1 | 1 | 1 | 58 % |
| `ContractPayment` | `contractExecutionPaymentType/payDocumentInfo` | 9 | 3 | 4 | 1 | 1 | 56 % |
| `ContractSmpRecord` | `executionOtherInfo/subContractorsnfo` | 13 | 4 | 6 | 3 | 0 | 54 % |
| `PurchasePlan` | `zfcs_purchasePlanType` | 19 | 7 | 6 | 4 | 2 | 53 % |
| `ContractDelivery` | `contractExecutionDocAcceptanceType/docAcceptanceInfo` | 7 | 0 | 7 | 0 | 0 | 50 % (все `partial`, путь не сверен) |
| `ContractProject` | `contractProjectType` | 26 | 5 | 12 | 0 | 9 | 42 % |
| `PurchasePlanPosition` | `zfcs_purchasePlanPositionType` | 33 | 11 | 7 | 13 | 2 | 44 % |
| `SmnpReport` | `zfcs_customerReportSmallScaleBusinessType` | 0 | 0 | 0 | 0 | 0 | 0 % (поля не сверены) |
| **ИТОГО** | | **166** | **60** | **66** | **24** | **16** | **56 %** |

### Обязательные по XSD дыры (блокируют валидный XML)

- `PurchasePlan`: `planPeriod`, `approveDate` — `missing`; `approvalDate` — `partial`.
- `PurchasePlanPosition`: `kvrCode`, «срок осуществления закупки», «обоснование
  закупки» (`basementInfo`) — `missing`.
- `NoticeInfoFormValues`: `contractConditions.isRelativeTerms / startOffsetDays /
  durationDays` — `partial`.
- `ContractProject`: `organizationId`, `eisInfo.placerRole`,
  `eisInfo.purchaseNumber`, `supplierName` — `partial` (заполняются из связанного
  извещения, но не проверены на отправку).

⚠️ Возможна рассинхронизация карты: в `purchasePlan.schema.ts` уже есть
`planPeriodFirstYear/SecondYear` (строки 597–598, 1098–1099), а §31 заметки
сообщает о добавленных `kvr`/`ktruCode`. Первому агенту — сверить
карту с актуальными схемами и отметить, это «нет поля» или «поле есть, но не
заполняется».

## 4. Что уже подтягивается автоматически

| Связь | Где | Состояние |
|---|---|---|
| Извещение/СЗ/ООЗ/организация → проект контракта | `buildContractProjectDraft` (`contractProjectPrefill.ts:150`), вызовы в `ContractProjectForm.tsx:203,387` | 🟢 предмет, цена, сроки, приёмка, качество, обеспечения, СМП, КБК, реквизиты, подписант, адреса |
| ПГ → DTO ЕИС 17.0 + валидация + XML-превью | `mapPurchasePlanToEis17` (`eis17Types.ts:644`), `validatePurchasePlanEis17` (:1317), `buildTenderPlan2020XmlPreview` (:2219), кнопка в `PurchasePlanCard.tsx:653` | 🟢 есть, но превью ≠ отправляемый XML |
| Извещение → DTO + валидация + превью | `mapNoticeInfoToEis17` (:983), `validateNoticeInfoEis17` (:1722), `buildNotification2020XmlPreview` (:2274), `NoticeInfoForm.tsx:1705`, `EisPackagesPage.tsx:181` | 🟢 есть |
| ИКЗ 36 разрядов | `buildIdentificationCode` в `purchasePlan.schema.ts` | 🟢 исправлен в §35 |
| Сквозная цепочка ПГ→извещение→контракт→СМП | `buildEisChains` (`eisChainBuilder.ts:763`), `eisChainIssues`, `eisChainProgress`, `applyEisIdentifiers` | 🔴 **определена, но нигде не вызвана**: в `src/components/**` используется только карта покрытия в `EisCoverageModal` |
| Пакет на бэк | `useCreateEisPackage` (`eisPackages.api.ts:92`), `CreateEisPackageInput` (:79) | 🟡 `payloadXml` передаётся только для `Notification`/`ContractProject`; для `SmpAttraction`/`ContractExecution` бэк сам собирает заглушку |
| ПГ и СЗ как документы обмена | `buildTenderPlan2020XmlPreview` есть (`eis17Types.ts:2219`), но в `EIS_DOCUMENT_TYPES` (`eisPackages.schema.ts:13–18`) нет ни `TenderPlan`, ни `ServiceNote` | 🔴 ПГ — только предпросмотр в карточке, СЗ — только данные для извещения; пакетов нет |
| Контекст документа в пакете | `CreateEisPackageInput` (`eisPackages.api.ts:79–90`), `CreatePackageRequest` (`EisPackageContracts.cs:11–15`) | 🔴 нет `planId`/`positionId`/`purchaseNoteId`/`objectDescriptionId`/`noticeId`/`contractProjectId`, нет `organizationId` и снимка реквизитов заказчика; шлюз не может перепроверить XML |
| Валидация при создании пакета | `EisPackagesPage.tsx:178–191` против `NoticeInfoForm.tsx:1705`, `ContractProjectForm.tsx:275–282` | 🔴 `validate*Eis17` вызываются в формах, но **не вызываются** при `create()` пакета |

Разрывы по звеньям:

- **ПГ → СЗ:** ИКЗ, ОКПД2, НМЦК, КБК, способ, заказчик/инициатор подтягиваются;
  не хватает КТРУ, срока/периодичности, цели и обоснования закупки (обязательные
  по XSD) и контактов.
- **СЗ → Извещение:** базовый контур совпадает; не хватает протокола-основания,
  номера заявки, структурированной формы и файлов проекта контракта.
- **Извещение → Контракт:** `eisInfo` заполняет номер закупки, способ, ЭТП,
  формулу цены, неопределённый объём, роль размещающего; протокол/заявка
  остаются на этапе процедуры, изменение цены и файлы — незаполнены.
- **Контракт → исполнение:** нет реестрового номера ЕИС (19 цифр), дат
  начала/окончания исполнения, `bankDocumentNumber`, суммы этапа.

## 5. Справочники: готовность

| Справочник | Источник сейчас | Объём | Готовность к API/XML |
|---|---|---:|---|
| ОКПД2 | живой снимок ЕИС в `/api/references/*` + демо-оверлей 143 записей в `db.json` | **21 066** в API (`eis-nsiOKPD2-7c7ee4215e3ee405`, SHA-256) | 🟢 коды/наименования есть; 🟡 бизнес-признаки (`isNormed`, `nationalRegime`, `isAuctionRequired`) всё ещё берутся из локальных 143 записей |
| КТРУ | `db.json` демо `nsiKTRU / sse-073720`; парсер `NsiXmlParser` готов, но в API не поддерживается `nsiKTRU` | 6 | 🔴 нужна реальная выгрузка `getNsi`, точный `nsiCode` из `nsiAllList`, токен из ЕСИА |
| Адреса (ГАР/ФИАС) | `addressRegions` + `addressMunicipalities` | 89 + 31 | 🟡 демонстрационный набор, мастер-токен ФНС нет; `oksmCode`/`garGuid` в извещении есть |
| Организации/сотрудники/КС | `db.json` + API доступа (импорт 6/40/6/4) | 6 / 40 / 6 / 4 | 🟡 реквизиты есть, но `regNum`/`consRegistryNum`/`oktmo`/`okopf` у демо-организаций не заполнены — валидатор XML красный |
| ОКЕИ | прокси `/okei`, `OkeiSelect` | 543 | 🟡 источник не версионирован, нет в `ref.datasets` |
| Правовые акты | `legalActs` | 22 | 🟢 сверена часть актов |
| Функции КС | `contractFunctions` | 43 | 🟢 |
| КБК / КВР / валюта / страны / ОКТМО | поля в схемах, часть захардкожена (`RUB`, `643`) | — | 🔴 отдельного справочника нет, коды не валидируются |
| `koksRefs` | `db.json` | 6 | ⚠️ чужая незакоммиченная WIP — не трогать |

## 6. Скачанный пул XSD и что в нём НЕ покрыто фронтом

### Что скачано

- `csms-api/schemas/17.0/` — **32 XSD**, ~10,8 МБ, `.manifest.json`:
  `Version=17.0`, `SourceId=44668`, `Sha256=47C47E54…E2E9D9D`, 32 файла,
  установлено 2026-11-19.
- `csms/eis-parser/schemas/Schemas44/` — **32 XSD + 16 WSDL** («Альбом ТФФ 17.0,
  итерация 2»), с исправленной опечаткой архива `?>>` → `?>`.
- `csms/public/eis-schemas/catalog.json` — 8,7 МБ, **8720 типов**, 33 namespace;
  `csms/src/services/Eis/generated/eisSchemas.generated.d.ts` — 6,6 МБ,
  8720 объявлений. Генератор — `csms-api/scripts/generate-schema-docs.ps1`.
- `eis-parser/schemas/TYPE_CATALOG.json` — 3548 глобальных определений.

**Важная корректура:** требуемые типы в Альбоме 17.0 **есть** — это не «схемы
не скачаны». Проблема в том, что обозреватель показывает формат, а мапперов и
отправляемого XML нет; утверждённых форм ТФФ по 658/215н и 918 (с версией и
требованиями ФЛК) в архиве нет — об этом честно говорит
`csms-api/docs/eis-open-questions.md §1`.

| Документ | XSD-тип / корневой элемент в 17.0 | Покрытие фронтом |
|---|---|---|
| План-график | `tenderPlan2020Type` (`IntegrationTPTypes.xsd:7`), корень `tenderPlan2020` (`fcsIntegration.xsd:2404`); `zfcs_purchasePlanType` (`IntegrationTypes.xsd:63286`) | 🟡 DTO + маппер + валидатор + превью, но **в пакет не уходит** |
| Извещение | `notification2020Type` (`IntegrationEPTypes.xsd:10080`), корень `fcsNotificationEF` (`fcsIntegration.xsd:991`) | 🟡 `payloadXml` уходит в шлюз, но корень превью `<notificationEF2020>` **не совпадает** с XSD-элементом |
| Служебная записка | отдельного корня нет — данные уходят в блоках извещения | 🟡 внутренний документ, пакета нет |
| Проект контракта | `contractProjectType` (`IntegrationCPTypes.xsd:6150`) | 🟡 `payloadXml` есть; корень `<contractProject>` не объявлен глобальным элементом 17.0 |
| Реестр контрактов (918) | `zfcs_contract2015Type` (`IntegrationTypes.xsd:15708`) | 🟡 только карточка + карта полей, XML/пакета нет |
| Изменение/расторжение | `zfcs_contractCancel2015Type` (`IntegrationTypes.xsd:22358`), `contractTerminationUnilateralRefusalType` (`IntegrationCETypes.xsd:1849`) | 🔴 чекпоинты и `ContractChange*` есть, XML нет |
| Приёмка/акты | `contractExecutionDocAcceptanceType` (`IntegrationCETypes.xsd:1997`) | 🔴 все поля `partial`, «путь уточнить при маппинге» |
| Платежи/исполнение | `contractExecutionPaymentType` (`:7`), корень `fcsCustomerReportContractExecution` (`fcsExport.xsd:420`) | 🔴 `EisDocumentType.ContractExecution` есть, `payloadXml` нет |
| Привлечение СМП | `subContractorsnfo` (`:1356`), `contractExecutionOtherType` (`:1245`) | 🔴 `payloadXml` нет; CSV + фиктивный номер `EIS-SMP-<id>` |
| Отчёт СМП/СОНКО (238) | `zfcs_customerReportSmallScaleBusinessType` (`IntegrationTypes.xsd:33093`) | 🔴 `SmnpReport.fields = []`, XML нет |
| Протоколы EF/OK/ZK/ZP/PO/Cancel | `zfcs_protocolEF1Type` (`:45953`) и др., корни `fcsProtocol*` (`fcsExport.xsd:265–405`) | 🔴 нет DTO, маппера, пакета |
| Отмена/изменение извещения | `zfcs_notificationCancelType` (`:36735`), `fcsNotificationCancel` | 🔴 отдельного пакета нет |
| WSDL/печатные формы/справочники | `fcsPrintForm.xsd`, `IntegrationPFTypes.xsd`, 16 WSDL | 🟡 используются только в `eis-parser` для SOAP/НСИ |

### Не покрыто по существу

1. **Маппер домена в XML** — `PlaceholderXmlBuilder.cs:23–34` берёт только
   `(documentType, contractEisNumber, ikz)`; ни одного поля XSD в выводе нет.
2. **Соответствие корневых элементов** — превью `<notificationEF2020>`,
   `<contractProject>` не являются глобальными элементами 17.0; payload
   помечается `SchemaVersion="17.0"` и может не пройти XSD-валидацию шлюза.
3. **Утверждённые ТФФ по 658/215н и 918** для исполнения контракта и СМП —
   `docs/eis-open-questions.md §1`.
4. **Протоколы, изменение/расторжение, отмена извещения, отчёт 238, приёмка,
   платежи, обеспечение, неустойки** — мапперов и XML нет.
5. **XSD-валидация в runtime может быть отключена** — `EisPackageService.cs:194`
   пропускает проверку, если `HasSchema(version) == false`; `schemas/**` не
   копируются в output, `EIS_SCHEMAS_ROOT` не задан; `placeholder-*` не
   валидируется никогда.
6. **`ReviseAsync` теряет исходный XML** — `EisPackageService.cs:232–245` всегда
   вызывает `xmlBuilder.Build(...)`, то есть заменяет настоящий `payloadXml`
   черновиком `placeholder-v0`.
7. **Конверт ВС и подпись (SOAP/XmlDSig/ГОСТ-TLS)** — `MockEisTransport`,
   регистрация внешней системы не выполнена.
8. **API-каталог шлюза не используется обозревателем** — хуки
   `useEisSchemaStatus`/`useEisSchemaCatalog` (`eisPackages.api.ts:208–232`)
   определены, но `/eis/schemas` читает статический `catalog.json`; SSE `/events`
   и `/changes` фронтом не подписаны.
9. **Contract-специфичные дыры:** у этапов нет `sid` (ЕИС идентифицирует по нему,
   а не по порядковому номеру) и не маппится сумма (`paymentsSumInfo`); у оплат
   типы `advance/intermediate/final` не переведены в коды XSD `PC/PN/RC/RE`,
   нет таймера 7/10 раб. дней и поля `regNumberExecution`; неустойки не имеют
   отдельной карты XSD; отчёт 238 строит XML в своём namespace
   `urn:csms:reports:smnp238:1.0`, а не по XSD ЕИС.

### Дефрагментация контракта (8 частей)

| Часть | Сущности | Статус | Пакет работ |
|---|---|---|---|
| Проект контракта (ст. 34, 51) | `contractProjects` | 🟡 текстовый конструктор готов; протокол, `appNumber`, `isStructuredForm`, `changePrice`, файлы и реквизиты поставщика пустые | B3 |
| Реестр + чекпоинты (ст. 82, 83, 103) | `contractRegistry`, `contractEvents` | 🟡 CRUD и таймлайн есть; «Подгрузить» ищет только по нашей базе, `registry_included` вручную | D6, B4 |
| Этапы исполнения | `contractStages` | 🟡 учёт есть, связи с ЕИС по `sid` нет | D5 |
| Оплаты | `contractPayments` | 🟡 нет таймера 7/10 раб. дней, кодов XSD и выгрузки | D2 |
| Неустойки и поставки/акты | `contractPenalties`, `contractDeliveries` | 🟡 расчёт есть, генерация требований и выгрузка нет; все 7 полей приёмки `partial` | D1, D5 |
| Изменение/расторжение (ст. 95) | `contract.contract_changes` | 🟡 домен/API/UI готовы, ЕИС-выгрузки нет, типа в `EisDocumentType` нет | D4 |
| Электронное актирование (ст. 94) | `contract.contract_acceptances` | ⚠️ чужая WIP, XML-маппера нет, `Acceptance*` отсутствуют в карте XSD | D1 (только описание) |
| СМП + отчёт СМП/СОНКО (ст. 30, ПП 1466/238) | `contractSmpRecords`, `smnpReports` | 🟡 CSV вместо XML, нет флага «подрядчик сам СМП», отчёт 238 в своём namespace | D3 |

## 7. Дефрагментация для раздачи агентам (объём = доля работ, сумма 100 %)

| № | Пакет | Исполнитель | Объём | Приоритет | Definition of done |
|---|---|---|---:|---|---|
| A1 | Достать утверждённые ТФФ 658/215н и 918, привести XML к глобальным элементам 17.0 (`fcsNotificationEF`, `tenderPlan2020`, `contractProject`), заменить `PlaceholderXmlBuilder` маппером домена | бэк + аналитик | 15 % | P0 | `SchemaVersion` настоящий, XML проходит XSD, тесты на контрольных закупках |
| A2 | Регистрация ВС, подпись транспортного конверта, ГОСТ-TLS, реальный транспорт вместо `MockEisTransport` | бэк | 10 % | P0 | тестовый контур ЕИС принимает пакет, статус `AcceptedInLk` |
| A3 | CPSignEx: подпись документов плагином КриптоПро (ПГ, извещения, контракты, СЗ), сценарии «нет токена / не тот сертификат / истёк» | фронт | 9 % | P0 | подписанный пакет уходит на бэк, ошибки сертификата понятны пользователю |
| A4 | **Быстрые фиксы шлюза:** починить `ReviseAsync` (не терять `payloadXml`), включить XSD в runtime (`EIS_SCHEMAS_ROOT`), вызывать `validate*Eis17` перед созданием пакета | бэк + фронт | 6 % | P0 | отклонённый пакет пересобирается без потери XML; валидатор не пропускает мусор |
| B1 | ПГ: добить обязательные поля XSD (`kvrCode`, `execution`, `basementInfo`, `planPeriod`, `approveDate`, контакты) + актуализировать карту покрытия | фронт | 8 % | P0 | `validatePurchasePlanEis17` проходит на реальных данных, карта совпадает со схемами |
| B2 | СЗ → Извещение: протокол-основание, номер заявки, структурированная форма, файлы проекта контракта | фронт | 6 % | P1 | предзаполнение извещения из СЗ без ручного ввода этих полей |
| B3 | Извещение → Контракт: `eisInfo`, протокол, `isStructuredForm`, `changePrice`, файлы | фронт | 6 % | P1 | проект контракта собирается с заполненными обязательными полями `contractProjectType` |
| B4 | Подключить `buildEisChains` к UI: проверки, «сироты», прогресс, сохранение номеров ЕИС; добавить СЗ в источник цепочки | фронт | 5 % | P1 | экран цепочки показывает 4 шага и разрывы, номера ЕИС сохраняются |
| B5 | Решить судьбу ПГ/СЗ как пакетов: либо добавить `TenderPlan`/`ServiceNote` в `EIS_DOCUMENT_TYPES` и DTO, либо явно зафиксировать их как внутренние документы | аналитик + фронт + бэк | 4 % | P0 | в DTO пакета есть `sourceDocumentId`/`documentKind` и organization/customer snapshot |
| C1 | КТРУ/ОКПД2/адреса: токен ЕИС, парсер выгрузок `getDocsIP`, импорт через `/api/references/import`, переключить фронт с `db.json` | парсер + бэк + фронт | 9 % | P0 | реальные версии справочников в API, изменения мапперов показываются человеку |
| C2 | Остальные справочники: ОКЕИ, OKSM/страны, ОКТМО, КБК, валюты, единицы; вынос из захардкоженных массивов | фронт + бэк | 4 % | P2 | справочники доступны через API, коды валидируются |
| D1 | Приёмка/электронное актирование: сверка с XSD, уточнение путей (сейчас 0 `mapped`, 7 `partial`); чужая WIP не трогать | фронт + бэк | 5 % | P1 | карта покрытия приёмки имеет реальные статусы, маппер готов |
| D2 | Оплата: `bankDocumentNumber`, коды XSD `PC/PN/RC/RE`, `regNumberExecution`, таймер 7/10 раб. дней | фронт + бэк | 3 % | P1 | сведения об оплате проходят XSD-валидацию |
| D3 | СМП: `period`, `paidToSupplierDate`, `address`, флаг «подрядчик сам СМП», два пути выгрузки; отчёт 238 перевести с `urn:csms:reports:smnp238:1.0` на XSD ЕИС | фронт + бэк | 5 % | P1 | карта СМП заполнена, отчёт сверен с XSD |
| D4 | Изменение/расторжение + доп. соглашения + протоколы + отмена/изменение извещения: мапперы и пакеты | фронт + бэк | 3 % | P2 | изменения и протоколы выгружаются в ЕИС |
| D5 | Этапы (`sid`, `amount` из `paymentsSumInfo`) + неустойки + обеспечение/гарантия/аванс | фронт + бэк | 1 % | P2 | этапы и обеспечение имеют маппинг в XSD |
| D6 | Реестр контрактов: `initialMaxPrice`, даты исполнения, валидация ИКЗ (сейчас только реестровый номер) | фронт + бэк | 1 % | P1 | карточка контракта отдаёт полный набор полей `zfcs_contract2015Type` |

**Итого: 100 %.**

### Что НЕ делать в этой волне

- Вход подрядчика по ссылке, OCR содержимого PDF, годовой отчёт СМП как
  отдельный продукт (только маппинг в D3).
- Не трогать чужую WIP: `db.json`, `src/services/KoksRef/`, электронное
  актирование `src/components/ContractAcceptance` / `src/services/Acceptance`
  (в D1 только описать состояние).
- Не редактировать вручную `src/services/Eis/generated/**` и
  `public/eis-schemas/catalog.json` — их создаёт `generate-schema-docs.ps1`.
- Не считать XML-превью (`build*XmlPreview`) готовым документом обмена.

## 8. Порядок запуска агентов

1. **Сначала A4** — дешёвые фиксы: `ReviseAsync`, runtime XSD, вызов валидаторов.
2. **Затем A1 + A2 + C1** — без маппера, канала и справочников отправки не будет.
3. **Параллельно A3, B1 и B5** — подпись, обязательные поля ПГ и решение про
   ПГ/СЗ как пакеты.
4. **Затем B2–B4, D1–D3** — зависимости от цепочки и справочников.
5. **Последними C2, D4–D6** — расширяющие доработки поверх работающего контура.
