import { useEffect, useRef } from "react";
import styles from "./SidePolarCurves.module.scss";

/**
 * Декоративные полярные кривые по бокам от контента.
 *
 * Кривая r = exp(sin θ) − 2·cos(4θ) + sin⁵((2θ − π) / 24) рисуется по параметру
 * θ от 0 до 24π: на каждом кадре точки вычисляются заново, масштабируются под
 * размер полотна и центрируются. Правая и левая версии — зеркальные копии,
 * обе рисуются в одном requestAnimationFrame, поэтому синхронны по времени.
 *
 * Компонент чисто декоративный: canvas не принимает события мыши, не участвует
 * в потоке документа и не влияет на клики. При prefers-reduced-motion кривая
 * показывается целиком без анимации.
 */

const THETA_MAX = 24 * Math.PI;
// Точек на полную кривую: достаточно для плавной линии при ширине полотна
// до ~320 CSS-пикселей и высоком DPI.
const DRAW_SAMPLES = 2600;
// Отдельная, более частая выборка только для расчёта габаритов кривой.
const BOUNDS_SAMPLES = 8000;
const DRAW_DURATION_MS = 18_000;
const HOLD_DURATION_MS = 4_000;
const PADDING = 14;
const MAX_DPR = 2.5;

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface CanvasSurface {
  ctx: CanvasRenderingContext2D | null;
  width: number;
  height: number;
}

const polarPoint = (theta: number): Point => {
  const r =
    Math.exp(Math.sin(theta)) -
    2 * Math.cos(4 * theta) +
    Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5);

  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
};

const curveBounds = (): Bounds => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index <= BOUNDS_SAMPLES; index += 1) {
    const point = polarPoint((THETA_MAX * index) / BOUNDS_SAMPLES);
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const padX = Math.max((maxX - minX) * 0.06, 0.5);
  const padY = Math.max((maxY - minY) * 0.06, 0.5);

  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  };
};

const readThemeColor = (canvas: HTMLCanvasElement): string => {
  const style = window.getComputedStyle(canvas);
  const accent = style.getPropertyValue("--accent").trim();
  const secondary = style.getPropertyValue("--text-secondary").trim();

  return accent || secondary || "rgb(120, 150, 130)";
};

const prepareSurface = (canvas: HTMLCanvasElement): CanvasSurface => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, width, height };
};

export default function SidePolarCurves() {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const left = leftRef.current;
    const right = rightRef.current;

    if (!root || !left || !right) {
      return;
    }

    let leftSurface = prepareSurface(left);
    let rightSurface = prepareSurface(right);
    let bounds = curveBounds();
    let color = readThemeColor(left);
    let frameId = 0;
    let startedAt = 0;
    let disposed = false;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stopAnimation = () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const clearSurface = (surface: CanvasSurface) => {
      surface.ctx?.clearRect(0, 0, surface.width, surface.height);
    };

    const drawCurve = (
      surface: CanvasSurface,
      progress: number,
      mirrored: boolean,
    ) => {
      const { ctx, width, height } = surface;

      if (!ctx) {
        return;
      }

      const rangeX = Math.max(bounds.maxX - bounds.minX, 0.0001);
      const rangeY = Math.max(bounds.maxY - bounds.minY, 0.0001);
      const availableWidth = Math.max(1, width - PADDING * 2);
      const availableHeight = Math.max(1, height - PADDING * 2);
      const scale = Math.min(
        availableWidth / rangeX,
        availableHeight / rangeY,
      );
      const centerX =
        width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
      const centerY =
        height / 2 + ((bounds.minY + bounds.maxY) / 2) * scale;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowBlur = 7;
      ctx.shadowColor = color;

      const visibleSamples = Math.max(
        2,
        Math.ceil(DRAW_SAMPLES * Math.min(1, Math.max(0, progress))),
      );

      ctx.beginPath();

      for (let index = 0; index <= visibleSamples; index += 1) {
        const theta = (THETA_MAX * index) / DRAW_SAMPLES;
        const point = polarPoint(theta);
        const screenX = centerX + point.x * scale;
        const screenY = centerY - point.y * scale;
        const x = mirrored ? width - screenX : screenX;

        if (index === 0) {
          ctx.moveTo(x, screenY);
        } else {
          ctx.lineTo(x, screenY);
        }
      }

      ctx.stroke();
      ctx.restore();
    };

    const drawFrame = (progress: number) => {
      drawCurve(leftSurface, progress, true);
      drawCurve(rightSurface, progress, false);
    };

    const tick = (now: number) => {
      if (disposed) {
        return;
      }

      const cycle = DRAW_DURATION_MS + HOLD_DURATION_MS;
      const elapsed = now - startedAt;

      if (elapsed >= cycle) {
        startedAt = now;
      }

      const localElapsed = now - startedAt;
      drawFrame(Math.min(1, localElapsed / DRAW_DURATION_MS));
      frameId = requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      stopAnimation();

      if (motionQuery.matches) {
        drawFrame(1);
        return;
      }

      startedAt = performance.now();
      frameId = requestAnimationFrame(tick);
    };

    const handleResize = () => {
      if (disposed) {
        return;
      }

      leftSurface = prepareSurface(left);
      rightSurface = prepareSurface(right);
      bounds = curveBounds();
      color = readThemeColor(left);
      startAnimation();
    };

    const handleMotionChange = () => {
      startAnimation();
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleResize);
    resizeObserver?.observe(left);
    resizeObserver?.observe(right);

    const themeObserver = new MutationObserver(() => {
      color = readThemeColor(left);
      if (motionQuery.matches) {
        drawFrame(1);
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    motionQuery.addEventListener?.("change", handleMotionChange);

    startAnimation();

    return () => {
      disposed = true;
      stopAnimation();
      resizeObserver?.disconnect();
      themeObserver.disconnect();
      motionQuery.removeEventListener?.("change", handleMotionChange);
      clearSurface(leftSurface);
      clearSurface(rightSurface);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <canvas ref={leftRef} className={styles.canvas} />
      <canvas ref={rightRef} className={styles.canvas} />
    </div>
  );
}
