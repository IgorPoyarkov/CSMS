# Состояние проекта (служебная заметка для AI-ассистента)

> Файл для ассистента, не для пользователя. Читать первым в новой сессии, чтобы
> не сканировать весь репозиторий. Пользовательское описание проекта — `PROJECT.md`.
> Карта всех программных агентов/воркеров — `csms-api/docs/agents.md`.
> Дата последнего обновления: 2026-11-20 (Compliance & Liability Mapping в
> `csms-api`: 4 гипотезы → гибридный pgvector/fts пул → строгий LLM-арбитр →
> валидатор; версионирование всех параметров, промпт v2, действия в гипотезах
> первыми; таблицы схемы `legal`, endpoint `/api/liability-mapping/map`,
> 103 passed / 3 skipped, JSON-контракт зафиксирован тестом — §§48–50, бриф
> `csms-api/docs/tasks/compliance-liability-mapping.md`).
> Также 2026-11-20: каталог ПП РФ N 2604 загружен в `legal.pp2604_*` и отдаётся
> через `/api/pp2604/*`; фронт читает активную версию API, офлайн-снимок остался
> fallback (§55).
> Предыдущее обновление 2026-11-20 (второй агент НПА на локальном Ollama
> в `csms-api`: модель `qwen2.5:14b-instruct-q4_K_M`, вызов только по спорным
> строкам, все предложения идут в `needs_review`; endpoint
> `POST /api/npa/documents/{code}/analyze` и сравнение 7B/14B — §43, бриф
> `csms-api/docs/tasks/npa-llm-agent.md`).
> Предыдущее обновление 2026-11-20 (агент разметки правил НПА по ОКПД2:
> 471-р опубликован версией `r5`, 17 215 правил, 99 прямых, 88 неразобранных;
> API `/api/npa/*`, история версий и ручная проверка через `/verify` — §38,
> бриф `csms-api/docs/tasks/npa-rules.md`).
> Предыдущее обновление 2026-11-19 (справочники НСИ на бэке: версионируемое
> хранилище `ref.*`, `/api/references/*` и SSE — §32, Tasks 16; доменные типы
> сквозной цепочки ПГ → извещение → контракт → СМП и карта соответствия XSD ЕИС,
> §31; парсер ЕИС 44-FZ `getDocsIP` — отдельное решение .NET 9 в `eis-parser/`,
> Tasks 14; исходящий шлюз ЕИС — Tasks 12, §27). Предыдущее обновление
> 2026-11-18: КТРУ, сводная таблица объектов закупки, единый набор характеристик,
> автонацрежим в СЗ, файл ООЗ в извещении, кастомные чекбоксы/радио).

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

- `npm start` — три процесса через `concurrently`: Vite (:5173),
  `json-server-auth db.json` (:3001) и `csms-api` (:5099, скрипт
  `scripts/start-api.mjs`). Скрипт по умолчанию ставит `EIS_STORE=postgres`,
  `Development` и `http://localhost:5099`; заданные снаружи переменные окружения
  не перетираются (`Npa__Enabled=false` и т.п. работают как раньше).
  ⚠️ `EIS_STORE=postgres` требует поднятый PostgreSQL на :5433 с базой `csms_eis`;
  без него ОКПД2 на фронте будет пустым. `npm run api` — только API.
  `npm run build` = `tsc -b && vite build`. Линт: `npx oxlint src` (в проекте
  oxlint; `npm run lint` — осколок eslint). Типы: `npx tsc -b --pretty false`.
  - ⚠️ В PowerShell этого агента `npx` заблокирован политикой выполнения
    (`npx.ps1`, PSSecurityException) — использовать `npx.cmd tsc -b ...`,
    `npx.cmd oxlint src`, `npx.cmd vite build`.
- **C#/ЕИС:** `dotnet build eis-parser/Eis44Parser.sln`,
  `dotnet test eis-parser/Eis44Parser.sln`,
  `dotnet run --project eis-parser/src/Eis44Parser.Worker -- --validate`.
  Токен ИП хранится **вне репозитория** — в User Secrets .NET:
  `%APPDATA%\Microsoft\UserSecrets\8ac6c8a4-0a64-402a-97bb-751cece49b32\secrets.json`
  (записан 2026-11-19, `UserSecretsId` добавлен в csproj воркера, подключается
  через `AddUserSecrets<Program>()`). Переопределяется через
  `Eis44__IndividualPersonToken`. ⚠️ Тот же токен остался в истории публичного
  репозитория (коммит `eecaca5`) — перевыпустить в ЛК ЕИС.
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
- ⚠️ **Опасная особенность json-server 0.17.4:** при любой мутации он удаляет
  **все** записи с «битыми» внешними ссылками — поле `xxxId`, значения которого
  нет в плюрализованной коллекции (`mixins.js`, `getRemovable`; чистит и соседние
  коллекции). Пустая строка `""` — тоже битая ссылка. **Пустые `*Id` в базу не
  сохраняем**: поле либо заполнено, либо отсутствует (`omitEmptyReferences` в
  API службы, реестра и задач).
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

## 3. Данные (`db.json`, 2026-11-16)

```
users 5 · employees 40 · organizations 6 · structuralUnits 33 (это отделы!)
contractServices 4 · purchasePlans 4 · procurements 8 · notices 0 · contracts 0
tasks 12 · taskEvaluations 4 · employeeEducations 9 · leaves 6 · accessRequests 1
contractProjects 2 · contractRegistry 5 · contractStages 9 · contractPayments 9
contractPenalties 5 · contractDeliveries 3 · contractFunctions 5 · legalActs 16
smnpPlans/Reports/Procurements 3/3/3 · purchaseNotes 4 · contractSmpRecords 23
objectDescriptions 5 · edsCertificates 4 · edsSignatureEvents 4 · okpd2Refs 143 · ktruRefs 6 · addressRegions/Municipalities 89/31
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
- `edsCertificates` id1 Гово��ов (active), id2 Иванов (`validTo` 2026-12-01 →
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
Правила: не-draft ⇒ ≥1 запис��; `publishDate` ≥ `approvalDate`; `amountTotal` =
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
  `origin` (`head|system`), `functionCode` (функция, по которой пост��влена),
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
срез XXX…7890» о��таётся в `comment` события.

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

**Поля реестра ЕИС в выгрузке (2026-11-19):** в `ContractSmpRecordSchema`
добавлены `okpd2Code`, `priceType` (`contract` | `unit`) и `unitPrice`;
в форме сведений — ОКПД2, вид цены и цена за единицу (показывается при
`priceType = unit`); CSV (`Eis/eisExport.ts`) содержит колонки `okpd2Code`,
`priceType`, `unitPrice`. Старые записи получают `priceType = contract`
через `.default()`.

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
`/purchase-notes` (реестр потребностей СЗ со статусами согласования и экспортом DOCX/PDF),
`/contract-service`, `/procurement-processing` (+`:id/notice-info`,
`:id/contract-project`), `/purchase-plans/:id/positions/:positionId/requirement` (`?noteId=...`),
`/reports/smnp`, `/contract-registry`, `/norming-requirements` (ООЗ + 158н + ПП 926),
`/eds/journal` (журнал действий по ЭП).

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
`useLogSignatureEvent`. **Общий хук роли** — `src/hooks/useMyContractRole.ts`
(`{ user, organization, contractService, employee, myRole, isHead, canEditRequirement, canDisagreeKbk, canEditCustomerRequisites }`).

## 7. Сквозной контур СЗ / ООЗ / 158н / ОКЕИ и синхронизация (2026-11-16)

- Ошибки в `ObjectDescriptionSection.tsx` и `NormingRequirementsBlock.tsx` закрыты; `tsc -b`, `oxlint src` и `vite build` проходят с **0 ошибками**.
- **ООЗ и № 158н (`/norming-requirements`):** конструктор ООЗ по ст. 33 / ПП 145 (`objectDescriptions`), шаблоны ПП РФ № 926 и валидатор Приказа Минфина № 158н (`order158nValidator.ts`, `Order158nValidatorPanel.tsx`).
- **ОКЕИ (`/api/okei`, `OkeiSelect`):** серверный прокси к классификатору ОКЕИ (543 единицы) с поиском по коду/наименованию/обозначению/синонимам.
- **Потребность (СЗ) на отдельной странице (`/purchase-plans/:id/positions/:positionId/requirement`) и реестр `/purchase-notes`:** единое действие «Сформировать потребность» + удаление позиции в ПГ; визуальные индикаторы статуса согласования (`В работе`, `На согласовании`, `Согласовано`, `Отклонено`, `Аннулировано` в `PurchaseNoteStatusBadge`), смена статуса уполномоченным членом КС и выгрузка в `.docx` / `.pdf` (`purchaseNoteExport.ts` с `docx` + `pdfmake` Roboto); выбор инициатора из штата (`useFetchOrganizationEmployees`, автоподстановка текущего пользователя); множественные объекты закупки (`items`), прямая ссылка на `/norming-requirements` рядом с выбором ООЗ; в разделе 4 («Финансирование, НМЦК, аванс и сопровождение») выведен КБК с разбивкой по годам из ПГ + запрос на изменение КБК/КВР, загрузка файла НМЦК, запрос на НМЦК и кнопка «Провалиться и начать делать расчёт НМЦК» (`NmckJustificationPanel`); описания требований ст. 31 / ПП № 1482 / ПП № 2571 (кроме `ч. 1.1` = default `true` и санкционного РНП; для п. 4 ПП № 2571 — стандартный текст); визуально объединённый блок гарантии качества (3 поля) и обеспечения гарантийных обязательств; права редактирования по ролям КС.
- **Реквизиты заказчика в КС (`CustomerProcurementRequisitesCard`):** редактирование счетов обеспечений и ч. 13 ст. 44 в карточке организации (`organization.procurementRequisites`) с подстановкой и актуализацией из СЗ.
- **Сквозное предзаполнение `СЗ → Извещение → Проект контракта`:** наследование реквизитов, объектов, сроков, сопровождения, описаний требований ст. 31 / ПП 2571, файла НМЦК и обеспечений в `NoticeInfoForm` / `ParticipantsRequirementsSection` и `ContractProjectForm`.
- **Аукционный перечень ОКПД2 (РП РФ от 21.03.2016 № 471-р, ред. от 31.10.2022):** добавлены модуль `src/services/Okpd2Ref/auctionListControl.ts`, поля `isAuctionRequired`/`auctionNote` в `Okpd2RefSchema` и `okpd2Refs` (91 позиция из 143 + 15 исключений, `rpr-471r` в `legalActs`), фильтр/колонка/проверка кода в `/okpd2` (`Okpd2Dictionary`), бейджи в `Okpd2Select` и `PurchasePlanCard`, а также `PLACING_WAYS_ALL` (`EA20`, `ZK20`, `EP93`) с предупреждением и быстрым переключением на электронный аукцион в `PurchaseNoteModal` и `NoticeInfoForm/GeneralInfoSection` при выборе конкурса для кода из перечня № 471-р (ч. 6 ст. 24 44-ФЗ).

### Новые файлы и коллекции

- **Eds:** `src/services/Eds/eds.schema.ts`, `.api.ts`, `cryptoPro.ts`;
  `src/components/Eds/EdsSignModal.tsx` + `.module.scss`;
  `src/components/Eds/EdsJournalPage.tsx` + `.module.scss`.
- **ContractSmp:** `src/services/ContractSmp/deadlines.ts`, `pp1466.ts`,
  `sourceFile.ts`; `src/components/Eis/EisSmpExportPage.tsx` + `.module.scss`.
- **Коллекции db.json:** `edsCertificates` (3), `edsSignatureEvents` (3),
  `accessRequests` (1), `okpd2Refs` (143), `addressRegions/Municipalities`
  (89/31).

## 8. Не реализовано

- Настоящие права: проверка на клиенте, json-server отдаёт коллекции целиком.
- **Реальное подписание через плагин** (`CPSignEx` в cryptoPro) — сейчас
  решён только вход по сертификату. CPSignEx для подписания документов —
  следующий шаг (Tasks 9 п.1).
- **Серверная верификация подписи** — json-server не проверяет подпись набора.
  На проде: `CPSignVerifyEx` / `crypto.subtle.verify` с открытым ключом из
  сертификата.
- Tasks 8 п.2: исходящий XML по схемам ЕИС (658/215н ПГ, 918 реестр), чекпоинты
  `contractEvents`, чтение из ЕИС.
- Tasks 8 п.4: роль «инициатор закупки».
- Tasks 9 п.3: срезы ПГ/реестра контрактов/извещений (ядро, 2–3 недели).
- **Не делать:** вход подрядчика по ссылке-приглашению (отложен), OCR содержимого
  PDF, годовой отчёт СМП (только напоминалка).
- Обмен с ЕИС: ссылки на zakupki.gov.ru фиктивные, `notices` и `contracts` пусты.
- Руководитель службы как отд��льный документ (п. 2.3), положение о службе
  (п. 1.3), штатная схема соподчинения, собственные функции сверх раздела III.

## 9. Очередь следующей сессии

1. **CPSignEx** (`src/services/Eds/cryptoPro.ts`) — реальное подписание документов
   через плагин КриптоПро ЭЦП Browser plug-in (не вход, а подписание ПГ,
   контрактов, служебок).
2. **Tasks 8 п.2** — сборка XML по схеме ЕИС, чекпоинты `contractEvents`,
   чтение из ЕИС (3–6 недель).
3. **Tasks 9 п.3** — чтение срезов ПГ/реестра/извещений по ИНН заказчика.
4. **Tasks 8 п.4** — роль «инициатор закупки» (1–2 дня).
5. **Tasks 16 (бэк готов, ждём парсер).** Бэкенд `csms-api` уже отдаёт
   `/api/references/*` (§32): фронту и агенту парсера взять контракт из
   `csms-api/docs/tasks/reference-data.md`, распарсить официальные выгрузки НСИ,
   отправить версии через `POST /api/references/import` и переключить
   `Okpd2Ref`/`KtruRef` с `db.json` на API. Изменения мапперов и правил нацрежима показывать человеку, не
   применять автоматически.
6. **Агент НПА (§38).** Сверить реальные импорты 1875/2604, разобрать 88
   `unresolved` 471-р и принимать решения по `needs_review` через `/verify`;
   эталон `auctionListControl.ts` считать историческим, не источником истины.

**Не трогать:** чужую WIP. На 2026-11-20 в рабочем дереве `csms` чужая
незакоммиченная работа: `db.json` и `src/services/KoksRef/` — не коммитить и не
«чинить» по пути. В `csms-api` правки NPA — наши, подлежат коммиту.
**Не делать:** вход подрядчика по ссылке, OCR содержимого PDF, годовой отчёт СМП.
**Готово, живой обмен заблокирован сервером ЕИС:** Tasks 14 — клиент ЕИС `getDocsIP` (`eis-parser/`):
сборка и 5/5 тестов зелёные, stunnel-msspi установлен и проверен на Google,
но ЕИС сбрасывает TLS-handshake до прикладных данных (см. §26); XSD в
`schemas/Schemas44/` не загружены.

⚠️ **Известные проблемы:**

- В базе был дубль id 19 в `contractSmpRecords` (contract1/org1 и contract5/org6)
  — **исправлено** (contract5 перенумерован в 23–26, `entityId` в
  `edsSignatureEvents` обновлены, смоук зелёный).
- json-server на :3001 держит в памяти старую версию `db.json` — нужен
  перезапуск (`npm run server`), иначе GET новой коллекции = 404.

## 10. Модуль расчёта и обоснования НМЦК (анализ рынка, нормативный, тарифный и затратный методы)

- Схемы, справочник тарифов и расчётный движок: `src/services/Nmck/nmck.schema.ts`, `src/services/Nmck/regulatedTariffs.ts`, `src/services/Nmck/marketNmck.ts` (ст. 22 Закона № 44-ФЗ, Приказ МЭР № 567):
  - **Метод сопоставимых рыночных цен (анализ рынка, ч. 2–5 ст. 22):** источники КП/ЕИС/прайс/тариф, автоиндексация ИПЦ по дате источника, коэффициент коммерческих условий `k_ком`, исключение выбросов, проверка однородности (`V <= 33%`), давности КП (>180 дн.) и предельной цены ПП № 926;
  - **Нормативный метод (ч. 7 ст. 22, ст. 19 44-ФЗ, разд. IV Приказа МЭР № 567) с увязкой по ОКПД2:** через `Okpd2Select` подтягивает нормируемые позиции (`isNormed`, `normLimit`), контролирует превышение предельной цены, формирует `buildNormativeCalculationRecord` и `buildNormativeNmckBasisText`;
  - **Тарифный метод (ч. 8 ст. 22 44-ФЗ, разд. V Приказа МЭР № 567):** справочник официальных регулируемых тарифов `OFFICIAL_REGULATED_TARIFFS` (ФАС России, ФГИС ЕИАС, региональный орган тарифного регулирования) с увязкой по коду ОКПД2 (`findMatchingTariffsByOkpd2`) + ручной ввод/корректировка тарифа, реквизитов постановления/приказа и срока действия (`validFrom`/`validTo` с предупреждением при истечении срока на дату расчёта), `calculateTariffNmck`, `buildTariffCalculationRecord`, `buildTariffNmckBasisText`;
  - **Затратный метод / метод сложения затрат (ч. 10–11 ст. 22 44-ФЗ, разд. VI Приказа МЭР № 567):** динамическая таблица статей затрат (`NmckCostItemSchema`, категории `materials`/`labor`/`equipment`/`overhead`/`other`, типовые шаблоны `DEFAULT_COST_ITEM_TEMPLATES`), режим ввода затрат на весь объём контракта или на 1 единицу (`costInputScope: "total" | "unit"`), синхронизированные коэффициент прибыли (`k_приб >= 1.00`) и норма прибыли (`%`) + обоснование обычной прибыли, контроль порога >30%, `calculateCostNmck`, `buildCostCalculationRecord`, `buildCostNmckBasisText`;
  - Единый экспорт протокола/обоснования в `.docx` (`exportNmckCalculationToDocx`) и в **PDF по стандартам 44-ФЗ / Приказа МЭР № 567** (`exportNmckCalculationToPdf` на `pdfmake`) для всех 4 методов с **автоматическим заполнением реквизитов заказчика** (`BaseOrganization` / `OrganizationCustomer`: полное и краткое наименование, ИНН, КПП, ОГРН, ОКПО, номер в ЕИС, юридический и почтовый адреса, телефон, e-mail, ответственное лицо КС) + гриф «УТВЕРЖДАЮ», детализированные таблицы по методу, проверки и лист подписей.
- Обоснование НМЦК **не сохраняется в плане-графике** (`PurchasePlanPositionSchema` очищена от `nmck`, `quantity`, `unit`, `nmckCalculation`; в `PurchasePlanCard.tsx` убрана подстрока НМЦК и примечание СМП из меню «Действия»), а **сохраняется и отображается в Служебной записке (`PurchaseNote`)**:
  - `PurchaseNoteSchema` дополнена `nmckCalculation` (`NmckCalculationRecordSchema`) и `nmckOffers` (`NmckMarketOfferSchema[]`);
  - `/nmck-calculator` (`NmckCalculatorPage.tsx`) сохраняет обоснование в выбранную или новую СЗ (черновик), опционально обновляя только `amountTotal` в ПГ (`useUpdatePositionPlanAmount`), и даёт выгрузить расчёт в `.docx` и `PDF (44-ФЗ)`;
  - `PurchaseNoteModal.tsx` (раздел 4) отображает карточку обоснования для всех 4 методов (таблица источников / реквизиты норматива ОКПД2 / официальный тариф и период действия / таблица статей затрат и прибыль, экспорт `.docx` и `PDF (44-ФЗ)`, встроенный пересчёт через `MarketNmckCalculator`), а `purchaseNoteExport.ts` включает детализацию расчёта в `.docx`/`.pdf` СЗ.

## 11. Дефектовки, проект сметы контракта и проект календарного графика (`defectLists`)

- **Роль «инициатор закупки»:** `isContractServiceMember` / `isPurchaseInitiator` в `src/hooks/useMyContractRole.ts` — работник штатки, не входящий в КС (учитывается и способ «структурное подразделение»).
- **Файлы:** `src/services/DefectList/defectList.schema.ts` + `.api.ts`; экран `/defect-lists` — `src/components/DefectList/DefectListsPage.tsx` + `DefectListModal.tsx` (+ два `.module.scss`); ссылки в `Header.tsx` и `Main.tsx`, роут в `App.tsx`.
- **Позиции дефектовки:** `section` (раздел работ), `normCode` (шифр ГЭСН/ФЕР), `name`, `unit`, `quantity`, `unitPrice`. Наименование объекта и ОКПД2 не дублируются: связь `objectDescriptionId` (ООЗ), `objectName` — снимок для печати, `basis` — дефектный акт.
- **`estimate` — проект сметы контракта:** метод `resource|index|analog`, база `FER|TER|GESN`, `priceLevel`, `legalActId` → 421/пр, накладные/сметная прибыль/НДС; итоги считает `computeEstimateTotals` (прямые → накладные → прибыль → НДС).
- **`schedule` — проект календарного графика:** `plannedStart`/`plannedEnd`, этапы (`name`, `startDate`, `endDate`, `amount`), `legalActId` → 336/пр; `buildScheduleStages` строит этапы по разделам (суммы пропорциональны прямым затратам, остаток забирает последний этап, сроки делятся по периоду), `scheduleDifference` сверяет итог графика со сметой.
- **Нормы в `legalActs`:** `minstroy-421pr` — приказ Минстроя России от 04.08.2020 № 421/пр (методика определения сметной стоимости); `minstroy-336pr` — приказ Минстроя России от 05.06.2018 № 336/пр (методика графика выполнения СМР и графика оплаты). Оба `isVerified: true`.
- **Статусы:** `draft | submitted | accepted | returned`; «Направить в КС» создаёт задачу (`origin: system`, `functionCode: purchase_description`, исполнитель — руководитель КС/КУ, срок +5 дней) и ставит `submitted` + `taskId`.
- **Сиды:** `defectLists` 5 (org1: submitted/draft/returned, org6: accepted, org2: submitted), задачи 13–14.
- ⚠️ **Восстановление после удалённого коммита `5cdeb7c`:** он вернул `db.json` к более старой базе и вычистил `defectLists`, акты 421/пр и 336/пр, задачи 13–14. Данные восстановлены скриптом; заодно снова удалена пустая `"contracts": []` — мина json-server (см. §1), из-за которой любой `DELETE` чистит связанные записи.

## 12. Оценка заявок по ПП РФ № 2604 (`bidEvaluations`)

- **Норма:** постановление Правительства РФ от 31.12.2021 № 2604 (не 2020 года) — Положение об оценке заявок. Акт заведён в `legalActs` (`id: pp-2604`, `actType: government-decree`, `isVerified: true`, `lastCheckedDate: 2026-11-18`); предельные величины значимости сверены с приложением № 2 в редакции от 31.10.2022.
- **Файлы:** `src/services/BidEvaluation/bidEvaluation.schema.ts` (модель, предельные значимости, расчётный движок, проверки) + `.api.ts`; экран `/bid-evaluations` — `src/components/BidEvaluation/BidEvaluationsPage.tsx` + `BidEvaluationModal.tsx` (+ два `.module.scss`); ссылки в `Header.tsx` и `Main.tsx`, роут в `App.tsx`.
- **Применимость:** Положение применяется только к конкурсу (`tender`). Аукцион и запрос котировок (`auction`, `quotation`) — только цена, баллы по Положению не считаются (`PP_2604_APPLIES`, `pp2604Applies`); запрос предложений в 44-ФЗ с 2022 года отсутствует и из модели удалён. Вид процедуры выводится из способа закупки (`procedureKindFromPlacingWay`: `OK*`/`EOK*` → конкурс, `EA*` → аукцион, `ZK*` → котировки).
- **Связь с ОКПД2 и планом-графиком:** `categoryFromOkpd2`/`detectObjectCategory` относят коды ОКПД2 к категориям приложения № 2 (41–43 — строительство, 42.11 — автодороги, 43.3 — текущий ремонт, 86 — медицина, 85/85.4 — образование/отдых детей, 69.1/69.2 — юристы/аудит, 71.2 — экспертиза, 72 — НИОКР, 62/63 — ИТ, 80 — охрана, 10/11/56 — пищевые продукты и общепит, 01–33 — товары). `okpd2Codes` хранится в документе оценки и в СЗ; проверка сверяет категорию с ОКПД2 и запрещает конкурс, если код входит в аукционный перечень РП РФ № 471-р (ч. 6 ст. 24 44-ФЗ).
- **Критерии в служебной записке (СЗ):** `purchaseNote.schema` дополнена `evaluationProcedureKind`, `evaluationObjectCategory`, `evaluationOkpd2Codes`, `evaluationCriteria` (те же `CriterionSchema`). В `PurchaseNoteModal` раздел 5 «Критерии оценки заявок (ПП РФ N 2604)»: способ применения, категория (автоопределение по ОКПД2 позиции плана-графика с возможностью переопределения), критерии и значимость, предупреждения по пределам приложения № 2. При сохранении значения фиксируются в СЗ, из СЗ они предзаполняют извещение (`NoticeInfoForm` → `participantsRequirements.evaluationCriteria` + `evaluationObjectCategory`/`evaluationOkpd2Codes`), а `ParticipantsRequirementsSection` показывает категорию, ОКПД2 и проверку суммы значимости.
- **Способ в СЗ не выбирается по умолчанию (2026-11-18):** `emptyPurchaseNote().placingWayCode = ""`, в селекте первым идёт плейсхолдер «Выберите способ». Раздел 5 с критериями ПП РФ № 2604 рендерится только при выбранном конкурсе (`isContestPlacingWay` — `OK*`/`EOK*`); для аукциона, котировок, ЕП и невыбранного способа раздела нет, а `evaluationProcedureKind`/`evaluationObjectCategory`/`evaluationOkpd2Codes`/`evaluationCriteria` в запись не сохраняются (`onSubmit`). Заготовка `defaultCriteria()` заполняется только при применении Положения.
- **Критерии (п. 3):** `price`, `expenses`, `characteristics`, `qualification`; всегда четыре слота в фиксированном порядке, состав задаётся `enabled`. Значимость — проценты, сумма 100 (п. 5 «д»).
- **Показатели (п. 7, 8):** `indicators` у нестоимостных критериев — `name`, `kind` (`expense|quality|functional|ecological|financial|equipment|experience|reputation|staff`), `weightPercent` (сумма 100), `unit`, `best` (`min|max`), `scoring` (`formula|scale`), `limitMin`/`limitMax`, `scaleText` (шкала строками «свойство = баллы»). По критерию «цена» показатели запрещены (п. 11 «в»).
- **Расчёт (`evaluateBids`):**
  - цена — п. 9 «а» `БЦi = Цл / Цi × 100`, при отрицательном результате п. 9 «б» `(Цнач − Цi) / Цнач × 100`; при предложении ниже нуля п. 10: для неотрицательных `(Цнач − Цi)/Цнач×100`, для отрицательных `(Цнач + |Цi|)/Цнач×100` (зеркальная формула, п. 11 «б» — значения без знака «минус»; непрерывна в нуле);
  - расходы — п. 14 `(Рmax − Рi)/(Рmax − Рmin)×100`;
  - характеристики и квалификация — п. 20: формулы для `best=min|max` с предельными значениями (они заменяют соответствующую границу диапазона) и отсечением по п. 21; при `scoring: scale` — балл шага шкалы (п. 22–23);
  - итог = сумма (балл критерия × значимость / 100), места — по убыванию, равные баллы делят место.
- **Проверки (`validateBidEvaluation`):** для аукциона и котировок — только цена, Положение не применяется; конкурс — не менее двух критериев с ценой (п. 5); сумма значимости 100; предельные величины приложения № 2 по категории объекта; соответствие категории кодам ОКПД2 и запрет конкурса при попадании в аукционный перечень; значимость расходов ≤ значимости цены; суммы значимости показателей 100; запрет показателей по цене; обязательный показатель «опыт работы» с значимостью ≥ 60% для строительства, ремонта/содержания автодорог, текущего ремонта зданий, отдыха детей и охраны (п. 31–35); для итогов — не менее двух заявок. Опции `{ checkIndicators, checkBids }` позволяют применять те же проверки в СЗ, где показатели и заявки ещё не заполнены.
- **Статусы:** `draft → published → evaluated`; «Опубликовать порядок оценки» и «Оценить заявки»/«Пересчитать баллы» блокируются первой ошибкой проверок; при оценке в заявки записываются `totalScore` и `rank`.
- **Сиды:** `bidEvaluations` 3 с кодами ОКПД2 (строительство 41.20.40 — конкурс 60/40, оценено; товары 21.20.10 — конкурс 70/30 со шкалой, опубликовано; текущий ремонт 43.31.10 — аукцион, черновик). В СЗ № 1 добавлены критерии 60/40, категория `building_repair` и ОКПД2 43.31.10. Баллы строительного конкурса сверены с формулами скриптом.
- **Ограничения:** средний балл членов комиссии по каждому показателю (п. 7 «в», 8 «в») не моделируется — баллы выводятся из предложений; печатная форма документа об оценке (приложение № 1) не реализована; связь `procurementId`/`noticeInfoId` заполняется вызывающей стороной.

## 13. Национальный режим по ПП РФ № 1875 (`NationalRegime/pp1875.ts`)

- **Норма:** постановление Правительства РФ от 23.12.2024 № 1875 (ред. от 17.10.2026) — национальный режим по ст. 14 Закона № 44-ФЗ. Приложение № 1 — **запрет** допуска иностранных товаров (работ, услуг), приложение № 2 — **ограничение** допуска (правило «второй лишний»: отклонение иностранных заявок при наличии заявки из ЕАЭС). Преимущество для российских товаров применяется, только если запрет/ограничение не установлены. Акт заведён в `legalActs` (`id: pp-1875`, `actType: government-decree`, `isVerified: true`, `lastCheckedDate: 2026-11-18`).
- **Файлы:** `src/services/NationalRegime/pp1875.ts` — перечни `PP_1875_BAN_RULES` (приложение № 1) и `PP_1875_RESTRICTION_RULES` (приложение № 2) в виде правил префиксов ОКПД2, `checkOkpd2NationalRegime` (ожидаемый режим по коду), `validateNationalRegime` (сверка объявленного режима с ожидаемым).
- **Приоритет правил:** побеждает самое длинное (точное) совпадение префикса; при равной длине — запрет. Поэтому точечные позиции приложения № 2 (например, `28.22.14.126`, `30.30.31.130`, `32.20.11.120`) перекрывают более общие группы запрета, а конфликты равной длины (`27.32`, `27.11.50.120`, `32.50.30.110`) трактуются как запрет.
- **Справочник ОКПД2:** `Okpd2RefSchema` дополнена `nationalRegime: "ban" | "restriction"` и `nationalRegimeNote`. Заполненная запись справочника имеет приоритет над правилами префиксов (`source: "dictionary"`) — так закрываются позиции приложения № 2, не вошедшие в код.
- **Семантика проверки:** ожидается запрет — ошибка при `none`/`advantage`, предупреждение при `restriction` (мягче запрета); ожидается ограничение — ошибка при `none`/`advantage`, допустимы `restriction` и `ban` (запрет строже); код вне перечней — предупреждение при `ban`/`restriction` (требуется обоснование), информационное сообщение при `advantage`. Ошибки дают `blocksSave: true`.
- **UI:** `PurchaseNoteModal` (раздел 2, объекты закупки) — подсказка об ожидаемом режиме под кодом ОКПД2, сообщение об ошибке у селекта «Национальный режим», сводка по позициям и блокировка кнопок «Сохранить потребность»/«Сохранить и перейти к извещению» (плюс защита `onSubmit` от обхода по Enter через `setError("root")`). `NoticeInfoForm/sections/PurchaseObjectsSection.tsx` — та же подсказка и сообщения; `NormingSubmitButton` блокирует сохранение извещения, `NoticeInfoForm.onSubmit` дублирует проверку через `setError` по полю нацрежима.
- **Сиды:** в `okpd2Refs` проставлен `nationalRegime`: `32.50.13.190` — `ban` (приложение № 1), `26.20.11.110`, `26.20.11.120`, `26.20.12.110`, `26.20.14.110` — `restriction` (группа 26.20, приложение № 2).
- **Ограничения:** перечень приложения № 2 в коде восстановлен не полностью (источник обрезан после позиции 277); недостающие позиции закрываются полями `nationalRegime`/`nationalRegimeNote` справочника. Отчёт об объёме закупок российского происхождения и минимальная доля для 223-ФЗ не моделируются.
- **Проверки:** `npx tsc -b`, `npx oxlint src` (0 ошибок, 27 существующих предупреждений), `npx vite build`; смоук json-server: `PATCH /legalActs/pp-1875` не чистит коллекции (`purchaseNotes` 4, `bidEvaluations` 3, `okpd2Refs` 143, `legalActs` 21, `defectLists` 5, `contractEvents` 21).

## 14. Извещение: подспособы, связь с ПГ, суммы и критерии (2026-11-18)

- **Способ и подспособы** (`GeneralInfoSection.tsx`): способ определения поставщика из служебной записки не выбирается — из кода выводится семейство (`placingWayFamily`: `OK*`/`EOK*` → конкурс, `EA*` → аукцион, `ZK*` → котировки, `EP*` → единственный поставщик) и показывается строкой «Способ: …». Выбираются только подспособы этого семейства: для конкурса — OKP20 / EOK20 / OKI20 / OKB20, для остальных семейств подспособ один и выводится статично. Без СЗ доступен полный список способов.
- **Автоподсказка подспоса:** если семейство конкурсное и ОКПД2 позиции начинается с 41/42/43 (строительство, реконструкция, капремонт), показывается предупреждение с кнопкой «Выбрать подспособ OKB20» (п. 8 ч. 1 ст. 33 44-ФЗ). Признак ч. 19 ст. 48 отображается только для конкурсных способов и сбрасывается при переключении на аукцион/котировки/ЕП.
- **Связь с позицией плана-графика:** в `generalInfo` добавлены `positionUniqueNumber` и `positionSerialNumber`; строка «Сведения о связи с позицией плана-графика» показывает уникальный номер позиции ПГ (а не ИКЗ), номер позиции берётся из СЗ или позиции ПГ.
- **ИКЗ** (`deriveIkzParts` в `NoticeInfoForm.tsx`): нормативный ИКЗ — 36 знаков (год 2 + код заказчика 20 + номер ПГ 4 + номер закупки 3 + ОКПД2 4 + КВР 3). Синтетические 24–30-значные номера больше не нарезаются построчно: год берётся из `plannedPlacementYear`/уникального номера, код заказчика — ИНН (10) + КПП (9) из карточки организации (20-й разряд — код вида организации, дополняется вручную), номер ПГ — последние 4 знака уникального номера, порядковый номер — `purchaseNumber`, ОКПД2 — первые 4 цифры кода позиции, КВР — последние 3 цифры КБК. В `OrganizationDto` добавлены `inn`/`kpp`/`shortName`.
- **Суммы** (`src/components/UI/MoneyInput/MoneyInput.tsx`): денежные поля показывают сумму с разбивкой разрядов и двумя знаками после запятой (`1 234 567,89`), в форме хранится число (в СЗ — строка). Применён в извещении для НМЦК и цен/сумм позиций объекта закупки, в СЗ — для НМЦК и цен/сумм объектов.
- **Критерии оценки в извещении:** `EvaluationCriterionSchema` расширена `note` и `indicators` (наименование, вид, значимость, единица, направление, способ оценки, пределы, шкала). В форме всегда шесть слотов критериев (`NOTICE_EVALUATION_CRITERION_TYPES`); из СЗ переносятся все критерии (флаг применения, значимость, примечание) и показатели, а не только включённые. `ParticipantsRequirementsSection` показывает показатели критерия и примечание.
- **Сиды ИКЗ:** в `purchasePlans` пересобраны `identificationCode` всех 8 позиций (36 знаков: год 2 + код заказчика 20 [ИНН 10 + КПП 9 + вид организации `1`] + номер ПГ 4 + номер закупки 3 + ОКПД2 4 + КВР 3), в связанных `purchaseNotes` (id 1–3) обновлены `ikz`, `positionUniqueNumber` и `positionSerialNumber`. Пример: позиция 103 → `267701234567770101001100010034120000`. СЗ id4 не привязана к позиции ПГ (`purchasePlanId`/`positionId` пусты) — ИКЗ у неё не заполняется.
- **Проверки:** `npx tsc -b`, `npx oxlint src` (0 ошибок, 27 существующих предупреждений), `npx vite build`; визуальный смоук `/procurement-processing/1/notice-info`: способ с подспосами, НМЦК `0,00`, «Уникальный номер позиции: —», шесть слотов критериев; смоук json-server: `GET /purchaseNotes/1` и `/purchasePlans/1` возвращают одинаковый 36-значный ИКЗ.

## 15. Подписанная НМЦК в СЗ и общее оформление форм входа (2026-11-18)

- **Модель ЭП:** в `SIGNATURE_EVENT_ACTIONS` добавлено действие `nmck_confirm` («Подписание обоснования НМЦК»), в `SIGNATURE_EVENT_ENTITY_TYPES` — типы `nmck` («Обоснование НМЦК») и `purchaseNote` («Служебная записка»). Журнал `edsSignatureEvents` теперь хранит подпись обоснования НМЦК наравне с документами СМП и неустойками.
- **Снимок подписи в СЗ:** `NmckSignatureSchema` в `purchaseNote.schema.ts` (`signedAt`, `signedBy`, `certificateOwner/Serial/Inn`, `fileName`, `fileUpdatedAt`, `nmckTotal`, `method`, `eventId`, `documentLabel`), поле `PurchaseNoteSchema.nmckSignature`. Снимок хранится копией: карточка СЗ показывает подписанную НМЦК даже без обращения к журналу.
- **Притягивание в СЗ** (`PurchaseNoteModal`, раздел 4 «Обоснование НМЦК»): блок «Подписанная НМЦК (электронная подпись заказчика)». Если по СЗ есть успешное событие `nmck_confirm` (`useSignatureEvents` → фильтр `entityType === "nmck"` и `entityId === editingNoteId`) и в карточке ещё нет подписи/файла, реквизиты подтягиваются автоматически (без пометки dirty). Кнопка «Притянуть подписанную НМЦК» подставляет снимок вручную и заменяет ранее приложенный файл. Кнопка «Подписать НМЦК» открывает `EdsSignModal` (`action: "nmck_confirm"`, `entityType: "nmck"`, `entityId: СЗ`); доступна только для сохранённой СЗ с расчётом или приложенным файлом. Событие пишется в журнал через `useLogSignatureEvent`, результат (в т.ч. отказ по ИНН сертификата) показывается в блоке.
- **Извещение:** `NoticeInfoForm` при переносе СЗ берёт имя файла НМЦК из `nmckFileName` или `nmckSignature.fileName` и добавляет в описание вложения пометку «подписано ЭП (ФИО, дата)».
- **Финансирование:** из раздела 4 `PurchaseNoteModal` убрана строка «Основной КБК» — понятие в системе не используется; таблица КБК и разбивка по годам из ПГ остались.
- **Формы входа и регистрации:** обе формы в прежней оболочке — компактная карточка с неоновой анимацией и крестиком в углу; поля и кнопки — общие компоненты (растянуты по ширине карточки), вход по ЭЦП — существующий `EdsLoginForm`. В регистрации кнопка «Войти»/крестик ведут на `/account/login` (раньше — на саму регистрацию), ошибки сервера и «сотрудник не выбран» показываются в блоке вместо `alert`. В `App.tsx` `CustomModal` переведён на вложенность (без `children`-пропа).
- **Поиск в селекте:** `CustomSelect` получил опциональные `searchable`, `searchPlaceholder`, `getSearchText`. Поле поиска рендерится внутри выпадашки (фокус сразу в нём) и сокращает список по подстроке; пустая выдача показывает «Ничего не найдено». В `RegisterForm` поиск идёт по ФИО и табельному номеру, выбранный сотрудник показывается в триггере (`selectedValue` + `getLabel`), однофамильцы различаются табельным номером.
- **Сиды:** СЗ id 3 (`organizationId: 2`) содержит `priceBasis`, `nmckFileName: Обоснование_НМЦК_СЗ_1.docx` и `nmckSignature` (подпись Поярковой С.И., `eventId: 30`); в `edsSignatureEvents` добавлено событие id 30 (`action: nmck_confirm`, `entityType: nmck`, `entityId: 3`).
- **Проверки:** `npx tsc -b`, `npx oxlint src` (0 ошибок), `npx vite build`; визуальный смоук `/account/login` и `/account/register` (неоновые карточки с крестиком, тёмная тема), поиск в селекте сотрудника сокращает список по «Пояркова» и выбранное ФИО с email подставляются в форму; смоук json-server: `GET /purchaseNotes/3` возвращает `nmckSignature`, `GET /edsSignatureEvents?entityType=nmck` — событие id 30.

## 16. Проверка поставщиков КП по реестру МСП и рекомендация по СМП (2026-11-18)

- **Справочник:** коллекция `smpRegistry` (11 записей) + `SmpRegistryEntrySchema` в `src/services/ContractSmp/smpRegistry.schema.ts` (`inn`, `name`, `category` micro/small/medium, `registryNumber`, `region`, `includedAt`, `isActive`). Загрузка — `useSmpRegistry()` (`staleTime` 1 час).
- **Сопоставление:** `findSmpRegistryEntry` — сначала точный ИНН, затем нормализованное наименование (без кавычек и организационно-правовых форм, равенство или вхождение при длине ≥6). Исключённая запись (`isActive: false`) даёт статус «не в реестре».
- **Анализ:** `analyzeNmckSmpComposition(offers, registry)` считает по включённым КП: `smpCount`, `notSmpCount`, `unknownCount`, долю СМП, строки со статусом (`smp`/`not_smp`/`unknown`, способ `inn`/`name`).
- **Рекомендация:** все КП от СМП → «Закупка только среди СМП и СОНКО» (ч. 1, 3 ст. 30); часть → «Привлечение СМП/СОНКО N%» (ч. 5, 6 ст. 30), N = доля СМП, округлённая до 5, минимум 5; ни одного → «Привлечение не обосновано».
- **UI:** раздел 4 СЗ (`PurchaseNoteModal`) — блок «Проверка поставщиков по реестру МСП»: таблица (поставщик, ИНН, статус), сводка и кнопка «Применить рекомендацию» (`advantageSmpPart3Art30` либо `requiresSmpSubcontracting` + `smpRequiredPercent`).
- **КП:** в `NmckMarketOfferSchema` добавлен `supplierInn`; в `MarketNmckCalculator` — поле ИНН (подставляется из реестра контрактов).
- **Сиды:** СЗ 1 — 3 КП, все СМП (100% → только СМП); СЗ 2 и 3 — 1 СМП из 4 (25% → привлечение).
- **Проверки:** `npx tsc -b` — чисто, `npx oxlint src` — 0 ошибок (21 существующее предупреждение), `npx vite build` — успешно; логика проверена скриптом: note 1 → `smp_only` 100%, note 2 → `subcontracting` 25%. Визуальный смоук СЗ № 2 (`/purchase-notes` → «Открыть СЗ», раздел 4): таблица 4 КП (1 «Микропредприятие», 3 «не в реестре»), сводка «СМП: 1 из 4 · 25%», рекомендация «Привлечение СМП/СОНКО — 25%»; после нажатия «Применить рекомендацию» появилось сообщение, в разделе 6 включился чекбокс привлечения субподрядчиков и `25` % (объём при НМЦК 175,50 ₽ — 43,88 ₽).
- ⚠️ В рабочем дереве остаётся незакоммиченная ветка второго агента (`src/components/VacationSchedule`, `src/services/VacationSchedule`, `seed-vacation-schedule.mjs`, правки `App.tsx`/`Header.tsx`/`Main.tsx`). Её сиды (`vacationSchedules`, `leaves`, `users`, `procurements`, `legalActs`, `edsSignatureEvents`) уже попали в `db.json` при коммите `033bff9` — в сообщении коммита это помечено.

## 17. КТРУ, сводная таблица объектов закупки и кастомные контролы (2026-11-18)

- **Справочник КТРУ:** `src/services/KtruRef/ktruRef.schema.ts` (`KtruRef`, характеристики с `isMandatory`), `.api.ts` (`useKtruDictionary`, `searchKtru`, `findKtruByCode`, `findKtruByOkpd2`), `ktruControl.ts` (`checkKtruUsage`, `ktruRequirements`, `ktruCharacteristicText`). Коллекция `ktruRefs` — 6 позиций для ОКПД2 32.50.13.190, 26.20.11.110, 21.20.10.110, 41.20.40.900, 43.31.10.000. API терпим к отсутствию коллекции: 404 → пустой справочник.
- **КТРУ в UI:** `src/components/UI/KtruSelect/KtruSelect.tsx` — нативный select, ограниченный позициями выбранного ОКПД2 (выпадающий слой не обрезается таблицей). В извещении и СЗ при коде ОКПД2, который есть в КТРУ, показывается предупреждение ПП РФ № 145: описание строится по позиции каталога; выбор КТРУ подставляет наименование и единицу измерения.
- **Извещение — объект закупки:** `PurchaseObjectsSection.tsx` перестроен: сверху блок «Позиции ОКПД2 / КТРУ, выбранные заказчиком» (код, КТРУ, наименование, ожидаемый нацрежим), ниже сводная таблица с редактированием и удалением строк, под ней **один** `NormingRequirementsBlock` на всю закупку. Набор характеристик хранится в `purchaseObjects.normingRequirements`; кнопка «Подставить характеристики КТРУ» переносит обязательные характеристики каталога. Старые `items[].normingRequirements` читаются для совместимости.
- **СЗ — раздел 2:** ООЗ выбирается один раз над таблицей (`objectDescriptionId` СЗ), позиции редактируются в сводной таблице (`items`), удаление доступно в каждой строке. При выборе ОКПД2 национальный режим по ПП РФ № 1875 подставляется автоматически; в извещении он приходит из СЗ, а при пустом значении подставляется по справочнику.
- **Схемы:** `PurchaseNoteObjectItemSchema` — `ktruCode`/`ktruName`; `PurchaseObjectItemSchema` — `ktruCode`/`ktruName`/`objectDescriptionId`; `purchaseObjects.normingRequirements`; `objectDescription.ktruCode`/`ktruName`. `NoticeInfoForm` при переносе СЗ разделяет ОКПД2 и КТРУ, собирает единый набор характеристик без дублей и подставляет ожидаемый нацрежим.
- **Файл ООЗ:** `ObjectDescriptionSection` — выбор позиции КТРУ (код ОКПД2 берётся из описания или первой позиции закупки), кнопки «Сформировать файл ООЗ и приложить» и «Прикрепить выбранный файл»; записи попадают в `attachedDocs` с категорией `object_description` и видны в разделе прилагаемых документов.
- **Кастомные контролы:** `src/components/UI/CustomCheckbox.tsx`, `CustomRadio.tsx`, `ChoiceControl.module.scss` (label + скрытый input + span, совместимы с `register`). Глобальные стили `src/scss/global/_controls.scss` приводят все нативные `input[type=checkbox|radio]` к тому же виду: `appearance:none`, рамка/заливка из ролей темы, галочка SVG-фоном (белая в светлой, тёмная в тёмной), точка радио градиентом, видимый `focus-visible`, disabled.
- **Проверки:** `npx tsc -b` — чисто; `npx oxlint src` — 0 ошибок (21 существующее предупреждение); `npx vite build` — успешно. Визуальный смоук `/procurement-processing/1/notice-info`: блок выбранных позиций, таблица с ОКПД2/КТРУ, предупреждение КТРУ и аукционного перечня, сводка «ожидается Запрет», единый набор характеристик, формирование файла ООЗ, кастомные радио и чекбоксы. ⚠️ Выпадающий список `Okpd2Select` внутри таблицы обрезался `overflow-x:auto` — контейнеры таблиц переведены на `overflow: visible`.

## 18. ИКЗ, привязка ОКПД2 к плану-графику, характеристики по позициям (2026-11-18)

- **ИКЗ одной строкой:** в `ContractConditionsSection.tsx` блок составных частей ИКЗ (`ikzYear`, `ikzCustomerCode`, `ikzPlanNumber`, `ikzOrderNumber`, `ikzOkpd2`, `ikzKvr`) заменён одной строкой `generalInfo.ikz` с подписью «Формируется из позиции плана-графика автоматически». Поля остаются в схеме для совместимости, но не рендерятся. Стиль `eis-main__value--ikz-value` — monospace, одна строка, `overflow-wrap: anywhere`.
- **ОКПД2 только из плана-графика:** `Okpd2Select` получил проп `allowedCodes?: string[]` — фильтрует справочник, запрещает ручной ввод кода вне списка, показывает «Код отсутствует в плане-графике» и предупреждение для сохранённого кода вне плана. `NoticeInfoForm` вычисляет `allowedOkpd2Codes` из `purchasePlans.positions` плана, к которому относится СЗ, и валидирует позиции и `objectDescription.okpd2Code` при сохранении. `PurchaseNoteModal` берёт коды из `plan.positions` и валидирует `items[].okpd2Code` в `onSubmit`.
- **Характеристики по позициям:** `NormingRequirementsBlock` снова принимает `index`/`positionNumber` и работает с `purchaseObjects.items.${index}.normingRequirements`; КТРУ и шаблон ПП 926 подставляются для конкретной позиции. В извещении блок рендерится под раскрытой строкой таблицы; в СЗ под раскрытой позицией выбирается её ООЗ (`items[].objectDescriptionId`) и показываются его характеристики (`formatCharacteristicValue`).
- **Сворачивание позиций:** `PurchaseObjectsSection` и раздел 2 `PurchaseNoteModal` держат `Set` раскрытых id. Новая позиция раскрывается сразу, «Сохранить» сворачивает её в короткую строку, «Редактировать» раскрывает снова. Ключ — собственный `id` позиции (`items[].id`), а не ключ `useFieldArray`, иначе добавление не раскрывалось.
- **Блок выбранных позиций под таблицей:** в `PurchaseObjectsSection` блок «Позиции ОКПД2 / КТРУ, выбранные заказчиком» перенесён под таблицу; показывает код, КТРУ, наименование, сумму, нацрежим и действия «Редактировать»/«Удалить».
- **Файлы ООЗ и НМЦК:** из `ObjectDescriptionSection` убраны формирование и прикрепление файла ООЗ (осталась подсказка, что файл приходит из прилагаемых документов). В `PurchaseNoteSchema` добавлены `objectDescriptionFileName`/`objectDescriptionFileUpdatedAt`; `PurchaseNoteModal.onSubmit` заполняет имя файла при выбранном ООЗ. `NoticeInfoForm` при предзаполнении добавляет в `attachedDocs` файлы НМЦК и ООЗ (категории `nmck_justification` и `object_description`) без затирания уже приложенных и без дублей; ООЗ переносится для утверждённой СЗ (`status === "approved"`).
- **Проверки:** `npx tsc -b` — чисто; `npx oxlint src` — 0 ошибок (21 существующее предупреждение); `npx vite build` — успешно. Визуальный смоук `/procurement-processing/1/notice-info`: ИКЗ одной строкой, блок выбранных позиций под таблицей, новая позиция раскрывается с блоком «Характеристики позиции № 1», после «Редактировать» сворачивается в короткую строку. ⚠️ Прямой переход на `/purchase-notes` после логина иногда теряет сессию («Организация заказчика не определена») — смоук СЗ не выполнен, логика проверена типами.

## 19. СЗ: первичность ООЗ, статус только для чтения, редактируемые КБК и верхний блок НМЦК (2026-11-18)

- **ООЗ первично для НМЦК:** в разделе 2 СЗ добавлены флаги `oozSetComplete` («Набор объектов конечный — описание готово для определения НМЦК») и `positionProcurementsComplete` («Это последняя закупка по позиции плана-графика»). Пока ООЗ не выбран или набор не признан конечным, кнопка «Рассчитать НМЦК здесь» и статус запроса на файл НМЦК блокируются с предупреждением: для сопоставимых цен нужны идентичные/сопоставимые товары, без описания нельзя сформулировать запрос. Для тарифного и затратного методов (`nmckCalculation.method === "tariff" | "cost"`) ограничение мягче — запрос разрешён, но выводится предупреждение.
- **Статус СЗ только для чтения:** в разделе 1 вместо редактируемого `select` показывается `PurchaseNoteStatusBadge` и пояснение; значение сохраняется скрытым `input` (`register("status")`). Статус меняется по мере прохождения согласования, вручную не редактируется.
- **Верхний блок раздела 4:** НМЦК, аванс (флаг и процент), казначейское и банковское сопровождение вынесены в начало раздела `finance-summary`; ниже идёт расшифровка — КБК, обоснование, файл, подпись, запрос и расчёт. Сетка `finance-summary-row` раскладывает поля в ряд или в столбец в зависимости от ширины.
- **НМЦК по умолчанию:** при редактировании СЗ берётся `initialMaxPrice`, если пусто — сумма из `nmckCalculation.nmckTotal`, затем объём из плана-графика. При сохранении расчёта единственный КБК без ручной правки автоматически получает сумму НМЦК.
- **Редактируемые суммы по КБК:** в `PurchaseNoteSchema` добавлено `kbkFundingAmounts: { id, kbk, amount }[]`. В таблице КБК колонка «Всего» стала `MoneyInput`; под таблицей показываются итог по КБК, НМЦК и расхождение (если больше копейки). Суммы по годам остаются справочными из ПГ. ⚠️ Структура заменена на годовые суммы — см. раздел 20.
- **Проверки:** `npx tsc -b` — чисто; `npx oxlint src` — 0 ошибок (21 существующее предупреждение); `npx vite build` — успешно. ⚠️ Визуальный смоук СЗ не выполнен из-за потери сессии при прямом переходе на `/purchase-notes`; изменения проверены типами и сборкой.

## 20. СЗ: инициатор из штата, редактор позиции, сопровождение и КБК по годам (2026-11-18)

- **Инициатор закупки:** `formatEmployeeInitiator` в `PurchaseNoteModal.tsx` читает ФИО из вложенного `employee` (`BaseHuman`), а должность — из самой записи `BaseEmployee`. `defaultInitiatorEmployee` — это штатная запись (`useMyContractRole().employee`), а не вложенный человек, поэтому `initiatorEmployeeId` получает реальный `employees.id`, а `initiatorName` — «должность — Фамилия И. О.». Список сотрудников в select больше не содержит пустых вариантов; сохранённый инициатор распознаётся по id (фолбэк «введено ранее» — только для старых СЗ без `initiatorEmployeeId`).
- **Редактор позиции в разделе 2:** раскрытая позиция — одна строка `<tr><td colSpan={10}>` с блоком `item-editor`: наименование на всю ширину, остальные свойства (ОКПД2/КТРУ, ед. изм., количество, цена, стоимость, нацрежим, «товар при работах») — сеткой `item-editor-grid`, действия «Сохранить»/«Удалить» — внутри `item-editor-actions`. Из `positions-table` убраны `min-width: 1120px` и минимумы у `td`/`positions-code-cell`, поэтому кнопки не выходят за форму.
- **Сопровождение контракта:** казначейское (ст. 242.23 БК РФ) и банковское сопровождение вынесены из `finance-summary-row` в отдельные блоки `support-block` на всю ширину; в `finance-summary` остались НМЦК и аванс.
- **КБК по годам:** `kbkFundingAmounts` в `PurchaseNoteSchema` теперь `{ id, kbk, amountCurrentYear?, amountPlanPeriodFirstYear?, amountPlanPeriodSecondYear?, amountSubsequentYears? }` (поле `amount` заменено). В таблице правятся 4 годовые суммы (`MoneyInput`), «Всего» по КБК рассчитывается как их сумма, итог и расхождение с НМЦК — ниже. Под каждым полем показан лимит ПГ; превышение подсвечивает поле/лимит и выводит предупреждение, а `onSubmit` блокирует сохранение (`setError("root", ...)`). При сохранении расчёта НМЦК единственный КБК без ручных правок распределяется по годам пропорционально объёмам ПГ (`distributeNmckAcrossYears`).
- **Проверки:** `npx tsc -b` — чисто; `npx oxlint src` — 0 ошибок (22 предупреждения, включая 2 `react-hooks/exhaustive-deps` в `PurchaseNoteModal`); `npx vite build` — успешно. Визуальный смоук СЗ № 2 (`/purchase-notes` → «Открыть СЗ», организация `test1@test.test`, план 1, позиция 1): список инициаторов с ФИО и должностями, выбор сохраняется; редактор позиции в рамке с наименованием на всю ширину; казначейское и банковское сопровождение — отдельными блоками; в таблице КБК ввод 5 000 000,00 ₽ при лимите 2 425 000,00 ₽ дал красную подсветку, предупреждение о превышении и пересчёт итога. ⚠️ Прямой переход на `/purchase-plans/...` теряет сессию — смоук выполнять только по ссылкам из интерфейса.

## 21. СЗ: инициатор и статус в ряд, критерии рядом со способом, пересчёт стоимости (2026-11-18)

- **Раздел 1:** инициатор закупки — первым, поле на всю ширину (`field wide` + `initiator-row`); номер и дата СЗ — ниже. Добавлен модификатор `field--grow`. Статус согласования показывается один раз — в шапке (см. раздел 22).
- **Раздел 3:** поле «Направление / тип закупки» удалено (импорт `DEFAULT_PROCUREMENT_TYPES` больше не нужен). В относительном сроке поставки добавлен флажок `deliveryTermFromContractDate` (`true` в `emptyPurchaseNote`), подпись поля меняется на «дней с даты заключения контракта».
- **Критерии оценки (ПП РФ № 2604) переехали в раздел 3:** отдельный раздел 5 удалён, блок `evaluation-box` стоит сразу под полем способа и виден, когда способ выбран (`evaluationApplies`). Внутри: категория объекта (приложение N 2), связь с ОКПД2 позиций плана-графика, список критериев с чекбоксом, значимостью (`weightPercent`), текстом формулы (`criterionFormulaText` в `bidEvaluation.schema.ts`), детализирующими показателями (`indicator-list`/`indicator-row`: наименование, значимость, направление, способ оценки, «Удалить»), кнопкой «+ Добавить показатель» и сводкой «Итог по критерию / Итог по заявке». Ошибки `validateBidEvaluation` выводятся списком `evaluation-issues`. Разделы перенумерованы: СМП — 5, обеспечение и гарантии — 6.
- **Показатели критерия:** `addCriterionIndicator`/`removeCriterionIndicator` в `PurchaseNoteModal` работают через `normalizeCriteria(getValues("evaluationCriteria"))` + `setValue(..., { shouldDirty, shouldValidate })`; новый показатель — `{ name: "", kind: <первый вид для критерия>, weightPercent: 0, unit: "", best: "max", scoring: "formula", scaleText: "" }`. Список критериев читается через `useWatch({ control, name: "evaluationCriteria" })` — обычный `watch` не реагировал на глубокие изменения, и включённый чекбокс не раскрывал значимость, формулу и показатели.
- **`buildDefaults`:** `evaluationCriteria` берётся из СЗ, а для новой записи — `defaultCriteria()` (цена 60 %, квалификация 40 %).
- **Раздел 4:** аванс перенесён сразу под НМЦК — `finance-summary-row` заменён на `finance-summary-col` (flex column). В таблице КБК колонка «Всего» подписана «Всего (расчёт), руб.» и остаётся только для чтения.
- **Пересчёт стоимости позиции:** `recalcItemTotal(index, overrides?)` вызывается при изменении количества и цены (`MoneyInput`), стоимость = цена × количество (`toFixed(2)`); для read-only СЗ не работает.
- **Источник ООЗ:** под селектом ООЗ выводится, откуда взято описание (автоматически по позиции плана-графика/ИКЗ или выбрано вручную), количество характеристик и пояснение, что состав ведётся в конструкторе; ссылка переименована в «Редактировать в конструкторе ООЗ».
- **Проверки:** `npx tsc -b --pretty false` — чисто; `npx oxlint src` — 0 ошибок (22 предупреждения); `npx vite build` — успешно. Визуальный смоук СЗ № 2: инициатор на всю ширину + статус «Согласовано» рядом; выбор способа «Открытый конкурс в электронной форме» раскрыл блок критериев, включение критерия «Характеристики объекта» показало значимость, формулу и детализирующие показатели, «+ Добавить показатель»/«Удалить» работают; ошибки 2604 (цена < 70 %, сумма нестоимостных > 30 %) отображаются; аванс под НМЦК; «Итого по КБК» и расхождение с НМЦК; в редакторе позиции цена 100,00 ₽ × количество 13 дала стоимость 1 300,00 ₽.

## 22. СЗ: единый статус, флаги ООЗ в конце, выравнивание сроков и сумм (2026-11-18)

- **Один статус СЗ:** бейдж `PurchaseNoteStatusBadge` в разделе 1 удалён (вместе со стилем `status-inline`), статус остался только в шапке рядом с заголовком «Потребность (СЗ № …)». Скрытый `input` (`register("status")`) перенесён в поле инициатора, поэтому значение по-прежнему сохраняется.
- **Флаги готовности ООЗ:** блок `ooz-flags` («Набор объектов закупки конечный…», «Это последняя закупка по позиции…») перенесён в конец раздела 2 — после таблицы объектов и сводки по национальному режиму, то есть после описания ООЗ.
- **Выравнивание сроков:** в относительном и абсолютном сроке поставки сетка получила модификатор `grid--aligned` (`align-items: end`), поэтому «Начало через (дней с даты заключения контракта)» и «Срок поставки / выполнения (дней)» стоят на одной линии несмотря на разную высоту подписей.
- **Суммы по правому краю:** в `PurchaseNoteModal.module.scss` денежные поля (`input[inputmode="decimal"]`, то есть все `MoneyInput`) выровнены вправо с `tabular-nums`; в `positions-table` колонки 5–7 (кол-во, цена, сумма), в `kbk-table` все колонки кроме КБК, в `nmck-table` все колонки кроме первой (поставщик), в `nmck-kpi` значения — тоже справа.
- **Проверки:** `npx tsc -b --pretty false` — чисто; `npx oxlint src` — 0 ошибок (22 предупреждения); `npx vite build` — успешно (4,33 с). Смоук СЗ № 2: статус только в шапке, инициатор на всю ширину, флаги ООЗ в конце раздела 2, поля сроков на одной линии, НМЦК «175,50» и годовые суммы КБК прижаты вправо.

## 23. СЗ: лимиты ПГ только при ошибке, суммы без «₽», преимущество нацрежима, кастомный способ (2026-11-18)

- **Лимит ПГ:** подпись «лимит ПГ: …» в таблице КБК выводится только при превышении (`overLimit`), вместе с красной подсветкой поля; при нормальных суммах подписи нет.
- **Без знака рубля:** `formatRub` в `PurchaseNoteModal` больше не добавляет «₽» — единица измерения уже указана в заголовках граф («Цена, руб.», «Сумма, руб.», «Всего (расчёт), руб.»). Знак остался только в KPI-карточках НМЦК, где подписи без единицы измерения.
- **«Преимущество» национального режима:** в [`pp1875.ts`](src/services/NationalRegime/pp1875.ts:1) добавлены `okpd2ObjectKind` (01–39 — товары, 41–43 — работы, остальное — услуги) и `isAdvantageApplicable(code, requiredRegime)` — преимущество допустимо только для товаров и только если по коду не требуется запрет или ограничение. В позиции СЗ и в объектах извещения опция «Преимущество» скрывается, когда недоступна, а под полем выводится подсказка: либо «право заказчика: можно установить, а можно не устанавливать», либо причина недоступности (обязательный запрет/ограничение или вид объекта — работа/услуга).
- **Флаги готовности ООЗ по умолчанию:** `oozSetComplete` и `positionProcurementsComplete` в `emptyPurchaseNote` — `true`; в модале читаются как `watch(...) ?? true`, поэтому новая СЗ сразу считает набор конечным и закупку последней.
- **Способ определения поставщика:** нативный `select` заменён на `CustomSelect` (поиск, ограниченная высота, не выпадает за экран); выбор пишется через `setValue("placingWayCode", ...)`, значение читается из `watch("placingWayCode")`.
- **Проверки:** `npx tsc -b --pretty false` — чисто; `npx oxlint src` — 0 ошибок (22 предупреждения); `npx vite build` — успешно (7,22 с). Смоук СЗ № 2: оба флага ООЗ включены, кастомный список способов с поиском открывается внутри формы и показывает названия, под полем нацрежима — ««Преимущество» недоступно: по коду обязательно «Запрет»», цены и суммы без «₽», при вводе 3 000 000 при лимите 2 425 000 появляется только красная подпись «лимит ПГ: 2 425 000,00».

## 24. Хедер: сквозной контур и подменю реестра контрактов (2026-11-18)

- **Состав шапки:** оставлены разделы сквозного контура — «Главная» (`/`), «План-график» (`/purchase-plans`), «Потребность» (`/purchase-notes`), «Извещения» (`/procurement-processing`), «Контракты» (`/contract-service`), «Реестр контрактов» (`/contract-registry`) и «ЕИС / СМП» (`/eis/smp-export`, выгрузка пакетов в ЕИС и СМП/СОНКО). Остальные пункты (задачи, дефектовки, ОКПД2, законодательные акты, расчёт НМЦК, оценка заявок, график отпусков, журнал ЭП) из шапки убраны — их экраны остались по своим роутам.
- **Подменю «Реестр контрактов»:** открывается наведением и кликом (`submenu-wrap`/`submenu`/`submenu-link` в `Header.module.scss`), закрывается кликом вне и Escape. Пункты: «Все контракты» (`/contract-registry`), «Контракты по конкурентным способам» (`?group=competitive`), «Контракты у ЕП» (`?group=single`). Сам пункт остаётся подсвеченным на всех трёх вариантах (`link--active` по `location.pathname`).
- **Фильтр реестра:** `ContractRegistryPage` читает `group` из `useSearchParams`, строит карту «id закупки → способ» из `useGetProcurements()` (поле `procurementType`, закупки ЕИС) и `useNotices()` (`generalInfo.placingWayCode`, извещения системы, приоритетнее), затем фильтрует контракты по `procurementId`. Закупка у единственного поставщика определяется как `EP93` в коде или «единственн» в тексте способа, остальные — конкурентные. Заголовок и пустое состояние зависят от группы; контракты без привязки к извещению в группы не попадают (об этом есть пояснение).
- **Проверки:** `npx tsc -b --pretty false` — чисто; `npx oxlint src` — 0 ошибок (22 предупреждения); `npx vite build` — успешно (3,05 с). Смоук: шапка из шести пунктов, подменю открывается по наведению, «Контракты по конкурентным способам» показывает контракт 0344200012126000001 (Электронный аукцион), «Контракты у ЕП» — пустое состояние с пояснением, пункт «Реестр контрактов» подсвечен на всех вариантах.

## 25. Извещения: текущие записи, поиск, сроки и действия (2026-11-19)

- **Статусы извещения:** в [`procurement.schema.ts`](src/services/Procurements/procurement.schema.ts:1) добавлены `NOTICE_STATUSES` (`preparing` — на подготовке, `control` — на контроле, `published` — размещено, `summing_up` — подведение итогов, `completed` — закупка состоялась, `failed` — не состоялась, `cancelled` — отменено), русские подписи и `normalizeNoticeStatus`. Статус читается из поля записи «Статус извещения»; если его нет — выводится из данных: есть номер извещения → «Размещено», иначе «На подготовке». `useUpdateProcurementStatus` пишет статус через `PATCH /procurements/:id`.
- **Сроки процедуры:** в схему добавлены необязательные поля «Дата начала подачи заявок», «Дата окончания подачи заявок», «Дата рассмотрения заявок», «Дата подведения итогов» → `applicationStartDate`, `applicationEndDate`, `reviewDate`, `summingUpDate`. В карточке они показываются в формате ДД.ММ.ГГГГ (при отсутствии — «—»).
- **Раздел «Извещения (текущие)»:** [`ProcurementProcessing`](src/components/ProcurementProcessing/ProcurementProcessing.tsx:17) показывает только текущие записи (отменённые скрыты). Сверху — поиск по названию и номеру извещения, ниже — чипы фильтра «Все / На подготовке / На контроле / Размещено / Подведение итогов / Закупка состоялась / Закупка не состоялась» со счётчиками.
- **Карточка извещения:** [`ProcurementRow`](src/components/ProcurementProcessing/ProcurementRow.tsx:1) оформлена в стиле системы (без Times New Roman и табличных рамок): номер извещения — ссылка в общий доступ ЕИС (`zakupki.gov.ru`, поиск по номеру, новая вкладка), бейдж статуса, НМЦК, наименование, мета-сетка со способом закупки и четырьмя сроками. ИКЗ из карточки убран.
- **Компактные действия:** одна строка кнопок с иконкой и короткой подписью — «Открыть» (просмотр/редактирование), «Изменить», «Отмена», «Удалить».
- **БО — не в извещениях:** направление сведений в контрольный орган относится к этапу заключения контракта и до размещения извещения не применяется, поэтому действие из списка извещений убрано. Тип `BudgetObligation` и хуки `useBudgetObligations`/`useCreateBudgetObligation` в [`procurement.api.ts`](src/services/Procurements/procurement.api.ts:1) оставлены — их использует будущий этап заключения (отправка через бэкенд).
- **Проверки:** `npx oxlint src` — 0 ошибок (25 предупреждений, в файлах задачи новых нет); `npx vite build` — успешно (7,61 с). `npx tsc -b` падает только на чужой незакоммиченной правке `GeneralInfoSection.tsx` (`PLACING_WAYS_ALL` объявлен, но не используется); в файлах этой задачи ошибок нет. Смоук (до удаления кнопки БО): 14 текущих извещений, поиск «Курск» оставляет одну карточку, фильтр «На подготовке» — 11, «Размещено» — 3, сроки и компактные кнопки на месте.

## 26. Парсер ЕИС 44-FZ `getDocsIP` — Tasks 14 (2026-11-19)

Отдельное решение **.NET 9** в `eis-parser/` (в `.sln` четыре проекта). Задача
была удалена из `CurrentTasks.md` кем-то из агентов — восстановлена секцией
`Tasks 14` сверху файла по тексту спецификации, которую прислал пользователь.

- **`Eis44Parser.Core`**: `SoapRequestBuilder` (жёсткий `xs:sequence`, токен в
  `<soapenv:Header>`), `Eis44Client` (SOAP POST + GET ZIP через локальный Stunnel
  `http://127.0.0.1:8080`, заголовок `individualPerson_token`, Polly-повторы
  429/5xx/сетевых ошибок), `TenderXmlParser` (`XDocument` + `Name.LocalName`,
  устойчив к префиксам и разным `schemeVersion`), модели `TenderDto`,
  `EisClientOptions`, коды подсистем `PRIZ`/`RPEC`/`RPGZ`/`NSI`.
- **`Eis44Parser.Data`**: EF Core (`TenderRecord`, SQLite/PostgreSQL), дедупликация
  по `PurchaseNumber` + версии: повтор пропускается, изменившаяся версия обновляется.
- **`Eis44Parser.Worker`**: `PollingWorker` (последовательный опрос по регионам,
  типам документов, подсистемам и датам, без превышения лимита ~8 RPS),
  CLI `--once` и `--validate`. Настройки — в `appsettings.json`, токен —
  в User Secrets вне репозитория (или через `Eis44__IndividualPersonToken`).
- **`Eis44Parser.Tests`**: 5 xUnit-тестов (порядок SOAP-тегов и экранирование,
  парсинг XML с разными схемами и десятичными разделителями, дедупликация).
- **Документация:** `eis-parser/README.md`, `eis-parser/schemas/README.md`,
  `eis-parser/schemas/generate-models.ps1` (генерация строгих моделей из XSD
  Альбома ТФФ через `dotnet-xscgen`, не `xsd.exe`). Папка `Schemas44/` пока
  пустая (`.gitkeep`) — схемы пользователь должен положить сам.
- **Проверки:** `dotnet build` — 0 ошибок/0 предупреждений; `dotnet test` —
  5/5 зелёных; `--validate` создаёт SQLite-БД и печатает конфигурацию. Live-прогон
  не делался: нужен Stunnel с ГОСТ-TLS и доступ к тестовому контуру ЕИС
  (токен вынесен в User Secrets, но его старая копия осталась в истории
  публичного репозитория — подлежит перевыпуску).
- **Готовность к live (2026-11-19):** CLI `--check` печатает состояние токена и
  TCP-пинг туннеля, код 1 при недоступности; `TunnelProbe` вызывается и перед
  каждым SOAP/GET, чтобы ошибка туннеля не маскировалась таймаутом HttpClient.
  Установлен **stunnel-msspi 0.84** (`C:\Tools\stunnel-cpro\stunnel-msspi.exe`),
  конфиг `eis-parser/stunnel.conf` обновлён: `sni`, `sslVersion=TLSv1.2`,
  `cert=<отпечаток>`, `ciphers=ff85` (в msspi cipher-лист — 16-ричные коды,
  не имена OpenSSL). PIN хранится только вне репозитория: скрипт
  `eis-parser/scripts/start-stunnel.ps1` запрашивает его и пишет рабочий конфиг
  в `%TEMP%\eis44-stunnel.conf`; `eis-parser/stunnel.local.conf` добавлен в
  `.gitignore`. Отпечаток сертификата ИП на Рутокене:
  `08A26ABA98738FEE6BB29A103D1909A251C5D20F` (контейнер
  `SCARD\pkcs11_rutoken_ecp_475b44db\FNS_SBER_IP_POYARKOV_2462970_21.04.2026_1054`,
  провайдер Crypto-Pro GOST 2012, действует до 21.07.2027).
- 🔴 **Живой обмен заблокирован на уровне TLS (2026-11-19).** ЕИС
  `int44.zakupki.gov.ru:443` (94.25.27.252) сбрасывает соединение `10054`
  сразу после `SSL_connect`: в логе stunnel `Connection reset: 0 byte(s) sent
to TLS`, в `csptest -tlsc -hello -ciphers ff85 -user <thumbprint>` —
  `Error 10054 reading data from server` / `0x80090304`. «Сырой» ClientHello
  с suite `ff85` и SNI тоже получает сброс, хотя тот же самый байтовый набор
  против `www.google.com:443` возвращает корректный TLS alert — значит
  пользовательский стек и конфиг исправны. Тот же stunnel-msspi успешно
  делает TLS 1.2 handshake с Google. VPN включался и отключался — без эффекта;
  `www.zakupki.gov.ru` и `zakupki.gov.ru` отвечают 200, только `int44` рвётся.
  Дальше без пользователя: подтвердить доступ/белый список IP, рабочий контур
  ЕИС или актуальность сертификата на стороне сервера. SSL Labs тоже пишет
  `Unable to connect to the server` (для GOST-хоста не доказательно).
- **Повторная проверка 2026-11-19 (по просьбе пользователя).** `--check`:
  токен задан, stunnel запущен из готового `%TEMP%\eis44-stunnel.conf`, локальный
  порт 8080 слушает. Но запрос через туннель снова умирает: `s_connect:
connected 94.25.27.252:443`, затем `SSL_connect` и `Connection reset: 0 byte(s)
sent to TLS`. То есть это не токен и не PIN, а доступ/контур на стороне ЕИС.
- 🟢 **Прорыв со статическим IP (вечер 19.11.2026).** Внешний IP подтверждён
  тремя сервисами — `195.226.203.100`; TCP до `94.25.27.252:443` (`int44`)
  открыт, но `SSL_connect` всё равно сбрасывается (`0 byte(s) sent to TLS`),
  в том числе без SNI. Зато `int.zakupki.gov.ru:443` (`95.167.245.200`) делает
  ГОСТ-TLS handshake успешно и отдаёт **тот же официальный WSDL** `getDocsIP`
  (`fz44/get-docs-ip`, операция `getNsi`) — проверено через временный туннель на 8082. Реальный SOAP `getNsiRequest` через него дошёл до ЕИС, и сервер ответил
  прикладной ошибкой: «Токены для сервисов отдачи отсутствуют в ЕИС» для
  токена `01a1…ba8a` из User Secrets. То есть сетевой барьер пройден; дальше
  нужен **перевыпущенный токен** (старый сгорел ещё и из-за утечки в `eecaca5`).
  `scripts/start-stunnel.ps1` теперь умеет `-Connect int.zakupki.gov.ru:443`
  с автоматическим SNI; `ServiceUrl` в appsettings уже указывает на `int`.
  `nsiCode` по-прежнему не подтверждён — ответ `nsiAllList` придётся запросить
  сразу после смены токена.
  **Повтор 19.11.2026 с новым токеном:** пользователь выдал новый GUID, он
  записан в User Secrets (`Eis44:IndividualPersonToken`), `--check` зелёный;
  ЕИС в ответе цитирует именно его, значит доставка корректна. Ошибка
  «Токены для сервисов отдачи отсутствуют» сохраняется. Дополнительно по
  официальной WSDL добавлены `SOAPAction` и дубли токена в HTTP-заголовке —
  не помогло. Значит нужно проверять на стороне ЕИС: выдан ли токен именно
  для **сервисов отдачи данных 44-ФЗ**, активен ли он и не относится ли к
  другому контуру. Локальные изменения в клиенте — не причина.
- **Импорт КТРУ код готов, без live-прогона (2026-11-19).** В `eis-parser`:
  `SoapRequestBuilder.BuildNsiRequest` (getNsiRequest по XSD 17.0),
  `Eis44Client.FetchNsiArchiveUrlsAsync` + `DownloadArchiveXmlAsync` (общая
  часть вынесена в `DownloadArchiveDocumentsAsync`), `NsiXmlParser` (позиции
  `position/data` по локальным именам, `actual` из статуса), `NsiSnapshotBuilder`
  (версия `eis-nsiKtru-<16 hex>`, SHA по `code|name|payload`, как в csms-api),
  `NsiImportService`, CLI `--import-nsi` и `--dry-run`, публикация через
  `ReferenceApiClient` → `POST /api/references/import` (токен не дублируется).
  Настройки — раздел `EisNsi` в appsettings: `NsiCode=nsiKtru` надо подтвердить
  ответом `nsiAllList`. Проверки: `dotnet build` 0 ошибок/0 предупреждений,
  `dotnet test` 12/12, `--validate` зелёный. Описание — `eis-parser/README.md`.
- **Альбом ТФФ 17.0 прочитан и разложен по типам (2026-11-19).** Найдены архивы
  `Альбом ТФФ 17.0.zip` (19 docx: оглавление + приложения 1–18) и
  `Схемы 17.0 итерация 2.zip` (32 XSD + 16 WSDL). Схемы распакованы в
  `eis-parser/schemas/Schemas44/`, каталог всех глобальных определений —
  `TYPE_CATALOG.json` / `.md` (3548: 1674 complexType, 690 simpleType, 1177
  element, 3 group, 4 attributeGroup), генератор — `generate-type-catalog.ps1`.
  В `getDocsLE-ws-api.xsd` исправлена опечатка архива (`?>>` → `?>`).
  По WSDL/XSD уточнены namespace SOAP: envelope `http://schemas.xmlsoap.org/soap/envelope/`,
  тело `http://zakupki.gov.ru/fz44/get-docs-ip/ws`; локальные теги без ns
  (`elementFormDefault="unqualified"`). `SoapRequestBuilder` и тесты обновлены.
  C#-модели генерируются `schemas/generate-models.ps1` (xscgen, 32 файла,
  ~29,8 МБ) в `Models/Generated/`, папка в `.gitignore`; сборка 0 ошибок,
  тесты 12/12. Живой канал ЕИС по-прежнему закрыт.
- ⚠️ **Ловушка, уже пойманная:** нельзя совмещать `SecurityElement.Escape()` с
  `XElement` — получается двойное экранирование (`&amp;amp;`). `XElement` сам
  экранирует содержимое. Вторая ловушка: `ResiliencePipeline<T>.ExecuteAsync`
  в Polly 8 принимает `Func<CancellationToken, ValueTask<T>>`, а не
  `Func<CancellationToken, Task<T>>` — нужна обёртка `new(...)`.
  Третья (исправлена 2026-11-19): `Host.CreateApplicationBuilder(args)` ищет
  `appsettings.json` относительно cwd — при запуске `dotnet run --project ...`
  из корня репозитория конфиг молча не читался и работали дефолты. Теперь
  `ContentRootPath = AppContext.BaseDirectory`. Четвёртая: биндер коллекций
  дописывает значения к инициализаторам (`31, 31`) — добавлен `PostConfigure`
  с `Distinct()`.
- `.gitignore`: добавлены игноры `eis-parser/**/bin|obj`, `*.db`, `eis44.db`,
  но `!eis-parser/Eis44Parser.sln` (общий игнор `*.sln` в корне).

## 27. Исходящий шлюз ЕИС: готовность к XSD — Tasks 12 (2026-11-19)

Работа шла в соседнем репозитории **`D:\Свои проекты\CSMS\csms-api`** (там живёт
`csms-api`, шлюз на `localhost:5099`), плюс восстановление роута в `csms`.

- **XSD-каталог.** `IEisSchemaCatalog` / `EisSchemaCatalog` (Application /
  Infrastructure): схемы ищутся в `schemas/<версия>/*.xsd`, путь меняется
  переменной `EIS_SCHEMAS_ROOT` (по умолчанию рядом со сборкой). `XmlSchemaSet`
  компилируется и кешируется на версию; `HasSchema` честно возвращает `false`,
  если папки нет. Путь к версии проверяется от обхода каталога.
- **Валидация до подписания.** `EisPackageService.EnsureXsdValid` вызывается при
  создании и пересборке пакета: для `placeholder-*` и для версии без схем
  проверка пропускается, при наличии схемы ошибки XSD становятся
  `DomainException` с текстом ошибок (первые три + счётчик остальных).
- **Упаковка.** `EisPackageArchiver` (Infrastructure, статический) собирает
  ZIP в памяти: `<реестровый номер>_<guid>.xml` + такой же `.sig` из base64.
  Неподписанный пакет и битый base64 отклоняются. `MockEisTransport.SendAsync`
  теперь тоже вызывает упаковку, чтобы ошибки нашлись до реального шлюза.
- **Фронтенд `csms`.** Роут `/eis/packages` (`EisPackagesPage`) и пункт шапки
  «Пакеты ЕИС» восстановлены: их удалил коммит `2fe42e2`, хотя компонент и
  сервис остались на месте.
- **Документация.** `csms-api/docs/eis-open-questions.md` §1 и новый
  `csms-api/schemas/README.md` объясняют, как положить Альбом форматов и что
  меняется после его появления.
- **Проверки.** `dotnet build` — 0 предупреждений/0 ошибок; `dotnet test` —
  25 пройдено, 2 PostgreSQL-теста пропущены без `EIS_TEST_DB`. Добавлены
  `EisSchemaCatalogTests` (синтетическая XSD, не схема ЕИС!) и
  `EisPackageArchiverTests`. Ранее запущенный `Csms.Api` (PID 19312) мешал
  копированию DLL при сборке — остановлен.
- 🔴 **Осталось заблокированным:** настоящего XML по XSD нет — нет самого
  Альбома форматов ЕИС (сведения об исполнении контракта, привлечение СМП) и
  версии схемы. Генератор по-прежнему честно пишет `placeholder-v0`, транспорт
  и подпись конверта ВС — заглушки (см. `eis-open-questions.md` §2–§4).

## 28. Конструктор проекта контракта по ст. 34 и 51 (2026-11-19)

- **Файлы:** `src/services/ContractProject/contractProject.schema.ts` (расширенная
  схема), `contractStructure.ts` (реестр разделов и видов контракта),
  `contractProjectPrefill.ts` (предзаполнение по цепочке), `contractDocument.ts`
  (сборка текста), `contractValidation.ts` (проверки ст. 34/51);
  `src/components/ContractProject/ContractProjectForm.tsx` + `.module.scss`.
- **Виды контракта (8):** поставка товара, ремонт (в т.ч. автодорог),
  строительство/реконструкция, капитальный ремонт, строительный контроль,
  ПИР, содержание объектов (услуги), содержание объектов (работы). Вид
  определяется по типу закупки, ОКПД2 и предмету (`detectContractKind`),
  переключается вручную; от него зависят специальные разделы и приложения.
- **Разделы:** преамбула; предмет (ст. 34 ч. 1 п. 1, ст. 33); цена и порядок
  оплаты (ч. 1 п. 2, ч. 2, 12, 13.1); сроки/место/порядок исполнения (ч. 1 п. 3);
  приёмка (ч. 1 п. 4, ст. 94); качество и гарантия (ст. 33); права заказчика и
  поставщика; ответственность (ч. 1 п. 5, ч. 5–8); обеспечение (ч. 1 п. 7, ч. 6–7,
  ст. 96); СМП/СОНКО (ч. 5–6 ст. 30, ПП РФ № 1466); изменение/расторжение
  (ч. 1 п. 6, ст. 95); уведомления; реквизиты; приложения. Специальные разделы:
  управление контрактом, проектная документация, права на РИД (ПИР), территория
  и период содержания, предмет и полномочия стройконтроля.
- **Приложения:** спецификация, ТЗ, смета, график работ, график оплаты,
  дефектовка, проектная документация, типовые условия СМП, программа
  стройконтроля, перечень объектов содержания. Набор по умолчанию собирается
  по виду контракта (`buildDefaultAppendices`), обязательные приложения нельзя
  исключить без ошибки.
- **Предзаполнение:** `buildContractProjectDraft` читает извещение (предмет,
  объект, цену, сроки/этапы, приёмку, качество, обеспечения, СМП,
  сопровождение), СЗ (исходные требования, сроки, гарантию, КБК), ООЗ
  (`buildObjectDescriptionSummaryText`) и карточку организации (реквизиты,
  подписант, адреса). Кнопки «Заполнить из извещения» и «Определить по
  извещению» пересобирают черновик.
- **Текст и проверки:** `buildContractDocument` нумерует разделы и собирает
  связный текст с приложениями и подписями; `validateContractProject` даёт
  блокирующие ошибки (обязательные условия ст. 34, пределы обеспечения 0,5–30 %,
  СМП ≥ 5 %, срок оплаты ≤ 7/10 раб. дней) и предупреждения (сумма этапов,
  дата заключения по ст. 51, необязательные приложения).
- **Обратная совместимость:** новые поля схемы имеют `.default()`; старые
  записи `contractProjects` (2 сида) парсятся без миграции. `term.stages`
  нормализуется в `[]`, `appendices`/`sectionOverrides` — в пустые массивы.
- **Проверки:** `npx tsc -b` — по файлам задачи чисто (единственная ошибка —
  чужой WIP `GeneralInfoSection.tsx`, `PLACING_WAYS_ALL`); `npx oxlint src` —
  0 ошибок (25 предупреждений, из них 1 новое `react(incompatible-library)` на
  `methods.watch()`); `npx vite build` — успешно. Визуальный смоук
  `/procurement-processing/1/contract-project`: 15 разделов для поставки,
  прогресс 5/8, панель проверок 5 ошибок / 2 предупреждения, предпросмотр
  собирается без падения.
- **Точка входа из шапки:** пункт «Проект контракта» ведёт на `/contract-projects`
  (`ContractProjectsPage.tsx` + `.module.scss`). Страница показывает проекты
  своей организации, поиск по названию/ИКЗ/поставщику и закупки без проекта;
  «Создать проект» открывает конструктор с предзаполнением из извещения.
- **Ограничения:** выгрузки в Word/`.docx` нет (по условию задачи смотрели
  только логику); подписание и запись в реестр контрактов не выполняются;
  юридическая редакция текста остаётся за заказчиком.

## 29. Автообновление XSD Альбома ЕИС (2026-11-19)

Работа в репозитории **`D:\Свои проекты\CSMS\csms-api`** (Tasks 12, продолжение
§27). Пользователь уточнил, что под «автоматическим скачиванием» имелось в виду
обновление именно XSD/форм, а не архивов документов из `getDocsIP`.

- **Источник найден и проверен:** публичная страница документов ЕИС
  `https://zakupki.gov.ru/epz/main/public/document/view.html?sectionId=432`
  отдаёт ZIP «Интеграционные схемы ЕИС версии 17.0» (`id=44668`, 17.11.2026,
  32 XSD + 16 WSDL). Скачивание без cookie/Referer даёт 404 — в HTTP-клиенте
  выставлен `Referer` на страницу списка.
- **Код.** `EisSchemaSourceOptions` (раздел `EisSchemas:Update`),
  `EisSchemaUpdateStatus`, `EisSchemaManifest`, `EisSchemaDownloader`,
  `EisSchemaUpdateWorker`, `EisSchemaEndpoints`. Первая проверка — при старте,
  дальше каждые 720 минут. Алгоритм: страница → newest `id`/версия → ZIP →
  лимиты → безопасная распаковка → `EisSchemaCatalog.CheckDirectory` →
  атомарная подмена `schemas/<версия>/` + сброс кеша каталога. При
  `AutoPromote=false` архив только готовится в `.incoming/`.
- **Защиты:** HTTPS-only URL, лимиты архива/распаковки, отказ от путей с `..`,
  проверка ZIP-магики, `XmlSchemaSet.Compile` до подмены, старая версия
  восстанавливается при неудаче, манифест с id и SHA-256 убирает повторную
  загрузку неизменного архива.
- **Дефект официального архива:** в `getDocsLE-ws-api.xsd` стоит лишний `>`
  после `<?xml …?>`, из-за чего XSD не компилируется. Загрузчик удаляет ровно
  этот символ и пишет `LogWarning`. Проверено: после правки все 32 XSD версии
  17.0 компилируются.
- **API:** `GET /api/eis/schemas/status` (без сети) и
  `POST /api/eis/schemas/update` (немедленная проверка, `502` при ошибке).
- **Проверки:** `dotnet build` — 0/0; `dotnet test` — 32 пройдено, 2 пропущены
  без `EIS_TEST_DB`. Отдельный тест с `EIS_XSD_ZIP=<zip>` проходит на настоящем
  архиве ЕИС. Живой прогон: `POST /update` → `Installed`, 32 файла, затем
  `UpToDate`; `scripts/smoke.ps1` — 11/11 шагов.
- 🟡 **Важное ограничение:** скачанные 17.0 — общие интеграционные схемы ЕИС.
  XSD для наших документов (исполнение контракта, привлечение СМП по
  658/215н и 918) в архиве нет, поэтому `PlaceholderXmlBuilder` остаётся
  `placeholder-v0`. Маппер доменной модели в XSD-классы пишется человеком:
  автообновление файлов не меняет смысл полей. Живой SOAP-обмен ЕИС по-прежнему
  заблокирован на уровне TLS (§26).

## 30. Обозреватель XSD и TypeScript-типы Альбома ЕИС (2026-11-19)

Продолжение §29, по просьбе пользователя «показать схемы/сущности» и сделать
«что-то типа Swagger». Выбрано: **все 32 XSD** и **обозреватель схем**.

- **Снимок в git.** 32 XSD версии 17.0 (11 МБ) скопированы из
  `src/Csms.Api/bin/Debug/net9.0/schemas/17.0` в `csms-api/schemas/17.0/` вместе с
  `.manifest.json`. Это не замена автообновлению, а читаемый снимок: файлы
  доступны без запуска шлюза, новая версия добавит новую папку.
- **Генератор.** `csms-api/tools/EisDocGenerator` (`SchemaReader`, `SchemaDoc`,
  `Program`) читает XSD через `XmlSchemaSet`, обходит `GlobalTypes`,
  `GlobalElements`, анонимные типы, наследование, группы, атрибуты и перечисления.
  Имена резервируются до обхода полей — иначе ссылки расходились. Вывод: JSON
  каталог (~9 МБ) и `.d.ts` (~6,6 МБ, 8720 определений, 33 namespace). Валидность
  `.d.ts` проверена отдельно: `tsc --skipLibCheck false` — 0 ошибок.
- **Скрипт.** `csms-api/scripts/generate-schema-docs.ps1` берёт версию/id/SHA из
  `.manifest.json`, собирает генератор и пишет в `csms/public/eis-schemas/catalog.json`
  и `csms/src/services/Eis/generated/eisSchemas.generated.d.ts`. Файл сохранён с
  BOM (требование PowerShell 5.1 из `csms-api/AGENTS.md`).
- **Фронтенд.** `src/services/Eis/eisSchemaCatalog.ts` (React Query, читает
  статический каталог из `public/`), `EisSchemaExplorerPage.tsx/.module.scss`,
  роут `/eis/schemas` в `App.tsx`, пункт меню «Схемы ЕИС» в `Header.tsx`. Есть
  поиск по имени/полю/описанию, фильтры по namespace и виду, постраничная выдача
  по 100 и карточка типа с полями/обязательностью. Проверено в браузере: 8720
  типов в шапке, поиск «Contract» → 2407 совпадений, карточка с 5 полями и
  русскими описаниями, консоль без ошибок.
- **Проверки:** `dotnet build` генератора — 0/0; `npx tsc -b` — только чужая
  ошибка `GeneralInfoSection.tsx:10` (`PLACING_WAYS_ALL`, WIP); `npx oxlint src`
  — 0 ошибок; `npx vite build` — успешно. `.d.ts` в composition не бандлится,
  но доступен для `import type` через `@/services/Eis/generated`.
- 🟡 **Граница:** обозреватель показывает формат, но не собирает XML. Для
  исполнения контракта и СМП нужен альбом ТФФ по 658/215н и 918; `PlaceholderXmlBuilder`
  остаётся `placeholder-v0`. Живой SOAP-обмен по-прежнему заблокирован TLS (§26).

## 31. Доменные типы сквозной цепочки и карта XSD ЕИС (2026-11-19)

Продолжение §30, по договорённости с основным агентом: наши модели цепочки
**ПГ → извещение → контракт → СМП** лежат отдельно от сгенерированных
ЕИС-типов. `src/services/Eis/generated/**` и `public/eis-schemas/catalog.json`
не редактируются вручную — их создаёт
`csms-api/scripts/generate-schema-docs.ps1`.

- **Файлы:** `src/services/Eis/types/eisChain.ts` (модели),
  `eisChainBuilder.ts` (сборка, проверки, сохранение номеров),
  `eisXsdCoverage.ts` (карта соответствия XSD), `index.ts` (реэкспорт).
- **Ключи связи:** `purchaseNumber` (номер закупки в ПГ, до 4 цифр), `ikz`
  (36 разрядов), `localId` (id нашей записи). Номера ЕИС
  (`noticeNumber`, `contractRegistryNumber`) — nullable: их присваивает портал
  после размещения. `applyEisIdentifiers(chain, stage, patch)` записывает
  полученные номера в звенья и пересчитывает проверки/прогресс, не мутируя
  входную цепочку.
- **Сборка:** `buildEisChains({ plans, notices, contracts, smpRecords })` идёт
  по позициям ПГ, затем добавляет «сирот» — извещение без позиции ПГ, контракт
  без извещения, сведения СМП без контракта. Сироты не теряются молча: в
  цепочке остаётся разрыв с предупреждением. Поиск — `findEisChain` по любому
  из идентификаторов.
- **Проверки:** `eisChainIssues` — нет ИКЗ (error), ИКЗ не 36 цифр, нет номера
  закупки, извещение не создано/не размещено, контракт не заключён/не в
  реестре, требование СМП не закрыто, недобор объёма, записи не приняты, нет
  ИНН или ОКПД2. `eisChainProgress` — 4 шага (план, извещение, контракт, СМП).
- **Карта XSD:** `EIS_XSD_COVERAGE` (снимок 17.0) — `ContractRegistryItem` ↔
  `zfcs_contract2015Type` (IntegrationTypes.xsd:15708), `ContractSmpRecord` ↔
  `subContractorsnfo` (IntegrationCETypes.xsd:1356) +
  `zfcs_contract2015SubContractInfoType`, `ContractPayment` ↔ `payDocumentInfo`
  (IntegrationCETypes.xsd:76), `ContractDelivery` ↔ `docAcceptanceInfo`,
  `ContractStage` ↔ `stagetInfoType`, `SmnpReport` ↔
  `zfcs_customerReportSmallScaleBusinessType`, `PurchasePlan` ↔
  `zfcs_purchasePlanType` (IntegrationTypes.xsd:63286),
  `PurchasePlanPosition` ↔ `zfcs_purchasePlanPositionType`
  (IntegrationTypes.xsd:63862), `NoticeInfoFormValues` ↔
  `zfcs_purchaseNotificationType` + `zfcs_notificationEFType`
  (IntegrationTypes.xsd:43525), `ContractProject` ↔ `contractProjectType`
  (IntegrationCPTypes.xsd:6150, через `contractProjectCommonType`). По ПГ и извещению совпадает базовый контур
  (ИКЗ, номер закупки, НМЦК, ОКПД2, суммы по годам, способ, ЭТП, сроки подачи,
  обеспечения), но не хватает КТРУ, срока и периодичности закупки,
  цели/обоснования, структурированных этапов и отдельных блоков требований к
  участникам. Статусы полей: `mapped` / `partial` / `missing` / `derived`;
  номера строк — подсказка, при обновлении Альбома сдвинутся.
- **Шапка плана и поля ПГ (расширено).** В `PurchasePlan` добавлены
  `planPeriod` (firstYear/secondYear), отдельный `approveDate` (XSD различает
  `confirmDate` и `approveDate`), `customerInfo` с ОКОПФ/ОКФС/ОКТМО,
  `responsibleContactInfo`, `specialPurchases` (Tasks 5), `outcomeIndicators`
  и `versionNumber`. В `PurchasePlanPosition` отмечены обязательные по XSD, но
  отсутствующие у нас поля: `KVRInfo/code`, блок `execution` (term и/или
  periodicity), `basementInfo`; добавлены `IKU`, `extNumber`,
  `tenderPlanPurchaseNumber` (ЕИС ставит `'000'`), `complexityInfo`,
  `publicDiscussionPhase1Num`, `positionCanceled`, `positionModification`;
  `kbkEntries` уточнён как `KBKInfo = KBK + KBKYearsInfo`.
- **Проект контракта и выгрузка в ЕИС.** В `ContractProjectSchema` добавлен
  блок `eisInfo` (`ContractEisInfoSchema`) — снимок полей `contractProjectType`,
  которых нет в тексте контракта: `purchaseNumber`, протокол-основание
  (`protocolName/Number/PublishDate`), `etpName/etpUrl`, `placingWayCode`,
  `placerRole`, `isStructuredForm`, `isContractPriceFormula`,
  `quantityUndefined`, `appNumber`, `concludeContractRight`,
  `conclusionContractSt95Ch17_1`, `changePrice/changePriceFoundation`.
  `buildContractProjectDraft` заполняет из извещения номер закупки, способ,
  ЭТП, формулу цены, неопределённый объём и роль размещающего; протокол и
  номер заявки остаются на этап процедуры. Блок имеет `.default()`, поэтому
  старые записи читаются без миграции. Пробелы по цепочке ПГ → СЗ → извещение:
  протокол-основание, номер заявки, структурированная форма, изменение цены и
  файлы проекта контракта.
- **Визуальный чек-лист:** модалка «Покрытие XSD» в шапке
  (`src/components/Eis/EisCoverageModal.tsx` + `.module.scss`) читает
  `EIS_XSD_COVERAGE`, показывает табы по типам (план закупок → ПГ → извещение
  → проект контракта → контракт → СМП → оплата → приёмка → этапы → отчёт СМП),
  сводку по статусам
  и таблицу полей с пометками «обяз./опц.». Колонки: «Наше поле», «XSD»,
  «Что написано рядом», «Статус», «Что это значит» (наш комментарий `note`).
  Отдельного маршрута нет — открывается из хэдера и не уводит со страницы;
  `/eis/schemas` остаётся обозревателем XSD.
- **«Что написано рядом» у всех полей.** Цитаты не копируются в карту:
  `eisXsdDocs.ts` резолвит путь `xsd` по `xsdType` в каталоге
  `public/eis-schemas/catalog.json` и берёт `documentation` поля (индекс
  строится один раз на ответ react-query через `WeakMap`). Приоритет — ручной
  `EisFieldCoverage.xsdDoc`; составные пути (`a + b`, `a / b`, варианты в
  скобках) не резолвятся. Каталог грузится при открытии модалки; у полей без
  `documentation` в XSD колонка остаётся пустой. Модалка использует
  `useEisSchemaCatalog`, поэтому описания не дублируются в исходниках.
- **Граница:** это не генератор XML и не замена C#-мапперу. `import type` из
  `../generated` допустим только в адаптерах; наши DTO остаются источником
  истины. Для исполнения контракта и СМП по-прежнему нужен альбом ТФФ
  (658/215н и 918).
- **Проверки:** `npx tsc -b` — наших ошибок нет (падает только чужой WIP
  `GeneralInfoSection.tsx`); `npx oxlint` по нашим файлам — 0 ошибок
  (1 старое предупреждение `no-empty-pattern` в `Header.tsx`); `npx vite build`
  — успешно. Визуальный смоук: кнопка «Покрытие XSD» открывает модалку, табы
  переключаются; «План закупок» — 19 полей (4/5/8/2), ПГ — 33 поля (10/8/13/2),
  извещение — 37 полей (19/16/1/1), консоль без ошибок.

## 32. Справочники НСИ на бэке: ОКПД2, КТРУ, адреса — Tasks 16 (2026-11-19)

Работа в **`D:\Свои проекты\CSMS\csms-api`**. Задача для фронта зафиксирована в
`CurrentTasks.md` (Tasks 16), подробный контракт для агента-парсера —
`csms-api/docs/tasks/reference-data.md`. Фронт затронут только индикатором в
шапке (см. ниже); сами справочники и хуки не переключались.

- **Ответ на вопрос про XSD.** В Альбоме 17.0 есть только структуры НСИ, но не
  сами значения: `nsiOKPD2List`, `nsiOKPD2RequirementList`, `nsiKTRUs`,
  `nsiKLADRList`, `nsiOKTMOList` в `fcsExport.xsd`; типы `zfcs_nsiOKPD2Type`,
  `zfcs_nsiKTRUType`, `zfcs_nsiKLADRType`, `zfcs_nsiOKPD2RequirementType` в
  `IntegrationTypes.xsd`. Сами значения приходят архивами через `getNsiRequest`
  (`getDocsIP-ws-api.xsd` line 687+: `index{id,createDateTime,mode=PROD|TEST}`,
  `selectionParams{nsiCode44 из nsiAllList, nsiKind=all|inc}`, ответ
  `nsiArchiveInfo/archiveUrl`). Шаблон по XSD — `csms-api/docs/eis-nsi-soap.md`.
  Парсер официальных документов (ОК 034-2014, КТРУ, КЛАДР/ГАР/ФИАС, ПП № 1875) —
  fallback. FTP закрыт с 01.01.2025, SOAP требует токен (см. границу ниже).
- **Хранилище.** `ref.datasets` (код, версия, источник, URL, SHA-256, даты
  публикации/импорта, счётчик, хеш, `isActive`) и `ref.items` (код, родитель,
  имя, `actual`, полный `jsonb` исходного объекта). Старые версии остаются;
  уникальный фильтр допускает ровно одну активную версию на справочник; импорт
  публикует версию в транзакции. `EIS_STORE=postgres` → `EfCoreReferenceDataStore`,
  по умолчанию `memory` → `InMemoryReferenceDataStore`.
- **API.** `GET /api/references/datasets`, `GET /api/references/{dataset}/items`
  (`search`, `parentCode`, `take`), `POST /api/references/import`,
  `GET /api/references/events` (SSE `ready` + `references-updated` с
  `fromVersion`/`toVersion`/`hash`). payload отдаётся в ответе строкой
  `payloadJson`; нормализатор умеет доставать `code` из вложенного `OKPD2/code`
  КТРУ и булево `actual`.
- **Проверки.** `dotnet build` — 0 ошибок; `dotnet test` — 39 пройдено,
  2 пропущены без `EIS_TEST_DB`; миграция `AddReferenceDatasets` применена к
  postgres на 5433; живой прогон с `EIS_STORE=postgres`: импорт `nsiOKPD2` →
  поиск по коду → список наборов — зелёный; SSE отдельно проверен на `ready` и
  `references-updated`. `scripts/smoke.ps1` — 14/14.
- **Живой источник найден и использован (2026-11-19).** Публичное дерево НСИ на
  официальном сайте ЕИС: `GET https://zakupki.gov.ru/epz/nsi/okpd2/children.html?parentId=0`
  и дальше `?parentId=<key>` для каждой папки (тот же вызов, что делает карточка
  закупки). `EisNsiTreeImporter` обходит дерево вширь (8 потоков, предел 12
  уровней / 50 000 узлов), хранит полный JSON узла в `payload`, версия =
  `eis-nsiOKPD2-<16 hex SHA-256 канонического снимка>`.
  Новый endpoint: `POST /api/references/import/eis/{dataset}?dryRun=true` — бэк
  сам качает ЕИС и считает версию; без `dryRun` публикует. Скрипт:
  `scripts/import-references.ps1`.
- **Реальные данные в БД.** `EIS_STORE=postgres`, база `csms_eis` (порт 5433):
  активная версия `nsiOKPD2 = eis-nsiOKPD2-7c7ee4215e3ee405`, **21 066 записей**,
  SHA-256 `7C7EE4215E3EE405D5770F00965423FD8E130CE42C482C94F9358272BBB2AB9A`,
  источник `https://zakupki.gov.ru/epz/nsi/okpd2/`. Демо `smoke-1` осталась в
  истории как неактивная. Поиск `Компьютер` и `parentCode=01` отдают реальные
  коды/имена. Повторный импорт той же версии → 400. Коммит бэка `1abbdf4`.
- **Индикатор в шапке (2026-11-19, по просьбе пользователя).** В
  `Header.tsx` добавлен `ReferenceDataBadge`: чип «Справочники ЕИС» тянет
  `GET /api/references/datasets`, показывает только активные снимки с URL
  источника и SHA-256 из 64 hex (демо `smoke-1`/`sse-*` скрыты). Клик открывает
  панель с кодом, версией, числом записей, датами, источником и префиксом хеша.
  Клиент: `src/services/Eis/referenceData.api.ts`; подписка на
  `/api/references/events` (`ready` + `references-updated`) обновляет список без
  перезагрузки страницы. Стили: `ReferenceDataBadge.module.scss`.
  Проверки: `npx oxlint src` — новых предупреждений нет; `npx vite build` —
  успешно; `npx tsc -b` — красный только на чужой WIP `GeneralInfoSection.tsx`.
- **Поиск ОКПД2 в снимке ЕИС (2026-11-19, продолжение Tasks 16).** В
  `referenceData.api.ts` добавлен `useReferenceItems(dataset, { search,
  parentCode, take }, enabled)` — клиент `GET /api/references/{dataset}/items`
  с терпимым разбором ответа (массив или конверт `items`, поля `code`, `name`,
  `parentCode`, `actual`). В `Okpd2Select` он включается, только когда локальный
  справочник `db.json` не дал совпадений по запросу (2+ символа) и не задан
  `allowedCodes`: официальные 21 066 кодов ОКПД2 становятся доступны для
  выбора. Признаки нормирования и нацрежима по-прежнему берутся из локального
  справочника, снимок НСИ отдаёт только код и наименование — поэтому
  `isNormed: false` у серверных позиций, а проверки остаются прежними.
  Без `csms-api` запрос падает с `retry: false` и форма работает как раньше.
  Проверки: `npx tsc -b` — 0 ошибок; `npx oxlint` по изменённым файлам — 0
  предупреждений; `npx vite build` — успешно. КТРУ и адреса не переключались:
  их снимков на бэке ещё нет (см. границу ниже).
- 🟡 **Граница.** КТРУ и адреса ещё не загружены. Открытый FTP
  `ftp.zakupki.gov.ru` **закрыт с 01.01.2025**: КТРУ отдаёт SOAP `getDocsIP`
  (`getNsiRequest`), но нужен персональный токен `individualPerson_token` из
  личного кабинета ЕИС через ЕСИА; анонимный `free` больше не работает. Токен
  идёт и в SOAP-запросе, и в заголовке при скачивании архива; нужны корневые
  сертификаты Минцифры и точный `nsiCode` из `nsiAllList`. Контур уточнён:
  `int44` сбрасывает TLS, работает `int.zakupki.gov.ru` (тот же WSDL). Полную
  выгрузку `all` — не чаще раза в
  сутки, обновления — `inc`. KLADR через дерево ЕИС — сотни тысяч узлов,
  отдельная потоковая выгрузка ФИАС/ГАР. `db.json` (143/6) остаётся источником
  для фронта, пока не появятся эти выгрузки. Автообновление мапперов и pp1875 —
  запрещено, только diff и вопрос человеку.
- **Уточнение способа получения (2026-11-19, от пользователя).** Заменены
  устаревшие формулировки про «SOAP закрыт» и FTP в `docs/eis-open-questions.md`
  и `docs/tasks/reference-data.md`; добавлен `docs/eis-nsi-soap.md` с шаблоном
  запроса и тегами КТРУ по XSD 17.0. Импортер по-прежнему поддерживает только
  ОКПД2 (`SupportedDatasets = ["nsiOKPD2"]`): старый ОКПД после замечания
  пользователя убран, API поднят на `http://localhost:5099`.

## 33. Автоматическая отчётность по приказу Минфина № 158н (`order158nReports`)

- **Файлы:** `src/services/Reports/order158nReport.schema.ts` (Zod-схемы и агрегатор `buildOrder158nActivityReport`, `resolveOrder158nPeriodRange`), `src/services/Reports/order158nReport.api.ts` (CRUD-хуки `useOrder158nReports`, `useCreateOrder158nReport`, `useUpdateOrder158nReport`, `useDeleteOrder158nReport`), `src/services/Reports/order158nReportExport.ts` (официальный экспорт в **PDF (`pdfmake` Roboto)** с реквизитами заказчика и грифом `УТВЕРЖДАЮ`, а также `.docx`), экран `src/components/Reports/Order158nReportsPage.tsx` + `.module.scss`, роут `/reports/order-158n`, ссылки в `Header.tsx`, `Main.tsx` и `ContractServiceView.tsx`, привязка в `legalActs` (`order-minfin-158n` -> `Order158nReportsPage`).
- **Агрегация:** формирует отчёт за год, квартал или произвольный период по живым данным организации: соответствие КС пунктам п. 2.1–2.6 и Разделу III (8 проверок с проверкой лимита 100 млн ₽ по ч. 21 ст. 38 при `contract_manager`, наличием руководителя, образованием и ДПО п. 2.5, отсутствием конфликтов отпусков/просрочек), агрегаты по всем 5 функциям Раздела III (п. 3.1–3.5: планы-графики, служебные записки и расчёты НМЦК, ООЗ с `validateOrder158nCompliance`, дефектовки 421/пр/336/пр, процедуры и ПП № 2604, проекты контрактов, реестр контрактов, оплаты, неустойки, отчёты СМП, события ЭП) и KPI/образование/отсутствия сотрудников КС (включая штат `structuralUnitId` при `creationMethod === "structural_unit"`, поле `employeeRefId` вместо `employeeId` во избежание ловушки `json-server` `getRemovable`).
- **Дополнительные хуки:** `useAllTaskEvaluations` в `taskEvaluation.api.ts`, `useAllContractPayments` и `useAllContractPenalties` в `contractRegistry.api.ts`; коллекция `order158nReports` в `db.json`.
- **Полный пул задач функций по Приказу № 158н (`src/services/Tasks/order158nTaskPool.ts`):** справочник `ORDER_158N_TASK_POOL` (41 подфункция: `п. 3.1.1–3.1.5`, `п. 3.2.1–3.2.7` включая `п. 3.2.2.1–3.2.2.3`, `п. 3.3.1–3.3.9`, `п. 3.4.1–3.4.9` включая `п. 3.4.3.1–3.4.3.3`, `п. 3.5.1–3.5.4` и `п. 2.5–2.6`), синхронизированный с `regulatoryDeadlines.ts`. `TaskSchema` дополнена `order158nPoolCode`, `order158nClause` и `legalBasis`. На `/tasks` (`TasksPage.tsx`) добавлена вкладка «Весь пул задач по Приказу № 158н» с поиском, фильтрами, ответственными КС, статистикой покрытия и кнопкой постановки задачи; в `TaskAssignModal.tsx`, `TaskDetailPage.tsx` и `MyTasks.tsx` добавлен выбор подфункции № 158н с автоподстановкой описания, нормы 44-ФЗ и регламентного срока; в `ContractServiceForm.tsx` отображаются подпункты № 158н по каждой функции.
- **Детализация жизненного цикла задач от постановки до исполнения:** `TaskSchema` дополнена `TaskExecutionStepSchema` (`id`, `order`, `stageLabel`, `title`, `detail`, `expectedArtifact`, `dueDate`, `isDone`, `completedAt`, `completedBy`, `note`), `requiredInputs`, `completionCriteria`, `startedAt` и хелпером `taskStepProgress`; в `tasks.api.ts` добавлены `startedAt`-переходы в `useUpdateTaskProgress` и хук `useUpdateTaskSteps` (автоперевод `pending` → `in_progress` при отметке первого шага). Все 41 элемент `ORDER_158N_TASK_POOL` снабжены `requiredInputs`, `completionCriteria`, 2–4-этапными маршрутами `steps` и хелперами `buildTaskStepsFromPoolItem` / `buildDefaultGenericSteps` / `recalculateStepDueDates`. В `TaskAssignModal` настраиваются входные данные, этапы с датами и критерий приёмки; в `TasksPage` — прогресс шагов в списке и раскрываемый маршрут в карточках пула; в `TaskDetailPage` — 5-стадийный индикатор жизненного цикла, условия приёмки, интерактивный чек-лист этапов с отметками/реквизитами, добавлением шагов и автозагрузкой маршрута для старых задач; в `MyTasks` — прогресс этапов, встроенный чек-лист и переход в `/tasks/:id`.

## 34. Аналитика (Recharts/D3), версионность ПГ, риски контракта, генератор документов, Document Checker и подписанный PDF-отчёт ЭП

- **Дашборды на главной (`Main.tsx`):**
  - `src/services/Dashboard/dashboardAnalytics.ts` — агрегация помесячной динамики (план ПГ, законтрактовано, оплачено, неустойки), распределения контрактов по статусам и исполнения бюджета по каждому контракту.
  - `src/components/Dashboard/ProcurementChartsDashboard.tsx` (Recharts: `ComposedChart` + `Area`/`Bar` по месяцам и `PieChart` по статусам контрактов с выбором года).
  - `src/components/Dashboard/BudgetExecutionMonitorD3.tsx` (интерактивный D3.js-монитор исполнения бюджета: горизонтальные grouped/bullet-графики План/Контракт/Факт оплачено с фильтрацией по статусу, переключением масштаба, интерактивным тултипом и карточкой детализации контракта).
- **Уведомления о сроках 44-ФЗ (`/notifications`):** `src/services/Notifications/deadlineNotifications.ts`, `notifications.api.ts` (коллекция `notificationStates` в `db.json`), `src/components/Notifications/DeadlineNotificationsPage.tsx` и лента критических уведомлений в `Main.tsx`.
- **Версионность и импорт планов-графиков:**
  - `purchasePlanVersion.schema.ts`, `.api.ts` (коллекция `purchasePlanVersions` в `db.json`), `purchasePlanDiff.ts` и `PurchasePlanVersionsModal.tsx` (сохранение черновых/утверждённых снимков, автоматическая фиксация при правке в `PurchasePlanForm`, сравнение редакций с KPI-дельтами и построчным diff, откат в черновик).
  - `purchasePlanImport.ts` и `PurchasePlanImportModal.tsx` (импорт CSV/TSV, JSON и XML ЕИС с маппингом колонок и проверкой ОКПД2/КБК).
- **Оценка рисков проекта контракта (`ContractRiskAssessmentPanel.tsx`):** `src/services/ContractProject/contractRiskAssessment.ts` — автоматическая проверка 12 правил практики 44-ФЗ / ФАС / Казначейства (ч. 13.1 ст. 34 сроки оплаты, ст. 37 антидемпинг, ст. 96 аванс и обеспечение, ПП РФ № 1042 неустойки, ст. 30 СМП и ч. 27 ст. 34 возврат обеспечения, хронология и др.) с быстрым переходом к разделу формы `ContractProjectForm.tsx`.
- **Генератор типовых документов и Document Checker (`/documents`):**
  - `src/services/ProcurementDocuments/procurementDocumentGenerator.ts` и `procurementDocumentExport.ts` — формирование приказов о создании комиссии (ст. 39 44-ФЗ), протоколов рассмотрения и оценки заявок (ст. 48–50 44-ФЗ, ПП РФ № 2604) и приказов о проведении закупки на основе карточек закупок (`Procurement`, `PurchasePlan`, `PurchaseNote`, `NoticeInfo`, `ContractService`, `BidEvaluation`) с экспортом в `.docx` и `.pdf`. Интегрировано в `ProcurementProcessing.tsx` (`btn353_create_order`, `btn_generate_docs`), `Header.tsx` и `Main.tsx`.
  - `src/services/ProcurementDocuments/documentComplianceChecker.ts` и `DocumentCheckerPanel.tsx` — сканер документов по актуальному реестру `/legalActs` (`useLegalActs()`), выявляющий пропущенные обязательные положения (`missing_clause`) и устаревшие/несоответствующие формулировки (`non_compliant_text`) с подсветкой фрагментов прямо в тексте, матрицей покрытия актов реестра и заменой/вставкой формулировок в 1 клик.
- **Подписанный PDF-отчёт Журнала ЭП (`EdsJournalPage.tsx`):**
  - `src/services/Eds/edsJournalExport.ts` и `src/components/Eds/EdsJournalSignedExportModal.tsx` — расчёт каскадной SHA-256 цепи хэшей аудит-логов (`eventsChainRootSha256`, `certificateDigestSha256`, `payloadDigestSha256`), опциональное подписание через КриптоПро плагин / реестровый штамп ЭП по 63-ФЗ, генерация официального PDF (`pdfmake` Roboto) для ФАС/Казначейства + `.integrity.json` манифеста и фиксация события `journal_pdf_export` в `edsSignatureEvents`.

## 35. Синхронизация плана-графика и извещений со схемами ЕИС 17.0 (CSMS-API)

- **Источник схем:** `https://github.com/IgorPoyarkov/CSMS-API` (`schemas/17.0/`: `IntegrationTPTypes.xsd`, `IntegrationEPTypes.xsd`, `CommonTypes.xsd`, `BaseTypes.xsd` + роуты `/api/eis/schemas/{status,catalog}`). `EIS_DOCUMENT_TYPES` в `eisPackages.schema.ts` не изменялся, так как `CSMS-API` по-прежнему поддерживает отправку только `"SmpAttraction"` и `"ContractExecution"`.
- **DTO, мапперы и XSD-контроль (`src/services/Eis/eis17Types.ts`):**
  - Перечисления и справочники ЕИС 17.0: `EIS_NOTIFICATION_TYPES` (`EF2020`, `EOK2020`, `EZK2020`, `EZT2020`, `EMZ2025`, `Cancel`), `EIS_RESPONSIBLE_ROLES` (`CU`..`CU5CH26`), `EIS_ARTICLE15_PARTS` (`P4`..`P44`), `EIS_COST_CRITERION_CODES` (`CP`/`MC`/`TC`/`EN`), `EIS_QUALITATIVE_CRITERION_CODES` (`QF`/`QO`), `EIS_PRODUCT_TYPES` (`PRODUCT`/`WORK`/`SERVICE`), статусы и решения изменения позиций ПГ (`N`/`E`, `notSpecified`/`purchaseChanged`/`purchaseCanceled`), ПФХД (`IND`/`CONS`).
  - Типизированные DTO `EisTenderPlan2020` и `EisNotification2020`, мапперы `mapPurchasePlanToEis17` / `mapNoticeInfoToEis17`, XSD-валидаторы `validatePurchasePlanEis17` / `validateNoticeInfoEis17`, генераторы XML-предпросмотра `buildTenderPlan2020XmlPreview` / `buildNotification2020XmlPreview` и хуки `useEisSchemaStatus` / `useEisSchemaCatalog` в `eisPackages.api.ts`.
- **Организация и План-график (`organization.schema.ts`, `purchasePlan.schema.ts`, `PurchasePlanForm.tsx`, `PurchasePlanPositionModal.tsx`, `PurchasePlanCard.tsx`):**
  - Расширены `OrganizationRequisitesSchema` (`regNum`, `consRegistryNum`, `okopf`, `okfs`, `oktmo`, `oktmoPpo`), `PurchasePlanSchema` (`externalId`, `ownerRole`, `pfhdType`, `planPeriodFirstYear`, `planPeriodSecondYear`, `directDate`, `createDate`, `firstVersionPublishDate`, `specialPurchases`) и `PurchasePlanPositionSchema` (`extNumber`, `iku`, `purchaseOrderNumber`, `kvr`, `ktruCode`, `ktruName`, `hasMultipleOkpd2`, `okpd2Items`, признаки энергосервиса/кредита/ОКС/нефедерального финансирования/непубликации, блок `positionModification`, детализация `kvrEntries` и `koksEntries`) с сохранением обратной совместимости существующих сидов `db.json`.
  - Исправлен `buildIdentificationCode` (полный 36-значный `ikzCodeType`: 2 год + 20 ИКУ + 4 номер закупки + 3 порядок + 4 ОКПД2/`0000` + 3 КВР/`kbk.slice(-3)`).
  - В `PurchasePlanCard.tsx` добавлена панель проверки XSD 17.0 и скачивания XML `<tenderPlan2020>`.
- **Извещения (`noticeInfo.schema.ts`, `noticeInfo.config.ts`, `NoticeInfoForm.tsx` и секции):**
  - Поддержаны подспособы `EZT20` / `EMZ2025`, типы извещения, `responsibleRole`, `specializedOrg*`, `article15Features`, `isGOZ`, `notPublishedOnEIS`, `isBudgetUnionState`, `is449Features`, `serviceSigns` (`isIncludeKOKS`, `isControlP1Ch5St99`), `modificationInfo`/`cancelReasonInfo`, даты процедуры (`collectingStartDT`, `firstPartsDate`, `submissionProcedureDate`, `biddingDate`), `relativeAndNotRelativeTerms2022Type` (`startDayType`/`termDayType` C/W, `startDate`/`endDate`, `isFromConclusionDate`, `isNotEarlierConclusionDate`), КЖЦ-цены, `oksmCode`/`garGuid` ГАР мест поставки, позиции объекта закупки (`isStructuredForm`, `productType`, `ktruCode`, `okeiCode`, `volumeSpecifyingMethod`, `isMedicalProduct`, `isSoftware`, `imposibilityBan`), коды критериев XSD и панель проверки/скачивания XML `<notification*>`.

## 36. Роли и доступы в полном бэкенд-контуре `csms-api` (2026-11-19)

- **Выбор пользователя:** переносим роли/доступы из `db.json` именно в API (PostgreSQL), а не только в фронтовый слой. В `csms-api` добавлена доменная область доступа с нуля (Identity/JWT там не было): `access.organizations`, `access.users`, `access.employees`, `access.contract_services`, `access.functions`, `access.requests`, `access.roles`, `access.permissions`, `access.role_permissions`, `access.user_roles`, `access.sessions` (миграция `20261119190821_AddAccessDomain`, применена к локальному кластеру 5433).
- **Сервер владеет правилами:** `AccessService.BuildProfile` повторяет проверки прежнего `useMyContractRole` (состав КС по приказу № 158н, structural_unit, функции 3.1–3.3 для СЗ, 3.1/3.4/3.5 для КБК) и возвращает готовый профиль. Пароли хешируются PBKDF2 на сервере, сессии — случайные токены в `access.sessions` (TTL 12 ч). Права «администратор/кадровик» задаются явными записями `access.user_roles`, остальные роли выводятся из утверждённого состава КС.
- **Контракт API:** `POST /api/access/login`, `GET /api/access/me`, `POST /api/access/logout`, `GET /api/access/roles`, `GET /api/access/permissions`, `PUT /api/access/users/{userKey}/roles`, `POST /api/access/import`. `EIS_STORE=postgres` выбирает `EfCoreAccessStore`, иначе `InMemoryAccessStore`. Общий `DomainExceptionHandler` теперь отдаёт нейтральный заголовок ProblemDetails (раньше был «…состоянии пакета», что врало для доступа).
- **Импорт сидов:** `csms-api/scripts/import-access.ps1` читает `../csms/db.json` и отправляет пользователей, организации, сотрудников, КС, функции и заявки в `/api/access/import`. Локально импортировано: 6 пользователей, 40 сотрудников, 6 организаций, 4 КС. `test1@test.test` назначен администратором через параметр `-AdministratorEmail`.
- **Переключение фронта:** `src/services/Access/access.api.ts` (axios на `VITE_ACCESS_API_URL || VITE_EIS_API_URL || http://localhost:5099`, токен в `localStorage.csms_access_token`, Zod-профиль). `user.api.ts` логинится через API и только при недоступности сервиса падает на json-server; `useMyContractRole` при наличии сессии берёт готовый профиль и приводит `myRole` к строке состава (поля `role`, `position`, `functions` сохранены). Компоненты не переписывались.
- **Проверки:** `dotnet build` — 0 ошибок; `dotnet test` — 52 пройдено, 0 пропущено при `EIS_TEST_DB` (без него 2 postgres-теста пропускаются); живой `/api/access/login` → `/api/access/me` работает на 5099, неверный пароль — 409, без токена — 401. Фронт: `npx tsc -b` — 0 ошибок, `npx oxlint src` — без ошибок, `npx vite build` — успешно.
- **Очередь:** забыть старый токен из публичной истории git и получить в ЕИС токен именно для сервисов отдачи 44-ФЗ; подтвердить `nsiCode` через `nsiAllList` и повторить импорт КТРУ (`--dry-run`, затем полный), заменить демо `nsiKTRU / sse-073720`. Расширить CRUD-эндпоинты доступа, если понадобится редактирование пользователей/организаций из интерфейса (сейчас есть только импорт и назначение ролей).

## 37. Ст. 28 и 29: преимущества только по ОКПД2, без привязки к НМЦК (2026-11-19)

- **Причина:** в `src/services/Okpd2Ref/smpControl.ts` преимущества для организаций инвалидов (ст. 29) и учреждений УИС (ст. 28) вычислялись как `НМЦК ≤ 5 млн руб.`. Это неверно: ст. 28/29 применяются по перечням товаров (ОКПД2), а не по размеру НМЦК.
- **Что убрано:** константа `SMALL_LIMIT`, поля `disabledOrgAdvantage` / `penalSystemAdvantage` в `SmpCheckResult`, подсказки «НМЦК ≤ 5 млн руб.: ст. 28/29…», функции `isDisabledOrgAdvantageApplicable` / `isPenalSystemAdvantageApplicable`. В `PurchaseNoteModal.tsx` удалены соответствующие блоки предупреждений.
- **Что осталось:** ограничения ч. 2.1/ч. 3 ст. 30 по НМЦК (20 млн до 2027, 30 млн с 01.01.2027 — до этой даты действует порог 20 млн) и проверка смешивания перечней ОКПД2 (`validateSmpMixing`). Перечни преимуществ ст. 28/29 — отдельные НПА, их сверка с ОКПД2 остаётся задачей справочника.
- **Нацрежим по работам и услугам (2026-11-19, по просьбе пользователя):**
  подсказка «"Преимущество" недоступно: применяется только к товарам (не к
  работам и услугам)» убрана из `PurchaseObjectsSection.tsx` (извещение) и
  `PurchaseNoteModal.tsx` (служебная записка) — по работам и услугам ничего не
  выводится. Сообщение о недоступности осталось только для случая, когда по
  коду обязательны запрет или ограничение (там это действительно ошибка
  выбора режима).
- **Проверки:** `npx tsc -b` — 0 ошибок; `npx oxlint` по изменённым файлам — 0 ошибок (4 старых `exhaustive-deps` в `PurchaseNoteModal`); `npx vite build` — успешно.

## 38. Агент разметки правил НПА по ОКПД2 (2026-11-20, `csms-api`)

- **Зачем:** автоматически проставить правила по актам 471-р, 1875, 2604 в
  справочник из 21 066 кодов ОКПД2, включая позиции, где в акте названо только
  наименование. Источник текста — только `publication.pravo.gov.ru`; спорные
  строки уходят человеку, а не «угадываются».
- **Где:** `src/Csms.Infrastructure/Npa/` (портал, рендер PDF через Docnet,
  OCR Tesseract rus в двух проекциях, разложка таблицы, резолвер кодов по
  активному `nsiOKPD2`, классификатор, билдер, дерево наследования, синк и
  воркер), `src/Csms.Api/NpaEndpoints.cs`, `NpaSyncWorker.cs`, хранилища
  `EfCoreNpaRuleStore`/`InMemoryNpaRuleStore`, таблицы `ref.npa_documents` и
  `ref.npa_rules` (миграция `20261119203230_AddNpaRules`, индекс
  `text_pattern_ops`). Бриф — `csms-api/docs/tasks/npa-rules.md`.
- **Правила игры:** код принимается только при наличии в активном справочнике
  ОКПД2 (восстановление `262011110` → `26.20.11.110` — лишь однозначно);
  самый длинный префикс побеждает, исключение сильнее включения предка;
  унаследованные правила материализуются. Явные «кроме кодов …» (в том числе
  с переносом на следующую строку OCR и обрывками в `unresolvedJson`) дают
  `exclude`; «кроме мебели», «кроме танкеров» внутри наименования — уточнение
  `include`. Одиночный явный код из неразобранной строки — `include` +
  `needs_review`. Неявные коды — `conditional` +
  `needs_review`. Версии не перезаписываются (`force` даёт `-r2`, `-r3`, …),
  публикация атомарна; LLM по умолчанию выключена и пока не реализована.
- **API:** `/api/npa/config|documents|documents/{code}/rules|effective|sync|upload`
  и `/verify` (решение человека `approved`/`rejected`/`needs_review`).
- **Живой результат:** 471-р — версия `pravo-0001201603230014-r7`, 17 215
  правил (107 прямых, 13 `needs_review`), 7 страниц, 88 неразобранных (`unresolvedJson` в
  ответе документа). r6 добавил 7 исключений из обрывков оговорок: `01.4`,
  `01.7`, `26.60.11.114`, `26.60.11.119`, `26.60.12.129`, `53.20.11.190`,
  `68.31.16`; r7 добавил `66.12.11` (`needs_review`), потерь нет. 2604 —
  `pravo-0001202201040005-r2`, 12 499 правил (58 прямых), 32 страницы,
  387 неразобранных. 1875 — `pravo-0001202412250018-r2`, 18 770 правил
  (973 прямых: 170 `exclude`, 148 `needs_review`), 145 страниц,
  1 503 неразобранных. Ложные исключения из «кроме танкеров/машин» не попали
  в правила (`30.11.23`, `25.71.11`, `26.51.33.131` и др. — `include`).
  Все три акта переразобраны одной сборкой (64 теста).
- **Проверки:** `dotnet build src/Csms.Api` — 0 ошибок/0 предупреждений;
  `EIS_TEST_DB=… dotnet test tests/Csms.Tests` — 64 пройдено. Живой force-sync
  471-р на PostgreSQL 5433 через API на 5099 — `published`, `r7`.
- **Очередь:** ручной разбор оставшихся `unresolved` (88 / 1 503 / 387);
  `auctionListControl.ts` — устаревший эталон (ред. 31.10.2022), не источник
  для агента (фронт теперь читает правила НПА, см. §40); токен ЕИС из публичной
  истории git (`eecaca5`) подлежит отзыву.

## 39. Позиция плана-графика и особые закупки по XSD 17.0 (2026-11-19)

- **Позиция ПГ — страница, а не модалка** (`PurchasePlanPositionForm.tsx`,
  роут `/purchase-plans/:id/positions/:positionId/edit`): карточка повторяет
  форму просмотра ПГ в ЛК ЕИС «Общие сведения позиции» — заголовок с номером
  плана-графика и заказчиком, таблица «Сведения о закупке», «Информация об
  объекте закупки», таблица объёма финансового обеспечения с графами «Всего /
  Сумма на 2026 / 2027 / 2028 / последующие годы», таблица детализации по КБК
  (Глава, Раздел (подраздел), Целевая статья, Вид расходов + итоговая строка
  «Итого по кодам бюджетной классификации»), КОКС, признаки и изменения.
  `PurchasePlanPositionModal.tsx` и его модуль удалены, `CustomModal` больше
  не используется.
  - уникальный номер — только для чтения, «сформируется при сохранении»;
  - год размещения — селект `placementYearOptions(CURRENT_YEAR)` (текущий…+10),
    текущий год вынесен в модульную константу `CURRENT_YEAR` (правило
    react(purity) не даёт вызывать `Date` в рендере);
  - номер закупки — поле ввода (селект свободных номеров убран); проверка
    `isPurchaseNumberTaken` не даёт занять чужой номер, ошибка выводится
    прямо под полем;
  - уполномоченный орган и организатор совместной закупки включаются
    кастомными селектами «Да/Нет» (`CustomSelect`, `hasAuthorizedBody` /
    `hasJointOrganizer`), при «Да» показывается `CustomSelect` с поиском по
    организации; скрытые значения в `onSubmit` очищаются;
  - три признака ЕИС (энергосервис, кредит на обеспечение, ОКС) работают как
    радио: `setExclusiveFlag` включает один и сбрасывает два других;
    `notPublishedOnEIS` («информация, не подлежащая размещению») от них не
    зависит;
  - КБК разложен на разряды (`splitKbk` / `buildKbk`): глава 3, раздел и
    подраздел 4, целевая статья 10, вид расходов 3; для вида расходов работает
    `datalist` из `kvrOptions`;
  - КОКС — кнопка «Выбрать из справочника» открывает `KoksPickerModal`
    (`useKoksDictionary`, поиск по коду/наименованию), выбранное имя
    показывается подсказкой;
  - общественное обсуждение ст. 20 — селект `publicDiscussionOptions`;
  - обоснование изменений: селект `tpChangeReasonOptions`, решение —
    радио «Изменение / Отмена закупки», содержание — `textarea`;
  - подписи сумм — «2026 год / 2027 год / 2028 год / последующие годы» от года
    формирования ПГ (`baseYear`).
- **Ревизия карточки позиции (2026-11-20, по списку пользователя).** Из
  карточки убраны служебные и дублирующие графы: ИКУ заказчика (берётся
  сохранённый `iku` или собирается из ИНН/КПП), селект номера закупки
  (осталось поле ввода с проверкой), «Порядковый номер закупки» (считается
  только для ИКЗ), отдельный КВР (последние 3 разряда КБК), КТРУ-поля,
  «Наименование по ОКПД2» (оно есть в выбранном коде), «Статус записи» и
  «Дата размещения записи», «Статус при передаче изменений» — он определяется
  действием: `modificationStatus: isNew ? "N" : "E"` в `onSubmit`.
  - ОКПД2 перенесён в блок «Информация об объекте закупки» на всю ширину,
    выбор кода подставляет наименование в «Наименование объекта закупки»
    (`textarea` на всю ширину, правится заказчиком);
  - выдача ОКПД2 сортируется по возрастанию кода (`compareOkpd2ByCode`,
    `localeCompare` с `numeric: true`) — и локальный словарь, и снимок ЕИС;
  - «Объем финансового обеспечения» и детализация по КБК/КОКС объединены в
    один раздел: КБК и КОКС — подблоки `__subblock` с заголовками `__subtitle`;
  - разряды ИКЗ в таблице заблокированы (`disabled`), но остаются читаемыми;
  - блок изменений (`positionModification` / `decision` / описание) показывается
    только при `!isNew`.
- **Вторая порция правок карточки позиции (2026-11-20).**
  - шапка оставлена только с кнопкой «К плану-графику» и номером плана-графика:
    подпись «Общие сведения позиции» и строка заказчика убраны;
  - таблица разрядов ИКЗ перенесена сразу под уникальный номер позиции; из неё
    убрана итоговая графа «Идентификационный код закупки» — показываются шесть
    разрядов (год, ИКУ, номер закупки, порядковый, ОКПД2, КВР);
  - поле «Год (планируемый год размещения извещения)» убрано из интерфейса;
    для ИКЗ берётся сохранённый `plannedPlacementYear` или `plan.planYear`;
  - «Номер закупки, включенной в план-график» — поле ввода с `maxLength={4}`;
    схема `purchaseNumber` (`^\d{1,4}$`) даёт ошибку «не более 9999»;
  - поле «Внешний номер позиции (extNumber)» убрано; в `onSubmit` при создании
    подставляется `plan.planNumber` (это и есть номер плана-графика);
  - чекбокс `hasMultipleOkpd2` заменён кнопкой «Добавить код ОКПД2»: каждый
    дополнительный код — отдельный `Okpd2Select` в `okpd2Items`, набор
    сохраняется массивом (склейка для бэка), в ИКЗ при нескольких кодах — «0000»;
    подсказка про «0000» удалена;
  - детализация по КБК: по умолчанию одна строка, разряды вводятся обычными
    `register`-полями (раньше вторая и следующие строки не заполнялись);
    кнопка «Добавить КБК» стоит под последней строкой внутри таблицы; вторая
    строка заголовков без «рублей»; графа «Действие»; ширины разрядов заданы
    `colgroup` (`__col--chapter/section/target/expense/action`);
  - у первой графы «Планируемые платежи, рублей» рамка как у соседних
    (`__th--first`);
  - «Есть уполномоченный орган (учреждение)» и «Есть организатор совместной
    закупки» снова чекбоксы (`hasAuthorizedBody` / `hasJointOrganizer`), при
    включении — `CustomSelect` с поиском по организации;
  - КОКС: подписи выводятся в каждой строке (у последующих — неразрывный
    пробел), `align-items: start` — код и суммы стоят на одной линии.
  - Проверки: `npx.cmd tsc -b` — 0 ошибок; `npx.cmd oxlint` по
    `PurchasePlan`/`UI/Okpd2Select` — 0 ошибок (прежние предупреждения в
    `PurchasePlanForm.tsx`); `npx.cmd vite build` — `BUILD_OK`.
- **Третья порция: компоновка карточки (2026-11-20).**
  - блок «Признаки ЕИС 17.0 и изменения» расформирован: уполномоченный орган и
    организатор совместной закупки стоят в «Сведениях о закупке» над номером
    закупки; обязательное общественное обсуждение и блок изменений — там же;
    пять чекбоксов (энергосервис, кредит, ОКС, нефедеральное финансирование,
    «не подлежит размещению») — под «Наименованием объекта закупки»;
  - «Номер закупки» больше не занимает всю строку (`cell`, не `wide`);
  - ширины граф ИКЗ заданы `colgroup` пропорционально числу символов разряда
    (2 / 20 / 4 / 3 / 4 / 3 → 6 / 52 / 12 / 9 / 12 / 9 %), таблица —
    `table-layout: fixed`;
  - `CustomSelect`: длинные наименования в пунктах списка переносятся
    (`custom-select__item-text`, `overflow-wrap: anywhere`), у пункта появился
    `title` с полным текстом — названия уполномоченных органов больше не
    обрезаются и не вылезают за границы.
  - Проверки: `tsc -b`, `oxlint`, `vite build` — без ошибок.
  - **Проверено вживую** (вход `test1@test.test`, план `202603770123450001`,
  позиция № 1): после первой сборки шапка таблицы ИКЗ из-за `table-layout:
  fixed` и процентных ширин раздувалась на 4 строки. Исправлено: ширины
  колонок заданы в `ch` (6 / 22 / 8 / 8 / 8 / 8), шапка и значения —
  `white-space: nowrap`, при нехватке места работает горизонтальная прокрутка
  `table-wrap`, а не рост высоты. Остальные блоки (суммы, КБК с двумя
  строками, чекбоксы под наименованием, органы над номером закупки, блок
  изменений) отрисовались как задумано.
- **Особые закупки** — вкладка в `PurchasePlanCard.tsx`
  («Записи плана-графика» / «Особые закупки»), компонент
  `PurchasePlanSpecialPurchases.tsx`: таблица позиций по
  `tenderPlan2020SpecialPurchasePositionType` (IntegrationTPTypes.xsd) — тип
  из `nsiSpecialPurchases2020`, ИКЗ/ИКУ, реестровый номер позиции, год, номер
  закупки, КВР/КБК/КОКС, суммы по годам, статус изменения N/E. Список
  сохраняется кнопкой через `useUpdatePurchasePlan`. Коды типов не
  выдумываются: подсказка datalist строится из уже введённых в плане типов.
- **Модель** (`purchasePlan.schema.ts`): `PurchasePlanSpecialPurchaseSchema`
  расширена `iku`, `positionNumber`, `extNumber`, `kbk`, `koksCode`,
  `modificationStatus`; добавлен `emptyPurchasePlanSpecialPurchase(planYear)`.
  Все новые поля необязательные — старые записи `db.json` читаются без
  миграции. `eis17Types.ts` переносит их в `EisTenderPlan2020SpecialPurchase`;
  карта покрытия (`eisXsdCoverage.ts`) переведена с `missing` на `partial` с
  путём `specialPurchasePositions/specialPurchasePosition`.
  - **`typeCode` особой закупки необязателен при чтении (2026-11-20).**
    Добавленная, но не заполненная строка (пустой `typeCode`) роняла загрузку
    всех планов-графиков: `PurchasePlanSchema` не проходила. Теперь
    `typeCode` — `optionalText(1)`, а требование кода перенесено в
    `validatePurchasePlanEis17` (ошибка при выгрузке в ЕИС); в маппере DTO
    отдаётся `typeCode ?? ""`. Кнопка «Сохранить особые закупки» отбрасывает
    строки без кода, чтобы пустышки не копились в записи плана.
- **Проверки:** `npx.cmd tsc -b` — 0 ошибок; `npx.cmd oxlint` по
  `PurchasePlan`/`Eis` — 0 ошибок (остались только прежние предупреждения в
  `PurchasePlanForm.tsx`); `npx.cmd vite build` — успешно.
- **Замечание по синхронизации:** в рабочем дереве лежал чужой §38 (агент НПА,
  2026-11-20); он закоммичен вместе с этим разделом, чтобы не потерять
  документацию. Справочник `src/services/KoksRef/` — наш, вошёл в коммит
  (в §38 он ошибочно назван чужой WIP).
- **ИКЗ — приказ Минфина России от 10.04.2019 № 55н (2026-11-19, по
  замечанию пользователя).** Состав разрядов ИКЗ задаёт Порядок формирования
  идентификационного кода закупки (приказ № 55н), а XSD ЕИС 17.0
  (`ikzCodeType`) закрепляет только формат `^\d{36}$`. В
  `purchasePlan.schema.ts` добавлена константа `IKZ_ORDER_REFERENCE`,
  исправлено сообщение валидатора и комментарий `buildIdentificationCode`;
  в карточке позиции под кнопкой формирования ИКЗ выводится ссылка на 55н;
  в `eis17Types.ts` ошибки по ИКЗ ссылаются на 55н; в `NoticeInfoForm.tsx`
  поправлен комментарий `deriveIkzParts` — 2 год + 20 ИКУ + 4 номер закупки +
  3 порядковый + 4 ОКПД2 + 3 КВР (раньше «номер плана-графика» был назван
  неверно). Уникальный номер позиции (24 знака) к 55н не относится — это
  реестровый номер позиции ПГ.
- **Структура уникального номера позиции (2026-11-19, по уточнению
  пользователя).** 24-значный номер — производная от реестрового номера
  плана-графика: первые 18 цифр — номер ПГ (год формирования 4 + уникальный
  учётный номер заказчика в сводном реестре/СПЗ 11 + порядковый номер плана
  этого заказчика на год 3), последние 6 цифр — внутренний номер позиции,
  который ЕИС присваивает при создании строки и не меняет при редактировании.
  В `purchasePlan.schema.ts` добавлены `PLAN_REGISTRY_NUMBER_LENGTH = 18`,
  `POSITION_UNIQUE_NUMBER_LENGTH = 24`, `splitPlanRegistryNumber`,
  `isPlanRegistryNumber`, `isPositionUniqueNumber`; `buildPositionUniqueNumber`
  обрезает порядковый номер до 6 цифр; сообщения схемы `planNumber` и
  `uniqueNumber` объясняют разрядность. В карточке позиции под уникальным
  номером выведена расшифровка. `validatePurchasePlanEis17` теперь даёт
  ошибку, если номер плана-графика не 18 цифр или уникальный номер позиции
  не 24 цифры (`tenderPlan2020PositonNumberType` — `xs:length=24`);
  карта покрытия `uniqueNumber → commonInfo/positionNumber` переведена в
  `mapped`. ⚠️ В текущем `db.json` у трёх из четырёх планов номер длиной
  20 цифр (сиды), поэтому в панели «Проверка ЕИС 17.0» по ним появятся
  ошибки — это корректное отражение неверных данных, `db.json` не правился.
- **Поле уникального номера в карточке позиции (2026-11-19, по просьбе
  пользователя).** Заказчик номер не вводит и не редактирует: вместо input
  выводится текст номера (моноширинно) или надпись «Будет сформирован при
  первом сохранении позиции». Сам номер собирает система в `onSubmit` через
  `buildPositionUniqueNumber(plan.planNumber, serialNumber)` и отправляет в
  XSD как `commonInfo/positionNumber`; при редактировании существующей
  позиции значение не пересобирается.
- **Таблица ИКЗ в карточке позиции (2026-11-19, по просьбе пользователя).**
  Вместо ручного ввода ИКЗ и кнопки «Сформировать» выводится таблица разрядов
  как в форме ЕИС: Год (2) · Идентификационный код заказчика (20) · Номер
  закупки, включенной в план-график (4) · Порядковый номер закупки (3) · Код
  позиции ОКПД2 (4) · Код вида расходов (3) · ИКЗ (36). Все ячейки
  предзаполнены и не редактируются. В `purchasePlan.schema.ts` добавлен
  `buildIkzParts` (возвращает и части, и собранный код), `buildIdentificationCode`
  теперь делегирует ему. Год берётся из «Планируемый год размещения
  извещения», код заказчика — ИКУ (ИНН+КПП+1), номер закупки — из записи,
  порядковый номер — «000» при единственной закупке и инкремент по позициям с
  тем же номером закупки, ОКПД2 — первые 4 цифры (или «0000» при нескольких),
  КВР — последние 3 цифры КБК (отдельный input КВР и порядкового номера
  убраны). ИКЗ собирается в `onSubmit` и уходит в XSD; при правке позиции
  пересобирается из актуальных граф.

## 40. Фронт потребляет API справочников и правил НПА (2026-11-20)

- **Снимок ОКПД2:** `useOkpd2Dictionary` (`src/services/Okpd2Ref/okpd2Ref.api.ts`)
  загружает `GET /api/references/nsiOKPD2/all` — 21 066 кодов без `payloadJson`.
  Локальные `okpd2Refs` из `db.json` больше не источник кодов: они накладываются
  оверлеем только для `isNormed`/`normLimit`/`nationalRegime` (в выгрузке НСИ
  этих признаков нет). На `references-updated` SSE инвалидирует и этот запрос.
- **Правила НПА:** новый клиент `src/services/Npa/npa.api.ts` — типы правил и
  документов, `fetchNpaDirectRules`, `useNpaDocuments`, `useNpaRuleIndex`,
  `useNpaEffective` (404 → `null`). `directOnly=true` на бэке отдаёт 107 / 973 /
  58 прямых правил вместо 48 тыс. строк с наследованием.
- **Синхронный резолвер** `src/services/Npa/npaControl.ts` воспроизводит порядок
  бэка: самый длинный префикс, генерация предков, `exclude` сильнее; публикуется
  из `useOkpd2Dictionary` до отдачи справочника. `auctionListControl.ts` берёт
  правила 471-р отсюда, а исторический эталон 31.10.2022 остался только
  fallback'ом на случай недоступности сервиса. `needsReview` пробрасывается в
  `AuctionListCheckResult` и показывается человеку.
- **Проверено вживую:** API на 5099 + браузер на 5173 — снимок 21 066, правила
  107/973/58; `32.50.11.110` и `01.4` → `exclude`, `30.11.23` → `include`,
  `66.12.11` → `include` + `needs_review`. `npx.cmd tsc -b`, `npx.cmd oxlint src`,
  `npx.cmd vite build` — успешно; на бэке `dotnet build` и 66 тестов.
- **Очередь:** подключить `pp-1875` к проверкам национального режима (сейчас
  индекс загружен, но используется только 471-р); SSE для смены версий НПА.

## 41. Расписание проверки НПА и время в реестре актов (2026-11-20)

- **Расписание (`csms-api`):** `Npa:CheckTime=03:00` (МСК, фиксированный UTC+3,
  без летнего времени) и `Npa:CheckDelayMinutes=30`. `NpaSyncWorker` больше не
  считает цикл от запуска процесса: он ждёт ближайшие 03:00 по московскому
  времени, затем обрабатывает акты строго по одному, с паузой после каждого.
  `SyncIntervalHours` удалён из конфигурации; `/api/npa/config` отдаёт
  `checkTime`, `checkDelayMinutes`, `timeZone`.
- **Отметки времени:** миграция `20261119225748_AddNpaCheckTimestamps` добавила
  `LastCheckedAt`, `LastCheckStatus`, `LastCheckMessage` в `ref.npa_documents`
  (старые строки получили время публикации). `FetchedAt` осталось временем
  публикации версии. `NpaSyncService` помечает проверку и при `up_to_date`, и при
  ошибке, поэтому в реестре видно, что акт проверяли, даже если текст не изменился.
- **Фронт:** `npa.api.ts` отдаёт новые поля и `formatMskDateTime` (формат
  «20.11.2026 00:42 МСК» без зависимости от локали браузера). `LegalActsRegistry`
  сопоставляет акты с NPA по номеру и в графе «Сверка» показывает «Проверен» и
  «Обновлён» с датой и временем, версию правил и итог проверки. Остальные акты
  сохранили прежнюю отметку `lastCheckedDate`.
- **Проверено вживую:** `/api/npa/config` — 03:00 / 30 мин / UTC+3; три активные
  версии отдали `fetchedAt` и `lastCheckedAt`; на `/legal-acts` в браузере три
  строки с временем МСК, включая 471-р при поиске по номеру. `dotnet build`
  (0/0), 66 тестов, `tsc -b`, `oxlint`, `vite build` — успешно.

## 42. ОКПД2 на фронте и единый запуск через npm start (2026-11-20)

- **Где посмотреть:** маршрут `/okpd2` (`src/components/Okpd2Ref/Okpd2Dictionary.tsx`,
  пункт «Справочники» в шапке). Страница берёт 21 066 кодов с
  `GET /api/references/nsiOKPD2/all` и показывает код, наименование, способ
  закупки по 471-р, признак нормирования и предельную цену; есть поиск и отборы.
- **`npm start` теперь поднимает три процесса:** Vite (:5173), json-server
  (:3001) и `csms-api` (:5099). API запускается через `scripts/start-api.mjs`,
  который по умолчанию выставляет `EIS_STORE=postgres`, `Development` и
  `http://localhost:5099`, но не перетирает переменные окружения пользователя.
  Отдельно API можно поднять командой `npm run api`.
- **Зависимость:** API с postgres читает базу `csms_eis` на :5433. Если кластер
  не поднят, ОКПД2 на странице будет пустым — сначала запустить PostgreSQL.
  Ошибка в пути скрипта (`../csms-api` вместо `../../csms-api`) была найдена
  и исправлена при проверке.
- **Проверено вживую:** после `npm.cmd run start` слушаются все три порта;
  `/api/references/nsiOKPD2/all` → 21 066 записей, `/api/npa/config` → 03:00/30;
  в браузере на `/okpd2` запрос к API вернул 200, в таблице реальные коды
  (13.94.99, 43.31.10.130, 28.12.12.122) и счётчик «Справочники ЕИС 21 066».

## 43. Второй агент НПА на локальной модели Ollama (2026-11-20, `csms-api`)

- **Что добавлено:** `NpaLlmAnalyzer` (OpenAI-совместимый клиент Ollama,
  `temperature=0`, `response_format=json_object`), `NpaLlmResponseParser`
  (валидация), `NpaLlmRuleAdapter` (кандидаты из активного снимка ОКПД2 и
  преобразование в правила), DTO в `NpaContracts.cs`, endpoint
  `POST /api/npa/documents/{code}/analyze`. Вызов в `NpaSyncService` идёт только
  по `parsed.Unresolved` и только при `Npa:Llm:Enabled=true`.
- **Безопасность:** код принимается только если он есть среди кандидатов
  конкретной строки; `source_quote` должен дословно (с нормализацией пробелов
  и регистра) присутствовать в тексте этой же строки; не больше одного
  результата на строку; неявные совпадения всегда получают
  `requires_human_review=true`. Все предложения уходят в
  `NpaRuleStatuses.NeedsReview` и не попадают в эффективные правила до
  подтверждения через `/verify` (`EfCoreNpaRuleStore` фильтрует статус).
- **Очередь проверки по ID (2026-11-20, после выбора пользователя):**
  `NpaSyncService` больше не отбрасывает предложения с кодом первого агента —
  все 31 предложение 14B попадают в версию отдельными записями. `NpaRuleInfo`
  получил поле `Id`, `/verify` теперь принимает
  `POST /api/npa/documents/{code}/rules/{ruleId}/verify` и меняет статус только
  выбранной записи. `NpaRuleHierarchy.Propagate` не наследует `needs_review`,
  если для кода есть проверенное правило. Фронтовый `NpaRuleInfo` тоже получил
  `id` (пока только в контракте: отдельной кнопки подтверждения в UI нет).
- **Конфигурация:** `Npa:Llm` = `Enabled=true`, endpoint `localhost:11434`,
  `Model=qwen2.5:14b-instruct-q4_K_M`, `BatchSize=5`, `MaxCandidates=5`,
  `TimeoutSeconds=180`. `/api/npa/config` отдаёт блок `llm`.
- **Модель:** железа хватило на 14B (16 ГБ ОЗУ, i5-7500, RTX 3060 12 ГБ).
  Реестр Ollama недоступен (`registry.ollama.ai`, TLS timeout), поэтому GGUF
  `bartowski/Qwen2.5-14B-Instruct-Q4_K_M.gguf` (~8.4 ГБ) скачан с Hugging Face
  и импортирован через `Modelfile` с ChatML и `num_ctx=8192`. Занимает
  10.7 ГБ VRAM из 12, GPU ~96%. 32B не влезает и ушла бы в медленный CPU.
- **Сравнение на 471-р (63 спорные строки):** 7B — 57 предложений, 8 отклонено,
  56 explicit / 0 implicit, 0 на проверке; 14B — 31 предложение, 19 отклонено,
  21 explicit / 10 implicit, 11 на проверке, 216 с. То есть 7B просто подписывал
  строки широкими кодами, а 14B различает неявные совпадения и отмечает их
  человеку. Широкие коды (26 из 31) здесь корректны: 471-р перечисляет разделы.
- **Проверки:** `dotnet build src/Csms.Api` — 0 ошибок, 0 предупреждений;
  `dotnet test` — 69 passed, 3 skipped (Postgres-integration).
  Живой analyze на 14B: `inputRows=63`, `suggestionCount=31`,
  `rejectedCount=19`, `error=null`. Smoke-тест JSON-режима через
  `/v1/chat/completions` прошёл.
- **Ограничения и очередь:** ~16 с на батч из 5 строк; для 1875-р (1503 строки)
  это ~80 мин, ночной цикл остаётся последовательным с паузой 30 мин. Ручной
  разбор `unresolved` (471 — 88, 1875 — 1503, 2604 — 387) не завершён. ЕИС
  отдаёт «Токены для сервисов отдачи отсутствуют в ЕИС» на новый токен; старый
  токен из публичной истории git подлежит отзыву.
- **Коммиты `csms-api`:** `16c7ef9` (реализация), `3e3685a` (уточнение брифа),
  `3f39878` (результаты сравнения), `1f91579` (карта агентов). GitHub DNS
  периодически не резолвится — пуш выполнялся по прямому IP `140.82.114.4` с
  заголовком `Host: github.com` и Basic-авторизацией из `git credential fill`;
  обычный `git push` работает, когда DNS вернулся (проверено на `csms`).

## 44. Флаг нормирования по ПП РФ № 926 и справка в шапке (2026-11-20)

- **Добавленные акты:** в `Npa:Documents` есть `pp-926`
  (`0001201509080040`, `TableLayout: true`) и `pp-927`
  (`0001201509080025`, `TableLayout: false`). 926 — источник признака
  обязательного нормирования и предельных цен; 927 содержит ценовые правила,
  а не перечень кодов ОКПД2, поэтому правила по кодам из него не выводим.
- **Портал `publication.pravo.gov.ru`:** отдаёт `500.30` при
  `Accept-Encoding: gzip/br`; в `Program.cs` выставлен `identity` и отключена
  автоматическая декомпрессия. При `identity` сбой сохраняется примерно в
  половине запросов: в `PravoDocumentClient` добавлено 9 повторов с нарастающей
  паузой (суммарно ~65 с) и для надёжности официальные PDF скачаны напрямую
  с `eoNumber` (926 — 506 671 байт, 927 — 863 483 байта). Загруженная копия
  разбирается тем же endpoint'ом `/documents/{code}/upload` (`dryRun` доступен).
- **Живой результат `pp-927`:** 20 страниц, **0 правил**, 0 `unresolved`,
  LLM-предложений 0, версия `pravo-0001201509080025`. Подтвердилось решение
  держать `TableLayout: false`: в акте ценовые правила, а не перечень кодов
  ОКПД2, поэтому из него не выводим ни include, ни exclude.
- **Первый живой результат `pp-926`:** `dryRun` после пересборки — 10 страниц,
  **2 904 правила**, 32 `unresolved`, OCR `tesseract v5.4.0.20240606 (rus)`,
  LLM-предложений 0, версия `pravo-0001201509080040`. Тот же текст опубликован
  в БД: 2 657 `include` и 247 `exclude`, все `status=auto`, номер версии не
  увеличилась (`force=true` на ещё не существующую версию). Проверка
  `GET /api/npa/documents/pp-926/effective?okpd2Code=02.10.11.110` вернула
  `include` с наследованием от `02`, а неизвестный код — `404`. Это значит, что
  таблица приложения разбирается детерминированно и флаг нормирования строится
  по этим правилам, без выдуманных кодов.
- **Контракт флага на фронте:** `normingFlagFromRule` в `npaControl.ts`:
  `include` → `isNormed: true`, `exclude` → `false`, `conditional` и
  `needs_review` → `null` (локальное значение не перетирается). `normLimit`
  берётся только из явной цитаты/предела. Массовая разметка 21 066 кодов идёт
  через `buildNpaRuleIndex` + `resolveIndexedNpaRule`, а не перебором массива.
- **Справка в шапке:** кнопка «Справка» открывает `AgentsHelpModal` — короткую
  карту пяти программных агентов (полный текст в `csms-api/docs/agents.md`).
  В брифах `npa-rules.md` и `npa-llm-agent.md` исправлены устаревшие строки
  «LLM пока не реализована».
- **Проверки после правок:** `dotnet test` — 69 passed / 3 skipped;
  `tsc -b`, `oxlint src`, `vite build` на фронте — успешно (`oxlint` только
  прежние предупреждения в чужих файлах).

## 45. Бриф агента извлечения функций из любого документа (2026-11-20)

> Бриф закрыт кодом — см. §46. Текст ниже оставлен как исходная договорённость.

- **Задача:** из любого НПА/регламента/ТЗ (первый целевой — Приказ Минфина
  № 158н) получить функции и атомарные подзадачи с обратной ссылкой на пункт.
  Алгоритм документонезависимый, передаётся агенту-исполнителю как бриф.
- **Файл:** `csms-api/docs/tasks/document-functions-agent.md`. Код **не
  реализован** — это контракт и промпты, не работающий воркер. В карту агентов
  (`csms-api/docs/agents.md`) добавлена строка «планируемый конвейер».
- **Конвейер:** детерминированная сегментация с «хлебными крошками» → Map (LLM
  по одному сегменту) → Validate (код проверяет цитату, атрибуты и покрытие) →
  Reduce (код склеивает дубли, LLM только для спорных пар) → `needs_review` и
  подтверждение по ID. Пропущенный сегмент = ошибка набора, не «тишина».
- **Важные отличия от присланного черновика:** таксономия берётся существующая
  (`ContractServiceFunctionSchema`: planning / purchase_description /
  supplier_determination / contract_conclusion / contract_execution / other),
  обе проходки локальные на `qwen2.5:14b-instruct-q4_K_M` без внешних ключей,
  дедупликация и проверка цитат вынесены в код, добавлены `obligation`,
  `coverage ledger`, версии prompt/taxonomy и кэш по `sha256+segment`.
- **Эталон приёмки:** `src/services/Tasks/order158nTaskPool.ts` — уже размеченные
  вручную п. 3.1.1–3.5.4 и п. 2.5–2.6. Сверять покрытие пунктов и пары
  «глагол + объект», расхождения выносить в отчёт, а не чинить по пути.
- **Очередь:** сегментер docx/txt → Map на 158н → Reduce → расширение на pdf и
  произвольные документы.

## 46. Агент извлечения функций реализован в `csms-api` (2026-11-20)

- **Код:** `src/Csms.Application/DocumentFunctionContracts.cs`,
  `DocumentFunctionStore.cs`; `src/Csms.Infrastructure/Documents/` (text extractor,
  segmenter, Map, response parser, normalizer, validator, reducer, in-memory store,
  orchestrator); `src/Csms.Api/DocumentFunctionsEndpoints.cs`; DI и секция
  `DocumentFunctions` в `Program.cs` / `appsettings.json`.
- **Endpoint'ы:** `GET /api/documents/config`, `POST /api/documents/extract?dryRun=true`
  (multipart `file`, `.docx/.pdf/.txt/.md`, до 32 МБ), `GET /api/documents/{sha256}/functions`,
  `GET /api/documents/{sha256}/report`, `POST /api/documents/functions/{id}/verify`.
- **Конвейер:** Ingest (Docnet+Tesseract для PDF) → сегментация с ancestors →
  Map (14B, `temperature=0`, `json_object`, батч 4, массив `results`) →
  Validate (цитата подстрока сегмента, срок/роль/условие из сегмента или предков) →
  Reduce (точный нормализованный ключ, все `source_paths` сохраняются) →
  `needs_review`. Версия набора = `sha256 + prompt + taxonomy + model`.
- **Тесты:** `tests/Csms.Tests/DocumentFunctionAgentTests.cs` — 7 тестов без LLM;
  `dotnet build` 0/0, `dotnet test` **76 passed / 3 skipped** (Postgres).
  Исправлено по ходу: разделы верхнего уровня (уровень -1) теперь попадают в
  `ancestors`; подтверждение функции применяется ко всем версиям одного sha256;
  глагол в цитате сверяется и с исходной формой, и с инфинитивом.
- **Эталон:** `csms-api/tests/Csms.Tests/Fixtures/order158n-golden.json` — 41 пункт
  из `order158nTaskPool.ts`. Живой прогон по официальному PDF 158н
  (`0001202010200032`, 10 стр.) запущен, результат сравнивается с эталоном.
- **Ограничения честно:** хранилище in-memory (до перезапуска API), граф
  зависимостей и нечёткие пары Reduce не сделаны, UI очереди проверки нет —
  подтверждение пока только через HTTP.
- **Живые прогоны (2026-11-20):** первый запуск 158н упал с HTTP 500 — 14B
  генерировала без лимита и уперлась в `HttpClient.Timeout=300`, а
  `OperationCanceledException` от HttpClient валил весь прогон. Исправлено:
  `max_tokens=2048`, таймаут 900 с, `MaxRetries=1`, таймаут считается failed-сегментом.
  Второй запуск показал, что Qwen воспроизводит 158н по памяти и выдумывает цитаты;
  добавлены запрет на это в промпт, few-shot пример и напоминание в user-prompt.
  На контрольном файле из 3 пунктов после правок: `candidatesBefore=3`,
  `quotesRejected=1`, `uncovered=[]` — валидатор отсекает галлюцинации.
- **Следующий шаг:** сверить полный живой прогон с 41 пунктом эталона, добавить
  персистентность версий и граф зависимостей, затем подключить результат к
  карточкам функций контрактной службы на фронте.

## 47. Пул 158н и ОКПД2 в хедере (2026-11-20)

- **Пул 158н больше не в TS:** 41 пункт перенесён в `csms-api` как версия
  справочника `order158nPool` (`src/Csms.Infrastructure/Seeds/order158n-pool.json`,
  SHA-256 `F8820D98…D14AC`). Каталог
  `src/Csms.Infrastructure/Order158nPoolCatalog.cs` один раз импортирует эталон
  в `IReferenceDataStore` (память/PostgreSQL) и дальше читает только оттуда.
  Версия `order-158n-2020-07-31-v1`, `publishedAt` приводится к UTC (иначе
  Npgsql падает на `DateTimeOffset` с offset +03:00).
- **API:** `GET /api/order158n/pool` (41 пункт + реквизиты источника) и
  `GET /api/order158n/pool/{id}` (по ID или `п. 3.1.1`). Датасет виден в
  `/api/references/datasets`. Тесты `Order158nPoolTests` — 2 новых, всего
  `dotnet test` **79 passed / 3 skipped**, `dotnet build` 0/0.
- **Фронт:** `order158nTaskPool.ts` теперь только типы, `useOrder158nPool()`,
  `filterPoolItems`/`findPoolItem` и чистые функции шагов. Потребители
  (`TasksPage`, `TaskAssignModal`, `TaskDetailPage`, `MyTasks`,
  `ContractServiceForm`, `regulatoryDeadlines`) получают пул через react-query.
  Проверки: `npx.cmd oxlint src` — только прежние warning'и; `npx.cmd vite build`
  — успешно (exit 0). `npx.cmd tsc -b` падает **на чужом, не тронутом нами
  файле** `src/components/NoticeInfoForm/sections/AttachedDocsSection.tsx:106`
  (`additional_requirements` не входит в тип), это незавершённая работа другого
  агента, не чиним по указанию AGENTS.md.
- **Хедер:** добавлен прямой пункт «ОКПД2» → `/okpd2`. В справке агентов
  карточка «Извлечение функций из документа»; оба агента НПА и агент извлечения
  упоминают активный справочник ОКПД2. `db.json` теперь только оверлей признаков
  для существующих кодов, «лишние» 48 локальных кодов из выдачи убраны: страница
  показывает ровно 21 066 кодов из `/api/references/nsiOKPD2/all` (проверено в
  браузере с `EIS_STORE=postgres`). Буквенные разделы A–U тоже нельзя отбрасывать:
  это часть официального снимка, всего 21 066 строк.
- **PostgreSQL payload:** `EfCoreReferenceDataStore.GetAllAsync` намеренно не
  тянет `PayloadJson` (ОКПД2 — десятки МБ), из-за чего первый postgres-прогон
  вернул 41 пункт с null-полями и `/tasks` упал на `.length`. Добавлен
  `IReferenceDataStore.GetAllWithPayloadAsync` (в memory — алиас на GetAllAsync,
  в EF — выборка с `PayloadJson`); каталог пула использует его. После
  пересборки и перезапуска с `EIS_STORE=postgres` `/api/order158n/pool` снова
  отдаёт 41 полноценный пункт, `/tasks` показывает 41 без ошибки.
- **Не закрыто:** качество полного прогона 158н (`segmentsTotal=62`,
  `processed=31`, `failedSegments=31`, `coverage=8/41`) — нужен repair-проход
  или привязка цитат к сегментам; хранилище результатов извлечения in-memory.

## 48. Compliance & Liability Mapping в csms-api (2026-11-20)

- **Что добавили:** новый конвейер «одна обязанность → многие нормы
  ответственности». Сущность А (`DutyInput`) инвертируется детерминированным
  `ViolationHypothesisGenerator` в 4 гипотезы (неисполнение, срок, форма,
  субъект). Сущность Б ищется `EfCoreLiabilityRetriever`: pgvector (768,
  HNSW) + `tsvector('russian')` + принудительный umbrella-пул общих/бланкетных
  норм, дедупликация до 30 кандидатов. Арбитр `LlmArbiter` — локальная Ollama
  `qwen2.5:14b-instruct-q4_K_M`, `temperature=0`, strict JSON, батчи ≤8,
  3 попытки 2/4/8 с, аудит каждой попытки. `MappingValidator` отбрасывает
  id вне пула, фильтрует `irrelevant`, дедуплицирует конфликты, ограничивает
  score до 0..1 и помечает спорное в `requires_human_review`.
- **Где:** контракты — `csms-api/src/Csms.Application/LiabilityMappingContracts.cs`,
  `LiabilityMappingRules.cs`, `LiabilityArbiterPrompts.cs`,
  `LlmArbiterResponseParser.cs`, `MappingValidator.cs`,
  `ViolationHypothesisGenerator.cs`; реализация —
  `csms-api/src/Csms.Infrastructure/Liability/`, миграция
  `20261120041526_AddLegalLiabilityMapping` (схема `legal`: `liability_norms`,
  `liability_norm_chunks`, `mapping_candidates`, `llm_audit_log`,
  `duty_liability_mappings`), API — `LiabilityMappingEndpoints.cs`,
  тесты — `ComplianceLiabilityMappingTests.cs`.
- **API:** `POST /api/liability-mapping/map` с телом `DutyInput`,
  `GET /api/liability-mapping/{dutyId}`. Повтор с теми же входами считает
  детерминированный `run_id` (SHA-256 канонического JSON duty + пул + модель)
  и возвращает сохранённый результат, не вызывая модель; unique
  `(duty_id, liability_node_id)` не даёт дублей.
- **Проверки:** `dotnet build` — 0 ошибок; `dotnet test --no-build` —
  **97 passed / 3 skipped** (18 новых тестов: инверсия, валидация, парсер,
  ретраи, manual review, пустой пул, идемпотентность, длинные тексты и
  проверка точного JSON-контракта). Единственное предупреждение сборки —
  старый xUnit2009 в `EisPackageFlowTests.cs`, не трогали.
- **JSON-контракт API:** выход-result сериализуется в оговорённые имена полей
  (`duty_id`, `violation_hypotheses`, `matched_liabilities`, внутри связи —
  `liability_node_id`, `norm_reference`, `match_degree`, `probability_score`,
  `qualifying_conditions`, `sanction_summary`, `legal_reasoning`,
  `requires_human_review`). `match_degree` пишется строчными
  `full|partial|blanket|irrelevant` через property-level конвертер — он
  перекрывает глобальный PascalCase-конвертер перечислений API, не меняя
  статусы документов ("Signed", "SmpAttraction").
- **Окружение (закрыто 2026-11-20):** на локальном PostgreSQL 17 (:5433)
  установлен pgvector 0.8.7 (готовая Windows-сборка, распакована в
  `C:\Program Files\PostgreSQL\17`, служба перезапущена). Миграция
  `20261120041526_AddLegalLiabilityMapping` применена (`--no-build`, потому
  что запущенный экземпляр API блокировал DLL). Проверено: `vector | 0.8.7`
  в `pg_extension`, 5 таблиц в схеме `legal`, запись в
  `public."__EFMigrationsHistory"`.
- **Режимы:** в `EIS_STORE=memory` пул кандидатов пустой
  (`EmptyLiabilityRetriever`), эндпоинт работает и возвращает 0 норм без
  вызова LLM. Полный конвейер (pgvector + FTS + Ollama) требует
  `EIS_STORE=postgres`; после установки pgvector миграция больше не блокируется.

## 49. Загрузка КоАП и витрина Liability Mapping (2026-11-20)

- **Источник:** веб-версия КонсультантПлюс
  `http://www.consultant.ru/document/cons_doc_LAW_34661/` (ред. от 04.08.2026,
  изм. с 03.11.2026), `source=consultant-web` в метаданных. Официальные
  порталы pravo.gov.ru из среды недоступны; в UI источник подписан как
  «КонсультантПлюс (веб-версия)», не как официальный портал.
- **Загрузчик:** `csms-api/tools/KoapImporter` (отдельный .NET 9 консольный
  проект). Разбирает TOC (1176 ссылок), обходит 1138 статей, делит на части и
  пункты, строит чанки и 768-мерные эмбеддинги `nomic-embed-text`. Итог
  полного прогона: **2871 норма** (2812 частей), **3303 чанка**, запись в
  `legal.liability_norms` / `legal.liability_norm_chunks` идемпотентна.
- **Модель эмбеддингов:** реестр Ollama недоступен (TLS timeout), GGUF
  `nomic-ai/nomic-embed-text-v1.5.Q4_K_M` скачан с HuggingFace и зарегистрирован
  локально через `ollama create` (`num_ctx 8192`). `POST /api/embed` → 768
  чисел. Арбитр остаётся `qwen2.5:14b-instruct-q4_K_M`, `temperature=0`.
- **Миграции:** `20261120120000_AddMappingNormReference` (колонка
  `norm_reference` + backfill; до этого чтение связи падало) и
  `20261120130000_AddMappingRunStatus` (маркер `completed` в
  `mapping_candidates`, чтобы пустой прогон не дёргал LLM повторно). Обе
  применены к БД :5433. Исправлены скалярные `SqlQueryRaw` (`AS "Value"`) и
  вызовы `ExecuteSqlRawAsync` (массив параметров + отдельный токен отмены):
  EF Core 9 иначе принимал `CancellationToken` за параметр SQL.
- **API+фронт:** добавились `GET /api/liability-mapping/duties` (41 DutyInput
  из пула 158н) и `/overview`; на клиенте — `services/LiabilityMapping/*`
  (axios через Vite-прокси `/api`, Zod-схемы) и страница
  `components/LiabilityMapping/LiabilityMappingPage.tsx` `/liability-mapping`
  со списком 41 пункта, гипотезами, нормами, degree/score и ручной проверкой.
  Ссылки — в `Header.tsx` и на главной `Main.tsx`.
- **Запуск API:** только с launch profile (в `launchSettings.json` есть строка
  подключения); `--no-launch-profile` без `ConnectionStrings:EisDb` падает.
  Полный конвейер требует PostgreSQL :5433, Ollama :11434, `EIS_STORE=postgres`.
- **Проверки (2026-11-20):** `dotnet build` — успешно; `dotnet test --no-build`
  — 0 ошибок, 100 passed / 3 skipped (увеличение на 3 теста относительно §48);
  `npx tsc -b` — успешно (ранее падал `NoticeInfoForm.tsx:1683` из-за чужой
  незавершённой правки, к моменту проверки ошибка устранена); `npx oxlint src`
  — только предупреждения, новых ошибок нет; `npx vite build` — успешно
  (предупреждения Sass `@import`, размера чанков и отсутствующих шрифтов).

## 50. Настройка и версионирование конвейера (2026-11-20)

- **Проблема:** раньше `run_id` хэшировал duty + пул + модель, поэтому смена
  промпта/порогов не создавала новый прогон и старый результат считался
  актуальным. Теперь в ключ входят `PromptVersion=liability-arbiter-v2`,
  `RulesVersion=liability-rules-v2`, `HypothesesVersion=liability-hypotheses-v2`,
  `ConfigVersion=liability-config-v3`, `BuildRulesFingerprint()` (пороги,
  лимиты, веса) и `options.BuildConfigFingerprint()` (модель, эмбеддинги,
  температура, токены, ретраи). Старые строки остаются в истории БД.
- **Промпт v2:** пороги подставлены из правил, добавлена калибровка score
  (full 0.85–1.00, partial 0.50–0.84, blanket 0.20–0.60, irrelevant 0),
  требование оценить каждый id, цитата из нормы + id гипотезы, усечённый текст
  не повышает оценку. В user prompt уходит блок `evaluation_rules`.
- **Пороги:** low 0.5, partial 0.7, новый full 0.8; blanket всегда на проверке.
- **Гипотезы:** 4 по ТЗ, но действия идут первыми, бездействие последним
  (практика 158н ~80/20 в пользу действия); бездействие сохранено для ч. 2
  ст. 19.5. При добавлении нового `ViolationKind` нужно bump
  `HypothesesVersion`, поправить промпт «3–4» и тест генератора.
- **Пул:** лимиты 24/18/6 передаются в SQL параметрами, максимум 30; ранг —
  взвешенная сумма 0.65/0.35/0.5 вместо max, umbrella не вытесняет специальные
  нормы; при пуле <25 пишется warning.
- **Опции:** добавлены `Temperature` (по умолчанию 0, попадает в аудит и
  отпечаток) и `ConfigVersion`; `Validate()` проверяет оба новых поля.
  Невалидный ответ LLM теперь сохраняется в `llm_audit_log` строкой, а не
  роняет вставку.
- **Проверки:** `dotnet build` — 0 ошибок, `dotnet test --no-build` —
  **103 passed / 3 skipped** (+3 теста: промпт, порог full, версионность).
  Подробности — `csms-api/docs/tasks/compliance-liability-mapping.md` §11.

## 51. Живой прогон Liability Mapping v3 (2026-11-20)

- **Результат:** duty `158n-3-1-1`, `run_id=91baaa0c-5f97-bc16-6b56-060e48fd04f3`,
  `candidate_count=29`, `matched=1` — «КоАП РФ ст. 2.9.1 ч. 1», `blanket`,
  `probability_score=0.5`, `requires_human_review=true`. Модель
  `qwen2.5:14b-instruct-q4_K_M`, промпт `liability-arbiter-v2`,
  `calculated_at=2026-11-20T06:11:47.5552543+00:00`.
- **Контур:** PostgreSQL `:5433` + pgvector, Ollama `:11434`, `EIS_STORE=postgres`,
  csms-api `:5099`. В `legal` загружен КоАП: 1138 статей, 2871 единица,
  3303 чанка с эмбеддингами `nomic-embed-text` (768). При `EIS_STORE=memory`
  работает `EmptyLiabilityRetriever` — живой прогон без PostgreSQL невозможен.
- **Версии/конфиг:** `ConfigVersion=liability-config-v3`, `ContextTokens=8192`
  (`num_ctx`), `MaxOutputTokens=4096`, timeout 900 с, retries 2. Новый прогон
  =$новый `run_id`; старые строки (включая неудачные `7c2f5690…`, `976b5470…`)
  остаются в БД и аудите. Кандидаты `pending` → `completed` только в
  `SaveMappingsAsync`; `irrelevant` живёт только в `llm_audit_log`.
- **Документация:** `csms-api/docs/tasks/compliance-liability-mapping.md` §§11–12.

## 52. ПП РФ N 2604: ОКПД2 → категории предельных величин (2026-11-20)

- **Источник:** официальный API `publication.pravo.gov.ru`,
  `eoNumber=0001202201040005`, PDF стр. 27–29 (повёрнутый скан, OCR после
  поворота на 90°). Справочник — активная версия НСИ ЕИС `nsiOKPD2`
  (`eis-nsiOKPD2-7c7ee4215e3ee405`, 21066 кодов). Сторонние сайты не
  использовались; правила `ref.npa_rules` для `pp-2604` не являются источником
  пределов (там `include/auto` на весь справочник).
- **Ключевой факт:** приложение N 2 содержит 20 наименований объектов и три
  числа на строку, но **ни одного кода ОКПД2**. Каждая связь «код → позиция»
  производная и несёт `basis` (`classifier` / `purpose` / `residual`), номер
  позиции, акт и наименование кода из НСИ. Спорные коды получают
  `needsReview=true`.
- **Реализация (офлайн-fallback):** `src/services/BidEvaluation/bidEvaluation.schema.ts` —
  `PP2604_APPENDIX2_SOURCE`, `OBJECT_CATEGORY_LIMITS` (+ `appendixRow`,
  `appendixName`), `OKPD2_CATEGORY_RULES`, `resolveOkpd2Category`,
  `detectObjectCategory`, новое поле `okpd2Purpose`. Приоритет: цель закупки →
 самый длинный префикс → остаток поз. 2. Отсутствие кода — warning, невалидный код —
  error, конфликт категорий — warning с источниками, несоответствие выбранной
  категории — error с номером позиции.
- **Уточнения:** поз. 12 — `30 / — / 70` (OCR повёрнутой страницы давал
  `70 / — / 30`, сверка по изображению подтвердила `30 / — / 70`, значение в
  коде не менялось); поз. 13 ограничена образовательными,
  медицинскими, социальными организациями и отдыхом детей; поз. 14 — только
  охрана объектов образовательных и научных организаций. Для поз. 6 добавлен
  спорный код `71.11.23` (архитектурные услуги по реставрации исторических
  зданий).
- **Проверки и документация:** `npm run check:pp2604` (новый smoke-скрипт на
  rolldown + Node) проходит; полная таблица —
  `csms/docs/tasks/pp2604-okpd2-limits.md`. На момент коммита `npx tsc -b`,
  `npx oxlint src` и `npx vite build` проходили.
## 53. Слияние ContractChange в csms-api (2026-11-20)

- Приняты правки другого агента: `ContractChange*.cs`, миграции
  `20261120062439_AddContractChanges` и `20261120140000_AddContractChangeRevision`,
  регистрация в `Program.cs`, DbSet'ы в `EisDbContext.cs` и snapshot моделей.
- Модуль хранит снимок контракта, предлагаемые условия, документы с редакциями
  и SHA-256, журнал переходов. Статус меняется только сценариями домена,
  отдельного `PUT /status` нет. Бриф — `csms-api/docs/tasks/contract-change.md`.
- Перед сборкой остановлен запущенный `Csms.Api` (PID 21740), блокировавший DLL.
  После слияния `dotnet build` — 0 ошибок, `dotnet test` —
  **195 passed / 6 skipped** (в том числе новые тесты ContractChange).

## 54. Детализация функций 158н во фронтенде (2026-11-20)

- Приняты правки `contractService.schema.ts`, `contractFunction.schema.ts`,
  `contractService.config.ts`, `ContractServiceForm.tsx`,
  `order158nReport.schema.ts`, `db.json`, `WorkPlan.md`: 6 основных кодов и
  41 подпункт раздела III Приказа № 158н, справочник `contractFunctions`
  (47 записей), двухуровневый `FunctionPicker`, адаптация отчёта 158н.
- Родительский код раздела добавляется автоматически для обратной
  совместимости существующих задач и отчётов.
- Проверки после слияния: `npx tsc -b`, `npx oxlint src` (только предупреждения),
  `npx vite build`, `npm run check:pp2604` — проходят. Заметка §52 о падении
  TS2740/CS1739 утратила силу: ошибки устранены принятыми правками.

## 55. Импортёр и API каталога ПП РФ N 2604 (2026-11-20)

- **Импортёр `csms-api/tools/Pp2604Importer`:** читает снимок
  `pp2604-seed.json` (20 позиций приложения N 2 и 57 связей), получает
  реквизиты и PDF только с `publication.pravo.gov.ru`
  (`eoNumber=0001202201040005`, SHA-256 `b265fdec…572d9bf`), пишет в
  `legal.pp2604_documents`, `legal.pp2604_categories`,
  `legal.pp2604_okpd2_links`. CLI: `--connection`, `--seed`, `--snapshot`,
  `--pdf`, `--parse-only`, `--load-only`, `--offline`. Версия детерминированная
  (`pp-2604-d22664ddcd64`); повторный прогон не дублирует данные, старые
  версии остаются неактивными.
- **API:** `GET /api/pp2604/mapping` и `/api/pp2604/resolve?code=…&purpose=…`
  читают активную версию через `EfCorePp2604Catalog`. В memory-режиме
  `InMemoryPp2604Catalog` возвращает 404, а не выдуманные правила. Решение
  `ref.npa_rules` НПА как источника пределов отклонено: там нет привязки к
  позициям приложения N 2.
- **Фронтенд:** `src/services/Pp2604/pp2604.api.ts` +
  `usePp2604MappingOrDefault()`. `resolveOkpd2Category`,
  `detectObjectCategory`, `categoryFromOkpd2`, `objectCategoryLimits` и
  `validateBidEvaluation` принимают каталог API; константы
  `OKPD2_CATEGORY_RULES` остались только как офлайн-снимок
  `PP2604_OFFLINE_MAPPING`. Подключено в оценке заявок, списке оценок,
  требованиях участников и служебной записке.
- **Проверки:** `dotnet build` — 0 ошибок; `dotnet test` — 202 passed /
  6 skipped (новые `Pp2604CatalogTests`); `npx tsc -b`, `npx oxlint src`
  (warnings), `npx vite build`, `npm run check:pp2604` — проходят. Снимок
  экспортируется скриптом `npm run export:pp2604-seed -- <путь>`. Брифы:
  `csms/docs/tasks/pp2604-okpd2-limits.md`,
  `csms-api/docs/tasks/compliance-liability-mapping.md` §14.
- **Не включено в коммит:** чужая незавершённая работа по электронному
  актированию в `csms-api` (`Acceptance*.cs`, `20261120160000_AddContractAcceptance`,
  правки `Program.cs`, `EisDbContext.cs`, model snapshot). В коммит `csms-api`
  вошли только строки ПП N 2604 из `Program.cs`; `EisDbContext.cs` и model
  snapshot не были добавлены в индекс.

