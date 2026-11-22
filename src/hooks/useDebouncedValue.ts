import { useEffect, useState } from "react";

/**
 * Отложенное значение для поисковых запросов.
 *
 * Справочники ОКПД2 и КТРУ ищутся на сервере: без задержки каждый символ
 * превращался бы в отдельный HTTP-запрос, и выдача мигала бы быстрее, чем
 * пользователь успевает её прочитать. Здесь значение обновляется после паузы
 * в наборе, а поле ввода остаётся мгновенным.
 */
export default function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
