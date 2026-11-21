-- SQLite-аналог 001_pipeline.sql для локального воркера.
-- Применяется к уже существующей БД с таблицей Tenders: CREATE TABLE IF NOT EXISTS
-- не трогает старые данные и не требует миграций.

CREATE TABLE IF NOT EXISTS eis_sync_state (
    key               TEXT PRIMARY KEY,
    region_code       TEXT,
    subsystem_type    TEXT NOT NULL,
    document_type     TEXT,
    period_start      TEXT,
    period_end        TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',
    last_error        TEXT,
    last_success_at   TEXT,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_eis_sync_state_status ON eis_sync_state (status, updated_at);

CREATE TABLE IF NOT EXISTS eis_archive_queue (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    archive_url       TEXT NOT NULL,
    url_sha256        CHAR(64) NOT NULL,
    region_code       TEXT,
    subsystem_type    TEXT NOT NULL,
    document_type     TEXT,
    period_start      TEXT,
    period_end        TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',
    http_status       INTEGER,
    archive_sha256    CHAR(64),
    archive_size_bytes INTEGER,
    local_path        TEXT,
    attempts          INTEGER NOT NULL DEFAULT 0,
    last_error        TEXT,
    enqueued_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at      TEXT,
    CONSTRAINT uq_eis_archive_queue_url UNIQUE (url_sha256)
);

CREATE INDEX IF NOT EXISTS ix_eis_archive_queue_status ON eis_archive_queue (status, enqueued_at);

-- Сырой слепок каждого XML-файла из архива. Хранится всегда, даже если
-- парсер не смог определить тип документа: после обновления Альбома ТФФ
-- данные можно разобрать заново без повторного обращения к ЕИС.
CREATE TABLE IF NOT EXISTS raw_documents (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    archive_id        INTEGER NOT NULL REFERENCES eis_archive_queue (id) ON DELETE CASCADE,
    file_name         TEXT NOT NULL,
    document_sha256   CHAR(64) NOT NULL,
    scheme_version    TEXT NOT NULL DEFAULT 'unknown',
    document_kind     TEXT NOT NULL DEFAULT 'unknown',
    raw_xml           TEXT NOT NULL,
    parsed_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_raw_documents_archive_file UNIQUE (archive_id, file_name)
);

CREATE INDEX IF NOT EXISTS ix_raw_documents_hash ON raw_documents (document_sha256);

CREATE TABLE IF NOT EXISTS purchases (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_number   TEXT NOT NULL,
    ikz               TEXT,
    customer_inn      TEXT,
    customer_kpp      TEXT,
    nmck              TEXT,
    object_info       TEXT,
    publish_date      TEXT,
    document_type     TEXT,
    scheme_version    TEXT,
    raw_document_id   INTEGER REFERENCES raw_documents (id) ON DELETE SET NULL,
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_purchases_number UNIQUE (purchase_number)
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id       INTEGER NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
    line_no           INTEGER NOT NULL,
    ktru_code         TEXT,
    okpd2_code        TEXT,
    item_name         TEXT,
    quantity          TEXT,
    price             TEXT,
    raw_document_id   INTEGER REFERENCES raw_documents (id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_items_line UNIQUE (purchase_id, line_no)
);

CREATE TABLE IF NOT EXISTS contracts (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_number        TEXT NOT NULL,
    purchase_number   TEXT REFERENCES purchases (purchase_number),
    ikz               TEXT,
    customer_inn      TEXT,
    customer_kpp      TEXT,
    supplier_inn      TEXT,
    supplier_kpp      TEXT,
    contract_price    TEXT,
    contract_date     TEXT,
    raw_document_id   INTEGER REFERENCES raw_documents (id) ON DELETE SET NULL,
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contracts_reg_number UNIQUE (reg_number)
);

CREATE TABLE IF NOT EXISTS participants (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id       INTEGER REFERENCES purchases (id) ON DELETE CASCADE,
    contract_id       INTEGER REFERENCES contracts (id) ON DELETE CASCADE,
    role              TEXT NOT NULL,
    inn               TEXT NOT NULL,
    kpp               TEXT,
    name              TEXT,
    raw_document_id   INTEGER REFERENCES raw_documents (id) ON DELETE SET NULL,
    CONSTRAINT ck_participants_owner CHECK (purchase_id IS NOT NULL OR contract_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_participants_inn ON participants (inn);
