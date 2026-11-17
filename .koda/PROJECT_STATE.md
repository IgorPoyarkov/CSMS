# Состояние проекта (служебная заметка для AI-ассистента)

> Файл для ассистента, не для пользователя. Читать первым в новой сессии, чтобы
> не сканировать весь репозиторий. Пользовательское описание проекта — `PROJECT.md`.
> Дата последнего обновления: 2026-11-17 (после правки отметок чекпоинтов).

## 0. Откуда брать задачи

- **`CurrentTasks.md` — очередь задач.** Формулировки добавляет пользователь
  (`## N. текст`), ассистент берёт их оттуда по порядку и отмечает выполненные
  прямо в файле. Новые задачи самому себе не выдумывать.
  - Цветовая разметка статуса: 🟢 выполнено, 🟡 сомнение/частично, 🔴 отложено/ошибка.
  - Комментарии к задачам — сжатые, в той же строке после статуса.
- `WorkPlan.md` — юридический план по пунктам Типового положения (приказ Минфина
  от 31.07.2020 № 158н): источник требований к сущностям, а не задач на вечер.
- `PROJECT.md` — описание системы для пользователя. Обновлять, если изменились
  экраны, права или модель данных.

## 1. Команды и проверки

- `npm start` — Vite (:5173) + `json-server-auth db.json` (:3001). `npm run build`
  = `tsc -b && vite build`. Линт: `npx oxlint src` (в проекте oxlint; `npm run lint`
  — осколок eslint). Типы: `npx tsc -b --pretty false`.
- Прогон схем и моков без сервера:
  1. **json-server-копия** на свободном порту: `Start-Job { node node_modules/json-server/lib/cli/bin.js db.json --port 3010 }` — 6 секунд старта, затем `GET`/`PATCH` на порт 3010.
  2. **tsc --ignoreConfig** — `npx tsc --project tsconfig.json --noEmit --skipLibCheck --ignoreConfig <список schema-файлов> --module esnext --target es2022 --moduleResolution bundler --outDir .tmpcheck` + патч относительных импортов `.ts` → `.js` (`[regex]::Replace` с MatchEvaluator, не `ForEach-Object`).
- ⚠️ В `.tmp/` (не в репозитории) были временные чекеры (`check-contracts`, `check-employees` и т.д.) — после правки `db.json` их ассерты рассинхронизируются; не коммитить.
- Vite отдаёт изменённый модуль `GET http://localhost:5173/<path>` — 200 значит
  собралось (быстрая замена сборки).
- ⚠️ **PowerShell `Get-Content -Raw` ломает UTF-8** (BOM/байты-последовательности) — правки делать через `edit_file`, не через `sed`/`ForEach-Object` на тексте.
- ⚠️ Запущенный json-server держит `db.json` в памяти: после ручной правки файла
  его нужно перезапустить, иначе `GET` новой коллекции = 404, а любая мутация
  перезапишет файл старой версией. Для смоук-тестов — копия базы на свободном
  порту.
- ⚠️ Копия нужна не только из-за кэша: **мутация пишется в тот файл, который
  передан json-server**. `PATCH`/`DELETE` на рабочем `db.json` меняет базу
  (проверено на смоуке правки отметок: запись пришлось откатывать вручную).
- ⚠️ **Опасная особенность json-server 0.17.4:** при любой мутации он удаляет
  **все** записи с «битыми» внешними ссылками — поле `xxxId`, значения которого
  нет в плюрализованной коллекции (`mixins.js`, `getRemovable`; чистит и соседние
  коллекции). Пустая строка `""` — тоже битая ссылка. **Пустые `*Id` в базу не
  сохраняем**: поле либо заполнено, либо отсутствует (`omitEmptyReferences` в
  API службы, реестра и задач).
- ⚠️ **Пустая коллекция — тоже ловушка.** `"contracts": []` делала `contractId`
  «битой» ссылкой, и `DELETE` в любой коллекции реестра вычищал **все** связанные
  записи (этапы, платежи, неустойки, поставки, записи СМП, события ЭП). Коллекция
  удалена из `db.json` — её никто не запрашивал. `"notices": []` оставлена:
  ссылок `noticeId` в данных нет, поэтому она безопасна.
- ⚠️ `null` в поле `*Id` валит `getRemovable` (`null.toString()` → 500 на любом
  DELETE). Убраны `organizationId: null` у приказных `contractFunctions` и
  `purchasePlanId/positionId: null` у `purchaseNotes` id4: схемы дают
  `default(null)`/`optional`, логика читает `isFromOrder`.
- Проверка данных перед мутациями: `node -e` со скриптом по образцу
  `getRemovable` из `mixins.js` — должен печатать «no removable».
- ⚠️ `BaseEmployeeSchema.email` — `z.email()`: кириллица в адресе не проходит, а
  API парсит каждого работника, поэтому падает весь ЛК. Моки — только латиница
  (`.tmp/fix-employee-emails.mjs` транслитерировал 22 адреса).

## 2. Стек и соглашения

- React 19 + TypeScript 7 + Vite 8, `react-router-dom` 7 (`createBrowserRouter`),
  `@tanstack/react-query` 5, `axios` (`src/services/axios.instance.ts`, baseURL
  `http://localhost:3001`), `zod` 4, `react-hook-form` 7 + `@hookform/resolvers/zod`,
  SCSS-модули (`loadPaths` включает `src/scss/global`, поэтому `@import
"variables"` работает без пути).
- Сервис: `src/services/<Домен>/<домен>.schema.ts` + `.api.ts` (fetch + хук
  `useXxx`, ответы через `Schema.parse`). Компонент: `src/components/<Домен>/` +
  `*.module.scss` + `<домен>.config.ts` (справочники, подписи, форматтеры).
- БЭМ: `useUtils().bem(styles, "block")("elem", ["mod"])` — возвращает имя из
  CSS-модуля либо исходное БЭМ-имя, если правила нет.
- Zod: необязательные поля формы принимают `""` и `undefined`
  (`optionalText`/`optionalDate`/… — локальные хелперы в схемах); деньги —
  **строки** `^\d+(\.\d{1,2})?$` (`requiredMoney`/`optionalMoney`), даты —
  `ГГГГ-ММ-ДД`.
- Разграничение по организации: `localStorage.user_email` →
  `useFetchCurrentUser()` → `user.organizationId` → `useCurrentOrganization()`.
  Реквизиты заказчика вручную не вводятся; чужие записи отклоняются на клиенте
  (`isPlanOfOrganization` и аналоги, сравнение через `String()`).

## 3. Данные (`db.json`, 2026-11-17)

```
users 5 · employees 40 · organizations 6 · structuralUnits 33 (это отделы!)
contractServices 4 · purchasePlans 4 · procurements 8 · notices 0 · contracts — удалена
tasks 12 · taskEvaluations 4 · employeeEducations 9 · leaves 6 · accessRequests 1
contractProjects 2 · contractRegistry 6 · contractStages 11 · contractPayments 10
contractPenalties 5 · contractDeliveries 3 · contractEvents 21 · contractFunctions 5 · legalActs 14
smnpPlans/Reports/Procurements 3/3/3 · purchaseNotes 4 · contractSmpRecords 23
edsCertificates 4 · edsSignatureEvents 19 · okpd2Refs 143 · addressRegions/Municipalities 89/31
```

- Организации: 1 ГБУЗ «ГКБ № 7», 2 Депимущество БО, 3 МБОУ «СОШ № 15»,
  4 Администрация г. Белгорода, 5 ГКУ БО «Центр МТО» (без пользователя —
  проверка «сотрудник ≠ пользователь»), **6 ГКУ «Курскавтодор»** (ИНН
  4629040439, КПП 463201001, ОГРН 1024600964816, 305004 г. Курск, ул.
  Менделеева 2 — реквизиты из открытых источников, для пилота по СМП/ЭП).
- Учётки: `test1..test4@test.test` → org 1..4, **`zakupki@kurskavtodor.ru` /
  `qwerty12` → org 6** (user id5 → employee id41 Говоров А. Н., отдел id33
  «Управление государственных закупок»). Связь с штаткой — поле
  `employees.userId`: emp6→user1 (работник службы), emp4→user2 (руководитель
  службы org2), emp11→user3 (контрактный управляющий org3), emp26→user4
  (org4 — службы нет). **В `users` поля `employeeId` нет** — искать работника
  надо по `user.id` через `useFetchEmployeeByUserId`.
- Службы: org1 `employees` (head emp14), org2 `employees` (head emp4),
  org3 `contract_manager` (emp11); у org4 и org5 записей нет → обязательная
  форма способа создания.
- Руководители заказчиков — тоже `employees` и сидят в отделе «Руководство»
  (id 14, 18, 23, 26, 32); они выступают подписантами и «указавшими сведения».
- `leaves` покрывают все статусы (`approved`/`ongoing`/`scheduled`/`completed`)
  и типы (отпуск, больничный, командировка, б/з) — на них проверяется график
  отпусков при постановке задачи.
- Реестр: контракты 1..3 (org1/org2, закупки СМП), **5 = `0346200000626000001`,
  45 000 000 ₽, требование СМП 10 %, служебка `purchaseNotes` id4** — на нём
  отработаны сценарии СМП и ЭП. Записи СМП: id1–18 (контракты 1–3), **id23–26
  (контракт 5)**. ⚠️ При перенумерации сидов id19–22 уже использовались
  контрактом 1 — проверять занятость id перед вставкой.
- `edsCertificates` id1 Говоров (active), id2 Иванов (`validTo` 2026-12-01 →
  expiring, сотрудник не найден), id3 Колесникова **чужой ИНН 3128071234**
  (для ветки «отказ»), id4 Пояркова (active, org2, вход для user2).
  `edsSignatureEvents` id1–3: signed / signed (`smp_eis_export`) /
  rejected_certificate (`innMatched: false`). `legalActs` содержит 63-ФЗ
  (`law-63fz`) и ПП 1466 — на них ссылаются сроки и подписи в UI.

## 4. Домены и бизнес-правила

### План-график (`PurchasePlan`)

`organizationId` обязателен (владелец), `positions[]` — графы формы ПГ по
приказу 145/206н в порядке `positionFields` (№ п/п, ИКЗ `^[0-9A-ZА-Я]{20,36}$`,
объект закупки, год размещения, объём фин. обеспечения с разбивкой по годам,
общественное обсуждение, уполномоченный орган, совместный организатор, ОКПД2,
наименование объекта) + доп. сведения для извещения (`ktrCode`, `nmck`,
`purchaseMethod` из 7 способов ст. 32, `advancePaymentPercent`, даты контракта).
Правила: не-draft ⇒ ≥1 запись; `publishDate` ≥ `approvalDate`; `amountTotal` =
Σ частей ≤ `nmck`; `totalAmount` плана = Σ `amountTotal`. API полностью
привязан к организации, `queryKey` включает `"organization", String(orgId)`.

### Контрактная служба (`ContractService`, № 158н)

`creationMethod`: `structural_unit` | `employees` | `contract_manager` (ч. 21
ст. 38 — до 100 млн ₽). Снимки ФИО/табельного/должности обязательны: состав
утверждён приказом. Функции — раздел III: `planning`, `purchase_description`,
`supplier_determination`, `contract_conclusion`, `contract_execution`.
Предупреждения (не блокирующие): `< 2` человек (п. 2.2), объём > 100 млн при
управляющем. Единый каскад «отдел → работник» — `StaffEmployeePicker`.
`contractServiceRoster(service)` — строки «кто есть кто» (руководитель первым),
из него считаются `myRole` и `isHead`.

### Задачи, оценки, образование, отсутствие

- `tasks`: `organizationId`, `title`, `status` (`pending|in_progress|completed`),
  `origin` (`head|system`), `functionCode` (функция, по которой поставлена),
  `assigneeId` + снимок `assigneeName`, `assignedByEmployeeId`/`assignedByName`,
  `dueDate`, `result`. Хелперы: `taskDaysLeft`, `isTaskOverdue`,
  `sortTasksByDeadline` (по остатку срока, без даты — в конец), `taskSummary`,
  `taskStatusLabels` (единые подписи), `employeeTasks`.
- `taskEvaluations`: `score`
  (`excellent|good|satisfactory|needs_improvement|violation`), комментарий,
  оценивший; хелперы `employeeScoreTotal`/`Average`,
  `salaryImpact`/`salaryImpactLabel` (премирование/депремирование),
  `onTimeCompletionRate`.
- `employeeEducations` — п. 2.5: высшее или ДПО, `getEducationStatus` +
  `educationWarning` (просроченное ДПО → предупреждение в ЛК).
- `leaves` + `businessDaysBetween`, `dateRangesOverlap`,
  `isEmployeeAbsentOn(leaves, employeeId, date)` — проверка доступности
  исполнителя на срок задачи.

### Цепочка закупки и реестр

`purchasePlan.positions[].identificationCode` ↔ `procurements[].ikz` →
`notices` / `contractProjects` → `contractRegistry` (ст. 82, 83, 103) с
`contractStages` (этапы, суммы = цене контракта), `contractPayments`
(`advance|intermediate|final`, `scheduled|sent|paid|rejected`, казначейство),
`contractPenalties` (`delay|quality|delivery|other`, ст. 34, 112, 113),
`contractDeliveries` (акты приёмки, ст. 94). Ключевые хелперы: `totalPaid`
(`scheduled` не считается), `paymentPercent`, `totalPenalties`,
`isContractOverdue`, `emptyContract`. API реестра — 20 хуков (CRUD по каждой из
пяти коллекций). Контракт обязан ссылаться на закупку/проект **своей**
организации, ИКЗ берётся из закупки, подписант — её же работник (проверяет
`check-employees`). Цепочка целиком: ПГ → служебка (`purchaseNotes`) →
извещение → проект контракта → подписанный контракт → запись реестра;
требование СМП рождается в служебке и наследуется вниз (`smpRequiredPercent`).

**Подгрузка сведений из реестра по реестровому номеру контракта** (сессия
2026-11-17): `lookupContractByNumber(contractNumber, organizationId)` в
`contractRegistry.api.ts` → `ContractLookup { contract, matchedBy,
anotherOrganization }`. Порядок поиска: точное совпадение среди своих → свой
контракт по фрагменту (`contractNumber_like`, в json-server именно `_like`, а не
`__like`; хорошо дружит с `organizationId`) → чужие контракты (только чтобы
отличить «нет в реестре» от «контракт другого заказчика», чужие сведения не
возвращаются). `normalizeContractNumber()` убирает пробелы, `№` и дефисы — номер
копируют из ЕИС. На странице блок «Подгрузка сведений из реестра контрактов»:
найденный контракт раскрывается, подсвечивается (`cardHighlighted`) и к нему
прокрутка; сами сведения подтягивает карточка (этапы, платежи, неустойки,
поставки, СМП). Частичное совпадение помечается в сообщении. Под подсказкой —
пилюли с номерами своей организации (из уже загруженного `contracts`, без доп.
запроса), клик = подставить и подгрузить. Запрос — по кнопке, через
async-обработчик (не через `useQuery`: результат нужен один раз по действию
пользователя, без каскадных setState). `MIN_CONTRACT_NUMBER_LENGTH` = 3 — как
`requiredText(3, …)` в схеме номера; пустой фильтр json-server вернул бы весь
реестр.

⚠️ **Подгрузка читает локальный `contractRegistry`, а не ЕИС.** Реальные номера
реестровых записей (вида `2462904043926000011`) в сидах отсутствуют → «не
найдено». Прямой запрос из браузера в ЕИС невозможен (CORS + нужен
`iservice-key`), из этой среды ещё и DNS не резолвит `api.zakupki.gov.ru`.
Настоящий обмен — Tasks 9 п.3 (серверный прокси). Для демонстрации в сидах есть
контракт id 6 (org6) с номером `2462904043926000011`, 2 этапа (49,6 + 74,4 млн =
цене 124 млн) и аванс 37,2 млн.

### Чекпоинты процесса по контракту (`contractEvents`)

**Зачем:** ЕИС не сообщает, на каком шаге находится контракт, — по Tasks 8 п. 2 б
это наша зона ответственности. Заказчик отмечает пройденные этапы сам, и по
карточке видно, где контракт: `project_created` → `customer_approved` →
`supplier_signed` → `customer_signed` → `registry_included` →
`execution_started` → `acceptance` → `payment` → `completed` | `terminated`.

**Файлы:** `ContractEventSchema`, `CONTRACT_EVENT_CHECKPOINTS`,
`contractEventCheckpointLabels`, `CONTRACT_EVENT_ORDER`, `sortContractEvents`,
`nextContractEvent`, `emptyContractEvent` в `contractRegistry.schema.ts`;
CRUD и хуки `useContractEvents` / `useCreateContractEvent` /
`useUpdateContractEvent` / `useDeleteContractEvent` в `contractRegistry.api.ts`;
`ContractEventsSection.tsx` — секция в карточке реестра.

**Поля:** `contractId`, `checkpoint`, `occurredAt` (дата события, а не дата
ввода), снимок `employeeId`/`employeeName`, `basis` (номер и дата
документа-основания), `comment`, `createdAt`.

**Поведение:** таймлайн (дата, этап, кто отметил, основание, комментарий),
инлайн-форма «+ Отметить этап» с подстановкой ближайшего неотмеченного шага,
удаление отметки. Сведения из ЕИС сюда не пишутся: когда появится канал
(Tasks 9 п. 3), часть событий можно будет подтверждать по данным ЕИС, но журнал
остаётся нашим. Отметку можно исправить: кнопка «✎» открывает ту же форму,
автор и дата ввода сохраняются (исправляем сведения о событии, а не подменяем
того, кто его вёл), в записи появляется `updatedAt` — таймлайн показывает
«Изменено: …».

**Сиды:** контракт 1 — 6 событий (до «начато исполнение»), контракт 2 — 9
(до «исполнение завершено»), контракт 5 (org6) — 6.

### Электронная подпись (Eds)

**Файлы:** `src/services/Eds/eds.schema.ts` + `.api.ts` + `cryptoPro.ts`;
`src/components/Eds/EdsSignModal.tsx` + `.module.scss`; `EdsJournalPage.tsx`
(+ `.module.scss`), роут `/eds/journal`, ссылка «Журнал ЭП» в `Header.tsx`.

**Типы:** `EdsCertificate` (id, organizationId, ownerName, ownerPosition,
ownerSnils, **inn**, ogrn, subject, issuer, serialNumber, fingerprint,
signatureAlgorithm, validFrom, validTo, isRevoked, revokeDate, isProxy,
proxyNumber, source: `plugin` | `manual` | `imported`, note).
`SignatureEvent` (id, organizationId, contractId, userId, userLabel,
action: `smp_supplier_confirm` | `smp_customer_confirm` | `smp_reject` |
`smp_eis_export` | `penalty_accrue`; entityType: `contractSmpRecord` |
`contract` | `contractPenalty`; entityId; certificateId; certificateOwner/
Inn/Serial/Fingerprint/Algorithm/ValidTo; innMatched: bool; certificateSource;
result: `signed` | `rejected_certificate` | `failed`; comment; createdAt).

**Хуки:** `useEdsCertificates(orgId)`, `useCreateEdsCertificate`,
`useSignatureEvents(contractId, orgId)`, `useLogSignatureEvent`.

**Парсеры:** `extractInnFromSubject(subject)` → ИНН ЮЛ (по `INNЮЛ`);
`extractSnilsFromSubject` → СНИЛС (по `SNILS`);
`extractNameFromSubject` → ФИО; `certificateStateOn(cert, date)` → active /
expiring (≤60 дн.) / expired / revoked; `certificateBelongsToOrganization`.

**EdsSignModal:** выбор сертификата (плагиновые первыми, дедуп по серийнику),
сверка сертификата ИНН с ИНН организации; при несовпадении — кнопка «Записать
отказ в журнал». При совпадении — комментарий → `useLogSignatureEvent`
создаёт запись EdsCertificate + событие в журнал. Штамп «ЭП · Владелец ·
срез XXX…7890» остаётся в `comment` события.

**Проверка рабочего места** (сессия 2026-11-17): `src/services/Eds/pluginSign.ts` —
мост к CAdESCOM. Плагин выставляет `cadesplugin` (старые сборки — `cpcsp`), а не
`cp`, поэтому детект проверяет все три имени. Экспорт: `detectPluginEnv`
(канал/версия/что доступно), `readStoreCertificates` (хранилище «Мой»: subject,
issuer, серийник decimal→HEX, отпечаток, даты `ДД.ММ.ГГГГ`→ISO, `HasPrivateKey`,
ИНН/СНИЛС через `extract*FromSubject`), `signText` (открепленная
`CAdESCOM.CadesSignedData`, `CADESCOM_CADES_BES`, содержимое в
`CADESCOM_BASE64_TO_BINARY`), `makeSignCheckText`, `describePluginError`.
Экран `/eds/diagnostics` (`PluginDiagnosticsPage` + `.module.scss`): строка
«канал плагина / чтение / подпись», таблица сертификатов с подсветкой срока и
кнопкой «Подписать тест», `<details>` «если сертификат не виден». Всё — по
кнопке, без `useEffect` (тот же урок про `set-state-in-effect`). Ссылка
«Проверка ЭП» в `Header.tsx`. `describeCryptoPro` теперь учитывает
`cadesplugin`, иначе журнал на машине заказчика показывал «плагин не найден».

**Главное про плагин (2026-11-17):** `window.cadesplugin` создаёт **не
расширение**, а официальный `cadesplugin_api.js` (КриптоПро, JSModuleVersion
2.4.5), который страница обязана подключить сама — так делают ЕИС и все ЭТП.
Расширение через `nmcades_plugin_api.js` даёт только мост
`window.cpcsp_chrome_nmcades`. Файл лежит в `public/cadesplugin_api.js`
(скачан с cryptopro.ru), подключается по требованию в
`src/services/Eds/cadesApiLoader.ts` (`loadCadesApi`,
`awaitCadesPluginReady`). `cadesplugin` — это Promise: он отклоняется, если
расширение не ответило, поэтому «объект объявлен» ≠ «плагин работает».
В Яндексе API перебирает расширения Opera-ID → MV2 → MV3
(`epebfcehmdedogndhlcacafjaacknbcm` / `iifchhfnnmpdbibifmljnfjhpififfog` /
`pfhgbfnnjiafkhfdkmpiflachepdcjod`) — установленных копий достаточно.
Имя расширения в списке дополнений — «Extension for CAdES Browser Plugin»
(без слова CryptoPro), его и надо искать. Локальная ловушка машины пилота:
msi плагина 2.0.15700 прописал native host `ru.cryptopro.nmcades` только в
32-битной ветке реестра; ключ добавлен в HKCU для Chrome/Yandex/Edge.
Диагностика (`/eds/diagnostics`) теперь различает три состояния по строке
«Мост расширения» (`window.cpcsp_chrome_nmcades`): моста нет → виновато
расширение (не включено / браузер не перезапущен); мост есть, плагин молчит →
виноват native host (`ru.cryptopro.nmcades`) или служба плагина; плагин
ответил → сертификаты читаются. Путь API-скрипта берётся из `BASE_URL`.
**Важно:** мост замеряется ПОСЛЕ ожидания плагина — сразу после загрузки
скрипта `nmcades_plugin_api.js` ещё не внедрён, и «нет» будет ложным.

**Подпись пакета СМП (2026-11-17):** `/eis/smp-export` → «Подписать пакет
(ЭП)»: `src/services/Eds/smpPackage.ts` подписывает тот же CSV, что отдаёт
экспорт (`CAdES-BES`, detached), читает сертификаты из хранилища «Мой» через
CAdESCOM и скачивает документ + `.sig` (DER) + `manifest.json` (отпечаток,
серийник, SHA-256, оговорка «сервером не проверялась»). BOM входит в
подписываемые байты — иначе подпись не сойдётся у получателя. Результат
пишется в журнал ЭП (action `smp_eis_export`, source `plugin`).
`readPluginCertificates` (cryptoPro.ts) сначала пробует старый `window.cp`,
затем CAdESCOM — поэтому модалка `EdsSignModal` теперь видит сертификаты с
токена, а не только зарегистрированные вручную.

**Подпись на живой машине заработала (2026-11-17).** Ловушка API: у объектов
плагина (`nmcades_plugin_api.js`) свойства объявлены только геттером, запись
идёт методом `propset_<Имя>`. Прямое `signer.Certificate = cert` падает с
«Cannot set property Certificate of #<Object> which has only a getter» —
поэтому в `pluginSign.ts` есть `setProperty` (`propset_` → `put_` → присваивание).
После подписания пакет проверяется тем же плагином офлайн (`VerifyCades`):
это проверка целостности «документ + .sig», без цепочки УЦ; результат
попадает в манифест (`locallyVerified`) и в интерфейс.

**Важно:** **Мы НЕ подписываем документы за заказчика.** Подписание
(`CPSignEx`) — следующий шаг (Tasks 9 п.1). Сейчас система только:

1. снимает сертификат пользователя и сохраняет метаданные,
2. ведёт журнал действий (кто, когда, что подтвердил).
   Юридическая ответственность за подпись — у заказчика.

**Вход по ЭП** (реализован в этой сессии):

- `src/services/Eds/edsAuth.ts` — чистое сопоставление сертификата с учёткой:
  `resolveEdsAccount(certificate, { organizations, employees, users, today })`
  → `EdsLoginResolution { status, ok, message, organization?, employee?, user? }`.
- Статусы: `ok` / `certificate_revoked` / `certificate_expired` /
  `unknown_organization` / `employee_not_found` / `no_account` /
  `account_org_mismatch` — каждый даёт внятное сообщение (не «неверный пароль»).
- Цепочка: `certificate.inn` или `extractInnFromSubject(subject)` →
  `organizations.inn` → `employees.filter(org)` + `personNamesMatch(ownerName,
employee)` → `employee.userId` → `users`.
- `cryptoPro.ts`: `readPluginSignHandles(orgId?)` (handles с raw-объектом
  плагина), `makeLoginChallenge()` (nonce через `crypto.getRandomValues`),
  `signLoginChallenge(handle, challenge)` (перебор вариантов вызова
  `cp.webcrypto.sign`/`signEx` с разными алгоритмами, `null` = не удалось).
- `eds.api.ts`: `useEdsLogin()` — загружает справочники, вызывает
  `resolveEdsAccount`, пишет событие `eds_login` в `edsSignatureEvents`
  (только если организация найдена — `organizationId: ""` = битая ссылка!),
  при успехе ставит `localStorage.user_email` + обновляет `user` в кэше.
  `useAllEdsCertificates()` — GET всех сертификатов (для экрана входа).
- `EdsLoginForm.tsx` + `.module.scss` — выбор сертификата, показ статуса
  подписи (зелёный = плагин подписал, жёлтый = режим `registry` без проверки
  подписи), кнопка «Войти по ЭЦП».
- `LoginForm.tsx`: переключатель «По email / По ЭЦП» (mode: "email" | "eds").
- Прогон `resolveEdsAccount` на сидах: id1 Говоров → `ok` →
  zakupki@kurskavtodor.ru; id2 Иванов и id3 Колесникова → `employee_not_found`;
  id4 Пояркова → `ok` → test2@test.test. `personNamesMatch` — 7/7 (полное ФИО,
  инициалы «Говоров А.Н.», «ё»↔«е», тёзка с другим отчеством → false).

**Честное ограничение стенда:** json-server **не проверяет подпись** —
верификация набора возможна только на реальном бэкенде. Режим `registry`
(плагина нет / не подписал) выполняет вход по совпадению ФИО+ИНН и помечает
это в журнале как «без проверки подписи». На проде этот режим закрывается.

### Сведения о привлечении СМП (contractSmpRecords)

**Файлы:** `src/services/ContractSmp/contractSmp.schema.ts` + `.api.ts` +
`deadlines.ts` + `pp1466.ts` + `sourceFile.ts`;
`ContractSmpSection.tsx` (внутри `ContractRegistryPage.tsx`) — таблица записей,
локальная форма `ContractSmpRecordForm`, кнопки подтверждения достоверности
(`handleSupplierConfirm` / `handleCustomerConfirm`), выгрузка в ЕИС
(`EisSmpExportPage.tsx`, роут через страницу реестра).

**Схема:** `documentType` (договор/акт/платёжка), `documentNumber`, `documentDate`,
`amount`, `subject`, `period`, `supplierName/Inn/Kpp`, `isSmpSubject`,
`supplierConfirmedAt/By/Document`, `customerConfirmedAt/By/Document`,
`status` (`submitted` | `accepted` | `rejected` | `pushedToEis`),
`eisPublishDate/RecordNumber`, `comment`, `sourceFileName`, `createdAt`.

**Расчёты:** `smpActualAmount(records)` — сумма принятых записей,
`smpRequiredAmount(contract)` — 10 % (или иной %) от цены контракта,
`smpVolumeProgress(actual, required)` — процент закрытия,
`computeSmpVolume(contract, records)` — `SmpVolumeResult { actual, required,
progress, shortfall, shortfallPercent }`,
`computeSmpPenalty(contract, records, shortfall)` — неустойка в
`contractPenalties` (тип `other`).

**Сроки по ПП 1466:** `SMP_DEADLINE_RULES` — 5 раб. дней (декларация СМП/копия
договора), 10 раб. дней (акт/платёжка), 5 доп. раб. дней (если оплата раньше
срока контракта), 7 раб. дней (оплата субподрядчику).
`computeSupplierDeadlines(records, { today?, extraHolidays? })` /
`computeCustomerDeadlines(records, { today?, extraHolidays? })`
→ `SmpDeadlineItem[] { rule, dueDate, status: met|pending|overdue|no_basis }`.
Срок заказчика в ЕИС: `CUSTOMER_EIS_DEADLINE_RULE` — 3 раб. дня с `receivedAt`
(ч. 3 ст. 103 44-ФЗ).

**Подтверждение достоверности:** два отдельных действия с датой, кем и по какому
документу (`supplierConfirmedAt/By/Document` + `customerConfirmedAt/By/Document`).
`signerLabel` = `useMyContractRole` + `fullName`. Подрядчик и заказчик
подтверждают независимо.

**Распознавание файлов:** `readSourceFileFields(file: File)` — чтение имени
файла, извлечение номера (`№123`), даты (`2026-01-15` / `15.01.2026`),
годовых номеров отсекаются. Подстановка только в пустые поля;
`SOURCE_FILE_HINT` — плашка «из имени файла прочитано: номер, дата — проверьте»
или «не найдено — внесите вручную».

**Сиды:** contract1: id1–8 + id19 (org1, 9 записей, недобор 1 400 000 / 56,25 %,
неустойка 35 000); contract2: id9–12 + 15–18 (org1, 8 записей, закрыт 107,98 %);
contract3: id13–14 (org2, 2 записи, недобор 3 062 500 / 39,51 %, неустойка
3 062,5); contract5: id23–26 (org6, 4 записи, 3 подтверждены, 1 отклонён).

## 5. UI: темы, рамки, модалки, навигация

- Роли интерфейса — только в `src/scss/global/_themes.scss`
  (`:root, [data-theme="light"]` и `[data-theme="dark"]`), переключение
  `data-theme` + localStorage. Компоненты не используют `$color-*` напрямую.
- Поверхности: `--surface-page` (фон страницы), `--surface-panel` (карточки,
  окна), `--surface-raised` (вложенные блоки, шапки таблиц), `--surface-accent`,
  `--surface-field` + `--field-border` (поля ввода — отдельная роль, чтобы поле
  было видно на белой карточке).
- **Границы**: `--border` = `rgba(swamp, 0.5)`, `--border-strong` = `0.68`,
  `--field-border` = `0.68` в светлой теме. Раньше 0.34/0.55 давали 2.11:1
  против требуемых 3:1 (WCAG 1.4.11) — контур карточки не читался.
  `--surface-page` поднят до 0.7, чтобы белая панель отделялась от «бумаги».
- **Модалки**: `--modal-border` / `--modal-dot` / `--modal-dot-glow` + миксин
  `modal-frame` (`src/scss/global/_modal-frame.scss`) — рамка инвертирована к
  фону окна, по периметру бежит точка (keyframes по `top`/`left` 0→100 %),
  `prefers-reduced-motion` её останавливает. Используют `ProfileEditModal` и
  `TaskAssignModal`.
- ⚠️ Токена `--on-accent` нет — светлый текст на акценте даёт
  `--text-on-accent` (было 8 мест с опечаткой, исправлено).
- Поля и селекты: `min-width: 0` и `max-width: 100%` в `_reboot.scss` +
  `min-width: 0` у блока/триггера `CustomSelect`, иначе длинное значение
  раздвигает grid-колонку.
- **Шапка** (`components/Header/`): «Главная», «Задачи организации» (если
  авторизован), кнопка профиля (аватар + «Фамилия И.О.», `aria-haspopup`) и
  переключатель темы справа. Меню профиля раскрывается наведением, `:focus-within`
  и кликом (касания): «Личный кабинет» и «Выйти», пункты выровнены по правому
  краю, email не показывается. **Ссылка «Журнал ЭП»** → `/eds/journal`.
  Открытие меню дублируется классом `--open`, между кнопкой и меню невидимый
  «мостик» `::before` (иначе ховер рвётся в зазоре).
- **Личный кабинет** (`components/Account/PersonalAccount/`): порядок секций —
  персональные данные (аватар-кружок 64px с карандашом-svg → модалка правки;
  список строк «ФИО: …»; организация не показана; `<details>` с ролью в КС и
  образованием — подраздел карточки) → эффективность → календарь отпусков →
  **мои задачи** (`components/Tasks/MyTasks`) → возможные действия (без выхода).
- **`MyTasks`**: фильтр-чипы по статусу со счётчиками, сортировка по остатку
  срока, показ 5 (по умолчанию)/10/15/все, вид списком (по умолчанию)/сеткой,
  пагинация.
- **`TaskAssignModal`**: открывается кнопкой «Назначить задачу» в «Возможных
  действиях» и только при `isHead` (иначе компонент возвращает `null`).
  Порядок полей: функция → исполнитель (disabled без функции; список = носители
  функции: для `structural_unit` — работники подразделения службы, иначе —
  носители из ростера) → название → описание → срок → источник. Исполнитель на
  момент срока задачи в утверждённом/активном отсутствии — disabled-опция с
  датой окончания, отправка блокируется с сообщением.
  Старый `Tasks/Task.tsx` (инлайн-форма) удалён, заменён модалкой.
- Кнопки на акценте в модалках: по умолчанию светлая подложка
  (`--surface-accent` + `--accent-emphasis`), на наведении — акцентный фон и
  `--text-on-accent` (раньше кнопка была залита тёмно-зелёным, а текст из-за
  битого токена оставался тёмным).

## 6. Роуты

`/` (главная: карточка заказчика + «Поток закупки» из 6 этапов со счётчиками по
реальным связям + переходы), `/account/login|register|profile`,
`/tasks` (группировка по функциям раздела III), `/tasks/:id` (просмотр, правка
и оценка для `isHead`), `/purchase-plans` (+`/new`, `/:id`, `/:id/edit`),
`/contract-service`, `/procurement-processing` (+`:id/notice-info`,
`:id/contract-project`), `/reports/smnp`, `/contract-registry`,
`/norming-requirements` (WIP — нормирование, чужая работа),
`/eds/journal` (журнал действий по ЭП), `/eds/diagnostics` (проверка плагина
КриптоПро, сертификатов и пробной подписи на рабочем месте).

Хуки по доменам: `tasks.api` — `useOrganizationTasks`, `useAssigneeTasks`,
`useTask`, `useCreateTask`, `useUpdateTask`, `useUpdateTaskProgress`,
`useDeleteTask`; `taskEvaluation.api` — `useTaskEvaluations`,
`useEmployeeEvaluations`, `useCreateEvaluation`, `useDeleteEvaluation`;
`education.api` — `useOrganizationEducations`, `useEmployeeEducations`,
`useSaveEducation`, `useDeleteEducation`; `calendar.api` —
`useOrganizationLeaves`, `useEmployeeLeaves` + CRUD; `contractRegistry.api` —
20 хуков по пяти коллекциям; `StaffingTable.api` — работники, подразделения,
`useFetchEmployeeByUserId`, `useUpdateEmployeeProfile`. **ContractSmp:**
`useContractSmpRecords`, `useAllContractSmpRecords`, `useCreateContractSmpRecord`,
`useUpdateContractSmpRecord`, `useDeleteContractSmpRecord`. **Eds:**
`useEdsCertificates`, `useCreateEdsCertificate`, `useSignatureEvents`,
`useLogSignatureEvent`. **Чекпоинты процесса:** `useContractEvents`,
`useCreateContractEvent`, `useUpdateContractEvent`, `useDeleteContractEvent`.
**Общий хук роли** — `src/hooks/useMyContractRole.ts`
(`{ user, organization, contractService, employee, myRole, isHead }`).

## 7. Результат последней проверки (2026-11-17, правка отметок чекпоинтов)

### Проверка 2026-11-17 (правка отметок чекпоинтов)

- `npx tsc -b --pretty false` — те же **10 ошибок**, все в чужом
  `NoticeInfoForm/sections/ObjectDescriptionSection.tsx`; мои файлы чистые.
- `npx oxlint src` — **30 warnings, 1 error** (чужой WIP, в том числе новые
  замечания в `PersonalAccount`/`Header`); по `ContractEventsSection.tsx`,
  `contractRegistry.schema.ts` и `ContractRegistry.module.scss` замечаний нет.
- `npx vite build` — успешно (4.68 s).
- Смоук `PATCH /contractEvents/1` (json-server на :3020): запись обновилась,
  автор и `createdAt` сохранились, `updatedAt` проставлен; `contractId=1` — 6
  событий до и после; `contractRegistry` 6, `contractStages` 11,
  `contractSmpRecords` 23, `purchaseNotes` 4 — без изменений.
- ⚠️ Смоук запускался на `db.json`, а не на копии: тестовая правка попала в
  рабочую базу и была откатана вручную. Для мутаций — только копия (см. §1).

### Проверка 2026-11-17 (чекпоинты процесса по контракту)

- `npx tsc -b --pretty false` — те же **10 ошибок**, все в чужом
  `NoticeInfoForm/sections/ObjectDescriptionSection.tsx`; мои файлы чистые.
- `npx oxlint src` — **28 warnings, 1 error** (чужой `NormingRequirementsBlock`);
  по `ContractEventsSection.tsx`, `contractRegistry.api.ts` и
  `contractRegistry.schema.ts` замечаний нет.
- `npx vite build` — успешно (6.84 s).
- Смоук json-server (копия на :3010, порт предварительно освобождён):
  `GET /contractEvents?contractId=1` → 6, `contractId=2` → 9, `contractId=5` → 6;
  `POST` → 7; `DELETE` → снова 6, при этом `contractRegistry` 5,
  `contractStages` 9, `contractSmpRecords` 23, `purchaseNotes` 4 — без изменений.
  ⚠️ `Start-Process`/`Start-Job` при падении скрипта оставляют сервер на порту —
  перед повторным прогоном порт надо освобождать, иначе запросы уходят к старому
  процессу со старой копией базы (на этом потерялся один прогон).
- По пути устранены две мины json-server, из-за которых **любой `DELETE`**
  удалял связанные записи: пустая `"contracts": []` и `null` в `*Id` (детали —
  §1). После правки `db.json` проверка `getRemovable` даёт «no removable».

### Проверка 2026-11-17 (подгрузка по реестровому номеру)

- `npx tsc -b --pretty false` — **10 ошибок**, все в
  `NoticeInfoForm/sections/ObjectDescriptionSection.tsx` (чужой WIP: TS2322
  `string` → `never`, неисп. `control`, TS2345); **мои файлы чистые**.
- `npx oxlint src` — **28 warnings, 1 error** (`NormingRequirementsBlock.tsx` —
  `useFieldArray` conditionally, чужой). По `ContractRegistryPage.tsx` и
  `contractRegistry.api.ts` замечаний нет. Урок: `set-state-in-effect` и
  «useMemo has unnecessary dependency» раньше в проекте не срабатывали —
  подгрузку поэтому сделали через async-обработчик кнопки, а не `useQuery` +
  `useEffect` (иначе пришлось бы поднимать setState в эффект).
- `npx vite build` — успешно (4.76s).
- Смоук json-server (копия на :3014, старт ~14 с). ⚠️ `Start-Job` живёт только
  внутри одного вызова терминала: сервер и все запросы надо делать **одной
  командой**, иначе порт пустой. Реестр: id1/id2 org1
  (`0344200012126000001`, `…002`), id3 org2, id4 org4, id5 org6
  (`0346200000626000001`). `?contractNumber=…&organizationId=6` → 1 (свой);
  тот же номер с `organizationId=1` → 0 своих, 1 в реестре → «у другого
  заказчика»; заведомо неверный номер → 0 и 0 → «не найден».
- Смоук подгрузки по фрагменту (:3016, после добавления контракта id 6):
  реестр 6; `contractNumber=2462904043926000011&organizationId=6` → 1;
  `contractNumber_like=246290404&organizationId=6` → 1; тот же номер с
  `organizationId=1` → 0, без фильтра → 1 (ветка «другой заказчик»);
  этапы c6 = 2 (49,6 + 74,4 = цене 124 млн), платежи c6 = 1. Проверены
  фильтры json-server: `contractNumber_like` работает, `contractNumber__like`
  и `contractNumber=<часть>` → 0.
- ⚠️ Запущенный `npm run server` (:3001) держит `db.json` в памяти: новый сид
  id 6 появится в UI только после перезапуска сервера.
- CSS-токены новых блоков объявлены в `_themes.scss` (`--surface-panel`,
  `--surface-field`, `--surface-raised`, `--border`, `--border-strong`,
  `--accent`, `--accent-emphasis`, `--accent-soft`, `--state-success|warning|danger`
  и `-soft`). ⚠️ Глобальных классов `.notice`, `.pill`, `.card`, `.btn--primary`
  в проекте **нет** (`_btn.scss` — только `.btn`, `&--additionally`, `&--arrow`),
  поэтому всё новое — через `.module.scss`.

- **Проверка ЭП (2026-11-17):** `npx tsc -b` — те же 10 ошибок чужого WIP
  (`ObjectDescriptionSection.tsx`), мои файлы чистые; `npx oxlint src` — по
  `pluginSign.ts` и `PluginDiagnosticsPage.tsx` замечаний нет (остаётся 1 чужой
  error в `NormingRequirementsBlock.tsx`); `npx vite build` — успешно (4.46 s).
  ⚠️ Реальная подпись на стенде ещё не прогонялась: нужен токен заказчика и
  плагин в его браузере — проверяется на `/eds/diagnostics` кнопкой
  «Подписать тест».

### Коммиты этой сессии (push на `https://github.com/IgorPoyarkov/CSMS`)

`18e95fe` feat(Eds) — вход по ЭП; `ab66099` docs; `ba52fc6` feat(ContractRegistry)
— подгрузка по реестровому номеру; `e514b71` chore(db) — события `eds_login`
(3 → 11); `9116708` docs(state). Далее — feat(ContractRegistry) подгрузка по
части номера + подсказки, `27146d1` chore(db) — демо-контракт id 6.

⚠️ **Параллельная работа в одном рабочем дереве.** В 04:08 и 04:10 этого же дня
коммиты `0aa2b7f` (чекпоинты процесса) и `3e740bd` (плагин КриптоПро) делались
через `git add -A` и утащили мои незакоммиченные правки подгрузки — они попали в
чужий `0aa2b7f`. Код цел (проверено в HEAD: `normalizeContractNumber`,
`lookupContractByNumber`, `runLookup`, `knownNumbers` рядом с чужим
`ContractEventsSection`), но история перемешана. Правило: коммитить сразу по
окончании своей задачи и не делать `git add -A`, пока в `git status` чужие
незакоммиченные файлы.

### Незавершённая чужая работа (нормирование) — без изменений

`src/components/NoticeInfoForm/sections/ObjectDescriptionSection.tsx` —
10 ошибок `tsc` (`Type 'string' is not assignable to type 'never'`, неисп.
`control`); `NormingRequirementsBlock.tsx` — 1 ошибка oxlint
(`useFieldArray` conditionally). Статус зафиксирован в коммите `837898a`.

### Новые файлы и коллекции

- **Eds:** `src/services/Eds/eds.schema.ts`, `.api.ts`, `cryptoPro.ts`,
  `edsAuth.ts`; `src/components/Eds/EdsSignModal.tsx`, `EdsLoginForm.tsx`,
  `EdsJournalPage.tsx` (+ `.module.scss`).
- **ContractSmp:** `src/services/ContractSmp/deadlines.ts`, `pp1466.ts`,
  `sourceFile.ts`; `src/components/Eis/EisSmpExportPage.tsx` + `.module.scss`.
- **Подгрузка из реестра (2026-11-17):** новых файлов нет — правки
  `contractRegistry.api.ts` (`ContractLookup`, `lookupContractByNumber`,
  `MIN_CONTRACT_NUMBER_LENGTH`), `ContractRegistryPage.tsx` (блок подгрузки,
  `cardHighlighted`, прокрутка) и `ContractRegistry.module.scss`.
- **Чекпоинты процесса (2026-11-17):** новый файл
  `src/components/ContractRegistry/ContractEventsSection.tsx`; правки
  `contractRegistry.schema.ts` (схема и хелперы событий),
  `contractRegistry.api.ts` (CRUD + 4 хука), `ContractRegistryPage.tsx`,
  `ContractRegistry.module.scss`; коллекция `contractEvents` (21 запись).
- **Коллекции db.json:** `edsCertificates` (4), `edsSignatureEvents` (11),
  `accessRequests` (1), `okpd2Refs` (143), `addressRegions/Municipalities`
  (89/31), `contractEvents` (21).

## 8. Не реализовано

- Настоящие права: проверка на клиенте, json-server отдаёт коллекции целиком.
- **Реальное подписание через плагин** (`CPSignEx` в cryptoPro) — сейчас
  решён только вход по сертификату. CPSignEx для подписания документов —
  следующий шаг (Tasks 9 п.1).
- **Серверная верификация подписи** — json-server не проверяет подпись набора.
  На проде: `CPSignVerifyEx` / `crypto.subtle.verify` с открытым ключом из
  сертификата.
- Tasks 8 п.2 (а, в): исходящий XML по схемам ЕИС (658/215н ПГ, 918 реестр)
  и чтение из ЕИС; чекпоинты `contractEvents` (п. б) сделаны.
- Tasks 8 п.4: роль «инициатор закупки».
- Tasks 9 п.3: срезы ПГ/реестра контрактов/извещений (ядро, 2–3 недели).
- Подгрузка по реестровому номеру (2026-11-17) читает **локальный** реестр
  `contractRegistry`; получение тех же сведений из ЕИС — это Tasks 9 п.3.
- **Не делать:** вход подрядчика по ссылке-приглашению (отложен), OCR содержимого
  PDF, годовой отчёт СМП (только напоминалка).
- Обмен с ЕИС: ссылки на zakupki.gov.ru фиктивные, `notices` пуста, коллекция
  `contracts` удалена (мешала json-server, см. §1).
- Руководитель службы как отдельный документ (п. 2.3), положение о службе
  (п. 1.3), штатная схема соподчинения, собственные функции сверх раздела III.

## 9. Очередь следующей сессии

1. **CPSignEx** (`src/services/Eds/cryptoPro.ts`) — реальное подписание документов
   через плагин КриптоПро ЭЦП Browser plug-in (не вход, а подписание ПГ,
   контрактов, служебок). 🟡 Начато: `pluginSign.ts` (`signText` через
   `CAdESCOM.CadesSignedData`) и экран `/eds/diagnostics` готовы, проверены
   сборкой; осталось подписать реальный документ и собрать пакет для выгрузки.
2. **Tasks 8 п.2 (а, в)** — сборка XML по схеме ЕИС и чтение из ЕИС;
   чекпоинты `contractEvents` (п. б) уже сделаны — см. §4.
3. **Tasks 9 п.3** — чтение срезов ПГ/реестра/извещений по ИНН заказчика
   (туда же — замена локальной подгрузки по реестровому номеру на данные ЕИС).
4. **Tasks 8 п.4** — роль «инициатор закупки» (1–2 дня).

**Не трогать:** чужую WIP нормирования (пусть второй агент доделает в GitHub).
**Не делать:** вход подрядчика по ссылке, OCR содержимого PDF, годовой отчёт СМП.

⚠️ **Известные проблемы:**

- В базе был дубль id 19 в `contractSmpRecords` (contract1/org1 и contract5/org6)
  — **исправлено** (contract5 перенумерован в 23–26, `entityId` в
  `edsSignatureEvents` обновлены, смоук зелёный).
- json-server на :3001 держит в памяти старую версию `db.json` — нужен
  перезапуск (`npm run server`), иначе GET новой коллекции = 404.
