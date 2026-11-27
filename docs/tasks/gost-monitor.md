# Мониторинг новых ГОСТов и подсказки в ООЗ

## Источник и ограничения

Источник — открытый каталог Росстандарта `https://protect.gost.ru/gost/`.

- `allgosts.ru` **не используется**: капча и `robots.txt` запрещают `/*.pdf`,
  `/*.doc`, `/*.docx` и `/*search`. Это старое решение из `.koda/PROJECT_STATE.md`
  (§201) остаётся в силе.
- protect.gost.ru отдаёт список HTML без капчи при браузерном `User-Agent`.
  Новые стандарты помечены статусом «Принят»; действующие редакции имеют
  статусы «Действует» и дальше в мониторинг не попадают.
- Ссылка карточки: `/gost/details/<uuid>`, пагинация `?year=…&month=…&page=N`.
- Полный текст ГОСТа доступен только как набор изображений PDF
  (`/api/docview/.../pages`), поэтому локально хранится **текст карточки**:
  обозначение, заглавие, приказ, даты, ОКС, область применения, ключевые слова,
  заменяемый ГОСТ и т.п. Плюс поле `text` — склейка области применения,
  ключевых слов и заглавия.
- На сайте встречается смешение кириллицы и латиницы в латинских словах
  (`Brбssica nбpus`, `aeruginоsa`); парсер восстанавливает такие вставки.

## Снимок

Монитор — `scripts/gost-monitor.mjs`.

```powershell
node scripts/gost-monitor.mjs --dry-run --months 2   # только разведка
node scripts/gost-monitor.mjs --months 2             # записать снимок
node scripts/gost-monitor.mjs --months 2 --refresh   # перечитать все карточки
node scripts/gost-monitor.mjs --months 2 --include-all-statuses
```

- Снимок: `public/gost/catalog.json` (версия `gost-YYYYMMDD-<12 hex>`).
- Состояние уже виденных карточек: `docs/snapshots/gost/state.json`.
- Регистрация версии и SHA-256 файла: `docs/snapshots/manifest.json`,
  секция `gostCatalog`.
- По умолчанию монитор смотрит последние 2 месяца и скачивает только карточки,
  которых ещё нет в `state.json`. Повторный запуск не дёргает сайт зря.

Планировщик Windows для КТРУ (`eis-parser/scripts/register-ktru-rss-task.ps1`)
можно использовать как образец для ежедневного запуска, но отдельная задача
пока **не зарегистрирована**: снимок обновляется вручную.

## Фронтенд

- `src/services/GostRef/gostRef.schema.ts` — zod-контракт снимка,
  нормализация обозначения, поиск карточки и краткая сводка.
- `src/services/GostRef/gostRef.api.ts` — `useGostCatalog()` (React Query,
  query key `["gostCatalog"]`). Читает статический `/gost/catalog.json`,
  поэтому подсказки работают и без csms-api.
- `src/components/NormingRequirements/ObjectDescriptionEditor.tsx` — в карточке
  стандарта при совпадении обозначения показывается бейдж с названием, статусом,
  датой введения, приказом и областью применения, плюс кнопка «Подставить
  название». Версия снимка выводится в пояснении над списком стандартов.

`GOST_NOT_MODERN` в `objectDescription.schema.ts` **не изменён**: это по-прежнему
`warning`, а год берётся только из строки обозначения (порог 2010). Наличие или
отсутствие снимка на него не влияет: подсказка помогает выбрать редакцию, но не
заменяет проверку и не блокирует сохранение черновика.

## Проверки

```powershell
npm run check:gost
```

Внутри: `check-ooz-gost.ts` (старая регрессия предупреждения),
`check-ooz-gost-catalog.ts` (снимок, подсказки и неизменность `GOST_NOT_MODERN`)
и `node --test scripts/tests/gost-standards.test.mjs` (чистые функции парсера).
Команда включена в `npm test`.
