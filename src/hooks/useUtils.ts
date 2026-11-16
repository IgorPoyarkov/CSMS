import type { BaseHuman } from "../services/StaffingTable/StaffingTable.schema";

const useUtils = () => {
  const formatDate = (isoString: string | undefined): string => {
    if (!isoString) {
      return "";
    }

    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  };

  const getRandomInRange = (min: number = 0, max: number = 1): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const fileToBase64 = (files: FileList | null): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!files || files.length === 0) return resolve("");

      const file = files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Хелпер БЭМ: собирает block__elem--mod и список модификаторов одним вызовом.
  // styles — объект CSS-модуля; для глобального (немодульного) блока его можно
  // не передавать: bem("custom-button")("", ["main"]).
  // Sass выбрасывает пустые правила, поэтому элемент без стилей отсутствует в
  // модуле: для него отдаётся исходное БЭМ-имя, чтобы разметка осталась БЭМ
  // (как до миграции) и без class="undefined".
  const bem = (styles: Record<string, string> | string, block?: string) => {
    const scoped = typeof styles === "string" ? {} : styles;
    const blockName = typeof styles === "string" ? styles : (block ?? "");

    return (element = "", modifiers: string[] = []): string => {
      const name = element ? `${blockName}__${element}` : blockName;
      const classes = [scoped[name] ?? name];

      for (const modifier of modifiers) {
        if (!modifier) continue;

        const modifierName = `${name}--${modifier}`;
        classes.push(scoped[modifierName] ?? modifierName);
      }

      return classes.join(" ");
    };
  };

  const fullName = (human: BaseHuman): string => {
    if (!human) return "";
    const surname = human.surname || "";
    const name = human.name || "";
    const patronymic = human.patronymic || "";
    const fullNameRaw = `${surname} ${name} ${patronymic}`.trim();

    return fullNameRaw;
  };

  return {
    formatDate,
    getRandomInRange,
    fileToBase64,
    bem,
    fullName,
  };
};

export default useUtils;
