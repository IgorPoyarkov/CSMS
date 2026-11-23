import useUtils from "../../hooks/useUtils";
import { asset } from "../utils/asset";
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

const MARKS = [
  { file: "csms-mark.svg", label: "Цветной", dark: false },
  { file: "csms-mark-dark.svg", label: "Для тёмного фона", dark: true },
  { file: "csms-mark-mono-black.svg", label: "Монохром чёрный", dark: false },
  { file: "csms-mark-mono-white.svg", label: "Монохром белый", dark: true },
];

const DOWNLOADS = [
  { file: "csms-logo-horizontal.svg", label: "Логотип, светлый фон" },
  { file: "csms-logo-horizontal-inverse.svg", label: "Логотип, тёмный фон" },
  { file: "csms-logo-horizontal-mono-black.svg", label: "Логотип, моно чёрный" },
  { file: "csms-logo-horizontal-mono-white.svg", label: "Логотип, моно белый" },
  { file: "csms-logo-stacked.svg", label: "Вертикальная компоновка" },
  { file: "csms-logo-owner.svg", label: "Для документов, с реквизитами" },
  { file: "csms-mark.svg", label: "Знак, цветной" },
  { file: "csms-mark-dark.svg", label: "Знак, тёмный фон" },
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
          <strong>КСЗ</strong> — Контрактная Служба Заказчика. Знак: строгая
          «К» в плитке — контракт; верхняя полка читается как лист документа и
          строка регламента, нижняя ножка — как скрепление дела. Без мелких
          деталей: знак работает от 16 px.
        </p>
        <p className={block("owner")}>
          Владелец: ИП · ИНН 462302564694
        </p>
      </header>

      <section className={block("section")}>
        <h2 className={block("section-title")}>Основной логотип</h2>
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
            <span className={block("caption")}>Монохром белый · тёмный фон</span>
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
        <h2 className={block("section-title")}>Вертикальная компоновка и документы</h2>
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
            <span className={block("caption")}>Для документов · с владельцем</span>
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
              Минимальный размер знака — 16 px, горизонтального логотипа —
              120 px по ширине. Меньше — только знак.
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
        <h2 className={block("section-title")}>Правила</h2>
        <div className={block("grid", ["three"])}>
          <article className={block("rule")}>
            <b>Охранное поле</b>
            <p>
              Свободное поле вокруг логотипа — не меньше высоты знака. Ничего
              не размещаем ближе.
            </p>
          </article>
          <article className={block("rule")}>
            <b>Фон</b>
            <p>
              На светлом — цветной или чёрный монохром, на тёмном — инверсия
              или белый. На фотографиях — только монохром.
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
          PNG с прозрачностью — в папке{" "}
          <code>public/brand/png</code>: знаки 512×512 и логотипы в 2×.
        </p>
      </section>
    </main>
  );
}
