using System.Text.Json;

namespace Eis44Parser.Worker;

/// <summary>
/// Курсор инкрементального импорта публичных карточек контрактов. Полный проход
/// по ИНН делается один раз; дальше раз в день перечисляем номера поиском и
/// берём только те, что старше <see cref="LastRegNumber"/>.
/// </summary>
public sealed class CardImportState
{
    public int Version { get; set; } = 1;
    public string Inn { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? LastRegNumber { get; set; }
    public int ProcessedCount { get; set; }
    public DateTimeOffset? LastCheckedAt { get; set; }
    public DateTimeOffset? LastImportedAt { get; set; }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
    };

    public static CardImportState Load(string path)
    {
        if (!File.Exists(path))
        {
            return new CardImportState();
        }

        try
        {
            return JsonSerializer.Deserialize<CardImportState>(File.ReadAllText(path))
                ?? new CardImportState();
        }
        catch (JsonException)
        {
            // Битый state не должен ронять ежедневную проверку: считаем его пустым
            // и восстановим курсор из уже разобранных проекций в папке --out.
            return new CardImportState();
        }
    }

    public void Save(string path)
    {
        var fullPath = Path.GetFullPath(path);
        var directory = Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var temp = fullPath + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(this, JsonOptions));
        File.Move(temp, fullPath, overwrite: true);
    }
}
