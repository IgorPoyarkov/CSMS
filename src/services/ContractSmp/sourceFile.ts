/**
 * Извлечение реквизитов из файла-основания, который прислал подрядчик
 * (Tasks 9, п. 6, п/п 7 — «загрузка файла и ручное подтверждение двух полей»).
 *
 * Файл обрабатывается в браузере пользователя и никуда не загружается: здесь
 * читается только имя файла, из которого берутся номер и дата документа.
 * Содержимое (текстовый слой PDF, OCR скана) — отдельный слой, он подключается
 * сюда же, когда появится.
 *
 * Извлечённые значения — подсказка, а не источник истины: поля всегда остаются
 * доступны для правки, а достоверность подтверждают подрядчик при отправке и
 * заказчик при приёмке (п. 6 типовых условий ПП РФ от 23.12.2016 N 1466).
 */

export interface SourceFileFields {
  // Имя файла как он назван у подрядчика — храним в sourceFileName
  fileName: string;
  // Размер в байтах, нужен чтобы показать «файл не загружается, только имя»
  size: number;
  // Реквизиты, которые удалось прочитать из имени; пустая строка — не нашли
  documentNumber: string;
  documentDate: string;
  // Что именно подсказали имя файла — для плашки «проверьте автоматически»
  matched: ("documentNumber" | "documentDate")[];
}

const RU_DATE = /(\d{1,2})[.\-_](\d{1,2})[.\-_](\d{4})/;
const ISO_DATE = /(\d{4})-(\d{1,2})-(\d{1,2})/;

// Номер после явного знака: «№123», «# 45/26», «№789А»
const NUMBER_BY_SIGN = /[№#]\s*(\d{1,6}(?:\s*[-/]\s*\d{1,4})?[а-яА-Яa-z]?)/i;

// Номер после словесной метки в типовых именах файлов: «Договор 123»,
// «акт_45», «пп-9». Метка ищется только на границе слова
const NUMBER_BY_WORD =
  /(?<![\wа-я-])(?:договор|дог|согл|контракт|акт|пп|п-?п|счет|счёт|сч|номер|no)\.?\s*[:.\-_]?\s*(\d{1,6}(?:\s*[-/]\s*\d{1,4})?[а-яА-Яa-z]?)/i;

// Голый номер — если метки нет: число от 1 до 6 цифр, не похожее на год
const NUMBER_BARE = /(?<!\d)(\d{1,6})(?:[-/](\d{1,4}))?(?!\d)/;

const pad = (value: string): string => value.padStart(2, "0");

const toIsoDate = (year: string, month: string, day: string): string | null => {
  const y = Number.parseInt(year, 10);
  const m = Number.parseInt(month, 10);
  const d = Number.parseInt(day, 10);

  // Год документа: раньше 44-ФЗ (2014) сведений о привлечении СМП нет
  if (y < 2014 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return `${y}-${pad(String(m))}-${pad(String(d))}`;
};

/** Дата из имени файла: 15.01.2026, 15-01-2026 или 2026-01-15 → ГГГГ-ММ-ДД */
export const parseDocumentDateFromFileName = (fileName: string): string => {
  const iso = fileName.match(ISO_DATE);
  if (iso) {
    const parsed = toIsoDate(iso[1], iso[2], iso[3]);
    if (parsed) return parsed;
  }

  const ru = fileName.match(RU_DATE);
  if (ru) {
    const parsed = toIsoDate(ru[3], ru[1], ru[2]);
    if (parsed) return parsed;
  }

  return "";
};

/**
 * Номер документа из имени файла. Дата вырезается перед поиском, чтобы «2026»
 * не притворилось номером договора.
 */
export const parseDocumentNumberFromFileName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^.]{1,5}$/, "");
  const withoutDate = withoutExtension
    .replace(ISO_DATE, " ")
    .replace(RU_DATE, " ");

  const bySign = withoutDate.match(NUMBER_BY_SIGN);
  if (bySign) return bySign[1].replace(/\s+/g, "");

  const byWord = withoutDate.match(NUMBER_BY_WORD);
  if (byWord) return byWord[1].replace(/\s+/g, "");

  const bare = withoutDate.match(NUMBER_BARE);
  if (bare) {
    // Четырёхзначное число на 19xx/20xx — почти наверняка год, а не номер
    if (/^(19|20)\d{2}$/.test(bare[1]) && !bare[2]) return "";
    return bare[2] ? `${bare[1]}-${bare[2]}` : bare[1];
  }

  return "";
};

/**
 * Читает реквизиты из выбранного файла. Содержимое не читается: файл остаётся
 * у пользователя, в базу идёт только имя и подсказки из него.
 */
export const readSourceFileFields = (file: File): SourceFileFields => {
  const documentNumber = parseDocumentNumberFromFileName(file.name);
  const documentDate = parseDocumentDateFromFileName(file.name);

  const matched: SourceFileFields["matched"] = [];
  if (documentNumber) matched.push("documentNumber");
  if (documentDate) matched.push("documentDate");

  return {
    fileName: file.name,
    size: file.size,
    documentNumber,
    documentDate,
    matched,
  };
};

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};

// Что показывать, когда из имени файла ничего не читается: подсказка, что
// реквизиты вносятся руками, а распознавание содержимого — отдельная задача
export const SOURCE_FILE_HINT =
  "Файл обрабатывается в браузере и не загружается в систему — сохраняется только его имя. Номер и дата читаются из имени файла, проверьте их перед сохранением.";
