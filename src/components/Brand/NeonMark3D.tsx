import { useRef, type CSSProperties, type PointerEvent } from "react";
import useUtils from "../../hooks/useUtils";
import { asset } from "../utils/asset";
import styles from "./NeonMark3D.module.scss";

interface NeonMark3DProps {
  /** Сторона знака в пикселях: 36 в шапке, 96–128 на витрине. */
  size?: number;
  /** compact — шапка: меньше амплитуда наклона и мягче свечение. */
  variant?: "hero" | "compact";
  className?: string;
  /** Подпись для скринридеров: сам SVG декоративный слой. */
  label?: string;
}

// Предел наклона по каждой оси. В шапке знак маленький — большой угол
// выглядел бы как «болтающаяся иконка», поэтому амплитуда вдвое меньше.
const TILT_LIMIT = { hero: 18, compact: 9 } as const;

/**
 * Знак КСЗ в 3D: стеклянная плитка наклоняется за курсором, свечение дышит,
 * блик скользит по грани. Слои разнесены по оси Z (тень ниже, блик выше),
 * поэтому при наклоне видна глубина, а не просто повёрнутая картинка.
 *
 * `prefers-reduced-motion` отключает только автоматическое движение
 * (парение и дыхание свечения). Реакция на наведение остаётся: это отклик на
 * действие пользователя, а не самопроизвольная анимация. Плюс в CSS есть
 * hover-фолбэк, если браузер не присылает pointermove.
 */
export default function NeonMark3D({
  size = 96,
  variant = "hero",
  className,
  label = "КСЗ — фирменный знак",
}: NeonMark3DProps) {
  const { bem } = useUtils();
  const block = bem(styles, "neon-mark3d");
  const tiltRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // На тач-экранах pointermove приходит при прокрутке — наклон не нужен
    if (event.pointerType !== "mouse") return;

    const node = tiltRef.current;
    if (!node) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    const limit = TILT_LIMIT[variant];

    node.style.setProperty("--tilt-y", `${(dx * limit * 2).toFixed(2)}deg`);
    node.style.setProperty("--tilt-x", `${(-dy * limit * 2).toFixed(2)}deg`);
    node.style.setProperty("--glare-x", `${((dx + 0.5) * 100).toFixed(1)}%`);
    node.style.setProperty("--glare-y", `${((dy + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    const node = tiltRef.current;
    if (!node) return;

    // Снимаем инлайн-переменные, а не обнуляем их: иначе после первого
    // наведения inline-значения перебивали бы CSS hover-фолбэк и повторный
    // вход курсором без движения мыши оставлял знак плоским.
    node.style.removeProperty("--tilt-x");
    node.style.removeProperty("--tilt-y");
    node.style.removeProperty("--glare-x");
    node.style.removeProperty("--glare-y");
  };

  return (
    <span
      className={[
        block("", variant === "compact" ? ["compact"] : []),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--mark-size": `${size}px` } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <span className={block("stage")}>
        <span className={block("float")}>
          <span className={block("tilt")} ref={tiltRef}>
            <span className={block("halo")} aria-hidden="true" />
            <img
              className={block("shadow")}
              src={asset("/brand/csms-mark-modern.svg")}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <img
              className={block("face")}
              src={asset("/brand/csms-mark-modern.svg")}
              alt={label}
              width={size}
              height={size}
              draggable={false}
            />
            <span className={block("glare")} aria-hidden="true" />
          </span>
        </span>
      </span>
    </span>
  );
}
