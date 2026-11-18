# Состояние проекта (служебная заметка для AI-ассистента)

> Файл для ассистента, не для пользователя. Читать первым в новой сессии, чтобы
> не сканировать весь репозиторий. Пользовательское описание проекта — `PROJECT.md`.
> Дата последнего обновления: 2026-11-18 (КТРУ, сводная таблица объектов закупки,
> единый набор характеристик, автонацрежим в СЗ, файл ООЗ в извещении,
> кастомные чекбоксы/радио).

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

**Не трогать:** чужую WIP нормирования (пусть второй агент доделает в GitHub).
**Не делать:** вход подрядчика по ссылке, OCR содержимого PDF, годовой отчёт СМП.

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
