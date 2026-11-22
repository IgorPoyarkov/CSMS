/**
 * Каталог UI-решений проекта.
 *
 * Это не «список красивых картинок», а рабочая карта интерфейса: что именно
 * применено, зачем и где. По ней новый экран собирается из уже принятых
 * решений, а не из новых случайных классов.
 */

export interface UiSolution {
  id: string;
  title: string;
  /** Зачем решение нужно и какую проблему закрывает. */
  purpose: string;
  /** Где применяется: экраны, модули, элементы. */
  usage: string;
  /** Где лежит реализация. */
  implementation: string;
}

export interface UiSolutionGroup {
  id: string;
  title: string;
  description: string;
  items: UiSolution[];
}

export const uiSolutionGroups: UiSolutionGroup[] = [
  {
    id: "foundation",
    title: "Основа интерфейса и темы",
    description:
      "Общая визуальная база: токены, пять тем, типографика, глобальные кнопки и единый вид нативных контролов.",
    items: [
      {
        id: "themes",
        title: "Пять тем на CSS-переменных",
        purpose:
          "Светлая тема повторяет привычный вид ЕИС (белая бумага), тёмная снижает нагрузку на глаза, «Гроза» — холодная сиренево-синяя палитра, «Зима» — светлая морозная серо-голубая, «Парящие 3D-элементы» — тёмный лес с лаймовым акцентом, объёмными панелями и подсветкой граней. Компоненты используют роли var(--surface-*), var(--text-*), а не конкретные цвета, поэтому тема меняется без правок экранов.",
        usage:
          "Весь интерфейс. Переключатель — в шапке (🌙/⛈️/❄️/🧊/☀️): темы идут по кругу, выбор запоминается в localStorage.",
        implementation:
          "src/scss/global/_themes.scss, src/scss/global/_variables.scss, src/hooks/useTheme.ts",
      },
      {
        id: "design-tokens",
        title: "Дизайн-токены",
        purpose:
          "Единая палитра, шрифты Poppins/Montserrat и длительность переходов. Запрещает «случайные» цвета в модулях и держит контраст на одном уровне.",
        usage:
          "Все SCSS-модули и глобальные стили; состояния (успех/ошибка/предупреждение) — в бейджах, алертах и замечаниях.",
        implementation: "src/scss/global/_variables.scss",
      },
      {
        id: "reboot",
        title: "Глобальный reboot и типографика",
        purpose:
          "Единая коробочная модель, базовая типографика, поведение body/main/img/полей. Поля ввода не растягивают grid- и flex-колонки.",
        usage: "Все страницы приложения.",
        implementation: "src/scss/global/_reboot.scss",
      },
      {
        id: "bem",
        title: "BEM-хелпер в CSS-модулях",
        purpose:
          'Классы собираются через bem(styles, "block") с модификаторами: имена предсказуемы, а CSS-модули не конфликтуют между экранами.',
        usage:
          "Все компоненты: карточки, формы, таблицы, шапка, модалки, реестры.",
        implementation: "src/hooks/useUtils.ts",
      },
      {
        id: "global-buttons",
        title: "Глобальные кнопки .btn",
        purpose:
          "Основное действие, вторичное (--additionally) и кнопка со стрелкой (--arrow). Единые размеры, фокус и hover.",
        usage:
          "Формы входа и регистрации, конструкторы, старые экраны; в новых модулях — собственные классы primary/secondary/danger на тех же ролях темы.",
        implementation: "src/scss/global/_btn.scss",
      },
      {
        id: "native-controls",
        title: "Единый вид нативных чекбоксов и радио",
        purpose:
          "appearance:none, рамка и заливка из ролей темы, галочка SVG и точка радиокнопки. Старые формы выглядят так же, как новые компоненты.",
        usage:
          "Все нативные input[type=checkbox]/input[type=radio], включая таблицы и фильтры.",
        implementation: "src/scss/global/_controls.scss",
      },
      {
        id: "visually-hidden",
        title: "Класс .visually-hidden",
        purpose:
          "Скрывает текст визуально, но оставляет его скринридерам: подписи полей и служебные заголовки не теряются.",
        usage: "Доступные подписи, скрытые заголовки, иконки-кнопки.",
        implementation: "src/scss/global/_visually-hidden.scss",
      },
      {
        id: "no-scrollbar",
        title: "Миксин no-scrollbar",
        purpose:
          "Скрывает полосу прокрутки в выпадающих списках, сохраняя прокрутку колесом и клавиатурой.",
        usage: "Кастомные селекты ОКПД2, ОКЕИ, КТРУ и общий CustomSelect.",
        implementation: "src/scss/global/_no-scrollbar.scss",
      },
      {
        id: "modal-frame",
        title: "Миксин modal-frame",
        purpose:
          "Инвертированный контур модального окна и бегущая точка-маркер: окно читается как активное. При prefers-reduced-motion анимация отключается.",
        usage: "Модальные формы и справки.",
        implementation: "src/scss/global/_modal-frame.scss",
      },
    ],
  },
  {
    id: "controls",
    title: "Базовые контролы",
    description:
      "Переиспользуемые поля и кнопки: форма собирается из них, а не из нативных элементов с разным поведением.",
    items: [
      {
        id: "custom-button",
        title: "CustomButton",
        purpose:
          "Декларативная кнопка с типом, модификаторами, disabled и SVG-иконкой из общего спрайта.",
        usage: "Кнопки действий в формах и карточках.",
        implementation: "src/components/UI/CustomButton.tsx",
      },
      {
        id: "custom-input",
        title: "CustomInput",
        purpose:
          "Текстовое/числовое поле, связанное с react-hook-form: подпись, регистрация, сообщение об ошибке, valueAsNumber для чисел.",
        usage: "Формы плана-графика, извещений, проектов контрактов, задач.",
        implementation: "src/components/UI/CustomInput.tsx",
      },
      {
        id: "custom-select",
        title: "CustomSelect",
        purpose:
          "Кастомный выпадающий список: поиск по подстроке, мультивыбор, закрытие по клику вне, пустое состояние, подсветка выбранного.",
        usage:
          "Выбор значений в формах и фильтрах, где нативный select неудобен.",
        implementation: "src/components/UI/CustomSelect.tsx",
      },
      {
        id: "custom-checkbox",
        title: "CustomCheckbox и CustomRadio",
        purpose:
          "Доступные чекбокс и радиокнопка с label/hint, компактным режимом и пробросом ref — совместимы с register() из react-hook-form.",
        usage: "Флаги, выбор варианта, фильтры, таблицы.",
        implementation:
          "src/components/UI/CustomCheckbox.tsx, src/components/UI/CustomRadio.tsx, src/components/UI/ChoiceControl.module.scss",
      },
      {
        id: "page-size",
        title: "PageSizePicker",
        purpose:
          "Масштаб пагинации в виде группы кнопок с aria-pressed: выбранное значение видно без раскрытия нативного select.",
        usage: "Списки задач, реестры, длинные таблицы.",
        implementation: "src/components/UI/PageSizePicker.tsx",
      },
      {
        id: "money-input",
        title: "MoneyInput",
        purpose:
          "Денежное поле: в форме хранится число, пользователь видит русский формат (1 234 567,89). В фокусе — ввод, после потери фокуса — форматирование.",
        usage: "НМЦК, цены позиций, суммы контрактов, обеспечения.",
        implementation: "src/components/UI/MoneyInput/MoneyInput.tsx",
      },
      {
        id: "loader",
        title: "Loader",
        purpose:
          "Индикатор загрузки с настраиваемым количеством элементов, размером и режимом. Показывает ожидание, не блокируя экран.",
        usage: "Реестры, карточки, списки при загрузке данных.",
        implementation: "src/components/UI/Loader.tsx",
      },
    ],
  },
  {
    id: "dictionaries",
    title: "Справочники и специализированные поля",
    description:
      "Поля под большие официальные справочники: поиск, ограничения и подсказки, чтобы код не вводился вручную.",
    items: [
      {
        id: "okpd2",
        title: "Okpd2Select",
        purpose:
          "Combobox ОКПД2: поиск по коду и наименованию, ограничение кодами плана-графика, подсказки из снимка НСИ, контроль аукционного перечня.",
        usage:
          "Позиции плана-графика, объект закупки, служебная записка, оценка заявок.",
        implementation: "src/components/UI/Okpd2Select/Okpd2Select.tsx",
      },
      {
        id: "ktru",
        title: "KtruSelect",
        purpose:
          "Выбор позиции КТРУ, зависимый от ОКПД2: список сокращается до позиций выбранного кода, нативный select не обрезается контейнерами таблицы.",
        usage: "Позиции объекта закупки и характеристики товара.",
        implementation: "src/components/UI/KtruSelect/KtruSelect.tsx",
      },
      {
        id: "okei",
        title: "OkeiSelect",
        purpose:
          "Поиск единиц измерения ОКЕИ по коду, обозначению, наименованию и синонимам; компактный режим и подсказка распознанного кода.",
        usage: "Позиции плана-графика, извещения, приёмки, характеристики.",
        implementation: "src/components/UI/OkeiSelect/OkeiSelect.tsx",
      },
      {
        id: "address",
        title: "AddressCascade",
        purpose:
          "Каскад «страна → субъект РФ → муниципальное образование → населённый пункт → адрес» с автоматической сборкой строки для документов.",
        usage: "Место поставки в извещении, проекте контракта и приёмке.",
        implementation:
          "src/components/UI/AddressCascade/AddressCascade.tsx, src/services/AddressRef/addressRef.schema.ts",
      },
    ],
  },
  {
    id: "feedback",
    title: "Оверлеи и обратная связь",
    description:
      "Как интерфейс показывает окна, ошибки, предупреждения, статусы и пустые состояния.",
    items: [
      {
        id: "custom-modal",
        title: "CustomModal",
        purpose:
          "Модальное окно: закрытие по клику на фон и Escape, остановка всплытия внутри контента, единая рамка modal-frame.",
        usage: "Формы входа/регистрации, справки, подтверждения, импорт.",
        implementation: "src/components/UI/CustomModal.tsx",
      },
      {
        id: "modal-forms",
        title: "Модальные формы",
        purpose:
          "Единая рамка формы в модалке: заголовок, тело и ряд действий. Не даёт форме «прыгать» между экранами.",
        usage:
          "Импорт плана-графика, назначение задачи, версии ПГ, правка профиля.",
        implementation:
          "Классы .modal-form/.modal-title/.modal-actions в модулях; src/scss/global/_modal-frame.scss",
      },
      {
        id: "alerts",
        title: "Алерты и серверные ошибки",
        purpose:
          "Понятный текст вместо стектрейса: предупреждение и ошибка различаются цветом и рамкой. 409/ProblemDetails раскрываются через readApiError.",
        usage:
          "Все модули csms-api: изменения/расторжения, приёмка, пакеты ЕИС, доступы.",
        implementation:
          "Классы .alert/.alert--error в модулях; src/services/csmsApi.ts",
      },
      {
        id: "issues",
        title: "Замечания правил",
        purpose:
          "Отдельный список ошибок и предупреждений с полем и текстом. Показывает проблемы до отправки, а не после отказа сервера.",
        usage:
          "Формы и карточки изменения/расторжения, приёмки, плана-графика, извещения.",
        implementation:
          "Классы .issues/.issue/.issue-field; ответы API с массивом issues",
      },
      {
        id: "status-badges",
        title: "Статус-бейджи и чипы",
        purpose:
          "Статус документа читается цветом и подписью, фильтр — чипом со счётчиком. Тона: draft/progress/success/danger/muted.",
        usage:
          "Реестр контрактов, изменения/расторжения, приёмка, пакеты ЕИС, задачи.",
        implementation:
          "Классы .status/.badge/.chip/.chip-count; конфиги статусов модулей",
      },
      {
        id: "empty-states",
        title: "Пустые состояния",
        purpose:
          "Вместо пустой таблицы — объяснение, что данных нет и что сделать дальше.",
        usage: "Реестры, списки, карточки без документов и позиций.",
        implementation: "Класс .empty в модулях экранов",
      },
      {
        id: "confirmations",
        title: "Подтверждение опасных действий",
        purpose:
          "Удаление и снятие документов требуют подтверждения: случайный клик не уничтожает запись.",
        usage: "Удаление контракта, позиции приёмки, недостатка, документа.",
        implementation: "window.confirm в обработчиках удаления",
      },
    ],
  },
  {
    id: "screens",
    title: "Каркас экранов и списки",
    description:
      "Повторяемая структура страницы: шапка, фильтры, карточки, секции и подвал.",
    items: [
      {
        id: "registry-cards",
        title: "Реестр-карточки",
        purpose:
          "Список документов карточками: заголовок, метаданные, статус, ошибки, действия. Читается лучше плотной таблицы и работает на узких экранах.",
        usage:
          "Контракты, изменения/расторжения, приёмка, проекты контрактов, закупки.",
        implementation:
          "Классы .list/.card/.card-head/.card-meta/.card-actions в модулях",
      },
      {
        id: "toolbar",
        title: "Панель фильтров",
        purpose:
          "Фильтр по контракту/статусу и счётчики по статусам. Пользователь видит объём каждого состояния до клика.",
        usage:
          "Реестр контрактов, изменения/расторжения, приёмка, задачи, уведомления.",
        implementation:
          "Классы .toolbar/.filters/.filter/.chip/.chip-count; query-параметр contractId",
      },
      {
        id: "sections",
        title: "Секции формы",
        purpose:
          "Длинная форма делится на смысловые секции с заголовком и пояснением; сетка полей адаптивная, широкие поля занимают всю строку.",
        usage:
          "План-график, извещение, проект контракта, изменение/расторжение, приёмка.",
        implementation:
          "Классы .section/.section-title/.section-note/.grid/.field/.field--wide",
      },
      {
        id: "meta",
        title: "Метаданные снимка",
        purpose:
          "Реквизиты документа показываются парой «подпись — значение» в адаптивной сетке; снимок контракта не меняется задним числом.",
        usage:
          "Карточки контракта, изменения/расторжения, приёмки, пакета ЕИС.",
        implementation: "Классы .meta/.meta-row",
      },
      {
        id: "totals",
        title: "Итоги и суммы",
        purpose:
          "Ключевые суммы вынесены отдельным блоком: с НДС, НДС, без НДС, итог приёмки. Не нужно складывать вручную.",
        usage: "Карточка приёмки, оплаты по контракту, НМЦК.",
        implementation: "Классы .totals/.total",
      },
      {
        id: "history",
        title: "История и аудит",
        purpose:
          "Журнал переходов: дата, из какого статуса в какой, автор и комментарий. Показывает не только результат, но и путь к нему.",
        usage: "Изменения/расторжения, приёмка, контракты, задачи, пакеты ЕИС.",
        implementation: "Классы .events/.event/.event-head/.event-comment",
      },
      {
        id: "documents",
        title: "Комплект документов",
        purpose:
          "Документы с редакцией, автором и признаком расхождения хеша. Заготовка формируется по снимку, но текст остаётся редактируемым.",
        usage: "Изменения/расторжения, проект контракта, приёмка.",
        implementation:
          "Классы .doc-list/.doc/.doc-head/.doc-title/.doc-content; build*DocumentDraft",
      },
    ],
  },
  {
    id: "tables",
    title: "Таблицы, позиции и inline-формы",
    description:
      "Плотные данные: таблицы с горизонтальной прокруткой и добавление строк без ухода со страницы.",
    items: [
      {
        id: "table",
        title: "Адаптивная таблица",
        purpose:
          "Таблица не ломает макет: обёртка прокручивается по горизонтали, заголовки не переносятся, действия стоят в конце строки.",
        usage: "Позиции приёмки, этапы, платежи, неустойки, поставки, реестры.",
        implementation: "Классы .table-wrap/.table/.table-actions",
      },
      {
        id: "inline-form",
        title: "Inline-форма добавления",
        purpose:
          "Добавление позиции, недостатка или регистрации прямо в карточке: не нужно открывать модалку и терять контекст.",
        usage:
          "Позиции и недостатки приёмки, документы изменения, регистрация в ЕИС.",
        implementation: "Класс .inline-form",
      },
      {
        id: "readonly-snapshot",
        title: "Read-only снимок",
        purpose:
          "Поля, пришедшие из реестра, показываются только для чтения: пользователь видит источник, но не может незаметно переписать историю.",
        usage:
          "Формы изменения/расторжения и приёмки: цена, заказчик, поставщик, дата контракта.",
        implementation: "readOnly-поля и ReadonlyField в формах модулей",
      },
    ],
  },
  {
    id: "forms",
    title: "Формы и валидация",
    description:
      "Единый контур проверки: клиентские подсказки, серверные правила и предзаполнение из цепочки закупки.",
    items: [
      {
        id: "rhf-zod",
        title: "react-hook-form + zod",
        purpose:
          "Форма не перерисовывается на каждый ввод, а схема zod даёт один источник правил и сообщений.",
        usage:
          "Планы-графики, извещения, проекты контрактов, служебные записки, задачи, отпуска.",
        implementation: "src/services/*/*.schema.ts, zodResolver в формах",
      },
      {
        id: "client-validation",
        title: "Клиентская проверка доменных форм",
        purpose:
          "Быстрые проверки до отправки: заполнены ли поля, согласованы ли даты и суммы. Не заменяет серверные правила, а экономит круг «сохранил — получил отказ».",
        usage:
          "Изменение/расторжение (validateContractChangeForm), приёмка (validateAcceptanceForm), план-график, извещение.",
        implementation:
          "src/components/ContractChange/contractChange.config.ts, src/components/ContractAcceptance/acceptance.config.ts",
      },
      {
        id: "server-validation",
        title: "Серверная проверка через /validate",
        purpose:
          "Те же правила, что и при сохранении, доступны отдельным запросом. Форма и API не расходятся, обойти проверку из интерфейса нельзя.",
        usage:
          "POST /api/contract-changes/validate, POST /api/acceptances/validate; формы модулей.",
        implementation:
          "csms-api: ContractChangeRules, AcceptanceRules; хуки useValidateContractChange/useValidateAcceptance",
      },
      {
        id: "field-errors",
        title: "Ошибки полей",
        purpose:
          "Сообщение стоит под конкретным полем, а не общей плашкой: пользователь сразу видит, что исправить.",
        usage: "Все формы и inline-формы.",
        implementation: "Классы .field-error/.field-hint",
      },
      {
        id: "prefill",
        title: "Предзаполнение из цепочки",
        purpose:
          "Снимок контракта или закупки подставляется из реестра по ?contractId= или из предыдущего шага. Меньше ручного ввода и расхождений.",
        usage:
          "Изменение/расторжение, приёмка, проект контракта из извещения, извещение из СЗ.",
        implementation:
          "snapshotOf в формах, src/services/ContractProject/contractProjectPrefill.ts, query-параметры",
      },
      {
        id: "conditional-fields",
        title: "Условные поля по основанию",
        purpose:
          "Показываются только применимые условия: при снижении цены — цена, при замене поставщика — поставщик, при расторжении — дата и уведомление.",
        usage:
          "Форма изменения/расторжения (флаги ContractChangeBasis), форма приёмки (экспертиза, комиссия, корректировка).",
        implementation: "Флаги каталога оснований и условный рендер в формах",
      },
      {
        id: "error-reading",
        title: "Единое чтение ошибок API",
        purpose:
          "ProblemDetails, доменные 409 и сетевые сбои приводятся к одному человеческому тексту. Пользователь не видит JSON и стектрейсы.",
        usage:
          "Все клиенты csms-api: изменения, приёмка, пакеты ЕИС, справочники.",
        implementation: "src/services/csmsApi.ts",
      },
    ],
  },
  {
    id: "navigation",
    title: "Навигация и шапка",
    description:
      "Сквозной контур закупки в шапке и предсказуемое поведение меню.",
    items: [
      {
        id: "app-layout",
        title: "AppLayout и сквозной контур",
        purpose:
          "Шапка прилипает к верху и отражает путь закупки: Главная → План-график → Потребность → Извещения → Контракты → Реестр контрактов. Пользователь всегда понимает, на каком этапе он находится.",
        usage: "Все страницы приложения.",
        implementation:
          "src/components/AppLayout/AppLayout.tsx, src/components/Header/Header.tsx",
      },
      {
        id: "header-more-menu",
        title: "Меню «Ещё» в шапке",
        purpose:
          "Второстепенные разделы (ЕИС, отчётность, справочники, справки) собраны в одно меню из трёх колонок. Шапка остаётся одной строкой вместо трёх рядов чипов; на мобильном группы раскрываются вложенным списком.",
        usage: "Шапка → «Ещё».",
        implementation:
          "Header.tsx: isMoreOpen, moreRef, MORE_GROUPS, role=menu",
      },
      {
        id: "visit-card",
        title: "Одностраничная визитка",
        purpose:
          "Самостоятельный лендинг проекта: тёмная палитра, выразительная сетка, появление секций по IntersectionObserver, индикатор прокрутки, hover/focus-состояния и поддержка prefers-reduced-motion. Маршрут вне AppLayout, грузится отдельным чанком.",
        usage: "/visit-card, меню «Ещё» → «Визитка проекта», карточка на главной.",
        implementation: "src/pages/VisitCardPage/VisitCardPage.tsx + .module.scss",
      },
      {
        id: "registry-submenu",
        title: "Подменю реестра контрактов",
        purpose:
          "Разбивка «Все / конкурентные способы / у единственного поставщика». Открывается наведением и кликом, закрывается по Escape и клику вне.",
        usage: "Шапка → «Реестр контрактов».",
        implementation:
          "Header.tsx: isRegistryOpen, registryRef, NavLink с aria-haspopup",
      },
      {
        id: "profile-menu",
        title: "Меню профиля",
        purpose:
          "Фамилия и инициалы, аватар или буква, личный кабинет и выход. Hover и клик управляют одним состоянием, поэтому меню не «залипает».",
        usage: "Шапка, правая часть.",
        implementation:
          "Header.tsx: isProfileOpen, isHoverDisabled, profileRef, role=menu",
      },
      {
        id: "theme-toggle",
        title: "Переключатель темы",
        purpose:
          "Одна кнопка 🌙/⛈️/❄️/🧊/☀️ с title и aria-label: темы идут по кругу (светлая → тёмная → «Гроза» → «Зима» → «Парящие 3D»), выбор применяется сразу и запоминается.",
        usage: "Шапка, крайняя правая позиция.",
        implementation: "Header.tsx, src/hooks/useTheme.ts",
      },
      {
        id: "header-modals",
        title: "Справки в шапке без ухода со страницы",
        purpose:
          "«Покрытие XSD» и «Справка» открываются модалками: пользователь не теряет открытый план-график или извещение.",
        usage: "Шапка → «Покрытие XSD», «Справка».",
        implementation:
          "Header.tsx, src/components/Eis/EisCoverageModal.tsx, src/components/Header/AgentsHelpModal.tsx",
      },
      {
        id: "reference-badge",
        title: "Бейдж справочников НСИ",
        purpose:
          "Показывает активную версию и объём выгрузки справочников, не занимая отдельный экран.",
        usage: "Шапка → «Ещё», нижняя строка меню.",
        implementation: "src/components/Eis/ReferenceDataBadge.tsx",
      },
      {
        id: "back-links",
        title: "Ссылки возврата",
        purpose:
          "На карточках и формах есть «К реестру»: возврат не зависит от истории браузера и работает после прямого перехода по ссылке.",
        usage:
          "Изменения/расторжения, приёмка, проекты контрактов, карточки задач.",
        implementation: 'Link to="/..." в шапках экранов',
      },
    ],
  },
  {
    id: "accessibility",
    title: "Доступность и UX-правила",
    description:
      "Решения, которые делают интерфейс предсказуемым для клавиатуры, скринридеров и медленных каналов.",
    items: [
      {
        id: "aria",
        title: "ARIA-атрибуты меню и групп",
        purpose:
          "aria-haspopup/aria-expanded у меню, aria-pressed у переключателей, role=menu/group и aria-label у групп. Скринридер понимает состояние, а не только подпись.",
        usage:
          "Шапка, PageSizePicker, фильтры, модальные окна, кастомные селекты.",
        implementation:
          "Header.tsx, src/components/UI/PageSizePicker.tsx, CustomSelect.tsx",
      },
      {
        id: "keyboard",
        title: "Клавиатура и Escape",
        purpose:
          "Выпадающие списки и меню закрываются по Escape и клику вне; в селектах работают стрелки и Enter, подсвеченная строка удерживается в видимой области.",
        usage: "CustomSelect, Okpd2Select, OkeiSelect, меню шапки, модалки.",
        implementation:
          "Обработчики keydown и pointerdown в компонентах; useEffect-подписки",
      },
      {
        id: "reduced-motion",
        title: "prefers-reduced-motion",
        purpose:
          "Анимация рамки модалки и бегущая точка отключаются, если пользователь просил уменьшить движение.",
        usage: "Модальные окна.",
        implementation: "src/scss/global/_modal-frame.scss",
      },
      {
        id: "focus",
        title: "Видимый фокус",
        purpose:
          "Кнопки, поля и кастомные контролы показывают focus-visible: интерфейс проходим с клавиатуры.",
        usage: "Все интерактивные элементы.",
        implementation:
          "src/scss/global/_btn.scss, src/scss/global/_controls.scss, модули компонентов",
      },
      {
        id: "safe-actions",
        title: "Безопасные опасные действия",
        purpose:
          "Удаление отделено от обычных кнопок, требует подтверждения и не стоит рядом с основным действием.",
        usage: "Подвал карточки контракта, документы, позиции приёмки.",
        implementation: "Класс .danger/.btnDanger и window.confirm",
      },
    ],
  },
  {
    id: "applied",
    title: "Прикладные экранные решения",
    description: "Как общие UI-решения собраны в конкретные модули системы.",
    items: [
      {
        id: "procurement-chain",
        title: "Сквозная цепочка закупки",
        purpose:
          "План-график → служебная записка → извещение → проект контракта → реестр → исполнение. Каждый следующий экран подставляет снимок предыдущего.",
        usage:
          "Разделы «План-график», «Потребность», «Извещения», «Проект контракта», «Контракты».",
        implementation:
          "src/services/ContractProject/contractProjectPrefill.ts, экраны цепочки",
      },
      {
        id: "contract-card",
        title: "Карточка контракта с подсекциями",
        purpose:
          "Раскрывающаяся карточка: реквизиты ЕИС, оплаты, события, этапы, платежи, неустойки, поставки и СМП. Пользователь не уходит на отдельные страницы.",
        usage: "Реестр контрактов.",
        implementation:
          "src/components/ContractRegistry/ContractRegistryPage.tsx и подсекции",
      },
      {
        id: "contract-change",
        title: "Изменение и расторжение (ст. 95)",
        purpose:
          "Снимок контракта, основание, условные поля, документы с заготовками, согласование, подписание и регистрация в ЕИС.",
        usage: "Реестр контрактов → «Изменение / расторжение».",
        implementation: "src/components/ContractChange/",
      },
      {
        id: "acceptance",
        title: "Электронное актирование (ст. 94)",
        purpose:
          "Приёмка: позиции с НДС, недостатки, итог по кодам ЕИС, печать акта, регистрация в ЕИС и связь с изменениями контракта.",
        usage:
          "Реестр контрактов → «Приёмка», раздел «Электронное актирование».",
        implementation: "src/components/ContractAcceptance/",
      },
      {
        id: "eis-packages",
        title: "Пакеты ЕИС и обозреватель XSD",
        purpose:
          "Исходящие пакеты с подписью и ошибками ФЛК, обозреватель официальных схем и чек-лист покрытия полей.",
        usage: "Разделы «Пакеты ЕИС», «Схемы ЕИС», «Покрытие XSD».",
        implementation:
          "src/components/Eis/EisPackagesPage.tsx, EisSchemaExplorerPage.tsx, EisCoverageModal.tsx",
      },
      {
        id: "analytics",
        title: "Аналитика и отчёты",
        purpose:
          "Дашборды, отчётность 158н и 238, реестры СМП, оценка заявок, НМЦК, дефектовки и график отпусков — на общих карточках, таблицах и фильтрах. Графики Recharts и D3 вынесены на отдельный ленивый маршрут `/analytics`, чтобы главная не грузила тяжёлые библиотеки.",
        usage:
          "«Аналитика» (/analytics), «Отчёты 158н», «Отчётность СМП», «Оценка заявок», «НМЦК», «Дефектовки», «График отпусков».",
        implementation:
          "src/pages/AnalyticsPage/, src/components/Dashboard/, src/components/Reports/, src/components/BidEvaluation/, src/components/Nmck/, src/components/DefectList/, src/components/VacationSchedule/",
      },
      {
        id: "documents-export",
        title: "Документы и выгрузки",
        purpose:
          "Генератор типовых документов, Document Checker по реестру НПА, экспорт CSV/PDF и печатные формы. Пользователь получает файл, а не инструкцию.",
        usage: "Раздел «Документы», отчёты, карточка приёмки (печать акта).",
        implementation:
          "src/services/ProcurementDocuments/, src/services/Reports/*Export.ts, печать акта в ContractAcceptance",
      },
      {
        id: "notifications",
        title: "Сроки и риски",
        purpose:
          "Единый экран уведомлений о приближении сроков исполнения контрактов и этапов 44-ФЗ.",
        usage: "Шапка → «Сроки и риски».",
        implementation:
          "src/components/Notifications/DeadlineNotificationsPage.tsx, src/services/Notifications/",
      },
    ],
  },
];

export const uiSolutionTotal = uiSolutionGroups.reduce(
  (sum, group) => sum + group.items.length,
  0,
);
