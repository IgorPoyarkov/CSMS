import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  FileSignature,
  FileText,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import styles from "./VisitCardPage.module.scss";

type RevealVariant = "up" | "left" | "right" | "zoom";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
}

/**
 * Обёртка для появления при прокрутке. Сам наблюдатель один на страницу:
 * он ищет все [data-reveal] и включает/выключает показ в обе стороны —
 * при прокрутке вниз элементы собираются, при возврате вверх снова
 * разбираются и проявляются при повторном входе в экран.
 * Вариант задаёт направление/масштаб, delay — ступенчатую задержку.
 * При prefers-reduced-motion CSS оставляет только мягкое проявление opacity.
 */
const Reveal = ({
  children,
  className,
  delay = 0,
  variant = "up",
}: RevealProps) => (
  <div
    className={className}
    data-reveal={variant}
    style={{ transitionDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const NAV_LINKS = [
  { href: "#features", label: "Возможности" },
  { href: "#process", label: "Процесс" },
  { href: "#numbers", label: "Цифры" },
  { href: "#contacts", label: "Контакты" },
];

const METRICS = [
  { value: "6", label: "этапов сквозного контура" },
  { value: "17", label: "экранов и реестров" },
  { value: "183", label: "извещения в демо-базе" },
  { value: "6", label: "тем оформления" },
];

const FEATURES = [
  {
    Icon: CalendarDays,
    title: "План-график",
    text: "Позиции по ИКЗ, объёмы финансирования по годам, версии и импорт из ЕИС.",
  },
  {
    Icon: FileText,
    title: "Потребности и ООЗ",
    text: "Служебные записки, объекты закупки, характеристики и проверка по 158н.",
  },
  {
    Icon: Megaphone,
    title: "Извещения",
    text: "Сведения для ЕИС, требования ст. 31, национальный режим и выгрузка пакетов.",
  },
  {
    Icon: FileSignature,
    title: "Контракты",
    text: "Проекты, реестр, изменения, приёмка и оплата — в одной связанной цепочке.",
  },
  {
    Icon: ShieldCheck,
    title: "Сроки и риски",
    text: "Уведомления о просрочках, неустойки и контроль этапов исполнения.",
  },
  {
    Icon: BarChart3,
    title: "Аналитика",
    text: "Динамика плана и оплат, статусы контрактов и монитор исполнения бюджета.",
  },
];

const STEPS = [
  { title: "Планирование", text: "Потребность заказчика и лимиты бюджета." },
  { title: "План-график", text: "Позиции с ИКЗ и разбивкой по годам." },
  { title: "Потребность", text: "СЗ, НМЦК и описание объекта закупки." },
  { title: "Извещение", text: "Публикация в ЕИС и пакет документов." },
  { title: "Контракт", text: "Проект, подписание и реестровая запись." },
  { title: "Исполнение", text: "Приёмка, оплата и отчётность по 158н." },
];

const TRUST = ["44-ФЗ", "приказ 158н", "ЕИС", "СМП / СОНКО"];

const CHART_BARS = [38, 62, 48, 76, 54, 88, 66, 94, 72, 100, 84, 92];

const AUDIT_ROWS = [
  { ok: true, text: "ИКЗ связан с позицией плана-графика" },
  { ok: true, text: "НМЦК обоснована и приложен расчёт" },
  { ok: true, text: "Требования ст. 31 заполнены" },
  { ok: false, text: "Срок публикации в ЕИС — осталось 2 дня" },
];

const VisitCardPage = () => {
  const { bem } = useUtils();
  const page = bem(styles, "visit");
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 8,
  );

  // Появление секций: один IntersectionObserver на страницу
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => {
        node.dataset.revealed = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            element.dataset.revealed = "true";
            return;
          }

          // Обратная сборка: элемент ушёл из экрана — возвращаем стартовое
          // состояние, чтобы при прокрутке назад он проявился снова
          delete element.dataset.revealed;
        });
      },
      // 6% видимости достаточно для старта; выходим из показа, когда элемент
      // полностью покинул экран — без «мигания» на нижней кромке
      { threshold: 0.06 },
    );

    // Даём браузеру отрисовать стартовое состояние (opacity: 0), иначе
    // элементы первого экрана получают data-revealed до первой отрисовки
    // и анимации не видно
    const frame = window.requestAnimationFrame(() => {
      nodes.forEach((node) => observer.observe(node));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Шапка и индикатор прочтения. Прогресс пишем прямо в style, чтобы
  // прокрутка не вызывала ререндер React.
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      if (progressRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        progressRef.current.style.transform = `scaleX(${Math.min(1, progress)})`;
      }

      setIsScrolled(window.scrollY > 8);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Страница самостоятельная: тёмный фон и заголовок вкладки не должны
  // зависеть от темы приложения, выбранной в шапке
  useEffect(() => {
    const previousTitle = document.title;
    const previousBackground = document.body.style.backgroundColor;

    document.title = "ЦСМС — контрактная служба заказчика";
    document.body.style.backgroundColor = "#060b12";

    return () => {
      document.title = previousTitle;
      document.body.style.backgroundColor = previousBackground;
    };
  }, []);

  return (
    <div className={page()} ref={rootRef}>
      <a className={page("skip")} href="#main">
        Перейти к содержимому
      </a>

      <div className={page("progress")} ref={progressRef} aria-hidden="true" />

      <header className={page("nav", isScrolled ? ["scrolled"] : [])}>
        <a className={page("brand")} href="#top" aria-label="ЦСМС — наверх">
          <span className={page("brand-mark")} aria-hidden="true">
            Ц
          </span>
          <span className={page("brand-text")}>
            <strong>ЦСМС</strong>
            <span>контрактная служба</span>
          </span>
        </a>

        <nav className={page("nav-menu")} aria-label="Разделы визитки">
          <ul className={page("nav-list")}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a className={page("nav-link")} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={page("nav-actions")}>
          <Link className={page("nav-cta")} to="/">
            Открыть систему
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="main">
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <section className={page("hero")} id="top">
          <div className={page("hero-glow", ["one"])} aria-hidden="true" />
          <div className={page("hero-glow", ["two"])} aria-hidden="true" />
          <div className={page("hero-grid-lines")} aria-hidden="true" />

          <div className={page("hero-grid")}>
            <Reveal className={page("hero-copy")} variant="left">
              <p className={page("eyebrow")}>
                <Sparkles size={14} aria-hidden="true" />
                44-ФЗ · приказ 158н · ЕИС
              </p>

              <h1 className={page("hero-title")}>
                Закупки под контролем —{" "}
                <span className={page("gradient-text")}>
                  от плана до оплаты
                </span>
              </h1>

              <p className={page("lead")}>
                Рабочее место контрактной службы заказчика: план-график,
                потребности, извещения, контракты и отчётность связаны в один
                прозрачный маршрут. Без таблиц-дублей и ручного переноса данных.
              </p>

              <div className={page("hero-actions")}>
                <Link className={page("button", ["primary"])} to="/">
                  Открыть рабочий стол
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className={page("button")} href="#features">
                  Смотреть возможности
                </a>
              </div>

              <ul className={page("trust")} aria-label="Соответствие нормам">
                {TRUST.map((item) => (
                  <li className={page("trust-item")} key={item}>
                    <Check size={13} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className={page("hero-visual")} delay={140} variant="right">
              <div className={page("mock")} aria-hidden="true">
                <div className={page("mock-head")}>
                  <span className={page("mock-dot")} />
                  <span>Рабочий стол заказчика</span>
                  <span className={page("mock-live")}>live</span>
                </div>

                <div className={page("mock-kpis")}>
                  <div className={page("mock-kpi")}>
                    <span>Контракты</span>
                    <strong>517</strong>
                  </div>
                  <div className={page("mock-kpi")}>
                    <span>Потребности</span>
                    <strong>144</strong>
                  </div>
                  <div className={page("mock-kpi")}>
                    <span>Уведомления</span>
                    <strong className={page("mock-kpi-warn")}>7</strong>
                  </div>
                </div>

                <div className={page("mock-chart")}>
                  {CHART_BARS.map((height, index) => (
                    <span
                      key={index}
                      style={
                        {
                          height: `${height}%`,
                          animationDelay: `${index * 70}ms`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>

                <div className={page("mock-rows")}>
                  <div className={page("mock-row")}>
                    <span>План-график 2026</span>
                    <span className={page("status", ["ok"])}>согласован</span>
                  </div>
                  <div className={page("mock-row")}>
                    <span>Извещение ЭА-142</span>
                    <span className={page("status", ["info"])}>в ЕИС</span>
                  </div>
                  <div className={page("mock-row")}>
                    <span>Контракт 0346…001</span>
                    <span className={page("status", ["warn"])}>оплата</span>
                  </div>
                </div>
              </div>

              <div className={page("float-card", ["one"])} aria-hidden="true">
                <ShieldCheck size={15} aria-hidden="true" />
                ЕИС · пакет подписан
              </div>
              <div className={page("float-card", ["two"])} aria-hidden="true">
                <CheckCircle2 size={15} aria-hidden="true" />
                СМП · 25 %
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Цифры ────────────────────────────────────────────────────── */}
        <section className={page("numbers")} id="numbers" aria-label="Цифры">
          <Reveal className={page("numbers-grid")} variant="zoom">
            {METRICS.map((metric) => (
              <div className={page("metric")} key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ─── Возможности ──────────────────────────────────────────────── */}
        <section className={page("section")} id="features">
          <Reveal className={page("section-head")} variant="left">
            <p className={page("section-eyebrow")}>Возможности</p>
            <h2 className={page("section-title")}>
              Один контур вместо десяти таблиц
            </h2>
            <p className={page("section-lead")}>
              Каждый экран знает своё место в цепочке закупки. Данные
              подтягиваются из предыдущего шага, а проверки срабатывают до
              публикации, а не после замечаний.
            </p>
          </Reveal>

          <div className={page("features-grid")}>
            {FEATURES.map((feature, index) => (
              <Reveal
                className={page("feature-wrap")}
                key={feature.title}
                delay={index * 80}
                variant="zoom"
              >
                <article className={page("feature")}>
                  <span className={page("feature-icon")}>
                    <feature.Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className={page("feature-title")}>{feature.title}</h3>
                  <p className={page("feature-text")}>{feature.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ─── Процесс ──────────────────────────────────────────────────── */}
        <section className={page("section", ["alt"])} id="process">
          <Reveal className={page("section-head")} variant="right">
            <p className={page("section-eyebrow")}>Процесс</p>
            <h2 className={page("section-title")}>
              Шесть этапов — одна история
            </h2>
            <p className={page("section-lead")}>
              От потребности до отчёта по 158н. На каждом шаге видно, кто
              отвечает, какие сроки горят и что уже подписано в ЕИС.
            </p>
          </Reveal>

          <ol className={page("steps")}>
            {STEPS.map((step, index) => (
              // Этапы выезжают навстречу друг другу: чётные слева, нечётные
              // справа — цепочка читается как движение по маршруту закупки
              <Reveal
                className={page("step-wrap")}
                key={step.title}
                delay={index * 60}
                variant={index % 2 === 0 ? "left" : "right"}
              >
                <li className={page("step")}>
                  <span className={page("step-index")}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className={page("step-title")}>{step.title}</h3>
                  <p className={page("step-text")}>{step.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ─── Проверки ─────────────────────────────────────────────────── */}
        <section className={page("section")}>
          <div className={page("split")}>
            <Reveal className={page("split-copy")} variant="left">
              <p className={page("section-eyebrow")}>Контроль</p>
              <h2 className={page("section-title")}>
                Ошибки видны до публикации
              </h2>
              <p className={page("section-lead")}>
                Схемы, реестр НПА и правила 44-ФЗ проверяют карточку на месте.
                Вместо «после замечаний» — понятный список того, что осталось
                заполнить.
              </p>

              <ul className={page("checklist")}>
                {[
                  "Проверка ИКЗ, НМЦК и требований ст. 31",
                  "Контроль сроков публикации и оплаты",
                  "Готовые отчёты 158н, СМП и СОНКО",
                ].map((item) => (
                  <li className={page("checklist-item")} key={item}>
                    <Check size={15} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link className={page("text-link")} to="/ui-solutions">
                Посмотреть каталог UI-решений
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </Reveal>

            <Reveal className={page("audit")} delay={160} variant="right">
              <div className={page("audit-head")}>
                <span className={page("audit-icon")}>
                  <ShieldCheck size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>Проверка карточки</strong>
                  <span>извещение ЭА-142 · 44-ФЗ</span>
                </div>
              </div>

              <ul className={page("audit-list")}>
                {AUDIT_ROWS.map((row) => (
                  <li
                    className={page("audit-row", row.ok ? ["ok"] : ["warn"])}
                    key={row.text}
                  >
                    {row.ok ? (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={16} aria-hidden="true" />
                    )}
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>

              <div className={page("audit-foot")}>
                <span>Готовность 92 %</span>
                <span className={page("audit-bar")}>
                  <span />
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Контакты ─────────────────────────────────────────────────── */}
        <section className={page("section")} id="contacts">
          <Reveal className={page("cta")} variant="zoom">
            <div className={page("cta-copy")}>
              <p className={page("section-eyebrow")}>Начать</p>
              <h2 className={page("section-title")}>
                Готовы навести порядок в закупках?
              </h2>
              <p className={page("section-lead")}>
                Откройте рабочий стол с демонстрационными данными заказчика или
                напишите нам — покажем контур на вашем примере.
              </p>
            </div>

            <div className={page("cta-actions")}>
              <Link className={page("button", ["primary"])} to="/">
                Открыть систему
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                className={page("button")}
                href="mailto:info@csms.ru?subject=Визитка%20ЦСМС"
              >
                Написать нам
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className={page("footer")}>
        <div className={page("footer-brand")}>
          <span className={page("brand-mark", ["small"])} aria-hidden="true">
            Ц
          </span>
          <span>
            <strong>ЦСМС</strong> · контрактная служба заказчика
          </span>
        </div>

        <nav className={page("footer-nav")} aria-label="Ссылки в подвале">
          <a href="#top">Наверх</a>
          <a href="#features">Возможности</a>
          <Link to="/">В систему</Link>
        </nav>

        <span className={page("footer-note")}>
          © 2026 · демонстрационная визитка
        </span>
      </footer>
    </div>
  );
};

export default VisitCardPage;
