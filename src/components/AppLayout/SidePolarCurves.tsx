import { useEffect, useRef } from "react";
import styles from "./SidePolarCurves.module.scss";

/**
 * Декоративные полярные кривые по бокам от контента.
 *
 * Кривая r = exp(sin θ) − 2·cos(4θ) + sin⁵((2θ − π) / 24) на θ ∈ [0, 24π]
 * рисуется целиком приглушённым контуром, а по ней бегут шесть световых
 * сегментов с хвостами. Сегменты распределены по контуру равномерно и
 * движутся с одинаковой скоростью: точки кривой заранее пересемплированы
 * по длине дуги, поэтому свет не «дёргается» на крутых участках.
 *
 * Правая и левая версии — зеркальные копии, обе рисуются в одном
 * requestAnimationFrame, поэтому синхронны по времени.
 *
 * Компонент чисто декоративный: canvas не принимает события мыши, не участвует
 * в потоке документа и не влияет на клики. При prefers-reduced-motion сегменты
 * показываются неподвижно.
 */

const THETA_MAX = 24 * Math.PI;
// Плотная выборка нужна только для пересемплирования по длине дуги.
const DENSE_SAMPLES = 6000;
// Равномерные по длине дуги точки контура: по ним строятся путь и сегменты.
const ARC_SAMPLES = 1800;
// Отдельная, более частая выборка только для расчёта габаритов кривой.
const BOUNDS_SAMPLES = 8000;
// Полный оборот световых сегментов по контуру.
const SEGMENT_CYCLE_MS = 16_000;
const SEGMENT_COUNT = 6;
// Длина хвоста сегмента как доля длины контура.
const SEGMENT_TAIL = 0.055;
// Хвост рисуется несколькими кусками с нарастающей яркостью.
const SEGMENT_CHUNKS = 8;
const PADDING = 14;
const MAX_DPR = 2.5;
const BASE_ALPHA = 0.13;
const HEAD_RADIUS = 1.7;

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

interface SurfaceGeometry {
  path: Path2D;
  // Точки контура в экранных координатах, равномерные по длине дуги.
  points: Point[];
}

const polarPoint = (theta: number): Point => {
  const r =
    Math.exp(Math.sin(theta)) -
    2 * Math.cos(4 * theta) +
    Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5);

  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
};

// Габариты кривой не зависят от размера полотна — считаем один раз.
let boundsCache: Bounds | null = null;
// Точки, равномерные по длине дуги, тоже не зависят от размера полотна.
let arcCache: Point[] | null = null;

const curveBounds = (): Bounds => {
  if (boundsCache) {
    return boundsCache;
  }

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

  boundsCache = {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  };

  return boundsCache;
};

/**
 * Пересемплирование кривой по длине дуги: световые сегменты движутся с
 * постоянной скоростью и не ускоряются на участках, где параметр θ меняется
 * быстро. Кривая замкнута (θ = 0 и θ = 24π дают одну точку), поэтому стык
 * при зацикливании незаметен.
 */
const arcPoints = (): Point[] => {
  if (arcCache) {
    return arcCache;
  }

  const dense: Point[] = [];
  const cumulative: number[] = [0];
  let previous = polarPoint(0);
  dense.push(previous);

  for (let index = 1; index <= DENSE_SAMPLES; index += 1) {
    const point = polarPoint((THETA_MAX * index) / DENSE_SAMPLES);
    cumulative.push(
      cumulative[index - 1] +
        Math.hypot(point.x - previous.x, point.y - previous.y),
    );
    dense.push(point);
    previous = point;
  }

  const totalLength = cumulative[DENSE_SAMPLES];
  const result: Point[] = [];
  let cursor = 0;

  for (let index = 0; index <= ARC_SAMPLES; index += 1) {
    const target = (totalLength * index) / ARC_SAMPLES;

    while (cursor < DENSE_SAMPLES - 1 && cumulative[cursor + 1] < target) {
      cursor += 1;
    }

    const segmentLength = cumulative[cursor + 1] - cumulative[cursor];
    const ratio =
      segmentLength > 0 ? (target - cumulative[cursor]) / segmentLength : 0;
    const start = dense[cursor];
    const end = dense[cursor + 1];

    result.push({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    });
  }

  arcCache = result;

  return result;
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

const buildGeometry = (
  surface: CanvasSurface,
  mirrored: boolean,
): SurfaceGeometry => {
  const bounds = curveBounds();
  const rangeX = Math.max(bounds.maxX - bounds.minX, 0.0001);
  const rangeY = Math.max(bounds.maxY - bounds.minY, 0.0001);
  const availableWidth = Math.max(1, surface.width - PADDING * 2);
  const availableHeight = Math.max(1, surface.height - PADDING * 2);
  const scale = Math.min(availableWidth / rangeX, availableHeight / rangeY);
  const centerX = surface.width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const centerY =
    surface.height / 2 + ((bounds.minY + bounds.maxY) / 2) * scale;

  const points = arcPoints().map((point) => {
    const screenX = centerX + point.x * scale;

    return {
      x: mirrored ? surface.width - screenX : screenX,
      y: centerY - point.y * scale,
    };
  });

  const path = new Path2D();

  points.forEach((point, index) => {
    if (index === 0) {
      path.moveTo(point.x, point.y);
    } else {
      path.lineTo(point.x, point.y);
    }
  });

  return { path, points };
};

/**
 * Точка контура по дробной позиции в массиве точек с зацикливанием:
 * позиция за пределами массива (хвост сегмента у начала координат)
 * переходит на противоположный конец контура.
 */
const sampleAt = (points: Point[], position: number): Point => {
  const total = points.length;
  let wrapped = position % total;

  if (wrapped < 0) {
    wrapped += total;
  }

  const first = Math.floor(wrapped);
  const second = (first + 1) % total;
  const ratio = wrapped - first;
  const start = points[first];
  const end = points[second];

  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
};

const strokeChunk = (
  ctx: CanvasRenderingContext2D,
  points: Point[],
  startPosition: number,
  endPosition: number,
) => {
  const span = endPosition - startPosition;
  const steps = Math.max(2, Math.min(40, Math.ceil(Math.abs(span) / 2)));

  ctx.beginPath();

  for (let step = 0; step <= steps; step += 1) {
    const point = sampleAt(points, startPosition + (span * step) / steps);

    if (step === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
};

const drawBaseCurve = (
  surface: CanvasSurface,
  geometry: SurfaceGeometry,
  color: string,
) => {
  const { ctx } = surface;

  if (!ctx) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = BASE_ALPHA;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(geometry.path);
  ctx.restore();
};

const drawSegments = (
  surface: CanvasSurface,
  geometry: SurfaceGeometry,
  phase: number,
  color: string,
) => {
  const { ctx } = surface;
  const points = geometry.points;

  if (!ctx || points.length < 2) {
    return;
  }

  const lastIndex = points.length - 1;
  const tailLength = Math.max(6, Math.round(points.length * SEGMENT_TAIL));

  for (let index = 0; index < SEGMENT_COUNT; index += 1) {
    const fraction = (phase + index / SEGMENT_COUNT) % 1;
    const head = fraction * lastIndex;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let chunk = 0; chunk < SEGMENT_CHUNKS; chunk += 1) {
      const from = chunk / SEGMENT_CHUNKS;
      const to = (chunk + 1) / SEGMENT_CHUNKS;
      const startPosition = head - tailLength * (1 - from);
      const endPosition = head - tailLength * (1 - to);

      strokeChunk(ctx, points, startPosition, endPosition);

      // Чем ближе кусок к голове, тем он ярче и толще — эффект хвоста кометы.
      ctx.globalAlpha = 0.08 + 0.72 * to * to;
      ctx.lineWidth = 0.8 + 1.7 * to;
      ctx.stroke();
    }

    const headPoint = sampleAt(points, head);

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(headPoint.x, headPoint.y, HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const drawScene = (
  surface: CanvasSurface,
  geometry: SurfaceGeometry,
  phase: number,
  color: string,
) => {
  const { ctx, width, height } = surface;

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, width, height);
  drawBaseCurve(surface, geometry, color);
  drawSegments(surface, geometry, phase, color);
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
    let leftGeometry = buildGeometry(leftSurface, true);
    let rightGeometry = buildGeometry(rightSurface, false);
    let color = readThemeColor(left);
    let frameId = 0;
    let startedAt = performance.now();
    let disposed = false;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stopAnimation = () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const renderFrame = (phase: number) => {
      drawScene(leftSurface, leftGeometry, phase, color);
      drawScene(rightSurface, rightGeometry, phase, color);
    };

    const tick = (now: number) => {
      if (disposed) {
        return;
      }

      renderFrame(((now - startedAt) / SEGMENT_CYCLE_MS) % 1);
      frameId = requestAnimationFrame(tick);
    };

    const startAnimation = (resetPhase: boolean) => {
      stopAnimation();

      if (motionQuery.matches) {
        // Без анимации показываем сегменты в фиксированных позициях.
        renderFrame(0);
        return;
      }

      if (resetPhase) {
        startedAt = performance.now();
      }

      frameId = requestAnimationFrame(tick);
    };

    const handleResize = () => {
      if (disposed) {
        return;
      }

      leftSurface = prepareSurface(left);
      rightSurface = prepareSurface(right);
      leftGeometry = buildGeometry(leftSurface, true);
      rightGeometry = buildGeometry(rightSurface, false);
      color = readThemeColor(left);
      // Фазу не сбрасываем, чтобы при изменении размера свет не «прыгал».
      startAnimation(false);
    };

    const handleMotionChange = () => {
      startAnimation(true);
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
        renderFrame(0);
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    motionQuery.addEventListener?.("change", handleMotionChange);

    startAnimation(true);

    return () => {
      disposed = true;
      stopAnimation();
      resizeObserver?.disconnect();
      themeObserver.disconnect();
      motionQuery.removeEventListener?.("change", handleMotionChange);
      leftSurface.ctx?.clearRect(0, 0, leftSurface.width, leftSurface.height);
      rightSurface.ctx?.clearRect(
        0,
        0,
        rightSurface.width,
        rightSurface.height,
      );
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <canvas ref={leftRef} className={styles.canvas} />
      <canvas ref={rightRef} className={styles.canvas} />
    </div>
  );
}
