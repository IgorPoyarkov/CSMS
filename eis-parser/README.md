# Парсер и интеграционный клиент ЕИС (44-ФЗ)

Консольное приложение и библиотеки на .NET 9 для выгрузки структурированных
XML-данных из ЕИС через SOAP-сервис `getDocsIP`. Пользователь работает от лица
зарегистрированного ИП: в каждый SOAP-запрос кладётся `individualPerson_token`
из личного кабинета участника закупок.

## Состав решения

| Проект | Назначение |
| --- | --- |
| `Eis44Parser.Core` | `EisSoapClient` (этап 1), `ArchiveDownloader` (2), `ArchiveProcessor` + `EisDocumentParser` (3), модели |
| `Eis44Parser.Data` | EF Core: SQLite/PostgreSQL; старая таблица `Tenders` и таблицы конвейера (`eis_sync_state`, `eis_archive_queue`, `raw_documents`, `purchases`, `purchase_items`, `contracts`, `participants`) |
| `Eis44Parser.Worker` | Фоновая служба опроса, `EisPipelineRunner`, конфигурация, CLI-режимы |
| `Eis44Parser.Tests` | xUnit: SOAP-теги и заголовки, ZIP/парсинг, идемпотентность очереди и upsert |

## Схемы и типы Альбома ТФФ 17.0

В `schemas/Schemas44/` лежит полный официальный комплект XSD 17.0 (32 схемы
и 16 WSDL) из архива `Схемы 17.0 итерация 2.zip`; текстовые описания форматов —
в 19 `.docx` архива `Альбом ТФФ 17.0.zip` в корне репозитория. Каталог всех
глобальных определений (3548): `schemas/TYPE_CATALOG.json` и `.md`, пересоздаётся
скриптом `schemas/generate-type-catalog.ps1`.

По этим схемам уточнены SOAP-_namespace в `SoapRequestBuilder`: конверт
`http://schemas.xmlsoap.org/soap/envelope/`, тело
`http://zakupki.gov.ru/fz44/get-docs-ip/ws`; дочерние теги не квалифицированы
(`elementFormDefault="unqualified"`). Сгенерированные C#-модели создаются по
запросу `schemas/generate-models.ps1` (не коммитятся, подробности — `schemas/README.md`).

## Сетевой контур

ЕИС требует ГОСТ-TLS (КриптоПро CSP). Официальная WSDL `getDocsIP` указывает
хост `int44.zakupki.gov.ru`, но по состоянию на 19.11.2026 он устанавливает TCP
и сразу сбрасывает `SSL_connect` (`Connection reset: 0 byte(s) sent to TLS`).
Рабочим оказался контур `int.zakupki.gov.ru:443` — он отдаёт **тот же WSDL**
`fz44/get-docs-ip` с операцией `getNsi` и успешно завершает ГОСТ-handshake.
Обычный `HttpClient` .NET обращается не напрямую к ЕИС, а к локальному Stunnel
с КриптоПро/msspi:

```ini
[eis-44]
client = yes
accept = 127.0.0.1:8080
connect = int44.zakupki.gov.ru:443
sni = int44.zakupki.gov.ru
sslVersion = TLSv1.2
cert = 08A26ABA98738FEE6BB29A103D1909A251C5D20F
ciphers = ff85
```

Шаблон — `eis-parser/stunnel.conf`. В сборке stunnel-msspi от КриптоПро
(cipher-лист передаётся в MSSPI) шифры задаются **16-ричными кодами**, а не
именами OpenSSL: `ff85` = `GOST2012-GOST8912-GOST8912`. Именно этот suite
ЕИС выбирает в дампе `gost-engine/engine#464`.

Что нужно на машине:

1. **stunnel-msspi.exe сборки CryptoPro** (проверенная:
   `stunnel-5.78-msspi-0.84-amd64-windows.zip`, лежит в `C:\Tools\stunnel-cpro`).
   Обычный OpenSSL-стunnel ГОСТ не понимает.
2. **КриптоПро CSP** и сертификат ИП с приватным ключом на Рутокене.
   Отпечаток сертификата указан в конфиге; PIN — секрет, в репозиторий не идёт.
3. **Доступ к `int44.zakupki.gov.ru:443`** по TCP (VPN/файрвол/белый список IP).
   Если TLS там сбрасывается, запустите туннель с запасным контуром:
   `scripts\start-stunnel.ps1 -Connect int.zakupki.gov.ru:443` (SNI подставится
   автоматически, `ServiceUrl` в `appsettings.json` уже указывает на `int`).

Запуск туннеля с запросом PIN (рекомендуемый способ):

```powershell
cd eis-parser
$env:EIS44_CERT_PIN = '...'  # либо оставьте пустым — скрипт спросит сам
powershell -ExecutionPolicy Bypass -File scripts\start-stunnel.ps1
```

Скрипт пишет рабочий конфиг с PIN в `%TEMP%\eis44-stunnel.conf`, то есть вне
репозитория. Ручной вариант — скопировать `stunnel.conf` в
`stunnel.local.conf` (он в `.gitignore`), вписать `pin = ...` и запустить
`stunnel-msspi.exe stunnel.local.conf`.

Проверить готовность после запуска:

```powershell
dotnet run --project src/Eis44Parser.Worker -- --check
```

Команда печатает состояние токена и результат TCP-пинга до `127.0.0.1:8080`
и возвращает код 1, если туннель не поднят. Сама проверка TCP не гарантирует
ГОСТ-handshake: если ЕИС рвёт соединение на уровне TLS, `--once` упадёт с
`SocketException 10054` — смотрите лог stunnel (`output` в конфиге).

Адрес сервиса внутри туннеля: `http://127.0.0.1:8080/eis-integration/services/getDocsIP`.
WSDL и XSD: `https://zakupki.gov.ru?wsdl` и `?xsd=getDocsIP-ws-api.xsd`.
Актуальные XSD берутся из Альбома ТФФ на портале ЕИС (раздел «Документы» →
«Требования к форматам и способам передачи»).

## Четырёхэтапный конвейер выгрузки

1. **Опросник** (`EisSoapClient`): `getDocsByOrgRegionRequest` по региону/дате
   или `getDocsByReestrNumberRequest` по номеру, пауза 300–500 мс между
   запросами, Polly с экспоненциальным backoff на 429/502/503/504 и таймаутах.
   Ссылки и курсоры идут в `eis_archive_queue` / `eis_sync_state` (идемпотентно
   по SHA-256 URL).
2. **Загрузчик** (`ArchiveDownloader`): `HTTP GET` через туннель с заголовком
   `individualPerson_token`, потоковая запись на диск с подсчётом SHA-256,
   проверка, что файл — читаемый ZIP (все записи читаются до конца).
3. **Распаковщик/парсер** (`ArchiveProcessor`, `EisDocumentParser`): XML читаются
   из `ZipArchive` в потоке, поля ищутся по `Name.LocalName`, поэтому префиксы
   пространств имён и версии схем (14.x–17.x) не ломают разбор.
4. **Хранение** (`EisPipelineRepository`): сырой XML — в `raw_documents`,
   нормализованные сущности — в `purchases`, `purchase_items`, `contracts`,
   `participants`. Upsert по естественным ключам (номер закупки, regNum).
   Схема PostgreSQL — `sql/001_pipeline.sql`, SQLite — `sql/001_pipeline.sqlite.sql`.
   Оба скрипта встроены в сборку и применяются `EisPipelineSchema.EnsureAsync`
   при запуске: старый файл БД с таблицей `Tenders` досоздаёт таблицы конвейера,
   `EnsureCreated` в одиночку этого не делает. Имена колонок EF-маппинга совпадают
   с DDL (snake_case).

Один проход: `dotnet run --project src/Eis44Parser.Worker -- --pipeline-once`.
Старый `--once` оставляет прежнее поведение (опрос + таблица `Tenders`).

В `test-data/` лежат реальные XML из карточек закупок (два варианта открытого
конкурса ЕОК — 16.3/OKP20 и 16.2/OKB20 со строительством, электронный аукцион
с вложенными КТРУ/ОКПД2, электронный запрос котировок EZK, уведомление о
контроле, извещения Казначейства, проекты и электронные контракты, `cpDelta`,
платёжное заявление ESMV) и два
настоящих ZIP из ЕИС: карточка контракта (10 XML) и усечённый `export.xml` из
`getDocsIP` с несколькими документами внутри. По ним написаны тесты маппинга:
в XML извещений ИКЗ находится в `IKZInfo/purchaseCode`, заказчик — в
`purchaseResponsibleInfo`, позиция — в `purchaseObjectsInfo/purchaseObject`,
в экспортных файлах корень — универсальный `<export>`, а в электронных
контрактах позиции лежат в `<productsInfo>/<productInfo>` (в одном из реальных
контрактов есть промежуточный `<productsInfoElectronicContract>`), классификаторы —
в `OKPD2Info`/`KTRUInfo`, а итоговая цена — в `contractPriceInfo` (первый `<price>`
принадлежит позиции). Один `export.xml` из `getDocsIP` содержит сотни документов —
`ArchiveProcessor` разбивает его по детям корня; `contractProcedure` сохраняются
в `raw_documents`, но не перезаписывают основную запись контракта. Команда
`--parse-file` показывает, что именно распознал парсер, без токена и туннеля.

Отдельно в `test-data/tender-plan-print-form.zip` лежит печатная форма
плана-графика: внутри один `print form.xlsx` на 163 строки (заказчик, ИКЗ,
ОКПД2, объект закупки, год и объём финансирования на 2026–2028 годы). Это XLSX,
а не XML, поэтому `ArchiveProcessor` его не разбирает — архив сохраняется сырым
на диске и в таблице `archives`, а маппинг XML-документов от него не зависит.
Полный разбор XLSX в нормализованные сущности — отдельная задача с новой схемой
БД. Сырого `<tenderPlan2020>` в таком архиве нет: XML плана-графика скачивают
отдельной кнопкой в карточке реестра планов графиков, а через `getDocsIP` его
выгружают подсистемой `RPGZ` (по реестровому номеру — `getDocsByReestrNumberRequest`
с `reestrNumber`, либо по региону с типом документа из справочника
`nsiDocumentTypes`). Превью XML из `PurchasePlanCard.tsx` строится из локальных
данных CSMS и не является выгрузкой ЕИС.

Файлы с расширением `.ЭЦП`/`.sig`, приходящие из карточек, — отсоединённые
подписи CMS/PKCS#7 в base64: самого документа в них нет, а в сертификате
подписанта лежат ФИО, ИНН и СНИЛС. Такие файлы не разбираются парсером и не
добавляются в репозиторий — публиковать персональные данные из сертификата
нельзя.

Файлы «Электронный документ, полученный из внешней системы.xml» — не выгрузка
ЕИС, а внутреннее представление протокола закупочной комиссии: в них несколько
корневых элементов (`id`, `purchase`, `commissionMembers`, `decisions`, `files`,
`certificates`, …), поэтому это даже не корректный XML. Внутри — ФИО членов
комиссии, отпечатки сертификатов и IP-адрес. Такие файлы не разбираются и не
добавляются в репозиторий; для маппинга протоколов нужен XML печатной формы ЕИС
с одним корнем.

### Что говорит XSD 17.0 (в спецификации из поисковой выдачи есть ошибки)

- `selectionParams/getDocsByOrgRegionRequest` — строго `orgRegion`,
  `subsystemType`, `documentType44`, `periodInfo` (плюс необязательный
  `reestrNumber`). В `periodInfo` **нет** `from/to`: только `exactDate` или
  `oneHourInfo` (дата, час и смещение пояса). Инкремент строится по датам,
  а не произвольному интервалу UTC.
- Коды 44-ФЗ из `getDocsIP-ws-api.xsd`: `PRIZ`, `RPEC`, `RPGZ`, `RGK`, `CRK`,
  `EA`, `UR`, `REC` и др. Кодов `RPZ`, `RBG`, `RNP` в перечне нет (`RPZ223` —
  223-ФЗ). Справочники НСИ выгружаются отдельным методом `getNsiRequest`,
  а не подсистемой `NSI`.
- Адрес сервиса — `int.zakupki.gov.ru` через локальный ГОСТ-туннель; старый
  `int44.zakupki.gov.ru` сбрасывает TLS и в конвейере не используется.

## Выгрузка справочника КТРУ (nsiKtru)

Открытый FTP ЕИС закрыт с 01.01.2025: КТРУ отдаёт тот же `getDocsIP`, но методом
`getNsiRequest`. Структура запроса и теги позиций — по XSD 17.0
(`getDocsIP-ws-api.xsd`, `IntegrationTypes.xsd`); полный разбор есть в
`csms-api/docs/eis-nsi-soap.md`. Клиент использует **тот же токен и туннель**,
что и выгрузка извещений — секрет в `csms-api` не дублируется.

```powershell
# Только посчитать версию и объём, без записи:
dotnet run --project src/Eis44Parser.Worker -- --import-nsi --dry-run

# Выгрузить и опубликовать в csms-api (POST /api/references/import):
dotnet run --project src/Eis44Parser.Worker -- --import-nsi
```

Настройки — в разделе `EisNsi` файла `appsettings.json`: `Dataset`, `NsiCode`,
`NsiKind` (`all` — полная выгрузка не чаще раза в сутки, `inc` — инкремент),
`ApiBaseUrl`, `ServiceUrl`. Перед живым прогоном надо подтвердить точный
`nsiCode` ответом `nsiAllList`: в XSD это свободная строка, а не перечисление.

Версия снимка — `eis-<dataset>-<16 hex из SHA-256>`, хеш считается по
каноническому набору `code|name|payload`, как и в `csms-api`. Поэтому повтор
той же выгрузки даёт ту же версию и корректно получает `400` от API.

⚠️ Сетевой путь проверен 19.11.2026 через `int.zakupki.gov.ru:443`: SOAP дошёл
до ЕИС, но сервер отвечает «Токены для сервисов отдачи отсутствуют в ЕИС».
Перевыпущенный токен уже записан в User Secrets и передаётся корректно (в
SOAP- и HTTP-заголовках, с `SOAPAction` по WSDL), но тоже не принят — значит
дело в регистрации токена на стороне ЕИС, а не в локальном конфиге. Подробности
и что проверить в ЛК — §26 `.koda/PROJECT_STATE.md`.

## Запуск

```bash
cd eis-parser
dotnet restore
dotnet build
dotnet test

# Разобрать один реальный XML без ЕИС и токена:
dotnet run --project src/Eis44Parser.Worker -- --parse-file test-data\epNotificationEF2020-real.xml

# Проверить конфигурацию и создать БД без обращения к ЕИС:
dotnet run --project src/Eis44Parser.Worker -- --validate

# Поднять stunnel (в отдельном окне), затем проверить готовность:
powershell -ExecutionPolicy Bypass -File scripts\start-stunnel.ps1
dotnet run --project src/Eis44Parser.Worker -- --check

# Один проход (например, из планировщика):
dotnet run --project src/Eis44Parser.Worker -- --once

# Постоянный опрос каждые PollingIntervalMinutes:
dotnet run --project src/Eis44Parser.Worker
```

Токен ИП **не хранится в репозитории**. В `appsettings.json` поле
`Eis44:IndividualPersonToken` оставлено пустым; рабочее значение лежит в
**User Secrets** .NET — в файле `%APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json`
вне папки проекта. Приложение подключает это хранилище через
`builder.Configuration.AddUserSecrets<Program>()` при любом окружении.

Записать/обновить токен (один раз на машине разработчика):

```powershell
dotnet user-secrets set "Eis44:IndividualPersonToken" "GUID_ИЗ_ЛИЧНОГО_КАБИНЕТА" `
  --project src/Eis44Parser.Worker/Eis44Parser.Worker.csproj
```

Переменные окружения имеют наивысший приоритет и позволяют переопределить
токен и прочие настройки без правки конфигурации:

```powershell
$env:Eis44__IndividualPersonToken = "GUID_ИЗ_ЛИЧНОГО_КАБИНЕТА"
$env:Eis44__RegionCodes__0 = "31"
$env:ConnectionStrings__EisDb = "Data Source=eis44.db"
```

⚠️ Ранее токен был закоммичен и запушен (коммит `eecaca5`). Поскольку
репозиторий публичный, тот экземпляр токена следует считать скомпрометированным
и перевыпустить в личном кабинете ЕИС — удаление из последующего коммита не
убирает его из истории git.

Для PostgreSQL: `"Database": { "Provider": "PostgreSql" }` и строка
`Host=localhost;Database=eis44;Username=...;Password=...`.

## Генерация строгих моделей по XSD

См. `schemas/README.md` и `schemas/generate-models.ps1`. Сгенерированные
классы пока не используются в рантайме: клиент разбирает XML через `XDocument`,
чтобы переживать смену версий схем. Модели нужны как эталон для будущей
строгой десериализации и валидации по XSD.

## Ограничения

- Лимиты ЕИС ~8 запросов/сек: опрос идёт последовательно, не более одного
  архива за раз. Повторные попытки (429/5xx/сетевые ошибки) — Polly с
  экспоненциальной задержкой.
- Перебои ЕИС и кэш, отдающий пустой ответ, обрабатываются повтором;
  контрольные ссылки для автотестов на поломку вёрстки пока не заведены.
- `RawXml` хранится в БД как текст; для реальных объёмов вынести его в S3/MinIO,
  оставив ссылку и хэш.
- Реальная проверка подписи/верификация ответов ЕИС на этом этапе не требуется.
- Извлечение позиций КТРУ/ОКПД2 и реквизитов сторон — best effort по
  `LocalName`. Для точного маппинга нужен реальный XML из архива ЕИС и
  соответствующий раздел Альбома ТФФ; коды справочников не подбираются.
- Состояние на 2026-11-19 (вечер): код, тесты и `--validate` зелёные. Хост
  `int44.zakupki.gov.ru:443` по-прежнему сбрасывает TLS-handshake даже с
  статическим внешним IP `195.226.203.100`; зато `int.zakupki.gov.ru:443`
  (тот же официальный WSDL `getDocsIP`) проходит ГОСТ-handshake и принимает
  SOAP. Попытка выгрузки закончилась ошибкой «Токены для сервисов отдачи
  отсутствуют» — значит нужен новый токен из ЛК, а не сетевые изменения.
