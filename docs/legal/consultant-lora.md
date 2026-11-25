# LoRA-дообучение консультанта по 44-ФЗ

Гибрид: **RAG остаётся источником фактов и цитат**, LoRA учит только стиль и
формат ответа. Модель не заменяет поиск по действующей редакции.

## Состояние

- Датасет: `docs/legal/consultant-lora-dataset.jsonl` (322 пары: 242 одобренных
  Q&A + 80 автоматических из текста действующих норм). Автоматические пары
  помечены `draft-for-review` и **не индексируются в RAG**.
- Отчёт: `docs/legal/consultant-lora-dataset.report.json`.
- Пересборка: `node scripts/consultant/build-lora-dataset.mjs`
  (`--approved-only` — только проверенные пары, `LORA_MAX_AUTO` — лимит).
- База: `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`, скачивается в
  `.tmp/lora/base-model` скриптом `scripts/consultant/download-lora-base.py`.
- Адаптер после обучения: `.tmp/lora/adapter`.

## Окружение

Python 3.11 установлен через winget. Пакеты: `torch==2.5.1+cu121`,
`transformers==4.46.3`, `peft==0.13.2`, `bitsandbytes==0.44.1`,
`accelerate==1.1.1`, `datasets==3.1.0`, `trl==0.12.2`, `huggingface_hub==0.26.5`.
Проверка: `python scripts/consultant/check-ml.py` — CUDA и bf16 должны быть
доступны на RTX 3060.

Если загрузка через Xet обрывается: `HF_HUB_DISABLE_XET=1`,
`HF_HUB_DOWNLOAD_TIMEOUT=300`.

## Обучение

```powershell
$py = "C:\Users\liven\AppData\Local\Programs\Python\Python311\python.exe"
& $py scripts/consultant/train-lora.py
```

Настройки: QLoRA 4-bit NF4, r=16, alpha=32, lr=2e-4, 2 эпохи, batch 1 с
градиентным накоплением 8, bf16, `paged_adamw_8bit`. Переопределяются через
`LORA_EPOCHS` и `LORA_MAX_LENGTH`. На 322 парах это эксперимент по стилю, а не
«знание закона»: юридические факты по-прежнему приходят из RAG.

## Интеграция в Ollama

Адаптер не меняет `deepseek-r1:7b` — создаётся отдельная модель:

```powershell
# 1. Конвертер llama.cpp (только нужные файлы, sparse-checkout)
& .\scripts\consultant\prepare-llama-cpp.ps1

# 2. Адаптер safetensors → GGUF
& .\scripts\consultant\convert-lora-to-gguf.ps1

# 3. FROM deepseek-r1:7b + ADAPTER → csms-44fz-lora
& .\scripts\consultant\create-ollama-model.ps1
```

После этого можно сравнить ответы базовой и дообученной модели:

```powershell
& $py scripts/consultant/eval-lora.py
```

Модель `csms-44fz-lora` включается в консультант через `chatModel` в
`scripts/consultant/sources.json` (RAG-поиск и фильтр редакций при этом не
меняются). Шаблон чата в `train-lora.py` совпадает с шаблоном Ollama для
`deepseek-r1:7b` (`<｜User｜>` / `<｜Assistant｜>`).

## Внимание

- Не смешивать с архивными редакциями: датасет собран только из чанков без
  пометки «архивная».
- Обученный адаптер не заменяет фильтр редакций и уточняющий диалог в
  `scripts/consultant/server.mjs`.
- Интеграция адаптера в Ollama требует конвертации safetensors → GGUF; до
  проверки совместимости шаблона чата адаптер остаётся отдельным артефактом.
