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

        // Имена таблиц и индексов совпадают с sql/001_pipeline.sql, чтобы
        // EnsureCreated (SQLite в тестах) и миграция PostgreSQL не расходились.
        modelBuilder.Entity<EisSyncStateRecord>(entity =>
        {
            entity.ToTable("eis_sync_state");
            entity.HasKey(state => state.Key);
            entity.Property(state => state.Key).HasMaxLength(256);
            entity.HasIndex(state => new { state.Status, state.UpdatedAt })
                .HasDatabaseName("ix_eis_sync_state_status");
        });

        modelBuilder.Entity<EisArchiveQueueRecord>(entity =>
        {
            entity.ToTable("eis_archive_queue");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.ArchiveUrl).IsRequired();
            entity.Property(item => item.UrlSha256).HasMaxLength(64).IsFixedLength();
            entity.Property(item => item.ArchiveSha256).HasMaxLength(64);
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
            entity.Property(document => document.DocumentSha256).HasMaxLength(64).IsFixedLength();
            entity.Property(document => document.RawXml).IsRequired();
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
            entity.Property(purchase => purchase.PurchaseNumber).IsRequired();
            entity.Property(purchase => purchase.Nmck).HasPrecision(20, 2);
            entity.HasIndex(purchase => purchase.PurchaseNumber)
                .IsUnique()
                .HasDatabaseName("uq_purchases_number");
        });

        modelBuilder.Entity<PurchaseItemRecord>(entity =>
        {
            entity.ToTable("purchase_items");
            entity.HasKey(item => new { item.PurchaseId, item.LineNo });
            entity.Property(item => item.Quantity).HasPrecision(20, 3);
            entity.Property(item => item.Price).HasPrecision(20, 2);
        });

        modelBuilder.Entity<ContractRecord>(entity =>
        {
            entity.ToTable("contracts");
            entity.HasKey(contract => contract.Id);
            entity.Property(contract => contract.RegNumber).IsRequired();
            entity.Property(contract => contract.ContractPrice).HasPrecision(20, 2);
            entity.HasIndex(contract => contract.RegNumber)
                .IsUnique()
                .HasDatabaseName("uq_contracts_reg_number");
        });

        modelBuilder.Entity<ParticipantRecord>(entity =>
        {
            entity.ToTable("participants");
            entity.HasKey(participant => participant.Id);
            entity.Property(participant => participant.Inn).IsRequired();
            entity.HasIndex(participant => participant.Inn)
                .HasDatabaseName("ix_participants_inn");
        });
    }
}
