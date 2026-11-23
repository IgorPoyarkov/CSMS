/**
 * Локальный сервер готовой сборки dist с «серверной отдачей» без фризов.
 *
 * Чем отличается от `vite dev` / `vite preview`:
 *  - отдаёт готовый бандл (несколько файлов вместо ~370 модулей в dev);
 *  - gzip/Brotli сжимает JS/CSS/HTML в памяти (Vite preview отдаёт их как есть);
 *  - /assets/* получают `Cache-Control: immutable`, браузер не переспрашивает их;
 *  - HTML отдаётся с ETag и 304, прокси /api, /openapi, /pg-api — как в dev.
 *
 * Запуск: `npm run serve` (порт 5176). Порт меняется через `PORT=5173` или
 * первым аргументом. Сборку нужно пересобрать командой `npm run build:web`.
 */
import http from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
} from "node:zlib";

const root = path.resolve(
  fileURLToPath(new URL("../dist", import.meta.url)),
);
const portArgument = process.argv[2] ?? process.env.PORT;
const port = Number.isFinite(Number(portArgument)) ? Number(portArgument) : 5176;
const host = process.env.HOST ?? "0.0.0.0";

if (!existsSync(path.join(root, "index.html"))) {
  console.error(
    "Нет dist/index.html. Сначала соберите фронт: npm run build:web",
  );
  process.exit(1);
}

/** Прокси повторяет настройки server.proxy из vite.config.ts. */
const proxyRoutes = [
  { prefix: "/api", target: "http://127.0.0.1:5099" },
  { prefix: "/openapi", target: "http://127.0.0.1:5099" },
  {
    prefix: "/pg-api",
    target: "http://127.0.0.1:3002",
    strip: /^\/pg-api/,
  },
];

const hopByHop = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
]);

const mimeTypes = new Map(
  Object.entries({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
  }),
);

function mimeFor(file) {
  return mimeTypes.get(path.extname(file).toLowerCase()) ?? "application/octet-stream";
}

/** Кэш сжатых Representation: ключ меняется при пересборке файла. */
const encodedCache = new Map();

function prepare(file, stat) {
  const key = `${file}\0${stat.mtimeMs}\0${stat.size}`;
  const cached = encodedCache.get(key);
  if (cached) return cached;

  const raw = readFileSync(file);
  const compressible =
    raw.length > 1024 &&
    /\.(js|css|html|json|svg|txt|map)$/i.test(file);
  const entry = {
    raw,
    gzip: compressible
      ? gzipSync(raw, { level: 9 })
      : null,
    brotli: compressible
      ? brotliCompressSync(raw, {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: 5,
          },
        })
      : null,
    etag: `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`,
    lastModified: new Date(stat.mtimeMs).toUTCString(),
  };
  encodedCache.set(key, entry);
  if (encodedCache.size > 200) {
    encodedCache.delete(encodedCache.keys().next().value);
  }
  return entry;
}

function pickEncoding(header = "") {
  const offered = header.split(",").map((part) => {
    const [name, ...params] = part.trim().split(";");
    const q = params.find((param) => param.trim().startsWith("q="));
    return {
      name: name.toLowerCase(),
      q: q ? Number(q.split("=")[1]) : 1,
    };
  });
  const supported = (name) =>
    offered.some((item) => item.name === name && item.q > 0);
  if (supported("br")) return "br";
  if (supported("gzip")) return "gzip";
  return null;
}

function sendError(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendFile(req, res, file, { immutable = false } = {}) {
  let stat;
  try {
    stat = statSync(file);
    if (!stat.isFile()) throw new Error("не файл");
  } catch {
    sendError(res, 404, "Not found");
    return;
  }

  const entry = prepare(file, stat);
  const encoding = pickEncoding(req.headers["accept-encoding"]);
  const body =
    encoding === "br" && entry.brotli
      ? entry.brotli
      : encoding === "gzip" && entry.gzip
        ? entry.gzip
        : entry.raw;

  const cacheControl = immutable
    ? "public, max-age=31536000, immutable"
    : "no-cache";
  if (req.headers["if-none-match"] === entry.etag) {
    res.writeHead(304, {
      ETag: entry.etag,
      "Cache-Control": cacheControl,
    });
    res.end();
    return;
  }

  const headers = {
    "Content-Type": mimeFor(file),
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
    ETag: entry.etag,
    "Last-Modified": entry.lastModified,
    Vary: "Accept-Encoding",
  };
  if (body !== entry.raw) headers["Content-Encoding"] = encoding;
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

function proxyRequest(req, res, route) {
  const base = new URL(route.target);
  const forwardHeaders = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (!hopByHop.has(name.toLowerCase())) forwardHeaders[name] = value;
  }
  forwardHeaders.host = base.host;

  const upstream = http.request(
    {
      hostname: base.hostname,
      port: base.port || undefined,
      method: req.method,
      path: route.strip ? req.url.replace(route.strip, "") : req.url,
      headers: forwardHeaders,
    },
    (response) => {
      const responseHeaders = {};
      for (const [name, value] of Object.entries(response.headers)) {
        if (!hopByHop.has(name.toLowerCase())) responseHeaders[name] = value;
      }
      res.writeHead(response.statusCode ?? 502, responseHeaders);
      response.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    console.error(`[прокси ${route.target}${req.url}] ${error.message}`);
    if (!res.headersSent) sendError(res, 502, "Bad gateway");
    else res.end();
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
  } catch {
    sendError(res, 400, "Bad request");
    return;
  }

  const proxy = proxyRoutes.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
  if (proxy) {
    proxyRequest(req, res, proxy);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendError(res, 405, "Method not allowed");
    return;
  }

  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  const exists = existsSync(file) && statSync(file).isFile();
  // Отсутствующие ресурсы не подменяем HTML — иначе браузер получит
  // «синтаксическую ошибку» вместо честного 404.
  if (!exists && (relative.startsWith("assets/") || path.extname(relative))) {
    sendError(res, 404, "Not found");
    return;
  }

  sendFile(req, res, exists ? file : path.join(root, "index.html"), {
    immutable: relative.startsWith("assets/"),
  });
});

function collectFiles(directory, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(full, result);
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

// Предварительно сжимаем ассеты, чтобы первый открывший не ждал компрессии
// 2,7 МБ main-бандла. При пересборке диска кэш обновится по mtime.
setImmediate(() => {
  try {
    const files = collectFiles(path.join(root, "assets"));
    for (const file of files) prepare(file, statSync(file));
    const index = path.join(root, "index.html");
    prepare(index, statSync(index));
    console.log(`[прогрев] сжато файлов: ${files.length + 1}`);
  } catch (error) {
    console.error(`[прогрев] ${error.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`CSMS (dist) → http://127.0.0.1:${port}`);
  console.log("Прокси: /api, /openapi → :5099; /pg-api → :3002");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
