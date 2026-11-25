# Быстрая проверка обученного адаптера на нескольких вопросах из датасета.
# Запуск: python scripts/consultant/eval-lora.py
import json
import os
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

ROOT = Path(__file__).resolve().parents[2]
BASE_MODEL = ROOT / ".tmp" / "lora" / "base-model"
ADAPTER = ROOT / ".tmp" / "lora" / "adapter"
DATA_FILE = ROOT / "docs" / "legal" / "consultant-lora-dataset.jsonl"
SAMPLES = int(os.environ.get("LORA_EVAL_SAMPLES", "3"))

SYSTEM = (
    "Ты — правовой ассистент CSMS по 44-ФЗ. Отвечай только на русском языке, "
    "коротко и только по приведённым нормам действующей редакции. Каждое "
    "юридическое утверждение подтверждай ссылкой [n]. Не выдумывай нормы, даты "
    "и проценты. В конце добавь: «Справочно. Проверьте первоисточник и редакцию»."
)

with DATA_FILE.open("r", encoding="utf-8") as handle:
    rows = [json.loads(line) for line in handle if line.strip()]
rows = [r for r in rows if r.get("source") == "approved-qa"][:SAMPLES]

tokenizer = AutoTokenizer.from_pretrained(str(BASE_MODEL), trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
if tokenizer.chat_template is None:
    tokenizer.chat_template = (
        "{% for message in messages %}"
        "{% if message['role'] == 'system' %}{{ message['content'] }}"
        "{% elif message['role'] == 'user' %}<｜User｜>{{ message['content'] }}"
        "{% elif message['role'] == 'assistant' %}<｜Assistant｜>{{ message['content'] }}"
        "{% endif %}{% endfor %}"
        "{% if add_generation_prompt %}<｜Assistant｜>{% endif %}"
    )

quantization = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)
model = AutoModelForCausalLM.from_pretrained(
    str(BASE_MODEL),
    quantization_config=quantization,
    device_map="auto",
    torch_dtype=torch.bfloat16,
    trust_remote_code=True,
)
model = PeftModel.from_pretrained(model, str(ADAPTER))
model.eval()

for row in rows:
    context = row.get("input") or ""
    user = (
        f"Нормы действующей редакции:\n{context}\n\nВопрос: {row['instruction']}"
        if context
        else row["instruction"]
    )
    prompt = tokenizer.apply_chat_template(
        [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=220,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
        )
    text = tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    print("\nВОПРОС:", row["instruction"])
    print("ЭТАЛОН:", row["output"][:220].replace("\n", " "))
    print("МОДЕЛЬ:", text.strip()[:400].replace("\n", " "))
