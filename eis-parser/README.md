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

## Сетевой контур

ЕИС на `int44.zakupki.gov.ru` требует ГОСТ-TLS (КриптоПро CSP). Обычный
`HttpClient` .NET обращается не напрямую к ЕИС, а к локальному Stunnel с
КриптоПро/msspi:

```ini
[eis-44]
client = yes
accept = 127.0.0.1:8080
connect = int44.zakupki.gov.ru:443
```

Готовый шаблон лежит в `eis-parser/stunnel.conf`:

```powershell
cd eis-parser
stunnel.exe stunnel.conf
```

Что нужно от вас на машине:

1. **Сборка stunnel с поддержкой ГОСТ-шифров** — обычный OpenSSL-стunnel
   не понимает `GOST2012-GOST8912-GOST8912`. Нужна ГОСТ-ветка stunnel или
   сборка от вендора КриптоПро. Установить её надо отдельно (например,
   распаковать portable-сборку в `C:\Tools\stunnel` и добавить в PATH).
2. **КриптоПро CSP** с установленным сертификатом и приватным ключом —
   на этой машине реестр `HKCU:\SOFTWARE\Crypto Pro` есть, но сам stunnel
   ещё не установлен.
3. **Доступ к `int44.zakupki.gov.ru:443`** — при необходимости пробросить
   через файрвол/прокси.

Если ваша сборка требует явного задания ГОСТ-шифров, раскомментируйте в
`stunnel.conf` строки `sslVersion`, `ciphers`, `options`; для отладки — `debug`/`output`.

Проверить готовность после запуска stunnel:

```powershell
dotnet run --project src/Eis44Parser.Worker -- --check
```

Команда печатает состояние токена и результатов TCP-пинга до `127.0.0.1:8080`
и возвращает код 1, если туннель не поднят. Перед каждым запросом к ЕИС та же
проверка делается внутри клиента — ошибка будет читаемой, а не «таймаутом».

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

## Запуск

```bash
cd eis-parser
dotnet restore
dotnet build
dotnet test

# Проверить конфигурацию и создать БД без обращения к ЕИС:
dotnet run --project src/Eis44Parser.Worker -- --validate

# Поднять stunnel (в отдельном окне), затем проверить готовность:
stunnel.exe stunnel.conf
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
