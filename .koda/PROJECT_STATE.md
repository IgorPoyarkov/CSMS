# Состояние проекта (служебная заметка для AI-ассистента)

> Файл для ассистента, не для пользователя. Читать первым в новой сессии, чтобы
> не сканировать весь репозиторий. Пользовательское описание проекта — `PROJECT.md`.
> Дата последнего обновления: 2026-11-15.

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
- Прогон схем и моков без сервера: node 24 + `--experimental-strip-types` через
  собственный resolve-хук (импорты в проекте без расширения):
  `node --experimental-strip-types --import ./.tmp/register.mjs ./.tmp/<check>.mjs`,
  где чекер импортирует `src/**/*.schema.ts` напрямую. **Временное — в `.tmp/`.**
- Действующие чекеры в `.tmp/`: `check-contracts` (реестр: схемы, суммы этапов,
  `totalPaid`/`paymentPercent`/`totalPenalties`, `isContractOverdue`),
  `check-employees` (схема штатки, уникальность табельных/email, «подразделение
  своей организации», «подписант контракта работает у заказчика», ИКЗ = ИКЗ
  закупки), `check-contrast` (рамки светлой темы ≥ 3:1 по WCAG 1.4.11, читает
  значения прямо из `_themes.scss`), `check-tasks`, `check-evaluation`,
  `check-calendar`, `check-education`, `check-smnp`, `check-contract-project`.
  ⚠️ Ассерты чекеров завязаны на объём моков — после правки `db.json` их надо
  синхронизировать (сейчас `check-smnp` ждёт 4 закупки СМП, в базе 3;
  `check-evaluation` ждёт 3 завершённые задачи, в базе 4).
- Vite отдаёт изменённый модуль `GET http://localhost:5173/<path>` — 200 значит
  собралось (быстрая замена сборки).
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

## 3. Данные (`db.json`, 2026-11-15)

```
users 4 · employees 39 · organizations 5 · structuralUnits 32 (это отделы!)
contractServices 3 · purchasePlans 4 · procurements 4 · notices 0 · contracts 0
tasks 12 · taskEvaluations 4 · employeeEducations 9 · leaves 6
contractProjects 2 · contractRegistry 4 · contractStages 9 · contractPayments 9
contractPenalties 4 · contractDeliveries 3 · smnpPlans/Reports/Procurements 3/3/3
```

- Организации: 1 ГБУЗ «ГКБ № 7», 2 Депимущество БО, 3 МБОУ «СОШ № 15»,
  4 Администрация г. Белгорода, 5 ГКУ БО «Центр МТО» (без пользователя —
  проверка «сотрудник ≠ пользователь»).
- Учётки: `test1..test4@test.test` → org 1..4. Связь с штаткой — поле
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
`check-employees`).

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
  краю, email не показывается. Открытие дублируется классом `--open`, между
  кнопкой и меню невидимый «мостик» `::before` (иначе ховер рвётся в зазоре).
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
`:id/contract-project`), `/reports/smnp`, `/contract-registry`.

Хуки по доменам: `tasks.api` — `useOrganizationTasks`, `useAssigneeTasks`,
`useTask`, `useCreateTask`, `useUpdateTask`, `useUpdateTaskProgress`,
`useDeleteTask`; `taskEvaluation.api` — `useTaskEvaluations`,
`useEmployeeEvaluations`, `useCreateEvaluation`, `useDeleteEvaluation`;
`education.api` — `useOrganizationEducations`, `useEmployeeEducations`,
`useSaveEducation`, `useDeleteEducation`; `calendar.api` —
`useOrganizationLeaves`, `useEmployeeLeaves` + CRUD; `contractRegistry.api` —
20 хуков по пяти коллекциям; `StaffingTable.api` — работники, подразделения,
`useFetchEmployeeByUserId`, `useUpdateEmployeeProfile`.
Общий хук роли — `src/hooks/useMyContractRole.ts`
(`{ user, organization, contractService, employee, myRole, isHead }`).

## 7. Результат последней проверки (2026-11-15)

- `npx tsc -b --pretty false` — 0 ошибок.
- `npm run build` — успешно; `npx oxlint src` — 24 warning, 0 errors.
- check-контрактов, штата, контраста — зелёные.

### Новые файлы (Tasks 2)

- `src/services/ContractService/contractFunction.schema.ts` — сущность `ContractFunction` (code, title, category, isFromOrder, isDeletable, organizationId).
- `src/services/ContractService/contractFunction.api.ts` — API: `useFetchContractFunctions`, `useOrganizationFunctions`, `useAddContractFunction`, `useDeleteContractFunction`.
- `src/components/Account/AccessRequestModal/` — модалка заявки на образование.
- `src/components/ContractService/contractService.config.ts` — `contractServiceFunctionCategories` (3 категории).

### Новые БД-коллекции

- `contractFunctions` — 5 приказных функций (isFromOrder=true, isDeletable=false, organizationId=null). ⚠️ **json-server нужно перезапустить** после добавления новой коллекции.

### Изменения

- `ContractServiceForm.tsx` — функция починена (toggleFunction), кастомный чекбокс + группировка по категориям (`<details>`), подтверждение смены способа создания, руководитель первым при редактировании, проверка совокупного объёма убрана.
- `TaskAssignModal.tsx` — фильтр категории первым.
- `PersonalAccount.tsx` — предупреждение об образовании + кнопка «Направить заявку».
- `CurrentTasks.md` — статус Tasks 1 и Tasks 2 обновлён.
- `PROJECT.md` — описание проекта обновлено.

## 8. Не реализовано

- Настоящие права: проверка на клиенте, json-server отдаёт коллекции целиком.
- Вход по ЭЦП и имитация входа в ЕИС, подписание ПГ и контрактов ЭЦП.
- Руководитель службы как отдельный документ (п. 2.3), положение о службе
  (п. 1.3), штатная схема соподчинения, собственные функции сверх раздела III.
- Обмен с ЕИС: ссылки на zakupki.gov.ru фиктивные, `notices` и `contracts` пусты.
