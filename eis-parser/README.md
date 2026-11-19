# Парсер и интеграционный клиент ЕИС (44-ФЗ)

Консольное приложение и библиотеки на .NET 9 для выгрузки структурированных
XML-данных из ЕИС через SOAP-сервис `getDocsIP`. Пользователь работает от лица
зарегистрированного ИП: в каждый SOAP-запрос кладётся `individualPerson_token`
из личного кабинета участника закупок.

## Состав решения

| Проект | Назначение |
| --- | --- |
| `Eis44Parser.Core` | SOAP-клиент, сборщик запросов, парсер XML, модели, дедупликация |
| `Eis44Parser.Data` | EF Core: SQLite/PostgreSQL, таблица `Tenders`, ключ по номеру закупки |
| `Eis44Parser.Worker` | Фоновая служба опроса, конфигурация, CLI-режимы |
| `Eis44Parser.Tests` | xUnit: порядок SOAP-тегов, парсинг разных версий схем, дедупликация |

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

ЕИС на `int44.zakupki.gov.ru` требует ГОСТ-TLS (КриптоПро CSP). Обычный
`HttpClient` .NET обращается не напрямую к ЕИС, а к локальному Stunnel с
КриптоПро/msspi:

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

## Двухэтапное получение данных

1. SOAP `getDocsByOrgRegionRequest` (по региону и дате) или
   `getDocsByReestrNumberRequest` (по 19-значному номеру) возвращает `archiveUrl`.
2. ZIP скачивается `HTTP GET` через тот же туннель; в заголовке обязателен
   `individualPerson_token: {token}`. XML внутри архива разбирается по
   `XDocument` с поиском через `Name.LocalName` — префиксы пространств имён и
   `schemeVersion` разных версий не ломают разбор.

Подсистемы 44-ФЗ: `PRIZ` (извещения и протоколы), `RPEC` (реестр контрактов),
`RPGZ` (планы-графики), `NSI` (справочники).

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

⚠️ Живой прогон пока невозможен: `int44.zakupki.gov.ru:443` сбрасывает
соединение на `SSL_connect` (подробности — §26 `.koda/PROJECT_STATE.md`).
Код и тесты готовы, но сетевой путь не проверен.

## Запуск

```bash
cd eis-parser
dotnet restore
dotnet build
dotnet test

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
- Состояние на 2026-11-19: код, тесты и `--validate` зелёные, но живой обмен
  заблокирован на уровне TLS: сервер `int44.zakupki.gov.ru:443` сбрасывает
  соединение (`10054`) до прикладных данных — и из stunnel-msspi, и из
  `csptest`, и при отправке «сырого» ClientHello с suite `ff85`. Локальный
  туннель при этом исправен (тот же stunnel успешно делает handshake с
  `www.google.com:443`). Для продолжения нужен доступ к рабочему контуру ЕИС
  или подтверждение, что хост/сертификат доступны с этого IP.
