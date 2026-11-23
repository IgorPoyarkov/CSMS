import useUtils from "../../hooks/useUtils";
import { asset } from "../utils/asset";
import NeonMark3D from "./NeonMark3D";
import styles from "./BrandPage.module.scss";

/**
 * Фирменный знак КСЗ: живая витрина брендбука.
 *
 * Файлы лежат в `public/brand`: SVG масштабируются без потерь, PNG — с
 * прозрачностью для писем и документов. Страница показывает варианты на
 * светлом и тёмном фоне, шкалу размеров и правила — чтобы знак применяли
 * одинаково, а не пересобирали «на глаз» в каждом новом экране.
 */

const PALETTE = [
  { hex: "#051F20", name: "Основной", role: "текст, плитка" },
  { hex: "#163832", name: "Глубокий", role: "фон, градиент" },
  { hex: "#235347", name: "Акцент", role: "вторичный текст" },
  { hex: "#8EB69B", name: "Шалфей", role: "полка знака" },
  { hex: "#DAF1DE", name: "Мята", role: "монограмма" },
  { hex: "#FFFFFF", name: "Бумага", role: "светлый фон" },
];

const MODERN_PALETTE = [
  { hex: "#070B14", name: "Void", role: "фон страницы" },
  { hex: "#0D1524", name: "Abyss", role: "панели" },
  { hex: "#16233A", name: "Slate", role: "вложенные блоки" },
  { hex: "#1D2D49", name: "Glass", role: "стекло" },
  { hex: "#22D3EE", name: "Cyan", role: "акцент, голова кометы" },
  { hex: "#7C8CFF", name: "Indigo", role: "неоновое пятно" },
  { hex: "#F472B6", name: "Magenta", role: "хвост кометы" },
  { hex: "#E8F0FF", name: "Paper", role: "основной текст" },
  { hex: "#A8B8D0", name: "Mist", role: "вторичный текст" },
];

const MARKS = [
  { file: "csms-mark-modern.svg", label: "Неон · основной", dark: true },
  {
    file: "csms-mark-modern-mono-black.svg",
    label: "Неон · моно чёрный",
    dark: false,
  },
  {
    file: "csms-mark-modern-mono-white.svg",
    label: "Неон · моно белый",
    dark: true,
  },
  { file: "csms-mark.svg", label: "Классика · цветной", dark: false },
  { file: "csms-mark-dark.svg", label: "Классика · тёмный фон", dark: true },
  {
    file: "csms-mark-mono-black.svg",
    label: "Классика · моно чёрный",
    dark: false,
  },
  {
    file: "csms-mark-mono-white.svg",
    label: "Классика · моно белый",
    dark: true,
  },
];

const DOWNLOADS = [
  {
    file: "csms-logo-horizontal-modern.svg",
    label: "Основной логотип, неон",
  },
  { file: "csms-mark-modern.svg", label: "Основной знак, неон" },
  {
    file: "csms-logo-horizontal-modern-mono-black.svg",
    label: "Неон, логотип · моно чёрный",
  },
  {
    file: "csms-logo-horizontal-modern-mono-white.svg",
    label: "Неон, логотип · моно белый",
  },
  {
    file: "csms-logo-stacked-modern.svg",
    label: "Неон, вертикальная компоновка",
  },
  {
    file: "csms-logo-owner-modern.svg",
    label: "Неон, для документов с реквизитами",
  },
  {
    file: "csms-mark-modern-mono-black.svg",
    label: "Неон, знак · моно чёрный",
  },
  {
    file: "csms-mark-modern-mono-white.svg",
    label: "Неон, знак · моно белый",
  },
  { file: "csms-logo-horizontal.svg", label: "Классика, светлый фон" },
  {
    file: "csms-logo-horizontal-inverse.svg",
    label: "Классика, тёмный фон",
  },
  {
    file: "csms-logo-horizontal-mono-black.svg",
    label: "Классика, моно чёрный",
  },
  {
    file: "csms-logo-horizontal-mono-white.svg",
    label: "Классика, моно белый",
  },
  { file: "csms-logo-stacked.svg", label: "Классика, вертикальная" },
  { file: "csms-logo-owner.svg", label: "Классика, с реквизитами" },
  { file: "csms-mark.svg", label: "Классика, знак цветной" },
  { file: "csms-mark-dark.svg", label: "Классика, знак на тёмном" },
];

export default function BrandPage() {
  const { bem } = useUtils();
  const block = bem(styles, "brand-page");

  return (
    <main className={block()}>
      <header className={block("header")}>
        <h1 className={block("title")}>Фирменный знак</h1>
        <p className={block("subtitle")}>
          Система управления контрактной службой заказчика. Аббревиатура{" "}
          <strong>КСЗ</strong> — Контрактная Служба Заказчика. Знак: строгая «К»
          в плитке — контракт; верхняя полка читается как лист документа и
          строка регламента, нижняя ножка — как скрепление дела. Без мелких
          деталей: знак работает от 16 px.
        </p>
        <p className={block("subtitle")}>
          <strong>Основной вариант — неоновый:</strong> стеклянная плитка на
          ночном индиго-графите, контур циан → индиго → магента и мягкое
          свечение. Он используется в интерфейсе и шапке системы. Классический
          зелёный комплект сохранён для печати и документов, где свечение
          недопустимо.
        </p>
        <p className={block("owner")}>Владелец: ИП · ИНН 462302564694</p>
      </header>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Основной логотип — неон
          <span className={block("badge-primary")}>основной</span>
        </h2>
        <div className={block("grid", ["two"])}>
          <article className={block("card", ["neon", "hero"])}>
            <span className={block("caption")}>3D-знак · наведите курсор</span>
            <NeonMark3D size={132} label="КСЗ — основной фирменный знак" />
            <p className={block("hint")}>
              Плитка наклоняется за курсором, свечение дышит, блик скользит по
              грани. Слои разнесены по глубине, поэтому знак читается объёмным.
              При <code>prefers-reduced-motion</code> движение отключается.
            </p>
          </article>
          <article className={block("card", ["neon"])}>
            <span className={block("caption")}>
              Горизонтальный логотип · основной
            </span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-horizontal-modern.svg")}
              alt="КСЗ — основной неоновый логотип"
              width={470}
            />
            <div className={block("hero-row")}>
              <span className={block("hero-chip")}>
                <img
                  src={asset("/brand/csms-mark-modern.svg")}
                  alt=""
                  width={40}
                  height={40}
                />
              </span>
              <span className={block("hero-chip", ["light"])}>
                <img
                  src={asset("/brand/csms-mark-modern-mono-black.svg")}
                  alt="КСЗ — неоновый знак, монохром чёрный"
                  width={40}
                  height={40}
                />
              </span>
              <span className={block("hero-chip")}>
                <img
                  src={asset("/brand/csms-mark-modern-mono-white.svg")}
                  alt="КСЗ — неоновый знак, монохром белый"
                  width={40}
                  height={40}
                />
              </span>
              <span className={block("hero-note")}>
                Цвет · моно ч/б для печати
              </span>
            </div>
          </article>
          <article className={block("card", ["neon", "center"])}>
            <span className={block("caption")}>Вертикальная компоновка</span>
            <img
              className={block("logo", ["stacked"])}
              src={asset("/brand/csms-logo-stacked-modern.svg")}
              alt="КСЗ — неоновый вертикальный логотип"
              width={270}
            />
          </article>
          <article className={block("card", ["neon"])}>
            <span className={block("caption")}>
              Для документов · с владельцем
            </span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-owner-modern.svg")}
              alt="КСЗ — неоновый логотип с реквизитами владельца"
              width={470}
            />
          </article>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Классический комплект
          <span className={block("badge-muted")}>для печати</span>
        </h2>
        <div className={block("grid", ["two"])}>
          <article className={block("card")}>
            <span className={block("caption")}>Цвет · светлый фон</span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-horizontal.svg")}
              alt="КСЗ — цветной логотип"
              width={470}
            />
          </article>
          <article className={block("card")}>
            <span className={block("caption")}>Монохром · светлый фон</span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-horizontal-mono-black.svg")}
              alt="КСЗ — монохромный логотип"
              width={470}
            />
          </article>
          <article className={block("card", ["dark"])}>
            <span className={block("caption")}>Инверсия · тёмный фон</span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-horizontal-inverse.svg")}
              alt="КСЗ — инверсный логотип"
              width={470}
            />
          </article>
          <article className={block("card", ["dark"])}>
            <span className={block("caption")}>
              Монохром белый · тёмный фон
            </span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-horizontal-mono-white.svg")}
              alt="КСЗ — белый монохромный логотип"
              width={470}
            />
          </article>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Вертикальная компоновка и документы
        </h2>
        <div className={block("grid", ["two"])}>
          <article className={block("card", ["center"])}>
            <span className={block("caption")}>Знак сверху</span>
            <img
              className={block("logo", ["stacked"])}
              src={asset("/brand/csms-logo-stacked.svg")}
              alt="КСЗ — вертикальный логотип"
              width={270}
            />
          </article>
          <article className={block("card")}>
            <span className={block("caption")}>
              Для документов · с владельцем
            </span>
            <img
              className={block("logo")}
              src={asset("/brand/csms-logo-owner.svg")}
              alt="КСЗ — логотип с реквизитами владельца"
              width={470}
            />
          </article>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Знак и масштабирование</h2>
        <div className={block("grid", ["two"])}>
          <article className={block("card")}>
            <span className={block("caption")}>Варианты знака</span>
            <div className={block("marks")}>
              {MARKS.map((mark) => (
                <figure
                  key={mark.file}
                  className={block("mark", mark.dark ? ["dark"] : [])}
                >
                  <img
                    src={asset(`/brand/${mark.file}`)}
                    alt={`КСЗ — ${mark.label}`}
                    width={64}
                    height={64}
                  />
                  <figcaption>{mark.label}</figcaption>
                </figure>
              ))}
            </div>
          </article>
          <article className={block("card")}>
            <span className={block("caption")}>Шкала размеров</span>
            <div className={block("scale")}>
              {[64, 48, 32, 24, 16].map((size) => (
                <figure key={size} className={block("scale-item")}>
                  <img
                    src={asset("/brand/csms-mark.svg")}
                    alt=""
                    width={size}
                    height={size}
                  />
                  <figcaption>{size} px</figcaption>
                </figure>
              ))}
            </div>
            <p className={block("hint")}>
              Минимальный размер знака — 16 px, горизонтального логотипа — 120
              px по ширине. Меньше — только знак.
            </p>
          </article>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Палитра</h2>
        <div className={block("palette")}>
          {PALETTE.map((color) => (
            <div key={color.hex} className={block("swatch")}>
              <span
                className={block("swatch-color")}
                style={{ background: color.hex }}
                aria-hidden="true"
              />
              <span className={block("swatch-hex")}>{color.hex}</span>
              <span className={block("swatch-name")}>
                {color.name} · {color.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Тема «Современные закупки»</h2>
        <div className={block("modern")}>
          <div className={block("modern-head")}>
            <span className={block("modern-badge")}>data-theme="modern"</span>
            <p className={block("modern-lead")}>
              Ночной индиго-графит, неоновый циан, индиго и магента. Панели
              выглядят стеклянными: блик по верхней грани и тень внутри рамки;
              по контуру больших блоков бежит комета, короткие списки слегка
              расходятся за курсором. Всё движение отключается при
              prefers-reduced-motion.
            </p>
          </div>

          <div className={block("modern-logo")}>
            <img
              className={block("modern-logo-img")}
              src={asset("/brand/csms-logo-horizontal-modern.svg")}
              alt="КСЗ — логотип в теме «Современные закупки»"
            />
            <img
              className={block("modern-logo-mark")}
              src={asset("/brand/csms-mark-modern.svg")}
              alt="КСЗ — знак в теме «Современные закупки»"
              width={64}
              height={64}
            />
          </div>

          <div className={block("modern-palette")}>
            {MODERN_PALETTE.map((color) => (
              <div key={color.hex} className={block("modern-swatch")}>
                <span
                  className={block("modern-swatch-color")}
                  style={{ background: color.hex }}
                  aria-hidden="true"
                />
                <span className={block("modern-swatch-hex")}>{color.hex}</span>
                <span className={block("modern-swatch-name")}>
                  {color.name} · {color.role}
                </span>
              </div>
            ))}
          </div>

          <div className={block("modern-effects")}>
            <article className={block("fx", ["neon"])}>
              <b>Неоновая кромка</b>
              <p>
                На наведении по краям загорается циан: тонкая линия внутри
                периметра и ореол над верхней гранью. Блок при этом не
                смещается.
              </p>
              <span className={block("fx-tag")}>box-shadow · inset</span>
            </article>

            <article className={block("fx", ["comet"])}>
              <b>Комета по контуру</b>
              <p>
                По периметру больших блоков бежит искра с хвостом: голова —
                циан, хвост — магента. Свечение дышит, но не гаснет полностью.
              </p>
              <span className={block("fx-tag")}>
                conic-gradient · @property
              </span>
            </article>

            <article className={block("fx", ["glass"])}>
              <b>Стеклянная панель</b>
              <p>
                Полупрозрачная подложка с бликом по верхней грани: фон
                просвечивает, но текст и цифры остаются читаемыми.
              </p>
              <span className={block("fx-tag")}>
                linear-gradient · backdrop
              </span>
            </article>

            <article className={block("fx", ["magnet"])}>
              <b>Магнитное расхождение</b>
              <p>
                Короткие списки и чипы отходят за курсором на 12% своего размера
                и плавно возвращаются на место.
              </p>
              <div className={block("magnet-chips")}>
                <span className={block("chip")}>Чип</span>
                <span className={block("chip")}>Таб</span>
                <span className={block("chip")}>Пункт</span>
              </div>
              <span className={block("fx-tag")}>transform · 240 ms</span>
            </article>
          </div>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Правила</h2>
        <div className={block("grid", ["three"])}>
          <article className={block("rule")}>
            <b>Охранное поле</b>
            <p>
              Свободное поле вокруг логотипа — не меньше высоты знака. Ничего не
              размещаем ближе.
            </p>
          </article>
          <article className={block("rule")}>
            <b>Фон</b>
            <p>
              На светлом — цветной или чёрный монохром, на тёмном — инверсия или
              белый. На фотографиях — только монохром.
            </p>
          </article>
          <article className={block("rule")}>
            <b>Что нельзя</b>
            <p>
              Менять пропорции, перекрашивать вне палитры, добавлять тени,
              обводки и градиенты на текст.
            </p>
          </article>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Файлы</h2>
        <div className={block("downloads")}>
          {DOWNLOADS.map((item) => (
            <a
              key={item.file}
              className={block("download")}
              href={asset(`/brand/${item.file}`)}
              download
            >
              {item.label}
              <span className={block("download-kind")}>SVG</span>
            </a>
          ))}
          <a
            className={block("download")}
            href={asset("/brand/README.md")}
            target="_blank"
            rel="noreferrer"
          >
            Брендбук: состав, палитра, правила
            <span className={block("download-kind")}>MD</span>
          </a>
        </div>
        <p className={block("hint")}>
          PNG с прозрачностью — в папке <code>public/brand/png</code>: знаки
          512×512 и логотипы в 2×.
        </p>
      </section>
    </main>
  );
}
