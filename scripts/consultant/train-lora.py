# QLoRA-дообучение консультанта по 44-ФЗ.
#
# Запуск из корня проекта:
#   python scripts/consultant/train-lora.py
#
# Факты остаются в RAG; адаптер учит только стиль и формат ответа по найденным
# нормам. Датасет: docs/legal/consultant-lora-dataset.jsonl.

import json
import os
from dataclasses import dataclass
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
    set_seed,
)

ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT / "docs" / "legal" / "consultant-lora-dataset.jsonl"
BASE_MODEL = ROOT / ".tmp" / "lora" / "base-model"
OUTPUT_DIR = ROOT / ".tmp" / "lora" / "adapter"
MAX_LENGTH = int(os.environ.get("LORA_MAX_LENGTH", "1536"))
EPOCHS = float(os.environ.get("LORA_EPOCHS", "2"))
SEED = 42

SYSTEM = (
    "Ты — правовой ассистент CSMS по 44-ФЗ. Отвечай только на русском языке, "
    "коротко и только по приведённым нормам действующей редакции. Каждое "
    "юридическое утверждение подтверждай ссылкой [n]. Не выдумывай нормы, даты "
    "и проценты. В конце добавь: «Справочно. Проверьте первоисточник и редакцию»."
)


def read_rows():
    rows = []
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def build_text(tokenizer, row):
    context = row.get("input") or ""
    user = f"Нормы действующей редакции:\n{context}\n\nВопрос: {row['instruction']}" if context else row["instruction"]
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    full = prompt + row["output"] + tokenizer.eos_token
    return prompt, full


def tokenize_rows(tokenizer, rows):
    prompts, fulls = [], []
    for row in rows:
        prompt, full = build_text(tokenizer, row)
        prompts.append(tokenizer(prompt, add_special_tokens=False)["input_ids"])
        fulls.append(tokenizer(full, add_special_tokens=False)["input_ids"])

    features = []
    skipped = 0
    for prompt_ids, full_ids in zip(prompts, fulls):
        if len(full_ids) > MAX_LENGTH or len(full_ids) <= len(prompt_ids):
            skipped += 1
            continue
        features.append({
            "input_ids": full_ids,
            "attention_mask": [1] * len(full_ids),
            "labels": [-100] * len(prompt_ids) + full_ids[len(prompt_ids):],
        })
    print(f"Примеров: {len(features)}, пропущено по длине: {skipped}")
    return Dataset.from_list(features)


@dataclass
class Collator:
    pad_id: int

    def __call__(self, batch):
        width = max(len(item["input_ids"]) for item in batch)
        input_ids, attention_mask, labels = [], [], []
        for item in batch:
            pad = width - len(item["input_ids"])
            input_ids.append(item["input_ids"] + [self.pad_id] * pad)
            attention_mask.append(item["attention_mask"] + [0] * pad)
            labels.append(item["labels"] + [-100] * pad)
        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attention_mask, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
        }


def main():
    set_seed(SEED)
    rows = read_rows()
    train_rows = [r for r in rows if r.get("split") != "eval"]
    eval_rows = [r for r in rows if r.get("split") == "eval"]
    print(f"Обучающих пар: {len(train_rows)}, проверочных: {len(eval_rows)}")

    tokenizer = AutoTokenizer.from_pretrained(str(BASE_MODEL), trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    if tokenizer.chat_template is None:
        # У DeepSeek-R1 шаблон совпадает с тем, что использует Ollama.
        tokenizer.chat_template = (
            "{% for message in messages %}"
            "{% if message['role'] == 'system' %}{{ message['content'] }}"
            "{% elif message['role'] == 'user' %}<｜User｜>{{ message['content'] }}"
            "{% elif message['role'] == 'assistant' %}<｜Assistant｜>{{ message['content'] }}"
            "{% endif %}{% endfor %}"
            "{% if add_generation_prompt %}<｜Assistant｜>{% endif %}"
        )
    train_ds = tokenize_rows(tokenizer, train_rows)
    eval_ds = tokenize_rows(tokenizer, eval_rows)

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
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
    ))
    model.print_trainable_parameters()

    args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=8,
        num_train_epochs=EPOCHS,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        max_grad_norm=0.3,
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        optim="paged_adamw_8bit",
        logging_steps=10,
        eval_strategy="epoch",
        # Частые чекпоинты: перезапуск сервера не должен терять час обучения.
        save_strategy="steps",
        save_steps=18,
        save_total_limit=2,
        report_to=[],
        group_by_length=True,
        remove_unused_columns=False,
        seed=SEED,
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=Collator(tokenizer.pad_token_id),
    )
    # LORA_RESUME=1 — продолжить с последнего чекпоинта после сбоя/перезапуска.
    resume_from = None
    if os.environ.get("LORA_RESUME") == "1" and OUTPUT_DIR.exists():
        # Без trainer_state.json Trainer не сможет восстановить шаг и оптимизатор.
        checkpoints = [
            p
            for p in OUTPUT_DIR.glob("checkpoint-*")
            if p.name.split("-")[-1].isdigit() and (p / "trainer_state.json").exists()
        ]
        if checkpoints:
            resume_from = str(max(checkpoints, key=lambda p: int(p.name.split("-")[-1])))
            print(f"Возобновляем обучение: {resume_from}")
    trainer.train(resume_from_checkpoint=resume_from)
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    print(f"Адаптер сохранён: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
