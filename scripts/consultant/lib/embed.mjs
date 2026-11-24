/** Батчевые эмбеддинги через локальный Ollama (/api/embed). */

export function cosine(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedBatch(texts, cfg) {
  const url = `${cfg.ollama ?? "http://localhost:11434"}/api/embed`;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: cfg.embedModel ?? "nomic-embed-text",
          input: texts,
        }),
      });
      if (!response.ok) throw new Error(`Ollama ${response.status}: ${await response.text()}`);
      const body = await response.json();
      if (!Array.isArray(body.embeddings) || body.embeddings.length !== texts.length) {
        throw new Error("Ollama вернул неверное число эмбеддингов");
      }
      return body.embeddings.map((vector) => vector.map((value) => Math.round(value * 1e5) / 1e5));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Не удалось получить эмбеддинги");
}

/** Эмбеддинги батчами: Ollama быстрее считает 32 текста за раз, чем по одному. */
export async function embedTexts(texts, cfg, batchSize = 32, onProgress) {
  const result = [];
  for (let offset = 0; offset < texts.length; offset += batchSize) {
    const batch = texts.slice(offset, offset + batchSize);
    result.push(...(await embedBatch(batch, cfg)));
    onProgress?.(Math.min(offset + batch.length, texts.length), texts.length);
  }
  return result;
}
