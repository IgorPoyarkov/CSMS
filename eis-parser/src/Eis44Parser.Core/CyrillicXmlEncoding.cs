using System.Runtime.CompilerServices;
using System.Text;

namespace Eis44Parser.Core;

/// <summary>
/// Кириллические XML Казначейства (ОН_АКТРЕЗРАБП, DP_*) объявляют
/// encoding="WINDOWS-1251". .NET Core не знает эту кодировку без явной
/// регистрации провайдера, поэтому регистрируем её при загрузке сборки.
/// </summary>
internal static class CyrillicXmlEncoding
{
    // Registration must happen before XDocument.Load sees the declaration,
    // including in tests and other consumers of the core assembly.
#pragma warning disable CA2255
    [ModuleInitializer]
#pragma warning restore CA2255
    internal static void Register() =>
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
}
