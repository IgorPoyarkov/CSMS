using Eis44Parser.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Data;

/// <summary>Контекст EF Core для срезов ЕИС и четырёхэтапного конвейера.</summary>
public sealed class EisDbContext : DbContext
{
    public EisDbContext(DbContextOptions<EisDbContext> options)
        : base(options)
    {
    }

    public DbSet<TenderRecord> Tenders => Set<TenderRecord>();
    public DbSet<EisSyncStateRecord> SyncState => Set<EisSyncStateRecord>();
    public DbSet<EisArchiveQueueRecord> ArchiveQueue => Set<EisArchiveQueueRecord>();
    public DbSet<RawDocumentRecord> RawDocuments => Set<RawDocumentRecord>();
    public DbSet<PurchaseRecord> Purchases => Set<PurchaseRecord>();
    public DbSet<PurchaseItemRecord> PurchaseItems => Set<PurchaseItemRecord>();
    public DbSet<ContractRecord> Contracts => Set<ContractRecord>();
    public DbSet<ParticipantRecord> Participants => Set<ParticipantRecord>();
    public DbSet<ContractorRecord> Contractors => Set<ContractorRecord>();
    public DbSet<ContractSubcontractorRecord> ContractSubcontractors => Set<ContractSubcontractorRecord>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TenderRecord>(entity =>
        {
            entity.ToTable("Tenders");
            entity.HasKey(record => record.Id);

            entity.Property(record => record.PurchaseNumber).HasMaxLength(64);
            entity.Property(record => record.SchemeVersion).HasMaxLength(32);
            entity.Property(record => record.CustomerInn).HasMaxLength(12);
            entity.Property(record => record.SourceFile).HasMaxLength(512);

            // Уникальность только для заполненных номеров: пустые значения
            // в PostgreSQL/SQLite не считаются дублами, но фильтр ясен.
            entity.HasIndex(record => record.PurchaseNumber)
                .IsUnique()
                .HasFilter("\"PurchaseNumber\" IS NOT NULL");

            entity.HasIndex(record => record.CustomerInn);
            entity.HasIndex(record => record.PublishDate);
        });

        // Имена таблиц, колонок и индексов совпадают с sql/001_pipeline.sql:
        // DDL для PostgreSQL и EnsureCreated (SQLite в тестах) не должны расходиться.
        modelBuilder.Entity<EisSyncStateRecord>(entity =>
        {
            entity.ToTable("eis_sync_state");
            entity.HasKey(state => state.Key);
            entity.Property(state => state.Key).HasColumnName("key").HasMaxLength(256);
            entity.Property(state => state.RegionCode).HasColumnName("region_code");
            entity.Property(state => state.SubsystemType).HasColumnName("subsystem_type");
            entity.Property(state => state.DocumentType).HasColumnName("document_type");
            entity.Property(state => state.PeriodStart).HasColumnName("period_start");
            entity.Property(state => state.PeriodEnd).HasColumnName("period_end");
            entity.Property(state => state.Status).HasColumnName("status");
            entity.Property(state => state.LastError).HasColumnName("last_error");
            entity.Property(state => state.LastSuccessAt).HasColumnName("last_success_at");
            entity.Property(state => state.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(state => new { state.Status, state.UpdatedAt })
                .HasDatabaseName("ix_eis_sync_state_status");
        });

        modelBuilder.Entity<EisArchiveQueueRecord>(entity =>
        {
            entity.ToTable("eis_archive_queue");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.ArchiveUrl).HasColumnName("archive_url").IsRequired();
            entity.Property(item => item.UrlSha256).HasColumnName("url_sha256").HasMaxLength(64).IsFixedLength();
            entity.Property(item => item.RegionCode).HasColumnName("region_code");
            entity.Property(item => item.SubsystemType).HasColumnName("subsystem_type");
            entity.Property(item => item.DocumentType).HasColumnName("document_type");
            entity.Property(item => item.PeriodStart).HasColumnName("period_start");
            entity.Property(item => item.PeriodEnd).HasColumnName("period_end");
            entity.Property(item => item.Status).HasColumnName("status");
            entity.Property(item => item.HttpStatus).HasColumnName("http_status");
            entity.Property(item => item.ArchiveSha256).HasColumnName("archive_sha256").HasMaxLength(64);
            entity.Property(item => item.ArchiveSizeBytes).HasColumnName("archive_size_bytes");
            entity.Property(item => item.LocalPath).HasColumnName("local_path");
            entity.Property(item => item.Attempts).HasColumnName("attempts");
            entity.Property(item => item.LastError).HasColumnName("last_error");
            entity.Property(item => item.EnqueuedAt).HasColumnName("enqueued_at");
            entity.Property(item => item.UpdatedAt).HasColumnName("updated_at");
            entity.Property(item => item.ProcessedAt).HasColumnName("processed_at");
            entity.HasIndex(item => item.UrlSha256)
                .IsUnique()
                .HasDatabaseName("uq_eis_archive_queue_url");
            entity.HasIndex(item => new { item.Status, item.EnqueuedAt })
                .HasDatabaseName("ix_eis_archive_queue_status");
        });

        modelBuilder.Entity<RawDocumentRecord>(entity =>
        {
            entity.ToTable("raw_documents");
            entity.HasKey(document => document.Id);
            entity.Property(document => document.Id).HasColumnName("id");
            entity.Property(document => document.ArchiveId).HasColumnName("archive_id");
            entity.Property(document => document.FileName).HasColumnName("file_name");
            entity.Property(document => document.DocumentSha256).HasColumnName("document_sha256").HasMaxLength(64).IsFixedLength();
            entity.Property(document => document.SchemeVersion).HasColumnName("scheme_version");
            entity.Property(document => document.DocumentKind).HasColumnName("document_kind");
            entity.Property(document => document.RawXml).HasColumnName("raw_xml").IsRequired();
            entity.Property(document => document.ParsedAt).HasColumnName("parsed_at");
            entity.HasIndex(document => new { document.ArchiveId, document.FileName })
                .IsUnique()
                .HasDatabaseName("uq_raw_documents_archive_file");
            entity.HasIndex(document => document.DocumentSha256)
                .HasDatabaseName("ix_raw_documents_hash");
        });

        modelBuilder.Entity<PurchaseRecord>(entity =>
        {
            entity.ToTable("purchases");
            entity.HasKey(purchase => purchase.Id);
            entity.Property(purchase => purchase.Id).HasColumnName("id");
            entity.Property(purchase => purchase.PurchaseNumber).HasColumnName("purchase_number").IsRequired();
            entity.Property(purchase => purchase.Ikz).HasColumnName("ikz");
            entity.Property(purchase => purchase.CustomerInn).HasColumnName("customer_inn");
            entity.Property(purchase => purchase.CustomerKpp).HasColumnName("customer_kpp");
            entity.Property(purchase => purchase.Nmck).HasColumnName("nmck").HasPrecision(20, 2);
            entity.Property(purchase => purchase.ObjectInfo).HasColumnName("object_info");
            entity.Property(purchase => purchase.PublishDate).HasColumnName("publish_date");
            entity.Property(purchase => purchase.DocumentType).HasColumnName("document_type");
            entity.Property(purchase => purchase.SchemeVersion).HasColumnName("scheme_version");
            entity.Property(purchase => purchase.RawDocumentId).HasColumnName("raw_document_id");
            entity.Property(purchase => purchase.CreatedAt).HasColumnName("created_at");
            entity.Property(purchase => purchase.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(purchase => purchase.PurchaseNumber)
                .IsUnique()
                .HasDatabaseName("uq_purchases_number");
        });

        modelBuilder.Entity<PurchaseItemRecord>(entity =>
        {
            entity.ToTable("purchase_items");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.PurchaseId).HasColumnName("purchase_id");
            entity.Property(item => item.LineNo).HasColumnName("line_no");
            entity.Property(item => item.KtruCode).HasColumnName("ktru_code");
            entity.Property(item => item.Okpd2Code).HasColumnName("okpd2_code");
            entity.Property(item => item.ItemName).HasColumnName("item_name");
            entity.Property(item => item.Quantity).HasColumnName("quantity").HasPrecision(20, 3);
            entity.Property(item => item.Price).HasColumnName("price").HasPrecision(20, 2);
            entity.Property(item => item.RawDocumentId).HasColumnName("raw_document_id");
            entity.HasIndex(item => new { item.PurchaseId, item.LineNo })
                .IsUnique()
                .HasDatabaseName("uq_purchase_items_line");
        });

        modelBuilder.Entity<ContractRecord>(entity =>
        {
            entity.ToTable("contracts");
            entity.HasKey(contract => contract.Id);
            entity.Property(contract => contract.Id).HasColumnName("id");
            entity.Property(contract => contract.RegNumber).HasColumnName("reg_number").IsRequired();
            entity.Property(contract => contract.PurchaseNumber).HasColumnName("purchase_number");
            entity.Property(contract => contract.Ikz).HasColumnName("ikz");
            entity.Property(contract => contract.CustomerInn).HasColumnName("customer_inn");
            entity.Property(contract => contract.CustomerKpp).HasColumnName("customer_kpp");
            entity.Property(contract => contract.SupplierInn).HasColumnName("supplier_inn");
            entity.Property(contract => contract.SupplierKpp).HasColumnName("supplier_kpp");
            entity.Property(contract => contract.ContractPrice).HasColumnName("contract_price").HasPrecision(20, 2);
            entity.Property(contract => contract.ContractDate).HasColumnName("contract_date");
            entity.Property(contract => contract.RawDocumentId).HasColumnName("raw_document_id");
            entity.Property(contract => contract.CreatedAt).HasColumnName("created_at");
            entity.Property(contract => contract.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(contract => contract.RegNumber)
                .IsUnique()
                .HasDatabaseName("uq_contracts_reg_number");
        });

        modelBuilder.Entity<ParticipantRecord>(entity =>
        {
            entity.ToTable("participants");
            entity.HasKey(participant => participant.Id);
            entity.Property(participant => participant.Id).HasColumnName("id");
            entity.Property(participant => participant.PurchaseId).HasColumnName("purchase_id");
            entity.Property(participant => participant.ContractId).HasColumnName("contract_id");
            entity.Property(participant => participant.Role).HasColumnName("role");
            entity.Property(participant => participant.Inn).HasColumnName("inn").IsRequired();
            entity.Property(participant => participant.Kpp).HasColumnName("kpp");
            entity.Property(participant => participant.Name).HasColumnName("name");
            entity.Property(participant => participant.RawDocumentId).HasColumnName("raw_document_id");
            entity.HasIndex(participant => participant.Inn)
                .HasDatabaseName("ix_participants_inn");
        });

        // Справочник подрядчиков: ИНН — естественный ключ, поэтому отдельный
        // суррогатный Id нужен только для EF, а уникальность держит индекс.
        modelBuilder.Entity<ContractorRecord>(entity =>
        {
            entity.ToTable("contractors");
            entity.HasKey(contractor => contractor.Id);
            entity.Property(contractor => contractor.Id).HasColumnName("id");
            entity.Property(contractor => contractor.Inn).HasColumnName("inn").IsRequired();
            entity.Property(contractor => contractor.Kpp).HasColumnName("kpp");
            entity.Property(contractor => contractor.Name).HasColumnName("name");
            entity.Property(contractor => contractor.FullName).HasColumnName("full_name");
            entity.Property(contractor => contractor.Ogrn).HasColumnName("ogrn");
            entity.Property(contractor => contractor.Address).HasColumnName("address");
            entity.Property(contractor => contractor.StatusCode).HasColumnName("status_code");
            entity.Property(contractor => contractor.StatusName).HasColumnName("status_name");
            entity.Property(contractor => contractor.IsSmp).HasColumnName("is_smp");
            entity.Property(contractor => contractor.IsSono).HasColumnName("is_sono");
            entity.Property(contractor => contractor.FnsStatus).HasColumnName("fns_status");
            entity.Property(contractor => contractor.Source).HasColumnName("source");
            entity.Property(contractor => contractor.FnsCheckedAt).HasColumnName("fns_checked_at");
            entity.Property(contractor => contractor.FnsPayload).HasColumnName("fns_payload");
            entity.Property(contractor => contractor.CreatedAt).HasColumnName("created_at");
            entity.Property(contractor => contractor.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(contractor => contractor.Inn)
                .IsUnique()
                .HasDatabaseName("uq_contractors_inn");
            entity.HasIndex(contractor => contractor.FnsCheckedAt)
                .HasDatabaseName("ix_contractors_fns_checked");
        });

        // Связь контракта с субподрядчиком: только ИНН + реквизиты субдоговора.
        modelBuilder.Entity<ContractSubcontractorRecord>(entity =>
        {
            entity.ToTable("contract_subcontractors");
            entity.HasKey(link => link.Id);
            entity.Property(link => link.Id).HasColumnName("id");
            entity.Property(link => link.ContractId).HasColumnName("contract_id");
            entity.Property(link => link.Inn).HasColumnName("inn").IsRequired();
            entity.Property(link => link.Kpp).HasColumnName("kpp");
            entity.Property(link => link.StatusCode).HasColumnName("status_code");
            entity.Property(link => link.Amount).HasColumnName("amount").HasPrecision(20, 2);
            entity.Property(link => link.DocumentNumber).HasColumnName("document_number");
            entity.Property(link => link.DocumentDate).HasColumnName("document_date");
            entity.Property(link => link.Subject).HasColumnName("subject");
            entity.Property(link => link.Okpd2Code).HasColumnName("okpd2_code");
            entity.Property(link => link.RawDocumentId).HasColumnName("raw_document_id");
            entity.Property(link => link.CreatedAt).HasColumnName("created_at");
            entity.Property(link => link.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(link => new { link.ContractId, link.Inn, link.DocumentNumber })
                .IsUnique()
                .HasDatabaseName("uq_contract_subcontractors_link");
            entity.HasIndex(link => link.Inn)
                .HasDatabaseName("ix_contract_subcontractors_inn");
        });
    }
}
