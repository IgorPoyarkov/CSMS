# Состояние проекта (служебная заметка для AI-ассистента)

> Файл для ассистента, не для пользователя. Читать первым в новой сессии, чтобы
> не сканировать весь репозиторий. Пользовательское описание проекта — `PROJECT.md`.
> Карта всех программных агентов/воркеров — `csms-api/docs/agents.md`.
> Также 2026-11-22: шапка и главная переведены на одну аккуратную строку —
> sticky-панель с полупрозрачным фоном, сквозной контур из шести пунктов и
> меню «Ещё» из трёх колонок; на главной — hero с показателями и реквизитами,
> поток закупки карточками и разделы тремя группами — §124.
> Также 2026-11-22: тяжёлые графики Recharts/D3 убраны с главной на ленивый
> маршрут `/analytics`; в D3-мониторе 24 крупнейших контракта, остальные
> свёрнуты в строку «Прочие» — §125.
> Также 2026-11-22: добавлена одностраничная визитка `/visit-card` — отдельный
> ленивый маршрут вне AppLayout, тёмная палитра, появление секций по
> IntersectionObserver, индикатор прокрутки, hover/focus и адаптив; ссылки в
> меню «Ещё» и на главной — §130.
> Также 2026-11-22: hero-кнопка главной открывает действующий план-график
> текущего года вместо формы создания — §128.
> Также 2026-11-22: публичная карточка контракта ЕИС разбирается по реестровому
> номеру без токена: акты приёмки (ОН_АКТРЕЗРАБП и ОН_НСЧФДОПPR), решения
> заказчика (ОН_АКТРЕЗРАБЗ и ОН_НСЧФДОППОК), сообщения ЭДО (DP_*) и платёжные
> поручения (MSC_TransfOrderAcc и FAM_PaymOrderCr) собираются в read-side DTO
> для фронта; сущности БД и кириллические поля в entity не добавлялись — §129.
> Там же: в строках акта ОКПД2 и КТРУ разделены. В ОН_НСЧФДОПPR атрибут
> `КодТов` — это код КТРУ (`01.13.43.110-00000002`), ОКПД2 берётся как его
> префикс до дефиса (`01.13.43.110`); в ОН_АКТРЕЗРАБП из `СведТРУКонт`
> дополнительно берутся `ИдТРУ`, `ТехИдТРУ`, `ЭАИдТРУ`. Платежи и ЭДО кодов
> объектов закупки не содержат.
> Также 2026-11-22: согласована стратегия парсинга `snapshot-first /
> offline-by-default` — старт без ЕИС, помощь в документах из открытых данных,
> интеграция/сервер только по спросу. Фаза 0 сделана: `npm start` не поднимает
> фоновых агентов НПА/XSD/КоАП, снимки и версии зафиксированы в
> `docs/snapshots/manifest.json`, план — в `docs/tasks/snapshot-first-offline.md`,
> задача — Tasks 18; подробности §133.
> Дата последнего обновления: 2026-11-22 — тема «Современные закупки»:
> убраны полосы прокрутки от кометы и от «фантомного» меню закрытого
> `<details>`, дёрганье панелей и плиток на hover, внешние тени заменены
> inset-неоном по краям (сверху полоса шире), найдено «непонятное затемнение»
> от `opacity` в блоке `prefers-reduced-motion` — §118; проверено на
> 390/1440/1920 px.
> Также 2026-11-22: плитки папок реестра контрактов летят к своим местам по
> реальной параболе (`offset-path` + рассчитанный в странице `path()`; единицы
> `px` внутри `path()` делали объявление невалидным и полёт был невидим),
> подробности контракта раскрываются шторкой на `.cardBody` — §123.
> Также 2026-11-22: данные заказчика переведены на PostgreSQL (:5433, база
> `csms_eis`) через json-server-совместимый адаптер на :3002 — §119.
> Предыдущее обновление 2026-11-21: адреса API сведены в один хелпер,
> проект запущен на :5173/:3001/:5099; ошибки XML-проверки планов устранены,
> карточка ПГ доведена до 7 вкладок ЕИС — §74; карточка позиции приведена
> к ЕИС, реквизиты заказчика сверены — §75; карточка позиции приведена к XSD
> ПГ 2020: транспонированный `positionModification`, без КВР и старого блока
> execution/basementInfo, пять признаков перенесены в объект закупки, правовой
> акт для суммы на последующие годы — §76; КБК/КВР и особые закупки
> подтянуты из публичного XML планов — §73; тема не трогалась — §72. Ранее: ревизия,
> реестр контрактов снова проходит zod-схему, добавлен `npm run check:db`;
> найдены критичные проблемы авторизации и миграций в `csms-api` — §71. Ещё ранее: реквизиты заказчика парсятся
> из публичной карточки ЕИС; 517 импортированных контрактов получили
> `organizationId` и стали видны в реестре — §70. Ещё ранее: переработаны связи
> ЕИС: позиция ПГ → все извещения → контракты с перезаключением → оплата по
> ИКЗ; из извещений добавлены ответственные сотрудники с ролями и задачами,
> КС создана из структурного подразделения — §69. Ещё ранее: усилены
> КоАП/маппинг-агенты (v3),
> исправленный маппинг записан в PostgreSQL, КТРУ загружен в `ref.items` и
> подключён к формам/«Ответственности КС», по ссылке заказчика импортированы
> 517 контрактов и создан руководитель КС — §66.
> Предыдущее обновление 2026-11-20 (Compliance & Liability Mapping в
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
  ⚠️ 2026-11-22: `/api/references/{dataset}/all` падал с 500 из-за
  `OrderBy(..., StringComparer.Ordinal)` в EF-запросе; исправлено в csms-api
  (`f49f972`), сортировка перенесена после выборки. Теперь endpoint отдаёт
  21 066 кодов ОКПД2, выпадающие списки в извещении/СЗ/ПГ наполняются.
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
- **Полный разбор приёмки и оплаты по публичной карточке** (без токена ЕИС,
  общий доступ по `reestrNumber`), режимы воркера:
  - `dotnet run --project eis-parser/src/Eis44Parser.Worker -- --contract-card 2462904043926000006 --year 2026 --out <папка>` —
    один контракт: акты, решения, ЭДО, платежи + сырые XML и JSON-проекция;
  - `... -- --inn 4629040439 --year 2026 --limit 500 --out <папка>` — все
    контракты заказчика по ИНН. Год берётся и из реестрового номера (позиции
    11–12). Zakupki отдаёт 429 при частых запросах: клиент сам делает паузу
    400 мс и до 8 повторов с экспоненциальной задержкой.
  - Результат — `ContractCardViewDto` (не сущность БД): `Acts`, `Decisions`,
    `Payments`, `Messages`, `Executions`, `SkippedFiles`. Связка акта с этапом
    идёт по `ИдЭтапКонт`/`ТехИдЭтапКонт` из XML; если признака этапности нет,
    акт относится к первому (единственному) этапу.
  - ⚠️ SOAP `getDocsByReestrNumber` не годится: токен ЕИС не имеет прав на
    отдачу документов («Токены для сервисов отдачи отсутствуют в ЕИС»).
  - ⚠️ Кириллические XML Казначейства объявляют `encoding="WINDOWS-1251"`;
    провайдер кодировок зарегистрирован в `CyrillicXmlEncoding.cs` (Core).
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
  «Управление государственных закупок»), **`poyarkova_nyu@mail.ru` /
  `qwerty12` → org 6** (user id7 → employee id42 Пояркова Н. Ю., руководитель
  КС id5, отдел id33; `administrator` + `contract_service_head`, все 7 прав;
  создан через `POST /api/access/import`). Связь с штаткой — поле
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
- Реестр (2026-11-21): `contractRegistry` — **523 записи**: 6 исходных + **517
  контрактов ОКУ «Курскавтодор»**, распарсенных из публичного реестра ЕИС по
  `customerIdOrg=01442000018…` / ИНН 4629040439 (исходный JSON и нормализация —
  во внешнем `%TEMP%`, в репозиторий не добавлялись). Новые записи имеют
  заполненные цены/даты/ИКЗ/статусы; `ktruRefs` в `db.json` остался демонстрационным
  (6 позиций), рабочий справочник КТРУ теперь читается из API — §66.
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
  фону окна, по периметру бежит точка. Точка едет по `offset-path:
  rect(0 100% 100% 0 round 10px)` (анимация `offset-distance`), а не по
  `top`/`left`: layout-анимация перерисовывала окно с тенью и оставляла
  «хвост кометы», а прямоугольный путь срезал скругления. Для браузеров без
  `rect()` в `offset-path` есть fallback `@supports not`, `prefers-reduced-motion`
  замораживает точку на 50 % пути. ⚠️ Имена `@keyframes` в CSS-модулях
  хешируются — в сторонних проверочных страницах ссылаться на них нельзя.
- **3D-тема** (`_theme-floating3d.scss`): без `perspective` и
  `rotateX`/`rotateY`. Наклон на вложенных контейнерах перекашивал текст, а
  `translateZ` на hover давал рывок масштаба. Объём держится на многослойных
  тенях, блике верхней грани и подсветке контура; подъём — только
  `translateY(-1px)` у кнопок и ссылок. `transform` у панелей не меняется,
  поэтому предок не становится containing block для `position: fixed` и
  модалки не уезжают от вьюпорта.
- **Тема «Современные закупки»** (`_theme-modern.scss`,
  `data-theme="modern"`): тёмный индиго-графит, циановый акцент, сетка на фоне,
  объёмные тени `--shadow-3d`. Декор размечает JS
  (`AppLayout/ModernMotionLayer.tsx`), потому что пороги «большого блока» и
  занятость псевдоэлемента в CSS не выражаются: комета по контуру
  (`data-modern-comet="after|before"`, `conic-gradient` + `mask-composite:
  exclude`, угол через `@property` + JS-фолбэк), неоновая подсветка на hover
  (`data-modern-lift`: кромка 1 px внутри + свет над верхней гранью снаружи,
  без `transform`, горит только ближайшая панель через
  `:not(:has(...:hover))`) и магнитное расхождение коротких списков
  (`data-modern-magnet`, 12 % от меньшей стороны, перпендикуляр к движению
  курсора). Подсветку не получают `table`, `[role="dialog"]` и прямоугольные
  обёртки (`border-radius < 4px`): декор переносится на скруглённые панели
  внутри них (`roundedChildren`, комета — только «главной», ≥ 50 % высоты
  обёртки). `prefers-reduced-motion` замедляет комету в 4,5 раза и отключает
  магнит. ⚠️ Headless Chrome по умолчанию отдаёт
  `prefers-reduced-motion: reduce` — для проверки движения нужен
  `Emulation.setEmulatedMedia`.
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
7. **Проверка контрагентов (§77, бэк готов).** Подключить
   `/api/eis/counterparties/check` к карточке контрагента на фронте, показать
   дату и id выгрузки как снимок источника.
8. **Адаптивность (§129).** Аудит 390 px пройден по всем роутам; остались
   необязательные улучшения: увеличить тач-цели `.btn--sm` (`×` 29×44) и
   ссылок «← назад» (24 px по высоте) до 40–44 px, проверить модалки
   (`PurchaseNoteModal`, `BidEvaluationModal`, `DefectListModal`,
   `VacationRowModal`, `PurchasePlanImportModal`) — их таблицы 700–1040 px
   сейчас прокручиваются внутри `overflow-x: auto`.

**Не трогать:** чужую WIP. На 2026-11-20 в рабочем дереве `csms` была чужая
незакоммиченная работа: `db.json` и `src/services/KoksRef/`. На 2026-11-21
`db.json` закоммичен вместе с нашими данными клиента (517 контрактов, новый
пользователь); `src/services/KoksRef/` не трогался. В `csms-api` правки NPA и
маппинга — наши, подлежат коммиту.
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

## 56. Фронтенд изменения и расторжения контрактов (2026-11-20)

- **Клиент csms-api:** `src/services/csmsApi.ts` — общий axios-клиент
  (`VITE_EIS_API_URL`; в dev без переменной идёт через прокси Vite `/api` →
  `localhost:5099`) и `readApiError` для ProblemDetails и доменных 409.
- **Слой данных:** `src/services/ContractChange/contractChange.types.ts` +
  `contractChange.api.ts` — список и карточка, каталог оснований, `meta`,
  `validate`, создание/правка, документы, действия `submit/approve/reject/
sign/cancel`, регистрация в ЕИС. Статус меняется только именованными
  маршрутами; хуки инвалидируют общий ключ `contractChanges`.
- **Экран:** `src/components/ContractChange/` — реестр с фильтрами по статусу и
  контракту, форма (снимок контракта, основание, условные поля по флагам
  основания, клиентская проверка + серверная `validate`) и карточка (замечания,
  документы с заготовками соглашения/уведомления/решения, действия по статусу,
  регистрация в ЕИС, история). Роуты `/contract-changes`, `/new`, `/:id`,
  `/:id/edit`; в карточке реестра контрактов — кнопка «Изменение / расторжение»
  с `?contractId=`.
- **Проверки:** `npx tsc -b` — 0; `npx oxlint src` — 0 ошибок (62 предупреждения,
  в том числе react-компилятора на существующих файлах); `npx vite build` —
  успешно; `dotnet build` — 0; `dotnet test --filter ContractChange` —
  **92 passed / 3 skipped**.
- **Не включено в коммит:** чужая незавершённая работа по электронному
  актированию (`src/components/ContractAcceptance`, `src/services/Acceptance`,
  `Acceptance*` и миграция в `csms-api`, правки `Program.cs`, `EisDbContext.cs`,
  model snapshot, `db.json`).

## 57. Электронное актирование по ст. 94 44-ФЗ (2026-11-20)

- **Домен:** `ContractAcceptance` — машина состояний (черновик → направлен
  заказчику → принято / принято с расхождениями / мотивированный отказ /
  возврат на уточнение → регистрация в ЕИС), позиции с НДС, недостатки,
  журнал и `Revision` как токен оптимистичной блокировки.
  `AcceptanceRules` проверяет срок 1–20 рабочих дней, экспертизу, комиссию,
  даты, суммы, недостатки и код результата ЕИС.
- **Application/Infrastructure:** `AcceptanceService`, команды,
  `IAcceptanceRepository`, `InMemoryAcceptanceRepository` и
  `EfCoreAcceptanceRepository`; схема `contract` (`contract_acceptances`,
  `acceptance_positions`, `acceptance_defects`, `acceptance_events`),
  миграция `20261120160000_AddContractAcceptance`, snapshot и регистрация в
  `Program.cs`.
- **API:** `/api/acceptances` — список, `meta`, `validate`, карточка,
  создание/правка, позиции, недостатки, `submit/accept/refuse/return/register/
cancel`. Отдельного `PUT /status` нет: статус меняет только сценарий домена.
- **Фронтенд:** `src/services/Acceptance/` (типы и хуки) и
  `src/components/ContractAcceptance/` — реестр, форма условий и карточка с
  позициями, недостатками, итогами, действиями, историей и печатью акта.
  Роуты `/acceptances`, `/new`, `/:id`, `/:id/edit`; в реестре контрактов —
  кнопка «Приёмка» с `?contractId=`.
- **Интеграция со ст. 95:** карточка приёмки ссылается на изменения и
  расторжения по контракту, карточка изменения — на приёмки; оба реестра
  читают `contractId` из query. Приёмка по расторгнутому/исполненному
  контракту блокируется правилами, изменение/расторжение — по своим правилам.
- **Проверки:** `dotnet build` — 0; `dotnet test --filter Acceptance` —
  **83 passed / 4 skipped** (PostgreSQL-тесты без `EIS_TEST_DB`); `npx tsc -b`
  — 0; `npx oxlint src` — 0 ошибок (только предупреждения); `npx vite build` —
  успешно.
- **Коммиты:** `csms-api` — модуль актирования, миграция, snapshot, тесты и
  бриф; `csms` — клиент, экраны, роуты и интеграция с реестром контрактов.
  `db.json` не включён: правка ИКЗ и реестрового номера в нём не относится к
  этой задаче.

## 58. Каталог UI-решений в шапке (2026-11-20)

- **Задача:** вывести в шапку полный структурированный перечень всех
  UI-решений с кратким описанием, назначением и местом применения.
- **Решение:** пункт «UI-решения» в `Header` ведёт на `/ui-solutions` —
  отдельную страницу-каталог. В самой шапке остаётся точка входа (иначе 50+
  карточек не помещаются в навигацию).
- **Данные:** `src/components/UiSolutions/uiSolutions.config.ts` — типы
  `UiSolution` (`id`, `title`, `purpose`, `usage`, `implementation`) и
  `UiSolutionGroup`; 10 групп и 64 решения: основа и темы, контролы,
  справочники, обратная связь, экраны, таблицы, формы, навигация,
  доступность, прикладные сценарии. `uiSolutionTotal` считается из массива.
- **Страница:** `src/components/UiSolutions/UiSolutionsPage.tsx` — поиск по
  названию/назначению/месту/реализации, чипы групп со счётчиками, карточки с
  блоками «Назначение», «Где применяется», «Реализация», пустое состояние.
  Стили — `UiSolutions.module.scss` на ролях темы.
- **Роут и шапка:** `src/App.tsx` — `/ui-solutions`; `Header.tsx` — пункт
  «UI-решения» рядом со «Справка».
- **Проверки:** `npx tsc -b` — 0; `npx oxlint src` — 0 ошибок (только
  предупреждения); `npx vite build` — успешно.
- **Документация:** `PROJECT.md` — строка `/ui-solutions` в таблице экранов и
  абзац про пункт шапки.

## 59. Аудит готовности цепочки ПГ → СЗ → Извещение → Контракт к XML ЕИС (2026-11-20)

- **Запрос пользователя:** проверить, готова ли цепочка отдать на бэк валидные
  данные для XML, все ли справочники готовы, что подтягивается из прошлых стадий
  и конфигурации заказчика; дефрагментировать с объёмом в процентах и показать,
  какие XML не покрыты скачанным пулом.
- **Документ:** `csms/docs/tasks/eis-chain-readiness.md` — полный аудит, карта
  покрытия, дефрагментация на 17 пакетов (сумма 100 %) и порядок запуска агентов.
  Пакеты разделены по исполнителям: 16 фронтовых задач `Ф1–Ф16` (56 %) и
  12 бэк-задач `Б1–Б12` (44 %); идентификаторы `Ф*`/`Б*` сведены в таблицы §7.
- **Три потока (2 фронта + 1 бэк):** Фронт-1 — цепочка и реестр, `Ф4/Ф5/Ф6/Ф7/
  Ф12/Ф15/Ф16` (29 %), единственный владелец `eisXsdCoverage.ts`; Фронт-2 —
  XML/ЭП/справочники/исполнение, `Ф1/Ф2/Ф3/Ф8/Ф9/Ф10/Ф11/Ф13/Ф14` (27 %);
  Бэк — весь `csms-api/**` и `eis-parser/**`, `Б1–Б12` (44 %). Зоны не
  пересекаются по файлам; интерфейсы между потоками и порядок запуска — §§7, 8.
- **Готовые брифы для раздачи:** `csms/docs/tasks/eis-front-agents-briefs.md` —
  два самодостаточных задания для Фронт-1 (29 %) и Фронт-2 (27 %) с общими
  правилами git/проверок, зонами файлов, списками задач и критериями готовности.
- **Бэк-поток стартовал (2026-11-21, коммит `csms-api ea8466d`):** `Б3` готов —
  `ReviseAsync` сохраняет готовый XML вместо пересборки заглушкой, в `/revise`
  можно передать исправленный `payloadXml`, XSD из `schemas/**` копируются в
  output сборки; 287 тестов зелёные. `Б1` частично — `csms-api/docs/eis-xsd-roots.md`
  фиксирует глобальные корни 17.0: `tenderPlan2020`, `fcsNotificationEF`,
  **`cpContractProject`** (не `contractProject`), `contract`, `contractExecution`,
  `fcsCustomerReportSmallScaleBusiness`, плюс обязательную оболочку
  `as2PacketType/index`. Это ответ Фронт-2 по `Ф1`. ТФФ 658/215н и 918 по-прежнему
  нет, `placeholder-v0` не заменяется.
- **Вердикт:** интерфейс и сквозное предзаполнение готовы на ~80–85 %, но контур
  передачи валидных данных в ЕИС — на ~20–30 %. Бизнес-цепочка
  ПГ → СЗ → Извещение → проект контракта по ИКЗ, ОКПД2, НМЦК, КБК, способу,
  срокам, реквизитам заказчика и требованию СМП реализована; ЕИС-шлюз получает
  `payloadXml` только для `Notification`/`ContractProject`, остальное —
  `placeholder-v0`.
- **Ключевые разрывы:** нет маппера домена в XML; корни превью
  (`notificationEF2020`, `contractProject`) не совпадают с глобальными
  элементами XSD 17.0; `ReviseAsync` затирает настоящий XML заглушкой; в DTO
  пакета нет связи с исходными документами и реквизитами заказчика; XSD-валидация
  в runtime может быть отключена (`EIS_SCHEMAS_ROOT` не задан); `buildEisChains`
  определена, но не вызвана в UI; ПГ и СЗ не являются типами пакетов.
- **Уточнение по XSD:** нужные типы (`tenderPlan2020Type`, `notification2020Type`,
  `contractProjectType`, `zfcs_contract2015Type`, `contractExecution*`) в Альбоме
  17.0 есть (32 XSD + 16 WSDL, 8720 типов); отсутствуют утверждённые формы ТФФ
  по 658/215н и 918. Скачанные наборы: `csms-api/schemas/17.0/`,
  `csms/eis-parser/schemas/Schemas44/`, `public/eis-schemas/catalog.json`.
- **Справочники:** единственный живой датасет — ОКПД2, 21 066 записей с версией
  и SHA-256 в `/api/references/*`; КТРУ демо (6), токен ЕИС для `getDocsIP` не
  получен; адреса (89/31), ОКЕИ (543), организации (6) есть, но countries/ОКТМО/
  КБК/валюты — ручной ввод. `koksRefs` — чужая WIP, не трогать.
- **Покрытие полей (`EIS_XSD_COVERAGE`):** 166 полей, 60 `mapped`, 66 `partial`,
  24 `missing`, 16 `derived` → 56 % строго / 76 % при `partial` за покрытые.
  Нули: отчёт СМП (`SmnpReport.fields = []`) и приёмка (все 7 полей `partial`).
- **Не трогать по-прежнему:** `db.json`, `src/services/KoksRef/`, электронное
  актирование `Acceptance*`/`ContractAcceptance` (чужая WIP).

## 60. Фронт-2: оболочка пакета `as2PacketType`, гейт валидации, DTO пакета (2026-11-21)

- **Ф1 (`Ф1` закрыт по объёму брифа):** новый модуль `src/services/Eis/eisPacket.ts`
  — единственное место, где собирается оболочка интеграционного пакета
  (`EIS_PACKET_DESCRIPTORS` + `buildEisPacket`). Три превью
  (`buildTenderPlan2020XmlPreview`, `buildNotification2020XmlPreview`,
  `buildContractProjectXmlPreview`) больше не начинаются с «голого» документа:
  корень — глобальный элемент пакета, внутри `index` (id 36 симв., sender,
  receiver, createDateTime, objectType, objectId, indexNum, signature,
  mode) и `data`.
- **Правила оболочки, проверенные валидацией по `csms-api/schemas/17.0`
  (32 XSD, XmlSchemaSet):**
  1. Элементы пакета — в `http://zakupki.gov.ru/oos/integration/1`, документ
     внутри `data` — в пространстве своего типа. Поэтому корень печатается с
     префиксом `p:`, а `xmlns` по умолчанию переключён на namespace документа:
     тело остаётся без префиксов и попадает в нужное пространство.
  2. `schemeVersion` обязателен **у `data`**, а не у корня пакета (у корня
     атрибутов нет вовсе) — старая запись `schemeVersion` на корне была ошибкой.
  3. `index/signature` обязателен; в превью он пустой (`xs:base64Binary`
     допускает пустое значение), заполняется при подписании.
  4. `<data>` в namespace документа (`xmlns="..."` на самом `data`) ломает
     валидацию: `data` обязан быть в integration/1, в namespace документа
     должны быть только его дети.
- **Найдено по XSD и внесено в отчёт Фронт-1:** в Альбоме 17.0 есть глобальные
  корни только для `fcsNotificationEF` и `fcsNotificationCancel` — корней для
  ЕОК/ЭЗК/ЭЗТ/ЕМЗ нет. В `IntegrationTPTypes.xsd` (наш план-график) **нет**
  элементов `approveDate` в `commonInfo`, `execution/term`, `periodicity`,
  `basementInfo` — они из `zfcs_purchasePlanCommonInfoType` /
  `zfcs_purchasePlanPositionType` (план закупок 2020, другой документ).
  Записи карты покрытия `ПГ` с этими полями нужно перепроверить.
- **Ф3:** `EisPackagesPage.create()` прогоняет `validateNoticeInfoEis17` /
  `validateContractProjectEis17` до создания пакета и останавливается на
  ошибках; исключение валидатора (старые проекты без `eisInfo`) не блокирует
  создание — отвечает шлюз. Побочный эффект: демо-извещения из `db.json` имеют
  ошибки «не приложены документы Раздела 2» (у извещения 1 — 2, у 2 — 4),
  поэтому пакет по ним теперь не создастся, пока документы не приложены.
- **Ф8:** `CreateEisPackageInput` расширен `source` (`documentKind`,
  `documentId`, `documentNumber`) и `customer` (снимок реквизитов заказчика);
  тело запроса валидируется `createEisPackageInputSchema` перед отправкой.
  Спецификация для `Б4` — `csms/docs/tasks/eis-package-dto.md`. Шлюз лишние
  поля игнорирует (System.Text.Json), поэтому фронт разблокирован.
- **Проверки:** `npx.cmd tsc -b` — чисто; `npx.cmd oxlint src` — 0 ошибок,
  84 предупреждения (ни одного в файлах этой сессии); `npx.cmd vite build` —
  успешно (только предупреждение о размере чанка).
- **Осталось по Фронт-2:** `Ф2` (сценарии «истёк серт» / «чужой ИНН»),
  `Ф9` (КТРУ и адреса из `/api/references/*`, версия/SHA, демо-предупреждение),
  `Ф10` (ждёт `Б6`: страны/ОКТМО/КБК/валюты), `Ф11` (строки карты для Фронт-1),
  `Ф13` (ждёт `Б9`), `Ф14` (ждёт `Б10`). Тело извещения и проекта контракта
  по-прежнему собрано под старые типы (`notificationEF2020Type`) — нужен
  доменный маппер `Б9`; оболочка при этом уже валидна, и ошибки XSD теперь
  относятся только к телу документа.

## 61. Бэк: маппер приёмки Б7 и уточнения оболочки от Фронт-2 (2026-11-21)

- **Б7 закрыт по объёму маппера:** новый
  `csms-api/src/Csms.Infrastructure/AcceptanceXmlMapper.cs` собирает пакет
  ЕИС 17.0 по `ContractAcceptance`, не меняя домен. Корень —
  `ceContractExecutionDocAcceptance` (большая закупка / ЭА, ЦРК),
  `objectType=CRK`, внутри `data` — `docAcceptanceInfo` с позициями и
  `fulfilledCost`. Альтернативный корень малой закупки
  (`cemContractExecutionDocAcceptance`, строка 5945) зафиксирован в
  `csms-api/docs/eis-xsd-roots.md`, но не включается без признака способа
  закупки в домене.
- Значения из справочников (**код `nsiContractExecutionDoc`, СПЗ заказчика,
  код `nsiVAT`**) передаются явным `AcceptanceXmlContext`; маппер не подбирает
  их по названию. Нет реестрового номера (19 цифр), даты документа, номера или
  позиций — `DomainException` с именем поля. Маппер остаётся отдельным от
  `PlaceholderXmlBuilder`: заглушка `placeholder-v0` не выдаётся за готовый XML.
- Уточнения оболочки от Фронт-2 внесены в `docs/eis-xsd-roots.md`:
  `schemeVersion` — атрибут `data`, документ получает свой namespace через
  `xmlns` на корне, пустая подпись валидна. 5 новых тестов
  (`AcceptanceXmlMapperTests`) гоняют XML через `EisSchemaCatalog` на всех
  32 XSD версии 17.0.
- **Проверки:** `dotnet test` — 292 пройдено, 0 провалено, 10 пропущено
  (Postgres-тесты без БД); сборка с `-p:BaseOutputPath` в temp, штатный `bin`
  занят запущенным `Csms.Api.exe`.
- **Хендофф:** `Б4` снова свободен — Фронт-2 прислал спецификацию
  `csms/docs/tasks/eis-package-dto.md` (`source` + снимок `customer`). Брать
  его только после коммита этого блока и не трогая чужие WIP (`db.json`,
  `Acceptance*`, `KoksRef/`, `src/services/Eis/generated/**`).

## 62. Бэк: Б4 — источник пакета и снимок заказчика (2026-11-21)

- Принята спецификация Фронт-2 из `docs/tasks/eis-package-dto.md`.
  `CreatePackageRequest` расширен полями `source` (`EisPackageSource`:
  `documentKind`, `documentId`, `documentNumber`) и `customer`
  (`EisCustomerSnapshot`: 9 опциональных реквизитов). Оба поля необязательны,
  старые запросы работают без изменений.
- Домен: `Csms.Domain/EisPackageOrigin.cs`, `EisPackage` хранит `Source` и
  `Customer` как неизменяемые свойства, фиксируемые в `Create`. Пустой
  `documentId` или неизвестный `documentKind` — `DomainException`; поля
  обрезаются и проверяются на длину. `Restore` возвращает их из хранилища.
- Хранилище: `eis.packages` получило две nullable-колонки `jsonb` —
  миграция `20261121120000_AddEisPackageOrigin`, снимок модели обновлён.
  `MapInto` намеренно не перезаписывает источник/снимок при подписи и возврате
  в работу: снимок объясняет, что именно подписывалось.
- API отдаёт `source` и `customer` в `EisPackageResponse`; десериализация
  проверена тестом с настройками `Program.cs` (camelCase + строки-перечисления).
- **Проверки:** `dotnet test` (с `-p:BaseOutputPath` в temp) — 299 пройдено,
  0 провалено, 10 пропущено (Postgres без БД); новых предупреждений нет.
- **Дальше по бэк-потоку:** `Б5` (КТРУ/адреса), `Б6` (страны/ОКТМО/КБК/валюты),
  `Б9` (доменный маппер тела извещения/проекта контракта), `Б10` (для `Ф14`).
  `Б4` считается закрытым; в чужие WIP не входили.

## 63. Бэк: Б7 endpoint, Б6 каталог справочников, часть Б10 (2026-11-21)

- **Б7 доведён до API:** `POST /api/acceptances/{id}/eis-package` собирает
  XSD-валидный пакет по принятому документу о приёмке. Оркестрация вынесена в
  `AcceptanceEisPackageBuilder` (проверка статуса, явных справочников и XSD),
  endpoint остался тонким. Собственные маршруты электронного актирования не
  тронуты.
- **Б6 закрыт по объёму API:** добавлен `ReferenceDatasetCatalog` с кодами
  `nsiOKPD2`, `nsiKTRU`, `nsiKLADR`, `nsiOKSM`, `nsiOKTMO`, `nsiKBK`, `nsiOKEI`,
  `nsiCurrency`; новый `GET /api/references/catalog` показывает их до импорта.
  `ReferenceImportNormalizer` теперь достаёт код/имя из полей конкретного
  справочника (`OKEI`, `OKSM`, `OKTMO`, `KBK`, `digitalCode` и др.), сохраняя
  совместимость со старыми выгрузками. Официальные URL для автоимпорта этих
  датасетов не выдумывались: импорт выполняется вручную через
  `POST /api/references/import`.
- **Часть Б10:** `ContractCancelXmlMapper` + `ContractCancelEisPackageBuilder`
  и `POST /api/contract-changes/{id}/eis-package` собирают `contractCancel`
  (`objectType=CT`, `currentContractStage=IN`) по подписанному расторжению из
  `ContractChange`. XML проходит XSD 17.0; реестровый номер и дата приходят из
  домена, а не подбираются.
- **Проверки:** `dotnet test` с temp `BaseOutputPath` — 313 пройдено,
  0 провалено, 10 пропущено (Postgres без БД). Миграция и чужие WIP не тронуты.
- **Остаётся открытым:** `Б1`, `Б5`, `Б9` и полный `Б10` (оплата, СМП, этапы,
  реестр) требуют утверждённых ТФФ 658/215н и 918, токена ЕИС и доменных
  сущностей, которых в API пока нет. `placeholder-v0` не подменяется.

## 64. Отдельный eis-parser: четырёхэтапный конвейер ЕИС 44-ФЗ (2026-11-21)

- **Где искать:** `eis-parser/` (своё решение .NET 9, не смешивается с csms-api).
  Старый код (`Eis44Client`, `PollingWorker`, таблица `Tenders`) сохранён для
  совместимости; SOAP-транспорт вынесен в `EisSoapClient`.
- **Этапы:** `EisSoapClient` (опрос, токен в SOAP+HTTP, Polly, пауза 400 мс),
  `ArchiveDownloader` (потоковая загрузка ZIP на диск + SHA-256 + проверка
  целостности), `ArchiveProcessor`/`EisDocumentParser` (потоковый XML, поиск по
  `LocalName`), `EisPipelineRepository` (EF Core, upsert). Оркестратор —
  `EisPipelineRunner`, CLI `--pipeline-once`.
- **Схема БД:** `eis-parser/sql/001_pipeline.sql` — `eis_sync_state`,
  `eis_archive_queue`, `raw_documents`, `purchases`, `purchase_items`,
  `contracts`, `participants`. Сырой XML хранится всегда, даже для
  нераспознанного типа документа, чтобы перепарсить без повторной выгрузки.
- **Сверка с XSD вместо копирования ТЗ из поисковой выдачи:** в
  `getDocsIP-ws-api.xsd` 17.0 у `getDocsByOrgRegionRequest` нет интервала
  `from/to` — только `exactDate` или `oneHourInfo`; кодов `RPZ/RBG/RNP` в
  списке 44-ФЗ нет (`RPZ223` — 223-ФЗ), НСИ — отдельный `getNsiRequest`.
  Рабочий хост — `int.zakupki.gov.ru` через ГОСТ-туннель, не `int44`.
- **Проверки:** `dotnet test eis-parser/...` — 40/40 зелёных; `dotnet build`
  решения и `--validate` воркера — без ошибок. Тесты закрывают порядок SOAP,
  ошибки ЕИС, ретраи Polly (свежий HttpRequestMessage на каждую попытку),
  токен при скачивании, ZIP-целостность, LocalName-парсинг, идемпотентность БД
  и досоздание таблиц в старой SQLite-БД. При живом прогоне с туннелем найдены и
  исправлены: рассинхрон имён колонок EF и DDL, а также нулевой exit code при
  ошибках опроса (теперь неудачные срезы учитываются в `Failed`).
- **Реальные XML для маппинга (2026-11-21):** пользователь прислал из карточек
  закупок четыре документа, сохранены в `eis-parser/test-data/`: ЕОК
  `0144200001826000192`, электронный аукцион `0144200001826000201` (КТРУ и
  ОКПД2 вложены друг в друга, рядом code характеристик), `control99NoticeCompliance`
  и `EXP_Notice_BO` Казначейства. По ним добавлены тесты маппинга и режим
  `--parse-file` (разбор без токена/туннеля). Исправлено: ИКЗ берётся из
  `IKZInfo/purchaseCode`, заказчик — из `purchaseResponsibleInfo`, позиции — из
  `purchaseObjectsInfo/purchaseObject`, коды — из `OKPDCode`/`KTRUCode`,
  печатная форма — из `printFormInfo`, версия Казначейства — из `versionID`.
- **Настоящий ZIP ЕИС и контракты (2026-11-21, вторая волна):** пользователь
  прислал `Contract_2462904043925000011_25_20261121.zip` (10 XML: 1 контракт +
  9 `contractProcedure`), сохранён как `eis-parser/test-data/contract-...zip`
  (для него добавлено исключение в `.gitignore`), и печатную форму проекта
  доп. соглашения `cpContractProjectLKP`. Тесты на весь архив и на проект
  доп. соглашения (в т.ч. второй проект другого подрядчика с полями
  `numberAdd`/`docNumberAdd`) доводят число тестов до 44. Исправлено: корень экспортных
  файлов — универсальный `<export>` (тип задаёт первый вложенный тег), `regNum`
  контракта — непосредственный ребёнок `<contract>`, позиции — в
  `<products>/<product>` с собственным `<name>` (внутри сначала идёт `<name>`
  классификатора ОКПД2), исполнитель в проекте доп. соглашения — в
  `participantInfo/legalEntityRFInfo`, приоритет `contract` над `project` в
  `DetectKind`, дата проекта — из `commonInfo/dateCreate`. Печатная форма
  перегенерируется с новым `dateCreate` при каждом открытии — содержимое
  остальное то же, в фикстуре зафиксирован один из вариантов.
- **Настоящий `export.zip` из getDocsIP и электронные контракты (2026-11-21,
  третья волна):** пользователь прислал `C:\Users\liven\Downloads\export.zip`
  — один `export.xml` на 8,4 МБ с 217 документами (10 `contract` + 207
  `contractProcedure`). Выяснено, что сервис отдачи складывает много документов
  в один XML, поэтому `ArchiveProcessor` теперь разбивает `<export>` по детям и
  даёт имена вида `export.xml#N-contract`. Полный файл проверен локальным
  тестом: 217 документов без ошибок. У `contractProcedure` нет ИКЗ/цены, только
  `regNum` контракта: добавлен `EisDocumentKind.ContractProcedure`, такие
  документы идут только в `raw_documents` и не перезаписывают контракт (тест
  `ContractProcedureDoesNotOverwriteContract`). Также присланы и зафиксированы
  в `test-data/`: `cpContractProject` 16.2, `cpElectronicContract` 16.1/16.2
  (позиции в `<productInfo>`, классификаторы в `OKPD2Info`/`KTRUInfo`, итог в
  `contractPriceInfo`, а не в первом `<price>`), `cpDelta`, платёжное поручение
  и заявление ESMV, оба контрольных сообщения Казначейства (`NoticeCompliance`
  и `BeginMessage` для `tenderPlan2020`). Неизвестные корни сохраняются как
  raw. Печатные формы генерируются с новым `dateCreate` — проверяется только дата.
- **Печатная форма плана-графика XLSX (2026-11-21):** пользователь прислал
  `Сведения плана-графика закупок.zip` — внутри один `print form.xlsx` (163
  строки: заказчик, ИКЗ, ОКПД2, объект закупки, год и объём финансирования на
  2026–2028 годы). Сохранён как `eis-parser/test-data/tender-plan-print-form.zip`.
  Это не XML: `ArchiveProcessor` разбирает только XML, но сам архив сохраняется
  сырым на диске и в `archives` ещё до разбора (см. `EisPipelineRunner`), так что
  данные не теряются. По решению пользователя полный маппинг XLSX→БД не
  выполняется (отдельная задача с новой схемой); код парсера не менялся.
- **ЭЦП из карточки (2026-11-21):** пользователь прислал
  `Печатная_форма_19.11 (1).2026_ЭЦП` — base64 CMS/PKCS#7, отсоединённая подпись
  (eContent отсутствует, восстановить подписанный документ из неё нельзя),
  время подписи 19.11.2026, внутри сертификат подписанта с ФИО/ИНН/СНИЛС и
  сертификат Казначейства. В репозиторий НЕ добавлять (персональные данные) и в
  парсинг не включать: конвейер разбирает только XML. То же относится ко второму
  файлу `Печатная_форма_19.11.2026_ЭЦП`.
- **Где брать XML план-графика:** XLSX-архив из карточки содержит только печатную
  форму. Публичный сырой XML найден без токена: карточка
  `/epz/orderplan/pg2020/general-info.html?plan-number=202601442000018001`
  (реестровый номер из `controlObjectsInfo/controlObjectInfo/number` в control99,
  версия 48.0 от 19.11.2026) → вкладка «Вложения» → взять `printFormId` из ссылки
  печатной формы и заменить `view.html` на `viewXml.html`:
  `https://zakupki.gov.ru/epz/orderplan/os/printForm/viewXml.html?printFormId=212758858`.
  Корень `<ns9:tenderPlan2020>` схемы 16.3, 384 КБ, 120 позиций. Через `getDocsIP`
  план выгружается подсистемой `RPGZ` (`getDocsByReestrNumberRequest` с тем же
  `reestrNumber` или `getDocsByOrgRegionRequest` с типом из `nsiDocumentTypes`).
  Превью из `PurchasePlanCard.tsx` — локальная генерация, не выгрузка ЕИС.
- **Маппинг плана-графика (2026-11-21):** фикстура `tenderPlan2020-real.xml` +
  тест; добавлен `EisDocumentKind.TenderPlan`. Раньше корень `tenderPlan2020`
  попадал в `Purchase`, и `<purchaseNumber>` позиций (`0001`, `0002`…) создавал
  мусорную запись в `purchases`. Теперь план сохраняется только в `raw_documents`
  (аналогично `contractProcedure`), отдельной сущности `plans` пока нет.
  Всего 46 тестов.
- **Все три конкурентных способа с реальными XML (2026-11-21):** открытый конкурс
  в электронной форме (`epNotificationEOK2020`, 0144200001826000192), электронный
  аукцион (`epNotificationEF2020`, 0144200001826000201) и электронный запрос
  котировок (`epNotificationEZK2020`/ZKP20, 0144200001826000194 — новая фикстура
  и тест). Для EZK маппинг сработал без правок парсера: ИКЗ из `IKZInfo`, цена из
  `maxPriceInfo`, две позиции (КТРУ с вложенным ОКПД2 и позиция только с ОКПД2),
  а вложенный в `IKZInfo` `purchaseNumber=0126` не перезаписывает номер закупки.
- **Вторая волна образцов 21.11.2026:** прислан ещё один открытый конкурс
  `0144200001826000128` — схема 16.2, способ OKB20 (строительство), с блоками
  `criteriaInfo` и казначейского сопровождения; зафиксирован как
  `epNotificationEOK2020-construction-real.xml` с тестом (всего 43 теста).
  Маппинг сработал без правок парсера, вложенный в `IKZInfo` `purchaseNumber=0066`
  не подменяет номер закупки. Также прислан подписанный электронный контракт
  `118Р_26` по закупке `0144200001826000118` (поставщик ООО "ГАЗ РЕСУРС",
  383 021 243,01 ₽) — `cp-electronic-contract-gaz-resurs-real.xml` с тестом
  (всего 44 теста). Особенности: позиция вложена в
  `<productsInfo>/<productsInfoElectronicContract>/<productInfo>`, только ОКПД2
  42.11.20.200 без КТРУ; дата PUBLISH берётся из `protocolInfo/publishDTInEIS`,
  отдельной даты подписания контракта в XML нет. Ещё три файла
  «Электронный документ, полученный из внешней системы.xml» — внутренние
  представления протокола комиссии с несколькими корневыми элементами, ФИО,
  отпечатками сертификатов и IP; это не корректный XML и не выгрузка ЕИС, в
  репозиторий и парсер не добавлены, для протоколов нужен XML печатной формы с одним корнем.
- **Не закрыто:** живая выгрузка всё ещё заблокирована регистрацией токена в ЕИС
  («Токены для сервисов отдачи отсутствуют»); пользователь получает тестовый
  доступ. Формат ответа `getDocsIP` уже известен по присланному `export.zip`,
  но сам SOAP-обмен с токеном не проверен. Коды справочников не выдумываются.
  `db.json` и `SidePolarCurves.tsx` — чужая WIP, не тронуты.



## 65. Новые публичные источники и форматы eis-parser (2026-11-21, ночь)

- **Правила нормирования без токена.** Найдена открытая точка
  `https://zakupki.gov.ru/epz/normalizationrules/search/results.html` (более
  230 000 записей). Карточка → ссылка `printForm/view.html?printFormId=…` →
  меняем `view.html` на `viewXml.html`, получаем корректный XML с корнем
  `<fcsRegulationRules>` (тип `zfcs_regulationRulesType` из XSD 17.0).
  Добавлены `NormalizationRulesParser`, `NormalizationRulesClient`,
  модели `RegulationRuleDocument`/`RegulationRuleAttachment`, типы правил 1–10,
  фикстуры `test-data/norm-rule-672586.xml` (тип 7, требования к отдельным
  видам) и `norm-rule-672611.xml` (тип 9, нормативные затраты). Это авторитетный
  источник для проверки нормативов в плане-графике по 44-ФЗ. В репозитории —
  только XML без персональных данных; вложения (`docx`) не скачивались.
- **Запрос ценовых предложений.** Пользователь прислал печатную форму
  `fcsRequestForQuotation` (id 3523485, ОКУ "Курскавтодор"). У документа нет
  `purchaseNumber` и ИКЗ — только `<id>`, поэтому добавлен
  `EisDocumentKind.PriceRequest`, `PriceRequestParser` и модели. В `purchases`
  не пишем, только `raw_documents`. Фикстура
  `test-data/pricerequest-fcsRequestForQuotation-real.xml`. `--parse-file`
  теперь сам определяет этот корень и печатает нужные поля.
- **XLSX экспертного совета № 89 от 20.11.2026.** Скачан архив `id=44666`
  (70 `.xlsx` + 12 `.xls`), распакован WinRAR во внешний `%TEMP%`. Добавлен
  `KtruXlsxParser`: читает XLSX напрямую через ZIP+XML без NuGet, распознаёт
  два шаблона («Идентификатор или № id…» и «Код каталога ХХХХХХХХХ-…»),
  собирает код, ОКПД2, единицу и характеристики. Две реальные фикстуры
  сохранены в `test-data/` под исходными именами (код КТРУ берётся из имени
  файла): `22.22.12.000-00000003 Сумка хозяйственная.xlsx` и
  `128660 Лактат ИВД, реагент.xlsx`. **Это предложения экспертного совета,
  не реестр КТРУ** — результат годится только как источник характеристик для
  ручной сверки с `nsiKTRU`. `.xls` (BIFF) не читается, в репозиторий не добавлялся.
- **Каталог НПА (`sectionId=907`)** — PDF-файлы (44-ФЗ, ПП РФ № 1875, № 719
  и др.), а не XML/таблицы; для конвейера они не являются заменой КТРУ/NSI.
  Скачанные PDF во внешнем `%TEMP%`, в репозиторий не добавлялись.
- **CLI:** `--parse-file` умеет три корня (`EisDocumentParser`,
  `fcsRegulationRules`, `fcsRequestForQuotation`), добавлен `--parse-xlsx`.
  Проверки: `dotnet build` — 0 предупреждений/0 ошибок, `dotnet test` —
  **57/57 зелёных** (+11 новых), smoke-запуски трёх CLI-режимов — exit 0.
- **Не закрыто:** живая выгрузка `getDocsIP` по-прежнему заблокирована
  регистрацией токена в ЕИС. `db.json` — чужая WIP, в коммит не входила.

## 66. КоАП v3, КТРУ из публичного ЕИС и данные клиента (2026-11-21)

### КоАП / Liability Mapping (`csms-api`)

- **Проблема старого прогона:** обязанность `158n-3-1-1` («разрабатывает
  план-график») получала `КоАП РФ ст. 2.9.1 ч. 1` (`blanket`) вместо эталонной
  `7.30.1 ч. 1`. Причины: бланкетные `2.*`/`4.*` не отфильтрованы, FTS по всей
  формулировке превращался в длинный `AND` и терял узкую норму, промпт не
  требовал цитату, валидатор не проверял обоснование.
- **Исправлено:** `KoapImporter` помечает статьи `2.*`/`4.*` как `procedural`;
  `LiabilityMappingRules` — `PromptVersion=liability-arbiter-v3`,
  `RulesVersion=liability-rules-v3`, `NonLiabilityMarkers`,
  `ProcurementDomainMarkers`, `PlanSchedulePhrases`, `DomainCandidateLimit=20`,
  `DomainSpecialBoost=1.35`; `EfCoreLiabilityRetriever` — hard-filter
  процедурных/освобождающих норм и детерминированный доменный поиск special-норм
  с обязательным упоминанием план-графика; `MappingValidator` — исключение норм
  с маркерами прекращения дела и проверка проверяемой цитаты в `legal_reasoning`;
  `LiabilityArbiterPrompts` — прямой запрет `2.9/2.9.1` и требование кавычек.
- **Состояние БД `:5433` после SQL-правки:** `legal.liability_norms` — 2871 запись,
  `liability_norm_chunks` — 3303; `general=138`, `procedural=260`, `special=2473`;
  `2.9.1` — `procedural`, `7.30.1` — `special` / `in_force`.
- **Контрольный прогон:** `run_id=67669359-51aa-fd3f-3051-05aa98a6737d`,
  `candidate_count=30`, `matched=1`: `КоАП РФ ст. 7.30.1 ч. 1`, `partial`,
  `0.80`, `requires_human_review=true` (честный результат маленькой модели —
  нет ложного `2.9.1`, норма найдена и записана, но юристу нужна проверка).
  В пуле `7.30.1` идёт rank 23; `1.1` осталась только как umbrella general
  rank 24/25 и в результат не попала; `2.9.1` отфильтрована. Итог в
  `legal.duty_liability_mappings`, кандидаты — в `legal.mapping_candidates`,
  аудит — в `legal.llm_audit_log`. После контрольного прогона всего в БД:
  `duties_mapped=5`, `mappings=30`, `candidates=493`, `audit_rows=60`.
- **Проверки:** `dotnet build` — 0 ошибок (1 старое предупреждение xUnit2009),
  `dotnet test --no-build` — **314 passed / 10 skipped / 324 total**,
  `npx.cmd tsc -b` — чисто, `npx.cmd oxlint src` — только предупреждения,
  `npx.cmd vite build` — успешно. Добавлен тест на непроверяемую цитату.
- ⚠️ **Рассинхронизация миграций в `csms-api`:** в БД есть
  `20261120154010_AddContractSmpRecords` без исходника, в репозитории —
  `20261121120000_AddEisPackageOrigin` без записи в `__EFMigrationsHistory`.
  Не «чинить по пути», это отдельная задача.

### КТРУ (`csms` + `csms-api`)

- Массовый SOAP `getNsiRequest` требует тот же токен ЕИС, что и `getDocsIP`;
  использован публичный обход без токена: поиск
  `zakupki.gov.ru/epz/ktru/search/results.html` → 898 уникальных кодов →
  печатные формы `/epz/ktru/position/printForm.html?dsUid=…`. Успешно загружено
  **176 карточек**, остальные 722 ответили 403 — пропущено честно, без выдумывания.
- Импорт: `POST /api/references/import` с `dataset=nsiKTRU`, версия
  `ktru-public-20261121-176`, `sourceUrl` публичного поиска, SHA-256 исходного
  файла `c87e4d07…`, хеш набора `42AF43…`. Демо-версия `sse-073720` заменена.
  `GET /api/references/nsiKTRU/all` и `/items?take=1000` возвращают 176 записей.
  ⚠️ Печатные формы не содержат таблицу характеристик, поэтому `characteristics`
  у этих позиций пустые; для характеристик нужны карточки/XML или ручная сверка
  с XLSX экспертного совета (§65).
- Фронт: `ktruRef.api.ts` читает `/api/references/nsiKTRU/items?take=1000`
  (именно `/items`, потому что `/all` не отдаёт `payloadJson` с единицей измерения),
  мапит в `KtruRef` и сохраняет оверлей в `db.json`; `referenceData.api.ts`
  экспортирует `referenceApi`, добавил `payloadJson` и инвалидирует `ktruRefs`.
  В `LiabilityMappingPage.tsx` добавлен блок «Ответственность КС» с поиском по
  КТРУ. ⚠️ json-server держит `db.json` в памяти — после правки перезапустить
  `npm run server`.

### Данные клиента

- По ссылке реестра контрактов ЕИС (`customerIdOrg=01442000018…`, ИНН
  4629040439) распарсено **517 контрактов**, добавлены в `contractRegistry`
  (всего 523). Это самый дешёвый способ онбординга: публичный поиск без ЭЦП и
  токена, но только реестр контрактов — закрытые документы/подписи так не получить.
- Создан пользователь `poyarkova_nyu@mail.ru` / `qwerty12` (user id7, employee
  id42, КС id5 org6), `POST /api/access/login` и `/api/access/me` → 200,
  `myRole="Руководитель службы (п. 2.3)"`, `isHead=true`,
  `roles=["administrator","contract_service_head"]`, все 7 прав. Исправлены
  битые ссылки `structuralUnitId=60` → 33 у employee 42 и КС 5 (иначе
  json-server 0.17.4 удалит записи при следующей мутации).
- API для фронта сохранён на `http://localhost:5099` с `EIS_STORE=postgres`,
  `ConnectionStrings__EisDb=Host=localhost;Port=5433;Database=csms_eis;Username=postgres`.
- **В работе на момент записи:** пакетный прогон `/api/liability-mapping/map`
  для всех 41 обязанности (`map-batch.js`, 3 воркера) — результат дописывается
  в БД и во внешний `%TEMP%`; незавершённый блок указан и в сообщении коммита.

## 67. Итог импорта ЕИС, КТРУ 729 и повторная синхронизация (2026-11-21)

### Пакетный КоАП-прогон

- Результат `map-batch.js`: **ok=4/41**. Успешно: `158n-3-1-1` (уже был
  контрольный `partial 0.80`), `158n-3-1-2` (`full 0.95` + бланкетные `0.2`),
  `158n-3-1-3` (только `blanket`), `158n-3-1-5` (`matches=[]`).
  `158n-3-1-4` и `158n-3-2-2-1` — `timeout`; после них Ollama стала отдавать
  `ECONNRESET`/пустые ошибки, остальные 35 заданий не завершены. **Полностью
  структурированы только 4 обязанности**, результат остальных не выдумывался.

### КТРУ: 176 → 729 и постраничное чтение

- Повторный обход печатных форм с retry загрузил **729 карточек**
  (`%TEMP%\opencode\ktru-items.json`, source SHA-256
  `f7314511dff7232ffc8b1c3786b9a5d79247935d1115371d273da68574bf2898`).
  Первая попытка импорта вернула 500: полный HTML каждой карточки (`text`,
  около 22 МБ на набор) упирался в лимит Kestrel 30 МБ. В `payload` оставлены
  только структурированные поля, `text` не импортируется.
- Активная версия `nsiKTRU = ktru-public-20261121-729`, `itemCount=729`,
  хеш набора `F4F26CCE3BDF51FC6E112B9FBFAA88BDD1063EC7B8E6F5FD08174091DAFA55C6`.
  `GET /api/references/nsiKTRU/all` возвращает 729 записей.
- `GET /api/references/nsiKTRU/items` ограничен 500 строками за запрос. В API
  добавлен необязательный `skip` (`ReferenceDataContracts`, in-memory и EF
  хранилища, `ReferenceDataEndpoints`), во фронте `ktruRef.api.ts` обходит
  страницы по 500 до короткой выдачи. Проверено: `take=500&skip=500` → 229,
  всего 500 + 229 = 729. Все КТРУ-коды попадают в формы и «Ответственность КС».

### Онбординг по ИНН и демо-БД

- Рабочий механизм: `scripts/import-eis-client.mjs` (флаги `--inn`,
  `--years`, `--notice-years`, `--plans`, `--notices`, `--tasks`, `--dry-run`,
  `--db`). Входные данные клиента — ИНН `4629040439` и срок договора 3 года;
  планы берутся за 3 года (последние 3), извещения — за 2 года (последние 3).
  `curl.exe` + retry, логирование source URL/ша, идемпотентные ID,
  `Content-Type: application/json; charset=utf-8` для `/api/*`.
- Итог импорта: планы `202601442000018001`, `202501442000018002`,
  `202401442000018002`; извещения `0144200001826000201`, `0144200001826000194`,
  `0144200001826000193`; первый план — 119 позиций,
  `totalAmount=15271225346.18`; первое извещение — ИКЗ
  `262462904043946320100101140014931244`, `nmck=22662656.28`, ЕТП «АО "РАД"».
- Состав `db.json`: `users=1`, `employees=1`, `organizations=1`,
  `structuralUnits=1`, `contractServices=1`, `purchasePlans=3`,
  `procurements=3`, `notices=3`, `tasks=12`, `contractRegistry=523`
  (517 контрактов клиента сохранены). Zod-проверка: планы 3/3, извещения 3/3,
  задачи 12/12. Ловушка: в позициях плана обязательны `kbk: ""`,
  `kbkEntries: []`.
- Логин доведен до требуемого `poyarkova_nyu@mail.ru` / `qwerty12`
  (ранее в импортированной базе оставался `nyu`). После правки `db.json`
  повторно выполнено
  `../csms-api/scripts/import-access.ps1 -AdministratorEmail 'poyarkova_nyu@mail.ru'`:
  `/api/access/me` → 200, `user id=7`, `employee id=42`,
  `structuralUnitId=33` и у КС, `myRole="Руководитель службы (п. 2.3)"`,
  `isHead=true`, `roles=["administrator","contract_service_head"]`, 7 прав.
  Важно: API с `EIS_STORE=postgres` читает импортированную копию, а не `db.json`
  напрямую — после изменения учётки нужно повторять импорт доступа и перезапуск API.
- После pull принят чужой коммит `a406f76` (флаг `uiFlags.sidePolarCurves`);
  его правки не изменялись. Проверки: `npx.cmd tsc -b` — чисто,
  `npx.cmd oxlint src` — только предупреждения, `npx.cmd vite build` — успешно;
  `dotnet build ../csms-api/CsmsApi.sln` — 0 ошибок,
  `dotnet test --no-build` — **314 passed / 10 skipped / 324 total**.
- ⚠️ Не закрыто: живой `getDocsIP` требует новый токен ЕИС; рассинхронизация
  миграций `csms-api`; 35 КоАП-заданий пакетного прогона и 2 timeout;
  printForm КТРУ не даёт таблиц характеристик — нужны XML/карточки или ручная
  сверка с XLSX экспертного совета (§65).

## 68. Связь извещение → контракт по ИКЗ (2026-11-21)

- Добавлен `scripts/link-eis-chain.mjs` (флаги `--db`, `--dry-run`); он же
  вызывается из `scripts/import-eis-client.mjs` после очистки старых процедур.
  Правило: точный ИКЗ → идентичность ИКЗ (год + ИНН + КПП + разряды 20–26,
  где зашит код позиции плана) + точная цена → единственный кандидат с той же
  идентичностью. Неоднозначные совпадения по префиксу **не** создаются.
- Важная находка: ИКЗ извещения и контракта в 44-ФЗ совпадают не целиком —
  разряды 20–26 кодируют номер позиции плана-графика, поэтому точных совпадений
  в демо-БД нет. Ближайший контракт отличается всего одним разрядом, но цена
  совпала только у одного извещения.
- Результат прогона: `0144200001826000193` → `eis-2462904043926000090`
  (`ikzPositionAndPrice`, цена `122585125.63`); извещения `...0201` и `...0194`
  остались без контракта (`candidates=0`) — в 517 контрактах клиента нет
  контрактов с их кодами позиций, а все три извещения ещё в статусе «Подача
  заявок». Причина записана в `notices[].eisImport.contractLink`.
- Итог в `db.json`: связан только 1 контракт, у него
  `procurementId="eis-0144200001826000193"`; у извещения и процедуры проставлен
  `contractId`. 523 контракта, 517 клиентских, 3 извещения, 3 процедуры, 3 плана
  и 12 задач сохранены. Проверки `tsc`, `oxlint`, `vite build` — без ошибок.

## 69. Граф связей ПГ → извещения → контракты → оплата и ответственные (2026-11-21)

- **Главный ключ связи — `generalInfo.positionUniqueNumber` извещения ↔
  `position.uniqueNumber` ПГ** (правило предыдущего коммита по ИКЗ/цене
  недостаточно): из одной позиции ПГ может быть несколько извещений (переторг,
  отмена, повторная процедура), поэтому связь «позиция → извещение»
  один-ко-многим. Для каждой пары «извещение — контракт» собирается отдельная
  цепочка; `buildEisChains` возвращает все пары позиции, а не одну.
- **Контракт ищется по стабильной части ИКЗ** `year|ИНН|КПП|разряды 20–26`
  (`ikzPositionKey` в `eisIdentifiers.ts` и в линкере). Полное совпадение ИКЗ —
  лишь один из признаков (`exactIkz`), наравне с `procurementId`, ценой и
  уникальным номером позиции. При перезаключении разряды 27–36 меняются, но
  позиция остаётся та же: в `contractRegistry[].eisImport.contractChain`
  пишутся `previousContractId` / `successorContractId`, расторгнутый контракт
  **не удаляется** — часть исполнения и оплата по его ИКЗ остаются у первого
  поставщика. UI показывает пометку «расторгнут → перезаключён» и issue
  `contract.reaward`.
- **Оплата:** `linkContractPayments` ищет платёж по точному ИКЗ контракта,
  затем по ИКЗ предыдущего контракта цепочки; `contractId` имеет приоритет.
  В демо-БД `contractPayments=[]`: публичная страница paymentInfo ЕИС сейчас
  недоступна (`curl.exe` → HTTP:000), выдуманные платежи не добавлялись.
  Вместо этого создана демо-задача «Сверить оплату по ИКЗ контракта».
- **Ответственные из извещений** (публичные ФИО/email) добавлены в `employees`:
  id 43 Бармин Руслан Валерьевич (отдел 33 УГЗ → `contract_service_member`),
  id 44 Семанюк Сергей Иванович (новый отдел 34 инициаторов →
  `purchase_initiator`). Учёток и паролей для них нет — это не пользователи, а
  штатные записи. КС id 5 переведена в `creationMethod: "structural_unit"`,
  `members: []`; роли на бэке выводятся из `structuralUnitId`/состава подразделения,
  отдельные записи ролей в `db.json` не нужны. `import-access.ps1` менять не
  потребовалось: он берёт `roleCodes` из `users`, а новых пользователей нет.
- **Задачи пересобраны:** 13 демо-задач с тремя ролями
  (`contract_service_head`, `contract_service_member`, `purchase_initiator`);
  задачи по извещению получает ответственное лицо из карточки ЕИС, задачи по
  ПГ и контроль оплаты — руководитель КС. Настоящие задачи (`mock` не true)
  при пересборке сохраняются. Генерация вынесена в `buildNoticeTasks` из
  `link-eis-chain.mjs`; дубль задач по оплате устранён.
- **Прогон на реальных данных остался честным:** извещения `...0201` и `...0194`
  по-прежнему без контракта (`candidates=0`), `...0193` →
  `eis-2462904043926000090`. Причины в `eisImport.contractLink`. Логика
  переторга/перезаключения/оплаты проверена на синтетической копии базы
  (`%TEMP%\opencode\db-chain-test.json`): 2 извещения на одной позиции, 2
  контракта с `reawardChain=true`, платёж по старому ИКЗ привязался к первому
  (расторгнутому) контракту.
- **Синхронизация:** после правки `db.json` выполнен
  `../csms-api/scripts/import-access.ps1 -AdministratorEmail 'poyarkova_nyu@mail.ru'`;
  `/api/access/login` + `/api/access/me` → roles
  `administrator,contract_service_head`, `isHead=true`,
  `contractService.creationMethod="structural_unit"` (перезапуск API не
  потребовался). 523 контракта (517 клиентских) сохранены.
- **Проверки:** `npx.cmd tsc -b` — чисто; `npx.cmd oxlint src` — только
  существующие предупреждения; `npx.cmd vite build` — успешно;
  `node --check scripts/*.mjs` — чисто.

### Остатки

- Живые платежи и реальные цепочки перезаключения в публичной выборке
  отсутствуют — реализованная логика ожидает данных, выдумывать их нельзя.
- `Б1` (замена `PlaceholderXmlBuilder` доменным маппером ТФФ) по-прежнему
  заблокирован: XSD 658/215н и 918 в репозитории нет.
- Рассинхронизация миграций `csms-api` и 35 незавершённых КоАП-заданий
  остаются с §67.

## 70. Реквизиты заказчика из публичной карточки ЕИС и видимость реестра (2026-11-21)

- **Причина «пустых» извещений и реестра контрактов:** в `db.json` данные есть
  (523 контракта, 3 извещения, 3 процедуры, 3 плана), но страницы фильтруют
  список по `organizationId` текущей организации. У 517 выгруженных из ЕИС
  контрактов был заполнен только `customerOrganizationId: 6`, а рабочее поле
  `organizationId` осталось пустым — `useContractRegistry(orgId)` возвращал
  лишь 2 контракта. В `scripts/link-eis-chain.mjs` добавлен
  `assignCustomerOrganization`: он переносит `customerOrganizationId` в
  `organizationId` (прогнал — 517 обновлений). После этого json-server
  `/contractRegistry?organizationId=6` отдаёт **519** контрактов, извещений —
  3. Причина отображалась как «пусто», хотя парсинг был сделан.
- **Парсинг организации ЕИС:** в `scripts/import-eis-client.mjs` добавлены
  `findOrganizationNumber` (поиск по ИНН → `reestrNumber`), `fetchOrganization`
  (`info.html` — реквизиты, `other.html` — контакты) и
  `applyOrganizationRequisites`. Полный импорт обновляет организацию
  автоматически; флаг `--refresh-organization` обновляет только организацию и
  3 снимка `customer` в планах, не перезагружая закупки. Для нестабильной сети
  есть env `EIS_ORG_SEARCH_HTML` / `EIS_ORG_INFO_HTML` / `EIS_ORG_OTHER_HTML`
  с локально скачанными страницами (обычный прогон их не использует).
- **Что исправлено у организации id 6:** `registryNumber` `03462000006` →
  `01442000018`, адрес «Менделеева, д. 2» → «Радищева ул, Д. 62», email
  `info@kurskavtodor.ru` → `estimate@roadkursk.ru`, телефон → `7-4712-749074`,
  ответственный «Иванов А. С.» → публичный контакт «Долинская О. Л.».
  Добавлены `oktmo=38701000001`, `consRegistryNum=382Р1122`. Неподтверждённый
  телефон ответственного удалён; `okpo` на странице отсутствует, поэтому
  оставлен прежним. Ссылка `reestrNumber` из URL — это номер записи заказчика;
  префикс номеров контрактов `03462000006…` не менялся.
- **Сеть:** живой запрос `other.html` в этом прогоне упал `curl (28)`; база не
  изменялась до успешного повтора с локально сохранёнными страницами
  (`%TEMP%\opencode\org-*.html`). Обычный импорт по-прежнему работает через
  `curl.exe` (Node `fetch` к zakupki.gov.ru не проходит).
- **Побочный дефект исправлен:** `summary.tasksAdded` обращался к `tasks` до
  объявления и ломал импорт; счётчик перенесён в финальный `report`.
- **Проверки:** `npx.cmd tsc -b` — чисто; `npx.cmd oxlint src` — только
  существующие предупреждения; `npx.cmd vite build` — успешно;
  `node --check` обоих скриптов — чисто.
- **Синхронизация:** после правки `db.json` повторно выполнен
  `../csms-api/scripts/import-access.ps1 -AdministratorEmail 'poyarkova_nyu@mail.ru'`.
  В момент проверки API перезапускался пользователем, поэтому повторный
  `login` сначала вернул 409 из-за перезапуска API; после повторного импорта
  и стабильного запуска `/api/access/login` + `/me` снова отдают роль
  `administrator,contract_service_head`, `isHead=true` и обновлённые
  реквизиты организации (`registryNumber=01442000018`,
  `email=estimate@roadkursk.ru`).

### Остатки

- Живые платежи, реальные перезаключения, `Б1` и КоАП — как в §69.
- Публичная карточка не даёт ОКПО и отдельного телефона ответственного: эти
  поля не выдумывались (ОКПО сохранён из шаблона, телефон удалён).

## 71. Ревизия проекта (2026-11-21)

- **Рабочий стол:** за сутки появились только `Тема гроза.jpg` (14:27) и
  `Тема зима.jpg` (14:49) — скриншоты тем, совпадают по времени с коммитами
  `1fa02f9` и `2b292b9`. Инструменты текущей сессии туда не писали (все временные
  файлы — `%TEMP%\opencode`, скриншоты репозитория — `screenshots/`). Файлы не
  удалялись: нужно подтверждение пользователя.
- **КРИТИЧНО (исправлено): реестр контрактов не проходил свою же zod-схему.**
  Проверка `ContractRegistryItemListSchema.safeParse(db.contractRegistry)`
  давала 1039 ошибок: у 522 контрактов `procurementId: null` (поле объявлено
  `.optional()`, а не `.nullish()`), у 517 отсутствовал `supplierName`. Из-за
  ZodError в `useContractRegistry` почти все экраны с контрактами получали
  пустые данные. Схема обновлена: `procurementId` допускает null,
  `supplierName` через `z.preprocess` приводит отсутствие к `""` (тип для
  потребителей остаётся `string`). Теперь `check:db` проходит: 523/523.
- **КРИТИЧНО (исправлено): `null` в `*Id` как мина json-server.** `getRemovable`
  считает `null` висячей ссылкой и при любом DELETE каскадно удаляет все такие
  записи. `pruneDb` в импортере теперь удаляет ключ `procurementId` целиком,
  а не пишет null; в текущем `db.json` удалено 522 таких ключа. Оставлены 4
  старых демо-контракта с organizationId 1/2/4 — они не клиентские и не
  удалялись, чтобы сохранить 523 записи.
- **ИСПРАВЛЕНО:** `useGetEmployeeByEmail` парсил массив `/employees?email=` как
  один объект; теперь `BaseEmployeeSchema.array().parse(data)[0] ?? null`.
  `omitEmptyReferences` применяется во всех шести `api.patch` реестра, а не только
  при создании. `npm run lint` переведён с неработающего eslint (нет конфига)
  на `oxlint src`; добавлен `npm run check:db` и он включён в `npm run build`
  (`scripts/check-db-schema.mjs` собирает схему rolldown'ом и валидирует `db.json`).
- **Документация:** `PROJECT.md` — актуальная таблица команд (`npm start`
  поднимает три процесса, `npm run server` = json-server, `npm run api` =
  csms-api); дата актуализирована.
- **ПРОВЕРКИ:** `npx.cmd tsc -b` — чисто; `npm run lint` — только существующие
  предупреждения; `npm run check:db` — 523 записи; `npx.cmd vite build` —
  успешно; `node --check` всех трёх `scripts/*.mjs` — чисто; json-server
  `/contractRegistry?organizationId=6` — 519 контрактов, `/notices` — 3.

### Найдено, но НЕ исправлялось (нужно решение)

- **csms-api, критично:** `RequireAuthorization()` не выставлен ни на одной
  группе (`Program.cs:30-36`). Анонимно доступны смена ролей, `/api/access/import`,
  обновление XSD, импорт справочников и т.п. Сейчас контур — только localhost.
- **csms-api, критично:** рассинхрон миграций: `20261121120000_AddEisPackageOrigin`
  есть в репозитории, но отсутствует в БД (модель уже ждёт `Source`/`Customer`);
  `20261120154010_AddContractSmpRecords` есть в git-истории ветки
  `feature/contract-smp-api` (коммит `713046a`), но не в `main`. Не править
  `__EFMigrationsHistory` и snapshot вручную: сначала единое дерево миграций,
  бэкап, затем применение. `dotnet build` — успешно (1 старое предупреждение).
- **csms-api:** неверное `EIS_STORE` молча даёт in-memory; логин — 409 вместо
  401 и без rate limiting; захардкоженные строки PostgreSQL в инструментах;
  демо-пароль открытым текстом в `db.json` и в `import-access.ps1`; токен ЕИС из
  коммита `eecaca5` подлежит отзыву.
- **Фронтенд:** fallback логина на json-server с паролем в query-string
  (`user.api.ts:42-73`), prod-fallback на `localhost` в нескольких API-клиентах,
  токен в `localStorage`, `fetchAccessProfile` глотает 401/403, mock-справочник
  организаторов в `PurchasePlanPositionForm` и неверный ключ фильтра, нет
  тестов. Это требует продуктовых решений и пока оставлено как есть.
- **Чужие правки в csms-api** (`EfCoreReferenceDataStore.cs`,
  `InMemoryReferenceDataStore.cs`) не тронуты.

## 72. Единые адреса API и запуск (2026-11-21)

- **Порты не менялись:** Vite :5173 (основной), json-server :3001, csms-api
  :5099. Vite по-прежнему проксирует `/api` и `/openapi` на :5099. Проверено:
  `http://localhost:5173/` → 200, `/api/access/me` через прокси → 401,
  `:3001/notices` → 200, `:5099/api/access/me` → 401.
- **Исправлены адреса в клиентах:** добавлен `src/services/apiBaseUrl.ts` с
  `CSMS_API_BASE_URL` (VITE_EIS_API_URL → dev-прокси → origin) и
  `JSON_SERVER_BASE_URL` (VITE_API_URL → :3001 в dev → origin в prod). На него
  переведены `axios.instance.ts`, `Access`, `Eis/eisPackages`, `Eis/referenceData`,
  `Npa`, `Pp2604`, `csmsApi`. Раньше часть клиентов жёстко стучалась в
  `http://localhost:5099` даже в собранном фронте. `VITE_ACCESS_API_URL` и
  `VITE_API_URL` приоритетнее и продолжают работать.
- **Тема:** пользователь попросил не лезть в неё. В дереве параллельно идут чужие правки
  `Header.tsx`, `useTheme.ts`, `uiSolutions.config.ts`, `global.scss`,
  `_themes.scss`, `_variables.scss`, новый `_theme-floating3d.scss` и JPEG на
  диске/в корне. Они **не трогались и в коммит не включались**. Их dev-сервер
  поднят на :5175; основной проект остаётся на :5173. Старый dev-сервер на :5174
  (запущен в 02:37) тоже не трогался.
- **Проверки после правок:** `tsc -b` — чисто; oxlint по изменённым сервисам —
  чисто; `npm run check:db` — 523/523. Вход демо-пользователя через API работает:
  `/api/access/login` + `/me` → `administrator,contract_service_head`,
  `isHead=true`, организация ИНН `4629040439`, `registryNumber=01442000018`.

## 73. КБК/КВР и особые закупки из публичного XML планов (2026-11-21)

- **Причина пустых КБК/КВР и отсутствующих особых закупок:** импортёр
  `scripts/import-eis-client.mjs` читал только HTML-карточки ЕИС
  (`general-info.html`, `plan-position-search.html`). Ни детализация
  `KBKsInfo/KBKInfo`, ни блок `specialPurchasePositions` в карточке не
  отдаются — они есть только в публичной печатной форме XML. В `mapPlan()`
  КБК/КВР и `specialPurchases` явно записывались пустыми. ИКЗ в базе уже был
  36-значным и корректным, но ИКЗ-*разряды* КВР (34–36) в карточке позиции
  считались из пустого `kbk.slice(-3)`, поэтому «отрубались» по КБК.
- **Источник без токена:** карточка плана → ссылка
  `/epz/orderplan/os/printForm/view.html?printFormId=…` → тот же `printFormId`
  в `/epz/orderplan/os/printForm/viewXml.html?printFormId=…`. Никаких
  `getDocsIP`, PIN/ЭЦП и внутренних протоколов. XML кэшируется в
  `%TEMP%/csms-eis-plan-xml/<planNumber>.xml`; при наличии кэша обогащение
  работает офлайн (карточка не запрашивается).
- **Импортёр:** добавлены `parsePlanXml()`, `fetchPlanXml()` и флаг
  `--enrich-plans` (точечное обогащение уже импортированных планов). Из XML
  берутся: `IKZ`, `IKU`, `positionNumber`, `purchaseNumber`, `publishYear`,
  `KBKsInfo/KBKInfo` (код + разбивка на главу/раздел/целевую статью/вид
  расходов + суммы по годам), `KVRInfo`, `financeInfo` (графы объёма),
  `isEnergyServiceContract`/`isConstructionWorks`/`isNotFederalFinancing`,
  `positionModification`, а для особых закупок — `type/code+name`, `IKZ`,
  `IKU`, `positionNumber`, `extNumber`, `publishYear`, `purchaseNumber`,
  `KVRInfo`, `KBKsInfo`, `financeInfo`. ИКЗ из XML **не перезаписывается**
  расчётным. Итог плана берётся из `outcomeIndicators/totalsInfo/total` —
  он включает особые закупки (в HTML-карточке их нет).
- **Схема (`purchasePlan.schema.ts`):** по XSD `BaseTypes.xsd::kbkType` КБК —
  ровно 20 символов, а не «20 цифр»: в целевой статье реальных региональных
  кодов есть буквы И/Д/А/К (`8440409172019Д003414`). Регексы КБК (позиция,
  `kbkEntries`, особые закупки) исправлены на `[0-9A-ZА-Я]{20}`;
  `positionNumber` особой закупки — до 24 цифр по
  `tenderPlan2020PositonNumberType`. Без этого валидация рвала 539 правил.
- **Результат в `db.json`:** 3 плана, 232 позиции — у всех валидные КБК (20
  символов, 17 уникальных с буквами) и КВР (3 цифры), суммы детализации
  сходятся с объёмом записи; 14 особых закупок (4 / 5 / 5 по планам) с
  кодами `P4_1_93`, `P23_1_93` и др.; итоги планов пересчитаны из XML.
  523 контракта, пользователи, сотрудники, связи и извещения не тронуты.
- **Проверки:** `node --check scripts/import-eis-client.mjs`, `tsc -b`,
  `npx oxlint src` (только предсуществующие warning), `npm run build`,
  `npm run check:db` (523/523), явная проверка
  `PurchasePlanListSchema.safeParse(db.purchasePlans)` → `PLANS_OK 3`,
  json-server `:3001/purchasePlans` отдаёт КБК/КВР и особые закупки.
- **Чужие/темные файлы** (`_theme-floating3d.scss`, `_themes.scss`,
  `Лес 3D.jpg`, коммит темы `cb1be22`) не трогались и в коммит не включены.

## 74. Исправление ошибок XML-проверки ПГ и визуал по ЕИС pg2020 (2026-11-21)

- **Причины ошибок в панели «Проверка ЕИС 17.0 / XML»:** (1) валидатор
  требовал `okeiCode = 383`, хотя в XSD `tenderPlan2020` поля OKEI нет — это
  только подсказка формы; (2) у позиции `0126` плана 2026 ОКПД2 лежал в
  публичном XML не прямым тегом, а в alternate-ветке
  `commonInfo/undefined/OKPD2s`, которую импортёр не разбирал; (3) в XML есть
  `customerInfo/OKOPF|OKFS`, `ownerInfo/ownerRole` и `KOKSsInfo`, но
  `parsePlanXml()` их игнорировал; (4) валидатор запрещал
  `isNotFederalFinancing` без `isConstructionWorks` и требовал КОКС у всех
  строек, хотя XSD прямо допускает первый флаг и указывает, что КОКС
  игнорируется при приёмке с этим флагом.
- **Импортёр (`scripts/import-eis-client.mjs`):** добавлены `parseOkpd2()`,
  `parseKoks()`; из XML теперь берутся `OKPD2s/OKPD2Info`, `KOKSsInfo/KOKSInfo`
  с разбивкой по годам, `OKOPF`, `OKFS`, `ownerRole`. `--enrich-plans` подставляет
  `okeiCode: "383"` / `okeiName: "рубль"`, роль владельца и коды заказчика;
  `mapPlan()` делает то же для новых планов. `node --check` проходит.
- **Схема (`purchasePlan.schema.ts`):** КОКС — справочная детализация по
  объектам на уровень плана, поэтому суммы КОКС больше не сверяются с графами
  отдельной позиции (проверка кода осталась); сверка КБК/КВР сохранена.
  `PurchasePlanListSchema.safeParse(db.purchasePlans)` → `true`.
- **Валидатор (`eis17Types.ts`):** убраны ложная error по OKEI и ложное
  warning по `isNotFederalFinancing`; warning про КОКС остаётся для стройки
  2022+ без флага «без федерального софинансирования», текст уточнён.
- **Результат:** три плана — **0 ошибок XML**, предупреждений 5 / 10 / 8
  (нулевые суммы из публичного XML и единичные отсутствия КОКС в ПГ 2024/2025).
  Диагностика через `.tmpcheck/check-pg-xml.ts` (игнорируемый файл, не
  коммитить).
- **Визуал (`PurchasePlanCard.tsx` + `.module.scss`):** вместо 4 вкладок —
  7 в порядке официальной карточки ЕИС: Общая информация, Позиции, Особые
  закупки, Итоговые показатели, Вложения, Журнал версий, Журнал событий.
  Активная по умолчанию — «Общая информация». Добавлены блоки вложений
  (XML 17.0 + ссылка на ЕИС), таблица версий и лента событий, собранная только
  из реальных дат плана/позиций (без выдуманных записей). Новые стили
  `attachments`, `eis-link`, `journal-table`, `events`, `event*`.
- **Проверки в браузере (:5173, демо-учётка):** карточка открылась после
  загрузки профиля; все 7 вкладок рендерятся, консоль без ошибок; панель
  показывает «ошибок XSD нет, предупреждений: 5» и корректный XML-превью.
- **Проверки сборки:** `npx tsc -b`, `npx oxlint src` (только предсуществующие
  warning), `npm run build`, `npm run check:db` (523/523), `node --check`
  импортёра — зелёные.
- **Оговорка:** `csms-api` не трогался; настоящая XSD-проверка там остаётся
  отдельным этапом `EisSchemaCatalog.Validate`. Фронтовая панель — human-readable
  проверка полноты, а не компиляция XSD.
- **Чужие незакоммиченные правки** `_modal-frame.scss`, `_theme-floating3d.scss`
  и untracked `Лес 3D.jpg` в коммит не включать.

## 75. Карточка позиции по ЕИС и сверка реквизитов заказчика (2026-11-21)

- **Эталон:** публичная карточка позиции
  `https://zakupki.gov.ru/epz/orderplan/pg2020/position/general-info.html?plan-number=202601442000018001&position-number=202601442000018001000118`
  (ИКЗ 262462904043946320100101140004931244); сверены блоки «Сведения о
  закупке», «Информация об объекте закупки», «Сведения о финансовом
  обеспечении», КБК.
- **Визуал (`PurchasePlanPositionForm.tsx` + `.module.scss`):** в шапку формы
  добавлена карточка ЕИС — ИКЗ, объект закупки, объём финансового обеспечения,
  даты размещения/утверждения. Разряды ИКЗ вместо disabled-инпутов показаны
  текстом, добавлена кнопка «Скопировать». Графы объёма финансового обеспечения
  переставлены в порядок ЕИС (годы, последующие, «Всего» последним); в КБК/КВР
  порядок сохранен как в ЕИС. Логика сохранения не тронута.
- **Сверка organization (`db.json`, id 6):** по странице
  `https://zakupki.gov.ru/epz/organization/view/other.html?reestrNumber=01442000018`
  исправлен `consRegistryNum` `382Р1122` → `382Р1121` (опечатка). Добавлены
  публичные поля: дата постановки на налоговый учёт (2022-11-28), тип
  организации («Казенное учреждение»), ОКВЭД (6 кодов), код/имя бюджета
  (44020540 / Бюджет Курской области), факс, часовая зона, полномочия
  (Заказчик с 2016-09-30, Уполномоченное учреждение с 2019-04-19),
  административная принадлежность (Минтранс Курской области, ИНН 4632130530),
  уполномоченная организация (Минфин, 38203465) и уполномоченный орган
  (Минградстрой, ИНН 4629011325).
- **Схема (`organization.schema.ts`):** новые поля добавлены как optional
  в `OrganizationRequisitesSchema` и перенесены в `organizationToCustomer`,
  чтобы снимок заказчика в планах не терял их. UI пока не выводит эти поля —
  данных достаточно для ведомственного нормирования.
- **Оговорка:** `--refresh-organization` пока не парсит новые поля автоматически:
  `parseOrganizationValues()` различает только плоские пары «заголовок — значение».
  При ручном обновлении карточки ЕИС новые поля нужно аккуратно перенести.
- **Проверки:** `npx tsc -b`, `npx oxlint src`, `npx vite build`,
  `npm run check:db` (523/523), `node --check` импортёра — зелёные; форма
  открылась в браузере, консоль без ошибок.

## 76. Карточка позиции: XSD ПГ 2020 и правки интерфейса (2026-11-21)

- **XSD-сверка:** в `tenderPlan2020PositionType` (`IntegrationTPTypes.xsd:892`)
  отсутствуют блоки `execution` и `basementInfo` из старого
  `IntegrationTypes.xsd`; обязательны `commonInfo`, `financeInfo` и
  `isEnergyServiceContract`. Правовой акт относится не к позиции целиком, а к
  `purchasesSubsecYearsInfo/actInfo/docInfo` (`:1212`) и имеет смысл только при
  сумме на последующие годы (`financeInfo/subsecYears`).
- **`PurchasePlanPositionForm.tsx`:** блок `positionModification` показан только
  при редактировании (`!isNew`) и транспонирован в таблицу «название поля —
  значение» (changeReason, decision, description); раздел 3 старых полей
  срока/периодичности/обоснования удалён; удалена детализация КВР; пять
  специальных признаков перенесены в раздел 2 «Информация об объекте закупки»;
  общественное обсуждение оставлено в финансовом разделе. При сумме на
  последующие годы показывается поле правового акта.
- **Схема/маппер:** добавлено `subsecYearsLegalAct` с условной проверкой;
  `eis17Types.ts` собирает `purchasesSubsecYearsInfo` и больше не отдаёт
  `KVRsInfo` (для казённого учреждения тип 08 блок не допускается). КВР
  позиции по-прежнему выводится из КБК.
- **Проверки:** `npx tsc -b`, `npx oxlint src` (только старые warning),
  `npx vite build` — зелёные. Чужие theme-правки и `Лес 3D.jpg` не трогались.

## 77. Проверка контрагентов по ст. 19.28 КоАП в `csms-api` (2026-11-21)

- **Источник:** только публичная страница ЕИС `sectionId=2369` и XLSX по
  `downloadDocument.html?id=…`; на 2026-11-21 актуальный `id=44571`, дата
  «20 ноября 2026», 991 запись, SHA-256
  `2BCF9FFB978E5B2FC4CC283F866157A9089DAD8800978CC059E79CA2ADC3BCEB`.
  Referer на страницу списка обязателен; это не полноценный РНП.
- **Конвейер:** воркер раз в сутки (`CheckIntervalMinutes=1440`) читает страницу,
  скачивает XLSX и считает SHA-256; парсинг только при смене `id` **или** SHA.
  Снимок `<root>/current` = `document.xlsx` + `entries.json` + `.manifest.json`;
  подмена `.incoming` → `current.previous` → `current` с откатом. Корень задаётся
  `EIS_COUNTERPARTIES_ROOT`, по умолчанию `<bin>/counterparties`.
- **Парсер:** ZIP + XML через `System.IO.Compression`/`System.Xml.Linq`, без новых
  NuGet; колонки B–J, все 9 заголовков проверяются, ведущие нули и аналоги ИНН —
  строками. Даты I/J — Excel-сериалы (`FromOADate`); в живой выгрузке две
  текстовые даты с опечаткой года (`12.05.0202`, `11.11.0205`) приведены к
  2022/2025. У 3 иностранных юрлиц пустые ОГРН/КПП — это норма, не брак файла.
- **Каталог:** in-memory индекс, поиск по ИНН/ОГРН (сильные реквизиты), КПП —
  только если ИНН и ОГРН не заданы; дедупликация по `Key`. Ответ `/check` несёт
  `SourceId`, `Sha256`, `PublishedDate`, `RowCount`, `InstalledAt`, `CheckedAt`.
- **API:** `GET /api/eis/counterparties/status`, `POST /update`, `GET|POST /check`.
  Статусы `Starting/Checking/UpToDate/Installed/Error/Disabled` и флаг
  `ParsedNow`; ошибки ЕИС не роняют API и не заменяют активный снимок. Бриф —
  `csms-api/docs/tasks/counterparty-screening.md`.
- **Проверки:** `dotnet build` и `dotnet test` зелёные: 333 пройдено, 10 пропущено
  (Postgres-тесты без БД); 19 тестов RNP, включая прогон настоящего XLSX через
  `EIS_COUNTERPARTIES_XLSX`.
- **Коммит:** `csms-api` `62df54b` запушен в `origin/main`. Чужие незакоммиченные
  `EfCoreReferenceDataStore.cs` / `InMemoryReferenceDataStore.cs` не трогались.
- **Следующий шаг:** подключить `/api/eis/counterparties/check` к карточке
  контрагента на фронте; извещающую проверку не делать основанием отказа без
  отдельного решения.

## 78. Вёрстка карточки позиции ПГ: таблицы в одну строку (2026-11-21)

- **Проблема:** в браузере на карточке позиции (`/:id/positions/:positionId/edit`)
  графы ИКЗ, «Объём финансового обеспечения закупки (рублей)» и детализация
  КБК падали друг под друга: ячейки `<td>` наследовали общий класс `&__cell`
  из grid-сетки и получали `display: flex` вместо `table-cell`.
- **Исправление:** в `PurchasePlanPositionForm.module.scss` для `td` внутри
  таблиц явно задано `display: table-cell`. После перезагрузки страницы
  проверено в браузере: значения ИКЗ, сумм по годам и КБК идут в одной строке,
  как в ЕИС.
- **Проверки:** `npx tsc -b` и `npx vite build` зелёные, `npx oxlint src` —
  только старые warning. Чужие незакоммиченные файлы (`ContractRegistry*`,
  `Header*`, `AppLayout*`, `Container*`, `index.html`, `scripts/mobile-audit.mjs`,
  `.mobile-audit/`, `Лес 3D.jpg`) не трогались и в коммит не вошли.

## 79. Мобильная адаптация: 320–430px, ландшафт и темы (2026-11-21)

- **Задача:** интерфейс должен работать на телефоне (320/375/430px и в
  ландшафте 812×375) без потери функций, тем и вида.
- **Инструмент проверки:** `scripts/mobile-audit.mjs` (`npm run check:mobile`).
  Открывает маршруты в headless-Chrome через CDP, считает `scrollWidth` против
  ширины окна, ищет элементы за вьюпортом и «мелкие» цели (<44px по высоте) и
  снимает скриншоты в `.mobile-audit/` (папка в `.gitignore`). Ключи:
  `--widths=320,375,430`, `--viewports=812x375`, `--theme=dark`, `--small`,
  `--routes=/a,/b`, `--settle=<ms>`.
- **Корневая причина «страница шире экрана» (главная находка):** в
  `Container.module.scss` страницы — flex-элементы с `margin: 0 auto`.
  Auto-margin по поперечной оси отключает stretch, ширина считалась по
  содержимому, и любая длинная строка (`<option>` у select, ИКЗ, `width:
  max-content` у кнопки) выносила страницу за вьюпорт — симптомом были
  «разные» страницы (`/documents`, `/legal-acts`, `/contract-registry`), но
  причина одна. Лечение: `> * { width: 100%; min-width: 0 }`.
- **Оболочка:** `body`/`html` — `100dvh` вместо `100vh` (адресная строка
  iOS/Android), `padding` под `env(safe-area-inset-*)`, `text-size-adjust: 100%`
  (iOS не раздувает шрифт в ландшафте), `prefers-reduced-motion` отключает
  `scroll-behavior: smooth`; `index.html` — `viewport-fit=cover`;
  `AppLayout`/`CustomModal` — `100%` вместо `100vw` (полоса прокрутки).
- **Шапка:** ниже 900px пункты разделов уезжают в бургер-панель
  (`Header.tsx` + `Header.module.scss`): панель модальная (body не скроллится,
  Escape закрывает), при переходе на другой маршрут закрывается. Профиль и
  справка открываются по клику — на тач-экранах браузер синтезирует
  `mouseenter` после касания, из-за чего меню открывалось и тут же
  закрывалось; теперь hover-логика включается только при `(hover: hover)`.
- **Модальные окна:** ниже 600px диалог занимает экран целиком
  (`align-items: stretch`, `max-height: 100dvh`, скролл внутри окна,
  `overscroll-behavior: contain`), десктопные `min-width: 420–1100px` у форм
  перебиваются.
- **Тач-цели:** в `_controls.scss` — `@media (max-width: 900px)
  :where(button, select, textarea, input:not(checkbox/radio/hidden)) {
  min-height: 44px }`. Специфичность нулевая, поэтому компонент может задать
  свой размер; чекбоксы/радио не трогаем — они всегда в паре с label.
  Точечно 44px добавлены: `.brand`, pager-кнопки `LegalActsRegistry`,
  `.toggle-label`/`.ack-btn` в уведомлениях, `.number` в `ProcurementRow`
  (через padding + отрицательный margin — вид не меняется).
- **Страницы:** `ProcurementDocumentsPage` (`.paper` 16/14, `overflow-wrap:
  anywhere` для ИКЗ), `LegalActsRegistry` (полный блок ≤600px: подпись над
  select, поиск на всю ширину, обёртка таблицы со скроллом
  `overscroll-behavior-x: contain`, мелкий шрифт/паддинги ячеек, `.code` и
  `.npa-time` переносятся), `Main` (отступы 16/12), `ProcurementRow`,
  `Okpd2Dictionary`, `PageSizePicker`, `EisChainPage` (заголовок карточки с
  ИКЗ — `overflow-wrap: anywhere`, иначе 339px), `UiSolutions`
  (`minmax(min(100%, 320px), 1fr)` — фиксированная колонка 320px была шире
  контейнера), `ContractProjectsPage` и `SmnpReport238Form.registryGrid`
  (то же для 300/320px).
- **Найденная по пути регрессия (главная страница была без стилей):** в
  `Main.module.scss` классы были плоскими (`.card`, `.steps`, `.step-link`), а
  `Main.tsx` собирает имена через `bem(styles, "main")`, то есть ищет ключи
  `main__card`, `main__steps`… Ключа нет — `bem` подставляет исходное имя, в
  разметку уходило «голое» `main__card`, и вся страница (карточки-секции, поток
  закупки, разделы) рисовалась дефолтными стилями браузера. Восстановлена
  БЭМ-структура (всё вложено в `.main` как `&__card`/`&__steps`/…), мобильный
  вариант: шаг — грид «номер | заголовок | счётчик», подпись второй строкой.
- **Проверки:** `npx tsc -b`, `npx oxlint src` — зелёные (0 ошибок, остались
  старые warning), `npx vite build` — зелёный. Полный прогон аудита
  `--widths=320,375,430`: **OVERFLOW = 0 на всех маршрутах**, включая
  `/contract-registry` (после того как смежная правка КБК была закоммичена в
  `ce14c12`). Темы `dark`/`storm`/`winter`/`floating3d` на 375px — чисто,
  ландшафт `812x375` — чисто.
- **Доработано (2026-11-21, после замечаний):** секция «Подгрузка сведений из
  реестра контрактов» удалена — вместе с ней ушли состояние поиска по
  реестровому номеру, подсветка подгруженной карточки (`cardHighlighted`) и
  прокрутка к ней. Поле КБК стало комбинированным: один `input` на поиск,
  выбор и ручной ввод (`role="combobox"`, `listbox`,
  `aria-activedescendant`). Список по-прежнему строится из `kbkOptions` — по
  коду, затем по числу контрактов; `matchesKbkFilter` и сортировка контрактов
  не менялись. Код, которого нет в пуле, добавляется строкой «Добавить код» и
  по Enter; выбранные коды — чипами с удалением и «Сбросить выбор».
  Клавиатура: ↑/↓, Enter, Escape, Backspace при пустом поле. `toolbarFilters`
  выровнен по `flex-start`, чтобы панель не прыгала при появлении чипов.
- **Панель фильтров на 375px (закрыт остаток из §79):** в мобильном медиа
  (≤600px) счётчик «Кодов в пуле / Выбрано» уходит под поле КБК
  (`flex-direction: column`), поэтому placeholder виден полностью; каждая
  группа фильтров (`Статус`, `КБК`, `Период заключения`, `Сортировка`)
  занимает свою строку (`flex: 1 1 100%`), даты делят ширину поровну
  (`flex: 1 1 0`), select сортировки растягивается, кнопка направления
  фиксирована. Проверка: `npm run check:mobile -- --widths=375
  --routes=/contract-registry` → `scroll=375 offenders=0 small-targets=0`,
  переполнений 0; `tsc -b`, `oxlint`, `vite build` — зелёные.

## 80. Карточка позиции ПГ: раскладка по замечаниям пользователя (2026-11-21)

- **Шапка:** осталась только верхняя строка и даты «Размещено в ЕИС» /
  «Утверждено» под заголовком — без подложки, рамок и дублей ИКЗ, объекта
  закупки, суммы и заказчика.
- **ИКЗ:** дублирующий заголовок над таблицей убран; кнопка «Скопировать» —
  под таблицей справа, код рядом с кнопкой не показывается. Ширины 6 граф
  заданы по длине значений, заголовки переносятся; селект «Планируемый год
  размещения извещения» вернут под номер закупки и влияет на разряд года ИКЗ.
- **Поля:** номер закупки и год — лейбл и значение в одной строке, без рамки.
  Галочки «уполномоченный орган» и «организатор совместной закупки» — в столбик
  под ними. Блок `positionModification` перенесён в самый низ формы перед
  кнопками.
- **Таблицы:** графа «Всего» во всех таблицах последняя и расчётная (без ввода):
  суммируется из лет в форме и в строках КБК/КОКС, значение хранится в RHF для
  XSD. Заголовки КБК собраны в две строки без пустых ячеек; единица измерения
  перенесена в заголовки, «Итого» и расчётные ячейки — без `₽`. Суммы с
  разрядами, по правому краю, высота ячеек равна высоте «Всего» (34 px).
- **КОКС:** кнопка выбора из справочника стоит рядом с кодом, поля сумм на том
  же уровне. На экране 1209 px горизонтальных полос прокрутки нет (проверено
  в браузере по `scrollWidth === clientWidth` у всех таблиц).
- **Проверки:** `npx oxlint` на файле формы и `npx vite build` зелёные; `tsc`
  не даёт ошибок по файлам формы. Чужая WIP в `ContractRegistryPage.tsx`
  (несуществующие `kbkByProcurement`/`kbkSearch`, типы фильтров) не трогалась —
  это незавершённая работа другого агента.

## 81. Карточка позиции ПГ: эргономика полей и кнопок (2026-11-21)

- **Шапка:** убраны «Редактирование позиции (E)» и «План 2026–2028» — остался
  только статус, заголовок позиции и даты «Размещено в ЕИС» / «Утверждено».
- **Поля:** «Номер закупки…» и «Планируемый год размещения извещения» снова с
  обводкой; лейбл и поле в одной строке, оба поля выровнены по левому краю
  (сетка `minmax(0,1fr) 96px`), 4 цифры по-прежнему друг над другом. Удалены
  подсказки про 24 цифры, разряды ИКЗ и «не более 9999». Выбор года начинается
  с первого года планирования, плюс `validate` в RHF запрещает более ранний год.
- **Кнопки:** заголовок «Действие» убран; «Убрать» осталась в каждой строке
  КБК и КОКС в обычной ячейке таблицы (пустая ячейка в шапке без подписи).
  Кнопка справочника КОКС и все служебные кнопки имеют высоту 34 px, как
  инпуты. Строка «Итого по кодам бюджетной классификации» выделена заливкой.
- **Ширина таблиц:** все таблицы карточки (ИКЗ, суммы, КБК, КОКС,
  positionModification) принудительно 1100 px; колонки КБК/КОКС сужены до
  128 px и 78 px, чтобы суммы в миллиарды помещались без полос прокрутки.
- **Заголовки детализации:** счётчики и скобки в подзаголовках КБК/КОКС убраны;
  пустая ячейка шапки над кнопкой «Убрать» в КБК объединена `rowSpan={2}` и
  закрашена как остальные заголовки.
- **Общественное обсуждение:** вместо селекта «Да/Нет» — чекбокс (`boolean`
  из XSD), значение пишется в RHF через `setValue`.
- **CustomSelect:** исправлен вывод пунктов списка — использовался
  `String(item)` и показывался `[object Object]`; теперь при наличии `getLabel`
  показывается подпись (наименование уполномоченного органа/организатора).
- **Проверки:** `tsc` по файлам формы/селекта без ошибок, `npx oxlint` и
  `npx vite build` зелёные; в браузере проверены отсутствие полос прокрутки,
  расположение кнопок в таблицах и текст пунктов селекта. Чужие WIP-файлы
  (`ContractRegistry*`, `Header*`, `_controls.scss`, `CustomSelect.module.scss`
  и др.) не трогались.

## 82. Карточка позиции ПГ: КВР под кликом и порядок полей (2026-11-21)

- **КВР:** вместо нативного `datalist` (браузер показывал его в своём месте)
  работает свой список: на `focus`/`click` поля «Вид расходов» ячейки КБК
  сохраняются координаты `getBoundingClientRect()`, а портал в `document.body`
  ставит список `position: fixed` строго под полем (`top = field.bottom + 2`,
  `left` выровнен по полю, ширина ≥ 360 px и не выходит за экран). Фильтр по
  введённому коду, выбор мышью и клавиатурой (↑/↓/Enter/Esc), закрытие по
  клику вне списка, уходу фокуса, скроллу и ресайзу. Значение пишется в RHF
  через `setValue(..., { shouldValidate: true })`.
- **Раздел 1:** ячейка «Номер закупки…» стала на всю ширину — правая
  вертикальная граница больше не проходит сразу после поля `0001`.
  «Планируемый год размещения извещения» остаётся непосредственно под номером
  закупки; обе пары «лейбл — поле» ограничены шириной 560 px и равноудалены от
  левого края ячейки, не прижимаясь к правому краю формы. У номера убран
  моноширинный шрифт: оба поля теперь используют шрифт Poppins 13px/600 с
  `tabular-nums`. Правый паддинг номера увеличен до 24 px (стрелка селекта
  занимает ~16 px), поэтому `0001` и год заканчиваются на одной вертикали.
  Валидация года сохранена.
- **ОКПД2:** справочник уже берётся с бэка (`GET /api/references/nsiOKPD2/all`,
  21 066 записей) через `useOkpd2Dictionary`; локальный `/okpd2Refs` из
  json-server — только оверлей флагов и запасной источник.
- **Проверки:** `tsc` по форме без ошибок, `npx oxlint` и `npx vite build`
  зелёные. В браузере проверено: список КВР открывается под полем
  (`top = bottom + 2`), показывает 14 подписей вместо `[object Object]`, выбор
  проставляет код и закрывает список; год стоит под номером закупки, оба поля
  выровнены по левому краю на расстоянии 560 px от края ячейки; все таблицы по
  1100 px, горизонтальных полос нет. Чужая WIP в `ContractRegistry*` не
  трогалась.

## 84. Вкладка «Особые закупки» приведена к карточке позиции (2026-11-21)

- **Заголовки:** убраны счётчик в легенде (`Особые закупки`, без `(4)`) и
  отдельная графа «Действия» — её шапка пустая и закрашена так же, как остальные,
  а кнопки «Убрать» находятся прямо в строках таблицы.
- **Таблица:** ширина зафиксирована на 1100 px (`table-layout: fixed`,
  `colgroup`), как у таблиц карточки позиции; горизонтальной полосы на широком
  экране нет. Все поля и кнопки имеют высоту 34 px.
- **Суммы:** вводимые годы с разрядами (пробелы как разделители, запятая для
  копеек), «Всего» по строке и «Итого по особым закупкам» расчётные, в
  `amountTotal` пишется число без разделителей для XSD (как в карточке позиции).
- **Тип особой закупки:** вместо `datalist` — свой список ранее использованных в
  плане кодов, портал в `document.body`, `position: fixed` строго под полем
  (`top = field.bottom + 2`), фильтр по вводу, выбор мышью/клавиатурой и
  закрытие по клику вне/скроллу/ресайзу.
- **Проверки:** `tsc` по компоненту без ошибок, `npx oxlint` и `npx vite build`
  зелёные. В браузере проверено: легенда без счётчика, 8 граф без «Действия»,
  таблица 1100 px и `scrollWidth === clientWidth`, кнопки и поля 34 px, суммы с
  разрядами и пересчёт «Всего»/«Итого», список типов открывается под полем и
  выбирается. Чужие WIP-файлы не трогались.

## 85. Реестр планов-графиков: без сводки и графы «Заказчик» (2026-11-21)

- **Сводка в шапке:** строка «Показано: N · Совокупный объём: … ₽» удалена
  вместе с расчётом `overallAmount`; `formatMoney` и `planTotalAmount`
  остались — они нужны таблице. Под заголовком остаётся только текущая
  организация-заказчик.
- **Таблица:** графа «Заказчик» удалена вместе с заголовком, ячейкой
  (`plan.customer.shortName/fullName`, ИНН/КПП) и стилями `__customer` /
  `__requisites`. Колонок стало 7: номер, период, статус, записей ПГ,
  совокупный объём, утверждён, действия. `nth-child`/`colgroup` по числу
  колонок не использовались, поэтому сдвига стилей нет; остальные данные
  строки (год, статус, число позиций, сумма, дата утверждения, меню) не
  менялись.
- **Проверки:** `tsc -b` без ошибок, `oxlint` по файлу — 0 предупреждений,
  `vite build` — зелёный. Другие маршруты не затронуты: правились только
  `PurchasePlanList.tsx` и его модуль стилей.

## 86. Особые закупки: справочник типов, группировка и сквозная нумерация (2026-11-21)

- **Тип из справочника:** новый хук `useSpecialPurchaseTypes`
  (`src/services/SpecialPurchaseType/specialPurchaseType.api.ts`) читает
  `GET /api/references/nsiSpecialPurchases2020/all`; в `CustomSelect`
  пользователь видит только наименования, код хранится в `typeCode`. Пока
  официальный датасет НСИ не импортирован, хук отдаёт резервный перечень из
  32 пунктов ч. 1 ст. 93 44-ФЗ с кодами формата `P<n>_1_93`, о чём в форме
  есть пояснение. Типы из уже сохранённых позиций плана добавляются к списку,
  чтобы старые записи не пропадали из выпадающего списка.
- **Порядок заполнения:** сначала выбираем тип и год (5 значений: текущий + 4),
  кнопкой «Создать позицию» создаём строку, и только после этого заполняем
  номер закупки, КБК и финансы. Строки сгруппированы по типу, внутри типа —
  по году осуществления закупки; в том же порядке идёт нумерация.
- **Сквозная нумерация:** в `PurchasePlanSpecialPurchaseSchema` и
  `emptyPurchasePlanSpecialPurchase` добавлен `serialNumber`. Особые позиции
  продолжают максимальный номер основных; `positionNumber` пересобирается
  через `buildPositionUniqueNumber(plan.planNumber, serial)`. Поле `extNumber`
  не перезаписывается — старые внешние номера остаются нетронутыми.
- **ИКЗ вместо ручного ввода:** графы ввода ИКЗ и КВР убраны. ИКЗ собирается
  `buildIkzParts` из `publishYear`, ИНН/КПП (или ИКУ) заказчика, номера
  закупки, порядка закупок с тем же номером среди всех позиций плана, `0000`
  вместо ОКПД2 и КВР из последних трёх разрядов КБК. При сохранении собранное
  значение пишется в `ikz`/`kvr`.
- **Года:** `placementYearOptions` по умолчанию теперь даёт 5 лет (текущий + 4)
  и в карточке основной позиции, и в особых закупках.
- **Проверки:** `tsc -b`, `npx oxlint src`, `npx vite build` — зелёные. В
  браузере: таблица 1100 px без горизонтальной полосы, 4 старые строки
  получили номера 129–132 после основных позиций (макс. 128), 2 группы типов
  и 3 подгруппы лет; в списке 32 названия без кодов, поиск по наименованию
  работает. Выбор типа и года 2028 создал строку 133, ввод номера 0021 и КБК
  `844040917201К7500414` пересчитал ИКЗ в
  `262462904043946320100100210020000414` (КВР из КБК — 414). Сохранение в
  браузере не выполнялось, `db.json` остался без изменений; чужие WIP-файлы
  (`PurchasePlanForm*`, `scripts/mobile-audit.mjs`) и `Лес 3D.jpg` не трогались.

## 87. Форма плана-графика: раздел «3. Записи плана-графика» удалён (2026-11-21)

- **Форма** (`/purchase-plans/new`, `/purchase-plans/:id/edit`): удалён
  fieldset с заголовком «3. Записи плана-графика (N)» — вместе с подсказкой о
  пустом списке, списком записей, полями `positionFields`, выбором ОКПД2,
  чекбоксом общественного обсуждения и кнопкой «Добавить запись». После
  раздела 2 сразу идёт футер с «Отмена» / «Сохранить план-график», пустых
  мест нет.
- **Связанный код:** из формы убраны `useFieldArray`/`positions`,
  `Okpd2Select`, `useOkpd2Dictionary`/`findOkpd2ByCode`, функция
  `okpd2NormControlHint`, `watch`, `emptyPurchasePlanPosition`,
  `positionFields`, `okpd2FieldLabels` и `formatMoney`. В
  `purchasePlan.config.ts` удалён мёртвый экспорт `positionFields` и импорт
  `PurchasePlanPosition`; `okpd2FieldLabels` оставлен — его использует
  карточка позиции. Схема плана, сохранение, версии, разделы 1–2 и маршруты
  позиций не менялись.
- **Стили:** удалены `&__positions`, `&__position`, `&__position-header`,
  `&__position-title`, `&__remove-button`, `&__add-button`, `&--okpd2` и
  `&--norm`; `&__checkbox`, `&__hint--warning` и остальное оставлены.
- **Проверки:** `tsc -b` без ошибок, `oxlint` по двум файлам — 0/0,
  `vite build` — зелёный. В браузере `/purchase-plans/new`: разделы 1 и 2 на
  месте, раздела 3 нет, футер с кнопками сразу после раздела 2.

## 88. Карточка ПГ: обрезка графы «Наименование товара, работы, услуги по ОКПД2» (2026-11-21)

- **Проблема:** в плане `eisp-202601442000018001` наименования по ОКПД2 доходят
  до 191 символа (объект закупки — до 276), из-за чего графа ОКПД2 раздувала
  таблицу позиций и ломала читаемость соседних граф.
- **Решение (`PurchasePlanCard.tsx`, `renderCell` → ветка `okpd2Code`):** текст
  наименования вынесен в отдельный `span` `__okpd2-name` с `title` = полное
  значение; служебные значки `i` (ПП РФ № 926) и `А` (471-р) собраны в строке
  `__okpd2-line`, чтобы многоточие не съедало их.
- **Стили (`PurchasePlanCard.module.scss`):** `__okpd2` → `max-width: 240px`
  (как `--wide` у графы «Наименование объекта закупки»), `__okpd2-line` → flex
  без сжатия значков, `__okpd2-name` → `overflow: hidden; text-overflow:
  ellipsis; white-space: nowrap; min-width: 0; cursor: help`.
- **Проверки:** `tsc -b` — без ошибок, `oxlint src/components/PurchasePlan` —
  0/0, `vite build` — зелёный. Живая проверка через CDP (1440×900, вкладка
  «Позиции»): графа ОКПД2 261px против 248px у графы объекта, текст обрезан
  (`scrollWidth 1264 > clientWidth 240`), `title` = 191 символ; имитация
  значка 15px остаётся видимой (наименование сжимается до 219px).
- **Не проверено здесь:** реальные бейджи `i`/`А` — в `db.json` нет
  `okpd2Refs.isNormed`, а перечень 471-р берётся из индекса НПА `csms-api`
  (:5099), который в этой проверке не поднимался.

## 89. Реестр контрактов: сортировка по колонкам в таблицах карточки (2026-11-21) — переделано в §91

- **Что добавлено:** в таблицах раскрытой карточки контракта — «Этапы
  исполнения», «Платежи», «Неустойки», «Поставки и приёмка» — названия колонок
  стали кнопками сортировки. Клик по новой колонке включает возрастание,
  повторный клик по той же — убывание; активная колонка показывает ▲/▼
  акцентом, неактивные — приглушённый ↕. На `th` выставляется `aria-sort`.
- **Логика:** общие `toggleTableSort`, `compareSortValues`, `sortTableRows` и
  компонент `SortableTh` в `ContractRegistryPage.tsx`. Числа (суммы,
  количество, номер этапа, «казначейство» как 0/1) сравниваются как числа,
  даты ISO и текст — через `localeCompare("ru", { numeric: true })`, поэтому
  «Этап 2» идёт раньше «Этап 10». Для колонки «По годам» этапа берётся сумма
  четырёх годовых значений. Исходные массивы не мутируются (`[...rows].sort`).
- **Стили:** `.sortHeader` (прозрачная кнопка, наследует шрифт, регистр и цвет
  заголовка), `.sortIcon`, `.sortIconActive` — в
  `ContractRegistry.module.scss`. Остальные стили таблиц и страницы не
  менялись.
- **Проверки:** `tsc -b` без ошибок, `oxlint` по файлу — 0/0, `vite build` —
  зелёный (в собранном CSS есть `.sortHeader`/`.sortIconActive`). Мобильный
  аудит `/contract-registry` на 375px: `scroll=375 offenders=0
  small-targets=0`.

## 90. Особые закупки: КБК как в позиции, ИКЗ у года, изменения и XML (2026-11-21)

- **Раскладка:** ИКЗ перенесён из графы позиции в строку года
  («Год осуществления закупки» → «Идентификационный код закупки»), на его
  месте в таблице теперь «Код бюджетной классификации». Выбор года доступен и
  в мастере под выбором типа, и в каждой группе года; список по-прежнему даёт
  5 лет, первый — год плана. ИКЗ остаётся расчётным и пользователем не
  редактируется.
- **КБК как в основной позиции:** добавлена детализация из четырёх разрядов
  (Глава / Раздел (подраздел) / Целевая статья / Вид расходов) с суммами по
  годам, кнопками «Убрать», «Добавить КБК» и строкой «Итого по кодам
  бюджетной классификации». Старые позиции с одиночным `kbk` раскладываются в
  первую строку через `splitKbk`. При добавлении второй и последующих строк
  КВР в ИКЗ становится `000` (проверено в браузере), а в `kvr` сохраняется то
  же значение.
- **Изменение позиции:** у существующих строк появилась кнопка «Изменить»;
  блок «Сведения об изменении / отмене позиции (positionModification)»
  открывается и при явном нажатии, и при любом редактировании такой строки.
  Поля — основание (`changeReason`), вынесенное решение (`decision`),
  содержание изменений (`description`); `modificationStatus` проставляется
  `E`. Название флага федерального бюджета приведено к подписи основной
  позиции: «ОКС / недвижимость без софинансирования из федерального бюджета».
- **Схема и XML:** в `PurchasePlanSpecialPurchaseSchema` добавлены
  `kbkEntries`, `koksEntries`, `changeReasonCode/Name`,
  `modificationDecision`, `modificationDescription`. В
  `mapPurchasePlanToEis17` special-позиция теперь отдаёт `kbksInfo` и
  `koksInfo` из детализации, а также `specialPurchasePositionModification`;
  сериализатор пишет эти блоки в порядке XSD после `financeInfo`, перед
  `specialPurchasePositionModificationStatus` и `isNotFederalFinancing`. Для
  старых позиций без детализации по годам в `KBKYearsInfo` переносится весь
  `financeInfo`, а не только итог. Валидатор дополнительно проверяет 36 цифр ИКЗ, формат
  КБК и обязательность reason/decision при статусе `E`.
- **Названия граф:** «№ п/п», «Номер закупки, включенной в план-график
  закупок», «Код бюджетной классификации», «Сумма на <год> год, руб.»,
  «Сумма на последующие годы, руб.», «Всего, руб.» — как в карточке
  основной позиции.
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint src` — exit 0,
  `vite build` — exit 0. В браузере: исходные 4 строки 129–132, 2 группы
  типов, 3 подгруппы лет; мастер создал строку 133 с годом 2028; детализация
  КБК и блок изменения открываются, добавление КБК меняет КВР ИКЗ на `000`;
  XML-превью содержит `KBKsInfo`, `specialPurchasePositionModification`,
  `specialPurchasePositionModificationStatus`, `isNotFederalFinancing` и
  корректные годовые суммы внутри `KBKYearsInfo`. Сохранение не выполнялось,
  `db.json` не менялся. Чужие WIP-файлы (`scripts/mobile-audit.mjs`,
  `PurchasePlanCard*`, `Лес 3D.jpg`) не трогались.


## 89. Таблица позиций ПГ: перенос ОКПД2, ширины граф и статус без обводки (2026-11-21)

- **ОКПД2 без обрезки (`PurchasePlanCard.tsx`, `.module.scss`):** многоточие и
  `title` убраны — `__okpd2-name` получает `white-space: normal` и
  `overflow-wrap: anywhere`, число строк не ограничено, высота строки таблицы
  определяется содержимым соседних граф. Графе задана реальная ширина через
  новую ячейку `cell--okpd2` (`min-width: 246px`), иначе авто-layout с таблицей
  `width: 100%` сжимал её до 118px и текст шёл в 19 строк.
- **Ширины граф:** «Номер закупки, включенной в план-график» — 94px
  (`th[data-col="number"]`), «Наименование объекта (объектов) закупки» —
  `cell--wide` 270px. Подобрано так, чтобы при 1440×900 таблица ровно
  помещалась в контейнер (1126px) и графа «Действия» не уезжала за край
  (раньше было 1147px при 1126px).
- **Статус:** обводка и плашка убраны — модификатор `status-tag--plain`
  (только в таблице позиций, шапка карточки сохраняет рамку), слово «от» перед
  датой убрано, дата в одну строку (`__sub` → `white-space: nowrap`).
- **Центрирование:** ячейки «Статус» и «Обязательное общественное обсуждение»
  получают `cell--middle` (вертикально по центру) поверх уже имеющегося
  `cell--center`.
- **Проверки:** `tsc -b` без ошибок, `oxlint` по файлу 0/0, `vite build`
  зелёный. CDP-замер (1440×900, вкладка «Позиции», план
  `eisp-202601442000018001`): ширины 112/94/270/246/111/81/100/110, таблица
  1126 = контейнер 1126, ОКПД2 191 символ → 7 строк без обрезки, у плашки
  статуса `border: 0 none`, фон прозрачный, у обеих граф
  `text-align: center`, `vertical-align: middle`.
- **Разработка:** dev-сервер для проверки поднимался на :5180
  (`npx vite --port 5180`), чтобы не конфликтовать с занятым :5173.

## 91. Реестр контрактов: общий заголовок таблицы вместо сортировки в карточках (2026-11-21)

- **Переделка §89:** сортировка убрана из четырёх внутренних таблиц раскрытой
  карточки («Этапы исполнения», «Платежи», «Неустойки», «Поставки и приёмка») —
  там снова обычные `<th>` без кнопок. Сортировка теперь одна, в общем
  заголовке списка контрактов: так колонки не дублируются в каждой карточке.
- **Список стал таблицей:** `<div className={styles.list}>` с карточками
  заменён на `<table className={`${styles.table} ${styles.contractsTable}`}>`
  в прокручиваемом контейнере `.contractsTableWrap` (overflow-x: auto).
  Колонки: Номер, Поставщик, Цена ₽, НМЦК ₽, Аванс ₽, Заключён,
  Срок исполнения, Статус, шеврон раскрытия. `ContractCard` переименован в
  `ContractRow` и возвращает две строки: сводную (клик по строке раскрывает) и
  при `expanded` — `<tr><td colSpan={9}>` с прежним телом карточки
  (`ContractEisSection`, `PaymentSummary`, `ContractEventsSection`, этапы,
  платежи, неустойки, поставки, СМП и футер со ссылками «Изменение /
  расторжение», «Приёмка» и кнопкой «Удалить»).
- **Наименование — отдельной строкой:** по названию чаще всего ищут контракт,
  поэтому оно вынесено из колонок в полноширинную строку
  `.contractTitleRow` (`<td colSpan={9}>`) над строкой реквизитов; клик по
  названию раскрывает карточку. Сортировки по названию нет — колонки и
  `case "name"` в сортировке удалены. У строки названия нет нижней границы,
  чтобы не было двойной линии с реквизитами.
- **Сортировка по заголовку:** состояние `sortCriterion`/`sortAsc` заменено на
  `tableSort: TableSort | null` (по умолчанию `{ key: "date", dir: "desc" }` —
  свежие сверху, как раньше «год по убыванию»). Клик по новой колонке — asc,
  повторный — desc; активная показывает ▲/▼, остальные ↕; на `th` выставляется
  `aria-sort`. Сравнение: деньги (`Number`) как числа, даты ISO и текст — через
  `localeCompare("ru", { numeric: true })`. Сортировка применяется в
  `visibleContracts` до пагинации, поэтому порядок стабилен между страницами.
- **Убран дубль в toolbar:** блок «Сортировка» (`select` год/цена/статус +
  кнопка ▲/▼) удалён вместе со стилями `.toolbarSortRow`, `.toolbarSortToggle` и
  их мобильными правилами — сортировка теперь только в заголовке.
- **Стили:** добавлены `.contractsTableWrap`, `.contractsTable` (min-width
  1080px, на мобильных 900px, шапка `surface-raised`), `.contractTitleRow`
  (название, hover, без нижней границы), `.contractRow` (+ hover),
  `.contractRowOverdue` (красная полоса слева), `.contractRowExpanded`,
  `.moneyCell`, `.statusCell`, `.expandCell`, `.chevronButton`, `.expandedRow`,
  вложенный `.expandedCell` (padding: 0, чтобы `.cardBody` давал свои отступы).
  Удалены мёртвые стили карточки: `.list`, `.card`, `.cardOverdue`,
  `.cardHeader*`, `.cardSummary`, `.summaryItem/Label/Value`, `.chevron`,
  `.contractName`, `.contractNameCell`, `.nowrapCell`.
- **Ширины граф не зависят от фильтра:** таблица переведена на
  `table-layout: fixed`, ширины девяти колонок заданы через
  `<colgroup>`/`<col>` в процентах (9 / 17 / 11 / 11 / 11 / 11 / 15 / 11 / 4 %),
  отступы ячеек уменьшены до 8×10px, длинные значения переносятся
  (`overflow-wrap: anywhere`). `white-space: nowrap` у дат и сумм убран, чтобы
  содержимое не выходило за фиксированную колонку; на мобильных заголовки
  длинных колонок переносятся по словам.
- **Проверки:** `tsc -b --pretty false` — 0 ошибок; `oxlint` по изменённому
  файлу — 0/0; `vite build` — зелёный; `ContractRegistry.module.scss`
  дополнительно компилируется `sass` (SASS_OK). Мобильный аудит
  `npm run check:mobile -- --widths=375 --routes=/contract-registry`:
  `ok 375x812 scroll=375 offenders=0 small-targets=0` (таблица прокручивается
  внутри контейнера, страница не переполняется). Визуальная проверка с данными
  не выполнялась: бэкенд `csms-api` не поднят, контракты на странице не
  загружаются. Чужие WIP-файлы (`db.json`, `scripts/mobile-audit.mjs`,
  `PurchasePlanCard*`, `PurchasePlanSpecialPurchases*`, `eis17Types.ts`,
  `purchasePlan.schema.ts`, `src/services/SpecialPurchaseType/`, `Лес 3D.jpg`)
  не трогались.
## 92. Таблица позиций ПГ: наименование объекта на уровне наименования по ОКПД2 (2026-11-21)

- В строке позиции графа «Наименование объекта (объектов) закупки» начиналась
  на уровне кода ОКПД2; по замеру код занимает первую строку графы —
  24px (`line-height` таблицы) + `margin-bottom: 2px`, итого 26px.
- Решение: модификатор `object--with-code` (`padding-top: 26px` и
  `padding-top: calc(1lh + 2px)` вторым объявлением) навешивается в
  `PurchasePlanCard.tsx` только когда у позиции есть `okpd2Code` — без кода
  наименование объекта остаётся у верхней границы графы.
- CDP-замер (1440×900, вкладка «Позиции», план `eisp-202601442000018001`):
  `padding-top: 26px`, разница между началом текста объекта и наименования
  по ОКПД2 — 0px в трёх первых строках; таблица 1126 = контейнер 1126,
  скролла нет; высота таблицы выросла с 2221 до 2299px (3 строки × 26px).
- Проверки: `tsc -b` без ошибок, `oxlint` по файлу 0/0, `vite build` зелёный.


## 93. Таблица позиций ПГ: сумма по центру ячейки (2026-11-21)

- Графа «Объём финансового обеспечения, всего (рублей)» была выровнена по
  правому краю (`cell--amount` → `text-align: right !important`) и по верху.
- Теперь `cell--amount` → `text-align: center` (без `!important`), а
  вертикальное центрирование даёт `cell--middle` из нового списка
  `MIDDLE_COLUMNS` в `PurchasePlanCard.tsx`: кроме `status` и
  `isPublicDiscussionRequired` туда добавлен `amountTotal`.
- CDP-замер (1440×900, план `eisp-202601442000018001`): ячейка суммы —
  `text-align: center`, `vertical-align: middle`, ширина 111px, таблица
  1126 = контейнер 1126, скролла нет.
- Проверки: `oxlint` по файлу 0/0, `vite build` зелёный. `tsc -b` падает
  на **чужом** WIP-файле `PurchasePlanSpecialPurchases.tsx`
  (8 ошибок TS6133/TS6196: неиспользуемые `KoksRef`, `AUTHORIZED_BODIES`,
  `KoksPickerModal`, `updateKoksCode`, `updateKoksAmount`, `addKoks`,
  `removeKoks`, `pickKoks`) — к этой правке отношения не имеет.

## 94. Таблица позиций ПГ: год размещения и номер закупки по центру (2026-11-21)

- В `MIDDLE_COLUMNS` (`PurchasePlanCard.tsx`) добавлены `plannedPlacementYear`
  и `purchaseNumber`: по горизонтали эти графы уже центрировались
  (`cell--center`), теперь получают и `cell--middle` — вертикальный центр.
- CDP-замер (1440×900, план `eisp-202601442000018001`): обе ячейки
  `text-align: center` + `vertical-align: middle`, ширины граф не изменились
  (112 и 94px), таблица 1126 = контейнер 1126, скролла нет.
- Проверки: `tsc -b` — 0 ошибок, `oxlint` по файлу 0/0, `vite build` зелёный.
- Наблюдение для следующей сессии: пока владелец WIP-файлов
  `PurchasePlanSpecialPurchases.*` их не дописал, SCSS-модуль этого компонента
  ломал Sass (`Expected identifier` → 500 → белая страница), а `tsc -b` падал
  на 8 неиспользуемых объявлениях в `.tsx`. После дописывания проверки снова
  чистые, ничего чинить не потребовалось.

## 95. Особые закупки: один ИКЗ на позицию, фильтр по году, централизация и КОКС (2026-11-21)

- **ИКЗ:** устранено отображение нескольких ИКЗ под одним заголовком года.
  Годовая строка-группа удалена: позиции группируются только по основанию
  (типу) из справочника, а в детализации каждой позиции показывается ровно
  один расчётный ИКЗ с разрядами (год, ИКУ, номер закупки, порядок, ОКПД2,
  КВР). Вместо заголовка года добавлен фильтр «Планируемый год размещения
  извещения» (Все годы + 3 года), «Итого по особым закупкам» считается по
  видимым строкам.
- **Три года планового периода:** `placementYearOptions(baseYear, 2)` и в
  мастере, и в фильтре, и в поле года позиции. Позицию/ИКЗ нельзя завести за
  пределами 2026–2028 для плана 2026 года. Год редактируется в карточке
  конкретной позиции, а не сразу у группы позиций.
- **Поля как в основной позиции:** в детализации добавлены уникальный номер
  позиции (формируется системой и сохраняется как `positionNumber`),
  «Централизованная
  закупка» с выбором уполномоченного органа из `AUTHORIZED_BODIES` и блок
  «Код объекта капитального строительства / недвижимого имущества» с
  детализацией КОКС (выбор из `KoksPickerModal`, суммы по годам, «Убрать»,
  «Добавить КОКС»). При снятии флагов значения очищаются.
- **Схема и XML:** добавлены `hasCentralizedPurchase`, `centralizedPurchaseOrg`,
  `hasKoks`; `centralizedPurchaseOrg` уходит в `centralizedPurchaseInfo`
  сразу после `specialPurchasePositionModificationStatus`, `KOKSsInfo` — после
  `isNotFederalFinancing` в порядке XSD. `koksInfo` не формируется, если
  `hasKoks === false`. Легаси-позиции с одиночным `kbk` теперь получают в
  детализации и годовые суммы из позиции (итог по КБК совпадает с «Всего»).
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint src` — exit 0, `vite build` —
  exit 0 (в том числе устранён Sass «Expected identifier» в этом SCSS).
  Браузер `:5173`: фильтр 2027 оставляет только позицию 131 и итог
  1 298 000,00; мастер даёт 3 года, создаёт позицию 133 с уникальным номером
  202601442000018001000133 и одним ИКЗ; чекбоксы централизации и КОКС
  раскрывают орган и таблицу КОКС. Сохранение не нажималось, `db.json` не
  менялся. Чужие WIP-файлы не трогались.

## 96. Реестр планов-графиков: центрирование граф, «₽» в заголовке, статус без обводки и реквизиты заказчика (2026-11-21)

- `PurchasePlanList.tsx` / `.module.scss` (`/purchase-plans`):
  - все ячейки и заголовки таблицы реестра выровнены по центру
    (`th, td { text-align: center; vertical-align: middle }`);
  - «₽» убран из значений, графа называется «Совокупный объём, ₽», суммы
    выводятся через `formatMoneyValue` (без знака валюты);
  - статус-плашка без обводки (`border: none`, цвет только фоном и текстом),
    графа «Статус» перенесена в конец — после «Утверждён», перед «Действия»;
  - убраны крошки «Реестр планов-графиков закупок (44-ФЗ)» (JSX + стили
    `__breadcrumbs` / `__crumb-current`);
  - в шапке: полное наименование заказчика + сетка реквизитов
    (`__customer-details`, dl/dt/dd): ИНН, КПП, ОГРН, ОКТМО, уровень бюджета
    (`ORGANIZATION_BUDGET_LEVEL_LABELS`), реестровый номер в ЕИС, юридический
    адрес (на всю строку), e-mail, телефон. Пустые поля отфильтровываются.
- CDP-замер (1440×900, `/purchase-plans`): порядок граф «Номер, Период,
  Записей ПГ, Совокупный объём ₽, Утверждён, Статус, Действия»; все td
  `text-align: center` + `vertical-align: middle`; `₽` в ячейках нет;
  у плашки статуса `border: 0 none`; текст «Реестр планов-графиков» в DOM
  отсутствует; реквизиты заказчика отрисованы. Скриншот — `.tmp/shots/plans-list.png`.
- Проверки: `tsc -b` — 0 ошибок, `oxlint` по изменённым файлам — 0/0
  (в `oxlint src` осталось 80 чужих предупреждений, в этих файлах их нет),
  `vite build` — зелёный.

## 97. Особые закупки: схлопнутые виды, поиск и фильтры (2026-11-21)

- **Вид закупки — схлопнутые списки:** группы по основанию закрыты по
  умолчанию, раскрываются кликом по заголовку (`aria-expanded`, стрелка ▸/▾,
  счётчик позиций). При добавлении позиции её группа раскрывается сразу.
  Включение любого фильтра раскрывает группы целиком, чтобы найденные строки
  не прятались под заголовком; повторный клик снова их схлопывает.
- **Убрана графа «№ п/п»:** она дублировала сквозной номер, который виден
  в детализации как уникальный номер позиции. Ширина таблицы осталась 1100 px
  (графы номера и КБК расширены), горизонтальной полосы нет.
- **Фильтрация и поиск:** рядом с фильтром года добавлены поле поиска
  (номер закупки, уникальный номер, КБК в любом виде, ИКЗ, вид закупки),
  фильтр по виду закупки, счётчик «Позиций: N» и кнопка «Сбросить фильтры».
  Поиск нечувствителен к регистру и пробелам.
- **Убрана справочная строка ИКЗ** («Год / ИКУ / № закупки / Порядок /
  ОКПД2 / КВР из КБК»): те же сведения уже есть в таблице разрядов одного
  ИКЗ, КБК — в таблице детализации с суммами, номер закупки — отдельным
  полем в строке. Кнопка «Изменить» сделана компактнее «Убрать»
  (10 px, 55 px вместо 50 px у «Убрать»).
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint src` — exit 0, `vite build` —
  exit 0. Браузер `:5173`: 4 позиции в 2 схлопнутых группах; раскрытие даёт
  3 строки под п. 4; поиск `1740110010` оставляет 1 позицию, фильтр
  `P4_1_93` — 3, их комбинация — 0; сброс и фильтр года работают; старой
  справочной строки в DOM нет, таблица 1140 px без скролла. Сохранение не
  нажималось, `db.json` не менялся. Чужие WIP-файлы не трогались.

## 98. Реестр контрактов: номер не наезжает на поставщика, фильтр по поставщику (2026-11-21)

- **Номер реестровой записи:** у `.contractNumber` убран `white-space: nowrap`
  и добавлен `overflow-wrap: anywhere`; колонка расширена с 9% до 16% (под
  19-значный номер). После удаления графы НМЦК ширины восьми колонок: номер
  16%, поставщик 18%, цена 12%, аванс 12%, дата 11%, срок исполнения 15%,
  статус 12%, шеврон 4%. Длинный номер больше не накладывается на поставщика:
  на десктопе помещается в строку, на узком экране переносится.
- **Графа «НМЦК» убрана:** вкладка реестра контрактов показывает только цену
  контракта и аванс. Из `<colgroup>`, общего заголовка, строки реквизитов и
  сортировки удалены соответствующие `<col>`, `SortableTh`, `<td>` и
  `case "nmck"`; `colSpan` строки названия и тела карточки — 8.
- **Фильтр по поставщику:** имя поставщика в строке — кнопка
  `.supplierButton` (пунктирное подчёркивание, `aria-pressed`). Клик включает
  `supplierFilter`, повторный клик по тому же поставщику снимает фильтр;
  `stopPropagation`, чтобы не раскрывать карточку. Фильтр применяется в
  `filteredContracts` вместе со статусом и периодом, поэтому сужает и пул КБК,
  и таблицу; страница сбрасывается на первую.
- **Индикатор фильтра:** над таблицей появляется плашка `.activeFilter`
  («Поставщик: …») с кнопкой «Сбросить» (`.activeFilterClear`).
- **Проверки:** `tsc -b --pretty false` — 0 ошибок, `oxlint` по изменённому
  файлу — 0/0, `vite build` — зелёный, `ContractRegistry.module.scss`
  компилируется `sass` (SASS_OK), мобильный аудит `/contract-registry` на
  375px — `ok 375x812 scroll=375 offenders=0 small-targets=0`.

## 98. Особые закупки: вложенность по ИКЗ, поля как в карточке позиции (2026-11-21)

- **Вложенность по ИКЗ:** внутри каждого вида закупки добавлен второй уровень
  схлопнутых групп — ИКЗ позиции. В заголовке показаны код и год (первые две
  цифры ИКЗ), отдельный заголовок года не нужен. Оба уровня раскрываются
  кликом; поиск и фильтры раскрывают их целиком, новая позиция раскрывает
  свою группу. Ключ раскрытия привязан к `id` позиции, поэтому правка года
  или номера не закрывает группу. В плане `eisp-202601442000018001` под п. 4
  видны три ИКЗ: `...0018...` (2026), `...0013...` (2026), `...0019...` (2027).
- **Поля как в основной карточке:** «Уникальный номер позиции…» больше не
  растянут на всю ширину — лейбл и значение стоят рядом; «Планируемый год
  размещения извещения» — тот же `field-inline`: лейбл слева, селект 96 px
  справа (как в `PurchasePlanPositionForm`).
- **Графа КБК в строке позиции:** вместо голого текста — такое же текстовое
  поле, как номер закупки и суммы (`readOnly`, 34 px). При нескольких КБК
  показывается первый код с многоточием, полный нумерованный список —
  в `title` при наведении. Пустые строки детализации в список не попадают.
- **Решение об изменении:** архаизм XSD `notSpecified` («Не указано, новая
  позиция») убран и из интерфейса, и из выгрузки: в обоих блоках
  `positionModification` осталось две радиокнопки — «Изменение закупки»
  и «Отмена закупки». По умолчанию `purchaseChanged`, для отменённой позиции
  — `purchaseCanceled`; старые значения `notSpecified` из данных при
  выгрузке нормализуются в конкретное решение (`decisionOf` в `eis17Types`).
  В zod-схеме перечисление оставлено для совместимости со старыми записями.
- **Кнопки «Изменить» / «Убрать»:** в одной графе сделаны одинаковой ширины
  (56 px), строка центрирована по вертикали (явное правило для ячеек с полями
  и кнопками поверх общего `vertical-align: top` таблицы). Ширина таблицы
  осталась 1100 px, горизонтальной полосы нет.
- **Проверки:** `tsc -b` — ошибок в наших файлах 0; `oxlint` по нашим файлам —
  exit 0; `vite build` — exit 0. Браузер `:5173`: вложенные группы, year из
  ИКЗ (2026/2027), год в заголовке ИКЗ, поля рядом с лейблами, селект 96 px,
  КБК с «…» и списком
  в `title`, две радиокнопки, кнопки 56 px и центр по вертикали — всё
  подтверждено. «Сохранить» не нажималось, `db.json` не менялся.
- **Чужая работа не тронулась:** `scripts/mobile-audit.mjs`, `ContractRegistry*`,
  `PurchasePlanCard.tsx`, новый файл `PurchasePlanKbkBreakdown.tsx` и `Лес 3D.jpg`.
  На момент проверки `tsc -b` падает только в чужом новом
  `PurchasePlanKbkBreakdown.tsx` (`showRecordTotal` не используется,
  `hasMultiKbk` не определён) — это чужая незавершённая работа, не чинить.

## 99. Итоговые показатели: разбивка по КБК и окно записей кода (2026-11-21)

- **Новые файлы:** `src/components/PurchasePlan/PurchasePlanKbkBreakdown.tsx`
  и `.module.scss`. Блок стоит на вкладке «Итоговые показатели» под сводной
  таблицей плана (`PurchasePlanCard.tsx` → `<PurchasePlanKbkBreakdown
  plan={plan} baseYear={baseYear} />`).
- **Агрегация:** группировка по КБК идёт по `positions` + `specialPurchases`
  (разбор через `positionKbkEntries`), поэтому итог разбивки совпадает с
  «Итого по плану-графику»: 15 290 787 502,36 / 5 384 368 376,58 /
  9 871 894 630,98 / 34 524 494,80 / 0,00 — сверено в браузере.
  Устаревшие записи с одним `kbk` без разбивки по строкам детализации
  получают весь объём записи на этот код.
- **Таблица сводки:** КБК (кнопка по маске `formatKbk`), «Записей», «Всего»,
  2026/2027/2028, «Последующие годы». В подвале «Итого по КБК»; число записей
  в подвале — «—», потому что запись с несколькими КБК попадает в несколько
  строк группировки.
- **Окно записей:** клик по КБК открывает модалку (портал в `document.body`,
  `z-index: 120`) со списком записей: наименование, ИКЗ/номер, сумма по КБК и
  «Всего по записи» — последняя колонка только если в группе есть записи
  с несколькими КБК. Escape и клик по подложке закрывают окно.
- **Портал обязателен:** контент страницы лежит в `.content` с `z-index: 1`
  (`AppLayout.module.scss`), поэтому `position: fixed` внутри карточки
  оказывался под мобильной шапкой (`z-index: 90`). Портал выносит окно
  в корневой контекст наложения.
- **Телефоны (≤700 px):** в сводке остаются только КБК и «Всего» (число
  записей видно в окне кода), в окне записей скрыты «№», «ИКЗ» (номер ушёл
  подписью под наименование) и «Всего по записи» (объём записи с несколькими
  КБК печатается подписью `record-total-note`). Суммы в ru-RU набраны
  неразрывными пробелами, поэтому кегль и отступы уменьшены —
  горизонтальной прокрутки нет (`overflowPx = 0` в сводке и в окне на 390 px).
- **Проверки:** `npx oxlint src` — 0 ошибок; `npx vite build` — exit 0;
  браузер 1440/390 в светлой и тёмной темах — итоги сходятся, модалка
  открывается/закрывается, скриншоты в `.tmp/shots/plan-kbk-*`. Проверка
  через игнорируемый скрипт `.tmp/probe-plan-totals-kbk.mjs`.
- **Переход к записи (2026-11-21):** строка записи в окне кода кликабельна
  (`tr.record-row`: `cursor: pointer`, подсветка `--accent-soft`, фокус
  с клавиатуры и Enter/Space как клик). Клик по позиции ПГ ведёт на её
  страницу `/purchase-plans/:planId/positions/:positionId/edit`
  (обработчик `handleOpenKbkRecord` в `PurchasePlanCard`), окно перед
  переходом закрывается. У особой закупки отдельной страницы нет — клик
  открывает вкладку «Особые закупки». Под наименованием выводится ссылка
  «Открыть позицию →» / «Открыть особую закупку →» (на телефоне hover нет),
  в шапке окна — подсказка `modal-hint`. Проверено в браузере на 1440
  и 390 px: переход мышью и Enter работает для обоих типов записей,
  ошибок в консоли нет, `overflowPx = 0`. Проверка — игнорируемый скрипт
  `.tmp/probe-kbk-record-open.mjs`.
- **Ошибка типов в HEAD (уже исправлена):** на момент проверки
  `npx tsc -b` падал в `src/services/Eis/eis17Types.ts(160,7)`:
  `TS6133 'decisionXml' is declared but its value is never read` — хелпер
  добавлен коммитом `9ef3441`, но не применялся. Параллельная сессия
  подключила его в `positionXml` и `specialPurchaseXml` (выгрузка
  `<decision><purchaseChanged|purchaseCanceled>true</…></decision>` вместо
  текстового значения), после чего `tsc -b` снова exit 0.
- **Не тронуто:** `scripts/mobile-audit.mjs`, `ContractRegistry*`,
  `PurchasePlanSpecialPurchases.*` (незакоммиченные правки параллельной
  сессии) — закоммичены отдельными коммитами без изменений.

## 100. Особые закупки: выравнивание таблицы, текст номера и XML (2026-11-21)

- **Ширина и углы:** таблица special-закупок стала `width: 100%` (1140 px,
  как блок фильтров), `.table-wrap` получил `overflow: hidden` и
  `border-radius: 6px` — скругление тоже как у фильтров. Горизонтальной
  полосы нет.
- **Выравнивание ячеек:** у графы КБК убрано переопределение
  `vertical-align: middle`, поэтому все инпуты строки стоят на одном уровне
  (по общему `vertical-align: top` таблицы). Проверено в браузере: top у всех
  полей строки совпадает.
- **Уникальный номер:** вместо стилизованного под поле `span.readonly` —
  простой текст `span.plain-value` без рамки и фона, рядом с лейблом.
- **Подвал:** в строке «Итого по особым закупкам» последняя пустая ячейка
  получила класс `.cell--right`, фон всех ячеек подвала одинаковый.
- **XML:** в XSD ЕИС 17.0 `decision` — `xs:choice` из булевых элементов
  `<purchaseChanged|purchaseCanceled|notSpecified>true</…>`, а не текст.
  `decisionXml` подключён к обычным и особым позициям, текстовые значения
  больше не выгружаются. Проверка `.tmpcheck/check-pg-xml.mjs` — 0 ошибок
  у всех трёх планов. Полная проверка через C# `XmlSchemaSet` по XSD из
  `csms-api/schemas/17.0` после правки: ошибок по `decision` нет (было ~94),
  но остаётся ~254 **старых** ошибок превью-XML: даты вида `2026-11-19`
  вместо `dateTime` и дочерние `code`/`OKPDCode` без пространства имён
  `oos/base/1`. Это не текущая задача; рабочий XML для ЕИС собирается
  сервером (`EisPackageService`). Перед реальной выгрузкой надо разобрать
  эти ошибки отдельно.
- **Проверки после правок:** `npx tsc -b`, `npx oxlint` по нашим файлам,
  `npx vite build` — exit 0; браузер `:5173` — ширина/углы/уровень ячеек,
  текст номера, фон подвала подтверждены. «Сохранить» не нажималось,
  `db.json` не менялся. Правки подхвачены параллельной сессией в коммиты
  `e59741d` и `14c3aad`.

## 101. Особые закупки: раскрытие всех групп, сохранение и мелочи интерфейса (2026-11-21)

- **ИКЗ в карточке убран:** внутри раскрытой особой закупки удалён блок
  «Идентификационный код закупки» с таблицей разрядов — код виден в заголовке
  вложенной группы. Соответствующие стили (`ikz-block`, `ikz-code--single`,
  `ikz-parts-table`) тоже удалены; вычисление `ikzPartsOf` для группы осталось.
- **Раскрыть/свернуть всё:** в панели над таблицей добавлена кнопка
  «Раскрыть все» → «Свернуть все». Она работает сразу с обоими уровнями
  (виды и ИКЗ): раскрывает через `expandAllGroups`, повторный клик очищает
  оба `Set`. Проверено: 2 вида и 4 ИКЗ раскрываются/закрываются одной кнопкой.
- **Сохранение:** кнопка верхней панели переименована в «Сохранить изменения»,
  под таблицей добавлена такая же кнопка. Обе вызывают `saveItems` → `onSave`
  в `PurchasePlanCard` → `useUpdatePurchasePlan()` → `PUT /purchasePlans/:id`
  с полным объектом плана (меняется только `specialPurchases`). Отдельного
  роута отправки плана в ЕИС нет: в `csms-api` есть только общий
  `/api/eis/packages/{id}/send` для 4 других типов документов (задача Ф8
  в `docs/tasks/eis-chain-readiness.md`). Кнопки в браузере **не нажимались**.
- **Выравнивание полей:** строки «Уникальный номер…» и «Планируемый год…»
  используют одну сетку `minmax(0,1fr) 210px`: лейблы начинаются на одной
  вертикали, значения — на другой; селект года отдельным модификатором
  оставлен шириной 96 px. Замер в браузере: левые края лейблов 23/23,
  значений 373/373.
- **Вычисляемые разряды ИКЗ:** в карточке обычной позиции строка разрядов
  помечена `aria-disabled="true"`, ячейки получили модификатор `disabled`
  (приглушённый цвет и фон `surface-field`) — редактировать там нечего.
- **Кнопки:** «Убрать» переименована в «Удалить» во всех местах карточки
  основной позиции и в особых закупках (OKPD2, КБК, КОКС, строка позиции).
- **Проверки:** `tsc -b`, `oxlint` по нашим файлам, `vite build` — exit 0.
  Браузер `:5173`: блок ИКЗ в карточке отсутствует, заголовок ИКЗ в группе
  остался, кнопки раскрытия и две «Сохранить изменения» на месте, сеть
  селекта 96 px и общие левые края, разряды ИКЗ приглушены, «Удалить» во всех
  таблицах. «Сохранить» не нажималось, `db.json` не менялся.

## 102. Карточка позиции: заголовки разрядов ИКЗ по центру (2026-11-21)

- В `PurchasePlanPositionForm.module.scss` у таблицы `&__table--ikz` заголовки
  граф перестали прижиматься к низу: `vertical-align: middle` вместо `bottom`.
  По горизонтали они уже были по центру. Высота строки заголовка 56 px,
  все шесть граф центрированы и по горизонтали, и по вертикали.
- **Проверки:** `tsc -b` — 0 ошибок, `vite build` — exit 0; в браузере на
  `/purchase-plans/eisp-.../positions/.../edit` вычисленное значение
  `vertical-align: middle` у всех `th` таблицы ИКЗ подтверждено.

## 102. Итоговые показатели: сортировка разбивки по КБК и «руб.» вместо ₽ (2026-11-21)

- **Сортировка сводки по КБК:** сортируются все графы, кроме счётчика
  «Записей», — «КБК», «Всего», каждый год и «Последующие годы». Клик по
  заголовку — по возрастанию, повторный — по убыванию, новая графа начинает
  с возрастания. Код сравнивается как текст (`localeCompare` с `numeric`),
  суммы — как числа. Заголовок стал кнопкой `button[class*='sort-header']`
  со значком `↕/▲/▼` и `aria-sort`; графа «Записей» осталась обычным `th`.
  Логика — `toggleTableSort`, `sortGroups`, `SortableTh` в
  `PurchasePlanKbkBreakdown.tsx`; стили `.sort-header`, `.sort-icon`,
  `.sort-icon-active` повторяют реестр контрактов. Итоги по-прежнему считаются
  по исходным группам, поэтому сортировка не меняет суммы в `tfoot`.
- **Знак валюты:** в плане-графике `₽` заменён на «руб.» — заголовки граф в
  `PurchasePlanCard`, `PurchasePlanList`, `PurchasePlanImportModal`, сводке и
  окне записей КБК, сам `formatMoney` в `purchasePlan.config.ts`, подписи
  полей импорта (`purchasePlanImport.ts`) и сравнения версий
  (`purchasePlanDiff.ts`). Значения в таблицах по-прежнему печатаются без
  единицы (`formatMoneyValue`) — единица названа в заголовке графы.
- **Проверки:** `tsc -b`, `oxlint src` (0 ошибок), `vite build` — exit 0.
  Браузер `.tmp/probe-kbk-sort.mjs` на 1440 и 390 px: заголовки «…, руб.» без
  `₽`, шесть сортируемых граф и «Записей» без кнопки, сортировка «Всего»
  asc/desc и по КБК монотонна, `aria-sort` и значок переключаются, в окне
  записей «Сумма по КБК, руб.»/«Всего по записи, руб.», `overflowPx = 0`,
  ошибок консоли нет. `db.json` не менялся.

## 103. Особые закупки: флаг КОКС после блока КБК (2026-11-21)

- Чекбокс «Код объекта капитального строительства / недвижимого имущества»
  вынесен из общего блока флагов (где осталась только «Централизованная
  закупка») и перенесён сразу после таблицы детализации КБК. Рядом с ним
  теперь стоит «ОКС / недвижимость без софинансирования из федерального
  бюджета», затем при включённом флаге идёт детализация КОКС — порядок
  соответствует порядку блоков в карточке обычной позиции.
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint` по файлу — exit 0,
  `vite build` — exit 0. Браузер `:5173`: в раскрытой особой позиции флаг
  находится после «Детализации по кодам бюджетной классификации» и перед
  блоком КОКС; «Сохранить» не нажималось.

## 104. Итоговые показатели: единая сетка граф в двух таблицах (2026-11-21)

- Проблема: таблица итогов (6 граф) и сводка по КБК (7 граф) раскладывались
  автоматически, поэтому «Всего» и годы стояли со сдвигом до 72 px — графы
  «не читались друг под другом».
- Решение — жёсткая сетка процентов (`table-layout: fixed`) в обеих таблицах:
  в сводке `.table` «КБК» 22% + «Записей» 8% + по 14% на каждую сумму;
  в `&__totals-table` первая графа 30% (= 22 + 8) + по 14% на суммы. Правило
  совпадения: **менять ширины только парой** — 30% в итогах всегда равно
  сумме первых двух граф сводки, суммы — по 14% в обеих таблицах.
- Ниже 960 px (`@media (min-width: 701px)`) обе таблицы получают
  `min-width: 960px` — числа набраны неразрывными пробелами, поэтому вместо
  наезда на соседнюю графу таблица уезжает вбок внутри `overflow-x: auto`.
- На `max-width: 700px` (в сводке скрыты «Записей» и годы) фиксированная
  раскладка и проценты снимаются (`table-layout: auto`, `th:nth-child(n)
  { width: auto }`), мобильный вид не изменился.
- **Проверки:** замер `.tmp/probe-kbk-align.mjs` (CDP, headless) на 1440,
  1024, 900, 390 px — на 1440/1024 `delta = 0` по всем пяти суммам,
  правые края чисел совпадают (447/581/716/851/986), `scrollWidth = clientWidth`
  у `th` и `td`; на 900 обе таблицы 960 px со скроллом 121 px; на 390 сводка
  в две графы (`overflowPx = 0`), итоги — как раньше со скроллом 360 px.
  `prettier --check`, `tsc -b`, `oxlint src` (0 ошибок), `vite build` — exit 0.
  Сортировка и «руб.» перепроверены `.tmp/probe-kbk-sort.mjs`.
- **Значок сортировки:** в сводке по КБК неактивное состояние показывает `⇅`
  (U+21C5) кеглем 11 px вместо `↕` 9 px — тонкая `↕` читалась как двоеточие
  после «Всего, руб.». Активные `▲/▼` остались, выросли тем же кеглем.
  Крупный план снимается `.tmp/probe-sort-icon.mjs` (3× масштаб, `TAG`,
  `CLICK_SORT=1` — ещё и активное состояние). В реестре контрактов остался
  прежний `↕` 9 px — если понадобится единый вид, менять там же парой.

## 105. Особые закупки: одна кнопка сохранения (2026-11-22)

- Удалена верхняя кнопка «Сохранить изменения» из панели рядом с фильтрами:
  осталась только нижняя, под таблицей. Обе вызывали один и тот же `saveItems`,
  поэтому дубль ничего не добавлял, а в раскрытом списке мешал. Кнопка
  «Раскрыть все / Свернуть все» в верхней панели осталась.
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint` по файлу — exit 0,
  `vite build` — exit 0. Браузер `:5173`: на вкладке «Особые закупки»
  найдена одна кнопка «Сохранить изменения» (нижняя) и одна «Раскрыть все».
  «Сохранить» не нажималось, `db.json` не менялся.

## 106. Карточка позиции: таблицы раздела 3 по ширине блока ОКПД2 (2026-11-22)

- В `PurchasePlanPositionForm.module.scss` таблицы «Объём финансового
  обеспечения закупки» (`&__table--amounts`) и «Детализация по кодам бюджетной
  классификации» (`&__table--kbk`) получили `width: 100%`: они заполняют ту же
  область содержимого, что и полная графа «Код ОКПД2» в разделе 2. Раньше
  обе таблицы были жёстко 1100 px и были уже блока ОКПД2. У таблицы сумм
  сохранён `min-width: 1000px`, у обёрток — горизонтальная прокрутка на узких
  экранах; остальные таблицы карточки (ИКЗ, КОКС, изменения) не тронуты.
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint src` — без ошибок (только
  существующие предупреждения), `vite build` — exit 0. Браузер `:5173`,
  карточка позиции `...-6/edit`: блок ОКПД2 `x=72…1197`, ширина 1125 px;
  обе таблицы `x=71…1197`, ширина 1126 px, `scrollWidth = clientWidth = 1126`.
  Правые края совпадают, ошибок консоли нет. «Сохранить» не нажималось,
  `db.json` не менялся.

## 107. Карточка позиции: кнопка «Удалить» по центру графы (2026-11-22)

- Графа действий (`&__col--action`) в таблицах детализации была 78 px. С учётом
  отступов ячейки под кнопку «Удалить» оставалось ~62 px при ширине кнопки
  72 px, поэтому она вылезала вправо и казалась прилипшей к краю. Ширина графы
  увеличена до 100 px; `text-align: center` у `&__cell--action` заработал как
  надо. Общая колонка используется и в таблице КБК, и в таблице КОКС, поэтому
  обе детализации теперь центрируют кнопку одинаково.
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint` по компоненту — 0 ошибок,
  `vite build` — exit 0. Браузер `:5173`, таблица КБК карточки позиции:
  ячейка 101 px, кнопка 72 px, поля слева и справа по 15 px, `text-align: center`.
  «Сохранить» не нажималось, `db.json` не менялся.

## 108. Окно записей КБК: прилипшая шапка и ссылки на извещения/СЗ (2026-11-22)

- **Шапка «тянулась»:** `th` уже был `position: sticky`, но фон брался из
  `--surface-raised`, а в светлой теме это `rgba(snowy-mint, 0.75)` — сквозь
  шапку просвечивали прокручиваемые строки. Теперь `background-color:
  var(--surface-panel)` (непрозрачная панель) + `background-image:
  linear-gradient(var(--surface-raised), var(--surface-raised))` — оттенок
  сохранился, просвечивания нет; в тёмных темах `--surface-raised` непрозрачен,
  вид не изменился. Нижнюю границу у прилипшей ячейки при `border-collapse:
  collapse` Chrome не прокручивает — она заменена `box-shadow: inset 0 -1px 0
  var(--border)`.
- **Полоса над шапкой:** верхний отступ был `padding-top` у `.modal-body`, а
  padding скролл-контейнера остаётся на месте — в 18 px над шапкой были видны
  строки. Отступ перенесён на таблицу (`.records-table { margin-top: 18px }`,
  на телефоне 12 px), у `.modal-body` `padding: 0 22px 18px`.
- **Вместо ИКЗ — документы:** графа «ИКЗ / номер записи» заменена на
  «Извещение / СЗ». Ссылка на извещение ведёт в
  `/procurement-processing/:procurementId/notice-info`, на СЗ — в
  `/purchase-plans/:planId/positions/:positionId/requirement?noteId=:id`
  (как из реестра СЗ). ИКЗ больше не выводится, поле `documentNumber` из
  `KbkRecordUsage` убрано.
- **Ключи связи (важно):** в сиде ИКЗ извещения и позиции часто НЕ совпадают
  по последним разрядам, поэтому извещения ищутся двумя ключами —
  `notices[].generalInfo.positionUniqueNumber` = `positions[].uniqueNumber`
  (основной) и `procurements[].ikz` = `positions[].identificationCode`
  (дополнительный); найденное склеивается по номеру закупки. Номер извещения
  берётся из закупки, а если там ещё пусто — из сохранённой формы `notices`.
  СЗ ищутся по `positionId`, у особых закупок — по ИКЗ. Отменённые извещения
  и аннулированные СЗ не показываются; извещение без номера выводится как
  «Извещение · На подготовке».
- **Клики:** строка записи по-прежнему открывает позицию/вкладку особых
  закупок, а ссылки внутри неё — документ: `stopPropagation` на клик и
  `onKeyDown` у `tr` срабатывает только при `event.target ===
  event.currentTarget`. На `max-width: 700px` графа документов скрыта, те же
  ссылки показываются под наименованием (`doc-links-under-title`).
- **Проверки:** `.tmp/probe-kbk-modal.mjs` (CDP, headless; `TAG`, `WIDTH`,
  `SCROLL`) — 1440/1024/390 px: `th` после скролла на `top = 0`, шапка
  непрозрачная, `overflow dialog/body = 0`; клик по извещению уводит на
  `/procurement-processing/eis-0144200001826000193/notice-info` (модалка
  закрыта), по СЗ — на `.../positions/202601442000018001-1/requirement?noteId=1`.
  `prettier --check`, `tsc -b`, `oxlint src` (0 ошибок), `vite build` — exit 0.
- **Чужая незавершённая работа на момент правки:** `PurchasePlanCard.tsx`
  (сортировка позиций со старым `↕` 9 px), `PurchasePlanPositionForm.module.scss`,
  `db.json` — не трогались, не коммитились.

## 109. Карточка позиции: детализация КОКС по ширине КБК (2026-11-22)

- В `PurchasePlanPositionForm.module.scss` у `&__table--koks` добавлен
  `width: 100%`. До этого таблица «Детализация по кодам КОКС — ОКС/ОНИ»
  наследовала базовую ширину `&__table` = 1100 px и была уже таблицы КБК и
  полной графы «Код ОКПД2». Теперь все три таблицы раздела 3 занимают одну
  область: `x = 71…1197`, ширина 1126 px, горизонтальной прокрутки нет.
- Вкладка «Особые закупки» карточки ПГ не менялась: там `&__kbk-table` и
  `&__koks-table` уже были `width: 100%`.
- **Проверка:** браузер `:5173`, карточка позиции `...-6/edit`, чекбокс КОКС
  включён только в форме (без сохранения): таблицы `--amounts`, `--kbk`,
  `--koks` — все 1126 px; `db.json` не менялся, «Сохранить» не нажималось.

## 110. Список позиций ПГ: сортировка граф и без горизонтальной прокрутки (2026-11-22)

> Сортировка из этого раздела **откачена по просьбе пользователя** — см. §111.
> Осталась только правка ширин/отсутствия горизонтальной прокрутки.

- В `PurchasePlanCard.tsx` добавлена сортировка шести граф из таблицы позиций:
  планируемый год, номер закупки, наименование объекта, ИКЗ (во второй строке
  шапки, `colSpan={2}`), наименование по ОКПД2 и объём финансирования.
  Компонент `SortableTh` рисует кликабельную шапку со стрелкой `↕ / ▲ / ▼` и
  выставляет `aria-sort`. Повторный клик переворачивает направление, при
  смене графы и при сортировке сбрасывается страница пагинации.
- Год, номер и сумма сравниваются как числа через `toNumber`, текст — через
  `localeCompare("ru", {numeric: true})`. Для ОКПД2 сначала берётся
  `position.okpd2Name`, потом имя из справочника через `findOkpd2ByCode`.
  Пустые значения уходят вниз при любом направлении. Сортировка применяется
  к отфильтрованному поиском списку, не к исходным данным плана.
- **Горизонтальный скролл убран:** таблица получила `table-layout: fixed` и
  `<colgroup>` с процентной сеткой 10 + 8 + 23 + 23 + 10 + 8 + 8 + 10 = 100%.
  Убраны жёсткие `min-width` у граф года (112 px), номера (94 px), объекта
  (270 px) и ОКПД2 (246 px), а также `width: 100px` у графы действий — именно
  кнопка «Действия» вылезала за правый край на 9 px и создавала скролл.
  Длинные названия переносятся через `overflow-wrap: anywhere`.
- **Проверки:** `tsc -b` — 0 ошибок, `oxlint src` — только существующие
  предупреждения (в новых файлах нет), `prettier --check` и `vite build` — exit 0.
  Браузер `:5173`, план `eisp-202601442000018001`, вкладка «Позиции»: 6 кликабельных
  шапок, `aria-sort` переключается, порядок строк меняется (сумма: 0,00 →
  «▲»; 3 098 087 563,43 → «▼»). Ширина таблицы и обёртки 1126 px,
  `scrollWidth = clientWidth`, вылезающих элементов нет. «Сохранить» не
  нажималось, `db.json` и `Лес 3D.jpg` не трогались.

## 111. Шапки граф списка позиций снова обычные лейблы (2026-11-22)

- Пользователь попросил убрать кнопки сортировки: все девять заголовков таблицы
  позиций должны выглядеть одинаково — как «Статус», «Обязательное
  общественное обсуждение» и «Действия». Удалены `SortableTh`, тип/состояние
  сортировки, обработчик клика и весь код сравнения в `filteredPositions`;
  шапки снова обычные `<th>` (включая ИКЗ во второй строке с `colSpan={2}`).
  Из SCSS убраны `&__sort-btn` и `&__sort-icon`.
- Правка ширин из §110 сохранена полностью: `<colgroup>` 10+8+23+23+10+8+8+10,
  `table-layout: fixed`, без жёстких `min-width`. Поэтому прокрутки нет и
  после удаления кнопок.
- **Проверки:** `prettier --check`, `tsc -b`, `oxlint` по компоненту,
  `vite build` — exit 0. Браузер `:5173`, вкладка «Позиции плана-графика»
  плана `eisp-202601442000018001`: кнопок в `thead`
  0, `aria-sort` 0, девять текстовых заголовков, таблица и обёртка 1126 px,
  `scrollWidth = clientWidth = 1126`, ошибок консоли нет. «Сохранить» не
  нажималось, `db.json` и `Лес 3D.jpg` не трогались.

## 112. Шестая тема «Современные закупки»: неон, комета, магнит (2026-11-22)

- **Что это.** Ядро визуального концепта пользователя: тёмная неоновая тема
  (ночной индиго-графит, циановый акцент, техно-сетка), объёмные тени у
  панелей, мерцающий неоновый контур с бегущей кометой у больших стационарных
  блоков, подъём блока от правого нижнего угла с приспусканием на hover и
  магнитное расхождение коротких списков при движении курсора. Включается
  шестой по счёту кнопкой темы в шапке: светлая → тёмная → «Гроза» → «Зима» →
  «Парящие 3D» → «Современные закупки» → светлая.
- **Файлы.** Палитра — `_variables.scss` (`$color-modern-*`), роли и токены
  объёма — `_themes.scss` (`[data-theme="modern"]`), эффекты —
  `src/scss/global/_theme-modern.scss` (импорт в `global.scss`), разметка
  декора — `src/components/AppLayout/ModernMotionLayer.tsx` (подключён в
  `AppLayout` рядом с `SidePolarCurves`), перечисление тем — `useTheme.ts` и
  `Header.tsx`. Компоненты интерфейса не менялись: тема работает через роли
  `var(--surface-*)`, `var(--text-*)`, `var(--accent)`.
- **Комета.** `::after` (или `::before`, если `::after` занят декором
  компонента) заливается `conic-gradient`, маска `content-box` + `exclude`
  оставляет рамку 1 px; угол `--modern-comet-angle` анимируется через
  `@property`, вторая анимация (`modern-neon-breathe`) даёт мерцание. Выбор
  псевдоэлемента и порог «большого блока» считает JS: ширина ≥ 560 px
  (на узком экране — `innerWidth - 32`), высота ≥ 240 px.
- **Подъём.** `data-modern-lift` получают панели без `position: fixed` внутри
  (проверка по маркерам `overlay/modal/tooltip/popup/dropdown/fixed` + точный
  перебор computed-стилей до 800 узлов), кроме `table` и `[role="dialog"]`:
  `transform` делает предка containing block, и окно/шапка таблицы уехали бы.
  Наклон `-0.45deg` (на ≤600 px — `-0.2deg`), `transform-origin: 100% 100%`;
  на `:hover`/`:focus-within` блок встаёт на место (`translateY(1px)`) и
  получает неоновую тень.
- **Магнит.** Короткие списки (`__tabs`, `tabs`, `filters`, `stats`,
  навигация шапки) с площадью ≤ 520×300: сдвиг `0.12 * min(w, h)` с
  затуханием к радиусу 170 px, знак — по проекции центра на перпендикуляр к
  вектору движения; запись в `transform` раз в кадр (`rAF`), возврат — CSS
  `transition`.
- **Проверки.** `.tmp/probe-modern-theme.mjs` (CDP, headless; `ROUTE`, `WIDTH`,
  `THEME`): карточка плана 1440 px — 3 кометы, 3 подъёма, 25 магнитов,
  `animationName: modern-comet-run, modern-neon-breathe` (8 s / 3.6 s),
  `transform` подъёма `matrix(0.999969, -0.007854, …)`, hover →
  `matrix(1, 0, 0, 1, 0, 1)`; магнит после горизонтального движения курсора —
  `translate3d(0px, 1.94px, 0px)` (сдвиг по вертикали). 390 px — 3/3/7,
  `overflowX html/body = 0`. Реестр контрактов — комета на таблице
  (`contractsTable`), подъёма нет (by design), 18 магнитов.
  `prefers-reduced-motion: reduce` — `animation: none`, `transform: none`,
  магнитов 0. Модалка записей КБК в теме: шапка прилипает (`thTop = 0`),
  ссылки работают. `prettier --check`, `tsc -b`, `oxlint src` (0 ошибок),
  `vite build` — exit 0.
- **Не входит в этот этап:** бесконечные горизонтальные ленты для списков из
  4–6 элементов и «папки» по годам в реестре контрактов — это отдельные
  изменения структуры экранов, обсуждены с пользователем отдельно.
- **Чужая незавершённая работа на момент правки:** `db.json`,
  `scripts/import-eis-client.mjs`, `scripts/lib/`, `scripts/repair-eis-notes.mjs`,
  `Лес 3D.jpg` — не трогались, не коммитились.

## 113. СЗ как источник предзаполнения извещения после выгрузки ЕИС (2026-11-22)

- **Смысл по уточнению пользователя.** СЗ — это не просто звено цепочки, а
  предзаполнение извещения: каждый одобренный («зелёный») блок СЗ уходит в
  извещение. В извещении остаются технические значения (номера, даты, ЕТП,
  характеристики объекта из XML), а решающие значения приходят из СЗ. Структуру
  данных и XML менять нельзя — перенос идёт по уже существующим полям схем.
- **Проблема.** `pruneDb()` в импорте стирает `purchaseNotes`, поэтому после
  каждой выгрузки цепочка «ПГ → СЗ → извещение» рвалась. Хуже того:
  `NoticeInfoForm` ищет СЗ по `purchaseNoteId`, `procurementId` или ИКЗ и
  предзаполняет из неё извещение — пустая СЗ затирала бы данные выгрузки.
- **Решение.** Новый генератор `scripts/lib/import-eis-notes.mjs` создаёт СЗ по
  позициям с извещениями и переносит в неё одобренные блоки: критерии оценки
  (шесть слотов извещения → четыре типа СЗ), требования ст. 31 / ПП 1482 /
  ПП 2571, СМП, обеспечение заявки и контракта, гарантию, казначейское и
  банковское сопровождение, аванс, бюджет, сроки, места поставки, основание
  процедуры и объекты закупки. ИКЗ берётся из извещения (он отличается от ИКЗ
  позиции ПГ), чтобы не испортить XML. Статус СЗ — `approved`.
- **Подключение.** `scripts/import-eis-client.mjs` вызывает генератор после
  `pruneDb()` и до `applyEisChain()`, отчёт получил поле
  `purchaseNotesCreated`. `scripts/repair-eis-notes.mjs` — отдельная утилита,
  которая восстанавливает СЗ после уже выполненной выгрузки без повторного
  сетевого импорта (`--dry-run`, `--db`). Существующие СЗ не перезаписываются.
- **Сохранение структуры извещения.** В `NoticeInfoForm.tsx` fallback
  `objectDescription` из СЗ теперь объединяется с текущим значением, а не
  заменяет его пустыми строками: характеристики и КТРУ из ЕИС сохраняются.
- **Проверки.** Сгенерированные СЗ проходят `PurchaseNoteSchema` (3/3). На копии
  `db.json` во временном каталоге: СЗ 1 → 4, цепочек 564, с ссылкой на СЗ 4
  (была 1), `plan.no_purchase_note` 258 → 255; в цепочках 0066, 0114, 0126
  разрыв «ПГ → извещение» устранён. `npx tsc -b`, `npx oxlint src` (0 ошибок,
  только прежние warning), `npx vite build` — exit 0. `prettier --check` новых
  файлов зелёный; `scripts/import-eis-client.mjs` и `NoticeInfoForm.tsx` уже
  не проходили prettier в HEAD, их чужая реформация откачена. `Лес 3D.jpg` и
  тема не трогались, «Сохранить» в браузере не нажималось.
- **Применение к рабочей БД (по прямому подтверждению пользователя).** Связи
  не были видны, потому что проверка шла на копии: в рабочем `db.json` оставалась
  1 СЗ. Запущен `node scripts/repair-eis-notes.mjs --db db.json` → СЗ 1 → 4
  (id 2, 3, 4 по позициям -106, -117, -59), `alreadyLinked: 0`. API
  `/purchaseNotes` отдаёт 4 записи. В браузере `/eis/chains` после перезагрузки:
  «Всего цепочек: 560», закупка 0066 → `СЗ id 4` + извещение
  `eisn-...0193`, 0114 → `СЗ id 2` + `eisn-...0201`, 0126 → `СЗ id 3` +
  `eisn-...0194`; всего 7 упоминаний `СЗ id` (4 в ПГ + 3 в извещениях).
  Форма `/procurement-processing/eis-0144200001826000201/notice-info` показывает
  баннер «Предзаполнение из потребности: СЗ № 2 от 2026-11-20». Консоль всё ещё
  ругается на дубли ключей `purchase:XXXX` (отдельный баг ниже).
- **Отдельно (не сделано):** «Направить на контроль» в списке ПГ; дубли ключей
  `purchase:XXXX` в `chainKey()` (`eisChainBuilder.ts`) — 126 разных
  `purchaseNumber` на 232 позиции, до 3 повторов.
## 114. Реестр контрактов: папки по годам заключения (2026-11-22)

- **Запрос пользователя.** Ранее отложенный этап из §112: реестр контрактов
  раскладывается по «папкам» — по годам заключения контракта (`contractDate`),
  раскрытая папка занимает основную область и листается внутри себя.
- **Раскладка.** В `ContractRegistryPage.tsx` после фильтров и сортировки
  строится `contractFolders` (useMemo): группы по году из `contractDate`,
  контракты без даты — папка «Без даты заключения» (в конце списка), годы —
  по убыванию. Счётчик и сумма в корешке считаются по контрактам папки,
  `formatMoneyShort` даёт компактную сумму (млрд/млн/тыс. ₽).
- **Структура экрана.** `folderLayout` — grid `208px minmax(0, 1fr)`:
  слева `nav.folderRail` (sticky) с корешком «Все» и годами, справа
  `folderMain` — заголовок папки (`folderTitle`, `folderMeta`) и прежняя
  таблица `contractsTable` внутри `contractsTableWrap`. Корешок — кнопка с
  цветной полосой `::before`, у активного `aria-current="true"` и
  `folderTabActive` (`--surface-accent`).
- **Поведение.** По умолчанию открыта самая свежая папка; клик по другому
  корешку переключает папку и сбрасывает страницу на первую; повторный клик
  возвращает самую свежую; «Все» показывает прежний общий список (428
  контрактов в рабочем `db.json`). Пагинация (`totalPages`, `start`,
  `pagedContracts`, подпись «1–10 из N») считается по контрактам раскрытой
  папки, а не по всей выборке.
- **Адаптив.** `@media (max-width: 1100px)` — рейл становится горизонтальной
  лентой над таблицей (`flex-direction: row`, собственный `overflow-x`), на
  ≤600 px корешок 132 px. Горизонтальной прокрутки страницы нет.
- **Проверки.** `.tmp/probe-year-folders.mjs` (CDP; `WIDTH`, `THEME`, `TAG`),
  1440 px: папки 2026/109, 2025/71, 2024/44, 2023/48, 2022/59, 2021/97, «Все»/428;
  по умолчанию открыта 2026 («1–10 из 109»), клик 2025 → «1–10 из 71», «Вперёд»
  → «11–20 из 71», повторный клик → 2026, «Все» → «1–10 из 428»; `grid
  208px 916px`, `overflowX = 0/0`, консоль чистая. 390 px: `flexDirection: row`,
  `grid: 366px`, `overflowX = 0/0`. Тема `modern` — скриншот читаемый.
  `prettier --check`, `tsc -b`, `oxlint src` (0 ошибок, 80 warning — прежние),
  `vite build` — exit 0.
- **Не сделано:** бесконечные горизонтальные ленты для списков (следующий
  отложенный этап из §112); ручной выбор папки в URL не сохраняется.

## 115. Полная пересборка СЗ строго из извещений 2026 года (2026-11-22)

- **Запрос пользователя.** Связи по-прежнему не устраивали: «просто снести
  все СЗ и запушить туда в нужные поля данные из извещения», плюс «только
  2026 сделать извещения, то чего нет — заглушку по умолчанию».
- **Решение.** `scripts/repair-eis-notes.mjs` получил флаги `--replace` и
  `--year` (по умолчанию 2026, `all` — без фильтра). `--replace` удаляет все
  СЗ, сбрасывает `purchaseNoteId` у извещений и строит записи заново только
  по извещениям нужного года. Год берётся из `publishDTInEIS`, `ikzYear`,
  `eisImport.planNumber`, `positionUniqueNumber`.
- **Заглушки.** В `scripts/lib/import-eis-notes.mjs` добавлен
  `DEFAULT_NOTE_FIELDS` — те же значения, что `emptyPurchaseNote()` в схеме СЗ
  (basis, КБК-флаги, бюджет, priceBasis, сроки и приёмка, требования ст. 31 /
  ПП 1482 / ПП 2571, обеспечения, гарантия, места поставки, статусные поля).
  Сверху накладываются только реально найденные в извещении блоки. Структура и
  XML не менялись: все новые поля уже есть в `PurchaseNoteSchema`.
- **Результат на рабочей БД.** `node scripts/repair-eis-notes.mjs --db db.json
  --replace --year 2026`: удалено 4, создано 3 (id 1/2/3 по позициям -106/-117/
  -59), пропущено извещений 0; связи извещений → 1, 2, 3. Все 3 СЗ проходят
  `PurchaseNoteSchema` (rolldown + safeParse, 3/3 VALID). В браузере
  `/eis/chains`: закупка 0114 → СЗ 1 + извещение …0201, 0126 → СЗ 2 + …0194,
  0066 → СЗ 3 + …0193 (6 упоминаний `СЗ id`). Форма
  `/procurement-processing/eis-0144200001826000201/notice-info` показывает
  «Предзаполнение из потребности: СЗ № 1 от 2026-11-20».
- **Проверки:** `node --check`, `prettier --check` новых/правленых скриптов,
  `tsc -b`, `oxlint src` (0 ошибок), `vite build` — exit 0. «Сохранить» не
  нажималось; `Лес 3D.jpg` и чужие файлы не трогались.
- **Отдельно:** дубли ключей `purchase:XXXX` в консоли `/eis/chains` остаются
  (это `chainKey()`, не СЗ).

## 116. Реестр контрактов: плитки-папки на старте и раскрытие листа из центра (2026-11-22)

- **Запрос пользователя.** Переделать экран из §114: на старте никакой таблицы
  и никаких полос прокрутки — только крупные папки в два ряда по четыре под
  фильтрами; при выборе папки все плитки уезжают вправо за контейнер, а лист
  контрактов раскрывается (от центральной горизонтальной линии к краям) и
  занимает весь контейнер; папку нужно закреплять в адресе.
- **Стартовый экран.** `folderGrid` — `repeat(4, minmax(0, 1fr))`, плитка
  `folderCard`: лейбл («Папка · 2026»), крупный год (30 px), «N контрактов ·
  сумма» (`contractsLabel`, `formatMoneyShort`), стрелка на hover; «Все» —
  акцентная плитка «Сводный реестр». Семь плиток на рабочем `db.json` дают
  два ряда. На 1440 px страница не прокручивается (`pageScrollY = 0`,
  `overflowX = 0`).
- **Раскрытие.** `folderStage` — grid-слои в одной ячейке (`grid-area: 1 / 1`)
  с `overflow: clip`: `folderGrid` уезжает `translateX(calc(100% + 48px))` и
  гаснет, `folderPanel` появляется keyframe `folderReveal` (`clip-path:
  inset(50% 0 50% 0)` → `inset(0)`), задержка 0.16 s, ширина 1140 px = вся
  ширина реестра. Панель рендерится только при открытой папке; `key` по
  параметру заставляет переключение папки проигрывать раскрытие заново,
  `inert` на сетке, пока лист открыт.
- **Адрес.** `?folder=2026`, `?folder=__all__`; без параметра — плитки. Клик
  пишет параметр через `setSearchParams` (остальные параметры, в т. ч.
  `?group=`, сохраняются), «← Все папки» удаляет его. Ссылка с `?folder=2026`
  сразу открывает папку — её можно закрепить.
- **Скроллы.** Старый рейл с `overflow-x: auto` убран. У `.contractsTableWrap`
  теперь `overflow-y: hidden`: при `overflow-x: auto` браузер включал и
  вертикальную прокрутку, и субпиксельный 1 px переполнения рисовал полосу
  справа от таблицы.
- **Адаптив.** ≤1100 px — три плитки в ряду, ≤820 px — две, ≤600 px — плитка
  116 px и мета 11 px. `prefers-reduced-motion` отключает выезд и раскрытие.
  Горизонтальной прокрутки нет: 1440 — `overflowX 0/0`, 390 — `0/0`.
- **Проверки.** `.tmp/probe-year-folders.mjs` переписан: старт → клик третьей
  плитки (2025) → «Вперёд» → «Все папки» → переход на `?folder=2026`.
  1440 px: старт 7 плиток `274.5px × 4`, высота 148, `pageScrollY 0`; 2025 —
  `?folder=2025`, панель 1140 px, «1–10 из 71», затем «11–20 из 71»; возврат —
  параметра нет, сетка `transform: none`; ссылка `?folder=2026` — «1–10 из 109».
  390 px — две колонки `178px`, панель 366 px, `overflowX 0/0`. Тема `modern`
  — скриншоты чистые, у таблицы полосы прокрутки больше нет.
  `prettier --check`, `tsc -b`, `oxlint src` (0 ошибок, 80 warning — прежние),
  `vite build` (11.63 s) — exit 0, консоль без ошибок.
- **Не сделано:** `?folder=` не сбрасывается при смене `?group=`; на мобиле
  стартовый экран выше вьюпорта на 133 px за счёт шапки и панели фильтров.

## 117. Догруз извещений ЕИС за 2025–2026 и СЗ по ним (2026-11-22)

- **Запрос пользователя.** «Догрузи всё только за два прошедших года 2025 и
  2026» — после §115 в базе было всего 3 извещения, поэтому СЗ строились только
  по ним.
- **Импорт.** `scripts/import-eis-client.mjs` получил явные флаги `--plan-from`,
  `--notice-from`, `--to` (ДД.ММ.ГГГГ; без них поведение прежнее — от `--years` /
  `--notice-years` назад от текущей даты). Запуск:
  `node scripts/import-eis-client.mjs --inn 4629040439 --plan-from 01.01.2025
  --notice-from 01.01.2025 --to 22.11.2026 --plans 7 --notices 500 --tasks 12`.
  Найдено 183 извещения, 2 плана (2025/2026). Генератор СЗ получил параметр
  `years[]` и строит СЗ только по годам из запрошенного диапазона.
- **Антибот ЕИС.** Первый проход импортировал 144 из 183 карточки: 39 запросов
  `printForm/view.html` получили HTTP 403. Увеличение числа попыток до 5 и
  паузы 5 с × номер попытки сократило число пропусков до 8, но полностью их не
  убрало. Добавлен `scripts/retry-eis-notice-details.mjs` — точечный догруз
  номеров из `db.eisImportSummary.detailFailures` теми же функциями
  `mapNotice`/`mapProcurement`, с последующей пересборкой СЗ, цепочек и задач.
  `import-eis-client.mjs` теперь экспортирует эти функции и не вызывает
  `main()` при импорте. Итог: 183/183 извещения, `detailFailures: []`.
- **Состояние БД.** `notices: 183` (2025 — 76, 2026 — 107); `purchaseNotes: 144`
  (2025 — 49, 2026 — 95, по уникальным позициям ПГ); у всех 183 извещений
  проставлен `purchaseNoteId`, `purchaseNotesSkipped: 0`. Все 144 СЗ проходят
  `PurchaseNoteSchema` (144/144 VALID). `/eis/chains`: «Всего цепочек: 697»,
  144 уникальных `СЗ id`; закупки 0114/0126/0066 по-прежнему ведут на СЗ 1/2/3.
  Форма извещения …0201 показывает «Предзаполнение из потребности: СЗ № 1 от
  2026-11-20». «Сохранить» не нажималось.
- **Проверки:** `node --check` всех правленых скриптов, `prettier --check`
  генератора и retry-скрипта, `npm run build` (tsc + check:db — 523 записи
  контрактного реестра валидны + vite), `oxlint src` (0 ошибок) — exit 0.
- **Отдельно:** дубли ключей `purchase:XXXX` в консоли `/eis/chains` остаются
  (92 предупреждения, это `chainKey()`, не СЗ); чужие правки `ContractRegistry`
  и `Лес 3D.jpg` не трогались и в коммит не идут.

## 118. Тема «Современные закупки»: без полос прокрутки, дёрганья и затемнения (2026-11-22)

- **Запрос пользователя.** «Убрать полосы прокрутки, которые появились; при
  ховере элементы не должны дёргаться; на больших элементах нужен эффект неона
  по краям, а не увеличение тени; вверху элемента неон можно сделать немного
  шире; тени не должны выходить за блок родителей; срабатывает какое-то
  непонятное затемнение».
- **Полосы прокрутки.** Виновник — псевдоэлемент кометы с `inset: -1px`: он
  расширял блок на 1 px по каждой оси, и в обёртке с `overflow: auto`
  (`.contractsTableWrap`) появлялась полоса. Теперь `inset: 0`, рамка лежит
  внутри блока: у обёртки таблицы `scrollWidth - clientWidth = 0`,
  `scrollHeight - clientHeight = 0` на 1440 и 1920. Второй источник —
  «фантомное» меню: у закрытого `<details[data-plan-actions]>` абсолютный
  `.menu-list` продолжал считаться в раскладке (Chrome скрывает только
  потоковое содержимое) и свисал ниже таблицы. Добавлено
  `&__menu:not([open]) &__menu-list { display: none }` в
  `PurchasePlanList.module.scss` и `PurchasePlanCard.module.scss`; на открытом
  меню `display: flex` и прежние 160×126 — проверено кликом.
- **Дёрганье на hover.** Убраны все `transform` у панелей: `data-modern-lift`
  больше не наклоняет и не приподнимает блок (`--panel-tilt` удалён из
  `_themes.scss`), у плитки папки в реестре контрактов убраны
  `translateY(-2px)` и внешняя тень. Проверка: `rect` плитки и панели до и
  после наведения совпадает, `transform: none`.
- **Неон вместо увеличения тени.** `--shadow-3d` — только inset (блик по
  верхней грани, тень по нижней), внешних размытых слоёв нет, поэтому тени не
  выходят за родителя и не затемняют соседей. `--shadow-3d-hover` — inset-неон:
  кромка 1 px по периметру (циан 0.55), яркая линия сверху 2 px (0.85), полоса
  сверху 5 px (0.4) и мягкое свечение `inset 0 16px 24px -14px` — сверху неон
  заметно шире, чем по бокам. Плитки папок на hover получают
  `inset 0 0 0 1px var(--accent)` вместо внешней тени.
- **«Непонятное затемнение».** В `@media (prefers-reduced-motion: reduce)`
  `opacity: 0.6` стояла на самой панели (`[data-modern-lift]`,
  `[data-modern-magnet]`), из-за чего все блоки тускнели. Теперь там только
  `transition: none; transform: none`, а `opacity: 0.6` осталась у псевдоэлемента
  кометы.
- **Файлы.** `src/scss/global/_themes.scss` (токены тени/неона),
  `src/scss/global/_theme-modern.scss` (объём, hover, reduced-motion, `inset: 0`
  у кометы), `src/components/AppLayout/ModernMotionLayer.tsx` (убраны
  `canLift`/`FIXED_HINTS`/`LIFT_SCAN_LIMIT` — подъёма больше нет),
  `ContractRegistry.module.scss` (плитка папки, тень выпадающего КБК),
  `PurchasePlanList.module.scss`, `PurchasePlanCard.module.scss` (фантомное меню).
- **Проверки.** `.tmp/probe-modern-issues.mjs` дополнен: реально отрисованные
  полосы прокрутки (offset − client − border), крупный план угла панели
  (`ZOOM=1`), дамп «что выходит за вьюпорт» (`DUMP=1`), клик по меню
  (`MENU=1`). Результаты: `/contract-registry` 1440 и 1920 — `scrollbarV 0`,
  `pageExtraY 0`, полос 0, `tableWrap` extra 0/0, комета на таблице; `/` —
  0/0; `/tasks` — 0; `/purchase-plans` 1440 — полос внутри 0, `pageExtraY 50`
  (это `min-height: 900px` + `padding-bottom: 120px` у `.container`, так во всех
  темах, не тема), панель на hover стоит ровно (`transform: none`,
  `opacity: 1`); 390 px на `/purchase-plans` и `/contract-registry` —
  `overflowX 0/0`, полос 0. `prettier --check`, `npx tsc -b`,
  `npx oxlint src` (0 ошибок, 80 прежних warning), `npx vite build` — exit 0.
- **Не трогалось:** 120 px нижнего отступа `.container` (даёт вертикальную
  полосу на 1440×900 на `/purchase-plans` во всех темах) и чужие правки
  `db.json`/скриптов импорта; `Лес 3D.jpg` осталась неотслеживаемой.

## 119. PostgreSQL как источник данных заказчика id 6 (2026-11-22)

- **Запрос пользователя.** Перейти на PostgreSQL для тестового заказчика `id 6`
  (ОКУ «КУРСКАВТОДОР», ИНН `4629040439`): ПГ, СЗ, извещения, процедуры,
  контракты и дети контракта. Полный CRUD, json-server не отключать, фронт не
  трогать. ИНН — главный фильтр: заказчик видит только свои документы.
- **Важная поправка пользователя.** `procurements` — не связь, а тонкая карточка
  импорта из ЕИС. Настоящая связь ПГ → СЗ → Извещение идёт по составному ключу
  `planNumber + positionUniqueNumber` (в ЕИС это `plan2020Number` +
  `position2020ExtNumber`), а дальше по ИКЗ к контракту и его детям. Всё это
  уже прокинуто при создании потребности (`PurchaseNoteModal.tsx`, строки
  502–507: `purchasePlanId`, `purchasePlanNumber`, `positionId`,
  `positionUniqueNumber`). Поэтому **никаких новых `organizationId` в
  извещения/процедуры не дописываем** — только индексы по составному ключу
  и по ИКЗ. `organizationId` для них вычисляется через `purchaseNoteId` → СЗ.
- **Инфраструктура.** PG уже запущен на `localhost:5433`, база `csms_eis`,
  PostgreSQL 17.12. Новый docker-compose и .NET-миграции не нужны. Добавлен
  драйвер `pg`; схема `csms`, таблица-контейнер `csms.documents`: `jsonb doc`
  целиком + вынесенные колонки `organization_id`, `inn`, `ikz`,
  `position_unique_number`, `plan_number`, `contract_number`, `contract_id`,
  `purchase_note_id`, `procurement_id`, `seq` для порядка. Индексы по каждой
  колонке в паре с `collection`. Никаких новых доменных схем — структура
  по-прежнему описана zod на фронте.
- **Перенос.** `scripts/seed-postgres.mjs` (`npm run pg:seed`) читает готовый
  `db.json` и идемпотентно кладёт 10 коллекций: `purchasePlans` 2, `notices` 183,
  `purchaseNotes` 144, `procurements` 183, `contractRegistry` 523,
  `contractStages`/`Payments`/`Penalties`/`Deliveries`/`Events` по 0 — всего
  1035 записей. В `contractRegistry`: 519 записей org `6` и 5 чужих
  (`1` — 2, `2` — 1, `4` — 1) — они нужны для проверки фильтра.
  Повторный прогон обновляет по `(collection, doc_id)`.
- **Адаптер.** `scripts/pg-json-server.mjs` (`npm run pg:server`) на `:3002`
  с контрактом json-server: те же пути, `?_page/_limit`, `?_start/_end`,
  `_like`, `X-Total-Count` **только при пагинации** (как у json-server),
  «голый» JSON, CORS. Коллекции из `PG_COLLECTIONS` идут в PG, остальные
  прозрачно проксируются на `:3001`. Ловушка Express 5: `app.all("*")` не
  срабатывает — нужен `app.use(async (req, res) => …)`. `GET /__pg/health`
  отдаёт счётчики по коллекциям.
- **Переключение фронта.** `.env.development` с `VITE_API_URL=http://localhost:3002`
  (новый файл, ранее адрес брался из хелпера `apiBaseUrl.ts`). Откат — одна
  строка: убрать файл или заменить адрес на `:3001`. `db.json` **не удалён** и
  остаётся зеркалом/путём отката; `npm run server` (:3001) работает параллельно.
- **Сверка.** `scripts/verify-pg-sync.mjs` сравнивает 10 одинаковых запросов
  `:3001` и `:3002` (включая фильтры, пагинацию, карточку и проксируемые
  коллекции) — все ответы и заголовки совпадают. CRUD проверен на
  `contractStages`: POST → GET → PATCH → фильтр → DELETE → 0 записей.
- **В браузере.** `/eis/chains` через `:3002`: «Всего цепочек: 697», сеть идёт
  только на `:3002`, реальных ошибок в консоли нет (остались известные дубли
  `purchase:XXXX` и `404 /api/pp2604/mapping`). Карточка
  `/procurement-processing/eis-0144200001826000201/notice-info` показывает
  «Предзаполнение из потребности: СЗ № 1 от 2026-11-20» — «Сохранить» не
  нажималось.
- **Проверки.** `npm run build` (включая `check:db` и `vite build`) — exit 0,
  `npx oxlint src` — exit 0 (только прежние warning), `node --check` новых
  скриптов — ок.
- **Dual-write (доделано).** `scripts/lib/db-write.mjs` — единая точка записи:
  сначала `db.json`, затем в той же транзакции `seedDocuments` в PG. Подключены
  все 4 скрипта: `import-eis-client.mjs` (3 точки записи),
  `retry-eis-notice-details.mjs`, `link-eis-chain.mjs` (main стал async),
  `repair-eis-notes.mjs`. `PG_SYNC=0` отключает синхронизацию, недоступная БД
  не роняет импорт — только warning, `db.json` остаётся зеркалом. В `pgConfig`
  добавлен `connectionTimeoutMillis` (5 с), чтобы офлайн-импорт не висел.
  `seedDocuments` теперь и удаляет лишние строки в коллекции (иначе
  `repair-eis-notes.mjs --replace` оставлял бы старые СЗ в PG), но не трогает
  коллекции, которых нет в источнике.
- **Проверка dual-write.** `repair-eis-notes.mjs --db <копия>` без `--replace`
  (created: 0) оставил хэш файла прежним и записал `[pg] синхронизировано 1035
  записей`; `.tmp/pg-full-diff.mjs` подтвердил побайтовое совпадение всех 1035
  документов с `db.json`. `PG_SYNC=0` и `PGPORT=5999` отработали без падения
  импорта. Удаление одной записи в источнике уменьшает счётчик СЗ 144 → 143 и
  возвращается к 144 после ROLLBACK. Важно: `link-eis-chain.mjs` при прямом
  запуске **пересчитывает** связи (`ikzPositionKey` → `procurementId`, меняет
  `eisImportSummary` и задачи), поэтому тестировать его запись на боевых
  данных нельзя; после случайного прогона PG восстановлен `npm run pg:seed`.
- **Почему `db.json` не удалён.** Физическое удаление невозможно без отказа от
  json-server: `npm run server` запускается именно с этим файлом и обслуживает
  все остальные коллекции (пользователи, организации, сотрудники, объекты
  описаний и т. д.), которые в PG не перенесены. Те же коллекции читают и
  скрипты импорта. Удаление файла сейчас сломало бы и зеркало, и импорт.
- **Не трогалось:** чужие правки `src/components/ContractRegistry/*`
  (`.module.scss`, `ContractRegistryPage.tsx`) и `Лес 3D.jpg` — в коммит не
  идут.

## 120. Поля форм: отменено дефолтное выделение браузера (2026-11-22)

- **Что сделано.** В `src/scss/global/_reboot.scss` базовое правило для
  `input, select, textarea` получило `outline: none` — системный синий контур,
  который браузер рисует при фокусе, больше не дублирует рамку темы. Взамен
  добавлено `:focus-visible` с `outline: 2px solid var(--accent)` и
  `outline-offset: 1px`, поэтому клавиатурный фокус остаётся видимым; правила
  компонентов и тем (`_controls.scss`, `_theme-modern.scss`,
  `_theme-floating3d.scss`) идут позже и с большей специфичностью, поэтому
  сохраняют свой вид.
- **Автозаполнение.** Добавлены правила `input:-webkit-autofill`
  (hover/focus), `textarea:-webkit-autofill`, `select:-webkit-autofill`:
  жёлтый/синий фон Chrome и Edge перекрывается вставкой
  `-webkit-box-shadow: 0 0 0 1000px var(--surface-field) inset`, текст и
  каретка берут цвета темы (`-webkit-text-fill-color`, `caret-color`),
  `transition: background-color 9999s` не даёт браузеру перекрасить поле заново.
- **Проверки.** `tsc -b --pretty false` — 0 ошибок, `vite build` — зелёный,
  `sass` по `src/scss/global.scss` — SASS_OK, мобильный аудит
  `/contract-registry` на 375px — `ok 375x812 scroll=375 offenders=0
  small-targets=0`.

## 121. Фавикон CSMS (2026-11-22)

- **Файл:** `public/favicon.svg` — тёмно-зелёная плитка со скруглением 14,
  градиент `#0b2b26 → #051f20`, лист документа цветом `#daf1de` с загнутым
  уголком `#8eb69b`, две строки текста и галочка приёмки цветом акцента
  светлой темы `#235347`. Палитра взята из `_variables.scss`, поэтому иконка
  совпадает с интерфейсом.
- **Подключение:** ссылка `<link rel="icon" type="image/svg+xml"
  href="/favicon.svg" sizes="any" />` в `index.html`; самого файла в `public/`
  раньше не было — теперь браузер получает иконку вместо 404. `sizes="any"`
  явно разрешает SVG на любом размере вкладки.
- **Проверки:** `vite build` — зелёный, `dist/favicon.svg` собран (1345 байт);
  dev-сервер отдаёт `GET /favicon.svg` → `200 image/svg+xml`, 1345 байт. SVG
  валиден, крупные формы (документ и галочка) читаются и в 16×16.

## 121. Реестр контрактов: папки-рельс, отступ под фильтрами, появление плиток (2026-11-22)

- **Что было.** На `/contract-registry` верхний ряд плиток примыкал к панели
  фильтров вплотную, и неоновая кромка на hover читалась как «перекрытие блоком
  сверху». При выборе папки плитки уезжали `translateX(calc(100% + 48px))` за
  правую границу `.folderStage` — становились недоступны для перевыбора, а
  страница получала горизонтальный выезд. Появления плиток не было.
- **Раскладка.** `.folderStage` получил `padding-top: 12px` — именно padding:
  вертикальные margin стадии и `margin-bottom` тулбара схлопывались. Итоговый
  зазор от фильтров до первого ряда — 28px, hover оставляет только `inset`-неон,
  поэтому свечение не выходит за плитку. В открытом состоянии
  `.folderStageOpen` — сетка `minmax(0, 1fr) 180px`: лист контрактов в основной
  колонке, папки — узким рельсом справа (`grid-area: 1 / 2`); `inert` с сетки
  снят, любой год перевыбирается одним кликом. Открытая папка помечена
  `.folderCardActive` + `aria-pressed`.
- **Порог рельса — 1200px.** В диапазоне 1101–1200px лист с рельсом сужается до
  860–946px, и 19-значный номер реестровой записи и цена переносились по цифре
  (замерено на 1101px). Поэтому до 1200px папки уходят полосой наверх
  (4 колонки), ≤1100px — 3, ≤820px — 2, лист занимает всю ширину. В открытом
  состоянии `.contractsTable` получает `min-width: 0` и перенос заголовков —
  горизонтальной прокрутки внутри листа нет (`scrollWidth - clientWidth = 0`).
- **Анимации.** `folderTileIn` (0.5s, подъём 10px + fade, задержки 60–420ms по
  порядку), `folderRailIn` (0.42s, рельс приезжает справа), `folderReveal`
  (0.55s, лист раскрывается по вертикали). Всё отключается
  `prefers-reduced-motion: reduce`.
- **Замеры** (headless Chrome + `Emulation.setEmulatedMedia`): 1440/1280 —
  рельс 180px внутри контейнера (x 1103–1283 при правой границе 1299),
  `pageExtraX = 0`; 1201 — рельс, лист 946px; 1150 — полоса сверху, лист
  1103px; 1024 — полоса в 3 колонки, лист 977px; 390 — 2 колонки, переполнение
  только внутри `.contractsTableWrap` (`overflow-x: auto`), `pageExtraX = 0`.
  Анимации в полёте: `folderTileIn` в `running`, `opacity 0.62 → 1`,
  `transform translateY(10px) → none`.
- **Проверки:** `npx tsc -b` — 0 ошибок, `npx oxlint src` — 0 ошибок (80 прежних
  warning, в `ContractRegistry` их нет), `npx vite build` — зелёный,
  `prettier --check` по двум файлам — чисто.
- **Не в коммите:** `Лес 3D.jpg` в корне — пользовательский файл, к задаче не
  относится.

## 122. Вариант 2: PostgreSQL единственный источник, доступ с другого устройства (2026-11-22)

- **Запрос пользователя.** После dual-write выбран «вариант 2»: перенести в PG
  абсолютно все коллекции и открыть систему с другого устройства.
- **Перенос.** `PG_COLLECTIONS` расширен до всех 42 коллекций (пользователи,
  организации, сотрудники, задания, справочники, пустые коллекции и т. д.).
  `npm run pg:seed` перенес 1057 записей; `eisImportSummary` хранится в той же
  таблице как документ `_meta/eisImportSummary`. Полная сверка
  `.tmp/pg-full-db-diff.mjs`: все 42 коллекции и сводка побайтово совпадают с
  резервной копией (копия лежит вне репозитория,
  `C:/Users/liven/AppData/Local/Temp/opencode/db-before-pg-full.json`).
- **Адаптер.** `scripts/pg-json-server.mjs (:3002)` больше не проксирует на
  `:3001`: любые коллекции идут в PG, неизвестный путь → 404 (как json-server).
  Добавлен `_expand` (реально используется только `_expand=structuralUnit` на
  сотрудниках — реализация json-server `<name>Id` → коллекция `<name>s`), POST
  уважает переданный `id`, `DELETE /collection` чистит всю коллекцию.
  `X-Total-Count` по-прежнему только при пагинации, CORS и `/__pg/health` на месте.
- **Скрипты.** `scripts/lib/db-write.mjs` теперь читает данные из PG (`readDb`);
  файл используется только если путь реально существует (тестовые копии
  через `--db`). `writeDb` пишет в PG, а в файл — только если он есть,
  новый файл не создаётся. `check-db-schema.mjs` берёт `contractRegistry`
  из PG, поэтому `npm run build` работает без файла.
  `seed-postgres.mjs` без аргумента просто сообщает, что данные уже в PG; для
  восстановления нужно явно указать путь к бэкапу. `verify-pg-sync.mjs`
  переделан: сравнивает ответы адаптера с документами, загруженными из PG
  (11 проверок, включая `_expand` и `X-Total-Count`).
- **Один порт.** `.env.development`: `VITE_API_URL=/pg-api`. `vite.config.ts`
  получил прокси `/pg-api` → `:3002` с `rewrite` (префикс срезается) и
  `server.host: true` + `allowedHosts: true`. Фронт и код не менялись — поменялся
  только адрес. `npm start` поднимает `pg:server`.
- **Один источник.** Путь отката через `VITE_API_URL` исчез; `npm start`
  поднимает Vite, PG-адаптер и csms-api.
- **Уборка после перехода.** Команда `npm run server` и старые dev-зависимости
  удалены из `package.json` и lock-файла; рабочие команды — `npm start`,
  `npm run pg:server`, `npm run api`, `npm run dev`. Скрипты импорта по умолчанию
  читают и пишут PG, `--db` нужен только для тестовых копий. Активные упоминания
  старого файлового хранилища вычищены из `AGENTS.md`, `PROJECT.md`, скриптов и
  этой секции; исторические §§1–121 оставлены как есть.
- **Доступ с другого устройства.** Адрес `http://192.168.50.101:5173`
  (LAN-IP текущей машины, порт 5173 слушает все интерфейсы). Браузер на другом
  устройстве видит только Vite: `/pg-api/*` → PG, `/api/*` → csms-api :5099.
  `localStorage` привязан к origin, поэтому на новом устройстве/адресе нужно
  один раз войти: `poyarkova_nyu@mail.ru` / `qwerty12`. После входа
  `/eis/chains` показывает «Всего цепочек: 697», все `/pg-api/...` — 200.
  «Сохранить» в браузерных проверках не нажималось.
- **Смена логина учётки (2026-11-22).** `poyarkova_nyy@mail.ru` →
  `poyarkova_nyu@mail.ru` (пароль `qwerty12`, user id 7, employee 42). Обновлены
  документы `users` и `employees` в PG, записи `access.users` **и
  `access.employees`**, а также работающий API (in-memory import): новый логин —
  200, старый — 409. Скрипты импорта ЕИС ищут сотрудника по новому email.
  Ловушка: профиль показывает `employee.email || user.email`, поэтому замены
  только в `users`/`access.users` недостаточно — в `/api/access/me` оставался
  старый `employee.email` и личный кабинет продолжал показывать его. После
  правки достаточно обновить страницу (React Query кеширует профиль 1 минуту).
- **Проверки.** `npm run build` (включая `check:db` из PG) — exit 0,
  `npx oxlint src` — exit 0, `node scripts/verify-pg-sync.mjs` — 11/11,
  `prettier --check` по изменённым скриптам — чисто. Остались известные
  неblocking-предупреждения о дублях ключей `purchase:XXXX` на `/eis/chains`.
- **Не трогалось:** чужие правки `index.html`, `ContractRegistry.module.scss`,
  `ContractRegistryPage.tsx`, `src/scss/global/_reboot.scss` и `Лес 3D.jpg` —
  в коммит не идут.

## 123. Реестр контрактов: полёт плиток по параболе, раскрытие подробностей (2026-11-22)

- **Запрос пользователя.** Появление плиток папок не читалось как полёт —
  плитки «просто гасли на местах»; раскрытие подробностей контракта тоже
  выглядело мгновенной подменой. Нужно, чтобы плитки видимо летели по
  параболе каждая к своему месту, а детали раскрывались заметно.
- **Почему полёта не было (корень).** `--fly-path` собирался как
  `path("M 10px 20px Q ...")`. В `path()` единицы недопустимы: координаты —
  безразмерные user units (px). Из-за `px` объявление `offset-path`
  отбрасывалось целиком, `offset-distance` ни на что не влиял, и оставалась
  только анимация `opacity`. Теперь числа пишутся через `toFixed(1)` без
  единиц.
- **Замер координат.** `offsetLeft/offsetTop` считались «в лоб» от сетки, но у
  сетки и у плитки разные `offsetParent`. Введён `absoluteOffset()` — сумма
  `offsetLeft/offsetTop` по всей цепочке `offsetParent`. `offsetLeft` не
  зависит от `transform`, поэтому замер не ломает уже запущенную анимацию.
- **Геометрия пути.** `offset-anchor: center` ставит в точку пути центр
  карточки, а координаты пути отсчитываются от её статичного левого верхнего
  угла. Поэтому старт — `dx + halfW / dy + halfH` (смещение до центра сетки
  плюс полуразмер), финиш — ровно `halfW / halfH`. Иначе плитка встаёт мимо
  своего места на полкорпуса. Команда: `M startX startY Q controlX controlY
  halfW halfH`.
- **Форма дуги.** `controlY = startY/2 + halfH/2 - max(60, |dx| * 0.26)`:
  контрольная точка выше середины хорды, подъём растёт с размахом, поэтому
  парабола читается и у боковых плиток, и у средних. В `folderTileFly`
  остались только `offset-distance` и `opacity` — `scale`/`rotate` считались
  вокруг статичного центра и искажали дугу.
- **Момент расчёта.** Сетка монтируется только после загрузки контрактов,
  поэтому `useLayoutEffect` со стабильными зависимостями больше не срабатывал
  после первой загрузки данных — плитки оставались без `--fly-path`. Замер
  переведён на callback-ref `attachFolderGrid`: путь считается в момент
  появления узла, до первого кадра. Плюс `useLayoutEffect` на `folderOpen`
  (возврат из листа) и `useEffect` на `resize` (при смене ширины меняется
  `halfW/halfH` в конце пути).
- **Тайминги.** Полёт `0.8s` `cubic-bezier(0.22, 0.61, 0.36, 1)`, задержки
  веером 0.08/0.15/0.22/0.29/0.36/0.43/0.5/0.57s (`nth-child(1..7)`,
  `n + 8`) — траектории разнесены, а не сливаются в общую кучу.
- **Раскрытие подробностей.** Анимация перенесена с `<tr>` на внутренний
  `.cardBody`: `clip-path`/`transform` на табличной строке Chromium применяет
  непредсказуемо (строка обрезается вместе с ячейками). `contractDetailsIn`
  0.42s: `inset(0 0 100% 0)` → `inset(0 0 0 0)` и `translateY(-10px) → none`.
- **`prefers-reduced-motion`.** В блоке `reduce` снимаются `animation` у
  `.folderGrid > .folderCard`, рельса, `.contractRow` и
  `.expandedRow .cardBody`, а плиткам дополнительно ставится
  `offset-path: none` — без этого они застыли бы в точке старта (центр сетки).
- **Замеры** (`.tmp/probe-folders.mjs`, headless Chrome 1440×900):
  `computedPath = path("M 570 155 Q 375.4 2 137.5 74")`; выборка
  `start/q1/mid/q3/end` даёт координаты, не лежащие на прямой (в середине
  дуга выше хорды на ~56 px в координатах сетки); кадр `mid-air` показывает
  плитки веером в воздухе; после «Все папки» `folderTileFly` снова `running`
  (`currentTime 67`), затем `idle` — все 7 плиток в своих слотах сетки
  (275×148, gap 14px). Раскрытие: `contractDetailsIn`, `0.42s`,
  `clip-path: inset(0 0 11.7%)` через 110 мс. `REDUCED=1`: `animation-name:
  none`, `offset-path: none`, плитки сразу на местах (`[150,400]`), раскрытие
  мгновенное.
- **Ловушка проверки.** Headless Chrome по умолчанию отдаёт
  `prefers-reduced-motion: reduce`, поэтому без
  `Emulation.setEmulatedMedia({ features: [{ name: "prefers-reduced-motion",
  value: "no-preference" }] })` любая проба видит «анимации нет» и делает
  ложный вывод. В `probe-folders.mjs` режим переключается `REDUCED=1`.
  Второй раз ловушка — логин: проба подставляла старый
  `poyarkova_nyy@mail.ru`, пользователь не находился, страница показывала
  «Контрактов по заданным условиям не найдено» и 0 плиток. Актуальный логин —
  `poyarkova_nyu@mail.ru` (§122).
- **Проверки:** `npx tsc -b` — exit 0; `npx oxlint src` — 0 ошибок (80 прежних
  warning, по `src/components/ContractRegistry` — 0).
- **Не в коммите:** `Лес 3D.jpg` в корне — пользовательский файл.

## 124. Шапка и главная: одна строка, меню «Ещё», hero с показателями (2026-11-22)

- **Запрос пользователя.** «Приведи хэдер и мэйн страницу к современному
  аккуратному виду».
- **Шапка (`Header.tsx` + `Header.module.scss`, `AppLayout.tsx`).** Была
  колонкой из 18 чипов, которые на десктопе переносились на 2–3 ряда. Теперь
  `position: sticky; top: 0` на всю ширину, внутренняя строка `max-width:
  1120px` выровнена с `Main`; фон панели полупрозрачный (`color-mix` 88 %) с
  `backdrop-filter: blur(16px)`, поэтому контент виден под шапкой, но не
  читается поверх меню. Слева — знак «Ц» + «ЦСМС / Контрактная служба», затем
  шесть пунктов контура (Главная, План-график, Потребность, Извещения,
  Контракты, Реестр контрактов с подменю) и кнопка «Ещё». Остальные разделы
  собраны в `MORE_GROUPS`: «Сквозной контур», «ЕИС», «Отчётность и контроль»;
  в нижней строке — «Покрытие XSD», «Справка» и `ReferenceDataBadge`. Справа —
  переключатель темы и профиль. Пункты больше не «чипы» с рамкой: активный
  раздел — мягкая заливка `--accent-soft`, hover — `--surface-raised`.
- **Почему «Ещё» только по клику.** При hover меню успевало раскрыться, и
  первый клик по кнопке его закрывал — со стороны это выглядело как «кнопка
  не работает». Оставлено одно состояние `isMoreOpen` + `moreRef`, закрытие по
  Escape, клику вне и смене маршрута.
- **Модалки вне `<header>`.** `EisCoverageModal` и `AgentsHelpModal` теперь
  соседи шапки, а не её потомки: `backdrop-filter` делает элемент containing
  block для `position: fixed`, и оверлей окна прилип бы к шапке.
- **Адаптив.** Ниже 1040 px — бургер и выпадающая панель (модальная: body не
  скроллится, Escape закрывает); группы «Ещё» раскрываются вложенным списком,
  подменю реестра — статичным списком. Ссылка и стрелка подменю стоят в одной
  строке (при `width: 100%` кнопка переносилась и висела отдельной точкой).
  Ниже 1240 px имя в кнопке профиля скрыто (остаётся аватар с title), иначе
  длинная фамилия выталкивала тему за край; в мобильной панели имя и стрелка
  возвращаются.
- **Главная (`Main.tsx` + `Main.module.scss`).** Вместо стопки одинаковых
  карточек: hero с датой, названием заказчика, бюджетным уровнем, реестровой
  записью, предупреждением об обязательной КС и двумя действиями («Новый
  план-график», «Реестр потребностей»); сетка из четырёх показателей со
  ссылками (контракты, планы-графики, потребности, уведомления с тоном
  danger/warning); реквизиты — компактной сеткой под разделителем.
- **Поток закупки.** Шесть этапов — карточки `grid` (6 → 3 → 2 → 1 колонки),
  номер и счётчик в верхней строке, выполненный этап — акцентная рамка и
  заливка. Аналитика Recharts и D3-монитор объединены в одну панель с
  разделителем, чтобы не плодить одинаковые карточки.
- **Разделы.** 17 ссылок разложены на три группы (`linkGroups`): планирование
  и закупки, исполнение и контроль, отчётность и кадры. Карточка ссылки —
  название + подсказка, стрелка `→` появляется на hover; на ≤980 px — две
  колонки, на ≤680 px — одна.
- **Токены.** Все цвета — роли `--surface-*`, `--text-*`, `--accent*`,
  `--state-*`, поэтому темы light/dark/storm/winter/floating3d/modern работают
  без отдельных правил. `ReferenceDataBadge` получил
  `width: min(380px, calc(100vw - 24px))`, чтобы панель не вылезала на телефоне.
- **Документация.** `UiSolutions` — новая карточка «Меню „Ещё“ в шапке»,
  обновлены описания сквозного контура и бейджа НСИ; `PROJECT.md` — главная и
  состав шапки.
- **Проверки.** `npx.cmd tsc -b --pretty false` — exit 0; `npx.cmd oxlint`
  по затронутым папкам — 0 ошибок (1 прежний warning `set-state-in-effect` в
  `Header.tsx`); `npx.cmd vite build` — exit 0. Мобильный аудит
  `node scripts/mobile-audit.mjs --routes=/ --widths=320,375,430 --theme=light`
  — overflow 0; ширины 768/900/1024/1041/1280/1440 — overflow 0. В браузере
  проверены темы dark, storm, winter, floating3d, modern и light, меню «Ещё»
  на 1440 и 390 px, мобильная панель и sticky-шапка при прокрутке.

## 125. Вход по ЭЦП с серверной проверкой подписи (2026-11-22)

- **Запрос пользователя.** «Организуй вход по ЭЦП, установленной у пользователя
  на компьютере; отдельная регистрация по ЭЦП не нужна».
- **Решение.** Регистрации нет: по сертификату находится уже существующий
  пользователь → сотрудник → организация. `POST /api/eds/challenge` выдаёт
  одноразовый наборт (TTL 5 мин), браузер подписывает его закрытым ключом
  (`signText` из `pluginSign.ts`, CAdESCOM, откреплённый CAdES-BES),
  `POST /api/eds/login` проверяет подпись на сервере и выдаёт обычный
  `csms_access_token` с тем же профилем прав, что и вход по email/паролю.
  Вход по записи реестра без подписи (`mode: "registry"`) и клиентский
  `cryptoPro.makeLoginChallenge()` для входа убраны; они остались только в
  экспорте журнала (`EdsJournalSignedExportModal.tsx`).
- **csms-api (новые файлы).** `EdsLoginContracts.cs`, `EdsLoginService.cs`
  (проверка ГОСТ через CAdESCOM из .NET, сопоставление ФИО/ИНН, привязка
  сертификата после первой удачной проверки, журнал успехов и отказов),
  `EdsAuthEndpoints.cs`, миграция `20261122022713_AddEdsLogin`. Пакет
  `System.Security.Cryptography.Pkcs` 6.0.4 не знает OID `1.2.643.7.1.1.1.1`,
  поэтому проверка идёт через COM; предупреждение `CA1416` подавлено проверкой
  `OperatingSystem.IsWindows()`. Расширения хранилища — в `IAccessStore` и
  обеих реализациях.
- **csms (фронт).** `eds.api.ts`: `fetchEdsChallenge`, `loginWithEds`,
  `useEdsLogin` сохраняют `csms_access_token` и `user_email`, кладут профиль в
  query-кэш. `EdsLoginForm.tsx` читает хранилище «Мой» через
  `readStoreCertificates()`, подписывает только сертификатами с закрытым
  ключом. `cryptoPro.ts` экспортирует `storeCertificateToEds()`.
- **Проверки.** `npx tsc -b` / `npx vite build` — exit 0; сборка
  `src/Csms.Api` через `dotnet build --no-restore` — 0 предупреждений, 0 ошибок. E2E
  `test-dotnet-sign.ps1`: челлендж → подпись ГОСТ (7632 символов base64) →
  `LOGIN OK`, `user=poyarkova_nyu@mail.ru`. В браузере через управляемую
  подстановку CAdESCOM с локальной подписью ГОСТ: вход выполнился, токен и
  `/api/access/me` — новые, журнал `/api/eds/journal` показывает `signed`;
  ошибки консоли — только заблокированные расширения браузера.
  Без плагина в браузере форма честно показывает «Сертификатов с закрытым
  ключом не найдено» — это ожидаемо.
- **Ограничение проверки.** В браузере OpenCode нет моста КриптоПро, поэтому
  подпись подставлялась через локальный прокси с тем же сертификатом; на
  рабочем месте пользователя подпись идёт напрямую через расширение.

## 126. Полные однофамильцы при входе по ЭЦП (2026-11-22)

- **Запрос пользователя.** «Для полных однофамильцев вводил проверку по
  табельному номеру — можно добавить в ЭЦП на случай совпадений?»
- **Решение.** В форме входа появилось необязательное поле «Табельный номер»
  (`EdsLoginForm.tsx`). Значение уходит в `POST /api/eds/login` полем
  `employeeNumber` и работает как дополнительный фильтр в
  `EdsLoginService.FindIdentity`: сначала по табельному номеру, затем по ФИО
  и организации. `006` и `6` считаются одним номером. Если номер не введён —
  поведение прежнее (ФИО + организация, откат только по ФИО); при нескольких
  совпадениях вход по-прежнему отклоняется.
- **Проверки.** Новый тест `EdsLoginIdentityTests.cs` (однофамильцы без номера —
  неоднозначно, `006`/`6` → первый, `043` → второй, `999` → отказ), для него
  `Csms.Application` открывает internal-метод через `InternalsVisibleTo`.
  `npx tsc -b` и `vite build` — exit 0; `dotnet test tests/Csms.Tests` — 338
  пройдено, 10 пропущено, 0 провалено. Первый прогон падал только из-за
  блокировки DLL запущенным `Csms.Api` (PID 18596), после остановки процесса
  тесты прошли; API остановлен.

## 127. Парсинг исполнения контрактов 2026 года без новых сущностей (2026-11-22)

- **Запрос пользователя.** «Делай и начинай парсить 2026 год»; уточнение:
  связь «какой акт в каком этапе» нужна позже для фронта, entity/БД менять не
  надо, кириллические имена полей в БД не добавляем.
- **Решение.** В `EisDocumentParser` реестровый номер читается из атрибута
  `РеестрНомКонт` (акты с корнем `ОсновСтроит`) в уже существующее поле
  `RegNumber` — новой сущности и кириллического поля в БД нет. Добавлен
  `ContractExecutionParser` с DTO `ContractExecutionViewDto`,
  `ContractStageDto`, `ContractAcceptanceActDto`: это не entity, а проекция
  «этап → акты» из сырого XML `contractProcedure`. Связь берётся из тех же
  данных: `sid` этапа (в примере `116850892`) совпадает с контрактом, акт лежит
  внутри `docAcceptance` (`sid=778267820`, № `27/07/03`, дата `2026-07-27`,
  приёмка `2026-07-29`, сумма `215065318.10`, `guidEDI`). Без признака
  этапности акт относится к этапу 1. Версии одного акта из девяти XML
  схлопываются (`ParseAll`), дата приводится к `yyyy-MM-dd`.
- **Подключение.** `--parse-file <XML>` воркера печатает этапы и акты;
  read-side DTO готов к выдаче фронту, но запись в БД и API-эндпоинт пока не
  добавлены.
- **Проверки.** `dotnet test eis-parser/tests/Eis44Parser.Tests` — 61 пройдено,
  0 провалено; `dotnet build eis-parser/Eis44Parser.sln` — 0 предупреждений и
  0 ошибок; ручной прогон `--parse-file` по всем 9 `contractProcedure` архива
  2026 года дал один этап и четыре уникальных акта.
- **Смежные правки.** В рабочей директории параллельно шли правки шапки,
  главной и маршрута `/analytics` — они описаны в §124–125 и закоммичены
  отдельно; `Лес 3D.jpg` не трогался.

## 125. Аналитика убрана с главной, D3-монитор сворачивает контракты (2026-11-22)

- **Запрос пользователя.** «Элемент с классом `chart-wrap` нужно как-то
  скомпоновать, спарсить или объединить; столько данных не должно на главной
  быть, она должна очень быстро прогрузиться, может даже отказаться от этого
  класса или альтернативу придумать».
- **Почему главная тормозила.** `Main.tsx` статически импортировал
  `ProcurementChartsDashboard` (Recharts) и `BudgetExecutionMonitorD3` (D3),
  а D3-монитор в режиме «По контрактам» рисовал по строке на каждый контракт:
  при 517 контрактах получалось ~27 000 px SVG и больше трёх тысяч узлов.
- **Маршрут `/analytics`.** Создан `src/pages/AnalyticsPage/AnalyticsPage.tsx`
  (+ `.module.scss`): заголовок, пояснение и две карточки — Recharts-динамика и
  D3-монитор. Данные берутся теми же хуками, что раньше на главной; пустое
  состояние предлагает войти.
- **Ленивая загрузка.** В `App.tsx` маршрут объявлен через
  `lazy(() => import(...))` и `Suspense` с текстовым fallback. Главная больше
  не импортирует Recharts/D3: сборка Vite даёт отдельный чанк
  `AnalyticsPage-*.js` (~517 kB) и уменьшает основной бандл с 3 204 до
  2 682 kB (gzip 847 → 700 kB).
- **Главная.** Удалены импорты графиков, `buildDashboardAnalytics`, хук
  `useAllContractPenalties` и состояние года; карточка аналитики убрана.
  Добавлены ссылки: третья кнопка в hero «Аналитика закупок» и карточка
  «Аналитика закупок» в группе «Исполнение и контроль». Уведомления попрежнему
  используют этапы и платежи — эти хуки оставлены.
- **Свёртка контрактов.** В `BudgetExecutionMonitorD3` добавлен
  `MAX_CONTRACT_ROWS = 24`: контракты сортируются по цене, рисуются 24
  крупнейших, остальные суммируются в строку «Прочие (N)» (НМЦК, цена,
  оплачено, в графике, неустойки, остаток, этапы). Подзаголовок поясняет
  свёртку, клик по «Прочим» открывает инспектор с итогами. Это убирает
  «простыню» `chart-wrap` и сохраняет суммы.
- **Шапка.** В меню «Ещё» → «Отчётность и контроль» добавлен пункт «Аналитика
  закупок»; `MORE_PATHS` подхватывает `/analytics` для подсветки.
- **Документация.** `PROJECT.md` — строка `/analytics`, описание главной и
  шапки; `UiSolutions` — группа «Аналитика и отчёты» теперь указывает на
  ленивый маршрут и `src/pages/AnalyticsPage/`.
- **Проверки.** `npx.cmd tsc -b --pretty false` — exit 0; `npx.cmd oxlint` по
  затронутым файлам — 0 ошибок (прежние warning `no-children-prop` в `App.tsx`
  и `set-state-in-effect` в `Header.tsx`); `npx.cmd vite build` — exit 0,
  чанк аналитики отдельный. В браузере `/` открывается без графиков, третья
  кнопка ведёт на `/analytics`, ленивый маршрут отдаёт заголовок и пустое
  состояние без ошибок консоли.

## 128. Кнопка «Текущий план-график» на главной (2026-11-22)

- **Запрос пользователя.** В корне (`/`) сменить кнопку «Новый план-график» на
  «Текущий план-график» и вести её на открытый текущий план-график.
- **Выбор плана.** `src/services/PurchasePlan/purchasePlanCurrent.ts`:
  `findCurrentPurchasePlan(plans, year = new Date().getFullYear())` оставляет
  планы текущего года без статуса `removed` и сортирует их по весу статуса
  (`changed` → `published` → `draft`), затем по номеру версии, дате публикации
  и реестровому номеру — черновик не перекрывает опубликованную редакцию.
  Год берётся из `planYear`, при пустом поле — из первых четырёх цифр
  `planNumber`.
- **Ссылка.** `currentPurchasePlanPath` отдаёт `/purchase-plans/<id>` —
  карточку документа. Если плана на текущий год нет, ведём в
  `/purchase-plans`: заказчик видит реестр и создаёт документ оттуда.
- **Главная.** В `Main.tsx` путь считается в `useMemo` по `planList`, hero-кнопка
  подписана «Текущий план-график»; `Link` на `/purchase-plans/new` с главной
  убран, форма создания остаётся доступной из реестра.
- **Проверки.** `npx tsc -b --pretty false` — exit 0; `npx oxlint` по
  затронутым файлам — 0 предупреждений; `npx prettier --check` — ок;
  `npx vite build` — exit 0. В Chrome headless (1440×900 и 390×844) кнопка
  ведёт на `/purchase-plans/eisp-202601442000018001` — план 2026 года
  («Размещен в ЕИС», версия № 1), карточка открывается без ошибок, текста
  «Новый план-график» на главной больше нет.
- **Учётные данные для проверки.** В `users` записан email
  `poyarkova_nyu@mail.ru` (организация 6); написание с двумя «y» даёт
  «Организация-заказчик не определена» и пустой список планов.
- **Смежные правки.** В рабочей директории до начала задачи оставались
  незакоммиченные правки §125 (аналитика, шапка, `AnalyticsPage`,
  `BudgetExecutionMonitorD3`, `uiSolutions.config`): они вошли в тот же коммит.
  `Лес 3D.jpg` не коммитился — код на него не ссылается.

## 129. Адаптивность: сквозной аудит на 390 px (2026-11-22)

- **Запрос пользователя.** Пройти все роуты на телефонной ширине (390 px) и
  убрать горизонтальные переполнения и нечитаемые блоки.
- **Инструмент.** `.tmp/scan-adaptive.mjs` (headless Chrome через CDP):
  для каждого роута печатает `doc=<scrollWidth>`, `outside=<n>`, `tables=<n>`,
  `clipped=<n>`, `small=<n>` и сохраняет JSON в `.tmp/shots-390-*.json`.
  Запуск: `$env:ROUTES='/a,/b'; $env:WIDTH='390'; $env:SHOTS='0';
  $env:OUT='final.json'; $env:WAIT='3000'; node .tmp/scan-adaptive.mjs`.
  Ловушки: `Emulation.setDeviceMetricsOverride.mobile` должен быть `false`
  (иначе `innerWidth` не равен заданной ширине); авторизация — только через
  `Page.addScriptToEvaluateOnNewDocument` с `localStorage.user_email`, без неё
  страницы рисуются пустыми. Точечный разбор виновников —
  `.tmp/probe-box.mjs` (`ROUTE=<путь>`; печатает элементы, у которых
  `right > documentElement.clientWidth`, с цепочкой родителей и их
  `grid-template-columns`).
- **Найденное и исправленное:**
  - корневой `Container` не даёт горизонтальных отступов — страницы обязаны
    задавать свои (`EisSmpExportPage`: `padding: 20px 16px`);
  - `NoticeInfoForm` использует BEM-классы `eis-main__*`, а не
    `notice-info-form__*`: медиа-правила для `__fio-grid`, `__ikz-grid`,
    `__object-grid` нужно писать под `.eis-main`, иначе они не применяются
    (три поля ФИО по 140 px растягивали документ до 453 px);
  - `ProcurementDocumentsPage`: `grid-template-columns: 1fr` в
    `@media (max-width: 980px)` раздувал `.workspace` по `min-content`
    ребёнка — заменено на `minmax(0, 1fr)`;
  - `Loader` в базовом варианте: иконки 200×200 в узком контейнере
    выталкивали страницу (приёмки — до 816 px) — добавлен `overflow: hidden`;
  - `SmnpSonek` (отчёты СМП): табы не переносились — на 600 px `flex-wrap`,
    уменьшены отступы и кегль;
  - таблицы с `min-width` 700–1100 px оставлены в `overflow-x: auto`
    (прокручиваются внутри карточки, а не сжимаются в нечитаемое);
  - Recharts: `overflow: hidden` у `.chart-box` и уменьшенные `margin` осей;
  - `NoticeInfoForm.__close`: глобальный `.btn` красил «✕» в цвет на акценте —
    крестик был невидим на прозрачном фоне, добавлен `color`/`display: flex`.
- **Финальный прогон (2026-11-22, 47 роутов, `.tmp/final-a|b|c.json`).**
  `doc=375` (или `doc=390` на `/account` и `/contract-registry`) у всех роутов:
  `/`, `/analytics`, `/account`, `/account/login`, `/account/register`,
  `/account/profile`, `/tasks`, `/tasks/1001`, `/purchase-plans`,
  `/purchase-plans/new`, карточка, правка и `/purchase-plans/:id/positions/new`,
  `/purchase-notes`, `/contract-service`, `/procurement-processing`,
  `/procurement-processing/:id/notice-info`, `/contract-project`,
  `/contract-projects`, `/reports/smnp`, `/reports/order-158n`,
  `/contract-registry`, `/contract-changes`, `/contract-changes/new`,
  `/contract-changes/:id`, `/contract-changes/:id/edit`, `/acceptances`,
  `/acceptances/new`, `/acceptances/:id`, `/acceptances/:id/edit`,
  `/eis/smp-export`, `/eis/packages`, `/eis/schemas`, `/eis/chains`, `/okpd2`,
  `/norming-requirements`, `/legal-acts`, `/liability-mapping`, `/eds/journal`,
  `/nmck-calculator`, `/defect-lists`, `/bid-evaluations`,
  `/vacation-schedule`, `/notifications`, `/documents`, `/ui-solutions`,
  `/visit-card`.
  Оставшиеся флаги `outside` — только таблицы внутри собственных
  `overflow-x: auto` (`scrolled = true`, документ не расширяется):
  `.purchase-plan-list__table` (765 px), `.position-form__table--ikz` (1136 px),
  `.contract-service__table` (993 px), `.eis-main__positions-table` (914 px),
  `.market-nmck__table` (1030 px).
- **Детальные роуты `contract-changes/:id` и `acceptances/:id`.** Изначально они
  не проверялись: `csms-api` (:5099) был не запущен, `vite` отдавал 502 на
  `/api/*`, а `json-server` :3001 этих коллекций не содержит вовсе. Для проверки
  поднят `dotnet run --project src/Csms.Api` и созданы два черновика через
  `POST /api/acceptances/` и `POST /api/contract-changes/`
  (`basisCode: price_reduction`, `kind: Modification`). Репозитории пакетов
  в памяти — после перезапуска API черновики исчезнут.
- **Остаточные `small` (тач-цели).** `.norming-requirements__back-link` — ссылки
  «←» высотой 24 px, `.btn--sm` (`×` 29×44) в карточке задачи и 158н — это уже
  занесено в §9 п.8 как необязательный долг, вёрстку страниц не ломает.
- **Проверки.** `npx tsc -b` — exit 0; `npx oxlint src` — 0 ошибок
  (78 предупреждений react-compiler, существовавших до задачи);
  `npx vite build` — exit 0 (только предупреждение о размере чанков).

## 130. Одностраничная визитка `/visit-card` (2026-11-22)

- **Запрос пользователя.** Сделать готовую одностраничную визитку в современном
  стиле: аккуратная типографика, выразительная сетка, плавное появление,
  скролл-эффекты, адаптив, hover/focus, доступность и высокая
  производительность; не макет, а рабочая страница в текущем стеке.
- **Маршрут.** `src/App.tsx` — top-level `/visit-card` вне `AppLayout` (без
  шапки приложения), `lazy(() => import(...))` + `Suspense` с тёмным fallback.
  Отдельный чанк: `VisitCardPage-*.js` ≈ 21 kB, CSS ≈ 19 kB; основной бандл не
  вырос.
- **Файлы.** `src/pages/VisitCardPage/VisitCardPage.tsx` (+ `.module.scss`).
  Своя палитра на локальных переменных `--vc-*` (тёмный индиго-графит,
  изумруд/циан), шрифты проекта Poppins/Montserrat, иконки `lucide-react`
  (зависимость уже была).
- **Структура.** Sticky-навигация с индикатором прочтения, hero с крупным
  заголовком, градиентным акцентом, CTA и CSS-макетом рабочего стола; полоса
  цифр; шесть карточек возможностей; шесть этапов процесса; блок проверок с
  чек-листом и «карточкой проверки»; финальный CTA и подвал.
- **Анимации и скролл.** Один `IntersectionObserver` ищет `[data-reveal]` и
  ставит/снимает `data-revealed` в обе стороны: при прокрутке вниз элементы
  собираются, при уходе из экрана возвращаются в стартовое состояние, при
  возврате вверх проявляются снова. Варианты `up/left/right/zoom` задают
  направление, масштаб и лёгкое размытие, `delay` — ступень 60–80 мс.
  Боковые выезды закреплены за конкретными блоками: hero-текст и заголовок
  «Возможностей» — `left`, макет рабочего стола и заголовок «Процесса» —
  `right`, шесть этапов чередуются `left/right` по индексу, блоки «Контроль»
  и «Проверка карточки» — `left`/`right`, карточки возможностей и CTA — `zoom`.
  Амплитуда выезда 56 px плюс `blur(4px)`; на ≤600 px — 28 px и `blur(3px)`,
  чтобы не было ощущения рывка. Наблюдение стартует через
  `requestAnimationFrame`, чтобы первый экран тоже
  успел проявиться, а не получить `data-revealed` до первой отрисовки.
  Прогресс прокрутки пишется прямо в `style.transform` через
  `requestAnimationFrame` (без ререндеров). Sticky-шапка получает фон и blur
  после 8 px. Бар-чарт и «парящие» бейджи — только CSS `transform/opacity`.
- **Доступность.** Skip-link, семантические `header/main/section/footer`,
  `aria-label` у навигаций, `aria-hidden` у декораций, видимый
  `:focus-visible` для ссылок и кнопок, тач-цели ≥ 44 px, контраст текста на
  тёмном фоне. При `prefers-reduced-motion: reduce` смещение/масштаб/размытие
  отключаются, остаётся мягкое проявление `opacity` за 0.35 с — контент не
  «выпрыгивает», но и не исчезает.
- **Адаптив.** ≤1024 px — hero в одну колонку, 2 колонки карточек; ≤760 px —
  скрываются якорные ссылки, этапы в 2 колонки; ≤600 px — кнопки на всю
  ширину, карточки и этапы в одну колонку, «парящие» бейджи скрыты.
- **Точки входа.** Меню «Ещё» → «Отчётность и контроль» → «Визитка проекта»;
  карточка «Визитка проекта» в группе «Отчётность и кадры» на главной;
  каталог `UiSolutions` — новое решение «Одностраничная визитка».
- **Документация.** `PROJECT.md` — строка `/visit-card` и счётчик решений 65.
- **Проверки.** `npx.cmd tsc -b --pretty false` — exit 0; `npx.cmd oxlint` по
  новым файлам — 0 ошибок; `npx.cmd vite build` — exit 0, чанк визитки
  отдельный. `node scripts/mobile-audit.mjs --routes=/visit-card
  --widths=320,375,430,1440` — `scrollWidth = width`, горизонтальной прокрутки
  нет, тач-цели 0 нарушений (два «offender» — декоративные свечения hero,
  обрезаны `overflow-x: clip`). В браузере проверены 1440 и 390 px, sticky-
  шапка, появление секций и переходы по якорям.

## 131. Тема «Современные закупки»: движение кометы и одна подсветка на hover (2026-11-22)

- **Запрос пользователя.** «В теме modern нет движения радужной полосы на
  компьютере; в этой же теме отменить при ховере подсветку „элемент в элементе“;
  тень сверху в такой подсветке пустить наружу элемента, а не внутрь, потому что
  она перекрывает некоторые части самого элемента».
- **Почему полоса стояла.** Причин три. 1) `prefers-reduced-motion: reduce`
  (на Windows такая настройка включена у части пользователей) выключал
  анимацию целиком — теперь комета в этом режиме едет в 4,5 раза медленнее
  (36 с на оборот) и без мерцания, магнитный сдвиг и переходы по-прежнему
  выключены. 2) Угол конического градиента интерполируется только у
  зарегистрированного `@property`; там, где такой интерполяции нет,
  `modern-comet-run` ничего не менял. В `ModernMotionLayer` добавлен запасной
  путь: после разметки угол `--modern-comet-angle` на псевдоэлементе замеряется
  дважды, и если значение не сдвинулось, JS крутит его сам
  (`requestAnimationFrame`, обновление раз в два кадра, период берётся из
  `--comet-duration` с учётом reduced-motion). У `@property` теперь
  `inherits: true`, чтобы инлайн-значение с панели доходило до `::after`; при
  живой CSS-анимации она приоритетнее инлайна, поэтому ложное срабатывание
  фолбэка ничего не ломает. 3) `markPanels` снимал и заново ставил атрибуты
  `data-modern-comet`/`data-modern-lift` на каждой пересборке, а это
  перезапускает CSS-анимацию с нуля — на «живых» страницах полоса замирала у
  начала контура. Теперь атрибуты меняются только при реальном изменении, а
  снимаются лишь с панелей, выпавших из набора.
- **Подсветка только у ближайшей панели.** `:hover` и `:focus-within`
  всплывают ко всем предкам, поэтому при наведении на вложенную карточку неон
  загорался и у секции-обёртки. Правило сузилось до
  `[data-modern-lift]:hover:not(:has([data-modern-lift]:hover))` (так же для
  `:focus-within`): горит ровно одна рамка — та, внутри которой нет наведённой.
  Проверка на `/purchase-notes`: `parentLit: false`, `childLit: true`.
- **Тень сверху — наружу.** В `--shadow-3d-hover` верхние слои были `inset`
  (`inset 0 2px 0 -1px`, `inset 0 8px 0 -3px`, `inset 0 16px 24px -14px`) и
  ложились на содержимое, закрашивая заголовки панелей и первые строки таблиц.
  Теперь внутри осталась только кромка 1 px по периметру, а верхний свет вынесен
  за границу: `0 -1px 0` (яркая линия), `0 -6px 0 -2px` (полоса) и
  `0 -14px 22px -12px` (ореол). Нижние inset-слои объёма сохранены.
- **Файлы.** `src/scss/global/_themes.scss` (токен `--shadow-3d-hover`),
  `src/scss/global/_theme-modern.scss` (`@property`, hover-правило,
  reduced-motion), `src/components/AppLayout/ModernMotionLayer.tsx` (фолбэк
  угла, идемпотентная разметка, обработчик смены reduced-motion, очистка
  инлайн-угла при выключении темы).
- **Проверки.** `.tmp/probe-modern.mjs` и `.tmp/probe-modern-hover.mjs` (CDP,
  headless; тема включается через `localStorage.csms-theme = "modern"`):
  `/purchase-notes` 1440 — угол 107° → 140° за 700 мс, инлайн-значение пустое
  (работает CSS-анимация); `MOTION=reduce` — `animationDuration: 36s`,
  27,3° → 34,8°; `FREEZE=1` (заморозка CSS-анимаций через CDP `Animation`)
  — 270,9° → 305,7° и инлайн заполнен, то есть фолбэк включается; hover на
  вложенной карточке — подсвечена только она, `box-shadow` содержит
  `0px -14px 22px -12px` без `inset`. 390 px — `docWidth = scrollWidth = 375`,
  горизонтальной прокрутки нет. Собранный CSS содержит `@property …
  inherits:true`, `:has` и `calc(var(--comet-duration,8s) * 4.5)`.
  `npx tsc -b` — exit 0, `npx oxlint src` — 0 ошибок (78 прежних warning),
  `npx vite build` — exit 0.
- **Не регрессия, но в очередь.** Порог кометы (ширина ≥ 560 px, на узком
  экране — `innerWidth - 32`, высота ≥ 240 px) на 390 px не проходят карточки
  шириной ≈343 px, поэтому на телефоне контур не появляется — так было и
  раньше; если понадобится неон на мобильном, порог надо пересматривать
  отдельно.





## 132. Тема «Современные закупки»: декор по скруглённым панелям, а не по прямоугольной обёртке (2026-11-22)

- **Запрос пользователя.** «Ховер в этой теме не учитывает бордер-радиусы
  элементов»; после уточнения: подсветка загорается у прямоугольной секции
  (radius 0), хотя скруглённая панель внутри неё.
- **Причина.** `PANEL_SELECTOR` включает `section` и `div` с классом `panel`.
  На `/tasks` такой «панелью» оказалась обёртка списка задач: `section` без
  рамки и без скругления, а карточки внутри — `li.task-item` с
  `border-radius: 8px`. JS ставил `data-modern-lift`/`data-modern-comet` на
  обёртку, поэтому неоновая кромка и внешние слои тени шли по её прямым углам
  и не совпадали с формой карточек.
- **Решение.** В `markPanels` добавлена проверка радиуса: если у кандидата
  `border-radius < 4px` (`ROUNDED_MIN_RADIUS`), ищем внутри скруглённые панели
  (`roundedChildren`): потомки с радиусом ≥ 4px, шириной ≥ 60 % обёртки и
  высотой ≥ 64px; таблицы с `border-collapse: collapse` пропускаются (у них
  радиус не применяется). Декор ставится им, обёртка остаётся чистой. Комета
  внутри — только «главной» панели, занимающей ≥ 50 % высоты обёртки
  (`INNER_COMET_MIN_COVER`): в списке карточек остаётся лишь hover-подсветка,
  иначе страница превращалась бы в гирлянду комет. Если ни одна вложенная
  панель декор не получила, обёртка подсвечивается как раньше.
- **Списки.** Появился отдельный `decorated` — все элементы с декором (комета
  и/или подсветка): у мелких карточек кометы нет, но снимать атрибуты при
  выключении темы нужно и с них. `panels` остался списком только «кометных»
  элементов для JS-фолбэка угла; наборы собираются через `Set` (без дублей).
- **Файлы.** `src/components/AppLayout/ModernMotionLayer.tsx`, комментарии в
  `src/scss/global/_theme-modern.scss`.
- **Проверки.** CDP/headless (`localStorage.csms-theme = "modern"`): `/tasks` —
  12 карточек `li.task-item` с `data-modern-lift`, секций с декором 0, комет 0
  (карточки ниже порога 240 px по высоте); hover по карточке — `lit: true`,
  `box-shadow` содержит `inset 0 0 0 1px` и `0 -14px 22px -12px`, кромка идёт
  по дуге радиуса 8 px (снимок угла). `/purchase-notes` — без изменений: 4
  подъёма и 4 кометы; `/analytics` — 3/3; `/contract-service` — 2/2;
  `/purchase-plans` — 2 панели с радиусом 4. `npx tsc -b` — exit 0,
  `npx oxlint src` — 0 ошибок (78 прежних warning).
- **Очередь.** На страницах с прямоугольной обёрткой кометы теперь может не
  быть вовсе (`/tasks`): если неон там нужен, надо отдельно решать, на какой
  из карточек его рисовать (порог по высоте 240 px карточки не проходят).

## 133. Стратегия офлайн-парсинга и фаза 0 (2026-11-22)

- **Запрос пользователя.** «Подумай, как можно оптимизировать все парсинги в
  системе… стартанём без взаимодействия с ЕИС, помощь в документах к извещению,
  проектах контрактов, но по данным из открытого доступа; потом, если будет
  спрос, окупающий сервер и лицензию, начнём интегрироваться». Согласие на план
  дано отдельным сообщением; зафиксировано в `CurrentTasks.md`, Tasks 18.
- **Аудит.** Инвентаризация трёх репозиториев (`csms`, `csms-api`, `eis-parser`):
  SOAP `getDocsIP` + токен/ГОСТ-туннель, публичная карточка zakupki.gov.ru,
  НСИ-дерево, XSD Альбома, НПА с OCR/LLM, XLSX/CSV, ручные Node-скрипты.
  Проблема не в объёме бизнес-правил, а в разбросанной логике и сетевых
  нестабильностях; дублируются XLSX-парсеры, HTTP-клиенты и XML-разбор.
- **Решение.** `fetch → snapshot → parse → projection → publish`. В офлайн-старте
  `fetch` не вызывается. Меняется только адаптер получения данных; парсеры,
  DTO, шаблоны DOCX/PDF и UI остаются прежними при подключении ЕИС позже.
- **Фаза 0 (сделано).** `scripts/start-api.mjs`: дефолты `Npa__Enabled=false`,
  `EisSchemas__Update__Enabled=false`, `EisCounterparties__Update__Enabled=false`;
  внешние переменные окружения по-прежнему выигрывают. Ручные эндпоинты
  обновления работают. Манифест фактических снимков — `docs/snapshots/manifest.json`
  (ОКПД2 21 066 / `eis-nsiOKPD2-7c7ee4215e3ee405`, КТРУ 729, пул 158н 41,
  активные версии НПА 471-р/926/1875/2604 и XSD 17.0 с хешами). Потеря
  `payloadXml` в `EisPackageService.ReviseAsync` проверена — исправление уже
  в коде (настоящий XML не пересобирается, заглушка только для `placeholder-*`).
- **Документы.** `WorkPlan.md` — отдельный раздел «Стратегия парсинга:
  snapshot-first / offline-by-default»; `docs/tasks/snapshot-first-offline.md` —
  план на 4 фазы, `docs/snapshots/manifest.json` — инвентарь.
- **Очередь.** Фаза 1: канонические DTO + единый импорт открытых данных с resume
  и мастером в UI. Фаза 2: streaming XML, дедупликация по хешу, общий XLSX/HTTP.
  Фаза 3: ЕИС-шлюз и сервер/лицензии по спросу. Чужие правки фронта и
  `InMemoryReferenceDataStore.cs` не трогались.
- **Курсор и ручной запрос (решение пользователя 2026-11-22).** Большой проход
  делается единожды, дальше раз в день проверяется только последний реестровый
  номер. Карточки: `CardImportState.cs` + `--incremental/--state` в eis-parser
  (курсор восстанавливается из готовых `*.json`, двигается только после успеха).
  ПГ и извещения: `scripts/lib/import-state.mjs` с отдельными курсорами
  `purchasePlans`/`notices` в `%TEMP%/csms-eis-import-state.json`, флаги
  `--incremental`, `--plan-number`, `--notice-number`, `--year`. Список реестра
  контрактов: `scripts/import-contract-registry.mjs` + курсор `contractRegistry`
  в том же state, ручной номер — `--reestr-number`; парсер выдачи
  `scripts/lib/contract-registry-search.mjs` разбирает и локальный `--html-file`.
  Явный номер парсится вне курсора и не откатывает его; инкремент не очищает базу, а
  перекрывает записи по номеру. Команды — `docs/tasks/snapshot-first-offline.md`.
- ⚠️ **Поиск ЕИС по ИНН не фильтрует (проверено 2026-11-22).** `customerINN`,
  `customerInn` и `customerIdOrg` в `/epz/contract/search/results.html` отдают
  общий реестр (52 млн записей). Пробный обход `inn-full-2026-v2` собрал 186
  проекций **других** заказчиков: совпадений с ИНН `4629040439` и с 523
  контрактами в БД нет, поэтому в импорт они не идут. Источник списка — уже
  известные реестровые номера из `contractRegistry` или явный список номеров.
  Процесс обхода PID 22032 остановлен.
- **Проекции карточек на фронт (2026-11-22).** В eis-parser добавлен режим
  `--numbers-file <путь>`: явный список реестровых номеров (по одному в строке,
  `#`-комментарии игнорируются), поиск по ИНН не вызывается; с `--incremental`
  готовые `*.json` пропускаются. Скрипт
  `scripts/import-contract-card-projections.mjs --dir <каталог>` кладёт полный
  `ContractCardViewDto` в новую jsonb-коллекцию `contractCardProjections`
  (в `PG_COLLECTIONS`): все поля `Acts`/`Decisions`/`Payments`/`Messages`/
  `Executions`/`SkippedFiles` остаются на верхнем уровне, entity и кириллические
  колонки не меняются. Импорт точечный upsert без `DELETE`; по умолчанию чужие
  проекции, не связанные с `contractRegistry`, пропускаются (`--allow-unmatched`
  включает их явно). Проверено: 518 известных номеров в БД, 186 старых проекций
  не совпали ни по одному номеру/ИНН и пропущены; 2 новые карточки своих
  контрактов (`2462904043926000001`, `...002`) распарсены и импортированы,
  остальные коллекции не тронуты. Команды — `docs/tasks/snapshot-first-offline.md`.

