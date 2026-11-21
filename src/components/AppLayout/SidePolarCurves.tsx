import { useEffect, useRef } from "react";
import styles from "./SidePolarCurves.module.scss";

/**
 * Декоративные полярные кривые по бокам от контента.
 *
 * Кривая r = exp(sin θ) − 2·cos(4θ) + sin⁵((2θ − π) / 24) на θ ∈ [0, 24π]
 * рисуется целиком приглушённым контуром, а по ней летят светящиеся точки
 * с короткими хвостами — как кометы. Каждая летит со своей скоростью,
 * поэтому со временем они перестраиваются. Точки кривой заранее
 * пересемплированы по длине дуги, поэтому свет не «дёргается» на крутых
 * участках.
 *
 * Правая и левая версии — зеркальные копии, обе рисуются в одном
 * requestAnimationFrame, поэтому синхронны по времени.
 *
 * Компонент чисто декоративный: canvas не принимает события мыши, не участвует
 * в потоке документа и не влияет на клики.
 */

const THETA_MAX = 24 * Math.PI;
// Плотная выборка нужна только для пересемплирования по длине дуги.
const DENSE_SAMPLES = 6000;
// Равномерные по длине дуги точки контура: по ним строятся путь и сегменты.
const ARC_SAMPLES = 1800;
// Отдельная, более частая выборка только для расчёта габаритов кривой.
const BOUNDS_SAMPLES = 8000;
// Базовое время полного оборота кометы по контуру.
const COMET_CYCLE_MS = 16_000;
// Сколько комет летит по контуру одновременно.
const COMET_COUNT = 36;
// Хвост рисуется несколькими кусками с нарастающей яркостью.
const COMET_CHUNKS = 5;
const PADDING = 14;
const MAX_DPR = 2.5;
const BASE_ALPHA = 0.13;

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

interface Comet {
  // Начальное смещение по контуру, 0..1.
  offset: number;
  // Множитель скорости: кометы летят с разной скоростью.
  speed: number;
  // Длина хвоста как доля длины контура.
  tail: number;
  // Радиус головы в CSS-пикселях.
  radius: number;
}

// Детерминированный «разброс» без Math.random: произведения на золотое
// сечение и √2 дают равномерную, но не регулярную последовательность.
const COMETS: Comet[] = Array.from({ length: COMET_COUNT }, (_, index) => {
  const spread = (index * 0.6180339887498949) % 1;
  const jitter = (index * 0.4142135623730951) % 1;

  return {
    offset: index / COMET_COUNT,
    speed: 0.75 + spread * 0.55,
    tail: 0.012 + jitter * 0.022,
    radius: 1.1 + jitter * 0.9,
  };
});

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

const drawComets = (
  surface: CanvasSurface,
  geometry: SurfaceGeometry,
  elapsed: number,
  color: string,
) => {
  const { ctx } = surface;
  const points = geometry.points;

  if (!ctx || points.length < 2) {
    return;
  }

  const lastIndex = points.length - 1;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  COMETS.forEach((comet) => {
    // У каждой кометы своя скорость, поэтому строй со временем перестраивается.
    const fraction =
      ((elapsed / COMET_CYCLE_MS) * comet.speed + comet.offset) % 1;
    const head = fraction * lastIndex;
    const tailLength = Math.max(4, Math.round(points.length * comet.tail));

    for (let chunk = 0; chunk < COMET_CHUNKS; chunk += 1) {
      const from = chunk / COMET_CHUNKS;
      const to = (chunk + 1) / COMET_CHUNKS;

      strokeChunk(
        ctx,
        points,
        head - tailLength * (1 - from),
        head - tailLength * (1 - to),
      );

      // Чем ближе кусок к голове, тем он ярче и толще — хвост кометы.
      ctx.globalAlpha = 0.1 + 0.7 * to * to;
      ctx.lineWidth = 0.7 + 1.2 * to;
      ctx.stroke();
    }

    const headPoint = sampleAt(points, head);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(headPoint.x, headPoint.y, comet.radius, 0, Math.PI * 2);
    ctx.fill();
    // Свечение нужно только голове, дальше рисуем обычные штрихи.
    ctx.shadowBlur = 0;
  });

  ctx.restore();
};

const drawScene = (
  surface: CanvasSurface,
  geometry: SurfaceGeometry,
  elapsed: number,
  color: string,
) => {
  const { ctx, width, height } = surface;

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, width, height);
  drawBaseCurve(surface, geometry, color);
  drawComets(surface, geometry, elapsed, color);
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

    const stopAnimation = () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const renderFrame = (elapsed: number) => {
      drawScene(leftSurface, leftGeometry, elapsed, color);
      drawScene(rightSurface, rightGeometry, elapsed, color);
    };

    const tick = (now: number) => {
      if (disposed) {
        return;
      }

      renderFrame(now - startedAt);
      frameId = requestAnimationFrame(tick);
    };

    const startAnimation = (resetPhase: boolean) => {
      stopAnimation();

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

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleResize);
    resizeObserver?.observe(left);
    resizeObserver?.observe(right);

    const themeObserver = new MutationObserver(() => {
      // Цвет перечитается на следующем кадре — отдельная перерисовка не нужна.
      color = readThemeColor(left);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    startAnimation(true);

    return () => {
      disposed = true;
      stopAnimation();
      resizeObserver?.disconnect();
      themeObserver.disconnect();
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
