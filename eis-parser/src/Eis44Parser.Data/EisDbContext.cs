using Eis44Parser.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Data;

/// <summary>Контекст EF Core для срезов ЕИС.</summary>
public sealed class EisDbContext : DbContext
{
    public EisDbContext(DbContextOptions<EisDbContext> options)
        : base(options)
    {
    }

    public DbSet<TenderRecord> Tenders => Set<TenderRecord>();

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
            // в PostgreSQL/SQLite не считаются дублями, но фильтр ясен.
            entity.HasIndex(record => record.PurchaseNumber)
                .IsUnique()
                .HasFilter("\"PurchaseNumber\" IS NOT NULL");

            entity.HasIndex(record => record.CustomerInn);
            entity.HasIndex(record => record.PublishDate);
        });
    }
}
