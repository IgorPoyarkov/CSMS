-- Схема четырёхэтапного конвейера выгрузки открытых данных ЕИС 44-ФЗ.
-- Источник кодов подсистем и порядка полей — официальная XSD 17.0
-- getDocsIP-ws-api.xsd из schemas/17.0 (в eis-parser — schemas/Schemas44).
-- Файл идемпотентен: повторное применение не удаляет данные.

CREATE TABLE IF NOT EXISTS eis_sync_state (
    key               TEXT PRIMARY KEY,
    region_code       TEXT,
    subsystem_type    TEXT NOT NULL,
    document_type     TEXT,
    period_start      TIMESTAMPTZ,
    period_end        TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'pending',
    last_error        TEXT,
    last_success_at   TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_eis_sync_state_status ON eis_sync_state (status, updated_at);

CREATE TABLE IF NOT EXISTS eis_archive_queue (
    id                BIGSERIAL PRIMARY KEY,
    archive_url       TEXT NOT NULL,
    url_sha256        CHAR(64) NOT NULL,
    region_code       TEXT,
    subsystem_type    TEXT NOT NULL,
    document_type     TEXT,
    period_start      TIMESTAMPTZ,
    period_end        TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'pending',
    http_status       INTEGER,
    archive_sha256    CHAR(64),
    archive_size_bytes BIGINT,
    local_path        TEXT,
    attempts          INTEGER NOT NULL DEFAULT 0,
    last_error        TEXT,
    enqueued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at      TIMESTAMPTZ,
    CONSTRAINT uq_eis_archive_queue_url UNIQUE (url_sha256)
);

CREATE INDEX IF NOT EXISTS ix_eis_archive_queue_status ON eis_archive_queue (status, enqueued_at);

-- Сырой слепок каждого XML-файла из архива. Хранится всегда, даже если
-- парсер не смог определить тип документа: после обновления Альбома ТФФ
-- данные можно разобрать заново без повторного обращения к ЕИС.
CREATE TABLE IF NOT EXISTS raw_documents (
    id                BIGSERIAL PRIMARY KEY,
    archive_id        BIGINT NOT NULL REFERENCES eis_archive_queue (id) ON DELETE CASCADE,
    file_name         TEXT NOT NULL,
    document_sha256   CHAR(64) NOT NULL,
    scheme_version    TEXT NOT NULL DEFAULT 'unknown',
    document_kind     TEXT NOT NULL DEFAULT 'unknown',
    raw_xml           TEXT NOT NULL,
    parsed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_raw_documents_archive_file UNIQUE (archive_id, file_name)
);

CREATE INDEX IF NOT EXISTS ix_raw_documents_hash ON raw_documents (document_sha256);

CREATE TABLE IF NOT EXISTS purchases (
    id                BIGSERIAL PRIMARY KEY,
    purchase_number   TEXT NOT NULL,
    ikz               TEXT,
    customer_inn      TEXT,
    customer_kpp      TEXT,
    nmck              NUMERIC(20, 2),
    object_info       TEXT,
    publish_date      TEXT,
    document_type     TEXT,
    scheme_version    TEXT,
    raw_document_id   BIGINT REFERENCES raw_documents (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_purchases_number UNIQUE (purchase_number)
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id                BIGSERIAL PRIMARY KEY,
    purchase_id       BIGINT NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
    line_no           INTEGER NOT NULL,
    ktru_code         TEXT,
    okpd2_code        TEXT,
    item_name         TEXT,
    quantity          NUMERIC(20, 3),
    price             NUMERIC(20, 2),
    raw_document_id   BIGINT REFERENCES raw_documents (id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_items_line UNIQUE (purchase_id, line_no)
);

CREATE TABLE IF NOT EXISTS contracts (
    id                BIGSERIAL PRIMARY KEY,
    reg_number        TEXT NOT NULL,
    purchase_number   TEXT REFERENCES purchases (purchase_number),
    ikz               TEXT,
    customer_inn      TEXT,
    customer_kpp      TEXT,
    supplier_inn      TEXT,
    supplier_kpp      TEXT,
    contract_price    NUMERIC(20, 2),
    contract_date     TEXT,
    raw_document_id   BIGINT REFERENCES raw_documents (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_contracts_reg_number UNIQUE (reg_number)
);

CREATE TABLE IF NOT EXISTS participants (
    id                BIGSERIAL PRIMARY KEY,
    purchase_id       BIGINT REFERENCES purchases (id) ON DELETE CASCADE,
    contract_id       BIGINT REFERENCES contracts (id) ON DELETE CASCADE,
    role              TEXT NOT NULL,
    inn               TEXT NOT NULL,
    kpp               TEXT,
    name              TEXT,
    raw_document_id   BIGINT REFERENCES raw_documents (id) ON DELETE SET NULL,
    CONSTRAINT ck_participants_owner CHECK (purchase_id IS NOT NULL OR contract_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_participants_inn ON participants (inn);

-- Справочник подрядчиков/контрагентов по ИНН. Заполняется из XML ЕИС
-- минимальными реквизитами, затем обогащается по API ФНС.
CREATE TABLE IF NOT EXISTS contractors (
    id              BIGSERIAL PRIMARY KEY,
    inn             TEXT NOT NULL,
    kpp             TEXT,
    name            TEXT,
    full_name       TEXT,
    ogrn            TEXT,
    address         TEXT,
    status_code     TEXT,
    status_name     TEXT,
    is_smp          BOOLEAN,
    is_sono         BOOLEAN,
    fns_status      TEXT,
    source          TEXT,
    fns_checked_at  TIMESTAMPTZ,
    fns_payload     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_contractors_inn UNIQUE (inn)
);

CREATE INDEX IF NOT EXISTS ix_contractors_fns_checked ON contractors (fns_checked_at);

-- Связь контракта с субподрядчиком: только ИНН + реквизиты субдоговора.
CREATE TABLE IF NOT EXISTS contract_subcontractors (
    id                BIGSERIAL PRIMARY KEY,
    contract_id       BIGINT NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
    inn               TEXT NOT NULL,
    kpp               TEXT,
    status_code       TEXT,
    amount            NUMERIC(20, 2),
    document_number   TEXT,
    document_date     TEXT,
    subject           TEXT,
    okpd2_code        TEXT,
    raw_document_id   BIGINT REFERENCES raw_documents (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_contract_subcontractors_link UNIQUE (contract_id, inn, document_number)
);

CREATE INDEX IF NOT EXISTS ix_contract_subcontractors_inn ON contract_subcontractors (inn);
