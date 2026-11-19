using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core.Abstractions;

/// <summary>Разбор XML документа ЕИС в плоскую модель.</summary>
public interface ITenderXmlParser
{
    /// <summary>
    /// Разобрать документ без учёта префиксов пространств имён: поиск идёт по LocalName.
    /// </summary>
    TenderDto Parse(XDocument document, string fileName);
}
