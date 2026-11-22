using System.Text.RegularExpressions;

namespace Eis44Parser.Core;

/// <summary>
/// Разделение кода из XML ЕИС на ОКПД2 и КТРУ. В упрощённой форме ОН_НСЧФДОПPR
/// атрибут КодТов содержит именно код КТРУ вида «11 цифр ОКПД2 - 8 цифр»,
/// поэтому записывать его целиком в поле ОКПД2 было неверно.
/// </summary>
public static class ClassifierCodes
{
    private static readonly Regex KtruCode = new(
        @"^(?<okpd2>\d{2}\.\d{2}\.\d{2}\.\d{3})-(?<suffix>\d{8})$",
        RegexOptions.CultureInvariant);

    /// <summary>Вернуть пару (ОКПД2, КТРУ); один из элементов может быть null.</summary>
    public static (string? Okpd2Code, string? KtruCode) Split(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return (null, null);
        }

        var value = code.Trim();
        var match = KtruCode.Match(value);
        return match.Success
            ? (match.Groups["okpd2"].Value, value)
            : (value, null);
    }
}
