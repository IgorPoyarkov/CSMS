// Сравнение базовой модели Ollama и модели с LoRA через llama.cpp.
// Один и тот же системный промпт и вопрос подаётся в оба endpoint'а.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const cfg = JSON.parse(
  await fs.readFile(path.join(import.meta.dirname, "sources.json"), "utf8"),
);
const question = process.argv.slice(2).join(" ") ||
  "Какой срок оплаты по контракту 44-ФЗ, если приёмка оформлена без использования ЕИС?";

const system = [
  "Ты — правовой ассистент CSMS по 44-ФЗ. Отвечай только на русском языке,",
  "коротко и только по приведённым нормам действующей редакции. Каждое",
  "юридическое утверждение подтверждай ссылкой [n]. Не выдумывай нормы, даты",
  "и проценты. В конце добавь: «Справочно. Проверьте первоисточник и редакцию».",
  "",
  "Нормы действующей редакции:",
  "[1] Статья 34. Контракт — ч. 13¹: срок оплаты не более семи рабочих дней",
  "с даты подписания заказчиком документа о приёмке; если приёмка оформляется",
  "без использования ЕИС либо расчёты подлежат казначейскому сопровождению,",
  "срок — не более десяти рабочих дней.",
].join("\n");

async function ollama() {
  const response = await fetch(`${cfg.ollama}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-r1:7b",
      stream: false,
      messages: [{ role: "system", content: system }, { role: "user", content: question }],
      options: { temperature: 0.2, num_ctx: 8192 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const body = await response.json();
  return String(body.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

async function llamaCpp() {
  const base = String(cfg.chatBase ?? "http://127.0.0.1:5100/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "csms-44fz",
      stream: false,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [{ role: "system", content: system }, { role: "user", content: question }],
    }),
  });
  if (!response.ok) throw new Error(`llama.cpp ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const body = await response.json();
  // llama.cpp для DeepSeek-R1 часть ответа отдаёт в reasoning_content.
  const msg = body.choices?.[0]?.message ?? {};
  return String(msg.content || msg.reasoning_content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

const [base, lora] = await Promise.allSettled([ollama(), llamaCpp()]);
console.log(`Вопрос: ${question}\n`);
console.log("=== База (Ollama) ===");
console.log(base.status === "fulfilled" ? base.value : `ОШИБКА: ${base.reason.message}`);
console.log("\n=== С LoRA (llama.cpp) ===");
console.log(lora.status === "fulfilled" ? lora.value : `ОШИБКА: ${lora.reason.message}`);
