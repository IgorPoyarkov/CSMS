# Брифы для фронтовых агентов (Фронт-1 и Фронт-2)

Дата: 2026-11-21. Каждый бриф самодостаточен: его можно передать агенту без
дополнительного контекста. Источник — `docs/tasks/eis-chain-readiness.md` §§3–8
и `.koda/PROJECT_STATE.md §59`.

## Общие правила для обоих агентов

1. Репозиторий: `D:\Свои проекты\CSMS\csms`, ветка `master`. **Перед началом**
   выполнить `git pull --ff-only` и посмотреть, что прилетело.
2. **Первым делом прочитать** `.koda/PROJECT_STATE.md` (особенно §59) и
   `docs/tasks/eis-chain-readiness.md` §§3–8 — там вердикт, карта покрытия и
   границы потоков.
3. Работать **только в своей зоне файлов**. Не трогать чужое:
   - `db.json` (в нём незакоммиченная правка другого агента),
   - `src/services/KoksRef/`,
   - электронное актирование `src/components/ContractAcceptance/**` и
     `src/services/Acceptance/**` — только чтение, не редактировать,
   - `src/services/Eis/generated/**` и `public/eis-schemas/catalog.json` — их
     создаёт `generate-schema-docs.ps1`.
4. Комментарии в коде — на русском; стиль существующих файлов сохранять.
5. Проверки перед коммитом. В PowerShell `npx.ps1` заблокирован политикой,
   использовать `npx.cmd`:
   - `npx.cmd tsc -b --pretty false` — 0 ошибок,
   - `npx.cmd oxlint src` — 0 ошибок (warnings допустимы),
   - `npx.cmd vite build` — успешная сборка.
6. **После работы:** `git add` только своих файлов, `git commit`, `git push`.
   В сообщении коммита перечислить выполненные задачи `Ф*`. Не коммитить чужие
   файлы и не оставлять незакоммиченных правок в своей зоне.
7. Если проверка падает на файле вне вашей зоны — не «чинить по пути», а
   сообщить пользователю: это чужая незавершённая работа.
8. Формат отчёта: что сделано по каждой задаче, результаты трёх проверок,
   хеш коммита, что передаётся другим потокам (имена полей, spec DTO, строки
   карты покрытия).

---

# Бриф Фронт-1 — цепочка документов и реестр

**Объём: 29 % (7 задач). Зона:** `purchasePlan.schema.ts`,
`purchaseNote.schema.ts`, `noticeInfo.schema.ts`, `contractProject.schema.ts`,
`contractRegistry.schema.ts`, компоненты `PurchasePlan/**`, `PurchaseNote/**`,
`NoticeInfoForm/**`, `ContractProject/**`, `ContractRegistry/**`,
`eisChainBuilder.ts`, **`eisXsdCoverage.ts` — вы единственный его редактор**.

**Не редактировать** `src/services/Eis/eis17Types.ts` (мапперы, валидаторы и
XML-превью принадлежат Фронт-2). Если нужно изменить валидатор — передать
требование Фронт-2 в отчёте.

## Ф4 — ПГ: обязательные поля XSD и карта покрытия (8 %)

Файлы:
- `src/services/PurchasePlan/purchasePlan.schema.ts` — `PurchasePlanPositionSchema`
  (строки 389–534), `PurchasePlanSchema` (538–605), `buildIdentificationCode`,
  `EIS_IKZ_PATTERN`;
- `src/components/PurchasePlan/PurchasePlanPositionForm.tsx`;
- `src/components/PurchasePlan/PurchasePlanCard.tsx` (кнопка превью: 653–671);
- `src/services/Eis/types/eisXsdCoverage.ts` — домены `PurchasePlan` (19 полей)
  и `PurchasePlanPosition` (33 поля).

Сделать:
1. Закрыть обязательные по XSD поля: `planPeriod`, `approveDate`,
   `approvalDate` (сейчас `partial`), `kvrCode`, «срок осуществления закупки»,
   `basementInfo` (обоснование закупки), контакты.
2. Сверить возможную рассинхронизацию: в схеме уже есть
   `planPeriodFirstYear/SecondYear` (строки 597–598, 1098–1099), а §31 заметки
   сообщает о добавленных `kvr`/`ktruCode`. Определить, это «поля нет» или
   «поле есть, но не заполняется», и исправить именно причину.
3. Обновить строки карты покрытия: убрать ложные `missing`, выставить реальные
   `mapped`/`partial`, описать пути XSD.

**Готовность:** `validatePurchasePlanEis17` проходит на 2–3 демо-планах из
`db.json` (только чтение), карта покрытия ПГ совпадает со схемой.

## Ф5 — СЗ → Извещение: недостающие поля (6 %)

Файлы:
- `src/components/PurchaseNote/PurchaseNoteModal.tsx` (403–565, 502–545);
- `src/components/PurchaseNote/PurchaseNotePage.tsx` (121+);
- `src/components/NoticeInfoForm/NoticeInfoForm.tsx` (630–1129, 1608–1618);
- `src/services/PurchaseNote/purchaseNote.schema.ts` (132–385);
- `src/services/Procurements/noticeInfo.schema.ts` (186–537),
  `noticeInfo.config.ts`.

Сделать:
1. Перенести из СЗ в извещение протокол-основание
   (`eisInfo.protocolName/Number/PublishDate`), номер заявки `appNumber`,
   `isStructuredForm`, файлы проекта контракта.
2. Дополнительно передать `placingWayCode` из ПГ (сейчас не переносится),
   `advancePercent`, `paymentProcedure`, сроки поставки — где это применимо.
3. Сохранить работающую автоматику: ИКЗ 36 разрядов, ОКПД2, НМЦК, КБК,
   организаторы, требование СМП.

**Готовность:** новое извещение, созданное из СЗ, содержит эти поля без ручного
ввода; прежние автоподстановки не сломаны.

## Ф6 — Извещение → Контракт (6 %)

Файлы:
- `src/services/ContractProject/contractProjectPrefill.ts` (150–731; особо
  275–295, 312–364, 431, 597–627);
- `src/components/ContractProject/ContractProjectForm.tsx` (203, 240,
  275–282, 387);
- `src/services/ContractProject/contractProject.schema.ts` (519–550, 614–689).

Сделать:
1. Заполнить протокол-основание, `appNumber`, `isStructuredForm`,
   `changePrice`/`changePriceFoundation`, файлы проекта контракта
   (`contractProjectFilesInfo`), реквизиты поставщика (`supplierName`,
   `requisites.supplierInn/Kpp/Ogrn`, адрес, банк).
2. При `isStructuredForm=false` показать обязательный блок файлов.
3. Не ломать предзаполнение предмета, цены, сроков, приёмки, обеспечения,
   СМП, КБК и реквизитов заказчика.

**Готовность:** черновик проходит `validateContractProjectEis17` в форме на
демо-данных; обязательные поля `contractProjectType` заполнены.

## Ф7 — UI сквозной цепочки (5 %)

Файлы: `src/services/Eis/types/eisChainBuilder.ts` (42–47, 97–129, 326–518,
763), новый `src/components/Eis/EisChainPage.tsx`, `src/App.tsx` (роут),
`src/components/Header.tsx` (пункт меню).

Сделать: добавить `PurchaseNote` в `EisChainSource` (сейчас только `plans`,
`notices`, `contracts`, `smpRecords`); вызвать `buildEisChains` в UI; показать
4 шага, `eisChainIssues`, `eisChainProgress`, `applyEisIdentifiers`; сохранять
номера ЕИС.

**Готовность:** роут открывается, видны разрывы и «сироты», номера ЕИС
сохраняются.

## Ф12 — Оплаты (2 %)

Файлы: `contractRegistry.schema.ts` / `.api.ts`,
`src/components/ContractRegistry/ContractRegistryPage.tsx` (614–655),
`eisXsdCoverage.ts` (домен `ContractPayment`, 9 полей: 3 `mapped`, 4 `partial`,
1 `missing`, 1 `derived`).

Сделать: `bankDocumentNumber`, перевод типов `advance/intermediate/final` в
коды XSD `PC/PN/RC/RE`, сохранение `regNumberExecution`, таймер предельного
срока оплаты 7/10 раб. дней, связка с платёжными документами; обновить карту.

**Готовность:** форма отдаёт полный набор `payDocumentInfo`, таймер виден,
карта обновлена.

## Ф15 — Этапы и обеспечение (1 %)

Файлы: `contractRegistry.schema.ts`, `ContractRegistryPage.tsx` (568–610),
`contractProject.schema.ts` (блок обеспечения), `eisXsdCoverage.ts` (домен
`ContractStage`, 6 полей).

Сделать: `sid` (ЕИС идентифицирует этап по нему, а не по порядковому номеру),
сумму этапа из `paymentsSumInfo`, обеспечение/гарантию/аванс; обновить карту.

## Ф16 — Реестр контрактов (1 %)

Файлы: `contractRegistry.schema.ts`, `ContractRegistryPage.tsx`,
`ContractEisSection.tsx`, `eisXsdCoverage.ts` (домен `ContractRegistryItem`,
15 полей).

Сделать: `initialMaxPrice`, даты начала/окончания исполнения, валидацию ИКЗ
(сейчас проверяется только 19-значный реестровый номер); обновить карту.

**Готовность:** карточка контракта отдаёт полный набор `zfcs_contract2015Type`.

## Что передать другим потокам

- Фронт-2 — точные имена полей и пути XSD, которые нужны в мапперах/валидаторах.
- Бэк — уточнённые данные по полям оплаты, этапов и реестра для мапперов `Б8`,
  `Б11`, `Б12`.

---

# Бриф Фронт-2 — XML, ЭП, справочники, исполнение

**Объём: 27 % (9 задач). Зона:** `src/services/Eis/eis17Types.ts`,
`src/services/Eds/cryptoPro.ts`, `src/components/Eds/**`,
`src/components/Eis/EisPackagesPage.tsx`,
`src/services/Eis/eisPackages.schema.ts`, `eisPackages.api.ts`,
`src/services/KtruRef/ktruRef.api.ts`, `src/services/AddressRef/addressRef.api.ts`,
`src/services/Okpd2Ref/okpd2Ref.api.ts`, селекты ОКЕИ/адресов,
`src/services/ContractSmp/**`, `src/services/Eis/eisExport.ts`,
`eisSmpExport.api.ts`, `EisSmpExportPage.tsx`,
`src/services/Reports/smnpReport238.xml.ts`.

**Не редактировать** `eisXsdCoverage.ts` — его ведёт Фронт-1. Все уточнённые
строки карты передавать Фронт-1 в отчёте.

## Ф1 — XML-превью по глобальным элементам XSD (3 %)

Файл: `src/services/Eis/eis17Types.ts` — `buildTenderPlan2020XmlPreview`
(:2219), `buildNotification2020XmlPreview` (:2274),
`buildContractProjectXmlPreview` (:2788).

Сделать: привести корни превью к глобальным элементам Альбома 17.0:
`tenderPlan2020` (`fcsIntegration.xsd:2404`), `fcsNotificationEF`
(`fcsIntegration.xsd:991`), для контракта — глобальный элемент по XSD (сейчас
`<contractProject>` не объявлен). Уйти от ручной строковой сборки там, где это
возможно без генератора. **Дождаться от бэка (`Б1`) точной версии и списка
корней** — они фиксируются первым потоком.

**Готовность:** корень каждого превью совпадает с XSD-элементом, `payloadXml`
проходит серверную XSD-валидацию.

## Ф2 — CPSignEx: подпись документов (8 %)

Файлы: `src/services/Eds/cryptoPro.ts` (сейчас `CPSignEx` решён только для
входа по сертификату), `src/components/Eds/**`,
`src/components/Eis/EisPackagesPage.tsx` (58–61, 223–233).

Сделать: подпись пакетов плагином КриптоПро для ПГ, извещений, контрактов и СЗ;
сценарии «нет токена / не тот сертификат / истёкший сертификат»; понятное
сообщение, что встроенный браузер плагин не поддерживает. Не сломать вход по
сертификату.

**Готовность:** подписанный пакет уходит на бэк, ошибки сертификата понятны
пользователю.

## Ф3 — Валидация перед созданием пакета (2 %)

Файл: `src/components/Eis/EisPackagesPage.tsx` (178–191). Сейчас
`validate*Eis17` вызываются в формах, но не при `create()`.

Сделать: вызывать `validateNoticeInfoEis17` (`eis17Types.ts:1722`) и
`validateContractProjectEis17` (:2708) перед созданием пакета; при ошибках
не создавать пакет и показывать список.

**Готовность:** невалидный пакет не создаётся.

## Ф8 — Типы и DTO пакета (2 %)

Файлы: `src/services/Eis/eisPackages.schema.ts` (13–18, 47–50, 106–126),
`eisPackages.api.ts` (79–90), `EisPackagesPage.tsx`.

Сделать: добавить `TenderPlan`/`ServiceNote` в `EIS_DOCUMENT_TYPES` либо явно
запретить их с пояснением в UI; расширить `CreateEisPackageInput` полями
`sourceDocumentId`, `documentKind`, `organizationId`, снимком реквизитов
заказчика. **Передать spec бэку (`Б4`)** — он реализует тот же контракт на C#.

**Готовность:** DTO расширен, spec отправлен бэку.

## Ф9 — Справочники из API (3 %)

Файлы: `src/services/KtruRef/ktruRef.api.ts`,
`src/services/AddressRef/addressRef.api.ts`,
`src/services/Okpd2Ref/okpd2Ref.api.ts`.

Сделать: читать версионированные датасеты `/api/references/*`; fallback на
`db.json` оставить только как явный демонстрационный режим с предупреждением.
ОКПД2 в API — 21 066 записей (`eis-nsiOKPD2-7c7ee4215e3ee405`, SHA-256);
бизнес-признаки `isNormed`/`nationalRegime`/`isAuctionRequired` пока берутся из
локальных 143 записей — сохранить оверлей, но пометить его как локальный.

**Готовность:** фронт читает версию и SHA датасета и показывает предупреждение
при fallback.

## Ф10 — Остальные справочники (2 %)

Файлы: `src/services/OkeiRef/okeiRef.api.ts`, `UI/OkeiSelect`,
`src/services/AddressRef/addressRef.schema.ts`, `UI/AddressCascade`.

Сделать: ОКЕИ, страны (OKSM), ОКТМО, КБК и валюты получать через API, которое
готовит бэк (`Б6`); валидировать коды вместо хардкода `RUB`/`643`.

**Готовность:** ни один справочник не имеет единственным источником константу
в коде.

## Ф11 — Приёмка: строки карты (3 %)

Файл для чтения: `src/components/ContractAcceptance/**`,
`src/services/Acceptance/**` (чужая WIP — **не редактировать**).

Сделать: сверить 7 полей `ContractDelivery` с XSD
`contractExecutionDocAcceptanceType/docAcceptanceInfo`
(`IntegrationCETypes.xsd:1997`, `docAcceptanceInfo:2066`), уточнить пути,
подготовить строки для `eisXsdCoverage.ts` и **отправить их Фронт-1**.

**Готовность:** спецификация путей передана Фронт-1, WIP не тронута.

## Ф13 — СМП и отчёт 238 (3 %)

Файлы: `src/services/ContractSmp/contractSmp.schema.ts`, `.api.ts`,
`src/components/ContractRegistry/ContractSmpSection.tsx`,
`src/services/Eis/eisExport.ts`, `eisSmpExport.api.ts`,
`EisSmpExportPage.tsx`, `src/services/Reports/smnpReport238.xml.ts`.

Сделать: добавить `period`, `paidToSupplierDate`, адрес субподрядчика, флаг
«подрядчик сам СМП»; сохранить два пути выгрузки (сведения об исполнении и
карточка контракта); перевести XML отчёта 238 с собственного namespace
`urn:csms:reports:smnp238:1.0` на XSD ЕИС
`zfcs_customerReportSmallScaleBusinessType` (`IntegrationTypes.xsd:33093`) —
**дождавшись маппера бэка (`Б9`)**. Строки карты отправить Фронт-1.

**Готовность:** XML отчёта в схеме ЕИС, спецификация передана Фронт-1.

## Ф14 — UI выбора документа как источника пакета (1 %)

Файл: `src/components/Eis/EisPackagesPage.tsx`. Сделать: выбирать
протокол/изменение/отмену извещения как источник `payloadXml` (зависит от
новых типов пакетов бэка `Б10`).

**Готовность:** документ можно привязать к пакету.

## Что передать другим потокам

- Бэку (`Б4`) — spec DTO пакета от `Ф8`.
- Бэку (`Б9`) — формат XML отчёта 238, ожидаемый от маппера.
- Фронт-1 — уточнённые строки карты от `Ф11` и `Ф13`.
